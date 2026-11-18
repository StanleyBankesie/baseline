const { chromium } = require('playwright');

async function testSinglePage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.fill('input[type="text"], input[name*="user" i], input[placeholder*="user" i]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
  await page.waitForTimeout(3000);

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  console.log('Testing /production/execution/qc/new ...');
  await page.goto('http://localhost:5173/production/execution/qc/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Console errors:', errors);
  const bodyText = await page.evaluate(() => document.body.innerText || '');
  console.log('Crash detected:', bodyText.includes('Something went wrong') || bodyText.includes('ReferenceError'));
  
  await browser.close();
}

testSinglePage().catch(console.error);
