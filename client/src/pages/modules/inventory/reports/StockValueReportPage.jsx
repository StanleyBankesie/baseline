import React, { useEffect, useMemo, useState } from "react";
import useSort from "@/hooks/useSort.js";
import SortableHeader from "@/components/SortableHeader.jsx";
import { api } from "../../../../api/client.js";
import { Link } from "react-router-dom";

export default function StockValueReportPage() {
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [itemGroups, setItemGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [itemGroupId, setItemGroupId] = useState("");
  const [q, setQ] = useState("");
  const [itemOptions, setItemOptions] = useState([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    Promise.all([
      api.get("/inventory/warehouses"),
      api.get("/inventory/item-groups").catch(() => ({ data: { items: [] } })),
      api.get("/inventory/stock-value"),
      api.get("/inventory/items"),
    ])
      .then(([whRes, igRes, svRes, itRes]) => {
        if (!mounted) return;
        setWarehouses(Array.isArray(whRes?.data?.items) ? whRes.data.items : []);
        setItemGroups(Array.isArray(igRes?.data?.items) ? igRes.data.items : []);
        setItems(Array.isArray(svRes?.data?.items) ? svRes.data.items : []);
        setItemOptions(Array.isArray(itRes?.data?.items) ? itRes.data.items : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Failed to load stock value report");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchReport() {
      try {
        setLoading(true);
        const params = {};
        if (warehouseId) params.warehouseId = warehouseId;
        if (itemGroupId) params.itemGroupId = itemGroupId;
        if (q.trim()) params.q = q.trim();
        const res = await api.get("/inventory/stock-value", { params });
        if (!cancelled) {
          setItems(Array.isArray(res?.data?.items) ? res.data.items : []);
          setError("");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || "Failed to load stock value report");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    fetchReport();
    return () => {
      cancelled = true;
    };
  }, [warehouseId, itemGroupId, q]);

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    return items.filter((r) => {
      if (!key) return true;
      return (
        String(r.item_code || "").toLowerCase().includes(key) || 
        String(r.item_name || "").toLowerCase().includes(key)
      );
    });
  }, [items, q]);

  const { sorted: sorted_filtered, sortKey, sortDir, toggle } = useSort(filtered, "item_name", "asc");

  const totalReportValue = useMemo(() => {
    return sorted_filtered.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  }, [sorted_filtered]);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="card-header bg-brand text-white rounded-t-lg">
          <div className="flex justify-between items-center text-white">
            <div>
              <h1 className="text-2xl font-bold dark:text-brand-300">
                Stock Value Report
              </h1>
              <p className="text-sm mt-1">
                Value of stock based on current quantities and cost price
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/inventory" className="btn btn-secondary">
                Return to Menu
              </Link>
            </div>
          </div>
        </div>
        <div className="card-body">
          {error ? (
            <div className="text-red-600 text-sm mb-3">{error}</div>
          ) : null}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="Search item..."
              className="input flex-1"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              list="stock_val_item_options"
            />
            <datalist id="stock_val_item_options">
              {itemOptions.slice(0, 1000).map((it) => (
                <option key={it.id} value={it.item_code}>
                  {it.item_name}
                </option>
              ))}
            </datalist>
            <select
              className="input w-full md:w-64"
              value={itemGroupId}
              onChange={(e) => setItemGroupId(e.target.value)}
              title="Item Group"
            >
              <option value="">All Item Groups</option>
              {itemGroups.map((ig) => (
                <option key={ig.id} value={ig.id}>
                  {ig.group_name}
                </option>
              ))}
            </select>
            <select
              className="input w-full md:w-64"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              title="Warehouse"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.warehouse_name}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <SortableHeader label="Item Code" sortKey="item_code" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="w-[14%] font-bold" />
                  <SortableHeader label="Item Name" sortKey="item_name" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="w-[14%] font-bold" />
                  <SortableHeader label="Item Group" sortKey="item_group" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="w-[14%] font-bold" />
                  <SortableHeader label="Quantity" sortKey="qty" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="w-[14%] font-bold text-right" />
                  <SortableHeader label="UOM" sortKey="uom" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="w-[14%] font-bold" />
                  <SortableHeader label="Cost Price" sortKey="cost_price" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="w-[14%] font-bold text-right" />
                  <SortableHeader label="Total Value" sortKey="value" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="w-[14%] font-bold text-right" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-500">
                      Loading...
                    </td>
                  </tr>
                ) : null}
                {!loading && !filtered.length ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-500">
                      No records
                    </td>
                  </tr>
                ) : null}
                {sorted_filtered.map((r, i) => (
                  <tr key={i}>
                    <td className="font-medium text-brand-700 dark:text-brand-300">
                      {r.item_code}
                    </td>
                    <td>{r.item_name}</td>
                    <td>{r.item_group || "-"}</td>
                    <td className="text-right">
                      {Number(r.qty || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td>{r.uom || "-"}</td>
                    <td className="text-right">
                      {Number(r.cost_price || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="text-right font-semibold">
                      {Number(r.value || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
              {!loading && filtered.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold">
                    <td colSpan="6" className="text-right py-3">Total Value:</td>
                    <td className="text-right text-brand-600 dark:text-brand-400 py-3">
                      {totalReportValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
