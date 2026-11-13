const fs = require('fs');

function extractMainTheadHeaders(content) {
  const theadMatches = [...content.matchAll(/<thead[^>]*>([\s\S]*?)<\/thead>/gi)];
  if (theadMatches.length === 0) return [];
  // Return headers for all theads or main thead
  return theadMatches.map(tm => {
    const theadContent = tm[1];
    const headers = [];
    const tokenRegex = /<th[^>]*>([\s\S]*?)<\/th>|<SortableHeader[^>]*label=["']([^"']+)["']/gi;
    let match;
    while ((match = tokenRegex.exec(theadContent)) !== null) {
      if (match[1] !== undefined) {
        const text = match[1].replace(/<[^>]+>/g, '').trim();
        if (text) headers.push(text);
      } else if (match[2] !== undefined) {
        headers.push(match[2].trim());
      }
    }
    return headers;
  });
}

const files = {
  SalesOrders: 'client/src/pages/modules/sales/sales-orders/SalesOrderList.jsx',
  Invoices: 'client/src/pages/modules/sales/invoices/InvoiceList.jsx',
  PurchaseOrders: 'client/src/pages/modules/purchase/purchase-orders-local/PurchaseOrdersLocalList.jsx',
  PurchaseBills: 'client/src/pages/modules/purchase/purchase-bills/PurchaseBillsList.jsx',
  JournalVouchers: 'client/src/pages/modules/finance/JournalVoucherList.jsx',
  Employees: 'client/src/pages/modules/human-resources/employees/EmployeeList.jsx',
  AssetRegister: 'client/src/pages/modules/asset-management/AssetRegisterList.jsx',
  DocRegister: 'client/src/pages/modules/project-management/construction/DocumentRegisterPage.jsx',
  Projects: 'client/src/pages/modules/project-management/projects/ProjectList.jsx',
  BOQManager: 'client/src/pages/modules/project-management/construction/BOQManager.jsx'
};

for (const [name, path] of Object.entries(files)) {
  const content = fs.readFileSync(path, 'utf8');
  const theads = extractMainTheadHeaders(content);
  console.log(`=== ${name} (${theads.length} tables with <thead>) ===`);
  theads.forEach((h, i) => console.log(`  Table ${i + 1}: [${h.join(', ')}]`));
}
