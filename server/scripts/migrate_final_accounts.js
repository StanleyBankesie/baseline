import { query } from '../db/pool.js';

export async function migrateFinalAccounts() {
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

  console.log('Final Account & Retention tables created successfully!');
}

if (process.argv[1]?.includes('migrate_final_accounts.js')) {
  migrateFinalAccounts().then(() => process.exit(0)).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
