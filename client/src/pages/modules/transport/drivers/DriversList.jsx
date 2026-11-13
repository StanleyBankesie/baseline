import { Activity, Clock, CheckCircle2, Users } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusOutlined, EditOutlined, DeleteOutlined, StopOutlined, CheckCircleOutlined } from "@ant-design/icons";
import api from "../../../../api/client.js";
import { toast } from "react-toastify";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

export default function DriversList({ isTab = false }) {
  const [viewMode, setViewMode] = useViewMode();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [driversRes, empRes] = await Promise.all([
        api.get("/transport/drivers"),
        api.get("/hr/employees") // Assuming this endpoint exists to fetch employees
      ]);
      setDrivers(driversRes.data?.data?.items || []);
      setEmployees(empRes.data?.data?.items || []);
    } catch (err) {
      if (err.response?.status !== 403) {
        toast.error("Failed to fetch drivers data");
      } else {
        const res = await api.get("/transport/drivers");
        setDrivers(res.data?.data?.items || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await api.patch(`/transport/drivers/${id}/status`);
      toast.success("Driver status updated");
      fetchData();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    navigate("/transport/drivers/new");
  };

  return (
    <div className="space-y-4">
            {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Drivers",
            val: (drivers || []).filter((x) => x.status === "ACTIVE" || x.status === "AVAILABLE" || x.status === "ON_TRIP").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Drivers",
            val: (drivers || []).length,
            icon: <Users size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Verification",
            val: (drivers || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "ON_LEAVE").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Licensed / Valid",
            val: (drivers || []).filter((x) => x.status === "ACTIVE" || x.status === "AVAILABLE" || x.status === "VERIFIED").length,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600 text-white",
          },
        ].map((stat, i) => (
          <div key={i} className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {stat.val}
              </p>
            </div>
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md ${stat.color}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {!isTab ? (
        <div className="card">
          <div className="card-header bg-brand text-white rounded-t-lg flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold dark:text-brand-300">
                Drivers Directory
              </h1>
              <p className="text-sm mt-1">
                Manage transport drivers and their licenses
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/transport" className="btn btn-secondary">
                Return to Menu
              </Link>
              <button className="btn-success" onClick={handleAdd}>
                <PlusOutlined /> Add Driver
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Drivers</h2>
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>
            <PlusOutlined /> Add Driver
          </button>
        </div>
      )}
      <div className="card">
        <div className="card-body p-0">
          
                <div className="flex justify-end mb-4">
                  <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                </div>
                <div className="overflow-x-auto">
            <table className={ "w-full text-sm text-left " + (viewMode === 'grid' ? 'table-grid-mode' : '') }>
              <thead className="text-xs text-brand-600 bg-brand-50 border-b border-brand-200">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase">Employee Code</th>
                  <th className="px-6 py-4 font-semibold uppercase">Name</th>
                  <th className="px-6 py-4 font-semibold uppercase">License No.</th>
                  <th className="px-6 py-4 font-semibold uppercase">License Type</th>
                  <th className="px-6 py-4 font-semibold uppercase">Expiry</th>
                  <th className="px-6 py-4 font-semibold uppercase">Status</th>
                  <th className="px-6 py-4 font-semibold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                      Loading drivers...
                    </td>
                  </tr>
                ) : drivers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                      No drivers found
                    </td>
                  </tr>
                ) : (
                  drivers.map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium">{d.employee_code || "N/A"}</td>
                      <td className="px-6 py-4">{d.employee_name || `${d.first_name || ""} ${d.last_name || ""}`.trim() || "N/A"}</td>
                      <td className="px-6 py-4">{d.license_number}</td>
                      <td className="px-6 py-4">{d.license_type}</td>
                      <td className="px-6 py-4">{d.license_expiry ? d.license_expiry.split('T')[0] : ''}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          !d.is_active ? 'bg-slate-100 text-slate-800' :
                          d.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                          d.status === 'ON_TRIP' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {!d.is_active ? 'DISABLED' : (d.status || 'AVAILABLE')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/transport/drivers/${d.id}`} className="btn btn-ghost btn-sm text-brand-600">
                            <EditOutlined />
                          </Link>
                          {d.is_active ? (
                            <button onClick={() => handleToggleStatus(d.id)} className="btn btn-ghost btn-sm text-red-600" title="Disable">
                              <StopOutlined />
                            </button>
                          ) : (
                            <button onClick={() => handleToggleStatus(d.id)} className="btn btn-ghost btn-sm text-green-600" title="Enable">
                              <CheckCircleOutlined />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
