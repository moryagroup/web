import React from 'react';
import { X, Download, User, ShieldCheck } from 'lucide-react';

interface ProfilePhotoLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl?: string;
  memberName?: string;
  memberRole?: string;
  memberCode?: string;
}

export const ProfilePhotoLightboxModal: React.FC<ProfilePhotoLightboxModalProps> = ({
  isOpen,
  onClose,
  photoUrl,
  memberName,
  memberRole,
  memberCode,
}) => {
  if (!isOpen) return null;

  const title = memberName || 'सभासद प्रोफाईल फोटो';
  const role = memberRole || 'सभासद';

  const handleDownload = () => {
    if (!photoUrl) return;
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = `${memberName || 'Member'}_Profile_Photo.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-[130] bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top Header Bar - WhatsApp Style */}
      <div
        className="px-4 sm:px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-white relative z-10 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-amber-400/80 overflow-hidden bg-slate-900 p-0.5 shrink-0 flex items-center justify-center">
            {photoUrl ? (
              <img src={photoUrl} alt={title} className="w-full h-full object-cover rounded-full" />
            ) : (
              <User className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-amber-400 leading-tight">
              {title} {memberCode ? `(${memberCode})` : ''}
            </h2>
            <p className="text-[11px] text-slate-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>पद: {role} • मोरया ग्रुप मित्र मंडळ</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {photoUrl && (
            <button
              onClick={handleDownload}
              title="प्रोफाईल फोटो डाउनलोड करा"
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onClose}
            title="बंद करा (Close)"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Big Photo Display Area */}
      <div
        className="flex-1 flex items-center justify-center p-4 sm:p-8 select-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {photoUrl ? (
          <div className="relative max-w-lg max-h-[75vh] w-full aspect-square flex items-center justify-center p-2 rounded-3xl border-4 border-amber-400/60 shadow-2xl bg-slate-900/90 backdrop-blur-md overflow-hidden group">
            <img
              src={photoUrl}
              alt={title}
              className="w-full h-full object-cover rounded-2xl drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="w-64 h-64 rounded-full border-4 border-amber-400/60 bg-amber-500/10 flex flex-col items-center justify-center text-amber-400 space-y-2 shadow-2xl">
            <User className="w-24 h-24 text-amber-400/80" />
            <p className="text-xs font-bold text-slate-300">अद्याप फोटो अपलोड केलेला नाही</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div
        className="p-4 bg-slate-900/90 border-t border-slate-800 text-center text-xs text-slate-400 font-medium relative z-10 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        मोरया ग्रुप मित्र मंडळ (ट्रस्ट), हडपसर गोंधळनगर, पुणे - सभासद प्रोफाईल फोटो
      </div>
    </div>
  );
};
