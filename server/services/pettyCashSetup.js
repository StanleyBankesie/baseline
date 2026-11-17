/**
 * @file pettyCashSetup.js
 * @description Database setup and schema initialization for OmniSuite ERP Petty Cash Book.
 */
import pool from '../db/pool.js';

export async function ensurePettyCashSchema() {
  const conn = await pool.getConnection();
  try {
    // 1. Ensure default "Petty Cash Account" exists in fin_accounts under "Cash and Cash Equivalents"
    const [cashGroup] = await conn.query(
      `SELECT id FROM fin_account_groups WHERE name = 'Cash and Cash Equivalents' AND company_id = 1 LIMIT 1`
    );
    const groupId = cashGroup?.[0]?.id || 23;

    const [existingAccount] = await conn.query(
      `SELECT id FROM fin_accounts WHERE (code = '1023' OR name = 'Petty Cash Account') AND company_id = 1 LIMIT 1`
    );

    let defaultAccountId;
    if (existingAccount.length === 0) {
      const [insertAcc] = await conn.query(
        `INSERT INTO fin_accounts 
          (company_id, group_id, code, name, balance_type, currency_id, is_control_account, is_postable, is_active, created_at, updated_at)
         VALUES 
          (1, ?, '1023', 'Petty Cash Account', 'DEBIT', 1, 0, 1, 1, NOW(), NOW())`,
        [groupId]
      );
      defaultAccountId = insertAcc.insertId;
      console.log('Created default Petty Cash Account with ID:', defaultAccountId);
    } else {
      defaultAccountId = existingAccount[0].id;
    }

    // 2. Create fin_petty_cash_accounts table (Configuration)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS fin_petty_cash_accounts (
        id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        company_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 1,
        branch_id BIGINT(20) UNSIGNED NULL DEFAULT 1,
        account_id BIGINT(20) UNSIGNED NOT NULL,
        account_name VARCHAR(190) NOT NULL,
        custodian_id BIGINT(20) UNSIGNED NULL,
        custodian_name VARCHAR(150) NULL,
        department_id BIGINT(20) UNSIGNED NULL,
        department_name VARCHAR(100) NULL,
        opening_balance DECIMAL(18,2) NOT NULL DEFAULT 0.00,
        low_balance_threshold DECIMAL(18,2) NOT NULL DEFAULT 200.00,
        max_single_disbursement DECIMAL(18,2) NOT NULL DEFAULT 1000.00,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_petty_account (company_id, account_id),
        KEY idx_petty_company (company_id),
        KEY idx_petty_account (account_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure default account is registered in fin_petty_cash_accounts
    const [existingConfig] = await conn.query(
      `SELECT id FROM fin_petty_cash_accounts WHERE account_id = ? AND company_id = 1`,
      [defaultAccountId]
    );
    if (existingConfig.length === 0) {
      await conn.query(
        `INSERT INTO fin_petty_cash_accounts
          (company_id, branch_id, account_id, account_name, custodian_id, custodian_name, department_name, opening_balance, low_balance_threshold, max_single_disbursement, is_active)
         VALUES
          (1, 1, ?, 'Petty Cash Account', 1, 'Administrator', 'Finance & Administration', 500.00, 250.00, 1500.00, 1)`,
        [defaultAccountId]
      );
      console.log('Seeded default petty cash account configuration.');
    }

    // 3. Create fin_petty_cash_transactions table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS fin_petty_cash_transactions (
        id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        company_id BIGINT(20) UNSIGNED NOT NULL DEFAULT 1,
        branch_id BIGINT(20) UNSIGNED NULL DEFAULT 1,
        petty_cash_account_id BIGINT(20) UNSIGNED NOT NULL,
        transaction_no VARCHAR(40) NOT NULL,
        transaction_date DATE NOT NULL,
        transaction_type ENUM('FUNDING', 'DISBURSEMENT', 'REVERSAL') NOT NULL,
        recipient_name VARCHAR(150) NOT NULL,
        department VARCHAR(100) NULL,
        description TEXT NOT NULL,
        expense_account_id BIGINT(20) UNSIGNED NULL,
        amount DECIMAL(18,2) NOT NULL,
        project_id BIGINT(20) UNSIGNED NULL,
        cost_center_id INT(11) NULL,
        status ENUM('DRAFT', 'PENDING_CONFIRMATION', 'COMPLETED', 'REVERSED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',
        handover_confirmed TINYINT(1) NOT NULL DEFAULT 0,
        handover_confirmed_by BIGINT(20) UNSIGNED NULL,
        handover_confirmed_name VARCHAR(100) NULL,
        handover_confirmed_at DATETIME NULL,
        recipient_confirmed TINYINT(1) NOT NULL DEFAULT 0,
        recipient_confirmed_by BIGINT(20) UNSIGNED NULL,
        recipient_confirmed_name VARCHAR(100) NULL,
        recipient_confirmed_at DATETIME NULL,
        payment_voucher_id BIGINT(20) UNSIGNED NULL,
        payment_voucher_no VARCHAR(40) NULL,
        contra_voucher_id BIGINT(20) UNSIGNED NULL,
        contra_voucher_no VARCHAR(40) NULL,
        reversal_of_id BIGINT(20) UNSIGNED NULL,
        reversal_reason TEXT NULL,
        recorded_by BIGINT(20) UNSIGNED NULL,
        recorded_by_name VARCHAR(100) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_petty_tx_no (company_id, transaction_no),
        KEY idx_petty_tx_account (petty_cash_account_id),
        KEY idx_petty_tx_date (transaction_date),
        KEY idx_petty_tx_status (status),
        KEY idx_petty_tx_type (transaction_type),
        KEY idx_petty_pv (payment_voucher_id),
        KEY idx_petty_cv (contra_voucher_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Create fin_petty_cash_attachments table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS fin_petty_cash_attachments (
        id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        transaction_id BIGINT(20) UNSIGNED NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT(20) NULL,
        file_type VARCHAR(100) NULL,
        uploaded_by BIGINT(20) UNSIGNED NULL,
        uploaded_by_name VARCHAR(100) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_petty_att_tx (transaction_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Create fin_petty_cash_audit_logs table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS fin_petty_cash_audit_logs (
        id BIGINT(20) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        transaction_id BIGINT(20) UNSIGNED NULL,
        petty_cash_account_id BIGINT(20) UNSIGNED NULL,
        action VARCHAR(60) NOT NULL,
        details TEXT NULL,
        user_id BIGINT(20) UNSIGNED NULL,
        user_name VARCHAR(100) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_petty_audit_tx (transaction_id),
        KEY idx_petty_audit_acc (petty_cash_account_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Petty Cash schema verified successfully.');
    return { success: true, defaultAccountId };
  } catch (err) {
    console.error('Error verifying Petty Cash schema:', err);
    throw err;
  } finally {
    conn.release();
  }
}

if (process.argv[1]?.endsWith('pettyCashSetup.js')) {
  ensurePettyCashSchema().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
