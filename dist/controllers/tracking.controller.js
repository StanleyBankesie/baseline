import { query } from "../db/pool.js";
import { checkGeofences } from "../services/geofence.service.js";
import { checkRouteAnomalies } from "../services/route-deviation.service.js";

// GET /tracking/live
export const getLiveTracking = async (req, res, next) => {
  try {
    const { companyId } = req.user;
    // Get all trips in transit and their latest gps location
    const sql = `
      SELECT 
        t.id as trip_id, t.trip_number, t.status, t.tracking_status,
        t.vehicle_id, v.registration_number,
        t.driver_id, d.name as driver_name,
        t.origin_name, t.destination_name, t.origin_lat, t.origin_lng, t.destination_lat, t.destination_lng,
        g.latitude, g.longitude, g.heading, g.speed, g.recorded_at, g.battery_level, g.accuracy
      FROM trans_trips t
      LEFT JOIN trans_vehicles v ON t.vehicle_id = v.id
      LEFT JOIN trans_drivers d ON t.driver_id = d.id
      LEFT JOIN trip_gps_logs g ON g.id = (
          SELECT id FROM trip_gps_logs WHERE trip_id = t.id ORDER BY recorded_at DESC LIMIT 1
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
    const { companyId } = req.user;
    
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

    // Count moving vs idle vehicles based on latest GPS speed (simplified for now)
    const [moving] = await query(`
      SELECT COUNT(*) as moving
      FROM (
        SELECT trip_id, speed, ROW_NUMBER() OVER(PARTITION BY trip_id ORDER BY recorded_at DESC) as rn
        FROM trip_gps_logs
      ) sub
      WHERE rn = 1 AND speed > 0
    `);

    stats.moving_vehicles = moving?.moving || 0;
    stats.idle_vehicles = (stats.active_trips || 0) - stats.moving_vehicles;
    stats.offline_vehicles = 0; // Implement actual offline check (no ping > 5 mins)

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// POST /tracking/location
export const postLocation = async (req, res, next) => {
  try {
    const { trip_id, vehicle_id, latitude, longitude, heading, speed, accuracy, battery_level, is_offline_point, timestamp } = req.body;
    
    await query(`
      INSERT INTO trip_gps_logs 
      (trip_id, vehicle_id, driver_id, latitude, longitude, heading, speed, accuracy, battery_level, is_offline_point, recorded_at)
      VALUES 
      (:trip_id, :vehicle_id, :driver_id, :latitude, :longitude, :heading, :speed, :accuracy, :battery_level, :is_offline_point, :recorded_at)
    `, {
      trip_id, vehicle_id, driver_id: req.user.id, latitude, longitude, heading, speed, accuracy, battery_level, is_offline_point, recorded_at: timestamp ? new Date(timestamp) : new Date()
    });

    // Run async checks without blocking the response
    checkGeofences(trip_id, vehicle_id, latitude, longitude).catch(console.error);
    checkRouteAnomalies(trip_id, vehicle_id, latitude, longitude, speed).catch(console.error);

    res.json({ success: true, message: "Location stored." });
  } catch (error) {
    next(error);
  }
};

// GET /tracking/history/:trip_id
export const getTripHistory = async (req, res, next) => {
  try {
    const { trip_id } = req.params;
    const history = await query(`
      SELECT latitude, longitude, heading, speed, recorded_at, battery_level
      FROM trip_gps_logs
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
