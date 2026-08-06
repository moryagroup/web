# Milestone M1 Analysis: Default Guest Mode Refactoring

## Executive Summary
Milestone M1 addresses the default auto-login bug where initial application load (when `localStorage` is empty or cleared) defaulted to an authenticated Treasurer account (`DEFAULT_USER` set to Sanket Kaule with `isLoggedIn` undefined). Under M1, the default state must be an unauthenticated Guest user (`{ name: 'पाहुणा (Guest)', role: 'सभासद', isLoggedIn: false }`).

This report provides the analysis of existing authentication flow, exact code edits required across `mockData.ts`, `storageService.ts`, and `App.tsx`, verification of component-level `isLoggedIn` handling, and confirmation of `handleLogout` state persistence.

---

## 1. Analysis of Current State

### 1.1 Root Cause of Auto-Login Bug
In `src/mockData.ts`:
```typescript
export const DEFAULT_USER: CurrentUser = {
  name: 'संकेत कौले',
  role: 'खजिनदार',
  phone: '9822010104',
};
```
- `DEFAULT_USER` specifies `name: 'संकेत कौले'` and `role: 'खजिनदार'`. Crucially, `isLoggedIn` is omitted/undefined.
- Across UI components, `isLoggedIn` is evaluated as:
  ```typescript
  const isLoggedIn = currentUser.isLoggedIn !== false;
  ```
- When `currentUser.isLoggedIn` is `undefined`, `undefined !== false` evaluates to `true`.
- Consequently, on first load or when `localStorage` is empty, `getStoredUser()` returns `DEFAULT_USER`, which evaluates as logged-in Treasurer Sanket Kaule with full access.

### 1.2 User Data Flow & Persistence Architecture
1. **Initial Load**:
   - `App.tsx` initializes `currentUser` state via `useState<CurrentUser>(getStoredUser)`.
   - `getStoredUser()` in `src/services/storageService.ts` checks `localStorage.getItem('morya_mandal_user_v2')`.
   - If `localStorage` has no key or invalid data, it returns `DEFAULT_USER`.
2. **State Synchronization**:
   - `App.tsx` has a `useEffect` that calls `saveUser(currentUser)` whenever `currentUser` changes.
   - `saveUser` writes the JSON-serialized user object to `localStorage`.
3. **Logout Flow**:
   - `handleLogout` in `App.tsx` sets `currentUser` to Guest state and `activeTab` to `'dashboard'`.
   - The `useEffect` syncs this Guest object to `localStorage`.

---

## 2. Precise Code Edits Required

### Edit 1: `src/mockData.ts` (Lines 405–409)
Update `DEFAULT_USER` to represent an unauthenticated Guest visitor.

**Target File**: `src/mockData.ts`
**Current Code**:
```typescript
export const DEFAULT_USER: CurrentUser = {
  name: 'संकेत कौले',
  role: 'खजिनदार',
  phone: '9822010104',
};
```
**Replacement Code**:
```typescript
export const DEFAULT_USER: CurrentUser = {
  name: 'पाहुणा (Guest)',
  role: 'सभासद',
  isLoggedIn: false,
};
```

### Edit 2: `src/services/storageService.ts` (Lines 102–109)
Verify fallback behavior in `getStoredUser()`.

**Target File**: `src/services/storageService.ts`
**Current Code**:
```typescript
export const getStoredUser = (): CurrentUser => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER);
    return data ? JSON.parse(data) : DEFAULT_USER;
  } catch {
    return DEFAULT_USER;
  }
};
```
*Note*: No structural edit is required in `getStoredUser()` logic itself because it already returns `DEFAULT_USER`. Since `DEFAULT_USER` in `mockData.ts` is updated to `{ name: 'पाहुणा (Guest)', role: 'सभासद', isLoggedIn: false }`, `getStoredUser()` automatically returns the Guest object when `localStorage` is empty or corrupted.

### Edit 3: `src/App.tsx` (Lines 100–107)
Verify `handleLogout` resetting state to the Guest object (`DEFAULT_USER`).

**Target File**: `src/App.tsx`
**Current Code**:
```typescript
  // Logout handler
  const handleLogout = () => {
    setCurrentUser({
      name: 'पाहुणा (Guest)',
      role: 'सभासद',
      isLoggedIn: false,
    });
    setActiveTab('dashboard');
  };
```
**Proposed Clean Code**:
```typescript
  // Logout handler
  const handleLogout = () => {
    setCurrentUser(DEFAULT_USER);
    setActiveTab('dashboard');
  };
```
*Rationale*: Using `DEFAULT_USER` ensures single source of truth for the Guest user definition across `mockData.ts`, `storageService.ts`, and `App.tsx`.

---

## 3. Component Verification of `isLoggedIn` Checks

All UI components rely on `isLoggedIn` evaluation. Here is the behavior audit when `currentUser.isLoggedIn` is `false`:

| Component | `isLoggedIn` Logic | Behavior when `isLoggedIn: false` |
| border | border | border |
| `Sidebar.tsx` | `const isLoggedIn = currentUser.isLoggedIn !== false;` | Hides financial/admin navigation links (`income-form`, `expense-form`, `income-history`, `expense-history`, `member-subscriptions`). Displays "पाहुणा मोड (Guest Mode)" card with Login button. |
| `HeaderStats.tsx` | `const isLoggedIn = currentUser.isLoggedIn !== false;` | Hides financial statistics (Total Income, Total Expense, Net Balance) and displays public header banner with Mandal title and Login prompt button. |
| `DashboardView.tsx` | `const isLoggedIn = currentUser.isLoggedIn !== false;` | Hides recent financial transactions and pending expense approval section. Displays public welcome banner ("सार्वजनिक उत्सव दालन") and Event Gallery photo section. |
| `IncomeForm.tsx` | `const isLoggedIn = currentUser.isLoggedIn !== false;` | Renders `RbacGuard` prompt ("जमा नोंदणीसाठी लॉगिन आवश्यक") blocking entry until logged in. |
| `ExpenseForm.tsx` | `const isLoggedIn = currentUser.isLoggedIn !== false;` | Renders `RbacGuard` prompt ("खर्च नोंदणीसाठी लॉगिन आवश्यक") blocking entry until logged in. |
| `IncomeHistory.tsx` | `const isLoggedIn = currentUser?.isLoggedIn !== false;` | Renders `RbacGuard` prompt ("जमा इतिहास पाहण्यासाठी लॉगिन आवश्यक") blocking access. |
| `ExpenseHistory.tsx` | `const isLoggedIn = currentUser.isLoggedIn !== false;` | Renders `RbacGuard` prompt ("खर्च इतिहास पाहण्यासाठी लॉगिन आवश्यक") blocking access. |
| `MemberSubscriptionsView.tsx` | `const isBadged = isBadgedMember(role) && isLoggedIn;` | Blocked by `App.tsx` navigation guard, which redirects non-logged-in users back to `'dashboard'`. |
| `ProfileView.tsx` | `const isLoggedIn = currentUser.isLoggedIn !== false;` | Renders Guest Security Lock screen ("वैयक्तिक प्रोफाईल व योगदान सुरक्षित आहे") with Login prompt. |

---

## 4. Verification of `handleLogout` and Persistence

1. **Triggering Logout**:
   User clicks "लॉगआउट (Logout)" in Sidebar, HeaderStats, or Dashboard.
2. **State Transformation**:
   `handleLogout` sets `currentUser` to `DEFAULT_USER` (`{ name: 'पाहुणा (Guest)', role: 'सभासद', isLoggedIn: false }`) and `activeTab` to `'dashboard'`.
3. **Storage Sync**:
   `useEffect` in `App.tsx` executes `saveUser(currentUser)`, storing `{"name":"पाहुणा (Guest)","role":"सभासद","isLoggedIn":false}` under key `morya_mandal_user_v2` in `localStorage`.
4. **App Re-render**:
   - `Sidebar` updates to Guest Mode layout.
   - `HeaderStats` updates to Public Header layout.
   - `DashboardView` updates to Public Photo Gallery layout.
   - Attempts to navigate to protected routes render `RbacGuard` login prompts.

---

## 5. Summary of Edits for Implementation Team

1. In `src/mockData.ts`:
   - Replace `DEFAULT_USER` definition with `{ name: 'पाहुणा (Guest)', role: 'सभासद', isLoggedIn: false }`.
2. In `src/App.tsx`:
   - Update `handleLogout` to set `setCurrentUser(DEFAULT_USER);`.
3. Verification:
   - Run build check (`npm run build`) to ensure zero TypeScript errors.
