/**
 * @file DependencyManagerDrawer.jsx
 * @description OmniSuite ERP — Intelligent Automatic Task Dependency Detection & Management Workspace.
 * 
 * Rules:
 * - Uses Work Plan/WBS (NOT WBS) terminology strictly throughout.
 * - Tab 1: Suggested Dependencies (Review AI/Rule recommendations, confidence %, detection rationale, Confirm, Reject).
 * - Tab 2: Confirmed Schedule Network (Active dependencies, critical path links, lag/lead, manual override, delete).
 * - Tab 3: Create Dependency (Manual relationship builder with circular dependency protection & type selection).
 * - Tab 4: Dependency Audit Trail (History of overrides, modifications, user timestamps).
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Link2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  X,
  Check,
  History,
  Info,
  Clock,
  Layers,
  HelpCircle,
  Loader2,
  Sliders,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

const DEP_TYPES = [
  { code: "FS", label: "Finish-to-Start (FS)", desc: "Successor starts after predecessor finishes (Default)" },
  { code: "SS", label: "Start-to-Start (SS)", desc: "Successor starts when predecessor starts (Parallel work)" },
  { code: "FF", label: "Finish-to-Finish (FF)", desc: "Successor finishes when predecessor finishes" },
  { code: "SF", label: "Start-to-Finish (SF)", desc: "Successor finishes after predecessor starts" },
];

export default function DependencyManagerDrawer({
  open,
  onClose,
  projectId,
  project,
  tasks = [],
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState("suggestions"); // "suggestions" | "confirmed" | "create" | "audit"

  // Data states
  const [loading, setLoading] = useState(false);
  const [dependencies, setDependencies] = useState([]);
  const [counts, setCounts] = useState({ total: 0, confirmed: 0, suggested: 0, rejected: 0, auto_detected: 0, manual: 0 });
  const [detecting, setDetecting] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    taskId: "",
    predecessorId: "",
    dependencyType: "FS",
    lagDays: 0,
    notes: "",
  });
  const [creating, setCreating] = useState(false);

  // Edit / Override Modal State
  const [editingDep, setEditingDep] = useState(null);
  const [editForm, setEditForm] = useState({ dependencyType: "FS", lagDays: 0, notes: "", overrideReason: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  // Reject Modal State
  const [rejectingDep, setRejectingDep] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // 1. Fetch project dependencies
  const loadDependencies = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await api.get(`/construction/schedule/${projectId}/dependencies`);
      const items = res.data?.items || [];
      setDependencies(items);
      setCounts(res.data?.counts || { total: 0, confirmed: 0, suggested: 0, rejected: 0, auto_detected: 0, manual: 0 });
    } catch {
      toast.error("Failed to load project dependencies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) {
      loadDependencies();
    }
  }, [open, projectId]);

  // 2. Trigger intelligent automatic dependency detection
  const handleDetectDependencies = async () => {
    try {
      setDetecting(true);
      const res = await api.post(`/construction/schedule/${projectId}/dependencies/detect`);
      toast.success(res.data?.message || "Task dependencies analyzed successfully!");
      await loadDependencies();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to analyze dependencies");
    } finally {
      setDetecting(false);
    }
  };

  // 3. Confirm suggested dependency
  const handleConfirmSuggested = async (id) => {
    try {
      await api.post(`/construction/schedule/${projectId}/dependencies/${id}/confirm`);
      toast.success("Dependency confirmed and integrated into project schedule.");
      await loadDependencies();
      if (onRefresh) onRefresh();
    } catch {
      toast.error("Failed to confirm dependency");
    }
  };

  // 4. Reject suggested dependency
  const handleRejectSuggested = async () => {
    if (!rejectingDep) return;
    try {
      await api.post(`/construction/schedule/${projectId}/dependencies/${rejectingDep.id}/reject`, {
        reason: rejectionReason || "Rejected by Project Manager",
      });
      toast.info("Suggested relationship rejected.");
      setRejectingDep(null);
      setRejectionReason("");
      await loadDependencies();
      if (onRefresh) onRefresh();
    } catch {
      toast.error("Failed to reject dependency");
    }
  };

  // 5. Create new dependency
  const handleCreateDependency = async (e) => {
    e?.preventDefault();
    if (!createForm.taskId || !createForm.predecessorId) {
      toast.warning("Please select both a Predecessor and a Successor task.");
      return;
    }
    if (String(createForm.taskId) === String(createForm.predecessorId)) {
      toast.warning("A task cannot depend on itself.");
      return;
    }

    try {
      setCreating(true);
      const res = await api.post(`/construction/schedule/${projectId}/dependencies`, {
        taskId: createForm.taskId,
        predecessorId: createForm.predecessorId,
        dependencyType: createForm.dependencyType,
        lagDays: Number(createForm.lagDays || 0),
        notes: createForm.notes,
      });
      toast.success(res.data?.message || "Relationship established successfully!");
      setCreateForm({ taskId: "", predecessorId: "", dependencyType: "FS", lagDays: 0, notes: "" });
      setActiveTab("confirmed");
      await loadDependencies();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to create dependency");
    } finally {
      setCreating(false);
    }
  };

  // 6. Update dependency
  const handleSaveEdit = async (e) => {
    e?.preventDefault();
    if (!editingDep) return;
    try {
      setSavingEdit(true);
      await api.put(`/construction/schedule/${projectId}/dependencies/${editingDep.id}`, {
        dependencyType: editForm.dependencyType,
        lagDays: Number(editForm.lagDays || 0),
        notes: editForm.notes,
        overrideReason: editForm.overrideReason,
      });
      toast.success("Relationship updated successfully.");
      setEditingDep(null);
      await loadDependencies();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to update dependency");
    } finally {
      setSavingEdit(false);
    }
  };

  // 7. Delete dependency
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this task dependency? Schedule will be recalculated.")) return;
    try {
      await api.delete(`/construction/schedule/${projectId}/dependencies/${id}`);
      toast.success("Dependency relationship deleted.");
      await loadDependencies();
      if (onRefresh) onRefresh();
    } catch {
      toast.error("Failed to delete dependency");
    }
  };

  // Filtered lists
  const suggestedDeps = useMemo(() => dependencies.filter((d) => d.status === "SUGGESTED"), [dependencies]);
  const confirmedDeps = useMemo(() => dependencies.filter((d) => d.status === "CONFIRMED"), [dependencies]);
  const rejectedDeps = useMemo(() => dependencies.filter((d) => d.status === "REJECTED"), [dependencies]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">

        {/* ── Top Header ── */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
              <Link2 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Task Dependencies &amp; Logic Network
                </h2>
                {suggestedDeps.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse">
                    {suggestedDeps.length} Suggestions Awaiting Review
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Project: <strong className="text-slate-700 dark:text-slate-300">{project?.project_name || "—"}</strong> • Work Plan/WBS Sequencing &amp; CPM Relationships
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDetectDependencies}
              disabled={detecting}
              className="btn btn-secondary text-sm h-9 px-3 rounded-xl inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 dark:bg-emerald-950/40"
              title="Analyze Work Plan/WBS and detect logical dependencies"
            >
              <Sparkles size={14} className={detecting ? "animate-spin text-emerald-600" : "text-emerald-600 dark:text-emerald-400"} />
              <span>{detecting ? "Analyzing..." : "Detect Dependencies"}</span>
            </button>
            
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Relationships</div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{counts.total}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Confirmed (Active)</div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{counts.confirmed}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Suggested by Engine</div>
            <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">{counts.suggested}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Auto-Detected</div>
            <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">{counts.auto_detected}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Manual / PM Override</div>
            <div className="text-base font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">{counts.manual}</div>
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={() => setActiveTab("suggestions")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "suggestions"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Sparkles size={14} />
            <span>Suggested Recommendations</span>
            {suggestedDeps.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {suggestedDeps.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("confirmed")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "confirmed"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Active Relationships ({confirmedDeps.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("create")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "create"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Plus size={14} />
            <span>Establish Relationship</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "audit"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <History size={14} />
            <span>Audit Trail &amp; Overrides</span>
          </button>
        </div>

        {/* ── Main Drawer Content ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: SUGGESTED RECOMMENDATIONS
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "suggestions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Engine-Detected Relationship Suggestions
                  </h4>
                  <p className="text-xs text-slate-500">
                    The engine analyzed your Work Plan/WBS activities, scopes, keywords, and dates to recommend these dependencies. Confirm to enforce or reject.
                  </p>
                </div>

                {suggestedDeps.length > 0 && (
                  <button
                    onClick={async () => {
                      for (const s of suggestedDeps) {
                        await api.post(`/construction/schedule/${projectId}/dependencies/${s.id}/confirm`);
                      }
                      toast.success(`All ${suggestedDeps.length} suggestions confirmed!`);
                      await loadDependencies();
                      if (onRefresh) onRefresh();
                    }}
                    className="btn btn-primary text-xs h-8 px-3 rounded-xl inline-flex items-center gap-1.5 font-semibold bg-emerald-600 text-white"
                  >
                    <Check size={14} /> Confirm All Suggestions
                  </button>
                )}
              </div>

              {suggestedDeps.map((dep) => (
                <div
                  key={dep.id}
                  className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {dep.dependency_type || "FS"} Relationship
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-200">
                        Confidence: {dep.confidence_score}%
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleConfirmSuggested(dep.id)}
                        className="btn btn-primary text-xs h-8 px-3 rounded-lg inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        <Check size={13} /> Confirm
                      </button>
                      <button
                        onClick={() => setRejectingDep(dep)}
                        className="btn btn-secondary text-xs h-8 px-2.5 rounded-lg text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  {/* Relationship Flow Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-200/60 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Predecessor (Prerequisite)</span>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-blue-600 font-semibold">{dep.predecessor_wbs || "WP"}</span>
                        <span>{dep.predecessor_title}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Dates: {dep.predecessor_start ? String(dep.predecessor_start).split("T")[0] : "—"} to{" "}
                        {dep.predecessor_end ? String(dep.predecessor_end).split("T")[0] : "—"}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Successor (Dependent)</span>
                      <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-blue-600 font-semibold">{dep.successor_wbs || "WP"}</span>
                        <span>{dep.successor_title}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Dates: {dep.successor_start ? String(dep.successor_start).split("T")[0] : "—"} to{" "}
                        {dep.successor_end ? String(dep.successor_end).split("T")[0] : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Rationale explanation */}
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                    <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <span><strong>Detection Rationale:</strong> {dep.detection_reason || "Identified based on Work Plan/WBS execution order."}</span>
                  </div>
                </div>
              ))}

              {suggestedDeps.length === 0 && (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500 opacity-80" />
                  <div className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                    No Pending Dependency Suggestions
                  </div>
                  <p className="text-xs max-w-sm mx-auto">
                    All identified task relationships are confirmed. Click <strong>"Detect Dependencies"</strong> above to re-evaluate the Work Plan/WBS for new relationships.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: ACTIVE CONFIRMED RELATIONSHIPS
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "confirmed" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Active Schedule Network ({confirmedDeps.length})
                  </h4>
                  <p className="text-xs text-slate-500">
                    These relationships govern the project's CPM early/late dates, float calculations, and critical path.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab("create")}
                  className="btn btn-primary text-xs h-8 px-3 rounded-xl inline-flex items-center gap-1.5 font-semibold"
                >
                  <Plus size={14} /> Add Dependency
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-800/40 font-bold">
                        <th className="py-2.5 px-4">Predecessor</th>
                        <th className="py-2.5 px-4 text-center w-20">Type</th>
                        <th className="py-2.5 px-4">Successor</th>
                        <th className="py-2.5 px-4 text-center w-20">Lag</th>
                        <th className="py-2.5 px-4 w-28">Source</th>
                        <th className="py-2.5 px-4 text-right w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {confirmedDeps.map((dep) => {
                        const isCritical = dep.successor_critical && dep.predecessor_critical;
                        return (
                          <tr key={dep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {dep.predecessor_title}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {dep.predecessor_wbs || "WP"} • {dep.predecessor_end ? String(dep.predecessor_end).split("T")[0] : "—"}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                isCritical
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              }`}>
                                {dep.dependency_type || "FS"}
                              </span>
                            </td>

                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-slate-800 dark:text-slate-200">
                                {dep.successor_title}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                {dep.successor_wbs || "WP"} • {dep.successor_start ? String(dep.successor_start).split("T")[0] : "—"}
                              </div>
                            </td>

                            <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                              {Number(dep.lag_days || 0) > 0 ? `+${dep.lag_days}d` : `${dep.lag_days || 0}d`}
                            </td>

                            <td className="py-2.5 px-4">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                dep.source === "AUTO_DETECTED"
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                  : dep.source === "MANUAL_OVERRIDE"
                                  ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}>
                                {dep.source === "AUTO_DETECTED" ? "Auto-Detected" : dep.source === "MANUAL_OVERRIDE" ? "PM Override" : "Manual"}
                              </span>
                            </td>

                            <td className="py-2.5 px-4 text-right space-x-1">
                              <button
                                onClick={() => {
                                  setEditingDep(dep);
                                  setEditForm({
                                    dependencyType: dep.dependency_type || "FS",
                                    lagDays: dep.lag_days || 0,
                                    notes: dep.notes || "",
                                    overrideReason: "",
                                  });
                                }}
                                className="p-1 rounded text-slate-400 hover:text-blue-600"
                                title="Edit or override relationship"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(dep.id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600"
                                title="Delete dependency"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {confirmedDeps.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            No active dependencies established. Auto-detect or establish a relationship above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: ESTABLISH RELATIONSHIP
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "create" && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Establish Task Dependency
                </h4>
                <p className="text-xs text-slate-500">
                  Select the predecessor activity that controls the successor's start or completion.
                </p>
              </div>

              <form onSubmit={handleCreateDependency} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Predecessor Task (Prerequisite) *
                  </label>
                  <select
                    required
                    className="input text-sm h-9 w-full rounded-xl"
                    value={createForm.predecessorId}
                    onChange={(e) => setCreateForm({ ...createForm, predecessorId: e.target.value })}
                  >
                    <option value="">— Select predecessor activity —</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.wbs_code ? `${t.wbs_code} - ` : ""}{t.task_title || t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Successor Task (Dependent Activity) *
                  </label>
                  <select
                    required
                    className="input text-sm h-9 w-full rounded-xl"
                    value={createForm.taskId}
                    onChange={(e) => setCreateForm({ ...createForm, taskId: e.target.value })}
                  >
                    <option value="">— Select dependent activity —</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id} disabled={String(t.id) === String(createForm.predecessorId)}>
                        {t.wbs_code ? `${t.wbs_code} - ` : ""}{t.task_title || t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Relationship Type
                    </label>
                    <select
                      className="input text-sm h-9 w-full rounded-xl font-medium"
                      value={createForm.dependencyType}
                      onChange={(e) => setCreateForm({ ...createForm, dependencyType: e.target.value })}
                    >
                      {DEP_TYPES.map((dt) => (
                        <option key={dt.code} value={dt.code}>
                          {dt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Lag (+) or Lead (-) Days
                    </label>
                    <input
                      type="number"
                      className="input text-sm h-9 w-full rounded-xl font-mono"
                      value={createForm.lagDays}
                      onChange={(e) => setCreateForm({ ...createForm, lagDays: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notes / Justification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Concrete curing period mandatory before column shuttering"
                    className="input text-sm h-9 w-full rounded-xl"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  <div className="font-bold text-slate-700 dark:text-slate-300 mb-0.5">Circular Dependency Protection:</div>
                  The system will automatically validate the schedule network to prevent closed circular loops before saving.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("confirmed")}
                    className="btn btn-secondary text-xs h-9 px-4 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn btn-primary text-sm h-9 px-5 rounded-xl font-semibold inline-flex items-center gap-1.5"
                  >
                    {creating && <Loader2 size={13} className="animate-spin" />}
                    Establish Relationship
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: AUDIT TRAIL & OVERRIDES
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Relationship Change History &amp; Overrides
                </h4>
                <p className="text-xs text-slate-500">
                  Complete permanent log of all manual overrides, type modifications, and automated detections.
                </p>
              </div>

              <div className="space-y-3">
                {dependencies.map((dep) => {
                  let audit = [];
                  try {
                    audit = JSON.parse(dep.audit_trail_json || "[]");
                  } catch {}

                  return (
                    <div
                      key={dep.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>{dep.predecessor_title}</span>
                          <span className="text-blue-500 font-mono">→ ({dep.dependency_type || "FS"}) →</span>
                          <span>{dep.successor_title}</span>
                        </div>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          dep.source === "AUTO_DETECTED"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : dep.source === "MANUAL_OVERRIDE"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                        }`}>
                          {dep.source}
                        </span>
                      </div>

                      {audit.length > 0 ? (
                        <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-1 text-[11px] text-slate-500">
                          {audit.map((a, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span>
                                <strong>{a.action}</strong> by {a.userName || "PM"}: {a.reason || "Updated"}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">{String(a.timestamp).split("T")[0]}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">
                          Created {String(dep.created_at).split("T")[0]} via {dep.source}.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* ── Edit / Override Dialog ── */}
        {editingDep && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 size={16} className="text-blue-600" /> Edit Task Dependency
                </h3>
                <button onClick={() => setEditingDep(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
                <div>
                  <span className="text-slate-400">Relationship:</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {editingDep.predecessor_title} → {editingDep.successor_title}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Relationship Type
                    </label>
                    <select
                      className="input text-sm h-9 w-full rounded-xl font-medium"
                      value={editForm.dependencyType}
                      onChange={(e) => setEditForm({ ...editForm, dependencyType: e.target.value })}
                    >
                      {DEP_TYPES.map((dt) => (
                        <option key={dt.code} value={dt.code}>
                          {dt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Lag (+) / Lead (-) Days
                    </label>
                    <input
                      type="number"
                      className="input text-sm h-9 w-full rounded-xl font-mono"
                      value={editForm.lagDays}
                      onChange={(e) => setEditForm({ ...editForm, lagDays: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Override Justification Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Expedited trade handover authorized by Project Manager"
                    className="input text-sm h-9 w-full rounded-xl"
                    value={editForm.overrideReason}
                    onChange={(e) => setEditForm({ ...editForm, overrideReason: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingDep(null)}
                    className="btn btn-secondary text-xs h-9 px-4 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="btn btn-primary text-sm h-9 px-5 rounded-xl font-semibold"
                  >
                    {savingEdit && <Loader2 size={13} className="animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Reject Suggestion Dialog ── */}
        {rejectingDep && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 p-5 space-y-4 text-xs">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-rose-600">
                <AlertTriangle size={16} /> Reject Suggested Relationship
              </h4>
              <p className="text-slate-500">
                Rejecting this relationship will remove it from suggestions and prevent the engine from re-suggesting it.
              </p>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Rejection
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tasks are independent subcontracts"
                  className="input text-sm h-9 w-full rounded-xl"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRejectingDep(null)}
                  className="btn btn-secondary text-xs h-9 px-3 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSuggested}
                  className="btn btn-primary text-sm h-9 px-4 rounded-xl font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Work Plan/WBS activities linked: <strong>{tasks.length}</strong>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary text-sm h-9 px-4 rounded-xl font-semibold"
          >
            Close Workspace
          </button>
        </div>

      </div>
    </div>
  );
}
