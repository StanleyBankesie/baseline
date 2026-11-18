import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Tag,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  DollarSign,
  Layers,
  Percent,
  Sliders,
  ChevronRight,
  Info,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

export const COLOR_OPTIONS = [
  { value: "amber", label: "Amber / Gold", bg: "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700" },
  { value: "blue", label: "Sky Blue", bg: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700" },
  { value: "purple", label: "Purple", bg: "bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700" },
  { value: "emerald", label: "Emerald Green", bg: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700" },
  { value: "cyan", label: "Cyan / Teal", bg: "bg-cyan-100 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700" },
  { value: "indigo", label: "Indigo", bg: "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700" },
  { value: "orange", label: "Orange", bg: "bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700" },
  { value: "rose", label: "Rose / Red", bg: "bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700" },
  { value: "slate", label: "Slate / Gray", bg: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-600" },
];

export const COST_TYPES = [
  { value: "DIRECT", label: "Direct Project Cost" },
  { value: "INDIRECT", label: "Indirect Project Cost" },
  { value: "OVERHEAD", label: "Overhead & Administrative" },
  { value: "SUBCONTRACTOR", label: "Subcontractor / Specialist" },
  { value: "EQUIPMENT", label: "Plant & Equipment" },
  { value: "OTHER", label: "Other / Sundry" },
];

export function getCategoryBadgeClasses(colorCode) {
  const match = COLOR_OPTIONS.find((c) => c.value === colorCode);
  return match
    ? match.bg
    : "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700";
}

export default function CostCategoryPage({ embedded = false }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    category_code: "",
    category_name: "",
    description: "",
    cost_type: "DIRECT",
    color_code: "blue",
    default_overhead_percent: 0,
    default_profit_percent: 0,
    is_active: "Y",
    sort_order: 0,
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/construction/cost-categories");
      setCategories(res.data?.items || []);
    } catch (err) {
      toast.error("Failed to load cost categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setForm({
      category_code: "",
      category_name: "",
      description: "",
      cost_type: "DIRECT",
      color_code: "blue",
      default_overhead_percent: 0,
      default_profit_percent: 0,
      is_active: "Y",
      sort_order: categories.length + 1,
    });
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setForm({
      category_code: cat.category_code,
      category_name: cat.category_name,
      description: cat.description || "",
      cost_type: cat.cost_type || "DIRECT",
      color_code: cat.color_code || "blue",
      default_overhead_percent: Number(cat.default_overhead_percent || 0),
      default_profit_percent: Number(cat.default_profit_percent || 0),
      is_active: cat.is_active || "Y",
      sort_order: cat.sort_order || 0,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.category_code || !form.category_name) {
      toast.warning("Category code and name are required");
      return;
    }

    try {
      setSaving(true);
      if (editingCategory) {
        await api.put(`/construction/cost-categories/${editingCategory.id}`, form);
        toast.success("Cost category updated successfully");
      } else {
        await api.post("/construction/cost-categories", form);
        toast.success("Cost category created successfully");
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to save category";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete cost category "${cat.category_name}" (${cat.category_code})?`)) {
      return;
    }
    try {
      await api.delete(`/construction/cost-categories/${cat.id}`);
      toast.success("Cost category removed");
      fetchCategories();
    } catch (err) {
      toast.error("Failed to delete cost category");
    }
  };

  const handleToggleStatus = async (cat) => {
    try {
      const newStatus = cat.is_active === "Y" ? "N" : "Y";
      await api.put(`/construction/cost-categories/${cat.id}`, {
        ...cat,
        is_active: newStatus,
      });
      toast.success(`Category ${newStatus === "Y" ? "activated" : "deactivated"}`);
      fetchCategories();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (filterType !== "ALL" && c.cost_type !== filterType) return false;
      if (filterStatus !== "ALL" && c.is_active !== filterStatus) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const code = (c.category_code || "").toLowerCase();
        const name = (c.category_name || "").toLowerCase();
        const desc = (c.description || "").toLowerCase();
        return code.includes(q) || name.includes(q) || desc.includes(q);
      }
      return true;
    });
  }, [categories, filterType, filterStatus, search]);

  return (
    <div className={embedded ? "space-y-5" : "p-6 max-w-7xl mx-auto space-y-6"}>
      {/* Top Banner if standalone */}
      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              to="/project-management/setup"
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Back to Operations Setup"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                  <Tag size={20} />
                </div>
                <h1 className="text-2xl font-bold font-extrabold text-slate-900 dark:text-white">
                  Project Cost Categories
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure expense categories used in Project Costing, Budget Estimation, Rate Analysis and BOQ Schedules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/project-management/costing"
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <Layers size={15} /> Project Costing
            </Link>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus size={16} /> New Cost Category
            </button>
          </div>
        </div>
      )}

      {/* Embedded Header toolbar */}
      {embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Tag size={18} className="text-brand-600 dark:text-brand-400" />
              Cost Categories Configuration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Categories set here populate directly into Project Costing & Budget Estimation schedules and Rate Analysis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/project-management/costing"
              className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition flex items-center gap-1"
            >
              <Layers size={14} /> Open Costing Page
            </Link>
            <button
              onClick={openCreateModal}
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-1.5"
            >
              <Plus size={15} /> Add Cost Category
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by code, category name, or description..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Type:</span>
            <select
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">All Cost Types</option>
              {COST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            <select
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="Y">Active Only</option>
              <option value="N">Inactive Only</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {filteredCategories.length} Categories
          </span>
          
        </div>
      </div>

      {/* Categories Table Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 w-12 text-center">#</th>
                <th className="p-3 w-36">Category Code</th>
                <th className="p-3 min-w-[200px]">Category Name</th>
                <th className="p-3 w-36">Cost Type</th>
                <th className="p-3 w-28 text-center">Badge Color</th>
                <th className="p-3 w-28 text-right">Default Overhead</th>
                <th className="p-3 w-28 text-right">Default Profit</th>
                <th className="p-3 w-24 text-center">Status</th>
                <th className="p-3 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredCategories.map((cat, idx) => {
                const colorMatch = COLOR_OPTIONS.find((c) => c.value === cat.color_code) || COLOR_OPTIONS[1];
                const typeMatch = COST_TYPES.find((t) => t.value === cat.cost_type) || COST_TYPES[0];
                return (
                  <tr
                    key={cat.id || idx}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-850/60 transition-colors"
                  >
                    <td className="p-3 text-center text-slate-400 font-normal">
                      {idx + 1}
                    </td>

                    <td className="p-3">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {cat.category_code}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {cat.category_name}
                      </div>
                      {cat.description && (
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-1 mt-0.5">
                          {cat.description}
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {typeMatch.label}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${colorMatch.bg}`}
                      >
                        {cat.category_code}
                      </span>
                    </td>

                    <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {Number(cat.default_overhead_percent || 0).toFixed(1)}%
                    </td>

                    <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {Number(cat.default_profit_percent || 0).toFixed(1)}%
                    </td>

                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(cat)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition flex items-center justify-center gap-1 mx-auto ${
                          cat.is_active === "Y"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-slate-100 text-slate-500 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                        }`}
                        title="Click to toggle status"
                      >
                        {cat.is_active === "Y" ? (
                          <>
                            <CheckCircle size={12} /> Active
                          </>
                        ) : (
                          <>
                            <XCircle size={12} /> Inactive
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                          title="Edit Category"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Delete Category"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredCategories.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <Info size={28} className="mx-auto mb-2 text-slate-400" />
                    No cost categories match your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Cost Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <Tag size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingCategory ? "Edit Cost Category" : "New Cost Category"}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Defines how items are classified in Project Costing and Rate Analysis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Category Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingCategory}
                    placeholder="e.g. LABOUR, PRELIM"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono uppercase font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                    value={form.category_code}
                    onChange={(e) =>
                      setForm({ ...form, category_code: e.target.value.toUpperCase() })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Cost Type *
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.cost_type}
                    onChange={(e) => setForm({ ...form, cost_type: e.target.value })}
                  >
                    {COST_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Category Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Personnel & Direct Labour"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={form.category_name}
                  onChange={(e) => setForm({ ...form, category_name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Description / Inclusions
                </label>
                <textarea
                  rows={2}
                  placeholder="Scope inclusions, work types, or trade categories..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Badge Color Theme
                  </label>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={form.color_code}
                    onChange={(e) => setForm({ ...form, color_code: e.target.value })}
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Badge Preview
                  </label>
                  <div className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-center">
                    <span
                      className={`px-3 py-0.5 rounded-md text-xs font-bold border ${getCategoryBadgeClasses(
                        form.color_code
                      )}`}
                    >
                      {form.category_code || "CODE"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Default Overhead (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={form.default_overhead_percent}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          default_overhead_percent: Number(e.target.value),
                        })
                      }
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Default Profit Margin (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={form.default_profit_percent}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          default_profit_percent: Number(e.target.value),
                        })
                      }
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    checked={form.is_active === "Y"}
                    onChange={(e) =>
                      setForm({ ...form, is_active: e.target.checked ? "Y" : "N" })
                    }
                  />
                  <span>Active in Project Costing & Rate Analysis</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50"
                  >
                    {saving ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
