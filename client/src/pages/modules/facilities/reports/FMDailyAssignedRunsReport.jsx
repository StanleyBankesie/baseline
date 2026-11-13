import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  ShieldCheck,
  CheckSquare,
  Eye,
  X,
  RotateCcw
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

export default function FMDailyAssignedRunsReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [softTasks, setSoftTasks] = useState([]);
  const [inspectionRuns, setInspectionRuns] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [shiftFilter, setShiftFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL"); // "ALL" | "TODAY" | "WEEK" | "MONTH"
  const [typeFilter, setTypeFilter] = useState("ALL"); // "ALL" | "INSPECTION" | "SOFT_TASK"

  const loadReportData = async () => {
    try {
      setLoading(true);
      const [softRes, inspRes, propRes] = await Promise.all([
        api.get("/facilities/soft-tasks").catch(() => ({ data: { data: [] } })),
        api.get("/facilities/inspection-runs").catch(() => ({ data: { data: [] } })),
        api.get("/facilities/properties").catch(() => ({ data: { data: [] } })),
      ]);

      setSoftTasks(softRes.data?.data || []);
      setInspectionRuns(inspRes.data?.data || []);
      setProperties(propRes.data?.data || []);
    } catch {
      toast.error("Failed to load daily inspection runs report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Merge and normalize datasets
  const allRuns = useMemo(() => {
    const list = [];

    // 1. Field Inspection Runs from fm_inspection_runs
    inspectionRuns.forEach((r) => {
      list.push({
        id: `insp-${r.id}`,
        rawId: r.id,
        source: "INSPECTION",
        run_no: r.run_no || `INS-${String(r.id).padStart(4, "0")}`,
        title: r.template_name || "Routine Field Inspection",
        property_id: r.property_id,
        property_name: r.property_name || "Estate Site",
        category: "INSPECTION",
        assigned_to_name: r.inspector_name || "Unassigned",
        supervisor_name: r.supervisor_name || "Pending",
        scheduled_date: r.scheduled_date ? String(r.scheduled_date).slice(0, 10) : "",
        scheduled_time: r.scheduled_time || "09:00",
        shift: r.inspection_type === "ROUTINE_DAILY" ? "MORNING" : "DAY",
        priority: "HIGH",
        status: r.status || "SCHEDULED",
        completion_percent: r.status === "COMPLETED" || r.status === "VERIFIED" ? 100 : r.status === "IN_PROGRESS" ? 50 : 0,
        supervisor_signoff: r.status === "VERIFIED" || !!r.supervisor_name,
        overall_score: r.overall_score_pct,
        defects_count: r.defects_count || 0,
        notes: r.findings_summary || "",
        checklist_payload: r.checklist_payload,
      });
    });

    // 2. Soft Task Daily Runs from fm_soft_tasks
    softTasks.forEach((t) => {
      list.push({
        id: `soft-${t.id}`,
        rawId: t.id,
        source: "SOFT_TASK",
        run_no: t.task_no || `ST-${String(t.id).padStart(4, "0")}`,
        title: t.title || "Facility Operational Check",
        property_id: t.property_id,
        property_name: t.property_name || "Estate Site",
        category: t.task_category || "GENERAL",
        assigned_to_name: t.assigned_to_name || "Crew Staff",
        supervisor_name: t.supervisor_name || "Operations Lead",
        scheduled_date: t.scheduled_date ? String(t.scheduled_date).slice(0, 10) : "",
        scheduled_time: "08:30",
        shift: t.shift || "MORNING",
        priority: t.priority || "NORMAL",
        status: t.status || "ASSIGNED",
        completion_percent: t.completion_percent || 0,
        supervisor_signoff: !!t.verified_by_supervisor,
        overall_score: null,
        defects_count: 0,
        notes: t.description || "",
        checklist_payload: t.checklist_data,
      });
    });

    return list.sort((a, b) => (b.scheduled_date || "").localeCompare(a.scheduled_date || ""));
  }, [inspectionRuns, softTasks]);

  // Filtered runs
  const filteredRuns = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    return allRuns.filter((r) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match =
          r.run_no?.toLowerCase().includes(q) ||
          r.title?.toLowerCase().includes(q) ||
          r.property_name?.toLowerCase().includes(q) ||
          r.assigned_to_name?.toLowerCase().includes(q) ||
          r.supervisor_name?.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (propertyFilter !== "ALL" && String(r.property_id) !== String(propertyFilter)) {
        return false;
      }

      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING" && !["SCHEDULED", "ASSIGNED", "PENDING"].includes(r.status)) return false;
        if (statusFilter === "IN_PROGRESS" && r.status !== "IN_PROGRESS") return false;
        if (statusFilter === "COMPLETED" && !["COMPLETED", "VERIFIED"].includes(r.status)) return false;
      }

      if (shiftFilter !== "ALL" && r.shift !== shiftFilter) return false;
      if (typeFilter !== "ALL" && r.source !== typeFilter) return false;

      if (dateFilter === "TODAY" && r.scheduled_date !== todayStr) return false;
      if (dateFilter === "WEEK" && (!r.scheduled_date || r.scheduled_date < sevenDaysAgo)) return false;
      if (dateFilter === "MONTH" && (!r.scheduled_date || r.scheduled_date < thirtyDaysAgo)) return false;

      return true;
    });
  }, [allRuns, searchTerm, propertyFilter, statusFilter, shiftFilter, typeFilter, dateFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = allRuns.length;
    const completed = allRuns.filter((r) => ["COMPLETED", "VERIFIED"].includes(r.status)).length;
    const inProgress = allRuns.filter((r) => r.status === "IN_PROGRESS").length;
    const signedOff = allRuns.filter((r) => r.supervisor_signoff).length;
    const signoffRate = total > 0 ? Math.round((signedOff / total) * 100) : 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, signedOff, signoffRate, completionRate };
  }, [allRuns]);

  const hasActiveFilters = searchTerm || propertyFilter !== "ALL" || statusFilter !== "ALL" || shiftFilter !== "ALL" || dateFilter !== "ALL" || typeFilter !== "ALL";

  const clearFilters = () => {
    setSearchTerm("");
    setPropertyFilter("ALL");
    setStatusFilter("ALL");
    setShiftFilter("ALL");
    setDateFilter("ALL");
    setTypeFilter("ALL");
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!filteredRuns.length) {
      toast.warn("No data available to export");
      return;
    }

    const headers = [
      "Run No", "Type", "Title / Template", "Property", "Personnel", "Supervisor",
      "Date", "Time", "Shift", "Priority", "Status", "Completion %", "Supervisor Sign-off"
    ];

    const rows = filteredRuns.map((r) => [
      `"${r.run_no}"`,
      `"${r.source === "INSPECTION" ? "Field Inspection" : "Daily Soft Run"}"`,
      `"${(r.title || "").replace(/"/g, '""')}"`,
      `"${(r.property_name || "").replace(/"/g, '""')}"`,
      `"${(r.assigned_to_name || "").replace(/"/g, '""')}"`,
      `"${(r.supervisor_name || "").replace(/"/g, '""')}"`,
      `"${r.scheduled_date || ""}"`,
      `"${r.scheduled_time || ""}"`,
      `"${r.shift || ""}"`,
      `"${r.priority || "NORMAL"}"`,
      `"${r.status || ""}"`,
      `"${r.completion_percent}%"`,
      `"${r.supervisor_signoff ? "Approved" : "Pending"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Daily_Assigned_Runs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Daily Runs Report exported successfully");
  };

  return (
    <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-3.5">
      {/* Concise Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
          >
            <ArrowLeft size={13} /> Back
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Calendar size={18} className="text-emerald-600 dark:text-emerald-400" />
              Daily Assigned Runs & Field Inspections
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Operational audit for daily inspection runs, shift execution, and supervisor sign-offs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadReportData}
            disabled={loading}
            className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
            title="Refresh Data"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition"
          >
            <Download size={13} /> Export CSV
          </button>
          <Link
            to="/facilities/inspections"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition whitespace-nowrap"
          >
            <CheckSquare size={13} /> Schedule Run
          </Link>
        </div>
      </div>

      {/* Concise KPI Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Total Runs</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{metrics.total}</span>
          </div>
          <Calendar size={18} className="text-blue-500/80 shrink-0" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Completed</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{metrics.completed}</span>
              <span className="text-[10px] font-medium text-emerald-600/80">({metrics.completionRate}%)</span>
            </div>
          </div>
          <CheckCircle2 size={18} className="text-emerald-500/80 shrink-0" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">In-Progress</span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight">{metrics.inProgress}</span>
          </div>
          <Clock size={18} className="text-amber-500/80 shrink-0" />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Supervisor Sign-Off</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-purple-600 dark:text-purple-400 leading-tight">{metrics.signoffRate}%</span>
              <span className="text-[10px] text-slate-400">({metrics.signedOff}/{metrics.total})</span>
            </div>
          </div>
          <ShieldCheck size={18} className="text-purple-500/80 shrink-0" />
        </div>
      </div>

      {/* Unified Compact Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center gap-2 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search run #, title, property, inspector..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Date Filter Chips */}
        <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/80 dark:border-slate-700">
          {[
            { id: "ALL", label: "All" },
            { id: "TODAY", label: "Today" },
            { id: "WEEK", label: "7D" },
            { id: "MONTH", label: "30D" },
          ].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDateFilter(d.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                dateFilter === d.id
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Dropdown Filters */}
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="ALL">All Properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.property_name} {p.property_code ? `(${p.property_code})` : ""}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending / Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed / Verified</option>
        </select>

        <select
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="ALL">All Shifts</option>
          <option value="MORNING">Morning</option>
          <option value="AFTERNOON">Afternoon</option>
          <option value="NIGHT">Night</option>
          <option value="DAY">Standard Day</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="ALL">All Types</option>
          <option value="INSPECTION">Inspections</option>
          <option value="SOFT_TASK">Soft Services</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 px-1.5 py-1"
            title="Reset Filters"
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      {/* Main High-Density Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/60 dark:bg-slate-800/40 text-[11px]">
          <span className="font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Assigned Field Runs Register ({filteredRuns.length})
          </span>
          <span className="text-slate-400">
            Showing {filteredRuns.length} of {allRuns.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 text-[11px]">
              <tr>
                <th className="px-3.5 py-2.5">Run # & Title</th>
                <th className="px-3 py-2.5">Property & Shift</th>
                <th className="px-3 py-2.5">Personnel</th>
                <th className="px-3 py-2.5">Schedule</th>
                <th className="px-3 py-2.5">Status & Progress</th>
                <th className="px-3 py-2.5">Sign-Off</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-xs">
              {filteredRuns.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/50 transition-colors">
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {r.run_no}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                        r.source === "INSPECTION" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}>
                        {r.source === "INSPECTION" ? "Inspection" : "Service"}
                      </span>
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white block mt-0.5 truncate max-w-[260px]">
                      {r.title}
                    </span>
                  </td>

                  <td className="px-3 py-2.5">
                    <span className="font-medium text-slate-800 dark:text-slate-200 block truncate max-w-[180px]">
                      {r.property_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {r.shift}
                    </span>
                  </td>

                  <td className="px-3 py-2.5">
                    <span className="font-medium text-slate-800 dark:text-slate-200 block">
                      {r.assigned_to_name}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Lead: {r.supervisor_name}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px]">
                    <div>{r.scheduled_date || "—"}</div>
                    {r.scheduled_time && (
                      <div className="text-[10px] text-slate-400 font-sans">{r.scheduled_time}</div>
                    )}
                  </td>

                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center ${
                          r.status === "COMPLETED" || r.status === "VERIFIED"
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                            : r.status === "IN_PROGRESS"
                            ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {r.status === "VERIFIED" ? "VERIFIED" : r.status || "SCHEDULED"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{r.completion_percent}%</span>
                    </div>
                    <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          r.completion_percent >= 100
                            ? "bg-emerald-500"
                            : r.completion_percent > 0
                            ? "bg-blue-500"
                            : "bg-slate-300 dark:bg-slate-700"
                        }`}
                        style={{ width: `${r.completion_percent}%` }}
                      />
                    </div>
                  </td>

                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {r.supervisor_signoff ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 size={12} /> Approved
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] italic">
                        Pending
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedRun(r)}
                      className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-xs font-medium inline-flex items-center gap-1 transition"
                    >
                      <Eye size={12} /> View
                    </button>
                  </td>
                </tr>
              ))}

              {filteredRuns.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    No assigned daily inspection runs match your search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Inspection Run #{selectedRun.run_no}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRun(null)}
                className="text-slate-400 hover:text-slate-600 text-xs p-1 rounded-md"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Title / Template:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRun.title}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Target Property:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedRun.property_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Assigned Personnel:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedRun.assigned_to_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Direct Supervisor:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{selectedRun.supervisor_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Schedule & Shift:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedRun.scheduled_date} @ {selectedRun.scheduled_time || "09:00"} ({selectedRun.shift})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Priority & Status:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {selectedRun.priority} • {selectedRun.status}
                  </span>
                </div>
              </div>

              {selectedRun.notes && (
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 text-[11px]">
                    Findings & Notes:
                  </span>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 leading-relaxed text-xs">
                    {selectedRun.notes}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Supervisor Sign-off:</span>
                {selectedRun.supervisor_signoff ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Approved
                  </span>
                ) : (
                  <span className="text-amber-600 font-medium italic">Pending Review</span>
                )}
              </div>
            </div>

            <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRun(null)}
                className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
