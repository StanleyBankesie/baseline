const { query } = require('./server/utils/dbUtils.js');

async function test() {
  try {
    const rows = await query("SELECT item_name, selling_price, cost_price FROM inv_items WHERE item_code = 'ITM-000004'");
    console.log("DB Result:", rows);
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    process.exit(0);
  }
}

test();
