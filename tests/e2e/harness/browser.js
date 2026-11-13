import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const puppeteer = require(path.resolve(__dirname, '../../../client/node_modules/puppeteer'));

let sharedBrowser = null;
let sharedPage = null;

export async function getBrowser() {
  if (!sharedBrowser) {
    sharedBrowser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote'
      ]
    });
  }
  return sharedBrowser;
}

export async function getSharedPage(viewport = { width: 1280, height: 800 }) {
  const browser = await getBrowser();
  if (!sharedPage || sharedPage.isClosed()) {
    sharedPage = await browser.newPage();
  }
  await sharedPage.setViewport(viewport);
  return sharedPage;
}

export async function createPage(viewport = { width: 1280, height: 800 }) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport(viewport);
  return page;
}

export async function renderHtml(htmlContent, viewport = { width: 1280, height: 800 }) {
  const page = await getSharedPage(viewport);
  await page.setContent(htmlContent);
  return page;
}

export async function closeBrowser() {
  if (sharedPage && !sharedPage.isClosed()) {
    try {
      await Promise.race([
        sharedPage.close(),
        new Promise(r => setTimeout(r, 500))
      ]);
    } catch {
      // ignore
    }
    sharedPage = null;
  }
  if (sharedBrowser) {
    try {
      await Promise.race([
        sharedBrowser.close(),
        new Promise(r => setTimeout(r, 500))
      ]);
    } catch {
      // ignore
    }
    sharedBrowser = null;
  }
}
