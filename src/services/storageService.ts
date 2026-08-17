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

export const getStoredIncomes = (): IncomeTransaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INCOMES);
    if (!data) return INITIAL_INCOMES;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_INCOMES;
  } catch {
    return INITIAL_INCOMES;
  }
};

export const saveIncomes = (incomes: IncomeTransaction[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(incomes));
  } catch (err) {
    console.warn('Failed to save incomes to localStorage:', err);
  }
};

export const getStoredExpenses = (): ExpenseTransaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!data) return INITIAL_EXPENSES;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_EXPENSES;
  } catch {
    return INITIAL_EXPENSES;
  }
};

export const saveExpenses = (expenses: ExpenseTransaction[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  } catch (err) {
    console.warn('Failed to save expenses to localStorage:', err);
  }
};

export const getStoredMembers = (): Member[] => INITIAL_MEMBERS;
export const saveMembers = (_members: Member[]) => {};

export const getStoredOccasions = (): OccasionEvent[] => {
  try {
    localStorage.removeItem(STORAGE_KEYS.OCCASIONS);
    localStorage.removeItem('morya_mandal_occasions_v2');
    localStorage.removeItem('morya_mandal_occasions');
  } catch {}
  return INITIAL_OCCASIONS;
};

export const saveOccasions = (_occasions: OccasionEvent[]) => {
  try {
    localStorage.removeItem(STORAGE_KEYS.OCCASIONS);
  } catch {}
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
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
};

export const getStoredEventGallery = (): EventGalleryImage[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GALLERY);
    if (!data) return INITIAL_EVENT_GALLERY;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_EVENT_GALLERY;
  } catch {
    return INITIAL_EVENT_GALLERY;
  }
};

export const saveEventGallery = (gallery: EventGalleryImage[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(gallery));
  } catch (err) {
    console.error('Failed to save gallery to localStorage:', err);
  }
};

export const getStoredGroupLogo = (): string => {
  try {
    return localStorage.getItem(STORAGE_KEYS.GROUP_LOGO) || '';
  } catch {
    return '';
  }
};

export const saveGroupLogo = (logoUrl: string) => {
  try {
    if (logoUrl) {
      localStorage.setItem(STORAGE_KEYS.GROUP_LOGO, logoUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.GROUP_LOGO);
    }
  } catch (err) {
    console.error('Failed to save group logo to localStorage:', err);
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
