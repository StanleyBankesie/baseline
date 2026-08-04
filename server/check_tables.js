import pool from './db/pool.js';

async function check() {
  const [eq] = await pool.query('SHOW TABLES LIKE "%equipment%"');
  console.log('Equipment tables:', eq);
  
  const [asset] = await pool.query('SHOW TABLES LIKE "%asset%"');
  console.log('Asset tables:', asset);
  
  const [mach] = await pool.query('SHOW TABLES LIKE "%machin%"');
  console.log('Machine tables:', mach);
  
  process.exit(0);
}
check();
