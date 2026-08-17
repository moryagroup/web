import React, { useState } from 'react';
import { CurrentUser } from '../types';
import { Settings, Plus, Trash2, X, Check, Camera, Tag, Download, Sun, Moon, Upload } from 'lucide-react';
import { hasAdminPermissions } from '../utils/rbac';
import { getGoogleDriveScriptUrl, setGoogleDriveScriptUrl } from '../services/googleDriveService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupLogo?: string;
  onUpdateGroupLogo?: (logoUrl: string) => void;
  customIncomeTypes: string[];
  onAddCustomIncomeType: (newType: string) => void;
  onDeleteCustomIncomeType?: (type: string) => void;
  currentUser: CurrentUser;
  onOpenLogin?: () => void;
  onClearAllTransactions?: () => void;
  onDownloadBackup?: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  groupLogo,
  onUpdateGroupLogo,
  customIncomeTypes,
  onAddCustomIncomeType,
  onDeleteCustomIncomeType,
  currentUser,
  onOpenLogin,
  onClearAllTransactions,
  onDownloadBackup,
  theme = 'light',
  onToggleTheme,
}) => {
  const [newType, setNewType] = useState<string>('');
  const [driveScriptUrl, setDriveScriptUrl] = useState<string>(() => getGoogleDriveScriptUrl());

  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isAdmin = isLoggedIn && hasAdminPermissions(currentUser.role);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newType.trim()) return;

    if (!isLoggedIn) {
      if (onOpenLogin) onOpenLogin();
      return;
    }

    onAddCustomIncomeType(newType.trim());
    setNewType('');
  };

  const handleDelete = (type: string) => {
    if (!isAdmin) {
      alert('काढून टाकण्याचे अधिकार केवळ ॲडमिन यांनाच आहेत.');
      if (onOpenLogin) onOpenLogin();
      return;
    }
    if (onDeleteCustomIncomeType) {
      onDeleteCustomIncomeType(type);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">सिस्टम सेटिंग्ज व जमा प्रकार</h3>
              <p className="text-[11px] text-slate-400">
                रिएल-टाईम फायरस्टोअर सिंक्रोनायझेशन (`morya-group-352ad`)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Theme Mode Option */}
          <div className="space-y-2 pb-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-600" /> : <Sun className="w-4 h-4 text-amber-600" />}
                <h4 className="font-bold text-slate-800">अ‍ॅप थीम मोड (Theme Mode)</h4>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                {theme === 'dark' ? '🌙 डार्क मोड सक्रीय' : '☀️ लाईट मोड सक्रीय'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              आपल्या पसंतीनुसार अ‍ॅपची व्हिज्युअल थीम लाईट मोड (Light) किंवा डार्क मोड (Dark) मध्ये बदला.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => onToggleTheme && theme !== 'light' && onToggleTheme()}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs cursor-pointer transition-all ${
                  theme === 'light'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-xs ring-2 ring-amber-400/50'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>☀️ लाईट मोड (Light)</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleTheme && theme !== 'dark' && onToggleTheme()}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs cursor-pointer transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-amber-500 text-amber-400 shadow-xs ring-2 ring-amber-400/50'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Moon className="w-4 h-4 text-amber-400" />
                <span>🌙 डार्क मोड (Dark)</span>
              </button>
            </div>
          </div>

          {/* Custom Income Types Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-slate-800">सानुकूल जमा प्रकार (Custom Income Types)</h4>
              </div>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                {customIncomeTypes.length} सानुकूल प्रकार
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              येथे जोडलेले सानुकूल जमा प्रकार फायरस्टोअर सेटिंग्समध्ये साठवले जातात व सर्व डिव्हाइसेसवर थेट अपडेट होतात.
            </p>

            {isAdmin && (
              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  type="text"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="उदा. जाहिरात प्रायोजकत्व, मंडप भाडे..."
                  className="flex-1 p-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>जोडा</span>
                </button>
              </form>
            )}

            <div className="space-y-1.5 pt-2">
              {customIncomeTypes.length === 0 ? (
                <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-slate-400">
                  अद्याप कोणतेही सानुकूल जमा प्रकार जोडलेले नाहीत.
                </div>
              ) : (
                customIncomeTypes.map((type) => (
                  <div
                    key={type}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-slate-700">{type}</span>
                    {isAdmin && onDeleteCustomIncomeType && (
                      <button
                        onClick={() => handleDelete(type)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="काढून टाका"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Google Drive Configuration Section (Admin Only) */}
          {isAdmin && (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-slate-800">Google Drive स्टोरेज (moryagroupdata@gmail.com)</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                मंडळाच्या सर्व जमा/खर्च पावती छायाचित्रे सुरक्षितपणे <span className="font-bold text-amber-800">moryagroupdata@gmail.com</span> Google Drive वर सेव्ह होतात.
              </p>
              <input
                type="url"
                value={driveScriptUrl}
                onChange={(e) => {
                  setDriveScriptUrl(e.target.value);
                  setGoogleDriveScriptUrl(e.target.value);
                }}
                placeholder="Google Apps Script Web App URL (https://script.google.com/macros/s/...)"
                className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none font-mono text-slate-700"
              />
            </div>
          )}

          {/* Data Backup Section (Admin Only) */}
          {onDownloadBackup && isAdmin && (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-600" />
                <h4 className="font-bold text-slate-800">डेटा सुरक्षितता व बॅकअप (Data Backup & Safety)</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                मंडळाच्या सर्व जमा, खर्च, सभासद व उत्सव कामांचा संपूर्ण JSON बॅकअप संगणकावर / मोबाईलवर डाउनलोड करून सुरक्षित ठेवा.
              </p>
              <button
                type="button"
                onClick={onDownloadBackup}
                className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs active:scale-95 text-xs"
              >
                <span>💾 संपूर्ण डेटा बॅकअप डाउनलोड करा (Download Backup JSON)</span>
              </button>
            </div>
          )}

          {/* Admin Transaction Reset Section */}
          {onClearAllTransactions && isAdmin && (
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <h4 className="font-bold text-slate-800">सर्व व्यवहार डेटा रीसेट (Clear All Transactions)</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                ही क्रिया सर्व जमा व खर्च व्यवहार (सेंट्रल डेटाबेस व सर्व डिव्हाइसेस मधील) कायमचे हटवेल. ॲडमिन पासवर्ड पडताळणी आवश्यक.
              </p>
              <button
                onClick={onClearAllTransactions}
                className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>सर्व जमा व खर्च व्यवहार हटवा</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            बंद करा (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
