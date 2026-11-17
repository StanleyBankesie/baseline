/**
 * @file paymentClaim.controller.js
 * @description General-purpose Project Payment Claims controller for OmniSuite ERP.
 * Industry-independent solution supporting IT, consulting, construction, manufacturing,
 * facilities, and service projects.
 * 
 * IMPORTANT: No approval workflows, routing, or approval stages are implemented.
 * Submitting a claim records it as submitted to the client.
 */

import { query } from "../db/pool.js";
import { ensurePMInvoiceTables } from "../utils/dbUtils.js";

/**
 * Ensure all Payment Claims tables exist
 */
export async function ensurePaymentClaimTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS pm_payment_claims (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      branch_id INT NOT NULL DEFAULT 1,
      project_id INT NOT NULL,
      claim_reference VARCHAR(60) NOT NULL UNIQUE,
      claim_title VARCHAR(255) NOT NULL,
      claim_type VARCHAR(50) NOT NULL DEFAULT 'PROGRESS_CLAIM',
      claim_description TEXT NULL,
      claim_period_from DATE NULL,
      claim_period_to DATE NULL,
      claim_date DATE NOT NULL,
      submission_date DATE NULL,
      payment_due_date DATE NULL,
      currency VARCHAR(10) DEFAULT 'GH₵',
      exchange_rate DECIMAL(12,4) DEFAULT 1.0000,
      original_contract_value DECIMAL(18,2) DEFAULT 0.00,
      approved_variations_value DECIMAL(18,2) DEFAULT 0.00,
      revised_contract_value DECIMAL(18,2) DEFAULT 0.00,
      previous_claims_amount DECIMAL(18,2) DEFAULT 0.00,
      gross_claim_amount DECIMAL(18,2) DEFAULT 0.00,
      retention_percent DECIMAL(6,2) DEFAULT 0.00,
      retention_deduction DECIMAL(18,2) DEFAULT 0.00,
      other_deductions DECIMAL(18,2) DEFAULT 0.00,
      tax_code VARCHAR(50) NULL,
      tax_rate DECIMAL(6,2) DEFAULT 0.00,
      tax_amount DECIMAL(18,2) DEFAULT 0.00,
      net_claim_amount DECIMAL(18,2) DEFAULT 0.00,
      cumulative_claimed_amount DECIMAL(18,2) DEFAULT 0.00,
      remaining_unclaimed_balance DECIMAL(18,2) DEFAULT 0.00,
      status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
      client_assessment_ref VARCHAR(60) NULL,
      client_assessment_date DATE NULL,
      client_assessed_amount DECIMAL(18,2) DEFAULT 0.00,
      client_accepted_amount DECIMAL(18,2) DEFAULT 0.00,
      client_disputed_amount DECIMAL(18,2) DEFAULT 0.00,
      client_rejected_amount DECIMAL(18,2) DEFAULT 0.00,
      client_adjustment_amount DECIMAL(18,2) DEFAULT 0.00,
      client_representative VARCHAR(150) NULL,
      client_assessment_remarks TEXT NULL,
      invoice_id INT NULL,
      invoice_no VARCHAR(60) NULL,
      invoice_date DATE NULL,
      amount_invoiced DECIMAL(18,2) DEFAULT 0.00,
      amount_paid DECIMAL(18,2) DEFAULT 0.00,
      outstanding_amount DECIMAL(18,2) DEFAULT 0.00,
      payment_status VARCHAR(30) DEFAULT 'UNPAID',
      supporting_remarks TEXT NULL,
      attachments JSON NULL,
      created_by INT NULL,
      created_by_name VARCHAR(100) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_claim_company_project (company_id, project_id),
      INDEX idx_claim_status (status),
      INDEX idx_claim_date (claim_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS pm_payment_claim_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      claim_id INT NOT NULL,
      item_reference VARCHAR(60) NULL,
      item_description TEXT NOT NULL,
      billing_method VARCHAR(40) NOT NULL DEFAULT 'QTY_RATE',
      wbs_code VARCHAR(60) NULL,
      task_id INT NULL,
      task_name VARCHAR(255) NULL,
      milestone_name VARCHAR(255) NULL,
      deliverable_service VARCHAR(255) NULL,
      quantity DECIMAL(14,3) DEFAULT 1.000,
      unit_of_measure VARCHAR(30) DEFAULT 'EA',
      unit_rate DECIMAL(18,2) DEFAULT 0.00,
      previous_claimed_qty DECIMAL(14,3) DEFAULT 0.000,
      previous_claimed_amount DECIMAL(18,2) DEFAULT 0.00,
      current_claim_qty DECIMAL(14,3) DEFAULT 1.000,
      current_claim_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      cumulative_claimed_amount DECIMAL(18,2) DEFAULT 0.00,
      client_assessed_amount DECIMAL(18,2) NULL,
      client_accepted_amount DECIMAL(18,2) NULL,
      client_disputed_amount DECIMAL(18,2) DEFAULT 0.00,
      client_rejected_amount DECIMAL(18,2) DEFAULT 0.00,
      client_adjustment_remarks TEXT NULL,
      remarks TEXT NULL,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_item_claim (claim_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS pm_payment_claim_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL,
      claim_id INT NOT NULL,
      previous_status VARCHAR(40) NULL,
      new_status VARCHAR(40) NOT NULL,
      change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      changed_by INT NULL,
      changed_by_name VARCHAR(100) NULL,
      remarks TEXT NULL,
      INDEX idx_history_claim (claim_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

/**
 * Get project financial metrics & structure for creating claims
 * GET /api/projects/payment-claims/metrics/:projectId
 */
export async function getProjectClaimMetrics(req, res, next) {
  try {
    await ensurePaymentClaimTables();
    const companyId = req.user?.company_id || 1;
    const { projectId } = req.params;

    // 1. Project details
    const [project] = await query(
      `SELECT p.*,
              COALESCE(c.customer_name, p.client_name) AS resolved_client_name,
              c.customer_code,
              c.credit_limit
       FROM pm_projects p
       LEFT JOIN sal_customers c ON p.client_id = c.id
       WHERE p.id = ? AND p.company_id = ?`,
      [projectId, companyId]
    );

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // 2. Approved Variations total
    const [varRow] = await query(
      `SELECT COALESCE(SUM(COALESCE(amount_approved, proposed_selling_price, cost_impact, amount, 0)), 0) AS total_variations
       FROM pm_variations
       WHERE project_id = ? AND company_id = ? AND status = 'APPROVED'`,
      [projectId, companyId]
    ).catch(() => [{ total_variations: 0 }]);

    const originalContract = Number(project.contract_sum || project.budget || 0);
    const approvedVariations = Number(varRow?.total_variations || 0);
    const revisedContract = originalContract + approvedVariations;

    // 3. Previous claims on this project (excluding CANCELLED and REJECTED)
    const [claimsSummary] = await query(
      `SELECT COALESCE(SUM(gross_claim_amount), 0) AS total_gross_claimed,
              COALESCE(SUM(net_claim_amount), 0) AS total_net_claimed,
              COALESCE(SUM(amount_invoiced), 0) AS total_invoiced,
              COALESCE(SUM(amount_paid), 0) AS total_paid,
              COALESCE(SUM(outstanding_amount), 0) AS outstanding_balance,
              COUNT(*) AS total_claims_count
       FROM pm_payment_claims
       WHERE project_id = ? AND company_id = ? AND status NOT IN ('CANCELLED', 'REJECTED')`,
      [projectId, companyId]
    ).catch(() => [{
      total_gross_claimed: 0,
      total_net_claimed: 0,
      total_invoiced: 0,
      total_paid: 0,
      outstanding_balance: 0,
      total_claims_count: 0
    }]);

    const previousGrossClaims = Number(claimsSummary?.total_gross_claimed || 0);
    const previousNetClaims = Number(claimsSummary?.total_net_claimed || 0);
    const remainingUnclaimed = Math.max(0, revisedContract - previousGrossClaims);

    // 4. Tasks and WBS for this project
    const tasks = await query(
      `SELECT id, task_name, task_code, wbs_code, status, progress_percent
       FROM pm_tasks
       WHERE project_id = ? AND company_id = ?
       ORDER BY id ASC`,
      [projectId, companyId]
    ).catch(() => []);

    // 5. Milestones for this project
    const milestones = await query(
      `SELECT id, milestone_name, milestone_code, target_date, status, completion_percentage, billing_percentage, amount
       FROM pm_milestones
       WHERE project_id = ? AND company_id = ?
       ORDER BY id ASC`,
      [projectId, companyId]
    ).catch(() => []);

    // 6. Invoices linked to project
    const invoices = await query(
      `SELECT id, invoice_no, invoice_date, total_amount, net_amount, amount_paid, balance, status, payment_status
       FROM prj_invoices
       WHERE project_id = ? AND company_id = ? AND status != 'CANCELLED'
       ORDER BY id DESC`,
      [projectId, companyId]
    ).catch(() => []);

    // 7. Active Tax Codes
    const taxCodes = await query(
      `SELECT id, tax_code, tax_name, rate_percent, is_compound
       FROM fin_tax_codes
       WHERE company_id = ? AND is_active = 1
       ORDER BY tax_code ASC`,
      [companyId]
    ).catch(() => []);

    return res.json({
      project: {
        id: project.id,
        project_code: project.project_code,
        project_name: project.project_name,
        project_type: project.project_type || "General",
        client_id: project.client_id,
        client_name: project.resolved_client_name || project.client_name || "N/A",
        customer_code: project.customer_code,
        manager_id: project.manager_id,
        manager_name: project.manager_name || "N/A",
        contract_ref: project.contract_ref_no || project.contract_ref || "N/A",
        start_date: project.start_date ? String(project.start_date).slice(0, 10) : null,
        planned_end_date: project.end_date ? String(project.end_date).slice(0, 10) : null,
        actual_end_date: project.actual_end_date ? String(project.actual_end_date).slice(0, 10) : null,
        project_status: project.project_status || project.status || "ACTIVE",
        currency: project.contract_currency || project.currency || "GH₵",
        retention_percent: Number(project.retention_percent != null ? project.retention_percent : 5.0),
      },
      contract_financials: {
        original_contract_value: originalContract,
        approved_variations_value: approvedVariations,
        revised_contract_value: revisedContract,
        previous_gross_claims: previousGrossClaims,
        previous_net_claims: previousNetClaims,
        remaining_unclaimed_balance: remainingUnclaimed,
        total_invoiced: Number(claimsSummary?.total_invoiced || 0),
        total_paid: Number(claimsSummary?.total_paid || 0),
        outstanding_balance: Number(claimsSummary?.outstanding_balance || 0),
        total_claims_count: Number(claimsSummary?.total_claims_count || 0),
      },
      tasks,
      milestones,
      invoices,
      taxCodes,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List all Payment Claims with filters and KPI aggregates
 * GET /api/projects/payment-claims
 */
export async function listPaymentClaims(req, res, next) {
  try {
    await ensurePaymentClaimTables();
    const companyId = req.user?.company_id || 1;
    const { projectId, status, claimType, dateFrom, dateTo, search } = req.query;

    let sql = `
      SELECT c.*,
             p.project_code,
             p.project_name,
             p.project_type,
             COALESCE(cust.customer_name, p.client_name) AS client_name,
             p.manager_name,
             (SELECT COUNT(*) FROM pm_payment_claim_items ci WHERE ci.claim_id = c.id) AS items_count
      FROM pm_payment_claims c
      JOIN pm_projects p ON c.project_id = p.id
      LEFT JOIN sal_customers cust ON p.client_id = cust.id
      WHERE c.company_id = ?
    `;
    const params = [companyId];

    if (projectId) {
      sql += ` AND c.project_id = ?`;
      params.push(projectId);
    }
    if (status && status !== "ALL") {
      sql += ` AND c.status = ?`;
      params.push(status);
    }
    if (claimType && claimType !== "ALL") {
      sql += ` AND c.claim_type = ?`;
      params.push(claimType);
    }
    if (dateFrom) {
      sql += ` AND c.claim_date >= ?`;
      params.push(dateFrom);
    }
    if (dateTo) {
      sql += ` AND c.claim_date <= ?`;
      params.push(dateTo);
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ` AND (c.claim_reference LIKE ? OR c.claim_title LIKE ? OR p.project_name LIKE ? OR p.project_code LIKE ? OR cust.customer_name LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    sql += ` ORDER BY c.claim_date DESC, c.id DESC`;

    const claims = await query(sql, params);

    // Calculate High-Level KPIs across filtered set
    let totalClaimsCount = claims.length;
    let totalClaimed = 0;
    let totalAccepted = 0;
    let totalInvoiced = 0;
    let totalPaid = 0;
    let outstandingReceivables = 0;

    for (const cl of claims) {
      if (cl.status !== "CANCELLED" && cl.status !== "REJECTED") {
        totalClaimed += Number(cl.net_claim_amount || 0);
        
        // Accepted amount (if client assessed, use accepted amount; if marked accepted, use net claim)
        if (["ACCEPTED", "PARTIALLY_ACCEPTED", "INVOICED", "PARTIALLY_PAID", "FULLY_PAID"].includes(cl.status)) {
          totalAccepted += Number(cl.client_accepted_amount || cl.net_claim_amount || 0);
        }
        
        totalInvoiced += Number(cl.amount_invoiced || 0);
        totalPaid += Number(cl.amount_paid || 0);
        outstandingReceivables += Number(cl.outstanding_amount || Math.max(0, Number(cl.net_claim_amount || 0) - Number(cl.amount_paid || 0)));
      }
    }

    return res.json({
      claims,
      kpis: {
        total_claims: totalClaimsCount,
        total_amount_claimed: totalClaimed,
        total_amount_accepted: totalAccepted,
        total_amount_invoiced: totalInvoiced,
        total_amount_paid: totalPaid,
        outstanding_receivables: outstandingReceivables,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get next claim reference number
 * GET /api/projects/payment-claims/next-reference
 */
export async function getNextClaimReference(req, res, next) {
  try {
    await ensurePaymentClaimTables();
    const companyId = req.user?.company_id || 1;
    const { projectId } = req.query;

    let prefix = "CLM";
    if (projectId) {
      const [p] = await query(`SELECT project_code FROM pm_projects WHERE id = ? AND company_id = ?`, [projectId, companyId]);
      if (p?.project_code) {
        prefix = `CLM-${p.project_code}`;
      }
    }

    const [maxRow] = await query(
      `SELECT claim_reference FROM pm_payment_claims WHERE company_id = ? AND claim_reference LIKE ? ORDER BY id DESC LIMIT 1`,
      [companyId, `${prefix}-%`]
    );

    let nextSeq = 1;
    if (maxRow?.claim_reference) {
      const parts = maxRow.claim_reference.split("-");
      const last = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(last)) nextSeq = last + 1;
    }

    const claimReference = `${prefix}-${String(nextSeq).padStart(3, "0")}`;
    return res.json({ claim_reference: claimReference });
  } catch (err) {
    next(err);
  }
}

/**
 * Get a single payment claim with full items, history, and linked transactions
 * GET /api/projects/payment-claims/:id
 */
export async function getPaymentClaimById(req, res, next) {
  try {
    await ensurePaymentClaimTables();
    const companyId = req.user?.company_id || 1;
    const { id } = req.params;

    const [claim] = await query(
      `SELECT c.*,
              p.project_code,
              p.project_name,
              p.project_type,
              p.contract_sum AS project_contract_sum,
              COALESCE(cust.customer_name, p.client_name) AS client_name,
              p.manager_name,
              p.contract_ref_no
       FROM pm_payment_claims c
       JOIN pm_projects p ON c.project_id = p.id
       LEFT JOIN sal_customers cust ON p.client_id = cust.id
       WHERE c.id = ? AND c.company_id = ?`,
      [id, companyId]
    );

    if (!claim) {
      return res.status(404).json({ error: "Payment claim not found" });
    }

    // Items
    const items = await query(
      `SELECT * FROM pm_payment_claim_items WHERE claim_id = ? AND company_id = ? ORDER BY sort_order ASC, id ASC`,
      [id, companyId]
    );

    // Audit / Status History
    const history = await query(
      `SELECT * FROM pm_payment_claim_history WHERE claim_id = ? AND company_id = ? ORDER BY change_date DESC, id DESC`,
      [id, companyId]
    );

    // Linked Invoice (if present)
    let linkedInvoice = null;
    if (claim.invoice_id) {
      const [inv] = await query(
        `SELECT id, invoice_no, invoice_date, total_amount, net_amount, amount_paid, balance, status, payment_status
         FROM prj_invoices WHERE id = ? AND company_id = ?`,
        [claim.invoice_id, companyId]
      ).catch(() => []);
      linkedInvoice = inv || null;
    }

    return res.json({
      claim,
      items,
      history,
      linked_invoice: linkedInvoice,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Calculate & validate financial figures for a payment claim
 */
function computeClaimFinancials(data, items = []) {
  let grossClaim = 0;

  for (const item of items) {
    let lineAmount = 0;
    const method = item.billing_method || "QTY_RATE";
    const qty = Number(item.current_claim_qty || 0);
    const rate = Number(item.unit_rate || 0);

    if (method === "QTY_RATE") {
      lineAmount = qty * rate;
    } else if (method === "PERCENT_OF_CONTRACT") {
      const pct = Number(item.percentage_value || qty || 0);
      const base = Number(data.revised_contract_value || data.original_contract_value || 0);
      lineAmount = (pct / 100) * base;
    } else {
      lineAmount = Number(item.current_claim_amount || 0);
      if (!lineAmount && qty && rate) {
        lineAmount = qty * rate;
      }
    }

    item.current_claim_amount = Math.round(lineAmount * 100) / 100;
    item.cumulative_claimed_amount = Math.round((Number(item.previous_claimed_amount || 0) + item.current_claim_amount) * 100) / 100;
    grossClaim += item.current_claim_amount;
  }

  const retentionPercent = Number(data.retention_percent || 0);
  const retentionDeduction = Number(data.retention_deduction != null ? data.retention_deduction : (grossClaim * (retentionPercent / 100)));
  const otherDeductions = Number(data.other_deductions || 0);

  const taxableBase = Math.max(0, grossClaim - retentionDeduction - otherDeductions);
  const taxRate = Number(data.tax_rate || 0);
  const taxAmount = Number(data.tax_amount != null ? data.tax_amount : (taxableBase * (taxRate / 100)));

  const netClaim = Math.round((grossClaim - retentionDeduction - otherDeductions + taxAmount) * 100) / 100;
  const prevClaims = Number(data.previous_claims_amount || 0);
  const cumulativeClaims = Math.round((prevClaims + grossClaim) * 100) / 100;
  const revisedContract = Number(data.revised_contract_value || data.original_contract_value || 0);
  const remainingUnclaimed = Math.max(0, Math.round((revisedContract - cumulativeClaims) * 100) / 100);

  return {
    gross_claim_amount: Math.round(grossClaim * 100) / 100,
    retention_percent: retentionPercent,
    retention_deduction: Math.round(retentionDeduction * 100) / 100,
    other_deductions: Math.round(otherDeductions * 100) / 100,
    tax_rate: taxRate,
    tax_amount: Math.round(taxAmount * 100) / 100,
    net_claim_amount: netClaim,
    cumulative_claimed_amount: cumulativeClaims,
    remaining_unclaimed_balance: remainingUnclaimed,
  };
}

/**
 * Create a new Payment Claim
 * POST /api/projects/payment-claims
 */
export async function createPaymentClaim(req, res, next) {
  try {
    await ensurePaymentClaimTables();
    const companyId = req.user?.company_id || 1;
    const branchId = req.user?.branch_id || 1;
    const userId = req.user?.id || null;
    const userName = req.user?.username || req.user?.name || "System User";

    const {
      project_id,
      claim_reference,
      claim_title,
      claim_type = "PROGRESS_CLAIM",
      claim_description,
      claim_period_from,
      claim_period_to,
      claim_date,
      payment_due_date,
      currency = "GH₵",
      exchange_rate = 1.0,
      original_contract_value = 0,
      approved_variations_value = 0,
      revised_contract_value = 0,
      previous_claims_amount = 0,
      retention_percent = 5,
      other_deductions = 0,
      tax_code,
      tax_rate = 0,
      supporting_remarks,
      attachments = [],
      items = [],
      status = "DRAFT",
    } = req.body;

    if (!project_id) {
      return res.status(400).json({ error: "Project is required" });
    }
    if (!claim_title?.trim()) {
      return res.status(400).json({ error: "Claim title is required" });
    }
    if (!claim_date) {
      return res.status(400).json({ error: "Claim date is required" });
    }

    // Auto-generate reference if not provided
    let finalRef = claim_reference?.trim();
    if (!finalRef) {
      const [p] = await query(`SELECT project_code FROM pm_projects WHERE id = ?`, [project_id]);
      const pCode = p?.project_code || "PRJ";
      const [cnt] = await query(
        `SELECT COUNT(*) AS total FROM pm_payment_claims WHERE company_id = ? AND project_id = ?`,
        [companyId, project_id]
      );
      finalRef = `CLM-${pCode}-${String((cnt?.total || 0) + 1).padStart(3, "0")}`;
    }

    // Check uniqueness
    const [existing] = await query(
      `SELECT id FROM pm_payment_claims WHERE company_id = ? AND claim_reference = ?`,
      [companyId, finalRef]
    );
    if (existing) {
      return res.status(400).json({ error: `Claim reference "${finalRef}" already exists.` });
    }

    // Compute Line items & Financial summary
    const calculated = computeClaimFinancials(
      {
        original_contract_value,
        approved_variations_value,
        revised_contract_value,
        previous_claims_amount,
        retention_percent,
        other_deductions,
        tax_rate,
      },
      items
    );

    const submissionDate = status === "SUBMITTED" ? claim_date : null;

    const result = await query(
      `INSERT INTO pm_payment_claims (
        company_id, branch_id, project_id, claim_reference, claim_title,
        claim_type, claim_description, claim_period_from, claim_period_to,
        claim_date, submission_date, payment_due_date, currency, exchange_rate,
        original_contract_value, approved_variations_value, revised_contract_value,
        previous_claims_amount, gross_claim_amount, retention_percent, retention_deduction,
        other_deductions, tax_code, tax_rate, tax_amount, net_claim_amount,
        cumulative_claimed_amount, remaining_unclaimed_balance, status,
        outstanding_amount, supporting_remarks, attachments, created_by, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        branchId,
        project_id,
        finalRef,
        claim_title,
        claim_type,
        claim_description || null,
        claim_period_from || null,
        claim_period_to || null,
        claim_date,
        submissionDate,
        payment_due_date || null,
        currency,
        exchange_rate,
        original_contract_value,
        approved_variations_value,
        revised_contract_value,
        previous_claims_amount,
        calculated.gross_claim_amount,
        calculated.retention_percent,
        calculated.retention_deduction,
        calculated.other_deductions,
        tax_code || null,
        calculated.tax_rate,
        calculated.tax_amount,
        calculated.net_claim_amount,
        calculated.cumulative_claimed_amount,
        calculated.remaining_unclaimed_balance,
        status,
        calculated.net_claim_amount,
        supporting_remarks || null,
        JSON.stringify(attachments || []),
        userId,
        userName,
      ]
    );

    const claimId = result.insertId;

    // Insert Items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await query(
        `INSERT INTO pm_payment_claim_items (
          company_id, claim_id, item_reference, item_description, billing_method,
          wbs_code, task_id, task_name, milestone_name, deliverable_service,
          quantity, unit_of_measure, unit_rate, previous_claimed_qty, previous_claimed_amount,
          current_claim_qty, current_claim_amount, cumulative_claimed_amount, remarks, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          claimId,
          it.item_reference || `ITM-${i + 1}`,
          it.item_description || "Project Work Item",
          it.billing_method || "QTY_RATE",
          it.wbs_code || null,
          it.task_id || null,
          it.task_name || null,
          it.milestone_name || null,
          it.deliverable_service || null,
          Number(it.quantity || 1),
          it.unit_of_measure || "EA",
          Number(it.unit_rate || 0),
          Number(it.previous_claimed_qty || 0),
          Number(it.previous_claimed_amount || 0),
          Number(it.current_claim_qty || 1),
          Number(it.current_claim_amount || 0),
          Number(it.cumulative_claimed_amount || 0),
          it.remarks || null,
          i,
        ]
      );
    }

    // Insert initial status history
    await query(
      `INSERT INTO pm_payment_claim_history (
        company_id, claim_id, previous_status, new_status, changed_by, changed_by_name, remarks
      ) VALUES (?, ?, NULL, ?, ?, ?, ?)`,
      [
        companyId,
        claimId,
        status,
        userId,
        userName,
        status === "SUBMITTED" ? "Claim prepared and submitted directly to client." : "Claim draft created.",
      ]
    );

    // Automatically create and link an entry in Client Project Invoices (prj_invoices)
    const invoiceSync = await syncClaimToProjectInvoice(claimId, companyId, branchId, userId);

    return res.status(201).json({
      message: "Payment claim created and synced to Client Project Invoices successfully",
      id: claimId,
      claim_reference: finalRef,
      invoice_no: invoiceSync?.invoiceNo || null,
      invoice_id: invoiceSync?.invoiceId || null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update a Payment Claim
 * PUT /api/projects/payment-claims/:id
 */
export async function updatePaymentClaim(req, res, next) {
  try {
    await ensurePaymentClaimTables();
    const companyId = req.user?.company_id || 1;
    const userId = req.user?.id || null;
    const userName = req.user?.username || req.user?.name || "System User";
    const { id } = req.params;

    const [existing] = await query(
      `SELECT * FROM pm_payment_claims WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );
    if (!existing) {
      return res.status(404).json({ error: "Payment claim not found" });
    }

    const {
      claim_title,
      claim_type,
      claim_description,
      claim_period_from,
      claim_period_to,
      claim_date,
      payment_due_date,
      currency,
      exchange_rate,
      original_contract_value,
      approved_variations_value,
      revised_contract_value,
      previous_claims_amount,
      retention_percent,
      retention_deduction,
      other_deductions,
      tax_code,
      tax_rate,
      tax_amount,
      supporting_remarks,
      attachments,
      items = [],
      status,
    } = req.body;

    const calculated = computeClaimFinancials(
      {
        original_contract_value: original_contract_value ?? existing.original_contract_value,
        approved_variations_value: approved_variations_value ?? existing.approved_variations_value,
        revised_contract_value: revised_contract_value ?? existing.revised_contract_value,
        previous_claims_amount: previous_claims_amount ?? existing.previous_claims_amount,
        retention_percent: retention_percent ?? existing.retention_percent,
        retention_deduction,
        other_deductions: other_deductions ?? existing.other_deductions,
        tax_rate: tax_rate ?? existing.tax_rate,
        tax_amount,
      },
      items
    );

    const targetStatus = status || existing.status;
    const submissionDate = targetStatus === "SUBMITTED" && !existing.submission_date ? (claim_date || new Date().toISOString().slice(0, 10)) : existing.submission_date;

    const outstandingAmt = Math.max(0, calculated.net_claim_amount - Number(existing.amount_paid || 0));

    await query(
      `UPDATE pm_payment_claims SET
        claim_title = COALESCE(?, claim_title),
        claim_type = COALESCE(?, claim_type),
        claim_description = ?,
        claim_period_from = ?,
        claim_period_to = ?,
        claim_date = COALESCE(?, claim_date),
        submission_date = ?,
        payment_due_date = ?,
        currency = COALESCE(?, currency),
        exchange_rate = COALESCE(?, exchange_rate),
        original_contract_value = ?,
        approved_variations_value = ?,
        revised_contract_value = ?,
        previous_claims_amount = ?,
        gross_claim_amount = ?,
        retention_percent = ?,
        retention_deduction = ?,
        other_deductions = ?,
        tax_code = ?,
        tax_rate = ?,
        tax_amount = ?,
        net_claim_amount = ?,
        cumulative_claimed_amount = ?,
        remaining_unclaimed_balance = ?,
        status = ?,
        outstanding_amount = ?,
        supporting_remarks = ?,
        attachments = COALESCE(?, attachments),
        updated_at = NOW()
       WHERE id = ? AND company_id = ?`,
      [
        claim_title,
        claim_type,
        claim_description || null,
        claim_period_from || null,
        claim_period_to || null,
        claim_date,
        submissionDate,
        payment_due_date || null,
        currency,
        exchange_rate,
        original_contract_value ?? existing.original_contract_value,
        approved_variations_value ?? existing.approved_variations_value,
        revised_contract_value ?? existing.revised_contract_value,
        previous_claims_amount ?? existing.previous_claims_amount,
        calculated.gross_claim_amount,
        calculated.retention_percent,
        calculated.retention_deduction,
        calculated.other_deductions,
        tax_code || null,
        calculated.tax_rate,
        calculated.tax_amount,
        calculated.net_claim_amount,
        calculated.cumulative_claimed_amount,
        calculated.remaining_unclaimed_balance,
        targetStatus,
        outstandingAmt,
        supporting_remarks || null,
        attachments ? JSON.stringify(attachments) : null,
        id,
        companyId,
      ]
    );

    // Sync line items (Delete & re-insert)
    await query(`DELETE FROM pm_payment_claim_items WHERE claim_id = ? AND company_id = ?`, [id, companyId]);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await query(
        `INSERT INTO pm_payment_claim_items (
          company_id, claim_id, item_reference, item_description, billing_method,
          wbs_code, task_id, task_name, milestone_name, deliverable_service,
          quantity, unit_of_measure, unit_rate, previous_claimed_qty, previous_claimed_amount,
          current_claim_qty, current_claim_amount, cumulative_claimed_amount,
          client_assessed_amount, client_accepted_amount, client_disputed_amount,
          client_rejected_amount, client_adjustment_remarks, remarks, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          id,
          it.item_reference || `ITM-${i + 1}`,
          it.item_description || "Project Work Item",
          it.billing_method || "QTY_RATE",
          it.wbs_code || null,
          it.task_id || null,
          it.task_name || null,
          it.milestone_name || null,
          it.deliverable_service || null,
          Number(it.quantity || 1),
          it.unit_of_measure || "EA",
          Number(it.unit_rate || 0),
          Number(it.previous_claimed_qty || 0),
          Number(it.previous_claimed_amount || 0),
          Number(it.current_claim_qty || 1),
          Number(it.current_claim_amount || 0),
          Number(it.cumulative_claimed_amount || 0),
          it.client_assessed_amount != null ? Number(it.client_assessed_amount) : null,
          it.client_accepted_amount != null ? Number(it.client_accepted_amount) : null,
          Number(it.client_disputed_amount || 0),
          Number(it.client_rejected_amount || 0),
          it.client_adjustment_remarks || null,
          it.remarks || null,
          i,
        ]
      );
    }

    // Status change history if status changed
    if (targetStatus !== existing.status) {
      await query(
        `INSERT INTO pm_payment_claim_history (
          company_id, claim_id, previous_status, new_status, changed_by, changed_by_name, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          id,
          existing.status,
          targetStatus,
          userId,
          userName,
          req.body.status_remarks || `Status transitioned from ${existing.status} to ${targetStatus}.`,
        ]
      );
    }

    // Automatically synchronize changes to Client Project Invoices (prj_invoices)
    const invoiceSync = await syncClaimToProjectInvoice(id, companyId, existing.branch_id, userId);

    return res.json({
      message: "Payment claim updated and synced to Client Project Invoices successfully",
      invoice_no: invoiceSync?.invoiceNo || null,
      invoice_id: invoiceSync?.invoiceId || null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Record status transition for a claim (NO approval routing)
 * POST /api/projects/payment-claims/:id/status
 */
export async function updateClaimStatus(req, res, next) {
  try {
    await ensurePaymentClaimTables();
    const companyId = req.user?.company_id || 1;
    const userId = req.user?.id || null;
    const userName = req.user?.username || req.user?.name || "System User";
    const { id } = req.params;
    const { new_status, remarks, submission_date } = req.body;

    if (!new_status) {
      return res.status(400).json({ error: "New status is required" });
    }

    const [existing] = await query(
      `SELECT * FROM pm_payment_claims WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );
    if (!existing) {
      return res.status(404).json({ error: "Payment claim not found" });
    }

    const subDate = new_status === "SUBMITTED" ? (submission_date || new Date().toISOString().slice(0, 10)) : existing.submission_date;

    await query(
      `UPDATE pm_payment_claims SET status = ?, submission_date = ?, updated_at = NOW() WHERE id = ? AND company_id = ?`,
      [new_status, subDate, id, companyId]
    );

    await query(
      `INSERT INTO pm_payment_claim_history (
        company_id, claim_id, previous_status, new_status, changed_by, changed_by_name, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        id,
        existing.status,
        new_status,
        userId,
        userName,
        remarks || `Status updated to ${new_status}.`,
      ]
    );

    return res.json({ message: `Claim status updated to ${new_status}` });
  } catch (err) {
    next(err);
  }
}

/**
 * Record Client Assessment, adjustments, and disputes
 * POST /api/projects/payment-claims/:id/assessment
 */
export async function recordClientAssessment(req, res, next) {
  try {
    await ensurePaymentClaimTables();
    const companyId = req.user?.company_id || 1;
    const userId = req.user?.id || null;
    const userName = req.user?.username || req.user?.name || "System User";
    const { id } = req.params;

    const {
      client_assessment_ref,
      client_assessment_date,
      client_assessed_amount,
      client_accepted_amount,
      client_disputed_amount = 0,
      client_rejected_amount = 0,
      client_adjustment_amount = 0,
      client_representative,
      client_assessment_remarks,
      item_assessments = [],
    } = req.body;

    const [existing] = await query(
      `SELECT * FROM pm_payment_claims WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );
    if (!existing) {
      return res.status(404).json({ error: "Payment claim not found" });
    }

    // Determine appropriate claim status based on assessment
    const assessed = Number(client_assessed_amount ?? existing.net_claim_amount);
    const accepted = Number(client_accepted_amount ?? assessed);
    const disputed = Number(client_disputed_amount || 0);
    const rejected = Number(client_rejected_amount || 0);

    let nextStatus = existing.status;
    if (rejected >= Number(existing.net_claim_amount)) {
      nextStatus = "REJECTED";
    } else if (disputed > 0 && accepted > 0) {
      nextStatus = "PARTIALLY_ACCEPTED";
    } else if (disputed > 0 && accepted === 0) {
      nextStatus = "DISPUTED";
    } else if (accepted >= Number(existing.net_claim_amount)) {
      nextStatus = "ACCEPTED";
    } else if (accepted > 0) {
      nextStatus = "PARTIALLY_ACCEPTED";
    }

    // Update claim header assessment fields
    await query(
      `UPDATE pm_payment_claims SET
        client_assessment_ref = ?,
        client_assessment_date = ?,
        client_assessed_amount = ?,
        client_accepted_amount = ?,
        client_disputed_amount = ?,
        client_rejected_amount = ?,
        client_adjustment_amount = ?,
        client_representative = ?,
        client_assessment_remarks = ?,
        status = ?,
        outstanding_amount = ?,
        updated_at = NOW()
       WHERE id = ? AND company_id = ?`,
      [
        client_assessment_ref || null,
        client_assessment_date || new Date().toISOString().slice(0, 10),
        assessed,
        accepted,
        disputed,
        rejected,
        client_adjustment_amount,
        client_representative || null,
        client_assessment_remarks || null,
        nextStatus,
        Math.max(0, accepted - Number(existing.amount_paid || 0)),
        id,
        companyId,
      ]
    );

    // Update item-level assessments if provided
    if (Array.isArray(item_assessments) && item_assessments.length > 0) {
      for (const it of item_assessments) {
        if (it.id) {
          await query(
            `UPDATE pm_payment_claim_items SET
              client_assessed_amount = ?,
              client_accepted_amount = ?,
              client_disputed_amount = ?,
              client_rejected_amount = ?,
              client_adjustment_remarks = ?
             WHERE id = ? AND claim_id = ? AND company_id = ?`,
            [
              it.client_assessed_amount != null ? Number(it.client_assessed_amount) : null,
              it.client_accepted_amount != null ? Number(it.client_accepted_amount) : null,
              Number(it.client_disputed_amount || 0),
              Number(it.client_rejected_amount || 0),
              it.client_adjustment_remarks || null,
              it.id,
              id,
              companyId,
            ]
          );
        }
      }
    }

    // Record audit event
    await query(
      `INSERT INTO pm_payment_claim_history (
        company_id, claim_id, previous_status, new_status, changed_by, changed_by_name, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        id,
        existing.status,
        nextStatus,
        userId,
        userName,
        `Client assessment recorded: Accepted ${accepted.toFixed(2)}, Disputed ${disputed.toFixed(2)}, Rejected ${rejected.toFixed(2)}. Status set to ${nextStatus}. Ref: ${client_assessment_ref || "N/A"}.`,
      ]
    );

    return res.json({
      message: "Client assessment recorded successfully",
      status: nextStatus,
      client_accepted_amount: accepted,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Automatically create and synchronize an entry into prj_invoices (Client Project Invoices)
 * whenever a Project Payment Claim is created or saved.
 */
export async function syncClaimToProjectInvoice(claimId, companyId, branchId, userId) {
  try {
    await ensurePMInvoiceTables();

    const [claim] = await query(
      `SELECT c.*, p.project_name, p.client_id, COALESCE(cust.customer_name, p.client_name) AS resolved_client_name,
              cust.address AS customer_address, cust.city AS customer_city, cust.state AS customer_state, cust.country AS customer_country
       FROM pm_payment_claims c
       JOIN pm_projects p ON c.project_id = p.id
       LEFT JOIN sal_customers cust ON p.client_id = cust.id
       WHERE c.id = ? AND c.company_id = ?`,
      [claimId, companyId]
    );

    if (!claim) return null;

    const invoiceDate = claim.claim_date ? String(claim.claim_date).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const dueDate = claim.payment_due_date ? String(claim.payment_due_date).slice(0, 10) : null;
    const grossAmount = Number(claim.gross_claim_amount || 0);
    const netAmount = Number(claim.client_accepted_amount || claim.net_claim_amount || 0);
    const taxAmount = Number(claim.tax_amount || 0);

    let invoiceId = claim.invoice_id;
    let invoiceNo = claim.invoice_no;

    if (invoiceId) {
      const [existingInv] = await query(
        `SELECT id, invoice_no, amount_paid FROM prj_invoices WHERE id = ? AND company_id = ?`,
        [invoiceId, companyId]
      );
      if (existingInv) {
        invoiceNo = existingInv.invoice_no;
        const amountPaid = Number(existingInv.amount_paid || 0);
        const balance = Math.max(0, netAmount - amountPaid);
        const paymentStatus = amountPaid >= netAmount && netAmount > 0 ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID";

        await query(
          `UPDATE prj_invoices SET
            invoice_date = ?,
            due_date = ?,
            project_id = ?,
            project_name = ?,
            customer_id = ?,
            customer_name = ?,
            total_amount = ?,
            net_amount = ?,
            tax_amount = ?,
            balance = ?,
            payment_status = ?,
            remarks = ?,
            updated_at = NOW()
           WHERE id = ? AND company_id = ?`,
          [
            invoiceDate,
            dueDate,
            claim.project_id,
            claim.project_name,
            claim.client_id || null,
            claim.resolved_client_name || "Client",
            grossAmount,
            netAmount,
            taxAmount,
            balance,
            paymentStatus,
            `Auto-synced from Payment Claim ${claim.claim_reference}: ${claim.claim_title}`,
            invoiceId,
            companyId,
          ]
        );
      } else {
        invoiceId = null;
      }
    }

    if (!invoiceId) {
      const [maxInv] = await query(
        `SELECT MAX(CAST(REPLACE(invoice_no, 'PINV-', '') AS UNSIGNED)) as max_no
         FROM prj_invoices WHERE company_id = ?`,
        [companyId]
      );
      const nextNo = (maxInv?.max_no || 0) + 1;
      invoiceNo = `PINV-${String(nextNo).padStart(6, "0")}`;

      const invResult = await query(
        `INSERT INTO prj_invoices (
          company_id, branch_id, invoice_no, invoice_date, due_date,
          project_id, project_name, customer_id, customer_name,
          customer_address, customer_city, customer_state, customer_country,
          total_amount, net_amount, tax_amount, amount_paid, balance,
          status, payment_status, currency_id, exchange_rate, remarks, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          branchId,
          invoiceNo,
          invoiceDate,
          dueDate,
          claim.project_id,
          claim.project_name,
          claim.client_id || null,
          claim.resolved_client_name || "Client",
          claim.customer_address || null,
          claim.customer_city || null,
          claim.customer_state || null,
          claim.customer_country || null,
          grossAmount,
          netAmount,
          taxAmount,
          0.00,
          netAmount,
          "POSTED",
          "UNPAID",
          4,
          claim.exchange_rate || 1.0,
          `Auto-created from Payment Claim ${claim.claim_reference}: ${claim.claim_title}`,
          userId,
        ]
      );
      invoiceId = invResult.insertId;
    }

    // Populate line items in prj_invoice_details
    await query(`DELETE FROM prj_invoice_details WHERE invoice_id = ?`, [invoiceId]);

    const claimItems = await query(
      `SELECT * FROM pm_payment_claim_items WHERE claim_id = ? AND company_id = ? ORDER BY sort_order ASC, id ASC`,
      [claimId, companyId]
    );

    for (const itm of claimItems) {
      await query(
        `INSERT INTO prj_invoice_details (
          invoice_id, item_id, item_name, qty, unit_price, discount_percent, total_amount, net_amount, tax_amount, uom
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          itm.id,
          itm.item_description || itm.deliverable_service || "Project Claim Item",
          Number(itm.current_claim_qty || 1),
          Number(itm.unit_rate || 0),
          0,
          Number(itm.current_claim_amount || 0),
          Number(itm.client_accepted_amount != null ? itm.client_accepted_amount : itm.current_claim_amount || 0),
          0,
          itm.unit_of_measure || "EA",
        ]
      );
    }

    // Update claim with linked invoice info
    await query(
      `UPDATE pm_payment_claims SET
        invoice_id = ?,
        invoice_no = ?,
        invoice_date = ?,
        amount_invoiced = ?,
        outstanding_amount = ?,
        payment_status = 'UNPAID',
        status = CASE WHEN status = 'DRAFT' THEN 'INVOICED' ELSE status END,
        updated_at = NOW()
       WHERE id = ? AND company_id = ?`,
      [
        invoiceId,
        invoiceNo,
        invoiceDate,
        netAmount,
        netAmount,
        claimId,
        companyId,
      ]
    );

    return { invoiceId, invoiceNo, netAmount };
  } catch (err) {
    console.error("Error auto-syncing claim to project invoice:", err);
    return null;
  }
}

/**
 * Generate a new Project Invoice or Link an existing Invoice to a Payment Claim
 * POST /api/projects/payment-claims/:id/link-invoice
 */
export async function generateOrLinkInvoice(req, res, next) {
  try {
    await ensurePaymentClaimTables();
    const companyId = req.user?.company_id || 1;
    const branchId = req.user?.branch_id || 1;
    const userId = req.user?.id || null;
    const userName = req.user?.username || req.user?.name || "System User";
    const { id } = req.params;
    const { mode = "GENERATE", existing_invoice_id, invoice_notes } = req.body;

    const [claim] = await query(
      `SELECT c.*, p.project_name, p.client_id, COALESCE(cust.customer_name, p.client_name) AS resolved_client_name
       FROM pm_payment_claims c
       JOIN pm_projects p ON c.project_id = p.id
       LEFT JOIN sal_customers cust ON p.client_id = cust.id
       WHERE c.id = ? AND c.company_id = ?`,
      [id, companyId]
    );

    if (!claim) {
      return res.status(404).json({ error: "Payment claim not found" });
    }

    let invoiceId = null;
    let invoiceNo = "";
    let invoiceDate = new Date().toISOString().slice(0, 10);
    let amountInvoiced = Number(claim.client_accepted_amount || claim.net_claim_amount);
    let amountPaid = 0;
    let balance = amountInvoiced;
    let paymentStatus = "UNPAID";

    if (mode === "LINK") {
      if (!existing_invoice_id) {
        return res.status(400).json({ error: "Existing invoice ID is required for LINK mode" });
      }
      const [inv] = await query(
        `SELECT * FROM prj_invoices WHERE id = ? AND company_id = ?`,
        [existing_invoice_id, companyId]
      );
      if (!inv) {
        return res.status(404).json({ error: "Project invoice not found" });
      }

      invoiceId = inv.id;
      invoiceNo = inv.invoice_no;
      invoiceDate = inv.invoice_date ? String(inv.invoice_date).slice(0, 10) : invoiceDate;
      amountInvoiced = Number(inv.net_amount || inv.total_amount || 0);
      amountPaid = Number(inv.amount_paid || 0);
      balance = Number(inv.balance != null ? inv.balance : amountInvoiced - amountPaid);
      paymentStatus = inv.payment_status || (amountPaid >= amountInvoiced ? "PAID" : amountPaid > 0 ? "PARTIAL" : "UNPAID");
    } else {
      // GENERATE mode: Create new invoice in prj_invoices
      const [maxInv] = await query(
        `SELECT MAX(CAST(REPLACE(invoice_no, 'PINV-', '') AS UNSIGNED)) as max_no
         FROM prj_invoices WHERE company_id = ?`,
        [companyId]
      );
      const nextNo = (maxInv?.max_no || 0) + 1;
      invoiceNo = `PINV-${String(nextNo).padStart(3, "0")}`;

      const invResult = await query(
        `INSERT INTO prj_invoices (
          company_id, branch_id, invoice_no, invoice_date, due_date,
          project_id, project_name, customer_id, customer_name,
          total_amount, net_amount, tax_amount, amount_paid, balance,
          status, payment_status, remarks, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          branchId,
          invoiceNo,
          claim.claim_date || invoiceDate,
          claim.payment_due_date || null,
          claim.project_id,
          claim.project_name,
          claim.client_id || null,
          claim.resolved_client_name || "Client",
          claim.gross_claim_amount,
          amountInvoiced,
          claim.tax_amount,
          0.00,
          amountInvoiced,
          "ISSUED",
          "UNPAID",
          invoice_notes || `Generated from Payment Claim ${claim.claim_reference}: ${claim.claim_title}`,
          userId,
        ]
      );

      invoiceId = invResult.insertId;

      // Populate prj_invoice_details from claim items
      const claimItems = await query(
        `SELECT * FROM pm_payment_claim_items WHERE claim_id = ? AND company_id = ?`,
        [id, companyId]
      );

      for (const itm of claimItems) {
        await query(
          `INSERT INTO prj_invoice_details (
            invoice_id, item_id, qty, unit_price, total_amount, net_amount, uom
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId,
            itm.id,
            itm.current_claim_qty || 1,
            itm.unit_rate || 0,
            itm.current_claim_amount || 0,
            itm.client_accepted_amount != null ? itm.client_accepted_amount : itm.current_claim_amount,
            itm.unit_of_measure || "EA",
          ]
        );
      }
    }

    // Determine next claim status
    let nextStatus = "INVOICED";
    if (amountPaid >= amountInvoiced && amountInvoiced > 0) {
      nextStatus = "FULLY_PAID";
    } else if (amountPaid > 0) {
      nextStatus = "PARTIALLY_PAID";
    }

    // Update claim
    await query(
      `UPDATE pm_payment_claims SET
        invoice_id = ?,
        invoice_no = ?,
        invoice_date = ?,
        amount_invoiced = ?,
        amount_paid = ?,
        outstanding_amount = ?,
        payment_status = ?,
        status = ?,
        updated_at = NOW()
       WHERE id = ? AND company_id = ?`,
      [
        invoiceId,
        invoiceNo,
        invoiceDate,
        amountInvoiced,
        amountPaid,
        balance,
        paymentStatus,
        nextStatus,
        id,
        companyId,
      ]
    );

    // Record audit history
    await query(
      `INSERT INTO pm_payment_claim_history (
        company_id, claim_id, previous_status, new_status, changed_by, changed_by_name, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        id,
        claim.status,
        nextStatus,
        userId,
        userName,
        mode === "GENERATE"
          ? `Generated project invoice ${invoiceNo} for ${amountInvoiced.toFixed(2)}. Claim status updated to ${nextStatus}.`
          : `Linked existing invoice ${invoiceNo}. Claim status updated to ${nextStatus}.`,
      ]
    );

    return res.json({
      message: mode === "GENERATE" ? "Invoice generated successfully" : "Invoice linked successfully",
      invoice_id: invoiceId,
      invoice_no: invoiceNo,
      status: nextStatus,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a draft Payment Claim
 * DELETE /api/projects/payment-claims/:id
 */
export async function deletePaymentClaim(req, res, next) {
  try {
    await ensurePaymentClaimTables();
    const companyId = req.user?.company_id || 1;
    const { id } = req.params;

    const [claim] = await query(
      `SELECT * FROM pm_payment_claims WHERE id = ? AND company_id = ?`,
      [id, companyId]
    );
    if (!claim) {
      return res.status(404).json({ error: "Payment claim not found" });
    }

    if (claim.status === "INVOICED" || claim.status === "PARTIALLY_PAID" || claim.status === "FULLY_PAID") {
      return res.status(400).json({
        error: "Cannot delete a claim that has been invoiced or paid. Please cancel the claim instead.",
      });
    }

    await query(`DELETE FROM pm_payment_claim_items WHERE claim_id = ? AND company_id = ?`, [id, companyId]);
    await query(`DELETE FROM pm_payment_claim_history WHERE claim_id = ? AND company_id = ?`, [id, companyId]);
    await query(`DELETE FROM pm_payment_claims WHERE id = ? AND company_id = ?`, [id, companyId]);

    return res.json({ message: "Payment claim deleted successfully" });
  } catch (err) {
    next(err);
  }
}
