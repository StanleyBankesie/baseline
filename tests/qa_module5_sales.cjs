const { chromium } = require('playwright');
const fs = require('fs');

const salesPages = [
  { name: "Sales Home / Operations Dashboard", path: "/sales" },
  { name: "Sales Analytics Dashboard", path: "/sales/dashboard" },
  { name: "Customers Directory List", path: "/sales/customers" },
  { name: "Customer Master Form (New)", path: "/sales/customers/new" },
  { name: "Potential Customers List", path: "/sales/potential-customers" },
  { name: "Potential Customer Form (New)", path: "/sales/potential-customers/new" },
  { name: "Sales Quotations List", path: "/sales/quotations" },
  { name: "Sales Quotation Form (New)", path: "/sales/quotations/new" },
  { name: "Sales Orders List", path: "/sales/sales-orders" },
  { name: "Sales Order Form (New)", path: "/sales/sales-orders/new" },
  { name: "Delivery Notes List", path: "/sales/delivery" },
  { name: "Delivery Note Form (New)", path: "/sales/delivery/new" },
  { name: "Sales Invoices List", path: "/sales/invoices" },
  { name: "Sales Invoice Form (New)", path: "/sales/invoices/new" },
  { name: "Sales Returns List", path: "/sales/returns" },
  { name: "Sales Return Form (New)", path: "/sales/returns/new" },
  { name: "Customer Credit List", path: "/sales/customer-credit" },
  { name: "Customer Credit Form (New)", path: "/sales/customer-credit/new" },
  { name: "Discount Schemes List", path: "/sales/discount-schemes" },
  { name: "Discount Scheme Campaign Form", path: "/sales/discount-schemes/new" },
  { name: "Discount Schemes Campaign Hub", path: "/sales/discount-schemes/campaigns" },
  { name: "Purchase Reward Campaigns List", path: "/sales/discount-schemes/rewards" },
  { name: "Purchase Reward Campaign Form (New)", path: "/sales/discount-schemes/rewards/new" },
  { name: "Item Price Setup Hub", path: "/sales/price-setup" },
  { name: "Bulk Customer Upload Tool", path: "/sales/bulk-upload" },
  { name: "Sales Data Upload Tool", path: "/sales/sales-upload" },
  { name: "Sales Module Setup Hub", path: "/sales/setup" },
  { name: "Quotation Summary Report", path: "/sales/reports/quotation-summary" },
  { name: "Quotation Conversion Report", path: "/sales/reports/quotation-conversion" },
  { name: "Sales Order Status Report", path: "/sales/reports/sales-order-status" },
  { name: "Delivery Register Report", path: "/sales/reports/delivery-register" },
  { name: "Invoice Summary Report", path: "/sales/reports/invoice-summary" },
  { name: "Customer History Report", path: "/sales/reports/customer-history" },
  { name: "Sales Register Report", path: "/sales/reports/sales-register" },
  { name: "Monthly Sales Trend Report", path: "/sales/reports/monthly-sales-trend" },
  { name: "Revenue By Customer Report", path: "/sales/reports/revenue-by-customer" },
  { name: "Revenue By Product Report", path: "/sales/reports/revenue-by-product" },
  { name: "Customer List Report", path: "/sales/reports/customer-list" },
  { name: "Debtors Balance Report", path: "/sales/reports/debtors-balance" },
  { name: "Accounts Receivable Aging Report", path: "/sales/reports/receivables-aging" },
  { name: "Cancelled Orders Report", path: "/sales/reports/cancelled-orders" },
  { name: "Sales Return Report", path: "/sales/reports/sales-return" },
  { name: "Discount Utilization Report", path: "/sales/reports/discount-utilization" },
  { name: "Price List Report", path: "/sales/reports/price-list" },
  { name: "Customer Order History Report", path: "/sales/reports/customer-order-history" },
  { name: "Prospective Customer List Report", path: "/sales/reports/prospective-customers" },
  { name: "Sales Tracking Report", path: "/sales/reports/sales-tracking" },
  { name: "Sales Profitability Report", path: "/sales/reports/profitability" },
  { name: "Sales Reports Center Hub", path: "/sales/reports" }
];

async function runQA() {
  console.log("=================================================");
  console.log("Starting QA Test for Module 5: Sales & Distribution");
  console.log(`Total Pages to Test: ${salesPages.length}`);
  console.log("=================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = [];

  try {
    // Step 1: Login
    console.log("Logging into OmniSuite...");
    await page.goto("http://localhost:5173/login", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    const emailInput = page.locator('input[type="text"], input[type="email"], input[name="username"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    await emailInput.fill("admin");
    await passwordInput.fill("admin123");
    await submitBtn.click();
    await page.waitForTimeout(3000);

    console.log("Login successful! Current URL:", page.url());

    // Step 2: Iterate and test every Sales page
    for (let i = 0; i < salesPages.length; i++) {
      const p = salesPages[i];
      console.log(`\n[${i + 1}/${salesPages.length}] Testing: ${p.name} (${p.path})`);

      const consoleErrors = [];
      const networkErrors = [];

      const onConsole = (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      };

      const onResponse = (res) => {
        if (res.status() >= 400 && !res.url().includes("chat/unread-count")) {
          networkErrors.push(`${res.status()} ${res.url()}`);
        }
      };

      page.on("console", onConsole);
      page.on("response", onResponse);

      const startTime = Date.now();
      let status = "PASSED";
      let errorDetails = "";

      try {
        await page.goto(`http://localhost:5173${p.path}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);

        // Check for 404 / route crashes / blank pages
        const bodyText = await page.textContent("body");
        if (bodyText.includes("404") && bodyText.includes("Page Not Found")) {
          status = "FAILED";
          errorDetails = "Route 404 - Page Not Found";
        } else if (consoleErrors.some(e => e.includes("Uncaught") || e.includes("TypeError") || e.includes("ReferenceError"))) {
          status = "FAILED";
          errorDetails = consoleErrors.filter(e => e.includes("Uncaught") || e.includes("TypeError") || e.includes("ReferenceError")).join("; ");
        }

        // Functional check: check interactive elements count
        const buttonsCount = await page.locator("button, a.btn, a.btn-primary, a.btn-secondary, a.btn-success").count();
        const inputsCount = await page.locator("input, select, textarea").count();
        const cardsCount = await page.locator(".card, [data-carousel-card]").count();

        // Capture screenshot
        const screenshotName = `sales_${p.path.replace(/\//g, "_").replace(/^_/, "")}.png`;
        const screenshotDir = "tests/screenshots/module5_sales";
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
        const screenshotPath = `${screenshotDir}/${screenshotName}`;
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const duration = Date.now() - startTime;

        results.push({
          index: i + 1,
          name: p.name,
          path: p.path,
          status,
          durationMs: duration,
          buttonsCount,
          inputsCount,
          cardsCount,
          consoleErrors: consoleErrors.slice(0, 3),
          networkErrors: networkErrors.slice(0, 3),
          errorDetails,
          screenshotPath
        });

        console.log(`  -> Status: ${status} (${duration}ms) | Buttons: ${buttonsCount}, Inputs: ${inputsCount}, Cards: ${cardsCount}`);
        if (errorDetails) {
          console.log(`  -> Error: ${errorDetails}`);
        }
      } catch (err) {
        status = "FAILED";
        errorDetails = err.message;
        results.push({
          index: i + 1,
          name: p.name,
          path: p.path,
          status: "FAILED",
          durationMs: Date.now() - startTime,
          errorDetails: err.message
        });
        console.log(`  -> FAILED with exception: ${err.message}`);
      } finally {
        page.off("console", onConsole);
        page.off("response", onResponse);
      }
    }

    fs.writeFileSync("tests/qa_sales_results.json", JSON.stringify(results, null, 2), "utf8");
    console.log("\n=================================================");
    console.log("QA Test for Module 5: Sales Completed!");
    const passed = results.filter(r => r.status === "PASSED").length;
    const failed = results.filter(r => r.status === "FAILED").length;
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log("Results saved to tests/qa_sales_results.json");
    console.log("=================================================");

  } catch (globalErr) {
    console.error("Global QA error:", globalErr);
  } finally {
    await browser.close();
  }
}

runQA();
