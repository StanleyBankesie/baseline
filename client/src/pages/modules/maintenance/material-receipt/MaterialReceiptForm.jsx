/**
 * @fileoverview MaterialReceiptForm component.
 * Create or view a material receipt for maintenance job orders.
 */

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../../../../api/client";
import { toast } from "react-toastify";
import { useAuth } from "../../../../auth/AuthContext.jsx";

/**
 * MaterialReceiptForm component
 *
 * @returns {JSX.Element} The rendered component
 */
export default function MaterialReceiptForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = id === "new" || !id || window.location.pathname.endsWith("/new");
  const isView = new URLSearchParams(window.location.search).get("view") === "1";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [jobOrders, setJobOrders] = useState([]);

  const [form, setForm] = useState({
    reference_no: "Auto-generated",
    receipt_date: new Date().toISOString().split("T")[0],
    job_order_id: "",
    received_by: user?.username || "",
    remarks: "",
    status: "DRAFT",
  });

  const [details, setDetails] = useState([
    { id: 1, item_id: "", item_code: "", item_name: "", qty_received: 0, uom: "PCS", remarks: "" },
  ]);

  useEffect(() => {
    api
      .get("/maintenance/job-orders")
      .then((r) => setJobOrders(r.data?.items || []))
      .catch(() => {});

    if (!isNew) {
      setLoading(true);
      api
        .get(`/maintenance/material-receipts/${id}`)
        .then((r) => {
          const d = r.data;
          setForm({
            reference_no: d.reference_no || "",
            receipt_date: d.receipt_date ? d.receipt_date.split("T")[0] : "",
            job_order_id: d.job_order_id || "",
            received_by: d.received_by || "",
            remarks: d.remarks || "",
            status: d.status || "DRAFT",
          });
          if (Array.isArray(d.details) && d.details.length > 0) {
            setDetails(d.details);
          }
        })
        .catch((e) => setError(e?.response?.data?.message || "Failed to load"))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDetailChange = (idx, field, value) => {
    setDetails((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const addDetailRow = () => {
    setDetails((prev) => [
      ...prev,
      { id: Date.now(), item_id: "", item_code: "", item_name: "", qty_received: 0, uom: "PCS", remarks: "" },
    ]);
  };

  const removeDetailRow = (idx) => {
    setDetails((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { ...form, details };
      if (isNew) {
        await api.post("/maintenance/material-receipts", payload);
        toast.success("Material receipt created");
      } else {
        await api.put(`/maintenance/material-receipts/${id}`, payload);
        toast.success("Material receipt updated");
      }
      navigate("/maintenance/material-receipts");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save");
      toast.error(e?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const disabled = isView || !isNew && form.status === "RECEIVED";

  if (loading) return <div className="loading-spinner">Loading…</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isNew ? "New Material Receipt" : `Material Receipt – ${form.reference_no}`}
          </h1>
          <p className="page-subtitle">Record materials received from inventory</p>
        </div>
        <Link to="/maintenance/material-receipts" className="btn btn-secondary">
          ← Back to List
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="form-container">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Receipt Details</h2>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Reference No.</label>
                <input
                  className="form-input"
                  name="reference_no"
                  value={form.reference_no}
                  onChange={handleChange}
                  disabled={disabled || (!isNew && form.reference_no !== "Auto-generated")}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Receipt Date</label>
                <input
                  type="date"
                  className="form-input"
                  name="receipt_date"
                  value={form.receipt_date}
                  onChange={handleChange}
                  disabled={disabled}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Job Order</label>
                <select
                  className="form-select"
                  name="job_order_id"
                  value={form.job_order_id}
                  onChange={handleChange}
                  disabled={disabled}
                >
                  <option value="">— Select Job Order —</option>
                  {jobOrders.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.job_order_no || `JO-${j.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Received By</label>
                <input
                  className="form-input"
                  name="received_by"
                  value={form.received_by}
                  onChange={handleChange}
                  disabled={disabled}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  disabled={disabled}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="RECEIVED">Received</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="form-group form-group-full">
                <label className="form-label">Remarks</label>
                <textarea
                  className="form-textarea"
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  rows={2}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="card mt-4">
          <div className="card-header flex justify-between items-center">
            <h2 className="card-title">Items Received</h2>
            {!disabled && (
              <button type="button" className="btn btn-sm btn-secondary" onClick={addDetailRow}>
                + Add Row
              </button>
            )}
          </div>
          <div className="card-body p-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th>Qty Received</th>
                  <th>UOM</th>
                  <th>Remarks</th>
                  {!disabled && <th>Remove</th>}
                </tr>
              </thead>
              <tbody>
                {details.map((row, idx) => (
                  <tr key={row.id || idx}>
                    <td>
                      <input
                        className="form-input form-input-sm"
                        value={row.item_code}
                        onChange={(e) => handleDetailChange(idx, "item_code", e.target.value)}
                        disabled={disabled}
                        placeholder="Code"
                      />
                    </td>
                    <td>
                      <input
                        className="form-input form-input-sm"
                        value={row.item_name}
                        onChange={(e) => handleDetailChange(idx, "item_name", e.target.value)}
                        disabled={disabled}
                        placeholder="Name"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="form-input form-input-sm"
                        value={row.qty_received}
                        min={0}
                        onChange={(e) => handleDetailChange(idx, "qty_received", parseFloat(e.target.value) || 0)}
                        disabled={disabled}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input form-input-sm"
                        value={row.uom}
                        onChange={(e) => handleDetailChange(idx, "uom", e.target.value)}
                        disabled={disabled}
                        placeholder="UOM"
                      />
                    </td>
                    <td>
                      <input
                        className="form-input form-input-sm"
                        value={row.remarks}
                        onChange={(e) => handleDetailChange(idx, "remarks", e.target.value)}
                        disabled={disabled}
                      />
                    </td>
                    {!disabled && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => removeDetailRow(idx)}
                          disabled={details.length === 1}
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!disabled && (
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create Receipt" : "Save Changes"}
            </button>
            <Link to="/maintenance/material-receipts" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}
