/**
 * @fileoverview ProductionWarehouseList component.
 * Management component for Production Warehouses configured in Manufacturing Setup.
 */

import React, { useState, useEffect } from "react";
import { api } from "api/client";
import { toast } from "react-toastify";
import { Plus, Edit, Warehouse, Check, X, Eye, Power } from "lucide-react";

export default function ProductionWarehouseList() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [currentWh, setCurrentWh] = useState({ warehouse_name: "", description: "", is_active: true });

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/production/setup/warehouses");
      setWarehouses(res.data?.items || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load production warehouses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!currentWh.warehouse_name.trim()) return toast.error("Warehouse name is required");

    try {
      if (currentWh.id) {
        await api.put(`/production/setup/warehouses/${currentWh.id}`, currentWh);
        toast.success("Production warehouse updated successfully");
      } else {
        await api.post("/production/setup/warehouses", currentWh);
        toast.success("Production warehouse created successfully");
      }
      setShowModal(false);
      fetchWarehouses();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save production warehouse");
    }
  };

  const handleToggleStatus = async (wh) => {
    const newStatus = !wh.is_active;
    try {
      await api.put(`/production/setup/warehouses/${wh.id}`, {
        ...wh,
        is_active: newStatus
      });
      toast.success(
        `Production warehouse "${wh.warehouse_name}" set to ${newStatus ? "ACTIVE" : "INACTIVE"}`
      );
      fetchWarehouses();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update warehouse status");
    }
  };

  const visibleWarehouses = warehouses.filter((w) => (showInactive ? true : !!w.is_active));

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Warehouse className="text-brand-600" size={20} />
            Production Warehouses & Staging Locations
          </h2>
          <p className="text-xs text-slate-500">Configure factory floor holding stores (Raw Store, WIP Staging, Finished Goods, Quality Bay)</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`btn text-xs flex items-center gap-1.5 ${
              showInactive ? "btn-secondary bg-slate-200 dark:bg-slate-700" : "btn-secondary"
            }`}
          >
            <Eye size={14} />
            {showInactive ? "Hide Inactive" : "Show Inactive"}
          </button>
          <button
            onClick={() => {
              setCurrentWh({ warehouse_name: "", description: "", is_active: true });
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Warehouse Location
          </button>
        </div>
      </div>

      {/* Warehouses Table */}
      <div className="card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Warehouse / Location Name</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">Loading production warehouses...</td>
                </tr>
              ) : visibleWarehouses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium">
                    <Warehouse className="mx-auto mb-2 opacity-50" size={32} />
                    {showInactive ? "No production warehouses found." : "No active production warehouses configured."}
                  </td>
                </tr>
              ) : (
                visibleWarehouses.map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-brand-900 dark:text-brand-300 flex items-center gap-2">
                      <Warehouse size={16} className="text-brand-500" />
                      {wh.warehouse_name}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{wh.code || "—"}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{wh.description || "—"}</td>
                    <td className="px-6 py-4">
                      {wh.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Check size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                          <X size={12} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(wh)}
                        className={`btn p-1.5 text-xs font-bold ${
                          wh.is_active
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                        }`}
                        title={wh.is_active ? "Set to Inactive" : "Set to Active"}
                      >
                        <Power size={14} className="inline mr-1" />
                        {wh.is_active ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        onClick={() => {
                          setCurrentWh(wh);
                          setShowModal(true);
                        }}
                        className="btn btn-secondary p-1.5 text-blue-600 hover:text-blue-700"
                        title="Edit Warehouse Location"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {currentWh.id ? "Edit Production Warehouse" : "New Production Warehouse"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Warehouse Location Name *
                </label>
                <input
                  type="text"
                  required
                  value={currentWh.warehouse_name}
                  onChange={(e) => setCurrentWh({ ...currentWh, warehouse_name: e.target.value })}
                  placeholder="e.g. Work-In-Progress (WIP) Staging Area"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={currentWh.description || ""}
                  onChange={(e) => setCurrentWh({ ...currentWh, description: e.target.value })}
                  placeholder="Details regarding items stored at this staging location"
                  className="input w-full"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="whActive"
                  checked={!!currentWh.is_active}
                  onChange={(e) => setCurrentWh({ ...currentWh, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="whActive" className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  Active Location
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
