import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Key, UserCheck, Plus, ArrowLeft, LogOut, LogIn, Search, Filter, RefreshCw, AlertCircle, Eye, Edit, Activity, Clock, CheckCircle2, Lock } from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

// ─── Helpers ────────────────────────────────────────────────────────────────
const visitorStatusBadge = (status) => {
  const map = {
    CHECKED_IN:  "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    CHECKED_OUT: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    EXPECTED:    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    DENIED:      "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  };
  return map[status] || "bg-slate-100 text-slate-500";
};

const keyStatusBadge = (status) => {
  const map = {
    AVAILABLE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    ISSUED:    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    LOST:      "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
    DAMAGED:   "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  };
  return map[status] || "bg-slate-100 text-slate-500";
};

// ─── Initial form states ─────────────────────────────────────────────────────
const getInitialVisitorForm = () => ({
  property_id: "",
  full_name: "",
  phone: "",
  company_name: "",
  visitor_badge_no: "",
  host_employee_name: "",
  host_department: "",
  visit_purpose: "",
  time_in: new Date().toISOString().slice(0, 16),
  time_out: "",
  notes: "",
});

const getInitialKeyForm = () => ({
  property_id: "",
  key_or_card_code: "",
  space_or_door_name: "",
  key_type: "PHYSICAL_KEY",
  issued_to_name: "",
  issued_to_phone: "",
  issued_date: "",
  expected_return_date: "",
  notes: "",
});

const getInitialIssueForm = () => ({
  issued_to_name: "",
  issued_to_phone: "",
  expected_return_date: "",
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function SecurityAccessPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("visitors"); // "visitors" | "keys"
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Visitor state
  const [visitors, setVisitors] = useState([]);
  const [visitorFilters, setVisitorFilters] = useState({ propertyId: "", status: "", date: "", search: "" });
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [viewingVisitor, setViewingVisitor] = useState(null);
  const [visitorForm, setVisitorForm] = useState(getInitialVisitorForm());

  // Key state
  const [keys, setKeys] = useState([]);
  const [keyFilters, setKeyFilters] = useState({ propertyId: "", status: "", search: "" });
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [viewingKey, setViewingKey] = useState(null);
  const [keyForm, setKeyForm] = useState(getInitialKeyForm());
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [issueForm, setIssueForm] = useState(getInitialIssueForm());

  // ── Fetch helpers ──
  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get("/facilities/properties");
      const list = res.data?.data || [];
      setProperties(list);
      if (list.length > 0) {
        setVisitorForm((f) => ({ ...f, property_id: list[0].id }));
        setKeyForm((f) => ({ ...f, property_id: list[0].id }));
      }
    } catch {}
  }, []);

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (visitorFilters.propertyId) params.propertyId = visitorFilters.propertyId;
      if (visitorFilters.status)     params.status = visitorFilters.status;
      if (visitorFilters.date)       params.date = visitorFilters.date;
      if (visitorFilters.search)     params.search = visitorFilters.search;
      const res = await api.get("/facilities/security/visitors", { params });
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      setVisitors(list);
    } catch (err) {
      console.error("fetchVisitors error:", err);
      toast.error(err?.response?.data?.message || "Failed to load visitor log");
    } finally {
      setLoading(false);
    }
  }, [visitorFilters]);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (keyFilters.propertyId) params.propertyId = keyFilters.propertyId;
      if (keyFilters.status)     params.status = keyFilters.status;
      if (keyFilters.search)     params.search = keyFilters.search;
      const res = await api.get("/facilities/security/keys", { params });
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
        ? res.data
        : [];
      setKeys(list);
    } catch (err) {
      console.error("fetchKeys error:", err);
      toast.error(err?.response?.data?.message || "Failed to load key register");
    } finally {
      setLoading(false);
    }
  }, [keyFilters]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  useEffect(() => {
    if (activeTab === "visitors") fetchVisitors();
    else fetchKeys();
  }, [activeTab, fetchVisitors, fetchKeys]);

  // ── Stats ──
  const checkedInToday = visitors.filter((v) => v.status === "CHECKED_IN").length;
  const expectedToday  = visitors.filter((v) => v.status === "EXPECTED").length;
  const checkedOut     = visitors.filter((v) => v.status === "CHECKED_OUT").length;

  const totalKeys    = keys.length;
  const issuedKeys   = keys.filter((k) => k.status === "ISSUED").length;
  const availableKeys = keys.filter((k) => k.status === "AVAILABLE").length;
  const lostKeys     = keys.filter((k) => k.status === "LOST").length;

  // ── Handlers ──
  const handleCreateVisitor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/facilities/security/visitors", visitorForm);
      toast.success("Visitor registered and checked in successfully");
      setShowVisitorModal(false);
      setVisitorForm(getInitialVisitorForm());
      fetchVisitors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to register visitor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckout = async (visitor) => {
    try {
      await api.put(`/facilities/security/visitors/${visitor.id}/checkout`);
      toast.success(`${visitor.full_name} checked out successfully`);
      fetchVisitors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Checkout failed");
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/facilities/security/keys", keyForm);
      toast.success("Key / Access card added to register");
      setShowKeyModal(false);
      setKeyForm(getInitialKeyForm());
      fetchKeys();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add key");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueKey = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/facilities/security/keys/${selectedKey.id}/issue`, issueForm);
      toast.success(`Key issued to ${issueForm.issued_to_name}`);
      setShowIssueModal(false);
      setIssueForm(getInitialIssueForm());
      fetchKeys();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to issue key");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnKey = async (key) => {
    try {
      await api.put(`/facilities/security/keys/${key.id}/return`, {});
      toast.success(`Key ${key.key_or_card_code} returned and marked available`);
      fetchKeys();
    } catch (err) {
      toast.error(err.response?.data?.message || "Return failed");
    }
  };

  const fv = (field) => (e) => setVisitorForm((f) => ({ ...f, [field]: e.target.value }));
  const fk = (field) => (e) => setKeyForm((f) => ({ ...f, [field]: e.target.value }));
  const fi = (field) => (e) => setIssueForm((f) => ({ ...f, [field]: e.target.value }));

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs"
            title="Go Back"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Security &amp; Access Management
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Visitor check-in / check-out log, physical key and access card register across all properties.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "visitors" && (
            <button
              onClick={() => { setVisitorForm(getInitialVisitorForm()); setShowVisitorModal(true); }}
              className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm active:scale-95"
            >
              <Plus size={15} /> Register Visitor
            </button>
          )}
          {activeTab === "keys" && (
            <button
              onClick={() => { setKeyForm(getInitialKeyForm()); setShowKeyModal(true); }}
              className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm active:scale-95"
            >
              <Plus size={15} /> Add Key / Card
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab("visitors")}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "visitors"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <UserCheck size={14} />
          Visitor Log ({visitors.length})
        </button>
        <button
          onClick={() => setActiveTab("keys")}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all ${
            activeTab === "keys"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Key size={14} />
          Key Register ({keys.length})
        </button>
      </div>

      {/* ── TAB 1: VISITOR LOG ────────────────────────────────────────────── */}
      {activeTab === "visitors" && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Checked In Today</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{checkedInToday}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Expected</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{expectedToday}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Checked Out</p>
              <p className="text-2xl font-bold text-slate-600 dark:text-slate-400 mt-1">{checkedOut}</p>
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
                value={visitorFilters.propertyId}
                onChange={(e) => setVisitorFilters((f) => ({ ...f, propertyId: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Properties</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.property_name}</option>)}
              </select>
              <select
                value={visitorFilters.status}
                onChange={(e) => setVisitorFilters((f) => ({ ...f, status: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Status</option>
                <option value="EXPECTED">Expected</option>
                <option value="CHECKED_IN">Checked In</option>
                <option value="CHECKED_OUT">Checked Out</option>
                <option value="DENIED">Denied</option>
              </select>
              <input
                type="date"
                value={visitorFilters.date}
                onChange={(e) => setVisitorFilters((f) => ({ ...f, date: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
              />
              <div className="flex-1 min-w-[180px] relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search visitor or company..."
                  value={visitorFilters.search}
                  onChange={(e) => setVisitorFilters((f) => ({ ...f, search: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-3 py-1.5 text-xs"
                />
              </div>
              <button
                onClick={fetchVisitors}
                className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Access Control Logs",
            val: (logs || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Access Control Logs",
            val: (logs || []).length,
            icon: <Lock size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Access Control Logs",
            val: (logs || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "PENDING_APPROVAL").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Access Control Logs",
            val: (logs || []).filter((x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "POSTED").length,
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
                    <th className="px-4 py-3">Visitor No</th>
                    <th className="px-3 py-3">Full Name</th>
                    <th className="px-3 py-3">Company</th>
                    <th className="px-3 py-3">Host Employee</th>
                    <th className="px-3 py-3">Purpose</th>
                    <th className="px-3 py-3">Time In</th>
                    <th className="px-3 py-3">Time Out</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Created By</th>
                    <th className="px-3 py-3">Created Date</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan="11" className="text-center py-10 text-slate-400">Loading visitor log…</td>
                    </tr>
                  ) : visitors.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center py-10 text-slate-400 italic">No visitor records found.</td>
                    </tr>
                  ) : (
                    visitors.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-white">{v.visitor_no}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900 dark:text-slate-100">{v.full_name}</td>
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{v.company_name || "—"}</td>
                        <td className="px-3 py-3">{v.host_employee_name || "—"}</td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400 max-w-[140px] truncate">{v.visit_purpose}</td>
                        <td className="px-3 py-3 font-mono text-xs">{v.check_in_time ? String(v.check_in_time).replace("T", " ").slice(0, 16) : "—"}</td>
                        <td className="px-3 py-3 font-mono text-xs">
                          {v.check_out_time
                            ? String(v.check_out_time).replace("T", " ").slice(0, 16)
                            : v.status === "CHECKED_IN"
                              ? <span className="text-emerald-600 font-semibold">Still In</span>
                              : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${visitorStatusBadge(v.status)}`}>
                            {v.status?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{v.created_by || "System"}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{v.created_at ? String(v.created_at).replace("T", " ").slice(0, 10) : "—"}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setViewingVisitor(v)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all"
                              title="View Visitor Log Details"
                            >
                              <Eye size={11} /> View
                            </button>
                            {v.status === "CHECKED_IN" && (
                              <button
                                onClick={() => handleCheckout(v)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                <LogOut size={11} /> Checkout
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
        </div>
      )}

      {/* ── TAB 2: KEY REGISTER ───────────────────────────────────────────── */}
      {activeTab === "keys" && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Total Keys</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{totalKeys}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Issued</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{issuedKeys}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Available</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{availableKeys}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Lost</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{lostKeys}</p>
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
                value={keyFilters.propertyId}
                onChange={(e) => setKeyFilters((f) => ({ ...f, propertyId: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Properties</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.property_name}</option>)}
              </select>
              <select
                value={keyFilters.status}
                onChange={(e) => setKeyFilters((f) => ({ ...f, status: e.target.value }))}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="ISSUED">Issued</option>
                <option value="LOST">Lost</option>
                <option value="DAMAGED">Damaged</option>
              </select>
              <div className="flex-1 min-w-[180px] relative">
                <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search key code or door..."
                  value={keyFilters.search}
                  onChange={(e) => setKeyFilters((f) => ({ ...f, search: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-7 pr-3 py-1.5 text-xs"
                />
              </div>
              <button
                onClick={fetchKeys}
                className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Key / Card Code</th>
                    <th className="px-3 py-3">Door / Space</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Issued To</th>
                    <th className="px-3 py-3">Issued Date</th>
                    <th className="px-3 py-3">Expected Return</th>
                    <th className="px-3 py-3">Created By</th>
                    <th className="px-3 py-3">Created Date</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="text-center py-10 text-slate-400">Loading key register…</td>
                    </tr>
                  ) : keys.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-10 text-slate-400 italic">No keys or access cards found.</td>
                    </tr>
                  ) : (
                    keys.map((k) => (
                      <tr key={k.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800 dark:text-white">{k.key_or_card_code}</td>
                        <td className="px-3 py-3 font-medium text-slate-700 dark:text-slate-200">{k.space_or_door_name}</td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{k.key_type?.replace(/_/g, " ")}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${keyStatusBadge(k.status)}`}>
                            {k.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-800 dark:text-slate-200">{k.issued_to_name || "—"}</td>
                        <td className="px-3 py-3 font-mono text-xs">{k.issued_date ? String(k.issued_date).slice(0, 10) : "—"}</td>
                        <td className="px-3 py-3 font-mono text-xs text-rose-600 font-semibold">{k.expected_return_date ? String(k.expected_return_date).slice(0, 10) : "—"}</td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-400">{k.created_by || "System"}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{k.created_at ? String(k.created_at).slice(0, 10) : "—"}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setViewingKey(k)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all"
                              title="View Key Details"
                            >
                              <Eye size={11} /> View
                            </button>
                            {k.status === "AVAILABLE" && (
                              <button
                                onClick={() => { setSelectedKey(k); setIssueForm(getInitialIssueForm()); setShowIssueModal(true); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                <LogIn size={11} /> Issue
                              </button>
                            )}
                            {k.status === "ISSUED" && (
                              <button
                                onClick={() => handleReturnKey(k)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all"
                              >
                                <LogOut size={11} /> Return
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: REGISTER VISITOR
      ══════════════════════════════════════════════════════════════════════ */}
      {showVisitorModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-4xl lg:max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserCheck size={18} className="text-emerald-500" />
                Register Visitor / Check-In
              </h3>
              <button type="button" onClick={() => setShowVisitorModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1">✕</button>
            </div>
            <form onSubmit={handleCreateVisitor} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Property *</label>
                  <select value={visitorForm.property_id} onChange={fv("property_id")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required>
                    <option value="">Select property...</option>
                    {properties.map((p) => <option key={p.id} value={p.id}>{p.property_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Full Name *</label>
                  <input type="text" placeholder="e.g. Kwame Asante" value={visitorForm.full_name} onChange={fv("full_name")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Phone</label>
                  <input type="text" placeholder="e.g. +233 24 000 0000" value={visitorForm.phone} onChange={fv("phone")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Company Name</label>
                  <input type="text" placeholder="e.g. Vodafone Ghana" value={visitorForm.company_name} onChange={fv("company_name")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Host Employee Name</label>
                  <input type="text" placeholder="e.g. Ama Serwaa (Optional)" value={visitorForm.host_employee_name} onChange={fv("host_employee_name")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Host Department</label>
                  <input type="text" placeholder="e.g. Finance" value={visitorForm.host_department} onChange={fv("host_department")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Time In *</label>
                  <input type="datetime-local" value={visitorForm.time_in} onChange={fv("time_in")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Time Out</label>
                  <input type="datetime-local" value={visitorForm.time_out} onChange={fv("time_out")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Visit Purpose *</label>
                  <input type="text" placeholder="e.g. Contract Signing" value={visitorForm.visit_purpose} onChange={fv("visit_purpose")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Visitor Badge No</label>
                  <input type="text" placeholder="e.g. VB-0042" value={visitorForm.visitor_badge_no} onChange={fv("visitor_badge_no")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Notes</label>
                <textarea rows={2} placeholder="Any additional notes..." value={visitorForm.notes} onChange={fv("notes")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowVisitorModal(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm">
                  {submitting ? "Registering…" : "Register & Check In"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: ADD KEY / CARD
      ══════════════════════════════════════════════════════════════════════ */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-4xl lg:max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key size={18} className="text-emerald-500" />
                Add Key / Access Card to Register
              </h3>
              <button type="button" onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1">✕</button>
            </div>
            <form onSubmit={handleCreateKey} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Property *</label>
                  <select value={keyForm.property_id} onChange={fk("property_id")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required>
                    <option value="">Select property...</option>
                    {properties.map((p) => <option key={p.id} value={p.id}>{p.property_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Key / Card Code *</label>
                  <input type="text" placeholder="e.g. K-0041 or RFID-2299" value={keyForm.key_or_card_code} onChange={fk("key_or_card_code")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Door / Space Name *</label>
                  <input type="text" placeholder="e.g. Server Room Door 2" value={keyForm.space_or_door_name} onChange={fk("space_or_door_name")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Key Type</label>
                  <select value={keyForm.key_type} onChange={fk("key_type")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs">
                    <option value="PHYSICAL_KEY">Physical Key</option>
                    <option value="ACCESS_CARD">Access Card / RFID</option>
                    <option value="MASTER_KEY">Master Key</option>
                    <option value="PADLOCK_KEY">Padlock Key</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Issued To</label>
                  <input type="text" placeholder="e.g. Kofi Mensah (Optional)" value={keyForm.issued_to_name} onChange={fk("issued_to_name")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Issued Date</label>
                  <input type="date" value={keyForm.issued_date} onChange={fk("issued_date")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Expected Return</label>
                  <input type="date" value={keyForm.expected_return_date} onChange={fk("expected_return_date")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Notes</label>
                <textarea rows={2} placeholder="Optional notes or custody remarks..." value={keyForm.notes} onChange={fk("notes")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowKeyModal(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm">
                  {submitting ? "Adding…" : "Add to Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: ISSUE KEY
      ══════════════════════════════════════════════════════════════════════ */}
      {showIssueModal && selectedKey && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LogIn size={18} className="text-amber-500" />
                Issue Key — {selectedKey.key_or_card_code}
              </h3>
              <button type="button" onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1">✕</button>
            </div>
            <form onSubmit={handleIssueKey} className="p-6 space-y-4 text-xs">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl p-3 text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>Issuing <strong>{selectedKey.key_or_card_code}</strong> for <strong>{selectedKey.space_or_door_name}</strong>. Record who is receiving this key.</span>
              </div>
              <div>
                <label className="block font-semibold mb-1">Issued To Name *</label>
                <input type="text" placeholder="e.g. Kofi Mensah" value={issueForm.issued_to_name} onChange={fi("issued_to_name")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required />
              </div>
              <div>
                <label className="block font-semibold mb-1">Phone</label>
                <input type="text" placeholder="e.g. +233 20 000 0000" value={issueForm.issued_to_phone} onChange={fi("issued_to_phone")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Expected Return Date *</label>
                <input type="date" value={issueForm.expected_return_date} onChange={fi("expected_return_date")} className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs" required />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={() => setShowIssueModal(false)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-sm">
                  {submitting ? "Issuing…" : "Confirm Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: View Visitor Details ── */}
      {viewingVisitor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-emerald-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Visitor Entry Log — {viewingVisitor.visitor_no}
                </h3>
              </div>
              <button onClick={() => setViewingVisitor(null)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-xs">Visitor Name</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{viewingVisitor.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Company</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{viewingVisitor.company_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Phone</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{viewingVisitor.phone || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Badge Number</span>
                  <span className="font-mono font-bold text-emerald-600">{viewingVisitor.visitor_badge_no || "—"}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-xs">Host Employee</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingVisitor.host_employee_name || "—"} ({viewingVisitor.host_department || "General"})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Created By</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingVisitor.created_by || "System"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Time In</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{viewingVisitor.check_in_time ? String(viewingVisitor.check_in_time).replace("T", " ").slice(0, 16) : "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Time Out</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{viewingVisitor.check_out_time ? String(viewingVisitor.check_out_time).replace("T", " ").slice(0, 16) : "Still In"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Created Date</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{viewingVisitor.created_at ? String(viewingVisitor.created_at).replace("T", " ").slice(0, 10) : "—"}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-xs font-semibold uppercase mb-1">Visit Purpose</span>
                <p className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
                  {viewingVisitor.visit_purpose}
                </p>
              </div>
              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => setViewingVisitor(null)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: View Key Details ── */}
      {viewingKey && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Key Register — {viewingKey.key_or_card_code}
                </h3>
              </div>
              <button onClick={() => setViewingKey(null)} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-xs">Key / Card Code</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{viewingKey.key_or_card_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Type</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{viewingKey.key_type?.replace(/_/g, " ")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Door / Space</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{viewingKey.space_or_door_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-block mt-0.5 ${keyStatusBadge(viewingKey.status)}`}>
                    {viewingKey.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Created By</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingKey.created_by || "System"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Created Date</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{viewingKey.created_at ? String(viewingKey.created_at).replace("T", " ").slice(0, 10) : "—"}</span>
                </div>
              </div>
              {viewingKey.issued_to_name && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl space-y-2">
                  <div className="font-bold text-amber-900 dark:text-amber-200">Current Custody Record</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">Issued To:</span> <strong className="ml-1">{viewingKey.issued_to_name}</strong></div>
                    <div><span className="text-slate-500">Phone:</span> <strong className="ml-1">{viewingKey.issued_to_phone || "—"}</strong></div>
                    <div><span className="text-slate-500">Issued Date:</span> <span className="ml-1 font-mono">{viewingKey.issued_date ? String(viewingKey.issued_date).slice(0, 10) : "—"}</span></div>
                    <div><span className="text-slate-500">Return Due:</span> <span className="ml-1 font-mono text-rose-600 font-bold">{viewingKey.expected_return_date ? String(viewingKey.expected_return_date).slice(0, 10) : "—"}</span></div>
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => setViewingKey(null)} className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100">
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
