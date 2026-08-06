# Project Plan — Morya Group Web Authentication Refactoring

## Phase 0: Survey & Infrastructure Mapping
- Launch 3 parallel Explorers (`teamwork_preview_explorer`) to inspect:
  1. `explorer_survey_1`: State management & authentication context (`src/context/`, `src/App.tsx`, `localStorage`, default user state).
  2. `explorer_survey_2`: Login modal, credentials, role switching, permissions, navigation (`src/components/`, admin views).
  3. `explorer_survey_3`: Build setup, TypeScript configuration, test infrastructure, package.json scripts.
- Consolidate explorer findings into `PROJECT.md` (Feature Inventory, Architecture, Code Layout, Milestones).

## Phase 1: E2E Testing Track & Decomposition
- Create comprehensive E2E test suite covering:
  - Tier 1: Feature Coverage (Logged Out Guest state, Login modal, Role assignment, Logout, Admin access prompts)
  - Tier 2: Boundary & Corner Cases (Invalid credentials, state persistence, empty localStorage)
  - Tier 3: Cross-Feature combinations
  - Tier 4: Real-World Scenarios
- Publish `TEST_READY.md`.

## Phase 2: Milestone Execution (Implementation Track)
- Milestone 1 (R1): Default Guest Mode Implementation (isLoggedIn: false by default, public vs admin route protection).
- Milestone 2 (R2): Role-Based Permission & Clean Login Flow (Login modal, role switching for Admin/Treasurer/President/Member, logout cleanup).
- Milestone 3 (R3): Build Verification & Data Model Preservation (TypeScript compilation, Vite build, GitHub Pages readiness).

## Phase 3: Verification & Hardening
- Pass 100% E2E test suite.
- Adversarial coverage hardening & Forensic Audit verification (`teamwork_preview_auditor`).
- Final Handoff to Sentinel.
