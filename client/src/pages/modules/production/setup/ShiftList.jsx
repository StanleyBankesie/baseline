/**
 * @fileoverview ShiftList component.
 * Provides functionality for ShiftList.
 */

import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Loader2, Clock, Calendar, ArrowLeft, Activity, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "api/client";
import { toast } from "react-toastify";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

/**
 *  component
 * 
 * @returns {JSX.Element} The rendered component
 */
export default function ShiftList() {
  const [viewMode, setViewMode] = useViewMode();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentShift, setCurrentShift] = useState({ shift_name: "", start_time: "08:00", end_time: "17:00" });
  const [saving, setSaving] = useState(false);

  const fetchShifts = async () => {
    try {
      const res = await api.get("/production/setup/shifts");
      setItems(res.data?.items || []);
    } catch (error) {
      toast.error("Failed to load shifts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (currentShift.id) {
        await api.put(`/production/setup/shifts/${currentShift.id}`, currentShift);
        toast.success("Shift updated");
      } else {
        await api.post("/production/setup/shifts", currentShift);
        toast.success("Shift created");
      }
      setShowModal(false);
      fetchShifts();
    } catch (error) {
      toast.error("Failed to save shift");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await api.delete(`/production/setup/shifts/${id}`);
      toast.success("Shift deleted");
      fetchShifts();
    } catch (error) {
      toast.error("Failed to delete shift");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link to="/production?section=Manufacturing%20Masters%20%26%20Setup" className="btn btn-secondary p-2">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-900 dark:text-brand-300">Shift Management</h1>
            <p className="text-slate-500 text-sm">Configure work timings for production scheduling</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setCurrentShift({ shift_name: "", start_time: "08:00", end_time: "17:00" });
            setShowModal(true);
          }}
          className="btn-success flex items-center gap-2"
        >
          <Plus size={20} />
          Create Shift
        </button>
      </div>

            {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Factory Shifts",
            val: (shifts || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Factory Shifts",
            val: (shifts || []).length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Factory Shifts",
            val: (shifts || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "PENDING_APPROVAL").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Factory Shifts",
            val: (shifts || []).filter((x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "POSTED").length,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600 text-white",
          },
        ].map((stat, i) => (
          <div key={i} className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {stat.val}
              </p>
            </div>
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md ${stat.color}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden shadow-sm">
        
                <div className="flex justify-end mb-4">
                  <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                </div>
                <div className="overflow-x-auto">
          <table className={"table " + (viewMode === 'grid' ? 'table-grid-mode' : '')}>
            <thead>
              <tr>
                <th>Shift Name</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Loading shifts...</td>
                </tr>
              ) : items.length > 0 ? items.map((item) => (
                <tr key={item.id} className="group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-brand-600">
                        <Calendar size={18} />
                      </div>
                      <span className="font-bold text-brand-700 dark:text-brand-300">{item.shift_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                      <Clock size={14} className="opacity-50" />
                      {item.start_time}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
                      <Clock size={14} className="opacity-50" />
                      {item.end_time}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => {
                          setCurrentShift(item);
                          setShowModal(true);
                        }}
                        className="p-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Clock size={48} className="opacity-20" />
                      <p className="font-medium">No shifts configured</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center text-slate-900 dark:text-white">
              <h2 className="text-xl font-bold">
                {currentShift.id ? 'Edit Shift' : 'New Shift'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">Shift Name</label>
                <input 
                  type="text" 
                  required
                  className="input py-3 w-full"
                  value={currentShift.shift_name}
                  onChange={e => setCurrentShift({...currentShift, shift_name: e.target.value})}
                  placeholder="e.g. Morning Shift, Night Shift..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">Start Time</label>
                  <input 
                    type="time" 
                    required
                    className="input py-3 w-full font-bold"
                    value={currentShift.start_time}
                    onChange={e => setCurrentShift({...currentShift, start_time: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">End Time</label>
                  <input 
                    type="time" 
                    required
                    className="input py-3 w-full font-bold"
                    value={currentShift.end_time}
                    onChange={e => setCurrentShift({...currentShift, end_time: e.target.value})}
                  />
                </div>
              </div>
              <div className="pt-2 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary flex-1 py-3"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="btn-success flex-1 py-3 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  Save Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
