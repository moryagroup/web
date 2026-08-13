/**
 * firestoreService.ts
 * All Firestore read/write operations — replaces localStorage.
 * Provides real-time listeners (onSnapshot) for live cross-device sync.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import {
  Member,
  IncomeTransaction,
  ExpenseTransaction,
  OccasionEvent,
  EventGalleryImage,
  MemberSuggestion,
} from '../types';
import {
  INITIAL_MEMBERS,
  INITIAL_INCOMES,
  INITIAL_EXPENSES,
  INITIAL_OCCASIONS,
  INITIAL_EVENT_GALLERY,
  INITIAL_SUGGESTIONS,
} from '../mockData';

// ─── Collection names ────────────────────────────────────────────────────────
const COLS = {
  incomes: 'incomes',
  expenses: 'expenses',
  members: 'members',
  occasions: 'occasions',
  gallery: 'gallery',
  suggestions: 'suggestions',
  settings: 'settings',
};

// ─── Seed helpers (runs once per collection if empty in Firestore) ───────────
async function seedIfEmpty<T extends { id: string }>(
  colName: string,
  initial: T[]
): Promise<void> {
  try {
    const snap = await getDocs(collection(db, colName));
    if (snap.empty) {
      const batch = writeBatch(db);
      initial.forEach((item) => {
        batch.set(doc(db, colName, item.id), item);
      });
      await batch.commit();
      console.log(`[Firestore] Initialized ${colName} collection with ${initial.length} items.`);
    }
  } catch (err) {
    console.warn(`[Firestore] Seed skipped for ${colName}:`, err);
  }
}

export async function seedAllCollections(): Promise<void> {
  try {
    await Promise.all([
      seedIfEmpty(COLS.incomes, INITIAL_INCOMES),
      seedIfEmpty(COLS.expenses, INITIAL_EXPENSES),
      seedIfEmpty(COLS.members, INITIAL_MEMBERS),
      seedIfEmpty(COLS.occasions, INITIAL_OCCASIONS),
      seedIfEmpty(COLS.gallery, INITIAL_EVENT_GALLERY),
      seedIfEmpty(COLS.suggestions, INITIAL_SUGGESTIONS),
    ]);
  } catch (err) {
    console.warn('[Firestore] seedAllCollections error:', err);
  }
}

// ─── Real-time listeners ─────────────────────────────────────────────────────

export function subscribeToIncomes(
  callback: (data: IncomeTransaction[]) => void
): () => void {
  return onSnapshot(
    collection(db, COLS.incomes),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as IncomeTransaction);
      data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      callback(data);
    },
    (err) => console.warn('[Firestore] subscribeToIncomes error:', err)
  );
}

export function subscribeToExpenses(
  callback: (data: ExpenseTransaction[]) => void
): () => void {
  return onSnapshot(
    collection(db, COLS.expenses),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as ExpenseTransaction);
      data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      callback(data);
    },
    (err) => console.warn('[Firestore] subscribeToExpenses error:', err)
  );
}

export function subscribeToMembers(
  callback: (data: Member[]) => void
): () => void {
  return onSnapshot(
    collection(db, COLS.members),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as Member);
      data.sort((a, b) => (a.memberCode || '').localeCompare(b.memberCode || ''));
      callback(data);
    },
    (err) => console.warn('[Firestore] subscribeToMembers error:', err)
  );
}

export function subscribeToOccasions(
  callback: (data: OccasionEvent[]) => void
): () => void {
  return onSnapshot(
    collection(db, COLS.occasions),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as OccasionEvent);
      callback(data);
    },
    (err) => console.warn('[Firestore] subscribeToOccasions error:', err)
  );
}

export function subscribeToGallery(
  callback: (data: EventGalleryImage[]) => void
): () => void {
  return onSnapshot(
    collection(db, COLS.gallery),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as EventGalleryImage);
      callback(data);
    },
    (err) => console.warn('[Firestore] subscribeToGallery error:', err)
  );
}

export function subscribeToSuggestions(
  callback: (data: MemberSuggestion[]) => void
): () => void {
  return onSnapshot(
    collection(db, COLS.suggestions),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as MemberSuggestion);
      data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      callback(data);
    },
    (err) => console.warn('[Firestore] subscribeToSuggestions error:', err)
  );
}

export function subscribeToGroupLogo(
  callback: (logo: string) => void
): () => void {
  return onSnapshot(
    doc(db, COLS.settings, 'groupLogo'),
    (snap) => {
      const data = snap.data();
      if (data?.url) callback(data.url);
    },
    (err) => console.warn('[Firestore] subscribeToGroupLogo error:', err)
  );
}

export function subscribeToCustomIncomeTypes(
  callback: (types: string[]) => void
): () => void {
  return onSnapshot(
    doc(db, COLS.settings, 'customIncomeTypes'),
    (snap) => {
      const data = snap.data();
      if (data?.types && Array.isArray(data.types)) {
        callback(data.types);
      } else {
        callback([]);
      }
    },
    (err) => console.warn('[Firestore] subscribeToCustomIncomeTypes error:', err)
  );
}

// ─── Write helpers ───────────────────────────────────────────────────────────

export async function saveIncome(income: IncomeTransaction): Promise<void> {
  await setDoc(doc(db, COLS.incomes, income.id), income);
}

export async function deleteIncome(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.incomes, id));
}

export async function saveExpense(expense: ExpenseTransaction): Promise<void> {
  await setDoc(doc(db, COLS.expenses, expense.id), expense);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.expenses, id));
}

export async function saveMember(member: Member): Promise<void> {
  await setDoc(doc(db, COLS.members, member.id), member);
}

export async function deleteMember(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.members, id));
}

export async function saveOccasion(occasion: OccasionEvent): Promise<void> {
  await setDoc(doc(db, COLS.occasions, occasion.id), occasion);
}

export async function deleteOccasion(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.occasions, id));
}

export async function saveGalleryImage(image: EventGalleryImage): Promise<void> {
  await setDoc(doc(db, COLS.gallery, image.id), image);
}

export async function deleteGalleryImage(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.gallery, id));
}

export async function saveSuggestion(sug: MemberSuggestion): Promise<void> {
  await setDoc(doc(db, COLS.suggestions, sug.id), sug);
}

export async function saveGroupLogo(url: string): Promise<void> {
  await setDoc(doc(db, COLS.settings, 'groupLogo'), { url });
}

export async function saveCustomIncomeTypes(types: string[]): Promise<void> {
  await setDoc(doc(db, COLS.settings, 'customIncomeTypes'), { types });
}

// ─── Reset to demo data ───────────────────────────────────────────────────────
export async function resetFirestoreToDemo(): Promise<void> {
  const batch = writeBatch(db);

  // Helper to reset a collection
  const resetCol = async (colName: string, items: { id: string }[]) => {
    const snap = await getDocs(collection(db, colName));
    snap.docs.forEach((d) => batch.delete(d.ref));
    items.forEach((item) => batch.set(doc(db, colName, item.id), item));
  };

  await Promise.all([
    resetCol(COLS.incomes, INITIAL_INCOMES),
    resetCol(COLS.expenses, INITIAL_EXPENSES),
    resetCol(COLS.members, INITIAL_MEMBERS),
    resetCol(COLS.occasions, INITIAL_OCCASIONS),
    resetCol(COLS.gallery, INITIAL_EVENT_GALLERY),
    resetCol(COLS.suggestions, INITIAL_SUGGESTIONS),
  ]);

  await batch.commit();
}

export async function clearAllTransactionsFromFirestore(): Promise<void> {
  try {
    const batch = writeBatch(db);
    const incomeSnap = await getDocs(collection(db, COLS.incomes));
    incomeSnap.docs.forEach((d) => batch.delete(d.ref));

    const expenseSnap = await getDocs(collection(db, COLS.expenses));
    expenseSnap.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();
  } catch (err) {
    console.warn('[Firestore] clearAllTransactionsFromFirestore error:', err);
  }
}
