import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../../api/client.js";

export default function RouteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    route_code: "",
    route_name: "",
    origin: "",
    destination: "",
    distance_km: "",
    estimated_hours: "",
    standard_charge: "",
    toll_cost: "",
    notes: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.route_name || !formData.origin || !formData.destination) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      if (id) {
        await api.put(`/transport/routes/${id}`, formData);
        toast.success("Route updated successfully");
      } else {
        await api.post("/transport/routes", formData);
        toast.success("Route added successfully");
      }
      navigate("/transport/routes");
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
              to="/transport/routes"
              className="btn btn-ghost btn-sm px-2 text-slate-500"
            >
              ← Back
            </Link>
            {id ? "Edit Route" : "New Route"}
          </h1>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="card-body p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Route Code</span>
              </label>
              <input
                type="text"
                name="route_code"
                value={formData.route_code}
                onChange={handleChange}
                className="input input-bordered w-full"
                placeholder="e.g. ACC-KUM-01"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Route Name <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                name="route_name"
                value={formData.route_name}
                onChange={handleChange}
                className="input input-bordered w-full"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Pickup / Origin <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                className="input input-bordered w-full"
                required
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Destination <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                className="input input-bordered w-full"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Distance (km)</span>
              </label>
              <input
                type="number"
                name="distance_km"
                value={formData.distance_km}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Estimated Time (Hours)</span>
              </label>
              <input
                type="number"
                name="estimated_hours"
                value={formData.estimated_hours}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Standard Charge</span>
              </label>
              <input
                type="number"
                name="standard_charge"
                value={formData.standard_charge}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Estimated Toll Cost</span>
              </label>
              <input
                type="number"
                name="toll_cost"
                value={formData.toll_cost}
                onChange={handleChange}
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">Notes</span>
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="textarea textarea-bordered w-full"
                rows="3"
                placeholder="Route conditions, alternate paths, etc."
              ></textarea>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t pt-4">
            <Link to="/transport/routes" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className={`btn btn-primary ${loading ? "loading" : ""}`}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Route"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
