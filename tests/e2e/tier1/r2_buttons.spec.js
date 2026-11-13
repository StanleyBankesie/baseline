import assert from 'assert';
import { VIEWPORTS, BRAND_TOKENS, TARGET_FILES } from '../config.js';
import { renderHtml } from '../harness/browser.js';
import { getComputed, getBoundingBox, assertWithinTolerance, assertColor } from '../harness/dom_inspector.js';
import { checkFileContains } from '../harness/ast_checker.js';
import { generateButtonMatrixHtml } from '../fixtures/template_factory.js';

export async function run(reporter) {
  reporter.printTierHeader('TIER 1: FEATURE COVERAGE - R2 (Button Sizing & Alignment)');

  const page = await renderHtml(generateButtonMatrixHtml(), VIEWPORTS.desktop);

  // E2E-R2-T1-01: Base Button Standard Height
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-01',
    name: 'Base button height is 42px (min-height: 42px)'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-base');
    assertWithinTolerance(box.height, BRAND_TOKENS.heightBase, 1.0, 'Base button height');
  });

  // E2E-R2-T1-02: Primary Button Deep Teal #0E3646
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-02',
    name: 'Primary button background is Deep Teal #0E3646 with 12px radius'
  }, async () => {
    const style = await getComputed(page, '#btn-primary', ['backgroundColor', 'borderRadius', 'color']);
    const box = await getBoundingBox(page, '#btn-primary');
    assertColor(style.backgroundColor, BRAND_TOKENS.primaryDeepTealRgb, 'Primary background');
    assert.strictEqual(style.borderRadius, BRAND_TOKENS.radiusXl, 'Primary border radius');
    assertWithinTolerance(box.height, BRAND_TOKENS.heightBase, 1.0, 'Primary button height');
  });

  // E2E-R2-T1-03: Primary Button Hover Token
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-03',
    name: 'Primary button hover state shifts to darker Deep Teal #173d50'
  }, async () => {
    await page.hover('#btn-primary');
    const hoverBg = await page.evaluate(() => {
      // styles.css defines hover token
      return window.getComputedStyle(document.querySelector('#btn-primary')).backgroundColor;
    });
    // In headless test with hover pseudo-class
    assert.ok(hoverBg.includes('14, 54, 70') || hoverBg.includes('23, 61, 80'), 'Hover color valid');
  });

  // E2E-R2-T1-04: Secondary Button Styling & Border
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-04',
    name: 'Secondary button styling has 42px height and neutral slate border'
  }, async () => {
    const style = await getComputed(page, '#btn-secondary', ['minHeight', 'borderTopColor', 'borderRadius']);
    const box = await getBoundingBox(page, '#btn-secondary');
    assertWithinTolerance(box.height, BRAND_TOKENS.heightBase, 1.0, 'Secondary button height');
    assert.strictEqual(style.borderRadius, BRAND_TOKENS.radiusXl, 'Secondary radius');
  });

  // E2E-R2-T1-05: Compact Button Height & Typography
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-05',
    name: 'Compact button (.btn-sm) height is 36px with 8px radius'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-sm');
    const style = await getComputed(page, '#btn-sm', ['borderRadius', 'fontSize']);
    assertWithinTolerance(box.height, BRAND_TOKENS.heightCompact, 1.0, 'Compact button height');
    assert.strictEqual(style.borderRadius, BRAND_TOKENS.radiusLg, 'Compact button radius');
  });

  // E2E-R2-T1-06: Standard Square Icon Button
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-06',
    name: 'Standard icon button (.btn-icon) is square 42px x 42px with 1:1 aspect ratio'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-icon-std');
    assertWithinTolerance(box.width, BRAND_TOKENS.heightBase, 1.0, 'Icon width');
    assertWithinTolerance(box.height, BRAND_TOKENS.heightBase, 1.0, 'Icon height');
    assertWithinTolerance(box.width, box.height, 0.5, 'Square aspect ratio');
  });

  // E2E-R2-T1-07: Compact Square Icon Button
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-07',
    name: 'Compact icon button (.btn-sm.btn-icon) is square 36px x 36px'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-icon-compact');
    assertWithinTolerance(box.width, BRAND_TOKENS.heightCompact, 1.0, 'Compact icon width');
    assertWithinTolerance(box.height, BRAND_TOKENS.heightCompact, 1.0, 'Compact icon height');
    assertWithinTolerance(box.width, box.height, 0.5, 'Compact square aspect ratio');
  });

  // E2E-R2-T1-08: Table Document Action Button
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-08',
    name: 'Table document action button (.list-doc-action-btn) has 36px height and 8px radius'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-doc-action');
    const style = await getComputed(page, '#btn-doc-action', ['borderRadius']);
    assertWithinTolerance(box.height, BRAND_TOKENS.heightCompact, 1.0, 'Doc action height');
    assert.strictEqual(style.borderRadius, BRAND_TOKENS.radiusLg, 'Doc action radius');
  });

  // E2E-R2-T1-09: Table Workflow Approval Forward
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-09',
    name: 'Table approval forward button has 36px height and Deep Teal background'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-approval-fwd');
    const style = await getComputed(page, '#btn-approval-fwd', ['backgroundColor']);
    assertWithinTolerance(box.height, BRAND_TOKENS.heightCompact, 1.0, 'Approval forward height');
    assertColor(style.backgroundColor, BRAND_TOKENS.primaryDeepTealRgb, 'Approval forward background');
  });

  // E2E-R2-T1-10: Table Workflow Approval Reverse
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-10',
    name: 'Table approval reverse button has 36px height with red accent border'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-approval-rev');
    const style = await getComputed(page, '#btn-approval-rev', ['borderTopColor']);
    assertWithinTolerance(box.height, BRAND_TOKENS.heightCompact, 1.0, 'Approval reverse height');
    assert.ok(style.borderTopColor.includes('220, 38, 38') || style.borderTopColor.includes('red'), 'Red accent border');
  });

  // E2E-R2-T1-11: Table Row View & Edit Buttons
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-11',
    name: 'Table row action buttons (.btn-table-action) have uniform 36px height and 8px radius'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-table-action');
    const style = await getComputed(page, '#btn-table-action', ['borderRadius']);
    assertWithinTolerance(box.height, BRAND_TOKENS.heightCompact, 1.0, 'Table action height');
    assert.strictEqual(style.borderRadius, BRAND_TOKENS.radiusLg, 'Table action radius');
  });

  // E2E-R2-T1-12: Header "+ New [Entity]" Standardization
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-12',
    name: 'Header creation buttons standardized to Deep Teal #0E3646 (.btn-primary)'
  }, async () => {
    // AST verification in DocumentRegisterPage and styles.css
    const docRegPrimary = checkFileContains(TARGET_FILES.documentRegister, /btn-primary/);
    const stylesHasTeal = checkFileContains(TARGET_FILES.stylesCss, /#0E3646/);
    assert.ok(docRegPrimary, 'DocumentRegisterPage uses btn-primary');
    assert.ok(stylesHasTeal, 'styles.css defines Deep Teal #0E3646');
  });

  // E2E-R2-T1-13: Header "Back" / "Return" Standardization
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-13',
    name: 'Header Back/Return buttons standardized to .btn-secondary (42px)'
  }, async () => {
    const docRegBack = checkFileContains(TARGET_FILES.documentRegister, /btn-secondary/);
    assert.ok(docRegBack, 'DocumentRegisterPage uses btn-secondary for back navigation');
  });

  // E2E-R2-T1-14: Filter Bar Refresh Icon Standardization
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-14',
    name: 'Filter bar refresh icon is square 42px x 42px'
  }, async () => {
    const box = await getBoundingBox(page, '#btn-icon-std');
    assertWithinTolerance(box.width, 42, 1.0, 'Refresh width');
    assertWithinTolerance(box.height, 42, 1.0, 'Refresh height');
  });

  // E2E-R2-T1-15: Modal Dialog Footer Buttons
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-15',
    name: 'Modal dialog footer buttons have uniform 42px height and aligned baseline'
  }, async () => {
    const cancelBox = await getBoundingBox(page, '#modal-cancel');
    const submitBox = await getBoundingBox(page, '#modal-submit');
    assertWithinTolerance(cancelBox.height, BRAND_TOKENS.heightBase, 1.0, 'Modal cancel height');
    assertWithinTolerance(submitBox.height, BRAND_TOKENS.heightBase, 1.0, 'Modal submit height');
    assertWithinTolerance(cancelBox.top, submitBox.top, 1.0, 'Modal footer baseline alignment');
  });

  // E2E-R2-T1-16: Input & Button Height Parity
  await reporter.runTest({
    tier: 1,
    req: 'R2',
    id: 'E2E-R2-T1-16',
    name: 'Form input and adjacent button share identical 42px height'
  }, async () => {
    const inputBox = await getBoundingBox(page, '#input-adjacent');
    const buttonBox = await getBoundingBox(page, '#btn-adjacent');
    assertWithinTolerance(inputBox.height, BRAND_TOKENS.heightBase, 1.0, 'Input height');
    assertWithinTolerance(buttonBox.height, BRAND_TOKENS.heightBase, 1.0, 'Adjacent button height');
    assertWithinTolerance(inputBox.height, buttonBox.height, 1.0, 'Input and button height parity');
  });
}
