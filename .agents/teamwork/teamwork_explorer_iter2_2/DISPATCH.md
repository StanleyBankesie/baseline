# Dispatch: Explorer Iteration 2 - 2 (R3 Clutter Reduction Remediation & Live Codebase Binding)

## Role
Technical Explorer (`teamwork_explorer`)

## Context & Inputs
- ORIGINAL_REQUEST.md: `c:\Users\stanl\demo\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\stanl\demo\PROJECT.md`
- SCOPE.md: `c:\Users\stanl\demo\.agents\teamwork\orchestrator_e2e_testing\SCOPE.md`
- TEST_INFRA.md: `c:\Users\stanl\demo\TEST_INFRA.md`
- GATE_STATUS.md: `c:\Users\stanl\demo\.agents\teamwork\orchestrator_e2e_testing\GATE_STATUS.md`
- Reviewer 2 Report: `c:\Users\stanl\demo\.agents\teamwork\teamwork_reviewer_e2e_2\handoff.md`
- FULL Forensic Auditor Evidence Report: `c:\Users\stanl\demo\.agents\teamwork\teamwork_auditor_e2e_1\handoff.md`
- Working Directory: `c:\Users\stanl\demo`
- State Folder: `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_iter2_2`

## Specific Tasks
1. Read the FULL Forensic Auditor evidence report and Reviewer 2 report.
2. Investigate remediation for Finding 3 (Tautological & Synthetic List Density Tests for R3):
   - Replace `generateTableDensityHtml({ includeAudit: false })` in `tests/e2e/tier1/r3_list_density.spec.js` (`E2E-R3-T1-01..12`) with genuine inspections using `extractTableHeaders(TARGET_FILES.salesOrders)`, `extractTableHeaders(TARGET_FILES.salesInvoices)`, etc.
   - Replace in-memory HTML strings in `E2E-R3-T1-13` and `E2E-R3-T1-14` with genuine checks of `EquipmentList.jsx` and `ItemsList.jsx` (counting KPI container grids in the actual files).
   - Replace `E2E-R3-T1-17` (`{ includeCategory: false }`) with inspection of `DocumentRegisterPage.jsx` ensuring `Category` is absent.
   - Replace `E2E-R3-T1-18` with inspection of `ProjectList.jsx` ensuring `Active` boolean column is absent.
   - Replace `E2E-R3-T1-19` with inspection of `EmployeeList.jsx` ensuring separate `Attachments` column is absent.
   - Replace tautological test `E2E-R3-T2-05` (`['Photo', ...].length === 8`) with genuine header count check on `EmployeeList.jsx`.
3. Note on Implementation State:
   - If Milestone M3 (List Clutter Reduction) has not been implemented yet by the Implementation Track workers in the codebase, the tests SHOULD legitimately fail on the unmodified files, OR check both current state and target assertion honestly without masking or synthetic cheating!
   - Detail the exact strategy for genuine, truthful tests.
4. Write your comprehensive fix strategy to `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_iter2_2\handoff.md`.
5. Send a message to the orchestrator upon completion.
