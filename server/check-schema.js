import { query } from "./db/pool.js";
async function run() {
  try {
    const res = await query(`DESCRIBE trans_expense_log_items`);
    console.log(res);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
