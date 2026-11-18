const fs = require('fs');

// 1. StockJournalList.jsx (journals -> items)
let f1 = fs.readFileSync('client/src/pages/modules/inventory/StockJournalList.jsx', 'utf8');
f1 = f1.replace(/\(journals \|\| \[\]\)/g, '(items || [])');
fs.writeFileSync('client/src/pages/modules/inventory/StockJournalList.jsx', f1, 'utf8');
console.log('Fixed StockJournalList.jsx');

// 2. StockUpdationList.jsx (updates -> adjustments)
let f2 = fs.readFileSync('client/src/pages/modules/inventory/StockUpdationList.jsx', 'utf8');
f2 = f2.replace(/\(updates \|\| \[\]\)/g, '(adjustments || [])');
fs.writeFileSync('client/src/pages/modules/inventory/StockUpdationList.jsx', f2, 'utf8');
console.log('Fixed StockUpdationList.jsx');

// 3. StockVerificationList.jsx (items -> verifications)
let f3 = fs.readFileSync('client/src/pages/modules/inventory/StockVerificationList.jsx', 'utf8');
f3 = f3.replace(/val: \(items \|\| \[\]\)/g, 'val: (verifications || [])');
fs.writeFileSync('client/src/pages/modules/inventory/StockVerificationList.jsx', f3, 'utf8');
console.log('Fixed StockVerificationList.jsx');

// 4. ReturnToStoresList.jsx (returns -> docs)
let f4 = fs.readFileSync('client/src/pages/modules/inventory/ReturnToStoresList.jsx', 'utf8');
f4 = f4.replace(/\(returns \|\| \[\]\)/g, '(docs || [])');
fs.writeFileSync('client/src/pages/modules/inventory/ReturnToStoresList.jsx', f4, 'utf8');
console.log('Fixed ReturnToStoresList.jsx');

// 5. DailyStockTakeList.jsx (stockTakes -> items)
let f5 = fs.readFileSync('client/src/pages/modules/inventory/DailyStockTakeList.jsx', 'utf8');
f5 = f5.replace(/\(stockTakes \|\| \[\]\)/g, '(items || [])');
fs.writeFileSync('client/src/pages/modules/inventory/DailyStockTakeList.jsx', f5, 'utf8');
console.log('Fixed DailyStockTakeList.jsx');

// 6. PhysicalStockTakeList.jsx (audits -> items)
let f6 = fs.readFileSync('client/src/pages/modules/inventory/PhysicalStockTakeList.jsx', 'utf8');
f6 = f6.replace(/\(audits \|\| \[\]\)/g, '(items || [])');
fs.writeFileSync('client/src/pages/modules/inventory/PhysicalStockTakeList.jsx', f6, 'utf8');
console.log('Fixed PhysicalStockTakeList.jsx');

// 7. ItemBatchesList.jsx (batches -> items)
let f7 = fs.readFileSync('client/src/pages/modules/inventory/ItemBatchesList.jsx', 'utf8');
f7 = f7.replace(/\(batches \|\| \[\]\)/g, '(items || [])');
fs.writeFileSync('client/src/pages/modules/inventory/ItemBatchesList.jsx', f7, 'utf8');
console.log('Fixed ItemBatchesList.jsx');

console.log('All 7 inventory files fixed!');
