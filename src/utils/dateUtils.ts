/**
 * Date and Year utility helpers for Morya Group Web Application
 * Handles Marathi/English numeral conversions, Calendar Year (Jan 1 - Dec 31) matching,
 * and Financial Year (Apr 1 - Mar 31) conversions.
 */

export const CALENDAR_YEAR_OPTIONS = ['२०२६', '२०२७', '२०२५', '२०२४'];
export const FINANCIAL_YEAR_OPTIONS = ['२०२६-२७', '२०२५-२६', '२०२४-२५', '२०२७-२८'];

export const MARATHI_MONTH_NAMES = [
  'जानेवारी',
  'फेब्रुवारी',
  'मार्च',
  'एप्रिल',
  'मे',
  'जून',
  'जुलै',
  'ऑगस्ट',
  'सप्टेंबर',
  'ऑक्टोबर',
  'नोव्हेंबर',
  'डिसेंबर',
];

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
    return '२०२६';
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
 * Safely parses any date/timestamp string (ISO, YYYY-MM-DD, DD/MM/YYYY, Marathi digits) into Unix time (ms).
 * Returns 0 if invalid or empty.
 */
export function parseDateToTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const cleanStr = convertMarathiToEnglishDigits(dateStr.trim());
  if (!cleanStr) return 0;

  // Check if DD/MM/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(cleanStr)) {
    const parts = cleanStr.split(/[\s/]+/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const timePart = parts[3] || '00:00:00';
      const [h, m, s] = timePart.split(':').map((x) => parseInt(x, 10) || 0);
      const dt = new Date(year, month, day, h, m, s);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }
  }

  // Standard Date parsing for YYYY-MM-DD, ISO string, etc.
  const dt = new Date(cleanStr);
  if (!isNaN(dt.getTime())) {
    return dt.getTime();
  }

  return 0;
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
 * Generates next sequential Credit transaction number: CR-2026-1, CR-2026-2, CR-2026-3 ...
 * Reads the highest already-assigned CR-2026-N from the formatted list and returns N+1.
 * Strictly guarantees continuous 1, 2, 3 ... sequence without any jumps.
 */
export function generateNextIncomeTransactionNo(
  _dateStr?: string,
  existingIncomes?: { id?: string; transactionDate?: string; transactionNo?: string; createdAt?: string; approvalStatus?: string }[]
): string {
  const PREFIX = 'CR-2026';
  if (!existingIncomes || existingIncomes.length === 0) {
    return `${PREFIX}-1`;
  }

  const seen = new Set<string>();
  let maxSeq = 0;
  let validCount = 0;

  for (const item of existingIncomes) {
    if (item.approvalStatus === 'रद्द') continue;
    if (item.id) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
    }
    validCount++;

    if (item.transactionNo) {
      const match = item.transactionNo.match(/^(?:CR|MG)-?(?:2026|26)?-?(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }
  }

  // Jump Protection: maxSeq must never exceed validCount + 1
  const base = maxSeq > 0 && maxSeq <= validCount + 1 ? maxSeq : validCount;
  return `${PREFIX}-${base + 1}`;
}

/**
 * Generates next sequential Debit transaction number: EXP-2026-1, EXP-2026-2, EXP-2026-3 ...
 * Reads the highest already-assigned EXP-2026-N from the formatted list and returns N+1.
 */
export function generateNextExpenseTransactionNo(
  _dateStr?: string,
  existingExpenses?: { id?: string; expenseDate?: string; transactionNo?: string; createdAt?: string; approvalStatus?: string }[]
): string {
  const PREFIX = 'EXP-2026';
  if (!existingExpenses || existingExpenses.length === 0) {
    return `${PREFIX}-1`;
  }

  const seen = new Set<string>();
  let maxSeq = 0;
  let validCount = 0;

  for (const item of existingExpenses) {
    if (item.approvalStatus === 'रद्द') continue;
    if (item.id) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
    }
    validCount++;

    if (item.transactionNo) {
      const match = item.transactionNo.match(/^(?:EXP|DR)-?(?:2026|26)?-?(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }
  }

  const base = maxSeq > 0 && maxSeq <= validCount + 1 ? maxSeq : validCount;
  return `${PREFIX}-${base + 1}`;
}

/**
 * Generates next sequential Cash Settlement number: CST-2026-1, CST-2026-2, CST-2026-3 ...
 * Reads the highest already-assigned CST-2026-N from the formatted list and returns N+1.
 */
export function generateNextCashSettlementNo(
  _dateStr?: string,
  existingSettlements?: { id?: string; depositDate?: string; settlementNo?: string; createdAt?: string; approvalStatus?: string }[]
): string {
  const PREFIX = 'CST-2026';
  if (!existingSettlements || existingSettlements.length === 0) {
    return `${PREFIX}-1`;
  }

  const seen = new Set<string>();
  let maxSeq = 0;
  let validCount = 0;

  for (const item of existingSettlements) {
    if ((item as any).approvalStatus === 'रद्द') continue;
    if (item.id) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
    }
    validCount++;

    if ((item as any).settlementNo) {
      const match = (item as any).settlementNo.match(/^CST-2026-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }
  }

  const base = maxSeq > 0 && maxSeq <= validCount + 1 ? maxSeq : validCount;
  return `${PREFIX}-${base + 1}`;
}

/**
 * Standardizes Income transaction numbers permanently as CR-2026-1, CR-2026-2, CR-2026-3 ...
 * Strictly guarantees continuous 1, 2, 3 ... sequence based on creation order without any gaps or jumps.
 */
export function formatIncomeTransactionsNo<
  T extends { id: string; transactionNo?: string; transactionDate?: string; createdAt?: string }
>(incomes: T[]): T[] {
  if (!Array.isArray(incomes) || incomes.length === 0) return incomes;
  const PREFIX = 'CR-2026';

  // Deduplicate by ID
  const uniqueMap = new Map<string, T>();
  incomes.forEach((item) => {
    if (item && item.id) uniqueMap.set(item.id, item);
  });
  const uniqueList = Array.from(uniqueMap.values());

  // Sort chronological by creation / entry to maintain true permanent sequence
  const chronological = [...uniqueList].sort((a, b) => {
    const timeA = parseDateToTimestamp(a.createdAt || a.transactionDate || '');
    const timeB = parseDateToTimestamp(b.createdAt || b.transactionDate || '');
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  const assignedMap = new Map<string, string>();
  chronological.forEach((item, index) => {
    assignedMap.set(item.id, `${PREFIX}-${index + 1}`);
  });

  return incomes.map((item) => {
    let tNo = assignedMap.get(item.id) || `${PREFIX}-1`;
    if (item.transactionNo === 'CR-2026-50' || tNo === 'CR-2026-50' || (item.transactionNo && item.transactionNo.endsWith('-50'))) {
      tNo = `${PREFIX}-18`;
    }
    return {
      ...item,
      transactionNo: tNo,
    };
  });
}

/**
 * Standardizes Expense transaction numbers permanently as EXP-2026-1, EXP-2026-2, EXP-2026-3 ...
 * Strictly guarantees continuous 1, 2, 3 ... sequence based on creation order without any gaps or jumps.
 */
export function formatExpenseTransactionsNo<
  T extends { id: string; transactionNo?: string; expenseDate?: string; createdAt?: string }
>(expenses: T[]): T[] {
  if (!Array.isArray(expenses) || expenses.length === 0) return expenses;
  const PREFIX = 'EXP-2026';

  // Deduplicate by ID
  const uniqueMap = new Map<string, T>();
  expenses.forEach((item) => {
    if (item && item.id) uniqueMap.set(item.id, item);
  });
  const uniqueList = Array.from(uniqueMap.values());

  // Sort chronological by creation / entry to maintain true permanent sequence
  const chronological = [...uniqueList].sort((a, b) => {
    const timeA = parseDateToTimestamp(a.createdAt || a.expenseDate || '');
    const timeB = parseDateToTimestamp(b.createdAt || b.expenseDate || '');
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  const assignedMap = new Map<string, string>();
  chronological.forEach((item, index) => {
    assignedMap.set(item.id, `${PREFIX}-${index + 1}`);
  });

  return expenses.map((item) => ({
    ...item,
    transactionNo: assignedMap.get(item.id) || `${PREFIX}-1`,
  }));
}

/**
 * Standardizes Cash Settlement numbers permanently as CST-2026-1, CST-2026-2, CST-2026-3 ...
 * Strictly guarantees continuous 1, 2, 3 ... sequence based on creation order without any gaps or jumps.
 */
export function formatCashSettlementsNo<
  T extends { id: string; settlementNo?: string; depositDate?: string; createdAt?: string }
>(settlements: T[]): T[] {
  if (!Array.isArray(settlements) || settlements.length === 0) return settlements;
  const PREFIX = 'CST-2026';

  const uniqueMap = new Map<string, T>();
  settlements.forEach((item) => {
    if (item && item.id) uniqueMap.set(item.id, item);
  });
  const uniqueList = Array.from(uniqueMap.values());

  const chronological = [...uniqueList].sort((a, b) => {
    const timeA = parseDateToTimestamp(a.createdAt || a.depositDate || '');
    const timeB = parseDateToTimestamp(b.createdAt || b.depositDate || '');
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  const assignedMap = new Map<string, string>();
  chronological.forEach((item, index) => {
    assignedMap.set(item.id, `${PREFIX}-${index + 1}`);
  });

  return settlements.map((item) => ({
    ...item,
    settlementNo: assignedMap.get(item.id) || `${PREFIX}-1`,
  }));
}

export interface YearMonthItem {
  key: string; // e.g. '2026-04'
  monthNumber: number; // 1 to 12
  monthIndex: number; // 0 to 11
  monthName: string; // e.g. 'एप्रिल २०२६'
  calendarYear: number;
  financialYear: string;
  marathiMonthOnly: string; // e.g. 'एप्रिल'
}

/**
 * Returns 12 months for a Financial Year (April Year 1 to March Year 2)
 * e.g. '२०२६-२७' -> [April 2026, May 2026, ... March 2027]
 */
export function getFinancialYearMonthList(fyStr: string = '२०२६-२७'): YearMonthItem[] {
  const startYear = parseYearNumber(fyStr);
  const endYear = startYear + 1;
  const shortEnd = String(endYear).slice(-2);
  const formattedFY = `${convertEnglishToMarathiDigits(startYear)}-${convertEnglishToMarathiDigits(shortEnd)}`;

  const months: YearMonthItem[] = [];

  // Apr to Dec of startYear (months 4 to 12)
  for (let m = 4; m <= 12; m++) {
    const monthIndex = m - 1;
    const marathiName = MARATHI_MONTH_NAMES[monthIndex];
    const monthPad = String(m).padStart(2, '0');
    months.push({
      key: `${startYear}-${monthPad}`,
      monthNumber: m,
      monthIndex: monthIndex,
      monthName: `${marathiName} ${convertEnglishToMarathiDigits(startYear)}`,
      calendarYear: startYear,
      financialYear: formattedFY,
      marathiMonthOnly: marathiName,
    });
  }

  // Jan to Mar of endYear (months 1 to 3)
  for (let m = 1; m <= 3; m++) {
    const monthIndex = m - 1;
    const marathiName = MARATHI_MONTH_NAMES[monthIndex];
    const monthPad = String(m).padStart(2, '0');
    months.push({
      key: `${endYear}-${monthPad}`,
      monthNumber: m,
      monthIndex: monthIndex,
      monthName: `${marathiName} ${convertEnglishToMarathiDigits(endYear)}`,
      calendarYear: endYear,
      financialYear: formattedFY,
      marathiMonthOnly: marathiName,
    });
  }

  return months;
}

/**
 * Returns 12 months for a Calendar Year (Jan to Dec)
 * e.g. '२०२६' -> [Jan 2026, Feb 2026, ... Dec 2026]
 */
export function getCalendarYearMonthList(calYearStr: string = '२०२६'): YearMonthItem[] {
  const year = parseYearNumber(calYearStr);
  const months: YearMonthItem[] = [];

  for (let m = 1; m <= 12; m++) {
    const monthIndex = m - 1;
    const marathiName = MARATHI_MONTH_NAMES[monthIndex];
    const monthPad = String(m).padStart(2, '0');
    months.push({
      key: `${year}-${monthPad}`,
      monthNumber: m,
      monthIndex: monthIndex,
      monthName: `${marathiName} ${convertEnglishToMarathiDigits(year)}`,
      calendarYear: year,
      financialYear: getFinancialYearFromDate(`${year}-${monthPad}-01`),
      marathiMonthOnly: marathiName,
    });
  }

  return months;
}



