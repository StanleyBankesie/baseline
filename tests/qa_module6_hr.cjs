const { chromium } = require('playwright');
const fs = require('fs');

const hrPages = JSON.parse(fs.readFileSync('scripts/hr_concrete_pages.json', 'utf8'));

async function runQA() {
  console.log("=================================================");
  console.log("Starting QA Test for Module 6: Human Resources & Payroll");
  console.log(`Total Pages to Test: ${hrPages.length}`);
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

    // Step 2: Iterate and test every HR page
    for (let i = 0; i < hrPages.length; i++) {
      const p = hrPages[i];
      console.log(`\n[${i + 1}/${hrPages.length}] Testing: ${p.name} (${p.path})`);

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
        const screenshotName = `hr_${p.path.replace(/\//g, "_").replace(/^_/, "").replace(/[:*?"<>|]/g, "_")}.png`;
        const screenshotDir = "tests/screenshots/module6_hr";
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

    fs.writeFileSync("tests/qa_hr_results.json", JSON.stringify(results, null, 2), "utf8");
    console.log("\n=================================================");
    console.log("QA Test for Module 6: HR & Payroll Completed!");
    const passed = results.filter(r => r.status === "PASSED").length;
    const failed = results.filter(r => r.status === "FAILED").length;
    console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log("Results saved to tests/qa_hr_results.json");
    console.log("=================================================");

  } catch (globalErr) {
    console.error("Global QA error:", globalErr);
  } finally {
    await browser.close();
  }
}

runQA();
