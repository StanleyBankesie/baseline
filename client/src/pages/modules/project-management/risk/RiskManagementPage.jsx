/**
 * @file RiskManagementPage.jsx
 * @description Enterprise-grade Risk Management & Assessment System for OmniSuite ERP.
 * Supports manual & AI-assisted risk identification, 5x5 interactive heat map,
 * inherent & residual risk tracking, mitigation effectiveness evaluation, dynamic
 * event-driven monitoring, risk-to-issue materialisation, and comprehensive reporting.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ShieldAlert,
  ArrowLeft,
  Plus,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Sparkles,
  Layers,
  Filter,
  Check,
  X,
  Eye,
  Edit,
  Trash2,
  TrendingDown,
  TrendingUp,
  Activity,
  History,
  FileCheck2,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  ShieldOff,
  Flame,
  Zap,
  Info,
  Calendar,
  User,
  FolderKanban,
  Target,
  ListTodo,
} from "lucide-react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import { api } from "../../../../api/client.js";

// Risk Classification helper
const getClassificationConfig = (score) => {
  if (score >= 17) {
    return {
      label: "Critical",
      bg: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800",
      pill: "bg-rose-600 text-white",
      border: "border-rose-500",
      color: "#e11d48",
    };
  }
  if (score >= 10) {
    return {
      label: "High",
      bg: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-200 dark:border-orange-800",
      pill: "bg-orange-500 text-white",
      border: "border-orange-500",
      color: "#f97316",
    };
  }
  if (score >= 5) {
    return {
      label: "Moderate",
      bg: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
      pill: "bg-amber-500 text-white",
      border: "border-amber-500",
      color: "#f59e0b",
    };
  }
  return {
    label: "Low",
    bg: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800",
    pill: "bg-emerald-600 text-white",
    border: "border-emerald-500",
    color: "#10b981",
  };
};

// Heatmap cell color based on score
const getHeatmapCellColor = (likelihood, impact) => {
  const score = likelihood * impact;
  if (score >= 17) return "bg-rose-600 hover:bg-rose-700 text-white border-rose-700";
  if (score >= 10) return "bg-orange-500 hover:bg-orange-600 text-white border-orange-600";
  if (score >= 5) return "bg-amber-400 hover:bg-amber-500 text-slate-900 border-amber-500";
  return "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600";
};

const RISK_STATUSES = [
  { value: "ALL", label: "All Statuses" },
  { value: "IDENTIFIED", label: "Identified", badge: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300" },
  { value: "ASSESSED", label: "Assessed", badge: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300" },
  { value: "MITIGATION_IN_PROGRESS", label: "Mitigating", badge: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300" },
  { value: "RESIDUAL_ACCEPTABLE", label: "Acceptable", badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300" },
  { value: "CLOSED", label: "Closed", badge: "bg-slate-200 text-slate-600 border-slate-400 dark:bg-slate-800 dark:text-slate-400" },
  { value: "MATERIALISED", label: "Materialised (Issue)", badge: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300" },
];

const DEFAULT_AREAS = [
  "Cost",
  "Time/Schedule",
  "Scope",
  "Quality",
  "Resources",
  "Safety",
  "Environment",
  "Compliance",
  "Stakeholder Satisfaction",
];

const STRATEGIES = [
  { value: "AVOID", label: "Avoid (Eliminate Threat)" },
  { value: "REDUCE", label: "Reduce (Mitigate Likelihood/Impact)" },
  { value: "TRANSFER", label: "Transfer (Insurance/Contract)" },
  { value: "ACCEPT", label: "Accept (Acknowledge & Monitor)" },
];

export default function RiskManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "ALL";

  // Data State
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [risks, setRisks] = useState([]);
  const [stats, setStats] = useState({
    total_risks: 0,
    critical_risks: 0,
    high_risks: 0,
    moderate_risks: 0,
    low_risks: 0,
    open_risks: 0,
    under_mitigation: 0,
    materialised: 0,
    overdue_actions: 0,
    effective_mitigations: 0,
    avg_reduction_percent: 0,
  });
  const [matrixData, setMatrixData] = useState([]);
  const [matrixMode, setMatrixMode] = useState("INHERENT"); // "INHERENT" or "RESIDUAL"
  const [mitigationActions, setMitigationActions] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [monitoringEvents, setMonitoringEvents] = useState([]);

  // Active Tab: overview | register | matrix | mitigation | monitoring | ai
  const [activeTab, setActiveTab] = useState("overview");

  // Filters
  const [selectedProject, setSelectedProject] = useState(initialProjectId);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedLevel, setSelectedLevel] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState(null);
  const [reassessModalOpen, setReassessModalOpen] = useState(false);
  const [reassessingRisk, setReassessingRisk] = useState(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [actionTargetRisk, setActionTargetRisk] = useState(null);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closingRisk, setClosingRisk] = useState(null);
  const [materialiseModalOpen, setMaterialiseModalOpen] = useState(false);
  const [materialisingRisk, setMaterialisingRisk] = useState(null);
  const [matrixCellModalOpen, setMatrixCellModalOpen] = useState(false);
  const [selectedCellRisks, setSelectedCellRisks] = useState({ likelihood: 0, impact: 0, risks: [] });

  // Scan & AI running spinners
  const [scanningEvents, setScanningEvents] = useState(false);
  const [runningAi, setRunningAi] = useState(false);

  // Form States
  const [riskForm, setRiskForm] = useState({
    project_id: "",
    risk_code: "",
    risk_title: "",
    description: "",
    category_id: "",
    risk_source: "",
    risk_cause: "",
    potential_consequences: "",
    affected_area: "Cost",
    inherent_likelihood: 3,
    inherent_impact: 3,
    existing_controls: "",
    residual_likelihood: 2,
    residual_impact: 2,
    treatment_strategy: "REDUCE",
    mitigation_plan: "",
    contingency_plan: "",
    target_mitigation_date: "",
    risk_owner: "",
    notes: "",
  });

  const [reassessForm, setReassessForm] = useState({
    residual_likelihood: 3,
    residual_impact: 3,
    trigger_event: "Periodic Reassessment",
    reassessment_notes: "",
  });

  const [actionForm, setActionForm] = useState({
    risk_id: "",
    action_title: "",
    description: "",
    responsible_person: "",
    start_date: "",
    due_date: "",
    completion_date: "",
    progress_percent: 0,
    status: "NOT_STARTED",
    estimated_cost: "",
    actual_cost: "",
    remarks: "",
  });

  const [closeForm, setCloseForm] = useState({
    closure_justification: "",
  });

  const [materialiseForm, setMaterialiseForm] = useState({
    materialisation_date: new Date().toISOString().slice(0, 10),
    actual_impact_description: "",
    initial_containment_action: "",
  });

  // Load Projects & Categories once
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [prjRes, catRes] = await Promise.all([
          api.get("/projects/projects", { params: { active: "all" } }),
          api.get("/projects/risks/categories"),
        ]);
        const prjList = prjRes.data?.items || prjRes.data?.data || (Array.isArray(prjRes.data) ? prjRes.data : []);
        const catList = catRes.data?.data || catRes.data?.items || (Array.isArray(catRes.data) ? catRes.data : []);
        setProjects(Array.isArray(prjList) ? prjList : []);
        setCategories(Array.isArray(catList) ? catList : []);
      } catch (err) {
        console.error("Failed to load projects/categories:", err);
      }
    }
    loadMasterData();
  }, []);

  // Fetch Core Data (Risks, Stats, Matrix)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const prjParam = selectedProject !== "ALL" ? `projectId=${selectedProject}` : "";
      const catParam = selectedCategory !== "ALL" ? `category=${selectedCategory}` : "";
      const lvlParam = selectedLevel !== "ALL" ? `level=${selectedLevel}` : "";
      const stParam = selectedStatus !== "ALL" ? `status=${selectedStatus}` : "";
      const searchParam = searchTerm ? `search=${encodeURIComponent(searchTerm)}` : "";

      const queryParts = [prjParam, catParam, lvlParam, stParam, searchParam].filter(Boolean).join("&");
      const qs = queryParts ? `?${queryParts}` : "";

      const [risksRes, statsRes, matrixRes] = await Promise.all([
        api.get(`/projects/risks${qs}`),
        api.get(`/projects/risks/stats${prjParam ? `?${prjParam}` : ""}`),
        api.get(`/projects/risks/matrix?type=${matrixMode}${prjParam ? `&${prjParam}` : ""}`),
      ]);

      const rList = risksRes.data?.data || risksRes.data?.items || (Array.isArray(risksRes.data) ? risksRes.data : []);
      setRisks(Array.isArray(rList) ? rList : []);
      setStats(statsRes.data?.data || statsRes.data || {});
      const mList = matrixRes.data?.data || (Array.isArray(matrixRes.data) ? matrixRes.data : []);
      setMatrixData(Array.isArray(mList) ? mList : []);
    } catch (err) {
      console.error("Failed to load risk data:", err);
      toast.error("Failed to load risk register data");
    } finally {
      setLoading(false);
    }
  }, [selectedProject, selectedCategory, selectedLevel, selectedStatus, searchTerm, matrixMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch Mitigations, AI, Monitoring when respective tabs are active
  useEffect(() => {
    if (activeTab === "mitigation") {
      api.get(`/projects/risks/mitigation-actions${selectedProject !== "ALL" ? `?projectId=${selectedProject}` : ""}`)
        .then((res) => {
          const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
          setMitigationActions(Array.isArray(list) ? list : []);
        })
        .catch(() => {});
    } else if (activeTab === "ai") {
      api.get(`/projects/risks/ai/suggestions${selectedProject !== "ALL" ? `?projectId=${selectedProject}` : ""}`)
        .then((res) => {
          const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
          setAiSuggestions(Array.isArray(list) ? list : []);
        })
        .catch(() => {});
    } else if (activeTab === "monitoring") {
      api.get(`/projects/risks/monitoring/events${selectedProject !== "ALL" ? `?projectId=${selectedProject}` : ""}`)
        .then((res) => {
          const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
          setMonitoringEvents(Array.isArray(list) ? list : []);
        })
        .catch(() => {});
    }
  }, [activeTab, selectedProject]);

  // Project selector change updates searchParams
  const handleProjectChange = (prjId) => {
    setSelectedProject(prjId);
    if (prjId && prjId !== "ALL") {
      setSearchParams({ projectId: prjId });
    } else {
      setSearchParams({});
    }
  };

  // Open New Risk Form
  const handleOpenNewRisk = async () => {
    let nextCode = "";
    const prjId = selectedProject !== "ALL" ? selectedProject : (projects[0]?.id || "");
    try {
      if (prjId) {
        const codeRes = await api.get(`/projects/risks/next-code?projectId=${prjId}`);
        nextCode = codeRes.data?.nextCode || "";
      }
    } catch (e) {
      nextCode = "RSK-" + Date.now().toString().slice(-4);
    }

    setEditingRisk(null);
    setRiskForm({
      project_id: prjId,
      risk_code: nextCode,
      risk_title: "",
      description: "",
      category_id: categories[0]?.id || "",
      risk_source: "Project Assessment",
      risk_cause: "",
      potential_consequences: "",
      affected_area: "Cost",
      inherent_likelihood: 3,
      inherent_impact: 3,
      existing_controls: "",
      residual_likelihood: 2,
      residual_impact: 2,
      treatment_strategy: "REDUCE",
      mitigation_plan: "",
      contingency_plan: "",
      target_mitigation_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      risk_owner: "",
      notes: "",
    });
    setRiskModalOpen(true);
  };

  // Open Edit Risk Form
  const handleOpenEditRisk = (r) => {
    setEditingRisk(r);
    setRiskForm({
      project_id: r.project_id,
      risk_code: r.risk_code,
      risk_title: r.risk_title,
      description: r.description || "",
      category_id: r.category_id || "",
      risk_source: r.risk_source || "",
      risk_cause: r.risk_cause || "",
      potential_consequences: r.potential_consequences || "",
      affected_area: r.affected_area || "Cost",
      inherent_likelihood: r.inherent_likelihood || 3,
      inherent_impact: r.inherent_impact || 3,
      existing_controls: r.existing_controls || "",
      residual_likelihood: r.residual_likelihood || 2,
      residual_impact: r.residual_impact || 2,
      treatment_strategy: r.treatment_strategy || "REDUCE",
      mitigation_plan: r.mitigation_plan || "",
      contingency_plan: r.contingency_plan || "",
      target_mitigation_date: r.target_mitigation_date ? String(r.target_mitigation_date).slice(0, 10) : "",
      risk_owner: r.risk_owner || "",
      notes: r.notes || "",
    });
    setRiskModalOpen(true);
  };

  // Submit New or Updated Risk
  const handleSaveRisk = async (e) => {
    e.preventDefault();
    if (!riskForm.project_id) {
      toast.error("Please select a project.");
      return;
    }
    if (!riskForm.risk_title.trim()) {
      toast.error("Risk title is required.");
      return;
    }

    const payload = {
      ...riskForm,
      title: riskForm.risk_title,
      description: riskForm.description || riskForm.potential_consequences || riskForm.risk_cause || riskForm.risk_title,
      cause: riskForm.risk_cause,
      consequences: riskForm.potential_consequences,
      source: riskForm.risk_source,
    };

    try {
      if (editingRisk) {
        await api.put(`/projects/risks/${editingRisk.id}`, payload);
        toast.success("Risk updated successfully");
      } else {
        await api.post("/projects/risks", payload);
        toast.success("New risk created and registered successfully");
      }
      setRiskModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save risk record");
    }
  };

  // Reassessment Modal
  const handleOpenReassess = (r) => {
    setReassessingRisk(r);
    setReassessForm({
      residual_likelihood: r.residual_likelihood || 2,
      residual_impact: r.residual_impact || 2,
      trigger_event: "Mitigation Action Completion",
      reassessment_notes: "",
    });
    setReassessModalOpen(true);
  };

  const handleSaveReassessment = async (e) => {
    e.preventDefault();
    if (!reassessingRisk) return;
    try {
      const res = await api.post(`/projects/risks/${reassessingRisk.id}/reassess`, reassessForm);
      toast.success(res.data?.message || "Risk reassessed successfully");
      setReassessModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to record reassessment");
    }
  };

  // Close Risk Modal
  const handleOpenCloseModal = (r) => {
    setClosingRisk(r);
    setCloseForm({ closure_justification: "" });
    setCloseModalOpen(true);
  };

  const handleConfirmClose = async (e) => {
    e.preventDefault();
    if (!closeForm.closure_justification.trim()) {
      toast.error("Closure justification is mandatory.");
      return;
    }
    try {
      await api.post(`/projects/risks/${closingRisk.id}/close`, closeForm);
      toast.success("Risk closed successfully");
      setCloseModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to close risk");
    }
  };

  // Materialise to Issue Modal
  const handleOpenMaterialise = (r) => {
    setMaterialisingRisk(r);
    setMaterialiseForm({
      materialisation_date: new Date().toISOString().slice(0, 10),
      actual_impact_description: `Materialised from Risk ${r.risk_code}: ${r.risk_title}. ${r.potential_consequences || ""}`,
      initial_containment_action: r.contingency_plan || "",
    });
    setMaterialiseModalOpen(true);
  };

  const handleConfirmMaterialise = async (e) => {
    e.preventDefault();
    if (!materialiseForm.actual_impact_description.trim()) {
      toast.error("Actual impact description is required.");
      return;
    }
    try {
      const res = await api.post(`/projects/risks/${materialisingRisk.id}/materialise`, materialiseForm);
      toast.success(`Risk converted to Issue ${res.data?.issueReference || ""} successfully`);
      setMaterialiseModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to convert risk to issue");
    }
  };

  // Delete Risk
  const handleDeleteRisk = async (r) => {
    if (!window.confirm(`Are you sure you want to delete risk ${r.risk_code}? This will remove all associated actions and history.`)) {
      return;
    }
    try {
      await api.delete(`/projects/risks/${r.id}`);
      toast.success("Risk deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to delete risk");
    }
  };

  // Mitigation Actions Modal
  const handleOpenAddAction = (riskObj = null) => {
    const target = riskObj || risks[0];
    setActionTargetRisk(target);
    setEditingAction(null);
    setActionForm({
      risk_id: target ? target.id : "",
      action_title: "",
      description: "",
      responsible_person: target?.risk_owner || "",
      start_date: new Date().toISOString().slice(0, 10),
      due_date: target?.target_mitigation_date ? String(target.target_mitigation_date).slice(0, 10) : "",
      completion_date: "",
      progress_percent: 0,
      status: "NOT_STARTED",
      estimated_cost: "",
      actual_cost: "",
      remarks: "",
    });
    setActionModalOpen(true);
  };

  const handleOpenEditAction = (action) => {
    setEditingAction(action);
    setActionTargetRisk(risks.find((r) => r.id === action.risk_id) || null);
    setActionForm({
      risk_id: action.risk_id,
      action_title: action.action_title || "",
      description: action.description || "",
      responsible_person: action.responsible_person || "",
      start_date: action.start_date ? String(action.start_date).slice(0, 10) : "",
      due_date: action.due_date ? String(action.due_date).slice(0, 10) : "",
      completion_date: action.completion_date ? String(action.completion_date).slice(0, 10) : "",
      progress_percent: action.progress_percent || 0,
      status: action.status || "NOT_STARTED",
      estimated_cost: action.estimated_cost || "",
      actual_cost: action.actual_cost || "",
      remarks: action.remarks || "",
    });
    setActionModalOpen(true);
  };

  const handleSaveAction = async (e) => {
    e.preventDefault();
    if (!actionForm.risk_id) {
      toast.error("Please select a target risk.");
      return;
    }
    if (!actionForm.action_title.trim()) {
      toast.error("Action title is required.");
      return;
    }
    try {
      if (editingAction) {
        await api.put(`/projects/risks/mitigation-actions/${editingAction.id}`, actionForm);
        toast.success("Mitigation action updated");
      } else {
        await api.post("/projects/risks/mitigation-actions", actionForm);
        toast.success("Mitigation action added");
      }
      setActionModalOpen(false);
      // refresh mitigations
      const res = await api.get(`/projects/risks/mitigation-actions${selectedProject !== "ALL" ? `?projectId=${selectedProject}` : ""}`);
      setMitigationActions(res.data?.data || []);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to save mitigation action");
    }
  };

  const handleDeleteAction = async (actionId) => {
    if (!window.confirm("Are you sure you want to delete this mitigation action?")) return;
    try {
      await api.delete(`/projects/risks/mitigation-actions/${actionId}`);
      toast.success("Action removed");
      const res = await api.get(`/projects/risks/mitigation-actions${selectedProject !== "ALL" ? `?projectId=${selectedProject}` : ""}`);
      setMitigationActions(res.data?.data || []);
      fetchData();
    } catch (err) {
      toast.error("Failed to delete action");
    }
  };

  // Run AI Risk Analysis
  const handleRunAiAnalysis = async () => {
    if (selectedProject === "ALL") {
      toast.info("Select a specific project from the dropdown to run targeted AI risk analysis.");
      return;
    }
    setRunningAi(true);
    try {
      const res = await api.post("/projects/risks/ai/generate", { projectId: selectedProject });
      toast.success(res.data?.message || "AI Risk Analysis complete");
      setActiveTab("ai");
      const sugRes = await api.get(`/projects/risks/ai/suggestions?projectId=${selectedProject}`);
      setAiSuggestions(sugRes.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.error || "AI risk analysis failed");
    } finally {
      setRunningAi(false);
    }
  };

  // Accept AI Suggestion
  const handleAcceptAiSuggestion = async (sugId) => {
    try {
      const res = await api.post(`/projects/risks/ai/suggestions/${sugId}/accept`);
      toast.success(res.data?.message || "Risk created from AI recommendation!");
      // reload AI suggestions and core data
      const sugRes = await api.get(`/projects/risks/ai/suggestions${selectedProject !== "ALL" ? `?projectId=${selectedProject}` : ""}`);
      setAiSuggestions(sugRes.data?.data || []);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to accept AI suggestion");
    }
  };

  // Dismiss AI Suggestion
  const handleDismissAiSuggestion = async (sugId) => {
    try {
      await api.post(`/projects/risks/ai/suggestions/${sugId}/dismiss`);
      toast.info("Suggestion dismissed");
      const sugRes = await api.get(`/projects/risks/ai/suggestions${selectedProject !== "ALL" ? `?projectId=${selectedProject}` : ""}`);
      setAiSuggestions(sugRes.data?.data || []);
    } catch (err) {
      toast.error("Failed to dismiss suggestion");
    }
  };

  // Scan Project Events (Monitoring)
  const handleRunMonitoringScan = async () => {
    setScanningEvents(true);
    try {
      const prjId = selectedProject !== "ALL" ? selectedProject : null;
      const res = await api.post("/projects/risks/monitoring/scan", { projectId: prjId });
      toast.success(`Event scan complete: ${res.data?.eventsLogged || 0} events analyzed`);
      setActiveTab("monitoring");
      const evRes = await api.get(`/projects/risks/monitoring/events${prjId ? `?projectId=${prjId}` : ""}`);
      setMonitoringEvents(evRes.data?.data || []);
      fetchData();
    } catch (err) {
      toast.error("Monitoring scan failed");
    } finally {
      setScanningEvents(false);
    }
  };

  // Acknowledge Monitoring Event
  const handleAcknowledgeEvent = async (evId) => {
    try {
      await api.post(`/projects/risks/monitoring/events/${evId}/acknowledge`);
      toast.success("Event acknowledged");
      const prjId = selectedProject !== "ALL" ? selectedProject : null;
      const evRes = await api.get(`/projects/risks/monitoring/events${prjId ? `?projectId=${prjId}` : ""}`);
      setMonitoringEvents(evRes.data?.data || []);
    } catch (err) {
      toast.error("Failed to acknowledge event");
    }
  };

  // Heatmap cell click
  const handleCellClick = (likelihood, impact, cellRisks) => {
    setSelectedCellRisks({ likelihood, impact, risks: cellRisks });
    setMatrixCellModalOpen(true);
  };

  // Export to Excel
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Risk Register");

    sheet.addRow([
      "Risk Code",
      "Project Code",
      "Project Name",
      "Risk Title",
      "Category",
      "Inherent Likelihood",
      "Inherent Impact",
      "Inherent Score",
      "Inherent Level",
      "Residual Likelihood",
      "Residual Impact",
      "Residual Score",
      "Residual Level",
      "Risk Reduction (%)",
      "Mitigation Strategy",
      "Mitigation Plan",
      "Risk Owner",
      "Target Date",
      "Status",
    ]);

    risks.forEach((r) => {
      sheet.addRow([
        r.risk_code,
        r.project_code || "",
        r.project_name || "",
        r.risk_title,
        r.category_name || "General",
        r.inherent_likelihood,
        r.inherent_impact,
        r.inherent_score,
        r.inherent_classification,
        r.residual_likelihood,
        r.residual_impact,
        r.residual_score,
        r.residual_classification,
        r.risk_reduction_percent != null ? `${Number(r.risk_reduction_percent).toFixed(1)}%` : "0%",
        r.treatment_strategy,
        r.mitigation_plan || "",
        r.risk_owner || "",
        r.target_mitigation_date ? String(r.target_mitigation_date).slice(0, 10) : "",
        r.status,
      ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risk-register-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Risk register exported to Excel");
  };

  // Export to PDF
  const exportPdf = () => {
    const doc = new jsPDF("landscape");
    doc.setFontSize(14);
    doc.text("OmniSuite ERP — Risk Management & Assessment Register", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Filter: ${selectedProject === "ALL" ? "All Projects" : selectedProject}`, 14, 22);

    autoTable(doc, {
      startY: 26,
      head: [
        [
          "Code",
          "Project",
          "Risk Title",
          "Category",
          "Inherent (L×I=S)",
          "Residual (L×I=S)",
          "Reduct.",
          "Strategy",
          "Owner",
          "Target Date",
          "Status",
        ],
      ],
      body: risks.map((r) => [
        r.risk_code,
        r.project_name || "—",
        r.risk_title,
        r.category_name || "General",
        `${r.inherent_likelihood} × ${r.inherent_impact} = ${r.inherent_score} (${r.inherent_classification})`,
        `${r.residual_likelihood} × ${r.residual_impact} = ${r.residual_score} (${r.residual_classification})`,
        `${Number(r.risk_reduction_percent || 0).toFixed(0)}%`,
        r.treatment_strategy,
        r.risk_owner || "—",
        r.target_mitigation_date ? String(r.target_mitigation_date).slice(0, 10) : "—",
        r.status,
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    doc.save(`risk-register-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Risk register exported to PDF");
  };

  // Real-time calculation helpers for form preview
  const currentInherentScore = Number(riskForm.inherent_likelihood || 1) * Number(riskForm.inherent_impact || 1);
  const currentInherentCfg = getClassificationConfig(currentInherentScore);
  const currentResidualScore = Number(riskForm.residual_likelihood || 1) * Number(riskForm.residual_impact || 1);
  const currentResidualCfg = getClassificationConfig(currentResidualScore);
  const formReductionPct = currentInherentScore > 0 ? Math.round(((currentInherentScore - currentResidualScore) / currentInherentScore) * 100) : 0;

  return (
    <div className="space-y-6 pb-16">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. PAGE HEADER                                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5 shadow-sm">
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldAlert size={24} className="text-rose-600 dark:text-rose-500" /> Risk Management & Assessment
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Identify, score, mitigate, and monitor project risks.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunMonitoringScan}
            disabled={scanningEvents}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            title="Scan project milestones, tasks and budget for emerging risks"
          >
            <Activity size={14} className={`text-indigo-600 ${scanningEvents ? "animate-spin" : ""}`} />
            {scanningEvents ? "Scanning..." : "Scan"}
          </button>
          <button
            onClick={handleRunAiAnalysis}
            disabled={runningAi}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs border-indigo-200 text-indigo-700 bg-indigo-50/60 dark:bg-indigo-950/40 dark:text-indigo-300"
            title="Analyze project with AI"
          >
            <Sparkles size={14} className={`text-indigo-600 ${runningAi ? "animate-spin" : ""}`} />
            {runningAi ? "Analyzing..." : "AI Analysis"}
          </button>
          <button
            onClick={exportExcel}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            title="Export to Excel"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            onClick={exportPdf}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            title="Export to PDF"
          >
            <Download size={14} /> PDF
          </button>
          <button
            onClick={handleOpenNewRisk}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Plus size={15} /> New Risk
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. DYNAMIC KPI SUMMARY CARDS (6 Canonical KPI Cards)          */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[
          {
            label: "Total Identified",
            val: stats.total_risks || 0,
            icon: ShieldAlert,
            badgeColor: "bg-slate-900 dark:bg-slate-700 text-white",
            sub: `${stats.open_risks || 0} active`,
          },
          {
            label: "Critical Risks",
            val: stats.critical_risks || 0,
            icon: Flame,
            badgeColor: "bg-rose-600 text-white",
            sub: "Score 17–25",
          },
          {
            label: "High Risks",
            val: stats.high_risks || 0,
            icon: AlertTriangle,
            badgeColor: "bg-orange-500 text-white",
            sub: "Score 10–16",
          },
          {
            label: "Under Mitigation",
            val: stats.under_mitigation || 0,
            icon: ShieldCheck,
            badgeColor: "bg-indigo-600 text-white",
            sub: `${stats.effective_mitigations || 0} effective`,
          },
          {
            label: "Materialised",
            val: stats.materialised || 0,
            icon: AlertOctagon,
            badgeColor: "bg-purple-600 text-white",
            sub: "Issues",
          },
          {
            label: "Overdue Actions",
            val: stats.overdue_actions || 0,
            icon: Clock,
            badgeColor: "bg-rose-500 text-white",
            sub: "Attention",
          },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-slate-300 transition-colors"
            >
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {card.label}
                </p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {card.val}
                </h3>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">{card.sub}</span>
              </div>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${card.badgeColor}`}>
                <Icon size={17} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. GLOBAL FILTER & TAB BAR                                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "overview", label: "Overview", icon: Activity },
              { id: "register", label: "Risk Register", icon: ShieldAlert, badge: risks.length },
              { id: "matrix", label: "5×5 Matrix", icon: Target },
              { id: "mitigation", label: "Mitigation", icon: ListTodo, badge: stats.overdue_actions > 0 ? `${stats.overdue_actions} overdue` : null, badgeColor: "bg-rose-500 text-white" },
              { id: "monitoring", label: "Monitoring", icon: History },
              { id: "ai", label: "AI Suggestions", icon: Sparkles, badge: aiSuggestions.filter((s) => s.status === "PENDING").length || null, badgeColor: "bg-indigo-600 text-white" },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                  {tab.badge && (
                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${tab.badgeColor || "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200"}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-secondary btn-sm inline-flex items-center gap-1 text-xs"
            title="Refresh Data"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Filters Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Project Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="form-select w-full text-xs py-1.5 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name} ({p.project_code || p.id})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Risk Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="form-select w-full text-xs py-1.5 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.category_name}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Level Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Risk Severity
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="form-select w-full text-xs py-1.5 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="ALL">All Levels</option>
              <option value="Critical">Critical (17–25)</option>
              <option value="High">High (10–16)</option>
              <option value="Moderate">Moderate (5–9)</option>
              <option value="Low">Low (1–4)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-select w-full text-xs py-1.5 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
            >
              {RISK_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Search
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Title, code, owner..."
                className="form-input w-full text-xs pl-8 py-1.5 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. TAB CONTENTS                                               */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top Row: Severity Breakdown & Mitigation Effectiveness */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk Distribution Breakdown */}
            <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between mb-4">
                <span>Risk Distribution</span>
                <span className="text-[11px] font-normal text-slate-400">Inherent</span>
              </h3>
              <div className="space-y-3.5">
                {[
                  { label: "Critical (17–25)", count: stats.critical_risks || 0, color: "bg-rose-500", total: stats.total_risks },
                  { label: "High (10–16)", count: stats.high_risks || 0, color: "bg-orange-500", total: stats.total_risks },
                  { label: "Moderate (5–9)", count: stats.moderate_risks || 0, color: "bg-amber-500", total: stats.total_risks },
                  { label: "Low (1–4)", count: stats.low_risks || 0, color: "bg-emerald-500", total: stats.total_risks },
                ].map((item, idx) => {
                  const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">{item.count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mitigation Effectiveness Card */}
            <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between mb-4">
                <span>Mitigation Effect</span>
                <span className="text-[11px] font-normal text-slate-400">Inherent vs Residual</span>
              </h3>
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 mb-2">
                  <TrendingDown size={26} />
                </div>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {stats.avg_reduction_percent ? Number(stats.avg_reduction_percent).toFixed(1) : 0}%
                </h4>
                <p className="text-xs text-slate-500 text-center mt-0.5">Exposure Reduction</p>
                <div className="grid grid-cols-2 gap-3 w-full mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-center">
                  <div>
                    <span className="text-lg font-bold text-emerald-600">{stats.effective_mitigations || 0}</span>
                    <p className="text-[11px] text-slate-500">Effective Actions</p>
                  </div>
                  <div>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{stats.under_mitigation || 0}</span>
                    <p className="text-[11px] text-slate-500">Under Treatment</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Urgent Alerts & Action Items */}
            <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between mb-4">
                <span>Urgent Watchlist</span>
                <span className="text-xs font-normal text-rose-500 font-semibold">{stats.overdue_actions || 0} Overdue</span>
              </h3>
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                {risks.filter((r) => r.inherent_classification === "Critical" || r.residual_classification === "Critical").length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1" />
                    No critical risks identified.
                  </div>
                ) : (
                  risks
                    .filter((r) => r.inherent_classification === "Critical" || r.residual_classification === "Critical")
                    .slice(0, 4)
                    .map((cr) => (
                      <div
                        key={cr.id}
                        onClick={() => handleOpenEditRisk(cr)}
                        className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 cursor-pointer flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400">{cr.risk_code}</span>
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{cr.risk_title}</span>
                          </div>
                          <span className="text-[11px] text-slate-500">Owner: {cr.risk_owner || "Unassigned"}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white shrink-0">
                          Score: {cr.residual_score || cr.inherent_score}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Overview Table: Top 10 Priority Risks */}
          <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Target size={16} className="text-indigo-600" /> Priority Risks
              </h3>
              <button
                onClick={() => setActiveTab("register")}
                className="text-xs font-semibold text-brand-900 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                Full Register <ChevronRight size={14} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                    <th className="py-2.5 px-3">Risk Code</th>
                    <th className="py-2.5 px-3">Project</th>
                    <th className="py-2.5 px-3">Title & Area</th>
                    <th className="py-2.5 px-3 text-center">Inherent Score</th>
                    <th className="py-2.5 px-3 text-center">Residual Score</th>
                    <th className="py-2.5 px-3 text-center">Reduction</th>
                    <th className="py-2.5 px-3">Owner</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {risks.slice(0, 8).map((r) => {
                    const inCfg = getClassificationConfig(r.inherent_score);
                    const resCfg = getClassificationConfig(r.residual_score);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-900 dark:text-brand-400">
                          {r.risk_code}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium max-w-[140px] truncate">
                          {r.project_name || "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{r.risk_title}</div>
                          <span className="text-[10px] text-slate-400">{r.category_name} • {r.affected_area}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${inCfg.bg}`}>
                            {r.inherent_score} ({r.inherent_classification})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${resCfg.bg}`}>
                            {r.residual_score} ({r.residual_classification})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-xs font-bold text-emerald-600">
                            {r.risk_reduction_percent != null ? `${Number(r.risk_reduction_percent).toFixed(0)}%` : "0%"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {r.risk_owner || "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleOpenEditRisk(r)}
                            className="btn btn-secondary btn-xs inline-flex items-center gap-1"
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {risks.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No risks recorded yet. Click "Identify New Risk" to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RISK REGISTER */}
      {activeTab === "register" && (
        <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-600" /> Risk Register <span className="text-xs font-normal text-slate-400">({risks.length})</span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenNewRisk}
                className="btn btn-primary btn-sm inline-flex items-center gap-1.5 text-xs font-semibold"
              >
                <Plus size={14} /> New Risk
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-3">Risk Code</th>
                  <th className="py-3 px-3">Project</th>
                  <th className="py-3 px-3 min-w-[200px]">Risk Title</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Inherent (L×I)</th>
                  <th className="py-3 px-3 text-center">Residual (L×I)</th>
                  <th className="py-3 px-3 text-center">Reduction</th>
                  <th className="py-3 px-3">Strategy</th>
                  <th className="py-3 px-3">Owner</th>
                  <th className="py-3 px-3">Target Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {risks.map((r) => {
                  const inCfg = getClassificationConfig(r.inherent_score);
                  const resCfg = getClassificationConfig(r.residual_score);
                  const isClosed = r.status === "CLOSED";
                  const isMaterialised = r.status === "MATERIALISED";

                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-brand-900 dark:text-brand-400">
                        {r.risk_code}
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-medium">
                        <div>{r.project_name || "—"}</div>
                        <span className="text-[10px] text-slate-400">{r.project_code}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{r.risk_title}</div>
                        {r.potential_consequences && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            Consequences: {r.potential_consequences}
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400">Area: {r.affected_area}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {r.category_name || "General"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${inCfg.bg}`}>
                          {r.inherent_likelihood} × {r.inherent_impact} = {r.inherent_score}
                          <div className="text-[9px] uppercase tracking-wider">{r.inherent_classification}</div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${resCfg.bg}`}>
                          {r.residual_likelihood} × {r.residual_impact} = {r.residual_score}
                          <div className="text-[9px] uppercase tracking-wider">{r.residual_classification}</div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-xs font-bold ${Number(r.risk_reduction_percent) > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                          {r.risk_reduction_percent != null ? `${Number(r.risk_reduction_percent).toFixed(0)}%` : "0%"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {r.treatment_strategy}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {r.risk_owner || "—"}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {r.target_mitigation_date ? String(r.target_mitigation_date).slice(0, 10) : "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isClosed
                            ? "bg-slate-100 text-slate-600 border-slate-300"
                            : isMaterialised
                            ? "bg-purple-100 text-purple-800 border-purple-300"
                            : r.status === "MITIGATION_IN_PROGRESS"
                            ? "bg-indigo-100 text-indigo-800 border-indigo-300"
                            : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditRisk(r)}
                            className="btn btn-secondary btn-xs p-1"
                            title="Edit Risk"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenReassess(r)}
                            disabled={isClosed}
                            className="btn btn-secondary btn-xs p-1 text-indigo-600"
                            title="Reassess Residual Exposure"
                          >
                            <Activity size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenAddAction(r)}
                            disabled={isClosed}
                            className="btn btn-secondary btn-xs p-1 text-emerald-600"
                            title="Add Mitigation Action"
                          >
                            <ListTodo size={13} />
                          </button>
                          {!isClosed && !isMaterialised && (
                            <button
                              onClick={() => handleOpenMaterialise(r)}
                              className="btn btn-secondary btn-xs p-1 text-purple-600"
                              title="Materialise Risk into Issue"
                            >
                              <AlertOctagon size={13} />
                            </button>
                          )}
                          {!isClosed && (
                            <button
                              onClick={() => handleOpenCloseModal(r)}
                              className="btn btn-secondary btn-xs p-1 text-slate-600"
                              title="Close Risk"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRisk(r)}
                            className="btn btn-secondary btn-xs p-1 text-rose-600"
                            title="Delete Risk"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {risks.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      No matching project risks found. Adjust your filters or click "Identify New Risk".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 5x5 ASSESSMENT MATRIX */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            {/* Mode Switch & Legend */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Target size={16} className="text-rose-600" /> 5 × 5 Risk Matrix
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">View Mode:</span>
                <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
                  <button
                    onClick={() => setMatrixMode("INHERENT")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      matrixMode === "INHERENT"
                        ? "bg-brand-900 text-white dark:bg-brand-600 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Inherent Exposure
                  </button>
                  <button
                    onClick={() => setMatrixMode("RESIDUAL")}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      matrixMode === "RESIDUAL"
                        ? "bg-brand-900 text-white dark:bg-brand-600 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    Residual Exposure
                  </button>
                </div>
              </div>
            </div>

            {/* Matrix Heatmap Grid */}
            <div className="mt-6 flex flex-col md:flex-row gap-6 items-start">
              {/* Heatmap Area */}
              <div className="flex-1 w-full max-w-2xl mx-auto">
                {/* Vertical Label */}
                <div className="flex items-center justify-center mb-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                    Likelihood (Vertical) vs. Impact (Horizontal)
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {/* Top-left empty header cell */}
                  <div className="flex items-center justify-center p-2 text-[11px] font-bold text-slate-400">
                    L \ I
                  </div>
                  {/* Impact Columns (1 to 5) */}
                  {[1, 2, 3, 4, 5].map((imp) => (
                    <div key={imp} className="text-center p-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                      Impact {imp}
                    </div>
                  ))}

                  {/* Rows from Likelihood 5 down to 1 */}
                  {[5, 4, 3, 2, 1].map((lik) => (
                    <React.Fragment key={lik}>
                      {/* Likelihood Row Label */}
                      <div className="flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                        L-{lik}
                      </div>

                      {/* 5 Cells per row */}
                      {[1, 2, 3, 4, 5].map((imp) => {
                        const cell = matrixData.find((c) => c.likelihood === lik && c.impact === imp) || {
                          count: 0,
                          score: lik * imp,
                          classification: getClassificationConfig(lik * imp).label,
                          risks: [],
                        };
                        const cellColor = getHeatmapCellColor(lik, imp);

                        return (
                          <div
                            key={`${lik}-${imp}`}
                            onClick={() => handleCellClick(lik, imp, cell.risks)}
                            className={`h-20 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-sm p-1.5 ${cellColor}`}
                            title={`Likelihood ${lik} × Impact ${imp} = Score ${lik * imp} (${cell.classification}) — Click to view ${cell.count} risks`}
                          >
                            <span className="text-2xl font-black">{cell.count}</span>
                            <span className="text-[10px] font-medium opacity-90">
                              Score {lik * imp}
                            </span>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Legend & Scoring Thresholds */}
              <div className="w-full md:w-64 space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Classification Legend
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-300 text-rose-900 dark:text-rose-200 font-semibold">
                    <span>Critical Risk</span>
                    <span>17 – 25</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-orange-100 dark:bg-orange-950/60 border border-orange-300 text-orange-900 dark:text-orange-200 font-semibold">
                    <span>High Risk</span>
                    <span>10 – 16</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-amber-100 dark:bg-amber-950/60 border border-amber-300 text-amber-900 dark:text-amber-200 font-semibold">
                    <span>Moderate Risk</span>
                    <span>5 – 9</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-900 dark:text-emerald-200 font-semibold">
                    <span>Low Risk</span>
                    <span>1 – 4</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MITIGATION & TREATMENT */}
      {activeTab === "mitigation" && (
        <div className="space-y-6">
          <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ListTodo size={16} className="text-emerald-600" /> Mitigation Actions <span className="text-xs font-normal text-slate-400">({mitigationActions.length})</span>
                </h3>
              </div>
              <button
                onClick={() => handleOpenAddAction()}
                className="btn btn-primary btn-sm inline-flex items-center gap-1.5 text-xs font-semibold"
              >
                <Plus size={14} /> New Action
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3">Action Ref</th>
                    <th className="py-3 px-3">Target Risk</th>
                    <th className="py-3 px-3 min-w-[200px]">Description</th>
                    <th className="py-3 px-3">Responsible</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3 text-center">Progress</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {mitigationActions.map((a) => {
                    const isOverdue = a.status !== "COMPLETED" && a.due_date && new Date(a.due_date) < new Date();
                    return (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {a.action_code || `ACT-${a.id}`}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-brand-900 dark:text-brand-400 font-bold">{a.risk_code}</span>
                          <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{a.risk_title}</p>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{a.action_title}</div>
                          {a.description && <p className="text-[11px] text-slate-500 line-clamp-1">{a.description}</p>}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                          {a.responsible_person || "—"}
                        </td>
                        <td className="py-3 px-3">
                          <span className={isOverdue ? "text-rose-600 font-bold" : "text-slate-600"}>
                            {a.due_date ? String(a.due_date).slice(0, 10) : "—"}
                          </span>
                          {isOverdue && <span className="block text-[9px] text-rose-500 font-bold uppercase">Overdue</span>}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="w-24 mx-auto">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                              <span>{a.progress_percent || 0}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${a.progress_percent >= 100 ? "bg-emerald-500" : "bg-brand-900 dark:bg-brand-500"}`}
                                style={{ width: `${a.progress_percent || 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : a.status === "IN_PROGRESS"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditAction(a)}
                              className="btn btn-secondary btn-xs p-1"
                              title="Edit Action"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteAction(a.id)}
                              className="btn btn-secondary btn-xs p-1 text-rose-600"
                              title="Delete Action"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {mitigationActions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        No mitigation actions recorded yet. Click "Add Action Item" to establish risk controls.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MONITORING & HISTORY */}
      {activeTab === "monitoring" && (
        <div className="space-y-6">
          <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Activity size={16} className="text-indigo-600" /> Monitoring Feed
                </h3>
              </div>
              <button
                onClick={handleRunMonitoringScan}
                disabled={scanningEvents}
                className="btn btn-primary btn-sm inline-flex items-center gap-1.5 text-xs font-semibold"
              >
                <RefreshCw size={13} className={scanningEvents ? "animate-spin" : ""} /> Scan
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Project</th>
                    <th className="py-3 px-3">Event Type</th>
                    <th className="py-3 px-3 min-w-[240px]">Trigger Details</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {monitoringEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 text-slate-500 font-mono">
                        {ev.created_at ? new Date(ev.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {ev.project_name || "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                          {ev.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        {ev.event_description}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.severity === "CRITICAL"
                            ? "bg-rose-100 text-rose-800"
                            : ev.severity === "HIGH"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {ev.severity}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] font-medium text-slate-500">
                          {ev.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {ev.status !== "ACKNOWLEDGED" && (
                          <button
                            onClick={() => handleAcknowledgeEvent(ev.id)}
                            className="btn btn-secondary btn-xs text-xs font-semibold"
                          >
                            Acknowledge
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {monitoringEvents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No monitoring alerts logged. Click "Run Scan Now" to evaluate live schedule and budget telemetry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: AI RISK DETECTION */}
      {activeTab === "ai" && (
        <div className="space-y-6">
          <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600" /> AI Suggestions
                </h3>
              </div>
              <button
                onClick={handleRunAiAnalysis}
                disabled={runningAi}
                className="btn btn-primary inline-flex items-center gap-1.5 text-xs font-semibold"
              >
                <Sparkles size={14} className={runningAi ? "animate-spin" : ""} />
                {runningAi ? "Analyzing..." : "Analyze with AI"}
              </button>
            </div>

            {/* AI Suggestions Cards Grid */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiSuggestions.map((sug) => {
                const isPending = sug.status === "PENDING";
                const isAccepted = sug.status === "ACCEPTED";
                const sugScore = (sug.suggested_likelihood || 3) * (sug.suggested_impact || 3);
                const cfg = getClassificationConfig(sugScore);

                return (
                  <div
                    key={sug.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      isAccepted
                        ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 opacity-60"
                        : "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-900/60 shadow-sm"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                          {sug.category_name || "Identified Pattern"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cfg.bg}`}>
                          Suggested Score: {sugScore} ({cfg.label})
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {sug.suggested_title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {sug.suggested_cause}
                      </p>
                      {sug.suggested_mitigation && (
                        <div className="mt-2.5 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[11px] text-slate-700 dark:text-slate-300">
                          <strong>Recommended Treatment:</strong> {sug.suggested_mitigation}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-400">
                        Strategy: {sug.suggested_strategy || "REDUCE"}
                      </span>
                      {isPending ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDismissAiSuggestion(sug.id)}
                            className="btn btn-secondary btn-xs text-slate-500"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleAcceptAiSuggestion(sug.id)}
                            className="btn btn-primary btn-xs inline-flex items-center gap-1 font-semibold"
                          >
                            <Check size={12} /> Accept & Register
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-slate-500">{sug.status}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {aiSuggestions.length === 0 && (
                <div className="col-span-2 py-12 text-center text-slate-400">
                  <Sparkles size={28} className="mx-auto text-indigo-400 mb-2 opacity-60" />
                  No AI risk suggestions generated yet. Select a project and click "Run AI Risk Analysis".
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. MODAL: IDENTIFY / EDIT RISK                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {riskModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-3xl my-8 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldAlert size={18} className="text-rose-600" />
                  {editingRisk ? `Edit Risk: ${editingRisk.risk_code}` : "New Project Risk"}
                </h3>
              </div>
              <button
                onClick={() => setRiskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRisk} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Row 1: Project & Risk ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Project *
                  </label>
                  <select
                    value={riskForm.project_id}
                    onChange={(e) => setRiskForm({ ...riskForm, project_id: e.target.value })}
                    required
                    className="form-select w-full text-xs rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">Select a Project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name} ({p.project_code || p.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Risk Code
                  </label>
                  <input
                    type="text"
                    value={riskForm.risk_code}
                    onChange={(e) => setRiskForm({ ...riskForm, risk_code: e.target.value })}
                    className="form-input w-full text-xs rounded-lg font-mono font-bold"
                    placeholder="Auto-generated"
                  />
                </div>
              </div>

              {/* Row 2: Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Risk Title *
                  </label>
                  <input
                    type="text"
                    value={riskForm.risk_title}
                    onChange={(e) => setRiskForm({ ...riskForm, risk_title: e.target.value })}
                    required
                    placeholder="e.g. Critical path delay due to long-lead structural steel supply"
                    className="form-input w-full text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Risk Category
                  </label>
                  <select
                    value={riskForm.category_id}
                    onChange={(e) => setRiskForm({ ...riskForm, category_id: e.target.value })}
                    className="form-select w-full text-xs rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Affected Area, Cause & Consequences */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Affected Area
                  </label>
                  <select
                    value={riskForm.affected_area}
                    onChange={(e) => setRiskForm({ ...riskForm, affected_area: e.target.value })}
                    className="form-select w-full text-xs rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {DEFAULT_AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Risk Cause / Source
                  </label>
                  <input
                    type="text"
                    value={riskForm.risk_cause}
                    onChange={(e) => setRiskForm({ ...riskForm, risk_cause: e.target.value })}
                    placeholder="e.g. Overseas shipping port backlog & import customs clearance"
                    className="form-input w-full text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Risk Description
                  </label>
                  <textarea
                    rows={2}
                    value={riskForm.description}
                    onChange={(e) => setRiskForm({ ...riskForm, description: e.target.value })}
                    placeholder="Brief description of the risk context and vulnerability..."
                    className="form-textarea w-full text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Potential Consequences
                  </label>
                  <textarea
                    rows={2}
                    value={riskForm.potential_consequences}
                    onChange={(e) => setRiskForm({ ...riskForm, potential_consequences: e.target.value })}
                    placeholder="Impact on milestone dates, LDs, or budget overrun..."
                    className="form-textarea w-full text-xs rounded-lg"
                  />
                </div>
              </div>

              {/* Section: Inherent & Residual Scoring */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                {/* Inherent Assessment */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Inherent Assessment (Pre-mitigation)
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${currentInherentCfg.bg}`}>
                      Score: {currentInherentScore} ({currentInherentCfg.label})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Likelihood (1–5)
                      </label>
                      <select
                        value={riskForm.inherent_likelihood}
                        onChange={(e) => setRiskForm({ ...riskForm, inherent_likelihood: Number(e.target.value) })}
                        className="form-select w-full text-xs rounded-lg"
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>
                            {v} - {v === 5 ? "Almost Certain" : v === 4 ? "Likely" : v === 3 ? "Possible" : v === 2 ? "Unlikely" : "Rare"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Impact (1–5)
                      </label>
                      <select
                        value={riskForm.inherent_impact}
                        onChange={(e) => setRiskForm({ ...riskForm, inherent_impact: Number(e.target.value) })}
                        className="form-select w-full text-xs rounded-lg"
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>
                            {v} - {v === 5 ? "Catastrophic" : v === 4 ? "Major" : v === 3 ? "Moderate" : v === 2 ? "Minor" : "Insignificant"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Residual Assessment */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Target Residual Exposure
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${currentResidualCfg.bg}`}>
                      Score: {currentResidualScore} ({currentResidualCfg.label})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Residual Likelihood
                      </label>
                      <select
                        value={riskForm.residual_likelihood}
                        onChange={(e) => setRiskForm({ ...riskForm, residual_likelihood: Number(e.target.value) })}
                        className="form-select w-full text-xs rounded-lg"
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>
                            {v} - {v === 5 ? "Almost Certain" : v === 4 ? "Likely" : v === 3 ? "Possible" : v === 2 ? "Unlikely" : "Rare"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Residual Impact
                      </label>
                      <select
                        value={riskForm.residual_impact}
                        onChange={(e) => setRiskForm({ ...riskForm, residual_impact: Number(e.target.value) })}
                        className="form-select w-full text-xs rounded-lg"
                      >
                        {[1, 2, 3, 4, 5].map((v) => (
                          <option key={v} value={v}>
                            {v} - {v === 5 ? "Catastrophic" : v === 4 ? "Major" : v === 3 ? "Moderate" : v === 2 ? "Minor" : "Insignificant"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Treatment Strategy & Mitigation Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Treatment Strategy
                  </label>
                  <select
                    value={riskForm.treatment_strategy}
                    onChange={(e) => setRiskForm({ ...riskForm, treatment_strategy: e.target.value })}
                    className="form-select w-full text-xs rounded-lg"
                  >
                    {STRATEGIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Risk Owner
                  </label>
                  <input
                    type="text"
                    value={riskForm.risk_owner}
                    onChange={(e) => setRiskForm({ ...riskForm, risk_owner: e.target.value })}
                    placeholder="e.g. Lead Project Engineer"
                    className="form-input w-full text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Mitigation Date
                  </label>
                  <input
                    type="date"
                    value={riskForm.target_mitigation_date}
                    onChange={(e) => setRiskForm({ ...riskForm, target_mitigation_date: e.target.value })}
                    className="form-input w-full text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mitigation Plan
                  </label>
                  <textarea
                    rows={2}
                    value={riskForm.mitigation_plan}
                    onChange={(e) => setRiskForm({ ...riskForm, mitigation_plan: e.target.value })}
                    placeholder="Specific preventive controls to minimize probability or impact..."
                    className="form-textarea w-full text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contingency Plan
                  </label>
                  <textarea
                    rows={2}
                    value={riskForm.contingency_plan}
                    onChange={(e) => setRiskForm({ ...riskForm, contingency_plan: e.target.value })}
                    placeholder="Fallback response action if risk triggers or materialises..."
                    className="form-textarea w-full text-xs rounded-lg"
                  />
                </div>
              </div>

              {/* Form Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRiskModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs font-semibold">
                  {editingRisk ? "Save Changes" : "Register Risk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. MODAL: REASSESS RESIDUAL RISK EXPOSURE                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      {reassessModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Activity size={18} className="text-indigo-600" /> Reassess Residual Exposure
                </h3>
                <p className="text-xs text-slate-500">
                  {reassessingRisk?.risk_code}: {reassessingRisk?.risk_title}
                </p>
              </div>
              <button onClick={() => setReassessModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveReassessment} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500">Original Inherent Score</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                    {reassessingRisk?.inherent_score} ({reassessingRisk?.inherent_classification})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500">Current Residual</span>
                  <p className="text-lg font-bold text-indigo-600">
                    {reassessingRisk?.residual_score} ({reassessingRisk?.residual_classification})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    New Residual Likelihood (1–5)
                  </label>
                  <select
                    value={reassessForm.residual_likelihood}
                    onChange={(e) => setReassessForm({ ...reassessForm, residual_likelihood: Number(e.target.value) })}
                    className="form-select w-full text-xs rounded-lg"
                  >
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>
                        {v} - {v === 5 ? "Almost Certain" : v === 4 ? "Likely" : v === 3 ? "Possible" : v === 2 ? "Unlikely" : "Rare"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    New Residual Impact (1–5)
                  </label>
                  <select
                    value={reassessForm.residual_impact}
                    onChange={(e) => setReassessForm({ ...reassessForm, residual_impact: Number(e.target.value) })}
                    className="form-select w-full text-xs rounded-lg"
                  >
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={v}>
                        {v} - {v === 5 ? "Catastrophic" : v === 4 ? "Major" : v === 3 ? "Moderate" : v === 2 ? "Minor" : "Insignificant"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Trigger / Reason for Reassessment
                </label>
                <input
                  type="text"
                  value={reassessForm.trigger_event}
                  onChange={(e) => setReassessForm({ ...reassessForm, trigger_event: e.target.value })}
                  placeholder="e.g. Mitigation action completed / Site inspection report"
                  className="form-input w-full text-xs rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reassessment Notes & Justification
                </label>
                <textarea
                  rows={3}
                  value={reassessForm.reassessment_notes}
                  onChange={(e) => setReassessForm({ ...reassessForm, reassessment_notes: e.target.value })}
                  placeholder="Document why residual likelihood or impact has changed..."
                  className="form-textarea w-full text-xs rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReassessModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs font-semibold">
                  Record Reassessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. MODAL: MITIGATION ACTION                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {actionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ListTodo size={18} className="text-emerald-600" />
                  {editingAction ? "Edit Mitigation Action" : "New Mitigation Action"}
                </h3>
                <p className="text-xs text-slate-500">
                  Target: {actionTargetRisk?.risk_code} — {actionTargetRisk?.risk_title}
                </p>
              </div>
              <button onClick={() => setActionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAction} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Action Title *
                </label>
                <input
                  type="text"
                  value={actionForm.action_title}
                  onChange={(e) => setActionForm({ ...actionForm, action_title: e.target.value })}
                  required
                  placeholder="e.g. Engage alternative domestic backup supplier"
                  className="form-input w-full text-xs rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description & Controls
                </label>
                <textarea
                  rows={2}
                  value={actionForm.description}
                  onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                  placeholder="Detailed tasks to implement..."
                  className="form-textarea w-full text-xs rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Responsible Person
                  </label>
                  <input
                    type="text"
                    value={actionForm.responsible_person}
                    onChange={(e) => setActionForm({ ...actionForm, responsible_person: e.target.value })}
                    className="form-input w-full text-xs rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={actionForm.due_date}
                    onChange={(e) => setActionForm({ ...actionForm, due_date: e.target.value })}
                    className="form-input w-full text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Progress Percentage ({actionForm.progress_percent}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={actionForm.progress_percent}
                    onChange={(e) => setActionForm({ ...actionForm, progress_percent: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={actionForm.status}
                    onChange={(e) => setActionForm({ ...actionForm, status: e.target.value })}
                    className="form-select w-full text-xs rounded-lg"
                  >
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActionModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs font-semibold">
                  Save Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 8. MODAL: MATERIALISE RISK TO PROJECT ISSUE                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      {materialiseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50 dark:bg-purple-950/40">
              <div>
                <h3 className="text-base font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                  <AlertOctagon size={18} className="text-purple-600" /> Convert Risk to Issue
                </h3>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  {materialisingRisk?.risk_code}: {materialisingRisk?.risk_title}
                </p>
              </div>
              <button onClick={() => setMaterialiseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmMaterialise} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Creates a high-priority issue and flags this risk as <strong>MATERIALISED</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Materialisation Date
                </label>
                <input
                  type="date"
                  value={materialiseForm.materialisation_date}
                  onChange={(e) => setMaterialiseForm({ ...materialiseForm, materialisation_date: e.target.value })}
                  className="form-input w-full text-xs rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Actual Incident & Impact Description *
                </label>
                <textarea
                  rows={3}
                  value={materialiseForm.actual_impact_description}
                  onChange={(e) => setMaterialiseForm({ ...materialiseForm, actual_impact_description: e.target.value })}
                  required
                  className="form-textarea w-full text-xs rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Immediate Containment / Corrective Action
                </label>
                <textarea
                  rows={2}
                  value={materialiseForm.initial_containment_action}
                  onChange={(e) => setMaterialiseForm({ ...materialiseForm, initial_containment_action: e.target.value })}
                  className="form-textarea w-full text-xs rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMaterialiseModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold">
                  Confirm Materialisation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 9. MODAL: CLOSE RISK                                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {closeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600" /> Close Project Risk
                </h3>
                <p className="text-xs text-slate-500">
                  {closingRisk?.risk_code}: {closingRisk?.risk_title}
                </p>
              </div>
              <button onClick={() => setCloseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmClose} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Confirm residual exposure is acceptable or the risk condition no longer exists.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Closure Justification *
                </label>
                <textarea
                  rows={3}
                  value={closeForm.closure_justification}
                  onChange={(e) => setCloseForm({ closure_justification: e.target.value })}
                  required
                  placeholder="Reason for closure..."
                  className="form-textarea w-full text-xs rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCloseModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs font-semibold">
                  Confirm Closure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 10. MODAL: MATRIX CELL DRILL-DOWN                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {matrixCellModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Target size={18} className="text-rose-600" />
                  Matrix Cell: L{selectedCellRisks.likelihood} × I{selectedCellRisks.impact}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedCellRisks.risks?.length || 0} risks at this coordinate
                </p>
              </div>
              <button onClick={() => setMatrixCellModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2.5">
              {(selectedCellRisks.risks || []).map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    setMatrixCellModalOpen(false);
                    handleOpenEditRisk(r);
                  }}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-brand-500 cursor-pointer flex items-center justify-between gap-3 bg-white dark:bg-slate-800/40"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand-900 dark:text-brand-400">{r.risk_code}</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{r.risk_title}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Owner: {r.risk_owner || "Unassigned"} • Status: {r.status}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 shrink-0" />
                </div>
              ))}
              {(!selectedCellRisks.risks || selectedCellRisks.risks.length === 0) && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No risks positioned in this coordinate cell.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
