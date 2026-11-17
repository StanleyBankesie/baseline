/**
 * @fileoverview ProjectExpenseIncomeReport component.
 * Displays financial Profit & Loss (P&L), Surplus and Deficit per project
 * aggregating data from project income report (Receipt Vouchers) and project expense report (Payment Vouchers).
 * Requires user to select a project before showing any report data.
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
  Calendar,
  X,
  FolderOpen,
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
  const [loading, setLoading] = useState(false);
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

  // Load initial project list once on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/projects/projects", { params: { active: "all" } });
        if (res.data?.items && res.data.items.length > 0) {
          setProjects(res.data.items);
        }
      } catch (_) {}
    })();
  }, []);

  const fetchData = async () => {
    if (!selectedProjectId) {
      setProjectSummary([]);
      setIncomeItems([]);
      setExpenseItems([]);
      setOverallSummary({
        total_income: 0,
        total_expense: 0,
        net_balance: 0,
        status: "BALANCED",
        margin_percent: 0,
        total_projects: 0,
        income_vouchers_count: 0,
        expense_vouchers_count: 0,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let url = `/projects/reports/project-expense-income?project_id=${selectedProjectId}&`;
      if (dateFrom) url += `from=${dateFrom}&`;
      if (dateTo) url += `to=${dateTo}&`;

      const res = await api.get(url);
      if (res.data?.allProjects && res.data.allProjects.length > 0) {
        setProjects(res.data.allProjects);
      } else if (res.data?.projects && res.data.projects.length > 0 && projects.length === 0) {
        setProjects(res.data.projects);
      }
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
    if (!selectedProjectId) {
      setProjectSummary([]);
      setIncomeItems([]);
      setExpenseItems([]);
      setOverallSummary({
        total_income: 0,
        total_expense: 0,
        net_balance: 0,
        status: "BALANCED",
        margin_percent: 0,
        total_projects: 0,
        income_vouchers_count: 0,
        expense_vouchers_count: 0,
      });
      setLoading(false);
      return;
    }
    fetchData();
  }, [selectedProjectId, dateFrom, dateTo]);

  const handleResetFilters = () => {
    setSelectedProjectId("");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
    setPositionFilter("ALL");
    setProjectSummary([]);
    setIncomeItems([]);
    setExpenseItems([]);
    setOverallSummary({
      total_income: 0,
      total_expense: 0,
      net_balance: 0,
      status: "BALANCED",
      margin_percent: 0,
      total_projects: 0,
      income_vouchers_count: 0,
      expense_vouchers_count: 0,
    });
  };

  const selectedProject = useMemo(() => {
    return projects.find((p) => String(p.id) === String(selectedProjectId));
  }, [projects, selectedProjectId]);

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

  // Export to Excel / CSV
  const exportExcel = () => {
    if (!selectedProjectId || filteredProjectSummary.length === 0) return;
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
          `project-expense-and-income-${selectedProject?.project_code || "report"}-${new Date().toISOString().split("T")[0]}.xlsx`
        );
      } else {
        const csvContent =
          "data:text/csv;charset=utf-8," +
          [pnlHeaders.join(","), ...pnlRows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute(
          "download",
          `project-expense-and-income-${selectedProject?.project_code || "report"}-${new Date().toISOString().split("T")[0]}.csv`
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
    if (!selectedProjectId || filteredProjectSummary.length === 0) return;
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
        doc.text(`Project P&L Statement: ${selectedProject ? selectedProject.project_code + " - " + selectedProject.project_name : ""}`, 14, 15);
        doc.autoTable({
          head: [headers],
          body: rows,
          startY: 20,
          theme: "grid",
          styles: { fontSize: 8 },
          headStyles: { fillColor: [15, 76, 129] },
        });
        doc.save(`project-expense-income-${selectedProject?.project_code || "report"}-${new Date().toISOString().split("T")[0]}.pdf`);
        toast.success("PDF exported successfully");
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

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
              Financial profit & loss statement, deficit and surplus per project from income and expense vouchers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {selectedProjectId && filteredProjectSummary.length > 0 && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* 2. Filter Bar (Project & Date Filters) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Project Filter (Required) */}
            <div className="min-w-[260px] flex-1 max-w-sm">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                Select Project <span className="text-rose-500">*</span>
              </label>
              <select
                className={`input text-xs py-2 h-auto w-full font-medium ${
                  !selectedProjectId
                    ? "border-indigo-500 focus:ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20"
                    : ""
                }`}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">-- Choose Project to View Report --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_code} - {p.project_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Date From
              </label>
              <input
                type="date"
                disabled={!selectedProjectId}
                className="input py-1.5 px-2.5 text-xs h-auto font-mono w-36 disabled:opacity-50 disabled:cursor-not-allowed"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Date To
              </label>
              <input
                type="date"
                disabled={!selectedProjectId}
                className="input py-1.5 px-2.5 text-xs h-auto font-mono w-36 disabled:opacity-50 disabled:cursor-not-allowed"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            {/* Search input */}
            <div className="min-w-[180px] flex-1 max-w-xs">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Search Vouchers & Projects
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  disabled={!selectedProjectId}
                  placeholder="Voucher, description..."
                  className="input pl-8 pr-2.5 py-1.5 text-xs h-auto w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Position Filter */}
            {activeTab === "pnl" && (
              <div className="min-w-[140px]">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  Position
                </label>
                <select
                  disabled={!selectedProjectId}
                  className="input text-xs py-1.5 h-auto w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                >
                  <option value="ALL">All Positions</option>
                  <option value="SURPLUS">Surplus Only</option>
                  <option value="DEFICIT">Deficit Only</option>
                </select>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end">
            {(selectedProjectId || dateFrom || dateTo || searchTerm || positionFilter !== "ALL") && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-500 hover:text-rose-700 underline px-2 py-1 flex items-center gap-1"
              >
                <X size={13} /> Clear Project
              </button>
            )}
            {selectedProjectId && (
              <button
                onClick={fetchData}
                className="btn btn-secondary p-2 rounded-xl"
                title="Refresh Report"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Conditional Content */}
      {!selectedProjectId ? (
        /* Empty Prompt State when no project is selected */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 sm:p-16 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
            <Scale size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Select a Project to View Expense & Income
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Please select a project from the dropdown above to display its Profit & Loss statement, receipt vouchers, payment disbursements, and surplus/deficit analysis.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards for Selected Project */}
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
                <span className="p-1.5 rounded-lg bg-white/20">
                  {overallSummary.net_balance >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </span>
              </div>
              <div className="mt-2 text-2xl font-black">
                {overallSummary.net_balance >= 0 ? "+" : ""}
                GH₵ {Number(overallSummary.net_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-white/70 mt-1 uppercase font-bold tracking-wider">
                {overallSummary.status}
              </p>
            </div>

            {/* Profit Margin % */}
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
              <p className="text-[11px] text-slate-400 mt-1 truncate" title={selectedProject?.project_name}>
                {selectedProject?.project_name || "Selected Project"}
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
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
          </div>

          {/* Main Content Area */}
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
                        <td colSpan="8" className="px-4 py-16 text-center text-slate-400 animate-pulse font-medium">
                          Computing financial profit & loss for selected project...
                        </td>
                      </tr>
                    ) : filteredProjectSummary.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-16 text-center text-slate-400 italic">
                          No project financial records match the active criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredProjectSummary.map((p) => {
                        const isSurplus = p.net_balance > 0;
                        const isDeficit = p.net_balance < 0;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {p.project_name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                {p.project_code}
                              </div>
                            </td>
                            <td className="px-3 py-3.5 text-slate-600 dark:text-slate-400">
                              {p.client_name || "—"}
                            </td>
                            <td className="px-3 py-3.5 text-right font-mono text-slate-700 dark:text-slate-300">
                              {Number(p.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {Number(p.total_income || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                              {Number(p.total_expense || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-3.5 text-right font-mono font-black">
                              <span
                                className={`inline-block px-2 py-0.5 rounded ${
                                  isSurplus
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : isDeficit
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                }`}
                              >
                                {isSurplus ? "+" : ""}
                                {Number(p.net_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td className="px-3 py-3.5 text-center font-mono">
                              <span className={p.margin_percent >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                                {Number(p.margin_percent || 0).toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${
                                  isSurplus
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                    : isDeficit
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                                }`}
                              >
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
                  {/* Totals Footer */}
                  {!loading && filteredProjectSummary.length > 0 && (
                    <tfoot className="bg-slate-100/80 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                      <tr>
                        <td colSpan="2" className="px-4 py-3 text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                          Totals ({filteredProjectSummary.length} Project)
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
                            {tableTotals.net > 0 ? "SURPLUS" : tableTotals.net < 0 ? "DEFICIT" : "BALANCED"}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* Income Vouchers Tab */}
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
                          No income vouchers found for this project.
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
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">
                            {v.project_name || selectedProject?.project_name || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={v.description}>
                            {v.description || "—"}
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                              {v.voucher_type_name || "RV"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {Number(v.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusStyles[v.status] || "bg-slate-100"}`}>
                              {v.status || "POSTED"}
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

          {/* Expense Vouchers Tab */}
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
                          No expense vouchers found for this project.
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
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">
                            {v.project_name || selectedProject?.project_name || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={v.description}>
                            {v.description || "—"}
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                              {v.voucher_type_name || "PV"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            {Number(v.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusStyles[v.status] || "bg-slate-100"}`}>
                              {v.status || "POSTED"}
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
        </>
      )}
    </div>
  );
}
