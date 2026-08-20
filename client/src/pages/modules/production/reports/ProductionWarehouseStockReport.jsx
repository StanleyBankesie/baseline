/**
 * @fileoverview ProductionWarehouseStockReport component.
 * Displays available stock quantities of items across all production warehouses.
 */

import React, { useEffect, useState } from "react";
import { 
  Warehouse, 
  Search, 
  Filter, 
  RefreshCw, 
  ArrowLeft, 
  Download, 
  Printer, 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle 
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "api/client";
import { toast } from "react-toastify";

export default function ProductionWarehouseStockReport() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stockRes, whRes, prodWhRes] = await Promise.allSettled([
        api.get("/production/reports/warehouse-stock", {
          params: {
            warehouse_id: selectedWarehouse || undefined,
            search: search || undefined,
            status: statusFilter !== "all" ? statusFilter : undefined,
          },
        }),
        api.get("/inventory/warehouses"),
        api.get("/production/setup/warehouses"),
      ]);

      if (stockRes.status === "fulfilled") {
        setItems(Array.isArray(stockRes.value?.data?.items) ? stockRes.value.data.items : []);
      } else {
        toast.error("Failed to load warehouse stock report");
      }

      const invWh = whRes.status === "fulfilled" && Array.isArray(whRes.value?.data?.items) ? whRes.value.data.items : [];
      const prodWh = prodWhRes.status === "fulfilled" && Array.isArray(prodWhRes.value?.data?.items) ? prodWhRes.value.data.items : [];
      
      const combinedWh = [...prodWh];
      invWh.forEach(iw => {
        if (!combinedWh.some(w => String(w.id) === String(iw.id))) {
          combinedWh.push(iw);
        }
      });
      setWarehouses(combinedWh);
    } catch {
      toast.error("Failed to load production warehouse stock");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedWarehouse, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleExportCSV = () => {
    if (!items.length) {
      toast.info("No data available to export");
      return;
    }
    const headers = ["Warehouse", "Item Code", "Item Name", "UOM", "Total Received", "Total Utilized", "Available Qty", "Status"];
    const rows = items.map(r => [
      `"${r.warehouse_name || ''}"`,
      `"${r.item_code || ''}"`,
      `"${r.item_name || ''}"`,
      `"${r.uom || ''}"`,
      r.total_received || 0,
      r.total_utilized || 0,
      r.available_qty || 0,
      Number(r.available_qty) > 0 ? "In Stock" : "Out of Stock"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `production_warehouse_stock_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const totalWarehouses = new Set(items.map(i => i.warehouse_id)).size;
  const totalItemsCount = items.length;
  const totalAvailableQty = items.reduce((acc, curr) => acc + Number(curr.available_qty || 0), 0);
  const outOfStockCount = items.filter(i => Number(i.available_qty) <= 0).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/production/reports" className="btn btn-secondary p-2.5">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-300 flex items-center gap-2">
              <Warehouse className="text-brand-600" size={26} />
              Production Warehouse Stock Availability
            </h1>
            <p className="text-slate-500 text-sm">Real-time available quantities of raw materials and WIP across all production warehouses</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="btn btn-secondary flex items-center gap-2 text-xs font-bold" title="Refresh">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={handleExportCSV} className="btn btn-secondary flex items-center gap-2 text-xs font-bold" title="Export CSV">
            <Download size={16} />
            Export CSV
          </button>
          <button onClick={() => window.print()} className="btn btn-primary bg-brand-900 hover:bg-brand-950 text-white flex items-center gap-2 text-xs font-bold" title="Print Report">
            <Printer size={16} />
            Print Report
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-brand-600 flex items-center gap-4">
          <div className="p-3 bg-brand-50 dark:bg-brand-900/30 text-brand-600 rounded-xl">
            <Warehouse size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Warehouses</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalWarehouses}</h3>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-blue-600 flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tracked Stock Items</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalItemsCount}</h3>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-emerald-600 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Available Qty</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalAvailableQty.toLocaleString()}</h3>
          </div>
        </div>

        <div className="card p-5 border-l-4 border-l-amber-600 flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zero / Out of Stock</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{outOfStockCount}</h3>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input pl-10 w-full text-sm font-medium"
              placeholder="Search by item code or item name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary text-xs font-bold px-4 py-2.5">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Warehouse Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              className="input text-xs font-bold py-2"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              <option value="">All Production Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.warehouse_name || w.name || w.warehouse_code}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <select
            className="input text-xs font-bold py-2"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">Available In Stock (&gt; 0)</option>
            <option value="out_of_stock">Out of Stock (&le; 0)</option>
          </select>
        </div>
      </div>

      {/* Main Stock Data Table */}
      <div className="card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="table w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Warehouse</th>
                <th className="py-3.5 px-4">Item Code</th>
                <th className="py-3.5 px-4">Item Name</th>
                <th className="py-3.5 px-4 text-center">UOM</th>
                <th className="py-3.5 px-4 text-right">Total Received</th>
                <th className="py-3.5 px-4 text-right">Total Utilized</th>
                <th className="py-3.5 px-4 text-right font-black text-slate-700 dark:text-slate-200">Available Qty</th>
                <th className="py-3.5 px-4 text-center">Stock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold animate-pulse">
                    Loading production warehouse stock data...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                    No production warehouse stock records found.
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => {
                  const avail = Number(row.available_qty || 0);
                  const isAvailable = avail > 0;
                  return (
                    <tr key={`${row.warehouse_id}-${row.item_id}-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 text-xs font-bold">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-800 dark:text-brand-300 text-xs font-bold">
                          <Warehouse size={13} />
                          {row.warehouse_name || "Production Store"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                        {row.item_code || "-"}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {row.item_name}
                      </td>
                      <td className="py-3 px-4 text-center text-xs font-bold text-slate-500">
                        {row.uom || "PCS"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        {Number(row.total_received || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        {Number(row.total_utilized || 0).toLocaleString()}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono text-base font-black ${isAvailable ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                        {avail.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <CheckCircle2 size={12} />
                            In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                            <XCircle size={12} />
                            Out of Stock
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
