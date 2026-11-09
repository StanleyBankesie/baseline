import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../../../api/client";
import { usePermission } from "../../../../auth/PermissionContext.jsx";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";
import {
  Plus,
  Search,
  FileCheck2,
  CheckCircle2,
  Clock,
  Wrench,
  Building2,
  Calendar,
  Eye,
  Edit,
  ArrowRight
} from "lucide-react";

const CACHE_KEY = "svc-confirmations-cache";
function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {}
}
function clearCache() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {}
}

export default function ServiceConfirmationsList() {
  const [viewMode, setViewMode] = useViewMode();
  const location = useLocation();
  const isPurchase = location.pathname.startsWith("/purchase");
  const modulePath = isPurchase ? "/purchase" : "/service-management";
  const newConfirmationPath = `${modulePath}/service-confirmations/new`;

  const [activeTab, setActiveTab] = useState("confirmed"); // "confirmed" | "orders" | "executions"
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [pendingExecutions, setPendingExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { canPerformAction } = usePermission();
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    clearCache();
    try {
      const [confRes, orderRes, execRes] = await Promise.all([
        api
          .get("/purchase/service-confirmations")
          .catch(() => ({ data: { items: [] } })),
        api
          .get(isPurchase ? "/purchase/procurement-service-requests" : "/purchase/service-orders", { params: { type: "EXTERNAL" } })
          .catch(() => ({ data: { items: [] } })),
        api
          .get("/purchase/service-executions", { params: { type: "EXTERNAL" } })
          .catch(() => ({ data: { items: [] } })),
      ]);
      if (!mountedRef.current) return;

      const confirmations = Array.isArray(confRes.data?.items)
        ? confRes.data.items
        : [];
      const allOrders = Array.isArray(orderRes.data?.items)
        ? orderRes.data.items
        : [];
      const allExecs = Array.isArray(execRes.data?.items)
        ? execRes.data.items
        : [];

      const pending = allOrders.filter(
        (o) => {
          const s = String(o.status || "").toUpperCase();
          return s !== "DONE" && s !== "COMPLETED";
        }
      ).map((o) => ({
        ...o,
        order_no: o.request_no || o.order_no,
        contractor_name: o.supplier_name || o.contractor_name,
      }));
      const pendingExec = allExecs.filter((e) =>
        ["POSTED", "APPROVED"].includes(String(e.status || "").toUpperCase()),
      );

      setItems(confirmations);
      setPendingOrders(pending);
      setPendingExecutions(pendingExec);

      writeCache({
        items: confirmations,
        pendingOrders: pending,
        pendingExecutions: pendingExec,
      });
    } catch (e) {
      if (!mountedRef.current) return;
      setError(
        e?.response?.data?.message || "Failed to load service confirmations",
      );
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => {
      mountedRef.current = false;
    };
  }, [loadData]);

  const q = searchTerm.trim().toLowerCase();
  const filter = (arr, fields) =>
    arr.filter(
      (r) =>
        !q ||
        fields.some((f) =>
          String(r[f] || "")
            .toLowerCase()
            .includes(q),
        ),
    );

  const filteredConfirmations = useMemo(
    () => filter(items, ["sc_no", "order_no", "supplier_name", "status", "bill_no"]),
    [items, q]
  );
  const filteredPendingOrders = useMemo(
    () => filter(pendingOrders, ["order_no", "customer_name", "contractor_name", "service_category", "status"]),
    [pendingOrders, q]
  );
  const filteredPendingExecs = useMemo(
    () => filter(pendingExecutions, ["execution_no", "order_no", "customer_name", "status"]),
    [pendingExecutions, q]
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileCheck2 size={22} />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Service Confirmations
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Certify vendor service completion, inspect deliverables, and auto-generate Purchase Bills upon sign-off.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={modulePath}
            className="btn btn-secondary text-xs py-2 px-3.5"
          >
            Return to Menu
          </Link>
          <Link
            to={newConfirmationPath}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-4 shadow-sm font-semibold"
          >
            <Plus size={15} /> New Confirmation
          </Link>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("confirmed")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
              activeTab === "confirmed"
                ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 size={13} className="text-emerald-500" />
            Confirmed Orders
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
              activeTab === "orders"
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900"
            }`}
          >
            <Clock size={13} className="text-amber-500" />
            {isPurchase ? "Pending Service Requests" : "Pending Service Orders"}
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
              {pendingOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("executions")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
              activeTab === "executions"
                ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900"
            }`}
          >
            <Wrench size={13} className="text-blue-500" />
            Pending Executions
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
              {pendingExecutions.length}
            </span>
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SC no, order, vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 text-xs w-full py-1.5"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Main Table Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading service confirmations...</div>
        ) : activeTab === "confirmed" ? (
          filteredConfirmations.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <FileCheck2 size={36} className="mx-auto opacity-40 text-emerald-500" />
              <p className="text-sm font-semibold">No confirmed service orders found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Completed service orders and inspections will appear here once verified and confirmed.
              </p>
              <Link
                to={newConfirmationPath}
                className="mt-2 btn btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <Plus size={13} /> Create Confirmation
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">SC Number</th>
                    <th className="px-4 py-3">Order / Request No</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-4 py-3">Supplier / Contractor</th>
                    <th className="px-3 py-3 text-right">Total Amount (GH₵)</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredConfirmations.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-brand-700 dark:text-brand-300 whitespace-nowrap">
                        {c.sc_no}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                        {c.order_no || "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {c.sc_date ? String(c.sc_date).slice(0, 10) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {c.supplier_name || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {Number(c.total_amount || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {c.status || "CONFIRMED"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`${newConfirmationPath}?confirmation_id=${c.id}&mode=view`}
                            className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                          >
                            <Eye size={12} /> View
                          </Link>
                          <Link
                            to={`${newConfirmationPath}?confirmation_id=${c.id}&mode=edit`}
                            className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1 text-slate-700 dark:text-slate-200"
                          >
                            <Edit size={12} /> Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === "orders" ? (
          filteredPendingOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Clock size={36} className="mx-auto opacity-40 text-amber-500" />
              <p className="text-sm font-semibold">{isPurchase ? "No pending service requests ready for confirmation" : "No pending service orders ready for confirmation"}</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All approved service requests have been confirmed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">{isPurchase ? "Request Number" : "Order Number"}</th>
                    <th className="px-3 py-3">{isPurchase ? "Request Date" : "Order Date"}</th>
                    <th className="px-4 py-3">{isPurchase ? "Supplier / Contractor" : "Customer / Contractor"}</th>
                    <th className="px-3 py-3 text-right">Amount (GH₵)</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPendingOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-300 whitespace-nowrap">
                        {o.order_no}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {o.order_date ? String(o.order_date).slice(0, 10) : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {o.contractor_name || o.customer_name || "-"}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {Number(o.total_amount || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          {o.status || "PENDING"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`${newConfirmationPath}?order_id=${o.id}`}
                          className="btn btn-primary text-xs px-3 py-1 inline-flex items-center gap-1 font-semibold"
                        >
                          Confirm Service <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredPendingExecs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Wrench size={36} className="mx-auto opacity-40 text-blue-500" />
              <p className="text-sm font-semibold">No pending service executions</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active external service executions awaiting confirmation.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Execution No</th>
                    <th className="px-4 py-3">Order No</th>
                    <th className="px-4 py-3">Customer / Contractor</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPendingExecs.map((e) => (
                    <tr
                      key={e.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-bold text-brand-700 dark:text-brand-300 whitespace-nowrap">
                        {e.execution_no}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-200">
                        {e.order_no || "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                        {e.customer_name || "-"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`${newConfirmationPath}?execution_id=${e.id}`}
                          className="btn btn-primary text-xs px-3 py-1 inline-flex items-center gap-1 font-semibold"
                        >
                          Confirm Execution <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
