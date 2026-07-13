import pool from './server/db/pool.js';
async function main() {
  const [pages] = await pool.query('SELECT * FROM adm_pages LIMIT 5');
  console.log('PAGES:', pages);
  const [licenses] = await pool.query('SHOW TABLES LIKE "adm_license%"');
  console.log('LICENSES TABLES:', licenses);
  process.exit(0);
}
main();
