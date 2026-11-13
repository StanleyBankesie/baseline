import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  Users,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Activity,
  ChevronLeft,
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
} from "lucide-react";
import { api } from "@/api/client.js";
import { toast } from "react-toastify";

export default function BiometricAnalyticsPage() {
  const [data, setData] = useState({
    metrics: {
      total_employees: 0,
      enrolled_employees: 0,
      enrollment_rate: 0,
      today_biometric_attendances: 0,
      spoof_attempts_blocked_30d: 0,
    },
    recent_logs: [],
  });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFilter, setResultFilter] = useState("ALL");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/hr/biometrics/analytics");
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      toast.error("Failed to load biometric analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = (data.recent_logs || []).filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.emp_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.remarks?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesResult =
      resultFilter === "ALL" || log.result === resultFilter;

    return matchesSearch && matchesResult;
  });

  const exportCSV = () => {
    if (!filteredLogs.length) return;
    const headers = ["Timestamp", "Employee", "Emp Code", "Event", "Result", "Match Score", "Liveness Score", "Latency (ms)", "Remarks"];
    const rows = filteredLogs.map((l) => [
      new Date(l.created_at).toLocaleString(),
      `"${l.employee_name || "Unknown"}"`,
      l.emp_code || "",
      l.event_type,
      l.result,
      l.match_score ? `${(Number(l.match_score) * 100).toFixed(1)}%` : "",
      l.liveness_score ? `${(Number(l.liveness_score) * 100).toFixed(1)}%` : "",
      l.latency_ms || "",
      `"${l.remarks || ""}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `biometric_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/human-resources/attendance"
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Time & Attendance
            </Link>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" /> Biometric Attendance Analytics & Audit Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time verification telemetry, biometric enrollment rate, and anti-spoofing security logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-2"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Export CSV
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-secondary text-xs flex items-center gap-1 px-3 py-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Biometric Enrolled</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {data.metrics.enrolled_employees}{" "}
            <span className="text-xs font-normal text-slate-400">
              / {data.metrics.total_employees}
            </span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span>{data.metrics.enrollment_rate}% Workforce Coverage</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Today's Face Clock-Ins</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.metrics.today_biometric_attendances}
          </div>
          <div className="mt-2 text-xs text-slate-400 font-medium">
            Biometrically Verified Today
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
            <span>Spoof Attacks Blocked (30d)</span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-500">
            {data.metrics.spoof_attempts_blocked_30d}
          </div>
          <div className="mt-2 text-xs text-slate-400 font-medium">
            Photo / Screen Replays Prevented
          </div>
        </div>


      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search employee, ID or remarks..."
            className="input w-full pl-9 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            className="input text-xs"
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
          >
            <option value="ALL">All Event Outcomes</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILED_MATCH">Failed Match</option>
            <option value="FAILED_LIVENESS">Failed Liveness (Spoof)</option>
            <option value="FAILED_QUALITY">Failed Quality</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Match Confidence</th>
                <th className="px-4 py-3">Liveness</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Loading telemetry logs...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No biometric verification events found matching filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-[11px] font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      {log.employee_name || "Unmatched Face"}
                      {log.emp_code && (
                        <span className="block text-[10px] font-mono text-slate-400">
                          {log.emp_code}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {log.event_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.result === "SUCCESS"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                            : log.result === "FAILED_LIVENESS"
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {log.result}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {log.match_score ? `${(Number(log.match_score) * 100).toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {log.liveness_score ? `${(Number(log.liveness_score) * 100).toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {log.latency_ms ? `${log.latency_ms} ms` : "-"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500 max-w-xs truncate">
                      {log.remarks || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
