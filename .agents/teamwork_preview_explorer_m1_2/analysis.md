# Analysis Report: RBAC Designation Rank Hierarchy Alignment

## Executive Summary
Test `R2.1` in `tests/tier2_rbac.test.ts` fails because `src/utils/rbac.ts` maps `कार्याध्यक्ष` to rank `3` and `उपाध्यक्ष` to rank `2`. The expected organizational hierarchy in Morya Group (and asserted by `R2.1`) defines `कार्याध्यक्ष` (Working/Executive President) as rank `2` (directly below `अध्यक्ष` President at rank `1`) and `उपाध्यक्ष` (Vice President) as rank `3`. Furthermore, key roles `खजिनदार`, `उपखजिनदार`, and `सभासद` were assigned ranks `6`, `7`, and `12` instead of `5`, `6`, and `7`.

---

## 1. Evidence & Observations

### Observation 1: Test R2.1 Assertions (`tests/tier2_rbac.test.ts:20-28`)
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

### Observation 2: Current `DESIGNATION_RANKS` in `src/utils/rbac.ts:1-14`
```typescript
export const DESIGNATION_RANKS: Record<string, number> = {
  'अध्यक्ष': 1,
  'उपाध्यक्ष': 2,        // <--- MISMATCH (expected 3)
  'कार्याध्यक्ष': 3,    // <--- MISMATCH (expected 2)
  'सचिव': 4,
  'उपसचिव': 5,
  'खजिनदार': 6,         // <--- MISMATCH (expected 5)
  'उपखजिनदार': 7,       // <--- MISMATCH (expected 6)
  'संघटक': 8,
  'सहसंघटक': 9,
  'सल्लागार': 10,
  'कार्या सल्लागार': 11,
  'सभासद': 12,          // <--- MISMATCH (expected 7)
};
```

### Observation 3: Component Comments & Mock Data Alignment
1. **`src/components/MemberSubscriptionsView.tsx:338-339`**:
   ```typescript
   // Sort members strictly in requested order:
   // अध्यक्ष → कार्याध्यक्ष → उपाध्यक्ष → सचिव → खजिनदार → उपखजिनदार → सभासद
   ```
2. **`src/mockData.ts:5-82`**:
   - `M-101`: `राकेश पोटे` (`अध्यक्ष`)
   - `M-102`: `प्रशांत सुरेकर` (`कार्याध्यक्ष`)
   - `M-103`: `विजय जगताप` (`उपाध्यक्ष`)
   - `M-104`: `धनंजय इंगळे` (`सचिव`)
   - `M-105`: `संकेत कौले` (`खजिनदार`)
   - `M-106`: `उदय हेरवाडे` (`उपखजिनदार`)
   - `M-107`: `महेश शिंदे` (`सभासद`)

Member codes `M-101` through `M-107` directly reflect this exact sequence: `अध्यक्ष` (1) → `कार्याध्यक्ष` (2) → `उपाध्यक्ष` (3) → `सचिव` (4) → `खजिनदार` (5) → `उपखजिनदार` (6) → `सभासद` (7).

---

## 2. Logic Chain

1. Test `R2.1` calls `getDesignationRank('कार्याध्यक्ष')`.
2. `getDesignationRank` evaluates `DESIGNATION_RANKS['कार्याध्यक्ष'] || 10`.
3. In `src/utils/rbac.ts`, `DESIGNATION_RANKS['कार्याध्यक्ष']` is `3`.
4. Test fails with error: `कार्याध्यक्ष rank must be 2: Expected 2, got 3`.
5. Likewise, `उपाध्यक्ष` returns `2` (expected `3`), `खजिनदार` returns `6` (expected `5`), `उपखजिनदार` returns `7` (expected `6`), and `सभासद` returns `12` (expected `7`).
6. Reordering `DESIGNATION_RANKS` in `src/utils/rbac.ts` aligns `DESIGNATION_RANKS` with `tests/tier2_rbac.test.ts:R2.1`, `MemberSubscriptionsView.tsx`, and `mockData.ts`.

---

## 3. Required Code Change

Target File: `src/utils/rbac.ts`
Lines to modify: Lines 1-14

### Before:
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

### After:
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

---

## 4. Verification Method
Run Tier 2 unit test suite using:
```powershell
$env:Path += ";C:\Program Files\nodejs"
npx tsx -e "import { runTier2Tests } from './tests/tier2_rbac.test'; runTier2Tests().then(console.log);"
```
Expected result: All 8 Tier 2 tests pass (0 failures).
