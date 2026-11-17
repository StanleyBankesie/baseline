import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query, pool } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";
import { sendMail } from "../utils/mailer.js";
import { ensureHRTables } from "../utils/dbUtils.js";

const JWT_SECRET = process.env.JWT_SECRET || "omnisuite_default_jwt_secret_key_change_in_prod";

async function ensurePortalSupportTables() {
  await ensureHRTables();
  await query(`
    CREATE TABLE IF NOT EXISTS hr_employee_portal_auth (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      company_id BIGINT UNSIGNED NOT NULL DEFAULT 1,
      employee_id BIGINT UNSIGNED NOT NULL UNIQUE,
      password_hash VARCHAR(255) NULL,
      temp_password_used TINYINT(1) NOT NULL DEFAULT 1,
      requires_password_change TINYINT(1) NOT NULL DEFAULT 1,
      is_locked TINYINT(1) NOT NULL DEFAULT 0,
      last_login_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_emp_portal (employee_id),
      KEY idx_comp_portal (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch(() => {});

  await query(`
    CREATE TABLE IF NOT EXISTS hr_employee_requests (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      company_id BIGINT UNSIGNED NULL,
      branch_id BIGINT UNSIGNED NULL,
      employee_id BIGINT UNSIGNED NOT NULL,
      request_type VARCHAR(100) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      description TEXT NULL,
      attachment_url TEXT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      admin_remarks TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_emp_req (employee_id),
      KEY idx_comp_req (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch(() => {});

  await query(`
    CREATE TABLE IF NOT EXISTS hr_notification_preferences (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      employee_id BIGINT UNSIGNED NOT NULL UNIQUE,
      email_leave_updates TINYINT(1) NOT NULL DEFAULT 1,
      email_payroll_updates TINYINT(1) NOT NULL DEFAULT 1,
      email_announcements TINYINT(1) NOT NULL DEFAULT 1,
      email_event_reminders TINYINT(1) NOT NULL DEFAULT 1,
      push_attendance_alerts TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `).catch(() => {});
}

// ----------------------------------------------------------------------------
// AUTHENTICATION & SECURITY
// ----------------------------------------------------------------------------

export async function portalLogin(req, res, next) {
  try {
    await ensurePortalSupportTables();
    const { identifier, username, password, rememberMe } = req.body || {};
    const loginInput = (identifier || username || "").trim();
    const inputPassword = (password || "").trim();

    if (!loginInput || !inputPassword) {
      throw httpError(400, "VALIDATION_ERROR", "Username and password are required.");
    }

    let employee = null;
    let user = null;
    let requiresPasswordChange = false;
    let authMethod = "EMPLOYEE"; // "USER" or "EMPLOYEE"

    // 1. Try finding in adm_users first (management / admin accounts)
    const [foundUser] = await query(
      `SELECT u.*, c.name as company_name, b.name as branch_name 
       FROM adm_users u
       LEFT JOIN adm_companies c ON c.id = u.company_id
       LEFT JOIN adm_branches b ON b.id = u.branch_id
       WHERE (u.username = ? OR LOWER(u.email) = LOWER(?))
       LIMIT 1`,
      [loginInput, loginInput]
    );

    if (foundUser && foundUser.is_active) {
      const hash = String(foundUser.password_hash || "");
      const isBcrypt = hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
      let passwordMatch = false;

      if (isBcrypt) {
        passwordMatch = await bcrypt.compare(inputPassword, hash);
      } else {
        if (inputPassword === hash) {
          passwordMatch = true;
          const newHash = await bcrypt.hash(inputPassword, 10);
          await query(`UPDATE adm_users SET password_hash = ? WHERE id = ?`, [newHash, foundUser.id]);
        }
      }

      if (passwordMatch) {
        user = foundUser;
        authMethod = "USER";
        requiresPasswordChange = foundUser.status === "N";

        // Find associated employee profile
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
           WHERE (e.user_id = ? OR (e.email IS NOT NULL AND LOWER(e.email) = LOWER(?)))
             AND e.deleted_at IS NULL
           ORDER BY (e.user_id = ?) DESC, e.id ASC
           LIMIT 1`,
          [user.id, user.email, user.id]
        );

        if (emp) {
          employee = emp;
        } else if (user.id === 1) {
          // Super Admin Bypass
          employee = {
            id: 1,
            user_id: 1,
            emp_code: "ADM-001",
            first_name: user.full_name?.split(" ")[0] || "Administrator",
            last_name: user.full_name?.split(" ").slice(1).join(" ") || "System",
            email: user.email || "admin@omnisuite.com",
            phone: "+233 24 000 0000",
            dept_name: "Executive Management",
            pos_name: "System Administrator",
            status: "ACTIVE",
            company_id: user.company_id || 1,
            branch_id: user.branch_id || null,
          };
        }
      }
    }

    // 2. If not authenticated via adm_users, search directly in hr_employees
    if (!employee) {
      // Look up by registered employee name (first_name, last_name, full name, or emp_code)
      const [matchedEmployee] = await query(
        `SELECT e.*, 
                COALESCE(d.dept_name, ad.name) as dept_name,
                p.pos_name,
                m.first_name as manager_first_name, m.last_name as manager_last_name
         FROM hr_employees e
         LEFT JOIN hr_departments d ON d.id = e.dept_id
         LEFT JOIN adm_departments ad ON ad.id = e.dept_id
         LEFT JOIN hr_positions p ON p.id = e.pos_id
         LEFT JOIN hr_employees m ON m.id = e.manager_id
         WHERE (
           LOWER(TRIM(e.first_name)) = LOWER(?)
           OR LOWER(TRIM(e.last_name)) = LOWER(?)
           OR LOWER(CONCAT(TRIM(e.first_name), ' ', TRIM(e.last_name))) = LOWER(?)
           OR LOWER(CONCAT(TRIM(e.last_name), ' ', TRIM(e.first_name))) = LOWER(?)
           OR LOWER(TRIM(e.emp_code)) = LOWER(?)
           OR LOWER(TRIM(e.email)) = LOWER(?)
         ) AND e.deleted_at IS NULL
         LIMIT 1`,
        [loginInput, loginInput, loginInput, loginInput, loginInput, loginInput]
      );

      if (!matchedEmployee) {
        throw httpError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
      }

      if (matchedEmployee.status === "TERMINATED" || matchedEmployee.status === "INACTIVE") {
        throw httpError(403, "EMPLOYMENT_TERMINATED", "Your employment status is inactive. Access denied.");
      }

      // Check portal auth record in hr_employee_portal_auth
      let [portalAuth] = await query(
        `SELECT * FROM hr_employee_portal_auth WHERE employee_id = ? LIMIT 1`,
        [matchedEmployee.id]
      );

      let empPasswordMatch = false;

      if (portalAuth && portalAuth.password_hash) {
        // Employee has previously set a custom password
        empPasswordMatch = await bcrypt.compare(inputPassword, portalAuth.password_hash);
        requiresPasswordChange = Boolean(portalAuth.requires_password_change);
      } else {
        // First-time login: Temporal password is their registered employee code (e.g. ST0001, ST0002)
        const expectedTempPassword = String(matchedEmployee.emp_code || "").trim();
        if (expectedTempPassword && inputPassword.toLowerCase() === expectedTempPassword.toLowerCase()) {
          empPasswordMatch = true;
          requiresPasswordChange = true;

          // Provision portal auth record if not present
          if (!portalAuth) {
            const initialHash = await bcrypt.hash(expectedTempPassword, 10);
            await query(
              `INSERT INTO hr_employee_portal_auth (company_id, employee_id, password_hash, temp_password_used, requires_password_change)
               VALUES (?, ?, ?, 1, 1)`,
              [matchedEmployee.company_id || 1, matchedEmployee.id, initialHash]
            ).catch(() => {});
          }
        }
      }

      if (!empPasswordMatch) {
        throw httpError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
      }

      employee = matchedEmployee;
      authMethod = "EMPLOYEE";
    }

    if (!employee) {
      throw httpError(401, "INVALID_CREDENTIALS", "Invalid credentials.");
    }

    const expiresIn = rememberMe ? "30d" : "1d";
    const token = jwt.sign(
      {
        userId: user?.id || employee.user_id || null,
        employeeId: employee.id,
        companyId: employee.company_id || user?.company_id || 1,
        username: user?.username || employee.emp_code || employee.first_name,
        email: employee.email || user?.email || null,
        scope: "employee_portal",
      },
      JWT_SECRET,
      { expiresIn }
    );

    // Update last login timestamp
    await query(
      `UPDATE hr_employee_portal_auth SET last_login_at = NOW() WHERE employee_id = ?`,
      [employee.id]
    ).catch(() => {});

    res.cookie("portal_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: rememberMe ? 30 * 24 * 3600 * 1000 : 24 * 3600 * 1000,
    });

    res.json({
      token,
      requiresPasswordChange,
      user: {
        id: user?.id || null,
        username: user?.username || employee.first_name,
        email: employee.email || user?.email || "",
        full_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
        company_id: employee.company_id || 1,
        branch_id: employee.branch_id || null,
      },
      employee: {
        id: employee.id,
        emp_code: employee.emp_code,
        first_name: employee.first_name,
        last_name: employee.last_name,
        full_name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
        email: employee.email,
        phone: employee.phone,
        picture_url: employee.picture_url,
        dept_name: employee.dept_name,
        pos_name: employee.pos_name,
        status: employee.status,
        joining_date: employee.joining_date,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function portalChangePassword(req, res, next) {
  try {
    const { employeeId, userId } = req.portalUser;
    const { currentPassword, newPassword, confirmNewPassword } = req.body || {};

    if (!newPassword) {
      throw httpError(400, "VALIDATION_ERROR", "New password is required.");
    }

    // Password Policy: Minimum 8 chars, 1 uppercase, 1 number, 1 special character
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

    // Update in hr_employee_portal_auth
    await query(`
      INSERT INTO hr_employee_portal_auth (company_id, employee_id, password_hash, temp_password_used, requires_password_change)
      VALUES (1, ?, ?, 0, 0)
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), temp_password_used = 0, requires_password_change = 0
    `, [employeeId, newHash]);

    // Also update adm_users if linked
    if (userId) {
      await query(`UPDATE adm_users SET password_hash = ?, status = 'Y' WHERE id = ?`, [newHash, userId]).catch(() => {});
    }

    res.json({ message: "Password updated successfully. You can now access your dashboard.", requiresPasswordChange: false });
  } catch (err) {
    next(err);
  }
}

export async function portalRequestResetOtp(req, res, next) {
  try {
    const { email, username } = req.body || {};
    const identifier = (email || username || "").trim();

    if (!identifier) {
      throw httpError(400, "VALIDATION_ERROR", "Please provide your registered email or username.");
    }

    const [user] = await query(
      `SELECT u.id, u.username, u.email, u.is_active 
       FROM adm_users u
       WHERE (u.username = ? OR LOWER(u.email) = LOWER(?)) AND u.is_active = 1
       LIMIT 1`,
      [identifier, identifier]
    );

    if (!user || !user.email) {
      return res.json({ message: "If an active account exists with these details, an OTP has been sent." });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await query(`
      CREATE TABLE IF NOT EXISTS adm_password_resets (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id BIGINT UNSIGNED NOT NULL,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )
    `).catch(() => {});

    await query(`UPDATE adm_password_resets SET used = 1 WHERE user_id = ? AND used = 0`, [user.id]);
    await query(
      `INSERT INTO adm_password_resets (user_id, username, email, otp_code, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))`,
      [user.id, user.username, user.email, otp]
    );

    const subject = "OmniSuite ESS Portal - Password Reset OTP";
    const text = `Hello ${user.username},\n\nYour OTP to reset your Employee Self-Service Portal password is: ${otp}.\nIt expires in 15 minutes.`;
    const html = `<p>Hello <strong>${user.username}</strong>,</p><p>Your OTP to reset your Employee Self-Service Portal password is: <h2 style="color: #0E3646;">${otp}</h2></p><p>This OTP will expire in 15 minutes.</p>`;

    await sendMail({
      to: user.email,
      subject,
      text,
      html,
      meta: { moduleName: "EmployeePortal", action: "RESET_OTP", userId: user.id }
    }).catch(console.error);

    res.json({ message: "If an active account exists with these details, an OTP has been sent." });
  } catch (err) {
    next(err);
  }
}

export async function portalResetPassword(req, res, next) {
  try {
    const { username, email, otp, newPassword } = req.body || {};
    const identifier = (email || username || "").trim();

    if (!identifier || !otp || !newPassword) {
      throw httpError(400, "VALIDATION_ERROR", "Username/email, OTP, and new password are required.");
    }

    if (newPassword.length < 8) {
      throw httpError(400, "VALIDATION_ERROR", "New password must be at least 8 characters long.");
    }

    const [user] = await query(
      `SELECT id, username, email FROM adm_users WHERE (username = ? OR LOWER(email) = LOWER(?)) AND is_active = 1 LIMIT 1`,
      [identifier, identifier]
    );

    if (!user) throw httpError(400, "VALIDATION_ERROR", "Invalid or expired OTP.");

    const [resetRecord] = await query(
      `SELECT id, otp_code, expires_at, used FROM adm_password_resets WHERE user_id = ? AND otp_code = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
      [user.id, String(otp).trim()]
    );

    if (!resetRecord) {
      throw httpError(400, "VALIDATION_ERROR", "Invalid or expired OTP code.");
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE adm_users SET password_hash = ?, status = 'Y' WHERE id = ?`, [hash, user.id]);
    await query(`UPDATE adm_password_resets SET used = 1 WHERE id = ?`, [resetRecord.id]);

    res.json({ message: "Password has been successfully reset. Please log in with your new password." });
  } catch (err) {
    next(err);
  }
}

export async function portalLogout(req, res, next) {
  try {
    res.clearCookie("portal_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
    res.json({ ok: true, message: "Logged out successfully." });
  } catch (err) {
    next(err);
  }
}

export async function getPortalMe(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const [employee] = await query(
      `SELECT e.*, 
              COALESCE(d.dept_name, ad.name) as dept_name,
              p.pos_name,
              m.first_name as manager_first_name, m.last_name as manager_last_name,
              CONCAT(e.first_name, ' ', COALESCE(e.middle_name, ''), ' ', e.last_name) as full_name
       FROM hr_employees e
       LEFT JOIN hr_departments d ON d.id = e.dept_id
       LEFT JOIN adm_departments ad ON ad.id = e.dept_id
       LEFT JOIN hr_positions p ON p.id = e.pos_id
       LEFT JOIN hr_employees m ON m.id = e.manager_id
       WHERE e.id = ? AND e.deleted_at IS NULL LIMIT 1`,
      [employeeId]
    );

    if (!employee) throw httpError(404, "NOT_FOUND", "Employee profile not found.");

    res.json({
      user: req.portalUser.user,
      employee,
      requiresPasswordChange: req.portalUser.requiresPasswordChange,
    });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// DASHBOARD COMMAND CENTER
// ----------------------------------------------------------------------------

export async function getDashboardOverview(req, res, next) {
  try {
    const { employeeId } = req.portalUser;

    const [employee] = await query(
      `SELECT e.id, e.emp_code, e.first_name, e.last_name, e.picture_url, e.email, e.phone,
              COALESCE(d.dept_name, ad.name) as dept_name, p.pos_name
       FROM hr_employees e
       LEFT JOIN hr_departments d ON d.id = e.dept_id
       LEFT JOIN adm_departments ad ON ad.id = e.dept_id
       LEFT JOIN hr_positions p ON p.id = e.pos_id
       WHERE e.id = ? LIMIT 1`,
      [employeeId]
    );

    const [todayAttendance] = await query(
      `SELECT id, attendance_date as date, 
              DATE_FORMAT(clock_in, '%H:%i:%s') as clock_in, 
              DATE_FORMAT(clock_out, '%H:%i:%s') as clock_out, 
              status, 
              CASE WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL 
                   THEN ROUND(TIMESTAMPDIFF(MINUTE, clock_in, clock_out) / 60, 2)
                   ELSE NULL END as total_hours, 
              remarks
       FROM hr_attendance 
       WHERE employee_id = ? AND attendance_date = CURDATE()
       ORDER BY id DESC LIMIT 1`,
      [employeeId]
    );

    const [leaveBalance] = await query(
      `SELECT 
         COALESCE(SUM(b.allocated_days), 24) as total_entitled,
         COALESCE((SELECT SUM(total_days) FROM hr_leave_records WHERE employee_id = ? AND status = 'ACTIVE' AND YEAR(start_date) = YEAR(CURDATE())), 0) as total_taken,
         COALESCE(SUM(b.allocated_days), 24) - COALESCE((SELECT SUM(total_days) FROM hr_leave_records WHERE employee_id = ? AND status = 'ACTIVE' AND YEAR(start_date) = YEAR(CURDATE())), 0) as total_available,
         COALESCE((SELECT SUM(total_days) FROM hr_leave_records WHERE employee_id = ? AND status = 'ACTIVE' AND start_date >= CURDATE()), 0) as total_pending
       FROM hr_leave_balances b
       WHERE b.employee_id = ? AND b.year = YEAR(CURDATE())`,
      [employeeId, employeeId, employeeId, employeeId]
    );

    const [attendanceMonthly] = await query(
      `SELECT 
         COUNT(CASE WHEN status IN ('PRESENT', 'LATE', 'HALF_DAY') THEN 1 END) as days_present,
         COUNT(CASE WHEN status = 'LATE' THEN 1 END) as days_late,
         COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as days_absent,
         COUNT(id) as total_records
       FROM hr_attendance
       WHERE employee_id = ? AND MONTH(attendance_date) = MONTH(CURDATE()) AND YEAR(attendance_date) = YEAR(CURDATE())`,
      [employeeId]
    );

    const [latestPayslip] = await query(
      `SELECT p.id, p.period_id, p.basic_salary as gross_salary, p.allowances as total_allowances, p.deductions as total_deductions, 
              p.net_salary, p.paid_at as created_at, pp.period_name
       FROM hr_payslips p
       LEFT JOIN hr_payroll_periods pp ON pp.id = p.period_id
       WHERE p.employee_id = ?
       ORDER BY p.id DESC LIMIT 1`,
      [employeeId]
    );

    const [activeLoans] = await query(
      `SELECT COUNT(id) as active_count, COALESCE(SUM(amount), 0) as total_principal,
              COALESCE(SUM(monthly_installment), 0) as total_monthly_deduction
       FROM hr_loans
       WHERE employee_id = ? AND status = 'APPROVED'`,
      [employeeId]
    );

    const annRows = await query("SELECT value FROM app_settings WHERE `key` = 'upcoming_announcements' LIMIT 1").catch(() => []);
    let announcements = [];
    if (annRows[0]?.value) {
      try {
        const parsed = JSON.parse(annRows[0].value);
        announcements = Array.isArray(parsed) ? parsed.filter(Boolean) : [annRows[0].value];
      } catch (e) {
        announcements = [annRows[0].value];
      }
    }

    const holidays = [
      { id: 1, name: "Independence Day", date: "2026-03-06", description: "National Public Holiday" },
      { id: 2, name: "Good Friday", date: "2026-04-03", description: "Public Holiday" },
      { id: 3, name: "Labour Day", date: "2026-05-01", description: "Workers Celebration" }
    ];

    const [unreadNotif] = await query(
      `SELECT COUNT(id) as count 
       FROM hr_employee_requests 
       WHERE employee_id = ? AND status IN ('APPROVED', 'REJECTED')`,
      [employeeId]
    );

    res.json({
      employee,
      todayAttendance: todayAttendance || null,
      leaveSummary: {
        entitled: Number(leaveBalance?.total_entitled || 24),
        taken: Number(leaveBalance?.total_taken || 0),
        available: Number(leaveBalance?.total_available || 24),
        pending: Number(leaveBalance?.total_pending || 0),
      },
      attendanceMonthly: {
        present: Number(attendanceMonthly?.days_present || 0),
        late: Number(attendanceMonthly?.days_late || 0),
        absent: Number(attendanceMonthly?.days_absent || 0),
        rate: attendanceMonthly?.total_records > 0 
          ? Math.round((attendanceMonthly.days_present / attendanceMonthly.total_records) * 100) 
          : 100,
      },
      latestPayslip: latestPayslip || null,
      activeLoans: activeLoans || { active_count: 0, total_principal: 0, total_monthly_deduction: 0 },
      announcements,
      holidays,
      unreadNotificationsCount: Number(unreadNotif?.count || 0),
    });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// ATTENDANCE TRENDS & ACTIONS
// ----------------------------------------------------------------------------

export async function getAttendanceTrends(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const filter = req.query.filter || "this_month";

    let dateCondition = "date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    let groupBy = "DATE(date)";
    let dateFormat = "%Y-%m-%d";

    if (filter === "3_months") {
      dateCondition = "date >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)";
      groupBy = "YEARWEEK(date, 1)";
      dateFormat = "%b W%V";
    } else if (filter === "6_months") {
      dateCondition = "date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)";
      groupBy = "DATE_FORMAT(date, '%Y-%m')";
      dateFormat = "%b %Y";
    } else if (filter === "year") {
      dateCondition = "date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)";
      groupBy = "DATE_FORMAT(date, '%Y-%m')";
      dateFormat = "%b %Y";
    }

    const records = await query(
      `SELECT 
         DATE_FORMAT(attendance_date, '${dateFormat}') as label,
         COUNT(CASE WHEN status IN ('PRESENT', 'LATE', 'HALF_DAY') THEN 1 END) as present,
         COUNT(CASE WHEN status = 'LATE' THEN 1 END) as late,
         COUNT(CASE WHEN status = 'ABSENT' THEN 1 END) as absent,
         COUNT(id) as total,
         ROUND((COUNT(CASE WHEN status IN ('PRESENT', 'LATE', 'HALF_DAY') THEN 1 END) / GREATEST(COUNT(id), 1)) * 100, 1) as percentage
       FROM hr_attendance
       WHERE employee_id = ? AND ${dateCondition.replaceAll("date", "attendance_date")}
       GROUP BY ${groupBy.replaceAll("date", "attendance_date")}, label
       ORDER BY MIN(attendance_date) ASC`,
      [employeeId]
    );

    res.json({ filter, records });
  } catch (err) {
    next(err);
  }
}

export async function clockIn(req, res, next) {
  try {
    const { employeeId, companyId, branchId } = req.portalUser;
    const { remarks } = req.body || {};

    const [existing] = await query(
      `SELECT id, clock_in FROM hr_attendance WHERE employee_id = ? AND attendance_date = CURDATE() LIMIT 1`,
      [employeeId]
    );

    if (existing && existing.clock_in) {
      throw httpError(400, "ALREADY_CLOCKED_IN", `You have already clocked in today.`);
    }

    const now = new Date();
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);
    const status = isLate ? "LATE" : "PRESENT";

    if (existing) {
      await query(
        `UPDATE hr_attendance SET clock_in = NOW(), status = ?, remarks = ? WHERE id = ?`,
        [status, remarks || "Mobile Portal Clock-In", existing.id]
      );
    } else {
      await query(
        `INSERT INTO hr_attendance (company_id, employee_id, attendance_date, clock_in, status, remarks) VALUES (?, ?, CURDATE(), NOW(), ?, ?)`,
        [companyId || 1, employeeId, status, remarks || "Mobile Portal Clock-In"]
      );
    }

    res.json({ message: "Successfully clocked in", status });
  } catch (err) {
    next(err);
  }
}

export async function clockOut(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const { remarks } = req.body || {};

    const [existing] = await query(
      `SELECT id, clock_in, clock_out FROM hr_attendance WHERE employee_id = ? AND attendance_date = CURDATE() LIMIT 1`,
      [employeeId]
    );

    if (!existing || !existing.clock_in) {
      throw httpError(400, "NOT_CLOCKED_IN", "You have not clocked in today yet.");
    }

    if (existing.clock_out) {
      throw httpError(400, "ALREADY_CLOCKED_OUT", `You have already clocked out today.`);
    }

    await query(
      `UPDATE hr_attendance SET clock_out = NOW(), remarks = CONCAT(COALESCE(remarks, ''), ' | Out: ', ?) WHERE id = ?`,
      [remarks || "Mobile Portal Clock-Out", existing.id]
    );

    res.json({ message: "Successfully clocked out" });
  } catch (err) {
    next(err);
  }
}

export async function getAttendanceHistory(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const { month, year } = req.query;

    let condition = "YEAR(attendance_date) = YEAR(CURDATE())";
    const params = [employeeId];

    if (month && year) {
      condition = "MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?";
      params.push(month, year);
    }

    const records = await query(
      `SELECT id, attendance_date as date, 
              DATE_FORMAT(clock_in, '%H:%i:%s') as clock_in, 
              DATE_FORMAT(clock_out, '%H:%i:%s') as clock_out, 
              status, 
              CASE WHEN clock_in IS NOT NULL AND clock_out IS NOT NULL 
                   THEN ROUND(TIMESTAMPDIFF(MINUTE, clock_in, clock_out) / 60, 2)
                   ELSE NULL END as total_hours, 
              remarks
       FROM hr_attendance
       WHERE employee_id = ? AND ${condition}
       ORDER BY attendance_date DESC`,
      params
    );

    res.json({ records });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// LEAVE
// ----------------------------------------------------------------------------

export async function getLeaveBalances(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const currentYear = new Date().getFullYear();

    const leaveTypes = await query(
      `SELECT t.id, t.name, t.code, t.days_allowed, t.is_paid,
              COALESCE(b.allocated_days, t.days_allowed, 24) as entitled_days,
              COALESCE((SELECT SUM(r.total_days) FROM hr_leave_records r WHERE r.leave_type_id = t.id AND r.employee_id = ? AND r.status = 'ACTIVE' AND YEAR(r.start_date) = ?), 0) as used_days,
              COALESCE(b.allocated_days, t.days_allowed, 24) - COALESCE((SELECT SUM(r.total_days) FROM hr_leave_records r WHERE r.leave_type_id = t.id AND r.employee_id = ? AND r.status = 'ACTIVE' AND YEAR(r.start_date) = ?), 0) as balance_days
       FROM hr_leave_types t
       LEFT JOIN hr_leave_balances b ON b.leave_type_id = t.id AND b.employee_id = ? AND b.year = ?
       ORDER BY t.name ASC`,
      [employeeId, currentYear, employeeId, currentYear, employeeId, currentYear]
    );

    const records = await query(
      `SELECT r.id, r.leave_type_id, r.start_date, r.end_date, r.total_days, r.status, r.reason,
              r.remarks as admin_remarks, r.created_at, t.name as leave_type_name
       FROM hr_leave_records r
       LEFT JOIN hr_leave_types t ON t.id = r.leave_type_id
       WHERE r.employee_id = ?
       ORDER BY r.id DESC`,
      [employeeId]
    );

    res.json({ balances: leaveTypes, requests: records });
  } catch (err) {
    next(err);
  }
}

export async function applyLeave(req, res, next) {
  try {
    const { employeeId, companyId, branchId } = req.portalUser;
    const { leave_type_id, start_date, end_date, reason, attachment_url } = req.body || {};

    if (!leave_type_id || !start_date || !end_date || !reason) {
      throw httpError(400, "VALIDATION_ERROR", "Leave type, start date, end date, and reason are required.");
    }

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end < start) {
      throw httpError(400, "VALIDATION_ERROR", "End date cannot be earlier than start date.");
    }

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const [overlap] = await query(
      `SELECT id FROM hr_leave_records 
       WHERE employee_id = ? AND status IN ('PENDING', 'APPROVED')
         AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (? BETWEEN start_date AND end_date))
       LIMIT 1`,
      [employeeId, start_date, end_date, start_date, end_date, start_date]
    );

    if (overlap) {
      throw httpError(400, "OVERLAPPING_LEAVE", "You already have a pending or approved leave request for these dates.");
    }

    const result = await query(
      `INSERT INTO hr_leave_records (company_id, branch_id, employee_id, leave_type_id, start_date, end_date, total_days, reason, attachment_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [companyId, branchId, employeeId, leave_type_id, start_date, end_date, diffDays, reason, attachment_url || null]
    );

    res.status(201).json({ id: result.insertId, message: "Leave application submitted successfully. Awaiting approval." });
  } catch (err) {
    next(err);
  }
}

export async function cancelLeave(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const { id } = req.params;

    const [record] = await query(
      `SELECT id, status FROM hr_leave_records WHERE id = ? AND employee_id = ? LIMIT 1`,
      [id, employeeId]
    );

    if (!record) throw httpError(404, "NOT_FOUND", "Leave request not found.");

    if (record.status !== "PENDING") {
      throw httpError(400, "CANNOT_CANCEL", `Cannot cancel leave request that is already ${record.status}.`);
    }

    await query(`UPDATE hr_leave_records SET status = 'CANCELLED' WHERE id = ?`, [id]);
    res.json({ message: "Leave request cancelled." });
  } catch (err) {
    next(err);
  }
}

// ----------------------------------------------------------------------------
// COMPENSATION & BENEFITS
// ----------------------------------------------------------------------------

export async function getCompensationSummary(req, res, next) {
  try {
    const { employeeId } = req.portalUser;

    const [employee] = await query(
      `SELECT base_salary, bank_name, bank_account_no, bank_account_number, tin, ssnit_no, ssnit_number FROM hr_employees WHERE id = ? LIMIT 1`,
      [employeeId]
    );

    const allowances = await query(
      `SELECT a.id, a.allowance_name, a.amount, a.is_taxable FROM hr_allowances a WHERE a.is_active = 1 LIMIT 10`,
      []
    );

    const loans = await query(
      `SELECT l.id, l.amount as loan_amount, l.monthly_installment as monthly_deduction, 
              l.repayment_period_months as duration_months, l.loan_type as loan_type_name, 
              l.status, l.created_at
       FROM hr_loans l
       WHERE l.employee_id = ?
       ORDER BY l.id DESC`,
      [employeeId]
    );

    const payslips = await query(
      `SELECT p.id, p.period_id, p.basic_salary as gross_salary, p.allowances as total_allowances, p.deductions as total_deductions,
              p.net_salary, p.paid_at as created_at, pp.period_name
       FROM hr_payslips p
       LEFT JOIN hr_payroll_periods pp ON pp.id = p.period_id
       WHERE p.employee_id = ?
       ORDER BY p.id DESC`,
      [employeeId]
    );

    res.json({
      salary: {
        base_salary: Number(employee?.base_salary || 0),
        bank_name: employee?.bank_name || null,
        bank_account: employee?.bank_account_no || employee?.bank_account_number || null,
        ssnit: employee?.ssnit_no || employee?.ssnit_number || null,
        tin: employee?.tin || null,
      },
      allowances,
      loans,
      payslips,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPayslipDetail(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const { id } = req.params;

    const [payslip] = await query(
      `SELECT p.*, p.basic_salary as gross_salary, p.allowances as total_allowances, p.deductions as total_deductions,
              pp.period_name, pp.start_date as period_start, pp.end_date as period_end,
              e.emp_code, e.first_name, e.last_name, e.dept_id, e.pos_id, e.bank_name, e.bank_account_no, e.ssnit_no,
              COALESCE(d.dept_name, ad.name) as dept_name, pos.pos_name, c.name as company_name, c.logo_url as company_logo
       FROM hr_payslips p
       LEFT JOIN hr_payroll_periods pp ON pp.id = p.period_id
       LEFT JOIN hr_employees e ON e.id = p.employee_id
       LEFT JOIN hr_departments d ON d.id = e.dept_id
       LEFT JOIN adm_departments ad ON ad.id = e.dept_id
       LEFT JOIN hr_positions pos ON pos.id = e.pos_id
       LEFT JOIN adm_companies c ON c.id = e.company_id
       WHERE p.id = ? AND p.employee_id = ? LIMIT 1`,
      [id, employeeId]
    );

    if (!payslip) throw httpError(404, "NOT_FOUND", "Payslip not found or access denied.");

    res.json({ payslip });
  } catch (err) {
    next(err);
  }
}

export async function applyLoan(req, res, next) {
  try {
    const { employeeId, companyId, branchId } = req.portalUser;
    const { loan_type_id, loan_amount, monthly_deduction, duration_months, reason } = req.body || {};

    if (!loan_amount || Number(loan_amount) <= 0) {
      throw httpError(400, "VALIDATION_ERROR", "Valid loan amount is required.");
    }

    const result = await query(
      `INSERT INTO hr_loans (company_id, branch_id, employee_id, loan_type, amount, monthly_installment, repayment_period_months, start_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), 'PENDING')`,
      [companyId || 1, branchId || null, employeeId, "PERSONAL_LOAN", loan_amount, monthly_deduction || 0, duration_months || 12]
    );

    res.status(201).json({ id: result.insertId, message: "Loan application submitted successfully." });
  } catch (err) {
    next(err);
  }
}

export async function getPolicies(req, res, next) {
  try {
    const { employeeId, companyId } = req.portalUser;

    const policies = await query(
      `SELECT p.id, p.code, p.title, p.content, p.attachment_url, p.attachment_name, p.created_at,
              ack.acknowledged_at
       FROM hr_policies p
       LEFT JOIN hr_policy_acknowledgements ack ON ack.policy_id = p.id AND ack.employee_id = ?
       WHERE (p.company_id = ? OR p.company_id IS NULL) AND p.is_active = 1
       ORDER BY p.title ASC`,
      [employeeId, companyId]
    );

    res.json({ policies });
  } catch (err) {
    next(err);
  }
}

export async function acknowledgePolicy(req, res, next) {
  try {
    const { employeeId, companyId } = req.portalUser;
    const { policy_id } = req.body || {};

    if (!policy_id) throw httpError(400, "VALIDATION_ERROR", "Policy ID is required.");

    await query(
      `INSERT INTO hr_policy_acknowledgements (company_id, employee_id, policy_id, acknowledged_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE acknowledged_at = NOW()`,
      [companyId, employeeId, policy_id]
    );

    res.json({ message: "Policy acknowledged successfully." });
  } catch (err) {
    next(err);
  }
}

export async function getDocuments(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const documents = await query(
      `SELECT id, doc_name, doc_type, doc_url, created_at FROM hr_employee_documents WHERE employee_id = ? ORDER BY id DESC`,
      [employeeId]
    );

    res.json({ documents });
  } catch (err) {
    next(err);
  }
}

export async function getTraining(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const records = await query(
      `SELECT r.id, r.completion_date, r.status, r.remarks, p.title, p.description, p.start_date, p.end_date
       FROM hr_training_records r
       LEFT JOIN hr_training_programs p ON p.id = r.program_id
       WHERE r.employee_id = ?
       ORDER BY r.id DESC`,
      [employeeId]
    );

    res.json({ records });
  } catch (err) {
    next(err);
  }
}

export async function getRequests(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const requests = await query(
      `SELECT * FROM hr_employee_requests WHERE employee_id = ? ORDER BY id DESC`,
      [employeeId]
    );

    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

export async function submitRequest(req, res, next) {
  try {
    const { employeeId, companyId, branchId } = req.portalUser;
    const { request_type, subject, description, attachment_url } = req.body || {};

    if (!request_type || !subject) {
      throw httpError(400, "VALIDATION_ERROR", "Request type and subject are required.");
    }

    const result = await query(
      `INSERT INTO hr_employee_requests (company_id, branch_id, employee_id, request_type, subject, description, attachment_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [companyId, branchId, employeeId, request_type, subject, description || null, attachment_url || null]
    );

    res.status(201).json({ id: result.insertId, message: "Request submitted successfully." });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const { phone, address, emergency_contact_name, emergency_contact_phone, picture_url } = req.body || {};

    await query(
      `UPDATE hr_employees 
       SET phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           emergency_contact_name = COALESCE(?, emergency_contact_name),
           emergency_contact_phone = COALESCE(?, emergency_contact_phone),
           picture_url = COALESCE(?, picture_url)
       WHERE id = ?`,
      [phone, address, emergency_contact_name, emergency_contact_phone, picture_url, employeeId]
    );

    res.json({ message: "Profile updated successfully." });
  } catch (err) {
    next(err);
  }
}

export async function getNotificationPreferences(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const [prefs] = await query(
      `SELECT * FROM hr_notification_preferences WHERE employee_id = ? LIMIT 1`,
      [employeeId]
    );

    res.json({
      preferences: prefs || {
        email_leave_updates: 1,
        email_payroll_updates: 1,
        email_announcements: 1,
        email_event_reminders: 1,
        push_attendance_alerts: 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateNotificationPreferences(req, res, next) {
  try {
    const { employeeId } = req.portalUser;
    const { email_leave_updates, email_payroll_updates, email_announcements, email_event_reminders, push_attendance_alerts } = req.body || {};

    await query(
      `INSERT INTO hr_notification_preferences (employee_id, email_leave_updates, email_payroll_updates, email_announcements, email_event_reminders, push_attendance_alerts)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         email_leave_updates = VALUES(email_leave_updates),
         email_payroll_updates = VALUES(email_payroll_updates),
         email_announcements = VALUES(email_announcements),
         email_event_reminders = VALUES(email_event_reminders),
         push_attendance_alerts = VALUES(push_attendance_alerts)`,
      [employeeId, email_leave_updates ? 1 : 0, email_payroll_updates ? 1 : 0, email_announcements ? 1 : 0, email_event_reminders ? 1 : 0, push_attendance_alerts ? 1 : 0]
    );

    res.json({ message: "Preferences updated." });
  } catch (err) {
    next(err);
  }
}

let weatherCache = { data: null, timestamp: 0 };
export async function getWeather(req, res, next) {
  try {
    const now = Date.now();
    if (weatherCache.data && (now - weatherCache.timestamp < 15 * 60 * 1000)) {
      return res.json(weatherCache.data);
    }

    const lat = req.query.lat || "5.6037";
    const lon = req.query.lon || "-0.1870";
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`);
    
    if (!response.ok) {
      throw new Error("Weather service unreachable");
    }

    const data = await response.json();
    const weatherResult = {
      location: "Accra, HQ",
      temperature: Math.round(data.current?.temperature_2m || 28),
      humidity: data.current?.relative_humidity_2m || 75,
      windSpeed: Math.round(data.current?.wind_speed_10m || 12),
      condition: "Partly Cloudy",
      high: Math.round(data.daily?.temperature_2m_max?.[0] || 31),
      low: Math.round(data.daily?.temperature_2m_min?.[0] || 24),
    };

    weatherCache = { data: weatherResult, timestamp: now };
    res.json(weatherResult);
  } catch (err) {
    res.json({
      location: "Accra, HQ",
      temperature: 28,
      humidity: 70,
      windSpeed: 10,
      condition: "Sunny",
      high: 31,
      low: 24,
    });
  }
}

let newsCache = { data: null, timestamp: 0 };
export async function getNews(req, res, next) {
  try {
    const now = Date.now();
    if (newsCache.data && (now - newsCache.timestamp < 30 * 60 * 1000)) {
      return res.json({ articles: newsCache.data });
    }

    const articles = [
      {
        id: "1",
        headline: "OmniSuite Enterprise ERP 2.0 Released with Mobile ESS",
        source: "OmniSuite HR",
        date: new Date().toISOString().split("T")[0],
        snippet: "The new Employee Self-Service Portal brings mobile clock-in, live leave tracking, and digital payslips.",
        category: "Company News",
      },
      {
        id: "2",
        headline: "Quarterly Town Hall & Staff Wellness Initiative",
        source: "People & Culture",
        date: new Date(Date.now() - 24*3600*1000).toISOString().split("T")[0],
        snippet: "Join management this Friday for the quarterly town hall review and wellness program kickoff.",
        category: "Event",
      },
      {
        id: "3",
        headline: "Annual Performance Appraisal Review Cycle Opening",
        source: "HR Operations",
        date: new Date(Date.now() - 48*3600*1000).toISOString().split("T")[0],
        snippet: "Review periods are scheduled to commence next month. Ensure all KPI records are updated.",
        category: "Announcement",
      }
    ];

    newsCache = { data: articles, timestamp: now };
    res.json({ articles });
  } catch (err) {
    res.json({ articles: [] });
  }
}