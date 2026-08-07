# Project Plan: Morya Group ERP Web Application

## Overview
Audit, complete, and harden the Morya Group Web Application ERP system into a fully functional, production-ready web application with Firebase Firestore backend (`morya-group-352ad`), real-time `onSnapshot` listeners, Marathi UTF-8 Unicode statement/report exports (PDF print and Excel/CSV), and zero build errors (`npx tsc --noEmit` and `npm run build`).

## Phases
1. **Phase 0: Codebase Survey & Feature Inventory**
   - Survey project structure, tech stack, components, Firestore integration, report generation, build environment.
   - Output: `PROJECT.md` at root with Architecture, Feature Inventory, Milestones, and Interface Contracts.

2. **Phase 1: E2E Test Suite Creation & Milestone Decomposition**
   - E2E Test Track: Create opaque-box test infrastructure and tests for Tiers 1-4.
   - Partition implementation into distinct milestones (e.g. Core & Auth/Config, Financials: Income & Expense Sync, Directory & Operations: Members/Occasions/Gallery/Suggestions/Settings Sync, Exports & UTF-8 Marathi PDF/Excel Engine).

3. **Phase 2: Milestone Execution & Real-Time Sync Integration**
   - Implement real-time Firestore listeners (`onSnapshot`) across all modules.
   - Implement Marathi UTF-8 PDF & Excel export features.
   - Run Explorer → Worker → Reviewer → Challenger → Auditor cycle per milestone.

4. **Phase 3: E2E Test Verification, Hardening & Build Audit**
   - Final Milestone: Pass 100% E2E test suite + Tier 5 Adversarial Coverage Hardening.
   - Final zero-error verification for `npx tsc --noEmit` and `npm run build`.

## Verification Criteria
- `npx tsc --noEmit` returns 0 errors.
- `npm run build` succeeds with 0 errors.
- Real-time `onSnapshot` listeners operational on all 7 domains (incomes, expenses, members, occasions, gallery, suggestions, settings).
- Statement/report PDF print and Excel/CSV exports work with proper Marathi UTF-8 Unicode rendering.
- Forensic Auditor CLEAN verdict on all components.
