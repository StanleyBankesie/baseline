import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../../api/client.js";

export default function TripForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [formData, setFormData] = useState({
    request_id: "",
    vehicle_id: "",
    driver_id: "",
    start_time: "",
    origin: "",
    destination: "",
    notes: "",
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get("/transport/vehicles"),
      api.get("/transport/drivers"),
      api.get("/transport/requests"),
    ]).then(([vehRes, drvRes, reqRes]) => {
      if (!cancelled) {
        setVehicles(vehRes.data?.data?.items || []);
        setDrivers(drvRes.data?.data?.items || []);
        setRequests(reqRes.data?.data?.items || []);
      }
    }).catch(() => toast.error("Failed to load form data"));
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicle_id || !formData.driver_id) {
      toast.error("Please select a vehicle and driver");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...formData };
      if (!payload.request_id) delete payload.request_id;
      if (!payload.start_time) delete payload.start_time;
      await api.post("/transport/trips", payload);
      toast.success("Trip dispatched successfully");
      navigate("/transport/trips");
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

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
            Dispatch Trip
          </h1>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="card-body p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Link Request (Optional)</span>
              </label>
              <select
                name="request_id"
                className="select select-bordered w-full"
                value={formData.request_id}
                onChange={handleChange}
              >
                <option value="">-- None --</option>
                {requests.filter(r => r.status === 'PENDING').map(r => (
                  <option key={r.id} value={r.id}>
                    {r.request_number} - {r.destination}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Vehicle *</span>
              </label>
              <select
                name="vehicle_id"
                className="select select-bordered w-full"
                value={formData.vehicle_id}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select available vehicle</option>
                {vehicles.filter(v => v.status === 'AVAILABLE').map(v => (
                  <option key={v.id} value={v.id}>{v.reg_number}</option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Driver *</span>
              </label>
              <select
                name="driver_id"
                className="select select-bordered w-full"
                value={formData.driver_id}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select available driver</option>
                {drivers.filter(d => d.status === 'AVAILABLE').map(d => (
                  <option key={d.id} value={d.id}>
                    {d.first_name} {d.last_name} ({d.license_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Start Time</span>
              </label>
              <input
                type="datetime-local"
                name="start_time"
                className="input input-bordered w-full"
                value={formData.start_time}
                onChange={handleChange}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Origin</span>
              </label>
              <input
                type="text"
                name="origin"
                className="input input-bordered w-full"
                value={formData.origin}
                onChange={handleChange}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Destination</span>
              </label>
              <input
                type="text"
                name="destination"
                className="input input-bordered w-full"
                value={formData.destination}
                onChange={handleChange}
              />
            </div>

            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">Notes</span>
              </label>
              <textarea
                name="notes"
                className="textarea textarea-bordered w-full"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t pt-4">
            <Link to="/transport/trips" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Dispatching..." : "Dispatch Trip"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
