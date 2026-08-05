import {
  IncomeTransaction,
  ExpenseTransaction,
  Member,
  OccasionEvent,
  CurrentUser,
  FinancialYearSummary,
  EventGalleryImage,
} from '../types';
import {
  INITIAL_INCOMES,
  INITIAL_EXPENSES,
  INITIAL_MEMBERS,
  INITIAL_OCCASIONS,
  DEFAULT_USER,
  INITIAL_EVENT_GALLERY,
} from '../mockData';

export { DEFAULT_USER };

const STORAGE_KEYS = {
  INCOMES: 'morya_mandal_incomes_v2',
  EXPENSES: 'morya_mandal_expenses_v2',
  MEMBERS: 'morya_mandal_members_v2',
  OCCASIONS: 'morya_mandal_occasions_v2',
  CUSTOM_INCOME_TYPES: 'morya_mandal_custom_income_types_v1',
  CUSTOM_EXPENSE_TYPES: 'morya_mandal_custom_expense_types_v1',
  USER: 'morya_mandal_user_v2',
  GALLERY: 'morya_mandal_gallery_v1',
  LOGO: 'morya_mandal_group_logo_v1',
};

export const getStoredIncomes = (): IncomeTransaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.INCOMES);
    return data ? JSON.parse(data) : INITIAL_INCOMES;
  } catch {
    return INITIAL_INCOMES;
  }
};

export const saveIncomes = (incomes: IncomeTransaction[]) => {
  localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(incomes));
};

export const getStoredExpenses = (): ExpenseTransaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return data ? JSON.parse(data) : INITIAL_EXPENSES;
  } catch {
    return INITIAL_EXPENSES;
  }
};

export const saveExpenses = (expenses: ExpenseTransaction[]) => {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
};

export const getStoredMembers = (): Member[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    return data ? JSON.parse(data) : INITIAL_MEMBERS;
  } catch {
    return INITIAL_MEMBERS;
  }
};

export const saveMembers = (members: Member[]) => {
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
};

export const getStoredOccasions = (): OccasionEvent[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.OCCASIONS);
    return data ? JSON.parse(data) : INITIAL_OCCASIONS;
  } catch {
    return INITIAL_OCCASIONS;
  }
};

export const saveOccasions = (occasions: OccasionEvent[]) => {
  localStorage.setItem(STORAGE_KEYS.OCCASIONS, JSON.stringify(occasions));
};

export const getCustomIncomeTypes = (): string[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CUSTOM_INCOME_TYPES);
    return data ? JSON.parse(data) : [];
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

export const getStoredEventGallery = (): EventGalleryImage[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GALLERY);
    return data ? JSON.parse(data) : INITIAL_EVENT_GALLERY;
  } catch {
    return INITIAL_EVENT_GALLERY;
  }
};

export const saveEventGallery = (gallery: EventGalleryImage[]) => {
  localStorage.setItem(STORAGE_KEYS.GALLERY, JSON.stringify(gallery));
};

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

export const resetToDemoData = () => {
  localStorage.removeItem(STORAGE_KEYS.INCOMES);
  localStorage.removeItem(STORAGE_KEYS.EXPENSES);
  localStorage.removeItem(STORAGE_KEYS.MEMBERS);
  localStorage.removeItem(STORAGE_KEYS.OCCASIONS);
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_INCOME_TYPES);
  localStorage.removeItem(STORAGE_KEYS.CUSTOM_EXPENSE_TYPES);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.GALLERY);
  localStorage.removeItem(STORAGE_KEYS.LOGO);
};

// Calculation helpers
export const calculateFinancialSummary = (
  incomes: IncomeTransaction[],
  expenses: ExpenseTransaction[]
): FinancialYearSummary => {
  // Total Income: sum of all income transactions
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);

  // Total Expenses: sum of approved expenses
  const approvedExpenses = expenses.filter((e) => e.approvalStatus === 'मंजूर');
  const approvedExpensesTotal = approvedExpenses.reduce((sum, item) => sum + item.amount, 0);

  // All expenses (including pending)
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);

  // Net Balance: Total Income - Approved Expenses
  const netBalance = totalIncome - approvedExpensesTotal;

  // Total Subscriptions Collected (strictly where incomeType === 'सभासद वर्गणी')
  const totalSubscriptionsCollected = incomes
    .filter((i) => i.incomeType === 'सभासद वर्गणी')
    .reduce((sum, i) => sum + i.amount, 0);

  // Total Donations & Sponsorships collected
  const totalDonationsCollected = incomes
    .filter((i) => i.incomeType !== 'सभासद वर्गणी')
    .reduce((sum, i) => sum + i.amount, 0);

  const pendingExpensesCount = expenses.filter((e) => e.approvalStatus === 'प्रलंबित').length;

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

// Calculate subscription paid by a specific member (strictly incomeType === 'सभासद वर्गणी')
export const getMemberSubscriptionPaid = (memberId: string, incomes: IncomeTransaction[]): number => {
  return incomes
    .filter((i) => i.linkedMemberId === memberId && i.incomeType === 'सभासद वर्गणी')
    .reduce((sum, i) => sum + i.amount, 0);
};

// Calculate extra donations paid by a specific member (incomeType !== 'सभासद वर्गणी')
export const getMemberExtraDonationPaid = (memberId: string, incomes: IncomeTransaction[]): number => {
  return incomes
    .filter((i) => i.linkedMemberId === memberId && i.incomeType !== 'सभासद वर्गणी')
    .reduce((sum, i) => sum + i.amount, 0);
};
