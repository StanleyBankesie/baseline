/**
 * @file dependencies.controller.js
 * @description API Controller for Intelligent Automatic Task Dependency Detection & Management.
 */

import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";
import { toNumber } from "../utils/dbUtils.js";
import {
  detectProjectTaskDependencies,
  runDependencyDetectionAndPersist,
  recalculateProjectSchedule,
} from "../services/dependencyDetectionEngine.js";
import { calculateCPM } from "../services/cpmEngine.js";

/**
 * 1. List all dependencies for a project with task details, source, status, and summary counts.
 */
export const listProjectDependencies = async (req, res, next) => {
  try {
    const projectId = toNumber(req.params.projectId);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Project ID is required");

    const rows = await query(
      `SELECT d.id, d.company_id, d.branch_id, d.task_id, d.predecessor_id,
              d.dependency_type, d.lag_days, d.notes, d.created_at,
              COALESCE(d.source, 'MANUAL') AS source,
              COALESCE(d.status, 'CONFIRMED') AS status,
              d.confidence_score, d.detection_reason, d.rejection_reason,
              d.audit_trail_json,
              t1.task_title AS successor_title, t1.wbs_code AS successor_wbs,
              t1.start_date AS successor_start, t1.end_date AS successor_end,
              t1.is_critical AS successor_critical,
              t2.task_title AS predecessor_title, t2.wbs_code AS predecessor_wbs,
              t2.start_date AS predecessor_start, t2.end_date AS predecessor_end,
              t2.is_critical AS predecessor_critical
       FROM pm_task_dependencies d
       JOIN pm_tasks t1 ON t1.id = d.task_id
       JOIN pm_tasks t2 ON t2.id = d.predecessor_id
       WHERE t1.project_id = :projectId
       ORDER BY d.status ASC, d.id ASC`,
      { projectId }
    );

    const counts = {
      total: rows.length,
      confirmed: rows.filter((r) => r.status === "CONFIRMED").length,
      suggested: rows.filter((r) => r.status === "SUGGESTED").length,
      rejected: rows.filter((r) => r.status === "REJECTED").length,
      auto_detected: rows.filter((r) => r.source === "AUTO_DETECTED").length,
      manual: rows.filter((r) => r.source !== "AUTO_DETECTED").length,
    };

    res.json({ items: rows, counts });
  } catch (err) {
    next(err);
  }
};

/**
 * 2. Run Automatic Dependency Detection on project Work Plan.
 */
export const detectDependencies = async (req, res, next) => {
  try {
    const projectId = toNumber(req.params.projectId);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Project ID is required");

    const result = await runDependencyDetectionAndPersist(projectId, { user: req.user || {} });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Create or add a dependency with validation against cycles.
 */
export const createDependency = async (req, res, next) => {
  try {
    const projectId = toNumber(req.params.projectId);
    const { taskId, predecessorId, dependencyType = "FS", lagDays = 0, notes = "", reason = "" } = req.body || {};

    if (!taskId || !predecessorId) throw httpError(400, "VALIDATION_ERROR", "Task ID and Predecessor ID are required");
    if (toNumber(taskId) === toNumber(predecessorId)) throw httpError(400, "VALIDATION_ERROR", "A task cannot depend on itself");

    // Fetch existing confirmed dependencies to check for cycle
    const allTasks = await query(`SELECT id, duration_days, start_date, end_date FROM pm_tasks WHERE project_id = :projectId`, { projectId });
    const existingDeps = await query(
      `SELECT d.task_id, d.predecessor_id, d.dependency_type, d.lag_days
       FROM pm_task_dependencies d
       JOIN pm_tasks t ON t.id = d.task_id
       WHERE t.project_id = :projectId AND (d.status = 'CONFIRMED' OR d.status IS NULL)`,
      { projectId }
    );

    const testDeps = [
      ...existingDeps,
      {
        task_id: toNumber(taskId),
        predecessor_id: toNumber(predecessorId),
        dependency_type: dependencyType,
        lag_days: Number(lagDays || 0),
      },
    ];

    const testCpm = calculateCPM(allTasks, new Date(), testDeps);
    if (testCpm.hasCycle) {
      throw httpError(400, "CIRCULAR_DEPENDENCY", "Cannot create relationship: creates a circular dependency loop.");
    }

    // Insert or update dependency
    await query(`DELETE FROM pm_task_dependencies WHERE task_id = :taskId AND predecessor_id = :predecessorId`, {
      taskId: toNumber(taskId),
      predecessorId: toNumber(predecessorId),
    });

    const auditEntry = {
      action: "CREATED",
      userId: req.user?.id || null,
      userName: req.user?.full_name || req.user?.username || "Project Manager",
      timestamp: new Date().toISOString(),
      reason: reason || notes || "Manual dependency created by Project Manager",
    };

    const insertRes = await query(
      `INSERT INTO pm_task_dependencies
        (company_id, branch_id, task_id, predecessor_id, dependency_type, lag_days, notes,
         source, status, confidence_score, created_by, audit_trail_json)
       VALUES
        (:companyId, :branchId, :taskId, :predecessorId, :depType, :lagDays, :notes,
         'MANUAL', 'CONFIRMED', 100.00, :userId, :auditJson)`,
      {
        companyId: req.user?.company_id || 1,
        branchId: req.user?.branch_id || 1,
        taskId: toNumber(taskId),
        predecessorId: toNumber(predecessorId),
        depType: (dependencyType || "FS").toUpperCase(),
        lagDays: Number(lagDays || 0),
        notes: notes || null,
        userId: req.user?.id || null,
        auditJson: JSON.stringify([auditEntry]),
      }
    );

    // Recalculate project schedule
    await recalculateProjectSchedule(projectId);

    res.status(201).json({
      id: insertRes.insertId,
      message: "Task relationship created successfully and schedule recalculated.",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Update an existing dependency (e.g. change type, lag, or notes).
 */
export const updateDependency = async (req, res, next) => {
  try {
    const id = toNumber(req.params.id);
    const { dependencyType, lagDays, notes, overrideReason } = req.body || {};

    const rows = await query(`SELECT d.*, t.project_id FROM pm_task_dependencies d JOIN pm_tasks t ON t.id = d.task_id WHERE d.id = :id`, { id });
    if (!rows.length) throw httpError(404, "NOT_FOUND", "Dependency relationship not found");
    const dep = rows[0];

    let auditHistory = [];
    try {
      auditHistory = JSON.parse(dep.audit_trail_json || "[]");
    } catch {}

    auditHistory.push({
      action: "UPDATED",
      previous: { type: dep.dependency_type, lag: dep.lag_days },
      updated: { type: dependencyType || dep.dependency_type, lag: lagDays ?? dep.lag_days },
      userId: req.user?.id || null,
      userName: req.user?.full_name || "Project Manager",
      timestamp: new Date().toISOString(),
      reason: overrideReason || notes || "Project Manager modification",
    });

    await query(
      `UPDATE pm_task_dependencies SET
        dependency_type = :depType,
        lag_days = :lagDays,
        notes = :notes,
        source = 'MANUAL_OVERRIDE',
        status = 'CONFIRMED',
        updated_by = :userId,
        audit_trail_json = :auditJson
       WHERE id = :id`,
      {
        id,
        depType: (dependencyType || dep.dependency_type || "FS").toUpperCase(),
        lagDays: lagDays !== undefined ? Number(lagDays) : dep.lag_days,
        notes: notes ?? dep.notes,
        userId: req.user?.id || null,
        auditJson: JSON.stringify(auditHistory),
      }
    );

    await recalculateProjectSchedule(dep.project_id);

    res.json({ success: true, message: "Dependency relationship updated successfully." });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. Confirm a SUGGESTED dependency.
 */
export const confirmSuggestedDependency = async (req, res, next) => {
  try {
    const id = toNumber(req.params.id);
    const rows = await query(`SELECT d.*, t.project_id FROM pm_task_dependencies d JOIN pm_tasks t ON t.id = d.task_id WHERE d.id = :id`, { id });
    if (!rows.length) throw httpError(404, "NOT_FOUND", "Dependency not found");
    const dep = rows[0];

    await query(
      `UPDATE pm_task_dependencies SET
        status = 'CONFIRMED',
        updated_by = :userId
       WHERE id = :id`,
      { id, userId: req.user?.id || null }
    );

    await recalculateProjectSchedule(dep.project_id);
    res.json({ success: true, message: "Dependency confirmed and integrated into project schedule." });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. Reject a SUGGESTED dependency.
 */
export const rejectSuggestedDependency = async (req, res, next) => {
  try {
    const id = toNumber(req.params.id);
    const { reason = "Rejected by Project Manager" } = req.body || {};

    const rows = await query(`SELECT d.*, t.project_id FROM pm_task_dependencies d JOIN pm_tasks t ON t.id = d.task_id WHERE d.id = :id`, { id });
    if (!rows.length) throw httpError(404, "NOT_FOUND", "Dependency not found");
    const dep = rows[0];

    await query(
      `UPDATE pm_task_dependencies SET
        status = 'REJECTED',
        rejection_reason = :reason,
        updated_by = :userId
       WHERE id = :id`,
      { id, reason, userId: req.user?.id || null }
    );

    await recalculateProjectSchedule(dep.project_id);
    res.json({ success: true, message: "Dependency suggestion rejected." });
  } catch (err) {
    next(err);
  }
};

/**
 * 7. Delete a dependency.
 */
export const deleteDependency = async (req, res, next) => {
  try {
    const id = toNumber(req.params.id);
    const rows = await query(`SELECT d.*, t.project_id FROM pm_task_dependencies d JOIN pm_tasks t ON t.id = d.task_id WHERE d.id = :id`, { id });
    if (!rows.length) throw httpError(404, "NOT_FOUND", "Dependency not found");
    const dep = rows[0];

    await query(`DELETE FROM pm_task_dependencies WHERE id = :id`, { id });
    await recalculateProjectSchedule(dep.project_id);

    res.json({ success: true, message: "Dependency relationship removed." });
  } catch (err) {
    next(err);
  }
};
