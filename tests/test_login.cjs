const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('Navigating to http://localhost:5173/login ...');
  await page.goto('http://localhost:5173/login');
  
  await page.waitForSelector('#username', { timeout: 10000 });
  console.log('Username selector ready.');

  await page.fill('#username', 'admin');
  
  // Find password input
  const pwInput = await page.$('input[type="password"]');
  if (pwInput) {
    await pwInput.fill('admin123');
  } else {
    console.log('Password input not found!');
  }

  // Click submit
  await page.click('button[type="submit"]');
  console.log('Submitted login form. Waiting for navigation or response...');
  
  await page.waitForTimeout(4000);
  console.log('URL after login:', page.url());

  // Check if error message appeared on page
  const errorMsg = await page.$eval('.border-status-error, .text-status-error', el => el.textContent).catch(() => null);
  if (errorMsg) {
    console.log('Login error message shown:', errorMsg);
  }

  // Check heading or content
  const heading = await page.$eval('h1', el => el.textContent).catch(() => 'No H1');
  console.log('Page heading:', heading);

  await browser.close();
})();
