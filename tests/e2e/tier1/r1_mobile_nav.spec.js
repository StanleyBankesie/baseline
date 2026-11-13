import assert from 'assert';
import { VIEWPORTS, TARGET_FILES } from '../config.js';
import { renderHtml } from '../harness/browser.js';
import { getComputed, getBoundingBox } from '../harness/dom_inspector.js';
import { checkFileContains, checkFileExcludes } from '../harness/ast_checker.js';
import { generateNavBannerHtml } from '../fixtures/template_factory.js';

export async function run(reporter) {
  reporter.printTierHeader('TIER 1: FEATURE COVERAGE - R1 (Mobile Navigation Banner)');

  // E2E-R1-T1-01: Standard Mobile Viewport Hiding
  await reporter.runTest({
    tier: 1,
    req: 'R1',
    id: 'E2E-R1-T1-01',
    name: 'ModuleTopNavBar hidden on standard mobile viewport (375x667)'
  }, async () => {
    const page = await renderHtml(generateNavBannerHtml(), VIEWPORTS.mobile_se);
    const style = await getComputed(page, '#module-top-nav-bar', ['display']);
    const box = await getBoundingBox(page, '#module-top-nav-bar');
    assert.strictEqual(style.display, 'none', 'Banner display must be none on mobile 375px');
    assert.strictEqual(box.height, 0, 'Banner height must be 0 on mobile 375px');
  });

  // E2E-R1-T1-02: Standard Desktop Viewport Visibility
  await reporter.runTest({
    tier: 1,
    req: 'R1',
    id: 'E2E-R1-T1-02',
    name: 'ModuleTopNavBar visible on standard desktop viewport (1280x800)'
  }, async () => {
    const page = await renderHtml(generateNavBannerHtml(), VIEWPORTS.desktop);
    const style = await getComputed(page, '#module-top-nav-bar', ['display']);
    const box = await getBoundingBox(page, '#module-top-nav-bar');
    assert.strictEqual(style.display, 'block', 'Banner display must be block on desktop 1280px');
    assert.ok(box.height >= 36, `Banner height should be >= 36px, got ${box.height}`);
    const homeVisible = await page.evaluate(() => {
      const home = document.querySelector('#nav-home');
      return home && home.offsetHeight > 0;
    });
    assert.ok(homeVisible, 'Home navigation button must be visible');
  });

  // E2E-R1-T1-03: Large Desktop / Full HD Layout
  await reporter.runTest({
    tier: 1,
    req: 'R1',
    id: 'E2E-R1-T1-03',
    name: 'ModuleTopNavBar layout and sticky wrapper intact on Full HD (1920x1080)'
  }, async () => {
    const page = await renderHtml(generateNavBannerHtml(), VIEWPORTS.desktop_fhd);
    const style = await getComputed(page, '#module-dashboard-sticky-wrapper', ['position', 'top', 'z-index']);
    assert.strictEqual(style.position, 'sticky', 'Wrapper should be sticky');
    assert.strictEqual(style.top, '0px', 'Sticky top should be 0px');
    assert.strictEqual(style['z-index'], '40', 'Z-index should be 40');
  });

  // E2E-R1-T1-04: Small Tablet Landscape Visibility
  await reporter.runTest({
    tier: 1,
    req: 'R1',
    id: 'E2E-R1-T1-04',
    name: 'ModuleTopNavBar visible on iPad Landscape (1024x768)'
  }, async () => {
    const page = await renderHtml(generateNavBannerHtml(), VIEWPORTS.tablet_landscape);
    const style = await getComputed(page, '#module-top-nav-bar', ['display']);
    const box = await getBoundingBox(page, '#module-top-nav-bar');
    assert.strictEqual(style.display, 'block', 'Banner display must be block on tablet landscape');
    assert.ok(box.height > 0, 'Banner height must be > 0');
  });

  // E2E-R1-T1-05: ModuleDashboard Sticky Wrapper Coordination
  await reporter.runTest({
    tier: 1,
    req: 'R1',
    id: 'E2E-R1-T1-05',
    name: 'ModuleDashboard sticky wrapper hides on mobile (375px) and shows on desktop'
  }, async () => {
    const page = await renderHtml(generateNavBannerHtml({ wrapperSticky: true }), VIEWPORTS.mobile_se);
    const mobileStyle = await getComputed(page, '#module-dashboard-sticky-wrapper', ['display']);
    assert.strictEqual(mobileStyle.display, 'none', 'Sticky wrapper must be hidden on mobile');

    await page.setViewport(VIEWPORTS.desktop);
    const desktopStyle = await getComputed(page, '#module-dashboard-sticky-wrapper', ['display']);
    assert.strictEqual(desktopStyle.display, 'block', 'Sticky wrapper must be visible on desktop');
  });

  // E2E-R1-T1-06: Subpage Isolation Verification
  await reporter.runTest({
    tier: 1,
    req: 'R1',
    id: 'E2E-R1-T1-06',
    name: 'Subpages isolate navigation: ModuleTopNavBar is not independently cloned in list views'
  }, async () => {
    // AST verification that subpage components do not define duplicate ModuleTopNavBar tags
    const invoiceListHasNav = checkFileContains(TARGET_FILES.salesInvoices, /<ModuleTopNavBar/);
    const jvListHasNav = checkFileContains(TARGET_FILES.journalVouchers, /<ModuleTopNavBar/);
    assert.strictEqual(invoiceListHasNav, false, 'InvoiceList must not import/render redundant ModuleTopNavBar');
    assert.strictEqual(jvListHasNav, false, 'JournalVoucherList must not import/render redundant ModuleTopNavBar');
  });
}
