import React, { useState, useEffect, useMemo } from 'react';
import moryaLogo from './assets/morya_logo.jpg';
import {
  IncomeTransaction,
  ExpenseTransaction,
  Member,
  OccasionEvent,
  EventGalleryImage,
  CurrentUser,
  CashSettlement,
  UserDesignation,
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
  getStoredCashSettlements,
  saveCashSettlementsToCache,
  purgeLegacyLocalStorage,
  DEFAULT_USER,
  calculateFinancialSummary,
  clearAllTransactionsFromStorage,
  STORAGE_KEYS,
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
      year: inc.year || prev?.year || '२०२६',
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

function mergeCashSettlementsPreservingApprovals(
  incoming: CashSettlement[],
  existing: CashSettlement[]
): CashSettlement[] {
  const map = new Map<string, CashSettlement>();

  // 1. Load incoming from online DB first
  incoming.forEach((item) => {
    if (item && item.id) map.set(item.id, item);
  });

  // 2. Merge existing local state, ensuring approved/rejected statuses take precedence over stale pending
  existing.forEach((prev) => {
    if (!prev || !prev.id) return;
    const fromOnline = map.get(prev.id);
    if (!fromOnline) {
      map.set(prev.id, prev);
    } else {
      // If local state is already approved or rejected, preserve it unless online is also finalized
      if (prev.approvalStatus === 'मंजूर' || prev.approvalStatus === 'रद्द') {
        if (fromOnline.approvalStatus === 'प्रलंबित') {
          map.set(prev.id, {
            ...fromOnline,
            approvalStatus: prev.approvalStatus,
            approvedBy: prev.approvedBy,
            approvedByRole: prev.approvedByRole,
            approvedAt: prev.approvedAt,
          });
        }
      }
    }
  });

  return Array.from(map.values());
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
  subscribeToCashSettlements,
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
  deleteSuggestion,
  saveGroupLogo as saveGroupLogoFirestore,
  saveCustomIncomeTypes,
  saveCashSettlement,
  deleteCashSettlement,
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
  cloudDeleteSuggestion,
  cloudSaveGroupLogo,
  cloudSaveCustomIncomeTypes,
  cloudClearAllTransactions,
  cloudSaveCashSettlement,
  cloudDeleteCashSettlement,
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
  fetchCashSettlementsFromSupabase,
  saveCashSettlementToSupabase,
  deleteCashSettlementFromSupabase,
} from './services/supabaseService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { sendDailyEmailReport, isReportAlreadySentToday } from './services/emailService';
import { dispatchApprovedTransaction } from './services/transactionDispatchService';
import { startDaily1159Scheduler } from './services/dailyReceiptSchedulerService';
import { syncOfficerSignaturesFromOnline } from './services/signatureService';
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
import { CashSettlementsView } from './components/CashSettlementsView';
import { ProfileView } from './components/ProfileView';
import { MonthWiseReportsView } from './components/MonthWiseReportsView';
import { AllYearsDataView } from './components/AllYearsDataView';
import { CoreSummaryView } from './components/CoreSummaryView';
import { SuggestionsView } from './components/SuggestionsView';
import { LoginModal } from './components/LoginModal';
import { OccasionModal } from './components/OccasionModal';
import { SettingsModal } from './components/SettingsModal';
import { LogoLightboxModal } from './components/LogoLightboxModal';
import { isBadgedMember, hasAdminPermissions, canApproveFinancialTransactions } from './utils/rbac';
import { isDateInSelectedYear, formatIncomeTransactionsNo, formatExpenseTransactionsNo, getCalendarYearFromDate } from './utils/dateUtils';
import { NetworkStatusNotifier } from './components/NetworkStatusNotifier';
import { Menu, Home, Sun, Moon, ChevronDown, ChevronRight, ShieldCheck, UserCheck, LogOut, LogIn, Lock } from 'lucide-react';

const VALID_TABS = new Set([
  'dashboard',
  'income-form',
  'expense-form',
  'income-history',
  'expense-history',
  'cash-settlements',
  'member-subscriptions',
  'month-wise-reports',
  'all-years-data',
  'core-summary',
  'suggestions',
  'profile',
]);

const getInitialTab = (): string => {
  try {
    const hash = window.location.hash.replace(/^#\/?/, '').trim();
    if (hash && VALID_TABS.has(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('morya_active_tab');
    if (saved && VALID_TABS.has(saved)) {
      return saved;
    }
  } catch (e) {
    console.warn('Failed to read initial tab:', e);
  }
  return 'dashboard';
};

const getInitialYear = (): string => {
  try {
    const saved = localStorage.getItem('morya_selected_year');
    if (saved && saved.trim()) {
      return saved;
    }
  } catch {
    // fallback
  }
  return getCalendarYearFromDate(new Date().toISOString().split('T')[0]);
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [selectedYear, setSelectedYear] = useState<string>(getInitialYear);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isOccasionModalOpen, setIsOccasionModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isAdminClearModalOpen, setIsAdminClearModalOpen] = useState<boolean>(false);
  const [loginModalMemberId, setLoginModalMemberId] = useState<string | undefined>(undefined);
  const [loginModalType, setLoginModalType] = useState<'admin' | 'member'>('member');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Application states — populated strictly by online databases (Firestore, Cloud Gist, Supabase)
  const [incomes, setIncomes] = useState<IncomeTransaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseTransaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [occasions, setOccasions] = useState<OccasionEvent[]>([]);
  const [customIncomeTypes, setCustomIncomeTypes] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(getStoredUser);
  const [gallery, setGalleryState] = useState<EventGalleryImage[]>([]);
  const [groupLogo, setGroupLogo] = useState<string>('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [cashSettlements, setCashSettlements] = useState<CashSettlement[]>(getStoredCashSettlements);

  useEffect(() => {
    saveCashSettlementsToCache(cashSettlements);
  }, [cashSettlements]);

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

  useEffect(() => {
    try {
      localStorage.setItem('morya_active_tab', activeTab);
      const currentHash = window.location.hash.replace(/^#\/?/, '').trim();
      if (currentHash !== activeTab) {
        window.history.replaceState(null, '', `#${activeTab}`);
      }
    } catch (err) {
      console.warn('Failed to save active tab setting:', err);
    }
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('morya_selected_year', selectedYear);
    } catch (err) {
      console.warn('Failed to save selected year setting:', err);
    }
  }, [selectedYear]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash && VALID_TABS.has(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Subscribe to Firestore collections & Central Cloud DB strictly
  useEffect(() => {
    purgeLegacyLocalStorage();

    // Hide loading screen after max 1.5 second safety window
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

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
        if (Array.isArray(data)) {
          const clean = data.filter((s) => s && s.id !== 'sug-101' && s.id !== 'sug-102');
          setSuggestions(clean);
          saveSuggestions(clean);
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
      subscribeToCashSettlements((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCashSettlements((prev) => {
            const list = mergeCashSettlementsPreservingApprovals(data, prev);
            saveCashSettlementsToCache(list);
            return list;
          });
        }
      }),
    ];

    // Central Cloud & Supabase Real-Time Subscriptions (Laptop <-> Mobile Sync)
    const loadSupabaseData = async () => {
      if (isSupabaseConfigured) {
        try {
          await Promise.allSettled([
            seedSupabaseIfEmpty(),
            syncOfficerSignaturesFromOnline(),
          ]);
          const [m, inc, exp, occ, logo, gal, settlements] = await Promise.all([
            fetchMembersFromSupabase(),
            fetchIncomesFromSupabase(),
            fetchExpensesFromSupabase(),
            fetchOccasionsFromSupabase(),
            fetchGroupLogoFromSupabase(),
            fetchGalleryFromSupabase(),
            fetchCashSettlementsFromSupabase(),
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
          if (Array.isArray(settlements) && settlements.length > 0) {
            setCashSettlements((prev) => {
              const list = mergeCashSettlementsPreservingApprovals(settlements, prev);
              saveCashSettlementsToCache(list);
              return list;
            });
          }
        } catch (err) {
          console.warn('[Supabase] Initial load error:', err);
        }
      }
    };

    loadSupabaseData();

    const unsubSupabaseRealtime = subscribeToSupabaseRealtime(async () => {
      if (isSupabaseConfigured) {
        const [m, inc, exp, occ, logo, gal, settlements] = await Promise.all([
          fetchMembersFromSupabase(),
          fetchIncomesFromSupabase(),
          fetchExpensesFromSupabase(),
          fetchOccasionsFromSupabase(),
          fetchGroupLogoFromSupabase(),
          fetchGalleryFromSupabase(),
          fetchCashSettlementsFromSupabase(),
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
        if (Array.isArray(settlements) && settlements.length > 0) {
          setCashSettlements((prev) => {
            const list = mergeCashSettlementsPreservingApprovals(settlements, prev);
            saveCashSettlementsToCache(list);
            return list;
          });
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
        const clean = cloudDb.suggestions.filter((s) => s && s.id !== 'sug-101' && s.id !== 'sug-102');
        setSuggestions(clean);
        saveSuggestions(clean);
      }
      if (cloudDb.settings?.groupLogo && cloudDb.settings.groupLogo.trim() !== '') {
        setGroupLogo(cloudDb.settings.groupLogo);
        saveGroupLogo(cloudDb.settings.groupLogo);
      }
      if (Array.isArray(cloudDb.settings?.customIncomeTypes)) {
        setCustomIncomeTypes(cloudDb.settings.customIncomeTypes);
      }
      if (Array.isArray(cloudDb.cashSettlements)) {
        setCashSettlements((prev) => {
          const list = mergeCashSettlementsPreservingApprovals(cloudDb.cashSettlements!, prev);
          saveCashSettlementsToCache(list);
          return list;
        });
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

  // Automated Daily 11:59 PM Dispatch of all approved transactions, receipts & backup to Drive and Email
  useEffect(() => {
    const unsubScheduler = startDaily1159Scheduler(() => ({
      incomes,
      expenses,
      cashSettlements,
      groupLogo,
    }));
    return () => unsubScheduler();
  }, [incomes, expenses, cashSettlements, groupLogo]);

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
    deleteSuggestion(id).catch(console.error);
    cloudDeleteSuggestion(id).catch(console.error);
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

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoLightboxOpen, setIsLogoLightboxOpen] = useState(() => currentUser.isLoggedIn === false);

  const selectedRoleValue = useMemo(() => {
    if (currentUser.role === 'ॲडमिन') return 'ADMIN_ACCOUNT';
    const found = members.find(
      (m) =>
        m.fullName.trim().toLowerCase() === currentUser.name.trim().toLowerCase() ||
        (m.phone && currentUser.phone && m.phone === currentUser.phone)
    );
    return found ? found.id : 'ADMIN_ACCOUNT';
  }, [currentUser, members]);

  const handleUserSelect = (val: string) => {
    const isAdmin = currentUser.role === 'ॲडमिन' && currentUser.isLoggedIn !== false;

    if (isAdmin) {
      if (val === 'ADMIN_ACCOUNT') {
        setCurrentUser({
          name: 'सिस्टम ॲडमिन',
          role: 'ॲडमिन',
          phone: '९८२२०१०१००',
          isLoggedIn: true,
        });
        return;
      }

      const foundMember = members.find((m) => m.id === val);
      if (foundMember) {
        setCurrentUser({
          name: foundMember.fullName,
          role: (foundMember.designation as any) || 'सभासद',
          phone: foundMember.phone,
          email: foundMember.email,
          birthDate: foundMember.birthDate,
          age: foundMember.age,
          isLoggedIn: true,
        });
      }
      return;
    }

    if (val === 'ADMIN_ACCOUNT') {
      handleOpenLogin('ADMIN_ACCOUNT', 'admin');
      return;
    }

    const foundMember = members.find((m) => m.id === val);
    if (foundMember) {
      if (foundMember.password && foundMember.password.trim() !== '') {
        handleOpenLogin(foundMember.id, 'member');
      } else {
        setCurrentUser({
          name: foundMember.fullName,
          role: (foundMember.designation as any) || 'सभासद',
          phone: foundMember.phone,
          email: foundMember.email,
          birthDate: foundMember.birthDate,
          age: foundMember.age,
          isLoggedIn: true,
        });
      }
    }
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
    setIsLogoLightboxOpen(false);
  };
  // Logout handler
  const handleLogout = () => {
    setCurrentUser(DEFAULT_USER);
    saveUser(DEFAULT_USER);
    try {
      localStorage.removeItem('morya_active_tab');
    } catch {}
    setActiveTab('dashboard');
    setIsLogoLightboxOpen(true);
  };

  // Formatted Sequential Transaction Numbers (CR-YY-N for Income, EXP-YY-N for Expense)
  const formattedIncomes = useMemo(() => formatIncomeTransactionsNo(incomes), [incomes]);
  const formattedExpenses = useMemo(() => formatExpenseTransactionsNo(expenses), [expenses]);

  // Financial Summary Calculation
  const summary = useMemo(() => {
    const yearIncomes = formattedIncomes.filter((i) =>
      isDateInSelectedYear(i.transactionDate, selectedYear, i.financialYear)
    );
    const yearExpenses = formattedExpenses.filter((e) =>
      isDateInSelectedYear(e.expenseDate, selectedYear, e.financialYear)
    );
    return calculateFinancialSummary(yearIncomes, yearExpenses);
  }, [formattedIncomes, formattedExpenses, selectedYear]);

  // Add Income Transaction
  const handleAddIncome = (newIncome: IncomeTransaction) => {
    const isAuthorized = canApproveFinancialTransactions(currentUser.role);
    const isApproved = isAuthorized && newIncome.approvalStatus === 'मंजूर';
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
    if (isApproved) {
      dispatchApprovedTransaction(finalIncome, 'INCOME').catch(console.error);
    }
  };

  // Update Income Transaction (Admin Only)
  const handleUpdateIncome = (updatedIncome: IncomeTransaction) => {
    setIncomes((prev) => prev.map((i) => (i.id === updatedIncome.id ? updatedIncome : i)));
    saveIncome(updatedIncome).catch(console.error);
    cloudSaveIncome(updatedIncome).catch(console.error);
    saveIncomeToSupabase(updatedIncome).catch(console.error);
  };

  // Delete / Cancel Income Transaction (Admin Only)
  const handleDeleteIncome = (incomeId: string) => {
    const item = incomes.find((i) => i.id === incomeId);
    if (!item) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const isSameDay =
      item.transactionDate === todayStr ||
      (item.createdAt && item.createdAt.split('T')[0] === todayStr);

    if (isSameDay) {
      // Created on the same day: Completely remove from DB
      setIncomes((prev) => prev.filter((i) => i.id !== incomeId));
      deleteIncome(incomeId).catch(console.error);
      cloudDeleteIncome(incomeId).catch(console.error);
      deleteIncomeFromSupabase(incomeId).catch(console.error);
    } else {
      // Past dates: DO NOT delete; Mark as 'रद्द' (Cancelled) so sequence numbers do NOT shift!
      const cancelled: IncomeTransaction = {
        ...item,
        approvalStatus: 'रद्द',
        notes: item.notes
          ? `${item.notes} | प्रशासकीय रद्द (${new Date().toLocaleDateString('mr-IN')})`
          : `प्रशासकीय रद्द (${new Date().toLocaleDateString('mr-IN')})`,
      };
      setIncomes((prev) => prev.map((i) => (i.id === incomeId ? cancelled : i)));
      saveIncome(cancelled).catch(console.error);
      cloudSaveIncome(cancelled).catch(console.error);
      saveIncomeToSupabase(cancelled).catch(console.error);
    }
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
    const isAuthorized = canApproveFinancialTransactions(currentUser.role);
    const isApproved = isAuthorized && newExpense.approvalStatus === 'मंजूर';
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
    if (isApproved) {
      dispatchApprovedTransaction(finalExpense, 'EXPENSE').catch(console.error);
    }
  };

  // Update Expense Transaction (Admin Only)
  const handleUpdateExpense = (updatedExpense: ExpenseTransaction) => {
    setExpenses((prev) => prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)));
    saveExpense(updatedExpense).catch(console.error);
    cloudSaveExpense(updatedExpense).catch(console.error);
    saveExpenseToSupabase(updatedExpense).catch(console.error);
  };

  // Delete / Cancel Expense Transaction (Admin Only)
  const handleDeleteExpense = (expenseId: string) => {
    const item = expenses.find((e) => e.id === expenseId);
    if (!item) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const isSameDay =
      item.expenseDate === todayStr ||
      (item.createdAt && item.createdAt.split('T')[0] === todayStr);

    if (isSameDay) {
      // Created on the same day: Completely remove from DB
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      deleteExpense(expenseId).catch(console.error);
      cloudDeleteExpense(expenseId).catch(console.error);
      deleteExpenseFromSupabase(expenseId).catch(console.error);
    } else {
      // Past dates: DO NOT delete; Mark as 'रद्द' (Cancelled) so sequence numbers do NOT shift!
      const cancelled: ExpenseTransaction = {
        ...item,
        approvalStatus: 'रद्द',
        notes: item.notes
          ? `${item.notes} | प्रशासकीय रद्द (${new Date().toLocaleDateString('mr-IN')})`
          : `प्रशासकीय रद्द (${new Date().toLocaleDateString('mr-IN')})`,
      };
      setExpenses((prev) => prev.map((e) => (e.id === expenseId ? cancelled : e)));
      saveExpense(cancelled).catch(console.error);
      cloudSaveExpense(cancelled).catch(console.error);
      saveExpenseToSupabase(cancelled).catch(console.error);
    }
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
    dispatchApprovedTransaction(updated, 'EXPENSE').catch(console.error);
  };

  // Reject Expense
  const handleRejectExpense = (expId: string, rejecterName: string, rejecterRole: any) => {
    const expense = expenses.find((e) => e.id === expId);
    if (!expense) return;
    const updated = {
      ...expense,
      approvalStatus: 'रद्द' as const,
      approvedBy: `${rejecterName} (${rejecterRole})`,
      approvedByRole: rejecterRole,
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
    dispatchApprovedTransaction(updated, 'INCOME').catch(console.error);
  };

  // Reject Income
  const handleRejectIncome = (incId: string, rejecterName: string, rejecterRole: any) => {
    const income = incomes.find((i) => i.id === incId);
    if (!income) return;
    const updated = {
      ...income,
      approvalStatus: 'रद्द' as const,
      approvedBy: `${rejecterName} (${rejecterRole})`,
      approvedByRole: rejecterRole,
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

  // Cash Settlement Handlers (Member Cash Handover to Trust/Bank)
  const handleAddCashSettlement = (newSettlement: CashSettlement) => {
    const isAuthorized = canApproveFinancialTransactions(currentUser.role);
    const isApproved = isAuthorized && newSettlement.approvalStatus === 'मंजूर';
    const finalSettlement: CashSettlement = {
      ...newSettlement,
      approvalStatus: isApproved ? 'मंजूर' : 'प्रलंबित',
      approvedBy: isApproved ? (newSettlement.approvedBy || currentUser.name) : undefined,
      approvedByRole: isApproved ? (newSettlement.approvedByRole || currentUser.role) : undefined,
      approvedAt: isApproved ? (newSettlement.approvedAt || new Date().toISOString()) : undefined,
    };
    setCashSettlements((prev) => [finalSettlement, ...prev.filter((s) => s.id !== finalSettlement.id)]);
    saveCashSettlement(finalSettlement).catch(console.error);
    cloudSaveCashSettlement(finalSettlement).catch(console.error);
    saveCashSettlementToSupabase(finalSettlement).catch(console.error);
  };

  const handleApproveCashSettlement = (
    settlementId: string,
    approverName: string,
    approverRole: UserDesignation
  ) => {
    let approvedItem: CashSettlement | undefined;
    setCashSettlements((prev) => {
      const updatedList = prev.map((s) => {
        if (s.id === settlementId) {
          approvedItem = {
            ...s,
            approvalStatus: 'मंजूर',
            approvedBy: approverName,
            approvedByRole: approverRole,
            approvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return approvedItem;
        }
        return s;
      });
      saveCashSettlementsToCache(updatedList);
      return updatedList;
    });
    if (approvedItem) {
      saveCashSettlement(approvedItem).catch(console.error);
      cloudSaveCashSettlement(approvedItem).catch(console.error);
      saveCashSettlementToSupabase(approvedItem).catch(console.error);
    }
  };

  const handleRejectCashSettlement = (
    settlementId: string,
    rejecterName: string,
    rejecterRole: UserDesignation
  ) => {
    let rejectedItem: CashSettlement | undefined;
    setCashSettlements((prev) => {
      const updatedList = prev.map((s) => {
        if (s.id === settlementId) {
          rejectedItem = {
            ...s,
            approvalStatus: 'रद्द',
            approvedBy: rejecterName,
            approvedByRole: rejecterRole,
            approvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return rejectedItem;
        }
        return s;
      });
      saveCashSettlementsToCache(updatedList);
      return updatedList;
    });
    if (rejectedItem) {
      saveCashSettlement(rejectedItem).catch(console.error);
      cloudSaveCashSettlement(rejectedItem).catch(console.error);
      saveCashSettlementToSupabase(rejectedItem).catch(console.error);
    }
  };

  const handleDeleteCashSettlement = (settlementId: string) => {
    const item = cashSettlements.find((s) => s.id === settlementId);
    if (!item) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const isSameDay =
      item.depositDate === todayStr ||
      (item.createdAt && item.createdAt.split('T')[0] === todayStr);

    if (isSameDay) {
      setCashSettlements((prev) => prev.filter((s) => s.id !== settlementId));
      deleteCashSettlement(settlementId).catch(console.error);
      cloudDeleteCashSettlement(settlementId).catch(console.error);
      deleteCashSettlementFromSupabase(settlementId).catch(console.error);
    } else {
      const cancelled: CashSettlement = {
        ...item,
        approvalStatus: 'रद्द',
        notes: item.notes
          ? `${item.notes} | प्रशासकीय रद्द (${new Date().toLocaleDateString('mr-IN')})`
          : `प्रशासकीय रद्द (${new Date().toLocaleDateString('mr-IN')})`,
      };
      setCashSettlements((prev) => prev.map((s) => (s.id === settlementId ? cancelled : s)));
      saveCashSettlement(cancelled).catch(console.error);
      cloudSaveCashSettlement(cancelled).catch(console.error);
      saveCashSettlementToSupabase(cancelled).catch(console.error);
    }
  };

  // Reset to Demo Data
  const handleResetData = () => {
    if (window.confirm('तुम्हाला खरोखर सर्व मूळ प्रात्यक्षिक (Demo) डेटा रिसेट करायचा आहे का?')) {
      resetFirestoreToDemo().catch(console.error);
      setCurrentUser(DEFAULT_USER);
      saveUser(DEFAULT_USER);
    }
  };

  const pendingCashSettlementCount = useMemo(
    () => (cashSettlements || []).filter((s) => s.approvalStatus === 'प्रलंबित').length,
    [cashSettlements]
  );

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
        : 'bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-amber-100/60 text-slate-800'
    }`}>
      {/* Sidebar / Mobile Drawer Component */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        members={members}
        pendingExpenseCount={summary.pendingExpensesCount}
        pendingCashSettlementCount={pendingCashSettlementCount}
        groupLogo={groupLogo}
        onUpdateGroupLogo={handleUpdateGroupLogo}
        onResetData={handleResetData}
        onOpenLogin={handleOpenLogin}
        onLogout={handleLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpen={() => setIsMobileMenuOpen(true)}
        onOpenOccasions={() => setIsOccasionModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top Navigation Header (Always Accessible on Desktop & Mobile) */}
        <header className="bg-gradient-to-r from-amber-950 via-rose-950 to-orange-950 text-white px-4 py-2.5 border-b border-amber-500/40 flex items-center justify-between shrink-0 z-30 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              onMouseEnter={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-amber-900/80 text-amber-300 hover:bg-amber-800 border border-amber-500/40 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              aria-label="Toggle navigation menu"
              title="मेन्यू उघडा (Hover or Click)"
            >
              <Menu className="w-5 h-5" />
              <span className="text-xs font-bold text-amber-200">मेन्यू</span>
            </button>

            <div
              className="flex items-center gap-2 cursor-pointer group"
              onClick={() => setIsLogoLightboxOpen(true)}
              onMouseEnter={() => setIsLogoLightboxOpen(true)}
              title="मोठा लोगो व मंडळ नाव पहा (Hover / Click)"
            >
              <img
                src={groupLogo || moryaLogo}
                alt="मोरया ग्रुप मित्र मंडळ (ट्रस्ट) लोगो"
                className="w-8 h-8 object-contain rounded-full border border-amber-400 p-0.5 bg-slate-950 shrink-0 shadow-sm transition-transform group-hover:scale-110"
              />
              <div>
                <h1 className="text-xs font-black text-amber-400 truncate max-w-[180px] sm:max-w-none group-hover:text-amber-300 transition-colors">
                  मोरया ग्रुप मित्र मंडळ (ट्रस्ट)
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Home Logo & Navigation Button */}
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="मुख्य डॅशबोर्डवर परत जा (Home)"
            >
              <Home className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-black text-amber-200">मुख्य पान</span>
            </button>

            {/* Top Right Profile Logo & Popover Menu */}
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 px-2.5 py-1 rounded-xl cursor-pointer transition-all shadow-xs active:scale-95"
                title="प्रोफाइल व खाते मेन्यू उघडा"
              >
                <div className="w-6 h-6 bg-amber-500 text-slate-950 font-black rounded-lg flex items-center justify-center text-xs shadow-xs shrink-0">
                  {currentUser.isLoggedIn !== false ? currentUser.name.substring(0, 1) : '🔑'}
                </div>
                <span className="text-xs font-bold text-amber-200 max-w-[90px] truncate sm:max-w-none">
                  {currentUser.isLoggedIn !== false ? currentUser.name.split(' ')[0] : 'लॉगइन'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-300 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Menu Dropdown Popover */}
              {isProfileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-amber-500/40 text-white rounded-2xl shadow-2xl p-3 z-50 space-y-3">
                    {currentUser.isLoggedIn !== false ? (
                      <>
                        <div className="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700/80 flex items-center gap-2.5">
                          <div className="w-9 h-9 bg-amber-500 text-slate-950 font-black rounded-xl flex items-center justify-center text-sm shadow shrink-0">
                            {currentUser.name.substring(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                            <span className="text-[10px] text-amber-300 font-bold px-1.5 py-0.2 bg-slate-950 rounded border border-amber-500/20 inline-block mt-0.5">
                              {currentUser.role}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> प्रोफाइल / पद बदलावा:
                          </label>
                          <select
                            value={selectedRoleValue}
                            onChange={(e) => {
                              handleUserSelect(e.target.value);
                              setIsProfileMenuOpen(false);
                            }}
                            className="w-full bg-slate-800 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 p-2 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                          >
                            <option value="ADMIN_ACCOUNT">⚡ ॲडमिन (सिस्टम ॲडमिन)</option>
                            <optgroup label="पदाधिकारी (Office Bearers)">
                              {members
                                .filter((m) => m.designation && m.designation !== 'सभासद')
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    🏅 {m.fullName} ({m.designation})
                                  </option>
                                ))}
                            </optgroup>
                            <optgroup label="सभासद (General Members)">
                              {members
                                .filter((m) => !m.designation || m.designation === 'सभासद')
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    👤 {m.fullName} (सभासद)
                                  </option>
                                ))}
                            </optgroup>
                          </select>
                        </div>

                        <div className="space-y-1 pt-1 border-t border-slate-800">
                          <button
                            onClick={() => {
                              setActiveTab('profile');
                              setIsProfileMenuOpen(false);
                            }}
                            className="w-full py-2 px-3 bg-slate-800/60 hover:bg-slate-800 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-amber-400" />
                              <span>माझे प्रोफाइल पहा</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          <button
                            onClick={() => {
                              handleLogout();
                              setIsProfileMenuOpen(false);
                            }}
                            className="w-full py-2 px-3 bg-rose-950/60 hover:bg-rose-900/80 text-rose-200 rounded-xl font-bold text-xs flex items-center justify-between border border-rose-800/40 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <LogOut className="w-4 h-4 text-rose-400" />
                              <span>लॉगआउट (Logout)</span>
                            </div>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="p-3 bg-slate-800/90 rounded-xl border border-amber-500/40 text-center space-y-2">
                        <p className="text-xs text-amber-300 font-bold flex items-center justify-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> पाहुणा मोड (Guest Mode)
                        </p>
                        <p className="text-[10px] text-slate-400">
                          आर्थिक नोंदी व हिशोब पाहण्यासाठी लॉगिन करा.
                        </p>
                        <button
                          onClick={() => {
                            handleOpenLogin();
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                        >
                          <LogIn className="w-4 h-4" />
                          <span>लॉगिन करा (Login)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Main View Area (All content including Stats scrolls smoothly together) */}
        <section className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'dashboard' && (
              <DashboardView
                summary={summary}
                incomes={formattedIncomes}
                expenses={formattedExpenses}
                cashSettlements={cashSettlements}
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
                onRejectExpense={handleRejectExpense}
                onApproveIncome={handleApproveIncome}
                onRejectIncome={handleRejectIncome}
                onApproveCashSettlement={handleApproveCashSettlement}
                onRejectCashSettlement={handleRejectCashSettlement}
                onDeleteCashSettlement={handleDeleteCashSettlement}
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
                incomes={formattedIncomes}
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
                expenses={formattedExpenses}
                onAddExpense={handleAddExpense}
                onSuccessNavigate={() => setActiveTab('expense-history')}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'income-history' && (
              <IncomeHistory
                incomes={formattedIncomes}
                members={members}
                financialYear={selectedYear}
                currentUser={currentUser}
                onApproveIncome={handleApproveIncome}
                onRejectIncome={handleRejectIncome}
                onUpdateIncome={handleUpdateIncome}
                onDeleteIncome={handleDeleteIncome}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'expense-history' && (
              <ExpenseHistory
                expenses={formattedExpenses}
                members={members}
                currentUser={currentUser}
                financialYear={selectedYear}
                onApproveExpense={handleApproveExpense}
                onRejectExpense={handleRejectExpense}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'cash-settlements' && (
              <CashSettlementsView
                incomes={formattedIncomes}
                expenses={formattedExpenses}
                cashSettlements={cashSettlements}
                members={members}
                currentUser={currentUser}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                onAddCashSettlement={handleAddCashSettlement}
                onApproveCashSettlement={handleApproveCashSettlement}
                onRejectCashSettlement={handleRejectCashSettlement}
                onDeleteCashSettlement={handleDeleteCashSettlement}
                onAddExpense={handleAddExpense}
                onApproveExpense={handleApproveExpense}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={handleOpenLogin}
              />
            )}

            {activeTab === 'member-subscriptions' &&
              (isBadgedMember(currentUser.role) ? (
                <MemberSubscriptionsView
                  members={members}
                  incomes={formattedIncomes}
                  expenses={formattedExpenses}
                  cashSettlements={cashSettlements}
                  financialYear={selectedYear}
                  currentUser={currentUser}
                  onAddMember={handleAddMember}
                  onUpdateMember={handleUpdateMember}
                  onDeleteMember={handleDeleteMember}
                  onAddCashSettlement={handleAddCashSettlement}
                  onApproveCashSettlement={handleApproveCashSettlement}
                  onRejectCashSettlement={handleRejectCashSettlement}
                  onDeleteCashSettlement={handleDeleteCashSettlement}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onOpenLogin={handleOpenLogin}
                />
              ) : (
                <DashboardView
                  summary={summary}
                  incomes={formattedIncomes}
                  expenses={formattedExpenses}
                  cashSettlements={cashSettlements}
                  members={members}
                  currentUser={currentUser}
                  gallery={gallery}
                  selectedYear={selectedYear}
                  setSelectedYear={setSelectedYear}
                  onSaveGallery={handleSaveGallery}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onApproveExpense={handleApproveExpense}
                  onRejectExpense={handleRejectExpense}
                  onApproveIncome={handleApproveIncome}
                  onRejectIncome={handleRejectIncome}
                  onApproveCashSettlement={handleApproveCashSettlement}
                  onRejectCashSettlement={handleRejectCashSettlement}
                  onDeleteCashSettlement={handleDeleteCashSettlement}
                  onLogout={handleLogout}
                  onOpenLogin={() => setIsLoginModalOpen(true)}
                />
              ))}

            {activeTab === 'month-wise-reports' && (
              <MonthWiseReportsView
                incomes={formattedIncomes}
                expenses={formattedExpenses}
                financialYear={selectedYear}
                currentUser={currentUser}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'all-years-data' && (
              <AllYearsDataView
                incomes={formattedIncomes}
                expenses={formattedExpenses}
                currentUser={currentUser}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenLogin={() => setIsLoginModalOpen(true)}
              />
            )}

            {activeTab === 'core-summary' && (
              <CoreSummaryView
                summary={summary}
                incomes={formattedIncomes}
                expenses={formattedExpenses}
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
                incomes={formattedIncomes}
                expenses={formattedExpenses}
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
        incomes={incomes}
        expenses={expenses}
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

      {/* WhatsApp-Style Full Screen Logo Opening Window / Lightbox */}
      <LogoLightboxModal
        isOpen={isLogoLightboxOpen}
        logoSrc={groupLogo}
        onClose={() => setIsLogoLightboxOpen(false)}
        isAdmin={currentUser.role === 'ॲडमिन' && currentUser.isLoggedIn !== false}
        onOpenLogin={handleOpenLogin}
      />

      {/* Agentation Visual Feedback Toolbar - Local Development & Admin User Only */}
      {import.meta.env.DEV && currentUser?.isLoggedIn && hasAdminPermissions(currentUser?.role) && (
        <Agentation />
      )}
    </div>
    </>
  );
}
