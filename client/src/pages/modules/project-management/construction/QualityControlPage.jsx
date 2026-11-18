import MobileMovingCarousel from "@/components/MobileMovingCarousel";
/**
 * @file QualityControlPage.jsx
 * @description General-purpose Enterprise Project Quality Assurance & Quality Control (QA/QC).
 * Covers Quality Planning, Standards, Inspections & Testing, Defects & Non-Conformances (NCR),
 * Corrective & Preventive Actions (CAPA), and Quality Performance Analytics across all project types.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Plus,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Search,
  RefreshCw,
  Download,
  FileText,
  CheckSquare,
  Layers,
  Activity,
  Award,
  Eye,
  Trash2,
  Edit,
  RotateCcw,
  Check,
  X,
  ExternalLink,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

export default function QualityControlPage() {
  // Navigation tabs: 'overview' | 'plans' | 'inspections' | 'defects' | 'capa'
  const [activeTab, setActiveTab] = useState("overview");

  // Global filters
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(""); // Default to all projects
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  // Tab Data
  const [overviewData, setOverviewData] = useState({ kpis: {}, activities: [] });
  const [plans, setPlans] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [defects, setDefects] = useState([]);
  const [capas, setCapas] = useState([]);
  const [projectTasks, setProjectTasks] = useState([]);

  // Modals
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showDefectModal, setShowDefectModal] = useState(false);
  const [showCAPAModal, setShowCAPAModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  // Forms
  const [planForm, setPlanForm] = useState({
    project_id: "",
    plan_name: "",
    description: "",
    quality_standard: "ISO 9001:2015",
    quality_requirements: "",
    acceptance_criteria: "",
    responsible_person: "",
    work_plan_task_name: "",
    applicable_deliverable: "",
    testing_frequency: "Milestone Delivery",
    status: "ACTIVE",
  });

  const [inspectionForm, setInspectionForm] = useState({
    project_id: "",
    plan_id: "",
    inspection_title: "",
    inspection_type: "Routine Inspection",
    work_plan_task_name: "",
    deliverable_name: "",
    location: "",
    inspection_date: new Date().toISOString().split("T")[0],
    inspector_name: "",
    expected_result: "",
    actual_result: "",
    outcome: "PENDING",
    findings: "",
    comments: "",
    create_defect_now: false,
    checklist: [
      { id: 1, item: "Specification & Scope Compliance", expected: "Conforms to plan", actual: "", outcome: "PASS", remarks: "" },
      { id: 2, item: "Workmanship & Material Verification", expected: "Approved grade / standard", actual: "", outcome: "PASS", remarks: "" },
    ],
  });

  const [defectForm, setDefectForm] = useState({
    project_id: "",
    issue_type: "DEFECT",
    title: "",
    description: "",
    date_identified: new Date().toISOString().split("T")[0],
    work_plan_task_name: "",
    deliverable_name: "",
    location: "",
    severity: "MAJOR",
    priority: "MEDIUM",
    responsible_person: "",
    root_cause: "",
    proposed_resolution: "",
    target_resolution_date: "",
    inspection_id: null,
  });

  const [capaForm, setCapaForm] = useState({
    project_id: "",
    defect_id: "",
    action_type: "CORRECTIVE",
    root_cause: "",
    proposed_action: "",
    responsible_person: "",
    target_completion_date: "",
    verification_method: "Re-inspection & Technical Audit",
  });

  const [verifyForm, setVerifyForm] = useState({
    verification_result: "EFFECTIVE",
    verification_notes: "",
    reopen_action: false,
  });

  const [closeForm, setCloseForm] = useState({
    resolution_evidence: "",
    resolution_remarks: "",
  });

  // 1. Initial Load: Projects
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/projects/projects", { params: { active: "all" } });
        const prjs = res.data?.items || [];
        setProjects(prjs);
        // Do not auto-select project by default
        setSelectedProjectId("");
      } catch (e) {
        toast.error("Failed to load projects list");
      }
    })();
  }, []);

  // 2. Fetch Tasks when active project changes (for Work Plan/WBS linking)
  useEffect(() => {
    if (!selectedProjectId) {
      setProjectTasks([]);
      return;
    }
    (async () => {
      try {
        const res = await api.get("/projects/tasks", { params: { project_id: selectedProjectId, active: "all" } });
        setProjectTasks(res.data?.items || []);
      } catch (e) {
        setProjectTasks([]);
      }
    })();
  }, [selectedProjectId]);

  // 3. Fetch Tab-Specific Data
  useEffect(() => {
    fetchData();
  }, [selectedProjectId, activeTab, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedProjectId) params.project_id = selectedProjectId;
      if (statusFilter && statusFilter !== "ALL") params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      if (activeTab === "overview") {
        const res = await api.get("/projects/quality/overview", { params: { project_id: selectedProjectId } });
        setOverviewData(res.data || { kpis: {}, activities: [] });
      } else if (activeTab === "plans") {
        const res = await api.get("/projects/quality/plans", { params });
        setPlans(res.data?.items || []);
      } else if (activeTab === "inspections") {
        const res = await api.get("/projects/quality/inspections", { params });
        setInspections(res.data?.items || []);
      } else if (activeTab === "defects") {
        const res = await api.get("/projects/quality/defects", { params });
        setDefects(res.data?.items || []);
      } else if (activeTab === "capa") {
        const res = await api.get("/projects/quality/capa", { params });
        setCapas(res.data?.items || []);
      }
    } catch (e) {
      toast.error("Failed to fetch quality records");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------
  // Handlers: Quality Plans
  // -----------------------------------------------------------
  const handleOpenNewPlan = () => {
    setPlanForm({
      project_id: selectedProjectId || (projects[0]?.id ? String(projects[0].id) : ""),
      plan_name: "",
      description: "",
      quality_standard: "ISO 9001:2015",
      quality_requirements: "",
      acceptance_criteria: "",
      responsible_person: "",
      work_plan_task_name: "",
      applicable_deliverable: "",
      testing_frequency: "Milestone Delivery",
      status: "ACTIVE",
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!planForm.project_id || !planForm.plan_name) {
      toast.warn("Please select a project and provide a plan name");
      return;
    }
    try {
      await api.post("/projects/quality/plans", planForm);
      toast.success("Quality Plan defined successfully");
      setShowPlanModal(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save quality plan");
    }
  };

  // -----------------------------------------------------------
  // Handlers: Inspections & Tests
  // -----------------------------------------------------------
  const handleOpenNewInspection = () => {
    setInspectionForm({
      project_id: selectedProjectId || (projects[0]?.id ? String(projects[0].id) : ""),
      plan_id: "",
      inspection_title: "",
      inspection_type: "Routine Inspection",
      work_plan_task_name: "",
      deliverable_name: "",
      location: "",
      inspection_date: new Date().toISOString().split("T")[0],
      inspector_name: "",
      expected_result: "",
      actual_result: "",
      outcome: "PENDING",
      findings: "",
      comments: "",
      create_defect_now: false,
      checklist: [
        { id: 1, item: "Scope & Specification Compliance", expected: "Meets technical requirements", actual: "", outcome: "PASS", remarks: "" },
        { id: 2, item: "Workmanship & Material Standards", expected: "Approved grade / standard", actual: "", outcome: "PASS", remarks: "" },
      ],
    });
    setShowInspectionModal(true);
  };

  const handleAddChecklistItem = () => {
    setInspectionForm((prev) => ({
      ...prev,
      checklist: [
        ...prev.checklist,
        { id: Date.now(), item: "", expected: "", actual: "", outcome: "PASS", remarks: "" },
      ],
    }));
  };

  const handleUpdateChecklistItem = (idx, field, val) => {
    setInspectionForm((prev) => {
      const updated = [...prev.checklist];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, checklist: updated };
    });
  };

  const handleRemoveChecklistItem = (idx) => {
    setInspectionForm((prev) => {
      const updated = [...prev.checklist];
      updated.splice(idx, 1);
      return { ...prev, checklist: updated };
    });
  };

  const handleSaveInspection = async (e) => {
    e.preventDefault();
    if (!inspectionForm.project_id || !inspectionForm.inspection_title) {
      toast.warn("Please select a project and provide an inspection title");
      return;
    }
    try {
      const payload = {
        ...inspectionForm,
        checklist_items: inspectionForm.checklist,
      };
      const res = await api.post("/projects/quality/inspections", payload);
      toast.success(res.data?.message || "Inspection saved successfully");
      setShowInspectionModal(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to record inspection");
    }
  };

  // Direct contextual action: Raise Defect / NCR from an Inspection row
  const handleRaiseDefectFromInspection = (insp) => {
    setDefectForm({
      project_id: String(insp.project_id),
      issue_type: "DEFECT",
      title: `Defect: ${insp.inspection_title}`,
      description: insp.findings || insp.comments || `Defect identified during ${insp.inspection_type} (${insp.request_no})`,
      date_identified: insp.inspection_date || new Date().toISOString().split("T")[0],
      work_plan_task_name: insp.work_plan_task_name || "",
      deliverable_name: insp.deliverable_name || "",
      location: insp.location || "",
      severity: "MAJOR",
      priority: "HIGH",
      responsible_person: insp.inspector_name || "",
      root_cause: "",
      proposed_resolution: "",
      target_resolution_date: "",
      inspection_id: insp.id,
    });
    setShowDefectModal(true);
  };

  // -----------------------------------------------------------
  // Handlers: Defects & NCRs
  // -----------------------------------------------------------
  const handleOpenNewDefect = () => {
    setDefectForm({
      project_id: selectedProjectId || (projects[0]?.id ? String(projects[0].id) : ""),
      issue_type: "DEFECT",
      title: "",
      description: "",
      date_identified: new Date().toISOString().split("T")[0],
      work_plan_task_name: "",
      deliverable_name: "",
      location: "",
      severity: "MAJOR",
      priority: "MEDIUM",
      responsible_person: "",
      root_cause: "",
      proposed_resolution: "",
      target_resolution_date: "",
      inspection_id: null,
    });
    setShowDefectModal(true);
  };

  const handleSaveDefect = async (e) => {
    e.preventDefault();
    if (!defectForm.project_id || !defectForm.title) {
      toast.warn("Please select a project and provide a title");
      return;
    }
    try {
      if (defectForm.inspection_id) {
        // Direct raise endpoint
        await api.post(`/projects/quality/inspections/${defectForm.inspection_id}/raise-defect`, defectForm);
      } else {
        await api.post("/projects/quality/defects", defectForm);
      }
      toast.success("Quality issue logged successfully");
      setShowDefectModal(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to log defect");
    }
  };

  // Direct contextual action: Create CAPA from a Defect
  const handleCreateCAPAFromDefect = (defect) => {
    setCapaForm({
      project_id: String(defect.project_id),
      defect_id: String(defect.id),
      action_type: "CORRECTIVE",
      root_cause: defect.root_cause || "",
      proposed_action: defect.proposed_resolution || "",
      responsible_person: defect.responsible_person || "",
      target_completion_date: defect.target_resolution_date || "",
      verification_method: "Re-inspection & Technical Audit",
    });
    setShowCAPAModal(true);
  };

  // Close Defect with Required Resolution Evidence
  const handleOpenCloseDefect = (defect) => {
    setActiveItem(defect);
    setCloseForm({
      resolution_evidence: defect.resolution_evidence || "",
      resolution_remarks: defect.resolution_remarks || "",
    });
    setShowCloseModal(true);
  };

  const handleConfirmCloseDefect = async (e) => {
    e.preventDefault();
    if (!closeForm.resolution_evidence && !closeForm.resolution_remarks) {
      toast.warn("Resolution evidence or verification remarks are required to close an issue.");
      return;
    }
    try {
      await api.put(`/projects/quality/defects/${activeItem.id}`, {
        status: "CLOSED",
        resolution_evidence: closeForm.resolution_evidence,
        resolution_remarks: closeForm.resolution_remarks,
      });
      toast.success("Quality issue verified and closed");
      setShowCloseModal(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to close issue");
    }
  };

  // -----------------------------------------------------------
  // Handlers: Corrective & Preventive Actions (CAPA)
  // -----------------------------------------------------------
  const handleOpenNewCAPA = () => {
    setCapaForm({
      project_id: selectedProjectId || (projects[0]?.id ? String(projects[0].id) : ""),
      defect_id: "",
      action_type: "CORRECTIVE",
      root_cause: "",
      proposed_action: "",
      responsible_person: "",
      target_completion_date: "",
      verification_method: "Re-inspection & Technical Audit",
    });
    setShowCAPAModal(true);
  };

  const handleSaveCAPA = async (e) => {
    e.preventDefault();
    if (!capaForm.project_id || !capaForm.proposed_action) {
      toast.warn("Please select a project and provide the action description");
      return;
    }
    try {
      await api.post("/projects/quality/capa", capaForm);
      toast.success("CAPA action planned successfully");
      setShowCAPAModal(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to save CAPA");
    }
  };

  // Verify CAPA Resolution (Distinguishes completion from verification)
  const handleOpenVerifyCAPA = (capa) => {
    setActiveItem(capa);
    setVerifyForm({
      verification_result: "EFFECTIVE",
      verification_notes: "",
      reopen_action: false,
    });
    setShowVerifyModal(true);
  };

  const handleConfirmVerifyCAPA = async (e) => {
    e.preventDefault();
    try {
      const isReopening = verifyForm.verification_result === "INEFFECTIVE_REOPENED" || verifyForm.reopen_action;
      const status = isReopening ? "OPEN" : "VERIFIED";

      await api.put(`/projects/quality/capa/${activeItem.id}`, {
        status,
        verification_result: verifyForm.verification_result,
        verification_notes: verifyForm.verification_notes,
        reopen_action: isReopening,
      });
      toast.success(isReopening ? "CAPA reopened for further corrective action" : "CAPA verified successfully");
      setShowVerifyModal(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to verify CAPA");
    }
  };

  // -----------------------------------------------------------
  // CSV / Excel Export Handler
  // -----------------------------------------------------------
  const handleExportData = () => {
    let csvContent = "";
    let filename = `QA_QC_Report_${new Date().toISOString().split("T")[0]}.csv`;

    if (activeTab === "plans") {
      csvContent = "Plan Ref,Plan Name,Standard,Project,Testing Frequency,Responsible,Status\n" +
        plans.map(p => `"${p.plan_reference}","${p.plan_name}","${p.quality_standard}","${p.project_name}","${p.testing_frequency}","${p.responsible_person || ''}","${p.status}"`).join("\n");
    } else if (activeTab === "inspections") {
      csvContent = "Inspection Ref,Title,Type,Project,Date,Inspector,Outcome,Status,Has Defect\n" +
        inspections.map(i => `"${i.request_no}","${i.inspection_title}","${i.inspection_type}","${i.project_name}","${i.inspection_date}","${i.inspector_name || ''}","${i.outcome}","${i.status}","${i.has_defect ? 'YES' : 'NO'}"`).join("\n");
    } else if (activeTab === "defects") {
      csvContent = "Issue Ref,Type,Title,Project,Severity,Priority,Responsible,Target Date,Status\n" +
        defects.map(d => `"${d.issue_reference}","${d.issue_type}","${d.title}","${d.project_name}","${d.severity}","${d.priority}","${d.responsible_person || ''}","${d.target_resolution_date || ''}","${d.status}"`).join("\n");
    } else if (activeTab === "capa") {
      csvContent = "CAPA Ref,Action Type,Related Defect,Project,Target Date,Responsible,Verification Result,Status\n" +
        capas.map(c => `"${c.capa_reference}","${c.action_type}","${c.defect_ref || ''}","${c.project_name}","${c.target_completion_date || ''}","${c.responsible_person || ''}","${c.verification_result}","${c.status}"`).join("\n");
    } else {
      // Overview export
      const k = overviewData.kpis || {};
      csvContent = `OmniSuite Quality Assurance & Control (QA/QC) Performance Summary\n` +
        `Total Inspections,${k.totalInspections || 0}\n` +
        `Passed Inspections,${k.passedInspections || 0}\n` +
        `Failed Inspections,${k.failedInspections || 0}\n` +
        `Pass Rate,${k.passRate || 0}%\n` +
        `Open Defects,${k.openDefects || 0}\n` +
        `Open Non-Conformances,${k.openNCRs || 0}\n` +
        `Pending CAPA,${k.pendingCAPA || 0}\n` +
        `Defect Resolution Rate,${k.defectResolutionRate || 0}%\n`;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info("Quality register exported successfully");
  };

  // Helper status badges
  const renderOutcomeBadge = (outcome) => {
    switch (outcome) {
      case "PASSED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400"><CheckCircle2 size={13} /> Passed</span>;
      case "FAILED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400"><XCircle size={13} /> Failed</span>;
      case "CONDITIONAL_PASS":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400"><AlertTriangle size={13} /> Conditional</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"><Clock size={13} /> Pending</span>;
    }
  };

  const renderSeverityBadge = (sev) => {
    switch (sev) {
      case "CRITICAL":
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-600 text-white">CRITICAL</span>;
      case "MAJOR":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-400">Major</span>;
      case "MINOR":
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">Minor</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Observation</span>;
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case "CLOSED":
      case "VERIFIED":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">Closed / Verified</span>;
      case "RESOLVED":
      case "AWAITING_VERIFICATION":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-400">Awaiting Verification</span>;
      case "CORRECTIVE_ACTION_IN_PROGRESS":
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-400">In Progress</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">Open</span>;
    }
  };

  const kpis = overviewData.kpis || {};

  return (
    <div className="space-y-6">
      {/* 1. Header & Contextual Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck size={24} className="text-teal-600 dark:text-teal-400" /> Quality Assurance & Control (QA/QC)
            </h1>
            <p className="text-slate-500 text-xs mt-0.5 hidden">
              Standards compliance, inspections & testing, defect identification, non-conformance management, and CAPA.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "plans" && (
            <button onClick={handleOpenNewPlan} className="btn btn-primary inline-flex items-center gap-1.5 text-sm">
              <Plus size={16} /> New Quality Plan
            </button>
          )}
          {activeTab === "inspections" && (
            <button onClick={handleOpenNewInspection} className="btn btn-primary inline-flex items-center gap-1.5 text-sm">
              <Plus size={16} /> Schedule Inspection
            </button>
          )}
          {activeTab === "defects" && (
            <button onClick={handleOpenNewDefect} className="btn btn-primary inline-flex items-center gap-1.5 text-sm">
              <Plus size={16} /> Raise Defect / NCR
            </button>
          )}
          {activeTab === "capa" && (
            <button onClick={handleOpenNewCAPA} className="btn btn-primary inline-flex items-center gap-1.5 text-sm">
              <Plus size={16} /> Create CAPA Action
            </button>
          )}
          <button onClick={handleExportData} className="btn btn-secondary inline-flex items-center gap-1.5 text-sm" title="Export current register to CSV">
            <Download size={15} /> Export
          </button>
          
        </div>
      </div>

      {/* 2. Horizontal Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
        <div className="flex flex-nowrap items-center gap-3 overflow-x-auto">
          {/* Project Dropdown */}
          <div className="w-64 shrink-0">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full text-xs font-medium rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 py-1.5 px-2.5 focus:ring-1 focus:ring-teal-500"
            >
              <option value="">All Projects (Global Scope)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code ? `[${p.project_code}] ` : ""}{p.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-40 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs font-medium rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 py-1.5 px-2.5 focus:ring-1 focus:ring-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active / Open</option>
              <option value="PASSED">Passed / Resolved</option>
              <option value="FAILED">Failed / Defective</option>
              <option value="CLOSED">Closed / Verified</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, deliverable, responsible person, standards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Metric Stats Cards Carousel */}
      <MobileMovingCarousel data-page-carousel gridColsClass="xl:grid-cols-6 md:grid-cols-3 sm:grid-cols-2" gapClass="gap-4">
        {[
          {
            label: "Total Inspections",
            val: kpis.totalInspections || 0,
            icon: <CheckSquare size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Inspection Pass Rate",
            val: `${kpis.passRate ?? 100}%`,
            icon: <Award size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600 text-white",
          },
          {
            label: "Open Defects",
            val: kpis.openDefects || 0,
            icon: <AlertTriangle size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Open NCRs",
            val: kpis.openNCRs || 0,
            icon: <AlertOctagon size={20} className="stroke-[2.5]" />,
            color: "bg-rose-500 text-white",
          },
          {
            label: "Pending CAPA",
            val: kpis.pendingCAPA || 0,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-indigo-600 text-white",
          },
          {
            label: "Defect Resolution",
            val: `${kpis.defectResolutionRate ?? 100}%`,
            icon: <ShieldCheck size={20} className="stroke-[2.5]" />,
            color: "bg-blue-600 text-white",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="card p-6 min-h-[160px] flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {stat.val}
              </p>
            </div>
            <div className={`p-3 rounded-full ${stat.color} shadow-sm`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </MobileMovingCarousel>

      {/* 4. Tab Navigation (5 Concise Sections) */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="flex space-x-2 md:space-x-6 overflow-x-auto text-sm font-medium">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-teal-600 text-teal-600 dark:text-teal-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Activity size={16} /> 1. Quality Overview
          </button>
          <button
            onClick={() => setActiveTab("plans")}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === "plans"
                ? "border-teal-600 text-teal-600 dark:text-teal-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Award size={16} /> 2. Quality Plans & Standards
          </button>
          <button
            onClick={() => setActiveTab("inspections")}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === "inspections"
                ? "border-teal-600 text-teal-600 dark:text-teal-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <CheckSquare size={16} /> 3. Inspections & Tests
          </button>
          <button
            onClick={() => setActiveTab("defects")}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === "defects"
                ? "border-teal-600 text-teal-600 dark:text-teal-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <AlertOctagon size={16} /> 4. Defects & Non-Conformances
          </button>
          <button
            onClick={() => setActiveTab("capa")}
            className={`py-2.5 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === "capa"
                ? "border-teal-600 text-teal-600 dark:text-teal-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <RotateCcw size={16} /> 5. Corrective & Preventive Actions (CAPA)
          </button>
        </nav>
      </div>

      {/* 5. Main Content Area */}

      {/* TAB 1: QUALITY OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck size={18} className="text-teal-600" /> Project Quality Performance Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="text-xs text-slate-500 font-medium">Inspection Quality Pass Rate</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{kpis.passRate ?? 100}%</div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                    <div className="bg-teal-500 h-full rounded-full transition-all" style={{ width: `${kpis.passRate ?? 100}%` }}></div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    {kpis.passedInspections || 0} passed of {(kpis.passedInspections || 0) + (kpis.failedInspections || 0)} completed inspections
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="text-xs text-slate-500 font-medium">Defect & NCR Resolution Rate</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{kpis.defectResolutionRate ?? 100}%</div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${kpis.defectResolutionRate ?? 100}%` }}></div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    {kpis.resolvedDefects || 0} resolved of {kpis.totalDefects || 0} total quality issues
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <div>
                  <div className="text-xs text-slate-500">Outstanding Issues</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">{kpis.outstandingQualityIssues || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Critical Open Issues</div>
                  <div className="text-lg font-bold text-rose-600 mt-0.5">{kpis.criticalOpenIssues || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Overdue CAPA</div>
                  <div className="text-lg font-bold text-amber-600 mt-0.5">{kpis.overdueCAPA || 0}</div>
                </div>
              </div>
            </div>

            {/* Quick Links / Workflows */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => { setActiveTab("plans"); handleOpenNewPlan(); }}
                  className="p-3 text-left border border-slate-200 dark:border-slate-700 rounded-lg hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-slate-800 transition-all"
                >
                  <Award size={18} className="text-teal-600 mb-1" />
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Define Quality Plan</div>
                  <div className="text-[11px] text-slate-500">Set standards & criteria</div>
                </button>
                <button
                  onClick={() => { setActiveTab("inspections"); handleOpenNewInspection(); }}
                  className="p-3 text-left border border-slate-200 dark:border-slate-700 rounded-lg hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-slate-800 transition-all"
                >
                  <CheckSquare size={18} className="text-teal-600 mb-1" />
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Schedule Inspection</div>
                  <div className="text-[11px] text-slate-500">Routine, UAT, or Testing</div>
                </button>
                <button
                  onClick={() => { setActiveTab("defects"); handleOpenNewDefect(); }}
                  className="p-3 text-left border border-slate-200 dark:border-slate-700 rounded-lg hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-slate-800 transition-all"
                >
                  <AlertOctagon size={18} className="text-rose-600 mb-1" />
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Log Defect / NCR</div>
                  <div className="text-[11px] text-slate-500">Report non-conformance</div>
                </button>
                <button
                  onClick={() => { setActiveTab("capa"); handleOpenNewCAPA(); }}
                  className="p-3 text-left border border-slate-200 dark:border-slate-700 rounded-lg hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-slate-800 transition-all"
                >
                  <RotateCcw size={18} className="text-indigo-600 mb-1" />
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Plan CAPA Action</div>
                  <div className="text-[11px] text-slate-500">Root cause & resolution</div>
                </button>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
              <Activity size={16} className="text-teal-600" /> Recent Quality Activity Log
            </h3>
            {overviewData.activities && overviewData.activities.length > 0 ? (
              <div className="space-y-3">
                {overviewData.activities.map((act) => (
                  <div key={act.id} className="text-xs border-l-2 border-teal-500 pl-3 py-1 space-y-0.5">
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {act.details || `${act.action} ${act.entity_type}`}
                    </div>
                    <div className="text-slate-500 flex items-center justify-between text-[11px]">
                      <span>{act.changed_by_name || "QA Inspector"}</span>
                      <span>{new Date(act.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                No recent QA/QC activity recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: QUALITY PLANS & STANDARDS */}
      {activeTab === "plans" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Quality Plans & Standards Register</h2>
              <p className="text-xs text-slate-500">Project quality criteria, ISO / industry standards, and acceptance requirements.</p>
            </div>
            <button onClick={handleOpenNewPlan} className="btn btn-primary text-sm inline-flex items-center gap-1.5">
              <Plus size={14} /> New Plan
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Plan Reference</th>
                  <th className="py-2.5 px-3">Plan Name</th>
                  <th className="py-2.5 px-3">Applicable Standard</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Testing Frequency</th>
                  <th className="py-2.5 px-3">Responsible</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {plans.length > 0 ? (
                  plans.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-semibold text-teal-700 dark:text-teal-400">{p.plan_reference}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{p.plan_name}</div>
                        {p.work_plan_task_name && <div className="text-[11px] text-slate-500">Work Plan/WBS: {p.work_plan_task_name}</div>}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400">{p.quality_standard}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{p.project_name}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{p.testing_frequency}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{p.responsible_person || "-"}</td>
                      <td className="py-2.5 px-3">{renderStatusBadge(p.status)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      No quality plans found. Click "+ New Quality Plan" to define quality standards for your project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INSPECTIONS & TESTS */}
      {activeTab === "inspections" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Inspections & Testing Register</h2>
              <p className="text-xs text-slate-500">Routine checks, UAT, functional tests, checklists, and pass/fail evaluations.</p>
            </div>
            <button onClick={handleOpenNewInspection} className="btn btn-primary text-sm inline-flex items-center gap-1.5">
              <Plus size={14} /> Schedule Inspection
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Ref #</th>
                  <th className="py-2.5 px-3">Inspection Title</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Project / Work Plan/WBS</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Inspector</th>
                  <th className="py-2.5 px-3">Outcome</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {inspections.length > 0 ? (
                  inspections.map((insp) => (
                    <tr key={insp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-semibold text-teal-700 dark:text-teal-400">{insp.request_no}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{insp.inspection_title}</div>
                        {insp.location && <div className="text-[11px] text-slate-500">Location: {insp.location}</div>}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-600 dark:text-slate-400">{insp.inspection_type}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-900 dark:text-slate-100">{insp.project_name}</div>
                        {insp.work_plan_task_name && <div className="text-[11px] text-slate-500">{insp.work_plan_task_name}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{insp.inspection_date}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{insp.inspector_name || "-"}</td>
                      <td className="py-2.5 px-3">{renderOutcomeBadge(insp.outcome)}</td>
                      <td className="py-2.5 px-3 text-right">
                        {insp.outcome === "FAILED" && !insp.has_defect ? (
                          <button
                            onClick={() => handleRaiseDefectFromInspection(insp)}
                            className="text-xs px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 inline-flex items-center gap-1"
                            title="Raise Defect / NCR directly from this failed inspection"
                          >
                            <AlertOctagon size={13} /> Raise Defect
                          </button>
                        ) : insp.has_defect ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400">
                            Defect Linked
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No inspections found. Click "+ Schedule Inspection" to record testing or routine quality checks.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DEFECTS & NON-CONFORMANCES */}
      {activeTab === "defects" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Defects & Non-Conformances (NCR) Register</h2>
              <p className="text-xs text-slate-500">Quality non-conformances, defects, severity categorization, and root causes.</p>
            </div>
            <button onClick={handleOpenNewDefect} className="btn btn-primary text-sm inline-flex items-center gap-1.5">
              <Plus size={14} /> Raise Defect / NCR
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Issue Ref</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Title & Description</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Responsible</th>
                  <th className="py-2.5 px-3">Target Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {defects.length > 0 ? (
                  defects.map((def) => (
                    <tr key={def.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-semibold text-rose-700 dark:text-rose-400">{def.issue_reference}</td>
                      <td className="py-2.5 px-3 font-semibold">
                        {def.issue_type === "NON_CONFORMANCE" ? (
                          <span className="text-rose-700 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded text-[11px]">NCR</span>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded text-[11px]">DEFECT</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{def.title}</div>
                        {def.inspection_ref && <div className="text-[11px] text-slate-500">From Insp: {def.inspection_ref}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{def.project_name}</td>
                      <td className="py-2.5 px-3">{renderSeverityBadge(def.severity)}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{def.responsible_person || "-"}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{def.target_resolution_date || "-"}</td>
                      <td className="py-2.5 px-3">{renderStatusBadge(def.status)}</td>
                      <td className="py-2.5 px-3 text-right space-x-1.5">
                        {def.status !== "CLOSED" && (
                          <>
                            <button
                              onClick={() => handleCreateCAPAFromDefect(def)}
                              className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 inline-flex items-center gap-1"
                              title="Create Corrective & Preventive Action"
                            >
                              <RotateCcw size={13} /> CAPA
                            </button>
                            <button
                              onClick={() => handleOpenCloseDefect(def)}
                              className="text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 inline-flex items-center gap-1"
                              title="Record Resolution Evidence & Close"
                            >
                              <CheckCircle2 size={13} /> Close
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No defects or non-conformances reported.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: CORRECTIVE & PREVENTIVE ACTIONS (CAPA) */}
      {activeTab === "capa" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Corrective & Preventive Actions (CAPA) Register</h2>
              <p className="text-xs text-slate-500">Root cause elimination, preventive measures, verification of effectiveness, and closure.</p>
            </div>
            <button onClick={handleOpenNewCAPA} className="btn btn-primary text-sm inline-flex items-center gap-1.5">
              <Plus size={14} /> Create CAPA
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">CAPA Ref</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Proposed Action & Root Cause</th>
                  <th className="py-2.5 px-3">Related Issue</th>
                  <th className="py-2.5 px-3">Target Date</th>
                  <th className="py-2.5 px-3">Responsible</th>
                  <th className="py-2.5 px-3">Verification</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {capas.length > 0 ? (
                  capas.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-semibold text-indigo-700 dark:text-indigo-400">{c.capa_reference}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          c.action_type === "PREVENTIVE" ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400" : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                        }`}>
                          {c.action_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">{c.proposed_action}</div>
                        {c.root_cause && <div className="text-[11px] text-slate-500 truncate">Root Cause: {c.root_cause}</div>}
                      </td>
                      <td className="py-2.5 px-3">
                        {c.defect_ref ? (
                          <div className="text-slate-900 dark:text-slate-100 font-medium">{c.defect_ref}</div>
                        ) : (
                          <span className="text-slate-400">General QA</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{c.target_completion_date || "-"}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{c.responsible_person || "-"}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          c.verification_result === "EFFECTIVE" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" :
                          c.verification_result === "INEFFECTIVE_REOPENED" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                        }`}>
                          {c.verification_result || "PENDING"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">{renderStatusBadge(c.status)}</td>
                      <td className="py-2.5 px-3 text-right">
                        {c.status !== "VERIFIED" && c.status !== "CLOSED" && (
                          <button
                            onClick={() => handleOpenVerifyCAPA(c)}
                            className="text-xs px-2 py-1 rounded bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 inline-flex items-center gap-1"
                            title="Verify Effectiveness & Close or Reopen"
                          >
                            <ShieldCheck size={13} /> Verify
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">
                      No corrective or preventive actions recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL 1: NEW QUALITY PLAN */}
      {/* ======================================================= */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Award size={18} className="text-teal-600" /> Define Project Quality Plan & Standard
              </h3>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSavePlan} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Project *</label>
                  <select
                    value={planForm.project_id}
                    onChange={(e) => setPlanForm({ ...planForm, project_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Applicable Standard *</label>
                  <input
                    type="text"
                    value={planForm.quality_standard}
                    onChange={(e) => setPlanForm({ ...planForm, quality_standard: e.target.value })}
                    placeholder="e.g. ISO 9001:2015, IEEE 829, ASTM, Custom"
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Quality Plan Name *</label>
                <input
                  type="text"
                  value={planForm.plan_name}
                  onChange={(e) => setPlanForm({ ...planForm, plan_name: e.target.value })}
                  placeholder="e.g. Core Software Module QA or Concrete Pour Quality Plan"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Responsible QA Lead</label>
                  <input
                    type="text"
                    value={planForm.responsible_person}
                    onChange={(e) => setPlanForm({ ...planForm, responsible_person: e.target.value })}
                    placeholder="Person / Role"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Testing Frequency</label>
                  <select
                    value={planForm.testing_frequency}
                    onChange={(e) => setPlanForm({ ...planForm, testing_frequency: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  >
                    <option value="Per Batch">Per Batch</option>
                    <option value="Milestone Delivery">Milestone Delivery</option>
                    <option value="Weekly Inspection">Weekly Inspection</option>
                    <option value="Pre-Deployment / Staging">Pre-Deployment / Staging</option>
                    <option value="Final Acceptance">Final Acceptance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Work Plan/WBS Task Link</label>
                  <input
                    type="text"
                    value={planForm.work_plan_task_name}
                    onChange={(e) => setPlanForm({ ...planForm, work_plan_task_name: e.target.value })}
                    placeholder="Linked Task / Work Plan/WBS"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Quality Requirements</label>
                  <textarea
                    rows={2}
                    value={planForm.quality_requirements}
                    onChange={(e) => setPlanForm({ ...planForm, quality_requirements: e.target.value })}
                    placeholder="Specify tolerances, parameters, performance thresholds..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Acceptance Criteria</label>
                  <textarea
                    rows={2}
                    value={planForm.acceptance_criteria}
                    onChange={(e) => setPlanForm({ ...planForm, acceptance_criteria: e.target.value })}
                    placeholder="Clear condition required to sign off..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowPlanModal(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-sm">
                  Save Quality Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL 2: SCHEDULE / RECORD INSPECTION */}
      {/* ======================================================= */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckSquare size={18} className="text-teal-600" /> Schedule & Record Inspection / Testing
              </h3>
              <button onClick={() => setShowInspectionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveInspection} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Project *</label>
                  <select
                    value={inspectionForm.project_id}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, project_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Inspection Type *</label>
                  <select
                    value={inspectionForm.inspection_type}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  >
                    <option value="Routine Inspection">Routine Inspection</option>
                    <option value="Quality Inspection">Quality Inspection</option>
                    <option value="Functional Testing">Functional Testing</option>
                    <option value="Performance Testing">Performance Testing</option>
                    <option value="Compliance Inspection">Compliance Inspection</option>
                    <option value="Final Inspection">Final Inspection</option>
                    <option value="User Acceptance Testing (UAT)">User Acceptance Testing (UAT)</option>
                    <option value="Custom Inspection">Custom Inspection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Inspection Date *</label>
                  <input
                    type="date"
                    value={inspectionForm.inspection_date}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_date: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Inspection Title *</label>
                <input
                  type="text"
                  value={inspectionForm.inspection_title}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_title: e.target.value })}
                  placeholder="e.g. UAT Sign-off for Billing Module or Pre-Pour Slab Inspection"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Inspector / Lead</label>
                  <input
                    type="text"
                    value={inspectionForm.inspector_name}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, inspector_name: e.target.value })}
                    placeholder="Name of inspector"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Work Plan/WBS Task</label>
                  <input
                    type="text"
                    value={inspectionForm.work_plan_task_name}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, work_plan_task_name: e.target.value })}
                    placeholder="Related task title"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Location / Area</label>
                  <input
                    type="text"
                    value={inspectionForm.location}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, location: e.target.value })}
                    placeholder="e.g. Staging Server, Lab, Grid C"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
              </div>

              {/* Checklist Section with Auto-Outcome Calculation */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Inspection Checklist (Automated Evaluation)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="text-sm text-teal-600 font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Checklist Item
                  </button>
                </div>
                <div className="space-y-2">
                  {inspectionForm.checklist.map((item, idx) => (
                    <div key={item.id || idx} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Checklist Item"
                          value={item.item}
                          onChange={(e) => handleUpdateChecklistItem(idx, "item", e.target.value)}
                          className="w-full p-1 border rounded text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Expected Criteria"
                          value={item.expected}
                          onChange={(e) => handleUpdateChecklistItem(idx, "expected", e.target.value)}
                          className="w-full p-1 border rounded text-xs text-slate-500"
                        />
                      </div>
                      <div className="col-span-3">
                        <select
                          value={item.outcome}
                          onChange={(e) => handleUpdateChecklistItem(idx, "outcome", e.target.value)}
                          className={`w-full p-1 border rounded text-xs font-semibold ${
                            item.outcome === "PASS" ? "text-emerald-700 bg-emerald-50" :
                            item.outcome === "FAIL" ? "text-rose-700 bg-rose-50" : "text-slate-600"
                          }`}
                        >
                          <option value="PASS">PASS</option>
                          <option value="FAIL">FAIL</option>
                          <option value="NA">N/A</option>
                        </select>
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(idx)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Outcome Override</label>
                  <select
                    value={inspectionForm.outcome}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, outcome: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 font-medium"
                  >
                    <option value="PENDING">Pending (Scheduled)</option>
                    <option value="PASSED">Passed</option>
                    <option value="FAILED">Failed</option>
                    <option value="CONDITIONAL_PASS">Conditional Pass (With Reservations)</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="autoDefect"
                    checked={inspectionForm.create_defect_now}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, create_defect_now: e.target.checked })}
                    className="rounded text-teal-600"
                  />
                  <label htmlFor="autoDefect" className="text-slate-700 dark:text-slate-300 text-sm cursor-pointer font-medium">
                    Automatically raise Defect / NCR record if inspection fails
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Observations & Findings</label>
                <textarea
                  rows={2}
                  value={inspectionForm.findings}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, findings: e.target.value })}
                  placeholder="Record technical observations, deviations, or testing notes..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowInspectionModal(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-sm">
                  Save Inspection Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL 3: RAISE DEFECT / NCR */}
      {/* ======================================================= */}
      {showDefectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertOctagon size={18} className="text-rose-600" /> Log Quality Defect or Non-Conformance (NCR)
              </h3>
              <button onClick={() => setShowDefectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveDefect} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Project *</label>
                  <select
                    value={defectForm.project_id}
                    onChange={(e) => setDefectForm({ ...defectForm, project_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Issue Type *</label>
                  <select
                    value={defectForm.issue_type}
                    onChange={(e) => setDefectForm({ ...defectForm, issue_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 font-semibold"
                  >
                    <option value="DEFECT">Defect</option>
                    <option value="NON_CONFORMANCE">Non-Conformance (NCR)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Severity *</label>
                  <select
                    value={defectForm.severity}
                    onChange={(e) => setDefectForm({ ...defectForm, severity: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 font-medium"
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="MAJOR">Major</option>
                    <option value="MINOR">Minor</option>
                    <option value="OBSERVATION">Observation</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Issue Title *</label>
                <input
                  type="text"
                  value={defectForm.title}
                  onChange={(e) => setDefectForm({ ...defectForm, title: e.target.value })}
                  placeholder="Clear concise summary of the quality problem"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Responsible Member</label>
                  <input
                    type="text"
                    value={defectForm.responsible_person}
                    onChange={(e) => setDefectForm({ ...defectForm, responsible_person: e.target.value })}
                    placeholder="Assignee"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Date Identified</label>
                  <input
                    type="date"
                    value={defectForm.date_identified}
                    onChange={(e) => setDefectForm({ ...defectForm, date_identified: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Target Resolution Date</label>
                  <input
                    type="date"
                    value={defectForm.target_resolution_date}
                    onChange={(e) => setDefectForm({ ...defectForm, target_resolution_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Root Cause (Where Known)</label>
                <input
                  type="text"
                  value={defectForm.root_cause}
                  onChange={(e) => setDefectForm({ ...defectForm, root_cause: e.target.value })}
                  placeholder="Underlying reason: e.g., missing test case, equipment failure, environmental draft"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Description & Non-Conformance Details</label>
                <textarea
                  rows={3}
                  value={defectForm.description}
                  onChange={(e) => setDefectForm({ ...defectForm, description: e.target.value })}
                  placeholder="Detailed description of the defect, impact, and affected components..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowDefectModal(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-sm bg-rose-600 hover:bg-rose-700 border-rose-600">
                  Log Quality Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL 4: CREATE CAPA */}
      {/* ======================================================= */}
      {showCAPAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <RotateCcw size={18} className="text-indigo-600" /> Plan Corrective & Preventive Action (CAPA)
              </h3>
              <button onClick={() => setShowCAPAModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCAPA} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Project *</label>
                  <select
                    value={capaForm.project_id}
                    onChange={(e) => setCapaForm({ ...capaForm, project_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Action Type *</label>
                  <select
                    value={capaForm.action_type}
                    onChange={(e) => setCapaForm({ ...capaForm, action_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 font-medium"
                  >
                    <option value="CORRECTIVE">Corrective Action (Fix Issue)</option>
                    <option value="PREVENTIVE">Preventive Action (Recurrence Prevention)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Root Cause Analysis</label>
                <textarea
                  rows={2}
                  value={capaForm.root_cause}
                  onChange={(e) => setCapaForm({ ...capaForm, root_cause: e.target.value })}
                  placeholder="Why did this issue occur? 5-Why or technical breakdown..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Proposed Action Plan *</label>
                <textarea
                  rows={3}
                  value={capaForm.proposed_action}
                  onChange={(e) => setCapaForm({ ...capaForm, proposed_action: e.target.value })}
                  placeholder="Concrete steps to resolve and prevent recurrence..."
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Responsible Person</label>
                  <input
                    type="text"
                    value={capaForm.responsible_person}
                    onChange={(e) => setCapaForm({ ...capaForm, responsible_person: e.target.value })}
                    placeholder="Assignee"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Target Completion Date</label>
                  <input
                    type="date"
                    value={capaForm.target_completion_date}
                    onChange={(e) => setCapaForm({ ...capaForm, target_completion_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Verification Method</label>
                <input
                  type="text"
                  value={capaForm.verification_method}
                  onChange={(e) => setCapaForm({ ...capaForm, verification_method: e.target.value })}
                  placeholder="e.g. 100% Ultrasonic Re-Test, Peer Code Review, Performance Benchmark"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowCAPAModal(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-sm bg-indigo-600 hover:bg-indigo-700 border-indigo-600">
                  Save CAPA Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL 5: VERIFY CAPA (Effective vs Ineffective Reopening) */}
      {/* ======================================================= */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck size={18} className="text-teal-600" /> Verify CAPA Effectiveness
              </h3>
              <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmVerifyCAPA} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Verification Result *</label>
                <select
                  value={verifyForm.verification_result}
                  onChange={(e) => setVerifyForm({ ...verifyForm, verification_result: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 font-semibold"
                >
                  <option value="EFFECTIVE">Effective (Problem Permanently Resolved)</option>
                  <option value="PARTIALLY_EFFECTIVE">Partially Effective (Requires Monitoring)</option>
                  <option value="INEFFECTIVE_REOPENED">Ineffective (Reopen Action for Investigation)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Verification Notes & Findings *</label>
                <textarea
                  rows={3}
                  value={verifyForm.verification_notes}
                  onChange={(e) => setVerifyForm({ ...verifyForm, verification_notes: e.target.value })}
                  placeholder="Record re-inspection results, test log reference, or reason for reopening..."
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowVerifyModal(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn text-xs font-semibold ${
                    verifyForm.verification_result === "INEFFECTIVE_REOPENED"
                      ? "btn-secondary text-rose-600 border-rose-300"
                      : "btn-primary bg-teal-600 hover:bg-teal-700"
                  }`}
                >
                  {verifyForm.verification_result === "INEFFECTIVE_REOPENED" ? "Reopen Action" : "Confirm Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL 6: CLOSE DEFECT (Resolution Evidence Required) */}
      {/* ======================================================= */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" /> Close Quality Issue & Record Evidence
              </h3>
              <button onClick={() => setShowCloseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmCloseDefect} className="p-5 space-y-4 text-xs">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300">
                Resolution evidence or verification notes are strictly required before marking an issue closed.
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Resolution Evidence / Document Reference *</label>
                <input
                  type="text"
                  value={closeForm.resolution_evidence}
                  onChange={(e) => setCloseForm({ ...closeForm, resolution_evidence: e.target.value })}
                  placeholder="e.g. Test Report #NDT-2026-88, Re-weld signed off by Lead"
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Closure Remarks</label>
                <textarea
                  rows={2}
                  value={closeForm.resolution_remarks}
                  onChange={(e) => setCloseForm({ ...closeForm, resolution_remarks: e.target.value })}
                  placeholder="Final remarks on verification and sign-off..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowCloseModal(false)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-sm bg-emerald-600 hover:bg-emerald-700 border-emerald-600">
                  Verify & Close Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
