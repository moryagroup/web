/**
 * versionCheck.ts
 * Automatic version checking, service worker unregistration, and cache invalidation.
 */

// Current app build version injected at build time or fallback
export const CURRENT_BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : Date.now().toString();

const VERSION_KEY = 'morya_mandal_build_version_v1';
const POLLING_INTERVAL_MS = 20000; // Check every 20 seconds

/**
 * Unregisters any active service workers to prevent stale PWA caching
 */
export async function unregisterServiceWorkers(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('[CacheManager] Unregistered old service worker:', registration.scope);
      }
    } catch (err) {
      console.warn('[CacheManager] Service worker unregister error:', err);
    }
  }
}

/**
 * Clears browser CacheStorage API caches
 */
export async function clearBrowserCaches(): Promise<void> {
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
        console.log('[CacheManager] Deleted cache bucket:', key);
      }
    } catch (err) {
      console.warn('[CacheManager] Cache clear error:', err);
    }
  }
}

/**
 * Checks for a new build version on the server.
 * If a newer version is detected, unregisters SW, clears caches, and reloads the page.
 */
export async function checkForAppUpdates(): Promise<boolean> {
  try {
    // Add cache-busting query parameter
    const baseUrl = import.meta.env.BASE_URL || '/';
    const versionUrl = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}version.json?t=${Date.now()}`;
    
    const response = await fetch(versionUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) return false;

    const data = await response.json();
    const serverVersion = data?.version;

    if (!serverVersion) return false;

    const storedVersion = localStorage.getItem(VERSION_KEY);

    if (!storedVersion) {
      localStorage.setItem(VERSION_KEY, serverVersion);
      return false;
    }

    if (storedVersion !== serverVersion) {
      console.log(`[VersionCheck] New build version detected! Server: ${serverVersion}, Local: ${storedVersion}`);
      localStorage.setItem(VERSION_KEY, serverVersion);

      // Perform clean purge
      await unregisterServiceWorkers();
      await clearBrowserCaches();

      // Auto reload immediately
      window.location.reload();
      return true;
    }
  } catch (err) {
    // Silent fail for network offline
  }
  return false;
}

/**
 * Initializes automatic version monitoring on startup and tab visibility
 */
export function initAutoVersionUpdate(): () => void {
  // Initial SW unregister & update check
  unregisterServiceWorkers();
  checkForAppUpdates();

  // Periodic poll
  const intervalId = setInterval(checkForAppUpdates, POLLING_INTERVAL_MS);

  // Check on tab focus / visibility change
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkForAppUpdates();
    }
  };

  window.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleVisibilityChange);

  return () => {
    clearInterval(intervalId);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleVisibilityChange);
  };
}
