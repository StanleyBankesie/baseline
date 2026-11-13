/**
 * verify_m1_simulated.cjs
 *
 * Verifies that applying the proposed remediations across the 8 affected files
 * produces a 100% CLEAN verdict across all 17 Milestone 1 files.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../..');
const parser = require(path.join(rootDir, 'client/node_modules/@babel/parser'));
const traverse = require(path.join(rootDir, 'client/node_modules/@babel/traverse')).default;

const files = [
  'client/src/components/ModuleLayout.jsx',
  'client/src/components/ModuleDashboard.jsx',
  'client/src/pages/DashboardPage.jsx',
  'client/src/pages/modules/facilities/hard-services/HardServicesPage.jsx',
  'client/src/pages/modules/facilities/helpdesk/FMHelpdeskPage.jsx',
  'client/src/pages/modules/finance/banking/PdcPostingsList.jsx',
  'client/src/pages/modules/inventory/DailyStockTakeList.jsx',
  'client/src/pages/modules/inventory/ItemGroupsList.jsx',
  'client/src/pages/modules/inventory/PhysicalStockTakeList.jsx',
  'client/src/pages/modules/inventory/StockTakeList.jsx',
  'client/src/pages/modules/inventory/StockVerificationList.jsx',
  'client/src/pages/modules/service-management/service-confirmations/ServiceConfirmationsList.jsx',
  'client/src/pages/modules/transport/compliance/VehicleComplianceList.jsx',
  'client/src/pages/modules/transport/drivers/DriversList.jsx',
  'client/src/pages/modules/transport/logbook/LogbookList.jsx',
  'client/src/pages/modules/transport/servicing/VehicleServicingList.jsx',
  'client/src/pages/modules/transport/vehicles/VehiclesList.jsx'
];

const standardGlobals = new Set([
  'console', 'window', 'document', 'navigator', 'localStorage', 'sessionStorage',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'fetch', 'Intl',
  'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Date', 'Error',
  'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet', 'Math', 'JSON', 'isNaN', 'isFinite',
  'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI',
  'decodeURI', 'undefined', 'NaN', 'Infinity', 'process', 'URL', 'URLSearchParams',
  'alert', 'confirm', 'prompt', 'requestAnimationFrame', 'cancelAnimationFrame',
  'Blob', 'File', 'FileReader', 'FormData', 'Headers', 'Request', 'Response'
]);

// Simulated patches for the 8 affected files
const simulatedPatches = {
  // Explorer 3 scope:
  'client/src/pages/modules/facilities/helpdesk/FMHelpdeskPage.jsx': (c) =>
    c.replace('loadData();', 'fetchTickets();'),
  'client/src/pages/modules/finance/banking/PdcPostingsList.jsx': (c) =>
    c.replace('toast.error(e2?.response?.data?.message', 'toast.error(e?.response?.data?.message'),

  // Explorer 1 & 2 scope (Transport & Inventory):
  'client/src/pages/modules/inventory/DailyStockTakeList.jsx': (c) =>
    c.replaceAll('(stockTakes || [])', '(items || [])'),
  'client/src/pages/modules/inventory/PhysicalStockTakeList.jsx': (c) =>
    c.replaceAll('(audits || [])', '(items || [])'),
  'client/src/pages/modules/inventory/StockVerificationList.jsx': (c) =>
    c.replaceAll('(items || [])', '(verifications || [])'),
  'client/src/pages/modules/transport/compliance/VehicleComplianceList.jsx': (c) =>
    c.replaceAll('(records || [])', '(compliances || [])'),
  'client/src/pages/modules/transport/logbook/LogbookList.jsx': (c) =>
    c.replaceAll('(entries || [])', '(logbooks || [])'),
  'client/src/pages/modules/transport/servicing/VehicleServicingList.jsx': (c) =>
    c.replaceAll('(services || [])', '(servicing || [])')
};

console.log('='.repeat(70));
console.log('POST-REMEDIATION BABEL AST SIMULATED VERIFICATION (17 FILES)');
console.log('='.repeat(70));

let cleanCount = 0;
let defectCount = 0;

for (const relPath of files) {
  const fullPath = path.join(rootDir, relPath);
  let code = fs.readFileSync(fullPath, 'utf8');
  if (simulatedPatches[relPath]) {
    code = simulatedPatches[relPath](code);
  }

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'classProperties',
        'dynamicImport',
        'optionalChaining',
        'nullishCoalescingOperator',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'objectRestSpread',
        'asyncGenerators',
        'importMeta'
      ]
    });
  } catch (err) {
    defectCount++;
    console.log(`[FAIL: SYNTAX]     ${relPath} -> ${err.message}`);
    continue;
  }

  const undeclared = [];
  traverse(ast, {
    ReferencedIdentifier(p) {
      const name = p.node.name;
      if (standardGlobals.has(name)) return;
      if (!p.scope.hasBinding(name)) {
        undeclared.push({
          name,
          line: p.node.loc?.start?.line
        });
      }
    }
  });

  if (undeclared.length > 0) {
    defectCount++;
    const issues = undeclared.map(u => `${u.name} (line ${u.line})`).join(', ');
    console.log(`[FAIL: SCOPE BUG]  ${relPath} -> ${issues}`);
  } else {
    cleanCount++;
    console.log(`[PASS: CLEAN 100%] ${relPath}`);
  }
}

console.log('-'.repeat(70));
console.log(`Summary: ${cleanCount}/${files.length} CLEAN, ${defectCount}/${files.length} WITH DEFECTS`);
if (cleanCount === files.length) {
  console.log('VERDICT: ALL 17 MILESTONE 1 FILES HAVE ZERO UNDECLARED IDENTIFIERS!');
}
console.log('='.repeat(70));
