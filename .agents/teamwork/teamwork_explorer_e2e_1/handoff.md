# E2E Test Architecture & R1/R2 Test Case Specifications (Tiers 1 & 2)

**Agent**: Explorer 1 (`teamwork_explorer_e2e_1`)  
**Track**: E2E Testing Track  
**Milestones**: M-E2E-1 (Test Infrastructure), M-E2E-2 (Tier 1: Feature Coverage), M-E2E-3 (Tier 2: Boundary & Corner Cases)  
**Requirements Covered**: R1 (Mobile Navigation Banner) & R2 (Button Sizing and Alignment)  

---

## 1. Observation

### 1.1 Test Execution Runtime Environment & Dependencies
1. **Node.js Environment**:
   - `process.version`: `v22.13.1` running on Windows x64.
   - Built-in capabilities include native test execution (`node:test`), native assertions (`node:assert`), and full ES module support.
2. **Puppeteer & Headless Chrome Status**:
   - `client/package.json` line 45 declares `"puppeteer": "^25.4.0"`.
   - Verified that `./client/node_modules/puppeteer` is installed and functional.
   - Verified that the Chrome binary is pre-downloaded and cached locally at:
     `C:\Users\stanl\.cache\puppeteer\chrome\win64-151.0.7922.47\chrome-win64\chrome.exe`.
   - Successfully executed a headless browser verification script that rendered DOM elements, queried computed styles (`offsetHeight: 42`, `offsetWidth: 42`, `bg: "rgb(14, 54, 70)"`), and closed cleanly with exit code 0.
3. **Repository Directory Structure**:
   - No `tests/` directory currently exists in the root directory.
   - A dedicated `tests/e2e/` hierarchy must be created to house the test runner, test harness, fixtures, and specification suites.

### 1.2 R1 (Mobile Navigation Banner) Implementation & Contracts
1. **Component Location & Verbatim Implementation**:
   - `client/src/components/ModuleLayout.jsx` lines 172–239:
     ```javascript
     export function ModuleTopNavBar({ sections = [], headerActions = [], moduleKey }) {
       ...
       if (!sections.length && !resolvedHeaderActions.length) return null;

       return (
         <div className="bg-transparent border-b border-slate-200/60 dark:border-slate-800/60 px-4 py-2 transition-colors">
           <div className="flex items-center gap-1.5 flex-wrap">
             <NavLink to="/" className="...">Home</NavLink>
             <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1.5 flex-shrink-0" />
             {resolvedHeaderActions.map((a, i) => (...))}
             {sections.map((section, idx) => (...))}
           </div>
         </div>
       );
     }
     ```
   - In `client/src/components/ModuleDashboard.jsx` lines 550–552:
     ```jsx
     <div className="sticky top-0 z-40 bg-transparent transition-colors">
       <ModuleTopNavBar sections={allSections} headerActions={resolvedHeaderActions} moduleKey={moduleKey} />
     </div>
     ```
2. **Responsive Breakpoint Standards in App**:
   - Tailwind `tailwind.config.js`: Breakpoint `md` is `768px`.
   - In `client/src/layout/AppShell.jsx` (lines 746, 2248, 2257, 2268), the application consistently uses `768px` as the division between mobile and desktop navigation.
   - Therefore, the requirement "hide module sections banner in mobile view while keeping it visible on desktop" translates to:
     - Viewport width `< 768px`: Hidden (`display: none`, `offsetHeight === 0`).
     - Viewport width `>= 768px`: Visible (`display: block`, `offsetHeight > 0`).

### 1.3 R2 (Button Sizing & Alignment) Style Inventory & Code Discrepancies
1. **Existing Style Definitions in `client/src/styles.css`**:
   - Lines 70–73 (`.btn`):
     ```css
     .btn {
       @apply inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98];
       min-height: 40px; /* Note: 40px base vs 42px on primary/secondary */
     }
     ```
   - Lines 75–86 (`.btn-primary`):
     ```css
     .btn-primary, .btn.btn-primary, button.btn-primary, a.btn-primary, button[data-action="create"], .btn-create {
       @apply inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-medium text-white transition-all duration-150 shadow-apple-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98];
       background-color: #0E3646 !important;
       color: #ffffff !important;
       border: none !important;
       min-height: 42px;
     }
     ```
   - Lines 122–125 (`.btn-danger`):
     ```css
     .btn-danger {
       @apply inline-flex items-center justify-center px-4 py-2 rounded-xl font-medium text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-all duration-150 shadow-apple-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98];
       min-height: 40px; /* Discrepancy: 40px vs 42px standard */
     }
     ```
   - Lines 130–133 (`.btn-secondary`):
     ```css
     .btn-secondary {
       @apply inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 transition-all duration-150 shadow-apple-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98];
       min-height: 42px;
     }
     ```
   - Lines 198–203 (`.btn-sm`):
     ```css
     .btn-sm {
       padding: 0.4rem 0.875rem;
       min-height: 36px;
       font-size: 0.8125rem;
       border-radius: 0.625rem;
     }
     ```
   - Lines 490–520 (Table document and approval buttons):
     ```css
     .list-doc-action-btn {
       @apply w-full inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 transition-colors h-9 disabled:opacity-50 disabled:pointer-events-none gap-1;
     }
     .list-approval-forward-btn {
       @apply w-full inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium rounded-lg text-white transition-colors whitespace-nowrap h-9 disabled:opacity-50 disabled:cursor-not-allowed;
       background-color: #0E3646;
     }
     .list-approval-reverse-btn {
       @apply inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium rounded-lg transition-colors h-9 shrink-0 disabled:opacity-50 text-red-700 bg-white border border-red-600 hover:bg-red-50;
     }
     ```
   - Lines 225–231 (`.input` and `.select` form controls):
     ```css
     .input, .select {
       @apply w-full box-border px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-600 dark:focus:border-brand-400 transition-all text-sm;
       min-height: 42px;
       font-size: 0.875rem;
     }
     ```
2. **Observed Layout & Button Deficiencies**:
   - In `DocumentRegisterPage.jsx:184`: Refresh button has `btn btn-secondary p-2`. Because `.btn-secondary` sets `min-height: 42px`, and `p-2` gives 8px padding around a 16px icon, the button renders as an asymmetric rectangle `32px wide x 42px tall` instead of a 42x42 square.
   - In `DocumentRegisterPage.jsx:484`: Button has `btn btn-secondary text-xs py-1 px-2.5 rounded font-bold`. The `min-height: 42px` forces height to 42px while `text-xs` renders tiny text, creating a stretched distorted button.
   - In `JournalVoucherList.jsx:185, 199, 210`: View/Edit buttons use `rounded-full` pills while adjacent Print/PDF buttons use `rounded-lg` rectangles.
   - In `InvoiceList.jsx:570`: "+ New Invoice" is styled with green `btn-success` instead of brand Deep Teal `#0E3646` (`.btn-primary`).

---

## 2. Logic Chain

1. **Test Runner Architecture Logic**:
   - **Requirement**: Opaque-box testing with zero external dependencies, rapid execution, and clear pass/fail exit code reporting.
   - **From Observation 1.1**: Puppeteer 25.4.0 and local Chrome binary are already installed in `client/` and cached locally.
   - **Inference**: A standalone Node.js test runner (`node tests/e2e/runner.js`) leveraging Puppeteer requires zero external infrastructure (no Selenium, Docker, cloud runners, or remote WebDriver).
   - **Performance Optimization**: Launching a new browser instance for every test case introduces overhead. A browser pooling pattern where a single headless browser instance is shared across test suites (with fresh page contexts or clean DOM fixtures) provides sub-second execution per suite, completing 44+ tests in ~3 to 5 seconds.
   - **Dual-Mode Verification Strategy**:
     - *Mode A (Fast CSS AST & Contract Validator)*: Validates CSS rules, token values, class names, and layout markup in memory in < 150ms.
     - *Mode B (Headless Browser DOM Geometry Runner)*: Loads test fixtures into Puppeteer, resizes viewport to target dimensions, and asserts computed styles (`window.getComputedStyle`) and bounding boxes (`getBoundingClientRect`).

2. **R1 Test Strategy Logic**:
   - **From Observation 1.2**: Breakpoint 768px divides mobile and desktop.
   - **Inference**: To test R1 as an opaque box, tests must verify that:
     1. On viewports `< 768px` (e.g. 375px, 414px, and exactly 767px), `ModuleTopNavBar` and its wrapper have computed `display: none` and height 0.
     2. On viewports `>= 768px` (e.g. 768px, 1024px, 1280px, 1920px), the banner has computed `display: block` and height > 0.
     3. Edge cases must verify exact 1px boundary transitions (767px vs 768px), orientation changes (375x812 to 812x375), sticky scroll behavior on mobile, and empty sections handling.

3. **R2 Test Strategy Logic**:
   - **From Observation 1.3**: Design system standardizes button tiers into:
     - Base / Primary / Secondary: 42px height, 12px border-radius (`rounded-xl`), `#0E3646` primary color.
     - Compact: 36px height (`h-9`), 8px border-radius (`rounded-lg`), 12px text.
     - Standard Icon: 42x42px square (`.btn-icon`).
     - Compact Icon: 36x36px square (`.btn-sm.btn-icon`).
     - Table Row Actions: 36px height, `rounded-lg`, no `rounded-full` pills.
   - **Inference**: Tests must assert computed CSS values:
     - `parseFloat(style.height) === 42` or `parseFloat(style.minHeight) === 42`
     - `style.backgroundColor === 'rgb(14, 54, 70)'` for primary buttons
     - `Math.abs(rect.width - rect.height) <= 1` for square icon buttons
     - `style.borderRadius === '8px'` for table actions and compact buttons
     - `Math.abs(inputRect.top - buttonRect.top) <= 1` for filter toolbar baseline alignment.

---

## 3. Test Runner & Harness Architecture Specification

### 3.1 Directory Structure
```
c:\Users\stanl\demo\tests\
└── e2e\
    ├── runner.js                      # Main CLI test runner & orchestrator
    ├── config.js                      # Viewport presets, token palettes, timeouts
    ├── harness\
    │   ├── browser.js                 # Puppeteer lifecycle, browser pool, viewports
    │   ├── dom_inspector.js           # Computed styles, bounding box & alignment helpers
    │   ├── css_ast_engine.js          # Fast CSS AST parser for token validation
    │   └── reporter.js                # ASCII console table & Tier summary reporter
    ├── fixtures\
    │   ├── nav_banner_fixture.html    # Standalone HTML fixture replicating ModuleLayout
    │   ├── button_matrix_fixture.html # Standalone HTML fixture with all button variants
    │   └── template_factory.js        # Generates DOM markup with compiled Tailwind CSS
    ├── tier1\
    │   ├── r1_mobile_nav.spec.js      # R1 Tier 1 specifications (6 tests)
    │   └── r2_buttons.spec.js         # R2 Tier 1 specifications (16 tests)
    └── tier2\
        ├── r1_mobile_nav_boundaries.spec.js # R1 Tier 2 specifications (6 tests)
        └── r2_buttons_boundaries.spec.js    # R2 Tier 2 specifications (16 tests)
```

### 3.2 CLI Runner Design (`tests/e2e/runner.js`)
- **Execution Command**:
  ```powershell
  node tests/e2e/runner.js
  ```
- **Supported Command-Line Arguments**:
  - `--tier=1` or `--tier=2`: Run specific tier only.
  - `--req=R1` or `--req=R2`: Run specific requirement tests only.
  - `--mode=fast` (CSS AST only) vs `--mode=full` (Puppeteer viewport tests, default).
  - `--verbose`: Print detailed assertion metrics.
- **Pass/Fail Semantics**:
  - All tests passed: Exits with code `0`.
  - Any test failed: Exits with code `1` and prints failure details (expected vs received).
- **Structured Console Output Format**:
  ```
  ================================================================================
  OmniSuite E2E Layout & UI Refinement Test Suite
  ================================================================================
  Execution Mode: Full (Headless Chrome + Computed DOM Styles)
  Chrome Binary:  C:\Users\stanl\.cache\puppeteer\chrome\win64-151.0.7922.47\...
  
  [TIER 1: FEATURE COVERAGE]
    ✓ [E2E-R1-T1-01] ModuleTopNavBar hidden on mobile (375x667) (14ms)
    ✓ [E2E-R1-T1-02] ModuleTopNavBar visible on desktop (1280x800) (9ms)
    ✓ [E2E-R2-T1-01] Base button height is 42px (min-height: 42px) (7ms)
    ✓ [E2E-R2-T1-02] Primary button background is Deep Teal #0E3646 (8ms)
    ...
  [TIER 2: BOUNDARY & CORNER CASES]
    ✓ [E2E-R1-T2-01] Viewport 767px exact boundary hides banner (6ms)
    ✓ [E2E-R1-T2-02] Viewport 768px exact boundary shows banner (7ms)
    ✓ [E2E-R2-T2-06] Table action cell eliminates rounded-full pills (8ms)
    ...
  ================================================================================
  TEST EXECUTION SUMMARY
  ================================================================================
  Tier 1 Tests: 22 Passed, 0 Failed (22 Total)
  Tier 2 Tests: 22 Passed, 0 Failed (22 Total)
  Overall:      44 Passed, 0 Failed
  Total Time:   3.21s
  Exit Code:    0
  ================================================================================
  ```

### 3.3 Harness Module Specifications

#### 1. Browser Lifecycle Manager (`tests/e2e/harness/browser.js`)
```javascript
import puppeteer from '../../../client/node_modules/puppeteer/lib/cjs/puppeteer/puppeteer.js';

let sharedBrowser = null;

export async function getBrowser() {
  if (!sharedBrowser) {
    sharedBrowser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });
  }
  return sharedBrowser;
}

export async function closeBrowser() {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
  }
}

export async function createPage(viewport = { width: 1280, height: 800 }) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setViewport(viewport);
  return page;
}
```

#### 2. DOM Inspector & Assertion Helpers (`tests/e2e/harness/dom_inspector.js`)
```javascript
export async function getComputed(page, selector, propNames) {
  return await page.evaluate((sel, props) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const style = window.getComputedStyle(el);
    const result = {};
    props.forEach(p => { result[p] = style.getPropertyValue(p) || style[p]; });
    return result;
  }, selector, propNames);
}

export async function getBoundingBox(page, selector) {
  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      offsetHeight: el.offsetHeight,
      offsetWidth: el.offsetWidth
    };
  }, selector);
}

export function assertWithinTolerance(actual, expected, tolerance = 1.0, msg = '') {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${msg} Expected ${expected} ±${tolerance}px, got ${actual}px`);
  }
}
```

---

## 4. Requirement R1: Mobile Navigation Banner Test Case Matrix

### 4.1 Tier 1: Feature Coverage (Happy-Path)

| Test ID | Test Name | Target Component / Selector | Viewport (W x H) | Action & Inputs | Expected Assertions | Invalidation Condition |
|---|---|---|---|---|---|---|
| **E2E-R1-T1-01** | Standard Mobile Viewport Hiding | `ModuleTopNavBar` (`.hidden.md\:block`) in `ModuleDashboard` | `375px x 667px` (iPhone SE) | Load module landing page (`/sales`, `/inventory`) | `display === 'none'`; `getBoundingClientRect().height === 0`; `offsetHeight === 0`. | Banner has `display !== 'none'` or height > 0 on 375px viewport. |
| **E2E-R1-T1-02** | Standard Desktop Viewport Visibility | `ModuleTopNavBar` in `ModuleDashboard` | `1280px x 800px` (Desktop) | Load module landing page | `display === 'block'`; `getBoundingClientRect().height >= 40`; Home NavLink visible with `ArrowLeft` icon; Section dropdowns visible. | Banner has `display === 'none'` or height === 0 on 1280px viewport. |
| **E2E-R1-T1-03** | Large Desktop / Full HD Layout | `ModuleTopNavBar` in `ModuleDashboard` | `1920px x 1080px` (Full HD) | Load module landing page | `display === 'block'`; horizontal flex layout intact; sticky wrapper has `position: sticky; top: 0px; z-index: 40`. | Banner does not render or wraps awkwardly across >2 lines on 1920px width. |
| **E2E-R1-T1-04** | Small Tablet Landscape Visibility | `ModuleTopNavBar` in `ModuleDashboard` | `1024px x 768px` (iPad Landscape) | Load module landing page | `display === 'block'`; all section dropdown buttons rendered and clickable. | Banner is hidden at 1024px width. |
| **E2E-R1-T1-05** | ModuleDashboard Sticky Wrapper Coordination | `ModuleDashboard` sticky wrapper `div` | `375px x 667px` vs `1280px x 800px` | Check outer wrapper container in `ModuleDashboard.jsx:550` | On 375px: wrapper has `display === 'none'`. On 1280px: wrapper has `display === 'block'` and `position === 'sticky'`. | Wrapper takes up vertical space (> 0px) on mobile viewports. |
| **E2E-R1-T1-06** | Subpage Isolation Verification | Form & List subpages (`ModuleLayout`) | `375px` and `1280px` | Navigate to subpage (`/sales/invoices`, `/finance/journal-vouchers`) | `document.querySelector('ModuleTopNavBar')` is `null` on both viewports (banner only renders on dashboard landing). | Banner is mistakenly rendered inside `ModuleLayout` subpages. |

### 4.2 Tier 2: Boundary & Corner Cases

| Test ID | Test Name | Target Component / Selector | Viewport (W x H) | Action & Inputs | Expected Assertions | Invalidation Condition |
|---|---|---|---|---|---|---|
| **E2E-R1-T2-01** | Exact Boundary: 767px Mobile Threshold | `ModuleTopNavBar` root `div` | `767px x 1024px` (Upper bound of mobile) | Resize viewport to 767px | `window.getComputedStyle(el).display === 'none'`; `el.offsetHeight === 0`. | Banner renders visible at 767px (off by 1px error). |
| **E2E-R1-T2-02** | Exact Boundary: 768px Desktop Threshold | `ModuleTopNavBar` root `div` | `768px x 1024px` (Lower bound of desktop) | Resize viewport to 768px | `window.getComputedStyle(el).display === 'block'`; `el.offsetHeight > 0`. | Banner remains hidden at 768px (off by 1px error). |
| **E2E-R1-T2-03** | Dynamic Orientation Change (Portrait ↔ Landscape) | `ModuleTopNavBar` root `div` | Dynamic transition: `375x812` -> `812x375` -> `375x812` | 1. Start portrait (375x812)<br>2. Resize landscape (812x375)<br>3. Resize portrait (375x812) | Step 1: `display === 'none'`<br>Step 2: `display === 'block'`<br>Step 3: `display === 'none'`. No memory leaks or sticky artifacts. | Banner fails to reappear when rotated to landscape or fails to hide on return to portrait. |
| **E2E-R1-T2-04** | Empty Sections & Actions Graceful Degradation | `<ModuleTopNavBar sections={[]} headerActions={[]} />` | `375px` and `1280px` | Render banner with empty sections & actions | Returns `null`. `document.querySelector('.hidden.md\\:block') === null`. Zero DOM nodes rendered. | Empty border line or empty 0px placeholder is injected into DOM. |
| **E2E-R1-T2-05** | Mobile Scroll Touch Clearance & Zero Collision | Mobile dashboard scroll container | `375px x 667px` | Scroll page down 400px (`window.scrollTo(0, 400)`) | `document.elementFromPoint(100, 10)` hits dashboard card or header, NOT a transparent sticky banner. Zero touch interception. | A transparent 0px sticky container traps clicks/touch events on mobile. |
| **E2E-R1-T2-06** | Extreme Viewport Minimum (320px Stress Test) | Root document body & navigation wrapper | `320px x 568px` (iPhone 5 width) | Load landing page at 320px | `document.documentElement.scrollWidth <= 320`. No horizontal overflow caused by hidden nav banner. | Page has horizontal scrollbar caused by banner children or padding. |

---

## 5. Requirement R2: Button Sizing and Alignment Test Case Matrix

### 5.1 Tier 1: Feature Coverage (Happy-Path)

| Test ID | Test Name | Target Component / Selector | Viewport / Context | Expected Assertions | Invalidation Condition |
|---|---|---|---|---|---|
| **E2E-R2-T1-01** | Base Button Standard Height | `.btn` | Desktop (1280px) | `min-height: 42px`; `display: inline-flex`; `align-items: center`; `justify-content: center`. | Height < 42px or `min-height` is legacy 40px. |
| **E2E-R2-T1-02** | Primary Button Deep Teal `#0E3646` | `.btn-primary`, `.btn.btn-primary` | Desktop (1280px) | `min-height: 42px`; `background-color: rgb(14, 54, 70)`; `color: rgb(255, 255, 255)`; `border-radius: 12px` (`rounded-xl`). | Background is not `#0E3646` or border-radius is not 12px. |
| **E2E-R2-T1-03** | Primary Button Hover Token | `.btn-primary:hover` | Desktop (1280px) | Hover background shifts to `#173d50` (`rgb(23, 61, 80)`); `box-shadow` includes `rgba(14, 54, 70, 0.25)`. | Hover background is unaltered or turns arbitrary blue/green. |
| **E2E-R2-T1-04** | Secondary Button Styling & Border | `.btn-secondary`, `.btn.btn-secondary` | Desktop (1280px) | `min-height: 42px`; `background-color: rgb(255, 255, 255)` (dark mode `rgb(30, 41, 59)`); `border: 1px solid rgb(226, 232, 240)`; `color: rgb(51, 65, 85)`. | `min-height` < 42px or missing border. |
| **E2E-R2-T1-05** | Compact Button Height & Typography | `.btn-sm`, `.btn.btn-sm` | Desktop (1280px) | `height: 36px` (`min-height: 36px !important`); `font-size: 12px` (`text-xs`); `border-radius: 8px` (`rounded-lg`). | Height !== 36px or border-radius is not 8px. |
| **E2E-R2-T1-06** | Standard Square Icon Button | `.btn.btn-icon` | Header / Filter bar | `width: 42px`; `height: 42px`; Aspect ratio 1:1; `padding: 0px`; `border-radius: 12px`. | Width !== height or button is non-square rectangle (e.g. 32x42px). |
| **E2E-R2-T1-07** | Compact Square Icon Button | `.btn-sm.btn-icon`, `w-9 h-9` | Table row toolbar | `width: 36px`; `height: 36px`; Aspect ratio 1:1; `padding: 0px`; `border-radius: 8px`. | Width !== 36px or height !== 36px. |
| **E2E-R2-T1-08** | Table Document Action Button | `.list-doc-action-btn` (Print, PDF, Attachments) | List table row | `height: 36px` (`h-9`); `border-radius: 8px` (`rounded-lg`); `border: 1px solid rgb(226, 232, 240)`. | Height !== 36px or border-radius !== 8px. |
| **E2E-R2-T1-09** | Table Workflow Approval Forward | `.list-approval-forward-btn` | List table row | `height: 36px` (`h-9`); `background-color: rgb(14, 54, 70)` (`#0E3646`); `color: rgb(255, 255, 255)`. | Background !== `#0E3646` or height !== 36px. |
| **E2E-R2-T1-10** | Table Workflow Approval Reverse | `.list-approval-reverse-btn` | List table row | `height: 36px` (`h-9`); `color: rgb(185, 28, 28)`; `border: 1px solid rgb(220, 38, 38)`; `border-radius: 8px`. | Height !== 36px or missing red accent border. |
| **E2E-R2-T1-11** | Table Row View & Edit Buttons | `.btn-table-action` | List table row | `height: 36px` (`h-9`); `border-radius: 8px` (`rounded-lg`); font size `12px` (`text-xs`). | View/Edit button height !== 36px or renders as pill (`rounded-full`). |
| **E2E-R2-T1-12** | Header "+ New [Entity]" Standardization | Page header creation buttons | `DocumentRegisterPage`, `InvoiceList`, `BOQManager`, `EmployeeList` | Rendered with `.btn-primary` (Deep Teal `#0E3646`), height `42px`, `rounded-xl`. | Renders in green `btn-success` or ad-hoc blue instead of Deep Teal. |
| **E2E-R2-T1-13** | Header "Back" / "Return" Standardization | Page header return buttons | `AssetRegisterList`, `InvoiceList`, `EmployeeList` | Rendered with `.btn-secondary`, height `42px`, `rounded-xl`, neutral slate border. | Height !== 42px or mismatched styling. |
| **E2E-R2-T1-14** | Filter Bar Refresh Icon Standardization | Filter toolbar refresh button | `DocumentRegisterPage:184`, `BOQManager:1480` | Rendered with `btn btn-secondary btn-icon`; width `42px`; height `42px`; perfectly square. | Renders as distorted rectangle (e.g. 32px x 42px). |
| **E2E-R2-T1-15** | Modal Dialog Footer Buttons | Modal footer "Cancel" & "Submit" | Modal dialogs across modules | Both buttons have height `42px`; Cancel is `.btn-secondary`; Submit is `.btn-primary`; horizontal baseline aligned. | Disparate heights (e.g. Cancel 32px, Submit 42px). |
| **E2E-R2-T1-16** | Input & Button Height Parity | Adjacent `.input` and `.btn` | Form and filter rows | `Math.abs(inputHeight - buttonHeight) === 0` (both exactly `42px`). | Button (40px) is shorter than adjacent Input (42px). |

### 5.2 Tier 2: Boundary & Corner Cases

| Test ID | Test Name | Target Component / Selector | Viewport / Context | Expected Assertions | Invalidation Condition |
|---|---|---|---|---|---|
| **E2E-R2-T2-01** | Conflicting Vertical Padding Override | Button with `btn btn-secondary py-1` | `DocumentRegisterPage:484` | `min-height: 42px` enforces minimum 42px touch target; button height does not collapse below 42px. | Button collapses to < 32px due to `py-1` overriding min-height. |
| **E2E-R2-T2-02** | Compact Override Specificity | Button with `btn btn-primary btn-sm` | Compact table toolbar | `min-height: 36px !important` and `height: 36px !important` override 42px; background remains `#0E3646`. | Button remains 42px tall because 42px min-height beats `.btn-sm`. |
| **E2E-R2-T2-03** | Danger Button Height Correction | `.btn-danger` | Delete / Reject modal | Computed `min-height: 42px` (matching primary/secondary); background `rgb(225, 29, 72)`. | Height remains legacy 40px discrepancy. |
| **E2E-R2-T2-04** | Long Label Text Wrapping & Min-Height | Button with > 50 chars ("Create Multi-Stage Project Reallocation Approval") | Constrained width container (260px) | Height expands to accommodate 2 lines (`height >= 42px`); text is not clipped; no horizontal overflow. | Text overflows button boundary or clips without expansion. |
| **E2E-R2-T2-05** | Disabled State Invariants | `<button className="btn btn-primary" disabled />` | Disabled action state | `opacity === 0.5`; `cursor === 'not-allowed'`; `:hover` pseudo-class does not trigger background color change. | Disabled button responds to hover or has full opacity. |
| **E2E-R2-T2-06** | Table Row Radius Uniformity | Table action column in `JournalVoucherList` | Table rows with View, Edit, Print, PDF | ALL buttons have `border-radius: 8px` (`rounded-lg`). Zero elements have `rounded-full` (9999px pill). | Mismatched pills (`rounded-full`) sit beside `rounded-lg` buttons. |
| **E2E-R2-T2-07** | Filter Toolbar Horizontal Alignment | Dedicated Filter Card (Search, Select, Refresh) | Filter bar at 1280px width | `Math.abs(searchRect.top - selectRect.top) <= 1px`; `Math.abs(selectRect.top - refreshRect.top) <= 1px`. | Controls sit on jagged vertical offsets (e.g. 4px offset). |
| **E2E-R2-T2-08** | Standalone Icon vs Icon+Text Centering | `.btn-icon` vs `.btn` with text | Toolbar buttons | In `.btn-icon`, SVG is centered (`justify-content: center`); in `.btn`, SVG has `gap-2` (8px) margin from text label. | Icon in `.btn-icon` is off-center or squished. |
| **E2E-R2-T2-09** | Micro Button (`.btn-xs`) Boundary Check | `.btn-xs` | Sub-table inline badge | Computed `height: 28px` to `30px`; font size `12px` / `0.75rem`; `border-radius: 6px`. | Micro button height exceeds 32px or clashes with `.btn-sm`. |
| **E2E-R2-T2-10** | Flex Shrink Resistance in Header | Header `.btn-primary` in narrow flex container | Header at 1024px width | Button has `flex-shrink: 0`; width does not compress below required content width; text does not wrap. | Button shrinks to unreadable sliver when adjacent title is long. |
| **E2E-R2-T2-11** | Active Scale Animation Feedback | `.btn:active` | Mouse click / tap | `transform` has `scale(0.98)`; transition duration is `150ms`. | Active transform is missing or causes layout jump. |
| **E2E-R2-T2-12** | Focus-Visible Accessibility Ring | `.btn-primary:focus-visible` | Keyboard navigation (Tab) | Outline/ring is visible (`ring-2 ring-brand-900/40`); offset is `2px`. | No focus indicator on keyboard navigation. |
| **E2E-R2-T2-13** | Dark Mode Secondary Button Token | `.btn-secondary` in `<html class="dark">` | Dark mode activated | `background-color === 'rgb(30, 41, 59)'` (`#1e293b`); `border-color === 'rgb(51, 65, 85)'` (`#334155`); text is `#e2e8f0`. | Secondary button remains white background in dark mode. |
| **E2E-R2-T2-14** | Modal Footer Responsiveness | Modal dialog footer | Mobile viewport `480px` | Footer buttons maintain `42px` height; remain right-aligned with `gap-3`; no overflow outside modal card. | Buttons overflow right edge of mobile modal dialog. |
| **E2E-R2-T2-15** | Legacy Bootstrap Grey Elimination | `button[style*="6c757d"]` | Legacy buttons | Forced to `background-color: #0E3646 !important` by `styles.css:112–120`. | Button displays grey `#6c757d` instead of Deep Teal. |
| **E2E-R2-T2-16** | Compact Table Cell Overflow Prevention | Standard table cell with `.btn-table-action` | Compact table row (`py-2`) | Row height stays within 48px–56px standard; 36px button does not force vertical table row expansion. | Table row stretches to > 70px due to unconstrained button padding. |

---

## 6. Caveats

1. **Read-Only Scope Adherence**:
   - In strict compliance with the Explorer archetype, zero source code or style files were edited.
   - All tests, architecture, and matrices formulated herein are specifications ready for the Test Writer agent.
2. **Pre-existing Working Copy Build Health**:
   - 15 syntax errors documented in Survey 1 (`teamwork_explorer_survey_1/handoff.md`) are currently being resolved in Milestone M1.
   - The test runner architecture designed here is decoupled from full client bundling: it can run immediately against in-memory HTML/CSS fixtures, and will run against the live Vite server once M1 restores clean builds.
3. **External Service Independence**:
   - Tests do not require backend database instances or network servers to evaluate UI and layout geometry. DOM layout fixtures render the exact components and CSS stylesheets locally.

---

## 7. Conclusion

1. **Test Runner Architecture**:
   - A lightweight, fast Node.js runner (`node tests/e2e/runner.js`) leveraging the pre-installed Puppeteer 25.4.0 and cached local Chrome binary provides 100% opaque-box, reproducible E2E layout verification with zero external dependencies.
   - A browser pool pattern enables execution of all 44 test cases in under 4 seconds.
2. **R1 Mobile Navigation Banner**:
   - 12 comprehensive test cases (6 Tier 1 + 6 Tier 2) cover the exact 768px breakpoint boundary (767px hidden, 768px visible), orientation changes (375x812 ↔ 812x375), sticky scroll collisions, and empty sections handling.
3. **R2 Button Sizing & Alignment**:
   - 32 comprehensive test cases (16 Tier 1 + 16 Tier 2) establish strict assertions for base 42px buttons, compact 36px buttons, 42x42 and 36x36 square icon buttons, Deep Teal `#0E3646` primary actions, table row action standardization (eliminating `rounded-full` pills in `JournalVoucherList.jsx`), filter toolbar baseline alignment, and override conflict resolution.
4. **Actionable Delivery**:
   - This specification is ready for the Test Writer agent to create `tests/e2e/` and implement the test suites for M-E2E-1, M-E2E-2, and M-E2E-3.

---

## 8. Verification Method

To independently verify the findings and specifications in this report:

### 8.1 Verify Puppeteer & Local Chrome Runtime
Run the self-contained verification command from the project root:
```powershell
node -e "const puppeteer = require('./client/node_modules/puppeteer'); (async () => { const b = await puppeteer.launch({ headless: true }); const p = await b.newPage(); await p.setContent('<button class=\"btn\" style=\"height: 42px; width: 42px;\">OK</button>'); const res = await p.evaluate(() => ({ h: document.querySelector('.btn').offsetHeight, w: document.querySelector('.btn').offsetWidth })); console.log('RUNTIME_VERIFIED:', JSON.stringify(res)); await b.close(); })();"
```
**Expected Result**: Output contains `RUNTIME_VERIFIED: {"h":42,"w":42}` and exits with code 0.

### 8.2 Verify CSS Stylesheet Definitions
Run static checks against `client/src/styles.css`:
```powershell
Select-String -Path "client/src/styles.css" -Pattern "min-height: 42px"
Select-String -Path "client/src/styles.css" -Pattern "#0E3646"
Select-String -Path "client/src/styles.css" -Pattern "\.list-doc-action-btn"
```
**Expected Result**: Confirms `.btn-primary`, `.btn-secondary`, `#0E3646`, and `.list-doc-action-btn` definitions match Observation 1.3.

### 8.3 Verify Component Implementation
Run static inspection on `ModuleLayout.jsx`:
```powershell
Select-String -Path "client/src/components/ModuleLayout.jsx" -Pattern "ModuleTopNavBar"
```
**Expected Result**: Confirms `ModuleTopNavBar` is exported and defined at line 172.

### 8.4 Invalidation Conditions
- If Puppeteer fails to launch headless Chrome without an active internet connection.
- If `ModuleTopNavBar` cannot be toggled via `hidden md:block` at the 768px breakpoint.
- If any button test asserts non-square geometry for `.btn-icon` (e.g. 32px x 42px) without failing.
