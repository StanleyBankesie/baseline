import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";
import { pool } from "../db/pool.js";
import { recordMovementTx } from "../services/stock.service.js";

function toNumber(v, fallback = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function ensurePMTemporalWarehousesTable() {
  await query(`CREATE TABLE IF NOT EXISTS pm_temporal_warehouses (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    company_id BIGINT UNSIGNED NOT NULL,
    warehouse_name VARCHAR(150) NOT NULL,
    warehouse_code VARCHAR(50) NOT NULL,
    description TEXT NULL,
    location VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pm_temporal_warehouse_code (company_id, warehouse_code),
    KEY idx_pm_temporal_warehouse_scope (company_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await query(
    "ALTER TABLE pm_temporal_warehouses ADD COLUMN IF NOT EXISTS is_default TINYINT(1) NOT NULL DEFAULT 0",
  ).catch(() => {});
  await query(
    "ALTER TABLE pm_temporal_warehouses ADD COLUMN IF NOT EXISTS description TEXT NULL",
  ).catch(() => {});
  // Older PM setup stored an Inventory mapping here. Keep the legacy column nullable for upgrade compatibility;
  // new PM warehouse records use their own ID, matching Production's warehouse model.
  await query(
    "ALTER TABLE pm_temporal_warehouses MODIFY COLUMN inventory_warehouse_id BIGINT UNSIGNED NULL",
  ).catch(() => {});
}

async function ensureProjectTables(companyId, branchId) {
  if (process.env.SKIP_DYNAMIC_SCHEMA_SYNC === "true") return;
  await query(`CREATE TABLE IF NOT EXISTS pm_equipments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL, branch_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    maint_equipment_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS pm_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL, branch_id INT NOT NULL,
    project_id INT NULL,
    task_id INT NULL,
    resource_type VARCHAR(50) DEFAULT 'EQUIPMENT', 
    pm_equipment_id INT NULL, 
    hr_employee_id INT NULL,
    resource_name VARCHAR(200) NOT NULL,
    allocated_qty DECIMAL(10,2) DEFAULT 1,
    status VARCHAR(50) DEFAULT 'ALLOCATED', 
    accountable_user_id INT,
    accountable_user_name VARCHAR(200),
    start_date DATE,
    end_date DATE,
    remarks TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`ALTER TABLE pm_resources MODIFY project_id INT NULL`).catch(
    () => {},
  );
  await query(
    `ALTER TABLE pm_resources ADD COLUMN IF NOT EXISTS is_active TINYINT(1) DEFAULT 1`,
  ).catch(() => {});

  await query(`CREATE TABLE IF NOT EXISTS pm_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL, branch_id INT NOT NULL,
    project_code VARCHAR(50) NOT NULL, project_name VARCHAR(200) NOT NULL,
    client_name VARCHAR(200), manager_id INT, manager_name VARCHAR(200),
    budget DECIMAL(18,4) DEFAULT 0, project_priority VARCHAR(50) DEFAULT 'MEDIUM',
    project_status VARCHAR(50) DEFAULT 'PLANNING',
    start_date DATE, end_date DATE,
    actual_start_date DATE, actual_end_date DATE,
    completion_percent DECIMAL(5,2) DEFAULT 0,
    remarks TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS pm_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL, branch_id INT NOT NULL,
    project_id INT NOT NULL, phase_id INT NULL,
    task_title VARCHAR(200) NOT NULL, task_description TEXT,
    assigned_to_id INT, assigned_to_name VARCHAR(200),
    priority VARCHAR(50) DEFAULT 'MEDIUM', status VARCHAR(50) DEFAULT 'PENDING',
    start_date DATE, end_date DATE,
    estimated_hours DECIMAL(10,2) DEFAULT 0, actual_hours DECIMAL(10,2) DEFAULT 0,
    reason_for_delay TEXT,
    completion_percent DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Add columns if missing on existing tables
  try {
    await query(
      `ALTER TABLE pm_tasks ADD COLUMN reason_for_delay TEXT AFTER actual_hours`,
    );
  } catch (e) {}
  try {
    await query(
      `ALTER TABLE pm_tasks ADD COLUMN completion_percent DECIMAL(5,2) DEFAULT 0 AFTER reason_for_delay`,
    );
  } catch (e) {}
  try {
    await query(
      `ALTER TABLE pm_tasks ADD COLUMN is_active VARCHAR(10) DEFAULT 'Y' AFTER completion_percent`,
    );
  } catch (e) {}
  try {
    await query(
      `ALTER TABLE pm_tasks ADD COLUMN due_status VARCHAR(50) DEFAULT NULL AFTER is_active`,
    );
  } catch (e) {}

  await query(`CREATE TABLE IF NOT EXISTS pm_timesheets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL, branch_id INT NOT NULL,
    project_id INT NOT NULL, task_id INT NOT NULL,
    user_id INT NOT NULL, user_name VARCHAR(200),
    log_date DATE NOT NULL, hours DECIMAL(10,2) NOT NULL,
    description TEXT, status VARCHAR(50) DEFAULT 'APPROVED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS pm_expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL, branch_id INT NOT NULL,
    project_id INT NOT NULL, expense_date DATE NOT NULL,
    category VARCHAR(100), amount DECIMAL(18,4) NOT NULL,
    currency VARCHAR(10) DEFAULT 'GHS',
    description TEXT, recorded_by VARCHAR(200),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS pm_milestones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL, branch_id INT NOT NULL,
    project_id INT NOT NULL, title VARCHAR(200) NOT NULL,
    due_date DATE, completion_date DATE,
    status VARCHAR(50) DEFAULT 'PENDING',
    remarks TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  try {
    await query(
      `ALTER TABLE pm_projects ADD COLUMN is_active ENUM('Y','N') DEFAULT 'Y' AFTER remarks`,
    );
  } catch (e) {}
  try {
    await query(
      `ALTER TABLE pm_projects ADD COLUMN attachments LONGTEXT NULL AFTER remarks`,
    );
  } catch (e) {}
  try {
    await query(
      `ALTER TABLE pm_projects ADD COLUMN currency VARCHAR(10) DEFAULT 'GHS' AFTER budget`,
    );
  } catch (e) {}
  try {
    await query(
      `ALTER TABLE pm_projects ADD COLUMN contract_currency VARCHAR(10) NULL AFTER currency`,
    );
  } catch (e) {}
  try {
    await query(
      `ALTER TABLE pm_tasks ADD COLUMN duration_unit VARCHAR(20) DEFAULT 'DAYS' AFTER estimated_hours`,
    );
  } catch (e) {}
  try {
    await query(`ALTER TABLE pm_tasks ADD COLUMN wbs_code VARCHAR(50) NULL`);
  } catch (e) {}
  try {
    await query(`ALTER TABLE pm_tasks ADD COLUMN scope_name VARCHAR(255) NULL`);
  } catch (e) {}
  try {
    await query(`ALTER TABLE pm_tasks ADD COLUMN scope_id INT NULL`);
  } catch (e) {}
  try {
    await query(
      `ALTER TABLE pm_projects ADD COLUMN project_scopes LONGTEXT NULL AFTER remarks`,
    );
  } catch (e) {}
  try {
    await query(`CREATE TABLE IF NOT EXISTS pm_project_scopes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL, branch_id INT NOT NULL,
      project_id INT NOT NULL,
      scope_name VARCHAR(255) NOT NULL,
      scope_description TEXT,
      wbs_code VARCHAR(100),
      start_date DATE, due_date DATE,
      priority VARCHAR(50) DEFAULT 'MEDIUM',
      status VARCHAR(50) DEFAULT 'PENDING',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (e) {}
  try {
    await query(
      `ALTER TABLE pm_projects ADD COLUMN contract_file_url VARCHAR(500) NULL AFTER contract_ref_no`,
    );
  } catch (e) {}
  try {
    await query(
      `ALTER TABLE pm_projects ADD COLUMN team_members LONGTEXT NULL AFTER remarks`,
    );
  } catch (e) {}
  try {
    await query(
      `ALTER TABLE pm_projects ADD COLUMN team_lead_ids LONGTEXT NULL AFTER team_members`,
    );
  } catch (e) {}
  try {
    await query(`CREATE TABLE IF NOT EXISTS pm_project_team_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      branch_id INT NOT NULL,
      project_id INT NOT NULL,
      user_id INT NOT NULL,
      is_lead TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_proj_user (project_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (e) {}

  await query(`CREATE TABLE IF NOT EXISTS pm_project_managers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL, branch_id INT NOT NULL,
    user_id INT NOT NULL,
    is_active ENUM('Y','N') DEFAULT 'Y',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pm (company_id, branch_id, user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  try {
    const existing = await query(`SELECT id FROM pm_projects LIMIT 1`);
    if (!existing || !existing.length) {
      await query(
        `INSERT INTO pm_projects (company_id, branch_id, project_code, project_name, project_status, is_active)
         VALUES (:companyId, :branchId, 'PRJ-001', 'General Infrastructure Project', 'IN_PROGRESS', 'Y')`,
        { companyId: companyId || 1, branchId: branchId || 1 },
      );
    }
  } catch (e) {}
}

export const listProjects = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
    await ensureProjectTables(companyId, branchId);
    const isAll =
      req.query.active === "all" ||
      req.query.all === "1" ||
      req.query.all === "true" ||
      req.query.status === "ALL";
    const activeFilter = isAll
      ? ""
      : " AND (p.is_active IS NULL OR p.is_active = 'Y' OR p.is_active = '1' OR p.is_active = 1)";
    const items = await query(
      `SELECT p.*,
          u.username AS created_by_name,
          COALESCE(e.expense_total,0) AS expense_total
         FROM pm_projects p
        LEFT JOIN adm_users u ON u.id = p.created_by
        LEFT JOIN (SELECT project_id, SUM(amount) AS expense_total FROM pm_expenses GROUP BY project_id) e ON p.id = e.project_id
         WHERE (p.company_id = :companyId OR :companyId IS NULL OR p.company_id IS NULL OR p.company_id = 0)
           ${activeFilter} ORDER BY p.id DESC LIMIT 500`,
      { companyId, branchId, branchIdsStr },
    );
    items.forEach((p) => {
      if (p.team_members && typeof p.team_members === "string") {
        try {
          p.team_members = JSON.parse(p.team_members);
        } catch (e) {}
      }
      if (p.team_lead_ids && typeof p.team_lead_ids === "string") {
        try {
          p.team_lead_ids = JSON.parse(p.team_lead_ids);
        } catch (e) {}
      }
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) return next();
    await ensureProjectTables(companyId, branchId);

    const items = await query(
      `SELECT p.*,
          u.username AS created_by_name
         FROM pm_projects p
        LEFT JOIN adm_users u ON u.id = p.created_by
         WHERE p.id = :id 
           AND (:companyId IS NULL OR p.company_id = :companyId OR p.company_id = 0 OR p.company_id = 1)
           AND (:branchId IS NULL OR p.branch_id = :branchId OR p.branch_id IS NULL OR p.branch_id = 0)
         LIMIT 1`,
      { id, companyId, branchId },
    );
    if (!items.length) throw httpError(404, "NOT_FOUND", "Project not found");
    const item = items[0];
    item.currency = item.currency || "GHS";
    item.contract_currency = item.contract_currency || item.currency || "GHS";
    if (item.attachments && typeof item.attachments === "string") {
      try {
        item.attachments = JSON.parse(item.attachments);
      } catch (e) {}
    }

    if (item.project_scopes && typeof item.project_scopes === "string") {
      try {
        item.scopes = JSON.parse(item.project_scopes);
      } catch (e) {}
    } else if (Array.isArray(item.project_scopes)) {
      item.scopes = item.project_scopes;
    }

    if (item.team_members && typeof item.team_members === "string") {
      try {
        item.team_members = JSON.parse(item.team_members);
      } catch (e) {}
    }
    if (item.team_lead_ids && typeof item.team_lead_ids === "string") {
      try {
        item.team_lead_ids = JSON.parse(item.team_lead_ids);
      } catch (e) {}
    }

    // Query tasks for this project
    const projectTasks = await query(
      `SELECT t.*, u.username as assigned_to_username, u.full_name as assigned_to_fullname
       FROM pm_tasks t
       LEFT JOIN adm_users u ON u.id = t.assigned_to_id
       WHERE t.project_id = :id AND (t.is_active IS NULL OR t.is_active != 'N')
       ORDER BY t.id ASC`,
      { id },
    ).catch(() => []);

    // Also fetch pm_project_scopes
    const projectScopesFromDb = await query(
      `SELECT * FROM pm_project_scopes WHERE project_id = :id ORDER BY id ASC`,
      { id },
    ).catch(() => []);

    if (!item.scopes || !item.scopes.length) {
      if (projectScopesFromDb && projectScopesFromDb.length) {
        item.scopes = projectScopesFromDb.map((s, sIdx) => {
          const sTasks = (projectTasks || []).filter(
            (t) =>
              t.scope_id === s.id ||
              (t.scope_name &&
                t.scope_name.toLowerCase() === s.scope_name.toLowerCase()) ||
              (t.wbs_code && s.wbs_code && t.wbs_code === s.wbs_code),
          );
          const wbsMap = new Map();
          sTasks.forEach((t, ti) => {
            const wKey = (t.wbs_code || s.wbs_code || `${sIdx + 1}.1`).trim();
            if (!wbsMap.has(wKey)) {
              wbsMap.set(wKey, {
                id: Date.now() + ti,
                wbs: wKey,
                start_date: t.start_date
                  ? String(t.start_date).split("T")[0]
                  : s.start_date
                    ? String(s.start_date).split("T")[0]
                    : "",
                end_date: t.end_date
                  ? String(t.end_date).split("T")[0]
                  : s.due_date
                    ? String(s.due_date).split("T")[0]
                    : "",
                tasks: [],
              });
            }
            wbsMap.get(wKey).tasks.push(t);
          });
          const wbsList =
            wbsMap.size > 0
              ? Array.from(wbsMap.values())
              : [
                  {
                    id: s.id || Date.now() + sIdx,
                    wbs: s.wbs_code || `${sIdx + 1}.1`,
                    start_date: s.start_date
                      ? String(s.start_date).split("T")[0]
                      : "",
                    end_date: s.due_date
                      ? String(s.due_date).split("T")[0]
                      : "",
                    tasks: [],
                  },
                ];
          return {
            id: s.id,
            name: s.scope_name,
            title: s.scope_name,
            description: s.scope_description || "",
            wbs_code: s.wbs_code || "",
            wbs: s.wbs_code || "",
            start_date: s.start_date ? String(s.start_date).split("T")[0] : "",
            due_date: s.due_date ? String(s.due_date).split("T")[0] : "",
            status: s.status || "PENDING",
            priority: s.priority || "MEDIUM",
            wbs_list: wbsList,
            tasks: sTasks,
          };
        });
      } else if (projectTasks && projectTasks.length) {
        const map = new Map();
        projectTasks.forEach((t) => {
          const scopeKey = t.scope_name || "General Scope Deliverables";
          if (!map.has(scopeKey)) {
            map.set(scopeKey, {
              name: scopeKey,
              title: scopeKey,
              description: "",
              wbs_code: t.wbs_code || "1.0",
              wbs: t.wbs_code || "1.0",
              start_date: t.start_date
                ? String(t.start_date).split("T")[0]
                : "",
              due_date: t.end_date ? String(t.end_date).split("T")[0] : "",
              status: t.status || "PENDING",
              priority: t.priority || "MEDIUM",
              tasks: [],
            });
          }
          map.get(scopeKey).tasks.push(t);
        });
        item.scopes = Array.from(map.values()).map((s, sIdx) => {
          const wbsMap = new Map();
          s.tasks.forEach((t, ti) => {
            const wKey = (t.wbs_code || s.wbs_code || `${sIdx + 1}.1`).trim();
            if (!wbsMap.has(wKey)) {
              wbsMap.set(wKey, {
                id: Date.now() + ti,
                wbs: wKey,
                start_date: t.start_date
                  ? String(t.start_date).split("T")[0]
                  : s.start_date,
                end_date: t.end_date
                  ? String(t.end_date).split("T")[0]
                  : s.due_date,
                tasks: [],
              });
            }
            wbsMap.get(wKey).tasks.push(t);
          });
          return {
            ...s,
            wbs_list: Array.from(wbsMap.values()),
          };
        });
      } else {
        item.scopes = [];
      }
    } else {
      // item.scopes exists (from project_scopes JSON) - synchronize with DB tasks
      const matchedDbTaskIds = new Set();
      item.scopes = item.scopes.map((s, sIdx) => {
        const sName = (s.name || s.title || "").trim().toLowerCase();
        const matchingDbTasks = (projectTasks || []).filter(
          (t) =>
            (s.id && t.scope_id === s.id) ||
            (t.scope_name && t.scope_name.trim().toLowerCase() === sName),
        );

        let wbsList = [];
        if (Array.isArray(s.wbs_list) && s.wbs_list.length > 0) {
          wbsList = s.wbs_list.map((w, wi) => {
            const wbsCode = (
              w.wbs ||
              w.wbs_code ||
              `${sIdx + 1}.${wi + 1}`
            ).trim();
            const synchedTasks = (w.tasks || []).map((t) => {
              // Try to find matching task in DB
              const dbMatch = projectTasks.find(
                (pt) =>
                  (t.id && pt.id === t.id) ||
                  (!matchedDbTaskIds.has(pt.id) &&
                    pt.task_title &&
                    t.task_title &&
                    pt.task_title.trim().toLowerCase() ===
                      t.task_title.trim().toLowerCase()),
              );
              if (dbMatch) {
                matchedDbTaskIds.add(dbMatch.id);
                return {
                  ...t,
                  id: dbMatch.id,
                  task_title: dbMatch.task_title,
                  assigned_to_id:
                    dbMatch.assigned_to_id || t.assigned_to_id || "",
                  assigned_to_name:
                    dbMatch.assigned_to_fullname ||
                    dbMatch.assigned_to_username ||
                    dbMatch.assigned_to_name ||
                    t.assigned_to_name ||
                    "",
                  status: dbMatch.status || t.status || "PENDING",
                  estimated_hours: dbMatch.estimated_hours ?? t.estimated_hours,
                  duration_unit:
                    dbMatch.duration_unit || t.duration_unit || "Days",
                  start_date: dbMatch.start_date
                    ? String(dbMatch.start_date).split("T")[0]
                    : t.start_date || w.start_date || "",
                  end_date: dbMatch.end_date
                    ? String(dbMatch.end_date).split("T")[0]
                    : t.end_date || w.end_date || "",
                  wbs_code: wbsCode,
                  wbs: wbsCode,
                  scope_name: s.name || s.title || "",
                };
              }
              return {
                ...t,
                wbs_code: wbsCode,
                wbs: wbsCode,
                scope_name: s.name || s.title || "",
              };
            });
            return {
              ...w,
              wbs: wbsCode,
              tasks: synchedTasks,
            };
          });
        } else {
          // Construct wbs_list from matching tasks
          const wbsMap = new Map();
          const tasksToUse =
            matchingDbTasks.length > 0 ? matchingDbTasks : s.tasks || [];
          tasksToUse.forEach((t, ti) => {
            const wKey = (t.wbs_code || s.wbs_code || `${sIdx + 1}.1`).trim();
            if (!wbsMap.has(wKey)) {
              wbsMap.set(wKey, {
                id: Date.now() + ti,
                wbs: wKey,
                start_date: t.start_date
                  ? String(t.start_date).split("T")[0]
                  : s.start_date || "",
                end_date: t.end_date
                  ? String(t.end_date).split("T")[0]
                  : s.due_date || s.end_date || "",
                tasks: [],
              });
            }
            wbsMap.get(wKey).tasks.push(t);
          });
          wbsList =
            wbsMap.size > 0
              ? Array.from(wbsMap.values())
              : [
                  {
                    id: s.id || Date.now() + sIdx,
                    wbs: s.wbs_code || `${sIdx + 1}.1`,
                    start_date: s.start_date || "",
                    end_date: s.due_date || s.end_date || "",
                    tasks: [],
                  },
                ];
        }

        const allTasks = wbsList.flatMap((w) => w.tasks);
        return {
          ...s,
          name: s.name || s.title || `Scope ${sIdx + 1}`,
          title: s.name || s.title || `Scope ${sIdx + 1}`,
          wbs_list: wbsList,
          tasks: allTasks,
        };
      });
    }

    item.milestones = (item.scopes || []).map((s) => ({
      title: s.name || s.title || "",
      due_date: s.due_date || "",
      status: s.status || "PENDING",
      remarks: s.description || s.remarks || "",
    }));

    res.json({ item });
  } catch (err) {
    next(err);
  }
};

export async function generateProjectCode(projectName, startDate, companyId) {
  let prefix = "PRJ";
  if (projectName && projectName.trim()) {
    const words = projectName.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 3) {
      prefix = (words[0][0] + words[1][0] + words[2][0])
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
    } else if (words.length === 2) {
      prefix = (words[0][0] + words[1][0])
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
    } else if (words.length === 1) {
      prefix = words[0]
        .slice(0, 3)
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
    }
  }
  if (!prefix) prefix = "PRJ";

  const d = startDate ? new Date(startDate) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const month = String(validDate.getMonth() + 1).padStart(2, "0");
  const year = String(validDate.getFullYear());

  const basePattern = `${prefix}/${month}/${year}/`;
  const existing = await query(
    `SELECT project_code FROM pm_projects 
     WHERE (company_id = :companyId OR :companyId IS NULL) 
       AND project_code LIKE :pattern`,
    { companyId: companyId || null, pattern: `${basePattern}%` },
  );

  let maxNum = 0;
  if (existing && existing.length > 0) {
    for (const row of existing) {
      const parts = String(row.project_code || "").split("/");
      const last = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(last) && last > maxNum) {
        maxNum = last;
      }
    }
  }
  const nextSeq = String(maxNum + 1).padStart(3, "0");
  return `${basePattern}${nextSeq}`;
}

export const getGeneratedProjectCode = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const code = await generateProjectCode(
      req.query.name,
      req.query.start_date,
      companyId,
    );
    res.json({ code });
  } catch (err) {
    next(err);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    await ensureProjectTables(companyId, branchId);
    const b = req.body || {};
    const attachmentsVal = Array.isArray(b.attachments)
      ? JSON.stringify(b.attachments)
      : b.attachments || null;
    const contractFileUrl =
      b.contract_file_url ||
      (Array.isArray(b.attachments) && b.attachments.length > 0
        ? b.attachments[0].url
        : null);

    if (!b.project_name || !String(b.project_name).trim())
      throw httpError(400, "VALIDATION_ERROR", "Project Title is required");

    let finalProjectCode = (b.project_code || "").trim();
    if (!finalProjectCode) {
      finalProjectCode = await generateProjectCode(
        b.project_name,
        b.start_date,
        companyId,
      );
    }

    const result = await query(
      `INSERT INTO pm_projects 
      (company_id, branch_id, project_code, project_name, project_type, client_id, client_name, contract_ref_no, contract_file_url, contract_sum, revised_contract_sum, site_address, site_city, site_gps_lat, site_gps_lng, manager_id, manager_name, site_engineer_id, site_engineer_name, qs_id, qs_name, supervisor_id, supervisor_name, commercial_manager_id, commercial_manager_name, retention_percent, retention_cap, advance_payment_amount, advance_recovery_percent, defects_liability_months, practical_completion_date, final_completion_date, wbs_code, budget, currency, contract_currency, project_priority, project_status, start_date, end_date, remarks, attachments, is_active)
      VALUES (:companyId, :branchId, :project_code, :project_name, :project_type, :client_id, :client_name, :contract_ref_no, :contract_file_url, :contract_sum, :revised_contract_sum, :site_address, :site_city, :site_gps_lat, :site_gps_lng, :manager_id, :manager_name, :site_engineer_id, :site_engineer_name, :qs_id, :qs_name, :supervisor_id, :supervisor_name, :commercial_manager_id, :commercial_manager_name, :retention_percent, :retention_cap, :advance_payment_amount, :advance_recovery_percent, :defects_liability_months, :practical_completion_date, :final_completion_date, :wbs_code, :budget, :currency, :contract_currency, :project_priority, :project_status, :start_date, :end_date, :remarks, :attachments, :is_active)`,
      {
        companyId,
        branchId,
        project_code: finalProjectCode,
        project_name: b.project_name,
        project_type: b.project_type || "GENERAL_CONSTRUCTION",
        client_id: toNumber(b.client_id),
        client_name: b.client_name || null,
        contract_ref_no: b.contract_ref_no || null,
        contract_file_url: contractFileUrl,
        contract_sum: Number(b.contract_sum || b.budget || 0),
        revised_contract_sum: Number(
          b.revised_contract_sum || b.contract_sum || b.budget || 0,
        ),
        site_address: b.site_address || null,
        site_city: b.site_city || null,
        site_gps_lat: b.site_gps_lat ? Number(b.site_gps_lat) : null,
        site_gps_lng: b.site_gps_lng ? Number(b.site_gps_lng) : null,
        manager_id: toNumber(b.manager_id),
        manager_name: b.manager_name || null,
        site_engineer_id: toNumber(b.site_engineer_id),
        site_engineer_name: b.site_engineer_name || null,
        qs_id: toNumber(b.qs_id),
        qs_name: b.qs_name || null,
        supervisor_id: toNumber(b.supervisor_id),
        supervisor_name: b.supervisor_name || null,
        commercial_manager_id: toNumber(b.commercial_manager_id),
        commercial_manager_name: b.commercial_manager_name || null,
        retention_percent: Number(b.retention_percent || 5.0),
        retention_cap: Number(b.retention_cap || 0),
        advance_payment_amount: Number(b.advance_payment_amount || 0),
        advance_recovery_percent: Number(b.advance_recovery_percent || 10.0),
        defects_liability_months: Number(b.defects_liability_months || 12),
        practical_completion_date: b.practical_completion_date || null,
        final_completion_date: b.final_completion_date || null,
        wbs_code: b.wbs_code || null,
        budget: Number(b.budget || 0),
        currency: b.currency || "GHS",
        contract_currency: b.contract_currency || b.currency || "GHS",
        contract_currency: b.contract_currency || b.currency || "GHS",
        project_priority: b.project_priority || "MEDIUM",
        project_status: b.project_status || "IN_PROGRESS",
        start_date: b.start_date || null,
        end_date: b.end_date || null,
        remarks: b.remarks || null,
        attachments: attachmentsVal,
        is_active:
          b.is_active !== undefined
            ? b.is_active === "N" || b.is_active === false || b.is_active === 0
              ? "N"
              : "Y"
            : "Y",
      },
    );

    const projectId = result.insertId;
    const incomingScopes = Array.isArray(b.scopes)
      ? b.scopes
      : Array.isArray(b.milestones)
        ? b.milestones
        : [];
    if (incomingScopes.length > 0) {
      for (let sIdx = 0; sIdx < incomingScopes.length; sIdx++) {
        const s = incomingScopes[sIdx];
        const scopeName = (s.name || s.title || "").trim();
        if (!scopeName) continue;
        const wbsCode = s.wbs_code || s.wbs || `${sIdx + 1}.0`;
        const scopeDesc = s.description || s.remarks || null;

        const scopeRes = await query(
          `INSERT INTO pm_project_scopes (company_id, branch_id, project_id, scope_name, scope_description, wbs_code, start_date, due_date, priority, status)
           VALUES (:companyId, :branchId, :projectId, :scopeName, :scopeDesc, :wbsCode, :startDate, :dueDate, :priority, :status)`,
          {
            companyId: companyId || 1,
            branchId: branchId || 1,
            projectId,
            scopeName,
            scopeDesc,
            wbsCode,
            startDate: s.start_date || b.start_date || null,
            dueDate: s.due_date || s.end_date || b.end_date || null,
            priority: s.priority || "MEDIUM",
            status: s.status || "PENDING",
          },
        ).catch(() => null);

        const scopeId = scopeRes?.insertId || null;
        s.id = scopeId;

        // Sync legacy milestone
        await query(
          `INSERT INTO pm_milestones (company_id, branch_id, project_id, title, due_date, status, remarks)
           VALUES (:companyId, :branchId, :projectId, :title, :due_date, :status, :remarks)`,
          {
            companyId: companyId || 1,
            branchId: branchId || 1,
            projectId,
            title: scopeName,
            due_date: s.due_date || null,
            status: s.status || "PENDING",
            remarks: scopeDesc,
          },
        ).catch(() => {});

        // Save tasks under this scope (support nested wbs_list and fallback to s.tasks)
        if (Array.isArray(s.wbs_list) && s.wbs_list.length > 0) {
          for (let wi = 0; wi < s.wbs_list.length; wi++) {
            const w = s.wbs_list[wi];
            const currentWbsCode = (
              w.wbs ||
              w.wbs_code ||
              `${sIdx + 1}.${wi + 1}`
            ).trim();
            const wbsStart =
              w.start_date || s.start_date || b.start_date || null;
            const wbsEnd =
              w.end_date || w.due_date || s.due_date || b.end_date || null;

            if (Array.isArray(w.tasks)) {
              for (let ti = 0; ti < w.tasks.length; ti++) {
                const t = w.tasks[ti];
                const taskTitle = (t.task_title || t.title || "").trim();
                if (!taskTitle) continue;

                const insRes = await query(
                  `INSERT INTO pm_tasks (company_id, branch_id, project_id, scope_id, scope_name, wbs_code, task_title, task_description, assigned_to_id, assigned_to_name, priority, status, start_date, end_date, estimated_hours, duration_unit, is_active)
                   VALUES (:companyId, :branchId, :projectId, :scopeId, :scopeName, :wbsCode, :taskTitle, :taskDesc, :assignedToId, :assignedToName, :priority, :status, :startDate, :endDate, :estimatedHours, :durationUnit, 'Y')`,
                  {
                    companyId: companyId || 1,
                    branchId: branchId || 1,
                    projectId,
                    scopeId,
                    scopeName,
                    wbsCode: currentWbsCode,
                    taskTitle,
                    taskDesc: t.task_description || t.description || null,
                    assignedToId: t.assigned_to_id
                      ? toNumber(t.assigned_to_id)
                      : null,
                    assignedToName: t.assigned_to_name || null,
                    priority: t.priority || s.priority || "MEDIUM",
                    status:
                      t.status ||
                      (t.assigned_to_id ? "IN_PROGRESS" : "PENDING"),
                    startDate: t.start_date || wbsStart,
                    endDate: t.end_date || t.due_date || wbsEnd,
                    estimatedHours: Number(t.estimated_hours || 0),
                    durationUnit: t.duration_unit || "Days",
                  },
                ).catch(() => null);
                if (insRes?.insertId) {
                  t.id = insRes.insertId;
                }
              }
            }
          }
          s.tasks = s.wbs_list.flatMap((w) => w.tasks || []);
        } else if (Array.isArray(s.tasks) && s.tasks.length > 0) {
          for (let ti = 0; ti < s.tasks.length; ti++) {
            const t = s.tasks[ti];
            const taskTitle = (t.task_title || t.title || "").trim();
            if (!taskTitle) continue;
            const currentWbsCode = t.wbs_code || wbsCode;
            const insRes = await query(
              `INSERT INTO pm_tasks (company_id, branch_id, project_id, scope_id, scope_name, wbs_code, task_title, task_description, assigned_to_id, assigned_to_name, priority, status, start_date, end_date, estimated_hours, duration_unit, is_active)
               VALUES (:companyId, :branchId, :projectId, :scopeId, :scopeName, :wbsCode, :taskTitle, :taskDesc, :assignedToId, :assignedToName, :priority, :status, :startDate, :endDate, :estimatedHours, :durationUnit, 'Y')`,
              {
                companyId: companyId || 1,
                branchId: branchId || 1,
                projectId,
                scopeId,
                scopeName,
                wbsCode: currentWbsCode,
                taskTitle,
                taskDesc: t.task_description || t.description || null,
                assignedToId: t.assigned_to_id
                  ? toNumber(t.assigned_to_id)
                  : null,
                assignedToName: t.assigned_to_name || null,
                priority: t.priority || s.priority || "MEDIUM",
                status:
                  t.status || (t.assigned_to_id ? "IN_PROGRESS" : "PENDING"),
                startDate: t.start_date || s.start_date || b.start_date || null,
                endDate:
                  t.end_date || t.due_date || s.due_date || b.end_date || null,
                estimatedHours: Number(t.estimated_hours || 0),
                durationUnit: t.duration_unit || "Days",
              },
            ).catch(() => null);
            if (insRes?.insertId) {
              t.id = insRes.insertId;
            }
          }
        }
      }

      const serializedScopes = JSON.stringify(incomingScopes);
      await query(
        `UPDATE pm_projects SET project_scopes = :scopes WHERE id = :id`,
        { scopes: serializedScopes, id: projectId },
      ).catch(() => {});
    }

    res.status(201).json({ id: projectId });
  } catch (err) {
    next(err);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) return next();
    const b = req.body || {};
    await ensureProjectTables(companyId, branchId);
    const attachmentsVal = Array.isArray(b.attachments)
      ? JSON.stringify(b.attachments)
      : b.attachments || null;
    const contractFileUrl =
      b.contract_file_url ||
      (Array.isArray(b.attachments) && b.attachments.length > 0
        ? b.attachments[0].url
        : null);

    const incomingScopes = Array.isArray(b.scopes)
      ? b.scopes
      : Array.isArray(b.milestones)
        ? b.milestones
        : null;
    const serializedScopes = incomingScopes
      ? JSON.stringify(incomingScopes)
      : b.project_scopes
        ? JSON.stringify(b.project_scopes)
        : null;

    await query(
      `UPDATE pm_projects SET
      project_name = :project_name, project_type = :project_type, client_id = :client_id, client_name = :client_name,
      contract_ref_no = :contract_ref_no, contract_file_url = :contract_file_url, contract_sum = :contract_sum, revised_contract_sum = :revised_contract_sum,
      site_address = :site_address, site_city = :site_city, site_gps_lat = :site_gps_lat, site_gps_lng = :site_gps_lng,
      manager_id = :manager_id, manager_name = :manager_name,
      site_engineer_id = :site_engineer_id, site_engineer_name = :site_engineer_name,
      qs_id = :qs_id, qs_name = :qs_name, supervisor_id = :supervisor_id, supervisor_name = :supervisor_name,
      commercial_manager_id = :commercial_manager_id, commercial_manager_name = :commercial_manager_name,
      retention_percent = :retention_percent, retention_cap = :retention_cap,
      advance_payment_amount = :advance_payment_amount, advance_recovery_percent = :advance_recovery_percent,
      defects_liability_months = :defects_liability_months, practical_completion_date = :practical_completion_date,
      final_completion_date = :final_completion_date, wbs_code = :wbs_code,
      budget = :budget, currency = :currency, contract_currency = :contract_currency, project_priority = :project_priority,
      project_status = :project_status, start_date = :start_date, end_date = :end_date,
      actual_start_date = :actual_start_date, actual_end_date = :actual_end_date,
      completion_percent = :completion_percent, remarks = :remarks, attachments = :attachments,
      project_scopes = COALESCE(:project_scopes, project_scopes),
      is_active = :is_active
      WHERE id = :id AND (:companyId IS NULL OR company_id = :companyId OR company_id = 1)`,
      {
        id,
        companyId,
        project_name: b.project_name,
        project_type: b.project_type || "GENERAL_CONSTRUCTION",
        client_id: toNumber(b.client_id),
        client_name: b.client_name || null,
        contract_ref_no: b.contract_ref_no || null,
        contract_file_url: contractFileUrl,
        contract_sum: Number(b.contract_sum || b.budget || 0),
        revised_contract_sum: Number(
          b.revised_contract_sum || b.contract_sum || b.budget || 0,
        ),
        site_address: b.site_address || null,
        site_city: b.site_city || null,
        site_gps_lat: b.site_gps_lat ? Number(b.site_gps_lat) : null,
        site_gps_lng: b.site_gps_lng ? Number(b.site_gps_lng) : null,
        manager_id: toNumber(b.manager_id),
        manager_name: b.manager_name || null,
        site_engineer_id: toNumber(b.site_engineer_id),
        site_engineer_name: b.site_engineer_name || null,
        qs_id: toNumber(b.qs_id),
        qs_name: b.qs_name || null,
        supervisor_id: toNumber(b.supervisor_id),
        supervisor_name: b.supervisor_name || null,
        commercial_manager_id: toNumber(b.commercial_manager_id),
        commercial_manager_name: b.commercial_manager_name || null,
        retention_percent: Number(b.retention_percent || 5.0),
        retention_cap: Number(b.retention_cap || 0),
        advance_payment_amount: Number(b.advance_payment_amount || 0),
        advance_recovery_percent: Number(b.advance_recovery_percent || 10.0),
        defects_liability_months: Number(b.defects_liability_months || 12),
        practical_completion_date: b.practical_completion_date || null,
        final_completion_date: b.final_completion_date || null,
        wbs_code: b.wbs_code || null,
        budget: Number(b.budget || 0),
        currency: b.currency || "GHS",
        contract_currency: b.contract_currency || b.currency || "GHS",
        project_priority: b.project_priority || "MEDIUM",
        project_status: b.project_status || "PLANNING",
        start_date: b.start_date || null,
        end_date: b.end_date || null,
        actual_start_date: b.actual_start_date || null,
        actual_end_date: b.actual_end_date || null,
        completion_percent: Number(b.completion_percent || 0),
        remarks: b.remarks || null,
        attachments: attachmentsVal,
        project_scopes: serializedScopes,
        is_active: b.is_active !== undefined ? (b.is_active ? "Y" : "N") : "Y",
      },
    );

    if (incomingScopes && incomingScopes.length > 0) {
      await query(`DELETE FROM pm_project_scopes WHERE project_id = :id`, {
        id,
      }).catch(() => {});
      await query(`DELETE FROM pm_milestones WHERE project_id = :id`, {
        id,
      }).catch(() => {});

      const activeTaskIds = [];

      for (let sIdx = 0; sIdx < incomingScopes.length; sIdx++) {
        const s = incomingScopes[sIdx];
        const scopeName = (s.name || s.title || "").trim();
        if (!scopeName) continue;
        const wbsCode = s.wbs_code || s.wbs || `${sIdx + 1}.0`;
        const scopeDesc = s.description || s.remarks || null;

        const scopeRes = await query(
          `INSERT INTO pm_project_scopes (company_id, branch_id, project_id, scope_name, scope_description, wbs_code, start_date, due_date, priority, status)
           VALUES (:companyId, :branchId, :id, :scopeName, :scopeDesc, :wbsCode, :startDate, :dueDate, :priority, :status)`,
          {
            companyId: companyId || 1,
            branchId: branchId || 1,
            id,
            scopeName,
            scopeDesc,
            wbsCode,
            startDate: s.start_date || b.start_date || null,
            dueDate: s.due_date || s.end_date || b.end_date || null,
            priority: s.priority || "MEDIUM",
            status: s.status || "PENDING",
          },
        ).catch(() => null);

        const scopeId = scopeRes?.insertId || null;
        s.id = scopeId;

        // Sync legacy milestone
        await query(
          `INSERT INTO pm_milestones (company_id, branch_id, project_id, title, due_date, status, remarks)
           VALUES (:companyId, :branchId, :id, :title, :due_date, :status, :remarks)`,
          {
            companyId: companyId || 1,
            branchId: branchId || 1,
            id,
            title: scopeName,
            due_date: s.due_date || s.end_date || null,
            status: s.status || "PENDING",
            remarks: scopeDesc,
          },
        ).catch(() => {});

        // Process WBS elements and tasks
        if (Array.isArray(s.wbs_list) && s.wbs_list.length > 0) {
          for (let wi = 0; wi < s.wbs_list.length; wi++) {
            const w = s.wbs_list[wi];
            const currentWbsCode = (
              w.wbs ||
              w.wbs_code ||
              `${sIdx + 1}.${wi + 1}`
            ).trim();
            const wbsStart =
              w.start_date || s.start_date || b.start_date || null;
            const wbsEnd =
              w.end_date ||
              w.due_date ||
              s.due_date ||
              s.end_date ||
              b.end_date ||
              null;

            if (Array.isArray(w.tasks)) {
              for (let ti = 0; ti < w.tasks.length; ti++) {
                const t = w.tasks[ti];
                const taskTitle = (t.task_title || t.title || "").trim();
                if (!taskTitle) continue;

                const taskStart = t.start_date || wbsStart;
                const taskEnd = t.end_date || t.due_date || wbsEnd;
                const taskPriority = t.priority || s.priority || "MEDIUM";
                const taskStatus =
                  t.status || (t.assigned_to_id ? "IN_PROGRESS" : "PENDING");
                const estHours = Number(t.estimated_hours || 0);

                if (t.id && toNumber(t.id)) {
                  await query(
                    `UPDATE pm_tasks SET
                       task_title = :taskTitle,
                       wbs_code = :taskWbs,
                       scope_id = :scopeId,
                       scope_name = :scopeName,
                       assigned_to_id = :assignedToId,
                       assigned_to_name = :assignedToName,
                       priority = :priority,
                       status = :status,
                       start_date = :startDate,
                       end_date = :endDate,
                       estimated_hours = :estimatedHours,
                       duration_unit = :durationUnit,
                       is_active = 'Y'
                     WHERE id = :taskId AND project_id = :id`,
                    {
                      taskId: toNumber(t.id),
                      id,
                      taskTitle,
                      taskWbs: currentWbsCode,
                      scopeId,
                      scopeName,
                      assignedToId: t.assigned_to_id
                        ? toNumber(t.assigned_to_id)
                        : null,
                      assignedToName: t.assigned_to_name || null,
                      priority: taskPriority,
                      status: taskStatus,
                      startDate: taskStart,
                      endDate: taskEnd,
                      estimatedHours: estHours,
                      durationUnit: t.duration_unit || "Days",
                    },
                  ).catch(() => {});
                  activeTaskIds.push(toNumber(t.id));
                } else {
                  const insRes = await query(
                    `INSERT INTO pm_tasks (company_id, branch_id, project_id, scope_id, scope_name, wbs_code, task_title, task_description, assigned_to_id, assigned_to_name, priority, status, start_date, end_date, estimated_hours, duration_unit, is_active)
                     VALUES (:companyId, :branchId, :id, :scopeId, :scopeName, :wbsCode, :taskTitle, :taskDesc, :assignedToId, :assignedToName, :priority, :status, :startDate, :endDate, :estimatedHours, :durationUnit, 'Y')`,
                    {
                      companyId: companyId || 1,
                      branchId: branchId || 1,
                      id,
                      scopeId,
                      scopeName,
                      wbsCode: currentWbsCode,
                      taskTitle,
                      taskDesc: t.task_description || t.description || null,
                      assignedToId: t.assigned_to_id
                        ? toNumber(t.assigned_to_id)
                        : null,
                      assignedToName: t.assigned_to_name || null,
                      priority: taskPriority,
                      status: taskStatus,
                      startDate: taskStart,
                      endDate: taskEnd,
                      estimatedHours: estHours,
                      durationUnit: t.duration_unit || "Days",
                    },
                  ).catch(() => null);
                  if (insRes?.insertId) {
                    t.id = insRes.insertId;
                    activeTaskIds.push(insRes.insertId);
                  }
                }
              }
            }
          }
          s.tasks = s.wbs_list.flatMap((w) => w.tasks || []);
        } else if (Array.isArray(s.tasks) && s.tasks.length > 0) {
          for (let ti = 0; ti < s.tasks.length; ti++) {
            const t = s.tasks[ti];
            const taskTitle = (t.task_title || t.title || "").trim();
            if (!taskTitle) continue;
            const currentWbsCode = t.wbs_code || wbsCode;
            const taskStart =
              t.start_date || s.start_date || b.start_date || null;
            const taskEnd =
              t.end_date ||
              t.due_date ||
              s.due_date ||
              s.end_date ||
              b.end_date ||
              null;
            const taskPriority = t.priority || s.priority || "MEDIUM";
            const taskStatus =
              t.status || (t.assigned_to_id ? "IN_PROGRESS" : "PENDING");
            const estHours = Number(t.estimated_hours || 0);

            if (t.id && toNumber(t.id)) {
              await query(
                `UPDATE pm_tasks SET
                   task_title = :taskTitle,
                   wbs_code = :taskWbs,
                   scope_id = :scopeId,
                   scope_name = :scopeName,
                   assigned_to_id = :assignedToId,
                   assigned_to_name = :assignedToName,
                   priority = :priority,
                   status = :status,
                   start_date = :startDate,
                   end_date = :endDate,
                   estimated_hours = :estimatedHours,
                   duration_unit = :durationUnit,
                   is_active = 'Y'
                 WHERE id = :taskId AND project_id = :id`,
                {
                  taskId: toNumber(t.id),
                  id,
                  taskTitle,
                  taskWbs: currentWbsCode,
                  scopeId,
                  scopeName,
                  assignedToId: t.assigned_to_id
                    ? toNumber(t.assigned_to_id)
                    : null,
                  assignedToName: t.assigned_to_name || null,
                  priority: taskPriority,
                  status: taskStatus,
                  startDate: taskStart,
                  endDate: taskEnd,
                  estimatedHours: estHours,
                  durationUnit: t.duration_unit || "Days",
                },
              ).catch(() => {});
              activeTaskIds.push(toNumber(t.id));
            } else {
              const insRes = await query(
                `INSERT INTO pm_tasks (company_id, branch_id, project_id, scope_id, scope_name, wbs_code, task_title, task_description, assigned_to_id, assigned_to_name, priority, status, start_date, end_date, estimated_hours, duration_unit, is_active)
                 VALUES (:companyId, :branchId, :id, :scopeId, :scopeName, :wbsCode, :taskTitle, :taskDesc, :assignedToId, :assignedToName, :priority, :status, :startDate, :endDate, :estimatedHours, :durationUnit, 'Y')`,
                {
                  companyId: companyId || 1,
                  branchId: branchId || 1,
                  id,
                  scopeId,
                  scopeName,
                  wbsCode: currentWbsCode,
                  taskTitle,
                  taskDesc: t.task_description || t.description || null,
                  assignedToId: t.assigned_to_id
                    ? toNumber(t.assigned_to_id)
                    : null,
                  assignedToName: t.assigned_to_name || null,
                  priority: taskPriority,
                  status: taskStatus,
                  startDate: taskStart,
                  endDate: taskEnd,
                  estimatedHours: estHours,
                  durationUnit: t.duration_unit || "Days",
                },
              ).catch(() => null);
              if (insRes?.insertId) {
                t.id = insRes.insertId;
                activeTaskIds.push(insRes.insertId);
              }
            }
          }
        }
      }

      // Deactivate tasks that were removed by the user in the modal
      if (activeTaskIds.length > 0) {
        await query(
          `UPDATE pm_tasks SET is_active = 'N' WHERE project_id = :id AND id NOT IN (${activeTaskIds.filter(Boolean).map(Number).join(",")})`,
          { id },
        ).catch(() => {});
      } else {
        await query(
          `UPDATE pm_tasks SET is_active = 'N' WHERE project_id = :id`,
          { id },
        ).catch(() => {});
      }

      // Persist the updated incomingScopes with all newly assigned task IDs!
      await query(
        `UPDATE pm_projects SET project_scopes = :scopes WHERE id = :id`,
        {
          scopes: JSON.stringify(incomingScopes),
          id,
        },
      ).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ===== TASKS =====
export const listTasks = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
    const projectId = toNumber(req.query.projectId ?? req.query.project_id);
    const assignedToId = toNumber(req.query.assigned_to_id ?? req.query.assignedToId);
    const statusFilter = req.query.status && req.query.status !== "ALL" ? String(req.query.status).trim() : null;
    const fromDate = req.query.from_date || null;
    const toDate = req.query.to_date || null;
    await ensureProjectTables(companyId, branchId);

    let sql = `SELECT t.*, 
                      COALESCE(NULLIF(p.project_name, ''), NULLIF(CONCAT('Project #', t.project_id), 'Project #null'), 'General Project') AS project_name, 
                      p.project_code, 
                      COALESCE(NULLIF(t.assigned_to_name, ''), u.username, u.full_name, 'Unassigned') AS assigned_to_name
               FROM pm_tasks t
               LEFT JOIN pm_projects p ON t.project_id = p.id
               LEFT JOIN adm_users u ON u.id = t.assigned_to_id
               WHERE (t.company_id = :companyId OR :companyId IS NULL OR t.company_id IS NULL OR t.company_id = 0)
                 AND (:branchId IS NULL OR t.branch_id IS NULL OR t.branch_id = 0 OR :branchIdsStr = '' OR FIND_IN_SET(t.branch_id, :branchIdsStr))`;
    if (projectId) sql += ` AND t.project_id = :projectId`;
    if (assignedToId) sql += ` AND t.assigned_to_id = :assignedToId`;
    if (statusFilter) sql += ` AND t.status = :statusFilter`;
    if (fromDate && toDate) {
      sql += ` AND ((t.start_date BETWEEN :fromDate AND :toDate) OR (t.end_date BETWEEN :fromDate AND :toDate) OR (t.start_date <= :fromDate AND t.end_date >= :toDate))`;
    }
    sql += ` ORDER BY t.created_at DESC`;

    const items = await query(sql, {
      companyId,
      branchId,
      branchIdsStr,
      projectId,
      assignedToId,
      statusFilter,
      fromDate,
      toDate,
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch dependencies for tasks to populate readiness/blocked state
    const taskIds = (items || []).map((t) => t.id).filter(Boolean);
    let deps = [];
    if (taskIds.length > 0) {
      try {
        deps = await query(
          `SELECT d.id, d.task_id, d.predecessor_id, d.dependency_type, d.lag_days, d.notes,
                  pred.task_title AS predecessor_title, pred.status AS predecessor_status
           FROM pm_task_dependencies d
           JOIN pm_tasks pred ON pred.id = d.predecessor_id
           WHERE d.task_id IN (${taskIds.join(",")})`,
        );
      } catch (e) {}
    }
    const depMap = new Map();
    (deps || []).forEach((d) => {
      if (!depMap.has(d.task_id)) depMap.set(d.task_id, []);
      depMap.get(d.task_id).push(d);
    });

    const normalizedItems = (items || []).map((t) => {
      const pct = Number(t.completion_percent || 0);
      if (pct >= 100) {
        t.status = "COMPLETED";
      } else if (pct > 0 && (t.status === "PENDING" || !t.status)) {
        t.status = "IN_PROGRESS";
      }

      // Calculate Due Status based on due date vs system date
      const endDateVal = t.end_date || t.dueDate || t.due_date;
      if (t.status === "COMPLETED") {
        t.due_status = "COMPLETED";
        t.due_label = "Completed";
      } else if (endDateVal) {
        const sDate = String(endDateVal).split("T")[0];
        const parts = sDate.split("-");
        let dueDate = null;
        if (parts.length === 3) {
          dueDate = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2]),
          );
        } else {
          dueDate = new Date(endDateVal);
        }
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          const daysOver = Math.abs(diffDays);
          t.due_status = "OVERDUE";
          t.due_label = `Overdue by ${daysOver} day${daysOver > 1 ? "s" : ""}`;
        } else if (diffDays === 0) {
          t.due_status = "DUE_TODAY";
          t.due_label = "Due Today";
        } else {
          t.due_status = "ON_SCHEDULE";
          t.due_label = `Due in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
        }
      } else {
        t.due_status = "NO_DUE_DATE";
        t.due_label = "—";
      }

      const preds = depMap.get(t.id) || [];
      t.predecessors = preds;
      const isBlocked = preds.some(
        (p) => String(p.predecessor_status || "").toUpperCase() !== "COMPLETED",
      );
      t.is_blocked = isBlocked;
      t.is_ready = preds.length > 0 && !isBlocked && t.status !== "COMPLETED";

      return t;
    });
    res.json({ items: normalizedItems });
  } catch (err) {
    next(err);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid task id");
    await ensureProjectTables(companyId, branchId);

    let items = await query(
      `SELECT t.*, 
              COALESCE(NULLIF(p.project_name, ''), NULLIF(CONCAT('Project #', t.project_id), 'Project #null'), 'General Project') AS project_name, 
              p.project_code, 
              COALESCE(NULLIF(t.assigned_to_name, ''), u.username, u.full_name, 'Unassigned') AS assigned_to_name
       FROM pm_tasks t
       LEFT JOIN pm_projects p ON t.project_id = p.id
       LEFT JOIN adm_users u ON u.id = t.assigned_to_id
       WHERE t.id = :id AND (t.company_id = :companyId OR :companyId IS NULL OR t.company_id IS NULL OR t.company_id = 0) LIMIT 1`,
      { id, companyId },
    );
    if (!items.length) {
      items = await query(
        `SELECT t.*, 
                COALESCE(NULLIF(p.project_name, ''), NULLIF(CONCAT('Project #', t.project_id), 'Project #null'), 'General Project') AS project_name, 
                p.project_code, 
                COALESCE(NULLIF(t.assigned_to_name, ''), u.username, u.full_name, 'Unassigned') AS assigned_to_name
         FROM pm_tasks t
         LEFT JOIN pm_projects p ON t.project_id = p.id
         LEFT JOIN adm_users u ON u.id = t.assigned_to_id
         WHERE t.id = :id LIMIT 1`,
        { id },
      );
    }
    if (!items.length) throw httpError(404, "NOT_FOUND", "Task not found");

    let predecessors = [];
    let successors = [];
    try {
      predecessors = await query(
        `SELECT d.id, d.task_id, d.predecessor_id, d.dependency_type, d.lag_days, d.notes,
                pred.task_title AS predecessor_title, pred.status AS predecessor_status, pred.wbs_code AS predecessor_wbs
         FROM pm_task_dependencies d
         JOIN pm_tasks pred ON pred.id = d.predecessor_id
         WHERE d.task_id = :id`,
        { id },
      );
      successors = await query(
        `SELECT d.id, d.task_id, d.predecessor_id, d.dependency_type, d.lag_days, d.notes,
                succ.task_title AS successor_title, succ.status AS successor_status, succ.wbs_code AS successor_wbs
         FROM pm_task_dependencies d
         JOIN pm_tasks succ ON succ.id = d.task_id
         WHERE d.predecessor_id = :id`,
        { id },
      );
    } catch (e) {}

    const item = { ...items[0], predecessors, successors };
    res.json({ item });
  } catch (err) {
    next(err);
  }
};

export const createOrUpdateTask = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const b = req.body || {};
    await ensureProjectTables(companyId, branchId);

    const taskId = toNumber(req.params.id) || b.id;

    let calcPercent =
      b.completion_percent !== undefined ? Number(b.completion_percent) : null;
    let calcStatus = b.status || null;

    if (b.task_description) {
      try {
        const raw = String(b.task_description).trim();
        let items = [];
        if (raw.startsWith("[") && raw.endsWith("]")) {
          items = JSON.parse(raw);
        }
        if (Array.isArray(items) && items.length > 0) {
          const completedCount = items.filter(
            (i) => typeof i === "object" && i !== null && Boolean(i.completed),
          ).length;
          const totalCount = items.length;
          calcPercent = Math.round((completedCount / totalCount) * 100);
          calcStatus =
            calcPercent >= 100
              ? "COMPLETED"
              : calcPercent > 0
                ? "IN_PROGRESS"
                : "PENDING";
        }
      } catch (e) {}
    }

    if (!taskId && Array.isArray(b.tasks) && b.tasks.length > 0) {
      const createdIds = [];
      for (const t of b.tasks) {
        if (!t.task_title && !t.title) continue;
        const taskTitle = t.task_title || t.title;
        const estDuration =
          t.estimated_hours !== undefined
            ? Number(t.estimated_hours)
            : t.estimatedHours !== undefined
              ? Number(t.estimatedHours)
              : 0;
        const durUnit = t.duration_unit || t.durationUnit || "Days";
        const tStatus =
          t.status ||
          (t.assigned_to_id || t.assignedToId ? "IN_PROGRESS" : "PENDING");
        const r = await query(
          `INSERT INTO pm_tasks 
          (company_id, branch_id, project_id, task_title, task_description, wbs_code, scope_name, scope_id, assigned_to_id, assigned_to_name, priority, status, start_date, end_date, estimated_hours, duration_unit, reason_for_delay, completion_percent)
          VALUES (:companyId, :branchId, :project_id, :task_title, :task_description, :wbs_code, :scope_name, :scope_id, :assigned_to_id, :assigned_to_name, :priority, :status, :start_date, :end_date, :estimated_hours, :duration_unit, :reason_for_delay, :completion_percent)`,
          {
            companyId,
            branchId,
            project_id: b.project_id || t.project_id || null,
            task_title: taskTitle,
            task_description: t.task_description
              ? typeof t.task_description === "object"
                ? JSON.stringify(t.task_description)
                : t.task_description
              : null,
            wbs_code: t.wbs_code || b.wbs_code || null,
            scope_name: t.scope_name || b.scope_name || b.scope || null,
            scope_id: t.scope_id || b.scope_id || null,
            assigned_to_id: t.assigned_to_id || t.assignedToId || null,
            assigned_to_name: t.assigned_to_name || t.assignedToName || null,
            priority: t.priority || b.priority || "MEDIUM",
            status: tStatus,
            start_date: t.start_date || b.start_date || null,
            end_date: t.end_date || b.end_date || null,
            estimated_hours: estDuration,
            duration_unit: durUnit,
            reason_for_delay: t.reason_for_delay || null,
            completion_percent: t.completion_percent || 0,
          },
        );
        createdIds.push(r.insertId);
      }
      return res
        .status(201)
        .json({ ok: true, ids: createdIds, count: createdIds.length });
    }

    if (taskId) {
      await query(
        `UPDATE pm_tasks SET
        project_id = COALESCE(:project_id, project_id),
        task_title = CASE WHEN :task_title IS NOT NULL AND :task_title != '' THEN :task_title ELSE task_title END,
        task_description = CASE WHEN :has_desc = 1 THEN :task_description ELSE task_description END,
        wbs_code = CASE WHEN :has_wbs = 1 THEN :wbs_code ELSE wbs_code END,
        scope_name = CASE WHEN :has_scope = 1 THEN :scope_name ELSE scope_name END,
        scope_id = CASE WHEN :has_scope_id = 1 THEN :scope_id ELSE scope_id END,
        assigned_to_id = :assigned_to_id,
        assigned_to_name = :assigned_to_name,
        priority = COALESCE(:priority, priority),
        status = COALESCE(:status, status),
        start_date = COALESCE(:start_date, start_date),
        end_date = COALESCE(:end_date, end_date),
        estimated_hours = COALESCE(:estimated_hours, estimated_hours),
        duration_unit = COALESCE(:duration_unit, duration_unit),
        reason_for_delay = CASE WHEN :has_delay = 1 THEN :reason_for_delay ELSE reason_for_delay END,
        completion_percent = COALESCE(:completion_percent, completion_percent),
        is_active = COALESCE(:is_active, is_active)
        WHERE id = :id AND company_id = :companyId`,
        {
          ...b,
          has_desc: b.task_description !== undefined ? 1 : 0,
          has_delay: b.reason_for_delay !== undefined ? 1 : 0,
          has_wbs: b.wbs_code !== undefined ? 1 : 0,
          has_scope:
            b.scope_name !== undefined || b.scope !== undefined ? 1 : 0,
          has_scope_id: b.scope_id !== undefined ? 1 : 0,
          wbs_code: b.wbs_code || null,
          scope_name: b.scope_name || b.scope || null,
          scope_id: b.scope_id || null,
          project_id: b.project_id || null,
          task_title: b.task_title || null,
          task_description:
            b.task_description !== undefined ? b.task_description : null,
          assigned_to_id: b.assigned_to_id || null,
          assigned_to_name: b.assigned_to_name || null,
          priority: b.priority || null,
          status: calcStatus,
          start_date: b.start_date || null,
          end_date: b.end_date || null,
          estimated_hours:
            b.estimated_hours !== undefined ? Number(b.estimated_hours) : null,
          duration_unit: b.duration_unit || null,
          reason_for_delay:
            b.reason_for_delay !== undefined ? b.reason_for_delay : null,
          completion_percent: calcPercent,
          is_active: b.is_active || null,
          id: taskId,
          companyId,
        },
      );

      if (Array.isArray(b.predecessors)) {
        await query(`DELETE FROM pm_task_dependencies WHERE task_id = :taskId`, { taskId }).catch(() => {});
        for (const p of b.predecessors) {
          const predId = toNumber(p.predecessor_id || p.id);
          if (predId && predId !== taskId) {
            await query(
              `INSERT INTO pm_task_dependencies (company_id, branch_id, task_id, predecessor_id, dependency_type, lag_days, notes)
               VALUES (:companyId, :branchId, :taskId, :predId, :type, :lag, :notes)`,
              {
                companyId: companyId || 1,
                branchId: branchId || 1,
                taskId,
                predId,
                type: (p.dependency_type || "FS").toUpperCase(),
                lag: Number(p.lag_days || 0),
                notes: p.notes || null,
              },
            ).catch(() => {});
          }
        }
      }

      res.json({ ok: true });
    } else {
      const r = await query(
        `INSERT INTO pm_tasks 
        (company_id, branch_id, project_id, task_title, task_description, wbs_code, scope_name, scope_id, assigned_to_id, assigned_to_name, priority, status, start_date, end_date, estimated_hours, duration_unit, reason_for_delay, completion_percent)
        VALUES (:companyId, :branchId, :project_id, :task_title, :task_description, :wbs_code, :scope_name, :scope_id, :assigned_to_id, :assigned_to_name, :priority, :status, :start_date, :end_date, :estimated_hours, :duration_unit, :reason_for_delay, :completion_percent)`,
        {
          ...b,
          companyId,
          branchId,
          wbs_code: b.wbs_code || null,
          scope_name: b.scope_name || b.scope || null,
          scope_id: b.scope_id || null,
          duration_unit: b.duration_unit || "Days",
          status: calcStatus || "PENDING",
          priority: b.priority || "MEDIUM",
          completion_percent: calcPercent || 0,
        },
      );

      const newId = r.insertId;
      if (newId && Array.isArray(b.predecessors)) {
        for (const p of b.predecessors) {
          const predId = toNumber(p.predecessor_id || p.id);
          if (predId && predId !== newId) {
            await query(
              `INSERT INTO pm_task_dependencies (company_id, branch_id, task_id, predecessor_id, dependency_type, lag_days, notes)
               VALUES (:companyId, :branchId, :taskId, :predId, :type, :lag, :notes)`,
              {
                companyId: companyId || 1,
                branchId: branchId || 1,
                taskId: newId,
                predId,
                type: (p.dependency_type || "FS").toUpperCase(),
                lag: Number(p.lag_days || 0),
                notes: p.notes || null,
              },
            ).catch(() => {});
          }
        }
      }

      res.status(201).json({ id: newId });
    }
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await query(
      `DELETE FROM pm_tasks WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      { id, companyId, branchId },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) return next();
    await query(
      `DELETE FROM pm_projects WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      { id, companyId, branchId },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ===== PROJECT MANAGERS =====
export const listProjectManagers = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const rows = await query(
      `SELECT id, id AS user_id, username, full_name, email, is_active
       FROM adm_users
       WHERE (company_id = :companyId OR :companyId IS NULL)
         AND (is_active = 1 OR is_active = 'Y')
       ORDER BY COALESCE(full_name, username) ASC`,
      { companyId: companyId || null },
    );
    res.json({ items: rows || [] });
  } catch (err) {
    next(err);
  }
};

export const createProjectManager = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const userId = toNumber(req.body?.user_id);
    if (!userId)
      return next(httpError(400, "VALIDATION_ERROR", "user_id is required"));
    const result = await query(
      `INSERT INTO pm_project_managers (company_id, branch_id, user_id)
       VALUES (:companyId, :branchId, :userId)
       ON DUPLICATE KEY UPDATE is_active = 'Y'`,
      { companyId, branchId, userId },
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    next(err);
  }
};

export const removeProjectManager = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) return next(httpError(400, "VALIDATION_ERROR", "Invalid id"));
    await query(
      `DELETE FROM pm_project_managers WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      { id, companyId, branchId },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ===== TIMESHEETS =====
export const listTimesheets = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const projectId = toNumber(req.query.projectId);
    await ensureProjectTables(companyId, branchId);

    let sql = `SELECT ts.*, t.task_title, p.project_name FROM pm_timesheets ts 
               JOIN pm_tasks t ON ts.task_id = t.id
               JOIN pm_projects p ON ts.project_id = p.id
               WHERE ts.company_id = :companyId AND ts.branch_id = :branchId`;
    if (projectId) sql += ` AND ts.project_id = :projectId`;
    sql += ` ORDER BY ts.log_date DESC`;

    const items = await query(sql, { companyId, branchId, projectId });
    items.forEach((p) => {
      if (p.team_members && typeof p.team_members === "string") {
        try {
          p.team_members = JSON.parse(p.team_members);
        } catch (e) {}
      }
      if (p.team_lead_ids && typeof p.team_lead_ids === "string") {
        try {
          p.team_lead_ids = JSON.parse(p.team_lead_ids);
        } catch (e) {}
      }
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

export const createTimesheet = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const b = req.body || {};
    await ensureProjectTables(companyId, branchId);

    const r = await query(
      `INSERT INTO pm_timesheets 
      (company_id, branch_id, project_id, task_id, user_id, user_name, log_date, hours, description)
      VALUES (:companyId, :branchId, :project_id, :task_id, :user_id, :user_name, :log_date, :hours, :description)`,
      {
        ...b,
        companyId,
        branchId,
        user_id: req.user?.id,
        user_name: req.user?.full_name,
      },
    );

    // Update task actual hours
    await query(
      `UPDATE pm_tasks SET actual_hours = actual_hours + :hours WHERE id = :task_id`,
      { hours: b.hours, task_id: b.task_id },
    );

    res.status(201).json({ id: r.insertId });
  } catch (err) {
    next(err);
  }
};

export const updateTimesheet = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    const b = req.body;
    const old = await query(
      `SELECT * FROM pm_timesheets WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      { id, companyId, branchId },
    );
    if (!old.length) throw httpError(404, "NOT_FOUND", "Timesheet not found");
    const hoursDiff = Number(b.hours || 0) - Number(old[0].hours || 0);
    await query(
      `UPDATE pm_timesheets SET log_date = :logDate, hours = :hours, description = :description WHERE id = :id`,
      {
        id,
        logDate: b.log_date,
        hours: b.hours,
        description: b.description,
      },
    );
    if (hoursDiff !== 0 && old[0].task_id) {
      await query(
        `UPDATE pm_tasks SET actual_hours = GREATEST(actual_hours + :diff, 0) WHERE id = :taskId`,
        { diff: hoursDiff, taskId: old[0].task_id },
      );
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const deleteTimesheet = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    const old = await query(
      `SELECT * FROM pm_timesheets WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      { id, companyId, branchId },
    );
    if (!old.length) throw httpError(404, "NOT_FOUND", "Timesheet not found");
    await query(`DELETE FROM pm_timesheets WHERE id = :id`, { id });
    if (old[0].task_id) {
      await query(
        `UPDATE pm_tasks SET actual_hours = GREATEST(actual_hours - :hours, 0) WHERE id = :taskId`,
        { hours: old[0].hours, taskId: old[0].task_id },
      );
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ===== DASHBOARD =====
export const getPMDashboardStats = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
    await ensureProjectTables(companyId, branchId);

    const branchFilter = `AND (:branchIdsStr = '' OR FIND_IN_SET(branch_id, :branchIdsStr) OR (:branchIdStr != '' AND :branchIdStr != 'all' AND branch_id = :branchIdStr))`;
    const params = {
      companyId,
      branchIdStr: String(branchId || ""),
      branchIdsStr: String(branchIdsStr || ""),
    };

    const [projects] = await query(
      `SELECT COUNT(*) as count FROM pm_projects WHERE company_id = :companyId ${branchFilter}`,
      params,
    );
    const [activeProjects] = await query(
      `SELECT COUNT(*) as count FROM pm_projects WHERE company_id = :companyId ${branchFilter} AND project_status IN ('IN_PROGRESS', 'ACTIVE', 'EXECUTION', 'PLANNING')`,
      params,
    );
    const [activeTasks] = await query(
      `SELECT COUNT(*) as count FROM pm_tasks WHERE company_id = :companyId ${branchFilter} AND status IN ('PENDING', 'IN_PROGRESS')`,
      params,
    );
    const [overdueTasks] = await query(
      `SELECT COUNT(*) as count FROM pm_tasks WHERE company_id = :companyId ${branchFilter} AND status IN ('PENDING', 'IN_PROGRESS') AND end_date < CURDATE()`,
      params,
    );
    const [budgetRows] = await query(
      `SELECT SUM(budget) as total FROM pm_projects WHERE company_id = :companyId ${branchFilter}`,
      params,
    );
    const [expenseRows] = await query(
      `SELECT SUM(amount) as total FROM pm_expenses WHERE company_id = :companyId ${branchFilter}`,
      params,
    );
    const [hoursRows] = await query(
      `SELECT SUM(hours) as total, COUNT(DISTINCT log_date) as days FROM pm_timesheets WHERE company_id = :companyId ${branchFilter}`,
      params,
    );

    res.json({
      totalProjects: projects.count,
      activeProjects: activeProjects.count,
      activeTasks: activeTasks.count,
      openTasks: activeTasks.count,
      overdueTasks: overdueTasks.count,
      totalBudget: budgetRows.total || 0,
      totalExpenses: expenseRows.total || 0,
      totalLoggedHours: hoursRows.total || 0,
      totalDays: hoursRows.days || 0,
    });
  } catch (err) {
    next(err);
  }
};

// ===== TASK DEPENDENCIES =====
async function ensureTaskDependenciesTable(companyId, branchId) {
  if (process.env.SKIP_DYNAMIC_SCHEMA_SYNC === "true") return;
  await query(`CREATE TABLE IF NOT EXISTS pm_task_dependencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL, branch_id INT NOT NULL,
    task_id INT NOT NULL,
    predecessor_id INT NOT NULL,
    dependency_type VARCHAR(10) DEFAULT 'FS',
    lag_days INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_task_predecessor (company_id, branch_id, task_id, predecessor_id),
    KEY idx_dep_task (task_id),
    KEY idx_dep_predecessor (predecessor_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(() => {});
}

export const listTaskDependencies = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    await ensureTaskDependenciesTable(companyId, branchId);
    const taskId = req.query.taskId ? toNumber(req.query.taskId) : null;
    let sql = `SELECT d.*, t.task_title AS task_title, p.task_title AS predecessor_title
      FROM pm_task_dependencies d
      LEFT JOIN pm_tasks t ON d.task_id = t.id
      LEFT JOIN pm_tasks p ON d.predecessor_id = p.id
      WHERE d.company_id = :companyId AND d.branch_id = :branchId`;
    if (taskId) sql += ` AND d.task_id = :taskId`;
    sql += ` ORDER BY d.id`;
    const rows = await query(sql, { companyId, branchId, taskId });
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
};

export const createTaskDependency = async (req, res, next) => {
  try {
    const { companyId, branchId = 1 } = req.scope || {};
    await ensureTaskDependenciesTable(companyId, branchId);
    const {
      taskId,
      predecessorId,
      dependencyType = "FS",
      lagDays = 0,
    } = req.body;
    if (!taskId || !predecessorId)
      return res
        .status(400)
        .json({ message: "taskId and predecessorId required" });
    if (toNumber(taskId) === toNumber(predecessorId))
      return res
        .status(400)
        .json({ message: "A task cannot depend on itself" });
    const resIdx = await query(
      `INSERT INTO pm_task_dependencies (company_id, branch_id, task_id, predecessor_id, dependency_type, lag_days)
      VALUES (:companyId, :branchId, :taskId, :predecessorId, :dependencyType, :lagDays)`,
      {
        companyId,
        branchId,
        taskId: toNumber(taskId),
        predecessorId: toNumber(predecessorId),
        dependencyType,
        lagDays: toNumber(lagDays),
      },
    );
    res
      .status(201)
      .json({ id: resIdx.insertId, message: "Dependency created" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json({ message: "This dependency already exists" });
    next(err);
  }
};

export const deleteTaskDependency = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await query(
      `DELETE FROM pm_task_dependencies WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      { id, companyId, branchId },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ===== EXPENSES CRUD =====
export const listExpenses = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
    await ensureProjectTables(companyId, branchId);
    const projectId = toNumber(req.query.projectId);
    let sql = `SELECT e.*, p.project_name, u.username AS created_by_name,
      s.supplier_name, c.name AS cost_center_name,
      CASE 
        WHEN v.status IN ('DRAFT', 'SUBMITTED') THEN 'PENDING'
        WHEN v.status IS NOT NULL THEN v.status
        ELSE e.status 
      END AS status
      FROM pm_expenses e
      LEFT JOIN pm_projects p ON e.project_id = p.id
      LEFT JOIN adm_users u ON e.recorded_by = u.username
      LEFT JOIN pur_suppliers s ON e.supplier_id = s.id
      LEFT JOIN fin_cost_centers c ON e.cost_center_id = c.id
      LEFT JOIN fin_vouchers v ON e.voucher_id = v.id
      WHERE e.company_id = :companyId
        AND (:branchId IS NULL OR (:branchIdsStr = '' OR FIND_IN_SET(e.branch_id, :branchIdsStr)))`;
    if (projectId) sql += ` AND e.project_id = :projectId`;
    sql += ` ORDER BY e.expense_date DESC`;
    const rows = await query(sql, {
      companyId,
      branchId,
      branchIdsStr,
      projectId,
    });
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    await ensureProjectTables(companyId, branchId);
    const b = req.body;
    if (!b.project_id || !b.amount)
      throw httpError(
        400,
        "VALIDATION_ERROR",
        "project_id and amount required",
      );
    const r = await query(
      `INSERT INTO pm_expenses (company_id, branch_id, project_id, expense_date, category, amount, currency, description, recorded_by, status, supplier_id, payment_method, payment_account_id, is_tax_included, tax_code_id, reference_no, cheque_date, cost_center_id)
      VALUES (:companyId, :branchId, :projectId, :expenseDate, :category, :amount, :currency, :description, :recordedBy, :status, :supplierId, :paymentMethod, :paymentAccountId, :isTaxIncluded, :taxCodeId, :referenceNo, :chequeDate, :costCenterId)`,
      {
        companyId,
        branchId,
        projectId: toNumber(b.project_id),
        expenseDate: b.expense_date || new Date().toISOString().split("T")[0],
        category: b.category || "OTHER",
        amount: Number(b.amount || 0),
        currency: b.currency || "GHS",
        description: b.description || null,
        recordedBy: req.user?.username || null,
        status: b.status || "PENDING",
        supplierId: b.supplier_id ? toNumber(b.supplier_id) : null,
        paymentMethod: b.payment_method || null,
        paymentAccountId: b.payment_account_id
          ? toNumber(b.payment_account_id)
          : null,
        isTaxIncluded: b.is_tax_included ? 1 : 0,
        taxCodeId: b.tax_code_id ? toNumber(b.tax_code_id) : null,
        referenceNo: b.reference_no || null,
        chequeDate: b.cheque_date || null,
        costCenterId: b.cost_center_id ? toNumber(b.cost_center_id) : null,
      },
    );
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    next(err);
  }
};

export const updateExpense = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    const b = req.body;
    await query(
      `UPDATE pm_expenses SET expense_date = :expenseDate, category = :category, amount = :amount, description = :description, status = :status, supplier_id = :supplierId, payment_method = :paymentMethod, payment_account_id = :paymentAccountId, is_tax_included = :isTaxIncluded, tax_code_id = :taxCodeId, reference_no = :referenceNo, cheque_date = :chequeDate, cost_center_id = :costCenterId WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      {
        id,
        companyId,
        branchId,
        expenseDate: b.expense_date || null,
        category: b.category || "OTHER",
        amount: Number(b.amount || 0),
        description: b.description || null,
        status: b.status || "PENDING",
        supplierId: b.supplier_id ? toNumber(b.supplier_id) : null,
        paymentMethod: b.payment_method || null,
        paymentAccountId: b.payment_account_id
          ? toNumber(b.payment_account_id)
          : null,
        isTaxIncluded: b.is_tax_included ? 1 : 0,
        taxCodeId: b.tax_code_id ? toNumber(b.tax_code_id) : null,
        referenceNo: b.reference_no || null,
        chequeDate: b.cheque_date || null,
        costCenterId: b.cost_center_id ? toNumber(b.cost_center_id) : null,
      },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await query(
      `DELETE FROM pm_expenses WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      { id, companyId, branchId },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const updateExpenseVoucherId = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    const voucherId = toNumber(req.body.voucher_id);
    if (!id || !voucherId)
      throw httpError(400, "VALIDATION_ERROR", "Invalid id or voucher_id");
    await query(
      `UPDATE pm_expenses SET voucher_id = :voucherId WHERE id = :id AND company_id = :companyId`,
      { id, voucherId, companyId },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ===== INCOME CRUD =====
export const listIncome = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
    const projectId = toNumber(req.query.projectId);
    let sql = `SELECT i.*, p.project_name, u.username AS created_by_name,
      c_cust.customer_name, cc.name AS cost_center_name,
      CASE 
        WHEN v.status IN ('DRAFT', 'SUBMITTED') THEN 'PENDING'
        WHEN v.status IS NOT NULL THEN v.status
        ELSE i.status 
      END AS status
      FROM pm_income i
      LEFT JOIN pm_projects p ON i.project_id = p.id
      LEFT JOIN adm_users u ON i.recorded_by = u.username
      LEFT JOIN sal_customers c_cust ON i.customer_id = c_cust.id
      LEFT JOIN fin_cost_centers cc ON i.cost_center_id = cc.id
      LEFT JOIN fin_vouchers v ON i.voucher_id = v.id
      WHERE i.company_id = :companyId
        AND (:branchId IS NULL OR (:branchIdsStr = '' OR FIND_IN_SET(i.branch_id, :branchIdsStr)))`;
    if (projectId) sql += ` AND i.project_id = :projectId`;
    sql += ` ORDER BY i.income_date DESC`;
    const rows = await query(sql, {
      companyId,
      branchId,
      branchIdsStr,
      projectId,
    });
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
};

export const createIncome = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const b = req.body;
    if (!b.project_id || !b.amount)
      throw httpError(
        400,
        "VALIDATION_ERROR",
        "project_id and amount required",
      );
    const r = await query(
      `INSERT INTO pm_income (company_id, branch_id, project_id, income_date, category, amount, currency, description, recorded_by, status, customer_id, payment_method, payment_account_id, is_tax_included, tax_code_id, reference_no, cheque_date, cost_center_id)
      VALUES (:companyId, :branchId, :projectId, :incomeDate, :category, :amount, :currency, :description, :recordedBy, :status, :customerId, :paymentMethod, :paymentAccountId, :isTaxIncluded, :taxCodeId, :referenceNo, :chequeDate, :costCenterId)`,
      {
        companyId,
        branchId,
        projectId: toNumber(b.project_id),
        incomeDate: b.income_date || new Date().toISOString().split("T")[0],
        category: b.category || "OTHER",
        amount: Number(b.amount || 0),
        currency: b.currency || "GHS",
        description: b.description || null,
        recordedBy: req.user?.username || null,
        status: b.status || "PENDING",
        customerId: b.customer_id ? toNumber(b.customer_id) : null,
        paymentMethod: b.payment_method || null,
        paymentAccountId: b.payment_account_id
          ? toNumber(b.payment_account_id)
          : null,
        isTaxIncluded: b.is_tax_included ? 1 : 0,
        taxCodeId: b.tax_code_id ? toNumber(b.tax_code_id) : null,
        referenceNo: b.reference_no || null,
        chequeDate: b.cheque_date || null,
        costCenterId: b.cost_center_id ? toNumber(b.cost_center_id) : null,
      },
    );
    res.status(201).json({ id: r.insertId });
  } catch (err) {
    next(err);
  }
};

export const updateIncome = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    const b = req.body;
    await query(
      `UPDATE pm_income SET income_date = :incomeDate, category = :category, amount = :amount, description = :description, status = :status, customer_id = :customerId, payment_method = :paymentMethod, payment_account_id = :paymentAccountId, is_tax_included = :isTaxIncluded, tax_code_id = :taxCodeId, reference_no = :referenceNo, cheque_date = :chequeDate, cost_center_id = :costCenterId WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      {
        id,
        companyId,
        branchId,
        incomeDate: b.income_date || null,
        category: b.category || "OTHER",
        amount: Number(b.amount || 0),
        description: b.description || null,
        status: b.status || "PENDING",
        customerId: b.customer_id ? toNumber(b.customer_id) : null,
        paymentMethod: b.payment_method || null,
        paymentAccountId: b.payment_account_id
          ? toNumber(b.payment_account_id)
          : null,
        isTaxIncluded: b.is_tax_included ? 1 : 0,
        taxCodeId: b.tax_code_id ? toNumber(b.tax_code_id) : null,
        referenceNo: b.reference_no || null,
        chequeDate: b.cheque_date || null,
        costCenterId: b.cost_center_id ? toNumber(b.cost_center_id) : null,
      },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const deleteIncome = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await query(
      `DELETE FROM pm_income WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      { id, companyId, branchId },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

export const updateIncomeVoucherId = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    const voucherId = toNumber(req.body.voucher_id);
    if (!id || !voucherId)
      throw httpError(400, "VALIDATION_ERROR", "Invalid id or voucher_id");
    await query(
      `UPDATE pm_income SET voucher_id = :voucherId WHERE id = :id AND company_id = :companyId`,
      { id, voucherId, companyId },
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// ===== ENHANCED DASHBOARD STATS =====
export const getPMDashboardDetail = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
    await ensureProjectTables(companyId, branchId);
    const branchFilter = `AND (:branchIdsStr = '' OR FIND_IN_SET(branch_id, :branchIdsStr) OR (:branchIdStr != '' AND :branchIdStr != 'all' AND branch_id = :branchIdStr))`;
    const params = {
      companyId,
      branchIdStr: String(branchId || ""),
      branchIdsStr: String(branchIdsStr || ""),
    };

    const [projectStats] = await query(
      `SELECT
      COUNT(*) AS total, SUM(CASE WHEN project_status IN ('IN_PROGRESS', 'ACTIVE', 'EXECUTION') THEN 1 ELSE 0 END) AS active,
      SUM(CASE WHEN project_status = 'PLANNING' THEN 1 ELSE 0 END) AS planning,
      SUM(CASE WHEN project_status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
      SUM(budget) AS total_budget
      FROM pm_projects WHERE company_id = :companyId ${branchFilter}`,
      params,
    );
    const [taskStats] = await query(
      `SELECT COUNT(*) AS total,
      SUM(CASE WHEN status IN ('PENDING','IN_PROGRESS') THEN 1 ELSE 0 END) AS open,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'BLOCKED' THEN 1 ELSE 0 END) AS blocked
      FROM pm_tasks WHERE company_id = :companyId ${branchFilter}`,
      params,
    );
    const [hoursRow] = await query(
      `SELECT COALESCE(SUM(hours),0) AS total FROM pm_timesheets WHERE company_id = :companyId ${branchFilter}`,
      params,
    );
    const [expenseRow] = await query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM pm_expenses WHERE company_id = :companyId ${branchFilter}`,
      params,
    );
    res.json({
      projects: projectStats,
      tasks: taskStats,
      totalLoggedHours: hoursRow.total,
      totalExpenses: expenseRow.total,
    });
  } catch (err) {
    next(err);
  }
};

// ===== BUDGET VS ACTUAL =====
export const getBudgetVsActual = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
    await ensureProjectTables(companyId, branchId);
    const branchFilter = `AND (:branchIdsStr = '' OR FIND_IN_SET(p.branch_id, :branchIdsStr) OR (:branchIdStr != '' AND :branchIdStr != 'all' AND p.branch_id = :branchIdStr))`;
    const params = {
      companyId,
      branchIdStr: String(branchId || ""),
      branchIdsStr: String(branchIdsStr || ""),
    };

    const rows = await query(
      `SELECT
      p.id, p.project_name, p.project_code, p.project_status, p.budget, p.completion_percent,
      COALESCE(e.total_expense,0) AS total_expense,
      COALESCE(t.total_labor,0) AS total_labor,
      (COALESCE(e.total_expense,0) + COALESCE(t.total_labor,0)) AS total_spent,
      GREATEST(p.budget - COALESCE(e.total_expense,0) - COALESCE(t.total_labor,0), 0) AS remaining,
      CASE WHEN p.budget > 0
        THEN ROUND(((COALESCE(e.total_expense,0) + COALESCE(t.total_labor,0)) / p.budget) * 100, 1)
        ELSE 0 END AS spend_pct
      FROM pm_projects p
      LEFT JOIN (SELECT project_id, SUM(amount) AS total_expense FROM pm_expenses GROUP BY project_id) e ON p.id = e.project_id
      LEFT JOIN (SELECT project_id, SUM(hours * 50) AS total_labor FROM pm_timesheets GROUP BY project_id) t ON p.id = t.project_id
      WHERE p.company_id = :companyId ${branchFilter}
      ORDER BY spend_pct DESC`,
      params,
    );
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
};

// ===== PROJECT DETAIL DASHBOARD =====
export const getProjectDetail = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await ensureProjectTables(companyId, branchId);

    const [project] = await query(
      `SELECT * FROM pm_projects WHERE id = :projectId AND company_id = :companyId AND branch_id = :branchId`,
      { projectId, companyId, branchId },
    );
    if (!project) throw httpError(404, "NOT_FOUND", "Project not found");

    const tasks = await query(
      `SELECT * FROM pm_tasks WHERE project_id = :projectId AND company_id = :companyId AND branch_id = :branchId ORDER BY start_date ASC`,
      { projectId, companyId, branchId },
    );

    const [hoursRow] = await query(
      `SELECT COALESCE(SUM(hours),0) AS total FROM pm_timesheets WHERE project_id = :projectId AND company_id = :companyId AND branch_id = :branchId`,
      { projectId, companyId, branchId },
    );

    const [expenseRow] = await query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM pm_expenses WHERE project_id = :projectId AND company_id = :companyId AND branch_id = :branchId`,
      { projectId, companyId, branchId },
    );

    const deps = await query(
      `SELECT d.*, pt.task_title AS predecessor_title FROM pm_task_dependencies d LEFT JOIN pm_tasks pt ON d.predecessor_id = pt.id WHERE d.task_id IN (SELECT id FROM pm_tasks WHERE project_id = :projectId) AND d.company_id = :companyId AND d.branch_id = :branchId`,
      { projectId, companyId, branchId },
    );

    const laborCost = hoursRow.total * 50;
    res.json({
      project,
      tasks,
      totalHours: hoursRow.total,
      totalExpenses: expenseRow.total,
      totalLaborCost: laborCost,
      totalSpent: expenseRow.total + laborCost,
      remaining: Math.max(project.budget - expenseRow.total - laborCost, 0),
      spendPct:
        project.budget > 0
          ? Number(
              ((expenseRow.total + laborCost) / project.budget) * 100,
            ).toFixed(1)
          : 0,
      dependencies: deps,
    });
  } catch (err) {
    next(err);
  }
};

// ===== PM MATERIAL REQUISITION TABLES =====
async function ensurePMMaterialRequisitionTables(companyId, branchId) {
  if (process.env.SKIP_DYNAMIC_SCHEMA_SYNC === "true") return;
  await query(`CREATE TABLE IF NOT EXISTS pm_material_requisitions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    branch_id BIGINT UNSIGNED NOT NULL,
    requisition_no VARCHAR(50) NOT NULL,
    requisition_date DATE NOT NULL,
    project_id BIGINT UNSIGNED DEFAULT NULL,
    warehouse_id BIGINT UNSIGNED DEFAULT NULL,
    department_id BIGINT UNSIGNED DEFAULT NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    requested_by VARCHAR(255) DEFAULT NULL,
    remarks TEXT,
    status VARCHAR(30) DEFAULT 'DRAFT',
    created_by BIGINT UNSIGNED DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pm_mr_scope_no (company_id, branch_id, requisition_no)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS pm_material_requisition_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    requisition_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    qty_requested DECIMAL(18,3) NOT NULL DEFAULT 0,
    qty_received DECIMAL(18,3) NOT NULL DEFAULT 0,
    uom VARCHAR(20) DEFAULT 'PCS',
    batch_no VARCHAR(100) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_pm_mri_req (requisition_id),
    CONSTRAINT fk_pm_mri_req FOREIGN KEY (requisition_id) REFERENCES pm_material_requisitions (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

async function nextPMMRNo(companyId, branchId) {
  const rows = await query(
    `SELECT requisition_no FROM pm_material_requisitions WHERE company_id = :companyId AND branch_id = :branchId AND requisition_no LIKE 'MRP-%' ORDER BY CAST(SUBSTRING(requisition_no, 5) AS UNSIGNED) DESC LIMIT 1`,
    { companyId, branchId },
  );
  let nextNum = 1;
  if (rows.length > 0) {
    const prev = String(rows[0].requisition_no || "");
    const numPart = prev.slice(4);
    const n = parseInt(numPart, 10);
    if (Number.isFinite(n)) nextNum = n + 1;
  }
  return `MRP-${String(nextNum).padStart(6, "0")}`;
}

// ===== PM MATERIAL UTILIZATION TABLES =====
async function ensurePMMaterialUtilizationTables(companyId, branchId) {
  await ensurePMTemporalWarehousesTable();
  if (process.env.SKIP_DYNAMIC_SCHEMA_SYNC === "true") return;
  await query(`CREATE TABLE IF NOT EXISTS pm_material_utilization (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    branch_id BIGINT UNSIGNED NOT NULL,
    utilization_no VARCHAR(50) NOT NULL,
    utilization_date DATE NOT NULL,
    project_id INT NOT NULL,
    task_id INT DEFAULT NULL,
    task_summary VARCHAR(500) DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    warehouse_id BIGINT UNSIGNED DEFAULT NULL,
    remarks TEXT,
    status VARCHAR(30) DEFAULT 'DRAFT',
    created_by BIGINT UNSIGNED DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pm_mu_scope_no (company_id, branch_id, utilization_no)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(
    `ALTER TABLE pm_material_utilization ADD COLUMN IF NOT EXISTS warehouse_id BIGINT UNSIGNED DEFAULT NULL AFTER location`,
  ).catch(() => {});

  await query(`CREATE TABLE IF NOT EXISTS pm_material_utilization_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    utilization_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    item_name VARCHAR(255) DEFAULT NULL,
    uom VARCHAR(20) DEFAULT 'PCS',
    required_qty DECIMAL(18,3) NOT NULL DEFAULT 0,
    qty_in_stock DECIMAL(18,3) NOT NULL DEFAULT 0,
    cost_price DECIMAL(18,4) DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_pm_mui_util (utilization_id),
    CONSTRAINT fk_pm_mui_util FOREIGN KEY (utilization_id) REFERENCES pm_material_utilization (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

async function nextPMUtilNo(companyId, branchId) {
  const rows = await query(
    `SELECT utilization_no FROM pm_material_utilization WHERE company_id = :companyId AND branch_id = :branchId AND utilization_no LIKE 'MT-%' ORDER BY CAST(SUBSTRING(utilization_no, 4) AS UNSIGNED) DESC LIMIT 1`,
    { companyId, branchId },
  );
  let nextNum = 1;
  if (rows.length > 0) {
    const prev = String(rows[0].utilization_no || "");
    const numPart = prev.slice(3);
    const n = parseInt(numPart, 10);
    if (Number.isFinite(n)) nextNum = n + 1;
  }
  return `MT-${String(nextNum).padStart(6, "0")}`;
}

// ===== PM MATERIALS RECEIPT TABLES =====
async function ensurePMMaterialReceiptTables(companyId, branchId) {
  await ensurePMTemporalWarehousesTable();
  if (process.env.SKIP_DYNAMIC_SCHEMA_SYNC === "true") return;
  await query(`CREATE TABLE IF NOT EXISTS pm_material_receipts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    company_id BIGINT UNSIGNED NOT NULL,
    branch_id BIGINT UNSIGNED NOT NULL,
    receipt_no VARCHAR(50) NOT NULL,
    receipt_date DATE NOT NULL,
    issue_id BIGINT UNSIGNED DEFAULT NULL,
    source_doc VARCHAR(50) DEFAULT NULL,
    warehouse_id BIGINT UNSIGNED DEFAULT NULL,
    department_id BIGINT UNSIGNED DEFAULT NULL,
    remarks TEXT,
    status VARCHAR(30) DEFAULT 'DRAFT',
    created_by BIGINT UNSIGNED DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pm_mrcpt_scope_no (company_id, branch_id, receipt_no)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  await query(`CREATE TABLE IF NOT EXISTS pm_material_receipt_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    receipt_id BIGINT UNSIGNED NOT NULL,
    item_id BIGINT UNSIGNED NOT NULL,
    item_name VARCHAR(255) DEFAULT NULL,
    uom VARCHAR(20) DEFAULT 'PCS',
    transfer_qty DECIMAL(18,3) NOT NULL DEFAULT 0,
    receipt_qty DECIMAL(18,3) NOT NULL DEFAULT 0,
    batch_no VARCHAR(100) DEFAULT NULL,
    expiry_date DATE DEFAULT NULL,
    mfg_date DATE DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_pm_mrcpt_i_rcpt (receipt_id),
    CONSTRAINT fk_pm_mrcpt_i_rcpt FOREIGN KEY (receipt_id) REFERENCES pm_material_receipts (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}

async function nextPMRcptNo(companyId, branchId) {
  const rows = await query(
    `SELECT receipt_no FROM pm_material_receipts WHERE company_id = :companyId AND branch_id = :branchId AND receipt_no LIKE 'RCPT-%' ORDER BY CAST(SUBSTRING(receipt_no, 6) AS UNSIGNED) DESC LIMIT 1`,
    { companyId, branchId },
  );
  let nextNum = 1;
  if (rows.length > 0) {
    const prev = String(rows[0].receipt_no || "");
    const numPart = prev.slice(5);
    const n = parseInt(numPart, 10);
    if (Number.isFinite(n)) nextNum = n + 1;
  }
  return `RCPT-${String(nextNum).padStart(6, "0")}`;
}

// ===== PM MATERIAL REQUISITION CRUD =====
export const listPMMaterialRequisitions = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    await ensurePMMaterialRequisitionTables(companyId, branchId);
    const rows = await query(
      `SELECT r.*, p.project_name, w.warehouse_name, d.name AS department_name, u.username AS created_by_name
      FROM pm_material_requisitions r
      LEFT JOIN pm_projects p ON r.project_id = p.id
      LEFT JOIN inv_warehouses w ON r.warehouse_id = w.id
      LEFT JOIN adm_departments d ON r.department_id = d.id
      LEFT JOIN adm_users u ON r.created_by = u.id
      WHERE r.company_id = :companyId AND r.branch_id = :branchId AND COALESCE(r.is_active,'Y') = 'Y'
      ORDER BY r.created_at DESC`,
      { companyId, branchId },
    );
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
};

export const getPMMaterialRequisitionById = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await ensurePMMaterialRequisitionTables(companyId, branchId);
    const [hdr] = await query(
      `SELECT r.*, p.project_name, w.warehouse_name, d.name AS department_name, u.username AS created_by_name
      FROM pm_material_requisitions r
      LEFT JOIN pm_projects p ON r.project_id = p.id
      LEFT JOIN inv_warehouses w ON r.warehouse_id = w.id
      LEFT JOIN adm_departments d ON r.department_id = d.id
      LEFT JOIN adm_users u ON r.created_by = u.id
      WHERE r.id = :id LIMIT 1`,
      { id },
    );
    if (!hdr)
      throw httpError(404, "NOT_FOUND", "Material requisition not found");
    const details = await query(
      `SELECT d.*, i.item_code, i.item_name FROM pm_material_requisition_items d LEFT JOIN inv_items i ON d.item_id = i.id WHERE d.requisition_id = :id ORDER BY d.id`,
      { id },
    );
    res.json({ item: hdr, details });
  } catch (err) {
    next(err);
  }
};

export const createPMMaterialRequisition = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { companyId, branchId = null } = req.scope || {};
    await ensurePMMaterialRequisitionTables(companyId, branchId);
    const b = req.body || {};
    const reqNo = await nextPMMRNo(companyId, branchId);
    const details = Array.isArray(b.details) ? b.details : [];
    await conn.beginTransaction();
    const [hdr] = await conn.execute(
      `INSERT INTO pm_material_requisitions (company_id, branch_id, requisition_no, requisition_date, project_id, warehouse_id, department_id, priority, requested_by, remarks, status, created_by)
      VALUES (:companyId, :branchId, :reqNo, :reqDate, :projectId, :warehouseId, :departmentId, :priority, :requestedBy, :remarks, :status, :createdBy)`,
      {
        companyId,
        branchId,
        reqNo,
        reqDate: b.requisition_date || new Date().toISOString().split("T")[0],
        projectId: toNumber(b.project_id),
        warehouseId: toNumber(b.warehouse_id),
        departmentId: toNumber(b.department_id),
        priority: b.priority || "MEDIUM",
        requestedBy: b.requested_by || null,
        remarks: b.remarks || null,
        status: b.status || "DRAFT",
        createdBy: req.user?.sub || null,
      },
    );
    const reqId = hdr.insertId;
    for (const d of details) {
      const itemId = toNumber(d.item_id);
      if (!itemId || !Number(d.qty_requested)) continue;
      await conn.execute(
        `INSERT INTO pm_material_requisition_items (requisition_id, item_id, qty_requested, qty_received, uom, batch_no) VALUES (:reqId, :itemId, :qtyReq, :qtyRecv, :uom, :batchNo)`,
        {
          reqId,
          itemId,
          qtyReq: Number(d.qty_requested) || 0,
          qtyRecv: Number(d.qty_received || 0),
          uom: d.uom || "PCS",
          batchNo: d.batch_no || null,
        },
      );
    }
    await conn.commit();
    res.status(201).json({ id: reqId, requisition_no: reqNo });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    next(err);
  } finally {
    conn.release();
  }
};

export const updatePMMaterialRequisition = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await ensurePMMaterialRequisitionTables(companyId, branchId);
    const b = req.body || {};
    const details = Array.isArray(b.details) ? b.details : [];
    await conn.beginTransaction();
    await conn.execute(
      `UPDATE pm_material_requisitions SET requisition_date = :reqDate, project_id = :projectId, warehouse_id = :warehouseId, department_id = :departmentId, priority = :priority, requested_by = :requestedBy, remarks = :remarks, status = :status WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      {
        id,
        companyId,
        branchId,
        reqDate: b.requisition_date || null,
        projectId: toNumber(b.project_id),
        warehouseId: toNumber(b.warehouse_id),
        departmentId: toNumber(b.department_id),
        priority: b.priority || "MEDIUM",
        requestedBy: b.requested_by || null,
        remarks: b.remarks || null,
        status: b.status || "DRAFT",
      },
    );
    if (b.status === "CANCELLED") {
      await conn.execute(
        `UPDATE pm_material_requisitions SET is_active = 'N', deleted_at = NOW() WHERE id = :id`,
        { id },
      );
    }
    await conn.execute(
      `DELETE FROM pm_material_requisition_items WHERE requisition_id = :id`,
      { id },
    );
    for (const d of details) {
      const itemId = toNumber(d.item_id);
      if (!itemId || !Number(d.qty_requested)) continue;
      await conn.execute(
        `INSERT INTO pm_material_requisition_items (requisition_id, item_id, qty_requested, qty_received, uom, batch_no) VALUES (:id, :itemId, :qtyReq, :qtyRecv, :uom, :batchNo)`,
        {
          id,
          itemId,
          qtyReq: Number(d.qty_requested) || 0,
          qtyRecv: Number(d.qty_received || 0),
          uom: d.uom || "PCS",
          batchNo: d.batch_no || null,
        },
      );
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    next(err);
  } finally {
    conn.release();
  }
};

export const submitPMMaterialRequisition = async (req, res, next) => {
  try {
    const { companyId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await query(
      `UPDATE pm_material_requisitions SET status = 'PENDING_APPROVAL' WHERE id = :id AND company_id = :companyId`,
      { id, companyId },
    );
    const wfByRoute = await query(
      `SELECT * FROM adm_workflows WHERE company_id = :companyId AND document_route = '/projects/material-requisitions' ORDER BY id ASC`,
      { companyId },
    );
    const wfDefs = await query(
      `SELECT * FROM adm_workflows WHERE company_id = :companyId AND (document_type = 'PM_MATERIAL_REQUISITION' OR document_type = 'PM Material Requisition') ORDER BY id ASC`,
      { companyId },
    );
    let activeWf = null;
    for (const list of [wfByRoute, wfDefs]) {
      for (const wf of list) {
        if (Number(wf.is_active) !== 1) continue;
        activeWf = wf;
        break;
      }
      if (activeWf) break;
    }
    if (!activeWf) {
      await query(
        `UPDATE pm_material_requisitions SET status = 'APPROVED' WHERE id = :id`,
        { id },
      );
      return res.json({ status: "APPROVED" });
    }
    const [firstStep] = await query(
      `SELECT * FROM adm_workflow_steps WHERE workflow_id = :wf ORDER BY step_order ASC LIMIT 1`,
      { wf: activeWf.id },
    );
    if (!firstStep || !firstStep.approver_user_id) {
      await query(
        `UPDATE pm_material_requisitions SET status = 'APPROVED' WHERE id = :id`,
        { id },
      );
      return res.json({ status: "APPROVED" });
    }
    await query(
      `INSERT INTO adm_document_workflows (company_id, workflow_id, document_id, document_type, current_step_order, status, assigned_to_user_id)
      VALUES (:companyId, :wfId, :docId, 'PM_MATERIAL_REQUISITION', :stepOrder, 'PENDING', :assignedTo)`,
      {
        companyId,
        wfId: activeWf.id,
        docId: id,
        stepOrder: firstStep.step_order,
        assignedTo: firstStep.approver_user_id,
      },
    );
    await query(
      `INSERT INTO adm_workflow_tasks (company_id, workflow_id, document_workflow_id, document_id, document_type, step_order, assigned_to_user_id, action)
      VALUES (:companyId, :wfId, LAST_INSERT_ID(), :docId, 'PM_MATERIAL_REQUISITION', :stepOrder, :assignedTo, 'PENDING')`,
      {
        companyId,
        wfId: activeWf.id,
        docId: id,
        stepOrder: firstStep.step_order,
        assignedTo: firstStep.approver_user_id,
      },
    );
    res.json({ status: "PENDING_APPROVAL" });
  } catch (err) {
    next(err);
  }
};

// ===== PM MATERIAL UTILIZATION CRUD =====
export const listPMMaterialUtilizations = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    await ensurePMMaterialUtilizationTables(companyId, branchId);
    const rows = await query(
      `SELECT u.id, u.utilization_no, u.utilization_date, u.project_id, u.task_id, u.task_summary, u.warehouse_id, u.remarks, u.status, u.created_by, u.created_at, u.updated_at,
      p.project_name, t.task_title, u2.username AS created_by_name, w.warehouse_name
      FROM pm_material_utilization u
      LEFT JOIN pm_projects p ON u.project_id = p.id
      LEFT JOIN pm_tasks t ON u.task_id = t.id
      LEFT JOIN adm_users u2 ON u.created_by = u2.id
      LEFT JOIN pm_temporal_warehouses w ON u.warehouse_id = w.id AND w.company_id = u.company_id
      WHERE u.company_id = :companyId AND u.branch_id = :branchId
      ORDER BY u.created_at DESC`,
      { companyId, branchId },
    );
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
};

export const getPMMaterialUtilizationById = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await ensurePMMaterialUtilizationTables(companyId, branchId);
    const [hdr] = await query(
      `SELECT u.*, p.project_name, t.task_title, u2.username AS created_by_name, w.warehouse_name
      FROM pm_material_utilization u
      LEFT JOIN pm_projects p ON u.project_id = p.id
      LEFT JOIN pm_tasks t ON u.task_id = t.id
      LEFT JOIN adm_users u2 ON u.created_by = u2.id
      LEFT JOIN pm_temporal_warehouses w ON u.warehouse_id = w.id AND w.company_id = u.company_id
      WHERE u.id = :id AND u.company_id = :companyId AND u.branch_id = :branchId LIMIT 1`,
      { id, companyId, branchId },
    );
    if (!hdr)
      throw httpError(404, "NOT_FOUND", "Material utilization not found");
    const details = await query(
      `SELECT d.*, i.item_code, i.item_name FROM pm_material_utilization_items d LEFT JOIN inv_items i ON d.item_id = i.id WHERE d.utilization_id = :id ORDER BY d.id`,
      { id },
    );
    res.json({ item: hdr, details });
  } catch (err) {
    next(err);
  }
};

export const createPMMaterialUtilization = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { companyId, branchId = null } = req.scope || {};
    await ensurePMMaterialUtilizationTables(companyId, branchId);
    const b = req.body || {};
    const warehouseId = toNumber(b.warehouse_id);
    if (!warehouseId) {
      throw httpError(
        400,
        "VALIDATION_ERROR",
        "Temporal storage location is required",
      );
    }
    const utilNo =
      b.utilization_no || (await nextPMUtilNo(companyId, branchId));
    const details = Array.isArray(b.details) ? b.details : [];
    await conn.beginTransaction();
    const [hdr] = await conn.execute(
      `INSERT INTO pm_material_utilization (company_id, branch_id, utilization_no, utilization_date, project_id, task_id, task_summary, location, warehouse_id, remarks, status, created_by)
      VALUES (:companyId, :branchId, :utilNo, :utilDate, :projectId, :taskId, :taskSummary, :location, :warehouseId, :remarks, :status, :createdBy)`,
      {
        companyId,
        branchId,
        utilNo,
        utilDate: b.utilization_date || new Date().toISOString().split("T")[0],
        projectId: toNumber(b.project_id),
        taskId: toNumber(b.task_id),
        taskSummary: b.task_summary || null,
        location: b.location || null,
        warehouseId: toNumber(b.warehouse_id) || null,
        remarks: b.remarks || null,
        status: b.status || "DRAFT",
        createdBy: req.user?.sub || null,
      },
    );
    const utilId = hdr.insertId;
    const userId = req.user?.sub || null;
    for (const d of details) {
      const itemId = toNumber(d.item_id);
      if (!itemId) continue;
      await conn.execute(
        `INSERT INTO pm_material_utilization_items (utilization_id, item_id, item_name, uom, required_qty, qty_in_stock, cost_price) VALUES (:utilId, :itemId, :itemName, :uom, :reqQty, :qtyInStock, :costPrice)`,
        {
          utilId,
          itemId,
          itemName: d.item_name || null,
          uom: d.uom || "PCS",
          reqQty: Number(d.required_qty || 0),
          qtyInStock: Number(d.qty_in_stock || 0),
          costPrice: Number(d.cost_price || 0),
        },
      );
    }
    if ((b.status || "DRAFT") === "POSTED" && warehouseId) {
      for (const d of details) {
        const itemId = toNumber(d.item_id);
        const reqQty = Number(d.required_qty || 0);
        if (!itemId || reqQty <= 0) continue;
        const [rows] = await conn.execute(
          `SELECT id, qty FROM inv_stock_balances
           WHERE company_id = :companyId AND branch_id = :branchId
             AND warehouse_id = :warehouseId AND item_id = :itemId
           LIMIT 1`,
          { companyId, branchId, warehouseId, itemId },
        );
        const currentQty = Number(rows?.[0]?.qty || 0);
        if (currentQty < reqQty) {
          throw httpError(
            400,
            "INSUFFICIENT_STOCK",
            `Insufficient stock for item ${d.item_name || itemId}: available ${currentQty}, required ${reqQty}`,
          );
        }
        await conn.execute(
          `UPDATE inv_stock_balances SET qty = GREATEST(qty - :reqQty, 0) WHERE id = :id`,
          { reqQty, id: rows[0].id },
        );
        await conn.execute(
          `INSERT INTO inv_stock_ledger
            (company_id, branch_id, warehouse_id, item_id, transaction_type,
             qty_change, source_ref, created_by)
           VALUES
            (:companyId, :branchId, :warehouseId, :itemId, :transactionType,
             :qtyChange, :sourceRef, :createdBy)`,
          {
            companyId,
            branchId,
            warehouseId,
            itemId,
            transactionType: "MATERIAL_UTILIZATION",
            qtyChange: -reqQty,
            sourceRef: utilNo,
            createdBy: userId,
          },
        );
      }
    }
    await conn.commit();
    res.status(201).json({ id: utilId, utilization_no: utilNo });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    next(err);
  } finally {
    conn.release();
  }
};

export const updatePMMaterialUtilization = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await ensurePMMaterialUtilizationTables(companyId, branchId);
    const b = req.body || {};
    const newWarehouseId = toNumber(b.warehouse_id);
    if (!newWarehouseId) {
      throw httpError(
        400,
        "VALIDATION_ERROR",
        "Temporal storage location is required",
      );
    }
    const details = Array.isArray(b.details) ? b.details : [];
    await conn.beginTransaction();
    const [oldHdr] = await conn.execute(
      `SELECT warehouse_id, status FROM pm_material_utilization WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      { id, companyId, branchId },
    );
    const oldStatus = oldHdr?.[0]?.status || "DRAFT";
    const oldWarehouseId = toNumber(oldHdr?.[0]?.warehouse_id);
    const [oldItems] = await conn.execute(
      `SELECT item_id, required_qty FROM pm_material_utilization_items WHERE utilization_id = :id`,
      { id },
    );
    const newStatus = b.status || "DRAFT";
    const utilNo =
      (
        await conn.execute(
          `SELECT utilization_no FROM pm_material_utilization WHERE id = :id`,
          { id },
        )
      )?.[0]?.[0]?.utilization_no || `MT-${id}`;
    const userId = req.user?.sub || null;
    if (oldStatus === "POSTED" && oldWarehouseId) {
      for (const d of oldItems) {
        const itemId = toNumber(d.item_id);
        const reqQty = Number(d.required_qty || 0);
        if (!itemId || reqQty <= 0) continue;
        await conn.execute(
          `UPDATE inv_stock_balances SET qty = qty + :reqQty
           WHERE company_id = :companyId AND branch_id = :branchId
             AND warehouse_id = :warehouseId AND item_id = :itemId
           LIMIT 1`,
          { companyId, branchId, warehouseId: oldWarehouseId, itemId, reqQty },
        );
        await conn.execute(
          `INSERT INTO inv_stock_ledger
            (company_id, branch_id, warehouse_id, item_id, transaction_type,
             qty_change, source_ref, created_by)
           VALUES
            (:companyId, :branchId, :warehouseId, :itemId, :transactionType,
             :qtyChange, :sourceRef, :createdBy)`,
          {
            companyId,
            branchId,
            warehouseId: oldWarehouseId,
            itemId,
            transactionType: "MATERIAL_UTILIZATION_REVERSAL",
            qtyChange: reqQty,
            sourceRef: utilNo,
            createdBy: userId,
          },
        );
      }
    }
    await conn.execute(
      `UPDATE pm_material_utilization SET utilization_date = :utilDate, project_id = :projectId, task_id = :taskId, task_summary = :taskSummary, location = :location, warehouse_id = :warehouseId, remarks = :remarks, status = :status WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      {
        id,
        companyId,
        branchId,
        utilDate: b.utilization_date || null,
        projectId: toNumber(b.project_id),
        taskId: toNumber(b.task_id),
        taskSummary: b.task_summary || null,
        location: b.location || null,
        warehouseId: newWarehouseId || null,
        remarks: b.remarks || null,
        status: newStatus,
      },
    );
    await conn.execute(
      `DELETE FROM pm_material_utilization_items WHERE utilization_id = :id`,
      { id },
    );
    for (const d of details) {
      const itemId = toNumber(d.item_id);
      if (!itemId) continue;
      await conn.execute(
        `INSERT INTO pm_material_utilization_items (utilization_id, item_id, item_name, uom, required_qty, qty_in_stock, cost_price) VALUES (:id, :itemId, :itemName, :uom, :reqQty, :qtyInStock, :costPrice)`,
        {
          id,
          itemId,
          itemName: d.item_name || null,
          uom: d.uom || "PCS",
          reqQty: Number(d.required_qty || 0),
          qtyInStock: Number(d.qty_in_stock || 0),
          costPrice: Number(d.cost_price || 0),
        },
      );
    }
    if (newStatus === "POSTED" && newWarehouseId) {
      for (const d of details) {
        const itemId = toNumber(d.item_id);
        const reqQty = Number(d.required_qty || 0);
        if (!itemId || reqQty <= 0) continue;
        const [rows] = await conn.execute(
          `SELECT id, qty FROM inv_stock_balances
           WHERE company_id = :companyId AND branch_id = :branchId
             AND warehouse_id = :warehouseId AND item_id = :itemId
           LIMIT 1`,
          { companyId, branchId, warehouseId: newWarehouseId, itemId },
        );
        const currentQty = Number(rows?.[0]?.qty || 0);
        if (currentQty < reqQty) {
          throw httpError(
            400,
            "INSUFFICIENT_STOCK",
            `Insufficient stock for item ${d.item_name || itemId}: available ${currentQty}, required ${reqQty}`,
          );
        }
        await conn.execute(
          `UPDATE inv_stock_balances SET qty = GREATEST(qty - :reqQty, 0) WHERE id = :id`,
          { reqQty, id: rows[0].id },
        );
        await conn.execute(
          `INSERT INTO inv_stock_ledger
            (company_id, branch_id, warehouse_id, item_id, transaction_type,
             qty_change, source_ref, created_by)
           VALUES
            (:companyId, :branchId, :warehouseId, :itemId, :transactionType,
             :qtyChange, :sourceRef, :createdBy)`,
          {
            companyId,
            branchId,
            warehouseId: newWarehouseId,
            itemId,
            transactionType: "MATERIAL_UTILIZATION",
            qtyChange: -reqQty,
            sourceRef: utilNo,
            createdBy: userId,
          },
        );
      }
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    next(err);
  } finally {
    conn.release();
  }
};

export const confirmPMMaterialUtilization = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await ensurePMMaterialUtilizationTables(companyId, branchId);
    await conn.beginTransaction();
    const [hdr] = await conn.execute(
      `SELECT id, status, warehouse_id, utilization_no FROM pm_material_utilization
       WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      { id, companyId, branchId },
    );
    if (!hdr?.length)
      throw httpError(404, "NOT_FOUND", "Material utilization not found");
    const current = hdr[0];
    if (current.status !== "DRAFT") {
      throw httpError(
        400,
        "VALIDATION_ERROR",
        `Cannot confirm utilization with status ${current.status}`,
      );
    }
    const warehouseId = toNumber(current.warehouse_id);
    if (!warehouseId) {
      throw httpError(
        400,
        "VALIDATION_ERROR",
        "Warehouse is required to confirm utilization",
      );
    }
    const [items] = await conn.execute(
      `SELECT item_id, item_name, required_qty FROM pm_material_utilization_items WHERE utilization_id = :id`,
      { id },
    );
    const userId = req.user?.sub || null;
    for (const d of items) {
      const itemId = toNumber(d.item_id);
      const reqQty = Number(d.required_qty || 0);
      if (!itemId || reqQty <= 0) continue;
      const [rows] = await conn.execute(
        `SELECT id, qty FROM inv_stock_balances
         WHERE company_id = :companyId AND branch_id = :branchId
           AND warehouse_id = :warehouseId AND item_id = :itemId
         LIMIT 1`,
        { companyId, branchId, warehouseId, itemId },
      );
      const currentQty = Number(rows?.[0]?.qty || 0);
      if (currentQty < reqQty) {
        throw httpError(
          400,
          "INSUFFICIENT_STOCK",
          `Insufficient stock for item ${d.item_name || itemId}: available ${currentQty}, required ${reqQty}`,
        );
      }
      await conn.execute(
        `UPDATE inv_stock_balances SET qty = GREATEST(qty - :reqQty, 0) WHERE id = :id`,
        { reqQty, id: rows[0].id },
      );
      await conn.execute(
        `INSERT INTO inv_stock_ledger
          (company_id, branch_id, warehouse_id, item_id, transaction_type,
           qty_change, source_ref, created_by)
         VALUES
          (:companyId, :branchId, :warehouseId, :itemId, :transactionType,
           :qtyChange, :sourceRef, :createdBy)`,
        {
          companyId,
          branchId,
          warehouseId,
          itemId,
          transactionType: "MATERIAL_UTILIZATION",
          qtyChange: -reqQty,
          sourceRef: current.utilization_no,
          createdBy: userId,
        },
      );
    }
    await conn.execute(
      `UPDATE pm_material_utilization SET status = 'POSTED' WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      { id, companyId, branchId },
    );
    await conn.commit();
    res.json({ ok: true, status: "POSTED" });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    next(err);
  } finally {
    conn.release();
  }
};

// ===== PM MATERIALS RECEIPT CRUD =====
export const listPMMaterialReceipts = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    await ensurePMMaterialReceiptTables(companyId, branchId);
    const rows = await query(
      `SELECT r.*, w.warehouse_name, d.name AS department_name, u.username AS created_by_name
      FROM pm_material_receipts r
      LEFT JOIN pm_temporal_warehouses w ON r.warehouse_id = w.id AND w.company_id = r.company_id
      LEFT JOIN adm_departments d ON r.department_id = d.id
      LEFT JOIN adm_users u ON r.created_by = u.id
      WHERE r.company_id = :companyId AND r.branch_id = :branchId
      ORDER BY r.created_at DESC`,
      { companyId, branchId },
    );
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
};

export const getPMMaterialReceiptById = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await ensurePMMaterialReceiptTables(companyId, branchId);
    const [hdr] = await query(
      `SELECT r.*, w.warehouse_name, d.name AS department_name, u.username AS created_by_name
      FROM pm_material_receipts r
      LEFT JOIN pm_temporal_warehouses w ON r.warehouse_id = w.id AND w.company_id = r.company_id
      LEFT JOIN adm_departments d ON r.department_id = d.id
      LEFT JOIN adm_users u ON r.created_by = u.id
      WHERE r.id = :id AND r.company_id = :companyId AND r.branch_id = :branchId LIMIT 1`,
      { id, companyId, branchId },
    );
    if (!hdr) throw httpError(404, "NOT_FOUND", "Materials receipt not found");
    const details = await query(
      `SELECT d.* FROM pm_material_receipt_items d WHERE d.receipt_id = :id ORDER BY d.id`,
      { id },
    );
    res.json({ item: hdr, details });
  } catch (err) {
    next(err);
  }
};

export const createPMMaterialReceipt = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { companyId, branchId, branchIdsStr = "" } = req.scope;
    await ensurePMMaterialReceiptTables(companyId, branchId);
    const b = req.body || {};
    const rcptNo = b.receipt_no || (await nextPMRcptNo(companyId, branchId));
    const details = Array.isArray(b.details) ? b.details : [];
    await conn.beginTransaction();
    const [hdr] = await conn.execute(
      `INSERT INTO pm_material_receipts (company_id, branch_id, receipt_no, receipt_date, issue_id, source_doc, warehouse_id, department_id, remarks, status, created_by)
      VALUES (:companyId, :branchId, :rcptNo, :rcptDate, :issueId, :sourceDoc, :warehouseId, :departmentId, :remarks, :status, :createdBy)`,
      {
        companyId,
        branchId,
        rcptNo,
        rcptDate: b.receipt_date || new Date().toISOString().split("T")[0],
        issueId: toNumber(b.issue_id),
        sourceDoc: b.source_doc || null,
        warehouseId: toNumber(b.warehouse_id),
        departmentId: toNumber(b.department_id),
        remarks: b.remarks || null,
        status: b.status || "DRAFT",
        createdBy: req.user?.sub || null,
      },
    );
    const rcptId = hdr.insertId;
    const warehouseId = toNumber(b.warehouse_id);
    const userId = req.user?.sub || null;
    const issueId = toNumber(b.issue_id);
    for (const d of details) {
      const itemId = toNumber(d.item_id);
      if (!itemId) continue;
      const receiptQty = Number(d.receipt_qty || 0);
      await conn.execute(
        `INSERT INTO pm_material_receipt_items (receipt_id, item_id, item_name, uom, transfer_qty, receipt_qty, batch_no, expiry_date, mfg_date) VALUES (:rcptId, :itemId, :itemName, :uom, :transferQty, :receiptQty, :batchNo, :expiryDate, :mfgDate)`,
        {
          rcptId,
          itemId,
          itemName: d.item_name || null,
          uom: d.uom || "PCS",
          transferQty: Number(d.transfer_qty || 0),
          receiptQty,
          batchNo: d.batch_no || null,
          expiryDate: d.expiry_date || null,
          mfgDate: d.mfg_date || null,
        },
      );
      if ((b.status || "DRAFT") === "POSTED" && receiptQty > 0 && warehouseId) {
        await recordMovementTx(conn, {
          companyId,
          branchId,
          branchIdsStr,
          warehouseId,
          itemId,
          transactionType: "MATERIAL_RECEIPT",
          qtyChange: receiptQty,
          batchNo: d.batch_no || null,
          expiryDate: d.expiry_date || null,
          sourceRef: rcptNo,
          createdBy: userId,
          sourceType: "PM_MATERIAL_RECEIPT",
          sourceId: rcptId,
        });
      }
    }
    if (["POSTED", "APPROVED"].includes(b.status || "DRAFT") && issueId) {
      const [issueRows] = await conn.execute(
        `SELECT warehouse_id FROM inv_issue_to_requirement WHERE id = :issueId AND company_id = :companyId AND branch_id = :branchId`,
        { issueId, companyId, branchId },
      );
      const issueWhId = toNumber(issueRows?.[0]?.warehouse_id);
      if (issueWhId) {
        for (const d of details) {
          const itemId = toNumber(d.item_id);
          const receiptQty = Number(d.receipt_qty || 0);
          if (!itemId || receiptQty <= 0) continue;
          await conn.execute(
            `UPDATE inv_stock_balances SET reserved_qty = GREATEST(COALESCE(reserved_qty, 0) - :receiptQty, 0)
             WHERE company_id = :companyId AND branch_id = :branchId
               AND warehouse_id = :warehouseId AND item_id = :itemId
             LIMIT 1`,
            { companyId, branchId, warehouseId: issueWhId, itemId, receiptQty },
          );
        }
      }
    }
    await conn.commit();
    res.status(201).json({ id: rcptId, receipt_no: rcptNo });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    next(err);
  } finally {
    conn.release();
  }
};

export const updatePMMaterialReceipt = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { companyId, branchId, branchIdsStr = "" } = req.scope;
    const id = toNumber(req.params.id);
    if (!id) throw httpError(400, "VALIDATION_ERROR", "Invalid id");
    await ensurePMMaterialReceiptTables(companyId, branchId);
    const b = req.body || {};
    const details = Array.isArray(b.details) ? b.details : [];
    await conn.beginTransaction();

    const [oldHdr] = await conn.execute(
      `SELECT warehouse_id, status, issue_id FROM pm_material_receipts WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      { id, companyId, branchId },
    );
    const oldItems = await conn.execute(
      `SELECT item_id, receipt_qty, batch_no, expiry_date FROM pm_material_receipt_items WHERE receipt_id = :id`,
      { id },
    );
    const oldStatus = oldHdr?.[0]?.status;
    const oldWarehouseId = toNumber(oldHdr?.[0]?.warehouse_id);
    const oldIssueId = toNumber(oldHdr?.[0]?.issue_id);
    const userId = req.user?.sub || null;
    const newStatus = b.status || "DRAFT";
    const newIssueId = toNumber(b.issue_id);

    if (["POSTED", "APPROVED"].includes(oldStatus) && oldIssueId) {
      const [oldIssueRows] = await conn.execute(
        `SELECT warehouse_id FROM inv_issue_to_requirement WHERE id = :issueId AND company_id = :companyId AND branch_id = :branchId`,
        { issueId: oldIssueId, companyId, branchId },
      );
      const oldIssueWhId = toNumber(oldIssueRows?.[0]?.warehouse_id);
      if (oldIssueWhId) {
        for (const old of oldItems) {
          const oldItemId = toNumber(old.item_id);
          const oldQty = Number(old.receipt_qty || 0);
          if (!oldItemId || oldQty <= 0) continue;
          await conn.execute(
            `UPDATE inv_stock_balances SET reserved_qty = COALESCE(reserved_qty, 0) + :oldQty
             WHERE company_id = :companyId AND branch_id = :branchId
               AND warehouse_id = :warehouseId AND item_id = :itemId`,
            {
              companyId,
              branchId,
              warehouseId: oldIssueWhId,
              itemId: oldItemId,
              oldQty,
            },
          );
        }
      }
    }

    if (oldStatus === "POSTED" && oldWarehouseId) {
      for (const old of oldItems) {
        const oldItemId = toNumber(old.item_id);
        const oldQty = Number(old.receipt_qty || 0);
        if (!oldItemId || oldQty <= 0) continue;
        await recordMovementTx(conn, {
          companyId,
          branchId,
          branchIdsStr,
          warehouseId: oldWarehouseId,
          itemId: oldItemId,
          transactionType: "MATERIAL_RECEIPT_REVERSAL",
          qtyChange: -oldQty,
          batchNo: old.batch_no || null,
          expiryDate: old.expiry_date || null,
          sourceRef: `REVERSAL-RECEIPT-${id}`,
          createdBy: userId,
          sourceType: "PM_MATERIAL_RECEIPT",
          sourceId: id,
        });
      }
    }

    await conn.execute(
      `UPDATE pm_material_receipts SET receipt_date = :rcptDate, issue_id = :issueId, source_doc = :sourceDoc, warehouse_id = :warehouseId, department_id = :departmentId, remarks = :remarks, status = :status WHERE id = :id AND company_id = :companyId AND branch_id = :branchId`,
      {
        id,
        companyId,
        branchId,
        rcptDate: b.receipt_date || null,
        issueId: toNumber(b.issue_id),
        sourceDoc: b.source_doc || null,
        warehouseId: toNumber(b.warehouse_id),
        departmentId: toNumber(b.department_id),
        remarks: b.remarks || null,
        status: newStatus,
      },
    );
    await conn.execute(
      `DELETE FROM pm_material_receipt_items WHERE receipt_id = :id`,
      { id },
    );
    const warehouseId = toNumber(b.warehouse_id);
    for (const d of details) {
      const itemId = toNumber(d.item_id);
      if (!itemId) continue;
      const receiptQty = Number(d.receipt_qty || 0);
      await conn.execute(
        `INSERT INTO pm_material_receipt_items (receipt_id, item_id, item_name, uom, transfer_qty, receipt_qty, batch_no, expiry_date, mfg_date) VALUES (:id, :itemId, :itemName, :uom, :transferQty, :receiptQty, :batchNo, :expiryDate, :mfgDate)`,
        {
          id,
          itemId,
          itemName: d.item_name || null,
          uom: d.uom || "PCS",
          transferQty: Number(d.transfer_qty || 0),
          receiptQty,
          batchNo: d.batch_no || null,
          expiryDate: d.expiry_date || null,
          mfgDate: d.mfg_date || null,
        },
      );
      if (newStatus === "POSTED" && receiptQty > 0 && warehouseId) {
        await recordMovementTx(conn, {
          companyId,
          branchId,
          branchIdsStr,
          warehouseId,
          itemId,
          transactionType: "MATERIAL_RECEIPT",
          qtyChange: receiptQty,
          batchNo: d.batch_no || null,
          expiryDate: d.expiry_date || null,
          sourceRef: `RECEIPT-${id}`,
          createdBy: userId,
          sourceType: "PM_MATERIAL_RECEIPT",
          sourceId: id,
        });
      }
    }
    if (["POSTED", "APPROVED"].includes(newStatus) && newIssueId) {
      const [newIssueRows] = await conn.execute(
        `SELECT warehouse_id FROM inv_issue_to_requirement WHERE id = :issueId AND company_id = :companyId AND branch_id = :branchId`,
        { issueId: newIssueId, companyId, branchId },
      );
      const newIssueWhId = toNumber(newIssueRows?.[0]?.warehouse_id);
      if (newIssueWhId) {
        for (const d of details) {
          const itemId = toNumber(d.item_id);
          const receiptQty = Number(d.receipt_qty || 0);
          if (!itemId || receiptQty <= 0) continue;
          await conn.execute(
            `UPDATE inv_stock_balances SET reserved_qty = GREATEST(COALESCE(reserved_qty, 0) - :receiptQty, 0)
             WHERE company_id = :companyId AND branch_id = :branchId
               AND warehouse_id = :warehouseId AND item_id = :itemId
             LIMIT 1`,
            {
              companyId,
              branchId,
              warehouseId: newIssueWhId,
              itemId,
              receiptQty,
            },
          );
        }
      }
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (err) {
    try {
      await conn.rollback();
    } catch {}
    next(err);
  } finally {
    conn.release();
  }
};

// ===== AUTO-POPULATE FROM ISSUE TO REQUIREMENT =====
export const getPendingIssueToRequirement = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const departmentId = req.query.department_id
      ? toNumber(req.query.department_id)
      : null;
    await ensurePMMaterialReceiptTables(companyId, branchId);

    let sql = `SELECT i.id, i.issue_no, i.issue_date, i.warehouse_id, i.department_id, i.issued_to, i.status, i.remarks,
      w.warehouse_name, d.name AS department_name
      FROM inv_issue_to_requirement i
      LEFT JOIN inv_warehouses w ON i.warehouse_id = w.id
      LEFT JOIN adm_departments d ON i.department_id = d.id
      WHERE i.company_id = :companyId AND i.branch_id = :branchId
      AND i.status IN ('POSTED', 'ISSUED')
      AND i.id NOT IN (SELECT issue_id FROM pm_material_receipts WHERE issue_id IS NOT NULL)
      AND i.id NOT IN (SELECT issue_id FROM prod_material_receipts WHERE issue_id IS NOT NULL)`;

    const params = { companyId, branchId };

    if (departmentId) {
      sql += ` AND i.department_id = :departmentId`;
      params.departmentId = departmentId;
    }

    sql += ` ORDER BY i.issue_date DESC`;

    const rows = await query(sql, params);
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
};

export const getIssueToRequirementDetail = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const issueId = toNumber(req.params.issueId);
    if (!issueId) throw httpError(400, "VALIDATION_ERROR", "Invalid issue id");
    const [hdr] = await query(
      `SELECT i.*, w.warehouse_name, d.name AS department_name
      FROM inv_issue_to_requirement i
      LEFT JOIN inv_warehouses w ON i.warehouse_id = w.id
      LEFT JOIN adm_departments d ON i.department_id = d.id
      WHERE i.id = :issueId AND i.company_id = :companyId AND i.branch_id = :branchId LIMIT 1`,
      { issueId, companyId, branchId },
    );
    if (!hdr) throw httpError(404, "NOT_FOUND", "Issue not found");
    const details = await query(
      `SELECT d.*, i.item_code, i.item_name, i.uom, sb.qty AS stock_qty
      FROM inv_issue_to_requirement_details d
      LEFT JOIN inv_items i ON d.item_id = i.id
      LEFT JOIN (SELECT item_id, SUM(qty) AS qty FROM inv_stock_balances WHERE company_id = :companyId GROUP BY item_id) sb ON sb.item_id = d.item_id
      WHERE d.issue_id = :issueId ORDER BY d.id`,
      { issueId, companyId },
    );
    res.json({ item: hdr, details });
  } catch (err) {
    next(err);
  }
};

// ===== PROJECT STATUS REPORT =====
export const getProjectStatusReport = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
    const projectId = req.query.project_id ? toNumber(req.query.project_id) : null;
    const statusFilter = req.query.status && req.query.status !== "ALL" ? String(req.query.status).trim() : null;

    await ensureProjectTables(companyId, branchId);

    // List of all projects for dropdown filter
    const projectsList = await query(
      `SELECT id, project_code, project_name, project_status, client_name 
       FROM pm_projects 
       WHERE (company_id = :companyId OR :companyId IS NULL OR company_id IS NULL OR company_id = 0)
       ORDER BY project_name ASC`,
      { companyId }
    );

    let whereClause = `WHERE (p.company_id = :companyId OR :companyId IS NULL OR p.company_id IS NULL OR p.company_id = 0)
      AND (:branchIdsStr = '' OR p.branch_id IS NULL OR p.branch_id = 0 OR FIND_IN_SET(p.branch_id, :branchIdsStr))`;

    if (projectId) {
      whereClause += ` AND p.id = :projectId`;
    }
    if (statusFilter) {
      whereClause += ` AND p.project_status = :statusFilter`;
    }

    const rows = await query(
      `SELECT p.id, p.project_code, p.project_name, p.project_status, p.project_type,
              p.start_date, p.end_date, p.actual_start_date, p.actual_end_date,
              p.manager_name, p.client_name, COALESCE(p.currency, 'GHS') AS currency,
              COALESCE(p.budget, 0) AS budget,
              COALESCE(p.contract_sum, 0) AS contract_sum,
              COALESCE(p.revised_contract_sum, p.contract_sum, 0) AS revised_contract_sum,
              COALESCE(p.completion_percent, 0) AS project_completion_percent,

              -- Live Task Metrics
              COUNT(DISTINCT t.id) AS total_tasks,
              COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id END) AS completed_tasks,
              COUNT(DISTINCT CASE WHEN t.status = 'IN_PROGRESS' THEN t.id END) AS in_progress_tasks,
              COUNT(DISTINCT CASE WHEN t.status = 'BLOCKED' THEN t.id END) AS blocked_tasks,
              COUNT(DISTINCT CASE WHEN t.status = 'PENDING' THEN t.id END) AS pending_tasks,
              COUNT(DISTINCT CASE WHEN t.is_critical = 1 THEN t.id END) AS critical_tasks,
              COUNT(DISTINCT CASE WHEN t.status != 'COMPLETED' AND t.end_date < CURDATE() THEN t.id END) AS overdue_tasks,
              COALESCE(AVG(t.completion_percent), 0) AS avg_task_completion,
              COALESCE(SUM(t.estimated_hours), 0) AS total_estimated_hours,
              COALESCE(SUM(t.actual_hours), 0) AS total_actual_hours,

              -- Live Milestone Metrics
              COALESCE((SELECT COUNT(*) FROM pm_milestones m WHERE m.project_id = p.id), 0) AS total_milestones,
              COALESCE((SELECT COUNT(*) FROM pm_milestones m WHERE m.project_id = p.id AND (m.status = 'ACHIEVED' OR m.status = 'COMPLETED')), 0) AS achieved_milestones,
              COALESCE((SELECT COUNT(*) FROM pm_milestones m WHERE m.project_id = p.id AND m.target_date < CURDATE() AND (m.status != 'ACHIEVED' AND m.status != 'COMPLETED')), 0) AS overdue_milestones,

              -- Live Financial Actuals (Direct Expenses)
              COALESCE((SELECT SUM(amount) FROM pm_expenses e WHERE e.project_id = p.id), 0) AS actual_expenses,

              -- Live Financial Billings / Income
              COALESCE((SELECT SUM(amount) FROM pm_income inc WHERE inc.project_id = p.id), 0) AS total_income,

              -- Live Approved Variations
              COALESCE((SELECT SUM(COALESCE(amount_approved, cost_impact, 0)) FROM pm_variations v WHERE v.project_id = p.id AND v.status = 'APPROVED'), 0) AS approved_variations_amount,
              COALESCE((SELECT COUNT(*) FROM pm_variations v WHERE v.project_id = p.id AND v.status = 'APPROVED'), 0) AS approved_variations_count

       FROM pm_projects p
       LEFT JOIN pm_tasks t ON t.project_id = p.id
       ${whereClause}
       GROUP BY p.id
       ORDER BY p.id DESC`,
      { companyId, branchId, branchIdsStr, projectId, statusFilter }
    );

    const now = new Date();
    const items = rows.map((p) => {
      const budget = Number(p.budget || 0);
      const actualExp = Number(p.actual_expenses || 0);
      const remainingBudget = budget - actualExp;
      const budgetVariance = budget > 0 ? ((budget - actualExp) / budget) * 100 : 0;
      const burnRate = budget > 0 ? (actualExp / budget) * 100 : 0;
      const totalTasks = Number(p.total_tasks || 0);
      const completedTasks = Number(p.completed_tasks || 0);
      const overdueTasks = Number(p.overdue_tasks || 0);
      const blockedTasks = Number(p.blocked_tasks || 0);
      const completionPct = Number(p.project_completion_percent || p.avg_task_completion || 0);

      // Determine live Schedule Status
      let scheduleStatus = "ON_TRACK";
      let scheduleStatusLabel = "On Track";
      let scheduleStatusColor = "emerald";

      const endDate = p.end_date ? new Date(p.end_date) : null;
      if (completionPct >= 100 || p.project_status === "COMPLETED") {
        scheduleStatus = "COMPLETED";
        scheduleStatusLabel = "Completed";
        scheduleStatusColor = "emerald";
      } else if (endDate && endDate < now) {
        scheduleStatus = "DELAYED";
        scheduleStatusLabel = "Schedule Delayed";
        scheduleStatusColor = "rose";
      } else if (overdueTasks > 0 || blockedTasks > 0) {
        scheduleStatus = "AT_RISK";
        scheduleStatusLabel = "At Risk";
        scheduleStatusColor = "amber";
      }

      // Determine Budget Status
      let budgetStatus = "ON_BUDGET";
      let budgetStatusLabel = "Within Budget";
      let budgetStatusColor = "emerald";
      if (actualExp > budget && budget > 0) {
        budgetStatus = "OVER_BUDGET";
        budgetStatusLabel = "Budget Overrun";
        budgetStatusColor = "rose";
      } else if (burnRate > 85 && completionPct < 70) {
        budgetStatus = "HIGH_BURN";
        budgetStatusLabel = "High Burn Rate";
        budgetStatusColor = "amber";
      }

      return {
        ...p,
        remaining_budget: remainingBudget,
        budget_variance_pct: budgetVariance.toFixed(1),
        burn_rate_pct: burnRate.toFixed(1),
        schedule_status: scheduleStatus,
        schedule_status_label: scheduleStatusLabel,
        schedule_status_color: scheduleStatusColor,
        budget_status: budgetStatus,
        budget_status_label: budgetStatusLabel,
        budget_status_color: budgetStatusColor,
      };
    });

    const summary = {
      total_projects: items.length,
      total_budget: items.reduce((s, p) => s + Number(p.budget || 0), 0),
      total_expenses: items.reduce((s, p) => s + Number(p.actual_expenses || 0), 0),
      total_income: items.reduce((s, p) => s + Number(p.total_income || 0), 0),
      avg_completion: items.length
        ? (items.reduce((s, p) => s + Number(p.completion_percent || p.avg_task_completion || 0), 0) / items.length).toFixed(1)
        : 0,
      total_tasks: items.reduce((s, p) => s + Number(p.total_tasks || 0), 0),
      total_completed_tasks: items.reduce((s, p) => s + Number(p.completed_tasks || 0), 0),
      total_overdue_tasks: items.reduce((s, p) => s + Number(p.overdue_tasks || 0), 0),
      total_blocked_tasks: items.reduce((s, p) => s + Number(p.blocked_tasks || 0), 0),
      delayed_projects: items.filter((p) => p.schedule_status === "DELAYED").length,
      at_risk_projects: items.filter((p) => p.schedule_status === "AT_RISK").length,
      on_track_projects: items.filter((p) => p.schedule_status === "ON_TRACK" || p.schedule_status === "COMPLETED").length,
    };

    res.json({ items, projects: projectsList, summary });
  } catch (err) {
    next(err);
  }
};

export const getProjectIncomeReport = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
    const projectId = req.query.project_id
      ? toNumber(req.query.project_id)
      : null;
    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;

    const projects = await query(
      `SELECT p.id, p.project_code, p.project_name
      FROM pm_projects p
      WHERE p.company_id = :companyId AND (:branchIdsStr = '' OR FIND_IN_SET(p.branch_id, :branchIdsStr))
      ORDER BY p.project_name`,
      { companyId, branchIdsStr },
    );

    const items = await query(
      `SELECT v.id, v.voucher_no, v.voucher_date,
        COALESCE((SELECT l.description FROM fin_voucher_lines l WHERE l.voucher_id = v.id AND l.company_id = v.company_id AND NULLIF(TRIM(l.description), '') IS NOT NULL ORDER BY l.line_no ASC LIMIT 1), v.narration) AS description,
        vt.name AS voucher_type_name, c.code AS currency_code, v.total_debit AS amount, v.status, p.project_name
      FROM fin_vouchers v
      JOIN fin_voucher_types vt ON vt.id = v.voucher_type_id AND vt.company_id = v.company_id
      LEFT JOIN fin_currencies c ON c.id = v.currency_id AND c.company_id = v.company_id
      LEFT JOIN pm_projects p ON p.id = v.project_id
      WHERE v.company_id = :companyId AND vt.code IN ('RV', 'RECV')
        AND v.project_id IS NOT NULL
        AND (:projectId IS NULL OR v.project_id = :projectId)
        AND (:fromDate IS NULL OR v.voucher_date >= :fromDate)
        AND (:toDate IS NULL OR v.voucher_date <= :toDate)
        AND (:branchIdsStr = '' OR FIND_IN_SET(v.branch_id, :branchIdsStr))
      ORDER BY v.voucher_date DESC, v.id DESC`,
      { companyId, branchId, branchIdsStr, projectId, fromDate, toDate },
    );

    const summary = {
      count: items.length,
      total: items.reduce((s, v) => s + Number(v.amount || 0), 0),
    };
    res.json({ projects, items, summary });
  } catch (err) {
    next(err);
  }
};

export const getProjectExpenseReport = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
    const projectId = req.query.project_id
      ? toNumber(req.query.project_id)
      : null;
    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;

    const projects = await query(
      `SELECT p.id, p.project_code, p.project_name
      FROM pm_projects p
      WHERE p.company_id = :companyId AND (:branchIdsStr = '' OR FIND_IN_SET(p.branch_id, :branchIdsStr))
      ORDER BY p.project_name`,
      { companyId, branchIdsStr },
    );

    const items = await query(
      `SELECT v.id, v.voucher_no, v.voucher_date,
        COALESCE((SELECT l.description FROM fin_voucher_lines l WHERE l.voucher_id = v.id AND l.company_id = v.company_id AND NULLIF(TRIM(l.description), '') IS NOT NULL ORDER BY l.line_no ASC LIMIT 1), v.narration) AS description,
        vt.name AS voucher_type_name, c.code AS currency_code, v.total_debit AS amount, v.status, p.project_name
      FROM fin_vouchers v
      JOIN fin_voucher_types vt ON vt.id = v.voucher_type_id AND vt.company_id = v.company_id
      LEFT JOIN fin_currencies c ON c.id = v.currency_id AND c.company_id = v.company_id
      LEFT JOIN pm_projects p ON p.id = v.project_id
      WHERE v.company_id = :companyId AND vt.code IN ('PV', 'PAYV')
        AND v.project_id IS NOT NULL
        AND (:projectId IS NULL OR v.project_id = :projectId)
        AND (:fromDate IS NULL OR v.voucher_date >= :fromDate)
        AND (:toDate IS NULL OR v.voucher_date <= :toDate)
        AND (:branchIdsStr = '' OR FIND_IN_SET(v.branch_id, :branchIdsStr))
      ORDER BY v.voucher_date DESC, v.id DESC`,
      { companyId, branchId, branchIdsStr, projectId, fromDate, toDate },
    );

    const summary = {
      count: items.length,
      total: items.reduce((s, v) => s + Number(v.amount || 0), 0),
    };
    res.json({ projects, items, summary });
  } catch (err) {
    next(err);
  }
};

export const getProjectExpenseIncomeReport = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
    const projectId = req.query.project_id
      ? toNumber(req.query.project_id)
      : null;
    const fromDate = req.query.from ? String(req.query.from) : null;
    const toDate = req.query.to ? String(req.query.to) : null;

    // 1. Fetch projects in scope
    const projects = await query(
      `SELECT p.id, p.project_code, p.project_name, p.client_name, p.project_status, p.budget, p.start_date, p.end_date
       FROM pm_projects p
       WHERE p.company_id = :companyId AND (:branchIdsStr = '' OR FIND_IN_SET(p.branch_id, :branchIdsStr))
         AND (:projectId IS NULL OR p.id = :projectId)
       ORDER BY p.project_name`,
      { companyId, branchIdsStr, projectId },
    );

    const allProjects = await query(
      `SELECT p.id, p.project_code, p.project_name
       FROM pm_projects p
       WHERE p.company_id = :companyId AND (:branchIdsStr = '' OR FIND_IN_SET(p.branch_id, :branchIdsStr))
       ORDER BY p.project_name`,
      { companyId, branchIdsStr },
    );

    // 2. Fetch income records (Receipt Vouchers 'RV', 'RECV')
    const incomeItems = await query(
      `SELECT v.id, v.voucher_no, v.voucher_date,
          COALESCE((SELECT l.description FROM fin_voucher_lines l WHERE l.voucher_id = v.id AND l.company_id = v.company_id AND NULLIF(TRIM(l.description), '') IS NOT NULL ORDER BY l.line_no ASC LIMIT 1), v.narration) AS description,
          vt.name AS voucher_type_name, c.code AS currency_code, v.total_credit AS amount, v.status,
          v.project_id, p.project_code, p.project_name
       FROM fin_vouchers v
       JOIN fin_voucher_types vt ON vt.id = v.voucher_type_id AND vt.company_id = v.company_id
       LEFT JOIN fin_currencies c ON c.id = v.currency_id AND c.company_id = v.company_id
       LEFT JOIN pm_projects p ON p.id = v.project_id
       WHERE v.company_id = :companyId AND vt.code IN ('RV', 'RECV')
         AND v.project_id IS NOT NULL
         AND (:projectId IS NULL OR v.project_id = :projectId)
         AND (:fromDate IS NULL OR v.voucher_date >= :fromDate)
         AND (:toDate IS NULL OR v.voucher_date <= :toDate)
         AND (:branchIdsStr = '' OR FIND_IN_SET(v.branch_id, :branchIdsStr))
       ORDER BY v.voucher_date DESC, v.id DESC`,
      { companyId, branchId, branchIdsStr, projectId, fromDate, toDate },
    );

    // 3. Fetch expense records (Payment Vouchers 'PV', 'PAYV')
    const expenseItems = await query(
      `SELECT v.id, v.voucher_no, v.voucher_date,
          COALESCE((SELECT l.description FROM fin_voucher_lines l WHERE l.voucher_id = v.id AND l.company_id = v.company_id AND NULLIF(TRIM(l.description), '') IS NOT NULL ORDER BY l.line_no ASC LIMIT 1), v.narration) AS description,
          vt.name AS voucher_type_name, c.code AS currency_code, v.total_debit AS amount, v.status,
          v.project_id, p.project_code, p.project_name
       FROM fin_vouchers v
       JOIN fin_voucher_types vt ON vt.id = v.voucher_type_id AND vt.company_id = v.company_id
       LEFT JOIN fin_currencies c ON c.id = v.currency_id AND c.company_id = v.company_id
       LEFT JOIN pm_projects p ON p.id = v.project_id
       WHERE v.company_id = :companyId AND vt.code IN ('PV', 'PAYV')
         AND v.project_id IS NOT NULL
         AND (:projectId IS NULL OR v.project_id = :projectId)
         AND (:fromDate IS NULL OR v.voucher_date >= :fromDate)
         AND (:toDate IS NULL OR v.voucher_date <= :toDate)
         AND (:branchIdsStr = '' OR FIND_IN_SET(v.branch_id, :branchIdsStr))
       ORDER BY v.voucher_date DESC, v.id DESC`,
      { companyId, branchId, branchIdsStr, projectId, fromDate, toDate },
    );

    // 4. Per-project P&L aggregation (Surplus / Deficit)
    const projectSummary = projects.map((p) => {
      const pIncome = incomeItems.filter(
        (i) => Number(i.project_id) === Number(p.id),
      );
      const pExpense = expenseItems.filter(
        (e) => Number(e.project_id) === Number(p.id),
      );
      const totalIncome = pIncome.reduce(
        (s, x) => s + Number(x.amount || 0),
        0,
      );
      const totalExpense = pExpense.reduce(
        (s, x) => s + Number(x.amount || 0),
        0,
      );
      const netBalance = totalIncome - totalExpense;
      const margin =
        totalIncome > 0
          ? (netBalance / totalIncome) * 100
          : netBalance === 0
            ? 0
            : -100;

      return {
        id: p.id,
        project_code: p.project_code,
        project_name: p.project_name,
        client_name: p.client_name,
        project_status: p.project_status,
        budget: Number(p.budget || 0),
        total_income: totalIncome,
        total_expense: totalExpense,
        net_balance: netBalance,
        status:
          netBalance > 0 ? "SURPLUS" : netBalance < 0 ? "DEFICIT" : "BALANCED",
        margin_percent: margin,
        income_count: pIncome.length,
        expense_count: pExpense.length,
      };
    });

    const totalIncome = incomeItems.reduce(
      (s, x) => s + Number(x.amount || 0),
      0,
    );
    const totalExpense = expenseItems.reduce(
      (s, x) => s + Number(x.amount || 0),
      0,
    );
    const netBalance = totalIncome - totalExpense;

    const overallSummary = {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_balance: netBalance,
      status:
        netBalance > 0 ? "SURPLUS" : netBalance < 0 ? "DEFICIT" : "BALANCED",
      margin_percent: totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0,
      total_projects: projects.length,
      income_vouchers_count: incomeItems.length,
      expense_vouchers_count: expenseItems.length,
    };

    res.json({
      projects,
      allProjects,
      projectSummary,
      overallSummary,
      incomeItems,
      expenseItems,
    });
  } catch (err) {
    next(err);
  }
};

export const getTaskExecutionAnalyticsReport = async (req, res, next) => {
  try {
    const { companyId, branchId = null, branchIdsStr = "" } = req.scope || {};
    const projectId = req.query.project_id
      ? toNumber(req.query.project_id)
      : null;
    const priority = req.query.priority
      ? String(req.query.priority).toUpperCase()
      : null;
    const status = req.query.status
      ? String(req.query.status).toUpperCase()
      : null;

    await ensureProjectTables(companyId, branchId);

    const projects = await query(
      `SELECT p.id, p.project_code, p.project_name
       FROM pm_projects p
       WHERE p.company_id = :companyId AND (:branchIdsStr = '' OR FIND_IN_SET(p.branch_id, :branchIdsStr))
       ORDER BY p.project_name`,
      { companyId, branchIdsStr },
    );

    let sql = `SELECT t.*, 
                      COALESCE(NULLIF(p.project_name, ''), NULLIF(CONCAT('Project #', t.project_id), 'Project #null'), 'General Project') AS project_name, 
                      p.project_code, 
                      COALESCE(NULLIF(t.assigned_to_name, ''), u.username, u.full_name, 'Unassigned') AS assigned_to_name
               FROM pm_tasks t
               LEFT JOIN pm_projects p ON t.project_id = p.id
               LEFT JOIN adm_users u ON u.id = t.assigned_to_id
               WHERE (t.company_id = :companyId OR :companyId IS NULL OR t.company_id IS NULL OR t.company_id = 0)
                 AND (:branchId IS NULL OR t.branch_id IS NULL OR t.branch_id = 0 OR :branchIdsStr = '' OR FIND_IN_SET(t.branch_id, :branchIdsStr))`;

    if (projectId) sql += ` AND t.project_id = :projectId`;
    if (priority) sql += ` AND UPPER(t.priority) = :priority`;
    if (status) sql += ` AND UPPER(t.status) = :status`;

    sql += ` ORDER BY t.created_at DESC`;

    const items = await query(sql, {
      companyId,
      branchId,
      branchIdsStr,
      projectId,
      priority,
      status,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalTasks = 0;
    let completedTasks = 0;
    let inProgressTasks = 0;
    let pendingTasks = 0;
    let blockedTasks = 0;
    let reviewTasks = 0;
    let overdueTasks = 0;
    let dueTodayTasks = 0;
    let onScheduleTasks = 0;
    let onTimeCompletedTasks = 0;

    let delayedTasksCount = 0;

    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
    const assigneeMap = {};
    const projectMap = {};

    const normalizedItems = (items || []).map((t) => {
      totalTasks++;
      t.task_title = t.task_title || t.task_name || `Task #${t.id}`;
      t.task_name = t.task_name || t.task_title || `Task #${t.id}`;

      const pct = Number(t.completion_percent || 0);
      let effectiveStatus = (t.status || "PENDING").toUpperCase();
      if (pct >= 100) effectiveStatus = "COMPLETED";
      else if (pct > 0 && effectiveStatus === "PENDING")
        effectiveStatus = "IN_PROGRESS";
      t.status = effectiveStatus;

      if (effectiveStatus === "COMPLETED") completedTasks++;
      else if (effectiveStatus === "IN_PROGRESS") inProgressTasks++;
      else if (effectiveStatus === "BLOCKED") blockedTasks++;
      else if (effectiveStatus === "REVIEW") reviewTasks++;
      else pendingTasks++;

      const taskPriority = (t.priority || "MEDIUM").toUpperCase();
      if (priorityCounts[taskPriority] !== undefined) {
        priorityCounts[taskPriority]++;
      } else {
        priorityCounts.MEDIUM++;
      }

      // Calculate Due Status
      const endDateVal = t.end_date || t.dueDate || t.due_date;
      if (effectiveStatus === "COMPLETED") {
        t.due_status = "COMPLETED";
        t.due_label = "Completed";
        onTimeCompletedTasks++;
      } else if (endDateVal) {
        const sDate = String(endDateVal).split("T")[0];
        const parts = sDate.split("-");
        let dueDate = null;
        if (parts.length === 3) {
          dueDate = new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2]),
          );
        } else {
          dueDate = new Date(endDateVal);
        }
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          const daysOver = Math.abs(diffDays);
          t.due_status = "OVERDUE";
          t.due_label = `Overdue by ${daysOver} d`;
          overdueTasks++;
        } else if (diffDays === 0) {
          t.due_status = "DUE_TODAY";
          t.due_label = "Due Today";
          dueTodayTasks++;
        } else {
          t.due_status = "ON_SCHEDULE";
          t.due_label = `Due in ${diffDays} d`;
          onScheduleTasks++;
        }
      } else {
        t.due_status = "NO_DUE_DATE";
        t.due_label = "—";
      }

      // Normalize delay reasons
      let delayReasonsList = [];
      if (t.reason_for_delay) {
        try {
          const parsed = JSON.parse(t.reason_for_delay);
          if (Array.isArray(parsed)) delayReasonsList = parsed.filter(Boolean);
          else if (typeof parsed === "string") delayReasonsList = [parsed];
        } catch {
          delayReasonsList = [String(t.reason_for_delay)];
        }
      }
      t.delay_reasons = delayReasonsList;
      t.has_delays = delayReasonsList.length > 0 || t.due_status === "OVERDUE" || t.status === "BLOCKED";
      if (t.has_delays) delayedTasksCount++;

      // Assignee aggregation
      const assigneeName = t.assigned_to_name || "Unassigned";
      if (!assigneeMap[assigneeName]) {
        assigneeMap[assigneeName] = {
          name: assigneeName,
          total: 0,
          completed: 0,
          overdue: 0,
          blocked: 0,
        };
      }
      assigneeMap[assigneeName].total++;
      if (effectiveStatus === "COMPLETED")
        assigneeMap[assigneeName].completed++;
      if (t.due_status === "OVERDUE") assigneeMap[assigneeName].overdue++;
      if (effectiveStatus === "BLOCKED") assigneeMap[assigneeName].blocked++;

      // Project aggregation
      const projName = t.project_name || "General Project";
      const pId = t.project_id || 0;
      const pKey = `proj_${pId}`;
      if (!projectMap[pKey]) {
        projectMap[pKey] = {
          id: pId,
          name: projName,
          code: t.project_code || "PRJ",
          total: 0,
          completed: 0,
          in_progress: 0,
          pending: 0,
          blocked: 0,
          overdue: 0,
          delayed_count: 0,
          tasks: [],
        };
      }
      projectMap[pKey].total++;
      if (effectiveStatus === "COMPLETED") projectMap[pKey].completed++;
      else if (effectiveStatus === "IN_PROGRESS") projectMap[pKey].in_progress++;
      else if (effectiveStatus === "BLOCKED") projectMap[pKey].blocked++;
      else projectMap[pKey].pending++;

      if (t.due_status === "OVERDUE") projectMap[pKey].overdue++;
      if (t.has_delays) projectMap[pKey].delayed_count++;
      projectMap[pKey].tasks.push(t);

      return t;
    });

    const completionRate =
      totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : "0.0";
    const overdueRate =
      totalTasks > 0 ? ((overdueTasks / totalTasks) * 100).toFixed(1) : "0.0";
    const onTimeRate =
      completedTasks > 0
        ? ((onTimeCompletedTasks / completedTasks) * 100).toFixed(1)
        : "0.0";

    const assigneeWorkload = Object.values(assigneeMap)
      .map((a) => ({
        ...a,
        completionRate:
          a.total > 0 ? ((a.completed / a.total) * 100).toFixed(1) : "0.0",
      }))
      .sort((a, b) => b.total - a.total);

    const byProject = Object.values(projectMap)
      .map((p) => ({
        ...p,
        completionRate:
          p.total > 0 ? ((p.completed / p.total) * 100).toFixed(1) : "0.0",
      }))
      .sort((a, b) => b.delayed_count - a.delayed_count || b.total - a.total);

    res.json({
      projects,
      items: normalizedItems,
      by_project: byProject,
      analytics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        pendingTasks,
        blockedTasks,
        reviewTasks,
        overdueTasks,
        dueTodayTasks,
        onScheduleTasks,
        delayedTasksCount,
        completionRate: Number(completionRate),
        overdueRate: Number(overdueRate),
        onTimeRate: Number(onTimeRate),
        priorityDistribution: priorityCounts,
        assigneeWorkload,
        projectExecutionBreakdown: byProject,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// Equipment Management (pm_equipments)
// ============================================================================

export const listPmEquipments = async (req, res, next) => {
  try {
    const companyId =
      req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    const branchId =
      req.scope?.branchId || req.user?.branchId || req.user?.branch_id || null;
    await ensureProjectTables(companyId, branchId);

    let sql = `
      SELECT e.*, me.asset_name as maint_equipment_name
      FROM pm_equipments e
      LEFT JOIN maint_assets me ON e.maint_equipment_id = me.id
      WHERE (e.company_id = ? OR ? IS NULL)
    `;
    const params = [companyId, companyId];
    if (branchId) {
      sql += " AND (e.branch_id = ? OR e.branch_id IS NULL OR e.branch_id = 0)";
      params.push(branchId);
    }
    const activeParam = String(req.query.active || req.query.status || "")
      .trim()
      .toLowerCase();
    const showAll =
      ["all", "any"].includes(activeParam) ||
      req.query.all === "1" ||
      req.query.all === "true";
    if (!showAll) {
      sql += " AND (UPPER(e.status) = 'ACTIVE' OR e.status IS NULL)";
    }
    sql += " ORDER BY e.name ASC";

    const rows = await query(sql, params);
    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    next(err);
  }
};

export const createPmEquipment = async (req, res, next) => {
  try {
    const { companyId, branchId } = req.scope || {};
    await ensureProjectTables(companyId, branchId);
    const { name, description, status, maint_equipment_id } = req.body;

    if (!name) return httpError(res, 400, "Equipment name is required");

    const result = await query(
      `INSERT INTO pm_equipments (company_id, branch_id, name, description, status, maint_equipment_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        branchId,
        name,
        description || null,
        status || "ACTIVE",
        maint_equipment_id || null,
      ],
    );
    res
      .status(201)
      .json({ id: result.insertId, message: "Equipment created successfully" });
  } catch (err) {
    next(err);
  }
};

export const updatePmEquipment = async (req, res, next) => {
  try {
    const { companyId, branchId } = req.scope || {};
    const { id } = req.params;
    const { name, description, status, maint_equipment_id } = req.body;

    if (!name) return httpError(res, 400, "Equipment name is required");

    await query(
      `UPDATE pm_equipments 
       SET name = ?, description = ?, status = ?, maint_equipment_id = ?
       WHERE id = ? AND company_id = ? AND branch_id = ?`,
      [
        name,
        description || null,
        status || "ACTIVE",
        maint_equipment_id || null,
        id,
        companyId,
        branchId,
      ],
    );
    res.json({ success: true, message: "Equipment updated" });
  } catch (err) {
    next(err);
  }
};

export const deletePmEquipment = async (req, res, next) => {
  try {
    const { companyId, branchId } = req.scope || {};
    const { id } = req.params;

    const used = await query(
      `SELECT id FROM pm_resources WHERE pm_equipment_id = ? LIMIT 1`,
      [id],
    );
    if (used.length > 0)
      return httpError(
        res,
        400,
        "Equipment is allocated in a project/task and cannot be deleted",
      );

    await query(
      `DELETE FROM pm_equipments WHERE id = ? AND company_id = ? AND branch_id = ?`,
      [id, companyId, branchId],
    );
    res.json({ success: true, message: "Equipment deleted" });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// Resource Management (pm_resources)
// ============================================================================

export const listPmResources = async (req, res, next) => {
  try {
    const companyId =
      req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    const branchId =
      req.scope?.branchId || req.user?.branchId || req.user?.branch_id || null;
    const { project_id, task_id } = req.query;
    await ensureProjectTables(companyId, branchId);

    let sql = `
      SELECT r.*, 
             p.project_name, p.project_code,
             t.task_title,
             e.name as pm_equipment_name,
             TRIM(CONCAT_WS(' ', he.first_name, NULLIF(he.middle_name, ''), he.last_name)) as hr_employee_name
      FROM pm_resources r
      LEFT JOIN pm_projects p ON r.project_id = p.id
      LEFT JOIN pm_tasks t ON r.task_id = t.id
      LEFT JOIN pm_equipments e ON r.pm_equipment_id = e.id
      LEFT JOIN hr_employees he ON r.hr_employee_id = he.id
      WHERE (r.company_id = ? OR ? IS NULL)
    `;
    const params = [companyId, companyId];

    if (project_id) {
      sql += " AND r.project_id = ?";
      params.push(project_id);
    }
    if (task_id) {
      sql += " AND r.task_id = ?";
      params.push(task_id);
    }

    sql += " ORDER BY r.created_at DESC";

    const rows = await query(sql, params);
    res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    next(err);
  }
};

export const createPmResource = async (req, res, next) => {
  try {
    const companyId =
      req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    const branchId =
      req.scope?.branchId || req.user?.branchId || req.user?.branch_id || 1;
    await ensureProjectTables(companyId, branchId);

    // Support single resource allocation or batch of multiple resource types linked to project
    const rawItems = Array.isArray(req.body.items)
      ? req.body.items
      : [req.body];
    if (!rawItems.length)
      return res.status(400).json({ message: "No resource data provided" });

    const createdIds = [];
    for (const item of rawItems) {
      const {
        project_id,
        task_id,
        resource_type,
        pm_equipment_id,
        hr_employee_id,
        resource_name,
        allocated_qty,
        status,
        accountable_user_id,
        accountable_user_name,
        start_date,
        end_date,
        remarks,
        is_active,
      } = item;

      if (!resource_name || !String(resource_name).trim()) continue;

      const result = await query(
        `INSERT INTO pm_resources (
          company_id, branch_id, project_id, task_id, resource_type,
          pm_equipment_id, hr_employee_id, resource_name, allocated_qty,
          status, accountable_user_id, accountable_user_name, start_date, end_date, remarks, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          branchId,
          project_id ? Number(project_id) : null,
          task_id ? Number(task_id) : null,
          resource_type || "EQUIPMENT",
          pm_equipment_id ? Number(pm_equipment_id) : null,
          hr_employee_id ? Number(hr_employee_id) : null,
          String(resource_name).trim(),
          Number(allocated_qty) || 1,
          status || "ALLOCATED",
          accountable_user_id ? Number(accountable_user_id) : null,
          accountable_user_name || null,
          start_date || null,
          end_date || null,
          remarks || null,
          is_active !== undefined ? (is_active ? 1 : 0) : 1,
        ],
      );
      createdIds.push(result.insertId);
    }

    if (!createdIds.length) {
      return res
        .status(400)
        .json({ message: "Resource name is required for all allocated items" });
    }

    res
      .status(201)
      .json({
        id: createdIds[0],
        ids: createdIds,
        message: "Resource(s) allocated successfully",
      });
  } catch (err) {
    next(err);
  }
};

export const updatePmResource = async (req, res, next) => {
  try {
    const companyId =
      req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    const { id } = req.params;

    const {
      project_id,
      task_id,
      resource_type,
      pm_equipment_id,
      hr_employee_id,
      resource_name,
      allocated_qty,
      status,
      accountable_user_id,
      accountable_user_name,
      start_date,
      end_date,
      remarks,
      is_active,
    } = req.body;

    const current = await query(
      `SELECT * FROM pm_resources WHERE id = ? AND company_id = ?`,
      [id, companyId],
    );
    if (!current.length)
      return res.status(404).json({ message: "Resource not found" });

    // Business rule: User must unallocate resource type from project before they can set to inactive
    const targetIsActive =
      is_active !== undefined
        ? is_active === 0 ||
          is_active === false ||
          is_active === "0" ||
          is_active === "inactive"
          ? 0
          : 1
        : current[0].is_active !== null
          ? current[0].is_active
          : 1;
    const targetProjectId =
      project_id !== undefined
        ? project_id
          ? Number(project_id)
          : null
        : current[0].project_id;

    if (targetIsActive === 0 && targetProjectId) {
      return res.status(400).json({
        message:
          "Cannot set resource to inactive while allocated to a project. Please unallocate the resource from the project first.",
      });
    }

    await query(
      `UPDATE pm_resources SET
        project_id = ?,
        task_id = ?, resource_type = ?, pm_equipment_id = ?, hr_employee_id = ?,
        resource_name = ?, allocated_qty = ?, status = ?, accountable_user_id = ?, 
        accountable_user_name = ?, start_date = ?, end_date = ?, remarks = ?, is_active = ?
       WHERE id = ? AND company_id = ?`,
      [
        targetProjectId,
        task_id ? Number(task_id) : null,
        resource_type || "EQUIPMENT",
        pm_equipment_id ? Number(pm_equipment_id) : null,
        hr_employee_id ? Number(hr_employee_id) : null,
        resource_name,
        Number(allocated_qty) || 1,
        status || "ALLOCATED",
        accountable_user_id ? Number(accountable_user_id) : null,
        accountable_user_name || null,
        start_date || null,
        end_date || null,
        remarks || null,
        targetIsActive,
        id,
        companyId,
      ],
    );

    res.json({ success: true, message: "Resource updated successfully" });
  } catch (err) {
    next(err);
  }
};

export const togglePmResourceStatus = async (req, res, next) => {
  try {
    const companyId =
      req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    const { id } = req.params;
    const { is_active } = req.body;

    const current = await query(
      `SELECT * FROM pm_resources WHERE id = ? AND company_id = ?`,
      [id, companyId],
    );
    if (!current.length)
      return res.status(404).json({ message: "Resource not found" });

    const newActiveState =
      is_active === 0 ||
      is_active === false ||
      is_active === "0" ||
      is_active === "inactive"
        ? 0
        : 1;

    // Enforce business rule: must unallocate from project before inactivating
    if (newActiveState === 0 && current[0].project_id) {
      return res.status(400).json({
        message:
          "Cannot set resource to inactive while allocated to a project. Please unallocate the resource from the project first.",
      });
    }

    await query(
      `UPDATE pm_resources SET is_active = ? WHERE id = ? AND company_id = ?`,
      [newActiveState, id, companyId],
    );
    res.json({
      success: true,
      is_active: newActiveState,
      message: `Resource status changed to ${newActiveState === 1 ? "Active" : "Inactive"}`,
    });
  } catch (err) {
    next(err);
  }
};

export const deletePmResource = async (req, res, next) => {
  try {
    const companyId =
      req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    const { id } = req.params;
    await query(`DELETE FROM pm_resources WHERE id = ? AND company_id = ?`, [
      id,
      companyId,
    ]);
    res.json({ success: true, message: "Resource allocation deleted" });
  } catch (err) {
    next(err);
  }
};

// ============================================================================
// Project Types Management (pm_project_types)
// ============================================================================
export async function ensureProjectTypeTable(companyId) {
  if (process.env.SKIP_DYNAMIC_SCHEMA_SYNC === "true") return;
  await query(`CREATE TABLE IF NOT EXISTS pm_project_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT NOT NULL,
    type_code VARCHAR(100) NOT NULL,
    type_name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(() => {});

  const countRes = await query(
    "SELECT COUNT(*) as count FROM pm_project_types WHERE company_id = ?",
    [companyId || 1],
  ).catch(() => [{ count: 0 }]);
  if ((countRes?.[0]?.count || 0) === 0) {
    const defaults = [
      [
        "GENERAL_CONSTRUCTION",
        "General Construction",
        "Standard building and construction works",
      ],
      [
        "RESIDENTIAL",
        "Residential Construction",
        "Private homes, housing estates, apartments",
      ],
      [
        "COMMERCIAL_BUILDING",
        "Commercial Buildings",
        "Office complexes, retail malls, business facilities",
      ],
      [
        "INDUSTRIAL",
        "Industrial Construction",
        "Factories, warehouses, processing plants",
      ],
      [
        "ROADS_HIGHWAYS",
        "Roads & Highways",
        "Pavement, civil transport corridors, asphalt works",
      ],
      [
        "BRIDGES",
        "Bridges & Civil Infrastructure",
        "Overpasses, bridges, structural public civil works",
      ],
      [
        "DRAINAGE_WATER",
        "Drainage & Water Infrastructure",
        "Storm drains, water treatment, utilities pipelines",
      ],
      [
        "RENOVATION",
        "Renovation & Refurbishment",
        "Interior fit-outs, structural retrofitting, rehabilitations",
      ],
      [
        "MEP_INSTALLATION",
        "MEP Installations",
        "Mechanical, electrical, plumbing and HVAC engineering",
      ],
      [
        "SPECIALIST_CONTRACTING",
        "Specialist Contracting",
        "Geotechnical, piling, facade, specialized engineering",
      ],
      [
        "PROPERTY_DEVELOPMENT",
        "Property Development",
        "Turnkey real estate development and joint ventures",
      ],
      [
        "INFORMATION_TECHNOLOGY",
        "Information Technology",
        "Enterprise IT, networking, software deployments",
      ],
      [
        "OPERATIONS",
        "Operations",
        "Operational rollout, facility enhancements",
      ],
      [
        "RESEARCH",
        "Research & Development",
        "Prototyping, feasibility studies, research initiatives",
      ],
      ["OTHER", "Other", "Miscellaneous and customized project types"],
    ];
    for (const [code, name, desc] of defaults) {
      await query(
        "INSERT INTO pm_project_types (company_id, type_code, type_name, description, is_active) VALUES (?, ?, ?, ?, 1)",
        [companyId || 1, code, name, desc],
      ).catch(() => {});
    }
  }
}

export const listProjectTypes = async (req, res, next) => {
  try {
    const companyId =
      req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    await ensureProjectTypeTable(companyId);
    const showAll =
      req.query.active === "all" ||
      req.query.all === "1" ||
      req.query.all === "true";
    let sql =
      "SELECT * FROM pm_project_types WHERE (company_id = ? OR company_id = 1)";
    if (!showAll) {
      sql += " AND is_active = 1";
    }
    sql += " ORDER BY id ASC";
    const items = await query(sql, [companyId]);
    res.json({ items: Array.isArray(items) ? items : [] });
  } catch (err) {
    next(err);
  }
};

export const createProjectType = async (req, res, next) => {
  try {
    const companyId =
      req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    await ensureProjectTypeTable(companyId);
    const { type_code, type_name, description, is_active } = req.body || {};
    if (!type_name) {
      return res.status(400).json({ message: "Project Type Name is required" });
    }
    const code = (
      type_code || type_name.toUpperCase().replace(/[^A-Z0-9]/g, "_")
    ).trim();
    const result = await query(
      "INSERT INTO pm_project_types (company_id, type_code, type_name, description, is_active) VALUES (?, ?, ?, ?, ?)",
      [
        companyId,
        code,
        type_name.trim(),
        description || null,
        is_active === 0 || is_active === false ? 0 : 1,
      ],
    );
    res.json({
      success: true,
      message: "Project type created",
      item: { id: result.insertId, type_code: code, type_name },
    });
  } catch (err) {
    next(err);
  }
};

export const updateProjectType = async (req, res, next) => {
  try {
    const companyId =
      req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    const { id } = req.params;
    const { type_code, type_name, description, is_active } = req.body || {};
    const code = (
      type_code ||
      (type_name ? type_name.toUpperCase().replace(/[^A-Z0-9]/g, "_") : "")
    ).trim();
    await query(
      "UPDATE pm_project_types SET type_code = COALESCE(?, type_code), type_name = COALESCE(?, type_name), description = ?, is_active = COALESCE(?, is_active) WHERE id = ? AND (company_id = ? OR company_id = 1)",
      [
        code || null,
        type_name ? type_name.trim() : null,
        description != null ? description : null,
        is_active,
        id,
        companyId,
      ],
    );
    res.json({ success: true, message: "Project type updated" });
  } catch (err) {
    next(err);
  }
};

export const deleteProjectType = async (req, res, next) => {
  try {
    const companyId =
      req.scope?.companyId || req.user?.companyId || req.user?.company_id || 1;
    const { id } = req.params;
    await query(
      "UPDATE pm_project_types SET is_active = 0 WHERE id = ? AND (company_id = ? OR company_id = 1)",
      [id, companyId],
    );
    res.json({ success: true, message: "Project type deactivated" });
  } catch (err) {
    next(err);
  }
};

export const getProjectTeamMembers = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId)
      return res.status(400).json({ error: "Invalid project ID" });
    await ensureProjectTables(companyId, branchId);

    const rows = await query(
      `SELECT id, team_members, team_lead_ids FROM pm_projects WHERE id = :projectId AND (:companyId IS NULL OR company_id = :companyId OR company_id = 1)`,
      { projectId, companyId },
    );
    if (!rows.length)
      return res.status(404).json({ error: "Project not found" });

    let members = [];
    let leads = [];
    try {
      if (rows[0].team_members) members = JSON.parse(rows[0].team_members);
    } catch {}
    try {
      if (rows[0].team_lead_ids) leads = JSON.parse(rows[0].team_lead_ids);
    } catch {}

    res.json({
      projectId,
      team_members: Array.isArray(members) ? members : [],
      team_lead_ids: Array.isArray(leads) ? leads : [],
    });
  } catch (err) {
    next(err);
  }
};

export const updateProjectTeamMembers = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId)
      return res.status(400).json({ error: "Invalid project ID" });
    await ensureProjectTables(companyId, branchId);

    const { team_members, team_lead_ids } = req.body || {};
    const serializedMembers = Array.isArray(team_members)
      ? JSON.stringify(team_members.map(String))
      : null;
    const serializedLeads = Array.isArray(team_lead_ids)
      ? JSON.stringify(team_lead_ids.map(String))
      : null;

    await query(
      `UPDATE pm_projects 
       SET team_members = :members,
           team_lead_ids = :leads
       WHERE id = :projectId AND (:companyId IS NULL OR company_id = :companyId OR company_id = 1)`,
      {
        projectId,
        companyId,
        members: serializedMembers,
        leads: serializedLeads,
      },
    );

    // Sync to pm_project_team_members table
    try {
      if (Array.isArray(team_members)) {
        await query(
          `DELETE FROM pm_project_team_members WHERE project_id = :projectId`,
          { projectId },
        );
        const leadSet = new Set((team_lead_ids || []).map(String));
        for (const uId of team_members) {
          const numUId = toNumber(uId);
          if (numUId) {
            await query(
              `INSERT INTO pm_project_team_members (company_id, branch_id, project_id, user_id, is_lead)
               VALUES (:companyId, :branchId, :projectId, :userId, :isLead)
               ON DUPLICATE KEY UPDATE is_lead = :isLead`,
              {
                companyId: companyId || 1,
                branchId: branchId || 1,
                projectId,
                userId: numUId,
                isLead: leadSet.has(String(uId)) ? 1 : 0,
              },
            ).catch(() => {});
          }
        }
      }
    } catch (e) {}

    res.json({
      success: true,
      projectId,
      team_members: Array.isArray(team_members) ? team_members : [],
      team_lead_ids: Array.isArray(team_lead_ids) ? team_lead_ids : [],
    });
  } catch (err) {
    next(err);
  }
};

export const updateProjectTeamLead = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const projectId = toNumber(req.params.id);
    if (!projectId)
      return res.status(400).json({ error: "Invalid project ID" });
    await ensureProjectTables(companyId, branchId);

    const { userId, is_lead, team_lead_ids } = req.body || {};

    const rows = await query(
      `SELECT team_members, team_lead_ids FROM pm_projects WHERE id = :projectId AND (:companyId IS NULL OR company_id = :companyId OR company_id = 1)`,
      { projectId, companyId },
    );
    if (!rows.length)
      return res.status(404).json({ error: "Project not found" });

    let currentLeads = [];
    try {
      if (rows[0].team_lead_ids)
        currentLeads = JSON.parse(rows[0].team_lead_ids);
    } catch {}
    if (!Array.isArray(currentLeads)) currentLeads = [];

    let newLeads;
    if (Array.isArray(team_lead_ids)) {
      newLeads = team_lead_ids.map(String);
    } else if (userId !== undefined) {
      const uIdStr = String(userId);
      const set = new Set(currentLeads.map(String));
      if (is_lead) {
        set.add(uIdStr);
      } else {
        set.delete(uIdStr);
      }
      newLeads = Array.from(set);
    } else {
      newLeads = currentLeads;
    }

    const serializedLeads = JSON.stringify(newLeads);
    await query(
      `UPDATE pm_projects SET team_lead_ids = :leads WHERE id = :projectId`,
      { projectId, leads: serializedLeads },
    );

    // Also update pm_project_team_members table
    try {
      if (userId !== undefined) {
        const numUId = toNumber(userId);
        if (numUId) {
          await query(
            `UPDATE pm_project_team_members SET is_lead = :isLead WHERE project_id = :projectId AND user_id = :userId`,
            { projectId, userId: numUId, isLead: is_lead ? 1 : 0 },
          );
        }
      }
    } catch (e) {}

    res.json({
      success: true,
      projectId,
      team_lead_ids: newLeads,
    });
  } catch (err) {
    next(err);
  }
};

// ===== PM TEMPORAL WAREHOUSE STOCK & JOURNALS REPORTS =====
export const getPMTemporalWarehouseStockReport = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    await ensurePMTemporalWarehousesTable();
    await ensurePMMaterialReceiptTables(companyId, branchId);
    await ensurePMMaterialUtilizationTables(companyId, branchId);

    const warehouseId = req.query.warehouse_id ? toNumber(req.query.warehouse_id) : null;
    const projectId = req.query.project_id ? toNumber(req.query.project_id) : null;
    const status = req.query.status ? String(req.query.status).toLowerCase() : "all";
    const search = req.query.search ? String(req.query.search).trim() : "";
    const fromDate = req.query.from || req.query.from_date || null;
    const toDate = req.query.to || req.query.to_date || null;

    const warehouses = await query(
      `SELECT id, warehouse_name, warehouse_code, location, is_active, is_default
       FROM pm_temporal_warehouses
       WHERE company_id = :companyId
       ORDER BY warehouse_name ASC`,
      { companyId },
    ).catch(() => []);

    const invWarehouses = await query(
      `SELECT id, name AS warehouse_name, code AS warehouse_code, location, is_active, 0 AS is_default
       FROM inv_warehouses
       WHERE company_id = :companyId
       ORDER BY name ASC`,
      { companyId },
    ).catch(() => []);

    const whMap = new Map();
    (warehouses || []).forEach((w) => whMap.set(String(w.id), w.warehouse_name));
    (invWarehouses || []).forEach((w) => {
      if (!whMap.has(String(w.id))) whMap.set(String(w.id), w.warehouse_name);
    });

    const projects = await query(
      `SELECT id, project_code, project_name FROM pm_projects WHERE company_id = :companyId ORDER BY project_name ASC`,
      { companyId },
    ).catch(() => []);

    let rcptSql = `
      SELECT 
        r.warehouse_id,
        COALESCE(tw.warehouse_name, CONCAT('Warehouse #', r.warehouse_id)) AS warehouse_name,
        COALESCE(tw.warehouse_code, '') AS warehouse_code,
        tw.location,
        ri.item_id,
        COALESCE(i.item_code, CONCAT('ITM-', ri.item_id)) AS item_code,
        COALESCE(ri.item_name, i.item_name, 'Unknown Material') AS item_name,
        COALESCE(ri.uom, i.uom, 'PCS') AS uom,
        SUM(COALESCE(ri.receipt_qty, 0)) AS total_received,
        MAX(r.receipt_date) AS last_receipt_date
      FROM pm_material_receipts r
      JOIN pm_material_receipt_items ri ON r.id = ri.receipt_id
      LEFT JOIN pm_temporal_warehouses tw ON r.warehouse_id = tw.id AND tw.company_id = r.company_id
      LEFT JOIN inv_items i ON ri.item_id = i.id
      WHERE r.company_id = :companyId AND r.warehouse_id IS NOT NULL
    `;
    const rcptParams = { companyId };
    if (warehouseId) {
      rcptSql += ` AND r.warehouse_id = :warehouseId`;
      rcptParams.warehouseId = warehouseId;
    }
    if (fromDate) {
      rcptSql += ` AND r.receipt_date >= :fromDate`;
      rcptParams.fromDate = fromDate;
    }
    if (toDate) {
      rcptSql += ` AND r.receipt_date <= :toDate`;
      rcptParams.toDate = toDate;
    }
    rcptSql += ` GROUP BY r.warehouse_id, tw.warehouse_name, tw.warehouse_code, tw.location, ri.item_id, i.item_code, ri.item_name, i.item_name, ri.uom, i.uom`;

    const rcptRows = await query(rcptSql, rcptParams).catch(() => []);

    let utilSql = `
      SELECT 
        u.warehouse_id,
        ui.item_id,
        SUM(COALESCE(ui.required_qty, 0)) AS total_utilized,
        MAX(u.utilization_date) AS last_utilization_date
      FROM pm_material_utilization u
      JOIN pm_material_utilization_items ui ON u.id = ui.utilization_id
      WHERE u.company_id = :companyId AND u.warehouse_id IS NOT NULL
    `;
    const utilParams = { companyId };
    if (warehouseId) {
      utilSql += ` AND u.warehouse_id = :warehouseId`;
      utilParams.warehouseId = warehouseId;
    }
    if (projectId) {
      utilSql += ` AND u.project_id = :projectId`;
      utilParams.projectId = projectId;
    }
    if (fromDate) {
      utilSql += ` AND u.utilization_date >= :fromDate`;
      utilParams.fromDate = fromDate;
    }
    if (toDate) {
      utilSql += ` AND u.utilization_date <= :toDate`;
      utilParams.toDate = toDate;
    }
    utilSql += ` GROUP BY u.warehouse_id, ui.item_id`;

    const utilRows = await query(utilSql, utilParams).catch(() => []);
    const utilMap = new Map();
    for (const u of utilRows) {
      utilMap.set(`${u.warehouse_id}_${u.item_id}`, {
        total_utilized: Number(u.total_utilized || 0),
        last_utilization_date: u.last_utilization_date,
      });
    }

    const itemMap = new Map();
    for (const r of rcptRows) {
      const key = `${r.warehouse_id}_${r.item_id}`;
      const uData = utilMap.get(key) || { total_utilized: 0, last_utilization_date: null };
      const totalRecv = Number(r.total_received || 0);
      const totalUtil = Number(uData.total_utilized || 0);
      const avail = Math.max(0, totalRecv - totalUtil);
      const whName = r.warehouse_name || whMap.get(String(r.warehouse_id)) || `Warehouse #${r.warehouse_id}`;
      itemMap.set(key, {
        warehouse_id: r.warehouse_id,
        warehouse_name: whName,
        warehouse_code: r.warehouse_code,
        location: r.location,
        item_id: r.item_id,
        item_code: r.item_code,
        item_name: r.item_name,
        uom: r.uom,
        total_received: totalRecv,
        total_utilized: totalUtil,
        available_qty: avail,
        last_receipt_date: r.last_receipt_date,
        last_utilization_date: uData.last_utilization_date,
        status: avail > 0 ? "in_stock" : "out_of_stock",
      });
    }

    let items = Array.from(itemMap.values());

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (it) =>
          (it.item_name && it.item_name.toLowerCase().includes(q)) ||
          (it.item_code && it.item_code.toLowerCase().includes(q)) ||
          (it.warehouse_name && it.warehouse_name.toLowerCase().includes(q))
      );
    }

    if (status === "in_stock") {
      items = items.filter((it) => it.available_qty > 0);
    } else if (status === "out_of_stock") {
      items = items.filter((it) => it.available_qty <= 0);
    }

    const totalWarehouses = new Set(items.map((i) => i.warehouse_id)).size;
    const totalMaterials = new Set(items.map((i) => i.item_id)).size;
    const totalReceivedQty = items.reduce((sum, i) => sum + i.total_received, 0);
    const totalUtilizedQty = items.reduce((sum, i) => sum + i.total_utilized, 0);
    const totalAvailableQty = items.reduce((sum, i) => sum + i.available_qty, 0);

    res.json({
      items,
      summary: {
        totalWarehouses,
        totalMaterials,
        totalReceivedQty,
        totalUtilizedQty,
        totalAvailableQty,
        inStockCount: items.filter((i) => i.available_qty > 0).length,
        outOfStockCount: items.filter((i) => i.available_qty <= 0).length,
      },
      warehouses: warehouses.length ? warehouses : Array.from(whMap.entries()).map(([id, name]) => ({ id, warehouse_name: name })),
      projects,
    });
  } catch (err) {
    next(err);
  }
};

export const getPMTemporalWarehouseJournalsReport = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    await ensurePMTemporalWarehousesTable();
    await ensurePMMaterialReceiptTables(companyId, branchId);
    await ensurePMMaterialUtilizationTables(companyId, branchId);

    const warehouseId = req.query.warehouse_id ? toNumber(req.query.warehouse_id) : null;
    const projectId = req.query.project_id ? toNumber(req.query.project_id) : null;
    const type = req.query.type ? String(req.query.type).toUpperCase() : "ALL";
    const search = req.query.search ? String(req.query.search).trim() : "";
    const fromDate = req.query.from || req.query.from_date || null;
    const toDate = req.query.to || req.query.to_date || null;

    let rcptSql = `
      SELECT 
        r.id AS parent_id,
        ri.id AS line_id,
        'RECEIPT' AS movement_type,
        r.receipt_no AS voucher_no,
        r.receipt_date AS movement_date,
        r.warehouse_id,
        COALESCE(tw.warehouse_name, CONCAT('Warehouse #', r.warehouse_id)) AS warehouse_name,
        NULL AS project_id,
        'Stores Inward Receipt' AS project_name,
        NULL AS task_id,
        NULL AS task_title,
        ri.item_id,
        COALESCE(i.item_code, CONCAT('ITM-', ri.item_id)) AS item_code,
        COALESCE(ri.item_name, i.item_name, 'Unknown Material') AS item_name,
        COALESCE(ri.uom, i.uom, 'PCS') AS uom,
        COALESCE(ri.receipt_qty, 0) AS qty_in,
        0 AS qty_out,
        COALESCE(ri.receipt_qty, 0) AS net_effect,
        r.source_doc,
        r.remarks,
        r.status,
        u.username AS created_by_name,
        r.created_at
      FROM pm_material_receipts r
      JOIN pm_material_receipt_items ri ON r.id = ri.receipt_id
      LEFT JOIN pm_temporal_warehouses tw ON r.warehouse_id = tw.id AND tw.company_id = r.company_id
      LEFT JOIN inv_items i ON ri.item_id = i.id
      LEFT JOIN adm_users u ON r.created_by = u.id
      WHERE r.company_id = :companyId AND r.warehouse_id IS NOT NULL
    `;
    const rcptParams = { companyId };
    if (warehouseId) {
      rcptSql += ` AND r.warehouse_id = :warehouseId`;
      rcptParams.warehouseId = warehouseId;
    }
    if (fromDate) {
      rcptSql += ` AND r.receipt_date >= :fromDate`;
      rcptParams.fromDate = fromDate;
    }
    if (toDate) {
      rcptSql += ` AND r.receipt_date <= :toDate`;
      rcptParams.toDate = toDate;
    }

    let utilSql = `
      SELECT 
        u.id AS parent_id,
        ui.id AS line_id,
        'UTILIZATION' AS movement_type,
        u.utilization_no AS voucher_no,
        u.utilization_date AS movement_date,
        u.warehouse_id,
        COALESCE(tw.warehouse_name, CONCAT('Warehouse #', u.warehouse_id)) AS warehouse_name,
        u.project_id,
        COALESCE(p.project_name, 'Project Site') AS project_name,
        u.task_id,
        t.task_title,
        ui.item_id,
        COALESCE(i.item_code, CONCAT('ITM-', ui.item_id)) AS item_code,
        COALESCE(ui.item_name, i.item_name, 'Unknown Material') AS item_name,
        COALESCE(ui.uom, i.uom, 'PCS') AS uom,
        0 AS qty_in,
        COALESCE(ui.required_qty, 0) AS qty_out,
        -COALESCE(ui.required_qty, 0) AS net_effect,
        u.task_summary AS source_doc,
        u.remarks,
        u.status,
        u2.username AS created_by_name,
        u.created_at
      FROM pm_material_utilization u
      JOIN pm_material_utilization_items ui ON u.id = ui.utilization_id
      LEFT JOIN pm_temporal_warehouses tw ON u.warehouse_id = tw.id AND tw.company_id = u.company_id
      LEFT JOIN pm_projects p ON u.project_id = p.id
      LEFT JOIN pm_tasks t ON u.task_id = t.id
      LEFT JOIN inv_items i ON ui.item_id = i.id
      LEFT JOIN adm_users u2 ON u.created_by = u2.id
      WHERE u.company_id = :companyId AND u.warehouse_id IS NOT NULL
    `;
    const utilParams = { companyId };
    if (warehouseId) {
      utilSql += ` AND u.warehouse_id = :warehouseId`;
      utilParams.warehouseId = warehouseId;
    }
    if (projectId) {
      utilSql += ` AND u.project_id = :projectId`;
      utilParams.projectId = projectId;
    }
    if (fromDate) {
      utilSql += ` AND u.utilization_date >= :fromDate`;
      utilParams.fromDate = fromDate;
    }
    if (toDate) {
      utilSql += ` AND u.utilization_date <= :toDate`;
      utilParams.toDate = toDate;
    }

    let rows = [];
    if (type === "RECEIPT") {
      rows = await query(rcptSql, rcptParams).catch(() => []);
    } else if (type === "UTILIZATION") {
      rows = await query(utilSql, utilParams).catch(() => []);
    } else {
      const [r1, r2] = await Promise.all([
        query(rcptSql, rcptParams).catch(() => []),
        query(utilSql, utilParams).catch(() => []),
      ]);
      rows = [...r1, ...r2];
    }

    rows.sort((a, b) => new Date(b.movement_date || b.created_at) - new Date(a.movement_date || a.created_at));

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.voucher_no && r.voucher_no.toLowerCase().includes(q)) ||
          (r.item_name && r.item_name.toLowerCase().includes(q)) ||
          (r.item_code && r.item_code.toLowerCase().includes(q)) ||
          (r.warehouse_name && r.warehouse_name.toLowerCase().includes(q)) ||
          (r.project_name && r.project_name.toLowerCase().includes(q))
      );
    }

    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
};
