/**
 * @fileoverview TenantOccupancyPage
 * Standalone page for Tenant Leases & Occupancy Register in Facilities Management.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Users, Plus, ArrowLeft, Building2, Phone, Mail, DollarSign,
  Calendar, CheckCircle2, Filter, Search, RefreshCw, Eye, Trash2
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

const statusBadge = (status) => {
  const map = {
    ACTIVE_OCCUPIED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    VACATED:         "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    NOTICE_GIVEN:    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  };
  return map[status] || "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
};

const getInitialTenantForm = () => ({
  property_id: "",
  tenant_name: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  allocated_space_sqm: 100,
  occupied_rooms_or_units: "",
  headcount: 5,
  lease_start_date: new Date().toISOString().slice(0, 10),
  lease_end_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  monthly_service_charge: 1500,
  occupancy_status: "ACTIVE_OCCUPIED",
});

export default function TenantOccupancyPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ propertyId: "", search: "" });

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [viewingTenant, setViewingTenant] = useState(null);
  const [form, setForm] = useState(getInitialTenantForm());

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get("/facilities/properties");
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setProperties(list);
      if (list.length > 0) {
        setForm((f) => ({ ...f, property_id: f.property_id || list[0].id }));
      }
    } catch (e) {
      console.warn("fetchProperties error:", e);
    }
  }, []);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/facilities/space/tenants");
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setTenants(list);
    } catch (err) {
      console.error("fetchTenants error:", err);
      toast.error(err?.response?.data?.message || "Failed to load tenant occupancy register");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
    fetchTenants();
  }, [fetchProperties, fetchTenants]);

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    if (!form.property_id || !form.tenant_name.trim()) {
      toast.warn("Please enter tenant name and select a property.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/facilities/space/tenants", form);
      toast.success("Tenant registered successfully!");
      setShowModal(false);
      setForm(getInitialTenantForm());
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to register tenant");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (filters.propertyId && String(t.property_id) !== String(filters.propertyId)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          (t.tenant_name && t.tenant_name.toLowerCase().includes(q)) ||
          (t.contact_person && t.contact_person.toLowerCase().includes(q)) ||
          (t.contact_email && t.contact_email.toLowerCase().includes(q)) ||
          (t.occupied_rooms_or_units && t.occupied_rooms_or_units.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [tenants, filters]);

  // Aggregate metrics
  const totalTenants = tenants.length;
  const totalAllocatedSqm = tenants.reduce((sum, t) => sum + (parseFloat(t.allocated_space_sqm) || 0), 0);
  const totalHeadcount = tenants.reduce((sum, t) => sum + (parseInt(t.headcount) || 0), 0);
  const totalMonthlyCharge = tenants.reduce((sum, t) => sum + (parseFloat(t.monthly_service_charge) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
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
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <span className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <Users size={18} />
              </span>
              Tenant Occupancy Register
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Corporate and individual tenant leases, occupied units, headcount, allocated area, and monthly service charges.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/facilities/space-occupancy/bookings"
            className="btn btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
          >
            <Calendar size={14} /> Room Bookings
          </Link>
          <Link
            to="/facilities/setup?tab=spaces"
            className="btn btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
          >
            <Building2 size={14} /> Space &amp; Unit Setup
          </Link>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm active:scale-95 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Plus size={15} /> Register Tenant
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Active Tenants</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalTenants}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Leased Space</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalAllocatedSqm.toLocaleString()} m²</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Tenant Headcount</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalHeadcount} Staff</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Monthly Service Revenue</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">${totalMonthlyCharge.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter size={13} />
            <span className="text-xs font-semibold text-slate-500">Filters</span>
          </div>
          <select
            value={filters.propertyId}
            onChange={(e) => setFilters((f) => ({ ...f, propertyId: e.target.value }))}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.property_name}</option>
            ))}
          </select>
          <div className="flex-1 min-w-[220px] relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenant name, contact person, or unit..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-3 py-1.5 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={fetchTenants}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Tenant Name</th>
                <th className="px-3 py-3">Property</th>
                <th className="px-3 py-3">Occupied Units</th>
                <th className="px-3 py-3">Key Contact</th>
                <th className="px-3 py-3 text-center">Allocated Area</th>
                <th className="px-3 py-3 text-center">Headcount</th>
                <th className="px-3 py-3">Lease Window</th>
                <th className="px-3 py-3 text-right">Monthly Charge</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400">Loading tenant register…</td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400 italic">No tenant records found.</td>
                </tr>
              ) : (
                filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 dark:text-white block">{t.tenant_name}</span>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200">{t.property_name || "—"}</td>
                    <td className="px-3 py-3 font-medium text-emerald-600 dark:text-emerald-400">{t.occupied_rooms_or_units || "—"}</td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-slate-800 dark:text-slate-200 block">{t.contact_person || "—"}</span>
                      <span className="text-[11px] text-slate-400 block">{t.contact_phone || t.contact_email || ""}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-center">{t.allocated_space_sqm} m²</td>
                    <td className="px-3 py-3 font-mono text-center">{t.headcount}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {String(t.lease_start_date).slice(0, 10)} to {String(t.lease_end_date).slice(0, 10)}
                    </td>
                    <td className="px-3 py-3 font-mono font-bold text-right text-slate-900 dark:text-white">
                      ${parseFloat(t.monthly_service_charge || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadge(t.occupancy_status)}`}>
                        {t.occupancy_status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setViewingTenant(t)}
                        className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                        title="View Tenant Details"
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register Tenant */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={18} className="text-emerald-600" />
                Register New Tenant
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateTenant} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Property *</label>
                  <select
                    value={form.property_id}
                    onChange={(e) => setForm((f) => ({ ...f, property_id: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                    required
                  >
                    <option value="">Select Property...</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.property_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Tenant / Company Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Global Logistics Ltd"
                    value={form.tenant_name}
                    onChange={(e) => setForm((f) => ({ ...f, tenant_name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Isaac Osei"
                    value={form.contact_person}
                    onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+233 24 123 4567"
                    value={form.contact_phone}
                    onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Contact Email</label>
                  <input
                    type="email"
                    placeholder="tenant@company.com"
                    value={form.contact_email}
                    onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Occupied Units / Suite</label>
                  <input
                    type="text"
                    placeholder="e.g. Suite 402, 4th Floor"
                    value={form.occupied_rooms_or_units}
                    onChange={(e) => setForm((f) => ({ ...f, occupied_rooms_or_units: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Allocated Area (m²)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.allocated_space_sqm}
                    onChange={(e) => setForm((f) => ({ ...f, allocated_space_sqm: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Headcount</label>
                  <input
                    type="number"
                    min="1"
                    value={form.headcount}
                    onChange={(e) => setForm((f) => ({ ...f, headcount: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Lease Start Date</label>
                  <input
                    type="date"
                    value={form.lease_start_date}
                    onChange={(e) => setForm((f) => ({ ...f, lease_start_date: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Lease End Date</label>
                  <input
                    type="date"
                    value={form.lease_end_date}
                    onChange={(e) => setForm((f) => ({ ...f, lease_end_date: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Monthly Charge ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.monthly_service_charge}
                    onChange={(e) => setForm((f) => ({ ...f, monthly_service_charge: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  {submitting ? "Registering…" : "Register Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {viewingTenant && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users size={18} className="text-emerald-600" />
                Tenant Lease Details
              </h3>
              <button
                type="button"
                onClick={() => setViewingTenant(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl space-y-2">
                <div>
                  <span className="text-slate-400 block text-[11px]">Tenant / Company</span>
                  <span className="font-bold text-slate-800 dark:text-white text-sm">{viewingTenant.tenant_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Property</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{viewingTenant.property_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Occupied Space</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{viewingTenant.occupied_rooms_or_units || "—"} ({viewingTenant.allocated_space_sqm} m²)</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contact Person</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{viewingTenant.contact_person || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Phone</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{viewingTenant.contact_phone || "—"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Headcount</span>
                    <span className="font-bold text-slate-800 dark:text-white">{viewingTenant.headcount} employees</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Monthly Charge</span>
                    <span className="font-mono font-bold text-emerald-600">${parseFloat(viewingTenant.monthly_service_charge || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Lease Term</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {String(viewingTenant.lease_start_date).slice(0, 10)} to {String(viewingTenant.lease_end_date).slice(0, 10)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingTenant(null)}
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
