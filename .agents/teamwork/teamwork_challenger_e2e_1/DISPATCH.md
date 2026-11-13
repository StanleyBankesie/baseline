# Dispatch: Challenger 1 (Mutation & Negative Testing)

## Role
Adversarial Verifier (`teamwork_challenger`)

## Mission
Empirically stress-test the E2E test suite in `tests/e2e/` to verify test sensitivity (mutation testing):
1. Test whether the test suite detects intentional defects:
   - Does `tests/e2e/runner.js --req=R1` FAIL if `hidden md:block` is removed or inverted?
   - Does `tests/e2e/runner.js --req=R2` FAIL if button height is changed to 38px or if `.btn-icon` is made non-square (32x42)?
   - Does `tests/e2e/runner.js --req=R3` FAIL if a `Created By` column is injected into the table headers?
   - Does `tests/e2e/runner.js --req=R4` FAIL if search input is placed inside the header row?
2. Verify that failure reporting is clear, informative, and exits with code 1.
3. Clean up any test mutations so the repository is left in its clean passing state.
4. Document all mutation experiments, commands, outputs, and your verdict (APPROVE or REJECT) in `handoff.md`.
5. Send a completion message to the orchestrator.

## Inputs
- ORIGINAL_REQUEST.md: `c:\Users\stanl\demo\.agents\teamwork\ORIGINAL_REQUEST.md`
- PROJECT.md: `c:\Users\stanl\demo\PROJECT.md`
- TEST_INFRA.md: `c:\Users\stanl\demo\TEST_INFRA.md`
- Test Writer Handoff: `c:\Users\stanl\demo\.agents\teamwork\teamwork_test_writer_1\handoff.md`
- Working Directory: `c:\Users\stanl\demo`
- State Folder: `c:\Users\stanl\demo\.agents\teamwork\teamwork_challenger_e2e_1`


## 2026-11-13T04:48:26Z
[Message] timestamp=2026-11-13T04:48:26Z sender=79e95f8b-4848-48ae-a213-c4b2e83d7415 priority=MESSAGE_PRIORITY_HIGH
You are Challenger 1 on the E2E Testing Track.
Read your dispatch at: c:\Users\stanl\demo\.agents\teamwork\teamwork_challenger_e2e_1\DISPATCH.md
Read the original user request at: c:\Users\stanl\demo\.agents\teamwork\ORIGINAL_REQUEST.md
Read the project plan at: c:\Users\stanl\demo\PROJECT.md
Read TEST_INFRA.md at: c:\Users\stanl\demo\TEST_INFRA.md
Read the Test Writer handoff at: c:\Users\stanl\demo\.agents\teamwork\teamwork_test_writer_1\handoff.md

Working directory: c:\Users\stanl\demo
Your state folder: c:\Users\stanl\demo\.agents\teamwork\teamwork_challenger_e2e_1

Tasks:
1. Conduct mutation & negative testing against `tests/e2e/`:
   - Introduce intentional defects in fixtures/templates (e.g. non-42px button height, visible nav on mobile, leftover Created By column, distorted non-square refresh icon).
   - Run the runner to verify that the tests properly FAIL with non-zero exit code on defects.
   - Restore all clean states and verify the suite passes 100%.
2. Write your handoff report to `c:\Users\stanl\demo\.agents\teamwork\teamwork_challenger_e2e_1\handoff.md` with an explicit verdict: APPROVE or REJECT.
3. Send a completion message to the orchestrator.
