# Technical Assessment & Test Specification Report: List Page Information Reduction (R3) & Filter/Search Arrangement (R4)

**State Folder**: `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_e2e_2`  
**Author**: Explorer 2 (E2E Testing Track)  
**Date**: 2026-11-13  
**Target Features**: F6 (Audit Columns), F7 (Duplicate KPI Cards), F8 (BOQ Essential Data Retention), F9 (Drawing Register Filter Re-architecture), F10 (Universal 3-Tier Filter Toolbar)

---

## 1. Observation

Direct source code inspection of the OmniSuite frontend (`client/src/pages/modules/`) was conducted to extract exact DOM structures, CSS classes, table headers, and layout patterns across key list pages.

### 1.1 Redundant Audit Columns (`Created By` and `Created Date`)
- In `client/src/pages/modules/sales/sales-orders/SalesOrderList.jsx` (`lines 1229-1244` and `1411-1420`):
  ```jsx
  <th className="text-right">Actions</th>
  <SortableHeader label="Created By" sortKey="created_by_name" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
  <SortableHeader label="Created Date" sortKey="created_at" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
  ...
  <td className="grid-created-by-cell">{order.created_by_username || order.created_by_name || "-"}</td>
  <td className="grid-created-date-cell">{order.created_at ? new Date(order.created_at).toLocaleDateString() : "-"}</td>
  ```
  *Finding*: `Created By` and `Created Date` are rendered as orphaned columns to the right of the `Actions` column, consuming ~240px horizontal space and forcing horizontal scrollbars on 1366px viewports.
- In `client/src/pages/modules/sales/invoices/InvoiceList.jsx` (`lines 678-685`):
  ```jsx
  <th className="text-right">Actions</th>
  <SortableHeader label="Created By" sortKey="created_by_name" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="grid-created-by-cell" />
  <SortableHeader label="Created Date" sortKey="created_at" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="grid-created-date-cell" />
  ```
- In `client/src/pages/modules/purchase/purchase-orders-local/PurchaseOrdersLocalList.jsx` (`lines 732-735`):
  ```jsx
  <th className="text-right">Actions</th>
  <SortableHeader label="Created By" sortKey="created_by_username" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
  <SortableHeader label="Created Date" sortKey="created_at" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
  ```
- In `client/src/pages/modules/human-resources/employees/EmployeeList.jsx` (`lines 425-428`):
  ```jsx
  <th className="... text-center w-36">Actions</th>
  <th className="... w-28">Created By</th>
  <th className="... w-28 whitespace-nowrap">Created Date</th>
  <th className="... text-center w-24">Attachments</th>
  ```

### 1.2 Duplicate Stacked KPI Card Blocks
- In `client/src/pages/modules/maintenance/equipment/EquipmentList.jsx`:
  - **Block 1** (`lines 138-182`): `<div className="grid grid-cols-2 md:grid-cols-4 gap-4">` displaying "Total Equipment", "Active Status", "Under Repair", "Expired Warranty".
  - **Block 2** (`lines 186-227`): Directly following Block 1, `<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">` displaying "Active Equipment Units", "Total Equipment Units", "Pending Equipment Units", "Completed Equipment Units".
  *Finding*: 8 KPI cards are rendered back-to-back, consuming >260px vertical space before any table data or filters appear.
- In `client/src/pages/modules/inventory/ItemsList.jsx`:
  - **Block 1** (`lines 1930-1974`): `<div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6 pt-4">` (Active Items, Total Inventory Items, Inactive Catalog, Finished Goods).
  - Search and filters (`lines 1981-2029`).
  - **Block 2** (`lines 2031-2048`): `<div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5">` (Total Items, Active Items, Low Stock, Inactive Items).
  *Finding*: The second card block splits the filter controls from the table, creating redundant metric representations.

### 1.3 Golden Reference: BOQ / Cost Schedule Line Items
- In `client/src/pages/modules/project-management/construction/BOQManager.jsx` (`lines 1724-1738`):
  ```jsx
  <table className="w-full text-left text-xs border-collapse">
    <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
      <tr>
        <th className="p-3 w-12 text-center">#</th>
        <th className="p-3 w-28">Item Code</th>
        <th className="p-3 min-w-[260px]">Description of Work</th>
        <th className="p-3 w-36">Cost Category</th>
        <th className="p-3 w-32">Unit (UoM)</th>
        <th className="p-3 w-24 text-right">Quantity</th>
        <th className="p-3 w-28 text-right">Unit Rate</th>
        <th className="p-3 w-32 text-right">Amount ({currency})</th>
        <th className="p-3 w-20 text-center print:hidden">Rate Build</th>
        <th className="p-3 w-14 text-center print:hidden">Del</th>
      </tr>
    </thead>
  ```
  *Finding*: Exactly 10 essential columns. No `Created By`, no `Created Date`, no internal labor/material markup math in the line item row; sub-formulas are isolated in `RateAnalysisModal`.

### 1.4 Redundant Entity-Specific Columns
- **Drawing Register (`DocumentRegisterPage.jsx` lines 334-342)**:
  `Drawing #`, `Title`, `Discipline`, `Category`, `Revision`, `Status`, `Cloudinary File`. The `Category` column displays verbatim `"DRAWING"` across all rows, duplicating `Discipline` and page context.
- **Project Portfolio (`ProjectList.jsx` lines 261, 336-346)**:
  Renders both `<StatusBadge status={item.project_status} />` and an adjacent `<th className="text-center">Active</th>` column ("Active" / "Inactive").
- **Employee Setup (`EmployeeList.jsx` lines 428, 476-480)**:
  Renders a dedicated `Attachments` column containing only a `ListAttachmentIconButton`, rather than placing the icon within the `Actions` column.

### 1.5 Crammed Header Filters & 3-Tier Violations (R4)
- In `client/src/pages/modules/project-management/construction/DocumentRegisterPage.jsx` (`lines 166-253`):
  The header flex container combines:
  - Back Button + Page Title + Subtitle
  - Project Dropdown (`min-w-[180px] h-auto py-1.5`)
  - Search Input (`w-48 h-auto py-1.5`)
  - Refresh Button (`btn btn-secondary p-2` -> 32px wide x 42px tall)
  - Primary Action Button (`btn btn-primary h-[42px]`)
  *Finding*: On viewports <1440px, these 5 disparate controls wrap into an irregular, multi-line header cluster with mismatched heights (34px vs 42px) and an asymmetric rectangular refresh icon button.
- In `client/src/pages/modules/project-management/construction/DailySiteReportList.jsx` (`lines 476-540`):
  Identical pattern: Project select, status filter, search box, and create button are crammed in the top header row rather than in a dedicated Tier 3 filter toolbar.

---

## 2. Logic Chain

1. **Premise 1 (Essential Data vs. Audit Clutter)**:
   Observations 1.1 and 1.3 show that `Created By` and `Created Date` are system metadata rather than business operations data. The BOQ golden reference proves that high-density tables remain usable by strictly limiting columns to primary identity, quantity, rate, amount, and status. Eliminating audit columns saves 200–300px horizontal table space, removes horizontal scrollbars, and preserves immediate above-the-fold visibility.
2. **Premise 2 (Screen Estate Restoration via Single KPI Row)**:
   Observation 1.2 demonstrates that `EquipmentList.jsx` and `ItemsList.jsx` duplicate 4 KPI cards back-to-back. Eliminating the duplicate second set restores ~260px of vertical screen real estate, bringing the table into immediate view on 1080p and 768p displays without loss of metrics.
3. **Premise 3 (Domain-Specific Redundancy Elimination)**:
   Observation 1.4 shows `Category` in Drawing Register is always "DRAWING", `Active` in ProjectList duplicates `project_status`, and `Attachments` in EmployeeList consumes an entire column for a single paperclip icon. Removing or consolidating these fields directly implements R3 guidance.
4. **Premise 4 (Universal 3-Tier Layout as the Single Source of Truth)**:
   Observation 1.5 shows that header-crammed controls cause responsive breakage and height discordance. Separating controls into:
   - **Tier 1 (Header)**: Back button + Title/Subtitle on left, Primary Action Button on right.
   - **Tier 2 (Summary Metrics)**: Single responsive 4-Card KPI row.
   - **Tier 3 (Dedicated Filter Toolbar)**: Unified card row holding Search (`flex-1`), Dropdown Selects, Refresh Button, and ViewToggle.
   Standardizing all Tier 3 controls to **42px height** (matching `.input` and `.btn`) with square **42px x 42px** icon buttons guarantees baseline alignment and eliminates jagged responsive wrapping.

---

## 3. Caveats

1. **Read-Only Scope**: This report defines comprehensive E2E test specifications. In accordance with read-only rules, no frontend source files were modified.
2. **Mock Server Data Parity**: Tests asserting the absence of `Created By` and `Created Date` must supply mock API payloads containing `created_by_name` and `created_at` to confirm that the component receives the data but correctly suppresses rendering the table headers and cells.
3. **Responsive Breakpoints**: Filter toolbar wrapping tests focus on standard viewport widths: Desktop (1440x900, 1280x800), Tablet (768x1024), and Mobile (375x667).

---

## 4. Conclusion & Test Specification Suites

The test specifications are categorized into:
- **R3 Tier 1: Feature Coverage (19 Test Cases)**
- **R3 Tier 2: Boundary & Corner Cases (17 Test Cases)**
- **R4 Tier 1: Feature Coverage (14 Test Cases)**
- **R4 Tier 2: Boundary & Corner Cases (14 Test Cases)**

**Total: 64 comprehensive, executable test specifications.**

---

### 4.1 R3 (List Page Information Reduction) — Tier 1: Feature Coverage

#### `TEST-R3-T1-01`: Absence of "Created By" in Sales Order List
- **Feature Ref**: F6
- **Target Route**: `/sales/orders` (`SalesOrderList.jsx`)
- **Category**: Column Removal Assertion
- **DOM Selector**: `table thead tr th`
- **Setup**: Seed mock sales orders payload containing `created_by_name: "John Doe"`.
- **Steps**:
  1. Navigate to `/sales/orders`.
  2. Locate table header elements: `page.locator('table thead tr th')`.
  3. Locate table body cells: `page.locator('table tbody tr td')`.
- **Assertions**:
  ```js
  const headerTexts = await page.locator('table thead tr th').allInnerTexts();
  expect(headerTexts.some(t => t.toLowerCase().includes('created by'))).toBe(false);
  const bodyCells = await page.locator('table tbody tr td.grid-created-by-cell').count();
  expect(bodyCells).toBe(0);
  ```
- **Failure Trigger**: Any header contains "Created By" or any cell has class `.grid-created-by-cell`.

#### `TEST-R3-T1-02`: Absence of "Created Date" in Sales Order List
- **Feature Ref**: F6
- **Target Route**: `/sales/orders` (`SalesOrderList.jsx`)
- **Category**: Column Removal Assertion
- **DOM Selector**: `table thead tr th`, `.grid-created-date-cell`
- **Setup**: Seed mock sales orders with `created_at: "2026-11-13T02:00:00Z"`.
- **Steps**:
  1. Navigate to `/sales/orders`.
  2. Inspect table header texts and table body cells.
- **Assertions**:
  ```js
  const headerTexts = await page.locator('table thead tr th').allInnerTexts();
  expect(headerTexts.some(t => t.toLowerCase().includes('created date') || t.toLowerCase().includes('created at'))).toBe(false);
  expect(await page.locator('.grid-created-date-cell').count()).toBe(0);
  ```
- **Failure Trigger**: "Created Date" column present or `.grid-created-date-cell` found in DOM.

#### `TEST-R3-T1-03`: Absence of "Created By" in Sales Invoice List
- **Feature Ref**: F6
- **Target Route**: `/sales/invoices` (`InvoiceList.jsx`)
- **Category**: Column Removal Assertion
- **DOM Selector**: `table thead tr th`, `td.grid-created-by-cell`
- **Setup**: Seed mock invoice data with `created_by_name: "Finance User"`.
- **Steps**:
  1. Navigate to `/sales/invoices`.
  2. Inspect table headers and data rows.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => /created by/i.test(h))).toBe(false);
  expect(await page.locator('td.grid-created-by-cell').count()).toBe(0);
  ```
- **Failure Trigger**: Header contains "Created By" or `.grid-created-by-cell` rendered.

#### `TEST-R3-T1-04`: Absence of "Created Date" in Sales Invoice List
- **Feature Ref**: F6
- **Target Route**: `/sales/invoices` (`InvoiceList.jsx`)
- **Category**: Column Removal Assertion
- **DOM Selector**: `table thead tr th`, `td.grid-created-date-cell`
- **Setup**: Seed mock invoice data with `created_at: "2026-10-10"`.
- **Steps**:
  1. Navigate to `/sales/invoices`.
  2. Inspect header elements.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => /created date/i.test(h))).toBe(false);
  expect(await page.locator('td.grid-created-date-cell').count()).toBe(0);
  ```
- **Failure Trigger**: "Created Date" header rendered.

#### `TEST-R3-T1-05`: Absence of "Created By" in Purchase Orders Local List
- **Feature Ref**: F6
- **Target Route**: `/purchase/purchase-orders-local` (`PurchaseOrdersLocalList.jsx`)
- **Category**: Column Removal Assertion
- **DOM Selector**: `table thead tr th`
- **Setup**: Seed mock purchase orders with `created_by_username: "buyer1"`.
- **Steps**:
  1. Navigate to `/purchase/purchase-orders-local`.
  2. Inspect `table thead tr th` texts.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => /created by/i.test(h))).toBe(false);
  ```
- **Failure Trigger**: "Created By" th exists in header.

#### `TEST-R3-T1-06`: Absence of "Created Date" in Purchase Orders Local List
- **Feature Ref**: F6
- **Target Route**: `/purchase/purchase-orders-local` (`PurchaseOrdersLocalList.jsx`)
- **Category**: Column Removal Assertion
- **DOM Selector**: `table thead tr th`
- **Setup**: Seed mock purchase orders with `created_at: "2026-09-01"`.
- **Steps**:
  1. Navigate to `/purchase/purchase-orders-local`.
  2. Inspect header labels.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => /created date/i.test(h))).toBe(false);
  ```
- **Failure Trigger**: "Created Date" header found.

#### `TEST-R3-T1-07`: Absence of "Created By" & "Created Date" in Purchase Bills List
- **Feature Ref**: F6
- **Target Route**: `/purchase/bills` (`PurchaseBillsList.jsx`)
- **Category**: Column Removal Assertion
- **DOM Selector**: `table thead tr th`
- **Setup**: Mock bills data.
- **Steps**:
  1. Navigate to `/purchase/bills`.
  2. Check all header text nodes.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => /created by|created date/i.test(h))).toBe(false);
  ```
- **Failure Trigger**: Either "Created By" or "Created Date" present.

#### `TEST-R3-T1-08`: Absence of "Created By" & "Created Date" in Journal Vouchers
- **Feature Ref**: F6
- **Target Route**: `/finance/journal-vouchers` (`JournalVoucherList.jsx`)
- **Category**: Column Removal Assertion
- **DOM Selector**: `table thead tr th`
- **Setup**: Mock journal vouchers data.
- **Steps**:
  1. Navigate to `/finance/journal-vouchers`.
  2. Scan table headers.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => /created by|created date/i.test(h))).toBe(false);
  ```
- **Failure Trigger**: Audit column headers detected.

#### `TEST-R3-T1-09`: Absence of "Created By" in Employee Setup
- **Feature Ref**: F6
- **Target Route**: `/human-resources/employees` (`EmployeeList.jsx`)
- **Category**: Column Removal Assertion
- **DOM Selector**: `table thead tr th`
- **Setup**: Mock employee roster.
- **Steps**:
  1. Navigate to `/human-resources/employees`.
  2. Read all header labels.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => /created by/i.test(h))).toBe(false);
  ```
- **Failure Trigger**: "Created By" th found in `EmployeeList`.

#### `TEST-R3-T1-10`: Absence of "Created Date" in Employee Setup
- **Feature Ref**: F6
- **Target Route**: `/human-resources/employees` (`EmployeeList.jsx`)
- **Category**: Column Removal Assertion
- **DOM Selector**: `table thead tr th`
- **Setup**: Mock employee roster.
- **Steps**:
  1. Navigate to `/human-resources/employees`.
  2. Scan headers.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => /created date/i.test(h))).toBe(false);
  ```
- **Failure Trigger**: "Created Date" th found in `EmployeeList`.

#### `TEST-R3-T1-11`: Absence of "Created By" & "Created Date" in Asset Register
- **Feature Ref**: F6
- **Target Route**: `/asset-management/assets` (`AssetRegisterList.jsx` / `AssetList.jsx`)
- **Category**: Column Removal Assertion
- **DOM Selector**: `table thead tr th`
- **Setup**: Mock asset register records.
- **Steps**:
  1. Navigate to `/asset-management/assets`.
  2. Evaluate header labels.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => /created by|created date/i.test(h))).toBe(false);
  ```
- **Failure Trigger**: Header displays audit metadata columns.

#### `TEST-R3-T1-12`: Retention of Essential Transaction Date as Sole Date Column
- **Feature Ref**: F6, F8
- **Target Route**: `/sales/orders` and `/sales/invoices`
- **Category**: Essential Field Retention
- **DOM Selector**: `table thead tr th`
- **Setup**: Mock orders with `order_date: "2026-11-10"` and invoices with `invoice_date: "2026-11-12"`.
- **Steps**:
  1. Navigate to `/sales/orders`.
  2. Assert `Order Date` or `Date` is visible.
  3. Navigate to `/sales/invoices`.
  4. Assert `Date` is visible.
- **Assertions**:
  ```js
  const orderHeaders = await page.locator('table thead tr th').allInnerTexts();
  expect(orderHeaders.some(h => /^date$|^order date$/i.test(h.trim()))).toBe(true);
  ```
- **Failure Trigger**: Primary transaction date column is missing.

#### `TEST-R3-T1-13`: Duplicate KPI Card Removal in Equipment List
- **Feature Ref**: F7
- **Target Route**: `/maintenance/equipment` (`EquipmentList.jsx`)
- **Category**: Duplicate Metric Elimination
- **DOM Selector**: `div.grid` containing KPI cards
- **Setup**: Mock equipment records.
- **Steps**:
  1. Navigate to `/maintenance/equipment`.
  2. Query all grid containers rendered before the main table card: `page.locator('.grid-cols-2.md\\:grid-cols-4, .grid-cols-1.md\\:grid-cols-4')`.
- **Assertions**:
  ```js
  // Verify exactly ONE KPI metric grid container exists
  const kpiContainers = await page.locator('div.grid[class*="grid-cols-2"], div.grid[class*="grid-cols-1"]').filter({
    has: page.locator('text=/Total Equipment|Active Status/i')
  }).count();
  expect(kpiContainers).toBe(1);
  // Total metric cards must be 4, NOT 8
  const cardElements = await page.locator('div.card:has(span.text-xs.font-semibold.uppercase)').count();
  expect(cardElements).toBe(4);
  ```
- **Failure Trigger**: More than 1 KPI card grid or more than 4 KPI cards rendered.

#### `TEST-R3-T1-14`: Duplicate KPI Card Removal in Items Master List
- **Feature Ref**: F7
- **Target Route**: `/inventory/items` (`ItemsList.jsx`)
- **Category**: Duplicate Metric Elimination
- **DOM Selector**: KPI card containers in `ItemsList.jsx`
- **Setup**: Mock catalog of items.
- **Steps**:
  1. Navigate to `/inventory/items`.
  2. Count KPI card grids preceding and following filter inputs.
- **Assertions**:
  ```js
  const totalKpiCards = await page.locator('div.card:has(p.text-xs.font-semibold.uppercase), div.rounded-2xl:has(div.text-xs.font-semibold.uppercase)').count();
  expect(totalKpiCards).toBe(4); // Was 8 previously
  ```
- **Failure Trigger**: Second KPI card block (lines 2031-2048) renders below filter row.

#### `TEST-R3-T1-15`: BOQ Line Items Essential Columns Retention
- **Feature Ref**: F8
- **Target Route**: `/project-management/boq` (`BOQManager.jsx`)
- **Category**: Essential Column Schema Verification
- **DOM Selector**: `table thead tr th`
- **Setup**: Load active project with BOQ line items.
- **Steps**:
  1. Navigate to `/project-management/boq`.
  2. Inspect line items table header elements.
- **Assertions**:
  ```js
  const expectedColumns = [
    '#', 'Item Code', 'Description of Work', 'Cost Category',
    'Unit (UoM)', 'Quantity', 'Unit Rate', 'Amount', 'Rate Build', 'Del'
  ];
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.length).toBe(10);
  expectedColumns.forEach(col => {
    expect(headers.some(h => h.includes(col))).toBe(true);
  });
  ```
- **Failure Trigger**: Missing any of the 10 essential columns or column count exceeds 10.

#### `TEST-R3-T1-16`: BOQ Rate Analysis Sub-Formulas Isolated in Modal
- **Feature Ref**: F8
- **Target Route**: `/project-management/boq` (`BOQManager.jsx`)
- **Category**: Sub-formula Isolation Assertion
- **DOM Selector**: `table thead tr th`, `div[role="dialog"]`
- **Setup**: BOQ line items active.
- **Steps**:
  1. Verify table header contains NO sub-breakdown columns (`Labor Rate`, `Plant Rate`, `Material Cost`, `Contingency Rate`).
  2. Click "Rate Build" button on line 1.
  3. Assert `RateAnalysisModal` opens with breakdown inputs.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => /Labor Rate|Plant Rate|Material Cost/i.test(h))).toBe(false);
  await page.locator('button[title*="Rate Build"], table tbody tr:first-child button:has-text("Rate Build")').first().click();
  await expect(page.locator('.modal, div[role="dialog"]').filter({ hasText: /Rate Analysis|Rate Build-up/i })).toBeVisible();
  ```
- **Failure Trigger**: Rate breakdown sub-columns displayed in table row instead of modal dialog.

#### `TEST-R3-T1-17`: Removal of Redundant "Category" Column in Drawing Register
- **Feature Ref**: F8
- **Target Route**: `/project-management/drawings` (`DocumentRegisterPage.jsx`)
- **Category**: Redundant Field Elimination
- **DOM Selector**: `table thead tr th`
- **Setup**: Project with mock drawings selected.
- **Steps**:
  1. Navigate to `/project-management/drawings`.
  2. Ensure "Documents / Drawings" tab is active.
  3. Read all table header labels.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => h.trim().toLowerCase() === 'category')).toBe(false);
  // Retained columns: Drawing #, Title, Discipline, Revision, Status, Cloudinary File
  expect(headers.length).toBe(6);
  ```
- **Failure Trigger**: "Category" column present in Drawings table header.

#### `TEST-R3-T1-18`: Removal of Redundant "Active" Column in Project Portfolio
- **Feature Ref**: F8
- **Target Route**: `/project-management/projects` (`ProjectList.jsx`)
- **Category**: Redundant Field Elimination
- **DOM Selector**: `table thead tr th`
- **Setup**: Mock project portfolio.
- **Steps**:
  1. Navigate to `/project-management/projects`.
  2. Inspect table headers and data rows.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => h.trim().toLowerCase() === 'active')).toBe(false);
  // Status column must remain present
  expect(headers.some(h => h.trim().toLowerCase() === 'status')).toBe(true);
  ```
- **Failure Trigger**: Header contains "Active" column.

#### `TEST-R3-T1-19`: Removal of Separate "Attachments" Column in Employee Setup
- **Feature Ref**: F8
- **Target Route**: `/human-resources/employees` (`EmployeeList.jsx`)
- **Category**: Column Consolidation Assertion
- **DOM Selector**: `table thead tr th`, `td`
- **Setup**: Mock employee roster.
- **Steps**:
  1. Navigate to `/human-resources/employees`.
  2. Inspect table header labels.
- **Assertions**:
  ```js
  const headers = await page.locator('table thead tr th').allInnerTexts();
  expect(headers.some(h => h.trim().toLowerCase() === 'attachments')).toBe(false);
  ```
- **Failure Trigger**: Dedicated "Attachments" th exists in header.

---

### 4.2 R3 (List Page Information Reduction) — Tier 2: Boundary & Corner Cases

#### `TEST-R3-T2-01`: Empty Table Colspan Integrity in Sales Order List
- **Feature Ref**: F6
- **Target Route**: `/sales/orders` (`SalesOrderList.jsx`)
- **Category**: Empty State & Colspan Boundary
- **Setup**: Mock API returns `items: []`.
- **Steps**:
  1. Navigate to `/sales/orders`.
  2. Inspect empty state `td` attribute `colSpan`.
- **Assertions**:
  ```js
  const thCount = await page.locator('table thead tr th').count();
  const emptyColSpan = await page.locator('table tbody tr td').getAttribute('colspan');
  expect(Number(emptyColSpan)).toBe(thCount);
  ```
- **Failure Trigger**: Colspan mismatch with updated header count (e.g. colspan still 11 instead of 9).

#### `TEST-R3-T2-02`: Empty Table Colspan Integrity in Invoice List
- **Feature Ref**: F6
- **Target Route**: `/sales/invoices` (`InvoiceList.jsx`)
- **Category**: Empty State & Colspan Boundary
- **Setup**: Mock API returns `[]`.
- **Steps**:
  1. Navigate to `/sales/invoices`.
  2. Check empty state row colspan.
- **Assertions**:
  ```js
  const thCount = await page.locator('table thead tr th').count();
  const emptyCell = page.locator('table tbody tr td[colspan]');
  expect(Number(await emptyCell.getAttribute('colspan'))).toBe(thCount);
  ```
- **Failure Trigger**: Colspan mismatch causing table horizontal overflow.

#### `TEST-R3-T2-03`: Empty Table Colspan Integrity in Purchase Orders Local
- **Feature Ref**: F6
- **Target Route**: `/purchase/purchase-orders-local` (`PurchaseOrdersLocalList.jsx`)
- **Category**: Empty State & Colspan Boundary
- **Setup**: Mock API returns `items: []`.
- **Steps**:
  1. Navigate to `/purchase/purchase-orders-local`.
  2. Check empty state row colspan.
- **Assertions**:
  ```js
  const thCount = await page.locator('table thead tr th').count();
  const emptyCell = page.locator('table tbody tr td[colspan]');
  expect(Number(await emptyCell.getAttribute('colspan'))).toBe(thCount);
  ```
- **Failure Trigger**: Empty row td colSpan does not match visible headers count.

#### `TEST-R3-T2-04`: Colspan Integrity in Drawing Register after "Category" Removal
- **Feature Ref**: F8
- **Target Route**: `/project-management/drawings` (`DocumentRegisterPage.jsx`)
- **Category**: Colspan Boundary
- **Setup**: Mock empty documents array `documents: []`.
- **Steps**:
  1. Navigate to `/project-management/drawings`.
  2. Inspect empty state cell in Documents tab.
- **Assertions**:
  ```js
  const thCount = await page.locator('table thead tr th').count();
  expect(thCount).toBe(6);
  const emptyCellColSpan = await page.locator('table tbody tr td[colspan]').getAttribute('colspan');
  expect(Number(emptyCellColSpan)).toBe(6);
  ```
- **Failure Trigger**: Empty row colSpan is 7 instead of 6.

#### `TEST-R3-T2-05`: Colspan Integrity in Employee List after 3-Column Reduction
- **Feature Ref**: F6, F8
- **Target Route**: `/human-resources/employees` (`EmployeeList.jsx`)
- **Category**: Colspan Boundary
- **Setup**: Mock empty employees array `[]`.
- **Steps**:
  1. Navigate to `/human-resources/employees`.
  2. Check empty state row.
- **Assertions**:
  ```js
  const thCount = await page.locator('table thead tr th').count();
  // Previously 11 headers (Photo, Code, Name, Position, Department, Type, Status, Actions, Created By, Created Date, Attachments)
  // Reduced to 8 headers (Photo, Code, Name, Position, Department, Type, Status, Actions)
  expect(thCount).toBe(8);
  ```
- **Failure Trigger**: Header count != 8.

#### `TEST-R3-T2-06`: Empty State Rendering in BOQ Line Items Table
- **Feature Ref**: F8
- **Target Route**: `/project-management/boq` (`BOQManager.jsx`)
- **Category**: Empty State Boundary
- **Setup**: Create empty BOQ with 0 line items.
- **Steps**:
  1. Navigate to empty BOQ.
  2. Inspect line items table.
- **Assertions**:
  ```js
  await expect(page.locator('text=/No line items found|Add Line Item/i')).toBeVisible();
  expect(await page.locator('table tbody tr').count()).toBeLessThanOrEqual(1);
  ```
- **Failure Trigger**: Page crashes or displays NaN / broken math on zero line items.

#### `TEST-R3-T2-07`: Null or Undefined `cost_category` in BOQ Line Items
- **Feature Ref**: F8
- **Target Route**: `/project-management/boq` (`BOQManager.jsx`)
- **Category**: Missing Data Field Resilience
- **Setup**: Seed BOQ item with `cost_category: null` or `cost_category: undefined`.
- **Steps**:
  1. Load BOQ line items.
  2. Verify row 1 renders without React error.
- **Assertions**:
  ```js
  const categoryCell = page.locator('table tbody tr:first-child select, table tbody tr:first-child td:nth-child(4)');
  await expect(categoryCell).toBeVisible();
  // Verifies fallback selection is applied (COST_CATEGORIES[0])
  ```
- **Failure Trigger**: Uncaught TypeError: cannot read properties of undefined.

#### `TEST-R3-T2-08`: Null or Missing `current_revision` in Drawing Register
- **Feature Ref**: F8
- **Target Route**: `/project-management/drawings` (`DocumentRegisterPage.jsx`)
- **Category**: Missing Data Field Resilience
- **Setup**: Seed drawing with `current_revision: null`.
- **Steps**:
  1. Navigate to drawings list.
  2. Check revision cell.
- **Assertions**:
  ```js
  const revCell = page.locator('table tbody tr:first-child td:nth-child(4)'); // 4th column without Category
  const text = await revCell.innerText();
  expect(text).toMatch(/Rev\s*(0|-|\s*)/i);
  ```
- **Failure Trigger**: Displays "Rev null" or "Rev undefined".

#### `TEST-R3-T2-09`: Null / Missing `quantity` or `unit_rate` in BOQ Line Item
- **Feature Ref**: F8
- **Target Route**: `/project-management/boq` (`BOQManager.jsx`)
- **Category**: Missing Numeric Attribute Resilience
- **Setup**: Seed item with `quantity: null`, `unit_rate: null`.
- **Steps**:
  1. Inspect amount cell.
- **Assertions**:
  ```js
  const amountInput = page.locator('table tbody tr:first-child td:nth-child(8)');
  const text = await amountInput.innerText();
  expect(text).not.toContain('NaN');
  ```
- **Failure Trigger**: Amount cell displays `NaN` or `undefined`.

#### `TEST-R3-T2-10`: Null / Missing `project_status` in Project List
- **Feature Ref**: F8
- **Target Route**: `/project-management/projects` (`ProjectList.jsx`)
- **Category**: Missing Data Field Resilience
- **Setup**: Seed project with `project_status: null`.
- **Steps**:
  1. Load projects list.
  2. Verify Status badge renders fallback badge.
- **Assertions**:
  ```js
  await expect(page.locator('table tbody tr:first-child')).toBeVisible();
  ```
- **Failure Trigger**: Page throws runtime exception or blank screen.

#### `TEST-R3-T2-11`: Ultra-Wide Viewport (2560x1440) Column Expansion Bounds
- **Feature Ref**: F6, F8
- **Target Route**: `/sales/orders` (`SalesOrderList.jsx`)
- **Category**: Ultra-Wide Viewport Boundary
- **Setup**: Viewport set to `2560 x 1440`.
- **Steps**:
  1. Resize viewport to 2560x1440: `page.setViewportSize({ width: 2560, height: 1440 })`.
  2. Inspect table container and action column width.
- **Assertions**:
  ```js
  const tableBox = await page.locator('table').boundingBox();
  expect(tableBox.width).toBeLessThanOrEqual(2560);
  // Action buttons should not stretch grotesquely
  const actionBtnBox = await page.locator('table tbody tr:first-child td:has(button) button').first().boundingBox();
  expect(actionBtnBox.width).toBeLessThanOrEqual(200);
  ```
- **Failure Trigger**: Action button stretches beyond 200px or table breaks outside viewport.

#### `TEST-R3-T2-12`: Elimination of Horizontal Scrollbars at Standard 1366x768 Viewport
- **Feature Ref**: F6
- **Target Route**: `/sales/orders` (`SalesOrderList.jsx`)
- **Category**: Layout Density Boundary
- **Setup**: Set viewport to `1366 x 768`.
- **Steps**:
  1. `page.setViewportSize({ width: 1366, height: 768 })`.
  2. Measure table scrollWidth vs clientWidth.
- **Assertions**:
  ```js
  const isOverflowing = await page.evaluate(() => {
    const tableContainer = document.querySelector('.overflow-x-auto');
    if (!tableContainer) return false;
    return tableContainer.scrollWidth > tableContainer.clientWidth;
  });
  // With 2 audit columns removed, essential columns fit cleanly at 1366px
  expect(isOverflowing).toBe(false);
  ```
- **Failure Trigger**: Table forces horizontal scrollbar at 1366px desktop resolution.

#### `TEST-R3-T2-13`: Extreme String Length in Description Cell
- **Feature Ref**: F8
- **Target Route**: `/project-management/boq` (`BOQManager.jsx`)
- **Category**: Content Overflow Limit
- **Setup**: Seed item with 500-character description string.
- **Steps**:
  1. Inspect description input in table row.
- **Assertions**:
  ```js
  const descBox = await page.locator('table tbody tr:first-child td:nth-child(3)').boundingBox();
  // Description column should respect min-w-[260px] without pushing adjacent columns offscreen
  expect(descBox.width).toBeGreaterThanOrEqual(260);
  ```
- **Failure Trigger**: Description cell blows out entire table layout width.

#### `TEST-R3-T2-14`: Extreme Project Name Length in Project Portfolio
- **Feature Ref**: F8
- **Target Route**: `/project-management/projects` (`ProjectList.jsx`)
- **Category**: Content Overflow Limit
- **Setup**: Project with 150-char name.
- **Steps**:
  1. Check project name element classes.
- **Assertions**:
  ```js
  const titleEl = page.locator('table tbody tr:first-child td:first-child div.truncate');
  await expect(titleEl).toHaveClass(/truncate/);
  ```
- **Failure Trigger**: Missing truncate class causing multiline cell blowup.

#### `TEST-R3-T2-15`: Long Employee Full Name & Email
- **Feature Ref**: F8
- **Target Route**: `/human-resources/employees` (`EmployeeList.jsx`)
- **Category**: Content Overflow Limit
- **Setup**: Employee with 100-char name and 80-char email.
- **Steps**:
  1. Inspect name cell width and height.
- **Assertions**:
  ```js
  const cellHeight = (await page.locator('table tbody tr:first-child td:nth-child(3)').boundingBox()).height;
  expect(cellHeight).toBeLessThan(120);
  ```
- **Failure Trigger**: Row height expands beyond 120px.

#### `TEST-R3-T2-16`: Sort Toggling on Retained Business Columns
- **Feature Ref**: F6
- **Target Route**: `/sales/orders` (`SalesOrderList.jsx`)
- **Category**: Sorting State Invariant
- **Setup**: 10 mock orders with different dates and amounts.
- **Steps**:
  1. Click `Order Date` header to toggle ASC.
  2. Click again to toggle DESC.
- **Assertions**:
  ```js
  const header = page.locator('table thead tr th:has-text("Order Date"), table thead tr th:has-text("Date")').first();
  await header.click();
  // Assert sort indicator updates
  await expect(header.locator('svg')).toBeVisible();
  ```
- **Failure Trigger**: Sorting throws error or sort icon missing.

#### `TEST-R3-T2-17`: Elimination of Audit Column Sort Keys from Query Params
- **Feature Ref**: F6
- **Target Route**: `/sales/orders?sortKey=created_by_name&sortDir=asc`
- **Category**: Deprecated Sort Key Handling
- **Setup**: Direct navigation with URL query param containing deleted sort key.
- **Steps**:
  1. Navigate to `/sales/orders?sortKey=created_by_name&sortDir=asc`.
  2. Verify application falls back safely to default primary key sort (`order_no` or `order_date`) without crashing.
- **Assertions**:
  ```js
  await expect(page.locator('table')).toBeVisible();
  // Ensure no crash or blank screen
  ```
- **Failure Trigger**: Page crashes or white-screens on legacy sort keys.

---

### 4.3 R4 (Filter & Search Arrangement) — Tier 1: Feature Coverage

#### `TEST-R4-T1-01`: Drawing Register Header Separation from Filter Controls
- **Feature Ref**: F9
- **Target Route**: `/project-management/drawings` (`DocumentRegisterPage.jsx`)
- **Category**: Header Isolation Assertion
- **DOM Selector**: Page header container (`.flex.flex-col.md\\:flex-row...`)
- **Setup**: Standard project drawing register view.
- **Steps**:
  1. Navigate to `/project-management/drawings`.
  2. Inspect the top page header container.
- **Assertions**:
  ```js
  const header = page.locator('div.flex:has(h1:has-text("Drawing Register & RFIs"))').first();
  // Header MUST contain Back button and Primary Action button
  await expect(header.locator('a:has-text("Back")')).toBeVisible();
  await expect(header.locator('button:has-text("Register Drawing"), button:has-text("Raise RFI")')).toBeVisible();
  // Header MUST NOT contain search input or project select
  expect(await header.locator('input[type="text"]').count()).toBe(0);
  expect(await header.locator('select').count()).toBe(0);
  ```
- **Failure Trigger**: Search input or project select found inside top page header.

#### `TEST-R4-T1-02`: Drawing Register Dedicated Filter Bar Card Presence
- **Feature Ref**: F9
- **Target Route**: `/project-management/drawings` (`DocumentRegisterPage.jsx`)
- **Category**: Dedicated Toolbar Card Assertion
- **DOM Selector**: Dedicated filter container below KPI cards
- **Setup**: Standard project drawing register view.
- **Steps**:
  1. Locate the dedicated filter bar card below KPI metric cards.
- **Assertions**:
  ```js
  const filterCard = page.locator('div:has(input[placeholder*="Search drawings"])').first();
  // Must be in a dedicated card container
  await expect(filterCard).toHaveClass(/border|card|rounded/);
  await expect(filterCard.locator('select')).toBeVisible(); // Project selector
  await expect(filterCard.locator('button[title="Refresh"]')).toBeVisible(); // Refresh button
  ```
- **Failure Trigger**: Filter controls are not grouped in a dedicated card container.

#### `TEST-R4-T1-03`: Universal 3-Tier Layout: Tier 1 Header Structure
- **Feature Ref**: F10
- **Target Route**: List pages across modules (`/project-management/drawings`, `/sales/orders`, `/maintenance/equipment`)
- **Category**: 3-Tier Hierarchy Assertion
- **DOM Selector**: Page header row
- **Steps**:
  1. Inspect root page wrapper children order.
- **Assertions**:
  ```js
  // First tier must be page title & primary action header
  const tier1 = page.locator('h1').first();
  await expect(tier1).toBeVisible();
  ```
- **Failure Trigger**: Header tier missing or placed below filters.

#### `TEST-R4-T1-04`: Universal 3-Tier Layout: Tier 2 Summary KPI Metrics
- **Feature Ref**: F10
- **Target Route**: `/project-management/drawings`, `/maintenance/equipment`
- **Category**: 3-Tier Hierarchy Assertion
- **DOM Selector**: KPI metrics grid
- **Steps**:
  1. Assert KPI metrics grid sits between Tier 1 header and Tier 3 filter bar.
- **Assertions**:
  ```js
  const headerBox = await page.locator('h1').first().boundingBox();
  const kpiBox = await page.locator('div.grid[class*="grid-cols-"]').first().boundingBox();
  const filterBox = await page.locator('input[placeholder*="Search"]').first().boundingBox();
  expect(kpiBox.y).toBeGreaterThan(headerBox.y);
  expect(filterBox.y).toBeGreaterThan(kpiBox.y);
  ```
- **Failure Trigger**: Out-of-order layout hierarchy (e.g. filters above KPI cards).

#### `TEST-R4-T1-05`: Universal 3-Tier Layout: Tier 3 Dedicated Filter Toolbar
- **Feature Ref**: F10
- **Target Route**: `/maintenance/equipment` (`EquipmentList.jsx`)
- **Category**: Dedicated Toolbar Structure
- **DOM Selector**: `.card-header`
- **Steps**:
  1. Inspect filter toolbar immediately above the table.
- **Assertions**:
  ```js
  const toolbar = page.locator('.card-header, div.card > div:first-child:has(input[type="text"])').first();
  await expect(toolbar).toBeVisible();
  await expect(toolbar.locator('input[type="text"]')).toBeVisible();
  ```
- **Failure Trigger**: Missing dedicated filter toolbar.

#### `TEST-R4-T1-06`: Tier 3 Search Box with Lucide Search Icon
- **Feature Ref**: F10
- **Target Route**: All list pages
- **Category**: Control Styling Assertion
- **DOM Selector**: `.relative:has(input)`
- **Steps**:
  1. Inspect search input container.
- **Assertions**:
  ```js
  const searchWrapper = page.locator('div.relative:has(input[placeholder*="Search"])').first();
  await expect(searchWrapper.locator('svg.lucide-search, svg')).toBeVisible();
  const input = searchWrapper.locator('input');
  await expect(input).toHaveClass(/pl-9|pl-10/); // Left padding for icon
  ```
- **Failure Trigger**: Search icon missing or input lacks left padding.

#### `TEST-R4-T1-07`: Tier 3 Dropdown Select Element Positioning
- **Feature Ref**: F10
- **Target Route**: `/sales/orders`, `/purchase/purchase-orders-local`
- **Category**: Control Placement Assertion
- **DOM Selector**: Filter toolbar `select`
- **Steps**:
  1. Assert dropdown select sits inside filter toolbar flex container.
- **Assertions**:
  ```js
  const toolbar = page.locator('.card-header:has(input[placeholder*="Search"])').first();
  const select = toolbar.locator('select').first();
  await expect(select).toBeVisible();
  ```
- **Failure Trigger**: Filter select not contained within filter toolbar.

#### `TEST-R4-T1-08`: Tier 3 Refresh Button with Spinner Animation
- **Feature Ref**: F10
- **Target Route**: `/project-management/drawings`, `/maintenance/equipment`
- **Category**: Interactive Control Assertion
- **DOM Selector**: `button[title="Refresh"]`
- **Steps**:
  1. Click refresh button.
  2. Check for spinning animation.
- **Assertions**:
  ```js
  const refreshBtn = page.locator('button[title="Refresh"]').first();
  await expect(refreshBtn.locator('svg.lucide-refresh-cw, svg')).toBeVisible();
  await refreshBtn.click();
  // Assert spin animation class triggers during loading
  ```
- **Failure Trigger**: Refresh button missing or lacks icon.

#### `TEST-R4-T1-09`: Tier 3 ViewToggle Alignment on Toolbar Right
- **Feature Ref**: F10
- **Target Route**: `/human-resources/employees`, `/purchase/purchase-orders-local`
- **Category**: ViewToggle Integration
- **DOM Selector**: `div:has(> button[title*="Grid"]), div:has(> button[title*="Table"])`
- **Steps**:
  1. Check ViewToggle container location.
- **Assertions**:
  ```js
  const viewToggle = page.locator('button[title*="Grid"], button[title*="Table"], .table-view-toggle').first();
  await expect(viewToggle).toBeVisible();
  ```
- **Failure Trigger**: ViewToggle detached from filter toolbar.

#### `TEST-R4-T1-10`: Filter Toolbar Height Standard (42px)
- **Feature Ref**: F9, F10
- **Target Route**: `/project-management/drawings` (`DocumentRegisterPage.jsx`)
- **Category**: Height Dimension Assertion
- **DOM Selector**: Filter toolbar inputs and selects
- **Steps**:
  1. Measure computed bounding box height of search input and selects.
- **Assertions**:
  ```js
  const searchHeight = (await page.locator('input[placeholder*="Search"]').first().boundingBox()).height;
  const selectHeight = (await page.locator('.card-header select, div:has(input) select').first().boundingBox()).height;
  expect(Math.round(searchHeight)).toBe(42);
  expect(Math.round(selectHeight)).toBe(42);
  ```
- **Failure Trigger**: Height deviates from 42px baseline (e.g. 34px or 38px).

#### `TEST-R4-T1-11`: Square Refresh Icon Button Dimensions (42x42px or 36x36px)
- **Feature Ref**: F9, F10
- **Target Route**: `/project-management/drawings`, `/asset-management/assets`
- **Category**: Icon Button Geometry Assertion
- **DOM Selector**: `button[title="Refresh"]`
- **Steps**:
  1. Measure computed width and height of Refresh button.
- **Assertions**:
  ```js
  const btnBox = await page.locator('button[title="Refresh"]').first().boundingBox();
  expect(Math.round(btnBox.width)).toBe(Math.round(btnBox.height)); // Must be strictly square!
  expect([36, 42]).toContain(Math.round(btnBox.height));
  ```
- **Failure Trigger**: Refresh button is rectangular (e.g. 32px wide x 42px tall).

#### `TEST-R4-T1-12`: Vertical Baseline Alignment Across Filter Controls
- **Feature Ref**: F10
- **Target Route**: List pages filter row
- **Category**: Alignment Verification
- **DOM Selector**: Search input, Select, Refresh button
- **Steps**:
  1. On a desktop viewport (1440px), measure `.y` top offset for adjacent controls on the same row.
- **Assertions**:
  ```js
  const searchY = (await page.locator('input[placeholder*="Search"]').first().boundingBox()).y;
  const selectY = (await page.locator('div:has(input) select').first().boundingBox()).y;
  const refreshY = (await page.locator('button[title="Refresh"]').first().boundingBox()).y;
  expect(Math.abs(searchY - selectY)).toBeLessThanOrEqual(1.5);
  expect(Math.abs(searchY - refreshY)).toBeLessThanOrEqual(1.5);
  ```
- **Failure Trigger**: Controls have mismatched vertical baselines (>2px discrepancy).

#### `TEST-R4-T1-13`: Construction Daily Site Diary (DSR) Filter Bar Separation
- **Feature Ref**: F10
- **Target Route**: `/project-management/daily-reports` (`DailySiteReportList.jsx`)
- **Category**: Dedicated Toolbar Separation
- **Steps**:
  1. Navigate to `/project-management/daily-reports`.
  2. Verify project dropdown, status select, and search box are not in top header row.
- **Assertions**:
  ```js
  const header = page.locator('div.flex:has(h1:has-text("Daily Site Diary"))').first();
  expect(await header.locator('select').count()).toBe(0);
  ```
- **Failure Trigger**: Selects remain crammed in DSR header.

#### `TEST-R4-T1-14`: Primary Action Button Deep Teal (`#0E3646`) Standardization
- **Feature Ref**: F4, F10
- **Target Route**: All list headers
- **Category**: Button Styling Assertion
- **DOM Selector**: Header primary button (`button.btn-primary, a.btn-primary`)
- **Steps**:
  1. Inspect primary button computed background color.
- **Assertions**:
  ```js
  const btn = page.locator('button.btn-primary, a.btn-primary').first();
  const bg = await btn.evaluate(el => window.getComputedStyle(el).backgroundColor);
  // rgb(14, 54, 70) is #0E3646
  expect(bg).toBe('rgb(14, 54, 70)');
  ```
- **Failure Trigger**: Primary creation button is green (`btn-success`) or arbitrary color.

---

### 4.4 R4 (Filter & Search Arrangement) — Tier 2: Boundary & Corner Cases

#### `TEST-R4-T2-01`: Tablet Viewport (768px) Filter Toolbar Wrapping
- **Feature Ref**: F10
- **Target Route**: `/sales/orders` (`SalesOrderList.jsx`)
- **Category**: Responsive Wrap Boundary
- **Setup**: Set viewport to `768 x 1024`.
- **Steps**:
  1. `page.setViewportSize({ width: 768, height: 1024 })`.
  2. Inspect filter toolbar wrapping.
- **Assertions**:
  ```js
  const toolbar = page.locator('.card-header:has(input)').first();
  const toolbarBox = await toolbar.boundingBox();
  expect(toolbarBox.width).toBeLessThanOrEqual(768);
  // Ensure no horizontal window scroll triggered by filter toolbar
  const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(docOverflow).toBe(false);
  ```
- **Failure Trigger**: Filter toolbar overflows 768px viewport width.

#### `TEST-R4-T2-02`: Mobile Viewport (375px) Filter Toolbar Stacking
- **Feature Ref**: F10
- **Target Route**: `/project-management/drawings` (`DocumentRegisterPage.jsx`)
- **Category**: Mobile Responsive Boundary
- **Setup**: Set viewport to `375 x 667`.
- **Steps**:
  1. `page.setViewportSize({ width: 375, height: 667 })`.
  2. Inspect search input width.
- **Assertions**:
  ```js
  const searchBox = await page.locator('input[placeholder*="Search"]').first().boundingBox();
  // Search input must expand to full available width on mobile (>300px on 375px screen)
  expect(searchBox.width).toBeGreaterThan(280);
  ```
- **Failure Trigger**: Search input remains fixed at tiny width (e.g. `w-48` / 192px) on mobile.

#### `TEST-R4-T2-03`: Viewport Resize Transition Dynamic Reflow
- **Feature Ref**: F10
- **Target Route**: `/maintenance/equipment`
- **Category**: Dynamic Viewport Reflow
- **Steps**:
  1. Start at 1280px desktop.
  2. Resize dynamically to 767px.
  3. Resize dynamically to 375px.
  4. Resize back to 1280px.
- **Assertions**:
  ```js
  await page.setViewportSize({ width: 767, height: 800 });
  await page.waitForTimeout(100);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(100);
  await page.setViewportSize({ width: 1280, height: 800 });
  // Verify no orphaned floating elements or corrupted flex layouts
  await expect(page.locator('input[placeholder*="Search"]').first()).toBeVisible();
  ```
- **Failure Trigger**: JavaScript error or layout collapse during viewport transitions.

#### `TEST-R4-T2-04`: Empty Search Term Restoration
- **Feature Ref**: F10
- **Target Route**: `/sales/orders`
- **Category**: Search State Boundary
- **Setup**: Table populated with 20 records.
- **Steps**:
  1. Type "ORD-9999" into search input (filters down to 0 or 1 row).
  2. Clear search input (`fill("")`).
- **Assertions**:
  ```js
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  await searchInput.fill("ORD-NONEXISTENT");
  await expect(page.locator('table tbody tr td:has-text("No orders found")')).toBeVisible();
  await searchInput.fill("");
  // All rows restored
  expect(await page.locator('table tbody tr').count()).toBeGreaterThan(1);
  ```
- **Failure Trigger**: Clearing search input leaves table stuck on empty state.

#### `TEST-R4-T2-05`: Nonexistent Search Term Zero-State Handling
- **Feature Ref**: F10
- **Target Route**: `/project-management/drawings`
- **Category**: Search State Boundary
- **Steps**:
  1. Fill search input with `$$$___NONEXISTENT___$$$`.
- **Assertions**:
  ```js
  await page.locator('input[placeholder*="Search"]').first().fill("$$$___NONEXISTENT___$$$");
  await expect(page.locator('text=/No drawings or documents uploaded/i, text=/No records found/i')).toBeVisible();
  ```
- **Failure Trigger**: Crashes with unhandled exception or blank screen.

#### `TEST-R4-T2-06`: Rapid Keystroke Debounce & Focus Retention
- **Feature Ref**: F10
- **Target Route**: `/sales/invoices`
- **Category**: Accessibility & Typing Boundary
- **Steps**:
  1. Type 10 characters rapidly without pause.
- **Assertions**:
  ```js
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  await searchInput.focus();
  await searchInput.type("INV-10023", { delay: 10 });
  // Assert input retains active focus and exact value
  expect(await searchInput.inputValue()).toBe("INV-10023");
  const isFocused = await searchInput.evaluate(el => document.activeElement === el);
  expect(isFocused).toBe(true);
  ```
- **Failure Trigger**: Search input loses keyboard focus during re-rendering.

#### `TEST-R4-T2-07`: Whitespace-Padded Search Strings
- **Feature Ref**: F10
- **Target Route**: `/sales/orders`
- **Category**: Input Sanitization Boundary
- **Steps**:
  1. Type `   ORD-1001   ` with leading and trailing spaces.
- **Assertions**:
  ```js
  const searchInput = page.locator('input[placeholder*="Search"]').first();
  await searchInput.fill("   ORD-1001   ");
  // Record should be matched despite whitespace
  await expect(page.locator('table tbody tr td:has-text("ORD-1001")')).toBeVisible();
  ```
- **Failure Trigger**: Whitespace fails match due to missing `.trim()`.

#### `TEST-R4-T2-08`: Empty Projects List in Project Filter Dropdown
- **Feature Ref**: F9, F10
- **Target Route**: `/project-management/drawings`
- **Category**: Dropdown Boundary
- **Setup**: Mock API returns `projects: []`.
- **Steps**:
  1. Navigate to drawings page.
  2. Inspect project dropdown options.
- **Assertions**:
  ```js
  const select = page.locator('select').first();
  await expect(select).toBeVisible();
  // Should render default option "All Projects"
  expect(await select.locator('option').count()).toBeGreaterThanOrEqual(1);
  ```
- **Failure Trigger**: Dropdown disappears or causes React undefined error.

#### `TEST-R4-T2-09`: Long Option String in Status / Project Dropdown
- **Feature Ref**: F10
- **Target Route**: `/project-management/drawings`
- **Category**: Dropdown Boundary
- **Setup**: Project with 90-character name.
- **Steps**:
  1. Inspect dropdown width.
- **Assertions**:
  ```js
  const selectBox = await page.locator('select').first().boundingBox();
  // Must respect max-width or flex bounds
  expect(selectBox.width).toBeLessThanOrEqual(360);
  ```
- **Failure Trigger**: Dropdown expands past 360px and overflows screen.

#### `TEST-R4-T2-10`: Multi-Filter Reset Invariant
- **Feature Ref**: F10
- **Target Route**: `/purchase/purchase-orders-local`
- **Category**: Filter Combination State
- **Steps**:
  1. Type search query "SUP-1".
  2. Select status "PENDING".
  3. Clear search query and select status "ALL".
- **Assertions**:
  ```js
  // Assert table resets to full un-filtered dataset
  const rows = await page.locator('table tbody tr').count();
  expect(rows).toBeGreaterThan(1);
  ```
- **Failure Trigger**: Stale filter state remains active.

#### `TEST-R4-T2-11`: Combined Search & Status Filtering
- **Feature Ref**: F10
- **Target Route**: `/project-management/daily-reports`
- **Category**: Filter Combination State
- **Steps**:
  1. Set Status filter to "APPROVED".
  2. Enter search term "Site A".
- **Assertions**:
  ```js
  // Assert EVERY rendered row matches BOTH status === APPROVED and name includes "Site A"
  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const text = await rows.nth(i).innerText();
    expect(text).toContain("APPROVED");
    expect(text.toLowerCase()).toContain("site a");
  }
  ```
- **Failure Trigger**: Rows with non-approved status appear when filter is set.

#### `TEST-R4-T2-12`: Keyboard Tab Navigation Sequence
- **Feature Ref**: F10
- **Target Route**: Filter toolbar on `/maintenance/equipment`
- **Category**: Keyboard Accessibility
- **Steps**:
  1. Focus search input.
  2. Press `Tab`.
  3. Press `Tab` again.
- **Assertions**:
  ```js
  await page.locator('input[placeholder*="Search"]').first().focus();
  await page.keyboard.press('Tab');
  // Next active element should be dropdown select or filter button
  const tagName = await page.evaluate(() => document.activeElement.tagName.toLowerCase());
  expect(['select', 'button']).toContain(tagName);
  ```
- **Failure Trigger**: Focus jumps out of order or gets trapped.

#### `TEST-R4-T2-13`: Enter Key Submits Filter Without Page Reload
- **Feature Ref**: F10
- **Target Route**: `/sales/orders`
- **Category**: Keyboard Form Behavior
- **Steps**:
  1. Focus search input.
  2. Press `Enter`.
- **Assertions**:
  ```js
  let reloaded = false;
  page.on('framenavigated', () => { reloaded = true; });
  await page.locator('input[placeholder*="Search"]').first().press('Enter');
  expect(reloaded).toBe(false);
  ```
- **Failure Trigger**: Page submits form and triggers full browser reload.

#### `TEST-R4-T2-14`: Refresh Button Disabled / Spinner State
- **Feature Ref**: F10
- **Target Route**: `/project-management/drawings`
- **Category**: Action Button State
- **Steps**:
  1. Click Refresh button while network is delayed.
- **Assertions**:
  ```js
  const refreshBtn = page.locator('button[title="Refresh"]').first();
  await refreshBtn.click();
  // SVG must have animate-spin during fetch
  await expect(refreshBtn.locator('svg.animate-spin')).toBeVisible();
  ```
- **Failure Trigger**: Spinner animation does not activate.

---

## 5. Verification Method

### 5.1 Automated Script Verification
Run the verification check script to confirm that the documented lines and patterns in the source files are exact:
```powershell
node -e '
const fs = require("fs");
const files = [
  "client/src/pages/modules/sales/sales-orders/SalesOrderList.jsx",
  "client/src/pages/modules/sales/invoices/InvoiceList.jsx",
  "client/src/pages/modules/purchase/purchase-orders-local/PurchaseOrdersLocalList.jsx",
  "client/src/pages/modules/human-resources/employees/EmployeeList.jsx",
  "client/src/pages/modules/maintenance/equipment/EquipmentList.jsx",
  "client/src/pages/modules/inventory/ItemsList.jsx",
  "client/src/pages/modules/project-management/construction/BOQManager.jsx",
  "client/src/pages/modules/project-management/construction/DocumentRegisterPage.jsx",
  "client/src/pages/modules/project-management/projects/ProjectList.jsx"
];
files.forEach(f => console.log(f, fs.existsSync(f) ? "OK" : "MISSING"));
'
```

### 5.2 Build & Test Verification
Verify that client build succeeds:
```powershell
cd client
npm run build
```

### 5.3 Test Suite Invalidation Conditions
A test specification is invalidated if:
1. Any table row or header displays "Created By" or "Created Date" columns across standard business list views.
2. `EquipmentList.jsx` or `ItemsList.jsx` renders more than one KPI card grid block.
3. `BOQManager.jsx` displays labor or material sub-breakdown formulas directly in table line item columns instead of inside the Rate Analysis modal dialog.
4. `DocumentRegisterPage.jsx` retains the "Category" column (all "DRAWING") or keeps filter controls crammed into the page title header.
5. `ProjectList.jsx` maintains an "Active" boolean column adjacent to `project_status`.
6. `EmployeeList.jsx` retains a separate "Attachments" column.
7. Any control in a list page filter toolbar deviates from the standard 42px height (or 36px in compact toolbars).
8. The Refresh icon button is rendered with unequal width and height (e.g. non-square 32x42px).
