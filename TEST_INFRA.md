# Test Infrastructure & Methodology — Morya Group Web App

## Overview
This document specifies the testing architecture, methodology, and coverage breakdown for the Morya Group Web App Authentication Refactoring project.

The test suite is structured into 4 isolated, self-contained tiers executed via TypeScript (`tsx`) and Node.js.

---

## Test Architecture & Tier Structure

```
tests/
├── test_helper.ts                 # Storage polyfill, DOM window mock, assertion engine
├── tier1_storage_default.test.ts  # Tier 1: Storage fallback & Guest default state
├── tier2_rbac.test.ts             # Tier 2: RBAC permissions, ranks & security access
├── tier3_auth_flow.test.ts        # Tier 3: Admin & Member LoginModal validation, logout reset
├── tier4_build_verification.test.ts # Tier 4: TypeScript typecheck (tsc) & Vite build check
└── runner.ts                      # Master test runner aggregating Tiers 1-4
```

---

## Methodology & Tier Descriptions

### Tier 1: Storage Service & Default Guest State (`tests/tier1_storage_default.test.ts`)
- **Focus**: Unit testing data persistence and fallback behavior when `localStorage` is empty or corrupted.
- **Coverage**:
  - `R1.1`: Empty `localStorage` fallback to Guest state (`isLoggedIn: false`).
  - `R1.2`: Saving and retrieving `CurrentUser` state.
  - `R1.3`: Corrupted JSON handling in `localStorage`.
  - `R1.4`: Data reset via `resetToDemoData()`.
  - `R1.5` - `R1.9`: Incomes, Expenses, Members, Custom Income Types, and Mandal Logo persistence.

### Tier 2: Role-Based Access Control (RBAC) (`tests/tier2_rbac.test.ts`)
- **Focus**: Unit & integration testing of role hierarchy, permission helpers, and designation ranks in `src/utils/rbac.ts`.
- **Coverage**:
  - `R2.1` & `R2.2`: Designation rank calculations (`getDesignationRank`) for all roles ('अध्यक्ष', 'कार्याध्यक्ष', 'उपाध्यक्ष', 'सचिव', 'खजिनदार', 'उपखजिनदार', 'सभासद', unknown/empty).
  - `R2.3` & `R2.4`: Financial access checks (`hasFullFinancialAccess`) for authorized roles ('अध्यक्ष', 'खजिनदार', 'उपखजिनदार', 'ॲडमिन', 'Admin') vs unauthorized roles.
  - `R2.5` & `R2.6`: Administrative permission checks (`hasAdminPermissions`).
  - `R2.7`: Badged office bearer checks (`isBadgedMember`).
  - `R2.8`: Adversarial input testing (whitespace trimming, case variations, Marathi Unicode strings).

### Tier 3: Authentication Flow & Login Validation (`tests/tier3_auth_flow.test.ts`)
- **Focus**: Authentication logic validation for Admin and Member logins via `LoginModal` and state reset on Logout.
- **Coverage**:
  - `R2.9` & `R2.10`: Admin password authentication (valid password `Tom&jerry5633#` vs invalid password).
  - `R2.11`: Password input whitespace trimming.
  - `R2.12` - `R2.14`: Member password check (no password vs password set vs Admin account switch override).
  - `R1.10`: Logout state reset cleanly reverting `currentUser` to Guest user (`name: 'पाहुणा (Guest)', role: 'सभासद', isLoggedIn: false`).

### Tier 4: Code Integrity & Build Check (`tests/tier4_build_verification.test.ts`)
- **Focus**: Full project compilation and production bundle verification.
- **Coverage**:
  - `R3.1`: TypeScript type check (`tsc --noEmit`) to verify 0 type errors across all `.ts` and `.tsx` source files.
  - `R3.2`: Production build (`vite build`) to verify Vite bundles clean web application distribution artifacts.

---

## Execution Command

```powershell
$env:PATH = "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Microsoft\VisualStudio\NodeJs;$env:PATH"; npx tsx tests/runner.ts
```
