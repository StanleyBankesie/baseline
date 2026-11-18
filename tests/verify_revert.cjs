const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testScreenshots() {
  const dir = path.resolve('tests/screenshots/revert_verification');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill('admin');
  await page.locator('#password').fill('admin');
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/login')),
    page.locator('button[type=submit]').click()
  ]);
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
  await page.waitForTimeout(2000);

  console.log('Capturing Stock Updation...');
  await page.goto('http://localhost:5173/inventory/stock-updation', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(dir, 'stock_updation_fixed.png') });

  console.log('Capturing Stock Adjustments...');
  await page.goto('http://localhost:5173/inventory/stock-adjustments', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(dir, 'stock_adjustments.png') });

  console.log('Capturing Stock Balances...');
  await page.goto('http://localhost:5173/inventory/stock-balances', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(dir, 'stock_balances_fixed.png') });

  await browser.close();
  console.log('Done capturing screenshots!');
}

testScreenshots().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
