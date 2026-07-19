import mysql from 'mysql2/promise';

async function main() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // Assuming empty or try typical defaults
    database: 'omnisuite', // Guessing db name
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0
  });
  
  try {
    const [rows] = await pool.query("SELECT * FROM fin_vouchers WHERE reference_no = 'PBL-000026'");
    console.log("Vouchers:", rows);
    const [bill] = await pool.query("SELECT id, status, branch_id FROM pur_bills WHERE bill_no = 'PBL-000026'");
    console.log("Bill:", bill);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
main();
