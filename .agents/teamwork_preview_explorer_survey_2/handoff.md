# Handoff Report — Explorer 2 (Survey - Firebase Firestore Integration & Real-Time Sync)

**Directory**: `c:\Users\SigmaDesign\Documents\moryagroupweb\.agents\teamwork_preview_explorer_survey_2`  
**Report Path**: `c:\Users\SigmaDesign\Documents\moryagroupweb\.agents\teamwork_preview_explorer_survey_2\analysis.md`  

---

## 1. Observation

1. **Firebase Initialization**:
   - `src/services/firebaseConfig.ts` (lines 4-15):
     ```ts
     const firebaseConfig = {
       apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDFzf3gVs0vhstWxsbG6DJui13yNb97Dgs",
       authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "morya-group-352ad.firebaseapp.com",
       projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "morya-group-352ad",
       ...
     };
     const app = initializeApp(firebaseConfig);
     export const db = getFirestore(app);
     ```
2. **Firestore Helper Functions & `if (data.length > 0)` Guard Bug**:
   - `src/services/firestoreService.ts` (lines 123-127, 139, 152):
     ```ts
     // subscribeToMembers
     if (data.length > 0) {
       data.sort((a, b) => a.memberCode.localeCompare(b.memberCode));
       callback(data);
     }
     // subscribeToOccasions
     if (data.length > 0) callback(data);
     // subscribeToGallery
     if (data.length > 0) callback(data);
     ```
3. **Gallery Real-Time Write Disconnect**:
   - `src/App.tsx` (lines 343 & 426):
     ```ts
     onSaveGallery={(newGallery) => setGalleryState(newGallery)}
     ```
     - `DashboardView` and `EventGallerySection` call `onSaveGallery` on image upload/edit/delete/reset, but `App.tsx` only updates local React state `setGalleryState` without invoking `saveGalleryImage` or `deleteGalleryImage` from `firestoreService.ts`.
4. **Custom Income Types Disconnect**:
   - `src/services/storageService.ts` (lines 107-115):
     ```ts
     export const saveCustomIncomeType = (newType: string) => {
       const current = getCustomIncomeTypes();
       if (newType && !current.includes(newType)) {
         const updated = [...current, newType];
         localStorage.setItem(STORAGE_KEYS.CUSTOM_INCOME_TYPES, JSON.stringify(updated));
         return updated;
       }
       return current;
     };
     ```
     - Custom income types added in `IncomeForm` call `saveCustomIncomeType`, which writes only to `localStorage` and never to Firestore.
5. **Functional Real-Time Sync Domains**:
   - `Incomes`, `Expenses`, `Suggestions`, and `Settings (Group Logo)` have active `onSnapshot` listeners and corresponding Firestore write calls (`saveIncome`, `deleteIncome`, `saveExpense`, `deleteExpense`, `saveSuggestion`, `saveGroupLogoFirestore`).

---

## 2. Logic Chain

1. **Observation 1** demonstrates that Firebase is properly initialized for project `morya-group-352ad`.
2. **Observation 5** shows that for Incomes, Expenses, Suggestions, and Group Logo, mutations call Firestore write functions and `onSnapshot` listeners update state across clients in real-time.
3. **Observation 3** reveals that gallery photo additions, edits, description updates, and deletions in `EventGallerySection` are passed to `App.tsx` via `onSaveGallery`. Because `App.tsx` handles this via `(newGallery) => setGalleryState(newGallery)`, Firestore's `saveGalleryImage` / `deleteGalleryImage` functions are never called. Therefore, gallery changes do not persist in Firestore and do not sync across devices.
4. **Observation 4** shows that custom income types are saved exclusively to `localStorage`, leaving custom income types device-bound and un-synced across devices.
5. **Observation 2** shows that `subscribeToMembers`, `subscribeToOccasions`, and `subscribeToGallery` check `if (data.length > 0)` before calling `callback(data)`. When a collection becomes empty (e.g. all members or gallery images deleted), `data.length === 0`, causing the callback to be bypassed and the UI state to remain stuck on old data.

---

## 3. Caveats

- **Occasions Domain**: Occasion records exist in Firestore and sync via `subscribeToOccasions`, but there are currently no UI forms to manage (create/edit/delete) occasion events in the application.
- **Authentication**: `currentUser` state is intentionally local to each device (`localStorage`) so that different devices can log in as different users.

---

## 4. Conclusion

- **Incomes, Expenses, Suggestions, Group Logo**: 100% Real-Time Firestore Sync complete and functional.
- **Gallery**: **Real-Time Sync Broken / Disconnected** in `App.tsx` (`onSaveGallery` fails to call `saveGalleryImage` / `deleteGalleryImage`).
- **Settings (Custom Types)**: **Missing Sync** (saved to `localStorage` only).
- **Members, Occasions, Gallery Listeners**: Contain `if (data.length > 0)` check which prevents broadcasting empty list state updates.

---

## 5. Verification Method

1. **Gallery Write Disconnect**: Open `src/App.tsx` lines 343 & 426 and confirm `onSaveGallery` only calls `setGalleryState`.
2. **Custom Types `localStorage` Only**: Open `src/services/storageService.ts` lines 107-115 and confirm `saveCustomIncomeType` uses `localStorage.setItem`.
3. **Listener Guard Bug**: Open `src/services/firestoreService.ts` lines 123, 139, 152 and confirm `if (data.length > 0)` guards.
4. **Full Report**: Inspect `c:\Users\SigmaDesign\Documents\moryagroupweb\.agents\teamwork_preview_explorer_survey_2\analysis.md`.
