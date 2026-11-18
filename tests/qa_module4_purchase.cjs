const { chromium } = require('playwright');
const fs = require('fs');

const purchasePages = [
  { name: "Purchase Home / Operations Dashboard", path: "/purchase" },
  { name: "Purchase Analytics Dashboard", path: "/purchase/dashboard" },
  { name: "Direct Purchase List", path: "/purchase/direct-purchase" },
  { name: "Direct Purchase Create Form", path: "/purchase/direct-purchase/new" },
  { name: "General Requisitions List", path: "/purchase/general-requisitions" },
  { name: "General Requisition Create Form", path: "/purchase/general-requisitions/new" },
  { name: "Request For Quotation (RFQ) List", path: "/purchase/rfqs" },
  { name: "Request For Quotation Form", path: "/purchase/rfqs/new" },
  { name: "Supplier Quotations List", path: "/purchase/supplier-quotations" },
  { name: "Supplier Quotation Form", path: "/purchase/supplier-quotations/new" },
  { name: "Quotation Analysis Evaluation", path: "/purchase/quotation-analysis" },
  { name: "Purchase Orders Local List", path: "/purchase/purchase-orders-local" },
  { name: "Purchase Orders Local Form", path: "/purchase/purchase-orders-local/new" },
  { name: "Purchase Orders Import List", path: "/purchase/purchase-orders-import" },
  { name: "Purchase Orders Import Form", path: "/purchase/purchase-orders-import/new" },
  { name: "Shipping Advice List", path: "/purchase/shipping-advice" },
  { name: "Shipping Advice Form", path: "/purchase/shipping-advice/new" },
  { name: "Port Clearances List", path: "/purchase/port-clearances" },
  { name: "Port Clearances Form", path: "/purchase/port-clearances/new" },
  { name: "Purchase Bills Local List", path: "/purchase/purchase-bills-local" },
  { name: "Purchase Bills Local Form", path: "/purchase/purchase-bills-local/new" },
  { name: "Purchase Bills Import List", path: "/purchase/purchase-bills-import" },
  { name: "Purchase Bills Import Form", path: "/purchase/purchase-bills-import/new" },
  { name: "Purchase Upload Tool", path: "/purchase/purchase-upload" },
  { name: "Purchase Returns List", path: "/purchase/purchase-returns" },
  { name: "Purchase Returns Form", path: "/purchase/purchase-returns/new" },
  { name: "Suppliers Directory List", path: "/purchase/suppliers" },
  { name: "Supplier Master Form", path: "/purchase/suppliers/new" },
  { name: "Purchase Module Setup Hub", path: "/purchase/setup" },
  { name: "Service Bills List", path: "/purchase/service-bills" },
  { name: "Service Bill Form", path: "/purchase/service-bills/new" },
  { name: "Service Requests List", path: "/purchase/service-requests" },
  { name: "Service Request Form", path: "/purchase/service-requests/new" },
  { name: "Service Confirmations List", path: "/purchase/service-confirmations" },
  { name: "Service Confirmation Form", path: "/purchase/service-confirmations/new" },
  { name: "Import Order Tracking Report", path: "/purchase/reports/import-order-tracking" },
  { name: "Local Order Tracking Report", path: "/purchase/reports/local-order-tracking" },
  { name: "Purchase Tracking Report", path: "/purchase/reports/purchase-tracking" },
  { name: "Supplier Quotation Analysis Report", path: "/purchase/reports/supplier-quotation-analysis" },
  { name: "Pending GRN to Bill (Local) Report", path: "/purchase/reports/pending-grn-to-bill-local" },
  { name: "Pending GRN to Bill (Import) Report", path: "/purchase/reports/pending-grn-to-bill-import" },
  { name: "Import Order List Report", path: "/purchase/reports/import-order-list" },
  { name: "Pending Shipment Details Report", path: "/purchase/reports/pending-shipments" },
  { name: "Purchase Register Report", path: "/purchase/reports/purchase-register" },
  { name: "Department Purchase Analysis Report", path: "/purchase/reports/department-analysis" },
  { name: "Import Cost Breakdown Report", path: "/purchase/reports/import-cost-breakdown" },
  { name: "Lead Time Analysis Report", path: "/purchase/reports/lead-time-analysis" },
  { name: "Cancelled Purchase Orders Report", path: "/purchase/reports/cancelled-pos" },
  { name: "Purchase Returns Analysis Report", path: "/purchase/reports/purchase-returns-analysis" },
  { name: "Item Purchase History Report", path: "/purchase/reports/item-purchase-history" },
  { name: "Price Variance Report", path: "/purchase/reports/price-variance" },
  { name: "Supplier Performance Report", path: "/purchase/reports/supplier-performance" },
  { name: "Supplier Outstanding Payables Report", path: "/purchase/reports/supplier-outstanding-payables" },
  { name: "Purchase Aging Report", path: "/purchase/reports/purchase-aging" }
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log("=== STARTING MODULE 4: PROCUREMENT & PURCHASE QA ===");
  console.log(`Total Pages to Test: ${purchasePages.length}`);

  // Step 1: Login
  await page.goto("http://localhost:5173/login", { waitUntil: "domcontentloaded" });
  await page.locator('#username').fill('admin');
  await page.locator('#password').fill('admin');
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/login')),
    page.locator('button[type=submit]').click()
  ]);
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
  await page.waitForTimeout(2000);

  const results = [];

  for (let i = 0; i < purchasePages.length; i++) {
    const p = purchasePages[i];
    const pageNum = i + 1;
    console.log(`\n[${pageNum}/${purchasePages.length}] Testing: ${p.name} (${p.path})`);

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

      // Check if page crashed
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
      const safeFilename = p.path.replace(/\//g, "_").replace(/^_/, "").replace(/:/g, "") || "purchase_home";
      const screenshotPath = `tests/screenshots/purchase/${safeFilename}.png`;
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

  fs.writeFileSync('tests/qa_purchase_results.json', JSON.stringify(results, null, 2), 'utf8');

  const passedCount = results.filter(r => r.status === "PASSED").length;
  const failedCount = results.filter(r => r.status === "FAILED").length;

  console.log("\n==========================================");
  console.log(`MODULE 4 QA SUMMARY:`);
  console.log(`Total Tested: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Pass Rate: ${((passedCount / results.length) * 100).toFixed(1)}%`);
  console.log("==========================================\n");
}

run().catch(console.error);
