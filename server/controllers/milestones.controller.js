/**
 * @file milestones.controller.js
 * @description Controller for Automatic Milestone Detection & Management in OmniSuite ERP.
 */

import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";
import { toNumber } from "../utils/dbUtils.js";
import { detectProjectMilestones, evaluateMilestoneStatus } from "../services/milestoneDetectionEngine.js";

/**
 * List all milestones for a project with real-time evaluated status and linked tasks.
 */
export const listProjectMilestones = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const projectId = toNumber(req.params.projectId);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Project ID is required");

    // Fetch milestones
    const milestones = await query(
      `SELECT m.*, 
              u.full_name AS owner_name,
              p.project_name, p.project_code
       FROM pm_milestones m
       LEFT JOIN adm_users u ON u.id = m.responsible_owner_id
       LEFT JOIN pm_projects p ON p.id = m.project_id
       WHERE m.project_id = :projectId AND (m.company_id = :companyId OR :companyId IS NULL)
       ORDER BY m.is_confirmed ASC, m.target_date ASC, m.id ASC`,
      { projectId, companyId: companyId || 1 }
    );

    // Fetch all linked tasks for these milestones
    const milestoneIds = milestones.map((m) => m.id);
    let linkedTaskMap = {};

    if (milestoneIds.length > 0) {
      const mtRows = await query(
        `SELECT mt.milestone_id, mt.task_id, mt.is_mandatory, mt.is_inspection_task,
                t.task_title, t.start_date, t.end_date, t.completion_percent, t.status AS task_status,
                t.assigned_to_name, t.scope_name, t.wbs_code
         FROM pm_milestone_tasks mt
         JOIN pm_tasks t ON t.id = mt.task_id
         WHERE mt.milestone_id IN (${milestoneIds.map(() => "?").join(",")})`,
        milestoneIds
      );

      mtRows.forEach((r) => {
        if (!linkedTaskMap[r.milestone_id]) linkedTaskMap[r.milestone_id] = [];
        linkedTaskMap[r.milestone_id].push(r);
      });
    }

    // Evaluate live status for each milestone
    const enriched = milestones.map((m) => {
      const linked = linkedTaskMap[m.id] || [];
      const evalResult = evaluateMilestoneStatus(m, linked);
      return {
        ...m,
        is_confirmed: Boolean(m.is_confirmed),
        is_rejected: Boolean(m.is_rejected),
        requires_inspection: Boolean(m.requires_inspection),
        is_inspection_accepted: Boolean(m.is_inspection_accepted),
        live_status: evalResult.status,
        progress_percent: evalResult.progressPercent,
        total_tasks: evalResult.totalTasks,
        completed_tasks: evalResult.completedTasks,
        pending_conditions: evalResult.pendingConditions,
        linked_tasks: linked
      };
    });

    const confirmed = enriched.filter((m) => m.is_confirmed && !m.is_rejected);
    const suggested = enriched.filter((m) => !m.is_confirmed && !m.is_rejected);
    const rejected = enriched.filter((m) => m.is_rejected);

    res.json({
      items: enriched,
      confirmed,
      suggested,
      rejected,
      counts: {
        total: confirmed.length,
        suggested: suggested.length,
        achieved: confirmed.filter((m) => m.live_status === "ACHIEVED").length,
        in_progress: confirmed.filter((m) => m.live_status === "IN_PROGRESS").length,
        pending: confirmed.filter((m) => m.live_status === "PENDING").length,
        overdue: confirmed.filter((m) => m.live_status === "OVERDUE").length
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Trigger Automatic Milestone Detection Engine for a project.
 */
export const runMilestoneDetection = async (req, res, next) => {
  try {
    const { companyId, branchId } = req.scope || {};
    const projectId = toNumber(req.params.projectId);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Project ID is required");

    const detectedCandidates = await detectProjectMilestones(projectId, req.scope);

    let newlyInsertedCount = 0;
    for (const cand of detectedCandidates) {
      const insertResult = await query(
        `INSERT INTO pm_milestones (
          company_id, branch_id, project_id, title, description, milestone_type,
          detection_source, detection_reason, detection_confidence, is_confirmed, is_rejected,
          due_date, target_date, completion_conditions, requires_inspection, is_inspection_accepted,
          inspection_notes, work_plan_element, status, audit_trail_json
        ) VALUES (
          :companyId, :branchId, :project_id, :title, :description, :milestone_type,
          :detection_source, :detection_reason, :detection_confidence, 0, 0,
          :due_date, :target_date, :completion_conditions, :requires_inspection, 0,
          :inspection_notes, :work_plan_element, 'PENDING', :auditTrail
        )`,
        {
          companyId: companyId || 1,
          branchId: branchId || 1,
          project_id: projectId,
          title: cand.title,
          description: cand.description || "",
          milestone_type: cand.milestone_type || "PHASE_COMPLETION",
          detection_source: cand.detection_source || "AI_DETECTED",
          detection_reason: cand.detection_reason || "",
          detection_confidence: cand.detection_confidence || 90.0,
          due_date: cand.target_date,
          target_date: cand.target_date,
          completion_conditions: cand.requires_inspection ? "Formal Inspection / Acceptance Required" : null,
          requires_inspection: cand.requires_inspection ? 1 : 0,
          inspection_notes: cand.inspection_notes || null,
          work_plan_element: cand.work_plan_element || "",
          auditTrail: JSON.stringify([
            { action: "DETECTED", by: req.user?.username || "Engine", at: new Date().toISOString() }
          ])
        }
      );

      const milestoneId = insertResult.insertId;
      newlyInsertedCount++;

      // Link tasks in pm_milestone_tasks
      if (Array.isArray(cand.linkedTaskIds) && cand.linkedTaskIds.length > 0) {
        for (const tId of cand.linkedTaskIds) {
          await query(
            `INSERT IGNORE INTO pm_milestone_tasks (company_id, milestone_id, task_id, is_mandatory)
             VALUES (:companyId, :milestoneId, :taskId, 1)`,
            { companyId: companyId || 1, milestoneId, taskId: tId }
          );
        }
      }
    }

    res.json({
      ok: true,
      new_suggestions_count: newlyInsertedCount,
      total_detected: detectedCandidates.length,
      message: `Milestone detection completed. ${newlyInsertedCount} new recommendations generated.`
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Accept a suggested milestone into an official project milestone.
 */
export const acceptMilestoneSuggestion = async (req, res, next) => {
  try {
    const id = toNumber(req.params.id);
    const b = req.body || {};

    const existing = await query(`SELECT * FROM pm_milestones WHERE id = :id LIMIT 1`, { id });
    if (!existing.length) throw httpError(404, "NOT_FOUND", "Milestone not found");
    const m = existing[0];

    const auditTrail = JSON.parse(m.audit_trail_json || "[]");
    auditTrail.push({
      action: "ACCEPTED",
      by: req.user?.username || req.user?.name || "Project Manager",
      at: new Date().toISOString(),
      edits: b
    });

    await query(
      `UPDATE pm_milestones SET
         is_confirmed = 1,
         is_rejected = 0,
         title = COALESCE(:title, title),
         description = COALESCE(:description, description),
         target_date = COALESCE(:target_date, target_date),
         due_date = COALESCE(:target_date, due_date),
         requires_inspection = COALESCE(:requires_inspection, requires_inspection),
         responsible_owner_id = COALESCE(:responsible_owner_id, responsible_owner_id),
         responsible_owner_name = COALESCE(:responsible_owner_name, responsible_owner_name),
         remarks = COALESCE(:remarks, remarks),
         audit_trail_json = :auditTrail
       WHERE id = :id`,
      {
        id,
        title: b.title || null,
        description: b.description || null,
        target_date: b.target_date || null,
        requires_inspection: b.requires_inspection !== undefined ? (b.requires_inspection ? 1 : 0) : null,
        responsible_owner_id: b.responsible_owner_id ? toNumber(b.responsible_owner_id) : null,
        responsible_owner_name: b.responsible_owner_name || null,
        remarks: b.remarks || null,
        auditTrail: JSON.stringify(auditTrail)
      }
    );

    // If new linkedTaskIds provided, update pm_milestone_tasks
    if (Array.isArray(b.linkedTaskIds)) {
      await query(`DELETE FROM pm_milestone_tasks WHERE milestone_id = :id`, { id });
      for (const tId of b.linkedTaskIds) {
        await query(
          `INSERT IGNORE INTO pm_milestone_tasks (company_id, milestone_id, task_id, is_mandatory)
           VALUES (:companyId, :id, :tId, 1)`,
          { companyId: m.company_id || 1, id, tId }
        );
      }
    }

    res.json({ ok: true, message: "Milestone confirmed as official project milestone" });
  } catch (err) {
    next(err);
  }
};

/**
 * Reject a suggested milestone with reason.
 */
export const rejectMilestoneSuggestion = async (req, res, next) => {
  try {
    const id = toNumber(req.params.id);
    const { reason } = req.body || {};

    const existing = await query(`SELECT * FROM pm_milestones WHERE id = :id LIMIT 1`, { id });
    if (!existing.length) throw httpError(404, "NOT_FOUND", "Milestone not found");
    const m = existing[0];

    const auditTrail = JSON.parse(m.audit_trail_json || "[]");
    auditTrail.push({
      action: "REJECTED",
      by: req.user?.username || req.user?.name || "Project Manager",
      at: new Date().toISOString(),
      reason: reason || "User rejected suggestion"
    });

    await query(
      `UPDATE pm_milestones SET
         is_rejected = 1,
         is_confirmed = 0,
         rejection_reason = :reason,
         audit_trail_json = :auditTrail
       WHERE id = :id`,
      { id, reason: reason || "Declined by Project Manager", auditTrail: JSON.stringify(auditTrail) }
    );

    res.json({ ok: true, message: "Milestone suggestion rejected" });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a manual milestone.
 */
export const createManualMilestone = async (req, res, next) => {
  try {
    const { companyId, branchId } = req.scope || {};
    const b = req.body || {};
    const projectId = toNumber(b.project_id);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Project ID is required");
    if (!b.title) throw httpError(400, "VALIDATION_ERROR", "Milestone title is required");

    const auditTrail = [
      { action: "CREATED_MANUALLY", by: req.user?.username || "User", at: new Date().toISOString() }
    ];

    const result = await query(
      `INSERT INTO pm_milestones (
        company_id, branch_id, project_id, title, description, milestone_type,
        detection_source, detection_confidence, is_confirmed, is_rejected,
        due_date, target_date, completion_conditions, requires_inspection, is_inspection_accepted,
        inspection_notes, responsible_owner_id, responsible_owner_name, work_plan_element,
        status, remarks, audit_trail_json
      ) VALUES (
        :companyId, :branchId, :project_id, :title, :description, :milestone_type,
        'MANUAL', 100.00, 1, 0,
        :due_date, :target_date, :completion_conditions, :requires_inspection, 0,
        :inspection_notes, :responsible_owner_id, :responsible_owner_name, :work_plan_element,
        'PENDING', :remarks, :auditTrail
      )`,
      {
        companyId: companyId || 1,
        branchId: branchId || 1,
        project_id: projectId,
        title: b.title,
        description: b.description || "",
        milestone_type: b.milestone_type || "CUSTOM",
        due_date: b.target_date || b.due_date || null,
        target_date: b.target_date || b.due_date || null,
        completion_conditions: b.completion_conditions || (b.requires_inspection ? "Inspection Required" : null),
        requires_inspection: b.requires_inspection ? 1 : 0,
        inspection_notes: b.inspection_notes || null,
        responsible_owner_id: b.responsible_owner_id ? toNumber(b.responsible_owner_id) : null,
        responsible_owner_name: b.responsible_owner_name || null,
        work_plan_element: b.work_plan_element || "",
        remarks: b.remarks || null,
        auditTrail: JSON.stringify(auditTrail)
      }
    );

    const milestoneId = result.insertId;

    // Link tasks
    if (Array.isArray(b.linkedTaskIds)) {
      for (const tId of b.linkedTaskIds) {
        await query(
          `INSERT IGNORE INTO pm_milestone_tasks (company_id, milestone_id, task_id, is_mandatory)
           VALUES (:companyId, :milestoneId, :tId, 1)`,
          { companyId: companyId || 1, milestoneId, tId }
        );
      }
    }

    res.status(201).json({ id: milestoneId, message: "Milestone created successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing milestone.
 */
export const updateMilestone = async (req, res, next) => {
  try {
    const id = toNumber(req.params.id);
    const b = req.body || {};

    const existing = await query(`SELECT * FROM pm_milestones WHERE id = :id LIMIT 1`, { id });
    if (!existing.length) throw httpError(404, "NOT_FOUND", "Milestone not found");
    const m = existing[0];

    const auditTrail = JSON.parse(m.audit_trail_json || "[]");
    auditTrail.push({
      action: "UPDATED",
      by: req.user?.username || "User",
      at: new Date().toISOString(),
      changes: b
    });

    await query(
      `UPDATE pm_milestones SET
         title = COALESCE(:title, title),
         description = COALESCE(:description, description),
         milestone_type = COALESCE(:milestone_type, milestone_type),
         target_date = COALESCE(:target_date, target_date),
         due_date = COALESCE(:target_date, due_date),
         requires_inspection = COALESCE(:requires_inspection, requires_inspection),
         is_inspection_accepted = COALESCE(:is_inspection_accepted, is_inspection_accepted),
         inspection_notes = COALESCE(:inspection_notes, inspection_notes),
         responsible_owner_id = COALESCE(:responsible_owner_id, responsible_owner_id),
         responsible_owner_name = COALESCE(:responsible_owner_name, responsible_owner_name),
         work_plan_element = COALESCE(:work_plan_element, work_plan_element),
         status = COALESCE(:status, status),
         remarks = COALESCE(:remarks, remarks),
         audit_trail_json = :auditTrail
       WHERE id = :id`,
      {
        id,
        title: b.title || null,
        description: b.description !== undefined ? b.description : null,
        milestone_type: b.milestone_type || null,
        target_date: b.target_date || null,
        requires_inspection: b.requires_inspection !== undefined ? (b.requires_inspection ? 1 : 0) : null,
        is_inspection_accepted: b.is_inspection_accepted !== undefined ? (b.is_inspection_accepted ? 1 : 0) : null,
        inspection_notes: b.inspection_notes !== undefined ? b.inspection_notes : null,
        responsible_owner_id: b.responsible_owner_id ? toNumber(b.responsible_owner_id) : null,
        responsible_owner_name: b.responsible_owner_name || null,
        work_plan_element: b.work_plan_element !== undefined ? b.work_plan_element : null,
        status: b.status || null,
        remarks: b.remarks !== undefined ? b.remarks : null,
        auditTrail: JSON.stringify(auditTrail)
      }
    );

    if (Array.isArray(b.linkedTaskIds)) {
      await query(`DELETE FROM pm_milestone_tasks WHERE milestone_id = :id`, { id });
      for (const tId of b.linkedTaskIds) {
        await query(
          `INSERT IGNORE INTO pm_milestone_tasks (company_id, milestone_id, task_id, is_mandatory)
           VALUES (:companyId, :id, :tId, 1)`,
          { companyId: m.company_id || 1, id, tId }
        );
      }
    }

    res.json({ ok: true, message: "Milestone updated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle inspection sign-off for a milestone.
 */
export const toggleMilestoneInspection = async (req, res, next) => {
  try {
    const id = toNumber(req.params.id);
    const { is_accepted, notes } = req.body || {};

    const existing = await query(`SELECT * FROM pm_milestones WHERE id = :id LIMIT 1`, { id });
    if (!existing.length) throw httpError(404, "NOT_FOUND", "Milestone not found");
    const m = existing[0];

    const newAccepted = is_accepted !== undefined ? (is_accepted ? 1 : 0) : m.is_inspection_accepted ? 0 : 1;

    const auditTrail = JSON.parse(m.audit_trail_json || "[]");
    auditTrail.push({
      action: newAccepted ? "INSPECTION_ACCEPTED" : "INSPECTION_REVOKED",
      by: req.user?.username || "Inspector",
      at: new Date().toISOString(),
      notes: notes || ""
    });

    await query(
      `UPDATE pm_milestones SET
         is_inspection_accepted = :newAccepted,
         inspection_notes = COALESCE(:notes, inspection_notes),
         audit_trail_json = :auditTrail
       WHERE id = :id`,
      { id, newAccepted, notes: notes || null, auditTrail: JSON.stringify(auditTrail) }
    );

    res.json({ ok: true, is_inspection_accepted: Boolean(newAccepted), message: "Inspection status updated" });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a milestone.
 */
export const deleteMilestone = async (req, res, next) => {
  try {
    const id = toNumber(req.params.id);
    await query(`DELETE FROM pm_milestone_tasks WHERE milestone_id = :id`, { id });
    await query(`DELETE FROM pm_milestones WHERE id = :id`, { id });
    res.json({ ok: true, message: "Milestone deleted successfully" });
  } catch (err) {
    next(err);
  }
};
