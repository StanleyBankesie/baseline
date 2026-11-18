/**
 * @file ProjectTimelinePage.jsx
 * @description Dedicated full page for Project Timeline — Master project schedule,
 * overall duration, work breakdown structure (WBS), project scopes, and task checkpoints.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  ArrowLeft,
  RefreshCw,
  Info,
  Layers,
  CalendarDays,
  Search,
  CheckCircle2,
  CheckSquare,
  Square,
  Plus,
  Edit2,
  Calendar,
  User,
  X,
  Save,
  Loader2,
  Trash2,
  ChevronRight,
  Filter,
  Check,
  AlertCircle,
  Tag,
  ListTodo,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

const statusBadge = (status) => {
  switch (String(status || "").toUpperCase()) {
    case "COMPLETED":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800";
    case "IN_PROGRESS":
      return "bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800";
    case "DELAYED":
      return "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800";
    case "ON_HOLD":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
  }
};

const computeScopeStatus = (scope, scopeTasks = []) => {
  if (scope?.status && String(scope.status).trim()) {
    return String(scope.status).toUpperCase();
  }
  if (!scopeTasks || scopeTasks.length === 0) {
    return "PENDING";
  }
  const allCompleted = scopeTasks.every(
    (t) => String(t.status).toUpperCase() === "COMPLETED" || Number(t.completion_percent || 0) >= 100
  );
  if (allCompleted) return "COMPLETED";

  const hasDelayed = scopeTasks.some((t) => String(t.status).toUpperCase() === "DELAYED");
  if (hasDelayed) return "DELAYED";

  const hasInProgress = scopeTasks.some(
    (t) => String(t.status).toUpperCase() === "IN_PROGRESS" || Number(t.completion_percent || 0) > 0
  );
  if (hasInProgress) return "IN_PROGRESS";

  const hasOnHold = scopeTasks.some((t) => String(t.status).toUpperCase() === "ON_HOLD");
  if (hasOnHold) return "ON_HOLD";

  return "PENDING";
};

const parseChecklist = (taskDescription) => {
  if (!taskDescription) return [];
  try {
    const raw = String(taskDescription).trim();
    if (raw.startsWith("[") && raw.endsWith("]")) {
      const jsonArr = JSON.parse(raw);
      if (Array.isArray(jsonArr)) {
        return jsonArr.map((item, idx) => {
          if (typeof item === "object" && item !== null) {
            return {
              id: item.id || idx + 1,
              text: item.text || item.label || "",
              completed: Boolean(item.completed),
              note: item.note || "",
            };
          }
          return { id: idx + 1, text: String(item), completed: false, note: "" };
        });
      }
    } else if (raw) {
      return raw
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s, idx) => ({ id: idx + 1, text: s, completed: false, note: "" }));
    }
  } catch {
    return [{ id: 1, text: String(taskDescription), completed: false, note: "" }];
  }
  return [];
};

export default function ProjectTimelinePage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [scheduleData, setScheduleData] = useState({
    project: null,
    scopes: [],
    tasks: [],
    cpm: { forecastCompletionDate: "" },
    variance: { actualProgress: 0, scheduleVarianceDays: 0 },
  });

  // Modal State for Work Plan/WBS floating modal
  const [workPlanModalOpen, setWorkPlanModalOpen] = useState(false);
  const [activeScopeForWorkPlan, setActiveScopeForWorkPlan] = useState(null);

  // Modal State for Tasks & Checklists/Deliverables floating modal
  const [tasksModalOpen, setTasksModalOpen] = useState(false);
  const [focusedTaskId, setFocusedTaskId] = useState(null);
  const [tasksModalScopeFilter, setTasksModalScopeFilter] = useState("ALL");
  const [tasksModalStatusFilter, setTasksModalStatusFilter] = useState("ALL");
  const [tasksModalSearch, setTasksModalSearch] = useState("");
  const [newChecklistText, setNewChecklistText] = useState("");

  // Modal State for Adding/Editing Task with Scope & WBS
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    id: null,
    task_title: "",
    task_description: "",
    scope_name: "",
    wbs_code: "",
    assigned_to_id: "",
    assigned_to_name: "",
    start_date: "",
    end_date: "",
    duration_days: 1,
    estimated_hours: 8,
    completion_percent: 0,
    status: "PENDING",
    priority: "MEDIUM",
  });

  // Load projects list and users
  useEffect(() => {
    (async () => {
      try {
        const [prRes, uRes] = await Promise.allSettled([
          api.get("/projects/projects", { params: { active: "all" } }),
          api.get("/users"),
        ]);
        if (prRes.status === "fulfilled") {
          setProjects(prRes.value.data?.items || []);
        }
        if (uRes.status === "fulfilled") {
          const list = uRes.value.data?.users || uRes.value.data || [];
          setUsers(Array.isArray(list) ? list : []);
        }
      } catch {
        toast.error("Failed to load initial data");
      }
    })();
  }, []);

  // Load schedule data when project selected
  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      setScheduleData({ project: null, scopes: [], tasks: [], cpm: {}, variance: {} });
      return;
    }
    loadData();
  }, [selectedProjectId]);

  const loadData = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const [schedRes, projRes] = await Promise.allSettled([
        api.get(`/construction/schedule/${selectedProjectId}`),
        api.get(`/projects/projects/${selectedProjectId}`),
      ]);
      const sched = schedRes.status === "fulfilled" ? schedRes.value.data || {} : {};
      const proj = projRes.status === "fulfilled" ? projRes.value.data || {} : null;

      const finalProject = sched.project || proj || null;
      let finalScopes = [];
      if (Array.isArray(proj?.scopes) && proj.scopes.length > 0) {
        finalScopes = proj.scopes;
      } else if (Array.isArray(sched.scopes) && sched.scopes.length > 0) {
        finalScopes = sched.scopes;
      }

      const taskItems = sched.tasks || proj?.tasks || [];
      setScheduleData({
        ...sched,
        project: finalProject,
        scopes: finalScopes,
        tasks: taskItems,
      });
      setTasks(taskItems);
    } catch {
      toast.error("Failed to load timeline tasks");
    } finally {
      setLoading(false);
    }
  };

  const { project, scopes = [], cpm, variance } = scheduleData;

  // Open Tasks & Checklist/Deliverables floating modal
  const handleOpenTasksModal = (scope = null, targetTask = null) => {
    if (targetTask) {
      setFocusedTaskId(targetTask.id);
      if (scope) {
        setTasksModalScopeFilter(scope.name || scope.title || "ALL");
      }
    } else if (scope) {
      const sName = (scope.name || scope.title || "").trim().toLowerCase();
      setTasksModalScopeFilter(scope.name || scope.title || "ALL");
      const matched = tasks.filter(
        (t) =>
          (t.scope_name || "").toLowerCase() === sName ||
          (t.scope_id && scope.id && String(t.scope_id) === String(scope.id))
      );
      if (matched.length > 0) {
        setFocusedTaskId(matched[0].id);
      } else if (tasks.length > 0) {
        setFocusedTaskId(tasks[0].id);
      }
    } else {
      setTasksModalScopeFilter("ALL");
      if (tasks.length > 0) {
        setFocusedTaskId(tasks[0].id);
      }
    }
    setTasksModalOpen(true);
  };

  // Open Work Plan/WBS floating modal
  const handleOpenWorkPlanModal = (scope) => {
    setActiveScopeForWorkPlan(scope);
    setWorkPlanModalOpen(true);
  };

  // Focused Task in the Tasks Modal
  const focusedTask = useMemo(() => {
    if (!focusedTaskId) return tasks[0] || null;
    return tasks.find((t) => t.id === focusedTaskId) || tasks[0] || null;
  }, [tasks, focusedTaskId]);

  // Filtered tasks within the Tasks Modal
  const modalFilteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const term = tasksModalSearch.trim().toLowerCase();
      const matchSearch =
        !term ||
        (t.task_title || t.title || "").toLowerCase().includes(term) ||
        (t.scope_name || "").toLowerCase().includes(term) ||
        (t.wbs_code || "").toLowerCase().includes(term) ||
        (t.assigned_to_name || "").toLowerCase().includes(term);

      const matchScope =
        tasksModalScopeFilter === "ALL" ||
        (t.scope_name || "").toLowerCase() === tasksModalScopeFilter.toLowerCase();

      const matchStatus =
        tasksModalStatusFilter === "ALL" ||
        String(t.status || "").toUpperCase() === tasksModalStatusFilter;

      return matchSearch && matchScope && matchStatus;
    });
  }, [tasks, tasksModalSearch, tasksModalScopeFilter, tasksModalStatusFilter]);

  // Work plans for the active scope in the Work Plan/WBS Modal
  const activeScopeWorkPlans = useMemo(() => {
    if (!activeScopeForWorkPlan) return [];
    const list = [];
    const s = activeScopeForWorkPlan;
    const sName = (s.name || s.title || "").trim().toLowerCase();

    if (Array.isArray(s.wbs_list) && s.wbs_list.length > 0) {
      s.wbs_list.forEach((w, wi) => {
        const code = (w.wbs || w.wbs_code || `${wi + 1}.0`).trim();
        list.push({
          id: w.id || wi + 1,
          code,
          name: w.name || w.title || `Work Plan/WBS ${code}`,
          description: w.description || "",
          start_date: w.start_date || s.start_date || "",
          end_date: w.end_date || w.due_date || s.end_date || s.due_date || "",
          status: w.status || "IN_PROGRESS",
        });
      });
    } else if (s.wbs_code || s.wbs) {
      const code = (s.wbs_code || s.wbs).trim();
      list.push({
        id: 1,
        code,
        name: `Work Plan/WBS ${code}`,
        description: s.description || "",
        start_date: s.start_date || "",
        end_date: s.end_date || s.due_date || "",
        status: s.status || "IN_PROGRESS",
      });
    }

    const scopeTasks = tasks.filter(
      (t) =>
        (t.scope_name && t.scope_name.trim().toLowerCase() === sName) ||
        (t.scope_id && s.id && String(t.scope_id) === String(s.id))
    );

    scopeTasks.forEach((t) => {
      const code = (t.wbs_code || "").trim();
      if (code && !list.some((x) => x.code === code)) {
        list.push({
          id: list.length + 1,
          code,
          name: `Work Plan/WBS ${code}`,
          description: "",
          start_date: t.start_date || "",
          end_date: t.end_date || t.due_date || "",
          status: t.status || "PENDING",
        });
      }
    });

    if (list.length === 0) {
      list.push({
        id: 1,
        code: "1.0",
        name: `General Work Plan/WBS`,
        description: s.description || "Primary project execution work package",
        start_date: s.start_date || project?.start_date || "",
        end_date: s.end_date || s.due_date || project?.end_date || "",
        status: s.status || "IN_PROGRESS",
      });
    }

    return list;
  }, [activeScopeForWorkPlan, tasks, project]);

  // Toggle checklist/deliverables item
  const handleToggleChecklistItem = async (task, itemIndex) => {
    if (!task) return;
    const currentList = parseChecklist(task.task_description);
    const updated = currentList.map((item, i) =>
      i === itemIndex ? { ...item, completed: !item.completed } : item
    );

    const completedCount = updated.filter((i) => Boolean(i.completed)).length;
    const totalCount = updated.length;
    const newPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const newStatus =
      newPercent >= 100 ? "COMPLETED" : newPercent > 0 ? "IN_PROGRESS" : task.status || "PENDING";
    const jsonDescription = JSON.stringify(updated);

    const updatedTask = {
      ...task,
      task_description: jsonDescription,
      completion_percent: newPercent,
      status: newStatus,
    };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));

    try {
      await api.put(`/projects/tasks/${task.id}`, {
        task_description: jsonDescription,
        completion_percent: newPercent,
        status: newStatus,
      });
      toast.success(
        `Checklist/Deliverables updated (${completedCount}/${totalCount} completed - ${newPercent}%)`
      );
    } catch {
      toast.error("Failed to save checklist/deliverables update");
    }
  };

  // Add checklist/deliverables item
  const handleAddChecklistItem = async (task, itemText) => {
    if (!task || !itemText?.trim()) return;
    const currentList = parseChecklist(task.task_description);
    const newItem = {
      id: Date.now(),
      text: itemText.trim(),
      completed: false,
      note: "",
    };
    const updated = [...currentList, newItem];
    const completedCount = updated.filter((i) => Boolean(i.completed)).length;
    const totalCount = updated.length;
    const newPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const jsonDescription = JSON.stringify(updated);

    const updatedTask = {
      ...task,
      task_description: jsonDescription,
      completion_percent: newPercent,
    };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));
    setNewChecklistText("");

    try {
      await api.put(`/projects/tasks/${task.id}`, {
        task_description: jsonDescription,
        completion_percent: newPercent,
      });
      toast.success("Checklist/Deliverables step added");
    } catch {
      toast.error("Failed to add checklist/deliverables item");
    }
  };

  // Delete checklist/deliverables item
  const handleDeleteChecklistItem = async (task, itemIndex) => {
    if (!task) return;
    const currentList = parseChecklist(task.task_description);
    const updated = currentList.filter((_, i) => i !== itemIndex);
    const completedCount = updated.filter((i) => Boolean(i.completed)).length;
    const totalCount = updated.length;
    const newPercent =
      totalCount > 0
        ? Math.round((completedCount / totalCount) * 100)
        : Number(task.completion_percent || 0);
    const jsonDescription = JSON.stringify(updated);

    const updatedTask = {
      ...task,
      task_description: jsonDescription,
      completion_percent: newPercent,
    };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));

    try {
      await api.put(`/projects/tasks/${task.id}`, {
        task_description: jsonDescription,
        completion_percent: newPercent,
      });
      toast.info("Checklist/Deliverables step removed");
    } catch {
      toast.error("Failed to remove checklist/deliverables item");
    }
  };

  // Quick Status Change
  const handleQuickStatusChange = async (task, newStatus) => {
    if (!task) return;
    const newPercent =
      newStatus === "COMPLETED" ? 100 : newStatus === "PENDING" ? 0 : task.completion_percent;

    const updatedTask = {
      ...task,
      status: newStatus,
      completion_percent: newPercent,
    };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));

    try {
      await api.put(`/projects/tasks/${task.id}`, {
        status: newStatus,
        completion_percent: newPercent,
      });
      toast.success(`Task status changed to ${newStatus.replace("_", " ")}`);
    } catch {
      toast.error("Failed to update task status");
    }
  };

  // Open Full Task Edit Modal
  const handleOpenAdd = () => {
    const primaryScope = scopes?.[0]?.name || scopes?.[0]?.title || "";
    const primaryWbs = scopes?.[0]?.wbs_list?.[0]?.wbs || "1.1";
    setTaskForm({
      id: null,
      task_title: "",
      task_description: "",
      scope_name: primaryScope,
      wbs_code: primaryWbs,
      assigned_to_id: "",
      assigned_to_name: "",
      start_date: project?.start_date ? String(project.start_date).split("T")[0] : "",
      end_date: project?.end_date ? String(project.end_date).split("T")[0] : "",
      duration_days: 1,
      estimated_hours: 8,
      completion_percent: 0,
      status: "PENDING",
      priority: "MEDIUM",
    });
    setTaskModalOpen(true);
  };

  const handleOpenEdit = (task) => {
    setTaskForm({
      id: task.id,
      task_title: task.task_title || task.title || "",
      task_description: task.task_description || task.description || "",
      scope_name: task.scope_name || "",
      wbs_code: task.wbs_code || "",
      assigned_to_id: task.assigned_to_id || "",
      assigned_to_name: task.assigned_to_name || "",
      start_date: task.start_date ? String(task.start_date).split("T")[0] : "",
      end_date: task.end_date || task.due_date ? String(task.end_date || task.due_date).split("T")[0] : "",
      duration_days: task.duration_days || 1,
      estimated_hours: task.estimated_hours || 8,
      completion_percent: task.completion_percent || 0,
      status: task.status || "PENDING",
      priority: task.priority || "MEDIUM",
    });
    setTaskModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    if (!taskForm.task_title.trim()) {
      toast.warning("Task name is required");
      return;
    }
    setSavingTask(true);
    try {
      const payload = {
        ...taskForm,
        project_id: selectedProjectId,
      };

      if (taskForm.id) {
        await api.put(`/projects/tasks/${taskForm.id}`, payload);
        toast.success("Task schedule and project work plan/wbs updated");
      } else {
        await api.post(`/projects/tasks`, payload);
        toast.success("Task added to project timeline and work plan/wbs");
      }
      setTaskModalOpen(false);
      await loadData();
    } catch {
      toast.error("Failed to save task timeline update");
    } finally {
      setSavingTask(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5">
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock size={24} className="text-brand-900 dark:text-brand-400" />
              Project Timeline
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 hidden">
              Master project schedule, overall duration, Project Work Plan/WBS, and Scopes
            </p>
          </div>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="input text-sm h-10 rounded-xl min-w-[260px] font-medium"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">— Select a project —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_code ? `${p.project_code} - ` : ""}
                {p.project_name || p.name}
              </option>
            ))}
          </select>
          
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="card p-12 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <CalendarDays size={48} className="mx-auto text-slate-300 dark:text-slate-600" />
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">No Project Selected</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Please choose a project from the dropdown above to view its master timeline, work breakdown structure, and schedule specification.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Specification & Scope Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Project Schedule Spec Card */}
            <div className="lg:col-span-5 card p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Info size={16} className="text-brand-600" /> Project Schedule Specification
              </h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                {[
                  ["Project Name", project?.project_name || "—"],
                  ["Project Code", project?.project_code || "—"],
                  ["Project Manager", project?.manager_name || "—"],
                  ["Working Calendar", "6-Day (Mon – Sat)"],
                  ["Planned Start", project?.start_date ? String(project.start_date).split("T")[0] : "—"],
                  ["Target Completion", project?.end_date ? String(project.end_date).split("T")[0] : "—"],
                  ["Forecast Completion", cpm?.forecastCompletionDate || "Pending CPM"],
                  ["Schedule Status", (variance?.scheduleVarianceDays || 0) >= 0 ? "On Track" : "Delayed"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-slate-400 block mb-0.5">{label}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{val}</span>
                  </div>
                ))}
              </div>
              {/* Overall progress bar */}
              <div className="pt-2">
                <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300">Overall Physical Completion</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">
                    {variance?.actualProgress || 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, variance?.actualProgress || 0))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Project Scope & Project Work Plan/WBS Breakdown Card */}
            <div className="lg:col-span-7 card p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers size={16} className="text-brand-600" />
                    Project Scope &amp; Project Work Plan/WBS Breakdown ({scopes?.length || 0})
                  </h2>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenTasksModal(null)}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      <ListTodo size={13} />
                      View All Tasks ({tasks.length})
                    </button>
                    <Link
                      to={`/project-management/projects/${selectedProjectId}`}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-semibold"
                    >
                      Manage Scopes →
                    </Link>
                  </div>
                </div>

                {!scopes?.length ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">
                    No Project Scopes defined yet. Scopes configured on the project page will display their project work plans/wbs and linked timelines here.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 mt-3">
                    {scopes.map((s, sIdx) => {
                      const wbsCount = s.wbs_list?.length || (s.wbs_code ? 1 : 0);
                      const sName = (s.name || s.title || "").trim().toLowerCase();
                      const scopeTasks = tasks.filter(
                        (t) =>
                          (t.scope_name || "").trim().toLowerCase() === sName ||
                          (t.scope_id && s.id && String(t.scope_id) === String(s.id))
                      );
                      const scopeStatus = computeScopeStatus(s, scopeTasks);

                      return (
                        <div
                          key={s.id || sIdx}
                          className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors shadow-2xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-brand-500" />
                                {s.name || s.title || `Scope #${sIdx + 1}`}
                              </span>
                              {/* Scope Status Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge(
                                  scopeStatus
                                )}`}
                              >
                                {scopeStatus.replace("_", " ")}
                              </span>
                            </div>
                            {s.description && (
                              <p className="text-[11px] text-slate-500 truncate max-w-sm">
                                {s.description}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-[11px]">
                            {/* Work Plan/WBS floating modal trigger */}
                            <button
                              type="button"
                              onClick={() => handleOpenWorkPlanModal(s)}
                              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 hover:border-brand-500 hover:text-brand-600 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5 group active:scale-95"
                              title={`Click to view work plans/wbs for ${s.name || s.title}`}
                            >
                              <Layers size={13} className="text-brand-600 group-hover:scale-110 transition-transform" />
                              <span>{wbsCount} {wbsCount === 1 ? "Work Plan/WBS" : "Work Plans/WBS"}</span>
                            </button>

                            {/* Task & Checklist/Deliverables floating modal trigger */}
                            <button
                              type="button"
                              onClick={() => handleOpenTasksModal(s)}
                              className="px-2.5 py-1.5 rounded-lg bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800 font-semibold hover:bg-brand-100 dark:hover:bg-brand-900 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1.5 group active:scale-95"
                              title={`Click to view tasks & checklists/deliverables for ${s.name || s.title}`}
                            >
                              <CheckCircle2 size={13} className="text-brand-600 group-hover:scale-110 transition-transform" />
                              <span>{scopeTasks.length} {scopeTasks.length === 1 ? "Task" : "Tasks"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Add Task button at bottom of card */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Select a work plan/wbs or task pill to review details and checklists/deliverables</span>
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="btn btn-secondary text-sm px-2.5 py-1 rounded-lg inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300"
                >
                  <Plus size={13} /> Add Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Modal 1: Work Plans/WBS Floating Modal */}
      {workPlanModalOpen && activeScopeForWorkPlan && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setWorkPlanModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-600">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Scope Work Plans/WBS
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                    {activeScopeForWorkPlan.name || activeScopeForWorkPlan.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWorkPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scope Overview Bar */}
            <div className="px-6 py-3 bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Scope Status:</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge(
                    computeScopeStatus(
                      activeScopeForWorkPlan,
                      tasks.filter(
                        (t) =>
                          (t.scope_name || "").toLowerCase() ===
                          (activeScopeForWorkPlan.name || activeScopeForWorkPlan.title || "").toLowerCase()
                      )
                    )
                  )}`}
                >
                  {computeScopeStatus(
                    activeScopeForWorkPlan,
                    tasks.filter(
                      (t) =>
                        (t.scope_name || "").toLowerCase() ===
                        (activeScopeForWorkPlan.name || activeScopeForWorkPlan.title || "").toLowerCase()
                    )
                  ).replace("_", " ")}
                </span>
              </div>
              <div className="text-slate-500 font-medium">
                {activeScopeWorkPlans.length} Work {activeScopeWorkPlans.length === 1 ? "Plan" : "Plans"} Configured
              </div>
            </div>

            {/* Modal Body: List of Work Plans/WBS */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {activeScopeWorkPlans.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No work plans/wbs configured for this scope yet.
                </div>
              ) : (
                activeScopeWorkPlans.map((wp, wpIdx) => {
                  const sName = (activeScopeForWorkPlan.name || activeScopeForWorkPlan.title || "").toLowerCase();
                  const wpTasks = tasks.filter((t) => {
                    const matchScope = (t.scope_name || "").toLowerCase() === sName;
                    const matchWbs = (t.wbs_code || "").trim() === wp.code.trim();
                    return matchScope && matchWbs;
                  });

                  return (
                    <div
                      key={wp.id || wpIdx}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800 font-bold text-xs">
                              WBS {wp.code}
                            </span>
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                              {wp.name}
                            </h4>
                          </div>
                          {wp.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {wp.description}
                            </p>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadge(
                            wp.status
                          )}`}
                        >
                          {wp.status}
                        </span>
                      </div>

                      {/* Dates & Timeline info */}
                      <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          {wp.start_date ? String(wp.start_date).split("T")[0] : "—"} →{" "}
                          {wp.end_date ? String(wp.end_date).split("T")[0] : "—"}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {wpTasks.length} {wpTasks.length === 1 ? "Task" : "Tasks"} assigned
                        </span>
                      </div>

                      {/* Tasks under this work plan/wbs */}
                      {wpTasks.length > 0 && (
                        <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[11px] font-semibold uppercase text-slate-400 block mb-1">
                            Linked Tasks:
                          </span>
                          {wpTasks.map((t) => (
                            <div
                              key={t.id}
                              className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                                  {t.task_title || t.title}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {t.assigned_to_name || "Unassigned"} • {t.completion_percent || 0}% progress
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setWorkPlanModalOpen(false);
                                  handleOpenTasksModal(activeScopeForWorkPlan, t);
                                }}
                                className="btn btn-secondary text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 font-semibold shrink-0"
                              >
                                View Task &amp; Checklist/Deliverables →
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
              <Link
                to={`/project-management/projects/${selectedProjectId}`}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold"
              >
                Edit Work Plans/WBS in Project Details →
              </Link>
              <button
                type="button"
                onClick={() => setWorkPlanModalOpen(false)}
                className="btn btn-secondary text-xs px-4 py-1.5 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Modal 2: Tasks & Work Plan/WBS Checklists/Deliverables Floating Modal */}
      {tasksModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setTasksModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl h-[88vh] shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-600">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Project Tasks &amp; Work Plan/WBS Checklists/Deliverables
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {project?.project_code ? `${project.project_code} — ` : ""}
                    {project?.project_name || "Project Tasks"} • {tasks.length} Total Tasks
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="btn btn-primary text-sm px-3 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1 shadow-sm"
                >
                  <Plus size={14} /> Add Task
                </button>
                <button
                  type="button"
                  onClick={() => setTasksModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Filter and Search Bar across top */}
            <div className="px-6 py-2.5 bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search tasks, work plans/wbs..."
                    className="input pl-8 py-1.5 text-sm h-8 rounded-lg w-full font-medium"
                    value={tasksModalSearch}
                    onChange={(e) => setTasksModalSearch(e.target.value)}
                  />
                </div>

                {/* Scope selector */}
                <select
                  className="input text-sm h-8 rounded-lg font-medium"
                  value={tasksModalScopeFilter}
                  onChange={(e) => setTasksModalScopeFilter(e.target.value)}
                >
                  <option value="ALL">All Scopes</option>
                  {scopes.map((s, idx) => {
                    const name = s.name || s.title || `Scope #${idx + 1}`;
                    return <option key={idx} value={name}>{name}</option>;
                  })}
                </select>
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-1">
                {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setTasksModalStatusFilter(st)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      tasksModalStatusFilter === st
                        ? "bg-brand-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {st === "ALL" ? "All Statuses" : st.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Two-Column Body: Master List (Left) & Focus Task + Checklist/Deliverables (Right) */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: All Tasks Master List */}
              <div className="w-80 md:w-96 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/40 dark:bg-slate-900/40 shrink-0">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 flex items-center justify-between">
                  <span>Tasks ({modalFilteredTasks.length})</span>
                  <span className="text-[11px] text-slate-400">Select to focus checklist/deliverables</span>
                </div>

                <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
                  {modalFilteredTasks.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No tasks found matching your filter criteria.
                    </div>
                  ) : (
                    modalFilteredTasks.map((t) => {
                      const isFocused = focusedTask?.id === t.id;
                      const clItems = parseChecklist(t.task_description);
                      const clDone = clItems.filter((i) => i.completed).length;

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setFocusedTaskId(t.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                            isFocused
                              ? "bg-white dark:bg-slate-800 border-brand-500 dark:border-brand-500 shadow-sm ring-1 ring-brand-500/20"
                              : "bg-white/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 w-full">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                              {t.task_title || t.title}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${statusBadge(
                                t.status
                              )}`}
                            >
                              {t.status || "PENDING"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                            <span className="px-1.5 py-0.2 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-semibold border border-brand-200/70 dark:border-brand-800">
                              WBS {t.wbs_code || "1.0"}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                              {t.scope_name || "General"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <span className="flex items-center gap-1">
                              <User size={11} className="text-slate-400" />
                              {t.assigned_to_name || "Unassigned"}
                            </span>
                            <span className="font-semibold text-slate-600 dark:text-slate-300">
                              {clItems.length > 0 ? `☑ ${clDone}/${clItems.length}` : `${t.completion_percent || 0}%`}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Focused Task & Interactive Checklist/Deliverables */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-slate-900">
                {!focusedTask ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 text-slate-400 space-y-2">
                    <ListTodo size={40} className="text-slate-300" />
                    <p className="text-sm font-semibold">No Task Selected</p>
                    <p className="text-xs">Click a task from the list on the left to review its work plan/wbs &amp; checklists/deliverables.</p>
                  </div>
                ) : (
                  <>
                    {/* Task Title & Work Plan/WBS Banner */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800 font-bold text-xs">
                              Work Plan/WBS: {focusedTask.wbs_code || "1.0"}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              Scope: {focusedTask.scope_name || "General Scope"}
                            </span>
                          </div>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                            {focusedTask.task_title || focusedTask.title}
                          </h2>
                        </div>

                        {/* Quick Status Dropdown */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-medium">Status:</span>
                          <select
                            className="input text-xs h-8 rounded-lg font-bold uppercase"
                            value={focusedTask.status || "PENDING"}
                            onChange={(e) => handleQuickStatusChange(focusedTask, e.target.value)}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="DELAYED">Delayed</option>
                            <option value="ON_HOLD">On Hold</option>
                          </select>
                        </div>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-200/70 dark:border-slate-800">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Assignee</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <User size={13} className="text-slate-400" />
                            {focusedTask.assigned_to_name || "Unassigned"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Timeline Dates</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {focusedTask.start_date ? String(focusedTask.start_date).split("T")[0] : "—"} →{" "}
                            {focusedTask.end_date || focusedTask.due_date
                              ? String(focusedTask.end_date || focusedTask.due_date).split("T")[0]
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Est. Duration</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {focusedTask.duration_days || 1} Days ({focusedTask.estimated_hours || 8} hrs)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Overall Completion</span>
                          <span className="font-bold text-brand-600 dark:text-brand-400">
                            {focusedTask.completion_percent || 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Checklist/Deliverables Section */}
                    {(() => {
                      const clItems = parseChecklist(focusedTask.task_description);
                      const doneCount = clItems.filter((i) => i.completed).length;
                      const clPercent = clItems.length > 0 ? Math.round((doneCount / clItems.length) * 100) : 0;

                      return (
                        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <CheckSquare size={18} className="text-brand-600" />
                              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                Task Checklist/Deliverables &amp; Checkpoints
                              </h3>
                            </div>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {doneCount} of {clItems.length} Done ({clPercent}%)
                            </span>
                          </div>

                          {/* Checklist/Deliverables Progress Bar */}
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-brand-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${clPercent}%` }}
                            />
                          </div>

                          {/* Add Checklist/Deliverables Item Form */}
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleAddChecklistItem(focusedTask, newChecklistText);
                            }}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="text"
                              placeholder="Add a new checklist step / milestone..."
                              className="input flex-1 text-sm h-9 rounded-xl font-medium"
                              value={newChecklistText}
                              onChange={(e) => setNewChecklistText(e.target.value)}
                            />
                            <button
                              type="submit"
                              disabled={!newChecklistText.trim()}
                              className="btn btn-primary text-sm px-3.5 py-1.5 h-9 rounded-xl font-semibold inline-flex items-center gap-1 shadow-sm shrink-0"
                            >
                              <Plus size={14} /> Add Step
                            </button>
                          </form>

                          {/* Checklist/Deliverables Items List */}
                          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                            {clItems.length === 0 ? (
                              <div className="p-6 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                No checklist/deliverables checkpoints defined for this task yet. Use the input above to add steps.
                              </div>
                            ) : (
                              clItems.map((item, idx) => (
                                <div
                                  key={item.id || idx}
                                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                    item.completed
                                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40"
                                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleToggleChecklistItem(focusedTask, idx)}
                                    className="flex items-center gap-3 text-left flex-1 cursor-pointer group"
                                  >
                                    <div
                                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                        item.completed
                                          ? "bg-emerald-600 text-white shadow-xs"
                                          : "border border-slate-300 dark:border-slate-600 group-hover:border-brand-500"
                                      }`}
                                    >
                                      {item.completed && <Check size={13} strokeWidth={3} />}
                                    </div>
                                    <span
                                      className={`text-xs font-semibold select-none ${
                                        item.completed
                                          ? "line-through text-slate-400 dark:text-slate-500"
                                          : "text-slate-800 dark:text-slate-200 group-hover:text-brand-600"
                                      }`}
                                    >
                                      {item.text}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteChecklistItem(focusedTask, idx)}
                                    className="text-slate-300 hover:text-rose-500 p-1 rounded-md transition-colors"
                                    title="Delete checklist step"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Bottom Actions for Focused Task */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(focusedTask)}
                        className="btn btn-secondary text-xs px-3.5 py-1.5 rounded-xl font-semibold inline-flex items-center gap-1.5"
                      >
                        <Edit2 size={13} /> Edit Full Task Schedule
                      </button>
                      <button
                        type="button"
                        onClick={() => setTasksModalOpen(false)}
                        className="btn btn-secondary text-xs px-4 py-1.5 rounded-xl"
                      >
                        Done
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Task Scope, WBS & Schedule Edit Modal */}
      {taskModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setTaskModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={18} className="text-brand-600" />
                {taskForm.id ? "Edit Task Timeline & Work Plan/WBS" : "Add Task to Scope & Timeline"}
              </h3>
              <button
                type="button"
                onClick={() => setTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              {/* Task Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                  Task Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Excavate foundation trench"
                  className="input w-full text-sm font-medium"
                  value={taskForm.task_title}
                  onChange={(e) => setTaskForm({ ...taskForm, task_title: e.target.value })}
                />
              </div>

              {/* Scope & WBS Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Project Scope
                  </label>
                  <select
                    className="input w-full text-sm font-medium"
                    value={taskForm.scope_name}
                    onChange={(e) => {
                      const scopeVal = e.target.value;
                      const matchedScope = scopes.find((s) => (s.name || s.title) === scopeVal);
                      const defaultWbs =
                        matchedScope?.wbs_list?.[0]?.wbs || matchedScope?.wbs || taskForm.wbs_code;
                      setTaskForm({
                        ...taskForm,
                        scope_name: scopeVal,
                        wbs_code: defaultWbs,
                      });
                    }}
                  >
                    <option value="">General Scope</option>
                    {scopes.map((s, idx) => {
                      const name = s.name || s.title || `Scope #${idx + 1}`;
                      return <option key={idx} value={name}>{name}</option>;
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Project Work Plan/WBS
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1.1 Foundation"
                    className="input w-full text-sm font-semibold"
                    value={taskForm.wbs_code}
                    onChange={(e) => setTaskForm({ ...taskForm, wbs_code: e.target.value })}
                  />
                </div>
              </div>

              {/* Assignee & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Assignee
                  </label>
                  <select
                    className="input w-full text-sm font-medium"
                    value={taskForm.assigned_to_id}
                    onChange={(e) => {
                      const uId = e.target.value;
                      const u = users.find((x) => String(x.id) === String(uId));
                      const uName = u ? u.full_name || u.username : "";
                      setTaskForm({
                        ...taskForm,
                        assigned_to_id: uId,
                        assigned_to_name: uName,
                        status: uId && taskForm.status === "PENDING" ? "IN_PROGRESS" : taskForm.status,
                      });
                    }}
                  >
                    <option value="">-- Unassigned --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Status
                  </label>
                  <select
                    className="input w-full text-sm font-medium"
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DELAYED">Delayed</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>
              </div>

              {/* Start Date, Due Date, Duration */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="input w-full text-sm font-medium"
                    value={taskForm.start_date}
                    onChange={(e) => setTaskForm({ ...taskForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    className="input w-full text-sm font-medium"
                    value={taskForm.end_date}
                    onChange={(e) => setTaskForm({ ...taskForm, end_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                    Est. Duration
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="input w-full text-sm font-semibold"
                    value={taskForm.duration_days}
                    onChange={(e) => setTaskForm({ ...taskForm, duration_days: e.target.value })}
                  />
                </div>
              </div>

              {/* Progress Slider */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Progress Completion</span>
                  <span>{taskForm.completion_percent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className="w-full accent-brand-600"
                  value={taskForm.completion_percent}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setTaskForm({
                      ...taskForm,
                      completion_percent: p,
                      status: p >= 100 ? "COMPLETED" : p > 0 ? "IN_PROGRESS" : taskForm.status,
                    });
                  }}
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="btn btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="btn btn-primary text-sm px-4 py-2 font-semibold inline-flex items-center gap-1.5 shadow-sm"
                >
                  {savingTask ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Task Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
