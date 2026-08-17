import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, ExternalLink, Paperclip } from 'lucide-react';
import { isGoogleDriveUrl } from '../services/googleDriveService';

interface ProofLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  title?: string;
}

export const ProofLightboxModal: React.FC<ProofLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'पावती / बिल पुरावा (Attached Proof)',
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  if (!isOpen || !imageUrl) return null;

  const isDrive = isGoogleDriveUrl(imageUrl);

  // Convert Google Drive view URL to direct image thumbnail URL if needed
  let displayUrl = imageUrl;
  if (isDrive && imageUrl.includes('/file/d/')) {
    const match = imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      displayUrl = `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
  }

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `receipt_proof_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-between items-center p-4">
      {/* Top Header Toolbar */}
      <div className="w-full max-w-4xl flex items-center justify-between bg-slate-900/90 border border-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl shrink-0 z-10">
        <div className="flex items-center gap-2 truncate">
          <Paperclip className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-bold text-sm truncate">{title}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="झूम इन"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="झूम आउट"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="फोटो डाउनलोड करा"
          >
            <Download className="w-4 h-4" />
          </button>
          {isDrive && (
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs transition-all"
            >
              <span>Drive वर उघडा</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer ml-2"
            title="बंद करा"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Display Workspace */}
      <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4 my-2">
        <img
          src={displayUrl}
          alt="पावती / बिल पुरावा"
          style={{
            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease-in-out',
          }}
          className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-700/50"
          onError={(e) => {
            // Fallback if Google Drive thumbnail fails to load
            if (displayUrl !== imageUrl) {
              (e.target as HTMLImageElement).src = imageUrl;
            }
          }}
        />
      </div>

      {/* Footer Info Banner */}
      <div className="text-center text-xs text-slate-400 py-1 shrink-0">
        मागे जाण्यासाठी स्क्रीनच्या बाहेर क्लिक करा किंवा <kbd className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">Esc</kbd> दाबा.
      </div>
    </div>
  );
};
