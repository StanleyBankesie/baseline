# Scope: E2E Testing Track

## Architecture
OmniSuite E2E Testing Track provides requirement-driven, opaque-box test suites to verify that UI and layout refinements meet production standards across all ERP modules.

The testing track exercises the application from an end-user perspective:
1. **Responsive Viewport & DOM Tests**: Verifies mobile vs desktop layout behavior (e.g., hiding `ModuleTopNavBar` < 768px, showing >= 768px).
2. **Style, Height & Alignment Computations**: Verifies standardized button sizing (42px standard, 36px compact, square icon buttons), color tokens (Deep Teal `#0E3646` primary), and alignment within headers and toolbars.
3. **List Page Information Density & Schema Assertions**: Verifies elimination of redundant audit columns (`Created By`, `Created Date`), duplicate KPI cards, and retention of essential columns matching the BOQ reference.
4. **Filter & Search Architecture Checks**: Verifies 3-tier structure (Header -> KPI cards -> Dedicated Filter Toolbar with Search + Selects + Refresh) on list pages including Drawing Register (`DocumentRegisterPage.jsx`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Mobile Navigation Banner Hiding | Hide `ModuleTopNavBar` on mobile viewports (<768px) in `ModuleLayout.jsx` and `ModuleDashboard.jsx` while keeping visible on desktop. | M1 | ORIGINAL_REQUEST R1 |
| F2 | Client Build & Syntax Restoration | Fix 15 pre-existing syntax errors in list pages to ensure clean Vite builds and reliable rendering. | M1 | Survey Explorer 1 |
| F3 | Button Sizing System & CSS Architecture | Update `styles.css` to unify base button height to 42px (matching inputs), add `.btn-icon` (42x42), `.btn-sm` (36px), `.btn-sm.btn-icon` (36x36), and `.btn-table-action` (36px). | M2 | ORIGINAL_REQUEST R2 |
| F4 | Header & Action Button Standardization | Standardize header creation buttons to Deep Teal `#0E3646` (`.btn-primary`), "Back"/"Return" to `.btn-secondary`, and unify modal footer buttons to 42px. | M2 | ORIGINAL_REQUEST R2 |
| F5 | Table Row Action Consistency | Standardize table row action buttons to 36px (`h-9`) with `rounded-lg` radius, eliminating mismatched pills (`rounded-full`) in `JournalVoucherList.jsx` and inconsistent heights. | M2 | ORIGINAL_REQUEST R2 |
| F6 | List Page Clutter Reduction (Audit Columns) | Remove secondary/redundant `Created By` and `Created Date` columns from list views, saving 20-30% horizontal space and eliminating horizontal scrolling. | M3 | ORIGINAL_REQUEST R3 |
| F7 | Duplicate KPI Card Removal | Eliminate duplicate stacked KPI card blocks in `EquipmentList.jsx` and `ItemsList.jsx` to restore above-the-fold table visibility. | M3 | ORIGINAL_REQUEST R3 |
| F8 | BOQ / Cost Schedule Alignment & Entity Field Cleanup | Apply BOQ / Cost Schedule essential data principles across list views; clean redundant columns (`Category` in Drawing Register, `Active` in `ProjectList.jsx`, separate attachments in `EmployeeList.jsx`). | M3 | ORIGINAL_REQUEST R3 |
| F9 | Drawing Register Filter & Search Re-architecture | Move filter controls, search box, and refresh button in `DocumentRegisterPage.jsx` from header into a dedicated, aligned filter bar card. | M4 | ORIGINAL_REQUEST R4 |
| F10 | Universal 3-Tier Filter Toolbar Standardization | Standardize list page filter rows across construction and module views into a clean 3-tier structure (Header -> KPI cards -> Dedicated Filter Toolbar with Search + Selects + Refresh + ViewToggle). | M4 | ORIGINAL_REQUEST R4 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M-E2E-1 | Test Infrastructure & Runner Architecture | Design test runner, directory layout, test harness, and publish `TEST_INFRA.md` | none | IN_PROGRESS |
| M-E2E-2 | Tier 1: Feature Coverage Test Suite | Happy-path tests for F1-F10 (>=5 tests per feature, total >= 50 tests) | M-E2E-1 | PLANNED |
| M-E2E-3 | Tier 2: Boundary & Corner Cases Test Suite | Viewport boundaries (767px/768px), extreme inputs, empty states (>=5 per feature) | M-E2E-1 | PLANNED |
| M-E2E-4 | Tier 3: Cross-Feature Combinations Test Suite | Pairwise tests (e.g. Mobile view + Filter row wrapping, Button styling + List density) | M-E2E-2, M-E2E-3 | PLANNED |
| M-E2E-5 | Tier 4: Real-World Scenarios & Acceptance | Realistic user workflows across Construction, Finance, Inventory, HR, Maintenance | M-E2E-4 | PLANNED |
| M-E2E-6 | Verification, Gating & TEST_READY Publication | Execute all tiers via subagents, pass gate, publish `TEST_READY.md`, notify parent | M-E2E-5 | PLANNED |

## Interface Contracts
- **Test Runner Command**: Must be runnable via a single command (e.g. `node tests/e2e/runner.js` or `npm run test:e2e`).
- **Pass/Fail Semantics**: Clean exit code 0 when all tests pass; non-zero exit code on any failure; clear per-test reporting with pass/fail counters.
- **Reporting**: Emits structured console summaries detailing Tier 1, Tier 2, Tier 3, and Tier 4 counts and execution times.
