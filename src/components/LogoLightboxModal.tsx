import React from 'react';
import { X, Download, Camera, ShieldCheck } from 'lucide-react';
import moryaLogoDefault from '../assets/morya_logo.jpg';

interface LogoLightboxModalProps {
  isOpen: boolean;
  logoSrc?: string;
  onClose: () => void;
  isAdmin?: boolean;
  onChangeLogoClick?: () => void;
}

export const LogoLightboxModal: React.FC<LogoLightboxModalProps> = ({
  isOpen,
  logoSrc,
  onClose,
  isAdmin,
  onChangeLogoClick,
}) => {
  if (!isOpen) return null;

  const currentLogo = logoSrc || moryaLogoDefault;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentLogo;
    link.download = 'Morya_Mandal_Group_Logo.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Bar - WhatsApp Style */}
      <div
        className="px-4 sm:px-6 py-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-white relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-amber-400/80 overflow-hidden bg-slate-950 p-0.5 shrink-0">
            <img src={currentLogo} alt="Mandal Logo Thumb" className="w-full h-full object-contain rounded-full" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-amber-400 leading-tight">
              मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
            </h2>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>अधिकृत मंडळ बोधचिन्ह (Official Logo)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && onChangeLogoClick && (
            <button
              onClick={() => {
                onClose();
                onChangeLogoClick();
              }}
              title="लोगो बदला व क्रॉप करा"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">लोगो बदला (Crop)</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            title="डाउनलोड करा"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <Download className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            title="बंद करा"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Big Logo Display Area */}
      <div
        className="flex-1 flex items-center justify-center p-4 sm:p-8 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative max-w-lg w-full aspect-square flex items-center justify-center p-2 rounded-full border-4 border-amber-400/60 shadow-2xl bg-slate-900/90 backdrop-blur-md overflow-hidden group">
          <img
            src={currentLogo}
            alt="मोरया ग्रुप मित्र मंडळ अधिकृत लोगो (Full Size)"
            className="w-full h-full object-contain rounded-full drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </div>

      {/* Footer Info */}
      <div
        className="p-4 bg-slate-900/80 border-t border-slate-800 text-center text-xs text-slate-400 font-medium relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        मोरया ग्रुप मित्र मंडळ (ट्रस्ट), हडपसर गोंधळनगर, पुणे - ४११०२८
      </div>
    </div>
  );
};
