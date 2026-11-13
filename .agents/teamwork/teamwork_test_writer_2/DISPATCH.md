# Dispatch: Test Writer 2 (Genuine Codebase Binding & Remediation Implementation)

## Role
E2E Test Writer (`teamwork_test_writer`)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Write Ownership
You exclusively own and may write to:
1. `c:\Users\stanl\demo\TEST_INFRA.md`
2. `tests/e2e/**` (all test runner and specification files under `c:\Users\stanl\demo\tests\e2e\`)
3. `c:\Users\stanl\demo\.agents\teamwork\teamwork_test_writer_2/**`

DO NOT modify application source files in `client/src/` or `server/` — implementation changes belong to Implementation Track workers.

## Inputs
- ORIGINAL_REQUEST.md: `c:\Users\stanl\demo\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\stanl\demo\PROJECT.md`
- SCOPE.md: `c:\Users\stanl\demo\.agents\teamwork\orchestrator_e2e_testing\SCOPE.md`
- TEST_INFRA.md: `c:\Users\stanl\demo\TEST_INFRA.md`
- GATE_STATUS.md: `c:\Users\stanl\demo\.agents\teamwork\orchestrator_e2e_testing\GATE_STATUS.md`
- Explorer 2-1 Handoff (R1/R2 & CSS Fixes): `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_iter2_1\handoff.md`
- Explorer 2-2 Handoff (R3 & AST Fixes): `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_iter2_2\handoff.md`
- Explorer 2-3 Handoff (R4, T3/T4 & Anti-Cheating): `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_iter2_3\handoff.md`
- Forensic Auditor Report: `c:\Users\stanl\demo\.agents\teamwork\teamwork_auditor_e2e_1\handoff.md`
- State Folder: `c:\Users\stanl\demo\.agents\teamwork\teamwork_test_writer_2`

## Remediation Tasks

### 1. Fix Hover Race Condition (`E2E-R2-T1-03`)
In `tests/e2e/tier1/r2_buttons.spec.js`:
- Replace immediate `page.evaluate()` with predicate-based waiting:
  ```javascript
  await page.hover('#btn-primary');
  await page.waitForFunction(() => {
    const el = document.querySelector('#btn-primary');
    if (!el) return false;
    const bg = window.getComputedStyle(el).backgroundColor;
    return bg === 'rgb(23, 61, 80)' || bg.includes('23, 61, 80');
  }, { timeout: 3000 });
  ```
- Remove the invalid `'14, 54, 70'` pre-hover fallback assertion.

### 2. Eliminate Synthetic `CSS_BUNDLE` & Bind to `client/src/styles.css`
- In `tests/e2e/fixtures/template_factory.js`:
  - Remove hardcoded `.btn` 42px and `.btn-icon` overrides from `CSS_BUNDLE`.
  - Add helper `getLiveAppStyles()` reading `client/src/styles.css` directly.
- In `tests/e2e/tier1/r2_buttons.spec.js` and `tests/e2e/tier2/r2_buttons_boundaries.spec.js`:
  - Inject the live application stylesheet into Puppeteer pages via `page.addStyleTag({ path: TARGET_FILES.stylesCss })`.
  - Remove all inline `<style>` snippets (such as in `E2E-R2-T2-09` and `T2-10`).

### 3. Bind R1 Mobile Navigation Directly to Codebase
- In `tests/e2e/tier1/r1_mobile_nav.spec.js`:
  - Assert AST contracts directly on `TARGET_FILES.moduleLayout` and `TARGET_FILES.moduleDashboard` checking for `hidden md:block`.
- In `tests/e2e/fixtures/template_factory.js`:
  - Dynamically read classNames from `ModuleLayout.jsx` and `ModuleDashboard.jsx`.

### 4. Eliminate `{ includeAudit: false }` & Bind R3 Directly to ERP List Pages
- In `tests/e2e/config.js`:
  - Fix `purchaseBills` path to `'client/src/pages/modules/purchase/purchase-bills/PurchaseBillsList.jsx'`.
- In `tests/e2e/tier1/r3_list_density.spec.js`:
  - Replace synthetic table generation with genuine calls to `extractTableHeaders(TARGET_FILES.salesOrders)`, `extractTableHeaders(TARGET_FILES.salesInvoices)`, `extractTableHeaders(TARGET_FILES.purchaseOrdersLocal)`, etc.
  - Assert that `'Created By'` and `'Created Date'` are absent from extracted table headers.
  - In `E2E-R3-T1-13` and `T1-14`, assert that `countPatternInFile(TARGET_FILES.equipmentList, /grid-cols-[12].*md:grid-cols-4/g) === 1` and `countPatternInFile(TARGET_FILES.itemsList, /grid-cols-[12].*md:grid-cols-4/g) === 1`.
  - In `E2E-R3-T1-17`, `T1-18`, `T1-19`, inspect `DocumentRegisterPage.jsx` (no `Category`), `ProjectList.jsx` (no `Active`), and `EmployeeList.jsx` (no separate `Attachments`).
- In `tests/e2e/tier2/r3_list_density_boundaries.spec.js` (`E2E-R3-T2-05`):
  - Replace `const employeeHeaders = ['Photo', ...]; assert.strictEqual(employeeHeaders.length, 8)` with `const headers = extractTableHeaders(TARGET_FILES.employees); assert.strictEqual(headers.length, 8)`.

### 5. Eliminate Dummy Tests in R4 & Bind Tiers 3-4 to Live Codebase
- In `tests/e2e/tier2/r4_filter_layout_boundaries.spec.js` (`E2E-R4-T2-07`):
  - Replace `const trimmed = ' ABC '.trim()` with a genuine Puppeteer test typing `'   DRW-001   '` into `#filter-search` and asserting live query trimming.
- In `tests/e2e/tier1/r4_filter_layout.spec.js`:
  - Assert AST contracts directly on `DocumentRegisterPage.jsx` and `DailySiteReportList.jsx` ensuring filter controls are isolated from header into dedicated Tier 3 card.
- In `tests/e2e/tier3/pairwise_combinations.spec.js` and `tests/e2e/tier4/real_world_scenarios.spec.js`:
  - Bind pages to `client/src/styles.css` using `page.addStyleTag({ path: TARGET_FILES.stylesCss })`.
  - Assert real component and layout properties.

### 6. Verification & Handoff
- Run `node tests/e2e/runner.js` and verify execution.
- Write comprehensive handoff report to `c:\Users\stanl\demo\.agents\teamwork\teamwork_test_writer_2\handoff.md`.
- Send completion message to orchestrator.
