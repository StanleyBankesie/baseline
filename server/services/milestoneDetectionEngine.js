/**
 * @file milestoneDetectionEngine.js
 * @description Intelligent Automatic Milestone Detection & Status Tracking Engine for OmniSuite ERP.
 * 
 * Rules:
 * - Uses Work Plan (NOT WBS) terminology.
 * - Detects Phase completion, Deliverables, Dependency bottlenecks, and Project Lifecycle milestones.
 * - Links to existing pm_tasks without duplicating activities.
 * - Calculates target dates based on latest scheduled completion among linked tasks.
 * - Evaluates status: PENDING, IN_PROGRESS, ACHIEVED, OVERDUE, ON_HOLD, CANCELLED.
 * - Respects mandatory verification/inspection conditions before marking ACHIEVED.
 */

import { query } from "../db/pool.js";

/**
 * Evaluates live status for a milestone based on linked tasks and conditions.
 * @param {Object} milestone - Milestone row
 * @param {Array} linkedTasks - Array of linked pm_tasks
 * @returns {Object} { status, progressPercent, totalTasks, completedTasks, pendingConditions }
 */
export function evaluateMilestoneStatus(milestone, linkedTasks = []) {
  if (milestone.is_rejected) {
    return {
      status: "CANCELLED",
      progressPercent: 0,
      totalTasks: linkedTasks.length,
      completedTasks: 0,
      pendingConditions: ["Rejected by user"]
    };
  }

  if (milestone.status === "ON_HOLD") {
    return {
      status: "ON_HOLD",
      progressPercent: 0,
      totalTasks: linkedTasks.length,
      completedTasks: linkedTasks.filter((t) => Number(t.completion_percent || 0) === 100 || t.status === "COMPLETED").length,
      pendingConditions: ["Milestone placed on hold"]
    };
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const targetDateStr = milestone.target_date || milestone.due_date || null;

  if (!linkedTasks || linkedTasks.length === 0) {
    const isPast = targetDateStr && targetDateStr < todayStr;
    return {
      status: milestone.status === "ACHIEVED" ? "ACHIEVED" : isPast ? "OVERDUE" : "PENDING",
      progressPercent: milestone.status === "ACHIEVED" ? 100 : 0,
      totalTasks: 0,
      completedTasks: 0,
      pendingConditions: []
    };
  }

  const total = linkedTasks.length;
  let completedCount = 0;
  let inProgressCount = 0;
  let totalPctSum = 0;

  linkedTasks.forEach((t) => {
    const pct = Number(t.completion_percent || 0);
    totalPctSum += pct;
    if (pct === 100 || t.status === "COMPLETED") {
      completedCount++;
    } else if (pct > 0 || t.status === "IN_PROGRESS") {
      inProgressCount++;
    }
  });

  const avgProgress = Math.round(totalPctSum / total);
  const allTasksDone = completedCount === total;
  const anyStarted = inProgressCount > 0 || completedCount > 0;

  const pendingConditions = [];

  // Check inspection condition
  if (Boolean(milestone.requires_inspection) && !Boolean(milestone.is_inspection_accepted)) {
    pendingConditions.push("Formal inspection verification / sign-off outstanding");
  }

  let finalStatus = "PENDING";

  if (allTasksDone) {
    if (pendingConditions.length > 0) {
      finalStatus = "IN_PROGRESS"; // Tasks complete but verification pending
    } else {
      finalStatus = "ACHIEVED";
    }
  } else if (anyStarted) {
    finalStatus = "IN_PROGRESS";
  } else {
    finalStatus = "PENDING";
  }

  // Check for overdue
  if (finalStatus !== "ACHIEVED" && targetDateStr && targetDateStr < todayStr) {
    finalStatus = "OVERDUE";
  }

  return {
    status: finalStatus,
    progressPercent: finalStatus === "ACHIEVED" ? 100 : avgProgress,
    totalTasks: total,
    completedTasks: completedCount,
    pendingConditions
  };
}

/**
 * Runs the intelligent Automatic Milestone Detection Engine for a project.
 * Analyzes scopes, tasks, dates, and dependencies, and produces recommended milestones.
 * @param {number} projectId
 * @param {Object} scope - { companyId, branchId }
 * @returns {Array} List of suggested milestone candidates with linkedTaskIds
 */
export async function detectProjectMilestones(projectId, scope = {}) {
  // 1. Fetch Project Details
  const projRows = await query(
    `SELECT id, project_code, project_name, project_type, project_scopes, start_date, end_date, remarks
     FROM pm_projects WHERE id = :projectId LIMIT 1`,
    { projectId }
  );
  if (!projRows.length) return [];
  const project = projRows[0];

  // 2. Fetch Project Tasks (Work Plan)
  const tasks = await query(
    `SELECT id, project_id, task_title, task_description, scope_id, scope_name, work_package_id,
            start_date, end_date, duration_days, completion_percent, status, assigned_to_name, priority, wbs_code
     FROM pm_tasks WHERE project_id = :projectId ORDER BY start_date ASC, id ASC`,
    { projectId }
  );
  if (!tasks.length) return [];

  // 3. Fetch Task Dependencies
  const deps = await query(
    `SELECT predecessor_task_id, successor_task_id, dependency_type
     FROM pm_task_dependencies WHERE project_id = :projectId`,
    { projectId }
  ).catch(() => []);

  // 4. Fetch Existing Milestones (both confirmed and rejected) to avoid duplicates
  const existingMilestones = await query(
    `SELECT id, title, is_confirmed, is_rejected, milestone_type FROM pm_milestones WHERE project_id = :projectId`,
    { projectId }
  );

  const existingTitles = new Set(
    existingMilestones.map((m) => m.title.trim().toLowerCase())
  );

  const candidates = [];

  const addCandidate = (candidate) => {
    const titleKey = candidate.title.trim().toLowerCase();
    if (existingTitles.has(titleKey)) return; // Already exists or previously rejected
    // Check if candidate already added in this run
    if (candidates.some((c) => c.title.trim().toLowerCase() === titleKey)) return;

    // Calculate proposed target date: maximum end date of linked tasks
    const linkedTaskObjs = tasks.filter((t) => candidate.linkedTaskIds.includes(t.id));
    let latestEndDate = null;
    linkedTaskObjs.forEach((t) => {
      if (t.end_date) {
        if (!latestEndDate || t.end_date > latestEndDate) latestEndDate = t.end_date;
      }
    });

    const toDateStr = (val) => {
      if (!val) return null;
      if (typeof val === "string") return val.split("T")[0];
      if (val instanceof Date) return val.toISOString().split("T")[0];
      return String(val);
    };

    candidate.target_date = toDateStr(latestEndDate) || toDateStr(project.end_date) || new Date().toISOString().split("T")[0];
    candidate.due_date = candidate.target_date;
    candidate.is_confirmed = 0;
    candidate.is_rejected = 0;
    candidate.status = "PENDING";
    candidates.push(candidate);
  };

  // ==========================================
  // RULE 1: PROJECT LIFECYCLE - COMMENCEMENT & MOBILISATION
  // ==========================================
  const firstTask = tasks[0];
  if (firstTask && firstTask.start_date) {
    addCandidate({
      project_id: projectId,
      title: "Project Commencement & Site Mobilisation",
      description: "Official kickoff of project activities and deployment of initial team and equipment.",
      milestone_type: "LIFECYCLE",
      detection_source: "AI_DETECTED",
      detection_reason: `Triggered by scheduled kickoff of initial project activity '${firstTask.task_title}'.`,
      detection_confidence: 95.0,
      linkedTaskIds: [firstTask.id],
      work_plan_element: firstTask.scope_name || "Project Inception",
      requires_inspection: 0
    });
  }

  // ==========================================
  // RULE 2: SCOPE / WORK PLAN PHASE COMPLETION
  // ==========================================
  // Group tasks by scope_name or work_package_id
  const scopeTaskMap = {};
  tasks.forEach((t) => {
    const key = t.scope_name ? t.scope_name.trim() : "General Work Plan";
    if (!scopeTaskMap[key]) scopeTaskMap[key] = [];
    scopeTaskMap[key].push(t);
  });

  Object.entries(scopeTaskMap).forEach(([scopeName, scopeTasks]) => {
    if (scopeTasks.length >= 1) {
      const lower = scopeName.toLowerCase();
      let milestoneTitle = `${scopeName} Completed`;
      let requiresInspection = 0;

      if (lower.includes("foundation") || lower.includes("substructure")) {
        milestoneTitle = "Foundation & Substructure Works Completed";
        requiresInspection = 1;
      } else if (lower.includes("structure") || lower.includes("framing") || lower.includes("superstructure")) {
        milestoneTitle = "Superstructure Works Completed";
        requiresInspection = 1;
      } else if (lower.includes("plumbing") || lower.includes("electrical") || lower.includes("mep")) {
        milestoneTitle = "MEP Services Rough-in Completed";
        requiresInspection = 1;
      } else if (lower.includes("finishing") || lower.includes("finishes") || lower.includes("interior")) {
        milestoneTitle = "Architectural Finishes Completed";
      } else if (lower.includes("commission") || lower.includes("testing") || lower.includes("qa")) {
        milestoneTitle = "Testing & Commissioning Completed";
        requiresInspection = 1;
      }

      addCandidate({
        project_id: projectId,
        title: milestoneTitle,
        description: `Full execution and completion of all ${scopeTasks.length} activities under Work Plan scope '${scopeName}'.`,
        milestone_type: "PHASE_COMPLETION",
        detection_source: "RULE_DETECTED",
        detection_reason: `Identified Work Plan phase '${scopeName}' with ${scopeTasks.length} contributing tasks.`,
        detection_confidence: 90.0,
        linkedTaskIds: scopeTasks.map((t) => t.id),
        work_plan_element: scopeName,
        requires_inspection: requiresInspection,
        inspection_notes: requiresInspection ? "Structural / Quality inspection sign-off required." : null
      });
    }
  });

  // ==========================================
  // RULE 3: DELIVERABLE & STATUTORY APPROVAL MILESTONES
  // ==========================================
  tasks.forEach((t) => {
    const tLower = t.task_title.toLowerCase();
    const isApproval = tLower.includes("approval") || tLower.includes("permit") || tLower.includes("drawing") || tLower.includes("design");
    const isDeliverable = tLower.includes("delivery") || tLower.includes("handover") || tLower.includes("certificate") || tLower.includes("procure");

    if (isApproval) {
      addCandidate({
        project_id: projectId,
        title: `${t.task_title} Sign-Off`,
        description: `Formal client / authority approval for ${t.task_title}.`,
        milestone_type: "DELIVERABLE",
        detection_source: "AI_DETECTED",
        detection_reason: `Identified critical statutory / design deliverable task '${t.task_title}'.`,
        detection_confidence: 88.0,
        linkedTaskIds: [t.id],
        work_plan_element: t.scope_name || "Statutory & Engineering",
        requires_inspection: 1
      });
    } else if (isDeliverable && !tLower.includes("final")) {
      addCandidate({
        project_id: projectId,
        title: `${t.task_title} Milestone`,
        description: `Key procurement or operational deliverable completion for ${t.task_title}.`,
        milestone_type: "DELIVERABLE",
        detection_source: "RULE_DETECTED",
        detection_reason: `Identified essential deliverable task '${t.task_title}'.`,
        detection_confidence: 82.0,
        linkedTaskIds: [t.id],
        work_plan_element: t.scope_name || "Procurement & Delivery",
        requires_inspection: 0
      });
    }
  });

  // ==========================================
  // RULE 4: DEPENDENCY BOTTLENECKS (Critical Predecessors)
  // ==========================================
  const predecessorCounts = {};
  deps.forEach((d) => {
    const pId = d.predecessor_task_id;
    predecessorCounts[pId] = (predecessorCounts[pId] || 0) + 1;
  });

  Object.entries(predecessorCounts).forEach(([predIdStr, count]) => {
    if (count >= 2) {
      const predTask = tasks.find((t) => t.id === Number(predIdStr));
      if (predTask) {
        addCandidate({
          project_id: projectId,
          title: `${predTask.task_title} (Stream Unlocked)`,
          description: `Key prerequisite task unlocking ${count} downstream dependent activities in the Work Plan.`,
          milestone_type: "DEPENDENCY",
          detection_source: "RULE_DETECTED",
          detection_reason: `Critical dependency bottleneck: completion unlocks ${count} successor tasks.`,
          detection_confidence: 85.0,
          linkedTaskIds: [predTask.id],
          work_plan_element: predTask.scope_name || "Critical Path Stream",
          requires_inspection: 0
        });
      }
    }
  });

  // ==========================================
  // RULE 5: FINAL PRACTICAL COMPLETION & HANDOVER
  // ==========================================
  const lastTask = tasks[tasks.length - 1];
  addCandidate({
    project_id: projectId,
    title: "Project Practical Completion & Handover",
    description: "Final walkthrough inspection, snag list clearance, and formal handover to client.",
    milestone_type: "LIFECYCLE",
    detection_source: "AI_DETECTED",
    detection_reason: "Cumulative completion of all scheduled project activities and work packages.",
    detection_confidence: 98.0,
    linkedTaskIds: tasks.map((t) => t.id),
    work_plan_element: "Project Handover & Closeout",
    requires_inspection: 1,
    inspection_notes: "Joint client walkthrough and certificate of practical completion sign-off mandatory."
  });

  return candidates;
}
