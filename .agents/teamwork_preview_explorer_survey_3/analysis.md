# Detailed Technical Analysis: Statement & Report Export Engine & UTF-8 Marathi Support

**Project**: Morya Group Web Application ERP  
**Auditor**: Explorer 3 (Survey - Statement & Report Export Engine & UTF-8 Marathi Support)  
**Date**: August 6, 2026  
**Target Path**: `c:\Users\SigmaDesign\Documents\moryagroupweb`  

---

## 1. Executive Summary

An audit of the export mechanisms and report generation features across `moryagroupweb` was conducted. The codebase relies heavily on localized Devanagari Marathi script (UTF-8) for financial statements, income records, expense logs, member lists, and multi-year reports.

### Key Discoveries:
1. **No External PDF/Excel Libraries Installed**: `package.json` contains no third-party PDF generation libraries (such as `jspdf`, `pdfmake`, `html2pdf.js`) or Excel libraries (such as `xlsx`, `exceljs`).
2. **Current Export Utility Implementation**:
   - CSV / Excel export is currently implemented inline within `src/components/StatementExportView.tsx` via `exportToExcelCSV()`.
   - PDF export is handled via native browser print (`window.print()`) through a modal overlay in `StatementExportView.tsx`.
   - Receipt sharing is handled in `IncomeHistory.tsx` using `NativeService.shareReceipt` (Web Share API).
3. **Missing Export Actions**: Five key financial report components lack any CSV/Excel export or PDF print capability:
   - `MonthWiseReportsView.tsx` (Month-wise financial reports)
   - `AllYearsDataView.tsx` (Multi-year comparison data)
   - `CoreSummaryView.tsx` (Executive financial summary)
   - `ExpenseHistory.tsx` (Filtered expense ledger)
   - `MemberSubscriptionsView.tsx` (Member directory & subscription progress)
4. **UTF-8 Marathi (Devanagari) Encoding Issues**:
   - **Excel/CSV**: `StatementExportView.tsx` correctly adds the UTF-8 Byte Order Mark (`\uFEFF`) to CSV blobs, which enables Microsoft Excel on Windows to parse Devanagari script natively. However, incomplete CSV string escaping (headers, date strings, transaction types, and summary rows) risks breaking column structures when Marathi reason texts or names contain commas or quotes.
   - **PDF Printing**: Standard browser printing (`window.print()`) leverages system fonts (e.g., Segoe UI, Nirmala UI, Mangal) and native OS font shaping engines, correctly rendering complex Devanagari ligatures (e.g., `क्षेत्र`, `जमा`, `खर्च`). However, `index.css` lacks global `@media print` rules, causing background UI elements (sidebar, app headers, non-printable modals) to bleed into printed PDFs or create unnecessary extra pages.

---

## 2. Dependencies & Project Export Architecture Audit

### 2.1 `package.json` Inspection
```json
"dependencies": {
  "@capacitor/android": "^7.0.0",
  "@capacitor/camera": "^7.0.0",
  "@capacitor/core": "^7.0.0",
  "@capacitor/haptics": "^7.0.0",
  "@capacitor/network": "^7.0.0",
  "@capacitor/share": "^7.0.0",
  "@capacitor/toast": "^7.0.0",
  "@google/genai": "^2.4.0",
  "@tailwindcss/vite": "^4.1.14",
  "@vitejs/plugin-react": "^5.0.4",
  "dotenv": "^17.2.3",
  "express": "^4.21.2",
  "firebase": "^10.14.1",
  "lucide-react": "^0.546.0",
  "motion": "^12.23.24",
  "react": "^19.0.1",
  "react-dom": "^19.0.1",
  "vite": "^6.2.3"
}
```
- **Observation**: Neither `jspdf`, `pdfmake`, `html2pdf.js`, `html2canvas`, nor `xlsx`/`exceljs`/`papaparse` are present in `package.json`.
- **Logic**: Any client-side PDF generation via JS libraries would require installing and embedding Devanagari TrueType Fonts (TTF base64), whereas relying on native browser print (`window.print()`) leverages zero-dependency, lightweight, native OS Devanagari font rendering if paired with proper `@media print` CSS rules.

---

## 3. Detailed Audit of Existing Export & Report Features

### 3.1 `src/components/StatementExportView.tsx`
- **CSV / Excel Export (`exportToExcelCSV`)**:
  - Code reference (lines 143–212):
    ```typescript
    const csvContent = '\uFEFF' + csvString;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    ```
  - **Defect/Issue**:
    1. Unescaped fields: `item.dateStr`, `item.type`, table header row elements, and summary footer rows (`['', '', 'एकूण जमा (Total Deposit)', '', '', totalIncome.toString(), '', '', '', '']`) are joined with `.join(',')` without escaping.
    2. If user-entered text (e.g., `item.reason` or `item.personName`) contains a comma `,`, newline `\n`, or quote `"`, CSV columns shift out of alignment in Excel.
    3. Export logic is inline and not shared with other views.
- **PDF Print (`handlePrintPDF`)**:
  - Code reference (lines 215–224 & 511–637):
    ```typescript
    const handlePrintPDF = () => {
      setShowPrintModal(true);
      setTimeout(() => {
        try { window.print(); } catch (e) { console.warn(e); }
      }, 400);
    };
    ```
  - **Defect/Issue**:
    1. Overlay uses `fixed inset-0 z-50 bg-white`. When `window.print()` triggers, elements behind the modal overlay remain rendered in the DOM. Without explicit CSS `@media print { body > *:not(.printable) { display: none !important; } }`, mobile and desktop browsers print background pages, scrollbars, and sidebars behind or below the statement sheet.
    2. Table rows in the modal lack page break prevention CSS (`break-inside: avoid`). Longer financial statements with 50+ rows get cut in half across page margins.

### 3.2 `src/components/IncomeHistory.tsx`
- Code reference (lines 540–549):
  ```typescript
  const msg = `मोरया ग्रुप मित्र मंडळ पावती\nजमादार: ${selectedIncomeDetail.depositorName}\nरक्कम: ₹${selectedIncomeDetail.amount}\nप्रकार: ${selectedIncomeDetail.incomeType}\nपावती क्र: ${selectedIncomeDetail.transactionNo || 'N/A'}\nतारीख: ${selectedIncomeDetail.transactionDate}`;
  await NativeService.shareReceipt('मोरया ग्रुप जमा पावती', msg);
  ```
- **Defect/Issue**:
  - Good for single receipt WhatsApp text sharing.
  - Missing bulk CSV/Excel download for filtered income list.
  - Missing printable PDF summary view for income transactions.

### 3.3 `src/components/ExpenseHistory.tsx`
- **Defect/Issue**:
  - Displays filtered expense table, approval status, and approver details.
  - Completely missing CSV/Excel download action and PDF print capability.

### 3.4 `src/components/MonthWiseReportsView.tsx`
- **Defect/Issue**:
  - Calculates month-by-month income, expense, and balance breakdown cards (`monthlyData`).
  - Completely missing CSV/Excel export and PDF print functionality.

### 3.5 `src/components/AllYearsDataView.tsx`
- **Defect/Issue**:
  - Computes multi-year comparisons (`२०२६-२७`, `२०२५-२६`, `२०२४-२५`).
  - Completely missing CSV/Excel export and PDF print functionality.

### 3.6 `src/components/CoreSummaryView.tsx`
- **Defect/Issue**:
  - Shows core committee financial overview (Income, Expense, Net Balance, Subscription vs Donation breakdown).
  - Completely missing CSV/Excel export and PDF print functionality.

### 3.7 `src/components/MemberSubscriptionsView.tsx`
- **Defect/Issue**:
  - Displays list of members, annual targets (₹6,000), subscription collected, remaining dues, and extra donations.
  - Completely missing CSV/Excel export (e.g., Member Dues Report) and PDF print capability.

---

## 4. Audit of UTF-8 Marathi (Devanagari Script) Handling

### 4.1 Excel / CSV UTF-8 Encoding Mechanism
- When exporting Devanagari text (`मोरया ग्रुप`, `जमा`, `खर्च`, `अध्यक्ष`) to a `.csv` file on Windows, Microsoft Excel opens files using the system default ANSI codepage (Windows-1252) unless a Byte Order Mark is present.
- **Result without BOM**: Excel displays corrupted text: `à¤®à¥‹à¤°à¥ à¤¯à¤¾ à¤—à¥ à¤°à¥ à¤ª`.
- **Result with UTF-8 BOM (`\uFEFF`)**: Excel correctly identifies UTF-8 encoding and renders Marathi Devanagari script flawlessly.
- **Requirement for RFC-4180 CSV Escaping**:
  Every string field in CSV export must pass through an escape function:
  ```typescript
  export const escapeCsvCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };
  ```

### 4.2 PDF Generation: Browser Print vs JS PDF Libraries

| Metric | JS PDF Libraries (`jsPDF` / `pdfmake`) | Browser Native Print (`window.print()`) |
| :--- | :--- | :--- |
| **Devanagari Font Support** | ❌ Fails out-of-the-box (renders `???` or empty boxes). Requires embedding custom Base64 TTF fonts (`NotoSansDevanagari`). | ✅ Full native support via OS fonts (`Segoe UI`, `Nirmala UI`, `Mangal`, `Arial`). |
| **Ligature Shaping** | ❌ Fails without complex glyph shaping modules (complex conjuncts like `क्ष`, `ज्ञ`, `त्र` misalign). | ✅ Handled by OS typography engine (HarfBuzz/DirectWrite). |
| **Package Weight** | ⚠️ Adds 500KB - 2MB to bundle size. | ✅ 0KB additional bundle size. |
| **Layout & Styling** | ⚠️ Requires manual coordinate math (`doc.text(x, y)`). | ✅ Uses standard HTML/CSS, Tailwind, and `@media print`. |
| **Recommendation** | Not recommended for this application. | **Highly recommended**. Paired with global CSS print rules. |

---

## 5. UI Audit & Missing Export Feature Matrix

| Component | Route / Tab | Current Export Options | Missing Export Features | Priority |
| :--- | :--- | :--- | :--- | :--- |
| `StatementExportView.tsx` | `statement-export` | CSV download, Print PDF modal | Refactored export engine, RFC-4180 CSV escaping, CSS print styling | **HIGH** |
| `IncomeHistory.tsx` | `income-history` | Single receipt share (WhatsApp) | Export filtered incomes to CSV/Excel, Print income report PDF | **HIGH** |
| `ExpenseHistory.tsx` | `expense-history` | None | Export filtered expenses to CSV/Excel, Print expense report PDF | **HIGH** |
| `MonthWiseReportsView.tsx` | `month-wise-reports` | None | Export monthly breakdown to CSV/Excel, Print monthly report PDF | **MEDIUM** |
| `AllYearsDataView.tsx` | `all-years-data` | None | Export multi-year history to CSV/Excel, Print multi-year summary PDF | **MEDIUM** |
| `CoreSummaryView.tsx` | `core-summary` | None | Export executive financial summary to CSV/Excel, Print financial statement PDF | **MEDIUM** |
| `MemberSubscriptionsView.tsx` | `member-subscriptions` | None | Export member subscription & dues list to CSV/Excel, Print member report PDF | **HIGH** |

---

## 6. Required Architecture & Implementation Plan

To make all PDF prints and CSV/Excel exports produce valid, accurate Marathi UTF-8 Unicode reports across the entire application:

### Step 1: Create Centralized Export Utility (`src/utils/exportUtils.ts`)
Create a single export utility module providing clean, robust functions:
1. `downloadCsv(filename: string, headers: string[], rows: (string | number)[][])`:
   - Adds UTF-8 BOM (`\uFEFF`).
   - Applies RFC-4180 CSV cell escaping to all header and data cells.
   - Triggers native Web Share API on mobile devices if supported, or creates standard blob URL download.
2. `printReport(title: string)`:
   - Sets document title temporarily (so browser PDF default filename matches the report name).
   - Invokes `window.print()`.

### Step 2: Global Print CSS in `src/index.css`
Add `@media print` rules to `src/index.css` to hide non-printable UI elements and guarantee clean PDF outputs:
```css
@media print {
  /* Hide background elements */
  aside,
  header,
  nav,
  footer,
  .no-print,
  button:not(.printable-button) {
    display: none !important;
  }

  /* Reset layout constraints for printing */
  body, main, section {
    background: white !important;
    color: black !important;
    overflow: visible !important;
    height: auto !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }

  /* Prevent split table rows across pages */
  tr, .print-break-inside-avoid {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  /* Force print background graphics */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
```

### Step 3: Component Integration
Add action buttons (CSV/Excel Download & PDF Print) to the headers of:
1. `IncomeHistory.tsx`
2. `ExpenseHistory.tsx`
3. `MonthWiseReportsView.tsx`
4. `AllYearsDataView.tsx`
5. `CoreSummaryView.tsx`
6. `MemberSubscriptionsView.tsx`
7. Refactor `StatementExportView.tsx` to utilize `exportUtils.ts`.

---

## 7. Verification Method

1. **CSV UTF-8 Verification**:
   - Trigger CSV export for statements containing Marathi text.
   - Open generated CSV file in Microsoft Excel on Windows.
   - Verify all Devanagari characters render properly without `à¤®à¥‹à¤°à¥ à¤¯à¤¾` corruption.
   - Verify fields containing commas or quotes maintain exact column boundaries.
2. **PDF Print Verification**:
   - Click "PDF / प्रिंट काढ" in `StatementExportView` and all updated views.
   - In browser Print Preview, verify:
     - Background navigation (Sidebar, header, app shell) is completely hidden.
     - Marathi Devanagari text renders crisp and clear.
     - Table rows do not cut off awkwardly across page breaks.
3. **Build Integrity**:
   - Run `npx tsc --noEmit` and `npm run build` to verify 0 TypeScript or build errors.
