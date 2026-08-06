# Technical Survey & Code Architecture Analysis

## 1. Build Setup & Tooling Analysis

### npm Scripts (`package.json`)
The application defines the following npm scripts in `package.json`:
- `"dev"`: `vite --port=3000 --host=0.0.0.0` — Launches Vite development server on port 3000 listening on all network interfaces.
- `"build"`: `vite build` — Compiles TypeScript and bundles static assets into `./dist`.
- `"preview"`: `vite preview` — Starts a static web server to preview the built application in `./dist`.
- `"clean"`: `rm -rf dist server.js` — Removes dist output folder and legacy server file.
- `"lint"`: `tsc --noEmit` — Performs TypeScript type checking across the project without emitting JS files.

### Vite Configuration (`vite.config.ts`)
- **Base URL**: `base: './'` — Uses relative pathing for built assets. This guarantees compatibility when deployed under subpaths (such as GitHub Pages repository subpaths `https://<username>.github.io/<repo-name>/`) as well as root domains.
- **Plugins**:
  - `@vitejs/plugin-react`: Enables React Fast Refresh and JSX transformation.
  - `@tailwindcss/vite`: Tailwind CSS v4 Vite integration plugin.
- **Path Aliasing**: Maps `@` to `.` (the project root directory), allowing imports like `@/src/types`.
- **HMR / Watch**: Configured to respect `process.env.DISABLE_HMR` for AI Studio / agent environment stability.

### TypeScript Setup (`tsconfig.json`)
- **Target**: `ES2022`
- **Module**: `ESNext`
- **Module Resolution**: `bundler`
- **JSX**: `react-jsx` (React 19 standard)
- **Path Mapping**: `"@/*": ["./*"]`
- **Key Flags**:
  - `noEmit: true` — Disables output generation during `tsc` (handled by Vite build).
  - `skipLibCheck: true` — Skips type checking of declaration files.
  - `allowImportingTsExtensions: true` — Allows direct `.ts` and `.tsx` file extension imports.
  - `isolatedModules: true` & `moduleDetection: force`.

---

## 2. Test Infrastructure Investigation

### Current Test Status
- **Test Framework**: No test framework (e.g. `vitest`, `jest`, `playwright`, `cypress`) is currently declared in `package.json` dependencies or devDependencies.
- **Test Scripts**: No `"test"` script exists in `package.json`.
- **Test Files**: A filesystem check for `*.test.*`, `*.spec.*`, or `__tests__/` revealed **0 existing test files**.

### Recommended Test Setup
To support R3 verification without altering core build pipelines, lightweight component or unit test runner setup using `vitest` + `@testing-library/react` or pure TypeScript assertion scripts can be added if automated test execution is desired. Currently, `npm run lint` (`tsc --noEmit`) and `npm run build` (`vite build`) serve as the primary automated verification gates.

---

## 3. Build & Deployment Pipeline Analysis

### Local Build Requirements
- **Node.js**: Requires Node.js v18+ or v22.
- **Build Execution**: Running `npm run build` invokes Vite to compile TSX into static HTML/JS/CSS assets in `./dist`.
- **Type Checking**: Running `npm run lint` validates type safety across all components and service modules.

### CI/CD Deployment (`.github/workflows/deploy.yml`)
- **Trigger**: Pushes to `main` or `master` branches, or manual `workflow_dispatch`.
- **Environment**: `ubuntu-latest` running Node.js 22 (`actions/setup-node@v4`).
- **Steps**:
  1. `actions/checkout@v4` — Checks out code repository.
  2. `actions/setup-node@v4` — Sets up Node.js 22.
  3. `npm install` — Installs dependencies.
  4. `npm run build` — Builds bundle into `./dist`.
  5. `actions/upload-pages-artifact@v3` — Packages `./dist` directory.
  6. `actions/deploy-pages@v4` — Deploys static build artifact to GitHub Pages.

---

## 4. Code Structure & Dependency Architecture

### Dependency Map

| Package | Version | Purpose |
|---|---|---|
| `react` | `^19.0.1` | Core UI library |
| `react-dom` | `^19.0.1` | React DOM rendering |
| `lucide-react` | `^0.546.0` | Icon set for dashboard and UI controls |
| `motion` | `^12.23.24` | Animation utilities |
| `@tailwindcss/vite` & `tailwindcss` | `^4.1.14` | Styling framework |
| `@vitejs/plugin-react` | `^5.0.4` | Vite React integration |
| `typescript` | `~5.8.2` | Type checker and compiler |
| `@google/genai` | `^2.4.0` | Google GenAI SDK |
| `express` | `^4.21.2` | Server utility (if applicable) |

### Code Base Hierarchy (`src/`)

```
src/
├── main.tsx                    # Entry point rendering <App /> into DOM
├── App.tsx                     # Main container, application state, routing & layout shell
├── types.ts                    # TypeScript types & interface declarations
├── mockData.ts                 # Initial demo data (members, occasions, transactions, DEFAULT_USER)
├── index.css                   # Global styles & Tailwind CSS imports
├── vite-env.d.ts               # Vite client environment type definitions
├── services/
│   └── storageService.ts       # LocalStorage persistence layer & financial summary logic
├── utils/
│   └── rbac.ts                 # Role-based access control helpers & designation rankings
└── components/
    ├── Sidebar.tsx             # Main navigation sidebar, user badge, login/logout controls
    ├── HeaderStats.tsx         # Summary header cards (Total Income, Expense, Net Balance)
    ├── DashboardView.tsx       # Main dashboard, key metrics, gallery, recent activity
    ├── IncomeForm.tsx          # Form for recording new income / subscriptions
    ├── IncomeFormModal.tsx     # Modal wrapper for income entry
    ├── ExpenseForm.tsx         # Form for submitting expense requests
    ├── ExpenseFormModal.tsx    # Modal wrapper for expense entry
    ├── IncomeHistory.tsx       # Ledger table for income transactions
    ├── ExpenseHistory.tsx      # Ledger table for expense transactions with approval buttons
    ├── MemberSubscriptionsView.tsx # Member subscription tracker & member management
    ├── ProfileView.tsx         # User profile, password management, avatar/logo upload
    ├── LoginModal.tsx          # Modal dialog for Admin/Member login & credential check
    ├── RbacGuard.tsx           # Fallback view for unauthorized access
    ├── LogoLightboxModal.tsx   # Fullscreen image lightbox modal
    └── ImageCropModal.tsx      # Canvas image cropper for logo upload
```

---

## 5. Root Cause Investigation of Authentication Bug

### Current Implementation Defect
1. **Hardcoded Default User**: In `src/mockData.ts` (lines 405-409):
   ```typescript
   export const DEFAULT_USER: CurrentUser = {
     name: 'संकेत कौले',
     role: 'खजिनदार',
     phone: '9822010104',
   };
   ```
2. **Implicit Logged-In State**: `getStoredUser()` in `src/services/storageService.ts` (lines 102-109) returns `DEFAULT_USER` whenever `localStorage.getItem('morya_mandal_user_v2')` is empty or missing. Because `isLoggedIn` is not explicitly set to `false`, components treat the initial visitor as logged in with administrative privileges (`खजिनदार`).
3. **Logout Reset Behavior**: When `handleLogout()` is called in `App.tsx` (lines 100-107), it resets `currentUser` to `{ name: 'पाहुणा (Guest)', role: 'सभासद', isLoggedIn: false }`. However, on initial load without existing `localStorage`, `DEFAULT_USER` is used instead of the guest state.

### Refactoring Requirements Mapping
- **R1 (Default Guest Mode)**: Update `DEFAULT_USER` or default initial state in `storageService.ts` and `App.tsx` to ensure `isLoggedIn: false` (Guest user: `{ name: 'पाहुणा (Guest)', role: 'सभासद', isLoggedIn: false }`). Unauthenticated visitors start as guests and are prompted to log in when attempting restricted actions.
- **R2 (Role-Based Permission & Login Flow)**: Require password authentication in `LoginModal` when switching to Admin (`Tom&jerry5633#`) or Member accounts (verifying set member passwords), updating `isLoggedIn: true` upon successful login.
- **R3 (Build & Verification)**: Ensure `npm run build` and `tsc --noEmit` pass with zero errors and preserve deployment settings (`base: './'`).
