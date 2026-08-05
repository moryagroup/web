import React, { useEffect, useState } from 'react';
import { NativeService } from '../services/nativeService';

export const NetworkStatusNotifier: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Initial status check
    NativeService.getNetworkStatus().then((status) => {
      setIsOffline(!status.connected);
    });

    // Network status listener
    const listener = NativeService.onNetworkChange((status) => {
      const offline = !status.connected;
      setIsOffline(offline);
      if (offline) {
        NativeService.showToast('App is offline. Using local static cache.');
      } else {
        NativeService.showToast('Back online! Syncing live web data...');
      }
    });

    return () => {
      if (listener && typeof listener.then === 'function') {
        listener.then((l: any) => l.remove());
      } else if (listener && (listener as any).remove) {
        (listener as any).remove();
      }
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 bg-amber-600 text-white px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 animate-bounce">
      <span className="w-2 h-2 rounded-full bg-white animate-ping" />
      Offline Mode (Loaded from Local Cache)
    </div>
  );
};
