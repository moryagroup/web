# Adversarial Challenge Report: Milestone M1

## 1. Observation

### Empirical Verification Commands & Results:
- **`npx tsc --noEmit`**: Executed standalone with Exit Code 0 and 0 compilation errors when `dist/` is not being concurrently modified.
- **`npm run build`**: Executed successfully (Exit Code 0). Production bundle generated in `dist/` containing `index.html` (529 B), `assets/index-CCVRswVa.js` (875.8 kB), `assets/index-CZjCPqEB.css` (75.4 kB), and associated web chunks.
- **`npx tsx tests/runner.ts`**:
  - Tiers 1, 2, and 3: 24/24 tests passed.
  - Tier 4 (R3.1 `tsc --noEmit`): FAILED with `error TS6053: File '.../dist/assets/index-Dup7ABdq.js' not found` when `tsc` scanned `dist/` while files were modified or deleted by Vite. Root cause: `tsconfig.json` lacks `"exclude": ["dist", "node_modules"]`.

### Adversarial Stress Test Findings (`src/utils/rbac.ts`):
Ran custom adversarial stress test suite (`.agents/teamwork_preview_challenger_m1_1/adversarial_rbac.ts`):

1. **`getDesignationRank("toString")` returns Function object instead of number**:
   - `getDesignationRank("toString")` evaluates to `function toString() { [native code] }` (type `function`).
   - `getDesignationRank("__proto__")` evaluates to `Object.prototype` (type `object`).
   - `getDesignationRank("constructor")` evaluates to `function Object() { [native code] }`.
   - Cause: `DESIGNATION_RANKS` in `src/utils/rbac.ts` is defined as a standard JS object (`Record<string, number>`), which inherits from `Object.prototype`. Un-guarded key lookup `DESIGNATION_RANKS[designation.trim()]` resolves prototype methods/properties.

2. **`getDesignationRank("   ")` returns rank 10 instead of default 99**:
   - `getDesignationRank("   ")` evaluates to `10` (`सहसंघटक` rank) instead of default rank `99` for missing/empty designation.
   - Cause: `if (!designation) return 99;` only checks falsy values. Non-empty whitespace string `"   "` passes the guard. `designation.trim()` becomes `""`. `DESIGNATION_RANKS[""] || 10` returns fallback `10`.

3. **`isBadgedMember` accepts arbitrary unrecognized roles**:
   - `isBadgedMember("Guest")` and `isBadgedMember("Unassigned")` return `true`.
   - Cause: `if (!trimmed || trimmed === 'सभासद') return false; return true;` treats any non-empty string other than `'सभासद'` as a valid office-bearer badged member.

---

## 2. Logic Chain

1. **TypeScript Compiler & Build Integrity**:
   - `npx tsc --noEmit` verifies strict type correctness across source files cleanly when `dist` is excluded or absent.
   - However, because `tsconfig.json` omits an `exclude` block for `"dist"`, `tsc --noEmit` includes generated `.js` files in `dist/assets/` under the default glob `**/*` (due to `"allowJs": true`). When `vite build` cleans `dist/`, `tsc` fails with `TS6053` missing file errors.
2. **RBAC Flaws**:
   - `DESIGNATION_RANKS` is used to order members and determine hierarchy. When sorting members by designation rank (`a.rank - b.rank`), passing `"toString"` causes `getDesignationRank("toString")` to return a function object. `1 - function` results in `NaN`, breaking array sort stability or throwing unexpected runtime errors.
   - `getDesignationRank("   ")` returning `10` gives blank whitespace designations a higher hierarchy position than `सल्लागार` (11), `कार्या सल्लागार` (12), or unranked members (99). `getDesignationRank` must check `if (!designation || !designation.trim()) return 99;`.
   - `DESIGNATION_RANKS` key access must use `Object.prototype.hasOwnProperty.call(DESIGNATION_RANKS, key)` or `Object.hasOwn()` to prevent prototype pollution returns.

---

## 3. Caveats

- Standalone execution of `npx tsc --noEmit` and `npm run build` succeeds cleanly.
- The 26 baseline tests in `tests/runner.ts` pass when `dist` is not concurrently modified; however, the suite is vulnerable to transient failures due to `tsconfig.json` scoping.

---

## 4. Conclusion

**VERDICT: REJECT**

Milestone M1 cannot be approved in its current state due to the following blocking failure modes:
1. **Security & Type Safety Bug in RBAC (`rbac.ts`)**: Prototype method lookup collision in `getDesignationRank` (`"toString"` returns `Function` instead of `number`).
2. **Logic Bug in RBAC (`rbac.ts`)**: Whitespace string `"   "` in `getDesignationRank` returns rank `10` instead of `99`.
3. **Build & Test Infrastructure Vulnerability**: Missing `exclude: ["dist"]` in `tsconfig.json` causes `npx tsx tests/runner.ts` / `npx tsc --noEmit` to fail when `dist` exists.

---

## 5. Verification Method

To independently reproduce all adversarial findings and verify this verdict:

1. **Reproduce RBAC Bugs**:
   Run the adversarial test script:
   ```powershell
   $env:Path += ";C:\Program Files\nodejs"
   npx tsx .agents/teamwork_preview_challenger_m1_1/adversarial_rbac.ts
   ```
   *Observed Failure Output:*
   - `FAIL: getDesignationRank("   ") returns 99 (Got 10)`
   - `FAIL: getDesignationRank("toString") returns 10 (Got function toString() { [native code] })`

2. **Reproduce tsconfig dist collision in test runner**:
   Run `npm run build` followed immediately by `npx tsx tests/runner.ts`:
   ```powershell
   npm run build
   npx tsx tests/runner.ts
   ```
   *Observed Output:* Tier 4 R3.1 fails with `TS6053: File ... dist/assets/... not found`.
