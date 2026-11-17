/**
 * @file VariationRegister.jsx
 * @description Project Change Management workspace for OmniSuite ERP.
 * General-purpose change control for all project types:
 * - Change requests & registers
 * - Multi-domain changes: Scope, Schedule, Budget & Cost, Resource, Design & Specs
 * - Multi-domain impact assessment (Cost impact, schedule shift, affected tasks, risks)
 * - Change history, review workflows, approval tracking, and cross-project connections.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FileEdit,
  Plus,
  DollarSign,
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  X,
  AlertTriangle,
  Search,
  RefreshCw,
  FileText,
  Layers,
  ShieldCheck,
  Download,
  Printer,
  Trash2,
  Sliders,
  Building,
  CheckCircle2,
  Package,
  History,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Paperclip,
  Check,
  Lock,
  GitBranch,
  Timer,
  AlertOctagon,
  Users,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

// General-Purpose Change Categories
export const CHANGE_CATEGORIES = [
  { id: "SCOPE", label: "Scope Change", desc: "Work Plan/WBS additions, omissions, or deliverable modifications", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  { id: "SCHEDULE", label: "Schedule Change", desc: "Milestone shifts, deadline extensions, or delivery accelerations", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  { id: "BUDGET", label: "Budget & Cost Change", desc: "Cost adjustments, contingency allocations, or rate variances", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  { id: "RESOURCE", label: "Resource Change", desc: "Staffing, key personnel, or vendor reallocations", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  { id: "DESIGN", label: "Design & Spec Change", desc: "Technical architecture, engineering revisions, or specifications", color: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800" },
  { id: "OTHER", label: "General Change Request", desc: "Contractual amendments, operational changes, or client directives", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" },
];

export const STATUS_BADGES = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  SUBMITTED: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  UNDER_ASSESSMENT: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  PENDING_AUTHORIZATION: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800 animate-pulse",
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  REJECTED: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200 line-through",
};

export const PRIORITY_BADGES = {
  URGENT: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
  HIGH: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  MEDIUM: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export default function VariationRegister() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryProjectId = searchParams.get("projectId") || "";

  // Data states
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(queryProjectId);
  const [changesList, setChangesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Drawer / Modal state for Create / Edit / Inspect
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState("details"); // 'details' | 'impact' | 'items' | 'governance'
  const [activeChange, setActiveChange] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    id: null,
    project_id: "",
    variation_no: "",
    title: "",
    description: "",
    reason: "",
    originator: "Project Manager",
    change_type: "SCOPE",
    priority: "MEDIUM",
    date_raised: new Date().toISOString().split("T")[0],
    effective_date: "",
    cost_impact: 0,
    contractor_proposed_amount: 0,
    assessed_amount: 0,
    amount_approved: 0,
    schedule_impact_days: 0,
    original_completion_date: "",
    revised_completion_date: "",
    affected_tasks: "",
    risk_assessment: "LOW",
    status: "DRAFT",
    client_approval_ref: "",
    pm_review_comments: "",
    qs_review_comments: "",
    finance_review_comments: "",
    remarks: "",
    items: [],
  });

  // Print Modal
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printChange, setPrintChange] = useState(null);

  // Load Projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load Changes when selectedProjectId changes
  useEffect(() => {
    loadChanges(selectedProjectId);
    if (selectedProjectId) {
      loadProjectTasks(selectedProjectId);
    } else {
      setProjectTasks([]);
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      const res = await api.get("/projects/projects", { params: { active: "all" } });
      const items = res.data?.items || res.data?.data || [];
      setProjects(items);
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  };

  const loadProjectTasks = async (projId) => {
    try {
      const res = await api.get("/projects/tasks", { params: { project_id: projId } });
      const items = res.data?.items || res.data?.tasks || [];
      setProjectTasks(items);
    } catch {
      setProjectTasks([]);
    }
  };

  const loadChanges = async (projId) => {
    try {
      setLoading(true);
      const params = {};
      if (projId) params.project_id = projId;
      const res = await api.get("/construction/variations", { params });
      setChangesList(res.data?.items || []);
    } catch (err) {
      console.error("Failed to load project changes:", err);
      toast.error("Failed to load change requests");
    } finally {
      setLoading(false);
    }
  };

  // Open Drawer for New Change Request
  const handleOpenNewChange = () => {
    const curProj = (Array.isArray(projects) ? projects : []).find((p) => String(p.id) === String(selectedProjectId));
    const prjCode = curProj?.project_code || "PRJ";
    const nextSeq = String(changesList.length + 1).padStart(3, "0");
    const autoRef = `CR-${prjCode}-${new Date().getFullYear()}-${nextSeq}`;

    setFormData({
      id: null,
      project_id: selectedProjectId || (projects[0]?.id ? String(projects[0].id) : ""),
      variation_no: autoRef,
      title: "",
      description: "",
      reason: "",
      originator: "Project Manager",
      change_type: "SCOPE",
      priority: "MEDIUM",
      date_raised: new Date().toISOString().split("T")[0],
      effective_date: "",
      cost_impact: 0,
      contractor_proposed_amount: 0,
      assessed_amount: 0,
      amount_approved: 0,
      schedule_impact_days: 0,
      original_completion_date: curProj?.end_date ? String(curProj.end_date).split("T")[0] : "",
      revised_completion_date: "",
      affected_tasks: "",
      risk_assessment: "LOW",
      status: "DRAFT",
      client_approval_ref: "",
      pm_review_comments: "",
      qs_review_comments: "",
      finance_review_comments: "",
      remarks: "",
      items: [],
    });
    setActiveChange(null);
    setActiveDrawerTab("details");
    setIsDrawerOpen(true);
  };

  // Open Drawer for Existing Change Request
  const handleOpenEditChange = async (chg) => {
    try {
      setLoading(true);
      const res = await api.get(`/construction/variations/${chg.id}`);
      const v = res.data?.variation || chg;
      const itms = res.data?.items || [];

      setFormData({
        id: v.id,
        project_id: String(v.project_id || ""),
        variation_no: v.variation_no || "",
        title: v.title || "",
        description: v.description || "",
        reason: v.reason || "",
        originator: v.originator || "Project Manager",
        change_type: v.change_type || "SCOPE",
        priority: v.priority || "MEDIUM",
        date_raised: v.date_raised ? String(v.date_raised).split("T")[0] : "",
        effective_date: v.effective_date ? String(v.effective_date).split("T")[0] : "",
        cost_impact: Number(v.cost_impact || 0),
        contractor_proposed_amount: Number(v.contractor_proposed_amount || v.cost_impact || 0),
        assessed_amount: Number(v.assessed_amount || 0),
        amount_approved: Number(v.amount_approved || 0),
        schedule_impact_days: Number(v.schedule_impact_days || 0),
        original_completion_date: v.original_completion_date ? String(v.original_completion_date).split("T")[0] : "",
        revised_completion_date: v.revised_completion_date ? String(v.revised_completion_date).split("T")[0] : "",
        affected_tasks: v.affected_tasks || "",
        risk_assessment: v.risk_assessment || "LOW",
        status: v.status || "DRAFT",
        client_approval_ref: v.client_approval_ref || "",
        pm_review_comments: v.pm_review_comments || "",
        qs_review_comments: v.qs_review_comments || "",
        finance_review_comments: v.finance_review_comments || "",
        remarks: v.remarks || "",
        items: itms,
      });

      if (v.project_id) {
        loadProjectTasks(v.project_id);
      }

      setActiveChange(v);
      setActiveDrawerTab("details");
      setIsDrawerOpen(true);
    } catch (err) {
      console.error("Failed to load change details:", err);
      toast.error("Failed to load change details");
    } finally {
      setLoading(false);
    }
  };

  // Save or Update Change Request
  const handleSaveChange = async (targetStatus = null) => {
    if (!formData.project_id || !formData.title.trim()) {
      toast.warn("Please select a project and provide a Change Title.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        status: targetStatus || formData.status || "DRAFT",
      };

      if (formData.id) {
        await api.put(`/construction/variations/${formData.id}`, payload);
        toast.success("Change Request updated successfully!");
      } else {
        await api.post("/construction/variations", payload);
        toast.success("Change Request created successfully!");
      }

      setIsDrawerOpen(false);
      await loadChanges(selectedProjectId);
    } catch (err) {
      console.error("Failed to save change request:", err);
      toast.error(err?.response?.data?.message || "Failed to save change request");
    } finally {
      setSaving(false);
    }
  };

  // Quick Advance Workflow / Approve
  const handleQuickApprove = async (chg) => {
    try {
      setSaving(true);
      await api.post(`/construction/variations/${chg.id}/advance-workflow`, {
        target_status: "APPROVED",
        amount_approved: chg.cost_impact || chg.assessed_amount || 0,
      });
      toast.success(`Change Request #${chg.variation_no} approved!`);
      await loadChanges(selectedProjectId);
    } catch (err) {
      toast.error("Failed to approve change request");
    } finally {
      setSaving(false);
    }
  };

  // Delete Change Request
  const handleDeleteChange = async (id, refNo) => {
    if (!window.confirm(`Are you sure you want to delete Change Request #${refNo}?`)) return;
    try {
      setSaving(true);
      await api.delete(`/construction/variations/${id}`);
      toast.success("Change Request deleted.");
      await loadChanges(selectedProjectId);
    } catch {
      toast.error("Failed to delete change request");
    } finally {
      setSaving(false);
    }
  };

  // Items manipulation
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `tmp-${Date.now()}`,
          item_code: "",
          item_description: "",
          change_action: "ADDITION",
          uom: "EA",
          original_qty: 0,
          original_rate: 0,
          original_amount: 0,
          revised_qty: 1,
          proposed_rate: 0,
          proposed_amount: 0,
          cost_diff: 0,
        },
      ],
    }));
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...formData.items];
    const row = { ...updated[index], [field]: value };

    // Auto-calculate cost diff
    if (field === "revised_qty" || field === "proposed_rate") {
      const q = Number(field === "revised_qty" ? value : row.revised_qty || 0);
      const r = Number(field === "proposed_rate" ? value : row.proposed_rate || 0);
      const propAmt = q * r;
      row.proposed_amount = propAmt;
      row.cost_diff = propAmt - Number(row.original_amount || 0);
    }

    updated[index] = row;
    const totalDiff = updated.reduce((sum, itm) => sum + Number(itm.cost_diff || 0), 0);

    setFormData((prev) => ({
      ...prev,
      items: updated,
      cost_impact: totalDiff,
      contractor_proposed_amount: totalDiff,
    }));
  };

  const handleRemoveItem = (index) => {
    const updated = formData.items.filter((_, i) => i !== index);
    const totalDiff = updated.reduce((sum, itm) => sum + Number(itm.cost_diff || 0), 0);
    setFormData((prev) => ({
      ...prev,
      items: updated,
      cost_impact: totalDiff,
      contractor_proposed_amount: totalDiff,
    }));
  };

  // Filtered Changes
  const filteredChanges = useMemo(() => {
    return changesList.filter((c) => {
      // Category filter
      if (categoryFilter !== "ALL" && c.change_type !== categoryFilter) return false;

      // Status filter
      if (statusFilter === "PENDING" && !["DRAFT", "SUBMITTED", "UNDER_ASSESSMENT", "PENDING_AUTHORIZATION"].includes(c.status)) return false;
      if (statusFilter === "APPROVED" && c.status !== "APPROVED") return false;
      if (statusFilter === "REJECTED" && c.status !== "REJECTED") return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (c.title || "").toLowerCase().includes(q);
        const matchRef = (c.variation_no || "").toLowerCase().includes(q);
        const matchOriginator = (c.originator || "").toLowerCase().includes(q);
        const matchProj = (c.project_name || "").toLowerCase().includes(q);
        if (!matchTitle && !matchRef && !matchOriginator && !matchProj) return false;
      }

      return true;
    });
  }, [changesList, categoryFilter, statusFilter, searchQuery]);

  // Aggregate KPI Highlights
  const kpis = useMemo(() => {
    const total = changesList.length;
    const pending = changesList.filter((c) => ["DRAFT", "SUBMITTED", "UNDER_ASSESSMENT", "PENDING_AUTHORIZATION"].includes(c.status)).length;
    const approved = changesList.filter((c) => c.status === "APPROVED");
    const totalApprovedCost = approved.reduce((sum, c) => sum + Number(c.amount_approved || c.cost_impact || 0), 0);
    const totalDaysShift = approved.reduce((sum, c) => sum + Number(c.schedule_impact_days || 0), 0);
    const rejected = changesList.filter((c) => c.status === "REJECTED").length;

    return {
      total,
      pending,
      approvedCount: approved.length,
      totalApprovedCost,
      totalDaysShift,
      rejected,
    };
  }, [changesList]);

  // Active Project helper
  const currentProjectObj = (Array.isArray(projects) ? projects : []).find((p) => String(p.id) === String(selectedProjectId));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 animate-in fade-in duration-300">
      {/* Header Bar */}
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
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Project Management
              </span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                Change Governance
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-0.5">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Project Change Management
              </h1>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {filteredChanges.length} Records
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadChanges(selectedProjectId)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleOpenNewChange}
            className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus size={14} /> New Change Request
          </button>
        </div>
      </div>

      {/* Cross-Module Navigation Ribbon */}
      {selectedProjectId && currentProjectObj && (
        <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Building size={15} className="text-brand-600 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-white">
              {currentProjectObj.project_name} ({currentProjectObj.project_code || "PRJ"})
            </span>
          </div>

          <div className="flex items-center gap-2 font-medium">
            <span className="text-slate-400">Jump to:</span>
            <Link
              to={`/project-management/gantt?projectId=${selectedProjectId}`}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-brand-600 inline-flex items-center gap-1"
            >
              Gantt Schedule <ExternalLink size={11} />
            </Link>
            <Link
              to="/project-management/cost-control"
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-brand-600 inline-flex items-center gap-1"
            >
              Cost Control <ExternalLink size={11} />
            </Link>
            <Link
              to="/project-management/reports/task-execution"
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-brand-600 inline-flex items-center gap-1"
            >
              Task Delay Log <ExternalLink size={11} />
            </Link>
          </div>
        </div>
      )}

      {/* KPI Highlights Ribbon - 4 Compact Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Changes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Change Requests
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {kpis.total}
            </div>
            <span className="text-[10px] text-slate-500">
              Across project portfolio
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <GitBranch size={16} />
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Pending Assessment
            </span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {kpis.pending}
            </div>
            <span className="text-[10px] text-amber-600/80 font-medium">
              Awaiting review / signoff
            </span>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
            <Clock size={16} />
          </div>
        </div>

        {/* Approved Cost Impact */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Approved Cost Impact
            </span>
            <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              +GH₵ {kpis.totalApprovedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400">
              {kpis.approvedCount} authorized changes
            </span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
            <DollarSign size={16} />
          </div>
        </div>

        {/* Schedule Shift Impact */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Schedule Shift
            </span>
            <div className="text-xl font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              +{kpis.totalDaysShift} Days
            </div>
            <span className="text-[10px] text-slate-400">
              Approved timeline variance
            </span>
          </div>
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
            <Timer size={16} />
          </div>
        </div>
      </div>

      {/* Control & Filter Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Project Selector */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Building size={15} className="text-slate-400 shrink-0" />
          <select
            value={selectedProjectId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedProjectId(val);
              setSearchParams(val ? { projectId: val } : {});
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Projects (Company Portfolio)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} ({p.project_code || "PRJ"})
              </option>
            ))}
          </select>
        </div>

        {/* Change Category Selector */}
        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <Sliders size={15} className="text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="ALL">All Change Categories</option>
            {CHANGE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {[
            { id: "ALL", label: "All" },
            { id: "PENDING", label: `Pending (${kpis.pending})` },
            { id: "APPROVED", label: `Approved (${kpis.approvedCount})` },
            { id: "REJECTED", label: `Rejected (${kpis.rejected})` },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === pill.id
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search change ref, title, requester..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Main Change Register Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 font-semibold uppercase">
                <th className="py-2.5 px-3 w-32">Ref #</th>
                <th className="py-2.5 px-3 min-w-[180px]">Change Title & Details</th>
                <th className="py-2.5 px-3">Project</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Impact Assessment</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Date Raised</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-brand-600" />
                    Loading change requests...
                  </td>
                </tr>
              ) : filteredChanges.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 space-y-2">
                    <GitBranch size={28} className="mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      No Change Requests Found
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      There are currently no change orders or variation requests matching the selected criteria.
                    </p>
                    <button
                      onClick={handleOpenNewChange}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs inline-flex items-center gap-1"
                    >
                      <Plus size={13} /> Create First Change Request
                    </button>
                  </td>
                </tr>
              ) : (
                filteredChanges.map((item) => {
                  const catObj = CHANGE_CATEGORIES.find((c) => c.id === item.change_type) || CHANGE_CATEGORIES[0];
                  const priorityClass = PRIORITY_BADGES[item.priority] || PRIORITY_BADGES.MEDIUM;
                  const statusClass = STATUS_BADGES[item.status] || STATUS_BADGES.DRAFT;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Ref # */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {item.variation_no || `CR-${item.id}`}
                      </td>

                      {/* Title & Description */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white hover:text-brand-600 cursor-pointer"
                          onClick={() => handleOpenEditChange(item)}
                        >
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </td>

                      {/* Project */}
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        <span className="font-medium">{item.project_name || "General"}</span>
                        {item.project_code && (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            #{item.project_code}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catObj.color}`}>
                          {catObj.label}
                        </span>
                      </td>

                      {/* Impact Assessment */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-0.5 font-mono text-[11px]">
                          <span className={Number(item.cost_impact || 0) > 0 ? "text-emerald-600 font-bold" : "text-slate-500"}>
                            {Number(item.cost_impact || 0) > 0
                              ? `+GH₵ ${Number(item.cost_impact).toLocaleString()}`
                              : "GH₵ 0.00"}
                          </span>
                          {Number(item.schedule_impact_days || 0) > 0 ? (
                            <span className="text-blue-600 dark:text-blue-400 text-[10px] flex items-center gap-1">
                              <Timer size={10} /> +{item.schedule_impact_days} days
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">0 schedule delay</span>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${priorityClass}`}>
                          {item.priority || "MEDIUM"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusClass}`}>
                          {item.status?.replace(/_/g, " ") || "DRAFT"}
                        </span>
                      </td>

                      {/* Date Raised */}
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {item.date_raised ? String(item.date_raised).split("T")[0] : "—"}
                        {item.originator && (
                          <span className="text-[10px] text-slate-400 block font-sans truncate max-w-[100px]">
                            by {item.originator}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditChange(item)}
                            className="p-1 rounded text-slate-500 hover:text-brand-600 hover:bg-slate-100"
                            title="Inspect & Edit Change Request"
                          >
                            <FileEdit size={14} />
                          </button>
                          {item.status !== "APPROVED" && (
                            <button
                              onClick={() => handleQuickApprove(item)}
                              disabled={saving}
                              className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                              title="Approve Change Request"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setPrintChange(item);
                              setShowPrintModal(true);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                            title="Print Change Order Certificate"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteChange(item.id, item.variation_no)}
                            disabled={saving}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer for Change Details / Impact Assessment */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <GitBranch size={16} className="text-brand-600" />
                  <span className="font-mono text-xs font-bold text-slate-500 uppercase">
                    {formData.variation_no || "New Change Request"}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${STATUS_BADGES[formData.status] || STATUS_BADGES.DRAFT}`}>
                    {formData.status?.replace(/_/g, " ")}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {formData.id ? "Edit Change Request & Assessment" : "Create Project Change Request"}
                </h2>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="px-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
              {[
                { id: "details", label: "1. Change Details", icon: FileText },
                { id: "impact", label: "2. Impact Assessment", icon: Sliders },
                { id: "items", label: `3. Scope & Items (${formData.items.length})`, icon: Package },
                { id: "governance", label: "4. Review & Approval", icon: ShieldCheck },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDrawerTab(tab.id)}
                    className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                      activeDrawerTab === tab.id
                        ? "border-brand-600 text-brand-600 dark:text-brand-400"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* TAB 1: DETAILS */}
              {activeDrawerTab === "details" && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Project *
                    </label>
                    <select
                      value={formData.project_id}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setFormData({ ...formData, project_id: pid });
                        if (pid) loadProjectTasks(pid);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">-- Select Project --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.project_name} ({p.project_code || "PRJ"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Change Request Reference # *
                      </label>
                      <input
                        type="text"
                        value={formData.variation_no}
                        onChange={(e) => setFormData({ ...formData, variation_no: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Change Category *
                      </label>
                      <select
                        value={formData.change_type}
                        onChange={(e) => setFormData({ ...formData, change_type: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold focus:outline-none"
                      >
                        {CHANGE_CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label} — {cat.desc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Change Request Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Scope extension for structural redesign and additional server installation"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Priority Level
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold focus:outline-none"
                      >
                        <option value="URGENT">URGENT</option>
                        <option value="HIGH">HIGH</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="LOW">LOW</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Originator / Requester
                      </label>
                      <input
                        type="text"
                        placeholder="Client, PM, Lead..."
                        value={formData.originator}
                        onChange={(e) => setFormData({ ...formData, originator: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Date Raised
                      </label>
                      <input
                        type="date"
                        value={formData.date_raised}
                        onChange={(e) => setFormData({ ...formData, date_raised: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Reason for Change & Business Justification
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Why is this change necessary? Unforeseen condition, client request, architectural optimization..."
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Detailed Change Description / Statement of Work
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Full technical or operational description of the changes to be carried out..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: IMPACT ASSESSMENT */}
              {activeDrawerTab === "impact" && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <DollarSign size={14} className="text-emerald-600" />
                      Financial & Cost Impact Assessment
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Estimated Cost Impact (GH₵)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.cost_impact}
                          onChange={(e) => setFormData({ ...formData, cost_impact: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Approved Amount (GH₵)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={formData.amount_approved}
                          onChange={(e) => setFormData({ ...formData, amount_approved: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <Timer size={14} className="text-blue-600" />
                      Schedule & Delivery Timeline Impact
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Schedule Impact (Days)
                        </label>
                        <input
                          type="number"
                          value={formData.schedule_impact_days}
                          onChange={(e) => setFormData({ ...formData, schedule_impact_days: Number(e.target.value) })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-blue-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Revised Project Completion Date
                        </label>
                        <input
                          type="date"
                          value={formData.revised_completion_date}
                          onChange={(e) => setFormData({ ...formData, revised_completion_date: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <ShieldAlert size={14} className="text-amber-600" />
                      Scope, Work Plan/WBS & Risk Impact
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Affected Work Plan/WBS Task
                        </label>
                        <select
                          value={formData.affected_tasks}
                          onChange={(e) => setFormData({ ...formData, affected_tasks: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none"
                        >
                          <option value="">-- General / Entire Scope --</option>
                          {projectTasks.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.scope_name ? `${t.scope_name} — ` : ""}{t.title || t.task_title || `Task #${t.id}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Risk Severity Rating
                        </label>
                        <select
                          value={formData.risk_assessment}
                          onChange={(e) => setFormData({ ...formData, risk_assessment: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold focus:outline-none"
                        >
                          <option value="LOW">LOW RISK</option>
                          <option value="MEDIUM">MEDIUM RISK</option>
                          <option value="HIGH">HIGH RISK</option>
                          <option value="CRITICAL">CRITICAL RISK</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LINE ITEMS BREAKDOWN */}
              {activeDrawerTab === "items" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                        Itemized Scope & Cost Breakdown ({formData.items.length})
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Itemize specific additions, omissions, or rate modifications.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                    >
                      <Plus size={13} /> Add Item
                    </button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Description</th>
                          <th className="py-2 px-2 w-28">Action</th>
                          <th className="py-2 px-2 w-20">Qty</th>
                          <th className="py-2 px-2 w-24">Rate (GH₵)</th>
                          <th className="py-2 px-3 w-28">Cost Diff</th>
                          <th className="py-2 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {formData.items.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-400">
                              No items added. Click &quot;Add Item&quot; to break down specific change deliverables.
                            </td>
                          </tr>
                        ) : (
                          formData.items.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-2">
                                <input
                                  type="text"
                                  placeholder="Item deliverable description..."
                                  value={row.item_description || ""}
                                  onChange={(e) => handleUpdateItem(idx, "item_description", e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none"
                                />
                              </td>
                              <td className="p-2">
                                <select
                                  value={row.change_action || "ADDITION"}
                                  onChange={(e) => handleUpdateItem(idx, "change_action", e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:outline-none"
                                >
                                  <option value="ADDITION">ADDITION (+)</option>
                                  <option value="MODIFICATION">MODIFICATION</option>
                                  <option value="OMISSION">OMISSION (-)</option>
                                  <option value="REPLACEMENT">REPLACEMENT</option>
                                </select>
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={row.revised_qty ?? 1}
                                  onChange={(e) => handleUpdateItem(idx, "revised_qty", e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  value={row.proposed_rate ?? 0}
                                  onChange={(e) => handleUpdateItem(idx, "proposed_rate", e.target.value)}
                                  className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none"
                                />
                              </td>
                              <td className="p-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                                GH₵ {Number(row.cost_diff || 0).toLocaleString()}
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1"
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
              )}

              {/* TAB 4: GOVERNANCE & APPROVAL */}
              {activeDrawerTab === "governance" && (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Workflow Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold focus:outline-none"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="SUBMITTED">SUBMITTED FOR REVIEW</option>
                        <option value="UNDER_ASSESSMENT">UNDER TECHNICAL ASSESSMENT</option>
                        <option value="PENDING_AUTHORIZATION">PENDING AUTHORIZATION</option>
                        <option value="APPROVED">APPROVED & AUTHORIZED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Client / Stakeholder Approval Ref
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CLI-APR-2026-88"
                        value={formData.client_approval_ref}
                        onChange={(e) => setFormData({ ...formData, client_approval_ref: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Project Manager Review Comments
                    </label>
                    <textarea
                      rows={2}
                      placeholder="PM evaluation notes and recommendation..."
                      value={formData.pm_review_comments}
                      onChange={(e) => setFormData({ ...formData, pm_review_comments: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Commercial & Finance Review Comments
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Budget verification, funding source, or voucher notes..."
                      value={formData.finance_review_comments}
                      onChange={(e) => setFormData({ ...formData, finance_review_comments: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveChange("DRAFT")}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveChange("APPROVED")}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs"
                >
                  <Check size={14} /> Approve & Save
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveChange()}
                  disabled={saving}
                  className="px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs"
                >
                  {saving ? "Saving..." : "Save Change Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Change Order Certificate Modal */}
      {showPrintModal && printChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 p-8 space-y-5 my-8">
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">
                  OmniSuite ERP • Project Change Governance
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  PROJECT CHANGE ORDER CERTIFICATE
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Ref: {printChange.variation_no} • Date Raised: {printChange.date_raised ? String(printChange.date_raised).split("T")[0] : "—"}
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
              <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                <span className="text-slate-400 uppercase font-semibold">Change Scope & Project</span>
                <p className="font-bold text-slate-900">{printChange.title}</p>
                <p>Project: {printChange.project_name || "—"}</p>
                <p>Category: <strong>{printChange.change_type}</strong></p>
                <p>Priority: {printChange.priority}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                <span className="text-slate-400 uppercase font-semibold">Impact Assessment</span>
                <p>
                  Cost Impact:{" "}
                  <strong className="text-emerald-600 font-mono">
                    GH₵ {Number(printChange.cost_impact || 0).toLocaleString()}
                  </strong>
                </p>
                <p>
                  Schedule Impact:{" "}
                  <strong className="font-mono">+{printChange.schedule_impact_days || 0} Days</strong>
                </p>
                <p>Status: <strong>{printChange.status}</strong></p>
                <p>Originator: {printChange.originator || "Project Manager"}</p>
              </div>
            </div>

            {printChange.description && (
              <div className="text-xs space-y-1">
                <span className="font-semibold text-slate-700">Scope of Change / Description:</span>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {printChange.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 text-xs">
              <div className="space-y-2">
                <p className="font-semibold text-slate-700">Project Manager / Change Authority:</p>
                <div className="h-8 border-b border-slate-300"></div>
                <p className="text-slate-400 font-mono text-[11px]">Authorized Signatory</p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-slate-700">Client / Project Sponsor Acceptance:</p>
                <div className="h-8 border-b border-slate-300"></div>
                <p className="text-slate-400 font-mono text-[11px]">
                  Ref: {printChange.client_approval_ref || "Pending"}
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
