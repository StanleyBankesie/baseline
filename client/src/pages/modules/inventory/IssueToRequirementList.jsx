/**
 * @fileoverview IssueToRequirementList component.
 * Provides functionality for IssueToRequirementList and browsing New Requisitions awaiting issue.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  Clock,
  CheckCircle2,
  PackageCheck,
  ClipboardList,
  Plus,
  ArrowRight,
  RefreshCw,
  Search,
  Building,
  Warehouse,
  User,
  ArrowLeft
} from "lucide-react";

import { api } from "api/client";
import { toast } from "react-toastify";
import FloatingCreateButton from "@/components/FloatingCreateButton.jsx";
import DocumentAttachmentsModal from "@/components/attachments/DocumentAttachmentsModal.jsx";
import { usePermission } from "@/auth/PermissionContext.jsx";
import {
  ListPrintIconButton,
  ListPdfIconButton,
  ListAttachmentIconButton,
} from "@/components/list/ListDocActionIconButtons.jsx";
import { filterAndSort } from "@/utils/searchUtils.js";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

/**
 * IssueToRequirementList component
 *
 * @returns {JSX.Element} The rendered component
 */
export default function IssueToRequirementList() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useViewMode();
  const { canReverseApproval } = usePermission();
  const [searchTerm, setSearchTerm] = useState("");

  const [activeTab, setActiveTab] = useState("issues"); // "issues" | "requisitions"
  const [loading, setLoading] = useState(false);
  const [loadingRequisitions, setLoadingRequisitions] = useState(false);
  const [error, setError] = useState("");
  const [docs, setDocs] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [showAttach, setShowAttach] = useState(false);
  const [activeDocId, setActiveDocId] = useState(null);

  // Fetch Material Issues
  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = () => {
    setLoading(true);
    setError("");

    api
      .get("/inventory/issue-to-requirement")
      .then((res) => {
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setDocs(items);
        fetchPendingRequisitions(items);
      })
      .catch((e) => {
        setError(e?.response?.data?.message || "Failed to load issues");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Fetch Requisitions that are yet to be issued
  const fetchPendingRequisitions = async (currentDocs = docs) => {
    setLoadingRequisitions(true);
    try {
      const [invReqRes, maintReqRes, pmReqRes, prodReqRes] = await Promise.all([
        api.get("/inventory/material-requisitions").catch(() => ({ data: { items: [] } })),
        api.get("/maintenance/material-requisitions").catch(() => ({ data: { items: [] } })),
        api.get("/projects/material-requisitions").catch(() => ({ data: { items: [] } })),
        api.get("/production/execution/material-requisition").catch(() => ({ data: { items: [] } })),
      ]);

      const invItems = Array.isArray(invReqRes.data?.items) ? invReqRes.data.items : [];
      const maintItems = Array.isArray(maintReqRes.data?.items) ? maintReqRes.data.items : [];
      const pmItems = Array.isArray(pmReqRes.data?.items) ? pmReqRes.data.items : [];
      const prodItems = Array.isArray(prodReqRes.data?.items)
        ? prodReqRes.data.items
        : Array.isArray(prodReqRes.data)
          ? prodReqRes.data
          : [];

      // Identify already issued requisition IDs from existing docs
      const issuedIds = new Set(
        (currentDocs || []).map((d) => String(d.requisition_id || "")).filter(Boolean)
      );

      const normalized = [
        ...invItems.map((r) => ({
          ...r,
          _rawId: r.id,
          id: String(r.id),
          source: "Inventory",
          sourceBadge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300",
          requisition_no: r.requisition_no || r.req_no || `MR-${r.id}`,
        })),
        ...maintItems.map((r) => ({
          ...r,
          _rawId: r.id,
          id: `maint_${r.id}`,
          source: "Maintenance",
          sourceBadge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
          requisition_no: r.requisition_no || r.req_no || `MMR-${r.id}`,
        })),
        ...pmItems.map((r) => ({
          ...r,
          _rawId: r.id,
          id: `pm_${r.id}`,
          source: "Project",
          sourceBadge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300",
          requisition_no: r.requisition_no || r.req_no || `PMR-${r.id}`,
        })),
        ...prodItems.map((r) => ({
          ...r,
          _rawId: r.id,
          id: `prod_${r.id}`,
          source: "Production",
          sourceBadge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
          requisition_no: r.requisition_no || r.req_no || `PR-${r.id}`,
        })),
      ].filter((r) => {
        const s = String(r.status || "").toUpperCase();
        // Show only APPROVED and POSTED requisitions
        if (s !== "APPROVED" && s !== "POSTED") return false;
        // Exclude if already issued in docs
        if (issuedIds.has(String(r.id)) || issuedIds.has(String(r._rawId))) return false;
        return true;
      });

      setRequisitions(normalized);
    } catch (err) {
      console.error("Failed to load pending requisitions", err);
    } finally {
      setLoadingRequisitions(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      DRAFT: "badge-info",
      ISSUED: "badge-warning",
      POSTED: "badge-success",
      CANCELLED: "badge-error",
      APPROVED: "badge-success",
      PENDING: "badge-warning",
      SUBMITTED: "badge-info",
    };
    return badges[status] || "badge-info";
  };

  // Filtered Issues list
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return docs.slice();
    return filterAndSort(docs, {
      query: searchTerm,
      getKeys: (d) => [d.issue_no, d.department_name, d.warehouse_name],
    });
  }, [docs, searchTerm]);

  // Filtered Requisitions list
  const filteredRequisitions = useMemo(() => {
    if (!searchTerm.trim()) return requisitions;
    const q = searchTerm.toLowerCase().trim();
    return requisitions.filter(
      (r) =>
        r.requisition_no?.toLowerCase().includes(q) ||
        r.department_name?.toLowerCase().includes(q) ||
        r.warehouse_name?.toLowerCase().includes(q) ||
        r.requested_by?.toLowerCase().includes(q) ||
        r.source?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q)
    );
  }, [requisitions, searchTerm]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Placed Above the Metric Cards as requested) */}
      <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-brand-50 text-brand-900 dark:bg-brand-900/30 dark:text-brand-400 border border-brand-200/50 dark:border-brand-800/50 shadow-sm shrink-0">
              <PackageCheck size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Issue to Requirement Area
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 font-normal">
                Issue materials to departments / requirement areas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/inventory?section=Stock%20Operations"
              className="btn btn-secondary inline-flex items-center gap-1.5 shadow-sm text-sm"
            >
              Return to Menu
            </Link>

            {/* Toggle Button: View Material Issued / New Requisitions */}
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "requisitions" ? "issues" : "requisitions")}
              className="btn bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-sm inline-flex items-center gap-2 text-sm font-semibold transition-all"
              title={
                activeTab === "requisitions"
                  ? "Click to view all material issued records"
                  : "Click to view all requisitions yet to be issued"
              }
            >
              {activeTab === "requisitions" ? (
                <>
                  <PackageCheck size={16} className="text-brand-600 dark:text-brand-400" />
                  <span>View Material Issued</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                    {docs.length}
                  </span>
                </>
              ) : (
                <>
                  <ClipboardList size={16} className="text-slate-600 dark:text-slate-400" />
                  <span>New Requisitions</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                    {requisitions.length}
                  </span>
                </>
              )}
            </button>

            <Link
              to="/inventory/issue-to-requirement/new"
              className="btn btn-primary inline-flex items-center gap-1.5 shadow-sm text-sm font-semibold"
            >
              <Plus size={16} /> New Issue
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Metric Stats Cards (Placed Below the Header) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Active Material Issues",
            val: (docs || []).filter((x) =>
              ["ACTIVE", "IN_PROGRESS", "OPEN", "ISSUED"].includes(String(x.status || "").toUpperCase())
            ).length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Material Issues",
            val: (docs || []).length,
            icon: <PackageCheck size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Requisitions",
            val: requisitions.length,
            icon: <ClipboardList size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Issues",
            val: (docs || []).filter((x) =>
              ["COMPLETED", "APPROVED", "CLOSED", "POSTED"].includes(String(x.status || "").toUpperCase())
            ).length,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600 text-white",
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
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md ${stat.color}`}
            >
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Content Card (Swappable between Issues and New Requisitions) */}
      <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl">
        {/* Table Subheader / Tab Navigation Bar */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab("issues")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "issues"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <PackageCheck size={14} className={activeTab === "issues" ? "text-brand-600 dark:text-brand-400" : ""} />
              <span>Material Issues</span>
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                {docs.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("requisitions")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "requisitions"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <ClipboardList size={14} className={activeTab === "requisitions" ? "text-amber-600 dark:text-amber-400" : ""} />
              <span>New Requisitions Awaiting Issue</span>
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                {requisitions.length}
              </span>
            </button>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="text"
                placeholder={
                  activeTab === "issues"
                    ? "Search issue no, department..."
                    : "Search requisition, department..."
                }
                className="input pl-8 pr-3 py-1 text-xs h-8 w-52 md:w-64 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                fetchDocs();
                fetchPendingRequisitions();
              }}
              className="btn btn-secondary p-1.5 h-8 w-8 flex items-center justify-center rounded-lg shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw
                size={13}
                className={loading || loadingRequisitions ? "animate-spin text-brand-600" : ""}
              />
            </button>

            {activeTab === "issues" && (
              <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            )}
          </div>
        </div>

        <div className="card-body p-0">
          {error ? (
            <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900">
              {error}
            </div>
          ) : null}

          {/* TABLE 1: MATERIAL ISSUES (When activeTab === "issues") */}
          {activeTab === "issues" && (
            <div className="overflow-x-auto">
              <table
                className={
                  "table w-full text-left " +
                  (viewMode === "grid" ? "table-grid-mode" : "")
                }
              >
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4">Issue No</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center min-w-[280px]">Actions</th>
                    <th className="py-3 px-4">Created By</th>
                    <th className="py-3 px-4">Created Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {loading && docs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        Loading material issues...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400 italic">
                        {docs.length === 0
                          ? 'No material issues logged yet. Click "+ New Issue" or choose from "New Requisitions".'
                          : "No material issues match your search criteria."}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d) => (
                      <tr
                        key={d.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                          {d.issue_no}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {d.issue_date ? String(d.issue_date).slice(0, 10) : "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {d.issue_type || "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-200">
                          {d.warehouse_name || "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-200">
                          {d.department_name || "-"}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`badge ${getStatusBadge(d.status)}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                            {/* Slot 1: View */}
                            <Link
                              to={`/inventory/issue-to-requirement/${d.id}?mode=view`}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs h-8 inline-flex items-center"
                            >
                              View
                            </Link>

                            {/* Slot 2: Edit */}
                            {d.status !== "POSTED" ? (
                              <Link
                                to={`/inventory/issue-to-requirement/${d.id}?mode=edit`}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs h-8 inline-flex items-center"
                              >
                                Edit
                              </Link>
                            ) : (
                              <div className="w-12 h-8" />
                            )}

                            {/* Slot 3: Print */}
                            <ListPrintIconButton
                              onClick={() =>
                                window.open(
                                  `/inventory/issue-to-requirement/${d.id}?mode=view`,
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                            />

                            {/* Slot 4: Attachments */}
                            <ListAttachmentIconButton
                              onClick={() => {
                                setActiveDocId(d.id);
                                setShowAttach(true);
                              }}
                            />

                            {/* Slot 5: Workflow Action */}
                            <div className="list-approval-slot inline-flex items-center ml-1">
                              {d.status === "DRAFT" ? (
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.put(
                                        `/inventory/issue-to-requirement/${d.id}/status`,
                                        { status: "POSTED" }
                                      );
                                      setDocs((prev) =>
                                        prev.map((x) =>
                                          x.id === d.id
                                            ? { ...x, status: "POSTED" }
                                            : x
                                        )
                                      );
                                      toast.success("Issue posted");
                                    } catch (e) {
                                      toast.error(
                                        e?.response?.data?.message ||
                                          "Failed to post issue"
                                      );
                                    }
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs whitespace-nowrap h-8"
                                >
                                  Post Issue
                                </button>
                              ) : d.status === "POSTED" ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="list-approval-approved-pill text-xs px-2.5 py-1">
                                    Posted
                                  </span>
                                  {canReverseApproval() && (
                                    <button
                                      type="button"
                                      className="list-approval-reverse-btn text-xs px-2 py-1"
                                      onClick={async () => {
                                        try {
                                          await api.post(
                                            `/inventory/issue-to-requirement/${d.id}/cancel`
                                          );
                                          setDocs((prev) =>
                                            prev.map((x) =>
                                              x.id === d.id
                                                ? { ...x, status: "CANCELLED" }
                                                : x
                                            )
                                          );
                                          toast.success("Issue cancelled");
                                        } catch (e) {
                                          toast.error(
                                            e?.response?.data?.message ||
                                              "Failed to cancel issue"
                                          );
                                        }
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 text-xs">
                          {d.created_by_username || d.created_by_name || "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap font-mono">
                          {d.created_at
                            ? new Date(d.created_at).toLocaleDateString()
                            : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TABLE 2: NEW REQUISITIONS (When activeTab === "requisitions") */}
          {activeTab === "requisitions" && (
            <div className="overflow-x-auto">
              <table className="table w-full text-left">
                <thead>
                  <tr className="bg-amber-50/70 dark:bg-amber-950/30 text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 border-b border-amber-200 dark:border-amber-900/60">
                    <th className="py-3.5 px-4">Requisition #</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Source Module</th>
                    <th className="py-3.5 px-4">Requirement Area / Department</th>
                    <th className="py-3.5 px-4">Warehouse</th>
                    <th className="py-3.5 px-4">Requested By</th>
                    <th className="py-3.5 px-4 text-center">Items</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-center min-w-[170px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {loadingRequisitions && requisitions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        Loading pending requisitions...
                      </td>
                    </tr>
                  ) : filteredRequisitions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400 italic">
                        {requisitions.length === 0
                          ? "All material requisitions have already been issued to their requirement areas!"
                          : "No pending requisitions match your search criteria."}
                      </td>
                    </tr>
                  ) : (
                    filteredRequisitions.map((req) => (
                      <tr
                        key={req.id}
                        onClick={() => navigate(`/inventory/issue-to-requirement/new?requisition_id=${req.id}`)}
                        className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                          {req.requisition_no}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap text-xs">
                          {req.requisition_date
                            ? String(req.requisition_date).slice(0, 10)
                            : req.created_at
                              ? String(req.created_at).slice(0, 10)
                              : "-"}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${req.sourceBadge}`}
                          >
                            {req.source}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {req.department_name || req.project_name || req.dept_name || "General"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-xs">
                          {req.warehouse_name || "Primary Warehouse"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 text-xs">
                          {req.requested_by || req.created_by_name || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300 text-xs">
                          {req.item_count || (Array.isArray(req.items) ? req.items.length : 1)} Items
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`badge ${getStatusBadge(
                              String(req.status || "APPROVED").toUpperCase()
                            )}`}
                          >
                            {req.status || "APPROVED"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/inventory/issue-to-requirement/new?requisition_id=${req.id}`}
                            className="btn btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold shadow-sm group-hover:scale-[1.02] transition-transform"
                            title="Issue materials for this requisition"
                          >
                            <span>Issue Materials</span>
                            <ArrowRight size={14} />
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

      <FloatingCreateButton
        to="/inventory/issue-to-requirement/new"
        title="New Issue"
      />
      <DocumentAttachmentsModal
        open={showAttach}
        onClose={() => {
          setShowAttach(false);
          setActiveDocId(null);
        }}
        docType="issue-to-requirement"
        docId={activeDocId}
      />
    </div>
  );
}
