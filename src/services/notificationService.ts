/**
 * notificationService.ts
 * Manages in-app notifications, sound effects, system push notifications, and persistence.
 */

import { AppNotification, NotificationType } from '../types/notification';
import { soundService } from './soundService';
import { NativeService } from './nativeService';

const STORAGE_KEY = 'morya_notifications_v1';
const MAX_STORED_NOTIFICATIONS = 50;

type NotificationListener = (notifications: AppNotification[], activeBanner: AppNotification | null) => void;

class NotificationService {
  private notifications: AppNotification[] = [];
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
    } catch (e) {
      console.warn('[NotificationService] Failed to load notifications from storage:', e);
      this.notifications = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications.slice(0, MAX_STORED_NOTIFICATIONS)));
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
   * Dispatches a new notification with sound, haptics, banner, and storage
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

    // 1. Prepend to list (deduplicate by ID if already exists)
    this.notifications = [newNotification, ...this.notifications.filter((n) => n.id !== id)].slice(0, MAX_STORED_NOTIFICATIONS);
    this.saveToStorage();

    // 2. Play distinct sound based on notification type
    if (newNotification.type === 'transaction_income' || newNotification.type === 'settlement') {
      soundService.playGPayChime();
    } else if (newNotification.type === 'task_assigned' || newNotification.type === 'task_obstacle' || newNotification.type === 'task_status') {
      soundService.playTaskChime();
    } else {
      soundService.playWhatsAppPop();
    }

    // 3. Trigger mobile haptic feedback
    NativeService.triggerHaptic();

    // 4. Trigger system push notification
    this.triggerSystemNotification(newNotification);

    // 5. Display floating top banner for 6.5 seconds
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
  }

  public markAllAsRead(): void {
    this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));
    this.saveToStorage();
    this.notifyListeners();
  }

  public deleteNotification(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    if (this.activeBanner?.id === id) {
      this.dismissBanner();
    }
    this.saveToStorage();
    this.notifyListeners();
  }

  public clearAll(): void {
    this.notifications = [];
    this.dismissBanner();
    this.saveToStorage();
    this.notifyListeners();
  }
}

export const notificationService = new NotificationService();
