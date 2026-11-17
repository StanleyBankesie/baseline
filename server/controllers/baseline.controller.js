/**
 * @file baseline.controller.js
 * @description API Controller for Automatic Baseline Detection, Generation, Variance & Rebaselining.
 */

import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";
import { toNumber } from "../utils/dbUtils.js";
import {
  analyzeBaselineReadiness,
  generateProposedBaseline,
  approveBaseline,
  updateProposedBaselineTasks,
  initiateRebaseline,
  calculateScheduleVariances,
} from "../services/baselineEngine.js";

/**
 * 1. Analyze baseline readiness and identify missing schedule fields.
 */
export const getBaselineAnalysis = async (req, res, next) => {
  try {
    const projectId = toNumber(req.params.projectId);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Project ID is required");

    const analysis = await analyzeBaselineReadiness(projectId);
    res.json(analysis);
  } catch (err) {
    next(err);
  }
};

/**
 * 2. List all baselines for a project with versions and audit info.
 */
export const listBaselines = async (req, res, next) => {
  try {
    const projectId = toNumber(req.params.projectId);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Project ID is required");

    const rows = await query(
      `SELECT b.id, b.project_id, b.baseline_name, b.description, b.version_no, b.status,
              b.total_tasks, b.total_milestones, b.project_start_date, b.project_end_date,
              b.approved_at, b.created_at, b.rebaseline_reason,
              u.full_name AS approved_by_name, u.username AS approved_by_username
       FROM pm_schedule_baselines b
       LEFT JOIN adm_users u ON u.id = b.approved_by
       WHERE b.project_id = :projectId
       ORDER BY b.version_no DESC, b.id DESC`,
      { projectId }
    );

    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * 3. Get single baseline with full snapshot and calculated schedule variances.
 */
export const getBaselineDetails = async (req, res, next) => {
  try {
    const projectId = toNumber(req.params.projectId);
    const baselineId = toNumber(req.params.baselineId);
    if (!projectId || !baselineId) throw httpError(400, "VALIDATION_ERROR", "Project ID and Baseline ID required");

    const rows = await query(
      `SELECT b.*, u.full_name AS approved_by_name
       FROM pm_schedule_baselines b
       LEFT JOIN adm_users u ON u.id = b.approved_by
       WHERE b.id = :baselineId AND b.project_id = :projectId`,
      { baselineId, projectId }
    );
    if (!rows.length) throw httpError(404, "NOT_FOUND", "Baseline not found");

    const baseline = rows[0];
    let snapshotTasks = [];
    let snapshotMilestones = [];
    let snapshotDeps = [];
    try {
      snapshotTasks = JSON.parse(baseline.snapshot_json || "[]");
      snapshotMilestones = JSON.parse(baseline.milestones_snapshot_json || "[]");
      snapshotDeps = JSON.parse(baseline.dependencies_snapshot_json || "[]");
    } catch {}

    // Fetch current tasks to calculate variance against this baseline
    const currentTasks = await query(
      `SELECT id, task_title, wbs_code, start_date, end_date, duration_days, completion_percent,
              status, priority, is_critical, early_start, early_finish, assigned_to_name, scope_name
       FROM pm_tasks
       WHERE project_id = :projectId AND (is_active = 'Y' OR is_active IS NULL)
       ORDER BY id ASC`,
      { projectId }
    );

    const varianceResult = calculateScheduleVariances(currentTasks, {
      ...baseline,
      snapshot: snapshotTasks,
    });

    res.json({
      baseline: {
        ...baseline,
        snapshot_tasks: snapshotTasks,
        snapshot_milestones: snapshotMilestones,
        snapshot_dependencies: snapshotDeps,
      },
      variances: varianceResult,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 4. Generate or auto-detect proposed baseline from current Work Plan schedule.
 */
export const generateBaseline = async (req, res, next) => {
  try {
    const projectId = toNumber(req.params.projectId);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Project ID is required");

    const { baseline_name, description } = req.body || {};
    const result = await generateProposedBaseline(projectId, {
      user: req.user || {},
      baseline_name,
      description,
    });

    res.json({
      success: true,
      message: `Proposed project schedule baseline v${result.version_no} generated successfully`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 5. Update proposed baseline tasks before formal approval.
 */
export const updateProposedBaseline = async (req, res, next) => {
  try {
    const baselineId = toNumber(req.params.baselineId);
    if (!baselineId) throw httpError(400, "VALIDATION_ERROR", "Baseline ID is required");

    const { tasks = [] } = req.body || {};
    const result = await updateProposedBaselineTasks(baselineId, tasks, { user: req.user || {} });

    res.json({
      success: true,
      message: "Proposed baseline tasks updated successfully",
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * 6. Formally approve and lock a baseline as the official reference schedule.
 */
export const approveScheduleBaseline = async (req, res, next) => {
  try {
    const baselineId = toNumber(req.params.baselineId);
    if (!baselineId) throw httpError(400, "VALIDATION_ERROR", "Baseline ID is required");

    const { rebaseline_reason } = req.body || {};
    const result = await approveBaseline(baselineId, {
      user: req.user || {},
      rebaseline_reason,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * 7. Initiate a formal rebaseline.
 */
export const rebaselineSchedule = async (req, res, next) => {
  try {
    const projectId = toNumber(req.params.projectId);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Project ID is required");

    const { rebaseline_reason, baseline_name } = req.body || {};
    const result = await initiateRebaseline(projectId, {
      user: req.user || {},
      rebaseline_reason,
      baseline_name,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};
