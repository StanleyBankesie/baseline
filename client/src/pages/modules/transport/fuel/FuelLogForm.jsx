import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../../api/client.js";
import { usePermission } from "@/auth/PermissionContext.jsx";

export default function FuelLogForm() {
  const { hasExceptional } = usePermission();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    log_date: "",
    odometer_reading: "",
    fuel_quantity: "",
    cost_per_unit: "",
    total_cost: "",
    fuel_station: "",
    notes: "",
  });

  useEffect(() => {
    let cancelled = false;
    api.get("/transport/vehicles").then(res => {
      if (!cancelled) setVehicles(res.data?.data?.items || []);
    }).catch(() => toast.error("Failed to load vehicles"));
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "fuel_quantity" || name === "cost_per_unit") {
        const qty = parseFloat(name === "fuel_quantity" ? value : prev.fuel_quantity) || 0;
        const cost = parseFloat(name === "cost_per_unit" ? value : prev.cost_per_unit) || 0;
        updated.total_cost = (qty * cost).toFixed(2);
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicle_id || !formData.log_date || !formData.fuel_quantity) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await api.post("/transport/fuel", formData);
      toast.success("Fuel log added successfully");
      navigate("/transport/fuel");
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
              to="/transport/fuel"
              className="btn btn-ghost btn-sm px-2 text-slate-500"
            >
              ← Back
            </Link>
            Add Fuel Log
          </h1>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="card-body p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <option value="" disabled>Select a vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.reg_number}</option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Log Date *</span>
              </label>
              <input
                type="date"
                name="log_date"
                className="input input-bordered w-full"
                value={formData.log_date}
                onChange={handleChange}
                required
              
                disabled={!!id && !hasExceptional("DOCUMENT.EDIT_DATE")}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Odometer Reading *</span>
              </label>
              <input
                type="number"
                name="odometer_reading"
                className="input input-bordered w-full"
                value={formData.odometer_reading}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Fuel Quantity (Liters) *</span>
              </label>
              <input
                type="number"
                step="0.01"
                name="fuel_quantity"
                className="input input-bordered w-full"
                value={formData.fuel_quantity}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Cost per Liter *</span>
              </label>
              <input
                type="number"
                step="0.01"
                name="cost_per_unit"
                className="input input-bordered w-full"
                value={formData.cost_per_unit}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Total Cost (auto-calculated)</span>
              </label>
              <input
                type="number"
                name="total_cost"
                className="input input-bordered w-full bg-slate-50"
                value={formData.total_cost}
                readOnly
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Fuel Station</span>
              </label>
              <input
                type="text"
                name="fuel_station"
                className="input input-bordered w-full"
                value={formData.fuel_station}
                onChange={handleChange}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Notes</span>
              </label>
              <textarea
                name="notes"
                className="textarea textarea-bordered w-full"
                rows={2}
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t pt-4">
            <Link to="/transport/fuel" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Fuel Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
