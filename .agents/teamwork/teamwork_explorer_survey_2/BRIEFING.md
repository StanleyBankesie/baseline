# BRIEFING — 2026-11-13T03:16:50Z

## Mission
Investigate R2: Button Sizing and Alignment across the entire codebase. Survey all button components, classes, styles, icon buttons, headers/toolbars/dialogs/filter rows, catalog inconsistencies, and propose standardized hierarchy/variants/classes and alignment rules.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\stanl\demo
- State folder: c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_survey_2
- Original parent: 6ec8b889-5b90-409a-8b80-c6e9ab956d6c
- Milestone: Survey Phase

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT edit or write source code files
- Focus strictly on R2: Button Sizing and Alignment across all modules, headers, toolbars, modal dialogs, filter rows
- Deliver handoff.md following the 5-component Handoff Protocol

## Current Parent
- Conversation ID: 6ec8b889-5b90-409a-8b80-c6e9ab956d6c
- Updated: 2026-11-13T03:16:50Z

## Investigation State
- **Explored paths**: `client/src/styles.css`, `tailwind.config.js`, `components/ui/Button.jsx`, `components/common/Modal.jsx`, `components/ViewToggle.jsx`, `components/list/ListDocActionIconButtons.jsx`, 366 list/register/management pages across all 18 modules including `DocumentRegisterPage.jsx`, `BOQManager.jsx`, `AssetRegisterList.jsx`, `InvoiceList.jsx`, `JournalVoucherList.jsx`, `EmployeeList.jsx`.
- **Key findings**:
  1. 4,932 button/action elements across 866 files (4,231 raw `<button>`, 682 `<Link>`, only 19 `<Button>` components). Over 99% of buttons bypass the component layer.
  2. `styles.css` has `min-height: 42px` on `.btn-primary` and `.btn-secondary`, but `min-height: 40px` on `.btn-danger`.
  3. When developers attach `text-xs py-1 px-2.5` to `.btn-secondary`, the 42px min-height remains active, producing stretched, distorted buttons with tiny text.
  4. Filter rows contain up to 4 disparate heights (34px, 38px, 40px, 42px), non-square distorted refresh buttons (32x42px), and mismatched baselines (e.g. Drawing Register and Asset Register).
  5. Primary creation buttons randomly alternate between Deep Teal `#0E3646` (`btn-primary`), Green `#28a745` (`btn-success`), and ad-hoc shades of blue/teal.
  6. Table row action buttons alternate between 36px (`h-9`), 32px (`h-8`), 42px, and 30px, with clashing border-radii (pills `rounded-full` next to rounded rectangles `rounded-lg`).
- **Unexplored areas**: None. Comprehensive survey completed across all modules and layout categories.

## Key Decisions Made
- Formulated 3-tier standardized button sizing system (Standard 42px, Compact 36px, Micro 28px).
- Defined dedicated icon button dimensions (42x42px standard, 36x36px compact).
- Proposed CSS-level unification in `styles.css` to fix the `min-height` conflict and provide `.btn-icon` and `.btn-table-action` classes without requiring a total 4,900+ tag rewrite.
- Defined standardized filter bar architecture and Drawing Register layout refactoring.

## Artifact Index
- DISPATCH.md — Task dispatch and instructions
- BRIEFING.md — Persistent memory index
- progress.md — Liveness heartbeat and milestone tracking
- survey_buttons.cjs — Automated button AST/regex scanner
- buttons_inventory.json — Complete JSON inventory of all 4,932 buttons
- analyze_patterns.cjs — Module-by-module pattern analyzer
- survey_filters.cjs — Filter bar layout scanner
- survey_adoption.cjs — List page component adoption checker
- handoff.md — Comprehensive technical investigation report
