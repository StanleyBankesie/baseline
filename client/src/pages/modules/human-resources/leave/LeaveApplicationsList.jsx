import MobileMovingCarousel from "@/components/MobileMovingCarousel";
/**
 * @fileoverview LeaveApplicationsList component.
 * Provides functionality for LeaveApplicationsList.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";
import { CheckCircle2, Calendar, Clock, XCircle } from "lucide-react";

/**
 *  component
 * 
 * @returns {JSX.Element} The rendered component
 */
export default function LeaveApplicationsList() {
  const [viewMode, setViewMode] = useViewMode();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ q: "" });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await api.get("/hr/leave/my-requests");
        setItems(r.data?.items || []);
      } catch {
        toast.error("Failed to load leave requests");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = items.filter((r) => {
    const q = filter.q.trim().toLowerCase();
    if (!q) return true;
    return (
      String(r.type_name || "").toLowerCase().includes(q) ||
      String(r.start_date || "").includes(q) ||
      String(r.end_date || "").includes(q) ||
      String(r.status || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => window.history.back()} className="btn-secondary text-sm">
            ← Back
          </button>
          <h1 className="text-xl font-semibold">My Leave Applications</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="input"
            placeholder="Search"
            value={filter.q}
            onChange={(e) => setFilter({ q: e.target.value })}
          />
          <Link className="btn-primary" to="/human-resources/leave/applications/new">
            Make Request
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <MobileMovingCarousel data-page-carousel gridColsClass="md:grid-cols-4" gapClass="gap-4">
        {[
          {
            label: "Approved Requests",
            val: items.filter((r) => r.status === "APPROVED").length,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500",
          },
          {
            label: "Total Applications",
            val: items.length,
            icon: <Calendar size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700",
          },
          {
            label: "Pending Review",
            val: items.filter((r) => r.status === "PENDING" || !r.status).length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500",
          },
          {
            label: "Rejected / Cancelled",
            val: items.filter((r) => r.status === "REJECTED" || r.status === "CANCELLED").length,
            icon: <XCircle size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600",
          },
        ].map((stat, i) => {
          const colors = [
            "bg-sky-600 dark:bg-sky-500 text-white",
            "bg-brand-900 dark:bg-brand-700 text-white",
            "bg-amber-500 text-white",
            "bg-emerald-600 text-white",
          ];
          const colorClass = stat.color || colors[i % 4];

          return (
            <div
              key={i}
              className="card p-6 min-h-[160px] flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm"
            >
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                  {stat.val}
                </p>
              </div>
              <div className={`p-3 rounded-full ${colorClass} shadow-sm`}>
                {stat.icon}
              </div>
            </div>
          );
        })}</MobileMovingCarousel>

      <div className="bg-white dark:bg-slate-800 rounded shadow-sm overflow-auto">
        <div className="flex justify-end mb-4">
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
        <table className={"min-w-full " + (viewMode === 'grid' ? 'table-grid-mode' : '')}>
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr className="text-left">
              <th className="px-4 py-2 text-xs uppercase">Type</th>
              <th className="px-4 py-2 text-xs uppercase">Start</th>
              <th className="px-4 py-2 text-xs uppercase">End</th>
              <th className="px-4 py-2 text-xs uppercase">Days</th>
              <th className="px-4 py-2 text-xs uppercase">Status</th>
              <th className="px-4 py-2 text-xs uppercase">Created By</th>
              <th className="px-4 py-2 text-xs uppercase">Created Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2">{r.type_name || "-"}</td>
                <td className="px-4 py-2">{r.start_date}</td>
                <td className="px-4 py-2">{r.end_date}</td>
                <td className="px-4 py-2">{r.total_days}</td>
                <td className="px-4 py-2">
                  <span className={`badge ${r.status === 'SCHEDULED' ? 'badge-warning' : 'badge-info'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2">{r.created_by_name || "-"}</td>
                <td className="px-4 py-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
