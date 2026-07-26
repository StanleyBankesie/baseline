import { query } from "./db/pool.js";
import { validateCompanyLicense } from "./services/license.service.js";

async function run() {
  try {
    const users = await query("SELECT id, username, company_id FROM adm_users WHERE username = ?", ['esther']);
    if (users.length === 0) {
      console.log("User esther not found");
      process.exit(1);
    }
    const user = users[0];
    console.log("User:", user);
    
    if (user.company_id) {
      const companies = await query("SELECT * FROM adm_companies WHERE id = ?", [user.company_id]);
      console.log("Company:", companies[0]);

      const licenses = await query("SELECT * FROM adm_company_licenses WHERE company_id = ? ORDER BY id DESC LIMIT 1", [user.company_id]);
      console.log("License:", licenses[0]);

      const result = await validateCompanyLicense(user.company_id);
      console.log("validateCompanyLicense result:", result);
    } else {
      console.log("User has no company_id");
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
