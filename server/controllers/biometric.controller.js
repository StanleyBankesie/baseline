import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";
import { ensureBiometricTables } from "../services/biometricDb.js";
import { encryptEmbedding, decryptEmbedding } from "../services/biometricEncryption.js";
import * as faceService from "../services/faceService.js";
import { syncAttendanceToTimesheet } from "./hr.controller.js";
import { sendMail, isMailerConfigured } from "../utils/mailer.js";
import { sendSMS, isSMSConfigured } from "../utils/sms.js";
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
    match_threshold: 0.450,
    liveness_threshold: 0.650,
    min_face_size: 100,
    allow_multi_frame: 1,
    require_liveness: 0,
    clock_in_grace_minutes: 15,
    auto_detect_in_out: 1,
    prevent_duplicate_window_mins: 5,
    enforce_geofence: 1,
    geofence_policy: "FLAG_AND_NOTIFY", // STRICT_REJECT or FLAG_AND_NOTIFY
    default_geofence_radius: 150,
    alert_email_enabled: 1,
    alert_sms_enabled: 0,
    alert_recipients: "admin@omnisuite.com",
  };
}

/**
 * Calculates Great Circle Haversine distance in meters between two lat/lng pairs.
 */
function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371e3; // Earth radius in meters
  const phi1 = (Number(lat1) * Math.PI) / 180;
  const phi2 = (Number(lat2) * Math.PI) / 180;
  const deltaPhi = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const deltaLambda = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Retrieves acceptable work locations authorized for an employee.
 */
async function getAuthorizedLocations(companyId, employeeId, branchId) {
  // 1. Direct multi-location assignments
  let locations = await query(
    `SELECT l.* FROM hr_employee_locations el
     JOIN hr_locations l ON l.id = el.location_id
     WHERE el.employee_id = :employeeId AND l.is_active = 1`,
    { employeeId }
  );

  // 2. Primary assigned location in hr_employees
  if (locations.length === 0) {
    locations = await query(
      `SELECT l.* FROM hr_employees e
       JOIN hr_locations l ON l.id = e.location_id
       WHERE e.id = :employeeId AND l.is_active = 1`,
      { employeeId }
    );
  }

  // 3. Fallback to all company active locations with configured coordinates
  if (locations.length === 0) {
    locations = await query(
      `SELECT * FROM hr_locations 
       WHERE (company_id = :companyId OR company_id IS NULL OR company_id = 1) 
         AND is_active = 1 AND latitude IS NOT NULL AND longitude IS NOT NULL`,
      { companyId }
    );
  }

  return locations;
}

/**
 * Helper to dispatch Out-of-Location Security Alerts via Email and SMS.
 */
async function dispatchOutOfLocationAlert({
  companyId,
  employee,
  locationResult,
  settings,
  deviceInfo,
}) {
  try {
    const rawRecipients = settings.alert_recipients || "";
    const recipientsList = rawRecipients
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (recipientsList.length === 0) return;

    const emails = recipientsList.filter((r) => r.includes("@"));
    const phones = recipientsList.filter((r) => !r.includes("@") && /\d/.test(r));

    const alertMessage = `[OMNISUITE SECURITY ALERT] Out-of-Location Clock-in: Employee ${employee.name} (${employee.emp_code || "ID: " + employee.employee_id}) clocked in outside authorized geofence. Distance: ${locationResult.distanceMeters || "Unknown"}m (Allowed: ${locationResult.allowedRadius || 150}m). Time: ${new Date().toLocaleString()}. Decision: ${locationResult.policyAction}.`;

    // Send SMS
    if (settings.alert_sms_enabled && phones.length > 0 && isSMSConfigured()) {
      for (const phone of phones) {
        try {
          await sendSMS({ to: phone, message: alertMessage });
        } catch (smsErr) {
          console.warn("[dispatchOutOfLocationAlert] SMS error:", smsErr.message);
        }
      }
    }

    // Send Email
    if (settings.alert_email_enabled && emails.length > 0 && isMailerConfigured()) {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #e11d48; color: white; padding: 16px; font-size: 18px; font-weight: bold;">
            🚨 OmniSuite Security Alert: Out-of-Location Attendance
          </div>
          <div style="padding: 20px; line-height: 1.6; color: #334155;">
            <p>An attendance clock-in was recorded outside the authorized geofenced perimeter:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">Employee:</td><td>${employee.name} (${employee.emp_code || ""})</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">Nearest Site:</td><td>${locationResult.nearestLocation?.location_name || "Authorized Perimeter"}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">Distance:</td><td style="color: #e11d48; font-weight: bold;">${locationResult.distanceMeters} meters away</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">Allowed Radius:</td><td>${locationResult.allowedRadius} meters</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">User Coordinates:</td><td>Lat: ${locationResult.probeLat}, Lng: ${locationResult.probeLng}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">Policy Enforced:</td><td>${locationResult.policyAction}</td></tr>
              <tr><td style="padding: 6px 0; font-weight: bold;">Timestamp:</td><td>${new Date().toLocaleString()}</td></tr>
            </table>
          </div>
          <div style="background-color: #f8fafc; padding: 12px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
            OmniSuite Biometric Geofence Security System
          </div>
        </div>
      `;

      for (const email of emails) {
        try {
          await sendMail({
            to: email,
            subject: `[SECURITY ALERT] Out-of-Location Clock-in: ${employee.name}`,
            html: emailHtml,
          });
        } catch (mailErr) {
          console.warn("[dispatchOutOfLocationAlert] Mail error:", mailErr.message);
        }
      }
    }
  } catch (err) {
    console.error("[dispatchOutOfLocationAlert] Error:", err.message);
  }
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
  latitude = null,
  longitude = null,
  distanceM = null,
  locationVerified = null,
  latencyMs = null,
  ipAddress = null,
  remarks = null,
}) {
  try {
    await query(
      `INSERT INTO hr_biometric_logs 
        (company_id, branch_id, employee_id, device_id, event_type, match_score, liveness_score, quality_score, result, latitude, longitude, distance_m, location_verified, latency_ms, ip_address, remarks)
       VALUES 
        (:companyId, :branchId, :employeeId, :deviceId, :eventType, :matchScore, :livenessScore, :qualityScore, :result, :latitude, :longitude, :distanceM, :locationVerified, :latencyMs, :ipAddress, :remarks)`,
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
        latitude,
        longitude,
        distanceM,
        locationVerified,
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
 * Enrolls employee face biometric template using InsightFace ArcFace 512-D.
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
      throw httpError(400, "CONSENT_REQUIRED", "Biometric processing consent must be affirmed under Ghana Data Protection Act (Act 843)");
    }

    // Verify employee exists
    const empRows = await query(
      `SELECT id, first_name, last_name, branch_id, location_id FROM hr_employees WHERE id = :employee_id AND (company_id = :companyId OR company_id IS NULL OR company_id = 1) AND deleted_at IS NULL`,
      { employee_id, companyId }
    );
    if (!empRows.length) throw httpError(404, "NOT_FOUND", "Employee not found");
    const employee = empRows[0];

    const settings = await getCompanySettings(companyId);

    // Call Python microservice to extract 512-D InsightFace vector
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
        message: "Liveness verification failed. Live human face required for biometric enrollment.",
      });
    }

    // ========================================================
    // DUPLICATE ENROLLMENT PREVENTION CONTROLS
    // ========================================================
    const { replace_existing = false } = req.body;

    // Check 1: Prevent duplicate registration for the same employee
    const existingActive = await query(
      `SELECT id, created_at FROM hr_biometric_templates 
       WHERE (company_id = :companyId OR company_id = 1) 
         AND employee_id = :employeeId 
         AND is_active = 1 LIMIT 1`,
      { companyId, employeeId: employee.id }
    );

    if (existingActive.length > 0 && !replace_existing) {
      const enrolledDate = existingActive[0].created_at
        ? new Date(existingActive[0].created_at).toLocaleDateString("en-GB")
        : new Date().toLocaleDateString("en-GB");
      return res.status(409).json({
        success: false,
        already_registered: true,
        message: `${employee.first_name} ${employee.last_name} is already registered in the biometric system (Enrolled on ${enrolledDate}). The system will not register the same user more than once. Use 'Re-scan / Replace' if you wish to overwrite credentials.`,
      });
    }

    // Check 2: Cross-employee biometric uniqueness (1:N search against all active employees in company)
    const otherTemplates = await query(
      `SELECT t.id, t.employee_id, t.encrypted_embedding, t.iv, t.auth_tag,
              e.first_name, e.last_name, e.emp_code
       FROM hr_biometric_templates t
       JOIN hr_employees e ON e.id = t.employee_id
       WHERE (t.company_id = :companyId OR t.company_id = 1)
         AND t.is_active = 1
         AND t.employee_id != :currentEmpId
         AND e.deleted_at IS NULL`,
      { companyId, currentEmpId: employee.id }
    );

    const matchThreshold = Number(settings.match_threshold || 0.45);
    let matchedDuplicate = null;

    for (const tpl of otherTemplates) {
      try {
        const otherVec = decryptEmbedding(tpl.encrypted_embedding, tpl.iv, tpl.auth_tag);
        let dot = 0, normProbe = 0, normOther = 0;
        for (let i = 0; i < extraction.embedding.length; i++) {
          dot += extraction.embedding[i] * otherVec[i];
          normProbe += extraction.embedding[i] * extraction.embedding[i];
          normOther += otherVec[i] * otherVec[i];
        }
        const similarity = (normProbe > 0 && normOther > 0)
          ? dot / (Math.sqrt(normProbe) * Math.sqrt(normOther))
          : 0;

        if (similarity >= matchThreshold) {
          matchedDuplicate = {
            employee_id: tpl.employee_id,
            name: `${tpl.first_name} ${tpl.last_name}`,
            emp_code: tpl.emp_code,
            similarity: Math.round(similarity * 100),
          };
          break;
        }
      } catch (err) {
        console.warn("[enrollFace] Duplicate check decryption error:", err.message);
      }
    }

    if (matchedDuplicate) {
      await logBiometricEvent({
        companyId,
        branchId: employee.branch_id,
        employeeId: employee.id,
        eventType: "REGISTRATION",
        matchScore: matchedDuplicate.similarity / 100,
        result: "FAILED_MATCH",
        latencyMs: Date.now() - startTime,
        remarks: `DUPLICATE_REGISTRATION_BLOCKED: Face matches ${matchedDuplicate.name} (${matchedDuplicate.emp_code}) with ${matchedDuplicate.similarity}% similarity`,
      });

      return res.status(409).json({
        success: false,
        duplicate_biometric: true,
        message: `Security Alert: Biometric duplicate detected. This facial identity matches already enrolled employee "${matchedDuplicate.name}" (${matchedDuplicate.emp_code || 'ID: ' + matchedDuplicate.employee_id}) with ${matchedDuplicate.similarity}% match. The system will not register the same user more than once.`,
        matched_employee: matchedDuplicate,
      });
    }

    // Encrypt 512-D embedding with AES-256-GCM
    const { encryptedEmbedding, iv, authTag } = encryptEmbedding(extraction.embedding);

    // If replacing existing or re-registering, delete previous templates from database
    await query(
      `DELETE FROM hr_biometric_templates WHERE (company_id = :companyId OR company_id = 1) AND employee_id = :employeeId`,
      { companyId, employeeId: employee.id }
    );

    // Insert new template
    await query(
      `INSERT INTO hr_biometric_templates 
        (company_id, employee_id, template_version, encrypted_embedding, iv, auth_tag, photo_thumbnail, consent_given, consent_timestamp, is_active, created_by)
       VALUES 
        (:companyId, :employeeId, 'INSIGHTFACE_V1', :encryptedEmbedding, :iv, :authTag, :thumbnail, 1, NOW(), 1, :userId)`,
      {
        companyId,
        employeeId: employee.id,
        encryptedEmbedding,
        iv,
        authTag,
        thumbnail: image.slice(0, 150000),
        userId,
      }
    );

    // Update hr_employees record for backward compatibility
    await query(
      `UPDATE hr_employees SET 
        face_descriptor = :descriptorStr,
        face_photo = :thumbnail,
        face_registered_at = NOW()
       WHERE id = :employeeId`,
      {
        employeeId: employee.id,
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
      remarks: "InsightFace 512-D biometric enrolled and encrypted successfully",
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
 * Remove employee biometric template (Hard Delete from Database).
 */
export async function removeEmployeeBiometrics(req, res, next) {
  try {
    await ensureBiometricTables();
    const { companyId = 1 } = req.scope || {};
    const { id } = req.params;

    // Hard delete all biometric templates from database
    await query(
      `DELETE FROM hr_biometric_templates WHERE (company_id = :companyId OR company_id = 1) AND employee_id = :id`,
      { companyId, id }
    );

    // Hard delete / reset biometric fields in hr_employees
    await query(
      `UPDATE hr_employees SET face_descriptor = NULL, face_photo = NULL, face_registered_at = NULL WHERE id = :id`,
      { id }
    );

    await logBiometricEvent({
      companyId,
      employeeId: id,
      eventType: "REGISTRATION",
      result: "SUCCESS",
      remarks: "Biometric template permanently deleted from database (hard delete)",
    });

    res.json({ success: true, message: "Biometric profile permanently removed and deleted from database." });
  } catch (err) {
    next(err);
  }
}

/**
 * Core Biometric Facial Attendance (1:N or 1:1 Kiosk Clock-in / Clock-out)
 * with InsightFace 512-D and GPS Geofencing (3 Independent Decisions).
 */
export async function biometricClockInOut(req, res, next) {
  const startTime = Date.now();
  try {
    await ensureBiometricTables();
    let companyId = req.scope?.companyId || null;
    let branchId = req.scope?.branchId || null;
    let deviceId = null;

    // Check device credentials
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
        await query(`UPDATE hr_biometric_devices SET last_heartbeat = NOW() WHERE id = :id`, { id: deviceId }).catch(() => {});
      }
    }

    if (!companyId) companyId = 1;

    const {
      probe_image,
      additional_frames = [],
      mode = "AUTO", // AUTO, CLOCK_IN, CLOCK_OUT
      target_employee_id = null,
      latitude = null,
      longitude = null,
      gps_accuracy = null,
    } = req.body;

    if (!probe_image) throw httpError(400, "BAD_REQUEST", "probe_image is required");

    const settings = await getCompanySettings(companyId);

    // Retrieve active templates
    let sql = `
      SELECT t.id, t.employee_id, t.encrypted_embedding, t.iv, t.auth_tag,
             e.emp_code, e.first_name, e.last_name, e.branch_id, e.location_id, e.status, e.picture_url,
             COALESCE(d.dept_name, '') as department_name
      FROM hr_biometric_templates t
      JOIN hr_employees e ON e.id = t.employee_id
      LEFT JOIN hr_departments d ON d.id = e.dept_id
      WHERE (t.company_id = :companyId OR t.company_id = 1) AND t.is_active = 1 AND e.status = 'ACTIVE' AND e.deleted_at IS NULL
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
          location_id: row.location_id,
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

    // ==========================================
    // DECISION 1: BIOMETRIC IDENTITY VERIFICATION
    // ==========================================
    const recognition = await faceService.identifyEmployee(probe_image, candidates, {
      additionalFrames: settings.allow_multi_frame ? additional_frames : [],
      threshold: Number(settings.match_threshold || 0.45),
      checkLiveness: Boolean(settings.require_liveness),
      livenessThreshold: Number(settings.liveness_threshold || 0.65),
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
        latitude,
        longitude,
        latencyMs: elapsed,
        remarks: recognition.message,
      });

      return res.status(400).json({
        success: false,
        identity_verified: false,
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
        latitude,
        longitude,
        latencyMs: elapsed,
        remarks: `No match above threshold (${recognition.similarity || 0} < ${settings.match_threshold})`,
      });

      return res.status(404).json({
        success: false,
        identity_verified: false,
        message: "Face recognized does not match any registered employee template.",
        similarity: recognition.similarity,
        threshold: settings.match_threshold,
      });
    }

    const matchedCandidate = recognition.best_match;
    const employeeId = matchedCandidate.employee_id;
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTime = new Date();

    // ==========================================
    // DECISION 2: LOCATION VERIFICATION & GEOFENCING
    // ==========================================
    let locationStatus = "NOT_APPLICABLE";
    let locationVerified = 1;
    let locationDistanceMeters = null;
    let matchedLocation = null;
    let locationViolationReason = null;

    if (settings.enforce_geofence) {
      if (latitude != null && longitude != null) {
        const authorizedLocations = await getAuthorizedLocations(companyId, employeeId, matchedCandidate.branch_id);

        if (authorizedLocations.length > 0) {
          let minDistance = Infinity;
          let closestLocation = null;

          for (const loc of authorizedLocations) {
            if (loc.latitude != null && loc.longitude != null) {
              const dist = calculateHaversineDistanceMeters(latitude, longitude, loc.latitude, loc.longitude);
              if (dist !== null && dist < minDistance) {
                minDistance = dist;
                closestLocation = loc;
              }
            }
          }

          if (closestLocation) {
            const allowedRadius = Number(closestLocation.geofence_radius || settings.default_geofence_radius || 150);
            locationDistanceMeters = minDistance;
            matchedLocation = closestLocation;

            if (minDistance <= allowedRadius) {
              locationStatus = "IN_LOCATION";
              locationVerified = 1;
            } else {
              locationStatus = "OUT_OF_LOCATION";
              locationVerified = 0;
              locationViolationReason = `${minDistance}m from ${closestLocation.location_name} (Max allowed: ${allowedRadius}m)`;
            }
          } else {
            // Authorized locations have no lat/lng configured
            locationStatus = "NOT_APPLICABLE";
            locationVerified = 1;
          }
        } else {
          locationStatus = "NOT_APPLICABLE";
          locationVerified = 1;
        }
      } else {
        locationStatus = "NO_GPS";
        locationVerified = 0;
        locationViolationReason = "GPS coordinates not received from device";
      }
    }

    // ==========================================
    // DECISION 3: ATTENDANCE APPROVAL & ACTION
    // ==========================================
    let approvalStatus = "APPROVED";
    const geofencePolicy = settings.geofence_policy || "FLAG_AND_NOTIFY";

    if (settings.enforce_geofence && locationStatus === "OUT_OF_LOCATION") {
      if (geofencePolicy === "STRICT_REJECT") {
        approvalStatus = "REJECTED";

        await logBiometricEvent({
          companyId,
          branchId: matchedCandidate.branch_id,
          employeeId,
          deviceId,
          eventType: mode === "CLOCK_OUT" ? "CLOCK_OUT" : "CLOCK_IN",
          matchScore: recognition.similarity,
          livenessScore: recognition.liveness?.confidence,
          result: "OUT_OF_LOCATION",
          latitude,
          longitude,
          distanceM: locationDistanceMeters,
          locationVerified: 0,
          latencyMs: elapsed,
          remarks: `STRICT_REJECT: ${locationViolationReason}`,
        });

        // Trigger Security Alert in background without blocking response
        dispatchOutOfLocationAlert({
          companyId,
          employee: matchedCandidate,
          locationResult: {
            distanceMeters: locationDistanceMeters,
            allowedRadius: matchedLocation?.geofence_radius || settings.default_geofence_radius || 150,
            nearestLocation: matchedLocation,
            probeLat: latitude,
            probeLng: longitude,
            policyAction: "Clock-in Rejected (Strict Geofence Policy)",
          },
          settings,
        }).catch((e) => console.warn("[dispatchOutOfLocationAlert] background alert error:", e.message));

        return res.status(403).json({
          success: false,
          identity_verified: true,
          location_verified: false,
          approval_status: "REJECTED",
          message: `Attendance rejected: You are out of authorized work location (${locationViolationReason}).`,
          employee: {
            id: employeeId,
            name: matchedCandidate.name,
            emp_code: matchedCandidate.emp_code,
          },
          distance_meters: locationDistanceMeters,
          nearest_location: matchedLocation?.location_name,
        });
      } else {
        // FLAG_AND_NOTIFY
        approvalStatus = "PENDING_REVIEW";

        // Trigger Alert in background without blocking response
        dispatchOutOfLocationAlert({
          companyId,
          employee: matchedCandidate,
          locationResult: {
            distanceMeters: locationDistanceMeters,
            allowedRadius: matchedLocation?.geofence_radius || settings.default_geofence_radius || 150,
            nearestLocation: matchedLocation,
            probeLat: latitude,
            probeLng: longitude,
            policyAction: "Clock-in Accepted with Warning & Flagged for Review",
          },
          settings,
        }).catch((e) => console.warn("[dispatchOutOfLocationAlert] background alert error:", e.message));
      }
    }

    // Check duplicate prevention window (applies to prior clock-in/out scans, not registration)
    const dupWindowMins = Number(settings.prevent_duplicate_window_mins || 5);
    const recentLogs = await query(
      `SELECT id, created_at, event_type FROM hr_biometric_logs 
       WHERE employee_id = :employeeId AND result = 'SUCCESS' AND event_type IN ('CLOCK_IN', 'CLOCK_OUT') AND created_at >= DATE_SUB(NOW(), INTERVAL :dupWindowMins MINUTE)
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

    // Lookup shift
    const scheduleRows = await query(
      `SELECT ws.*, s.start_time, s.end_time, s.break_minutes, s.name as shift_name
       FROM hr_work_schedules ws
       JOIN hr_shifts s ON s.id = ws.shift_id
       WHERE ws.employee_id = :employeeId AND (ws.company_id = :companyId OR ws.company_id = 1) AND ws.is_active = 1
       LIMIT 1`,
      { employeeId, companyId }
    );
    const shift = scheduleRows.length > 0 ? scheduleRows[0] : null;

    // Existing attendance
    const attRows = await query(
      `SELECT * FROM hr_attendance WHERE employee_id = :employeeId AND attendance_date = :todayStr LIMIT 1`,
      { employeeId, todayStr }
    );
    const existingAtt = attRows.length > 0 ? attRows[0] : null;

    let determinedAction = mode;
    if (mode === "AUTO") {
      if (!existingAtt || !existingAtt.clock_in) {
        determinedAction = "CLOCK_IN";
      } else {
        determinedAction = "CLOCK_OUT";
      }
    }

    let attStatus = "PRESENT";
    let lateMinutes = 0;

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

    let remarkText = `InsightFace ArcFace 512-D Biometric Attendance (${(recognition.similarity * 100).toFixed(1)}% match)`;
    if (lateMinutes > 0) remarkText += ` | Late by ${lateMinutes} mins`;
    if (locationStatus === "OUT_OF_LOCATION") remarkText += ` | Out of location: ${locationViolationReason}`;

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
            latitude = :latitude,
            longitude = :longitude,
            gps_accuracy = :gpsAccuracy,
            location_id = :locationId,
            location_verified = :locationVerified,
            location_distance_meters = :distanceMeters,
            location_status = :locationStatus,
            approval_status = :approvalStatus,
            remarks = COALESCE(remarks, :remark)
           WHERE id = :id`,
          {
            id: attendanceId,
            status: attStatus,
            confidence: Math.round((recognition.similarity || 0.95) * 100),
            latitude,
            longitude,
            gpsAccuracy: gps_accuracy,
            locationId: matchedLocation?.id || null,
            locationVerified,
            distanceMeters: locationDistanceMeters,
            locationStatus,
            approvalStatus,
            remark: remarkText,
          }
        );
      } else {
        const ins = await query(
          `INSERT INTO hr_attendance 
            (company_id, employee_id, attendance_date, clock_in, status, face_verified, face_confidence, biometric_type, latitude, longitude, gps_accuracy, location_id, location_verified, location_distance_meters, location_status, approval_status, remarks)
           VALUES 
            (:companyId, :employeeId, :todayStr, NOW(), :status, 1, :confidence, 'FACIAL_RECOGNITION', :latitude, :longitude, :gpsAccuracy, :locationId, :locationVerified, :distanceMeters, :locationStatus, :approvalStatus, :remark)`,
          {
            companyId,
            employeeId,
            todayStr,
            status: attStatus,
            confidence: Math.round((recognition.similarity || 0.95) * 100),
            latitude,
            longitude,
            gpsAccuracy: gps_accuracy,
            locationId: matchedLocation?.id || null,
            locationVerified,
            distanceMeters: locationDistanceMeters,
            locationStatus,
            approvalStatus,
            remark: remarkText,
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
            latitude = COALESCE(:latitude, latitude),
            longitude = COALESCE(:longitude, longitude),
            location_status = :locationStatus,
            remarks = CONCAT(COALESCE(remarks, ''), '; Clocked out via InsightFace Biometrics')
           WHERE id = :id`,
          {
            id: attendanceId,
            confidence: Math.round((recognition.similarity || 0.95) * 100),
            latitude,
            longitude,
            locationStatus,
          }
        );
      } else {
        const ins = await query(
          `INSERT INTO hr_attendance 
            (company_id, employee_id, attendance_date, clock_out, status, face_verified, face_confidence, biometric_type, latitude, longitude, location_status, approval_status, remarks)
           VALUES 
            (:companyId, :employeeId, :todayStr, NOW(), 'PRESENT', 1, :confidence, 'FACIAL_RECOGNITION', :latitude, :longitude, :locationStatus, :approvalStatus, 'Clocked out via InsightFace Biometrics')`,
          {
            companyId,
            employeeId,
            todayStr,
            confidence: Math.round((recognition.similarity || 0.95) * 100),
            latitude,
            longitude,
            locationStatus,
            approvalStatus,
          }
        );
        attendanceId = ins.insertId;
      }
    }

    // Sync to timesheets
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
      }).catch(() => {});
    }

    // Log success / flag event
    await logBiometricEvent({
      companyId,
      branchId: matchedCandidate.branch_id,
      employeeId,
      deviceId,
      eventType: determinedAction,
      matchScore: recognition.similarity,
      livenessScore: recognition.liveness?.confidence,
      qualityScore: recognition.quality?.blur_score,
      result: locationStatus === "OUT_OF_LOCATION" ? "OUT_OF_LOCATION" : "SUCCESS",
      latitude,
      longitude,
      distanceM: locationDistanceMeters,
      locationVerified,
      latencyMs: elapsed,
      remarks: `${determinedAction} recorded (InsightFace 512-D: ${(recognition.similarity * 100).toFixed(1)}% match; Location: ${locationStatus})`,
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
      decisions: {
        identity: {
          verified: true,
          engine: "InsightFace ArcFace 512-D",
          similarity: recognition.similarity,
          threshold: settings.match_threshold,
          liveness: recognition.liveness?.confidence,
        },
        location: {
          status: locationStatus,
          verified: locationVerified === 1,
          distance_meters: locationDistanceMeters,
          nearest_location: matchedLocation?.location_name || null,
          allowed_radius: matchedLocation?.geofence_radius || settings.default_geofence_radius,
          violation: locationViolationReason,
        },
        attendance: {
          status: attStatus,
          approval: approvalStatus,
          late_minutes: lateMinutes,
        },
      },
      clock_time: nowTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      date: todayStr,
      message:
        locationStatus === "OUT_OF_LOCATION"
          ? `${determinedAction === "CLOCK_IN" ? "Clock-in recorded" : "Clock-out recorded"} with location warning (${locationViolationReason}). Flagged for review.`
          : `${determinedAction === "CLOCK_IN" ? "Clock-in successful" : "Clock-out successful"}! Have a great day, ${matchedCandidate.name}.`,
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
      `SELECT d.*, b.name as branch_name, l.location_name 
       FROM hr_biometric_devices d
       LEFT JOIN adm_branches b ON b.id = d.branch_id
       LEFT JOIN hr_locations l ON l.id = d.location_id
       WHERE (d.company_id = :companyId OR d.company_id = 1) ORDER BY d.id DESC`,
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
    const { device_name, device_type = "KIOSK", branch_id = null, location_id = null } = req.body;

    if (!device_name) throw httpError(400, "BAD_REQUEST", "device_name is required");

    const device_code = "DEV-" + crypto.randomBytes(3).toString("hex").toUpperCase();
    const api_key = "kiosk_" + crypto.randomBytes(24).toString("hex");

    const result = await query(
      `INSERT INTO hr_biometric_devices (company_id, branch_id, location_id, device_name, device_code, api_key, device_type, created_by)
       VALUES (:companyId, :branchId, :locationId, :deviceName, :deviceCode, :apiKey, :deviceType, :userId)`,
      {
        companyId,
        branchId: branch_id || null,
        locationId: location_id || null,
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
    await query(`DELETE FROM hr_biometric_devices WHERE id = :id AND (company_id = :companyId OR company_id = 1)`, { id, companyId });
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
      match_threshold = 0.450,
      liveness_threshold = 0.650,
      min_face_size = 100,
      allow_multi_frame = 1,
      require_liveness = 0,
      clock_in_grace_minutes = 15,
      auto_detect_in_out = 1,
      prevent_duplicate_window_mins = 5,
      enforce_geofence = 1,
      geofence_policy = "FLAG_AND_NOTIFY",
      default_geofence_radius = 150,
      alert_email_enabled = 1,
      alert_sms_enabled = 0,
      alert_recipients = "admin@omnisuite.com",
    } = req.body;

    await query(
      `INSERT INTO hr_biometric_settings
        (company_id, match_threshold, liveness_threshold, min_face_size, allow_multi_frame, require_liveness, clock_in_grace_minutes, auto_detect_in_out, prevent_duplicate_window_mins, enforce_geofence, geofence_policy, default_geofence_radius, alert_email_enabled, alert_sms_enabled, alert_recipients)
       VALUES
        (:companyId, :match_threshold, :liveness_threshold, :min_face_size, :allow_multi_frame, :require_liveness, :clock_in_grace_minutes, :auto_detect_in_out, :prevent_duplicate_window_mins, :enforce_geofence, :geofence_policy, :default_geofence_radius, :alert_email_enabled, :alert_sms_enabled, :alert_recipients)
       ON DUPLICATE KEY UPDATE
        match_threshold = VALUES(match_threshold),
        liveness_threshold = VALUES(liveness_threshold),
        min_face_size = VALUES(min_face_size),
        allow_multi_frame = VALUES(allow_multi_frame),
        require_liveness = VALUES(require_liveness),
        clock_in_grace_minutes = VALUES(clock_in_grace_minutes),
        auto_detect_in_out = VALUES(auto_detect_in_out),
        prevent_duplicate_window_mins = VALUES(prevent_duplicate_window_mins),
        enforce_geofence = VALUES(enforce_geofence),
        geofence_policy = VALUES(geofence_policy),
        default_geofence_radius = VALUES(default_geofence_radius),
        alert_email_enabled = VALUES(alert_email_enabled),
        alert_sms_enabled = VALUES(alert_sms_enabled),
        alert_recipients = VALUES(alert_recipients)`,
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
        enforce_geofence: enforce_geofence ? 1 : 0,
        geofence_policy,
        default_geofence_radius,
        alert_email_enabled: alert_email_enabled ? 1 : 0,
        alert_sms_enabled: alert_sms_enabled ? 1 : 0,
        alert_recipients,
      }
    );

    res.json({ success: true, message: "Biometric & location security settings saved successfully." });
  } catch (err) {
    next(err);
  }
}

/**
 * Acceptable Work Locations API (Used in General Setup Page)
 */
export async function listLocations(req, res, next) {
  try {
    await ensureBiometricTables();
    const companyId = req.scope?.companyId || 1;
    const items = await query(
      `SELECT l.*, b.name as branch_name 
       FROM hr_locations l
       LEFT JOIN adm_branches b ON b.id = l.branch_id
       WHERE (l.company_id = :companyId OR l.company_id IS NULL OR l.company_id = 1)
       ORDER BY l.location_name ASC`,
      { companyId }
    );
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

export async function saveLocation(req, res, next) {
  try {
    await ensureBiometricTables();
    const { companyId = 1, userId = null } = req.scope || {};
    const {
      id,
      location_name,
      code = null,
      address = null,
      latitude = null,
      longitude = null,
      geofence_radius = 150,
      facility_type = "OFFICE",
      branch_id = null,
      is_active = 1,
    } = req.body;

    if (!location_name) throw httpError(400, "BAD_REQUEST", "location_name is required");

    if (id) {
      await query(
        `UPDATE hr_locations SET 
          location_name = :location_name,
          code = :code,
          address = :address,
          latitude = :latitude,
          longitude = :longitude,
          geofence_radius = :geofence_radius,
          facility_type = :facility_type,
          branch_id = :branch_id,
          is_active = :is_active,
          updated_by = :userId
         WHERE id = :id AND (company_id = :companyId OR company_id IS NULL OR company_id = 1)`,
        {
          id,
          companyId,
          location_name,
          code,
          address,
          latitude: latitude !== "" && latitude != null ? Number(latitude) : null,
          longitude: longitude !== "" && longitude != null ? Number(longitude) : null,
          geofence_radius: Number(geofence_radius) || 150,
          facility_type,
          branch_id: branch_id || null,
          is_active: is_active === false || is_active === 0 ? 0 : 1,
          userId,
        }
      );
    } else {
      await query(
        `INSERT INTO hr_locations 
          (company_id, branch_id, location_name, code, address, latitude, longitude, geofence_radius, facility_type, is_active, created_by)
         VALUES 
          (:companyId, :branch_id, :location_name, :code, :address, :latitude, :longitude, :geofence_radius, :facility_type, :is_active, :userId)`,
        {
          companyId,
          branch_id: branch_id || null,
          location_name,
          code,
          address,
          latitude: latitude !== "" && latitude != null ? Number(latitude) : null,
          longitude: longitude !== "" && longitude != null ? Number(longitude) : null,
          geofence_radius: Number(geofence_radius) || 150,
          facility_type,
          is_active: is_active === false || is_active === 0 ? 0 : 1,
          userId,
        }
      );
    }

    res.json({ success: true, message: "Authorized work location saved successfully." });
  } catch (err) {
    next(err);
  }
}

export async function deleteLocation(req, res, next) {
  try {
    await ensureBiometricTables();
    const { companyId = 1 } = req.scope || {};
    const { id } = req.params;
    await query(
      `DELETE FROM hr_locations WHERE id = :id AND (company_id = :companyId OR company_id IS NULL OR company_id = 1)`,
      { id, companyId }
    );
    res.json({ success: true, message: "Location deleted." });
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
      `SELECT COUNT(*) as total FROM hr_employees WHERE (company_id = :companyId OR company_id = 1) AND status = 'ACTIVE' AND deleted_at IS NULL`,
      { companyId }
    );
    const [enrolledTotal] = await query(
      `SELECT COUNT(DISTINCT employee_id) as enrolled FROM hr_biometric_templates WHERE (company_id = :companyId OR company_id = 1) AND is_active = 1`,
      { companyId }
    );
    const [todayFaceAtt] = await query(
      `SELECT COUNT(*) as face_count FROM hr_attendance 
       WHERE (company_id = :companyId OR company_id = 1) AND attendance_date = CURDATE() AND face_verified = 1`,
      { companyId }
    );
    const [spoofsDetected] = await query(
      `SELECT COUNT(*) as spoofs FROM hr_biometric_logs 
       WHERE (company_id = :companyId OR company_id = 1) AND result = 'FAILED_LIVENESS' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      { companyId }
    );
    const [geofenceViolations] = await query(
      `SELECT COUNT(*) as violations FROM hr_biometric_logs 
       WHERE (company_id = :companyId OR company_id = 1) AND result = 'OUT_OF_LOCATION' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      { companyId }
    );

    const recentLogs = await query(
      `SELECT l.*, CONCAT(e.first_name, ' ', e.last_name) as employee_name, e.emp_code
       FROM hr_biometric_logs l
       LEFT JOIN hr_employees e ON e.id = l.employee_id
       WHERE (l.company_id = :companyId OR l.company_id = 1) ORDER BY l.id DESC LIMIT 20`,
      { companyId }
    );

    res.json({
      metrics: {
        total_employees: empTotal.total || 0,
        enrolled_employees: enrolledTotal.enrolled || 0,
        enrollment_rate: empTotal.total > 0 ? Math.round((enrolledTotal.enrolled / empTotal.total) * 100) : 0,
        today_biometric_attendances: todayFaceAtt.face_count || 0,
        spoof_attempts_blocked_30d: spoofsDetected.spoofs || 0,
        geofence_violations_30d: geofenceViolations.violations || 0,
      },
      recent_logs: recentLogs,
    });
  } catch (err) {
    next(err);
  }
}
