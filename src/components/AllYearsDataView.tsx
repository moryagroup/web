import React, { useState, useMemo } from 'react';
import { IncomeTransaction, ExpenseTransaction, CurrentUser } from '../types';
import { isCoreMemberRole } from '../utils/rbac';
import { RbacGuard } from './RbacGuard';
import { exportToCSV, triggerPDFPrint } from '../utils/exportUtils';
import {
  CALENDAR_YEAR_OPTIONS,
  FINANCIAL_YEAR_OPTIONS,
  isDateInSelectedYear,
} from '../utils/dateUtils';
import {
  History,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Calendar,
  ArrowLeft,
  FileSpreadsheet,
  Printer,
  Building2,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';

interface AllYearsDataViewProps {
  incomes: IncomeTransaction[];
  expenses: ExpenseTransaction[];
  currentUser: CurrentUser;
  onNavigate?: (tab: string) => void;
  onOpenLogin?: () => void;
}

type ViewMode = 'FINANCIAL' | 'CALENDAR';

export const AllYearsDataView: React.FC<AllYearsDataViewProps> = ({
  incomes,
  expenses,
  currentUser,
  onNavigate,
  onOpenLogin,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('FINANCIAL');

  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isCoreMember = isLoggedIn && isCoreMemberRole(currentUser.role);

  if (!isCoreMember) {
    return (
      <RbacGuard
        currentRole={currentUser.role}
        title="सर्व वर्षांचा हिशोब फक्त कोर कमिटीसाठी उपलब्ध"
        message="बहुवार्षिक जमा-खर्च अहवाल पाहण्याचा अधिकार केवळ कोर कमिटी पदाधिकारी (अध्यक्ष, खजिनदार, उपखजिनदार व ॲडमिन) यांनाच आहे."
        onLoginClick={onOpenLogin}
      />
    );
  }

  const formatCurr = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  const activeYearList = viewMode === 'FINANCIAL' ? FINANCIAL_YEAR_OPTIONS : CALENDAR_YEAR_OPTIONS;

  // Multi-year aggregates (Yearly Data Only)
  const yearsSummary = useMemo(() => {
    return activeYearList.map((yearKey) => {
      const yearIncomes = incomes.filter((i) =>
        isDateInSelectedYear(i.transactionDate, yearKey, i.financialYear)
      );
      const yearExpenses = expenses.filter(
        (e) =>
          isDateInSelectedYear(e.expenseDate, yearKey, e.financialYear) &&
          e.approvalStatus === 'मंजूर'
      );

      const totalIncome = yearIncomes.reduce((sum, i) => sum + i.amount, 0);
      const totalExpense = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netBalance = totalIncome - totalExpense;

      const subTotal = yearIncomes
        .filter((i) => i.incomeType.includes('वर्गणी'))
        .reduce((sum, i) => sum + i.amount, 0);
      const donTotal = yearIncomes
        .filter((i) => i.incomeType.includes('देणगी') || i.incomeType.includes('प्रायोजकत्व'))
        .reduce((sum, i) => sum + i.amount, 0);
      const otherTotal = Math.max(0, totalIncome - (subTotal + donTotal));
      const onlineTotal = yearIncomes
        .filter((i) => i.paymentMethod !== 'रोख')
        .reduce((sum, i) => sum + i.amount, 0);
      const cashTotal = yearIncomes
        .filter((i) => i.paymentMethod === 'रोख')
        .reduce((sum, i) => sum + i.amount, 0);

      return {
        yearKey,
        totalIncome,
        totalExpense,
        netBalance,
        subTotal,
        donTotal,
        otherTotal,
        onlineTotal,
        cashTotal,
        incomeCount: yearIncomes.length,
        expenseCount: yearExpenses.length,
      };
    });
  }, [incomes, expenses, viewMode, activeYearList]);

  // Lifetime grand total
  const grandTotalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const grandTotalExpense = expenses
    .filter((e) => e.approvalStatus === 'मंजूर')
    .reduce((sum, e) => sum + e.amount, 0);
  const grandNetBalance = grandTotalIncome - grandTotalExpense;

  const handleExportCSV = () => {
    const filename = `MoryaGroup_MultiYearReport_${Date.now()}.csv`;
    const headers = [
      'वर्ष',
      'एकूण जमा (₹)',
      'वर्गणी जमा (₹)',
      'देणगी जमा (₹)',
      'इतर जमा (₹)',
      'ऑनलाइन जमा (₹)',
      'रोख जमा (₹)',
      'जमा नोंदी संख्या',
      'मंजूर खर्च (₹)',
      'खर्च नोंदी संख्या',
      'निव्वळ शिल्लक बचत (₹)',
    ];

    const rows: (string | number)[][] = yearsSummary.map((y) => [
      y.yearKey,
      y.totalIncome,
      y.subTotal,
      y.donTotal,
      y.otherTotal,
      y.onlineTotal,
      y.cashTotal,
      y.incomeCount,
      y.totalExpense,
      y.expenseCount,
      y.netBalance,
    ]);

    rows.push([]);
    rows.push([
      'सर्व वर्षांची एकूण निष्पत्ती (Lifetime Total)',
      grandTotalIncome,
      '',
      '',
      '',
      '',
      '',
      incomes.length,
      grandTotalExpense,
      expenses.filter((e) => e.approvalStatus === 'मंजूर').length,
      grandNetBalance,
    ]);

    exportToCSV(filename, headers, rows);
  };

  const handlePrintPDF = () => {
    const title =
      viewMode === 'FINANCIAL'
        ? `मोरया ग्रुप बहुवार्षिक आर्थिक वर्ष हिशोब अहवाल (All Financial Years Report)`
        : `मोरया ग्रुप बहुवार्षिक कॅलेंडर वर्ष हिशोब अहवाल (All Calendar Years Report)`;
    triggerPDFPrint(title);
  };

  return (
    <div className="space-y-6 my-2">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
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
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-md text-[11px] font-bold uppercase">
                सर्व वर्षांचा अहवाल (Yearly Data Only)
              </span>
              <span className="text-xs text-amber-400 font-bold">• {currentUser.role}</span>
            </div>
            <h2 className="text-xl font-black mt-1 text-white">
              वार्षिक तुलना व बहुवार्षिक जमा-खर्च (Multi-Year Summary)
            </h2>
            <p className="text-xs text-slate-300">
              प्रत्येक वर्षाचा एकूण जमा, मंजूर खर्च व शिल्लक बचतीचा वर्षानिहाय आढावा.
            </p>
          </div>
        </div>

        {/* Mode Switcher: Financial vs Calendar */}
        <div className="flex items-center bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700 shadow-inner gap-1">
          <button
            type="button"
            onClick={() => setViewMode('FINANCIAL')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'FINANCIAL'
                ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.02]'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>आर्थिक वर्ष (१ एप्रिल - ३१ मार्च)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('CALENDAR')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'CALENDAR'
                ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.02]'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>कॅलेंडर वर्ष (१ जाने - ३१ डिसे)</span>
          </button>
        </div>
      </div>

      {/* Lifetime KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-md space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-100 font-bold uppercase">
            <ArrowDownCircle className="w-4 h-4" />
            <span>सर्व वर्षांची एकूण जमा</span>
          </div>
          <p className="text-2xl font-black">{formatCurr(grandTotalIncome)}</p>
          <p className="text-[11px] text-emerald-100 font-medium">
            एकूण जमा नोंदी: {incomes.length}
          </p>
        </div>

        <div className="bg-rose-600 text-white p-5 rounded-2xl shadow-md space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-rose-100 font-bold uppercase">
            <ArrowUpCircle className="w-4 h-4" />
            <span>सर्व वर्षांचा एकूण खर्च</span>
          </div>
          <p className="text-2xl font-black">{formatCurr(grandTotalExpense)}</p>
          <p className="text-[11px] text-rose-100 font-medium">
            एकूण मंजूर खर्च नोंदी: {expenses.filter((e) => e.approvalStatus === 'मंजूर').length}
          </p>
        </div>

        <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-md space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-indigo-100 font-bold uppercase">
            <Wallet className="w-4 h-4" />
            <span>अखेरची शिल्लक (Lifetime Net)</span>
          </div>
          <p className="text-2xl font-black">{formatCurr(grandNetBalance)}</p>
          <p className="text-[11px] text-indigo-100 font-medium">सर्व वर्षांमधील एकूण शिल्लक बचत</p>
        </div>
      </div>

      {/* Export & Action Controls */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {viewMode === 'FINANCIAL'
              ? '📊 वर्षानिहाय तुलनात्मक अहवाल (आर्थिक वर्ष क्रम: १ एप्रिल ते ३१ मार्च)'
              : '📅 वर्षानिहाय तुलनात्मक अहवाल (कॅलेंडर वर्ष क्रम: १ जानेवारी ते ३१ डिसेंबर)'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> CSV डाउनलोड
          </button>
          <button
            type="button"
            onClick={handlePrintPDF}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> प्रिंट / PDF
          </button>
        </div>
      </div>

      {/* Pure Year-by-Year Summary Cards (No Monthly Data) */}
      <div className="space-y-4">
        {yearsSummary.map((item) => {
          return (
            <div
              key={item.yearKey}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all space-y-3"
            >
              {/* Year Summary Header */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-amber-400 font-black text-base rounded-xl border border-slate-700 shadow-xs">
                    {item.yearKey}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                      {viewMode === 'FINANCIAL'
                        ? 'आर्थिक वर्ष (१ एप्रिल ते ३१ मार्च)'
                        : 'कॅलेंडर वर्ष (१ जानेवारी ते ३१ डिसेंबर)'}
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                      जमा नोंदी: {item.incomeCount} | खर्च नोंदी: {item.expenseCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">निव्वळ शिल्लक:</span>
                    <span
                      className={`text-xl font-black ${
                        item.netBalance >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {formatCurr(item.netBalance)}
                    </span>
                  </div>
                  {onNavigate && (
                    <button
                      type="button"
                      onClick={() => onNavigate('month_reports')}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <CalendarRange className="w-3.5 h-3.5" /> महिना अहवाल पहा →
                    </button>
                  )}
                </div>
              </div>

              {/* Pure Yearly KPI Metrics */}
              <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                  <p className="text-emerald-800 dark:text-emerald-300 font-black text-xs uppercase tracking-wide">
                    एकूण जमा (Deposit)
                  </p>
                  <p className="text-2xl font-black text-emerald-900 dark:text-emerald-200">{formatCurr(item.totalIncome)}</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5 flex-wrap pt-1 border-t border-emerald-200 dark:border-emerald-800/60">
                    <span>वर्गणी: {formatCurr(item.subTotal)}</span>
                    <span className="text-emerald-400">|</span>
                    <span>देणगी: {formatCurr(item.donTotal)}</span>
                  </p>
                </div>

                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800 space-y-1">
                  <p className="text-rose-800 dark:text-rose-300 font-black text-xs uppercase tracking-wide">
                    एकूण मंजूर खर्च (Expense)
                  </p>
                  <p className="text-2xl font-black text-rose-900 dark:text-rose-200">{formatCurr(item.totalExpense)}</p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium pt-1 border-t border-rose-200 dark:border-rose-800/60">
                    मंजूर व्यवहारांची संख्या: {item.expenseCount}
                  </p>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex flex-col justify-between space-y-1">
                  <div>
                    <p className="text-blue-800 dark:text-blue-300 font-black text-xs uppercase tracking-wide">
                      शिल्लक टक्केवारी (Savings %)
                    </p>
                    <p className="text-2xl font-black text-blue-950 dark:text-blue-200">
                      {item.totalIncome > 0 ? Math.round((item.netBalance / item.totalIncome) * 100) : 0}%
                    </p>
                  </div>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium pt-1 border-t border-blue-200 dark:border-blue-800/60">
                    ऑनलाइन: {formatCurr(item.onlineTotal)} | रोख: {formatCurr(item.cashTotal)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

