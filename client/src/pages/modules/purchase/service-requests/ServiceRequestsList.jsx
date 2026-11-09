import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../../api/client.js";
import { usePermission } from "../../../../auth/PermissionContext.jsx";
import { toast } from "react-toastify";
import {
  Plus,
  Search,
  Wrench,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  Eye,
  Edit,
  Building2,
  Calendar,
  AlertCircle
} from "lucide-react";

export default function ServiceRequestsList() {
  const navigate = useNavigate();
  const { hasExceptional } = usePermission();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get("/purchase/procurement-service-requests");
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load procurement service requests");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        String(item.status || "").toUpperCase() === statusFilter;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        (item.request_no && item.request_no.toLowerCase().includes(term)) ||
        (item.supplier_name && item.supplier_name.toLowerCase().includes(term)) ||
        (item.contractor_name && item.contractor_name.toLowerCase().includes(term)) ||
        (item.service_category && item.service_category.toLowerCase().includes(term)) ||
        (item.department && item.department.toLowerCase().includes(term)) ||
        (item.requisition_no && item.requisition_no.toLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [items, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    return {
      all: items.length,
      draft: items.filter((i) => i.status === "DRAFT").length,
      pending: items.filter((i) => i.status === "PENDING").length,
      approved: items.filter((i) => i.status === "APPROVED").length,
      done: items.filter((i) => i.status === "DONE").length,
    };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Wrench size={22} />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Service Requests (Procurement)
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Contractor work orders, outside facilities maintenance, and service procurement. Directly populated from approved service requisitions without passing through RFQ and supplier quote.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/purchase?section=Procurement"
            className="btn btn-secondary text-xs py-2 px-3.5 font-semibold"
          >
            Return to Menu
          </Link>
          <Link
            to="/purchase/service-requests/new"
            className="btn btn-primary inline-flex items-center gap-2 text-xs py-2 px-4 shadow-sm font-semibold"
          >
            <Plus size={15} /> New Service Request
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
          {[
            { key: "ALL", label: "All Requests", count: stats.all },
            { key: "PENDING", label: "Pending", count: stats.pending },
            { key: "APPROVED", label: "Approved", count: stats.approved },
            { key: "DONE", label: "Completed", count: stats.done },
            { key: "DRAFT", label: "Drafts", count: stats.draft },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.key
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/70 dark:bg-slate-700">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search request, supplier, SOW..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 text-xs w-full py-1.5"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading service requests...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-500">{error}</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <FileText size={36} className="mx-auto opacity-40" />
            <p className="text-sm font-semibold">No procurement service requests found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create a new service request directly or populate one instantly from an approved Service Requisition.
            </p>
            <Link
              to="/purchase/service-requests/new"
              className="mt-2 btn btn-secondary text-xs inline-flex items-center gap-1.5"
            >
              <Plus size={13} /> Create Service Request
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Request No & Date</th>
                  <th className="px-4 py-3">Supplier / Contractor</th>
                  <th className="px-4 py-3">Service Category & SOW</th>
                  <th className="px-3 py-3">Requisition Source</th>
                  <th className="px-3 py-3">Target Dates</th>
                  <th className="px-3 py-3 text-right">Amount (GH₵)</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.request_no}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.request_date ? String(item.request_date).slice(0, 10) : "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <Building2 size={13} className="text-slate-400" />
                        <span>{item.supplier_name || item.contractor_name || "Unassigned"}</span>
                      </div>
                      {item.contractor_phone && (
                        <div className="text-[10px] text-slate-400">{item.contractor_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {item.service_category || "General Services"}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.scope_of_work || "No scope notes"}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {item.requisition_no ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded-md border border-brand-200/50">
                          {item.requisition_no}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Direct Request</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-[11px] text-slate-600 dark:text-slate-300">
                      <div>Start: {item.start_date ? String(item.start_date).slice(0, 10) : "Immediate"}</div>
                      <div className="text-slate-400">End: {item.end_date ? String(item.end_date).slice(0, 10) : "TBD"}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {Number(item.total_amount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          item.status === "DONE" || item.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : item.status === "PENDING"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/purchase/service-requests/${item.id}`}
                          className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                          title="View / Edit Details"
                        >
                          <Eye size={12} /> View
                        </Link>
                        {item.status === "APPROVED" && (
                          <Link
                            to={`/purchase/service-confirmations/new?order_id=${item.id}`}
                            className="btn btn-primary text-xs px-2.5 py-1 inline-flex items-center gap-1 font-semibold"
                            title="Confirm Completed Service & Auto-create Bill"
                          >
                            <CheckCircle2 size={12} /> Confirm Service
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
