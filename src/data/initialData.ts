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

export const INITIAL_OCCASIONS: OccasionEvent[] = [
  {
    id: 'occ1',
    name: 'गणेशोत्सव २०२६',
    year: '2026',
    startDate: '2026-08-15',
    endDate: '2026-08-25',
    description: 'वार्षिक श्री गणेशोत्सव सोहळा',
  },
  {
    id: 'occ2',
    name: 'शिवजयंती सोहळा २०२६',
    year: '2026',
    startDate: '2026-02-19',
    endDate: '2026-02-19',
    description: 'छत्रपती शिवाजी महाराज जयंती उत्सव',
  },
  {
    id: 'occ3',
    name: 'आरोग्य व रक्तदान शिबीर',
    year: '2026',
    startDate: '2026-05-01',
    endDate: '2026-05-01',
    description: 'मोफत आरोग्य व रक्तदान तपासणी',
  },
];

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
