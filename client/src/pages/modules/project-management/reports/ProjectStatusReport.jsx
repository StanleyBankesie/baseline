/**
 * @fileoverview ProjectStatusReport.jsx
 * Comprehensive Live Project Status & Health Report for OmniSuite ERP.
 * Pulls live real-time metrics across Project Work Plans/WBS, Milestones, Direct Expenses,
 * Income, and Schedule SLA Performance.
 */

import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Layers,
  Target,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  ExternalLink,
  Download,
  Search,
  Filter,
  ShieldCheck,
  Flag,
  Briefcase,
  Building2,
  User,
  ChevronDown,
  ChevronRight,
  BarChart3,
  ListTodo
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

const statusStyles = {
  PLANNING: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  ON_HOLD: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  COMPLETED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  CANCELLED: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
};

const progressColor = (pct) => {
  if (pct >= 100) return "from-emerald-500 to-emerald-400";
  if (pct >= 75) return "from-blue-500 to-blue-400";
  if (pct >= 50) return "from-brand-600 to-brand-500";
  if (pct >= 25) return "from-amber-500 to-amber-400";
  return "from-slate-400 to-slate-300";
};

export default function ProjectStatusReport() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({ items: [], projects: [], summary: {} });
  
  // Filter states
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedHealth, setSelectedHealth] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedProjectId, setExpandedProjectId] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (selectedProjectId) {
        const params = { project_id: selectedProjectId };
        if (selectedStatus !== "ALL") params.status = selectedStatus;
        const res = await api.get("/projects/reports/project-status", { params });
        setReportData(res.data || { items: [], projects: [], summary: {} });
      } else {
        // No project selected: only load projects list for the dropdown; no data items or summary!
        const pRes = await api.get("/projects/projects", { params: { active: "all" } });
        const prjs = pRes.data?.items || [];
        setReportData({ items: [], projects: prjs, summary: {} });
      }
    } catch (e) {
      console.error("Failed to load project status report:", e);
      toast.error("Failed to load project status report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedProjectId, selectedStatus]);

  // Client-side search and health filtering
  const filteredProjects = useMemo(() => {
    const list = reportData.items || [];
    return list.filter((p) => {
      const term = searchTerm.toLowerCase().trim();
      const matchSearch =
        !term ||
        (p.project_name || "").toLowerCase().includes(term) ||
        (p.project_code || "").toLowerCase().includes(term) ||
        (p.client_name || "").toLowerCase().includes(term) ||
        (p.manager_name || "").toLowerCase().includes(term);

      const matchHealth =
        selectedHealth === "ALL" || p.schedule_status === selectedHealth;

      return matchSearch && matchHealth;
    });
  }, [reportData.items, searchTerm, selectedHealth]);

  const summary = reportData.summary || {};

  const handleExportCSV = () => {
    if (!filteredProjects.length) return;
    const headers = [
      "Project Code",
      "Project Name",
      "Status",
      "Schedule Health",
      "Client",
      "Project Manager",
      "Completion %",
      "Currency",
      "Approved Budget",
      "Actual Expenses",
      "Remaining Budget",
      "Burn Rate %",
      "Total Invoiced/Income",
      "Total Tasks",
      "Completed Tasks",
      "Overdue Tasks",
      "Blocked Tasks",
      "Total Milestones",
      "Achieved Milestones",
      "Planned Start",
      "Planned End"
    ];

    const rows = filteredProjects.map((p) => [
      `"${p.project_code || ""}"`,
      `"${(p.project_name || "").replace(/"/g, '""')}"`,
      p.project_status || "PLANNING",
      p.schedule_status_label || "On Track",
      `"${(p.client_name || "").replace(/"/g, '""')}"`,
      `"${(p.manager_name || "").replace(/"/g, '""')}"`,
      `${p.completion_percent || p.avg_task_completion || 0}%`,
      p.currency || "GHS",
      Number(p.budget || 0).toFixed(2),
      Number(p.actual_expenses || 0).toFixed(2),
      Number(p.remaining_budget || 0).toFixed(2),
      `${p.burn_rate_pct || 0}%`,
      Number(p.total_income || 0).toFixed(2),
      p.total_tasks || 0,
      p.completed_tasks || 0,
      p.overdue_tasks || 0,
      p.blocked_tasks || 0,
      p.total_milestones || 0,
      p.achieved_milestones || 0,
      p.start_date ? String(p.start_date).split("T")[0] : "",
      p.end_date ? String(p.end_date).split("T")[0] : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Project_Status_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 pb-16 print:p-0 print:max-w-none">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3.5">
          <Link
            to="/project-management?section=Reports%20%26%20Analytics"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs shrink-0"
            title="Back to Reports"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-brand-950/40 dark:to-indigo-950/30 text-brand-900 dark:text-brand-300 border border-brand-200/50 dark:border-brand-800/50 shadow-xs shrink-0">
            <BarChart3 size={24} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Comprehensive Project Status Report
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
              Live portfolio overview: Work Plan/WBS progress, financial burn rate, milestone achievements, and schedule risk
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="btn btn-secondary h-9 px-3 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold shrink-0"
            title="Refresh Live Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!filteredProjects.length}
            className="btn btn-secondary h-9 px-3 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold shrink-0"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary h-9 px-3.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs"
          >
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ── 2. Top Executive Summary KPI Bar (Live Rollups) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Projects */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Projects</span>
            <Layers size={16} className="text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {summary.total_projects || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active portfolio count</div>
        </div>

        {/* Avg Completion */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Avg Completion</span>
            <Target size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {summary.avg_completion || 0}%
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Number(summary.avg_completion || 0))}%` }}
            />
          </div>
        </div>

        {/* Approved Budget */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Budget</span>
            <Wallet size={16} className="text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 truncate">
            GH₵ {Number(summary.total_budget || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Approved capital plan</div>
        </div>

        {/* Direct Expenses */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Actual Expenses</span>
            <TrendingUp size={16} className="text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate">
            GH₵ {Number(summary.total_expenses || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Direct costs to date</div>
        </div>

        {/* Schedule Health */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Schedule Status</span>
            <Clock size={16} className="text-brand-600" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
              {summary.on_track_projects || 0} OK
            </span>
            {(summary.at_risk_projects > 0 || summary.delayed_projects > 0) && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                {(summary.at_risk_projects || 0) + (summary.delayed_projects || 0)} Delayed
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">SLA delivery health</div>
        </div>

        {/* Tasks SLA */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Work Plan/WBS Tasks</span>
            <ListTodo size={16} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {summary.total_completed_tasks || 0} / {summary.total_tasks || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {summary.total_overdue_tasks > 0 ? (
              <span className="text-rose-600 font-bold inline-flex items-center gap-1">
                <AlertTriangle size={12} /> {summary.total_overdue_tasks} overdue
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold">All tasks on schedule</span>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Filter & Controls Bar ── */}
      <div className="card p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs print:hidden">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            <input
              type="text"
              placeholder="Search by code, project, client, or manager..."
              className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Project Selector */}
          <select
            className="h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 min-w-[200px] max-w-[300px] focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all shrink-0 cursor-pointer"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            <option value="">-- Select Project --</option>
            {(reportData.projects || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_code ? `${p.project_code} - ` : ""}{p.project_name}
              </option>
            ))}
          </select>

          {/* Project Status Filter */}
          <select
            className="h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 min-w-[130px] focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all shrink-0 cursor-pointer"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PLANNING">Planning</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Schedule Health Filter */}
          <select
            className="h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 min-w-[140px] focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all shrink-0 cursor-pointer"
            value={selectedHealth}
            onChange={(e) => setSelectedHealth(e.target.value)}
          >
            <option value="ALL">All Health Ratings</option>
            <option value="ON_TRACK">On Track</option>
            <option value="AT_RISK">At Risk</option>
            <option value="DELAYED">Schedule Delayed</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Clear Filters Button if any active */}
          {(selectedProjectId || selectedStatus !== "ALL" || selectedHealth !== "ALL" || searchTerm) && (
            <button
              onClick={() => {
                setSelectedProjectId("");
                setSelectedStatus("ALL");
                setSelectedHealth("ALL");
                setSearchTerm("");
              }}
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 ml-auto shrink-0"
            >
              Reset Filters
            </button>
          )}

          <div className="ml-auto text-xs font-mono font-bold text-slate-500 shrink-0">
            {filteredProjects.length} project(s) displayed
          </div>
        </div>
      </div>

      {/* ── 4. Main Comprehensive Projects Table ── */}
      <div className="card bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Project &amp; Client</th>
                <th className="py-3 px-3">Status &amp; Health</th>
                <th className="py-3 px-3 text-center">Progress %</th>
                <th className="py-3 px-3">Work Plan/WBS Tasks</th>
                <th className="py-3 px-3">Milestones</th>
                <th className="py-3 px-3 text-right">Budget</th>
                <th className="py-3 px-3 text-right">Actual Expenses</th>
                <th className="py-3 px-3 text-right">Burn Rate</th>
                <th className="py-3 px-4 text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-slate-400 text-sm">
                    <RefreshCw className="animate-spin inline-block mr-2" size={16} />
                    Loading comprehensive project status report...
                  </td>
                </tr>
              ) : !selectedProjectId ? (
                <tr>
                  <td colSpan="9" className="py-20 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-900 dark:text-brand-300 mx-auto mb-3 shadow-xs">
                      <BarChart3 size={28} />
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">No Project Selected</div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Please select a project from the dropdown above to view its comprehensive status report, Work Plan/WBS execution, and financials.
                    </p>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center text-slate-400 text-sm">
                    No project status records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const pct = Math.round(Number(p.completion_percent || p.avg_task_completion || 0));
                  const budget = Number(p.budget || 0);
                  const actual = Number(p.actual_expenses || 0);
                  const burnRate = Number(p.burn_rate_pct || 0);
                  const isExpanded = expandedProjectId === p.id;

                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Project & Client */}
                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {p.project_name}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span className="font-semibold text-brand-700 dark:text-brand-300">
                              #{p.project_code}
                            </span>
                            {p.client_name && (
                              <span>• Client: {p.client_name}</span>
                            )}
                            {p.manager_name && (
                              <span>• Lead: {p.manager_name}</span>
                            )}
                          </div>
                        </td>

                        {/* Status & Health */}
                        <td className="py-3.5 px-3 min-w-[130px]">
                          <div className="space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusStyles[p.project_status] || statusStyles.PLANNING}`}>
                              {p.project_status || "PLANNING"}
                            </span>
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                  p.schedule_status === "DELAYED"
                                    ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                                    : p.schedule_status === "AT_RISK"
                                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                                }`}
                              >
                                {p.schedule_status === "DELAYED" && <AlertTriangle size={10} />}
                                {p.schedule_status === "AT_RISK" && <AlertCircle size={10} />}
                                {p.schedule_status === "ON_TRACK" && <CheckCircle2 size={10} />}
                                {p.schedule_status_label || "On Track"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="py-3.5 px-3 text-center min-w-[110px]">
                          <div className="space-y-1">
                            <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${progressColor(pct)}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{pct}%</span>
                          </div>
                        </td>

                        {/* Work Plan/WBS Tasks */}
                        <td className="py-3.5 px-3 min-w-[140px]">
                          <div className="space-y-0.5 text-[11px]">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {p.completed_tasks || 0} of {p.total_tasks || 0} Done
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                              <span>{p.in_progress_tasks || 0} active</span>
                              {Number(p.overdue_tasks || 0) > 0 && (
                                <span className="text-rose-600 font-bold inline-flex items-center gap-0.5">
                                  <AlertTriangle size={10} /> {p.overdue_tasks} late
                                </span>
                              )}
                              {Number(p.blocked_tasks || 0) > 0 && (
                                <span className="text-amber-600 font-bold inline-flex items-center gap-0.5">
                                  <AlertCircle size={10} /> {p.blocked_tasks} blk
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Milestones */}
                        <td className="py-3.5 px-3 min-w-[110px]">
                          {Number(p.total_milestones || 0) > 0 ? (
                            <div className="space-y-0.5 text-[11px]">
                              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                <Flag size={11} className="text-brand-600" />
                                <span>{p.achieved_milestones || 0} / {p.total_milestones}</span>
                              </div>
                              {Number(p.overdue_milestones || 0) > 0 && (
                                <span className="text-[10px] text-rose-600 font-bold block">
                                  {p.overdue_milestones} overdue
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Approved Budget */}
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200 min-w-[100px]">
                          {p.currency} {budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Actual Expenses */}
                        <td className="py-3.5 px-3 text-right font-mono min-w-[110px]">
                          <span className={`font-bold ${actual > budget && budget > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                            {p.currency} {actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Burn Rate */}
                        <td className="py-3.5 px-3 text-right min-w-[90px]">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              burnRate > 100
                                ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                                : burnRate > 85
                                ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            {burnRate}%
                          </span>
                        </td>

                        {/* Quick Actions */}
                        <td className="py-3.5 px-4 text-center min-w-[140px]">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              to={`/project-management/gantt?projectId=${p.id}`}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                              title="Open Gantt Chart"
                            >
                              <Calendar size={13} />
                            </Link>
                            <Link
                              to={`/project-management/cost-control`}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                              title="Cost Control & Budget"
                            >
                              <DollarSign size={13} />
                            </Link>
                            <Link
                              to={`/project-management/reports/task-execution?projectId=${p.id}`}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                              title="Task Execution & Delay Log"
                            >
                              <ListTodo size={13} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isExpanded
                                  ? "bg-brand-50 border-brand-300 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
                                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                              }`}
                              title={isExpanded ? "Collapse Details" : "Expand Live Details"}
                            >
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Live Summary Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                          <td colSpan="9" className="p-4 sm:p-5">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                              {/* Schedule & Dates */}
                              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block text-brand-600">
                                  Schedule Timelines
                                </span>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                  <span>Planned Start:</span>
                                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                    {p.start_date ? String(p.start_date).split("T")[0] : "—"}
                                  </span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                  <span>Planned Completion:</span>
                                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                    {p.end_date ? String(p.end_date).split("T")[0] : "—"}
                                  </span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                  <span>Est. Hours:</span>
                                  <span className="font-mono">{Number(p.total_estimated_hours || 0).toFixed(1)} hrs</span>
                                </div>
                              </div>

                              {/* Financial Breakdown */}
                              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block text-emerald-600">
                                  Financial Position
                                </span>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                  <span>Remaining Budget:</span>
                                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    {p.currency} {Number(p.remaining_budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                  <span>Total Income / Billings:</span>
                                  <span className="font-mono font-semibold">
                                    {p.currency} {Number(p.total_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                  <span>Budget Status:</span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {p.budget_status_label}
                                  </span>
                                </div>
                              </div>

                              {/* Task Distribution */}
                              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block text-purple-600">
                                  Work Plan/WBS Breakdown
                                </span>
                                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                  <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 font-semibold flex justify-between">
                                    <span>Done:</span>
                                    <span>{p.completed_tasks || 0}</span>
                                  </div>
                                  <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 font-semibold flex justify-between">
                                    <span>In Prog:</span>
                                    <span>{p.in_progress_tasks || 0}</span>
                                  </div>
                                  <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 font-semibold flex justify-between">
                                    <span>Pending:</span>
                                    <span>{p.pending_tasks || 0}</span>
                                  </div>
                                  <div className="p-1.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 font-semibold flex justify-between">
                                    <span>Overdue:</span>
                                    <span>{p.overdue_tasks || 0}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Variations & Milestones */}
                              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5">
                                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] block text-amber-600">
                                  Governance &amp; Controls
                                </span>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                  <span>Approved Variations:</span>
                                  <span className="font-mono font-semibold">
                                    {p.approved_variations_count || 0} ({p.currency} {Number(p.approved_variations_amount || 0).toLocaleString()})
                                  </span>
                                </div>
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                  <span>Milestones Achieved:</span>
                                  <span className="font-semibold text-emerald-600">
                                    {p.achieved_milestones || 0} of {p.total_milestones || 0}
                                  </span>
                                </div>
                                <div className="pt-1">
                                  <Link
                                    to={`/project-management/reports/task-execution?projectId=${p.id}`}
                                    className="text-[11px] font-bold text-brand-600 hover:underline inline-flex items-center gap-1"
                                  >
                                    View Task Delays Log <ExternalLink size={11} />
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
