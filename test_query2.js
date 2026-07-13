import { query } from './server/db/pool.js';
async function test() {
  const result = await query('SELECT module_code FROM adm_license_modules WHERE license_id = 1');
  console.log(result.map(r => r.module_code));
  process.exit(0);
}
test();
