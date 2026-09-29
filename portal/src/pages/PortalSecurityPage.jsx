import React, { useState, useEffect } from "react";
import { usePortalAuth } from "../context/PortalAuthContext.jsx";
import portalApi from "../api/portalClient.js";
import { Lock, Bell, ShieldCheck, CheckCircle2, AlertCircle, Save } from "lucide-react";

export default function PortalSecurityPage() {
  const { updatePassword } = usePortalAuth();

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  // Notification Preferences State
  const [prefs, setPrefs] = useState({
    email_leave_updates: 1,
    email_payroll_updates: 1,
    email_announcements: 1,
    email_event_reminders: 1,
    push_attendance_alerts: 1,
  });
  const [prefLoading, setPrefLoading] = useState(false);
  const [prefMsg, setPrefMsg] = useState("");

  useEffect(() => {
    portalApi
      .get("/preferences/notifications")
      .then((res) => {
        if (res.data?.preferences) setPrefs(res.data.preferences);
      })
      .catch(() => {});
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdMsg("");
    setPwdErr("");

    if (newPassword.length < 8) {
      setPwdErr("New password must be at least 8 characters long.");
      setPwdLoading(false);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdErr("New password and confirm password do not match.");
      setPwdLoading(false);
      return;
    }

    try {
      await updatePassword(currentPassword, newPassword, confirmPassword);
      setPwdMsg("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwdErr(err.response?.data?.message || "Failed to change password. Ensure current password is correct.");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleTogglePref = async (key) => {
    const updated = { ...prefs, [key]: prefs[key] ? 0 : 1 };
    setPrefs(updated);
    try {
      await portalApi.put("/preferences/notifications", updated);
      setPrefMsg("Preferences saved.");
      setTimeout(() => setPrefMsg(""), 3000);
    } catch {
      // rollback
      setPrefs(prefs);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
          <span>Security & Notification Preferences</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Manage your portal access password and customize notification delivery channels.
        </p>
      </div>

      {/* Password Update Card */}
      <form onSubmit={handlePasswordChange} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-teal-400" />
          <span>Change Account Password</span>
        </h3>

        {pwdMsg && (
          <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{pwdMsg}</span>
          </div>
        )}

        {pwdErr && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{pwdErr}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min 8 chars"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Re-enter password"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="pt-2 text-right">
          <button
            type="submit"
            disabled={pwdLoading}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            {pwdLoading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>

      {/* Notification Preferences */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-teal-400" />
            <span>Email & Alert Preferences</span>
          </h3>
          {prefMsg && <span className="text-xs text-teal-400">{prefMsg}</span>}
        </div>

        <div className="divide-y divide-slate-800/60 text-xs">
          {[
            { key: "email_leave_updates", label: "Leave Application & Approval Alerts", desc: "Receive email updates when your supervisor reviews your leave" },
            { key: "email_payroll_updates", label: "Payslip Publication Notices", desc: "Get notified as soon as monthly payslips are released" },
            { key: "email_announcements", label: "Company-wide Announcements", desc: "Broadcast messages and important policy reminders" },
            { key: "push_attendance_alerts", label: "Shift & Attendance Reminders", desc: "Daily morning clock-in and work shift reminders" },
          ].map((item) => (
            <div key={item.key} className="py-3 flex items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-white">{item.label}</h4>
                <p className="text-[11px] text-slate-400">{item.desc}</p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={Boolean(prefs[item.key])}
                  onChange={() => handleTogglePref(item.key)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}