const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/login');
  await page.fill('input#username, input[name=username], input[type=text]', 'admin');
  await page.fill('input#password, input[name=password], input[type=password]', 'admin');
  await page.click('button[type=submit]');
  await page.waitForTimeout(3000);

  console.log('--- Home Page ---');
  const homeCards = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-module-carousel] [data-carousel-card] > div'));
    return cards.map(c => ({
      text: c.innerText.slice(0, 30).replace(/\n/g, ' '),
      classes: c.className,
      boxShadow: window.getComputedStyle(c).boxShadow
    }));
  });
  console.log(JSON.stringify(homeCards, null, 2));

  console.log('--- Administration Page ---');
  await page.goto('http://localhost:5173/administration');
  await page.waitForTimeout(2000);
  const adminCards = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.shadow-smoky-card'));
    return cards.slice(0, 3).map(c => ({
      text: c.innerText.slice(0, 30).replace(/\n/g, ' '),
      classes: c.className,
      boxShadow: window.getComputedStyle(c).boxShadow
    }));
  });
  console.log(JSON.stringify(adminCards, null, 2));

  console.log('--- Stock Adjustments Page ---');
  await page.goto('http://localhost:5173/inventory/adjustments');
  await page.waitForTimeout(2000);
  const stockMetricCards = await page.evaluate(() => {
    // Find the 4 metric cards at the top
    const cards = Array.from(document.querySelectorAll('.card, .stat-card, [class*="rounded"]'));
    return cards.filter(c => c.innerText.includes('STOCK ADJUSTMENTS')).slice(0, 4).map(c => ({
      text: c.innerText.slice(0, 30).replace(/\n/g, ' '),
      classes: c.className,
      boxShadow: window.getComputedStyle(c).boxShadow
    }));
  });
  console.log(JSON.stringify(stockMetricCards, null, 2));

  await browser.close();
})();
