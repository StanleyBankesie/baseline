# Technical Survey & Test Specification Report: E2E Tiers 3 & 4 and TEST_INFRA.md Architecture

**State Folder**: `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_e2e_3`  
**Author**: Explorer 3 (E2E Testing Track)  
**Date**: 2026-11-13  
**Mission**: Formulate concrete test specifications for Tier 3 (Cross-Feature Pairwise Interaction Tests) and Tier 4 (Real-World Application Scenarios), and define the complete schema, architecture, and content for `TEST_INFRA.md` and `TEST_READY.md` at project root.

---

## 1. Observation

### 1.1 Architecture & Baseline Testing Status
- **Root Repository Layout**: Monorepo with React 18.3.1 + Vite 6.0.1 + Tailwind CSS 3.4.16 + React Router 7.18.1 frontend in `client/` and Express 4.19.2 + MySQL2 backend in `server/`.
- **Existing Test Infrastructure**:
  - `client/package.json` contains no unit test runner (`vitest` or `jest` are absent). `puppeteer: "^25.4.0"` is installed under `devDependencies`.
  - `server/tests/` contains standalone integration scripts (`budget_management.test.js`, `facilities_management.test.js`).
  - No end-to-end test runner currently exists at the project root (`tests/` directory is not yet created).
- **Core Requirements Reference**:
  - **R1 (Mobile Navigation Banner)**: Hide `ModuleTopNavBar` on mobile viewports (<768px, Tailwind `md`) in `ModuleLayout.jsx` and `ModuleDashboard.jsx` while keeping visible on desktop (>=768px).
  - **R2 (Button Sizing and Alignment)**: Standardize button sizes across all pages to uniform dimensions (42px standard `.btn`, 36px compact `.btn-sm`, 42x42 square `.btn-icon`, 36x36 `.btn-sm.btn-icon`), with primary actions in Deep Teal `#0E3646` (`.btn-primary`) and "Back"/"Return" in `.btn-secondary`.
  - **R3 (List Page Information Reduction)**: Eliminate redundant `Created By` (in 96 pages) and `Created Date` (in 90 pages), eliminate duplicate stacked KPI cards in `EquipmentList.jsx` and `ItemsList.jsx`, and align list columns to essential data using the BOQ / Cost Schedule line items reference.
  - **R4 (Filter and Search Arrangement)**: Re-architect list page filter controls into a dedicated 3-tier layout: Tier 1 Header -> Tier 2 KPI Cards -> Tier 3 Dedicated Filter Toolbar (`card-header` container with Search box `flex-1`, Dropdown Selects, Refresh button, ViewToggle), specifically relocating controls out of `DocumentRegisterPage.jsx` header.

### 1.2 Target Source Code Locations & Verbatim Code Evidences

#### Observation A: Navigation Banner (`client/src/components/ModuleLayout.jsx` & `ModuleDashboard.jsx`)
- In `client/src/components/ModuleLayout.jsx:195-197`:
  ```jsx
  return (
    <div className="bg-transparent border-b border-slate-200/60 dark:border-slate-800/60 px-4 py-2 transition-colors">
      <div className="flex items-center gap-1.5 flex-wrap">
  ```
  *Current state*: Missing `hidden md:block` on root container, causing `ModuleTopNavBar` to render on mobile screens.
- In `client/src/components/ModuleDashboard.jsx:550`:
  ```jsx
  <div className="sticky top-0 z-40 bg-transparent transition-colors">
    <ModuleTopNavBar sections={allSections} headerActions={resolvedHeaderActions} moduleKey={moduleKey} />
  </div>
  ```

#### Observation B: Button Sizing System (`client/src/styles.css`)
- In `client/src/styles.css:70-86`:
  ```css
  .btn {
    @apply inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98];
    min-height: 40px; /* Discrepancy: 40px base vs 42px on primary/secondary */
  }
  .btn-primary, .btn.btn-primary, button.btn-primary, a.btn-primary, button[data-action="create"], .btn-create {
    @apply inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-medium text-white transition-all duration-150 shadow-apple-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98];
    background-color: #0E3646 !important;
    color: #ffffff !important;
    border: none !important;
    min-height: 42px;
  }
  ```
- In `client/src/styles.css:122-125`:
  ```css
  .btn-danger {
    min-height: 40px; /* Discrepancy: 40px vs 42px standard */
  }
  ```
- In `client/src/styles.css:225-231`:
  ```css
  .input, .select {
    min-height: 42px;
    font-size: 0.875rem;
  }
  ```
  *Current state*: Missing dedicated `.btn-icon` (42x42) and `.btn-sm.btn-icon` (36x36) classes, causing refresh buttons with `p-2` to distort into non-square 32x42px rectangles.

#### Observation C: Drawing Register & RFIs (`client/src/pages/modules/project-management/construction/DocumentRegisterPage.jsx`)
- Header and filter row (`lines 166-253`):
  ```jsx
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div className="flex items-center gap-4">
      <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5"><ArrowLeft size={16} /> Back</Link>
      <div><h1 className="text-2xl font-bold ...">Drawing Register & RFIs</h1>...</div>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <select className="input text-sm py-1.5 h-auto min-w-[180px]" value={selectedProjectId} ...>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input type="text" placeholder="Search drawings & RFIs..." className="input pl-9 pr-3 py-1.5 text-sm h-auto w-48" value={searchTerm} ... />
      </div>
      <button onClick={fetchRecords} className="btn btn-secondary p-2" title="Refresh">
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
      </button>
      <button onClick={...} className="btn btn-primary inline-flex items-center gap-2">
        <Plus size={16} /> Register Drawing
      </button>
    </div>
  </div>
  ```
  *Current state*: Crammed header with 4 disparate heights (34px inputs, 32x42px refresh button, 42px register button) that wrap jaggedly below 1400px. Redundant `Category` column in table (`line 338`).

#### Observation D: BOQ / Cost Schedule Model (`client/src/pages/modules/project-management/construction/BOQManager.jsx`)
- Document Header Banner (`lines 1533-1550`): Project Name, Client/Employer, Site Location, BOQ Reference.
- Cost Category Discipline Cards (`lines 1604-1661`): 6 canonical cards (Materials, Labour, Equipment/Plant, Subcontracting, Transportation, Overheads).
- High-Density BOQ Line Items Grid (`lines 1722-1868`): `#`, `Item Code`, `Description`, `Cost Category`, `Unit (UoM)`, `Quantity`, `Unit Rate`, `Amount`, `Rate Build`, `Del`.
  *Current state*: Line items action bar (`lines 1674-1718`) uses ad-hoc inline classes (~28px) distinct from header buttons (42px).

#### Observation E: Sales Invoices List (`client/src/pages/modules/sales/invoices/InvoiceList.jsx`)
- Header (`lines 566-574`):
  ```jsx
  <Link to="/sales?section=Sales%20Transactions" className="btn btn-secondary">Return to Menu</Link>
  <Link to="/sales/invoices/new" className="btn-success">+ New Invoice</Link>
  ```
  *Current state*: Semantic color mismatch (green `btn-success` instead of Deep Teal `#0E3646` `.btn-primary`).
- Table Headers (`lines 678-680`):
  ```jsx
  <th className="text-right">Actions</th>
  <SortableHeader label="Created By" sortKey="created_by_name" ... className="grid-created-by-cell" />
  <SortableHeader label="Created Date" sortKey="created_at" ... className="grid-created-date-cell" />
  ```
  *Current state*: Redundant `Created By` and `Created Date` placed after `Actions` column.

#### Observation F: Equipment & Assets List (`client/src/pages/modules/maintenance/equipment/EquipmentList.jsx`)
- Stacked Duplicate KPI Cards (`lines 138-182` AND `lines 186-227`):
  - Block 1 (lines 138-182): "Apple HIG KPI Stat Cards" (Total Equipment, Active Status, Under Repair, Expired Warranty).
  - Block 2 (lines 186-227): "Metric Stats Cards" (Active Equipment Units, Total Equipment Units, Pending Equipment Units, Completed Equipment Units).
  *Current state*: Two consecutive sets of 4 KPI cards waste 250px vertical screen space before the table begins.

#### Observation G: Employee Setup List (`client/src/pages/modules/human-resources/employees/EmployeeList.jsx`)
- Header buttons (`lines 278-301`): Download Template (28px / `rounded-md`), Upload (28px / `rounded-md`), Return to Menu (42px), + New Employee (`btn-success`, 42px).
- Table Headers (`lines 425-428`):
  ```jsx
  <th className="... w-36">Actions</th>
  <th className="... w-28">Created By</th>
  <th className="... w-28">Created Date</th>
  <th className="... w-24">Attachments</th>
  ```
  *Current state*: Redundant `Created By`, `Created Date`, and a separate `Attachments` column. View/Edit buttons in rows use `h-8` (32px) while `ListAttachmentIconButton` uses `h-9` (36px).

#### Observation H: Journal Vouchers List (`client/src/pages/modules/finance/JournalVoucherList.jsx`)
- Table action row (`lines 185, 199, 210`):
  ```jsx
  <Link ... className="... rounded-full ... h-9">View</Link>
  <Link ... className="... rounded-full ... h-9">Edit</Link>
  <ListPrintIconButton ... /> {/* rounded-lg */}
  ```
  *Current state*: Mismatched `rounded-full` pills alongside `rounded-lg` document action icons within the same row.

---

## 2. Logic Chain

1. **Cross-Feature Interaction Necessity (Tier 3)**:
   - Features cannot be verified in isolation. For example, testing R1 (Mobile Viewport <768px) alone only checks if `ModuleTopNavBar` is hidden. But when a mobile user lands on a list page, the mobile viewport interacts with R2 (touch targets must remain >=42px), R3 (reduced column count prevents horizontal page blowouts), and R4 (filter bar must stack vertically into a clean layout).
   - Testing pairwise interactions guarantees that responsive layout adjustments do not break button dimensions, that filter queries operate correctly when non-essential columns are deleted, and that modal workflows triggered from 36px table row actions correctly surface audit data with 42px standardized footer buttons.

2. **Real-World End-to-End Scenarios Necessity (Tier 4)**:
   - Isolated assertion tests verify individual DOM nodes, but business users execute cohesive operational workflows across multiple disciplines (Construction, Finance, Inventory, Maintenance, HR).
   - Tier 4 tests model end-to-end user journeys: an engineer managing drawings and RFIs, a quantity surveyor inspecting BOQs and launching rate analyses, an accounts manager reviewing sales invoices and printing documents, and an HR lead navigating staff rosters. Passing these scenarios confirms production readiness without functional regression.

3. **Infrastructure Architecture Necessity (`TEST_INFRA.md`)**:
   - Because `client/` has no built-in unit test runner, the E2E infrastructure must provide a fast, deterministic, self-contained test runner (`tests/e2e/runner.js`) that runs via `node tests/e2e/runner.js` without requiring external microservices, cloud dependencies, or database migrations.
   - The runner must combine DOM/viewport rendering emulation (Puppeteer or headless DOM engine) with AST static verification (Babel/Acorn/Regex parsing of JSX files) to deliver sub-second validation of button classes, height bounds, and column counts across all 422 list pages.

---

## 3. Caveats

1. **Read-Only Investigation Compliance**: This survey is strictly read-only. No source files, CSS rules, or application code were modified.
2. **Pre-existing List Page Syntax Errors**: Survey Explorer 1 documented 15 pre-existing syntax errors in list pages (such as `VehicleServicingList.jsx` and `FMHelpdeskPage.jsx` originating from a legacy card script). These are tracked under Milestone M1 (F2) and must be restored so that Vite builds cleanly.
3. **Headless Browser Execution Speed**: Running full Puppeteer browser instances over hundreds of pages in CI can be resource-intensive. Therefore, the test infrastructure is architected in tiers: Tier 1 and 2 utilize fast AST and static CSS/DOM analysis for universal coverage, while Tiers 3 and 4 leverage targeted headless browser sessions for critical viewport rendering, interaction workflows, and layout computation checks.

---

## 4. Conclusion & Comprehensive Test Specifications

### 4.1 Tier 3: Cross-Feature Combinations (Pairwise Interaction Tests)

The following 12 concrete pairwise test cases rigorously validate cross-feature interactions across R1, R2, R3, and R4:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 3: CROSS-FEATURE PAIRWISE INTERACTION MATRIX                                      │
├───────────────┬─────────────────────────────┬──────────────────────────────────────────┤
│ Test ID       │ Feature Pair                │ Target Page / Context                    │
├───────────────┼─────────────────────────────┼──────────────────────────────────────────┤
│ TEST-T3-01    │ R1 (Mobile) × R2 (Buttons)  │ ModuleLayout + InvoiceList.jsx           │
│ TEST-T3-02    │ R1 (Mobile) × R4 (Filter)   │ DocumentRegisterPage.jsx                 │
│ TEST-T3-03    │ R2 (Buttons) × R3 (Density) │ InvoiceList.jsx Table Rows               │
│ TEST-T3-04    │ R2 (Buttons) × R4 (Filter)  │ DocumentRegisterPage.jsx Header & Filter │
│ TEST-T3-05    │ R3 (Density) × R4 (Filter)  │ InvoiceList.jsx Search & Column Index    │
│ TEST-T3-06    │ R1 (Mobile) × R3 (Density)  │ EmployeeList.jsx Mobile Card Layout      │
│ TEST-T3-07    │ R2 (Buttons) × R4 (Filter)  │ AssetRegisterList.jsx Filter Baseline    │
│ TEST-T3-08    │ R2 (Buttons) × R3 (Density) │ BOQManager.jsx Rate Analysis Modal       │
│ TEST-T3-09    │ R3 (Density) × R4 (Filter)  │ EquipmentList.jsx 3-Tier Layout Fold     │
│ TEST-T3-10    │ R1 (Mobile) × R2 (Buttons)  │ AppShell Hamburger vs ModuleTopNavBar    │
│ TEST-T3-11    │ R2 (Buttons) × R3 (Density) │ JournalVoucherList.jsx Action Radius     │
│ TEST-T3-12    │ R1 (Mobile) × R4 (Filter)   │ BOQManager.jsx Project Switcher Dropdown │
└───────────────┴─────────────────────────────┴──────────────────────────────────────────┘
```

#### Detailed Test Specifications:

#### `TEST-T3-01`: Mobile Viewport (<768px) × Standard Button Touch Target Height
- **Feature Pair**: R1 (F1: Mobile Navigation Hiding) × R2 (F4: Header & Action Button Standardization).
- **Target**: `client/src/pages/modules/sales/invoices/InvoiceList.jsx` mounted within `ModuleDashboard.jsx`.
- **Preconditions**: Viewport set to standard mobile width: `375px x 667px` (iPhone SE).
- **Interaction Steps**:
  1. Load `/sales/invoices` on 375px viewport.
  2. Locate `ModuleTopNavBar` container.
  3. Locate header action buttons ("Return to Menu" and "+ New Invoice").
  4. Measure bounding box dimensions and compute styles.
- **Assertions**:
  - `window.getComputedStyle(document.querySelector("div.hidden.md\\:block")).display === "none"`
  - `getBoundingClientRect().height` of `Return to Menu` is `>= 42px` (exactly 42px).
  - `getBoundingClientRect().height` of `+ New Invoice` is `>= 42px` (exactly 42px).
  - Header button container does not overflow horizontally: `buttonContainer.getBoundingClientRect().right <= 375`.
- **Failure Criteria**: `ModuleTopNavBar` is visible, or any header button has height < 42px or clips beyond viewport width.

#### `TEST-T3-02`: Mobile Viewport (<768px) × Dedicated Filter Toolbar Responsive Stacking
- **Feature Pair**: R1 (F1: Mobile Navigation Hiding) × R4 (F9/F10: Dedicated Filter Toolbar).
- **Target**: `client/src/pages/modules/project-management/construction/DocumentRegisterPage.jsx`.
- **Preconditions**: Viewport set to `390px x 844px` (iPhone 12/13/14).
- **Interaction Steps**:
  1. Navigate to `/project-management/construction/document-register`.
  2. Inspect Tier 3 Dedicated Filter Toolbar container (`.card-header`).
  3. Inspect child controls: Search input, Project selector dropdown, Refresh button.
- **Assertions**:
  - Filter container utilizes responsive flex direction (`flex-col sm:flex-row`).
  - Search box input occupies 100% of available mobile card width (`width >= 340px`).
  - Dropdown select and refresh button stack cleanly without overlapping search box.
  - No horizontal scroll on root container: `document.documentElement.scrollWidth <= window.innerWidth`.
- **Failure Criteria**: Filter controls remain locked in horizontal non-wrapping row, search box has fixed desktop width (e.g. `w-48`), or elements overlap.

#### `TEST-T3-03`: Standard Button Sizing System × High-Density Table Row Actions
- **Feature Pair**: R2 (F3/F5: Button Sizing System & Table Row Actions) × R3 (F6: Audit Columns Removal).
- **Target**: `client/src/pages/modules/sales/invoices/InvoiceList.jsx`.
- **Preconditions**: Viewport set to desktop `1440px x 900px`; dataset loaded with >= 10 invoice rows.
- **Interaction Steps**:
  1. Inspect invoice table headers and table body rows.
  2. Measure heights, padding, and corner radius of row action buttons ("View", "Edit", "Print", "PDF").
  3. Measure total rendered table height and row density.
- **Assertions**:
  - `Created By` (`grid-created-by-cell`) and `Created Date` (`grid-created-date-cell`) headers are absent from the DOM.
  - "View" button: computed height is exactly `36px` (`h-9`), corner radius is `8px` (`rounded-lg`).
  - "Edit" button: computed height is exactly `36px` (`h-9`), corner radius is `8px` (`rounded-lg`).
  - `ListPrintIconButton` and `ListPdfIconButton`: computed height is exactly `36px`, width is `36px`.
  - Individual table row height does not exceed `56px`, preserving dense tabular layout without vertical distortion.
- **Failure Criteria**: Any row action button renders at 42px, or has pill radius (`rounded-full`), or table row height balloons > 60px.

#### `TEST-T3-04`: Deep Teal Header Primary Button × Clean Filter Bar Separation
- **Feature Pair**: R2 (F4: Header Standardization Deep Teal `#0E3646`) × R4 (F9: Drawing Register Re-architecture).
- **Target**: `client/src/pages/modules/project-management/construction/DocumentRegisterPage.jsx`.
- **Preconditions**: Viewport set to `1280px x 800px`.
- **Interaction Steps**:
  1. Inspect Tier 1 Header: Title, Back button, and "+ Register Drawing" button.
  2. Inspect Tier 3 Filter Bar: Project selector, Search input, and Refresh icon button.
- **Assertions**:
  - "+ Register Drawing" button has class `.btn-primary` with computed `background-color` matching `#0E3646` (`rgb(14, 54, 70)`), height `42px`, and corner radius `12px` (`rounded-xl`).
  - Header container contains ZERO search inputs or filter select dropdowns (all search/select elements reside strictly inside Tier 3 filter container).
  - Back button has class `.btn-secondary`, height `42px`.
  - Refresh button in Tier 3 has class `.btn-icon`, dimensions `42px x 42px` (square).
- **Failure Criteria**: Search input is inside the top header row, or "+ Register Drawing" is styled in green/blue or is non-42px.

#### `TEST-T3-05`: Filter Search Query × Essential Data Retention (No Missing Audit Keys)
- **Feature Pair**: R3 (F6: List Clutter Reduction) × R4 (F10: Universal Filter Toolbar).
- **Target**: `client/src/pages/modules/sales/invoices/InvoiceList.jsx`.
- **Preconditions**: Dataset containing mock invoices with `invoice_no`, `customer_name`, `status`, and `net_amount`.
- **Interaction Steps**:
  1. Enter search term `"INV-2026"` into filter toolbar search input.
  2. Verify filtered rows in table body.
  3. Enter customer name `"Acme Corp"` into search input.
  4. Inspect console logs and error listeners during typing and filtering.
- **Assertions**:
  - Filter logic correctly matches on essential fields (`invoice_no`, `customer_name`).
  - Filter logic contains NO references to deleted properties (`created_by_name`, `created_at`).
  - Zero `TypeError: Cannot read properties of undefined` in console.
  - Table rows immediately update to matching items without layout shifts.
- **Failure Criteria**: Search input fails to filter, throws exceptions when referencing removed audit fields, or breaks table rendering.

#### `TEST-T3-06`: Mobile Viewport (<768px) × Essential Data Retention (Zero Horizontal Overflow)
- **Feature Pair**: R1 (F1: Mobile Navigation Hiding) × R3 (F8: Essential Data Principles & Field Cleanup).
- **Target**: `client/src/pages/modules/human-resources/employees/EmployeeList.jsx`.
- **Preconditions**: Viewport set to mobile width `375px x 667px`.
- **Interaction Steps**:
  1. Load `/human-resources/employees` on 375px screen.
  2. Scroll vertically down through employee list.
  3. Check `document.documentElement.scrollWidth` and `window.innerWidth`.
- **Assertions**:
  - Top navigation banner is hidden.
  - Separate `Attachments` column, `Created By` column, and `Created Date` column are absent.
  - Employee cards / rows render essential data: Avatar, Name, Code, Position, Status badge, Action button.
  - `document.documentElement.scrollWidth === window.innerWidth` (exactly 375px, 0px horizontal overflow).
- **Failure Criteria**: Horizontal scrollbar appears on body/window, or redundant audit columns bleed past screen edge.

#### `TEST-T3-07`: Filter Bar Height Uniformity & 0px Vertical Offset Jitter
- **Feature Pair**: R2 (F3: Button & Input Sizing System) × R4 (F10: 3-Tier Filter Toolbar).
- **Target**: `client/src/pages/modules/asset-management/AssetRegisterList.jsx`.
- **Preconditions**: Desktop viewport `1440px x 900px`.
- **Interaction Steps**:
  1. Inspect filter bar card container (`p-3.5`).
  2. Retrieve bounding boxes of Search Input, Category Select, Status Select, Refresh Button, and ViewToggle.
  3. Compare computed heights and vertical centers (`top + height / 2`).
- **Assertions**:
  - Search Input: computed height is `42px` (`±1px`).
  - Category Dropdown: computed height is `42px` (`±1px`).
  - Status Dropdown: computed height is `42px` (`±1px`).
  - Refresh Button: computed height is `42px`, computed width is `42px` (`btn-icon` square).
  - Vertical center offset across all 4 adjacent controls is `< 1.5px` (pixel-perfect alignment).
- **Failure Criteria**: Refresh button renders as 32x42px rectangle, or select input renders at 34px/38px while search input is 42px.

#### `TEST-T3-08`: Standard 42px Modal Footers Triggered from Compact 36px Table Actions
- **Feature Pair**: R2 (F4: Modal Footer Standardization) × R3 (F8: Detail Modal Information Retention).
- **Target**: `client/src/pages/modules/project-management/construction/BOQManager.jsx`.
- **Preconditions**: Desktop viewport `1440px x 900px`; BOQ document loaded with line items.
- **Interaction Steps**:
  1. Click "Rate Build" compact action button (36px) on a line item row.
  2. Wait for `RateAnalysisModal` dialog overlay to render.
  3. Inspect modal footer action buttons ("Cancel" and "Save Rate Analysis").
- **Assertions**:
  - Modal overlay is visible with `z-index >= 50`.
  - "Cancel" button has class `.btn-secondary`, computed height `42px`, font size `14px` (`text-sm`).
  - "Save Rate Analysis" button has class `.btn-primary` (Deep Teal `#0E3646`), computed height `42px`, font size `14px`.
  - Neither modal button possesses conflicting micro-overrides (`text-xs py-1 px-2.5`).
- **Failure Criteria**: Modal buttons render with 32px height, miniature 11px text, or non-matching heights.

#### `TEST-T3-09`: Single KPI Card Row × 3-Tier Layout Above-the-Fold Visibility
- **Feature Pair**: R3 (F7: Duplicate KPI Card Elimination) × R4 (F10: Universal 3-Tier Layout).
- **Target**: `client/src/pages/modules/maintenance/equipment/EquipmentList.jsx`.
- **Preconditions**: Desktop viewport `1920px x 1080px`.
- **Interaction Steps**:
  1. Navigate to `/maintenance/equipment`.
  2. Count all rendered KPI stat cards on page.
  3. Measure vertical position (`getBoundingClientRect().top`) of the primary Equipment Table.
- **Assertions**:
  - Total KPI card count is exactly 4 (Total Equipment, Active Status, Under Repair, Expired Warranty).
  - Duplicate second block of 4 cards (lines 186-227) is NOT present in the DOM.
  - Dedicated Filter Toolbar top position is `<= 320px`.
  - Primary Equipment Table top position is `<= 410px` (guaranteeing >= 10 table rows are immediately visible above the 1080px fold without scrolling).
- **Failure Criteria**: 8 KPI cards are rendered, or table is pushed below 600px fold.

#### `TEST-T3-10`: Mobile Breakpoint Boundary (767px vs 768px) Navigation & Drawer Consistency
- **Feature Pair**: R1 (F1: Mobile Nav Banner Hiding) × R2 (F3: Standard Sizing System).
- **Target**: `client/src/components/ModuleLayout.jsx` + `client/src/layout/AppShell.jsx`.
- **Preconditions**: Headless browser session with dynamic viewport resizing.
- **Interaction Steps**:
  1. Set viewport to `767px x 800px` (Mobile boundary). Check `ModuleTopNavBar` and mobile hamburger button.
  2. Set viewport to `768px x 800px` (Tablet/Desktop boundary). Check `ModuleTopNavBar` and mobile hamburger button.
- **Assertions**:
  - At 767px: `ModuleTopNavBar` computed display is `"none"`; mobile drawer hamburger button is visible in header.
  - At 768px: `ModuleTopNavBar` computed display is `"block"`; mobile drawer hamburger is hidden (`display: "none"`).
  - Transition from 767px to 768px occurs cleanly without layout jitter or script errors.
- **Failure Criteria**: `ModuleTopNavBar` remains visible at 767px or remains hidden at 768px.

#### `TEST-T3-11`: Table Row Action Radius Uniformity × Consolidated Action Width
- **Feature Pair**: R2 (F5: Table Row Action Consistency) × R3 (F6: Action Column Bloat Reduction).
- **Target**: `client/src/pages/modules/finance/JournalVoucherList.jsx`.
- **Preconditions**: Desktop viewport `1440px x 900px`; vouchers loaded in table.
- **Interaction Steps**:
  1. Inspect "View", "Edit", "Print", "PDF" action buttons in voucher table row.
  2. Measure border-radius of each button.
  3. Measure total width of the `Actions` table cell.
- **Assertions**:
  - "View" button: computed `border-top-left-radius` is `8px` (`rounded-lg`). Class `rounded-full` is absent.
  - "Edit" button: computed `border-top-left-radius` is `8px` (`rounded-lg`). Class `rounded-full` is absent.
  - "Print" and "PDF" icon buttons have `border-top-left-radius` of `8px` (`rounded-lg`).
  - Total `Actions` column width is `<= 280px`, preventing horizontal table sprawl.
- **Failure Criteria**: Any button in the row retains pill styling (`rounded-full`), or action column width exceeds 320px.

#### `TEST-T3-12`: Mobile Viewport (<768px) × Dedicated Filter Toolbar Project Switcher Interaction
- **Feature Pair**: R1 (F1: Mobile Navigation Hiding) × R4 (F9: Construction Dedicated Filter Toolbar).
- **Target**: `client/src/pages/modules/project-management/construction/DocumentRegisterPage.jsx`.
- **Preconditions**: Viewport set to `375px x 667px`; multiple projects loaded.
- **Interaction Steps**:
  1. Tap project switcher select dropdown in Tier 3 filter toolbar.
  2. Select alternate project option from list.
  3. Observe table refresh and loading state.
- **Assertions**:
  - Project dropdown renders with full width (`w-full`), min-height `42px`.
  - Tapping dropdown does NOT overlap search input or refresh button.
  - Selecting new project dispatches `fetchRecords()` and updates table data cleanly.
- **Failure Criteria**: Project selector is truncated, overflows viewport, or causes layout jumping.

---

### 4.2 Tier 4: Real-World Application Scenarios (End-to-End User Journeys)

The following 6 realistic enterprise workflows represent complete, authentic user journeys covering every aspect of the UI refinements:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TIER 4: REAL-WORLD APPLICATION SCENARIOS                                               │
├───────────────┬──────────────────────────────────────────┬─────────────────────────────┤
│ Scenario ID   │ Business Domain / Scenario Title         │ Key Modules & Pages         │
├───────────────┼──────────────────────────────────────────┼─────────────────────────────┤
│ SCENARIO-T4-01│ Construction Document Register & RFIs    │ DocumentRegisterPage.jsx    │
│ SCENARIO-T4-02│ BOQ Cost Management & Rate Analysis      │ BOQManager.jsx              │
│ SCENARIO-T4-03│ Sales Invoice Review & Document Printing │ InvoiceList.jsx             │
│ SCENARIO-T4-04│ Maintenance Equipment Registry Inspection│ EquipmentList.jsx           │
│ SCENARIO-T4-05│ HR Employee Directory & Staff Roster     │ EmployeeList.jsx            │
│ SCENARIO-T4-06│ Financial Journal Voucher Audit Review   │ JournalVoucherList.jsx      │
└───────────────┴──────────────────────────────────────────┴─────────────────────────────┘
```

#### Detailed Scenario Specifications:

#### `SCENARIO-T4-01`: Construction Document Register & RFI Review Lifecycle
- **Persona**: Site Architect / Project Engineer.
- **Target Page**: `client/src/pages/modules/project-management/construction/DocumentRegisterPage.jsx`.
- **Workflow Journey**:
  1. **Landing & Navigation**: Engineer opens Project Management on desktop (1440px). Observes `ModuleTopNavBar` visible at top.
  2. **Page Header Review (Tier 1)**: Clicks "Drawing Register & RFIs". Observes Back button (`.btn-secondary`, 42px), Page Title with `FileCode` icon, and Primary Action button "+ Register Drawing" in Deep Teal `#0E3646` (`.btn-primary`, 42px). Verifies zero filter dropdowns or search bars in the top header row.
  3. **KPI Metric Review (Tier 2)**: Observes 4 canonical stat cards (Approved Drawings, Pending Review, Superseded / Void, Open RFIs) in a clean responsive grid.
  4. **Filter & Search Operations (Tier 3)**:
     - Selects Project "PRJ-001 - Ridge Residential Complex" from Tier 3 project dropdown (42px).
     - Enters search term `"ARCH-101"` in 42px search field.
     - Clicks Refresh button (`.btn-icon`, 42x42px square).
  5. **Drawings Table Inspection**:
     - Inspects table columns: verifies `Drawing #`, `Title`, `Discipline`, `Revision`, `Status`, `Cloudinary File Link`.
     - Confirms redundant `Category` column is completely removed.
  6. **RFI Tab Workflow**:
     - Switches tab to "Requests for Information (RFIs)".
     - Primary button dynamically changes to "+ Raise RFI" in Deep Teal `#0E3646`.
     - Inspects RFI table: verifies single unified `Impact` column (e.g. badge `Cost: N | Sched: Y`) instead of two separate bloated columns.
  7. **Mobile Transition (Field Mobility)**:
     - Engineer switches tablet/phone to mobile view (375px width).
     - `ModuleTopNavBar` vanishes automatically (`hidden md:block`).
     - Tier 1 Header stacks vertically; "+ Register Drawing" button maintains 42px touch target.
     - Tier 3 Filter toolbar cleanly stacks into vertical full-width controls.
     - 0px horizontal scroll on mobile document body.
- **Acceptance Gate**: 100% assertions pass across all 7 steps.

#### `SCENARIO-T4-02`: BOQ Cost Management & Rate Analysis Inspection
- **Persona**: Commercial Quantity Surveyor (QS) / Cost Manager.
- **Target Page**: `client/src/pages/modules/project-management/construction/BOQManager.jsx`.
- **Workflow Journey**:
  1. **Header & Project Selection**: QS opens BOQ Manager. Header displays "+ New BOQ" (`.btn-primary`, Deep Teal `#0E3646`, 42px). QS selects project from dropdown.
  2. **Document Header Card**: Observes project details banner displaying Project Code, Date, Project Name, Client/Employer, Site Location, and BOQ Reference.
  3. **Discipline KPI Cards**: Observes Cost Category Summary: exactly 6 discipline cards (Materials, Labour, Equipment/Plant, Subcontracting, Transportation, Overheads) with color-coded borders.
  4. **High-Density Line Items Grid**:
     - Line items table displays essential 8 columns: `#`, `Item Code`, `Description`, `Cost Category`, `Unit (UoM)`, `Quantity`, `Unit Rate`, `Amount (GHS)`.
     - Verifies NO secondary audit timestamps (`created_at`) or usernames pollute the line item rows.
     - Action toolbar buttons ("Add Line Item", "Import", "Export", "Print", "Save Changes") render with consistent heights and styling.
  5. **Modal Rate Analysis Drill-Down**:
     - QS clicks "Rate Build" compact action icon (36px) on line item `CONC-002`.
     - `RateAnalysisModal` opens: displays material formulas, labor hours, and plant charges.
     - Modal footer buttons ("Cancel" `.btn-secondary`, "Save Analysis" `.btn-primary`) both render at standard 42px height with `text-sm font-medium` typography, with 0px height distortion.
  6. **Closing & Verification**: QS closes modal; verifies Direct Cost Subtotal, Contingency %, Tax Code, and Final Estimated Total recalculate cleanly.
- **Acceptance Gate**: 100% assertions pass across all 6 steps.

#### `SCENARIO-T4-03`: Sales Invoice Management & Document Printing Workflow
- **Persona**: Billing Specialist / Accounts Receivable Officer.
- **Target Page**: `client/src/pages/modules/sales/invoices/InvoiceList.jsx`.
- **Workflow Journey**:
  1. **Header Review**: Specialist navigates to Sales Invoices. Observes Header containing "Return to Menu" (`.btn-secondary`, 42px) and "+ New Invoice" in Deep Teal `#0E3646` (`.btn-primary`, 42px) — legacy green `btn-success` is eliminated.
  2. **Summary Metric Cards**: Observes single 4-card metric row (Paid Invoices, Total Invoices, Pending/Unpaid, Total Revenue).
  3. **Dedicated Filter Operations**:
     - Searches customer `"Global Logistics Ltd"` in 42px search field.
     - Selects status `"UNPAID"` in 42px status dropdown.
     - Table instantly filters to matching invoices.
  4. **Invoice Table Clean Density Inspection**:
     - Table columns: `Invoice No`, `Date`, `Customer`, `Payment`, `Status`, `Net Amount`, `Actions`.
     - Confirms `Created By` and `Created Date` are completely eliminated from table headers and rows, eliminating horizontal scrollbar on standard 1366px screen.
  5. **Table Row Actions Execution**:
     - Action cell contains "View" (36px, `rounded-lg`), "Edit" (36px, `rounded-lg`), and document action icons (`ListPrintIconButton`, `ListPdfIconButton`).
     - Specialist clicks Print icon: trigger dispatches document print modal.
- **Acceptance Gate**: 100% assertions pass across all 5 steps.

#### `SCENARIO-T4-04`: Maintenance Equipment Registry Inspection
- **Persona**: Asset Maintenance Superintendent / Plant Engineer.
- **Target Page**: `client/src/pages/modules/maintenance/equipment/EquipmentList.jsx`.
- **Workflow Journey**:
  1. **Registry Landing**: User navigates to Maintenance Equipment registry.
  2. **Summary Cards Validation (No Duplicates)**:
     - Confirms page renders a single 4-card KPI row (Total Equipment, Active Status, Under Repair, Expired Warranty).
     - Confirms duplicate second block of 4 cards (lines 186-227) is eliminated, reclaiming 250px vertical screen space.
  3. **Above-the-Fold Table Visibility**:
     - Directly beneath the 4 KPI cards, the Dedicated Filter Toolbar is positioned at `< 320px` from top of viewport.
     - Primary Equipment Table begins at `< 410px`, ensuring table rows are immediately visible without initial scrolling on 1080p display.
  4. **Filter & Action Execution**:
     - User filters by Category `"HEAVY_PLANT"`.
     - Inspects table columns: `Asset Code`, `Equipment Name / Serial`, `Category`, `Location`, `Assignee`, `Status`, `Actions`.
     - Action buttons ("View Log", "Create Work Order") render at uniform 36px height (`h-9`, `rounded-lg`).
- **Acceptance Gate**: 100% assertions pass across all 4 steps.

#### `SCENARIO-T4-05`: HR Employee Directory & Staff Roster Navigation
- **Persona**: People Operations Lead / HR Generalist.
- **Target Page**: `client/src/pages/modules/human-resources/employees/EmployeeList.jsx`.
- **Workflow Journey**:
  1. **Header Alignment**: HR Lead opens Employee Setup. Header contains Download Template (42px/36px standardized), Bulk Upload, Return to Menu (`.btn-secondary`, 42px), and "+ New Employee" in Deep Teal `#0E3646` (`.btn-primary`, 42px). All header controls share a uniform vertical baseline.
  2. **Summary Metric Row**: Single 4-card staff roster metric row (Active Employees, Total Staff Roster, Department Count, On Leave).
  3. **Filter Toolbar**: Dedicated 42px search input with Lucide `Search` icon for quick employee lookup by name or employee ID.
  4. **Table Column Clutter Reduction**:
     - Table columns: `Photo`, `Code`, `Name & Email`, `Position`, `Department`, `Type`, `Status`, `Actions`.
     - Confirms absence of separate `Created By` column.
     - Confirms absence of separate `Created Date` column.
     - Confirms absence of separate `Attachments` column (attachment icon integrated into action cluster).
  5. **Row Action Uniformity**:
     - "View" and "Edit" buttons render at `36px` (`h-9`, `rounded-lg`), resolving the previous 32px (`h-8`) height mismatch and aligning with `ListAttachmentIconButton` (36px).
- **Acceptance Gate**: 100% assertions pass across all 5 steps.

#### `SCENARIO-T4-06`: Financial Journal Voucher Audit & Workflow Review
- **Persona**: Senior Financial Controller / Compliance Auditor.
- **Target Page**: `client/src/pages/modules/finance/JournalVoucherList.jsx`.
- **Workflow Journey**:
  1. **Header & Navigation**: Controller reviews Journal Vouchers list. Header contains "Return to Menu" (`.btn-secondary`, 42px) and "+ New Journal Voucher" (`.btn-primary`, Deep Teal `#0E3646`, 42px).
  2. **Filter & Date Range**: Controller sets date range in filter toolbar; all inputs and selects align at 42px baseline.
  3. **Table Row Action Inspection**:
     - Inspects "View" and "Edit" action buttons.
     - Confirms complete elimination of legacy pill shape (`rounded-full`); buttons now use `rounded-lg` (8px radius) with `h-9` (36px) height.
     - Adjacent `ListPrintIconButton` and `ListPdfIconButton` share identical 36px height and `rounded-lg` corner radius.
  4. **Audit Data Drill-Down**:
     - Clicking "View" opens full journal voucher modal where audit trail (posted by, timestamp, approval signature) is presented cleanly without cluttering the primary list view.
- **Acceptance Gate**: 100% assertions pass across all 4 steps.

---

### 4.3 Complete Architecture & Content for `TEST_INFRA.md`

Below is the definitive schema and complete markdown specification to be authored as `TEST_INFRA.md` at the project root:

```markdown
# OmniSuite E2E Test Infrastructure Specification (`TEST_INFRA.md`)

## 1. Test Philosophy & Principles
OmniSuite UI & Layout Production Verification is governed by four core architectural principles:
1. **Opaque-Box Requirement-Driven Testing**: Tests interact exclusively through the user-visible surface: viewport dimensions, rendered DOM tree, computed CSS styles, layout bounding boxes, and end-user interactive workflows. Tests do not rely on private internal component state.
2. **Defensive Anti-Flakiness**: Zero reliance on arbitrary timeouts (`sleep`). All async steps utilize explicit predicate waiting (DOM existence, style computation match, network request completion).
3. **Deterministic & Self-Contained Execution**: The test suite requires zero external microservices, cloud mock servers, or live database instances. Test execution is fully self-contained using Node.js, static AST analyzers, and headless browser sessions.
4. **Strict Pass/Fail Semantics**: All test suites must exit with code 0 on complete pass, or non-zero on any failure, emitting structured JSON and console summaries for CI/CD gating.

---

## 2. Feature Inventory & Requirements Traceability
| Feature ID | Feature Name | Requirement | Milestone | Target Files | Verification Method |
|:---|:---|:---|:---|:---|:---|
| **F1** | Mobile Nav Banner Hiding | R1 | M1 | `ModuleLayout.jsx`, `ModuleDashboard.jsx` | Viewport rendering (<768px `display:none`, >=768px `display:block`) |
| **F2** | Client Build & Syntax Restoration | R1 | M1 | 15 list pages in `client/src/pages/modules/` | esbuild / Vite production compilation |
| **F3** | Button Sizing System & CSS Architecture | R2 | M2 | `client/src/styles.css` | Computed height checks: 42px base, 36px `.btn-sm`, 42x42 `.btn-icon` |
| **F4** | Header & Action Button Standardization | R2 | M2 | Header toolbars across modules | Computed background color `#0E3646`, 42px height, `.btn-primary` |
| **F5** | Table Row Action Consistency | R2 | M2 | Table rows across modules | Computed height 36px (`h-9`), radius 8px (`rounded-lg`), no pills |
| **F6** | List Clutter Reduction (Audit Columns) | R3 | M3 | 96 transactional list pages | DOM assertion: absence of `Created By` and `Created Date` |
| **F7** | Duplicate KPI Card Removal | R3 | M3 | `EquipmentList.jsx`, `ItemsList.jsx` | DOM count: exactly 1 card grid (4 cards max), zero duplicate blocks |
| **F8** | BOQ Essential Data Retention | R3 | M3 | `BOQManager.jsx`, `DocumentRegisterPage.jsx` | Column schema matching BOQ reference; removal of redundant columns |
| **F9** | Drawing Register Filter Re-architecture | R4 | M4 | `DocumentRegisterPage.jsx` | Structural assertion: filters relocated from header to Tier 3 card |
| **F10**| Universal 3-Tier Filter Toolbar | R4 | M4 | List pages across all modules | 3-tier hierarchy: Header -> KPI row -> Dedicated Filter Toolbar |
| **F11**| End-to-End Verification & Layout Testing| All| M5 | Test suite execution across all tiers | 100% pass across Tiers 1, 2, 3, 4 |

---

## 3. Directory Structure & Test Suite Layout
```
tests/e2e/
├── runner.js                      # Central test runner CLI entry point
├── config.js                      # Viewport presets, color tokens, timeout configs
├── harness/
│   ├── ast-checker.js             # Static AST / JSX parser for fast universal checks
│   ├── dom-engine.js              # Headless browser / DOM evaluation manager
│   ├── style-checker.js           # Computed style and bounding box assertor
│   └── assert.js                  # Assertion library with formatted error diffs
├── tier1-features/                # Tier 1: Feature Coverage (>=50 tests)
│   ├── f01-mobile-nav.test.js
│   ├── f03-button-system.test.js
│   ├── f04-header-actions.test.js
│   ├── f05-row-actions.test.js
│   ├── f06-audit-columns.test.js
│   ├── f07-kpi-cards.test.js
│   ├── f08-boq-alignment.test.js
│   └── f09-filter-layout.test.js
├── tier2-boundaries/              # Tier 2: Boundary & Corner Cases (>=50 tests)
│   ├── viewport-boundaries.test.js # 767px vs 768px breakpoint boundary tests
│   ├── empty-datasets.test.js     # Table layouts with 0 records
│   ├── long-text-overflow.test.js # Extreme strings in table and button labels
│   └── extreme-viewports.test.js  # Ultrawide (2560px) and ultra-narrow (320px)
├── tier3-combinations/            # Tier 3: Cross-Feature Pairwise Tests (12 tests)
│   ├── mobile-button-interactions.test.js
│   ├── filter-density-interactions.test.js
│   ├── modal-workflow-interactions.test.js
│   └── layout-cadence-interactions.test.js
└── tier4-scenarios/               # Tier 4: Real-World Scenarios (6 workflows)
    ├── scenario-construction-drawing-register.test.js
    ├── scenario-boq-cost-management.test.js
    ├── scenario-sales-invoice-lifecycle.test.js
    ├── scenario-equipment-maintenance-review.test.js
    ├── scenario-hr-employee-directory.test.js
    └── scenario-finance-journal-voucher.test.js
```

---

## 4. Test Execution Architecture & Commands
- **Run All Test Tiers**:
  ```powershell
  node tests/e2e/runner.js
  ```
- **Run Specific Tier**:
  ```powershell
  node tests/e2e/runner.js --tier=1
  node tests/e2e/runner.js --tier=2
  node tests/e2e/runner.js --tier=3
  node tests/e2e/runner.js --tier=4
  ```
- **Run Targeted Feature**:
  ```powershell
  node tests/e2e/runner.js --filter="f01"
  node tests/e2e/runner.js --filter="scenario-construction"
  ```

---

## 5. Coverage Thresholds & Quality Gates
1. **Pass Rate**: 100% required. Any test failure immediately halts pipeline with exit code `1`.
2. **Execution Budget**: Full suite must execute in `< 45 seconds`.
3. **AST Coverage**: 100% of 422 list pages verified for absence of `Created By` and `Created Date` columns.
4. **Console Hygiene**: 0 unhandled promise rejections, 0 syntax errors, 0 undefined property exceptions.
```

---

### 4.4 Complete Schema & Specification for `TEST_READY.md`

`TEST_READY.md` serves as the formal gating artifact generated by the E2E Testing Track upon successful completion of all test executions. Its authoritative schema is defined below:

```markdown
# Test Readiness & Verification Sign-Off (`TEST_READY.md`)

## 1. Executive Summary
- **Verification Timestamp**: YYYY-MM-DDTHH:MM:SSZ
- **Commit Hash / Tree State**: <SHA>
- **Overall Status**: PASSED (100% Gate Clearance)
- **Total Test Cases Executed**: <COUNT> (>= 118 tests total)
- **Total Execution Duration**: <SECONDS>s

---

## 2. Test Execution Breakdown by Tier
| Tier | Description | Cases Planned | Cases Executed | Passed | Failed | Status |
|:---|:---|:---|:---|:---|:---|:---|
| **Tier 1** | Feature Coverage (F1 - F10) | >= 50 | 50 | 50 | 0 | PASSED |
| **Tier 2** | Boundary & Corner Cases | >= 50 | 50 | 50 | 0 | PASSED |
| **Tier 3** | Cross-Feature Combinations (Pairwise) | >= 10 | 12 | 12 | 0 | PASSED |
| **Tier 4** | Real-World Application Scenarios | >= 5 | 6 | 6 | 0 | PASSED |
| **Total** | All Tiers Combined | >= 115 | 118 | 118 | 0 | **PASSED** |

---

## 3. Tier 3 Pairwise Verification Sign-Off
- [x] `TEST-T3-01`: Mobile Viewport (<768px) × Standard Button Touch Target Height (42px)
- [x] `TEST-T3-02`: Mobile Viewport (<768px) × Dedicated Filter Toolbar Responsive Stacking
- [x] `TEST-T3-03`: Standard Button Sizing System × High-Density Table Row Actions (36px, rounded-lg)
- [x] `TEST-T3-04`: Deep Teal Header Primary Button (`#0E3646`) × Clean Filter Bar Separation
- [x] `TEST-T3-05`: Filter Search Query × Essential Data Retention (No Missing Audit Keys)
- [x] `TEST-T3-06`: Mobile Viewport (<768px) × Essential Data Retention (Zero Horizontal Overflow)
- [x] `TEST-T3-07`: Filter Bar Height Uniformity & 0px Vertical Offset Jitter (42px baseline)
- [x] `TEST-T3-08`: Standard 42px Modal Footers Triggered from Compact 36px Table Actions
- [x] `TEST-T3-09`: Single KPI Card Row × 3-Tier Layout Above-the-Fold Visibility (<410px table top)
- [x] `TEST-T3-10`: Mobile Breakpoint Boundary (767px vs 768px) Navigation & Drawer Consistency
- [x] `TEST-T3-11`: Table Row Action Radius Uniformity (rounded-lg) × Consolidated Action Width
- [x] `TEST-T3-12`: Mobile Viewport (<768px) × Dedicated Filter Toolbar Project Switcher Interaction

---

## 4. Tier 4 Real-World Scenario Sign-Off
- [x] `SCENARIO-T4-01`: Construction Document Register & RFI Review Lifecycle (`DocumentRegisterPage.jsx`)
- [x] `SCENARIO-T4-02`: BOQ Cost Management & Rate Analysis Inspection (`BOQManager.jsx`)
- [x] `SCENARIO-T4-03`: Sales Invoice Management & Document Printing Workflow (`InvoiceList.jsx`)
- [x] `SCENARIO-T4-04`: Maintenance Equipment Registry Inspection (`EquipmentList.jsx`)
- [x] `SCENARIO-T4-05`: HR Employee Directory & Staff Roster Navigation (`EmployeeList.jsx`)
- [x] `SCENARIO-T4-06`: Financial Journal Voucher Audit & Workflow Review (`JournalVoucherList.jsx`)

---

## 5. Deployment Authorization
All functional and responsive UI requirements (R1, R2, R3, R4) are verified under opaque-box testing conditions. The repository is cleared for production merge.
```

---

## 5. Verification Method

To independently verify the observations, logic chains, and test specifications presented in this report:

### 5.1 Verification of Code Locations & Current Flaws
1. **Verify Mobile Navigation Container**:
   ```powershell
   Select-String -Path "client/src/components/ModuleLayout.jsx" -Pattern "ModuleTopNavBar"
   ```
   *Expected*: Line 196 lacks `hidden md:block`.
2. **Verify Drawing Register Crammed Header**:
   ```powershell
   Get-Content "client/src/pages/modules/project-management/construction/DocumentRegisterPage.jsx" | Select-Object -Skip 165 -First 85
   ```
   *Expected*: Search input, project select, refresh button, and "+ Register Drawing" button reside in the same header flex container.
3. **Verify Duplicate KPI Cards in EquipmentList**:
   ```powershell
   Get-Content "client/src/pages/modules/maintenance/equipment/EquipmentList.jsx" | Select-Object -Skip 135 -First 95
   ```
   *Expected*: Lines 138-182 and lines 186-227 contain two consecutive 4-card grids.
4. **Verify Audit Columns in InvoiceList**:
   ```powershell
   Get-Content "client/src/pages/modules/sales/invoices/InvoiceList.jsx" | Select-Object -Skip 670 -First 18
   ```
   *Expected*: `Created By` and `Created Date` headers appear after the `Actions` column header.

### 5.2 Test Infrastructure Runner Dry Run
Execute the newly designed test runner once implemented:
```powershell
node tests/e2e/runner.js
```
*Expected*: Exit code 0, 118 test cases reported across 4 tiers with structured summary.

### 5.3 Invalidation Conditions
- Any Tier 3 test failing due to button clipping on mobile viewports (<768px).
- Any table row displaying action buttons with height other than 36px (`h-9`) or non-`rounded-lg` radius.
- Any list page retaining `Created By` or `Created Date` in its primary table headers.
- Any real-world scenario encountering unhandled JavaScript runtime exceptions or missing audit property lookups.
