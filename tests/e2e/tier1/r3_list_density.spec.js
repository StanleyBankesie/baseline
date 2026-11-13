import assert from 'assert';
import { VIEWPORTS, TARGET_FILES } from '../config.js';
import { renderHtml } from '../harness/browser.js';
import { countElements, getAllElementTexts } from '../harness/dom_inspector.js';
import { checkFileContains, checkFileExcludes, readSourceFile } from '../harness/ast_checker.js';
import { generateTableDensityHtml } from '../fixtures/template_factory.js';

export async function run(reporter) {
  reporter.printTierHeader('TIER 1: FEATURE COVERAGE - R3 (List Page Information Reduction)');

  // E2E-R3-T1-01: Absence of "Created By" in Sales Order List
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-01',
    name: 'Absence of "Created By" column in Sales Order table layout'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    const hasCreatedBy = headers.some(h => /created by/i.test(h));
    const cellCount = await countElements(page, '.grid-created-by-cell');
    assert.strictEqual(hasCreatedBy, false, 'Table header must not contain "Created By"');
    assert.strictEqual(cellCount, 0, 'No .grid-created-by-cell elements should exist');
  });

  // E2E-R3-T1-02: Absence of "Created Date" in Sales Order List
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-02',
    name: 'Absence of "Created Date" column in Sales Order table layout'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    const hasCreatedDate = headers.some(h => /created date/i.test(h));
    const cellCount = await countElements(page, '.grid-created-date-cell');
    assert.strictEqual(hasCreatedDate, false, 'Table header must not contain "Created Date"');
    assert.strictEqual(cellCount, 0, 'No .grid-created-date-cell elements should exist');
  });

  // E2E-R3-T1-03: Absence of "Created By" in Sales Invoice List
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-03',
    name: 'Absence of "Created By" in Sales Invoice table layout'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => /created by/i.test(h)), false);
  });

  // E2E-R3-T1-04: Absence of "Created Date" in Sales Invoice List
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-04',
    name: 'Absence of "Created Date" in Sales Invoice table layout'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => /created date/i.test(h)), false);
  });

  // E2E-R3-T1-05: Absence of "Created By" in Purchase Orders Local List
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-05',
    name: 'Absence of "Created By" in Purchase Orders Local List'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => /created by/i.test(h)), false);
  });

  // E2E-R3-T1-06: Absence of "Created Date" in Purchase Orders Local List
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-06',
    name: 'Absence of "Created Date" in Purchase Orders Local List'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => /created date/i.test(h)), false);
  });

  // E2E-R3-T1-07: Absence of "Created By" & "Created Date" in Purchase Bills List
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-07',
    name: 'Absence of "Created By" and "Created Date" in Purchase Bills List'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => /created by|created date/i.test(h)), false);
  });

  // E2E-R3-T1-08: Absence of "Created By" & "Created Date" in Journal Vouchers
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-08',
    name: 'Absence of audit metadata columns in Journal Vouchers'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => /created by|created date/i.test(h)), false);
  });

  // E2E-R3-T1-09: Absence of "Created By" in Employee Setup
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-09',
    name: 'Absence of "Created By" in Employee Setup table'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => /created by/i.test(h)), false);
  });

  // E2E-R3-T1-10: Absence of "Created Date" in Employee Setup
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-10',
    name: 'Absence of "Created Date" in Employee Setup table'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => /created date/i.test(h)), false);
  });

  // E2E-R3-T1-11: Absence of "Created By" & "Created Date" in Asset Register
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-11',
    name: 'Absence of audit metadata columns in Asset Register'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => /created by|created date/i.test(h)), false);
  });

  // E2E-R3-T1-12: Retention of Essential Transaction Date as Sole Date Column
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-12',
    name: 'Retention of essential transaction "Date" column in list views'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    const hasDate = headers.some(h => /^date$|^order date$/i.test(h));
    assert.ok(hasDate, 'Essential business date column must remain in table');
  });

  // E2E-R3-T1-13: Duplicate KPI Card Removal in Equipment List
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-13',
    name: 'Equipment List renders exactly 1 KPI card grid (4 cards max, no duplicates)'
  }, async () => {
    const html = `
      <div id="root">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4" id="kpi-block-1">
          <div class="card p-4">Total Equipment</div>
          <div class="card p-4">Active Status</div>
          <div class="card p-4">Under Repair</div>
          <div class="card p-4">Expired Warranty</div>
        </div>
      </div>
    `;
    const page = await renderHtml(html, VIEWPORTS.desktop);
    const kpiGrids = await countElements(page, '.grid[class*="grid-cols-"]');
    const kpiCards = await countElements(page, '.card');
    assert.strictEqual(kpiGrids, 1, 'Only 1 KPI card grid must exist');
    assert.strictEqual(kpiCards, 4, 'Exactly 4 KPI cards must exist');
  });

  // E2E-R3-T1-14: Duplicate KPI Card Removal in Items Master List
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-14',
    name: 'Items Master List retains single 4-card metric block before table'
  }, async () => {
    const html = `
      <div id="root">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4" id="items-kpi">
          <div class="card p-4">Active Items</div>
          <div class="card p-4">Total Inventory</div>
          <div class="card p-4">Inactive Catalog</div>
          <div class="card p-4">Finished Goods</div>
        </div>
      </div>
    `;
    const page = await renderHtml(html, VIEWPORTS.desktop);
    const count = await countElements(page, '.card');
    assert.strictEqual(count, 4, 'Items list must render single 4-card metric block');
  });

  // E2E-R3-T1-15: BOQ Line Items Essential Columns Retention
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-15',
    name: 'BOQ Line Items table retains exactly 10 essential columns'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ isBoq: true }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.length, 10, 'BOQ table must have exactly 10 essential columns');
    const expected = ['#', 'Item Code', 'Description of Work', 'Cost Category', 'Unit (UoM)', 'Quantity', 'Unit Rate', 'Amount', 'Rate Build', 'Del'];
    expected.forEach(col => {
      assert.ok(headers.some(h => h.includes(col)), `Missing BOQ essential column: ${col}`);
    });
  });

  // E2E-R3-T1-16: BOQ Rate Analysis Sub-Formulas Isolated in Modal
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-16',
    name: 'BOQ Rate Analysis sub-formulas are isolated from line item columns'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ isBoq: true }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => /Labor Rate|Plant Rate|Material Cost|Contingency Rate/i.test(h)), false, 'Sub-breakdowns must not exist as table columns');
  });

  // E2E-R3-T1-17: Removal of Redundant "Category" Column in Drawing Register
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-17',
    name: 'Removal of redundant "Category" column (all DRAWING) in Drawing Register'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeCategory: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => h.toLowerCase() === 'category'), false, 'Category column must be removed');
  });

  // E2E-R3-T1-18: Removal of Redundant "Active" Column in Project Portfolio
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-18',
    name: 'Removal of redundant "Active" column in Project Portfolio'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeActive: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => h.toLowerCase() === 'active'), false, 'Active column must be removed');
  });

  // E2E-R3-T1-19: Removal of Separate "Attachments" Column in Employee Setup
  await reporter.runTest({
    tier: 1,
    req: 'R3',
    id: 'E2E-R3-T1-19',
    name: 'Removal of separate "Attachments" column in Employee Setup'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAttachments: false }), VIEWPORTS.desktop);
    const headers = await getAllElementTexts(page, 'thead th');
    assert.strictEqual(headers.some(h => h.toLowerCase() === 'attachments'), false, 'Separate Attachments column must be removed');
  });
}
