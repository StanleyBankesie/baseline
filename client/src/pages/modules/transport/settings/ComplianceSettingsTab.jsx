import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import api from "../../../../api/client.js";
import { X, Pencil, Trash2, ShieldCheck, FileText, Building2 } from "lucide-react";

function ModalForm({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function CrudSection({ title, icon, emptyMsg, rows, loading, onAdd, onEdit, onDelete }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        <button onClick={onAdd} className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-3">
          Add
        </button>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden border border-slate-100 dark:border-slate-700">
        <table className="min-w-full">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3 w-24 text-center">Status</th>
              <th className="px-4 py-3 text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : rows.length > 0 ? rows.map(row => (
              <tr key={row.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-slate-700">{row.setup_value}</td>
                <td className="px-4 py-3 text-sm text-center">
                  {row.is_active ? (
                    <span className="badge badge-success badge-sm">Active</span>
                  ) : (
                    <span className="badge badge-neutral badge-sm">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => onEdit(row)} className="p-1.5 text-brand hover:text-brand-700 rounded hover:bg-brand-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDelete(row.id)} className="p-1.5 text-rose-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">{emptyMsg}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ComplianceSettingsTab() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    ISSUING_AUTHORITY: [],
    POLICY_TYPE: [],
    INSURANCE_COMPANY: [],
    EXPENSE_TYPE: []
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ setup_value: "", is_active: 1 });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/transport/setup");
      const items = res.data?.data?.items || [];
      const grouped = { ISSUING_AUTHORITY: [], POLICY_TYPE: [], INSURANCE_COMPANY: [], EXPENSE_TYPE: [] };
      items.forEach(item => {
        if (grouped[item.setup_type]) {
          grouped[item.setup_type].push(item);
        }
      });
      setData(grouped);
    } catch (err) {
      toast.error("Failed to load compliance settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = (type) => {
    setModalType(type);
    setEditingItem(null);
    setForm({ setup_value: "", is_active: 1 });
    setModalOpen(true);
  };

  const openEdit = (type, item) => {
    setModalType(type);
    setEditingItem(item);
    setForm({ setup_value: item.setup_value, is_active: item.is_active });
    setModalOpen(true);
  };

  const saveItem = async () => {
    if (!form.setup_value.trim()) {
      toast.error("Value is required");
      return;
    }
    setSaving(true);
    try {
      const payload = { setup_type: modalType, setup_value: form.setup_value, is_active: form.is_active };
      if (editingItem) {
        await api.put(`/transport/setup/${editingItem.id}`, payload);
        toast.success("Updated successfully");
      } else {
        await api.post("/transport/setup", payload);
        toast.success("Created successfully");
      }
      setModalOpen(false);
      loadData();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await api.delete(`/transport/setup/${id}`);
      toast.success("Deleted successfully");
      loadData();
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const getTypeLabel = (type) => {
    if (type === "ISSUING_AUTHORITY") return "Issuing Authority";
    if (type === "POLICY_TYPE") return "Policy Type";
    if (type === "INSURANCE_COMPANY") return "Insurance Company";
    if (type === "EXPENSE_TYPE") return "Expense Type";
    return type;
  };

  return (
    <div className="space-y-6 max-w-5xl pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CrudSection
          title="Issuing Authorities"
          icon={<ShieldCheck size={18} className="text-brand" />}
          emptyMsg="No issuing authorities defined."
          rows={data.ISSUING_AUTHORITY}
          loading={loading}
          onAdd={() => openAdd("ISSUING_AUTHORITY")}
          onEdit={(item) => openEdit("ISSUING_AUTHORITY", item)}
          onDelete={deleteItem}
        />
        <CrudSection
          title="Policy Types"
          icon={<FileText size={18} className="text-brand" />}
          emptyMsg="No policy types defined."
          rows={data.POLICY_TYPE}
          loading={loading}
          onAdd={() => openAdd("POLICY_TYPE")}
          onEdit={(item) => openEdit("POLICY_TYPE", item)}
          onDelete={deleteItem}
        />
        <CrudSection
          title="Insurance Companies"
          icon={<Building2 size={18} className="text-brand" />}
          emptyMsg="No insurance companies defined."
          rows={data.INSURANCE_COMPANY}
          loading={loading}
          onAdd={() => openAdd("INSURANCE_COMPANY")}
          onEdit={(item) => openEdit("INSURANCE_COMPANY", item)}
          onDelete={deleteItem}
        />
        <CrudSection
          title="Expense Types"
          icon={<FileText size={18} className="text-brand" />}
          emptyMsg="No expense types defined."
          rows={data.EXPENSE_TYPE}
          loading={loading}
          onAdd={() => openAdd("EXPENSE_TYPE")}
          onEdit={(item) => openEdit("EXPENSE_TYPE", item)}
          onDelete={deleteItem}
        />
      </div>

      <ModalForm 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={`${editingItem ? "Edit" : "New"} ${getTypeLabel(modalType)}`}
      >
        <div className="space-y-4">
          <div className="form-control">
            <label className="label text-sm font-medium text-slate-700">Value <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              className="input input-bordered w-full"
              value={form.setup_value}
              onChange={e => setForm({...form, setup_value: e.target.value})}
              placeholder="Enter value"
            />
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input 
                type="checkbox" 
                className="toggle toggle-primary"
                checked={form.is_active === 1}
                onChange={e => setForm({...form, is_active: e.target.checked ? 1 : 0})}
              />
              <span className="label-text">Active Status</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveItem} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
