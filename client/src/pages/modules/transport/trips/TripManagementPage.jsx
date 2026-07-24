import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EnvironmentOutlined, ArrowLeftOutlined, EditOutlined, PlayCircleOutlined, CheckCircleOutlined } from "@ant-design/icons";
import api from "../../../../api/client.js";
import { toast } from "react-toastify";

export default function TripManagementPage() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [startTripModal, setStartTripModal] = useState({ open: false, tripId: null, odometer: "" });
  const trackingIntervals = React.useRef({});

  const startTracking = (tripId) => {
    if (trackingIntervals.current[tripId]) return;
    
    let isFirstPing = true;

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          let originName = null;
          
          if (isFirstPing && window.google) {
            try {
              const geocoder = new window.google.maps.Geocoder();
              const res = await geocoder.geocode({ location: { lat, lng } });
              if (res.results && res.results[0]) {
                originName = res.results[0].formatted_address;
              }
            } catch (e) {
              console.error("Geocoding failed", e);
            }
          }

          api.post(`/transport/trips/${tripId}/location`, {
            latitude: lat,
            longitude: lng,
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            accuracy: pos.coords.accuracy,
            recorded_at: new Date().toISOString(),
            is_initial: isFirstPing,
            origin_name: originName
          }).catch(() => {});
          
          isFirstPing = false;
        },
        (err) => {
          console.error("Tracking error:", err);
          toast.error("Error getting location: " + err.message);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
      trackingIntervals.current[tripId] = watchId;
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  };

  const stopTracking = (tripId) => {
    if (trackingIntervals.current[tripId]) {
      navigator.geolocation.clearWatch(trackingIntervals.current[tripId]);
      delete trackingIntervals.current[tripId];
    }
  };

  const handleStartTrip = async () => {
    if (!startTripModal.odometer) {
      toast.error("Please enter current odometer reading");
      return;
    }
    try {
      const tripId = startTripModal.tripId;
      await api.put(`/transport/trips/${tripId}/start`, { start_odometer: startTripModal.odometer });
      toast.success("Trip started successfully");
      startTracking(tripId);
      setStartTripModal({ open: false, tripId: null, odometer: "" });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start trip");
    }
  };

  const handleEndTrip = async (tripId) => {
    if (!window.confirm("Are you sure you want to end this trip?")) return;
    try {
      await api.put(`/transport/trips/${tripId}/return`, { end_time: new Date().toISOString() });
      toast.success("Trip ended successfully");
      stopTracking(tripId);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to end trip");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const tripsRes = await api.get("/transport/trips");
      const allTrips = tripsRes.data?.data?.items || [];
      
      // Filter for scheduled and started statuses
      const activeStatuses = ['SCHEDULED', 'PENDING', 'STARTED', 'IN_TRANSIT'];
      const filtered = allTrips.filter(t => activeStatuses.includes(t.status?.toUpperCase() || 'SCHEDULED'));
      
      setTrips(filtered);
    } catch (err) {
      toast.error("Failed to fetch trips data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => {
      clearInterval(interval);
      Object.keys(trackingIntervals.current).forEach(stopTracking);
    };
  }, []);

  useEffect(() => {
    // Clear tracking if trip disappears from active trips
    const activeTripIds = trips.map(t => String(t.id));
    Object.keys(trackingIntervals.current).forEach(tripId => {
      if (!activeTripIds.includes(String(tripId))) {
        stopTracking(tripId);
      }
    });
  }, [trips]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-brand-400 pb-4">
          <div>
            <button 
              onClick={() => navigate("/transport")}
              className="text-brand-100 hover:text-white flex items-center gap-2 mb-2 transition-colors"
            >
              <ArrowLeftOutlined /> Back to Menu
            </button>
            <h1 className="text-3xl font-bold">Live Trip Management</h1>
            <p className="text-brand-100 mt-1">Monitoring all scheduled and active trips.</p>
          </div>
        </div>

        {loading && trips.length === 0 ? (
          <div className="flex justify-center py-20 text-brand-200">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20 border border-brand-400 rounded-xl bg-brand-600 bg-opacity-20">
            <h3 className="text-xl font-medium">No Active Trips</h3>
            <p className="text-brand-200 mt-2">There are currently no scheduled or started trips to manage.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map(trip => (
              <div key={trip.id} className="bg-white text-slate-800 rounded-xl shadow-lg overflow-hidden flex flex-col">
                <div className={`px-4 py-3 border-b flex justify-between items-center ${
                  ['IN_TRANSIT', 'STARTED'].includes(trip.status?.toUpperCase()) 
                    ? 'bg-blue-50 border-blue-100' 
                    : 'bg-amber-50 border-amber-100'
                }`}>
                  <span className="font-bold text-lg text-brand">#{trip.trip_number}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    ['IN_TRANSIT', 'STARTED'].includes(trip.status?.toUpperCase()) 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-amber-500 text-white'
                  }`}>
                    {trip.status || 'SCHEDULED'}
                  </span>
                </div>
                
                <div className="p-5 flex-1 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Route</p>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <div className="w-0.5 h-6 bg-slate-200 my-0.5"></div>
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      </div>
                      <div className="flex flex-col justify-between h-12 text-sm font-medium">
                        <span>{trip.origin_name || "Origin not set"}</span>
                        <span>{trip.destination_name || "Destination not set"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Driver</p>
                      <p className="font-medium truncate" title={trip.employee_name}>{trip.employee_name || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-0.5">Vehicle</p>
                      <p className="font-medium">{trip.reg_number || 'Unassigned'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-4 py-3 flex gap-2 border-t border-slate-200">
                  {trip.status?.toUpperCase() === 'SCHEDULED' ? (
                    <button 
                      onClick={() => setStartTripModal({ open: true, tripId: trip.id, odometer: "" })}
                      className="flex-1 text-center py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex justify-center items-center gap-2"
                    >
                      <PlayCircleOutlined /> Start Trip
                    </button>
                  ) : (
                    <Link 
                      to={`/transport/tracking/${trip.id}`} 
                      className="flex-1 text-center py-2 bg-brand text-white rounded-lg font-medium hover:bg-brand-600 transition-colors flex justify-center items-center gap-2"
                    >
                      <EnvironmentOutlined /> Live Map
                    </Link>
                  )}
                  {trip.status?.toUpperCase() !== 'SCHEDULED' && (
                    <button 
                      onClick={() => handleEndTrip(trip.id)}
                      className="px-4 py-2 border border-red-300 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium flex items-center gap-2"
                      title="End Trip"
                    >
                      <CheckCircleOutlined /> End Trip
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {startTripModal.open && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-brand">Start Trip</h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium text-slate-700">Current Odometer Reading</span>
              </label>
              <input 
                type="number" 
                className="input input-bordered w-full bg-slate-50 border-slate-300" 
                placeholder="e.g. 154000"
                value={startTripModal.odometer}
                onChange={e => setStartTripModal(prev => ({ ...prev, odometer: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button 
                className="px-4 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                onClick={() => setStartTripModal({ open: false, tripId: null, odometer: "" })}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 rounded-lg font-medium bg-brand text-white hover:bg-brand-600 transition-colors"
                onClick={handleStartTrip}
              >
                Confirm Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
