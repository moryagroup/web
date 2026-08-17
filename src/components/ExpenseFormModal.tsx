import React, { useState } from 'react';
import { X, MinusCircle, CheckCircle, Info } from 'lucide-react';
import { getFinancialYearFromDate } from '../utils/dateUtils';
import {
  ExpenseTransaction,
  RecipientType,
  ExpenseCategory,
  PaymentMethod,
  OccasionEvent,
  CurrentUser,
  ApprovalStatus,
} from '../types';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<ExpenseTransaction, 'id'>) => void;
  occasions: OccasionEvent[];
  expenseCategories: string[];
  onAddCustomExpenseCategory: (newCategory: string) => void;
  currentUser: CurrentUser;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  occasions,
  expenseCategories,
  onAddCustomExpenseCategory,
  currentUser,
}) => {
  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const autoTransNo = `EXP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const [amount, setAmount] = useState<number | ''>('');
  const [expenseDate, setExpenseDate] = useState<string>(todayStr);
  const [recipientType, setRecipientType] = useState<RecipientType>('दुकान / Vendor');
  const [recipientName, setRecipientName] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('मंडप व सजावट');
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [showCustomCategoryInput, setShowCustomCategoryInput] = useState<boolean>(false);
  const [occasionId, setOccasionId] = useState<string>(occasions[0]?.id || '');
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [billNumber, setBillNumber] = useState<string>('');
  const [financialYear, setFinancialYear] = useState<string>('2026-2027');
  const [autoApprove, setAutoApprove] = useState<boolean>(true);

  const handleAddCustomCategory = () => {
    if (customCategoryInput.trim()) {
      onAddCustomExpenseCategory(customCategoryInput.trim());
      setExpenseCategory(customCategoryInput.trim());
      setCustomCategoryInput('');
      setShowCustomCategoryInput(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('कृपया वैध खर्चाची रक्कम टाका.');
      return;
    }
    if (!expenseDate) {
      alert('कृपया खर्चाची तारीख निवडा.');
      return;
    }
    if (!recipientName.trim()) {
      alert('कृपया रक्कम कोणाला दिली / प्राप्तकर्त्याचे नाव टाका.');
      return;
    }

    const selectedOccasionObj = occasions.find((o) => o.id === occasionId);
    const now = new Date();
    const formattedCreatedAt = `${now.toISOString().split('T')[0]} ${now
      .toTimeString()
      .split(' ')[0]}`;

    const status: ApprovalStatus = autoApprove ? 'मंजूर' : 'प्रलंबित';

    onSubmit({
      transactionNo: autoTransNo,
      amount: Number(amount),
      expenseDate,
      recipientType,
      recipientName: recipientName.trim(),
      expenseCategory,
      occasionId: occasionId || undefined,
      occasionName: selectedOccasionObj ? selectedOccasionObj.name : undefined,
      reason: reason.trim() || `${expenseCategory} खर्च`,
      description: description.trim() || undefined,
      paymentMethod,
      paymentReference: paymentReference.trim() || undefined,
      billNumber: billNumber.trim() || undefined,
      financialYear: getFinancialYearFromDate(expenseDate),
      approvalStatus: status,
      approvedBy: autoApprove ? currentUser.name : undefined,
      approvedByRole: autoApprove ? currentUser.role : undefined,
      approvedAt: autoApprove ? formattedCreatedAt : undefined,
      createdBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: formattedCreatedAt,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl my-8 overflow-hidden transform transition-all">
        <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <MinusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">नवीन खर्च नोंद (Expense Entry)</h2>
              <p className="text-xs text-rose-100">व्यवहार क्रमांक: {autoTransNo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-rose-100 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                खर्चाची रक्कम (रुपये) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                  placeholder="उदा. 7500"
                  className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                खर्चाची तारीख <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              रक्कम कोणाला दिली / प्राप्तकर्ता माहिती
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  प्राप्तकर्त्याचा प्रकार <span className="text-rose-500">*</span>
                </label>
                <select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="दुकान / Vendor">दुकान / Vendor</option>
                  <option value="व्यक्ती">व्यक्ती (Person)</option>
                  <option value="सभासद">सभासद (Member Reimbursement)</option>
                  <option value="संस्था">संस्था</option>
                  <option value="सेवा पुरवठादार">सेवा पुरवठादार</option>
                  <option value="इतर">इतर</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  प्राप्तकर्त्याचे नाव <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="उदा. श्री गणेश डेकोरेटर्स किंवा राजू इलेक्ट्रिकल्स"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">
                  खर्चाचा प्रकार <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowCustomCategoryInput(!showCustomCategoryInput)}
                  className="text-[11px] font-bold text-rose-700 hover:underline"
                >
                  + नवीन प्रकार
                </button>
              </div>

              {showCustomCategoryInput ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="नवीन खर्च प्रकार"
                    className="flex-1 px-3 py-1.5 border border-rose-400 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="bg-rose-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold"
                  >
                    जोडा
                  </button>
                </div>
              ) : (
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
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
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-rose-500 outline-none"
              >
                <option value="">-- सामान्य / इतर खर्च --</option>
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
              खर्चाचे मुख्य कारण <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="उदा. मंडप उभारणी ॲडव्हान्स किंवा साऊंड सिस्टीम भाडे"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">पेमेंट पद्धत</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-rose-500 outline-none"
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
                बिल / पावती क्रमांक
              </label>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                placeholder="उदा. BILL-802"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                UPI / Bank Ref No.
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="उदा. Ref 982019"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-700" />
              <span className="text-xs font-semibold text-amber-900">
                अध्यक्ष / खजिनदार / सचिव कोणत्याही एकाची मंजुरी पुरेशी आहे.
              </span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span>आत्ताच मंजूर करा ({currentUser.name})</span>
            </label>
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm cursor-pointer shadow-md"
            >
              <CheckCircle className="w-4 h-4" />
              <span>खर्च नोंद जतन करा</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
