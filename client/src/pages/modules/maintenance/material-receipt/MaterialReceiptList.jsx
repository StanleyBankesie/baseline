/**
 * @fileoverview MaterialReceiptList component.
 * Lists material receipts issued from inventory for maintenance job orders.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../../api/client";
import { toast } from "react-toastify";
import { filterAndSort } from "@/utils/searchUtils.js";
import useSort from "@/hooks/useSort.js";
import SortableHeader from "@/components/SortableHeader.jsx";

/**
 * MaterialReceiptList component
 *
 * @returns {JSX.Element} The rendered component
 */
export default function MaterialReceiptList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  const { sortConfig, handleSort } = useSort({ key: "receipt_date", direction: "desc" });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get("/maintenance/material-receipts")
      .then((res) => {
        if (mounted)
          setItems(Array.isArray(res.data?.items) ? res.data.items : Array.isArray(res.data) ? res.data : []);
      })
      .catch((e) => setError(e?.response?.data?.message || "Failed to load material receipts"))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const getStatusBadge = (status) => {
    const b = {
      DRAFT: "badge-info",
      RECEIVED: "badge-success",
      PARTIAL: "badge-warning",
      CANCELLED: "badge-error",
    };
    return b[status] || "badge-info";
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this material receipt?")) return;
    try {
      await api.delete(`/maintenance/material-receipts/${id}`);
      setItems((prev) => prev.filter((r) => r.id !== id));
      toast.success("Material receipt deleted");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete");
    }
  };

  const filtered = useMemo(
    () =>
      filterAndSort(items, searchTerm, sortConfig, [
        "reference_no",
        "job_order_no",
        "status",
      ]),
    [items, searchTerm, sortConfig]
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Material Receipts</h1>
          <p className="page-subtitle">Materials received from inventory for maintenance</p>
        </div>
        <Link to="/maintenance/material-receipts/new" className="btn btn-primary">
          + New Receipt
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <input
            type="text"
            className="form-input"
            placeholder="Search receipts…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="table-container">
          {loading ? (
            <div className="loading-spinner">Loading…</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableHeader label="Reference No." sortKey="reference_no" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Job Order" sortKey="job_order_no" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Receipt Date" sortKey="receipt_date" sortConfig={sortConfig} onSort={handleSort} />
                  <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted">
                      No material receipts found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id}>
                      <td>{item.reference_no || `MR-${item.id}`}</td>
                      <td>{item.job_order_no || item.job_order_id || "—"}</td>
                      <td>{item.receipt_date ? new Date(item.receipt_date).toLocaleDateString() : "—"}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(item.status)}`}>
                          {item.status || "DRAFT"}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <Link
                            to={`/maintenance/material-receipts/${item.id}`}
                            className="btn btn-sm btn-secondary"
                          >
                            View
                          </Link>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
