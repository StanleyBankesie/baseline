/**
 * @fileoverview MaterialReceiptList component.
 * Provides functionality for MaterialReceiptList.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw, Package, CheckCircle2, Clock, Building2 } from "lucide-react";
import { api } from "../../../../api/client";
import { toast } from "react-toastify";
import { filterAndSort } from "@/utils/searchUtils.js";
import useSort from "@/hooks/useSort.js";
import SortableHeader from "@/components/SortableHeader.jsx";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

/**
 *  component
 * 
 * @returns {JSX.Element} The rendered component
 */
export default function FMMaterialReceiptList() {
  const [viewMode, setViewMode] = useViewMode();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [pendingIssues, setPendingIssues] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    let mounted = true;
    setLoading(true);
    try {
      const [res, pendRes] = await Promise.all([
        api.get("/facilities/material-receipts"),
        api.get("/facilities/issue-to-requirement/fm")
      ]);
      if (mounted) {
        setItems(Array.isArray(res.data?.items) ? res.data.items : []);
        const allPending = Array.isArray(pendRes.data?.items) ? pendRes.data.items : [];
        const projectPending = allPending.filter(
          (iss) => (iss.department_name || "").toLowerCase().includes("facilit"),
        );
        setPendingIssues(projectPending.length);
      }
    } catch (e) {
      if (mounted) setError(e?.response?.data?.message || "Failed to load");
    } finally {
      if (mounted) setLoading(false);
    }
    return () => { mounted = false; };
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items.slice();
    return filterAndSort(items, { query: searchTerm, getKeys: (r) => [r.receipt_no, r.warehouse_name, r.department_name] });
  }, [items, searchTerm]);

  const { sorted, sortKey, sortDir, toggle } = useSort(filtered, "created_at", "desc");

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header bg-brand text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">FM Materials Receipt</h1>
              <p className="text-sm mt-1">Receive materials issued from Inventory (Facilities Management department)</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.history.back()} className="btn btn-secondary">Back</button>
              <button onClick={loadData} className="btn btn-secondary p-2" title="Refresh"><RefreshCw size={16} /></button>
              <Link to="/facilities/material-receipts/new" className="btn-success flex items-center gap-2"><Plus size={16} />Receive{pendingIssues > 0 ? ` (${pendingIssues})` : ""}</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Processed Receipts",
            val: items.filter((r) => r.status === "PROCESSED" || r.status === "CONFIRMED").length,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500",
          },
          {
            label: "Total Receipts",
            val: items.length,
            icon: <Package size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700",
          },
          {
            label: "Pending Issues",
            val: pendingIssues,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500",
          },
          {
            label: "Warehouses Linked",
            val: new Set(items.map((r) => r.warehouse_name || r.warehouse_id).filter(Boolean)).size,
            icon: <Building2 size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm"
          >
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
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <input type="text" placeholder="Search receipts..." className="input"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>

          
                <div className="flex justify-end mb-4">
                  <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                </div>
                <div className="overflow-x-auto">
            <table className={"table " + (viewMode === 'grid' ? 'table-grid-mode' : '')}>
              <thead>
                <tr>
                  <SortableHeader label="Receipt No" sortKey="receipt_no" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                  <SortableHeader label="Date" sortKey="receipt_date" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                  <th>Warehouse</th>
                  <SortableHeader label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-8 text-slate-400">Loading...</td></tr>
                ) : sorted.length > 0 ? sorted.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium text-sm">{r.receipt_no}</td>
                    <td className="text-sm whitespace-nowrap">{r.receipt_date ? new Date(r.receipt_date).toLocaleDateString() : "—"}</td>
                    <td className="text-sm">{r.warehouse_name || "—"}</td>
                    <td><span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600">{r.status}</span></td>
                    <td className="text-center">
                      <Link to={`/facilities/material-receipts/${r.id}`}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 inline-block">View</Link>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" className="text-center py-8 text-slate-400">
                    {pendingIssues > 0 ? `${pendingIssues} pending issue(s) from inventory. Create a receipt to receive them.` : "No receipts found."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
