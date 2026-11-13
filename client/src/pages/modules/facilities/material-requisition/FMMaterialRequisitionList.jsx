/**
 * @fileoverview MaterialRequisitionList component.
 * Provides functionality for MaterialRequisitionList.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, CheckCircle2, FileText, Clock, Building2 } from "lucide-react";
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
export default function FMMaterialRequisitionList() {
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
    api.get("/facilities/material-requisitions")
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
      await api.post(`/facilities/material-requisitions/${id}/submit`);
      toast.success("Confirmed");
      const res = await api.get("/facilities/material-requisitions");
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Confirm failed");
    } finally { setForwarding(false); }
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items.slice();
    return filterAndSort(items, { query: searchTerm, getKeys: (r) => [r.requisition_no, r.property_name, r.requested_by] });
  }, [items, searchTerm]);

  const { sorted, sortKey, sortDir, toggle } = useSort(filtered, "created_at", "desc");

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header bg-brand text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">FM Material Requisitions</h1>
              <p className="text-sm mt-1">Property material requests with approval workflow</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.history.back()} className="btn btn-secondary">Back</button>
              <Link to="/facilities/material-requisitions/new" className="btn-success flex items-center gap-2"><Plus size={16} />New Requisition</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Approved Requisitions",
            val: items.filter((r) => r.status === "APPROVED" || r.status === "CONFIRMED").length,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500",
          },
          {
            label: "Total Requisitions",
            val: items.length,
            icon: <FileText size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700",
          },
          {
            label: "Pending Approval",
            val: items.filter((r) => r.status === "PENDING" || r.status === "DRAFT" || !r.status).length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500",
          },
          {
            label: "Requesting Properties",
            val: new Set(items.map((r) => r.property_name || r.property_id).filter(Boolean)).size,
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
              <input type="text" placeholder="Search requisitions..." className="input"
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
                  <th>Property</th>
                  <th>Warehouse</th>
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
                    <td className="text-sm">{r.property_name || "—"}</td>
                    <td className="text-sm">{r.warehouse_name || "—"}</td>
                    <td><span className="text-xs font-semibold uppercase text-slate-600">{r.priority}</span></td>
                    <td><span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(r.status)}`}>{r.status}</span></td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => { setActiveDocId(r.id); setShowAttach(true); }}
                          className="px-2 py-1 text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200">Attach</button>
                        {r.status === "DRAFT" && (
                          <>
                            <Link to={`/facilities/material-requisitions/${r.id}`}
                              className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200">Edit</Link>
                            <button type="button" onClick={() => handleConfirm(r.id)} disabled={forwarding}
                              className="px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100">Confirm</button>
                          </>
                        )}
                        {(r.status === "PENDING_APPROVAL" || r.status === "APPROVED") && (
                          <Link to={`/facilities/material-requisitions/${r.id}?view=1`}
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
        docType="fm-material-requisition" docId={activeDocId} />
    </div>
  );
}
