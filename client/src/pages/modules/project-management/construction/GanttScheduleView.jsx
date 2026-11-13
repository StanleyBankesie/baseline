/**
 * @file GanttScheduleView.jsx
 * @description Project Scheduling Suite — 7 integrated views reading tasks from the
 * existing Task Management system (no manual activity creation).
 *
 * Tabs:
 *  1. Project Timeline  — high-level schedule overview & work packages
 *  2. Gantt Chart       — interactive bar chart with critical path
 *  3. Task Calendar     — month / week / day task calendar
 *  4. Milestones        — checkpoint cards derived from milestone tasks
 *  5. Task Dependencies — WBS table with predecessor/successor links
 *  6. Schedule Monitoring — planned vs actual, SPI, recovery plans
 *  7. Critical Path (CPM) — ES/EF/LS/LF/float table + longest-path sequence
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Calendar,
  Clock,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Flag,
  RefreshCw,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Link2,
  User,
  BarChart2,
  ShieldAlert,
  Zap,
  ArrowRight,
  Layers,
  Activity,
  TrendingUp,
  Info,
  Search,
  Timer,
  CalendarDays,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

// ── Helper: status badge colour ──────────────────────────────────────────────
const statusBadge = (status) => {
  switch (status) {
    case "COMPLETED":   return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "IN_PROGRESS": return "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300";
    case "DELAYED":     return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
    case "ON_HOLD":     return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    default:            return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function GanttScheduleView() {
  // ── Project selector ──
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // ── Tab routing ──
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const resolveTab = (t) => {
    if (t === "calendar") return "calendar";
    if (t === "dependencies" || t === "activities") return "dependencies";
    return "gantt";
  };
  const [activeTab, setActiveTab] = useState(resolveTab(tabParam));
  useEffect(() => { if (tabParam) setActiveTab(resolveTab(tabParam)); }, [tabParam]);
  const handleTabChange = (id) => { setActiveTab(id); setSearchParams({ tab: id }); };

  // ── Data ──
  const [loading, setLoading]     = useState(false);
  const [tasks, setTasks]         = useState([]);
  const [scheduleData, setScheduleData] = useState({
    project: null,
    tasks: [],
    cpm: { tasks: [], projectDurationDays: 0, criticalPathIds: [], criticalPathSequence: [], activitiesThreateningDeadline: [], forecastCompletionDate: "", hasCycle: false },
    variance: { actualProgress: 0, plannedProgress: 0, spi: 1.0, scheduleVarianceDays: 0, targetCompletionDate: "", forecastCompletionDate: "", delayedTasksCount: 0, recoveryPlan: [] },
    eotClaims: [],
    workPackages: [],
  });

  // ── Filters (shared across tabs) ──
  const [searchTerm, setSearchTerm]   = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [ganttZoom, setGanttZoom]     = useState("weeks");

  // ── Calendar state ──
  const [calendarDate, setCalendarDate]         = useState(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState("month");

  // ── Load projects ──
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/projects/projects", { params: { active: "all" } });
        const prjs = res.data?.items || [];
        setProjects(prjs);
        // Do NOT auto-select — user must choose a project
      } catch {
        toast.error("Failed to load projects");
      }
    })();
  }, []);

  // ── Load schedule data + tasks when project changes ──
  useEffect(() => {
    if (!selectedProjectId) return;
    loadAll();
  }, [selectedProjectId]);

  const loadAll = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      // Load CPM/schedule data (backend: /construction/schedule/:id)
      const schedRes = await api.get(`/construction/schedule/${selectedProjectId}`);
      const sched = schedRes.data || {};
      setScheduleData(sched);
      // Use tasks from schedule response; they carry CPM fields (ES/EF/float etc.)
      setTasks(sched.tasks || []);
    } catch {
      // Fallback: load plain project tasks
      try {
        const tRes = await api.get("/projects/tasks", { params: { project_id: selectedProjectId, active: "all" } });
        setTasks(tRes.data?.items || tRes.data?.tasks || []);
      } catch {
        toast.error("Failed to load project tasks");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Derived data ──
  const { project, cpm, variance, eotClaims } = scheduleData;
  const criticalCount = tasks.filter(t => t.is_critical).length;

  const filteredTasks = useMemo(() =>
    tasks.filter(t => {
      const matchSearch =
        !searchTerm.trim() ||
        t.task_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.wbs_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.assigned_to_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.title?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
      return matchSearch && matchStatus;
    }),
    [tasks, searchTerm, statusFilter]
  );

  // ── Tab definitions (Gantt, Calendar, Dependencies) ──
  const TABS = [
    { id: "gantt",        label: "Gantt Chart",         icon: BarChart2 },
    { id: "calendar",     label: "Task Calendar",       icon: Calendar },
    { id: "dependencies", label: "Task Dependencies",   icon: Sliders },
  ];

  // ── Shared Filter Toolbar ──
  const FilterToolbar = () => (
    <div className="card p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search tasks, WBS, assignee..."
          className="input pl-10 pr-3 py-2 text-sm h-10 w-full rounded-xl"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      <select
        className="input text-sm h-10 rounded-xl min-w-[160px]"
        value={statusFilter}
        onChange={e => setStatusFilter(e.target.value)}
      >
        <option value="ALL">All Statuses</option>
        <option value="NOT_STARTED">Not Started</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="COMPLETED">Completed</option>
        <option value="DELAYED">Delayed</option>
        <option value="ON_HOLD">On Hold</option>
      </select>
      <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
        {filteredTasks.length} / {tasks.length} tasks
      </span>
    </div>
  );

  // ── Empty state helper ──
  const EmptyState = ({ message }) => (
    <div className="card p-12 text-center space-y-3">
      <CalendarDays size={40} className="mx-auto text-slate-300" />
      <p className="text-slate-400 text-sm">{message}</p>
      <Link
        to="/project-management/tasks"
        className="btn btn-primary inline-flex items-center gap-2 text-xs mt-2"
      >
        Go to Task Assignment
      </Link>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ── TIER 1: Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5">
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar size={24} className="text-brand-900 dark:text-brand-400" />
              Planning &amp; Scheduling
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Project timeline, Gantt chart, task calendar, dependencies and schedule monitoring
            </p>
          </div>
        </div>

        {/* Right: project selector + refresh */}
        <div className="flex items-center gap-2">
          <select
            className="input text-sm h-10 rounded-xl min-w-[260px]"
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
          >
            <option value="">— Select a project —</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.project_code ? `${p.project_code} - ` : ""}{p.project_name || p.name}
              </option>
            ))}
          </select>
          <button
            onClick={loadAll}
            className="btn btn-secondary h-10 px-3 rounded-xl inline-flex items-center gap-1.5 shrink-0"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline text-xs font-medium">Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Circular dependency warning ── */}
      {cpm?.hasCycle && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-sm block mb-0.5">Circular Dependency Detected in Activity Network</span>
            The schedule contains a circular predecessor loop. Please inspect task predecessors in Task Dependencies to resolve.
          </div>
        </div>
      )}



      {/* ── Tab Navigation — pill style ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-1.5">
        <nav className="flex overflow-x-auto gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id ||
              (tab.id === "dependencies" && activeTab === "activities");
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-sm whitespace-nowrap transition-all flex-1 justify-center ${
                  active
                    ? "bg-brand-900 dark:bg-brand-700 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={15} />
                <span className="hidden lg:inline">{tab.label}</span>
                <span className="lg:hidden">{tab.label.replace(/^\d+\.\s+/, "")}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 — GANTT CHART
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "gantt" && (
        <div className="space-y-4">
          {/* Filter toolbar */}
          <FilterToolbar />

          {/* Zoom controls + legend */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300">Scale:</span>
              {["days", "weeks", "months"].map(mode => (
                <button
                  key={mode}
                  onClick={() => setGanttZoom(mode)}
                  className={`px-3 py-1.5 rounded-lg font-semibold capitalize text-xs transition ${
                    ganttZoom === mode ? "bg-brand-900 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500 inline-block" /> Critical Path</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-500 inline-block" /> Standard Task</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Completed</span>
            </div>
          </div>

          {/* Gantt Canvas */}
          <div className="card overflow-hidden">
            {filteredTasks.length === 0 ? (
              <EmptyState message="No tasks to display. Assign tasks to this project first." />
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs font-bold p-3 text-slate-600 dark:text-slate-300">
                    <div className="col-span-4">Task / WBS</div>
                    <div className="col-span-8 flex justify-between font-mono">
                      <span>Project Start ({project?.start_date ? project.start_date.split("T")[0] : "Day 0"})</span>
                      <span>Midpoint</span>
                      <span>Forecast End ({cpm?.forecastCompletionDate || "—"})</span>
                    </div>
                  </div>
                  {/* Task Bars */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTasks.map(t => {
                      const maxDuration = Math.max(1, cpm?.projectDurationDays || 30);
                      const startOffset = Math.max(0, Number(t.es || 0));
                      const taskDuration = Math.max(1, Number(t.duration_days || 1));
                      const leftPercent = Math.min(95, (startOffset / maxDuration) * 100);
                      const widthPercent = Math.max(3, Math.min(100 - leftPercent, (taskDuration / maxDuration) * 100));
                      const barColor = t.status === "COMPLETED"
                        ? "bg-emerald-500 border-emerald-600"
                        : t.is_critical
                        ? "bg-rose-500 border-rose-600 font-bold"
                        : "bg-brand-500 border-brand-600";
                      return (
                        <div key={t.id} className="grid grid-cols-12 items-center p-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-xs">
                          <div className="col-span-4 pr-3">
                            <div className="font-semibold truncate text-slate-900 dark:text-white" title={t.task_title || t.title}>
                              {t.wbs_code && <span className="font-mono text-brand-600 dark:text-brand-400 text-[11px] mr-1">{t.wbs_code}</span>}
                              {t.task_title || t.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>{t.assigned_to_name || "Unassigned"}</span>
                              {t.total_float != null && <span className="font-mono">Float: {t.total_float}d</span>}
                            </div>
                          </div>
                          <div className="col-span-8 relative h-7 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-0.5 overflow-hidden">
                            <div className="absolute inset-0 grid grid-cols-6 pointer-events-none opacity-10 divide-x divide-slate-400" />
                            <div
                              className={`absolute top-1 bottom-1 rounded-md shadow-sm flex items-center px-2 text-white border ${barColor}`}
                              style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                              title={`${t.task_title || t.title}\nDuration: ${t.duration_days}d\nProgress: ${t.completion_percent || 0}%`}
                            >
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-black/20 rounded-l-md pointer-events-none"
                                style={{ width: `${Math.min(100, t.completion_percent || 0)}%` }}
                              />
                              <span className="relative z-10 text-xs font-mono truncate">
                                {t.completion_percent > 0 ? `${t.completion_percent}%` : `${t.duration_days || 1}d`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3 — TASK CALENDAR
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          {/* Calendar Controls */}
          <div className="card p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {calendarDate.toLocaleString("default", { month: "long", year: "numeric" })}
                </h3>
                <p className="text-xs text-slate-500">Task schedules, deadlines and assignments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800">
                {["month", "week", "day"].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setCalendarViewMode(mode)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                      calendarViewMode === mode
                        ? "bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-300 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              {/* Navigation */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const d = new Date(calendarDate);
                    if (calendarViewMode === "day") d.setDate(d.getDate() - 1);
                    else if (calendarViewMode === "week") d.setDate(d.getDate() - 7);
                    else d.setMonth(d.getMonth() - 1);
                    setCalendarDate(d);
                  }}
                  className="btn btn-secondary p-2 h-9 w-9 rounded-lg"
                ><ChevronLeft size={16} /></button>
                <button
                  onClick={() => setCalendarDate(new Date())}
                  className="btn btn-secondary px-3 py-1.5 h-9 text-xs font-semibold rounded-lg"
                >Today</button>
                <button
                  onClick={() => {
                    const d = new Date(calendarDate);
                    if (calendarViewMode === "day") d.setDate(d.getDate() + 1);
                    else if (calendarViewMode === "week") d.setDate(d.getDate() + 7);
                    else d.setMonth(d.getMonth() + 1);
                    setCalendarDate(d);
                  }}
                  className="btn btn-secondary p-2 h-9 w-9 rounded-lg"
                ><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>

          {/* Month Grid */}
          {calendarViewMode === "month" && (() => {
            const year = calendarDate.getFullYear();
            const month = calendarDate.getMonth();
            const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const daysInPrevMonth = new Date(year, month, 0).getDate();
            const cells = [];
            for (let i = firstDayIndex - 1; i >= 0; i--) {
              cells.push({ day: daysInPrevMonth - i, isCurrent: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
            }
            for (let i = 1; i <= daysInMonth; i++) {
              cells.push({ day: i, isCurrent: true, date: new Date(year, month, i) });
            }
            const totalCells = Math.ceil(cells.length / 7) * 7;
            for (let i = 1; i <= totalCells - cells.length; i++) {
              cells.push({ day: i, isCurrent: false, date: new Date(year, month + 1, i) });
            }
            const todayStr = new Date().toISOString().split("T")[0];
            return (
              <div className="card overflow-hidden border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center text-xs font-bold text-slate-500 py-2.5 bg-slate-50 dark:bg-slate-800/50">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800">
                  {cells.map((cell, idx) => {
                    const dateStr = cell.date.toISOString().split("T")[0];
                    const isToday = dateStr === todayStr;
                    const dayTasks = tasks.filter(t => {
                      if (!t.start_date && !t.due_date) return false;
                      const sDate = String(t.start_date || t.due_date).split("T")[0];
                      const eDate = t.end_date || t.due_date ? String(t.end_date || t.due_date).split("T")[0] : sDate;
                      return dateStr >= sDate && dateStr <= eDate;
                    });
                    return (
                      <div
                        key={idx}
                        className={`min-h-[110px] p-1.5 flex flex-col ${
                          !cell.isCurrent
                            ? "bg-slate-50/40 dark:bg-slate-900/30 text-slate-400"
                            : "bg-white dark:bg-slate-900 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex items-center justify-center text-xs font-mono font-bold w-6 h-6 rounded-full ${
                            isToday ? "bg-brand-900 text-white" : cell.isCurrent ? "text-slate-700 dark:text-slate-300" : "text-slate-400"
                          }`}>{cell.day}</span>
                          {dayTasks.length > 0 && (
                            <span className="text-[10px] text-slate-400 font-mono">{dayTasks.length}</span>
                          )}
                        </div>
                        <div className="space-y-0.5 overflow-y-auto max-h-[80px]">
                          {dayTasks.slice(0, 3).map(task => (
                            <div
                              key={task.id}
                              className={`px-1.5 py-0.5 rounded text-[11px] truncate font-medium ${
                                task.is_critical
                                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-l-2 border-rose-500"
                                  : task.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : task.status === "IN_PROGRESS"
                                  ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                                  : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                              title={`${task.task_title || task.title} (${task.assigned_to_name || "Unassigned"})`}
                            >
                              {task.task_title || task.title}
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold pl-1">+{dayTasks.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Week / Day list view */}
          {(calendarViewMode === "week" || calendarViewMode === "day") && (
            <div className="card p-5 space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Clock size={16} className="text-brand-600" /> Tasks — {calendarViewMode === "week" ? "This Week" : "Today"}
              </h3>
              {tasks.length === 0
                ? <EmptyState message="No tasks to display." />
                : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tasks.map(task => (
                      <div key={task.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 px-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl transition">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-[11px] shrink-0 ${
                            task.is_critical ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                          }`}>{task.wbs_code || "T"}</div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {task.task_title || task.title}
                              {task.is_critical && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Critical</span>}
                            </h4>
                            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-3">
                              <span className="flex items-center gap-1"><Calendar size={11} /> {task.start_date ? String(task.start_date).split("T")[0] : "—"} → {task.end_date || task.due_date ? String(task.end_date || task.due_date).split("T")[0] : "—"}</span>
                              {task.duration_days && <span className="flex items-center gap-1"><Clock size={11} /> {task.duration_days}d</span>}
                              <span className="flex items-center gap-1"><User size={11} /> {task.assigned_to_name || "Unassigned"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div className="bg-brand-600 h-full rounded-full" style={{ width: `${task.completion_percent || 0}%` }} />
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 w-9 text-right">{task.completion_percent || 0}%</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${statusBadge(task.status)}`}>{task.status || "NOT_STARTED"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Treats tasks that have milestone_id or is_milestone=true as checkpoints;
          falls back to showing all tasks grouped by status.
         ══════════════════════════════════════════════════════════════════════ */}
      
      {/* ══════════════════════════════════════════════════════════════════════
          TAB 5 — TASK DEPENDENCIES
          WBS table with predecessor/successor dependency links
         ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === "dependencies" || activeTab === "activities") && (
        <div className="space-y-4">
          <FilterToolbar />
          <div className="card overflow-hidden">
            {filteredTasks.length === 0 ? (
              <EmptyState message="No tasks found. Assign tasks in the Task Assignment board first." />
            ) : (
              <div className="overflow-x-auto">
                <table className="table text-xs">
                  <thead>
                    <tr>
                      <th>WBS / Task</th>
                      <th className="text-center">Duration</th>
                      <th>Predecessors</th>
                      <th>Successors</th>
                      <th>Assignee</th>
                      <th>Start → End</th>
                      <th className="text-center">Progress</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map(t => (
                      <tr key={t.id} className={t.is_critical ? "bg-rose-50/40 dark:bg-rose-950/20" : ""}>
                        <td className="font-semibold text-slate-900 dark:text-white max-w-[200px]">
                          {t.wbs_code && <span className="font-mono text-brand-600 dark:text-brand-400 text-[11px] mr-1 block">{t.wbs_code}</span>}
                          <span className="truncate block">{t.task_title || t.title}</span>
                          {t.is_critical && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200 mt-0.5 inline-block">CRITICAL</span>}
                        </td>
                        <td className="text-center font-mono font-bold">{t.duration_days ? `${t.duration_days}d` : "—"}</td>
                        <td>
                          {t.predecessors?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {t.predecessors.map((p, pi) => (
                                <span key={pi} className="font-mono px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px]">
                                  {p.predecessor_wbs || `ID:${p.predecessor_id}`}
                                  <span className="text-slate-400 ml-0.5">({p.dependency_type || "FS"}{p.lag_days ? `+${p.lag_days}d` : ""})</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">None (Start)</span>
                          )}
                        </td>
                        <td>
                          {t.successors?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {t.successors.map((s, si) => (
                                <span key={si} className="font-mono px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded text-[11px]">
                                  {s.successor_wbs || `ID:${s.successor_id}`}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">None (End)</span>
                          )}
                        </td>
                        <td className="text-xs">{t.assigned_to_name || t.assignee_name || "Unassigned"}</td>
                        <td className="font-mono text-[11px] whitespace-nowrap">
                          {t.start_date ? String(t.start_date).split("T")[0] : "—"} → {(t.end_date || t.due_date) ? String(t.end_date || t.due_date).split("T")[0] : "—"}
                        </td>
                        <td className="text-center font-mono font-bold text-brand-600 dark:text-brand-400">{t.completion_percent || 0}%</td>
                        <td><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${statusBadge(t.status)}`}>{t.status || "NOT_STARTED"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Dependency legend */}
          <div className="card p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">Dependency Types</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ["FS", "Finish-to-Start",   "Task B starts after Task A finishes"],
                ["SS", "Start-to-Start",    "Task B starts when Task A starts"],
                ["FF", "Finish-to-Finish",  "Task B finishes when Task A finishes"],
                ["SF", "Start-to-Finish",   "Task B finishes after Task A starts"],
              ].map(([code, name, desc]) => (
                <div key={code} className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="font-mono font-bold text-brand-600 dark:text-brand-400">{code}</span>
                  <span className="ml-1 font-semibold">{name}</span>
                  <p className="text-slate-400 mt-0.5 text-[11px]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
