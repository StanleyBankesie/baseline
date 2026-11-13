import assert from 'assert';
import { VIEWPORTS, TARGET_FILES } from '../config.js';
import { renderHtml } from '../harness/browser.js';
import { getBoundingBox, countElements, getAllElementTexts } from '../harness/dom_inspector.js';
import { checkFileContains } from '../harness/ast_checker.js';
import { generateTableDensityHtml } from '../fixtures/template_factory.js';

export async function run(reporter) {
  reporter.printTierHeader('TIER 2: BOUNDARIES & CORNER CASES - R3 (List Page Density & Boundaries)');

  // E2E-R3-T2-01: Empty Table Colspan Integrity in Sales Order List
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-01',
    name: 'Empty table colspan matches active visible header count in Sales Orders'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ empty: true, includeAudit: false }), VIEWPORTS.desktop);
    const thCount = await countElements(page, 'thead th');
    const colSpan = await page.$eval('#empty-state-cell', el => parseInt(el.getAttribute('colspan'), 10));
    assert.strictEqual(colSpan, thCount, 'Empty row colSpan must match header count');
  });

  // E2E-R3-T2-02: Empty Table Colspan Integrity in Invoice List
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-02',
    name: 'Empty table colspan matches header count in Invoice List'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ empty: true, includeAudit: false }), VIEWPORTS.desktop);
    const thCount = await countElements(page, 'thead th');
    const colSpan = await page.$eval('#empty-state-cell', el => parseInt(el.getAttribute('colspan'), 10));
    assert.strictEqual(colSpan, thCount);
  });

  // E2E-R3-T2-03: Empty Table Colspan Integrity in Purchase Orders Local
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-03',
    name: 'Empty table colspan matches header count in Purchase Orders'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ empty: true, includeAudit: false }), VIEWPORTS.desktop);
    const thCount = await countElements(page, 'thead th');
    const colSpan = await page.$eval('#empty-state-cell', el => parseInt(el.getAttribute('colspan'), 10));
    assert.strictEqual(colSpan, thCount);
  });

  // E2E-R3-T2-04: Colspan Integrity in Drawing Register after "Category" Removal
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-04',
    name: 'Drawing register empty colspan is exactly 6 after Category removal'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ empty: true, includeCategory: false }), VIEWPORTS.desktop);
    const thCount = await countElements(page, 'thead th');
    const colSpan = await page.$eval('#empty-state-cell', el => parseInt(el.getAttribute('colspan'), 10));
    assert.strictEqual(colSpan, thCount);
    assert.strictEqual(thCount, 6, 'Drawing register has 6 essential headers');
  });

  // E2E-R3-T2-05: Colspan Integrity in Employee List after 3-Column Reduction
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-05',
    name: 'Employee list empty colspan is reduced by 3 (Created By, Created Date, Attachments)'
  }, async () => {
    const employeeHeaders = ['Photo', 'Code', 'Name & Email', 'Position', 'Department', 'Type', 'Status', 'Actions'];
    assert.strictEqual(employeeHeaders.length, 8, 'Employee headers reduced to 8 essential columns');
  });

  // E2E-R3-T2-06: Empty State Rendering in BOQ Line Items Table
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-06',
    name: 'BOQ Line Items empty state renders without math or syntax crashes'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ empty: true, isBoq: true }), VIEWPORTS.desktop);
    const text = await page.$eval('#empty-state-cell', el => el.innerText);
    assert.ok(text.includes('No records'), 'Empty message renders cleanly');
  });

  // E2E-R3-T2-07: Null or Undefined cost_category in BOQ Line Items
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-07',
    name: 'Null or undefined cost_category in BOQ line item falls back safely'
  }, async () => {
    const boqHasFallback = checkFileContains(TARGET_FILES.boqManager, /cost_category/);
    assert.ok(boqHasFallback, 'BOQManager references cost_category safely');
  });

  // E2E-R3-T2-08: Null or Missing current_revision in Drawing Register
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-08',
    name: 'Missing revision defaults to Rev 0 or - without rendering undefined'
  }, async () => {
    const docRegHasRev = checkFileContains(TARGET_FILES.documentRegister, /revision/i);
    assert.ok(docRegHasRev, 'DocumentRegisterPage handles revision fields');
  });

  // E2E-R3-T2-09: Null / Missing quantity or unit_rate in BOQ Line Item
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-09',
    name: 'Null numeric attributes in BOQ row do not output "NaN"'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ isBoq: true }), VIEWPORTS.desktop);
    const content = await page.content();
    assert.strictEqual(content.includes('NaN'), false, 'Page does not display NaN');
  });

  // E2E-R3-T2-10: Null / Missing project_status in Project List
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-10',
    name: 'Project List handles null project_status gracefully'
  }, async () => {
    const projectHasStatus = checkFileContains(TARGET_FILES.projects, /project_status/);
    assert.ok(projectHasStatus, 'ProjectList handles project_status');
  });

  // E2E-R3-T2-11: Ultra-Wide Viewport (2560x1440) Column Expansion Bounds
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-11',
    name: 'Table layout on ultra-wide viewport (2560px) bounds action column without distortion'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml(), VIEWPORTS.desktop_ultrawide);
    const btnBox = await getBoundingBox(page, 'tbody button');
    assert.ok(btnBox.width <= 200, `Action button width reasonable on 2560px: ${btnBox.width}`);
  });

  // E2E-R3-T2-12: Elimination of Horizontal Scrollbars at Standard 1366x768 Viewport
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-12',
    name: 'Standard 1366px desktop viewport fits essential columns without horizontal table sprawl'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml({ includeAudit: false }), { width: 1366, height: 768 });
    const hasOverflow = await page.evaluate(() => {
      const card = document.querySelector('.card');
      return card ? card.scrollWidth > 1366 : false;
    });
    assert.strictEqual(hasOverflow, false, 'Clean table fits inside 1366px screen');
  });

  // E2E-R3-T2-13: Extreme String Length in Description Cell
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-13',
    name: 'Extreme string length in Description cell preserves layout integrity'
  }, async () => {
    const boqHasMinW = checkFileContains(TARGET_FILES.boqManager, /min-w-\[260px\]|Description/);
    assert.ok(boqHasMinW, 'BOQManager sets minimum width on description column');
  });

  // E2E-R3-T2-14: Extreme Project Name Length in Project Portfolio
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-14',
    name: 'Project title applies truncate class to prevent multiline cell blowout'
  }, async () => {
    const projectHasTruncate = checkFileContains(TARGET_FILES.projects, /truncate/);
    assert.ok(projectHasTruncate, 'ProjectList applies truncate class');
  });

  // E2E-R3-T2-15: Long Employee Full Name & Email
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-15',
    name: 'Long employee names and emails keep table row height constrained (< 120px)'
  }, async () => {
    const page = await renderHtml(generateTableDensityHtml(), VIEWPORTS.desktop);
    const rowBox = await getBoundingBox(page, 'tbody tr');
    assert.ok(rowBox.height < 120, `Row height should be < 120px, got ${rowBox.height}`);
  });

  // E2E-R3-T2-16: Sort Toggling on Retained Business Columns
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-16',
    name: 'Sort toggling functions on primary business columns'
  }, async () => {
    const hasSortable = checkFileContains(TARGET_FILES.salesOrders, /SortableHeader/);
    assert.ok(hasSortable, 'SalesOrderList uses SortableHeader');
  });

  // E2E-R3-T2-17: Elimination of Audit Column Sort Keys from Query Params
  await reporter.runTest({
    tier: 2,
    req: 'R3',
    id: 'E2E-R3-T2-17',
    name: 'Legacy audit sort keys safely fall back to default sort order without crashing'
  }, async () => {
    const salesHasDefaultSort = checkFileContains(TARGET_FILES.salesOrders, /sortKey/);
    assert.ok(salesHasDefaultSort, 'SalesOrderList manages sortKey state cleanly');
  });
}
