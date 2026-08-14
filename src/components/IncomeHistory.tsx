import React, { useState, useMemo } from 'react';
import { IncomeTransaction, Member, CurrentUser } from '../types';
import { hasFullFinancialAccess, isBadgedMember, isCoreMemberRole } from '../utils/rbac';
import { RbacGuard } from './RbacGuard';
import {
  Search,
  Filter,
  ArrowDownLeft,
  Calendar,
  Receipt,
  Eye,
  FileSpreadsheet,
  X,
  Lock,
  Share2,
  Pencil,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { NativeService } from '../services/nativeService';

interface IncomeHistoryProps {
  incomes: IncomeTransaction[];
  members: Member[];
  financialYear: string;
  currentUser?: CurrentUser;
  onUpdateIncome?: (updatedIncome: IncomeTransaction) => void;
  onDeleteIncome?: (incomeId: string) => void;
  onNavigate?: (tab: string) => void;
  onOpenLogin?: () => void;
}

export const IncomeHistory: React.FC<IncomeHistoryProps> = ({
  incomes,
  members,
  financialYear,
  currentUser,
  onUpdateIncome,
  onDeleteIncome,
  onNavigate,
  onOpenLogin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedDepositorType, setSelectedDepositorType] = useState('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('ALL');
  const [selectedMemberId, setSelectedMemberId] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState(financialYear);
  const [selectedIncomeDetail, setSelectedIncomeDetail] = useState<IncomeTransaction | null>(null);

  const isLoggedIn = currentUser?.isLoggedIn !== false;
  const isAdmin = isLoggedIn && (currentUser?.role === 'ॲडमिन' || currentUser?.role === 'Admin' || currentUser?.role === 'अध्यक्ष' || currentUser?.role === 'खजिनदार');

  if (!isLoggedIn && currentUser) {
    return (
      <RbacGuard
        currentRole={currentUser.role}
        title="जमा इतिहास पाहण्यासाठी लॉगिन आवश्यक"
        message="जमा व्यवहार किंवा वैयक्तिक जमा हिशोब पाहण्यासाठी कृपया पासवर्डने लॉगिन करा."
        onLoginClick={onOpenLogin}
      />
    );
  }

  const isFullAccess = currentUser ? hasFullFinancialAccess(currentUser.role) : false;
  const [editingIncome, setEditingIncome] = useState<IncomeTransaction | null>(null);

  const currentMember = useMemo(() => {
    if (!currentUser) return null;
    return members.find(
      (m) =>
        m.fullName.trim() === currentUser.name.trim() ||
        (currentUser.phone && m.phone === currentUser.phone)
    );
  }, [members, currentUser]);

  // Core members & Admin see all incomes. Regular members see ONLY their own incomes.
  const canViewAll = currentUser ? isBadgedMember(currentUser.role) || isCoreMemberRole(currentUser.role) : false;

  const baseIncomes = useMemo(() => {
    if (canViewAll) {
      return incomes;
    }
    return incomes.filter((i) =>
      (currentMember && i.linkedMemberId === currentMember.id) ||
      i.depositorName.trim().toLowerCase() === (currentUser?.name || '').trim().toLowerCase()
    );
  }, [incomes, canViewAll, currentMember, currentUser]);

  // Unique list of income types in dataset
  const availableIncomeTypes = useMemo(() => {
    const types = new Set<string>();
    baseIncomes.forEach((i) => types.add(i.incomeType));
    return Array.from(types);
  }, [baseIncomes]);

  // Filter logic
  const filteredIncomes = useMemo(() => {
    return baseIncomes.filter((item) => {
      // Financial Year match
      if (selectedYear !== 'ALL' && item.financialYear !== selectedYear) return false;

      // Search match
      const query = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        item.depositorName.toLowerCase().includes(query) ||
        item.transactionNo.toLowerCase().includes(query) ||
        item.reason.toLowerCase().includes(query) ||
        (item.paymentReference && item.paymentReference.toLowerCase().includes(query)) ||
        (item.receiptNumber && item.receiptNumber.toLowerCase().includes(query));

      if (!matchSearch) return false;

      // Income type filter
      if (selectedType !== 'ALL' && item.incomeType !== selectedType) return false;

      // Depositor type filter
      if (selectedDepositorType !== 'ALL' && item.depositorType !== selectedDepositorType)
        return false;

      // Payment method filter
      if (selectedPaymentMethod !== 'ALL' && item.paymentMethod !== selectedPaymentMethod)
        return false;

      // Member filter
      if (selectedMemberId !== 'ALL' && item.linkedMemberId !== selectedMemberId) return false;

      return true;
    });
  }, [
    baseIncomes,
    searchTerm,
    selectedType,
    selectedDepositorType,
    selectedPaymentMethod,
    selectedMemberId,
    selectedYear,
  ]);

  const totalFilteredAmount = useMemo(() => {
    return filteredIncomes.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredIncomes]);

  return (
    <div className="space-y-6 my-4">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
              title="मुख्य डॅशबोर्डवर परत जा (Exit)"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">← मुख्य पान</span>
            </button>
          )}
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
            <ArrowDownLeft className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">जमा इतिहास (Income Transactions History)</h2>
            <p className="text-xs text-slate-500">
              मंडळाला विविध स्रोतांकडून मिळालेल्या सर्व जमा रक्कमेचा इतिहास व तपशील.
            </p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
          <p className="text-[11px] text-emerald-700 font-bold uppercase">
            {isFullAccess ? 'एकूण निवडलेली जमा' : 'तुमची एकूण जमा'}
          </p>
          <p className="text-2xl font-black text-emerald-800">
            ₹{totalFilteredAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-emerald-600">एकूण नोंदी: {filteredIncomes.length}</p>
        </div>
      </div>

      {!isFullAccess && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            वैयक्तिक जमा हिशोब: आपण केवळ आपल्या स्वतःच्या जमा व वर्गणी नोंदी पाहत आहात. मंडळाचा सर्व जमा हिशोब केवळ पदाधिकाऱ्यांसाठी उपलब्ध आहे.
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="नाव, व्यवहार क्र., पावती क्र. किंवा कारणाने शोधा..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Financial Year Filter */}
          <div className="w-full md:w-44">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">सर्व आर्थिक वर्षे</option>
              <option value="२०२६-२७">२०२६-२७</option>
              <option value="२०२५-२६">२०२५-२६</option>
            </select>
          </div>

          {/* Income Type Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">सर्व जमा प्रकार</option>
              {availableIncomeTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              जमा करणारा प्रकार:
            </label>
            <select
              value={selectedDepositorType}
              onChange={(e) => setSelectedDepositorType(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="ALL">सर्व प्रकार</option>
              <option value="सभासद">सभासद</option>
              <option value="माजी सभासद">माजी सभासद</option>
              <option value="व्यक्ती / देणगीदार">व्यक्ती / देणगीदार</option>
              <option value="संस्था">संस्था</option>
              <option value="व्यवसाय / दुकान">व्यवसाय / दुकान</option>
              <option value="प्रायोजक">प्रायोजक</option>
              <option value="अज्ञात / नाव न सांगणारे">अज्ञात देणगीदार</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              सभासद फिल्टर:
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="ALL">सर्व सभासद</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.memberCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              पेमेंट पद्धत:
            </label>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            >
              <option value="ALL">सर्व पेमेंट पद्धती</option>
              <option value="रोख">रोख (Cash)</option>
              <option value="UPI">UPI / PhonePe</option>
              <option value="बँक ट्रान्सफर">बँक ट्रान्सफर</option>
              <option value="चेक">चेक</option>
            </select>
          </div>
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="font-bold text-sm text-slate-700">
            जमा व्यवहार यादी ({filteredIncomes.length})
          </span>
          <span className="text-xs text-slate-500">
            प्रत्यक्ष जमा तारखेनुसार क्रमवारी
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="p-3.5">तारीख</th>
                <th className="p-3.5">व्यवहार क्र.</th>
                <th className="p-3.5">जमा करणाऱ्याचे नाव</th>
                <th className="p-3.5">प्रकार</th>
                <th className="p-3.5">जमा प्रकार</th>
                <th className="p-3.5">कारण / तपशील</th>
                <th className="p-3.5 text-right">रक्कम</th>
                <th className="p-3.5">पेमेंट</th>
                <th className="p-3.5">नोंद करणारे</th>
                <th className="p-3.5 text-center">क्रिया</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    कोणतेही जमा व्यवहार आढळले नाहीत.
                  </td>
                </tr>
              ) : (
                filteredIncomes.map((item) => (
                  <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="p-3.5 font-medium whitespace-nowrap">
                      {new Date(item.transactionDate).toLocaleDateString('mr-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 font-semibold">
                      {item.transactionNo}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      <div>{item.depositorName}</div>
                      {item.linkedMemberName && (
                        <div className="text-[10px] text-emerald-700 font-normal">
                          {item.linkedMemberName}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                        {item.depositorType}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.incomeType === 'सभासद वर्गणी'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.incomeType}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-xs truncate" title={item.reason}>
                      {item.reason}
                      {item.occasionName && (
                        <span className="block text-[10px] text-slate-400">
                          उत्सव: {item.occasionName}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                      + ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold">{item.paymentMethod}</div>
                      {item.paymentReference && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[100px]">
                          {item.paymentReference}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-500">{item.createdBy}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedIncomeDetail(item)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer"
                          title="संपूर्ण पावती/तपशील पहा"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => setEditingIncome({ ...item })}
                              className="p-1.5 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors cursor-pointer"
                              title="व्यवहार संपादित करा (ॲडमिन)"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `तुम्हाला खरोखर पावती क्र. ${item.transactionNo} (₹${item.amount}) डिलीट / रद्द करायची आहे का?`
                                  )
                                ) {
                                  onDeleteIncome?.(item.id);
                                }
                              }}
                              className="p-1.5 hover:bg-rose-100 text-rose-700 rounded-lg transition-colors cursor-pointer"
                              title="व्यवहार डिलीट करा (ॲडमिन)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedIncomeDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 border border-slate-200">
            <button
              onClick={() => setSelectedIncomeDetail(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">जमा व्यवहार पावती तपशील</h3>
                <p className="text-xs font-mono text-emerald-700 font-semibold">
                  {selectedIncomeDetail.transactionNo}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  जमा रक्कम
                </span>
                <span className="text-xl font-black text-emerald-700">
                  ₹{selectedIncomeDetail.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  प्रत्यक्ष जमा तारीख
                </span>
                <span className="font-bold text-slate-800">
                  {selectedIncomeDetail.transactionDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  जमा करणाऱ्याचे नाव
                </span>
                <span className="font-bold text-slate-800">
                  {selectedIncomeDetail.depositorName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  जमा करणारा प्रकार
                </span>
                <span className="font-medium text-slate-700">
                  {selectedIncomeDetail.depositorType}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  जमा प्रकार (Income Type)
                </span>
                <span className="font-bold text-blue-700">
                  {selectedIncomeDetail.incomeType}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  पेमेंट पद्धत
                </span>
                <span className="font-medium text-slate-800">
                  {selectedIncomeDetail.paymentMethod}
                  {selectedIncomeDetail.paymentReference ? ` (${selectedIncomeDetail.paymentReference})` : ''}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-700">
              <p>
                <strong className="text-slate-500">कारण:</strong> {selectedIncomeDetail.reason}
              </p>
              {selectedIncomeDetail.occasionName && (
                <p>
                  <strong className="text-slate-500">उत्सव/प्रसंग:</strong>{' '}
                  {selectedIncomeDetail.occasionName}
                </p>
              )}
              {selectedIncomeDetail.receiptNumber && (
                <p>
                  <strong className="text-slate-500">पावती क्र:</strong>{' '}
                  {selectedIncomeDetail.receiptNumber}
                </p>
              )}
              {selectedIncomeDetail.notes && (
                <p>
                  <strong className="text-slate-500">अतिरिक्त टीप:</strong>{' '}
                  {selectedIncomeDetail.notes}
                </p>
              )}
            </div>

            <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100 flex justify-between">
              <span>नोंद करणारे: {selectedIncomeDetail.createdBy}</span>
              <span>
                सिस्टम वेळ:{' '}
                {new Date(selectedIncomeDetail.createdAt).toLocaleString('mr-IN')}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await NativeService.triggerHaptic();
                    const msg = `मोरया ग्रुप मित्र मंडळ पावती\nजमादार: ${selectedIncomeDetail.depositorName}\nरक्कम: ₹${selectedIncomeDetail.amount}\nप्रकार: ${selectedIncomeDetail.incomeType}\nपावती क्र: ${selectedIncomeDetail.transactionNo || 'N/A'}\nतारीख: ${selectedIncomeDetail.transactionDate}`;
                    await NativeService.shareReceipt('मोरया ग्रुप जमा पावती', msg);
                  } catch (e) {
                    console.warn('Share error:', e);
                  }
                }}
                className="flex-1 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4" />
                शेअर करा (WhatsApp)
              </button>

              <button
                onClick={() => setSelectedIncomeDetail(null)}
                className="flex-1 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 shadow-sm"
              >
                बंद करा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Income Modal */}
      {editingIncome && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-600" />
                जमा व्यवहार संपादित करा (ॲडमिन)
              </h3>
              <button
                onClick={() => setEditingIncome(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingIncome) {
                  onUpdateIncome?.(editingIncome);
                  setEditingIncome(null);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">जमा रक्कम (₹) *</label>
                  <input
                    type="number"
                    required
                    value={editingIncome.amount}
                    onChange={(e) => setEditingIncome({ ...editingIncome, amount: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">तारीख *</label>
                  <input
                    type="date"
                    required
                    value={editingIncome.transactionDate}
                    onChange={(e) => setEditingIncome({ ...editingIncome, transactionDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">जमा करणाऱ्याचे नाव *</label>
                <input
                  type="text"
                  required
                  value={editingIncome.depositorName}
                  onChange={(e) => setEditingIncome({ ...editingIncome, depositorName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">कारण / तपशील *</label>
                <input
                  type="text"
                  required
                  value={editingIncome.reason}
                  onChange={(e) => setEditingIncome({ ...editingIncome, reason: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">पेमेंट मोड *</label>
                  <select
                    value={editingIncome.paymentMethod}
                    onChange={(e) => setEditingIncome({ ...editingIncome, paymentMethod: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="रोख">रोख</option>
                    <option value="UPI">UPI</option>
                    <option value="बँक ट्रान्सफर">बँक ट्रान्सफर</option>
                    <option value="चेक">चेक</option>
                    <option value="इतर">इतर</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">रेफरन्स क्र. / UPI ID</label>
                  <input
                    type="text"
                    value={editingIncome.paymentReference || ''}
                    onChange={(e) => setEditingIncome({ ...editingIncome, paymentReference: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingIncome(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow cursor-pointer"
                >
                  बदल सेव्ह करा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
