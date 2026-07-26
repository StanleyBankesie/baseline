import { query } from "./db/pool.js";

async function fix() {
  try {
    // Fix Main Bank Account to point to Bank - Savings (ID 6)
    await query(`UPDATE fin_bank_accounts SET gl_account_id = 6 WHERE id = 1`);
    console.log("Fixed: Main Bank Account now mapped to Bank - Savings (ID 6)");

    // Verify
    const ba = await query(`SELECT id, name, gl_account_id FROM fin_bank_accounts`);
    console.log("Updated fin_bank_accounts:", ba);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
fix();