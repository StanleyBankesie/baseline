import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../../../api/client.js";
import { usePermission } from "@/auth/PermissionContext.jsx";

export default function DriverForm() {
  const { hasExceptional } = usePermission();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employee_id: "",
    license_number: "",
    license_type: "STANDARD",
    license_expiry: "",
  });

  useEffect(() => {
    let cancelled = false;
    api.get("/hr/employees")
      .then((res) => {
        if (!cancelled && res.data?.data?.items) {
          setEmployees(res.data.data.items);
        }
      })
      .catch((err) => {
        if (err.response?.status !== 403) {
          toast.error("Failed to fetch employees");
        }
      });
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.license_number) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await api.post("/transport/drivers", formData);
      toast.success("Driver added successfully");
      navigate("/transport/drivers");
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
              to="/transport/drivers"
              className="btn btn-ghost btn-sm px-2 text-slate-500"
            >
              ← Back
            </Link>
            New Driver
          </h1>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="card-body p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Select Employee *</span>
              </label>
              <input
                type="text"
                name="employee_name"
                className="input input-bordered w-full"
                value={formData.employee_name || formData.employee_id || ""}
                onChange={(e) => {
                  handleChange({ target: { name: 'employee_id', value: e.target.value }});
                  handleChange({ target: { name: 'employee_name', value: e.target.value }});
                }}
                placeholder="Enter employee name"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">License Number *</span>
              </label>
              <input
                type="text"
                name="license_number"
                className="input input-bordered w-full"
                value={formData.license_number}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">License Type</span>
              </label>
              <select
                name="license_type"
                className="select select-bordered w-full"
                value={formData.license_type}
                onChange={handleChange}
              >
                <option value="COMMERCIAL">Commercial</option>
                <option value="HEAVY_DUTY">Heavy Duty</option>
                <option value="STANDARD">Standard</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">License Expiry</span>
              </label>
              <input
                type="date"
                name="license_expiry"
                className="input input-bordered w-full"
                value={formData.license_expiry}
                onChange={handleChange}
              
                disabled={!!id && !hasExceptional("DOCUMENT.EDIT_DATE")}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3 border-t pt-4">
            <Link to="/transport/drivers" className="btn btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Driver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
