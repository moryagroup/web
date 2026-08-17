import React, { useState, useEffect, useMemo } from 'react';
import moryaLogo from './assets/morya_logo.jpg';
import {
  IncomeTransaction,
  ExpenseTransaction,
  Member,
  OccasionEvent,
  EventGalleryImage,
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
  saveIncomes,
  saveExpenses,
  saveMembers,
  saveOccasions,
  saveSuggestions,
  saveGroupLogo,
  saveEventGallery,
  saveCustomIncomeType,
  getCustomIncomeTypes,
  DEFAULT_USER,
  calculateFinancialSummary,
  clearAllTransactionsFromStorage,
} from './services/storageService';
import { createLocalBackupSnapshot, downloadBackupJSON } from './utils/backupUtils';

function mergeOccasionsPreservingTasks(
  incoming: OccasionEvent[],
  existing: OccasionEvent[]
): OccasionEvent[] {
  const existingMap = new Map(existing.map((o) => [o.id, o]));
  const mergedMap = new Map<string, OccasionEvent>();

  // 1. Process incoming ONLINE DB items first (Online DB is Authoritative)
  incoming.forEach((inc) => {
    const prev = existingMap.get(inc.id);
    const tasks =
      Array.isArray(inc.tasks)
        ? inc.tasks
        : Array.isArray(prev?.tasks)
        ? prev.tasks
        : [];
    mergedMap.set(inc.id, {
      ...prev,
      ...inc,
      tasks,
      workDetails: inc.workDetails || prev?.workDetails || '',
      responsiblePerson: inc.responsiblePerson || prev?.responsiblePerson || '',
      startDate: inc.startDate || prev?.startDate,
      endDate: inc.endDate || prev?.endDate,
      year: inc.year || prev?.year || '२०२६-२७',
    });
  });

  // 2. Keep any local items created offline that haven't synced to DB yet
  existing.forEach((prev) => {
    if (!mergedMap.has(prev.id)) {
      mergedMap.set(prev.id, prev);
    }
  });

  return Array.from(mergedMap.values());
}
import {
  seedAllCollections,
  subscribeToIncomes,
  subscribeToExpenses,
  subscribeToMembers,
  subscribeToOccasions,
  subscribeToGallery,
  subscribeToSuggestions,
  subscribeToGroupLogo,
  subscribeToCustomIncomeTypes,
  saveIncome,
  deleteIncome,
  saveExpense,
  deleteExpense,
  saveMember,
  deleteMember,
  saveOccasion,
  deleteOccasion,
  saveGalleryImage,
  deleteGalleryImage,
  saveSuggestion,
  saveGroupLogo as saveGroupLogoFirestore,
  saveCustomIncomeTypes,
  resetFirestoreToDemo,
  clearAllTransactionsFromFirestore,
} from './services/firestoreService';
import {
  subscribeToCloudDatabase,
  cloudSaveIncome,
  cloudDeleteIncome,
  cloudSaveExpense,
  cloudDeleteExpense,
  cloudSaveMember,
  cloudDeleteMember,
  cloudSaveOccasion,
  cloudDeleteOccasion,
  cloudSaveGalleryImage,
  cloudDeleteGalleryImage,
  cloudSaveSuggestion,
  cloudSaveGroupLogo,
  cloudSaveCustomIncomeTypes,
  cloudClearAllTransactions,
} from './services/cloudDatabaseService';
import {
  fetchMembersFromSupabase,
  saveMemberToSupabase,
  deleteMemberFromSupabase,
  fetchIncomesFromSupabase,
  saveIncomeToSupabase,
  deleteIncomeFromSupabase,
  fetchExpensesFromSupabase,
  saveExpenseToSupabase,
  deleteExpenseFromSupabase,
  fetchOccasionsFromSupabase,
  saveOccasionToSupabase,
  deleteOccasionFromSupabase,
  clearAllTransactionsFromSupabase,
  subscribeToSupabaseRealtime,
  seedSupabaseIfEmpty,
  fetchGroupLogoFromSupabase,
  saveGroupLogoToSupabase,
  uploadBase64ImageToSupabase,
  fetchGalleryFromSupabase,
  saveGalleryItemToSupabase,
  deleteGalleryItemFromSupabase,
} from './services/supabaseService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { sendDailyEmailReport, isReportAlreadySentToday } from './services/emailService';
import { Agentation } from 'agentation';

import { Sidebar } from './components/Sidebar';
import { HeaderStats } from './components/HeaderStats';
import { DashboardView } from './components/DashboardView';
import { IncomeForm } from './components/IncomeForm';
import { ExpenseForm } from './components/ExpenseForm';
import { AdminClearConfirmModal } from './components/AdminClearConfirmModal';
import { IncomeHistory } from './components/IncomeHistory';
import { ExpenseHistory } from './components/ExpenseHistory';
import { MemberSubscriptionsView } from './components/MemberSubscriptionsView';
import { ProfileView } from './components/ProfileView';
import { MonthWiseReportsView } from './components/MonthWiseReportsView';
import { AllYearsDataView } from './components/AllYearsDataView';
import { CoreSummaryView } from './components/CoreSummaryView';
import { SuggestionsView } from './components/SuggestionsView';
import { LoginModal } from './components/LoginModal';
import { OccasionModal } from './components/OccasionModal';
import { SettingsModal } from './components/SettingsModal';
import { isBadgedMember, hasAdminPermissions, canApproveFinancialTransactions } from './utils/rbac';
import { isDateInSelectedYear } from './utils/dateUtils';
import { NetworkStatusNotifier } from './components/NetworkStatusNotifier';
import { Menu, Sun, Moon } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedYear, setSelectedYear] = useState<string>('२०२६');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isOccasionModalOpen, setIsOccasionModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isAdminClearModalOpen, setIsAdminClearModalOpen] = useState<boolean>(false);
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
  const [gallery, setGalleryState] = useState<EventGalleryImage[]>(getStoredEventGallery);
  const [groupLogo, setGroupLogo] = useState<string>(getStoredGroupLogo);
  const [suggestions, setSuggestions] = useState<any[]>(getStoredSuggestions);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('morya_theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('morya_theme', theme);
    } catch (err) {
      console.warn('Failed to save theme setting:', err);
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Subscribe to Firestore collections & trigger seed in background
  useEffect(() => {
    // Hide loading screen after max 1 second safety window
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    const unsubscribers = [
      subscribeToIncomes((data) => {
        if (data && data.length > 0) {
          setIncomes(data);
          saveIncomes(data);
        }
      }),
      subscribeToExpenses((data) => {
        if (data && data.length > 0) {
          setExpenses(data);
          saveExpenses(data);
        }
      }),
      subscribeToMembers((data) => {
        if (data && data.length > 0) {
          setMembers(data);
          saveMembers(data);
          setIsLoading(false);
        }
      }),
      subscribeToOccasions((data) => {
        if (data && data.length > 0) {
          setOccasions((prev) => {
            const merged = mergeOccasionsPreservingTasks(data, prev);
            saveOccasions(merged);
            return merged;
          });
        }
      }),
      subscribeToGallery((data) => {
        if (data && data.length > 0) {
          setGalleryState(data);
          saveEventGallery(data);
        }
      }),
      subscribeToSuggestions((data) => {
        if (data && data.length > 0) {
          setSuggestions(data);
          saveSuggestions(data);
        }
      }),
      subscribeToGroupLogo((logo) => {
        if (logo) {
          setGroupLogo(logo);
          saveGroupLogo(logo);
        }
      }),
      subscribeToCustomIncomeTypes((types) => {
        if (Array.isArray(types) && types.length > 0) {
          setCustomIncomeTypes(types);
        }
      }),
    ];

    // Central Cloud & Supabase Real-Time Subscriptions (Laptop <-> Mobile Sync)
    const loadSupabaseData = async () => {
      if (isSupabaseConfigured) {
        try {
          await seedSupabaseIfEmpty();
          const [m, inc, exp, occ, logo, gal] = await Promise.all([
            fetchMembersFromSupabase(),
            fetchIncomesFromSupabase(),
            fetchExpensesFromSupabase(),
            fetchOccasionsFromSupabase(),
            fetchGroupLogoFromSupabase(),
            fetchGalleryFromSupabase(),
          ]);
          if (m && m.length > 0) setMembers(m);
          if (inc && inc.length > 0) setIncomes(inc);
          if (exp && exp.length > 0) setExpenses(exp);
          if (occ && occ.length > 0) {
            setOccasions((prev) => {
              const merged = mergeOccasionsPreservingTasks(occ, prev);
              saveOccasions(merged);
              return merged;
            });
          }
          if (gal && gal.length > 0) {
            setGalleryState(gal);
            saveEventGallery(gal);
          }
          if (logo && logo.trim() !== '') {
            setGroupLogo(logo);
            saveGroupLogo(logo);
          }
        } catch (err) {
          console.warn('[Supabase] Initial load error:', err);
        }
      }
    };

    loadSupabaseData();

    const unsubSupabaseRealtime = subscribeToSupabaseRealtime(async () => {
      if (isSupabaseConfigured) {
        const [m, inc, exp, occ, logo, gal] = await Promise.all([
          fetchMembersFromSupabase(),
          fetchIncomesFromSupabase(),
          fetchExpensesFromSupabase(),
          fetchOccasionsFromSupabase(),
          fetchGroupLogoFromSupabase(),
          fetchGalleryFromSupabase(),
        ]);
        if (m && m.length > 0) setMembers(m);
        if (inc) setIncomes(inc);
        if (exp) setExpenses(exp);
        if (occ && occ.length > 0) {
          setOccasions((prev) => {
            const merged = mergeOccasionsPreservingTasks(occ, prev);
            saveOccasions(merged);
            return merged;
          });
        }
        if (gal && gal.length > 0) {
          setGalleryState(gal);
          saveEventGallery(gal);
        }
        if (logo && logo.trim() !== '') {
          setGroupLogo(logo);
          saveGroupLogo(logo);
        }
      }
    });

    const unsubCloud = subscribeToCloudDatabase((cloudDb) => {
      if (Array.isArray(cloudDb.incomes)) {
        setIncomes(cloudDb.incomes);
      }
      if (Array.isArray(cloudDb.expenses)) {
        setExpenses(cloudDb.expenses);
      }
      if (Array.isArray(cloudDb.members) && cloudDb.members.length > 0) {
        setMembers(cloudDb.members);
      }
      if (Array.isArray(cloudDb.occasions) && cloudDb.occasions.length > 0) {
        setOccasions((prev) => {
          const merged = mergeOccasionsPreservingTasks(cloudDb.occasions, prev);
          saveOccasions(merged);
          return merged;
        });
      }
      if (Array.isArray(cloudDb.gallery) && cloudDb.gallery.length > 0) {
        setGalleryState(cloudDb.gallery);
        saveEventGallery(cloudDb.gallery);
      }
      if (Array.isArray(cloudDb.suggestions)) {
        setSuggestions(cloudDb.suggestions);
      }
      if (cloudDb.settings?.groupLogo && cloudDb.settings.groupLogo.trim() !== '') {
        setGroupLogo(cloudDb.settings.groupLogo);
        saveGroupLogo(cloudDb.settings.groupLogo);
      }
      if (Array.isArray(cloudDb.settings?.customIncomeTypes)) {
        setCustomIncomeTypes(cloudDb.settings.customIncomeTypes);
      }
      setIsLoading(false);
    });

    return () => {
      clearTimeout(timer);
      unsubCloud();
      unsubSupabaseRealtime();
    };
  }, []);

  // Automatic Local Snapshot Backup before deploy & on data changes
  useEffect(() => {
    if (incomes.length > 0 || expenses.length > 0 || members.length > 0 || occasions.length > 0) {
      createLocalBackupSnapshot(incomes, expenses, members, occasions, gallery, customIncomeTypes, groupLogo);
    }
  }, [incomes, expenses, members, occasions, gallery, customIncomeTypes, groupLogo]);

  // Automated Daily Transaction Email Check for moryagroupdata@gmail.com
  useEffect(() => {
    if (currentUser.isLoggedIn && !isReportAlreadySentToday() && (incomes.length > 0 || expenses.length > 0)) {
      const timer = setTimeout(() => {
        sendDailyEmailReport(incomes, expenses, false).catch(console.error);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [incomes, expenses, currentUser.isLoggedIn]);

  // Keep currentUser in localStorage (it's device-specific session data)
  useEffect(() => {
    saveUser(currentUser);
    if (activeTab === 'member-subscriptions' && (!currentUser.isLoggedIn || !isBadgedMember(currentUser.role))) {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab]);

  const handleAddSuggestion = (newSug: any) => {
    setSuggestions((prev) => {
      const updated = [newSug, ...prev.filter((s) => s.id !== newSug.id)];
      saveSuggestions(updated);
      return updated;
    });
    saveSuggestion(newSug).catch(console.error);
    cloudSaveSuggestion(newSug).catch(console.error);
  };

  const handleUpdateSuggestion = (updatedSug: any) => {
    setSuggestions((prev) => {
      const updated = prev.map((s) => (s.id === updatedSug.id ? updatedSug : s));
      saveSuggestions(updated);
      return updated;
    });
    saveSuggestion(updatedSug).catch(console.error);
    cloudSaveSuggestion(updatedSug).catch(console.error);
  };

  const handleDeleteSuggestion = (id: string) => {
    setSuggestions((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveSuggestions(updated);
      return updated;
    });
  };

  const handleUpdateGroupLogo = async (logoUrl: string) => {
    let finalUrl = logoUrl;
    if (logoUrl && (logoUrl.startsWith('data:') || logoUrl.startsWith('blob:'))) {
      try {
        finalUrl = await uploadBase64ImageToSupabase(logoUrl, 'logos', 'morya_group_logo.png');
      } catch (err) {
        console.error('[Supabase] Failed to upload logo to CDN storage:', err);
      }
    }
    setGroupLogo(finalUrl);
    saveGroupLogo(finalUrl);
    saveGroupLogoFirestore(finalUrl).catch(console.error);
    cloudSaveGroupLogo(finalUrl).catch(console.error);
    saveGroupLogoToSupabase(finalUrl).catch(console.error);
  };

  const handleOpenLogin = (memberId?: string, type: 'admin' | 'member' = 'member') => {
    setLoginModalMemberId(memberId);
    setLoginModalType(type);
    setIsLoginModalOpen(true);
  };

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
    const yearIncomes = incomes.filter((i) => isDateInSelectedYear(i.transactionDate, selectedYear, i.financialYear));
    const yearExpenses = expenses.filter((e) => isDateInSelectedYear(e.expenseDate, selectedYear, e.financialYear));
    return calculateFinancialSummary(yearIncomes, yearExpenses);
  }, [incomes, expenses, selectedYear]);

  // Add Income Transaction
  const handleAddIncome = (newIncome: IncomeTransaction) => {
    const isApproved = newIncome.approvalStatus === 'मंजूर';
    const finalIncome: IncomeTransaction = {
      ...newIncome,
      approvalStatus: isApproved ? 'मंजूर' : 'प्रलंबित',
      approvedBy: isApproved ? (newIncome.approvedBy || currentUser.name) : undefined,
      approvedByRole: isApproved ? (newIncome.approvedByRole || currentUser.role) : undefined,
      approvedAt: isApproved ? (newIncome.approvedAt || new Date().toISOString()) : undefined,
    };
    setIncomes((prev) => [finalIncome, ...prev.filter((i) => i.id !== finalIncome.id)]);
    saveIncome(finalIncome).catch(console.error);
    cloudSaveIncome(finalIncome).catch(console.error);
    saveIncomeToSupabase(finalIncome).catch(console.error);
  };

  // Update Income Transaction (Admin Only)
  const handleUpdateIncome = (updatedIncome: IncomeTransaction) => {
    setIncomes((prev) => prev.map((i) => (i.id === updatedIncome.id ? updatedIncome : i)));
    saveIncome(updatedIncome).catch(console.error);
    cloudSaveIncome(updatedIncome).catch(console.error);
    saveIncomeToSupabase(updatedIncome).catch(console.error);
  };

  // Delete Income Transaction (Admin Only)
  const handleDeleteIncome = (incomeId: string) => {
    setIncomes((prev) => prev.filter((i) => i.id !== incomeId));
    deleteIncome(incomeId).catch(console.error);
    cloudDeleteIncome(incomeId).catch(console.error);
    deleteIncomeFromSupabase(incomeId).catch(console.error);
  };

  // Custom Income Types Firestore Sync
  const handleAddCustomIncomeType = (newType: string) => {
    if (newType && !customIncomeTypes.includes(newType)) {
      const updated = [...customIncomeTypes, newType];
      setCustomIncomeTypes(updated);
      saveCustomIncomeTypes(updated).catch(console.error);
      saveCustomIncomeType(newType);
      cloudSaveCustomIncomeTypes(updated).catch(console.error);
    }
  };

  const handleDeleteCustomIncomeType = (typeToDelete: string) => {
    const updated = customIncomeTypes.filter((t) => t !== typeToDelete);
    setCustomIncomeTypes(updated);
    saveCustomIncomeTypes(updated).catch(console.error);
    cloudSaveCustomIncomeTypes(updated).catch(console.error);
  };

  const handleClearAllTransactions = () => {
    if (!hasAdminPermissions(currentUser.role)) {
      alert('व्यवहार हटवण्याचे अधिकार केवळ ॲडमिन यांनाच आहेत.');
      return;
    }
    setIsAdminClearModalOpen(true);
  };

  const handleConfirmClearTransactions = async () => {
    clearAllTransactionsFromStorage();
    await clearAllTransactionsFromFirestore();
    await cloudClearAllTransactions();
    await clearAllTransactionsFromSupabase();
    setIncomes([]);
    setExpenses([]);
    alert('सर्व जमा व खर्च व्यवहार यशस्वीरित्या हटवण्यात आले आहेत.');
  };

  // Gallery Persistence & Real-Time Sync
  const handleSaveGallery = async (newGallery: EventGalleryImage[]) => {
    const newGalleryArray = Array.isArray(newGallery) ? newGallery : [];
    const newIds = new Set(newGalleryArray.map((g) => g.id));

    // Delete items no longer present
    gallery.forEach((g) => {
      if (!newIds.has(g.id)) {
        deleteGalleryImage(g.id).catch(console.error);
        cloudDeleteGalleryImage(g.id).catch(console.error);
        deleteGalleryItemFromSupabase(g.id).catch(console.error);
      }
    });

    // Upload base64 images to Supabase CDN and sync across backends
    const processedGallery = await Promise.all(
      newGalleryArray.map(async (n) => {
        let finalItem = n;
        if (n.imageUrl && (n.imageUrl.startsWith('data:') || n.imageUrl.startsWith('blob:'))) {
          try {
            const cdnUrl = await uploadBase64ImageToSupabase(n.imageUrl, 'gallery', `${n.id}.png`);
            finalItem = { ...n, imageUrl: cdnUrl };
          } catch (err) {
            console.error('[Supabase] Gallery image CDN upload error:', err);
          }
        }
        saveGalleryImage(finalItem).catch(console.error);
        cloudSaveGalleryImage(finalItem).catch(console.error);
        saveGalleryItemToSupabase(finalItem).catch(console.error);
        return finalItem;
      })
    );

    setGalleryState(processedGallery);
    saveEventGallery(processedGallery);
  };

  // Occasions Management
  const handleAddOccasion = async (newOccasion: OccasionEvent) => {
    let finalOccasion = newOccasion;
    if (newOccasion.bannerUrl && (newOccasion.bannerUrl.startsWith('data:') || newOccasion.bannerUrl.startsWith('blob:'))) {
      try {
        const cdnUrl = await uploadBase64ImageToSupabase(newOccasion.bannerUrl, 'occasions', `${newOccasion.id}.png`);
        finalOccasion = { ...newOccasion, bannerUrl: cdnUrl };
      } catch (err) {
        console.error('[Supabase] Occasion banner upload error:', err);
      }
    }
    setOccasions((prev) => {
      const updated = [finalOccasion, ...prev.filter((o) => o.id !== finalOccasion.id)];
      saveOccasions(updated);
      return updated;
    });
    saveOccasion(finalOccasion).catch(console.error);
    cloudSaveOccasion(finalOccasion).catch(console.error);
    saveOccasionToSupabase(finalOccasion).catch(console.error);
  };

  const handleUpdateOccasion = async (updatedOccasion: OccasionEvent) => {
    let finalOccasion = updatedOccasion;
    if (updatedOccasion.bannerUrl && (updatedOccasion.bannerUrl.startsWith('data:') || updatedOccasion.bannerUrl.startsWith('blob:'))) {
      try {
        const cdnUrl = await uploadBase64ImageToSupabase(updatedOccasion.bannerUrl, 'occasions', `${updatedOccasion.id}.png`);
        finalOccasion = { ...updatedOccasion, bannerUrl: cdnUrl };
      } catch (err) {
        console.error('[Supabase] Occasion banner upload error:', err);
      }
    }
    setOccasions((prev) => {
      const updated = prev.map((o) => (o.id === finalOccasion.id ? finalOccasion : o));
      saveOccasions(updated);
      return updated;
    });
    saveOccasion(finalOccasion).catch(console.error);
    cloudSaveOccasion(finalOccasion).catch(console.error);
    saveOccasionToSupabase(finalOccasion).catch(console.error);
  };

  const handleDeleteOccasion = (occasionId: string) => {
    setOccasions((prev) => {
      const updated = prev.filter((o) => o.id !== occasionId);
      saveOccasions(updated);
      return updated;
    });
    deleteOccasion(occasionId).catch(console.error);
    cloudDeleteOccasion(occasionId).catch(console.error);
    deleteOccasionFromSupabase(occasionId).catch(console.error);
  };

  // Add Expense Transaction
  const handleAddExpense = (newExpense: ExpenseTransaction) => {
    const isApproved = newExpense.approvalStatus === 'मंजूर';
    const finalExpense: ExpenseTransaction = {
      ...newExpense,
      approvalStatus: isApproved ? 'मंजूर' : 'प्रलंबित',
      approvedBy: isApproved ? (newExpense.approvedBy || currentUser.name) : undefined,
      approvedByRole: isApproved ? (newExpense.approvedByRole || currentUser.role) : undefined,
      approvedAt: isApproved ? (newExpense.approvedAt || new Date().toISOString()) : undefined,
    };
    setExpenses((prev) => [finalExpense, ...prev.filter((e) => e.id !== finalExpense.id)]);
    saveExpense(finalExpense).catch(console.error);
    cloudSaveExpense(finalExpense).catch(console.error);
    saveExpenseToSupabase(finalExpense).catch(console.error);
  };

  // Update Expense Transaction (Admin Only)
  const handleUpdateExpense = (updatedExpense: ExpenseTransaction) => {
    setExpenses((prev) => prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)));
    saveExpense(updatedExpense).catch(console.error);
    cloudSaveExpense(updatedExpense).catch(console.error);
    saveExpenseToSupabase(updatedExpense).catch(console.error);
  };

  // Delete Expense Transaction (Admin Only)
  const handleDeleteExpense = (expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    deleteExpense(expenseId).catch(console.error);
    cloudDeleteExpense(expenseId).catch(console.error);
    deleteExpenseFromSupabase(expenseId).catch(console.error);
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
    setExpenses((prev) => prev.map((e) => (e.id === expId ? updated : e)));
    saveExpense(updated).catch(console.error);
    cloudSaveExpense(updated).catch(console.error);
    saveExpenseToSupabase(updated).catch(console.error);
  };

  // Approve Income
  const handleApproveIncome = (incId: string, approverName: string, approverRole: any) => {
    const income = incomes.find((i) => i.id === incId);
    if (!income) return;
    const updated = {
      ...income,
      approvalStatus: 'मंजूर' as const,
      approvedBy: `${approverName} (${approverRole})`,
      approvedByRole: approverRole,
      approvedAt: new Date().toISOString(),
    };
    setIncomes((prev) => prev.map((i) => (i.id === incId ? updated : i)));
    saveIncome(updated).catch(console.error);
    cloudSaveIncome(updated).catch(console.error);
    saveIncomeToSupabase(updated).catch(console.error);
  };

  // Add Member
  const handleAddMember = async (newMember: Member) => {
    let finalMember = newMember;
    if (newMember.photoUrl && (newMember.photoUrl.startsWith('data:') || newMember.photoUrl.startsWith('blob:'))) {
      try {
        const cdnUrl = await uploadBase64ImageToSupabase(newMember.photoUrl, 'profiles', `${newMember.id}.png`);
        finalMember = { ...newMember, photoUrl: cdnUrl };
      } catch (err) {
        console.error('[Supabase] Member photo upload error:', err);
      }
    }
    setMembers((prev) => [...prev.filter((m) => m.id !== finalMember.id), finalMember]);
    saveMember(finalMember).catch(console.error);
    cloudSaveMember(finalMember).catch(console.error);
    saveMemberToSupabase(finalMember).catch(console.error);
  };

  // Update Member
  const handleUpdateMember = async (updatedMember: Member) => {
    let finalMember = updatedMember;
    if (updatedMember.photoUrl && (updatedMember.photoUrl.startsWith('data:') || updatedMember.photoUrl.startsWith('blob:'))) {
      try {
        const cdnUrl = await uploadBase64ImageToSupabase(updatedMember.photoUrl, 'profiles', `${updatedMember.id}.png`);
        finalMember = { ...updatedMember, photoUrl: cdnUrl };
      } catch (err) {
        console.error('[Supabase] Member photo upload error:', err);
      }
    }
    setMembers((prev) => {
      const exists = prev.some((m) => m.id === finalMember.id);
      if (exists) {
        return prev.map((m) => (m.id === finalMember.id ? finalMember : m));
      }
      return [finalMember, ...prev];
    });
    saveMember(finalMember).catch(console.error);
    cloudSaveMember(finalMember).catch(console.error);
    saveMemberToSupabase(finalMember).catch(console.error);
  };

  // Delete Member
  const handleDeleteMember = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    deleteMember(memberId).catch(console.error);
    cloudDeleteMember(memberId).catch(console.error);
    deleteMemberFromSupabase(memberId).catch(console.error);
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
        <p className="text-amber-400 font-bold text-lg mb-2">मोरया ग्रुप मित्र मंडळ (ट्रस्ट)</p>
        <p className="text-slate-400 text-sm">डेटा लोड होत आहे...</p>
        <div className="mt-4 w-40 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full animate-[pulse_1s_ease-in-out_infinite] w-2/3"></div>
        </div>
      </div>
    )}
    <div className={`flex h-screen font-sans overflow-hidden antialiased select-none transition-colors duration-300 ${
      theme === 'dark'
        ? 'bg-slate-950 text-slate-100 dark'
        : 'bg-slate-50 text-slate-800'
    }`}>
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
        onOpenOccasions={() => setIsOccasionModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
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
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              title={theme === 'dark' ? 'लाइट मोड चालू करा' : 'डार्क मोड चालू करा'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-300 hidden sm:inline">लाइट</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-amber-300" />
                  <span className="text-[10px] font-bold text-amber-300 hidden sm:inline">डार्क</span>
                </>
              )}
            </button>

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
                occasions={occasions}
                currentUser={currentUser}
                gallery={gallery}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                groupLogo={groupLogo}
                onSaveGallery={handleSaveGallery}
                onNavigate={(tab) => setActiveTab(tab)}
                onApproveExpense={handleApproveExpense}
                onApproveIncome={handleApproveIncome}
                onLogout={handleLogout}
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onUpdateOccasion={handleUpdateOccasion}
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
                members={members}
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
                  financialYear={selectedYear}
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
                  selectedYear={selectedYear}
                  setSelectedYear={setSelectedYear}
                  onSaveGallery={handleSaveGallery}
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

            {activeTab === 'suggestions' && (
              <SuggestionsView
                suggestions={suggestions}
                currentUser={currentUser}
                members={members}
                onAddSuggestion={handleAddSuggestion}
                onUpdateSuggestion={handleUpdateSuggestion}
                onDeleteSuggestion={handleDeleteSuggestion}
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

      {/* Occasion Management Modal */}
      <OccasionModal
        isOpen={isOccasionModalOpen}
        onClose={() => setIsOccasionModalOpen(false)}
        occasions={occasions}
        members={members}
        onAddOccasion={handleAddOccasion}
        onUpdateOccasion={handleUpdateOccasion}
        onDeleteOccasion={handleDeleteOccasion}
        currentUser={currentUser}
        onOpenLogin={handleOpenLogin}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        groupLogo={groupLogo}
        onUpdateGroupLogo={handleUpdateGroupLogo}
        customIncomeTypes={customIncomeTypes}
        onAddCustomIncomeType={handleAddCustomIncomeType}
        onDeleteCustomIncomeType={handleDeleteCustomIncomeType}
        currentUser={currentUser}
        onOpenLogin={handleOpenLogin}
        onClearAllTransactions={handleClearAllTransactions}
        onDownloadBackup={() =>
          downloadBackupJSON(
            incomes,
            expenses,
            members,
            occasions,
            gallery,
            customIncomeTypes,
            groupLogo
          )
        }
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Admin Clear Transactions Password Protection Modal */}
      <AdminClearConfirmModal
        isOpen={isAdminClearModalOpen}
        onClose={() => setIsAdminClearModalOpen(false)}
        onConfirm={handleConfirmClearTransactions}
      />

      {/* Mobile Network Status Notifier */}
      <NetworkStatusNotifier />

      {/* Agentation Visual Feedback Toolbar - Local Development & Admin User Only */}
      {import.meta.env.DEV && currentUser?.isLoggedIn && hasAdminPermissions(currentUser?.role) && (
        <Agentation />
      )}
    </div>
    </>
  );
}
