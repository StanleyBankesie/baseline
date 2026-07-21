import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { api } from "../../../../api/client.js";

const defaultSettings = [
  { module_code: "SALES_ORDER", status_trigger: "APPROVED", send_email: "N", send_sms: "N", send_whatsapp: "N" },
  { module_code: "PURCHASE_ORDER", status_trigger: "APPROVED", send_email: "N", send_sms: "N", send_whatsapp: "N" },
  { module_code: "SERVICE_ORDER", status_trigger: "APPROVED", send_email: "N", send_sms: "N", send_whatsapp: "N" },
  { module_code: "MAINTENANCE_JOB", status_trigger: "APPROVED", send_email: "N", send_sms: "N", send_whatsapp: "N" },
  { module_code: "PAYMENT_VOUCHER", status_trigger: "POSTED", send_email: "N", send_sms: "N", send_whatsapp: "N" },
];

export default function NotificationSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/notification-settings");
      const fetched = res.data?.items || [];
      
      // Merge fetched with defaults
      const merged = defaultSettings.map(ds => {
        const found = fetched.find(f => f.module_code === ds.module_code && f.status_trigger === ds.status_trigger);
        return found ? { ...ds, ...found } : ds;
      });
      setSettings(merged);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notification settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (index, field) => {
    const updated = [...settings];
    updated[index][field] = updated[index][field] === 'Y' ? 'N' : 'Y';
    setSettings(updated);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post("/admin/notification-settings", { items: settings });
      toast.success("Notification settings updated successfully.");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="px-6 pt-6">
        <h2 className="text-lg font-semibold text-gray-800">Notification Triggers</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure automatic notifications (Email, SMS, WhatsApp) for various system events.
        </p>
      </div>

      <div className="overflow-x-auto border-t border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
              <th className="px-6 py-4 font-medium">Module / Document</th>
              <th className="px-6 py-4 font-medium">Trigger Event</th>
              <th className="px-6 py-4 font-medium text-center">Email</th>
              <th className="px-6 py-4 font-medium text-center">SMS</th>
              <th className="px-6 py-4 font-medium text-center">WhatsApp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {settings.map((item, idx) => (
              <tr key={`${item.module_code}-${item.status_trigger}`} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-800">
                    {item.module_code.replace(/_/g, ' ')}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {item.status_trigger}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <input 
                    type="checkbox" 
                    className="toggle toggle-brand cursor-pointer"
                    checked={item.send_email === 'Y'}
                    onChange={() => handleToggle(idx, 'send_email')}
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <input 
                    type="checkbox" 
                    className="toggle toggle-brand cursor-pointer"
                    checked={item.send_sms === 'Y'}
                    onChange={() => handleToggle(idx, 'send_sms')}
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <input 
                    type="checkbox" 
                    className="toggle toggle-brand cursor-pointer"
                    checked={item.send_whatsapp === 'Y'}
                    onChange={() => handleToggle(idx, 'send_whatsapp')}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-gray-200 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
