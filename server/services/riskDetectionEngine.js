/**
 * @file riskDetectionEngine.js
 * @description Risk Scoring, Mitigation Effectiveness, AI-Assisted Risk Detection,
 * and Dynamic Event-Driven Project Monitoring Engine for OmniSuite ERP.
 */

import { query } from "../db/pool.js";
import { getApiKey, getOpenRouterApiKey } from "./ai/banks.service.js";

/**
 * Calculates risk score and classification according to OmniSuite standards:
 * Likelihood (1-5) * Impact (1-5)
 * 1-4: Low
 * 5-9: Moderate
 * 10-16: High
 * 17-25: Critical
 */
export function calculateRiskClassification(likelihood, impact) {
  const l = Math.min(5, Math.max(1, parseInt(likelihood, 10) || 1));
  const i = Math.min(5, Math.max(1, parseInt(impact, 10) || 1));
  const score = l * i;

  let level = "LOW";
  if (score >= 17) {
    level = "CRITICAL";
  } else if (score >= 10) {
    level = "HIGH";
  } else if (score >= 5) {
    level = "MODERATE";
  } else {
    level = "LOW";
  }

  return { likelihood: l, impact: i, score, level };
}

/**
 * Calculates residual risk comparison and mitigation effectiveness:
 * Risk Reduction (%) = ((Inherent - Residual) / Inherent) * 100
 */
export function evaluateMitigationEffectiveness(inherentScore, residualScore) {
  const inh = Math.max(1, parseInt(inherentScore, 10) || 1);
  const res = Math.max(1, parseInt(residualScore, 10) || 1);

  const diff = inh - res;
  const reductionPct = Math.max(-100, Math.min(100, parseFloat(((diff / inh) * 100).toFixed(2))));

  let trend = "UNCHANGED";
  if (res < inh) {
    trend = "REDUCED";
  } else if (res > inh) {
    trend = "INCREASED";
  }

  let effectiveness = "INEFFECTIVE";
  if (res > inh) {
    effectiveness = "WORSENED";
  } else if (res <= 4 || reductionPct >= 60) {
    effectiveness = "EFFECTIVE";
  } else if (reductionPct > 0) {
    effectiveness = "PARTIALLY_EFFECTIVE";
  } else {
    effectiveness = "INEFFECTIVE";
  }

  return { inherentScore: inh, residualScore: res, reductionPct, trend, effectiveness };
}

/**
 * Evaluates live project events and logs monitoring records.
 * Flags affected existing risks for reassessment and triggers notifications.
 */
export async function evaluateProjectEvents(companyId, projectId, userId = null) {
  const eventsFound = [];

  // 1. Check for overdue tasks
  const overdueTasks = await query(
    `SELECT t.id,
            COALESCE(t.task_title, 'Untitled Task') as title,
            t.end_date as due_date,
            COALESCE(t.completion_percent, 0) as progress,
            COALESCE(t.assigned_to_name, 'Unassigned') as assigned_to,
            COALESCE(t.priority, 'NORMAL') as priority,
            DATEDIFF(CURRENT_DATE(), t.end_date) as days_overdue
     FROM pm_tasks t
     WHERE t.company_id = ? AND t.project_id = ?
       AND t.end_date IS NOT NULL
       AND t.end_date < CURRENT_DATE()
       AND (t.status NOT IN ('COMPLETED', 'CANCELLED', 'DONE') OR t.status IS NULL)
     ORDER BY days_overdue DESC LIMIT 10`,
    [companyId, projectId]
  );

  for (const task of overdueTasks) {
    const isCritical = task.priority === 'CRITICAL' || task.priority === 'HIGH' || task.days_overdue > 7;
    const event = {
      event_category: 'TASK_DELAY',
      event_title: `Task Overdue: "${task.title}" by ${task.days_overdue} day(s)`,
      event_description: `Task "${task.title}" (#${task.id}) was due on ${task.due_date} (progress: ${task.progress || 0}%). Assigned to: ${task.assigned_to || 'Unassigned'}.`,
      event_source_table: 'pm_tasks',
      event_source_id: task.id,
      impact_rating: isCritical ? 'HIGH' : 'MEDIUM',
    };
    eventsFound.push(event);
  }

  // 2. Check for budget overruns
  const budgetData = await query(
    `SELECT p.id, p.project_name, p.budget as approved_budget,
            COALESCE(SUM(e.amount), 0) as total_spent
     FROM pm_projects p
     LEFT JOIN pm_expenses e ON e.project_id = p.id AND e.status = 'APPROVED'
     WHERE p.company_id = ? AND p.id = ?
     GROUP BY p.id, p.project_name, p.budget`,
    [companyId, projectId]
  );

  if (budgetData.length > 0) {
    const b = budgetData[0];
    const approved = Number(b.approved_budget || 0);
    const spent = Number(b.total_spent || 0);
    if (approved > 0 && spent > approved) {
      const variance = spent - approved;
      const pctOver = ((variance / approved) * 100).toFixed(1);
      eventsFound.push({
        event_category: 'BUDGET_OVERRUN',
        event_title: `Project Budget Exceeded by ${pctOver}% (GH₵ ${variance.toLocaleString()})`,
        event_description: `Actual approved expenditure (GH₵ ${spent.toLocaleString()}) has surpassed the approved project budget (GH₵ ${approved.toLocaleString()}) by GH₵ ${variance.toLocaleString()} (${pctOver}%).`,
        event_source_table: 'pm_expenses',
        event_source_id: null,
        impact_rating: pctOver > 15 ? 'CRITICAL' : 'HIGH',
      });
    }
  }

  // 3. Check for approaching milestones with pending deliverables
  const approachingMilestones = await query(
    `SELECT m.id,
            COALESCE(m.title, 'Milestone') as milestone_name,
            COALESCE(m.target_date, m.due_date) as target_date,
            m.status,
            DATEDIFF(COALESCE(m.target_date, m.due_date), CURRENT_DATE()) as days_remaining
     FROM pm_milestones m
     WHERE m.company_id = ? AND m.project_id = ?
       AND m.status NOT IN ('COMPLETED', 'ACHIEVED')
       AND COALESCE(m.target_date, m.due_date) BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 14 DAY)`,
    [companyId, projectId]
  ).catch(() => []);

  for (const ms of approachingMilestones) {
    eventsFound.push({
      event_category: 'MILESTONE_SLIPPAGE',
      event_title: `Upcoming Milestone at Risk: "${ms.milestone_name}"`,
      event_description: `Milestone "${ms.milestone_name}" is due in ${ms.days_remaining} day(s) (${ms.target_date}) but remains in status: ${ms.status || 'PENDING'}.`,
      event_source_table: 'pm_milestones',
      event_source_id: ms.id,
      impact_rating: ms.days_remaining <= 3 ? 'HIGH' : 'MEDIUM',
    });
  }

  // 4. Check for open critical QA defects
  const criticalDefects = await query(
    `SELECT d.id, d.defect_title, d.severity, d.status
     FROM pm_quality_defects d
     WHERE d.company_id = ? AND d.project_id = ?
       AND d.status NOT IN ('RESOLVED', 'CLOSED')
       AND d.severity IN ('CRITICAL', 'HIGH')
     LIMIT 5`,
    [companyId, projectId]
  ).catch(() => []);

  for (const def of criticalDefects) {
    eventsFound.push({
      event_category: 'QUALITY_DEFECT',
      event_title: `Unresolved ${def.severity} Defect: "${def.defect_title}"`,
      event_description: `Quality defect #${def.id} ("${def.defect_title}") remains in unresolved status: ${def.status}.`,
      event_source_table: 'pm_quality_defects',
      event_source_id: def.id,
      impact_rating: def.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
    });
  }

  // Persist new events (avoid duplicate logs within 24 hours for same source and event)
  let loggedCount = 0;
  for (const evt of eventsFound) {
    const existing = await query(
      `SELECT id FROM pm_risk_monitoring_events
       WHERE company_id = ? AND project_id = ?
         AND event_category = ? AND event_title = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       LIMIT 1`,
      [companyId, projectId, evt.event_category, evt.event_title]
    );

    if (existing.length === 0) {
      // Find potentially affected open risk to link and flag for reassessment
      let matchingRiskId = null;
      let catPattern = '%';
      if (evt.event_category === 'TASK_DELAY' || evt.event_category === 'MILESTONE_SLIPPAGE') catPattern = '%Schedule%';
      else if (evt.event_category === 'BUDGET_OVERRUN') catPattern = '%Financial%';
      else if (evt.event_category === 'QUALITY_DEFECT') catPattern = '%Quality%';

      const matchRisk = await query(
        `SELECT id, title, inherent_score FROM pm_risks
         WHERE company_id = ? AND project_id = ?
           AND status IN ('OPEN', 'UNDER_ASSESSMENT', 'UNDER_MITIGATION', 'MONITORING')
           AND category LIKE ?
         ORDER BY inherent_score DESC LIMIT 1`,
        [companyId, projectId, catPattern]
      );

      if (matchRisk.length > 0) {
        matchingRiskId = matchRisk[0].id;
        // Flag for reassessment
        await query(
          `UPDATE pm_risks
           SET reassessment_required = 1,
               reassessment_trigger_reason = ?
           WHERE id = ?`,
          [`Triggered by ${evt.event_title}`, matchingRiskId]
        );

        // Record history entry
        await query(
          `INSERT INTO pm_risk_assessment_history
           (company_id, project_id, risk_id, assessment_type, likelihood, impact, score, level, notes, reassessed_by)
           SELECT company_id, project_id, id, 'EVENT_TRIGGERED',
                  residual_likelihood, residual_impact, residual_score, residual_level,
                  ?, 'Automated Monitoring'
           FROM pm_risks WHERE id = ?`,
          [`Event Detected: ${evt.event_title}`, matchingRiskId]
        );
      }

      await query(
        `INSERT INTO pm_risk_monitoring_events
         (company_id, project_id, risk_id, event_category, event_title, event_description, event_source_table, event_source_id, impact_rating, action_taken)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          projectId,
          matchingRiskId,
          evt.event_category,
          evt.event_title,
          evt.event_description,
          evt.event_source_table,
          evt.event_source_id,
          evt.impact_rating,
          matchingRiskId ? 'FLAGGED_FOR_REASSESSMENT' : 'LOGGED',
        ]
      );
      loggedCount++;
    }
  }

  return { eventsDetected: eventsFound.length, newEventsLogged: loggedCount };
}

/**
 * AI-Assisted Risk Identification:
 * Analyzes project scope, schedule, budget, tasks, and historical issues.
 * Generates structured risk suggestions awaiting human validation.
 * Includes robust duplicate detection against both confirmed risks and dismissed suggestions.
 */
export async function generateAiRiskSuggestions(companyId, projectId, userId = null) {
  // 1. Gather Project Telemetry
  const [projectRows, tasks, milestones, expenses, defects, existingRisks, existingSuggestions] = await Promise.all([
    query(`SELECT id, project_name, project_code, budget, start_date, end_date, status FROM pm_projects WHERE id = ? AND company_id = ?`, [projectId, companyId]),
    query(`SELECT id, COALESCE(task_title, 'Untitled Task') as title, status, priority, end_date as due_date, COALESCE(completion_percent, 0) as progress, COALESCE(assigned_to_name, 'Unassigned') as assigned_to FROM pm_tasks WHERE project_id = ? AND company_id = ? LIMIT 50`, [projectId, companyId]),
    query(`SELECT id, COALESCE(title, 'Milestone') as milestone_name, COALESCE(target_date, due_date) as target_date, status FROM pm_milestones WHERE project_id = ? AND company_id = ? LIMIT 20`, [projectId, companyId]).catch(() => []),
    query(`SELECT COALESCE(SUM(amount), 0) as total_expenses FROM pm_expenses WHERE project_id = ? AND company_id = ?`, [projectId, companyId]),
    query(`SELECT id, defect_title, severity, status FROM pm_quality_defects WHERE project_id = ? AND company_id = ? LIMIT 20`, [projectId, companyId]).catch(() => []),
    query(`SELECT title, category FROM pm_risks WHERE project_id = ? AND company_id = ?`, [projectId, companyId]),
    query(`SELECT suggested_title, status FROM pm_ai_risk_suggestions WHERE project_id = ? AND company_id = ?`, [projectId, companyId]),
  ]);

  if (!projectRows.length) {
    throw new Error("Project not found.");
  }

  const project = projectRows[0];
  const approvedBudget = Number(project.budget || 0);
  const totalSpent = Number(expenses[0]?.total_expenses || 0);

  // Existing risk titles to prevent duplicates
  const existingTitles = new Set([
    ...existingRisks.map(r => r.title.toLowerCase().trim()),
    ...existingSuggestions.map(s => s.suggested_title.toLowerCase().trim())
  ]);

  // Telemetry Summary for prompt
  const overdueTasksCount = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'COMPLETED').length;
  const unassignedTasksCount = tasks.filter(t => !t.assigned_to).length;
  const pendingMilestonesCount = milestones.filter(m => m.status !== 'COMPLETED').length;
  const criticalDefectsCount = defects.filter(d => d.severity === 'CRITICAL' && d.status !== 'CLOSED').length;

  let candidates = [];

  // Deterministic Expert Heuristics (Ensures intelligent recommendations even if external LLM API is unavailable)
  if (overdueTasksCount > 0) {
    candidates.push({
      suggested_title: "Schedule Slippage from Accumulated Task Delays",
      description: `${overdueTasksCount} active task(s) on the project schedule have passed their contractual target due dates without completion. This threatens dependent successor activities and the milestone completion schedule.`,
      category: "Schedule",
      cause: "Resource contention, delayed predecessor dependencies, or inaccurate original duration estimates.",
      potential_consequences: "Project baseline delay, liquidated damages for late delivery, increased project indirect overheads.",
      affected_project_area: "Time/Schedule",
      recommended_likelihood: overdueTasksCount > 3 ? 5 : 4,
      recommended_impact: 4,
      recommended_mitigation: "Fast-track critical path activities, crash remaining schedule by allocating additional resources, and realign work breakdown priorities.",
      identification_reason: `Detected ${overdueTasksCount} overdue tasks in project schedule analysis.`,
      source_records_json: JSON.stringify({ overdueTasks: overdueTasksCount, totalTasks: tasks.length }),
    });
  }

  if (approvedBudget > 0 && totalSpent > approvedBudget * 0.85) {
    const isExceeded = totalSpent > approvedBudget;
    candidates.push({
      suggested_title: isExceeded ? "Severe Budget Cost Overrun Exceeding Approved Allocation" : "Budget Exhaustion Exposure Before Project Completion",
      description: `Current project expenditures stand at GH₵ ${totalSpent.toLocaleString()} against an approved total budget of GH₵ ${approvedBudget.toLocaleString()} (${((totalSpent / approvedBudget) * 100).toFixed(1)}% utilized).`,
      category: "Financial",
      cause: "Unbudgeted material cost variances, unapproved variation claims, or under-estimated equipment hire charges.",
      potential_consequences: "Cash flow deficit, halts in site procurement, contractor disputes, project financial loss.",
      affected_project_area: "Cost",
      recommended_likelihood: isExceeded ? 5 : 4,
      recommended_impact: 5,
      recommended_mitigation: "Conduct a comprehensive financial cost reconciliation, enforce strict sign-off limits on discretionary expenses, and request formal contingency budget revision.",
      identification_reason: `Expenditures (GH₵ ${totalSpent.toLocaleString()}) have reached ${((totalSpent / approvedBudget) * 100).toFixed(1)}% of total approved budget.`,
      source_records_json: JSON.stringify({ approvedBudget, totalSpent }),
    });
  }

  if (unassignedTasksCount > 2) {
    candidates.push({
      suggested_title: "Resource Allocation Gap on Unassigned Project Tasks",
      description: `There are ${unassignedTasksCount} scheduled project tasks without named resource ownership or accountability. Tasks without ownership frequently stall and slip unnoticed.`,
      category: "Resource",
      cause: "Lack of staffing allocation, newly added work packages without assigned project team members.",
      potential_consequences: "Missed commencement dates, lack of accountability, team friction during task handover.",
      affected_project_area: "Resources",
      recommended_likelihood: 4,
      recommended_impact: 3,
      recommended_mitigation: "Conduct immediate work package assignment with team leads; establish task ownership matrix and notification triggers.",
      identification_reason: `Identified ${unassignedTasksCount} unassigned tasks in project task register.`,
      source_records_json: JSON.stringify({ unassignedTasksCount }),
    });
  }

  if (criticalDefectsCount > 0) {
    candidates.push({
      suggested_title: "Quality Non-Conformance Threatening Project Handover Approval",
      description: `The project has ${criticalDefectsCount} critical quality defect(s) pending resolution. Unresolved non-conformances risk client rejection during milestone assessments.`,
      category: "Quality",
      cause: "Workmanship deficiencies, sub-standard material deliveries, or skipped inspection hold points.",
      potential_consequences: "Client refusal to certify progress claims, costly rework, damage to firm commercial reputation.",
      affected_project_area: "Quality",
      recommended_likelihood: 4,
      recommended_impact: 4,
      recommended_mitigation: "Issue Corrective and Preventive Action (CAPA) orders to responsible site subcontractors; enforce mandatory re-inspection before subsequent work commences.",
      identification_reason: `QA inspection logs report ${criticalDefectsCount} critical open defects.`,
      source_records_json: JSON.stringify({ criticalDefectsCount }),
    });
  }

  // General preventative candidate based on project lifecycle
  if (candidates.length < 3) {
    candidates.push({
      suggested_title: "Procurement Delivery Lead Time Volatility for Essential Materials",
      description: "Project dependency on key material deliveries without confirmed long-lead buffer times poses a threat of site halts.",
      category: "Procurement",
      cause: "Supply chain disruptions, supplier stockout, transport delays or import clearance slowdowns.",
      potential_consequences: "Site idle time, standby machine hiring penalties, milestone target delays.",
      affected_project_area: "Cost",
      recommended_likelihood: 3,
      recommended_impact: 3,
      recommended_mitigation: "Secure pre-orders for critical materials 30 days ahead of schedule, vet secondary suppliers, and maintain safety stock buffer.",
      identification_reason: "Standard project procurement lifecycle assessment.",
      source_records_json: JSON.stringify({ projectType: "General Procurement" }),
    });
  }

  // Filter out any duplicates against existing risks or suggestions
  const newSuggestions = [];
  for (const c of candidates) {
    const norm = c.suggested_title.toLowerCase().trim();
    if (!existingTitles.has(norm)) {
      const cls = calculateRiskClassification(c.recommended_likelihood, c.recommended_impact);
      const res = await query(
        `INSERT INTO pm_ai_risk_suggestions
         (company_id, project_id, suggested_title, description, category, cause, potential_consequences,
          affected_project_area, recommended_likelihood, recommended_impact, recommended_score,
          recommended_level, recommended_mitigation, identification_reason, source_records_json, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUGGESTED')`,
        [
          companyId,
          projectId,
          c.suggested_title,
          c.description,
          c.category,
          c.cause,
          c.potential_consequences,
          c.affected_project_area,
          cls.likelihood,
          cls.impact,
          cls.score,
          cls.level,
          c.recommended_mitigation,
          c.identification_reason,
          c.source_records_json,
        ]
      );
      newSuggestions.push({ id: res.insertId, ...c, recommended_score: cls.score, recommended_level: cls.level });
      existingTitles.add(norm);
    }
  }

  return newSuggestions;
}
