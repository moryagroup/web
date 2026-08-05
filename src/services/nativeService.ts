import { Share } from '@capacitor/share';
import { Network, ConnectionStatus } from '@capacitor/network';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Native Capacitor Service providing unified access to mobile features
 * with graceful web fallbacks when running in a standard browser.
 */
export const NativeService = {
  /**
   * Share receipt, payment details, or text via native share sheet / WhatsApp
   */
  async shareReceipt(title: string, text: string, url?: string): Promise<boolean> {
    try {
      await Share.share({
        title,
        text,
        url,
        dialogTitle: 'Share via WhatsApp / Apps',
      });
      return true;
    } catch (err) {
      console.log('[NativeService] Native share cancelled or unsupported, using web fallback', err);
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
          return true;
        } catch {
          // ignore web share cancel
        }
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${title}\n${text} ${url || ''}`);
        await this.showToast('Copied receipt details to clipboard!');
        return true;
      }
      return false;
    }
  },

  /**
   * Trigger light haptic vibration feedback
   */
  async triggerHaptic(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    }
  },

  /**
   * Display a quick native Toast message
   */
  async showToast(text: string): Promise<void> {
    try {
      await Toast.show({ text, duration: 'short', position: 'bottom' });
    } catch {
      console.log(`[Toast Fallback] ${text}`);
    }
  },

  /**
   * Take a photo or pick from gallery for receipt attachment / collection
   */
  async capturePhoto(): Promise<string | null> {
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
      });
      return image.webPath || image.path || null;
    } catch (err) {
      console.log('[NativeService] Camera cancelled or unavailable', err);
      return null;
    }
  },

  /**
   * Check network connection status
   */
  async getNetworkStatus(): Promise<ConnectionStatus> {
    try {
      return await Network.getStatus();
    } catch {
      return { connected: navigator.onLine, connectionType: 'unknown' };
    }
  },

  /**
   * Listen for network status changes (online / offline)
   */
  onNetworkChange(callback: (status: ConnectionStatus) => void) {
    try {
      return Network.addListener('networkStatusChange', callback);
    } catch {
      const onlineHandler = () => callback({ connected: true, connectionType: 'unknown' });
      const offlineHandler = () => callback({ connected: false, connectionType: 'none' });
      window.addEventListener('online', onlineHandler);
      window.addEventListener('offline', offlineHandler);
      return {
        remove: () => {
          window.removeEventListener('online', onlineHandler);
          window.removeEventListener('offline', offlineHandler);
        },
      };
    }
  },
};
