const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runFinanceQA() {
  const screenshotsDir = path.join(__dirname, 'screenshots', 'finance');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = {
    module: "Finance & Accounting",
    timestamp: new Date().toISOString(),
    pages: [],
    summary: { total: 0, passed: 0, failed: 0 }
  };

  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ url: page.url(), text: msg.text() });
    }
  });

  page.on('requestfailed', req => {
    networkErrors.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  page.on('response', res => {
    if (res.status() >= 400) {
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });

  console.log('=== STEP 1: AUTHENTICATION & LOGIN ===');
  await page.goto('http://localhost:5173/login');
  await page.waitForSelector('#username', { timeout: 15000 });
  console.log('Login form detected.');

  await page.fill('#username', 'admin');
  const pwInput = await page.$('input[type="password"]');
  if (pwInput) {
    await pwInput.fill('admin123');
  }
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3500);
  console.log('Current URL post-login:', page.url());

  if (page.url().includes('select-branch')) {
    console.log('Handling branch selection screen...');
    const branchBtn = await page.$('button, [data-branch-id]');
    if (branchBtn) {
      await branchBtn.click();
      await page.waitForTimeout(2500);
    }
  }

  console.log('Authenticated session ready at:', page.url());

  const financePagesToTest = [
    { name: "Finance Landing", path: "/finance" },
    { name: "Finance Analytics Dashboard", path: "/finance/dashboard" },

    // Vouchers (List & Create)
    { name: "Journal Vouchers List", path: "/finance/journal-voucher" },
    { name: "Journal Voucher Create", path: "/finance/journal-voucher/create" },
    { name: "Payment Vouchers List", path: "/finance/payment-voucher" },
    { name: "Payment Voucher Create", path: "/finance/payment-voucher/create" },
    { name: "Receipt Vouchers List", path: "/finance/receipt-voucher" },
    { name: "Receipt Voucher Create", path: "/finance/receipt-voucher/create" },
    { name: "Contra Vouchers List", path: "/finance/contra-voucher" },
    { name: "Contra Voucher Create", path: "/finance/contra-voucher/create" },
    { name: "Sales Vouchers List", path: "/finance/sales-voucher" },
    { name: "Sales Voucher Create", path: "/finance/sales-voucher/create" },
    { name: "Purchase Vouchers List", path: "/finance/purchase-voucher" },
    { name: "Purchase Voucher Create", path: "/finance/purchase-voucher/create" },
    { name: "Debit Notes List", path: "/finance/debit-note" },
    { name: "Debit Note Create", path: "/finance/debit-note/create" },
    { name: "Credit Notes List", path: "/finance/credit-note" },
    { name: "Credit Note Create", path: "/finance/credit-note/create" },
    { name: "Petty Cash Operations", path: "/finance/petty-cash" },
    { name: "Petty Cash Disburse Form", path: "/finance/petty-cash/disburse" },
    { name: "Voucher Import Tool", path: "/finance/vouchers/import" },

    // Banking
    { name: "Bank Reconciliation List", path: "/finance/bank-reconciliation" },
    { name: "Bank Reconciliation Form", path: "/finance/bank-reconciliation/new" },
    { name: "PDC Postings List", path: "/finance/pdc-postings" },
    { name: "PDC Postings Form", path: "/finance/pdc-postings/new" },

    // Accounting & System Setup
    { name: "Finance Setup Central", path: "/finance/setup" },
    { name: "Account Groups Setup", path: "/finance/setup/account-groups" },
    { name: "Accounts Master Setup", path: "/finance/setup/accounts" },
    { name: "Tax Codes Setup", path: "/finance/setup/tax-codes" },
    { name: "Currencies Setup", path: "/finance/setup/currencies" },
    { name: "Fiscal Years Setup", path: "/finance/setup/fiscal-years" },
    { name: "Cost Centers Setup", path: "/finance/setup/cost-centers" },
    { name: "Opening Balances Setup", path: "/finance/setup/opening-balances" },

    // Budgets
    { name: "Budget Setup", path: "/finance/setup/budget" },
    { name: "Budget Dashboard", path: "/finance/budget-dashboard" },
    { name: "Budget vs Actual Report", path: "/finance/reports/budget-vs-actual" },

    // Financial Reports & Ledgers
    { name: "Voucher Register Report", path: "/finance/reports/voucher-register" },
    { name: "Trial Balance Report", path: "/finance/reports/trial-balance" },
    { name: "General Journal Report", path: "/finance/reports/journal" },
    { name: "General Ledger Report", path: "/finance/reports/general-ledger" },
    { name: "Creditors Ledger Report", path: "/finance/reports/creditors-ledger" },
    { name: "Debtors Ledger Report", path: "/finance/reports/debtors-ledger" },
    { name: "Supplier Outstanding Report", path: "/finance/reports/supplier-outstanding" },
    { name: "Customer Outstanding Report", path: "/finance/reports/customer-outstanding" },
    { name: "Outstanding Receivables Report", path: "/finance/reports/outstanding-receivables" },
    { name: "Payment Due Report", path: "/finance/reports/payment-due" },
    { name: "Audit Trail Report", path: "/finance/reports/audit-trail" },
    { name: "Ratio Analysis Report", path: "/finance/reports/ratio-analysis" },
    { name: "Profit and Loss Statement", path: "/finance/reports/profit-and-loss" },
    { name: "Statement of P&L and OCI", path: "/finance/reports/profit-loss-oci" },
    { name: "Balance Sheet Report", path: "/finance/reports/balance-sheet" },
    { name: "Cash Flow Statement", path: "/finance/reports/cash-flow" },
    { name: "Chart of Accounts Report", path: "/finance/reports/chart-of-accounts" },
    { name: "Graphical Chart of Accounts", path: "/finance/reports/chart-of-accounts-graphical" },
    { name: "Bank Reconciliations Summary Report", path: "/finance/reports/bank-reconciliations" },
    { name: "Bank Reconciliation Transactions Report", path: "/finance/reports/bank-reconciliation-transactions" }
  ];

  results.summary.total = financePagesToTest.length;

  for (const p of financePagesToTest) {
    console.log(`\n--- TESTING PAGE: ${p.name} (${p.path}) ---`);
    const pageTest = {
      name: p.name,
      path: p.path,
      status: "PASSED",
      errors: [],
      heading: "",
      metrics: {},
      screenshot: ""
    };

    const initialConsoleCount = consoleErrors.length;
    const initialNetworkCount = networkErrors.length;

    try {
      await page.goto(`http://localhost:5173${p.path}`, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(2000);

      // Check if redirected to login
      if (page.url().includes('/login')) {
        pageTest.status = "FAILED";
        pageTest.errors.push("Session redirected to /login unexpectedly");
      }

      // Check for Crash / Error Boundary
      const crashEl = await page.$('h1:has-text("Something went wrong"), h2:has-text("Route not found"), div:has-text("Route not found"), div:has-text("ReferenceError")');
      if (crashEl) {
        const text = await crashEl.innerText();
        console.error(`  [CRASH DETECTED] on ${p.name}: ${text}`);
        pageTest.status = "FAILED";
        pageTest.errors.push(`Page rendered crash/error boundary: ${text}`);
      }

      // Check page title / header
      const heading = await page.$('h1, h2, .font-bold.text-2xl, .font-extrabold, .text-xl.font-bold');
      const headingText = heading ? (await heading.innerText()).trim() : "No heading";
      pageTest.heading = headingText;
      console.log(`  Page Heading: "${headingText}"`);

      // Count interactive elements
      const buttons = await page.$$('button:visible');
      const inputs = await page.$$('input:visible, select:visible, textarea:visible');
      const tables = await page.$$('table, [role="grid"], .card, .grid > div');
      pageTest.metrics = {
        buttons: buttons.length,
        inputs: inputs.length,
        tablesOrCards: tables.length
      };
      console.log(`  Elements: ${buttons.length} buttons, ${inputs.length} inputs, ${tables.length} tables/cards.`);

      // Check console and network errors
      const newConsoleErrors = consoleErrors.slice(initialConsoleCount);
      const newNetworkErrors = networkErrors.slice(initialNetworkCount);

      const fatalConsole = newConsoleErrors.filter(e => 
        e.text.includes('ReferenceError') || 
        e.text.includes('TypeError') || 
        e.text.includes('SyntaxError') ||
        e.text.includes('Uncaught')
      );

      const fatalNetwork = newNetworkErrors.filter(e => 
        e.status === 404 || e.status === 500 || e.status === 502
      );

      if (fatalConsole.length > 0) {
        pageTest.status = "FAILED";
        pageTest.errors.push(...fatalConsole.map(e => `Fatal Console Error: ${e.text}`));
        console.warn(`  Fatal Console Errors (${fatalConsole.length}):`, fatalConsole.map(e => e.text).slice(0, 2));
      }

      if (fatalNetwork.length > 0) {
        const criticalNetwork = fatalNetwork.filter(e => !e.url.includes('favicon') && !e.url.includes('.map'));
        if (criticalNetwork.length > 0) {
          pageTest.status = "FAILED";
          pageTest.errors.push(...criticalNetwork.map(e => `HTTP ${e.status}: ${e.url}`));
          console.warn(`  Critical Network Errors (${criticalNetwork.length}):`, criticalNetwork.map(e => `${e.status} ${e.url}`).slice(0, 2));
        }
      }

      // Take screenshot
      const slug = p.path.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '');
      const screenshotFileName = `${slug || 'root'}.png`;
      const screenshotFilePath = path.join(screenshotsDir, screenshotFileName);
      await page.screenshot({ path: screenshotFilePath, fullPage: false });
      pageTest.screenshot = `tests/screenshots/finance/${screenshotFileName}`;

    } catch (err) {
      console.error(`  [EXCEPTION] on ${p.name}:`, err.message);
      pageTest.status = "FAILED";
      pageTest.errors.push(err.message);
    }

    if (pageTest.status === "PASSED") {
      results.summary.passed++;
      console.log(`  --> RESULT: PASSED`);
    } else {
      results.summary.failed++;
      console.log(`  --> RESULT: FAILED (${pageTest.errors.length} errors)`);
    }

    results.pages.push(pageTest);
  }

  await browser.close();

  fs.writeFileSync('tests/qa_finance_results.json', JSON.stringify(results, null, 2));
  console.log('\n=======================================');
  console.log(`=== MODULE 2 (FINANCE) QA COMPLETED: ${results.summary.passed}/${results.summary.total} PASSED ===`);
  console.log('=======================================');
}

runFinanceQA().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
