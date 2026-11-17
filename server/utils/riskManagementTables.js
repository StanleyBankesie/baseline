import { query } from "../db/pool.js";

export async function ensureRiskManagementTables() {
  // 1. Risk Categories Table
  await query(`
    CREATE TABLE IF NOT EXISTS pm_risk_categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      company_id BIGINT UNSIGNED NOT NULL,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) NOT NULL,
      description TEXT NULL,
      color VARCHAR(30) NULL DEFAULT '#64748b',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pm_risk_cat_company (company_id),
      UNIQUE KEY uq_pm_risk_cat (company_id, code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Main Risk Register Table
  await query(`
    CREATE TABLE IF NOT EXISTS pm_risks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      company_id BIGINT UNSIGNED NOT NULL,
      branch_id BIGINT UNSIGNED NULL,
      project_id BIGINT UNSIGNED NOT NULL,
      risk_code VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'Operational',
      source VARCHAR(200) NULL,
      cause TEXT NULL,
      consequences TEXT NULL,
      affected_area VARCHAR(100) NOT NULL DEFAULT 'Time/Schedule',
      date_identified DATE NOT NULL,
      identified_by VARCHAR(200) NULL,
      identified_by_user_id BIGINT UNSIGNED NULL,
      risk_owner VARCHAR(200) NULL,
      risk_owner_user_id BIGINT UNSIGNED NULL,
      
      -- Inherent Risk Assessment (Pre-mitigation)
      inherent_likelihood INT NOT NULL DEFAULT 3,
      inherent_impact INT NOT NULL DEFAULT 3,
      inherent_score INT NOT NULL DEFAULT 9,
      inherent_level VARCHAR(20) NOT NULL DEFAULT 'MODERATE',
      existing_controls TEXT NULL,

      -- Residual Risk Assessment (Post-mitigation)
      residual_likelihood INT NULL DEFAULT 2,
      residual_impact INT NULL DEFAULT 2,
      residual_score INT NULL DEFAULT 4,
      residual_level VARCHAR(20) NULL DEFAULT 'LOW',
      risk_exposure_trend VARCHAR(20) NOT NULL DEFAULT 'UNCHANGED',
      risk_reduction_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
      mitigation_effectiveness VARCHAR(30) NOT NULL DEFAULT 'NOT_EVALUATED',
      last_reassessed_date DATE NULL,
      reassessment_required TINYINT(1) NOT NULL DEFAULT 0,
      reassessment_trigger_reason VARCHAR(255) NULL,

      -- Treatment & Mitigation Planning
      treatment_strategy VARCHAR(50) NOT NULL DEFAULT 'REDUCE',
      mitigation_plan TEXT NULL,
      contingency_plan TEXT NULL,
      target_mitigation_date DATE NULL,
      actual_mitigation_date DATE NULL,
      notes TEXT NULL,
      supporting_attachments TEXT NULL,

      -- Lifecycle & Materialisation
      status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
      closure_reason TEXT NULL,
      closed_by BIGINT UNSIGNED NULL,
      closed_at DATETIME NULL,
      materialised_date DATE NULL,
      materialised_actual_impact TEXT NULL,
      converted_issue_id BIGINT UNSIGNED NULL,

      -- Auditing
      created_by BIGINT UNSIGNED NULL,
      updated_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_pm_risks_co_proj (company_id, project_id),
      INDEX idx_pm_risks_status (status),
      INDEX idx_pm_risks_level (inherent_level, residual_level),
      INDEX idx_pm_risks_owner (risk_owner_user_id),
      INDEX idx_pm_risks_issue (converted_issue_id),
      UNIQUE KEY uq_pm_risk_code (company_id, project_id, risk_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Risk Mitigation Actions
  await query(`
    CREATE TABLE IF NOT EXISTS pm_risk_mitigation_actions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      company_id BIGINT UNSIGNED NOT NULL,
      project_id BIGINT UNSIGNED NOT NULL,
      risk_id BIGINT UNSIGNED NOT NULL,
      action_code VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      responsible_person VARCHAR(200) NOT NULL,
      responsible_user_id BIGINT UNSIGNED NULL,
      start_date DATE NULL,
      due_date DATE NOT NULL,
      completion_date DATE NULL,
      progress_pct INT NOT NULL DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
      supporting_evidence TEXT NULL,
      remarks TEXT NULL,
      cost_estimate DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      actual_cost DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      created_by BIGINT UNSIGNED NULL,
      updated_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

      INDEX idx_pm_risk_act_risk (risk_id),
      INDEX idx_pm_risk_act_co_proj (company_id, project_id),
      INDEX idx_pm_risk_act_status (status),
      INDEX idx_pm_risk_act_due (due_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Risk Assessment History
  await query(`
    CREATE TABLE IF NOT EXISTS pm_risk_assessment_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      company_id BIGINT UNSIGNED NOT NULL,
      project_id BIGINT UNSIGNED NOT NULL,
      risk_id BIGINT UNSIGNED NOT NULL,
      assessment_type VARCHAR(50) NOT NULL DEFAULT 'RESIDUAL',
      likelihood INT NOT NULL,
      impact INT NOT NULL,
      score INT NOT NULL,
      level VARCHAR(20) NOT NULL,
      effectiveness VARCHAR(30) NULL,
      notes TEXT NULL,
      reassessed_by VARCHAR(200) NULL,
      reassessed_by_user_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_pm_risk_hist_risk (risk_id),
      INDEX idx_pm_risk_hist_co_proj (company_id, project_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Risk Monitoring Events
  await query(`
    CREATE TABLE IF NOT EXISTS pm_risk_monitoring_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      company_id BIGINT UNSIGNED NOT NULL,
      project_id BIGINT UNSIGNED NOT NULL,
      risk_id BIGINT UNSIGNED NULL,
      event_category VARCHAR(50) NOT NULL,
      event_title VARCHAR(255) NOT NULL,
      event_description TEXT NOT NULL,
      event_source_table VARCHAR(100) NULL,
      event_source_id BIGINT UNSIGNED NULL,
      impact_rating VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
      action_taken VARCHAR(100) NOT NULL DEFAULT 'LOGGED',
      is_acknowledged TINYINT(1) NOT NULL DEFAULT 0,
      acknowledged_by BIGINT UNSIGNED NULL,
      acknowledged_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_pm_risk_evt_proj (company_id, project_id),
      INDEX idx_pm_risk_evt_risk (risk_id),
      INDEX idx_pm_risk_evt_cat (event_category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. AI Risk Suggestions Table
  await query(`
    CREATE TABLE IF NOT EXISTS pm_ai_risk_suggestions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      company_id BIGINT UNSIGNED NOT NULL,
      project_id BIGINT UNSIGNED NOT NULL,
      suggested_title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'Schedule',
      cause TEXT NULL,
      potential_consequences TEXT NULL,
      affected_project_area VARCHAR(100) NOT NULL DEFAULT 'Time/Schedule',
      recommended_likelihood INT NOT NULL DEFAULT 3,
      recommended_impact INT NOT NULL DEFAULT 3,
      recommended_score INT NOT NULL DEFAULT 9,
      recommended_level VARCHAR(20) NOT NULL DEFAULT 'MODERATE',
      recommended_mitigation TEXT NULL,
      identification_reason TEXT NOT NULL,
      source_records_json TEXT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'SUGGESTED',
      dismissed_reason TEXT NULL,
      accepted_risk_id BIGINT UNSIGNED NULL,
      reviewed_by BIGINT UNSIGNED NULL,
      reviewed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      INDEX idx_pm_ai_risk_proj (company_id, project_id),
      INDEX idx_pm_ai_risk_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Seed default risk categories for companies if empty
  const defaultCats = [
    { name: "Financial", code: "FIN", desc: "Budget overruns, cash flow deficits, currency volatility, funding delays" },
    { name: "Operational", code: "OPS", desc: "Site access, workflow bottlenecks, logistic failures, equipment downtime" },
    { name: "Technical", code: "TECH", desc: "Design changes, engineering complexities, software bugs, integration issues" },
    { name: "Schedule", code: "SCH", desc: "Task delays, milestone slippage, critical path congestion, baseline variance" },
    { name: "Resource", code: "RES", desc: "Staff shortages, key personnel turnover, skill gaps, labor disputes" },
    { name: "Procurement", code: "PROC", desc: "Supplier delays, defective supplies, material price surges, vendor default" },
    { name: "Quality", code: "QA", desc: "Non-conformance reports, repeated defect rates, failed inspection tests" },
    { name: "Health & Safety", code: "HSE", desc: "Workplace accidents, hazardous conditions, PPE non-compliance, near-misses" },
    { name: "Environmental", code: "ENV", desc: "Adverse weather events, spillages, contamination, environmental penalties" },
    { name: "Legal & Regulatory", code: "LEG", desc: "Permit delays, regulatory non-compliance, statutory change, disputes" },
    { name: "Contractual", code: "CONT", desc: "Scope creep, breach of contract terms, unapproved claims, liquidated damages" },
    { name: "External", code: "EXT", desc: "Macroeconomic inflation, community unrest, municipal grid failure, force majeure" },
  ];

  try {
    const companies = await query("SELECT id FROM adm_companies");
    for (const co of companies) {
      for (const cat of defaultCats) {
        await query(
          `INSERT IGNORE INTO pm_risk_categories (company_id, name, code, description) VALUES (?, ?, ?, ?)`,
          [co.id, cat.name, cat.code, cat.desc]
        );
      }
    }
  } catch (err) {
    console.warn("Category seed warning:", err?.message);
  }
}
