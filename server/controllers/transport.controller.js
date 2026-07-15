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
    const { reg_number, vehicle_type, make, model, year_of_manufacture, capacity, capacity_unit, current_odometer, insurance_expiry } = req.body;
    
    if (!reg_number || !vehicle_type) {
      throw httpError(400, "VALIDATION_ERROR", "Registration number and type are required");
    }

    const result = await query(
      `INSERT INTO trans_vehicles (company_id, branch_id, reg_number, vehicle_type, make, model, year_of_manufacture, capacity, capacity_unit, current_odometer, insurance_expiry, created_by) 
       VALUES (:companyId, :branchId, :reg_number, :vehicle_type, :make, :model, :year_of_manufacture, :capacity, :capacity_unit, :current_odometer, :insurance_expiry, :userId)`,
      {
        companyId, branchId, reg_number, vehicle_type, make, model, capacity, capacity_unit,
        year_of_manufacture: year_of_manufacture || null,
        insurance_expiry: insurance_expiry || null,
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
      SELECT d.*, IFNULL(d.employee_name, CONCAT(e.first_name, ' ', e.last_name)) as employee_name, e.employee_code, e.first_name, e.last_name 
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
    const { employee_name, license_number, license_type, license_expiry } = req.body;
    
    if (!employee_name || !license_number) {
      throw httpError(400, "VALIDATION_ERROR", "Employee Name and License number are required");
    }

    const result = await query(
      `INSERT INTO trans_drivers (company_id, branch_id, employee_name, license_number, license_type, license_expiry, created_by) 
       VALUES (:companyId, :branchId, :employee_name, :license_number, :license_type, :license_expiry, :userId)`,
      {
        companyId, branchId, employee_name, license_number, license_type, license_expiry,
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
    const { customer_id, vehicle_id, requester_name, request_date, required_date, return_date, required_time, return_time, no_of_days, no_of_hours, origin, destination, purpose_of_journey } = req.body;
    
    const request_number = "REQ-" + Date.now();

    const result = await query(
      `INSERT INTO trans_requests (company_id, branch_id, request_number, customer_id, vehicle_id, requester_name, request_date, required_date, return_date, required_time, return_time, no_of_days, no_of_hours, origin, destination, purpose_of_journey, created_by) 
       VALUES (:companyId, :branchId, :request_number, :customer_id, :vehicle_id, :requester_name, :request_date, :required_date, :return_date, :required_time, :return_time, :no_of_days, :no_of_hours, :origin, :destination, :purpose_of_journey, :userId)`,
      {
        companyId, branchId, request_number, customer_id, request_date, required_date, origin, destination, 
        purpose_of_journey, requester_name, return_date, required_time, return_time, no_of_days, no_of_hours,
        vehicle_id: vehicle_id || null,
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

// === BREAKDOWNS ===
export const listBreakdowns = async (req, res, next) => {
  try {
    const { companyId } = req.scope;
    const items = await query(`
      SELECT b.*, v.reg_number, v.make, v.model 
      FROM trans_breakdowns b
      LEFT JOIN trans_vehicles v ON b.vehicle_id = v.id
      WHERE b.company_id = :companyId ORDER BY b.id DESC`,
      { companyId }
    );
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
};

export const createBreakdown = async (req, res, next) => {
  try {
    const { companyId, branchIdStr } = req.scope;
    const branchId = toNumber(branchIdStr) || 1;
    const { 
      defect_date, breakdown_time, driver_name, vehicle_id, 
      fuel_level, details, odometer_reading, reported_by, remarks 
    } = req.body;
    
    if (!defect_date || !breakdown_time) {
      throw httpError(400, "VALIDATION_ERROR", "Defect date and breakdown time are required");
    }

    const result = await query(
      `INSERT INTO trans_breakdowns (
         company_id, branch_id, defect_date, breakdown_time, driver_name, 
         vehicle_id, fuel_level, details, odometer_reading, reported_by, remarks, created_by
       ) 
       VALUES (
         :companyId, :branchId, :defect_date, :breakdown_time, :driver_name, 
         :vehicle_id, :fuel_level, :details, :odometer_reading, :reported_by, :remarks, :userId
       )`,
      {
        companyId, branchId, defect_date, breakdown_time, 
        driver_name: driver_name || null,
        vehicle_id: vehicle_id || null,
        fuel_level: fuel_level || null,
        details: details || null,
        odometer_reading: odometer_reading || null,
        reported_by: reported_by || null,
        remarks: remarks || null,
        userId: req.user?.id || null
      }
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
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

// ===== INCOME =====
export const listTransportIncome = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    let sql = `SELECT i.*, v.reg_number AS vehicle_reg, t.trip_number AS trip_no, u.username AS created_by_name,
      c_cust.customer_name, cc.name AS cost_center_name,
      CASE 
        WHEN fv.status IN ('DRAFT', 'SUBMITTED') THEN 'PENDING'
        WHEN fv.status IS NOT NULL THEN fv.status
        ELSE i.status 
      END AS status
      FROM trn_transport_income i
      LEFT JOIN trans_vehicles v ON i.vehicle_id = v.id
      LEFT JOIN trans_trips t ON i.trip_id = t.id
      LEFT JOIN adm_users u ON i.recorded_by = u.username
      LEFT JOIN sal_customers c_cust ON i.customer_id = c_cust.id
      LEFT JOIN fin_cost_centers cc ON i.cost_center_id = cc.id
      LEFT JOIN fin_vouchers fv ON i.voucher_id = fv.id
      WHERE i.company_id = :companyId
      ORDER BY i.income_date DESC`;
    const rows = await query(sql, { companyId });
    res.json({ items: rows });
  } catch (err) { next(err); }
};

export const createTransportIncome = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const b = req.body;
    if (!b.amount) throw httpError(400, "VALIDATION_ERROR", "amount required");
    const r = await query(`INSERT INTO trn_transport_income (company_id, branch_id, trip_id, vehicle_id, income_date, category, amount, currency, description, recorded_by, status, customer_id, payment_method, payment_account_id, is_tax_included, tax_code_id, reference_no, cheque_date, cost_center_id)
      VALUES (:companyId, :branchId, :tripId, :vehicleId, :incomeDate, :category, :amount, :currency, :description, :recordedBy, :status, :customerId, :paymentMethod, :paymentAccountId, :isTaxIncluded, :taxCodeId, :referenceNo, :chequeDate, :costCenterId)`, {
      companyId, branchId,
      tripId: toNumber(b.trip_id) || null,
      vehicleId: toNumber(b.vehicle_id) || null,
      incomeDate: b.income_date || new Date().toISOString().split('T')[0],
      category: b.category || 'OTHER',
      amount: Number(b.amount || 0),
      currency: b.currency || 'GHS',
      description: b.description || null,
      recordedBy: req.user?.username || null,
      status: b.status || 'PENDING',
      customerId: toNumber(b.customer_id) || null,
      paymentMethod: b.payment_method || null,
      paymentAccountId: toNumber(b.payment_account_id) || null,
      isTaxIncluded: b.is_tax_included ? 1 : 0,
      taxCodeId: toNumber(b.tax_code_id) || null,
      referenceNo: b.reference_no || null,
      chequeDate: b.cheque_date || null,
      costCenterId: toNumber(b.cost_center_id) || null,
    });
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
};

export const updateTransportIncome = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    const b = req.body;
    await query(`UPDATE trn_transport_income SET
      trip_id = :tripId, vehicle_id = :vehicleId, income_date = :incomeDate, category = :category, amount = :amount, currency = :currency,
      description = :description, status = :status, customer_id = :customerId, payment_method = :paymentMethod,
      payment_account_id = :paymentAccountId, is_tax_included = :isTaxIncluded, tax_code_id = :taxCodeId,
      reference_no = :referenceNo, cheque_date = :chequeDate, cost_center_id = :costCenterId
      WHERE id = :id AND company_id = :companyId`, {
      id, companyId,
      tripId: toNumber(b.trip_id) || null,
      vehicleId: toNumber(b.vehicle_id) || null,
      incomeDate: b.income_date || new Date().toISOString().split('T')[0],
      category: b.category || 'OTHER',
      amount: Number(b.amount || 0),
      currency: b.currency || 'GHS',
      description: b.description || null,
      status: b.status || 'PENDING',
      customerId: toNumber(b.customer_id) || null,
      paymentMethod: b.payment_method || null,
      paymentAccountId: toNumber(b.payment_account_id) || null,
      isTaxIncluded: b.is_tax_included ? 1 : 0,
      taxCodeId: toNumber(b.tax_code_id) || null,
      referenceNo: b.reference_no || null,
      chequeDate: b.cheque_date || null,
      costCenterId: toNumber(b.cost_center_id) || null,
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

export const deleteTransportIncome = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    await query(`DELETE FROM trn_transport_income WHERE id = :id AND company_id = :companyId`, { id, companyId });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

export const updateTransportIncomeVoucherId = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    const voucherId = toNumber(req.body.voucher_id);
    if (!id || !voucherId) throw httpError(400, "VALIDATION_ERROR", "Invalid id or voucher_id");
    await query(`UPDATE trn_transport_income SET voucher_id = :voucherId WHERE id = :id AND company_id = :companyId`, { id, voucherId, companyId });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// ===== EXPENSES =====
export const listTransportExpenses = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    let sql = `SELECT i.*, v.reg_number AS vehicle_reg, t.trip_number AS trip_no, u.username AS created_by_name,
      s.supplier_name, cc.name AS cost_center_name,
      CASE 
        WHEN fv.status IN ('DRAFT', 'SUBMITTED') THEN 'PENDING'
        WHEN fv.status IS NOT NULL THEN fv.status
        ELSE i.status 
      END AS status
      FROM trn_transport_expenses i
      LEFT JOIN trans_vehicles v ON i.vehicle_id = v.id
      LEFT JOIN trans_trips t ON i.trip_id = t.id
      LEFT JOIN adm_users u ON i.recorded_by = u.username
      LEFT JOIN pur_suppliers s ON i.supplier_id = s.id
      LEFT JOIN fin_cost_centers cc ON i.cost_center_id = cc.id
      LEFT JOIN fin_vouchers fv ON i.voucher_id = fv.id
      WHERE i.company_id = :companyId
      ORDER BY i.expense_date DESC`;
    const rows = await query(sql, { companyId });
    res.json({ items: rows });
  } catch (err) { next(err); }
};

export const createTransportExpense = async (req, res, next) => {
  try {
    const { companyId, branchId = null } = req.scope || {};
    const b = req.body;
    if (!b.amount) throw httpError(400, "VALIDATION_ERROR", "amount required");
    const r = await query(`INSERT INTO trn_transport_expenses (company_id, branch_id, trip_id, vehicle_id, expense_date, category, amount, currency, description, recorded_by, status, supplier_id, payment_method, payment_account_id, is_tax_included, tax_code_id, reference_no, cheque_date, cost_center_id)
      VALUES (:companyId, :branchId, :tripId, :vehicleId, :expenseDate, :category, :amount, :currency, :description, :recordedBy, :status, :supplierId, :paymentMethod, :paymentAccountId, :isTaxIncluded, :taxCodeId, :referenceNo, :chequeDate, :costCenterId)`, {
      companyId, branchId,
      tripId: toNumber(b.trip_id) || null,
      vehicleId: toNumber(b.vehicle_id) || null,
      expenseDate: b.expense_date || new Date().toISOString().split('T')[0],
      category: b.category || 'OTHER',
      amount: Number(b.amount || 0),
      currency: b.currency || 'GHS',
      description: b.description || null,
      recordedBy: req.user?.username || null,
      status: b.status || 'PENDING',
      supplierId: toNumber(b.supplier_id) || null,
      paymentMethod: b.payment_method || null,
      paymentAccountId: toNumber(b.payment_account_id) || null,
      isTaxIncluded: b.is_tax_included ? 1 : 0,
      taxCodeId: toNumber(b.tax_code_id) || null,
      referenceNo: b.reference_no || null,
      chequeDate: b.cheque_date || null,
      costCenterId: toNumber(b.cost_center_id) || null,
    });
    res.status(201).json({ id: r.insertId });
  } catch (err) { next(err); }
};

export const updateTransportExpense = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    const b = req.body;
    await query(`UPDATE trn_transport_expenses SET
      trip_id = :tripId, vehicle_id = :vehicleId, expense_date = :expenseDate, category = :category, amount = :amount, currency = :currency,
      description = :description, status = :status, supplier_id = :supplierId, payment_method = :paymentMethod,
      payment_account_id = :paymentAccountId, is_tax_included = :isTaxIncluded, tax_code_id = :taxCodeId,
      reference_no = :referenceNo, cheque_date = :chequeDate, cost_center_id = :costCenterId
      WHERE id = :id AND company_id = :companyId`, {
      id, companyId,
      tripId: toNumber(b.trip_id) || null,
      vehicleId: toNumber(b.vehicle_id) || null,
      expenseDate: b.expense_date || new Date().toISOString().split('T')[0],
      category: b.category || 'OTHER',
      amount: Number(b.amount || 0),
      currency: b.currency || 'GHS',
      description: b.description || null,
      status: b.status || 'PENDING',
      supplierId: toNumber(b.supplier_id) || null,
      paymentMethod: b.payment_method || null,
      paymentAccountId: toNumber(b.payment_account_id) || null,
      isTaxIncluded: b.is_tax_included ? 1 : 0,
      taxCodeId: toNumber(b.tax_code_id) || null,
      referenceNo: b.reference_no || null,
      chequeDate: b.cheque_date || null,
      costCenterId: toNumber(b.cost_center_id) || null,
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

export const deleteTransportExpense = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    await query(`DELETE FROM trn_transport_expenses WHERE id = :id AND company_id = :companyId`, { id, companyId });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

export const updateTransportExpenseVoucherId = async (req, res, next) => {
  try {
    const { companyId } = req.scope || {};
    const id = toNumber(req.params.id);
    const voucherId = toNumber(req.body.voucher_id);
    if (!id || !voucherId) throw httpError(400, "VALIDATION_ERROR", "Invalid id or voucher_id");
    await query(`UPDATE trn_transport_expenses SET voucher_id = :voucherId WHERE id = :id AND company_id = :companyId`, { id, voucherId, companyId });
    res.json({ ok: true });
  } catch (err) { next(err); }
};
