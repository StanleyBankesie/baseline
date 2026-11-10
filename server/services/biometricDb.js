import { query } from "../db/pool.js";

/**
 * Ensures all Biometric Facial Recognition tables exist in the database.
 */
export async function ensureBiometricTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS hr_biometric_templates (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      company_id BIGINT UNSIGNED NOT NULL,
      employee_id BIGINT UNSIGNED NOT NULL,
      template_version VARCHAR(30) NOT NULL DEFAULT 'SFACE_V1',
      encrypted_embedding LONGTEXT NOT NULL,
      iv VARCHAR(64) NOT NULL,
      auth_tag VARCHAR(64) NOT NULL,
      photo_thumbnail MEDIUMTEXT NULL,
      consent_given TINYINT(1) NOT NULL DEFAULT 1,
      consent_timestamp DATETIME NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_comp_emp (company_id, employee_id),
      INDEX idx_comp_active (company_id, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS hr_biometric_devices (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      company_id BIGINT UNSIGNED NOT NULL,
      branch_id BIGINT UNSIGNED NULL,
      device_name VARCHAR(100) NOT NULL,
      device_code VARCHAR(50) NOT NULL,
      api_key VARCHAR(128) NOT NULL,
      device_type ENUM('KIOSK', 'LAPTOP_WEBCAM', 'USB_TERMINAL', 'TABLET') DEFAULT 'KIOSK',
      ip_address VARCHAR(45) NULL,
      mac_address VARCHAR(45) NULL,
      last_heartbeat DATETIME NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_device_code (company_id, device_code),
      INDEX idx_dev_company (company_id, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS hr_biometric_logs (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      company_id BIGINT UNSIGNED NOT NULL,
      branch_id BIGINT UNSIGNED NULL,
      employee_id BIGINT UNSIGNED NULL,
      device_id BIGINT UNSIGNED NULL,
      event_type ENUM('CLOCK_IN', 'CLOCK_OUT', 'REGISTRATION', 'VERIFY_ONLY') NOT NULL,
      match_score DECIMAL(6,4) NULL,
      liveness_score DECIMAL(6,4) NULL,
      quality_score DECIMAL(6,4) NULL,
      result ENUM('SUCCESS', 'FAILED_MATCH', 'FAILED_LIVENESS', 'FAILED_QUALITY', 'NO_FACE', 'ERROR') NOT NULL,
      latency_ms INT NULL,
      ip_address VARCHAR(45) NULL,
      remarks VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_log_comp_date (company_id, created_at),
      INDEX idx_log_emp (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS hr_biometric_settings (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      company_id BIGINT UNSIGNED NOT NULL,
      match_threshold DECIMAL(4,3) NOT NULL DEFAULT 0.380,
      liveness_threshold DECIMAL(4,3) NOT NULL DEFAULT 0.850,
      min_face_size INT NOT NULL DEFAULT 100,
      allow_multi_frame TINYINT(1) NOT NULL DEFAULT 1,
      require_liveness TINYINT(1) NOT NULL DEFAULT 1,
      clock_in_grace_minutes INT NOT NULL DEFAULT 15,
      auto_detect_in_out TINYINT(1) NOT NULL DEFAULT 1,
      prevent_duplicate_window_mins INT NOT NULL DEFAULT 5,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_comp_settings (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}
