import MobileMovingCarousel from "@/components/MobileMovingCarousel";
/**
 * @fileoverview TemporalWarehouseStockReport.jsx
 * Displays real-time material stock availability and chronological stock movement journals
 * across all temporal/site warehouses in the Project Management module.
 * Modeled after Production Warehouse Stock Availability and Production Stock Journals reports.
 */

import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import {
  Warehouse,
  Boxes,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Calendar,
  RotateCcw,
  FileSpreadsheet,
  Printer,
  Download,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Briefcase
} from "lucide-react";

export default function TemporalWarehouseStockReport() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("availability"); // "availability" | "journals"
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [journalTypeFilter, setJournalTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Data States
  const [stockItems, setStockItems] = useState([]);
  const [summary, setSummary] = useState({
    totalWarehouses: 0,
    totalMaterials: 0,
    totalReceivedQty: 0,
    totalUtilizedQty: 0,
    totalAvailableQty: 0,
    inStockCount: 0,
    outOfStockCount: 0,
  });
  const [journals, setJournals] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [projects, setProjects] = useState([]);

  // Fetch Stock Availability
  const fetchStockData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects/reports/temporal-warehouse-stock", {
        params: {
          warehouse_id: selectedWarehouse || undefined,
          project_id: selectedProject || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          search: search || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        },
      });
      setStockItems(res.data?.items || []);
      if (res.data?.summary) setSummary(res.data.summary);
      if (Array.isArray(res.data?.warehouses)) setWarehouses(res.data.warehouses);
      if (Array.isArray(res.data?.projects)) setProjects(res.data.projects);
    } catch (err) {
      toast.error("Failed to load temporal warehouse stock data");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Journals
  const fetchJournalData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects/reports/temporal-warehouse-journals", {
        params: {
          warehouse_id: selectedWarehouse || undefined,
          project_id: selectedProject || undefined,
          type: journalTypeFilter !== "ALL" ? journalTypeFilter : undefined,
          search: search || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        },
      });
      setJournals(res.data?.items || []);
    } catch (err) {
      toast.error("Failed to load warehouse stock journals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "availability") {
      fetchStockData();
    } else {
      fetchJournalData();
    }
  }, [activeTab, selectedWarehouse, selectedProject, statusFilter, journalTypeFilter, fromDate, toDate]);

  // Client-side search filtering
  const filteredStock = useMemo(() => {
    if (!search.trim()) return stockItems;
    const q = search.toLowerCase();
    return stockItems.filter(
      (r) =>
        (r.item_name && r.item_name.toLowerCase().includes(q)) ||
        (r.item_code && r.item_code.toLowerCase().includes(q)) ||
        (r.warehouse_name && r.warehouse_name.toLowerCase().includes(q)) ||
        (r.warehouse_code && r.warehouse_code.toLowerCase().includes(q))
    );
  }, [stockItems, search]);

  const filteredJournals = useMemo(() => {
    if (!search.trim()) return journals;
    const q = search.toLowerCase();
    return journals.filter(
      (j) =>
        (j.voucher_no && j.voucher_no.toLowerCase().includes(q)) ||
        (j.item_name && j.item_name.toLowerCase().includes(q)) ||
        (j.item_code && j.item_code.toLowerCase().includes(q)) ||
        (j.warehouse_name && j.warehouse_name.toLowerCase().includes(q)) ||
        (j.project_name && j.project_name.toLowerCase().includes(q)) ||
        (j.task_title && j.task_title.toLowerCase().includes(q))
    );
  }, [journals, search]);

  // Export to Excel
  const exportExcel = () => {
    if (activeTab === "availability") {
      if (!filteredStock.length) return;
      const dataToExport = filteredStock.map((r, i) => ({
        "No": i + 1,
        "Temporal Warehouse": r.warehouse_name || "—",
        "Warehouse Code": r.warehouse_code || "—",
        "Item Code": r.item_code || "—",
        "Material Name": r.item_name || "—",
        "UOM": r.uom || "PCS",
        "Total Received (IN)": r.total_received,
        "Total Utilized (OUT)": r.total_utilized,
        "Available Qty": r.available_qty,
        "Stock Status": r.available_qty > 0 ? "IN STOCK" : "DEPLETED",
        "Last Movement Date": r.last_receipt_date || r.last_utilization_date || "—"
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SiteStockAvailability");
      XLSX.writeFile(wb, "pm-temporal-warehouse-stock.xlsx");
    } else {
      if (!filteredJournals.length) return;
      const dataToExport = filteredJournals.map((j, i) => ({
        "No": i + 1,
        "Date": j.movement_date ? new Date(j.movement_date).toLocaleDateString() : "—",
        "Voucher #": j.voucher_no || "—",
        "Type": j.movement_type,
        "Temporal Warehouse": j.warehouse_name || "—",
        "Project / Work Package": j.project_name || "—",
        "Task": j.task_title || "—",
        "Material Code": j.item_code || "—",
        "Material Name": j.item_name || "—",
        "Qty In": j.qty_in || 0,
        "Qty Out": j.qty_out || 0,
        "UOM": j.uom || "PCS",
        "Source Ref / Notes": j.source_doc || j.remarks || "—",
        "Created By": j.created_by_name || "—"
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SiteStockJournals");
      XLSX.writeFile(wb, "pm-temporal-warehouse-journals.xlsx");
    }
  };

  // Export to PDF
  const exportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.setFontSize(14);
    if (activeTab === "availability") {
      doc.text("PM Temporal Warehouses Stock Availability Report", 14, 15);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Site Warehouses: ${summary.totalWarehouses} | Available Balance: ${summary.totalAvailableQty}`, 14, 22);
      let y = 30;
      doc.setFontSize(8);
      filteredStock.forEach((r, idx) => {
        if (y > 185) { doc.addPage(); y = 15; }
        doc.text(`${idx + 1}. [${r.warehouse_name}] ${r.item_code} - ${r.item_name} | Recv: ${r.total_received} | Util: ${r.total_utilized} | Avail: ${r.available_qty} ${r.uom} (${r.available_qty > 0 ? "IN STOCK" : "DEPLETED"})`, 14, y);
        y += 6;
      });
      doc.save("pm-temporal-warehouse-stock.pdf");
    } else {
      doc.text("PM Temporal Warehouse Stock Journals & Movement Ledger", 14, 15);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Total Ledger Entries: ${filteredJournals.length}`, 14, 22);
      let y = 30;
      doc.setFontSize(8);
      filteredJournals.forEach((j, idx) => {
        if (y > 185) { doc.addPage(); y = 15; }
        const dt = j.movement_date ? new Date(j.movement_date).toLocaleDateString() : "";
        const net = j.movement_type === "RECEIPT" ? `+${j.qty_in}` : `-${j.qty_out}`;
        doc.text(`${idx + 1}. [${dt}] ${j.voucher_no} | ${j.movement_type} | ${j.warehouse_name} | ${j.item_name} (${net} ${j.uom}) | ${j.project_name}`, 14, y);
        y += 6;
      });
      doc.save("pm-temporal-warehouse-journals.pdf");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <button
            onClick={() => navigate("/project-management?section=Reports%20%26%20Analytics")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 mb-1"
          >
            <ArrowLeft size={14} /> Back to Reports & Analytics
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
              <Warehouse size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold md:text-2xl font-bold text-slate-900 dark:text-white">
                Temporal Warehouses Stock & Movement Report
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5 hidden">
                Site warehouse inventory availability, receipt inward deliveries, and project material utilizations
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
          
          <button
            onClick={exportExcel}
            className="btn btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
            title="Export to Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            Excel
          </button>
          <button
            onClick={exportPDF}
            className="btn btn-secondary text-sm flex items-center gap-1.5 px-3 py-2"
            title="Export to PDF"
          >
            <Download size={14} className="text-rose-600" />
            PDF
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn-primary text-xs flex items-center gap-1.5 px-3 py-2"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      {/* Metric Stats Cards Carousel */}
      <MobileMovingCarousel data-page-carousel gridColsClass="md:grid-cols-5" gapClass="gap-4">
        {[
          {
            label: "Site Stores",
            val: summary.totalWarehouses,
            icon: <Warehouse size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Materials",
            val: summary.totalMaterials,
            icon: <Boxes size={20} className="stroke-[2.5]" />,
            color: "bg-indigo-600 text-white",
          },
          {
            label: "Total Received",
            val: Number(summary.totalReceivedQty).toLocaleString(),
            icon: <ArrowDownLeft size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600 text-white",
          },
          {
            label: "Total Utilized",
            val: Number(summary.totalUtilizedQty).toLocaleString(),
            icon: <ArrowUpRight size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Available Qty",
            val: Number(summary.totalAvailableQty).toLocaleString(),
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-blue-600 text-white",
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

      {/* Segmented View Control (Tab Toggle) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab("availability")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "availability"
                ? "bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Boxes size={15} />
            Stock Availability & Balances
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("journals")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "journals"
                ? "bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers size={15} />
            Stock Movements Journal
          </button>
        </div>
      </div>

      {/* Filter Surface */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Warehouse Selector */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Temporal Warehouse</label>
            <select
              className="input w-full text-sm"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              <option value="">All Temporal Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.warehouse_name || w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Selector */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Project / Scope</label>
            <select
              className="input w-full text-sm"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_name} ({p.project_code})
                </option>
              ))}
            </select>
          </div>

          {/* Status or Movement Type Filter */}
          {activeTab === "availability" ? (
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Stock Availability</label>
              <select
                className="input w-full text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="in_stock">In Stock (&gt; 0)</option>
                <option value="out_of_stock">Depleted / Zero Stock</option>
              </select>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Movement Type</label>
              <select
                className="input w-full text-sm"
                value={journalTypeFilter}
                onChange={(e) => setJournalTypeFilter(e.target.value)}
              >
                <option value="ALL">All Movements</option>
                <option value="RECEIPT">Receipts (IN)</option>
                <option value="UTILIZATION">Utilizations (OUT)</option>
              </select>
            </div>
          )}

          {/* From Date */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">From Date</label>
            <input
              type="date"
              className="input w-full text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          {/* To Date */}
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">To Date</label>
            <input
              type="date"
              className="input w-full text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            className="input w-full pl-9 text-sm"
            placeholder={
              activeTab === "availability"
                ? "Search by item code, material name, or warehouse..."
                : "Search by voucher no, material, project, task, or warehouse..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {activeTab === "availability" ? (
          /* TAB 1: STOCK AVAILABILITY & BALANCES */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Temporal Warehouse</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Material Code</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Material Name</th>
                  <th className="px-3 py-3 font-bold text-slate-600 dark:text-slate-300 text-center">Base UOM</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-right">Received (IN)</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-right">Utilized (OUT)</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-right">Available Qty</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-center">Stock Status</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400 font-semibold animate-pulse">
                      Loading temporal warehouse stock availability...
                    </td>
                  </tr>
                ) : filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400">
                      <Boxes size={32} className="mx-auto mb-2 text-slate-300 opacity-60" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">No stock records found</p>
                      <p className="text-[11px] text-slate-400 mt-1">Try loosening search filters or select all temporal warehouses</p>
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((r, idx) => {
                    const isAvailable = Number(r.available_qty || 0) > 0;
                    return (
                      <tr key={`${r.warehouse_id}_${r.item_id}_${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <Warehouse size={13} className="text-brand-500 shrink-0" />
                            <span>{r.warehouse_name}</span>
                          </div>
                          {r.location && (
                            <span className="text-[10px] text-slate-400 block pl-4">{r.location}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {r.item_code}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {r.item_name}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                            {r.uom}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {Number(r.total_received || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400">
                          {Number(r.total_utilized || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-white">
                          {Number(r.available_qty || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isAvailable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 size={11} /> IN STOCK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              <AlertTriangle size={11} /> DEPLETED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          {r.last_receipt_date
                            ? `Recv: ${new Date(r.last_receipt_date).toLocaleDateString()}`
                            : r.last_utilization_date
                            ? `Util: ${new Date(r.last_utilization_date).toLocaleDateString()}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* TAB 2: STOCK MOVEMENTS JOURNAL */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Voucher / Ref</th>
                  <th className="px-3 py-3 font-bold text-slate-600 dark:text-slate-300 text-center">Movement</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Temporal Warehouse</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Project / Scope</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Material Item</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-right">In (Recv)</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300 text-right">Out (Util)</th>
                  <th className="px-4 py-3 font-bold text-slate-600 dark:text-slate-300">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400 font-semibold animate-pulse">
                      Loading temporal warehouse journals...
                    </td>
                  </tr>
                ) : filteredJournals.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-slate-400">
                      <Layers size={32} className="mx-auto mb-2 text-slate-300 opacity-60" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">No stock journal movements recorded</p>
                      <p className="text-[11px] text-slate-400 mt-1">Receipts and utilizations linked to temporal storage will appear here</p>
                    </td>
                  </tr>
                ) : (
                  filteredJournals.map((j, idx) => {
                    const isReceipt = j.movement_type === "RECEIPT";
                    return (
                      <tr key={`${j.parent_id}_${j.line_id}_${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {j.movement_date ? new Date(j.movement_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-brand-700 dark:text-brand-300">
                          {j.voucher_no}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {isReceipt ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <ArrowDownLeft size={11} /> RECEIPT (IN)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <ArrowUpRight size={11} /> UTILIZATION (OUT)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {j.warehouse_name}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{j.project_name}</div>
                          {j.task_title && (
                            <div className="text-[10px] text-slate-400">{j.task_title}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{j.item_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{j.item_code}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(j.qty_in || 0) > 0 ? `+${Number(j.qty_in).toLocaleString()} ${j.uom}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {Number(j.qty_out || 0) > 0 ? `-${Number(j.qty_out).toLocaleString()} ${j.uom}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          {j.created_by_name || "Admin"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
