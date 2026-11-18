const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testScreenshots() {
  const dir = path.resolve('tests/screenshots/circular_cards_verification');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.fill('input[type="text"], input[name*="user" i]', 'admin');
  const pw = await page.$('input[type="password"]');
  if (pw) await pw.fill('admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  const pagesToTest = [
    { name: 'stock_adjustments.png', url: 'http://localhost:5173/inventory/stock-adjustments' },
    { name: 'facilities_inspections.png', url: 'http://localhost:5173/facilities/inspections' },
    { name: 'stock_balances.png', url: 'http://localhost:5173/inventory/stock-balances' },
    { name: 'project_portfolio.png', url: 'http://localhost:5173/project-management/projects' },
  ];

  for (const p of pagesToTest) {
    console.log(`Capturing ${p.name}...`);
    await page.goto(p.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(dir, p.name) });
    console.log(`Saved screenshot: ${p.name}`);
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

testScreenshots().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
