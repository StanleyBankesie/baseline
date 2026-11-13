import { Activity, Clock, CheckCircle2, Truck } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../../../../api/client.js";
import { toast } from "react-toastify";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

export default function VehiclesList({ isTab = false }) {
  const [viewMode, setViewMode] = useViewMode();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.get("/transport/vehicles");
      if (res.data?.success) {
        setVehicles(res.data.data.items || []);
      }
    } catch (err) {
      toast.error("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleAdd = () => {
    navigate("/transport/vehicles/new");
  };

  return (
    <div className="space-y-4">
      {!isTab ? (
        <>
              {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Fleet Vehicles",
            val: (vehicles || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Fleet Vehicles",
            val: (vehicles || []).length,
            icon: <Truck size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Fleet Vehicles",
            val: (vehicles || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "PENDING_APPROVAL").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Fleet Vehicles",
            val: (vehicles || []).filter((x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "POSTED").length,
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

      <div className="card">
          <div className="card-header bg-brand text-white rounded-t-lg flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold dark:text-brand-300">
                Vehicles Management
              </h1>
              <p className="text-sm mt-1">
                Manage fleet vehicles and their statuses
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.history.back()} className="btn btn-secondary">
                ← Back
              </button>
              <button className="btn-success" onClick={handleAdd}>
                <PlusOutlined /> New Vehicle
              </button>
            </div>
          </div>
        </div>
        </>
      ) : (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Vehicles</h2>
          <button className="btn btn-primary btn-sm" onClick={handleAdd}>
            <PlusOutlined /> New Vehicle
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
                  <th className="px-6 py-4 font-semibold uppercase">Reg Number</th>
                  <th className="px-6 py-4 font-semibold uppercase">Type</th>
                  <th className="px-6 py-4 font-semibold uppercase">Make/Model</th>
                  <th className="px-6 py-4 font-semibold uppercase">Capacity</th>
                  <th className="px-6 py-4 font-semibold uppercase">Odometer</th>
                  <th className="px-6 py-4 font-semibold uppercase">Status</th>
                  <th className="px-6 py-4 font-semibold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                      Loading vehicles...
                    </td>
                  </tr>
                ) : vehicles.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                      No vehicles found
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium">{v.reg_number}</td>
                      <td className="px-6 py-4">{v.vehicle_type}</td>
                      <td className="px-6 py-4">{`${v.make || ""} ${v.model || ""}`.trim()}</td>
                      <td className="px-6 py-4">{v.capacity}</td>
                      <td className="px-6 py-4">{v.current_odometer}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          v.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                          v.status === 'ON_TRIP' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {v.status || 'AVAILABLE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/transport/vehicles/${v.id}`} className="btn btn-ghost btn-sm text-brand-600">
                            <EditOutlined />
                          </Link>
                          <button className="btn btn-ghost btn-sm text-red-600">
                            <DeleteOutlined />
                          </button>
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
