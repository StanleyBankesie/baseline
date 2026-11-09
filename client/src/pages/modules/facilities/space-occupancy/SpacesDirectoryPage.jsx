/**
 * @fileoverview SpacesDirectoryPage
 * Standalone page for Space & Unit Directory in Facilities Management.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building2, Plus, ArrowLeft, Users, Calendar, Filter,
  Search, RefreshCw, Eye, Edit, Trash2, CheckCircle2, MapPin
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

const occupancyBadge = (status) => {
  const map = {
    OCCUPIED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    VACANT:   "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    RESERVED: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  };
  return map[status] || "bg-slate-100 text-slate-500";
};

const SPACE_TYPES = [
  "MEETING_ROOM",
  "CONFERENCE_HALL",
  "PRIVATE_OFFICE",
  "OPEN_WORKSTATIONS",
  "EXECUTIVE_SUITE",
  "SERVER_ROOM",
  "LABORATORY",
  "CAFETERIA_BREAKROOM",
  "STORAGE_ARCHIVE",
  "RESTROOM_FACILITY",
];

const getInitialSpaceForm = () => ({
  property_id: "",
  space_name: "",
  floor_zone: "Ground Floor",
  space_type: "MEETING_ROOM",
  capacity: 10,
  area_sqm: 45,
  occupancy_status: "VACANT",
  notes: "",
});

export default function SpacesDirectoryPage() {
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ propertyId: "", spaceType: "", status: "", search: "" });

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [viewingSpace, setViewingSpace] = useState(null);
  const [form, setForm] = useState(getInitialSpaceForm());

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

  const fetchSpaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/facilities/spaces");
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setSpaces(list);
    } catch (err) {
      console.error("fetchSpaces error:", err);
      toast.error(err?.response?.data?.message || "Failed to load spaces directory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
    fetchSpaces();
  }, [fetchProperties, fetchSpaces]);

  const handleCreateSpace = async (e) => {
    e.preventDefault();
    if (!form.property_id || !form.space_name.trim()) {
      toast.warn("Please enter space name and select a property.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/facilities/spaces", form);
      toast.success("Space / Unit added successfully!");
      setShowModal(false);
      setForm(getInitialSpaceForm());
      fetchSpaces();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add space");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSpace = async (id) => {
    if (!window.confirm("Are you sure you want to delete this space?")) return;
    try {
      await api.delete(`/facilities/spaces/${id}`);
      toast.success("Space deleted");
      fetchSpaces();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete space");
    }
  };

  const filteredSpaces = useMemo(() => {
    return spaces.filter((s) => {
      if (filters.propertyId && String(s.property_id) !== String(filters.propertyId)) return false;
      if (filters.spaceType && String(s.space_type) !== String(filters.spaceType)) return false;
      if (filters.status && String(s.occupancy_status) !== String(filters.status)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          (s.space_name && s.space_name.toLowerCase().includes(q)) ||
          (s.floor_zone && s.floor_zone.toLowerCase().includes(q)) ||
          (s.space_type && s.space_type.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [spaces, filters]);

  // Aggregate stats
  const totalSpaces = spaces.length;
  const totalArea = spaces.reduce((sum, s) => sum + (parseFloat(s.area_sqm) || 0), 0);
  const totalCapacity = spaces.reduce((sum, s) => sum + (parseInt(s.capacity) || 0), 0);
  const occupiedCount = spaces.filter((s) => s.occupancy_status === "OCCUPIED").length;

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
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Space &amp; Unit Directory
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Floor zones, meeting rooms, executive suites, office units, area dimensions, and capacity tracking.
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
            to="/facilities/space-occupancy/tenants"
            className="btn btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
          >
            <Users size={14} /> Tenant Register
          </Link>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm active:scale-95"
          >
            <Plus size={15} /> Add Space / Unit
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Units</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalSpaces}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Usable Floor Area</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalArea.toLocaleString()} m²</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Capacity</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalCapacity} Seats</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Occupancy Rate</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {totalSpaces > 0 ? Math.round((occupiedCount / totalSpaces) * 100) : 0}%
          </p>
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
          <select
            value={filters.spaceType}
            onChange={(e) => setFilters((f) => ({ ...f, spaceType: e.target.value }))}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
          >
            <option value="">All Space Types</option>
            {SPACE_TYPES.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
          >
            <option value="">All Occupancy</option>
            <option value="VACANT">Vacant</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
          </select>
          <div className="flex-1 min-w-[200px] relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search space name, zone, or floor..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-3 py-1.5 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={fetchSpaces}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Spaces Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Property</th>
                <th className="px-3 py-3">Space / Unit Name</th>
                <th className="px-3 py-3">Floor / Zone</th>
                <th className="px-3 py-3">Space Type</th>
                <th className="px-3 py-3 text-center">Capacity</th>
                <th className="px-3 py-3 text-center">Area (m²)</th>
                <th className="px-3 py-3">Occupancy Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400">Loading space directory…</td>
                </tr>
              ) : filteredSpaces.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400 italic">No spaces registered.</td>
                </tr>
              ) : (
                filteredSpaces.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{s.property_name || "—"}</td>
                    <td className="px-3 py-3 font-bold text-slate-900 dark:text-white">{s.space_name}</td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{s.floor_zone || "—"}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {s.space_type?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-center">{s.capacity || "—"} seats</td>
                    <td className="px-3 py-3 font-mono text-center">{s.area_sqm || "—"} m²</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${occupancyBadge(s.occupancy_status)}`}>
                        {s.occupancy_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewingSpace(s)}
                          className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpace(s.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete Space"
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

      {/* Modal: Add Space */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 size={18} className="text-emerald-600" />
                Add New Space / Room Unit
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSpace} className="p-6 space-y-4 text-xs">
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
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Space / Room Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Conference Room 3B, Server Vault"
                    value={form.space_name}
                    onChange={(e) => setForm((f) => ({ ...f, space_name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Floor / Zone</label>
                  <input
                    type="text"
                    placeholder="e.g. Level 3 - East Wing"
                    value={form.floor_zone}
                    onChange={(e) => setForm((f) => ({ ...f, floor_zone: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Space Type</label>
                  <select
                    value={form.space_type}
                    onChange={(e) => setForm((f) => ({ ...f, space_type: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                  >
                    {SPACE_TYPES.map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Capacity (Seats)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.capacity}
                    onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Area (m²)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={form.area_sqm}
                    onChange={(e) => setForm((f) => ({ ...f, area_sqm: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Occupancy Status</label>
                  <select
                    value={form.occupancy_status}
                    onChange={(e) => setForm((f) => ({ ...f, occupancy_status: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                  >
                    <option value="VACANT">Vacant</option>
                    <option value="OCCUPIED">Occupied</option>
                    <option value="RESERVED">Reserved</option>
                  </select>
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
                  {submitting ? "Saving…" : "Save Space"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {viewingSpace && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 size={18} className="text-emerald-600" />
                Space Unit Details
              </h3>
              <button
                type="button"
                onClick={() => setViewingSpace(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl space-y-2">
                <div>
                  <span className="text-slate-400 block text-[11px]">Space Name</span>
                  <span className="font-bold text-slate-800 dark:text-white text-sm">{viewingSpace.space_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Property</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{viewingSpace.property_name || "—"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Floor / Zone</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{viewingSpace.floor_zone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Space Type</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">{viewingSpace.space_type?.replace(/_/g, " ")}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Capacity</span>
                    <span className="font-bold text-slate-800 dark:text-white">{viewingSpace.capacity} seats</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Area Dimension</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-white">{viewingSpace.area_sqm} m²</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[11px]">Occupancy</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block mt-0.5 ${occupancyBadge(viewingSpace.occupancy_status)}`}>
                    {viewingSpace.occupancy_status}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingSpace(null)}
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
