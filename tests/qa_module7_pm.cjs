const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const pages = JSON.parse(fs.readFileSync('scripts/pm_concrete_pages.json', 'utf8'));

// Filter out redundant '/project-management/'
const filteredPages = pages.filter((p, i) => !(p.path === '/project-management/' && i > 0));

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots', 'module7_pm');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runQATest() {
  console.log('=================================================');
  console.log('Starting QA Test for Module 7: Project Management');
  console.log(`Total Pages to Test: ${filteredPages.length}`);
  console.log('=================================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  console.log('Logging into OmniSuite...');
  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.fill('input[type="text"], input[name*="user" i], input[placeholder*="user" i]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    await page.waitForTimeout(3500);
    console.log(`Login successful! Current URL: ${page.url()}\n`);
  } catch (err) {
    console.error('Login failed:', err.message);
    await browser.close();
    process.exit(1);
  }

  const results = [];

  for (let i = 0; i < filteredPages.length; i++) {
    const p = filteredPages[i];
    const index = i + 1;
    console.log(`[${index}/${filteredPages.length}] Testing: ${p.name} (${p.path})`);

    const consoleErrors = [];
    const networkErrors = [];

    const onConsole = (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          !text.includes('Failed to load resource: the server responded with a status of 404') &&
          !text.includes('favicon') &&
          !text.includes('Service Worker')
        ) {
          consoleErrors.push(text);
        }
      }
    };

    const onResponse = (res) => {
      const status = res.status();
      const url = res.url();
      if (status >= 400 && !url.includes('favicon') && !url.includes('.png') && !url.includes('.jpg')) {
        networkErrors.push(`${status} on ${url}`);
      }
    };

    page.on('console', onConsole);
    page.on('response', onResponse);

    const startTime = Date.now();
    let status = 'PASSED';
    let errorDetails = '';

    try {
      await page.goto(`http://localhost:5173${p.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });

      await page.waitForTimeout(2200);

      const bodyText = await page.evaluate(() => document.body.innerText || '');
      if (
        bodyText.includes('Something went wrong') ||
        bodyText.includes('Cannot read properties of') ||
        bodyText.includes('is not a function') ||
        bodyText.includes('is not defined') ||
        bodyText.includes('Minified React error')
      ) {
        status = 'FAILED';
        errorDetails = 'React runtime crash detected in body content.';
      }

      if (consoleErrors.some(e => e.includes('Uncaught') || e.includes('ReferenceError') || e.includes('TypeError'))) {
        status = 'FAILED';
        errorDetails = consoleErrors.join(' | ');
      }

      const elements = await page.evaluate(() => {
        return {
          buttons: document.querySelectorAll('button, a.btn, a.btn-primary, a.btn-secondary, a.btn-success').length,
          inputs: document.querySelectorAll('input, select, textarea').length,
          cards: document.querySelectorAll('.card, .card-header').length,
        };
      });

      const safeName = p.path.replace(/\//g, '_').replace(/^_/, '');
      const screenshotFilename = `pm_${safeName || 'root'}.png`;
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotFilename);

      await page.screenshot({ path: screenshotPath, fullPage: false });

      const durationMs = Date.now() - startTime;

      console.log(`  -> Status: ${status} (${durationMs}ms) | Buttons: ${elements.buttons}, Inputs: ${elements.inputs}, Cards: ${elements.cards}`);
      if (status === 'FAILED') {
        console.log(`  -> FAILED Reason: ${errorDetails}`);
      }

      results.push({
        index,
        name: p.name,
        path: p.path,
        component: p.component,
        status,
        durationMs,
        buttonsCount: elements.buttons,
        inputsCount: elements.inputs,
        cardsCount: elements.cards,
        consoleErrors,
        networkErrors: networkErrors.slice(0, 5),
        errorDetails,
        screenshotPath: `tests/screenshots/module7_pm/${screenshotFilename}`,
      });
    } catch (e) {
      console.log(`  -> Status: FAILED (Navigation/Timeout: ${e.message})`);
      results.push({
        index,
        name: p.name,
        path: p.path,
        component: p.component,
        status: 'FAILED',
        durationMs: Date.now() - startTime,
        buttonsCount: 0,
        inputsCount: 0,
        cardsCount: 0,
        consoleErrors,
        networkErrors,
        errorDetails: e.message,
        screenshotPath: '',
      });
    } finally {
      page.off('console', onConsole);
      page.off('response', onResponse);
    }
  }

  await browser.close();

  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;

  console.log('\n=================================================');
  console.log(`QA Test for Module 7: Project Management Completed!`);
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('Results saved to tests/qa_pm_results.json');
  console.log('=================================================\n');

  fs.writeFileSync('tests/qa_pm_results.json', JSON.stringify(results, null, 2));
}

runQATest().catch(console.error);
