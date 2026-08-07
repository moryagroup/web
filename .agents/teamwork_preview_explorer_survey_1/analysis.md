# Codebase Architecture & Build Setup Analysis Report
**Application**: Morya Group Web Application ERP (`moryagroupweb`)
**Survey Date**: 2026-08-06
**Explorer Agent**: Explorer 1 (Survey - Codebase Architecture & Build Setup)

---

## Executive Summary

The Morya Group Web Application is a full-stack single-page ERP application built for **मोरया ग्रुप मित्र मंडळ (ट्रस्ट)** (Hadapsar, Gondhalenagar, Mandal ID: 1042). It manages member subscriptions, incomes, expenses, event gallery, member suggestions, and financial statement exports with real-time Firebase Firestore synchronization (`morya-group-352ad`) and mobile app support via Capacitor 7.

While `npm run build` (`vite build`) completes successfully with static asset generation, **`npx tsc --noEmit` fails with 2 compilation errors** in `ErrorBoundary.tsx` due to missing `@types/react` and `@types/react-dom` devDependencies. Additionally, **1 RBAC test (`R2.1`) fails** in `tests/tier2_rbac.test.ts` due to a mismatch between designation rank order in `src/utils/rbac.ts` and test assertions.

---

## 1. Project Structure & Technology Stack

### Framework & Libraries
- **UI Framework**: React 19 (`react` ^19.0.1, `react-dom` ^19.0.1)
- **Build System**: Vite 6 (`vite` ^6.2.3, `@vitejs/plugin-react` ^5.0.4, `@tailwindcss/vite` ^4.1.14)
- **Styling**: Tailwind CSS v4 (`tailwindcss` ^4.1.14, `@tailwindcss/vite` ^4.1.14)
- **Icons & Animation**: Lucide React (`lucide-react` ^0.546.0), Motion (`motion` ^12.23.24)
- **Mobile Runtime**: Capacitor 7 (`@capacitor/core` ^7.0.0, `@capacitor/android`, `@capacitor/camera`, `@capacitor/haptics`, `@capacitor/network`, `@capacitor/share`, `@capacitor/toast`)
- **Backend / Database**: Firebase 10 (`firebase` ^10.14.1) using Firestore (`morya-group-352ad`)
- **AI Service**: Google Gen AI SDK (`@google/genai` ^2.4.0)
- **TypeScript**: TypeScript 5.8 (`typescript` ~5.8.2)

### File & Directory Organization
```
c:\Users\SigmaDesign\Documents\moryagroupweb\
├── .env / .env.example / .env.local  # Firebase project credentials (morya-group-352ad)
├── capacitor.config.ts               # Capacitor Android app config (com.moryagroup.web)
├── index.html                        # HTML root template with UTF-8 Marathi font support
├── package.json                      # Dependency manifest and scripts
├── tsconfig.json                     # TS compiler config (ES2022, bundler module resolution, path alias @/* -> ./*)
├── vite.config.ts                    # Vite plugins, path aliases, base path setting
├── assets/                           # Static image assets (morya_logo.jpg)
├── src/
│   ├── main.tsx                      # Application entry point with StrictMode & ErrorBoundary
│   ├── App.tsx                       # Main application state, navigation, Firestore real-time listeners & tab rendering
│   ├── types.ts                      # Core TypeScript interfaces (Member, IncomeTransaction, ExpenseTransaction, etc.)
│   ├── mockData.ts                   # Initial fallback data (INITIAL_MEMBERS, INITIAL_INCOMES, etc.)
│   ├── assets/                       # Component assets
│   ├── components/                   # 23 UI view and modal components
│   ├── services/                     # Firebase & Storage integration layer
│   │   ├── firebaseConfig.ts         # Firebase App & Firestore initialization
│   │   ├── firestoreService.ts       # Firestore CRUD + 7 onSnapshot real-time listeners + seed helpers
│   │   ├── storageService.ts         # LocalStorage fallback handlers & financial calculation logic
│   │   ├── nativeService.ts          # Capacitor native device bridge (Camera, Share, Haptics, Toast)
│   │   └── storageService.test.ts    # Storage unit test suite
│   └── utils/
│       └── rbac.ts                   # Role-Based Access Control logic, ranks, permission guards
└── tests/                            # Comprehensive integration test runner
    ├── runner.ts                     # Executable test runner (Tiers 1-4)
    ├── test_helper.ts                # Assertion helper library
    ├── tier1_storage_default.test.ts # Storage service tests
    ├── tier2_rbac.test.ts            # RBAC permission tests
    ├── tier3_auth_flow.test.ts       # Authentication tests
    └── tier4_build_verification.test.ts # Build & TSC validation tests
```

---

## 2. UI Pages, Views & Modules Catalog

The application features 12 primary view tabs and 5 supporting modal/overlay components:

| View / Module Tab ID | Component Name | Description & Purpose | Access Control Level |
|----------------------|----------------|-----------------------|----------------------|
| `dashboard` | `DashboardView.tsx` | Main dashboard displaying financial summary statistics, pending approval alerts, recent transaction logs, event photo gallery preview, financial year filter. | Public / Guest (Photo gallery default) |
| `income-form` | `IncomeForm.tsx` | Entry form for recording incomes (subscriptions, donations, sponsorships). Supports custom income types, linked members, payment methods. | Logged-In User |
| `expense-form` | `ExpenseForm.tsx` | Entry form for recording expenses with categories, bill numbers, and auto-routing to approval workflow. | Logged-In User |
| `income-history` | `IncomeHistory.tsx` | Data table of income transactions with search, payment mode filter, receipt generation, and edit/delete capabilities. | Logged-In User |
| `expense-history` | `ExpenseHistory.tsx` | Data table of expenses filtered by approval status (`मंजूर`, `प्रलंबित`, `रद्द`). Includes approval trigger for authorized roles. | Logged-In User |
| `member-subscriptions` | `MemberSubscriptionsView.tsx` | Member ledger displaying target subscription (₹6,000), total paid, extra donations, pending balance, and payment progress bar. | Badged Member (`isBadgedMember`) |
| `month-wise-reports` | `MonthWiseReportsView.tsx` | Monthly breakdown (Apr - Mar) of incomes, expenses, and net balance with tabular and chart views. | Core Member (`isCoreMemberRole`) |
| `all-years-data` | `AllYearsDataView.tsx` | Multi-year historical transaction comparison and trends across financial years. | Core Member (`isCoreMemberRole`) |
| `core-summary` | `CoreSummaryView.tsx` | Comprehensive financial audit summary categorizing total collection vs expenditure categories. | Core Member (`isCoreMemberRole`) |
| `statement-export` | `StatementExportView.tsx` | Printable report export view supporting Marathi UTF-8 Unicode, date filtering, PDF print layout, CSV/Excel export. | Core Member (`isCoreMemberRole`) |
| `suggestions` | `SuggestionsView.tsx` | Feedback portal for members to submit suggestions, track resolution status (`नवीन`, `प्रक्रियेत`, `स्वीकृत`, `पूर्ण`), and view admin replies. | Logged-In User |
| `profile` | `ProfileView.tsx` | Personal member profile manager displaying contribution summary, profile photo upload, and Mandal logo settings. | Logged-In User |

### Supporting Modals & Overlay Components
1. **`LoginModal.tsx`**: Authentication modal for Admin (`Tom&jerry5633#`) and member login with optional member passwords.
2. **`ErrorBoundary.tsx`**: High-level React error boundary displaying fallback UI with app reload & data reset buttons.
3. **`LogoLightboxModal.tsx`**: Full-screen lightbox view of Mandal logo.
4. **`ImageCropModal.tsx`**: Interactive cropper for profile photos and Mandal logos.
5. **`NetworkStatusNotifier.tsx`**: Floating notification toast for device online/offline network state changes.

---

## 3. Data Architecture & Real-Time Firestore Sync

1. **State Hydration & Persistence**:
   - Initial state is loaded from `storageService.ts` (localStorage fallback).
   - Upon component mount (`App.tsx`), 7 real-time `onSnapshot` listeners connect to Firebase Firestore (`morya-group-352ad`):
     - `incomes`
     - `expenses`
     - `members`
     - `occasions`
     - `gallery`
     - `suggestions`
     - `settings/groupLogo`
   - Background seed process `seedAllCollections()` populates Firestore with default mock data if empty.

2. **Role-Based Access Control (RBAC)** (`src/utils/rbac.ts`):
   - **Executive Core Roles**: `अध्यक्ष`, `खजिनदार`, `उपखजिनदार`, `ॲडमिन`, `Admin` -> Full financial access & approval rights.
   - **Badged Office Bearers**: `अध्यक्ष`, `उपाध्यक्ष`, `कार्याध्यक्ष`, `सचिव`, `उपसचिव`, `खजिनदार`, `उपखजिनदार`, `संघटक`, `सहसंघटक`, `सल्लागार`, `कार्या सल्लागार`.
   - **General Member**: `सभासद` (Read-only access to dashboard, own profile, and suggestions).

---

## 4. Build & Inspection Verification Findings

### Command Executions & Results
1. **`npm run build` (`vite build`)**:
   - **Status**: PASSED (Exit Code 0)
   - **Output**: 1,729 modules transformed; static output generated in `dist/`.
   - **Warning**: Main JavaScript bundle (`dist/assets/index-BZQ0CpLV.js`) size is 875.77 kB (> 500 kB rollup warning threshold).

2. **`npx tsc --noEmit` (TypeScript Typecheck)**:
   - **Status**: FAILED (Exit Code 1)
   - **Errors**:
     ```
     src/components/ErrorBoundary.tsx(14,19): error TS4112: This member cannot have an 'override' modifier because its containing class 'ErrorBoundary' does not extend another class.
     src/components/ErrorBoundary.tsx(84,17): error TS2339: Property 'props' does not exist on type 'ErrorBoundary'.
     ```
   - **Root Cause**: `@types/react` and `@types/react-dom` packages are missing from `package.json` devDependencies. As a result, TypeScript cannot resolve `React.Component<Props, State>` class definitions.

3. **`npx tsx tests/runner.ts` (Test Suite)**:
   - **Status**: FAILED (24 / 26 Passed, 2 Failed)
   - **Failure 1**: `R2.1 - Designation rank mapping for office bearers & members` in `tests/tier2_rbac.test.ts`.
     - *Details*: Test expected `getDesignationRank('कार्याध्यक्ष')` to equal `2`, but `src/utils/rbac.ts` maps `कार्याध्यक्ष` to `3` and `उपाध्यक्ष` to `2`.
   - **Failure 2**: `R3.1 - TypeScript type check compiles cleanly without errors`.
     - *Details*: FAILED due to the 2 TypeScript errors in `ErrorBoundary.tsx`.

---

## 5. Identified Deficiencies & Recommendations

1. **Missing Type Definitions**:
   - Add `@types/react` and `@types/react-dom` to `devDependencies` in `package.json`.
2. **TypeScript Fix for ErrorBoundary**:
   - Fix class extension in `ErrorBoundary.tsx` so `React.Component<Props, State>` is properly extended and typed once `@types/react` is present.
3. **RBAC Rank Alignment**:
   - Align `DESIGNATION_RANKS` in `src/utils/rbac.ts` with test specification `R2.1`:
     - `अध्यक्ष`: 1
     - `कार्याध्यक्ष`: 2
     - `उपाध्यक्ष`: 3
     - `सचिव`: 4
     - `खजिनदार`: 5
     - `उपखजिनदार`: 6
     - `सभासद`: 7
4. **Build Optimization**:
   - Consider lazy-loading heavy view components (e.g. `StatementExportView`, `MonthWiseReportsView`, `AllYearsDataView`) using `React.lazy` to keep initial bundle size below 500 kB.

---

*Report prepared by Explorer 1 for Orchestrator handoff.*
