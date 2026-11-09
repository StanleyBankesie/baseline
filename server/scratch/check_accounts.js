import { query } from "../db/pool.js";

async function main() {
  try {
    const rows = await query(`
      SELECT a.id, a.code, a.name, a.group_id, g.code as group_code, g.name as group_name 
      FROM fin_accounts a 
      LEFT JOIN fin_account_groups g ON g.id = a.group_id 
      WHERE g.code LIKE '%BANK%' OR g.code LIKE '%CASH%' OR g.name LIKE '%BANK%' OR g.name LIKE '%CASH%'
      LIMIT 20
    `);
    console.log("Cash/Bank accounts:", rows);

    const lastVoucher = await query(`
      SELECT v.*, vt.code as type_code 
      FROM fin_vouchers v 
      LEFT JOIN fin_voucher_types vt ON vt.id = v.voucher_type_id 
      WHERE vt.code IN ('PV', 'PAYV', 'PUV') 
      ORDER BY v.id DESC LIMIT 5
    `);
    console.log("Recent Payment Vouchers:", lastVoucher);

    if (lastVoucher.length > 0) {
      const lines = await query(`
        SELECT vl.*, a.code as account_code, a.name as account_name 
        FROM fin_voucher_lines vl 
        LEFT JOIN fin_accounts a ON a.id = vl.account_id 
        WHERE vl.voucher_id = :id
      `, { id: lastVoucher[0].id });
      console.log("Lines for recent voucher:", lines);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
