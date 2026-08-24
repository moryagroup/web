/**
 * notificationService.ts
 * Manages in-app notifications, sound effects, system push notifications, and persistence.
 */

import { AppNotification, NotificationType } from '../types/notification';
import { soundService } from './soundService';
import { NativeService } from './nativeService';
import {
  saveNotificationFirestore,
  deleteNotificationFirestore,
  clearAllNotificationsFirestore,
  markNotificationAsReadFirestore,
  markAllNotificationsAsReadFirestore,
} from './firestoreService';

const STORAGE_KEY = 'morya_notifications_v1';
const SEEN_IDS_KEY = 'morya_notifications_seen_ids_v1';
const MAX_STORED_NOTIFICATIONS = 50;

type NotificationListener = (notifications: AppNotification[], activeBanner: AppNotification | null) => void;

class NotificationService {
  private notifications: AppNotification[] = [];
  private seenIds: Set<string> = new Set();
  private listeners: Set<NotificationListener> = new Set();
  private activeBanner: AppNotification | null = null;
  private bannerTimer: any = null;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.notifications = JSON.parse(data);
      }
      const seen = localStorage.getItem(SEEN_IDS_KEY);
      if (seen) {
        this.seenIds = new Set(JSON.parse(seen));
      } else {
        this.notifications.forEach((n) => this.seenIds.add(n.id));
      }
    } catch (e) {
      console.warn('[NotificationService] Failed to load notifications from storage:', e);
      this.notifications = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications.slice(0, MAX_STORED_NOTIFICATIONS)));
      localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(Array.from(this.seenIds).slice(-100)));
    } catch (e) {
      console.warn('[NotificationService] Failed to save notifications to storage:', e);
    }
  }

  private notifyListeners(): void {
    const list = [...this.notifications];
    this.listeners.forEach((listener) => {
      try {
        listener(list, this.activeBanner);
      } catch (err) {
        console.error('[NotificationService] Error in listener:', err);
      }
    });
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    // Initial call
    listener([...this.notifications], this.activeBanner);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  /**
   * Synchronize notifications received in real-time from Online Firestore Database.
   * If a new notification was created recently by another member/admin, trigger sound and banner!
   */
  public syncFromCloud(cloudList: AppNotification[]): void {
    if (!Array.isArray(cloudList)) return;

    const prevIds = new Set(this.notifications.map((n) => n.id));
    const now = Date.now();

    // Check for brand new remote notifications created in the last 2 minutes that haven't been shown yet
    const newlyReceived = cloudList.filter(
      (n) => !prevIds.has(n.id) && !this.seenIds.has(n.id)
    );

    this.notifications = [...cloudList].slice(0, MAX_STORED_NOTIFICATIONS);
    this.saveToStorage();
    this.notifyListeners();

    // If there's a fresh notification created by another member in the cloud
    if (newlyReceived.length > 0) {
      const latest = newlyReceived[0];
      const createdTime = new Date(latest.createdAt).getTime();
      const isRecent = !isNaN(createdTime) && now - createdTime < 2 * 60 * 1000;

      if (isRecent) {
        this.seenIds.add(latest.id);
        this.saveToStorage();

        // Play audio chime for this device
        if (latest.type === 'transaction_income' || latest.type === 'settlement') {
          soundService.playGPayChime();
        } else if (latest.type === 'task_assigned' || latest.type === 'task_obstacle' || latest.type === 'task_status') {
          soundService.playTaskChime();
        } else {
          soundService.playWhatsAppPop();
        }

        NativeService.triggerHaptic();
        this.triggerSystemNotification(latest);
        this.showBanner(latest);
      }
    }
  }

  /**
   * Request system push notification permission
   */
  public async requestPushPermission(): Promise<boolean> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (e) {
        console.warn('[NotificationService] Push permission error:', e);
      }
    }
    return false;
  }

  public isPushSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPushPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  }

  /**
   * Triggers a system browser push notification if granted
   */
  private triggerSystemNotification(notification: AppNotification): void {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = notification.title;
        const body = notification.message;
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notification.id,
        });
      } catch (e) {
        console.warn('[NotificationService] System notification trigger failed:', e);
      }
    }
  }

  /**
   * Dispatches a new notification with sound, haptics, banner, local & online database persistence
   */
  public notify(params: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'> & { id?: string; createdAt?: string }): AppNotification {
    const id = params.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = params.createdAt || new Date().toISOString();

    const newNotification: AppNotification = {
      ...params,
      id,
      createdAt,
      isRead: false,
    };

    this.seenIds.add(id);

    // 1. Prepend to local list
    this.notifications = [newNotification, ...this.notifications.filter((n) => n.id !== id)].slice(0, MAX_STORED_NOTIFICATIONS);
    this.saveToStorage();

    // 2. Persist to Online Firestore Database for cross-device real-time sync
    saveNotificationFirestore(newNotification).catch(console.error);

    // 3. Play distinct sound based on notification type
    if (newNotification.type === 'transaction_income' || newNotification.type === 'settlement') {
      soundService.playGPayChime();
    } else if (newNotification.type === 'task_assigned' || newNotification.type === 'task_obstacle' || newNotification.type === 'task_status') {
      soundService.playTaskChime();
    } else {
      soundService.playWhatsAppPop();
    }

    // 4. Trigger mobile haptic feedback
    NativeService.triggerHaptic();

    // 5. Trigger system push notification
    this.triggerSystemNotification(newNotification);

    // 6. Display floating top banner for 6.5 seconds
    this.showBanner(newNotification);

    this.notifyListeners();
    return newNotification;
  }

  /**
   * Helper: Show top floating banner
   */
  public showBanner(notification: AppNotification): void {
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
    this.activeBanner = notification;
    this.notifyListeners();

    this.bannerTimer = setTimeout(() => {
      this.dismissBanner();
    }, 6500);
  }

  /**
   * Helper: Dismiss top banner
   */
  public dismissBanner(): void {
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
    this.activeBanner = null;
    this.notifyListeners();
  }

  public markAsRead(id: string): void {
    this.notifications = this.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    this.saveToStorage();
    this.notifyListeners();
    markNotificationAsReadFirestore(id).catch(console.error);
  }

  public markAllAsRead(): void {
    const unreadIds = this.notifications.filter((n) => !n.isRead).map((n) => n.id);
    this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
    this.saveToStorage();
    this.notifyListeners();
    if (unreadIds.length > 0) {
      markAllNotificationsAsReadFirestore(unreadIds).catch(console.error);
    }
  }

  public deleteNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    if (this.activeBanner?.id === id) {
      this.dismissBanner();
    }
    this.saveToStorage();
    this.notifyListeners();
    deleteNotificationFirestore(id).catch(console.error);
  }

  public clearAll(): void {
    this.notifications = [];
    this.dismissBanner();
    this.saveToStorage();
    this.notifyListeners();
    clearAllNotificationsFirestore().catch(console.error);
  }
}

export const notificationService = new NotificationService();
