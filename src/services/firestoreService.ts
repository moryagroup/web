/**
 * firestoreService.ts
 * Production-grade Firestore read/write operations with real-time onSnapshot synchronization.
 * Persistent cross-device state management without data loss on deployment.
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import {
  Member,
  IncomeTransaction,
  ExpenseTransaction,
  OccasionEvent,
  EventGalleryImage,
  MemberSuggestion,
  CashSettlement,
  Poll,
} from '../types';
import { AppNotification } from '../types/notification';
import {
  INITIAL_MEMBERS,
  INITIAL_OCCASIONS,
  INITIAL_EVENT_GALLERY,
  INITIAL_SUGGESTIONS,
  INITIAL_POLLS,
} from '../mockData';
import { getDeletedPollIds, addDeletedPollId } from './storageService';

// ─── Collection names ────────────────────────────────────────────────────────
const COLS = {
  incomes: 'incomes',
  expenses: 'expenses',
  members: 'members',
  occasions: 'occasions',
  gallery: 'gallery',
  suggestions: 'suggestions',
  settings: 'settings',
  cash_settlements: 'cash_settlements',
  polls: 'polls',
  notifications: 'notifications',
};

// ─── Non-Destructive Seed Helper ─────────────────────────────────────────────
async function seedIfEmpty<T extends { id: string }>(
  colName: string,
  initial: T[]
): Promise<void> {
  try {
    const snap = await getDocs(collection(db, colName));
    if (snap.empty && initial.length > 0) {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      initial.forEach((item) => {
        const itemWithTimestamps = {
          ...item,
          createdAt: (item as any).createdAt || timestamp,
          updatedAt: timestamp,
        };
        batch.set(doc(db, colName, item.id), itemWithTimestamps);
      });
      await batch.commit();
      console.log(`[Firestore] Non-destructive initial seed for ${colName}: ${initial.length} items.`);
    }
  } catch (err) {
    console.warn(`[Firestore] Seed check skipped for ${colName}:`, err);
  }
}

export async function seedAllCollections(): Promise<void> {
  try {
    // Non-destructive seeding: ONLY populates if collection is completely empty
    await Promise.all([
      seedIfEmpty(COLS.members, INITIAL_MEMBERS),
      seedIfEmpty(COLS.occasions, INITIAL_OCCASIONS),
      seedIfEmpty(COLS.gallery, INITIAL_EVENT_GALLERY),
      seedIfEmpty(COLS.polls, INITIAL_POLLS),
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
      data.sort((a, b) => ((b.updatedAt || b.createdAt) > (a.updatedAt || a.createdAt) ? 1 : -1));
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
      data.sort((a, b) => ((b.updatedAt || b.createdAt) > (a.updatedAt || a.createdAt) ? 1 : -1));
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
      data.sort((a, b) => ((b.updatedAt || b.createdAt || '') > (a.updatedAt || a.createdAt || '') ? 1 : -1));
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
      // Clean up legacy mock suggestions from Firestore if present
      snap.docs.forEach((d) => {
        if (d.id === 'sug-101' || d.id === 'sug-102') {
          deleteDoc(d.ref).catch(() => {});
        }
      });
      const data = snap.docs
        .map((d) => d.data() as MemberSuggestion)
        .filter((s) => s && s.id !== 'sug-101' && s.id !== 'sug-102');
      data.sort((a, b) => ((b.updatedAt || b.createdAt) > (a.updatedAt || a.createdAt) ? 1 : -1));
      callback(data);
    },
    (err) => console.warn('[Firestore] subscribeToSuggestions error:', err)
  );
}

export function subscribeToPolls(
  callback: (data: Poll[]) => void
): () => void {
  return onSnapshot(
    collection(db, COLS.polls),
    (snap) => {
      const deletedIds = getDeletedPollIds();
      const data = snap.docs
        .map((d) => d.data() as Poll)
        .filter((p) => p && p.id && !deletedIds.has(p.id));
      data.sort((a, b) => ((b.updatedAt || b.createdAt) > (a.updatedAt || a.createdAt) ? 1 : -1));
      callback(data);
    },
    (err) => console.warn('[Firestore] subscribeToPolls error:', err)
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

export function subscribeToCashSettlements(
  callback: (data: CashSettlement[]) => void
): () => void {
  return onSnapshot(
    doc(db, COLS.settings, 'cashSettlements'),
    (snap) => {
      const data = snap.data();
      if (data?.list && Array.isArray(data.list)) {
        callback(data.list);
      }
    },
    (err) => console.warn('[Firestore] subscribeToCashSettlements error:', err)
  );
}

// Helper to recursively normalize undefined properties to 'नमूद नाही' (or remove) for Firestore & Cloud compatibility
export function cleanObjectForCloud<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanObjectForCloud(item)) as any;
  }
  const clean: any = {};
  Object.keys(obj as any).forEach((key) => {
    const value = (obj as any)[key];
    if (value === undefined) {
      if (['notes', 'bankRefNo', 'billNumber', 'paymentReference', 'obstacleDetails', 'address'].includes(key)) {
        clean[key] = 'नमूद नाही';
      }
    } else {
      clean[key] = cleanObjectForCloud(value);
    }
  });
  return clean;
}

// ─── Write helpers with Audit Timestamps ─────────────────────────────────────

export async function saveCashSettlement(settlement: CashSettlement): Promise<void> {
  const timestamp = new Date().toISOString();
  const payload: CashSettlement = {
    ...settlement,
    createdAt: settlement.createdAt || timestamp,
    updatedAt: timestamp,
  };
  try {
    const snap = await getDoc(doc(db, COLS.settings, 'cashSettlements'));
    const currentList: CashSettlement[] = snap.exists() && Array.isArray(snap.data()?.list) ? snap.data()?.list : [];
    const filtered = currentList.filter((s) => s.id !== payload.id);
    const updated = [cleanObjectForCloud(payload), ...filtered];
    await setDoc(doc(db, COLS.settings, 'cashSettlements'), { list: updated });
  } catch (err) {
    console.warn('[Firestore] saveCashSettlement error:', err);
  }
}

export async function deleteCashSettlement(id: string): Promise<void> {
  try {
    const snap = await getDoc(doc(db, COLS.settings, 'cashSettlements'));
    if (snap.exists() && Array.isArray(snap.data()?.list)) {
      const updated = snap.data().list.filter((s: CashSettlement) => s.id !== id);
      await setDoc(doc(db, COLS.settings, 'cashSettlements'), { list: updated });
    }
  } catch (err) {
    console.warn('[Firestore] deleteCashSettlement error:', err);
  }
}

export async function saveIncome(income: IncomeTransaction): Promise<void> {
  const timestamp = new Date().toISOString();
  const payload: IncomeTransaction = {
    ...income,
    createdAt: income.createdAt || timestamp,
    updatedAt: timestamp,
  };
  await setDoc(doc(db, COLS.incomes, income.id), cleanObjectForCloud(payload));
}

export async function deleteIncome(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.incomes, id));
}

export async function saveExpense(expense: ExpenseTransaction): Promise<void> {
  const timestamp = new Date().toISOString();
  const payload: ExpenseTransaction = {
    ...expense,
    createdAt: expense.createdAt || timestamp,
    updatedAt: timestamp,
  };
  await setDoc(doc(db, COLS.expenses, expense.id), cleanObjectForCloud(payload));
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.expenses, id));
}

export async function saveMember(member: Member): Promise<void> {
  const timestamp = new Date().toISOString();
  const payload: Member = {
    ...member,
    createdAt: member.createdAt || timestamp,
    updatedAt: timestamp,
  };
  await setDoc(doc(db, COLS.members, member.id), cleanObjectForCloud(payload));
}

export async function deleteMember(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.members, id));
}

export async function saveOccasion(occasion: OccasionEvent): Promise<void> {
  const timestamp = new Date().toISOString();
  const payload: OccasionEvent = {
    ...occasion,
    createdAt: occasion.createdAt || timestamp,
    updatedAt: timestamp,
  };
  await setDoc(doc(db, COLS.occasions, occasion.id), cleanObjectForCloud(payload));
}

export async function deleteOccasion(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.occasions, id));
}

export async function saveGalleryImage(image: EventGalleryImage): Promise<void> {
  const timestamp = new Date().toISOString();
  const payload: EventGalleryImage = {
    ...image,
    createdAt: image.createdAt || timestamp,
    updatedAt: timestamp,
  };
  await setDoc(doc(db, COLS.gallery, image.id), cleanObjectForCloud(payload));
}

export async function deleteGalleryImage(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.gallery, id));
}

export async function saveSuggestion(sug: MemberSuggestion): Promise<void> {
  const timestamp = new Date().toISOString();
  const payload: MemberSuggestion = {
    ...sug,
    createdAt: sug.createdAt || timestamp,
    updatedAt: timestamp,
  };
  await setDoc(doc(db, COLS.suggestions, sug.id), cleanObjectForCloud(payload));
}

export async function deleteSuggestion(id: string): Promise<void> {
  await deleteDoc(doc(db, COLS.suggestions, id));
}

export async function savePoll(poll: Poll): Promise<void> {
  if (getDeletedPollIds().has(poll.id)) {
    console.warn('[Firestore] Skipping save of deleted poll:', poll.id);
    return;
  }
  const timestamp = new Date().toISOString();
  const payload: Poll = {
    ...poll,
    createdAt: poll.createdAt || timestamp,
    updatedAt: timestamp,
  };
  await setDoc(doc(db, COLS.polls, poll.id), cleanObjectForCloud(payload));
}

export async function deletePoll(id: string): Promise<void> {
  addDeletedPollId(id);
  await deleteDoc(doc(db, COLS.polls, id));
}

export async function saveGroupLogo(url: string): Promise<void> {
  await setDoc(doc(db, COLS.settings, 'groupLogo'), { url, updatedAt: new Date().toISOString() });
}

export async function saveCustomIncomeTypes(types: string[]): Promise<void> {
  await setDoc(doc(db, COLS.settings, 'customIncomeTypes'), { types, updatedAt: new Date().toISOString() });
}

export async function saveOfficerSignatureToFirestore(signature: {
  role: 'खजिनदार' | 'उपखजिनदार' | 'अध्यक्ष' | 'सचिव';
  officerName: string;
  signatureDataUrl: string;
  updatedAt: string;
}): Promise<void> {
  const docId = signature.role === 'खजिनदार' ? 'signature_treasurer' : 'signature_vice_treasurer';
  await setDoc(doc(db, COLS.settings, docId), signature);
}

export async function deleteOfficerSignatureFromFirestore(role: 'खजिनदार' | 'उपखजिनदार'): Promise<void> {
  const docId = role === 'खजिनदार' ? 'signature_treasurer' : 'signature_vice_treasurer';
  await deleteDoc(doc(db, COLS.settings, docId));
}

export async function fetchOfficerSignaturesFromFirestore(): Promise<{
  treasurer: any | null;
  viceTreasurer: any | null;
}> {
  try {
    const treasurerSnap = await getDoc(doc(db, COLS.settings, 'signature_treasurer'));
    const viceTreasurerSnap = await getDoc(doc(db, COLS.settings, 'signature_vice_treasurer'));
    return {
      treasurer: treasurerSnap.exists() ? treasurerSnap.data() : null,
      viceTreasurer: viceTreasurerSnap.exists() ? viceTreasurerSnap.data() : null,
    };
  } catch (err) {
    console.warn('[Firestore] fetchOfficerSignatures error:', err);
    return { treasurer: null, viceTreasurer: null };
  }
}

export async function resetFirestoreToDemo(): Promise<void> {
  const batch = writeBatch(db);

  const resetCol = async (colName: string, items: { id: string }[]) => {
    const snap = await getDocs(collection(db, colName));
    snap.docs.forEach((d) => batch.delete(d.ref));
    items.forEach((item) => batch.set(doc(db, colName, item.id), item));
  };

  await Promise.all([
    resetCol(COLS.members, INITIAL_MEMBERS),
    resetCol(COLS.occasions, INITIAL_OCCASIONS),
    resetCol(COLS.gallery, INITIAL_EVENT_GALLERY),
    resetCol(COLS.suggestions, INITIAL_SUGGESTIONS),
  ]);

  await batch.commit();
}

// ─── Real-Time Notifications Synchronization ─────────────────────────────────

export function subscribeToNotificationsFirestore(
  callback: (data: AppNotification[]) => void
): () => void {
  return onSnapshot(
    collection(db, COLS.notifications),
    (snap) => {
      const data = snap.docs.map((d) => d.data() as AppNotification);
      data.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
      callback(data);
    },
    (err) => console.warn('[Firestore] subscribeToNotifications error:', err)
  );
}

export async function saveNotificationFirestore(notif: AppNotification): Promise<void> {
  try {
    await setDoc(doc(db, COLS.notifications, notif.id), cleanObjectForCloud(notif));
  } catch (err) {
    console.warn('[Firestore] saveNotificationFirestore error:', err);
  }
}

export async function deleteNotificationFirestore(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLS.notifications, id));
  } catch (err) {
    console.warn('[Firestore] deleteNotificationFirestore error:', err);
  }
}

export async function clearAllNotificationsFirestore(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, COLS.notifications));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    console.warn('[Firestore] clearAllNotificationsFirestore error:', err);
  }
}

export async function markNotificationAsReadFirestore(id: string): Promise<void> {
  try {
    await setDoc(doc(db, COLS.notifications, id), { isRead: true }, { merge: true });
  } catch (err) {
    console.warn('[Firestore] markNotificationAsReadFirestore error:', err);
  }
}

export async function markAllNotificationsAsReadFirestore(ids: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    ids.forEach((id) => {
      batch.set(doc(db, COLS.notifications, id), { isRead: true }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn('[Firestore] markAllNotificationsAsReadFirestore error:', err);
  }
}

// ─── Manual Admin Transaction Wipe Utility (Explicit Admin Action Only) ─────
export async function clearAllTransactionsFromFirestore(): Promise<void> {
  try {
    const batch = writeBatch(db);
    const incomeSnap = await getDocs(collection(db, COLS.incomes));
    incomeSnap.docs.forEach((d) => batch.delete(d.ref));

    const expenseSnap = await getDocs(collection(db, COLS.expenses));
    expenseSnap.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();
    console.log('[Firestore] Explicit admin transaction wipe executed.');
  } catch (err) {
    console.warn('[Firestore] clearAllTransactionsFromFirestore error:', err);
  }
}
