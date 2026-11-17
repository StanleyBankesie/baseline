/**
 * @file MilestoneEngineDrawer.jsx
 * @description Enterprise Automatic Milestone Detection & Management Drawer for OmniSuite ERP.
 * 
 * Capabilities:
 * - Summary KPI indicators (Total, Suggested, Achieved, In Progress, Overdue).
 * - 1-Click Automatic Milestone Detection Engine trigger.
 * - Review, Accept, Edit, and Reject detected milestone recommendations.
 * - Linked tasks breakdown (using Work Plan/WBS terminology, strictly NO WBS).
 * - Automatic target date calculation and live status evaluation.
 * - Formal verification / inspection sign-off condition tracking.
 * - Manual milestone creation linked to existing project tasks.
 */

import React, { useState } from "react";
import {
  Sparkles,
  Flag,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Plus,
  RefreshCw,
  Calendar,
  Check,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Users,
  Eye,
  FileCheck,
  Building2,
  Layers,
  ArrowRight
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

export default function MilestoneEngineDrawer({
  open,
  onClose,
  projectId,
  project,
  tasks = [],
  users = [],
  milestones = [],
  suggestedMilestones = [],
  counts = {},
  onRefresh
}) {
  const [activeTab, setActiveTab] = useState("suggestions"); // suggestions, confirmed, create
  const [detecting, setDetecting] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [inspectingMilestone, setInspectingMilestone] = useState(null);

  // Manual Creation Form State
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    milestone_type: "PHASE_COMPLETION",
    target_date: new Date().toISOString().split("T")[0],
    requires_inspection: false,
    responsible_owner_id: "",
    responsible_owner_name: "",
    work_plan_element: "",
    linkedTaskIds: [],
    remarks: ""
  });

  if (!open) return null;

  // Run Milestone Detection
  const handleRunDetection = async () => {
    if (!projectId) return;
    try {
      setDetecting(true);
      const res = await api.post(`/construction/projects/${projectId}/milestones/detect`);
      const count = res.data?.new_suggestions_count || 0;
      if (count > 0) {
        toast.success(`Milestone Detection Complete! ${count} new recommendations generated.`);
        setActiveTab("suggestions");
      } else {
        toast.info("Milestone Detection Complete. All meaningful project completion points are already covered.");
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Detection error:", err);
      toast.error(err?.response?.data?.message || "Failed to run milestone detection");
    } finally {
      setDetecting(false);
    }
  };

  // Accept Suggestion
  const handleAcceptSuggestion = async (milestone) => {
    try {
      await api.post(`/construction/milestones/${milestone.id}/accept`, {
        title: milestone.title,
        description: milestone.description,
        target_date: milestone.target_date,
        requires_inspection: milestone.requires_inspection
      });
      toast.success(`Milestone '${milestone.title}' confirmed as official project milestone!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed to accept milestone suggestion");
    }
  };

  // Reject Suggestion
  const handleRejectSuggestion = async (milestoneId) => {
    const reason = window.prompt("Reason for declining this milestone suggestion:", "Not required for this project");
    if (reason === null) return;
    try {
      await api.post(`/construction/milestones/${milestoneId}/reject`, { reason });
      toast.info("Suggestion dismissed");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed to reject suggestion");
    }
  };

  // Create Manual Milestone
  const handleCreateManual = async (e) => {
    e.preventDefault();
    if (!projectId || !createForm.title) {
      toast.warning("Milestone title is required");
      return;
    }

    try {
      await api.post("/construction/milestones", {
        ...createForm,
        project_id: projectId
      });
      toast.success("Milestone created successfully");
      setCreateForm({
        title: "",
        description: "",
        milestone_type: "PHASE_COMPLETION",
        target_date: new Date().toISOString().split("T")[0],
        requires_inspection: false,
        responsible_owner_id: "",
        responsible_owner_name: "",
        work_plan_element: "",
        linkedTaskIds: [],
        remarks: ""
      });
      setActiveTab("confirmed");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed to create milestone");
    }
  };

  // Toggle Formal Inspection Sign-off
  const handleToggleInspection = async (milestone) => {
    try {
      const res = await api.post(`/construction/milestones/${milestone.id}/toggle-inspection`, {
        is_accepted: !milestone.is_inspection_accepted,
        notes: milestone.is_inspection_accepted ? "Inspection revoked" : "Formal inspection accepted and verified"
      });
      toast.success(res.data?.is_inspection_accepted ? "Formal inspection sign-off verified!" : "Inspection sign-off revoked");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed to update inspection status");
    }
  };

  // Delete Milestone
  const handleDeleteMilestone = async (id) => {
    if (!window.confirm("Are you sure you want to delete this milestone?")) return;
    try {
      await api.delete(`/construction/milestones/${id}`);
      toast.success("Milestone deleted");
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error("Failed to delete milestone");
    }
  };

  // Auto-calculate target date for manual form based on selected tasks
  const autoCalculateTargetDate = (taskIds) => {
    if (!taskIds.length) return;
    let latest = null;
    tasks.forEach((t) => {
      if (taskIds.includes(t.id) && t.end_date) {
        if (!latest || t.end_date > latest) latest = t.end_date;
      }
    });
    if (latest) {
      setCreateForm((prev) => ({ ...prev, target_date: latest.split("T")[0] }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Automatic Milestone Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Live Status Tracking
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {project?.project_name ? `${project.project_code} — ${project.project_name}` : "Project Milestones"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunDetection}
              disabled={detecting}
              className="btn btn-primary text-xs h-8 px-3 rounded-xl inline-flex items-center gap-1.5 font-semibold shadow-xs"
              title="Analyze Work Plan/WBS and detect milestones"
            >
              <RefreshCw size={13} className={detecting ? "animate-spin" : ""} />
              <span>{detecting ? "Analyzing..." : "Run Detection"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KPI Counter Strip */}
        <div className="grid grid-cols-5 gap-2 p-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-center text-xs">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <span className="text-[10px] text-slate-400 block font-medium">Confirmed</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
              {counts.total || milestones.length}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50">
            <span className="text-[10px] text-amber-700 dark:text-amber-300 block font-medium">Suggestions</span>
            <span className="text-sm font-bold text-amber-800 dark:text-amber-200 font-mono">
              {counts.suggested || suggestedMilestones.length}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40">
            <span className="text-[10px] text-blue-700 dark:text-blue-300 block font-medium">In Progress</span>
            <span className="text-sm font-bold text-blue-800 dark:text-blue-200 font-mono">
              {counts.in_progress || 0}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-medium">Achieved</span>
            <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200 font-mono">
              {counts.achieved || 0}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40">
            <span className="text-[10px] text-rose-700 dark:text-rose-300 block font-medium">Overdue</span>
            <span className="text-sm font-bold text-rose-800 dark:text-rose-200 font-mono">
              {counts.overdue || 0}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50/50 dark:bg-slate-950/50">
          {[
            { id: "suggestions", label: "Suggested Milestones", badge: suggestedMilestones.length },
            { id: "confirmed", label: "Official Milestones", badge: milestones.length },
            { id: "create", label: "Create Manually", icon: Plus }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === tab.id
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: SUGGESTIONS */}
          {activeTab === "suggestions" && (
            <div className="space-y-4">
              {suggestedMilestones.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    No Pending Suggestions
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                    The engine has evaluated your Work Plan/WBS. Click <strong>Run Detection</strong> to re-evaluate tasks and uncover new milestones.
                  </p>
                  <button
                    onClick={handleRunDetection}
                    disabled={detecting}
                    className="btn btn-primary text-xs h-8 px-4 rounded-xl font-semibold shadow-xs"
                  >
                    Run Milestone Detection
                  </button>
                </div>
              ) : (
                suggestedMilestones.map((sug) => {
                  const isExpanded = Boolean(expandedTasks[sug.id]);
                  const linkedCount = sug.linked_tasks?.length || 0;

                  return (
                    <div
                      key={sug.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-emerald-300 transition-all space-y-3"
                    >
                      {/* Top Bar: Title & Confidence */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {sug.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {sug.detection_source === "AI_DETECTED" ? "AI Recommendation" : "Rule Detected"} (
                              {sug.detection_confidence || 90}%)
                            </span>
                          </div>
                          {sug.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{sug.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Detection Reason */}
                      {sug.detection_reason && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                          <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">
                            Why recommended:
                          </strong>
                          {sug.detection_reason}
                        </div>
                      )}

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Target Date: <strong>{sug.target_date || "Calculated from tasks"}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Layers className="w-3.5 h-3.5 text-slate-400" />
                          <span>Work Plan/WBS: <strong>{sug.work_plan_element || "Project Scope"}</strong></span>
                        </div>
                      </div>

                      {/* Linked Tasks Preview */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setExpandedTasks({ ...expandedTasks, [sug.id]: !isExpanded })}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span>{linkedCount} Contributing Tasks linked</span>
                        </button>

                        {isExpanded && sug.linked_tasks && (
                          <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-emerald-300 dark:border-emerald-700">
                            {sug.linked_tasks.map((t) => (
                              <div key={t.task_id} className="text-xs flex items-center justify-between text-slate-700 dark:text-slate-300">
                                <span>{t.task_title}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
                                  {t.task_status} ({t.completion_percent || 0}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {sug.requires_inspection ? "🛡️ Requires formal inspection sign-off" : "Automatic completion tracking"}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRejectSuggestion(sug.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAcceptSuggestion(sug)}
                            className="btn btn-primary text-xs h-7 px-3 rounded-lg font-semibold inline-flex items-center gap-1 shadow-xs"
                          >
                            <Check size={13} /> Accept Milestone
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: CONFIRMED MILESTONES */}
          {activeTab === "confirmed" && (
            <div className="space-y-4">
              {milestones.length === 0 ? (
                <div className="text-center py-16 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <Flag className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No official milestones confirmed yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1 mb-3">Accept recommendations or create a manual milestone.</p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="btn btn-secondary text-xs h-8 px-3 rounded-xl font-semibold"
                  >
                    + Create Milestone Manually
                  </button>
                </div>
              ) : (
                milestones.map((m) => {
                  const status = m.live_status || m.status || "PENDING";
                  let badgeClass = "bg-slate-100 text-slate-700 border-slate-300";
                  if (status === "ACHIEVED") badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
                  else if (status === "IN_PROGRESS") badgeClass = "bg-blue-100 text-blue-800 border-blue-300";
                  else if (status === "OVERDUE") badgeClass = "bg-rose-100 text-rose-800 border-rose-300";

                  return (
                    <div
                      key={m.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rotate-45 border-2 flex items-center justify-center ${
                              status === "ACHIEVED"
                                ? "bg-emerald-500 border-emerald-700"
                                : status === "OVERDUE"
                                ? "bg-rose-500 border-rose-700"
                                : status === "IN_PROGRESS"
                                ? "bg-blue-500 border-blue-700"
                                : "bg-slate-400 border-slate-600"
                            }`}
                          />
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 ml-1">
                            {m.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                            {status}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDeleteMilestone(m.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Delete Milestone"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {m.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">{m.description}</p>
                      )}

                      {/* Contributing Tasks Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Contributing Tasks Progress</span>
                          <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                            {m.completed_tasks || 0} / {m.total_tasks || 0} Tasks Done ({m.progress_percent || 0}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              status === "ACHIEVED" ? "bg-emerald-500" : status === "OVERDUE" ? "bg-rose-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${Math.min(100, m.progress_percent || 0)}%` }}
                          />
                        </div>
                      </div>

                      {/* Inspection / Verification Condition */}
                      {m.requires_inspection ? (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs">
                            <ShieldCheck
                              className={`w-4 h-4 ${
                                m.is_inspection_accepted ? "text-emerald-600" : "text-amber-500"
                              }`}
                            />
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                                {m.is_inspection_accepted ? "Formal Inspection Accepted" : "Inspection Verification Required"}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {m.inspection_notes || "Mandatory sign-off condition before achieving milestone"}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleInspection(m)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                              m.is_inspection_accepted
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                            }`}
                          >
                            {m.is_inspection_accepted ? "Revoke Sign-off" : "Verify & Accept"}
                          </button>
                        </div>
                      ) : null}

                      {/* Dates and Owner */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-mono">
                          Target Date: <strong className="text-slate-800 dark:text-slate-200">{m.target_date || m.due_date}</strong>
                        </span>
                        {m.responsible_owner_name && (
                          <span>Owner: <strong>{m.responsible_owner_name}</strong></span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: CREATE MANUALLY */}
          {activeTab === "create" && (
            <form onSubmit={handleCreateManual} className="space-y-4 text-xs">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  New Project Milestone
                </h4>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Milestone Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                    placeholder="e.g. Roof Trusses & Covering Completed"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none"
                    placeholder="Describe the milestone deliverable or completion achievement..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Milestone Type
                    </label>
                    <select
                      value={createForm.milestone_type}
                      onChange={(e) => setCreateForm({ ...createForm, milestone_type: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none"
                    >
                      <option value="PHASE_COMPLETION">Phase Completion</option>
                      <option value="DELIVERABLE">Deliverable Sign-Off</option>
                      <option value="DEPENDENCY">Dependency Bottleneck</option>
                      <option value="LIFECYCLE">Project Lifecycle</option>
                      <option value="CUSTOM">Custom Milestone</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Target Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={createForm.target_date}
                      onChange={(e) => setCreateForm({ ...createForm, target_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Contributing Work Plan/WBS Tasks Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-600 dark:text-slate-400 font-semibold">
                      Contributing Work Plan/WBS Tasks ({createForm.linkedTaskIds.length} selected)
                    </label>
                    {createForm.linkedTaskIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => autoCalculateTargetDate(createForm.linkedTaskIds)}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        Auto-calculate Target Date
                      </button>
                    )}
                  </div>
                  <div className="max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                    {tasks.map((t) => {
                      const isChecked = createForm.linkedTaskIds.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          className="flex items-center gap-2 p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg cursor-pointer transition text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...createForm.linkedTaskIds, t.id]
                                : createForm.linkedTaskIds.filter((x) => x !== t.id);
                              setCreateForm({ ...createForm, linkedTaskIds: next });
                              autoCalculateTargetDate(next);
                            }}
                            className="rounded text-emerald-600 border-slate-300"
                          />
                          <span className="flex-1 text-slate-800 dark:text-slate-200">
                            {t.task_title || t.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{t.end_date}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Inspection Requirement Checkbox */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={createForm.requires_inspection}
                      onChange={(e) => setCreateForm({ ...createForm, requires_inspection: e.target.checked })}
                      className="rounded text-emerald-600 border-slate-300"
                    />
                    Requires Formal Verification / Inspection Sign-off
                  </label>
                  <p className="text-[11px] text-slate-500 pl-6">
                    Even after all tasks are 100% completed, the milestone will remain IN PROGRESS until an authorized inspector verifies sign-off.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("confirmed")}
                    className="px-3 py-1.5 text-slate-600 dark:text-slate-400 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs h-8 px-4 rounded-xl font-semibold shadow-xs"
                  >
                    Save Milestone
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
