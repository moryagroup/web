## 2026-08-06T11:26:15Z
You are Worker M1 (Type & Build Foundation Worker).
Working directory: c:\Users\SigmaDesign\Documents\moryagroupweb\.agents\teamwork_preview_worker_m1_1
Original Request: c:\Users\SigmaDesign\Documents\moryagroupweb\.agents\ORIGINAL_REQUEST.md
Scope Document: c:\Users\SigmaDesign\Documents\moryagroupweb\PROJECT.md
Explorer Reports to read:
- c:\Users\SigmaDesign\Documents\moryagroupweb\.agents\teamwork_preview_explorer_m1_1\handoff.md
- c:\Users\SigmaDesign\Documents\moryagroupweb\.agents\teamwork_preview_explorer_m1_2\handoff.md

Objective:
Implement all fixes required for Milestone M1 (TypeScript compilation zero errors, RBAC rank hierarchy alignment, and build verification).

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Steps:
1. Read the two explorer handoff reports.
2. Update `package.json` to include `@types/react` (^19.0.10) and `@types/react-dom` (^19.0.4) in `devDependencies`.
3. Fix `src/App.tsx` (pass `selectedYear` and `setSelectedYear` to `<DashboardView>`).
4. Fix `src/components/ProfileView.tsx` (`onClick` event handler type issue).
5. Fix `src/components/StatementExportView.tsx` (`dateStr` -> `transactionDate`, `receiptNumber`/`invoiceNumber` -> `billNumber`).
6. Update `src/utils/rbac.ts` (`DESIGNATION_RANKS` map: `कार्याध्यक्ष`: 2, `उपाध्यक्ष`: 3, `खजिनदार`: 5, `उपखजिनदार`: 6, `सभासद`: 7).
7. Execute verification:
   - Run `npx tsc --noEmit`
   - Run `npx tsx tests/runner.ts`
   - Run `npm run build`
8. Write complete execution summary in `handoff.md` and send a message to parent orchestrator with build & test results.
