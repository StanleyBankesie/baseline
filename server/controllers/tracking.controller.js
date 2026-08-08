import { query } from "../db/pool.js";
import { checkGeofences } from "../services/geofence.service.js";
import { checkRouteAnomalies } from "../services/route-deviation.service.js";
import { getIO } from "../utils/socket.js";

// ── Auto-ensure trans_trip_locations has all needed columns ──
let _columnsEnsured = false;
const ensureColumns = async () => {
  if (_columnsEnsured) return;
  try {
    const alters = [
      'ALTER TABLE trans_trip_locations ADD COLUMN IF NOT EXISTS vehicle_id INT DEFAULT NULL AFTER trip_id',
      'ALTER TABLE trans_trip_locations ADD COLUMN IF NOT EXISTS driver_id INT DEFAULT NULL AFTER vehicle_id',
      'ALTER TABLE trans_trip_locations ADD COLUMN IF NOT EXISTS altitude DECIMAL(8, 2) DEFAULT NULL AFTER accuracy',
      'ALTER TABLE trans_trip_locations ADD COLUMN IF NOT EXISTS battery_level DECIMAL(5, 2) DEFAULT NULL AFTER altitude',
      'ALTER TABLE trans_trip_locations ADD COLUMN IF NOT EXISTS is_offline_point BOOLEAN DEFAULT FALSE AFTER battery_level',
    ];
    for (const sql of alters) {
      await query(sql).catch(() => {});
    }
    _columnsEnsured = true;
  } catch (e) {
    _columnsEnsured = true;
  }
};

// GET /tracking/live
export const getLiveTracking = async (req, res, next) => {
  try {
    await ensureColumns();
    const companyId = req.user?.companyId || req.user?.company_id || req.scope?.companyId || 1;
    // Get all active trips and their latest location from trans_trip_locations
    const sql = `
      SELECT 
        t.id as trip_id, t.trip_number, t.status, t.tracking_status,
        t.vehicle_id, v.reg_number as registration_number,
        t.driver_id, d.employee_name as driver_name,
        t.origin_name, t.destination_name, t.origin_lat, t.origin_lng, t.destination_lat, t.destination_lng,
        loc.latitude, loc.longitude, loc.heading, loc.speed, loc.recorded_at, loc.battery_level, loc.accuracy
      FROM trans_trips t
      LEFT JOIN trans_vehicles v ON t.vehicle_id = v.id
      LEFT JOIN trans_drivers d ON t.driver_id = d.id
      LEFT JOIN trans_trip_locations loc ON loc.id = (
          SELECT id FROM trans_trip_locations WHERE trip_id = t.id ORDER BY recorded_at DESC LIMIT 1
      )
      WHERE t.company_id = :companyId AND t.status IN ('SCHEDULED', 'IN_TRANSIT', 'STARTED')
    `;
    const activeTrips = await query(sql, { companyId });
    res.json({ success: true, data: activeTrips });
  } catch (error) {
    next(error);
  }
};

// GET /tracking/dashboard
export const getTrackingDashboard = async (req, res, next) => {
  try {
    await ensureColumns();
    const companyId = req.user?.companyId || req.user?.company_id || req.scope?.companyId || 1;
    
    const [stats] = await query(`
      SELECT 
        COUNT(DISTINCT v.id) as total_vehicles,
        SUM(CASE WHEN t.status IN ('IN_TRANSIT', 'STARTED') THEN 1 ELSE 0 END) as active_trips,
        SUM(CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_today,
        SUM(CASE WHEN t.status = 'DELAYED' THEN 1 ELSE 0 END) as delayed_trips
      FROM trans_vehicles v
      LEFT JOIN trans_trips t ON v.id = t.vehicle_id AND t.company_id = :companyId
      WHERE v.company_id = :companyId
    `, { companyId });

    // Count moving vs idle based on latest location speed from trans_trip_locations
    let movingCount = 0;
    try {
      const [moving] = await query(`
        SELECT COUNT(*) as moving
        FROM (
          SELECT trip_id, speed, ROW_NUMBER() OVER(PARTITION BY trip_id ORDER BY recorded_at DESC) as rn
          FROM trans_trip_locations
        ) sub
        WHERE rn = 1 AND speed > 0
      `);
      movingCount = moving?.moving || 0;
    } catch (e) {
      // Table may be empty
    }

    stats.moving_vehicles = movingCount;
    stats.idle_vehicles = (stats.active_trips || 0) - stats.moving_vehicles;
    stats.offline_vehicles = 0;

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// POST /tracking/location — stores into trans_trip_locations (unified table)
export const postLocation = async (req, res, next) => {
  try {
    await ensureColumns();
    const { trip_id, vehicle_id, latitude, longitude, heading, speed, accuracy, battery_level, is_offline_point, timestamp } = req.body;
    
    if (!trip_id || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: "trip_id, latitude, longitude are required" });
    }

    const userId = req.user?.id || req.user?.sub || null;
    
    await query(`
      INSERT INTO trans_trip_locations 
      (trip_id, vehicle_id, driver_id, latitude, longitude, heading, speed, accuracy, battery_level, is_offline_point, recorded_at)
      VALUES 
      (:trip_id, :vehicle_id, :driver_id, :latitude, :longitude, :heading, :speed, :accuracy, :battery_level, :is_offline_point, :recorded_at)
    `, {
      trip_id,
      vehicle_id: vehicle_id || null,
      driver_id: userId,
      latitude,
      longitude,
      heading: heading || 0,
      speed: speed || 0,
      accuracy: accuracy || null,
      battery_level: battery_level || null,
      is_offline_point: is_offline_point || false,
      recorded_at: timestamp ? new Date(timestamp) : new Date()
    });

    // Emit socket event so supervisors see the update in real-time
    try {
      const io = getIO();
      if (io) {
        io.emit("tracking:location_updated", {
          trip_id,
          vehicle_id,
          latitude,
          longitude,
          heading: heading || 0,
          speed: speed || 0,
          accuracy,
          battery_level,
          is_offline_point,
          timestamp: timestamp || new Date().toISOString(),
        });
      }
    } catch (socketErr) {
      // Socket not available — not critical
    }

    // Run async checks without blocking the response
    checkGeofences(trip_id, vehicle_id, latitude, longitude).catch(() => {});
    checkRouteAnomalies(trip_id, vehicle_id, latitude, longitude, speed).catch(() => {});

    res.json({ success: true, message: "Location stored." });
  } catch (error) {
    next(error);
  }
};

// GET /tracking/history/:trip_id — reads from trans_trip_locations
export const getTripHistory = async (req, res, next) => {
  try {
    const { trip_id } = req.params;
    const history = await query(`
      SELECT latitude, longitude, heading, speed, recorded_at, battery_level
      FROM trans_trip_locations
      WHERE trip_id = :trip_id
      ORDER BY recorded_at ASC
    `, { trip_id });
    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

// POST /tracking/start
export const startTracking = async (req, res, next) => {
  try {
    const { trip_id } = req.body;
    await query(`UPDATE trans_trips SET tracking_status = 'ACTIVE', status = 'IN_TRANSIT' WHERE id = :trip_id`, { trip_id });
    res.json({ success: true, message: "Tracking started" });
  } catch (error) {
    next(error);
  }
};

// POST /tracking/pause
export const pauseTracking = async (req, res, next) => {
  try {
    const { trip_id } = req.body;
    await query(`UPDATE trans_trips SET tracking_status = 'PAUSED' WHERE id = :trip_id`, { trip_id });
    res.json({ success: true, message: "Tracking paused" });
  } catch (error) {
    next(error);
  }
};

// POST /tracking/resume
export const resumeTracking = async (req, res, next) => {
  try {
    const { trip_id } = req.body;
    await query(`UPDATE trans_trips SET tracking_status = 'ACTIVE' WHERE id = :trip_id`, { trip_id });
    res.json({ success: true, message: "Tracking resumed" });
  } catch (error) {
    next(error);
  }
};

// POST /tracking/end
export const endTracking = async (req, res, next) => {
  try {
    const { trip_id } = req.body;
    await query(`UPDATE trans_trips SET tracking_status = 'COMPLETED', status = 'COMPLETED', end_time = NOW() WHERE id = :trip_id`, { trip_id });
    res.json({ success: true, message: "Tracking ended" });
  } catch (error) {
    next(error);
  }
};
