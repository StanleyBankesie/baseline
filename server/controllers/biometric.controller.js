import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";
import { ensureBiometricTables } from "../services/biometricDb.js";
import { encryptEmbedding, decryptEmbedding } from "../services/biometricEncryption.js";
import * as faceService from "../services/faceService.js";
import { syncAttendanceToTimesheet } from "./hr.controller.js";
import crypto from "crypto";

/**
 * Returns company settings or defaults.
 */
async function getCompanySettings(companyId) {
  const rows = await query(
    `SELECT * FROM hr_biometric_settings WHERE company_id = :companyId LIMIT 1`,
    { companyId }
  );
  if (rows.length > 0) return rows[0];
  return {
    match_threshold: 0.380,
    liveness_threshold: 0.850,
    min_face_size: 100,
    allow_multi_frame: 1,
    require_liveness: 1,
    clock_in_grace_minutes: 15,
    auto_detect_in_out: 1,
    prevent_duplicate_window_mins: 5,
  };
}

/**
 * Helper to log biometric events to hr_biometric_logs.
 */
async function logBiometricEvent({
  companyId,
  branchId = null,
  employeeId = null,
  deviceId = null,
  eventType,
  matchScore = null,
  livenessScore = null,
  qualityScore = null,
  result,
  latencyMs = null,
  ipAddress = null,
  remarks = null,
}) {
  try {
    await query(
      `INSERT INTO hr_biometric_logs 
        (company_id, branch_id, employee_id, device_id, event_type, match_score, liveness_score, quality_score, result, latency_ms, ip_address, remarks)
       VALUES 
        (:companyId, :branchId, :employeeId, :deviceId, :eventType, :matchScore, :livenessScore, :qualityScore, :result, :latencyMs, :ipAddress, :remarks)`,
      {
        companyId,
        branchId,
        employeeId,
        deviceId,
        eventType,
        matchScore,
        livenessScore,
        qualityScore,
        result,
        latencyMs,
        ipAddress,
        remarks,
      }
    );
  } catch (err) {
    console.error("[logBiometricEvent] Error logging event:", err.message);
  }
}

/**
 * Face Service Health & Status.
 */
export async function getServiceStatus(req, res, next) {
  try {
    await ensureBiometricTables();
    const health = await faceService.checkFaceServiceHealth();
    res.json({
      success: true,
      service: health,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Enrolls employee face biometric template.
 */
export async function enrollFace(req, res, next) {
  const startTime = Date.now();
  try {
    await ensureBiometricTables();
    const { companyId = 1, userId = null } = req.scope || {};
    const { employee_id, image, consent_given } = req.body;

    if (!employee_id) throw httpError(400, "BAD_REQUEST", "employee_id is required");
    if (!image) throw httpError(400, "BAD_REQUEST", "Facial image capture is required");
    if (!consent_given) {
      throw httpError(400, "CONSENT_REQUIRED", "Biometric processing consent must be affirmed (Ghana Data Protection Act, Act 843)");
    }

    // Verify employee exists and belongs to company
    const empRows = await query(
      `SELECT id, first_name, last_name, branch_id FROM hr_employees WHERE id = :employee_id AND company_id = :companyId AND deleted_at IS NULL`,
      { employee_id, companyId }
    );
    if (!empRows.length) throw httpError(404, "NOT_FOUND", "Employee not found");
    const employee = empRows[0];

    const settings = await getCompanySettings(companyId);

    // Call Python microservice to extract 128-D vector, check quality and liveness
    const extraction = await faceService.extractEmbedding(image, {
      checkLiveness: Boolean(settings.require_liveness),
      livenessThreshold: Number(settings.liveness_threshold),
    });

    if (!extraction.success || !extraction.face_detected) {
      await logBiometricEvent({
        companyId,
        branchId: employee.branch_id,
        employeeId: employee.id,
        eventType: "REGISTRATION",
        result: "NO_FACE",
        latencyMs: Date.now() - startTime,
        remarks: extraction.message || "No face detected in capture",
      });
      return res.status(400).json({
        success: false,
        message: extraction.message || "No face detected in image. Ensure face is centered and clearly visible.",
      });
    }

    if (!extraction.quality_passed) {
      await logBiometricEvent({
        companyId,
        branchId: employee.branch_id,
        employeeId: employee.id,
        eventType: "REGISTRATION",
        qualityScore: extraction.quality?.blur_score || 0,
        result: "FAILED_QUALITY",
        latencyMs: Date.now() - startTime,
        remarks: (extraction.quality?.reasons || []).join("; "),
      });
      return res.status(400).json({
        success: false,
        message: `Image quality check failed: ${(extraction.quality?.reasons || []).join(", ")}`,
        quality: extraction.quality,
      });
    }

    if (settings.require_liveness && !extraction.liveness_passed) {
      await logBiometricEvent({
        companyId,
        branchId: employee.branch_id,
        employeeId: employee.id,
        eventType: "REGISTRATION",
        livenessScore: extraction.liveness?.real_score || 0,
        result: "FAILED_LIVENESS",
        latencyMs: Date.now() - startTime,
        remarks: "Liveness verification failed during registration",
      });
      return res.status(400).json({
        success: false,
        message: "Liveness verification failed. Real, live face required for biometric enrollment.",
      });
    }

    // Encrypt embedding with AES-256-GCM
    const { encryptedEmbedding, iv, authTag } = encryptEmbedding(extraction.embedding);

    // Deactivate previous active templates for this employee
    await query(
      `UPDATE hr_biometric_templates SET is_active = 0 WHERE company_id = :companyId AND employee_id = :employeeId`,
      { companyId, employeeId: employee.id }
    );

    // Insert new template
    await query(
      `INSERT INTO hr_biometric_templates 
        (company_id, employee_id, template_version, encrypted_embedding, iv, auth_tag, photo_thumbnail, consent_given, consent_timestamp, is_active, created_by)
       VALUES 
        (:companyId, :employeeId, 'SFACE_V1', :encryptedEmbedding, :iv, :authTag, :thumbnail, 1, NOW(), 1, :userId)`,
      {
        companyId,
        employeeId: employee.id,
        encryptedEmbedding,
        iv,
        authTag,
        thumbnail: image.slice(0, 150000), // Store thumbnail
        userId,
      }
    );

    // Update hr_employees record for backward compatibility
    await query(
      `UPDATE hr_employees SET 
        face_descriptor = :descriptorStr,
        face_photo = :thumbnail,
        face_registered_at = NOW()
       WHERE id = :employeeId AND company_id = :companyId`,
      {
        employeeId: employee.id,
        companyId,
        descriptorStr: JSON.stringify(extraction.embedding),
        thumbnail: image.slice(0, 150000),
      }
    );

    await logBiometricEvent({
      companyId,
      branchId: employee.branch_id,
      employeeId: employee.id,
      eventType: "REGISTRATION",
      qualityScore: extraction.quality?.blur_score,
      livenessScore: extraction.liveness?.real_score,
      result: "SUCCESS",
      latencyMs: Date.now() - startTime,
      remarks: "Facial biometric enrolled and encrypted successfully",
    });

    res.json({
      success: true,
      message: `Face biometric credentials enrolled successfully for ${employee.first_name} ${employee.last_name}`,
      quality: extraction.quality,
      registered_at: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove employee biometric template (Right to Erasure).
 */
export async function removeEmployeeBiometrics(req, res, next) {
  try {
    await ensureBiometricTables();
    const { companyId = 1 } = req.scope || {};
    const { id } = req.params;

    await query(
      `UPDATE hr_biometric_templates SET is_active = 0 WHERE company_id = :companyId AND employee_id = :id`,
      { companyId, id }
    );

    await query(
      `UPDATE hr_employees SET face_descriptor = NULL, face_photo = NULL, face_registered_at = NULL WHERE id = :id AND company_id = :companyId`,
      { id, companyId }
    );

    res.json({ success: true, message: "Biometric profile erased successfully." });
  } catch (err) {
    next(err);
  }
}

/**
 * Core Biometric Facial Attendance (1:N or 1:1 Kiosk Clock-in / Clock-out).
 */
export async function biometricClockInOut(req, res, next) {
  const startTime = Date.now();
  try {
    await ensureBiometricTables();
    let companyId = req.scope?.companyId || null;
    let branchId = req.scope?.branchId || null;
    let deviceId = null;

    // Check if request is authenticated via device API key or kiosk code
    const deviceKey = req.headers["x-device-key"] || req.body.device_key;
    const deviceCode = req.headers["x-device-code"] || req.body.device_code;

    if (deviceKey || deviceCode) {
      const devRows = await query(
        `SELECT id, company_id, branch_id, is_active FROM hr_biometric_devices WHERE (api_key = :deviceKey OR device_code = :deviceCode) AND is_active = 1 LIMIT 1`,
        { deviceKey: deviceKey || "", deviceCode: deviceCode || "" }
      );
      if (devRows.length) {
        companyId = devRows[0].company_id;
        branchId = devRows[0].branch_id || branchId;
        deviceId = devRows[0].id;
        // Update heartbeat
        await query(`UPDATE hr_biometric_devices SET last_heartbeat = NOW() WHERE id = :id`, { id: deviceId }).catch(() => {});
      }
    }

    if (!companyId) {
      companyId = 1; // Fallback to default company if unassigned
    }

    const {
      probe_image,
      additional_frames = [],
      mode = "AUTO", // AUTO, CLOCK_IN, CLOCK_OUT
      target_employee_id = null, // Optional for 1:1 verification
    } = req.body;

    if (!probe_image) throw httpError(400, "BAD_REQUEST", "probe_image is required");

    const settings = await getCompanySettings(companyId);

    // Retrieve active templates for the company
    let sql = `
      SELECT t.id, t.employee_id, t.encrypted_embedding, t.iv, t.auth_tag,
             e.emp_code, e.first_name, e.last_name, e.branch_id, e.status, e.picture_url,
             COALESCE(d.dept_name, '') as department_name
      FROM hr_biometric_templates t
      JOIN hr_employees e ON e.id = t.employee_id
      LEFT JOIN hr_departments d ON d.id = e.dept_id
      WHERE t.company_id = :companyId AND t.is_active = 1 AND e.status = 'ACTIVE' AND e.deleted_at IS NULL
    `;
    const params = { companyId };

    if (target_employee_id) {
      sql += ` AND t.employee_id = :targetEmpId`;
      params.targetEmpId = target_employee_id;
    }

    const templateRows = await query(sql, params);

    if (templateRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: target_employee_id ? "No active face biometric template found for this employee." : "No active employee face templates registered in this organization.",
      });
    }

    // Decrypt embeddings into candidate array
    const candidates = [];
    for (const row of templateRows) {
      try {
        const decryptedVec = decryptEmbedding(row.encrypted_embedding, row.iv, row.auth_tag);
        candidates.push({
          id: row.id,
          employee_id: row.employee_id,
          name: `${row.first_name} ${row.last_name}`,
          emp_code: row.emp_code,
          branch_id: row.branch_id,
          department_name: row.department_name,
          embedding: decryptedVec,
        });
      } catch (decErr) {
        console.warn(`Failed decrypting template ${row.id}:`, decErr.message);
      }
    }

    if (candidates.length === 0) {
      throw httpError(500, "DECRYPTION_ERROR", "Could not decrypt employee biometric templates");
    }

    // Identify via Python Microservice
    const recognition = await faceService.identifyEmployee(probe_image, candidates, {
      additionalFrames: settings.allow_multi_frame ? additional_frames : [],
      threshold: Number(settings.match_threshold),
      checkLiveness: Boolean(settings.require_liveness),
      livenessThreshold: Number(settings.liveness_threshold),
    });

    const elapsed = Date.now() - startTime;

    if (!recognition.success) {
      await logBiometricEvent({
        companyId,
        branchId,
        deviceId,
        eventType: mode === "CLOCK_OUT" ? "CLOCK_OUT" : "CLOCK_IN",
        result: recognition.liveness && !recognition.liveness.liveness_passed ? "FAILED_LIVENESS" : (recognition.quality && !recognition.quality.passed ? "FAILED_QUALITY" : "ERROR"),
        livenessScore: recognition.liveness?.confidence || null,
        qualityScore: recognition.quality?.blur_score || null,
        latencyMs: elapsed,
        remarks: recognition.message,
      });

      return res.status(400).json({
        success: false,
        message: recognition.message || "Facial recognition verification failed.",
        details: recognition,
      });
    }

    if (!recognition.identified || !recognition.best_match) {
      await logBiometricEvent({
        companyId,
        branchId,
        deviceId,
        eventType: mode === "CLOCK_OUT" ? "CLOCK_OUT" : "CLOCK_IN",
        result: "FAILED_MATCH",
        matchScore: recognition.similarity || 0,
        livenessScore: recognition.liveness?.confidence || null,
        latencyMs: elapsed,
        remarks: `No match above threshold (${recognition.similarity || 0} < ${settings.match_threshold})`,
      });

      return res.status(404).json({
        success: false,
        message: "Face recognized does not match any registered employee template.",
        similarity: recognition.similarity,
        threshold: settings.match_threshold,
      });
    }

    const matchedCandidate = recognition.best_match;
    const employeeId = matchedCandidate.employee_id;
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTime = new Date();

    // Check duplicate clock-in prevention window
    const dupWindowMins = Number(settings.prevent_duplicate_window_mins || 5);
    const recentLogs = await query(
      `SELECT id, created_at, event_type FROM hr_biometric_logs 
       WHERE employee_id = :employeeId AND result = 'SUCCESS' AND created_at >= DATE_SUB(NOW(), INTERVAL :dupWindowMins MINUTE)
       ORDER BY id DESC LIMIT 1`,
      { employeeId, dupWindowMins }
    );

    if (recentLogs.length > 0) {
      return res.status(429).json({
        success: false,
        duplicate_prevented: true,
        message: `Attendance was already recorded recently for ${matchedCandidate.name}. Please wait ${dupWindowMins} minutes before scanning again.`,
        last_event: recentLogs[0],
      });
    }

    // Lookup employee schedule and shift
    const scheduleRows = await query(
      `SELECT ws.*, s.start_time, s.end_time, s.break_minutes, s.name as shift_name
       FROM hr_work_schedules ws
       JOIN hr_shifts s ON s.id = ws.shift_id
       WHERE ws.employee_id = :employeeId AND ws.company_id = :companyId AND ws.is_active = 1
       LIMIT 1`,
      { employeeId, companyId }
    );

    const shift = scheduleRows.length > 0 ? scheduleRows[0] : null;

    // Check existing attendance for today
    const attRows = await query(
      `SELECT * FROM hr_attendance WHERE employee_id = :employeeId AND attendance_date = :todayStr LIMIT 1`,
      { employeeId, todayStr }
    );

    const existingAtt = attRows.length > 0 ? attRows[0] : null;

    let determinedAction = mode;
    if (mode === "AUTO") {
      if (!existingAtt || !existingAtt.clock_in) {
        determinedAction = "CLOCK_IN";
      } else if (existingAtt.clock_in && !existingAtt.clock_out) {
        determinedAction = "CLOCK_OUT";
      } else {
        // Both already present: allow updating clock_out
        determinedAction = "CLOCK_OUT";
      }
    }

    let attStatus = "PRESENT";
    let lateMinutes = 0;

    // Evaluate Lateness on clock-in
    if (determinedAction === "CLOCK_IN" && shift && shift.start_time) {
      const [shH, shM] = String(shift.start_time).split(":").map(Number);
      const shiftStart = new Date(nowTime);
      shiftStart.setHours(shH, shM, 0, 0);

      const graceMinutes = Number(settings.clock_in_grace_minutes || 15);
      const graceThreshold = new Date(shiftStart.getTime() + graceMinutes * 60 * 1000);

      if (nowTime > graceThreshold) {
        attStatus = "LATE";
        lateMinutes = Math.round((nowTime.getTime() - shiftStart.getTime()) / (60 * 1000));
      }
    }

    let attendanceId = null;

    if (determinedAction === "CLOCK_IN") {
      if (existingAtt) {
        attendanceId = existingAtt.id;
        await query(
          `UPDATE hr_attendance SET 
            clock_in = NOW(),
            status = :status,
            face_verified = 1,
            face_confidence = :confidence,
            biometric_type = 'FACIAL_RECOGNITION',
            remarks = COALESCE(remarks, :remark)
           WHERE id = :id`,
          {
            id: attendanceId,
            status: attStatus,
            confidence: Math.round((recognition.similarity || 0.95) * 100),
            remark: lateMinutes > 0 ? `Clocked in late by ${lateMinutes} mins (Facial Recognition)` : "Clocked in via Biometric Facial Recognition",
          }
        );
      } else {
        const ins = await query(
          `INSERT INTO hr_attendance 
            (company_id, employee_id, attendance_date, clock_in, status, face_verified, face_confidence, biometric_type, remarks)
           VALUES 
            (:companyId, :employeeId, :todayStr, NOW(), :status, 1, :confidence, 'FACIAL_RECOGNITION', :remark)`,
          {
            companyId,
            employeeId,
            todayStr,
            status: attStatus,
            confidence: Math.round((recognition.similarity || 0.95) * 100),
            remark: lateMinutes > 0 ? `Late arrival: ${lateMinutes} mins (Facial Recognition)` : "Clocked in via Biometric Facial Recognition",
          }
        );
        attendanceId = ins.insertId;
      }
    } else {
      // CLOCK_OUT
      if (existingAtt) {
        attendanceId = existingAtt.id;
        await query(
          `UPDATE hr_attendance SET 
            clock_out = NOW(),
            face_verified = 1,
            face_confidence = :confidence,
            biometric_type = 'FACIAL_RECOGNITION',
            remarks = CONCAT(COALESCE(remarks, ''), '; Clocked out via Face Biometrics')
           WHERE id = :id`,
          {
            id: attendanceId,
            confidence: Math.round((recognition.similarity || 0.95) * 100),
          }
        );
      } else {
        const ins = await query(
          `INSERT INTO hr_attendance 
            (company_id, employee_id, attendance_date, clock_out, status, face_verified, face_confidence, biometric_type, remarks)
           VALUES 
            (:companyId, :employeeId, :todayStr, NOW(), 'PRESENT', 1, :confidence, 'FACIAL_RECOGNITION', 'Clocked out via Biometric Facial Recognition')`,
          {
            companyId,
            employeeId,
            todayStr,
            confidence: Math.round((recognition.similarity || 0.95) * 100),
          }
        );
        attendanceId = ins.insertId;
      }
    }

    // Synchronize to timesheets
    const updatedAttRows = await query(`SELECT * FROM hr_attendance WHERE id = :id`, { id: attendanceId });
    if (updatedAttRows.length > 0) {
      await syncAttendanceToTimesheet({
        companyId,
        employeeId,
        attendanceDate: updatedAttRows[0].attendance_date,
        clockIn: updatedAttRows[0].clock_in,
        clockOut: updatedAttRows[0].clock_out,
        status: updatedAttRows[0].status,
        remarks: updatedAttRows[0].remarks,
      });
    }

    // Log successful biometric event
    await logBiometricEvent({
      companyId,
      branchId,
      employeeId,
      deviceId,
      eventType: determinedAction,
      matchScore: recognition.similarity,
      livenessScore: recognition.liveness?.confidence,
      qualityScore: recognition.quality?.blur_score,
      result: "SUCCESS",
      latencyMs: elapsed,
      remarks: `${determinedAction} recorded successfully (Similarity: ${(recognition.similarity * 100).toFixed(1)}%)`,
    });

    res.json({
      success: true,
      action: determinedAction,
      employee: {
        id: employeeId,
        name: matchedCandidate.name,
        emp_code: matchedCandidate.emp_code,
        department: matchedCandidate.department_name,
      },
      status: attStatus,
      late_minutes: lateMinutes,
      clock_time: nowTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      date: todayStr,
      similarity: recognition.similarity,
      liveness_score: recognition.liveness?.confidence,
      message: `${determinedAction === "CLOCK_IN" ? "Clock-in successful" : "Clock-out successful"}! Have a great day, ${matchedCandidate.name}.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Biometric Devices API
 */
export async function listDevices(req, res, next) {
  try {
    await ensureBiometricTables();
    const { companyId = 1 } = req.scope || {};
    const rows = await query(
      `SELECT d.*, b.name as branch_name 
       FROM hr_biometric_devices d
       LEFT JOIN adm_branches b ON b.id = d.branch_id
       WHERE d.company_id = :companyId ORDER BY d.id DESC`,
      { companyId }
    );
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
}

export async function createDevice(req, res, next) {
  try {
    await ensureBiometricTables();
    const { companyId = 1, userId = null } = req.scope || {};
    const { device_name, device_type = "KIOSK", branch_id = null } = req.body;

    if (!device_name) throw httpError(400, "BAD_REQUEST", "device_name is required");

    const device_code = "DEV-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    const api_key = "kiosk_" + crypto.randomBytes(24).toString("hex");

    const result = await query(
      `INSERT INTO hr_biometric_devices (company_id, branch_id, device_name, device_code, api_key, device_type, created_by)
       VALUES (:companyId, :branchId, :deviceName, :deviceCode, :apiKey, :deviceType, :userId)`,
      {
        companyId,
        branchId: branch_id || null,
        deviceName: device_name,
        deviceCode: device_code,
        apiKey: api_key,
        deviceType: device_type,
        userId,
      }
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
      device_code,
      api_key,
      message: "Biometric device registered successfully.",
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteDevice(req, res, next) {
  try {
    await ensureBiometricTables();
    const { companyId = 1 } = req.scope || {};
    const { id } = req.params;
    await query(`DELETE FROM hr_biometric_devices WHERE id = :id AND company_id = :companyId`, { id, companyId });
    res.json({ success: true, message: "Device removed." });
  } catch (err) {
    next(err);
  }
}

/**
 * Biometric Settings API
 */
export async function getSettings(req, res, next) {
  try {
    await ensureBiometricTables();
    const { companyId = 1 } = req.scope || {};
    const settings = await getCompanySettings(companyId);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    await ensureBiometricTables();
    const { companyId = 1 } = req.scope || {};
    const {
      match_threshold = 0.380,
      liveness_threshold = 0.850,
      min_face_size = 100,
      allow_multi_frame = 1,
      require_liveness = 1,
      clock_in_grace_minutes = 15,
      auto_detect_in_out = 1,
      prevent_duplicate_window_mins = 5,
    } = req.body;

    await query(
      `INSERT INTO hr_biometric_settings
        (company_id, match_threshold, liveness_threshold, min_face_size, allow_multi_frame, require_liveness, clock_in_grace_minutes, auto_detect_in_out, prevent_duplicate_window_mins)
       VALUES
        (:companyId, :match_threshold, :liveness_threshold, :min_face_size, :allow_multi_frame, :require_liveness, :clock_in_grace_minutes, :auto_detect_in_out, :prevent_duplicate_window_mins)
       ON DUPLICATE KEY UPDATE
        match_threshold = VALUES(match_threshold),
        liveness_threshold = VALUES(liveness_threshold),
        min_face_size = VALUES(min_face_size),
        allow_multi_frame = VALUES(allow_multi_frame),
        require_liveness = VALUES(require_liveness),
        clock_in_grace_minutes = VALUES(clock_in_grace_minutes),
        auto_detect_in_out = VALUES(auto_detect_in_out),
        prevent_duplicate_window_mins = VALUES(prevent_duplicate_window_mins)`,
      {
        companyId,
        match_threshold,
        liveness_threshold,
        min_face_size,
        allow_multi_frame: allow_multi_frame ? 1 : 0,
        require_liveness: require_liveness ? 1 : 0,
        clock_in_grace_minutes,
        auto_detect_in_out: auto_detect_in_out ? 1 : 0,
        prevent_duplicate_window_mins,
      }
    );

    res.json({ success: true, message: "Biometric settings updated successfully." });
  } catch (err) {
    next(err);
  }
}

/**
 * Biometric Logs & Analytics API
 */
export async function getAnalytics(req, res, next) {
  try {
    await ensureBiometricTables();
    const { companyId = 1 } = req.scope || {};

    const [empTotal] = await query(
      `SELECT COUNT(*) as total FROM hr_employees WHERE company_id = :companyId AND status = 'ACTIVE' AND deleted_at IS NULL`,
      { companyId }
    );
    const [enrolledTotal] = await query(
      `SELECT COUNT(DISTINCT employee_id) as enrolled FROM hr_biometric_templates WHERE company_id = :companyId AND is_active = 1`,
      { companyId }
    );

    const [todayFaceAtt] = await query(
      `SELECT COUNT(*) as face_count FROM hr_attendance 
       WHERE company_id = :companyId AND attendance_date = CURDATE() AND face_verified = 1`,
      { companyId }
    );

    const [spoofsDetected] = await query(
      `SELECT COUNT(*) as spoofs FROM hr_biometric_logs 
       WHERE company_id = :companyId AND result = 'FAILED_LIVENESS' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      { companyId }
    );

    const recentLogs = await query(
      `SELECT l.*, CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.emp_code
       FROM hr_biometric_logs l
       LEFT JOIN hr_employees e ON e.id = l.employee_id
       WHERE l.company_id = :companyId ORDER BY l.id DESC LIMIT 15`,
      { companyId }
    );

    res.json({
      metrics: {
        total_employees: empTotal.total || 0,
        enrolled_employees: enrolledTotal.enrolled || 0,
        enrollment_rate: empTotal.total > 0 ? Math.round((enrolledTotal.enrolled / empTotal.total) * 100) : 0,
        today_biometric_attendances: todayFaceAtt.face_count || 0,
        spoof_attempts_blocked_30d: spoofsDetected.spoofs || 0,
      },
      recent_logs: recentLogs,
    });
  } catch (err) {
    next(err);
  }
}
