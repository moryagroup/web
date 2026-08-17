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
 * Helper to generate sequential transaction numbers for credit (CR-YY-N) and debit (DR-YY-N)
 * e.g. CR-26-1, CR-26-2, DR-26-1, DR-26-2 ...
 */
export function generateNextTransactionNo(
  type: 'CR' | 'DR',
  dateStr?: string,
  existingTransactions: Array<{ transactionNo?: string; transactionDate?: string; expenseDate?: string }> = []
): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const yearSuffix = String(year).slice(-2); // e.g. 2026 -> "26"

  const prefix = `${type}-${yearSuffix}-`;

  let maxSeq = 0;
  existingTransactions.forEach((t) => {
    if (t.transactionNo && t.transactionNo.startsWith(prefix)) {
      const parts = t.transactionNo.split(prefix);
      if (parts.length > 1) {
        const seq = parseInt(parts[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  });

  return `${prefix}${maxSeq + 1}`;
}

/**
 * Formats an array of Income transactions so every transaction gets a clean sequential CR-YY-N number (CR-26-1, CR-26-2...).
 */
export function formatIncomeTransactionsNo<T extends { transactionNo?: string; transactionDate?: string; createdAt?: string }>(
  incomes: T[]
): T[] {
  if (!incomes || incomes.length === 0) return incomes;

  const mapByYear: Record<string, T[]> = {};

  // Sort chronologically by date/createdAt first
  const sorted = [...incomes].sort((a, b) => {
    const da = new Date(a.transactionDate || a.createdAt || 0).getTime();
    const db = new Date(b.transactionDate || b.createdAt || 0).getTime();
    return da - db;
  });

  sorted.forEach((inc) => {
    const d = inc.transactionDate ? new Date(inc.transactionDate) : new Date(inc.createdAt || Date.now());
    const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
    const yy = String(year).slice(-2);
    if (!mapByYear[yy]) mapByYear[yy] = [];
    mapByYear[yy].push(inc);
  });

  const updatedIncomes: T[] = [];
  Object.keys(mapByYear).forEach((yy) => {
    mapByYear[yy].forEach((inc, index) => {
      const newNo = `CR-${yy}-${index + 1}`;
      updatedIncomes.push({
        ...inc,
        transactionNo: newNo,
      });
    });
  });

  // Sort back to newest first
  return updatedIncomes.sort((a, b) => {
    const da = new Date(a.transactionDate || a.createdAt || 0).getTime();
    const db = new Date(b.transactionDate || b.createdAt || 0).getTime();
    return db - da;
  });
}

/**
 * Formats an array of Expense transactions so every transaction gets a clean sequential DR-YY-N number (DR-26-1, DR-26-2...).
 */
export function formatExpenseTransactionsNo<T extends { transactionNo?: string; expenseDate?: string; createdAt?: string }>(
  expenses: T[]
): T[] {
  if (!expenses || expenses.length === 0) return expenses;

  const mapByYear: Record<string, T[]> = {};

  const sorted = [...expenses].sort((a, b) => {
    const da = new Date(a.expenseDate || a.createdAt || 0).getTime();
    const db = new Date(b.expenseDate || b.createdAt || 0).getTime();
    return da - db;
  });

  sorted.forEach((exp) => {
    const d = exp.expenseDate ? new Date(exp.expenseDate) : new Date(exp.createdAt || Date.now());
    const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
    const yy = String(year).slice(-2);
    if (!mapByYear[yy]) mapByYear[yy] = [];
    mapByYear[yy].push(exp);
  });

  const updatedExpenses: T[] = [];
  Object.keys(mapByYear).forEach((yy) => {
    mapByYear[yy].forEach((exp, index) => {
      const newNo = `DR-${yy}-${index + 1}`;
      updatedExpenses.push({
        ...exp,
        transactionNo: newNo,
      });
    });
  });

  return updatedExpenses.sort((a, b) => {
    const da = new Date(a.expenseDate || a.createdAt || 0).getTime();
    const db = new Date(b.expenseDate || b.createdAt || 0).getTime();
    return db - da;
  });
}
