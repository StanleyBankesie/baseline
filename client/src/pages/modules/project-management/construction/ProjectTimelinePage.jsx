/**
 * @file ProjectTimelinePage.jsx
 * @description Dedicated full page for Project Timeline — Master project schedule,
 * overall duration, work breakdown, phase specifications, and task checkpoints.
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
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

const statusBadge = (status) => {
  switch (status) {
    case "COMPLETED":   return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "IN_PROGRESS": return "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300";
    case "DELAYED":     return "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
    case "ON_HOLD":     return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    default:            return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  }
};

export default function ProjectTimelinePage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [scheduleData, setScheduleData] = useState({
    project: null,
    tasks: [],
    cpm: { forecastCompletionDate: "" },
    variance: { actualProgress: 0, scheduleVarianceDays: 0 },
    workPackages: [],
  });

  // Load projects list (no auto-selection)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/projects/projects", { params: { active: "all" } });
        setProjects(res.data?.items || []);
      } catch {
        toast.error("Failed to load projects");
      }
    })();
  }, []);

  // Load schedule data when project selected
  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      setScheduleData({ project: null, tasks: [], cpm: {}, variance: {}, workPackages: [] });
      return;
    }
    loadData();
  }, [selectedProjectId]);

  const loadData = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await api.get(`/construction/schedule/${selectedProjectId}`);
      const sched = res.data || {};
      setScheduleData(sched);
      setTasks(sched.tasks || []);
    } catch {
      try {
        const tRes = await api.get("/projects/tasks", { params: { project_id: selectedProjectId, active: "all" } });
        setTasks(tRes.data?.items || tRes.data?.tasks || []);
      } catch {
        toast.error("Failed to load timeline tasks");
      }
    } finally {
      setLoading(false);
    }
  };

  const { project, cpm, variance, workPackages } = scheduleData;

  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return tasks;
    const term = searchTerm.toLowerCase();
    return tasks.filter(t =>
      t.task_title?.toLowerCase().includes(term) ||
      t.title?.toLowerCase().includes(term) ||
      t.wbs_code?.toLowerCase().includes(term) ||
      t.assigned_to_name?.toLowerCase().includes(term)
    );
  }, [tasks, searchTerm]);

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
            <p className="text-slate-500 text-sm mt-0.5">
              Master project schedule, overall duration, work breakdown, and checkpoints
            </p>
          </div>
        </div>

        {/* Project Selector */}
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
            onClick={loadData}
            disabled={!selectedProjectId}
            className="btn btn-secondary h-10 px-3 rounded-xl inline-flex items-center gap-1.5 shrink-0"
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline text-xs font-medium">Refresh</span>
          </button>
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
          {/* Top Specification & Work Packages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Project Schedule Spec Card */}
            <div className="card p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Info size={16} className="text-brand-600" /> Project Schedule Specification
              </h2>
              <div className="grid grid-cols-2 gap-4 text-xs">
                {[
                  ["Project Name",       project?.project_name || "—"],
                  ["Project Code",       project?.project_code || "—"],
                  ["Project Manager",    project?.manager_name || "—"],
                  ["Working Calendar",   "6-Day (Mon – Sat)"],
                  ["Planned Start",      project?.start_date ? String(project.start_date).split("T")[0] : "—"],
                  ["Target Completion",  project?.end_date   ? String(project.end_date).split("T")[0]   : "—"],
                  ["Forecast Completion",cpm?.forecastCompletionDate || "Pending CPM"],
                  ["Schedule Status",    (variance?.scheduleVarianceDays || 0) >= 0 ? "On Track" : "Delayed"],
                ].map(([label, val]) => (
                  <div key={label}>
                    <span className="text-slate-400 block mb-0.5">{label}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-xs">{val}</span>
                  </div>
                ))}
              </div>
              {/* Overall progress bar */}
              <div className="pt-2">
                <div className="flex justify-between items-center text-xs font-semibold mb-1.5">
                  <span className="text-slate-600 dark:text-slate-300">Overall Physical Completion</span>
                  <span className="font-mono text-brand-600 dark:text-brand-400">{variance?.actualProgress || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, variance?.actualProgress || 0))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Work Packages Card */}
            <div className="card p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={16} className="text-brand-600" />
                Work Packages / Phases ({workPackages?.length || 0})
              </h2>
              {!workPackages?.length ? (
                <div className="p-8 text-center text-xs text-slate-400 italic">
                  No work packages defined. Tasks are scheduled directly under project deliverables.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table text-xs">
                    <thead><tr><th>Code</th><th>Work Package</th><th>Status</th></tr></thead>
                    <tbody>
                      {workPackages.map(wp => (
                        <tr key={wp.id}>
                          <td className="font-mono font-bold text-brand-600 dark:text-brand-400">{wp.package_code || "WP"}</td>
                          <td className="font-semibold text-slate-800 dark:text-slate-200">{wp.package_name}</td>
                          <td><span className="badge badge-secondary text-xs">{wp.status || "ACTIVE"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Task Schedule Summary Table */}
          <div className="card overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Task Timeline & Milestones
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {tasks.length} total tasks scheduled in project management
                </p>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter tasks..."
                  className="input pl-8 py-1.5 text-xs h-9 rounded-xl w-60"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <CalendarDays size={36} className="mx-auto text-slate-300" />
                <p className="text-slate-400 text-sm">No tasks match your search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table text-xs w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Task</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Start</th>
                      <th className="py-3 px-4">Due</th>
                      <th className="py-3 px-4 text-center">Duration</th>
                      <th className="py-3 px-4 text-center min-w-[130px]">Progress</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTasks.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-[240px]">
                          {t.wbs_code && (
                            <span className="font-mono text-brand-600 dark:text-brand-400 mr-1 text-[11px] block">
                              {t.wbs_code}
                            </span>
                          )}
                          <span className="truncate block">{t.task_title || t.title}</span>
                          {t.is_critical && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200 mt-0.5 inline-block">
                              CRITICAL
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {t.assigned_to_name || t.assignee_name || "Unassigned"}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {t.start_date ? String(t.start_date).split("T")[0] : "—"}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {t.end_date || t.due_date ? String(t.end_date || t.due_date).split("T")[0] : "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                          {t.duration_days ? `${t.duration_days}d` : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-brand-600 h-full rounded-full"
                                style={{ width: `${t.completion_percent || 0}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-xs w-8 text-right">
                              {t.completion_percent || 0}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${statusBadge(t.status)}`}>
                            {t.status || "NOT_STARTED"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
