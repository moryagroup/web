# E2E Test Infra: Morya Group Web Application ERP

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| 1 | TypeScript & Build | ORIGINAL_REQUEST | 5 | 5 | ✓ | ✓ |
| 2 | RBAC Rank Hierarchy | ORIGINAL_REQUEST / rbac.ts | 5 | 5 | ✓ | ✓ |
| 3 | Firestore Listener Empty State | ORIGINAL_REQUEST | 5 | 5 | ✓ | ✓ |
| 4 | Gallery Real-Time Sync | ORIGINAL_REQUEST | 5 | 5 | ✓ | ✓ |
| 5 | Custom Income Types Sync | ORIGINAL_REQUEST | 5 | 5 | ✓ | ✓ |
| 6 | Occasions Management UI | ORIGINAL_REQUEST | 5 | 5 | ✓ | ✓ |
| 7 | Real-Time Sync (7 Domains) | ORIGINAL_REQUEST | 5 | 5 | ✓ | ✓ |
| 8 | Marathi UTF-8 BOM CSV Export | ORIGINAL_REQUEST | 5 | 5 | ✓ | ✓ |
| 9 | PDF Print Styling & Chrome Hiding | ORIGINAL_REQUEST | 5 | 5 | ✓ | ✓ |
| 10 | Integrated Exports across 6 Views | ORIGINAL_REQUEST | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test runner: `npx tsx tests/runner.ts` and automated test assertions in `tests/`.
- Test case format: Automated unit/integration runner + manual/browser verification scripts.

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature area (happy path)
- Tier 2: ≥5 boundary & edge cases per feature area
- Tier 3: Pairwise feature combinations
- Tier 4: Real-world application scenarios (Full ERP workflow: adding members, logging income/expense, syncing to Firestore, generating Marathi PDF/CSV report).
