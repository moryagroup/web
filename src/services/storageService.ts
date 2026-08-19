import {
  IncomeTransaction,
  ExpenseTransaction,
  Member,
  OccasionEvent,
  CurrentUser,
  FinancialYearSummary,
  EventGalleryImage,
  MemberSuggestion,
  CashSettlement,
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
  SUGGESTIONS: 'morya_mandal_suggestions_v2',
  CASH_SETTLEMENTS: 'morya_mandal_cash_settlements_v2',
  CUSTOM_INCOME_TYPES: 'morya_mandal_custom_income_types_v2',
};

/**
 * Purge any stale legacy domain data from localStorage.
 * STRICT POLICY: All domain data (incomes, expenses, members, occasions, settlements, gallery, logo)
 * must live strictly on the central Online Database (Firestore + Cloud Gist + Supabase).
 */
export const purgeLegacyLocalStorage = () => {
  try {
    const keysToPurge = [
      STORAGE_KEYS.INCOMES,
      STORAGE_KEYS.EXPENSES,
      STORAGE_KEYS.MEMBERS,
      STORAGE_KEYS.OCCASIONS,
      STORAGE_KEYS.GALLERY,
      STORAGE_KEYS.EVENT_GALLERY,
      STORAGE_KEYS.SUGGESTIONS,
      STORAGE_KEYS.CASH_SETTLEMENTS,
      STORAGE_KEYS.CUSTOM_INCOME_TYPES,
      'morya_incomes',
      'morya_expenses',
      'morya_members',
      'morya_occasions',
      'morya_cash_settlements',
      'morya_cash_settlements_v1',
      'morya_cash_settlements_v2',
    ];
    keysToPurge.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    });
  } catch (err) {
    console.warn('Failed to purge local storage cache:', err);
  }
};

// Initial state getters (Empty arrays by default; populated strictly from live Online Database)
export const getStoredIncomes = (): IncomeTransaction[] => [];
export const saveIncomes = (_incomes: IncomeTransaction[]) => {};

export const getStoredExpenses = (): ExpenseTransaction[] => [];
export const saveExpenses = (_expenses: ExpenseTransaction[]) => {};

export const getStoredMembers = (): Member[] => [];
export const saveMembers = (_members: Member[]) => {};

export const getStoredOccasions = (): OccasionEvent[] => [];
export const saveOccasions = (_occasions: OccasionEvent[]) => {};

export const getCustomIncomeTypes = (): string[] => [];
export const saveCustomIncomeType = (_newType: string) => [];

// ONLY store current login session in device storage
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
  } catch {}
};

export const getStoredEventGallery = (): EventGalleryImage[] => [];
export const saveEventGallery = (_gallery: EventGalleryImage[]) => {};

export const getStoredGroupLogo = (): string => '';
export const saveGroupLogo = (_logoUrl: string) => {};

export const getStoredSuggestions = (): MemberSuggestion[] => [];
export const saveSuggestions = (_suggestions: MemberSuggestion[]) => {};

export const resetToDemoData = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch {}
};

export const clearAllTransactionsFromStorage = () => {};

// Financial Calculation Helpers
export const calculateFinancialSummary = (
  incomes: IncomeTransaction[],
  expenses: ExpenseTransaction[]
): FinancialYearSummary => {
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);

  const approvedExpenses = expenses.filter((e) => e.approvalStatus === 'मंजूर');
  const pendingExpenses = expenses.filter((e) => e.approvalStatus === 'प्रलंबित');

  const approvedExpensesTotal = approvedExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = approvedExpensesTotal;
  const netBalance = totalIncome - totalExpense;

  const totalSubscriptionsCollected = incomes
    .filter((item) => item.incomeType === 'वर्गणी')
    .reduce((sum, item) => sum + item.amount, 0);

  const totalDonationsCollected = incomes
    .filter((item) => item.incomeType === 'देणगी' || item.incomeType === 'विशेष देणगी')
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    totalIncome,
    totalExpense,
    netBalance,
    totalSubscriptionsCollected,
    totalDonationsCollected,
    pendingExpensesCount: pendingExpenses.length,
    approvedExpensesTotal,
  };
};

export const getMemberSubscriptionPaid = (
  memberId: string,
  incomes: IncomeTransaction[],
  _financialYear: string
): number => {
  return incomes
    .filter((item) => item.linkedMemberId === memberId && item.incomeType === 'वर्गणी')
    .reduce((sum, item) => sum + item.amount, 0);
};

export const getMemberExtraDonationPaid = (
  memberId: string,
  incomes: IncomeTransaction[],
  _financialYear: string
): number => {
  return incomes
    .filter(
      (item) =>
        item.linkedMemberId === memberId &&
        (item.incomeType === 'देणगी' || item.incomeType === 'विशेष देणगी')
    )
    .reduce((sum, item) => sum + item.amount, 0);
};
