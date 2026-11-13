import { Activity, Clock, CheckCircle2, GraduationCap } from "lucide-react";
/**
 * @fileoverview TrainingList component.
 * Provides functionality for TrainingList.
 */

import React from "react";
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
export default function TrainingList() {
  const [viewMode, setViewMode] = useViewMode();
  const [programs, setPrograms] = React.useState([]);

  const load = async () => {
    try {
      const res = await api.get("/hr/training/programs");
      setPrograms(res?.data?.items || []);
    } catch {
      toast.error("Failed to load training programs");
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link to="/human-resources" className="btn-secondary text-sm">Back to Menu</Link>
          <h2 className="text-lg font-semibold">Training Programs</h2>
        </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Training Sessions",
            val: (trainings || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Training Sessions",
            val: (trainings || []).length,
            icon: <GraduationCap size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Training Sessions",
            val: (trainings || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "SCHEDULED").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Training Sessions",
            val: (trainings || []).filter((x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "HIRED" || x.status === "PAID").length,
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

        <Link to="/human-resources/training/new" className="btn-primary text-sm">
          New Program
        </Link>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded">
        <div className="flex justify-end mb-4">
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
        <table className={"min-w-full " + (viewMode === 'grid' ? 'table-grid-mode' : '')}>
          <thead className="bg-[var(--table-header-bg)] dark:bg-slate-900/50">
            <tr className="text-left">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Code</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Title</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dates</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created By</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created Date</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.code}</td>
                <td className="px-3 py-2">{p.title}</td>
                <td className="px-3 py-2">
                  {p.start_date} - {p.end_date}
                </td>
                <td className="px-3 py-2">{p.created_by_name || "-"}</td>
                <td className="px-3 py-2">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "-"}</td>
              </tr>
            ))}
            {!programs.length ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm" colSpan={5}>
                  No programs
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
