const { chromium } = require('playwright');

async function testFixedPages() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.fill('input[type="text"], input[name*="user" i], input[placeholder*="user" i]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
  await page.waitForTimeout(3000);

  const urls = [
    '/maintenance/assets',
    '/maintenance/job-orders',
    '/maintenance/rfq',
    '/maintenance/rfqs',
  ];

  for (const u of urls) {
    const errors = [];
    const onConsole = msg => { if (msg.type() === 'error') errors.push(msg.text()); };
    page.on('console', onConsole);
    
    await page.goto(`http://localhost:5173${u}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const bodyText = await page.evaluate(() => document.body.innerText || '');
    const crashed = bodyText.includes('Something went wrong') || bodyText.includes('ReferenceError');
    console.log(`Page ${u} -> Crashed: ${crashed}, Errors: ${errors.length}`);
    page.off('console', onConsole);
  }

  await browser.close();
}

testFixedPages().catch(console.error);
