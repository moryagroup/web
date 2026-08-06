import React from 'react';
import { FinancialYearSummary, CurrentUser } from '../types';
import { hasFullFinancialAccess } from '../utils/rbac';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Calendar, LogIn, LogOut, UserCheck } from 'lucide-react';

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
  onOpenLogin,
  onLogout,
}) => {
  const hasAccess = hasFullFinancialAccess(currentUser.role);
  const isLoggedIn = currentUser.isLoggedIn !== false;

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  if (!isLoggedIn) {
    return (
      <header className="hidden md:block bg-slate-900 text-white border-b border-slate-800 p-4 lg:p-5 shadow-md shrink-0">
        <div className="flex items-center gap-3 max-w-7xl mx-auto">
          <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-lg shadow-md shrink-0">
            🚩
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-amber-400">
              मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
            </h1>
            <p className="text-xs text-slate-300">
              हडपसर गोंधळनगर, पुणे — सार्वजनिक उत्सव व उपक्रम फोटो दालन
            </p>
          </div>
        </div>
      </header>
    );
  }

  if (!hasAccess) {
    return (
      <header className="bg-white border-b border-slate-200 p-4 lg:p-5 shadow-sm shrink-0">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-800">
                  {currentUser.name}
                </h1>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                वैयक्तिक जमा व खर्च हिशोब खाते • मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer"
              >
                <option value="२०२६-२७">२०२६-२७ (चालू वर्ष)</option>
                <option value="२०२५-२६">२०२५-२६</option>
                <option value="२०२४-२५">२०२४-२५</option>
              </select>
            </div>

            <button
              onClick={onLogout}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>लॉगआउट</span>
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-slate-200 p-4 lg:p-6 shadow-sm shrink-0">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
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
              <p className="text-[11px] text-emerald-600 mt-1">
                वर्गणी: {formatCurrency(summary.totalSubscriptionsCollected)} | देणगी: {formatCurrency(summary.totalDonationsCollected)}
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
                <button
                  onClick={onLogout}
                  className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" /> लॉगआउट
                </button>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full mt-1 bg-white border border-slate-300 font-bold text-slate-800 text-sm rounded-lg p-1.5 focus:ring-2 focus:ring-orange-400 focus:outline-none cursor-pointer"
              >
                <option value="२०२६-२७">२०२६-२७ (चालू वर्ष)</option>
                <option value="२०२५-२६">२०२५-२६</option>
                <option value="२०२४-२५">२०२४-२५</option>
              </select>
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              {currentUser.name} ({currentUser.role})
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
