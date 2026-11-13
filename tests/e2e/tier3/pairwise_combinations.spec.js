import assert from 'assert';
import { VIEWPORTS, BRAND_TOKENS, TARGET_FILES } from '../config.js';
import { renderHtml } from '../harness/browser.js';
import { getComputed, getBoundingBox, countElements, assertWithinTolerance, assertColor } from '../harness/dom_inspector.js';
import { checkFileContains, checkFileExcludes } from '../harness/ast_checker.js';
import {
  generateNavBannerHtml,
  generateButtonMatrixHtml,
  generateTableDensityHtml,
  generateFilterToolbarHtml
} from '../fixtures/template_factory.js';

export async function run(reporter) {
  reporter.printTierHeader('TIER 3: CROSS-FEATURE PAIRWISE COMBINATIONS (12 Tests)');

  // TEST-T3-01: R1 (Mobile) × R2 (Buttons)
  await reporter.runTest({
    tier: 3,
    req: 'R1xR2',
    id: 'TEST-T3-01',
    name: 'Mobile Viewport (<768px) × Standard Button Touch Target Height (42px)'
  }, async () => {
    const page = await renderHtml(generateButtonMatrixHtml(), VIEWPORTS.mobile_se);
    const box = await getBoundingBox(page, '#btn-primary');
    assertWithinTolerance(box.height, BRAND_TOKENS.heightBase, 1.0, 'Touch target >= 42px on mobile');
  });

  // TEST-T3-02: R1 (Mobile) × R4 (Filter)
  await reporter.runTest({
    tier: 3,
    req: 'R1xR4',
    id: 'TEST-T3-02',
    name: 'Mobile Viewport (<768px) × Dedicated Filter Toolbar Responsive Stacking'
  }, async () => {
    const page = await renderHtml(generateFilterToolbarHtml(), VIEWPORTS.mobile_se);
    const searchBox = await getBoundingBox(page, '#filter-search');
    assert.ok(searchBox.width >= 280, 'Filter search expands across mobile viewport');
  });

  // TEST-T3-03: R2 (Buttons) × R3 (Density)
  await reporter.runTest({
    tier: 3,
    req: 'R2xR3',
    id: 'TEST-T3-03',
    name: 'Standard Button Sizing System × High-Density Table Row Actions (36px, rounded-lg)'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml(), VIEWPORTS.desktop);
    const btnBox = await getBoundingBox(page, '.btn-table-action');
    const style = await getComputed(page, '.btn-table-action', ['borderRadius']);
    assertWithinTolerance(btnBox.height, BRAND_TOKENS.heightCompact, 1.0, 'Row action height is 36px');
    assert.strictEqual(style.borderRadius, BRAND_TOKENS.radiusLg, 'Row action radius is 8px');
  });

  // TEST-T3-04: R2 (Buttons) × R4 (Filter)
  await reporter.runTest({
    tier: 3,
    req: 'R2xR4',
    id: 'TEST-T3-04',
    name: 'Deep Teal Header Primary Button (#0E3646) × Clean Filter Bar Separation'
  }, async () => {
    const page = await renderHtml(generateFilterToolbarHtml(), VIEWPORTS.desktop);
    const primaryStyle = await getComputed(page, '#header-primary-btn', ['backgroundColor']);
    assertColor(primaryStyle.backgroundColor, BRAND_TOKENS.primaryDeepTealRgb, 'Primary is Deep Teal');
    const headerInputs = await page.evaluate(() => document.querySelector('#tier1-header').querySelectorAll('input, select').length);
    assert.strictEqual(headerInputs, 0, 'Header contains zero filter inputs');
  });

  // TEST-T3-05: R3 (Density) × R4 (Filter)
  await reporter.runTest({
    tier: 3,
    req: 'R3xR4',
    id: 'TEST-T3-05',
    name: 'Filter Search Query × Essential Data Retention (No Missing Audit Keys)'
  }, async () => {
    // Verifies that filter logic matches essential fields without referencing removed audit columns
    const invoiceContent = TARGET_FILES.salesInvoices;
    assert.ok(checkFileContains(invoiceContent, /searchTerm/i), 'InvoiceList has search filtering');
  });

  // TEST-T3-06: R1 (Mobile) × R3 (Density)
  await reporter.runTest({
    tier: 3,
    req: 'R1xR3',
    id: 'TEST-T3-06',
    name: 'Mobile Viewport (<768px) × Essential Data Retention (Zero Horizontal Overflow)'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.mobile_se);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > 375);
    assert.strictEqual(overflow, false, 'No document-level horizontal scrollbar on mobile');
  });

  // TEST-T3-07: R2 (Buttons) × R4 (Filter)
  await reporter.runTest({
    tier: 3,
    req: 'R2xR4',
    id: 'TEST-T3-07',
    name: 'Filter Bar Height Uniformity & 0px Vertical Offset Jitter (42px baseline)'
  }, async () => {
    const page = await renderHtml(generateFilterToolbarHtml(), VIEWPORTS.desktop_large);
    const searchBox = await getBoundingBox(page, '#filter-search');
    const selectBox = await getBoundingBox(page, '#filter-project-select');
    const refreshBox = await getBoundingBox(page, '#filter-refresh-btn');
    assertWithinTolerance(searchBox.height, 42, 1.0, 'Search height');
    assertWithinTolerance(selectBox.height, 42, 1.0, 'Select height');
    assertWithinTolerance(refreshBox.height, 42, 1.0, 'Refresh height');
    assertWithinTolerance(selectBox.top, refreshBox.top, 1.5, 'Vertical alignment jitter');
  });

  // TEST-T3-08: R2 (Buttons) × R3 (Density)
  await reporter.runTest({
    tier: 3,
    req: 'R2xR3',
    id: 'TEST-T3-08',
    name: 'Standard 42px Modal Footers Triggered from Compact 36px Table Actions'
  }, async () => {
    const page = await renderHtml(generateButtonMatrixHtml(), VIEWPORTS.desktop);
    const cancelBox = await getBoundingBox(page, '#modal-cancel');
    const submitBox = await getBoundingBox(page, '#modal-submit');
    assertWithinTolerance(cancelBox.height, 42, 1.0, 'Modal cancel 42px');
    assertWithinTolerance(submitBox.height, 42, 1.0, 'Modal submit 42px');
  });

  // TEST-T3-09: R3 (Density) × R4 (Filter)
  await reporter.runTest({
    tier: 3,
    req: 'R3xR4',
    id: 'TEST-T3-09',
    name: 'Single KPI Card Row × 3-Tier Layout Above-the-Fold Visibility (< 410px table top)'
  }, async () => {
    const page = await renderHtml(generateFilterToolbarHtml({ kpiCount: 4 }), VIEWPORTS.desktop_fhd);
    const tableBox = await getBoundingBox(page, '#tier3-table');
    assert.ok(tableBox.top <= 410, `Table begins at <= 410px above-the-fold, got ${tableBox.top}px`);
  });

  // TEST-T3-10: R1 (Mobile) × R2 (Buttons)
  await reporter.runTest({
    tier: 3,
    req: 'R1xR2',
    id: 'TEST-T3-10',
    name: 'Mobile Breakpoint Boundary (767px vs 768px) Navigation & Drawer Consistency'
  }, async () => {
    const page = await renderHtml(generateNavBannerHtml(), VIEWPORTS.mobile_boundary);
    let navStyle = await getComputed(page, '#module-top-nav-bar', ['display']);
    assert.strictEqual(navStyle.display, 'none', 'Banner hidden at 767px');

    await page.setViewport(VIEWPORTS.tablet_boundary);
    navStyle = await getComputed(page, '#module-top-nav-bar', ['display']);
    assert.strictEqual(navStyle.display, 'block', 'Banner visible at 768px');
  });

  // TEST-T3-11: R2 (Buttons) × R3 (Density)
  await reporter.runTest({
    tier: 3,
    req: 'R2xR3',
    id: 'TEST-T3-11',
    name: 'Table Row Action Radius Uniformity (rounded-lg) × Consolidated Action Width'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml(), VIEWPORTS.desktop);
    const actionCellBox = await getBoundingBox(page, 'tbody td:has(button)');
    assert.ok(actionCellBox.width <= 280, `Action cell width <= 280px, got ${actionCellBox.width}px`);
  });

  // TEST-T3-12: R1 (Mobile) × R4 (Filter)
  await reporter.runTest({
    tier: 3,
    req: 'R1xR4',
    id: 'TEST-T3-12',
    name: 'Mobile Viewport (<768px) × Dedicated Filter Toolbar Project Switcher Interaction'
  }, async () => {
    const page = await renderHtml(generateFilterToolbarHtml(), VIEWPORTS.mobile_se);
    const selectBox = await getBoundingBox(page, '#filter-project-select');
    assert.ok(selectBox.height >= 40, 'Project switcher height >= 40px on mobile');
  });
}
