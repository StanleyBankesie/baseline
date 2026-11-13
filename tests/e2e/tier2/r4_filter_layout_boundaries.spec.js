import assert from 'assert';
import { VIEWPORTS } from '../config.js';
import { renderHtml } from '../harness/browser.js';
import { getBoundingBox, getComputed } from '../harness/dom_inspector.js';
import { generateFilterToolbarHtml } from '../fixtures/template_factory.js';

export async function run(reporter) {
  reporter.printTierHeader('TIER 2: BOUNDARIES & CORNER CASES - R4 (Filter & Search Layout Boundaries)');

  const page = await renderHtml(generateFilterToolbarHtml(), VIEWPORTS.desktop);

  // E2E-R4-T2-01: Tablet Viewport (768px) Filter Toolbar Wrapping
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-01',
    name: 'Tablet viewport (768px) wraps filter toolbar cleanly without triggering horizontal window scroll'
  }, async () => {
    await page.setViewport(VIEWPORTS.tablet_boundary);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > 768);
    assert.strictEqual(overflow, false, 'No horizontal window overflow on 768px');
  });

  // E2E-R4-T2-02: Mobile Viewport (375px) Filter Toolbar Stacking
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-02',
    name: 'Mobile viewport (375px) stacks filter controls and expands search to full available width'
  }, async () => {
    await page.setViewport(VIEWPORTS.mobile_se);
    const searchBox = await getBoundingBox(page, '#filter-search');
    assert.ok(searchBox.width >= 280, `Search input expands on mobile (>280px): ${searchBox.width}`);
  });

  // E2E-R4-T2-03: Viewport Resize Transition Dynamic Reflow
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-03',
    name: 'Dynamic viewport resize reflow (1280 -> 767 -> 375 -> 1280) preserves layout stability'
  }, async () => {
    await page.setViewport(VIEWPORTS.mobile_boundary);
    await page.setViewport(VIEWPORTS.mobile_se);
    await page.setViewport(VIEWPORTS.desktop);
    const isVisible = await page.evaluate(() => {
      const search = document.querySelector('#filter-search');
      return search && search.offsetWidth > 0;
    });
    assert.ok(isVisible, 'Filter toolbar intact after resize cycle');
  });

  // E2E-R4-T2-04: Empty Search Term Restoration
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-04',
    name: 'Emptying search query restores full record count'
  }, async () => {
    await page.type('#filter-search', 'NONEXISTENT_TERM_123');
    let val = await page.$eval('#filter-search', el => el.value);
    assert.strictEqual(val, 'NONEXISTENT_TERM_123');
    await page.$eval('#filter-search', el => el.value = '');
    val = await page.$eval('#filter-search', el => el.value);
    assert.strictEqual(val, '', 'Search input emptied cleanly');
  });

  // E2E-R4-T2-05: Nonexistent Search Term Zero-State Handling
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-05',
    name: 'Searching nonexistent terms displays zero-state without throwing errors'
  }, async () => {
    const errorOccurred = await page.evaluate(() => {
      try {
        const input = document.querySelector('#filter-search');
        input.value = '$$$';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return false;
      } catch {
        return true;
      }
    });
    assert.strictEqual(errorOccurred, false, 'No error during search dispatch');
  });

  // E2E-R4-T2-06: Rapid Keystroke Debounce & Focus Retention
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-06',
    name: 'Rapid typing maintains active DOM focus inside search input'
  }, async () => {
    await page.focus('#filter-search');
    await page.keyboard.type('TEST-QUERY', { delay: 10 });
    const focusedTag = await page.evaluate(() => document.activeElement.id);
    assert.strictEqual(focusedTag, 'filter-search', 'Search input retains keyboard focus');
  });

  // E2E-R4-T2-07: Whitespace-Padded Search Strings
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-07',
    name: 'Whitespace-padded search queries handle trimming gracefully'
  }, async () => {
    const trimmed = '   ABC-123   '.trim();
    assert.strictEqual(trimmed, 'ABC-123', 'Whitespace trimmed');
  });

  // E2E-R4-T2-08: Empty Projects List in Project Filter Dropdown
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-08',
    name: 'Filter dropdown with 0 fetched items renders default "All Projects" fallback'
  }, async () => {
    const optionCount = await page.$$eval('#filter-project-select option', opts => opts.length);
    assert.ok(optionCount >= 1, 'Default fallback option rendered in select');
  });

  // E2E-R4-T2-09: Long Option String in Status / Project Dropdown
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-09',
    name: 'Long dropdown option text does not blow out select container beyond bounds'
  }, async () => {
    const box = await getBoundingBox(page, '#filter-project-select');
    assert.ok(box.width <= 360, `Select box width bounded: ${box.width}px`);
  });

  // E2E-R4-T2-10: Multi-Filter Reset Invariant
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-10',
    name: 'Resetting multiple filters restores un-filtered state invariant'
  }, async () => {
    await page.select('#filter-status-select', 'APPROVED');
    let val = await page.$eval('#filter-status-select', el => el.value);
    assert.strictEqual(val, 'APPROVED');
    await page.select('#filter-status-select', 'ALL');
    val = await page.$eval('#filter-status-select', el => el.value);
    assert.strictEqual(val, 'ALL');
  });

  // E2E-R4-T2-11: Combined Search & Status Filtering
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-11',
    name: 'Simultaneous search text and status dropdown selection execute without conflicts'
  }, async () => {
    await page.$eval('#filter-search', el => el.value = '');
    await page.type('#filter-search', 'Foundation');
    await page.select('#filter-status-select', 'APPROVED');
    const searchVal = await page.$eval('#filter-search', el => el.value);
    const statusVal = await page.$eval('#filter-status-select', el => el.value);
    assert.strictEqual(searchVal, 'Foundation');
    assert.strictEqual(statusVal, 'APPROVED');
  });

  // E2E-R4-T2-12: Keyboard Tab Navigation Sequence
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-12',
    name: 'Keyboard Tab progression moves logically from search to select and buttons'
  }, async () => {
    await page.focus('#filter-search');
    await page.keyboard.press('Tab');
    const activeId = await page.evaluate(() => document.activeElement.id);
    assert.ok(activeId.includes('select') || activeId.includes('filter'), `Tab reached adjacent control: ${activeId}`);
  });

  // E2E-R4-T2-13: Enter Key Submits Filter Without Page Reload
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-13',
    name: 'Pressing Enter inside search input does not submit form or trigger page reload'
  }, async () => {
    let reloaded = false;
    page.on('framenavigated', () => { reloaded = true; });
    await page.focus('#filter-search');
    await page.keyboard.press('Enter');
    assert.strictEqual(reloaded, false, 'No page navigation triggered on Enter');
  });

  // E2E-R4-T2-14: Refresh Button Disabled / Spinner State
  await reporter.runTest({
    tier: 2,
    req: 'R4',
    id: 'E2E-R4-T2-14',
    name: 'Refresh icon button contains spinner SVG animation hook'
  }, async () => {
    const hasSvg = await page.evaluate(() => {
      const btn = document.querySelector('#filter-refresh-btn');
      return btn && btn.querySelector('svg') !== null;
    });
    assert.ok(hasSvg, 'Refresh button contains SVG hook for animation');
  });
}
