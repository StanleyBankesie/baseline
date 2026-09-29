import jwt from "jsonwebtoken";
import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";

const JWT_SECRET = process.env.JWT_SECRET || "omnisuite_default_jwt_secret_key_change_in_prod";

/**
 * Middleware to authenticate requests to the Employee Self-Service Portal.
 * Supports:
 *  1. Direct Employee Portal Accounts (hr_employee_portal_auth / hr_employees)
 *  2. Linked adm_users accounts
 *  3. Super Admin user_id = 1 bypass
 */
export async function requirePortalAuth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.portal_token) {
      token = req.cookies.portal_token;
    }

    if (!token) {
      throw httpError(401, "UNAUTHORIZED", "Authentication required for Employee Portal");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw httpError(401, "INVALID_TOKEN", "Session expired or invalid. Please log in again.");
    }

    const employeeId = Number(decoded.employeeId || decoded.empId || decoded.id);
    const userId = decoded.userId ? Number(decoded.userId) : null;

    if (!employeeId && !userId) {
      throw httpError(401, "INVALID_TOKEN", "Invalid token payload");
    }

    // Lookup employee record directly
    let employee = null;
    if (employeeId) {
      const [emp] = await query(
        `SELECT e.*, 
                COALESCE(d.dept_name, ad.name) as dept_name,
                p.pos_name,
                m.first_name as manager_first_name, m.last_name as manager_last_name
         FROM hr_employees e
         LEFT JOIN hr_departments d ON d.id = e.dept_id
         LEFT JOIN adm_departments ad ON ad.id = e.dept_id
         LEFT JOIN hr_positions p ON p.id = e.pos_id
         LEFT JOIN hr_employees m ON m.id = e.manager_id
         WHERE e.id = ? AND e.deleted_at IS NULL
         LIMIT 1`,
        [employeeId]
      );
      employee = emp;
    }

    // If not found by employeeId, check user linkage
    if (!employee && userId) {
      const [emp] = await query(
        `SELECT e.*, 
                COALESCE(d.dept_name, ad.name) as dept_name,
                p.pos_name,
                m.first_name as manager_first_name, m.last_name as manager_last_name
         FROM hr_employees e
         LEFT JOIN hr_departments d ON d.id = e.dept_id
         LEFT JOIN adm_departments ad ON ad.id = e.dept_id
         LEFT JOIN hr_positions p ON p.id = e.pos_id
         LEFT JOIN hr_employees m ON m.id = e.manager_id
         WHERE e.user_id = ? AND e.deleted_at IS NULL
         LIMIT 1`,
        [userId]
      );
      employee = emp;
    }

    // Super Admin Bypass for user_id = 1
    if (!employee && userId === 1) {
      employee = {
        id: 1,
        user_id: 1,
        emp_code: "ADM-001",
        first_name: "Administrator",
        last_name: "System",
        email: "admin@omnisuite.com",
        phone: "+233 24 000 0000",
        dept_name: "Executive Management",
        pos_name: "System Administrator",
        status: "ACTIVE",
        company_id: 1,
        branch_id: null,
      };
    }

    if (!employee) {
      throw httpError(403, "NO_EMPLOYEE_RECORD", "No active employee profile found.");
    }

    if (employee.status === "TERMINATED" || employee.status === "INACTIVE") {
      throw httpError(403, "EMPLOYMENT_TERMINATED", "Your employment status is inactive.");
    }

    // Check portal auth table for password change status
    const [portalAuth] = await query(
      `SELECT requires_password_change, is_locked FROM hr_employee_portal_auth WHERE employee_id = ? LIMIT 1`,
      [employee.id]
    ).catch(() => []);

    if (portalAuth && portalAuth.is_locked) {
      throw httpError(403, "ACCOUNT_LOCKED", "Your portal access is locked. Contact HR.");
    }

    // Attach verified portal context to request
    req.portalUser = {
      userId: userId || employee.user_id || null,
      employeeId: employee.id,
      companyId: employee.company_id || 1,
      branchId: employee.branch_id || null,
      username: decoded.username || employee.emp_code || employee.first_name,
      email: employee.email || decoded.email || null,
      requiresPasswordChange: portalAuth ? Boolean(portalAuth.requires_password_change) : false,
      employee,
    };

    req.scope = {
      companyId: req.portalUser.companyId,
      branchId: req.portalUser.branchId,
      branchIdsStr: req.portalUser.branchId ? String(req.portalUser.branchId) : "",
    };

    next();
  } catch (err) {
    next(err);
  }
}
