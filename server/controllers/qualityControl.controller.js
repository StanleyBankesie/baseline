/**
 * @file qualityControl.controller.js
 * @description General-purpose Project Quality Assurance & Quality Control (QA/QC) controller.
 * Supports Quality Planning, Inspections & Testing, Defects & NCRs, CAPA, and Quality Performance Analytics.
 */

import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";
import { ensureQualityControlTables } from "../utils/qualityControlTables.js";

function toNumber(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Log quality audit action
async function logQualityAudit(companyId, projectId, entityType, entityId, action, oldStatus, newStatus, details, userName) {
  try {
    await query(
      `INSERT INTO pm_quality_audit_logs 
        (company_id, project_id, entity_type, entity_id, action, old_status, new_status, details, changed_by_name)
       VALUES 
        (:companyId, :projectId, :entityType, :entityId, :action, :oldStatus, :newStatus, :details, :userName)`,
      {
        companyId,
        projectId: toNumber(projectId),
        entityType,
        entityId: toNumber(entityId),
        action,
        oldStatus: oldStatus || null,
        newStatus: newStatus || null,
        details: details || null,
        userName: userName || "System Admin",
      }
    );
  } catch (e) {
    console.warn("[QA/QC Audit] Failed to log audit:", e.message);
  }
}

// -------------------------------------------------------------
// 1. QUALITY OVERVIEW & DASHBOARD METRICS
// -------------------------------------------------------------
export const getQualityOverview = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    await ensureQualityControlTables();
    const projectId = toNumber(req.query.project_id);

    // Build project filter
    let pFilter = "WHERE company_id = :companyId";
    const params = { companyId };
    if (projectId) {
      pFilter += " AND project_id = :projectId";
      params.projectId = projectId;
    }

    // 1. Inspections counts
    const [inspStats] = await query(
      `SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN outcome = 'PASSED' THEN 1 ELSE 0 END) AS passed,
        SUM(CASE WHEN outcome = 'FAILED' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN outcome = 'CONDITIONAL_PASS' THEN 1 ELSE 0 END) AS conditional,
        SUM(CASE WHEN outcome = 'PENDING' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN outcome = 'PENDING' AND inspection_date < CURDATE() THEN 1 ELSE 0 END) AS overdue
       FROM pm_inspection_requests ${pFilter}`,
      params
    );

    // 2. Defects & Non-Conformances counts
    const [defectStats] = await query(
      `SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN issue_type = 'DEFECT' AND status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS open_defects,
        SUM(CASE WHEN issue_type = 'NON_CONFORMANCE' AND status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS open_ncrs,
        SUM(CASE WHEN status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS resolved_count,
        SUM(CASE WHEN severity = 'CRITICAL' AND status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS critical_open,
        SUM(CASE WHEN target_resolution_date < CURDATE() AND status NOT IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) AS overdue_defects
       FROM pm_quality_defects ${pFilter}`,
      params
    );

    // 3. CAPA counts
    const [capaStats] = await query(
      `SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status IN ('OPEN', 'IN_PROGRESS', 'AWAITING_VERIFICATION') THEN 1 ELSE 0 END) AS pending_capa,
        SUM(CASE WHEN status IN ('VERIFIED', 'CLOSED') THEN 1 ELSE 0 END) AS completed_capa,
        SUM(CASE WHEN target_completion_date < CURDATE() AND status NOT IN ('VERIFIED', 'CLOSED') THEN 1 ELSE 0 END) AS overdue_capa
       FROM pm_capa_actions ${pFilter}`,
      params
    );

    // 4. Quality Plans count
    const [planStats] = await query(
      `SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active
       FROM pm_quality_plans ${pFilter}`,
      params
    );

    // Calculate rates
    const totalCompletedInsp = Number(inspStats?.passed || 0) + Number(inspStats?.failed || 0) + Number(inspStats?.conditional || 0);
    const passRate = totalCompletedInsp > 0 ? Math.round(((Number(inspStats?.passed || 0) + Number(inspStats?.conditional || 0)) / totalCompletedInsp) * 100) : 100;

    const totalDefectsAll = Number(defectStats?.total || 0);
    const defectResolutionRate = totalDefectsAll > 0 ? Math.round((Number(defectStats?.resolved_count || 0) / totalDefectsAll) * 100) : 100;

    // Recent activity feed (latest audit logs or records)
    let feedSql = `
      SELECT 
        a.id, a.project_id, p.project_name, a.entity_type, a.entity_id, a.action, 
        a.old_status, a.new_status, a.details, a.changed_by_name, a.created_at
      FROM pm_quality_audit_logs a
      LEFT JOIN pm_projects p ON p.id = a.project_id
      WHERE a.company_id = :companyId
    `;
    if (projectId) feedSql += ` AND a.project_id = :projectId`;
    feedSql += ` ORDER BY a.id DESC LIMIT 10`;
    const activities = await query(feedSql, params);

    res.json({
      kpis: {
        totalInspections: Number(inspStats?.total || 0),
        passedInspections: Number(inspStats?.passed || 0),
        failedInspections: Number(inspStats?.failed || 0),
        conditionalInspections: Number(inspStats?.conditional || 0),
        pendingInspections: Number(inspStats?.pending || 0),
        overdueInspections: Number(inspStats?.overdue || 0),

        openDefects: Number(defectStats?.open_defects || 0),
        openNCRs: Number(defectStats?.open_ncrs || 0),
        totalDefects: totalDefectsAll,
        resolvedDefects: Number(defectStats?.resolved_count || 0),
        criticalOpenIssues: Number(defectStats?.critical_open || 0),
        overdueIssues: Number(defectStats?.overdue_defects || 0),

        pendingCAPA: Number(capaStats?.pending_capa || 0),
        completedCAPA: Number(capaStats?.completed_capa || 0),
        overdueCAPA: Number(capaStats?.overdue_capa || 0),

        totalPlans: Number(planStats?.total || 0),
        activePlans: Number(planStats?.active || 0),

        passRate,
        defectResolutionRate,
        outstandingQualityIssues: Number(defectStats?.open_defects || 0) + Number(defectStats?.open_ncrs || 0),
      },
      activities: activities || [],
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// 2. QUALITY PLANS & STANDARDS
// -------------------------------------------------------------
export const listQualityPlans = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    await ensureQualityControlTables();
    const projectId = toNumber(req.query.project_id);
    const status = req.query.status;
    const search = req.query.search;

    let sql = `
      SELECT qp.*, p.project_name, p.project_code
      FROM pm_quality_plans qp
      JOIN pm_projects p ON p.id = qp.project_id
      WHERE qp.company_id = :companyId
    `;
    const params = { companyId };
    if (projectId) {
      sql += ` AND qp.project_id = :projectId`;
      params.projectId = projectId;
    }
    if (status && status !== "ALL") {
      sql += ` AND qp.status = :status`;
      params.status = status;
    }
    if (search) {
      sql += ` AND (qp.plan_reference LIKE :search OR qp.plan_name LIKE :search OR qp.quality_standard LIKE :search OR qp.responsible_person LIKE :search)`;
      params.search = `%${search}%`;
    }
    sql += ` ORDER BY qp.id DESC`;

    const items = await query(sql, params);
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

export const createQualityPlan = async (req, res, next) => {
  try {
    const { companyId, branchId } = req.scope || {};
    await ensureQualityControlTables();
    const b = req.body || {};
    if (!b.project_id || !b.plan_name) {
      throw httpError(400, "VALIDATION_ERROR", "Project and Quality Plan Name are required");
    }

    // Auto-generate plan reference if not provided
    let planReference = String(b.plan_reference || "").trim();
    if (!planReference) {
      const [seq] = await query(
        `SELECT COUNT(*) + 1 AS nextSeq FROM pm_quality_plans WHERE company_id = :companyId AND project_id = :projectId`,
        { companyId, projectId: toNumber(b.project_id) }
      );
      planReference = `QP-${String(b.project_id).padStart(3, "0")}-${String(seq?.nextSeq || 1).padStart(3, "0")}`;
    }

    const result = await query(
      `INSERT INTO pm_quality_plans 
        (company_id, branch_id, project_id, plan_reference, plan_name, description, quality_standard, 
         quality_requirements, acceptance_criteria, responsible_person, work_plan_task_id, 
         work_plan_task_name, applicable_deliverable, testing_frequency, supporting_documents, status, created_by)
       VALUES 
        (:companyId, :branchId, :project_id, :planReference, :plan_name, :description, :quality_standard, 
         :quality_requirements, :acceptance_criteria, :responsible_person, :work_plan_task_id, 
         :work_plan_task_name, :applicable_deliverable, :testing_frequency, :supporting_documents, :status, :created_by)`,
      {
        companyId,
        branchId: branchId || null,
        project_id: toNumber(b.project_id),
        planReference,
        plan_name: b.plan_name,
        description: b.description || null,
        quality_standard: b.quality_standard || "ISO 9001:2015",
        quality_requirements: b.quality_requirements || null,
        acceptance_criteria: b.acceptance_criteria || null,
        responsible_person: b.responsible_person || null,
        work_plan_task_id: toNumber(b.work_plan_task_id),
        work_plan_task_name: b.work_plan_task_name || null,
        applicable_deliverable: b.applicable_deliverable || null,
        testing_frequency: b.testing_frequency || "Milestone Delivery",
        supporting_documents: b.supporting_documents || null,
        status: b.status || "ACTIVE",
        created_by: req.user?.id || null,
      }
    );

    await logQualityAudit(
      companyId,
      b.project_id,
      "PLAN",
      result.insertId,
      "CREATED",
      null,
      b.status || "ACTIVE",
      `Quality Plan created: ${b.plan_name} (${planReference})`,
      req.user?.username || req.user?.full_name
    );

    res.status(201).json({ id: result.insertId, plan_reference: planReference, message: "Quality plan created successfully" });
  } catch (err) {
    next(err);
  }
};

export const updateQualityPlan = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    const b = req.body || {};

    const [existing] = await query(`SELECT * FROM pm_quality_plans WHERE id = :id AND company_id = :companyId`, { id, companyId });
    if (!existing) throw httpError(404, "NOT_FOUND", "Quality plan not found");

    await query(
      `UPDATE pm_quality_plans SET 
        plan_name = :plan_name,
        description = :description,
        quality_standard = :quality_standard,
        quality_requirements = :quality_requirements,
        acceptance_criteria = :acceptance_criteria,
        responsible_person = :responsible_person,
        work_plan_task_id = :work_plan_task_id,
        work_plan_task_name = :work_plan_task_name,
        applicable_deliverable = :applicable_deliverable,
        testing_frequency = :testing_frequency,
        supporting_documents = :supporting_documents,
        status = :status
       WHERE id = :id AND company_id = :companyId`,
      {
        id,
        companyId,
        plan_name: b.plan_name || existing.plan_name,
        description: b.description !== undefined ? b.description : existing.description,
        quality_standard: b.quality_standard || existing.quality_standard,
        quality_requirements: b.quality_requirements !== undefined ? b.quality_requirements : existing.quality_requirements,
        acceptance_criteria: b.acceptance_criteria !== undefined ? b.acceptance_criteria : existing.acceptance_criteria,
        responsible_person: b.responsible_person !== undefined ? b.responsible_person : existing.responsible_person,
        work_plan_task_id: toNumber(b.work_plan_task_id) || existing.work_plan_task_id,
        work_plan_task_name: b.work_plan_task_name !== undefined ? b.work_plan_task_name : existing.work_plan_task_name,
        applicable_deliverable: b.applicable_deliverable !== undefined ? b.applicable_deliverable : existing.applicable_deliverable,
        testing_frequency: b.testing_frequency || existing.testing_frequency,
        supporting_documents: b.supporting_documents !== undefined ? b.supporting_documents : existing.supporting_documents,
        status: b.status || existing.status,
      }
    );

    if (existing.status !== (b.status || existing.status)) {
      await logQualityAudit(
        companyId,
        existing.project_id,
        "PLAN",
        id,
        "STATUS_CHANGE",
        existing.status,
        b.status,
        `Quality plan status changed to ${b.status}`,
        req.user?.username || req.user?.full_name
      );
    }

    res.json({ message: "Quality plan updated successfully" });
  } catch (err) {
    next(err);
  }
};

export const deleteQualityPlan = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    await query(`DELETE FROM pm_quality_plans WHERE id = :id AND company_id = :companyId`, { id, companyId });
    res.json({ message: "Quality plan removed" });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// 3. INSPECTIONS & TESTS
// -------------------------------------------------------------
export const listInspections = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    await ensureQualityControlTables();
    const projectId = toNumber(req.query.project_id);
    const outcome = req.query.outcome;
    const type = req.query.type;
    const search = req.query.search;

    let sql = `
      SELECT 
        ir.*, 
        p.project_name, 
        p.project_code,
        qp.plan_name,
        d.issue_reference AS defect_ref,
        d.status AS defect_status
      FROM pm_inspection_requests ir
      JOIN pm_projects p ON p.id = ir.project_id
      LEFT JOIN pm_quality_plans qp ON qp.id = ir.plan_id
      LEFT JOIN pm_quality_defects d ON d.id = ir.defect_id
      WHERE ir.company_id = :companyId
    `;
    const params = { companyId };
    if (projectId) {
      sql += ` AND ir.project_id = :projectId`;
      params.projectId = projectId;
    }
    if (outcome && outcome !== "ALL") {
      sql += ` AND ir.outcome = :outcome`;
      params.outcome = outcome;
    }
    if (type && type !== "ALL") {
      sql += ` AND ir.inspection_type = :type`;
      params.type = type;
    }
    if (search) {
      sql += ` AND (ir.request_no LIKE :search OR ir.inspection_title LIKE :search OR ir.inspector_name LIKE :search OR ir.work_plan_task_name LIKE :search)`;
      params.search = `%${search}%`;
    }
    sql += ` ORDER BY ir.id DESC`;

    const items = await query(sql, params);
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

export const createInspection = async (req, res, next) => {
  try {
    const { companyId, branchId } = req.scope || {};
    await ensureQualityControlTables();
    const b = req.body || {};
    if (!b.project_id || !b.inspection_title) {
      throw httpError(400, "VALIDATION_ERROR", "Project and Inspection Title are required");
    }

    // Auto-generate request_no if not supplied
    let requestNo = String(b.request_no || b.ir_number || "").trim();
    if (!requestNo) {
      const [seq] = await query(
        `SELECT COUNT(*) + 1 AS nextSeq FROM pm_inspection_requests WHERE company_id = :companyId AND project_id = :projectId`,
        { companyId, projectId: toNumber(b.project_id) }
      );
      requestNo = `INS-${String(b.project_id).padStart(3, "0")}-${String(seq?.nextSeq || 1).padStart(3, "0")}`;
    }

    // Parse & evaluate checklist items to compute outcome
    let checklist = [];
    if (Array.isArray(b.checklist_items)) {
      checklist = b.checklist_items;
    } else if (typeof b.checklist_json === "string") {
      try { checklist = JSON.parse(b.checklist_json); } catch (e) {}
    } else if (Array.isArray(b.checklist_json)) {
      checklist = b.checklist_json;
    }

    let calculatedOutcome = b.outcome || "PENDING";
    if (checklist && checklist.length > 0) {
      const hasFail = checklist.some((item) => String(item.outcome).toUpperCase() === "FAIL");
      const allPassOrNA = checklist.every((item) => ["PASS", "NA"].includes(String(item.outcome).toUpperCase()));
      if (hasFail) {
        calculatedOutcome = "FAILED";
      } else if (allPassOrNA && calculatedOutcome === "PENDING") {
        calculatedOutcome = "PASSED";
      }
    }
    // Respect explicit CONDITIONAL_PASS if provided by user
    if (b.outcome === "CONDITIONAL_PASS") {
      calculatedOutcome = "CONDITIONAL_PASS";
    }

    const result = await query(
      `INSERT INTO pm_inspection_requests 
        (company_id, branch_id, project_id, plan_id, request_no, inspection_title, inspection_type, 
         work_plan_task_id, work_plan_task_name, deliverable_name, location, inspection_date, 
         inspector_name, expected_result, actual_result, outcome, status, checklist_json, 
         findings, comments, attachments_json, created_by)
       VALUES 
        (:companyId, :branchId, :project_id, :plan_id, :requestNo, :inspection_title, :inspection_type, 
         :work_plan_task_id, :work_plan_task_name, :deliverable_name, :location, :inspection_date, 
         :inspector_name, :expected_result, :actual_result, :outcome, :status, :checklist_json, 
         :findings, :comments, :attachments_json, :created_by)`,
      {
        companyId,
        branchId: branchId || null,
        project_id: toNumber(b.project_id),
        plan_id: toNumber(b.plan_id),
        requestNo,
        inspection_title: b.inspection_title,
        inspection_type: b.inspection_type || "Routine Inspection",
        work_plan_task_id: toNumber(b.work_plan_task_id),
        work_plan_task_name: b.work_plan_task_name || null,
        deliverable_name: b.deliverable_name || null,
        location: b.location || null,
        inspection_date: b.inspection_date || new Date().toISOString().split("T")[0],
        inspector_name: b.inspector_name || null,
        expected_result: b.expected_result || null,
        actual_result: b.actual_result || null,
        outcome: calculatedOutcome,
        status: calculatedOutcome === "PENDING" ? "SCHEDULED" : "COMPLETED",
        checklist_json: checklist.length > 0 ? JSON.stringify(checklist) : null,
        findings: b.findings || null,
        comments: b.comments || null,
        attachments_json: b.attachments_json ? (typeof b.attachments_json === "string" ? b.attachments_json : JSON.stringify(b.attachments_json)) : null,
        created_by: req.user?.id || null,
      }
    );

    const newId = result.insertId;

    await logQualityAudit(
      companyId,
      b.project_id,
      "INSPECTION",
      newId,
      "CREATED",
      null,
      calculatedOutcome,
      `Inspection recorded: ${b.inspection_title} (${requestNo}) - Outcome: ${calculatedOutcome}`,
      req.user?.username || req.user?.full_name
    );

    // If failed and user requested auto defect creation
    let createdDefectId = null;
    if (calculatedOutcome === "FAILED" && (b.create_defect_now || b.raise_defect)) {
      const [defectSeq] = await query(
        `SELECT COUNT(*) + 1 AS nextSeq FROM pm_quality_defects WHERE company_id = :companyId AND project_id = :projectId`,
        { companyId, projectId: toNumber(b.project_id) }
      );
      const defRef = `DEF-${String(b.project_id).padStart(3, "0")}-${String(defectSeq?.nextSeq || 1).padStart(3, "0")}`;

      const defResult = await query(
        `INSERT INTO pm_quality_defects 
          (company_id, branch_id, project_id, issue_reference, issue_type, title, description, 
           date_identified, inspection_id, work_plan_task_id, work_plan_task_name, deliverable_name, 
           location, severity, priority, responsible_person, root_cause, proposed_resolution, 
           target_resolution_date, status, created_by)
         VALUES 
          (:companyId, :branchId, :project_id, :issue_reference, :issue_type, :title, :description, 
           :date_identified, :inspection_id, :work_plan_task_id, :work_plan_task_name, :deliverable_name, 
           :location, :severity, :priority, :responsible_person, :root_cause, :proposed_resolution, 
           :target_resolution_date, 'OPEN', :created_by)`,
        {
          companyId,
          branchId: branchId || null,
          project_id: toNumber(b.project_id),
          issue_reference: defRef,
          issue_type: b.issue_type === "NON_CONFORMANCE" ? "NON_CONFORMANCE" : "DEFECT",
          title: `Defect from Inspection: ${b.inspection_title}`,
          description: b.findings || b.comments || `Inspection failed during ${b.inspection_type}. Actual result: ${b.actual_result || "Non-compliant"}`,
          date_identified: b.inspection_date || new Date().toISOString().split("T")[0],
          inspection_id: newId,
          work_plan_task_id: toNumber(b.work_plan_task_id),
          work_plan_task_name: b.work_plan_task_name || null,
          deliverable_name: b.deliverable_name || null,
          location: b.location || null,
          severity: b.severity || "MAJOR",
          priority: b.priority || "HIGH",
          responsible_person: b.responsible_person || b.inspector_name || null,
          root_cause: b.root_cause || null,
          proposed_resolution: b.proposed_resolution || null,
          target_resolution_date: b.target_resolution_date || null,
          created_by: req.user?.id || null,
        }
      );

      createdDefectId = defResult.insertId;

      await query(
        `UPDATE pm_inspection_requests SET has_defect = 1, defect_id = :defectId WHERE id = :id`,
        { defectId: createdDefectId, id: newId }
      );
    }

    res.status(201).json({
      id: newId,
      request_no: requestNo,
      outcome: calculatedOutcome,
      defect_id: createdDefectId,
      message: "Inspection logged successfully",
    });
  } catch (err) {
    next(err);
  }
};

export const updateInspection = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    const b = req.body || {};

    const [existing] = await query(`SELECT * FROM pm_inspection_requests WHERE id = :id AND company_id = :companyId`, { id, companyId });
    if (!existing) throw httpError(404, "NOT_FOUND", "Inspection not found");

    let checklist = b.checklist_items || b.checklist_json;
    if (typeof checklist === "string") {
      try { checklist = JSON.parse(checklist); } catch (e) {}
    }

    let calculatedOutcome = b.outcome || existing.outcome;
    if (checklist && Array.isArray(checklist) && checklist.length > 0) {
      const hasFail = checklist.some((item) => String(item.outcome).toUpperCase() === "FAIL");
      if (hasFail) {
        calculatedOutcome = "FAILED";
      } else if (checklist.every((item) => ["PASS", "NA"].includes(String(item.outcome).toUpperCase()))) {
        calculatedOutcome = "PASSED";
      }
    }
    if (b.outcome === "CONDITIONAL_PASS") {
      calculatedOutcome = "CONDITIONAL_PASS";
    }

    await query(
      `UPDATE pm_inspection_requests SET 
        inspection_title = :inspection_title,
        inspection_type = :inspection_type,
        location = :location,
        inspection_date = :inspection_date,
        inspector_name = :inspector_name,
        expected_result = :expected_result,
        actual_result = :actual_result,
        outcome = :outcome,
        status = :status,
        checklist_json = :checklist_json,
        findings = :findings,
        comments = :comments,
        attachments_json = :attachments_json
       WHERE id = :id AND company_id = :companyId`,
      {
        id,
        companyId,
        inspection_title: b.inspection_title || existing.inspection_title,
        inspection_type: b.inspection_type || existing.inspection_type,
        location: b.location !== undefined ? b.location : existing.location,
        inspection_date: b.inspection_date || existing.inspection_date,
        inspector_name: b.inspector_name !== undefined ? b.inspector_name : existing.inspector_name,
        expected_result: b.expected_result !== undefined ? b.expected_result : existing.expected_result,
        actual_result: b.actual_result !== undefined ? b.actual_result : existing.actual_result,
        outcome: calculatedOutcome,
        status: calculatedOutcome === "PENDING" ? "SCHEDULED" : "COMPLETED",
        checklist_json: checklist ? JSON.stringify(checklist) : existing.checklist_json,
        findings: b.findings !== undefined ? b.findings : existing.findings,
        comments: b.comments !== undefined ? b.comments : existing.comments,
        attachments_json: b.attachments_json ? (typeof b.attachments_json === "string" ? b.attachments_json : JSON.stringify(b.attachments_json)) : existing.attachments_json,
      }
    );

    if (existing.outcome !== calculatedOutcome) {
      await logQualityAudit(
        companyId,
        existing.project_id,
        "INSPECTION",
        id,
        "OUTCOME_CHANGE",
        existing.outcome,
        calculatedOutcome,
        `Inspection outcome updated to ${calculatedOutcome}`,
        req.user?.username || req.user?.full_name
      );
    }

    res.json({ message: "Inspection updated successfully", outcome: calculatedOutcome });
  } catch (err) {
    next(err);
  }
};

export const raiseDefectFromInspection = async (req, res, next) => {
  try {
    const { companyId, branchId } = req.scope || {};
    const inspectionId = toNumber(req.params.id);
    const b = req.body || {};

    const [insp] = await query(`SELECT * FROM pm_inspection_requests WHERE id = :inspectionId AND company_id = :companyId`, { inspectionId, companyId });
    if (!insp) throw httpError(404, "NOT_FOUND", "Inspection record not found");

    // Prevent duplicate defect if already exists
    if (insp.has_defect && insp.defect_id) {
      const [existingDef] = await query(`SELECT * FROM pm_quality_defects WHERE id = :defectId`, { defectId: insp.defect_id });
      if (existingDef) {
        return res.json({
          id: existingDef.id,
          issue_reference: existingDef.issue_reference,
          message: "Defect already exists for this inspection",
          already_exists: true,
        });
      }
    }

    const isNCR = b.issue_type === "NON_CONFORMANCE";
    const prefix = isNCR ? "NCR" : "DEF";

    const [seq] = await query(
      `SELECT COUNT(*) + 1 AS nextSeq FROM pm_quality_defects WHERE company_id = :companyId AND project_id = :projectId`,
      { companyId, projectId: insp.project_id }
    );
    const issueRef = `${prefix}-${String(insp.project_id).padStart(3, "0")}-${String(seq?.nextSeq || 1).padStart(3, "0")}`;

    const defResult = await query(
      `INSERT INTO pm_quality_defects 
        (company_id, branch_id, project_id, issue_reference, issue_type, title, description, 
         date_identified, inspection_id, work_plan_task_id, work_plan_task_name, deliverable_name, 
         location, severity, priority, responsible_person, root_cause, proposed_resolution, 
         target_resolution_date, status, created_by)
       VALUES 
        (:companyId, :branchId, :project_id, :issue_reference, :issue_type, :title, :description, 
         :date_identified, :inspection_id, :work_plan_task_id, :work_plan_task_name, :deliverable_name, 
         :location, :severity, :priority, :responsible_person, :root_cause, :proposed_resolution, 
         :target_resolution_date, 'OPEN', :created_by)`,
      {
        companyId,
        branchId: branchId || null,
        project_id: insp.project_id,
        issue_reference: issueRef,
        issue_type: isNCR ? "NON_CONFORMANCE" : "DEFECT",
        title: b.title || `Quality Issue: ${insp.inspection_title}`,
        description: b.description || insp.findings || insp.comments || `Inspection ${insp.request_no} failed.`,
        date_identified: b.date_identified || insp.inspection_date || new Date().toISOString().split("T")[0],
        inspection_id: inspectionId,
        work_plan_task_id: insp.work_plan_task_id || toNumber(b.work_plan_task_id),
        work_plan_task_name: insp.work_plan_task_name || b.work_plan_task_name || null,
        deliverable_name: insp.deliverable_name || b.deliverable_name || null,
        location: b.location || insp.location || null,
        severity: b.severity || "MAJOR",
        priority: b.priority || "HIGH",
        responsible_person: b.responsible_person || null,
        root_cause: b.root_cause || null,
        proposed_resolution: b.proposed_resolution || null,
        target_resolution_date: b.target_resolution_date || null,
        created_by: req.user?.id || null,
      }
    );

    const defectId = defResult.insertId;

    // Link inspection to defect
    await query(
      `UPDATE pm_inspection_requests SET has_defect = 1, defect_id = :defectId WHERE id = :inspectionId`,
      { defectId, inspectionId }
    );

    // Also mirror to legacy pm_ncrs if it is NCR
    if (isNCR) {
      await query(
        `INSERT INTO pm_ncrs 
          (company_id, branch_id, project_id, ncr_no, title, description, trade_discipline, 
           root_cause, corrective_action, responsible_person, due_date, status, created_by)
         VALUES 
          (:companyId, :branchId, :project_id, :ncr_no, :title, :description, 'General QA', 
           :root_cause, :corrective_action, :responsible_person, :due_date, 'OPEN', :created_by)
         ON DUPLICATE KEY UPDATE title = VALUES(title)`,
        {
          companyId,
          branchId: branchId || null,
          project_id: insp.project_id,
          ncr_no: issueRef,
          title: b.title || `NCR: ${insp.inspection_title}`,
          description: b.description || insp.findings || "Non-conformance identified during inspection",
          root_cause: b.root_cause || null,
          corrective_action: b.proposed_resolution || null,
          responsible_person: b.responsible_person || null,
          due_date: b.target_resolution_date || null,
          created_by: req.user?.id || null,
        }
      ).catch(() => {});
    }

    await logQualityAudit(
      companyId,
      insp.project_id,
      "DEFECT",
      defectId,
      "RAISED_FROM_INSPECTION",
      null,
      "OPEN",
      `${isNCR ? "Non-Conformance" : "Defect"} raised from Inspection ${insp.request_no}: ${issueRef}`,
      req.user?.username || req.user?.full_name
    );

    res.status(201).json({
      id: defectId,
      issue_reference: issueRef,
      message: `${isNCR ? "Non-Conformance" : "Defect"} raised successfully`,
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// 4. DEFECTS & NON-CONFORMANCE MANAGEMENT
// -------------------------------------------------------------
export const listDefects = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    await ensureQualityControlTables();
    const projectId = toNumber(req.query.project_id);
    const issueType = req.query.issue_type;
    const severity = req.query.severity;
    const status = req.query.status;
    const search = req.query.search;

    let sql = `
      SELECT 
        d.*, 
        p.project_name, 
        p.project_code,
        ir.request_no AS inspection_ref,
        ir.inspection_title,
        (SELECT COUNT(*) FROM pm_capa_actions c WHERE c.defect_id = d.id) AS capa_count
      FROM pm_quality_defects d
      JOIN pm_projects p ON p.id = d.project_id
      LEFT JOIN pm_inspection_requests ir ON ir.id = d.inspection_id
      WHERE d.company_id = :companyId
    `;
    const params = { companyId };
    if (projectId) {
      sql += ` AND d.project_id = :projectId`;
      params.projectId = projectId;
    }
    if (issueType && issueType !== "ALL") {
      sql += ` AND d.issue_type = :issueType`;
      params.issueType = issueType;
    }
    if (severity && severity !== "ALL") {
      sql += ` AND d.severity = :severity`;
      params.severity = severity;
    }
    if (status && status !== "ALL") {
      sql += ` AND d.status = :status`;
      params.status = status;
    }
    if (search) {
      sql += ` AND (d.issue_reference LIKE :search OR d.title LIKE :search OR d.responsible_person LIKE :search OR d.work_plan_task_name LIKE :search)`;
      params.search = `%${search}%`;
    }
    sql += ` ORDER BY d.id DESC`;

    const items = await query(sql, params);
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

export const createDefect = async (req, res, next) => {
  try {
    const { companyId, branchId } = req.scope || {};
    await ensureQualityControlTables();
    const b = req.body || {};
    if (!b.project_id || !b.title) {
      throw httpError(400, "VALIDATION_ERROR", "Project and Title are required");
    }

    const isNCR = b.issue_type === "NON_CONFORMANCE";
    const prefix = isNCR ? "NCR" : "DEF";

    let issueReference = String(b.issue_reference || "").trim();
    if (!issueReference) {
      const [seq] = await query(
        `SELECT COUNT(*) + 1 AS nextSeq FROM pm_quality_defects WHERE company_id = :companyId AND project_id = :projectId`,
        { companyId, projectId: toNumber(b.project_id) }
      );
      issueReference = `${prefix}-${String(b.project_id).padStart(3, "0")}-${String(seq?.nextSeq || 1).padStart(3, "0")}`;
    }

    const result = await query(
      `INSERT INTO pm_quality_defects 
        (company_id, branch_id, project_id, issue_reference, issue_type, title, description, 
         date_identified, inspection_id, work_plan_task_id, work_plan_task_name, deliverable_name, 
         location, severity, priority, responsible_person, root_cause, proposed_resolution, 
         target_resolution_date, status, resolution_evidence, resolution_remarks, created_by)
       VALUES 
        (:companyId, :branchId, :project_id, :issueReference, :issue_type, :title, :description, 
         :date_identified, :inspection_id, :work_plan_task_id, :work_plan_task_name, :deliverable_name, 
         :location, :severity, :priority, :responsible_person, :root_cause, :proposed_resolution, 
         :target_resolution_date, :status, :resolution_evidence, :resolution_remarks, :created_by)`,
      {
        companyId,
        branchId: branchId || null,
        project_id: toNumber(b.project_id),
        issueReference,
        issue_type: isNCR ? "NON_CONFORMANCE" : "DEFECT",
        title: b.title,
        description: b.description || b.title,
        date_identified: b.date_identified || new Date().toISOString().split("T")[0],
        inspection_id: toNumber(b.inspection_id),
        work_plan_task_id: toNumber(b.work_plan_task_id),
        work_plan_task_name: b.work_plan_task_name || null,
        deliverable_name: b.deliverable_name || null,
        location: b.location || null,
        severity: b.severity || "MAJOR",
        priority: b.priority || "MEDIUM",
        responsible_person: b.responsible_person || null,
        root_cause: b.root_cause || null,
        proposed_resolution: b.proposed_resolution || null,
        target_resolution_date: b.target_resolution_date || null,
        status: b.status || "OPEN",
        resolution_evidence: b.resolution_evidence || null,
        resolution_remarks: b.resolution_remarks || null,
        created_by: req.user?.id || null,
      }
    );

    const newId = result.insertId;

    await logQualityAudit(
      companyId,
      b.project_id,
      "DEFECT",
      newId,
      "CREATED",
      null,
      b.status || "OPEN",
      `${isNCR ? "Non-Conformance" : "Defect"} recorded: ${b.title} (${issueReference})`,
      req.user?.username || req.user?.full_name
    );

    res.status(201).json({ id: newId, issue_reference: issueReference, message: "Quality issue logged successfully" });
  } catch (err) {
    next(err);
  }
};

export const updateDefect = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    const b = req.body || {};

    const [existing] = await query(`SELECT * FROM pm_quality_defects WHERE id = :id AND company_id = :companyId`, { id, companyId });
    if (!existing) throw httpError(404, "NOT_FOUND", "Defect record not found");

    const newStatus = b.status || existing.status;

    // Rule: Prevent quality issues from being marked closed without required resolution evidence and verification
    if (newStatus === "CLOSED" && existing.status !== "CLOSED") {
      const evidence = b.resolution_evidence || existing.resolution_evidence;
      const remarks = b.resolution_remarks || existing.resolution_remarks;
      if (!evidence && !remarks) {
        throw httpError(400, "CLOSURE_BLOCKED", "Cannot close a quality defect or NCR without recording resolution evidence or verification remarks.");
      }
    }

    const isClosing = newStatus === "CLOSED" && existing.status !== "CLOSED";

    await query(
      `UPDATE pm_quality_defects SET 
        title = :title,
        description = :description,
        date_identified = :date_identified,
        work_plan_task_id = :work_plan_task_id,
        work_plan_task_name = :work_plan_task_name,
        deliverable_name = :deliverable_name,
        location = :location,
        severity = :severity,
        priority = :priority,
        responsible_person = :responsible_person,
        root_cause = :root_cause,
        proposed_resolution = :proposed_resolution,
        target_resolution_date = :target_resolution_date,
        actual_resolution_date = :actual_resolution_date,
        resolution_evidence = :resolution_evidence,
        resolution_remarks = :resolution_remarks,
        status = :status,
        closed_by = :closed_by,
        closed_at = :closed_at
       WHERE id = :id AND company_id = :companyId`,
      {
        id,
        companyId,
        title: b.title || existing.title,
        description: b.description !== undefined ? b.description : existing.description,
        date_identified: b.date_identified || existing.date_identified,
        work_plan_task_id: toNumber(b.work_plan_task_id) || existing.work_plan_task_id,
        work_plan_task_name: b.work_plan_task_name !== undefined ? b.work_plan_task_name : existing.work_plan_task_name,
        deliverable_name: b.deliverable_name !== undefined ? b.deliverable_name : existing.deliverable_name,
        location: b.location !== undefined ? b.location : existing.location,
        severity: b.severity || existing.severity,
        priority: b.priority || existing.priority,
        responsible_person: b.responsible_person !== undefined ? b.responsible_person : existing.responsible_person,
        root_cause: b.root_cause !== undefined ? b.root_cause : existing.root_cause,
        proposed_resolution: b.proposed_resolution !== undefined ? b.proposed_resolution : existing.proposed_resolution,
        target_resolution_date: b.target_resolution_date || existing.target_resolution_date,
        actual_resolution_date: b.actual_resolution_date || (newStatus === "RESOLVED" || newStatus === "CLOSED" ? new Date().toISOString().split("T")[0] : existing.actual_resolution_date),
        resolution_evidence: b.resolution_evidence !== undefined ? b.resolution_evidence : existing.resolution_evidence,
        resolution_remarks: b.resolution_remarks !== undefined ? b.resolution_remarks : existing.resolution_remarks,
        status: newStatus,
        closed_by: isClosing ? req.user?.id : existing.closed_by,
        closed_at: isClosing ? new Date() : existing.closed_at,
      }
    );

    if (existing.status !== newStatus) {
      await logQualityAudit(
        companyId,
        existing.project_id,
        "DEFECT",
        id,
        "STATUS_CHANGE",
        existing.status,
        newStatus,
        `Issue status updated to ${newStatus}`,
        req.user?.username || req.user?.full_name
      );
    }

    res.json({ message: "Defect record updated successfully" });
  } catch (err) {
    next(err);
  }
};

export const deleteDefect = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    await query(`DELETE FROM pm_capa_actions WHERE defect_id = :id AND company_id = :companyId`, { id, companyId });
    await query(`DELETE FROM pm_quality_defects WHERE id = :id AND company_id = :companyId`, { id, companyId });
    res.json({ message: "Defect record and associated actions deleted" });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------
// 5. CORRECTIVE & PREVENTIVE ACTIONS (CAPA)
// -------------------------------------------------------------
export const listCAPAs = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    await ensureQualityControlTables();
    const projectId = toNumber(req.query.project_id);
    const defectId = toNumber(req.query.defect_id);
    const actionType = req.query.action_type;
    const status = req.query.status;
    const search = req.query.search;

    let sql = `
      SELECT 
        c.*, 
        p.project_name, 
        p.project_code,
        d.issue_reference AS defect_ref,
        d.title AS defect_title,
        d.severity AS defect_severity
      FROM pm_capa_actions c
      JOIN pm_projects p ON p.id = c.project_id
      LEFT JOIN pm_quality_defects d ON d.id = c.defect_id
      WHERE c.company_id = :companyId
    `;
    const params = { companyId };
    if (projectId) {
      sql += ` AND c.project_id = :projectId`;
      params.projectId = projectId;
    }
    if (defectId) {
      sql += ` AND c.defect_id = :defectId`;
      params.defectId = defectId;
    }
    if (actionType && actionType !== "ALL") {
      sql += ` AND c.action_type = :actionType`;
      params.actionType = actionType;
    }
    if (status && status !== "ALL") {
      sql += ` AND c.status = :status`;
      params.status = status;
    }
    if (search) {
      sql += ` AND (c.capa_reference LIKE :search OR c.proposed_action LIKE :search OR c.responsible_person LIKE :search OR d.issue_reference LIKE :search)`;
      params.search = `%${search}%`;
    }
    sql += ` ORDER BY c.id DESC`;

    const items = await query(sql, params);
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

export const createCAPA = async (req, res, next) => {
  try {
    const { companyId, branchId } = req.scope || {};
    await ensureQualityControlTables();
    const b = req.body || {};
    if (!b.project_id || !b.proposed_action) {
      throw httpError(400, "VALIDATION_ERROR", "Project and Proposed Action description are required");
    }

    let capaReference = String(b.capa_reference || "").trim();
    if (!capaReference) {
      const [seq] = await query(
        `SELECT COUNT(*) + 1 AS nextSeq FROM pm_capa_actions WHERE company_id = :companyId AND project_id = :projectId`,
        { companyId, projectId: toNumber(b.project_id) }
      );
      capaReference = `CAPA-${String(b.project_id).padStart(3, "0")}-${String(seq?.nextSeq || 1).padStart(3, "0")}`;
    }

    const result = await query(
      `INSERT INTO pm_capa_actions 
        (company_id, branch_id, project_id, capa_reference, defect_id, action_type, root_cause, 
         proposed_action, responsible_person, target_completion_date, verification_method, 
         status, supporting_evidence, created_by)
       VALUES 
        (:companyId, :branchId, :project_id, :capaReference, :defect_id, :action_type, :root_cause, 
         :proposed_action, :responsible_person, :target_completion_date, :verification_method, 
         :status, :supporting_evidence, :created_by)`,
      {
        companyId,
        branchId: branchId || null,
        project_id: toNumber(b.project_id),
        capaReference,
        defect_id: toNumber(b.defect_id),
        action_type: b.action_type || "CORRECTIVE",
        root_cause: b.root_cause || null,
        proposed_action: b.proposed_action,
        responsible_person: b.responsible_person || null,
        target_completion_date: b.target_completion_date || null,
        verification_method: b.verification_method || "Re-inspection & Technical Audit",
        status: b.status || "OPEN",
        supporting_evidence: b.supporting_evidence || null,
        created_by: req.user?.id || null,
      }
    );

    const newId = result.insertId;

    // Auto-update defect status to 'CORRECTIVE_ACTION_IN_PROGRESS' if currently 'OPEN'
    if (b.defect_id) {
      await query(
        `UPDATE pm_quality_defects SET status = 'CORRECTIVE_ACTION_IN_PROGRESS' 
         WHERE id = :defectId AND status = 'OPEN'`,
        { defectId: toNumber(b.defect_id) }
      );
    }

    await logQualityAudit(
      companyId,
      b.project_id,
      "CAPA",
      newId,
      "CREATED",
      null,
      b.status || "OPEN",
      `CAPA action planned: ${capaReference} (${b.action_type})`,
      req.user?.username || req.user?.full_name
    );

    res.status(201).json({ id: newId, capa_reference: capaReference, message: "CAPA action created successfully" });
  } catch (err) {
    next(err);
  }
};

export const updateCAPA = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    const b = req.body || {};

    const [existing] = await query(`SELECT * FROM pm_capa_actions WHERE id = :id AND company_id = :companyId`, { id, companyId });
    if (!existing) throw httpError(404, "NOT_FOUND", "CAPA action not found");

    const newStatus = b.status || existing.status;
    const isVerified = newStatus === "VERIFIED" && existing.status !== "VERIFIED";

    await query(
      `UPDATE pm_capa_actions SET 
        action_type = :action_type,
        root_cause = :root_cause,
        proposed_action = :proposed_action,
        responsible_person = :responsible_person,
        target_completion_date = :target_completion_date,
        actual_completion_date = :actual_completion_date,
        verification_method = :verification_method,
        verification_result = :verification_result,
        verification_notes = :verification_notes,
        verified_by = :verified_by,
        verified_at = :verified_at,
        status = :status,
        supporting_evidence = :supporting_evidence
       WHERE id = :id AND company_id = :companyId`,
      {
        id,
        companyId,
        action_type: b.action_type || existing.action_type,
        root_cause: b.root_cause !== undefined ? b.root_cause : existing.root_cause,
        proposed_action: b.proposed_action || existing.proposed_action,
        responsible_person: b.responsible_person !== undefined ? b.responsible_person : existing.responsible_person,
        target_completion_date: b.target_completion_date || existing.target_completion_date,
        actual_completion_date: b.actual_completion_date || (newStatus === "AWAITING_VERIFICATION" || newStatus === "VERIFIED" || newStatus === "CLOSED" ? new Date().toISOString().split("T")[0] : existing.actual_completion_date),
        verification_method: b.verification_method || existing.verification_method,
        verification_result: b.verification_result || existing.verification_result,
        verification_notes: b.verification_notes !== undefined ? b.verification_notes : existing.verification_notes,
        verified_by: isVerified ? (req.user?.username || req.user?.full_name || "QA Lead") : existing.verified_by,
        verified_at: isVerified ? new Date() : existing.verified_at,
        status: newStatus,
        supporting_evidence: b.supporting_evidence !== undefined ? b.supporting_evidence : existing.supporting_evidence,
      }
    );

    // If reopening action because verification was ineffective
    if (b.verification_result === "INEFFECTIVE_REOPENED" || (b.reopen_action && newStatus === "OPEN")) {
      await logQualityAudit(
        companyId,
        existing.project_id,
        "CAPA",
        id,
        "REOPENED",
        existing.status,
        "OPEN",
        `CAPA reopened - verification ineffective: ${b.verification_notes || "Action did not fully resolve problem"}`,
        req.user?.username || req.user?.full_name
      );
    } else if (existing.status !== newStatus) {
      await logQualityAudit(
        companyId,
        existing.project_id,
        "CAPA",
        id,
        "STATUS_CHANGE",
        existing.status,
        newStatus,
        `CAPA status updated to ${newStatus}`,
        req.user?.username || req.user?.full_name
      );
    }

    res.json({ message: "CAPA updated successfully" });
  } catch (err) {
    next(err);
  }
};

export const deleteCAPA = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    await query(`DELETE FROM pm_capa_actions WHERE id = :id AND company_id = :companyId`, { id, companyId });
    res.json({ message: "CAPA action deleted" });
  } catch (err) {
    next(err);
  }
};
