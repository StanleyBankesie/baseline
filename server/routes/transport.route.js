/**
 * @file transport.route.js
 * @description Routes for the Transport Module
 */
import express from "express";
import { requireAuth, requireCompanyScope } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  getTransportDashboardStats,
  listVehicles, createVehicle,
  listDrivers, createDriver,
  listRequests, createRequest,
  listTrips, createTrip,
  listFuelLogs, createFuelLog,
  listBilling,
  addTripLocation, getTripLocations, submitPOD,
  listBreakdowns, createBreakdown,
  listTransportIncome, createTransportIncome, updateTransportIncome, deleteTransportIncome, updateTransportIncomeVoucherId,
  listTransportExpenses, createTransportExpense, updateTransportExpense, deleteTransportExpense, updateTransportExpenseVoucherId
} from "../controllers/transport.controller.js";

const router = express.Router();

// Dashboard
router.get("/dashboard", requireAuth, requireCompanyScope, getTransportDashboardStats);

// Vehicles
router.get("/vehicles", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.VEHICLES.VIEW"), listVehicles);
router.post("/vehicles", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.VEHICLES.CREATE"), createVehicle);

// Drivers
router.get("/drivers", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.DRIVERS.VIEW"), listDrivers);
router.post("/drivers", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.DRIVERS.CREATE"), createDriver);

// Requests
router.get("/requests", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.REQUESTS.VIEW"), listRequests);
router.post("/requests", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.REQUESTS.CREATE"), createRequest);

// Trips
router.get("/trips", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.TRIPS.VIEW"), listTrips);
router.post("/trips", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.TRIPS.CREATE"), createTrip);

// Fuel Logs
router.get("/fuel", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.FUEL.VIEW"), listFuelLogs);
router.post("/fuel", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.FUEL.CREATE"), createFuelLog);

// Billing
router.get("/billing", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BILLING.VIEW"), listBilling);

// GPS & POD
router.post("/trips/:id/location", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.TRIPS.EDIT"), addTripLocation);
router.get("/trips/:id/locations", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.TRIPS.VIEW"), getTripLocations);
router.post("/trips/:id/pod", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.TRIPS.EDIT"), submitPOD);

// Breakdowns
router.get("/breakdowns", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BREAKDOWN-LOGBOOK.VIEW"), listBreakdowns);
router.post("/breakdowns", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BREAKDOWN-LOGBOOK.CREATE"), createBreakdown);

// Income
router.get("/income", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.INCOME.VIEW"), listTransportIncome);
router.post("/income", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.INCOME.CREATE"), createTransportIncome);
router.put("/income/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.INCOME.EDIT"), updateTransportIncome);
router.delete("/income/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.INCOME.DELETE"), deleteTransportIncome);
router.put("/income/:id/voucher", requireAuth, requireCompanyScope, updateTransportIncomeVoucherId);

// Expenses
router.get("/expenses", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.EXPENSES.VIEW"), listTransportExpenses);
router.post("/expenses", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.EXPENSES.CREATE"), createTransportExpense);
router.put("/expenses/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.EXPENSES.EDIT"), updateTransportExpense);
router.delete("/expenses/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.EXPENSES.DELETE"), deleteTransportExpense);
router.put("/expenses/:id/voucher", requireAuth, requireCompanyScope, updateTransportExpenseVoucherId);

export default router;
