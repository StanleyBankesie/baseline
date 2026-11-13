/**
 * @fileoverview TenantOccupancyPage
 * Standalone page for Tenant Leases & Occupancy Register in Facilities Management.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Users, Plus, ArrowLeft, Building2, Phone, Mail, DollarSign, Calendar, CheckCircle2, Filter, Search, RefreshCw, Eye, Trash2, Edit, Activity, Clock } from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

const statusBadge = (status) => {
  const map = {
    ACTIVE_OCCUPIED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    VACATED:         "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    NOTICE_GIVEN:    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    RENEWAL_PENDING: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  };
  return map[status] || "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
};

const getInitialTenantForm = () => ({
  property_id: "",
  client_id: "",
  tenant_name: "",
  contact_person: "",
  contact_email: "",
  contact_phone: "",
  allocated_space_sqm: "",
  occupied_rooms_or_units: "",
  headcount: "",
  lease_start_date: "",
  lease_end_date: "",
  monthly_service_charge: "",
  occupancy_status: "ACTIVE_OCCUPIED",
});

export default function TenantOccupancyPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ propertyId: "", search: "" });

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [viewingTenant, setViewingTenant] = useState(null);
  const [form, setForm] = useState(getInitialTenantForm());

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get("/facilities/properties");
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setProperties(list);
    } catch (e) {
      console.warn("fetchProperties error:", e);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await api.get("/sales/customers");
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setClients(list);
    } catch (e) {
      console.warn("fetchClients error:", e);
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
    fetchClients();
  }, [fetchProperties, fetchTenants, fetchClients]);

  const handleSelectClient = (clientId) => {
    if (!clientId) {
      setForm((f) => ({ ...f, client_id: "" }));
      return;
    }
    const selected = clients.find((c) => String(c.id) === String(clientId));
    if (selected) {
      const prior = tenants.find((t) => Number(t.client_id) === Number(selected.id));
      setForm((f) => ({
        ...f,
        client_id: selected.id,
        tenant_name: selected.customer_name || f.tenant_name,
        contact_person: selected.contact_person || (prior?.contact_person || f.contact_person),
        contact_phone: selected.phone || selected.mobile || (prior?.contact_phone || f.contact_phone),
        contact_email: selected.email || (prior?.contact_email || f.contact_email),
        property_id: f.property_id || prior?.property_id || "",
        occupied_rooms_or_units: f.occupied_rooms_or_units || prior?.occupied_rooms_or_units || "",
        allocated_space_sqm: f.allocated_space_sqm || prior?.allocated_space_sqm || "",
        headcount: f.headcount || prior?.headcount || "",
        lease_start_date: f.lease_start_date || (prior?.lease_start_date ? String(prior.lease_start_date).slice(0, 10) : ""),
        lease_end_date: f.lease_end_date || (prior?.lease_end_date ? String(prior.lease_end_date).slice(0, 10) : ""),
        monthly_service_charge: f.monthly_service_charge || prior?.monthly_service_charge || "",
      }));
    }
  };

  const handleOpenCreateModal = () => {
    setEditingTenant(null);
    setForm(getInitialTenantForm());
    setShowModal(true);
  };

  const handleOpenEditModal = (t) => {
    setEditingTenant(t);
    setForm({
      property_id: t.property_id || "",
      client_id: t.client_id || "",
      tenant_name: t.tenant_name || "",
      contact_person: t.contact_person || "",
      contact_email: t.contact_email || "",
      contact_phone: t.contact_phone || "",
      allocated_space_sqm: t.allocated_space_sqm || "",
      occupied_rooms_or_units: t.occupied_rooms_or_units || "",
      headcount: t.headcount || "",
      lease_start_date: t.lease_start_date ? String(t.lease_start_date).slice(0, 10) : "",
      lease_end_date: t.lease_end_date ? String(t.lease_end_date).slice(0, 10) : "",
      monthly_service_charge: t.monthly_service_charge || "",
      occupancy_status: t.occupancy_status || "ACTIVE_OCCUPIED",
    });
    setShowModal(true);
  };

  const handleSaveTenant = async (e) => {
    e.preventDefault();
    if (!form.property_id) {
      toast.warn("Please select a property.");
      return;
    }
    if (!form.tenant_name.trim()) {
      toast.warn("Please enter tenant name or select from Client Setup.");
      return;
    }
    setSubmitting(true);
    try {
      if (editingTenant) {
        await api.put(`/facilities/space/tenants/${editingTenant.id}`, form);
        toast.success("Tenant record updated successfully!");
      } else {
        await api.post("/facilities/space/tenants", form);
        toast.success("Tenant registered successfully!");
      }
      setShowModal(false);
      setEditingTenant(null);
      setForm(getInitialTenantForm());
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save tenant");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTenant = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tenant record?")) return;
    try {
      await api.delete(`/facilities/space/tenants/${id}`);
      toast.success("Tenant record deleted successfully");
      fetchTenants();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete tenant");
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
          <Link
            to="/facilities/setup?tab=clients"
            className="btn btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
            title="Open Client Setup in Operational Setup"
          >
            <Building2 size={14} className="text-emerald-600" /> Client Setup in Setup Page ↗
          </Link>
          <button
            type="button"
            onClick={handleOpenCreateModal}
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
              {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Tenant Leases",
            val: (leases || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Tenant Leases",
            val: (leases || []).length,
            icon: <Users size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Tenant Leases",
            val: (leases || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "PENDING_APPROVAL").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Tenant Leases",
            val: (leases || []).filter((x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "POSTED").length,
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
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-bold text-slate-900 dark:text-white block">{t.tenant_name}</span>
                        {(t.client_id || t.client_name) && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            title="Linked to Client Setup"
                          >
                            <Building2 size={10} /> Client Setup
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200">{t.property_name || "—"}</td>
                    <td className="px-3 py-3 font-medium text-emerald-600 dark:text-emerald-400">{t.occupied_rooms_or_units || "—"}</td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-slate-800 dark:text-slate-200 block">{t.contact_person || "—"}</span>
                      <span className="text-[11px] text-slate-400 block">{t.contact_phone || t.contact_email || ""}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-center">{t.allocated_space_sqm ? `${t.allocated_space_sqm} m²` : "—"}</td>
                    <td className="px-3 py-3 font-mono text-center">{t.headcount || "—"}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {t.lease_start_date ? String(t.lease_start_date).slice(0, 10) : "—"} to {t.lease_end_date ? String(t.lease_end_date).slice(0, 10) : "—"}
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
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewingTenant(t)}
                          className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                          title="View Tenant Details"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(t)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all"
                          title="Edit Tenant Occupancy"
                        >
                          <Edit size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTenant(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Delete Tenant"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
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
                {editingTenant ? "Edit Tenant Occupancy" : "Register New Tenant"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveTenant} className="p-6 space-y-4 text-xs">
              {/* Client Setup Reference */}
              <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                  <label className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Building2 size={14} className="text-emerald-600" /> Link Client from Client Setup (Operational Setup)
                  </label>
                  <Link
                    to="/facilities/setup?tab=clients"
                    target="_blank"
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    + Open Client Setup in Setup Page ↗
                  </Link>
                </div>
                <select
                  value={form.client_id}
                  onChange={(e) => handleSelectClient(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-normal focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Choose from Client Setup (or Enter Manually Below) --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      🏢 {c.customer_name} {c.customer_code ? `(${c.customer_code})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Selecting a registered client auto-populates their organization name, contact person, phone, and email from Client Setup.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Property *</label>
                  <select
                    value={form.property_id}
                    onChange={(e) => setForm((f) => ({ ...f, property_id: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-normal"
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-normal"
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-normal"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="+233 24 123 4567"
                    value={form.contact_phone}
                    onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-mono font-normal"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Contact Email</label>
                  <input
                    type="email"
                    placeholder="tenant@company.com"
                    value={form.contact_email}
                    onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-normal"
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-normal"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Allocated Area (m²)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    value={form.allocated_space_sqm}
                    onChange={(e) => setForm((f) => ({ ...f, allocated_space_sqm: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-mono font-normal"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Headcount</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={form.headcount}
                    onChange={(e) => setForm((f) => ({ ...f, headcount: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-mono font-normal"
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-mono font-normal"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Lease End Date</label>
                  <input
                    type="date"
                    value={form.lease_end_date}
                    onChange={(e) => setForm((f) => ({ ...f, lease_end_date: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-mono font-normal"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Monthly Charge ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 1500"
                    value={form.monthly_service_charge}
                    onChange={(e) => setForm((f) => ({ ...f, monthly_service_charge: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-mono font-normal"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Occupancy Status</label>
                <select
                  value={form.occupancy_status}
                  onChange={(e) => setForm((f) => ({ ...f, occupancy_status: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-normal"
                >
                  <option value="ACTIVE_OCCUPIED">Active Occupied</option>
                  <option value="NOTICE_GIVEN">Notice Given</option>
                  <option value="RENEWAL_PENDING">Renewal Pending</option>
                  <option value="VACATED">Vacated</option>
                </select>
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
                  {submitting ? "Saving…" : editingTenant ? "Update Tenant" : "Register Tenant"}
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
