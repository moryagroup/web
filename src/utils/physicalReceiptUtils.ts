/**
 * physicalReceiptUtils.ts
 * Helper utilities for Physical Receipt Books (प्रत्यक्ष पावती पुस्तक नोंद)
 * Tracks Book No (1, 2, 3...) and Sequential Leaf/Serial No (1, 2, 3, 4...)
 */

import { IncomeTransaction } from '../types';

export interface DuplicateReceiptCheckResult {
  isDuplicate: boolean;
  existingIncome?: IncomeTransaction;
}

/**
 * Finds the highest serial number used for a specific physical receipt book number and returns the next one.
 */
export function getNextSerialForReceiptBook(
  bookNo: string,
  incomes: IncomeTransaction[] = []
): number {
  if (!bookNo || !incomes || incomes.length === 0) return 1;

  const cleanBook = bookNo.trim();
  let maxSerial = 0;

  incomes.forEach((i) => {
    if (i.receiptBookNo && i.receiptBookNo.trim() === cleanBook) {
      const num = parseInt(i.receiptSerialNo || '0', 10);
      if (!isNaN(num) && num > maxSerial) {
        maxSerial = num;
      }
    } else if (i.receiptNumber && i.receiptNumber.includes(`पुस्तक ${cleanBook}`)) {
      const match = i.receiptNumber.match(/पावती\s*(?:क्र\.?|#)?\s*(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSerial) {
          maxSerial = num;
        }
      }
    }
  });

  return maxSerial + 1;
}

/**
 * Checks if a given Book No and Serial No has already been entered in the database.
 */
export function isPhysicalReceiptDuplicate(
  bookNo: string,
  serialNo: string | number,
  incomes: IncomeTransaction[] = [],
  excludeIncomeId?: string
): DuplicateReceiptCheckResult {
  if (!bookNo || !serialNo || !incomes || incomes.length === 0) {
    return { isDuplicate: false };
  }

  const cleanBook = bookNo.trim();
  const targetSerial = parseInt(String(serialNo).trim(), 10);
  if (isNaN(targetSerial) || targetSerial <= 0) {
    return { isDuplicate: false };
  }

  const found = incomes.find((i) => {
    if (excludeIncomeId && i.id === excludeIncomeId) return false;

    // Check direct receiptBookNo and receiptSerialNo match
    if (i.receiptBookNo && i.receiptBookNo.trim() === cleanBook) {
      const s = parseInt(i.receiptSerialNo || '0', 10);
      if (!isNaN(s) && s === targetSerial) return true;
    }

    // Also check formatted receiptNumber e.g. "पुस्तक क्र. 1 / पावती क्र. 300"
    if (i.receiptNumber) {
      const match = i.receiptNumber.match(/पुस्तक\s*(?:क्र\.?|#)?\s*(\d+)\s*\/\s*पावती\s*(?:क्र\.?|#)?\s*(\d+)/i);
      if (match) {
        const b = match[1].trim();
        const s = parseInt(match[2].trim(), 10);
        if (b === cleanBook && s === targetSerial) return true;
      }
    }

    return false;
  });

  return {
    isDuplicate: Boolean(found),
    existingIncome: found,
  };
}

/**
 * Formats a clean, readable receipt number from Book No and Serial No (e.g. 1-304)
 */
export function formatPhysicalReceiptNumber(
  bookNo: string,
  serialNo: string | number
): string {
  const b = bookNo ? bookNo.trim() : '1';
  const s = String(serialNo).trim() || '1';
  return `${b}-${s}`;
}

/**
 * Formats ultra-compact receipt number display (e.g. 1-304 or 1-341)
 */
export function formatCompactReceiptDisplay(item: {
  isPhysicalReceipt?: boolean;
  receiptBookNo?: string;
  receiptSerialNo?: string;
  receiptNumber?: string;
  transactionNo?: string;
}): string {
  if (item.receiptBookNo && item.receiptSerialNo) {
    return `${item.receiptBookNo.trim()}-${item.receiptSerialNo.trim()}`;
  }

  if (item.receiptNumber) {
    const raw = item.receiptNumber;
    // Extract digit sequences (e.g. "पुस्तक क्र. 1 / पावती क्र. 304" -> ["1", "304"])
    const matches = raw.match(/\d+/g);
    if (matches && matches.length >= 2) {
      return `${matches[0]}-${matches[1]}`;
    } else if (matches && matches.length === 1) {
      const b = item.receiptBookNo ? item.receiptBookNo.trim() : '1';
      return `${b}-${matches[0]}`;
    }
    return raw.replace(/^(?:पावती|पुस्तक)\s*(?:क्र\.?|#)?\s*/g, '').trim();
  }

  if (item.receiptSerialNo) {
    const b = item.receiptBookNo ? item.receiptBookNo.trim() : '1';
    return `${b}-${item.receiptSerialNo.trim()}`;
  }

  if (item.transactionNo) {
    return item.transactionNo;
  }

  return '—';
}

/**
 * Extracts unique physical receipt books used in history
 */
export function getUniqueReceiptBooks(incomes: IncomeTransaction[] = []): string[] {
  const books = new Set<string>();
  incomes.forEach((i) => {
    if (i.receiptBookNo && i.receiptBookNo.trim()) {
      books.add(i.receiptBookNo.trim());
    }
  });
  return Array.from(books).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}
