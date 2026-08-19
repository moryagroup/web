import React from 'react';
import { FinancialYearSummary, CurrentUser } from '../types';
import { isTreasurerRole } from '../utils/rbac';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Calendar, LogOut } from 'lucide-react';

interface HeaderStatsProps {
  summary: FinancialYearSummary;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  currentUser: CurrentUser;
  onOpenLogin?: () => void;
  onLogout?: () => void;
}

export const HeaderStats: React.FC<HeaderStatsProps> = ({
  summary,
  selectedYear,
  setSelectedYear,
  currentUser,
  onLogout,
}) => {
  const isLoggedIn = Boolean(currentUser && currentUser.isLoggedIn === true);
  const isTreasurer = isLoggedIn && isTreasurerRole(currentUser.role);

  // Show Income, Expense & Net Balance summary window ONLY to Treasurer (खजिनदार) and Vice Treasurer (उपखजिनदार)
  if (!isLoggedIn || !isTreasurer) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full my-2">
      {/* Total Income */}
      <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-100 flex items-start justify-between shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold uppercase tracking-wider mb-1">
            <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
            <span>एकूण जमा (Income)</span>
          </div>
          <p className="text-2xl font-black text-emerald-800 tracking-tight">
            {formatCurrency(summary.totalIncome)}
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1 font-semibold flex items-center gap-1.5 flex-wrap">
            <span>ऑनलाइन: {formatCurrency(summary.totalOnlineIncome || 0)}</span>
            <span className="text-emerald-400">|</span>
            <span>रोख: {formatCurrency(summary.totalCashIncome || 0)}</span>
          </p>
        </div>
      </div>

      {/* Total Expenses */}
      <div className="bg-rose-50/80 p-4 rounded-xl border border-rose-100 flex items-start justify-between shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold uppercase tracking-wider mb-1">
            <ArrowUpCircle className="w-4 h-4 text-rose-600" />
            <span>एकूण खर्च (Expense)</span>
          </div>
          <p className="text-2xl font-black text-rose-800 tracking-tight">
            {formatCurrency(summary.approvedExpensesTotal)}
          </p>
          <p className="text-[11px] text-rose-600 mt-1">
            {summary.pendingExpensesCount > 0 ? (
              <span className="font-semibold text-amber-700">
                ⚠️ {summary.pendingExpensesCount} खर्च मंजुरीसाठी प्रलंबित
              </span>
            ) : (
              'सर्व खर्च मंजूर आहेत'
            )}
          </p>
        </div>
      </div>

      {/* Net Balance */}
      <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100 flex items-start justify-between shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-blue-700 font-bold uppercase tracking-wider mb-1">
            <Wallet className="w-4 h-4 text-blue-600" />
            <span>सध्याची शिल्लक (Net Balance)</span>
          </div>
          <p className="text-2xl font-black text-blue-900 tracking-tight">
            {formatCurrency(summary.netBalance)}
          </p>
          <p className="text-[11px] text-blue-600 mt-1 font-medium">
            एकूण जमा - मंजूर खर्च
          </p>
        </div>
      </div>

      {/* Financial Year Selector & Login Status */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-slate-500" /> वर्ष
            </span>
            {isLoggedIn && onLogout && (
              <button
                onClick={onLogout}
                className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 cursor-pointer"
              >
                <LogOut className="w-3 h-3" /> लॉगआउट
              </button>
            )}
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full mt-1 bg-white border border-slate-300 font-bold text-slate-800 text-sm rounded-lg p-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none cursor-pointer"
          >
            <option value="२०२६">२०२६ (चालू वर्ष: १ जाने - ३१ डिसे)</option>
            <option value="२०२५">२०२५ (१ जाने - ३१ डिसे)</option>
            <option value="२०२४">२०२४ (१ जाने - ३१ डिसे)</option>
            <option value="२०२७">२०२७ (१ जाने - ३१ डिसे)</option>
          </select>
        </div>
        <p className="text-[10px] text-slate-500 font-bold mt-1">
          {isLoggedIn ? `${currentUser.name} (${currentUser.role})` : 'सार्वजनिक हिशोब (Public Summary)'}
        </p>
      </div>
    </div>
  );
};
