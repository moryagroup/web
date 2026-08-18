import {
  Member,
  OccasionEvent,
  IncomeTransaction,
  ExpenseTransaction,
  CurrentUser,
} from '../types';

import { INITIAL_MEMBERS } from '../mockData';

export const DEFAULT_CURRENT_USER: CurrentUser = {
  name: 'पाहुणा (Guest)',
  role: 'सभासद',
  isLoggedIn: false,
};

export { INITIAL_MEMBERS };

export const INITIAL_OCCASIONS: OccasionEvent[] = [];

export const INITIAL_INCOME_TYPES: string[] = [
  'सभासद वर्गणी',
  'सभासदाकडून अतिरिक्त देणगी',
  'इतर व्यक्तीकडून देणगी',
  'संस्था देणगी / मदत',
  'दुकान / व्यवसाय प्रायोजक',
  'प्रायोजक',
  'कार्यक्रमातून जमा',
  'सार्वजनिक देणगी',
  'बँक व्याज',
  'इतर उत्पन्न',
];

export const INITIAL_EXPENSE_CATEGORIES: string[] = [
  'मंडप व सजावट',
  'ध्वनी व प्रकाश',
  'महाप्रसाद व भोजन',
  'पूजा साहित्य व धार्मिक',
  'जाहिरात व बॅनर',
  'परवानग्या व शासकीय',
  'बक्षीस व सन्मान',
  'वीज व पाणी',
  'वाहतूक खर्च',
  'इतर खर्च',
];

export const INITIAL_INCOMES: IncomeTransaction[] = [];

export const INITIAL_EXPENSES: ExpenseTransaction[] = [];
