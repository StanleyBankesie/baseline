import { query } from "./db/pool.js";

async function run() {
  try {
    console.log("Adding log_number column...");
    try {
      await query(`ALTER TABLE trans_expense_logs ADD COLUMN log_number VARCHAR(20) DEFAULT NULL`);
    } catch (e) {
      if (!e.message.includes("Duplicate column name")) {
        console.error("Error adding column:", e);
      }
    }
    
    console.log("Backfilling log_number...");
    const logs = await query(`SELECT id FROM trans_expense_logs WHERE log_number IS NULL`);
    for (const log of logs) {
      const logNumber = `EXL${String(log.id).padStart(6, '0')}`;
      await query(`UPDATE trans_expense_logs SET log_number = ? WHERE id = ?`, [logNumber, log.id]);
    }
    console.log("Done backfilling!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
