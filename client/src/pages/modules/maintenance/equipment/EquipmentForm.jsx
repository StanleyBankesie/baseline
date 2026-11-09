/**
 * @fileoverview EquipmentForm component.
 * Unified Equipment & Maintenance Assets Register with Property, Assignee, Installation & Warranty tracking.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Building2, User, Calendar, ShieldCheck, Wrench, Tag } from "lucide-react";
import { toast } from "react-toastify";
import { api } from "../../../../api/client";
import { usePermission } from "@/auth/PermissionContext.jsx";

const STATUSES = ["ACTIVE", "INACTIVE", "UNDER_REPAIR", "DECOMMISSIONED"];

export default function EquipmentForm() {
  const { hasExceptional } = usePermission();
  const navigate = useNavigate();
  const location = useLocation();
  const isFacilities = location.pathname.startsWith("/facilities");
  const basePath = isFacilities ? "/facilities/equipment" : "/maintenance/equipment";
  const { id } = useParams();
  const isEdit = !!id;
  const readOnly = new URLSearchParams(location.search).get("mode") === "view";

  const [form, setForm] = useState({
    equipment_code: "",
    equipment_name: "",
    category: "",
    property_id: "",
    property_name: "",
    assigned_to_user_id: "",
    assigned_to_name: "",
    location: "",
    brand: "",
    manufacturer: "",
    model: "",
    serial_number: "",
    installation_date: "",
    purchase_date: "",
    warranty_expiry: "",
    status: "ACTIVE",
    notes: "",
  });

  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [equipCategories, setEquipCategories] = useState([]);
  const [catalog, setCatalog] = useState({
    locations: [],
    brands: [],
    categories: [],
    models: [],
    manufacturers: [],
  });

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    // 1. Fetch Maintenance Catalog (brands, models, locations, etc.)
    api
      .get("/maintenance/setup/catalog")
      .then((r) => {
        setCatalog(
          r.data?.catalogs || {
            locations: [],
            brands: [],
            categories: [],
            models: [],
            manufacturers: [],
          }
        );
      })
      .catch(() => {});

    // 2. Fetch Operational Setup Equipment Categories (seeded with System Categories)
    api
      .get("/facilities/setup/equipment-categories")
      .then((r) => {
        const list = r.data?.data || [];
        if (list.length > 0) {
          setEquipCategories(list);
        }
      })
      .catch(() => {});

    // 3. Fetch Properties
    api
      .get("/facilities/properties")
      .then((r) => setProperties(r.data?.data || []))
      .catch(() => {});

    // 4. Fetch System Users for Assignee / Responsible Tech
    api
      .get("/admin/users")
      .then((r) => {
        const raw = r.data;
        const list =
          raw?.data?.items ||
          raw?.items ||
          raw?.users ||
          (Array.isArray(raw?.data) ? raw.data : []) ||
          (Array.isArray(raw) ? raw : []);
        setUsers(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let m = true;
    if (isEdit) {
      api
        .get(`/maintenance/equipment/${id}`)
        .then((r) => {
          const item = r.data?.item || {};
          if (m) {
            setForm((p) => ({
              ...p,
              ...item,
              property_id: item.property_id || "",
              property_name: item.property_name || "",
              assigned_to_user_id: item.assigned_to_user_id ? String(item.assigned_to_user_id) : "",
              assigned_to_name: item.assigned_to_name || "",
              installation_date: (item.installation_date || "").slice(0, 10),
              purchase_date: (item.purchase_date || "").slice(0, 10),
              warranty_expiry: (item.warranty_expiry || "").slice(0, 10),
            }));
          }
        })
        .catch(() => toast.error("Failed to load equipment"));
    }
    return () => {
      m = false;
    };
  }, [id, isEdit]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.equipment_name) {
      toast.error("Equipment name is required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/maintenance/equipment/${id}`, form);
        toast.success("Equipment updated successfully");
      } else {
        await api.post("/maintenance/equipment", form);
        toast.success("Equipment created successfully");
      }
      navigate(basePath, { state: { refresh: true } });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // Combined categories list (setup equipment categories prioritized, with catalog categories as fallback)
  const categoryOptions = equipCategories.length > 0
    ? equipCategories.map((c) => ({ id: c.id, name: c.item_name || c.category_name }))
    : (catalog.categories || []).map((c) => ({ id: c.id, name: c.item_name }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link to={basePath} className="btn btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3">
          <ArrowLeft size={16} /> Back
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wrench size={22} className="text-brand-600 dark:text-brand-400" />
            {readOnly ? "View" : isEdit ? "Edit" : "New"} Equipment & Asset
          </h1>
          <p className="text-xs sm:text-sm mt-0.5 text-slate-500 dark:text-slate-400">
            Register and manage equipment, assets, property location, responsible technicians, and lifecycle warranties
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={readOnly} className="space-y-6">
          {/* Card 1: Core Equipment Details */}
          <div className="card shadow-xs border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="card-header bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Tag size={16} className="text-brand-600 dark:text-brand-400" />
              General Equipment & Identification
            </div>
            <div className="card-body p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Asset Code / Tag</label>
                <input
                  className="input w-full"
                  value={form.equipment_code}
                  onChange={(e) => update("equipment_code", e.target.value)}
                  placeholder="e.g. ELEV-PASSENGER-01"
                />
              </div>

              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Asset / Equipment Name <span className="text-rose-500">*</span>
                </label>
                <input
                  className="input w-full"
                  value={form.equipment_name}
                  onChange={(e) => update("equipment_name", e.target.value)}
                  placeholder="e.g. Passenger Elevator Tower A (16-Stop)"
                  required
                />
              </div>

              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Asset Category <span className="text-rose-500">*</span>
                </label>
                <select
                  className="input w-full"
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  required
                >
                  <option value="">-- Select Category --</option>
                  {categoryOptions.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Brand</label>
                <select
                  className="input w-full"
                  value={form.brand}
                  onChange={(e) => update("brand", e.target.value)}
                >
                  <option value="">-- Select Brand --</option>
                  {catalog.brands.map((b) => (
                    <option key={b.id} value={b.item_name}>
                      {b.item_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Manufacturer</label>
                <select
                  className="input w-full"
                  value={form.manufacturer}
                  onChange={(e) => update("manufacturer", e.target.value)}
                >
                  <option value="">-- Select Manufacturer --</option>
                  {(catalog.manufacturers || []).map((m) => (
                    <option key={m.id} value={m.item_name}>
                      {m.item_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Model</label>
                <select
                  className="input w-full"
                  value={form.model}
                  onChange={(e) => update("model", e.target.value)}
                >
                  <option value="">-- Select Model --</option>
                  {(catalog.models || []).map((m) => (
                    <option key={m.id} value={m.item_name}>
                      {m.item_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Serial Number</label>
                <input
                  className="input w-full"
                  value={form.serial_number}
                  onChange={(e) => update("serial_number", e.target.value)}
                  placeholder="e.g. SN-98234-OTIS"
                />
              </div>

              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Operational Status</label>
                <select
                  className="input w-full"
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Specific Room / Location</label>
                <input
                  className="input w-full"
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="e.g. Main Lobby Shaft B"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Property & Assignment */}
          <div className="card shadow-xs border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="card-header bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Building2 size={16} className="text-emerald-600 dark:text-emerald-400" />
              Property & Assigned Personnel
            </div>
            <div className="card-body p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Property Selector */}
              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Building2 size={13} className="text-emerald-500" />
                  Property <span className="text-rose-500">*</span>
                </label>
                <select
                  className="input w-full"
                  value={form.property_id || ""}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const p = properties.find((x) => String(x.id) === String(selId));
                    update("property_id", selId ? Number(selId) : "");
                    update("property_name", p ? p.property_name : "");
                  }}
                  required
                >
                  <option value="">-- Select Target Property --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.property_name} ({p.property_code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Populated directly from registered facilities properties</p>
              </div>

              {/* Assignee / Responsible Tech */}
              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <User size={13} className="text-purple-500" />
                  Assignee (Responsible User / Tech)
                </label>
                <select
                  className="input w-full"
                  value={form.assigned_to_user_id || ""}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const u = users.find((x) => String(x.id) === String(selId));
                    update("assigned_to_user_id", selId ? Number(selId) : "");
                    update("assigned_to_name", u ? (u.full_name || u.username || u.name) : "");
                  }}
                >
                  <option value="">-- Choose Assigned User / Tech --</option>
                  {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.full_name || u.username || u.name || `User #${u.id}`} {u.role_name ? `• ${u.role_name}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Engineer or technician responsible for system service lifecycle</p>
              </div>
            </div>
          </div>

          {/* Card 3: Installation, Purchase & Warranty */}
          <div className="card shadow-xs border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="card-header bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
              Installation & Warranty Dates
            </div>
            <div className="card-body p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar size={13} className="text-blue-500" />
                  Installation Date
                </label>
                <input
                  className="input w-full"
                  type="date"
                  value={form.installation_date || ""}
                  onChange={(e) => update("installation_date", e.target.value)}
                  disabled={readOnly || (isEdit && !hasExceptional("DOCUMENT.EDIT_DATE"))}
                />
              </div>

              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-500" />
                  Purchase Date
                </label>
                <input
                  className="input w-full"
                  type="date"
                  value={form.purchase_date || ""}
                  onChange={(e) => update("purchase_date", e.target.value)}
                  disabled={readOnly || (isEdit && !hasExceptional("DOCUMENT.EDIT_DATE"))}
                />
              </div>

              <div>
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  Warranty Expiry Date
                </label>
                <input
                  className="input w-full"
                  type="date"
                  value={form.warranty_expiry || ""}
                  onChange={(e) => update("warranty_expiry", e.target.value)}
                  disabled={readOnly || (isEdit && !hasExceptional("DOCUMENT.EDIT_DATE"))}
                />
              </div>

              <div className="col-span-full">
                <label className="label font-semibold text-slate-700 dark:text-slate-300 mb-1 block">Maintenance & Operating Notes</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={form.notes || ""}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="Service requirements, operating capacity, OEM manual references..."
                />
              </div>
            </div>
          </div>
        </fieldset>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-2">
          <button type="button" onClick={() => window.history.back()} className="btn btn-secondary text-xs py-2 px-4">
            Cancel
          </button>
          {!readOnly && (
            <button type="submit" className="btn btn-primary text-xs py-2 px-5 shadow-sm active:scale-95" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Update Equipment & Asset" : "Save Equipment & Asset"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
