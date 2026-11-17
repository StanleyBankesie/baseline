import jwt from "jsonwebtoken";
import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";

const JWT_SECRET = process.env.JWT_SECRET || "omnisuite_default_jwt_secret_key_change_in_prod";

export async function requireCustomerPortalAuth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.customer_portal_token) {
      token = req.cookies.customer_portal_token;
    }

    if (!token) {
      throw httpError(401, "UNAUTHORIZED", "Authentication required for Customer Portal");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      throw httpError(401, "INVALID_TOKEN", "Session expired or invalid. Please log in again.");
    }

    if (decoded.scope !== "customer_portal") {
      throw httpError(403, "FORBIDDEN", "Invalid token scope for customer portal");
    }

    const customerId = Number(decoded.customerId || decoded.id);
    if (!customerId) {
      throw httpError(401, "INVALID_TOKEN", "Invalid token payload");
    }

    const [customer] = await query(
      `SELECT c.*, a.code as account_code, a.name as account_name 
       FROM sal_customers c
       LEFT JOIN fin_accounts a ON a.id = c.sales_account_id
       WHERE c.id = ? AND (c.is_active = 1 OR c.is_active IS NULL)
       LIMIT 1`,
      [customerId]
    );

    if (!customer) {
      throw httpError(403, "CUSTOMER_NOT_FOUND", "Customer account not found or inactive.");
    }

    const [authRec] = await query(
      `SELECT requires_password_change, is_locked FROM sal_customer_portal_auth WHERE customer_id = ? LIMIT 1`,
      [customerId]
    ).catch(() => []);

    if (authRec && authRec.is_locked) {
      throw httpError(403, "ACCOUNT_LOCKED", "Your customer portal access has been locked.");
    }

    req.customerUser = {
      customerId: customer.id,
      companyId: customer.company_id || 1,
      branchId: customer.branch_id || null,
      customerCode: customer.customer_code,
      customerName: customer.customer_name,
      email: customer.email,
      phone: customer.phone || customer.mobile,
      accountCode: customer.account_code,
      requiresPasswordChange: authRec ? Boolean(authRec.requires_password_change) : false,
      customer,
    };

    req.scope = {
      companyId: req.customerUser.companyId,
      branchId: req.customerUser.branchId,
      branchIdsStr: req.customerUser.branchId ? String(req.customerUser.branchId) : "",
    };

    next();
  } catch (err) {
    next(err);
  }
}
