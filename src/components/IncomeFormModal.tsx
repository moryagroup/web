import React, { useState, useMemo, useEffect } from 'react';
import { X, Plus, User, Info, CheckCircle, BookOpen, BookMarked } from 'lucide-react';
import { getFinancialYearFromDate, generateNextIncomeTransactionNo } from '../utils/dateUtils';
import { getNextSerialForReceiptBook, formatPhysicalReceiptNumber } from '../utils/physicalReceiptUtils';
import {
  IncomeTransaction,
  DepositorType,
  IncomeType,
  PaymentMethod,
  Member,
  OccasionEvent,
  CurrentUser,
} from '../types';
import { canApproveFinancialTransactions } from '../utils/rbac';

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<IncomeTransaction, 'id'>) => void;
  members: Member[];
  occasions: OccasionEvent[];
  incomeTypes: string[];
  incomes?: IncomeTransaction[];
  onAddCustomIncomeType: (newType: string) => void;
  currentUser: CurrentUser;
}

export const IncomeFormModal: React.FC<IncomeFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  members,
  occasions,
  incomeTypes,
  incomes = [],
  onAddCustomIncomeType,
  currentUser,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const autoTransNo = generateNextIncomeTransactionNo(todayStr, incomes);

  const currentLoggedInMember = useMemo(() => {
    if (!currentUser?.name) return null;
    return members.find(
      (m) => m.fullName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()
    );
  }, [members, currentUser]);

  const [isPhysicalReceipt, setIsPhysicalReceipt] = useState<boolean>(false);
  const [receiptBookNo, setReceiptBookNo] = useState<string>('1');
  const [receiptSerialNo, setReceiptSerialNo] = useState<string>(() =>
    String(getNextSerialForReceiptBook('1', incomes))
  );

  const [amount, setAmount] = useState<number | ''>('');
  const [transactionDate, setTransactionDate] = useState<string>(todayStr);
  const [depositorType, setDepositorType] = useState<DepositorType>('सभासद');
  const [depositorName, setDepositorName] = useState<string>('');
  const [linkedMemberId, setLinkedMemberId] = useState<string>('');
  const [incomeType, setIncomeType] = useState<IncomeType>('सभासद वर्गणी');
  const [customIncomeTypeInput, setCustomIncomeTypeInput] = useState<string>('');
  const [showCustomTypeInput, setShowCustomTypeInput] = useState<boolean>(false);
  const [occasionId, setOccasionId] = useState<string>(occasions[0]?.id || '');
  const [reason, setReason] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [cashReceiverMemberId, setCashReceiverMemberId] = useState<string>('');
  const [cashReceiverName, setCashReceiverName] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>(
    `RCP-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [notes, setNotes] = useState<string>('');
  const [financialYear, setFinancialYear] = useState<string>('2026-2027');
  const [autoApprove, setAutoApprove] = useState<boolean>(false);

  // Default cash receiver
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

  const handleBookNoChange = (newBookNo: string) => {
    setReceiptBookNo(newBookNo);
    const nextSerial = getNextSerialForReceiptBook(newBookNo, incomes);
    setReceiptSerialNo(String(nextSerial));
  };

  const handleMemberChange = (memberId: string) => {
    setLinkedMemberId(memberId);
    const selectedMem = members.find((m) => m.id === memberId);
    if (selectedMem) {
      setDepositorName(selectedMem.fullName);
    }
  };

  const handleDepositorTypeChange = (type: DepositorType) => {
    setDepositorType(type);
    if (type === 'अज्ञात / नाव न सांगणारे') {
      setDepositorName('अज्ञात देणगीदार');
      setLinkedMemberId('');
    } else if (type === 'सभासद') {
      if (members.length > 0) {
        setLinkedMemberId(members[0].id);
        setDepositorName(members[0].fullName);
      }
    } else {
      setLinkedMemberId('');
      if (depositorName === 'अज्ञात देणगीदार') {
        setDepositorName('');
      }
    }
  };

  const handleAddCustomTypeSubmit = () => {
    if (customIncomeTypeInput.trim()) {
      onAddCustomIncomeType(customIncomeTypeInput.trim());
      setIncomeType(customIncomeTypeInput.trim());
      setCustomIncomeTypeInput('');
      setShowCustomTypeInput(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('कृपया वैध रक्कम टाका.');
      return;
    }
    if (!transactionDate) {
      alert('कृपया जमा तारीख निवडा.');
      return;
    }

    if (paymentMethod === 'रोख' && !cashReceiverMemberId) {
      alert('कृपया रोख रक्कम स्वीकारणारा सभासद निवडा.');
      return;
    }

    const finalName =
      depositorType === 'अज्ञात / नाव न सांगणारे'
        ? 'अज्ञात देणगीदार'
        : depositorName.trim() || 'देणगीदार';

    const selectedMemberObj = members.find((m) => m.id === linkedMemberId);
    const selectedOccasionObj = occasions.find((o) => o.id === occasionId);
    const selectedCashReceiverObj = members.find((m) => m.id === cashReceiverMemberId);
    const finalCashReceiverName = selectedCashReceiverObj ? selectedCashReceiverObj.fullName : (cashReceiverName || undefined);

    const now = new Date();
    const formattedCreatedAt = `${now.toISOString().split('T')[0]} ${now
      .toTimeString()
      .split(' ')[0]}`;

    const finalReceiptNumber = isPhysicalReceipt
      ? formatPhysicalReceiptNumber(receiptBookNo, receiptSerialNo)
      : receiptNumber.trim() || undefined;

    const finalTransNo = generateNextIncomeTransactionNo(transactionDate, incomes);
    const isAuthorized = canApproveFinancialTransactions(currentUser.role);
    const isApproved = isAuthorized && autoApprove;

    onSubmit({
      transactionNo: finalTransNo,
      amount: Number(amount),
      transactionDate,
      depositorType,
      depositorName: finalName,
      linkedMemberId: depositorType === 'सभासद' ? linkedMemberId : undefined,
      linkedMemberName:
        depositorType === 'सभासद' && selectedMemberObj
          ? `${selectedMemberObj.fullName} (${selectedMemberObj.memberCode})`
          : undefined,
      incomeType,
      occasionId: occasionId || undefined,
      occasionName: selectedOccasionObj ? selectedOccasionObj.name : undefined,
      reason: reason.trim() || `${incomeType} - जमा`,
      paymentMethod,
      cashReceiverMemberId: paymentMethod === 'रोख' ? cashReceiverMemberId : undefined,
      cashReceiverName: paymentMethod === 'रोख' ? finalCashReceiverName : undefined,
      paymentReference: paymentReference.trim() || 'नमूद नाही',
      receiptNumber: finalReceiptNumber,
      receiptBookNo: isPhysicalReceipt ? receiptBookNo : undefined,
      receiptSerialNo: isPhysicalReceipt ? receiptSerialNo : undefined,
      isPhysicalReceipt,
      notes: notes.trim() || 'नमूद नाही',
      financialYear: getFinancialYearFromDate(transactionDate),
      approvalStatus: isApproved ? 'मंजूर' : 'प्रलंबित',
      approvedBy: isApproved ? currentUser.name : undefined,
      approvedByRole: isApproved ? currentUser.role : undefined,
      approvedAt: isApproved ? new Date().toISOString() : undefined,
      createdBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: formattedCreatedAt,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl my-8 overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">नवीन जमा नोंद (Income Entry)</h2>
              <p className="text-xs text-emerald-100">
                व्यवहार क्रमांक: {autoTransNo} | सर्व जमा स्रोतांसाठी
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">विशेष टीप:</span> फक्त{' '}
              <span className="font-bold underline text-amber-800">"सभासद वर्गणी"</span> म्हणून जमा झालेला व्यवहारच सभासदाच्या वार्षिक ₹६,००० वर्गणीत जोडला जातो.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                जमा रक्कम (रुपये) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                  placeholder="उदा. 5000"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                जमा तारीख <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" /> जमा करणाऱ्याचा प्रकार व नाव
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  जमा करणारा कोण आहे? <span className="text-rose-500">*</span>
                </label>
                <select
                  value={depositorType}
                  onChange={(e) => handleDepositorTypeChange(e.target.value as DepositorType)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="सभासद">सभासद</option>
                  <option value="माजी सभासद">माजी सभासद</option>
                  <option value="व्यक्ती / देणगीदार">व्यक्ती / देणगीदार</option>
                  <option value="संस्था">संस्था</option>
                  <option value="व्यवसाय / दुकान">व्यवसाय / दुकान</option>
                  <option value="प्रायोजक">प्रायोजक</option>
                  <option value="अज्ञात / नाव न सांगणारे">अज्ञात / नाव न सांगणारे</option>
                  <option value="इतर">इतर</option>
                </select>
              </div>

              {depositorType === 'सभासद' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    संबंधित सभासद <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={linkedMemberId}
                    onChange={(e) => handleMemberChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.memberCode})
                      </option>
                    ))}
                  </select>
                </div>
              ) : depositorType === 'अज्ञात / नाव न सांगणारे' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    जमा करणाऱ्याचे नाव
                  </label>
                  <input
                    type="text"
                    disabled
                    value="अज्ञात देणगीदार"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 cursor-not-allowed"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    जमा करणाऱ्याचे नाव <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={depositorName}
                    onChange={(e) => setDepositorName(e.target.value)}
                    placeholder="उदा. राजेश पाटील किंवा ABC Traders"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  जमा प्रकार <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomTypeInput(!showCustomTypeInput)}
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  + नवीन प्रकार
                </button>
              </div>

              {showCustomTypeInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customIncomeTypeInput}
                    onChange={(e) => setCustomIncomeTypeInput(e.target.value)}
                    placeholder="नवीन जमा प्रकार"
                    className="flex-1 px-3 py-1.5 border border-emerald-400 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTypeSubmit}
                    className="bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold"
                  >
                    जोडा
                  </button>
                </div>
              ) : (
                <select
                  value={incomeType}
                  onChange={(e) => setIncomeType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {incomeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                कार्यक्रम / प्रसंग
              </label>
              <select
                value={occasionId}
                onChange={(e) => setOccasionId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
              जमा करण्याचे कारण <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="उदा. बॅनर प्रायोजक किंवा वार्षिक वर्गणी हप्ता"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Physical Receipt Book Toggle */}
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              नोंद प्रकार:
            </span>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsPhysicalReceipt(false);
                  setPaymentMethod('UPI');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  !isPhysicalReceipt
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
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
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  isPhysicalReceipt
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>📖 पावती पुस्तक</span>
              </button>
            </div>
          </div>

          {/* Physical Receipt Book Fields */}
          {isPhysicalReceipt && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border-2 border-amber-300 dark:border-amber-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <BookMarked className="w-4 h-4 text-amber-700" />
                  <span>प्रत्यक्ष पावती पुस्तक तपशील</span>
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                  स्वयंचलित व्यवहार क्र: {autoTransNo}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">
                    पावती पुस्तक क्र. (Book No.) *
                  </label>
                  <div className="flex gap-1 mb-1.5">
                    {['1', '2', '3', '4', '5'].map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => handleBookNoChange(b)}
                        className={`flex-1 py-0.5 text-xs font-black rounded border transition-all cursor-pointer ${
                          receiptBookNo === b
                            ? 'bg-amber-600 text-white border-amber-700'
                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={receiptBookNo}
                    onChange={(e) => handleBookNoChange(e.target.value)}
                    placeholder="इतर पुस्तक क्र."
                    className="w-full p-1.5 bg-white border border-amber-300 rounded text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-amber-900">
                      पावती अनुक्रमांक *
                    </label>
                    <span className="text-[9px] text-amber-700 font-bold">
                      पुढील: #{getNextSerialForReceiptBook(receiptBookNo, incomes)}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    required={isPhysicalReceipt}
                    value={receiptSerialNo}
                    onChange={(e) => setReceiptSerialNo(e.target.value)}
                    className="w-full p-2 bg-white border border-amber-300 rounded text-sm font-black text-amber-900 outline-none"
                  />
                  <p className="text-[10px] text-amber-800 mt-1 font-semibold">
                    पावती: <strong>{formatPhysicalReceiptNumber(receiptBookNo, receiptSerialNo)}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">पेमेंट पद्धत</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="रोख">रोख (Cash)</option>
                <option value="UPI">UPI</option>
                <option value="बँक ट्रान्सफर">बँक ट्रान्सफर</option>
                <option value="चेक">चेक</option>
                <option value="इतर">इतर</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ref No. / UPI Id
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="उदा. UPI Ref 920193"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isPhysicalReceipt ? 'स्वयंचलित पावती संदर्भ' : 'पावती क्रमांक'}
              </label>
              <input
                type="text"
                disabled={isPhysicalReceipt}
                value={isPhysicalReceipt ? formatPhysicalReceiptNumber(receiptBookNo, receiptSerialNo) : receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-sm font-medium focus:outline-none ${
                  isPhysicalReceipt
                    ? 'bg-amber-50 border-amber-300 font-bold text-amber-900 cursor-not-allowed'
                    : 'border-slate-300 text-slate-800 focus:ring-2 focus:ring-emerald-500'
                }`}
              />
            </div>
          </div>

          {/* Conditional Cash Receiver Selection for Cash Deposits */}
          {paymentMethod === 'रोख' && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase">
                  💵 रोख रक्कम स्वीकारणारा सभासद <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                  नोंदणीकृत सभासद
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
                className="w-full p-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-600 rounded-lg text-sm font-black text-emerald-950 dark:text-emerald-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
              >
                <option value="" disabled>-- रोख स्वीकारणारा सभासद निवडा --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.memberCode} - {m.fullName} {m.designation ? `(${m.designation})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-sm cursor-pointer"
            >
              रद्द करा
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer shadow-md"
            >
              <CheckCircle className="w-4 h-4" />
              <span>जमा नोंद जतन करा</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
