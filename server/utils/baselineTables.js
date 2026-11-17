/**
 * @file baselineTables.js
 * @description Database migrations for Enhanced Automatic Baseline Detection, Generation & Management.
 */

import { query } from "../db/pool.js";

export async function ensureBaselineTables() {
  try {
    // 1. Check and add columns to pm_schedule_baselines
    const baselineCols = await query("DESCRIBE pm_schedule_baselines");
    const baselineFieldNames = new Set(baselineCols.map((c) => c.Field.toLowerCase()));

    const baselineAdditions = [
      { name: "status", sql: "ALTER TABLE pm_schedule_baselines ADD COLUMN status ENUM('PROPOSED', 'APPROVED', 'ARCHIVED') NOT NULL DEFAULT 'APPROVED'" },
      { name: "is_active", sql: "ALTER TABLE pm_schedule_baselines ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1" },
      { name: "total_tasks", sql: "ALTER TABLE pm_schedule_baselines ADD COLUMN total_tasks INT NOT NULL DEFAULT 0" },
      { name: "total_milestones", sql: "ALTER TABLE pm_schedule_baselines ADD COLUMN total_milestones INT NOT NULL DEFAULT 0" },
      { name: "project_start_date", sql: "ALTER TABLE pm_schedule_baselines ADD COLUMN project_start_date DATE NULL" },
      { name: "project_end_date", sql: "ALTER TABLE pm_schedule_baselines ADD COLUMN project_end_date DATE NULL" },
      { name: "rebaseline_reason", sql: "ALTER TABLE pm_schedule_baselines ADD COLUMN rebaseline_reason TEXT NULL" },
      { name: "dependencies_snapshot_json", sql: "ALTER TABLE pm_schedule_baselines ADD COLUMN dependencies_snapshot_json LONGTEXT NULL" },
      { name: "milestones_snapshot_json", sql: "ALTER TABLE pm_schedule_baselines ADD COLUMN milestones_snapshot_json LONGTEXT NULL" },
      { name: "created_by", sql: "ALTER TABLE pm_schedule_baselines ADD COLUMN created_by BIGINT UNSIGNED NULL" },
    ];

    for (const col of baselineAdditions) {
      if (!baselineFieldNames.has(col.name.toLowerCase())) {
        try {
          await query(col.sql);
          console.log(`[ensureBaselineTables] Added column ${col.name} to pm_schedule_baselines`);
        } catch (err) {
          console.warn(`[ensureBaselineTables] Notice adding ${col.name}: ${err.message}`);
        }
      }
    }

    // 2. Check and add columns to pm_tasks
    const taskCols = await query("DESCRIBE pm_tasks");
    const taskFieldNames = new Set(taskCols.map((c) => c.Field.toLowerCase()));

    const taskAdditions = [
      { name: "baseline_duration", sql: "ALTER TABLE pm_tasks ADD COLUMN baseline_duration INT NULL" },
      { name: "is_outside_baseline", sql: "ALTER TABLE pm_tasks ADD COLUMN is_outside_baseline TINYINT(1) NOT NULL DEFAULT 0" },
    ];

    for (const col of taskAdditions) {
      if (!taskFieldNames.has(col.name.toLowerCase())) {
        try {
          await query(col.sql);
          console.log(`[ensureBaselineTables] Added column ${col.name} to pm_tasks`);
        } catch (err) {
          console.warn(`[ensureBaselineTables] Notice adding ${col.name}: ${err.message}`);
        }
      }
    }

    // 3. Check and add columns to pm_milestones
    const milestoneCols = await query("DESCRIBE pm_milestones");
    const milestoneFieldNames = new Set(milestoneCols.map((c) => c.Field.toLowerCase()));

    const milestoneAdditions = [
      { name: "baseline_date", sql: "ALTER TABLE pm_milestones ADD COLUMN baseline_date DATE NULL" },
      { name: "is_outside_baseline", sql: "ALTER TABLE pm_milestones ADD COLUMN is_outside_baseline TINYINT(1) NOT NULL DEFAULT 0" },
    ];

    for (const col of milestoneAdditions) {
      if (!milestoneFieldNames.has(col.name.toLowerCase())) {
        try {
          await query(col.sql);
          console.log(`[ensureBaselineTables] Added column ${col.name} to pm_milestones`);
        } catch (err) {
          console.warn(`[ensureBaselineTables] Notice adding ${col.name}: ${err.message}`);
        }
      }
    }

    console.log("[ensureBaselineTables] Baseline tables migration completed successfully.");
    return true;
  } catch (err) {
    console.error("[ensureBaselineTables] Error during migration:", err);
    throw err;
  }
}
