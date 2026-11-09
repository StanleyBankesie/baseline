/**
 * @fileoverview ProjectExpenseIncomeReport component.
 * Displays financial Profit & Loss (P&L), Surplus and Deficit per project
 * aggregating data from project income report (Receipt Vouchers) and project expense report (Payment Vouchers).
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  TrendingDown,
  Scale,
  DollarSign,
  Briefcase,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Eye,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

const statusStyles = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  SUBMITTED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  POSTED: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  REVERSED: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export default function ProjectExpenseIncomeReport() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pnl"); // "pnl" | "income" | "expense"
  const [searchTerm, setSearchTerm] = useState("");
  const [positionFilter, setPositionFilter] = useState("ALL"); // "ALL" | "SURPLUS" | "DEFICIT"

  const [projects, setProjects] = useState([]);
  const [projectSummary, setProjectSummary] = useState([]);
  const [overallSummary, setOverallSummary] = useState({
    total_income: 0,
    total_expense: 0,
    net_balance: 0,
    status: "BALANCED",
    margin_percent: 0,
    total_projects: 0,
    income_vouchers_count: 0,
    expense_vouchers_count: 0,
  });
  const [incomeItems, setIncomeItems] = useState([]);
  const [expenseItems, setExpenseItems] = useState([]);

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/projects/reports/project-expense-income?`;
      if (selectedProjectId) url += `project_id=${selectedProjectId}&`;
      if (dateFrom) url += `from=${dateFrom}&`;
      if (dateTo) url += `to=${dateTo}&`;

      const res = await api.get(url);
      setProjects(res.data?.projects || []);
      setProjectSummary(res.data?.projectSummary || []);
      setOverallSummary(
        res.data?.overallSummary || {
          total_income: 0,
          total_expense: 0,
          net_balance: 0,
          status: "BALANCED",
          margin_percent: 0,
          total_projects: 0,
          income_vouchers_count: 0,
          expense_vouchers_count: 0,
        }
      );
      setIncomeItems(res.data?.incomeItems || []);
      setExpenseItems(res.data?.expenseItems || []);
    } catch {
      toast.error("Failed to load project expense and income report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProjectId, dateFrom, dateTo]);

  // Filter project summary table
  const filteredProjectSummary = useMemo(() => {
    return projectSummary.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.project_name || "").toLowerCase().includes(q) ||
        (p.project_code || "").toLowerCase().includes(q) ||
        (p.client_name || "").toLowerCase().includes(q);

      const matchPosition =
        positionFilter === "ALL" ||
        (positionFilter === "SURPLUS" && p.net_balance > 0) ||
        (positionFilter === "DEFICIT" && p.net_balance < 0);

      return matchSearch && matchPosition;
    });
  }, [projectSummary, searchTerm, positionFilter]);

  // Filter vouchers
  const filteredIncomeItems = useMemo(() => {
    if (!searchTerm.trim()) return incomeItems;
    const q = searchTerm.toLowerCase();
    return incomeItems.filter(
      (v) =>
        (v.voucher_no || "").toLowerCase().includes(q) ||
        (v.project_name || "").toLowerCase().includes(q) ||
        (v.description || "").toLowerCase().includes(q)
    );
  }, [incomeItems, searchTerm]);

  const filteredExpenseItems = useMemo(() => {
    if (!searchTerm.trim()) return expenseItems;
    const q = searchTerm.toLowerCase();
    return expenseItems.filter(
      (v) =>
        (v.voucher_no || "").toLowerCase().includes(q) ||
        (v.project_name || "").toLowerCase().includes(q) ||
        (v.description || "").toLowerCase().includes(q)
    );
  }, [expenseItems, searchTerm]);

  // Export to Excel
  const exportExcel = () => {
    try {
      const pnlHeaders = [
        "Project Code",
        "Project Name",
        "Client",
        "Status",
        "Budget (GH₵)",
        "Total Income (GH₵)",
        "Total Expense (GH₵)",
        "Net Balance / Surplus or Deficit (GH₵)",
        "Position",
        "Profit Margin %",
      ];
      const pnlRows = filteredProjectSummary.map((p) => [
        p.project_code,
        p.project_name,
        p.client_name || "-",
        p.project_status || "ACTIVE",
        Number(p.budget || 0).toFixed(2),
        Number(p.total_income || 0).toFixed(2),
        Number(p.total_expense || 0).toFixed(2),
        Number(p.net_balance || 0).toFixed(2),
        p.status,
        `${Number(p.margin_percent || 0).toFixed(1)}%`,
      ]);

      if (window.XLSX) {
        const wb = window.XLSX.utils.book_new();
        const ws = window.XLSX.utils.aoa_to_sheet([pnlHeaders, ...pnlRows]);
        window.XLSX.utils.book_append_sheet(wb, ws, "Project P&L Statement");
        window.XLSX.writeFile(
          wb,
          `project-expense-and-income-report-${new Date().toISOString().split("T")[0]}.xlsx`
        );
      } else {
        // Fallback CSV download
        const csvContent =
          "data:text/csv;charset=utf-8," +
          [pnlHeaders.join(","), ...pnlRows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute(
          "download",
          `project-expense-and-income-${new Date().toISOString().split("T")[0]}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast.success("Report exported successfully");
    } catch {
      toast.error("Failed to export Excel report");
    }
  };

  // Export to PDF
  const exportPdf = () => {
    try {
      if (window.jsPDF) {
        const doc = new window.jsPDF("landscape");
        const headers = [
          "Project Code",
          "Project Name",
          "Client",
          "Income (GH₵)",
          "Expense (GH₵)",
          "Net Balance (GH₵)",
          "Position",
          "Margin %",
        ];
        const rows = filteredProjectSummary.map((p) => [
          p.project_code,
          p.project_name,
          p.client_name || "-",
          Number(p.total_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
          Number(p.total_expense || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
          Number(p.net_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
          p.status,
          `${Number(p.margin_percent || 0).toFixed(1)}%`,
        ]);
        doc.text("Project Expense and Income Report (Surplus & Deficit)", 14, 15);
        doc.autoTable({
          head: [headers],
          body: rows,
          startY: 20,
          theme: "grid",
          styles: { fontSize: 8 },
          headStyles: { fillColor: [15, 76, 129] },
        });
        doc.save(`project-expense-income-${new Date().toISOString().split("T")[0]}.pdf`);
        toast.success("PDF exported successfully");
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const selectedProject = projects.find((p) => String(p.id) === String(selectedProjectId));

  // Totals for filtered table
  const tableTotals = useMemo(() => {
    return filteredProjectSummary.reduce(
      (acc, curr) => ({
        budget: acc.budget + Number(curr.budget || 0),
        income: acc.income + Number(curr.total_income || 0),
        expense: acc.expense + Number(curr.total_expense || 0),
        net: acc.net + Number(curr.net_balance || 0),
      }),
      { budget: 0, income: 0, expense: 0, net: 0 }
    );
  }, [filteredProjectSummary]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <Link
            to="/project-management?section=Reports%20%26%20Analytics"
            className="btn btn-secondary p-2.5 rounded-xl inline-flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Return to Reports"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Scale size={24} />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Project Expense and Income Report
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Financial profit & loss statement, deficit and surplus per project from income and expense vouchers.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={fetchData}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3"
            title="Refresh Report Data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={exportExcel}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3 font-semibold"
          >
            <Download size={15} /> Excel
          </button>
          <button
            onClick={exportPdf}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3 font-semibold shadow-sm"
          >
            <Download size={15} /> PDF
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Project Dropdown */}
          <div className="md:col-span-4 relative">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Project Filter
            </label>
            <div className="relative">
              <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="input pl-9 text-xs w-full py-2 bg-white dark:bg-slate-800"
              >
                <option value="">All Projects ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_code} — {p.project_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range From */}
          <div className="md:col-span-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input text-xs w-full py-2 bg-white dark:bg-slate-800"
            />
          </div>

          {/* Date Range To */}
          <div className="md:col-span-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input text-xs w-full py-2 bg-white dark:bg-slate-800"
            />
          </div>

          {/* Position Quick Filter */}
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Position
            </label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="input text-xs w-full py-2 bg-white dark:bg-slate-800"
            >
              <option value="ALL">All Positions</option>
              <option value="SURPLUS">Surplus Only</option>
              <option value="DEFICIT">Deficit Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Income (Receipts)
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={18} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            GH₵ {Number(overallSummary.total_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Receipt size={12} /> {overallSummary.income_vouchers_count || 0} receipt voucher(s)
          </p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Expenses (Payments)
            </span>
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <TrendingDown size={18} />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            GH₵ {Number(overallSummary.total_expense || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <CreditCard size={12} /> {overallSummary.expense_vouchers_count || 0} payment voucher(s)
          </p>
        </div>

        {/* Net Surplus / Deficit */}
        <div className={`rounded-2xl p-5 shadow-xs border ${
          overallSummary.net_balance > 0
            ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-600"
            : overallSummary.net_balance < 0
            ? "bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-600"
            : "bg-gradient-to-br from-slate-700 to-slate-900 text-white border-slate-800"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/80">
              Net Surplus / Deficit
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white">
              {overallSummary.status}
            </span>
          </div>
          <div className="mt-2 text-2xl font-black">
            {overallSummary.net_balance >= 0 ? "+" : ""}
            GH₵ {Number(overallSummary.net_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-white/80 mt-1">
            {overallSummary.net_balance >= 0 ? "Surplus (Net Profit)" : "Deficit (Net Loss)"}
          </p>
        </div>

        {/* Profit Margin / Ratio */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Profit Margin %
            </span>
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Scale size={18} />
            </span>
          </div>
          <div className={`mt-2 text-2xl font-black ${
            overallSummary.margin_percent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}>
            {Number(overallSummary.margin_percent || 0).toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {overallSummary.total_projects || 0} active project(s)
          </p>
        </div>
      </div>

      {/* 4. Tab Navigation & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab("pnl")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "pnl"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Project P&L Summary ({filteredProjectSummary.length})
          </button>
          <button
            onClick={() => setActiveTab("income")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "income"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Income Vouchers ({incomeItems.length})
          </button>
          <button
            onClick={() => setActiveTab("expense")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "expense"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Expense Vouchers ({expenseItems.length})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search project, code, client, or voucher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-9 text-xs w-full py-1.5 bg-white dark:bg-slate-900"
          />
        </div>
      </div>

      {/* 5. Main Content Area */}
      {activeTab === "pnl" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Project Info</th>
                  <th className="px-3 py-3.5">Client</th>
                  <th className="px-3 py-3.5 text-right">Budget (GH₵)</th>
                  <th className="px-3 py-3.5 text-right text-emerald-700 dark:text-emerald-400">Total Income (GH₵)</th>
                  <th className="px-3 py-3.5 text-right text-rose-700 dark:text-rose-400">Total Expense (GH₵)</th>
                  <th className="px-3 py-3.5 text-right font-black">Net Balance (GH₵)</th>
                  <th className="px-3 py-3.5 text-center">Margin %</th>
                  <th className="px-4 py-3.5 text-center">Financial Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-slate-400 font-medium">
                      Loading project income and expense records...
                    </td>
                  </tr>
                ) : filteredProjectSummary.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-slate-400 italic">
                      No project P&L records match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredProjectSummary.map((p) => {
                    const isSurplus = p.net_balance > 0;
                    const isDeficit = p.net_balance < 0;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{p.project_name}</span>
                          </div>
                          <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                            {p.project_code} · {p.income_count} receipts / {p.expense_count} payments
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-slate-600 dark:text-slate-300">
                          {p.client_name || "-"}
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300">
                          {Number(p.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {Number(p.total_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">
                          {Number(p.total_expense || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono font-bold">
                          <span className={`inline-block px-2 py-0.5 rounded ${
                            isSurplus
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : isDeficit
                              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                              : "text-slate-600 dark:text-slate-400"
                          }`}>
                            {p.net_balance >= 0 ? "+" : ""}
                            {Number(p.net_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-center font-mono font-semibold">
                          <span className={isSurplus ? "text-emerald-600" : isDeficit ? "text-rose-600" : "text-slate-500"}>
                            {Number(p.margin_percent || 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isSurplus
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                              : isDeficit
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                          }`}>
                            {isSurplus && <TrendingUp size={11} />}
                            {isDeficit && <TrendingDown size={11} />}
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Grand Total Footer */}
              {!loading && filteredProjectSummary.length > 0 && (
                <tfoot className="bg-slate-100/80 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                  <tr>
                    <td colSpan="2" className="px-4 py-3 text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                      Grand Totals ({filteredProjectSummary.length} Projects)
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-800 dark:text-slate-200">
                      {tableTotals.budget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-700 dark:text-emerald-400">
                      {tableTotals.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-rose-700 dark:text-rose-400">
                      {tableTotals.expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-black">
                      <span className={`inline-block px-2 py-0.5 rounded ${
                        tableTotals.net >= 0
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                      }`}>
                        {tableTotals.net >= 0 ? "+" : ""}
                        {tableTotals.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-mono">
                      {tableTotals.income > 0
                        ? `${((tableTotals.net / tableTotals.income) * 100).toFixed(1)}%`
                        : "0.0%"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        tableTotals.net >= 0 ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950" : "text-rose-700 bg-rose-50 dark:bg-rose-950"
                      }`}>
                        {tableTotals.net > 0 ? "PORTFOLIO SURPLUS" : tableTotals.net < 0 ? "PORTFOLIO DEFICIT" : "BALANCED"}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* 6. Income Vouchers Tab */}
      {activeTab === "income" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Voucher No</th>
                  <th className="px-3 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Project</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-3 py-3.5">Type</th>
                  <th className="px-3 py-3.5 text-right">Amount (GH₵)</th>
                  <th className="px-3 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-slate-400 font-medium">
                      Loading income receipt vouchers...
                    </td>
                  </tr>
                ) : filteredIncomeItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-slate-400 italic">
                      No income vouchers found.
                    </td>
                  </tr>
                ) : (
                  filteredIncomeItems.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {v.voucher_no}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {v.voucher_date ? String(v.voucher_date).slice(0, 10) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{v.project_name || "-"}</div>
                        <div className="text-[10px] font-mono text-slate-400">{v.project_code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                        {v.description || "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {v.voucher_type_name || "Receipt"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(v.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyles[v.status] || "bg-slate-100 text-slate-700"}`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Expense Vouchers Tab */}
      {activeTab === "expense" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Voucher No</th>
                  <th className="px-3 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Project</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-3 py-3.5">Type</th>
                  <th className="px-3 py-3.5 text-right">Amount (GH₵)</th>
                  <th className="px-3 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-slate-400 font-medium">
                      Loading expense payment vouchers...
                    </td>
                  </tr>
                ) : filteredExpenseItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-slate-400 italic">
                      No expense vouchers found.
                    </td>
                  </tr>
                ) : (
                  filteredExpenseItems.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-bold font-mono text-rose-600 dark:text-rose-400">
                        {v.voucher_no}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {v.voucher_date ? String(v.voucher_date).slice(0, 10) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{v.project_name || "-"}</div>
                        <div className="text-[10px] font-mono text-slate-400">{v.project_code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                        {v.description || "-"}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {v.voucher_type_name || "Payment"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {Number(v.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyles[v.status] || "bg-slate-100 text-slate-700"}`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
