# Adversarial Challenge Analysis Report — Milestone M1

**Verdict**: `REJECT`

## Challenge Summary

- **Target Milestone**: M1 (Default Guest Mode Refactoring — Requirement R1)
- **Overall Risk Assessment**: HIGH
- **Empirical Test Suite**: `src/services/storageService.test.ts` (executed via Node.js + tsx loader)
- **Compilation Check**: `npm run lint` (`tsc --noEmit`) -> PASS | `npm run build` (`vite build`) -> PASS (17.38s)

---

## 1. Executive Summary & Verdict Rationale

Milestone M1 refactoring correctly sets `DEFAULT_USER` to `{ name: 'पाहुणा (Guest)', role: 'सभासद', isLoggedIn: false }` for pristine/empty `localStorage` entries and cleanly handles logout resets. However, adversarial stress testing revealed **three critical failure modes** in storage state parsing and access-control logic:

1. **Security / Guest Mode Fallback Bypass (Pre-Existing User Data)**:
   Existing user data stored in `localStorage` prior to M1 refactoring (e.g. `{"name":"संकेत कौले","role":"खजिनदार"}`) lacks the `isLoggedIn` boolean field. Because components evaluate `isLoggedIn` using `currentUser.isLoggedIn !== false`, `undefined !== false` evaluates to `true`. As a result, users with legacy session data bypass Guest Mode entirely and retain full Admin/Treasurer privileges upon opening the app.
2. **Unhandled `null` Storage Crash**:
   When `localStorage` stores the string `"null"`, `JSON.parse("null")` evaluates to JavaScript `null`. `getStoredUser()` returns `null`, causing immediate uncaught `TypeError` crashes in `App.tsx`, `Sidebar.tsx`, `HeaderStats.tsx`, and `DashboardView.tsx`.
3. **Unhandled Non-Object Primitive & Null Property Crashes**:
   When `localStorage` contains a primitive number (e.g. `"12345"`) or an object with `null` fields (`{ name: null, role: null }`), `getStoredUser()` returns the primitive or invalid object, causing uncaught `TypeError` crashes (e.g., `Cannot read properties of null/undefined (reading 'substring')`).

---

## 2. Empirical Test Harness Results (`src/services/storageService.test.ts`)

Execution Command: `node --import tsx src/services/storageService.test.ts`

```text
===============================================================
       MILESTONE M1 ADVERSARIAL STRESS TEST SUITE RESULTS      
===============================================================
[SCENARIO 1] Empty localStorage:
  Stored raw data: undefined
  Parsed user object: {"name":"पाहुणा (Guest)","role":"सभासद","isLoggedIn":false}
  Result: PASS

[SCENARIO 2] Corrupted / Invalid JSON string:
  Stored raw data: {invalid_json_format: true,
  Parsed user object: {"name":"पाहुणा (Guest)","role":"सभासद","isLoggedIn":false}
  Result: PASS

[SCENARIO 3] Stored string "null":
  Stored raw data: null
  Parsed user object: null
  Component Execution Result: CRASH -> Cannot read properties of null (reading 'isLoggedIn')
  Result: FAIL (Uncaught null reference crash)

[SCENARIO 4] Stored Primitive Number 12345:
  Stored raw data: 12345
  Parsed user object: 12345
  Component Execution Result: CRASH -> Cannot read properties of undefined (reading 'substring')
  Result: FAIL (Uncaught type error on non-object stored state)

[SCENARIO 5] Pre-existing User Data without isLoggedIn property:
  Stored raw data: {"name":"संकेत कौले","role":"खजिनदार","phone":"9822010104"}
  Parsed user object: {"name":"संकेत कौले","role":"खजिनदार","phone":"9822010104"}
  Evaluated isLoggedIn (currentUser.isLoggedIn !== false): true
  Result: FAIL (Old stored user incorrectly treated as Logged-In Admin/Treasurer)

[SCENARIO 6] User object with null properties ({ name: null, role: null, isLoggedIn: null }):
  Stored raw data: {"name":null,"role":null,"isLoggedIn":null}
  Parsed user object: {"name":null,"role":null,"isLoggedIn":null}
  Component Execution Result: CRASH -> Cannot read properties of null (reading 'substring')
  Result: FAIL (Uncaught null reference on user.name)

[SCENARIO 7] Logout Reset Consistency:
  Stored raw data after saveUser(DEFAULT_USER): {"name":"पाहुणा (Guest)","role":"सभासद","isLoggedIn":false}
  Parsed user object: {"name":"पाहुणा (Guest)","role":"सभासद","isLoggedIn":false}
  Result: PASS
===============================================================
```

---

## 3. Specific Findings & Failure Modes

### Finding 1 [HIGH RISK]: Legacy User Data Bypasses Guest Mode
- **Affected File**: `src/services/storageService.ts` line 104-111 & component `isLoggedIn` guard checks across `Sidebar.tsx`, `HeaderStats.tsx`, `DashboardView.tsx`, `IncomeForm.tsx`, `ExpenseForm.tsx`, `IncomeHistory.tsx`, `ExpenseHistory.tsx`, `MemberSubscriptionsView.tsx`, `ProfileView.tsx`.
- **Mechanism**: `currentUser.isLoggedIn !== false` returns `true` when `currentUser.isLoggedIn` is `undefined`.
- **Requirement Conflict**: Requirement R1 states: *"Ensure that on initial application load (or when no user is saved in localStorage), the app defaults to an unauthenticated Guest user state (isLoggedIn: false)."*
- **Impact**: Any user returning to the site with a stored user identity from prior versions will be automatically authenticated with full administrative capabilities without passing password verification.

### Finding 2 [MEDIUM RISK]: Unhandled `null` and Primitive Values in `getStoredUser()`
- **Affected File**: `src/services/storageService.ts` line 106-107:
  ```typescript
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  return data ? JSON.parse(data) : DEFAULT_USER;
  ```
- **Mechanism**: `localStorage.getItem` returns `"null"` when `"null"` was saved. `data` is truthy, so `JSON.parse("null")` returns JavaScript `null`. `getStoredUser()` returns `null` instead of `DEFAULT_USER`.
- **Impact**: Application crashes on load (`TypeError: Cannot read properties of null (reading 'isLoggedIn')`).

---

## 4. Required Actionable Mitigations

To pass Milestone M1 adversarial criteria, the worker must apply the following structural fixes:

1. **Robust Validation in `storageService.ts`**:
   Update `getStoredUser()` to strictly validate that the parsed result is a non-null object with valid string properties and explicit `isLoggedIn === true` status:
   ```typescript
   export const getStoredUser = (): CurrentUser => {
     try {
       const data = localStorage.getItem(STORAGE_KEYS.USER);
       if (!data) return DEFAULT_USER;
       const parsed = JSON.parse(data);
       if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return DEFAULT_USER;
       if (!parsed.name || typeof parsed.name !== 'string') return DEFAULT_USER;
       // Require explicit isLoggedIn === true; otherwise fallback to DEFAULT_USER
       if (parsed.isLoggedIn !== true) return DEFAULT_USER;
       return parsed;
     } catch {
       return DEFAULT_USER;
     }
   };
   ```

2. **Explicit `isLoggedIn` Check in Components**:
   Change `isLoggedIn` evaluation in components from `currentUser.isLoggedIn !== false` to `currentUser.isLoggedIn === true`.

---

## 5. Unchallenged Areas

- **Vite Configuration & Build Pipeline**: Unmodified and verified working (`dist/index.html` generated in 17.38s).
- **TypeScript Static Typing**: `tsc --noEmit` passes with 0 errors.
