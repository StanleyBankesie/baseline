/**
 * @file baselineEngine.js
 * @description Automatic Project Schedule Baseline Detection, Generation, Variance & Rebaseline Engine.
 * 
 * Rules:
 * - Uses Work Plan (NOT WBS) terminology throughout.
 * - Detects completeness and readiness of project schedule.
 * - Auto-generates proposed baseline snapshots (tasks, dependencies, milestones, structure).
 * - Enforces PM review and approval before locking baseline.
 * - Computes schedule variances (Current/Forecast vs Baseline Finish).
 * - Distinguishes forecast variance from actual completion variance.
 * - Flags tasks added after baseline approval as unbaselined/outside baseline.
 * - Multi-version rebaselining with reason logging and full historical preservation.
 */

import { query } from "../db/pool.js";
import { ensureBaselineTables } from "../utils/baselineTables.js";

/**
 * Calculates calendar day difference (d1 - d2).
 * Positive if d1 is after d2 (delay).
 */
export function getDaysDiff(d1, d2) {
  if (!d1 || !d2) return 0;
  const date1 = new Date(String(d1).split("T")[0]);
  const date2 = new Date(String(d2).split("T")[0]);
  if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return 0;
  const diffTime = date1.getTime() - date2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Analyzes if a project schedule has sufficient definition to generate a baseline.
 * Returns readiness metrics, missing fields, and baseline status.
 */
export async function analyzeBaselineReadiness(projectId) {
  await ensureBaselineTables();

  // 1. Fetch project info
  const projectRows = await query(
    `SELECT id, project_name, project_code, start_date, end_date, practical_completion_date, project_status
     FROM pm_projects WHERE id = :projectId`,
    { projectId }
  );
  if (!projectRows.length) {
    throw new Error(`Project #${projectId} not found`);
  }
  const project = projectRows[0];

  // 2. Fetch project tasks
  const tasks = await query(
    `SELECT id, task_title, wbs_code, start_date, end_date, duration_days, completion_percent,
            status, priority, assigned_to_id, assigned_to_name, scope_name, baseline_start, baseline_end,
            is_outside_baseline
     FROM pm_tasks
     WHERE project_id = :projectId AND (is_active = 'Y' OR is_active IS NULL)
     ORDER BY id ASC`,
    { projectId }
  );

  // 3. Fetch confirmed milestones
  const milestones = await query(
    `SELECT id, title, target_date, milestone_type, status, work_plan_element, baseline_date
     FROM pm_milestones
     WHERE project_id = :projectId AND is_confirmed = 1 AND is_rejected = 0
     ORDER BY target_date ASC, id ASC`,
    { projectId }
  );

  // 4. Fetch existing baselines
  const baselines = await query(
    `SELECT id, baseline_name, description, version_no, status, total_tasks, total_milestones,
            project_start_date, project_end_date, approved_by, approved_at, created_at, rebaseline_reason
     FROM pm_schedule_baselines
     WHERE project_id = :projectId
     ORDER BY version_no DESC, id DESC`,
    { projectId }
  );

  const activeApprovedBaseline = baselines.find((b) => b.status === "APPROVED");
  const proposedBaseline = baselines.find((b) => b.status === "PROPOSED");

  // 5. Evaluate completeness
  const missingItems = [];
  const warnings = [];

  const projStart = project.start_date ? String(project.start_date).split("T")[0] : null;
  const projEnd = project.end_date || project.practical_completion_date
    ? String(project.end_date || project.practical_completion_date).split("T")[0]
    : null;

  if (!projStart) {
    missingItems.push("Project start date is not configured in project setup.");
  }
  if (!projEnd) {
    missingItems.push("Project planned completion date is not configured in project setup.");
  }

  if (tasks.length === 0) {
    missingItems.push("No Work Plan activities or tasks found for this project.");
  }

  let tasksWithoutStart = 0;
  let tasksWithoutEnd = 0;
  let tasksWithoutDuration = 0;
  let tasksUnassigned = 0;

  tasks.forEach((t) => {
    if (!t.start_date) tasksWithoutStart++;
    if (!t.end_date) tasksWithoutEnd++;
    if (!t.duration_days || Number(t.duration_days) <= 0) tasksWithoutDuration++;
    if (!t.assigned_to_id && !t.assigned_to_name) tasksUnassigned++;
  });

  if (tasksWithoutStart > 0) {
    missingItems.push(`${tasksWithoutStart} task(s) do not have a scheduled start date.`);
  }
  if (tasksWithoutEnd > 0) {
    missingItems.push(`${tasksWithoutEnd} task(s) do not have a scheduled finish date.`);
  }
  if (tasksWithoutDuration > 0) {
    warnings.push(`${tasksWithoutDuration} task(s) have undefined or zero duration days.`);
  }
  if (tasksUnassigned > 0) {
    warnings.push(`${tasksUnassigned} task(s) have no assigned responsible team member.`);
  }

  // Calculate readiness score
  let score = 100;
  if (!projStart) score -= 15;
  if (!projEnd) score -= 15;
  if (tasks.length === 0) score -= 50;
  if (tasksWithoutStart > 0) score -= Math.min(25, tasksWithoutStart * 5);
  if (tasksWithoutEnd > 0) score -= Math.min(25, tasksWithoutEnd * 5);
  score = Math.max(0, Math.min(100, score));

  const isReady = missingItems.length === 0 && tasks.length > 0;

  // Baseline lifecycle status
  let overallBaselineStatus = "NOT_GENERATED";
  let unbaselinedTaskCount = 0;
  let scheduleDriftDays = 0;

  if (activeApprovedBaseline) {
    overallBaselineStatus = "APPROVED";

    // Check if new tasks exist outside baseline
    if (activeApprovedBaseline.snapshot_json) {
      try {
        const snapTasks = JSON.parse(activeApprovedBaseline.snapshot_json || "[]");
        const snapIds = new Set(snapTasks.map((st) => Number(st.id)));
        tasks.forEach((t) => {
          if (!snapIds.has(Number(t.id))) unbaselinedTaskCount++;
        });
      } catch {}
    }

    // Check drift between project finish and baseline finish
    const baselineFinish = activeApprovedBaseline.project_end_date
      ? String(activeApprovedBaseline.project_end_date).split("T")[0]
      : null;
    if (projEnd && baselineFinish) {
      scheduleDriftDays = getDaysDiff(projEnd, baselineFinish);
      if (scheduleDriftDays >= 7 || unbaselinedTaskCount >= 3) {
        overallBaselineStatus = "REBASELINE_REQUIRED";
      }
    }
  } else if (proposedBaseline) {
    overallBaselineStatus = "PROPOSED";
  }

  return {
    project_id: projectId,
    project_name: project.project_name,
    project_code: project.project_code,
    project_start_date: projStart,
    project_end_date: projEnd,
    total_tasks: tasks.length,
    total_milestones: milestones.length,
    is_ready: isReady,
    readiness_score: score,
    missing_items: missingItems,
    warnings,
    baseline_status: overallBaselineStatus,
    active_baseline: activeApprovedBaseline ? {
      id: activeApprovedBaseline.id,
      version_no: activeApprovedBaseline.version_no,
      baseline_name: activeApprovedBaseline.baseline_name,
      approved_at: activeApprovedBaseline.approved_at,
      total_tasks: activeApprovedBaseline.total_tasks,
      total_milestones: activeApprovedBaseline.total_milestones,
      project_start_date: activeApprovedBaseline.project_start_date,
      project_end_date: activeApprovedBaseline.project_end_date,
    } : null,
    proposed_baseline: proposedBaseline ? {
      id: proposedBaseline.id,
      version_no: proposedBaseline.version_no,
      baseline_name: proposedBaseline.baseline_name,
      created_at: proposedBaseline.created_at,
    } : null,
    total_baseline_versions: baselines.length,
    unbaselined_task_count: unbaselinedTaskCount,
    schedule_drift_days: scheduleDriftDays,
  };
}

/**
 * Automatically generates a proposed baseline snapshot from current project data.
 */
export async function generateProposedBaseline(projectId, options = {}) {
  await ensureBaselineTables();
  const { user = {}, description = "", baseline_name = null } = options;

  // 1. Fetch project info
  const projectRows = await query(
    `SELECT id, project_name, project_code, start_date, end_date, practical_completion_date
     FROM pm_projects WHERE id = :projectId`,
    { projectId }
  );
  if (!projectRows.length) throw new Error(`Project #${projectId} not found`);
  const project = projectRows[0];

  // 2. Fetch all active tasks
  const tasks = await query(
    `SELECT id, task_title, wbs_code, start_date, end_date, duration_days, completion_percent,
            status, priority, is_critical, early_start, early_finish, assigned_to_id, assigned_to_name,
            scope_name
     FROM pm_tasks
     WHERE project_id = :projectId AND (is_active = 'Y' OR is_active IS NULL)
     ORDER BY id ASC`,
    { projectId }
  );

  if (tasks.length === 0) {
    throw new Error("Cannot generate baseline: project has no tasks.");
  }

  // 3. Fetch dependencies
  const taskIds = tasks.map((t) => t.id);
  let deps = [];
  if (taskIds.length > 0) {
    deps = await query(
      `SELECT d.id, d.task_id, d.predecessor_id, d.dependency_type, d.lag_days
       FROM pm_task_dependencies d
       WHERE d.task_id IN (${taskIds.map(() => "?").join(",")})`,
      taskIds
    );
  }

  // 4. Fetch confirmed milestones
  const milestones = await query(
    `SELECT id, title, target_date, milestone_type, work_plan_element, status, requires_inspection
     FROM pm_milestones
     WHERE project_id = :projectId AND is_confirmed = 1 AND is_rejected = 0
     ORDER BY target_date ASC, id ASC`,
    { projectId }
  );

  // 5. Determine next version number
  const versionRows = await query(
    `SELECT COALESCE(MAX(version_no), 0) AS max_v FROM pm_schedule_baselines WHERE project_id = :projectId`,
    { projectId }
  );
  const nextVersionNo = Number(versionRows[0]?.max_v || 0) + 1;

  // 6. Project boundary dates
  let minStart = project.start_date ? String(project.start_date).split("T")[0] : null;
  let maxEnd = project.end_date || project.practical_completion_date
    ? String(project.end_date || project.practical_completion_date).split("T")[0]
    : null;

  tasks.forEach((t) => {
    const s = t.start_date ? String(t.start_date).split("T")[0] : null;
    const e = t.end_date ? String(t.end_date).split("T")[0] : null;
    if (s && (!minStart || s < minStart)) minStart = s;
    if (e && (!maxEnd || e > maxEnd)) maxEnd = e;
  });

  const snapshotTasks = tasks.map((t) => ({
    id: t.id,
    task_title: t.task_title,
    work_plan_code: t.wbs_code || "",
    scope_name: t.scope_name || "",
    start_date: t.start_date ? String(t.start_date).split("T")[0] : minStart,
    end_date: t.end_date ? String(t.end_date).split("T")[0] : maxEnd,
    duration_days: Number(t.duration_days) || 1,
    assigned_to_id: t.assigned_to_id,
    assigned_to_name: t.assigned_to_name,
    priority: t.priority,
    is_critical: Boolean(t.is_critical),
  }));

  const snapshotDependencies = deps.map((d) => ({
    task_id: d.task_id,
    predecessor_id: d.predecessor_id,
    dependency_type: d.dependency_type || "FS",
    lag_days: Number(d.lag_days) || 0,
  }));

  const snapshotMilestones = milestones.map((m) => ({
    id: m.id,
    title: m.title,
    target_date: m.target_date ? String(m.target_date).split("T")[0] : null,
    milestone_type: m.milestone_type,
    work_plan_element: m.work_plan_element,
  }));

  const baselineName = baseline_name || `Proposed Baseline v${nextVersionNo}`;

  // Check if an existing PROPOSED baseline exists; if so, update it, else insert new
  const existingProposed = await query(
    `SELECT id FROM pm_schedule_baselines WHERE project_id = :projectId AND status = 'PROPOSED'`,
    { projectId }
  );

  let baselineId;
  if (existingProposed.length > 0) {
    baselineId = existingProposed[0].id;
    await query(
      `UPDATE pm_schedule_baselines SET
        baseline_name = :baselineName,
        description = :description,
        version_no = :versionNo,
        snapshot_json = :snapshotJson,
        dependencies_snapshot_json = :depsJson,
        milestones_snapshot_json = :msJson,
        total_tasks = :totalTasks,
        total_milestones = :totalMilestones,
        project_start_date = :projectStart,
        project_end_date = :projectEnd,
        created_by = :userId
       WHERE id = :baselineId`,
      {
        baselineId,
        baselineName,
        description: description || "Proposed schedule baseline generated automatically from Work Plan.",
        versionNo: nextVersionNo,
        snapshotJson: JSON.stringify(snapshotTasks),
        depsJson: JSON.stringify(snapshotDependencies),
        msJson: JSON.stringify(snapshotMilestones),
        totalTasks: snapshotTasks.length,
        totalMilestones: snapshotMilestones.length,
        projectStart: minStart,
        projectEnd: maxEnd,
        userId: user.id || null,
      }
    );
  } else {
    const insertRes = await query(
      `INSERT INTO pm_schedule_baselines
        (company_id, project_id, baseline_name, description, version_no, status, snapshot_json,
         dependencies_snapshot_json, milestones_snapshot_json, total_tasks, total_milestones,
         project_start_date, project_end_date, created_by)
       VALUES
        (:companyId, :projectId, :baselineName, :description, :versionNo, 'PROPOSED', :snapshotJson,
         :depsJson, :msJson, :totalTasks, :totalMilestones, :projectStart, :projectEnd, :userId)`,
      {
        companyId: user.company_id || 1,
        projectId,
        baselineName,
        description: description || "Proposed schedule baseline generated automatically from Work Plan.",
        versionNo: nextVersionNo,
        snapshotJson: JSON.stringify(snapshotTasks),
        depsJson: JSON.stringify(snapshotDependencies),
        msJson: JSON.stringify(snapshotMilestones),
        totalTasks: snapshotTasks.length,
        totalMilestones: snapshotMilestones.length,
        projectStart: minStart,
        projectEnd: maxEnd,
        userId: user.id || null,
      }
    );
    baselineId = insertRes.insertId;
  }

  return {
    id: baselineId,
    version_no: nextVersionNo,
    baseline_name: baselineName,
    status: "PROPOSED",
    total_tasks: snapshotTasks.length,
    total_milestones: snapshotMilestones.length,
    project_start_date: minStart,
    project_end_date: maxEnd,
    snapshot_tasks: snapshotTasks,
    snapshot_milestones: snapshotMilestones,
  };
}

/**
 * Formally approves a proposed baseline, locking it as the official approved reference baseline.
 */
export async function approveBaseline(baselineId, options = {}) {
  await ensureBaselineTables();
  const { user = {}, rebaseline_reason = null } = options;

  const baselineRows = await query(
    `SELECT * FROM pm_schedule_baselines WHERE id = :baselineId`,
    { baselineId }
  );
  if (!baselineRows.length) throw new Error(`Baseline #${baselineId} not found`);
  const baseline = baselineRows[0];
  const projectId = baseline.project_id;

  // 1. Mark all existing approved baselines for this project as ARCHIVED
  await query(
    `UPDATE pm_schedule_baselines SET status = 'ARCHIVED', is_active = 0
     WHERE project_id = :projectId AND status = 'APPROVED'`,
    { projectId }
  );

  // 2. Update this baseline to APPROVED and active
  await query(
    `UPDATE pm_schedule_baselines SET
      status = 'APPROVED',
      is_active = 1,
      approved_by = :userId,
      approved_at = NOW(),
      rebaseline_reason = :rebaselineReason
     WHERE id = :baselineId`,
    {
      baselineId,
      userId: user.id || null,
      rebaselineReason: rebaseline_reason || baseline.rebaseline_reason || null,
    }
  );

  // 3. Update pm_tasks with approved baseline dates
  let snapshotTasks = [];
  try {
    snapshotTasks = JSON.parse(baseline.snapshot_json || "[]");
  } catch {}

  const snapMap = new Map();
  snapshotTasks.forEach((st) => snapMap.set(Number(st.id), st));

  // Update tasks that are in the baseline
  for (const st of snapshotTasks) {
    await query(
      `UPDATE pm_tasks SET
        baseline_start = :bStart,
        baseline_end = :bEnd,
        baseline_duration = :bDur,
        is_outside_baseline = 0
       WHERE id = :taskId`,
      {
        taskId: st.id,
        bStart: st.start_date,
        bEnd: st.end_date,
        bDur: st.duration_days,
      }
    );
  }

  // Flag any project tasks NOT in the snapshot as outside baseline
  if (snapshotTasks.length > 0) {
    const snapIds = snapshotTasks.map((t) => t.id);
    await query(
      `UPDATE pm_tasks SET is_outside_baseline = 1
       WHERE project_id = ? AND id NOT IN (${snapIds.map(() => "?").join(",")})`,
      [projectId, ...snapIds]
    );
  }

  // 4. Update milestones
  let snapshotMilestones = [];
  try {
    snapshotMilestones = JSON.parse(baseline.milestones_snapshot_json || "[]");
  } catch {}

  for (const sm of snapshotMilestones) {
    if (sm.target_date) {
      await query(
        `UPDATE pm_milestones SET baseline_date = :bDate, is_outside_baseline = 0
         WHERE id = :mId`,
        { mId: sm.id, bDate: sm.target_date }
      );
    }
  }

  return {
    success: true,
    baseline_id: baselineId,
    version_no: baseline.version_no,
    status: "APPROVED",
    approved_at: new Date().toISOString(),
    message: `Project schedule baseline v${baseline.version_no} approved and locked as official reference schedule.`,
  };
}

/**
 * Replaces or edits tasks in a proposed baseline before formal approval.
 */
export async function updateProposedBaselineTasks(baselineId, updatedTasks = [], options = {}) {
  await ensureBaselineTables();

  const baselineRows = await query(
    `SELECT * FROM pm_schedule_baselines WHERE id = :baselineId`,
    { baselineId }
  );
  if (!baselineRows.length) throw new Error(`Baseline #${baselineId} not found`);
  const baseline = baselineRows[0];

  if (baseline.status === "APPROVED") {
    throw new Error("Approved baselines are locked and read-only. Initiate a formal Rebaseline to modify.");
  }

  let minStart = null;
  let maxEnd = null;

  const sanitized = updatedTasks.map((t) => {
    const s = t.start_date ? String(t.start_date).split("T")[0] : null;
    const e = t.end_date ? String(t.end_date).split("T")[0] : null;
    if (s && (!minStart || s < minStart)) minStart = s;
    if (e && (!maxEnd || e > maxEnd)) maxEnd = e;

    return {
      id: Number(t.id),
      task_title: t.task_title || t.title || "Task",
      work_plan_code: t.work_plan_code || t.wbs_code || "",
      scope_name: t.scope_name || "",
      start_date: s,
      end_date: e,
      duration_days: Number(t.duration_days) || 1,
      assigned_to_id: t.assigned_to_id || null,
      assigned_to_name: t.assigned_to_name || "Unassigned",
      priority: t.priority || "MEDIUM",
      is_critical: Boolean(t.is_critical),
    };
  });

  await query(
    `UPDATE pm_schedule_baselines SET
      snapshot_json = :snapshotJson,
      total_tasks = :totalTasks,
      project_start_date = :projectStart,
      project_end_date = :projectEnd
     WHERE id = :baselineId`,
    {
      baselineId,
      snapshotJson: JSON.stringify(sanitized),
      totalTasks: sanitized.length,
      projectStart: minStart || baseline.project_start_date,
      projectEnd: maxEnd || baseline.project_end_date,
    }
  );

  return {
    success: true,
    baseline_id: baselineId,
    total_tasks: sanitized.length,
    project_start_date: minStart,
    project_end_date: maxEnd,
  };
}

/**
 * Initiates a formal Rebaseline for a project.
 */
export async function initiateRebaseline(projectId, options = {}) {
  await ensureBaselineTables();
  const { user = {}, rebaseline_reason = "", baseline_name = null } = options;

  if (!rebaseline_reason || rebaseline_reason.trim().length < 5) {
    throw new Error("Formal rebaselining requires a valid justification / reason (minimum 5 characters).");
  }

  // 1. Generate proposed baseline snapshot from latest schedule
  const proposed = await generateProposedBaseline(projectId, {
    user,
    description: `Rebaseline Revision: ${rebaseline_reason}`,
    baseline_name: baseline_name || undefined,
  });

  // 2. Set the rebaseline reason on the new baseline
  await query(
    `UPDATE pm_schedule_baselines SET rebaseline_reason = :reason WHERE id = :id`,
    { id: proposed.id, reason: rebaseline_reason }
  );

  return {
    ...proposed,
    rebaseline_reason,
    message: "New proposed baseline generated from current schedule. Review and approve to lock as official.",
  };
}

/**
 * Evaluates live schedule variances for all tasks against an active baseline.
 */
export function calculateScheduleVariances(tasks = [], activeBaseline = null) {
  if (!activeBaseline) {
    return {
      has_active_baseline: false,
      tasks: tasks.map((t) => ({
        ...t,
        is_outside_baseline: true,
        baseline_start: null,
        baseline_end: null,
        baseline_duration: null,
        start_variance_days: 0,
        finish_variance_days: 0,
        schedule_status: "UNBASELINED",
      })),
      summary: {
        total_tasks: tasks.length,
        baselined_count: 0,
        unbaselined_count: tasks.length,
        ahead_count: 0,
        on_track_count: 0,
        behind_count: 0,
        max_delay_days: 0,
        overall_variance_days: 0,
        overall_status: "NOT_BASELINED",
      },
    };
  }

  let snapTasks = [];
  try {
    snapTasks = Array.isArray(activeBaseline.snapshot)
      ? activeBaseline.snapshot
      : JSON.parse(activeBaseline.snapshot_json || "[]");
  } catch {}

  const snapMap = new Map();
  snapTasks.forEach((st) => snapMap.set(Number(st.id), st));

  let aheadCount = 0;
  let onTrackCount = 0;
  let behindCount = 0;
  let unbaselinedCount = 0;
  let maxDelay = 0;

  const enrichedTasks = tasks.map((t) => {
    const snap = snapMap.get(Number(t.id));
    if (!snap) {
      unbaselinedCount++;
      return {
        ...t,
        is_outside_baseline: true,
        baseline_start: null,
        baseline_end: null,
        baseline_duration: null,
        start_variance_days: 0,
        finish_variance_days: 0,
        schedule_status: "UNBASELINED",
      };
    }

    const bStart = snap.start_date || t.baseline_start;
    const bEnd = snap.end_date || t.baseline_end;
    const bDur = snap.duration_days || t.baseline_duration || 1;

    // Current/Forecast finish vs Actual finish for completed tasks
    const isCompleted = Number(t.completion_percent || 0) >= 100 || t.status === "COMPLETED";
    const currentFinish = t.end_date || t.early_finish || null;
    const currentStart = t.start_date || t.early_start || null;

    const startVar = (currentStart && bStart) ? getDaysDiff(currentStart, bStart) : 0;
    const finishVar = (currentFinish && bEnd) ? getDaysDiff(currentFinish, bEnd) : 0;

    let schedStatus = "ON_TRACK";
    if (finishVar > 0) {
      schedStatus = "BEHIND";
      behindCount++;
      if (finishVar > maxDelay) maxDelay = finishVar;
    } else if (finishVar < 0) {
      schedStatus = "AHEAD";
      aheadCount++;
    } else {
      schedStatus = "ON_TRACK";
      onTrackCount++;
    }

    return {
      ...t,
      is_outside_baseline: false,
      baseline_start: bStart ? String(bStart).split("T")[0] : null,
      baseline_end: bEnd ? String(bEnd).split("T")[0] : null,
      baseline_duration: Number(bDur),
      start_variance_days: startVar,
      finish_variance_days: finishVar,
      is_completed: isCompleted,
      schedule_status: schedStatus,
    };
  });

  const overallVar = maxDelay > 0 ? maxDelay : aheadCount > behindCount ? -1 : 0;

  return {
    has_active_baseline: true,
    baseline_id: activeBaseline.id,
    version_no: activeBaseline.version_no,
    baseline_name: activeBaseline.baseline_name,
    approved_at: activeBaseline.approved_at,
    tasks: enrichedTasks,
    summary: {
      total_tasks: tasks.length,
      baselined_count: tasks.length - unbaselinedCount,
      unbaselined_count: unbaselinedCount,
      ahead_count: aheadCount,
      on_track_count: onTrackCount,
      behind_count: behindCount,
      max_delay_days: maxDelay,
      overall_variance_days: overallVar,
      overall_status: behindCount > 0 ? "BEHIND_SCHEDULE" : aheadCount > 0 ? "AHEAD_OF_SCHEDULE" : "ON_SCHEDULE",
    },
  };
}
