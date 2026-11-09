import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Download, RefreshCw, Calendar, ShieldCheck, 
  AlertTriangle, Clock, CheckCircle2, XCircle, Building2, Filter, Layers
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

export default function FMSLAComplianceReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    propertyId: "",
    priority: "",
    serviceLine: ""
  });

  useEffect(() => {
    fetchProperties();
    fetchReport();
  }, []);

  const fetchProperties = async () => {
    try {
      const res = await api.get("/facilities/properties");
      setProperties(res.data?.data || []);
    } catch {
      // Ignore
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const cleanParams = {};
      Object.keys(filters).forEach((k) => {
        if (filters[k] !== "" && filters[k] !== null && filters[k] !== undefined) {
          cleanParams[k] = filters[k];
        }
      });
      const res = await api.get("/facilities/reports/sla-compliance", { params: cleanParams });
      setReportData(res.data?.data || null);
    } catch (err) {
      console.error("fetchReport SLA error:", err);
      toast.error(err?.response?.data?.message || "Failed to load SLA compliance report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData?.detailed_tickets?.length) {
      toast.warn("No tickets to export");
      return;
    }
    const headers = ["Ticket #", "Subject", "Priority", "Status", "Service Line", "Property", "Client", "Created At", "Resolved At", "SLA Status"];
    const rows = reportData.detailed_tickets.map(t => [
      t.request_no || `REQ-${t.id}`,
      `"${(t.subject || "").replace(/"/g, '""')}"`,
      t.priority || "",
      t.status || "",
      t.service_line || "",
      `"${(t.property_name || "").replace(/"/g, '""')}"`,
      `"${(t.client_name || "").replace(/"/g, '""')}"`,
      t.created_at || "",
      t.resolved_at || "",
      t.computed_sla_status || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FM_SLA_Compliance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("SLA Compliance Report exported successfully");
  };

  const summary = reportData?.summary || {};

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl"
            title="Go Back"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <span className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <ShieldCheck size={20} />
              </span>
              Facilities SLA Compliance &amp; Performance Report
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Response and resolution adherence benchmarks, breach audits, and critical priority performance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3 font-semibold rounded-xl"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <Calendar size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>From</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <span>To</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-slate-400" />
            <select
              value={filters.propertyId}
              onChange={(e) => setFilters({ ...filters, propertyId: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Properties</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.property_name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Priorities</option>
              <option value="EMERGENCY">Emergency</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchReport}
          className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
        >
          Apply Filters
        </button>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Overall SLA Compliance</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-extrabold ${summary.sla_compliance_pct >= 95 ? "text-emerald-600" : summary.sla_compliance_pct >= 85 ? "text-amber-500" : "text-rose-600"}`}>
                  {summary.sla_compliance_pct ?? 100}%
                </span>
                <span className="text-xs text-slate-400 font-medium">Target 95%</span>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                {summary.resolved_count || 0} of {summary.total_requests || 0} tickets resolved within SLA
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Response Compliance</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-blue-600">
                  {summary.response_compliance_pct ?? 100}%
                </span>
                <span className="text-xs text-slate-400">on-time first contact</span>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Avg Response: <span className="font-bold text-slate-700 dark:text-slate-300">{summary.avg_response_hours || 0} hrs</span>
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Breached SLA Tickets</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-extrabold ${summary.resolution_breached_count > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {summary.resolution_breached_count || 0}
                </span>
                <span className="text-xs text-rose-500 font-medium">Breaches</span>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Active unresolved breaches: <span className="font-bold text-rose-600">{summary.open_count || 0} open</span>
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Mean Time To Resolve</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {summary.avg_resolution_hours || 0}
                </span>
                <span className="text-xs text-slate-400">hours average</span>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Calculated across all closed tickets
              </p>
            </div>
          </div>

          {/* Breakdown by Priority & Property */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Matrix */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Clock size={15} className="text-emerald-600 dark:text-emerald-400" />
                Performance by Priority Tier
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
                    <tr>
                      <th className="p-2.5">Priority</th>
                      <th className="p-2.5 text-center">Total</th>
                      <th className="p-2.5 text-center">Resolved</th>
                      <th className="p-2.5 text-center">Breached</th>
                      <th className="p-2.5 text-right">Avg Hours</th>
                      <th className="p-2.5 text-right">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportData?.priority_breakdown?.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-2.5 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                            p.priority_level === 'EMERGENCY' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300' :
                            p.priority_level === 'CRITICAL' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300' :
                            p.priority_level === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300' :
                            'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {p.priority_level}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">{p.total_count}</td>
                        <td className="p-2.5 text-center">{p.resolved_count}</td>
                        <td className={`p-2.5 text-center ${p.breached_count > 0 ? "font-bold text-rose-600" : ""}`}>{p.breached_count}</td>
                        <td className="p-2.5 text-right font-mono">{p.avg_resolution_hours} hrs</td>
                        <td className="p-2.5 text-right">
                          <span className={`font-bold ${p.compliance_pct >= 90 ? "text-emerald-600" : "text-rose-600"}`}>
                            {p.compliance_pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!reportData?.priority_breakdown || reportData.priority_breakdown.length === 0) && (
                      <tr>
                        <td colSpan="6" className="text-center py-6 text-slate-400 text-xs italic">
                          No priority breakdown available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Property Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Building2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                Top Properties SLA Compliance
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
                    <tr>
                      <th className="p-2.5">Property</th>
                      <th className="p-2.5 text-center">Requests</th>
                      <th className="p-2.5 text-center">Open</th>
                      <th className="p-2.5 text-center">Breaches</th>
                      <th className="p-2.5 text-right">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportData?.property_breakdown?.map((prop, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{prop.property_name}</td>
                        <td className="p-2.5 text-center">{prop.total_requests}</td>
                        <td className="p-2.5 text-center">{prop.open_requests}</td>
                        <td className={`p-2.5 text-center ${prop.breached_requests > 0 ? "font-bold text-rose-600" : ""}`}>{prop.breached_requests}</td>
                        <td className="p-2.5 text-right">
                          <span className={`font-bold ${prop.compliance_pct >= 90 ? "text-emerald-600" : "text-rose-600"}`}>
                            {prop.compliance_pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!reportData?.property_breakdown || reportData.property_breakdown.length === 0) && (
                      <tr>
                        <td colSpan="5" className="text-center py-6 text-slate-400 text-xs italic">
                          No property breakdown available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detailed Request Audit Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Recent Service Requests &amp; SLA Audit Trail
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="p-2.5">Ticket #</th>
                    <th className="p-2.5">Subject</th>
                    <th className="p-2.5">Priority</th>
                    <th className="p-2.5">Property</th>
                    <th className="p-2.5">Client</th>
                    <th className="p-2.5">Created</th>
                    <th className="p-2.5">SLA Target</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">SLA Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportData?.detailed_tickets?.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {t.request_no || `REQ-${t.id}`}
                      </td>
                      <td className="p-2.5 font-medium max-w-xs truncate text-slate-900 dark:text-white">{t.subject}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          t.priority === 'EMERGENCY' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300' :
                          t.priority === 'CRITICAL' ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300' :
                          t.priority === 'HIGH' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300' :
                          'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">{t.property_name || "—"}</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">{t.client_name || "—"}</td>
                      <td className="p-2.5 text-slate-500 font-mono">{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</td>
                      <td className="p-2.5 text-slate-500 font-mono">{t.sla_resolution_due ? new Date(t.sla_resolution_due).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : "—"}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {t.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          t.computed_sla_status === 'MET' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          t.computed_sla_status === 'BREACHED' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300' :
                          t.computed_sla_status === 'AT_RISK' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300' :
                          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}>
                          {t.computed_sla_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!reportData?.detailed_tickets || reportData.detailed_tickets.length === 0) && (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-400 text-xs italic">
                        No service requests found for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
