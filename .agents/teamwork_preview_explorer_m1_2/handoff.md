# Handoff Report: RBAC Rank Hierarchy Analysis (Explorer M1-2)

## 1. Observation
- **File**: `tests/tier2_rbac.test.ts` (lines 20-28)
  ```typescript
  await group.test('R2.1 - Designation rank mapping for office bearers & members', () => {
    assertEqual(getDesignationRank('अध्यक्ष'), 1, 'अध्यक्ष rank must be 1');
    assertEqual(getDesignationRank('कार्याध्यक्ष'), 2, 'कार्याध्यक्ष rank must be 2');
    assertEqual(getDesignationRank('उपाध्यक्ष'), 3, 'उपाध्यक्ष rank must be 3');
    assertEqual(getDesignationRank('सचिव'), 4, 'सचिव rank must be 4');
    assertEqual(getDesignationRank('खजिनदार'), 5, 'खजिनदार rank must be 5');
    assertEqual(getDesignationRank('उपखजिनदार'), 6, 'उपखजिनदार rank must be 6');
    assertEqual(getDesignationRank('सभासद'), 7, 'सभासद rank must be 7');
  });
  ```
- **File**: `src/utils/rbac.ts` (lines 1-14)
  ```typescript
  export const DESIGNATION_RANKS: Record<string, number> = {
    'अध्यक्ष': 1,
    'उपाध्यक्ष': 2,
    'कार्याध्यक्ष': 3,
    'सचिव': 4,
    'उपसचिव': 5,
    'खजिनदार': 6,
    'उपखजिनदार': 7,
    'संघटक': 8,
    'सहसंघटक': 9,
    'सल्लागार': 10,
    'कार्या सल्लागार': 11,
    'सभासद': 12,
  };
  ```
- **Execution Error**: When running Tier 2 test suite via `$env:Path += ";C:\Program Files\nodejs"; npx tsx -e "import { runTier2Tests } from './tests/tier2_rbac.test'; runTier2Tests().then(console.log);"`:
  ```
  ✗ R2.1 - Designation rank mapping for office bearers & members (0ms)
    Error: कार्याध्यक्ष rank must be 2: Expected 2, got 3
  ```
- **Component Comment**: `src/components/MemberSubscriptionsView.tsx` (lines 338-339):
  `// Sort members strictly in requested order:`
  `// अध्यक्ष → कार्याध्यक्ष → उपाध्यक्ष → सचिव → खजिनदार → उपखजिनदार → सभासद`
- **Mock Data**: `src/mockData.ts` (lines 5-82):
  - M-101: `अध्यक्ष`
  - M-102: `कार्याध्यक्ष`
  - M-103: `उपाध्यक्ष`
  - M-104: `सचिव`
  - M-105: `खजिनदार`
  - M-106: `उपखजिनदार`
  - M-107: `सभासद`

## 2. Logic Chain
1. Test R2.1 in `tests/tier2_rbac.test.ts` validates that `getDesignationRank('कार्याध्यक्ष')` returns `2` and `getDesignationRank('उपाध्यक्ष')` returns `3`.
2. `getDesignationRank` in `src/utils/rbac.ts:54-57` looks up the designation in the `DESIGNATION_RANKS` map.
3. In `src/utils/rbac.ts`, `DESIGNATION_RANKS['कार्याध्यक्ष']` is set to `3` and `DESIGNATION_RANKS['उपाध्यक्ष']` is set to `2`.
4. Therefore, when `getDesignationRank('कार्याध्यक्ष')` is evaluated during test execution, it returns `3`, causing `assertEqual(3, 2)` to fail.
5. In addition, `खजिनदार` (5), `उपखजिनदार` (6), and `सभासद` (7) are set to `6`, `7`, and `12` respectively.
6. Reordering `DESIGNATION_RANKS` in `src/utils/rbac.ts` so `कार्याध्यक्ष` is 2, `उपाध्यक्ष` is 3, `सचिव` is 4, `खजिनदार` is 5, `उपखजिनदार` is 6, and `सभासद` is 7 resolves all test failures in Test R2.1 without affecting fallback behavior tested in Test R2.2 (`getDesignationRank('अज्ञात पद')` -> 10).

## 3. Caveats
- Tier 4 test R3.1 (`tsc --noEmit`) fails due to a separate issue in `src/components/ErrorBoundary.tsx` (`override` modifier issue). That issue is outside the scope of RBAC rank hierarchy (Explorer M1-2) and belongs to Tier 4 / ErrorBoundary scope.
- No other caveats; designation rank ordering is isolated to `src/utils/rbac.ts`.

## 4. Conclusion
To fix test failure R2.1, `DESIGNATION_RANKS` in `src/utils/rbac.ts` must be updated to:
```typescript
export const DESIGNATION_RANKS: Record<string, number> = {
  'अध्यक्ष': 1,
  'कार्याध्यक्ष': 2,
  'उपाध्यक्ष': 3,
  'सचिव': 4,
  'खजिनदार': 5,
  'उपखजिनदार': 6,
  'सभासद': 7,
  'उपसचिव': 8,
  'संघटक': 9,
  'सहसंघटक': 10,
  'सल्लागार': 11,
  'कार्या सल्लागार': 12,
};
```

## 5. Verification Method
1. Modify `src/utils/rbac.ts` with the proposed `DESIGNATION_RANKS` mapping.
2. Execute the test command in PowerShell:
   ```powershell
   $env:Path += ";C:\Program Files\nodejs"
   npx tsx -e "import { runTier2Tests } from './tests/tier2_rbac.test'; runTier2Tests().then(console.log);"
   ```
3. Confirm output displays `8/8 passed` for Tier 2 and `0 Failed`.
