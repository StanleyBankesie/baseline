/**
 * @file ScheduleMonitoringPage.jsx
 * @description Dedicated full page for Schedule Monitoring — EVM SPI metrics,
 * planned vs actual variance, delayed activities, and timeline recovery plans.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Zap,
  Flag,
  CalendarDays,
  Timer,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

export default function ScheduleMonitoringPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [scheduleData, setScheduleData] = useState({
    project: null,
    tasks: [],
    cpm: { forecastCompletionDate: "", projectDurationDays: 0 },
    variance: {
      actualProgress: 0,
      plannedProgress: 0,
      spi: 1.0,
      scheduleVarianceDays: 0,
      recoveryPlan: [],
    },
    eotClaims: [],
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
      setScheduleData({ project: null, tasks: [], cpm: {}, variance: {}, eotClaims: [] });
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
        toast.error("Failed to load monitoring data");
      }
    } finally {
      setLoading(false);
    }
  };

  const { project, cpm, variance, eotClaims } = scheduleData;
  const criticalCount = tasks.filter(t => t.is_critical).length;
  const delayedTasks = tasks.filter(t => t.status === "DELAYED");

  // KPI Stat cards — prominent as requested
  const kpiCards = [
    {
      label: "Total Tasks",
      value: tasks.length,
      sub: `${tasks.filter(t => t.status === "COMPLETED").length} Completed`,
      icon: <CalendarDays size={22} className="stroke-[2.5]" />,
      color: "bg-brand-900 dark:bg-brand-700",
    },
    {
      label: "Critical Activities",
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
              <TrendingUp size={24} className="text-brand-900 dark:text-brand-400" />
              Schedule Monitoring
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Planned vs actual progress, delayed activities, upcoming deadlines and schedule variance
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
            Please choose a project to inspect its schedule pace, variance metrics, SPI indicators, and delayed activities.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
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

          {/* Earned Value Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="card p-5 space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Earned Value SPI</span>
              <p className="text-3xl font-bold font-mono text-brand-600 dark:text-brand-400">{variance?.spi || 1.0}</p>
              <p className="text-xs text-slate-500">
                {(variance?.spi || 1.0) >= 1.0 ? "SPI ≥ 1.0 — On Track or Ahead of Schedule" : "SPI < 1.0 — Behind Target Pace"}
              </p>
            </div>
            <div className="card p-5 space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Planned vs Actual Delta</span>
              <p className="text-3xl font-bold font-mono text-slate-900 dark:text-white">
                {variance?.actualProgress || 0}% <span className="text-sm font-normal text-slate-400">vs {variance?.plannedProgress || 0}%</span>
              </p>
              <p className="text-xs text-slate-500">
                Net variance: {(Number(variance?.actualProgress || 0) - Number(variance?.plannedProgress || 0)).toFixed(1)}%
              </p>
            </div>
            <div className="card p-5 space-y-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target vs Forecast Handover</span>
              <p className="text-lg font-bold font-mono text-slate-900 dark:text-white">{cpm?.forecastCompletionDate || "Pending"}</p>
              <p className="text-xs text-slate-500">Contract End: {project?.end_date ? String(project.end_date).split("T")[0] : "TBD"}</p>
            </div>
          </div>

          {/* Delayed Tasks */}
          {delayedTasks.length > 0 && (
            <div className="card p-5 border-l-4 border-l-rose-500 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle size={16} /> Delayed Tasks ({delayedTasks.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {delayedTasks.map(t => (
                  <div key={t.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-rose-600">{t.wbs_code || `T-${t.id}`}</span>
                      <span className="font-mono text-slate-400">{t.completion_percent || 0}% Done</span>
                    </div>
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{t.task_title || t.title}</p>
                    <p className="text-slate-400">Assignee: {t.assigned_to_name || "Unassigned"}</p>
                    <p className="text-slate-400">Due: {t.end_date || t.due_date ? String(t.end_date || t.due_date).split("T")[0] : "—"}</p>
                    {t.reason_for_delay && <p className="text-rose-600 italic">{t.reason_for_delay}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recovery Plans */}
          <div className="card p-5 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Zap size={16} className="text-amber-500" /> Schedule Recovery &amp; Timeline Mitigation Plans
            </h2>
            {!variance?.recoveryPlan?.length ? (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Schedule is on track with acceptable buffers. No immediate timeline compression required.
              </p>
            ) : (
              <div className="space-y-3">
                {variance.recoveryPlan.map((plan, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <AlertCircle size={14} className={plan.severity === "HIGH" ? "text-rose-500" : "text-amber-500"} />
                        {plan.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        plan.severity === "HIGH" ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200" : "bg-amber-100 text-amber-700"
                      }`}>{plan.severity} PRIORITY</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{plan.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EOT Claims */}
          {eotClaims?.length > 0 && (
            <div className="card overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Flag size={15} className="text-amber-500" />
                <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                  Extension of Time (EOT) Claims ({eotClaims.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="table text-xs w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Claim #</th>
                      <th className="py-3 px-4">Delay Cause</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Days Requested</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {eotClaims.map(eot => (
                      <tr key={eot.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                          {eot.request_number || `EOT-${eot.id}`}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                          {eot.delay_cause || eot.reason}
                        </td>
                        <td className="py-3 px-4">
                          <span className="badge badge-secondary text-xs">{eot.delay_category || "CLIENT_EVENT"}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                          {eot.days_requested} days
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            eot.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                            eot.status === "REJECTED" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {eot.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
