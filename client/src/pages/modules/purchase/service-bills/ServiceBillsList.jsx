/**
 * @fileoverview ServiceBillsList component for Procurement module.
 * Provides functionality for listing, searching, filtering, and managing Service Bills in Procurement.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../../../api/client";
import { usePermission } from "../../../../auth/PermissionContext.jsx";
import { filterAndSort } from "@/utils/searchUtils.js";
import { toast } from "react-toastify";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";
import { FileText, Plus, Search, Eye, Edit, Trash2, Activity, Clock, CheckCircle2, Receipt } from "lucide-react";

export default function ServiceBillsList() {
  const [viewMode, setViewMode] = useViewMode();
  const location = useLocation();
  const { canPerformAction, exceptionalPerms } = usePermission();
  const successMsg = location.state?.success || "";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get("/purchase/service-bills")
      .then((res) => {
        setItems(Array.isArray(res?.data?.items) ? res.data.items : []);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message || "Failed to load service bills"
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const base =
      statusFilter === "ALL"
        ? items.slice()
        : items.filter(
            (r) => String(r.status || "").toUpperCase() === statusFilter
          );
    const q = String(searchTerm || "").trim();
    if (!q) return base;
    return filterAndSort(base, {
      query: q,
      getKeys: (r) => [r.bill_no, r.client_name, r.supplier_name],
    });
  }, [items, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="text-brand-600" size={26} />
            Service Bills (Procurement)
          </h1>
          <p className="text-sm mt-1 text-slate-500 dark:text-slate-400">
            Prepare, verify, and manage vendor service bills for contractor payments
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/purchase" className="btn btn-secondary">
            Return to Menu
          </Link>
          <Link to="/purchase/service-bills/new" className="btn btn-primary inline-flex items-center gap-1">
            <Plus size={16} /> New Bill
          </Link>
        </div>
      </div>

            {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Service Bills",
            val: (bills || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Service Bills",
            val: (bills || []).length,
            icon: <Receipt size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Service Bills",
            val: (bills || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "PENDING_APPROVAL").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Service Bills",
            val: (bills || []).filter((x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "POSTED").length,
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
          {successMsg ? (
            <div className="mb-3 p-3 rounded bg-green-50 border border-green-200 text-green-700 text-sm">
              {successMsg}
            </div>
          ) : null}

          {error ? (
            <div className="mb-3 text-sm text-red-600">{error}</div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by bill no, supplier, or notes..."
                className="input pl-9 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="POSTED">Posted</option>
              <option value="COMPLETED">Completed</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>

          <div className="flex justify-end mb-4">
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>

          <div className="overflow-x-auto">
            <table className={"table w-full " + (viewMode === "grid" ? "table-grid-mode" : "")}>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="whitespace-nowrap px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Bill No</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Date</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Supplier / Contractor</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Payment</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-bold text-xs uppercase tracking-wider text-slate-600">Total (GH₵)</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Status</th>
                  <th className="text-right whitespace-nowrap px-4 py-3 font-bold text-xs uppercase tracking-wider text-slate-600">Actions</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Created By</th>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Created Date</th>
                  <th className="whitespace-nowrap px-4 py-3 text-center font-bold text-xs uppercase tracking-wider text-slate-600">Attachments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="text-center py-8 text-slate-500 dark:text-slate-400 whitespace-nowrap"
                    >
                      Loading service bills...
                    </td>
                  </tr>
                ) : null}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan="10"
                      className="text-center py-8 text-slate-500 dark:text-slate-400 whitespace-nowrap"
                    >
                      No service bills found.
                    </td>
                  </tr>
                ) : null}

                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-brand-700 dark:text-brand-300">
                      {r.bill_no}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-400">
                      {r.bill_date ? String(r.bill_date).slice(0, 10) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {r.supplier_name || r.client_name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`badge ${
                          String(r.payment_status || "").toUpperCase() === "PAID"
                            ? "badge-success"
                            : "badge-warning"
                        }`}
                      >
                        {String(r.payment_status || "UNPAID").toUpperCase()}
                      </span>
                    </td>
                    <td className="text-right whitespace-nowrap px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {Number(r.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`badge ${
                          String(r.status || "").toUpperCase() === "POSTED"
                            ? "badge-info"
                            : String(r.status || "").toUpperCase() === "COMPLETED"
                            ? "badge-success"
                            : String(r.status || "").toUpperCase() === "PAID"
                            ? "badge-success"
                            : String(r.status || "").toUpperCase() === "OVERDUE"
                            ? "badge-error"
                            : "badge-warning"
                        }`}
                      >
                        {String(r.status || "").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/purchase/service-bills/${r.id}?mode=view`}
                          className="btn btn-secondary text-xs px-3 py-1 inline-flex items-center gap-1 font-semibold"
                        >
                          <Eye size={12} /> View
                        </Link>

                        {canPerformAction("purchase:service-bills", "edit") &&
                          String(r.payment_status || "").toUpperCase() !== "PAID" &&
                          String(r.status || "").toUpperCase() !== "POSTED" && (
                            <Link
                              to={`/purchase/service-bills/${r.id}?mode=edit`}
                              className="btn btn-secondary text-xs px-3 py-1 inline-flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700"
                            >
                              <Edit size={12} /> Edit
                            </Link>
                          )}

                        {canPerformAction("purchase:service-bills", "cancel") &&
                          String(r.payment_status || "").toUpperCase() !== "PAID" &&
                          exceptionalPerms?.has?.("SERVICE.BILL.CANCEL") && (
                            <button
                              type="button"
                              className="btn btn-danger text-xs px-3 py-1 inline-flex items-center gap-1 font-semibold"
                              onClick={() => {
                                if (!window.confirm("Cancel this bill?")) return;
                                api
                                  .put(`/purchase/service-bills/${r.id}`, { status: "CANCELLED" })
                                  .then(() => {
                                    toast.success("Service bill cancelled");
                                    setItems(
                                      items.map((i) =>
                                        i.id === r.id ? { ...i, status: "CANCELLED" } : i
                                      )
                                    );
                                  })
                                  .catch((err) => {
                                    toast.error(
                                      err?.response?.data?.message || "Failed to cancel service bill"
                                    );
                                  });
                              }}
                            >
                              <Trash2 size={12} /> Cancel
                            </button>
                          )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {r.created_by_username || r.created_by_name || "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <button
                        type="button"
                        className="text-brand hover:underline font-medium text-xs"
                        onClick={() => {
                          toast.info("Attachments functionality coming soon");
                        }}
                      >
                        View
                      </button>
                    </td>
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
