import MobileMovingCarousel from "@/components/MobileMovingCarousel";
/**
 * @fileoverview ProjectCostVarianceReport.jsx
 * Concise and simple Project Budget & Cost Variance Report.
 * Displays executive budget tracking, actual costs incurred, variance surplus/deficit, and SLA financial health.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Printer,
  RotateCcw,
  ArrowLeft,
  PieChart
} from "lucide-react";

export default function ProjectCostVarianceReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, expRes] = await Promise.allSettled([
        api.get("/projects/projects", { params: { active: "all" } }),
        api.get("/projects/expenses"),
      ]);

      const projList = projRes.status === "fulfilled" && Array.isArray(projRes.value?.data?.items)
        ? projRes.value.data.items
        : [];

      const expList = expRes.status === "fulfilled" && Array.isArray(expRes.value?.data?.items)
        ? expRes.value.data.items
        : [];

      // Sum expenses per project
      const expMap = new Map();
      expList.forEach((e) => {
        const pId = String(e.project_id || "");
        if (pId) {
          expMap.set(pId, (expMap.get(pId) || 0) + Number(e.amount || 0));
        }
      });

      const processed = projList.map((p) => {
        const budget = Number(p.budget || 0);
        const actualCost = expMap.get(String(p.id)) || 0;
        const variance = budget - actualCost;
        const utilization = budget > 0 ? (actualCost / budget) * 100 : (actualCost > 0 ? 100 : 0);
        let health = "OK";
        if (budget > 0 && actualCost > budget) {
          health = "OVERRUN";
        } else if (budget > 0 && actualCost >= budget * 0.9) {
          health = "WARNING";
        } else if (budget === 0 && actualCost > 0) {
          health = "UNBUDGETED";
        }

        return {
          id: p.id,
          project_code: p.project_code,
          project_name: p.project_name,
          client_name: p.client_name || "—",
          project_status: p.project_status || "PLANNING",
          budget,
          actualCost,
          variance,
          utilization,
          health,
          start_date: p.start_date,
          end_date: p.end_date,
        };
      });

      setProjects(processed);
    } catch (err) {
      toast.error("Failed to load cost variance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.project_status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          p.project_name.toLowerCase().includes(q) ||
          p.project_code.toLowerCase().includes(q) ||
          p.client_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [projects, search, statusFilter]);

  // Overall summary metrics
  const totals = useMemo(() => {
    const totalBudget = filteredProjects.reduce((s, p) => s + p.budget, 0);
    const totalActual = filteredProjects.reduce((s, p) => s + p.actualCost, 0);
    const totalVariance = totalBudget - totalActual;
    const overruns = filteredProjects.filter((p) => p.health === "OVERRUN" || p.health === "UNBUDGETED").length;
    return { totalBudget, totalActual, totalVariance, overruns };
  }, [filteredProjects]);

  const exportExcel = () => {
    if (!filteredProjects.length) return;
    const dataToExport = filteredProjects.map((p, i) => ({
      "No": i + 1,
      "Project Code": p.project_code,
      "Project Name": p.project_name,
      "Client": p.client_name,
      "Status": p.project_status,
      "Approved Budget (GHS)": p.budget,
      "Actual Costs (GHS)": p.actualCost,
      "Variance Surplus/Deficit (GHS)": p.variance,
      "Cost Utilization (%)": `${p.utilization.toFixed(1)}%`,
      "Budget Health": p.health,
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CostVariance");
    XLSX.writeFile(wb, "pm-budget-cost-variance.xlsx");
  };

  const exportPDF = () => {
    if (!filteredProjects.length) return;
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(14);
    doc.text("Project Budget & Cost Variance Report", 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()} | Total Budget: GHS ${totals.totalBudget.toLocaleString()} | Total Cost: GHS ${totals.totalActual.toLocaleString()}`, 14, 22);
    let y = 30;
    doc.setFontSize(8);
    filteredProjects.forEach((p, idx) => {
      if (y > 185) { doc.addPage(); y = 15; }
      doc.text(`${idx + 1}. [${p.project_code}] ${p.project_name} | Budget: GHS ${p.budget.toLocaleString()} | Actual: GHS ${p.actualCost.toLocaleString()} | Variance: GHS ${p.variance.toLocaleString()} (${p.utilization.toFixed(1)}%) | Health: ${p.health}`, 14, y);
      y += 6;
    });
    doc.save("pm-budget-cost-variance.pdf");
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
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <PieChart size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold md:text-2xl font-bold text-slate-900 dark:text-white">
                Project Budget & Cost Variance Report
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5 hidden">
                Executive portfolio financial performance: approved budgets, actual expenditures, and remaining capital
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
            label: "Approved Budget",
            val: `GH₵ ${totals.totalBudget.toLocaleString()}`,
            icon: <Briefcase size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Actual Incurred",
            val: `GH₵ ${totals.totalActual.toLocaleString()}`,
            icon: <TrendingUp size={20} className="stroke-[2.5]" />,
            color: "bg-indigo-600 text-white",
          },
          {
            label: "Net Variance",
            val: `GH₵ ${totals.totalVariance.toLocaleString()}`,
            icon: <DollarSign size={20} className="stroke-[2.5]" />,
            color: totals.totalVariance >= 0 ? "bg-emerald-600 text-white" : "bg-rose-500 text-white",
          },
          {
            label: "Overruns / Alerts",
            val: totals.overruns,
            icon: <AlertTriangle size={20} className="stroke-[2.5]" />,
            color: totals.overruns > 0 ? "bg-rose-500 text-white" : "bg-emerald-600 text-white",
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
            placeholder="Search project code, name, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            className="input w-full text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Project Statuses</option>
            <option value="PLANNING">Planning</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Project & Client</th>
                <th className="px-3 py-3 font-bold text-slate-600 dark:text-slate-300 text-center">Status</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-right">Approved Budget</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-right">Actual Cost</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-right">Cost Variance</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-center">Budget Utilization</th>
                <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-center">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-semibold animate-pulse">
                    Loading cost variance metrics...
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <PieChart size={32} className="mx-auto mb-2 text-slate-300 opacity-60" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300">No project cost records found</p>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const isOverrun = p.health === "OVERRUN" || p.health === "UNBUDGETED";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{p.project_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {p.project_code} • {p.client_name}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                          {p.project_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200">
                        GH₵ {p.budget.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        GH₵ {p.actualCost.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${p.variance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        GH₵ {p.variance.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="w-24 mx-auto">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                            <span>{Math.min(100, p.utilization).toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isOverrun
                                  ? "bg-rose-500"
                                  : p.utilization >= 80
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${Math.min(100, p.utilization)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isOverrun ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            <AlertTriangle size={11} /> OVERRUN
                          </span>
                        ) : p.health === "WARNING" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <AlertTriangle size={11} /> AT RISK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 size={11} /> IN BUDGET
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
