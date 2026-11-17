/**
 * @file projectCloseout.controller.js
 * @description General-purpose Project Handover & Closeout controller for OmniSuite ERP.
 * Supports all project types and industries (construction, IT, software, manufacturing, consulting, etc.).
 * Strictly independent: NO approval workflow or approval steps.
 */

import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";

export async function ensureProjectCloseoutTables() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS pm_project_closeouts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        company_id BIGINT UNSIGNED NOT NULL,
        branch_id BIGINT UNSIGNED NULL,
        project_id BIGINT UNSIGNED NOT NULL,
        closeout_status ENUM('DRAFT', 'HANDOVER_COMPLETED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
        
        -- Section B: Completion Verification
        scope_completion_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        deliverables_completion_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        milestones_completion_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        outstanding_tasks_count INT NOT NULL DEFAULT 0,
        outstanding_deliverables_count INT NOT NULL DEFAULT 0,
        completion_remarks TEXT NULL,
        verified_by VARCHAR(200) NULL,
        verification_date DATE NULL,

        -- Section C: Handover & Acceptance
        handover_ref VARCHAR(100) NULL,
        handover_date DATE NULL,
        handover_to VARCHAR(200) NULL,
        receiving_org VARCHAR(200) NULL,
        handover_type VARCHAR(100) NOT NULL DEFAULT 'Client Handover',
        handover_remarks TEXT NULL,
        acceptance_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        acceptance_remarks TEXT NULL,
        accepted_by VARCHAR(200) NULL,
        acceptance_date DATE NULL,
        handover_attachments LONGTEXT NULL,

        -- Section E: Project Closure Review - Financial
        approved_budget DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        actual_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        budget_variance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        outstanding_receivables DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        outstanding_payables DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        financial_closure_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        financial_remarks TEXT NULL,

        -- Contractual Review
        contractual_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        outstanding_claims TEXT NULL,
        outstanding_commitments TEXT NULL,
        warranty_support_obligations TEXT NULL,
        contractual_remarks TEXT NULL,

        -- Resource Release
        personnel_release_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        equipment_release_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        resource_release_date DATE NULL,
        resource_release_remarks TEXT NULL,

        -- Documentation & Records
        documentation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        documents_archived_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        final_reports TEXT NULL,
        supporting_documents LONGTEXT NULL,

        -- Lessons Learned
        project_successes TEXT NULL,
        challenges_encountered TEXT NULL,
        lessons_learned TEXT NULL,
        recommendations TEXT NULL,
        stakeholder_feedback TEXT NULL,
        final_closure_remarks TEXT NULL,

        closed_date DATE NULL,
        closed_by VARCHAR(200) NULL,
        created_by BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        UNIQUE KEY uq_pm_closeout_prj (company_id, project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pm_project_handover_deliverables (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        company_id BIGINT UNSIGNED NOT NULL,
        project_id BIGINT UNSIGNED NOT NULL,
        closeout_id BIGINT UNSIGNED NULL,
        deliverable_name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        quantity DECIMAL(12,2) NULL,
        unit VARCHAR(50) NULL,
        responsible_person VARCHAR(200) NULL,
        handover_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        remarks TEXT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_prj_deliv (company_id, project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pm_project_outstanding_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        company_id BIGINT UNSIGNED NOT NULL,
        project_id BIGINT UNSIGNED NOT NULL,
        closeout_id BIGINT UNSIGNED NULL,
        item_ref VARCHAR(50) NULL,
        item_description TEXT NOT NULL,
        item_category VARCHAR(100) NOT NULL DEFAULT 'Other',
        priority ENUM('URGENT', 'HIGH', 'MEDIUM', 'LOW') NOT NULL DEFAULT 'MEDIUM',
        responsible_person VARCHAR(200) NULL,
        target_resolution_date DATE NULL,
        resolution_status ENUM('Open', 'In Progress', 'Resolved', 'Deferred', 'Cancelled') NOT NULL DEFAULT 'Open',
        resolution_remarks TEXT NULL,
        date_resolved DATE NULL,
        issue_id BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_prj_outst (company_id, project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (err) {
    console.error("[ProjectCloseout] Error ensuring tables:", err);
  }
}

/**
 * List all closeout summaries for registered projects
 */
export async function listAllCloseoutProjects(req, res, next) {
  try {
    const companyId = req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    await ensureProjectCloseoutTables();

    const projects = await query(
      `
      SELECT 
        p.id,
        p.project_code,
        p.project_name,
        p.project_type,
        p.client_name,
        p.manager_name,
        p.start_date,
        p.end_date,
        p.actual_end_date,
        p.project_status,
        p.budget,
        p.completion_percent,
        c.id AS closeout_id,
        COALESCE(c.closeout_status, IF(p.project_status = 'COMPLETED', 'CLOSED', 'DRAFT')) AS closeout_status,
        c.handover_ref,
        c.handover_date,
        c.handover_type,
        c.acceptance_status,
        c.scope_completion_pct,
        c.deliverables_completion_pct,
        c.milestones_completion_pct,
        c.closed_date,
        (SELECT COUNT(*) FROM pm_project_outstanding_items oi WHERE oi.project_id = p.id AND oi.resolution_status IN ('Open', 'In Progress')) AS open_outstanding_items_count,
        (SELECT COUNT(*) FROM pm_project_issues pi WHERE pi.project_id = p.id AND pi.status NOT IN ('CLOSED', 'VERIFIED')) AS open_snags_count
      FROM pm_projects p
      LEFT JOIN pm_project_closeouts c ON c.project_id = p.id AND c.company_id = p.company_id
      WHERE p.company_id = ? AND (p.is_active = 'Y' OR p.is_active IS NULL)
      ORDER BY p.id DESC
      `,
      [companyId]
    );

    res.json({
      success: true,
      data: projects,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get detailed closeout & handover state for a single project
 */
export async function getProjectCloseoutDetails(req, res, next) {
  try {
    const companyId = req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    const { projectId } = req.params;
    await ensureProjectCloseoutTables();

    // 1. Fetch Project Details
    const projectRows = await query(
      `SELECT * FROM pm_projects WHERE id = ? AND company_id = ? LIMIT 1`,
      [projectId, companyId]
    );
    if (!projectRows.length) {
      return httpError(res, 404, "Project not found or access denied");
    }
    const project = projectRows[0];

    // 2. Compute Task Completion Stats
    const taskStatsRows = await query(
      `
      SELECT 
        COUNT(*) AS total_tasks,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_tasks,
        SUM(CASE WHEN status != 'COMPLETED' THEN 1 ELSE 0 END) AS outstanding_tasks,
        AVG(COALESCE(completion_percent, 0)) AS avg_task_completion
      FROM pm_tasks
      WHERE project_id = ? AND company_id = ? AND (is_active = 'Y' OR is_active IS NULL)
      `,
      [projectId, companyId]
    );
    const taskStats = taskStatsRows[0] || {
      total_tasks: 0,
      completed_tasks: 0,
      outstanding_tasks: 0,
      avg_task_completion: 0,
    };

    // 3. Compute Milestone Completion Stats
    const milestoneStatsRows = await query(
      `
      SELECT 
        COUNT(*) AS total_milestones,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_milestones,
        SUM(CASE WHEN status != 'COMPLETED' THEN 1 ELSE 0 END) AS outstanding_milestones
      FROM pm_milestones
      WHERE project_id = ? AND company_id = ?
      `,
      [projectId, companyId]
    );
    const milestoneStats = milestoneStatsRows[0] || {
      total_milestones: 0,
      completed_milestones: 0,
      outstanding_milestones: 0,
    };

    // 4. Compute Financial Metrics
    const expenseRows = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_expense FROM pm_expenses WHERE project_id = ? AND company_id = ?`,
      [projectId, companyId]
    );
    const incomeRows = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total_income FROM pm_income WHERE project_id = ? AND company_id = ?`,
      [projectId, companyId]
    );

    const approvedBudget = Number(project.budget || 0);
    const actualCost = Number(expenseRows[0]?.total_expense || 0);
    const totalIncome = Number(incomeRows[0]?.total_income || 0);
    const budgetVariance = approvedBudget - actualCost;

    // 5. Fetch Handover Deliverables
    const deliverables = await query(
      `SELECT * FROM pm_project_handover_deliverables WHERE project_id = ? AND company_id = ? ORDER BY sort_order ASC, id ASC`,
      [projectId, companyId]
    );

    // Compute Deliverables Completion
    const totalDeliverables = deliverables.length;
    const acceptedDeliverables = deliverables.filter((d) => d.handover_status === "ACCEPTED" || d.handover_status === "TRANSFERRED").length;
    const outstandingDeliverables = deliverables.filter((d) => d.handover_status === "PENDING" || d.handover_status === "REJECTED").length;
    const deliverablesPct = totalDeliverables > 0 ? Math.round((acceptedDeliverables / totalDeliverables) * 100) : 100;

    // 6. Fetch Outstanding Items & Obligations
    const outstandingItems = await query(
      `SELECT * FROM pm_project_outstanding_items WHERE project_id = ? AND company_id = ? ORDER BY id ASC`,
      [projectId, companyId]
    );

    // 7. Fetch Linked Snags / Defect Issues
    const snags = await query(
      `
      SELECT 
        id, reference_no, issue_title, category, severity, priority, impact, 
        assigned_to, target_resolution_date, status, completion_date, additional_cost
      FROM pm_project_issues 
      WHERE project_id = ? AND company_id = ?
      ORDER BY id DESC
      `,
      [projectId, companyId]
    );

    // 8. Fetch or Prepare Closeout Record
    const closeoutRows = await query(
      `SELECT * FROM pm_project_closeouts WHERE project_id = ? AND company_id = ? LIMIT 1`,
      [projectId, companyId]
    );

    const totalMilestonesCount = Number(milestoneStats.total_milestones || 0);
    const completedMilestonesCount = Number(milestoneStats.completed_milestones || 0);
    const milestonesPct = totalMilestonesCount > 0 ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100) : 100;
    const scopePct = Number(project.completion_percent || taskStats.avg_task_completion || 0);

    const defaultHandoverRef = `HND-${project.project_code || "PRJ"}-${new Date().getFullYear()}`;

    let closeout = closeoutRows[0] || null;

    if (!closeout) {
      closeout = {
        project_id: Number(projectId),
        company_id: companyId,
        closeout_status: project.project_status === "COMPLETED" ? "CLOSED" : "DRAFT",
        scope_completion_pct: scopePct,
        deliverables_completion_pct: deliverablesPct,
        milestones_completion_pct: milestonesPct,
        outstanding_tasks_count: Number(taskStats.outstanding_tasks || 0),
        outstanding_deliverables_count: outstandingDeliverables,
        completion_remarks: "",
        verified_by: project.manager_name || "",
        verification_date: new Date().toISOString().split("T")[0],
        handover_ref: defaultHandoverRef,
        handover_date: project.actual_end_date || new Date().toISOString().split("T")[0],
        handover_to: project.client_name || "",
        receiving_org: project.client_name || "",
        handover_type: "Client Handover",
        handover_remarks: "",
        acceptance_status: "PENDING",
        acceptance_remarks: "",
        accepted_by: "",
        acceptance_date: null,
        handover_attachments: "[]",
        approved_budget: approvedBudget,
        actual_cost: actualCost,
        budget_variance: budgetVariance,
        outstanding_receivables: Math.max(0, approvedBudget - totalIncome),
        outstanding_payables: 0,
        financial_closure_status: budgetVariance >= 0 ? "BALANCED" : "OVERRUN",
        financial_remarks: "",
        contractual_status: "COMPLETED",
        outstanding_claims: "",
        outstanding_commitments: "",
        warranty_support_obligations: "12 Months Standard Defects Liability Period / Support Coverage",
        contractual_remarks: "",
        personnel_release_status: "RELEASED",
        equipment_release_status: "RETURNED",
        resource_release_date: new Date().toISOString().split("T")[0],
        resource_release_remarks: "",
        documentation_status: "COMPLETED",
        documents_archived_status: "ARCHIVED",
        final_reports: "Final project deliverables report, handover dossier, and as-built/signoff documentation completed.",
        supporting_documents: "[]",
        project_successes: "Objectives met within acceptable tolerances and verified by stakeholders.",
        challenges_encountered: "",
        lessons_learned: "",
        recommendations: "Maintain ongoing operational maintenance schedule and periodic checkups.",
        stakeholder_feedback: "",
        final_closure_remarks: "",
        closed_date: project.project_status === "COMPLETED" ? project.actual_end_date : null,
        closed_by: project.project_status === "COMPLETED" ? project.manager_name : null,
      };
    }

    res.json({
      success: true,
      data: {
        project,
        closeout,
        deliverables,
        outstanding_items: outstandingItems,
        snags,
        metrics: {
          task_stats: taskStats,
          milestone_stats: milestoneStats,
          financial: {
            approved_budget: approvedBudget,
            actual_cost: actualCost,
            total_income: totalIncome,
            budget_variance: budgetVariance,
          },
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Save / Update Project Closeout Data (Draft or Final Update)
 */
export async function saveProjectCloseout(req, res, next) {
  try {
    const companyId = req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    const branchId = req.scope?.branchId || req.user?.branchId || req.user?.branch_id || null;
    const { projectId } = req.params;
    const b = req.body || {};
    await ensureProjectCloseoutTables();

    // Verify Project exists
    const [project] = await query(
      `SELECT * FROM pm_projects WHERE id = ? AND company_id = ? LIMIT 1`,
      [projectId, companyId]
    );
    if (!project) {
      return httpError(res, 404, "Project not found");
    }

    // Process attachments
    const handoverAttachmentsStr = typeof b.handover_attachments === "object"
      ? JSON.stringify(b.handover_attachments)
      : (b.handover_attachments || "[]");

    const supportingDocsStr = typeof b.supporting_documents === "object"
      ? JSON.stringify(b.supporting_documents)
      : (b.supporting_documents || "[]");

    // Check if closeout record exists
    const existing = await query(
      `SELECT id, closeout_status FROM pm_project_closeouts WHERE project_id = ? AND company_id = ? LIMIT 1`,
      [projectId, companyId]
    );

    const closeoutStatus = b.closeout_status || existing[0]?.closeout_status || "DRAFT";

    if (existing.length === 0) {
      // Insert
      await query(
        `
        INSERT INTO pm_project_closeouts (
          company_id, branch_id, project_id, closeout_status,
          scope_completion_pct, deliverables_completion_pct, milestones_completion_pct,
          outstanding_tasks_count, outstanding_deliverables_count, completion_remarks,
          verified_by, verification_date,
          handover_ref, handover_date, handover_to, receiving_org, handover_type,
          handover_remarks, acceptance_status, acceptance_remarks, accepted_by, acceptance_date,
          handover_attachments,
          approved_budget, actual_cost, budget_variance, outstanding_receivables, outstanding_payables,
          financial_closure_status, financial_remarks,
          contractual_status, outstanding_claims, outstanding_commitments, warranty_support_obligations, contractual_remarks,
          personnel_release_status, equipment_release_status, resource_release_date, resource_release_remarks,
          documentation_status, documents_archived_status, final_reports, supporting_documents,
          project_successes, challenges_encountered, lessons_learned, recommendations, stakeholder_feedback, final_closure_remarks,
          closed_date, closed_by, created_by
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?,
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?
        )
        `,
        [
          companyId, branchId, projectId, closeoutStatus,
          Number(b.scope_completion_pct || 0), Number(b.deliverables_completion_pct || 0), Number(b.milestones_completion_pct || 0),
          Number(b.outstanding_tasks_count || 0), Number(b.outstanding_deliverables_count || 0), b.completion_remarks || null,
          b.verified_by || null, b.verification_date || null,
          b.handover_ref || null, b.handover_date || null, b.handover_to || null, b.receiving_org || null, b.handover_type || "Client Handover",
          b.handover_remarks || null, b.acceptance_status || "PENDING", b.acceptance_remarks || null, b.accepted_by || null, b.acceptance_date || null,
          handoverAttachmentsStr,
          Number(b.approved_budget || 0), Number(b.actual_cost || 0), Number(b.budget_variance || 0), Number(b.outstanding_receivables || 0), Number(b.outstanding_payables || 0),
          b.financial_closure_status || "PENDING", b.financial_remarks || null,
          b.contractual_status || "PENDING", b.outstanding_claims || null, b.outstanding_commitments || null, b.warranty_support_obligations || null, b.contractual_remarks || null,
          b.personnel_release_status || "PENDING", b.equipment_release_status || "PENDING", b.resource_release_date || null, b.resource_release_remarks || null,
          b.documentation_status || "PENDING", b.documents_archived_status || "PENDING", b.final_reports || null, supportingDocsStr,
          b.project_successes || null, b.challenges_encountered || null, b.lessons_learned || null, b.recommendations || null, b.stakeholder_feedback || null, b.final_closure_remarks || null,
          b.closed_date || null, b.closed_by || null, req.user?.id || null
        ]
      );
    } else {
      // Update
      await query(
        `
        UPDATE pm_project_closeouts SET
          closeout_status = ?,
          scope_completion_pct = ?, deliverables_completion_pct = ?, milestones_completion_pct = ?,
          outstanding_tasks_count = ?, outstanding_deliverables_count = ?, completion_remarks = ?,
          verified_by = ?, verification_date = ?,
          handover_ref = ?, handover_date = ?, handover_to = ?, receiving_org = ?, handover_type = ?,
          handover_remarks = ?, acceptance_status = ?, acceptance_remarks = ?, accepted_by = ?, acceptance_date = ?,
          handover_attachments = ?,
          approved_budget = ?, actual_cost = ?, budget_variance = ?, outstanding_receivables = ?, outstanding_payables = ?,
          financial_closure_status = ?, financial_remarks = ?,
          contractual_status = ?, outstanding_claims = ?, outstanding_commitments = ?, warranty_support_obligations = ?, contractual_remarks = ?,
          personnel_release_status = ?, equipment_release_status = ?, resource_release_date = ?, resource_release_remarks = ?,
          documentation_status = ?, documents_archived_status = ?, final_reports = ?, supporting_documents = ?,
          project_successes = ?, challenges_encountered = ?, lessons_learned = ?, recommendations = ?, stakeholder_feedback = ?, final_closure_remarks = ?,
          closed_date = ?, closed_by = ?
        WHERE project_id = ? AND company_id = ?
        `,
        [
          closeoutStatus,
          Number(b.scope_completion_pct || 0), Number(b.deliverables_completion_pct || 0), Number(b.milestones_completion_pct || 0),
          Number(b.outstanding_tasks_count || 0), Number(b.outstanding_deliverables_count || 0), b.completion_remarks || null,
          b.verified_by || null, b.verification_date || null,
          b.handover_ref || null, b.handover_date || null, b.handover_to || null, b.receiving_org || null, b.handover_type || "Client Handover",
          b.handover_remarks || null, b.acceptance_status || "PENDING", b.acceptance_remarks || null, b.accepted_by || null, b.acceptance_date || null,
          handoverAttachmentsStr,
          Number(b.approved_budget || 0), Number(b.actual_cost || 0), Number(b.budget_variance || 0), Number(b.outstanding_receivables || 0), Number(b.outstanding_payables || 0),
          b.financial_closure_status || "PENDING", b.financial_remarks || null,
          b.contractual_status || "PENDING", b.outstanding_claims || null, b.outstanding_commitments || null, b.warranty_support_obligations || null, b.contractual_remarks || null,
          b.personnel_release_status || "PENDING", b.equipment_release_status || "PENDING", b.resource_release_date || null, b.resource_release_remarks || null,
          b.documentation_status || "PENDING", b.documents_archived_status || "PENDING", b.final_reports || null, supportingDocsStr,
          b.project_successes || null, b.challenges_encountered || null, b.lessons_learned || null, b.recommendations || null, b.stakeholder_feedback || null, b.final_closure_remarks || null,
          b.closed_date || null, b.closed_by || null,
          projectId, companyId
        ]
      );
    }

    // Sync Deliverables if array supplied
    if (Array.isArray(b.deliverables)) {
      await query(`DELETE FROM pm_project_handover_deliverables WHERE project_id = ? AND company_id = ?`, [projectId, companyId]);
      for (let i = 0; i < b.deliverables.length; i++) {
        const item = b.deliverables[i];
        if (!item.deliverable_name || !item.deliverable_name.trim()) continue;
        await query(
          `
          INSERT INTO pm_project_handover_deliverables (
            company_id, project_id, deliverable_name, description, quantity, unit,
            responsible_person, handover_status, remarks, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            companyId, projectId, item.deliverable_name.trim(), item.description || null,
            item.quantity !== undefined && item.quantity !== "" ? Number(item.quantity) : null,
            item.unit || null, item.responsible_person || null, item.handover_status || "PENDING",
            item.remarks || null, i
          ]
        );
      }
    }

    // Sync Outstanding Items if array supplied
    if (Array.isArray(b.outstanding_items)) {
      await query(`DELETE FROM pm_project_outstanding_items WHERE project_id = ? AND company_id = ?`, [projectId, companyId]);
      for (const it of b.outstanding_items) {
        if (!it.item_description || !it.item_description.trim()) continue;
        await query(
          `
          INSERT INTO pm_project_outstanding_items (
            company_id, project_id, item_ref, item_description, item_category,
            priority, responsible_person, target_resolution_date, resolution_status,
            resolution_remarks, date_resolved, issue_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            companyId, projectId, it.item_ref || null, it.item_description.trim(),
            it.item_category || "Other", it.priority || "MEDIUM", it.responsible_person || null,
            it.target_resolution_date || null, it.resolution_status || "Open",
            it.resolution_remarks || null, it.date_resolved || null, it.issue_id || null
          ]
        );
      }
    }

    res.json({
      success: true,
      message: "Project handover & closeout details saved successfully",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Formally Mark Handover Completed
 */
export async function completeProjectHandover(req, res, next) {
  try {
    const companyId = req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    const { projectId } = req.params;
    const { handover_date, handover_to, receiving_org, accepted_by, acceptance_remarks } = req.body || {};
    await ensureProjectCloseoutTables();

    const today = handover_date || new Date().toISOString().split("T")[0];

    // Update closeout record
    await query(
      `
      UPDATE pm_project_closeouts SET
        closeout_status = 'HANDOVER_COMPLETED',
        acceptance_status = 'ACCEPTED',
        handover_date = ?,
        handover_to = COALESCE(?, handover_to),
        receiving_org = COALESCE(?, receiving_org),
        accepted_by = COALESCE(?, accepted_by),
        acceptance_date = ?,
        acceptance_remarks = COALESCE(?, acceptance_remarks)
      WHERE project_id = ? AND company_id = ?
      `,
      [today, handover_to, receiving_org, accepted_by, today, acceptance_remarks, projectId, companyId]
    );

    // Update Project practical completion date
    await query(
      `UPDATE pm_projects SET practical_completion_date = ? WHERE id = ? AND company_id = ?`,
      [today, projectId, companyId]
    );

    res.json({
      success: true,
      message: "Handover successfully recorded and marked as completed",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Formally Close Project (Sets PM Project status to COMPLETED)
 */
export async function markProjectClosed(req, res, next) {
  try {
    const companyId = req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    const { projectId } = req.params;
    const b = req.body || {};
    await ensureProjectCloseoutTables();

    const today = b.closed_date || new Date().toISOString().split("T")[0];
    const closedBy = b.closed_by || req.user?.name || req.user?.username || "Project Authority";

    // Update closeout record
    await query(
      `
      UPDATE pm_project_closeouts SET
        closeout_status = 'CLOSED',
        closed_date = ?,
        closed_by = ?,
        final_closure_remarks = COALESCE(?, final_closure_remarks)
      WHERE project_id = ? AND company_id = ?
      `,
      [today, closedBy, b.final_closure_remarks || null, projectId, companyId]
    );

    // Update PM Projects table status to COMPLETED
    await query(
      `
      UPDATE pm_projects SET
        project_status = 'COMPLETED',
        actual_end_date = ?,
        final_completion_date = ?,
        completion_percent = 100.00
      WHERE id = ? AND company_id = ?
      `,
      [today, today, projectId, companyId]
    );

    res.json({
      success: true,
      message: "Project successfully marked as CLOSED and finalized across OmniSuite ERP",
    });
  } catch (err) {
    next(err);
  }
}
