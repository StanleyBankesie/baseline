/**
 * @fileoverview ContractorVendorManagementPage
 * Facilities & Maintenance Management - Contractor & Supplier Contracts and SLAs
 * Replaces the old vendor directory with full supplier contract and SLA management
 * modeled after Maintenance Contracts, with Property/Assets/equipment Covered selection.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Handshake, Plus, ArrowLeft, Building2, Phone, Mail, Award, Clock,
  ShieldCheck, DollarSign, Eye, FileText, Edit, Trash2, Search, Filter,
  RefreshCw, Upload, X, AlertTriangle, CheckCircle2, Wrench, Layers
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

const statusColors = {
  ACTIVE:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  PENDING:   "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  EXPIRED:   "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  CANCELLED: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

const STATUSES = ["ACTIVE", "PENDING", "EXPIRED", "CANCELLED"];

const getInitialContractForm = () => ({
  contract_no: "",
  supplier_id: "",
  supplier_name: "",
  start_date: "",
  end_date: "",
  contract_value: "",
  payment_terms: "",
  renewal_alert_days: "",
  status: "ACTIVE",
  scope: "",
  notes: "",
  contract_file_url: "",
  contract_file_name: "",
  covered_items: [{ item_type: "PROPERTY", item_id: "", item_name: "" }],
});

export default function ContractorVendorManagementPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [contracts, setContracts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Filters & search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modals
  const [showContractModal, setShowContractModal] = useState(false);
  const [viewingContract, setViewingContract] = useState(null);
  const [editingContractId, setEditingContractId] = useState(null);
  const [contractForm, setContractForm] = useState(getInitialContractForm());

  const todayIso = new Date().toISOString().slice(0, 10);

  // ─── Data Fetching ───────────────────────────────────────────────────────────
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [contractsRes, propRes, eqRes, supRes, catRes] = await Promise.all([
        api.get("/maintenance/contracts").catch(() => ({ data: { items: [] } })),
        api.get("/facilities/properties").catch(() => ({ data: { data: [] } })),
        api.get("/maintenance/equipment").catch(() => ({ data: { items: [] } })),
        api.get("/purchase/suppliers?contractor=Y").catch(() => ({ data: { items: [] } })),
        api.get("/maintenance/setup/catalog").catch(() => ({ data: { catalogs: {} } })),
      ]);

      const contractsList = Array.isArray(contractsRes.data?.items) ? contractsRes.data.items : [];
      const propList = Array.isArray(propRes.data?.data) ? propRes.data.data : [];
      const eqList = Array.isArray(eqRes.data?.items) ? eqRes.data.items : [];

      // Combine suppliers from purchase/suppliers and maintenance catalogs
      const purSuppliers = Array.isArray(supRes.data?.items) ? supRes.data.items : [];
      const catalogSuppliers = catRes.data?.catalogs?.serviceProviders || [];

      const combinedSuppliersMap = new Map();
      purSuppliers.forEach((s) => {
        combinedSuppliersMap.set(String(s.id), { id: s.id, supplier_name: s.supplier_name || s.name });
      });
      catalogSuppliers.forEach((p) => {
        if (!combinedSuppliersMap.has(String(p.id))) {
          combinedSuppliersMap.set(String(p.id), { id: p.id, supplier_name: p.item_name });
        }
      });

      setContracts(contractsList);
      setProperties(propList);
      setEquipment(eqList);
      setSuppliers(Array.from(combinedSuppliersMap.values()));
    } catch (err) {
      console.error("fetchAllData error:", err);
      toast.error("Failed to load contracts data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ─── Handlers for Form ───────────────────────────────────────────────────────
  const updateForm = (k, v) => setContractForm((p) => ({ ...p, [k]: v }));

  const handleSupplierSelect = (supId) => {
    const found = suppliers.find((s) => String(s.id) === String(supId));
    setContractForm((f) => ({
      ...f,
      supplier_id: supId,
      supplier_name: found ? found.supplier_name : f.supplier_name,
    }));
  };

  // Property/Assets/equipment Covered items management
  const addCoveredItem = () => {
    setContractForm((f) => ({
      ...f,
      covered_items: [...f.covered_items, { item_type: "PROPERTY", item_id: "", item_name: "" }],
    }));
  };

  const removeCoveredItem = (index) => {
    setContractForm((f) => ({
      ...f,
      covered_items: f.covered_items.filter((_, idx) => idx !== index),
    }));
  };

  const updateCoveredItem = (index, compositeVal) => {
    // compositeVal is formatted as "prop-<id>" or "eq-<id>"
    if (!compositeVal) {
      setContractForm((f) => {
        const next = [...f.covered_items];
        next[index] = { item_type: "", item_id: "", item_name: "" };
        return { ...f, covered_items: next };
      });
      return;
    }

    const [type, rawId] = compositeVal.split("-");
    let name = "";
    if (type === "prop") {
      const p = properties.find((x) => String(x.id) === String(rawId));
      name = p ? `[Property] ${p.property_name}` : `Property #${rawId}`;
    } else {
      const eq = equipment.find((x) => String(x.id) === String(rawId));
      name = eq ? `[Asset] ${eq.equipment_name}` : `Asset #${rawId}`;
    }

    setContractForm((f) => {
      const next = [...f.covered_items];
      next[index] = {
        item_type: type === "prop" ? "PROPERTY" : "ASSET",
        item_id: rawId,
        item_name: name,
      };
      return { ...f, covered_items: next };
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/upload", fd);
      const data = res.data;
      updateForm("contract_file_url", data.url || data.path);
      updateForm("contract_file_name", data.filename || file.name);
      toast.success("Contract agreement uploaded successfully");
    } catch (err) {
      toast.error(err?.response?.data?.message || "File upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openNewContractModal = () => {
    setEditingContractId(null);
    setContractForm(getInitialContractForm());
    setShowContractModal(true);
  };

  const openEditContractModal = async (contractId) => {
    setEditingContractId(contractId);
    try {
      const res = await api.get(`/maintenance/contracts/${contractId}`);
      const item = res.data?.item || {};
      const covered = Array.isArray(res.data?.assets) && res.data.assets.length > 0
        ? res.data.assets.map((a) => ({
            item_type: "ASSET",
            item_id: a.asset_id,
            item_name: a.asset_name || `Asset #${a.asset_id}`,
          }))
        : [{ item_type: "PROPERTY", item_id: "", item_name: "" }];

      setContractForm({
        ...getInitialContractForm(),
        ...item,
        start_date: (item.start_date || "").slice(0, 10),
        end_date: (item.end_date || "").slice(0, 10),
        covered_items: covered,
      });
      setShowContractModal(true);
    } catch {
      toast.error("Failed to load contract details");
    }
  };

  const handleSaveContract = async (e) => {
    e.preventDefault();
    if (!contractForm.supplier_id && !contractForm.supplier_name.trim()) {
      toast.warn("Please select or specify a contractor / supplier");
      return;
    }
    if (!contractForm.contract_no.trim()) {
      toast.warn("Please enter a contract reference number");
      return;
    }

    setSubmitting(true);
    try {
      // Map covered_items into the assets format expected by backend maint_contract_assets
      const mappedAssets = contractForm.covered_items
        .filter((ci) => ci.item_id)
        .map((ci) => ({
          asset_id: ci.item_id,
          asset_name: ci.item_name,
        }));

      const payload = {
        ...contractForm,
        assets: mappedAssets,
      };

      if (editingContractId) {
        await api.put(`/maintenance/contracts/${editingContractId}`, payload);
        toast.success("Supplier contract updated successfully!");
      } else {
        await api.post("/maintenance/contracts", payload);
        toast.success("Supplier contract registered successfully!");
      }
      setShowContractModal(false);
      fetchAllData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save contract");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteContract = async (id) => {
    if (!window.confirm("Are you sure you want to delete this contractor agreement?")) return;
    try {
      await api.delete(`/maintenance/contracts/${id}`);
      toast.success("Contract deleted");
      fetchAllData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete contract");
    }
  };

  // Expiry check
  const isNearExpiry = (endDate, alertDays = 30) => {
    if (!endDate) return false;
    const diff = (new Date(endDate) - new Date(todayIso)) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= alertDays;
  };

  // Filtered rows
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (statusFilter && String(c.status).toUpperCase() !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          String(c.contract_no || "").toLowerCase().includes(q) ||
          String(c.supplier_name || "").toLowerCase().includes(q) ||
          String(c.scope || "").toLowerCase().includes(q) ||
          String(c.asset_names || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [contracts, statusFilter, search]);

  // Aggregate stats
  const totalContracts = contracts.length;
  const activeContracts = contracts.filter((c) => c.status === "ACTIVE").length;
  const expiringSoon = contracts.filter((c) => c.status === "ACTIVE" && isNearExpiry(c.end_date, c.renewal_alert_days || 30)).length;
  const totalValue = contracts.reduce((sum, c) => sum + (parseFloat(c.contract_value) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl"
            title="Go Back"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Handshake className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Contractor &amp; Supplier Service Contracts &amp; SLAs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Service contracts, SLA targets, insurance coverage, and covered properties, assets and equipment.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openNewContractModal}
          className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm active:scale-95"
        >
          <Plus size={15} /> New Supplier Contract
        </button>
      </div>

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Contracts</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalContracts}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Active SLAs</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeContracts}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Expiring in 30 Days</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{expiringSoon}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Contract Value</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter size={13} />
            <span className="text-xs font-semibold text-slate-500">Filters</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="flex-1 min-w-[240px] relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search contract no, supplier name, scope, or covered property/asset..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-3 py-1.5 text-xs text-slate-700 dark:text-slate-200"
            />
          </div>
          <button
            type="button"
            onClick={fetchAllData}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Contracts Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Contract Ref</th>
                <th className="px-3 py-3">Contractor / Supplier</th>
                <th className="px-3 py-3">Property / Assets / Equipment Covered</th>
                <th className="px-3 py-3">Start Date</th>
                <th className="px-3 py-3">End Date</th>
                <th className="px-3 py-3 text-right">Contract Value</th>
                <th className="px-3 py-3">Payment Terms</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400">Loading supplier contracts…</td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400 italic">
                    No supplier contracts found. Click &quot;New Supplier Contract&quot; above to register an agreement.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => {
                  const nearExpiry = isNearExpiry(c.end_date, c.renewal_alert_days);
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                        nearExpiry ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {c.contract_no}
                      </td>
                      <td className="px-3 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                        {c.supplier_name}
                      </td>
                      <td className="px-3 py-3 max-w-[260px] truncate text-slate-700 dark:text-slate-300">
                        {c.asset_names ? (
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                            <Layers size={10} className="text-emerald-500" />
                            {c.asset_names}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Entire Property / Portfolio</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {c.start_date ? String(c.start_date).slice(0, 10) : "—"}
                      </td>
                      <td className="px-3 py-3 font-mono">
                        <span className={c.end_date < todayIso ? "text-rose-600 font-bold" : nearExpiry ? "text-amber-600 font-bold" : "text-slate-600 dark:text-slate-400"}>
                          {c.end_date ? String(c.end_date).slice(0, 10) : "—"}
                        </span>
                        {nearExpiry && (
                          <span className="block text-[10px] text-amber-500 flex items-center gap-0.5 mt-0.5">
                            <AlertTriangle size={9} /> Expiring Soon
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-right font-bold text-slate-900 dark:text-white">
                        ${parseFloat(c.contract_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{c.payment_terms || "30 days"}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[String(c.status).toUpperCase()] || "bg-slate-100 text-slate-600"}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setViewingContract(c)}
                            className="btn btn-secondary text-xs px-2 py-1 inline-flex items-center gap-1"
                            title="View Contract"
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditContractModal(c.id)}
                            className="btn btn-secondary text-xs px-2 py-1 inline-flex items-center gap-1"
                            title="Edit Contract"
                          >
                            <Edit size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContract(c.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete Contract"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: NEW / EDIT CONTRACT
      ══════════════════════════════════════════════════════════════════════ */}
      {showContractModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Handshake size={18} className="text-emerald-600" />
                {editingContractId ? "Edit Supplier Contract & SLA" : "Register Supplier Contract & SLA"}
              </h3>
              <button
                type="button"
                onClick={() => setShowContractModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveContract} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Contract Number / Ref *
                  </label>
                  <input
                    type="text"
                    value={contractForm.contract_no}
                    onChange={(e) => updateForm("contract_no", e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Service Contractor / Supplier *
                  </label>
                  <select
                    value={contractForm.supplier_id}
                    onChange={(e) => handleSupplierSelect(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Select Contractor / Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.supplier_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Start Date *</label>
                  <input
                    type="date"
                    value={contractForm.start_date}
                    onChange={(e) => updateForm("start_date", e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">End Date *</label>
                  <input
                    type="date"
                    value={contractForm.end_date}
                    onChange={(e) => updateForm("end_date", e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Contract Value ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={contractForm.contract_value}
                    onChange={(e) => updateForm("contract_value", e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Payment Terms</label>
                  <input
                    type="text"
                    value={contractForm.payment_terms}
                    onChange={(e) => updateForm("payment_terms", e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={contractForm.status}
                    onChange={(e) => updateForm("status", e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Expiry Alert (Days Before)</label>
                  <input
                    type="number"
                    min="1"
                    value={contractForm.renewal_alert_days}
                    onChange={(e) => updateForm("renewal_alert_days", e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* ── FIELD: Property/Assets/equipment Covered ── */}
              <div className="space-y-2 pt-1 pb-1">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300">
                      Property/Assets/equipment Covered *
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Select properties and equipment/assets covered under this service agreement and SLA.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addCoveredItem}
                    className="btn btn-secondary inline-flex items-center gap-1 text-xs py-1 px-2.5"
                  >
                    <Plus size={13} /> Add Covered Item
                  </button>
                </div>

                <div className="space-y-2">
                  {contractForm.covered_items.map((ci, idx) => {
                    const currentVal = ci.item_id ? (ci.item_type === "PROPERTY" ? `prop-${ci.item_id}` : `eq-${ci.item_id}`) : "";
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={currentVal}
                          onChange={(e) => updateCoveredItem(idx, e.target.value)}
                          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-- Select Property or Equipment / Asset --</option>
                          <optgroup label="🏢 Properties">
                            {properties.map((p) => (
                              <option key={`p-${p.id}`} value={`prop-${p.id}`}>
                                [Property] {p.property_name} ({p.property_type || "Commercial"})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="⚙️ Assets &amp; Equipment">
                            {equipment.map((eq) => (
                              <option key={`e-${eq.id}`} value={`eq-${eq.id}`}>
                                [Asset] {eq.equipment_name} {eq.equipment_code ? `(${eq.equipment_code})` : ""} - {eq.category || "General"}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        {contractForm.covered_items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCoveredItem(idx)}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Scope of Contract & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Scope of Contract &amp; SLA Requirements
                  </label>
                  <textarea
                    rows={3}
                    value={contractForm.scope}
                    onChange={(e) => updateForm("scope", e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Contract Notes &amp; Exclusions
                  </label>
                  <textarea
                    rows={3}
                    value={contractForm.notes}
                    onChange={(e) => updateForm("notes", e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Document Upload */}
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Signed Contract Document (PDF, DOCX)
                </label>
                <div className="flex items-center gap-2">
                  {contractForm.contract_file_url ? (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border rounded-xl flex-1">
                      <FileText size={15} className="text-emerald-600 shrink-0" />
                      <a
                        href={contractForm.contract_file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 hover:underline truncate flex-1 font-semibold"
                      >
                        {contractForm.contract_file_name || "View Uploaded Agreement"}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          updateForm("contract_file_url", "");
                          updateForm("contract_file_name", "");
                        }}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-2 px-3"
                  >
                    <Upload size={14} /> {uploading ? "Uploading…" : "Upload Agreement File"}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  {submitting ? "Saving Contract…" : "Save Supplier Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: VIEW CONTRACT DETAILS
      ══════════════════════════════════════════════════════════════════════ */}
      {viewingContract && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <div>
                <span className="font-mono text-[10px] text-slate-400 block">{viewingContract.contract_no}</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Handshake size={18} className="text-emerald-600" />
                  {viewingContract.supplier_name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingContract(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[11px]">Contractor / Supplier</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{viewingContract.supplier_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block mt-0.5 ${statusColors[String(viewingContract.status).toUpperCase()] || "bg-slate-100"}`}>
                    {viewingContract.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Start Date</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{String(viewingContract.start_date).slice(0, 10)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">End Date</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{String(viewingContract.end_date).slice(0, 10)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Contract Value</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ${parseFloat(viewingContract.contract_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Payment Terms</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{viewingContract.payment_terms || "30 days"}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Property / Assets / Equipment Covered:
                </span>
                <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                  {viewingContract.asset_names || "Entire Property Portfolio"}
                </div>
              </div>

              {viewingContract.scope && (
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Scope of Contract:</span>
                  <p className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                    {viewingContract.scope}
                  </p>
                </div>
              )}

              {viewingContract.contract_file_url && (
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">Agreement Document:</span>
                  <a
                    href={viewingContract.contract_file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl font-semibold hover:underline"
                  >
                    <FileText size={14} /> Download / View Document
                  </a>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewingContract(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
