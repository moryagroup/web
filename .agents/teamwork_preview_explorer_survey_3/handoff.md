# Explorer 3 Handoff Report: Statement & Report Export Engine & UTF-8 Marathi Support

**Agent**: Explorer 3 (Survey - Statement & Report Export Engine & UTF-8 Marathi Support)  
**Working Directory**: `c:\Users\SigmaDesign\Documents\moryagroupweb\.agents\teamwork_preview_explorer_survey_3`  
**Target Repository**: `c:\Users\SigmaDesign\Documents\moryagroupweb`  
**Date**: August 6, 2026  

---

## 1. Observation

1. **Package Dependencies (`package.json`)**:
   - Inspected `c:\Users\SigmaDesign\Documents\moryagroupweb\package.json` lines 16–35.
   - No external PDF libraries (`jspdf`, `pdfmake`, `html2pdf.js`) or Excel libraries (`xlsx`, `exceljs`, `papaparse`) exist in the project dependencies.

2. **Existing Export Implementation**:
   - `src/components/StatementExportView.tsx` (lines 143–224): Contains inline `exportToExcelCSV()` using `\uFEFF` UTF-8 BOM prepended to CSV strings, and `handlePrintPDF()` using `window.print()` after opening a React printable overlay modal (`showPrintModal`).
   - `src/components/IncomeHistory.tsx` (lines 540–549): Contains `NativeService.shareReceipt` using Web Share API for single receipt text.

3. **Missing Export Actions**:
   - Audited all financial and report views in `src/components/`:
     - `MonthWiseReportsView.tsx`: 0 export actions (No CSV/Excel export, No PDF print).
     - `AllYearsDataView.tsx`: 0 export actions (No CSV/Excel export, No PDF print).
     - `CoreSummaryView.tsx`: 0 export actions (No CSV/Excel export, No PDF print).
     - `ExpenseHistory.tsx`: 0 export actions (No CSV/Excel export, No PDF print).
     - `IncomeHistory.tsx`: Missing bulk CSV/Excel download and report print PDF.
     - `MemberSubscriptionsView.tsx`: 0 export actions (No member dues CSV/Excel export, No PDF print).

4. **UTF-8 Marathi (Devanagari Script) Handling**:
   - CSV UTF-8 BOM (`\uFEFF`) is used in `StatementExportView.tsx`, which prevents Excel on Windows from misinterpreting Devanagari text as ANSI/Windows-1252 (preventing `à¤®à¥‹à¤°à¥ à¤¯à¤¾` corruption).
   - CSV string escaping is incomplete in `StatementExportView.tsx`: `item.dateStr`, `item.type`, table header labels, and summary total rows are joined unescaped, risking broken columns if text contains commas or line breaks.
   - `window.print()` utilizes native browser and OS font rendering (Segoe UI, Nirmala UI, Mangal), avoiding character corruption or missing ligatures that plague unconfigured JS PDF libraries.
   - `src/index.css` (lines 1–2) contains only `@import "tailwindcss";`. It lacks global `@media print` rules, causing background web app UI elements (Sidebar, header, main canvas container) to bleed into printed PDFs when `window.print()` is invoked.

---

## 2. Logic Chain

1. **Dependency Analysis**:
   - Because no third-party PDF or Excel libraries are installed in `package.json`, adding heavy libraries like `jsPDF` would require converting Devanagari TrueType Fonts (`NotoSansDevanagari.ttf`) to Base64 and registering them manually to prevent garbled text (`???`).
   - Browser native print (`window.print()`) leverages system OS typography engines (HarfBuzz/DirectWrite), rendering Marathi Devanagari text accurately with zero bundle overhead.

2. **CSV Escaping & BOM**:
   - Appending `\uFEFF` UTF-8 BOM to CSV strings guarantees Microsoft Excel recognizes UTF-8 encoding.
   - Proper RFC-4180 escaping (wrapping cells in double quotes `""` and escaping internal quotes as `""`) is required for all text fields to handle Marathi text containing spaces, commas, or line breaks safely.

3. **Print Layout Isolation**:
   - Calling `window.print()` without global CSS `@media print` rules leaves background application layers visible.
   - Adding global `@media print` rules in `index.css` hiding non-printable components (`aside`, `header`, `.no-print`) ensures crisp, standalone PDF report generation.

4. **Centralization & Reusability**:
   - Standardizing CSV/Excel export and PDF printing into a utility module (`src/utils/exportUtils.ts`) will allow all 6 reporting components (`StatementExportView`, `IncomeHistory`, `ExpenseHistory`, `MonthWiseReportsView`, `AllYearsDataView`, `CoreSummaryView`, `MemberSubscriptionsView`) to share robust Marathi UTF-8 export functionality.

---

## 3. Caveats

- **Read-Only Scope**: As Explorer 3, this investigation is read-only. Application source code modifications were not executed in `src/`.
- **Browser/OS Print Dependency**: PDF generation via `window.print()` relies on the user's browser print engine ("Save as PDF"). Testing on target mobile web browsers (Chrome Android, Safari iOS, Android Webview/Capacitor) should confirm print dialog behavior.

---

## 4. Conclusion

1. **Export Engine Status**: Current export capabilities are limited to `StatementExportView.tsx` and single receipt sharing in `IncomeHistory.tsx`. Five major financial views lack export capability.
2. **Marathi Script Handling**: UTF-8 Devanagari Marathi text renders cleanly in browser print (`window.print()`) and Excel CSV (with `\uFEFF` BOM), but requires a central utility with RFC-4180 cell escaping and global `@media print` CSS rules.
3. **Actionable Roadmap**:
   - Create `src/utils/exportUtils.ts` providing `downloadCsv` (with BOM + RFC-4180 escaping) and `printReport`.
   - Add `@media print` rules to `src/index.css`.
   - Add CSV export and PDF print action buttons to `IncomeHistory`, `ExpenseHistory`, `MonthWiseReportsView`, `AllYearsDataView`, `CoreSummaryView`, and `MemberSubscriptionsView`.

---

## 5. Verification Method

1. **Analysis Report**:
   - Inspect `c:\Users\SigmaDesign\Documents\moryagroupweb\.agents\teamwork_preview_explorer_survey_3\analysis.md`.
2. **Build Check**:
   - Run `npx tsc --noEmit` to verify codebase readiness.
3. **Future Implementation Verification**:
   - After implementing `exportUtils.ts` and UI export buttons, generate CSV and open in Excel to confirm Devanagari Marathi text displays properly.
   - Trigger `window.print()` to verify Print Preview isolates the report cleanly.
