const { chromium } = require('playwright');
const fs = require('fs');

async function verifyScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.fill('input[type="text"], input[name*="user" i], input[placeholder*="user" i]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
  await page.waitForTimeout(3000);

  fs.mkdirSync('tests/screenshots/card_verification', { recursive: true });

  const testPages = [
    { url: 'http://localhost:5173/inventory/stock-updation', file: 'stock_updation_cards.png' },
    { url: 'http://localhost:5173/inventory/stock-balances', file: 'stock_balances_cards.png' },
    { url: 'http://localhost:5173/sales/invoices', file: 'sales_invoices_cards.png' },
    { url: 'http://localhost:5173/purchase/rfqs', file: 'rfq_cards.png' },
    { url: 'http://localhost:5173/inventory/material-requisitions', file: 'material_requisitions_cards.png' },
  ];

  for (const p of testPages) {
    console.log(`Navigating to ${p.url}...`);
    await page.goto(p.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `tests/screenshots/card_verification/${p.file}`, fullPage: false });
    console.log(`Saved screenshot: tests/screenshots/card_verification/${p.file}`);
  }

  await browser.close();
  console.log('Verification completed successfully!');
}

verifyScreenshots().catch(console.error);
