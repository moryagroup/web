# State Management & Authentication Investigation Analysis

## Executive Summary
This document provides a detailed investigation of the current state management, user authentication initialization, `localStorage` usage, default user state, and RBAC permissions in the Morya Group web application (`moryagroupweb`).

---

## 1. Authentication & User State Initialization on App Load

### App Load Flow
1. **Initial State Declaration**:
   - File: `src/App.tsx` (Line 54)
   - Code:
     ```typescript
     const [currentUser, setCurrentUser] = useState<CurrentUser>(getStoredUser);
     ```
   - On initial component render, `useState` synchronously calls `getStoredUser()`.

2. **Storage Helper Logic**:
   - File: `src/services/storageService.ts` (Lines 102–109)
   - Code:
     ```typescript
     export const getStoredUser = (): CurrentUser => {
       try {
         const data = localStorage.getItem(STORAGE_KEYS.USER); // 'morya_mandal_user_v2'
         return data ? JSON.parse(data) : DEFAULT_USER;
       } catch {
         return DEFAULT_USER;
       }
     };
     ```
   - When no user object exists in `localStorage`, `getStoredUser` returns `DEFAULT_USER`.

3. **Evaluation of `isLoggedIn` across components**:
   - `CurrentUser` interface (`src/types.ts`, lines 149–157) defines `isLoggedIn?: boolean;`.
   - Across the codebase, components evaluate authentication status as:
     ```typescript
     const isLoggedIn = currentUser.isLoggedIn !== false;
     ```
   - Observed instances of `currentUser.isLoggedIn !== false`:
     - `src/App.tsx` (Line 84)
     - `src/components/Sidebar.tsx` (Line 129)
     - `src/components/HeaderStats.tsx` (Line 24)
     - `src/components/DashboardView.tsx` (Line 96)
     - `src/components/IncomeForm.tsx` (Line 199)
     - `src/components/ExpenseForm.tsx` (Line 158)
     - `src/components/IncomeHistory.tsx` (Line 40)
     - `src/components/ExpenseHistory.tsx` (Line 41)
     - `src/components/MemberSubscriptionsView.tsx` (Line 56)

### Root Cause of Default Auto-Login Bug
- `DEFAULT_USER` in `src/mockData.ts` (lines 405–409) is defined as:
  ```typescript
  export const DEFAULT_USER: CurrentUser = {
    name: 'संकेत कौले',
    role: 'खजिनदार',
    phone: '9822010104',
  };
  ```
- Because `DEFAULT_USER` does **not** specify `isLoggedIn`, `currentUser.isLoggedIn` evaluates to `undefined`.
- In the check `currentUser.isLoggedIn !== false`, `undefined !== false` evaluates to **`true`**.
- Consequently, on first load (or whenever `localStorage` is empty), the user is **automatically logged in** as 'संकेत कौले' with role 'खजिनदार' (Treasurer).

---

## 2. Default User Data & Guest State Definitions

### Default User Object Location
- File: `src/mockData.ts` (Lines 405–409)
  ```typescript
  export const DEFAULT_USER: CurrentUser = {
    name: 'संकेत कौले',
    role: 'खजिनदार',
    phone: '9822010104',
  };
  ```

### Guest User State Definition (Logout state)
- File: `src/App.tsx` (Lines 100–107) in `handleLogout`:
  ```typescript
  const handleLogout = () => {
    setCurrentUser({
      name: 'पाहुणा (Guest)',
      role: 'सभासद',
      isLoggedIn: false,
    });
    setActiveTab('dashboard');
  };
  ```

### Credentials & Member Accounts
- Admin login check: `src/components/LoginModal.tsx` (Lines 88–98)
  - Admin password: `Tom&jerry5633#`
  - Yields user: `{ name: 'सिस्टम ॲडमिन', role: 'ॲडमिन', phone: '९८२२०१०१००', isLoggedIn: true }`
- Member account database: `INITIAL_MEMBERS` in `src/mockData.ts` (Lines 3–376). Members may have individual `password` strings.

---

## 3. `localStorage` Read & Write Locations

### Storage Key Definition
- File: `src/services/storageService.ts` (Line 26)
  - `USER: 'morya_mandal_user_v2'`

### Read Operation
- File: `src/services/storageService.ts` (Lines 102–109): `getStoredUser()` reads `localStorage.getItem('morya_mandal_user_v2')`.

### Write Operations
- File: `src/services/storageService.ts` (Lines 111–113):
  ```typescript
  export const saveUser = (user: CurrentUser) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  };
  ```
- Triggered in `src/App.tsx` (Lines 82–87) via `useEffect`:
  ```typescript
  useEffect(() => {
    saveUser(currentUser);
    if (activeTab === 'member-subscriptions' && (!currentUser.isLoggedIn || !isBadgedMember(currentUser.role))) {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab]);
  ```
- Reset operation: `resetToDemoData()` in `src/services/storageService.ts` (Line 155) calls `localStorage.removeItem('morya_mandal_user_v2')`.

---

## 4. Public Pages/Views vs. Protected Admin & Member Actions

| View / Action | Public / Protected | Behavior when Logged Out (`isLoggedIn: false`) | Relevant Files & Lines |
|---|---|---|---|
| **Dashboard / Home (`dashboard`)** | **Public** | Displays public header & `EventGallerySection` (Public photo gallery). Hides financial overview. | `DashboardView.tsx` (lines 98–156), `HeaderStats.tsx` (lines 30–63) |
| **Profile View (`profile`)** | **Public preview** | Accessible from sidebar, allows viewing public information. | `Sidebar.tsx` (line 135), `ProfileView.tsx` |
| **Income Entry (`income-form`)** | **Protected** | Renders `RbacGuard` requiring user to log in. | `IncomeForm.tsx` (lines 199–210), `App.tsx` |
| **Expense Entry (`expense-form`)** | **Protected** | Renders `RbacGuard` requiring user to log in. | `ExpenseForm.tsx` (lines 158–169), `App.tsx` |
| **Income History (`income-history`)** | **Protected** | Renders `RbacGuard` requiring user to log in. | `IncomeHistory.tsx` (lines 40–51), `App.tsx` |
| **Expense History (`expense-history`)** | **Protected** | Renders `RbacGuard` requiring user to log in. | `ExpenseHistory.tsx` (lines 41–52), `App.tsx` |
| **Member Subscriptions (`member-subscriptions`)** | **Protected (Badged Members Only)** | Hidden in sidebar menu when logged out. Redirects to dashboard if accessed directly. | `Sidebar.tsx` (line 140), `App.tsx` (lines 84–86 & 277–302) |
| **Expense Approval** | **Protected (Admin/Officers)** | Can only be performed by logged-in users with roles: अध्यक्ष, खजिनदार, सचिव, उपखजिनदार, ॲडमिन. | `DashboardView.tsx` (lines 93–95, 271–277), `ExpenseHistory.tsx` |
| **Account Switching without Password** | **Protected (Admin Only)** | Password-less switching is strictly guarded by `currentUser.role === 'ॲडमिन' && currentUser.isLoggedIn !== false`. Non-admins are prompted for password if target account has a password set. | `Sidebar.tsx` (lines 146–200), `LoginModal.tsx` (lines 108–117) |

---

## Proposed Refactoring Strategy (For Implementer)

1. **Update Default User State**:
   - Change `DEFAULT_USER` in `src/mockData.ts` to represent an unauthenticated Guest:
     ```typescript
     export const DEFAULT_USER: CurrentUser = {
       name: 'पाहुणा (Guest)',
       role: 'सभासद',
       isLoggedIn: false,
     };
     ```
2. **Standardize `isLoggedIn` evaluation**:
   - Change `const isLoggedIn = currentUser.isLoggedIn !== false;` to `const isLoggedIn = Boolean(currentUser.isLoggedIn);` across components or ensure `isLoggedIn` is explicitly `false` on guest user.
3. **Verify App Initialization & Reset**:
   - Test initial load without `localStorage` data -> user must load as `isLoggedIn: false`.
   - Test `resetToDemoData()` -> user must reset to Guest mode (`isLoggedIn: false`).
