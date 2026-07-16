import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../../../api/client.js";

export default function TripHistoryReport() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get("/transport/trips")
      .then(res => setTrips(res.data?.data?.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredTrips = trips.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (t.trip_number?.toLowerCase().includes(q) || 
              t.driver_name?.toLowerCase().includes(q) || 
              t.vehicle_name?.toLowerCase().includes(q) || 
              t.reg_number?.toLowerCase().includes(q) || 
              t.destination?.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header bg-slate-800 text-white rounded-t-lg flex justify-between items-center p-4">
          <div>
            <h1 className="text-2xl font-bold dark:text-slate-100">Trip History & Tracking</h1>
            <p className="text-sm mt-1 text-slate-300">Detailed logs of all fleet trips</p>
          </div>
          <Link to="/transport/reports" className="btn btn-secondary btn-sm">Return to Reports</Link>
        </div>
        <div className="card-body p-4 bg-slate-50 border-b flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4">
            <input 
              type="text" 
              placeholder="Search driver, vehicle, or destination..." 
              className="input input-bordered w-72" 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
            <select className="select select-bordered" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="text-sm font-semibold text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200">
            Total Trips: {filteredTrips.length}
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-body p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 bg-slate-100 border-b border-slate-200 uppercase">
              <tr>
                <th className="px-6 py-4">Trip No</th>
                <th className="px-6 py-4">Vehicle</th>
                <th className="px-6 py-4">Driver</th>
                <th className="px-6 py-4">Departure &rarr; Destination</th>
                <th className="px-6 py-4">Timing</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-6">Loading history...</td></tr>
              ) : filteredTrips.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-6 text-slate-500">No trips found matching criteria.</td></tr>
              ) : (
                filteredTrips.map(trip => (
                  <tr key={trip.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium">{trip.trip_number}</td>
                    <td className="px-6 py-4">{trip.vehicle_name || trip.reg_number || trip.vehicle_id}</td>
                    <td className="px-6 py-4">{trip.driver_name || trip.driver_id}</td>
                    <td className="px-6 py-4">{trip.origin || "Origin"} &rarr; {trip.destination || "Dest"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div><span className="font-semibold">Start:</span> {trip.start_time ? new Date(trip.start_time).toLocaleString() : '-'}</div>
                      <div><span className="font-semibold">End:</span> {trip.end_time ? new Date(trip.end_time).toLocaleString() : '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${trip.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : trip.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        {trip.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
