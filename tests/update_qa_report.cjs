const fs = require('fs');

let doc = fs.readFileSync('docs/OMNISUITE_QA_REPORT.md', 'utf8');
const invTable = fs.readFileSync('tests/inventory_table.md', 'utf8');

// Replace Module 3 placeholder table
const oldModule3 = `### Module 3: Inventory & Warehouse Management

| Page / Feature | Route | Status | Test Cases | Bugs Identified | Fix Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Item Master / Catalog** | \`/inventory/items\` | NOT TESTED | Item creation, SKU generator, barcode, reorder levels | - | - |
| **Stock Adjustments** | \`/inventory/stock-adjustments\` | NOT TESTED | Quantity correction, discrepancy reason, valuation | - | - |
| **Stock Balances** | \`/inventory/reports/stock-balances\` | NOT TESTED | Warehouse breakdown, batch valuation, negative stock | - | - |
| **Stock Journal** | \`/inventory/stock-journal\` | NOT TESTED | Inter-warehouse transfer, adjustment postings | - | - |
| **Physical Stock Take** | \`/inventory/physical-stock-take\` | NOT TESTED | Reconciliation sheet, discrepancy review, post | - | - |
| **Material Requisition** | \`/inventory/material-requisitions\` | NOT TESTED | Department request, store issue, approval flow | - | - |`;

doc = doc.replace(oldModule3, invTable.trim());

// Append the new fixes to Section 3
const additionalFixes = `
10. **Stock Journal List Crash (\`ReferenceError: journals is not defined\`)**:
    - **Root cause**: Metric summary cards in [StockJournalList.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/inventory/StockJournalList.jsx) referenced undefined \`journals\` variable instead of \`items\`.
    - **Fix applied**: Replaced \`journals\` with \`items\`. Verified passed (26 buttons, 3 inputs, 10 cards).
11. **Stock Updation List Crash (\`ReferenceError: updates is not defined\`)**:
    - **Root cause**: Metric cards in [StockUpdationList.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/inventory/StockUpdationList.jsx) referenced undefined \`updates\` variable instead of \`adjustments\`.
    - **Fix applied**: Replaced \`updates\` with \`adjustments\`. Verified passed (25 buttons, 1 input, 9 cards).
12. **Stock Verification List Crash (\`ReferenceError: items is not defined\`)**:
    - **Root cause**: Metric cards in [StockVerificationList.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/inventory/StockVerificationList.jsx) referenced undefined \`items\` variable instead of \`verifications\`.
    - **Fix applied**: Replaced \`items\` with \`verifications\`. Verified passed (19 buttons, 2 inputs, 7 cards).
13. **Return to Stores List Crash (\`ReferenceError: returns is not defined\`)**:
    - **Root cause**: Metric cards in [ReturnToStoresList.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/inventory/ReturnToStoresList.jsx) referenced undefined \`returns\` variable instead of \`docs\`.
    - **Fix applied**: Replaced \`returns\` with \`docs\`. Verified passed (30 buttons, 1 input, 12 cards).
14. **Daily Stock Take List Crash (\`ReferenceError: stockTakes is not defined\`)**:
    - **Root cause**: Metric cards in [DailyStockTakeList.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/inventory/DailyStockTakeList.jsx) referenced undefined \`stockTakes\` variable instead of \`items\`.
    - **Fix applied**: Replaced \`stockTakes\` with \`items\`. Verified passed (15 buttons, 3 inputs, 9 cards).
15. **Physical Stock Take List Crash (\`ReferenceError: audits is not defined\`)**:
    - **Root cause**: Metric cards in [PhysicalStockTakeList.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/inventory/PhysicalStockTakeList.jsx) referenced undefined \`audits\` variable instead of \`items\`.
    - **Fix applied**: Replaced \`audits\` with \`items\`. Verified passed (15 buttons, 3 inputs, 9 cards).
16. **Item Batches List Crash (\`ReferenceError: batches is not defined\`)**:
    - **Root cause**: Metric cards in [ItemBatchesList.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/inventory/ItemBatchesList.jsx) referenced undefined \`batches\` variable instead of \`items\`.
    - **Fix applied**: Replaced \`batches\` with \`items\`. Verified passed (12 buttons, 4 inputs, 9 cards).
17. **Small & Medium Device Module Icon Sliding**:
    - **Implemented**: In [AppShell.jsx](file:///c:/Users/stanl/demo/client/src/layout/AppShell.jsx), transformed the bottom navigation bar into a touch-enabled horizontal sliding container across all assigned module icons for screen sizes up to 1024px (\`< lg\`).
18. **Smoky Shadows & Typography Polish**:
    - **Implemented**: Elevated multi-stage smoky shadow spread in [styles.css](file:///c:/Users/stanl/demo/client/src/styles.css) and increased typography sizes across homepage and module home cards in [HomePage.jsx](file:///c:/Users/stanl/demo/client/src/pages/home/HomePage.jsx) and [ModuleDashboard.jsx](file:///c:/Users/stanl/demo/client/src/components/ModuleDashboard.jsx).
19. **Branch Management Clean Re-homing**:
    - **Implemented**: Relocated branch management strictly to System Configuration (\`/system-configuration/branches\`) in [SystemConfigurationHome.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/system-configuration/SystemConfigurationHome.jsx) with clean single-level actions and redirects from administration.
`;

doc += additionalFixes;

fs.writeFileSync('docs/OMNISUITE_QA_REPORT.md', doc, 'utf8');
console.log('docs/OMNISUITE_QA_REPORT.md updated successfully');
