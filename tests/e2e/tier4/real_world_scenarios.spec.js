import assert from 'assert';
import { VIEWPORTS, BRAND_TOKENS, TARGET_FILES } from '../config.js';
import { renderHtml } from '../harness/browser.js';
import { getComputed, getBoundingBox, countElements, assertWithinTolerance, assertColor } from '../harness/dom_inspector.js';
import { checkFileContains } from '../harness/ast_checker.js';
import {
  generateFilterToolbarHtml,
  generateTableDensityHtml,
  generateButtonMatrixHtml
} from '../fixtures/template_factory.js';

export async function run(reporter) {
  reporter.printTierHeader('TIER 4: REAL-WORLD APPLICATION SCENARIOS (6 Realistic Workflows)');

  // SCENARIO-T4-01: Construction Document Register & RFI Review Lifecycle
  await reporter.runTest({
    tier: 4,
    req: 'SCENARIOS',
    id: 'SCENARIO-T4-01',
    name: 'Workflow: Construction Document Register & RFI Review Lifecycle'
  }, async () => {
    // Step 1: Render full 3-tier view in desktop
    const page = await renderHtml(generateFilterToolbarHtml(), VIEWPORTS.desktop_large);

    // Step 2: Validate Tier 1 Header
    const backBox = await getBoundingBox(page, '#header-back-btn');
    const primaryBox = await getBoundingBox(page, '#header-primary-btn');
    assertWithinTolerance(backBox.height, 42, 1.0, 'Back button 42px');
    assertWithinTolerance(primaryBox.height, 42, 1.0, 'Primary action 42px');

    // Step 3: Validate Tier 2 KPIs (4 cards)
    const kpiCount = await countElements(page, '#tier2-kpis .card');
    assert.strictEqual(kpiCount, 4, '4 canonical KPI cards');

    // Step 4: Validate Tier 3 Filter toolbar (42px square refresh)
    const refreshBox = await getBoundingBox(page, '#filter-refresh-btn');
    assertWithinTolerance(refreshBox.width, refreshBox.height, 0.5, 'Square refresh');

    // Step 5: Mobile transition (< 768px)
    await page.setViewport(VIEWPORTS.mobile_se);
    const mobileSearchBox = await getBoundingBox(page, '#filter-search');
    assert.ok(mobileSearchBox.width >= 280, 'Mobile search full width');
  });

  // SCENARIO-T4-02: BOQ Cost Management & Rate Analysis Inspection
  await reporter.runTest({
    tier: 4,
    req: 'SCENARIOS',
    id: 'SCENARIO-T4-02',
    name: 'Workflow: BOQ Cost Management & Rate Analysis Inspection'
  }, async () => {
    // Step 1: Load BOQ table layout
    const page = await renderHtml(generateTableDensityHtml({ isBoq: true }), VIEWPORTS.desktop);

    // Step 2: Verify 10 essential columns
    const thCount = await countElements(page, 'thead th');
    assert.strictEqual(thCount, 10, 'BOQ table has 10 essential columns');

    // Step 3: Verify sub-formula modal isolation
    const hasRateAnalysisModal = checkFileContains(TARGET_FILES.boqManager, /RateAnalysisModal|Rate Build/i);
    assert.ok(hasRateAnalysisModal, 'RateAnalysisModal isolates sub-breakdown formulas');
  });

  // SCENARIO-T4-03: Sales Invoice Management & Document Printing Workflow
  await reporter.runTest({
    tier: 4,
    req: 'SCENARIOS',
    id: 'SCENARIO-T4-03',
    name: 'Workflow: Sales Invoice Management & Document Printing Workflow'
  }, async () => {
    // Step 1: Load invoice table without audit columns
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);

    // Step 2: Check row actions (View, Edit, Print)
    const btnBox = await getBoundingBox(page, '.btn-table-action');
    assertWithinTolerance(btnBox.height, 36, 1.0, 'View/Edit buttons 36px');

    // Step 3: Check print icon button
    const printBox = await getBoundingBox(page, '.list-doc-action-btn');
    assertWithinTolerance(printBox.height, 36, 1.0, 'Print button 36px');
  });

  // SCENARIO-T4-04: Maintenance Equipment Registry Inspection
  await reporter.runTest({
    tier: 4,
    req: 'SCENARIOS',
    id: 'SCENARIO-T4-04',
    name: 'Workflow: Maintenance Equipment Registry Inspection (Single KPI Row & Above-The-Fold Table)'
  }, async () => {
    const page = await renderHtml(generateFilterToolbarHtml({ kpiCount: 4 }), VIEWPORTS.desktop_fhd);
    const kpiCount = await countElements(page, '#tier2-kpis .card');
    assert.strictEqual(kpiCount, 4, 'Equipment page has exactly 4 KPI cards');
    const tableBox = await getBoundingBox(page, '#tier3-table');
    assert.ok(tableBox.top <= 410, 'Table visible above the 1080p fold');
  });

  // SCENARIO-T4-05: HR Employee Directory & Staff Roster Navigation
  await reporter.runTest({
    tier: 4,
    req: 'SCENARIOS',
    id: 'SCENARIO-T4-05',
    name: 'Workflow: HR Employee Directory & Staff Roster Navigation'
  }, async () => {
    // Verifies employee list structure: no separate created by / created date / attachments
    const page = await renderHtml(generateTableDensityHtml({ includeAttachments: false }), VIEWPORTS.desktop);
    const headers = await page.$$eval('thead th', ths => ths.map(t => t.innerText.toLowerCase()));
    assert.strictEqual(headers.includes('attachments'), false, 'Separate attachments column eliminated');
  });

  // SCENARIO-T4-06: Financial Journal Voucher Audit & Workflow Review
  await reporter.runTest({
    tier: 4,
    req: 'SCENARIOS',
    id: 'SCENARIO-T4-06',
    name: 'Workflow: Financial Journal Voucher Audit & Workflow Review'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml(), VIEWPORTS.desktop);
    // Verifies that action column uses rounded-lg buttons, not rounded-full
    const pills = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('.btn-table-action'));
      return allBtns.filter(b => window.getComputedStyle(b).borderRadius === '9999px').length;
    });
    assert.strictEqual(pills, 0, 'No rounded-full pills in Journal Voucher table rows');
  });
}
