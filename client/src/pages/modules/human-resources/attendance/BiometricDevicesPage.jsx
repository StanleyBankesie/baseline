import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Laptop,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldCheck,
  Key,
  HardDrive,
  RefreshCw,
  Clock,
  ChevronLeft,
} from "lucide-react";
import { api } from "@/api/client.js";
import { toast } from "react-toastify";
import Modal from "@/components/Modal";

export default function BiometricDevicesPage() {
  const [devices, setDevices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  const [form, setForm] = useState({
    device_name: "",
    device_type: "KIOSK",
    branch_id: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [devRes, branchRes] = await Promise.all([
        api.get("/hr/biometrics/devices"),
        api.get("/admin/branches").catch(() => ({ data: { items: [] } })),
      ]);
      setDevices(devRes.data?.items || []);
      setBranches(branchRes.data?.items || []);
    } catch (err) {
      toast.error("Failed to load biometric devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/hr/biometrics/devices", form);
      toast.success(res.data?.message || "Device registered successfully");
      setShowModal(false);
      setForm({ device_name: "", device_type: "KIOSK", branch_id: "" });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to register device");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this biometric terminal device?")) return;
    try {
      await api.delete(`/hr/biometrics/devices/${id}`);
      toast.success("Device removed successfully");
      loadData();
    } catch (err) {
      toast.error("Failed to remove device");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    toast.info("Device key copied to clipboard");
    setTimeout(() => setCopiedKey(""), 3000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/human-resources/attendance"
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Time & Attendance
            </Link>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Laptop className="w-5 h-5 text-emerald-500" /> Authorized Biometric Devices & Kiosks
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Register and manage dedicated laptops, tablets, and webcam terminals authorized to clock in employees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/human-resources/biometric-clock"
            className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-2"
          >
            Launch Attendance Kiosk
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2"
          >
            <Plus className="w-4 h-4" /> Register New Device
          </button>
        </div>
      </div>

      {/* Device List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Device Name & Code</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Assigned Branch</th>
                <th className="px-4 py-3">Terminal API Key</th>
                <th className="px-4 py-3">Heartbeat</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading registered devices...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No dedicated biometric terminals registered. Ordinary laptop webcams operate automatically.
                  </td>
                </tr>
              ) : (
                devices.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {dev.device_name}
                      </div>
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                        {dev.device_code}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {dev.device_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{dev.branch_name || "All Branches"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded max-w-xs justify-between">
                        <span className="truncate">{dev.api_key}</span>
                        <button
                          onClick={() => copyToClipboard(dev.api_key)}
                          className="hover:text-emerald-500 text-slate-400"
                        >
                          {copiedKey === dev.api_key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[11px]">
                      {dev.last_heartbeat ? new Date(dev.last_heartbeat).toLocaleString() : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          dev.is_active
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {dev.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(dev.id)}
                        className="text-rose-500 hover:text-rose-600 p-1 rounded"
                        title="Delete device"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Modal */}
      {showModal && (
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="Register Biometric Device"
          subtitle="Generate terminal credentials for a dedicated kiosk or attendance tablet"
          icon={<HardDrive className="text-emerald-500 w-5 h-5" />}
          maxWidth="max-w-md"
          showFooter={false}
        >
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Device / Terminal Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Front Reception Kiosk"
                className="input w-full"
                value={form.device_name}
                onChange={(e) => setForm({ ...form, device_name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Device Type
              </label>
              <select
                className="input w-full"
                value={form.device_type}
                onChange={(e) => setForm({ ...form, device_type: e.target.value })}
              >
                <option value="KIOSK">Dedicated Kiosk Terminal</option>
                <option value="LAPTOP_WEBCAM">Reception / HR Laptop</option>
                <option value="USB_TERMINAL">External USB Webcam</option>
                <option value="TABLET">Wall Tablet</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Branch Location (Optional)
              </label>
              <select
                className="input w-full"
                value={form.branch_id}
                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              >
                <option value="">-- All Branches --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary text-xs px-4 py-2">
                Save & Generate Key
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
