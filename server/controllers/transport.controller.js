/**
 * @file transport.controller.js
 * @description Controller for the Transport Module, managing vehicles, drivers, trips, fuel, expenses, and billing.
 */
import { query } from "../db/pool.js";
import { httpError } from "../utils/httpError.js";
import { toNumber } from "../utils/dbUtils.js";

// === DASHBOARD STATS ===
export const getTransportDashboardStats = async (req, res, next) => {
  try {
    const { companyId } = req.scope;
    
    const [vehicles] = await query(
      "SELECT COUNT(*) as total FROM trans_vehicles WHERE company_id = :companyId AND is_active = 1",
      { companyId }
    );
    const [drivers] = await query(
      "SELECT COUNT(*) as total FROM trans_drivers WHERE company_id = :companyId AND is_active = 1",
      { companyId }
    );
    const [activeTrips] = await query(
      "SELECT COUNT(*) as total FROM trans_trips WHERE company_id = :companyId AND status IN ('SCHEDULED', 'IN_TRANSIT')",
      { companyId }
    );
    const [fuelCost] = await query(
      "SELECT COALESCE(SUM(total_cost), 0) as total FROM trans_fuel_logs WHERE company_id = :companyId",
      { companyId }
    );

    res.json({
      success: true,
      data: {
        totalVehicles: vehicles?.total || 0,
        totalDrivers: drivers?.total || 0,
        activeTrips: activeTrips?.total || 0,
        totalFuelCost: fuelCost?.total || 0
      }
    });
  } catch (err) {
    next(err);
  }
};

// === VEHICLES ===
export const listVehicles = async (req, res, next) => {
  try {
    const { companyId } = req.scope;
    const items = await query(
      "SELECT * FROM trans_vehicles WHERE company_id = :companyId ORDER BY id DESC",
      { companyId }
    );
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
};

export const createVehicle = async (req, res, next) => {
  try {
    const { companyId, branchIdStr } = req.scope;
    const branchId = toNumber(branchIdStr) || 1;
    const { reg_number, vehicle_type, make, model, capacity, current_odometer } = req.body;
    
    if (!reg_number || !vehicle_type) {
      throw httpError(400, "VALIDATION_ERROR", "Registration number and type are required");
    }

    const result = await query(
      `INSERT INTO trans_vehicles (company_id, branch_id, reg_number, vehicle_type, make, model, capacity, current_odometer, created_by) 
       VALUES (:companyId, :branchId, :reg_number, :vehicle_type, :make, :model, :capacity, :current_odometer, :userId)`,
      {
        companyId, branchId, reg_number, vehicle_type, make, model, capacity,
        current_odometer: current_odometer || 0,
        userId: req.user?.id || null
      }
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
};

// === DRIVERS ===
export const listDrivers = async (req, res, next) => {
  try {
    const { companyId } = req.scope;
    const items = await query(`
      SELECT d.*, e.employee_code, e.first_name, e.last_name 
      FROM trans_drivers d
      LEFT JOIN hr_employees e ON d.employee_id = e.id
      WHERE d.company_id = :companyId ORDER BY d.id DESC`,
      { companyId }
    );
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
};

export const createDriver = async (req, res, next) => {
  try {
    const { companyId, branchIdStr } = req.scope;
    const branchId = toNumber(branchIdStr) || 1;
    const { employee_id, license_number, license_type, license_expiry } = req.body;
    
    if (!employee_id || !license_number) {
      throw httpError(400, "VALIDATION_ERROR", "Employee ID and License number are required");
    }

    const result = await query(
      `INSERT INTO trans_drivers (company_id, branch_id, employee_id, license_number, license_type, license_expiry, created_by) 
       VALUES (:companyId, :branchId, :employee_id, :license_number, :license_type, :license_expiry, :userId)`,
      {
        companyId, branchId, employee_id, license_number, license_type, license_expiry,
        userId: req.user?.id || null
      }
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
};

// === REQUESTS ===
export const listRequests = async (req, res, next) => {
  try {
    const { companyId } = req.scope;
    const items = await query(
      "SELECT * FROM trans_requests WHERE company_id = :companyId ORDER BY id DESC",
      { companyId }
    );
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
};

export const createRequest = async (req, res, next) => {
  try {
    const { companyId, branchIdStr } = req.scope;
    const branchId = toNumber(branchIdStr) || 1;
    const { customer_id, request_date, required_date, origin, destination, cargo_description, weight } = req.body;
    
    const request_number = "REQ-" + Date.now();

    const result = await query(
      `INSERT INTO trans_requests (company_id, branch_id, request_number, customer_id, request_date, required_date, origin, destination, cargo_description, weight, created_by) 
       VALUES (:companyId, :branchId, :request_number, :customer_id, :request_date, :required_date, :origin, :destination, :cargo_description, :weight, :userId)`,
      {
        companyId, branchId, request_number, customer_id: customer_id || null, 
        request_date, required_date, origin, destination, cargo_description, weight,
        userId: req.user?.id || null
      }
    );
    res.status(201).json({ success: true, data: { id: result.insertId, request_number } });
  } catch (err) {
    next(err);
  }
};

// === TRIPS ===
export const listTrips = async (req, res, next) => {
  try {
    const { companyId } = req.scope;
    const items = await query(`
      SELECT t.*, v.reg_number, d.license_number
      FROM trans_trips t
      LEFT JOIN trans_vehicles v ON t.vehicle_id = v.id
      LEFT JOIN trans_drivers d ON t.driver_id = d.id
      WHERE t.company_id = :companyId ORDER BY t.id DESC`,
      { companyId }
    );
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
};

export const createTrip = async (req, res, next) => {
  try {
    const { companyId, branchIdStr } = req.scope;
    const branchId = toNumber(branchIdStr) || 1;
    const { request_id, vehicle_id, driver_id, start_time } = req.body;
    
    if (!vehicle_id || !driver_id) {
      throw httpError(400, "VALIDATION_ERROR", "Vehicle and Driver are required");
    }

    const trip_number = "TRP-" + Date.now();

    const result = await query(
      `INSERT INTO trans_trips (company_id, branch_id, trip_number, request_id, vehicle_id, driver_id, start_time, created_by) 
       VALUES (:companyId, :branchId, :trip_number, :request_id, :vehicle_id, :driver_id, :start_time, :userId)`,
      {
        companyId, branchId, trip_number, 
        request_id: request_id || null, vehicle_id, driver_id, start_time: start_time || null,
        userId: req.user?.id || null
      }
    );
    
    // Update vehicle and driver status
    await query("UPDATE trans_vehicles SET status = 'ON_TRIP' WHERE id = :vehicle_id", { vehicle_id });
    await query("UPDATE trans_drivers SET status = 'ON_TRIP' WHERE id = :driver_id", { driver_id });

    if (request_id) {
      await query("UPDATE trans_requests SET status = 'SCHEDULED' WHERE id = :request_id", { request_id });
    }

    res.status(201).json({ success: true, data: { id: result.insertId, trip_number } });
  } catch (err) {
    next(err);
  }
};

// === FUEL & EXPENSES ===
export const listFuelLogs = async (req, res, next) => {
  try {
    const { companyId } = req.scope;
    const items = await query(`
      SELECT f.*, v.reg_number 
      FROM trans_fuel_logs f
      LEFT JOIN trans_vehicles v ON f.vehicle_id = v.id
      WHERE f.company_id = :companyId ORDER BY f.id DESC`,
      { companyId }
    );
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
};

export const createFuelLog = async (req, res, next) => {
  try {
    const { companyId, branchIdStr } = req.scope;
    const branchId = toNumber(branchIdStr) || 1;
    const { vehicle_id, log_date, odometer_reading, fuel_quantity, cost_per_unit, total_cost } = req.body;
    
    const result = await query(
      `INSERT INTO trans_fuel_logs (company_id, branch_id, vehicle_id, log_date, odometer_reading, fuel_quantity, cost_per_unit, total_cost, created_by) 
       VALUES (:companyId, :branchId, :vehicle_id, :log_date, :odometer_reading, :fuel_quantity, :cost_per_unit, :total_cost, :userId)`,
      {
        companyId, branchId, vehicle_id, log_date, odometer_reading, fuel_quantity, cost_per_unit, total_cost,
        userId: req.user?.id || null
      }
    );
    
    // Update vehicle odometer
    await query("UPDATE trans_vehicles SET current_odometer = GREATEST(current_odometer, :odometer_reading) WHERE id = :vehicle_id", 
      { odometer_reading, vehicle_id });

    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    next(err);
  }
};

// === BILLING ===
export const listBilling = async (req, res, next) => {
  try {
    const { companyId } = req.scope;
    const items = await query(
      "SELECT * FROM trans_billing WHERE company_id = :companyId ORDER BY id DESC",
      { companyId }
    );
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
};

// === GPS & POD ===
export const addTripLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, speed, heading, accuracy, recorded_at } = req.body;
    await query(
      "INSERT INTO trans_trip_locations (trip_id, latitude, longitude, speed, heading, accuracy, recorded_at) VALUES (:id, :latitude, :longitude, :speed, :heading, :accuracy, :recorded_at)",
      { id, latitude, longitude, speed: speed || 0, heading: heading || 0, accuracy: accuracy || 0, recorded_at: recorded_at || new Date() }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const getTripLocations = async (req, res, next) => {
  try {
    const { id } = req.params;
    const locations = await query(
      "SELECT * FROM trans_trip_locations WHERE trip_id = :id ORDER BY recorded_at ASC",
      { id }
    );
    res.json({ success: true, data: { locations } });
  } catch (err) {
    next(err);
  }
};

export const submitPOD = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pod_signature_url, pod_photo_url, pod_notes } = req.body;
    await query(
      "UPDATE trans_trips SET status = 'COMPLETED', pod_signature_url = :pod_signature_url, pod_photo_url = :pod_photo_url, pod_notes = :pod_notes, pod_timestamp = NOW() WHERE id = :id",
      { id, pod_signature_url, pod_photo_url, pod_notes }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
