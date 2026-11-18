const fs = require('fs');

// 1. TransportationBillsList.jsx
{
  const p = 'client/src/pages/modules/transport/transportation-bills/TransportationBillsList.jsx';
  let code = fs.readFileSync(p, 'utf8');
  const carouselMatch = code.match(/\{\/\* Metric Stats Cards \*\/\}[\s\S]*?<\/MobileMovingCarousel>/);
  if (carouselMatch) {
    let carousel = carouselMatch[0].replace(/\(bills \|\| \[\]\)/g, '(items || [])');
    code = code.replace(carouselMatch[0], '');
    const marker = '<div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">';
    code = code.replace(marker, carousel + '\n\n      ' + marker);
    fs.writeFileSync(p, code, 'utf8');
    console.log('Fixed TransportationBillsList.jsx');
  }
}

// 2. BillingList.jsx
{
  const p = 'client/src/pages/modules/transport/billing/BillingList.jsx';
  let code = fs.readFileSync(p, 'utf8');
  code = code.replace(/\(bills \|\| \[\]\)/g, '(billing || [])');
  fs.writeFileSync(p, code, 'utf8');
  console.log('Fixed BillingList.jsx');
}

// 3. MaintenanceList.jsx
{
  const p = 'client/src/pages/modules/transport/maintenance/MaintenanceList.jsx';
  let code = fs.readFileSync(p, 'utf8');
  code = code.replace(/\(repairs \|\| \[\]\)/g, '(requests || [])');
  fs.writeFileSync(p, code, 'utf8');
  console.log('Fixed MaintenanceList.jsx');
}

// 4. TransportIncomeList.jsx
{
  const p = 'client/src/pages/modules/transport/income/TransportIncomeList.jsx';
  let code = fs.readFileSync(p, 'utf8');
  code = code.replace(/\(incomes \|\| \[\]\)/g, '(items || [])');
  fs.writeFileSync(p, code, 'utf8');
  console.log('Fixed TransportIncomeList.jsx');
}

// 5. TransportExpenseList.jsx
{
  const p = 'client/src/pages/modules/transport/expenses/TransportExpenseList.jsx';
  let code = fs.readFileSync(p, 'utf8');
  code = code.replace(/\(expenses \|\| \[\]\)/g, '(items || [])');
  fs.writeFileSync(p, code, 'utf8');
  console.log('Fixed TransportExpenseList.jsx');
}

// 6. ExpenseLogList.jsx
{
  const p = 'client/src/pages/modules/transport/expenses/ExpenseLogList.jsx';
  let code = fs.readFileSync(p, 'utf8');
  code = code.replace(/\(logs \|\| \[\]\)/g, '(items || [])');
  fs.writeFileSync(p, code, 'utf8');
  console.log('Fixed ExpenseLogList.jsx');
}
