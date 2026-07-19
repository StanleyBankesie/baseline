import { pool } from './db/pool.js';

async function check() {
  try {
    const [rows] = await pool.query("SELECT v.* FROM fin_vouchers v JOIN fin_voucher_lines l ON l.voucher_id = v.id WHERE l.reference_no = 'PBL-000026'");
    console.log("Vouchers:", rows);
    const [bill] = await pool.query("SELECT id, status, branch_id FROM pur_bills WHERE bill_no = 'PBL-000026'");
    console.log("Bill:", bill);
  } catch(e) {
    console.error(e);
  }
  process.exit();
}
check();
