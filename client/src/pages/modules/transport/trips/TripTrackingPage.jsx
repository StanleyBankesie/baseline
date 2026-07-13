import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../../../api/client.js";
import LiveTrackingMap from "./LiveTrackingMap.jsx";

export default function TripTrackingPage() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    if (id) {
      api.get(`/transport/trips/${id}`).then((res) => {
        if (res.data?.success) {
          setTrip(res.data.data.trip);
        }
      });
    }
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Link
              to="/transport/trips"
              className="btn btn-ghost btn-sm px-2 text-slate-500"
            >
              ← Back
            </Link>
            Live Tracking {trip ? `- ${trip.trip_number}` : ""}
          </h1>
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-brand text-white rounded-t-lg">
          <h2 className="text-xl font-bold dark:text-brand-300">
            GPS Tracker
          </h2>
          <p className="text-sm mt-1">Real-time location monitoring</p>
        </div>
        <div className="card-body p-6">
          <LiveTrackingMap tripId={id} />
        </div>
      </div>
    </div>
  );
}
