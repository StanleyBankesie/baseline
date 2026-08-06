import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../../../../api/client.js";
import { io } from "socket.io-client";
import FleetSummaryCards from "../components/FleetSummaryCards";
import FleetListPanel from "../components/FleetListPanel";
import TripDetailsPanel from "../components/TripDetailsPanel";
import EnhancedGoogleMap from "../components/EnhancedGoogleMap";

export default function TripTrackingPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(id ? Number(id) : null);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [liveRes, statsRes] = await Promise.all([
          api.get('/api/tracking/live'),
          api.get('/api/tracking/dashboard')
        ]);
        setVehicles(liveRes.data?.data || []);
        setStats(statsRes.data?.data || null);
      } catch (err) {
        console.error("Failed to fetch tracking data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Setup Socket.IO
  useEffect(() => {
    const newSocket = io(window.location.origin, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => console.log("Tracking Socket Connected"));

    newSocket.on("tracking:location_updated", (data) => {
      setVehicles(prev => {
        const idx = prev.findIndex(v => v.trip_id === data.trip_id);
        if (idx === -1) return prev; // Ignore if not in our active list for now
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...data };
        return updated;
      });
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  const selectedVehicle = vehicles.find(v => v.trip_id === selectedVehicleId);
  const isSingleTripMode = !!id; // True if accessed via a specific trip ID

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col p-4 pt-16">
      <div className="flex justify-between items-center mb-4">
        {isSingleTripMode ? (
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm px-2 text-slate-500">
              ← Back
            </button>
            Trip Tracking - {selectedVehicle?.trip_number || 'Loading...'}
          </h1>
        ) : (
          <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm px-2 text-slate-500 mb-2">
            ← Back
          </button>
        )}
      </div>

      {!isSingleTripMode && <FleetSummaryCards stats={stats} isLoading={isLoading} />}

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Panel: List (Hidden in Single Trip Mode) */}
        {!isSingleTripMode && (
          <div className="w-80 flex-shrink-0">
            <FleetListPanel 
              vehicles={vehicles} 
              selectedVehicleId={selectedVehicleId}
              onSelectVehicle={(v) => setSelectedVehicleId(v.trip_id)}
            />
          </div>
        )}

        {/* Center: Map */}
        <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-base-200/50 relative">
          <EnhancedGoogleMap 
            vehicles={isSingleTripMode ? vehicles.filter(v => v.trip_id === Number(id)) : vehicles} 
            selectedVehicleId={selectedVehicleId} 
            onSelectVehicle={(v) => setSelectedVehicleId(v ? v.trip_id : null)} 
          />
        </div>

        {/* Right Panel: Details (Slide In) */}
        {selectedVehicleId && (
          <div className="w-80 flex-shrink-0 transition-all duration-300">
            <TripDetailsPanel 
              vehicle={selectedVehicle} 
              onClose={() => !isSingleTripMode && setSelectedVehicleId(null)} // Prevent closing in single mode if desired, or just allow it
            />
          </div>
        )}
      </div>
    </div>
  );
}
