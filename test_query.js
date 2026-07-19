import { query } from "./server/utils/db.js";

async function run() {
  try {
    const res = await query(`
        SELECT 
          o.id, 
          o.order_no, 
          o.order_date, 
          o.customer_id, 
          c.customer_name AS customer_name,
          o.priority,
          o.status, 
          o.total_amount,
          o.created_at,
          u.username AS created_by_username,
          u.username AS created_by_name,
          EXISTS(
            SELECT 1 FROM sal_invoices i
            WHERE i.company_id = 1
              AND i.sales_order_id = o.id
          ) AS has_invoice
        FROM sal_orders o
        LEFT JOIN sal_customers c
          ON c.id = o.customer_id AND c.company_id = 1
        LEFT JOIN adm_users u
          ON u.id = o.created_by
        WHERE o.company_id = 1 
        ORDER BY o.order_date DESC, o.id DESC
        LIMIT 10 OFFSET 0
    `);
    console.log("SUCCESS:", res);
  } catch(e) {
    console.log("ERROR:", e.message);
  }
  process.exit(0);
}
run();
