const fs = require('fs');
const path = require('path');
const esbuild = require(path.resolve(__dirname, '../../../client/node_modules/esbuild'));

const rootDir = path.resolve(__dirname, '../../..');
const files = [
  'client/src/pages/DashboardPage.jsx',
  'client/src/pages/modules/facilities/hard-services/HardServicesPage.jsx',
  'client/src/pages/modules/facilities/helpdesk/FMHelpdeskPage.jsx',
  'client/src/pages/modules/finance/banking/PdcPostingsList.jsx',
  'client/src/pages/modules/service-management/service-confirmations/ServiceConfirmationsList.jsx',
  'client/src/pages/modules/inventory/DailyStockTakeList.jsx',
  'client/src/pages/modules/inventory/ItemGroupsList.jsx',
  'client/src/pages/modules/inventory/PhysicalStockTakeList.jsx',
  'client/src/pages/modules/inventory/StockTakeList.jsx',
  'client/src/pages/modules/inventory/StockVerificationList.jsx',
  'client/src/pages/modules/transport/compliance/VehicleComplianceList.jsx',
  'client/src/pages/modules/transport/drivers/DriversList.jsx',
  'client/src/pages/modules/transport/logbook/LogbookList.jsx',
  'client/src/pages/modules/transport/servicing/VehicleServicingList.jsx',
  'client/src/pages/modules/transport/vehicles/VehiclesList.jsx'
];

let failed = 0;
let results = [];

for (const relFile of files) {
  const file = path.join(rootDir, relFile);
  try {
    const code = fs.readFileSync(file, 'utf8');
    esbuild.transformSync(code, { loader: 'jsx' });
    console.log(`[PASS] ${relFile}`);
    results.push({ file: relFile, status: 'PASS' });
  } catch (err) {
    console.error(`[FAIL] ${relFile}: ${err.message}`);
    results.push({ file: relFile, status: 'FAIL', error: err.message });
    failed++;
  }
}

console.log(`\nVerification Summary: ${files.length - failed}/${files.length} passed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL 15 FILES COMPILE CLEANLY!');
}
