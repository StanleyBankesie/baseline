import React, { useState, useEffect } from "react";
import { usePortalAuth } from "../context/PortalAuthContext.jsx";
import portalApi from "../api/portalClient.js";
import { User, Mail, Phone, MapPin, Building, Briefcase, Calendar, Shield, Save, CheckCircle2, AlertCircle } from "lucide-react";

export default function PortalProfilePage() {
  const { employee, user, refreshProfile } = usePortalAuth();

  const [phone, setPhone] = useState(employee?.phone || "");
  const [address, setAddress] = useState(employee?.address || "");
  const [emergencyName, setEmergencyName] = useState(employee?.emergency_contact_name || "");
  const [emergencyPhone, setEmergencyPhone] = useState(employee?.emergency_contact_phone || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (employee) {
      setPhone(employee.phone || "");
      setAddress(employee.address || "");
      setEmergencyName(employee.emergency_contact_name || "");
      setEmergencyPhone(employee.emergency_contact_phone || "");
    }
  }, [employee]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    try {
      await portalApi.put("/profile/update", {
        phone,
        address,
        emergency_contact_name: emergencyName,
        emergency_contact_phone: emergencyPhone,
      });
      await refreshProfile();
      setMsg("Personal contact details updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center sm:items-start gap-4">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-teal-800/40 border-2 border-teal-500/30 flex items-center justify-center shrink-0">
          {employee?.picture_url ? (
            <img src={employee.picture_url} alt={employee.first_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-teal-300">
              {(employee?.first_name?.[0] || "E").toUpperCase()}
            </span>
          )}
        </div>
        <div className="text-center sm:text-left flex-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 text-[11px] font-semibold mb-1 border border-teal-500/20">
            {employee?.status || "ACTIVE"}
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {employee?.first_name} {employee?.last_name}
          </h1>
          <p className="text-xs text-slate-400">
            {employee?.pos_name || "Employee"} · <span className="text-slate-300">{employee?.dept_name || "Department"}</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Employee Code: <span className="text-slate-300 font-mono">{employee?.emp_code || "N/A"}</span>
          </p>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center gap-2 text-teal-300 text-xs">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{msg}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Employment Details (Read-only HR data) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-teal-400" />
          <span>Employment Information</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
            <span className="text-white font-medium">{employee?.dept_name || "Not assigned"}</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Position / Role</span>
            <span className="text-white font-medium">{employee?.pos_name || "Not assigned"}</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employment Type</span>
            <span className="text-white font-medium">{employee?.employment_type || "Full-Time"}</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date of Joining</span>
            <span className="text-white font-medium">{employee?.joining_date || "N/A"}</span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reporting Manager</span>
            <span className="text-white font-medium">
              {employee?.manager_first_name ? `${employee.manager_first_name} ${employee.manager_last_name || ''}` : "Management"}
            </span>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Work Email</span>
            <span className="text-white font-medium">{employee?.email || user?.email || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Editable Contact & Emergency Info */}
      <form onSubmit={handleSave} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-teal-400" />
          <span>Contact & Emergency Details</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +233 24 123 4567"
              className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Residential Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. House No 45, Accra"
              className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Emergency Contact Name</label>
            <input
              type="text"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="Next of kin / contact name"
              className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Emergency Contact Phone</label>
            <input
              type="text"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="Emergency phone number"
              className="w-full px-3.5 py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="pt-2 text-right">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Profile Details"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}