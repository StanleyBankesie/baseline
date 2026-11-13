import assert from 'assert';
import { VIEWPORTS } from '../config.js';
import { renderHtml } from '../harness/browser.js';
import { getComputed, getBoundingBox } from '../harness/dom_inspector.js';
import { generateNavBannerHtml } from '../fixtures/template_factory.js';

export async function run(reporter) {
  reporter.printTierHeader('TIER 2: BOUNDARIES & CORNER CASES - R1 (Mobile Navigation Banner)');

  // E2E-R1-T2-01: Exact Boundary: 767px Mobile Threshold
  await reporter.runTest({
    tier: 2,
    req: 'R1',
    id: 'E2E-R1-T2-01',
    name: 'Viewport 767px exact boundary hides ModuleTopNavBar (display: none)'
  }, async () => {
    const page = await renderHtml(generateNavBannerHtml(), VIEWPORTS.mobile_boundary);
    const style = await getComputed(page, '#module-top-nav-bar', ['display']);
    const box = await getBoundingBox(page, '#module-top-nav-bar');
    assert.strictEqual(style.display, 'none', 'Banner must be hidden at exactly 767px');
    assert.strictEqual(box.height, 0, 'Banner height must be 0 at exactly 767px');
  });

  // E2E-R1-T2-02: Exact Boundary: 768px Desktop Threshold
  await reporter.runTest({
    tier: 2,
    req: 'R1',
    id: 'E2E-R1-T2-02',
    name: 'Viewport 768px exact boundary shows ModuleTopNavBar (display: block)'
  }, async () => {
    const page = await renderHtml(generateNavBannerHtml(), VIEWPORTS.tablet_boundary);
    const style = await getComputed(page, '#module-top-nav-bar', ['display']);
    const box = await getBoundingBox(page, '#module-top-nav-bar');
    assert.strictEqual(style.display, 'block', 'Banner must be visible at exactly 768px');
    assert.ok(box.height > 0, 'Banner height must be > 0 at exactly 768px');
  });

  // E2E-R1-T2-03: Dynamic Orientation Change (Portrait ↔ Landscape)
  await reporter.runTest({
    tier: 2,
    req: 'R1',
    id: 'E2E-R1-T2-03',
    name: 'Dynamic orientation change (375x812 -> 812x375 -> 375x812) reflows visibility cleanly'
  }, async () => {
    const page = await renderHtml(generateNavBannerHtml(), { width: 375, height: 812 });
    let style = await getComputed(page, '#module-top-nav-bar', ['display']);
    assert.strictEqual(style.display, 'none', 'Portrait mobile hidden');

    await page.setViewport({ width: 812, height: 375 });
    style = await getComputed(page, '#module-top-nav-bar', ['display']);
    assert.strictEqual(style.display, 'block', 'Landscape mobile visible (812px >= 768px)');

    await page.setViewport({ width: 375, height: 812 });
    style = await getComputed(page, '#module-top-nav-bar', ['display']);
    assert.strictEqual(style.display, 'none', 'Return to portrait mobile hidden');
  });

  // E2E-R1-T2-04: Empty Sections & Actions Graceful Degradation
  await reporter.runTest({
    tier: 2,
    req: 'R1',
    id: 'E2E-R1-T2-04',
    name: 'Empty sections and actions render zero DOM nodes without placeholder artifacts'
  }, async () => {
    const page = await renderHtml(generateNavBannerHtml({ hasContent: false }), VIEWPORTS.desktop);
    const exists = await page.evaluate(() => document.querySelector('#module-top-nav-bar') !== null);
    assert.strictEqual(exists, false, 'No nav bar node rendered for empty sections');
  });

  // E2E-R1-T2-05: Mobile Scroll Touch Clearance & Zero Collision
  await reporter.runTest({
    tier: 2,
    req: 'R1',
    id: 'E2E-R1-T2-05',
    name: 'Mobile scroll clearance: 0px collision with sticky nav on mobile viewports'
  }, async () => {
    const page = await renderHtml(generateNavBannerHtml(), VIEWPORTS.mobile_se);
    await page.evaluate(() => window.scrollTo(0, 400));
    const hitElementId = await page.evaluate(() => {
      const el = document.elementFromPoint(100, 10);
      return el ? el.id || el.tagName : null;
    });
    assert.notStrictEqual(hitElementId, 'module-top-nav-bar', 'Sticky nav bar must not intercept clicks on mobile');
  });

  // E2E-R1-T2-06: Extreme Viewport Minimum (320px Stress Test)
  await reporter.runTest({
    tier: 2,
    req: 'R1',
    id: 'E2E-R1-T2-06',
    name: 'Extreme narrow viewport (320px iPhone 5) causes 0px horizontal document overflow'
  }, async () => {
    const page = await renderHtml(generateNavBannerHtml(), VIEWPORTS.mobile_stress);
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > 320;
    });
    assert.strictEqual(overflow, false, 'Document must not overflow horizontally at 320px');
  });
}
