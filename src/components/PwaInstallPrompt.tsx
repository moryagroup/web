import React, { useState, useEffect } from 'react';
import { Smartphone, Maximize, X, Share, PlusSquare, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showIosGuideModal, setShowIosGuideModal] = useState<boolean>(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState<boolean>(false);

  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    // Check if already in standalone app mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // Capture Chrome/Android PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleFullscreenChange = () => {
      setIsFullscreenActive(Boolean(document.fullscreenElement));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Do not show banner if already running in standalone app or dismissed or in full screen
  if (isStandalone || isDismissed) return null;

  // Toggle Instant Fullscreen using HTML5 Fullscreen API
  const handleInstantFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreenActive(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreenActive(false);
      }
    } catch (err) {
      console.warn('Fullscreen API error:', err);
    }
  };

  // Trigger PWA installation or show iOS Safari guide
  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuideModal(true);
    } else {
      // Fallback for Android Chrome if prompt didn't fire automatically
      setShowIosGuideModal(true);
    }
  };

  return (
    <>
      {/* Floating Mobile Banner */}
      <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-[100] bg-slate-950/95 border-2 border-amber-500/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-300">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-400">फुल स्क्रीन मोबाईल ॲप अनुभवा!</h4>
              <p className="text-[11px] font-bold text-slate-300 leading-tight">
                ब्राउझरचा एड्रेस बार व खालील पर्याय पूर्णपणे लपवा
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="लपवा"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons: Instant Fullscreen & Add to Home Screen */}
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <button
            onClick={handleInstantFullscreen}
            className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] rounded-xl border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
          >
            <Maximize className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{isFullscreenActive ? 'फुलस्क्रीन बंद करा' : 'इन्स्टंट फुलस्क्रीन'}</span>
          </button>

          <button
            onClick={handleInstallApp}
            className="px-2.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-[11px] rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer border border-amber-300/60"
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            <span>होम स्क्रीनवर जोडा</span>
          </button>
        </div>
      </div>

      {/* iOS / Fallback Add to Home Screen Guide Modal */}
      {showIosGuideModal && (
        <div
          className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowIosGuideModal(false)}
        >
          <div
            className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-sm w-full p-5 text-white shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowIosGuideModal(false)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-400">होम स्क्रीनवर ॲप कसे जोडायचे?</h3>
                <p className="text-xs text-slate-400">पूर्ण स्क्रीन ॲप मोड चालू करा</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-200">
              <div className="flex items-start gap-2.5 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="w-5 h-5 bg-amber-500 text-slate-950 font-black rounded-full flex items-center justify-center text-xs shrink-0">1</span>
                <div>
                  <p className="font-bold text-amber-300">ब्राउझर मेन्यू (Share / Menu) वर जा</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    iOS Safari वर <Share className="w-3.5 h-3.5 text-amber-400 inline" /> Share दाबा किंवा Chrome वर ३ ठिपके दाबा.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="w-5 h-5 bg-amber-500 text-slate-950 font-black rounded-full flex items-center justify-center text-xs shrink-0">2</span>
                <div>
                  <p className="font-bold text-amber-300">'Add to Home Screen' वर क्लीक करा</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <PlusSquare className="w-3.5 h-3.5 text-amber-400 inline" /> 'होम स्क्रीनवर जोडा' पर्याय निवडा.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-emerald-950/60 p-3 rounded-xl border border-emerald-500/40 text-emerald-200">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-[11px] font-bold">
                  याने ॲप मोबाईल होम स्क्रीनवर सेव्ह होईल व उघडल्यास पूर्ण स्क्रीन (No Address Bar) मध्ये चालून ॲपसारखा अनुभव देईल!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuideModal(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer transition-colors shadow-md"
            >
              समजले (Got it)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
