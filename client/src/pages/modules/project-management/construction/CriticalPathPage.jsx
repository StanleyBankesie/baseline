/**
 * @file CriticalPathPage.jsx
 * @description Dedicated full page for Critical Path Method (CPM) — Forward/backward
 * pass schedule network, earliest/latest dates, float analysis, and longest path sequencing.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  CalendarDays,
  Timer,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

export default function CriticalPathPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [scheduleData, setScheduleData] = useState({
    project: null,
    tasks: [],
    cpm: {
      tasks: [],
      projectDurationDays: 0,
      criticalPathIds: [],
      criticalPathSequence: [],
      activitiesThreateningDeadline: [],
      forecastCompletionDate: "",
      hasCycle: false,
    },
    variance: {
      actualProgress: 0,
      plannedProgress: 0,
      spi: 1.0,
      scheduleVarianceDays: 0,
    },
  });

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

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      setScheduleData({ project: null, tasks: [], cpm: {}, variance: {} });
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
        toast.error("Failed to load critical path data");
      }
    } finally {
      setLoading(false);
    }
  };

  const { cpm, variance } = scheduleData;
  const criticalCount = tasks.filter(t => t.is_critical).length;

  // Prominent KPI Cards
  const kpiCards = [
    {
      label: "Total Tasks",
      value: tasks.length,
      sub: `${tasks.filter(t => t.status === "COMPLETED").length} Completed`,
      icon: <CalendarDays size={22} className="stroke-[2.5]" />,
      color: "bg-brand-900 dark:bg-brand-700",
    },
    {
      label: "Critical Path Activities",
      value: criticalCount || (cpm?.projectDurationDays ? `${cpm.projectDurationDays}d` : 0),
      sub: criticalCount > 0 ? "Zero float — must not delay" : "No critical path yet",
      icon: <AlertCircle size={22} className="stroke-[2.5]" />,
      color: criticalCount > 0 ? "bg-rose-600" : "bg-emerald-600",
    },
    {
      label: "Actual Progress",
      value: `${variance?.actualProgress || 0}%`,
      sub: `Planned: ${variance?.plannedProgress || 0}% · SPI: ${variance?.spi || 1.0}`,
      icon: <TrendingUp size={22} className="stroke-[2.5]" />,
      color: "bg-sky-600",
    },
    {
      label: "Schedule Variance",
      value: (variance?.scheduleVarianceDays || 0) < 0
        ? `${Math.abs(variance.scheduleVarianceDays)}d Late`
        : `${variance?.scheduleVarianceDays || 0}d Buffer`,
      sub: `Forecast: ${cpm?.forecastCompletionDate || "—"}`,
      icon: <Timer size={22} className="stroke-[2.5]" />,
      color: (variance?.scheduleVarianceDays || 0) < 0 ? "bg-amber-500" : "bg-emerald-600",
    },
  ];

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
              <Activity size={24} className="text-brand-900 dark:text-brand-400" />
              Critical Path Method (CPM)
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Activity network sequencing, earliest/latest dates, float analysis, and longest path
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
            Please select a project above to calculate its CPM network, identify zero-float tasks, and inspect earliest and latest milestones.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Circular dependency alert */}
          {cpm?.hasCycle && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-sm block mb-0.5">Circular Dependency Detected in Activity Network</span>
                The schedule contains a circular predecessor loop. Please inspect task predecessors in Task Dependencies to resolve.
              </div>
            </div>
          )}

          {/* Prominent KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((kpi, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight">
                    {kpi.label}
                  </p>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md shrink-0 ${kpi.color}`}>
                    {kpi.icon}
                  </div>
                </div>
                <div>
                  <p className="text-3xl font-black font-mono text-slate-900 dark:text-white leading-none">
                    {kpi.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5 font-medium">{kpi.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Longest Path Dependency Sequence */}
          <div className="card p-5 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Activity size={16} className="text-rose-600" /> Longest Path Dependency Sequence
              </h2>
              <span className="text-xs font-mono text-rose-600 dark:text-rose-400 font-bold">
                {cpm?.criticalPathSequence?.length || 0} sequential tasks · {cpm?.projectDurationDays || 0} working days
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Any delay on these tasks directly delays overall project completion. Zero total float — must not slip.
            </p>
            <div className="overflow-x-auto py-2">
              <div className="flex items-center gap-2 min-w-max">
                {!cpm?.criticalPathSequence?.length ? (
                  <div className="text-xs text-slate-400 italic p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    No critical path computed. The system calculates CPM automatically from task predecessor links.
                  </div>
                ) : (
                  cpm.criticalPathSequence.map((task, idx) => (
                    <React.Fragment key={task.id}>
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs min-w-[170px] shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                            {task.wbs_code || `T-${task.id}`}
                          </span>
                          <span className="badge badge-error text-xs px-1.5">TF: 0d</span>
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white truncate" title={task.task_title}>
                          {task.task_title}
                        </p>
                        <div className="mt-2 text-[11px] text-slate-500 font-mono flex justify-between">
                          <span>{task.duration_days}d</span>
                          <span>{task.early_finish}</span>
                        </div>
                      </div>
                      {idx < cpm.criticalPathSequence.length - 1 && (
                        <ArrowRight size={16} className="text-rose-400 flex-shrink-0" />
                      )}
                    </React.Fragment>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Activities Threatening Deadline */}
          {cpm?.activitiesThreateningDeadline?.length > 0 && (
            <div className="card p-5 border-l-4 border-l-rose-500 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle size={16} /> Activities Threatening Deadline ({cpm.activitiesThreateningDeadline.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cpm.activitiesThreateningDeadline.map(t => (
                  <div key={t.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-mono font-bold text-rose-600">{t.wbs_code || `T-${t.id}`}</span>
                      <span className="font-mono text-slate-400">{t.completion_percent || 0}% Done</span>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{t.task_title}</p>
                    <p className="text-slate-400">Assigned: {t.assigned_to_name || "Unassigned"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full CPM Table */}
          <div className="card overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                  Early / Late Schedule Pass &amp; Float Calculations
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Early Start (ES), Early Finish (EF), Late Start (LS), Late Finish (LF), Total Float (TF), and Free Float (FF)
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">{tasks.length} activities</span>
            </div>

            {tasks.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <CalendarDays size={36} className="mx-auto text-slate-300" />
                <p className="text-slate-400 text-sm">No tasks assigned to this project to calculate CPM network.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table text-xs w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">WBS / Task</th>
                      <th className="py-3 px-4 text-center">Duration</th>
                      <th className="py-3 px-4 text-center">Early Start</th>
                      <th className="py-3 px-4 text-center">Early Finish</th>
                      <th className="py-3 px-4 text-center">Late Start</th>
                      <th className="py-3 px-4 text-center">Late Finish</th>
                      <th className="py-3 px-4 text-center">Total Float</th>
                      <th className="py-3 px-4 text-center">Free Float</th>
                      <th className="py-3 px-4 text-center">Path</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tasks.map(t => (
                      <tr key={t.id} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${t.is_critical ? "bg-rose-50/40 dark:bg-rose-950/20" : ""}`}>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-[200px]">
                          {t.wbs_code && (
                            <span className="font-mono text-brand-600 dark:text-brand-400 text-[11px] block">
                              {t.wbs_code}
                            </span>
                          )}
                          <span className="truncate block">{t.task_title || t.title}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {t.duration_days ? `${t.duration_days}d` : "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-sky-600 dark:text-sky-400">
                          {t.early_start || "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-sky-600 dark:text-sky-400">
                          {t.early_finish || "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-purple-600 dark:text-purple-400">
                          {t.late_start || "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-purple-600 dark:text-purple-400">
                          {t.late_finish || "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          <span className={t.total_float === 0 ? "text-rose-600 font-bold" : "text-emerald-600"}>
                            {t.total_float != null ? `${t.total_float}d` : "—"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {t.free_float != null ? `${t.free_float}d` : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {t.is_critical ? (
                            <span className="badge badge-error text-xs px-2 py-0.5">CRITICAL</span>
                          ) : (
                            <span className="badge badge-secondary text-xs px-2 py-0.5">FLOAT</span>
                          )}
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
