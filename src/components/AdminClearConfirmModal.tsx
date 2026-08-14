import React, { useState } from 'react';
import { AlertTriangle, Lock, ShieldAlert, X } from 'lucide-react';

interface AdminClearConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const AdminClearConfirmModal: React.FC<AdminClearConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.trim() !== 'Tom&jerry5633#') {
      setError('चुकीचा ॲडमिन पासवर्ड! माहिती हटवण्यात आलेली नाही.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm();
      setPassword('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'त्रुटी: व्यवहार हटवता आले नाहीत.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-rose-200 overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-900 via-red-800 to-rose-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">सर्व व्यवहार हटवण्याची पुष्टी</h3>
              <p className="text-xs text-rose-200">ॲडमिन पासवर्ड पडताळणी आवश्यक</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-rose-200 hover:text-white hover:bg-rose-800/50 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900 text-xs leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">सावधानता (Warning):</p>
              <p className="mt-1">
                ही क्रिया सर्व जमा व खर्च व्यवहार कायमचे हटवेल. सभासद खाती, फोटो, लोगो व इव्हेंट चित्रे सुरक्षित राहतील. पुढे जाण्यासाठी कृपया तुमचा ॲडमिन पासवर्ड प्रविष्ट करा.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 font-bold text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              ॲडमिन पासवर्ड (Admin Password):
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="पासवर्ड प्रविष्ट करा..."
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:bg-white"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              रद्द करा (Cancel)
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !password}
              className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'हटवत आहे...' : 'कायमचे हटवा (Confirm Clear)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
