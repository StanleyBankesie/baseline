/**
 * @fileoverview DashboardPage component.
 * Executive ERP Dashboard displaying cross-modular BI, task execution velocity, and transport logistics analytics.
 */

import React from "react";
import { useAuth } from "../auth/AuthContext.jsx";
import { api } from "../api/client.js";

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = React.useState({
    sales: { total: 0, documents: 0 },
    purchase: { total: 0, documents: 0 },
    inventory: { items: 0, quantity: 0 },
    hr: { employees: 0 },
  });
  const [taskAnalytics, setTaskAnalytics] = React.useState(null);
  const [transportAnalytics, setTransportAnalytics] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        setError("");

        // Fetch BI summary, Task Execution, and Transport Analytics concurrently
        const [biRes, taskRes, transRes] = await Promise.allSettled([
          api.get("/bi/dashboards"),
          api.get("/projects/reports/task-execution"),
          api.get("/transport/reports/analytics")
        ]);

        if (mounted) {
          if (biRes.status === "fulfilled") {
            const data = biRes.value?.data?.summary || {};
            setSummary({
              sales: {
                total: Number(data?.sales?.total || 0),
                documents: Number(data?.sales?.documents || 0),
              },
              purchase: {
                total: Number(data?.purchase?.total || 0),
                documents: Number(data?.purchase?.documents || 0),
              },
              inventory: {
                items: Number(data?.inventory?.items || 0),
                quantity: Number(data?.inventory?.quantity || 0),
              },
              hr: {
                employees: Number(data?.hr?.employees || 0),
              },
            });
          }

          if (taskRes.status === "fulfilled") {
            setTaskAnalytics(taskRes.value?.data || null);
          }

          if (transRes.status === "fulfilled") {
            setTransportAnalytics(transRes.value?.data || null);
          }
        }
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load dashboard data");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    const interval = setInterval(() => {
      if (mounted) load();
    }, 15000); // Live polling every 15 seconds
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  /**
   * Formats a number as Ghanaian Cedi (GHS) currency.
   * @param {number|string} n - The number to format.
   * @returns {string} The formatted currency string.
   */
  const currency = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "GHS",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  const analytics = taskAnalytics?.analytics || {};
  const tasks = taskAnalytics?.items || [];
  const urgentOrOverdueTasks = tasks
    .filter((t) => t.due_status === "OVERDUE" || t.priority === "URGENT")
    .slice(0, 5);

  const tAnalytics = transportAnalytics?.analytics || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-brand dark:text-brand-300">
              Executive Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Cross-modular operational insights, project task execution, and transport fleet analytics.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
            OmniSuite BI 2.0
          </span>
        </div>
        <div className="card-body">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-600 dark:text-slate-400">
              Welcome back,{" "}
              <span className="font-semibold text-brand dark:text-brand-300">
                {user?.email}
              </span>
              .
            </p>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span>
            </div>
          </div>
          {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : null}
        </div>
      </div>

      {/* Primary Module Metric Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Sales (30 Days)
              </h3>
              <span className="badge-success">
                {loading ? "Loading" : "Updated"}
              </span>
            </div>
            <p className="text-2xl font-bold text-brand dark:text-brand-300">
              {currency(summary.sales.total)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {summary.sales.documents} invoices
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Purchases (30 Days)
              </h3>
              <span className="badge-success">
                {loading ? "Loading" : "Updated"}
              </span>
            </div>
            <p className="text-2xl font-bold text-brand dark:text-brand-300">
              {currency(summary.purchase.total)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {summary.purchase.documents} POs
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Inventory
              </h3>
              <span className="badge-info">
                {loading ? "Loading" : "Updated"}
              </span>
            </div>
            <p className="text-2xl font-bold text-brand dark:text-brand-300">
              {summary.inventory.items}
            </p>
            <p className="text-xs text-slate-500 mt-1">Items tracked</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Employees
              </h3>
              <span className="badge-info">
                {loading ? "Loading" : "Updated"}
              </span>
            </div>
            <p className="text-2xl font-bold text-brand dark:text-brand-300">
              {summary.hr.employees}
            </p>
            <p className="text-xs text-slate-500 mt-1">Active</p>
          </div>
        </div>
      </div>

      {/* Widget 1: Transport & Logistics Execution Analytics */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                Transport Module
              </span>
              <span className="text-xs text-slate-400">Fleet Operations</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              Transport & Fleet Execution Analytics
            </h2>
          </div>
          <a
            href="/transport/dashboard"
            className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-colors w-fit"
          >
            Full Transport Dashboard →
          </a>
        </div>

        {/* Transport Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Managed Trips
            </span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {loading ? "..." : tAnalytics.totalTrips || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {tAnalytics.inTransitTrips || 0} currently in-transit
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Trip Completion Rate
            </span>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {loading ? "..." : `${tAnalytics.completionRate || 0}%`}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {tAnalytics.onTimeRate || 0}% on-time arrival
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Fleet Readiness Rate
            </span>
            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {loading ? "..." : `${tAnalytics.fleetUtilizationRate || 0}%`}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {tAnalytics.availableVehicles || 0} ready in yard
            </p>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
              Net Route Profit
            </span>
            <p className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
              {loading ? "..." : `GHS ${(tAnalytics.netProfitability || 0).toLocaleString()}`}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              GHS {(tAnalytics.totalRevenue || 0).toLocaleString()} revenue
            </p>
          </div>
        </div>
      </div>

      {/* Widget 2: Task Management & Operational Execution Analytics */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                Project Management Module
              </span>
              <span className="text-xs text-slate-400">Execution Velocity</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
              Task Execution & Velocity Analytics
            </h2>
          </div>
          <a
            href="/project-management/reports/task-execution"
            className="px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors w-fit"
          >
            Full Task Analytics Report →
          </a>
        </div>

        {/* Task Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Tasks Managed
            </span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {loading ? "..." : analytics.totalTasks || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {analytics.completedTasks || 0} completed ({analytics.completionRate || 0}%)
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Completion Rate
            </span>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {loading ? "..." : `${analytics.completionRate || 0}%`}
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full"
                style={{ width: `${Math.min(100, analytics.completionRate || 0)}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Overdue SLA Risk
            </span>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {loading ? "..." : analytics.overdueTasks || 0}
            </p>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1">
              {analytics.overdueRate || 0}% breach rate
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              On-Time Performance
            </span>
            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {loading ? "..." : `${analytics.onTimeRate || 0}%`}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Deliverables met on schedule</p>
          </div>
        </div>

        {/* Visual Execution Progress Breakdown Bar */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            <span>Task Execution Status Breakdown</span>
            <span>
              {analytics.completedTasks || 0} Done / {(analytics.inProgressTasks || 0) + (analytics.pendingTasks || 0) + (analytics.blockedTasks || 0)} Active
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden flex">
            <div
              title="Completed"
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${analytics.totalTasks ? (analytics.completedTasks / analytics.totalTasks) * 100 : 0}%`
              }}
            />
            <div
              title="In Progress"
              className="bg-blue-500 h-full transition-all duration-500"
              style={{
                width: `${analytics.totalTasks ? (analytics.inProgressTasks / analytics.totalTasks) * 100 : 0}%`
              }}
            />
            <div
              title="Under Review"
              className="bg-purple-500 h-full transition-all duration-500"
              style={{
                width: `${analytics.totalTasks ? (analytics.reviewTasks / analytics.totalTasks) * 100 : 0}%`
              }}
            />
            <div
              title="Pending"
              className="bg-slate-400 h-full transition-all duration-500"
              style={{
                width: `${analytics.totalTasks ? (analytics.pendingTasks / analytics.totalTasks) * 100 : 0}%`
              }}
            />
            <div
              title="Blocked"
              className="bg-rose-500 h-full transition-all duration-500"
              style={{
                width: `${analytics.totalTasks ? (analytics.blockedTasks / analytics.totalTasks) * 100 : 0}%`
              }}
            />
          </div>

          <div className="flex flex-wrap gap-4 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Completed ({analytics.completedTasks || 0})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              In Progress ({analytics.inProgressTasks || 0})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
              Under Review ({analytics.reviewTasks || 0})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
              Pending ({analytics.pendingTasks || 0})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Blocked ({analytics.blockedTasks || 0})
            </span>
          </div>
        </div>

        {/* High Risk / Urgent Task Ticker */}
        {urgentOrOverdueTasks.length > 0 ? (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              ⚠️ Urgent & Overdue Action Items
            </h4>
            <div className="space-y-2">
              {urgentOrOverdueTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
                      {t.priority}
                    </span>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {t.task_name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 ml-2">
                        ({t.project_name})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      Assigned: {t.assigned_to_name}
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {t.due_label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
