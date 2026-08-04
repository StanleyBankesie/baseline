import { query } from "./db/pool.js";
async function run() {
  try {
    const res = await query(`SELECT * FROM inv_items LIMIT 5`);
    console.log("Inv items count:", res.length);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
