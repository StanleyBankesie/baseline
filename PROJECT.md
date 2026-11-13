# Project: OmniSuite UI & Layout Production Refinement

## Architecture
OmniSuite is an enterprise multi-tenant ERP built as a monorepo:
- **Frontend (`client/`)**: Vite 6.0.1 + React 18.3.1 + Tailwind CSS 3.4.16 + React Router 7.18.1 + Ant Design 6.5.1.
- **Shared Styles (`client/src/styles.css`)**: Global design tokens, button variants (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-sm`), form inputs (`.input`, `.select`), and document action buttons.
- **Shared Layouts (`client/src/components/ModuleLayout.jsx`, `ModuleDashboard.jsx`)**: Navigation wrappers, `ModuleTopNavBar` for module section navigation.
- **Modules (`client/src/pages/modules/*`)**: 16 ERP modules with 422 list/management views.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Mobile Navigation Banner Hiding | Hide `ModuleTopNavBar` on mobile viewports (<768px, `hidden md:block`) in `ModuleLayout.jsx` and `ModuleDashboard.jsx` while keeping visible on desktop. | M1 | ORIGINAL_REQUEST R1, Survey Explorer 1 |
| F2 | Client Build & Syntax Restoration | Fix 15 pre-existing syntax errors in list pages (`VehicleServicingList.jsx`, `FMHelpdeskPage.jsx`, etc.) to ensure clean Vite builds and reliable rendering. | M1 | Survey Explorer 1 |
| F3 | Button Sizing System & CSS Architecture | Update `styles.css` to unify base button height to 42px (matching inputs), add `.btn-icon` (42x42), `.btn-sm` (36px), `.btn-sm.btn-icon` (36x36), and `.btn-table-action` (36px). | M2 | ORIGINAL_REQUEST R2, Survey Explorer 2 |
| F4 | Header & Action Button Standardization | Standardize header creation buttons to Deep Teal `#0E3646` (`.btn-primary`), "Back"/"Return" to `.btn-secondary`, and unify modal footer buttons to 42px. | M2 | ORIGINAL_REQUEST R2, Survey Explorer 2 |
| F5 | Table Row Action Consistency | Standardize table row action buttons to 36px (`h-9`) with `rounded-lg` radius, eliminating mismatched pills (`rounded-full`) in `JournalVoucherList.jsx` and inconsistent heights. | M2 | ORIGINAL_REQUEST R2, Survey Explorer 2 |
| F6 | List Page Clutter Reduction (Audit Columns) | Remove secondary/redundant `Created By` and `Created Date` columns from list views, saving 20-30% horizontal space and eliminating horizontal scrolling. | M3 | ORIGINAL_REQUEST R3, Survey Explorer 3 |
| F7 | Duplicate KPI Card Removal | Eliminate duplicate stacked KPI card blocks in `EquipmentList.jsx` and `ItemsList.jsx` to restore above-the-fold table visibility. | M3 | ORIGINAL_REQUEST R3, Survey Explorer 3 |
| F8 | BOQ / Cost Schedule Alignment & Entity Field Cleanup | Apply BOQ / Cost Schedule essential data principles across list views; clean redundant columns (`Category` in Drawing Register, `Active` in `ProjectList.jsx`, separate attachments in `EmployeeList.jsx`). | M3 | ORIGINAL_REQUEST R3, Survey Explorer 3 |
| F9 | Drawing Register Filter & Search Re-architecture | Move filter controls, search box, and refresh button in `DocumentRegisterPage.jsx` from header into a dedicated, aligned filter bar card. | M4 | ORIGINAL_REQUEST R4, Survey Explorer 2 & 3 |
| F10 | Universal 3-Tier Filter Toolbar Standardization | Standardize list page filter rows across construction and module views into a clean 3-tier structure (Header -> KPI cards -> Dedicated Filter Toolbar with Search + Selects + Refresh + ViewToggle). | M4 | ORIGINAL_REQUEST R4, Survey Explorer 3 |
| F11 | End-to-End Verification & Layout Testing | Pass all automated test suites, verify responsive mobile (<768px) and desktop layout rendering, and ensure clean console and zero regressions. | M5 | ORIGINAL_REQUEST Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Mobile Nav Banner & Build Integrity | Implement F1 (hide `ModuleTopNavBar` on mobile) & F2 (fix syntax errors for clean client build) | none | IN_PROGRESS (conv: 25587d4d) |
| M2 | Button Sizing & Alignment Standardization | Implement F3 (styles.css 3-tier system), F4 (headers/modals), F5 (table row actions) | M1 | PLANNED |
| M3 | List Page Information Reduction | Implement F6 (audit columns removal), F7 (duplicate cards removal), F8 (BOQ reference alignment) | M1 | PLANNED |
| M4 | Filter & Search Arrangement | Implement F9 (Drawing Register re-architecture), F10 (universal 3-tier filter toolbar) | M2, M3 | PLANNED |
| M5 | Final Verification & Hardening | Implement F11 (E2E test suite pass, responsive audit, clean build) | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### `ModuleLayout.jsx` ↔ Navigation Rendering
- `ModuleTopNavBar`: Root container includes `hidden md:block` to hide on mobile viewports (<768px) and show on desktop (>=768px).
- `ModuleDashboard.jsx`: Wrapper container includes `hidden md:block sticky top-0 z-40`.

### Button System ↔ Component & View Layer (`client/src/styles.css`)
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-outline`: Default height `42px` (`min-height: 42px`), `rounded-xl`, `text-sm font-medium`.
- `.btn-sm`, `.btn.btn-sm`: Compact height `36px` (`min-height: 36px !important`, `height: 36px !important`), `rounded-lg`, `text-xs font-semibold`.
- `.btn-icon`: Square `42px x 42px` (`w-[42px] h-[42px] !important`), `rounded-xl`.
- `.btn-sm.btn-icon`: Square `36px x 36px` (`w-9 h-9 !important`), `rounded-lg`.
- `.btn-table-action`: Compact table action `36px` (`h-9`), `rounded-lg`.

### List Page Layout ↔ 3-Tier Layout Standard
- **Tier 1 (Header)**: Back button + Title/Subtitle on left, Primary Action Button (`.btn-primary`, 42px) on right.
- **Tier 2 (Summary Cards)**: Canonical 4-to-6 responsive KPI card grid.
- **Tier 3 (Dedicated Filter Toolbar)**: `card-header` container with Search box (`flex-1`, 42px/36px), Dropdown Selects (42px/36px), Refresh Icon Button (square 42px/36px), and ViewToggle (aligned baseline).

## Code Layout
- `client/src/components/ModuleLayout.jsx` — Core navigation banner component (`ModuleTopNavBar`).
- `client/src/components/ModuleDashboard.jsx` — Module dashboard layout and top navigation container.
- `client/src/styles.css` — Central CSS design tokens and button/input utility definitions.
- `client/src/pages/modules/project-management/construction/DocumentRegisterPage.jsx` — Drawing Register & RFIs list page.
- `client/src/pages/modules/project-management/construction/BOQManager.jsx` — BOQ & Cost Schedule manager.
- `client/src/pages/modules/maintenance/equipment/EquipmentList.jsx` — Equipment & Assets list page.
- `client/src/pages/modules/inventory/ItemsList.jsx` — Items master list page.
- `client/src/pages/modules/sales/invoices/InvoiceList.jsx` — Sales invoices list page.
- `client/src/pages/modules/finance/JournalVoucherList.jsx` — Journal vouchers list page.
- `client/src/pages/modules/human-resources/employees/EmployeeList.jsx` — Employee list page.
- `client/src/pages/modules/asset-management/AssetRegisterList.jsx` — Asset register list page.
