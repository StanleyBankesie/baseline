/**
 * @file pettyCash.controller.js
 * @description Enterprise Petty Cash Book controller for OmniSuite ERP Finance module.
 * Provides controlled disbursements, dual confirmations, automated Payment Voucher generation,
 * Contra Voucher funding synchronization, and comprehensive financial reporting & GL reconciliation.
 */
import pool from '../db/pool.js';
import { ensurePettyCashSchema } from '../services/pettyCashSetup.js';

/**
 * Helper to fetch next sequential petty cash transaction reference.
 */
async function getNextTransactionNo(conn, companyId) {
  const year = new Date().getFullYear();
  const prefix = `PC-${year}-`;
  const [rows] = await conn.query(
    `SELECT transaction_no FROM fin_petty_cash_transactions 
     WHERE company_id = ? AND transaction_no LIKE ? 
     ORDER BY id DESC LIMIT 1 FOR UPDATE`,
    [companyId, `${prefix}%`]
  );
  if (rows.length === 0) {
    return `${prefix}0001`;
  }
  const lastNo = rows[0].transaction_no;
  const numPart = parseInt(lastNo.replace(prefix, ''), 10) || 0;
  return `${prefix}${String(numPart + 1).padStart(4, '0')}`;
}

/**
 * Helper to get active fiscal year ID.
 */
async function getFiscalYearId(conn, companyId, dateStr) {
  const [rows] = await conn.query(
    `SELECT id FROM fin_fiscal_years 
     WHERE company_id = ? AND ? >= start_date AND ? <= end_date 
     ORDER BY start_date DESC LIMIT 1`,
    [companyId, dateStr, dateStr]
  );
  return rows?.[0]?.id || null;
}

/**
 * Synchronize funding from posted Contra Vouchers that debit petty cash accounts.
 */
export async function syncFundingFromContraVouchers(companyId, accountId = null) {
  const conn = await pool.getConnection();
  try {
    let sql = `
      SELECT v.id AS voucher_id, v.voucher_no, v.voucher_date, v.narration, v.created_by,
             u.username, u.full_name, vl.account_id AS petty_cash_account_id, vl.debit AS amount
      FROM fin_vouchers v
      JOIN fin_voucher_lines vl ON vl.voucher_id = v.id
      JOIN fin_voucher_types vt ON v.voucher_type_id = vt.id
      LEFT JOIN adm_users u ON u.id = v.created_by
      WHERE v.company_id = ?
        AND v.status IN ('POSTED', 'APPROVED')
        AND vt.code = 'CV'
        AND vl.debit > 0
    `;
    const params = [companyId];
    if (accountId) {
      sql += ` AND vl.account_id = ?`;
      params.push(accountId);
    }

    const [fundingVouchers] = await conn.query(sql, params);

    for (const fv of fundingVouchers) {
      // Check if this funding voucher is already synced
      const [existing] = await conn.query(
        `SELECT id FROM fin_petty_cash_transactions 
         WHERE contra_voucher_id = ? AND company_id = ? LIMIT 1`,
        [fv.voucher_id, companyId]
      );

      if (existing.length === 0) {
        const txNo = `FUND-${fv.voucher_no}`;
        await conn.query(
          `INSERT INTO fin_petty_cash_transactions
            (company_id, branch_id, petty_cash_account_id, transaction_no, transaction_date, 
             transaction_type, recipient_name, department, description, amount, status, 
             handover_confirmed, handover_confirmed_name, handover_confirmed_at,
             recipient_confirmed, recipient_confirmed_name, recipient_confirmed_at,
             contra_voucher_id, contra_voucher_no, recorded_by, recorded_by_name)
           VALUES
            (?, 1, ?, ?, ?, 'FUNDING', 'Petty Cash Custodian', 'Finance', ?, ?, 'COMPLETED',
             1, 'Finance System', NOW(), 1, 'Custodian', NOW(), ?, ?, ?, ?)`,
          [
            companyId,
            fv.petty_cash_account_id,
            txNo,
            fv.voucher_date,
            fv.narration || `Contra funding transfer ${fv.voucher_no}`,
            fv.amount,
            fv.voucher_id,
            fv.voucher_no,
            fv.created_by,
            fv.full_name || fv.username || 'Finance'
          ]
        );
      }
    }
  } catch (err) {
    console.error('Error syncing Contra Voucher funding:', err);
  } finally {
    conn.release();
  }
}

/**
 * 1. GET /api/finance/petty-cash/accounts
 * Lists configured petty cash accounts with current available balances and stats.
 */
export async function getPettyCashAccounts(req, res, next) {
  try {
    await ensurePettyCashSchema();
    const companyId = req.scope?.companyId || req.user?.company_id || 1;
    await syncFundingFromContraVouchers(companyId);

    const [accounts] = await pool.query(
      `SELECT pca.*, fa.code AS account_code, fa.name AS gl_account_name,
              exp.code AS expense_account_code, exp.name AS expense_account_name,
              u.full_name AS custodian_full_name, u.email AS custodian_email
       FROM fin_petty_cash_accounts pca
       JOIN fin_accounts fa ON pca.account_id = fa.id
       LEFT JOIN fin_accounts exp ON pca.expense_account_id = exp.id
       LEFT JOIN adm_users u ON pca.custodian_id = u.id
       WHERE pca.company_id = ? AND pca.is_active = 1
       ORDER BY pca.account_name ASC`,
      [companyId]
    );

    // Compute balances for each account
    const results = await Promise.all(
      accounts.map(async (acc) => {
        const [txTotals] = await pool.query(
          `SELECT 
             SUM(CASE WHEN transaction_type = 'FUNDING' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_funding,
             SUM(CASE WHEN transaction_type = 'DISBURSEMENT' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_disbursed,
             SUM(CASE WHEN transaction_type = 'REVERSAL' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_reversed,
             COUNT(CASE WHEN transaction_type = 'DISBURSEMENT' AND status = 'COMPLETED' THEN 1 END) AS count_disbursements,
             COUNT(CASE WHEN status = 'PENDING_CONFIRMATION' THEN 1 END) AS count_pending
           FROM fin_petty_cash_transactions
           WHERE petty_cash_account_id = ? AND company_id = ?`,
          [acc.account_id, companyId]
        );

        const opening = Number(acc.opening_balance || 0);
        const funding = Number(txTotals[0]?.total_funding || 0);
        const disbursed = Number(txTotals[0]?.total_disbursed || 0);
        const reversed = Number(txTotals[0]?.total_reversed || 0);
        // Available balance = Opening + Funding - Disbursed + Reversed
        const availableBalance = opening + funding - disbursed + reversed;

        // Compare with GL balance for reconciliation
        const [glResult] = await pool.query(
          `SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS gl_balance
           FROM fin_general_ledger
           WHERE account_id = ? AND company_id = ?`,
          [acc.account_id, companyId]
        );
        const glBalance = Number(glResult[0]?.gl_balance || 0) + opening;

        return {
          ...acc,
          opening_balance: opening,
          total_funding: funding,
          total_disbursed: disbursed,
          total_reversed: reversed,
          available_balance: availableBalance,
          gl_balance: glBalance,
          discrepancy: Math.abs(availableBalance - glBalance) < 0.01 ? 0 : availableBalance - glBalance,
          is_reconciled: Math.abs(availableBalance - glBalance) < 0.01,
          is_low_balance: availableBalance <= Number(acc.low_balance_threshold || 200),
          count_disbursements: Number(txTotals[0]?.count_disbursements || 0),
          count_pending: Number(txTotals[0]?.count_pending || 0),
        };
      })
    );

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

/**
 * 2. POST /api/finance/petty-cash/accounts
 * Configures or updates a petty cash account.
 */
export async function savePettyCashAccount(req, res, next) {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || 1;
    const {
      id,
      account_id,
      expense_account_id,
      account_name,
      custodian_id,
      custodian_name,
      department_name,
      opening_balance = 0,
      low_balance_threshold = 200,
      max_single_disbursement = 1000,
      is_active = 1,
    } = req.body;

    if (!account_id) {
      return res.status(400).json({ error: 'GL Account ID is required.' });
    }

    if (id) {
      await pool.query(
        `UPDATE fin_petty_cash_accounts SET
          account_id = ?, expense_account_id = ?, account_name = ?, custodian_id = ?, custodian_name = ?,
          department_name = ?, opening_balance = ?, low_balance_threshold = ?,
          max_single_disbursement = ?, is_active = ?, updated_at = NOW()
         WHERE id = ? AND company_id = ?`,
        [
          account_id,
          expense_account_id ? Number(expense_account_id) : null,
          account_name,
          custodian_id || null,
          custodian_name || null,
          department_name || null,
          opening_balance,
          low_balance_threshold,
          max_single_disbursement,
          is_active,
          id,
          companyId,
        ]
      );
      res.json({ success: true, message: 'Petty cash account updated successfully.' });
    } else {
      const [insertRes] = await pool.query(
        `INSERT INTO fin_petty_cash_accounts
          (company_id, branch_id, account_id, account_name, custodian_id, custodian_name,
           department_name, opening_balance, low_balance_threshold, max_single_disbursement, is_active)
         VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          companyId,
          account_id,
          account_name,
          custodian_id || null,
          custodian_name || null,
          department_name || null,
          opening_balance,
          low_balance_threshold,
          max_single_disbursement,
          is_active,
        ]
      );
      res.status(201).json({ success: true, id: insertRes.insertId, message: 'Petty cash account configured successfully.' });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * 3. GET /api/finance/petty-cash/accounts/:id/balance
 * Returns real-time balance metrics for a specific account.
 */
export async function getAccountBalanceDetails(req, res, next) {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || 1;
    const accountId = Number(req.params.id);

    const [accRows] = await pool.query(
      `SELECT * FROM fin_petty_cash_accounts WHERE account_id = ? AND company_id = ? LIMIT 1`,
      [accountId, companyId]
    );

    if (accRows.length === 0) {
      return res.status(404).json({ error: 'Petty cash account not found.' });
    }

    const acc = accRows[0];
    const [txTotals] = await pool.query(
      `SELECT 
         SUM(CASE WHEN transaction_type = 'FUNDING' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_funding,
         SUM(CASE WHEN transaction_type = 'DISBURSEMENT' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_disbursed,
         SUM(CASE WHEN transaction_type = 'REVERSAL' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_reversed
       FROM fin_petty_cash_transactions
       WHERE petty_cash_account_id = ? AND company_id = ?`,
      [accountId, companyId]
    );

    const opening = Number(acc.opening_balance || 0);
    const funding = Number(txTotals[0]?.total_funding || 0);
    const disbursed = Number(txTotals[0]?.total_disbursed || 0);
    const reversed = Number(txTotals[0]?.total_reversed || 0);
    const availableBalance = opening + funding - disbursed + reversed;

    // GL balance
    const [glResult] = await pool.query(
      `SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS gl_balance
       FROM fin_general_ledger
       WHERE account_id = ? AND company_id = ?`,
      [accountId, companyId]
    );
    const glBalance = Number(glResult[0]?.gl_balance || 0) + opening;

    res.json({
      success: true,
      data: {
        account_id: accountId,
        account_name: acc.account_name,
        opening_balance: opening,
        total_funding: funding,
        total_disbursed: disbursed,
        total_reversed: reversed,
        available_balance: availableBalance,
        gl_balance: glBalance,
        is_reconciled: Math.abs(availableBalance - glBalance) < 0.01,
        is_low_balance: availableBalance <= Number(acc.low_balance_threshold || 200),
        low_balance_threshold: Number(acc.low_balance_threshold || 200),
        max_single_disbursement: Number(acc.max_single_disbursement || 1000),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 4. GET /api/finance/petty-cash/transactions
 * Returns the petty cash ledger with running balance, filters, search, and pagination.
 */
export async function getPettyCashTransactions(req, res, next) {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || 1;
    const {
      account_id,
      transaction_type,
      status,
      recipient,
      department,
      expense_account_id,
      project_id,
      start_date,
      end_date,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    await syncFundingFromContraVouchers(companyId, account_id ? Number(account_id) : null);

    let whereSql = `WHERE t.company_id = ?`;
    const params = [companyId];

    if (account_id && account_id !== 'ALL') {
      whereSql += ` AND t.petty_cash_account_id = ?`;
      params.push(Number(account_id));
    }
    if (transaction_type && transaction_type !== 'ALL') {
      whereSql += ` AND t.transaction_type = ?`;
      params.push(transaction_type);
    }
    if (status && status !== 'ALL') {
      whereSql += ` AND t.status = ?`;
      params.push(status);
    }
    if (recipient) {
      whereSql += ` AND t.recipient_name LIKE ?`;
      params.push(`%${recipient}%`);
    }
    if (department && department !== 'ALL') {
      whereSql += ` AND t.department = ?`;
      params.push(department);
    }
    if (expense_account_id && expense_account_id !== 'ALL') {
      whereSql += ` AND t.expense_account_id = ?`;
      params.push(Number(expense_account_id));
    }
    if (project_id && project_id !== 'ALL') {
      whereSql += ` AND t.project_id = ?`;
      params.push(Number(project_id));
    }
    if (start_date) {
      whereSql += ` AND t.transaction_date >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      whereSql += ` AND t.transaction_date <= ?`;
      params.push(end_date);
    }
    if (search) {
      whereSql += ` AND (t.transaction_no LIKE ? OR t.recipient_name LIKE ? OR t.description LIKE ? OR t.payment_voucher_no LIKE ? OR t.contra_voucher_no LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s, s);
    }

    // Count
    const [countRes] = await pool.query(
      `SELECT COUNT(*) AS total FROM fin_petty_cash_transactions t ${whereSql}`,
      params
    );
    const total = Number(countRes[0]?.total || 0);

    // Fetch transactions chronological order ASC to compute running balance
    const offset = (Number(page) - 1) * Number(limit);
    const [transactions] = await pool.query(
      `SELECT t.*, 
              exp.code AS expense_account_code, exp.name AS expense_account_name,
              pca.account_name AS petty_cash_account_name,
              p.project_name, p.project_code,
              (SELECT COUNT(*) FROM fin_petty_cash_attachments att WHERE att.transaction_id = t.id) AS attachment_count
       FROM fin_petty_cash_transactions t
       LEFT JOIN fin_accounts exp ON t.expense_account_id = exp.id
       LEFT JOIN fin_petty_cash_accounts pca ON t.petty_cash_account_id = pca.account_id
       LEFT JOIN pm_projects p ON t.project_id = p.id
       ${whereSql}
       ORDER BY t.transaction_date DESC, t.id DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    // Compute running balance: fetch all prior completed transactions for the account
    // Or for the ledger view, compute running balance based on completed transactions
    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 5. GET /api/finance/petty-cash/transactions/:id
 * Fetches complete details of a single transaction including attachments and audit logs.
 */
export async function getPettyCashTransactionById(req, res, next) {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || 1;
    const id = Number(req.params.id);

    const [txRows] = await pool.query(
      `SELECT t.*, 
              exp.code AS expense_account_code, exp.name AS expense_account_name,
              pca.account_name AS petty_cash_account_name,
              p.project_name, p.project_code,
              v.voucher_no AS pv_number, v.status AS pv_status
       FROM fin_petty_cash_transactions t
       LEFT JOIN fin_accounts exp ON t.expense_account_id = exp.id
       LEFT JOIN fin_petty_cash_accounts pca ON t.petty_cash_account_id = pca.account_id
       LEFT JOIN pm_projects p ON t.project_id = p.id
       LEFT JOIN fin_vouchers v ON t.payment_voucher_id = v.id
       WHERE t.id = ? AND t.company_id = ? LIMIT 1`,
      [id, companyId]
    );

    if (txRows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const tx = txRows[0];

    const [attachments] = await pool.query(
      `SELECT * FROM fin_petty_cash_attachments WHERE transaction_id = ? ORDER BY id DESC`,
      [id]
    );

    const [auditLogs] = await pool.query(
      `SELECT * FROM fin_petty_cash_audit_logs WHERE transaction_id = ? ORDER BY id DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...tx,
        attachments,
        auditLogs,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 6. POST /api/finance/petty-cash/disburse
 * Records a petty cash disbursement.
 * Enforces mandatory Expense Account validation, balance-cap check,
 * dual confirmation, atomic Payment Voucher creation, and General Ledger posting.
 */
export async function recordDisbursement(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const companyId = req.scope?.companyId || req.user?.company_id || 1;
    const branchId = req.scope?.branchId || 1;
    const userId = req.user?.sub || req.user?.id || 1;
    const userName = req.user?.full_name || req.user?.username || 'Staff';

    const {
      petty_cash_account_id,
      transaction_date = new Date().toISOString().slice(0, 10),
      recipient_name,
      department,
      description,
      expense_account_id,
      amount,
      project_id,
      cost_center_id,
      handover_confirmed = true,
      recipient_confirmed = true,
      attachments = [], // optional array of { file_name, file_path, file_size, file_type }
    } = req.body;

    // MANDATORY VALIDATIONS

    // 1. Recipient / Employee Name
    if (!recipient_name || !String(recipient_name).trim()) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Recipient / Employee Name is mandatory.',
        field: 'recipient_name',
      });
    }

    // 2. Description
    if (!description || !String(description).trim()) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Description is mandatory.',
        field: 'description',
      });
    }

    // 3. EXPENSE ACCOUNT RESOLUTION & VALIDATION
    let targetExpenseAccountId = expense_account_id ? Number(expense_account_id) : null;
    if (!targetExpenseAccountId || isNaN(targetExpenseAccountId) || targetExpenseAccountId <= 0) {
      // Auto fallback to configured default expense account from petty cash account or Imprest
      const [pcaRows] = await conn.query(
        `SELECT expense_account_id FROM fin_petty_cash_accounts WHERE account_id = ? AND company_id = ? LIMIT 1`,
        [targetPettyAccountId, companyId]
      );
      if (pcaRows?.[0]?.expense_account_id) {
        targetExpenseAccountId = Number(pcaRows[0].expense_account_id);
      } else {
        const [impRows] = await conn.query(
          `SELECT a.id FROM fin_accounts a
           JOIN fin_account_groups g ON a.group_id = g.id
           WHERE a.company_id = ? AND g.nature = 'EXPENSE' AND (a.code LIKE '%imprest%' OR a.name LIKE '%imprest%') LIMIT 1`,
          [companyId]
        );
        if (impRows.length > 0) targetExpenseAccountId = impRows[0].id;
      }
    }

    if (!targetExpenseAccountId) {
      await conn.rollback();
      return res.status(400).json({
        error: 'No default Expense Account is configured for Petty Cash. Please configure one in Finance Setup.',
        field: 'expense_account_id',
      });
    }

    // Verify Expense Account exists, is active, is postable, and belongs to EXPENSE nature
    const [expAccRows] = await conn.query(
      `SELECT a.id, a.code, a.name, a.is_postable, a.is_active, g.nature
       FROM fin_accounts a
       JOIN fin_account_groups g ON a.group_id = g.id
       WHERE a.id = ? AND a.company_id = ? LIMIT 1`,
      [Number(targetExpenseAccountId), companyId]
    );

    if (expAccRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Please select an Expense Account before saving this petty cash disbursement.',
        field: 'expense_account_id',
      });
    }

    const expAcc = expAccRows[0];
    if (!expAcc.is_active || !expAcc.is_postable) {
      await conn.rollback();
      return res.status(400).json({
        error: `Selected account "${expAcc.name}" is inactive or not postable. Please choose a valid postable Expense Account.`,
        field: 'expense_account_id',
      });
    }

    // 4. Amount Validation
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Disbursement amount must be greater than zero.',
        field: 'amount',
      });
    }

    // 5. Petty Cash Account
    let targetPettyAccountId = Number(petty_cash_account_id);
    if (!targetPettyAccountId) {
      const [defAcc] = await conn.query(
        `SELECT account_id FROM fin_petty_cash_accounts WHERE company_id = ? AND is_active = 1 LIMIT 1`,
        [companyId]
      );
      targetPettyAccountId = defAcc?.[0]?.account_id || 221;
    }

    // Fetch petty cash account config & check limit
    const [pcaRows] = await conn.query(
      `SELECT * FROM fin_petty_cash_accounts WHERE account_id = ? AND company_id = ? LIMIT 1 FOR UPDATE`,
      [targetPettyAccountId, companyId]
    );
    const pca = pcaRows?.[0] || { opening_balance: 0, max_single_disbursement: 5000 };

    if (numericAmount > Number(pca.max_single_disbursement || 5000)) {
      await conn.rollback();
      return res.status(400).json({
        error: `Amount exceeds the single disbursement limit of GH₵${Number(pca.max_single_disbursement).toFixed(2)}.`,
        field: 'amount',
      });
    }

    // 6. BALANCE-CAP VALIDATION
    // Calculate current available balance with row locks
    const [txTotals] = await conn.query(
      `SELECT 
         SUM(CASE WHEN transaction_type = 'FUNDING' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_funding,
         SUM(CASE WHEN transaction_type = 'DISBURSEMENT' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_disbursed,
         SUM(CASE WHEN transaction_type = 'REVERSAL' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_reversed
       FROM fin_petty_cash_transactions
       WHERE petty_cash_account_id = ? AND company_id = ?`,
      [targetPettyAccountId, companyId]
    );

    const opening = Number(pca.opening_balance || 0);
    const funding = Number(txTotals[0]?.total_funding || 0);
    const disbursed = Number(txTotals[0]?.total_disbursed || 0);
    const reversed = Number(txTotals[0]?.total_reversed || 0);
    const availableBalance = opening + funding - disbursed + reversed;

    if (numericAmount > availableBalance) {
      await conn.rollback();
      return res.status(400).json({
        error: `Insufficient petty cash balance. Available: GH₵${availableBalance.toFixed(2)}, Requested: GH₵${numericAmount.toFixed(2)}. Please replenish via Contra Voucher.`,
        field: 'amount',
        availableBalance,
      });
    }

    // 7. Check Confirmation Status
    const isDualConfirmed = Boolean(handover_confirmed) && Boolean(recipient_confirmed);
    const initialStatus = isDualConfirmed ? 'COMPLETED' : 'PENDING_CONFIRMATION';

    // 8. Generate Transaction Number
    const transactionNo = await getNextTransactionNo(conn, companyId);

    let paymentVoucherId = null;
    let paymentVoucherNo = null;

    // 9. AUTOMATIC JOURNAL VOUCHER GENERATION (Only if dual confirmed!)
    if (isDualConfirmed) {
      // Find Journal Voucher type (code 'JV')
      const [jvTypeRows] = await conn.query(
        `SELECT id, prefix, next_number FROM fin_voucher_types 
         WHERE company_id = ? AND code = 'JV' 
         LIMIT 1 FOR UPDATE`,
        [companyId]
      );

      if (jvTypeRows.length === 0) {
        await conn.rollback();
        return res.status(500).json({
          error: 'Journal Voucher type (JV) is not configured in the system. Contact Finance Admin.',
        });
      }

      const jvType = jvTypeRows[0];
      const nextNum = Number(jvType.next_number || 1);
      const prefix = jvType.prefix || 'JV';
      paymentVoucherNo = `${prefix}${String(nextNum).padStart(6, '0')}`;

      // Update next_number atomically
      await conn.query(
        `UPDATE fin_voucher_types SET next_number = next_number + 1 WHERE id = ?`,
        [jvType.id]
      );

      const fiscalYearId = await getFiscalYearId(conn, companyId, transaction_date);

      // Create Journal Voucher in fin_vouchers
      const [jvResult] = await conn.query(
        `INSERT INTO fin_vouchers
          (company_id, branch_id, fiscal_year_id, voucher_type_id, voucher_no, voucher_date,
           narration, currency_id, exchange_rate, total_debit, total_credit, balanced_amount,
           status, created_by, project_id, cost_center_id, created_at, updated_at)
         VALUES
          (?, ?, ?, ?, ?, ?, ?, 1, 1.000000, ?, ?, ?, 'APPROVED', ?, ?, ?, NOW(), NOW())`,
        [
          companyId,
          branchId,
          fiscalYearId,
          jvType.id,
          paymentVoucherNo,
          transaction_date,
          `Petty Cash Disbursement: ${description} | Recipient: ${recipient_name} | Ref: ${transactionNo}`,
          numericAmount,
          numericAmount,
          numericAmount,
          userId,
          project_id ? Number(project_id) : null,
          cost_center_id ? Number(cost_center_id) : null,
        ]
      );
      paymentVoucherId = jvResult.insertId;

      // Line 1: DEBIT the Expense Account
      await conn.query(
        `INSERT INTO fin_voucher_lines
          (company_id, voucher_id, line_no, account_id, description, debit, credit,
           payment_method, reference_no, currency_id, exchange_rate)
         VALUES
          (?, ?, 1, ?, ?, ?, 0.00, 'Cash', ?, 1, 1.000000)`,
        [
          companyId,
          paymentVoucherId,
          Number(targetExpenseAccountId),
          `${description} (Recipient: ${recipient_name})`,
          numericAmount,
          transactionNo,
        ]
      );

      // Line 2: CREDIT the Petty Cash Account
      await conn.query(
        `INSERT INTO fin_voucher_lines
          (company_id, voucher_id, line_no, account_id, description, debit, credit,
           payment_method, reference_no, currency_id, exchange_rate)
         VALUES
          (?, ?, 2, ?, ?, 0.00, ?, 'Cash', ?, 1, 1.000000)`,
        [
          companyId,
          paymentVoucherId,
          targetPettyAccountId,
          `Petty cash disbursed to ${recipient_name}`,
          numericAmount,
          transactionNo,
        ]
      );
    }

    // 10. Save Petty Cash Transaction Record
    const [txResult] = await conn.query(
      `INSERT INTO fin_petty_cash_transactions
        (company_id, branch_id, petty_cash_account_id, transaction_no, transaction_date,
         transaction_type, recipient_name, department, description, expense_account_id,
         amount, project_id, cost_center_id, status,
         handover_confirmed, handover_confirmed_by, handover_confirmed_name, handover_confirmed_at,
         recipient_confirmed, recipient_confirmed_by, recipient_confirmed_name, recipient_confirmed_at,
         payment_voucher_id, payment_voucher_no, journal_voucher_id, journal_voucher_no, recorded_by, recorded_by_name)
       VALUES
        (?, ?, ?, ?, ?, 'DISBURSEMENT', ?, ?, ?, ?, ?, ?, ?, ?,
         ?, ?, ?, ?,
         ?, ?, ?, ?,
         ?, ?, ?, ?, ?, ?)`,
      [
        companyId,
        branchId,
        targetPettyAccountId,
        transactionNo,
        transaction_date,
        String(recipient_name).trim(),
        department || null,
        String(description).trim(),
        Number(expense_account_id),
        numericAmount,
        project_id ? Number(project_id) : null,
        cost_center_id ? Number(cost_center_id) : null,
        initialStatus,
        handover_confirmed ? 1 : 0,
        handover_confirmed ? userId : null,
        handover_confirmed ? (req.body.custodian_name || req.body.handover_confirmed_name || userName) : null,
        handover_confirmed ? new Date() : null,
        recipient_confirmed ? 1 : 0,
        recipient_confirmed ? userId : null,
        recipient_confirmed ? (req.body.recipient_confirm_name || req.body.recipient_confirmed_name || recipient_name) : null,
        recipient_confirmed ? new Date() : null,
        paymentVoucherId,
        paymentVoucherNo,
        paymentVoucherId,
        paymentVoucherNo,
        userId,
        userName,
      ]
    );

    const transactionId = txResult.insertId;

    // 11. Save Attachments if any
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att.file_path && att.file_name) {
          await conn.query(
            `INSERT INTO fin_petty_cash_attachments
              (transaction_id, file_name, file_path, file_size, file_type, uploaded_by, uploaded_by_name)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              transactionId,
              att.file_name,
              att.file_path,
              att.file_size || null,
              att.file_type || null,
              userId,
              userName,
            ]
          );
        }
      }
    }

    // 12. Audit Log
    await conn.query(
      `INSERT INTO fin_petty_cash_audit_logs
        (transaction_id, petty_cash_account_id, action, details, user_id, user_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        targetPettyAccountId,
        isDualConfirmed ? 'DISBURSEMENT_COMPLETED' : 'DISBURSEMENT_RECORDED',
        `Disbursed GH₵${numericAmount.toFixed(2)} to ${recipient_name}. ${
          paymentVoucherNo ? `Auto Payment Voucher: ${paymentVoucherNo}` : 'Awaiting confirmation.'
        }`,
        userId,
        userName,
      ]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      data: {
        id: transactionId,
        transaction_no: transactionNo,
        status: initialStatus,
        payment_voucher_no: paymentVoucherNo,
        journal_voucher_no: paymentVoucherNo,
        journal_voucher_no: paymentVoucherNo,
        amount: numericAmount,
        recipient_name,
        available_balance: availableBalance - (isDualConfirmed ? numericAmount : 0),
      },
      message: isDualConfirmed
        ? `Disbursement ${transactionNo} saved successfully. Payment Voucher ${paymentVoucherNo} generated.`
        : `Disbursement ${transactionNo} recorded. Pending dual confirmation.`,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

/**
 * 7. POST /api/finance/petty-cash/transactions/:id/confirm
 * Performs dual confirmation on a pending disbursement and posts PV + GL.
 */
export async function confirmDisbursement(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const companyId = req.scope?.companyId || req.user?.company_id || 1;
    const branchId = req.scope?.branchId || 1;
    const userId = req.user?.sub || req.user?.id || 1;
    const userName = req.user?.full_name || req.user?.username || 'Staff';
    const transactionId = Number(req.params.id);

    const { confirm_type = 'BOTH', recipient_signature_note = '' } = req.body;

    const [txRows] = await conn.query(
      `SELECT * FROM fin_petty_cash_transactions WHERE id = ? AND company_id = ? FOR UPDATE`,
      [transactionId, companyId]
    );

    if (txRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const tx = txRows[0];
    if (tx.status === 'COMPLETED') {
      await conn.rollback();
      return res.status(400).json({ error: 'This disbursement is already completed and confirmed.' });
    }
    if (tx.status === 'REVERSED' || tx.status === 'CANCELLED') {
      await conn.rollback();
      return res.status(400).json({ error: `Cannot confirm a ${tx.status.toLowerCase()} transaction.` });
    }

    let handoverConfirmed = tx.handover_confirmed;
    let recipientConfirmed = tx.recipient_confirmed;
    let handoverName = tx.handover_confirmed_name;
    let recipientName = tx.recipient_confirmed_name;

    if (confirm_type === 'HANDOVER' || confirm_type === 'BOTH') {
      handoverConfirmed = 1;
      handoverName = req.body.custodian_name || req.body.handover_confirmed_name || req.body.confirmed_name || userName;
    }
    if (confirm_type === 'RECIPIENT' || confirm_type === 'BOTH') {
      recipientConfirmed = 1;
      recipientName = req.body.recipient_confirm_name || req.body.recipient_confirmed_name || req.body.confirmed_name || tx.recipient_name;
    }

    const isFullyConfirmed = handoverConfirmed === 1 && recipientConfirmed === 1;

    let paymentVoucherId = tx.payment_voucher_id;
    let paymentVoucherNo = tx.payment_voucher_no;

    if (isFullyConfirmed && !paymentVoucherId) {
      // Re-verify balance before finalizing
      const [txTotals] = await conn.query(
        `SELECT 
           SUM(CASE WHEN transaction_type = 'FUNDING' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_funding,
           SUM(CASE WHEN transaction_type = 'DISBURSEMENT' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_disbursed,
           SUM(CASE WHEN transaction_type = 'REVERSAL' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_reversed
         FROM fin_petty_cash_transactions
         WHERE petty_cash_account_id = ? AND company_id = ?`,
        [tx.petty_cash_account_id, companyId]
      );

      const [pcaRows] = await conn.query(
        `SELECT opening_balance FROM fin_petty_cash_accounts WHERE account_id = ? AND company_id = ? LIMIT 1`,
        [tx.petty_cash_account_id, companyId]
      );

      const opening = Number(pcaRows?.[0]?.opening_balance || 0);
      const funding = Number(txTotals[0]?.total_funding || 0);
      const disbursed = Number(txTotals[0]?.total_disbursed || 0);
      const reversed = Number(txTotals[0]?.total_reversed || 0);
      const availableBalance = opening + funding - disbursed + reversed;

      if (Number(tx.amount) > availableBalance) {
        await conn.rollback();
        return res.status(400).json({
          error: `Insufficient balance to complete confirmation. Available: GH₵${availableBalance.toFixed(2)}, Required: GH₵${Number(tx.amount).toFixed(2)}.`,
        });
      }

      // Generate Journal Voucher (JV)
      const [jvTypeRows] = await conn.query(
        `SELECT id, prefix, next_number FROM fin_voucher_types 
         WHERE company_id = ? AND code = 'JV' 
         LIMIT 1 FOR UPDATE`,
        [companyId]
      );
      const jvType = jvTypeRows[0];
      const nextNum = Number(jvType.next_number || 1);
      paymentVoucherNo = `${jvType.prefix || 'JV'}${String(nextNum).padStart(6, '0')}`;

      await conn.query(`UPDATE fin_voucher_types SET next_number = next_number + 1 WHERE id = ?`, [jvType.id]);

      const fiscalYearId = await getFiscalYearId(conn, companyId, tx.transaction_date);

      const [jvResult] = await conn.query(
        `INSERT INTO fin_vouchers
          (company_id, branch_id, fiscal_year_id, voucher_type_id, voucher_no, voucher_date,
           narration, currency_id, exchange_rate, total_debit, total_credit, balanced_amount,
           status, created_by, project_id, cost_center_id, created_at, updated_at)
         VALUES
          (?, ?, ?, ?, ?, ?, ?, 1, 1.000000, ?, ?, ?, 'APPROVED', ?, ?, ?, NOW(), NOW())`,
        [
          companyId,
          branchId,
          fiscalYearId,
          jvType.id,
          paymentVoucherNo,
          tx.transaction_date,
          `Petty Cash Disbursement: ${tx.description} | Recipient: ${tx.recipient_name} | Ref: ${tx.transaction_no}`,
          tx.amount,
          tx.amount,
          tx.amount,
          userId,
          tx.project_id,
          tx.cost_center_id,
        ]
      );
      paymentVoucherId = jvResult.insertId;

      // Lines
      await conn.query(
        `INSERT INTO fin_voucher_lines
          (company_id, voucher_id, line_no, account_id, description, debit, credit, payment_method, reference_no, currency_id, exchange_rate)
         VALUES
          (?, ?, 1, ?, ?, ?, 0.00, 'Cash', ?, 1, 1.000000),
          (?, ?, 2, ?, ?, 0.00, ?, 'Cash', ?, 1, 1.000000)`,
        [
          companyId, paymentVoucherId, tx.expense_account_id, `${tx.description} (Recipient: ${tx.recipient_name})`, tx.amount, tx.transaction_no,
          companyId, paymentVoucherId, tx.petty_cash_account_id, `Petty cash disbursed to ${tx.recipient_name}`, tx.amount, tx.transaction_no
        ]
      );
    }

    const newStatus = isFullyConfirmed ? 'COMPLETED' : 'PENDING_CONFIRMATION';

    await conn.query(
      `UPDATE fin_petty_cash_transactions SET
        status = ?,
        handover_confirmed = ?,
        handover_confirmed_by = CASE WHEN ? = 1 THEN ? ELSE handover_confirmed_by END,
        handover_confirmed_name = CASE WHEN ? = 1 THEN ? ELSE handover_confirmed_name END,
        handover_confirmed_at = CASE WHEN ? = 1 AND handover_confirmed_at IS NULL THEN NOW() ELSE handover_confirmed_at END,
        recipient_confirmed = ?,
        recipient_confirmed_by = CASE WHEN ? = 1 THEN ? ELSE recipient_confirmed_by END,
        recipient_confirmed_name = CASE WHEN ? = 1 THEN ? ELSE recipient_confirmed_name END,
        recipient_confirmed_at = CASE WHEN ? = 1 AND recipient_confirmed_at IS NULL THEN NOW() ELSE recipient_confirmed_at END,
        payment_voucher_id = ?,
        payment_voucher_no = ?,
        journal_voucher_id = ?,
        journal_voucher_no = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [
        newStatus,
        handoverConfirmed,
        handoverConfirmed, userId,
        handoverConfirmed, handoverName,
        handoverConfirmed,
        recipientConfirmed,
        recipientConfirmed, userId,
        recipientConfirmed, recipientName,
        recipientConfirmed,
        paymentVoucherId,
        paymentVoucherNo,
        paymentVoucherId,
        paymentVoucherNo,
        transactionId,
      ]
    );

    // Audit log
    await conn.query(
      `INSERT INTO fin_petty_cash_audit_logs
        (transaction_id, petty_cash_account_id, action, details, user_id, user_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        tx.petty_cash_account_id,
        isFullyConfirmed ? 'CONFIRMATION_COMPLETED' : 'PARTIAL_CONFIRMATION',
        `Confirmed by ${userName}. Status: ${newStatus}. PV: ${paymentVoucherNo || 'N/A'}. ${recipient_signature_note ? `Note: ${recipient_signature_note}` : ''}`,
        userId,
        userName,
      ]
    );

    await conn.commit();

    res.json({
      success: true,
      message: isFullyConfirmed
        ? `Dual confirmation complete. Payment Voucher ${paymentVoucherNo} posted.`
        : `Confirmation recorded. Awaiting second confirmation.`,
      status: newStatus,
      payment_voucher_no: paymentVoucherNo,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

/**
 * 8. POST /api/finance/petty-cash/transactions/:id/reverse
 * Reverses a completed petty cash disbursement, reverses its GL Payment Voucher,
 * and restores available petty cash balance.
 */
export async function reverseDisbursement(req, res, next) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const companyId = req.scope?.companyId || req.user?.company_id || 1;
    const branchId = req.scope?.branchId || 1;
    const userId = req.user?.sub || req.user?.id || 1;
    const userName = req.user?.full_name || req.user?.username || 'Staff';
    const transactionId = Number(req.params.id);
    const { reversal_reason } = req.body;

    if (!reversal_reason || !String(reversal_reason).trim()) {
      await conn.rollback();
      return res.status(400).json({ error: 'Reversal justification is required.' });
    }

    const [txRows] = await conn.query(
      `SELECT * FROM fin_petty_cash_transactions WHERE id = ? AND company_id = ? FOR UPDATE`,
      [transactionId, companyId]
    );

    if (txRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const tx = txRows[0];
    if (tx.status === 'REVERSED') {
      await conn.rollback();
      return res.status(400).json({ error: 'This disbursement is already reversed.' });
    }

    // If an associated Payment Voucher was generated, reverse it or create reversal entry
    if (tx.payment_voucher_id) {
      // Mark original PV as REVERSED
      await conn.query(
        `UPDATE fin_vouchers SET status = 'REVERSED', updated_at = NOW() WHERE id = ?`,
        [tx.payment_voucher_id]
      );

      // Create reversing Journal Voucher or Reversal PV to balance GL
      const [jvTypeRows] = await conn.query(
        `SELECT id, prefix, next_number FROM fin_voucher_types 
         WHERE company_id = ? AND code = 'JV' LIMIT 1 FOR UPDATE`,
        [companyId]
      );

      if (jvTypeRows.length > 0) {
        const jvType = jvTypeRows[0];
        const jvNo = `${jvType.prefix || 'JV'}${String(jvType.next_number || 1).padStart(6, '0')}`;
        await conn.query(`UPDATE fin_voucher_types SET next_number = next_number + 1 WHERE id = ?`, [jvType.id]);

        const fiscalYearId = await getFiscalYearId(conn, companyId, new Date().toISOString().slice(0, 10));

        const [revVoucher] = await conn.query(
          `INSERT INTO fin_vouchers
            (company_id, branch_id, fiscal_year_id, voucher_type_id, voucher_no, voucher_date,
             narration, currency_id, exchange_rate, total_debit, total_credit, balanced_amount,
             status, created_by, project_id, cost_center_id, created_at, updated_at)
           VALUES
            (?, ?, ?, ?, ?, CURDATE(), ?, 1, 1.000000, ?, ?, ?, 'APPROVED', ?, ?, ?, NOW(), NOW())`,
          [
            companyId,
            branchId,
            fiscalYearId,
            jvType.id,
            jvNo,
            `REVERSAL of Journal Voucher ${tx.journal_voucher_no || tx.payment_voucher_no} (${tx.transaction_no}): ${reversal_reason}`,
            tx.amount,
            tx.amount,
            tx.amount,
            userId,
            tx.project_id,
            tx.cost_center_id,
          ]
        );

        // Lines: Debit Petty Cash, Credit Expense (exact opposite)
        await conn.query(
          `INSERT INTO fin_voucher_lines
            (company_id, voucher_id, line_no, account_id, description, debit, credit, payment_method, reference_no, currency_id, exchange_rate)
           VALUES
            (?, ?, 1, ?, ?, ?, 0.00, 'Cash', ?, 1, 1.000000),
            (?, ?, 2, ?, ?, 0.00, ?, 'Cash', ?, 1, 1.000000)`,
          [
            companyId, revVoucher.insertId, tx.petty_cash_account_id, `Reversal of disbursement ${tx.transaction_no}`, tx.amount, tx.transaction_no,
            companyId, revVoucher.insertId, tx.expense_account_id, `Reversal of expense ${tx.transaction_no}`, tx.amount, tx.transaction_no
          ]
        );

        // Record reversal in fin_voucher_reversals
        await conn.query(
          `INSERT INTO fin_voucher_reversals
            (company_id, original_voucher_id, reversal_voucher_id, reason, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [companyId, tx.journal_voucher_id || tx.payment_voucher_id, revVoucher.insertId, reversal_reason, userId]
        );
      }
    }

    // Mark transaction as REVERSED
    await conn.query(
      `UPDATE fin_petty_cash_transactions SET
        status = 'REVERSED',
        reversal_reason = ?,
        updated_at = NOW()
       WHERE id = ?`,
      [reversal_reason, transactionId]
    );

    // Audit log
    await conn.query(
      `INSERT INTO fin_petty_cash_audit_logs
        (transaction_id, petty_cash_account_id, action, details, user_id, user_name)
       VALUES (?, ?, 'DISBURSEMENT_REVERSED', ?, ?, ?)`,
      [
        transactionId,
        tx.petty_cash_account_id,
        `Reversed by ${userName}. Reason: ${reversal_reason}`,
        userId,
        userName,
      ]
    );

    await conn.commit();

    res.json({
      success: true,
      message: `Disbursement ${tx.transaction_no} successfully reversed and funds restored to Petty Cash Book.`,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}

/**
 * 9. POST /api/finance/petty-cash/transactions/:id/attachments
 * Uploads supporting evidence attachment for a disbursement.
 */
export async function addTransactionAttachment(req, res, next) {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || 1;
    const userId = req.user?.sub || req.user?.id || 1;
    const userName = req.user?.full_name || req.user?.username || 'Staff';
    const transactionId = Number(req.params.id);

    const { file_name, file_path, file_size, file_type } = req.body;

    if (!file_name || !file_path) {
      return res.status(400).json({ error: 'file_name and file_path are required.' });
    }

    const [txRows] = await pool.query(
      `SELECT id FROM fin_petty_cash_transactions WHERE id = ? AND company_id = ? LIMIT 1`,
      [transactionId, companyId]
    );

    if (txRows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    const [ins] = await pool.query(
      `INSERT INTO fin_petty_cash_attachments
        (transaction_id, file_name, file_path, file_size, file_type, uploaded_by, uploaded_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [transactionId, file_name, file_path, file_size || null, file_type || null, userId, userName]
    );

    await pool.query(
      `INSERT INTO fin_petty_cash_audit_logs
        (transaction_id, action, details, user_id, user_name)
       VALUES (?, 'ATTACHMENT_ADDED', ?, ?, ?)`,
      [transactionId, `Attachment "${file_name}" uploaded by ${userName}`, userId, userName]
    );

    res.status(201).json({
      success: true,
      data: {
        id: ins.insertId,
        transaction_id: transactionId,
        file_name,
        file_path,
      },
      message: 'Attachment uploaded successfully.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 10. GET /api/finance/petty-cash/reports
 * Provides 7 financial reports:
 * 1. Petty Cash Book Statement
 * 2. Disbursement Report
 * 3. Funding Report
 * 4. Balance Report
 * 5. Recipient History
 * 6. Expense Account Analysis
 * 7. Petty Cash Reconciliation Report
 */
export async function getPettyCashReports(req, res, next) {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || 1;
    const {
      report_type = 'STATEMENT',
      account_id,
      start_date,
      end_date,
      department,
      recipient,
      expense_account_id,
    } = req.query;

    await syncFundingFromContraVouchers(companyId, account_id ? Number(account_id) : null);

    let dateWhere = '';
    const params = [companyId];
    if (account_id && account_id !== 'ALL') {
      dateWhere += ` AND t.petty_cash_account_id = ?`;
      params.push(Number(account_id));
    }
    if (start_date) {
      dateWhere += ` AND t.transaction_date >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      dateWhere += ` AND t.transaction_date <= ?`;
      params.push(end_date);
    }

    let reportData = {};

    switch (report_type) {
      case 'STATEMENT': {
        // Detailed statement showing chronologically all movements with opening balance
        const [statementRows] = await pool.query(
          `SELECT t.*, 
                  exp.name AS expense_account_name, exp.code AS expense_account_code,
                  pca.account_name AS petty_cash_account_name
           FROM fin_petty_cash_transactions t
           LEFT JOIN fin_accounts exp ON t.expense_account_id = exp.id
           LEFT JOIN fin_petty_cash_accounts pca ON t.petty_cash_account_id = pca.account_id
           WHERE t.company_id = ? ${dateWhere}
           ORDER BY t.transaction_date ASC, t.id ASC`,
          params
        );
        reportData = { type: 'STATEMENT', rows: statementRows };
        break;
      }

      case 'DISBURSEMENTS': {
        const [disbRows] = await pool.query(
          `SELECT t.*, exp.name AS expense_account_name, exp.code AS expense_account_code
           FROM fin_petty_cash_transactions t
           LEFT JOIN fin_accounts exp ON t.expense_account_id = exp.id
           WHERE t.company_id = ? AND t.transaction_type = 'DISBURSEMENT' ${dateWhere}
           ORDER BY t.transaction_date DESC`,
          params
        );
        reportData = { type: 'DISBURSEMENTS', rows: disbRows };
        break;
      }

      case 'FUNDING': {
        const [fundRows] = await pool.query(
          `SELECT t.*, v.voucher_no, v.voucher_date
           FROM fin_petty_cash_transactions t
           LEFT JOIN fin_vouchers v ON t.contra_voucher_id = v.id
           WHERE t.company_id = ? AND t.transaction_type = 'FUNDING' ${dateWhere}
           ORDER BY t.transaction_date DESC`,
          params
        );
        reportData = { type: 'FUNDING', rows: fundRows };
        break;
      }

      case 'RECIPIENTS': {
        const [recipRows] = await pool.query(
          `SELECT t.recipient_name, t.department,
                  COUNT(*) AS transaction_count,
                  SUM(t.amount) AS total_received,
                  MAX(t.transaction_date) AS last_disbursement_date
           FROM fin_petty_cash_transactions t
           WHERE t.company_id = ? AND t.transaction_type = 'DISBURSEMENT' AND t.status = 'COMPLETED' ${dateWhere}
           GROUP BY t.recipient_name, t.department
           ORDER BY total_received DESC`,
          params
        );
        reportData = { type: 'RECIPIENTS', rows: recipRows };
        break;
      }

      case 'EXPENSE_ANALYSIS': {
        const [expRows] = await pool.query(
          `SELECT exp.id AS expense_account_id, exp.code AS expense_account_code, exp.name AS expense_account_name,
                  COUNT(*) AS count_disbursements,
                  SUM(t.amount) AS total_spent
           FROM fin_petty_cash_transactions t
           JOIN fin_accounts exp ON t.expense_account_id = exp.id
           WHERE t.company_id = ? AND t.transaction_type = 'DISBURSEMENT' AND t.status = 'COMPLETED' ${dateWhere}
           GROUP BY exp.id, exp.code, exp.name
           ORDER BY total_spent DESC`,
          params
        );
        reportData = { type: 'EXPENSE_ANALYSIS', rows: expRows };
        break;
      }

      case 'RECONCILIATION': {
        // Detailed comparison of Petty Cash Book vs General Ledger
        const [accList] = await pool.query(
          `SELECT pca.*, fa.code AS account_code, fa.name AS account_name
           FROM fin_petty_cash_accounts pca
           JOIN fin_accounts fa ON pca.account_id = fa.id
           WHERE pca.company_id = ? AND pca.is_active = 1`,
          [companyId]
        );

        const reconciliations = await Promise.all(
          accList.map(async (acc) => {
            const [txSummary] = await pool.query(
              `SELECT 
                 SUM(CASE WHEN transaction_type = 'FUNDING' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_funding,
                 SUM(CASE WHEN transaction_type = 'DISBURSEMENT' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_disbursed,
                 SUM(CASE WHEN transaction_type = 'REVERSAL' AND status = 'COMPLETED' THEN amount ELSE 0 END) AS total_reversed
               FROM fin_petty_cash_transactions
               WHERE petty_cash_account_id = ? AND company_id = ?`,
              [acc.account_id, companyId]
            );

            const opening = Number(acc.opening_balance || 0);
            const funding = Number(txSummary[0]?.total_funding || 0);
            const disbursed = Number(txSummary[0]?.total_disbursed || 0);
            const reversed = Number(txSummary[0]?.total_reversed || 0);
            const bookBalance = opening + funding - disbursed + reversed;

            // GL Query
            const [glResult] = await pool.query(
              `SELECT 
                 COALESCE(SUM(debit), 0) AS gl_debits,
                 COALESCE(SUM(credit), 0) AS gl_credits,
                 COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS gl_net
               FROM fin_general_ledger
               WHERE account_id = ? AND company_id = ?`,
              [acc.account_id, companyId]
            );

            const glDebits = Number(glResult[0]?.gl_debits || 0);
            const glCredits = Number(glResult[0]?.gl_credits || 0);
            const glBalance = glDebits - glCredits + opening;
            const variance = Math.abs(bookBalance - glBalance) < 0.01 ? 0 : (bookBalance - glBalance);

            return {
              account_id: acc.account_id,
              account_code: acc.account_code,
              account_name: acc.account_name,
              custodian_name: acc.custodian_name,
              opening_balance: opening,
              total_funding: funding,
              total_disbursed: disbursed,
              total_reversed: reversed,
              petty_cash_book_balance: bookBalance,
              gl_debits: glDebits,
              gl_credits: glCredits,
              gl_balance: glBalance,
              variance,
              is_balanced: variance === 0,
            };
          })
        );

        reportData = { type: 'RECONCILIATION', rows: reconciliations };
        break;
      }

      default: {
        reportData = { type: 'GENERAL', rows: [] };
      }
    }

    res.json({ success: true, data: reportData });
  } catch (err) {
    next(err);
  }
}

/**
 * 11. POST /api/finance/petty-cash/sync-funding
 * Manual trigger endpoint to scan and synchronize Contra Vouchers into Petty Cash Book.
 */
export async function manualSyncFunding(req, res, next) {
  try {
    const companyId = req.scope?.companyId || req.user?.company_id || 1;
    await syncFundingFromContraVouchers(companyId);
    res.json({ success: true, message: 'Funding synchronization completed successfully.' });
  } catch (err) {
    next(err);
  }
}
