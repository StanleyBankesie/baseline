import React, { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { toast } from "react-toastify";
import {
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  LocateFixed,
  Radio,
  Sliders,
  Bell,
  Mail,
  Smartphone,
  CheckCircle2,
  X,
  Loader2,
  Navigation,
} from "lucide-react";

export default function BiometricLocationSecuritySection() {
  const [locations, setLocations] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [faceServiceHealth, setFaceServiceHealth] = useState(null);

  // Settings state
  const [settings, setSettings] = useState({
    match_threshold: 0.45,
    liveness_threshold: 0.65,
    require_liveness: false,
    enforce_geofence: true,
    geofence_policy: "FLAG_AND_NOTIFY", // STRICT_REJECT or FLAG_AND_NOTIFY
    default_geofence_radius: 150,
    alert_email_enabled: true,
    alert_sms_enabled: false,
    alert_recipients: "",
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locForm, setLocForm] = useState({
    location_name: "",
    code: "",
    address: "",
    latitude: "",
    longitude: "",
    geofence_radius: 150,
    facility_type: "OFFICE",
    branch_id: "",
    is_active: true,
  });

  // Load locations, settings and face service health
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoadingLocations(true);
    setSettingsLoading(true);
    try {
      const [locRes, setRes, branchRes, healthRes] = await Promise.allSettled([
        api.get("/hr/biometrics/locations"),
        api.get("/hr/biometrics/settings"),
        api.get("/adm/branches"),
        api.get("/hr/biometrics/health"),
      ]);

      if (locRes.status === "fulfilled" && locRes.value.data?.items) {
        setLocations(locRes.value.data.items);
      }
      if (setRes.status === "fulfilled" && setRes.value.data?.settings) {
        const s = setRes.value.data.settings;
        setSettings({
          match_threshold: Number(s.match_threshold ?? 0.45),
          liveness_threshold: Number(s.liveness_threshold ?? 0.65),
          require_liveness: Boolean(s.require_liveness),
          enforce_geofence: Boolean(s.enforce_geofence ?? 1),
          geofence_policy: s.geofence_policy || "FLAG_AND_NOTIFY",
          default_geofence_radius: Number(s.default_geofence_radius ?? 150),
          alert_email_enabled: Boolean(s.alert_email_enabled ?? 1),
          alert_sms_enabled: Boolean(s.alert_sms_enabled ?? 0),
          alert_recipients: s.alert_recipients || "",
        });
      }
      if (branchRes.status === "fulfilled" && branchRes.value.data?.data) {
        setBranches(branchRes.value.data.data);
      }
      if (healthRes.status === "fulfilled" && healthRes.value.data) {
        setFaceServiceHealth(healthRes.value.data.service || healthRes.value.data);
      }
    } catch (err) {
      console.warn("Error loading biometric & location data:", err);
    } finally {
      setLoadingLocations(false);
      setSettingsLoading(false);
    }
  }

  // Save Settings
  async function handleSaveSettings(e) {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      await api.post("/hr/biometrics/settings", settings);
      toast.success("Biometric security & geofence rules updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  }

  // Open Create/Edit Modal
  function handleOpenModal(loc = null) {
    if (loc) {
      setEditingLocation(loc);
      setLocForm({
        location_name: loc.location_name || "",
        code: loc.code || "",
        address: loc.address || "",
        latitude: loc.latitude != null ? String(loc.latitude) : "",
        longitude: loc.longitude != null ? String(loc.longitude) : "",
        geofence_radius: loc.geofence_radius || 150,
        facility_type: loc.facility_type || "OFFICE",
        branch_id: loc.branch_id || "",
        is_active: loc.is_active === 1 || loc.is_active === true,
      });
    } else {
      setEditingLocation(null);
      setLocForm({
        location_name: "",
        code: "",
        address: "",
        latitude: "",
        longitude: "",
        geofence_radius: settings.default_geofence_radius || 150,
        facility_type: "OFFICE",
        branch_id: branches[0]?.id || "",
        is_active: true,
      });
    }
    setModalOpen(true);
  }

  // Fetch Current Device GPS
  function handleDetectCurrentGPS() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    toast.info("Acquiring GPS position...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        toast.success(`Coordinates acquired: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)} (±${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        toast.error(`Could not acquire GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // Save Location
  async function handleSaveLocation(e) {
    e.preventDefault();
    if (!locForm.location_name.trim()) {
      toast.warning("Location name is required");
      return;
    }

    setSavingLocation(true);
    try {
      const payload = {
        ...locForm,
        id: editingLocation?.id,
        latitude: locForm.latitude !== "" ? Number(locForm.latitude) : null,
        longitude: locForm.longitude !== "" ? Number(locForm.longitude) : null,
        geofence_radius: Number(locForm.geofence_radius) || 150,
      };

      await api.post("/hr/biometrics/locations", payload);
      toast.success(editingLocation ? "Work location updated successfully" : "New acceptable work location added");
      setModalOpen(false);
      // Reload locations
      const locRes = await api.get("/hr/biometrics/locations");
      if (locRes.data?.items) setLocations(locRes.data.items);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save work location");
    } finally {
      setSavingLocation(false);
    }
  }

  // Delete Location
  async function handleDeleteLocation(id, name) {
    if (!window.confirm(`Are you sure you want to remove the work location "${name}"?`)) return;
    try {
      await api.delete(`/hr/biometrics/locations/${id}`);
      toast.success("Location removed");
      setLocations((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete location");
    }
  }

  return (
    <div className="card border-brand-200 dark:border-brand-800 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/80">
      <div className="card-body space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/90 text-white flex items-center justify-center shadow-inner">
              <ShieldCheck size={22} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span>InsightFace Biometric Attendance & Location Geofencing</span>
              </div>
              <div className="text-xs text-slate-500">
                Manage acceptable work site locations, GPS geofence radiuses, and biometric out-of-location security alerts.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {faceServiceHealth?.online ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                InsightFace ArcFace 512-D Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full border border-rose-300 dark:border-rose-800">
                <AlertTriangle size={13} className="text-rose-500" /> Face Service Offline
              </span>
            )}
          </div>
        </div>

        {/* Section 1: Acceptable Work Locations & Geofences */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-500" /> Acceptable Work Locations & Geofence Radii
              </h2>
              <p className="text-xs text-slate-500">
                Employees assigned to these locations must be within the geofence perimeter to clock in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="btn-primary text-xs inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500"
            >
              <Plus size={14} /> Add Acceptable Location
            </button>
          </div>

          {loadingLocations ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="p-6 text-center border border-dashed rounded-xl border-slate-300 dark:border-slate-700 text-xs text-slate-400 space-y-2">
              <Navigation className="w-6 h-6 mx-auto text-slate-300" />
              <p>No acceptable work locations configured yet.</p>
              <button
                type="button"
                onClick={() => handleOpenModal()}
                className="text-emerald-600 hover:underline font-semibold"
              >
                Create your first geofenced work site
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Location Name</th>
                    <th className="py-2.5 px-3 font-semibold">Code / Type</th>
                    <th className="py-2.5 px-3 font-semibold">Branch</th>
                    <th className="py-2.5 px-3 font-semibold">GPS Coordinates</th>
                    <th className="py-2.5 px-3 font-semibold">Geofence Radius</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {locations.map((loc) => {
                    const hasGPS = loc.latitude != null && loc.longitude != null;
                    return (
                      <tr key={loc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {loc.location_name}
                          {loc.address && <div className="text-[11px] text-slate-400 truncate max-w-xs">{loc.address}</div>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                            {loc.code || "—"}
                          </span>
                          <span className="ml-1.5 text-[10px] text-slate-400 uppercase">{loc.facility_type || "OFFICE"}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          {loc.branch_name || "All Branches"}
                        </td>
                        <td className="py-2.5 px-3">
                          {hasGPS ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                              <MapPin size={11} /> {Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}
                            </span>
                          ) : (
                            <span className="text-amber-500 text-[11px] flex items-center gap-1">
                              <AlertTriangle size={11} /> No GPS Set
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                          <span className="px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                            {loc.geofence_radius || 150} meters
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {loc.is_active ? (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(loc)}
                            className="p-1 text-slate-400 hover:text-brand-600 transition"
                            title="Edit Location"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLocation(loc.id, loc.location_name)}
                            className="p-1 text-slate-400 hover:text-rose-500 transition"
                            title="Delete Location"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Biometric Calibration & Geofence Policy */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-500" /> Biometric Calibration & Location Security Rules
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Geofence Enforcement Policy */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-500" /> GPS Geofence Enforcement
                </span>
                <input
                  type="checkbox"
                  checked={settings.enforce_geofence}
                  onChange={(e) => setSettings({ ...settings, enforce_geofence: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Out-of-Location Policy</label>
                <select
                  value={settings.geofence_policy}
                  onChange={(e) => setSettings({ ...settings, geofence_policy: e.target.value })}
                  disabled={!settings.enforce_geofence}
                  className="input w-full text-xs"
                >
                  <option value="FLAG_AND_NOTIFY">Flag for Review & Send Security Alert (Allow Clock-in)</option>
                  <option value="STRICT_REJECT">Strict Rejection (Block Clock-in Outside Geofence)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {settings.geofence_policy === "STRICT_REJECT"
                    ? "Attendance attempts outside authorized coordinates are immediately rejected."
                    : "Clock-in succeeds but is flagged as 'PENDING_REVIEW' and managers are alerted."}
                </p>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">
                  Default Geofence Radius: <strong>{settings.default_geofence_radius}m</strong>
                </label>
                <input
                  type="range"
                  min="30"
                  max="1000"
                  step="10"
                  value={settings.default_geofence_radius}
                  onChange={(e) => setSettings({ ...settings, default_geofence_radius: Number(e.target.value) })}
                  disabled={!settings.enforce_geofence}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>

            {/* InsightFace Biometric Sensitivity */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    InsightFace Cosine Similarity: <strong className="text-emerald-600 font-mono">{Number(settings.match_threshold).toFixed(3)}</strong>
                  </span>
                  <span className="text-[11px] text-slate-400">Standard: 0.450</span>
                </div>
                <input
                  type="range"
                  min="0.300"
                  max="0.650"
                  step="0.005"
                  value={settings.match_threshold}
                  onChange={(e) => setSettings({ ...settings, match_threshold: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Higher threshold requires stricter facial landmark correspondence.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 block">Require Live Anti-Spoofing</span>
                  <span className="text-[11px] text-slate-400">MiniFASNet presentation attack check</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.require_liveness}
                  onChange={(e) => setSettings({ ...settings, require_liveness: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Security Alert Recipients & Automated Dispatch */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-emerald-500" /> Out-of-Location Security Alert Dispatch
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.alert_email_enabled}
                  onChange={(e) => setSettings({ ...settings, alert_email_enabled: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Mail size={13} className="text-slate-400" /> Email Alerts
              </label>
              <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.alert_sms_enabled}
                  onChange={(e) => setSettings({ ...settings, alert_sms_enabled: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Smartphone size={13} className="text-slate-400" /> Arkesel SMS
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Security Alert Recipients (Emails & Phone Numbers, comma-separated)
            </label>
            <input
              type="text"
              value={settings.alert_recipients}
              onChange={(e) => setSettings({ ...settings, alert_recipients: e.target.value })}
              placeholder="e.g. security@omnisuite.com, hr@company.com, +233241234567"
              className="input w-full text-xs font-mono"
            />
            <p className="text-[11px] text-slate-400">
              When an employee scans outside their authorized geofence radius, an instant alert with GPS distance and coordinates will be dispatched to these recipients.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="btn-primary text-xs inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500"
            >
              {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Save Biometric & Location Settings
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Location Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                {editingLocation ? "Edit Geofenced Work Location" : "Add Acceptable Work Location"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Location Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={locForm.location_name}
                    onChange={(e) => setLocForm({ ...locForm, location_name: e.target.value })}
                    placeholder="e.g. Accra Central Hub"
                    className="input w-full text-xs"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Site Code
                  </label>
                  <input
                    type="text"
                    value={locForm.code}
                    onChange={(e) => setLocForm({ ...locForm, code: e.target.value })}
                    placeholder="e.g. ACC-HQ-01"
                    className="input w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Branch Association
                  </label>
                  <select
                    value={locForm.branch_id}
                    onChange={(e) => setLocForm({ ...locForm, branch_id: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Facility Type
                  </label>
                  <select
                    value={locForm.facility_type}
                    onChange={(e) => setLocForm({ ...locForm, facility_type: e.target.value })}
                    className="input w-full text-xs"
                  >
                    <option value="OFFICE">Corporate Office</option>
                    <option value="WAREHOUSE">Warehouse / Depot</option>
                    <option value="CONSTRUCTION">Construction Site</option>
                    <option value="CLIENT_SITE">Client Facility</option>
                    <option value="REMOTE_HUB">Remote Hub</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={locForm.address}
                  onChange={(e) => setLocForm({ ...locForm, address: e.target.value })}
                  placeholder="Street name, landmark, town"
                  className="input w-full text-xs"
                />
              </div>

              {/* GPS Coordinates Section */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                    <Navigation size={12} className="text-emerald-500" /> GPS Geofence Coordinates
                  </span>
                  <button
                    type="button"
                    onClick={handleDetectCurrentGPS}
                    className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <LocateFixed size={12} /> Use My Current GPS
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={locForm.latitude}
                      onChange={(e) => setLocForm({ ...locForm, latitude: e.target.value })}
                      placeholder="e.g. 5.6037"
                      className="input w-full text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={locForm.longitude}
                      onChange={(e) => setLocForm({ ...locForm, longitude: e.target.value })}
                      placeholder="e.g. -0.1870"
                      className="input w-full text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">
                    Permitted Geofence Radius (Meters): <strong>{locForm.geofence_radius}m</strong>
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="1000"
                    step="10"
                    value={locForm.geofence_radius}
                    onChange={(e) => setLocForm({ ...locForm, geofence_radius: e.target.value })}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>30m (Strict)</span>
                    <span>150m (Standard)</span>
                    <span>500m (Large Campus)</span>
                    <span>1000m</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="loc_is_active"
                  checked={locForm.is_active}
                  onChange={(e) => setLocForm({ ...locForm, is_active: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="loc_is_active" className="text-slate-700 dark:text-slate-300 font-medium">
                  Active (Authorized for biometric attendance)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLocation}
                  className="btn-primary text-xs inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500"
                >
                  {savingLocation && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingLocation ? "Update Location" : "Save Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
