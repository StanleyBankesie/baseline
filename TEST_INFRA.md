# OmniSuite E2E Test Infrastructure Specification (`TEST_INFRA.md`)

## 1. Test Philosophy & Principles

OmniSuite UI & Layout Production Verification is governed by four core architectural principles:
1. **Opaque-Box Requirement-Driven Testing**: Tests interact exclusively through the user-visible surface: viewport dimensions, rendered DOM tree, computed CSS styles, layout bounding boxes, and end-user interactive workflows. Tests do not rely on private internal component state.
2. **Defensive Anti-Flakiness**: Zero reliance on arbitrary timeouts (`sleep`). All async steps utilize explicit predicate waiting (DOM existence, style computation match, network request completion).
3. **Deterministic & Self-Contained Execution**: The test suite requires zero external microservices, cloud mock servers, or live database instances. Test execution is fully self-contained using Node.js, static AST analyzers, and headless browser sessions with browser pooling.
4. **Strict Pass/Fail Semantics**: All test suites must exit with code 0 on complete pass, or code 1 on any failure, emitting structured JSON and console summaries for CI/CD gating.

---

## 2. Feature Inventory & Requirements Traceability

| Feature ID | Feature Name | Requirement | Milestone | Target Files | Verification Method |
|:---|:---|:---|:---|:---|:---|
| **F1** | Mobile Nav Banner Hiding | R1 | M1 | `client/src/components/ModuleLayout.jsx`, `ModuleDashboard.jsx` | Viewport rendering (<768px `display:none`, >=768px `display:block`) |
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
│   ├── browser.js                 # Puppeteer lifecycle, browser pool, viewports
│   ├── dom_inspector.js           # Computed styles, bounding box & alignment helpers
│   ├── ast_checker.js             # Static AST / JSX / CSS token validator
│   └── reporter.js                # ASCII console table & tier summary reporter
├── fixtures/
│   ├── nav_banner_fixture.html    # Standalone HTML fixture replicating ModuleLayout
│   ├── button_matrix_fixture.html # Standalone HTML fixture with all button variants
│   ├── table_density_fixture.html # High-density list table with audit and essential columns
│   ├── filter_toolbar_fixture.html# 3-tier layout fixture (Header -> KPIs -> Toolbar -> Table)
│   └── template_factory.js        # Generates DOM markup with compiled Tailwind CSS
├── tier1/                         # Tier 1: Feature Coverage (55 tests)
│   ├── r1_mobile_nav.spec.js      # 6 tests: mobile hidden, desktop visible, tablet, sticky wrapper, subpages
│   ├── r2_buttons.spec.js         # 16 tests: 42px base, Deep Teal #0E3646, hover, 36px compact, 42x42 icon, row actions
│   ├── r3_list_density.spec.js    # 19 tests: absence of Created By/Date across Sales, Invoices, POs, Bills, JV, HR, BOQ 10 cols
│   └── r4_filter_layout.spec.js   # 14 tests: Drawing Register filter separation, universal 3-tier structure, 42px alignment
├── tier2/                         # Tier 2: Boundary & Corner Cases (53 tests)
│   ├── r1_mobile_nav_boundaries.spec.js # 6 tests: 767px exact boundary, 768px exact boundary, orientation flip, touch clearance
│   ├── r2_buttons_boundaries.spec.js    # 16 tests: padding override, compact specificity, danger 40px correction, table radius
│   ├── r3_list_density_boundaries.spec.js# 17 tests: colspans on empty tables, null fields resilience, 2560px ultra-wide, 1366px
│   └── r4_filter_layout_boundaries.spec.js# 14 tests: mobile wrapping, search input flex-1, dropdown overflow, clear filters
├── tier3/                         # Tier 3: Cross-Feature Pairwise Tests (12 tests)
│   └── pairwise_combinations.spec.js   # 12 tests covering R1xR2, R1xR4, R2xR3, R2xR4, R3xR4, R1xR3
└── tier4/                         # Tier 4: Real-World Scenarios (6 workflows)
    └── real_world_scenarios.spec.js    # 6 realistic workflows: Construction, BOQ, Invoices, Equipment, HR, Journal Vouchers
```

---

## 4. Test Execution Architecture & Commands

### CLI Commands
- **Run All Test Tiers (126 tests)**:
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
- **Run Specific Requirement**:
  ```powershell
  node tests/e2e/runner.js --req=R1
  node tests/e2e/runner.js --req=R2
  node tests/e2e/runner.js --req=R3
  node tests/e2e/runner.js --req=R4
  ```
- **Filter by Pattern**:
  ```powershell
  node tests/e2e/runner.js --filter="mobile"
  node tests/e2e/runner.js --filter="scenario"
  ```
- **Fast AST-only Mode**:
  ```powershell
  node tests/e2e/runner.js --mode=fast
  ```

### CLI Exit Codes
- `0`: All executed test specifications passed successfully.
- `1`: One or more test specifications failed or encountered an unhandled exception.

---

## 5. 4-Tier Test Methodology Breakdown

### Tier 1: Feature Coverage (55 Tests)
- **R1 Mobile Nav (6 tests)**:
  - `E2E-R1-T1-01`: Standard Mobile Viewport Hiding (375x667).
  - `E2E-R1-T1-02`: Standard Desktop Viewport Visibility (1280x800).
  - `E2E-R1-T1-03`: Large Desktop / Full HD Layout (1920x1080).
  - `E2E-R1-T1-04`: Small Tablet Landscape Visibility (1024x768).
  - `E2E-R1-T1-05`: ModuleDashboard Sticky Wrapper Coordination.
  - `E2E-R1-T1-06`: Subpage Isolation Verification.
- **R2 Button Sizing & Alignment (16 tests)**:
  - `E2E-R2-T1-01`: Base Button Standard Height (42px).
  - `E2E-R2-T1-02`: Primary Button Deep Teal `#0E3646` & 12px radius.
  - `E2E-R2-T1-03`: Primary Button Hover Token (`#173d50`).
  - `E2E-R2-T1-04`: Secondary Button Styling & Slate Border.
  - `E2E-R2-T1-05`: Compact Button Height (36px) & Typography.
  - `E2E-R2-T1-06`: Standard Square Icon Button (42x42px).
  - `E2E-R2-T1-07`: Compact Square Icon Button (36x36px).
  - `E2E-R2-T1-08`: Table Document Action Button (36px, `rounded-lg`).
  - `E2E-R2-T1-09`: Table Workflow Approval Forward (`#0E3646`).
  - `E2E-R2-T1-10`: Table Workflow Approval Reverse (Red accent border).
  - `E2E-R2-T1-11`: Table Row View & Edit Buttons (`btn-table-action`).
  - `E2E-R2-T1-12`: Header "+ New [Entity]" Standardization (`.btn-primary`).
  - `E2E-R2-T1-13`: Header "Back" / "Return" Standardization (`.btn-secondary`).
  - `E2E-R2-T1-14`: Filter Bar Refresh Icon Standardization (`.btn-icon`).
  - `E2E-R2-T1-15`: Modal Dialog Footer Buttons (42px baseline).
  - `E2E-R2-T1-16`: Input & Button Height Parity (42px).
- **R3 List Page Information Reduction (19 tests)**:
  - `E2E-R3-T1-01`: Absence of "Created By" in Sales Order List.
  - `E2E-R3-T1-02`: Absence of "Created Date" in Sales Order List.
  - `E2E-R3-T1-03`: Absence of "Created By" in Sales Invoice List.
  - `E2E-R3-T1-04`: Absence of "Created Date" in Sales Invoice List.
  - `E2E-R3-T1-05`: Absence of "Created By" in Purchase Orders Local List.
  - `E2E-R3-T1-06`: Absence of "Created Date" in Purchase Orders Local List.
  - `E2E-R3-T1-07`: Absence of "Created By" & "Created Date" in Purchase Bills List.
  - `E2E-R3-T1-08`: Absence of "Created By" & "Created Date" in Journal Vouchers.
  - `E2E-R3-T1-09`: Absence of "Created By" in Employee Setup.
  - `E2E-R3-T1-10`: Absence of "Created Date" in Employee Setup.
  - `E2E-R3-T1-11`: Absence of "Created By" & "Created Date" in Asset Register.
  - `E2E-R3-T1-12`: Retention of Essential Transaction Date as Sole Date Column.
  - `E2E-R3-T1-13`: Duplicate KPI Card Removal in Equipment List.
  - `E2E-R3-T1-14`: Duplicate KPI Card Removal in Items Master List.
  - `E2E-R3-T1-15`: BOQ Line Items Essential Columns Retention (10 essential columns).
  - `E2E-R3-T1-16`: BOQ Rate Analysis Sub-Formulas Isolated in Modal.
  - `E2E-R3-T1-17`: Removal of Redundant "Category" Column in Drawing Register.
  - `E2E-R3-T1-18`: Removal of Redundant "Active" Column in Project Portfolio.
  - `E2E-R3-T1-19`: Removal of Separate "Attachments" Column in Employee Setup.
- **R4 Filter & Search Arrangement (14 tests)**:
  - `E2E-R4-T1-01`: Drawing Register Header Separation from Filter Controls.
  - `E2E-R4-T1-02`: Drawing Register Dedicated Filter Bar Card Presence.
  - `E2E-R4-T1-03`: Universal 3-Tier Layout: Tier 1 Header Structure.
  - `E2E-R4-T1-04`: Universal 3-Tier Layout: Tier 2 Summary KPI Metrics.
  - `E2E-R4-T1-05`: Universal 3-Tier Layout: Tier 3 Dedicated Filter Toolbar.
  - `E2E-R4-T1-06`: Tier 3 Search Box with Lucide Search Icon.
  - `E2E-R4-T1-07`: Tier 3 Dropdown Select Element Positioning.
  - `E2E-R4-T1-08`: Tier 3 Refresh Button with Spinner Animation.
  - `E2E-R4-T1-09`: Tier 3 ViewToggle Alignment on Toolbar Right.
  - `E2E-R4-T1-10`: Filter Toolbar Height Standard (42px).
  - `E2E-R4-T1-11`: Square Refresh Icon Button Dimensions (42x42px or 36x36px).
  - `E2E-R4-T1-12`: Vertical Baseline Alignment Across Filter Controls.
  - `E2E-R4-T1-13`: Construction Daily Site Diary (DSR) Filter Bar Separation.
  - `E2E-R4-T1-14`: Primary Action Button Deep Teal (`#0E3646`) Standardization.

### Tier 2: Boundary & Corner Cases (53 Tests)
- **R1 Boundaries (6 tests)**:
  - `E2E-R1-T2-01`: Exact Boundary: 767px Mobile Threshold hides banner.
  - `E2E-R1-T2-02`: Exact Boundary: 768px Desktop Threshold shows banner.
  - `E2E-R1-T2-03`: Dynamic Orientation Change (375x812 -> 812x375 -> 375x812).
  - `E2E-R1-T2-04`: Empty Sections & Actions Graceful Degradation (returns null).
  - `E2E-R1-T2-05`: Mobile Scroll Touch Clearance & Zero Collision.
  - `E2E-R1-T2-06`: Extreme Viewport Minimum (320px Stress Test).
- **R2 Boundaries (16 tests)**:
  - `E2E-R2-T2-01`: Conflicting Vertical Padding Override resolution (`min-height: 42px`).
  - `E2E-R2-T2-02`: Compact Override Specificity (`min-height: 36px !important`).
  - `E2E-R2-T2-03`: Danger Button Height Correction (42px standard).
  - `E2E-R2-T2-04`: Long Label Text Wrapping & Min-Height.
  - `E2E-R2-T2-05`: Disabled State Invariants (`opacity: 0.5`, `not-allowed`).
  - `E2E-R2-T2-06`: Table Row Radius Uniformity (all `8px`, zero `rounded-full`).
  - `E2E-R2-T2-07`: Filter Toolbar Horizontal Alignment (delta <= 1px).
  - `E2E-R2-T2-08`: Standalone Icon vs Icon+Text Centering.
  - `E2E-R2-T2-09`: Micro Button (`.btn-xs`) Boundary Check (28px - 30px).
  - `E2E-R2-T2-10`: Flex Shrink Resistance in Header (`flex-shrink: 0`).
  - `E2E-R2-T2-11`: Active Scale Animation Feedback (`scale(0.98)`).
  - `E2E-R2-T2-12`: Focus-Visible Accessibility Ring.
  - `E2E-R2-T2-13`: Dark Mode Secondary Button Token (`#1e293b`).
  - `E2E-R2-T2-14`: Modal Footer Responsiveness on Mobile (480px).
  - `E2E-R2-T2-15`: Legacy Bootstrap Grey Elimination (`#6c757d` -> `#0E3646`).
  - `E2E-R2-T2-16`: Compact Table Cell Overflow Prevention.
- **R3 Boundaries (17 tests)**:
  - `E2E-R3-T2-01`: Empty Table Colspan Integrity in Sales Order List.
  - `E2E-R3-T2-02`: Empty Table Colspan Integrity in Invoice List.
  - `E2E-R3-T2-03`: Empty Table Colspan Integrity in Purchase Orders Local.
  - `E2E-R3-T2-04`: Colspan Integrity in Drawing Register after "Category" Removal.
  - `E2E-R3-T2-05`: Colspan Integrity in Employee List after 3-Column Reduction.
  - `E2E-R3-T2-06`: Empty State Rendering in BOQ Line Items Table.
  - `E2E-R3-T2-07`: Null or Undefined `cost_category` in BOQ Line Items.
  - `E2E-R3-T2-08`: Null or Missing `current_revision` in Drawing Register.
  - `E2E-R3-T2-09`: Null / Missing `quantity` or `unit_rate` in BOQ Line Item.
  - `E2E-R3-T2-10`: Null / Missing `project_status` in Project List.
  - `E2E-R3-T2-11`: Ultra-Wide Viewport (2560x1440) Column Expansion Bounds.
  - `E2E-R3-T2-12`: Elimination of Horizontal Scrollbars at Standard 1366x768 Viewport.
  - `E2E-R3-T2-13`: Extreme String Length in Description Cell.
  - `E2E-R3-T2-14`: Extreme Project Name Length in Project Portfolio.
  - `E2E-R3-T2-15`: Long Employee Full Name & Email.
  - `E2E-R3-T2-16`: Sort Toggling on Retained Business Columns.
  - `E2E-R3-T2-17`: Elimination of Audit Column Sort Keys from Query Params.
- **R4 Boundaries (14 tests)**:
  - `E2E-R4-T2-01`: Tablet Viewport (768px) Filter Toolbar Wrapping.
  - `E2E-R4-T2-02`: Mobile Viewport (375px) Filter Toolbar Stacking (`flex-1`).
  - `E2E-R4-T2-03`: Viewport Resize Transition Dynamic Reflow (1280 -> 767 -> 375 -> 1280).
  - `E2E-R4-T2-04`: Empty Search Term Restoration.
  - `E2E-R4-T2-05`: Nonexistent Search Term Zero-State Handling.
  - `E2E-R4-T2-06`: Rapid Keystroke Debounce & Focus Retention.
  - `E2E-R4-T2-07`: Whitespace-Padded Search Strings.
  - `E2E-R4-T2-08`: Empty Projects List in Project Filter Dropdown.
  - `E2E-R4-T2-09`: Long Option String in Status / Project Dropdown.
  - `E2E-R4-T2-10`: Multi-Filter Reset Invariant.
  - `E2E-R4-T2-11`: Combined Search & Status Filtering.
  - `E2E-R4-T2-12`: Keyboard Tab Navigation Sequence.
  - `E2E-R4-T2-13`: Enter Key Submits Filter Without Page Reload.
  - `E2E-R4-T2-14`: Refresh Button Disabled / Spinner State.

### Tier 3: Pairwise Combinations (12 Tests)
- `TEST-T3-01`: Mobile Viewport (<768px) × Standard Button Touch Target Height (42px).
- `TEST-T3-02`: Mobile Viewport (<768px) × Dedicated Filter Toolbar Responsive Stacking.
- `TEST-T3-03`: Standard Button Sizing System × High-Density Table Row Actions (36px, `rounded-lg`).
- `TEST-T3-04`: Deep Teal Header Primary Button (`#0E3646`) × Clean Filter Bar Separation.
- `TEST-T3-05`: Filter Search Query × Essential Data Retention (No Missing Audit Keys).
- `TEST-T3-06`: Mobile Viewport (<768px) × Essential Data Retention (Zero Horizontal Overflow).
- `TEST-T3-07`: Filter Bar Height Uniformity & 0px Vertical Offset Jitter (42px baseline).
- `TEST-T3-08`: Standard 42px Modal Footers Triggered from Compact 36px Table Actions.
- `TEST-T3-09`: Single KPI Card Row × 3-Tier Layout Above-the-Fold Visibility (<410px table top).
- `TEST-T3-10`: Mobile Breakpoint Boundary (767px vs 768px) Navigation & Drawer Consistency.
- `TEST-T3-11`: Table Row Action Radius Uniformity (`rounded-lg`) × Consolidated Action Width.
- `TEST-T3-12`: Mobile Viewport (<768px) × Dedicated Filter Toolbar Project Switcher Interaction.

### Tier 4: Real-World Scenarios (6 Workflows)
- `SCENARIO-T4-01`: Construction Document Register & RFI Review Lifecycle (`DocumentRegisterPage.jsx`).
- `SCENARIO-T4-02`: BOQ Cost Management & Rate Analysis Inspection (`BOQManager.jsx`).
- `SCENARIO-T4-03`: Sales Invoice Management & Document Printing Workflow (`InvoiceList.jsx`).
- `SCENARIO-T4-04`: Maintenance Equipment Registry Inspection (`EquipmentList.jsx`).
- `SCENARIO-T4-05`: HR Employee Directory & Staff Roster Navigation (`EmployeeList.jsx`).
- `SCENARIO-T4-06`: Financial Journal Voucher Audit & Workflow Review (`JournalVoucherList.jsx`).

---

## 6. Coverage Thresholds & Quality Gates

1. **Pass Rate**: 100% required. Any test failure immediately halts pipeline with exit code `1`.
2. **Execution Speed Budget**: Full 126-test suite must execute in `< 10 seconds` using browser pooling and fast DOM evaluation.
3. **AST & Schema Coverage**: All list views verified for absence of `Created By` and `Created Date` audit columns.
4. **Console Hygiene**: 0 unhandled promise rejections, 0 syntax errors, 0 runtime exceptions.
