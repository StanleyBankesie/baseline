import { query } from './server/db/pool.js';
async function test() {
  const result = await query('SELECT module_code FROM adm_license_modules LIMIT 5');
  console.log(result);
  process.exit(0);
}
test();
