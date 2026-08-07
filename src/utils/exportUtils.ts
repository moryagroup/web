/**
 * Export Utility Module for Marathi UTF-8 Unicode Devanagari Script Support
 * Handles CSV Blob Creation with UTF-8 BOM and RFC-4180 Cell Escaping, as well as PDF Print Triggering.
 */

/**
 * Exports data table to CSV format with UTF-8 BOM byte order mark (\uFEFF)
 * for proper Devanagari / Marathi font display in MS Excel and browsers.
 * Applies RFC-4180 cell escaping rule (encloses strings in quotes and doubles internal double quotes).
 */
export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | boolean)[][]
): void {
  const formatCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number' || typeof val === 'boolean') {
      return String(val);
    }
    const str = String(val);
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const headerLine = headers.map(formatCell).join(',');
  const rowLines = rows.map((row) => row.map(formatCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', safeFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers PDF print dialog via browser window.print().
 * Optionally sets temporary document.title for print document header.
 */
export function triggerPDFPrint(title?: string): void {
  const originalTitle = document.title;
  if (title) {
    document.title = title;
  }
  window.print();
  if (title) {
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }
}
