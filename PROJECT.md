# Project: Morya Group Web Application ERP (`moryagroupweb`)

## Architecture
- **Frontend Stack**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide Icons.
- **Database & Sync**: Firebase 10 Firestore (`morya-group-352ad`) with real-time `onSnapshot` subscriptions and `storageService.ts` local persistence fallback.
- **Reporting Engine**: Web print engine with `@media print` CSS optimization and UTF-8 BOM (`\uFEFF`) RFC-4180 compliant CSV/Excel exporter (`src/utils/exportUtils.ts`).
- **Platform**: Web SPA + Capacitor 7 Mobile shell.

## Code Layout
- `src/App.tsx`: Top-level application state, tab navigation, Firestore real-time listener bindings, modal controllers.
- `src/config/firebase.ts`: Firebase App & Firestore initialization (`morya-group-352ad`).
- `src/services/firestoreService.ts`: Firestore CRUD and `onSnapshot` real-time subscriptions for all 7 domains.
- `src/services/storageService.ts`: LocalStorage fallback & cache service.
- `src/utils/rbac.ts`: Role-based access control and designation hierarchy ranks.
- `src/utils/exportUtils.ts`: Reusable CSV export with UTF-8 BOM and print helper.
- `src/components/`: Core UI components & modals (`ErrorBoundary.tsx`, `Header.tsx`, `Sidebar.tsx`, `LoginModal.tsx`, `OccasionModal.tsx`, etc.).
- `src/views/`: 12 View tabs (`Dashboard`, `IncomeForm`, `ExpenseForm`, `IncomeHistory`, `ExpenseHistory`, `MemberSubscriptions`, `MonthWiseReportsView`, `AllYearsDataView`, `CoreSummaryView`, `StatementExportView`, `SuggestionsView`, `ProfileView`).
- `tests/`: Automated test runner (`tests/runner.ts`) and E2E test suites.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | TypeScript & Build Cleanliness | Install missing `@types/react`, fix `ErrorBoundary.tsx` class component types, resolve `npx tsc --noEmit` errors | M1 | Survey 1 |
| 2 | RBAC Designation Rank Alignment | Align `कार्याध्यक्ष` / `उपाध्यक्ष` rank hierarchy in `rbac.ts` so `tests/runner.ts` R2.1 passes | M1 | Survey 1 |
| 3 | Firestore Empty-State Listener Fix | Fix `if (data.length > 0)` flaw in `subscribeToMembers`, `subscribeToOccasions`, `subscribeToGallery` in `firestoreService.ts` | M2 | Survey 2 |
| 4 | Real-Time Gallery Persistence | Connect `App.tsx` add/edit/delete gallery handlers to `saveGalleryImage` / `deleteGalleryImage` in Firestore | M2 | Survey 2 |
| 5 | Custom Income Types Sync | Persist & sync custom income types in Settings to Firestore (`morya-group-352ad`) instead of only `localStorage` | M2 | Survey 2 |
| 6 | Occasions Management UI | Add UI forms/modals to create, edit, and delete Occasions connected to Firestore `saveOccasion` / `deleteOccasion` | M2 | Survey 2 |
| 7 | Real-Time Firestore Sync Hardening | Verify and harden `onSnapshot` real-time listeners across all 7 domains (Incomes, Expenses, Members, Occasions, Gallery, Suggestions, Settings) | M2 | Survey 2 |
| 8 | Marathi UTF-8 Export Utility Engine | Create `src/utils/exportUtils.ts` with UTF-8 BOM (`\uFEFF`) & RFC-4180 CSV cell escaping for Marathi Devanagari text | M3 | Survey 3 |
| 9 | PDF Print Styling & Media Rules | Add `@media print` CSS rules in `src/index.css` to hide header/sidebar UI chrome and format printable statements cleanly | M3 | Survey 3 |
| 10 | Integrated Exports Across Financial Views | Add CSV/Excel download and PDF print controls to all 6 financial views (`StatementExportView`, `ExpenseHistory`, `MonthWiseReportsView`, `AllYearsDataView`, `CoreSummaryView`, `MemberSubscriptionsView`) | M3 | Survey 3 |
| 11 | E2E Test Suite Creation & Execution | Build opaque-box E2E test suite (Tiers 1-4) in `TEST_INFRA.md` & `tests/` verifying all user requirements | M4 | Dual Track |
| 12 | Adversarial Hardening & Final Verification | Execute Tier 5 Adversarial Coverage Hardening and verify zero errors in `npx tsc --noEmit` & `npm run build` | M4 | Dual Track |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Type & Build Foundation | Fix `@types/react` devDependencies, `ErrorBoundary.tsx` types, `rbac.ts` rank ordering & lookup guards, and `tsconfig.json` exclude dist rule | None | DONE |
| M2 | Real-Time Firestore Synchronization | Fix `firestoreService.ts` empty listeners, Gallery persistence, Settings Custom Types Firestore sync, Occasions UI forms, and harden `onSnapshot` sync across 7 domains | M1 | PLANNED |
| M3 | Marathi UTF-8 Report & Export Engine | Create `exportUtils.ts`, add `@media print` CSS rules, and implement CSV + PDF print controls across all 6 financial views | M1 | PLANNED |
| M4 | E2E Test Suite Pass & Adversarial Hardening | Run E2E test suite (Tiers 1-4), perform Tier 5 Adversarial Hardening, and verify 100% pass on `tsc --noEmit`, `npm run build`, and `tests/runner.ts` | M2, M3 | PLANNED |

## Interface Contracts
### `src/services/firestoreService.ts` ↔ UI Components (`App.tsx`, `OccasionModal.tsx`, Settings)
- `subscribeToMembers(callback: (members: Member[]) => void): () => void`
- `subscribeToOccasions(callback: (occasions: Occasion[]) => void): () => void`
- `subscribeToGallery(callback: (gallery: GalleryItem[]) => void): () => void`
- `saveGalleryImage(item: GalleryItem): Promise<void>`
- `deleteGalleryImage(id: string): Promise<void>`
- `saveOccasion(occasion: Occasion): Promise<void>`
- `deleteOccasion(id: string): Promise<void>`
- `saveSettings(settings: AppSettings): Promise<void>`

### `src/utils/exportUtils.ts` ↔ Financial Reporting Views
- `exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void`: Prepend `\uFEFF` BOM, RFC-4180 escape cells, trigger browser download.
- `triggerPDFPrint(title: string): void`: Set document title for print header and execute `window.print()`.
