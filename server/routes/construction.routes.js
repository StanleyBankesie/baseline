/**
 * @file construction.routes.js
 * @description API routes for Construction Management capabilities in OmniSuite ERP.
 */

import express from "express";
import {
  requireAuth,
  requireCompanyScope,
  requireBranchScope,
} from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import * as cc from "../controllers/construction.controller.js";
import * as milestonesController from "../controllers/milestones.controller.js";
import * as baselineController from "../controllers/baseline.controller.js";
import * as depController from "../controllers/dependencies.controller.js";

const router = express.Router();

// Middleware applied to all construction routes
router.use(requireAuth);
router.use(requireCompanyScope);
router.use(requireBranchScope);

// 1. Sites, Cost Codes, Phases & Work Packages
router.get("/sites", cc.listSites);
router.post("/sites", cc.createSite);
router.get("/cost-codes", cc.listCostCodes);
router.post("/cost-codes", cc.createCostCode);
router.get("/cost-categories", cc.listCostCategories);
router.post("/cost-categories", cc.createCostCategory);
router.put("/cost-categories/:id", cc.updateCostCategory);
router.delete("/cost-categories/:id", cc.deleteCostCategory);
router.get("/phases", cc.listPhases);
router.post("/phases", cc.createPhase);
router.get("/work-packages", cc.listWorkPackages);
router.post("/work-packages", cc.createWorkPackage);

// 2. Tendering & BOQs
router.get("/tenders", cc.listTenders);
router.get("/tenders/:id", cc.getTenderById);
router.post("/tenders", cc.createTender);
router.put("/tenders/:id", cc.updateTender);
router.post("/tenders/:id/award", cc.awardTenderToProject);

router.get("/boqs", cc.listBOQs);
router.get("/boqs/:id", cc.getBOQById);
router.post("/boqs", cc.createBOQ);
router.put("/boqs/:id", cc.updateBOQ);
router.delete("/boqs/:id", cc.deleteBOQ);
router.post("/boqs/:id/items", cc.saveBOQItems);
router.post("/boqs/:id/status", cc.updateBOQStatus);
router.post("/boqs/:id/submit", cc.submitBOQ);
router.post("/boqs/:id/approve", cc.approveBOQ);
router.post("/boqs/:id/reject", cc.rejectBOQ);
router.post("/boqs/:id/reverse", cc.reverseBOQ);
router.post("/boqs/:id/revision", cc.createBOQRevision);
router.get("/boqs/:id/revisions", cc.getBOQRevisions);
router.post("/boqs/:id/baseline", cc.baselineBOQ);
router.get("/boqs/:id/allocations", cc.getBudgetAllocations);
router.post("/boqs/:id/allocations", cc.saveBudgetAllocations);
router.get("/projects/:projectId/cost-summary", cc.getProjectCostSummary);
router.get("/boq-items/:boqItemId/rate-analysis", cc.getRateAnalysis);
router.post("/boq-items/:boqItemId/rate-analysis", cc.saveRateAnalysis);

// Automatic Milestone Detection & Management
router.get("/projects/:projectId/milestones", milestonesController.listProjectMilestones);
router.post("/projects/:projectId/milestones/detect", milestonesController.runMilestoneDetection);
router.post("/milestones", milestonesController.createManualMilestone);
router.put("/milestones/:id", milestonesController.updateMilestone);
router.delete("/milestones/:id", milestonesController.deleteMilestone);
router.post("/milestones/:id/accept", milestonesController.acceptMilestoneSuggestion);
router.post("/milestones/:id/reject", milestonesController.rejectMilestoneSuggestion);
router.post("/milestones/:id/toggle-inspection", milestonesController.toggleMilestoneInspection);

// 3. Budgets & Cost Control (EVM)
router.get("/cost-control/:projectId", cc.getCostControlSummary);
router.post("/budgets", cc.createProjectBudget);

// 4. Planning, CPM & EOT
router.get("/schedule/:projectId", cc.getProjectSchedule);
router.get("/schedule/:projectId/baselines", baselineController.listBaselines);
router.get("/schedule/:projectId/baseline-analysis", baselineController.getBaselineAnalysis);
router.get("/schedule/:projectId/baselines/:baselineId", baselineController.getBaselineDetails);
router.post("/schedule/:projectId/baselines/generate", baselineController.generateBaseline);
router.put("/schedule/:projectId/baselines/:baselineId", baselineController.updateProposedBaseline);
router.post("/schedule/:projectId/baselines/:baselineId/approve", baselineController.approveScheduleBaseline);
router.post("/schedule/:projectId/baselines/rebaseline", baselineController.rebaselineSchedule);
router.post("/schedule/:projectId/recalculate", cc.calculateProjectCPM);
router.post("/schedule/:projectId/baseline", cc.setScheduleBaseline);
router.post("/schedule/:projectId/activities", cc.createScheduleActivity);
router.put("/schedule/:projectId/activities/:taskId", cc.updateScheduleActivity);
router.delete("/schedule/:projectId/activities/:taskId", cc.deleteScheduleActivity);
// Dependency Detection, Generation & Management
router.get("/schedule/:projectId/dependencies", depController.listProjectDependencies);
router.post("/schedule/:projectId/dependencies/detect", depController.detectDependencies);
router.post("/schedule/:projectId/dependencies", depController.createDependency);
router.put("/schedule/:projectId/dependencies/:id", depController.updateDependency);
router.post("/schedule/:projectId/dependencies/:id/confirm", depController.confirmSuggestedDependency);
router.post("/schedule/:projectId/dependencies/:id/reject", depController.rejectSuggestedDependency);
router.delete("/schedule/:projectId/dependencies/:id", depController.deleteDependency);
router.delete("/schedule/:projectId/dependencies/:depId", depController.deleteDependency);
router.post("/cpm/:projectId/calculate", cc.calculateProjectCPM);
router.get("/eot-requests", cc.listEOTRequests);
router.post("/eot-requests", cc.createEOTRequest);

// 5. Daily Site Reports (DSR)
router.get("/daily-reports", cc.listDailyReports);
router.get("/daily-reports/:id", cc.getDailyReportById);
router.post("/daily-reports", cc.createDailyReport);
router.put("/daily-reports/:id", cc.updateDailyReport);
router.delete("/daily-reports/:id", cc.deleteDailyReport);
router.post("/daily-reports/:id/submit", cc.submitDailyReport);
router.post("/daily-reports/:id/approve", cc.approveDailyReport);
router.post("/daily-reports/:id/reverse", cc.reverseDailyReport);

// 6. Subcontracts & Valuations (IPCs)
router.get("/subcontracts", cc.listSubcontracts);
router.post("/subcontracts", cc.createSubcontract);
router.get("/subcontract-valuations", cc.listSubcontractValuations);
router.post("/subcontract-valuations", cc.createSubcontractValuation);

// 7. Client Valuations
router.get("/client-valuations", cc.listClientValuations);
router.get("/client-valuations/baseline/:projectId", cc.getClientValuationBaseline);
router.get("/client-valuations/:id", cc.getClientValuationById);
router.post("/client-valuations", cc.createClientValuation);
router.put("/client-valuations/:id", cc.updateClientValuation);
router.post("/client-valuations/:id/status", cc.updateClientValuationStatus);
router.post("/client-valuations/:id/create-payment-application", cc.createPaymentApplicationFromValuation);

// 7b. Interim Payment Applications (IPAs) / Progress Payment Claims
router.get("/payment-applications", cc.listPaymentApplications);
router.get("/payment-applications/:id", cc.getPaymentApplicationById);
router.post("/payment-applications", cc.createPaymentApplication);
router.put("/payment-applications/:id", cc.updatePaymentApplication);
router.delete("/payment-applications/:id", cc.deletePaymentApplication);
router.post("/payment-applications/:id/certify", cc.certifyPaymentApplication);
router.post("/payment-applications/:id/record-payment", cc.recordPaymentApplicationPayment);

// 8. Variations & Change Orders
router.get("/variations", cc.listVariations);
router.get("/variations/:id", cc.getVariationDetails);
router.post("/variations", cc.createVariation);
router.put("/variations/:id", cc.updateVariation);
router.post("/variations/:id/workflow", cc.advanceVariationWorkflow);
router.post("/variations/:id/approve", cc.approveVariation);
router.delete("/variations/:id", cc.deleteVariation);

// 9. Quality Control (QA/QC)
router.get("/inspections", cc.listInspections);
router.post("/inspections", cc.createInspection);
router.get("/ncrs", cc.listNCRs);
router.post("/ncrs", cc.createNCR);
router.get("/snag-list", cc.listSnagList);
router.post("/snag-list", cc.createSnagItem);
router.get("/project-issues", requirePermission("PM.PROJECT.VIEW"), cc.listProjectIssues);
router.get("/project-issues/:id/history", requirePermission("PM.PROJECT.VIEW"), cc.listProjectIssueHistory);
router.get("/project-issues/:id", requirePermission("PM.PROJECT.VIEW"), cc.getProjectIssueById);
router.post("/project-issues", requirePermission("PM.PROJECT.MANAGE"), cc.createProjectIssue);
router.put("/project-issues/:id", requirePermission("PM.PROJECT.MANAGE"), cc.updateProjectIssue);
router.get("/material-tests", cc.listMaterialTests);
router.post("/material-tests", cc.createMaterialTest);

// 10. HSE (Safety & Toolbox Talks)
router.get("/safety-incidents", cc.listSafetyIncidents);
router.post("/safety-incidents", cc.createSafetyIncident);
router.get("/toolbox-talks", cc.listToolboxTalks);
router.post("/toolbox-talks", cc.createToolboxTalk);

// 11. Documents & RFIs
router.get("/documents", cc.listDocuments);
router.post("/documents", cc.createDocument);
router.get("/rfis", cc.listRFIs);
router.post("/rfis", cc.createRFI);
router.put("/rfis/:id", cc.updateRFI);

// 12. Plant & Equipment Logs
router.get("/equipment-logs", cc.listEquipmentLogs);
router.post("/equipment-logs", cc.createEquipmentLog);
router.delete("/equipment-logs/:id", cc.deleteEquipmentLog);

export default router;
