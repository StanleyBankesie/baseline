# Dispatch: Sub-Orchestrator M1 — Mobile Nav Banner & Build Integrity

## Role
Sub-Orchestrator for Milestone 1 (M1)

## Scope & Objective
Implement Milestone 1 as defined in `PROJECT.md`:
1. **F1: Mobile Navigation Banner Hiding (R1)**:
   - Add `hidden md:block` to `ModuleTopNavBar` root container in `client/src/components/ModuleLayout.jsx` (around line 196) and defensively in `client/src/components/ModuleDashboard.jsx` (line 550).
   - Ensure the banner is hidden on mobile screens (< 768px) and visible on desktop screens (>= 768px).
2. **F2: Client Build & Syntax Restoration**:
   - Fix the 15 pre-existing JSX syntax errors across list page files identified by Survey Explorer 1 (misplaced JSX comments in ternaries, duplicate imports, trailing commas, unterminated regex in `DashboardPage.jsx`, `HardServicesPage.jsx`, `FMHelpdeskPage.jsx`, `PdcPostingsList.jsx`, `DailyStockTakeList.jsx`, `ItemGroupsList.jsx`, `PhysicalStockTakeList.jsx`, `StockTakeList.jsx`, `StockVerificationList.jsx`, `ServiceConfirmationsList.jsx`, `VehicleComplianceList.jsx`, `DriversList.jsx`, `LogbookList.jsx`, `VehicleServicingList.jsx`, `VehiclesList.jsx`).
   - Verify that `npm run build --prefix client` completes with exit code 0.

## Workflow Instructions
- Follow the Project Pattern orchestration procedure:
  1. Create `SCOPE.md` in your state folder.
  2. Assess your scope and execute the standard iteration loop:
     - 3 Explorers (`teamwork_explorer`)
     - 1 Worker (`teamwork_worker`) with the mandatory integrity warning
     - 2 Reviewers (`teamwork_reviewer`)
     - 2 Challengers (`teamwork_challenger`)
     - 1 Forensic Auditor (`teamwork_auditor`)
     - Evaluate gate verdicts and record in `GATE_STATUS.md`.
  3. All review & audit criteria must pass before marking the milestone DONE.
  4. Send a message to the Project Orchestrator upon completion.

## Inputs
- ORIGINAL_REQUEST.md: `c:\Users\stanl\demo\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\stanl\demo\PROJECT.md`
- Survey Explorer 1 Report: `c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_survey_1\handoff.md`
- State Folder: `c:\Users\stanl\demo\.agents\teamwork\orchestrator_m1`
- Parent Conversation ID: `6ec8b889-5b90-409a-8b80-c6e9ab956d6c`


## 2026-11-13T03:26:31Z
You are the Sub-Orchestrator for Milestone 1 (Mobile Nav Banner & Build Integrity).
You MUST NOT write code directly — delegate all technical work to subagents per the Project Pattern.
Read your dispatch at: c:\Users\stanl\demo\.agents\teamwork\orchestrator_m1\DISPATCH.md
Read the original user request at: c:\Users\stanl\demo\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project plan at: c:\Users\stanl\demo\PROJECT.md
Read the Survey Explorer 1 report at: c:\Users\stanl\demo\.agents\teamwork\teamwork_explorer_survey_1\handoff.md
Working directory: c:\Users\stanl\demo
Your state folder: c:\Users\stanl\demo\.agents\teamwork\orchestrator_m1
Your parent conversation ID: 6ec8b889-5b90-409a-8b80-c6e9ab956d6c

Follow the Project Pattern procedure:
1. Create SCOPE.md in your state folder.
2. Run the iteration loop: 3 Explorers -> 1 Worker (with mandatory integrity warning) -> 2 Reviewers -> 2 Challengers -> 1 Forensic Auditor -> Gate.
3. Ensure all reviewers and challengers approve, the auditor verdict is CLEAN, and `npm run build --prefix client` passes.
4. When M1 gate passes, update SCOPE.md and send a completion message back to your parent.
