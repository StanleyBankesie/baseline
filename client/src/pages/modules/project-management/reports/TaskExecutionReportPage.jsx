/**
 * @fileoverview TaskExecutionReportPage component.
 * Concise per-project Task Execution & Delay Log in Project Management.
 */

import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  User,
  Folder,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  CheckSquare,
  AlertOctagon,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers
} from "lucide-react";
import { api } from "../../../../api/client.js";

export default function TaskExecutionReportPage({ isEmbedded = false }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [selectedProject, setSelectedProject] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, DELAYED, IN_PROGRESS, OVERDUE, COMPLETED
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedProjects, setCollapsedProjects] = useState({});

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");
      if (selectedProject) {
        const params = { project_id: selectedProject };
        const res = await api.get("/projects/reports/task-execution", { params });
        setData(res.data);
      } else {
        // No project selected: only load projects list for the dropdown; no data items or analytics!
        const pRes = await api.get("/projects/projects", { params: { active: "all" } });
        const prjs = pRes.data?.items || [];
        setData({
          items: [],
          projects: prjs.map((p) => ({ id: p.id, project_code: p.project_code, project_name: p.project_name })),
          analytics: { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, overdueTasks: 0, delayedTasksCount: 0, completionRate: 0, blockedTasks: 0 }
        });
      }
    } catch (err) {
      console.error("Failed to load task execution report:", err);
      setError(err?.response?.data?.message || "Failed to load task execution report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedProject]);

  const toggleProjectCollapse = (projectId) => {
    setCollapsedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Filter tasks based on statusFilter and searchQuery
  const filteredTasks = useMemo(() => {
    if (!data?.items) return [];
    let list = data.items;

    // Filter by quick pill
    if (statusFilter === "DELAYED") {
      list = list.filter((t) => t.has_delays || (t.delay_reasons && t.delay_reasons.length > 0) || t.due_status === "OVERDUE");
    } else if (statusFilter === "OVERDUE") {
      list = list.filter((t) => t.due_status === "OVERDUE");
    } else if (statusFilter === "IN_PROGRESS") {
      list = list.filter((t) => t.status === "IN_PROGRESS");
    } else if (statusFilter === "COMPLETED") {
      list = list.filter((t) => t.status === "COMPLETED");
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          (t.task_title || t.task_name || t.title || "").toLowerCase().includes(q) ||
          (t.project_name || "").toLowerCase().includes(q) ||
          (t.project_code || "").toLowerCase().includes(q) ||
          (t.assigned_to_name || "").toLowerCase().includes(q) ||
          (t.scope_name || "").toLowerCase().includes(q) ||
          (t.reason_for_delay || "").toLowerCase().includes(q) ||
          (t.delay_reasons && t.delay_reasons.some((r) => String(r).toLowerCase().includes(q)))
      );
    }

    return list;
  }, [data?.items, statusFilter, searchQuery]);

  // Group filtered tasks per project
  const tasksByProject = useMemo(() => {
    const groups = {};
    for (const t of filteredTasks) {
      const pId = t.project_id || 0;
      if (!groups[pId]) {
        groups[pId] = {
          id: pId,
          name: t.project_name || "General / Unassigned Project",
          code: t.project_code || "PRJ",
          tasks: [],
          completedCount: 0,
          inProgressCount: 0,
          overdueCount: 0,
          delayedCount: 0
        };
      }
      groups[pId].tasks.push(t);
      if (t.status === "COMPLETED") groups[pId].completedCount++;
      else if (t.status === "IN_PROGRESS") groups[pId].inProgressCount++;
      if (t.due_status === "OVERDUE") groups[pId].overdueCount++;
      if (t.has_delays || (t.delay_reasons && t.delay_reasons.length > 0)) groups[pId].delayedCount++;
    }
    return Object.values(groups);
  }, [filteredTasks]);

  const handleExportCSV = () => {
    if (!filteredTasks || filteredTasks.length === 0) return;
    const headers = [
      "Task ID",
      "Task Name",
      "Project Code",
      "Project Name",
      "Work Plan/WBS Scope",
      "Assignee",
      "Priority",
      "Status",
      "Progress %",
      "Start Date",
      "Due Date",
      "SLA Status",
      "Logged Delay Reasons"
    ];

    const rows = filteredTasks.map((t) => [
      t.id,
      `"${(t.task_title || t.task_name || t.title || "").replace(/"/g, '""')}"`,
      t.project_code || "",
      `"${(t.project_name || "").replace(/"/g, '""')}"`,
      `"${(t.scope_name || "").replace(/"/g, '""')}"`,
      `"${(t.assigned_to_name || "Unassigned").replace(/"/g, '""')}"`,
      t.priority || "MEDIUM",
      t.status || "PENDING",
      `${t.completion_percent || 0}%`,
      t.start_date ? String(t.start_date).split("T")[0] : "",
      t.end_date ? String(t.end_date).split("T")[0] : "",
      t.due_label || "",
      `"${(t.delay_reasons && t.delay_reasons.length > 0 ? t.delay_reasons.join("; ") : t.reason_for_delay || "").replace(/"/g, '""')}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Task_Execution_Delay_Log_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const analytics = data?.analytics || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header Bar */}
      {!isEmbedded && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <Link
              to="/project-management?section=Reports%20%26%20Analytics"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Return to Reports & Analytics"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Task Execution & Delay Log
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Concise operational execution tracking, SLA schedule variance, and delay logs per project.
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={loadReport}
              disabled={loading}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!data || !filteredTasks.length}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              disabled={!data}
              className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <Printer size={14} />
              Print
            </button>
          </div>
        </div>
      )}

      {error ? (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertOctagon size={16} />
            <span>{error}</span>
          </div>
          <button onClick={loadReport} className="underline font-semibold hover:text-rose-900">
            Retry
          </button>
        </div>
      ) : null}

      {/* Mobile KPI Summary Grid (< 768px): Apple HIG style compact 2x2 grid */}
      <div className="grid grid-cols-2 gap-2.5 md:hidden">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Tasks</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 block">{loading ? "..." : analytics.totalTasks || 0}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <CheckSquare size={14} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">In Progress</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">{loading ? "..." : analytics.inProgressTasks || 0}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Activity size={14} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Completed</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{loading ? "..." : analytics.completedTasks || 0}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Delays / Overdue</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">{loading ? "..." : (analytics.delayedTasksCount ?? analytics.overdueTasks ?? 0)}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangle size={14} />
          </div>
        </div>
      </div>

      {/* Desktop KPI Strip (>= 768px): 5 Balanced Cards */}
      <div className="hidden md:grid md:grid-cols-5 gap-3">
        {/* Total Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Tasks
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {loading ? "..." : analytics.totalTasks || 0}
            </div>
            <span className="text-[10px] text-slate-500">
              Across {data?.projects?.length || 0} projects
            </span>
          </div>
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <CheckSquare size={16} />
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              In Progress
            </span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {loading ? "..." : analytics.inProgressTasks || 0}
            </div>
            <span className="text-[10px] text-slate-500">
              {analytics.blockedTasks || 0} blocked / at risk
            </span>
          </div>
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Activity size={16} />
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Completed
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {loading ? "..." : `${analytics.completedTasks || 0}`}
            </div>
            <span className="text-[10px] text-emerald-600/90 font-medium">
              {analytics.completionRate || 0}% overall velocity
            </span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={16} />
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Overdue SLA
            </span>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {loading ? "..." : analytics.overdueTasks || 0}
            </div>
            <span className="text-[10px] text-rose-600/90 font-medium">
              {analytics.overdueRate || 0}% breach rate
            </span>
          </div>
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
            <Clock size={16} />
          </div>
        </div>

        {/* Delay Logs & Bottlenecks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Delay Logs
            </span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {loading ? "..." : analytics.delayedTasksCount ?? (analytics.overdueTasks || 0)}
            </div>
            <span className="text-[10px] text-amber-600/90 font-medium">
              Reported bottlenecks
            </span>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={16} />
          </div>
        </div>
      </div>

      {/* Compact Controls & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 print:hidden">
        {/* Left: Project Selector */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Folder size={16} className="text-slate-400 shrink-0" />
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">-- Select Project --</option>
            {(data?.projects || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} ({p.project_code || "PRJ"})
              </option>
            ))}
          </select>
        </div>

        {/* Center: Quick Filter Pills (Apple HIG segmented feel, vector icon, no raw emoji) */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {[
            { id: "ALL", label: "All Tasks" },
            { id: "DELAYED", label: `Delays & Overdue (${analytics.delayedTasksCount || 0})`, icon: AlertTriangle, isAlert: true },
            { id: "IN_PROGRESS", label: `Active (${analytics.inProgressTasks || 0})` },
            { id: "OVERDUE", label: `Overdue (${analytics.overdueTasks || 0})` },
            { id: "COMPLETED", label: `Done (${analytics.completedTasks || 0})` }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                statusFilter === pill.id
                  ? "bg-brand-600 text-white shadow-xs"
                  : pill.isAlert && (analytics.delayedTasksCount || 0) > 0
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 hover:bg-amber-100"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {pill.icon && (
                <pill.icon
                  size={12}
                  className={statusFilter === pill.id ? "text-white" : "text-amber-600 dark:text-amber-400"}
                />
              )}
              <span>{pill.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Search Input */}
        <div className="relative min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search task, assignee, delay..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Main Content: Concise Per-Project Sections */}
      {loading ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <RefreshCw size={24} className="animate-spin text-brand-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading task execution logs...</p>
        </div>
      ) : !selectedProject ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-900 dark:text-brand-300 mx-auto mb-3 shadow-xs">
            <CheckSquare size={28} />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Project Selected
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Please select a project from the dropdown above to view its operational execution tracking, SLA schedule variance, and delay logs.
          </p>
        </div>
      ) : tasksByProject.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
          <CheckSquare size={32} className="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No tasks match the selected filter criteria.
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your project selection, status filter, or search keywords.
          </p>
          {(statusFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setSearchQuery("");
              }}
              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {tasksByProject.map((group) => {
            const isCollapsed = Boolean(collapsedProjects[group.id]);
            const projectCompletionRate = group.tasks.length > 0
              ? Math.round((group.completedCount / group.tasks.length) * 100)
              : 0;

            return (
              <div
                key={group.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-all"
              >
                {/* Project Section Header */}
                <div
                  onClick={() => toggleProjectCollapse(group.id)}
                  className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/80 select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {group.name}
                        </span>
                        {group.code && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            #{group.code}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {group.tasks.length} task{group.tasks.length > 1 ? "s" : ""} in work plan/wbs
                      </span>
                    </div>
                  </div>

                  {/* Project Metric Highlights */}
                  <div className="flex items-center gap-3">
                    {/* Completion Mini Progress */}
                    <div className="flex items-center gap-2 min-w-[130px]">
                      <div className="w-20 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${projectCompletionRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {projectCompletionRate}%
                      </span>
                    </div>

                    {/* Status Badges */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold border border-emerald-100 dark:border-emerald-900/50">
                        {group.completedCount} Done
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-semibold border border-blue-100 dark:border-blue-900/50">
                        {group.inProgressCount} Active
                      </span>
                      {group.overdueCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold border border-rose-100 dark:border-rose-900/50 flex items-center gap-1">
                          <Clock size={11} /> {group.overdueCount} Overdue
                        </span>
                      )}
                      {group.delayedCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold border border-amber-100 dark:border-amber-900/50 flex items-center gap-1">
                          <AlertTriangle size={11} /> {group.delayedCount} Delays Logged
                        </span>
                      )}
                    </div>

                    {group.id > 0 && (
                      <Link
                        to={`/project-management/gantt?projectId=${group.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="View Project Gantt Chart"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Project Task Execution & Delay - Responsive View */}
                {!isCollapsed && (
                  <>
                    {/* 1. Mobile Native Apple Inset Grouped List (< 768px) */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
                      {group.tasks.map((task) => {
                        const priorityBadge =
                          task.priority === "URGENT"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                            : task.priority === "HIGH"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                            : task.priority === "LOW"
                            ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";

                        const statusBadge =
                          task.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : task.status === "IN_PROGRESS"
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            : task.status === "BLOCKED"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                            : task.status === "REVIEW"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";

                        const reasons = task.delay_reasons && task.delay_reasons.length > 0
                          ? task.delay_reasons
                          : task.reason_for_delay
                          ? [task.reason_for_delay]
                          : [];

                        const isOverdue = task.due_status === "OVERDUE";
                        const isBlocked = task.status === "BLOCKED";

                        return (
                          <div
                            key={task.id}
                            className={`p-4 space-y-2.5 transition-colors ${
                              reasons.length > 0 || isOverdue
                                ? "bg-amber-50/20 dark:bg-amber-950/10"
                                : "hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                            }`}
                          >
                            {/* Top Row: Title & Status */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[15px] font-semibold text-slate-900 dark:text-white leading-snug">
                                  {task.task_title || task.task_name || task.title || `Task #${task.id}`}
                                </h4>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1 truncate max-w-[150px]">
                                    <Layers size={11} className="text-slate-400 shrink-0" />
                                    {task.scope_name || task.work_plan_title || "General Work Plan/WBS"}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <User size={11} className="text-slate-400 shrink-0" />
                                    <span className="truncate max-w-[120px]">{task.assigned_to_name || "Unassigned"}</span>
                                  </span>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold shrink-0 ${statusBadge}`}>
                                {task.status?.replace(/_/g, " ") || "PENDING"}
                              </span>
                            </div>

                            {/* Middle Row: Progress Track & Priority */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span className="font-medium text-[11px]">Progress</span>
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${priorityBadge}`}>
                                    {task.priority || "MEDIUM"}
                                  </span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                    {task.completion_percent || 0}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    Number(task.completion_percent) >= 100
                                      ? "bg-emerald-500"
                                      : "bg-brand-600"
                                  }`}
                                  style={{ width: `${task.completion_percent || 0}%` }}
                                />
                              </div>
                            </div>

                            {/* Dates & SLA Variance */}
                            <div className="flex items-center justify-between pt-1 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-50 dark:border-slate-800/60">
                              <div className="font-mono text-[11px]">
                                <span>Due: {task.end_date ? String(task.end_date).split("T")[0] : "—"}</span>
                                {task.start_date && (
                                  <span className="text-slate-400 ml-2">Start: {String(task.start_date).split("T")[0]}</span>
                                )}
                              </div>
                              <div>
                                {task.status === "COMPLETED" ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                                    <CheckCircle2 size={12} /> {task.due_label || "Completed"}
                                  </span>
                                ) : isOverdue ? (
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px] flex items-center gap-1">
                                    <Clock size={12} /> {task.due_label || "Overdue"}
                                  </span>
                                ) : isBlocked ? (
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold text-[11px] flex items-center gap-1">
                                    <AlertOctagon size={12} /> Blocked
                                  </span>
                                ) : (
                                  <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">
                                    {task.due_label || "On Track"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Apple Inset Callout for Bottlenecks & Delays */}
                            {reasons.length > 0 && (
                              <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold block text-[11px] uppercase tracking-wide text-amber-800 dark:text-amber-300">
                                    Delay Reason:
                                  </span>
                                  <span className="text-[12px] leading-tight">
                                    {reasons.join(", ")}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 2. Desktop Full Table (>= 768px) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 bg-white dark:bg-slate-900">
                            <th className="py-2.5 px-4">Task & Work Plan/WBS</th>
                            <th className="py-2.5 px-3">Assignee</th>
                            <th className="py-2.5 px-3">Priority</th>
                            <th className="py-2.5 px-3">Schedule Dates</th>
                            <th className="py-2.5 px-3">Progress</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-4 min-w-[200px]">Delay Log & SLA Variance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {group.tasks.map((task) => {
                            const priorityBadge =
                              task.priority === "URGENT"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : task.priority === "HIGH"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                : task.priority === "LOW"
                                ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";

                            const statusBadge =
                              task.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : task.status === "IN_PROGRESS"
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                                : task.status === "BLOCKED"
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                : task.status === "REVIEW"
                                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700";

                            // Delay reasons display
                            const reasons = task.delay_reasons && task.delay_reasons.length > 0
                              ? task.delay_reasons
                              : task.reason_for_delay
                              ? [task.reason_for_delay]
                              : [];

                            const isOverdue = task.due_status === "OVERDUE";
                            const isBlocked = task.status === "BLOCKED";

                            return (
                              <tr
                                key={task.id}
                                className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                                  reasons.length > 0 || isOverdue
                                    ? "bg-amber-50/20 dark:bg-amber-950/10"
                                    : ""
                                }`}
                              >
                                {/* Task & Work Plan/WBS */}
                                <td className="py-2.5 px-4">
                                  <div className="font-semibold text-slate-900 dark:text-white">
                                    {task.task_title || task.task_name || task.title || `Task #${task.id}`}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                                    <Layers size={10} className="text-slate-400 shrink-0" />
                                    <span>{task.scope_name || task.work_plan_title || "General Work Plan/WBS"}</span>
                                  </div>
                                </td>

                                {/* Assignee */}
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                                    <User size={12} className="text-slate-400 shrink-0" />
                                    <span className="truncate max-w-[110px]" title={task.assigned_to_name}>
                                      {task.assigned_to_name || "Unassigned"}
                                    </span>
                                  </div>
                                </td>

                                {/* Priority */}
                                <td className="py-2.5 px-3">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${priorityBadge}`}>
                                    {task.priority || "MEDIUM"}
                                  </span>
                                </td>

                                {/* Schedule Dates */}
                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                  <div>{task.end_date ? String(task.end_date).split("T")[0] : "—"}</div>
                                  {task.start_date && (
                                    <div className="text-[10px] text-slate-400">
                                      Start: {String(task.start_date).split("T")[0]}
                                    </div>
                                  )}
                                </td>

                                {/* Progress */}
                                <td className="py-2.5 px-3 min-w-[90px]">
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          Number(task.completion_percent) >= 100
                                            ? "bg-emerald-500"
                                            : "bg-brand-500"
                                        }`}
                                        style={{ width: `${task.completion_percent || 0}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                                      {task.completion_percent || 0}%
                                    </span>
                                  </div>
                                </td>

                                {/* Status */}
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded border text-[10px] font-bold ${statusBadge}`}
                                  >
                                    {task.status}
                                  </span>
                                </td>

                                {/* Delay Log & SLA */}
                                <td className="py-2.5 px-4">
                                  {reasons.length > 0 ? (
                                    <div className="space-y-1">
                                      {reasons.map((r, rIdx) => (
                                        <div
                                          key={rIdx}
                                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-300 text-[11px] font-semibold"
                                        >
                                          <AlertTriangle size={11} className="text-amber-600 shrink-0" />
                                          <span>{r}</span>
                                        </div>
                                      ))}
                                      {isOverdue && (
                                        <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                                          <Clock size={10} /> {task.due_label}
                                        </div>
                                      )}
                                    </div>
                                  ) : isOverdue ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                                      <Clock size={11} /> Overdue: {task.due_label}
                                    </span>
                                  ) : isBlocked ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                                      <AlertOctagon size={11} /> Blocked / At Risk
                                    </span>
                                  ) : task.status === "COMPLETED" ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                      <CheckCircle2 size={12} /> Completed On Schedule
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">
                                      {task.due_label ? `✓ ${task.due_label}` : "✓ On Track"}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
