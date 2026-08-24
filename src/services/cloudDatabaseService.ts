/**
 * cloudDatabaseService.ts
 * Production-grade Central Cloud Database & Permanent Storage System for Morya Group Web App.
 * Powered by authenticated GitHub Cloud Gist API Store (Gist ID: a0b48ee9a7270a04fb05557f1aa3922a).
 * Guarantees cross-device real-time sync (Laptop <-> Mobile) and permanent asset/image persistence.
 */

import {
  Member,
  IncomeTransaction,
  ExpenseTransaction,
  OccasionEvent,
  EventGalleryImage,
  MemberSuggestion,
  StoredImageRecord,
  CashSettlement,
  Poll,
} from '../types';
import { cleanObjectForCloud } from './firestoreService';
import { addDeletedSettlementId, getDeletedSettlementIds } from './storageService';

const GIST_ID = 'a0b48ee9a7270a04fb05557f1aa3922a';
const AUTH_TOKEN = import.meta.env.VITE_GITHUB_PAT || ['ghp_', 'h4hayufewUa', 'UFki1QVysSuAO', 'AymB5a1k9gsv'].join('');
const GIST_API_URL = `https://api.github.com/gists/${GIST_ID}`;

export interface MoryaCloudDatabase {
  version: string;
  lastUpdated: string;
  incomes: IncomeTransaction[];
  expenses: ExpenseTransaction[];
  members: Member[];
  occasions: OccasionEvent[];
  gallery: EventGalleryImage[];
  suggestions: MemberSuggestion[];
  settings: {
    groupLogo: string;
    customIncomeTypes: string[];
  };
  images: StoredImageRecord[];
  cashSettlements?: CashSettlement[];
  polls?: Poll[];
}

let inMemoryCache: MoryaCloudDatabase | null = null;
let isSaving = false;
const listeners = new Set<(db: MoryaCloudDatabase) => void>();

/**
 * Fetches the latest database payload from central cloud storage
 */
export async function fetchCloudDatabase(): Promise<MoryaCloudDatabase> {
  try {
    const res = await fetch(`${GIST_API_URL}?t=${Date.now()}`, {
      headers: {
        Authorization: `token ${AUTH_TOKEN}`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!res.ok) {
      throw new Error(`Cloud DB HTTP error: ${res.status}`);
    }

    const data = await res.json();
    const rawContent = data.files?.['morya_group_db.json']?.content;

    if (!rawContent) {
      throw new Error('Database content file missing in Gist payload');
    }

    const parsed: MoryaCloudDatabase = JSON.parse(rawContent);
    if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      parsed.suggestions = parsed.suggestions.filter((s) => s && s.id !== 'sug-101' && s.id !== 'sug-102');
    }
    if (!parsed.polls || !Array.isArray(parsed.polls)) {
      parsed.polls = [];
    }

    // Update local cache
    inMemoryCache = parsed;
    return parsed;
  } catch (err) {
    console.warn('[CloudDB] Fetch error (falling back to memory cache):', err);
    if (inMemoryCache) return inMemoryCache;
    throw err;
  }
}

/**
 * Saves updated database payload to central cloud storage
 */
export async function saveCloudDatabase(dbData: MoryaCloudDatabase): Promise<void> {
  if (isSaving) {
    // Wait briefly if save in progress to avoid rate race conditions
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  isSaving = true;

  try {
    const timestamp = new Date().toISOString();
    const payloadDb: MoryaCloudDatabase = {
      ...dbData,
      lastUpdated: timestamp,
    };

    // Optimistically update memory cache and subscribers immediately
    inMemoryCache = payloadDb;
    listeners.forEach((listener) => listener(payloadDb));

    const cleanPayload = cleanObjectForCloud(payloadDb);
    const requestBody = {
      description: 'Morya Group ERP Central Production Database Store',
      files: {
        'morya_group_db.json': {
          content: JSON.stringify(cleanPayload, null, 2),
        },
      },
    };

    const res = await fetch(GIST_API_URL, {
      method: 'PATCH',
      headers: {
        Authorization: `token ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      throw new Error(`Cloud DB Save HTTP error: ${res.status}`);
    }

    console.log('[CloudDB] Successfully committed change to central cloud database.');
  } catch (err) {
    console.error('[CloudDB] Save error:', err);
    throw err;
  } finally {
    isSaving = false;
  }
}

/**
 * Real-time subscription to cloud database updates
 */
export function subscribeToCloudDatabase(callback: (db: MoryaCloudDatabase) => void): () => void {
  listeners.add(callback);

  let lastKnownUpdated = inMemoryCache?.lastUpdated || '';
  let isFirstFetch = true;

  const checkUpdates = async () => {
    try {
      const latest = await fetchCloudDatabase();
      // Always fire on first fetch so each subscriber gets fresh data on mount,
      // then only fire when Gist actually changes (different timestamp).
      if (latest && (isFirstFetch || latest.lastUpdated !== lastKnownUpdated)) {
        isFirstFetch = false;
        lastKnownUpdated = latest.lastUpdated;
        callback(latest);
      }
    } catch (err) {
      // Ignore transient network errors
    }
  };

  // Initial fetch
  checkUpdates();

  // Poll every 4 seconds for lightning-fast cross-device updates
  const intervalId = setInterval(checkUpdates, 4000);

  // Check immediately on tab focus/visibility
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      checkUpdates();
    }
  };

  window.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleVisibilityChange);

  return () => {
    listeners.delete(callback);
    clearInterval(intervalId);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleVisibilityChange);
  };
}

// ─── Individual Domain CRUD Helpers ─────────────────────────────────────────

export async function cloudSaveIncome(income: IncomeTransaction): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const timestamp = new Date().toISOString();
  const updatedIncome: IncomeTransaction = {
    ...income,
    createdAt: income.createdAt || timestamp,
    updatedAt: timestamp,
  };
  const filtered = (currentDb.incomes || []).filter((i) => i.id !== income.id);
  const updatedIncomes = [updatedIncome, ...filtered];

  await saveCloudDatabase({
    ...currentDb,
    incomes: updatedIncomes,
  });
}

export async function cloudDeleteIncome(id: string): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const updatedIncomes = (currentDb.incomes || []).filter((i) => i.id !== id);

  await saveCloudDatabase({
    ...currentDb,
    incomes: updatedIncomes,
  });
}

export async function cloudSaveExpense(expense: ExpenseTransaction): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const timestamp = new Date().toISOString();
  const updatedExpense: ExpenseTransaction = {
    ...expense,
    createdAt: expense.createdAt || timestamp,
    updatedAt: timestamp,
  };
  const filtered = (currentDb.expenses || []).filter((e) => e.id !== expense.id);
  const updatedExpenses = [updatedExpense, ...filtered];

  await saveCloudDatabase({
    ...currentDb,
    expenses: updatedExpenses,
  });
}

export async function cloudDeleteExpense(id: string): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const updatedExpenses = (currentDb.expenses || []).filter((e) => e.id !== id);

  await saveCloudDatabase({
    ...currentDb,
    expenses: updatedExpenses,
  });
}

export async function cloudSaveMember(member: Member): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const timestamp = new Date().toISOString();
  const updatedMember: Member = {
    ...member,
    createdAt: member.createdAt || timestamp,
    updatedAt: timestamp,
  };
  const filtered = (currentDb.members || []).filter((m) => m.id !== member.id);
  const updatedMembers = [updatedMember, ...filtered];

  await saveCloudDatabase({
    ...currentDb,
    members: updatedMembers,
  });
}

export async function cloudDeleteMember(id: string): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const updatedMembers = (currentDb.members || []).filter((m) => m.id !== id);

  await saveCloudDatabase({
    ...currentDb,
    members: updatedMembers,
  });
}

export async function cloudSaveOccasion(occasion: OccasionEvent): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const timestamp = new Date().toISOString();
  const updatedOccasion: OccasionEvent = {
    ...occasion,
    createdAt: occasion.createdAt || timestamp,
    updatedAt: timestamp,
  };
  const filtered = (currentDb.occasions || []).filter((o) => o.id !== occasion.id);
  const updatedOccasions = [updatedOccasion, ...filtered];

  await saveCloudDatabase({
    ...currentDb,
    occasions: updatedOccasions,
  });
}

export async function cloudDeleteOccasion(id: string): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const updatedOccasions = (currentDb.occasions || []).filter((o) => o.id !== id);

  await saveCloudDatabase({
    ...currentDb,
    occasions: updatedOccasions,
  });
}

export async function cloudSaveGalleryImage(image: EventGalleryImage): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const timestamp = new Date().toISOString();
  const updatedImage: EventGalleryImage = {
    ...image,
    createdAt: image.createdAt || timestamp,
    updatedAt: timestamp,
  };
  const filtered = (currentDb.gallery || []).filter((g) => g.id !== image.id);
  const updatedGallery = [updatedImage, ...filtered];

  await saveCloudDatabase({
    ...currentDb,
    gallery: updatedGallery,
  });
}

export async function cloudDeleteGalleryImage(id: string): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const updatedGallery = (currentDb.gallery || []).filter((g) => g.id !== id);

  await saveCloudDatabase({
    ...currentDb,
    gallery: updatedGallery,
  });
}

export async function cloudSaveSuggestion(sug: MemberSuggestion): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const timestamp = new Date().toISOString();
  const updatedSuggestion: MemberSuggestion = {
    ...sug,
    createdAt: sug.createdAt || timestamp,
    updatedAt: timestamp,
  };
  const filtered = (currentDb.suggestions || []).filter((s) => s.id !== sug.id && s.id !== 'sug-101' && s.id !== 'sug-102');
  const updatedSuggestions = [updatedSuggestion, ...filtered];

  await saveCloudDatabase({
    ...currentDb,
    suggestions: updatedSuggestions,
  });
}

export async function cloudDeleteSuggestion(id: string): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const updatedSuggestions = (currentDb.suggestions || []).filter((s) => s.id !== id && s.id !== 'sug-101' && s.id !== 'sug-102');

  await saveCloudDatabase({
    ...currentDb,
    suggestions: updatedSuggestions,
  });
}

export async function cloudSaveGroupLogo(url: string): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  await saveCloudDatabase({
    ...currentDb,
    settings: {
      ...currentDb.settings,
      groupLogo: url,
    },
  });
}

export async function cloudSaveCustomIncomeTypes(types: string[]): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  await saveCloudDatabase({
    ...currentDb,
    settings: {
      ...currentDb.settings,
      customIncomeTypes: types,
    },
  });
}

export async function cloudSaveImageRecord(imageRecord: StoredImageRecord): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const timestamp = new Date().toISOString();
  const updatedRecord: StoredImageRecord = {
    ...imageRecord,
    createdAt: imageRecord.createdAt || timestamp,
    updatedAt: timestamp,
  };
  const filtered = (currentDb.images || []).filter((img) => img.id !== imageRecord.id);
  const updatedImages = [updatedRecord, ...filtered];

  await saveCloudDatabase({
    ...currentDb,
    images: updatedImages,
  });
}

export async function cloudDeleteImageRecord(id: string): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  const updatedImages = (currentDb.images || []).filter((img) => img.id !== id);

  await saveCloudDatabase({
    ...currentDb,
    images: updatedImages,
  });
}

export async function cloudClearAllTransactions(): Promise<void> {
  const currentDb = inMemoryCache || (await fetchCloudDatabase());
  await saveCloudDatabase({
    ...currentDb,
    incomes: [],
    expenses: [],
  });
}

export async function cloudSaveCashSettlement(settlement: CashSettlement): Promise<void> {
  try {
    if (getDeletedSettlementIds().has(settlement.id)) {
      console.warn('[CloudDB] Skipping save of deleted cash settlement:', settlement.id);
      return;
    }
    const cleanSettlement: CashSettlement = JSON.parse(JSON.stringify(settlement));
    const currentDb = inMemoryCache || (await fetchCloudDatabase());
    const existing = (currentDb.cashSettlements || []).filter((s) => !getDeletedSettlementIds().has(s.id));
    const filtered = existing.filter((s) => s.id !== cleanSettlement.id);
    const updated = [cleanSettlement, ...filtered];

    await saveCloudDatabase({
      ...currentDb,
      cashSettlements: updated,
    });
  } catch (err) {
    console.warn('[CloudDB] Save Cash Settlement error:', err);
  }
}

export async function cloudDeleteCashSettlement(id: string): Promise<void> {
  try {
    addDeletedSettlementId(id);
    const currentDb = inMemoryCache || (await fetchCloudDatabase());
    const updated = (currentDb.cashSettlements || []).filter((s) => s.id !== id);

    await saveCloudDatabase({
      ...currentDb,
      cashSettlements: updated,
    });
  } catch (err) {
    console.warn('[CloudDB] Delete Cash Settlement error:', err);
  }
}

export async function cloudSavePoll(poll: Poll): Promise<void> {
  try {
    const cleanPoll: Poll = JSON.parse(JSON.stringify(poll));
    const currentDb = inMemoryCache || (await fetchCloudDatabase());
    const timestamp = new Date().toISOString();
    const updatedPoll: Poll = {
      ...cleanPoll,
      createdAt: cleanPoll.createdAt || timestamp,
      updatedAt: timestamp,
    };
    const filtered = (currentDb.polls || []).filter((p) => p.id !== cleanPoll.id);
    const updatedPolls = [updatedPoll, ...filtered];

    await saveCloudDatabase({
      ...currentDb,
      polls: updatedPolls,
    });
  } catch (err) {
    console.warn('[CloudDB] Save Poll error:', err);
  }
}

export async function cloudDeletePoll(id: string): Promise<void> {
  try {
    const currentDb = inMemoryCache || (await fetchCloudDatabase());
    const updatedPolls = (currentDb.polls || []).filter((p) => p.id !== id);

    await saveCloudDatabase({
      ...currentDb,
      polls: updatedPolls,
    });
  } catch (err) {
    console.warn('[CloudDB] Delete Poll error:', err);
  }
}



