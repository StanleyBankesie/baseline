/**
 * @fileoverview WorkOrderList component.
 * Overhauled Production Orders List supporting standard production lifecycle statuses:
 * DRAFT -> PLANNED -> RELEASED -> IN_PROGRESS -> COMPLETED -> CLOSED / CANCELLED
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Search, 
  ClipboardList, 
  ArrowLeft,
  ChevronRight,
  Package,
  AlertTriangle
} from "lucide-react";
import { api } from "api/client";
import { toast } from "react-toastify";
import useSort from "@/hooks/useSort.js";
import SortableHeader from "@/components/SortableHeader.jsx";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

const StatusBadge = ({ status }) => {
  const styles = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    PLANNED: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
    RELEASED: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400",
    IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
    CLOSED: "bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
    CANCELLED: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400"
  };
  const s = status ? String(status).toUpperCase() : "DRAFT";
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[s] || styles.DRAFT}`}>
      {s.replace('_', ' ')}
    </span>
  );
};

export default function WorkOrderList() {
  const [viewMode, setViewMode] = useViewMode();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchOrders = async () => {
    try {
      const res = await api.get("/production/work-orders");
      setOrders(res.data?.items || []);
    } catch {
      toast.error("Failed to fetch production orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/production/work-orders/${orderId}/status`, { status: newStatus });
      toast.success(`Production Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update order status");
    }
  };

  const searchFilteredOrders = orders.filter(o => {
    const matchesSearch = 
      String(o.work_order_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(o.bom_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(o.item_name || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || String(o.status || "").toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { sorted: filteredOrders, sortKey, sortDir, toggle } = useSort(searchFilteredOrders, "created_at", "desc");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link to="/production" className="btn btn-secondary p-2">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-300">Production Orders</h1>
            <p className="text-slate-500 text-sm">Create, release, schedule, and execute production runs with material shortage checks</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/production/work-orders/new" 
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            New Production Order
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto flex-1">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search order #, product, BOM..."
              className="input pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full md:w-48 text-xs font-bold"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PLANNED">Planned</option>
            <option value="RELEASED">Released</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>

      {/* Orders Table */}
      <div className="card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className={"table " + (viewMode === 'grid' ? 'table-grid-mode' : '')}>
            <thead>
              <tr>
                <SortableHeader label="Order No" sortKey="work_order_no" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                <SortableHeader label="Target Product" sortKey="item_name" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                <SortableHeader label="Planned Qty" sortKey="qty_to_produce" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                <SortableHeader label="Date" sortKey="work_order_date" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                <SortableHeader label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="text-center" />
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">
                    Loading production orders...
                  </td>
                </tr>
              ) : filteredOrders.length > 0 ? filteredOrders.map((order) => (
                <tr key={order.id} className="group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-brand-600">
                        <ClipboardList size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-brand-900 dark:text-brand-300 block">{order.work_order_no}</span>
                        <span className="text-xs text-slate-400">{order.bom_name || "Custom BOM"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-200">
                    {order.item_name ? `${order.item_name} (${order.item_code || ''})` : "General Output"}
                  </td>
                  <td className="px-6 py-4 font-bold text-brand-600">
                    {order.qty_to_produce} {order.uom || "Pcs"}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {order.work_order_date ? new Date(order.work_order_date).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {/* Status Action Buttons */}
                    {order.status === "DRAFT" && (
                      <button
                        onClick={() => handleStatusChange(order.id, "RELEASED")}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100"
                      >
                        Release Order
                      </button>
                    )}
                    {order.status === "RELEASED" && (
                      <button
                        onClick={() => handleStatusChange(order.id, "IN_PROGRESS")}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
                      >
                        Start Production
                      </button>
                    )}
                    {order.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => handleStatusChange(order.id, "COMPLETED")}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      >
                        Complete Production
                      </button>
                    )}

                    <Link
                      to={`/production/work-orders/${order.id}`}
                      className="p-1.5 text-slate-400 hover:text-brand-600 transition-colors inline-block"
                      title="View Order Details & Material Shortages"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                    <Package className="mx-auto mb-2 opacity-50" size={32} />
                    No production orders found. Click "New Production Order" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
