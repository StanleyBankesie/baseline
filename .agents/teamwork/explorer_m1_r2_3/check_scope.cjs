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

for (const relFile of files) {
  const fullPath = path.join(rootDir, relFile);
  const code = fs.readFileSync(fullPath, 'utf8');
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
    console.log(`[SYNTAX_ERROR] ${relFile}: ${err.message}`);
    continue;
  }

  const undeclared = [];
  traverse(ast, {
    ReferencedIdentifier(p) {
      const name = p.node.name;
      if (standardGlobals.has(name)) return;
      if (!p.scope.hasBinding(name)) {
        undeclared.push({ name, line: p.node.loc?.start?.line });
      }
    }
  });

  if (undeclared.length > 0) {
    console.log(`[UNDECLARED] ${relFile}:`);
    for (const u of undeclared) {
      console.log(`   line ${u.line}: ${u.name}`);
    }
  } else {
    console.log(`[CLEAN] ${relFile}`);
  }
}
