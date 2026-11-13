/**
 * verify_m1_scope.cjs
 *
 * Exhaustive Babel AST semantic scope analyzer for all Milestone 1 files.
 * Uses @babel/parser and @babel/traverse to detect undeclared identifier references
 * that would throw ReferenceError at runtime.
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

function analyzeFile(filePath, codeOverride = null) {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
  const code = codeOverride !== null ? codeOverride : fs.readFileSync(fullPath, 'utf8');

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
    return { status: 'SYNTAX_ERROR', error: err.message, undeclared: [] };
  }

  const undeclared = [];
  traverse(ast, {
    ReferencedIdentifier(p) {
      const name = p.node.name;
      if (standardGlobals.has(name)) return;
      if (!p.scope.hasBinding(name)) {
        undeclared.push({
          name,
          line: p.node.loc?.start?.line,
          col: p.node.loc?.start?.column
        });
      }
    }
  });

  if (undeclared.length > 0) {
    return { status: 'UNDECLARED_FOUND', undeclared };
  }
  return { status: 'CLEAN', undeclared: [] };
}

console.log('='.repeat(70));
console.log('MILIESTONE 1 — BABEL AST SEMANTIC SCOPE ANALYSIS');
console.log('='.repeat(70));

let cleanCount = 0;
let defectCount = 0;

for (const relPath of files) {
  const res = analyzeFile(relPath);
  if (res.status === 'CLEAN') {
    cleanCount++;
    console.log(`[PASS: CLEAN]      ${relPath}`);
  } else if (res.status === 'SYNTAX_ERROR') {
    defectCount++;
    console.log(`[FAIL: SYNTAX]     ${relPath} -> ${res.error}`);
  } else {
    defectCount++;
    const issues = res.undeclared.map(u => `${u.name} (line ${u.line})`).join(', ');
    console.log(`[FAIL: SCOPE BUG]  ${relPath} -> ${issues}`);
  }
}

console.log('-'.repeat(70));
console.log(`Summary: ${cleanCount}/${files.length} CLEAN, ${defectCount}/${files.length} WITH DEFECTS`);
console.log('='.repeat(70));
