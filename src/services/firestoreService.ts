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

// ─── Seed helpers (run once if collection is empty) ──────────────────────────
async function seedIfEmpty<T extends { id: string }>(
  colName: string,
  initial: T[]
): Promise<void> {
  const snap = await getDocs(collection(db, colName));
  if (snap.empty) {
    const batch = writeBatch(db);
    initial.forEach((item) => {
      batch.set(doc(db, colName, item.id), item);
    });
    await batch.commit();
  }
}

export async function seedAllCollections(): Promise<void> {
  await Promise.all([
    seedIfEmpty(COLS.incomes, INITIAL_INCOMES),
    seedIfEmpty(COLS.expenses, INITIAL_EXPENSES),
    seedIfEmpty(COLS.members, INITIAL_MEMBERS),
    seedIfEmpty(COLS.occasions, INITIAL_OCCASIONS),
    seedIfEmpty(COLS.gallery, INITIAL_EVENT_GALLERY),
    seedIfEmpty(COLS.suggestions, INITIAL_SUGGESTIONS),
  ]);
}

// ─── Real-time listeners ─────────────────────────────────────────────────────

export function subscribeToIncomes(
  callback: (data: IncomeTransaction[]) => void
): () => void {
  return onSnapshot(collection(db, COLS.incomes), (snap) => {
    const data = snap.docs.map((d) => d.data() as IncomeTransaction);
    // Sort by createdAt descending
    data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    callback(data);
  });
}

export function subscribeToExpenses(
  callback: (data: ExpenseTransaction[]) => void
): () => void {
  return onSnapshot(collection(db, COLS.expenses), (snap) => {
    const data = snap.docs.map((d) => d.data() as ExpenseTransaction);
    data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    callback(data);
  });
}

export function subscribeToMembers(
  callback: (data: Member[]) => void
): () => void {
  return onSnapshot(collection(db, COLS.members), (snap) => {
    const data = snap.docs.map((d) => d.data() as Member);
    data.sort((a, b) => a.memberCode.localeCompare(b.memberCode));
    callback(data);
  });
}

export function subscribeToOccasions(
  callback: (data: OccasionEvent[]) => void
): () => void {
  return onSnapshot(collection(db, COLS.occasions), (snap) => {
    const data = snap.docs.map((d) => d.data() as OccasionEvent);
    callback(data);
  });
}

export function subscribeToGallery(
  callback: (data: EventGalleryImage[]) => void
): () => void {
  return onSnapshot(collection(db, COLS.gallery), (snap) => {
    const data = snap.docs.map((d) => d.data() as EventGalleryImage);
    callback(data);
  });
}

export function subscribeToSuggestions(
  callback: (data: MemberSuggestion[]) => void
): () => void {
  return onSnapshot(collection(db, COLS.suggestions), (snap) => {
    const data = snap.docs.map((d) => d.data() as MemberSuggestion);
    data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    callback(data);
  });
}

export function subscribeToGroupLogo(
  callback: (logo: string) => void
): () => void {
  return onSnapshot(doc(db, COLS.settings, 'groupLogo'), (snap) => {
    const data = snap.data();
    callback(data?.url || '');
  });
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
