import React, { useState, useEffect, useRef } from 'react';
import { CurrentUser, IncomeTransaction, ExpenseTransaction } from '../types';
import { Settings, Plus, Trash2, X, Check, Camera, Tag, Download, Sun, Moon, Upload, PenTool, CheckCircle2, AlertCircle, RefreshCw, Clock, Mail, FileText } from 'lucide-react';
import { hasAdminPermissions } from '../utils/rbac';
import { getGoogleDriveScriptUrl, setGoogleDriveScriptUrl, testGoogleDriveConnection } from '../services/googleDriveService';
import {
  dispatchDaily1159ApprovedReceipts,
  isDaily1159ReportSentToday,
  getLastDaily1159SentDate,
} from '../services/dailyReceiptSchedulerService';
import {
  getTreasurerSignature,
  setTreasurerSignature,
  clearTreasurerSignature,
  getViceTreasurerSignature,
  setViceTreasurerSignature,
  clearViceTreasurerSignature,
  syncOfficerSignaturesFromOnline,
  OfficerSignature,
} from '../services/signatureService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupLogo?: string;
  onUpdateGroupLogo?: (logoUrl: string) => void;
  customIncomeTypes: string[];
  onAddCustomIncomeType: (newType: string) => void;
  onDeleteCustomIncomeType?: (type: string) => void;
  currentUser: CurrentUser;
  incomes?: IncomeTransaction[];
  expenses?: ExpenseTransaction[];
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
  incomes = [],
  expenses = [],
  onOpenLogin,
  onClearAllTransactions,
  onDownloadBackup,
  theme = 'light',
  onToggleTheme,
}) => {
  const [newType, setNewType] = useState<string>('');
  const [driveScriptUrl, setDriveScriptUrl] = useState<string>(() => getGoogleDriveScriptUrl());
  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);
  const [batchStatus, setBatchStatus] = useState<{ loading: boolean; success?: boolean; message?: string; folderUrl?: string } | null>(null);
  const [isSavingSig, setIsSavingSig] = useState<boolean>(false);

  // Signatures State
  const [treasurerSig, setTreasurerSigState] = useState<OfficerSignature | null>(() => getTreasurerSignature());
  const [viceTreasurerSig, setViceTreasurerSigState] = useState<OfficerSignature | null>(() => getViceTreasurerSignature());
  const [treasurerName, setTreasurerName] = useState<string>(() => getTreasurerSignature()?.officerName || 'खजिनदार');
  const [viceTreasurerName, setViceTreasurerName] = useState<string>(() => getViceTreasurerSignature()?.officerName || 'उपखजिनदार');

  const treasurerFileInputRef = useRef<HTMLInputElement>(null);
  const viceTreasurerFileInputRef = useRef<HTMLInputElement>(null);

  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isAdmin = isLoggedIn && hasAdminPermissions(currentUser.role);
  const isTreasurerOrVice = isLoggedIn && (
    currentUser.role === 'खजिनदार' ||
    currentUser.role === 'उपखजिनदार' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'Admin'
  );

  useEffect(() => {
    if (isOpen) {
      syncOfficerSignaturesFromOnline().then((sigs) => {
        setTreasurerSigState(sigs.treasurer);
        setViceTreasurerSigState(sigs.viceTreasurer);
        if (sigs.treasurer?.officerName) setTreasurerName(sigs.treasurer.officerName);
        if (sigs.viceTreasurer?.officerName) setViceTreasurerName(sigs.viceTreasurer.officerName);
      });
    }
  }, [isOpen]);

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

  const handleSignatureUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    role: 'TREASURER' | 'VICE_TREASURER'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSavingSig(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (role === 'TREASURER') {
        await setTreasurerSignature(dataUrl, treasurerName);
        setTreasurerSigState(getTreasurerSignature());
      } else {
        await setViceTreasurerSignature(dataUrl, viceTreasurerName);
        setViceTreasurerSigState(getViceTreasurerSignature());
      }
      setIsSavingSig(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true, message: 'Google Apps Script जोडणी तपासत आहे...' });
    const res = await testGoogleDriveConnection(driveScriptUrl);
    setTestStatus({
      loading: false,
      success: res.success,
      message: res.message,
    });
  };

  const handleDispatchDailyBatch = async () => {
    setBatchStatus({ loading: true, message: 'आजच्या सर्व मंजूर पावत्या तयार करून ईमेल व ड्राइव्हवर पाठवत आहे...' });
    try {
      const res = await dispatchDaily1159ApprovedReceipts(incomes, expenses, {
        force: true,
        groupLogo,
      });
      setBatchStatus({
        loading: false,
        success: res.success,
        message: res.message,
        folderUrl: res.folderUrl,
      });
    } catch (err: any) {
      setBatchStatus({
        loading: false,
        success: false,
        message: err?.message || 'त्रुटी आली',
      });
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
              <h3 className="font-bold text-sm text-white">सिस्टम सेटिंग्ज व अधिकृत स्वाक्षरी</h3>
              <p className="text-[11px] text-slate-400">
                ई-मेल अहवाल व Google Drive सिंक (moryagroupdata@gmail.com)
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

          {/* Officer Signatures Section (Treasurer & Vice Treasurer Only) */}
          {isTreasurerOrVice && (
            <div className="space-y-3 pb-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-amber-600" />
                  <h4 className="font-bold text-slate-800">अधिकृत स्वाक्षरी व्यवस्थापन (Online Signatures)</h4>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>सुरक्षित ऑनलाइन डेटाबेस</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                खजिनदार व उपखजिनदार यांच्या स्वाक्षरीचे फोटो थेट क्लाऊड डेटाबेसमध्ये सुरक्षित सेव्ह होतात व सर्व मंजूर व्हाऊचर्सवर अधिकृतपणे दिसतात.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Treasurer Signature Card */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-800 text-xs">१. खजिनदार स्वाक्षरी</span>
                    {treasurerSig ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                        ऑनलाइन जतन झाले ✓
                      </span>
                    ) : (
                      <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                        प्रलंबित
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={treasurerName}
                    onChange={async (e) => {
                      setTreasurerName(e.target.value);
                      if (treasurerSig) {
                        await setTreasurerSignature(treasurerSig.signatureDataUrl, e.target.value);
                      }
                    }}
                    placeholder="खजिनदाराचे पूर्ण नाव"
                    className="w-full p-1.5 border border-slate-300 rounded text-[11px] font-semibold bg-white outline-none focus:ring-1 focus:ring-amber-500"
                  />

                  <div className="h-20 bg-white rounded border border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
                    {treasurerSig?.signatureDataUrl ? (
                      <img
                        src={treasurerSig.signatureDataUrl}
                        alt="Treasurer Signature"
                        className="max-h-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">स्वाक्षरी फोटो उपलब्ध नाही</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={treasurerFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleSignatureUpload(e, 'TREASURER')}
                    />
                    <button
                      type="button"
                      disabled={isSavingSig}
                      onClick={() => treasurerFileInputRef.current?.click()}
                      className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isSavingSig ? 'सेव्ह करत आहे...' : 'अपलोड करा'}</span>
                    </button>
                    {treasurerSig && (
                      <button
                        type="button"
                        onClick={async () => {
                          await clearTreasurerSignature();
                          setTreasurerSigState(null);
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 cursor-pointer"
                        title="हटवा"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Vice Treasurer Signature Card */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-800 text-xs">२. उपखजिनदार स्वाक्षरी</span>
                    {viceTreasurerSig ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                        ऑनलाइन जतन झाले ✓
                      </span>
                    ) : (
                      <span className="text-[9px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">
                        प्रलंबित
                      </span>
                    )}
                  </div>

                  <input
                    type="text"
                    value={viceTreasurerName}
                    onChange={async (e) => {
                      setViceTreasurerName(e.target.value);
                      if (viceTreasurerSig) {
                        await setViceTreasurerSignature(viceTreasurerSig.signatureDataUrl, e.target.value);
                      }
                    }}
                    placeholder="उपखजिनदाराचे पूर्ण नाव"
                    className="w-full p-1.5 border border-slate-300 rounded text-[11px] font-semibold bg-white outline-none focus:ring-1 focus:ring-amber-500"
                  />

                  <div className="h-20 bg-white rounded border border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
                    {viceTreasurerSig?.signatureDataUrl ? (
                      <img
                        src={viceTreasurerSig.signatureDataUrl}
                        alt="Vice Treasurer Signature"
                        className="max-h-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">स्वाक्षरी फोटो उपलब्ध नाही</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={viceTreasurerFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleSignatureUpload(e, 'VICE_TREASURER')}
                    />
                    <button
                      type="button"
                      disabled={isSavingSig}
                      onClick={() => viceTreasurerFileInputRef.current?.click()}
                      className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isSavingSig ? 'सेव्ह करत आहे...' : 'अपलोड करा'}</span>
                    </button>
                    {viceTreasurerSig && (
                      <button
                        type="button"
                        onClick={async () => {
                          await clearViceTreasurerSignature();
                          setViceTreasurerSigState(null);
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 cursor-pointer"
                        title="हटवा"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Google Drive & Email Configuration Section (Treasurer & Vice Treasurer Only) */}
          {isTreasurerOrVice && (
            <div className="space-y-3 pb-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-amber-600" />
                  <h4 className="font-bold text-slate-800">Google Drive व ईमेल सिंक (moryagroupdata@gmail.com)</h4>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  Apps Script
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                प्रत्येक मंजूर पावती व पेमेंट पुरावा थेट <span className="font-bold text-amber-800">moryagroupdata@gmail.com</span> Google Drive वर सेव्ह होऊन ई-मेलद्वारे पाठवले जाते.
              </p>

              <div className="space-y-2">
                <input
                  type="url"
                  value={driveScriptUrl}
                  onChange={(e) => {
                    setDriveScriptUrl(e.target.value);
                    setGoogleDriveScriptUrl(e.target.value);
                  }}
                  placeholder="Google Apps Script Web App URL (https://script.google.com/macros/s/...)"
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-none font-mono text-slate-700 bg-white"
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testStatus?.loading}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {testStatus?.loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>जोडणी तपासा (Test Connection)</span>
                  </button>

                  {testStatus && !testStatus.loading && (
                    <span
                      className={`text-[11px] font-bold flex items-center gap-1 ${
                        testStatus.success ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {testStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {testStatus.message}
                    </span>
                  )}
                </div>

                {/* 11:59 PM Daily Auto-Send Status & Manual Trigger */}
                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                      <Clock className="w-4 h-4 text-amber-700" />
                      <span>दैनिक ११:५९ PM सर्व मंजूर पावत्या ऑटो-सिंक</span>
                    </div>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>सक्रिय (Active)</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-800 leading-tight">
                    दिवसभरात नोंदवलेल्या सर्व मंजूर पावत्यांचे फोटो व पेमेंट पुरावे आपोआप <strong>दररोज रात्री ११:५९ वाजता</strong> moryagroupdata@gmail.com वर ई-मेलने व Google Drive फोल्डरमध्ये सेव्ह होतात.
                  </p>

                  <div className="flex items-center justify-between pt-1 gap-2">
                    <span className="text-[10px] text-slate-600 font-medium">
                      आजचा दर्जा: {isDaily1159ReportSentToday() ? '✅ आजचा अहवाल पाठवला आहे' : '⏳ रात्री ११:५९ वाजता पाठवला जाईल'}
                    </span>

                    <button
                      type="button"
                      disabled={batchStatus?.loading}
                      onClick={handleDispatchDailyBatch}
                      className="py-1 px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      {batchStatus?.loading ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Mail className="w-3 h-3" />
                      )}
                      <span>{batchStatus?.loading ? 'पाठवत आहे...' : 'आजचा बॅच आताच पाठवा'}</span>
                    </button>
                  </div>

                  {batchStatus && !batchStatus.loading && (
                    <div
                      className={`p-2 rounded-lg text-[11px] font-bold flex items-center justify-between gap-1.5 ${
                        batchStatus.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {batchStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                        <span>{batchStatus.message}</span>
                      </div>
                      {batchStatus.folderUrl && (
                        <a
                          href={batchStatus.folderUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-[10px] text-emerald-950 font-black ml-2 whitespace-nowrap"
                        >
                          Drive फोल्डर ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
              येथे जोडलेले सानुकूल जमा प्रकार सर्व फॉर्म्समध्ये थेट उपलब्ध होतात.
            </p>

            {isAdmin && (
              <form onSubmit={handleAdd} className="flex gap-2">
                <input
                  type="text"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="उदा. जाहिरात प्रायोजकत्व, मंडप भाडे..."
                  className="flex-1 p-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none bg-white"
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
