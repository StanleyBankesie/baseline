# Dispatch: Worker 1 (Milestone 1 — Implementation & Build Restoration)

## Objective
Implement Milestone 1 features:
1. **F1: Mobile Navigation Banner Hiding**:
   - Add `hidden md:block` to the root container of `ModuleTopNavBar` in `client/src/components/ModuleLayout.jsx` (line 196).
   - Add `hidden md:block` to the wrapper div in `client/src/components/ModuleDashboard.jsx` (line 550).
2. **F2: Client JSX Syntax Restoration**:
   - Apply the verified minimal diffs from Explorer 2 and Explorer 3 across the 15 JSX files to restore clean AST compilation.
3. **Build Verification**:
   - Run `npm run build --prefix client` and verify it exits with code 0.
   - Run the verification scripts provided in Explorer reports to confirm all files pass AST compilation.

## Mandatory Inputs to Read
- ORIGINAL_REQUEST.md: `c:\Users\stanl\demo\.agents\teamwork\ORIGINAL_REQUEST.md` (You MUST read this before starting work)
- PROJECT.md: `c:\Users\stanl\demo\PROJECT.md`
- SCOPE.md: `c:\Users\stanl\demo\.agents\teamwork\orchestrator_m1\SCOPE.md`
- Explorer 1 Report (F1 diffs): `c:\Users\stanl\demo\.agents\teamwork\explorer_m1_1\handoff.md`
- Explorer 2 Report (F2 Part 1 diffs): `c:\Users\stanl\demo\.agents\teamwork\explorer_m1_2\handoff.md`
- Explorer 3 Report (F2 Part 2 diffs): `c:\Users\stanl\demo\.agents\teamwork\explorer_m1_3\handoff.md`
- Working Directory: `c:\Users\stanl\demo`
- Your State Folder: `c:\Users\stanl\demo\.agents\teamwork\worker_m1_1`

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Exclusively Owned Files
You own the following 17 files:
1. `client/src/components/ModuleLayout.jsx`
2. `client/src/components/ModuleDashboard.jsx`
3. `client/src/pages/DashboardPage.jsx`
4. `client/src/pages/modules/facilities/hard-services/HardServicesPage.jsx`
5. `client/src/pages/modules/facilities/helpdesk/FMHelpdeskPage.jsx`
6. `client/src/pages/modules/finance/banking/PdcPostingsList.jsx`
7. `client/src/pages/modules/service-management/service-confirmations/ServiceConfirmationsList.jsx`
8. `client/src/pages/modules/inventory/DailyStockTakeList.jsx`
9. `client/src/pages/modules/inventory/ItemGroupsList.jsx`
10. `client/src/pages/modules/inventory/PhysicalStockTakeList.jsx`
11. `client/src/pages/modules/inventory/StockTakeList.jsx`
12. `client/src/pages/modules/inventory/StockVerificationList.jsx`
13. `client/src/pages/modules/transport/compliance/VehicleComplianceList.jsx`
14. `client/src/pages/modules/transport/drivers/DriversList.jsx`
15. `client/src/pages/modules/transport/logbook/LogbookList.jsx`
16. `client/src/pages/modules/transport/servicing/VehicleServicingList.jsx`
17. `client/src/pages/modules/transport/vehicles/VehiclesList.jsx`

## Completion Requirements
- Implement all changes.
- Execute `npm run build --prefix client` and document command output.
- Write handoff report to `c:\Users\stanl\demo\.agents\teamwork\worker_m1_1\handoff.md`.
- Send completion message to orchestrator.


## 2026-11-13T04:42:57Z
**Context**: Milestone 1, Implementation & Client Build Verification
**Content**: Checking on the status of `npm run build --prefix client`. Has the build finished or is it still processing Vite compilation and SW cache injection?
**Action**: Please update progress.md with the build outcome or progress status.
