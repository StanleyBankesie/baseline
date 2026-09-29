import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query, pool } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";

const JWT_SECRET = process.env.JWT_SECRET || "omnisuite_default_jwt_secret_key_change_in_prod";

export async function ensureCustomerPortalTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS sal_customer_portal_auth (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      company_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
      customer_id BIGINT UNSIGNED NOT NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      temp_password_used TINYINT(1) NOT NULL DEFAULT 1,
      requires_password_change TINYINT(1) NOT NULL DEFAULT 1,
      is_locked TINYINT(1) NOT NULL DEFAULT 0,
      last_login_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_cust_portal (customer_id),
      KEY idx_cust_comp (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch(() => {});
}

// ----------------------------------------------------------------------------
// CUSTOMER AUTHENTICATION
// ----------------------------------------------------------------------------

export async function customerPortalLogin(req, res, next) {
  try {
    await ensureCustomerPortalTables();
    const { identifier, username, password, rememberMe } = req.body || {};
    const loginInput = (identifier || username || "").trim();
    const inputPassword = (password || "").trim();

    if (!loginInput || !inputPassword) {
      throw httpError(400, "VALIDATION_ERROR", "Username and password are required.");
    }

    // Lookup customer in sal_customers by customer_name or customer_code or email or phone
    const [customer] = await query(`SELECT c.*, a.code as account_code, a.name as account_name 
       FROM sal_customers c
       LEFT JOIN fin_accounts a ON a.id = c.sales_account_id
       WHERE (
         LOWER(TRIM(c.customer_name)) = LOWER(?)
         OR LOWER(TRIM(c.customer_code)) = LOWER(?)
         OR LOWER(TRIM(COALESCE(c.email, ''))) = LOWER(?)
         OR LOWER(TRIM(COALESCE(c.phone, ''))) = LOWER(?)
         OR LOWER(TRIM(COALESCE(c.mobile, ''))) = LOWER(?)
       ) AND (c.is_active = 1 OR c.is_active IS NULL)
       LIMIT 1`, [loginInput, loginInput, loginInput, loginInput, loginInput]
    );

    if (!customer) {
      throw httpError(401, "INVALID_CREDENTIALS", "Customer record not found or inactive.");
    }

    let [portalAuth] = await query(`SELECT * FROM sal_customer_portal_auth WHERE customer_id = ? LIMIT 1`, [customer.id]
    );

    let passwordMatch = false;
    let requiresPasswordChange = false;

    if (portalAuth && portalAuth.password_hash) {
      passwordMatch = await bcrypt.compare(inputPassword, portalAuth.password_hash);
      requiresPasswordChange = Boolean(portalAuth.requires_password_change);
    } else {
      // First-time login: Temporal password is customer_code (e.g. CUST001)
      const expectedTempPassword = String(customer.customer_code || "").trim();
      if (expectedTempPassword && inputPassword.toLowerCase() === expectedTempPassword.toLowerCase()) {
        passwordMatch = true;
        requiresPasswordChange = true;

        if (!portalAuth) {
          const initialHash = await bcrypt.hash(expectedTempPassword, 10);
          await query(`INSERT INTO sal_customer_portal_auth (company_id, customer_id, password_hash, temp_password_used, requires_password_change)
             VALUES (?, ?, ?, 1, 1)`, [customer.company_id || 1, customer.id, initialHash]
          ).catch(() => {});
        }
      }
    }

    if (!passwordMatch) {
      throw httpError(401, "INVALID_CREDENTIALS", "Invalid credentials.");
    }

    const expiresIn = rememberMe ? "30d" : "1d";
    const token = jwt.sign(
      {
        customerId: customer.id,
        companyId: customer.company_id || 1,
        customerCode: customer.customer_code,
        customerName: customer.customer_name,
        scope: "customer_portal",
      },
      JWT_SECRET,
      { expiresIn }
    );

    await query(`UPDATE sal_customer_portal_auth SET last_login_at = NOW() WHERE customer_id = ?`, [customer.id]
    ).catch(() => {});

    res.cookie("customer_portal_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: rememberMe ? 30 * 24 * 3600 * 1000 : 24 * 3600 * 1000,
    });

    res.json({
      token,
      requiresPasswordChange,
      customer: {
        id: customer.id,
        customer_code: customer.customer_code,
        customer_name: customer.customer_name,
        email: customer.email,
        phone: customer.phone || customer.mobile,
        credit_limit: customer.credit_limit,
        city: customer.city,
        state: customer.state,
        country: customer.country,
        address: customer.address,
        account_code: customer.account_code,
        payment_terms: customer.payment_terms,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function customerPortalChangePassword(req, res, next) {
  try {
    const { customerId } = req.customerUser;
    const { newPassword, confirmNewPassword } = req.body || {};

    if (!newPassword) {
      throw httpError(400, "VALIDATION_ERROR", "New password is required.");
    }

    const hasMinLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>\-_=+]/.test(newPassword);

    if (!hasMinLength || !hasUppercase || !hasNumber || !hasSpecialChar) {
      throw httpError(
        400,
        "WEAK_PASSWORD",
        "Password must be at least 8 characters long and contain at least 1 uppercase letter, 1 number, and 1 special character."
      );
    }

    if (newPassword !== confirmNewPassword) {
      throw httpError(400, "VALIDATION_ERROR", "New password and confirmation do not match.");
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query(`INSERT INTO sal_customer_portal_auth (company_id, customer_id, password_hash, temp_password_used, requires_password_change)
      VALUES (1, ?, ?, 0, 0)
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), temp_password_used = 0, requires_password_change = 0`,
      [customerId, newHash]
    );

    res.json({ message: "Password updated successfully.", requiresPasswordChange: false });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerMe(req, res, next) {
  try {
    const { customer, requiresPasswordChange } = req.customerUser;
    res.json({ customer, requiresPasswordChange });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// DASHBOARD & BALANCES
// ----------------------------------------------------------------------------

export async function getCustomerDashboard(req, res, next) {
  try {
    const { customerId, customer } = req.customerUser;

    // Total orders count and pending orders
    const [orderStats] = await query(`SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status IN ('DRAFT', 'PENDING', 'PROCESSING', 'APPROVED') THEN 1 ELSE 0 END) as active_orders,
        COALESCE(SUM(total_amount), 0) as total_order_value
       FROM sal_orders 
       WHERE customer_id = ? AND deleted_at IS NULL`, [customerId]
    );

    // Invoices summary
    const [invoiceStats] = await query(`SELECT 
        COUNT(*) as total_invoices,
        COALESCE(SUM(total_amount), 0) as total_invoiced,
        COALESCE(SUM(amount_paid), 0) as total_paid,
        COALESCE(SUM(balance_amount), 0) as total_outstanding
       FROM sal_invoices 
       WHERE customer_id = ?`, [customerId]
    );

    // Deliveries summary
    const [deliveryStats] = await query(`SELECT COUNT(*) as total_deliveries 
       FROM sal_deliveries 
       WHERE customer_id = ?`, [customerId]
    );

    // Recent 5 orders
    const recentOrders = await query(`SELECT id, order_no, order_date, status, total_amount, expected_delivery_date 
       FROM sal_orders 
       WHERE customer_id = ? AND deleted_at IS NULL 
       ORDER BY id DESC LIMIT 5`, [customerId]
    );

    const creditLimit = Number(customer.credit_limit || 0);
    const outstanding = Number(invoiceStats.total_outstanding || 0);
    const availableCredit = Math.max(0, creditLimit - outstanding);

    res.json({
      stats: {
        total_orders: orderStats.total_orders || 0,
        active_orders: orderStats.active_orders || 0,
        total_order_value: orderStats.total_order_value || 0,
        total_invoices: invoiceStats.total_invoices || 0,
        total_outstanding: outstanding,
        total_paid: invoiceStats.total_paid || 0,
        total_deliveries: deliveryStats.total_deliveries || 0,
        credit_limit: creditLimit,
        available_credit: availableCredit,
      },
      recentOrders,
      customer,
    });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// SALES ORDERS & CATALOG
// ----------------------------------------------------------------------------

export async function listCustomerOrders(req, res, next) {
  try {
    const { customerId } = req.customerUser;
    const orders = await query(`SELECT o.*,
              COUNT(d.id) as item_count
       FROM sal_orders o
       LEFT JOIN sal_order_details d ON d.order_id = o.id
       WHERE o.customer_id = ? AND o.deleted_at IS NULL
       GROUP BY o.id
       ORDER BY o.id DESC`, [customerId]
    );
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerOrderById(req, res, next) {
  try {
    const { customerId } = req.customerUser;
    const orderId = Number(req.params.id);

    const [order] = await query(`SELECT o.* 
       FROM sal_orders o 
       WHERE o.id = ? AND o.customer_id = ? AND o.deleted_at IS NULL LIMIT 1`, [orderId, customerId]
    );

    if (!order) throw httpError(404, "NOT_FOUND", "Order not found");

    const items = await query(`SELECT d.*, i.name as item_name, i.code as item_code, u.name as uom_name
       FROM sal_order_details d
       LEFT JOIN inv_items i ON i.id = d.item_id
       LEFT JOIN inv_uoms u ON u.id = d.uom_id
       WHERE d.order_id = ?`, [orderId]
    );

    res.json({ order, items });
  } catch (err) {
    next(err);
  }
}

export async function createCustomerOrder(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { customerId, companyId, branchId } = req.customerUser;
    const { items, remarks, expected_delivery_date, customer_notes } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      throw httpError(400, "VALIDATION_ERROR", "Order must contain at least one item.");
    }

    const orderNo = `SO-${Date.now().toString().slice(-6)}`;
    let totalAmount = 0;

    for (const item of items) {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unit_price || 0);
      totalAmount += qty * price;
    }

    const [orderRes] = await conn.query(`INSERT INTO sal_orders (
        company_id, branch_id, order_no, order_date, customer_id,
        status, total_amount, sub_total, remarks, customer_notes,
        expected_delivery_date, created_at) VALUES (?, ?, ?, CURDATE(), ?, 'PENDING', ?, ?, ?, ?, ?, NOW())`,
      [
        companyId,
        branchId || null,
        orderNo,
        customerId,
        totalAmount,
        totalAmount,
        remarks || "Placed via Customer Mobile App",
        customer_notes || null,
        expected_delivery_date || null,
      ]
    );

    const newOrderId = orderRes.insertId;

    for (const item of items) {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unit_price || 0);
      const subtotal = qty * price;

      await conn.query(`INSERT INTO sal_order_details (
          order_id, item_id, quantity, unit_price, total_amount, remarks) VALUES (?, ?, ?, ?, ?, ?)`,
        [newOrderId, item.item_id, qty, price, subtotal, item.remarks || null]
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Sales order placed successfully", orderId: newOrderId, orderNo });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

export async function getCustomerCatalog(req, res, next) {
  try {
    const { companyId } = req.customerUser;
    const items = await query(`SELECT i.id, i.code, i.name, i.selling_price as standard_price, 
              i.description, u.name as uom_name
       FROM inv_items i
       LEFT JOIN inv_uoms u ON u.id = i.uom_id
       WHERE (i.company_id = ? OR i.company_id IS NULL)
         AND (i.is_active = 1 OR i.is_active IS NULL)
       ORDER BY i.name ASC LIMIT 100`, [companyId]
    );
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// INVOICES & PAYMENTS (SALES HISTORIES)
// ----------------------------------------------------------------------------

export async function listCustomerInvoices(req, res, next) {
  try {
    const { customerId } = req.customerUser;
    const invoices = await query(`SELECT i.*, o.order_no 
       FROM sal_invoices i
       LEFT JOIN sal_orders o ON o.id = i.sales_order_id
       WHERE i.customer_id = ?
       ORDER BY i.id DESC`, [customerId]
    );
    res.json({ invoices });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerInvoiceById(req, res, next) {
  try {
    const { customerId } = req.customerUser;
    const invoiceId = Number(req.params.id);

    const [invoice] = await query(`SELECT i.*, o.order_no 
       FROM sal_invoices i
       LEFT JOIN sal_orders o ON o.id = i.sales_order_id
       WHERE i.id = ? AND i.customer_id = ? LIMIT 1`, [invoiceId, customerId]
    );

    if (!invoice) throw httpError(404, "NOT_FOUND", "Invoice not found");

    const items = await query(`SELECT d.*, i.name as item_name, i.code as item_code 
       FROM sal_invoice_details d
       LEFT JOIN inv_items i ON i.id = d.item_id
       WHERE d.invoice_id = ?`, [invoiceId]
    );

    res.json({ invoice, items });
  } catch (err) {
    next(err);
  }
}

export async function listCustomerDeliveries(req, res, next) {
  try {
    const { customerId } = req.customerUser;
    const deliveries = await query(`SELECT d.*, o.order_no, inv.invoice_no 
       FROM sal_deliveries d
       LEFT JOIN sal_orders o ON o.id = d.sales_order_id
       LEFT JOIN sal_invoices inv ON inv.id = d.invoice_id
       WHERE d.customer_id = ?
       ORDER BY d.id DESC`, [customerId]
    );
    res.json({ deliveries });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// GL REPORT & ACCOUNT BALANCES
// ----------------------------------------------------------------------------

export async function getCustomerGLReport(req, res, next) {
  try {
    const { customer, customerId } = req.customerUser;
    const accountCode = customer.account_code || customer.customer_code;

    // Search GL entries matching account_code or account_id or customer remarks
    const glEntries = await query(`SELECT gl.* 
       FROM fin_general_ledger gl
       WHERE gl.account_code = ? 
          OR gl.description LIKE CONCAT('%', ?, '%')
          OR gl.description LIKE CONCAT('%', ?, '%')
       ORDER BY gl.voucher_date DESC, gl.voucher_id DESC LIMIT 100`, [accountCode, customer.customer_name, customer.customer_code]
    );

    let runningBalance = 0;
    const entriesWithBalance = glEntries.map((e) => {
      const debit = Number(e.debit || 0);
      const credit = Number(e.credit || 0);
      runningBalance += (debit - credit);
      return {
        ...e,
        debit,
        credit,
        running_balance: runningBalance,
      };
    });

    res.json({
      account_code: accountCode,
      customer_name: customer.customer_name,
      entries: entriesWithBalance,
    });
  } catch (err) {
    next(err);
  }
}
