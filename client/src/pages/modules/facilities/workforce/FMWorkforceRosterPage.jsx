/**
 * @fileoverview FMWorkforceRosterPage
 * Facilities Management - Workforce Roster & Schedule Management
 * Allows scheduling employees to properties, auto-generating daily/weekly shift rosters,
 * attendance tracking, and exporting rosters in PDF and Excel format.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Users, Plus, ArrowLeft, Filter, RefreshCw, Search,
  Clock, UserCog, CalendarDays, Eye, Edit, Trash2,
  Download, Printer, FileSpreadsheet, Sparkles, CheckCircle2,
  Building, Check, X, ShieldAlert, Briefcase
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const rosterStatusBadge = (status) => {
  const map = {
    SCHEDULED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    ACTIVE:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    COMPLETED: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    CANCELLED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  };
  return map[status] || "bg-slate-100 text-slate-500";
};

const attendanceBadge = (status) => {
  const map = {
    PRESENT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    ABSENT:  "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    LATE:    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    LEAVE:   "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  };
  return map[status] || "bg-slate-100 text-slate-500";
};

const ALL_DAYS = [
  { key: "MON", label: "Mon", dayIndex: 1 },
  { key: "TUE", label: "Tue", dayIndex: 2 },
  { key: "WED", label: "Wed", dayIndex: 3 },
  { key: "THU", label: "Thu", dayIndex: 4 },
  { key: "FRI", label: "Fri", dayIndex: 5 },
  { key: "SAT", label: "Sat", dayIndex: 6 },
  { key: "SUN", label: "Sun", dayIndex: 0 },
];

const DEFAULT_FM_ROLES = [
  "Facilities Manager",
  "Facilities Technician",
  "Cleaning Supervisor",
  "Janitor / Cleaning Staff",
  "Security Officer",
  "HVAC Technician",
  "Electrical Technician",
  "Plumber",
  "Groundskeeper / Landscaping",
  "Helpdesk Coordinator",
  "Receptionist / Concierge",
];

const DEFAULT_SHIFTS = [
  { name: "Morning Shift", start_time: "06:00", end_time: "14:00", hours: 8 },
  { name: "Day Shift", start_time: "08:00", end_time: "17:00", hours: 8 },
  { name: "Afternoon Shift", start_time: "14:00", end_time: "22:00", hours: 8 },
  { name: "Night Shift", start_time: "22:00", end_time: "06:00", hours: 8 },
  { name: "Weekend Shift", start_time: "08:00", end_time: "18:00", hours: 10 },
];

function rangeDates(startStr, endStr) {
  if (!startStr || !endStr) return [];
  const out = [];
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(new Date(d));
  }
  return out;
}

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayKeyMap = { 0: "SUN", 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT" };

const getTodayIso = () => new Date().toISOString().slice(0, 10);
const getNextWeekIso = (daysAhead = 6) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
};

// ─── Initial Form States ──────────────────────────────────────────────────────
const getInitialRosterForm = () => ({
  property_id: "",
  employee_id: "",
  employee_name: "",
  role_required: "Facilities Technician",
  shift_name: "Day Shift",
  start_date: getTodayIso(),
  end_date: getNextWeekIso(13), // 2 weeks default
  days_of_week: ["MON", "TUE", "WED", "THU", "FRI"],
  hours_per_shift: 8,
  hourly_rate: 25,
});

const getInitialAttendanceForm = () => ({
  attendance_status: "PRESENT",
  overtime_hours: 0,
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FMWorkforceRosterPage() {
  const navigate = useNavigate();

  // Active view tab: "schedules" (Work Schedule / Assignments) | "autoRoster" (Auto-Generated Roster & Calendar)
  const [activeTab, setActiveTab] = useState("schedules");

  // State data
  const [properties, setProperties] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [positions, setPositions] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Filters for Schedule table
  const [filters, setFilters] = useState({ propertyId: "", status: "", search: "" });

  // Auto-generator control state
  const [autoGenPropertyId, setAutoGenPropertyId] = useState("");
  const [autoGenStartDate, setAutoGenStartDate] = useState(getTodayIso());
  const [autoGenEndDate, setAutoGenEndDate] = useState(getNextWeekIso(6)); // 7-day default
  const [autoGenEmployeeFilter, setAutoGenEmployeeFilter] = useState("");

  // Modals
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [viewingRoster, setViewingRoster] = useState(null);
  const [rosterForm, setRosterForm] = useState(getInitialRosterForm());

  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedRoster, setSelectedRoster] = useState(null);
  const [attendanceForm, setAttendanceForm] = useState(getInitialAttendanceForm());

  // ─── Data Fetching ───────────────────────────────────────────────────────────
  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get("/facilities/properties");
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setProperties(list);
      if (list.length > 0) {
        setRosterForm((f) => ({ ...f, property_id: f.property_id || list[0].id }));
      }
    } catch (err) {
      console.error("fetchProperties error:", err);
    }
  }, []);

  const fetchSetupData = useCallback(async () => {
    try {
      const [persRes, shiftRes, posRes, overviewRes] = await Promise.all([
        api.get("/facilities/setup/personnel").catch(() => ({ data: { data: [] } })),
        api.get("/facilities/setup/shifts").catch(() => ({ data: { data: [] } })),
        api.get("/facilities/setup/positions").catch(() => ({ data: { data: [] } })),
        api.get("/facilities/setup/overview").catch(() => ({ data: { data: {} } })),
      ]);
      const overview = overviewRes.data?.data || {};
      const persList = persRes.data?.data || overview.personnel || [];
      const shiftList = shiftRes.data?.data || overview.shifts || [];
      const posList = posRes.data?.data || overview.positions || [];

      setPersonnel(Array.isArray(persList) ? persList : []);
      setShifts(Array.isArray(shiftList) ? shiftList : []);
      setPositions(Array.isArray(posList) ? posList : []);
    } catch (err) {
      console.warn("Operational setup fetch info:", err);
    }
  }, []);

  const fetchRosters = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.propertyId) params.propertyId = filters.propertyId;
      if (filters.status)     params.status = filters.status;
      if (filters.search)     params.search = filters.search;
      const res = await api.get("/facilities/workforce/rosters", { params });
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setRosters(list);
    } catch (err) {
      console.error("fetchRosters error:", err);
      toast.error(err?.response?.data?.message || "Failed to load workforce roster");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProperties();
    fetchSetupData();
  }, [fetchProperties, fetchSetupData]);

  useEffect(() => {
    fetchRosters();
  }, [fetchRosters]);

  // ─── Handlers for Scheduling ────────────────────────────────────────────────
  const handleEmployeeSelect = (personnelId) => {
    const selected = personnel.find((p) => String(p.id) === String(personnelId));
    if (selected) {
      const role = selected.position || selected.category?.replace(/_/g, " ") || "Facilities Staff";
      setRosterForm((f) => ({
        ...f,
        employee_id: selected.employee_id || selected.id,
        employee_name: selected.name,
        role_required: role,
        shift_name: selected.shift_name || f.shift_name,
      }));
    } else {
      setRosterForm((f) => ({ ...f, employee_id: personnelId }));
    }
  };

  const handleShiftSelect = (shiftVal) => {
    const foundShift = shifts.find((s) => String(s.name) === String(shiftVal) || String(s.id) === String(shiftVal));
    if (foundShift) {
      let hours = 8;
      if (foundShift.start_time && foundShift.end_time) {
        const [sh, sm] = String(foundShift.start_time).split(":").map(Number);
        const [eh, em] = String(foundShift.end_time).split(":").map(Number);
        let diff = (eh + em / 60) - (sh + sm / 60);
        if (diff < 0) diff += 24;
        hours = Math.round(diff * 10) / 10 || 8;
      }
      setRosterForm((f) => ({
        ...f,
        shift_name: foundShift.name,
        hours_per_shift: hours,
      }));
      return;
    }
    const foundPreset = DEFAULT_SHIFTS.find((s) => s.name === shiftVal);
    if (foundPreset) {
      setRosterForm((f) => ({
        ...f,
        shift_name: foundPreset.name,
        hours_per_shift: foundPreset.hours,
      }));
    } else {
      setRosterForm((f) => ({ ...f, shift_name: shiftVal }));
    }
  };

  const toggleDay = (dayKey) => {
    setRosterForm((f) => {
      const existing = f.days_of_week || [];
      const updated = existing.includes(dayKey)
        ? existing.filter((d) => d !== dayKey)
        : [...existing, dayKey];
      return { ...f, days_of_week: updated };
    });
  };

  const selectPresetDays = (preset) => {
    if (preset === "ALL") {
      setRosterForm((f) => ({ ...f, days_of_week: ALL_DAYS.map((d) => d.key) }));
    } else if (preset === "WEEKDAYS") {
      setRosterForm((f) => ({ ...f, days_of_week: ["MON", "TUE", "WED", "THU", "FRI"] }));
    } else if (preset === "WEEKENDS") {
      setRosterForm((f) => ({ ...f, days_of_week: ["SAT", "SUN"] }));
    }
  };

  const handleCreateRoster = async (e) => {
    e.preventDefault();
    if (!rosterForm.property_id) {
      toast.warn("Please select a property.");
      return;
    }
    if (!rosterForm.employee_name.trim()) {
      toast.warn("Please specify an employee name.");
      return;
    }
    if ((rosterForm.days_of_week || []).length === 0) {
      toast.warn("Please select at least one working day of the week.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...rosterForm,
        days_of_week: Array.isArray(rosterForm.days_of_week)
          ? rosterForm.days_of_week.join(",")
          : rosterForm.days_of_week,
      };
      await api.post("/facilities/workforce/rosters", payload);
      toast.success("Employee scheduled to property successfully!");
      setShowRosterModal(false);
      setRosterForm(getInitialRosterForm());
      fetchRosters();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to schedule employee");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoster = async (id) => {
    if (!window.confirm("Are you sure you want to remove this employee schedule?")) return;
    try {
      await api.delete(`/facilities/workforce/rosters/${id}`);
      toast.success("Schedule removed");
      fetchRosters();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove schedule");
    }
  };

  const handleUpdateAttendance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/facilities/workforce/rosters/${selectedRoster.id}`, attendanceForm);
      toast.success("Attendance updated successfully");
      setShowAttendanceModal(false);
      setAttendanceForm(getInitialAttendanceForm());
      fetchRosters();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update attendance");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Auto-Generate Roster Calculations ───────────────────────────────────────
  // Computes the day-by-day shift roster for the chosen property and date range
  const autoGeneratedRoster = useMemo(() => {
    if (!autoGenStartDate || !autoGenEndDate) return [];

    // Filter relevant scheduled assignments
    let candidates = rosters;
    if (autoGenPropertyId) {
      candidates = candidates.filter((r) => String(r.property_id) === String(autoGenPropertyId));
    }
    if (autoGenEmployeeFilter) {
      const q = autoGenEmployeeFilter.toLowerCase();
      candidates = candidates.filter(
        (r) =>
          (r.employee_name && r.employee_name.toLowerCase().includes(q)) ||
          (r.role_required && r.role_required.toLowerCase().includes(q))
      );
    }

    if (candidates.length === 0) return [];

    const dateList = rangeDates(autoGenStartDate, autoGenEndDate);
    const results = [];

    for (const assignment of candidates) {
      // Parse assigned working days
      let workingDays = [];
      if (Array.isArray(assignment.days_of_week)) {
        workingDays = assignment.days_of_week;
      } else if (typeof assignment.days_of_week === "string") {
        workingDays = assignment.days_of_week.split(",").map((s) => s.trim().toUpperCase());
      } else {
        workingDays = ["MON", "TUE", "WED", "THU", "FRI"];
      }

      const assignStart = assignment.start_date ? String(assignment.start_date).slice(0, 10) : null;
      const assignEnd = assignment.end_date ? String(assignment.end_date).slice(0, 10) : null;
      const hoursPerShift = parseFloat(assignment.hours_per_shift) || 8;
      const hourlyRate = parseFloat(assignment.hourly_rate) || 25;

      for (const d of dateList) {
        const iso = d.toISOString().slice(0, 10);
        const dowIndex = d.getDay();
        const dowLabel = dayLabels[dowIndex];
        const dowKey = dayKeyMap[dowIndex];

        // Check if date falls inside the assignment's effective window
        if (assignStart && iso < assignStart) continue;
        if (assignEnd && iso > assignEnd) continue;

        const isWorkingDay = workingDays.includes(dowKey);

        if (isWorkingDay) {
          results.push({
            roster_id: assignment.id,
            roster_no: assignment.roster_no || `RST-${assignment.id}`,
            property_id: assignment.property_id,
            property_name: assignment.property_name || "Assigned Property",
            employee_id: assignment.employee_id,
            employee_name: assignment.employee_name,
            role_required: assignment.role_required || "Facilities Staff",
            date: iso,
            day: dowLabel,
            shift_name: assignment.shift_name || "Day Shift",
            type: "SHIFT",
            label: `${assignment.shift_name || "Day Shift"} (${hoursPerShift} hrs)`,
            hours: hoursPerShift,
            hourly_rate: hourlyRate,
            estimated_cost: Number((hoursPerShift * hourlyRate).toFixed(2)),
            status: assignment.status || "SCHEDULED",
          });
        } else {
          results.push({
            roster_id: assignment.id,
            roster_no: assignment.roster_no || `RST-${assignment.id}`,
            property_id: assignment.property_id,
            property_name: assignment.property_name || "Assigned Property",
            employee_id: assignment.employee_id,
            employee_name: assignment.employee_name,
            role_required: assignment.role_required || "Facilities Staff",
            date: iso,
            day: dowLabel,
            shift_name: "Off Day",
            type: "OFF",
            label: "Scheduled Off Day",
            hours: 0,
            hourly_rate: 0,
            estimated_cost: 0,
            status: "OFF_DAY",
          });
        }
      }
    }

    results.sort((a, b) => a.date.localeCompare(b.date) || a.employee_name.localeCompare(b.employee_name));
    return results;
  }, [rosters, autoGenPropertyId, autoGenStartDate, autoGenEndDate, autoGenEmployeeFilter]);

  // Summary Metrics of the Auto-Generated Roster
  const autoGenMetrics = useMemo(() => {
    const totalSlots = autoGeneratedRoster.length;
    const workingShifts = autoGeneratedRoster.filter((r) => r.type === "SHIFT");
    const offDays = autoGeneratedRoster.filter((r) => r.type === "OFF");
    const totalHours = workingShifts.reduce((acc, curr) => acc + (curr.hours || 0), 0);
    const totalCost = workingShifts.reduce((acc, curr) => acc + (curr.estimated_cost || 0), 0);
    const uniqueEmployees = new Set(autoGeneratedRoster.map((r) => r.employee_name)).size;
    return {
      totalSlots,
      workingCount: workingShifts.length,
      offCount: offDays.length,
      totalHours,
      totalCost,
      uniqueEmployees,
    };
  }, [autoGeneratedRoster]);

  // ─── Export to Excel (.xlsx) ────────────────────────────────────────────────
  const handleExportExcel = () => {
    const listToExport = activeTab === "autoRoster" ? autoGeneratedRoster : rosters;
    if (listToExport.length === 0) {
      toast.warn("No roster records available to export.");
      return;
    }

    let rows = [];
    let fileName = "";

    if (activeTab === "autoRoster") {
      const propObj = properties.find((p) => String(p.id) === String(autoGenPropertyId));
      const propName = propObj ? propObj.property_name.replace(/\s+/g, "_") : "All_Properties";
      fileName = `FM_Workforce_Roster_${propName}_${autoGenStartDate}_to_${autoGenEndDate}.xlsx`;

      rows = autoGeneratedRoster.map((r) => ({
        "Roster Ref": r.roster_no,
        "Property": r.property_name,
        "Employee Name": r.employee_name,
        "Role / Position": r.role_required,
        "Date": r.date,
        "Day of Week": r.day,
        "Assignment": r.label,
        "Type": r.type === "SHIFT" ? "Working Shift" : "Off Day",
        "Hours": r.hours,
        "Est. Cost ($)": r.estimated_cost,
        "Status": r.status,
      }));
    } else {
      fileName = `FM_Employee_Schedules_${getTodayIso()}.xlsx`;
      rows = rosters.map((r) => ({
        "Roster No": r.roster_no,
        "Property": r.property_name || "—",
        "Employee Name": r.employee_name,
        "Role Required": r.role_required,
        "Shift Name": r.shift_name,
        "Start Date": r.start_date ? String(r.start_date).slice(0, 10) : "—",
        "End Date": r.end_date ? String(r.end_date).slice(0, 10) : "—",
        "Working Days": Array.isArray(r.days_of_week) ? r.days_of_week.join(", ") : r.days_of_week || "—",
        "Hours / Shift": r.hours_per_shift,
        "Hourly Rate": r.hourly_rate,
        "Status": r.status,
        "Attendance": r.attendance_status || "—",
        "Overtime (hrs)": r.overtime_hours || 0,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Workforce Roster");
    XLSX.writeFile(wb, fileName);
    toast.success(`Exported ${rows.length} records to ${fileName}`);
  };

  // ─── Export to PDF (.pdf) ───────────────────────────────────────────────────
  const handleExportPDF = () => {
    const listToExport = activeTab === "autoRoster" ? autoGeneratedRoster : rosters;
    if (listToExport.length === 0) {
      toast.warn("No roster records available to export.");
      return;
    }

    const doc = new jsPDF("landscape", "pt", "a4");
    const today = new Date().toLocaleDateString();

    if (activeTab === "autoRoster") {
      const propObj = properties.find((p) => String(p.id) === String(autoGenPropertyId));
      const propTitle = propObj ? propObj.property_name : "All Properties";

      // Title & Header Information
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text("Facilities Management - Workforce Schedule Roster", 40, 40);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Property: ${propTitle}  |  Period: ${autoGenStartDate} to ${autoGenEndDate}  |  Generated on: ${today}`, 40, 56);
      doc.text(`Total Staff: ${autoGenMetrics.uniqueEmployees}  |  Total Shifts: ${autoGenMetrics.workingCount}  |  Total Hours: ${autoGenMetrics.totalHours} hrs`, 40, 70);

      // Table Data
      const tableColumn = ["Property", "Employee", "Role", "Date", "Day", "Assignment / Shift", "Type", "Hours"];
      const tableRows = autoGeneratedRoster.map((r) => [
        r.property_name,
        r.employee_name,
        r.role_required,
        r.date,
        r.day,
        r.label,
        r.type === "SHIFT" ? "Shift" : "Off",
        String(r.hours),
      ]);

      doc.autoTable({
        startY: 85,
        head: [tableColumn],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { cellPadding: 4, overflow: "linebreak" },
      });

      doc.save(`FM_Workforce_Roster_${propTitle.replace(/\s+/g, "_")}_${autoGenStartDate}.pdf`);
    } else {
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text("Facilities Management - Employee Roster Assignments", 40, 40);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Active Property Staff Deployment  |  Generated on: ${today}  |  Total Records: ${rosters.length}`, 40, 56);

      const tableColumn = ["Roster No", "Employee Name", "Role", "Property", "Shift", "Window", "Days", "Hrs", "Status", "Attendance"];
      const tableRows = rosters.map((r) => [
        r.roster_no,
        r.employee_name,
        r.role_required,
        r.property_name || "—",
        r.shift_name,
        `${r.start_date ? String(r.start_date).slice(0, 10) : ""} - ${r.end_date ? String(r.end_date).slice(0, 10) : ""}`,
        Array.isArray(r.days_of_week) ? r.days_of_week.join(",") : r.days_of_week || "—",
        String(r.hours_per_shift || 8),
        r.status,
        r.attendance_status || "—",
      ]);

      doc.autoTable({
        startY: 75,
        head: [tableColumn],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [124, 58, 237], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { cellPadding: 4, overflow: "linebreak" },
      });

      doc.save(`FM_Employee_Roster_Assignments_${getTodayIso()}.pdf`);
    }
    toast.success("PDF generated and downloaded successfully");
  };

  // ─── Preset Quick Date Pickers for Auto-Roster ──────────────────────────────
  const handleQuickPreset = (preset) => {
    const today = new Date();
    if (preset === "THIS_WEEK") {
      const s = new Date(today);
      s.setDate(today.getDate() - today.getDay() + 1); // Monday
      const e = new Date(s);
      e.setDate(s.getDate() + 6); // Sunday
      setAutoGenStartDate(s.toISOString().slice(0, 10));
      setAutoGenEndDate(e.toISOString().slice(0, 10));
    } else if (preset === "NEXT_WEEK") {
      const s = new Date(today);
      s.setDate(today.getDate() - today.getDay() + 8); // Next Monday
      const e = new Date(s);
      e.setDate(s.getDate() + 6); // Next Sunday
      setAutoGenStartDate(s.toISOString().slice(0, 10));
      setAutoGenEndDate(e.toISOString().slice(0, 10));
    } else if (preset === "THIS_MONTH") {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setAutoGenStartDate(s.toISOString().slice(0, 10));
      setAutoGenEndDate(e.toISOString().slice(0, 10));
    }
  };

  // ─── Filter helpers ─────────────────────────────────────────────────────────
  const ff = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));
  const fr = (field) => (e) => setRosterForm((f) => ({ ...f, [field]: e.target.value }));
  const fa = (field) => (e) => setAttendanceForm((f) => ({ ...f, [field]: e.target.value }));

  // ─── Statistics ─────────────────────────────────────────────────────────────
  const totalAssignments = rosters.length;
  const activeToday = rosters.filter((r) => r.status === "ACTIVE" || r.status === "SCHEDULED").length;
  const absentToday = rosters.filter((r) => r.attendance_status === "ABSENT").length;
  const totalOvertime = rosters.reduce((sum, r) => sum + (parseFloat(r.overtime_hours) || 0), 0);

  // ─── Component Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl"
            title="Go Back"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Workforce Roster &amp; Schedule Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Schedule employees to properties, auto-generate daily shift rosters, and export in PDF &amp; Excel.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold shadow-sm transition-all"
            title="Download Roster in Excel (.xlsx) format"
          >
            <FileSpreadsheet size={15} /> Export Excel
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold shadow-sm transition-all"
            title="Download Roster in PDF (.pdf) format"
          >
            <Printer size={15} /> Export PDF
          </button>
          <button
            type="button"
            onClick={() => {
              setRosterForm(getInitialRosterForm());
              setShowRosterModal(true);
            }}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm active:scale-95"
          >
            <Plus size={15} /> Assign Employee
          </button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Deployments</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{totalAssignments}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Active Staff</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeToday}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Absent Today</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{absentToday}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Logged Overtime</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalOvertime.toFixed(1)} hrs</p>
        </div>
      </div>

      {/* ── Main Navigation Tabs ── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab("schedules")}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "schedules"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Users size={14} />
          Work Schedule &amp; Property Assignments ({rosters.length})
        </button>
        <button
          onClick={() => setActiveTab("autoRoster")}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "autoRoster"
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Sparkles size={14} />
          Auto-Generate Roster &amp; Calendar Grid
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: WORK SCHEDULES & PROPERTY ASSIGNMENTS (LIST VIEW)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "schedules" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Filter size={13} />
                <span className="text-xs font-semibold text-slate-500">Filter By</span>
              </div>
              <select
                value={filters.propertyId}
                onChange={ff("propertyId")}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200"
              >
                <option value="">All Properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.property_name}</option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={ff("status")}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200"
              >
                <option value="">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <div className="flex-1 min-w-[200px] relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employee name or role..."
                  value={filters.search}
                  onChange={ff("search")}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-3 py-1.5 text-xs text-slate-700 dark:text-slate-200"
                />
              </div>
              <button
                type="button"
                onClick={fetchRosters}
                className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>

          {/* Assignments Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Roster No</th>
                    <th className="px-3 py-3">Employee Name</th>
                    <th className="px-3 py-3">Role Required</th>
                    <th className="px-3 py-3">Property</th>
                    <th className="px-3 py-3">Shift</th>
                    <th className="px-3 py-3">Start Date</th>
                    <th className="px-3 py-3">End Date</th>
                    <th className="px-3 py-3">Working Days</th>
                    <th className="px-3 py-3 text-center">Hrs/Shift</th>
                    <th className="px-3 py-3 text-center">Rate</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Attendance</th>
                    <th className="px-3 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan="13" className="text-center py-10 text-slate-400">Loading workforce roster…</td>
                    </tr>
                  ) : rosters.length === 0 ? (
                    <tr>
                      <td colSpan="13" className="text-center py-10 text-slate-400 italic">
                        No roster assignments found. Click &quot;Assign Employee&quot; above to schedule staff to a property.
                      </td>
                    </tr>
                  ) : (
                    rosters.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-white">{r.roster_no}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-100">{r.employee_name}</td>
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{r.role_required}</td>
                        <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200">{r.property_name || "—"}</td>
                        <td className="px-3 py-3 font-medium text-emerald-600 dark:text-emerald-400">{r.shift_name}</td>
                        <td className="px-3 py-3 font-mono text-xs">{r.start_date ? String(r.start_date).slice(0, 10) : "—"}</td>
                        <td className="px-3 py-3 font-mono text-xs">{r.end_date ? String(r.end_date).slice(0, 10) : "—"}</td>
                        <td className="px-3 py-3">
                          <span className="font-mono text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {Array.isArray(r.days_of_week) ? r.days_of_week.join(", ") : r.days_of_week || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-mono text-center">{r.hours_per_shift ?? "8"}</td>
                        <td className="px-3 py-3 font-mono text-center">${r.hourly_rate ?? "25"}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${rosterStatusBadge(r.status)}`}>
                            {r.status?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {r.attendance_status ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${attendanceBadge(r.attendance_status)}`}>
                              {r.attendance_status}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setViewingRoster(r)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all"
                              title="View Deployment Details"
                            >
                              <Eye size={11} /> View
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRoster(r);
                                setAttendanceForm({
                                  attendance_status: r.attendance_status || "PRESENT",
                                  overtime_hours: r.overtime_hours ?? 0,
                                });
                                setShowAttendanceModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-violet-50 hover:bg-violet-100 dark:bg-emerald-950 text-emerald-700 dark:text-violet-300 rounded-lg text-xs font-semibold transition-all"
                              title="Update Attendance & Overtime"
                            >
                              <UserCog size={11} /> Attendance
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRoster(r.id)}
                              className="inline-flex items-center p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
                              title="Delete Schedule"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: AUTO-GENERATE ROSTER & CALENDAR / TIMELINE GRID
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "autoRoster" && (
        <div className="space-y-6">
          {/* Controls Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Auto-Roster Generator Parameters
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a property and schedule period. The system automatically computes working shifts and off-days based on employee work schedule definitions.
                </p>
              </div>

              {/* Quick Period Presets */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <span className="text-slate-400 px-2 font-medium">Quick Range:</span>
                <button
                  type="button"
                  onClick={() => handleQuickPreset("THIS_WEEK")}
                  className="px-2.5 py-1 rounded-lg font-semibold hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset("NEXT_WEEK")}
                  className="px-2.5 py-1 rounded-lg font-semibold hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
                >
                  Next Week
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset("THIS_MONTH")}
                  className="px-2.5 py-1 rounded-lg font-semibold hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
                >
                  This Month
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Property
                </label>
                <select
                  value={autoGenPropertyId}
                  onChange={(e) => setAutoGenPropertyId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="">All Properties (Consolidated)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.property_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={autoGenStartDate}
                  onChange={(e) => setAutoGenStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={autoGenEndDate}
                  onChange={(e) => setAutoGenEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Filter by Staff / Role
                </label>
                <input
                  type="text"
                  placeholder="e.g. John or Technician..."
                  value={autoGenEmployeeFilter}
                  onChange={(e) => setAutoGenEmployeeFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Generator Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-3">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">Staff In Roster</span>
              <span className="text-xl font-bold text-emerald-950 dark:text-emerald-100">{autoGenMetrics.uniqueEmployees} Assigned</span>
            </div>
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-3">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">Working Shifts</span>
              <span className="text-xl font-bold text-emerald-950 dark:text-emerald-100">{autoGenMetrics.workingCount} Shifts</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Scheduled Off Days</span>
              <span className="text-xl font-bold text-slate-800 dark:text-slate-200">{autoGenMetrics.offCount} Days</span>
            </div>
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-3">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-violet-300 uppercase tracking-wider block">Total Scheduled Hours</span>
              <span className="text-xl font-bold text-emerald-950 dark:text-emerald-100">{autoGenMetrics.totalHours.toFixed(1)} hrs</span>
            </div>
            <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-3">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">Est. Labor Cost</span>
              <span className="text-xl font-bold text-amber-950 dark:text-amber-100">${autoGenMetrics.totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Generated Day-by-Day Roster Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Generated Schedule Timetable ({autoGeneratedRoster.length} Entries)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Full day-by-day shift deployment breakdown across all scheduled properties and dates.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
                >
                  <FileSpreadsheet size={13} className="text-emerald-600" /> Download Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
                >
                  <Printer size={13} className="text-rose-600" /> Download PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Property</th>
                    <th className="px-3 py-3">Employee Name</th>
                    <th className="px-3 py-3">Role Required</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Day</th>
                    <th className="px-3 py-3">Assignment &amp; Shift</th>
                    <th className="px-3 py-3 text-center">Type</th>
                    <th className="px-3 py-3 text-center">Hours</th>
                    <th className="px-3 py-3 text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {autoGeneratedRoster.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-12 text-slate-400 italic">
                        No roster entries generated for the selected parameters. Ensure you have active employee schedules configured in Tab 1.
                      </td>
                    </tr>
                  ) : (
                    autoGeneratedRoster.map((item, idx) => (
                      <tr
                        key={`${item.roster_id}-${item.date}-${idx}`}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                          item.type === "OFF" ? "bg-slate-50/50 dark:bg-slate-900/40 opacity-70" : ""
                        }`}
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {item.property_name}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                          {item.employee_name}
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                          {item.role_required}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300">
                          {item.date}
                        </td>
                        <td className="px-3 py-2.5 font-semibold">
                          <span className={item.day === "Sat" || item.day === "Sun" ? "text-amber-600" : "text-slate-600 dark:text-slate-300"}>
                            {item.day}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block font-medium ${item.type === "SHIFT" ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-slate-400 italic"}`}>
                            {item.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {item.type === "SHIFT" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              SHIFT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              OFF
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-center font-semibold text-slate-800 dark:text-slate-200">
                          {item.hours}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-right text-slate-600 dark:text-slate-300">
                          ${item.estimated_cost.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: ASSIGN / SCHEDULE EMPLOYEE TO PROPERTY
      ══════════════════════════════════════════════════════════════════════ */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-4xl lg:max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays size={18} className="text-emerald-600" />
                Assign Employee to Property Roster
              </h3>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRoster} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Property Selection */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Assigned Property *
                  </label>
                  <select
                    value={rosterForm.property_id}
                    onChange={fr("property_id")}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200"
                    required
                  >
                    <option value="">Select Property...</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.property_name}</option>
                    ))}
                  </select>
                </div>

                {/* Employee Quick Select from Service Personnel */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Select Employee (Operational Setup) *
                  </label>
                  <select
                    value={rosterForm.employee_id}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Choose from operational service personnel...</option>
                    {personnel.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.employee_code ? `(${p.employee_code})` : ""} - {p.position || p.category?.replace(/_/g, " ") || "Staff"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Name (editable / fallback) */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Employee Full Name *
                  </label>
                  <input
                    type="text"
                    value={rosterForm.employee_name}
                    onChange={fr("employee_name")}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                {/* Role Required */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Role / Position *
                  </label>
                  <select
                    value={rosterForm.role_required}
                    onChange={fr("role_required")}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Select Position...</option>
                    {positions.map((pos) => (
                      <option key={pos.id} value={pos.title}>
                        {pos.title} {pos.code ? `(${pos.code})` : ""}
                      </option>
                    ))}
                    {DEFAULT_FM_ROLES.filter((r) => !positions.some((p) => p.title === r)).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shift Selection */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Shift Name *
                  </label>
                  <select
                    value={rosterForm.shift_name}
                    onChange={(e) => handleShiftSelect(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Select operational shift...</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
                      </option>
                    ))}
                    {DEFAULT_SHIFTS.filter((ds) => !shifts.some((s) => s.name === ds.name)).map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.start_time} - {s.end_time})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hours & Rate */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Hours / Shift
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="24"
                      step="0.5"
                      value={rosterForm.hours_per_shift}
                      onChange={(e) => setRosterForm((f) => ({ ...f, hours_per_shift: parseFloat(e.target.value) }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Hourly Rate ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rosterForm.hourly_rate}
                      onChange={(e) => setRosterForm((f) => ({ ...f, hourly_rate: parseFloat(e.target.value) }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Schedule Effective Window */}
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Schedule Start Date *
                  </label>
                  <input
                    type="date"
                    value={rosterForm.start_date}
                    onChange={fr("start_date")}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Schedule End Date *
                  </label>
                  <input
                    type="date"
                    value={rosterForm.end_date}
                    onChange={fr("end_date")}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              {/* Working Days of Week Toggle */}
              <div>
                <label className="block font-semibold mb-2 text-slate-700 dark:text-slate-300">
                  Working Days of Week *
                </label>

                <div className="flex flex-wrap gap-2">
                  {ALL_DAYS.map((d) => {
                    const checked = (rosterForm.days_of_week || []).includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => toggleDay(d.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          checked
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                        }`}
                      >
                        {checked && <Check size={11} />}
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowRosterModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  {submitting ? "Saving Schedule…" : "Save Employee Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: UPDATE ATTENDANCE & OVERTIME
      ══════════════════════════════════════════════════════════════════════ */}
      {showAttendanceModal && selectedRoster && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={18} className="text-violet-500" />
                Update Attendance &amp; Overtime
              </h3>
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateAttendance} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-600 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-white">{selectedRoster.employee_name}</span>
                <span className="text-slate-400 ml-2">— {selectedRoster.role_required}</span>
                <span className="block text-xs text-slate-400 mt-0.5">
                  {selectedRoster.shift_name} · {selectedRoster.property_name || "Assigned Property"}
                </span>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Attendance Status *
                </label>
                <select
                  value={attendanceForm.attendance_status}
                  onChange={fa("attendance_status")}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                  <option value="LEAVE">On Leave</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Overtime Hours
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={attendanceForm.overtime_hours}
                  onChange={(e) => setAttendanceForm((f) => ({ ...f, overtime_hours: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  {submitting ? "Saving…" : "Save Attendance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: VIEW ROSTER ASSIGNMENT DETAILS
      ══════════════════════════════════════════════════════════════════════ */}
      {viewingRoster && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Roster Assignment — {viewingRoster.roster_no}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRoster(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-xs">Employee Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{viewingRoster.employee_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Role Required</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingRoster.role_required}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Property</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingRoster.property_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Shift</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingRoster.shift_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Schedule Window</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {viewingRoster.start_date ? String(viewingRoster.start_date).slice(0, 10) : "—"} to {viewingRoster.end_date ? String(viewingRoster.end_date).slice(0, 10) : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Working Days</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {Array.isArray(viewingRoster.days_of_week) ? viewingRoster.days_of_week.join(", ") : viewingRoster.days_of_week || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Shift Hours</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{viewingRoster.hours_per_shift} hrs / shift</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Hourly Rate</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">${viewingRoster.hourly_rate ?? 25} / hr</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block mt-0.5 ${rosterStatusBadge(viewingRoster.status)}`}>
                    {viewingRoster.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Attendance</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block mt-0.5 ${attendanceBadge(viewingRoster.attendance_status)}`}>
                    {viewingRoster.attendance_status || "PENDING"} (OT: {viewingRoster.overtime_hours || 0} hrs)
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewingRoster(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
