/**
 * @fileoverview MaterialUtilizationForm component.
 * Production Material Utilization entry form.
 * Replicates Project Management Material Utilization validation patterns:
 * - Select Work Order / Material Receipt
 * - Auto-populates received materials
 * - Enforces qty_utilized <= qty_received validation
 */

import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Plus, Trash2, Loader2, Package, Info, AlertTriangle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "api/client";
import { toast } from "react-toastify";

export default function MaterialUtilizationForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [inventoryItems, setInventoryItems] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [formData, setFormData] = useState({
    work_order_id: "",
    receipt_id: "",
    warehouse_id: "",
    utilization_date: new Date().toISOString().split("T")[0],
    remarks: "",
    items: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, woRes, recRes, whRes] = await Promise.all([
          api.get("/inventory/items?all=1"),
          api.get("/production/work-orders"),
          api.get("/production/execution/material-receipt"),
          api.get("/inventory/warehouses")
        ]);

        setInventoryItems(itemsRes.data?.items || []);
        setWorkOrders(woRes.data?.items || []);
        setReceipts(recRes.data?.items || []);
        setWarehouses(whRes.data?.items || []);

        if (id && id !== "new") {
          const detailRes = await api.get(`/production/execution/material-utilization/${id}`);
          const data = detailRes.data;
          setFormData({
            work_order_id: data.work_order_id || "",
            receipt_id: data.receipt_id || "",
            warehouse_id: data.warehouse_id || "",
            utilization_date: data.utilization_date ? data.utilization_date.split("T")[0] : new Date().toISOString().split("T")[0],
            remarks: data.remarks || "",
            items: data.items || []
          });
        }
      } catch (error) {
        toast.error("Failed to load utilization metadata");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleReceiptChange = async (receiptId) => {
    setFormData((prev) => ({ ...prev, receipt_id: receiptId }));
    if (!receiptId) return;

    try {
      const res = await api.get(`/production/execution/material-receipt/${receiptId}`);
      const recData = res.data;

      const mappedItems = (recData.items || []).map((i) => {
        const available = Math.max(0, Number(i.qty_received || 0) - Number(i.qty_utilized || 0));
        return {
          item_id: i.item_id,
          qty_required: i.qty_received,
          qty_received: i.qty_received,
          available_qty: available,
          qty_utilized: available,
          uom: i.uom || "Pcs",
          batch_no: i.batch_no || ""
        };
      });

      setFormData((prev) => ({
        ...prev,
        receipt_id: receiptId,
        work_order_id: recData.work_order_id || prev.work_order_id,
        warehouse_id: recData.warehouse_id || prev.warehouse_id,
        items: mappedItems,
        remarks: `Auto-populated from Material Receipt #${recData.receipt_no}`
      }));
      toast.info("Materials loaded from Material Receipt");
    } catch {
      toast.error("Failed to fetch receipt items");
    }
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { item_id: "", qty_required: 0, qty_received: 0, available_qty: 0, qty_utilized: 1, uom: "Pcs", batch_no: "" }
      ]
    }));
  };

  const updateItemRow = (index, field, value) => {
    const nextItems = [...formData.items];
    nextItems[index] = { ...nextItems[index], [field]: value };

    if (field === "item_id") {
      const sel = inventoryItems.find((i) => String(i.id) === String(value));
      if (sel) nextItems[index].uom = sel.unit_name || "Pcs";
    }

    setFormData((prev) => ({ ...prev, items: nextItems }));
  };

  const removeItemRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) return toast.error("Please add at least one material item");

    // Enforce Quantity Control Validation
    for (const item of formData.items) {
      if (Number(item.qty_utilized) <= 0) {
        return toast.error("Utilized quantity must be greater than zero");
      }
      if (item.available_qty > 0 && Number(item.qty_utilized) > Number(item.available_qty)) {
        return toast.error(
          `Cannot utilize ${item.qty_utilized}. Maximum available from receipt is ${item.available_qty}`
        );
      }
    }

    setSaving(true);
    try {
      await api.post("/production/execution/material-utilization", formData);
      toast.success("Material utilization recorded successfully");
      navigate("/production/execution/material-utilization");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to record material utilization");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-20 text-center animate-pulse font-bold text-slate-400">Loading Utilization Form...</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/production/execution/material-utilization" className="btn btn-secondary p-2">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-300">Record Material Utilization</h1>
            <p className="text-slate-500 text-sm">Track actual raw material consumption against Production Orders & Material Receipts</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Select Material Receipt
            </label>
            <select
              value={formData.receipt_id}
              onChange={(e) => handleReceiptChange(e.target.value)}
              className="input w-full"
            >
              <option value="">Select Material Receipt (Auto-fill)...</option>
              {receipts.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.receipt_no} ({r.work_order_no || "Direct"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Link Work Order
            </label>
            <select
              value={formData.work_order_id}
              onChange={(e) => setFormData({ ...formData, work_order_id: e.target.value })}
              className="input w-full"
            >
              <option value="">Select Work Order...</option>
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>
                  {wo.work_order_no}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Utilization Date *
            </label>
            <input
              type="date"
              required
              value={formData.utilization_date}
              onChange={(e) => setFormData({ ...formData, utilization_date: e.target.value })}
              className="input w-full"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Remarks & Consumption Notes
            </label>
            <textarea
              rows="2"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="e.g. Batch #401 consumed in Phase 1 Assembly"
              className="input w-full"
            />
          </div>
        </div>

        {/* Materials Table Section */}
        <div className="card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Utilized Material Items</h3>
              <p className="text-xs text-slate-500">Record actual consumed quantities (Strictly ≤ Available Received Qty)</p>
            </div>
            <button type="button" onClick={addItemRow} className="btn btn-secondary text-xs flex items-center gap-1.5">
              <Plus size={14} /> Add Item Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Material Item *</th>
                  <th className="px-4 py-3">Available Received</th>
                  <th className="px-4 py-3">Actual Utilized *</th>
                  <th className="px-4 py-3">UOM</th>
                  <th className="px-4 py-3">Batch #</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {formData.items.map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3">
                      <select
                        required
                        value={row.item_id}
                        onChange={(e) => updateItemRow(idx, "item_id", e.target.value)}
                        className="input w-full text-xs"
                      >
                        <option value="">Select Material...</option>
                        {inventoryItems.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.item_name} ({it.item_code})
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-500">{row.available_qty || row.qty_received || 0}</span>
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="any"
                        required
                        value={row.qty_utilized}
                        onChange={(e) => updateItemRow(idx, "qty_utilized", parseFloat(e.target.value) || 0)}
                        className="input w-32 text-xs font-bold text-brand-600"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.uom}
                        onChange={(e) => updateItemRow(idx, "uom", e.target.value)}
                        className="input w-20 text-xs"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.batch_no || ""}
                        onChange={(e) => updateItemRow(idx, "batch_no", e.target.value)}
                        placeholder="Batch #"
                        className="input w-28 text-xs"
                      />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link to="/production/execution/material-utilization" className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={saving} className="btn btn-primary flex items-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save Material Utilization
          </button>
        </div>
      </form>
    </div>
  );
}
