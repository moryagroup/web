/**
 * Date and Year utility helpers for Morya Group Web Application
 * Handles Marathi/English numeral conversions, Calendar Year (Jan 1 - Dec 31) matching,
 * and Financial Year (Apr 1 - Mar 31) conversions.
 */

export const CALENDAR_YEAR_OPTIONS = ['२०२६', '२०२५', '२०२४', '२०२७'];
export const FINANCIAL_YEAR_OPTIONS = ['२०२६-२७', '२०२५-२६', '२०२४-२५'];

const MARATHI_TO_ENGLISH_DIGITS: Record<string, string> = {
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
};

const ENGLISH_TO_MARATHI_DIGITS: Record<string, string> = {
  '0': '०',
  '1': '१',
  '2': '२',
  '3': '३',
  '4': '४',
  '5': '५',
  '6': '६',
  '7': '७',
  '8': '८',
  '9': '९',
};

/**
 * Converts any Marathi digit string to English digits (e.g. '२०२६' -> '2026')
 */
export function convertMarathiToEnglishDigits(str: string): string {
  if (!str) return '';
  return str.replace(/[०-९]/g, (digit) => MARATHI_TO_ENGLISH_DIGITS[digit] || digit);
}

/**
 * Converts English digits to Marathi digits (e.g. '2026' -> '२०२६')
 */
export function convertEnglishToMarathiDigits(str: string | number): string {
  const strVal = String(str);
  return strVal.replace(/[0-9]/g, (digit) => ENGLISH_TO_MARATHI_DIGITS[digit] || digit);
}

/**
 * Extracts a 4-digit year number from string (e.g. '२०२६', '2026', '२०२६-२७', '2026-2027')
 */
export function parseYearNumber(yearStr: string): number {
  if (!yearStr) return new Date().getFullYear();
  const converted = convertMarathiToEnglishDigits(yearStr);
  const match = converted.match(/\d{4}/);
  return match ? parseInt(match[0], 10) : new Date().getFullYear();
}

/**
 * Derives Calendar Year in Marathi format (e.g. '2026-08-15' -> '२०२६')
 */
export function getCalendarYearFromDate(dateStr?: string): string {
  if (!dateStr) return convertEnglishToMarathiDigits(new Date().getFullYear());
  const dateObj = new Date(dateStr);
  const year = isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear();
  return convertEnglishToMarathiDigits(year);
}

/**
 * Derives Indian Financial Year string from Date (e.g., '2026-08-15' -> '२०२६-२७', '2026-02-10' -> '२०२५-२६')
 */
export function getFinancialYearFromDate(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-indexed
    const startYear = month >= 4 ? year : year - 1;
    const endYearShort = String(startYear + 1).slice(-2);
    return `${convertEnglishToMarathiDigits(startYear)}-${convertEnglishToMarathiDigits(endYearShort)}`;
  }

  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) {
    return '२०२६-२७';
  }

  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1; // 1-indexed (1 = Jan, 4 = Apr)
  const startYear = month >= 4 ? year : year - 1;
  const endYearShort = String(startYear + 1).slice(-2);
  return `${convertEnglishToMarathiDigits(startYear)}-${convertEnglishToMarathiDigits(endYearShort)}`;
}



/**
 * Checks if a transaction date (or fallback financialYear) matches the selected Calendar Year (Jan 1 - Dec 31)
 * or Financial Year (Apr 1 - Mar 31).
 */
export function isDateInSelectedYear(
  transactionDateStr?: string,
  selectedYearStr?: string,
  fallbackFinancialYearStr?: string
): boolean {
  if (!selectedYearStr || selectedYearStr === 'ALL') return true;

  const convertedSelected = convertMarathiToEnglishDigits(selectedYearStr).trim();
  const isFinancialYear = convertedSelected.includes('-');

  if (isFinancialYear) {
    // Financial Year filter (e.g. 2026-27 or 2026-2027 -> Apr 1 2026 to Mar 31 2027)
    const fyStartYear = parseYearNumber(convertedSelected);
    if (transactionDateStr) {
      const parts = transactionDateStr.split('-');
      if (parts.length >= 2) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10); // 1 to 12
        if (!isNaN(y) && !isNaN(m)) {
          const transFYStart = m >= 4 ? y : y - 1;
          return transFYStart === fyStartYear;
        }
      }
      const d = new Date(transactionDateStr);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = d.getMonth() + 1; // 1 to 12
        const transFYStart = m >= 4 ? y : y - 1;
        return transFYStart === fyStartYear;
      }
    }
    if (fallbackFinancialYearStr) {
      return parseYearNumber(fallbackFinancialYearStr) === fyStartYear;
    }
    return false;
  }

  // Calendar Year filter (e.g. 2026 -> Jan 1 2026 to Dec 31 2026)
  const targetYear = parseYearNumber(convertedSelected);

  if (transactionDateStr) {
    const parts = transactionDateStr.split('-');
    if (parts.length >= 1) {
      const y = parseInt(parts[0], 10);
      if (!isNaN(y)) {
        return y === targetYear;
      }
    }
    const d = new Date(transactionDateStr);
    if (!isNaN(d.getTime())) {
      return d.getFullYear() === targetYear;
    }
  }

  if (fallbackFinancialYearStr) {
    return parseYearNumber(fallbackFinancialYearStr) === targetYear;
  }

  return false;
}

/**
 * Extracts 2-digit year from date string (e.g. '2026-08-16' -> '26', '2025-10-01' -> '25')
 */
export function getTwoDigitYearFromDate(dateStr?: string): string {
  if (!dateStr) {
    return String(new Date().getFullYear()).slice(-2);
  }
  const parts = dateStr.split('-');
  if (parts.length >= 1) {
    const y = parseInt(convertMarathiToEnglishDigits(parts[0]), 10);
    if (!isNaN(y)) {
      return String(y).slice(-2);
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return String(d.getFullYear()).slice(-2);
  }
  return String(new Date().getFullYear()).slice(-2);
}

/**
 * Generates next sequential Credit transaction number: CR-{YY}-{N} (e.g. CR-26-1)
 * Strictly follows entry sequence (newest entry gets maxSeq + 1) regardless of back-dating.
 */
export function generateNextIncomeTransactionNo(
  _dateStr?: string,
  existingIncomes?: { transactionDate?: string; transactionNo?: string; createdAt?: string }[]
): string {
  // Always use current running year prefix (e.g. 26) as agreed
  const currentYy = String(new Date().getFullYear()).slice(-2);
  if (!existingIncomes || existingIncomes.length === 0) {
    return `CR-${currentYy}-1`;
  }
  let maxSeq = 0;
  existingIncomes.forEach((i) => {
    if (i.transactionNo) {
      const match = i.transactionNo.match(/^(?:CR|MG)-?\d+-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });
  if (maxSeq === 0) {
    maxSeq = existingIncomes.length;
  }
  return `CR-${currentYy}-${maxSeq + 1}`;
}

/**
 * Generates next sequential Debit transaction number: EXP-{YY}-{N} (e.g. EXP-26-1)
 * Strictly follows entry sequence (newest entry gets maxSeq + 1) regardless of back-dating.
 */
export function generateNextExpenseTransactionNo(
  _dateStr?: string,
  existingExpenses?: { expenseDate?: string; transactionNo?: string; createdAt?: string }[]
): string {
  // Always use current running year prefix (e.g. 26) as agreed
  const currentYy = String(new Date().getFullYear()).slice(-2);
  if (!existingExpenses || existingExpenses.length === 0) {
    return `EXP-${currentYy}-1`;
  }
  let maxSeq = 0;
  existingExpenses.forEach((e) => {
    if (e.transactionNo) {
      const match = e.transactionNo.match(/^(?:EXP|DR)-?\d+-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });
  if (maxSeq === 0) {
    maxSeq = existingExpenses.length;
  }
  return `EXP-${currentYy}-${maxSeq + 1}`;
}

/**
 * Preserves existing sequential transaction numbers and assigns next sequential numbers for any missing ones based on creation order.
 */
export function formatIncomeTransactionsNo<
  T extends { id: string; transactionNo?: string; transactionDate?: string; createdAt?: string }
>(incomes: T[]): T[] {
  if (!Array.isArray(incomes) || incomes.length === 0) return incomes;
  const currentYy = String(new Date().getFullYear()).slice(-2);

  return incomes.map((item, index) => {
    if (item.transactionNo && item.transactionNo.trim() !== '') {
      return item;
    }
    return {
      ...item,
      transactionNo: `CR-${currentYy}-${index + 1}`,
    };
  });
}

/**
 * Preserves existing sequential transaction numbers and assigns next sequential numbers for any missing ones based on creation order.
 */
export function formatExpenseTransactionsNo<
  T extends { id: string; transactionNo?: string; expenseDate?: string; createdAt?: string }
>(expenses: T[]): T[] {
  if (!Array.isArray(expenses) || expenses.length === 0) return expenses;
  const currentYy = String(new Date().getFullYear()).slice(-2);

  return expenses.map((item, index) => {
    if (item.transactionNo && item.transactionNo.trim() !== '') {
      return item;
    }
    return {
      ...item,
      transactionNo: `EXP-${currentYy}-${index + 1}`,
    };
  });
}

