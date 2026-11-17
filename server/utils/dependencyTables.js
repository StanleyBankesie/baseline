/**
 * @file dependencyTables.js
 * @description Database migrations for Intelligent Automatic Task Dependency Detection & Management.
 */

import { query } from "../db/pool.js";

export async function ensureDependencyTables() {
  try {
    const cols = await query("DESCRIBE pm_task_dependencies");
    const fieldNames = new Set(cols.map((c) => c.Field.toLowerCase()));

    const additions = [
      { name: "source", sql: "ALTER TABLE pm_task_dependencies ADD COLUMN source ENUM('AUTO_DETECTED', 'MANUAL', 'MANUAL_OVERRIDE') NOT NULL DEFAULT 'MANUAL'" },
      { name: "status", sql: "ALTER TABLE pm_task_dependencies ADD COLUMN status ENUM('CONFIRMED', 'SUGGESTED', 'REJECTED') NOT NULL DEFAULT 'CONFIRMED'" },
      { name: "confidence_score", sql: "ALTER TABLE pm_task_dependencies ADD COLUMN confidence_score DECIMAL(5,2) NOT NULL DEFAULT 100.00" },
      { name: "detection_reason", sql: "ALTER TABLE pm_task_dependencies ADD COLUMN detection_reason TEXT NULL" },
      { name: "rejection_reason", sql: "ALTER TABLE pm_task_dependencies ADD COLUMN rejection_reason VARCHAR(255) NULL" },
      { name: "created_by", sql: "ALTER TABLE pm_task_dependencies ADD COLUMN created_by BIGINT UNSIGNED NULL" },
      { name: "updated_by", sql: "ALTER TABLE pm_task_dependencies ADD COLUMN updated_by BIGINT UNSIGNED NULL" },
      { name: "audit_trail_json", sql: "ALTER TABLE pm_task_dependencies ADD COLUMN audit_trail_json LONGTEXT NULL" },
    ];

    for (const col of additions) {
      if (!fieldNames.has(col.name.toLowerCase())) {
        try {
          await query(col.sql);
          console.log(`[ensureDependencyTables] Added column ${col.name} to pm_task_dependencies`);
        } catch (err) {
          console.warn(`[ensureDependencyTables] Notice adding ${col.name}: ${err.message}`);
        }
      }
    }

    console.log("[ensureDependencyTables] Dependency table migration completed successfully.");
    return true;
  } catch (err) {
    console.error("[ensureDependencyTables] Error during migration:", err);
    throw err;
  }
}
