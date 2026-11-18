const fs = require('fs');

const files = [
  'client/src/pages/modules/sales/invoices/InvoiceList.jsx',
  'client/src/pages/modules/purchase/rfq/RequestForQuotationList.jsx',
  'client/src/pages/modules/facilities/compliance/FMCompliancePage.jsx'
];

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  // Match from `.map((stat, i) =>` up to the closing `</div>\s*\)\)`
  const regex = /\.map\(\(stat,\s*i\)\s*=>\s*\(?[\s\S]*?w-11 h-11 rounded-full[\s\S]*?<\/div>\s*<\/div>\s*\)\)/;
  const m = code.match(regex);
  if (m) {
    console.log('MATCHED in', f, 'length:', m[0].length);
  } else {
    console.log('NO MATCH in', f);
  }
}
