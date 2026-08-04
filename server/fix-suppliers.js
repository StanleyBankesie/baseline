import { query } from "./db/pool.js";
async function run() {
  try {
    const res = await query(`
      UPDATE pur_suppliers s
      JOIN trans_setup_items t ON t.setup_value COLLATE utf8mb4_unicode_ci = s.supplier_name COLLATE utf8mb4_unicode_ci
      SET s.service_contractor = 'Y'
      WHERE t.setup_type = 'FUEL_STATION' AND s.service_contractor = 'N'
    `);
    console.log("Updated rows:", res.affectedRows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
