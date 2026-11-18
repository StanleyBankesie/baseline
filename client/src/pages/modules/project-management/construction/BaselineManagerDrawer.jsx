/**
 * @file BaselineManagerDrawer.jsx
 * @description OmniSuite ERP — Automatic Baseline Detection, Generation, Variance & Rebaselining Workspace.
 * 
 * Rules:
 * - Uses Work Plan/WBS (NOT WBS) terminology strictly.
 * - Tab 1: Readiness & Automatic Detection Analysis (completeness checklist, missing info alerts, generate proposed baseline).
 * - Tab 2: Proposed Baseline Review & Inline Editing (adjust start/end dates, durations, save draft, approve & lock baseline).
 * - Tab 3: Schedule Variance & Performance Analysis (Current vs Baseline Finish, ahead/behind/on-track, unbaselined tasks).
 * - Tab 4: Baseline History & Formal Rebaselining (version history, audit logs, justification reasons, multi-version comparison).
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Lock,
  Unlock,
  RefreshCw,
  Edit2,
  Save,
  Check,
  X,
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  FileText,
  ChevronRight,
  Loader2,
  Info,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

export default function BaselineManagerDrawer({
  open,
  onClose,
  projectId,
  project,
  tasks = [],
  milestones = [],
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "edit_proposed" | "variances" | "history"

  // Data states
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [baselines, setBaselines] = useState([]);
  const [selectedBaselineId, setSelectedBaselineId] = useState(null);
  const [baselineDetails, setBaselineDetails] = useState(null);

  // Proposed baseline editing state
  const [editableTasks, setEditableTasks] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Approval state
  const [approving, setApproving] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  // Rebaseline form modal / section state
  const [showRebaselineForm, setShowRebaselineForm] = useState(false);
  const [rebaselineReason, setRebaselineReason] = useState("");
  const [rebaselineName, setRebaselineName] = useState("");
  const [rebaselining, setRebaselining] = useState(false);

  // 1. Fetch analysis and baseline list
  const loadBaselineData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [analysisRes, baselinesRes] = await Promise.all([
        api.get(`/construction/schedule/${projectId}/baseline-analysis`),
        api.get(`/construction/schedule/${projectId}/baselines`),
      ]);
      setAnalysis(analysisRes.data || null);
      const items = baselinesRes.data?.items || [];
      setBaselines(items);

      // Select active or latest baseline
      const active = items.find((b) => b.status === "APPROVED") || items[0];
      if (active) {
        setSelectedBaselineId(active.id);
      }
    } catch {
      toast.error("Failed to load baseline data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && projectId) {
      loadBaselineData();
    }
  }, [open, projectId]);

  // 2. Fetch details for selected baseline
  useEffect(() => {
    if (!projectId || !selectedBaselineId) return;
    (async () => {
      try {
        const res = await api.get(`/construction/schedule/${projectId}/baselines/${selectedBaselineId}`);
        const data = res.data || {};
        setBaselineDetails(data);
        const snap = data.baseline?.snapshot_tasks || [];
        setEditableTasks(snap.map((t) => ({ ...t })));
      } catch {
        toast.error("Failed to load baseline details");
      }
    })();
  }, [projectId, selectedBaselineId]);

  // ── Actions ──

  // Auto-generate proposed baseline
  const handleGenerateProposed = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/construction/schedule/${projectId}/baselines/generate`, {
        baseline_name: `Proposed Baseline v${(analysis?.total_baseline_versions || 0) + 1}`,
        description: "Automatically compiled from project Work Plan/WBS activities, dependencies, and milestones.",
      });
      toast.success(res.data?.message || "Proposed baseline generated successfully!");
      await loadBaselineData();
      if (res.data?.id) {
        setSelectedBaselineId(res.data.id);
        setActiveTab("edit_proposed");
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to generate baseline");
    } finally {
      setLoading(false);
    }
  };

  // Save changes to proposed baseline tasks
  const handleSaveProposedChanges = async () => {
    if (!selectedBaselineId) return;
    try {
      setSavingEdit(true);
      await api.put(`/construction/schedule/${projectId}/baselines/${selectedBaselineId}`, {
        tasks: editableTasks,
      });
      toast.success("Draft changes to proposed baseline saved successfully.");
      await loadBaselineData();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to save draft changes");
    } finally {
      setSavingEdit(false);
    }
  };

  // Formally approve and lock baseline
  const handleApproveBaseline = async (baselineIdToApprove) => {
    const bId = baselineIdToApprove || selectedBaselineId;
    if (!bId) return;
    try {
      setApproving(true);
      const res = await api.post(`/construction/schedule/${projectId}/baselines/${bId}/approve`, {
        rebaseline_reason: approvalNotes || null,
      });
      toast.success(res.data?.message || "Project baseline approved and locked!");
      await loadBaselineData();
      setActiveTab("variances");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to approve baseline");
    } finally {
      setApproving(false);
    }
  };

  // Initiate formal rebaseline
  const handleInitiateRebaseline = async (e) => {
    e?.preventDefault();
    if (!rebaselineReason || rebaselineReason.trim().length < 5) {
      toast.warning("Please provide a valid rebaselining reason (at least 5 characters).");
      return;
    }
    try {
      setRebaselining(true);
      const res = await api.post(`/construction/schedule/${projectId}/baselines/rebaseline`, {
        rebaseline_reason: rebaselineReason,
        baseline_name: rebaselineName || `Rebaseline v${(analysis?.total_baseline_versions || 0) + 1}`,
      });
      toast.success("New proposed rebaseline created! Please review dates and approve to lock.");
      setShowRebaselineForm(false);
      setRebaselineReason("");
      setRebaselineName("");
      await loadBaselineData();
      if (res.data?.id) {
        setSelectedBaselineId(res.data.id);
        setActiveTab("edit_proposed");
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to initiate rebaseline");
    } finally {
      setRebaselining(false);
    }
  };

  // Task edit helper for proposed baseline
  const updateEditableTaskField = (taskId, field, value) => {
    setEditableTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated = { ...t, [field]: value };
          if (field === "start_date" || field === "end_date") {
            const s = new Date(field === "start_date" ? value : updated.start_date);
            const e = new Date(field === "end_date" ? value : updated.end_date);
            if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
              const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              updated.duration_days = days;
            }
          }
          return updated;
        }
        return t;
      })
    );
  };

  if (!open) return null;

  const currentBaseline = baselineDetails?.baseline || null;
  const variances = baselineDetails?.variances || null;
  const isApproved = currentBaseline?.status === "APPROVED";
  const isProposed = currentBaseline?.status === "PROPOSED";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
        
        {/* ── Top Header ── */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Schedule Baseline Management
                </h2>
                {analysis?.baseline_status === "APPROVED" && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                    <ShieldCheck size={12} /> Approved Baseline
                  </span>
                )}
                {analysis?.baseline_status === "PROPOSED" && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse">
                    Proposed Baseline Pending
                  </span>
                )}
                {analysis?.baseline_status === "REBASELINE_REQUIRED" && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-1">
                    <AlertTriangle size={12} /> Rebaseline Required
                  </span>
                )}
                {analysis?.baseline_status === "NOT_GENERATED" && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Not Baselined
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Project: <strong className="text-slate-700 dark:text-slate-300">{project?.project_name || "—"}</strong>
                {analysis?.active_baseline && (
                  <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-medium">
                    (Active: v{analysis.active_baseline.version_no} approved on {String(analysis.active_baseline.approved_at).split("T")[0]})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── KPI & Summary Strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Readiness Score</div>
            <div className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
              <span>{analysis?.readiness_score ?? 0}%</span>
              {analysis?.is_ready ? (
                <CheckCircle2 size={15} className="text-emerald-500" />
              ) : (
                <AlertTriangle size={15} className="text-amber-500" />
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Total Work Plan/WBS Tasks</div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {analysis?.total_tasks || tasks.length}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Schedule Performance</div>
            <div className={`text-base font-bold mt-0.5 flex items-center gap-1 ${
              variances?.summary?.overall_status === "BEHIND_SCHEDULE"
                ? "text-rose-600 dark:text-rose-400"
                : variances?.summary?.overall_status === "AHEAD_OF_SCHEDULE"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-700 dark:text-slate-300"
            }`}>
              {variances?.summary?.overall_status === "BEHIND_SCHEDULE" && <TrendingDown size={16} />}
              {variances?.summary?.overall_status === "AHEAD_OF_SCHEDULE" && <TrendingUp size={16} />}
              {variances?.summary?.overall_status === "ON_SCHEDULE" && <Minus size={16} />}
              <span>
                {variances?.summary?.overall_status === "BEHIND_SCHEDULE"
                  ? `Delayed (+${variances?.summary?.max_delay_days}d)`
                  : variances?.summary?.overall_status === "AHEAD_OF_SCHEDULE"
                  ? "Ahead of Schedule"
                  : variances?.summary?.overall_status === "ON_SCHEDULE"
                  ? "On Track"
                  : "Not Baselined"}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Unbaselined Tasks</div>
            <div className={`text-base font-bold mt-0.5 ${
              (analysis?.unbaselined_task_count || 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300"
            }`}>
              {analysis?.unbaselined_task_count ?? 0}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Baseline Versions</div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {baselines.length} recorded
            </div>
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Sparkles size={14} />
            <span>Readiness &amp; Detection</span>
          </button>

          <button
            onClick={() => setActiveTab("edit_proposed")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "edit_proposed"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Edit2 size={14} />
            <span>Review &amp; Edit Proposed</span>
            {isProposed && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("variances")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "variances"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <TrendingUp size={14} />
            <span>Schedule Variance Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "history"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <History size={14} />
            <span>Baseline History &amp; Rebaseline</span>
          </button>
        </div>

        {/* ── Main Content Area ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: READINESS & DETECTION
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              
              {/* Readiness Banner */}
              <div className={`p-4 rounded-2xl border flex items-start gap-4 ${
                analysis?.is_ready
                  ? "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                  : "bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  analysis?.is_ready
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-600 dark:bg-amber-900/60 dark:text-amber-400"
                }`}>
                  {analysis?.is_ready ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {analysis?.is_ready
                      ? "Project Schedule is Sufficiently Defined for Baseline"
                      : "Schedule Requires Complete Definition Before Baseline Generation"}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {analysis?.is_ready
                      ? "All required project boundary dates, Work Plan/WBS activity durations, sequencing dependencies, and team assignments are present. You can automatically compile a proposed baseline now."
                      : "The automatic baseline engine requires all Work Plan/WBS activities to have planned start/finish dates, valid durations, and defined boundaries before establishing an official reference schedule."}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={handleGenerateProposed}
                      disabled={loading || !analysis?.is_ready}
                      className="btn btn-primary text-sm h-9 px-4 rounded-xl inline-flex items-center gap-1.5 font-semibold"
                    >
                      <Sparkles size={14} />
                      {analysis?.active_baseline ? "Generate New Proposed Baseline" : "Auto-Generate Proposed Baseline"}
                    </button>
                    {analysis?.baseline_status === "APPROVED" && (
                      <button
                        onClick={() => setShowRebaselineForm(true)}
                        className="btn btn-secondary text-xs h-9 px-4 rounded-xl inline-flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-50"
                      >
                        <RefreshCw size={13} />
                        Formal Rebaseline
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Missing Information Checklist */}
              {analysis?.missing_items?.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-2">
                  <h5 className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                    <AlertCircle size={15} /> Missing Scheduling Requirements ({analysis.missing_items.length}):
                  </h5>
                  <ul className="text-xs text-rose-800 dark:text-rose-300/90 space-y-1 list-disc list-inside">
                    {analysis.missing_items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings List */}
              {analysis?.warnings?.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-2">
                  <h5 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle size={15} /> Scheduling Warnings ({analysis.warnings.length}):
                  </h5>
                  <ul className="text-xs text-amber-800 dark:text-amber-300/90 space-y-1 list-disc list-inside">
                    {analysis.warnings.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Scheduling Information Summary Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-600" />
                    Available Project Information Summary
                  </h5>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Project Code: {analysis?.project_code || "—"}
                  </span>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Project Planned Start:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{analysis?.project_start_date || "Not set"}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Project Planned Completion:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{analysis?.project_end_date || "Not set"}</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Active Work Plan/WBS Activities:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{analysis?.total_tasks || 0} tasks</strong>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Confirmed Project Milestones:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{analysis?.total_milestones || 0} milestones</strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Active Baseline Reference:</span>
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        {analysis?.active_baseline ? `v${analysis.active_baseline.version_no} (${analysis.active_baseline.baseline_name})` : "None"}
                      </strong>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Proposed Baseline Pending:</span>
                      <strong className="text-amber-600 dark:text-amber-400">
                        {analysis?.proposed_baseline ? `v${analysis.proposed_baseline.version_no} (${analysis.proposed_baseline.baseline_name})` : "None"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: REVIEW & EDIT PROPOSED BASELINE
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "edit_proposed" && (
            <div className="space-y-5">
              
              {/* Baseline Selector / Status Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    {isApproved ? <Lock size={18} /> : <Unlock size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {currentBaseline?.baseline_name || "Proposed Baseline"}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                      }`}>
                        {currentBaseline?.status || "PROPOSED"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Version: <strong>v{currentBaseline?.version_no || 1}</strong> • Total Activities:{" "}
                      <strong>{editableTasks.length}</strong> • Range:{" "}
                      <span className="font-mono">{currentBaseline?.project_start_date || "—"}</span> to{" "}
                      <span className="font-mono">{currentBaseline?.project_end_date || "—"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isApproved && (
                    <>
                      <button
                        onClick={handleSaveProposedChanges}
                        disabled={savingEdit}
                        className="btn btn-secondary text-sm h-9 px-3 rounded-xl inline-flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300"
                      >
                        {savingEdit ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        Save Draft
                      </button>
                      <button
                        onClick={() => handleApproveBaseline()}
                        disabled={approving}
                        className="btn btn-primary text-xs h-9 px-4 rounded-xl inline-flex items-center gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {approving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        Approve &amp; Lock Baseline
                      </button>
                    </>
                  )}
                  {isApproved && (
                    <button
                      onClick={() => setShowRebaselineForm(true)}
                      className="btn btn-secondary text-xs h-9 px-3 rounded-xl inline-flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                    >
                      <RefreshCw size={13} />
                      Rebaseline
                    </button>
                  )}
                </div>
              </div>

              {isApproved && (
                <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Lock size={15} className="text-slate-500 shrink-0" />
                  <span>
                    This baseline is <strong>Approved and Locked</strong> as the official project reference schedule. Modifications cannot be saved directly; initiate a formal Rebaseline to update reference dates.
                  </span>
                </div>
              )}

              {/* Editable Tasks Grid */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Work Plan/WBS Baseline Activities ({editableTasks.length})
                  </h5>
                  <span className="text-[11px] text-slate-400">
                    {isApproved ? "Read-Only View" : "Click dates or durations below to adjust before approval"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/30 dark:bg-slate-800/20 font-bold">
                        <th className="py-2.5 px-4 w-24">Work Plan/WBS</th>
                        <th className="py-2.5 px-4">Task Name</th>
                        <th className="py-2.5 px-4">Assignee</th>
                        <th className="py-2.5 px-4 w-36">Baseline Start</th>
                        <th className="py-2.5 px-4 w-36">Baseline Finish</th>
                        <th className="py-2.5 px-4 w-24 text-center">Duration (Days)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {editableTasks.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2 px-4 font-mono text-slate-500 font-semibold text-[11px]">
                            {t.work_plan_code || "—"}
                          </td>
                          <td className="py-2 px-4 font-semibold text-slate-800 dark:text-slate-200">
                            {t.task_title}
                            {t.scope_name && (
                              <span className="block text-[10px] text-slate-400 font-normal">
                                {t.scope_name}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-slate-500 text-[11px]">
                            {t.assigned_to_name || "Unassigned"}
                          </td>
                          <td className="py-2 px-4">
                            {isApproved ? (
                              <span className="font-mono text-slate-700 dark:text-slate-300">{t.start_date}</span>
                            ) : (
                              <input
                                type="date"
                                className="input text-sm h-8 px-2 w-full rounded-lg font-mono"
                                value={t.start_date || ""}
                                onChange={(e) => updateEditableTaskField(t.id, "start_date", e.target.value)}
                              />
                            )}
                          </td>
                          <td className="py-2 px-4">
                            {isApproved ? (
                              <span className="font-mono text-slate-700 dark:text-slate-300">{t.end_date}</span>
                            ) : (
                              <input
                                type="date"
                                className="input text-sm h-8 px-2 w-full rounded-lg font-mono"
                                value={t.end_date || ""}
                                onChange={(e) => updateEditableTaskField(t.id, "end_date", e.target.value)}
                              />
                            )}
                          </td>
                          <td className="py-2 px-4 text-center">
                            {isApproved ? (
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{t.duration_days}d</span>
                            ) : (
                              <input
                                type="number"
                                min={1}
                                className="input text-sm h-8 px-2 w-16 text-center rounded-lg font-mono font-bold mx-auto"
                                value={t.duration_days || 1}
                                onChange={(e) => updateEditableTaskField(t.id, "duration_days", Number(e.target.value))}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                      {editableTasks.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            No tasks found in this baseline snapshot.
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
              TAB 3: SCHEDULE VARIANCE ANALYSIS
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "variances" && (
            <div className="space-y-5">
              
              {/* Variance KPI Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">Ahead of Schedule</div>
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {variances?.summary?.ahead_count || 0}
                    </div>
                  </div>
                  <TrendingUp size={22} className="text-emerald-500" />
                </div>

                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-blue-800 dark:text-blue-300">On Track / Aligned</div>
                    <div className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-0.5">
                      {variances?.summary?.on_track_count || 0}
                    </div>
                  </div>
                  <Minus size={22} className="text-blue-500" />
                </div>

                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300">Behind Schedule (Delayed)</div>
                    <div className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-0.5">
                      {variances?.summary?.behind_count || 0}
                    </div>
                  </div>
                  <TrendingDown size={22} className="text-rose-500" />
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300">Unbaselined Additions</div>
                    <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                      {variances?.summary?.unbaselined_count || 0}
                    </div>
                  </div>
                  <AlertCircle size={22} className="text-amber-500" />
                </div>
              </div>

              {/* Task Variance Breakdown Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Activity-Level Schedule Variance (Calendar Days)
                  </h5>
                  <span className="text-[11px] text-slate-400">
                    Variance = Current/Forecast Finish − Baseline Finish
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50/30 dark:bg-slate-800/20 font-bold">
                        <th className="py-2.5 px-4 w-20">Work Plan/WBS</th>
                        <th className="py-2.5 px-4">Task Name</th>
                        <th className="py-2.5 px-4 w-28">Baseline Finish</th>
                        <th className="py-2.5 px-4 w-28">Current Finish</th>
                        <th className="py-2.5 px-4 w-28 text-center">Variance (Days)</th>
                        <th className="py-2.5 px-4 w-28 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(variances?.tasks || []).map((t) => {
                        const isBehind = t.finish_variance_days > 0;
                        const isAhead = t.finish_variance_days < 0;
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-2 px-4 font-mono text-slate-500 font-semibold text-[11px]">
                              {t.wbs_code || "—"}
                            </td>
                            <td className="py-2 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span>{t.task_title || t.title}</span>
                                {t.is_outside_baseline && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                    Outside Baseline
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-4 font-mono text-slate-500">
                              {t.baseline_end || "—"}
                            </td>
                            <td className="py-2 px-4 font-mono text-slate-800 dark:text-slate-200">
                              {t.end_date ? String(t.end_date).split("T")[0] : "—"}
                            </td>
                            <td className="py-2 px-4 text-center font-mono font-bold">
                              {t.is_outside_baseline ? (
                                <span className="text-slate-400">N/A</span>
                              ) : isBehind ? (
                                <span className="text-rose-600 dark:text-rose-400">+{t.finish_variance_days}d</span>
                              ) : isAhead ? (
                                <span className="text-emerald-600 dark:text-emerald-400">{t.finish_variance_days}d</span>
                              ) : (
                                <span className="text-slate-500">0d</span>
                              )}
                            </td>
                            <td className="py-2 px-4 text-center">
                              {t.is_outside_baseline ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  Unbaselined
                                </span>
                              ) : isBehind ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                                  Delayed
                                </span>
                              ) : isAhead ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  Ahead
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                  On Track
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {(!variances?.tasks || variances.tasks.length === 0) && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            No active tasks to evaluate against baseline.
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
              TAB 4: BASELINE HISTORY & REBASELINE
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "history" && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Historical Baseline Versions
                  </h4>
                  <p className="text-xs text-slate-500">
                    Previous baselines remain permanently archived for historical schedule audit and variance tracking.
                  </p>
                </div>
                <button
                  onClick={() => setShowRebaselineForm(true)}
                  className="btn btn-primary text-xs h-9 px-4 rounded-xl inline-flex items-center gap-1.5 font-semibold bg-indigo-600 text-white"
                >
                  <RefreshCw size={13} />
                  Initiate Rebaseline
                </button>
              </div>

              {/* Rebaseline Form Modal/Card */}
              {showRebaselineForm && (
                <div className="p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/40 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                      <RefreshCw size={15} /> Formal Project Schedule Rebaseline
                    </h5>
                    <button
                      onClick={() => setShowRebaselineForm(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-indigo-900/80 dark:text-indigo-300">
                    Initiating a rebaseline will preserve the current approved baseline in the history log, snapshot the latest Work Plan/WBS schedule dates as a new version, and allow you to review and approve the new reference baseline.
                  </p>

                  <form onSubmit={handleInitiateRebaseline} className="space-y-3">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Rebaseline Version Name
                      </label>
                      <input
                        type="text"
                        placeholder={`e.g. Approved Rebaseline Rev ${(baselines.length || 0) + 1}`}
                        className="input text-sm h-9 w-full rounded-xl"
                        value={rebaselineName}
                        onChange={(e) => setRebaselineName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Reason / Justification for Rebaseline *
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="e.g. Scope extension approved by client; revised structural drawings issued with additional foundation activities."
                        className="input text-sm w-full rounded-xl p-2.5"
                        value={rebaselineReason}
                        onChange={(e) => setRebaselineReason(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowRebaselineForm(false)}
                        className="btn btn-secondary text-xs h-9 px-4 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={rebaselining}
                        className="btn btn-primary text-sm h-9 px-4 rounded-xl inline-flex items-center gap-1.5 font-semibold"
                      >
                        {rebaselining && <Loader2 size={13} className="animate-spin" />}
                        Generate Rebaseline
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Version History List */}
              <div className="space-y-3">
                {baselines.map((b) => {
                  const isCurrent = b.id === selectedBaselineId;
                  const isAppr = b.status === "APPROVED";
                  return (
                    <div
                      key={b.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? "border-indigo-400 dark:border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            isAppr
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            v{b.version_no}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                                {b.baseline_name}
                              </h5>
                              <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                isAppr
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : b.status === "ARCHIVED"
                                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}>
                                {b.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex flex-wrap gap-3 mt-0.5">
                              <span>Approved by: <strong>{b.approved_by_name || b.approved_by_username || "System Admin"}</strong></span>
                              <span>Date: <strong className="font-mono">{b.approved_at ? String(b.approved_at).split("T")[0] : String(b.created_at).split("T")[0]}</strong></span>
                              <span>Tasks: <strong>{b.total_tasks || 0}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {b.id !== selectedBaselineId && (
                            <button
                              onClick={() => setSelectedBaselineId(b.id)}
                              className="btn btn-secondary text-xs h-8 px-3 rounded-lg"
                            >
                              Inspect / Compare
                            </button>
                          )}
                          {b.status === "PROPOSED" && (
                            <button
                              onClick={() => handleApproveBaseline(b.id)}
                              className="btn btn-primary text-xs h-8 px-3 rounded-lg font-semibold bg-emerald-600 text-white"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                      </div>

                      {b.rebaseline_reason && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Justification:</span>{" "}
                          {b.rebaseline_reason}
                        </div>
                      )}
                    </div>
                  );
                })}

                {baselines.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No historical baselines recorded yet. Auto-generate your first proposed baseline in the Readiness tab.
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

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
