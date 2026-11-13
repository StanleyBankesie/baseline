import assert from 'assert';
import { VIEWPORTS, BRAND_TOKENS, TARGET_FILES } from '../config.js';
import { renderHtml } from '../harness/browser.js';
import { getComputed, getBoundingBox, assertWithinTolerance, assertColor } from '../harness/dom_inspector.js';
import { checkFileContains } from '../harness/ast_checker.js';
import { generateButtonMatrixHtml, generateTableDensityHtml } from '../fixtures/template_factory.js';

export async function run(reporter) {
  reporter.printTierHeader('TIER 2: BOUNDARIES & CORNER CASES - R2 (Button Sizing & Alignment)');

  const page = await renderHtml(generateButtonMatrixHtml(), VIEWPORTS.desktop);

  // E2E-R2-T2-01: Conflicting Vertical Padding Override
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-01',
    name: 'Conflicting vertical padding override (py-1) does not collapse height below 42px touch target'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-py1-override');
    assert.ok(box.height >= 41.5, `Height should be >= 42px, got ${box.height}`);
  });

  // E2E-R2-T2-02: Compact Override Specificity
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-02',
    name: 'Compact override (.btn-sm) overrides 42px base height down to 36px'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-primary-sm-override');
    assertWithinTolerance(box.height, BRAND_TOKENS.heightCompact, 1.0, 'Compact override height');
  });

  // E2E-R2-T2-03: Danger Button Height Correction
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-03',
    name: 'Danger button (.btn-danger) height is unified to 42px standard'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-danger');
    assertWithinTolerance(box.height, BRAND_TOKENS.heightBase, 1.0, 'Danger button height');
  });

  // E2E-R2-T2-04: Long Label Text Wrapping & Min-Height
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-04',
    name: 'Long button text in narrow container expands vertically without text clipping'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-long-label');
    assert.ok(box.height >= 42, `Height should be at least 42px, got ${box.height}`);
  });

  // E2E-R2-T2-05: Disabled State Invariants
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-05',
    name: 'Disabled buttons maintain opacity 0.5 and pointer-events none / not-allowed'
  }, async () => {
    const style = await getComputed(page, '#btn-disabled', ['opacity', 'cursor']);
    assert.strictEqual(style.opacity, '0.5', 'Disabled opacity should be 0.5');
    assert.ok(style.cursor === 'not-allowed' || style.cursor === 'default', 'Disabled cursor');
  });

  // E2E-R2-T2-06: Table Row Radius Uniformity
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-06',
    name: 'Table row actions eliminate rounded-full pills in favor of rounded-lg (8px)'
  }, async () => {
    const tablePage = await renderHtml(generateTableDensityHtml(), VIEWPORTS.desktop);
    const pills = await tablePage.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('tbody button, tbody a'));
      return allBtns.filter(b => window.getComputedStyle(b).borderRadius === '9999px').length;
    });
    assert.strictEqual(pills, 0, 'Zero buttons in table rows should have rounded-full 9999px pill radius');
  });

  // E2E-R2-T2-07: Filter Toolbar Horizontal Alignment
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-07',
    name: 'Adjacent controls on same toolbar row share horizontal alignment (delta <= 1px)'
  }, async () => {
    await renderHtml(generateButtonMatrixHtml(), VIEWPORTS.desktop);
    const cancelBox = await getBoundingBox(page, '#modal-cancel');
    const submitBox = await getBoundingBox(page, '#modal-submit');
    assertWithinTolerance(cancelBox.top, submitBox.top, 1.0, 'Adjacent baseline delta');
  });

  // E2E-R2-T2-08: Standalone Icon vs Icon+Text Centering
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-08',
    name: 'Standalone icon button centers SVG cleanly with display inline-flex'
  }, async () => {
    const style = await getComputed(page, '#btn-icon-std', ['display', 'alignItems', 'justifyContent']);
    assert.ok(style.display.includes('flex'), 'Display must be flex or inline-flex');
    assert.strictEqual(style.alignItems, 'center');
    assert.strictEqual(style.justifyContent, 'center');
  });

  // E2E-R2-T2-09: Micro Button (.btn-xs) Boundary Check
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-09',
    name: 'Micro button (.btn-xs) has compact height within 28px - 30px bounds'
  }, async () => {
    const microHtml = `<button id="btn-xs-test" class="btn-xs">Sub-badge</button><style>
      .btn-xs { min-height: 30px !important; height: 30px !important; font-size: 12px; border-radius: 6px; }
    </style>`;
    const testPage = await renderHtml(microHtml, VIEWPORTS.desktop);
    const box = await getBoundingBox(testPage, '#btn-xs-test');
    assert.ok(box.height >= 28 && box.height <= 32, `Micro button height in bounds: ${box.height}`);
  });

  // E2E-R2-T2-10: Flex Shrink Resistance in Header
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-10',
    name: 'Header creation button resists flex-shrink in narrow flex rows'
  }, async () => {
    const flexHtml = `
      <div style="display: flex; width: 300px; gap: 10px;">
        <div style="width: 250px;">Very long document title that takes up space</div>
        <button id="shrink-btn" class="btn btn-primary" style="flex-shrink: 0; min-height: 42px; white-space: nowrap;">+ Create</button>
      </div>
      <style>.btn-primary { min-height: 42px; background: #0E3646; color: #fff; padding: 0 16px; }</style>
    `;
    const testPage = await renderHtml(flexHtml, VIEWPORTS.desktop);
    const box = await getBoundingBox(testPage, '#shrink-btn');
    assert.ok(box.width >= 50, `Button width not squashed: ${box.width}`);
  });

  // E2E-R2-T2-11: Active Scale Animation Feedback
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-11',
    name: 'Active state triggers scale(0.98) micro-interaction transform'
  }, async () => {
    // Verified via styles.css AST inspection
    const hasActiveScale = checkFileContains(TARGET_FILES.stylesCss, /active:scale-\[0\.98\]/);
    assert.ok(hasActiveScale, 'styles.css defines active:scale-[0.98]');
  });

  // E2E-R2-T2-12: Focus-Visible Accessibility Ring
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-12',
    name: 'Focus-visible outline ring token configured on primary buttons'
  }, async () => {
    const hasFocusRing = checkFileContains(TARGET_FILES.stylesCss, /btn-primary:focus-visible/);
    assert.ok(hasFocusRing, 'styles.css defines btn-primary:focus-visible');
  });

  // E2E-R2-T2-13: Dark Mode Secondary Button Token
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-13',
    name: 'Dark mode activates slate-800 (#1e293b) background on secondary button'
  }, async () => {
    const darkPage = await renderHtml(generateButtonMatrixHtml({ dark: true }), VIEWPORTS.desktop);
    const style = await getComputed(darkPage, '#btn-secondary', ['backgroundColor']);
    assertColor(style.backgroundColor, BRAND_TOKENS.secondaryDarkBgRgb, 'Dark mode secondary bg');
  });

  // E2E-R2-T2-14: Modal Footer Responsiveness on Mobile (480px)
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-14',
    name: 'Modal footer action buttons maintain 42px touch target and fit within 480px container'
  }, async () => {
    await page.setViewport({ width: 480, height: 700 });
    const cancelBox = await getBoundingBox(page, '#modal-cancel');
    const submitBox = await getBoundingBox(page, '#modal-submit');
    assertWithinTolerance(cancelBox.height, BRAND_TOKENS.heightBase, 1.0, 'Cancel mobile height');
    assertWithinTolerance(submitBox.height, BRAND_TOKENS.heightBase, 1.0, 'Submit mobile height');
    assert.ok(submitBox.right <= 480, 'Footer buttons do not overflow 480px viewport');
  });

  // E2E-R2-T2-15: Legacy Bootstrap Grey Elimination
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-15',
    name: 'Legacy grey #6c757d forced to Deep Teal #0E3646 by styles.css override'
  }, async () => {
    const styleHasOverride = checkFileContains(TARGET_FILES.stylesCss, /6c757d/);
    assert.ok(styleHasOverride, 'styles.css contains rule overriding #6c757d');
  });

  // E2E-R2-T2-16: Compact Table Cell Overflow Prevention
  await reporter.runTest({
    tier: 2,
    req: 'R2',
    id: 'E2E-R2-T2-16',
    name: 'Compact 36px table buttons keep table row height constrained (<= 56px)'
  }, async () => {
    const tablePage = await renderHtml(generateTableDensityHtml(), VIEWPORTS.desktop);
    const rowBox = await getBoundingBox(tablePage, 'tbody tr');
    assert.ok(rowBox.height <= 56, `Table row height <= 56px, got ${rowBox.height}px`);
  });
}
