import {
  IncomeTransaction,
  ExpenseTransaction,
  Member,
  OccasionEvent,
  CurrentUser,
  FinancialYearSummary,
  EventGalleryImage,
  MemberSuggestion,
} from '../types';
import {
  INITIAL_INCOMES,
  INITIAL_EXPENSES,
  INITIAL_MEMBERS,
  INITIAL_OCCASIONS,
  DEFAULT_USER,
  INITIAL_EVENT_GALLERY,
  INITIAL_SUGGESTIONS,
} from '../mockData';

export { DEFAULT_USER };

export const STORAGE_KEYS = {
  USER: 'morya_mandal_user_v2',
  GROUP_LOGO: 'morya_mandal_group_logo_v2',
  GALLERY: 'morya_mandal_gallery_v2',
  EVENT_GALLERY: 'morya_mandal_gallery_v2',
  OCCASIONS: 'morya_mandal_occasions_v2',
  INCOMES: 'morya_mandal_incomes_v2',
  EXPENSES: 'morya_mandal_expenses_v2',
  MEMBERS: 'morya_mandal_members_v2',
  CUSTOM_INCOME_TYPES: 'morya_mandal_custom_income_types_v2',
};

/**
 * Purges all financial and entity data from local storage so all data is strictly live from online DB
 */
export const clearAllLocalStorageFinancialData = () => {
  try {
    const keysToRemove = [
      STORAGE_KEYS.INCOMES,
      STORAGE_KEYS.EXPENSES,
      STORAGE_KEYS.MEMBERS,
      STORAGE_KEYS.OCCASIONS,
      STORAGE_KEYS.GALLERY,
      STORAGE_KEYS.GROUP_LOGO,
      STORAGE_KEYS.CUSTOM_INCOME_TYPES,
      'morya_mandal_incomes',
      'morya_mandal_expenses',
      'morya_mandal_incomes_v2',
      'morya_mandal_expenses_v2',
      'morya_mandal_occasions',
      'morya_mandal_occasions_v2',
      'morya_mandal_gallery_v2',
      'morya_mandal_group_logo_v2',
      'morya_mandal_custom_income_types_v2',
      'morya_mandal_members_v2',
      'morya_group_backup_latest',
      'morya_group_backup_history',
    ];
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (err) {
    console.warn('Failed to clear local storage:', err);
  }
};

// Execute purge immediately on script evaluation
clearAllLocalStorageFinancialData();

export const getStoredIncomes = (): IncomeTransaction[] => {
  clearAllLocalStorageFinancialData();
  return INITIAL_INCOMES;
};

export const saveIncomes = (_incomes: IncomeTransaction[]) => {
  clearAllLocalStorageFinancialData();
};

export const getStoredExpenses = (): ExpenseTransaction[] => {
  clearAllLocalStorageFinancialData();
  return INITIAL_EXPENSES;
};

export const saveExpenses = (_expenses: ExpenseTransaction[]) => {
  clearAllLocalStorageFinancialData();
};

export const getStoredMembers = (): Member[] => INITIAL_MEMBERS;
export const saveMembers = (_members: Member[]) => {};

export const getStoredOccasions = (): OccasionEvent[] => {
  clearAllLocalStorageFinancialData();
  return INITIAL_OCCASIONS;
};

export const saveOccasions = (_occasions: OccasionEvent[]) => {
  clearAllLocalStorageFinancialData();
};

export const getCustomIncomeTypes = (): string[] => [];
export const saveCustomIncomeType = (_newType: string) => [];

// ONLY store current login session in storage
export const getStoredUser = (): CurrentUser => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    if (!data) return DEFAULT_USER;
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object' || parsed.isLoggedIn === undefined) {
      return DEFAULT_USER;
    }
    return parsed;
  } catch {
    return DEFAULT_USER;
  }
};

export const saveUser = (user: CurrentUser) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (err) {
    console.warn('Failed to save user session:', err);
  }
};

export const getStoredEventGallery = (): EventGalleryImage[] => {
  clearAllLocalStorageFinancialData();
  return INITIAL_EVENT_GALLERY;
};

export const saveEventGallery = (_gallery: EventGalleryImage[]) => {
  clearAllLocalStorageFinancialData();
};

export const getStoredGroupLogo = (): string => '';

export const saveGroupLogo = (_logoUrl: string) => {
  clearAllLocalStorageFinancialData();
};

export const getStoredSuggestions = (): MemberSuggestion[] => INITIAL_SUGGESTIONS;
export const saveSuggestions = (_suggestions: MemberSuggestion[]) => {};

export const resetToDemoData = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER);
    clearAllLocalStorageFinancialData();
  } catch {}
};

export const clearAllTransactionsFromStorage = () => {
  clearAllLocalStorageFinancialData();
};

// Financial Calculation Helpers
export const calculateFinancialSummary = (
  incomes: IncomeTransaction[],
  expenses: ExpenseTransaction[]
): FinancialYearSummary => {
  const safeIncomes = Array.isArray(incomes) ? incomes : [];
  const safeExpenses = Array.isArray(expenses) ? expenses : [];

  const totalIncome = safeIncomes.reduce((sum, item) => sum + (item?.amount || 0), 0);
  const approvedExpenses = safeExpenses.filter((e) => e && e.approvalStatus === 'मंजूर');
  const approvedExpensesTotal = approvedExpenses.reduce((sum, item) => sum + (item?.amount || 0), 0);
  const totalExpense = safeExpenses.reduce((sum, item) => sum + (item?.amount || 0), 0);
  const netBalance = totalIncome - approvedExpensesTotal;

  const totalSubscriptionsCollected = safeIncomes
    .filter((i) => i && i.incomeType === 'सभासद वर्गणी')
    .reduce((sum, i) => sum + (i?.amount || 0), 0);

  const totalDonationsCollected = safeIncomes
    .filter((i) => i && i.incomeType !== 'सभासद वर्गणी')
    .reduce((sum, i) => sum + (i?.amount || 0), 0);

  const pendingExpensesCount = safeExpenses.filter((e) => e && e.approvalStatus === 'प्रलंबित').length;

  return {
    totalIncome,
    totalExpense,
    netBalance,
    totalSubscriptionsCollected,
    totalDonationsCollected,
    pendingExpensesCount,
    approvedExpensesTotal,
  };
};

export const getMemberSubscriptionPaid = (memberId: string, incomes: IncomeTransaction[]): number => {
  return incomes
    .filter((i) => i.linkedMemberId === memberId && i.incomeType === 'सभासद वर्गणी')
    .reduce((sum, i) => sum + i.amount, 0);
};

export const getMemberExtraDonationPaid = (memberId: string, incomes: IncomeTransaction[]): number => {
  return incomes
    .filter((i) => i.linkedMemberId === memberId && i.incomeType !== 'सभासद वर्गणी')
    .reduce((sum, i) => sum + i.amount, 0);
};
