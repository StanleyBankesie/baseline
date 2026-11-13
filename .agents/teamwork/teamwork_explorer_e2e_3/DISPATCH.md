# Dispatch: Explorer 3 (Tiers 3 & 4 Specifications & TEST_INFRA.md Design)

## Role
Read-Only Technical Explorer

## Mission
Formulate concrete test specifications for:
- Tier 3: Cross-Feature Combinations (Pairwise Interaction Tests)
- Tier 4: Real-World Application Scenarios
And define the complete schema and content for `TEST_INFRA.md` and `TEST_READY.md`.

## Context & Inputs
- ORIGINAL_REQUEST: `c:\Users\stanl\demo\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\stanl\demo\PROJECT.md`
- SCOPE.md: `c:\Users\stanl\demo\.agents\teamwork\orchestrator_e2e_testing\SCOPE.md`
- Prior Surveys:
  - Survey 1: `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_survey_1\handoff.md`
  - Survey 2: `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_survey_2\handoff.md`
  - Survey 3: `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_survey_3\handoff.md`
- State Folder: `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_e2e_3`

## Specific Instructions
1. Design Tier 3: Cross-Feature Combinations (Pairwise coverage):
   - Combine R1 (Mobile view <768px) with R2 (Button Sizing & Stacking).
   - Combine R1 (Mobile view) with R4 (Filter toolbar responsive layout).
   - Combine R2 (Button Sizing & Alignment) with R3 (Table row action heights & density).
   - Combine R2 (Header buttons) with R4 (Header separation from filter bar).
   - Combine R3 (Clutter reduction) with R4 (Search/Filter filtering essential columns).
   - Minimum: >= 10 pairwise test cases covering major feature interactions.
2. Design Tier 4: Real-World Application Scenarios:
   - Scenario 1: Construction Document Workflow (Drawing Register navigation, RFI filter, register drawing action button, impact badges).
   - Scenario 2: BOQ Cost Management Workflow (BOQ header metrics, line items table density, modal actions).
   - Scenario 3: Sales Invoice Management Workflow (Invoice list header Deep Teal button, table row action buttons, audit column absence).
   - Scenario 4: Maintenance Equipment & Asset Workflow (Single 4-card metric row, equipment list filter toolbar, action buttons).
   - Scenario 5: HR Employee Directory Workflow (Employee list toolbar, compact table row actions, essential columns).
   - Minimum: >= 5 realistic end-user application workflows.
3. Formulate the comprehensive content for `TEST_INFRA.md` at project root according to the Project Pattern requirements (Test Philosophy, Feature Inventory, Test Architecture, Real-World Scenarios, Coverage Thresholds).
4. Write your findings and recommendations to `handoff.md` in your state folder.
5. Send a message to the orchestrator upon completion.


## 2026-11-13T03:31:23Z
You are Explorer 3 on the E2E Testing Track.
Read your dispatch at: c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_e2e_3\DISPATCH.md
Read the original user request at: c:\Users\stanl\demo\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project plan at: c:\Users\stanl\demo\PROJECT.md
Read the E2E scope at: c:\Users\stanl\demo\.agents\teamwork\orchestrator_e2e_testing\SCOPE.md
Read Survey 1 at: c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_survey_1\handoff.md
Read Survey 2 at: c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_survey_2\handoff.md
Read Survey 3 at: c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_survey_3\handoff.md

Working directory: c:\Users\stanl\demo
Your state folder: c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_e2e_3

Scope & Focus:
1. Design Tier 3: Cross-Feature Combinations (Pairwise Interaction Tests):
   - >= 10 pairwise test cases covering interactions across R1, R2, R3, R4 (e.g. mobile viewport + button sizing, mobile viewport + filter row, button sizing + list row density, header separation + action buttons, filter search + essential data retention).
2. Design Tier 4: Real-World Application Scenarios:
   - >= 5 realistic end-user application scenarios (Construction Document Register & RFI review, BOQ cost management inspection, Sales invoice list review, Maintenance equipment & asset workflow, HR employee roster navigation).
3. Define the complete schema, architecture, and content for `TEST_INFRA.md` at project root according to the Project Pattern requirements.

Write your complete findings and test specifications to `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_e2e_3\handoff.md`.
Upon completion, send a message back to the orchestrator.
