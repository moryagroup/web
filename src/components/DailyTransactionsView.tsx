import React, { useState, useMemo } from 'react';
import { IncomeTransaction, ExpenseTransaction, Member, CurrentUser } from '../types';
import { convertEnglishToMarathiDigits } from '../utils/dateUtils';
import { formatCompactReceiptDisplay } from '../utils/physicalReceiptUtils';
import { isBadgedMember, canApproveFinancialTransactions, hasFullFinancialAccess } from '../utils/rbac';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Share2,
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Users,
  User,
} from 'lucide-react';
import moryaLogo from '../assets/morya_logo.jpg';

interface DailyTransactionsViewProps {
  incomes: IncomeTransaction[];
  expenses: ExpenseTransaction[];
  members: Member[];
  currentUser: CurrentUser;
  selectedYear: string;
  groupLogo?: string;
  onNavigate?: (tab: string) => void;
}

export type CombinedTransactionItem = {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  transactionNo: string;
  receiptDisplay: string;
  date: string;
  name: string;
  category: string;
  reason: string;
  amount: number;
  paymentMethod: string;
  cashReceiverName?: string;
  recordedBy: string;
  approvalStatus: string;
  rawItem: IncomeTransaction | ExpenseTransaction;
};

export const DailyTransactionsView: React.FC<DailyTransactionsViewProps> = ({
  incomes,
  expenses,
  members,
  currentUser,
  selectedYear,
  groupLogo,
  onNavigate,
}) => {
  // Identify logged in member
  const currentMember = useMemo(() => {
    if (!currentUser?.name) return null;
    const nameNorm = currentUser.name.trim().toLowerCase();
    return members.find(
      (m) =>
        m.fullName.trim().toLowerCase() === nameNorm ||
        (currentUser.phone && m.phone === currentUser.phone)
    );
  }, [members, currentUser]);

  // Committee members (पदाधिकारी / Admin) can see all transactions and toggle between All and My/Member.
  // Regular members can only see their own transactions.
  const isCommitteeMember = currentUser?.isLoggedIn
    ? isBadgedMember(currentUser.role) ||
      (currentMember && isBadgedMember(currentMember.designation)) ||
      canApproveFinancialTransactions(currentUser.role) ||
      hasFullFinancialAccess(currentUser.role)
    : false;

  // Scope filter: 'ALL' (सर्व व्यवहार) or 'MY' (माझे व्यवहार) or specific member ID
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'MY' | string>(
    isCommitteeMember ? 'ALL' : 'MY'
  );

  // Active scope is strictly forced to 'MY' if user is not a committee member
  const activeScope = isCommitteeMember ? scopeFilter : 'MY';

  // Default to today's date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'CASH'>('ALL');

  // Change date helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const userNameNorm = (currentUser?.name || '').trim().toLowerCase();

  // Filter transactions for selected date & active scope
  const dailyIncomes = useMemo(() => {
    return incomes.filter((i) => {
      if (i.approvalStatus === 'रद्द') return false;
      if (i.transactionDate !== selectedDate) return false;

      if (activeScope === 'ALL') return true;

      if (activeScope === 'MY') {
        const isLinkedMember = currentMember && i.linkedMemberId === currentMember.id;
        const isCashReceiver = currentMember && i.cashReceiverMemberId === currentMember.id;
        const isDepositor = (i.depositorName || '').trim().toLowerCase().includes(userNameNorm);
        const isCreator = (i.createdBy || '').trim().toLowerCase().includes(userNameNorm);
        return isLinkedMember || isCashReceiver || isDepositor || isCreator;
      }

      // If activeScope is a specific memberId
      const targetMember = members.find((m) => m.id === activeScope);
      const targetName = (targetMember?.fullName || '').trim().toLowerCase();
      const isLinked = i.linkedMemberId === activeScope;
      const isCashRec = i.cashReceiverMemberId === activeScope;
      const isDep = targetName ? (i.depositorName || '').trim().toLowerCase().includes(targetName) : false;
      const isCre = targetName ? (i.createdBy || '').trim().toLowerCase().includes(targetName) : false;
      return isLinked || isCashRec || isDep || isCre;
    });
  }, [incomes, selectedDate, activeScope, currentMember, userNameNorm, members]);

  const dailyExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.approvalStatus === 'रद्द') return false;
      if (e.expenseDate !== selectedDate) return false;

      if (activeScope === 'ALL') return true;

      if (activeScope === 'MY') {
        const isLinkedMember = currentMember && (e.linkedMemberId === currentMember.id || e.paidByMemberId === currentMember.id);
        const isPaidBy = (e.paidByMemberName || '').trim().toLowerCase().includes(userNameNorm);
        const isRecipient = (e.recipientName || '').trim().toLowerCase().includes(userNameNorm);
        const isCreator = (e.createdBy || '').trim().toLowerCase().includes(userNameNorm);
        return isLinkedMember || isPaidBy || isRecipient || isCreator;
      }

      // If activeScope is a specific memberId
      const targetMember = members.find((m) => m.id === activeScope);
      const targetName = (targetMember?.fullName || '').trim().toLowerCase();
      const isLinked = e.linkedMemberId === activeScope || e.paidByMemberId === activeScope;
      const isPaid = targetName ? (e.paidByMemberName || '').trim().toLowerCase().includes(targetName) : false;
      const isRec = targetName ? (e.recipientName || '').trim().toLowerCase().includes(targetName) : false;
      const isCre = targetName ? (e.createdBy || '').trim().toLowerCase().includes(targetName) : false;
      return isLinked || isPaid || isRec || isCre;
    });
  }, [expenses, selectedDate, activeScope, currentMember, userNameNorm, members]);

  // Combine into unified timeline
  const combinedTransactions = useMemo<CombinedTransactionItem[]>(() => {
    const incomeItems: CombinedTransactionItem[] = dailyIncomes.map((i) => ({
      id: i.id,
      type: 'INCOME',
      transactionNo: i.transactionNo,
      receiptDisplay: formatCompactReceiptDisplay(i),
      date: i.transactionDate,
      name: i.depositorName,
      category: i.incomeType,
      reason: i.reason,
      amount: i.amount,
      paymentMethod: i.paymentMethod,
      cashReceiverName: i.cashReceiverName,
      recordedBy: i.createdBy,
      approvalStatus: i.approvalStatus || 'प्रलंबित',
      rawItem: i,
    }));

    const expenseItems: CombinedTransactionItem[] = dailyExpenses.map((e) => ({
      id: e.id,
      type: 'EXPENSE',
      transactionNo: e.transactionNo,
      receiptDisplay: e.transactionNo,
      date: e.expenseDate,
      name: e.recipientName,
      category: e.expenseCategory,
      reason: e.reason,
      amount: e.amount,
      paymentMethod: e.paymentMethod,
      recordedBy: e.createdBy,
      approvalStatus: e.approvalStatus || 'प्रलंबित',
      rawItem: e,
    }));

    return [...incomeItems, ...expenseItems].sort((a, b) => {
      return a.id.localeCompare(b.id);
    });
  }, [dailyIncomes, dailyExpenses]);

  // Filtered timeline
  const filteredTimeline = useMemo(() => {
    return combinedTransactions.filter((item) => {
      if (selectedFilter === 'INCOME' && item.type !== 'INCOME') return false;
      if (selectedFilter === 'EXPENSE' && item.type !== 'EXPENSE') return false;
      if (selectedFilter === 'CASH' && item.paymentMethod !== 'रोख') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchReason = item.reason.toLowerCase().includes(q);
        const matchNo = item.transactionNo.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        return matchName || matchReason || matchNo || matchCategory;
      }
      return true;
    });
  }, [combinedTransactions, selectedFilter, searchQuery]);

  // Metric Totals
  const totalJama = useMemo(
    () => dailyIncomes.reduce((sum, i) => sum + i.amount, 0),
    [dailyIncomes]
  );
  const totalKharch = useMemo(
    () => dailyExpenses.reduce((sum, e) => sum + e.amount, 0),
    [dailyExpenses]
  );
  const netBalance = totalJama - totalKharch;

  const cashJama = useMemo(
    () => dailyIncomes.filter((i) => i.paymentMethod === 'रोख').reduce((sum, i) => sum + i.amount, 0),
    [dailyIncomes]
  );
  const cashKharch = useMemo(
    () => dailyExpenses.filter((e) => e.paymentMethod === 'रोख').reduce((sum, e) => sum + e.amount, 0),
    [dailyExpenses]
  );
  const netCashBalance = cashJama - cashKharch;

  const digitalJama = totalJama - cashJama;
  const digitalKharch = totalKharch - cashKharch;

  // Print Rozmel Handler
  const handlePrintRozmel = () => {
    window.print();
  };

  const formattedDateLocale = new Date(selectedDate).toLocaleDateString('mr-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-7xl mx-auto p-2.5 sm:p-6 space-y-3 sm:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900 via-rose-950 to-orange-950 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 text-white shadow-xl border border-amber-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src={groupLogo || moryaLogo}
            alt="मोरया ग्रुप लोगो"
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl border-2 border-amber-400 p-0.5 bg-slate-950 object-contain shadow-md shrink-0"
          />
          <div className="min-w-0">
            <span className="px-2 py-0.5 bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[9px] sm:text-[10px] font-bold rounded-full uppercase tracking-wider">
              दैनिक रोजमेळ (Daily Rozmel Ledger)
            </span>
            <h1 className="text-base sm:text-2xl font-black text-amber-300 mt-0.5 truncate">
              दैनिक व्यवहार इतिहास (Daily Transactions)
            </h1>
            <p className="text-[10px] sm:text-xs text-amber-100/80 font-medium truncate">
              रोजचा जमा-खर्च, शिल्लक रक्कम व दैनिक रोख मेळ अहवाल
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto shrink-0 print:hidden">
          <button
            onClick={handlePrintRozmel}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] sm:text-xs rounded-lg sm:rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>प्रिंट / PDF रिपोर्ट</span>
          </button>
        </div>
      </div>

      {/* Date Selector Bar */}
      <div className="bg-white dark:bg-slate-800 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button
            onClick={handlePrevDay}
            className="p-1.5 sm:p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-amber-100 text-slate-700 dark:text-slate-200 rounded-lg sm:rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-600 shrink-0"
            title="मागील दिवस"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="flex-1 sm:flex-none flex items-center gap-1.5 sm:gap-2 bg-slate-50 dark:bg-slate-900 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-slate-300 dark:border-slate-600">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleNextDay}
            className="p-1.5 sm:p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-amber-100 text-slate-700 dark:text-slate-200 rounded-lg sm:rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-600 shrink-0"
            title="पुढील दिवस"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {selectedDate !== todayStr && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="px-2.5 py-1 sm:px-3 sm:py-2 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              📅 आज
            </button>
          )}
        </div>

        <div className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-slate-900/60 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl border border-amber-200 dark:border-slate-700 text-center sm:text-right w-full sm:w-auto">
          {formattedDateLocale}
        </div>
      </div>

      {/* Daily Metrics Cards (Compact 2x2 on Mobile, 4-Col on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Total Jama */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-emerald-300 dark:border-emerald-700 shadow-xs space-y-1 sm:space-y-2 flex flex-col justify-between">
          <div className="flex justify-between items-center text-emerald-900 dark:text-emerald-300 gap-1">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider truncate">आजची जमा (Income)</span>
            <div className="p-1 sm:p-2 bg-emerald-600 text-white rounded-md sm:rounded-xl shadow-2xs shrink-0">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 truncate">
            ₹{totalJama.toLocaleString('en-IN')}
          </div>
          <div className="text-[8px] sm:text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold flex flex-col sm:flex-row justify-between gap-0.5 pt-1 border-t border-emerald-200 dark:border-emerald-800/60 leading-tight">
            <span>💵 रोख: ₹{cashJama.toLocaleString('en-IN')}</span>
            <span>📱 डिजिटल: ₹{digitalJama.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Total Kharch */}
        <div className="bg-rose-50/70 dark:bg-rose-950/40 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-rose-300 dark:border-rose-700 shadow-xs space-y-1 sm:space-y-2 flex flex-col justify-between">
          <div className="flex justify-between items-center text-rose-900 dark:text-rose-300 gap-1">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider truncate">आजचा खर्च (Expense)</span>
            <div className="p-1 sm:p-2 bg-rose-600 text-white rounded-md sm:rounded-xl shadow-2xs shrink-0">
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-rose-700 dark:text-rose-400 truncate">
            ₹{totalKharch.toLocaleString('en-IN')}
          </div>
          <div className="text-[8px] sm:text-[11px] text-rose-800 dark:text-rose-300 font-semibold flex flex-col sm:flex-row justify-between gap-0.5 pt-1 border-t border-rose-200 dark:border-rose-800/60 leading-tight">
            <span>💵 रोख: ₹{cashKharch.toLocaleString('en-IN')}</span>
            <span>📱 डिजिटल: ₹{digitalKharch.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Net Daily Balance */}
        <div className="bg-slate-50 dark:bg-slate-800 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-slate-300 dark:border-slate-600 shadow-xs space-y-1 sm:space-y-2 flex flex-col justify-between">
          <div className="flex justify-between items-center text-slate-700 dark:text-slate-200 gap-1">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider truncate">निव्वळ शिल्लक (Net)</span>
            <div className="p-1 sm:p-2 bg-slate-700 text-white rounded-md sm:rounded-xl shadow-2xs shrink-0">
              <Scale className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div
            className={`text-base sm:text-2xl font-black truncate ${
              netBalance >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            ₹{netBalance.toLocaleString('en-IN')}
          </div>
          <div className="text-[8px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold pt-1 border-t border-slate-200 dark:border-slate-700 truncate leading-tight">
            आजची जमा-खर्च फरक
          </div>
        </div>

        {/* Daily Cash Balance Flow */}
        <div className="bg-amber-50/70 dark:bg-amber-950/40 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border-2 border-amber-300 dark:border-amber-700 shadow-xs space-y-1 sm:space-y-2 flex flex-col justify-between">
          <div className="flex justify-between items-center text-amber-900 dark:text-amber-200 gap-1">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider truncate">हातातील रोख (Cash)</span>
            <div className="p-1 sm:p-2 bg-amber-600 text-white rounded-md sm:rounded-xl shadow-2xs shrink-0">
              <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div
            className={`text-base sm:text-2xl font-black truncate ${
              netCashBalance >= 0
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            ₹{netCashBalance.toLocaleString('en-IN')}
          </div>
          <div className="text-[8px] sm:text-[11px] text-amber-800 dark:text-amber-300 font-semibold pt-1 border-t border-amber-200 dark:border-amber-800/60 truncate leading-tight">
            आजची निव्वळ रोख
          </div>
        </div>
      </div>

      {/* Scope Filter (Only for Committee Members: All vs My vs Member filter; Regular members see personal notice) */}
      {isCommitteeMember ? (
        <div className="bg-amber-50/80 dark:bg-slate-800/90 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-amber-200 dark:border-amber-700/60 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] sm:text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
              <span>व्यवहार व्याप्ती (Scope):</span>
            </span>
            <div className="inline-flex bg-white dark:bg-slate-700 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-amber-200 dark:border-slate-600 shadow-2xs">
              <button
                type="button"
                onClick={() => setScopeFilter('ALL')}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  scopeFilter === 'ALL'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600'
                }`}
              >
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>सर्व व्यवहार</span>
              </button>
              <button
                type="button"
                onClick={() => setScopeFilter('MY')}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  scopeFilter === 'MY'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600'
                }`}
              >
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>माझे व्यवहार</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <label className="text-[10px] sm:text-xs font-bold text-amber-950 dark:text-amber-200 whitespace-nowrap">
              विशिष्ट सभासद:
            </label>
            <select
              value={scopeFilter === 'ALL' || scopeFilter === 'MY' ? '' : scopeFilter}
              onChange={(e) => {
                if (e.target.value) {
                  setScopeFilter(e.target.value);
                } else {
                  setScopeFilter('ALL');
                }
              }}
              className="flex-1 sm:flex-none px-2.5 py-1 sm:px-3 sm:py-1.5 bg-white dark:bg-slate-700 border border-amber-300 dark:border-slate-600 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
            >
              <option value="">-- सर्व सभासद --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.memberCode} - {m.fullName} {m.designation ? `(${m.designation})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-blue-200 dark:border-blue-700 text-[10px] sm:text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="p-0.5 sm:p-1 bg-blue-600 text-white rounded-md text-[10px] sm:text-xs">👤</span>
            <span>तुम्ही फक्त तुमचे स्वतःचे दैनिक व्यवहार पाहत आहात (My Transactions).</span>
          </div>
          <span className="text-[9px] sm:text-[11px] text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg border border-blue-200 dark:border-blue-800">
            {currentUser?.name || 'सभासद'}
          </span>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-2.5 sm:gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-3 top-2.5 sm:top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="नावाने, कारणाने किंवा पावतीने शोधा..."
            className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg sm:rounded-xl w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setSelectedFilter('ALL')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === 'ALL'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            सर्व ({combinedTransactions.length})
          </button>
          <button
            onClick={() => setSelectedFilter('INCOME')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === 'INCOME'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            🟢 जमा ({dailyIncomes.length})
          </button>
          <button
            onClick={() => setSelectedFilter('EXPENSE')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === 'EXPENSE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            🔴 खर्च ({dailyExpenses.length})
          </button>
          <button
            onClick={() => setSelectedFilter('CASH')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              selectedFilter === 'CASH'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            💵 रोख
          </button>
        </div>
      </div>

      {/* Unified Daily Timeline Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200">
            दैनिक जमा-खर्च क्रमिक यादी ({filteredTimeline.length})
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            तारीख: {selectedDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 dark:bg-slate-700/60 text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="p-3.5">प्रकार</th>
                <th className="p-3.5">पावती / व्यवहार क्र.</th>
                <th className="p-3.5">नाव (जमादार / प्राप्तकर्ता)</th>
                <th className="p-3.5">कारण / वर्गवारी</th>
                <th className="p-3.5 text-right">रक्कम</th>
                <th className="p-3.5">पेमेंट पद्धत</th>
                <th className="p-3.5">नोंदणारे</th>
                <th className="p-3.5 text-center">स्थिती</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-xs text-slate-700 dark:text-slate-200">
              {filteredTimeline.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    या तारखेला कोणतेही जमा किंवा खर्च व्यवहार आढळले नाहीत.
                  </td>
                </tr>
              ) : (
                filteredTimeline.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      item.type === 'INCOME'
                        ? 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                        : 'hover:bg-rose-50/40 dark:hover:bg-rose-950/20'
                    }`}
                  >
                    <td className="p-3.5 whitespace-nowrap">
                      {item.type === 'INCOME' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded text-[10px] font-black">
                          <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                          <span>जमा (Credit)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700 rounded text-[10px] font-black">
                          <ArrowUpRight className="w-3 h-3 text-rose-600" />
                          <span>खर्च (Debit)</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] font-semibold whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700 rounded text-xs font-black shadow-2xs font-mono">
                        <BookOpen className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />
                        <span>{item.receiptDisplay}</span>
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-100">
                      {item.name}
                    </td>
                    <td className="p-3.5 max-w-xs truncate" title={item.reason}>
                      <div className="font-semibold text-slate-700 dark:text-slate-200">{item.reason}</div>
                      <div className="text-[10px] text-slate-400">{item.category}</div>
                    </td>
                    <td
                      className={`p-3.5 text-right font-black text-sm whitespace-nowrap ${
                        item.type === 'INCOME' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.type === 'INCOME' ? '+' : '-'} ₹{item.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold">{item.paymentMethod}</div>
                      {item.paymentMethod === 'रोख' && item.cashReceiverName && (
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                          💵 {item.cashReceiverName}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                      {item.recordedBy}
                    </td>
                    <td className="p-3.5 text-center">
                      {item.approvalStatus === 'मंजूर' ? (
                        <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-black">
                          ✓ मंजूर
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded text-[10px] font-black">
                          ⏳ प्रलंबित
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
