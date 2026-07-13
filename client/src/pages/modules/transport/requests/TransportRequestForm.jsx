import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../../api/client.js";

export default function TransportRequestForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    request_date: "",
    required_date: "",
    origin: "",
    destination: "",
    cargo_description: "",
    weight: "",
    priority: "NORMAL",
    notes: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.request_date || !formData.origin || !formData.destination) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await api.post("/transport/requests", formData);
      toast.success("Transport request created successfully");
      navigate("/transport/requests");
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
              to="/transport/requests"
              className="btn btn-ghost btn-sm px-2 text-slate-500"
            >
              ← Back
            </Link>
            New Transport Request
          </h1>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="card-body p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Request Date *</span>
              </label>
              <input
                type="date"
                name="request_date"
                className="input input-bordered w-full"
                value={formData.request_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Required By Date</span>
              </label>
              <input
                type="date"
                name="required_date"
                className="input input-bordered w-full"
                value={formData.required_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Origin *</span>
              </label>
              <input
                type="text"
                name="origin"
                className="input input-bordered w-full"
                value={formData.origin}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Destination *</span>
              </label>
              <input
                type="text"
                name="destination"
                className="input input-bordered w-full"
                value={formData.destination}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Priority</span>
              </label>
              <select
                name="priority"
                className="select select-bordered w-full"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Weight/Volume</span>
              </label>
              <input
                type="text"
                name="weight"
                className="input input-bordered w-full"
                value={formData.weight}
                onChange={handleChange}
                placeholder="e.g. 500kg, 2 pallets"
              />
            </div>

            <div className="form-control md:col-span-2">
              <label className="label">
                <span className="label-text">Cargo Description</span>
              </label>
              <textarea
                name="cargo_description"
                className="textarea textarea-bordered w-full"
                rows={3}
                value={formData.cargo_description}
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
                rows={2}
                value={formData.notes}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t pt-4">
            <Link to="/transport/requests" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
