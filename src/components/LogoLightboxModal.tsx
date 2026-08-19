import React from 'react';
import { X, Download, Camera, LogIn, LayoutDashboard } from 'lucide-react';
import moryaLogoDefault from '../assets/morya_logo.jpg';

interface LogoLightboxModalProps {
  isOpen: boolean;
  logoSrc?: string;
  onClose: () => void;
  isAdmin?: boolean;
  onChangeLogoClick?: () => void;
  onOpenLogin?: () => void;
}

export const LogoLightboxModal: React.FC<LogoLightboxModalProps> = ({
  isOpen,
  logoSrc,
  onClose,
  isAdmin,
  onChangeLogoClick,
  onOpenLogin,
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
      className="fixed inset-0 z-[120] bg-gradient-to-b from-slate-950 via-[#1a0800] to-slate-950 backdrop-blur-xl flex flex-col justify-between animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Bar - With Top Right Login Option */}
      <div
        className="px-4 sm:px-6 py-3.5 bg-slate-900/90 border-b border-amber-900/40 flex items-center justify-between text-white relative z-10 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border border-amber-400/80 overflow-hidden bg-slate-950 p-0.5 shrink-0">
            <img src={currentLogo} alt="Mandal Logo Thumb" className="w-full h-full object-contain rounded-full" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-amber-400 leading-tight">
              मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
            </h2>
          </div>
        </div>

        {/* Top Right Controls (Login, Admin Logo Change, Download & Close) */}
        <div className="flex items-center gap-2">
          {onOpenLogin && (
            <button
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              title="सिस्टम लॉगिन करा"
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-amber-300/50"
            >
              <LogIn className="w-4 h-4 text-slate-950" />
              <span>लॉगिन करा (Login)</span>
            </button>
          )}

          {isAdmin && onChangeLogoClick && (
            <button
              onClick={() => {
                onClose();
                onChangeLogoClick();
              }}
              title="लोगो बदला व क्रॉप करा"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">लोगो बदला</span>
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

      {/* Main Opening Window Display Area */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 select-none space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative max-w-xs sm:max-w-md w-full aspect-square flex items-center justify-center p-2 rounded-full border-4 border-amber-500/90 shadow-[0_0_50px_rgba(245,158,11,0.25)] bg-slate-900/90 backdrop-blur-md overflow-hidden group">
          <img
            src={currentLogo}
            alt="मोरया ग्रुप मित्र मंडळ अधिकृत लोगो (Full Size)"
            className="w-full h-full object-contain rounded-full drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Group Name & Subtitle displayed prominently below opening window logo */}
        <div className="text-center space-y-1.5">
          <h1 className="text-xl sm:text-3xl font-black text-amber-400 tracking-wide drop-shadow-lg">
            मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
          </h1>
          <p className="text-xs sm:text-base font-bold text-amber-200/90 tracking-wide">
            हडपसर गोंधळनगर, पुणे
          </p>
        </div>

        {/* Action Buttons to Login */}
        {onOpenLogin && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs sm:text-sm rounded-xl border border-amber-500/40 shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-amber-400" />
              <span>लॉगिन करा (Member Login)</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div
        className="p-3.5 bg-slate-900/90 border-t border-amber-900/40 text-center text-xs text-slate-400 font-medium relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        मोरया ग्रुप मित्र मंडळ (ट्रस्ट), हडपसर गोंधळनगर, पुणे - ४११०२८
      </div>
    </div>
  );
};
