const fs = require('fs');
const path = require('path');

const sampleFiles = [
  'client/src/pages/modules/purchase/purchase-orders/PurchaseOrderList.jsx',
  'client/src/pages/modules/purchase/purchase-orders/PurchaseOrdersList.jsx',
  'client/src/pages/modules/finance/reports/GeneralLedgerPage.jsx',
  'client/src/pages/modules/finance/vouchers/VouchersListPage.jsx',
  'client/src/pages/modules/human-resources/employees/EmployeeList.jsx',
  'client/src/pages/modules/maintenance/work-orders/WorkOrdersPage.jsx',
  'client/src/pages/modules/maintenance/work-orders/WorkOrderList.jsx'
];

sampleFiles.forEach(f => {
  if (fs.existsSync(f)) {
    console.log(`\n========================================\nFile: ${f}`);
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('searchTerm') || line.includes('searchQuery') || line.includes('ViewToggle') || line.includes('RefreshCw') || line.includes('filter')) {
        if (line.includes('input') || line.includes('select') || line.includes('button') || line.includes('div className=')) {
          console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
      }
    });
  }
});
