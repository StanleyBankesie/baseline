/**
 * @fileoverview ProductionOutputPage component.
 * Dedicated Production Quality Check, Output & Finished Goods Inventory Registration Page.
 * Corresponds to Step 10 & 11 of the Production Process Flow:
 * Manufacturing Setup -> BOM -> Planning -> Production Order -> Material Requisition -> Material Receipt -> Material Utilization -> Production Execution -> Quality Check -> Production Output -> Finished Goods Inventory & Finance Posting
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  PackageCheck, 
  Save, 
  Loader2, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Layers,
  ArrowRight
} from "lucide-react";
import { api } from "api/client";
import { toast } from "react-toastify";

export default function ProductionOutputPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [formData, setFormData] = useState({
    work_order_id: "",
    output_date: new Date().toISOString().split("T")[0],
    warehouse_id: "",
    planned_qty: 0,
    produced_qty: 0,
    good_qty: 0,
    rejected_qty: 0,
    scrap_qty: 0,
    quality_status: "PASSED", // PASSED | REJECTED | REWORK
    batch_no: `LOT-${Date.now().toString().slice(-6)}`,
    remarks: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [woRes, whRes] = await Promise.all([
          api.get("/production/work-orders"),
          api.get("/inventory/warehouses")
        ]);

        const orders = (woRes.data?.items || []).filter(
          (w) => w.status === "IN_PROGRESS" || w.status === "RELEASED" || w.status === "PLANNED"
        );
        setWorkOrders(orders);
        setWarehouses(whRes.data?.items || []);

        if (orders.length > 0) {
          handleOrderSelect(orders[0].id, orders);
        }
      } catch {
        toast.error("Failed to load production output data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleOrderSelect = (orderId, list = workOrders) => {
    const selected = list.find((w) => String(w.id) === String(orderId));
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        work_order_id: orderId,
        warehouse_id: selected.warehouse_id || prev.warehouse_id,
        planned_qty: Number(selected.qty_to_produce || 0),
        produced_qty: Number(selected.qty_to_produce || 0),
        good_qty: Number(selected.qty_to_produce || 0),
        rejected_qty: 0,
        scrap_qty: 0,
        remarks: `Production Output for Order #${selected.work_order_no}`
      }));
    }
  };

  const handleGoodQtyChange = (val) => {
    const good = parseFloat(val) || 0;
    setFormData((prev) => {
      const produced = good + prev.rejected_qty;
      return {
        ...prev,
        good_qty: good,
        produced_qty: produced
      };
    });
  };

  const handleRejectedQtyChange = (val) => {
    const rej = parseFloat(val) || 0;
    setFormData((prev) => {
      const produced = prev.good_qty + rej;
      return {
        ...prev,
        rejected_qty: rej,
        produced_qty: produced
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.work_order_id) return toast.error("Please select a Production Order");
    if (formData.good_qty <= 0 && formData.rejected_qty <= 0) {
      return toast.error("Please enter a valid Good or Rejected Produced Quantity");
    }

    setSaving(true);
    try {
      // 1. Mark Work Order as COMPLETED
      await api.put(`/production/work-orders/${formData.work_order_id}/status`, { status: "COMPLETED" });

      // 2. Post Finished Goods Stock Receipt into Inventory
      await api.post("/production/inventory/stock-journal", {
        plan_id: null,
        journal_date: formData.output_date,
        remarks: `Production Output & Quality Check for Order ID ${formData.work_order_id}. Good Qty: ${formData.good_qty}, Rejected: ${formData.rejected_qty}`,
        items: [
          {
            item_id: formData.work_order_id, // Work Order Item
            type: "IN",
            qty: formData.good_qty,
            uom: "Pcs"
          }
        ]
      });

      toast.success("Production Output & Quality Check recorded! Finished Goods inventory increased.");
      navigate("/production/work-orders");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to record production output");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-20 text-center animate-pulse font-bold text-slate-400">Loading Output Environment...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/production" className="btn btn-secondary p-2">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-300">Production Output & Quality Check</h1>
            <p className="text-slate-500 text-sm">Record finished product output, quality verification, scrap, and register Finished Goods into Inventory</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order & Warehouse Selection */}
        <div className="card p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Select Production Order *
            </label>
            <select
              required
              value={formData.work_order_id}
              onChange={(e) => handleOrderSelect(e.target.value)}
              className="input w-full font-bold"
            >
              <option value="">Select Order...</option>
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>
                  #{wo.work_order_no} — {wo.item_name || "Output"} ({wo.qty_to_produce} Planned)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Finished Goods Warehouse *
            </label>
            <select
              required
              value={formData.warehouse_id}
              onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
              className="input w-full"
            >
              <option value="">Select Target Warehouse...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Completion Date *
            </label>
            <input
              type="date"
              required
              value={formData.output_date}
              onChange={(e) => setFormData({ ...formData, output_date: e.target.value })}
              className="input w-full"
            />
          </div>
        </div>

        {/* Quality Verification & Output Quantities */}
        <div className="card p-6 space-y-6">
          <h3 className="font-bold text-slate-900 dark:text-white text-base border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center gap-2">
            <PackageCheck size={20} className="text-brand-600" />
            Production Output & Quality Verification
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Planned Qty</label>
              <input
                type="number"
                disabled
                value={formData.planned_qty}
                className="input w-full bg-slate-100 dark:bg-slate-800 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-1">Good Produced Qty *</label>
              <input
                type="number"
                step="any"
                required
                value={formData.good_qty}
                onChange={(e) => handleGoodQtyChange(e.target.value)}
                className="input w-full font-bold text-emerald-600 border-emerald-300 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-rose-700 dark:text-rose-400 uppercase mb-1">Rejected / Failed Qty</label>
              <input
                type="number"
                step="any"
                value={formData.rejected_qty}
                onChange={(e) => handleRejectedQtyChange(e.target.value)}
                className="input w-full font-bold text-rose-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-700 dark:text-amber-400 uppercase mb-1">Scrap / Waste Qty</label>
              <input
                type="number"
                step="any"
                value={formData.scrap_qty}
                onChange={(e) => setFormData({ ...formData, scrap_qty: parseFloat(e.target.value) || 0 })}
                className="input w-full font-bold text-amber-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Quality Inspection Result *
              </label>
              <select
                value={formData.quality_status}
                onChange={(e) => setFormData({ ...formData, quality_status: e.target.value })}
                className="input w-full font-bold"
              >
                <option value="PASSED">Passed — Approve for Finished Goods Stock</option>
                <option value="REJECTED">Failed — Quarantine / Reject</option>
                <option value="REWORK">Rework Required</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Finished Goods Batch / Lot #
              </label>
              <input
                type="text"
                value={formData.batch_no}
                onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                className="input w-full font-mono text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Quality Verification Remarks & Inspection Notes
              </label>
              <textarea
                rows="2"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Detail product specifications, dimensions, temperature, or visual checks..."
                className="input w-full"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link to="/production/work-orders" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <PackageCheck size={16} />}
            Complete Production & Post Inventory
          </button>
        </div>
      </form>
    </div>
  );
}
