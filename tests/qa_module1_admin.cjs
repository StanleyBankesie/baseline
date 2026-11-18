const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runAdminQA() {
  const screenshotsDir = path.join(__dirname, 'screenshots', 'admin');
  fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = {
    module: "Administration",
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

  const adminPagesToTest = [
    { name: "Administration Home", path: "/administration" },
    { name: "Role Setup (Direct /admin/roles)", path: "/admin/roles" },
    { name: "Role Management (/administration/access/roles)", path: "/administration/access/roles" },
    { name: "Role Setup New (/administration/access/roles/new)", path: "/administration/access/roles/new" },
    { name: "User Accounts (/administration/users)", path: "/administration/users" },
    { name: "User Creation Form (/administration/users/new)", path: "/administration/users/new" },
    { name: "Branch Management (/administration/branches)", path: "/administration/branches" },
    { name: "Branch Creation Form (/administration/branches/new)", path: "/administration/branches/new" },
    { name: "User Permissions Matrix (/administration/access/user-permissions)", path: "/administration/access/user-permissions" },
    { name: "Exceptional Permissions (/administration/access/user-overrides)", path: "/administration/access/user-overrides" },
    { name: "Exceptional Permissions List (/administration/exceptional-permissions)", path: "/administration/exceptional-permissions" },
    { name: "Workflow Configurations (/administration/workflows)", path: "/administration/workflows" },
    { name: "Workflow Creation Form (/administration/workflows/new)", path: "/administration/workflows/new" },
    { name: "Workflow Approvals (/administration/workflows/approvals)", path: "/administration/workflows/approvals" },
    { name: "Approved Documents (/administration/workflows/approved)", path: "/administration/workflows/approved" },
    { name: "Sent Documents (/administration/workflows/sent)", path: "/administration/workflows/sent" },
    { name: "System Log Book Report (/administration/reports/system-log-book)", path: "/administration/reports/system-log-book" },
    { name: "User Activity & Audit Report (/administration/reports/user-login-activity)", path: "/administration/reports/user-login-activity" },
    { name: "User Activity Alias (/administration/reports/user-activity)", path: "/administration/reports/user-activity" },
    { name: "Diagnostics Page (/administration/diagnostics)", path: "/administration/diagnostics" },
    { name: "Settings Page (/administration/settings)", path: "/administration/settings" },
    { name: "Document Templates (/administration/settings/templates)", path: "/administration/settings/templates" }
  ];

  results.summary.total = adminPagesToTest.length;

  for (const p of adminPagesToTest) {
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

      // Check URL (ensure we didn't get bounced to /login)
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
      const heading = await page.$('h1, h2, .font-bold.text-2xl, .font-extrabold');
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
        // Exclude optional favicon or telemetry if any
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
      pageTest.screenshot = `tests/screenshots/admin/${screenshotFileName}`;

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

  fs.writeFileSync('tests/qa_admin_results.json', JSON.stringify(results, null, 2));
  console.log('\n=======================================');
  console.log(`=== MODULE 1 QA TEST COMPLETED: ${results.summary.passed}/${results.summary.total} PASSED ===`);
  console.log('=======================================');
}

runAdminQA().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
