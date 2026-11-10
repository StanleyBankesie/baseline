import express from "express";
import { requireAuth, requireCompanyScope } from "../middleware/auth.js";
import * as biometricController from "../controllers/biometric.controller.js";

const router = express.Router();

// Public / kiosk health check
router.get("/health", biometricController.getServiceStatus);

// Biometric enrollment (Admin / HR authenticated)
router.post(
  "/enroll",
  requireAuth,
  requireCompanyScope,
  biometricController.enrollFace
);

// Delete employee biometric template (Right to erasure)
router.delete(
  "/employees/:id",
  requireAuth,
  requireCompanyScope,
  biometricController.removeEmployeeBiometrics
);

// Biometric Clock In / Clock Out (Supports both logged-in users and kiosk hardware keys)
router.post(
  "/clock",
  (req, res, next) => {
    // If device header is present, bypass standard user session auth for kiosk terminal
    if (req.headers["x-device-key"] || req.headers["x-device-code"] || req.body.device_key || req.body.device_code) {
      return next();
    }
    return requireAuth(req, res, (err) => {
      if (err) return next(err);
      return requireCompanyScope(req, res, next);
    });
  },
  biometricController.biometricClockInOut
);

// Biometric Devices
router.get(
  "/devices",
  requireAuth,
  requireCompanyScope,
  biometricController.listDevices
);
router.post(
  "/devices",
  requireAuth,
  requireCompanyScope,
  biometricController.createDevice
);
router.delete(
  "/devices/:id",
  requireAuth,
  requireCompanyScope,
  biometricController.deleteDevice
);

// Biometric Configuration & Settings
router.get(
  "/settings",
  requireAuth,
  requireCompanyScope,
  biometricController.getSettings
);
router.post(
  "/settings",
  requireAuth,
  requireCompanyScope,
  biometricController.updateSettings
);

// Biometric Analytics & Audit Logs
router.get(
  "/analytics",
  requireAuth,
  requireCompanyScope,
  biometricController.getAnalytics
);

export default router;
