import { Activity, Clock, CheckCircle2, CheckSquare } from "lucide-react";
/**
 * @fileoverview TransferAcceptanceList component.
 * Provides functionality for TransferAcceptanceList.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "api/client";
import { filterAndSort } from "@/utils/searchUtils.js";
import { toast } from "react-toastify";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

/**
 *  component
 * 
 * @returns {JSX.Element} The rendered component
 */
export default function TransferAcceptanceList() {
  const [viewMode, setViewMode] = useViewMode();
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);

  const handleConfirmDirect = async (id, transferNo) => {
    setConfirmingId(id);
    setError("");
    try {
      await api.put(`/inventory/transfer-acceptance/${id}`, {});
      toast.success(`Transfer ${transferNo} confirmed successfully!`);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to confirm transfer");
    } finally {
      setConfirmingId(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    api
      .get("/inventory/transfer-acceptance")
      .then((res) => {
        if (!mounted) return;
        setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Failed to load transfers");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items.slice();
    return filterAndSort(items, {
      query: searchTerm,
      getKeys: (t) => [
        t.transfer_no,
        t.from_warehouse_name || t.from_warehouse_id,
        t.to_warehouse_name || t.to_warehouse_id,
        t.status,
      ],
    });
  }, [items, searchTerm]);

  return (
    <div className="space-y-6">
            {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Transfer Receipts",
            val: (items || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Transfer Receipts",
            val: (items || []).length,
            icon: <CheckSquare size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Transfer Receipts",
            val: (items || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "PENDING_APPROVAL").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Transfer Receipts",
            val: (items || []).filter((x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "POSTED").length,
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
        <div className="card-header bg-brand text-white rounded-t-lg">
          <div className="flex justify-between items-center text-white">
            <div>
              <h1 className="text-2xl font-bold dark:text-brand-300">
                Transfer Acceptance
              </h1>
              <p className="text-sm mt-1">Receive transferred stock</p>
            </div>
            <Link to="/inventory?section=Stock%20Operations" className="btn btn-secondary">
              Return to Menu
            </Link>
          </div>
        </div>

        <div className="card-body">
          {error ? (
            <div className="text-sm text-red-600 mb-4">{error}</div>
          ) : null}

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by transfer no, from warehouse, status..."
              className="input max-w-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          
                <div className="flex justify-end mb-4">
                  <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                </div>
                <div className="overflow-x-auto">
            <table className={"table " + (viewMode === 'grid' ? 'table-grid-mode' : '')}>
              <thead>
                <tr>
                  <th>Transfer No</th>
                  <th>Date</th>
                  <th>From Warehouse</th>
                  <th>To Warehouse</th>
                  <th>Status</th>
                  <th>Actions</th>
                                <th>Created By</th>
                <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-8 text-slate-500 dark:text-slate-400"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : null}

                {!loading && !filtered.length ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-8 text-slate-500 dark:text-slate-400"
                    >
                      No transfers available for acceptance
                    </td>
                  </tr>
                ) : null}

                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td className="font-medium text-brand-700 dark:text-brand-300">
                      {t.transfer_no}
                    </td>
                    <td>
                      {t.transfer_date
                        ? String(t.transfer_date).slice(0, 10)
                        : "-"}
                    </td>
                    <td>
                      {t.from_warehouse_name || t.from_warehouse_id || "-"}
                    </td>
                    <td>{t.to_warehouse_name || t.to_warehouse_id || "-"}</td>
                    <td>
                      <span
                        className={`badge ${
                          t.status === "TRANSFERRED" || t.status === "RECEIVED"
                            ? "badge-success"
                            : ["IN_TRANSIT", "IN TRANSIT", "PARTIALLY_RECEIVED"].includes(t.status)
                            ? "badge-warning"
                            : t.status === "CANCELLED"
                            ? "badge-error"
                            : "badge-info"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Link
                          to={`/inventory/transfer-acceptance/${t.id}`}
                          className="inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-full hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                          Open
                        </Link>
                        {!["TRANSFERRED", "RECEIVED", "CANCELLED"].includes(t.status) && (
                          <button
                            type="button"
                            onClick={() => handleConfirmDirect(t.id, t.transfer_no)}
                            disabled={confirmingId === t.id}
                            className="inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium text-white bg-green-600 border border-transparent rounded-full hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {confirmingId === t.id ? "Confirming..." : "Confirm"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>{t.created_by_name || "-"}</td>
                    <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
