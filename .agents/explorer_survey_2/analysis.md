# Comprehensive UI Components, Authentication & RBAC Analysis

## Executive Summary
This analysis details the UI component structure, authentication mechanics, Login Modal workflow, role switching, role-based access control (RBAC), public vs. administrative views, and Marathi designation ranks within the Morya Group web application (`moryagroupweb`).

---

## 1. UI Components Overview & Mapping

### Core App Shell & Context
- **`src/App.tsx`**: Top-level application shell.
  - Manages global state: `currentUser`, `activeTab`, `isLoginModalOpen`, `loginModalMemberId`, `loginModalType`, `incomes`, `expenses`, `members`, `occasions`, `customIncomeTypes`, `gallery`, `groupLogo`.
  - Coordinates header (`HeaderStats`), navigation sidebar (`Sidebar`), dynamic main view content area, footer, and `LoginModal`.
  - Implements tab protection redirect:
    ```tsx
    useEffect(() => {
      saveUser(currentUser);
      if (activeTab === 'member-subscriptions' && (!currentUser.isLoggedIn || !isBadgedMember(currentUser.role))) {
        setActiveTab('dashboard');
      }
    }, [currentUser, activeTab]);
    ```

### Authentication & Navigation Components
- **`src/components/LoginModal.tsx`**: Modal dialog for user authentication and password management.
  - **Admin Login Tab (`loginType === 'admin'`)**:
    - Hardcoded credential check: `adminPassword.trim() !== 'Tom&jerry5633#'` (line 88).
    - Authenticates as `name: 'सिस्टम ॲडमिन'`, `role: 'ॲडमिन'`, `isLoggedIn: true`.
  - **Member / Officer Login Tab (`loginType === 'member'`)**:
    - Member select dropdown sorted by designation rank.
    - Password check: If target member has `password` defined and active user is NOT Admin (`!isAdminLoggedIn`), checks `memberPassword.trim() === selectedMember.password.trim()`.
    - If target member has no password set, allows direct login.
    - Authenticates as selected member with their role, name, phone, email, birthDate, age, and `isLoggedIn: true`.
  - **Password Reset Sub-view**:
    - Generates password reset link (`/#reset-password?memberId=...`).
    - Triggers mailto action or copies reset link to clipboard.

- **`src/components/Sidebar.tsx`**: Navigation menu and role switching widget.
  - **Menu Filtering (lines 132–144)**:
    - If `!isLoggedIn` (`currentUser.isLoggedIn !== false`), menu only shows `dashboard` (labeled `📸 फोटो गॅलरी (Home)`) and `profile`.
    - Protected items (`income-form`, `expense-form`, `income-history`, `expense-history`, `member-subscriptions`) are hidden or display a Lock icon. Clicking a protected item when logged out triggers `onOpenLogin()`.
  - **Role / Profile Switcher (`handleUserSelect`, lines 146–200)**:
    - Admin (`role === 'ॲडमिन' && isLoggedIn !== false`) can switch to any account without password prompt.
    - Non-Admin switching to an account with a password triggers `onOpenLogin(memberId, 'member')` or `onOpenLogin('ADMIN_ACCOUNT', 'admin')`.
  - **Admin Actions**: Logo file upload button (triggers `ImageCropModal`) and reset logo button.

- **`src/components/HeaderStats.tsx`**: Top header statistics bar.
  - **Guest View (`!isLoggedIn`, lines 30–62)**: Renders public header with Mandal title and `सदस्य / ॲडमिन लॉगइन (Login)` button.
  - **Non-Financial Member View (`!hasFullFinancialAccess`, lines 65–112)**: Shows user name, role badge, financial year selector, and logout button.
  - **Financial Executive View (`hasFullFinancialAccess`, lines 115–205)**: Displays Total Income, Approved Expenses, Pending Expense Count alert, Net Balance, Year Selector, and Logout button.

- **`src/components/RbacGuard.tsx`**: Access restriction fallback card.
  - Displayed when an unauthenticated or unauthorized user attempts to access protected routes (`IncomeForm`, `ExpenseForm`, `IncomeHistory`, `ExpenseHistory`).
  - Displays title, Marathi error explanation, current role status, authorized role tags (`अध्यक्ष`, `खजिनदार`, `उपखजिनदार`, `ॲडमिन`), and a button to open `LoginModal`.

### Content & Administrative View Components
- **`src/components/DashboardView.tsx`**:
  - **Guest View (`!isLoggedIn`, lines 98–157)**: Renders public banner ("सार्वजनिक उत्सव दालन (Public View)"), login button, and public `EventGallerySection`.
  - **Authenticated View (lines 160–447)**: Quick action buttons (`+ नवीन जमा नोंद`, `+ नवीन खर्च नोंद`), pending expense approval banner with `मंजूर करा` action (for authorized roles), recent income/expense cards, and member subscription overview teaser (for badged members).
- **`src/components/IncomeForm.tsx` & `ExpenseForm.tsx`**:
  - Guarded by `!isLoggedIn` check rendering `RbacGuard`.
  - `ExpenseForm.tsx` includes an auto-approval checkbox (`आत्ताच मंजूर करा`) for executive roles (`अध्यक्ष`, `खजिनदार`, `सचिव`).
- **`src/components/IncomeHistory.tsx` & `ExpenseHistory.tsx`**:
  - Guarded by `!isLoggedIn` check rendering `RbacGuard`.
  - Non-full access members (`!hasFullFinancialAccess`) see a warning banner and are restricted to viewing only their own transactions.
  - `ExpenseHistory.tsx` displays approval status (`मंजूर` / `प्रलंबित`) and a `मंजूर` button for `canApprove` roles (`अध्यक्ष`, `खजिनदार`, `सचिव`, `उपखजिनदार`, `ॲडमिन`).
- **`src/components/MemberSubscriptionsView.tsx`**:
  - Restricted to executive officers (`isBadgedMember(role) && isLoggedIn`). Unauthenticated or general members see a lock guard card.
  - Renders member cards ordered by Marathi rank (`अध्यक्ष` → `कार्याध्यक्ष` → `उपाध्यक्ष` → `सचिव` → `खजिनदार` → `उपखजिनदार` → `सभासद`).
  - Displays annual target (₹6,000), subscription progress bar, and extra donations.
  - Admin-only actions (`hasAdminPermissions`): "+ नवीन सभासद जोडा", Edit Member & Change Designation, Password Management & Email Reset Link, Delete Member.
- **`src/components/ProfileView.tsx`**:
  - Guarded by `!isLoggedIn`.
  - Renders user details, target subscription progress, profile switch dropdown, edit profile form, and admin group logo management card.

---

## 2. Role Switching & Login Modal Mechanisms

### Login Modal Flow
1. **Triggering Login**:
   - `onOpenLogin(memberId?, type?)` can be called from Sidebar, Header, Dashboard, RbacGuard, or ProfileView.
2. **Admin Authentication**:
   - Tab: `👑 ॲडमिन (Admin)`.
   - Input: Admin Password.
   - Validation: `adminPassword.trim() === 'Tom&jerry5633#'`.
   - On Success: `setCurrentUser({ name: 'सिस्टम ॲडमिन', role: 'ॲडमिन', phone: '९८२२०१०१००', isLoggedIn: true })`.
3. **Member Authentication**:
   - Tab: `👤 पदाधिकारी / सभासद`.
   - Input: Selected Member Dropdown + Member Password.
   - Validation:
     - If active user is already Admin (`currentUser.role === 'ॲडमिन' && currentUser.isLoggedIn !== false`), password check is bypassed.
     - Otherwise, if selected member has a `password` property set, `memberPassword.trim()` must equal `selectedMember.password.trim()`.
     - If selected member has no password set, login proceeds directly.
   - On Success: `setCurrentUser({ name: member.fullName, role: member.designation || 'सभासद', phone: member.phone, email: member.email, birthDate: member.birthDate, age: member.age, isLoggedIn: true })`.

### Role Switching Mechanisms
- **In Sidebar (`handleUserSelect`)**:
  - If current user is logged in as Admin (`role === 'ॲडमिन' && isLoggedIn !== false`): Can instantly switch to any member or `ADMIN_ACCOUNT` without password prompt.
  - If current user is NOT Admin: Selecting `ADMIN_ACCOUNT` or a member with a set password opens `LoginModal` pre-selected to that user.
- **In ProfileView**:
  - Selecting another member from the dropdown as a non-admin triggers `onOpenLogin(targetId, 'member')`.

### Root Cause of Default Auto-Login Bug
- `src/mockData.ts` (lines 405–409):
  ```ts
  export const DEFAULT_USER: CurrentUser = {
    name: 'संकेत कौले',
    role: 'खजिनदार',
    phone: '9822010104',
  };
  ```
- `src/services/storageService.ts` (lines 102–109):
  `getStoredUser()` falls back to `DEFAULT_USER` when `localStorage` key `morya_mandal_user_v2` is missing.
- Because `DEFAULT_USER` lacks `isLoggedIn: false`, all `isLoggedIn !== false` checks evaluate to `true`. Thus, new visitors start logged in as **संकेत कौले (खजिनदार)** with full administrative and financial access!

---

## 3. Administrative Actions: Access Control Matrix

| Action / View | Unauthenticated Guest (`isLoggedIn: false`) | Logged-in Member (`सभासद`) | Executive Officer (`कार्याध्यक्ष`/`उपाध्यक्ष`/`सचिव`) | Financial Admin (`अध्यक्ष`/`खजिनदार`/`उपखजिनदार`/`ॲडमिन`) |
| text | text | text | text | text |
| **Public Dashboard & Photo Gallery** | Allowed | Allowed | Allowed | Allowed |
| **View Financial Summary (Income/Expense Totals)** | Hidden (Header shows public welcome) | Hidden (Header shows personal info) | Hidden / Full depending on role | Allowed |
| **View Own Profile** | Prompts Login | Allowed | Allowed | Allowed |
| **View All Transactions (Income/Expense History)** | Prompts Login (RbacGuard) | Restricted to own transactions | Restricted to own transactions | Full Access to all transactions |
| **Create Income/Expense Entry** | Prompts Login (RbacGuard) | Allowed (recorded under member name) | Allowed | Allowed |
| **Approve Pending Expenses** | Hidden | Hidden | Allowed for `सचिव` | Allowed (`अध्यक्ष`, `खजिनदार`, `उपखजिनदार`, `ॲडमिन`) |
| **Auto-Approve Expense Entry** | N/A | No | `सचिव` only | Allowed (`अध्यक्ष`, `खजिनदार`) |
| **View Member Subscriptions & Roster** | Prompts Login | Hidden / Restricted | Allowed | Allowed |
| **Add / Edit / Delete Members** | Hidden | Hidden | Hidden | Allowed (`hasAdminPermissions`) |
| **Set / Change Member Passwords** | Hidden | Hidden | Hidden | Allowed (`hasAdminPermissions`) |
| **Change / Reset Mandal Group Logo** | Hidden | Hidden | Hidden | Allowed (`isAdmin`) |

---

## 4. User Roles, Permissions & Marathi Role Titles

### Role Ranks and Definitions (`src/utils/rbac.ts` & `src/types.ts`)

```ts
export const DESIGNATION_RANKS: Record<string, number> = {
  'अध्यक्ष': 1,
  'कार्याध्यक्ष': 2,
  'उपाध्यक्ष': 3,
  'सचिव': 4,
  'खजिनदार': 5,
  'उपखजिनदार': 6,
  'सभासद': 7,
};
```

1. **`ॲडमिन` / `Admin` (System Administrator)**
   - **Permissions**: Full financial access (`hasFullFinancialAccess`), Full admin permissions (`hasAdminPermissions`), Logo editing (`isAdmin`), seamless role switching, member management (add/edit/delete/password set).
   - **Marathi Title**: `ॲडमिन` (or `सिस्टम ॲडमिन`).

2. **`अध्यक्ष` (President - Rank 1)**
   - **Permissions**: Executive Officer badge (`isBadgedMember`), Full Financial Access (`hasFullFinancialAccess`), Admin permissions (`hasAdminPermissions`), Expense approval (`canApprove`), Expense auto-approval.
   - **Marathi Title**: `अध्यक्ष`.

3. **`कार्याध्यक्ष` (Executive/Working President - Rank 2)**
   - **Permissions**: Executive Officer badge (`isBadgedMember`), access to Member Subscriptions roster.
   - **Marathi Title**: `कार्याध्यक्ष`.

4. **`उपाध्यक्ष` (Vice President - Rank 3)**
   - **Permissions**: Executive Officer badge (`isBadgedMember`), access to Member Subscriptions roster.
   - **Marathi Title**: `उपाध्यक्ष`.

5. **`सचिव` (Secretary - Rank 4)**
   - **Permissions**: Executive Officer badge (`isBadgedMember`), access to Member Subscriptions roster, Expense approval (`canApprove`), Expense auto-approval.
   - **Marathi Title**: `सचिव`.

6. **`खजिनदार` (Treasurer - Rank 5)**
   - **Permissions**: Executive Officer badge (`isBadgedMember`), Full Financial Access (`hasFullFinancialAccess`), Admin permissions (`hasAdminPermissions`), Expense approval (`canApprove`), Expense auto-approval.
   - **Marathi Title**: `खजिनदार`.

7. **`उपखजिनदार` (Assistant Treasurer - Rank 6)**
   - **Permissions**: Executive Officer badge (`isBadgedMember`), Full Financial Access (`hasFullFinancialAccess`), Admin permissions (`hasAdminPermissions`), Expense approval (`canApprove`).
   - **Marathi Title**: `उपखजिनदार`.

8. **`सभासद` (General Member - Rank 7)**
   - **Permissions**: Standard member. Access to dashboard gallery, personal profile, own income/expense entries. Restricted from full financial metrics, full transaction histories, and member subscription roster.
   - **Marathi Title**: `सभासद`.

9. **Guest User (`isLoggedIn: false`)**
   - **Permissions**: Unauthenticated visitor. Default state for initial app load. Access limited to public dashboard and photo gallery. Any administrative or financial interaction prompts login via `LoginModal`.
   - **Marathi Title**: `पाहुणा (Guest)`.
