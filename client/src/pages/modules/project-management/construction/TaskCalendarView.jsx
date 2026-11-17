/**
 * @file TaskCalendarView.jsx
 * @description OmniSuite ERP — Independent Task Calendar & Team Scheduling Workspace.
 * Comprehensive task scheduling, employee coordination, and team calendar management tool.
 * Reads directly from existing pm_tasks records with full dependency awareness.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Users,
  Search,
  Filter,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Flag,
  RefreshCw,
  Building2,
  Briefcase,
  Layers,
  ExternalLink,
  Loader2,
  ShieldAlert,
  Zap,
  Lock,
  List,
  CalendarDays,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { useAuth } from "../../../../auth/AuthContext.jsx";
import { toast } from "react-toastify";

export default function TaskCalendarView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Mode & View State ──
  // Modes: "MY_CALENDAR" | "TEAM_CALENDAR" | "PROJECT_CALENDAR" | "DEPT_CALENDAR"
  const urlMode = searchParams.get("mode");
  const [calendarMode, setCalendarMode] = useState(
    urlMode && ["MY_CALENDAR", "TEAM_CALENDAR", "PROJECT_CALENDAR", "DEPT_CALENDAR"].includes(urlMode)
      ? urlMode
      : "MY_CALENDAR"
  );
  // Views: "month" | "week" | "day" | "agenda"
  const [viewMode, setViewMode] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  // ── Filters ──
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("projectId") || "");
  const [users, setUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Sync mode and filters from URL parameters when navigating
  useEffect(() => {
    const m = searchParams.get("mode");
    if (m && ["MY_CALENDAR", "TEAM_CALENDAR", "PROJECT_CALENDAR", "DEPT_CALENDAR"].includes(m)) {
      setCalendarMode(m);
    }
    const pid = searchParams.get("projectId");
    if (pid !== null && pid !== undefined) {
      setSelectedProjectId(pid);
    }
    const emp = searchParams.get("assignedTo") || searchParams.get("employeeId");
    if (emp) {
      setSelectedEmployeeId(emp);
    }
  }, [searchParams]);

  // ── Tasks Data ──
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Task Details / Quick Action Modal ──
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetailsModalOpen, setTaskDetailsModalOpen] = useState(false);
  const [quickReschedule, setQuickReschedule] = useState({ startDate: "", endDate: "" });
  const [savingReschedule, setSavingReschedule] = useState(false);

  // ── New Task Modal ──
  const [newTaskModalOpen, setNewTaskModalOpen] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskForm, setNewTaskForm] = useState({
    task_title: "",
    project_id: "",
    assigned_to_id: "",
    start_date: "",
    end_date: "",
    duration_days: 1,
    priority: "MEDIUM",
    status: "PENDING",
  });
  const [savingNewTask, setSavingNewTask] = useState(false);

  // ── Day Details Popover (when clicking "+N more") ──
  const [dayPopover, setDayPopover] = useState(null); // { dateStr, tasks: [] }

  // ── 1. Load Projects & Users ──
  useEffect(() => {
    (async () => {
      try {
        const [pRes, uRes] = await Promise.all([
          api.get("/projects/projects", { params: { active: "all" } })
            .catch(() => api.get("/projects", { params: { active: "all" } }))
            .catch(() => ({ data: { items: [] } })),
          api.get("/admin/users")
            .catch(() => api.get("/users"))
            .catch(() => ({ data: { data: { items: [] } } })),
        ]);
        const pList = pRes?.data?.items || pRes?.data?.data?.items || (Array.isArray(pRes?.data) ? pRes.data : []);
        setProjects(Array.isArray(pList) ? pList : []);
        const uList = uRes?.data?.data?.items || uRes?.data?.items || uRes?.data?.users || (Array.isArray(uRes?.data) ? uRes.data : []);
        setUsers(Array.isArray(uList) ? uList : []);
      } catch (err) {
        console.warn("TaskCalendarView: Non-critical master data load notice:", err);
      }
    })();
  }, []);

  // ── 2. Load Tasks Based on Mode & Filters ──
  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = { active: "all" };

      if (selectedProjectId) {
        params.project_id = selectedProjectId;
      }

      const assignedParam = searchParams.get("assignedTo") || searchParams.get("employeeId");
      if (calendarMode === "MY_CALENDAR") {
        if (assignedParam) {
          params.assigned_to_id = assignedParam;
        } else if (user?.id) {
          params.assigned_to_id = user.id;
        }
      } else if (calendarMode === "TEAM_CALENDAR" && selectedEmployeeId) {
        params.assigned_to_id = selectedEmployeeId;
      }

      const res = await api.get("/projects/tasks", { params });
      let items = res.data?.items || res.data?.tasks || [];
      if (Array.isArray(items)) {
        if (selectedProjectId) {
          try {
            const mRes = await api.get(`/construction/projects/${selectedProjectId}/milestones`);
            const confirmedMs = mRes.data?.confirmed || [];
            const msItems = confirmedMs.map((m) => ({
              id: `milestone-${m.id}`,
              task_title: `◆ ${m.title}`,
              title: `◆ ${m.title}`,
              start_date: (m.target_date || m.due_date ? String(m.target_date || m.due_date).split("T")[0] : ""),
              due_date: (m.target_date || m.due_date ? String(m.target_date || m.due_date).split("T")[0] : ""),
              end_date: (m.target_date || m.due_date ? String(m.target_date || m.due_date).split("T")[0] : ""),
              status: m.live_status || m.status || "PENDING",
              priority: "HIGH",
              milestone_flag: 1,
              is_milestone: true,
              wbs_code: "MILESTONE",
              assigned_to_name: m.responsible_owner_name || "Project Owner",
              project_name: m.project_name || "Project Milestone",
              completion_percent: m.progress_percent || (m.live_status === "ACHIEVED" ? 100 : 0)
            }));
            items = [...items, ...msItems];
          } catch {}
        }

        // Strict Assignee Filtering when in MY_CALENDAR mode:
        if (calendarMode === "MY_CALENDAR") {
          const effectiveUserId = assignedParam || user?.id;
          const effectiveUsername = String(user?.username || "").toLowerCase();
          items = items.filter((t) => {
            const matchId = effectiveUserId && (
              String(t.assigned_to_id) === String(effectiveUserId) ||
              String(t.assigned_to) === String(effectiveUserId) ||
              String(t.responsible_member_id) === String(effectiveUserId)
            );
            const matchName = effectiveUsername && (
              String(t.assigned_to_name || "").toLowerCase() === effectiveUsername ||
              String(t.assigned_to || "").toLowerCase() === effectiveUsername ||
              String(t.responsible_member || "").toLowerCase() === effectiveUsername
            );
            return matchId || matchName;
          });
        }

        // Also dynamically populate distinct projects from tasks if not already present
        if (items.length > 0) {
          setProjects((prev) => {
            const existing = new Set((prev || []).map((p) => String(p.id)));
            const additions = [];
            items.forEach((t) => {
              if (t.project_id && !existing.has(String(t.project_id))) {
                existing.add(String(t.project_id));
                additions.push({
                  id: t.project_id,
                  project_code: t.project_code || `PRJ-${t.project_id}`,
                  project_name: t.project_name || `Project ${t.project_id}`,
                });
              }
            });
            return additions.length > 0 ? [...(prev || []), ...additions] : prev;
          });
        }

        setTasks(items);
      }
    } catch {
      toast.error("Failed to load calendar tasks");
    } finally {
      setLoading(false);
    }
  }, [calendarMode, selectedProjectId, selectedEmployeeId, user?.id, user?.username, searchParams]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ── Departments list derived from users ──
  const departments = useMemo(() => {
    const set = new Set();
    users.forEach((u) => {
      if (u.department) set.add(u.department);
      if (u.department_name) set.add(u.department_name);
    });
    return Array.from(set);
  }, [users]);

  // ── Filtered Tasks ──
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const title = t.task_title || t.title || "";
      const proj = t.project_name || "";
      const owner = t.assigned_to_name || "";

      const matchSearch =
        !searchTerm.trim() ||
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        proj.toLowerCase().includes(searchTerm.toLowerCase()) ||
        owner.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchPriority = priorityFilter === "ALL" || t.priority === priorityFilter;

      // Department filter
      let matchDept = true;
      if (selectedDepartment !== "ALL") {
        const u = users.find((x) => String(x.id) === String(t.assigned_to_id));
        const uDept = u?.department || u?.department_name || "";
        matchDept = uDept === selectedDepartment;
      }

      return matchSearch && matchStatus && matchPriority && matchDept;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, selectedDepartment, users]);

  // ── Workload & Capacity Metrics ──
  const workloadStats = useMemo(() => {
    const empMap = new Map();
    filteredTasks.forEach((t) => {
      const empId = t.assigned_to_id || 0;
      const empName = t.assigned_to_name || "Unassigned";
      if (!empMap.has(empId)) {
        empMap.set(empId, { id: empId, name: empName, active: 0, completed: 0, overdue: 0 });
      }
      const record = empMap.get(empId);
      if (t.status === "COMPLETED" || Number(t.completion_percent || 0) >= 100) {
        record.completed++;
      } else {
        record.active++;
        if (t.due_status === "OVERDUE") {
          record.overdue++;
        }
      }
    });
    return Array.from(empMap.values());
  }, [filteredTasks]);

  // ── Navigation Date Helpers ──
  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() - 1);
    else if (viewMode === "week") d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === "day") d.setDate(d.getDate() + 1);
    else if (viewMode === "week") d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // ── Open Task Details Modal ──
  const handleOpenTaskDetails = (task) => {
    setSelectedTask(task);
    setQuickReschedule({
      startDate: task.start_date ? String(task.start_date).split("T")[0] : "",
      endDate: task.end_date ? String(task.end_date).split("T")[0] : "",
    });
    setTaskDetailsModalOpen(true);
  };

  // Quick Reschedule Save
  const handleSaveReschedule = async () => {
    if (!selectedTask) return;
    setSavingReschedule(true);
    try {
      await api.put(`/projects/tasks/${selectedTask.id}`, {
        start_date: quickReschedule.startDate,
        end_date: quickReschedule.endDate,
      });
      toast.success("Task rescheduled successfully");
      setTaskDetailsModalOpen(false);
      await loadTasks();
    } catch {
      toast.error("Failed to reschedule task");
    } finally {
      setSavingReschedule(false);
    }
  };

  // ── Open New Task Modal for specific date ──
  const handleOpenCreateOnDate = (dateStr) => {
    setNewTaskDate(dateStr);
    setNewTaskForm({
      task_title: "",
      project_id: selectedProjectId || (projects[0]?.id ? String(projects[0].id) : ""),
      assigned_to_id: calendarMode === "MY_CALENDAR" && user?.id ? String(user.id) : "",
      start_date: dateStr,
      end_date: dateStr,
      duration_days: 1,
      priority: "MEDIUM",
      status: "PENDING",
    });
    setNewTaskModalOpen(true);
  };

  const handleSaveNewTask = async (e) => {
    e.preventDefault();
    if (!newTaskForm.task_title.trim() || !newTaskForm.project_id) {
      toast.warning("Task name and Project are required");
      return;
    }
    setSavingNewTask(true);
    try {
      await api.post("/projects/tasks", newTaskForm);
      toast.success("Task created on schedule");
      setNewTaskModalOpen(false);
      await loadTasks();
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSavingNewTask(false);
    }
  };

  // ── Helper to check if task falls on a specific date ──
  const getTasksForDate = useCallback(
    (dateStr) => {
      return filteredTasks.filter((t) => {
        const s = t.start_date ? String(t.start_date).split("T")[0] : "";
        const e = t.end_date ? String(t.end_date).split("T")[0] : s;
        if (!s && !e) return false;
        if (s && !e) return dateStr === s;
        return dateStr >= s && dateStr <= e;
      });
    },
    [filteredTasks],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── 1. Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5 h-10 px-3 rounded-xl">
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CalendarIcon size={24} className="text-brand-900 dark:text-brand-400" />
                Task Calendar
              </h1>
              {calendarMode === "MY_CALENDAR" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                  <User size={11} /> My Assigned Tasks
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {calendarMode === "MY_CALENDAR"
                ? "Viewing tasks assigned exclusively to your schedule and execution log"
                : "Task scheduling, employee coordination, deadlines and team workload management"}
            </p>
          </div>
        </div>

        {/* Global actions: Add Task & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCreateOnDate(new Date().toISOString().split("T")[0])}
            className="btn btn-primary text-xs h-10 px-4 rounded-xl inline-flex items-center gap-1.5 font-semibold shadow-sm"
          >
            <Plus size={14} /> Add Task
          </button>
          <button
            onClick={loadTasks}
            className="btn btn-secondary h-10 px-3 rounded-xl inline-flex items-center gap-1.5 shrink-0"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline text-xs font-semibold">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── 2. Mode Selector Pill Bar ── */}
      <div className="card p-1.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center overflow-x-auto gap-1">
          {[
            { id: "MY_CALENDAR", label: "My Calendar", icon: User },
            { id: "TEAM_CALENDAR", label: "Team Calendar", icon: Users },
            { id: "PROJECT_CALENDAR", label: "Project Calendar", icon: Briefcase },
            { id: "DEPT_CALENDAR", label: "Department View", icon: Building2 },
          ].map((mode) => {
            const Icon = mode.icon;
            const active = calendarMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => setCalendarMode(mode.id)}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  active
                    ? "bg-brand-900 dark:bg-brand-700 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={14} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Controls & Filter Toolbar ── */}
      <div className="card p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
        {/* Row 1: Date Navigation, View Selector & Current Month/Week */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="btn btn-secondary h-9 w-9 p-0 rounded-xl flex items-center justify-center"
              title="Previous"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleToday}
              className="btn btn-secondary text-xs font-semibold h-9 px-3 rounded-xl"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="btn btn-secondary h-9 w-9 p-0 rounded-xl flex items-center justify-center"
              title="Next"
            >
              <ChevronRight size={16} />
            </button>

            {/* Current Period Display */}
            <h2 className="text-base font-bold text-slate-900 dark:text-white ml-2">
              {currentDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
                day: viewMode === "day" ? "numeric" : undefined,
              })}
            </h2>
          </div>

          {/* View Mode Toggle: Month / Week / Day / Agenda */}
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800/80">
            {[
              { id: "month", label: "Month" },
              { id: "week", label: "Week" },
              { id: "day", label: "Day" },
              { id: "agenda", label: "Agenda" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                  viewMode === v.id
                    ? "bg-white dark:bg-slate-900 text-brand-900 dark:text-white shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters (Clean Horizontal Layout in Single Row) */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 w-full overflow-x-auto scrollbar-none">
          {/* Search */}
          <div className="relative w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            <input
              type="text"
              placeholder="Search tasks, project, owner..."
              className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Project Filter */}
          <div className="w-56 shrink-0">
            <select
              className="w-full h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer truncate"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code ? `${p.project_code} - ` : ""}{p.project_name || p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-40 shrink-0">
            <select
              className="w-full h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="DELAYED">Delayed</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>

          {/* Employee Filter (Shown only in Team Calendar mode) */}
          {calendarMode === "TEAM_CALENDAR" && (
            <div className="w-48 shrink-0">
              <select
                className="w-full h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                <option value="">All Team Members</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                ))}
              </select>
            </div>
          )}

          {/* Department Filter (Shown in Dept View mode) */}
          {calendarMode === "DEPT_CALENDAR" && (
            <div className="w-44 shrink-0">
              <select
                className="w-full h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Task count summary */}
          <div className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap pl-2">
            {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"} scheduled
          </div>
        </div>
      </div>

      {/* ── 4. Workload Summary Mini-Panel (if in Team Mode) ── */}
      {calendarMode === "TEAM_CALENDAR" && workloadStats.length > 0 && (
        <div className="card p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
            <Users size={14} className="text-brand-600" />
            <span>Team Workload Distribution &amp; Capacity</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {workloadStats.map((emp) => (
              <div
                key={emp.id}
                className={`p-2 rounded-xl border text-xs ${
                  emp.overdue > 0
                    ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800"
                    : emp.active >= 5
                    ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="font-bold truncate text-slate-800 dark:text-slate-200">{emp.name}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1 font-mono">
                  <span>{emp.active} active</span>
                  {emp.overdue > 0 && <span className="text-rose-600 font-bold">{emp.overdue} late</span>}
                  <span className="text-emerald-600">{emp.completed} done</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Main Calendar Body by View Mode ── */}

      {/* ── A. MONTH VIEW ── */}
      {viewMode === "month" && (() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        const cells = [];

        // Previous month days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
          const d = new Date(year, month - 1, daysInPrevMonth - i);
          cells.push({ day: daysInPrevMonth - i, isCurrent: false, date: d });
        }
        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
          const d = new Date(year, month, i);
          cells.push({ day: i, isCurrent: true, date: d });
        }
        // Next month padding days
        const totalCells = Math.ceil(cells.length / 7) * 7;
        for (let i = 1; i <= totalCells - cells.length; i++) {
          const d = new Date(year, month + 1, i);
          cells.push({ day: i, isCurrent: false, date: d });
        }

        const todayStr = new Date().toISOString().split("T")[0];

        return (
          <div className="card overflow-hidden border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-500 py-2.5 bg-slate-50 dark:bg-slate-800/60">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80">
              {cells.map((cell, idx) => {
                const dateStr = cell.date.toISOString().split("T")[0];
                const isToday = dateStr === todayStr;
                const dayTasks = getTasksForDate(dateStr);

                return (
                  <div
                    key={idx}
                    className={`min-h-[120px] p-1.5 flex flex-col group transition ${
                      !cell.isCurrent
                        ? "bg-slate-50/40 dark:bg-slate-900/30 text-slate-400"
                        : "bg-white dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    {/* Date Number & Quick Add */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`inline-flex items-center justify-center text-xs font-mono font-bold w-6 h-6 rounded-full ${
                          isToday
                            ? "bg-brand-900 text-white"
                            : cell.isCurrent
                            ? "text-slate-700 dark:text-slate-300"
                            : "text-slate-400"
                        }`}
                      >
                        {cell.day}
                      </span>
                      <button
                        onClick={() => handleOpenCreateOnDate(dateStr)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-brand-600 transition p-0.5"
                        title="Add task on this date"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {/* Task Pills */}
                    <div className="space-y-1 overflow-y-auto max-h-[85px]">
                      {dayTasks.slice(0, 3).map((task) => {
                        const isCompleted = task.status === "COMPLETED" || Number(task.completion_percent || 0) >= 100;
                        const isCritical = Boolean(task.is_critical);
                        const isBlocked = Boolean(task.is_blocked);

                        return (
                          <div
                            key={task.id}
                            onClick={() => handleOpenTaskDetails(task)}
                            className={`px-1.5 py-1 rounded-md text-[11px] font-semibold truncate cursor-pointer transition shadow-2xs flex items-center justify-between gap-1 ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-l-2 border-emerald-500"
                                : isCritical
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-l-2 border-rose-500"
                                : isBlocked
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-l-2 border-amber-500"
                                : "bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-l-2 border-sky-500"
                            }`}
                            title={`${task.task_title || task.title}\nProject: ${task.project_name || "—"}\nOwner: ${task.assigned_to_name || "Unassigned"}`}
                          >
                            <span className="truncate">{task.task_title || task.title}</span>
                            {isBlocked ? (
                              <span className="text-[9px] text-amber-700 shrink-0">🔒</span>
                            ) : task.is_ready ? (
                              <span className="text-[9px] text-emerald-600 shrink-0">⚡</span>
                            ) : null}
                          </div>
                        );
                      })}

                      {dayTasks.length > 3 && (
                        <button
                          onClick={() => setDayPopover({ dateStr, tasks: dayTasks })}
                          className="text-[10px] text-brand-600 dark:text-brand-400 font-bold hover:underline pl-1 block text-left"
                        >
                          +{dayTasks.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── B. WEEK VIEW ── */}
      {viewMode === "week" && (() => {
        // Calculate days of current week (Mon-Sun)
        const d = new Date(currentDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust to Monday
        const weekStart = new Date(d.setDate(diff));
        const weekDays = [];
        for (let i = 0; i < 7; i++) {
          const wd = new Date(weekStart);
          wd.setDate(weekStart.getDate() + i);
          weekDays.push(wd);
        }

        const todayStr = new Date().toISOString().split("T")[0];

        return (
          <div className="card overflow-hidden border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm bg-white dark:bg-slate-900">
            <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800/80 min-h-[450px]">
              {weekDays.map((wd, i) => {
                const dateStr = wd.toISOString().split("T")[0];
                const isToday = dateStr === todayStr;
                const dayTasks = getTasksForDate(dateStr);

                return (
                  <div key={i} className="flex flex-col p-2 space-y-2">
                    {/* Day Column Header */}
                    <div className={`p-2 rounded-xl text-center border ${
                      isToday ? "bg-brand-50 border-brand-200 dark:bg-brand-950/40 dark:border-brand-800" : "bg-slate-50 dark:bg-slate-800/40 border-transparent"
                    }`}>
                      <div className="text-[11px] font-bold text-slate-500 uppercase">
                        {wd.toLocaleDateString("default", { weekday: "short" })}
                      </div>
                      <div className={`text-base font-bold font-mono ${isToday ? "text-brand-700 dark:text-brand-300" : "text-slate-800 dark:text-slate-200"}`}>
                        {wd.getDate()}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{dayTasks.length} tasks</span>
                    </div>

                    {/* Task Cards in Day Column */}
                    <div className="space-y-2 flex-1 overflow-y-auto">
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleOpenTaskDetails(task)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs hover:shadow-md transition cursor-pointer space-y-1.5"
                        >
                          <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {task.task_title || task.title}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {task.project_name || "General Project"}
                          </div>
                          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 dark:border-slate-700">
                            <span className="text-slate-500 truncate">{task.assigned_to_name || "Unassigned"}</span>
                            <span className="font-bold text-brand-600">{task.completion_percent || 0}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── C. DAY VIEW ── */}
      {viewMode === "day" && (() => {
        const dateStr = currentDate.toISOString().split("T")[0];
        const dayTasks = getTasksForDate(dateStr);

        return (
          <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock size={18} className="text-brand-600" />
                  Scheduled Tasks for {currentDate.toLocaleDateString("default", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {dayTasks.length} activities scheduled for this day
                </p>
              </div>
              <button
                onClick={() => handleOpenCreateOnDate(dateStr)}
                className="btn btn-primary text-xs h-9 px-3.5 rounded-xl inline-flex items-center gap-1.5 font-semibold"
              >
                <Plus size={14} /> Add Activity
              </button>
            </div>

            {dayTasks.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <CalendarDays size={40} className="mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-xs">No tasks recorded for this date.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleOpenTaskDetails(task)}
                    className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 p-2 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        task.is_critical ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                      }`}>
                        {task.wbs_code || "T"}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{task.task_title || task.title}</span>
                          {task.is_critical && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              Critical
                            </span>
                          )}
                          {task.is_blocked && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                              🔒 Blocked
                            </span>
                          )}
                        </h4>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
                          <span className="flex items-center gap-1"><Briefcase size={12} /> {task.project_name || "General"}</span>
                          <span className="flex items-center gap-1"><User size={12} /> {task.assigned_to_name || "Unassigned"}</span>
                          <span className="flex items-center gap-1"><Clock size={12} /> {task.duration_days || 1}d</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-brand-600 h-full rounded-full" style={{ width: `${task.completion_percent || 0}%` }} />
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 w-10 text-right">
                        {task.completion_percent || 0}%
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        task.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                        task.status === "IN_PROGRESS" ? "bg-sky-100 text-sky-800" :
                        "bg-slate-100 text-slate-800"
                      }`}>
                        {task.status || "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── D. AGENDA / LIST VIEW ── */}
      {viewMode === "agenda" && (
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <List size={18} className="text-brand-600" /> Chronological Agenda &amp; Deadlines
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upcoming project activities ordered by schedule date
              </p>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No tasks found matching your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>Date / Schedule</th>
                    <th>Task Name</th>
                    <th>Project</th>
                    <th>Assignee</th>
                    <th>Duration</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Dependencies</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="font-mono whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                        {t.start_date ? String(t.start_date).split("T")[0] : "—"} → {t.end_date ? String(t.end_date).split("T")[0] : "—"}
                      </td>
                      <td className="font-bold text-slate-900 dark:text-white">
                        <span className="cursor-pointer hover:underline" onClick={() => handleOpenTaskDetails(t)}>
                          {t.task_title || t.title}
                        </span>
                        {t.is_critical && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                            Critical
                          </span>
                        )}
                      </td>
                      <td className="text-slate-600 dark:text-slate-400">{t.project_name || "General"}</td>
                      <td>{t.assigned_to_name || "Unassigned"}</td>
                      <td className="font-mono font-bold">{t.duration_days || 1}d</td>
                      <td className="font-mono font-bold text-brand-600">{t.completion_percent || 0}%</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          t.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                          t.status === "IN_PROGRESS" ? "bg-sky-100 text-sky-800" :
                          "bg-slate-100 text-slate-800"
                        }`}>
                          {t.status || "Pending"}
                        </span>
                      </td>
                      <td>
                        {t.is_blocked ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            🔒 Blocked
                          </span>
                        ) : t.is_ready ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            ⚡ Ready
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Independent</span>
                        )}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => handleOpenTaskDetails(t)}
                          className="btn btn-secondary text-xs px-2 py-1 rounded-lg"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 6. Task Details & Quick Reschedule Modal ── */}
      {taskDetailsModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarIcon size={18} className="text-brand-600" /> Task Details &amp; Coordination
              </h3>
              <button onClick={() => setTaskDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedTask.task_title || selectedTask.title}
                </h4>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-3">
                  <span>Project: <strong>{selectedTask.project_name || "—"}</strong></span>
                  {selectedTask.wbs_code && <span>Work Plan/WBS: <strong>{selectedTask.wbs_code}</strong></span>}
                  <span>Owner: <strong>{selectedTask.assigned_to_name || "Unassigned"}</strong></span>
                </div>
              </div>

              {/* Status and Progress */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-slate-500">Status:</span>{" "}
                  <strong className="uppercase">{selectedTask.status || "Pending"}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Progress:</span>{" "}
                  <strong className="font-mono text-brand-600">{selectedTask.completion_percent || 0}%</strong>
                </div>
              </div>

              {/* Dependencies status */}
              {selectedTask.predecessors && selectedTask.predecessors.length > 0 && (
                <div className="space-y-1 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Predecessors:</span>
                  <div className="space-y-1 mt-1">
                    {selectedTask.predecessors.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <span>{p.predecessor_title || `Task #${p.predecessor_id}`}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          p.predecessor_status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {p.predecessor_status || "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Reschedule */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">Quick Reschedule:</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      className="input text-xs h-9 w-full rounded-xl font-mono"
                      value={quickReschedule.startDate}
                      onChange={(e) => setQuickReschedule({ ...quickReschedule, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">End Date</label>
                    <input
                      type="date"
                      className="input text-xs h-9 w-full rounded-xl font-mono"
                      value={quickReschedule.endDate}
                      onChange={(e) => setQuickReschedule({ ...quickReschedule, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  to={`/project-management/tasks/${selectedTask.id}`}
                  className="btn btn-secondary text-xs h-10 px-3.5 rounded-xl inline-flex items-center gap-1.5 text-brand-600 font-semibold"
                >
                  <ExternalLink size={14} /> Open in Task Management
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTaskDetailsModalOpen(false)}
                    className="btn btn-secondary text-xs h-10 px-4 rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSaveReschedule}
                    disabled={savingReschedule}
                    className="btn btn-primary text-xs h-10 px-4 rounded-xl inline-flex items-center gap-1.5 font-semibold"
                  >
                    {savingReschedule && <Loader2 size={14} className="animate-spin" />}
                    Save Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. New Task on Date Modal ── */}
      {newTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={18} className="text-brand-600" /> Create Task on {newTaskDate}
              </h3>
              <button onClick={() => setNewTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleSaveNewTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Site Survey & Marking"
                  className="input text-sm h-10 w-full rounded-xl"
                  value={newTaskForm.task_title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, task_title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Project *
                </label>
                <select
                  required
                  className="input text-xs h-10 w-full rounded-xl font-medium"
                  value={newTaskForm.project_id}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, project_id: e.target.value })}
                >
                  <option value="">— Select Project —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_code ? `${p.project_code} - ` : ""}{p.project_name || p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Employee
                </label>
                <select
                  className="input text-xs h-10 w-full rounded-xl"
                  value={newTaskForm.assigned_to_id}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, assigned_to_id: e.target.value })}
                >
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    className="input text-xs h-10 w-full rounded-xl font-mono"
                    value={newTaskForm.start_date}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    className="input text-xs h-10 w-full rounded-xl font-mono"
                    value={newTaskForm.end_date}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setNewTaskModalOpen(false)}
                  className="btn btn-secondary text-xs h-10 px-4 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewTask}
                  className="btn btn-primary text-xs h-10 px-5 rounded-xl inline-flex items-center gap-1.5 font-semibold"
                >
                  {savingNewTask && <Loader2 size={14} className="animate-spin" />}
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 8. Day Tasks Popover (when clicking "+N more") ── */}
      {dayPopover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                Tasks for {dayPopover.dateStr}
              </span>
              <button onClick={() => setDayPopover(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {dayPopover.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => {
                    setDayPopover(null);
                    handleOpenTaskDetails(task);
                  }}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs space-y-0.5"
                >
                  <div className="font-bold truncate text-slate-900 dark:text-white">
                    {task.task_title || task.title}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate flex justify-between">
                    <span>{task.project_name || "General"}</span>
                    <span>{task.assigned_to_name || "Unassigned"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
