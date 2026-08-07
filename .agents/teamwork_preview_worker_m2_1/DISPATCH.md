## 2026-08-06T11:38:42Z
Objective:
Complete and harden real-time Firestore synchronization (`morya-group-352ad`) across all 7 domains (Incomes, Expenses, Members, Occasions, Gallery, Suggestions, Settings).

Tasks:
1. Fix empty-state callback suppression in `src/services/firestoreService.ts`:
   - Update `subscribeToMembers`, `subscribeToOccasions`, and `subscribeToGallery` so that when a collection is empty (`data.length === 0`), the listener still calls `callback([])` to keep UI state in sync.
2. Fix Gallery persistence in `src/App.tsx`:
   - Connect gallery add, edit, and delete handlers to `saveGalleryImage` and `deleteGalleryImage` in `firestoreService.ts` so images persist to Firestore and sync in real time across devices via `subscribeToGallery`.
3. Fix Settings Custom Income Types sync:
   - Extend Firestore `AppSetting` / settings document handling in `firestoreService.ts` and `App.tsx` / `SettingsModal.tsx` so custom income types are saved to Firestore and synced across devices in real time alongside `groupLogo`.
4. Implement Occasion Management UI:
   - Create or update `OccasionModal.tsx` (and wire buttons in `App.tsx` or `DashboardView`) to allow creating, editing, and deleting Occasions, backed by `saveOccasion` and `deleteOccasion` in Firestore.
5. Verification:
   - Run `npx tsc --noEmit`
   - Run `npx tsx tests/runner.ts`
   - Run `npm run build`
6. Write full execution handoff report in `handoff.md` and send message to parent orchestrator.
