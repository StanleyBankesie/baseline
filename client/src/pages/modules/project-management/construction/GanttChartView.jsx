/**
 * @file GanttChartView.jsx
 * @description OmniSuite ERP — Professional Industry-Standard Interactive Gantt Chart.
 * Engineered to the visual quality, precision, and standards of Monday.com, Microsoft Project, and Primavera P6.
 * Strictly uses "Work Plan/WBS" terminology (zero WBS).
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  Save,
  Loader2,
  Clock,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Flag,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Link2,
  User,
  BarChart2,
  ShieldAlert,
  Search,
  Download,
  Printer,
  Sliders,
  Layers,
  CalendarDays,
  Check,
  AlertTriangle,
  Info,
  Maximize2,
  Minimize2,
  Sparkles,
  ShieldCheck,
  Flame,
  X,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import MilestoneEngineDrawer from "./MilestoneEngineDrawer.jsx";
import BaselineManagerDrawer from "./BaselineManagerDrawer.jsx";
import DependencyManagerDrawer from "./DependencyManagerDrawer.jsx";

// ── Dependency Types ─────────────────────────────────────────────────────────
const DEP_TYPES = [
  { code: "FS", label: "Finish-to-Start (FS)", desc: "Successor starts after predecessor finishes" },
  { code: "SS", label: "Start-to-Start (SS)", desc: "Successor starts when predecessor starts" },
  { code: "FF", label: "Finish-to-Finish (FF)", desc: "Successor finishes when predecessor finishes" },
  { code: "SF", label: "Start-to-Finish (SF)", desc: "Successor finishes after predecessor starts" },
];

// ── Schedule Constraints ─────────────────────────────────────────────────────
const CONSTRAINTS = [
  { code: "ASAP", label: "As Soon As Possible (ASAP)" },
  { code: "ALAP", label: "As Late As Possible (ALAP)" },
  { code: "SNET", label: "Start No Earlier Than (SNET)" },
  { code: "SNLT", label: "Start No Later Than (SNLT)" },
  { code: "FNET", label: "Finish No Earlier Than (FNET)" },
  { code: "FNLT", label: "Finish No Later Than (FNLT)" },
  { code: "MSO",  label: "Must Start On (MSO)" },
  { code: "MFO",  label: "Must Finish On (MFO)" },
];

const ROW_HEIGHT = 40; // Exact row height in pixels

export default function GanttChartView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Project Selection ──
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("projectId") || "");

  // ── Core Schedule Data ──
  const [loading, setLoading] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    project: null,
    tasks: [],
    cpm: { tasks: [], projectDurationDays: 0, criticalPathIds: [], criticalPathSequence: [], forecastCompletionDate: "", hasCycle: false },
    variance: { actualProgress: 0, plannedProgress: 0, spi: 1.0, scheduleVarianceDays: 0 },
    scopes: [],
  });
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);

  // ── View & Timeline Settings ──
  const [zoomMode, setZoomMode] = useState("weeks"); // "days" | "weeks" | "months" | "quarters"
  const [searchTerm, setSearchTerm] = useState("");
  const [scopeFilter, setScopeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [groupBy, setGroupBy] = useState("NONE"); // "NONE" | "SCOPE" | "STATUS" | "ASSIGNEE"
  const [activeKpiFilter, setActiveKpiFilter] = useState("ALL"); // "ALL" | "COMPLETED" | "IN_PROGRESS" | "OVERDUE" | "MILESTONES" | "CRITICAL"
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Toggles ──
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [showBaseline, setShowBaseline] = useState(true);
  const [showDependencies, setShowDependencies] = useState(true);
  const [showMilestonesInGrid, setShowMilestonesInGrid] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // ── Split Panel Resizing ──
  const [leftPanelWidth, setLeftPanelWidth] = useState(520);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const isResizingRef = useRef(false);

  // ── Column Visibility in Left Grid ──
  const [visibleColumns, setVisibleColumns] = useState({
    wbs: true,
    title: true,
    assignee: true,
    startDate: true,
    endDate: true,
    duration: true,
    progress: true,
    status: true,
    variance: true,
    dependencies: false,
    priority: false,
  });
  const [showColPicker, setShowColPicker] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ── Automatic Milestones Engine State ──
  const [milestones, setMilestones] = useState([]);
  const [suggestedMilestones, setSuggestedMilestones] = useState([]);
  const [milestoneCounts, setMilestoneCounts] = useState({ total: 0, suggested: 0, in_progress: 0, achieved: 0, overdue: 0 });
  const [milestonesDrawerOpen, setMilestonesDrawerOpen] = useState(false);
  const [detectingMilestones, setDetectingMilestones] = useState(false);

  // ── Baselines ──
  const [baselines, setBaselines] = useState([]);
  const [baselineModalOpen, setBaselineModalOpen] = useState(false);
  const [baselineDrawerOpen, setBaselineDrawerOpen] = useState(false);
  const [baselineAnalysis, setBaselineAnalysis] = useState(null);
  const [baselineForm, setBaselineForm] = useState({ name: "", description: "" });
  const [savingBaseline, setSavingBaseline] = useState(false);

  // ── Dependencies ──
  const [dependencyDrawerOpen, setDependencyDrawerOpen] = useState(false);
  const [dependencyItems, setDependencyItems] = useState([]);
  const [dependencyCounts, setDependencyCounts] = useState({ total: 0, confirmed: 0, suggested: 0, rejected: 0, auto_detected: 0, manual: 0 });
  const [depModalOpen, setDepModalOpen] = useState(false);
  const [depForm, setDepForm] = useState({ taskId: "", predecessorId: "", dependencyType: "FS", lagDays: 0, notes: "" });
  const [savingDep, setSavingDep] = useState(false);

  // ── Task Modal State (Add / Quick Edit) ──
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
    milestone_flag: 0,
    constraint_type: "ASAP",
    constraint_date: "",
  });

  // ── Task Details Side Drawer ──
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [drawerActiveTab, setDrawerActiveTab] = useState("info"); // "info" | "schedule" | "dependencies" | "baseline"
  const [inlineNewDep, setInlineNewDep] = useState({ predecessorId: "", dependencyType: "FS", lagDays: 0 });
  const [savingDrawerTask, setSavingDrawerTask] = useState(false);

  // ── Downstream Warning Modal ──
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [impactDetails, setImpactDetails] = useState({ task: null, newStartDate: "", newEndDate: "", affectedSuccessors: [] });

  // ── Hover Synchronized Row ──
  const [hoveredTaskId, setHoveredTaskId] = useState(null);

  // ── Master Dual-Pane Synchronized Scroll Refs ──
  const leftPanelBodyRef = useRef(null);
  const timelineBodyRef = useRef(null);
  const timelineHeaderRef = useRef(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  // ── Drag & Resize Handlers ──
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragType, setDragType] = useState(null); // 'move' | 'resize'
  const [dragStartX, setDragStartX] = useState(0);
  const [dragTaskOriginal, setDragTaskOriginal] = useState(null);

  // ── 1. Load Projects List ──
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/projects/projects", { params: { active: "all" } });
        const prjs = res.data?.items || [];
        setProjects(prjs);
        // By default do not auto-select any project
      } catch {
        toast.error("Failed to load projects list");
      }
    })();
  }, []);

  // ── 2. Load Users for Assignment ──
  useEffect(() => {
    (async () => {
      try {
        const uRes = await api.get("/users");
        const list = uRes.data?.users || uRes.data || [];
        setUsers(Array.isArray(list) ? list : []);
      } catch {}
    })();
  }, []);

  // ── 3. Load Project Schedule & CPM ──
  const loadSchedule = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await api.get(`/construction/schedule/${selectedProjectId}`);
      const sched = res.data || {};
      let sc = sched.scopes || [];
      if (!sc.length) {
        try {
          const pRes = await api.get(`/projects/projects/${selectedProjectId}`);
          sc = pRes.data?.scopes || pRes.data?.milestones || [];
        } catch {}
      }
      setScheduleData({ ...sched, scopes: sc });
      setTasks(sched.tasks || []);

      // Load Baselines and Schedule Variances
      try {
        const [bRes, anRes] = await Promise.all([
          api.get(`/construction/schedule/${selectedProjectId}/baselines`),
          api.get(`/construction/schedule/${selectedProjectId}/baseline-analysis`),
        ]);
        const bItems = bRes.data?.items || [];
        setBaselines(bItems);
        setBaselineAnalysis(anRes.data || null);
      } catch {}

      // Load Automatic Project Milestones
      try {
        const mRes = await api.get(`/construction/projects/${selectedProjectId}/milestones`);
        setMilestones(mRes.data?.confirmed || []);
        setSuggestedMilestones(mRes.data?.suggested || []);
        setMilestoneCounts(mRes.data?.counts || { total: 0, suggested: 0, in_progress: 0, achieved: 0, overdue: 0 });
      } catch {}

      // Load Intelligent Task Dependencies
      try {
        const dRes = await api.get(`/construction/schedule/${selectedProjectId}/dependencies`);
        const deps = dRes.data?.items || [];
        setDependencyItems(deps);
        setDependencyCounts(dRes.data?.counts || { total: 0, confirmed: 0, suggested: 0, rejected: 0, auto_detected: 0, manual: 0 });

        // Map confirmed dependencies onto tasks
        const predMap = new Map();
        const succMap = new Map();
        deps.filter((d) => d.status === "CONFIRMED").forEach((d) => {
          if (!predMap.has(d.task_id)) predMap.set(d.task_id, []);
          predMap.get(d.task_id).push(d);

          if (!succMap.has(d.predecessor_id)) succMap.set(d.predecessor_id, []);
          succMap.get(d.predecessor_id).push(d);
        });

        const rawTasks = sched.tasks || [];
        const enriched = rawTasks.map((t) => ({
          ...t,
          predecessors: predMap.get(t.id) || t.predecessors || [],
          successors: succMap.get(t.id) || t.successors || [],
        }));
        setTasks(enriched);
      } catch {}
    } catch {
      toast.error("Failed to load project schedule");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      setSearchParams({ projectId: selectedProjectId });
      loadSchedule();
    } else {
      setScheduleData({ project: null, cpm: null, scopes: [] });
      setTasks([]);
      setMilestones([]);
      setDependencyItems([]);
      setDependencyCounts({ total: 0, confirmed: 0, suggested: 0, rejected: 0, auto_detected: 0, manual: 0 });
      setSearchParams({});
    }
  }, [selectedProjectId, loadSchedule]);

  // Keep selectedTaskDetails synchronized
  useEffect(() => {
    if (selectedTaskDetails) {
      const refreshed = tasks.find((t) => t.id === selectedTaskDetails.id);
      if (refreshed) {
        setSelectedTaskDetails(refreshed);
      }
    }
  }, [tasks]);

  // Project & CPM Info
  const project = scheduleData.project;
  const cpm = scheduleData.cpm;
  const scopes = scheduleData.scopes || [];

  // KPI Calculations
  const kpiStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let total = tasks.length;
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;
    let critical = 0;

    tasks.forEach((t) => {
      const isComp = t.status === "COMPLETED" || Number(t.completion_percent || 0) >= 100;
      if (isComp) {
        completed++;
      } else {
        if (t.status === "IN_PROGRESS" || Number(t.completion_percent || 0) > 0) {
          inProgress++;
        }
        if (t.end_date) {
          const ed = new Date(t.end_date);
          ed.setHours(0, 0, 0, 0);
          if (ed < today) overdue++;
        }
        if (t.is_critical) {
          critical++;
        }
      }
    });

    const upcomingMilestonesCount = (milestoneCounts.total || milestones.length);

    return {
      total,
      completed,
      inProgress,
      overdue,
      upcomingMilestonesCount,
      critical,
    };
  }, [tasks, milestoneCounts, milestones]);

  // ── Date Scale & Timeline Range Calculations ──
  const timelineDates = useMemo(() => {
    if (!tasks.length && !project) {
      const today = new Date();
      return { minDate: today, maxDate: new Date(today.getTime() + 45 * 86400000), totalDays: 45 };
    }

    let min = project?.start_date ? new Date(project.start_date) : new Date();
    let max = project?.end_date ? new Date(project.end_date) : new Date();

    tasks.forEach((t) => {
      if (t.start_date) {
        const d = new Date(t.start_date);
        if (d < min) min = d;
      }
      if (t.end_date) {
        const d = new Date(t.end_date);
        if (d > max) max = d;
      }
      if (t.early_finish) {
        const d = new Date(t.early_finish);
        if (d > max) max = d;
      }
      if (t.baseline_end) {
        const d = new Date(t.baseline_end);
        if (d > max) max = d;
      }
    });

    milestones.forEach((m) => {
      const targetStr = m.target_date || m.due_date;
      if (targetStr) {
        const d = new Date(targetStr);
        if (d < min) min = d;
        if (d > max) max = d;
      }
    });

    // Clean padding
    min = new Date(min.getFullYear(), min.getMonth(), min.getDate() - 3);
    max = new Date(max.getFullYear(), max.getMonth(), max.getDate() + 10);
    const totalDays = Math.max(21, Math.round((max - min) / 86400000));

    return { minDate: min, maxDate: max, totalDays };
  }, [tasks, project, milestones]);

  // Pixel width per day based on zoom
  const dayWidth = useMemo(() => {
    switch (zoomMode) {
      case "days": return 38;
      case "weeks": return 18;
      case "months": return 6.5;
      case "quarters": return 3.2;
      default: return 18;
    }
  }, [zoomMode]);

  const timelineWidth = Math.max(950, timelineDates.totalDays * dayWidth);

  // Position helper: convert date string to pixel offset
  const getXForDate = useCallback((dateStr) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const diffDays = (d - timelineDates.minDate) / 86400000;
    return Math.max(0, diffDays * dayWidth);
  }, [timelineDates.minDate, dayWidth]);

  // Width helper: convert duration (days) to pixel width
  const getWidthForDuration = useCallback((durationDays) => {
    return Math.max(dayWidth * 0.9, (Number(durationDays) || 1) * dayWidth);
  }, [dayWidth]);

  // Today indicator position
  const todayX = useMemo(() => {
    return getXForDate(new Date().toISOString().split("T")[0]);
  }, [getXForDate]);

  // ── Auto-Scroll to Active Tasks on Load ──
  useEffect(() => {
    if (tasks.length > 0 && timelineBodyRef.current) {
      // Find earliest task date
      const validDates = tasks.map((t) => t.start_date || t.end_date).filter(Boolean).map((d) => new Date(d));
      if (validDates.length > 0) {
        const earliest = new Date(Math.min(...validDates));
        const initialX = Math.max(0, getXForDate(earliest.toISOString().split("T")[0]) - 80);
        timelineBodyRef.current.scrollTo({ left: initialX, behavior: "smooth" });
      }
    }
  }, [selectedProjectId, tasks.length]);

  // ── Calendar Header Grid Engine (Mathematically Accurate Boundaries) ──
  const calendarHeaderData = useMemo(() => {
    const { minDate, maxDate, totalDays } = timelineDates;

    // 1. Generate Months for Tier 1
    const months = [];
    let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const end = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1);

    while (current < end) {
      const year = current.getFullYear();
      const month = current.getMonth();
      const monthStart = new Date(Math.max(current.getTime(), minDate.getTime()));
      const nextMonth = new Date(year, month + 1, 1);
      const monthEnd = new Date(Math.min(nextMonth.getTime(), maxDate.getTime()));

      const startDiffDays = Math.max(0, (monthStart.getTime() - minDate.getTime()) / 86400000);
      const endDiffDays = Math.max(0, (monthEnd.getTime() - minDate.getTime()) / 86400000);
      const widthDays = Math.max(1, endDiffDays - startDiffDays);

      months.push({
        key: `${year}-${month}`,
        label: current.toLocaleDateString("default", { month: "short", year: "numeric" }).toUpperCase(),
        left: startDiffDays * dayWidth,
        width: widthDays * dayWidth,
      });

      current = nextMonth;
    }

    // 2. Generate Tier 2 ticks based on zoomMode
    const ticks = [];
    if (zoomMode === "days") {
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(minDate.getTime() + i * 86400000);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const dayLetter = ["S", "M", "T", "W", "T", "F", "S"][d.getDay()];
        ticks.push({
          key: `day-${i}`,
          left: i * dayWidth,
          width: dayWidth,
          dayNum: d.getDate(),
          dayLetter,
          isWeekend,
        });
      }
    } else if (zoomMode === "weeks") {
      let wDate = new Date(minDate);
      const dayOfWeek = wDate.getDay();
      const diffToMon = (dayOfWeek + 6) % 7;
      wDate.setDate(wDate.getDate() - diffToMon);

      while (wDate < maxDate) {
        const diffDays = (wDate.getTime() - minDate.getTime()) / 86400000;
        if (diffDays + 7 > 0) {
          const left = Math.max(0, diffDays * dayWidth);
          const width = 7 * dayWidth;
          ticks.push({
            key: `wk-${wDate.toISOString()}`,
            left,
            width,
            label: `${wDate.toLocaleDateString("default", { month: "short", day: "numeric" })}`,
          });
        }
        wDate.setDate(wDate.getDate() + 7);
      }
    } else if (zoomMode === "months") {
      months.forEach((m) => {
        ticks.push({
          key: `mo-${m.key}`,
          left: m.left,
          width: m.width,
          label: m.label.split(" ")[0],
        });
      });
    } else if (zoomMode === "quarters") {
      let qYear = minDate.getFullYear();
      const endYear = maxDate.getFullYear();
      while (qYear <= endYear) {
        for (let q = 1; q <= 4; q++) {
          const qStartMonth = (q - 1) * 3;
          const qStartDate = new Date(qYear, qStartMonth, 1);
          const qEndDate = new Date(qYear, qStartMonth + 3, 1);
          if (qEndDate > minDate && qStartDate < maxDate) {
            const startClamped = Math.max(qStartDate.getTime(), minDate.getTime());
            const endClamped = Math.min(qEndDate.getTime(), maxDate.getTime());
            const leftDays = (startClamped - minDate.getTime()) / 86400000;
            const widthDays = (endClamped - startClamped) / 86400000;
            ticks.push({
              key: `q-${qYear}-Q${q}`,
              left: leftDays * dayWidth,
              width: widthDays * dayWidth,
              label: `Q${q} ${qYear}`,
            });
          }
        }
        qYear++;
      }
    }

    return { months, ticks };
  }, [timelineDates, dayWidth, zoomMode]);

  // ── Filter Tasks ──
  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return tasks.filter((t) => {
      const title = t.task_title || t.title || "";
      const wbs = t.wbs_code || "";
      const scope = t.scope_name || "";
      const assignee = t.assigned_to_name || "";
      const isComp = t.status === "COMPLETED" || Number(t.completion_percent || 0) >= 100;

      const matchSearch =
        !searchTerm.trim() ||
        title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wbs.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scope.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignee.toLowerCase().includes(searchTerm.toLowerCase());

      const matchScope = scopeFilter === "ALL" || (t.scope_name || "General") === scopeFilter;
      const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
      const matchCritical = !showCriticalOnly || Boolean(t.is_critical && !isComp);
      const matchCompleted = showCompleted || !isComp;

      let matchKpi = true;
      if (activeKpiFilter === "COMPLETED") matchKpi = isComp;
      else if (activeKpiFilter === "IN_PROGRESS") matchKpi = !isComp && (t.status === "IN_PROGRESS" || Number(t.completion_percent || 0) > 0);
      else if (activeKpiFilter === "OVERDUE") {
        if (isComp || !t.end_date) matchKpi = false;
        else {
          const ed = new Date(t.end_date);
          ed.setHours(0, 0, 0, 0);
          matchKpi = ed < today;
        }
      } else if (activeKpiFilter === "CRITICAL") matchKpi = Boolean(t.is_critical && !isComp);
      else if (activeKpiFilter === "MILESTONES") matchKpi = Boolean(t.milestone_flag);

      return matchSearch && matchScope && matchStatus && matchPriority && matchCritical && matchCompleted && matchKpi;
    });
  }, [tasks, searchTerm, scopeFilter, statusFilter, priorityFilter, showCriticalOnly, showCompleted, activeKpiFilter]);

  // Official confirmed milestones
  const milestoneItems = useMemo(() => {
    if (!showMilestonesInGrid || !milestones.length) return [];
    return milestones.map((m, idx) => ({
      id: `milestone-${m.id}`,
      originalMilestone: m,
      isOfficialMilestone: true,
      task_title: m.title,
      title: m.title,
      wbs_code: `MS-${idx + 1}`,
      scope_name: m.work_plan_element || "Project Milestones",
      assigned_to_name: m.responsible_owner_name || "Project Team",
      start_date: m.target_date || m.due_date ? String(m.target_date || m.due_date).split("T")[0] : "",
      end_date: m.target_date || m.due_date ? String(m.target_date || m.due_date).split("T")[0] : "",
      early_start: m.target_date || m.due_date ? String(m.target_date || m.due_date).split("T")[0] : "",
      early_finish: m.target_date || m.due_date ? String(m.target_date || m.due_date).split("T")[0] : "",
      duration_days: 0,
      completion_percent: m.progress_percent || (m.live_status === "ACHIEVED" ? 100 : 0),
      status: m.live_status || m.status || "PENDING",
      is_critical: false,
      milestone_flag: 1,
      requires_inspection: m.requires_inspection,
      is_inspection_accepted: m.is_inspection_accepted,
      total_tasks: m.total_tasks || 0,
      completed_tasks: m.completed_tasks || 0,
    }));
  }, [milestones, showMilestonesInGrid]);

  // Grouped tasks
  const groupedTasks = useMemo(() => {
    const result = [];
    if (milestoneItems.length > 0) {
      result.push({
        key: "PROJECT_MILESTONES",
        label: "Project Milestones",
        isMilestoneGroup: true,
        tasks: milestoneItems,
      });
    }

    if (groupBy === "NONE") {
      result.push({ key: "All", label: "Work Plan/WBS Activities", tasks: filteredTasks });
      return result;
    }

    const map = new Map();
    filteredTasks.forEach((t) => {
      let gKey = "Other";
      if (groupBy === "SCOPE") gKey = t.scope_name || "General Scope";
      else if (groupBy === "STATUS") gKey = t.status || "PENDING";
      else if (groupBy === "ASSIGNEE") gKey = t.assigned_to_name || "Unassigned";

      if (!map.has(gKey)) map.set(gKey, []);
      map.get(gKey).push(t);
    });

    Array.from(map.entries()).forEach(([k, v]) => {
      result.push({ key: k, label: k, tasks: v });
    });

    return result;
  }, [filteredTasks, groupBy, milestoneItems]);

  // Flat list of visible tasks in vertical order
  const visibleTaskList = useMemo(() => {
    const list = [];
    groupedTasks.forEach((group) => {
      if (!collapsedGroups[group.key]) {
        group.tasks.forEach((t) => list.push(t));
      }
    });
    return list;
  }, [groupedTasks, collapsedGroups]);

  // Map of taskId -> row index in visibleTaskList
  const taskRowIndexMap = useMemo(() => {
    const m = new Map();
    visibleTaskList.forEach((t, i) => m.set(t.id, i));
    return m;
  }, [visibleTaskList]);

  // ── Standard Orthogonal Dependency Lines ──
  const dependencyLines = useMemo(() => {
    if (!showDependencies) return [];
    const lines = [];

    visibleTaskList.forEach((task) => {
      const preds = task.predecessors || [];
      preds.forEach((p) => {
        const predIndex = taskRowIndexMap.get(p.predecessor_id);
        const succIndex = taskRowIndexMap.get(task.id);

        if (predIndex !== undefined && succIndex !== undefined) {
          const predTask = visibleTaskList[predIndex];
          const predStartX = getXForDate(predTask.start_date || predTask.early_start);
          const predEndX = predStartX + getWidthForDuration(predTask.duration_days);
          const succStartX = getXForDate(task.start_date || task.early_start);

          const y1 = predIndex * ROW_HEIGHT + ROW_HEIGHT / 2;
          const y2 = succIndex * ROW_HEIGHT + ROW_HEIGHT / 2;

          let startPtX = predEndX;
          let endPtX = succStartX;

          if (p.dependency_type === "SS") {
            startPtX = predStartX;
            endPtX = succStartX;
          }

          let path = "";
          const isForward = endPtX >= startPtX + 16;
          if (isForward) {
            const midX = startPtX + 10;
            path = `M ${startPtX} ${y1} H ${midX} V ${y2} H ${endPtX}`;
          } else {
            const offset = y2 > y1 ? 16 : -16;
            path = `M ${startPtX} ${y1} H ${startPtX + 10} V ${y1 + offset} H ${endPtX - 12} V ${y2} H ${endPtX}`;
          }

          const isCriticalLink = Boolean(predTask.is_critical && task.is_critical);

          lines.push({
            id: p.id,
            path,
            isCritical: isCriticalLink,
            lag: p.lag_days || 0,
          });
        }
      });
    });

    return lines;
  }, [visibleTaskList, taskRowIndexMap, getXForDate, getWidthForDuration, showDependencies]);

  // Synchronized Dual-Pane Master Scrolling
  const handleLeftScroll = () => {
    if (isSyncingLeft.current) {
      isSyncingLeft.current = false;
      return;
    }
    if (leftPanelBodyRef.current && timelineBodyRef.current) {
      isSyncingRight.current = true;
      timelineBodyRef.current.scrollTop = leftPanelBodyRef.current.scrollTop;
    }
  };

  const handleTimelineScroll = () => {
    if (timelineHeaderRef.current && timelineBodyRef.current) {
      timelineHeaderRef.current.scrollLeft = timelineBodyRef.current.scrollLeft;
    }
    if (isSyncingRight.current) {
      isSyncingRight.current = false;
      return;
    }
    if (leftPanelBodyRef.current && timelineBodyRef.current) {
      isSyncingLeft.current = true;
      leftPanelBodyRef.current.scrollTop = timelineBodyRef.current.scrollTop;
    }
  };

  // Scroll to Today
  const handleScrollToToday = () => {
    if (timelineBodyRef.current) {
      timelineBodyRef.current.scrollTo({
        left: Math.max(0, todayX - 250),
        behavior: "smooth",
      });
    }
  };

  // Auto-fit scale
  const handleFitToScreen = () => {
    if (!tasks.length) return;
    const validDates = tasks.map((t) => t.start_date || t.end_date).filter(Boolean).map((d) => new Date(d));
    if (!validDates.length) return;
    const minD = new Date(Math.min(...validDates));
    const maxD = new Date(Math.max(...validDates));
    const spanDays = Math.max(1, Math.round((maxD - minD) / 86400000));

    if (spanDays <= 30) setZoomMode("days");
    else if (spanDays <= 120) setZoomMode("weeks");
    else if (spanDays <= 365) setZoomMode("months");
    else setZoomMode("quarters");

    setTimeout(() => {
      if (timelineBodyRef.current) {
        const targetX = Math.max(0, getXForDate(minD.toISOString().split("T")[0]) - 50);
        timelineBodyRef.current.scrollTo({ left: targetX, behavior: "smooth" });
      }
    }, 50);

    toast.info("Schedule fitted to project duration");
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setScopeFilter("ALL");
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setGroupBy("NONE");
    setActiveKpiFilter("ALL");
    setShowCriticalOnly(false);
    setShowCompleted(true);
    setShowBaseline(true);
    setShowDependencies(true);
    setShowMilestonesInGrid(true);
  };

  // Splitter Resizing
  const handleSplitterMouseDown = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    const startX = e.clientX;
    const startW = leftPanelWidth;

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const newW = Math.max(300, Math.min(800, startW + (moveEvent.clientX - startX)));
      setLeftPanelWidth(newW);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleOpenTaskDetails = (task) => {
    if (task.isOfficialMilestone) {
      setMilestonesDrawerOpen(true);
      return;
    }
    setSelectedTaskDetails(task);
    setDrawerActiveTab("info");
  };

  // Task Create Modal
  const handleOpenCreateTask = (isMilestone = false) => {
    if (!selectedProjectId) {
      toast.warn("Please select a project first.");
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    const defaultEnd = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];
    setTaskForm({
      id: null,
      task_title: "",
      task_description: "",
      scope_name: scopes[0]?.name || scopes[0]?.title || "General",
      wbs_code: `${tasks.length + 1}.0`,
      assigned_to_id: "",
      assigned_to_name: "",
      start_date: todayStr,
      end_date: isMilestone ? todayStr : defaultEnd,
      duration_days: isMilestone ? 0 : 5,
      estimated_hours: isMilestone ? 0 : 40,
      completion_percent: 0,
      status: "PENDING",
      priority: "MEDIUM",
      milestone_flag: isMilestone ? 1 : 0,
      constraint_type: "ASAP",
      constraint_date: "",
    });
    setTaskModalOpen(true);
  };

  const handleSaveTaskForm = async (e) => {
    e.preventDefault();
    setSavingTask(true);
    try {
      if (taskForm.id) {
        await api.put(`/construction/schedule/${selectedProjectId}/activities/${taskForm.id}`, taskForm);
        toast.success("Task updated successfully");
      } else {
        await api.post(`/construction/schedule/${selectedProjectId}/activities`, taskForm);
        toast.success(taskForm.milestone_flag ? "Milestone added to schedule" : "Task created successfully");
      }
      setTaskModalOpen(false);
      await loadSchedule();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save task");
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task? Associated dependencies will also be removed.")) return;
    try {
      await api.delete(`/construction/schedule/${selectedProjectId}/activities/${taskId}`);
      toast.success("Task removed from schedule");
      setTaskModalOpen(false);
      if (selectedTaskDetails?.id === taskId) {
        setSelectedTaskDetails(null);
      }
      await loadSchedule();
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleSaveDrawerChanges = async () => {
    if (!selectedTaskDetails?.id) return;
    setSavingDrawerTask(true);
    try {
      await api.put(`/construction/schedule/${selectedProjectId}/activities/${selectedTaskDetails.id}`, {
        task_title: selectedTaskDetails.task_title || selectedTaskDetails.title,
        task_description: selectedTaskDetails.task_description || selectedTaskDetails.description,
        scope_name: selectedTaskDetails.scope_name,
        wbs_code: selectedTaskDetails.wbs_code,
        assigned_to_id: selectedTaskDetails.assigned_to_id,
        assigned_to_name: selectedTaskDetails.assigned_to_name,
        start_date: selectedTaskDetails.start_date,
        end_date: selectedTaskDetails.end_date,
        duration_days: selectedTaskDetails.duration_days,
        completion_percent: selectedTaskDetails.completion_percent,
        status: selectedTaskDetails.status,
        priority: selectedTaskDetails.priority,
        milestone_flag: selectedTaskDetails.milestone_flag,
        constraint_type: selectedTaskDetails.constraint_type,
        constraint_date: selectedTaskDetails.constraint_date,
      });
      toast.success("Task updated successfully");
      await loadSchedule();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update task");
    } finally {
      setSavingDrawerTask(false);
    }
  };

  const handleAddInlineDependency = async () => {
    if (!selectedTaskDetails?.id || !inlineNewDep.predecessorId) {
      toast.warning("Please choose a predecessor task");
      return;
    }
    try {
      await api.post(`/construction/schedule/${selectedProjectId}/dependencies`, {
        taskId: selectedTaskDetails.id,
        predecessorId: inlineNewDep.predecessorId,
        dependencyType: inlineNewDep.dependencyType,
        lagDays: Number(inlineNewDep.lagDays || 0),
      });
      toast.success("Dependency added");
      setInlineNewDep({ predecessorId: "", dependencyType: "FS", lagDays: 0 });
      await loadSchedule();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add dependency");
    }
  };

  const handleDeleteDependency = async (depId) => {
    if (!window.confirm("Remove this dependency link?")) return;
    try {
      await api.delete(`/construction/schedule/${selectedProjectId}/dependencies/${depId}`);
      toast.success("Dependency removed");
      await loadSchedule();
    } catch {
      toast.error("Failed to delete dependency");
    }
  };

  const handleSaveBaseline = async (e) => {
    e.preventDefault();
    setSavingBaseline(true);
    try {
      const res = await api.post(`/construction/schedule/${selectedProjectId}/baseline`, {
        baseline_name: baselineForm.name || "Approved Schedule Baseline",
        description: baselineForm.description,
      });
      toast.success(res.data?.message || "Baseline saved successfully");
      setBaselineModalOpen(false);
      setBaselineForm({ name: "", description: "" });
      setShowBaseline(true);
      await loadSchedule();
    } catch {
      toast.error("Failed to record schedule baseline");
    } finally {
      setSavingBaseline(false);
    }
  };

  // Drag & Resize
  const handleMouseDown = (task, type, e) => {
    e.stopPropagation();
    setDraggedTaskId(task.id);
    setDragType(type);
    setDragStartX(e.clientX);
    setDragTaskOriginal({
      startDate: task.start_date ? new Date(task.start_date) : new Date(),
      endDate: task.end_date ? new Date(task.end_date) : new Date(),
      duration: Number(task.duration_days) || 1,
    });
  };

  const handleMouseMove = () => {
    if (!draggedTaskId || !dragTaskOriginal) return;
  };

  const handleMouseUp = async (e) => {
    if (!draggedTaskId || !dragTaskOriginal) {
      setDraggedTaskId(null);
      setDragType(null);
      return;
    }

    const deltaX = e.clientX - dragStartX;
    const deltaDays = Math.round(deltaX / dayWidth);

    if (deltaDays !== 0) {
      const originalTask = tasks.find((t) => t.id === draggedTaskId);
      let newStart = new Date(dragTaskOriginal.startDate);
      let newEnd = new Date(dragTaskOriginal.endDate);
      let newDuration = dragTaskOriginal.duration;

      if (dragType === "move") {
        newStart.setDate(newStart.getDate() + deltaDays);
        newEnd.setDate(newEnd.getDate() + deltaDays);
      } else if (dragType === "resize") {
        newDuration = Math.max(1, newDuration + deltaDays);
        newEnd.setDate(newStart.getDate() + newDuration);
      }

      const newStartStr = newStart.toISOString().split("T")[0];
      const newEndStr = newEnd.toISOString().split("T")[0];

      const successors = originalTask?.successors || [];
      if (successors.length > 0 && deltaDays > 0) {
        setImpactDetails({
          task: originalTask,
          newStartDate: newStartStr,
          newEndDate: newEndStr,
          newDuration,
          affectedSuccessors: successors,
        });
        setImpactModalOpen(true);
      } else {
        try {
          await api.put(`/construction/schedule/${selectedProjectId}/activities/${draggedTaskId}`, {
            start_date: newStartStr,
            end_date: newEndStr,
            duration_days: newDuration,
          });
          toast.success(`Task rescheduled: ${newStartStr} → ${newEndStr}`);
          await loadSchedule();
        } catch {
          toast.error("Failed to reschedule task");
        }
      }
    }

    setDraggedTaskId(null);
    setDragType(null);
    setDragTaskOriginal(null);
  };

  const handleConfirmImpactReschedule = async () => {
    try {
      await api.put(`/construction/schedule/${selectedProjectId}/activities/${impactDetails.task.id}`, {
        start_date: impactDetails.newStartDate,
        end_date: impactDetails.newEndDate,
        duration_days: impactDetails.newDuration,
      });
      toast.success("Schedule recalculated with downstream dependencies");
      setImpactModalOpen(false);
      await loadSchedule();
    } catch {
      toast.error("Failed to update schedule");
    }
  };

  const handleExportCSV = () => {
    if (!filteredTasks.length) return;
    const headers = [
      "Work Plan/WBS",
      "Task Name",
      "Scope",
      "Assignee",
      "Start Date",
      "End Date",
      "Duration (Days)",
      "Progress (%)",
      "Status",
      "Priority",
      "Critical Path",
      "Baseline Start",
      "Baseline End",
      "Variance (Days)",
    ];
    const rows = filteredTasks.map((t) => [
      t.wbs_code || "",
      `"${(t.task_title || t.title || "").replace(/"/g, '""')}"`,
      `"${(t.scope_name || "").replace(/"/g, '""')}"`,
      `"${(t.assigned_to_name || "Unassigned").replace(/"/g, '""')}"`,
      t.start_date ? String(t.start_date).split("T")[0] : "",
      t.end_date ? String(t.end_date).split("T")[0] : "",
      t.duration_days || 1,
      `${t.completion_percent || 0}%`,
      t.status || "PENDING",
      t.priority || "MEDIUM",
      t.is_critical ? "YES" : "NO",
      t.baseline_start ? String(t.baseline_start).split("T")[0] : "",
      t.baseline_end ? String(t.baseline_end).split("T")[0] : "",
      t.finish_variance_days || 0,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Project_Schedule_${project?.project_code || "Gantt"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const handlePrint = () => {
    setShowExportMenu(false);
    window.print();
  };

  return (
    <div
      className={`select-none ${isFullscreen ? "fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 p-2.5 flex flex-col" : "space-y-2.5 pb-20"}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >

      {/* ── 1. Compact SaaS Header & Action Suite ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 shadow-xs shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2.5">

          {/* Left: Project Brand, Title & Selector */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/project-management"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Return to Project Management"
            >
              <ArrowLeft size={15} />
            </Link>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-900 text-white flex items-center justify-center font-bold shadow-xs">
                <BarChart2 size={16} />
              </div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Gantt Chart
              </h1>
            </div>

            {/* Project Picker Dropdown */}
            <div className="pl-3 border-l border-slate-200 dark:border-slate-800">
              <select
                className="h-9 px-3 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer min-w-[220px] max-w-[340px] truncate transition-all"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">-- Select Project --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_code ? `[${p.project_code}] ` : ""}{p.project_name || p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center: Slim Clickable KPI Metric Pills */}
          <div className="hidden xl:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveKpiFilter("ALL")}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                activeKpiFilter === "ALL"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All: <span className="font-mono">{kpiStats.total}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveKpiFilter(activeKpiFilter === "COMPLETED" ? "ALL" : "COMPLETED")}
              className={`px-2 py-0.5 rounded font-semibold transition-all flex items-center gap-1 ${
                activeKpiFilter === "COMPLETED"
                  ? "bg-emerald-600 text-white shadow-2xs font-bold"
                  : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              }`}
            >
              <CheckCircle2 size={11} /> Done: <span className="font-mono">{kpiStats.completed}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveKpiFilter(activeKpiFilter === "IN_PROGRESS" ? "ALL" : "IN_PROGRESS")}
              className={`px-2 py-0.5 rounded font-semibold transition-all flex items-center gap-1 ${
                activeKpiFilter === "IN_PROGRESS"
                  ? "bg-blue-600 text-white shadow-2xs font-bold"
                  : "text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              }`}
            >
              <Clock size={11} /> Active: <span className="font-mono">{kpiStats.inProgress}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveKpiFilter(activeKpiFilter === "CRITICAL" ? "ALL" : "CRITICAL")}
              className={`px-2 py-0.5 rounded font-semibold transition-all flex items-center gap-1 ${
                activeKpiFilter === "CRITICAL"
                  ? "bg-rose-600 text-white shadow-2xs font-bold"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              }`}
            >
              <Flame size={11} /> Critical: <span className="font-mono">{kpiStats.critical}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveKpiFilter(activeKpiFilter === "MILESTONES" ? "ALL" : "MILESTONES")}
              className={`px-2 py-0.5 rounded font-semibold transition-all flex items-center gap-1 ${
                activeKpiFilter === "MILESTONES"
                  ? "bg-amber-500 text-white shadow-2xs font-bold"
                  : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              }`}
            >
              <Flag size={11} /> Milestones: <span className="font-mono">{kpiStats.upcomingMilestonesCount}</span>
            </button>
          </div>

          {/* Right: Primary Action Suite */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Add Task Primary */}
            <button
              type="button"
              onClick={() => handleOpenCreateTask(false)}
              className="btn btn-primary text-xs h-9 px-3.5 rounded-xl font-bold inline-flex items-center gap-1.5 shadow-2xs"
            >
              <Plus size={14} /> Add Task
            </button>

            {/* Add Milestone */}
            <button
              type="button"
              onClick={() => handleOpenCreateTask(true)}
              className="btn btn-secondary text-xs h-9 px-3 rounded-xl font-semibold text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 inline-flex items-center gap-1.5"
            >
              <Flag size={13} className="text-amber-500" /> Milestone
            </button>

            {/* Dependency Workspace Drawer */}
            <button
              type="button"
              onClick={() => {
                if (!selectedProjectId) {
                  toast.warn("Please select a project first.");
                  return;
                }
                setDependencyDrawerOpen(true);
              }}
              className="btn btn-secondary text-xs h-9 px-3 rounded-xl font-semibold text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 inline-flex items-center gap-1.5"
            >
              <Link2 size={13} />
              <span className="hidden sm:inline">Deps</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {dependencyCounts.confirmed || 0}
              </span>
            </button>

            {/* Baseline Workspace Drawer */}
            <button
              type="button"
              onClick={() => {
                if (!selectedProjectId) {
                  toast.warn("Please select a project first.");
                  return;
                }
                setBaselineDrawerOpen(true);
              }}
              className="btn btn-secondary text-xs h-9 px-3 rounded-xl font-semibold text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 inline-flex items-center gap-1.5"
            >
              <Layers size={13} />
              <span className="hidden sm:inline">Baseline</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="btn btn-secondary text-xs h-9 px-2.5 rounded-xl"
                title="Export Schedule"
              >
                <Download size={14} />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-10 z-50 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1 text-xs">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Download size={13} className="text-emerald-600" /> Excel / CSV
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <Printer size={13} className="text-slate-600" /> Print Schedule
                  </button>
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="btn btn-secondary text-xs h-9 px-2.5 rounded-xl"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>

        </div>
      </div>

      {/* ── 2. Unified Single-Row Compact Toolbar ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-2xs shrink-0 flex items-center justify-between gap-2.5 overflow-x-auto text-xs">

        {/* Left: Search & Filter Inputs (Standard OmniSuite Horizontal Layout) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search Input */}
          <div className="relative w-52 sm:w-60 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search Work Plan/WBS..."
              className="w-full h-9 pl-9 pr-7 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Scope Dropdown */}
          <div className="w-40 sm:w-44 shrink-0">
            <select
              className="w-full h-9 px-3 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer truncate"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
            >
              <option value="ALL">All Scopes</option>
              {scopes.map((s, idx) => (
                <option key={idx} value={s.name || s.title || `Scope #${idx + 1}`}>
                  {s.name || s.title || `Scope #${idx + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="w-36 shrink-0">
            <select
              className="w-full h-9 px-3 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="DELAYED">Delayed</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>

          {/* Grouping Dropdown */}
          <div className="w-40 shrink-0">
            <select
              className="w-full h-9 px-3 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
            >
              <option value="NONE">Group: None</option>
              <option value="SCOPE">Group by Scope</option>
              <option value="STATUS">Group by Status</option>
              <option value="ASSIGNEE">Group by Assignee</option>
            </select>
          </div>
        </div>

        {/* Right: Time Scale Segmented Buttons, Today, Fit & Toggles */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">

          {/* Time Scale Segmented Controls */}
          <div className="h-9 inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            {["days", "weeks", "months", "quarters"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setZoomMode(mode)}
                className={`h-7 px-2.5 text-[11px] font-semibold rounded-lg capitalize transition-all ${
                  zoomMode === mode
                    ? "bg-white dark:bg-slate-700 text-brand-900 dark:text-white shadow-2xs font-bold"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Today Button */}
          <button
            type="button"
            onClick={handleScrollToToday}
            className="btn btn-secondary text-sm h-9 px-3 rounded-xl font-bold text-brand-700 dark:text-brand-300"
            title="Scroll timeline to current date"
          >
            Today
          </button>

          {/* Fit Button */}
          <button
            type="button"
            onClick={handleFitToScreen}
            className="btn btn-secondary text-sm h-9 px-3 rounded-xl font-semibold"
            title="Fit timeline to project duration"
          >
            Fit
          </button>

          {/* Feature Toggles */}
          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-1.5">
            <button
              type="button"
              onClick={() => setShowBaseline(!showBaseline)}
              className={`h-9 px-3 rounded-xl text-xs font-semibold border transition-all ${
                showBaseline
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                  : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700"
              }`}
            >
              Baseline
            </button>

            <button
              type="button"
              onClick={() => setShowDependencies(!showDependencies)}
              className={`h-9 px-3 rounded-xl text-xs font-semibold border transition-all ${
                showDependencies
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                  : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700"
              }`}
            >
              Links
            </button>

            <button
              type="button"
              onClick={() => setShowCriticalOnly(!showCriticalOnly)}
              className={`h-9 px-3 rounded-xl text-xs font-semibold border transition-all ${
                showCriticalOnly
                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                  : "bg-slate-50 text-slate-500 border-slate-200 dark:border-slate-800/40 dark:border-slate-700"
              }`}
            >
              Critical
            </button>

            {/* Column Picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColPicker(!showColPicker)}
                className="btn btn-secondary text-xs h-9 px-2.5 rounded-xl"
                title="Configure Visible Columns"
              >
                <Sliders size={13} />
              </button>
              {showColPicker && (
                <div className="absolute right-0 top-10 z-50 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-200 pb-1 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px]">
                    <span>Columns</span>
                    <button type="button" onClick={() => setShowColPicker(false)} className="text-slate-400">✕</button>
                  </div>
                  {Object.keys(visibleColumns).map((col) => (
                    <label key={col} className="flex items-center gap-2 cursor-pointer capitalize py-0.5">
                      <input
                        type="checkbox"
                        checked={visibleColumns[col]}
                        onChange={(e) => setVisibleColumns({ ...visibleColumns, [col]: e.target.checked })}
                        className="rounded text-brand-600"
                      />
                      <span className="text-slate-700 dark:text-slate-300 text-[11px]">
                        {col === "wbs" ? "Work Plan/WBS" : col === "variance" ? "Variance" : col.replace(/([A-Z])/g, " $1")}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* ── Circular Dependency Alert ── */}
      {cpm?.hasCycle && (
        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-2 text-xs shrink-0">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span><strong>Circular Dependency:</strong> A closed predecessor loop was detected in the activity network. Please inspect and resolve task relationships.</span>
        </div>
      )}

      {/* ── 3. Master Interactive Gantt Canvas (Split-Panel Tree Grid + Timeline) ── */}
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden flex flex-col ${isFullscreen ? "flex-1" : "h-[calc(100vh-175px)] min-h-[500px]"}`}>

        {!selectedProjectId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4 shadow-sm">
              <BarChart2 size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Project Selected</h3>
            <p className="text-xs text-slate-500 max-w-md mt-1.5 leading-relaxed">
              Please choose a project from the header dropdown above to view, schedule, and interact with its Work Plan/WBS activities, task dependencies, milestones, and critical path timeline.
            </p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <CalendarDays size={44} className="text-slate-300 dark:text-slate-700 mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No scheduled tasks match your filter</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Clear filters or create a new task to build your project schedule.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-secondary text-sm mt-3"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden relative">

            {/* ── Left Tree Grid Panel ── */}
            {!isLeftPanelCollapsed && (
              <div
                style={{ width: `${leftPanelWidth}px` }}
                className="shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 select-none overflow-hidden"
              >
                {/* Left Table Header (Exact 44px height matching timeline header) */}
                <div className="h-11 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 px-2 flex items-center font-bold text-[11px] text-slate-600 dark:text-slate-300 uppercase tracking-wider shrink-0 min-w-[560px]">
                  {visibleColumns.wbs && <div className="w-14 shrink-0 font-mono text-[10px]">Work Plan/WBS</div>}
                  {visibleColumns.title && <div className="w-52 shrink-0 font-semibold truncate pl-1">Task / Activity</div>}
                  {visibleColumns.assignee && <div className="w-24 shrink-0 text-slate-500">Assignee</div>}
                  {visibleColumns.startDate && <div className="w-16 shrink-0 text-center font-mono text-[10px]">Start</div>}
                  {visibleColumns.endDate && <div className="w-16 shrink-0 text-center font-mono text-[10px]">End</div>}
                  {visibleColumns.duration && <div className="w-10 shrink-0 text-center">Dur</div>}
                  {visibleColumns.progress && <div className="w-12 shrink-0 text-center">Prog</div>}
                  {visibleColumns.status && <div className="w-16 shrink-0 text-center">Status</div>}
                  {visibleColumns.variance && <div className="w-14 shrink-0 text-center font-bold">Variance</div>}
                  <div className="w-6 shrink-0 text-right">
                    <button
                      type="button"
                      onClick={() => setIsLeftPanelCollapsed(true)}
                      className="text-slate-400 hover:text-slate-700"
                      title="Collapse Table"
                    >
                      <ChevronsLeft size={13} />
                    </button>
                  </div>
                </div>

                {/* Left Table Body (Master Synchronized Scroll) */}
                <div
                  ref={leftPanelBodyRef}
                  onScroll={handleLeftScroll}
                  className="overflow-y-auto overflow-x-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/80"
                >
                  {groupedTasks.map((group) => {
                    const isCollapsed = collapsedGroups[group.key];
                    return (
                      <div key={group.key}>
                        {groupBy !== "NONE" && (
                          <div
                            onClick={() => setCollapsedGroups({ ...collapsedGroups, [group.key]: !isCollapsed })}
                            className="h-8 px-2 bg-slate-100/80 dark:bg-slate-800/60 text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer hover:bg-slate-200/60 min-w-[560px]"
                          >
                            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                            <span className="truncate">{group.label}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">({group.tasks.length})</span>
                          </div>
                        )}

                        {!isCollapsed && group.tasks.map((task) => {
                          const isCompleted = task.status === "COMPLETED" || Number(task.completion_percent || 0) >= 100;
                          const isCritical = !isCompleted && Boolean(task.is_critical);
                          const isMilestone = Boolean(task.milestone_flag);
                          const isHovered = hoveredTaskId === task.id;

                          return (
                            <div
                              key={task.id}
                              style={{ height: `${ROW_HEIGHT}px` }}
                              onMouseEnter={() => setHoveredTaskId(task.id)}
                              onMouseLeave={() => setHoveredTaskId(null)}
                              onClick={() => handleOpenTaskDetails(task)}
                              className={`px-2 flex items-center text-xs transition cursor-pointer min-w-[560px] ${
                                isHovered
                                  ? "bg-slate-100/90 dark:bg-slate-800/80"
                                  : isCompleted
                                  ? "bg-emerald-50/15"
                                  : isCritical
                                  ? "bg-rose-50/20"
                                  : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                              }`}
                            >
                              {/* Work Plan/WBS Code */}
                              {visibleColumns.wbs && (
                                <div className="w-14 shrink-0 font-mono text-[10px] font-bold text-brand-700 dark:text-brand-400 truncate">
                                  {task.wbs_code || "—"}
                                </div>
                              )}

                              {/* Task Title (Guaranteed Width: Never Collapses!) */}
                              {visibleColumns.title && (
                                <div className="w-52 shrink-0 pr-2 truncate font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                  {isMilestone ? (
                                    <span className="text-amber-500 font-bold shrink-0 text-xs">◆</span>
                                  ) : isCompleted ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                  ) : isCritical ? (
                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                  )}
                                  <span className="truncate hover:text-brand-600" title={task.task_title || task.title}>
                                    {task.task_title || task.title}
                                  </span>
                                </div>
                              )}

                              {/* Assignee */}
                              {visibleColumns.assignee && (
                                <div className="w-24 shrink-0 text-[11px] text-slate-500 truncate flex items-center gap-1">
                                  <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                    {(task.assigned_to_name || "U")[0]}
                                  </span>
                                  <span className="truncate">{task.assigned_to_name || "Unassigned"}</span>
                                </div>
                              )}

                              {/* Start Date */}
                              {visibleColumns.startDate && (
                                <div className="w-16 shrink-0 text-center font-mono text-[10px] text-slate-500">
                                  {task.start_date ? String(task.start_date).split("T")[0].slice(5) : "—"}
                                </div>
                              )}

                              {/* End Date */}
                              {visibleColumns.endDate && (
                                <div className="w-16 shrink-0 text-center font-mono text-[10px] text-slate-500">
                                  {task.end_date ? String(task.end_date).split("T")[0].slice(5) : "—"}
                                </div>
                              )}

                              {/* Duration */}
                              {visibleColumns.duration && (
                                <div className="w-10 shrink-0 text-center font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                  {isMilestone ? "0d" : `${task.duration_days || 1}d`}
                                </div>
                              )}

                              {/* Progress % */}
                              {visibleColumns.progress && (
                                <div className="w-12 shrink-0 text-center font-mono text-[10px]">
                                  {task.completion_percent || 0}%
                                </div>
                              )}

                              {/* Status */}
                              {visibleColumns.status && (
                                <div className="w-16 shrink-0 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    isCompleted
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                                      : task.status === "IN_PROGRESS"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300"
                                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                  }`}>
                                    {isCompleted ? "Done" : task.status === "IN_PROGRESS" ? "Active" : "Pending"}
                                  </span>
                                </div>
                              )}

                              {/* Variance */}
                              {visibleColumns.variance && (
                                <div className="w-14 shrink-0 text-center font-mono text-[10px] font-bold">
                                  {(task.finish_variance_days || 0) > 0 ? (
                                    <span className="text-rose-600">+{task.finish_variance_days}d</span>
                                  ) : (task.finish_variance_days || 0) < 0 ? (
                                    <span className="text-emerald-600">{task.finish_variance_days}d</span>
                                  ) : (
                                    <span className="text-slate-400">0d</span>
                                  )}
                                </div>
                              )}

                              <div className="w-6 shrink-0 text-right">
                                <ChevronRight size={12} className="text-slate-400" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  <div className="h-16" />
                </div>
              </div>
            )}

            {/* Collapsed Left Panel Re-open Pill */}
            {isLeftPanelCollapsed && (
              <div
                onClick={() => setIsLeftPanelCollapsed(false)}
                className="w-7 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex flex-col items-center py-4 cursor-pointer hover:bg-slate-100 transition-colors"
                title="Expand Work Plan/WBS Table"
              >
                <ChevronsRight size={14} className="text-slate-600" />
                <span className="rotate-90 origin-center text-[10px] font-bold text-slate-500 mt-10 whitespace-nowrap">
                  Work Plan/WBS Table
                </span>
              </div>
            )}

            {/* Splitter Resizer Handle */}
            {!isLeftPanelCollapsed && (
              <div
                onMouseDown={handleSplitterMouseDown}
                className="w-1 hover:w-1.5 bg-slate-200 hover:bg-brand-500 dark:bg-slate-800 dark:hover:bg-brand-500 cursor-col-resize shrink-0 transition-all z-20"
                title="Drag to resize table width"
              />
            )}

            {/* ── Right Interactive Timeline & Gantt Canvas ── */}
            <div className="flex-1 flex flex-col overflow-hidden relative bg-white dark:bg-slate-900">

              {/* Two-Tier Timeline Header */}
              <div
                ref={timelineHeaderRef}
                className="h-11 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 overflow-x-hidden select-none shrink-0"
              >
                <div style={{ width: `${timelineWidth}px` }} className="h-full relative flex flex-col text-[10px] font-mono text-slate-500">

                  {/* Tier 1: Exact Calendar Month Boundaries */}
                  <div className="h-5 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center relative overflow-hidden">
                    {calendarHeaderData.months.map((m) => (
                      <div
                        key={m.key}
                        className="absolute border-l border-slate-300 dark:border-slate-700 pl-2 font-bold text-slate-700 dark:text-slate-300 truncate"
                        style={{ left: `${m.left}px`, width: `${m.width}px` }}
                      >
                        {m.label}
                      </div>
                    ))}
                  </div>

                  {/* Tier 2: Days / Weeks / Quarters Ticks */}
                  <div className="h-6 flex items-center relative overflow-hidden">
                    {calendarHeaderData.ticks.map((tick) => (
                      <div
                        key={tick.key}
                        className={`absolute border-l border-slate-200 dark:border-slate-800 h-full flex items-center justify-center font-semibold text-[10px] ${
                          tick.isWeekend ? "bg-slate-100/60 dark:bg-slate-800/40 text-slate-400" : ""
                        }`}
                        style={{ left: `${tick.left}px`, width: `${tick.width}px` }}
                      >
                        {zoomMode === "days" ? (
                          <div className="flex flex-col items-center leading-none">
                            <span className="text-[8px] opacity-75">{tick.dayLetter}</span>
                            <span className="font-bold">{tick.dayNum}</span>
                          </div>
                        ) : (
                          <span>{tick.label}</span>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
              </div>

              {/* Timeline Scrollable Body */}
              <div
                ref={timelineBodyRef}
                onScroll={handleTimelineScroll}
                className="flex-1 overflow-x-auto overflow-y-auto relative select-none"
              >
                <div style={{ width: `${timelineWidth}px` }} className="relative min-h-full">

                  {/* Weekend Column Shading (Days View) */}
                  {zoomMode === "days" && (
                    <div className="absolute inset-0 pointer-events-none">
                      {calendarHeaderData.ticks.filter((t) => t.isWeekend).map((w) => (
                        <div
                          key={w.key}
                          className="absolute top-0 bottom-0 bg-slate-50/70 dark:bg-slate-800/25"
                          style={{ left: `${w.left}px`, width: `${w.width}px` }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Vertical Grid Columns Lines (Matching Header Exact Boundaries) */}
                  <div className="absolute inset-0 pointer-events-none opacity-25">
                    {calendarHeaderData.ticks.map((t) => (
                      <div
                        key={t.key}
                        className="absolute top-0 bottom-0 border-l border-slate-300 dark:border-slate-700"
                        style={{ left: `${t.left}px` }}
                      />
                    ))}
                  </div>

                  {/* Red Today Line Indicator (Layered Behind Bars to Avoid Text Occlusion) */}
                  <div
                    className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-500/70 z-5 pointer-events-none"
                    style={{ left: `${todayX}px` }}
                  >
                    <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-b -translate-x-1/2 absolute top-0 shadow-xs z-25">
                      Today
                    </span>
                  </div>

                  {/* SVG Dependency Lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
                    <defs>
                      <marker id="dep-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3B82F6" />
                      </marker>
                      <marker id="dep-arr-crit" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F43F5E" />
                      </marker>
                    </defs>
                    {dependencyLines.map((line) => (
                      <g key={line.id} className="cursor-pointer pointer-events-auto" onClick={() => handleDeleteDependency(line.id)}>
                        <path
                          d={line.path}
                          fill="none"
                          stroke={line.isCritical ? "#F43F5E" : "#3B82F6"}
                          strokeWidth={line.isCritical ? 2 : 1.5}
                          strokeDasharray={line.lag ? "3,2" : undefined}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          markerEnd={line.isCritical ? "url(#dep-arr-crit)" : "url(#dep-arr)"}
                          className="hover:stroke-width-3 transition-all"
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Gantt Task Bars */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 pb-28">
                    {visibleTaskList.map((task) => {
                      const isCompleted = task.status === "COMPLETED" || Number(task.completion_percent || 0) >= 100;
                      const isCritical = !isCompleted && Boolean(task.is_critical);
                      const isMilestone = Boolean(task.milestone_flag);
                      const isHovered = hoveredTaskId === task.id;

                      const hasValidDate = Boolean(task.start_date || task.early_start);
                      const startX = hasValidDate ? getXForDate(task.start_date || task.early_start) : null;
                      const barWidth = isMilestone ? 20 : getWidthForDuration(task.duration_days);

                      // Baseline bar coordinates
                      const baselineStartX = showBaseline && task.baseline_start ? getXForDate(task.baseline_start) : null;
                      const baselineWidth =
                        showBaseline && task.baseline_end
                          ? Math.max(dayWidth, ((new Date(task.baseline_end) - new Date(task.baseline_start)) / 86400000) * dayWidth)
                          : null;

                      const isLabelOutside = barWidth < 110;

                      return (
                        <div
                          key={task.id}
                          style={{ height: `${ROW_HEIGHT}px` }}
                          onMouseEnter={() => setHoveredTaskId(task.id)}
                          onMouseLeave={() => setHoveredTaskId(null)}
                          className={`relative flex items-center transition ${
                            isHovered ? "bg-slate-100/70 dark:bg-slate-800/60" : ""
                          }`}
                        >
                          {/* Baseline Reference Track Beneath */}
                          {showBaseline && baselineStartX !== null && (
                            <div
                              className="absolute h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 border border-slate-400/50 bottom-1 opacity-75 hover:opacity-100 z-5 transition-opacity"
                              style={{ left: `${baselineStartX}px`, width: `${baselineWidth}px` }}
                              title={`Baseline: ${task.baseline_start} → ${task.baseline_end}`}
                            />
                          )}

                          {/* Milestone Diamond Marker */}
                          {isMilestone && hasValidDate ? (
                            <div
                              className="absolute cursor-pointer z-10 -translate-x-1/2 flex items-center hover:scale-110 transition-transform"
                              style={{ left: `${startX}px` }}
                              onClick={() => handleOpenTaskDetails(task)}
                              title={`Milestone: ${task.task_title || task.title}\nDate: ${task.start_date}`}
                            >
                              <div
                                className={`w-4.5 h-4.5 rotate-45 border-2 shadow-xs flex items-center justify-center ${
                                  isCompleted
                                    ? "bg-emerald-500 border-emerald-700 text-white"
                                    : "bg-amber-400 border-amber-600 text-amber-950"
                                }`}
                              >
                                <span className="text-[8px] -rotate-45 font-black">
                                  {isCompleted ? "✓" : "◆"}
                                </span>
                              </div>
                              <span className="ml-5 text-[11px] font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap bg-white/90 dark:bg-slate-900/90 px-1.5 py-0.5 rounded shadow-2xs">
                                {task.task_title || task.title}
                              </span>
                            </div>
                          ) : hasValidDate ? (
                            /* Standard Gantt Task Bar */
                            <div
                              className={`absolute h-6 rounded-md shadow-xs border flex items-center transition-all cursor-move z-10 ${
                                isCompleted
                                  ? "bg-emerald-600 border-emerald-700 text-white"
                                  : isCritical
                                  ? "bg-rose-600 border-rose-700 text-white"
                                  : task.status === "IN_PROGRESS" || (task.completion_percent || 0) > 0
                                  ? "bg-blue-600 border-blue-700 text-white"
                                  : "bg-slate-500 border-slate-600 text-white"
                              }`}
                              style={{ left: `${startX}px`, width: `${barWidth}px` }}
                              onMouseDown={(e) => handleMouseDown(task, "move", e)}
                              onClick={() => handleOpenTaskDetails(task)}
                              title={`${task.task_title || task.title}\nWork Plan: ${task.wbs_code || "—"}\nStart: ${task.start_date}\nEnd: ${task.end_date}\nDuration: ${task.duration_days}d\nProgress: ${task.completion_percent || 0}%`}
                            >
                              {/* Internal Progress Fill */}
                              {!isCompleted && Number(task.completion_percent || 0) > 0 && (
                                <div
                                  className="absolute left-0 top-0 bottom-0 rounded-l-md bg-white/20 dark:bg-white/25 transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, task.completion_percent || 0))}%` }}
                                />
                              )}

                              {/* Label Inside Bar */}
                              {!isLabelOutside && (
                                <div className="relative z-10 px-2 flex items-center justify-between w-full text-[11px] font-medium truncate">
                                  <span className="truncate flex items-center gap-1">
                                    {task.is_blocked && <span className="text-amber-300">⚠️</span>}
                                    {isCompleted ? `✓ ${task.task_title || task.title}` : (task.task_title || task.title)}
                                  </span>
                                  <span className="text-[10px] font-mono pl-1 shrink-0 opacity-90">
                                    {isCompleted ? "100%" : task.completion_percent > 0 ? `${task.completion_percent}%` : `${task.duration_days}d`}
                                  </span>
                                </div>
                              )}

                              {/* Label Outside Bar (When Bar is Narrow) */}
                              {isLabelOutside && (
                                <div
                                  className="absolute left-full ml-2 text-[11px] font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap flex items-center gap-1 z-20 pointer-events-none"
                                >
                                  {task.is_blocked && <span className="text-amber-500">⚠️</span>}
                                  <span>{isCompleted ? `✓ ${task.task_title || task.title}` : (task.task_title || task.title)}</span>
                                  <span className="font-mono text-[10px] text-slate-500">
                                    ({task.duration_days}d)
                                  </span>
                                </div>
                              )}

                              {/* Right Resize Handle Grip */}
                              <div
                                className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-black/30 rounded-r-md z-20 flex items-center justify-center"
                                onMouseDown={(e) => handleMouseDown(task, "resize", e)}
                                title="Drag to adjust duration"
                              >
                                <span className="w-0.5 h-3 bg-white/60 rounded-full" />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* ── 4. Task Details Slide-Over Right Drawer ── */}
      {selectedTaskDetails && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-2xs flex justify-end">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">

            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-md">
                    {selectedTaskDetails.wbs_code || "Work Plan/WBS"}
                  </span>
                  {selectedTaskDetails.is_critical && (
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 px-2 py-0.5 rounded-md">
                      Critical Path
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
                  {selectedTaskDetails.task_title || selectedTaskDetails.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTaskDetails(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 bg-slate-50/60 dark:bg-slate-800/40 text-xs shrink-0">
              {[
                { id: "info", label: "Task Info", icon: Info },
                { id: "schedule", label: "Schedule & CPM", icon: Calendar },
                { id: "dependencies", label: "Dependencies", icon: Link2 },
                { id: "baseline", label: "Baseline Variance", icon: Layers },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDrawerActiveTab(tab.id)}
                    className={`py-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                      drawerActiveTab === tab.id
                        ? "border-brand-600 text-brand-900 dark:text-white"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon size={14} /> {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">

              {/* TAB 1: TASK INFO */}
              {drawerActiveTab === "info" && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      className="text-sm h-9 w-full px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      value={selectedTaskDetails.task_title || selectedTaskDetails.title || ""}
                      onChange={(e) =>
                        setSelectedTaskDetails({
                          ...selectedTaskDetails,
                          task_title: e.target.value,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Work Plan/WBS Code
                      </label>
                      <input
                        type="text"
                        className="text-sm h-9 w-full px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                        value={selectedTaskDetails.wbs_code || ""}
                        onChange={(e) =>
                          setSelectedTaskDetails({ ...selectedTaskDetails, wbs_code: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Project Scope / Phase
                      </label>
                      <input
                        type="text"
                        className="text-sm h-9 w-full px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        value={selectedTaskDetails.scope_name || ""}
                        onChange={(e) =>
                          setSelectedTaskDetails({ ...selectedTaskDetails, scope_name: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Description &amp; Execution Notes
                    </label>
                    <textarea
                      rows={3}
                      className="text-sm w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      value={selectedTaskDetails.task_description || selectedTaskDetails.description || ""}
                      onChange={(e) =>
                        setSelectedTaskDetails({
                          ...selectedTaskDetails,
                          task_description: e.target.value,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Responsible Assignee
                      </label>
                      <select
                        className="text-sm h-9 w-full px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        value={selectedTaskDetails.assigned_to_id || ""}
                        onChange={(e) => {
                          const uId = e.target.value;
                          const u = users.find((x) => String(x.id) === String(uId));
                          setSelectedTaskDetails({
                            ...selectedTaskDetails,
                            assigned_to_id: uId,
                            assigned_to_name: u?.full_name || u?.username || "",
                          });
                        }}
                      >
                        <option value="">— Unassigned —</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Priority
                      </label>
                      <select
                        className="text-sm h-9 w-full px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
                        value={selectedTaskDetails.priority || "MEDIUM"}
                        onChange={(e) =>
                          setSelectedTaskDetails({ ...selectedTaskDetails, priority: e.target.value })
                        }
                      >
                        <option value="CRITICAL">Critical</option>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Execution Status
                      </label>
                      <select
                        className="text-sm h-9 w-full px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
                        value={selectedTaskDetails.status || "PENDING"}
                        onChange={(e) =>
                          setSelectedTaskDetails({ ...selectedTaskDetails, status: e.target.value })
                        }
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="DELAYED">Delayed</option>
                        <option value="ON_HOLD">On Hold</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Completion: {selectedTaskDetails.completion_percent || 0}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        className="w-full mt-2"
                        value={selectedTaskDetails.completion_percent || 0}
                        onChange={(e) =>
                          setSelectedTaskDetails({
                            ...selectedTaskDetails,
                            completion_percent: Number(e.target.value),
                            status: Number(e.target.value) >= 100 ? "COMPLETED" : Number(e.target.value) > 0 ? "IN_PROGRESS" : "PENDING",
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedTaskDetails.milestone_flag)}
                        onChange={(e) =>
                          setSelectedTaskDetails({
                            ...selectedTaskDetails,
                            milestone_flag: e.target.checked ? 1 : 0,
                            duration_days: e.target.checked ? 0 : Math.max(1, selectedTaskDetails.duration_days || 1),
                          })
                        }
                        className="rounded text-brand-600"
                      />
                      Mark as Project Milestone (Zero Duration Target)
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 2: SCHEDULE & CONSTRAINTS */}
              {drawerActiveTab === "schedule" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Planned Start
                      </label>
                      <input
                        type="date"
                        className="text-sm h-9 w-full px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                        value={selectedTaskDetails.start_date ? String(selectedTaskDetails.start_date).split("T")[0] : ""}
                        onChange={(e) =>
                          setSelectedTaskDetails({ ...selectedTaskDetails, start_date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Planned End
                      </label>
                      <input
                        type="date"
                        className="text-sm h-9 w-full px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                        value={selectedTaskDetails.end_date ? String(selectedTaskDetails.end_date).split("T")[0] : ""}
                        onChange={(e) =>
                          setSelectedTaskDetails({ ...selectedTaskDetails, end_date: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Duration (Days)
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="text-sm h-9 w-full px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                        value={selectedTaskDetails.duration_days ?? 1}
                        onChange={(e) =>
                          setSelectedTaskDetails({
                            ...selectedTaskDetails,
                            duration_days: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Schedule Constraint Type
                    </label>
                    <select
                      className="text-sm h-9 w-full px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
                      value={selectedTaskDetails.constraint_type || "ASAP"}
                      onChange={(e) =>
                        setSelectedTaskDetails({ ...selectedTaskDetails, constraint_type: e.target.value })
                      }
                    >
                      {CONSTRAINTS.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span>CPM Schedule Dates</span>
                      {selectedTaskDetails.is_critical && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded">
                          Critical Activity (0 Total Float)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                      <div>Early Start: {selectedTaskDetails.early_start || selectedTaskDetails.start_date || "—"}</div>
                      <div>Early Finish: {selectedTaskDetails.early_finish || selectedTaskDetails.end_date || "—"}</div>
                      <div>Late Start: {selectedTaskDetails.late_start || "—"}</div>
                      <div>Late Finish: {selectedTaskDetails.late_finish || "—"}</div>
                      <div>Total Float: {selectedTaskDetails.total_float ?? 0} days</div>
                      <div>Free Float: {selectedTaskDetails.free_float ?? 0} days</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DEPENDENCIES */}
              {drawerActiveTab === "dependencies" && (
                <div className="space-y-4">
                  <div>
                    <div className="font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                      <span>Predecessors (Prerequisite activities)</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {(selectedTaskDetails.predecessors || []).length} links
                      </span>
                    </div>

                    {(selectedTaskDetails.predecessors || []).length === 0 ? (
                      <p className="text-slate-400 italic">No incoming predecessor requirements.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(selectedTaskDetails.predecessors || []).map((p) => (
                          <div
                            key={p.id}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {p.predecessor_title || `Task #${p.predecessor_id}`}
                              </span>
                              <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 ml-2">
                                [{p.dependency_type || "FS"}{p.lag_days ? ` +${p.lag_days}d` : ""}]
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteDependency(p.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
                              title="Delete dependency link"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
                      <span>Successors (Downstream tasks waiting on this)</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {(selectedTaskDetails.successors || []).length} links
                      </span>
                    </div>

                    {(selectedTaskDetails.successors || []).length === 0 ? (
                      <p className="text-slate-400 italic">No downstream tasks waiting on this activity.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(selectedTaskDetails.successors || []).map((s) => (
                          <div
                            key={s.id}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {s.successor_title || `Task #${s.task_id}`}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500 ml-2">
                                [{s.dependency_type || "FS"}]
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteDependency(s.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded"
                              title="Delete dependency link"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Inline Add Predecessor */}
                  <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
                    <div className="font-bold text-blue-900 dark:text-blue-300">Add Predecessor Activity</div>
                    <div className="space-y-2">
                      <select
                        className="text-sm h-8 w-full px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        value={inlineNewDep.predecessorId}
                        onChange={(e) => setInlineNewDep({ ...inlineNewDep, predecessorId: e.target.value })}
                      >
                        <option value="">— Select predecessor task —</option>
                        {tasks
                          .filter((t) => t.id !== selectedTaskDetails.id)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.wbs_code ? `${t.wbs_code} • ` : ""}{t.task_title || t.title}
                            </option>
                          ))}
                      </select>

                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="text-sm h-8 w-full px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          value={inlineNewDep.dependencyType}
                          onChange={(e) => setInlineNewDep({ ...inlineNewDep, dependencyType: e.target.value })}
                        >
                          {DEP_TYPES.map((dt) => (
                            <option key={dt.code} value={dt.code}>{dt.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Lag (Days)"
                          className="text-sm h-8 w-full px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                          value={inlineNewDep.lagDays}
                          onChange={(e) => setInlineNewDep({ ...inlineNewDep, lagDays: e.target.value })}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddInlineDependency}
                        className="btn btn-primary text-sm h-8 w-full rounded-lg font-bold inline-flex items-center justify-center gap-1.5"
                      >
                        <Plus size={13} /> Add Dependency Link
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: BASELINE PERFORMANCE */}
              {drawerActiveTab === "baseline" && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      Approved Baseline vs Current Schedule
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Baseline Start</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {selectedTaskDetails.baseline_start || "Not Baselined"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Start</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {selectedTaskDetails.start_date || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Baseline Finish</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          {selectedTaskDetails.baseline_end || "Not Baselined"}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Current Finish</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {selectedTaskDetails.end_date || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 block text-xs">Finish Schedule Variance:</span>
                      <span className="font-mono text-base font-bold">
                        {(selectedTaskDetails.finish_variance_days || 0) > 0 ? (
                          <span className="text-rose-600">+{selectedTaskDetails.finish_variance_days} calendar days behind</span>
                        ) : (selectedTaskDetails.finish_variance_days || 0) < 0 ? (
                          <span className="text-emerald-600">{Math.abs(selectedTaskDetails.finish_variance_days)} calendar days ahead</span>
                        ) : (
                          <span className="text-slate-600">On Baseline Schedule</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => handleDeleteTask(selectedTaskDetails.id)}
                className="btn btn-secondary text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Delete
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskDetails(null)}
                  className="btn btn-secondary text-xs h-9 px-3 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveDrawerChanges}
                  disabled={savingDrawerTask}
                  className="btn btn-primary text-sm h-9 px-4 rounded-xl inline-flex items-center gap-1.5 font-bold"
                >
                  {savingDrawerTask && <Loader2 size={13} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── 5. Modals (Task Create, Baseline, Downstream Cascade) ── */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={18} className="text-brand-600" />
                {taskForm.milestone_flag ? "Add Project Milestone" : "Add Task to Schedule"}
              </h3>
              <button type="button" onClick={() => setTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleSaveTaskForm} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Excavation & Earthworks"
                  className="text-sm h-10 w-full px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  value={taskForm.task_title}
                  onChange={(e) => setTaskForm({ ...taskForm, task_title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Project Scope
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Substructure"
                    className="text-sm h-10 w-full px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    value={taskForm.scope_name}
                    onChange={(e) => setTaskForm({ ...taskForm, scope_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Work Plan/WBS Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1.2.1"
                    className="text-sm h-10 w-full px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    value={taskForm.wbs_code}
                    onChange={(e) => setTaskForm({ ...taskForm, wbs_code: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="text-sm h-10 w-full px-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    value={taskForm.start_date}
                    onChange={(e) => setTaskForm({ ...taskForm, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="text-sm h-10 w-full px-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    value={taskForm.end_date}
                    onChange={(e) => setTaskForm({ ...taskForm, end_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="text-sm h-10 w-full px-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                    value={taskForm.duration_days}
                    onChange={(e) => setTaskForm({ ...taskForm, duration_days: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Owner
                  </label>
                  <select
                    className="text-sm h-10 w-full px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    value={taskForm.assigned_to_id}
                    onChange={(e) => {
                      const uId = e.target.value;
                      const u = users.find((x) => String(x.id) === String(uId));
                      setTaskForm({
                        ...taskForm,
                        assigned_to_id: uId,
                        assigned_to_name: u?.full_name || u?.username || "",
                      });
                    }}
                  >
                    <option value="">— Unassigned —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    className="text-sm h-10 w-full px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-900 dark:text-white"
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  >
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={Boolean(taskForm.milestone_flag)}
                    onChange={(e) => setTaskForm({ ...taskForm, milestone_flag: e.target.checked ? 1 : 0 })}
                    className="rounded text-brand-600"
                  />
                  Mark as Project Milestone (◆)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="btn btn-secondary text-xs h-10 px-4 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="btn btn-primary text-sm h-10 px-5 rounded-xl inline-flex items-center gap-1.5 font-semibold"
                >
                  {savingTask && <Loader2 size={14} className="animate-spin" />}
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Baseline Save Modal */}
      {baselineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-indigo-600" /> Save Project Schedule Baseline
              </h3>
              <button type="button" onClick={() => setBaselineModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <form onSubmit={handleSaveBaseline} className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Recording a baseline freezes a permanent snapshot of current planned start/end dates and durations across all {tasks.length} activities for variance tracking.
              </p>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Baseline Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Schedule Baseline Rev 1"
                  className="text-sm h-10 w-full px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  value={baselineForm.name}
                  onChange={(e) => setBaselineForm({ ...baselineForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Revision Notes / Justification
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Approved baseline after initial client mobilization and scope agreement"
                  className="text-sm w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  value={baselineForm.description}
                  onChange={(e) => setBaselineForm({ ...baselineForm, description: e.target.value })}
                />
              </div>

              {baselines.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-300">Previous Baselines Recorded:</div>
                  {baselines.slice(0, 3).map((b) => (
                    <div key={b.id} className="flex justify-between text-slate-500">
                      <span>v{b.version_no}: {b.baseline_name}</span>
                      <span className="font-mono">{String(b.created_at).split("T")[0]}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setBaselineModalOpen(false)}
                  className="btn btn-secondary text-xs h-10 px-4 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBaseline}
                  className="btn btn-primary text-sm h-10 px-5 rounded-xl inline-flex items-center gap-1.5 font-semibold"
                >
                  {savingBaseline && <Loader2 size={14} className="animate-spin" />}
                  Record Baseline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Downstream Cascade Warning Modal */}
      {impactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Schedule Shift Cascades to Successors
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Moving <strong>{impactDetails.task?.task_title || impactDetails.task?.title}</strong> to{" "}
                  <span className="font-mono text-brand-600 font-bold">{impactDetails.newEndDate}</span> will cascade and update downstream task schedules.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">Affected Downstream Activities:</div>
                {impactDetails.affectedSuccessors.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <span className="text-blue-500 font-bold">→</span>
                    <span>{s.successor_title || `Task #${s.task_id}`}</span>
                    <span className="text-[10px] text-slate-400 font-mono font-bold">({s.dependency_type || "FS"})</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setImpactModalOpen(false)}
                  className="btn btn-secondary text-xs h-10 px-4 rounded-xl font-semibold flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImpactReschedule}
                  className="btn btn-primary text-sm h-10 px-4 rounded-xl font-semibold flex-1"
                >
                  Confirm &amp; Cascade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Reusable Drawers ── */}
      <MilestoneEngineDrawer
        open={milestonesDrawerOpen}
        onClose={() => setMilestonesDrawerOpen(false)}
        projectId={selectedProjectId}
        project={project}
        tasks={tasks}
        users={users}
        milestones={milestones}
        suggestedMilestones={suggestedMilestones}
        counts={milestoneCounts}
        onRefresh={loadSchedule}
      />

      <BaselineManagerDrawer
        open={baselineDrawerOpen}
        onClose={() => setBaselineDrawerOpen(false)}
        projectId={selectedProjectId}
        project={project}
        tasks={tasks}
        milestones={milestones}
        onRefresh={loadSchedule}
      />

      <DependencyManagerDrawer
        open={dependencyDrawerOpen}
        onClose={() => setDependencyDrawerOpen(false)}
        projectId={selectedProjectId}
        project={project}
        tasks={tasks}
        onRefresh={loadSchedule}
      />

    </div>
  );
}
