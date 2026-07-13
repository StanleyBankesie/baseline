const mysql = require('mysql2/promise');
const fs = require('fs');

async function test() {
  const cfg = JSON.parse(fs.readFileSync('./server/config/db.json'));
  const conn = await mysql.createConnection({
    host: cfg.host || 'localhost',
    user: cfg.user || 'root',
    password: cfg.password || '',
    database: cfg.database || 'omnisuite'
  });
  const [rows] = await conn.execute("SELECT item_name, selling_price, cost_price FROM inv_items WHERE item_code = 'ITM-000004'");
  console.log("DB Result:", rows);
  await conn.end();
}
test();
