import React, { useState, useEffect, useMemo } from 'react';
import {
  IncomeTransaction,
  ExpenseTransaction,
  Member,
  OccasionEvent,
  CurrentUser,
} from './types';
import {
  getStoredIncomes,
  saveIncomes,
  getStoredExpenses,
  saveExpenses,
  getStoredMembers,
  saveMembers,
  getStoredOccasions,
  getCustomIncomeTypes,
  saveCustomIncomeType,
  getStoredUser,
  saveUser,
  DEFAULT_USER,
  getStoredEventGallery,
  saveEventGallery,
  getStoredGroupLogo,
  saveGroupLogo,
  calculateFinancialSummary,
  resetToDemoData,
} from './services/storageService';

import { Sidebar } from './components/Sidebar';
import { HeaderStats } from './components/HeaderStats';
import { DashboardView } from './components/DashboardView';
import { IncomeForm } from './components/IncomeForm';
import { ExpenseForm } from './components/ExpenseForm';
import { IncomeHistory } from './components/IncomeHistory';
import { ExpenseHistory } from './components/ExpenseHistory';
import { MemberSubscriptionsView } from './components/MemberSubscriptionsView';
import { ProfileView } from './components/ProfileView';
import { LoginModal } from './components/LoginModal';
import { isBadgedMember } from './utils/rbac';
import { NetworkStatusNotifier } from './components/NetworkStatusNotifier';
import { Menu } from 'lucide-react';
import moryaLogo from './assets/morya_logo.jpg';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedYear, setSelectedYear] = useState<string>('२०२६-२७');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginModalMemberId, setLoginModalMemberId] = useState<string | undefined>(undefined);
  const [loginModalType, setLoginModalType] = useState<'admin' | 'member'>('member');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Application persistent states
  const [incomes, setIncomes] = useState<IncomeTransaction[]>(getStoredIncomes);
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>(getStoredExpenses);
  const [members, setMembers] = useState<Member[]>(getStoredMembers);
  const [occasions, setOccasions] = useState<OccasionEvent[]>(getStoredOccasions);
  const [customIncomeTypes, setCustomIncomeTypes] = useState<string[]>(getCustomIncomeTypes);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(getStoredUser);
  const [gallery, setGallery] = useState(getStoredEventGallery);
  const [groupLogo, setGroupLogo] = useState<string>(getStoredGroupLogo);

  const handleUpdateGroupLogo = (logoUrl: string) => {
    saveGroupLogo(logoUrl);
    setGroupLogo(logoUrl);
  };

  const handleOpenLogin = (memberId?: string, type: 'admin' | 'member' = 'member') => {
    setLoginModalMemberId(memberId);
    setLoginModalType(type);
    setIsLoginModalOpen(true);
  };

  // Sync to localStorage
  useEffect(() => {
    saveIncomes(incomes);
  }, [incomes]);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    saveMembers(members);
  }, [members]);

  useEffect(() => {
    saveUser(currentUser);
    if (activeTab === 'member-subscriptions' && (!currentUser.isLoggedIn || !isBadgedMember(currentUser.role))) {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab]);

  useEffect(() => {
    saveEventGallery(gallery);
  }, [gallery]);

  // Login Success handler
  const handleLoginSuccess = (user: CurrentUser) => {
    setCurrentUser(user);
    setIsLoginModalOpen(false);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(DEFAULT_USER);
    saveUser(DEFAULT_USER);
    setActiveTab('dashboard');
  };

  // Financial Summary Calculation
  const summary = useMemo(() => {
    // Filter transactions for selected financial year if needed or pass all
    const yearIncomes = incomes.filter((i) => i.financialYear === selectedYear);
    const yearExpenses = expenses.filter((e) => e.financialYear === selectedYear);
    return calculateFinancialSummary(yearIncomes, yearExpenses);
  }, [incomes, expenses, selectedYear]);

  // Add Income Transaction
  const handleAddIncome = (newIncome: IncomeTransaction) => {
    setIncomes((prev) => [newIncome, ...prev]);
  };

  // Add Custom Income Type
  const handleAddCustomIncomeType = (newType: string) => {
    const updated = saveCustomIncomeType(newType);
    setCustomIncomeTypes(updated);
  };

  // Add Expense Transaction
  const handleAddExpense = (newExpense: ExpenseTransaction) => {
    setExpenses((prev) => [newExpense, ...prev]);
  };

  // Approve Expense
  const handleApproveExpense = (expId: string, approverName: string, approverRole: any) => {
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id === expId) {
          return {
            ...e,
            approvalStatus: 'मंजूर',
            approvedBy: `${approverName} (${approverRole})`,
            approvedByRole: approverRole,
            approvedAt: new Date().toISOString(),
          };
        }
        return e;
      })
    );
  };

  // Add Member
  const handleAddMember = (newMember: Member) => {
    setMembers((prev) => [...prev, newMember]);
  };

  // Update Member
  const handleUpdateMember = (updatedMember: Member) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === updatedMember.id ? updatedMember : m))
    );
  };

  // Delete Member
  const handleDeleteMember = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  // Reset to Demo Data
  const handleResetData = () => {
    if (window.confirm('तुम्हाला खरोखर सर्व मूळ प्रात्यक्षिक (Demo) डेटा रिसेट करायचा आहे का?')) {
      resetToDemoData();
      setIncomes(getStoredIncomes());
      setExpenses(getStoredExpenses());
      setMembers(getStoredMembers());
      setOccasions(getStoredOccasions());
      setCustomIncomeTypes(getCustomIncomeTypes());
      setCurrentUser(getStoredUser());
      setGallery(getStoredEventGallery());
      setGroupLogo(getStoredGroupLogo());
    }
  };

  return (
    <div className="flex h-screen bg-[#F1F5F9] font-sans text-slate-800 overflow-hidden antialiased select-none">
      {/* Sidebar / Mobile Drawer Component */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        members={members}
        pendingExpenseCount={summary.pendingExpensesCount}
        groupLogo={groupLogo}
        onUpdateGroupLogo={handleUpdateGroupLogo}
        onResetData={handleResetData}
        onOpenLogin={handleOpenLogin}
        onLogout={handleLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Mobile Top Navigation Header */}
        <header className="lg:hidden bg-[#0F172A] text-white px-4 py-2.5 border-b border-slate-800 flex items-center justify-between shrink-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-800 text-amber-400 hover:bg-slate-700 border border-slate-700 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
              <span className="text-xs font-bold text-slate-200">मेन्यू</span>
            </button>

            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-xs font-black text-amber-400 truncate max-w-[180px] sm:max-w-none">
                  मोरया ग्रुप मित्र मंडळ
                </h1>
                <p className="text-[9px] text-slate-400 font-bold leading-none">हडपसर गोंधळनगर</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.isLoggedIn !== false && (
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl cursor-pointer hover:bg-amber-500/20 transition-colors"
                title="माझे प्रोफाइल पहा"
              >
                <div className="w-5 h-5 bg-amber-500 text-slate-950 font-black rounded-md flex items-center justify-center text-[10px]">
                  {currentUser.name.substring(0, 1)}
                </div>
                <span className="text-[11px] font-bold text-amber-300 max-w-[65px] truncate sm:max-w-none">
                  {currentUser.name.split(' ')[0]}
                </span>
              </button>
            )}
          </div>
        </header>

        {/* Header Summary Cards */}
        <HeaderStats
          summary={summary}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          currentUser={currentUser}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* Dynamic Main View Area */}
        <section className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                summary={summary}
                incomes={incomes}
                expenses={expenses}
                members={members}
                currentUser={currentUser}
                gallery={gallery}
                onSaveGallery={(newGallery) => setGallery(newGallery)}
                onNavigate={(tab) => setActiveTab(tab)}
                onApproveExpense={handleApproveExpense}
                onLogout={handleLogout}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'income-form' && (
              <IncomeForm
                members={members}
                occasions={occasions}
                customTypes={customIncomeTypes}
                currentUser={currentUser}
                financialYear={selectedYear}
                onAddIncome={handleAddIncome}
                onAddCustomIncomeType={handleAddCustomIncomeType}
                onSuccessNavigate={() => setActiveTab('income-history')}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'expense-form' && (
              <ExpenseForm
                occasions={occasions}
                members={members}
                currentUser={currentUser}
                financialYear={selectedYear}
                onAddExpense={handleAddExpense}
                onSuccessNavigate={() => setActiveTab('expense-history')}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'income-history' && (
              <IncomeHistory
                incomes={incomes}
                members={members}
                financialYear={selectedYear}
                currentUser={currentUser}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'expense-history' && (
              <ExpenseHistory
                expenses={expenses}
                currentUser={currentUser}
                financialYear={selectedYear}
                onApproveExpense={handleApproveExpense}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'member-subscriptions' &&
              (isBadgedMember(currentUser.role) ? (
                <MemberSubscriptionsView
                  members={members}
                  incomes={incomes}
                  currentUser={currentUser}
                  onAddMember={handleAddMember}
                  onUpdateMember={handleUpdateMember}
                  onDeleteMember={handleDeleteMember}
                  onOpenLogin={handleOpenLogin}
                />
              ) : (
                <DashboardView
                  summary={summary}
                  incomes={incomes}
                  expenses={expenses}
                  members={members}
                  currentUser={currentUser}
                  gallery={gallery}
                  onSaveGallery={(newGallery) => setGallery(newGallery)}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onApproveExpense={handleApproveExpense}
                  onLogout={handleLogout}
                  onOpenLogin={() => setIsLoginModalOpen(true)}
                />
              ))}

            {activeTab === 'profile' && (
              <ProfileView
                currentUser={currentUser}
                members={members}
                incomes={incomes}
                groupLogo={groupLogo}
                onUpdateGroupLogo={handleUpdateGroupLogo}
                onUpdateMember={handleUpdateMember}
                onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
                onOpenLogin={handleOpenLogin}
              />
            )}
          </div>
        </section>

        {/* Footer Info Bar */}
        <footer className="bg-[#0F172A] p-2.5 flex justify-between items-center text-[11px] text-slate-400 px-6 shrink-0 border-t border-slate-800">
          <div>
            सिस्टम वेळ: {new Date().toLocaleDateString('mr-IN')} | नोंदणीकृत: मोरया ग्रुप मित्र मंडळ (ट्रस्ट) - हडपसर गोंधळनगर (Mandal ID: 1042)
          </div>
          <div className="flex gap-4 italic items-center">
            <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ऑनलाइन सर्वर कनेक्टेड
            </span>
          </div>
        </footer>
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        members={members}
        currentUser={currentUser}
        groupLogo={groupLogo}
        onLoginSuccess={handleLoginSuccess}
        initialSelectedMemberId={loginModalMemberId}
        initialLoginType={loginModalType}
      />

      {/* Mobile Network Status Notifier */}
      <NetworkStatusNotifier />
    </div>
  );
}
