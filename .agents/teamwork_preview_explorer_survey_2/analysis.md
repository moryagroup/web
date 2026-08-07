# Firebase Firestore Integration & Real-Time Sync Audit Report

**Project**: Morya Group Web Application ERP (`morya-group-352ad`)  
**Auditor**: Explorer 2 (Survey - Firebase Firestore Integration & Real-Time Sync)  
**Target Path**: `c:\Users\SigmaDesign\Documents\moryagroupweb`  
**Date**: 2026-08-06  

---

## Executive Summary

An in-depth code audit of the Firebase configuration, Firestore service helpers, and all 7 target functional domains (**Incomes, Expenses, Members, Occasions, Gallery, Suggestions, Settings**) was conducted.

### Key Audit Findings:
1. **Firebase Initialization (`morya-group-352ad`)**:
   - `src/services/firebaseConfig.ts` correctly initializes Firebase (`initializeApp`) and Firestore (`getFirestore`). Environment variables are pulled from `.env` with fallback values set for project `morya-group-352ad`.
2. **Real-Time Sync Infrastructure (`onSnapshot`)**:
   - `src/services/firestoreService.ts` contains `onSnapshot` subscription listeners and CRUD helper functions for all collections.
3. **Domain Sync Status Overview**:
   - **Fully Functional Real-Time Sync**: Incomes, Expenses, Suggestions, Settings (Group Logo).
   - **Partially Functional Sync**: Members (syncs edits/adds, but listener suppresses empty collection state updates).
   - **Missing / Broken Sync**: 
     - **Gallery**: `App.tsx` only updates local React state (`setGalleryState`) when gallery items are added/edited/deleted, failing to call `saveGalleryImage` / `deleteGalleryImage`. Photos do NOT persist to Firestore or sync across devices.
     - **Settings (Custom Income Types)**: Custom income types added in `IncomeForm` are saved ONLY in `localStorage` and never written to Firestore.
     - **Occasions**: Occasion listener exists, but there are no UI handlers or forms to add/edit/delete occasions.

---

## 1. Firebase Initialization & Infrastructure Audit

### 1.1 Firebase Configuration (`src/services/firebaseConfig.ts`)
- **Initialization**: Calls `initializeApp(firebaseConfig)` and exports `db = getFirestore(app)`.
- **Project Credentials**:
  ```ts
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDFzf3gVs0vhstWxsbG6DJui13yNb97Dgs"
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "morya-group-352ad.firebaseapp.com"
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "morya-group-352ad"
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "morya-group-352ad.firebasestorage.app"
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1033031751154"
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1033031751154:web:c5f40ec456aca1deab076b"
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-M9X7HPGWT0"
  ```
- **Evaluation**: Configuration is complete and correctly targets `morya-group-352ad`.

### 1.2 Firestore Service Architecture (`src/services/firestoreService.ts`)
- **Collection Names**:
  - `incomes`: `'incomes'`
  - `expenses`: `'expenses'`
  - `members`: `'members'`
  - `occasions`: `'occasions'`
  - `gallery`: `'gallery'`
  - `suggestions`: `'suggestions'`
  - `settings`: `'settings'`
- **Background Seeding**:
  - `seedAllCollections()` checks each collection on app load (`seedIfEmpty`) and populates initial records from `mockData.ts` if documents are missing.

---

## 2. Audit of the 7 Target Domains

### 2.1 Domain 1: Incomes
- **Firestore Subscriptions**: `subscribeToIncomes()` uses `onSnapshot(collection(db, 'incomes'))` and sorts transactions by `createdAt` descending.
- **UI Component Usage**: `App.tsx` subscribes via `useEffect` and passes `incomes` state to `DashboardView`, `IncomeHistory`, `IncomeForm`, `MonthWiseReportsView`, `AllYearsDataView`, `CoreSummaryView`, `StatementExportView`, and `ProfileView`.
- **Write Operations**: `saveIncome(income)` (`setDoc`), `deleteIncome(id)` (`deleteDoc`). Invoked on adding, updating, or deleting income records.
- **Real-Time Sync Assessment**: **Fully Functional**. Real-time cross-device synchronization works properly across all views.

### 2.2 Domain 2: Expenses
- **Firestore Subscriptions**: `subscribeToExpenses()` uses `onSnapshot(collection(db, 'expenses'))` and sorts transactions by `createdAt` descending.
- **UI Component Usage**: `App.tsx` subscribes via `useEffect` and passes `expenses` state to `DashboardView`, `ExpenseHistory`, `ExpenseForm`, `HeaderStats`, `MonthWiseReportsView`, `AllYearsDataView`, `CoreSummaryView`, and `StatementExportView`.
- **Write Operations**: `saveExpense(expense)` (`setDoc`), `deleteExpense(id)` (`deleteDoc`). Invoked when adding expenses, editing expenses, deleting expenses, or approving pending expenses (`handleApproveExpense`).
- **Real-Time Sync Assessment**: **Fully Functional**. Status changes (e.g. approving pending expenses) sync live across all connected client devices.

### 2.3 Domain 3: Members
- **Firestore Subscriptions**: `subscribeToMembers()` uses `onSnapshot(collection(db, 'members'))`.
- **UI Component Usage**: `App.tsx` passes `members` state to `Sidebar`, `DashboardView`, `MemberSubscriptionsView`, `ProfileView`, `IncomeForm`, `ExpenseForm`, `SuggestionsView`, `LoginModal`.
- **Write Operations**: `saveMember(member)` (`setDoc`), `deleteMember(id)` (`deleteDoc`). Triggered on adding new members, editing member details/roles/passwords, or deleting members.
- **Defects & Gaps**:
  1. **Empty Collection Suppression Bug** (`firestoreService.ts` Line 123):
     ```ts
     if (data.length > 0) {
       data.sort((a, b) => a.memberCode.localeCompare(b.memberCode));
       callback(data);
     }
     ```
     If all members are deleted, `data.length` becomes `0`, so `callback(data)` is skipped. The UI will retain stale member data instead of clearing the list to `[]`.
- **Real-Time Sync Assessment**: **Working with Bug**. Core CRUD operations sync, but listener code prevents clearing state when empty.

### 2.4 Domain 4: Occasions
- **Firestore Subscriptions**: `subscribeToOccasions()` uses `onSnapshot(collection(db, 'occasions'))`.
- **UI Component Usage**: `App.tsx` passes `occasions` state to `IncomeForm` and `ExpenseForm`.
- **Write Operations**: `saveOccasion(occasion)` is defined in `firestoreService.ts`, BUT there are **no UI forms or handlers** in any component to create, update, or delete occasions.
- **Defects & Gaps**:
  1. **Empty Collection Suppression Bug** (`firestoreService.ts` Line 139): `if (data.length > 0) callback(data);` prevents emptying state.
  2. **Missing UI Mutators**: Occasion management is entirely read-only from initial seed data.
- **Real-Time Sync Assessment**: **Listener Only / Management Missing**.

### 2.5 Domain 5: Gallery
- **Firestore Subscriptions**: `subscribeToGallery()` uses `onSnapshot(collection(db, 'gallery'))`.
- **UI Component Usage**: `App.tsx` holds `gallery` state and passes it to `DashboardView` -> `EventGallerySection`.
- **Write Operations**:
  - `firestoreService.ts` contains `saveGalleryImage(image)` and `deleteGalleryImage(id)`.
  - **CRITICAL FAILURE IN APP.TSX**:
    In `App.tsx` (Line 343 & Line 426):
    ```ts
    onSaveGallery={(newGallery) => setGalleryState(newGallery)}
    ```
    `App.tsx` ONLY updates local React state (`setGalleryState`)! It **NEVER** calls `saveGalleryImage` or `deleteGalleryImage`!
- **Consequences**:
  - Photos added, edited (title/description/category), or deleted in `EventGallerySection` are NEVER written to Firestore.
  - Changes are lost upon page reload and DO NOT sync across devices.
- **Defects & Gaps**:
  1. **No Firestore Write Call**: `App.tsx` bypasses `firestoreService` for gallery updates.
  2. **Empty Collection Suppression Bug** (`firestoreService.ts` Line 152): `if (data.length > 0) callback(data);`.
- **Real-Time Sync Assessment**: **BROKEN / NO FIRESTORE PERSISTENCE**.

### 2.6 Domain 6: Suggestions
- **Firestore Subscriptions**: `subscribeToSuggestions()` uses `onSnapshot(collection(db, 'suggestions'))` and sorts by `createdAt` descending.
- **UI Component Usage**: `App.tsx` passes `suggestions` state to `SuggestionsView`.
- **Write Operations**: `saveSuggestion(sug)` (`setDoc`). Triggered on submitting a new suggestion (`handleAddSuggestion`) or posting a committee reply/status update (`handleUpdateSuggestion`).
- **Real-Time Sync Assessment**: **Fully Functional**. Live updates sync across member and officer devices.

### 2.7 Domain 7: Settings
- **7.1 Group Logo**:
  - Listener: `subscribeToGroupLogo(setGroupLogo)` listening to `doc(db, 'settings', 'groupLogo')`.
  - Write: `saveGroupLogoFirestore(logoUrl)` (`setDoc`).
  - Sync: **Fully Functional**. Updating the logo in `Sidebar` or `ProfileView` syncs live across devices.
- **7.2 Custom Income Types**:
  - Listener / Sync: **NONE**. Custom income types added in `IncomeForm` are saved ONLY to `localStorage` (`CUSTOM_INCOME_TYPES`).
  - Gap: Custom income types are device-bound and do not sync to Firestore.
- **7.3 User Session State**:
  - Device-specific session data stored in `localStorage` (`morya_mandal_user_v2`). (Expected behavior for auth session).

---

## 3. Real-Time Sync Matrix Summary

| Domain | `onSnapshot` Listener | Firestore Write Operations Implemented | Cross-Device Real-Time Sync Status | Major Issues / Gaps |
| :--- | :--- | :--- | :--- | :--- |
| **Incomes** | `subscribeToIncomes` | `saveIncome`, `deleteIncome` | **Active & Working** | None |
| **Expenses** | `subscribeToExpenses` | `saveExpense`, `deleteExpense` | **Active & Working** | None |
| **Members** | `subscribeToMembers` | `saveMember`, `deleteMember` | **Working with Bug** | `if (data.length > 0)` prevents broadcasting empty array when all members deleted. |
| **Occasions** | `subscribeToOccasions` | `saveOccasion` (service only) | **Listener Only** | No UI forms/buttons to add, edit, or delete occasions. Empty list check flunk. |
| **Gallery** | `subscribeToGallery` | `saveGalleryImage`, `deleteGalleryImage` | **BROKEN / NO SYNC** | **`App.tsx` passes `setGalleryState` only.** Gallery modifications never touch Firestore. |
| **Suggestions** | `subscribeToSuggestions` | `saveSuggestion` | **Active & Working** | None |
| **Settings (Logo)** | `subscribeToGroupLogo` | `saveGroupLogo` | **Active & Working** | None |
| **Settings (Custom Types)** | None | None (`localStorage` only) | **MISSING** | Custom income categories stored in `localStorage` only. |

---

## 4. Actionable Remediation Plan

To achieve 100% full production readiness and real-time synchronization across all 7 domains:

1. **Fix Gallery Real-Time Persistence (`App.tsx` & `EventGallerySection`)**:
   - Update `onSaveGallery` in `App.tsx` or update gallery handlers to call `saveGalleryImage` / `deleteGalleryImage` in Firestore when items are created, modified, deleted, or reset.
2. **Fix `if (data.length > 0)` Guard Bug in `firestoreService.ts`**:
   - In `subscribeToMembers`, `subscribeToOccasions`, and `subscribeToGallery`, remove `if (data.length > 0)` condition so that empty collection updates (`[]`) properly notify callbacks and update local UI state.
3. **Persist Custom Income Types in Firestore**:
   - Store custom income types in `doc(db, 'settings', 'incomeTypes')` and subscribe with `onSnapshot` to sync custom income categories across devices.
4. **Add UI Occasion Management (Optional/Recommended)**:
   - Provide an occasion management modal or tab to allow authorized users to create or edit occasion events stored in Firestore.

---

## 5. Verification Method

1. Inspect `src/services/firestoreService.ts` lines 123, 139, 152 to verify the `if (data.length > 0)` checks.
2. Inspect `src/App.tsx` lines 343 & 426 to verify `onSaveGallery={(newGallery) => setGalleryState(newGallery)}`.
3. Inspect `src/services/storageService.ts` lines 96-115 to confirm `saveCustomIncomeType` writes exclusively to `localStorage`.
