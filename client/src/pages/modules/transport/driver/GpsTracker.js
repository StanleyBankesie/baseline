import api from "../../../../../api/client.js";
import { io } from "socket.io-client";

let watchId = null;
let socket = null;
let vehicleId = null;

const offlineQueue = [];

export const initTrackingSocket = (vId) => {
  vehicleId = vId;
  if (!socket) {
    socket = io(window.location.origin, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
};

export const startTracking = (tripId, vId) => {
  initTrackingSocket(vId);

  if (!navigator.geolocation) {
    console.error("Geolocation is not supported by your browser");
    return false;
  }

  if (watchId !== null) stopTracking();

  console.log("Started GPS tracking for Trip:", tripId);
  
  // Also notify backend that trip started
  api.post("/api/tracking/start", { trip_id: tripId }).catch(console.error);
  if (socket) socket.emit("tracking:trip_started", { trip_id: tripId });

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, speed, heading, accuracy } = position.coords;
      const payload = {
        trip_id: tripId,
        vehicle_id: vehicleId,
        latitude,
        longitude,
        speed: speed ? (speed * 3.6).toFixed(2) : 0, // Convert m/s to km/h
        heading,
        accuracy,
        battery_level: navigator.getBattery ? 100 : null, // Mock or fetch actual
        is_offline_point: !navigator.onLine,
        timestamp: new Date().toISOString()
      };
      
      sendLocationUpdate(payload);
    },
    (error) => {
      console.warn("GPS tracking error:", error.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 5000
    }
  );
  return true;
};

export const stopTracking = () => {
  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    console.log("Stopped GPS tracking");
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

const sendLocationUpdate = async (payload) => {
  if (socket && navigator.onLine) {
    socket.emit("tracking:location_updated", payload);
  }

  if (!navigator.onLine) {
    offlineQueue.push(payload);
    return;
  }
  
  try {
    await api.post(`/api/tracking/location`, payload);
    
    // Sync offline queue
    while(offlineQueue.length > 0) {
      const item = offlineQueue.shift();
      item.is_offline_point = true;
      await api.post(`/api/tracking/location`, item).catch(() => offlineQueue.push(item));
    }
  } catch (err) {
    offlineQueue.push(payload);
  }
};
