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
 * Checks if a transaction date (or fallback financialYear) matches the selected Calendar Year (Jan 1 - Dec 31).
 */
export function isDateInSelectedYear(
  transactionDateStr?: string,
  selectedYearStr?: string,
  fallbackFinancialYearStr?: string
): boolean {
  if (!selectedYearStr || selectedYearStr === 'ALL') return true;

  const targetYear = parseYearNumber(selectedYearStr);

  // 1. Primary check: actual transaction Date (YYYY-MM-DD)
  if (transactionDateStr) {
    const dateObj = new Date(transactionDateStr);
    if (!isNaN(dateObj.getFullYear())) {
      if (dateObj.getFullYear() === targetYear) {
        return true;
      }
    }
  }

  // 2. Fallback check: fallback string (if date missing or ambiguous)
  if (fallbackFinancialYearStr) {
    const fyStartYear = parseYearNumber(fallbackFinancialYearStr);
    if (fyStartYear === targetYear) {
      return true;
    }
  }

  return false;
}
