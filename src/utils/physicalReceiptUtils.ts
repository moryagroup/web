/**
 * physicalReceiptUtils.ts
 * Helper utilities for Physical Receipt Books (प्रत्यक्ष पावती पुस्तक नोंद)
 * Tracks Book No (1, 2, 3...) and Sequential Leaf/Serial No (1, 2, 3, 4...)
 */

import { IncomeTransaction } from '../types';

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
 * Formats a clean, readable receipt number from Book No and Serial No
 */
export function formatPhysicalReceiptNumber(
  bookNo: string,
  serialNo: string | number
): string {
  const b = bookNo.trim() || '1';
  const s = String(serialNo).trim() || '1';
  return `पुस्तक क्र. ${b} / पावती क्र. ${s}`;
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
