import React, { useState } from 'react';
import { X, Plus, User, Info, CheckCircle } from 'lucide-react';
import { getFinancialYearFromDate } from '../utils/dateUtils';
import {
  IncomeTransaction,
  DepositorType,
  IncomeType,
  PaymentMethod,
  Member,
  OccasionEvent,
  CurrentUser,
} from '../types';

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<IncomeTransaction, 'id'>) => void;
  members: Member[];
  occasions: OccasionEvent[];
  incomeTypes: string[];
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
  onAddCustomIncomeType,
  currentUser,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const autoTransNo = `MG-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

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
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>(
    `RCP-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [notes, setNotes] = useState<string>('');
  const [financialYear, setFinancialYear] = useState<string>('2026-2027');

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

    const finalName =
      depositorType === 'अज्ञात / नाव न सांगणारे'
        ? 'अज्ञात देणगीदार'
        : depositorName.trim() || 'देणगीदार';

    const selectedMemberObj = members.find((m) => m.id === linkedMemberId);
    const selectedOccasionObj = occasions.find((o) => o.id === occasionId);

    const now = new Date();
    const formattedCreatedAt = `${now.toISOString().split('T')[0]} ${now
      .toTimeString()
      .split(' ')[0]}`;

    onSubmit({
      transactionNo: autoTransNo,
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
      paymentReference: paymentReference.trim() || undefined,
      receiptNumber: receiptNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      financialYear: getFinancialYearFromDate(transactionDate),
      createdBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: formattedCreatedAt,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden transform transition-all">
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">पेमेंट पद्धत</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">पावती क्रमांक</label>
              <input
                type="text"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

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
