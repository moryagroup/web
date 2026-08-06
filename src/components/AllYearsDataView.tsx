import React, { useMemo } from 'react';
import { IncomeTransaction, ExpenseTransaction, CurrentUser } from '../types';
import { isCoreMemberRole } from '../utils/rbac';
import { RbacGuard } from './RbacGuard';
import {
  History,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  CheckCircle2,
  Calendar,
  ArrowLeft,
} from 'lucide-react';

interface AllYearsDataViewProps {
  incomes: IncomeTransaction[];
  expenses: ExpenseTransaction[];
  currentUser: CurrentUser;
  onNavigate?: (tab: string) => void;
  onOpenLogin?: () => void;
}

const FINANCIAL_YEARS = ['२०२६-२७', '२०२५-२६', '२०२४-२५'];

export const AllYearsDataView: React.FC<AllYearsDataViewProps> = ({
  incomes,
  expenses,
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
        title="सर्व वर्षांचा हिशोब फक्त कोर कमिटीसाठी उपलब्ध"
        message="बहुवार्षिक जमा-खर्च तुलनात्मक अहवाल पाहण्याचा अधिकार केवळ कोर कमिटी पदाधिकारी (अध्यक्ष, खजिनदार, उपखजिनदार व ॲडमिन) यांनाच आहे."
        onLoginClick={onOpenLogin}
      />
    );
  }

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  // Multi-year aggregates
  const yearsSummary = useMemo(() => {
    return FINANCIAL_YEARS.map((year) => {
      const yearIncomes = incomes.filter((i) => i.financialYear === year);
      const yearExpenses = expenses.filter((e) => e.financialYear === year && e.approvalStatus === 'मंजूर');

      const totalIncome = yearIncomes.reduce((sum, i) => sum + i.amount, 0);
      const totalExpense = yearExpenses.reduce((sum, e) => sum + e.amount, 0);
      const netBalance = totalIncome - totalExpense;

      const subTotal = yearIncomes.filter((i) => i.incomeType.includes('वर्गणी')).reduce((sum, i) => sum + i.amount, 0);
      const donTotal = yearIncomes.filter((i) => i.incomeType.includes('देणगी')).reduce((sum, i) => sum + i.amount, 0);

      return {
        year,
        totalIncome,
        totalExpense,
        netBalance,
        subTotal,
        donTotal,
        incomeCount: yearIncomes.length,
        expenseCount: yearExpenses.length,
      };
    });
  }, [incomes, expenses]);

  // All time grand total
  const grandTotalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const grandTotalExpense = expenses
    .filter((e) => e.approvalStatus === 'मंजूर')
    .reduce((sum, e) => sum + e.amount, 0);
  const grandNetBalance = grandTotalIncome - grandTotalExpense;

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
              सर्व वर्षांचा हिशोब (All Financial Years History)
            </h2>
            <p className="text-xs text-slate-300">
              मंडळाच्या स्थापनेपासूनच्या सर्व आर्थिक वर्षांची तुलनात्मक जमा, खर्च व शिलकीचा इतिहास.
            </p>
          </div>
        </div>
      </div>

      {/* Lifetime Grand Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-500 text-white p-5 rounded-2xl shadow-md space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-100 font-bold uppercase">
            <ArrowDownCircle className="w-4 h-4" />
            <span>सर्व वर्षांची एकूण जमा</span>
          </div>
          <p className="text-2xl font-black">{formatCurrency(grandTotalIncome)}</p>
          <p className="text-[11px] text-emerald-100 font-medium">एकूण जमा नोंदी: {incomes.length}</p>
        </div>

        <div className="bg-rose-500 text-white p-5 rounded-2xl shadow-md space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-rose-100 font-bold uppercase">
            <ArrowUpCircle className="w-4 h-4" />
            <span>सर्व वर्षांचा एकूण खर्च</span>
          </div>
          <p className="text-2xl font-black">{formatCurrency(grandTotalExpense)}</p>
          <p className="text-[11px] text-rose-100 font-medium">
            एकूण मंजूर खर्च नोंदी: {expenses.filter((e) => e.approvalStatus === 'मंजूर').length}
          </p>
        </div>

        <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-md space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-indigo-100 font-bold uppercase">
            <Wallet className="w-4 h-4" />
            <span>अखेरची शिल्लक (Lifetime Net)</span>
          </div>
          <p className="text-2xl font-black">{formatCurrency(grandNetBalance)}</p>
          <p className="text-[11px] text-indigo-100 font-medium">सर्व वर्षांमधील एकूण शिल्लक बचत</p>
        </div>
      </div>

      {/* Financial Year Comparison Table & Cards */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          वर्षनिहाय जमा-खर्च तुलनात्मक तक्ता (Year-by-Year Comparison)
        </h3>

        <div className="space-y-4">
          {yearsSummary.map((item) => (
            <div
              key={item.year}
              className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-slate-900 text-amber-400 font-black text-sm rounded-xl">
                    {item.year}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">आर्थिक वर्ष</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-bold block">वर्षाची निव्वळ शिल्लक:</span>
                  <span
                    className={`text-lg font-black ${
                      item.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatCurrency(item.netBalance)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-100">
                  <p className="text-emerald-800 font-bold mb-1">एकूण जमा (Income)</p>
                  <p className="text-xl font-black text-emerald-900">{formatCurrency(item.totalIncome)}</p>
                  <p className="text-[10px] text-emerald-700 mt-1">
                    वर्गणी: {formatCurrency(item.subTotal)} | देणगी: {formatCurrency(item.donTotal)}
                  </p>
                </div>

                <div className="p-3 bg-rose-50/80 rounded-xl border border-rose-100">
                  <p className="text-rose-800 font-bold mb-1">एकूण मंजूर खर्च (Expense)</p>
                  <p className="text-xl font-black text-rose-900">{formatCurrency(item.totalExpense)}</p>
                  <p className="text-[10px] text-rose-700 mt-1">मंजूर व्यवहारांची संख्या: {item.expenseCount}</p>
                </div>

                <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 flex flex-col justify-between">
                  <div>
                    <p className="text-blue-800 font-bold mb-1">शिल्लक टक्केवारी (Margin)</p>
                    <p className="text-xl font-black text-blue-950">
                      {item.totalIncome > 0 ? Math.round((item.netBalance / item.totalIncome) * 100) : 0}%
                    </p>
                  </div>
                  <p className="text-[10px] text-blue-700 font-medium">एकूण उत्पन्नातील शिलकीचा वाटा</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
