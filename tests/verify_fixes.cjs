const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function verify() {
  const screenshotDir = path.resolve('tests/screenshots/verification');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.locator('#username').fill('admin');
  await page.locator('#password').fill('admin');
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/login')),
    page.locator('button[type=submit]').click()
  ]);
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 10000 });
  await page.waitForTimeout(2500);

  console.log('2. Verifying Homepage...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, 'homepage_fixed.png'), fullPage: false });
  console.log('Saved: tests/screenshots/verification/homepage_fixed.png');

  console.log('3. Verifying Purchase Module Home...');
  await page.goto('http://localhost:5173/purchase', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, 'purchase_home_fixed.png'), fullPage: false });
  console.log('Saved: tests/screenshots/verification/purchase_home_fixed.png');

  console.log('4. Verifying RFQ List Page (Cards below header)...');
  await page.goto('http://localhost:5173/purchase/rfqs', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, 'rfq_list_fixed.png'), fullPage: false });
  console.log('Saved: tests/screenshots/verification/rfq_list_fixed.png');

  console.log('5. Verifying Stock Adjustments List Page...');
  await page.goto('http://localhost:5173/inventory/stock-adjustments', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(screenshotDir, 'stock_adjustments.png'), fullPage: false });
  console.log('Saved: tests/screenshots/verification/stock_adjustments.png');

  await browser.close();
  console.log('Verification screenshots captured successfully!');
}

verify().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
