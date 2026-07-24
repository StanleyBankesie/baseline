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
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-900 flex flex-col">
      <div className="flex-none p-4 bg-white dark:bg-slate-800 shadow-sm z-10 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <Link
            to="/transport/trip-management"
            className="btn btn-ghost btn-sm px-2 text-slate-500"
          >
            ← Back
          </Link>
          Live Tracking {trip ? `- ${trip.trip_number}` : ""}
        </h1>
      </div>

      <div className="flex-1 w-full bg-slate-200 dark:bg-slate-900 relative">
        <LiveTrackingMap tripId={id} trip={trip} height="100%" />
      </div>
    </div>
  );
}
