/**
 * @fileoverview MaterialRequisitionList component.
 * Provides functionality for MaterialRequisitionList.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ArrowLeft, Package, Search, Activity, Clock, CheckCircle2 } from "lucide-react";
import { api } from "../../../../api/client";
import { toast } from "react-toastify";
import { filterAndSort } from "@/utils/searchUtils.js";
import useSort from "@/hooks/useSort.js";
import SortableHeader from "@/components/SortableHeader.jsx";
import DocumentAttachmentsModal from "@/components/attachments/DocumentAttachmentsModal.jsx";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

/**
 *  component
 * 
 * @returns {JSX.Element} The rendered component
 */
export default function MaterialRequisitionList() {
  const [viewMode, setViewMode] = useViewMode();
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const [showAttach, setShowAttach] = useState(false);
  const [activeDocId, setActiveDocId] = useState(null);
  const [forwarding, setForwarding] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.get("/projects/material-requisitions")
      .then(res => { if (mounted) setItems(Array.isArray(res.data?.items) ? res.data.items : []); })
      .catch(e => setError(e?.response?.data?.message || "Failed to load"))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const getStatusBadge = (status) => {
    const b = { DRAFT: "bg-slate-100 text-slate-600", PENDING_APPROVAL: "bg-amber-50 text-amber-600", APPROVED: "bg-emerald-50 text-emerald-600", REJECTED: "bg-rose-50 text-rose-600", CANCELLED: "bg-rose-50 text-rose-600" };
    return b[status] || "bg-slate-100 text-slate-600";
  };

  const handleConfirm = async (id) => {
    setForwarding(true);
    try {
      await api.post(`/projects/material-requisitions/${id}/submit`);
      toast.success("Confirmed");
      const res = await api.get("/projects/material-requisitions");
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Confirm failed");
    } finally { setForwarding(false); }
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items.slice();
    return filterAndSort(items, { query: searchTerm, getKeys: (r) => [r.requisition_no, r.project_name, r.requested_by] });
  }, [items, searchTerm]);

  const { sorted, sortKey, sortDir, toggle } = useSort(filtered, "created_at", "desc");

  return (
    <div className="space-y-4">
      {/* Canonical Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5">
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Package size={24} className="text-brand-900 dark:text-brand-400" /> Material Requisitions
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Project material requests with stock reservation and approval workflow
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/project-management/material-requisitions/new" className="btn btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New Requisition
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Approved Requisitions",
            val: items.filter((r) => r.status === "APPROVED" || r.status === "CONFIRMED" || r.status === "ISSUED").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Requisitions",
            val: items.length,
            icon: <Package size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Requisitions",
            val: items.filter((r) => r.status === "PENDING" || r.status === "DRAFT" || r.status === "SUBMITTED").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Projects Requesting",
            val: new Set(items.map((r) => r.project_id || r.project_name).filter(Boolean)).size,
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
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="Search requisitions..." className="input pl-9 pr-3 py-1.5 text-sm h-auto w-full"
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
                  <SortableHeader label="Requisition No" sortKey="requisition_no" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                  <SortableHeader label="Date" sortKey="requisition_date" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                  <th>Project</th>
                  <th>Warehouse</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <SortableHeader label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="text-center py-8 text-slate-400">Loading...</td></tr>
                ) : sorted.length > 0 ? sorted.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium text-sm">{r.requisition_no}</td>
                    <td className="text-sm whitespace-nowrap">{r.requisition_date ? new Date(r.requisition_date).toLocaleDateString() : "—"}</td>
                    <td className="text-sm">{r.project_name || "—"}</td>
                    <td className="text-sm">{r.warehouse_name || "—"}</td>
                    <td className="text-sm">{r.department_name || "—"}</td>
                    <td><span className="text-xs font-semibold uppercase text-slate-600">{r.priority}</span></td>
                    <td><span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(r.status)}`}>{r.status}</span></td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => { setActiveDocId(r.id); setShowAttach(true); }}
                          className="px-2 py-1 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200">Attach</button>
                        {r.status === "DRAFT" && (
                          <>
                            <Link to={`/project-management/material-requisitions/${r.id}`}
                              className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200">Edit</Link>
                            <button type="button" onClick={() => handleConfirm(r.id)} disabled={forwarding}
                              className="px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100">Confirm</button>
                          </>
                        )}
                        {(r.status === "PENDING_APPROVAL" || r.status === "APPROVED") && (
                          <Link to={`/project-management/material-requisitions/${r.id}?view=1`}
                            className="px-2 py-1 text-xs font-medium text-brand bg-brand-50 border border-brand-200 rounded hover:bg-brand-100">View</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="8" className="text-center py-8 text-slate-400">No requisitions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <DocumentAttachmentsModal open={showAttach} onClose={() => { setShowAttach(false); setActiveDocId(null); }}
        docType="pm-material-requisition" docId={activeDocId} />
    </div>
  );
}
