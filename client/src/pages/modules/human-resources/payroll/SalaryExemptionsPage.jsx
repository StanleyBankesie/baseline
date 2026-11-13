/**
 * @file SalaryExemptionsPage.jsx
 * @description Manage employee salary exemptions and holds.
 * Allows HR to exclude employees from monthly salary processing and payslip generation.
 */

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  UserX,
  RotateCcw,
  Trash2,
  Edit2,
  ArrowLeft,
  Clock,
  Check,
  X,
  Layers,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import { Guard } from "../../../../hooks/usePermissions.jsx";

const EXEMPTION_TYPES = [
  { value: "SALARY_HOLD", label: "Salary Hold (Temporarily Withheld)", color: "amber" },
  { value: "UNPAID_LEAVE", label: "Unpaid Leave of Absence", color: "blue" },
  { value: "DISCIPLINARY", label: "Disciplinary Action / Suspension", color: "rose" },
  { value: "ABSCONDED", label: "Absconded / Unauthorized Absence", color: "purple" },
  { value: "PENDING_DOCS", label: "Pending Onboarding / Bank Documents", color: "orange" },
  { value: "MANUAL_EXEMPTION", label: "Manual HR Exemption", color: "slate" },
];

export default function SalaryExemptionsPage() {
  const navigate = useNavigate();
  const [exemptions, setExemptions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payrollPeriods, setPayrollPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [periodFilter, setPeriodFilter] = useState("ALL");

  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [monthFilter, setMonthFilter] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExemption, setEditingExemption] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    payroll_period_ids: [],
    exemption_type: "SALARY_HOLD",
    reason: "",
  });

  useEffect(() => {
    loadExemptions();
    loadActiveEmployees();
    loadPayrollPeriods();
  }, [monthFilter, statusFilter, periodFilter]);

  const loadExemptions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (monthFilter) params.period_month = monthFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (periodFilter !== "ALL") params.payroll_period_id = periodFilter;
      const res = await api.get("/hr/payroll/exemptions", { params });
      setExemptions(res.data?.items || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load salary exemptions");
    } finally {
      setLoading(false);
    }
  };

  const loadActiveEmployees = async () => {
    try {
      const res = await api.get("/hr/employees", {
        params: { status: "ACTIVE" },
      });
      setEmployees(res.data?.items || []);
    } catch (err) {
      console.error("Failed to load employees for dropdown", err);
    }
  };

  const loadPayrollPeriods = async () => {
    try {
      const res = await api.get("/hr/payroll/periods");
      setPayrollPeriods(res.data?.items || []);
    } catch (err) {
      console.error("Failed to load payroll periods", err);
    }
  };

  const handleOpenAddModal = () => {
    setEditingExemption(null);
    setFormData({
      employee_id: "",
      payroll_period_ids: [],
      exemption_type: "SALARY_HOLD",
      reason: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingExemption(item);
    setFormData({
      employee_id: String(item.employee_id || ""),
      payroll_period_ids: item.payroll_period_id ? [Number(item.payroll_period_id)] : [],
      exemption_type: item.exemption_type || "SALARY_HOLD",
      reason: item.reason || "",
    });
    setIsModalOpen(true);
  };

  const togglePeriodSelection = (periodId) => {
    setFormData((prev) => {
      const id = Number(periodId);
      const exists = prev.payroll_period_ids.includes(id);
      if (editingExemption) {
        // Single selection when editing
        return { ...prev, payroll_period_ids: [id] };
      }
      return {
        ...prev,
        payroll_period_ids: exists
          ? prev.payroll_period_ids.filter((p) => p !== id)
          : [...prev.payroll_period_ids, id],
      };
    });
  };

  const handleSelectAllOpenPeriods = () => {
    const openPeriodIds = payrollPeriods
      .filter((p) => p.status !== "CLOSED")
      .map((p) => Number(p.id));
    setFormData((prev) => ({
      ...prev,
      payroll_period_ids: Array.from(new Set([...prev.payroll_period_ids, ...openPeriodIds])),
    }));
  };

  const handleClearPeriodSelection = () => {
    setFormData((prev) => ({ ...prev, payroll_period_ids: [] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast.warning("Please select an employee to exempt");
      return;
    }
    if (!formData.payroll_period_ids || formData.payroll_period_ids.length === 0) {
      toast.warning("Please select at least one payroll period");
      return;
    }
    if (!formData.reason.trim()) {
      toast.warning("Please enter a reason or justification for this salary exemption");
      return;
    }

    setSubmitting(true);
    try {
      if (editingExemption) {
        await api.put(`/hr/payroll/exemptions/${editingExemption.id}`, {
          payroll_period_id: formData.payroll_period_ids[0],
          exemption_type: formData.exemption_type,
          reason: formData.reason,
        });
        toast.success("Salary exemption updated successfully");
      } else {
        await api.post("/hr/payroll/exemptions", {
          employee_id: formData.employee_id,
          payroll_period_ids: formData.payroll_period_ids,
          exemption_type: formData.exemption_type,
          reason: formData.reason,
        });
        toast.success(
          formData.payroll_period_ids.length > 1
            ? `Employee successfully exempted from salary for ${formData.payroll_period_ids.length} payroll periods`
            : "Employee salary exemption applied successfully"
        );
      }
      setIsModalOpen(false);
      loadExemptions();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save salary exemption");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async (id, empName) => {
    if (
      !window.confirm(
        `Are you sure you want to release the salary exemption for ${empName}? This will restore them to regular salary processing.`
      )
    ) {
      return;
    }
    try {
      await api.put(`/hr/payroll/exemptions/${id}/release`);
      toast.success(`Salary exemption released for ${empName}`);
      loadExemptions();
    } catch (err) {
      toast.error("Failed to release salary exemption");
    }
  };

  const handleDelete = async (id, empName) => {
    if (
      !window.confirm(
        `Delete this exemption record for ${empName}? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/hr/payroll/exemptions/${id}`);
      toast.success("Exemption record removed");
      loadExemptions();
    } catch (err) {
      toast.error("Failed to delete record");
    }
  };

  // Filtered list
  const filteredExemptions = useMemo(() => {
    return exemptions.filter((item) => {
      if (typeFilter !== "ALL" && item.exemption_type !== typeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = `${item.first_name || ""} ${item.last_name || ""}`.toLowerCase();
      const code = String(item.emp_code || "").toLowerCase();
      const reason = String(item.reason || "").toLowerCase();
      const dept = String(item.dept_name || "").toLowerCase();
      const period = String(item.period_name || "").toLowerCase();
      return (
        name.includes(q) ||
        code.includes(q) ||
        reason.includes(q) ||
        dept.includes(q) ||
        period.includes(q)
      );
    });
  }, [exemptions, searchQuery, typeFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    const totalActive = exemptions.filter((e) => e.status === "ACTIVE").length;
    const thisMonthActive = exemptions.filter(
      (e) => e.status === "ACTIVE" && (!e.period_month || e.period_month === currentMonthStr)
    ).length;
    const unpaidLeave = exemptions.filter(
      (e) => e.status === "ACTIVE" && e.exemption_type === "UNPAID_LEAVE"
    ).length;
    const released = exemptions.filter((e) => e.status === "RELEASED").length;
    return { totalActive, thisMonthActive, unpaidLeave, released };
  }, [exemptions, currentMonthStr]);

  return (
    <Guard moduleKey="human-resources">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => navigate("/human-resources")}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1 text-sm font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-6 h-6" />
              </span>
              Salary Exemptions & Holds
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Exclude specific employees from monthly salary processing, withholding calculation and payslip generation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-700 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Salary Exemption
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Holds</span>
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <UserX className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.totalActive}</p>
            <p className="text-xs text-slate-500 mt-1">Total employees currently held</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">This Month ({currentMonthStr})</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <Calendar className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{stats.thisMonthActive}</p>
            <p className="text-xs text-slate-500 mt-1">Exempt from current cycle</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unpaid Leave</span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.unpaidLeave}</p>
            <p className="text-xs text-slate-500 mt-1">Excluded for leave without pay</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Released / Restored</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{stats.released}</p>
            <p className="text-xs text-slate-500 mt-1">Prior holds restored</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, staff code, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-normal"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Period Filter */}
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 font-normal"
            >
              <option value="ALL">All Payroll Periods</option>
              {payrollPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.period_name}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 font-normal"
            >
              <option value="ALL">All Exemption Types</option>
              {EXEMPTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 font-normal"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Holds Only</option>
              <option value="RELEASED">Released Holds Only</option>
            </select>
          </div>
        </div>

        {/* Exemptions Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Payroll Period</th>
                  <th className="px-4 py-3">Exemption Type</th>
                  <th className="px-4 py-3">Reason / Justification</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created / Released By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-slate-500">
                      Loading salary exemptions...
                    </td>
                  </tr>
                ) : filteredExemptions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-slate-500">
                      <ShieldAlert className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                        No Salary Exemptions Found
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        All active employees will be included in the salary processing run unless exempted.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredExemptions.map((item) => {
                    const isActive = item.status === "ACTIVE";
                    const typeObj =
                      EXEMPTION_TYPES.find((t) => t.value === item.exemption_type) || {
                        label: item.exemption_type,
                        color: "slate",
                      };

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        {/* Employee info */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {item.first_name} {item.last_name}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Code: {item.emp_code || `EMP-${item.employee_id}`}</span>
                            {item.dept_name && (
                              <>
                                <span>•</span>
                                <span>{item.dept_name}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Payroll Period */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {item.period_name || item.period_month || `Period #${item.payroll_period_id}`}
                          </span>
                        </td>

                        {/* Type badge */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                            {typeObj.label}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                            {item.reason || "No notes provided"}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              EXEMPTED (ON HOLD)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900">
                              <Check className="w-3 h-3" />
                              RELEASED / ACTIVE
                            </span>
                          )}
                        </td>

                        {/* Audit info */}
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                          <div>
                            {isActive ? (
                              <span>By {item.created_by_name || "HR Admin"}</span>
                            ) : (
                              <span>Released by {item.released_by_name || "HR Admin"}</span>
                            )}
                            <div className="text-[10px] text-slate-400">
                              {new Date(item.created_at || Date.now()).toLocaleDateString()}
                            </div>
                          </div>
                        </td>

                        {/* Action buttons */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isActive ? (
                              <button
                                onClick={() =>
                                  handleRelease(
                                    item.id,
                                    `${item.first_name} ${item.last_name}`
                                  )
                                }
                                title="Release salary exemption (allow payment)"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 transition-colors"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Release Hold
                              </button>
                            ) : null}

                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Edit Details"
                              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() =>
                                handleDelete(
                                  item.id,
                                  `${item.first_name} ${item.last_name}`
                                )
                              }
                              title="Delete Record"
                              className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add / Edit Salary Exemption */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    {editingExemption ? "Edit Salary Exemption" : "Exempt Employee from Salary"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Withhold payment and exclude from monthly payroll calculation
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Employee Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Employee <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) =>
                      setFormData({ ...formData, employee_id: e.target.value })
                    }
                    disabled={!!editingExemption}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 font-normal disabled:bg-slate-100 dark:disabled:bg-slate-800"
                    required
                  >
                    <option value="">-- Choose Employee to Exempt --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.emp_code || `EMP-${emp.id}`})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payroll Period(s) - Required & Multi-Select */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Payroll Period(s) <span className="text-rose-500">*</span>
                      {!editingExemption && (
                        <span className="text-[11px] font-normal text-slate-500">
                          (Multiple selection supported)
                        </span>
                      )}
                    </label>

                    {!editingExemption && payrollPeriods.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAllOpenPeriods}
                          className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          Select Open
                        </button>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={handleClearPeriodSelection}
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Multi-selection checklist box */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-2 bg-slate-50/60 dark:bg-slate-900/50 max-h-48 overflow-y-auto space-y-1.5">
                    {payrollPeriods.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No payroll periods found. Please create payroll periods first.
                      </div>
                    ) : (
                      payrollPeriods.map((period) => {
                        const isSelected = formData.payroll_period_ids.includes(Number(period.id));
                        return (
                          <label
                            key={period.id}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors border ${
                              isSelected
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type={editingExemption ? "radio" : "checkbox"}
                                name="payroll_period"
                                checked={isSelected}
                                onChange={() => togglePeriodSelection(period.id)}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="font-semibold">{period.period_name}</span>
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>
                                {period.start_date
                                  ? new Date(period.start_date).toLocaleDateString("en-US", {
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : ""}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  period.status === "CLOSED"
                                    ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                }`}
                              >
                                {period.status || "OPEN"}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {/* Selected count pill */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-0.5">
                    <span>
                      {formData.payroll_period_ids.length === 0 ? (
                        <span className="text-rose-500 font-medium">No payroll period selected</span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ {formData.payroll_period_ids.length} period
                          {formData.payroll_period_ids.length > 1 ? "s" : ""} selected for salary hold
                        </span>
                      )}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      Salary will be excluded when processing these periods
                    </span>
                  </div>
                </div>

                {/* Exemption Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Exemption / Hold Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.exemption_type}
                    onChange={(e) =>
                      setFormData({ ...formData, exemption_type: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 font-normal"
                    required
                  >
                    {EXEMPTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Justification / Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reason / Official Justification <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Specify the reason why this employee's salary is withheld (e.g. Unpaid leave approved, disciplinary hold, pending docs)..."
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 font-normal"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {submitting
                      ? "Saving..."
                      : editingExemption
                      ? "Update Exemption"
                      : formData.payroll_period_ids.length > 1
                      ? `Confirm Exemption (${formData.payroll_period_ids.length} Months)`
                      : "Confirm Salary Exemption"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Guard>
  );
}
