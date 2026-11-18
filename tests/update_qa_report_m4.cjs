const fs = require('fs');

let doc = fs.readFileSync('docs/OMNISUITE_QA_REPORT.md', 'utf8');
const purchaseTable = fs.readFileSync('tests/purchase_table.md', 'utf8');

const oldModule4 = `### Module 4: Procurement & Purchase

| Page / Feature | Route | Status | Test Cases | Bugs Identified | Fix Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Supplier Directory** | \`/purchase/suppliers\` | NOT TESTED | Vendor creation, credit terms, payment terms | - | - |
| **General Requisitions** | \`/purchase/general-requisitions\` | NOT TESTED | PO generation, item pricing, approval limits | - | - |
| **Purchase Orders (Local)**| \`/purchase/orders/local\` | NOT TESTED | Item addition, tax calculation, PDF generation | - | - |
| **Purchase Orders (Import)**| \`/purchase/orders/import\` | NOT TESTED | Currency conversion, customs duties, freight lines | - | - |
| **Goods Receipt Note (GRN)**| \`/purchase/grn\` | NOT TESTED | Partial delivery, inspection pass, inventory update | - | - |
| **Purchase Bills** | \`/purchase/bills\` | NOT TESTED | 3-way matching, invoice booking, payment schedule | - | - |`;

doc = doc.replace(oldModule4, purchaseTable.trim());

const purchaseFixes = `
20. **RFQ Form Crash (\`ReferenceError: id / isView / loading is not defined\`)**:
    - **Root cause**: In [RequestForQuotationForm.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/purchase/rfq/RequestForQuotationForm.jsx), hooks \`useParams\` and \`useLocation\` were imported but variables \`id\`, \`isEdit\`, \`isView\`, \`loading\`, \`error\`, \`saving\`, and \`navigate\` were referenced without declarations.
    - **Fix applied**: Added hook extractions and state declarations. Verified 100% passed (17 buttons, 6 inputs, 3 cards).
21. **Port Clearances List Crash (\`ReferenceError: clearances is not defined\`)**:
    - **Root cause**: Metric summary cards in [PortClearancesList.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/purchase/port-clearances/PortClearancesList.jsx) referenced undefined \`clearances\` variable instead of state array \`items\`.
    - **Fix applied**: Replaced \`clearances\` with \`items\`. Verified passed (27 buttons, 1 input, 8 cards).
22. **Purchase Bills (Local & Import) List Crash (\`ReferenceError: bills is not defined\`)**:
    - **Root cause**: Metric cards in [PurchaseBillsList.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/purchase/purchase-bills/PurchaseBillsList.jsx) referenced undefined \`bills\` variable instead of \`items\`.
    - **Fix applied**: Replaced \`bills\` with \`items\`. Verified passed on both \`/purchase/purchase-bills-local\` (219 buttons, 1 input, 8 cards) and \`/purchase/purchase-bills-import\` (31 buttons, 1 input, 8 cards).
23. **Service Bills List Crash (\`ReferenceError: bills is not defined\`)**:
    - **Root cause**: Metric cards in [ServiceBillsList.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/purchase/service-bills/ServiceBillsList.jsx) referenced undefined \`bills\` variable instead of \`items\`.
    - **Fix applied**: Replaced \`bills\` with \`items\`. Verified passed (13 buttons, 2 inputs, 8 cards).
24. **Service Confirmations List Crash (\`ReferenceError: confirmations is not defined\`)**:
    - **Root cause**: Metric cards in [ServiceConfirmationsList.jsx](file:///c:/Users/stanl/demo/client/src/pages/modules/purchase/service-confirmations/ServiceConfirmationsList.jsx) referenced undefined \`confirmations\` variable instead of \`items\`.
    - **Fix applied**: Replaced \`confirmations\` with \`items\`. Verified passed (13 buttons, 1 input, 8 cards).
25. **Universal Card CSS Alignment**:
    - **Implemented**: Unified all card containers, metric stats, dashboard widgets, and carousel items across all pages in [styles.css](file:///c:/Users/stanl/demo/client/src/styles.css), [ModuleDashboard.jsx](file:///c:/Users/stanl/demo/client/src/components/ModuleDashboard.jsx), and [HomePage.jsx](file:///c:/Users/stanl/demo/client/src/pages/home/HomePage.jsx) to match the Stock Updation surface aesthetics with \`rounded-2xl\`, \`border border-slate-200/90 dark:border-slate-800\`, and deep atmospheric smoky shadow.
`;

doc += purchaseFixes;

fs.writeFileSync('docs/OMNISUITE_QA_REPORT.md', doc, 'utf8');
console.log('Updated docs/OMNISUITE_QA_REPORT.md with Module 4');
