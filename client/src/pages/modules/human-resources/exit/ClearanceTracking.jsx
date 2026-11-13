/**
 * @file ClearanceTracking.jsx (Employee Offboarding Page)
 * @description Manages employee exits and offboarding.
 * When an offboarding request is approved (or created with approval),
 * the employee's profile is completely deactivated across the system
 * (status='TERMINATED', deleted_at=NOW(), login account disabled, FM personnel disabled)
 * so they do not appear in any active query.
 */

import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserMinus,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ShieldAlert,
  Trash2,
  UserX,
  XCircle,
  Clock,
  ArrowLeft,
  Info,
  Check,
  X,
  Lock,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import { Guard } from "../../../../hooks/usePermissions.jsx";

const EXIT_TYPES = [
  { value: "RESIGNATION", label: "Voluntary Resignation" },
  { value: "TERMINATION", label: "Employer Termination" },
  { value: "RETIREMENT", label: "Retirement" },
  { value: "DISMISSAL", label: "Disciplinary Dismissal" },
  { value: "CONTRACT_END", label: "Contract Expiration / Non-Renewal" },
  { value: "MUTUAL_SEPARATION", label: "Mutual Separation Agreement" },
];

export default function ClearanceTracking() {
  const navigate = useNavigate();
  const [exits, setExits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [exitTypeFilter, setExitTypeFilter] = useState("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approveImmediately, setApproveImmediately] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    exit_type: "RESIGNATION",
    resignation_date: "",
    last_working_day: "",
    reason: "",
    notes: "",
  });

  // Confirmation Modal for Approval
  const [confirmApproveExit, setConfirmApproveExit] = useState(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadExits();
    loadActiveEmployees();
  }, [statusFilter]);

  const loadExits = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      const res = await api.get("/hr/exits", { params });
      setExits(res.data?.items || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load offboarding records");
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
      console.error("Failed to load active employees", err);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      employee_id: "",
      exit_type: "RESIGNATION",
      resignation_date: new Date().toISOString().slice(0, 10),
      last_working_day: new Date().toISOString().slice(0, 10),
      reason: "",
      notes: "",
    });
    setApproveImmediately(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id) {
      toast.warning("Please select an employee to offboard");
      return;
    }
    if (!formData.last_working_day) {
      toast.warning("Please specify the employee's last working day");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        status: approveImmediately ? "APPROVED" : "PENDING",
      };
      await api.post("/hr/exits", payload);
      if (approveImmediately) {
        toast.success(
          "Offboarding approved: Employee profile has been completely deactivated across the system."
        );
      } else {
        toast.success("Offboarding request logged as PENDING approval");
      }
      setIsModalOpen(false);
      loadExits();
      loadActiveEmployees();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to submit offboarding");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!confirmApproveExit) return;
    setApproving(true);
    try {
      await api.put(`/hr/exits/${confirmApproveExit.id}/approve`);
      toast.success(
        `Offboarding approved for ${confirmApproveExit.first_name} ${confirmApproveExit.last_name}. Profile completely deactivated.`
      );
      setConfirmApproveExit(null);
      loadExits();
      loadActiveEmployees();
    } catch (err) {
      console.error(err);
      toast.error("Failed to approve offboarding");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (exit) => {
    if (
      !window.confirm(
        `Reject offboarding request for ${exit.first_name} ${exit.last_name}?`
      )
    ) {
      return;
    }
    try {
      await api.put(`/hr/exits/${exit.id}/reject`);
      toast.info("Offboarding request rejected");
      loadExits();
    } catch (err) {
      toast.error("Failed to reject offboarding");
    }
  };

  const handleDelete = async (exit) => {
    if (
      !window.confirm(
        `Delete offboarding record for ${exit.first_name} ${exit.last_name}?`
      )
    ) {
      return;
    }
    try {
      await api.delete(`/hr/exits/${exit.id}`);
      toast.success("Record deleted");
      loadExits();
    } catch (err) {
      toast.error("Failed to delete record");
    }
  };

  // Filtered Exits
  const filteredExits = useMemo(() => {
    return exits.filter((item) => {
      if (exitTypeFilter !== "ALL" && item.exit_type !== exitTypeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = `${item.first_name || ""} ${item.last_name || ""}`.toLowerCase();
      const code = String(item.emp_code || "").toLowerCase();
      const reason = String(item.reason || "").toLowerCase();
      const dept = String(item.dept_name || "").toLowerCase();
      return name.includes(q) || code.includes(q) || reason.includes(q) || dept.includes(q);
    });
  }, [exits, searchQuery, exitTypeFilter]);

  // Metrics
  const stats = useMemo(() => {
    const total = exits.length;
    const approved = exits.filter((e) => e.status === "APPROVED").length;
    const pending = exits.filter((e) => e.status === "PENDING").length;
    const resignations = exits.filter((e) => e.exit_type === "RESIGNATION").length;
    return { total, approved, pending, resignations };
  }, [exits]);

  return (
    <Guard moduleKey="human-resources">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => navigate("/human-resources")}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1 text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Human Resources
              </button>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <UserMinus className="w-6 h-6" />
              </span>
              Employee Offboarding
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Process staff resignations and terminations. Approved offboarding permanently deactivates profiles across all system modules and queries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white font-medium text-sm rounded-lg hover:bg-rose-700 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              New Employee Offboarding
            </button>
          </div>
        </div>

        {/* Warning / Explanation Banner */}
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5 text-slate-600 dark:text-slate-400" />
          <div className="text-sm space-y-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              System Deactivation Enforcement:
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              When an offboarding request is approved, the system automatically sets the employee’s status to <code>TERMINATED</code> and stamps their soft deletion date. This guarantees they are <strong>completely excluded from all active queries</strong> (Staff directories, payroll generation, task dispatch, and operational shifts) and their application login credentials are revoked.
            </p>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Offboarded</span>
              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                <UserX className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">Total exit records</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Approval</span>
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{stats.pending}</p>
            <p className="text-xs text-slate-500 mt-1">Awaiting deactivation approval</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Deactivated (Approved)</span>
              <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">{stats.approved}</p>
            <p className="text-xs text-slate-500 mt-1">Profiles disabled from system</p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Voluntary Resignations</span>
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                <Calendar className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.resignations}</p>
            <p className="text-xs text-slate-500 mt-1">Standard resignations</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search employee, staff code, reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-normal"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Exit Type Filter */}
            <select
              value={exitTypeFilter}
              onChange={(e) => setExitTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-rose-500"
            >
              <option value="ALL">All Exit Types</option>
              {EXIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-rose-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Approval Only</option>
              <option value="APPROVED">Approved & Deactivated Only</option>
              <option value="REJECTED">Rejected Only</option>
            </select>
          </div>
        </div>

        {/* Offboarding Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Exit Type</th>
                  <th className="px-4 py-3">Last Working Day</th>
                  <th className="px-4 py-3">Reason & Notes</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Approved By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-slate-500">
                      Loading offboarding records...
                    </td>
                  </tr>
                ) : filteredExits.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-slate-500">
                      <UserMinus className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                        No Offboarding Records Found
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Use the "New Employee Offboarding" button to initiate an employee departure.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredExits.map((item) => {
                    const isApproved = item.status === "APPROVED";
                    const isPending = item.status === "PENDING";
                    const isRejected = item.status === "REJECTED";
                    const typeObj =
                      EXIT_TYPES.find((t) => t.value === item.exit_type) || {
                        label: item.exit_type,
                      };

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        {/* Employee */}
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

                        {/* Exit Type */}
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            {typeObj.label}
                          </span>
                        </td>

                        {/* Last Day */}
                        <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                          <div>
                            <span className="font-medium">
                              {item.last_working_day
                                ? new Date(item.last_working_day).toLocaleDateString()
                                : "N/A"}
                            </span>
                            {item.resignation_date && (
                              <div className="text-[10px] text-slate-400">
                                Notice: {new Date(item.resignation_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                            {item.reason || item.notes || "No reason specified"}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {isApproved && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900">
                              <Lock className="w-3 h-3" />
                              DEACTIVATED (APPROVED)
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900">
                              <Clock className="w-3 h-3" />
                              PENDING APPROVAL
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                              <XCircle className="w-3 h-3" />
                              REJECTED
                            </span>
                          )}
                        </td>

                        {/* Approved By */}
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {isApproved ? (
                            <div>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {item.approved_by_name || "HR Admin"}
                              </span>
                              {item.approved_at && (
                                <div className="text-[10px] text-slate-400">
                                  {new Date(item.approved_at).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  onClick={() => setConfirmApproveExit(item)}
                                  title="Approve Offboarding and Deactivate Profile"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors"
                                >
                                  <Check className="w-3 h-3" />
                                  Approve & Deactivate
                                </button>
                                <button
                                  onClick={() => handleReject(item)}
                                  title="Reject Offboarding"
                                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleDelete(item)}
                              title="Delete Record"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50"
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

        {/* Modal: New Employee Offboarding */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <UserMinus className="w-5 h-5 text-rose-500" />
                    New Employee Offboarding
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Process separation and terminate system access
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
                    Select Active Employee <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.employee_id}
                    onChange={(e) =>
                      setFormData({ ...formData, employee_id: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-rose-500 font-normal"
                    required
                  >
                    <option value="">-- Choose Employee to Offboard --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.emp_code || `EMP-${emp.id}`})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exit Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Separation Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.exit_type}
                    onChange={(e) =>
                      setFormData({ ...formData, exit_type: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-rose-500 font-normal"
                    required
                  >
                    {EXIT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notice & Last Day */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Resignation / Notice Date
                    </label>
                    <input
                      type="date"
                      value={formData.resignation_date}
                      onChange={(e) =>
                        setFormData({ ...formData, resignation_date: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-rose-500 font-normal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Last Working Day <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.last_working_day}
                      onChange={(e) =>
                        setFormData({ ...formData, last_working_day: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-rose-500 font-normal"
                      required
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Reason for Separation
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Enter reason or notes regarding this employee's exit..."
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-rose-500 font-normal"
                  />
                </div>

                {/* Deactivation Checkbox Option */}
                <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={approveImmediately}
                      onChange={(e) => setApproveImmediately(e.target.checked)}
                      className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-rose-900 dark:text-rose-200 block">
                        Approve & Completely Deactivate Profile Immediately
                      </span>
                      <span className="text-rose-700 dark:text-rose-400 block mt-0.5 leading-relaxed">
                        If checked, this employee will be instantly marked TERMINATED, soft-deleted from all active queries, and their login credentials will be revoked immediately upon saving.
                      </span>
                    </div>
                  </label>
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
                    className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                  >
                    {submitting
                      ? "Processing..."
                      : approveImmediately
                      ? "Approve & Deactivate Now"
                      : "Save as Pending Offboarding"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Pending Exit Approval */}
        {confirmApproveExit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-6 h-6" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Approve Offboarding & Deactivate?
                  </h3>
                  <p className="text-xs text-slate-500">Permanent system-wide deactivation</p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-1.5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <p>
                  <strong>Employee:</strong> {confirmApproveExit.first_name} {confirmApproveExit.last_name} ({confirmApproveExit.emp_code || `EMP-${confirmApproveExit.employee_id}`})
                </p>
                <p>
                  <strong>Exit Type:</strong> {confirmApproveExit.exit_type}
                </p>
                <p>
                  <strong>Last Day:</strong> {new Date(confirmApproveExit.last_working_day).toLocaleDateString()}
                </p>
                <p className="text-rose-600 dark:text-rose-400 pt-1 border-t border-slate-200 dark:border-slate-800 font-medium">
                  This action sets status to TERMINATED, soft-deletes the employee profile (so they vanish from all active queries and dropdowns), revokes their login, and stops all task dispatches.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmApproveExit(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {approving ? "Deactivating..." : "Yes, Approve & Deactivate"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Guard>
  );
}
