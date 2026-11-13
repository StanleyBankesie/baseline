Refine the application's user interface and layout across all modules for production: hide the module sections banner in mobile view, standardize button sizing and alignment, reduce clutter on list pages by removing secondary fields, and properly arrange filters and search controls.

Integrity mode: development

## Requirements

### R1. Mobile Navigation Banner
In mobile view, hide the module sections navigation banner (`ModuleTopNavBar` in `ModuleLayout.jsx`) while keeping it visible on desktop viewports.

### R2. Button Sizing and Alignment
Standardize button sizes across all application pages so that buttons share uniform dimensions, font sizes, and consistent styling, and ensure all buttons and controls are properly aligned and arranged.

### R3. List Page Information Reduction
Reduce displayed information and visual clutter across all list pages by removing secondary or redundant fields, using the attached BOQ / Cost Schedule line items and cards reference as guidance to retain only essential data.

### R4. Filter and Search Arrangement
Properly arrange filters, search fields, refresh buttons, and action controls on list pages (including Drawing Register) into a clean, aligned, and consistent layout.

## Acceptance Criteria

### Mobile Responsiveness
- [ ] The module sections banner is hidden on mobile screen widths (e.g., viewports under standard mobile breakpoint) and visible on desktop screens.

### Button Styling and Alignment
- [ ] Buttons across modules have consistent height, padding, and typography matching application design standards.
- [ ] Buttons within headers, toolbars, and filter rows are properly aligned with adjacent inputs and controls.

### List Pages
- [ ] List views across modules (including BOQ / Cost Schedule) display only essential fields, eliminating redundant or non-critical columns and clutter.
- [ ] Filter bars, search controls, and action buttons on list pages (including Drawing Register) are arranged in a neat, aligned structure without misalignment or awkward wrapping.

### Verification
- [ ] Existing automated test suites in the repository pass.
- [ ] Component rendering and responsive layout function as expected on both mobile and desktop viewports without console errors.
