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

const STORAGE_KEYS = {
  USER: 'morya_mandal_user_v2',
  CUSTOM_INCOME_TYPES: 'morya_mandal_custom_income_types_v1',
  LOGO: 'morya_mandal_group_logo_v1',
};

// Initial data getters (used for initial state before Supabase DB loads)
export const getStoredIncomes = (): IncomeTransaction[] => INITIAL_INCOMES;
export const saveIncomes = (_incomes: IncomeTransaction[]) => {};

export const getStoredExpenses = (): ExpenseTransaction[] => INITIAL_EXPENSES;
export const saveExpenses = (_expenses: ExpenseTransaction[]) => {};

export const getStoredMembers = (): Member[] => INITIAL_MEMBERS;
export const saveMembers = (_members: Member[]) => {};

export const getStoredOccasions = (): OccasionEvent[] => INITIAL_OCCASIONS;
export const saveOccasions = (_occasions: OccasionEvent[]) => {};

export const getCustomIncomeTypes = (): string[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_INCOME_TYPES);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCustomIncomeType = (newType: string) => {
  const current = getCustomIncomeTypes();
  if (newType && !current.includes(newType)) {
    const updated = [...current, newType];
    localStorage.setItem(STORAGE_KEYS.CUSTOM_INCOME_TYPES, JSON.stringify(updated));
    return updated;
  }
  return current;
};

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
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

export const getStoredEventGallery = (): EventGalleryImage[] => INITIAL_EVENT_GALLERY;
export const saveEventGallery = (_gallery: EventGalleryImage[]) => {};

export const getStoredGroupLogo = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEYS.LOGO) || '';
  } catch {
    return '';
  }
};

export const saveGroupLogo = (logoUrl: string) => {
  try {
    if (!logoUrl) {
      localStorage.removeItem(STORAGE_KEYS.LOGO);
    } else {
      localStorage.setItem(STORAGE_KEYS.LOGO, logoUrl);
    }
  } catch (err) {
    console.error('Error saving group logo:', err);
  }
};

export const getStoredSuggestions = (): MemberSuggestion[] => INITIAL_SUGGESTIONS;
export const saveSuggestions = (_suggestions: MemberSuggestion[]) => {};

export const resetToDemoData = () => {
  localStorage.removeItem(STORAGE_KEYS.USER);
};

export const clearAllTransactionsFromStorage = () => {};

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
