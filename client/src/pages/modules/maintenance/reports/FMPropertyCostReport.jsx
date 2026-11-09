import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Download, RefreshCw, Calendar, DollarSign, 
  Building2, Wrench, Layers, BarChart2, TrendingUp, Filter
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

export default function FMPropertyCostReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    propertyId: "",
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
    } catch {}
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
      const res = await api.get("/facilities/reports/property-costs", { params: cleanParams });
      setReportData(res.data?.data || null);
    } catch (err) {
      console.error("fetchReport Property Cost error:", err);
      toast.error(err?.response?.data?.message || "Failed to load property maintenance cost report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData?.cost_records?.length) {
      toast.warn("No cost records to export");
      return;
    }
    const headers = ["Work Order #", "Subject", "Service Line", "Property", "Client", "Labor Hours", "Material Cost", "Total Cost", "Completed Date"];
    const rows = reportData.cost_records.map(r => [
      r.job_order_no || `WO-${r.id}`,
      `"${(r.subject || "").replace(/"/g, '""')}"`,
      r.service_line || "",
      `"${(r.property_name || "").replace(/"/g, '""')}"`,
      `"${(r.client_name || "").replace(/"/g, '""')}"`,
      r.actual_hours || 0,
      r.material_cost || 0,
      r.total_cost || 0,
      r.created_at || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FM_Property_Cost_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Cost Report exported successfully");
  };

  const summary = reportData?.summary || {};

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header with Back Button */}
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
                <DollarSign size={20} />
              </span>
              Property Maintenance Cost &amp; Expense Allocation Report
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Financial cost tracking across property portfolios: labor vs material expenses, service line splits, and cost per square meter.
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
            <Wrench size={14} className="text-slate-400" />
            <select
              value={filters.serviceLine}
              onChange={(e) => setFilters({ ...filters, serviceLine: e.target.value })}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Service Lines</option>
              <option value="HVAC_AIR_CONDITIONING">HVAC &amp; Air Conditioning</option>
              <option value="ELECTRICAL_POWER">Electrical &amp; Power Systems</option>
              <option value="PLUMBING_WATER">Plumbing &amp; Water Systems</option>
              <option value="FIRE_SAFETY_EQUIPMENT">Fire Safety Systems</option>
              <option value="ELEVATOR_LIFT">Elevators &amp; Lifts</option>
              <option value="GENERAL_MAINTENANCE">General Handyman / Repairs</option>
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
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Maintenance Spend</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  ${Number(summary.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400 font-medium">Actual Cost</span>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                From {summary.total_work_orders || 0} job orders ({summary.completed_orders || 0} completed)
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Internal Labor Spend</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-blue-600">
                  ${Number(summary.total_labor_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400">labor</span>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                {summary.total_labor_hours || 0} recorded technician hours
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Material &amp; Parts Cost</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-amber-600">
                  ${Number(summary.total_material_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-slate-400">materials</span>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Spare parts, filters, consumables &amp; supplies
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Cost / Square Meter</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  ${summary.cost_per_sqm || 0}
                </span>
                <span className="text-xs text-slate-400">/ m²</span>
              </div>
              <p className="text-xs text-slate-500 pt-1">
                Across {Number(summary.total_managed_sqm || 0).toLocaleString()} m² portfolio area
              </p>
            </div>
          </div>

          {/* Breakdown by Service Line & Property */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Line Cost Distribution */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Wrench size={15} className="text-emerald-600 dark:text-emerald-400" />
                Cost by Service Line
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
                    <tr>
                      <th className="p-2.5">Service Line</th>
                      <th className="p-2.5 text-center">Jobs</th>
                      <th className="p-2.5 text-center">Labor Hrs</th>
                      <th className="p-2.5 text-right">Materials</th>
                      <th className="p-2.5 text-right">Total Cost</th>
                      <th className="p-2.5 text-right">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportData?.service_lines?.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">
                          {s.service_line.replace(/_/g, " ")}
                        </td>
                        <td className="p-2.5 text-center">{s.job_count}</td>
                        <td className="p-2.5 text-center font-mono">{s.labor_hours}h</td>
                        <td className="p-2.5 text-right font-mono">${Number(s.material_cost).toFixed(2)}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                          ${Number(s.line_total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {s.cost_share_pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!reportData?.service_lines || reportData.service_lines.length === 0) && (
                      <tr>
                        <td colSpan="6" className="text-center py-6 text-slate-400 text-xs italic">
                          No service line costs recorded for this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Property Cost Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Building2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                Cost by Property Portfolio
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
                    <tr>
                      <th className="p-2.5">Property</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5 text-center">Jobs</th>
                      <th className="p-2.5 text-right">Area</th>
                      <th className="p-2.5 text-right">Total Cost</th>
                      <th className="p-2.5 text-right">Cost/m²</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportData?.property_costs?.map((prop, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{prop.property_name}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {prop.property_type || "Commercial"}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">{prop.job_count}</td>
                        <td className="p-2.5 text-right font-mono">{prop.total_area_sqm ? `${prop.total_area_sqm} m²` : "—"}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                          ${Number(prop.property_total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          ${prop.cost_per_sqm}
                        </td>
                      </tr>
                    ))}
                    {(!reportData?.property_costs || reportData.property_costs.length === 0) && (
                      <tr>
                        <td colSpan="6" className="text-center py-6 text-slate-400 text-xs italic">
                          No property cost records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detailed Work Order Cost Audit Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Recent Completed Work Orders &amp; Expense Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="p-2.5">Order #</th>
                    <th className="p-2.5">Subject</th>
                    <th className="p-2.5">Service Line</th>
                    <th className="p-2.5">Property</th>
                    <th className="p-2.5">Client</th>
                    <th className="p-2.5 text-center">Labor Hrs</th>
                    <th className="p-2.5 text-right">Materials</th>
                    <th className="p-2.5 text-right">Total Cost</th>
                    <th className="p-2.5 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reportData?.cost_records?.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {r.job_order_no || `WO-${r.id}`}
                      </td>
                      <td className="p-2.5 font-medium max-w-xs truncate text-slate-900 dark:text-white">{r.subject}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {r.service_line ? r.service_line.replace(/_/g, " ") : "GENERAL"}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">{r.property_name || "—"}</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">{r.client_name || "—"}</td>
                      <td className="p-2.5 text-center font-mono">{r.actual_hours || 0}h</td>
                      <td className="p-2.5 text-right font-mono">${Number(r.material_cost || 0).toFixed(2)}</td>
                      <td className="p-2.5 text-right font-bold font-mono text-slate-900 dark:text-white">
                        ${Number(r.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right text-slate-500 font-mono">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                  {(!reportData?.cost_records || reportData.cost_records.length === 0) && (
                    <tr>
                      <td colSpan="9" className="text-center py-8 text-slate-400 text-xs italic">
                        No work order cost records found for the selected period.
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
