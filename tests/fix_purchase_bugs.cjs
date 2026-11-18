const fs = require('fs');

// 1. RequestForQuotationForm.jsx (declare id, isEdit)
let f1 = fs.readFileSync('client/src/pages/modules/purchase/rfq/RequestForQuotationForm.jsx', 'utf8');
f1 = f1.replace(
  'export default function RequestForQuotationForm() {',
  'export default function RequestForQuotationForm() {\n  const { id } = useParams();\n  const isEdit = Boolean(id);'
);
fs.writeFileSync('client/src/pages/modules/purchase/rfq/RequestForQuotationForm.jsx', f1, 'utf8');
console.log('Fixed RequestForQuotationForm.jsx');

// 2. PortClearancesList.jsx (clearances -> items)
let f2 = fs.readFileSync('client/src/pages/modules/purchase/port-clearances/PortClearancesList.jsx', 'utf8');
f2 = f2.replace(/\(clearances \|\| \[\]\)/g, '(items || [])');
fs.writeFileSync('client/src/pages/modules/purchase/port-clearances/PortClearancesList.jsx', f2, 'utf8');
console.log('Fixed PortClearancesList.jsx');

// 3. PurchaseBillsList.jsx (bills -> items)
let f3 = fs.readFileSync('client/src/pages/modules/purchase/purchase-bills/PurchaseBillsList.jsx', 'utf8');
f3 = f3.replace(/\(bills \|\| \[\]\)/g, '(items || [])');
fs.writeFileSync('client/src/pages/modules/purchase/purchase-bills/PurchaseBillsList.jsx', f3, 'utf8');
console.log('Fixed PurchaseBillsList.jsx');

// 4. ServiceBillsList.jsx (bills -> items)
let f4 = fs.readFileSync('client/src/pages/modules/purchase/service-bills/ServiceBillsList.jsx', 'utf8');
f4 = f4.replace(/\(bills \|\| \[\]\)/g, '(items || [])');
fs.writeFileSync('client/src/pages/modules/purchase/service-bills/ServiceBillsList.jsx', f4, 'utf8');
console.log('Fixed ServiceBillsList.jsx');

// 5. ServiceConfirmationsList.jsx (confirmations -> items)
let f5 = fs.readFileSync('client/src/pages/modules/purchase/service-confirmations/ServiceConfirmationsList.jsx', 'utf8');
f5 = f5.replace(/\(confirmations \|\| \[\]\)/g, '(items || [])');
fs.writeFileSync('client/src/pages/modules/purchase/service-confirmations/ServiceConfirmationsList.jsx', f5, 'utf8');
console.log('Fixed ServiceConfirmationsList.jsx');

console.log('All purchase bugs fixed successfully!');
