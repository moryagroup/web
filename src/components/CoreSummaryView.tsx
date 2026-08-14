import React, { useState } from 'react';
import { FinancialYearSummary, CurrentUser, IncomeTransaction, ExpenseTransaction } from '../types';
import { isCoreMemberRole } from '../utils/rbac';
import { isDateInSelectedYear } from '../utils/dateUtils';
import { RbacGuard } from './RbacGuard';
import { exportToCSV, triggerPDFPrint } from '../utils/exportUtils';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  PieChart,
  ArrowLeft,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';

interface CoreSummaryViewProps {
  summary: FinancialYearSummary;
  incomes: IncomeTransaction[];
  expenses: ExpenseTransaction[];
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  currentUser: CurrentUser;
  onNavigate?: (tab: string) => void;
  onOpenLogin?: () => void;
}

export const CoreSummaryView: React.FC<CoreSummaryViewProps> = ({
  summary,
  incomes,
  expenses,
  selectedYear,
  setSelectedYear,
  currentUser,
  onNavigate,
  onOpenLogin,
}) => {
  const isLoggedIn = currentUser.isLoggedIn !== false;
  const isCoreMember = isLoggedIn && isCoreMemberRole(currentUser.role);

  if (!isCoreMember) {
    return (
      <RbacGuard
        currentRole={currentUser.role}
        title="एकूण जमा, खर्च व शिल्लक फक्त कोर कमिटीसाठी उपलब्ध"
        message="मंडळाच्या मुख्य जमा, मंजूर खर्च व शिल्लक बचतीचा सविस्तर अहवाल पाहण्याचा अधिकार केवळ कोर कमिटी पदाधिकारी (अध्यक्ष, खजिनदार, उपखजिनदार व ॲडमिन) यांनाच आहे."
        onLoginClick={onOpenLogin}
      />
    );
  }

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  // Category level breakdown
  const subscriptionIncome = incomes
    .filter((i) => isDateInSelectedYear(i.transactionDate, selectedYear, i.financialYear) && i.incomeType.includes('वर्गणी'))
    .reduce((sum, i) => sum + i.amount, 0);

  const donationIncome = incomes
    .filter((i) => isDateInSelectedYear(i.transactionDate, selectedYear, i.financialYear) && (i.incomeType.includes('देणगी') || i.incomeType.includes('प्रायोजकत्व')))
    .reduce((sum, i) => sum + i.amount, 0);

  const otherIncome = Math.max(0, summary.totalIncome - (subscriptionIncome + donationIncome));

  const pendingExpenses = expenses.filter((e) => isDateInSelectedYear(e.expenseDate, selectedYear, e.financialYear) && e.approvalStatus === 'प्रलंबित');
  const pendingAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleExportCSV = () => {
    const filename = `MoryaGroup_CoreSummary_${selectedYear}_${Date.now()}.csv`;
    const headers = ['घटक / शीर्षक', 'रक्कम (₹)', 'वर्ष', 'विवरण / टीप'];

    const rows: (string | number | boolean)[][] = [
      ['एकूण जमा (Total Deposit)', summary.totalIncome, selectedYear, 'एकूण सर्व उत्पन्नाचा जमा हिशोब'],
      [' - सभासद वर्गणी (Subscriptions)', subscriptionIncome, selectedYear, 'सभासदांकडून जमा वर्गणी'],
      [' - देणगी व प्रायोजकत्व (Donations)', donationIncome, selectedYear, 'दानशूर व्यक्ती व प्रायोजकांची देणगी'],
      [' - इतर उत्पन्न (Other Income)', otherIncome, selectedYear, 'इतर जमा रकमा'],
      ['एकूण मंजूर खर्च (Approved Expense)', summary.approvedExpensesTotal, selectedYear, 'मंजूर झालेला एकूण खर्च'],
      ['प्रलंबित खर्च (Pending Approval)', pendingAmount, selectedYear, `प्रलंबित खर्च नोंदी: ${pendingExpenses.length}`],
      ['सध्याची निव्वळ शिल्लक (Net Balance)', summary.netBalance, selectedYear, 'एकूण जमा minus एकूण मंजूर खर्च'],
    ];

    exportToCSV(filename, headers, rows);
  };

  const handlePrintPDF = () => {
    triggerPDFPrint(`मोरया ग्रुप मुख्य वित्तीय हिशोब अहवाल (${selectedYear})`);
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
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
            <PieChart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-md text-[11px] font-bold uppercase">
                कोर कमिटी मुख्य हिशोब
              </span>
              <span className="text-xs text-emerald-400 font-bold">• {currentUser.role}</span>
            </div>
            <h2 className="text-xl font-black mt-1 text-white">
              एकूण जमा, खर्च व शिल्लक विंडो (Deposit, Expense & Net Balance)
            </h2>
            <p className="text-xs text-slate-300">
              मोरया ग्रुप मित्र मंडळाची अधिकृत वित्तीय विवरण व जमा-खर्च स्थिती.
            </p>
          </div>
        </div>

        {/* Financial Year Selector */}
        <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
          <span className="text-xs text-slate-300 font-bold flex items-center gap-1">
            <Calendar className="w-4 h-4 text-emerald-400" /> वर्ष:
          </span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-800 text-emerald-300 font-bold text-xs rounded-xl border border-slate-700 p-2.5 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
          >
            <option value="२०२६">२०२६ (चालू वर्ष)</option>
            <option value="२०२५">२०२५</option>
            <option value="२०२४">२०२४</option>
            <option value="२०२७">२०२७</option>
          </select>
        </div>
      </div>

      {/* 3 Main Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Income Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-6 rounded-3xl border border-emerald-200 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-emerald-800 font-black uppercase">
              <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
              <span>१. एकूण जमा (Total Deposit)</span>
            </div>
            <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 font-bold text-[10px] rounded-md">
              {selectedYear}
            </span>
          </div>
          <p className="text-3xl font-black text-emerald-950 tracking-tight">
            {formatCurrency(summary.totalIncome)}
          </p>
          <div className="space-y-1 pt-2 border-t border-emerald-200/80 text-xs text-emerald-900 font-medium">
            <div className="flex justify-between">
              <span>सभासद वर्गणी (Subscriptions):</span>
              <span className="font-bold">{formatCurrency(subscriptionIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span>देणगी व प्रायोजकत्व (Donations):</span>
              <span className="font-bold">{formatCurrency(donationIncome)}</span>
            </div>
            {otherIncome > 0 && (
              <div className="flex justify-between text-emerald-800">
                <span>इतर उत्पन्न (Other):</span>
                <span className="font-bold">{formatCurrency(otherIncome)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Total Expense Card */}
        <div className="bg-gradient-to-br from-rose-50 to-rose-100/60 p-6 rounded-3xl border border-rose-200 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-rose-800 font-black uppercase">
              <ArrowUpCircle className="w-5 h-5 text-rose-600" />
              <span>२. एकूण खर्च (Approved Expense)</span>
            </div>
            <span className="px-2 py-0.5 bg-rose-200 text-rose-900 font-bold text-[10px] rounded-md">
              मंजूर खर्च
            </span>
          </div>
          <p className="text-3xl font-black text-rose-950 tracking-tight">
            {formatCurrency(summary.approvedExpensesTotal)}
          </p>
          <div className="space-y-1 pt-2 border-t border-rose-200/80 text-xs text-rose-900 font-medium">
            <div className="flex justify-between">
              <span>मंजूर खर्चाची एकूण संख्या:</span>
              <span className="font-bold">
                {expenses.filter((e) => isDateInSelectedYear(e.expenseDate, selectedYear, e.financialYear) && e.approvalStatus === 'मंजूर').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>प्रलंबित मंजुरी (Pending):</span>
              <span className="font-bold text-amber-700">
                {pendingExpenses.length} ({formatCurrency(pendingAmount)})
              </span>
            </div>
          </div>
        </div>

        {/* Net Balance Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 p-6 rounded-3xl border border-blue-200 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-blue-800 font-black uppercase">
              <Wallet className="w-5 h-5 text-blue-600" />
              <span>३. सध्याची शिल्लक (Net Balance)</span>
            </div>
            <span className="px-2 py-0.5 bg-blue-200 text-blue-950 font-bold text-[10px] rounded-md">
              निव्वळ बचत
            </span>
          </div>
          <p className="text-3xl font-black text-blue-950 tracking-tight">
            {formatCurrency(summary.netBalance)}
          </p>
          <div className="pt-2 border-t border-blue-200/80 text-xs text-blue-900 font-medium">
            <p className="text-[11px] text-blue-800">
              सध्याची शिल्लक = एकूण जमा रक्कमेतून सर्व मंजूर खर्च वजा करून उरलेली बँक/रोख शिल्लक.
            </p>
          </div>
        </div>
      </div>

      {/* Pending Approvals Notice for Core Members */}
      {pendingExpenses.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-amber-900 font-bold">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              लक्ष द्या! {pendingExpenses.length} खर्च व्यवहार मंजुरीसाठी प्रलंबित आहेत (एकूण रक्कम: {formatCurrency(pendingAmount)}).
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
