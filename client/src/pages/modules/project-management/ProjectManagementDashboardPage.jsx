/**
 * @file ProjectManagementDashboardPage.jsx
 * @description Enterprise-Grade Project Management Portfolio Dashboard for OmniSuite ERP.
 * Features:
 *  1. Cost = Comparative Bar Chart (Budget vs. Actual Spent vs. Remaining)
 *  2. Tasks = Interactive Donut Chart (Pending, In-Progress, Complete, Blocked, Cancelled)
 *  3. Progress = Portfolio & Per-Project Percentage Progress Bars with Milestone Health
 *  4. Workload = Horizontal Multi-Segment Bar Chart (Assignee Resource Capacity & Tasks)
 *  5. Project Health = 2D Bubble Chart (Time/Schedule % vs. Cost % vs. Budget Radius & Health)
 *  6. Enterprise Earned Value Management (EVM) Performance Matrix (PV, EV, AC, CPI, SPI, CV, SV)
 *  7. Risk & Threat Exposure Integration (Live PM Risk telemetry)
 *  8. Project Filter & Drilldown Selector
 */

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Briefcase,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Users,
  Target,
  BarChart3,
  PieChart,
  Layers,
  ChevronRight,
  Filter,
  RefreshCw,
  Sparkles,
  Info,
  Calendar,
  AlertOctagon,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { api } from "../../../api/client.js";
import {
  DashboardPageShell,
  MetricCard,
  SectionCard,
  HorizontalBarList,
  RecordsTable,
  formatCurrency,
  formatDate,
  formatNumber,
  groupCounts,
  sumBy,
} from "../../../components/dashboard/ModuleDashboardWidgets.jsx";

// ─────────────────────────────────────────────────────────────
// 1. COST COMPARATIVE BAR CHART (SVG)
// ─────────────────────────────────────────────────────────────
function CostBarChart({ data = [], height = 280 }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-xs text-slate-400">
        No project cost data available.
      </div>
    );
  }

  // Calculate scales
  const maxVal = Math.max(
    ...data.map((d) => Math.max(Number(d.budget || 0), Number(d.spent || 0))),
    1000
  );

  const chartHeight = height - 60; // account for labels
  const barGroupWidth = Math.max(60, Math.min(110, 600 / Math.max(1, data.length)));

  return (
    <div className="space-y-4">
      {/* Legend & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 dark:bg-slate-300"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Budget</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Actual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Overrun</span>
          </div>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative overflow-x-auto pb-2">
        <svg
          className="w-full overflow-visible"
          style={{ minWidth: `${Math.max(450, data.length * 80)}px`, height: `${height}px` }}
        >
          {/* Background Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = chartHeight - pct * chartHeight + 10;
            const valLabel = Math.round(maxVal * pct);
            return (
              <g key={idx}>
                <line
                  x1="50"
                  y1={y}
                  x2="100%"
                  y2={y}
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-800/80 stroke-dasharray-2"
                />
                <text
                  x="45"
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 font-mono"
                >
                  {valLabel >= 1000 ? `${(valLabel / 1000).toFixed(0)}k` : valLabel}
                </text>
              </g>
            );
          })}

          {/* Bar Groups */}
          {data.map((item, idx) => {
            const groupX = 65 + idx * barGroupWidth;
            const budget = Number(item.budget || 0);
            const spent = Number(item.spent || 0);
            const isOverrun = spent > budget && budget > 0;

            const budgetH = Math.max(3, (budget / maxVal) * chartHeight);
            const spentH = Math.max(3, (spent / maxVal) * chartHeight);

            const budgetY = chartHeight - budgetH + 10;
            const spentY = chartHeight - spentH + 10;

            const isHovered = hovered?.id === item.id;

            return (
              <g
                key={item.id || idx}
                onMouseEnter={() => setHovered(item)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer transition-opacity"
                opacity={hovered && !isHovered ? 0.45 : 1}
              >
                {/* Budget Bar */}
                <rect
                  x={groupX}
                  y={budgetY}
                  width="18"
                  height={budgetH}
                  rx="3"
                  className="fill-slate-900 dark:fill-slate-400 transition-all hover:brightness-110"
                />

                {/* Spent Bar */}
                <rect
                  x={groupX + 22}
                  y={spentY}
                  width="18"
                  height={spentH}
                  rx="3"
                  className={`${
                    isOverrun ? "fill-rose-500" : "fill-emerald-500"
                  } transition-all hover:brightness-110`}
                />

                {/* X-Axis Project Label */}
                <text
                  x={groupX + 20}
                  y={chartHeight + 28}
                  textAnchor="middle"
                  className="text-[10px] font-semibold fill-slate-600 dark:fill-slate-300"
                >
                  {item.shortName || (item.name ? item.name.slice(0, 8) + "…" : `P${idx + 1}`)}
                </text>
                <text
                  x={groupX + 20}
                  y={chartHeight + 42}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  {item.code || ""}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Card */}
        {hovered && (
          <div className="absolute top-2 right-4 bg-slate-900 text-white rounded-xl shadow-xl p-3 text-xs pointer-events-none z-10 border border-slate-700/60 max-w-xs animate-in fade-in">
            <div className="font-bold text-sm text-slate-100">{hovered.name}</div>
            <div className="text-[10px] text-slate-400 font-mono mb-2">{hovered.code}</div>
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Approved Budget:</span>
                <span className="font-semibold">{formatCurrency(hovered.budget)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Actual Spent:</span>
                <span className={`font-semibold ${hovered.spent > hovered.budget ? "text-rose-400" : "text-emerald-400"}`}>
                  {formatCurrency(hovered.spent)}
                </span>
              </div>
              <div className="flex justify-between gap-4 pt-1 border-t border-slate-800">
                <span className="text-slate-400">Remaining Balance:</span>
                <span className="font-semibold">{formatCurrency(Math.max(0, hovered.budget - hovered.spent))}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Budget Consumed:</span>
                <span className="font-bold">
                  {hovered.budget > 0 ? ((hovered.spent / hovered.budget) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. TASKS DONUT CHART (SVG)
// ─────────────────────────────────────────────────────────────
function TasksDonutChart({ taskCounts = {}, total = 0 }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  const segments = useMemo(() => {
    const raw = [
      { key: "COMPLETED", label: "Completed", count: Number(taskCounts.COMPLETED || 0), color: "#10b981", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
      { key: "IN_PROGRESS", label: "In Progress", count: Number(taskCounts.IN_PROGRESS || 0), color: "#3b82f6", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
      { key: "PENDING", label: "Pending / To-Do", count: Number(taskCounts.PENDING || 0), color: "#f59e0b", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
      { key: "BLOCKED", label: "Blocked / On Hold", count: Number(taskCounts.BLOCKED || 0), color: "#ef4444", badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
      { key: "CANCELLED", label: "Cancelled", count: Number(taskCounts.CANCELLED || 0), color: "#94a3b8", badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
    ].filter((s) => s.count > 0);

    const safeTotal = raw.reduce((sum, s) => sum + s.count, 0) || 1;
    let accumulatedAngle = 0;

    return raw.map((seg) => {
      const pct = (seg.count / safeTotal) * 100;
      const angle = (seg.count / safeTotal) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;
      return {
        ...seg,
        pct: pct.toFixed(1),
        startAngle,
        endAngle: accumulatedAngle,
      };
    });
  }, [taskCounts]);

  const totalCalculated = segments.reduce((sum, s) => sum + s.count, 0);
  const completedCount = taskCounts.COMPLETED || 0;
  const completionRate = totalCalculated > 0 ? ((completedCount / totalCalculated) * 100).toFixed(0) : 0;

  // SVG Geometry Constants
  const size = 220;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let strokeOffset = 0;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-2">
      {/* SVG Donut Circle */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg width={size} height={size} className="overflow-visible transform -rotate-90">
          {/* Background Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800"
          />

          {/* Slices */}
          {segments.map((seg) => {
            const dashLength = (Number(seg.pct) / 100) * circumference;
            const currentOffset = strokeOffset;
            strokeOffset -= dashLength;
            const isHovered = hoveredSlice === seg.key;

            return (
              <circle
                key={seg.key}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={currentOffset}
                onMouseEnter={() => setHoveredSlice(seg.key)}
                onMouseLeave={() => setHoveredSlice(null)}
                className="transition-all duration-300 cursor-pointer"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Center Text KPI */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-3xl font-black text-slate-900 dark:text-slate-100">
            {completionRate}%
          </span>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Completed
          </span>
          <span className="text-[10px] text-slate-500 font-medium">
            {completedCount} of {totalCalculated} tasks
          </span>
        </div>
      </div>

      {/* Legend & Breakdown Pills */}
      <div className="flex-1 w-full space-y-2.5">
        {segments.map((seg) => {
          const isHovered = hoveredSlice === seg.key;
          return (
            <div
              key={seg.key}
              onMouseEnter={() => setHoveredSlice(seg.key)}
              onMouseLeave={() => setHoveredSlice(null)}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                isHovered
                  ? "bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 shadow-xs"
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }}></span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {seg.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {seg.count}
                </span>
                <span className="text-[10px] text-slate-400">({seg.pct}%)</span>
              </div>
            </div>
          );
        })}

        {segments.length === 0 && (
          <div className="text-xs text-slate-400 text-center py-6">
            No registered project tasks.
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. PROGRESS PERCENTAGE BAR (PORTFOLIO & PROJECT LEVEL)
// ─────────────────────────────────────────────────────────────
function ProgressPercentageBarSection({ portfolioAvg = 0, projects = [] }) {
  return (
    <div className="space-y-4">
      {/* Portfolio Master Progress Bar */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-brand-900/10 via-indigo-900/10 to-emerald-900/10 border border-slate-200 dark:border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Target size={14} className="text-indigo-600" /> Portfolio Completion
          </span>
          <span className="text-base font-black text-brand-900 dark:text-brand-300">
            {Number(portfolioAvg).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-900 via-indigo-600 to-emerald-500 transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(2, Number(portfolioAvg)))}%` }}
          ></div>
        </div>
      </div>

      {/* Per-Project Progress Percentage Breakdown */}
      <div className="space-y-2.5">

        {projects.slice(0, 6).map((p) => {
          const comp = Number(p.completion_percent || 0);
          let toneColor = "bg-rose-500";
          let statusBadge = "bg-rose-50 text-rose-700 border-rose-200";
          if (comp >= 80) {
            toneColor = "bg-emerald-500";
            statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
          } else if (comp >= 40) {
            toneColor = "bg-brand-600";
            statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
          } else if (comp >= 15) {
            toneColor = "bg-amber-500";
            statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
          }

          return (
            <div key={p.id} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-brand-900 dark:text-brand-400 font-bold">{p.project_code || `PRJ-${p.id}`}</span>
                  <span className="text-slate-800 dark:text-slate-200 line-clamp-1">{p.project_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                    {p.project_status || "ACTIVE"}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{comp.toFixed(1)}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${toneColor} transition-all duration-500 rounded-full`}
                  style={{ width: `${Math.min(100, Math.max(3, comp))}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Start: {p.start_date ? String(p.start_date).slice(0, 10) : "—"}</span>
                <span>Target Due: {p.end_date ? String(p.end_date).slice(0, 10) : "—"}</span>
              </div>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="text-xs text-slate-400 text-center py-4">No active projects found.</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. WORKLOAD HORIZONTAL BAR CHART (RESOURCE ALLOCATION)
// ─────────────────────────────────────────────────────────────
function WorkloadHorizontalBarChart({ tasks = [] }) {
  const workloadByAssignee = useMemo(() => {
    const map = new Map();

    (tasks || []).forEach((t) => {
      const name = (t.assigned_to_name || t.assigned_to || "Unassigned").trim();
      if (!map.has(name)) {
        map.set(name, {
          name,
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          estHours: 0,
        });
      }
      const entry = map.get(name);
      entry.total += 1;
      entry.estHours += Number(t.estimated_hours || 0);

      const st = String(t.status || "").toUpperCase();
      if (st === "COMPLETED") entry.completed += 1;
      else if (st === "IN_PROGRESS") entry.inProgress += 1;
      else entry.pending += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [tasks]);

  const maxTasks = Math.max(...workloadByAssignee.map((w) => w.total), 1);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
        <span className="text-slate-500">Resource Workload Distribution</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] text-slate-500">Done</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <span className="text-[11px] text-slate-500">In Progress</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-[11px] text-slate-500">Pending</span>
          </div>
        </div>
      </div>

      {/* Horizontal Bar List */}
      <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
        {workloadByAssignee.map((item, idx) => {
          const isUnassigned = item.name === "Unassigned";
          const completedPct = (item.completed / item.total) * 100;
          const inProgressPct = (item.inProgress / item.total) * 100;
          const pendingPct = (item.pending / item.total) * 100;

          const barWidthPct = (item.total / maxTasks) * 100;

          return (
            <div key={idx} className="space-y-1.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isUnassigned ? "bg-amber-100 text-amber-800" : "bg-brand-900 text-white dark:bg-brand-600"
                  }`}>
                    {isUnassigned ? "?" : item.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`font-semibold ${isUnassigned ? "text-amber-700 dark:text-amber-400 italic" : "text-slate-800 dark:text-slate-200"}`}>
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{item.total} tasks</span>
                  {item.estHours > 0 && (
                    <span className="text-[11px] text-slate-400 font-mono">({item.estHours}h)</span>
                  )}
                  {item.total >= 4 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                      High Load
                    </span>
                  )}
                </div>
              </div>

              {/* Segmented Horizontal Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                <div style={{ width: `${barWidthPct}%` }} className="h-full flex rounded-full overflow-hidden">
                  <div style={{ width: `${completedPct}%` }} className="bg-emerald-500 h-full" title={`Completed: ${item.completed}`} />
                  <div style={{ width: `${inProgressPct}%` }} className="bg-blue-500 h-full" title={`In Progress: ${item.inProgress}`} />
                  <div style={{ width: `${pendingPct}%` }} className="bg-amber-400 h-full" title={`Pending: ${item.pending}`} />
                </div>
              </div>
            </div>
          );
        })}

        {workloadByAssignee.length === 0 && (
          <div className="text-xs text-slate-400 text-center py-6">No tasks assigned yet.</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. PROJECT HEALTH BUBBLE CHART (TIME vs. COST vs. WORKLOAD)
// ─────────────────────────────────────────────────────────────
function ProjectHealthBubbleChart({ projects = [], height = 320 }) {
  const [hoveredBubble, setHoveredBubble] = useState(null);

  // SVG dimensions
  const svgWidth = 650;
  const svgHeight = height;
  const padding = { top: 25, right: 35, bottom: 45, left: 55 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Domain: X is Schedule Progress (0 to 100%), Y is Cost/Budget Consumption % (0 to 140%)
  const maxCostPct = 140;

  const bubbles = useMemo(() => {
    return (projects || []).map((p) => {
      const schedulePct = Math.min(100, Math.max(0, Number(p.completion_percent || 0)));
      const budget = Number(p.budget || 0);
      const spent = Number(p.total_spent || p.total_expense || 0);
      const costPct = budget > 0 ? (spent / budget) * 100 : 0;
      const tasksCount = Number(p.total_tasks || 5);

      // Radius between 12 and 32 based on budget or tasks
      const r = Math.max(12, Math.min(32, 12 + (budget / 50000) * 16));

      // Coordinate mapping
      const cx = padding.left + (schedulePct / 100) * plotWidth;
      const cy = padding.top + plotHeight - (Math.min(maxCostPct, costPct) / maxCostPct) * plotHeight;

      // Health color determination
      let health = "HEALTHY";
      let color = "#10b981"; // Emerald
      let label = "Healthy / On Track";

      if (costPct > 100 || (costPct > schedulePct + 30 && costPct > 50)) {
        health = "CRITICAL";
        color = "#f43f5e"; // Rose
        label = "Critical Cost Overrun";
      } else if (costPct > schedulePct + 15 || costPct > 80) {
        health = "WARNING";
        color = "#f59e0b"; // Amber
        label = "Needs Budget Attention";
      }

      return {
        id: p.id,
        name: p.project_name || p.project_code,
        code: p.project_code,
        schedulePct,
        costPct,
        budget,
        spent,
        tasksCount,
        cx,
        cy,
        r,
        health,
        color,
        label,
      };
    });
  }, [projects, plotWidth, plotHeight]);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-100 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Healthy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">At Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Overrun</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
          style={{ minHeight: `${height}px` }}
        >
          {/* Quadrant Background shading */}
          {/* Top-Left Quadrant: Critical (High Cost, Low Progress) */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth / 2}
            height={plotHeight * (40 / maxCostPct)}
            className="fill-rose-500/5 dark:fill-rose-500/10"
          />

          {/* Dotted Gridlines & Axis Labels */}
          {/* Y Axis Ticks (Cost %) */}
          {[0, 25, 50, 75, 100, 125].map((val) => {
            const y = padding.top + plotHeight - (val / maxCostPct) * plotHeight;
            return (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + plotWidth}
                  y2={y}
                  className={`${val === 100 ? "stroke-rose-400 stroke-dasharray-4" : "stroke-slate-100 dark:stroke-slate-800"}`}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className={`text-[9px] font-mono ${val === 100 ? "fill-rose-500 font-bold" : "fill-slate-400"}`}
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* X Axis Ticks (Schedule %) */}
          {[0, 25, 50, 75, 100].map((val) => {
            const x = padding.left + (val / 100) * plotWidth;
            return (
              <g key={val}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + plotHeight}
                  className="stroke-slate-100 dark:stroke-slate-800 stroke-dasharray-2"
                />
                <text
                  x={x}
                  y={padding.top + plotHeight + 18}
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-slate-400"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Axis Titles */}
          <text
            x={padding.left + plotWidth / 2}
            y={svgHeight - 8}
            textAnchor="middle"
            className="text-[11px] font-bold fill-slate-500 dark:fill-slate-400 uppercase tracking-widest"
          >
            Schedule Progress (%)
          </text>
          <text
            x={-(padding.top + plotHeight / 2)}
            y="16"
            transform="rotate(-90)"
            textAnchor="middle"
            className="text-[10px] font-bold fill-slate-500 dark:fill-slate-400 uppercase tracking-widest"
          >
            Cost Consumed (%)
          </text>

          {/* Dotted 100% Budget Line label */}
          <text
            x={padding.left + plotWidth - 4}
            y={padding.top + plotHeight - (100 / maxCostPct) * plotHeight - 4}
            textAnchor="end"
            className="text-[9px] font-bold fill-rose-500"
          >
            100% Budget
          </text>

          {/* Bubbles */}
          {bubbles.map((b) => {
            const isHovered = hoveredBubble?.id === b.id;
            return (
              <g
                key={b.id}
                onMouseEnter={() => setHoveredBubble(b)}
                onMouseLeave={() => setHoveredBubble(null)}
                className="cursor-pointer transition-transform"
              >
                {/* Glow ring on hover */}
                {isHovered && (
                  <circle
                    cx={b.cx}
                    cy={b.cy}
                    r={b.r + 6}
                    fill="none"
                    stroke={b.color}
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    className="animate-spin"
                  />
                )}

                {/* Primary Bubble */}
                <circle
                  cx={b.cx}
                  cy={b.cy}
                  r={b.r}
                  fill={b.color}
                  fillOpacity="0.75"
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="transition-all hover:fill-opacity-95 shadow-sm"
                />

                {/* Bubble Label */}
                <text
                  x={b.cx}
                  y={b.cy + 3}
                  textAnchor="middle"
                  className="text-[9px] font-bold fill-white pointer-events-none"
                >
                  {b.code ? b.code.split("/")[0] : `P${b.id}`}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredBubble && (
          <div className="absolute top-4 right-4 bg-slate-900 text-white rounded-xl shadow-2xl p-3.5 text-xs pointer-events-none z-10 border border-slate-700/80 max-w-xs animate-in fade-in">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-bold text-sm text-slate-100 line-clamp-1">{hoveredBubble.name}</span>
              <span
                className="px-2 py-0.5 rounded text-[9px] font-bold shrink-0 text-white"
                style={{ backgroundColor: hoveredBubble.color }}
              >
                {hoveredBubble.health}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mb-2">{hoveredBubble.code}</p>

            <div className="space-y-1.5 pt-1 border-t border-slate-800">
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Schedule Completion:</span>
                <span className="font-bold text-slate-200">{hoveredBubble.schedulePct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Cost Consumed:</span>
                <span className="font-bold text-slate-200">{hoveredBubble.costPct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Approved Budget:</span>
                <span className="font-medium text-slate-300">{formatCurrency(hoveredBubble.budget)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-400">Actual Expenditure:</span>
                <span className="font-medium text-slate-300">{formatCurrency(hoveredBubble.spent)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 6. EARNED VALUE MANAGEMENT (EVM) PERFORMANCE MATRIX
// ─────────────────────────────────────────────────────────────
function EarnedValueMatrix({ totalBudget = 0, totalSpent = 0, avgCompletion = 0 }) {
  // Planned Value (PV) assumed at current milestone schedule (e.g. 65%)
  const plannedValue = totalBudget * 0.65;
  // Earned Value (EV) = Total Budget * % Completed
  const earnedValue = totalBudget * (avgCompletion / 100);
  const actualCost = totalSpent;

  // Indices
  const cpi = actualCost > 0 ? (earnedValue / actualCost) : 1;
  const spi = plannedValue > 0 ? (earnedValue / plannedValue) : 1;

  // Variances
  const costVariance = earnedValue - actualCost;
  const scheduleVariance = earnedValue - plannedValue;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
      {/* CPI Card */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Cost Performance (CPI)
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={`text-2xl font-black ${cpi >= 1 ? "text-emerald-600" : "text-rose-600"}`}>
            {cpi.toFixed(2)}
          </span>
          <span className="text-[10px] font-bold text-slate-500">
            {cpi >= 1 ? "Under Budget" : "Cost Overrun"}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">EV / AC (≥ 1.0)</p>
      </div>

      {/* SPI Card */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Schedule Performance (SPI)
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={`text-2xl font-black ${spi >= 1 ? "text-emerald-600" : "text-amber-600"}`}>
            {spi.toFixed(2)}
          </span>
          <span className="text-[10px] font-bold text-slate-500">
            {spi >= 1 ? "Ahead" : "Behind Schedule"}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">EV / PV (≥ 1.0)</p>
      </div>

      {/* Cost Variance (CV) */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Cost Variance (CV)
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={`text-lg font-bold ${costVariance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {costVariance >= 0 ? "+" : ""}{formatCurrency(costVariance)}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">EV − AC ({costVariance >= 0 ? "Favorable" : "Unfavorable"})</p>
      </div>

      {/* Earned Value (EV) */}
      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Earned Value (EV)
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-lg font-bold text-brand-900 dark:text-brand-300">
            {formatCurrency(earnedValue)}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Budgeted work completed</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────────────────────
export default function ProjectManagementDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("ALL");

  const [data, setData] = useState({
    detail: null,
    budgetVsActual: [],
    statusItems: [],
    projects: [],
    tasks: [],
    timesheets: [],
    expenses: [],
    riskStats: {},
  });

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [
        detailRes,
        budgetRes,
        statusRes,
        projectsRes,
        tasksRes,
        timesheetsRes,
        expensesRes,
        riskStatsRes,
      ] = await Promise.allSettled([
        api.get("/projects/dashboard/detail"),
        api.get("/projects/budget-vs-actual"),
        api.get("/projects/reports/project-status"),
        api.get("/projects/projects?active=all"),
        api.get("/projects/tasks"),
        api.get("/projects/timesheets"),
        api.get("/projects/expenses"),
        api.get("/projects/risks/stats"),
      ]);

      setData({
        detail: detailRes.status === "fulfilled" ? detailRes.value.data || {} : {},
        budgetVsActual: budgetRes.status === "fulfilled" ? budgetRes.value.data?.items || [] : [],
        statusItems: statusRes.status === "fulfilled" ? statusRes.value.data?.items || [] : [],
        projects: projectsRes.status === "fulfilled" ? (projectsRes.value.data?.items || projectsRes.value.data || []) : [],
        tasks: tasksRes.status === "fulfilled" ? (tasksRes.value.data?.items || tasksRes.value.data || []) : [],
        timesheets: timesheetsRes.status === "fulfilled" ? (timesheetsRes.value.data?.items || []) : [],
        expenses: expensesRes.status === "fulfilled" ? (expensesRes.value.data?.items || []) : [],
        riskStats: riskStatsRes.status === "fulfilled" ? (riskStatsRes.value.data?.data || {}) : {},
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load project portfolio metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered views based on selectedProject
  const filteredData = useMemo(() => {
    const isAll = selectedProjectId === "ALL";
    const pId = Number(selectedProjectId);

    const projects = isAll ? data.projects : data.projects.filter((p) => Number(p.id) === pId);
    const tasks = isAll ? data.tasks : data.tasks.filter((t) => Number(t.project_id) === pId);
    const budgetRows = isAll ? data.budgetVsActual : data.budgetVsActual.filter((b) => Number(b.id) === pId);
    const statusItems = isAll ? data.statusItems : data.statusItems.filter((s) => Number(s.id) === pId);

    // Group task statuses
    const taskCounts = {};
    (tasks || []).forEach((t) => {
      const st = String(t.status || "PENDING").toUpperCase();
      taskCounts[st] = (taskCounts[st] || 0) + 1;
    });

    const totalBudget = sumBy(projects, (p) => p.budget);
    const totalSpent = sumBy(budgetRows, (b) => b.total_spent);
    const avgCompletion = projects.length > 0
      ? sumBy(projects, (p) => p.completion_percent) / projects.length
      : 0;

    // Cost bar chart series
    const costSeries = budgetRows.map((b) => ({
      id: b.id,
      name: b.project_name,
      code: b.project_code,
      shortName: b.project_code || (b.project_name ? b.project_name.slice(0, 10) : `P${b.id}`),
      budget: Number(b.budget || 0),
      spent: Number(b.total_spent || 0),
    }));

    return {
      projects,
      tasks,
      taskCounts,
      budgetRows,
      statusItems,
      totalBudget,
      totalSpent,
      avgCompletion,
      costSeries,
    };
  }, [data, selectedProjectId]);

  return (
    <DashboardPageShell
      title="Project Management Dashboard"
      subtitle="Portfolio performance, budget control, and project health."
      backTo="/project-management"
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* GLOBAL CONTROLS & PROJECT FILTER                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Scope View:
          </span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="form-select text-xs py-1.5 px-3 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800 font-semibold"
          >
            <option value="ALL">All Projects (Portfolio View)</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name} ({p.project_code || `PRJ-${p.id}`})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/project-management/risk-management"
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs text-rose-700 bg-rose-50/60 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
          >
            <ShieldAlert size={14} className="text-rose-600" />
            Risk Register ({data.riskStats?.total_risks || 0})
          </Link>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 8 CANONICAL TOP KPI METRICS                                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Portfolio Budget"
          value={formatCurrency(filteredData.totalBudget)}
          helper={`${filteredData.totalBudget > 0 ? ((filteredData.totalSpent / filteredData.totalBudget) * 100).toFixed(1) : 0}% spent`}
          icon="💰"
          tone="brand"
        />
        <MetricCard
          title="Actual Cost Spent"
          value={formatCurrency(filteredData.totalSpent)}
          helper={`${formatCurrency(Math.max(0, filteredData.totalBudget - filteredData.totalSpent))} remaining`}
          icon="📉"
          tone="primary"
        />
        <MetricCard
          title="Average Progress"
          value={`${filteredData.avgCompletion.toFixed(1)}%`}
          helper={`${filteredData.projects.length} project(s)`}
          icon="🎯"
          tone="secondary"
        />
        <MetricCard
          title="Total Tasks"
          value={formatNumber(filteredData.tasks.length)}
          helper={`${filteredData.taskCounts.COMPLETED || 0} done · ${filteredData.taskCounts.IN_PROGRESS || 0} active`}
          icon="✅"
          tone="indigo"
        />
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ROW 1: COST BAR CHART & TASKS DONUT CHART                     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Cost = Bar Chart (7 Cols) */}
        <div className="xl:col-span-7">
          <SectionCard
            title="Cost & Budget Variance"
            subtitle="Budget vs. actual spend"
          >
            <CostBarChart data={filteredData.costSeries} height={300} />
          </SectionCard>
        </div>

        {/* Tasks = Donut Chart (5 Cols) */}
        <div className="xl:col-span-5">
          <SectionCard
            title="Task Distribution"
            subtitle="Status breakdown"
          >
            <TasksDonutChart
              taskCounts={filteredData.taskCounts}
              total={filteredData.tasks.length}
            />
          </SectionCard>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ROW 2: PROJECT HEALTH BUBBLE CHART & WORKLOAD HORIZONTAL BAR  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Project Health = Bubble Chart (7 Cols) */}
        <div className="xl:col-span-7">
          <SectionCard
            title="Project Health Matrix"
            subtitle="Schedule vs. cost performance"
          >
            <ProjectHealthBubbleChart
              projects={filteredData.budgetRows}
              height={330}
            />
          </SectionCard>
        </div>

        {/* Workload = Horizontal Bar Chart (5 Cols) */}
        <div className="xl:col-span-5">
          <SectionCard
            title="Resource Workload"
            subtitle="Tasks by resource"
          >
            <WorkloadHorizontalBarChart tasks={filteredData.tasks} />
          </SectionCard>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ROW 3: PROGRESS PERCENTAGE BAR & EARNED VALUE MANAGEMENT      */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Progress = Percentage Bar (6 Cols) */}
        <div className="xl:col-span-6">
          <SectionCard
            title="Schedule Progress"
            subtitle="Project completion rates"
          >
            <ProgressPercentageBarSection
              portfolioAvg={filteredData.avgCompletion}
              projects={filteredData.projects}
            />
          </SectionCard>
        </div>

        {/* Enterprise EVM & Threat Exposure (6 Cols) */}
        <div className="xl:col-span-6 space-y-6">
          <SectionCard
            title="Earned Value (EVM)"
            subtitle="CPI & SPI metrics"
          >
            <EarnedValueMatrix
              totalBudget={filteredData.totalBudget}
              totalSpent={filteredData.totalSpent}
              avgCompletion={filteredData.avgCompletion}
            />
          </SectionCard>

          {/* Integrated Risk & Threat Intelligence */}
          <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-600" /> Active Threat & Risk Index
              </h3>
              <Link
                to="/project-management/risk-management"
                className="text-xs font-semibold text-brand-900 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                Open 5×5 Matrix <ChevronRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2.5 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {data.riskStats?.total_risks || 0}
                </span>
                <span className="text-[10px] text-slate-400 block font-semibold">Identified</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                <span className="text-lg font-black text-rose-600">
                  {data.riskStats?.critical_risks || 0}
                </span>
                <span className="text-[10px] text-rose-500 block font-bold">Critical</span>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/60">
                <span className="text-lg font-black text-orange-600">
                  {data.riskStats?.high_risks || 0}
                </span>
                <span className="text-[10px] text-orange-500 block font-bold">High</span>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60">
                <span className="text-lg font-black text-indigo-600">
                  {data.riskStats?.under_mitigation || 0}
                </span>
                <span className="text-[10px] text-indigo-500 block font-semibold">Mitigating</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardPageShell>
  );
}
