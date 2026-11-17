import { query } from "../db/pool.js";

/**
 * Ensures pm_milestones and pm_milestone_tasks tables are up-to-date
 * for Automatic Milestone Detection & Tracking.
 */
export async function ensureMilestoneTables() {
  await query(`CREATE TABLE IF NOT EXISTS pm_milestones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    branch_id INT NOT NULL,
    project_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    milestone_type VARCHAR(50) DEFAULT 'PHASE_COMPLETION',
    detection_source VARCHAR(50) DEFAULT 'MANUAL',
    detection_reason TEXT NULL,
    detection_confidence DECIMAL(5,2) DEFAULT 100.00,
    is_confirmed TINYINT(1) DEFAULT 1,
    is_rejected TINYINT(1) DEFAULT 0,
    rejection_reason TEXT NULL,
    due_date DATE NULL,
    target_date DATE NULL,
    completion_date DATE NULL,
    completion_conditions TEXT NULL,
    requires_inspection TINYINT(1) DEFAULT 0,
    is_inspection_accepted TINYINT(1) DEFAULT 0,
    inspection_notes TEXT NULL,
    responsible_owner_id INT NULL,
    responsible_owner_name VARCHAR(255) NULL,
    work_plan_element VARCHAR(255) NULL,
    is_auto_scheduled TINYINT(1) DEFAULT 1,
    status VARCHAR(50) DEFAULT 'PENDING',
    remarks TEXT NULL,
    audit_trail_json LONGTEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project_status (project_id, status),
    INDEX idx_is_confirmed (is_confirmed),
    INDEX idx_is_rejected (is_rejected)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS pm_milestone_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL DEFAULT 1,
    milestone_id INT NOT NULL,
    task_id INT NOT NULL,
    is_mandatory TINYINT(1) DEFAULT 1,
    is_inspection_task TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_milestone_task (milestone_id, task_id),
    INDEX idx_milestone_id (milestone_id),
    INDEX idx_task_id (task_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const cols = await query("DESCRIBE pm_milestones");
  const existingCols = cols.map((c) => c.Field);

  const colDefs = [
    { name: "description", sql: "ADD COLUMN description TEXT NULL AFTER title" },
    { name: "milestone_type", sql: "ADD COLUMN milestone_type VARCHAR(50) DEFAULT 'PHASE_COMPLETION'" },
    { name: "detection_source", sql: "ADD COLUMN detection_source VARCHAR(50) DEFAULT 'MANUAL'" },
    { name: "detection_reason", sql: "ADD COLUMN detection_reason TEXT NULL" },
    { name: "detection_confidence", sql: "ADD COLUMN detection_confidence DECIMAL(5,2) DEFAULT 100.00" },
    { name: "is_confirmed", sql: "ADD COLUMN is_confirmed TINYINT(1) DEFAULT 1" },
    { name: "is_rejected", sql: "ADD COLUMN is_rejected TINYINT(1) DEFAULT 0" },
    { name: "rejection_reason", sql: "ADD COLUMN rejection_reason TEXT NULL" },
    { name: "target_date", sql: "ADD COLUMN target_date DATE NULL" },
    { name: "completion_conditions", sql: "ADD COLUMN completion_conditions TEXT NULL" },
    { name: "requires_inspection", sql: "ADD COLUMN requires_inspection TINYINT(1) DEFAULT 0" },
    { name: "is_inspection_accepted", sql: "ADD COLUMN is_inspection_accepted TINYINT(1) DEFAULT 0" },
    { name: "inspection_notes", sql: "ADD COLUMN inspection_notes TEXT NULL" },
    { name: "responsible_owner_id", sql: "ADD COLUMN responsible_owner_id INT NULL" },
    { name: "responsible_owner_name", sql: "ADD COLUMN responsible_owner_name VARCHAR(255) NULL" },
    { name: "work_plan_element", sql: "ADD COLUMN work_plan_element VARCHAR(255) NULL" },
    { name: "is_auto_scheduled", sql: "ADD COLUMN is_auto_scheduled TINYINT(1) DEFAULT 1" },
    { name: "audit_trail_json", sql: "ADD COLUMN audit_trail_json LONGTEXT NULL" }
  ];

  for (const c of colDefs) {
    if (!existingCols.includes(c.name)) {
      try {
        await query(`ALTER TABLE pm_milestones ${c.sql}`);
      } catch (e) {
        console.warn(`Could not add column ${c.name}:`, e.message);
      }
    }
  }

  return true;
}
