/**
 * @fileoverview ProjectClosurePage component.
 * Concise, industry-independent Project Handover & Closeout management in OmniSuite ERP.
 * Streamlined layout: Handover Transfer, Deliverables, Punch List Obligations, and Final Sign-Off.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  DollarSign,
  Search,
  Plus,
  Printer,
  Calendar,
  AlertCircle,
  Archive,
  Layers,
  Clock,
  Trash2,
  Save,
  Check,
  AlertTriangle,
  RefreshCw,
  Building2,
  User,
  Briefcase,
  FileText,
  FileBadge,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Lock,
  Folder,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import useSort from "@/hooks/useSort.js";
import SortableHeader from "@/components/SortableHeader.jsx";
import CloudinaryDocumentUploader from "../components/CloudinaryDocumentUploader.jsx";

const CLOSEOUT_STATUS_BADGES = {
  DRAFT: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  HANDOVER_COMPLETED: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  CLOSED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
};

const HANDOVER_TYPES = [
  "Client Handover",
  "Internal Handover",
  "Departmental Handover",
  "Operational Handover",
  "Other",
];

const ITEM_CATEGORIES = [
  "Outstanding Deliverable",
  "Documentation",
  "Financial Obligation",
  "Contractual Obligation",
  "Technical Issue",
  "Operational Issue",
  "Other",
];

const ITEM_STATUSES = ["Open", "In Progress", "Resolved", "Deferred", "Cancelled"];
const ITEM_PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"];

export default function ProjectClosurePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryProjectId = searchParams.get("projectId");

  // View state: 'workbench' (single project dossier) or 'register' (all projects table)
  const [viewMode, setViewMode] = useState("workbench");
  const [projectsList, setProjectsList] = useState([]);
  
  // Default to query parameter if present, otherwise NO project selected by default
  const [selectedProjectId, setSelectedProjectId] = useState(queryProjectId || "");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Project Closeout Dossier State
  const [projectData, setProjectData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [closeoutForm, setCloseoutForm] = useState(null);
  const [deliverables, setDeliverables] = useState([]);
  const [outstandingItems, setOutstandingItems] = useState([]);
  const [linkedSnags, setLinkedSnags] = useState([]);

  // Active section inside the concise Workbench: 'handover' | 'outstanding' | 'closeout'
  const [workbenchTab, setWorkbenchTab] = useState("handover");

  // Modals
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Load all projects for the register and dropdown
  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects/closeout");
      const items = res.data?.data || [];
      setProjectsList(items);
      // NOTE: By default, do NOT auto-select anything in the project field
    } catch {
      toast.error("Failed to load project register");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // When selected project changes, load its closeout dossier
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectData(null);
      setCloseoutForm(null);
      setMetrics(null);
      setDeliverables([]);
      setOutstandingItems([]);
      setLinkedSnags([]);
      return;
    }
    loadProjectDetails(selectedProjectId);
  }, [selectedProjectId]);

  const loadProjectDetails = async (projectId) => {
    try {
      setLoading(true);
      const res = await api.get(`/projects/closeout/${projectId}`);
      const data = res.data?.data;
      if (!data) return;

      setProjectData(data.project);
      setMetrics(data.metrics);
      setLinkedSnags(data.snags || []);

      // Parse closeout record
      const c = data.closeout || {};
      let parsedHandoverAttachments = [];
      try {
        parsedHandoverAttachments = typeof c.handover_attachments === "string"
          ? JSON.parse(c.handover_attachments)
          : (c.handover_attachments || []);
      } catch {
        parsedHandoverAttachments = [];
      }

      let parsedSupportingDocs = [];
      try {
        parsedSupportingDocs = typeof c.supporting_documents === "string"
          ? JSON.parse(c.supporting_documents)
          : (c.supporting_documents || []);
      } catch {
        parsedSupportingDocs = [];
      }

      setCloseoutForm({
        ...c,
        handover_attachments: parsedHandoverAttachments,
        supporting_documents: parsedSupportingDocs,
      });

      setDeliverables(data.deliverables || []);
      setOutstandingItems(data.outstanding_items || []);
    } catch {
      toast.error("Failed to load project closeout details");
    } finally {
      setLoading(false);
    }
  };

  // Deliverables Handlers
  const handleAddDeliverable = () => {
    setDeliverables([
      ...deliverables,
      {
        deliverable_name: "",
        description: "",
        quantity: "1",
        unit: "Units",
        responsible_person: projectData?.manager_name || "",
        handover_status: "PENDING",
        remarks: "",
      },
    ]);
  };

  const handleUpdateDeliverable = (index, field, value) => {
    const updated = [...deliverables];
    updated[index] = { ...updated[index], [field]: value };
    setDeliverables(updated);
  };

  const handleRemoveDeliverable = (index) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  // Outstanding Items Handlers
  const handleAddOutstandingItem = () => {
    const nextRef = `OBL-${(outstandingItems.length + 1).toString().padStart(3, "0")}`;
    setOutstandingItems([
      ...outstandingItems,
      {
        item_ref: nextRef,
        item_description: "",
        item_category: "Outstanding Deliverable",
        priority: "MEDIUM",
        responsible_person: projectData?.manager_name || "",
        target_resolution_date: new Date().toISOString().split("T")[0],
        resolution_status: "Open",
        resolution_remarks: "",
        date_resolved: null,
      },
    ]);
  };

  const handleUpdateOutstandingItem = (index, field, value) => {
    const updated = [...outstandingItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "resolution_status" && value === "Resolved" && !updated[index].date_resolved) {
      updated[index].date_resolved = new Date().toISOString().split("T")[0];
    }
    setOutstandingItems(updated);
  };

  const handleRemoveOutstandingItem = (index) => {
    setOutstandingItems(outstandingItems.filter((_, i) => i !== index));
  };

  const handleImportSnagsToOutstanding = () => {
    const openSnags = linkedSnags.filter(
      (s) => s.status !== "CLOSED" && s.status !== "VERIFIED"
    );
    if (openSnags.length === 0) {
      toast.info("No unresolved snags found to import.");
      return;
    }

    const newItems = openSnags.map((s, idx) => ({
      item_ref: s.reference_no || `SNAG-${idx + 1}`,
      item_description: `[Snag] ${s.issue_title || s.description || "Defect item"}`,
      item_category: "Technical Issue",
      priority: s.priority || "HIGH",
      responsible_person: s.assigned_to || projectData?.manager_name || "",
      target_resolution_date: s.target_resolution_date || new Date().toISOString().split("T")[0],
      resolution_status: "Open",
      resolution_remarks: `Imported from Snag & Punch List #${s.reference_no || s.id}`,
      date_resolved: null,
      issue_id: s.id,
    }));

    setOutstandingItems([...outstandingItems, ...newItems]);
    toast.success(`Imported ${newItems.length} active snag(s) into outstanding obligations.`);
  };

  // Sync completion metrics from task stats
  const handleAutoSyncMetrics = () => {
    if (!metrics || !projectData || !closeoutForm) return;
    const taskPct = metrics.task_stats?.avg_task_completion || projectData.completion_percent || 0;
    const totalDeliv = deliverables.length;
    const acceptedDeliv = deliverables.filter(
      (d) => d.handover_status === "ACCEPTED" || d.handover_status === "TRANSFERRED"
    ).length;
    const delivPct = totalDeliv > 0 ? Math.round((acceptedDeliv / totalDeliv) * 100) : 100;
    const totalMs = Number(metrics.milestone_stats?.total_milestones || 0);
    const compMs = Number(metrics.milestone_stats?.completed_milestones || 0);
    const msPct = totalMs > 0 ? Math.round((compMs / totalMs) * 100) : 100;

    setCloseoutForm({
      ...closeoutForm,
      scope_completion_pct: Math.round(taskPct),
      deliverables_completion_pct: delivPct,
      milestones_completion_pct: msPct,
      outstanding_tasks_count: Number(metrics.task_stats?.outstanding_tasks || 0),
      outstanding_deliverables_count: totalDeliv - acceptedDeliv,
    });
    toast.success("Synchronized metrics from tasks, deliverables, and milestones!");
  };

  // Save closeout draft / updates
  const handleSaveCloseout = async (targetStatus = null) => {
    if (!selectedProjectId) return;
    try {
      setSaving(true);
      const payload = {
        ...closeoutForm,
        closeout_status: targetStatus || closeoutForm.closeout_status || "DRAFT",
        deliverables,
        outstanding_items: outstandingItems,
      };

      await api.post(`/projects/closeout/${selectedProjectId}`, payload);
      toast.success(
        targetStatus === "HANDOVER_COMPLETED"
          ? "Handover formally completed!"
          : "Project closeout records saved successfully!"
      );
      await loadProjectDetails(selectedProjectId);
      await loadProjects();
    } catch {
      toast.error("Failed to save project closeout records");
    } finally {
      setSaving(false);
    }
  };

  // Mark Handover Completed
  const handleCompleteHandover = async () => {
    if (!selectedProjectId) return;
    try {
      setSaving(true);
      const today = closeoutForm.handover_date || new Date().toISOString().split("T")[0];
      await api.post(`/projects/closeout/${selectedProjectId}/complete-handover`, {
        handover_date: today,
        handover_to: closeoutForm.handover_to,
        receiving_org: closeoutForm.receiving_org,
        accepted_by: closeoutForm.accepted_by,
        acceptance_remarks: closeoutForm.acceptance_remarks || closeoutForm.handover_remarks,
      });

      toast.success("Handover formally completed & practical completion recorded!");
      await loadProjectDetails(selectedProjectId);
      await loadProjects();
    } catch {
      toast.error("Failed to complete handover");
    } finally {
      setSaving(false);
    }
  };

  // Mark Project Closed
  const handleMarkProjectClosed = async () => {
    if (!selectedProjectId) return;
    try {
      setSaving(true);
      await api.post(`/projects/closeout/${selectedProjectId}/close`, {
        closed_date: new Date().toISOString().split("T")[0],
        closed_by: closeoutForm.verified_by || projectData?.manager_name,
        final_closure_remarks: closeoutForm.final_closure_remarks,
      });

      toast.success("Project is now formally CLOSED across OmniSuite ERP!");
      setShowCloseModal(false);
      await loadProjectDetails(selectedProjectId);
      await loadProjects();
    } catch {
      toast.error("Failed to close project");
    } finally {
      setSaving(false);
    }
  };

  // Filter projects for the Register View
  const filteredProjects = useMemo(() => {
    return projectsList.filter((p) => {
      const matchSearch =
        (p.project_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.project_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.client_name || "").toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (activeTab === "all") return true;
      if (activeTab === "draft") return p.closeout_status === "DRAFT";
      if (activeTab === "handover") return p.closeout_status === "HANDOVER_COMPLETED";
      if (activeTab === "closed") return p.closeout_status === "CLOSED";
      return true;
    });
  }, [projectsList, searchTerm, activeTab]);

  const { sorted, sortKey, sortDir, toggle } = useSort(filteredProjects, "project_name", "asc");

  // Outstanding counts
  const unresolvedItemsCount = outstandingItems.filter(
    (it) => it.resolution_status === "Open" || it.resolution_status === "In Progress"
  ).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-300">
      {/* Canonical Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/project-management"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Return to Project Management"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Project Handover & Closeout
              </h1>
            </div>
          </div>
        </div>

        {/* Action Buttons in Upper Right Corner */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPrintModal(true)}
            disabled={!projectData || !closeoutForm}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs transition-colors"
            title="Print Handover Certificate"
          >
            <Printer size={15} /> Certificate
          </button>
          <button
            onClick={() => handleSaveCloseout()}
            disabled={!projectData || !closeoutForm || saving}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Save size={15} /> {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={handleCompleteHandover}
            disabled={!projectData || !closeoutForm || saving || closeoutForm?.closeout_status === "CLOSED"}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <CheckCircle2 size={15} /> Complete Handover
          </button>
          <button
            onClick={() => setShowCloseModal(true)}
            disabled={!projectData || !closeoutForm || saving || closeoutForm?.closeout_status === "CLOSED"}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Lock size={15} /> Close Project
          </button>
        </div>
      </div>

      {/* Project Selector Bar (By default: NO project selected) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 max-w-lg">
          <Folder size={16} className="text-slate-400 shrink-0" />
          <div className="flex-1">
            <select
              value={selectedProjectId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedProjectId(val);
                setSearchParams(val ? { projectId: val } : {});
              }}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">-- Select a Project to Initiate Closeout --</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name} ({p.project_code}) — {p.closeout_status || "DRAFT"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Concise Project Meta Strip */}
        {projectData && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400">Client:</span>{" "}
              <span className="text-slate-700 dark:text-slate-200 font-semibold">{projectData.client_name || "—"}</span>
            </div>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
            <div>
              <span className="text-slate-400">Manager:</span>{" "}
              <span className="text-slate-700 dark:text-slate-200 font-semibold">{projectData.manager_name || "—"}</span>
            </div>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: ALL PROJECTS REGISTER */}
      {viewMode === "register" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            {[
              { id: "all", label: "All Projects" },
              { id: "draft", label: "In Closeout Review" },
              { id: "handover", label: "Handover Completed" },
              { id: "closed", label: "Fully Closed" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "bg-brand-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search project code, name, client..."
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs w-64 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {sorted.length} project(s)
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 font-semibold uppercase">
                  <tr>
                    <SortableHeader label="Project / Code" sortKey="project_name" currentSort={sortKey} sortDir={sortDir} onSort={toggle} />
                    <th className="py-2.5 px-3">Client</th>
                    <th className="py-2.5 px-3">Handover Ref</th>
                    <th className="py-2.5 px-3">Work Plan/WBS Scope</th>
                    <th className="py-2.5 px-3">Closeout Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sorted.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.project_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">#{item.project_code}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {item.client_name || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {item.handover_ref || "Pending"}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-brand-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, item.scope_completion_pct || 0)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            {item.scope_completion_pct || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            CLOSEOUT_STATUS_BADGES[item.closeout_status] || CLOSEOUT_STATUS_BADGES.DRAFT
                          }`}
                        >
                          {item.closeout_status?.replace(/_/g, " ") || "DRAFT"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedProjectId(String(item.id));
                            setSearchParams({ projectId: String(item.id) });
                            setViewMode("workbench");
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
                        >
                          Open Dossier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: WORKBENCH DOSSIER */}
      {viewMode === "workbench" && (
        <>
          {/* EMPTY STATE: When NO project is selected */}
          {!selectedProjectId || !projectData || !closeoutForm ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
                <FileBadge size={28} />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  No Project Selected
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Please select a project from the dropdown above to view deliverables handover, track open punch list obligations, and finalize closeout.
                </p>
              </div>
              <div className="pt-2">
                <p className="text-xs text-slate-400">
                  Select any active project from the dropdown to manage handover deliverables, punch lists, and final closure.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* CONCISE 4-CARD KPI RIBBON (Matching ProjectList design) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Work Plan/WBS Scope Completion */}
                <div className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Work Plan/WBS Completion
                    </p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                      {closeoutForm.scope_completion_pct}%
                    </p>
                    <button
                      type="button"
                      onClick={handleAutoSyncMetrics}
                      className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 mt-1 font-medium"
                    >
                      <RefreshCw size={10} /> Auto-Sync Metrics
                    </button>
                  </div>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md bg-emerald-600">
                    <CheckCircle2 size={20} className="stroke-[2.5]" />
                  </div>
                </div>

                {/* 2. Handover Acceptance Status */}
                <div className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Handover Acceptance
                    </p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {closeoutForm.acceptance_status || "PENDING"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1 truncate max-w-[130px]">
                      Ref: {closeoutForm.handover_ref || "Pending"}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md bg-blue-600">
                    <FileCheck size={20} className="stroke-[2.5]" />
                  </div>
                </div>

                {/* 3. Outstanding Obligations */}
                <div className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Open Obligations
                    </p>
                    <p className="text-xl font-bold text-amber-500 mt-1">
                      {unresolvedItemsCount}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {linkedSnags.filter((s) => s.status !== "CLOSED" && s.status !== "VERIFIED").length} open snags
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md bg-amber-500">
                    <Clock size={20} className="stroke-[2.5]" />
                  </div>
                </div>

                {/* 4. Financial Reconciliation */}
                <div className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Budget Variance
                    </p>
                    <p className={`text-xl font-bold font-mono mt-1 ${
                      Number(closeoutForm.budget_variance) >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}>
                      GH₵ {Number(closeoutForm.budget_variance || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">
                      Cost: GH₵ {Number(closeoutForm.actual_cost || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md ${
                    Number(closeoutForm.budget_variance) >= 0 ? "bg-emerald-600" : "bg-rose-500"
                  }`}>
                    <DollarSign size={20} className="stroke-[2.5]" />
                  </div>
                </div>
              </div>

              {/* CONCISE 3 TABS (Replaced 5 bloated sections & 5 sub-tabs) */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                {[
                  { id: "handover", label: "1. Handover & Deliverables Transfer", icon: FileCheck },
                  { id: "outstanding", label: `2. Punch List & Obligations (${unresolvedItemsCount})`, icon: Clock },
                  { id: "closeout", label: "3. Final Closeout & Archival", icon: ShieldCheck },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setWorkbenchTab(t.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${
                        workbenchTab === t.id
                          ? "bg-brand-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <Icon size={14} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: HANDOVER & DELIVERABLES */}
              {workbenchTab === "handover" && (
                <div className="space-y-4">
                  {/* Concise Transfer Metadata */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Handover Ref #
                        </label>
                        <input
                          type="text"
                          value={closeoutForm.handover_ref || ""}
                          placeholder="e.g. HND-PRJ-001"
                          onChange={(e) =>
                            setCloseoutForm({ ...closeoutForm, handover_ref: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Handover Date
                        </label>
                        <input
                          type="date"
                          value={closeoutForm.handover_date || ""}
                          onChange={(e) =>
                            setCloseoutForm({ ...closeoutForm, handover_date: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Recipient Contact / Name
                        </label>
                        <input
                          type="text"
                          placeholder="Client lead or recipient name"
                          value={closeoutForm.handover_to || ""}
                          onChange={(e) =>
                            setCloseoutForm({ ...closeoutForm, handover_to: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Acceptance Status
                        </label>
                        <select
                          value={closeoutForm.acceptance_status || "PENDING"}
                          onChange={(e) =>
                            setCloseoutForm({ ...closeoutForm, acceptance_status: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="PENDING">Pending Acceptance</option>
                          <option value="ACCEPTED">Accepted / Signed Off</option>
                          <option value="ACCEPTED_WITH_CONDITIONS">Accepted with Conditions</option>
                          <option value="REJECTED">Rejected / Rework Required</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Handover Transfer Notes
                      </label>
                      <input
                        type="text"
                        placeholder="Key operational transfer remarks, keys handover, or signoff statements..."
                        value={closeoutForm.handover_remarks || ""}
                        onChange={(e) =>
                          setCloseoutForm({ ...closeoutForm, handover_remarks: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  {/* Deliverables Transfer Table */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                    <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                          Handover Deliverables List ({deliverables.length})
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Outputs, documentation, hardware, keys, systems, and final deliverables transferred to client.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDeliverable}
                        className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <Plus size={13} /> Add Deliverable
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-semibold">
                          <tr>
                            <th className="py-2 px-3">Deliverable Name *</th>
                            <th className="py-2 px-2 w-20">Qty</th>
                            <th className="py-2 px-2 w-24">Unit</th>
                            <th className="py-2 px-3">Responsible Lead</th>
                            <th className="py-2 px-3 w-32">Status</th>
                            <th className="py-2 px-3">Remarks</th>
                            <th className="py-2 px-2 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {deliverables.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-6 text-center text-slate-400">
                                No deliverables added yet. Click &quot;Add Deliverable&quot; to append outputs.
                              </td>
                            </tr>
                          ) : (
                            deliverables.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="Deliverable title or spec..."
                                    value={row.deliverable_name || ""}
                                    onChange={(e) =>
                                      handleUpdateDeliverable(idx, "deliverable_name", e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    value={row.quantity ?? ""}
                                    onChange={(e) =>
                                      handleUpdateDeliverable(idx, "quantity", e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="Units/Sets"
                                    value={row.unit || ""}
                                    onChange={(e) =>
                                      handleUpdateDeliverable(idx, "unit", e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="Responsible lead"
                                    value={row.responsible_person || ""}
                                    onChange={(e) =>
                                      handleUpdateDeliverable(idx, "responsible_person", e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={row.handover_status || "PENDING"}
                                    onChange={(e) =>
                                      handleUpdateDeliverable(idx, "handover_status", e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                                  >
                                    <option value="PENDING">PENDING</option>
                                    <option value="ACCEPTED">ACCEPTED</option>
                                    <option value="TRANSFERRED">TRANSFERRED</option>
                                    <option value="REJECTED">REJECTED</option>
                                    <option value="NOT_APPLICABLE">N/A</option>
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="Notes..."
                                    value={row.remarks || ""}
                                    onChange={(e) =>
                                      handleUpdateDeliverable(idx, "remarks", e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDeliverable(idx)}
                                    className="text-slate-400 hover:text-rose-600 p-1"
                                    title="Delete"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Handover Documents Upload */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                      Handover Documents & Signoff Evidence
                    </h4>
                    <CloudinaryDocumentUploader
                      label="Upload Handover Signoff Letter, Acceptance Certificates"
                      description="PDF, DWG, DOCX, XLSX, PNG, JPG (Max 50MB)"
                      value={closeoutForm.handover_attachments || []}
                      onChange={(files) =>
                        setCloseoutForm({ ...closeoutForm, handover_attachments: files })
                      }
                      folder="omnisuite/closeout"
                      maxFiles={5}
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: PUNCH LIST & OPEN OBLIGATIONS */}
              {workbenchTab === "outstanding" && (
                <div className="space-y-4">
                  {/* Integrated Snag & Punch List Notice */}
                  {linkedSnags.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <ShieldCheck size={16} className="text-brand-600 shrink-0" />
                        <span>
                          <strong>{linkedSnags.length} Defect / Snag Record(s)</strong> detected from the Defect & Issue Management module.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleImportSnagsToOutstanding}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center gap-1 shadow-xs self-start sm:self-auto"
                      >
                        <Plus size={13} /> Import Open Snags
                      </button>
                    </div>
                  )}

                  {/* Outstanding Items Table */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                    <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                          Outstanding Items & Obligations Checklist ({outstandingItems.length})
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Track incomplete punch list items, final documentation, minor rectifications, or retention items.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddOutstandingItem}
                        className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition-colors"
                      >
                        <Plus size={13} /> Add Obligation Item
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 font-semibold">
                          <tr>
                            <th className="py-2 px-3 w-28">Ref #</th>
                            <th className="py-2 px-3">Description *</th>
                            <th className="py-2 px-2 w-32">Category</th>
                            <th className="py-2 px-2 w-24">Priority</th>
                            <th className="py-2 px-3 w-28">Target Date</th>
                            <th className="py-2 px-3 w-32">Status</th>
                            <th className="py-2 px-3">Resolution Notes</th>
                            <th className="py-2 px-2 w-10 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {outstandingItems.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-6 text-center text-slate-400">
                                No outstanding obligations logged. All punch list and closeout tasks are clear.
                              </td>
                            </tr>
                          ) : (
                            outstandingItems.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    value={item.item_ref || ""}
                                    onChange={(e) =>
                                      handleUpdateOutstandingItem(idx, "item_ref", e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-semibold focus:outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="Item obligation description..."
                                    value={item.item_description || ""}
                                    onChange={(e) =>
                                      handleUpdateOutstandingItem(idx, "item_description", e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={item.item_category || "Other"}
                                    onChange={(e) =>
                                      handleUpdateOutstandingItem(idx, "item_category", e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                                  >
                                    {ITEM_CATEGORIES.map((c) => (
                                      <option key={c} value={c}>
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2">
                                  <select
                                    value={item.priority || "MEDIUM"}
                                    onChange={(e) =>
                                      handleUpdateOutstandingItem(idx, "priority", e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold focus:outline-none"
                                  >
                                    {ITEM_PRIORITIES.map((pr) => (
                                      <option key={pr} value={pr}>
                                        {pr}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input
                                    type="date"
                                    value={item.target_resolution_date || ""}
                                    onChange={(e) =>
                                      handleUpdateOutstandingItem(idx, "target_resolution_date", e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none"
                                  />
                                </td>
                                <td className="p-2">
                                  <select
                                    value={item.resolution_status || "Open"}
                                    onChange={(e) =>
                                      handleUpdateOutstandingItem(idx, "resolution_status", e.target.value)
                                    }
                                    className={`w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none ${
                                      item.resolution_status === "Resolved"
                                        ? "text-emerald-600"
                                        : "text-amber-600"
                                    }`}
                                  >
                                    {ITEM_STATUSES.map((st) => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="Resolution remarks..."
                                    value={item.resolution_remarks || ""}
                                    onChange={(e) =>
                                      handleUpdateOutstandingItem(idx, "resolution_remarks", e.target.value)
                                    }
                                    className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOutstandingItem(idx)}
                                    className="text-slate-400 hover:text-rose-600 p-1"
                                    title="Delete"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FINAL CLOSEOUT & ARCHIVAL */}
              {workbenchTab === "closeout" && (
                <div className="space-y-4">
                  {/* Financial & Contractual Summary */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                      Financial Reconciliation & Warranty Commitments
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Approved Budget (GH₵)
                        </label>
                        <input
                          type="number"
                          value={closeoutForm.approved_budget}
                          onChange={(e) =>
                            setCloseoutForm({ ...closeoutForm, approved_budget: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Actual Project Cost (GH₵)
                        </label>
                        <input
                          type="number"
                          value={closeoutForm.actual_cost}
                          onChange={(e) => {
                            const cost = Number(e.target.value);
                            const bgt = Number(closeoutForm.approved_budget || 0);
                            setCloseoutForm({
                              ...closeoutForm,
                              actual_cost: cost,
                              budget_variance: bgt - cost,
                            });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Budget Variance (GH₵)
                        </label>
                        <input
                          type="number"
                          readOnly
                          value={closeoutForm.budget_variance}
                          className={`w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold ${
                            Number(closeoutForm.budget_variance) >= 0
                              ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                              : "text-rose-600 bg-rose-50 dark:bg-rose-950/20"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Financial Status
                        </label>
                        <select
                          value={closeoutForm.financial_closure_status || "BALANCED"}
                          onChange={(e) =>
                            setCloseoutForm({ ...closeoutForm, financial_closure_status: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none"
                        >
                          <option value="BALANCED">BALANCED</option>
                          <option value="SETTLED">SETTLED</option>
                          <option value="PENDING_SETTLEMENT">PENDING SETTLEMENT</option>
                          <option value="OVERRUN">OVERRUN</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Warranty & SLA Support Period
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 12 Months Defects Liability Period / 2 Years Support Coverage"
                        value={closeoutForm.warranty_support_obligations || ""}
                        onChange={(e) =>
                          setCloseoutForm({ ...closeoutForm, warranty_support_obligations: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Final Closeout Statement & Lessons Learned */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                      Final Closeout Notes & Lessons Learned
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Key Lessons Learned & Successes
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Key takeaways, successful milestones, operational enhancements..."
                          value={closeoutForm.lessons_learned || ""}
                          onChange={(e) =>
                            setCloseoutForm({ ...closeoutForm, lessons_learned: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Final Project Closure Statement / Signoff
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Final statement from Project Manager, formal signoff statement..."
                          value={closeoutForm.final_closure_remarks || ""}
                          onChange={(e) =>
                            setCloseoutForm({ ...closeoutForm, final_closure_remarks: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Archived Documents & Attachments (Cloudinary)
                      </label>
                      <CloudinaryDocumentUploader
                        label="Final Project Dossier, Reports, Warranties & Schematics"
                        description="PDF, DWG, DOCX, XLSX, PNG, JPG (Max 50MB)"
                        value={closeoutForm.supporting_documents || []}
                        onChange={(files) =>
                          setCloseoutForm({ ...closeoutForm, supporting_documents: files })
                        }
                        folder="omnisuite/closeout/archive"
                        maxFiles={5}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION FOOTER */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Closeout Dossier:
                  </span>{" "}
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                    {closeoutForm.handover_ref || "Pending Reference"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveCloseout()}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Save size={13} /> Save Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveCloseout(closeoutForm.closeout_status)}
                    disabled={saving}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Check size={13} /> Update Dossier
                  </button>
                  {closeoutForm.closeout_status !== "CLOSED" && (
                    <button
                      type="button"
                      onClick={() => setShowCloseModal(true)}
                      disabled={saving}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Lock size={13} /> Formally Close Project
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: FORMAL PROJECT CLOSURE CONFIRMATION */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <Lock size={26} />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Formally Close Project?
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              You are about to mark <strong>{projectData?.project_name}</strong> as{" "}
              <span className="font-bold text-emerald-600">COMPLETED & CLOSED</span>.
            </p>

            {unresolvedItemsCount > 0 && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <div>
                  <strong>Notice:</strong> There are currently{" "}
                  <strong>{unresolvedItemsCount} open obligation item(s)</strong>.
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Final Closure Remarks / Authority Signoff
              </label>
              <textarea
                rows={3}
                placeholder="Final closure statement, signoff confirmation, or archiving reference..."
                value={closeoutForm?.final_closure_remarks || ""}
                onChange={(e) =>
                  setCloseoutForm({ ...closeoutForm, final_closure_remarks: e.target.value })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkProjectClosed}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs"
              >
                <Check size={14} /> Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PRINT HANDOVER & CLOSEOUT CERTIFICATE */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 p-8 space-y-6 my-8">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                  OmniSuite ERP • Project Closeout Dossier
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  PROJECT HANDOVER & CLOSEOUT CERTIFICATE
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Reference: {closeoutForm?.handover_ref || "HND-PRJ-2026"} • Date: {closeoutForm?.handover_date}
                </p>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-400 uppercase font-semibold">Project Information</p>
                <p className="font-bold text-sm text-slate-800">{projectData?.project_name}</p>
                <p>Code: #{projectData?.project_code}</p>
                <p>Manager: {projectData?.manager_name || "—"}</p>
              </div>

              <div className="space-y-1 p-3 bg-slate-50 rounded-lg">
                <p className="text-slate-400 uppercase font-semibold">Handover & Acceptance</p>
                <p>Recipient: {closeoutForm?.handover_to || "—"}</p>
                <p>Receiving Org: {closeoutForm?.receiving_org || "—"}</p>
                <p>
                  Status: <strong>{closeoutForm?.acceptance_status}</strong>
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Handed Over Deliverables ({deliverables.length})
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Deliverable Name</th>
                      <th className="p-2">Quantity</th>
                      <th className="p-2">Responsible</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deliverables.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-3 text-center text-slate-400 italic">
                          No deliverables recorded.
                        </td>
                      </tr>
                    ) : (
                      deliverables.map((d, i) => (
                        <tr key={i}>
                          <td className="p-2 font-semibold">{d.deliverable_name}</td>
                          <td className="p-2">
                            {d.quantity} {d.unit}
                          </td>
                          <td className="p-2">{d.responsible_person}</td>
                          <td className="p-2 font-mono">{d.handover_status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-xs">
              <div className="space-y-2">
                <p className="font-semibold text-slate-700">Handed Over By (Project Authority):</p>
                <div className="h-8 border-b border-slate-300"></div>
                <p className="text-slate-500 font-mono text-[11px]">
                  {closeoutForm?.verified_by || projectData?.manager_name} • Date: {closeoutForm?.handover_date}
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-slate-700">Accepted By (Receiving Entity):</p>
                <div className="h-8 border-b border-slate-300"></div>
                <p className="text-slate-500 font-mono text-[11px]">
                  {closeoutForm?.accepted_by || "Authorized Representative"} • Date: {closeoutForm?.acceptance_date || "—"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-3 py-1.5 rounded-lg border text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-3.5 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Printer size={13} /> Print Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
