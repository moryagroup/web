import React, { useState, useMemo } from 'react';
import { IncomeTransaction, ExpenseTransaction, CurrentUser } from '../types';
import { isCoreMemberRole } from '../utils/rbac';
import { isDateInSelectedYear } from '../utils/dateUtils';
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
  Receipt,
  ArrowLeft,
  Printer,
} from 'lucide-react';

interface MonthWiseReportsViewProps {
  incomes: IncomeTransaction[];
  expenses: ExpenseTransaction[];
  financialYear: string;
  currentUser: CurrentUser;
  onNavigate?: (tab: string) => void;
  onOpenLogin?: () => void;
}

const MARATHI_MONTHS = [
  'सर्व महिने (All Months)',
  'ऑगस्ट २०२६',
  'जुलै २०२६',
  'जून २०२६',
  'मे २०२६',
  'एप्रिल २०२६',
  'मार्च २०२६',
  'फेब्रुवारी २०२६',
  'जानेवारी २०२६',
  'डिसेंबर २०२५',
  'नोव्हेंबर २०२५',
  'ऑक्टोबर २०२५',
  'सप्टेंबर २०२५',
];

export const MonthWiseReportsView: React.FC<MonthWiseReportsViewProps> = ({
  incomes,
  expenses,
  financialYear,
  currentUser,
  onNavigate,
  onOpenLogin,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>(financialYear);
  const [selectedMonth, setSelectedMonth] = useState<string>('सर्व महिने (All Months)');

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

  // Filter dataset by calendar year (Jan - Dec)
  const yearIncomes = useMemo(() => {
    return incomes.filter((i) => isDateInSelectedYear(i.transactionDate, selectedYear, i.financialYear));
  }, [incomes, selectedYear]);

  const yearExpenses = useMemo(() => {
    return expenses.filter((e) => isDateInSelectedYear(e.expenseDate, selectedYear, e.financialYear));
  }, [expenses, selectedYear]);

  // Monthly Grouping
  const monthlyData = useMemo(() => {
    const monthsMap: Record<string, { income: number; expense: number; countInc: number; countExp: number }> = {};

    yearIncomes.forEach((i) => {
      const date = new Date(i.transactionDate);
      const key = date.toLocaleString('mr-IN', { month: 'long', year: 'numeric' });
      if (!monthsMap[key]) {
        monthsMap[key] = { income: 0, expense: 0, countInc: 0, countExp: 0 };
      }
      monthsMap[key].income += i.amount;
      monthsMap[key].countInc += 1;
    });

    yearExpenses.forEach((e) => {
      if (e.approvalStatus === 'मंजूर') {
        const date = new Date(e.expenseDate);
        const key = date.toLocaleString('mr-IN', { month: 'long', year: 'numeric' });
        if (!monthsMap[key]) {
          monthsMap[key] = { income: 0, expense: 0, countInc: 0, countExp: 0 };
        }
        monthsMap[key].expense += e.amount;
        monthsMap[key].countExp += 1;
      }
    });

    return monthsMap;
  }, [yearIncomes, yearExpenses]);

  // Overall Year Totals
  const totalYearIncome = yearIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalYearExpense = yearExpenses
    .filter((e) => e.approvalStatus === 'मंजूर')
    .reduce((sum, e) => sum + e.amount, 0);
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
      'आर्थिक वर्ष',
    ];

    const entries = Object.entries(monthlyData);
    const rows: (string | number | boolean)[][] = entries.map(([monthName, data], index) => {
      const net = data.income - data.expense;
      return [
        index + 1,
        monthName,
        data.income,
        data.countInc,
        data.expense,
        data.countExp,
        net,
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
      yearExpenses.filter((e) => e.approvalStatus === 'मंजूर').length,
      totalYearBalance,
      selectedYear,
    ]);

    exportToCSV(filename, headers, rows);
  };

  const handlePrintPDF = () => {
    triggerPDFPrint(`मोरया ग्रुप महिनावारी जमा-खर्च अहवाल (${selectedYear})`);
  };

  return (
    <div className="space-y-6 my-2">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-rose-950 to-orange-950 text-white p-6 rounded-3xl shadow-xl border border-amber-500/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

        {/* Year Filter */}
        <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
          <span className="text-xs text-slate-300 font-bold flex items-center gap-1">
            <Calendar className="w-4 h-4 text-amber-400" /> वर्ष:
          </span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-800 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 p-2.5 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
          >
            <option value="२०२६">२०२६ (चालू वर्ष)</option>
            <option value="२०२५">२०२५</option>
            <option value="२०२४">२०२४</option>
            <option value="२०२७">२०२७</option>
          </select>
        </div>
      </div>

      {/* 3 Overview Cards for Selected Financial Year */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50/90 p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold uppercase">
            <ArrowDownCircle className="w-4 h-4 text-emerald-600" />
            <span>वार्षिक एकूण जमा</span>
          </div>
          <p className="text-2xl font-black text-emerald-900">{formatCurrency(totalYearIncome)}</p>
          <p className="text-[11px] text-emerald-700 font-medium">
            एकूण जमा व्यवहारांची संख्या: {yearIncomes.length}
          </p>
        </div>

        <div className="bg-rose-50/90 p-5 rounded-2xl border border-rose-200 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-rose-800 font-bold uppercase">
            <ArrowUpCircle className="w-4 h-4 text-rose-600" />
            <span>वार्षिक एकूण मंजूर खर्च</span>
          </div>
          <p className="text-2xl font-black text-rose-900">{formatCurrency(totalYearExpense)}</p>
          <p className="text-[11px] text-rose-700 font-medium">
            एकूण मंजूर खर्चाची संख्या: {yearExpenses.filter((e) => e.approvalStatus === 'मंजूर').length}
          </p>
        </div>

        <div className="bg-blue-50/90 p-5 rounded-2xl border border-blue-200 shadow-sm space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-blue-800 font-bold uppercase">
            <Wallet className="w-4 h-4 text-blue-600" />
            <span>वार्षिक शिल्लक (Net Balance)</span>
          </div>
          <p className="text-2xl font-black text-blue-950">{formatCurrency(totalYearBalance)}</p>
          <p className="text-[11px] text-blue-700 font-medium">एकूण जमा - मंजूर खर्च</p>
        </div>
      </div>

      {/* Month-wise Cards Breakdown */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileSpreadsheet className="w-5 h-5 text-amber-600" />
          महिनानिहाय जमा-खर्च तक्ता ({selectedYear})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.keys(monthlyData).length > 0 ? (
            Object.entries(monthlyData).map(([monthName, rawData]) => {
              const data = rawData as { income: number; expense: number };
              const netMonthBalance = data.income - data.expense;
              return (
                <div
                  key={monthName}
                  className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="font-black text-slate-900 text-sm">{monthName}</span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        netMonthBalance >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {netMonthBalance >= 0 ? 'शिल्लक फायद्यात' : 'तोटा'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600">जमा (Income):</span>
                      <span className="text-emerald-700">{formatCurrency(data.income)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600">खर्च (Expense):</span>
                      <span className="text-rose-700">{formatCurrency(data.expense)}</span>
                    </div>
                    <div className="flex justify-between font-black pt-1.5 border-t border-slate-200 text-sm">
                      <span className="text-slate-800">निव्वळ शिल्लक:</span>
                      <span className={netMonthBalance >= 0 ? 'text-emerald-800' : 'text-rose-800'}>
                        {formatCurrency(netMonthBalance)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-8 text-slate-500 font-bold text-xs">
              या वर्षासाठी महिन्यानिहाय नोंदी उपलब्ध नाहीत.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
