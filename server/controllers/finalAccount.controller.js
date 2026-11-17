/**
 * @file finalAccount.controller.js
 * @description General-purpose Final Account & Retention Release controller for OmniSuite ERP.
 * Handles project financial closeout, reconciliation, retention release schedules, and settlements
 * across all project types (construction, IT, software, consulting, manufacturing, logistics, etc.).
 */

import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";

/**
 * Ensures all final account tables exist
 */
export async function ensureFinalAccountTables() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS pm_final_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        branch_id INT NOT NULL DEFAULT 1,
        project_id INT NOT NULL,
        reference_no VARCHAR(60) NOT NULL UNIQUE,
        final_account_date DATE NULL,
        currency VARCHAR(10) DEFAULT 'GHS',
        exchange_rate DECIMAL(12,4) DEFAULT 1.0000,
        original_contract_value DECIMAL(18,2) DEFAULT 0.00,
        approved_variations_value DECIMAL(18,2) DEFAULT 0.00,
        revised_contract_value DECIMAL(18,2) DEFAULT 0.00,
        additional_approved_charges DECIMAL(18,2) DEFAULT 0.00,
        approved_deductions DECIMAL(18,2) DEFAULT 0.00,
        final_account_value DECIMAL(18,2) DEFAULT 0.00,
        total_invoiced DECIMAL(18,2) DEFAULT 0.00,
        total_paid DECIMAL(18,2) DEFAULT 0.00,
        outstanding_receivable DECIMAL(18,2) DEFAULT 0.00,
        outstanding_payable DECIMAL(18,2) DEFAULT 0.00,
        retention_applicable TINYINT(1) DEFAULT 1,
        retention_basis VARCHAR(50) DEFAULT 'ORIGINAL_CONTRACT_VALUE',
        retention_percent DECIMAL(6,2) DEFAULT 5.00,
        retention_calculation_base DECIMAL(18,2) DEFAULT 0.00,
        total_retention_amount DECIMAL(18,2) DEFAULT 0.00,
        retention_previously_released DECIMAL(18,2) DEFAULT 0.00,
        retention_outstanding_balance DECIMAL(18,2) DEFAULT 0.00,
        retention_release_conditions TEXT NULL,
        retention_remarks TEXT NULL,
        final_settlement_status VARCHAR(30) DEFAULT 'NOT_STARTED',
        settlement_reference VARCHAR(100) NULL,
        settlement_remarks TEXT NULL,
        status VARCHAR(30) DEFAULT 'DRAFT',
        reconciled_by VARCHAR(100) NULL,
        reconciled_date DATE NULL,
        agreed_by_client VARCHAR(100) NULL,
        agreed_client_date DATE NULL,
        supporting_documents JSON NULL,
        created_by INT NULL,
        updated_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_fa_company_project (company_id, project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pm_retention_releases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        branch_id INT NOT NULL DEFAULT 1,
        final_account_id INT NOT NULL,
        project_id INT NOT NULL,
        release_reference VARCHAR(60) NOT NULL,
        release_stage VARCHAR(50) NOT NULL,
        release_percent DECIMAL(6,2) DEFAULT 0.00,
        release_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        expected_release_date DATE NULL,
        actual_release_date DATE NULL,
        release_conditions TEXT NULL,
        release_status VARCHAR(30) DEFAULT 'PENDING',
        payment_voucher_ref VARCHAR(100) NULL,
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_rr_fa (final_account_id),
        INDEX idx_rr_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pm_final_account_adjustments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        branch_id INT NOT NULL DEFAULT 1,
        final_account_id INT NOT NULL,
        project_id INT NOT NULL,
        adjustment_reference VARCHAR(60) NOT NULL,
        adjustment_type VARCHAR(50) NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        reason_justification TEXT NULL,
        supporting_documents JSON NULL,
        submitted_by VARCHAR(100) NULL,
        reviewed_status VARCHAR(30) DEFAULT 'PENDING',
        reviewed_by VARCHAR(100) NULL,
        adjustment_date DATE NULL,
        remarks TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_adj_fa (final_account_id),
        INDEX idx_adj_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS pm_financial_reconciliations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_id INT NOT NULL,
        branch_id INT NOT NULL DEFAULT 1,
        final_account_id INT NOT NULL,
        project_id INT NOT NULL,
        transaction_date DATE NULL,
        transaction_reference VARCHAR(100) NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        source_module VARCHAR(50) NULL,
        source_table VARCHAR(50) NULL,
        source_id INT NULL,
        description VARCHAR(255) NOT NULL,
        original_amount DECIMAL(18,2) DEFAULT 0.00,
        approved_adjustments DECIMAL(18,2) DEFAULT 0.00,
        final_amount DECIMAL(18,2) DEFAULT 0.00,
        amount_invoiced DECIMAL(18,2) DEFAULT 0.00,
        amount_paid DECIMAL(18,2) DEFAULT 0.00,
        outstanding_balance DECIMAL(18,2) DEFAULT 0.00,
        reconciliation_status VARCHAR(30) DEFAULT 'PENDING',
        discrepancy_notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_rec_fa (final_account_id),
        INDEX idx_rec_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  } catch (err) {
    console.error("Error in ensureFinalAccountTables:", err);
  }
}

/**
 * Retrieves real-time project financial information from across OmniSuite modules.
 */
export async function getProjectFinancialMetrics(companyId, projectId) {
  // 1. Project details
  const [project] = await query(
    `SELECT p.*, 
            COALESCE(c.customer_name, p.client_name) AS resolved_client_name
     FROM pm_projects p
     LEFT JOIN sal_customers c ON p.client_id = c.id
     WHERE p.id = ? AND p.company_id = ?`,
    [projectId, companyId]
  );

  if (!project) return null;

  // 2. Approved Variations (Change Orders)
  const [variationSum] = await query(
    `SELECT COALESCE(SUM(COALESCE(amount_approved, proposed_selling_price, cost_impact)), 0) AS total_variations,
            COUNT(*) AS variation_count
     FROM pm_variations 
     WHERE project_id = ? AND company_id = ? AND status = 'APPROVED'`,
    [projectId, companyId]
  ).catch(() => [{ total_variations: 0, variation_count: 0 }]);

  // 3. Project Invoices (prj_invoices)
  const [invoicesSummary] = await query(
    `SELECT COALESCE(SUM(net_amount), 0) AS total_invoiced,
            COALESCE(SUM(amount_paid), 0) AS total_paid,
            COALESCE(SUM(balance), 0) AS outstanding_balance,
            COUNT(*) AS invoice_count
     FROM prj_invoices 
     WHERE project_id = ? AND company_id = ? AND status != 'CANCELLED'`,
    [projectId, companyId]
  ).catch(() => [{ total_invoiced: 0, total_paid: 0, outstanding_balance: 0, invoice_count: 0 }]);

  // 4. Client Payment Applications (pm_payment_applications)
  const [payAppsSummary] = await query(
    `SELECT COALESCE(SUM(certified_amount), 0) AS total_certified,
            COALESCE(SUM(amount_paid), 0) AS total_app_paid,
            COALESCE(SUM(retention_amount), 0) AS total_retention_held,
            COALESCE(SUM(outstanding_balance), 0) AS app_balance,
            COUNT(*) AS app_count
     FROM pm_payment_applications 
     WHERE project_id = ? AND company_id = ? AND status NOT IN ('REJECTED', 'DRAFT')`,
    [projectId, companyId]
  ).catch(() => [{ total_certified: 0, total_app_paid: 0, total_retention_held: 0, app_balance: 0, app_count: 0 }]);

  // 5. Project Expenses & Payables (fin_vouchers where project_id matches)
  const [vouchersSummary] = await query(
    `SELECT COALESCE(SUM(total_debit), 0) AS total_payable_expenses,
            COUNT(*) AS voucher_count
     FROM fin_vouchers 
     WHERE project_id = ? AND company_id = ? AND status = 'POSTED'`,
    [projectId, companyId]
  ).catch(() => [{ total_payable_expenses: 0, voucher_count: 0 }]);

  // Calculated values
  const originalContract = Number(project.contract_sum || project.budget || 0);
  const approvedVariations = Number(variationSum?.total_variations || 0);
  const revisedContract = originalContract + approvedVariations;
  
  // Choose highest fidelity invoiced / paid numbers
  const invoiced = Number(invoicesSummary?.total_invoiced || 0) || Number(payAppsSummary?.total_certified || 0);
  const paid = Number(invoicesSummary?.total_paid || 0) || Number(payAppsSummary?.total_app_paid || 0);
  const payable = Number(vouchersSummary?.total_payable_expenses || 0);

  return {
    project: {
      id: project.id,
      project_code: project.project_code,
      project_name: project.project_name,
      project_type: project.project_type || "Standard",
      client_name: project.resolved_client_name || project.client_name || "N/A",
      manager_name: project.manager_name || "N/A",
      contract_ref_no: project.contract_ref_no || "N/A",
      start_date: project.start_date ? String(project.start_date).slice(0, 10) : null,
      end_date: project.end_date ? String(project.end_date).slice(0, 10) : null,
      actual_end_date: project.actual_end_date ? String(project.actual_end_date).slice(0, 10) : null,
      project_status: project.project_status || "ACTIVE",
      currency: project.contract_currency || project.currency || "GHS",
      retention_percent: Number(project.retention_percent || 5.0),
      retention_held: Number(project.retention_held || payAppsSummary?.total_retention_held || 0),
      retention_released: Number(project.retention_released || 0),
    },
    metrics: {
      original_contract_value: originalContract,
      approved_variations_value: approvedVariations,
      revised_contract_value: revisedContract,
      total_invoiced: invoiced,
      total_paid: paid,
      outstanding_receivable: Math.max(0, revisedContract - paid),
      outstanding_payable: payable,
      variation_count: variationSum?.variation_count || 0,
      invoice_count: invoicesSummary?.invoice_count || 0,
      app_count: payAppsSummary?.app_count || 0,
    },
  };
}

/**
 * List all Final Account summaries
 * GET /api/projects/final-accounts
 */
export async function listFinalAccounts(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const { project_id, status } = req.query;

    let sql = `
      SELECT fa.*,
             p.project_code,
             p.project_name,
             p.project_type,
             p.client_name,
             p.manager_name,
             p.contract_ref_no
      FROM pm_final_accounts fa
      JOIN pm_projects p ON fa.project_id = p.id
      WHERE fa.company_id = ?
    `;
    const params = [companyId];

    if (project_id) {
      sql += ` AND fa.project_id = ?`;
      params.push(project_id);
    }
    if (status) {
      sql += ` AND fa.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY fa.created_at DESC`;

    const items = await query(sql, params);
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Final Account record for a specific project along with live ERP metrics
 * GET /api/projects/final-accounts/project/:projectId
 */
export async function getFinalAccountByProject(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const { projectId } = req.params;

    const liveData = await getProjectFinancialMetrics(companyId, projectId);
    if (!liveData) {
      return res.status(404).json({ message: "Project not found" });
    }

    const [existing] = await query(
      `SELECT * FROM pm_final_accounts WHERE company_id = ? AND project_id = ? ORDER BY id DESC LIMIT 1`,
      [companyId, projectId]
    );

    let releases = [];
    let adjustments = [];
    let reconciliations = [];

    if (existing) {
      releases = await query(
        `SELECT * FROM pm_retention_releases WHERE final_account_id = ? ORDER BY id ASC`,
        [existing.id]
      );
      adjustments = await query(
        `SELECT * FROM pm_final_account_adjustments WHERE final_account_id = ? ORDER BY id ASC`,
        [existing.id]
      );
      reconciliations = await query(
        `SELECT * FROM pm_financial_reconciliations WHERE final_account_id = ? ORDER BY transaction_date DESC, id DESC`,
        [existing.id]
      );
    }

    res.json({
      project: liveData.project,
      live_metrics: liveData.metrics,
      final_account: existing || null,
      releases,
      adjustments,
      reconciliations,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Final Account by ID with all sub-tables
 * GET /api/projects/final-accounts/:id
 */
export async function getFinalAccountById(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const { id } = req.params;

    const [finalAccount] = await query(
      `SELECT fa.*,
              p.project_code,
              p.project_name,
              p.project_type,
              p.client_name,
              p.manager_name,
              p.contract_ref_no,
              p.start_date,
              p.end_date,
              p.actual_end_date,
              p.project_status
       FROM pm_final_accounts fa
       JOIN pm_projects p ON fa.project_id = p.id
       WHERE fa.id = ? AND fa.company_id = ?`,
      [id, companyId]
    );

    if (!finalAccount) {
      return res.status(404).json({ message: "Final Account not found" });
    }

    const liveData = await getProjectFinancialMetrics(companyId, finalAccount.project_id);

    const releases = await query(
      `SELECT * FROM pm_retention_releases WHERE final_account_id = ? ORDER BY id ASC`,
      [id]
    );
    const adjustments = await query(
      `SELECT * FROM pm_final_account_adjustments WHERE final_account_id = ? ORDER BY id ASC`,
      [id]
    );
    const reconciliations = await query(
      `SELECT * FROM pm_financial_reconciliations WHERE final_account_id = ? ORDER BY transaction_date DESC, id DESC`,
      [id]
    );

    res.json({
      final_account: finalAccount,
      live_metrics: liveData?.metrics || null,
      project: liveData?.project || null,
      releases,
      adjustments,
      reconciliations,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new Final Account for a project
 * POST /api/projects/final-accounts
 */
export async function createFinalAccount(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const branchId = req.scope?.branchId || req.user?.branchId || 1;
    const userId = req.user?.id || req.user?.sub || null;

    const {
      project_id,
      final_account_date,
      currency = "GHS",
      exchange_rate = 1.0,
      original_contract_value,
      approved_variations_value,
      additional_approved_charges = 0,
      approved_deductions = 0,
      total_invoiced = 0,
      total_paid = 0,
      outstanding_payable = 0,
      retention_applicable = 1,
      retention_basis = "ORIGINAL_CONTRACT_VALUE",
      retention_percent = 5.0,
      retention_calculation_base,
      total_retention_amount,
      retention_previously_released = 0,
      retention_release_conditions,
      retention_remarks,
      final_settlement_status = "NOT_STARTED",
      settlement_reference,
      settlement_remarks,
      status = "DRAFT",
      supporting_documents,
      releases = [],
      adjustments = [],
    } = req.body;

    if (!project_id) {
      return res.status(400).json({ message: "project_id is required" });
    }

    // Auto-calculate values following specification rules
    const origVal = Number(original_contract_value || 0);
    const varVal = Number(approved_variations_value || 0);
    const revisedVal = origVal + varVal;
    const addCharges = Number(additional_approved_charges || 0);
    const dedVal = Number(approved_deductions || 0);
    const finalVal = revisedVal + addCharges - dedVal;
    const paidVal = Number(total_paid || 0);
    const invoicedVal = Number(total_invoiced || 0);
    const outstandingRec = Math.max(0, finalVal - paidVal);

    // Retention calculations
    const isRet = Number(retention_applicable) === 1;
    let retBase = Number(retention_calculation_base || 0);
    if (!retBase) {
      if (retention_basis === "REVISED_CONTRACT_VALUE") retBase = revisedVal;
      else if (retention_basis === "INVOICED_AMOUNT") retBase = invoicedVal;
      else retBase = origVal;
    }
    const retPct = isRet ? Number(retention_percent || 0) : 0;
    const totalRet = isRet ? Number(total_retention_amount || (retBase * (retPct / 100))) : 0;
    const prevReleased = Number(retention_previously_released || 0);
    const outRet = Math.max(0, totalRet - prevReleased);

    // Generate unique reference
    const [project] = await query(
      `SELECT project_code FROM pm_projects WHERE id = ? AND company_id = ?`,
      [project_id, companyId]
    );
    const codePart = project?.project_code ? project.project_code.replace(/[^a-zA-Z0-9]/g, "") : `PRJ${project_id}`;
    const year = new Date().getFullYear();
    const [countRes] = await query(
      `SELECT COUNT(*) AS cnt FROM pm_final_accounts WHERE company_id = ?`,
      [companyId]
    );
    const seq = String((countRes?.cnt || 0) + 1).padStart(4, "0");
    const refNo = `FA-${codePart}-${year}-${seq}`;

    const insertResult = await query(
      `INSERT INTO pm_final_accounts (
        company_id, branch_id, project_id, reference_no, final_account_date,
        currency, exchange_rate, original_contract_value, approved_variations_value,
        revised_contract_value, additional_approved_charges, approved_deductions,
        final_account_value, total_invoiced, total_paid, outstanding_receivable,
        outstanding_payable, retention_applicable, retention_basis, retention_percent,
        retention_calculation_base, total_retention_amount, retention_previously_released,
        retention_outstanding_balance, retention_release_conditions, retention_remarks,
        final_settlement_status, settlement_reference, settlement_remarks, status,
        supporting_documents, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        branchId,
        project_id,
        refNo,
        final_account_date || new Date().toISOString().slice(0, 10),
        currency,
        exchange_rate,
        origVal,
        varVal,
        revisedVal,
        addCharges,
        dedVal,
        finalVal,
        invoicedVal,
        paidVal,
        outstandingRec,
        Number(outstanding_payable || 0),
        isRet ? 1 : 0,
        retention_basis,
        retPct,
        retBase,
        totalRet,
        prevReleased,
        outRet,
        retention_release_conditions || null,
        retention_remarks || null,
        final_settlement_status,
        settlement_reference || null,
        settlement_remarks || null,
        status,
        supporting_documents ? JSON.stringify(supporting_documents) : null,
        userId,
        userId,
      ]
    );

    const faId = insertResult.insertId;

    // Insert releases if provided
    if (Array.isArray(releases) && releases.length > 0) {
      for (const r of releases) {
        await query(
          `INSERT INTO pm_retention_releases (
            company_id, branch_id, final_account_id, project_id, release_reference,
            release_stage, release_percent, release_amount, expected_release_date,
            actual_release_date, release_conditions, release_status, payment_voucher_ref, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            companyId,
            branchId,
            faId,
            project_id,
            r.release_reference || `REL-${faId}-${Date.now().toString().slice(-4)}`,
            r.release_stage || "Initial Retention Release",
            Number(r.release_percent || 0),
            Number(r.release_amount || 0),
            r.expected_release_date || null,
            r.actual_release_date || null,
            r.release_conditions || null,
            r.release_status || "PENDING",
            r.payment_voucher_ref || null,
            r.remarks || null,
          ]
        );
      }
    }

    // Insert adjustments if provided
    if (Array.isArray(adjustments) && adjustments.length > 0) {
      for (const a of adjustments) {
        await query(
          `INSERT INTO pm_final_account_adjustments (
            company_id, branch_id, final_account_id, project_id, adjustment_reference,
            adjustment_type, description, amount, reason_justification, supporting_documents,
            submitted_by, reviewed_status, reviewed_by, adjustment_date, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            companyId,
            branchId,
            faId,
            project_id,
            a.adjustment_reference || `ADJ-${faId}-${Date.now().toString().slice(-4)}`,
            a.adjustment_type || "OTHER",
            a.description || "Final Account Adjustment",
            Number(a.amount || 0),
            a.reason_justification || null,
            a.supporting_documents ? JSON.stringify(a.supporting_documents) : null,
            a.submitted_by || req.user?.username || null,
            a.reviewed_status || "PENDING",
            a.reviewed_by || null,
            a.adjustment_date || new Date().toISOString().slice(0, 10),
            a.remarks || null,
          ]
        );
      }
    }

    // Build initial reconciliation lines from available source transactions
    await syncReconciliationItems(companyId, branchId, faId, project_id, origVal);

    const [created] = await query(`SELECT * FROM pm_final_accounts WHERE id = ?`, [faId]);
    res.status(201).json({
      message: "Final Account created successfully",
      final_account: created,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update an existing Final Account
 * PUT /api/projects/final-accounts/:id
 */
export async function updateFinalAccount(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const userId = req.user?.id || req.user?.sub || null;
    const { id } = req.params;

    const [existing] = await query(
      `SELECT * FROM pm_final_accounts WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );
    if (!existing) {
      return res.status(404).json({ message: "Final Account not found" });
    }

    const {
      final_account_date,
      currency,
      exchange_rate,
      original_contract_value,
      approved_variations_value,
      additional_approved_charges,
      approved_deductions,
      total_invoiced,
      total_paid,
      outstanding_payable,
      retention_applicable,
      retention_basis,
      retention_percent,
      retention_calculation_base,
      total_retention_amount,
      retention_previously_released,
      retention_release_conditions,
      retention_remarks,
      final_settlement_status,
      settlement_reference,
      settlement_remarks,
      status,
      reconciled_by,
      reconciled_date,
      agreed_by_client,
      agreed_client_date,
      supporting_documents,
    } = req.body;

    // Recalculate
    const origVal = original_contract_value !== undefined ? Number(original_contract_value) : Number(existing.original_contract_value);
    const varVal = approved_variations_value !== undefined ? Number(approved_variations_value) : Number(existing.approved_variations_value);
    const revisedVal = origVal + varVal;
    const addCharges = additional_approved_charges !== undefined ? Number(additional_approved_charges) : Number(existing.additional_approved_charges);
    const dedVal = approved_deductions !== undefined ? Number(approved_deductions) : Number(existing.approved_deductions);
    const finalVal = revisedVal + addCharges - dedVal;
    const paidVal = total_paid !== undefined ? Number(total_paid) : Number(existing.total_paid);
    const invoicedVal = total_invoiced !== undefined ? Number(total_invoiced) : Number(existing.total_invoiced);
    const outstandingRec = Math.max(0, finalVal - paidVal);

    // Retention
    const isRet = retention_applicable !== undefined ? Number(retention_applicable) === 1 : existing.retention_applicable === 1;
    const retPct = isRet ? (retention_percent !== undefined ? Number(retention_percent) : Number(existing.retention_percent)) : 0;
    const basis = retention_basis || existing.retention_basis || "ORIGINAL_CONTRACT_VALUE";
    let retBase = retention_calculation_base !== undefined ? Number(retention_calculation_base) : Number(existing.retention_calculation_base);
    if (!retBase) {
      if (basis === "REVISED_CONTRACT_VALUE") retBase = revisedVal;
      else if (basis === "INVOICED_AMOUNT") retBase = invoicedVal;
      else retBase = origVal;
    }
    const totalRet = isRet ? (total_retention_amount !== undefined ? Number(total_retention_amount) : Number(retBase * (retPct / 100))) : 0;
    
    // Check actual releases in DB to ensure released retention does not exceed available balance
    const [releasesSum] = await query(
      `SELECT COALESCE(SUM(release_amount), 0) AS actual_released
       FROM pm_retention_releases
       WHERE final_account_id = ? AND release_status = 'RELEASED'`,
      [id]
    );
    const actualReleased = Number(releasesSum?.actual_released || 0);
    const prevReleased = retention_previously_released !== undefined ? Math.max(actualReleased, Number(retention_previously_released)) : Math.max(actualReleased, Number(existing.retention_previously_released));

    if (isRet && prevReleased > totalRet + 0.01) {
      return res.status(400).json({
        message: `Released retention (${prevReleased.toFixed(2)}) cannot exceed total retention balance (${totalRet.toFixed(2)})`,
      });
    }

    const outRet = Math.max(0, totalRet - prevReleased);

    // Validation 14: Prevent marking as FULLY_SETTLED if material outstanding balances remain
    const settlementStatus = final_settlement_status || existing.final_settlement_status;
    if (settlementStatus === "FULLY_SETTLED") {
      if (outstandingRec > 1.0) {
        return res.status(400).json({
          message: `Cannot mark project as Fully Settled while outstanding receivable is ${outstandingRec.toFixed(2)} ${existing.currency}`,
        });
      }
      if (isRet && outRet > 1.0) {
        return res.status(400).json({
          message: `Cannot mark project as Fully Settled while unreleased retention balance is ${outRet.toFixed(2)} ${existing.currency}`,
        });
      }
    }

    await query(
      `UPDATE pm_final_accounts SET
        final_account_date = ?,
        currency = ?,
        exchange_rate = ?,
        original_contract_value = ?,
        approved_variations_value = ?,
        revised_contract_value = ?,
        additional_approved_charges = ?,
        approved_deductions = ?,
        final_account_value = ?,
        total_invoiced = ?,
        total_paid = ?,
        outstanding_receivable = ?,
        outstanding_payable = ?,
        retention_applicable = ?,
        retention_basis = ?,
        retention_percent = ?,
        retention_calculation_base = ?,
        total_retention_amount = ?,
        retention_previously_released = ?,
        retention_outstanding_balance = ?,
        retention_release_conditions = ?,
        retention_remarks = ?,
        final_settlement_status = ?,
        settlement_reference = ?,
        settlement_remarks = ?,
        status = ?,
        reconciled_by = ?,
        reconciled_date = ?,
        agreed_by_client = ?,
        agreed_client_date = ?,
        supporting_documents = ?,
        updated_by = ?
      WHERE id = ? AND company_id = ?`,
      [
        final_account_date || existing.final_account_date,
        currency || existing.currency,
        exchange_rate !== undefined ? exchange_rate : existing.exchange_rate,
        origVal,
        varVal,
        revisedVal,
        addCharges,
        dedVal,
        finalVal,
        invoicedVal,
        paidVal,
        outstandingRec,
        outstanding_payable !== undefined ? Number(outstanding_payable) : existing.outstanding_payable,
        isRet ? 1 : 0,
        basis,
        retPct,
        retBase,
        totalRet,
        prevReleased,
        outRet,
        retention_release_conditions !== undefined ? retention_release_conditions : existing.retention_release_conditions,
        retention_remarks !== undefined ? retention_remarks : existing.retention_remarks,
        settlementStatus,
        settlement_reference !== undefined ? settlement_reference : existing.settlement_reference,
        settlement_remarks !== undefined ? settlement_remarks : existing.settlement_remarks,
        status || existing.status,
        reconciled_by !== undefined ? reconciled_by : existing.reconciled_by,
        reconciled_date !== undefined ? reconciled_date : existing.reconciled_date,
        agreed_by_client !== undefined ? agreed_by_client : existing.agreed_by_client,
        agreed_client_date !== undefined ? agreed_client_date : existing.agreed_client_date,
        supporting_documents ? JSON.stringify(supporting_documents) : existing.supporting_documents,
        userId,
        id,
        companyId,
      ]
    );

    const [updated] = await query(`SELECT * FROM pm_final_accounts WHERE id = ?`, [id]);
    res.json({
      message: "Final Account updated successfully",
      final_account: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Re-sync and Reconcile source transactions into pm_financial_reconciliations
 * POST /api/projects/final-accounts/:id/reconcile
 */
export async function reconcileFinalAccount(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const branchId = req.scope?.branchId || req.user?.branchId || 1;
    const { id } = req.params;

    const [fa] = await query(
      `SELECT * FROM pm_final_accounts WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );
    if (!fa) {
      return res.status(404).json({ message: "Final Account not found" });
    }

    const liveData = await getProjectFinancialMetrics(companyId, fa.project_id);
    await syncReconciliationItems(companyId, branchId, id, fa.project_id, fa.original_contract_value);

    // Sum up approved adjustments
    const [approvedAdj] = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN adjustment_type IN ('ADDITIONAL_CHARGES', 'APPROVED_CLAIMS') THEN amount ELSE 0 END), 0) AS add_charges,
        COALESCE(SUM(CASE WHEN adjustment_type IN ('PENALTIES', 'DEDUCTIONS', 'CREDIT_ADJUSTMENTS') THEN amount ELSE 0 END), 0) AS deductions
       FROM pm_final_account_adjustments
       WHERE final_account_id = ? AND reviewed_status = 'APPROVED'`,
      [id]
    );

    const addCharges = Number(approvedAdj?.add_charges || 0);
    const dedVal = Number(approvedAdj?.deductions || 0);
    const varVal = Number(liveData?.metrics?.approved_variations_value || fa.approved_variations_value);
    const origVal = Number(fa.original_contract_value);
    const revisedVal = origVal + varVal;
    const finalVal = revisedVal + addCharges - dedVal;
    const paidVal = Number(liveData?.metrics?.total_paid || fa.total_paid);
    const invoicedVal = Number(liveData?.metrics?.total_invoiced || fa.total_invoiced);
    const outRec = Math.max(0, finalVal - paidVal);

    await query(
      `UPDATE pm_final_accounts SET
        approved_variations_value = ?,
        revised_contract_value = ?,
        additional_approved_charges = ?,
        approved_deductions = ?,
        final_account_value = ?,
        total_invoiced = ?,
        total_paid = ?,
        outstanding_receivable = ?,
        reconciled_by = ?,
        reconciled_date = CURDATE(),
        status = CASE WHEN status = 'DRAFT' THEN 'RECONCILED' ELSE status END
       WHERE id = ?`,
      [
        varVal,
        revisedVal,
        addCharges,
        dedVal,
        finalVal,
        invoicedVal,
        paidVal,
        outRec,
        req.user?.username || "System",
        id,
      ]
    );

    const items = await query(
      `SELECT * FROM pm_financial_reconciliations WHERE final_account_id = ? ORDER BY transaction_date DESC, id DESC`,
      [id]
    );

    const [updated] = await query(`SELECT * FROM pm_final_accounts WHERE id = ?`, [id]);

    res.json({
      message: "Financial accounts reconciled successfully",
      final_account: updated,
      reconciliations: items,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Helper to sync source transactions into pm_financial_reconciliations
 */
async function syncReconciliationItems(companyId, branchId, faId, projectId, origVal) {
  // 1. Initial Contract Value line
  const [hasContract] = await query(
    `SELECT id FROM pm_financial_reconciliations 
     WHERE final_account_id = ? AND transaction_type = 'CONTRACT_VALUE'`,
    [faId]
  );
  if (!hasContract) {
    await query(
      `INSERT INTO pm_financial_reconciliations (
        company_id, branch_id, final_account_id, project_id, transaction_date,
        transaction_reference, transaction_type, source_module, source_table, source_id,
        description, original_amount, approved_adjustments, final_amount,
        amount_invoiced, amount_paid, outstanding_balance, reconciliation_status
      ) VALUES (?, ?, ?, ?, CURDATE(), ?, 'CONTRACT_VALUE', 'PM', 'pm_projects', ?, ?, ?, 0.00, ?, 0.00, 0.00, ?, 'RECONCILED')`,
      [
        companyId,
        branchId,
        faId,
        projectId,
        `CTR-PRJ-${projectId}`,
        projectId,
        "Original Approved Contract / Project Scope Value",
        origVal,
        origVal,
        origVal,
      ]
    );
  }

  // 2. Variations (Change Orders)
  const variations = await query(
    `SELECT id, variation_code, title, amount_approved, proposed_selling_price, date_raised, effective_date, status
     FROM pm_variations 
     WHERE project_id = ? AND company_id = ? AND status = 'APPROVED'`,
    [projectId, companyId]
  ).catch(() => []);

  for (const v of variations) {
    const ref = v.variation_code || `VO-${v.id}`;
    const [exists] = await query(
      `SELECT id FROM pm_financial_reconciliations 
       WHERE final_account_id = ? AND source_table = 'pm_variations' AND source_id = ?`,
      [faId, v.id]
    );
    const amt = Number(v.amount_approved || v.proposed_selling_price || 0);
    if (!exists) {
      await query(
        `INSERT INTO pm_financial_reconciliations (
          company_id, branch_id, final_account_id, project_id, transaction_date,
          transaction_reference, transaction_type, source_module, source_table, source_id,
          description, original_amount, approved_adjustments, final_amount,
          amount_invoiced, amount_paid, outstanding_balance, reconciliation_status
        ) VALUES (?, ?, ?, ?, ?, ?, 'APPROVED_VARIATION', 'PM', 'pm_variations', ?, ?, ?, 0.00, ?, 0.00, 0.00, ?, 'RECONCILED')`,
        [
          companyId,
          branchId,
          faId,
          projectId,
          v.effective_date || v.date_raised || new Date().toISOString().slice(0, 10),
          ref,
          v.id,
          `Approved Variation: ${v.title || ref}`,
          amt,
          amt,
          amt,
        ]
      );
    }
  }

  // 3. Project Invoices
  const invoices = await query(
    `SELECT id, invoice_no, invoice_date, total_amount, net_amount, amount_paid, balance, status, payment_status
     FROM prj_invoices 
     WHERE project_id = ? AND company_id = ? AND status != 'CANCELLED'`,
    [projectId, companyId]
  ).catch(() => []);

  for (const inv of invoices) {
    const [exists] = await query(
      `SELECT id FROM pm_financial_reconciliations 
       WHERE final_account_id = ? AND source_table = 'prj_invoices' AND source_id = ?`,
      [faId, inv.id]
    );
    const net = Number(inv.net_amount || inv.total_amount || 0);
    const paid = Number(inv.amount_paid || 0);
    const bal = Number(inv.balance || (net - paid));
    const isReconciled = bal <= 0.01 ? "RECONCILED" : "PENDING";

    if (!exists) {
      await query(
        `INSERT INTO pm_financial_reconciliations (
          company_id, branch_id, final_account_id, project_id, transaction_date,
          transaction_reference, transaction_type, source_module, source_table, source_id,
          description, original_amount, approved_adjustments, final_amount,
          amount_invoiced, amount_paid, outstanding_balance, reconciliation_status
        ) VALUES (?, ?, ?, ?, ?, ?, 'INVOICE', 'SALES', 'prj_invoices', ?, ?, ?, 0.00, ?, ?, ?, ?, ?)`,
        [
          companyId,
          branchId,
          faId,
          projectId,
          inv.invoice_date || new Date().toISOString().slice(0, 10),
          inv.invoice_no,
          inv.id,
          `Project Invoice: ${inv.invoice_no} (${inv.payment_status || "Issued"})`,
          net,
          net,
          net,
          paid,
          bal,
          isReconciled,
        ]
      );
    }
  }

  // 4. Payment Applications (Valuations)
  const payApps = await query(
    `SELECT id, application_no, valuation_no, application_date, gross_amount_assessed, certified_amount, amount_paid, outstanding_balance, payment_status
     FROM pm_payment_applications 
     WHERE project_id = ? AND company_id = ? AND status NOT IN ('REJECTED', 'DRAFT')`,
    [projectId, companyId]
  ).catch(() => []);

  for (const app of payApps) {
    const ref = app.application_no || app.valuation_no || `IPA-${app.id}`;
    const [exists] = await query(
      `SELECT id FROM pm_financial_reconciliations 
       WHERE final_account_id = ? AND source_table = 'pm_payment_applications' AND source_id = ?`,
      [faId, app.id]
    );
    const cert = Number(app.certified_amount || app.gross_amount_assessed || 0);
    const paid = Number(app.amount_paid || 0);
    const bal = Number(app.outstanding_balance || (cert - paid));
    const isReconciled = bal <= 0.01 ? "RECONCILED" : "PENDING";

    if (!exists) {
      await query(
        `INSERT INTO pm_financial_reconciliations (
          company_id, branch_id, final_account_id, project_id, transaction_date,
          transaction_reference, transaction_type, source_module, source_table, source_id,
          description, original_amount, approved_adjustments, final_amount,
          amount_invoiced, amount_paid, outstanding_balance, reconciliation_status
        ) VALUES (?, ?, ?, ?, ?, ?, 'PAYMENT', 'PM', 'pm_payment_applications', ?, ?, ?, 0.00, ?, ?, ?, ?, ?)`,
        [
          companyId,
          branchId,
          faId,
          projectId,
          app.application_date || new Date().toISOString().slice(0, 10),
          ref,
          app.id,
          `Payment Application: ${ref} (Certified: ${cert.toFixed(2)})`,
          cert,
          cert,
          cert,
          paid,
          bal,
          isReconciled,
        ]
      );
    }
  }
}

/**
 * Add a retention release milestone
 * POST /api/projects/final-accounts/:id/releases
 */
export async function createRetentionRelease(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const branchId = req.scope?.branchId || req.user?.branchId || 1;
    const { id } = req.params;

    const [fa] = await query(
      `SELECT * FROM pm_final_accounts WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );
    if (!fa) {
      return res.status(404).json({ message: "Final Account not found" });
    }

    const {
      release_stage,
      release_percent,
      release_amount,
      expected_release_date,
      actual_release_date,
      release_conditions,
      release_status = "PENDING",
      payment_voucher_ref,
      remarks,
    } = req.body;

    const relAmount = Number(release_amount || 0);
    if (relAmount <= 0) {
      return res.status(400).json({ message: "Release amount must be greater than zero" });
    }

    // Cumulative released amount check: ensure cumulative released amount cannot exceed available retention balance
    const [existingReleases] = await query(
      `SELECT COALESCE(SUM(release_amount), 0) AS total_released
       FROM pm_retention_releases
       WHERE final_account_id = ? AND release_status != 'CANCELLED'`,
      [id]
    );

    const currentCumulative = Number(existingReleases?.total_released || 0);
    const newCumulative = currentCumulative + relAmount;
    const totalRetention = Number(fa.total_retention_amount || 0);

    if (newCumulative > totalRetention + 0.01) {
      return res.status(400).json({
        message: `Cumulative releases (${newCumulative.toFixed(2)}) exceed total retention amount (${totalRetention.toFixed(2)}). Max release available is ${(totalRetention - currentCumulative).toFixed(2)}`,
      });
    }

    const ref = `RET-REL-${id}-${Date.now().toString().slice(-4)}`;

    const result = await query(
      `INSERT INTO pm_retention_releases (
        company_id, branch_id, final_account_id, project_id, release_reference,
        release_stage, release_percent, release_amount, expected_release_date,
        actual_release_date, release_conditions, release_status, payment_voucher_ref, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        branchId,
        id,
        fa.project_id,
        ref,
        release_stage || "Initial Retention Release",
        Number(release_percent || 0),
        relAmount,
        expected_release_date || null,
        actual_release_date || null,
        release_conditions || null,
        release_status,
        payment_voucher_ref || null,
        remarks || null,
      ]
    );

    // Update final account retention totals
    const isReleased = release_status === "RELEASED";
    if (isReleased) {
      const newPreviouslyReleased = Number(fa.retention_previously_released || 0) + relAmount;
      const newOutstanding = Math.max(0, totalRetention - newPreviouslyReleased);
      await query(
        `UPDATE pm_final_accounts SET
          retention_previously_released = ?,
          retention_outstanding_balance = ?
         WHERE id = ?`,
        [newPreviouslyReleased, newOutstanding, id]
      );
    }

    const [created] = await query(`SELECT * FROM pm_retention_releases WHERE id = ?`, [result.insertId]);
    res.status(201).json({
      message: "Retention release recorded successfully",
      release: created,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update retention release
 * PUT /api/projects/final-accounts/:id/releases/:releaseId
 */
export async function updateRetentionRelease(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const { id, releaseId } = req.params;

    const [fa] = await query(
      `SELECT * FROM pm_final_accounts WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );
    if (!fa) return res.status(404).json({ message: "Final Account not found" });

    const [rel] = await query(
      `SELECT * FROM pm_retention_releases WHERE id = ? AND final_account_id = ?`,
      [releaseId, id]
    );
    if (!rel) return res.status(404).json({ message: "Retention release not found" });

    const {
      release_stage,
      release_percent,
      release_amount,
      expected_release_date,
      actual_release_date,
      release_conditions,
      release_status,
      payment_voucher_ref,
      remarks,
    } = req.body;

    const newAmt = release_amount !== undefined ? Number(release_amount) : Number(rel.release_amount);

    await query(
      `UPDATE pm_retention_releases SET
        release_stage = ?,
        release_percent = ?,
        release_amount = ?,
        expected_release_date = ?,
        actual_release_date = ?,
        release_conditions = ?,
        release_status = ?,
        payment_voucher_ref = ?,
        remarks = ?
       WHERE id = ?`,
      [
        release_stage || rel.release_stage,
        release_percent !== undefined ? Number(release_percent) : rel.release_percent,
        newAmt,
        expected_release_date !== undefined ? expected_release_date : rel.expected_release_date,
        actual_release_date !== undefined ? actual_release_date : rel.actual_release_date,
        release_conditions !== undefined ? release_conditions : rel.release_conditions,
        release_status || rel.release_status,
        payment_voucher_ref !== undefined ? payment_voucher_ref : rel.payment_voucher_ref,
        remarks !== undefined ? remarks : rel.remarks,
        releaseId,
      ]
    );

    // Refresh final account released totals
    const [releasesSum] = await query(
      `SELECT COALESCE(SUM(release_amount), 0) AS total_released
       FROM pm_retention_releases
       WHERE final_account_id = ? AND release_status = 'RELEASED'`,
      [id]
    );
    const actualReleased = Number(releasesSum?.total_released || 0);
    const totalRetention = Number(fa.total_retention_amount || 0);
    await query(
      `UPDATE pm_final_accounts SET
        retention_previously_released = ?,
        retention_outstanding_balance = ?
       WHERE id = ?`,
      [actualReleased, Math.max(0, totalRetention - actualReleased), id]
    );

    const [updated] = await query(`SELECT * FROM pm_retention_releases WHERE id = ?`, [releaseId]);
    res.json({
      message: "Retention release updated successfully",
      release: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete retention release
 * DELETE /api/projects/final-accounts/:id/releases/:releaseId
 */
export async function deleteRetentionRelease(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const { id, releaseId } = req.params;

    await query(
      `DELETE FROM pm_retention_releases WHERE id = ? AND final_account_id = ? AND company_id = ?`,
      [releaseId, id, companyId]
    );

    // Refresh totals
    const [fa] = await query(`SELECT * FROM pm_final_accounts WHERE id = ?`, [id]);
    const [releasesSum] = await query(
      `SELECT COALESCE(SUM(release_amount), 0) AS total_released
       FROM pm_retention_releases
       WHERE final_account_id = ? AND release_status = 'RELEASED'`,
      [id]
    );
    const actualReleased = Number(releasesSum?.total_released || 0);
    const totalRetention = Number(fa?.total_retention_amount || 0);

    await query(
      `UPDATE pm_final_accounts SET
        retention_previously_released = ?,
        retention_outstanding_balance = ?
       WHERE id = ?`,
      [actualReleased, Math.max(0, totalRetention - actualReleased), id]
    );

    res.json({ message: "Retention release removed successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * Add Claim / Deduction / Adjustment
 * POST /api/projects/final-accounts/:id/adjustments
 */
export async function createAdjustment(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const branchId = req.scope?.branchId || req.user?.branchId || 1;
    const { id } = req.params;

    const [fa] = await query(
      `SELECT * FROM pm_final_accounts WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );
    if (!fa) return res.status(404).json({ message: "Final Account not found" });

    const {
      adjustment_type = "OTHER",
      description,
      amount = 0,
      reason_justification,
      supporting_documents,
      submitted_by,
      reviewed_status = "PENDING",
      adjustment_date,
      remarks,
    } = req.body;

    if (!description || !String(description).trim()) {
      return res.status(400).json({ message: "Adjustment description is required" });
    }

    const adjAmount = Number(amount || 0);
    const ref = `ADJ-${id}-${Date.now().toString().slice(-4)}`;

    const result = await query(
      `INSERT INTO pm_final_account_adjustments (
        company_id, branch_id, final_account_id, project_id, adjustment_reference,
        adjustment_type, description, amount, reason_justification, supporting_documents,
        submitted_by, reviewed_status, reviewed_by, adjustment_date, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        branchId,
        id,
        fa.project_id,
        ref,
        adjustment_type,
        description.trim(),
        adjAmount,
        reason_justification || null,
        supporting_documents ? JSON.stringify(supporting_documents) : null,
        submitted_by || req.user?.username || null,
        reviewed_status,
        reviewed_status === "APPROVED" ? (req.user?.username || "Admin") : null,
        adjustment_date || new Date().toISOString().slice(0, 10),
        remarks || null,
      ]
    );

    // If approved, recalculate final account totals
    if (reviewed_status === "APPROVED") {
      await recalculateAdjustmentsOnFinalAccount(id);
    }

    const [created] = await query(`SELECT * FROM pm_final_account_adjustments WHERE id = ?`, [result.insertId]);
    res.status(201).json({
      message: "Adjustment added successfully",
      adjustment: created,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Adjustment
 * PUT /api/projects/final-accounts/:id/adjustments/:adjustmentId
 */
export async function updateAdjustment(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const { id, adjustmentId } = req.params;

    const [adj] = await query(
      `SELECT * FROM pm_final_account_adjustments WHERE id = ? AND final_account_id = ? AND company_id = ?`,
      [adjustmentId, id, companyId]
    );
    if (!adj) return res.status(404).json({ message: "Adjustment not found" });

    const {
      adjustment_type,
      description,
      amount,
      reason_justification,
      supporting_documents,
      submitted_by,
      reviewed_status,
      reviewed_by,
      adjustment_date,
      remarks,
    } = req.body;

    const newStatus = reviewed_status || adj.reviewed_status;
    const reviewer = newStatus === "APPROVED" ? (reviewed_by || req.user?.username || "Admin") : (newStatus === "PENDING" ? null : adj.reviewed_by);

    await query(
      `UPDATE pm_final_account_adjustments SET
        adjustment_type = ?,
        description = ?,
        amount = ?,
        reason_justification = ?,
        supporting_documents = ?,
        submitted_by = ?,
        reviewed_status = ?,
        reviewed_by = ?,
        adjustment_date = ?,
        remarks = ?
       WHERE id = ?`,
      [
        adjustment_type || adj.adjustment_type,
        description !== undefined ? description : adj.description,
        amount !== undefined ? Number(amount) : adj.amount,
        reason_justification !== undefined ? reason_justification : adj.reason_justification,
        supporting_documents ? JSON.stringify(supporting_documents) : adj.supporting_documents,
        submitted_by !== undefined ? submitted_by : adj.submitted_by,
        newStatus,
        reviewer,
        adjustment_date || adj.adjustment_date,
        remarks !== undefined ? remarks : adj.remarks,
        adjustmentId,
      ]
    );

    await recalculateAdjustmentsOnFinalAccount(id);

    const [updated] = await query(`SELECT * FROM pm_final_account_adjustments WHERE id = ?`, [adjustmentId]);
    res.json({
      message: "Adjustment updated successfully",
      adjustment: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete Adjustment
 * DELETE /api/projects/final-accounts/:id/adjustments/:adjustmentId
 */
export async function deleteAdjustment(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const { id, adjustmentId } = req.params;

    await query(
      `DELETE FROM pm_final_account_adjustments WHERE id = ? AND final_account_id = ? AND company_id = ?`,
      [adjustmentId, id, companyId]
    );

    await recalculateAdjustmentsOnFinalAccount(id);

    res.json({ message: "Adjustment removed successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * Update reconciliation item status
 * PUT /api/projects/final-accounts/:id/reconciliation-items/:itemId
 */
export async function updateReconciliationItem(req, res, next) {
  try {
    await ensureFinalAccountTables();
    const companyId = req.scope?.companyId || req.user?.companyId || 1;
    const { id, itemId } = req.params;
    const { reconciliation_status, discrepancy_notes, approved_adjustments } = req.body;

    const [item] = await query(
      `SELECT * FROM pm_financial_reconciliations WHERE id = ? AND final_account_id = ? AND company_id = ?`,
      [itemId, id, companyId]
    );
    if (!item) return res.status(404).json({ message: "Reconciliation item not found" });

    const adj = approved_adjustments !== undefined ? Number(approved_adjustments) : Number(item.approved_adjustments);
    const finalAmt = Number(item.original_amount) + adj;
    const bal = Math.max(0, finalAmt - Number(item.amount_paid));

    await query(
      `UPDATE pm_financial_reconciliations SET
        reconciliation_status = ?,
        discrepancy_notes = ?,
        approved_adjustments = ?,
        final_amount = ?,
        outstanding_balance = ?
       WHERE id = ?`,
      [
        reconciliation_status || item.reconciliation_status,
        discrepancy_notes !== undefined ? discrepancy_notes : item.discrepancy_notes,
        adj,
        finalAmt,
        bal,
        itemId,
      ]
    );

    const [updated] = await query(`SELECT * FROM pm_financial_reconciliations WHERE id = ?`, [itemId]);
    res.json({
      message: "Reconciliation item updated",
      item: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Recalculates additional charges and deductions on final account
 */
async function recalculateAdjustmentsOnFinalAccount(finalAccountId) {
  const [fa] = await query(`SELECT * FROM pm_final_accounts WHERE id = ?`, [finalAccountId]);
  if (!fa) return;

  const [approvedAdj] = await query(
    `SELECT 
      COALESCE(SUM(CASE WHEN adjustment_type IN ('ADDITIONAL_CHARGES', 'APPROVED_CLAIMS') THEN amount ELSE 0 END), 0) AS add_charges,
      COALESCE(SUM(CASE WHEN adjustment_type IN ('PENALTIES', 'DEDUCTIONS', 'CREDIT_ADJUSTMENTS') THEN amount ELSE 0 END), 0) AS deductions
     FROM pm_final_account_adjustments
     WHERE final_account_id = ? AND reviewed_status = 'APPROVED'`,
    [finalAccountId]
  );

  const addCharges = Number(approvedAdj?.add_charges || 0);
  const dedVal = Number(approvedAdj?.deductions || 0);
  const revisedVal = Number(fa.revised_contract_value);
  const finalVal = revisedVal + addCharges - dedVal;
  const paidVal = Number(fa.total_paid);
  const outRec = Math.max(0, finalVal - paidVal);

  await query(
    `UPDATE pm_final_accounts SET
      additional_approved_charges = ?,
      approved_deductions = ?,
      final_account_value = ?,
      outstanding_receivable = ?
     WHERE id = ?`,
    [addCharges, dedVal, finalVal, outRec, finalAccountId]
  );
}
