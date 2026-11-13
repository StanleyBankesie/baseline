import { Activity, Clock, CheckCircle2, FileCheck } from "lucide-react";
/**
 * @fileoverview OffersList component.
 * Provides functionality for OffersList.
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
export default function OffersList() {
  const [viewMode, setViewMode] = useViewMode();
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await api.get("/hr/offers");
        if (mounted) setItems(res?.data?.items || []);
      } catch {
        toast.error("Failed to load offers");
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link to="/human-resources" className="btn-secondary text-sm">Back to Menu</Link>
          <h2 className="text-lg font-semibold">Offers</h2>
        </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Job Offers",
            val: (offers || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Job Offers",
            val: (offers || []).length,
            icon: <FileCheck size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Job Offers",
            val: (offers || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "SCHEDULED").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Job Offers",
            val: (offers || []).filter((x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "HIRED" || x.status === "PAID").length,
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

        <Link to="/human-resources/offers/new" className="btn-primary text-sm">
          Create Offer
        </Link>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded shadow-sm">
        <div className="flex justify-end mb-4">
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
        </div>
        <table className={"min-w-full " + (viewMode === 'grid' ? 'table-grid-mode' : '')}>
          <thead className="bg-[var(--table-header-bg)] dark:bg-slate-900/50">
            <tr className="text-left bg-slate-50 dark:bg-slate-900/50">
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Offer No</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Candidate</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Requisition</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Gross Salary</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Net Salary</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created By</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created Date</th>
              <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-3 py-2 font-medium">{it.offer_no}</td>
                <td className="px-3 py-2 text-sm">{it.offer_date ? it.offer_date.slice(0,10) : "-"}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{it.first_name || ""} {it.last_name || ""}</div>
                  <div className="text-xs text-slate-500">{it.email}</div>
                </td>
                <td className="px-3 py-2 text-sm">{it.title || it.requisition_title || ""}</td>
                <td className="px-3 py-2 text-right">
                  {Number(it.gross_salary || 0).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-medium text-brand">
                  {Number(it.net_salary || 0).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    it.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : 
                    it.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {it.status}
                  </span>
                </td>
                <td className="px-3 py-2">{it.created_by_name || "-"}</td>
                <td className="px-3 py-2">{it.created_at ? new Date(it.created_at).toLocaleDateString() : "-"}</td>
                <td className="px-3 py-2 text-right">
                  <Link to={`/human-resources/offers/${it.id}`} className="text-brand hover:underline text-sm font-medium">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {!items.length && !loading ? (
              <tr>
                <td className="px-3 py-10 text-center text-slate-500" colSpan={10}>
                  No offers found
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
