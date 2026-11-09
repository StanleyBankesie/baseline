/**
 * @fileoverview RoomBookingsPage
 * Standalone page for Meeting Room & Facility Reservations in Facilities Management.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Calendar, Plus, ArrowLeft, Building2, Clock, CheckCircle2,
  XCircle, Filter, Search, RefreshCw, Eye, Users, MapPin
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

const statusBadge = (status) => {
  const map = {
    CONFIRMED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    COMPLETED: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
    CANCELLED: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  };
  return map[status] || "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
};

const getInitialBookingForm = () => ({
  property_id: "",
  space_or_room_name: "",
  booked_by_name: "",
  department_or_tenant: "",
  booking_date: new Date().toISOString().slice(0, 10),
  start_time: "09:00",
  end_time: "10:30",
  purpose: "",
  attendees_count: 6,
});

export default function RoomBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({ propertyId: "", date: "", search: "" });

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [viewingBooking, setViewingBooking] = useState(null);
  const [form, setForm] = useState(getInitialBookingForm());

  const fetchPropertiesAndSpaces = useCallback(async () => {
    try {
      const [propRes, spaceRes] = await Promise.all([
        api.get("/facilities/properties").catch(() => ({ data: { data: [] } })),
        api.get("/facilities/spaces").catch(() => ({ data: { data: [] } })),
      ]);
      const propList = Array.isArray(propRes.data?.data) ? propRes.data.data : Array.isArray(propRes.data) ? propRes.data : [];
      const spaceList = Array.isArray(spaceRes.data?.data) ? spaceRes.data.data : Array.isArray(spaceRes.data) ? spaceRes.data : [];
      setProperties(propList);
      setSpaces(spaceList);
      if (propList.length > 0) {
        setForm((f) => ({ ...f, property_id: f.property_id || propList[0].id }));
      }
      if (spaceList.length > 0) {
        setForm((f) => ({
          ...f,
          space_or_room_name: f.space_or_room_name || `${spaceList[0].space_name} (${spaceList[0].floor_zone || "Main"})`,
        }));
      }
    } catch (e) {
      console.warn("fetchPropertiesAndSpaces error:", e);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.date) params.date = filters.date;
      const res = await api.get("/facilities/space/room-bookings", { params });
      const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
      setBookings(list);
    } catch (err) {
      console.error("fetchBookings error:", err);
      toast.error(err?.response?.data?.message || "Failed to load room bookings");
    } finally {
      setLoading(false);
    }
  }, [filters.date]);

  useEffect(() => {
    fetchPropertiesAndSpaces();
    fetchBookings();
  }, [fetchPropertiesAndSpaces, fetchBookings]);

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!form.property_id || !form.space_or_room_name || !form.booked_by_name) {
      toast.warn("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/facilities/space/room-bookings", form);
      toast.success("Room reservation confirmed successfully!");
      setShowModal(false);
      setForm(getInitialBookingForm());
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to confirm room booking");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await api.put(`/facilities/space/room-bookings/${id}/cancel`, {});
      toast.success("Booking cancelled");
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel booking");
    }
  };

  // Filtered rows
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (filters.propertyId && String(b.property_id) !== String(filters.propertyId)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          (b.space_or_room_name && b.space_or_room_name.toLowerCase().includes(q)) ||
          (b.booked_by_name && b.booked_by_name.toLowerCase().includes(q)) ||
          (b.department_or_tenant && b.department_or_tenant.toLowerCase().includes(q)) ||
          (b.purpose && b.purpose.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [bookings, filters]);

  // Stats
  const todayIso = new Date().toISOString().slice(0, 10);
  const totalBookings = bookings.length;
  const todayBookings = bookings.filter((b) => String(b.booking_date).slice(0, 10) === todayIso).length;
  const confirmedBookings = bookings.filter((b) => b.status === "CONFIRMED").length;

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
                <Calendar size={18} />
              </span>
              Room &amp; Space Bookings
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Meeting rooms, conference halls, training centers and shared space reservation calendar.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/facilities/space-occupancy/tenants"
            className="btn btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5"
          >
            <Users size={14} /> Tenant Register
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
            <Plus size={15} /> Book a Space
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Reservations</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalBookings}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Booked Today</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{todayBookings}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Confirmed Active</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{confirmedBookings}</p>
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
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono"
            title="Filter by Booking Date"
          />
          <div className="flex-1 min-w-[200px] relative">
            <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search room name, booked by, or purpose..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-3 py-1.5 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={fetchBookings}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Property</th>
                <th className="px-3 py-3">Space / Room</th>
                <th className="px-3 py-3">Booked By</th>
                <th className="px-3 py-3">Dept / Tenant</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Time Window</th>
                <th className="px-3 py-3">Purpose</th>
                <th className="px-3 py-3 text-center">Attendees</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400">Loading reservations…</td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-10 text-slate-400 italic">No room reservations found.</td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{b.property_name || "—"}</td>
                    <td className="px-3 py-3 font-bold text-slate-900 dark:text-white">{b.space_or_room_name}</td>
                    <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200">{b.booked_by_name}</td>
                    <td className="px-3 py-3 text-slate-500">{b.department_or_tenant || "—"}</td>
                    <td className="px-3 py-3 font-mono text-xs">{b.booking_date ? String(b.booking_date).slice(0, 10) : "—"}</td>
                    <td className="px-3 py-3 font-mono text-emerald-600 dark:text-emerald-400">
                      {String(b.start_time).slice(0, 5)} - {String(b.end_time).slice(0, 5)}
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300 max-w-[160px] truncate">{b.purpose || "—"}</td>
                    <td className="px-3 py-3 font-mono text-center">{b.attendees_count ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusBadge(b.status)}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setViewingBooking(b)}
                          className="btn btn-secondary text-xs px-2 py-1 inline-flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye size={12} /> View
                        </button>
                        {b.status === "CONFIRMED" && (
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(b.id)}
                            className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                            title="Cancel Reservation"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Book Space */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar size={18} className="text-emerald-600" />
                Book Space or Conference Room
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateBooking} className="p-6 space-y-4 text-xs">
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
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Room / Facility *</label>
                  <input
                    type="text"
                    list="spaces-list"
                    placeholder="e.g. Executive Boardroom"
                    value={form.space_or_room_name}
                    onChange={(e) => setForm((f) => ({ ...f, space_or_room_name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                    required
                  />
                  <datalist id="spaces-list">
                    {spaces.map((s) => (
                      <option key={s.id} value={`${s.space_name} (${s.floor_zone || "Main"})`} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Booked By (Person) *</label>
                  <input
                    type="text"
                    placeholder="e.g. Kwame Mensah"
                    value={form.booked_by_name}
                    onChange={(e) => setForm((f) => ({ ...f, booked_by_name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Department / Tenant</label>
                  <input
                    type="text"
                    placeholder="e.g. Operations / Finance / External Tenant"
                    value={form.department_or_tenant}
                    onChange={(e) => setForm((f) => ({ ...f, department_or_tenant: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Date *</label>
                  <input
                    type="date"
                    value={form.booking_date}
                    onChange={(e) => setForm((f) => ({ ...f, booking_date: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Start Time *</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">End Time *</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Purpose / Agenda</label>
                  <input
                    type="text"
                    placeholder="e.g. Board of Directors Meeting, Client Pitch..."
                    value={form.purpose}
                    onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Attendees Count</label>
                  <input
                    type="number"
                    min="1"
                    value={form.attendees_count}
                    onChange={(e) => setForm((f) => ({ ...f, attendees_count: parseInt(e.target.value) || 1 }))}
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
                  {submitting ? "Booking…" : "Confirm Reservation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {viewingBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar size={18} className="text-emerald-600" />
                Booking Details
              </h3>
              <button
                type="button"
                onClick={() => setViewingBooking(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl space-y-2">
                <div>
                  <span className="text-slate-400 block text-[11px]">Room / Facility</span>
                  <span className="font-bold text-slate-800 dark:text-white text-sm">{viewingBooking.space_or_room_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Property</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{viewingBooking.property_name || "—"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Booked By</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{viewingBooking.booked_by_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Dept / Tenant</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{viewingBooking.department_or_tenant || "—"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Date</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">{String(viewingBooking.booking_date).slice(0, 10)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Time Window</span>
                    <span className="font-mono text-emerald-600 font-semibold">{String(viewingBooking.start_time).slice(0, 5)} - {String(viewingBooking.end_time).slice(0, 5)}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Purpose</span>
                  <span className="text-slate-700 dark:text-slate-300">{viewingBooking.purpose || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Attendees</span>
                  <span className="font-bold text-slate-800 dark:text-white">{viewingBooking.attendees_count || 1} people</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingBooking(null)}
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
