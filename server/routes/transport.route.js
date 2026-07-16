/**
 * @file transport.route.js
 * @description Routes for the Transport Module
 */
import express from "express";
import { requireAuth, requireCompanyScope } from "../middleware/auth.js";
import { requirePermission } from "../middleware/requirePermission.js";
import {
  listTransportationBills, getTransportationBill, createTransportationBill, updateTransportationBill, deleteTransportationBill, getNextTransportationBillNo
} from "../controllers/transport.controller.js";
import {
  listFuelBills, getFuelBill, createFuelBill, updateFuelBill, deleteFuelBill,
  getNextBillingNo,
  getBilling, createBilling, updateBilling, deleteBilling, submitBilling,
  getTransportDashboardStats,
  listVehicles, createVehicle,
  listDrivers, createDriver,
  listRequests, createRequest, updateRequestStatus,
  listTrips, createTrip, returnTrip,
  listFuelLogs, createFuelLog,
  listFuelExpenses, createFuelExpense,
  listBilling,
  addTripLocation, getTripLocations, submitPOD,
  listBreakdowns, createBreakdown,
  listTransportIncome, createTransportIncome, updateTransportIncome, deleteTransportIncome, updateTransportIncomeVoucherId,
  listTransportExpenses, createTransportExpense, updateTransportExpense, deleteTransportExpense, updateTransportExpenseVoucherId,
  listExpenseLogs, createExpenseLog, updateExpenseLog, deleteExpenseLog, updateExpenseLogVoucherId
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
router.put("/requests/:id/status", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.REQUESTS.VIEW"), updateRequestStatus);

// Trips
router.get("/trips", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.TRIPS.VIEW"), listTrips);
router.post("/trips", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.TRIPS.CREATE"), createTrip);
router.put("/trips/:id/return", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.TRIPS.EDIT"), returnTrip);

// Fuel Logs
router.get("/fuel", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.FUEL.VIEW"), listFuelLogs);
router.post("/fuel", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.FUEL.CREATE"), createFuelLog);

// Billing
router.get("/billing/next-no", requireAuth, requireCompanyScope, getNextBillingNo);
router.get("/billing", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BILLING.VIEW"), listBilling);
router.get("/billing/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BILLING.VIEW"), getBilling);
router.post("/billing", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BILLING.MANAGE"), createBilling);
router.put("/billing/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BILLING.MANAGE"), updateBilling);
router.delete("/billing/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BILLING.MANAGE"), deleteBilling);
router.post("/billing/:id/submit", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BILLING.MANAGE"), submitBilling);

// Transportation Bills
router.get("/transportation-bills/next-no", requireAuth, requireCompanyScope, getNextTransportationBillNo);
router.get("/transportation-bills", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BILLS.VIEW"), listTransportationBills);
router.get("/transportation-bills/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BILLS.VIEW"), getTransportationBill);
router.post("/transportation-bills", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BILLS.MANAGE"), createTransportationBill);
router.put("/transportation-bills/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BILLS.MANAGE"), updateTransportationBill);
router.delete("/transportation-bills/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.BILLS.MANAGE"), deleteTransportationBill);

// Fuel Bills
router.get("/fuel-bills", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.FUEL.VIEW"), listFuelBills);
router.get("/fuel-bills/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.FUEL.VIEW"), getFuelBill);
router.post("/fuel-bills", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.FUEL.MANAGE"), createFuelBill);
router.put("/fuel-bills/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.FUEL.MANAGE"), updateFuelBill);
router.delete("/fuel-bills/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.FUEL.MANAGE"), deleteFuelBill);


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
// Expense Logs
router.get("/expense-logs", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.EXPENSE_LOG.VIEW"), listExpenseLogs);
router.post("/expense-logs", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.EXPENSE_LOG.CREATE"), createExpenseLog);
router.put("/expense-logs/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.EXPENSE_LOG.EDIT"), updateExpenseLog);
router.delete("/expense-logs/:id", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.EXPENSE_LOG.DELETE"), deleteExpenseLog);
router.put("/expense-logs/:id/voucher", requireAuth, requireCompanyScope, updateExpenseLogVoucherId);

export default router;

// Fuel Expenses
router.get("/fuel-expenses", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.FUEL_EXPENSES.VIEW"), listFuelExpenses);
router.post("/fuel-expenses", requireAuth, requireCompanyScope, requirePermission("TRANSPORT.FUEL_EXPENSES.CREATE"), createFuelExpense);
