import React, { useState, useMemo, useEffect } from 'react';
import {
  IncomeTransaction,
  DepositorType,
  IncomeType,
  PaymentMethod,
  Member,
  OccasionEvent,
  CurrentUser,
} from '../types';
import { hasFullFinancialAccess, sortMembersByDesignation, canApproveFinancialTransactions } from '../utils/rbac';
import { getFinancialYearFromDate, getCalendarYearFromDate, generateNextIncomeTransactionNo, convertMarathiToEnglishDigits } from '../utils/dateUtils';
import { RbacGuard } from './RbacGuard';
import { PlusCircle, ArrowDownLeft, CheckCircle2, Upload, AlertCircle, ArrowLeft, ShieldCheck, BookOpen, BookMarked, Clock } from 'lucide-react';
import { uploadFileToGoogleDrive, isGoogleDriveUrl } from '../services/googleDriveService';
import { getNextSerialForReceiptBook, formatPhysicalReceiptNumber } from '../utils/physicalReceiptUtils';
import { TransactionSuccessModal } from './TransactionSuccessModal';

interface IncomeFormProps {
  members: Member[];
  occasions: OccasionEvent[];
  customTypes: string[];
  currentUser: CurrentUser;
  financialYear: string;
  incomes?: IncomeTransaction[];
  groupLogo?: string;
  onAddIncome: (income: IncomeTransaction) => void;
  onAddCustomIncomeType: (newType: string) => void;
  onSuccessNavigate?: () => void;
  onNavigate?: (tab: string) => void;
  onOpenLogin?: () => void;
}

export const IncomeForm: React.FC<IncomeFormProps> = ({
  members,
  occasions,
  customTypes,
  currentUser,
  financialYear,
  incomes = [],
  groupLogo,
  onAddIncome,
  onAddCustomIncomeType,
  onSuccessNavigate,
  onNavigate,
  onOpenLogin,
}) => {
  // Today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  const defaultIncomeTypes = [
    'सभासद वर्गणी',
    'सभासदाकडून अतिरिक्त देणगी',
    'इतर व्यक्तीकडून देणगी',
    'संस्था देणगी / मदत',
    'दुकान / व्यवसाय प्रायोजक',
    'प्रायोजक',
    'कार्यक्रमातून जमा',
    'सार्वजनिक देणगी',
    'बँक व्याज',
    'इतर उत्पन्न',
  ];

  const allIncomeTypes = Array.from(new Set([...defaultIncomeTypes, ...customTypes]));

  const currentLoggedInMember = useMemo(() => {
    if (!currentUser?.name) return null;
    return members.find(
      (m) => m.fullName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
    );
  }, [members, currentUser]);

  // Form states
  const [isPhysicalReceipt, setIsPhysicalReceipt] = useState<boolean>(false);
  const [receiptBookNo, setReceiptBookNo] = useState<string>('1');
  const [receiptSerialNo, setReceiptSerialNo] = useState<string>(() =>
    String(getNextSerialForReceiptBook('1', incomes))
  );

  const [amount, setAmount] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(todayStr);
  const [depositorType, setDepositorType] = useState<DepositorType>('व्यक्ती / देणगीदार');
  const [depositorName, setDepositorName] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [incomeType, setIncomeType] = useState<IncomeType>('इतर व्यक्तीकडून देणगी');
  const [newCustomType, setNewCustomType] = useState<string>('');
  const [showAddTypeModal, setShowAddTypeModal] = useState<boolean>(false);
  const [occasionId, setOccasionId] = useState<string>(occasions[0]?.id || '');
  const [reason, setReason] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [cashReceiverMemberId, setCashReceiverMemberId] = useState<string>('');
  const [cashReceiverName, setCashReceiverName] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [autoApprove, setAutoApprove] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [createdTransaction, setCreatedTransaction] = useState<IncomeTransaction | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [paymentStatus, setPaymentStatus] = useState<'RECEIVED' | 'PENDING'>('RECEIVED');

  // Default cash receiver to logged-in user or first member
  useEffect(() => {
    if (!cashReceiverMemberId && members.length > 0) {
      if (currentLoggedInMember) {
        setCashReceiverMemberId(currentLoggedInMember.id);
        setCashReceiverName(currentLoggedInMember.fullName);
      } else {
        setCashReceiverMemberId(members[0].id);
        setCashReceiverName(members[0].fullName);
      }
    }
  }, [members, currentLoggedInMember, cashReceiverMemberId]);

  // Handle Receipt Book No change
  const handleBookNoChange = (newBookNo: string) => {
    setReceiptBookNo(newBookNo);
    const nextSerial = getNextSerialForReceiptBook(newBookNo, incomes);
    setReceiptSerialNo(String(nextSerial));
  };

  // Handle Depositor Type change
  const handleDepositorTypeChange = (type: DepositorType) => {
    setDepositorType(type);
    if (type === 'सभासद') {
      setIncomeType('सभासद वर्गणी');
      const selfMember = members.find((m) => m.fullName.trim() === currentUser.name.trim());
      if (selfMember) {
        setSelectedMemberId(selfMember.id);
        setDepositorName(selfMember.fullName);
      } else if (members.length > 0) {
        setSelectedMemberId(members[0].id);
        setDepositorName(members[0].fullName);
      }
    } else if (type === 'अज्ञात / नाव न सांगणारे') {
      setDepositorName('अज्ञात देणगीदार');
      setSelectedMemberId('');
      setIncomeType('सार्वजनिक देणगी');
    } else {
      setSelectedMemberId('');
      if (depositorName === 'अज्ञात देणगीदार') setDepositorName('');
    }
  };

  // Handle Member Selection
  const handleMemberSelect = (memberId: string) => {
    setSelectedMemberId(memberId);
    const m = members.find((item) => item.id === memberId);
    if (m) {
      setDepositorName(m.fullName);
    }
  };

  // Add custom income type
  const handleAddNewIncomeType = () => {
    if (newCustomType.trim()) {
      onAddCustomIncomeType(newCustomType.trim());
      setIncomeType(newCustomType.trim());
      setNewCustomType('');
      setShowAddTypeModal(false);
    }
  };

  const [isUploadingDrive, setIsUploadingDrive] = useState(false);

  // File upload handler to Google Drive
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingDrive(true);
    try {
      const driveUrl = await uploadFileToGoogleDrive(file, file.name);
      setAttachmentUrl(driveUrl);
    } catch (err) {
      console.warn('Google Drive upload error:', err);
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('कृपया वैध रक्कम प्रविष्ट करा.');
      return;
    }

    if (!transactionDate) {
      setErrorMessage('कृपया जमा तारीख निवडा.');
      return;
    }

    let finalDepositorName = depositorName.trim();
    if (depositorType === 'अज्ञात / नाव न सांगणारे' || !finalDepositorName) {
      finalDepositorName = 'अज्ञात देणगीदार';
    }

    let linkedMemberName: string | undefined = undefined;
    if (depositorType === 'सभासद' && selectedMemberId) {
      const mem = members.find((m) => m.id === selectedMemberId);
      if (mem) {
        linkedMemberName = `${mem.fullName} (${mem.memberCode})`;
      }
    }

    const isPendingPayment = isPhysicalReceipt && paymentStatus === 'PENDING';

    if (!isPendingPayment && paymentMethod === 'रोख' && !cashReceiverMemberId) {
      setErrorMessage('कृपया रोख रक्कम स्वीकारणारा सभासद निवडा.');
      return;
    }

    const selectedCashReceiverObj = members.find((m) => m.id === cashReceiverMemberId);
    const finalCashReceiverName = selectedCashReceiverObj ? selectedCashReceiverObj.fullName : (cashReceiverName || undefined);

    const selectedOccasion = occasions.find((o) => o.id === occasionId);
    const transactionNo = generateNextIncomeTransactionNo(transactionDate, incomes);

    const isApproved = canApproveFinancialTransactions(currentUser.role) && autoApprove;

    const finalReceiptNumber = isPhysicalReceipt
      ? formatPhysicalReceiptNumber(receiptBookNo, receiptSerialNo)
      : receiptNumber.trim() || undefined;

    const newIncome: IncomeTransaction = {
      id: `inc-${Date.now()}`,
      transactionNo,
      amount: numericAmount,
      transactionDate,
      depositorType,
      depositorName: finalDepositorName,
      linkedMemberId: depositorType === 'सभासद' ? selectedMemberId : undefined,
      linkedMemberName,
      incomeType,
      occasionId: selectedOccasion?.id,
      occasionName: selectedOccasion?.name,
      reason: reason.trim() || `${incomeType} - जमा`,
      paymentMethod: isPendingPayment ? 'येणे बाकी' : paymentMethod,
      cashReceiverMemberId: (!isPendingPayment && paymentMethod === 'रोख') ? cashReceiverMemberId : undefined,
      cashReceiverName: (!isPendingPayment && paymentMethod === 'रोख') ? finalCashReceiverName : undefined,
      paymentReference: (!isPendingPayment && paymentReference.trim()) ? paymentReference.trim() : 'नमूद नाही',
      receiptNumber: finalReceiptNumber,
      receiptBookNo: isPhysicalReceipt ? receiptBookNo : undefined,
      receiptSerialNo: isPhysicalReceipt ? receiptSerialNo : undefined,
      isPhysicalReceipt,
      paymentStatus: isPhysicalReceipt ? paymentStatus : 'RECEIVED',
      receivedDate: isPendingPayment ? undefined : transactionDate,
      attachmentUrl: attachmentUrl || undefined,
      notes: notes.trim() || 'नमूद नाही',
      financialYear: getFinancialYearFromDate(transactionDate),
      approvalStatus: isApproved ? 'मंजूर' : 'प्रलंबित',
      approvedBy: isApproved ? currentUser.name : undefined,
      approvedByRole: isApproved ? currentUser.role : undefined,
      approvedAt: isApproved ? new Date().toISOString() : undefined,
      createdBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: new Date().toISOString(),
    };

    onAddIncome(newIncome);
    setCreatedTransaction(newIncome);
    setShowSuccessModal(true);
    setSavedSuccess(true);

    // Auto-increment physical receipt serial number if applicable
    if (isPhysicalReceipt && receiptSerialNo) {
      const currentNum = parseInt(convertMarathiToEnglishDigits(receiptSerialNo), 10);
      if (!isNaN(currentNum)) {
        setReceiptSerialNo(String(currentNum + 1));
      }
    }

    // Reset input fields for next entry
    setAmount('');
    setReason('');
    setPaymentReference('');
    setReceiptNumber('');
    setAttachmentUrl('');
    setNotes('');
    setPaymentStatus('RECEIVED');
    if (currentLoggedInMember) {
      setCashReceiverMemberId(currentLoggedInMember.id);
      setCashReceiverName(currentLoggedInMember.fullName);
    } else if (members.length > 0) {
      setCashReceiverMemberId(members[0].id);
      setCashReceiverName(members[0].fullName);
    }
  };

  const isLoggedIn = currentUser.isLoggedIn !== false;

  if (!isLoggedIn) {
    return (
      <RbacGuard
        currentRole={currentUser.role}
        title="जमा नोंदणीसाठी लॉगिन आवश्यक"
        message="नवीन जमा किंवा वर्गणीची नोंद प्रविष्ट करण्यासाठी कृपया पासवर्डने लॉगिन करा."
        onLoginClick={onOpenLogin}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 my-4">
      {onNavigate && (
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer mb-3 active:scale-95 shrink-0"
          title="मुख्य डॅशबोर्डवर परत जा (Exit)"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>← मुख्य पानावर जा (Exit)</span>
        </button>
      )}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">नवीन जमा नोंद (Income Entry)</h2>
            <p className="text-xs text-slate-500">
              सभासद, देणगीदार, प्रायोजक किंवा इतर कोणत्याही स्रोताकडून प्राप्त रकमेची नोंद करा.
            </p>
          </div>
        </div>
        <span className="text-xs px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-full border border-slate-200">
          वर्ष: {getCalendarYearFromDate(transactionDate)}
        </span>
      </div>

      {savedSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-800 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">पावती / जमा नोंद यशस्वीरित्या जतन झाली!</p>
              <p className="text-xs text-emerald-700 font-medium">
                {isPhysicalReceipt
                  ? `पुढील पावती अनुक्रमांक #${receiptSerialNo} तयार आहे. आणखी जमा नोंद करा.`
                  : 'व्यवहार नोंदवून मुख्य खात्यात जमा झाला आहे.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSavedSuccess(false)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
            >
              ➕ पुढील पावती नोंदवा
            </button>
            {onSuccessNavigate && (
              <button
                type="button"
                onClick={onSuccessNavigate}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
              >
                📋 जमा इतिहास पहा
              </button>
            )}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Basic Amount & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50/70 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-700">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
              जमा रक्कम (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-lg font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              प्रत्यक्ष जमा तारीख <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              (पैसे प्रत्यक्ष हाती किंवा खात्यात जमा झाले ती तारीख निवडा)
            </p>
          </div>
        </div>

        {/* Section 2: Depositor Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-1">
            १. जमा करणाऱ्याचा तपशील
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                जमा करणारा कोण आहे? <span className="text-rose-500">*</span>
              </label>
              <select
                value={depositorType}
                onChange={(e) => handleDepositorTypeChange(e.target.value as DepositorType)}
                className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="व्यक्ती / देणगीदार">व्यक्ती / देणगीदार</option>
                <option value="सभासद">सभासद</option>
                <option value="माजी सभासद">माजी सभासद</option>
                <option value="संस्था">संस्था</option>
                <option value="व्यवसाय / दुकान">व्यवसाय / दुकान</option>
                <option value="प्रायोजक">प्रायोजक (Sponsor)</option>
                <option value="अज्ञात / नाव न सांगणारे">अज्ञात / नाव न सांगणारे</option>
                <option value="इतर">इतर</option>
              </select>
            </div>

            {depositorType === 'सभासद' ? (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  सभासद निवडा <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleMemberSelect(e.target.value)}
                  className="w-full p-2.5 bg-emerald-50/50 border border-emerald-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {sortMembersByDesignation(members).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.memberCode} - {m.designation || 'सभासद'})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  जमा करणाऱ्याचे नाव {depositorType !== 'अज्ञात / नाव न सांगणारे' && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  disabled={depositorType === 'अज्ञात / नाव न सांगणारे'}
                  value={depositorName}
                  onChange={(e) => setDepositorName(e.target.value)}
                  placeholder={
                    depositorType === 'अज्ञात / नाव न सांगणारे'
                      ? 'अज्ञात देणगीदार'
                      : 'उदा. राजेश पाटील / ABC Traders / गणेश भक्त'
                  }
                  className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 dark:disabled:bg-slate-600 text-slate-500 dark:text-slate-300"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Income Category & Purpose */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-1">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">२. जमा प्रकार व उद्देश</h3>
            <button
              type="button"
              onClick={() => setShowAddTypeModal(true)}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>नवीन जमा प्रकार जोडा</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                जमा प्रकार (Income Head) <span className="text-rose-500">*</span>
              </label>
              <select
                value={incomeType}
                onChange={(e) => setIncomeType(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {allIncomeTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {depositorType === 'सभासद' && incomeType !== 'सभासद वर्गणी' && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 bg-amber-50 dark:bg-amber-900/20 p-1.5 rounded border border-amber-200 dark:border-amber-800">
                  ⚠️ नोंद: हा जमा प्रकार &apos;सभासद वर्गणी&apos; व्यतिरिक्त आहे. ही रक्कम मंडळाच्या एकूण जमा मध्ये मोजली जाईल, परंतु सभासदाच्या ₹६,००० वार्षिक वर्गणी हिशोबात मोजली जाणार नाही.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                कार्यक्रम / उत्सव (Occasion)
              </label>
              <select
                value={occasionId}
                onChange={(e) => setOccasionId(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">-- सामान्य / कोणतीही निवड नाही --</option>
                {occasions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.year})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
              जमा करण्याचे कारण / तपशील
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="उदा. गणेशोत्सवासाठी मुख्य कमानीचे प्रायोजकत्व / महाप्रसाद देणगी"
              className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Section 4: Payment Details & Physical Receipt Book */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              ३. पेमेंट व पावती नोंदणी पद्धत
            </h3>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIsPhysicalReceipt(false);
                  setPaymentStatus('RECEIVED');
                  setPaymentMethod('UPI');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  !isPhysicalReceipt
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <span>⚡ डिजिटल नोंद</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPhysicalReceipt(true);
                  setPaymentMethod('रोख');
                  const nextSerial = getNextSerialForReceiptBook(receiptBookNo, incomes);
                  setReceiptSerialNo(String(nextSerial));
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  isPhysicalReceipt
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>📖 प्रत्यक्ष पावती पुस्तक</span>
              </button>
            </div>
          </div>

          {/* Dedicated Physical Pavti Pustak Entry Card */}
          {isPhysicalReceipt && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border-2 border-amber-300 dark:border-amber-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-black text-sm">
                  <BookMarked className="w-5 h-5 text-amber-700 dark:text-amber-400" />
                  <span>प्रत्यक्ष पावती पुस्तक नोंद (Physical Receipt Book Record)</span>
                </div>
                <span className="text-[11px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 font-bold px-2 py-0.5 rounded-full">
                  स्वयंचलित व्यवहार क्र: {generateNextIncomeTransactionNo(transactionDate, incomes)}
                </span>
              </div>

              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                हस्तलिखित पावती पुस्तकातील नोंदी साठवण्यासाठी खालील पुस्तक क्रमांक व पावती अनुक्रमांक निवडा. ही नोंद पडताळणीसाठी प्रलंबित राहील.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Book No */}
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 uppercase mb-1">
                    पावती पुस्तक क्र. (Book No.) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-1.5 mb-2">
                    {['1', '2', '3', '4', '5'].map((bNo) => (
                      <button
                        key={bNo}
                        type="button"
                        onClick={() => handleBookNoChange(bNo)}
                        className={`flex-1 py-1 text-xs font-black rounded-lg border transition-all cursor-pointer ${
                          receiptBookNo === bNo
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {bNo}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={receiptBookNo}
                    onChange={(e) => handleBookNoChange(e.target.value)}
                    placeholder="किंवा इतर पुस्तक क्र. उदा. 6"
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-600 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Serial / Leaf No */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 uppercase">
                      पावती अनुक्रमांक (Serial No.) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                      सुचवलेला पुढील क्र: #{getNextSerialForReceiptBook(receiptBookNo, incomes)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    required={isPhysicalReceipt}
                    value={receiptSerialNo}
                    onChange={(e) => setReceiptSerialNo(e.target.value)}
                    placeholder="उदा. 1, 2, 3, 4..."
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-600 rounded-lg text-sm font-black text-amber-900 dark:text-amber-200 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-semibold">
                    तयार होणारा पावती संदर्भ: <strong className="text-amber-900 dark:text-amber-200">{formatPhysicalReceiptNumber(receiptBookNo, receiptSerialNo)}</strong>
                  </p>
                </div>

                {/* Payment Collection Status (Received vs Pending) */}
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-200/80 dark:border-amber-700/80">
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 uppercase mb-1.5">
                    रक्कम स्थिती (Payment Status) <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('RECEIVED')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentStatus === 'RECEIVED'
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-amber-200 hover:bg-amber-100/60'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>💵 रक्कम जमा (Received)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('PENDING')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        paymentStatus === 'PENDING'
                          ? 'bg-amber-500 text-slate-900 border-amber-600 shadow-xs ring-2 ring-amber-400 font-black'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-amber-200 hover:bg-amber-100/60'
                      }`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>⏳ रक्कम येणे बाकी (Pending)</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 font-medium">
                    {paymentStatus === 'RECEIVED'
                      ? '✓ रक्कम प्रत्यक्षात जमा झाली असून मुख्य जमा हिशोबात समाविष्ट होईल.'
                      : '⚠️ पावती नोंद होईल, परंतु रक्कम प्रत्यक्षात मिळेपर्यंत एकूण जमेत धरली जाणार नाही (येणे बाकी राहील).'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Method Inputs (Only shown when Payment Status is RECEIVED) */}
          {isPhysicalReceipt && paymentStatus === 'PENDING' ? (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-300 dark:border-amber-700 flex items-start gap-3 shadow-xs">
              <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shrink-0 mt-0.5 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                  रक्कम येणे बाकी (Pending Payment Collection)
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                  रक्कम अद्याप जमा झालेली नसल्याने पेमेंट पद्धत (रोख/ऑनलाइन) व रोख स्वीकारक निवडण्याची आवश्यकता नाही. प्रत्यक्ष रक्कम जमा झाल्यावर <strong>&apos;जमा इतिहास&apos;</strong> मधून <strong>&apos;💵 रक्कम मिळाली&apos;</strong> बटणावर क्लिक करून पेमेंट मोड व तारीख नोंदवता येईल.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    पेमेंट पद्धत <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="रोख">रोख (Cash)</option>
                    <option value="UPI">UPI / PhonePe / GPay</option>
                    <option value="बँक ट्रान्सफर">बँक ट्रान्सफर (NEFT/RTGS)</option>
                    <option value="चेक">चेक (Cheque)</option>
                    <option value="इतर">इतर</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    UPI / Bank / Cheque Ref. No
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="उदा. UPI Txn ID / Cheque No"
                    className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    {isPhysicalReceipt ? 'स्वयंचलित पावती संदर्भ' : 'पावती क्रमांक (Receipt No)'}
                  </label>
                  <input
                    type="text"
                    disabled={isPhysicalReceipt}
                    value={isPhysicalReceipt ? formatPhysicalReceiptNumber(receiptBookNo, receiptSerialNo) : receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    placeholder="उदा. RCP-2026-108"
                    className={`w-full p-2.5 border rounded-lg text-sm focus:outline-none ${
                      isPhysicalReceipt
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 font-bold text-amber-900 dark:text-amber-200 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Conditional Cash Receiver Selection when Payment Method is Cash ('रोख') */}
              {paymentMethod === 'रोख' && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase flex items-center gap-1.5">
                      <span>💵 रोख रक्कम कोणाकडे जमा झाली? (Cash Received By)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                      नोंदणीकृत सभासद निवडा
                    </span>
                  </div>
                  <select
                    required={paymentMethod === 'रोख'}
                    value={cashReceiverMemberId}
                    onChange={(e) => {
                      const mId = e.target.value;
                      setCashReceiverMemberId(mId);
                      const mem = members.find((m) => m.id === mId);
                      if (mem) setCashReceiverName(mem.fullName);
                    }}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 rounded-lg text-sm font-black text-emerald-950 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>-- रोख स्वीकारणारा सभासद निवडा --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.memberCode} - {m.fullName} {m.designation ? `(${m.designation})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    ही रोख रक्कम {cashReceiverName ? <strong className="text-emerald-950 dark:text-white underline">{cashReceiverName}</strong> : 'निवडलेल्या सभासदाकडे'} प्रत्यक्ष जमा राहील व हिशोबात दिसेल.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                Google Drive पावती / Payment Proof पुरावा
              </label>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 p-2.5 bg-amber-50/80 border border-dashed border-amber-300 rounded-lg text-xs font-semibold text-amber-900 cursor-pointer hover:bg-amber-100 transition-colors">
                    <Upload className="w-4 h-4 text-amber-700" />
                    <span>{isUploadingDrive ? 'Google Drive वर अपलोड होत आहे...' : '📷 Drive वर फोटो अपलोड करा'}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      disabled={isUploadingDrive}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="किंवा Google Drive लिंक पेस्ट करा (https://drive.google.com/...)"
                  className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                {attachmentUrl && (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-300 px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-800">
                    <span className="truncate max-w-[240px]">
                      ✓ Google Drive लिंक जोडली: {attachmentUrl}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl('')}
                      className="text-rose-600 hover:underline text-[11px] font-bold shrink-0 ml-2"
                    >
                      हटवा
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                अतिरिक्त टिप्पणी / टीप (Notes)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="उदा. पावती हस्तलिखित दिली आहे"
                className="w-full p-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Approval toggle option for authorized officer */}
        {canApproveFinancialTransactions(currentUser.role) && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  अधिकृत मंजुरी अधिकार ({currentUser.role} - {currentUser.name})
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  तुम्ही {currentUser.role} आहात. ही जमा नोंद तुम्ही आताच परस्पर मंजूर करू शकता.
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-amber-900 dark:text-amber-200">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span>परस्पर मंजूर करा (Auto Approve)</span>
            </label>
          </div>
        )}

        {/* Form Metadata System Banner */}
        <div className="p-3 bg-slate-100/70 dark:bg-slate-900/90 rounded-xl text-xs text-slate-500 dark:text-slate-400 flex flex-wrap justify-between items-center gap-2 border border-slate-200 dark:border-slate-700">
          <div>
            नोंद करणारे खजिनदार/Admin: <span className="font-bold text-slate-700 dark:text-amber-300">{currentUser.name}</span> ({currentUser.role})
          </div>
          <div>
            नोंद तारीख व वेळ (Automatic): <span className="font-mono text-slate-700 dark:text-slate-300">{new Date().toLocaleString('mr-IN')}</span>
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-xl shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowDownLeft className="w-5 h-5" />
            <span>जमा नोंद जतन करा</span>
          </button>
        </div>
      </form>

      {/* Modal for adding custom income type */}
      {showAddTypeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800">नवीन जमा प्रकार जोडा</h3>
            <p className="text-xs text-slate-500">
              उदा. जाहिरात, मंडप भाडे उत्पन्न, रद्दी विक्री, स्पर्धा प्रवेश फी इ.
            </p>
            <input
              type="text"
              autoFocus
              value={newCustomType}
              onChange={(e) => setNewCustomType(e.target.value)}
              placeholder="जमा प्रकार नाव प्रविष्ट करा"
              className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddTypeModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
              >
                रद्द करा
              </button>
              <button
                type="button"
                onClick={handleAddNewIncomeType}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg"
              >
                जोडा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prominent Window Popup for Successfully Created Credit / Income Transaction */}
      <TransactionSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setSavedSuccess(false);
        }}
        type="INCOME"
        transaction={createdTransaction}
        groupLogo={groupLogo}
        onAddNew={() => {
          setShowSuccessModal(false);
          setSavedSuccess(false);
        }}
        onViewHistory={() => {
          setShowSuccessModal(false);
          setSavedSuccess(false);
          if (onSuccessNavigate) {
            onSuccessNavigate();
          } else if (onNavigate) {
            onNavigate('income-history');
          }
        }}
      />
    </div>
  );
};
