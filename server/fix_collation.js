import { query } from './db/pool.js';

async function run() {
  try {
    await query("ALTER TABLE trans_transportation_bills CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    await query("ALTER TABLE trans_transportation_bills MODIFY bill_no varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL");
    await query("ALTER TABLE trans_transportation_bills MODIFY status varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'DRAFT'");
    await query("ALTER TABLE trans_transportation_bills MODIFY payment_status varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT 'UNPAID'");
    console.log("Collation fixed!");
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
run();
