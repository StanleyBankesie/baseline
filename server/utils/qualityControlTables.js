import { query } from "../db/pool.js";

export async function ensureQualityControlTables() {
  // 1. Quality Plans & Standards
  await query(`
    CREATE TABLE IF NOT EXISTS pm_quality_plans (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      company_id BIGINT UNSIGNED NOT NULL,
      branch_id BIGINT UNSIGNED NULL,
      project_id INT NOT NULL,
      plan_reference VARCHAR(50) NOT NULL,
      plan_name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      quality_standard VARCHAR(150) NOT NULL DEFAULT 'ISO 9001:2015',
      quality_requirements TEXT NULL,
      acceptance_criteria TEXT NULL,
      responsible_person VARCHAR(200) NULL,
      work_plan_task_id BIGINT UNSIGNED NULL,
      work_plan_task_name VARCHAR(255) NULL,
      applicable_deliverable VARCHAR(255) NULL,
      testing_frequency VARCHAR(100) NULL DEFAULT 'Milestone Delivery',
      supporting_documents TEXT NULL,
      status ENUM('DRAFT','UNDER_REVIEW','APPROVED','ACTIVE','ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_pm_qp_ref (company_id, plan_reference),
      KEY idx_pm_qp_proj (project_id),
      KEY idx_pm_qp_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 2. Expand pm_inspection_requests safely
  const irCols = [
    "ADD COLUMN IF NOT EXISTS plan_id BIGINT UNSIGNED NULL AFTER project_id",
    "ADD COLUMN IF NOT EXISTS inspection_title VARCHAR(255) NULL AFTER request_no",
    "ADD COLUMN IF NOT EXISTS inspection_type VARCHAR(100) NOT NULL DEFAULT 'Routine Inspection' AFTER inspection_title",
    "ADD COLUMN IF NOT EXISTS work_plan_task_id BIGINT UNSIGNED NULL AFTER template_id",
    "ADD COLUMN IF NOT EXISTS work_plan_task_name VARCHAR(255) NULL AFTER work_plan_task_id",
    "ADD COLUMN IF NOT EXISTS deliverable_name VARCHAR(255) NULL AFTER work_plan_task_name",
    "ADD COLUMN IF NOT EXISTS expected_result TEXT NULL AFTER inspector_name",
    "ADD COLUMN IF NOT EXISTS actual_result TEXT NULL AFTER expected_result",
    "ADD COLUMN IF NOT EXISTS outcome ENUM('PASSED','FAILED','CONDITIONAL_PASS','PENDING') NOT NULL DEFAULT 'PENDING' AFTER actual_result",
    "ADD COLUMN IF NOT EXISTS checklist_json JSON NULL AFTER results_json",
    "ADD COLUMN IF NOT EXISTS comments TEXT NULL AFTER findings",
    "ADD COLUMN IF NOT EXISTS has_defect TINYINT(1) NOT NULL DEFAULT 0 AFTER comments",
    "ADD COLUMN IF NOT EXISTS defect_id BIGINT UNSIGNED NULL AFTER has_defect"
  ];
  for (const col of irCols) {
    try {
      await query(`ALTER TABLE pm_inspection_requests ${col}`);
    } catch(e) {
      // Ignore if exists
    }
  }

  // 3. Consolidated Defects & Non-Conformances Register
  await query(`
    CREATE TABLE IF NOT EXISTS pm_quality_defects (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      company_id BIGINT UNSIGNED NOT NULL,
      branch_id BIGINT UNSIGNED NULL,
      project_id INT NOT NULL,
      issue_reference VARCHAR(50) NOT NULL,
      issue_type ENUM('DEFECT','NON_CONFORMANCE') NOT NULL DEFAULT 'DEFECT',
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      date_identified DATE NOT NULL,
      inspection_id BIGINT UNSIGNED NULL,
      work_plan_task_id BIGINT UNSIGNED NULL,
      work_plan_task_name VARCHAR(255) NULL,
      deliverable_name VARCHAR(255) NULL,
      location VARCHAR(200) NULL,
      severity ENUM('CRITICAL','MAJOR','MINOR','OBSERVATION') NOT NULL DEFAULT 'MAJOR',
      priority ENUM('URGENT','HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'MEDIUM',
      responsible_person VARCHAR(200) NULL,
      root_cause TEXT NULL,
      proposed_resolution TEXT NULL,
      target_resolution_date DATE NULL,
      actual_resolution_date DATE NULL,
      resolution_evidence TEXT NULL,
      resolution_remarks TEXT NULL,
      status ENUM('OPEN','UNDER_INVESTIGATION','CORRECTIVE_ACTION_IN_PROGRESS','PENDING_VERIFICATION','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
      closed_by BIGINT UNSIGNED NULL,
      closed_at DATETIME NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_pm_qd_ref (company_id, issue_reference),
      KEY idx_pm_qd_proj (project_id),
      KEY idx_pm_qd_insp (inspection_id),
      KEY idx_pm_qd_status (status),
      KEY idx_pm_qd_sev (severity)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Corrective & Preventive Actions (CAPA) Register
  await query(`
    CREATE TABLE IF NOT EXISTS pm_capa_actions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      company_id BIGINT UNSIGNED NOT NULL,
      branch_id BIGINT UNSIGNED NULL,
      project_id INT NOT NULL,
      capa_reference VARCHAR(50) NOT NULL,
      defect_id BIGINT UNSIGNED NULL,
      action_type ENUM('CORRECTIVE','PREVENTIVE') NOT NULL DEFAULT 'CORRECTIVE',
      root_cause TEXT NULL,
      proposed_action TEXT NOT NULL,
      responsible_person VARCHAR(200) NULL,
      target_completion_date DATE NULL,
      actual_completion_date DATE NULL,
      verification_method VARCHAR(150) NULL DEFAULT 'Re-inspection & Technical Audit',
      verification_result ENUM('PENDING','EFFECTIVE','PARTIALLY_EFFECTIVE','INEFFECTIVE_REOPENED') NOT NULL DEFAULT 'PENDING',
      verification_notes TEXT NULL,
      verified_by VARCHAR(200) NULL,
      verified_at DATETIME NULL,
      status ENUM('OPEN','IN_PROGRESS','AWAITING_VERIFICATION','VERIFIED','CLOSED') NOT NULL DEFAULT 'OPEN',
      supporting_evidence TEXT NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_pm_capa_ref (company_id, capa_reference),
      KEY idx_pm_capa_proj (project_id),
      KEY idx_pm_capa_defect (defect_id),
      KEY idx_pm_capa_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Quality Audit Trail
  await query(`
    CREATE TABLE IF NOT EXISTS pm_quality_audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      company_id BIGINT UNSIGNED NOT NULL,
      project_id INT NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id BIGINT UNSIGNED NOT NULL,
      action VARCHAR(50) NOT NULL,
      old_status VARCHAR(50) NULL,
      new_status VARCHAR(50) NULL,
      details TEXT NULL,
      changed_by_name VARCHAR(200) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_pm_qa_audit (company_id, project_id, entity_type, entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("Quality Control tables verified OK");
}
