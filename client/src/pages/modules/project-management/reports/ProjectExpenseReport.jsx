/**
 * @fileoverview ProjectExpenseReport component.
 * Provides functionality for ProjectExpenseReport with project and date range filters.
 * Requires user to select a project before showing any report data.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, Search, TrendingDown, CreditCard, FolderOpen, Calendar, X } from "lucide-react";
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

export default function ProjectExpenseReport() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ count: 0, total: 0 });
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Load project list once on mount
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
      setItems([]);
      setSummary({ count: 0, total: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let url = `/projects/reports/project-expense?project_id=${selectedProjectId}&`;
      if (dateFrom) url += `from=${dateFrom}&`;
      if (dateTo) url += `to=${dateTo}&`;

      const res = await api.get(url);
      if (res.data?.projects && res.data.projects.length > 0) {
        setProjects((prev) => (prev.length > 0 ? prev : res.data.projects));
      }
      setItems(res.data?.items || []);
      setSummary(res.data?.summary || { count: 0, total: 0 });
    } catch {
      toast.error("Failed to load project expense report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedProjectId) {
      setItems([]);
      setSummary({ count: 0, total: 0 });
      setLoading(false);
      return;
    }
    fetchData();
  }, [selectedProjectId, dateFrom, dateTo]);

  // Client-side search filtering
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const q = searchTerm.toLowerCase();
    return items.filter(
      (v) =>
        (v.voucher_no || "").toLowerCase().includes(q) ||
        (v.project_name || "").toLowerCase().includes(q) ||
        (v.description || "").toLowerCase().includes(q) ||
        (v.status || "").toLowerCase().includes(q)
    );
  }, [items, searchTerm]);

  // Dynamic summary based on filtered items
  const filteredTotal = useMemo(() => {
    return filteredItems.reduce((acc, v) => acc + Number(v.amount || 0), 0);
  }, [filteredItems]);

  const handleResetFilters = () => {
    setSelectedProjectId("");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
    setItems([]);
    setSummary({ count: 0, total: 0 });
  };

  const selectedProject = useMemo(() => {
    return projects.find((p) => String(p.id) === String(selectedProjectId));
  }, [projects, selectedProjectId]);

  const exportExcel = () => {
    if (!selectedProjectId || filteredItems.length === 0) return;
    try {
      const headers = ["Voucher No", "Date", "Project", "Description", "Type", "Currency", "Amount (GH₵)", "Status"];
      const rows = filteredItems.map((v) => [
        v.voucher_no || "",
        v.voucher_date ? String(v.voucher_date).split("T")[0] : "",
        v.project_name || selectedProject?.project_name || "",
        (v.description || "").replace(/"/g, '""'),
        v.voucher_type_name || "-",
        v.currency_code || "GHS",
        Number(v.amount || 0).toFixed(2),
        v.status || "",
      ]);

      if (window.XLSX) {
        const wb = window.XLSX.utils.book_new();
        const ws = window.XLSX.utils.aoa_to_sheet([headers, ...rows]);
        window.XLSX.utils.book_append_sheet(wb, ws, "Project Expenses");
        window.XLSX.writeFile(wb, `project-expense-${selectedProject?.project_code || "report"}-${new Date().toISOString().split("T")[0]}.xlsx`);
      } else {
        const csvContent =
          "data:text/csv;charset=utf-8," +
          [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `project-expense-${selectedProject?.project_code || "report"}-${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      toast.success("Expense report exported");
    } catch {
      toast.error("Failed to export Excel report");
    }
  };

  const exportPdf = () => {
    if (!selectedProjectId || filteredItems.length === 0) return;
    try {
      if (window.jsPDF) {
        const doc = new window.jsPDF("landscape");
        const headers = ["Voucher No", "Date", "Project", "Description", "Currency", "Amount (GH₵)", "Status"];
        const rows = filteredItems.map((v) => [
          v.voucher_no || "",
          v.voucher_date ? String(v.voucher_date).split("T")[0] : "",
          v.project_name || selectedProject?.project_name || "-",
          v.description || "-",
          v.currency_code || "GHS",
          Number(v.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
          v.status || "",
        ]);
        doc.text(`Project Expense Report: ${selectedProject ? selectedProject.project_code + " - " + selectedProject.project_name : ""}`, 14, 15);
        doc.autoTable({
          head: [headers],
          body: rows,
          startY: 20,
          theme: "grid",
          styles: { fontSize: 8 },
          headStyles: { fillColor: [225, 29, 72] },
        });
        doc.save(`project-expense-${selectedProject?.project_code || "report"}-${new Date().toISOString().split("T")[0]}.pdf`);
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
        <div className="flex items-center gap-4">
          <Link
            to="/project-management?section=Reports%20%26%20Analytics"
            className="btn btn-secondary p-2.5 rounded-xl inline-flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Return to Reports"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <CreditCard size={22} />
              </span>
              Project Expense Report
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Financial payment vouchers, material bills, and disbursements linked to selected project
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {selectedProjectId && filteredItems.length > 0 && (
            <>
              <button
                onClick={exportExcel}
                className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3 font-semibold"
              >
                <Download size={15} /> Excel
              </button>
              <button
                onClick={exportPdf}
                className="btn btn-outline inline-flex items-center gap-1.5 text-xs py-2 px-3 font-semibold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
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
                    ? "border-rose-500 focus:ring-rose-500 bg-rose-50/30 dark:bg-rose-950/20"
                    : ""
                }`}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">-- Choose Project to View Expenses --</option>
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
                Search Vouchers
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  disabled={!selectedProjectId}
                  placeholder="Voucher #, description..."
                  className="input pl-8 pr-2.5 py-1.5 text-xs h-auto w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end">
            {(selectedProjectId || dateFrom || dateTo || searchTerm) && (
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
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
            <FolderOpen size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Select a Project to View Expenses
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Please select a project from the dropdown above to display its payment vouchers, project expenditures, and disbursement records.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Summary Cards for Selected Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-5 shadow-sm text-white flex items-center justify-between">
              <div>
                <div className="text-rose-100 text-xs uppercase tracking-wider font-semibold">
                  Total Payments Count
                </div>
                <div className="text-3xl font-bold mt-1">{filteredItems.length}</div>
                <div className="text-rose-100/80 text-[11px] mt-0.5">
                  {selectedProject ? `${selectedProject.project_code} - ${selectedProject.project_name}` : "Selected project"}
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl">
                <CreditCard size={26} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 shadow-sm text-white flex items-center justify-between">
              <div>
                <div className="text-orange-100 text-xs uppercase tracking-wider font-semibold">
                  Total Project Expenses (GH₵)
                </div>
                <div className="text-3xl font-bold mt-1">
                  GH₵ {filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-orange-100/80 text-[11px] mt-0.5">
                  Net debited project expenditure
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl">
                <TrendingDown size={26} />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <CreditCard size={15} className="text-rose-600" />
                Payment Vouchers Register ({filteredItems.length})
              </h2>
              <span className="text-xs text-slate-400 font-mono font-bold">
                Total: GH₵ {filteredTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Voucher No</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Project</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Currency</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-16 text-center text-slate-400 animate-pulse font-semibold">
                        Loading expense report records...
                      </td>
                    </tr>
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-rose-700 dark:text-rose-400">
                          {v.voucher_no}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {v.voucher_date ? new Date(v.voucher_date).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-200">
                          {v.project_name || selectedProject?.project_name || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={v.description}>
                          {v.description || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {v.voucher_type_name || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {v.currency_code || "GHS"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                          {Number(v.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              statusStyles[v.status] || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-16 text-center text-slate-400 italic">
                        No payment vouchers found for {selectedProject ? `"${selectedProject.project_name}"` : "this project"}.
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
