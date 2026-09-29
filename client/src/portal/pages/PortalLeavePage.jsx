import React, { useState, useEffect } from "react";
import portalApi from "../api/portalClient.js";
import { Calendar, Plus, X, AlertCircle, CheckCircle2, Clock, Trash2 } from "lucide-react";

export default function PortalLeavePage() {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Form State
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      const res = await portalApi.get("/leave/balances");
      setBalances(res.data?.balances || []);
      setRequests(res.data?.requests || []);
      if (res.data?.balances?.length > 0 && !leaveTypeId) {
        setLeaveTypeId(res.data.balances[0].id);
      }
    } catch (err) {
      console.error("Failed to load leave records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);
    try {
      await portalApi.post("/leave/apply", {
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        reason,
      });
      setSuccessMsg("Leave application submitted successfully for supervisor approval.");
      setShowApplyModal(false);
      setStartDate("");
      setEndDate("");
      setReason("");
      await fetchLeaveData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit leave application.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this pending leave request?")) return;
    try {
      await portalApi.post(`/leave/cancel/${id}`);
      await fetchLeaveData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel leave.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-400" />
            <span>Leave Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Track your entitled leave days, view status, and submit time-off requests.
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center gap-2 text-teal-300 text-xs">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {balances.map((b) => (
          <div key={b.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">{b.name}</h4>
                <span className="text-[10px] text-teal-400 font-semibold bg-teal-500/10 px-2 py-0.5 rounded">
                  {b.is_paid ? "Paid" : "Unpaid"}
                </span>
              </div>
              <div className="flex items-baseline gap-2 my-2">
                <span className="text-2xl font-black text-teal-300">{b.balance_days}</span>
                <span className="text-xs text-slate-400">days remaining</span>
              </div>
            </div>
            <div className="pt-2.5 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
              <span>Entitled: <strong className="text-slate-200">{b.entitled_days}</strong></span>
              <span>Taken: <strong className="text-amber-400">{b.used_days}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Leave Request History */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <span>Leave Requests History</span>
          </h3>
          <span className="text-xs text-slate-400">{requests.length} records</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Loading leave requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No leave requests submitted yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {requests.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-white">{r.leave_type_name || "Annual Leave"}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        r.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : r.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : r.status === "CANCELLED"
                          ? "bg-slate-800 text-slate-400"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {r.start_date} to {r.end_date} · <strong className="text-slate-200">{r.total_days} days</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 italic">"{r.reason}"</p>
                </div>

                <div>
                  {r.status === "PENDING" && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
                      title="Cancel Request"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Apply for Time Off</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleApply} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Leave Type</label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {balances.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.balance_days} days available)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reason / Purpose</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain the purpose of your leave request"
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl shadow-lg disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}