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
  addTripLocation, getTripLocations, submitPOD
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

export default router;
