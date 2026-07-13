import api from "../../../../../api/client.js";

// Stores active watch ID
let watchId = null;

// Basic offline queue for GPS data
const offlineQueue = [];

export const startTracking = (tripId) => {
  if (!navigator.geolocation) {
    console.error("Geolocation is not supported by your browser");
    return false;
  }

  // Clear any existing watch
  if (watchId !== null) stopTracking();

  console.log("Started GPS tracking for Trip:", tripId);
  
  watchId = navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude, speed, heading, accuracy } = position.coords;
      const payload = {
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        recorded_at: new Date().toISOString()
      };
      
      // Attempt to send immediately
      sendLocationUpdate(tripId, payload);
    },
    (error) => {
      console.warn("GPS tracking error:", error.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
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
};

const sendLocationUpdate = async (tripId, payload) => {
  // If we are offline (basic check), queue it
  if (!navigator.onLine) {
    offlineQueue.push({ tripId, payload });
    return;
  }
  
  try {
    await api.post(`/transport/trips/${tripId}/location`, payload);
    
    // Process queue if any
    while(offlineQueue.length > 0) {
      const item = offlineQueue.shift();
      await api.post(`/transport/trips/${item.tripId}/location`, item.payload);
    }
  } catch (err) {
    // If failed, re-queue
    offlineQueue.push({ tripId, payload });
  }
};
