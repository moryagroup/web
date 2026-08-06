import React, { useState, useEffect, useMemo } from 'react';
import moryaLogo from './assets/morya_logo.jpg';
import {
  IncomeTransaction,
  ExpenseTransaction,
  Member,
  OccasionEvent,
  CurrentUser,
} from './types';
import {
  getStoredIncomes,
  getStoredExpenses,
  getStoredMembers,
  getStoredOccasions,
  getStoredEventGallery,
  getStoredGroupLogo,
  getStoredSuggestions,
  getStoredUser,
  saveUser,
  DEFAULT_USER,
  getCustomIncomeTypes,
  saveCustomIncomeType,
  calculateFinancialSummary,
} from './services/storageService';
import {
  seedAllCollections,
  subscribeToIncomes,
  subscribeToExpenses,
  subscribeToMembers,
  subscribeToOccasions,
  subscribeToGallery,
  subscribeToSuggestions,
  subscribeToGroupLogo,
  saveIncome,
  deleteIncome,
  saveExpense,
  deleteExpense,
  saveMember,
  deleteMember,
  saveOccasion,
  saveGalleryImage,
  deleteGalleryImage,
  saveSuggestion,
  saveGroupLogo as saveGroupLogoFirestore,
  resetFirestoreToDemo,
} from './services/firestoreService';

import { Sidebar } from './components/Sidebar';
import { HeaderStats } from './components/HeaderStats';
import { DashboardView } from './components/DashboardView';
import { IncomeForm } from './components/IncomeForm';
import { ExpenseForm } from './components/ExpenseForm';
import { IncomeHistory } from './components/IncomeHistory';
import { ExpenseHistory } from './components/ExpenseHistory';
import { MemberSubscriptionsView } from './components/MemberSubscriptionsView';
import { ProfileView } from './components/ProfileView';
import { MonthWiseReportsView } from './components/MonthWiseReportsView';
import { AllYearsDataView } from './components/AllYearsDataView';
import { CoreSummaryView } from './components/CoreSummaryView';
import { StatementExportView } from './components/StatementExportView';
import { SuggestionsView } from './components/SuggestionsView';
import { LoginModal } from './components/LoginModal';
import { isBadgedMember } from './utils/rbac';
import { NetworkStatusNotifier } from './components/NetworkStatusNotifier';
import { Menu } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedYear, setSelectedYear] = useState<string>('२०२६-२७');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [loginModalMemberId, setLoginModalMemberId] = useState<string | undefined>(undefined);
  const [loginModalType, setLoginModalType] = useState<'admin' | 'member'>('member');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Application states — populated by initial storage + Firestore real-time listeners
  const [incomes, setIncomes] = useState<IncomeTransaction[]>(getStoredIncomes);
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>(getStoredExpenses);
  const [members, setMembers] = useState<Member[]>(getStoredMembers);
  const [occasions, setOccasions] = useState<OccasionEvent[]>(getStoredOccasions);
  const [customIncomeTypes, setCustomIncomeTypes] = useState<string[]>(getCustomIncomeTypes);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(getStoredUser);
  const [gallery, setGalleryState] = useState<any[]>(getStoredEventGallery);
  const [groupLogo, setGroupLogo] = useState<string>(getStoredGroupLogo);
  const [suggestions, setSuggestions] = useState<any[]>(getStoredSuggestions);

  // Subscribe to Firestore collections & trigger seed in background
  useEffect(() => {
    // Hide loading screen after max 1 second safety window
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    const unsubscribers = [
      subscribeToIncomes(setIncomes),
      subscribeToExpenses(setExpenses),
      subscribeToMembers((data) => {
        setMembers(data);
        setIsLoading(false);
      }),
      subscribeToOccasions(setOccasions),
      subscribeToGallery(setGalleryState),
      subscribeToSuggestions(setSuggestions),
      subscribeToGroupLogo(setGroupLogo),
    ];

    // Seed empty Firestore collections in background
    seedAllCollections().catch((err) => console.warn('Background seed error:', err));

    return () => {
      clearTimeout(timer);
      unsubscribers.forEach((u) => u());
    };
  }, []);

  // Keep currentUser in localStorage (it's device-specific session data)
  useEffect(() => {
    saveUser(currentUser);
    if (activeTab === 'member-subscriptions' && (!currentUser.isLoggedIn || !isBadgedMember(currentUser.role))) {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab]);


  const handleAddSuggestion = (newSug: any) => {
    saveSuggestion(newSug).catch(console.error);
  };

  const handleUpdateSuggestion = (updatedSug: any) => {
    saveSuggestion(updatedSug).catch(console.error);
  };

  const handleUpdateGroupLogo = (logoUrl: string) => {
    saveGroupLogoFirestore(logoUrl).catch(console.error);
  };

  const handleOpenLogin = (memberId?: string, type: 'admin' | 'member' = 'member') => {
    setLoginModalMemberId(memberId);
    setLoginModalType(type);
    setIsLoginModalOpen(true);
  };

  // (localStorage sync removed — Firestore handles persistence)

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
    saveIncome(newIncome).catch(console.error);
  };

  // Update Income Transaction (Admin Only)
  const handleUpdateIncome = (updatedIncome: IncomeTransaction) => {
    saveIncome(updatedIncome).catch(console.error);
  };

  // Delete Income Transaction (Admin Only)
  const handleDeleteIncome = (incomeId: string) => {
    deleteIncome(incomeId).catch(console.error);
  };

  // Add Custom Income Type
  const handleAddCustomIncomeType = (newType: string) => {
    const updated = saveCustomIncomeType(newType);
    setCustomIncomeTypes(updated);
  };

  // Add Expense Transaction
  const handleAddExpense = (newExpense: ExpenseTransaction) => {
    saveExpense(newExpense).catch(console.error);
  };

  // Update Expense Transaction (Admin Only)
  const handleUpdateExpense = (updatedExpense: ExpenseTransaction) => {
    saveExpense(updatedExpense).catch(console.error);
  };

  // Delete Expense Transaction (Admin Only)
  const handleDeleteExpense = (expenseId: string) => {
    deleteExpense(expenseId).catch(console.error);
  };

  // Approve Expense
  const handleApproveExpense = (expId: string, approverName: string, approverRole: any) => {
    const expense = expenses.find((e) => e.id === expId);
    if (!expense) return;
    const updated = {
      ...expense,
      approvalStatus: 'मंजूर' as const,
      approvedBy: `${approverName} (${approverRole})`,
      approvedByRole: approverRole,
      approvedAt: new Date().toISOString(),
    };
    saveExpense(updated).catch(console.error);
  };

  // Add Member
  const handleAddMember = (newMember: Member) => {
    saveMember(newMember).catch(console.error);
  };

  // Update Member
  const handleUpdateMember = (updatedMember: Member) => {
    saveMember(updatedMember).catch(console.error);
  };

  // Delete Member
  const handleDeleteMember = (memberId: string) => {
    deleteMember(memberId).catch(console.error);
  };

  // Reset to Demo Data
  const handleResetData = () => {
    if (window.confirm('तुम्हाला खरोखर सर्व मूळ प्रात्यक्षिक (Demo) डेटा रिसेट करायचा आहे का?')) {
      resetFirestoreToDemo().catch(console.error);
      setCurrentUser(DEFAULT_USER);
      saveUser(DEFAULT_USER);
    }
  };

  return (
    <>
    {isLoading && (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950">
        <img src={moryaLogo} alt="logo" className="w-20 h-20 rounded-full border-2 border-amber-400 mb-4 animate-pulse" />
        <p className="text-amber-400 font-bold text-lg mb-2">मोरया ग्रुप मित्र मंडळ (ट्रस्ट)</p>
        <p className="text-slate-400 text-sm">डेटा लोड होत आहे...</p>
        <div className="mt-4 w-40 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full animate-[pulse_1s_ease-in-out_infinite] w-2/3"></div>
        </div>
      </div>
    )}
    <div className="flex h-screen bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-amber-100/60 font-sans text-slate-800 overflow-hidden antialiased select-none">
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
        <header className="lg:hidden bg-gradient-to-r from-amber-950 via-rose-950 to-orange-950 text-white px-4 py-2.5 border-b border-amber-500/40 flex items-center justify-between shrink-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-amber-900/80 text-amber-300 hover:bg-amber-800 border border-amber-500/40 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
              <span className="text-xs font-bold text-amber-200">मेन्यू</span>
            </button>

            <div className="flex items-center gap-2">
              <img
                src={groupLogo || moryaLogo}
                alt="मोरया ग्रुप मित्र मंडळ (ट्रस्ट) लोगो"
                className="w-8 h-8 object-contain rounded-full border border-amber-400 p-0.5 bg-slate-950 shrink-0 shadow-sm"
              />
              <div>
                <h1 className="text-xs font-black text-amber-400 truncate max-w-[180px] sm:max-w-none">
                  मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
                </h1>
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

        {/* Dynamic Main View Area (All content including Stats scrolls smoothly together) */}
        <section className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab !== 'dashboard' && (
              <HeaderStats
                summary={summary}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                summary={summary}
                incomes={incomes}
                expenses={expenses}
                members={members}
                currentUser={currentUser}
                gallery={gallery}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                groupLogo={groupLogo}
                onSaveGallery={(newGallery) => setGalleryState(newGallery)}
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
                onNavigate={(tab) => setActiveTab(tab)}
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
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'income-history' && (
              <IncomeHistory
                incomes={incomes}
                members={members}
                financialYear={selectedYear}
                currentUser={currentUser}
                onUpdateIncome={handleUpdateIncome}
                onDeleteIncome={handleDeleteIncome}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'expense-history' && (
              <ExpenseHistory
                expenses={expenses}
                currentUser={currentUser}
                financialYear={selectedYear}
                onApproveExpense={handleApproveExpense}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
                onNavigate={(tab) => setActiveTab(tab)}
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
                  onNavigate={(tab) => setActiveTab(tab)}
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
                  onSaveGallery={(newGallery) => setGalleryState(newGallery)}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onApproveExpense={handleApproveExpense}
                  onLogout={handleLogout}
                  onOpenLogin={() => setIsLoginModalOpen(true)}
                />
              ))}

            {activeTab === 'month-wise-reports' && (
              <MonthWiseReportsView
                incomes={incomes}
                expenses={expenses}
                financialYear={selectedYear}
                currentUser={currentUser}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'all-years-data' && (
              <AllYearsDataView
                incomes={incomes}
                expenses={expenses}
                currentUser={currentUser}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'core-summary' && (
              <CoreSummaryView
                summary={summary}
                incomes={incomes}
                expenses={expenses}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                currentUser={currentUser}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'statement-export' && (
              <StatementExportView
                incomes={incomes}
                expenses={expenses}
                financialYear={selectedYear}
                currentUser={currentUser}
                groupLogo={groupLogo}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'suggestions' && (
              <SuggestionsView
                suggestions={suggestions}
                currentUser={currentUser}
                members={members}
                onAddSuggestion={handleAddSuggestion}
                onUpdateSuggestion={handleUpdateSuggestion}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                currentUser={currentUser}
                members={members}
                incomes={incomes}
                groupLogo={groupLogo}
                onUpdateGroupLogo={handleUpdateGroupLogo}
                onUpdateMember={handleUpdateMember}
                onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
                onNavigate={(tab) => setActiveTab(tab)}
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
    </>
  );
}
