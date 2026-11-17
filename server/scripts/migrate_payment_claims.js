import { query } from '../db/pool.js';

export async function migratePaymentClaims() {
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

  console.log('Payment Claims tables successfully migrated!');
}

if (process.argv[1]?.endsWith('migrate_payment_claims.js')) {
  migratePaymentClaims()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
