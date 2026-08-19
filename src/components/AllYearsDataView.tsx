import React, { useState, useMemo } from 'react';
import { IncomeTransaction, ExpenseTransaction, CurrentUser } from '../types';
import { isCoreMemberRole } from '../utils/rbac';
import { RbacGuard } from './RbacGuard';
import { exportToCSV, triggerPDFPrint } from '../utils/exportUtils';
import {
  CALENDAR_YEAR_OPTIONS,
  FINANCIAL_YEAR_OPTIONS,
  getFinancialYearMonthList,
  getCalendarYearMonthList,
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
  ChevronDown,
  ChevronUp,
  Building2,
  CalendarDays,
  ReceiptText,
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
  const [expandedYear, setExpandedYear] = useState<string | null>('२०२६-२७');

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

  // Multi-year aggregates
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

      // Monthly breakdown sorted according to mode
      const monthList =
        viewMode === 'FINANCIAL'
          ? getFinancialYearMonthList(yearKey) // April -> March
          : getCalendarYearMonthList(yearKey); // Jan -> Dec

      const monthlyBreakdown = monthList.map((m) => {
        const mIncomes = yearIncomes.filter((i) => {
          if (!i.transactionDate) return false;
          return i.transactionDate.startsWith(m.key);
        });
        const mExpenses = yearExpenses.filter((e) => {
          if (!e.expenseDate) return false;
          return e.expenseDate.startsWith(m.key);
        });

        const incSum = mIncomes.reduce((sum, i) => sum + i.amount, 0);
        const expSum = mExpenses.reduce((sum, e) => sum + e.amount, 0);
        return {
          ...m,
          income: incSum,
          incomeCount: mIncomes.length,
          expense: expSum,
          expenseCount: mExpenses.length,
          net: incSum - expSum,
          incomes: mIncomes,
          expenses: mExpenses,
        };
      });

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
        monthlyBreakdown,
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
    const modeLabel = viewMode === 'FINANCIAL' ? 'FinancialYears_AprToMar' : 'CalendarYears_JanToDec';
    const filename = `MoryaGroup_${modeLabel}_${Date.now()}.csv`;
    const headers = [
      'अ क्र.',
      viewMode === 'FINANCIAL' ? 'आर्थिक वर्ष (१ एप्रिल - ३१ मार्च)' : 'कॅलेंडर वर्ष (१ जाने - ३१ डिसे)',
      'एकूण जमा (₹)',
      'वर्गणी जमा (₹)',
      'देणगी जमा (₹)',
      'इतर जमा (₹)',
      'एकूण मंजूर खर्च (₹)',
      'निव्वळ शिल्लक बचत (₹)',
      'शिल्लक टक्केवारी (%)',
      'जमा नोंदी',
      'मंजूर खर्च नोंदी',
    ];

    const rows: (string | number | boolean)[][] = yearsSummary.map((item, index) => {
      const margin = item.totalIncome > 0 ? Math.round((item.netBalance / item.totalIncome) * 100) : 0;
      return [
        index + 1,
        item.yearKey,
        item.totalIncome,
        item.subTotal,
        item.donTotal,
        item.otherTotal,
        item.totalExpense,
        item.netBalance,
        `${margin}%`,
        item.incomeCount,
        item.expenseCount,
      ];
    });

    // Grand totals row
    rows.push([]);
    rows.push([
      '',
      'सर्व वर्षांची एकूण बचत (Grand Total)',
      grandTotalIncome,
      '',
      '',
      '',
      grandTotalExpense,
      grandNetBalance,
      '',
      incomes.length,
      expenses.filter((e) => e.approvalStatus === 'मंजूर').length,
    ]);

    exportToCSV(filename, headers, rows);
  };

  const handlePrintPDF = () => {
    const title =
      viewMode === 'FINANCIAL'
        ? 'मोरया ग्रुप सर्व आर्थिक वर्षांचा हिशोब अहवाल (१ एप्रिल ते ३१ मार्च)'
        : 'मोरया ग्रुप सर्व कॅलेंडर वर्षांचा हिशोब अहवाल (१ जानेवारी ते ३१ डिसेंबर)';
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
              className="p-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl border border-slate-700 font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1"
              title="मुख्य डॅशबोर्डवर परत जा"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">← मुख्य पान</span>
            </button>
          )}
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-md text-[11px] font-bold uppercase">
                बहुवार्षिक इतिहास अहवाल
              </span>
              <span className="text-xs text-indigo-300 font-bold">• {currentUser.role}</span>
            </div>
            <h2 className="text-xl font-black mt-1 text-white">
              सर्व वर्षांचा हिशोब अहवाल (All Years History)
            </h2>
            <p className="text-xs text-slate-300">
              आर्थिक वर्ष (१ एप्रिल ते ३१ मार्च) किंवा कॅलेंडर वर्ष (१ जानेवारी ते ३१ डिसेंबर) निवडून सविस्तर हिशोब पहा.
            </p>
          </div>
        </div>

        {/* View Mode Toggle: Financial vs Calendar */}
        <div className="flex items-center bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700 shadow-inner gap-1">
          <button
            type="button"
            onClick={() => {
              setViewMode('FINANCIAL');
              setExpandedYear('२०२६-२७');
            }}
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
            onClick={() => {
              setViewMode('CALENDAR');
              setExpandedYear('२०२६');
            }}
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

      {/* Lifetime Grand Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-600 text-white p-5 rounded-2xl shadow-md space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-100 font-bold uppercase">
            <ArrowDownCircle className="w-4 h-4" />
            <span>सर्व वर्षांची एकूण जमा</span>
          </div>
          <p className="text-2xl font-black">{formatCurr(grandTotalIncome)}</p>
          <p className="text-[11px] text-emerald-100 font-medium">एकूण जमा नोंदी: {incomes.length}</p>
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
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
            {viewMode === 'FINANCIAL'
              ? '📊 आर्थिक वर्षानुसार महिने क्रम: १ एप्रिल ते ३१ मार्च'
              : '📅 कॅलेंडर वर्षानुसार महिने क्रम: १ जानेवारी ते ३१ डिसेंबर'}
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

      {/* Year-by-Year Cards with April-to-March Breakdown */}
      <div className="space-y-4">
        {yearsSummary.map((item) => {
          const isExpanded = expandedYear === item.yearKey;
          return (
            <div
              key={item.yearKey}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all"
            >
              {/* Year Summary Header */}
              <div
                onClick={() => setExpandedYear(isExpanded ? null : item.yearKey)}
                className="p-5 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-900/90 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors select-none"
              >
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
                      className={`text-lg font-black ${
                        item.netBalance >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {formatCurr(item.netBalance)}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-200">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* KPI Cards inside Year */}
              <div className="p-5 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <p className="text-emerald-800 dark:text-emerald-300 font-bold mb-1">एकूण जमा (Deposit)</p>
                  <p className="text-xl font-black text-emerald-900 dark:text-emerald-200">{formatCurr(item.totalIncome)}</p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1.5 flex-wrap">
                    <span>वर्गणी: {formatCurr(item.subTotal)}</span>
                    <span className="text-emerald-400">|</span>
                    <span>देणगी: {formatCurr(item.donTotal)}</span>
                  </p>
                </div>

                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                  <p className="text-rose-800 dark:text-rose-300 font-bold mb-1">एकूण मंजूर खर्च (Expense)</p>
                  <p className="text-xl font-black text-rose-900 dark:text-rose-200">{formatCurr(item.totalExpense)}</p>
                  <p className="text-[10px] text-rose-700 dark:text-rose-400 mt-1">मंजूर व्यवहारांची संख्या: {item.expenseCount}</p>
                </div>

                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 flex flex-col justify-between">
                  <div>
                    <p className="text-blue-800 dark:text-blue-300 font-bold mb-1">शिल्लक टक्केवारी (Savings %)</p>
                    <p className="text-xl font-black text-blue-950 dark:text-blue-200">
                      {item.totalIncome > 0 ? Math.round((item.netBalance / item.totalIncome) * 100) : 0}%
                    </p>
                  </div>
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">
                    ऑनलाइन: {formatCurr(item.onlineTotal)} | रोख: {formatCurr(item.cashTotal)}
                  </p>
                </div>
              </div>

              {/* Expandable 12 Months Breakdown Sorted strictly April to March */}
              {isExpanded && (
                <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-700">
                  <div className="mt-4 mb-3 flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <ReceiptText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      {viewMode === 'FINANCIAL'
                        ? `१२ आर्थिक महिने तपशील (एप्रिल ते मार्च क्रम - ${item.yearKey})`
                        : `१२ कॅलेंडर महिने तपशील (जानेवारी ते डिसेंबर क्रम - ${item.yearKey})`}
                    </h4>
                  </div>

                  {/* Monthly Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {item.monthlyBreakdown.map((m, mIdx) => (
                      <div
                        key={m.key}
                        className={`p-3.5 rounded-xl border transition-all ${
                          m.income > 0 || m.expense > 0
                            ? 'bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-xs'
                            : 'bg-slate-50/50 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800 opacity-70'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-200 dark:border-slate-800">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                            {mIdx + 1}. {m.monthName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              m.net >= 0
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {m.net >= 0 ? '+शिल्लक' : '-तोटा'}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs font-semibold">
                          <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                            <span>जमा ({m.incomeCount}):</span>
                            <span className="font-bold">{formatCurr(m.income)}</span>
                          </div>
                          <div className="flex justify-between text-rose-700 dark:text-rose-400">
                            <span>खर्च ({m.expenseCount}):</span>
                            <span className="font-bold">{formatCurr(m.expense)}</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-black">
                            <span>शिल्लक:</span>
                            <span className={m.net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}>
                              {formatCurr(m.net)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
