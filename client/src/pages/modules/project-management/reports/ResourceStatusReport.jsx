import MobileMovingCarousel from "@/components/MobileMovingCarousel";
/**
 * @fileoverview ResourceStatusReport.jsx
 * Concise and simple Project Resource Allocation & Utilization Report.
 * Tracks equipment, labor, and materials deployed across projects and tasks.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import {
  Wrench,
  Users,
  Boxes,
  Briefcase,
  Search,
  Filter,
  RotateCcw,
  FileSpreadsheet,
  Download,
  Printer,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle
} from "lucide-react";

export default function ResourceStatusReport() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects/resources");
      setResources(res.data?.items || res.data || []);
    } catch (e) {
      toast.error("Failed to load resource data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (filterType && r.resource_type !== filterType) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (r.resource_name && r.resource_name.toLowerCase().includes(q)) ||
          (r.accountable_user_name && r.accountable_user_name.toLowerCase().includes(q)) ||
          (r.project_name && r.project_name.toLowerCase().includes(q)) ||
          (r.task_title && r.task_title.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [resources, filterType, filterStatus, search]);

  const summary = useMemo(() => {
    const total = resources.length;
    const inUse = resources.filter((r) => r.status === "IN_USE").length;
    const allocated = resources.filter((r) => r.status === "ALLOCATED").length;
    const released = resources.filter((r) => r.status === "RELEASED").length;
    return { total, inUse, allocated, released };
  }, [resources]);

  const exportExcel = () => {
    if (!filtered.length) return;
    const dataToExport = filtered.map((r, i) => ({
      "No": i + 1,
      "Resource Name": r.resource_name || "—",
      "Type": r.resource_type || "—",
      "Allocated Qty": r.allocated_qty || 1,
      "Accountable Lead": r.accountable_user_name || "—",
      "Project": r.project_name || r.project_code || "—",
      "Task": r.task_title || "General",
      "Start Date": r.start_date ? new Date(r.start_date).toLocaleDateString() : "—",
      "End Date": r.end_date ? new Date(r.end_date).toLocaleDateString() : "—",
      "Status": r.status || "—",
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resources");
    XLSX.writeFile(wb, "pm-resource-allocation-report.xlsx");
  };

  const exportPDF = () => {
    if (!filtered.length) return;
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(14);
    doc.text("Project Resource Allocation & Utilization Report", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Total Resources: ${summary.total} | In Use: ${summary.inUse}`, 14, 22);
    let y = 30;
    doc.setFontSize(8);
    filtered.forEach((r, idx) => {
      if (y > 185) { doc.addPage(); y = 15; }
      doc.text(`${idx + 1}. ${r.resource_name} (${r.resource_type}) | Assigned: ${r.accountable_user_name || "—"} | Project: ${r.project_name || "—"} | Status: ${r.status}`, 14, y);
      y += 6;
    });
    doc.save("pm-resource-allocation-report.pdf");
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <button
            onClick={() => navigate("/project-management?section=Reports%20%26%20Analytics")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 mb-1"
          >
            <ArrowLeft size={14} /> Back to Reports & Analytics
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold md:text-2xl font-bold text-slate-900 dark:text-white">
                Resource Allocation & Utilization Report
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5 hidden">
                Overview of equipment, workforce, and material resources committed across projects
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          
          <button
            onClick={exportExcel}
            className="btn btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" /> Excel
          </button>
          <button
            onClick={exportPDF}
            className="btn btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
          >
            <Download size={14} className="text-rose-600" /> PDF
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn-primary text-xs flex items-center gap-1.5 px-3 py-2"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Metric Stats Cards Carousel */}
      <MobileMovingCarousel data-page-carousel gridColsClass="md:grid-cols-4" gapClass="gap-4">
        {[
          {
            label: "Total Resources",
            val: summary.total,
            icon: <Briefcase size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Currently In Use",
            val: summary.inUse,
            icon: <Users size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600 text-white",
          },
          {
            label: "Allocated",
            val: summary.allocated,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Released",
            val: summary.released,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-indigo-600 text-white",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="card p-6 min-h-[160px] flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {stat.val}
              </p>
            </div>
            <div className={`p-3 rounded-full ${stat.color} shadow-sm`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </MobileMovingCarousel>

      {/* Filter Surface */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input w-full pl-9 text-sm"
            placeholder="Search resource, assigned lead, project, or task..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-44">
          <select
            className="input w-full text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Resource Types</option>
            <option value="EQUIPMENT">Equipment / Plant</option>
            <option value="EMPLOYEE">Personnel / Workforce</option>
            <option value="MATERIAL">Special Material</option>
          </select>
        </div>

        <div className="w-full sm:w-40">
          <select
            className="input w-full text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="IN_USE">In Use</option>
            <option value="ALLOCATED">Allocated</option>
            <option value="RELEASED">Released</option>
            <option value="DAMAGED">Damaged</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Resource</th>
                <th className="px-3 py-3 font-bold text-slate-600 dark:text-slate-300 text-center">Type</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Assigned Lead / Custodian</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Project / Work Package</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Allocation Schedule</th>
                <th className="px-3 py-3 font-bold text-slate-600 dark:text-slate-300 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-semibold animate-pulse">
                    Loading resource allocation data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <Users size={32} className="mx-auto mb-2 text-slate-300 opacity-60" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">No resources found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                      <div>{r.resource_name}</div>
                      <div className="text-[10px] text-slate-400">Allocated Qty: {r.allocated_qty || 1}</div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {r.resource_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {r.accountable_user_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{r.project_name || r.project_code || "—"}</div>
                      <div className="text-[10px] text-slate-400">{r.task_title || "General Project Deployment"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      {r.start_date ? new Date(r.start_date).toLocaleDateString() : "—"} to{" "}
                      {r.end_date ? new Date(r.end_date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.status === "IN_USE"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : r.status === "ALLOCATED"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : r.status === "DAMAGED"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {r.status === "IN_USE" && <CheckCircle2 size={11} />}
                        {r.status === "ALLOCATED" && <Clock size={11} />}
                        {r.status === "DAMAGED" && <AlertTriangle size={11} />}
                        {r.status || "AVAILABLE"}
                      </span>
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
