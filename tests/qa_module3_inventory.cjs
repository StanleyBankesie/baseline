const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const inventoryPages = [
  { name: "Inventory Home / Operations Dashboard", path: "/inventory" },
  { name: "Inventory Analytics Dashboard", path: "/inventory/dashboard" },
  { name: "Stock Balances Page", path: "/inventory/stock" },
  { name: "Stock Balances (Alias)", path: "/inventory/stock-balances" },
  { name: "Stock Journal List", path: "/inventory/stock-journal" },
  { name: "Stock Journal Create Form", path: "/inventory/stock-journal/new" },
  { name: "Stock Operations (Ops)", path: "/inventory/stock-ops" },
  { name: "Material Requisitions List", path: "/inventory/material-requisitions" },
  { name: "Material Requisition Create Form", path: "/inventory/material-requisitions/new" },
  { name: "Stock Updation List", path: "/inventory/stock-updation" },
  { name: "Stock Updation Form", path: "/inventory/stock-updation/new" },
  { name: "Stock Verification List", path: "/inventory/stock-verification" },
  { name: "Stock Verification Form", path: "/inventory/stock-verification/new" },
  { name: "Return to Stores List", path: "/inventory/return-to-stores" },
  { name: "Return to Stores Create Form", path: "/inventory/return-to-stores/new" },
  { name: "Stock Adjustments List", path: "/inventory/stock-adjustments" },
  { name: "Stock Adjustment Create Form", path: "/inventory/stock-adjustments/new" },
  { name: "Issue to Requirement List", path: "/inventory/issue-to-requirement" },
  { name: "Issue to Requirement Create Form", path: "/inventory/issue-to-requirement/new" },
  { name: "Stock Transfers List", path: "/inventory/stock-transfers" },
  { name: "Stock Transfer Create Form", path: "/inventory/stock-transfers/new" },
  { name: "Transfer Acceptance List", path: "/inventory/transfer-acceptance" },
  { name: "Transfer Acceptance Form", path: "/inventory/transfer-acceptance/new" },
  { name: "Stock Reorder Planning", path: "/inventory/stock-reorder" },
  { name: "Stock Upload Page", path: "/inventory/stock-upload" },
  { name: "Daily Stock Take List", path: "/inventory/daily-stock-take" },
  { name: "Daily Stock Take Form", path: "/inventory/daily-stock-take/new" },
  { name: "Physical Stock Take List", path: "/inventory/physical-stock-take" },
  { name: "Physical Stock Take Form", path: "/inventory/physical-stock-take/new" },
  { name: "Stock Take Register List", path: "/inventory/stock-take" },
  { name: "Stock Take Form", path: "/inventory/stock-take/new" },
  { name: "GRN Local (Goods Receipt Note Local) List", path: "/inventory/grn-local" },
  { name: "GRN Local Create Form", path: "/inventory/grn-local/new" },
  { name: "GRN Import (Goods Receipt Note Import) List", path: "/inventory/grn-import" },
  { name: "GRN Import Create Form", path: "/inventory/grn-import/new" },
  { name: "Item Batches List", path: "/inventory/batches" },
  { name: "Items Catalog List", path: "/inventory/items" },
  { name: "Item Master Create Form", path: "/inventory/items/new" },
  { name: "Item Groups List", path: "/inventory/item-groups" },
  { name: "Item Group Create Form", path: "/inventory/item-groups/new" },
  { name: "Unit Conversions List", path: "/inventory/unit-conversions" },
  { name: "Warehouses Directory List", path: "/inventory/warehouses" },
  { name: "Warehouse Create Form", path: "/inventory/warehouses/new" },
  { name: "Inventory Reports Central Index", path: "/inventory/reports" },
  { name: "Inventory Health Monitor Report", path: "/inventory/reports/health-monitor" },
  { name: "Periodical Stock Summary Report", path: "/inventory/reports/periodical-stock-summary" },
  { name: "Periodical Stock Statement Report", path: "/inventory/reports/periodical-stock-statement" },
  { name: "Issue Register Report", path: "/inventory/reports/issue-register" },
  { name: "Stock Transfer Register Report", path: "/inventory/reports/stock-transfer-register" },
  { name: "Stock Balances Detailed Report", path: "/inventory/reports/stock-balances" },
  { name: "Stock Value Valuation Report", path: "/inventory/reports/stock-value" },
  { name: "Stock Adjustments Audit Report", path: "/inventory/reports/stock-adjustments" },
  { name: "Material Returns Report", path: "/inventory/reports/material-returns" },
  { name: "Stock Verification Variance Report", path: "/inventory/reports/stock-verification" },
  { name: "Stock Aging Analysis Report", path: "/inventory/reports/stock-aging-analysis" },
  { name: "Expired Items Report", path: "/inventory/reports/expired-items" },
  { name: "Slow Moving Items Report", path: "/inventory/reports/slow-moving" },
  { name: "Fast Moving Items Report", path: "/inventory/reports/fast-moving" },
  { name: "Non Moving Items Report", path: "/inventory/reports/non-moving" }
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log("=== STARTING MODULE 3: INVENTORY & WAREHOUSE QA ===");
  console.log(`Total Pages to Test: ${inventoryPages.length}`);

  // Step 1: Login
  await page.goto("http://localhost:5173/login", { waitUntil: "networkidle" });
  await page.fill('input#username, input[name=username], input[type=text]', 'admin');
  await page.fill('input#password, input[name=password], input[type=password]', 'admin');
  await page.click('button[type=submit]');
  await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const results = [];

  for (let i = 0; i < inventoryPages.length; i++) {
    const p = inventoryPages[i];
    const pageNum = i + 1;
    console.log(`\n[${pageNum}/${inventoryPages.length}] Testing: ${p.name} (${p.path})`);

    const consoleErrors = [];
    const pageErrors = [];
    const failedRequests = [];

    const onConsole = (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!text.includes("favicon") && !text.includes("status of 404") && !text.includes("ERR_CONNECTION_REFUSED")) {
          consoleErrors.push(text);
        }
      }
    };
    const onPageError = (err) => {
      pageErrors.push(err.message || String(err));
    };
    const onRequestFailed = (req) => {
      failedRequests.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText || "failed"}`);
    };

    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    page.on("requestfailed", onRequestFailed);

    const startTime = Date.now();
    let status = "PASSED";
    let errorDetails = "";

    try {
      await page.goto(`http://localhost:5173${p.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 10000
      });
      await page.waitForTimeout(1500);

      // Check if crashed
      const bodyText = await page.evaluate(() => document.body.innerText);
      const isCrashed = bodyText.includes("Something went wrong") ||
                        bodyText.includes("ReferenceError") ||
                        bodyText.includes("TypeError") ||
                        bodyText.includes("Cannot read properties");

      if (isCrashed || pageErrors.length > 0) {
        status = "FAILED";
        errorDetails = pageErrors.join("; ") || "Page render crash detected in DOM";
      }

      // Count interactive elements
      const elementsCount = await page.evaluate(() => {
        return {
          buttons: document.querySelectorAll("button, a.btn, a.btn-primary, a.btn-secondary").length,
          inputs: document.querySelectorAll("input, select, textarea").length,
          tables: document.querySelectorAll("table, [role=table]").length,
          cards: document.querySelectorAll(".card, .stat-card, .shadow-smoky-card").length,
        };
      });

      // Take screenshot
      const safeFilename = p.path.replace(/\//g, "_").replace(/^_/, "").replace(/:/g, "") || "inventory_home";
      const screenshotPath = `tests/screenshots/inventory/${safeFilename}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });

      const loadTimeMs = Date.now() - startTime;

      results.push({
        index: pageNum,
        name: p.name,
        path: p.path,
        status,
        loadTimeMs,
        elementsCount,
        consoleErrors: consoleErrors.slice(0, 5),
        pageErrors: pageErrors.slice(0, 5),
        screenshot: screenshotPath,
        errorDetails
      });

      console.log(` -> Status: ${status} | Load: ${loadTimeMs}ms | Buttons: ${elementsCount.buttons} | Inputs: ${elementsCount.inputs} | Cards: ${elementsCount.cards}`);
      if (status === "FAILED") {
        console.error(` -> FAILED Details: ${errorDetails}`);
      }

    } catch (err) {
      status = "FAILED";
      errorDetails = err.message || String(err);
      results.push({
        index: pageNum,
        name: p.name,
        path: p.path,
        status: "FAILED",
        loadTimeMs: Date.now() - startTime,
        errorDetails
      });
      console.error(` -> NAVIGATION ERROR: ${errorDetails}`);
    } finally {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
    }
  }

  await browser.close();

  fs.writeFileSync('tests/qa_inventory_results.json', JSON.stringify(results, null, 2), 'utf8');

  const passedCount = results.filter(r => r.status === "PASSED").length;
  const failedCount = results.filter(r => r.status === "FAILED").length;

  console.log("\n==========================================");
  console.log(`MODULE 3 QA SUMMARY:`);
  console.log(`Total Tested: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Pass Rate: ${((passedCount / results.length) * 100).toFixed(1)}%`);
  console.log("==========================================\n");
}

run().catch(console.error);
