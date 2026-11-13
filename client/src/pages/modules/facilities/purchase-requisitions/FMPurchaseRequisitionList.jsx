import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../../api/client";
import { usePermission } from "../../../../auth/PermissionContext";
import { Plus, Check, Clock, AlertTriangle, ArrowRight, X, CheckCircle2, ShoppingCart, DollarSign } from "lucide-react";
import { filterAndSort } from "../../../../utils/searchUtils.js";
import { toast } from "react-toastify";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";
import ReverseApprovalButton from "../../../../components/ReverseApprovalButton.jsx";

function StatusBadge({ status }) {
  const s = String(status || "").trim().toUpperCase();
  const cls =
    s === "DRAFT"
      ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
      : s === "APPROVED"
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
        : s === "REVERSED" || s === "RETURNED"
          ? "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300 dark:border-orange-800"
          : s === "CANCELLED" || s === "REJECTED"
            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
            : s === "PENDING_APPROVAL" || s === "SUBMITTED"
              ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800"
              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  const label =
    s === "PENDING_APPROVAL" || s === "SUBMITTED"
      ? "Pending Approval"
      : s === "APPROVED"
        ? "Approved"
        : s === "REJECTED"
          ? "Rejected"
          : s === "REVERSED"
            ? "Reversed"
            : s === "RETURNED"
              ? "Returned"
              : s === "CANCELLED"
                ? "Cancelled"
                : s === "DRAFT"
                  ? "Draft"
                  : s || "Draft";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export default function FMPurchaseRequisitionList() {
  const [viewMode, setViewMode] = useViewMode();
  const navigate = useNavigate();
  const { hasExceptional = () => false } = usePermission();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // Workflow Forward states (matching Payment Voucher workflow)
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [wfLoading, setWfLoading] = useState(false);
  const [wfError, setWfError] = useState("");
  const [forwardComments, setForwardComments] = useState("");
  const [candidateWorkflow, setCandidateWorkflow] = useState(null);
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [firstApprover, setFirstApprover] = useState(null);
  const [workflowsCache, setWorkflowsCache] = useState(null);
  const [targetApproverId, setTargetApproverId] = useState(null);
  const [submittingForward, setSubmittingForward] = useState(false);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/facilities/purchase-requisitions");
      setItems(res.data?.items || []);
    } catch {
      toast.error("Failed to load purchase requisitions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Open forward modal and fetch workflows
  async function openForwardModal(r) {
    setSelectedRequisition(r);
    setShowForwardModal(true);
    setWfError("");
    setForwardComments("");
    if (!workflowsCache) {
      try {
        setWfLoading(true);
        const res = await api.get("/workflows");
        const its = Array.isArray(res.data?.items) ? res.data.items : [];
        setWorkflowsCache(its);
      } catch {
        setWorkflowsCache([]);
      } finally {
        setWfLoading(false);
      }
    }
  }

  // Compute matching candidate workflow
  const computeCandidate = useCallback(async () => {
    if (!workflowsCache || !workflowsCache.length || !selectedRequisition) {
      setCandidateWorkflow(null);
      setFirstApprover(null);
      setWorkflowSteps([]);
      setWfError("");
      return;
    }
    const route = "/facilities/purchase-requisitions";
    const amount = Number(selectedRequisition.total_estimated_cost || 0);

    const matches = workflowsCache.filter((w) => {
      if (!w || !w.is_active) return false;
      const docType = String(w.document_type || "").trim();
      const docTypeNorm = docType.toUpperCase().replace(/\s+/g, "_");
      const isRouteMatch = w.module_path === route || w.route_path === route;
      const isTypeMatch =
        ["FM_PURCHASE_REQUISITION", "PURCHASE_REQUISITION", "FM_REQUISITION"].includes(docTypeNorm) ||
        /purchase.*requisition/i.test(docType);

      if (!isRouteMatch && !isTypeMatch) return false;
      if (w.min_amount != null && amount < Number(w.min_amount)) return false;
      if (w.max_amount != null && amount > Number(w.max_amount)) return false;
      return true;
    });

    const chosen = matches[0] || null;
    setCandidateWorkflow(chosen || null);
    setFirstApprover(null);
    setTargetApproverId(null);
    setWorkflowSteps([]);
    if (!chosen) return;

    try {
      setWfLoading(true);
      const res = await api.get(`/workflows/${chosen.id}`);
      const item = res?.data?.item || {};
      const steps = Array.isArray(item?.steps) ? item.steps : [];
      setWorkflowSteps(steps);
      const first = steps[0] || null;
      setFirstApprover(
        first
          ? {
              userId: first.approver_user_id,
              name: first.approver_name,
              stepName: first.step_name,
              stepOrder: first.step_order,
              approvalLimit: first.approval_limit,
            }
          : null
      );
      if (first) {
        const defaultTarget =
          (Array.isArray(first.approvers) && first.approvers.length
            ? first.approvers[0].id
            : first.approver_user_id) || null;
        setTargetApproverId(defaultTarget);
      }
    } catch (e) {
      setWfError(e?.response?.data?.message || "Failed to load workflow details");
    } finally {
      setWfLoading(false);
    }
  }, [workflowsCache, selectedRequisition]);

  useEffect(() => {
    if (selectedRequisition && showForwardModal) {
      computeCandidate();
    }
  }, [selectedRequisition, showForwardModal, computeCandidate]);

  // Execute forward action
  async function forwardRequisition() {
    if (!selectedRequisition) return;
    setSubmittingForward(true);
    setWfError("");
    try {
      const amount = Number(selectedRequisition.total_estimated_cost || 0);
      const res = await api.post(`/facilities/purchase-requisitions/${selectedRequisition.id}/submit`, {
        amount,
        workflow_id: candidateWorkflow ? candidateWorkflow.id : null,
        target_user_id: targetApproverId || null,
        comments: forwardComments,
      });
      toast.success(res?.data?.message || "Requisition submitted for approval");
      setShowForwardModal(false);
      setSelectedRequisition(null);
      fetchList();
    } catch (e) {
      const msg = e?.response?.data?.message || "Failed to submit requisition";
      setWfError(msg);
      toast.error(msg);
    } finally {
      setSubmittingForward(false);
    }
  }

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === "total_estimated_cost") { va = Number(va || 0); vb = Number(vb || 0); }
      else { va = String(va || "").toLowerCase(); vb = String(vb || "").toLowerCase(); }
      return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  }, [items, sortKey, sortDir]);

  const filtered = useMemo(() => {
    return filterAndSort(sorted, {
      query: search,
      getKeys: (r) => [r.requisition_no, r.property_name, r.equipment_name, r.requested_by, r.purpose],
    });
  }, [sorted, search]);

  const toggleSort = (k) => { setSortKey(k); setSortDir((d) => d === "asc" ? "desc" : "asc"); };

  const handleDelete = async (id) => {
    if (!window.confirm("Cancel this purchase requisition?")) return;
    try {
      await api.delete(`/facilities/purchase-requisitions/${id}`);
      toast.success("Cancelled");
      fetchList();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header bg-brand text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">FM Purchase Requisitions</h1>
              <p className="text-sm mt-1">Request materials for facilities procurement</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.history.back()} className="btn btn-secondary">Back</button>
              <Link to="/facilities/purchase-requisitions/new" className="btn-success flex items-center gap-2">
                <Plus size={16} /> New Requisition
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Approved PRs",
            val: items.filter((r) => r.status === "APPROVED").length,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500",
          },
          {
            label: "Total Requisitions",
            val: items.length,
            icon: <ShoppingCart size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700",
          },
          {
            label: "Pending Approval",
            val: items.filter((r) => r.status === "PENDING_APPROVAL" || r.status === "SUBMITTED" || r.status === "DRAFT").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500",
          },
          {
            label: "Fulfilled / Ordered",
            val: items.filter((r) => r.status === "ORDERED" || r.status === "FULFILLED" || r.status === "COMPLETED").length,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
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
              <input
                type="text"
                placeholder="Search requisitions..."
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary" onClick={fetchList}>Refresh</button>
          </div>

          <div className="flex justify-end mb-4">
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>

          <div className="overflow-x-auto">
            <table className={"table " + (viewMode === "grid" ? "table-grid-mode" : "")}>
              <thead>
                <tr>
                  <th className="cursor-pointer select-none" onClick={() => toggleSort("requisition_no")}>Requisition No</th>
                  <th className="cursor-pointer select-none" onClick={() => toggleSort("requisition_date")}>Date</th>
                  <th className="cursor-pointer select-none" onClick={() => toggleSort("property_name")}>Property</th>
                  <th>Equipment / Asset</th>
                  <th className="cursor-pointer select-none text-right" onClick={() => toggleSort("total_estimated_cost")}>Est. Cost</th>
                  <th className="text-center">Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400">No requisitions found</td></tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium text-brand-700">{r.requisition_no}</td>
                      <td className="text-sm whitespace-nowrap">{r.requisition_date ? new Date(r.requisition_date).toLocaleDateString() : "-"}</td>
                      <td className="text-sm">{r.property_name || "-"}</td>
                      <td className="text-sm">{r.equipment_name || "-"}</td>
                      <td className="text-right font-medium">{Number(r.total_estimated_cost || 0).toFixed(2)}</td>
                      <td className="text-center"><StatusBadge status={r.status} /></td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded hover:bg-slate-200"
                            onClick={() => navigate(`/facilities/purchase-requisitions/${r.id}`)}
                          >
                            View
                          </button>
                          {["DRAFT", "REJECTED", "RETURNED", "REVERSED"].includes(r.status) && (
                            <button
                              className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                              onClick={() => navigate(`/facilities/purchase-requisitions/${r.id}?edit=1`)}
                            >
                              Edit
                            </button>
                          )}
                          {["DRAFT", "REJECTED", "RETURNED", "REVERSED"].includes(r.status) && (
                            <button
                              className="px-2 py-1 text-xs font-medium text-white bg-brand hover:bg-brand-600 rounded flex items-center gap-1"
                              onClick={() => openForwardModal(r)}
                            >
                              Forward for Approval
                            </button>
                          )}
                          {["APPROVED"].includes(r.status) && (
                            <ReverseApprovalButton
                              docType="FM_PURCHASE_REQUISITION"
                              docId={r.id}
                              className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100"
                              onDone={fetchList}
                            >
                              Reverse Approval
                            </ReverseApprovalButton>
                          )}
                          {hasExceptional("FM.PR.CANCEL") && ["DRAFT", "REJECTED", "PENDING_APPROVAL", "SUBMITTED"].includes(r.status) && (
                            <button
                              className="px-2 py-1 text-xs font-medium text-white bg-red-700 rounded hover:bg-red-800"
                              onClick={() => handleDelete(r.id)}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Forward for Approval Modal (Payment Voucher Workflow Style) */}
      {showForwardModal && selectedRequisition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Forward for Approval</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  FM Purchase Requisition: <span className="font-bold text-brand-600">{selectedRequisition.requisition_no}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForwardModal(false);
                  setSelectedRequisition(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {wfError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{wfError}</span>
                </div>
              )}

              {/* Requisition Summary */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Property:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedRequisition.property_name || "-"}</span>
                </div>
                {selectedRequisition.equipment_name && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Equipment / Asset:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{selectedRequisition.equipment_name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated Total Cost:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {Number(selectedRequisition.total_estimated_cost || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Workflow Details */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Workflow Route
                </label>
                {wfLoading ? (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 py-1">
                    <Clock size={12} className="animate-spin" /> Checking workflow route...
                  </div>
                ) : candidateWorkflow ? (
                  <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-lg text-xs">
                    <div className="font-medium text-blue-900 dark:text-blue-300">
                      {candidateWorkflow.workflow_name}
                    </div>
                    {firstApprover && (
                      <div className="text-slate-600 dark:text-slate-400 mt-1">
                        Step {firstApprover.stepOrder}: {firstApprover.stepName}
                        {firstApprover.approvalLimit != null && (
                          <span className="ml-1 text-[11px] text-slate-500">
                            (Limit: {Number(firstApprover.approvalLimit).toLocaleString()})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                    No multi-tier workflow configured; standard supervisor approval rules will apply.
                  </div>
                )}
              </div>

              {/* Target Approver (if multiple step approvers configured) */}
              {workflowSteps.length > 0 && candidateWorkflow && workflowSteps[0]?.approvers?.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Approver <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className="input w-full text-xs"
                    value={targetApproverId || ""}
                    onChange={(e) => setTargetApproverId(Number(e.target.value) || null)}
                  >
                    <option value="">Select target approver</option>
                    {workflowSteps[0].approvers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} {u.full_name ? `(${u.full_name})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Comments */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Submission Comments (Optional)
                </label>
                <textarea
                  className="input w-full text-xs"
                  rows={2}
                  value={forwardComments}
                  onChange={(e) => setForwardComments(e.target.value)}
                  placeholder="Add any remarks or justification for the approver..."
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => {
                  setShowForwardModal(false);
                  setSelectedRequisition(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-success text-xs flex items-center gap-1.5"
                disabled={submittingForward || wfLoading}
                onClick={forwardRequisition}
              >
                {submittingForward ? "Forwarding..." : "Forward Requisition"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
