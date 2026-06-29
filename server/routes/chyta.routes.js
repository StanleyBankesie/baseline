import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db/pool.js";
import { sendArkeselSMS } from "../utils/arkesel.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey123";

// Simple in-memory OTP store for demonstration
// In production, use Redis or a DB table
const otpStore = new Map();

// Helper to mask phone numbers
function maskPhone(phone) {
  if (!phone || phone.length < 5) return phone;
  return phone.slice(0, 4) + '****' + phone.slice(-3);
}

/* ─────────────────────────────────────────
   TABLE BOOTSTRAP  – called on server start
   ───────────────────────────────────────── */
export async function initChytaTable() {
  try {
    // 1. Create table if not exists with username
    await query(`
      CREATE TABLE IF NOT EXISTS chy_customer (
        id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        company_id    BIGINT UNSIGNED NOT NULL DEFAULT 1,
        branch_id     BIGINT UNSIGNED NOT NULL DEFAULT 1,
        customer_code VARCHAR(60)  NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        username      VARCHAR(255) NOT NULL,
        email         VARCHAR(255) NOT NULL,
        password      VARCHAR(255) NOT NULL,
        phone         VARCHAR(50)  NULL,
        is_active     TINYINT(1)   NOT NULL DEFAULT 1,
        customer_type VARCHAR(50)  NOT NULL DEFAULT 'Individual',
        currency_id   BIGINT UNSIGNED NULL,
        price_type_id BIGINT UNSIGNED NULL,
        linked_shop_id BIGINT UNSIGNED NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uk_chy_email (email),
        UNIQUE KEY uk_chy_username (username),
        KEY idx_chy_company (company_id),
        KEY idx_chy_shop   (linked_shop_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. If table already existed but lacks username column, alter it.
    const cols = await query("SHOW COLUMNS FROM chy_customer LIKE 'username'");
    if (cols.length === 0) {
      console.log("[Chyta] Migrating database: adding username column...");
      await query("ALTER TABLE chy_customer ADD COLUMN username VARCHAR(255) NULL AFTER customer_name");
      
      // Update existing records where username is null
      await query("UPDATE chy_customer SET username = SUBSTRING_INDEX(email, '@', 1) WHERE username IS NULL");
      
      // Handle duplicates just in case (optional, but good for safety)
      const users = await query("SELECT id, username FROM chy_customer");
      const seen = new Set();
      for (const u of users) {
        let base = u.username || "user";
        let finalUser = base;
        let suffix = 1;
        while (seen.has(finalUser)) {
          finalUser = `${base}${suffix}`;
          suffix++;
        }
        seen.add(finalUser);
        if (finalUser !== u.username) {
          await query("UPDATE chy_customer SET username = :finalUser WHERE id = :id", { finalUser, id: u.id });
        }
      }

      // Make it NOT NULL and add unique key
      await query("ALTER TABLE chy_customer MODIFY COLUMN username VARCHAR(255) NOT NULL");
      await query("ALTER TABLE chy_customer ADD UNIQUE KEY uk_chy_username (username)");
      console.log("[Chyta] Migration complete: username column added.");
    }

    console.log("[Chyta] chy_customer table ready.");
  } catch (err) {
    console.error("[Chyta] Failed to bootstrap chy_customer table:", err.message);
  }
}

/* ─────────────────────────────────────────
   AUTH MIDDLEWARE
   ───────────────────────────────────────── */
export function requireCustomerAuth(req, res, next) {
  try {
    const header = req.headers.authorization || req.headers.Authorization || "";
    const match  = String(header).match(/^Bearer\s+(.+)$/i);
    if (!match?.[1]) {
      return res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required" });
    }
    const decoded = jwt.verify(match[1], JWT_SECRET);
    if (decoded.role !== "customer") {
      return res.status(403).json({ error: "FORBIDDEN", message: "Customer access only" });
    }
    req.customer = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN", message: "Invalid or expired token" });
  }
}

/* ─────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────── */
function generateCode() {
  return "CHY-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function generateUniqueUsername(email, preferredUsername) {
  let base = preferredUsername ? String(preferredUsername).trim().toLowerCase() : "";
  if (!base) {
    const parts = email.split('@');
    base = parts[0].replace(/[^a-zA-Z0-9_]/g, ''); // strip non-alphanumeric chars
    if (!base) base = "user";
  }
  
  let username = base;
  let suffix = 1;
  while (true) {
    const [existing] = await query("SELECT id FROM chy_customer WHERE username = :username LIMIT 1", { username });
    if (!existing) {
      return username;
    }
    username = `${base}${suffix}`;
    suffix++;
  }
}

async function getDefaults() {
  const [comp]   = await query("SELECT id FROM adm_companies ORDER BY id ASC LIMIT 1").catch(() => [null]);
  const companyId = Number(comp?.id || 1);

  const [br]     = await query(
    "SELECT id FROM adm_branches WHERE company_id = :companyId ORDER BY id ASC LIMIT 1",
    { companyId }
  ).catch(() => [null]);
  const branchId  = Number(br?.id || 1);

  const [curr]   = await query("SELECT id FROM fin_currencies ORDER BY id ASC LIMIT 1").catch(() => [null]);
  const currencyId = curr?.id || null;

  const [pt]     = await query("SELECT id FROM sal_price_types ORDER BY id ASC LIMIT 1").catch(() => [null]);
  const priceTypeId = pt?.id || null;

  return { companyId, branchId, currencyId, priceTypeId };
}

/* ─────────────────────────────────────────
   POST /api/chyta/send-otp
   ───────────────────────────────────────── */
router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Phone number is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(phone, { otp, expiresAt });

    const message = `Your Chyta verification code is ${otp}. Valid for 10 minutes.`;
    const sent = await sendArkeselSMS(phone, message);

    if (sent) {
      return res.json({ success: true, message: "OTP sent successfully" });
    } else {
      return res.status(500).json({ error: "SMS_FAILED", message: "Failed to send OTP" });
    }
  } catch (err) {
    console.error("[Chyta] Send OTP error:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

/* ─────────────────────────────────────────
   POST /api/chyta/register
   ───────────────────────────────────────── */
router.post("/register", async (req, res) => {
  try {
    const { customer_name, username, email, password, phone, otp } = req.body;

    if (!customer_name || !email || !password || !phone || !otp) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Name, email, password, phone, and OTP are required"
      });
    }

    // Verify OTP
    const stored = otpStore.get(phone);
    if (!stored || stored.otp !== String(otp) || stored.expiresAt < Date.now()) {
      return res.status(400).json({ error: "INVALID_OTP", message: "Invalid or expired OTP" });
    }

    const emailStr = String(email).trim().toLowerCase();

    /* email uniqueness check */
    const existingEmail = await query(
      "SELECT id FROM chy_customer WHERE email = :email LIMIT 1",
      { email: emailStr }
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({ error: "EMAIL_EXISTS", message: "Email is already registered" });
    }

    /* username resolution & uniqueness check */
    const resolvedUsername = await generateUniqueUsername(emailStr, username);

    const hashed = await bcrypt.hash(String(password), 10);
    const { companyId, branchId, currencyId, priceTypeId } = await getDefaults();
    const code = generateCode();

    const result = await query(
      `INSERT INTO chy_customer
         (company_id, branch_id, customer_code, customer_name, username, email, password,
          phone, is_active, customer_type, currency_id, price_type_id)
       VALUES
         (:companyId, :branchId, :code, :customer_name, :resolvedUsername, :email, :hashed,
          :phone, 1, 'Individual', :currencyId, :priceTypeId)`,
      {
        companyId,
        branchId,
        code,
        customer_name: String(customer_name).trim(),
        resolvedUsername,
        email:         emailStr,
        hashed,
        phone:         phone ? String(phone).trim() : null,
        currencyId,
        priceTypeId
      }
    );

    const id = result.insertId;
    
    // Clear OTP after successful use
    otpStore.delete(phone);

    const token = jwt.sign(
      {
        id,
        customer_name: String(customer_name).trim(),
        email:         emailStr,
        username:      resolvedUsername,
        company_id:    companyId,
        branch_id:     branchId,
        role:          "customer"
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.status(201).json({
      token,
      customer: {
        id,
        customer_name: String(customer_name).trim(),
        username:      resolvedUsername,
        email:         emailStr,
        linked_shop_id: null
      }
    });
  } catch (err) {
    console.error("[Chyta] Register error:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

/* ─────────────────────────────────────────
   POST /api/chyta/login
   ───────────────────────────────────────── */
router.post("/login", async (req, res) => {
  try {
    const { identifier, email, password, otp } = req.body;
    const loginVal = String(identifier || email || "").trim().toLowerCase();

    if (!loginVal || !password) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Email/Username and password are required"
      });
    }

    const rows = await query(
      "SELECT * FROM chy_customer WHERE email = :loginVal OR username = :loginVal LIMIT 1",
      { loginVal }
    );
    const customer = rows[0];

    if (!customer) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Invalid username/email or password" });
    }
    if (!customer.password) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Account has no password set" });
    }

    const ok = await bcrypt.compare(String(password), customer.password);
    if (!ok) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Invalid username/email or password" });
    }

    if (!Number(customer.is_active)) {
      return res.status(403).json({ error: "INACTIVE_ACCOUNT", message: "Your account is deactivated" });
    }

    if (!customer.phone) {
      return res.status(400).json({ error: "NO_PHONE", message: "Your account does not have a registered phone number. Please contact support." });
    }

    if (!otp) {
      // Step 1: Credentials are valid, but no OTP provided. Generate and send OTP.
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      
      otpStore.set(customer.phone, { otp: generatedOtp, expiresAt });
      const message = `Your Chyta login verification code is ${generatedOtp}. Valid for 10 minutes.`;
      
      await sendArkeselSMS(customer.phone, message);

      return res.json({
        requireOtp: true,
        phone: maskPhone(customer.phone),
        message: "OTP sent to your registered phone number"
      });
    }

    // Step 2: OTP was provided, verify it
    const stored = otpStore.get(customer.phone);
    if (!stored || stored.otp !== String(otp) || stored.expiresAt < Date.now()) {
      return res.status(400).json({ error: "INVALID_OTP", message: "Invalid or expired OTP" });
    }

    // Clear OTP after use
    otpStore.delete(customer.phone);

    const token = jwt.sign(
      {
        id:            Number(customer.id),
        customer_name: customer.customer_name,
        email:         customer.email,
        username:      customer.username,
        company_id:    Number(customer.company_id),
        branch_id:     Number(customer.branch_id),
        role:          "customer"
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      token,
      customer: {
        id:             Number(customer.id),
        customer_name:  customer.customer_name,
        email:          customer.email,
        username:       customer.username,
        linked_shop_id: customer.linked_shop_id || null
      }
    });
  } catch (err) {
    console.error("[Chyta] Login error:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

/* ─────────────────────────────────────────
   POST /api/chyta/google-auth
   ───────────────────────────────────────── */
router.post("/google-auth", async (req, res) => {
  try {
    const { email, customer_name } = req.body;
    if (!email) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Email is required" });
    }

    const emailStr = String(email).trim().toLowerCase();

    // Check if customer already exists
    const rows = await query("SELECT * FROM chy_customer WHERE email = :email LIMIT 1", { email: emailStr });
    let customer = rows[0];

    const { companyId, branchId, currencyId, priceTypeId } = await getDefaults();

    if (!customer) {
      // Auto-register with Google details
      const name = customer_name ? String(customer_name).trim() : emailStr.split('@')[0];
      const username = await generateUniqueUsername(emailStr, null);
      const code = generateCode();
      const randomPassword = Math.random().toString(36).substring(2, 15);
      const hashed = await bcrypt.hash(randomPassword, 10);

      const result = await query(
        `INSERT INTO chy_customer
           (company_id, branch_id, customer_code, customer_name, username, email, password,
            is_active, customer_type, currency_id, price_type_id)
         VALUES
           (:companyId, :branchId, :code, :name, :username, :email, :hashed,
            1, 'Individual', :currencyId, :priceTypeId)`,
        {
          companyId,
          branchId,
          code,
          name,
          username,
          email: emailStr,
          hashed,
          currencyId,
          priceTypeId
        }
      );

      const newId = result.insertId;
      const [newRow] = await query("SELECT * FROM chy_customer WHERE id = :id LIMIT 1", { id: newId });
      customer = newRow;
    }

    if (!Number(customer.is_active)) {
      return res.status(403).json({ error: "INACTIVE_ACCOUNT", message: "Your account is deactivated" });
    }

    const token = jwt.sign(
      {
        id:            Number(customer.id),
        customer_name: customer.customer_name,
        email:         customer.email,
        username:      customer.username,
        company_id:    Number(customer.company_id),
        branch_id:     Number(customer.branch_id),
        role:          "customer"
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      token,
      customer: {
        id:             Number(customer.id),
        customer_name:  customer.customer_name,
        email:          customer.email,
        username:       customer.username,
        linked_shop_id: customer.linked_shop_id || null
      }
    });
  } catch (err) {
    console.error("[Chyta] Google auth error:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/chyta/me   – get own profile
   ───────────────────────────────────────── */
router.get("/me", requireCustomerAuth, async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, customer_name, username, email, phone, linked_shop_id, created_at
       FROM chy_customer WHERE id = :id LIMIT 1`,
      { id: req.customer.id }
    );
    if (!rows.length) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Customer not found" });
    }
    return res.json({ customer: rows[0] });
  } catch (err) {
    console.error("[Chyta] /me error:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/chyta/shops
   ───────────────────────────────────────── */
router.get("/shops", async (req, res) => {
  try {
    const shops = await query(
      `SELECT b.id, b.name, b.code, b.is_active, c.name AS company_name
       FROM adm_branches b
       JOIN adm_companies c ON c.id = b.company_id
       WHERE b.is_active = 1
       ORDER BY c.name ASC, b.name ASC`
    );
    return res.json({ shops });
  } catch (err) {
    console.error("[Chyta] /shops error:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

/* ─────────────────────────────────────────
   POST /api/chyta/link-shop
   ───────────────────────────────────────── */
router.post("/link-shop", requireCustomerAuth, async (req, res) => {
  try {
    const shopId = Number(req.body.shop_id);
    if (!shopId) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "shop_id is required" });
    }

    const [shop] = await query(
      "SELECT id, name, code FROM adm_branches WHERE id = :shopId AND is_active = 1 LIMIT 1",
      { shopId }
    );
    if (!shop) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Shop not found or inactive" });
    }

    await query(
      "UPDATE chy_customer SET linked_shop_id = :shopId WHERE id = :customerId",
      { shopId, customerId: req.customer.id }
    );

    return res.json({
      success: true,
      message: "Shop linked successfully",
      shop: { id: shop.id, name: shop.name, code: shop.code }
    });
  } catch (err) {
    console.error("[Chyta] /link-shop error:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/chyta/items
   ───────────────────────────────────────── */
router.get("/items", requireCustomerAuth, async (req, res) => {
  try {
    /* resolve shop: query-param → linked shop → fallback 1 */
    let shopId = Number(req.query.shop_id) || null;
    if (!shopId) {
      const [cust] = await query(
        "SELECT linked_shop_id FROM chy_customer WHERE id = :id LIMIT 1",
        { id: req.customer.id }
      );
      shopId = Number(cust?.linked_shop_id) || 1;
    }

    const items = await query(
      `SELECT
         i.id,
         i.item_code,
         i.item_name,
         i.uom,
         i.selling_price,
         i.description,
         CASE
           WHEN i.image_url IS NOT NULL AND i.image_url != '' THEN i.image_url
           ELSE NULL
         END AS image_url,
         COALESCE(sb.qty, 0) AS stock_qty
       FROM inv_items i
       LEFT JOIN (
         SELECT item_id, SUM(qty) AS qty
         FROM inv_stock_balances
         WHERE branch_id = :shopId
         GROUP BY item_id
       ) sb ON sb.item_id = i.id
       WHERE (i.is_active = 1 OR i.is_active = 'Y' OR i.is_active IS NULL)
         AND i.company_id = (
           SELECT company_id FROM chy_customer WHERE id = :customerId LIMIT 1
         )
       ORDER BY i.item_name ASC
       LIMIT 500`,
      { shopId, customerId: req.customer.id }
    ).catch(async () => {
      /* fallback: inv_items without image_url column */
      return query(
        `SELECT
           i.id, i.item_code, i.item_name, i.uom, i.selling_price, i.description,
           NULL AS image_url,
           COALESCE(sb.qty, 0) AS stock_qty
         FROM inv_items i
         LEFT JOIN (
           SELECT item_id, SUM(qty) AS qty
           FROM inv_stock_balances
           WHERE branch_id = :shopId
           GROUP BY item_id
         ) sb ON sb.item_id = i.id
         WHERE (i.is_active = 1 OR i.is_active = 'Y' OR i.is_active IS NULL)
         ORDER BY i.item_name ASC
         LIMIT 500`,
        { shopId }
      );
    });

    return res.json({ items });
  } catch (err) {
    console.error("[Chyta] /items error:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/chyta/orders  – history
   ───────────────────────────────────────── */
router.get("/orders", requireCustomerAuth, async (req, res) => {
  try {
    const orders = await query(
      `SELECT o.id, o.order_no, o.order_date, o.status,
              o.total_amount, o.sub_total, o.tax_amount, o.remarks,
              b.name AS shop_name
       FROM sal_orders o
       LEFT JOIN adm_branches b ON b.id = o.branch_id
       WHERE o.customer_id = :customerId
       ORDER BY o.id DESC
       LIMIT 200`,
      { customerId: req.customer.id }
    );

    /* attach line items for each order */
    const result = [];
    for (const order of orders) {
      const details = await query(
        `SELECT od.id, od.item_id, i.item_name,
                od.qty, od.unit_price, od.discount_percent,
                od.total_amount, od.net_amount, od.uom
         FROM sal_order_details od
         JOIN inv_items i ON i.id = od.item_id
         WHERE od.order_id = :orderId`,
        { orderId: order.id }
      ).catch(() => []);
      result.push({ ...order, items: details });
    }

    return res.json({ orders: result });
  } catch (err) {
    console.error("[Chyta] /orders GET error:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

/* ─────────────────────────────────────────
   POST /api/chyta/orders  – place order
   ───────────────────────────────────────── */
router.post("/orders", requireCustomerAuth, async (req, res) => {
  try {
    const { items, remarks, shop_id } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Cart cannot be empty" });
    }

    /* resolve branch */
    let branchId = Number(shop_id) || null;
    if (!branchId) {
      const [cust] = await query(
        "SELECT linked_shop_id FROM chy_customer WHERE id = :id LIMIT 1",
        { id: req.customer.id }
      );
      branchId = Number(cust?.linked_shop_id) || null;
    }
    if (!branchId) {
      return res.status(400).json({
        error: "NO_SHOP",
        message: "No shop linked. Please select a shop first."
      });
    }

    /* resolve customer details */
    const [cust] = await query(
      "SELECT company_id, currency_id FROM chy_customer WHERE id = :id LIMIT 1",
      { id: req.customer.id }
    );
    const companyId  = Number(cust?.company_id  || 1);
    const currencyId = Number(cust?.currency_id || 1);

    /* validate & price items */
    const orderNo = "CHY-" + Date.now();
    let subTotal  = 0;
    const validLines = [];

    for (const cartItem of items) {
      const itemId = Number(cartItem.item_id);
      const qty    = Number(cartItem.qty);
      if (!itemId || qty <= 0) continue;

      const [inv] = await query(
        "SELECT id, selling_price, uom FROM inv_items WHERE id = :itemId LIMIT 1",
        { itemId }
      );
      if (!inv) {
        return res.status(400).json({
          error: "ITEM_NOT_FOUND",
          message: `Item ID ${itemId} not found`
        });
      }

      const unitPrice = Number(inv.selling_price || 0);
      const lineTotal = unitPrice * qty;
      subTotal += lineTotal;
      validLines.push({
        item_id:          itemId,
        qty,
        unit_price:       unitPrice,
        discount_percent: 0,
        total_amount:     lineTotal,
        net_amount:       lineTotal,
        tax_amount:       0,
        uom:              inv.uom || "PCS"
      });
    }

    if (validLines.length === 0) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "No valid items to order" });
    }

    const totalAmount = subTotal;   // tax handled at ERP level

    /* insert header */
    const headerResult = await query(
      `INSERT INTO sal_orders
         (company_id, branch_id, order_no, order_date, customer_id,
          status, total_amount, sub_total, tax_amount,
          currency_id, exchange_rate, price_type, payment_type, remarks)
       VALUES
         (:companyId, :branchId, :orderNo, NOW(), :customerId,
          'PENDING_APPROVAL', :totalAmount, :subTotal, 0,
          :currencyId, 1.0, 'RETAIL', 'CASH', :remarks)`,
      {
        companyId, branchId, orderNo,
        customerId:  req.customer.id,
        totalAmount, subTotal,
        currencyId,
        remarks: remarks || null
      }
    );

    const orderId = headerResult.insertId;

    /* insert lines */
    for (const line of validLines) {
      await query(
        `INSERT INTO sal_order_details
           (order_id, item_id, qty, unit_price, discount_percent,
            total_amount, net_amount, tax_amount, uom)
         VALUES
           (:orderId, :item_id, :qty, :unit_price, :discount_percent,
            :total_amount, :net_amount, :tax_amount, :uom)`,
        { orderId, ...line }
      );
    }

    return res.status(201).json({
      success:      true,
      message:      "Order placed successfully",
      order_id:     orderId,
      order_no:     orderNo,
      total_amount: totalAmount
    });
  } catch (err) {
    console.error("[Chyta] /orders POST error:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

/* ─────────────────────────────────────────
   GET /api/chyta/currency
   ───────────────────────────────────────── */
router.get("/currency", async (req, res) => {
  try {
    const rows = await query("SELECT id, currency_code, currency_name, symbol FROM fin_currencies ORDER BY id ASC LIMIT 1");
    if (!rows.length) {
      return res.json({ currency: { symbol: "$", currency_code: "USD" } });
    }
    return res.json({ currency: rows[0] });
  } catch (err) {
    console.error("[Chyta] /currency error:", err);
    return res.status(500).json({ error: "SERVER_ERROR", message: err.message });
  }
});

export default router;
