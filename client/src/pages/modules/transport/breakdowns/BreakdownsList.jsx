import { Activity, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { PlusOutlined, WarningOutlined } from "@ant-design/icons";
import api from "../../../../api/client.js";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

export default function BreakdownsList() {
  const [viewMode, setViewMode] = useViewMode();
  const [breakdowns, setBreakdowns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBreakdowns();
  }, []);

  const fetchBreakdowns = async () => {
    try {
      const { data } = await api.get("/transport/breakdowns");
      if (data?.data?.items) {
        setBreakdowns(data.data.items);
      }
    } catch (err) {
      toast.error("Failed to load breakdown records");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <button onClick={() => window.history.back()} className="btn btn-ghost btn-sm px-2 text-slate-500">
            ← Back
          </button>
          <WarningOutlined className="text-primary" />
          Breakdown Logbook
        </h1>
        <div className="flex gap-2">
          <Link to="/transport/breakdowns/new" className="btn btn-primary">
            <PlusOutlined /> New Breakdown Record
          </Link>
        </div>
      </div>

      <div className="card bg-base-100 shadow-sm border border-base-200">
        
                <div className="flex justify-end mb-4">
                  <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                </div>
                      {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Breakdown Logs",
            val: (breakdowns || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Breakdown Logs",
            val: (breakdowns || []).length,
            icon: <AlertTriangle size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Breakdown Logs",
            val: (breakdowns || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "PENDING_APPROVAL").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Breakdown Logs",
            val: (breakdowns || []).filter((x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "POSTED").length,
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

      <div className="overflow-x-auto">
          <table className={ "table table-zebra w-full " + (viewMode === 'grid' ? 'table-grid-mode' : '') }>
            <thead>
              <tr className="bg-base-200">
                <th>Defect Date</th>
                <th>Time</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th>Fuel Level</th>
                <th>Reported By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">Loading breakdowns...</td>
                </tr>
              ) : breakdowns.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">No breakdown records found</td>
                </tr>
              ) : (
                breakdowns.map((b) => (
                  <tr key={b.id}>
                    <td>{formatDate(b.defect_date)}</td>
                    <td>{b.breakdown_time || "N/A"}</td>
                    <td>
                      <div className="font-medium">{b.reg_number || "N/A"}</div>
                      <div className="text-xs text-slate-500">{b.make} {b.model}</div>
                    </td>
                    <td>{b.driver_name || "N/A"}</td>
                    <td>{b.fuel_level || "N/A"}</td>
                    <td>{b.reported_by || "N/A"}</td>
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
