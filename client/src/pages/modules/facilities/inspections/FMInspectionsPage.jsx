import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck, AlertOctagon, Plus, ArrowLeft,
  Filter, RefreshCw, Search, CheckCircle, XCircle,
  Calendar, Wrench, Eye, Edit, Clock, Sparkles,
  UserCheck, CheckSquare, ListChecks, ChevronRight,
  ShieldCheck, User
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const runStatusBadge = (status) => {
  const map = {
    SCHEDULED:       "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    IN_PROGRESS:     "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    COMPLETED:       "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    FLAGGED_DEFECTS: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    CANCELLED:       "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return map[status] || "bg-slate-100 text-slate-500";
};

const actionStatusBadge = (status) => {
  const map = {
    OPEN:                 "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    IN_PROGRESS:          "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    PENDING_VERIFICATION: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    CLOSED:               "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  };
  return map[status] || "bg-slate-100 text-slate-500";
};

const severityBadge = (sev) => {
  const map = {
    CRITICAL: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    MAJOR:    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    MINOR:    "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  };
  return map[sev] || "bg-slate-100 text-slate-500";
};

const passBadge = (result) => {
  if (result === "PASS") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  if (result === "FAIL") return "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";
  return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
};

// ─── Initial form states ──────────────────────────────────────────────────────
const getInitialRunForm = () => ({
  property_id: "",
  template_id: "",
  template_name: "",
  inspector_id: "",
  inspector_name: "",
  supervisor_name: "",
  inspection_type: "ROUTINE_DAILY",
  scheduled_date: new Date().toISOString().slice(0, 10),
  scheduled_time: "09:00",
  priority: "HIGH",
  checklist_payload: [],
});

const getInitialCompleteForm = () => ({
  overall_score_pct: "",
  pass_fail_result: "PASS",
  findings_summary: "",
  defects_count: 0,
});

const getInitialActionForm = () => ({
  property_id: "",
  title: "",
  description: "",
  severity: "MINOR",
  assigned_to: "",
  deadline_date: "",
});

const getInitialUpdateActionForm = () => ({
  status: "OPEN",
  corrective_action_taken: "",
  verification_notes: "",
});

// ─── Component ────────────────────────────────────────────────────────────────
export default function FMInspectionsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("inspections"); // "inspections" | "actions"
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Operational Setup data for checklists & auto-assignment
  const [checklistTemplates, setChecklistTemplates] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [users, setUsers] = useState([]);
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [autoAssignInfo, setAutoAssignInfo] = useState(null);

  // Inspection runs state
  const [runs, setRuns] = useState([]);
  const [runFilters, setRunFilters] = useState({ propertyId: "", status: "", type: "", search: "" });
  const [showRunModal, setShowRunModal] = useState(false);
  const [viewingRun, setViewingRun] = useState(null);
  const [runForm, setRunForm] = useState(getInitialRunForm());
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [completeForm, setCompleteForm] = useState(getInitialCompleteForm());

  // Corrective actions state
  const [actions, setActions] = useState([]);
  const [actionFilters, setActionFilters] = useState({ propertyId: "", status: "", search: "" });
  const [showActionModal, setShowActionModal] = useState(false);
  const [viewingAction, setViewingAction] = useState(null);
  const [actionForm, setActionForm] = useState(getInitialActionForm());
  const [showUpdateActionModal, setShowUpdateActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [updateActionForm, setUpdateActionForm] = useState(getInitialUpdateActionForm());

  // ── Fetch helpers ──
  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get("/facilities/properties");
      const list = res.data?.data || [];
      setProperties(list);
      if (list.length > 0) {
        setRunForm((f) => ({ ...f, property_id: list[0].id }));
        setActionForm((f) => ({ ...f, property_id: list[0].id }));
      }
    } catch {}
  }, []);

  const fetchChecklists = useCallback(async () => {
    try {
      const res = await api.get("/facilities/checklists/templates");
      const list = res.data?.data || [];
      setChecklistTemplates(list);
    } catch {}
  }, []);

  const fetchOperationalData = useCallback(async () => {
    try {
      const [setupRes, userRes] = await Promise.all([
        api.get("/facilities/setup/overview").catch(() => ({ data: { data: {} } })),
        api.get("/admin/users").catch(() => ({ data: [] })),
      ]);
      const data = setupRes.data?.data || {};
      setShifts(data.shifts || []);
      setPersonnel(data.personnel || []);
      const uList =
        userRes.data?.data?.items ||
        userRes.data?.items ||
        userRes.data?.users ||
        (Array.isArray(userRes.data) ? userRes.data : []);
      setUsers(Array.isArray(uList) ? uList : []);
    } catch {}
  }, []);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (runFilters.propertyId) params.set("propertyId", runFilters.propertyId);
      if (runFilters.status)     params.set("status", runFilters.status);
      if (runFilters.type)       params.set("type", runFilters.type);
      if (runFilters.search)     params.set("search", runFilters.search);
      const res = await api.get(`/facilities/inspection-runs?${params.toString()}`);
      setRuns(res.data?.data || []);
    } catch {
      toast.error("Failed to load inspection schedule");
    } finally {
      setLoading(false);
    }
  }, [runFilters]);

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilters.propertyId) params.set("propertyId", actionFilters.propertyId);
      if (actionFilters.status)     params.set("status", actionFilters.status);
      if (actionFilters.search)     params.set("search", actionFilters.search);
      const res = await api.get(`/facilities/corrective-actions?${params.toString()}`);
      setActions(res.data?.data || []);
    } catch {
      toast.error("Failed to load corrective actions");
    } finally {
      setLoading(false);
    }
  }, [actionFilters]);

  useEffect(() => {
    fetchProperties();
    fetchChecklists();
    fetchOperationalData();
  }, [fetchProperties, fetchChecklists, fetchOperationalData]);

  useEffect(() => {
    if (activeTab === "inspections") fetchRuns();
    else fetchActions();
  }, [activeTab, fetchRuns, fetchActions]);

  // ── Auto-assign inspector based on inspection time and scheduled date ──
  const handleAutoAssign = useCallback(async (propId = runForm.property_id, sDate = runForm.scheduled_date, sTime = runForm.scheduled_time) => {
    setAutoAssignLoading(true);
    try {
      const params = new URLSearchParams();
      if (propId) params.set("property_id", propId);
      if (sDate) params.set("scheduled_date", sDate);
      if (sTime) params.set("scheduled_time", sTime);
      const res = await api.get(`/facilities/inspections/auto-assign?${params.toString()}`);
      if (res.data?.success && res.data?.data) {
        const d = res.data.data;
        setRunForm((prev) => ({
          ...prev,
          inspector_id: d.inspector_id || prev.inspector_id,
          inspector_name: d.inspector_name || prev.inspector_name,
        }));
        setAutoAssignInfo(d);
      }
    } catch {
      // Client-side fallback matching
      const candidate = personnel[0]?.name || users[0]?.full_name || users[0]?.username;
      const candId = users[0]?.id || "";
      if (candidate) {
        setRunForm((prev) => ({
          ...prev,
          inspector_id: candId,
          inspector_name: candidate,
        }));
        setAutoAssignInfo({
          inspector_name: candidate,
          shift_name: shifts[0]?.name || "Day Shift",
          reason: "Assigned via operational schedule",
        });
      }
    } finally {
      setAutoAssignLoading(false);
    }
  }, [runForm.property_id, runForm.scheduled_date, runForm.scheduled_time, personnel, users, shifts]);

  const handleOpenScheduleModal = () => {
    const init = getInitialRunForm();
    if (properties.length > 0) init.property_id = properties[0].id;
    if (checklistTemplates.length > 0) {
      init.template_id = checklistTemplates[0].id;
      init.template_name = checklistTemplates[0].template_name;
      init.checklist_payload = checklistTemplates[0].items || [];
    }
    setRunForm(init);
    setShowRunModal(true);
    handleAutoAssign(init.property_id, init.scheduled_date, init.scheduled_time);
  };

  const handleSelectTemplate = (templateId) => {
    const tpl = checklistTemplates.find((t) => String(t.id) === String(templateId));
    if (tpl) {
      setRunForm((prev) => ({
        ...prev,
        template_id: tpl.id,
        template_name: tpl.template_name,
        checklist_payload: tpl.items || [],
      }));
    } else {
      setRunForm((prev) => ({
        ...prev,
        template_id: "",
        template_name: "",
        checklist_payload: [],
      }));
    }
  };

  // ── Summary calculations ──
  const totalScheduled = runs.length;
  const completedRuns  = runs.filter((r) => r.status === "COMPLETED").length;
  const flaggedDefects = runs.filter((r) => r.status === "FLAGGED_DEFECTS").length;
  const overdueRuns    = runs.filter((r) => r.status === "SCHEDULED" && new Date(r.scheduled_date) < new Date()).length;

  const today = new Date().toISOString().slice(0, 10);
  const openActions        = actions.filter((a) => a.status === "OPEN").length;
  const inProgressActions  = actions.filter((a) => a.status === "IN_PROGRESS").length;
  const pendingVerification = actions.filter((a) => a.status === "PENDING_VERIFICATION").length;
  const overdueActions     = actions.filter((a) => a.status !== "CLOSED" && a.deadline_date && String(a.deadline_date).slice(0, 10) < today).length;

  // ── Handlers ──
  const handleCreateRun = async (e) => {
    e.preventDefault();
    if (!runForm.property_id) {
      toast.warn("Please select a target property");
      return;
    }
    if (!runForm.template_name) {
      toast.warn("Please select an inspection checklist template");
      return;
    }
    if (!runForm.inspector_name) {
      toast.warn("Please assign or auto-assign an inspector");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/facilities/inspection-runs", runForm);
      const runNo = res.data?.data?.run_no || "";
      const taskNo = res.data?.data?.task_no || "";
      toast.success(
        `Inspection ${runNo} scheduled! Task ${taskNo ? `[${taskNo}] ` : ""}dispatched to ${runForm.inspector_name}'s Task Execution page ahead of scheduled inspection.`
      );
      setShowRunModal(false);
      setRunForm(getInitialRunForm());
      setAutoAssignInfo(null);
      fetchRuns();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to schedule inspection");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteRun = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/facilities/inspection-runs/${selectedRun.id}/complete`, {
        ...completeForm,
        overall_score_pct: parseFloat(completeForm.overall_score_pct),
        defects_count: parseInt(completeForm.defects_count, 10),
      });
      toast.success("Inspection run marked as completed");
      setShowCompleteModal(false);
      setCompleteForm(getInitialCompleteForm());
      fetchRuns();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete inspection");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAction = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/facilities/corrective-actions", actionForm);
      toast.success("Corrective action created successfully");
      setShowActionModal(false);
      setActionForm(getInitialActionForm());
      fetchActions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create corrective action");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAction = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/facilities/corrective-actions/${selectedAction.id}`, updateActionForm);
      toast.success("Corrective action updated");
      setShowUpdateActionModal(false);
      setUpdateActionForm(getInitialUpdateActionForm());
      fetchActions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update action");
    } finally {
      setSubmitting(false);
    }
  };

  const fr = (field) => (e) => {
    const val = e.target.value;
    setRunForm((f) => ({ ...f, [field]: val }));
    if (field === "property_id" || field === "scheduled_date" || field === "scheduled_time") {
      const nextP = field === "property_id" ? val : runForm.property_id;
      const nextD = field === "scheduled_date" ? val : runForm.scheduled_date;
      const nextT = field === "scheduled_time" ? val : runForm.scheduled_time;
      handleAutoAssign(nextP, nextD, nextT);
    }
  };
  const fc = (field) => (e) => setCompleteForm((f) => ({ ...f, [field]: e.target.value }));
  const fa = (field) => (e) => setActionForm((f) => ({ ...f, [field]: e.target.value }));
  const fu = (field) => (e) => setUpdateActionForm((f) => ({ ...f, [field]: e.target.value }));

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs"
            title="Go Back"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              Inspection Runs &amp; Corrective Actions
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Scheduled site inspections, compliance scoring, defect flagging and corrective action tracking.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "inspections" && (
            <button
              onClick={handleOpenScheduleModal}
              className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm active:scale-95"
            >
              <Plus size={15} /> Schedule Inspection
            </button>
          )}
          {activeTab === "actions" && (
            <button
              onClick={() => { setActionForm(getInitialActionForm()); setShowActionModal(true); }}
              className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm active:scale-95"
            >
              <Plus size={15} /> Create Action
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab("inspections")}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "inspections"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Calendar size={14} />
          Inspection Schedule ({runs.length})
        </button>
        <button
          onClick={() => setActiveTab("actions")}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "actions"
              ? "border-teal-500 text-teal-600 dark:text-teal-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Wrench size={14} />
          Corrective Actions ({actions.length})
        </button>
      </div>

      {/* ── TAB 1: INSPECTION SCHEDULE ──────────────────────────────────────── */}
      {activeTab === "inspections" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Scheduled</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{totalScheduled}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Completed</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{completedRuns}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Flagged Defects</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{flaggedDefects}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Overdue</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{overdueRuns}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Filter size={13} />
                <span className="text-xs font-semibold text-slate-500">Filters</span>
              </div>
              <select
                value={runFilters.propertyId}
                onChange={(e) => setRunFilters((f) => ({ ...f, propertyId: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Properties</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.property_name}</option>)}
              </select>
              <select
                value={runFilters.status}
                onChange={(e) => setRunFilters((f) => ({ ...f, status: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Status</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="FLAGGED_DEFECTS">Flagged Defects</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select
                value={runFilters.type}
                onChange={(e) => setRunFilters((f) => ({ ...f, type: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Types</option>
                <option value="ROUTINE_DAILY">Routine Daily</option>
                <option value="WEEKLY_AUDIT">Weekly Audit</option>
                <option value="MONTHLY_PPM">Monthly PPM</option>
                <option value="AD_HOC">Ad Hoc</option>
                <option value="RISK_BASED">Risk Based</option>
                <option value="STATUTORY">Statutory</option>
              </select>
              <div className="flex-1 min-w-[180px] relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search run no or inspector..."
                  value={runFilters.search}
                  onChange={(e) => setRunFilters((f) => ({ ...f, search: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-3 py-1.5 text-xs"
                />
              </div>
              <button onClick={fetchRuns} className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Run No</th>
                    <th className="px-3 py-3">Template</th>
                    <th className="px-3 py-3">Property</th>
                    <th className="px-3 py-3">Inspector</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Scheduled Time & Date</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Score %</th>
                    <th className="px-3 py-3">Result</th>
                    <th className="px-3 py-3">Defects</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan="11" className="text-center py-10 text-slate-400">Loading inspection schedule…</td></tr>
                  ) : runs.length === 0 ? (
                    <tr><td colSpan="11" className="text-center py-10 text-slate-400 italic">No inspection runs found.</td></tr>
                  ) : (
                    runs.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-white">{r.run_no}</td>
                        <td className="px-3 py-3 font-medium text-slate-700 dark:text-slate-200">{r.template_name || "—"}</td>
                        <td className="px-3 py-3">{r.property_name || "—"}</td>
                        <td className="px-3 py-3">
                          <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                            <User size={12} className="text-slate-400" />
                            {r.inspector_name}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                            {r.inspection_type?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {r.scheduled_date ? String(r.scheduled_date).slice(0, 10) : "—"}
                          </div>
                          {r.scheduled_time && (
                            <div className="text-[11px] text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1 mt-0.5">
                              <Clock size={11} /> {r.scheduled_time}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${runStatusBadge(r.status)}`}>
                            {r.status?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {r.overall_score_pct != null ? `${r.overall_score_pct}%` : "—"}
                        </td>
                        <td className="px-3 py-3">
                          {r.pass_fail_result ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${passBadge(r.pass_fail_result)}`}>
                              {r.pass_fail_result?.replace(/_/g, " ")}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 font-mono text-center">
                          {r.defects_count != null ? (
                            <span className={r.defects_count > 0 ? "text-rose-600 font-bold" : "text-slate-400"}>{r.defects_count}</span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setViewingRun(r)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all"
                              title="View Inspection Run Details"
                            >
                              <Eye size={11} /> View
                            </button>
                            <button
                              onClick={() => navigate("/facilities/tasks/execution")}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold"
                              title="Go to Task Execution"
                            >
                              <CheckSquare size={11} /> Task Execution
                            </button>
                            {(r.status === "SCHEDULED" || r.status === "IN_PROGRESS") && (
                              <button
                                onClick={() => { setSelectedRun(r); setCompleteForm(getInitialCompleteForm()); setShowCompleteModal(true); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold"
                              >
                                <CheckCircle size={11} /> Complete / Edit
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
      )}

      {/* ── TAB 2: CORRECTIVE ACTIONS ──────────────────────────────────────── */}
      {activeTab === "actions" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Open</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{openActions}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">In Progress</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{inProgressActions}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Pending Verification</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{pendingVerification}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Overdue</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">{overdueActions}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Filter size={13} />
                <span className="text-xs font-semibold text-slate-500">Filters</span>
              </div>
              <select
                value={actionFilters.propertyId}
                onChange={(e) => setActionFilters((f) => ({ ...f, propertyId: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Properties</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.property_name}</option>)}
              </select>
              <select
                value={actionFilters.status}
                onChange={(e) => setActionFilters((f) => ({ ...f, status: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="CLOSED">Closed</option>
              </select>
              <div className="flex-1 min-w-[180px] relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search action title or assignee..."
                  value={actionFilters.search}
                  onChange={(e) => setActionFilters((f) => ({ ...f, search: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-3 py-1.5 text-xs"
                />
              </div>
              <button onClick={fetchActions} className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Action No</th>
                    <th className="px-3 py-3">Title</th>
                    <th className="px-3 py-3">Property</th>
                    <th className="px-3 py-3">Severity</th>
                    <th className="px-3 py-3">Assigned To</th>
                    <th className="px-3 py-3">Deadline</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan="8" className="text-center py-10 text-slate-400">Loading corrective actions…</td></tr>
                  ) : actions.length === 0 ? (
                    <tr><td colSpan="8" className="text-center py-10 text-slate-400 italic">No corrective actions found.</td></tr>
                  ) : (
                    actions.map((a) => {
                      const isOverdue = a.status !== "CLOSED" && a.deadline_date && String(a.deadline_date).slice(0, 10) < today;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-white">{a.action_no}</td>
                          <td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">{a.title}</td>
                          <td className="px-3 py-3">{a.property_name || "—"}</td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${severityBadge(a.severity)}`}>
                              {a.severity}
                            </span>
                          </td>
                          <td className="px-3 py-3">{a.assigned_to}</td>
                          <td className={`px-3 py-3 font-mono text-xs ${isOverdue ? "text-rose-600 font-bold" : ""}`}>
                            {a.deadline_date ? String(a.deadline_date).slice(0, 10) : "—"}
                            {isOverdue && <span className="ml-1 text-xs text-rose-500 font-bold">OVERDUE</span>}
                          </td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${actionStatusBadge(a.status)}`}>
                              {a.status?.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <button
                                onClick={() => setViewingAction(a)}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all"
                                title="View Corrective Action Details"
                              >
                                <Eye size={11} /> View
                              </button>
                              {a.status !== "CLOSED" && (
                                <button
                                  onClick={() => {
                                    setSelectedAction(a);
                                    setUpdateActionForm({ status: a.status, corrective_action_taken: a.corrective_action_taken || "", verification_notes: a.verification_notes || "" });
                                    setShowUpdateActionModal(true);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold"
                                >
                                  <Wrench size={11} /> Edit / Update
                                </button>
                              )}
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: SCHEDULE INSPECTION & AUTO-ASSIGN
      ══════════════════════════════════════════════════════════════════════ */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-4xl lg:max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 rounded-xl">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Schedule Inspection Run
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                      Auto-Assigned & Dispatched
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Auto-assigns user based on schedule & shift, dispatching interactive checklist to Task Execution.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRunModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRun} className="p-6 space-y-5 text-xs">
              {/* SECTION 1: PROPERTY & CHECKLIST TEMPLATE (POPULATED FROM OPERATIONAL SETUP) */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ListChecks size={14} className="text-teal-600" />
                    1. Property & Inspection Checklist Template
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Populated from Operational Setup
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Target Property <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={runForm.property_id}
                      onChange={fr("property_id")}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-1 focus:ring-teal-500"
                      required
                    >
                      <option value="">-- Select Property --</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.property_name} {p.property_code ? `(${p.property_code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Inspection Checklist Template <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={runForm.template_id}
                      onChange={(e) => handleSelectTemplate(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-semibold focus:ring-1 focus:ring-teal-500"
                      required
                    >
                      <option value="">-- Select Template from Operational Setup --</option>
                      {checklistTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          📋 {t.template_name} ({t.service_line?.replace(/_/g, " ") || "PPM"}) — {t.items?.length || 0} checks
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Inspection Type</label>
                    <select
                      value={runForm.inspection_type}
                      onChange={fr("inspection_type")}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs"
                      required
                    >
                      <option value="ROUTINE_DAILY">Routine Daily</option>
                      <option value="WEEKLY_AUDIT">Weekly Audit</option>
                      <option value="MONTHLY_PPM">Monthly PPM</option>
                      <option value="AD_HOC">Ad Hoc</option>
                      <option value="RISK_BASED">Risk Based</option>
                      <option value="STATUTORY">Statutory</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Inspection Priority</label>
                    <select
                      value={runForm.priority}
                      onChange={fr("priority")}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High (Default)</option>
                      <option value="URGENT">Urgent / Critical</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: SCHEDULED DATE & INSPECTION TIME */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Clock size={14} className="text-teal-600" />
                  2. Scheduled Inspection Time & Date
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Scheduled Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={runForm.scheduled_date}
                      onChange={fr("scheduled_date")}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Inspection Time Slot <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={runForm.scheduled_time}
                        onChange={fr("scheduled_time")}
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Time Slot Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick Slots:</span>
                  {[
                    { label: "08:00 AM (Morning)", time: "08:00" },
                    { label: "10:30 AM (Mid-Day)", time: "10:30" },
                    { label: "02:00 PM (Afternoon)", time: "14:00" },
                    { label: "06:00 PM (Evening)", time: "18:00" },
                  ].map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      onClick={() => {
                        setRunForm((f) => ({ ...f, scheduled_time: s.time }));
                        handleAutoAssign(runForm.property_id, runForm.scheduled_date, s.time);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        runForm.scheduled_time === s.time
                          ? "bg-teal-600 text-white shadow-sm"
                          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 3: AUTO-ASSIGNED USER / INSPECTOR */}
              <div className="bg-teal-50/60 dark:bg-teal-950/30 p-4 rounded-2xl border border-teal-200 dark:border-teal-900/50 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-teal-600" />
                    3. Auto-Assigned User (Based on Scheduled Time & Shift)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAutoAssign(runForm.property_id, runForm.scheduled_date, runForm.scheduled_time)}
                    disabled={autoAssignLoading}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:underline"
                  >
                    <RefreshCw size={11} className={autoAssignLoading ? "animate-spin" : ""} />
                    {autoAssignLoading ? "Auto-matching..." : "Re-Auto-Assign User"}
                  </button>
                </div>

                {autoAssignInfo && (
                  <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-teal-200 dark:border-teal-800/80 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {autoAssignInfo.inspector_name}
                        </span>
                        <span className="text-[11px] text-teal-700 dark:text-teal-300 block font-medium">
                          {autoAssignInfo.reason || "Auto-assigned based on scheduled time & roster"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 font-bold">
                      {autoAssignInfo.shift_name || "Operational Shift"}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Assigned Inspector / User <span className="text-rose-500">*</span>
                    </label>
                    {users && users.length > 0 ? (
                      <select
                        value={runForm.inspector_name}
                        onChange={(e) => {
                          const selU = users.find((u) => (u.full_name || u.username) === e.target.value);
                          setRunForm({
                            ...runForm,
                            inspector_name: e.target.value,
                            inspector_id: selU?.id || runForm.inspector_id,
                          });
                        }}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold focus:ring-1 focus:ring-teal-500"
                        required
                      >
                        <option value="">-- Select Inspector / User --</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.full_name || u.username}>
                            {u.full_name || u.username} ({u.email || `ID: ${u.id}`})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder="e.g. Emmanuel Boateng"
                        value={runForm.inspector_name}
                        onChange={fr("inspector_name")}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-semibold"
                        required
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Supervisor Sign-off</label>
                    <input
                      type="text"
                      placeholder="e.g. Daniel Asiedu"
                      value={runForm.supervisor_name}
                      onChange={fr("supervisor_name")}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: CHECKPOINTS PREVIEW (FROM SELECTED TEMPLATE) */}
              {runForm.checklist_payload && runForm.checklist_payload.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <CheckSquare size={14} className="text-teal-600" />
                      4. Verification Checkpoints ({runForm.checklist_payload.length} items)
                    </span>
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                      Included in user task
                    </span>
                  </div>

                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {runForm.checklist_payload.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          <strong className="text-teal-600 mr-1.5">#{idx + 1}</strong>
                          {it.item_text || it.text}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                            {it.field_type || "PASS_FAIL"}
                            {it.unit_of_measure ? ` (${it.unit_of_measure})` : ""}
                          </span>
                          {it.is_critical && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold text-[10px]">
                              CRITICAL
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 5: DISPATCH TO TASK EXECUTION NOTICE */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5">
                <CheckSquare size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  <strong>Automatic Task Execution Dispatch:</strong> This inspection run will instantly appear as an interactive task on{" "}
                  <strong>{runForm.inspector_name || "the assigned user"}&apos;s Task Execution page</strong> ahead of{" "}
                  <strong>{runForm.scheduled_date} @ {runForm.scheduled_time}</strong>, populated with all checkpoints ready for execution and scoring.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowRunModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  {submitting ? "Scheduling & Dispatching…" : "Schedule & Dispatch to Task Execution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: COMPLETE INSPECTION RUN
      ══════════════════════════════════════════════════════════════════════ */}
      {showCompleteModal && selectedRun && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-500" />
                Complete Inspection — {selectedRun.run_no}
              </h3>
              <button type="button" onClick={() => setShowCompleteModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1">✕</button>
            </div>
            <form onSubmit={handleCompleteRun} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Overall Score % *</label>
                  <input type="number" min="0" max="100" step="0.1" placeholder="e.g. 87.5" value={completeForm.overall_score_pct} onChange={fc("overall_score_pct")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono font-bold" required />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Pass / Fail Result *</label>
                  <select value={completeForm.pass_fail_result} onChange={fc("pass_fail_result")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs">
                    <option value="PASS">Pass</option>
                    <option value="FAIL">Fail</option>
                    <option value="CONDITIONAL_PASS">Conditional Pass</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Findings Summary</label>
                <textarea rows={3} placeholder="Summarise key findings, observations and non-conformances..." value={completeForm.findings_summary} onChange={fc("findings_summary")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Defects Count</label>
                <input type="number" min="0" value={completeForm.defects_count} onChange={fc("defects_count")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowCompleteModal(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm">
                  {submitting ? "Saving…" : "Mark Completed"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: CREATE CORRECTIVE ACTION
      ══════════════════════════════════════════════════════════════════════ */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-4xl lg:max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertOctagon size={18} className="text-rose-500" />
                Create Corrective Action
              </h3>
              <button type="button" onClick={() => setShowActionModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1">✕</button>
            </div>
            <form onSubmit={handleCreateAction} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Property *</label>
                  <select value={actionForm.property_id} onChange={fa("property_id")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required>
                    <option value="">Select property...</option>
                    {properties.map((p) => <option key={p.id} value={p.id}>{p.property_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Title *</label>
                  <input type="text" placeholder="e.g. Fix leaking roof drainage on Level 3" value={actionForm.title} onChange={fa("title")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea rows={2} placeholder="Provide more details about the defect or non-conformance..." value={actionForm.description} onChange={fa("description")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Severity *</label>
                  <select value={actionForm.severity} onChange={fa("severity")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required>
                    <option value="MINOR">Minor</option>
                    <option value="MAJOR">Major</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Assigned To *</label>
                  <input type="text" placeholder="e.g. Kwesi Darko" value={actionForm.assigned_to} onChange={fa("assigned_to")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Deadline Date *</label>
                  <input type="date" value={actionForm.deadline_date} onChange={fa("deadline_date")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowActionModal(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-sm">
                  {submitting ? "Creating…" : "Create Corrective Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: UPDATE CORRECTIVE ACTION
      ══════════════════════════════════════════════════════════════════════ */}
      {showUpdateActionModal && selectedAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench size={18} className="text-teal-500" />
                Update Action — {selectedAction.action_no}
              </h3>
              <button type="button" onClick={() => setShowUpdateActionModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1">✕</button>
            </div>
            <form onSubmit={handleUpdateAction} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Status *</label>
                <select value={updateActionForm.status} onChange={fu("status")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs">
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Corrective Action Taken</label>
                <textarea rows={3} placeholder="Describe the remediation steps taken..." value={updateActionForm.corrective_action_taken} onChange={fu("corrective_action_taken")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Verification Notes</label>
                <textarea rows={2} placeholder="Notes from supervisor verification check..." value={updateActionForm.verification_notes} onChange={fu("verification_notes")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowUpdateActionModal(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-sm">
                  {submitting ? "Saving…" : "Save Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: View Inspection Run ── */}
      {viewingRun && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={18} className="text-teal-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Inspection Run Details — {viewingRun.run_no}
                </h3>
              </div>
              <button onClick={() => setViewingRun(null)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-xs">Template</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{viewingRun.template_name || "Standard Site Inspection"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Property</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingRun.property_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Inspector</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingRun.inspector_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Scheduled Time & Date</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                    {viewingRun.scheduled_date ? String(viewingRun.scheduled_date).slice(0, 10) : "—"}
                    {viewingRun.scheduled_time ? ` @ ${viewingRun.scheduled_time}` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block mt-0.5 ${runStatusBadge(viewingRun.status)}`}>
                    {viewingRun.status?.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Score & Result</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">
                    {viewingRun.overall_score_pct != null ? `${viewingRun.overall_score_pct}%` : "—"} ({viewingRun.pass_fail_result || "PENDING"})
                  </span>
                </div>
              </div>

              {/* Checklist Payload Checkpoints */}
              {(() => {
                let items = [];
                if (viewingRun.checklist_payload) {
                  try {
                    items = typeof viewingRun.checklist_payload === "string"
                      ? JSON.parse(viewingRun.checklist_payload)
                      : viewingRun.checklist_payload;
                  } catch {}
                }
                if (!Array.isArray(items) || items.length === 0) return null;
                return (
                  <div>
                    <span className="text-slate-400 block text-xs font-semibold uppercase mb-1.5 flex items-center gap-1">
                      <CheckSquare size={13} className="text-teal-600" />
                      Checklist Verification Criteria ({items.length} checkpoints)
                    </span>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-900/60">
                      {items.map((it, idx) => (
                        <div key={idx} className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            <strong className="text-teal-600 mr-1.5">#{idx + 1}</strong>
                            {it.item_text || it.text}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-[10px]">
                            {it.field_type || "PASS_FAIL"}
                            {it.is_critical ? " • CRITICAL" : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {viewingRun.findings_summary && (
                <div>
                  <span className="text-slate-400 block text-xs font-semibold uppercase mb-1">Findings Summary</span>
                  <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {viewingRun.findings_summary}
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setViewingRun(null);
                    navigate("/facilities/tasks/execution");
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <CheckSquare size={13} /> Open in Task Execution →
                </button>
                <button onClick={() => setViewingRun(null)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: View Corrective Action ── */}
      {viewingAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <AlertOctagon size={18} className="text-rose-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Corrective Action — {viewingAction.action_no}
                </h3>
              </div>
              <button onClick={() => setViewingAction(null)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-xs">Title</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{viewingAction.title}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Property</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingAction.property_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Severity</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">{viewingAction.severity}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Assigned To</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingAction.assigned_to}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Deadline Date</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{viewingAction.deadline_date ? String(viewingAction.deadline_date).slice(0, 10) : "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block mt-0.5 ${actionStatusBadge(viewingAction.status)}`}>
                    {viewingAction.status?.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {viewingAction.description && (
                <div>
                  <span className="text-slate-400 block text-xs font-semibold uppercase mb-1">Issue Description</span>
                  <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {viewingAction.description}
                  </p>
                </div>
              )}

              {viewingAction.corrective_action_taken && (
                <div>
                  <span className="text-slate-400 block text-xs font-semibold uppercase mb-1">Action Taken</span>
                  <p className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 rounded-xl leading-relaxed whitespace-pre-wrap">
                    {viewingAction.corrective_action_taken}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => setViewingAction(null)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
