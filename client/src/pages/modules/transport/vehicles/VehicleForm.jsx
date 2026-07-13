import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../../api/client.js";

export default function VehicleForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    reg_number: "",
    vehicle_type: "TRUCK",
    make: "",
    model: "",
    capacity: "",
    current_odometer: "0",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reg_number || !formData.vehicle_type) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await api.post("/transport/vehicles", formData);
      toast.success("Vehicle added successfully");
      navigate("/transport/vehicles");
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
              to="/transport/vehicles"
              className="btn btn-ghost btn-sm px-2 text-slate-500"
            >
              ← Back
            </Link>
            New Vehicle
          </h1>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="card-body p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Registration Number *</span>
              </label>
              <input
                type="text"
                name="reg_number"
                className="input input-bordered w-full"
                value={formData.reg_number}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Vehicle Type *</span>
              </label>
              <select
                name="vehicle_type"
                className="select select-bordered w-full"
                value={formData.vehicle_type}
                onChange={handleChange}
                required
              >
                <option value="TRUCK">Truck</option>
                <option value="VAN">Van</option>
                <option value="CAR">Car</option>
                <option value="MOTORCYCLE">Motorcycle</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Make</span>
              </label>
              <input
                type="text"
                name="make"
                className="input input-bordered w-full"
                value={formData.make}
                onChange={handleChange}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Model</span>
              </label>
              <input
                type="text"
                name="model"
                className="input input-bordered w-full"
                value={formData.model}
                onChange={handleChange}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Capacity/Load</span>
              </label>
              <input
                type="text"
                name="capacity"
                className="input input-bordered w-full"
                value={formData.capacity}
                onChange={handleChange}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Current Odometer</span>
              </label>
              <input
                type="number"
                name="current_odometer"
                className="input input-bordered w-full"
                value={formData.current_odometer}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t pt-4">
            <Link to="/transport/vehicles" className="btn btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
