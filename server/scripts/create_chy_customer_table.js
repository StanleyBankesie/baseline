import { query } from "../db/pool.js";

export async function ensureChyCustomerTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS chy_customers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      company_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
      branch_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
      customer_code VARCHAR(50) NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      customer_type VARCHAR(50) NOT NULL DEFAULT 'Individual',
      currency_id BIGINT UNSIGNED NULL,
      price_type_id BIGINT UNSIGNED NULL,
      linked_shop_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_chy_customers_email (email),
      KEY idx_chy_customers_company (company_id),
      KEY idx_chy_customers_shop (linked_shop_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("chy_customers table ensured");
}

// Run directly
if (process.argv[1] && process.argv[1].includes("create_chy_customers_table")) {
  import("../utils/loadServerEnv.js").then(async () => {
    try {
      await ensureChyCustomerTable();
      console.log("Done");
      process.exit(0);
    } catch (err) {
      console.error("Failed:", err);
      process.exit(1);
    }
  });
}
