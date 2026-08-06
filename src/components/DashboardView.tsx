import React, { useState } from 'react';
import moryaLogo from '../assets/morya_logo.jpg';
import { LogoLightboxModal } from './LogoLightboxModal';
import {
  IncomeTransaction,
  ExpenseTransaction,
  FinancialYearSummary,
  Member,
  CurrentUser,
  EventGalleryImage,
} from '../types';
import { HeaderStats } from './HeaderStats';
import { EventGallerySection } from './EventGallerySection';
import { hasFullFinancialAccess, isBadgedMember } from '../utils/rbac';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle,
  PlusCircle,
  Users,
  ShieldAlert,
  ChevronRight,
  LogOut,
  LogIn,
  Lock,
  Maximize2,
} from 'lucide-react';

interface DashboardViewProps {
  summary: FinancialYearSummary;
  incomes: IncomeTransaction[];
  expenses: ExpenseTransaction[];
  members: Member[];
  currentUser: CurrentUser;
  gallery: EventGalleryImage[];
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  groupLogo?: string;
  onSaveGallery: (gallery: EventGalleryImage[]) => void;
  onNavigate: (tab: string) => void;
  onApproveExpense: (expId: string, name: string, role: any) => void;
  onLogout?: () => void;
  onOpenLogin?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  incomes,
  expenses,
  members,
  currentUser,
  gallery,
  selectedYear,
  setSelectedYear,
  groupLogo,
  onSaveGallery,
  onNavigate,
  onApproveExpense,
  onLogout,
  onOpenLogin,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const isFullAccess = hasFullFinancialAccess(currentUser.role);
  const isBadged = isBadgedMember(currentUser.role);

  const currentMember = members.find(
    (m) =>
      m.fullName.trim() === currentUser.name.trim() ||
      (currentUser.phone && m.phone === currentUser.phone)
  );

  const displayIncomes = isFullAccess
    ? incomes
    : incomes.filter(
        (i) =>
          (currentMember && i.linkedMemberId === currentMember.id) ||
          i.depositorName.trim() === currentUser.name.trim() ||
          (i.createdBy && i.createdBy.includes(currentUser.name))
      );

  const displayExpenses = isFullAccess
    ? expenses
    : expenses.filter(
        (e) =>
          (e.createdBy && e.createdBy.includes(currentUser.name)) ||
          e.recipientName.trim() === currentUser.name.trim()
      );

  // Combine & sort recent transactions
  const recentIncomes = displayIncomes.slice(0, 5);
  const recentExpenses = displayExpenses.slice(0, 5);

  const pendingExpenses = isFullAccess
    ? expenses.filter((e) => e.approvalStatus === 'प्रलंबित')
    : [];

  const canApprove = ['अध्यक्ष', 'खजिनदार', 'सचिव', 'उपखजिनदार', 'ॲडमिन', 'Admin'].includes(
    currentUser.role
  );
  const isLoggedIn = currentUser.isLoggedIn !== false;

  if (!isLoggedIn) {
    return (
      <div className="space-y-6 my-2">
        {/* Guest Public Welcome Banner with Middle Login Option */}
        <div className="bg-gradient-to-r from-[#0F172A] via-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md border border-slate-700/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              <img
                src={groupLogo || moryaLogo}
                alt="मोरया ग्रुप मित्र मंडळ (ट्रस्ट) लोगो"
                onClick={() => setIsLightboxOpen(true)}
                title="मोठा लोगो पहा (WhatsApp Style)"
                className="w-20 h-20 object-contain rounded-full border-2 border-amber-400 p-0.5 bg-slate-950 shadow-xl cursor-pointer transition-transform group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                title="मोठा लोगो पहा"
                className="absolute top-0 right-0 bg-slate-900/80 text-amber-400 p-1 rounded-full border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-[11px] font-bold uppercase tracking-wider">
                  सार्वजनिक उत्सव दालन (Public View)
                </span>
                <span className="text-xs text-amber-400 font-bold">• हडपसर गोंधळनगर</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black mt-1 text-white">
                मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                मंडळाच्या गणेशोत्सव, विसर्जन मिरवणूक, भव्य महाप्रसाद, रक्तदान शिबीर, क्रीडा स्पर्धा व सामाजिक उपक्रमांचे डिजिटल फोटो दालन.
              </p>
            </div>
          </div>
        </div>

        {/* Income, Expense & Net Balance Summary Cards (Positioned directly below the Middle Login option) */}
        <HeaderStats
          summary={summary}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          currentUser={currentUser}
          onLogout={onLogout}
        />

        {/* Event Photo Gallery */}
        <EventGallerySection
          gallery={gallery}
          onSaveGallery={onSaveGallery}
          currentUser={currentUser}
          onOpenLogin={onOpenLogin}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 my-2">
      {/* Income, Expense & Net Balance Summary Cards */}
      <HeaderStats
        summary={summary}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        currentUser={currentUser}
        onLogout={onLogout}
      />
      {/* Quick Action Cards & Greeting */}
      <div className="bg-gradient-to-r from-[#0F172A] via-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md border border-slate-700/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            <img
              src={groupLogo || moryaLogo}
              alt="मोरया ग्रुप मित्र मंडळ (ट्रस्ट) लोगो"
              onClick={() => setIsLightboxOpen(true)}
              title="मोठा लोगो पहा (WhatsApp Style)"
              className="w-20 h-20 object-contain rounded-full border-2 border-amber-400 p-0.5 bg-slate-950 shadow-xl cursor-pointer transition-transform group-hover:scale-105"
            />
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              title="मोठा लोगो पहा"
              className="absolute top-0 right-0 bg-slate-900/80 text-amber-400 p-1 rounded-full border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-[11px] font-bold uppercase tracking-wider">
                {currentUser.role} लॉगइन
              </span>
              <span className="text-xs text-amber-400 font-bold">• मोरया ग्रुप मित्र मंडळ (ट्रस्ट)</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black mt-1 text-white flex items-center gap-2">
              नमस्कार, {currentUser.name}! 🙏
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              <strong className="text-amber-300">हडपसर गोंधळनगर</strong> — मंडळाचे सर्व उत्पन्न, वर्गणी, प्रायोजकत्व व खर्चाची अधिकृत डिजिटल हिशोब नोंदणी प्रणाली.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          <button
            onClick={() => onNavigate('income-form')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ नवीन जमा नोंद</span>
          </button>
          <button
            onClick={() => onNavigate('expense-form')}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ नवीन खर्च नोंद</span>
          </button>

          {isLoggedIn ? (
            <button
              onClick={onLogout}
              className="px-4 py-2.5 bg-slate-800 hover:bg-rose-700 text-white border border-slate-700 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              title="लॉगआउट करा"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>लॉगआउट</span>
            </button>
          ) : (
            <button
              onClick={onOpenLogin}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>लॉगइन</span>
            </button>
          )}
        </div>
      </div>

      {/* Pending Expense Approvals Banner (If any) */}
      {pendingExpenses.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/60">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600 animate-bounce" />
              <span>खर्च मंजुरी प्रलंबित ({pendingExpenses.length} व्यवहार)</span>
            </div>
            <button
              onClick={() => onNavigate('expense-history')}
              className="text-xs text-amber-800 hover:underline font-bold flex items-center gap-1"
            >
              <span>सर्व प्रलंबित खर्च पहा</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {pendingExpenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-white p-3 rounded-xl border border-amber-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800">{exp.recipientName}</span>
                  <span className="text-slate-500 ml-2">
                    ({exp.expenseCategory} - {exp.reason})
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    तारीख: {exp.expenseDate} | बिल: {exp.billNumber || 'नाही'}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-black text-rose-700 text-sm">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </span>
                  {canApprove && (
                    <button
                      onClick={() => onApproveExpense(exp.id, currentUser.name, currentUser.role)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer"
                    >
                      मंजूर करा
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Layout: Recent Incomes & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Income Transactions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {isFullAccess ? 'अलीकडील जमा नोंदी' : 'तुमच्या अलीकडील जमा नोंदी'}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('income-history')}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>
                  {isFullAccess ? `सर्व जमा (${incomes.length})` : `माझ्या जमा नोंदी (${displayIncomes.length})`}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {recentIncomes.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{item.depositorName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                        {item.depositorType}
                      </span>
                      <span>• {item.incomeType}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-700 text-sm">
                      + ₹{item.amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400">{item.transactionDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigate('income-form')}
              className="w-full py-2 bg-slate-50 hover:bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors cursor-pointer"
            >
              + नवीन जमा नोंद जोडा
            </button>
          </div>
        </div>

        {/* Recent Expense Transactions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  {isFullAccess ? 'अलीकडील खर्च नोंदी' : 'तुमच्या अलीकडील खर्च नोंदी'}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('expense-history')}
                className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>
                  {isFullAccess ? `सर्व खर्च (${expenses.length})` : `माझ्या खर्च नोंदी (${displayExpenses.length})`}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {recentExpenses.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800">{item.recipientName}</p>
                      {item.approvalStatus === 'मंजूर' ? (
                        <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                          मंजूर
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                          प्रलंबित
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{item.expenseCategory}</span>
                      <span>• {item.reason}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-rose-700 text-sm">
                      - ₹{item.amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-slate-400">{item.expenseDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigate('expense-form')}
              className="w-full py-2 bg-slate-50 hover:bg-rose-50 text-rose-800 font-bold text-xs rounded-xl border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
            >
              + नवीन खर्च नोंद जोडा
            </button>
          </div>
        </div>
      </div>

      {/* Member Subscription Overview Teaser (Executive Badged Members Only) */}
      {isBadged && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">सभासद वर्गणी माहिती</h4>
              <p className="text-xs text-slate-500">
                एकूण {members.length} सभासद नोंदणीकृत आहेत. एकूण जमा वर्गणी: ₹
                {summary.totalSubscriptionsCollected.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('member-subscriptions')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
          >
            सभासद वर्गणी हिशोब पहा ➔
          </button>
        </div>
      )}

      {/* Editable Event Photo Gallery Section */}
      <EventGallerySection
        gallery={gallery}
        onSaveGallery={onSaveGallery}
        currentUser={currentUser}
      />

      {/* WhatsApp Style Full Logo Lightbox Modal */}
      <LogoLightboxModal
        isOpen={isLightboxOpen}
        logoSrc={groupLogo}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
};
