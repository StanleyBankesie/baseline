import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../../api/client";
import { usePermission } from "../../../../auth/PermissionContext.jsx";
import {
  Plus,
  Search,
  FileCheck2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Eye,
  FileText
} from "lucide-react";

export default function ServiceConfirmationsList() {
  const newConfirmationPath = "/purchase/service-confirmations/new";

  const [activeTab, setActiveTab] = useState("confirmed"); // "confirmed" | "requests"
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { canPerformAction } = usePermission();
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [confRes, reqRes] = await Promise.all([
        api.get("/purchase/service-confirmations").catch(() => ({ data: { items: [] } })),
        api.get("/purchase/procurement-service-requests").catch(() => ({ data: { items: [] } })),
      ]);

      if (!mountedRef.current) return;

      const confirmations = Array.isArray(confRes.data?.items) ? confRes.data.items : [];
      const allRequests = Array.isArray(reqRes.data?.items) ? reqRes.data.items : [];

      const pending = allRequests.filter((r) => {
        const s = String(r.status || "").toUpperCase();
        return s !== "DONE" && s !== "CANCELLED";
      });

      setItems(confirmations);
      setPendingRequests(pending);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e?.response?.data?.message || "Failed to load data");
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

  const filtered = useMemo(() => {
    return items.filter((c) => {
      const q = searchTerm.toLowerCase();
      return (
        String(c.sc_no || "").toLowerCase().includes(q) ||
        String(c.order_no || "").toLowerCase().includes(q) ||
        String(c.supplier_name || "").toLowerCase().includes(q) ||
        String(c.status || "").toLowerCase().includes(q)
      );
    });
  }, [items, searchTerm]);

  const filteredPendingRequests = useMemo(() => {
    return pendingRequests.filter((r) => {
      const q = searchTerm.toLowerCase();
      return (
        String(r.request_no || "").toLowerCase().includes(q) ||
        String(r.supplier_name || r.contractor_name || "").toLowerCase().includes(q) ||
        String(r.service_category || "").toLowerCase().includes(q) ||
        String(r.status || "").toLowerCase().includes(q)
      );
    });
  }, [pendingRequests, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileCheck2 className="text-brand-600 dark:text-brand-400" size={26} />
            Service Confirmations (Procurement)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Certify delivered outside services from procurement service requests & verify for payment
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/purchase?section=Procurement"
            className="btn btn-secondary text-sm font-semibold py-2 px-3.5"
          >
            Return to Menu
          </Link>
          <Link
            to={newConfirmationPath}
            className="btn btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold shadow-sm"
          >
            <Plus size={16} /> New Service Confirmation
          </Link>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs without background wrapper */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("confirmed")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
              activeTab === "confirmed"
                ? "bg-brand text-white border-brand shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            Confirmed Services ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
              activeTab === "requests"
                ? "bg-brand text-white border-brand shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            Pending Service Requests ({pendingRequests.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            className="input pl-9 text-sm w-full"
            placeholder="Search confirmations, requests, vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Content Card */}
      <div className="card">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Clock className="animate-spin inline-block mr-2" size={20} />
            Loading records...
          </div>
        ) : activeTab === "confirmed" ? (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">SC No</th>
                  <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Service Request</th>
                  <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Supplier / Contractor</th>
                  <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider text-slate-600">Total (GH₵)</th>
                  <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Status</th>
                  <th className="px-4 py-3 text-center font-bold text-xs uppercase tracking-wider text-slate-600">Actions</th>
                  <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Created By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12 text-slate-400">
                      No confirmed service records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold text-brand-700 dark:text-brand-300 whitespace-nowrap">
                        {c.sc_no}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-200">
                        {c.order_no || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {c.sc_date ? String(c.sc_date).slice(0, 10) : "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {c.supplier_name || "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {Number(c.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="badge badge-success text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {c.status || "CONFIRMED"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            to={`/purchase/service-confirmations/${c.id}?mode=view`}
                            className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1 font-semibold"
                          >
                            <Eye size={12} /> View
                          </Link>
                          {String(c.status || "").toUpperCase() !== "APPROVED" && (
                            <Link
                              to={`/purchase/service-confirmations/${c.id}?mode=edit`}
                              className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700"
                            >
                              Edit
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {c.created_by_name || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Request No</th>
                  <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Supplier / Contractor</th>
                  <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Category</th>
                  <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Department</th>
                  <th className="px-4 py-3 text-left font-bold text-xs uppercase tracking-wider text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-bold text-xs uppercase tracking-wider text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-slate-400">
                      No pending procurement service requests waiting for confirmation.
                    </td>
                  </tr>
                ) : (
                  filteredPendingRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold text-brand-700 dark:text-brand-300 whitespace-nowrap">
                        {r.request_no}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {r.request_date ? String(r.request_date).slice(0, 10) : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {r.supplier_name || r.contractor_name || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {r.service_category || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {r.department || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {r.status || "PENDING"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          to={`${newConfirmationPath}?request_id=${r.id}`}
                          className="btn btn-primary text-xs px-3 py-1 inline-flex items-center gap-1 font-semibold"
                        >
                          Confirm Service <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
