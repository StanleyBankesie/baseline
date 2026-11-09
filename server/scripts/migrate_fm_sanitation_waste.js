import { pool } from "../db/pool.js";

export async function migrateFMSanitationAndWaste() {
  console.log("[FM Sanitation & Waste Migration] Ensuring tables exist...");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fm_sanitation_checkpoints (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL DEFAULT 1,
      name VARCHAR(150) NOT NULL,
      code VARCHAR(50) NULL,
      description VARCHAR(255) NULL,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_fm_sani_comp (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS fm_waste_streams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      company_id INT NOT NULL DEFAULT 1,
      name VARCHAR(150) NOT NULL,
      code VARCHAR(50) NULL,
      description VARCHAR(255) NULL,
      default_unit VARCHAR(50) DEFAULT 'BINS',
      hazard_level VARCHAR(50) DEFAULT 'NON_HAZARDOUS',
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_fm_waste_comp (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Seed default sanitation checkpoints if empty
  const [existingSani] = await pool.query("SELECT COUNT(*) as count FROM fm_sanitation_checkpoints");
  if (existingSani[0]?.count === 0) {
    await pool.query(`
      INSERT INTO fm_sanitation_checkpoints (company_id, name, code, description) VALUES
      (1, 'Restrooms Sanitized & Disinfected', 'RESTROOMS', 'Daily chemical sanitization of commodes, urinals, mirrors and basins'),
      (1, 'Floors Swept & Mopped', 'FLOORS', 'Wet mopping, tile buffing and entrance floor mat vacuuming'),
      (1, 'Trash Emptied & Relined', 'TRASH', 'Clearing all waste bins and installing new fresh bin liners'),
      (1, 'Soap & Paper Supplies Restocked', 'SUPPLIES', 'Hand soap, hand towels, toilet tissue and sanitizer refills'),
      (1, 'High-Touch Surfaces Disinfected', 'SURFACES', 'Doorknobs, handrails, light switches, and lift buttons'),
      (1, 'Dusting & Surface Wipedown', 'DUSTING', 'Desks, conference tables, window ledges and reception counters');
    `);
    console.log("[FM Sanitation & Waste Migration] Seeded 6 default sanitation checkpoints.");
  }

  // Seed default waste streams if empty
  const [existingWaste] = await pool.query("SELECT COUNT(*) as count FROM fm_waste_streams");
  if (existingWaste[0]?.count === 0) {
    await pool.query(`
      INSERT INTO fm_waste_streams (company_id, name, code, description, default_unit, hazard_level) VALUES
      (1, 'General Refuse & Municipal Waste', 'GENERAL_REFUSE', 'Non-hazardous general office waste and mixed municipal refuse', 'BINS', 'NON_HAZARDOUS'),
      (1, 'Recyclable Plastic', 'RECYCLABLE_PLASTIC', 'PET bottles, plastic packaging and clean containers', 'BINS', 'NON_HAZARDOUS'),
      (1, 'Recyclable Paper & Cardboard', 'RECYCLABLE_PAPER', 'Shredded documents, packaging boxes and office paper', 'KG', 'NON_HAZARDOUS'),
      (1, 'Hazardous Chemical Waste', 'HAZARDOUS', 'Chemical containers, oils, lubricants, and chemical residue', 'KG', 'HIGH'),
      (1, 'Medical & Biohazard Waste', 'BIOHAZARD', 'First aid room disposables, dressings, and biological waste', 'BAGS', 'HIGH'),
      (1, 'E-Waste & Electronics', 'ELECTRONIC', 'Decommissioned peripherals, cables, batteries, and electronic scrap', 'KG', 'LOW'),
      (1, 'Organic & Garden Waste', 'ORGANIC', 'Landscape trimmings, cafeteria organic scrap, and green cuttings', 'BINS', 'NON_HAZARDOUS');
    `);
    console.log("[FM Sanitation & Waste Migration] Seeded 7 default waste streams.");
  }

  console.log("[FM Sanitation & Waste Migration] Successfully completed.");
}

migrateFMSanitationAndWaste()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
