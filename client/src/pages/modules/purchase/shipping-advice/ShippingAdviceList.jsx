/**
 * @fileoverview ShippingAdviceList component.
 * Provides functionality for ShippingAdviceList.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "api/client";
import { usePermission } from "../../../../auth/PermissionContext.jsx";
import { filterAndSort } from "@/utils/searchUtils.js";
import useSort from "@/hooks/useSort.js";
import SortableHeader from "@/components/SortableHeader.jsx";
import { toast } from "react-toastify";
import { Trash2, Activity, Clock, CheckCircle2, Ship } from "lucide-react";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

/**
 *  component
 * 
 * @returns {JSX.Element} The rendered component
 */
export default function ShippingAdviceList() {
  const [viewMode, setViewMode] = useViewMode();
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);
  const { canPerformAction, ensurePagePerms, hasExceptional } = usePermission();
  const [exceptionalAllowed, setExceptionalAllowed] = useState(false);
  const [cancelDenied, setCancelDenied] = useState(false);

  useEffect(() => {
    try {
      const path =
        (typeof window !== "undefined" &&
          window.location &&
          window.location.pathname) ||
        "/purchase/shipping-advice";
      ensurePagePerms && ensurePagePerms(path);
    } catch {}
  }, [ensurePagePerms]);

  useEffect(() => {
    let cancelled = false;
    async function checkExceptional() {
      try {
        const me = await api.get("/admin/me");
        const uid = Number(me?.data?.user?.id || me?.data?.user?.sub || 0);
        if (!uid || cancelled) return;
        const resp = await api.get(
          `/admin/users/${uid}/exceptional-permissions`,
        );
        const items = Array.isArray(resp?.data?.data?.items)
          ? resp.data.data.items
          : Array.isArray(resp?.data?.items)
            ? resp.data.items
            : [];
        let allowed = items.some((p) => {
          const effect = String(p.effect || "").toUpperCase();
          const active = Number(p.is_active || p.isActive) === 1;
          const code = String(
            p.permission_code || p.permissionCode || "",
          ).toUpperCase();
          const codeOk = code === "PURCHASE.SHIPPING_ADVICE.CANCEL";
          return effect === "ALLOW" && active && codeOk;
        });
        const denied = items.some((p) => {
          const effect = String(p.effect || "").toUpperCase();
          const active = Number(p.is_active || p.isActive) === 1;
          const code = String(
            p.permission_code || p.permissionCode || "",
          ).toUpperCase();
          return (
            effect === "DENY" &&
            active &&
            code === "PURCHASE.SHIPPING_ADVICE.CANCEL"
          );
        });
        if (!allowed) {
          allowed = items.some((p) => {
            const effect = String(p.effect || "").toUpperCase();
            const active = Number(p.is_active || p.isActive) === 1;
            return effect === "ALLOW" && active;
          });
        }
        if (!cancelled) setExceptionalAllowed(allowed);
        if (!cancelled) setCancelDenied(denied);
      } catch {
        if (!cancelled) setExceptionalAllowed(false);
        if (!cancelled) setCancelDenied(false);
      }
    }
    checkExceptional();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    api
      .get("/purchase/shipping-advices")
      .then((res) => {
        if (!mounted) return;
        setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(
          e?.response?.data?.message || "Failed to load shipping advice",
        );
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: "badge-info",
      IN_TRANSIT: "badge-warning",
      ARRIVED: "badge-success",
      CLEARED: "badge-success",
      CANCELLED: "badge-error",
    };
    return badges[status] || "badge-info";
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return items.slice();
    return filterAndSort(items, {
      query: searchTerm,
      getKeys: (r) => [r.advice_no, r.po_no, r.bill_of_lading],
    });
  }, [items, searchTerm]);

  const { sorted: sortedFiltered, sortKey, sortDir, toggle } = useSort(filtered, "created_at", "desc");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Shipping Advice
          </h1>
          <p className="text-sm mt-1">Track shipments and vessel information</p>
        </div>
        <div className="flex gap-2 items-center">
          <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          <Link to="/purchase?section=Procurement" className="btn btn-secondary">
            Return to Menu
          </Link>
          <Link to="/purchase/shipping-advice/new" className="btn-success">
            + New Shipping Advice
          </Link>
        </div>
      </div>

            {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Shipping Advices",
            val: (items || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Shipping Advices",
            val: (items || []).length,
            icon: <Ship size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Shipping Advices",
            val: (items || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "PENDING_APPROVAL").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Shipping Advices",
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by advice no / PO / vessel..."
                className="input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card-body overflow-x-auto">
          <table className={"table " + (viewMode === 'grid' ? 'table-grid-mode' : '')}>
            <thead>
              <tr>
                <SortableHeader label="Advice No" sortKey="advice_no" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                <SortableHeader label="Date" sortKey="advice_date" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                <SortableHeader label="PO" sortKey="po_no" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                <SortableHeader label="Supplier" sortKey="supplier_name" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                <SortableHeader label="ETD" sortKey="etd_date" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                <SortableHeader label="ETA" sortKey="eta_date" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                <SortableHeader label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                <th>Actions</th>
                <SortableHeader label="Created By" sortKey="created_by_name" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
              <SortableHeader label="Created Date" sortKey="created_at" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
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
              ) : error ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-red-600">
                    {error}
                  </td>
                </tr>
              ) : null}

              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="text-center py-8 text-slate-500 dark:text-slate-400"
                  >
                    No records
                  </td>
                </tr>
              ) : (
                sortedFiltered.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.advice_no}</td>
                    <td>
                      {r.advice_date
                        ? new Date(r.advice_date).toLocaleDateString()
                        : ""}
                    </td>
                    <td>{r.po_no}</td>
                    <td>{r.supplier_name}</td>
                    <td>
                      {r.etd_date
                        ? new Date(r.etd_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>
                      {r.eta_date
                        ? new Date(r.eta_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Slot 1: View */}
                        <div className="min-w-[80px]">
                          <Link
                            to={`/purchase/shipping-advice/${r.id}?mode=view`}
                            className="w-full inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors h-9"
                          >
                            View
                          </Link>
                        </div>
                        {/* Slot 2: Edit */}
                        <div className="min-w-[80px]">
                          <Link
                            to={`/purchase/shipping-advice/${r.id}?mode=edit`}
                            className="w-full inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors h-9"
                          >
                            Edit
                          </Link>
                        </div>
                        {/* Slot 3: Cancel */}
                        {(hasExceptional("PURCHASE.SHIPPING_ADVICE.CANCEL") && !r.has_clearing) ? (
                          <div className="min-w-[100px]">
                            <button
                              type="button"
                              className="w-full inline-flex items-center justify-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-[#A30000] border border-[#A30000] rounded-lg hover:bg-[#7B0000] hover:border-[#7B0000] transition-colors h-9"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    `Cancel this Shipping Advice (${r.advice_no})?`,
                                  )
                                )
                                  return;
                                try {
                                  await api.delete(
                                    `/purchase/shipping-advices/${r.id}`,
                                  );
                                  toast.success("Shipping advice cancelled");
                                  setItems((prev) =>
                                    prev.filter((x) => x.id !== r.id),
                                  );
                                } catch (e) {
                                  toast.error(
                                    e?.response?.data?.message ||
                                      "Unable to cancel shipping advice",
                                  );
                                }
                              }}
                              title="Cancel this shipping advice"
                            >
                              <Trash2 className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="w-full h-9" />
                        )}
                      </div>
                    </td>
                    <td>{r.created_by_name || "-"}</td>
                    <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"}</td>
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
