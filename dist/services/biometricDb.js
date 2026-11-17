import { query } from "../db/pool.js";

/**
 * Ensures all Biometric Facial Recognition and Geofence tables/columns exist in the database.
 */
export async function ensureBiometricTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS hr_biometric_templates (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      company_id BIGINT UNSIGNED NOT NULL,
      employee_id BIGINT UNSIGNED NOT NULL,
      template_version VARCHAR(30) NOT NULL DEFAULT 'INSIGHTFACE_V1',
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
      location_id BIGINT UNSIGNED NULL,
      device_name VARCHAR(100) NOT NULL,
      device_code VARCHAR(50) NOT NULL,
      api_key VARCHAR(128) NOT NULL,
      device_type ENUM('KIOSK', 'LAPTOP_WEBCAM', 'USB_TERMINAL', 'TABLET', 'MOBILE_PWA') DEFAULT 'KIOSK',
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
      result ENUM('SUCCESS', 'FAILED_MATCH', 'FAILED_LIVENESS', 'FAILED_QUALITY', 'NO_FACE', 'OUT_OF_LOCATION', 'NO_GPS', 'ERROR') NOT NULL,
      latitude DECIMAL(10, 8) NULL,
      longitude DECIMAL(11, 8) NULL,
      distance_m INT NULL,
      location_verified TINYINT(1) NULL,
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
      match_threshold DECIMAL(4,3) NOT NULL DEFAULT 0.450,
      liveness_threshold DECIMAL(4,3) NOT NULL DEFAULT 0.850,
      min_face_size INT NOT NULL DEFAULT 100,
      allow_multi_frame TINYINT(1) NOT NULL DEFAULT 1,
      require_liveness TINYINT(1) NOT NULL DEFAULT 0,
      clock_in_grace_minutes INT NOT NULL DEFAULT 15,
      auto_detect_in_out TINYINT(1) NOT NULL DEFAULT 1,
      prevent_duplicate_window_mins INT NOT NULL DEFAULT 5,
      enforce_geofence TINYINT(1) NOT NULL DEFAULT 1,
      geofence_policy ENUM('STRICT_REJECT', 'FLAG_AND_NOTIFY') NOT NULL DEFAULT 'FLAG_AND_NOTIFY',
      default_geofence_radius INT NOT NULL DEFAULT 150,
      alert_email_enabled TINYINT(1) NOT NULL DEFAULT 1,
      alert_sms_enabled TINYINT(1) NOT NULL DEFAULT 0,
      alert_recipients TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_comp_settings (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Secondary authorized locations for multi-site employees
  await query(`
    CREATE TABLE IF NOT EXISTS hr_employee_locations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      company_id BIGINT UNSIGNED NOT NULL,
      employee_id BIGINT UNSIGNED NOT NULL,
      location_id BIGINT UNSIGNED NOT NULL,
      is_primary TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_emp_loc (employee_id, location_id),
      INDEX idx_loc_emp (company_id, location_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Safe migrations to add any missing columns in hr_locations
  const locCols = await query("DESCRIBE hr_locations").catch(() => []);
  const locColNames = new Set(locCols.map(c => c.Field));

  if (!locColNames.has("code")) {
    await query("ALTER TABLE hr_locations ADD COLUMN code VARCHAR(50) NULL AFTER location_name").catch(() => {});
  }
  if (!locColNames.has("latitude")) {
    await query("ALTER TABLE hr_locations ADD COLUMN latitude DECIMAL(10, 8) NULL AFTER address").catch(() => {});
  }
  if (!locColNames.has("longitude")) {
    await query("ALTER TABLE hr_locations ADD COLUMN longitude DECIMAL(11, 8) NULL AFTER latitude").catch(() => {});
  }
  if (!locColNames.has("geofence_radius")) {
    await query("ALTER TABLE hr_locations ADD COLUMN geofence_radius INT NOT NULL DEFAULT 150 AFTER longitude").catch(() => {});
  }
  if (!locColNames.has("facility_type")) {
    await query("ALTER TABLE hr_locations ADD COLUMN facility_type VARCHAR(50) DEFAULT 'OFFICE' AFTER geofence_radius").catch(() => {});
  }

  // Safe migrations to add missing columns in hr_biometric_settings
  const setCols = await query("DESCRIBE hr_biometric_settings").catch(() => []);
  const setColNames = new Set(setCols.map(c => c.Field));
  if (!setColNames.has("enforce_geofence")) {
    await query("ALTER TABLE hr_biometric_settings ADD COLUMN enforce_geofence TINYINT(1) NOT NULL DEFAULT 1").catch(() => {});
  }
  if (!setColNames.has("geofence_policy")) {
    await query("ALTER TABLE hr_biometric_settings ADD COLUMN geofence_policy ENUM('STRICT_REJECT', 'FLAG_AND_NOTIFY') NOT NULL DEFAULT 'FLAG_AND_NOTIFY'").catch(() => {});
  }
  if (!setColNames.has("default_geofence_radius")) {
    await query("ALTER TABLE hr_biometric_settings ADD COLUMN default_geofence_radius INT NOT NULL DEFAULT 150").catch(() => {});
  }
  if (!setColNames.has("alert_email_enabled")) {
    await query("ALTER TABLE hr_biometric_settings ADD COLUMN alert_email_enabled TINYINT(1) NOT NULL DEFAULT 1").catch(() => {});
  }
  if (!setColNames.has("alert_sms_enabled")) {
    await query("ALTER TABLE hr_biometric_settings ADD COLUMN alert_sms_enabled TINYINT(1) NOT NULL DEFAULT 0").catch(() => {});
  }
  if (!setColNames.has("alert_recipients")) {
    await query("ALTER TABLE hr_biometric_settings ADD COLUMN alert_recipients TEXT NULL").catch(() => {});
  }

  // Safe migrations in hr_biometric_logs for GPS
  const logCols = await query("DESCRIBE hr_biometric_logs").catch(() => []);
  const logColNames = new Set(logCols.map(c => c.Field));
  if (!logColNames.has("latitude")) {
    await query("ALTER TABLE hr_biometric_logs ADD COLUMN latitude DECIMAL(10, 8) NULL").catch(() => {});
  }
  if (!logColNames.has("longitude")) {
    await query("ALTER TABLE hr_biometric_logs ADD COLUMN longitude DECIMAL(11, 8) NULL").catch(() => {});
  }
  if (!logColNames.has("distance_m")) {
    await query("ALTER TABLE hr_biometric_logs ADD COLUMN distance_m INT NULL").catch(() => {});
  }
  if (!logColNames.has("location_verified")) {
    await query("ALTER TABLE hr_biometric_logs ADD COLUMN location_verified TINYINT(1) NULL").catch(() => {});
  }

  // Safe migrations in hr_attendance for GPS and verification
  const attCols = await query("DESCRIBE hr_attendance").catch(() => []);
  const attColNames = new Set(attCols.map(c => c.Field));
  if (!attColNames.has("latitude")) {
    await query("ALTER TABLE hr_attendance ADD COLUMN latitude DECIMAL(10, 8) NULL").catch(() => {});
  }
  if (!attColNames.has("longitude")) {
    await query("ALTER TABLE hr_attendance ADD COLUMN longitude DECIMAL(11, 8) NULL").catch(() => {});
  }
  if (!attColNames.has("gps_accuracy")) {
    await query("ALTER TABLE hr_attendance ADD COLUMN gps_accuracy DECIMAL(6, 2) NULL").catch(() => {});
  }
  if (!attColNames.has("location_id")) {
    await query("ALTER TABLE hr_attendance ADD COLUMN location_id BIGINT UNSIGNED NULL").catch(() => {});
  }
  if (!attColNames.has("location_verified")) {
    await query("ALTER TABLE hr_attendance ADD COLUMN location_verified TINYINT(1) DEFAULT 0").catch(() => {});
  }
  if (!attColNames.has("location_distance_meters")) {
    await query("ALTER TABLE hr_attendance ADD COLUMN location_distance_meters INT NULL").catch(() => {});
  }
  if (!attColNames.has("location_status")) {
    await query("ALTER TABLE hr_attendance ADD COLUMN location_status ENUM('IN_LOCATION', 'OUT_OF_LOCATION', 'NO_GPS', 'NOT_APPLICABLE') DEFAULT 'NOT_APPLICABLE'").catch(() => {});
  }
  if (!attColNames.has("approval_status")) {
    await query("ALTER TABLE hr_attendance ADD COLUMN approval_status ENUM('APPROVED', 'PENDING_REVIEW', 'REJECTED') DEFAULT 'APPROVED'").catch(() => {});
  }
}
