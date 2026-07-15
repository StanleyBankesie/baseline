/**
 * @fileoverview CostCentersPage component.
 * Provides functionality for CostCentersPage.
 */

import React, { useEffect, useState } from "react";
import { api } from "../../../../api/client";
import { Link } from "react-router-dom";

/**
 *  component
 * 
 * @returns {JSX.Element} The rendered component
 */
export default function CostCentersPage() {
  const [items, setItems] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ id: null, code: "", name: "", description: "", default_currency_id: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [ccResp, curResp] = await Promise.all([
        api.get("/finance/cost-centers"),
        api.get("/finance/currencies").catch(() => ({ data: { items: [] } }))
      ]);
      const rows = Array.isArray(ccResp.data?.items) ? ccResp.data.items : [];
      setItems(rows);
      setCurrencies(Array.isArray(curResp.data?.items) ? curResp.data.items : []);
    } catch (e) {
      setError("Cost center API not available");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const generateCode = () => {
    const codes = items.map((it) => it.code).filter(Boolean);
    let next = 1;
    while (codes.includes(String(next).padStart(4, "0"))) next++;
    return String(next).padStart(4, "0");
  };

  const edit = (it) => {
    setForm({
      id: it.id,
      code: it.code || "",
      name: it.name || "",
      description: it.description || "",
      default_currency_id: it.default_currency_id || "",
    });
    setSuccess("");
    setError("");
  };

  const cancelEdit = () => {
    setForm({ id: null, code: "", name: "", description: "", default_currency_id: "" });
    setSuccess("");
    setError("");
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        code: form.id ? form.code : generateCode(),
        name: form.name,
        description: form.description,
        default_currency_id: form.default_currency_id,
        isActive: 1,
      };
      
      if (form.id) {
        await api.put(`/finance/cost-centers/${form.id}`, payload);
        setSuccess("Cost center updated successfully");
      } else {
        await api.post("/finance/cost-centers", payload);
        setSuccess("Cost center saved successfully");
      }
      
      setForm({ id: null, code: "", name: "", description: "", default_currency_id: "" });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save cost center");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Link
            to="/finance"
            className="btn btn-sm btn-outline gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Finance
          </Link>
          <h1 className="text-2xl font-bold">Cost Centers</h1>
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-brand text-white rounded-t-lg">
          <div className="font-semibold">Manage Cost Centers</div>
        </div>
        <div className="card-body space-y-4">
          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          {success ? (
            <div className="text-sm text-green-700">{success}</div>
          ) : null}
          <form
            onSubmit={save}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Operations"
                required
              />
            </div>
            <div>
              <label className="label">Default Currency</label>
              <select
                className="input"
                value={form.default_currency_id || ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, default_currency_id: e.target.value }))
                }
              >
                <option value="">-- None --</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.code || c.currency_code} - {c.name || c.currency_name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Details about this cost center..."
                rows={2}
              />
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              {form.id && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              )}
              <button
                className="btn-primary"
                disabled={saving || !form.name}
              >
                {saving ? "Saving..." : form.id ? "Update" : "Save"}
              </button>
            </div>
          </form>
          <div className="overflow-x-auto mt-6">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Currency</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-slate-500">
                      No cost centers
                    </td>
                  </tr>
                ) : null}
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.code}</td>
                    <td className="font-semibold">{it.name}</td>
                    <td className="text-sm text-slate-600 max-w-[200px] truncate">{it.description || "—"}</td>
                    <td className="text-sm">
                      {it.default_currency_id ? currencies.find(c => String(c.id) === String(it.default_currency_id))?.code || "—" : "—"}
                    </td>
                    <td>
                      {Number(it.is_active) === 1 ? (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">Active</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">Inactive</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => edit(it)}
                        className="btn-sm btn-outline text-xs"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
