/**
 * @file riskManagement.controller.js
 * @description Enterprise-grade Risk Management & Assessment Controller for OmniSuite ERP.
 * Covers full risk lifecycle, 5x5 matrix, inherent & residual scoring, AI risk identification,
 * event-driven monitoring, mitigation tracking, and risk-to-issue materialisation.
 */

import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";
import {
  calculateRiskClassification,
  evaluateMitigationEffectiveness,
  evaluateProjectEvents,
  generateAiRiskSuggestions as runAiRiskEngine,
} from "../services/riskDetectionEngine.js";
import { ensureRiskManagementTables } from "../utils/riskManagementTables.js";

// Helper to extract companyId from request
function getCompanyId(req) {
  return Number(req.scope?.companyId || req.user?.company_id || req.user?.companyIds?.[0] || 1);
}

// Helper to extract userId
function getUserId(req) {
  return Number(req.user?.sub || req.user?.id || 1);
}

/**
 * 1. KPI Statistics Overview
 */
export async function getRiskStats(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const projectId = req.query.projectId ? Number(req.query.projectId) : null;
    const category = req.query.category || null;
    const status = req.query.status || null;

    let whereSql = `WHERE r.company_id = ?`;
    const params = [companyId];

    if (projectId) {
      whereSql += ` AND r.project_id = ?`;
      params.push(projectId);
    }
    if (category && category !== 'ALL') {
      whereSql += ` AND r.category = ?`;
      params.push(category);
    }
    if (status && status !== 'ALL') {
      whereSql += ` AND r.status = ?`;
      params.push(status);
    }

    const [stats] = await query(
      `SELECT
        COUNT(*) as total_risks,
        SUM(CASE WHEN r.inherent_level = 'CRITICAL' THEN 1 ELSE 0 END) as critical_risks,
        SUM(CASE WHEN r.inherent_level = 'HIGH' THEN 1 ELSE 0 END) as high_risks,
        SUM(CASE WHEN r.inherent_level = 'MODERATE' THEN 1 ELSE 0 END) as moderate_risks,
        SUM(CASE WHEN r.inherent_level = 'LOW' THEN 1 ELSE 0 END) as low_risks,
        SUM(CASE WHEN r.status IN ('OPEN', 'IDENTIFIED', 'UNDER_ASSESSMENT') THEN 1 ELSE 0 END) as open_risks,
        SUM(CASE WHEN r.status = 'UNDER_MITIGATION' THEN 1 ELSE 0 END) as under_mitigation,
        SUM(CASE WHEN r.status = 'MATERIALISED' THEN 1 ELSE 0 END) as materialised_risks,
        SUM(CASE WHEN r.status = 'CLOSED' THEN 1 ELSE 0 END) as closed_risks,
        SUM(CASE WHEN r.reassessment_required = 1 THEN 1 ELSE 0 END) as awaiting_reassessment
       FROM pm_risks r
       ${whereSql}`,
      params
    );

    // Overdue mitigation actions count
    let actWhereSql = `WHERE a.company_id = ? AND a.due_date < CURRENT_DATE() AND a.status NOT IN ('COMPLETED', 'CANCELLED')`;
    const actParams = [companyId];
    if (projectId) {
      actWhereSql += ` AND a.project_id = ?`;
      actParams.push(projectId);
    }

    const [overdueAct] = await query(
      `SELECT COUNT(*) as overdue_actions FROM pm_risk_mitigation_actions a ${actWhereSql}`,
      actParams
    );

    res.json({
      total_risks: Number(stats?.total_risks || 0),
      critical_risks: Number(stats?.critical_risks || 0),
      high_risks: Number(stats?.high_risks || 0),
      moderate_risks: Number(stats?.moderate_risks || 0),
      low_risks: Number(stats?.low_risks || 0),
      open_risks: Number(stats?.open_risks || 0),
      under_mitigation: Number(stats?.under_mitigation || 0),
      materialised_risks: Number(stats?.materialised_risks || 0),
      closed_risks: Number(stats?.closed_risks || 0),
      awaiting_reassessment: Number(stats?.awaiting_reassessment || 0),
      overdue_mitigation_actions: Number(overdueAct?.overdue_actions || 0),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. 5x5 Heatmap Matrix Aggregation
 */
export async function getRiskMatrix(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const projectId = req.query.projectId ? Number(req.query.projectId) : null;
    const mode = req.query.mode === 'residual' ? 'residual' : 'inherent';
    const category = req.query.category || null;
    const status = req.query.status || null;

    let whereSql = `WHERE r.company_id = ?`;
    const params = [companyId];

    if (projectId) {
      whereSql += ` AND r.project_id = ?`;
      params.push(projectId);
    }
    if (category && category !== 'ALL') {
      whereSql += ` AND r.category = ?`;
      params.push(category);
    }
    if (status && status !== 'ALL') {
      whereSql += ` AND r.status = ?`;
      params.push(status);
    } else {
      whereSql += ` AND r.status NOT IN ('CLOSED', 'DRAFT')`;
    }

    const rows = await query(
      `SELECT r.id, r.risk_code, r.title, r.category, r.status, r.risk_owner,
              r.inherent_likelihood, r.inherent_impact, r.inherent_score, r.inherent_level,
              r.residual_likelihood, r.residual_impact, r.residual_score, r.residual_level,
              r.risk_reduction_pct, r.mitigation_effectiveness, p.project_name, p.project_code
       FROM pm_risks r
       JOIN pm_projects p ON p.id = r.project_id
       ${whereSql}`,
      params
    );

    // Build 5x5 grid cells: likelihood 1..5 (vertical), impact 1..5 (horizontal)
    const grid = {};
    for (let l = 1; l <= 5; l++) {
      grid[l] = {};
      for (let i = 1; i <= 5; i++) {
        const score = l * i;
        let level = "LOW";
        if (score >= 17) level = "CRITICAL";
        else if (score >= 10) level = "HIGH";
        else if (score >= 5) level = "MODERATE";

        grid[l][i] = {
          likelihood: l,
          impact: i,
          score,
          level,
          count: 0,
          risks: [],
        };
      }
    }

    rows.forEach((r) => {
      const l = mode === 'residual' ? (r.residual_likelihood || r.inherent_likelihood) : r.inherent_likelihood;
      const i = mode === 'residual' ? (r.residual_impact || r.inherent_impact) : r.inherent_impact;
      const cl = Math.min(5, Math.max(1, l));
      const ci = Math.min(5, Math.max(1, i));

      grid[cl][ci].count++;
      grid[cl][ci].risks.push({
        id: r.id,
        risk_code: r.risk_code,
        title: r.title,
        risk_title: r.title,
        category: r.category,
        category_name: r.category,
        status: r.status,
        owner: r.risk_owner,
        risk_owner: r.risk_owner,
        project_name: r.project_name,
        project_code: r.project_code,
        score: mode === 'residual' ? (r.residual_score || r.inherent_score) : r.inherent_score,
        level: mode === 'residual' ? (r.residual_level || r.inherent_level) : r.inherent_level,
        reduction_pct: r.risk_reduction_pct,
        effectiveness: r.mitigation_effectiveness,
      });
    });

    const flattenedCells = [];
    for (let l = 1; l <= 5; l++) {
      for (let i = 1; i <= 5; i++) {
        flattenedCells.push(grid[l][i]);
      }
    }

    res.json({ mode, total_mapped: rows.length, matrix: grid, data: flattenedCells });
  } catch (err) {
    next(err);
  }
}

/**
 * 3. List Risk Register with Filtering & Search
 */
export async function listRisks(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const projectId = req.query.projectId ? Number(req.query.projectId) : null;
    const category = req.query.category || null;
    const level = req.query.level || null;
    const status = req.query.status || null;
    const search = req.query.search ? String(req.query.search).trim() : null;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    let whereSql = `WHERE r.company_id = ?`;
    const params = [companyId];

    if (projectId) {
      whereSql += ` AND r.project_id = ?`;
      params.push(projectId);
    }
    if (category && category !== 'ALL') {
      whereSql += ` AND r.category = ?`;
      params.push(category);
    }
    if (level && level !== 'ALL') {
      whereSql += ` AND (r.inherent_level = ? OR r.residual_level = ?)`;
      params.push(level, level);
    }
    if (status && status !== 'ALL') {
      whereSql += ` AND r.status = ?`;
      params.push(status);
    }
    if (search) {
      whereSql += ` AND (r.risk_code LIKE ? OR r.title LIKE ? OR r.description LIKE ? OR r.risk_owner LIKE ? OR p.project_name LIKE ?)`;
      const kw = `%${search}%`;
      params.push(kw, kw, kw, kw, kw);
    }

    const [countResult] = await query(
      `SELECT COUNT(*) as total
       FROM pm_risks r
       JOIN pm_projects p ON p.id = r.project_id
       ${whereSql}`,
      params
    );

    const risks = await query(
      `SELECT r.*,
              p.project_name, p.project_code,
              (SELECT COUNT(*) FROM pm_risk_mitigation_actions a WHERE a.risk_id = r.id) as total_actions,
              (SELECT COUNT(*) FROM pm_risk_mitigation_actions a WHERE a.risk_id = r.id AND a.status = 'COMPLETED') as completed_actions,
              (SELECT COUNT(*) FROM pm_risk_mitigation_actions a WHERE a.risk_id = r.id AND a.due_date < CURRENT_DATE() AND a.status NOT IN ('COMPLETED', 'CANCELLED')) as overdue_actions
       FROM pm_risks r
       JOIN pm_projects p ON p.id = r.project_id
       ${whereSql}
       ORDER BY r.inherent_score DESC, r.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const mappedRisks = risks.map((r) => ({
      ...r,
      risk_title: r.title,
      category_name: r.category,
      potential_consequences: r.consequences,
      risk_cause: r.cause,
      risk_source: r.source,
      inherent_classification: r.inherent_level,
      residual_classification: r.residual_level,
      risk_reduction_percent: r.risk_reduction_pct,
    }));

    res.json({
      items: mappedRisks,
      data: mappedRisks,
      total: Number(countResult?.total || 0),
      page,
      limit,
      totalPages: Math.ceil(Number(countResult?.total || 0) / limit),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. Get Single Risk with Actions, History, and Monitoring Records
 */
export async function getRiskById(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const riskId = Number(req.params.id);

    const [risk] = await query(
      `SELECT r.*, p.project_name, p.project_code
       FROM pm_risks r
       JOIN pm_projects p ON p.id = r.project_id
       WHERE r.id = ? AND r.company_id = ?`,
      [riskId, companyId]
    );

    if (!risk) {
      return next(httpError(404, "Risk record not found"));
    }

    const [actions, history, events, linkedIssue] = await Promise.all([
      query(`SELECT * FROM pm_risk_mitigation_actions WHERE risk_id = ? ORDER BY due_date ASC`, [riskId]),
      query(`SELECT * FROM pm_risk_assessment_history WHERE risk_id = ? ORDER BY id DESC`, [riskId]),
      query(`SELECT * FROM pm_risk_monitoring_events WHERE risk_id = ? ORDER BY id DESC LIMIT 20`, [riskId]),
      risk.converted_issue_id
        ? query(`SELECT id, reference_no, issue_title, status, severity, target_resolution_date FROM pm_project_issues WHERE id = ?`, [risk.converted_issue_id]).then(rows => rows[0] || null)
        : Promise.resolve(null),
    ]);

    res.json({
      risk,
      mitigation_actions: actions,
      assessment_history: history,
      monitoring_events: events,
      linked_issue: linkedIssue,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 5. Get Next Auto-Generated Risk Code
 */
export async function getNextRiskCode(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const projectId = Number(req.query.projectId || 0);

    const year = new Date().getFullYear();
    const [row] = await query(
      `SELECT COUNT(*) as count FROM pm_risks WHERE company_id = ? AND created_at >= ?`,
      [companyId, `${year}-01-01`]
    );
    const seq = (Number(row?.count || 0) + 1).toString().padStart(4, "0");
    const code = `RSK-${year}-${seq}`;

    res.json({ code });
  } catch (err) {
    next(err);
  }
}

/**
 * 6. Create Risk Record
 */
export async function createRisk(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const {
      project_id,
      affected_area = "Time/Schedule",
      date_identified,
      identified_by,
      risk_owner,
      risk_owner_user_id,
      inherent_likelihood = 3,
      inherent_impact = 3,
      existing_controls,
      residual_likelihood,
      residual_impact,
      treatment_strategy = "REDUCE",
      mitigation_plan,
      contingency_plan,
      target_mitigation_date,
      supporting_attachments,
      notes,
      status = "OPEN",
    } = req.body;

    const riskTitle = req.body.title || req.body.risk_title || "";
    const riskDesc = req.body.description || req.body.potential_consequences || req.body.risk_cause || req.body.risk_title || "Identified project risk";
    let riskCat = req.body.category || req.body.category_name || "";
    if (!riskCat && req.body.category_id) {
      const [catRow] = await query(`SELECT name FROM pm_risk_categories WHERE id = ? LIMIT 1`, [req.body.category_id]);
      riskCat = catRow?.name || "Operational";
    }
    if (!riskCat) riskCat = "Operational";

    const riskSource = req.body.source || req.body.risk_source || "Project Assessment";
    const riskCause = req.body.cause || req.body.risk_cause || null;
    const riskConsequences = req.body.consequences || req.body.potential_consequences || null;

    if (!project_id || !riskTitle) {
      return next(httpError(400, "Project and Risk Title are required"));
    }

    // Inherent risk scoring
    const inh = calculateRiskClassification(inherent_likelihood, inherent_impact);

    // Residual risk scoring (if provided, else mirrors inherent initially)
    const resL = residual_likelihood !== undefined && residual_likelihood !== null ? Number(residual_likelihood) : inh.likelihood;
    const resI = residual_impact !== undefined && residual_impact !== null ? Number(residual_impact) : inh.impact;
    const resCls = calculateRiskClassification(resL, resI);
    const eff = evaluateMitigationEffectiveness(inh.score, resCls.score);

    // Auto-generate code
    const year = new Date().getFullYear();
    const [countRow] = await query(
      `SELECT COUNT(*) as count FROM pm_risks WHERE company_id = ?`,
      [companyId]
    );
    const risk_code = req.body.risk_code || `RSK-${year}-${(Number(countRow?.count || 0) + 1).toString().padStart(4, "0")}`;

    const insertResult = await query(
      `INSERT INTO pm_risks
       (company_id, project_id, risk_code, title, description, category, source, cause, consequences,
        affected_area, date_identified, identified_by, identified_by_user_id, risk_owner, risk_owner_user_id,
        inherent_likelihood, inherent_impact, inherent_score, inherent_level, existing_controls,
        residual_likelihood, residual_impact, residual_score, residual_level, risk_exposure_trend,
        risk_reduction_pct, mitigation_effectiveness, treatment_strategy, mitigation_plan,
        contingency_plan, target_mitigation_date, supporting_attachments, notes, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        project_id,
        risk_code,
        riskTitle,
        riskDesc,
        riskCat,
        riskSource,
        riskCause,
        riskConsequences,
        affected_area,
        date_identified || new Date().toISOString().slice(0, 10),
        identified_by || req.user?.username || null,
        userId,
        risk_owner || null,
        risk_owner_user_id || null,
        inh.likelihood,
        inh.impact,
        inh.score,
        inh.level,
        existing_controls || null,
        resCls.likelihood,
        resCls.impact,
        resCls.score,
        resCls.level,
        eff.trend,
        eff.reductionPct,
        eff.effectiveness,
        treatment_strategy,
        mitigation_plan || null,
        contingency_plan || null,
        target_mitigation_date || null,
        supporting_attachments || null,
        notes || null,
        status,
        userId,
      ]
    );

    const newRiskId = insertResult.insertId;

    // Record initial inherent baseline in history
    await query(
      `INSERT INTO pm_risk_assessment_history
       (company_id, project_id, risk_id, assessment_type, likelihood, impact, score, level, notes, reassessed_by, reassessed_by_user_id)
       VALUES (?, ?, ?, 'INHERENT', ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        project_id,
        newRiskId,
        inh.likelihood,
        inh.impact,
        inh.score,
        inh.level,
        "Initial Risk Identification & Inherent Assessment",
        req.user?.username || "System",
        userId,
      ]
    );

    // If critical or high risk identified, push notification
    if (inh.level === 'CRITICAL' || inh.level === 'HIGH') {
      try {
        await query(
          `INSERT INTO adm_notifications (company_id, user_id, title, message, link, created_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            companyId,
            risk_owner_user_id || userId,
            `⚠️ ${inh.level} Risk Identified: ${risk_code}`,
            `Risk "${title}" was recorded with a critical/high score of ${inh.score}. Immediate mitigation required.`,
            `/project-management/risk-management?projectId=${project_id}&riskId=${newRiskId}`,
            userId,
          ]
        );
      } catch {
        // Notification table insert fallback
      }
    }

    res.status(201).json({
      message: "Risk created successfully",
      id: newRiskId,
      risk_code,
      inherent_score: inh.score,
      inherent_level: inh.level,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 7. Update Risk Record
 */
export async function updateRisk(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const riskId = Number(req.params.id);

    const [existing] = await query(
      `SELECT * FROM pm_risks WHERE id = ? AND company_id = ?`,
      [riskId, companyId]
    );

    if (!existing) {
      return next(httpError(404, "Risk record not found"));
    }

    const title = req.body.title || req.body.risk_title || undefined;
    const description = req.body.description || req.body.potential_consequences || req.body.risk_cause || undefined;
    let category = req.body.category || req.body.category_name || undefined;
    if (!category && req.body.category_id) {
      const [catRow] = await query(`SELECT name FROM pm_risk_categories WHERE id = ? LIMIT 1`, [req.body.category_id]);
      category = catRow?.name;
    }
    const source = req.body.source !== undefined ? req.body.source : req.body.risk_source;
    const cause = req.body.cause !== undefined ? req.body.cause : req.body.risk_cause;
    const consequences = req.body.consequences !== undefined ? req.body.consequences : req.body.potential_consequences;

    const {
      affected_area,
      date_identified,
      risk_owner,
      risk_owner_user_id,
      inherent_likelihood,
      inherent_impact,
      existing_controls,
      treatment_strategy,
      mitigation_plan,
      contingency_plan,
      target_mitigation_date,
      actual_mitigation_date,
      supporting_attachments,
      notes,
      status,
    } = req.body;

    // Recalculate inherent if modified
    let inhL = inherent_likelihood !== undefined ? Number(inherent_likelihood) : existing.inherent_likelihood;
    let inhI = inherent_impact !== undefined ? Number(inherent_impact) : existing.inherent_impact;
    const inh = calculateRiskClassification(inhL, inhI);

    // Re-evaluate effectiveness against current residual
    const eff = evaluateMitigationEffectiveness(inh.score, existing.residual_score || inh.score);

    await query(
      `UPDATE pm_risks
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           category = COALESCE(?, category),
           source = ?,
           cause = ?,
           consequences = ?,
           affected_area = COALESCE(?, affected_area),
           date_identified = COALESCE(?, date_identified),
           risk_owner = ?,
           risk_owner_user_id = ?,
           inherent_likelihood = ?,
           inherent_impact = ?,
           inherent_score = ?,
           inherent_level = ?,
           existing_controls = ?,
           treatment_strategy = COALESCE(?, treatment_strategy),
           mitigation_plan = ?,
           contingency_plan = ?,
           target_mitigation_date = ?,
           actual_mitigation_date = ?,
           supporting_attachments = ?,
           notes = ?,
           status = COALESCE(?, status),
           risk_reduction_pct = ?,
           risk_exposure_trend = ?,
           mitigation_effectiveness = ?,
           updated_by = ?
       WHERE id = ? AND company_id = ?`,
      [
        title,
        description,
        category,
        source !== undefined ? source : existing.source,
        cause !== undefined ? cause : existing.cause,
        consequences !== undefined ? consequences : existing.consequences,
        affected_area,
        date_identified,
        risk_owner !== undefined ? risk_owner : existing.risk_owner,
        risk_owner_user_id !== undefined ? risk_owner_user_id : existing.risk_owner_user_id,
        inh.likelihood,
        inh.impact,
        inh.score,
        inh.level,
        existing_controls !== undefined ? existing_controls : existing.existing_controls,
        treatment_strategy,
        mitigation_plan !== undefined ? mitigation_plan : existing.mitigation_plan,
        contingency_plan !== undefined ? contingency_plan : existing.contingency_plan,
        target_mitigation_date !== undefined ? target_mitigation_date : existing.target_mitigation_date,
        actual_mitigation_date !== undefined ? actual_mitigation_date : existing.actual_mitigation_date,
        supporting_attachments !== undefined ? supporting_attachments : existing.supporting_attachments,
        notes !== undefined ? notes : existing.notes,
        status,
        eff.reductionPct,
        eff.trend,
        eff.effectiveness,
        userId,
        riskId,
        companyId,
      ]
    );

    res.json({ message: "Risk updated successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * 8. Reassess Residual Risk & Evaluate Mitigation Effectiveness
 */
export async function reassessRisk(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const riskId = Number(req.params.id);

    const [risk] = await query(
      `SELECT * FROM pm_risks WHERE id = ? AND company_id = ?`,
      [riskId, companyId]
    );

    if (!risk) {
      return next(httpError(404, "Risk record not found"));
    }

    const { residual_likelihood, residual_impact, reassessment_notes } = req.body;

    if (!residual_likelihood || !residual_impact) {
      return next(httpError(400, "Residual Likelihood and Residual Impact are required"));
    }

    const resCls = calculateRiskClassification(residual_likelihood, residual_impact);
    const eff = evaluateMitigationEffectiveness(risk.inherent_score, resCls.score);

    await query(
      `UPDATE pm_risks
       SET residual_likelihood = ?,
           residual_impact = ?,
           residual_score = ?,
           residual_level = ?,
           risk_exposure_trend = ?,
           risk_reduction_pct = ?,
           mitigation_effectiveness = ?,
           last_reassessed_date = CURRENT_DATE(),
           reassessment_required = 0,
           reassessment_trigger_reason = NULL,
           status = CASE WHEN status = 'UNDER_ASSESSMENT' THEN 'UNDER_MITIGATION' ELSE status END,
           updated_by = ?
       WHERE id = ? AND company_id = ?`,
      [
        resCls.likelihood,
        resCls.impact,
        resCls.score,
        resCls.level,
        eff.trend,
        eff.reductionPct,
        eff.effectiveness,
        userId,
        riskId,
        companyId,
      ]
    );

    // Log in audit history
    await query(
      `INSERT INTO pm_risk_assessment_history
       (company_id, project_id, risk_id, assessment_type, likelihood, impact, score, level, effectiveness, notes, reassessed_by, reassessed_by_user_id)
       VALUES (?, ?, ?, 'RESIDUAL', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        risk.project_id,
        riskId,
        resCls.likelihood,
        resCls.impact,
        resCls.score,
        resCls.level,
        eff.effectiveness,
        reassessment_notes || `Residual re-evaluation. Exposure ${eff.trend} (${eff.reductionPct}% change).`,
        req.user?.username || "User",
        userId,
      ]
    );

    res.json({
      message: "Risk reassessed successfully",
      residual_score: resCls.score,
      residual_level: resCls.level,
      reduction_pct: eff.reductionPct,
      trend: eff.trend,
      effectiveness: eff.effectiveness,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 9. Close Risk (with mandatory justification)
 */
export async function closeRisk(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const riskId = Number(req.params.id);
    const { closure_reason } = req.body;

    if (!closure_reason || !closure_reason.trim()) {
      return next(httpError(400, "Closure justification reason is required"));
    }

    const [risk] = await query(
      `SELECT * FROM pm_risks WHERE id = ? AND company_id = ?`,
      [riskId, companyId]
    );

    if (!risk) {
      return next(httpError(404, "Risk record not found"));
    }

    await query(
      `UPDATE pm_risks
       SET status = 'CLOSED',
           closure_reason = ?,
           closed_by = ?,
           closed_at = NOW(),
           updated_by = ?
       WHERE id = ? AND company_id = ?`,
      [closure_reason.trim(), userId, userId, riskId, companyId]
    );

    await query(
      `INSERT INTO pm_risk_assessment_history
       (company_id, project_id, risk_id, assessment_type, likelihood, impact, score, level, notes, reassessed_by, reassessed_by_user_id)
       VALUES (?, ?, ?, 'CLOSURE', ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        risk.project_id,
        riskId,
        risk.residual_likelihood || risk.inherent_likelihood,
        risk.residual_impact || risk.inherent_impact,
        risk.residual_score || risk.inherent_score,
        risk.residual_level || risk.inherent_level,
        `Risk Closed: ${closure_reason.trim()}`,
        req.user?.username || "User",
        userId,
      ]
    );

    res.json({ message: "Risk closed successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * 10. Materialise Risk and Convert to Project Issue
 */
export async function materialiseRisk(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const riskId = Number(req.params.id);

    const [risk] = await query(
      `SELECT r.*, p.project_name FROM pm_risks r JOIN pm_projects p ON p.id = r.project_id WHERE r.id = ? AND r.company_id = ?`,
      [riskId, companyId]
    );

    if (!risk) {
      return next(httpError(404, "Risk record not found"));
    }

    if (risk.converted_issue_id) {
      return next(httpError(400, "This risk has already been converted into an issue"));
    }

    const { actual_impact, occurrence_date, issue_priority = "HIGH" } = req.body;

    // Generate Issue Reference
    const year = new Date().getFullYear();
    const [issueCount] = await query(
      `SELECT COUNT(*) as count FROM pm_project_issues WHERE company_id = ?`,
      [companyId]
    );
    const issueRef = `ISSUE-${year}-${(Number(issueCount?.count || 0) + 1).toString().padStart(4, "0")}`;

    // Map Risk Level to Severity
    let severity = "MAJOR";
    if (risk.inherent_level === 'CRITICAL') severity = "CRITICAL";
    else if (risk.inherent_level === 'HIGH') severity = "MAJOR";
    else if (risk.inherent_level === 'MODERATE') severity = "MODERATE";
    else severity = "MINOR";

    // Insert into pm_project_issues
    const issueInsert = await query(
      `INSERT INTO pm_project_issues
       (company_id, project_id, reference_no, issue_title, description, category, severity, priority,
        impact, date_identified, identified_by, assigned_to, required_corrective_action, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
      [
        companyId,
        risk.project_id,
        issueRef,
        `[Materialised Risk] ${risk.title}`,
        `${risk.description}\n\n[Trigger Cause]: ${risk.cause || 'Unspecified'}\n[Actual Impact]: ${actual_impact || risk.consequences || 'Under assessment'}`,
        risk.category,
        severity,
        issue_priority,
        actual_impact || risk.consequences || "Impact incurred from materialised risk",
        occurrence_date || new Date().toISOString().slice(0, 10),
        req.user?.username || "Risk System",
        risk.risk_owner || null,
        risk.contingency_plan || risk.mitigation_plan || "Activate project contingency procedures",
        userId,
      ]
    );

    const issueId = issueInsert.insertId;

    // Update Risk Record to Materialised
    await query(
      `UPDATE pm_risks
       SET status = 'MATERIALISED',
           materialised_date = ?,
           materialised_actual_impact = ?,
           converted_issue_id = ?,
           updated_by = ?
       WHERE id = ? AND company_id = ?`,
      [
        occurrence_date || new Date().toISOString().slice(0, 10),
        actual_impact || "Risk materialised into operational issue",
        issueId,
        userId,
        riskId,
        companyId,
      ]
    );

    // Record History
    await query(
      `INSERT INTO pm_risk_assessment_history
       (company_id, project_id, risk_id, assessment_type, likelihood, impact, score, level, notes, reassessed_by, reassessed_by_user_id)
       VALUES (?, ?, ?, 'MATERIALISED', 5, 5, 25, 'CRITICAL', ?, ?, ?)`,
      [
        companyId,
        risk.project_id,
        riskId,
        `Risk Materialised and Converted to Issue #${issueRef}`,
        req.user?.username || "System",
        userId,
      ]
    );

    res.json({
      message: "Risk materialised and converted to Project Issue successfully",
      converted_issue_id: issueId,
      issue_reference: issueRef,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 11. Delete Risk Record
 */
export async function deleteRisk(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const riskId = Number(req.params.id);

    const [risk] = await query(
      `SELECT * FROM pm_risks WHERE id = ? AND company_id = ?`,
      [riskId, companyId]
    );

    if (!risk) {
      return next(httpError(404, "Risk record not found"));
    }

    if (risk.converted_issue_id) {
      return next(httpError(400, "Cannot delete a risk that has been converted to an active issue"));
    }

    await query(`DELETE FROM pm_risk_mitigation_actions WHERE risk_id = ?`, [riskId]);
    await query(`DELETE FROM pm_risk_assessment_history WHERE risk_id = ?`, [riskId]);
    await query(`DELETE FROM pm_risk_monitoring_events WHERE risk_id = ?`, [riskId]);
    await query(`DELETE FROM pm_risks WHERE id = ? AND company_id = ?`, [riskId, companyId]);

    res.json({ message: "Risk deleted successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * 12. Mitigation Actions CRUD
 */
export async function listMitigationActions(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const riskId = req.query.riskId ? Number(req.query.riskId) : null;
    const projectId = req.query.projectId ? Number(req.query.projectId) : null;

    let whereSql = `WHERE a.company_id = ?`;
    const params = [companyId];

    if (riskId) {
      whereSql += ` AND a.risk_id = ?`;
      params.push(riskId);
    }
    if (projectId) {
      whereSql += ` AND a.project_id = ?`;
      params.push(projectId);
    }

    const actions = await query(
      `SELECT a.*, r.risk_code, r.title as risk_title, r.inherent_level, r.residual_level, p.project_name
       FROM pm_risk_mitigation_actions a
       JOIN pm_risks r ON r.id = a.risk_id
       JOIN pm_projects p ON p.id = a.project_id
       ${whereSql}
       ORDER BY a.due_date ASC, a.id DESC`,
      params
    );

    res.json({ items: actions });
  } catch (err) {
    next(err);
  }
}

export async function createMitigationAction(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const userId = getUserId(req);

    const {
      risk_id,
      description,
      responsible_person,
      responsible_user_id,
      start_date,
      due_date,
      progress_pct = 0,
      status = "NOT_STARTED",
      supporting_evidence,
      remarks,
      cost_estimate = 0,
    } = req.body;

    if (!risk_id || !description || !responsible_person || !due_date) {
      return next(httpError(400, "Risk ID, Description, Responsible Person, and Due Date are required"));
    }

    const [risk] = await query(
      `SELECT * FROM pm_risks WHERE id = ? AND company_id = ?`,
      [Number(risk_id), companyId]
    );

    if (!risk) {
      return next(httpError(404, "Parent risk not found"));
    }

    const [countRow] = await query(
      `SELECT COUNT(*) as count FROM pm_risk_mitigation_actions WHERE risk_id = ?`,
      [Number(risk_id)]
    );
    const action_code = `ACT-${(Number(countRow?.count || 0) + 1).toString().padStart(3, "0")}`;

    const insertResult = await query(
      `INSERT INTO pm_risk_mitigation_actions
       (company_id, project_id, risk_id, action_code, description, responsible_person,
        responsible_user_id, start_date, due_date, progress_pct, status, supporting_evidence,
        remarks, cost_estimate, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        risk.project_id,
        risk.id,
        action_code,
        description,
        responsible_person,
        responsible_user_id || null,
        start_date || new Date().toISOString().slice(0, 10),
        due_date,
        Number(progress_pct || 0),
        status,
        supporting_evidence || null,
        remarks || null,
        Number(cost_estimate || 0),
        userId,
      ]
    );

    // If risk was in OPEN or IDENTIFIED, transition to UNDER_MITIGATION
    if (risk.status === 'OPEN' || risk.status === 'IDENTIFIED') {
      await query(
        `UPDATE pm_risks SET status = 'UNDER_MITIGATION', updated_by = ? WHERE id = ?`,
        [userId, risk.id]
      );
    }

    res.status(201).json({
      message: "Mitigation action added successfully",
      id: insertResult.insertId,
      action_code,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateMitigationAction(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const actionId = Number(req.params.id);

    const [action] = await query(
      `SELECT * FROM pm_risk_mitigation_actions WHERE id = ? AND company_id = ?`,
      [actionId, companyId]
    );

    if (!action) {
      return next(httpError(404, "Mitigation action not found"));
    }

    const {
      description,
      responsible_person,
      responsible_user_id,
      start_date,
      due_date,
      completion_date,
      progress_pct,
      status,
      supporting_evidence,
      remarks,
      actual_cost,
    } = req.body;

    let compDate = completion_date;
    if (status === 'COMPLETED' && !compDate) {
      compDate = new Date().toISOString().slice(0, 10);
    }

    await query(
      `UPDATE pm_risk_mitigation_actions
       SET description = COALESCE(?, description),
           responsible_person = COALESCE(?, responsible_person),
           responsible_user_id = ?,
           start_date = COALESCE(?, start_date),
           due_date = COALESCE(?, due_date),
           completion_date = ?,
           progress_pct = COALESCE(?, progress_pct),
           status = COALESCE(?, status),
           supporting_evidence = ?,
           remarks = ?,
           actual_cost = COALESCE(?, actual_cost),
           updated_by = ?
       WHERE id = ? AND company_id = ?`,
      [
        description,
        responsible_person,
        responsible_user_id !== undefined ? responsible_user_id : action.responsible_user_id,
        start_date,
        due_date,
        compDate !== undefined ? compDate : action.completion_date,
        progress_pct !== undefined ? Number(progress_pct) : action.progress_pct,
        status,
        supporting_evidence !== undefined ? supporting_evidence : action.supporting_evidence,
        remarks !== undefined ? remarks : action.remarks,
        actual_cost !== undefined ? Number(actual_cost) : action.actual_cost,
        userId,
        actionId,
        companyId,
      ]
    );

    res.json({ message: "Mitigation action updated successfully" });
  } catch (err) {
    next(err);
  }
}

export async function deleteMitigationAction(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const actionId = Number(req.params.id);

    await query(
      `DELETE FROM pm_risk_mitigation_actions WHERE id = ? AND company_id = ?`,
      [actionId, companyId]
    );

    res.json({ message: "Mitigation action deleted successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * 13. AI Risk Suggestions Endpoints
 */
export async function generateAiSuggestions(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const projectId = Number(req.body.projectId);

    if (!projectId) {
      return next(httpError(400, "Project ID is required to generate AI risk suggestions"));
    }

    const suggestions = await runAiRiskEngine(companyId, projectId, userId);

    res.json({
      message: `Generated ${suggestions.length} risk suggestion(s) awaiting your review.`,
      suggestions,
    });
  } catch (err) {
    next(err);
  }
}

export async function listAiSuggestions(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const projectId = req.query.projectId ? Number(req.query.projectId) : null;
    const status = req.query.status || 'SUGGESTED';

    let whereSql = `WHERE s.company_id = ?`;
    const params = [companyId];

    if (projectId) {
      whereSql += ` AND s.project_id = ?`;
      params.push(projectId);
    }
    if (status && status !== 'ALL') {
      whereSql += ` AND s.status = ?`;
      params.push(status);
    }

    const items = await query(
      `SELECT s.*, p.project_name, p.project_code
       FROM pm_ai_risk_suggestions s
       JOIN pm_projects p ON p.id = s.project_id
       ${whereSql}
       ORDER BY s.recommended_score DESC, s.id DESC`,
      params
    );

    res.json({ items });
  } catch (err) {
    next(err);
  }
}

export async function acceptAiSuggestion(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const suggestionId = Number(req.params.id);

    const [sugg] = await query(
      `SELECT * FROM pm_ai_risk_suggestions WHERE id = ? AND company_id = ?`,
      [suggestionId, companyId]
    );

    if (!sugg) {
      return next(httpError(404, "AI Suggestion not found"));
    }

    if (sugg.status === 'ACCEPTED') {
      return next(httpError(400, "Suggestion has already been accepted"));
    }

    // Auto-generate code
    const year = new Date().getFullYear();
    const [countRow] = await query(`SELECT COUNT(*) as count FROM pm_risks WHERE company_id = ?`, [companyId]);
    const risk_code = `RSK-${year}-${(Number(countRow?.count || 0) + 1).toString().padStart(4, "0")}`;

    const inh = calculateRiskClassification(sugg.recommended_likelihood, sugg.recommended_impact);

    const insertResult = await query(
      `INSERT INTO pm_risks
       (company_id, project_id, risk_code, title, description, category, source, cause, consequences,
        affected_area, date_identified, identified_by, identified_by_user_id,
        inherent_likelihood, inherent_impact, inherent_score, inherent_level,
        residual_likelihood, residual_impact, residual_score, residual_level,
        mitigation_plan, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'AI-Assisted Detection', ?, ?, ?, CURRENT_DATE(), 'AI Assistant (Validated)', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
      [
        companyId,
        sugg.project_id,
        risk_code,
        sugg.suggested_title,
        sugg.description,
        sugg.category,
        sugg.cause || null,
        sugg.potential_consequences || null,
        sugg.affected_project_area || "Time/Schedule",
        userId,
        inh.likelihood,
        inh.impact,
        inh.score,
        inh.level,
        inh.likelihood,
        inh.impact,
        inh.score,
        inh.level,
        sugg.recommended_mitigation || null,
        userId,
      ]
    );

    const newRiskId = insertResult.insertId;

    // Update suggestion status
    await query(
      `UPDATE pm_ai_risk_suggestions
       SET status = 'ACCEPTED', accepted_risk_id = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [newRiskId, userId, suggestionId]
    );

    // Initial history record
    await query(
      `INSERT INTO pm_risk_assessment_history
       (company_id, project_id, risk_id, assessment_type, likelihood, impact, score, level, notes, reassessed_by, reassessed_by_user_id)
       VALUES (?, ?, ?, 'INHERENT', ?, ?, ?, ?, 'Created from Validated AI Suggestion', ?, ?)`,
      [companyId, sugg.project_id, newRiskId, inh.likelihood, inh.impact, inh.score, inh.level, req.user?.username || "User", userId]
    );

    res.json({
      message: "Suggestion accepted and risk successfully created!",
      risk_id: newRiskId,
      risk_code,
    });
  } catch (err) {
    next(err);
  }
}

export async function dismissAiSuggestion(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const suggestionId = Number(req.params.id);
    const { dismissed_reason } = req.body;

    await query(
      `UPDATE pm_ai_risk_suggestions
       SET status = 'DISMISSED',
           dismissed_reason = ?,
           reviewed_by = ?,
           reviewed_at = NOW()
       WHERE id = ? AND company_id = ?`,
      [dismissed_reason || "Dismissed by user", userId, suggestionId, companyId]
    );

    res.json({ message: "Suggestion dismissed" });
  } catch (err) {
    next(err);
  }
}

/**
 * 14. Event-Driven Monitoring Endpoints
 */
export async function runMonitoringScan(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const projectId = req.body.projectId && req.body.projectId !== "ALL" ? Number(req.body.projectId) : null;

    let targetProjectIds = [];
    if (projectId) {
      targetProjectIds = [projectId];
    } else {
      const activePrjs = await query(
        `SELECT id FROM pm_projects WHERE company_id = ? AND (project_status NOT IN ('COMPLETED', 'CANCELLED', 'CLOSED') OR project_status IS NULL) LIMIT 10`,
        [companyId]
      );
      targetProjectIds = activePrjs.map((p) => p.id);
    }

    if (targetProjectIds.length === 0) {
      return res.json({
        message: "No active projects found to evaluate.",
        eventsDetected: 0,
        newEventsLogged: 0,
      });
    }

    let totalDetected = 0;
    let totalLogged = 0;
    for (const pId of targetProjectIds) {
      const result = await evaluateProjectEvents(companyId, pId, userId);
      totalDetected += result.eventsDetected || 0;
      totalLogged += result.newEventsLogged || 0;
    }

    res.json({
      message: `Monitoring scan completed across ${targetProjectIds.length} project(s): ${totalDetected} event(s) analyzed, ${totalLogged} new event(s) logged.`,
      eventsDetected: totalDetected,
      newEventsLogged: totalLogged,
    });
  } catch (err) {
    next(err);
  }
}

export async function listMonitoringEvents(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const projectId = req.query.projectId ? Number(req.query.projectId) : null;
    const riskId = req.query.riskId ? Number(req.query.riskId) : null;

    let whereSql = `WHERE e.company_id = ?`;
    const params = [companyId];

    if (projectId) {
      whereSql += ` AND e.project_id = ?`;
      params.push(projectId);
    }
    if (riskId) {
      whereSql += ` AND e.risk_id = ?`;
      params.push(riskId);
    }

    const events = await query(
      `SELECT e.*, p.project_name, p.project_code, r.risk_code, r.title as risk_title
       FROM pm_risk_monitoring_events e
       JOIN pm_projects p ON p.id = e.project_id
       LEFT JOIN pm_risks r ON r.id = e.risk_id
       ${whereSql}
       ORDER BY e.id DESC LIMIT 50`,
      params
    );

    res.json({ items: events });
  } catch (err) {
    next(err);
  }
}

export async function acknowledgeMonitoringEvent(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const userId = getUserId(req);
    const eventId = Number(req.params.id);

    await query(
      `UPDATE pm_risk_monitoring_events
       SET is_acknowledged = 1, acknowledged_by = ?, acknowledged_at = NOW()
       WHERE id = ? AND company_id = ?`,
      [userId, eventId, companyId]
    );

    res.json({ message: "Event acknowledged" });
  } catch (err) {
    next(err);
  }
}

/**
 * 15. Risk Categories List
 */
export async function listRiskCategories(req, res, next) {
  try {
    await ensureRiskManagementTables();
    const companyId = getCompanyId(req);
    const categories = await query(
      `SELECT * FROM pm_risk_categories WHERE company_id = ? AND is_active = 1 ORDER BY name ASC`,
      [companyId]
    );
    const mapped = categories.map((c) => ({
      ...c,
      category_name: c.name,
    }));
    res.json({ items: mapped, data: mapped });
  } catch (err) {
    next(err);
  }
}
