# Handoff Report: State Management & Authentication Survey

## 1. Observation
- **Observation O1 (Initial User State Load)**:
  In `src/App.tsx` (line 54), `const [currentUser, setCurrentUser] = useState<CurrentUser>(getStoredUser);` is called on app load.
- **Observation O2 (`getStoredUser` Implementation)**:
  In `src/services/storageService.ts` (lines 102–109):
  ```typescript
  export const getStoredUser = (): CurrentUser => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER); // STORAGE_KEYS.USER = 'morya_mandal_user_v2'
      return data ? JSON.parse(data) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  };
  ```
- **Observation O3 (`DEFAULT_USER` Definition)**:
  In `src/mockData.ts` (lines 405–409):
  ```typescript
  export const DEFAULT_USER: CurrentUser = {
    name: 'संकेत कौले',
    role: 'खजिनदार',
    phone: '9822010104',
  };
  ```
- **Observation O4 (`isLoggedIn` Check Pattern)**:
  Across `src/App.tsx` (line 84), `src/components/Sidebar.tsx` (line 129), `src/components/HeaderStats.tsx` (line 24), `src/components/DashboardView.tsx` (line 96), `src/components/IncomeForm.tsx` (line 199), `src/components/ExpenseForm.tsx` (line 158), `src/components/IncomeHistory.tsx` (line 40), `src/components/ExpenseHistory.tsx` (line 41), and `src/components/MemberSubscriptionsView.tsx` (line 56), auth status is evaluated using:
  `const isLoggedIn = currentUser.isLoggedIn !== false;`
- **Observation O5 (`handleLogout` Guest Definition)**:
  In `src/App.tsx` (lines 100–107):
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
- **Observation O6 (Public vs Protected Views)**:
  - Public view when `!isLoggedIn`: `DashboardView.tsx` (lines 98–156) renders `EventGallerySection` and guest welcome banner; `HeaderStats.tsx` (lines 30–63) renders public header with login button.
  - Protected views when `!isLoggedIn`: `IncomeForm.tsx` (lines 199–210), `ExpenseForm.tsx` (lines 158–169), `IncomeHistory.tsx` (lines 40–51), `ExpenseHistory.tsx` (lines 41–52) render `RbacGuard`. `MemberSubscriptionsView.tsx` (line 56 & `App.tsx` line 84) redirects to `dashboard`.

## 2. Logic Chain
1. Step 1: `App.tsx` initializes `currentUser` with `getStoredUser()`. (Ref: Observation O1)
2. Step 2: When `localStorage` has no `'morya_mandal_user_v2'`, `getStoredUser()` returns `DEFAULT_USER`. (Ref: Observation O2)
3. Step 3: `DEFAULT_USER` is configured with `name: 'संकेत कौले'`, `role: 'खजिनदार'`, and leaves `isLoggedIn` `undefined`. (Ref: Observation O3)
4. Step 4: Components check login state using `currentUser.isLoggedIn !== false`. Since `isLoggedIn` is `undefined`, `undefined !== false` evaluates to `true`. (Ref: Observation O4)
5. Step 5: Therefore, a fresh session defaults to an authenticated Treasurer role instead of a Guest mode, bypassing public Guest view controls.
6. Step 6: `handleLogout` demonstrates the correct unauthenticated Guest object: `{ name: 'पाहुणा (Guest)', role: 'सभासद', isLoggedIn: false }`. (Ref: Observation O5)
7. Step 7: Updating `DEFAULT_USER` in `src/mockData.ts` to `{ name: 'पाहुणा (Guest)', role: 'सभासद', isLoggedIn: false }` will fix the initialization auto-login bug seamlessly without breaking RBAC guards or component render logic. (Ref: Observations O5, O6)

## 3. Caveats
- No caveats. The entire auth initialization flow and component access control checks were inspected directly in source files.

## 4. Conclusion
The auto-login bug occurs because `DEFAULT_USER` in `src/mockData.ts` sets an active Treasurer profile without specifying `isLoggedIn: false`, combined with loose `currentUser.isLoggedIn !== false` truthy checks. Changing `DEFAULT_USER` to an explicit guest state (`isLoggedIn: false`) will ensure initial visits and data resets start as logged-out guests.

## 5. Verification Method
1. Inspect `src/mockData.ts` lines 405–409 to verify `DEFAULT_USER` values.
2. Inspect `src/services/storageService.ts` lines 102–109 to verify `getStoredUser()`.
3. In browser dev tools console or app runtime, run `localStorage.clear()` and reload the page to verify whether the app starts as Guest (`isLoggedIn: false`).
