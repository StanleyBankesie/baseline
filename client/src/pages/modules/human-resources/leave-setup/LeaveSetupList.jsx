import { Activity, Clock, CheckCircle2, CalendarDays } from "lucide-react";
/**
 * @fileoverview LeaveSetupList component.
 * Provides functionality for LeaveSetupList.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

/**
 *  component
 * 
 * @returns {JSX.Element} The rendered component
 */
export default function LeaveSetupList() {
  const [viewMode, setViewMode] = useViewMode();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/hr/leave/types");
      setItems(res?.data?.items || []);
    } catch {
      toast.error("Failed to load leave types");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => window.history.back()} className="btn-secondary text-sm">
            Back
          </button>
          <h2 className="text-lg font-semibold">Leave Setup</h2>
        </div>
        <Link to="/human-resources/leave-setup/new" className="btn-primary">
          + New Leave Type
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded shadow-sm">
        
                <div className="flex justify-end mb-4">
                  <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                </div>
                      {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Leave Types",
            val: (leaveTypes || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Leave Types",
            val: (leaveTypes || []).length,
            icon: <CalendarDays size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Leave Types",
            val: (leaveTypes || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "PENDING_APPROVAL").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Leave Types",
            val: (leaveTypes || []).filter((x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "POSTED").length,
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
          <table className={ "min-w-full " + (viewMode === 'grid' ? 'table-grid-mode' : '') }>
            <thead className="bg-[var(--table-header-bg)] dark:bg-slate-900/50">
              <tr className="text-left bg-slate-50 dark:bg-slate-900/50">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type Name</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Days Per Year</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Paid</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created By</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created Date</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-2 font-medium">{r.type_name}</td>
                  <td className="px-4 py-2">{r.max_days}</td>
                  <td className="px-4 py-2">
                    {r.is_paid ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>}
                  </td>
                  <td className="px-4 py-2">{r.created_by_name || "-"}</td>
                  <td className="px-4 py-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-2 text-right">
                    <Link to={`/human-resources/leave-setup/${r.id}`} className="text-brand hover:underline text-sm">Edit</Link>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">No leave types configured</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}







