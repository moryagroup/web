import React, { useState, useMemo } from 'react';
import { ExpenseTransaction, CurrentUser } from '../types';
import { hasFullFinancialAccess } from '../utils/rbac';
import { RbacGuard } from './RbacGuard';
import {
  Search,
  ArrowUpRight,
  CheckCircle,
  Clock,
  ShieldCheck,
  Eye,
  X,
  Check,
  Lock,
} from 'lucide-react';

interface ExpenseHistoryProps {
  expenses: ExpenseTransaction[];
  currentUser: CurrentUser;
  financialYear: string;
  onApproveExpense: (expenseId: string, approverName: string, approverRole: any) => void;
  onOpenLogin?: () => void;
}

export const ExpenseHistory: React.FC<ExpenseHistoryProps> = ({
  expenses,
  currentUser,
  financialYear,
  onApproveExpense,
  onOpenLogin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState(financialYear);
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<ExpenseTransaction | null>(
    null
  );

  const isLoggedIn = currentUser.isLoggedIn !== false;

  if (!isLoggedIn) {
    return (
      <RbacGuard
        currentRole={currentUser.role}
        title="खर्च इतिहास पाहण्यासाठी लॉगिन आवश्यक"
        message="खर्च व्यवहार किंवा वैयक्तिक खर्च हिशोब पाहण्यासाठी कृपया पासवर्डने लॉगिन करा."
        onLoginClick={onOpenLogin}
      />
    );
  }

  const isFullAccess = hasFullFinancialAccess(currentUser.role);

  // Base expenses: Full access sees all; standard member sees ONLY own
  const baseExpenses = useMemo(() => {
    if (isFullAccess) return expenses;
    return expenses.filter((item) => {
      const isCreatedBy = item.createdBy && item.createdBy.includes(currentUser.name);
      const isRecipient = item.recipientName.trim() === currentUser.name.trim();
      return isCreatedBy || isRecipient;
    });
  }, [expenses, isFullAccess, currentUser]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    baseExpenses.forEach((e) => cats.add(e.expenseCategory));
    return Array.from(cats);
  }, [baseExpenses]);

  const filteredExpenses = useMemo(() => {
    return baseExpenses.filter((item) => {
      if (selectedYear !== 'ALL' && item.financialYear !== selectedYear) return false;

      const query = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        item.recipientName.toLowerCase().includes(query) ||
        item.transactionNo.toLowerCase().includes(query) ||
        item.reason.toLowerCase().includes(query) ||
        (item.billNumber && item.billNumber.toLowerCase().includes(query));

      if (!matchSearch) return false;

      if (selectedCategory !== 'ALL' && item.expenseCategory !== selectedCategory) return false;

      if (selectedStatus !== 'ALL' && item.approvalStatus !== selectedStatus) return false;

      if (selectedPaymentMethod !== 'ALL' && item.paymentMethod !== selectedPaymentMethod)
        return false;

      return true;
    });
  }, [
    baseExpenses,
    searchTerm,
    selectedCategory,
    selectedStatus,
    selectedPaymentMethod,
    selectedYear,
  ]);

  const totalFilteredExpenseAmount = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.approvalStatus === 'मंजूर')
      .reduce((sum, item) => sum + item.amount, 0);
  }, [filteredExpenses]);

  const pendingCount = useMemo(() => {
    return baseExpenses.filter((e) => e.approvalStatus === 'प्रलंबित').length;
  }, [baseExpenses]);

  const canApprove = ['अध्यक्ष', 'खजिनदार', 'सचिव', 'उपखजिनदार', 'ॲडमिन', 'Admin'].includes(
    currentUser.role
  );

  const handleApproveClick = (expId: string) => {
    onApproveExpense(expId, currentUser.name, currentUser.role);
    if (selectedExpenseDetail && selectedExpenseDetail.id === expId) {
      setSelectedExpenseDetail({
        ...selectedExpenseDetail,
        approvalStatus: 'मंजूर',
        approvedBy: `${currentUser.name} (${currentUser.role})`,
        approvedByRole: currentUser.role,
        approvedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="space-y-6 my-4">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center font-bold">
            <ArrowUpRight className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">खर्च इतिहास (Expense History)</h2>
            <p className="text-xs text-slate-500">
              मंडळाच्या कार्यक्रमांसाठी, दुकानांना, विक्रेत्यांना व सेवेसाठी झालेल्या खर्चाचा इतिहास.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-amber-900 text-xs">
              <span className="font-bold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {pendingCount} खर्च प्रलंबित
              </span>
            </div>
          )}
          <div className="bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl text-right">
            <p className="text-[11px] text-rose-700 font-bold uppercase">
              {isFullAccess ? 'मंजूर खर्च' : 'तुमचा मंजूर खर्च'}
            </p>
            <p className="text-2xl font-black text-rose-800">
              ₹{totalFilteredExpenseAmount.toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {!isFullAccess && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold shadow-xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            वैयक्तिक खर्च हिशोब: आपण केवळ स्वतःच्या किंवा स्वतः प्रविष्ट केलेल्या खर्चाच्या नोंदी पाहत आहात. मंडळाचा सर्व एकत्रित खर्च हिशोब केवळ पदाधिकाऱ्यांसाठी उपलब्ध आहे.
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="प्राप्तकर्ता नाव, बिल क्र., कारणाने शोधा..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Year */}
          <div className="w-full md:w-44">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="ALL">सर्व आर्थिक वर्षे</option>
              <option value="२०२६-२७">२०२६-२७</option>
              <option value="२०२५-२६">२०२५-२६</option>
            </select>
          </div>

          {/* Category */}
          <div className="w-full md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="ALL">सर्व खर्च प्रकार</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Approval Status Filter */}
          <div className="w-full md:w-40">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="ALL">सर्व मंजुरी स्थिती</option>
              <option value="मंजूर">मंजूर (Approved)</option>
              <option value="प्रलंबित">प्रलंबित (Pending)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <span className="font-bold text-sm text-slate-700">
            खर्च व्यवहार यादी ({filteredExpenses.length})
          </span>
          <span className="text-xs text-slate-500">
            अध्यक्ष / खजिनदार / सचिव यापैकी एकाची मंजुरी आवश्यक
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="p-3.5">तारीख</th>
                <th className="p-3.5">व्यवहार क्र.</th>
                <th className="p-3.5">प्राप्तकर्ता (कोणाला दिले)</th>
                <th className="p-3.5">खर्च प्रकार</th>
                <th className="p-3.5">कारण</th>
                <th className="p-3.5 text-right">रक्कम</th>
                <th className="p-3.5">पेमेंट</th>
                <th className="p-3.5">मंजुरी स्थिती</th>
                <th className="p-3.5">मंजूर करणारे</th>
                <th className="p-3.5 text-center">क्रिया</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    कोणतेही खर्च व्यवहार आढळले नाहीत.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((item) => (
                  <tr key={item.id} className="hover:bg-rose-50/20 transition-colors">
                    <td className="p-3.5 font-medium whitespace-nowrap">
                      {new Date(item.expenseDate).toLocaleDateString('mr-IN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 font-semibold">
                      {item.transactionNo}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      <div>{item.recipientName}</div>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({item.recipientType})
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                        {item.expenseCategory}
                      </span>
                    </td>
                    <td className="p-3.5 max-w-xs truncate" title={item.reason}>
                      {item.reason}
                    </td>
                    <td className="p-3.5 text-right font-black text-rose-700 text-sm whitespace-nowrap">
                      - ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold">{item.paymentMethod}</div>
                      {item.billNumber && (
                        <div className="text-[10px] text-slate-400">बिल: {item.billNumber}</div>
                      )}
                    </td>
                    <td className="p-3.5">
                      {item.approvalStatus === 'मंजूर' ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> मंजूर
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3 text-amber-600" /> प्रलंबित
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-[11px] text-slate-600">
                      {item.approvalStatus === 'मंजूर' ? (
                        <div>
                          <span className="font-semibold text-slate-800">{item.approvedBy}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">मंजुरीची वाट पाहत आहे</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedExpenseDetail(item)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                          title="तपशील पहा"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {item.approvalStatus === 'प्रलंबित' && canApprove && (
                          <button
                            onClick={() => handleApproveClick(item.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                            title="मंजूर करा"
                          >
                            <Check className="w-3 h-3" />
                            <span>मंजूर</span>
                          </button>
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

      {/* Expense Detail Modal */}
      {selectedExpenseDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4 border border-slate-200">
            <button
              onClick={() => setSelectedExpenseDetail(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">खर्च व्यवहार तपशील</h3>
                <p className="text-xs font-mono text-rose-700 font-semibold">
                  {selectedExpenseDetail.transactionNo}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-rose-50/50 p-4 rounded-xl border border-rose-100">
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  खर्चाची रक्कम
                </span>
                <span className="text-xl font-black text-rose-700">
                  ₹{selectedExpenseDetail.amount.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  खर्चाची प्रत्यक्ष तारीख
                </span>
                <span className="font-bold text-slate-800">
                  {selectedExpenseDetail.expenseDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  प्राप्तकर्ता (कोणाला दिले)
                </span>
                <span className="font-bold text-slate-800">
                  {selectedExpenseDetail.recipientName} ({selectedExpenseDetail.recipientType})
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  खर्चाचा प्रकार
                </span>
                <span className="font-bold text-slate-700">
                  {selectedExpenseDetail.expenseCategory}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  मंजुरी स्थिती
                </span>
                <span
                  className={`font-bold ${
                    selectedExpenseDetail.approvalStatus === 'मंजूर'
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {selectedExpenseDetail.approvalStatus}
                </span>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block">
                  पेमेंट पद्धत
                </span>
                <span className="font-medium text-slate-800">
                  {selectedExpenseDetail.paymentMethod}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-700">
              <p>
                <strong className="text-slate-500">कारण:</strong> {selectedExpenseDetail.reason}
              </p>
              {selectedExpenseDetail.description && (
                <p>
                  <strong className="text-slate-500">विवरण:</strong>{' '}
                  {selectedExpenseDetail.description}
                </p>
              )}
              {selectedExpenseDetail.billNumber && (
                <p>
                  <strong className="text-slate-500">बिल क्रमांक:</strong>{' '}
                  {selectedExpenseDetail.billNumber}
                </p>
              )}
              {selectedExpenseDetail.approvalStatus === 'मंजूर' && (
                <p className="p-2 bg-emerald-50 rounded text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />
                  <strong>मंजूर करणारे:</strong> {selectedExpenseDetail.approvedBy}
                </p>
              )}
            </div>

            {selectedExpenseDetail.approvalStatus === 'प्रलंबित' && canApprove && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    खर्च मंजुरी अधिकार ({currentUser.role})
                  </p>
                  <p className="text-[10px] text-amber-700">
                    या खर्चाची प्रत्यक्ष पाहणी करून त्वरित मंजुरी द्या.
                  </p>
                </div>
                <button
                  onClick={() => handleApproveClick(selectedExpenseDetail.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  मंजूर करा
                </button>
              </div>
            )}

            <button
              onClick={() => setSelectedExpenseDetail(null)}
              className="w-full py-2 bg-slate-800 text-white font-bold text-xs rounded-xl hover:bg-slate-900 cursor-pointer"
            >
              बंद करा
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
