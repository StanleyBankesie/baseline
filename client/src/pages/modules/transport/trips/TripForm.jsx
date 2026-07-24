import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../../api/client.js";
import AddressMapPicker from "../../../../components/common/AddressMapPicker";

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
    origin_name: "",
    origin_lat: null,
    origin_lng: null,
    destination_name: "",
    destination_lat: null,
    destination_lng: null,
    requester_name: "",
    notes: "",
    start_odometer: "",
  });

  const selectedVehicle = vehicles.find(
    (v) => v.id.toString() === formData.vehicle_id?.toString()
  );

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
    }).catch((err) => toast.error("Error: " + (err.response?.data?.message || err.message)));
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "request_id" && value) {
      const req = requests.find(r => String(r.id) === String(value));
      if (req) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          origin_name: req.origin || prev.origin_name,
          destination_name: req.destination || prev.destination_name,
          start_time: req.required_date ? (req.required_date.split('T')[0] + "T" + (req.required_time || "00:00")) : prev.start_time,
          requester_name: req.requester_name || req.customer_name || prev.requester_name,
          vehicle_id: req.vehicle_id || prev.vehicle_id,
          notes: req.notes || req.purpose_of_journey || prev.notes
        }));
        return;
      }
    }
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

      if (window.google && window.google.maps && payload.origin_lat && payload.destination_lat) {
        const service = new window.google.maps.DistanceMatrixService();
        try {
          const response = await service.getDistanceMatrix({
            origins: [{ lat: Number(payload.origin_lat), lng: Number(payload.origin_lng) }],
            destinations: [{ lat: Number(payload.destination_lat), lng: Number(payload.destination_lng) }],
            travelMode: 'DRIVING',
          });
          const element = response?.rows?.[0]?.elements?.[0];
          if (element && element.status === 'OK') {
            payload.distance = element.distance.value / 1000;
            payload.estimated_time = Math.round(element.duration.value / 60);
          }
        } catch (mapErr) {
          console.error("Distance matrix calculation failed", mapErr);
        }
      }

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
                  className="input input-bordered w-full"
                  value={formData.request_id}
                  onChange={handleChange}
                >
                  <option value="">-- None --</option>
                  {requests.filter(r => r.status === 'APPROVED').map(r => (
                    <option key={r.id} value={r.id}>
                      {r.request_number} - {r.requester_name || r.customer_name || 'N/A'} - {r.request_date ? r.request_date.split('T')[0] : ''}
                    </option>
                  ))}
                </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Requester's Name</span>
              </label>
              <input
                type="text"
                name="requester_name"
                className="input input-bordered w-full"
                value={formData.requester_name || ""}
                onChange={handleChange}
                placeholder="Auto-populated or enter manually"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Vehicle *</span>
              </label>
                <select
                  name="vehicle_id"
                  className="input input-bordered w-full"
                  value={formData.vehicle_id}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>Select available vehicle</option>
                  {vehicles.filter(v => v.status === 'AVAILABLE').map(v => (
                    <option key={v.id} value={v.id}>{v.reg_number}</option>
                  ))}
                </select>
                {selectedVehicle && (
                  <div className="mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded">
                    <strong>Make:</strong> {selectedVehicle.make || "N/A"}{" "}
                    &nbsp;|&nbsp;
                    <strong>Model:</strong> {selectedVehicle.model || "N/A"}
                  </div>
                )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Driver *</span>
              </label>
                <select
                  name="driver_id"
                  className="input input-bordered w-full"
                  value={formData.driver_id}
                  onChange={handleChange}
                  required
                >
                  <option value="" disabled>Select available driver</option>
                  {drivers.filter(d => d.status === 'AVAILABLE').map(d => (
                    <option key={d.id} value={d.id}>
                      {d.employee_name || 'Unnamed Driver'}
                    </option>
                  ))}
                </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Start Odometer</span>
              </label>
              <input
                type="number"
                name="start_odometer"
                className="input input-bordered w-full"
                value={formData.start_odometer || ""}
                onChange={handleChange}
                placeholder="Enter starting odometer reading"
              />
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

            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text text-brand-700 font-bold">Origin</span>
              </label>
              <AddressMapPicker 
                value={formData.origin_name}
                onChange={(val) => setFormData(p => ({...p, origin_name: val.name, origin_lat: val.lat, origin_lng: val.lng}))}
                placeholder="Enter origin manually, search, or pick on map ->"
                label="Origin"
              />
            </div>

            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text text-brand-700 font-bold">Destination</span>
              </label>
              <AddressMapPicker 
                value={formData.destination_name}
                onChange={(val) => setFormData(p => ({...p, destination_name: val.name, destination_lat: val.lat, destination_lng: val.lng}))}
                placeholder="Enter destination manually, search, or pick on map ->"
                label="Destination"
              />
            </div>

            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">Notes</span>
              </label>
              <textarea
                name="notes"
                className="textarea textarea-bordered border border-slate-300 rounded-md p-3 w-full"
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
