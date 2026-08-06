# Project: Morya Group Web App Authentication Refactoring

## Architecture
- React 19 + TypeScript + Vite application for Morya Group (गणेश उत्सव मंडळ व्यवस्थापन).
- State Management: `App.tsx` holds `currentUser` state, initialized via `getStoredUser()` in `storageService.ts`.
- Mock Data & Defaults: `mockData.ts` exports `DEFAULT_USER` and initial mandal state.
- UI Layout: `Sidebar.tsx` navigation & role switching, `HeaderStats.tsx` user status, `LoginModal.tsx` authentication modal.
- RBAC & Access Control: `RbacGuard.tsx` guards administrative actions/routes; views (`DashboardView`, `MemberSubscriptionsView`, `ProfileView`, `IncomeForm`, `ExpenseForm`, `IncomeHistory`, `ExpenseHistory`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Default Guest State (isLoggedIn: false) | Initial app load defaults to unauthenticated Guest state (`isLoggedIn: false`) when localStorage is empty. Fix `DEFAULT_USER` in `mockData.ts` and fallback in `storageService.ts`/`App.tsx`. | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Guest View & Action Prompting | Guest visitors (`isLoggedIn: false`) can view public pages (Dashboard, Occasions, Profile preview) but are prompted to log in when attempting administrative or member-specific actions. | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Logout Reset to Guest State | Logging out cleanly resets state to unauthenticated Guest mode (`isLoggedIn: false`) and updates `localStorage`. | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Role-Based Permission & Login Flow | LoginModal requires password authentication for Admin and Member accounts. Switch to roles (ॲडमिन, खजिनदार, अध्यक्ष, सभासद) cleanly upon login. | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Role Switcher & Login Prompt Integration | Clicking "Login" or switching to password-protected accounts from Sidebar/Header prompts for login via LoginModal. | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Build Verification & TypeScript Check | Project compiles cleanly (`npm run build` and `npm run lint`) without TypeScript or Vite errors. | M3 | ORIGINAL_REQUEST §R3 |
| 7 | Layout & Deployment Config Preservation | Preserve data models, UI components, and Vite config (`base: './'`) for deployment on GitHub Pages. | M3 | ORIGINAL_REQUEST §R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Default Guest Mode Refactoring | Fix `DEFAULT_USER` in `mockData.ts`, `getStoredUser` in `storageService.ts`, logout state in `App.tsx`, and verify Guest view behavior for public/admin actions. | None | IN_PROGRESS |
| M2 | Role-Based Permission & Login Flow | Refactor `LoginModal.tsx`, `Sidebar.tsx`, `RbacGuard.tsx`, and role switching logic for Admin/Treasurer/President/Member roles. | M1 | PLANNED |
| M3 | E2E Test Verification & Build Check | Run E2E tests, TypeScript lint (`npm run lint`), Vite build (`npm run build`), and Forensic Audit. | M2 | PLANNED |

## Interface Contracts
### Auth State (`User` interface in `src/types.ts`)
- `User`: `{ id: string; name: string; role: Role; phone?: string; avatar?: string; designation?: string; isLoggedIn?: boolean; rank?: number; }`
- Guest state object: `{ name: 'पाहुणा (Guest)', role: 'सभासद', isLoggedIn: false }`
- Logged in state object: User object with `isLoggedIn: true` (or boolean true).

## Code Layout
- `src/mockData.ts`: `DEFAULT_USER` export
- `src/services/storageService.ts`: `getStoredUser()`, `setStoredUser()`, `clearStoredUser()`
- `src/App.tsx`: App root, auth state, logout handler, main layout
- `src/components/LoginModal.tsx`: Login modal dialog, password authentication, role selection
- `src/components/Sidebar.tsx`: Navigation sidebar, user info, role switcher, login button
- `src/components/RbacGuard.tsx`: Route/Action guard checking `isLoggedIn` and user role
