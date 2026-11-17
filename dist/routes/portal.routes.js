import express from "express";
import { requirePortalAuth } from "../middleware/portalAuth.js";
import * as portalCtrl from "../controllers/portal.controller.js";

const router = express.Router();

// ----------------------------------------------------------------------------
// PUBLIC PORTAL AUTHENTICATION
// ----------------------------------------------------------------------------
router.post("/auth/login", portalCtrl.portalLogin);
router.post("/auth/forgot-password/request-otp", portalCtrl.portalRequestResetOtp);
router.post("/auth/forgot-password/reset", portalCtrl.portalResetPassword);
router.post("/auth/logout", portalCtrl.portalLogout);

// ----------------------------------------------------------------------------
// PROTECTED PORTAL ENDPOINTS (Guarded by requirePortalAuth)
// ----------------------------------------------------------------------------
router.get("/auth/me", requirePortalAuth, portalCtrl.getPortalMe);
router.post("/auth/change-password", requirePortalAuth, portalCtrl.portalChangePassword);

// Dashboard Command Center
router.get("/dashboard/overview", requirePortalAuth, portalCtrl.getDashboardOverview);

// Attendance
router.get("/attendance/today", requirePortalAuth, portalCtrl.getDashboardOverview);
router.get("/attendance/trends", requirePortalAuth, portalCtrl.getAttendanceTrends);
router.get("/attendance/history", requirePortalAuth, portalCtrl.getAttendanceHistory);
router.post("/attendance/clock-in", requirePortalAuth, portalCtrl.clockIn);
router.post("/attendance/clock-out", requirePortalAuth, portalCtrl.clockOut);

// Leave
router.get("/leave/balances", requirePortalAuth, portalCtrl.getLeaveBalances);
router.post("/leave/apply", requirePortalAuth, portalCtrl.applyLeave);
router.post("/leave/cancel/:id", requirePortalAuth, portalCtrl.cancelLeave);

// Compensation & Benefits (Payroll, Salary, Loans)
router.get("/compensation/summary", requirePortalAuth, portalCtrl.getCompensationSummary);
router.get("/compensation/payslips/:id", requirePortalAuth, portalCtrl.getPayslipDetail);
router.post("/compensation/loans/apply", requirePortalAuth, portalCtrl.applyLoan);

// Policies, Documents & Training
router.get("/policies", requirePortalAuth, portalCtrl.getPolicies);
router.post("/policies/acknowledge", requirePortalAuth, portalCtrl.acknowledgePolicy);
router.get("/documents", requirePortalAuth, portalCtrl.getDocuments);
router.get("/training", requirePortalAuth, portalCtrl.getTraining);

// Requests & Notifications
router.get("/requests", requirePortalAuth, portalCtrl.getRequests);
router.post("/requests", requirePortalAuth, portalCtrl.submitRequest);
router.put("/profile/update", requirePortalAuth, portalCtrl.updateProfile);
router.get("/preferences/notifications", requirePortalAuth, portalCtrl.getNotificationPreferences);
router.put("/preferences/notifications", requirePortalAuth, portalCtrl.updateNotificationPreferences);

// External Widgets Proxy (Cached & Resilient)
router.get("/widgets/weather", portalCtrl.getWeather);
router.get("/widgets/news", portalCtrl.getNews);

export default router;