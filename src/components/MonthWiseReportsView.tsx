import React, { useState, useMemo } from 'react';
import { IncomeTransaction, ExpenseTransaction, CurrentUser } from '../types';
import { isCoreMemberRole } from '../utils/rbac';
import {
  CALENDAR_YEAR_OPTIONS,
  FINANCIAL_YEAR_OPTIONS,
  getFinancialYearMonthList,
  getCalendarYearMonthList,
  isDateInSelectedYear,
} from '../utils/dateUtils';
import { RbacGuard } from './RbacGuard';
import { exportToCSV, triggerPDFPrint } from '../utils/exportUtils';
import {
  CalendarRange,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Calendar,
  Filter,
  FileSpreadsheet,
  ArrowLeft,
  Printer,
  Building2,
  CalendarDays,
  Star,
  Sparkles,
} from 'lucide-react';

interface MonthWiseReportsViewProps {
  incomes: IncomeTransaction[];
  expenses: ExpenseTransaction[];
  financialYear: string;
  currentUser: CurrentUser;
  onNavigate?: (tab: string) => void;
  onOpenLogin?: () => void;
}

type ViewMode = 'FINANCIAL' | 'CALENDAR';

export const MonthWiseReportsView: React.FC<MonthWiseReportsViewProps> = ({
  incomes,
  expenses,
  financialYear,
  currentUser,
  onNavigate,
  onOpenLogin,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('FINANCIAL');
  const [selectedYear, setSelectedYear] = useState<string>(
    financialYear.includes('-') ? financialYear : '२०२६-२७'
  );
  const [selectedMonth, setSelectedMonth] = useState<string>('CURRENT');

  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isCoreMember = isLoggedIn && isCoreMemberRole(currentUser.role);

  if (!isCoreMember) {
    return (
      <RbacGuard
        currentRole={currentUser.role}
        title="महिन्यानिहाय हिशोब फक्त कोर कमिटीसाठी उपलब्ध"
        message="महिन्यानिहाय जमा, खर्च व शिलकीचा सविस्तर अहवाल पाहण्याचा अधिकार केवळ कोर कमिटी पदाधिकारी (अध्यक्ष, खजिनदार, उपखजिनदार व ॲडमिन) यांनाच आहे."
        onLoginClick={onOpenLogin}
      />
    );
  }

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  // Real-world month key (e.g., '2026-08')
  const realWorldMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Switch between Financial Year (Apr - Mar) and Calendar Year (Jan - Dec)
  const availableYears = viewMode === 'FINANCIAL' ? FINANCIAL_YEAR_OPTIONS : CALENDAR_YEAR_OPTIONS;

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedMonth('CURRENT');
    if (mode === 'FINANCIAL') {
      setSelectedYear('२०२६-२७');
    } else {
      setSelectedYear('२०२६');
    }
  };

  // Filter dataset by selected year
  const yearIncomes = useMemo(() => {
    return incomes.filter((i) => isDateInSelectedYear(i.transactionDate, selectedYear, i.financialYear));
  }, [incomes, selectedYear]);

  const yearExpenses = useMemo(() => {
    return expenses.filter(
      (e) => isDateInSelectedYear(e.expenseDate, selectedYear, e.financialYear) && e.approvalStatus === 'मंजूर'
    );
  }, [expenses, selectedYear]);

  // Generate 12 months ordered strictly according to mode
  const orderedMonths = useMemo(() => {
    return viewMode === 'FINANCIAL'
      ? getFinancialYearMonthList(selectedYear) // April -> March
      : getCalendarYearMonthList(selectedYear); // Jan -> Dec
  }, [viewMode, selectedYear]);

  // Aggregate data per month in exact sequence
  const monthlyDataList = useMemo(() => {
    return orderedMonths.map((m, index) => {
      const mIncomes = yearIncomes.filter((i) => i.transactionDate && i.transactionDate.startsWith(m.key));
      const mExpenses = yearExpenses.filter((e) => e.expenseDate && e.expenseDate.startsWith(m.key));

      const incomeSum = mIncomes.reduce((sum, i) => sum + i.amount, 0);
      const expenseSum = mExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netBalance = incomeSum - expenseSum;

      return {
        index: index + 1,
        key: m.key,
        monthName: m.monthName,
        income: incomeSum,
        countInc: mIncomes.length,
        expense: expenseSum,
        countExp: mExpenses.length,
        net: netBalance,
      };
    });
  }, [orderedMonths, yearIncomes, yearExpenses]);

  // Determine active featured month data
  const featuredMonthData = useMemo(() => {
    if (selectedMonth === 'CURRENT') {
      const currentInYear = monthlyDataList.find((m) => m.key === realWorldMonthKey);
      if (currentInYear) return currentInYear;
      // Fallback: pick month with highest transactions or first month
      const activeWithData = monthlyDataList.find((m) => m.income > 0 || m.expense > 0);
      return activeWithData || monthlyDataList[0];
    }
    if (selectedMonth === 'ALL') {
      const currentInYear = monthlyDataList.find((m) => m.key === realWorldMonthKey);
      return currentInYear || monthlyDataList[0];
    }
    return monthlyDataList.find((m) => m.key === selectedMonth) || monthlyDataList[0];
  }, [selectedMonth, monthlyDataList, realWorldMonthKey]);

  // Filtered monthly list for grid
  const filteredMonthlyData = useMemo(() => {
    if (selectedMonth === 'ALL' || selectedMonth === 'CURRENT') return monthlyDataList;
    return monthlyDataList.filter((m) => m.key === selectedMonth);
  }, [monthlyDataList, selectedMonth]);

  // Overall Year Totals
  const totalYearIncome = yearIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalYearExpense = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalYearBalance = totalYearIncome - totalYearExpense;

  const handleExportCSV = () => {
    const filename = `MoryaGroup_MonthlyReport_${selectedYear}_${Date.now()}.csv`;
    const headers = [
      'अ क्र.',
      'महिना',
      'जमा रक्कम (₹)',
      'जमा नोंदी संख्या',
      'मंजूर खर्च रक्कम (₹)',
      'खर्च नोंदी संख्या',
      'निव्वळ शिल्लक बचत (₹)',
      'वर्ष',
    ];

    const rows: (string | number | boolean)[][] = monthlyDataList.map((data) => {
      return [
        data.index,
        data.monthName,
        data.income,
        data.countInc,
        data.expense,
        data.countExp,
        data.net,
        selectedYear,
      ];
    });

    rows.push([]);
    rows.push([
      '',
      'वार्षिक एकूण (Total Year)',
      totalYearIncome,
      yearIncomes.length,
      totalYearExpense,
      yearExpenses.length,
      totalYearBalance,
      selectedYear,
    ]);

    exportToCSV(filename, headers, rows);
  };

  const handlePrintPDF = () => {
    const title =
      viewMode === 'FINANCIAL'
        ? `मोरया ग्रुप आर्थिक वर्ष महिनानिहाय हिशोब अहवाल (${selectedYear} - १ एप्रिल ते ३१ मार्च)`
        : `मोरया ग्रुप कॅलेंडर वर्ष महिनानिहाय हिशोब अहवाल (${selectedYear} - १ जानेवारी ते ३१ डिसेंबर)`;
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
            <CalendarRange className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-md text-[11px] font-bold uppercase">
                कोर कमिटी अहवाल
              </span>
              <span className="text-xs text-amber-400 font-bold">• {currentUser.role}</span>
            </div>
            <h2 className="text-xl font-black mt-1 text-white">
              महिन्यानिहाय व्यवहार (Month-wise Financial Report)
            </h2>
            <p className="text-xs text-slate-300">
              प्रत्येक महिन्याची जमा, मंजूर खर्च व शिल्लक बचतीचा सविस्तर अहवाल.
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-800/90 p-1.5 rounded-2xl border border-slate-700 shadow-inner gap-1">
          <button
            type="button"
            onClick={() => handleModeChange('FINANCIAL')}
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
            onClick={() => handleModeChange('CALENDAR')}
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

      {/* Filter Row: Year & Month */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
              <Calendar className="w-4 h-4 text-amber-500" /> वर्ष:
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-xs rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1">
              <Filter className="w-4 h-4 text-indigo-500" /> महिना निवडा:
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-black text-xs rounded-xl border-2 border-indigo-400 dark:border-indigo-500 px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer shadow-xs"
            >
              <option value="CURRENT">⭐ चालू महिना (Current Month)</option>
              <option value="ALL">📋 सर्व १२ महिने (All 12 Months)</option>
              <optgroup label="विशिष्ट महिना निवडा (Select Specific Month)">
                {orderedMonths.map((m, idx) => (
                  <option key={m.key} value={m.key}>
                    {idx + 1}. {m.monthName} {m.key === realWorldMonthKey ? '⭐ (चालू महिना)' : ''}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> CSV अहवाल
          </button>
          <button
            type="button"
            onClick={handlePrintPDF}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> प्रिंट / PDF
          </button>
        </div>
      </div>

      {/* 🌟 FEATURED BIG CARD FOR SELECTED/CURRENT MONTH */}
      {featuredMonthData && (
        <div className="bg-gradient-to-br from-amber-500/10 via-slate-50 to-indigo-500/10 dark:from-amber-950/40 dark:via-slate-900 dark:to-indigo-950/40 rounded-3xl p-6 md:p-8 border-2 border-amber-400 dark:border-amber-500/60 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-amber-200 dark:border-amber-900/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {featuredMonthData.key === realWorldMonthKey ? (
                    <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black rounded-full text-[11px] flex items-center gap-1 shadow-xs">
                      <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" /> चालू महिना (Current Month)
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-indigo-600 text-white font-bold rounded-full text-[11px]">
                      निवडलेला महिना (Selected Month)
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    • महिना क्रमांक {featuredMonthData.index}/१२
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-amber-300 mt-1">
                  {featuredMonthData.monthName}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-black px-4 py-1.5 rounded-full border-2 shadow-xs ${
                  featuredMonthData.net >= 0
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-rose-500 text-white border-rose-400'
                }`}
              >
                {featuredMonthData.net >= 0 ? '+शिल्लक (बचत)' : '-तोटा (Deficit)'}
              </span>
            </div>
          </div>

          {/* 3 Extra Large KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Income Card */}
            <div className="bg-white/90 dark:bg-slate-800/90 p-5 rounded-2xl border-2 border-emerald-300 dark:border-emerald-700/60 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                  <ArrowDownCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  एकूण जमा (Total Income)
                </span>
                <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-md">
                  {featuredMonthData.countInc} नोंदी
                </span>
              </div>
              <p className="text-3xl md:text-4xl font-black text-emerald-700 dark:text-emerald-300">
                {formatCurrency(featuredMonthData.income)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {featuredMonthData.monthName} मधील वर्गणी व देणगी जमा
              </p>
            </div>

            {/* Expense Card */}
            <div className="bg-white/90 dark:bg-slate-800/90 p-5 rounded-2xl border-2 border-rose-300 dark:border-rose-700/60 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-800 dark:text-rose-300 uppercase tracking-wide flex items-center gap-1.5">
                  <ArrowUpCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  मंजूर खर्च (Approved Expenses)
                </span>
                <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 rounded-md">
                  {featuredMonthData.countExp} नोंदी
                </span>
              </div>
              <p className="text-3xl md:text-4xl font-black text-rose-700 dark:text-rose-300">
                {formatCurrency(featuredMonthData.expense)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {featuredMonthData.monthName} मधील मंजूर झालेले खर्च
              </p>
            </div>

            {/* Net Balance Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl border-2 border-amber-400/80 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Wallet className="w-5 h-5 text-amber-400" />
                  निव्वळ शिल्लक बचत (Net Balance)
                </span>
                <span className="text-xs font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-md">
                  जमा - खर्च
                </span>
              </div>
              <p className={`text-3xl md:text-4xl font-black ${featuredMonthData.net >= 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                {formatCurrency(featuredMonthData.net)}
              </p>
              <p className="text-xs text-slate-300 font-medium">
                {featuredMonthData.monthName} अखेर शिल्लक बचत
              </p>
            </div>
          </div>

          {/* Quick Month Switcher Tabs/Pills */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" /> त्वरित महिना बदला (Quick Switch Month):
              </span>
              <span className="text-[11px] text-slate-500">
                क्लिक करून दुसरा महिना निवडा
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedMonth('CURRENT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 shrink-0 ${
                  selectedMonth === 'CURRENT'
                    ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-slate-700'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current text-amber-950 dark:text-amber-400" /> चालू महिना
              </button>

              <button
                type="button"
                onClick={() => setSelectedMonth('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedMonth === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700'
                }`}
              >
                📋 सर्व १२ महिने
              </button>

              {orderedMonths.map((m) => {
                const isSelected = selectedMonth === m.key;
                const isRealCurrent = m.key === realWorldMonthKey;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMonth(m.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md ring-2 ring-amber-400'
                        : isRealCurrent
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isRealCurrent && '⭐ '}{m.monthName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3 Overview Cards for Selected Year */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/90 dark:bg-emerald-950/40 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase">
            <ArrowDownCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>वार्षिक एकूण जमा</span>
          </div>
          <p className="text-2xl font-black text-emerald-900 dark:text-emerald-200">{formatCurrency(totalYearIncome)}</p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            एकूण जमा व्यवहारांची संख्या: {yearIncomes.length}
          </p>
        </div>

        <div className="bg-rose-50/90 dark:bg-rose-950/40 p-5 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-rose-800 dark:text-rose-300 font-bold uppercase">
            <ArrowUpCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>वार्षिक एकूण मंजूर खर्च</span>
          </div>
          <p className="text-2xl font-black text-rose-900 dark:text-rose-200">{formatCurrency(totalYearExpense)}</p>
          <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
            एकूण मंजूर खर्चाची संख्या: {yearExpenses.length}
          </p>
        </div>

        <div className="bg-blue-50/90 dark:bg-blue-950/40 p-5 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-blue-800 dark:text-blue-300 font-bold uppercase">
            <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>वार्षिक शिल्लक (Net Balance)</span>
          </div>
          <p className="text-2xl font-black text-blue-950 dark:text-blue-200">{formatCurrency(totalYearBalance)}</p>
          <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium">एकूण जमा - मंजूर खर्च</p>
        </div>
      </div>

      {/* Month-wise Cards Breakdown in Strict Order */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3 flex-wrap gap-2">
          <h3 className="text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            {selectedMonth === 'ALL' || selectedMonth === 'CURRENT'
              ? `सर्व १२ महिन्यांचा जमा-खर्च तक्ता (${selectedYear})`
              : `${featuredMonthData?.monthName} जमा-खर्च अहवाल`}
          </h3>

          {(selectedMonth !== 'ALL' && selectedMonth !== 'CURRENT') && (
            <button
              type="button"
              onClick={() => setSelectedMonth('ALL')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              ← सर्व १२ महिने दाखवा
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMonthlyData.length > 0 ? (
            filteredMonthlyData.map((data) => {
              const netMonthBalance = data.net;
              const isCurrentRealMonth = data.key === realWorldMonthKey;
              return (
                <div
                  key={data.key}
                  className={`rounded-2xl p-4 border space-y-3 transition-all ${
                    isCurrentRealMonth
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 shadow-md ring-1 ring-amber-300/50'
                      : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                        {data.index}. {data.monthName}
                      </span>
                      {isCurrentRealMonth && (
                        <span className="px-1.5 py-0.2 text-[9px] font-black bg-amber-400 text-slate-950 rounded">
                          चालू
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                        netMonthBalance >= 0
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                          : 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                      }`}
                    >
                      {netMonthBalance >= 0 ? '+शिल्लक' : '-तोटा'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600 dark:text-slate-400">जमा ({data.countInc} नोंदी):</span>
                      <span className="text-emerald-700 dark:text-emerald-400">{formatCurrency(data.income)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600 dark:text-slate-400">मंजूर खर्च ({data.countExp} नोंदी):</span>
                      <span className="text-rose-700 dark:text-rose-400">{formatCurrency(data.expense)}</span>
                    </div>
                    <div className="flex justify-between font-black pt-1.5 border-t border-slate-200 dark:border-slate-700 text-sm">
                      <span className="text-slate-800 dark:text-slate-200">निव्वळ शिल्लक:</span>
                      <span className={netMonthBalance >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-800 dark:text-rose-400'}>
                        {formatCurrency(netMonthBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-8 text-slate-500 font-bold text-xs">
              या कालावधीसाठी महिन्यानिहाय नोंदी उपलब्ध नाहीत.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


