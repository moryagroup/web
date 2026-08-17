import { IncomeTransaction, ExpenseTransaction, Member, OccasionEvent, EventGalleryImage } from '../types';
import { STORAGE_KEYS } from '../services/storageService';

export interface MoryaBackupData {
  version: string;
  timestamp: string;
  appVersion: string;
  incomes: IncomeTransaction[];
  expenses: ExpenseTransaction[];
  members: Member[];
  occasions: OccasionEvent[];
  gallery: EventGalleryImage[];
  customIncomeTypes: string[];
  groupLogo?: string;
}

/**
 * Creates an automatic snapshot backup of all local data into LocalStorage
 */
export function createLocalBackupSnapshot(
  incomes?: IncomeTransaction[],
  expenses?: ExpenseTransaction[],
  members?: Member[],
  occasions?: OccasionEvent[],
  gallery?: EventGalleryImage[],
  customTypes?: string[],
  groupLogo?: string
): void {
  try {
    const backupObj: MoryaBackupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      appVersion: '2026.1',
      incomes: incomes || getLocalStorageJSON(STORAGE_KEYS.INCOMES, []),
      expenses: expenses || getLocalStorageJSON(STORAGE_KEYS.EXPENSES, []),
      members: members || getLocalStorageJSON(STORAGE_KEYS.MEMBERS, []),
      occasions: occasions || getLocalStorageJSON(STORAGE_KEYS.OCCASIONS, []),
      gallery: gallery || getLocalStorageJSON(STORAGE_KEYS.EVENT_GALLERY, []),
      customIncomeTypes: customTypes || getLocalStorageJSON(STORAGE_KEYS.CUSTOM_INCOME_TYPES, []),
      groupLogo: groupLogo || localStorage.getItem(STORAGE_KEYS.GROUP_LOGO) || undefined,
    };

    localStorage.setItem('morya_group_backup_latest', JSON.stringify(backupObj));

    // Maintain up to 5 history snapshots
    const historyRaw = localStorage.getItem('morya_group_backup_history');
    let historyList: { timestamp: string; count: number }[] = [];
    if (historyRaw) {
      try {
        historyList = JSON.parse(historyRaw);
      } catch {
        historyList = [];
      }
    }
    historyList.unshift({
      timestamp: backupObj.timestamp,
      count:
        backupObj.incomes.length +
        backupObj.expenses.length +
        backupObj.members.length +
        backupObj.occasions.length,
    });
    if (historyList.length > 5) historyList = historyList.slice(0, 5);
    localStorage.setItem('morya_group_backup_history', JSON.stringify(historyList));
  } catch (err) {
    console.error('Failed to create local snapshot backup:', err);
  }
}

/**
 * Generates and downloads a full JSON backup file to user's computer
 */
export function downloadBackupJSON(
  incomes: IncomeTransaction[],
  expenses: ExpenseTransaction[],
  members: Member[],
  occasions: OccasionEvent[],
  gallery: EventGalleryImage[],
  customTypes: string[],
  groupLogo?: string
): void {
  const backupObj: MoryaBackupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    appVersion: '2026.1',
    incomes,
    expenses,
    members,
    occasions,
    gallery,
    customIncomeTypes: customTypes,
    groupLogo,
  };

  const jsonStr = JSON.stringify(backupObj, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `MoryaGroup_FullBackup_${dateStr}_${Date.now()}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getLocalStorageJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
