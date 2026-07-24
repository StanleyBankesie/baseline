import React, { useState, useEffect, useMemo } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import useSort from "@/hooks/useSort.js";
import SortableHeader from "@/components/SortableHeader.jsx";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

function filterByPrefix(items, { query, searchFields }) {
  if (!query) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter((item) =>
    searchFields.some((field) =>
      String(item[field] || "")
        .toLowerCase()
        .includes(lowerQuery),
    ),
  );
}

export default function ExpenseLogList() {
  const [viewMode, setViewMode] = useViewMode();
  const [items, setItems] = useState([]);
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [invItems, setInvItems] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    trip_id: "", vehicle_id: "", supplier_id: "", expense_date: new Date().toISOString().split('T')[0],
    amount: 0, currency: "GHS", description: "", status: "PENDING",
    expense_type: "Other", items: []
  });

  const [newItem, setNewItem] = useState({
    item_id: "", uom: "PCS", quantity: 1, unit_price: 0, total_amount: 0
  });
  const [itemQuery, setItemQuery] = useState("");

  const fetchExpenses = async () => {
    try {
      const res = await api.get("/transport/expense-logs");
      setItems(res.data?.items || []);
    } catch { toast.error("Failed to load expenses"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchExpenses();
    api.get("/transport/trips").then(r => setTrips(r.data?.data?.items || r.data?.items || [])).catch(() => {});
    api.get("/transport/vehicles").then(r => setVehicles(r.data?.data?.items || r.data?.items || [])).catch(() => {});
    api.get("/purchase/suppliers").then(r => setSuppliers(r.data?.data?.items || r.data?.items || [])).catch(() => {});
    api.get("/inventory/items").then(r => setInvItems(r.data?.items || r.data?.data?.items || [])).catch(() => {});
    api.get("/finance/currencies").then(r => setCurrencies(r.data?.items || r.data?.data?.items || [])).catch(() => {});
    api.get("/transport/setup").then(r => {
      const items = r.data?.data?.items || r.data?.items || [];
      setExpenseTypes(items.filter(i => i.setup_type === 'EXPENSE_TYPE' && i.is_active));
    }).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ 
      trip_id: "", vehicle_id: "", supplier_id: "", expense_date: new Date().toISOString().split('T')[0], 
      amount: 0, currency: "GHS", description: "", status: "PENDING", expense_type: "Other", items: [] 
    });
    setNewItem({ item_id: "", uom: "PCS", quantity: 1, unit_price: 0, total_amount: 0 });
    setItemQuery("");
    setShowModal(true);
  };

  const openEdit = (log) => {
    setEditing(log);
    setForm({ 
      trip_id: log.trip_id || "", vehicle_id: log.vehicle_id || "", supplier_id: log.supplier_id || "",
      expense_date: log.expense_date?.split('T')[0] || "", amount: log.amount || 0, 
      currency: log.currency || "GHS", description: log.description || "", 
      status: log.status, expense_type: log.expense_type || "Other",
      items: log.items || []
    });
    setNewItem({ item_id: "", uom: "PCS", quantity: 1, unit_price: 0, total_amount: 0 });
    setItemQuery("");
    setShowModal(true);
  };

  // Logic to add an item
  const handleAddItem = () => {
    if (!newItem.item_id) return;
    const invItem = invItems.find(i => String(i.id) === String(newItem.item_id));
    const qty = Number(newItem.quantity) || 1;
    const price = Number(newItem.unit_price) || 0;
    const total = qty * price;
    
    const addedItem = {
      ...newItem,
      item_name: invItem?.item_name || "Unknown Item",
      quantity: qty,
      unit_price: price,
      total_amount: total
    };
    
    setForm(prev => {
      const newItems = [...prev.items, addedItem];
      const newAmount = newItems.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
      return { ...prev, items: newItems, amount: newAmount };
    });
    
    setNewItem({ item_id: "", uom: "PCS", quantity: 1, unit_price: 0, total_amount: 0 });
    setItemQuery("");
  };

  const handleRemoveItem = (index) => {
    setForm(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const newAmount = newItems.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
      return { ...prev, items: newItems, amount: newAmount };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.items.length === 0 && Number(form.amount) === 0) {
      toast.error("Please add at least one line item or provide an amount.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/transport/expense-logs/${editing.id}`, form);
        toast.success("Expense updated");
      } else {
        await api.post("/transport/expense-logs", form);
        toast.success("Expense recorded");
      }
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const { sorted: sortedItems, sortKey, sortDir, toggle: requestSort } = useSort(items, "expense_date", "desc");
  const filteredItems = sortedItems.filter(i => 
    String(i.trip_no || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(i.vehicle_reg || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(i.supplier_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(i.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Expense Logs</h2>
          <p className="text-gray-500">Log general fleet expenses such as spare parts, fuel, and maintenance.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/transport" className="btn btn-outline">Back to Transport</Link>
          <button onClick={openCreate} className="btn btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Record Expense
          </button>
        </div>
      </div>

      <div className="card">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search expense records..."
            className="input w-full max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : (
          
                <>
<div className="flex justify-end mb-4">
                  <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                </div>
                <div className="overflow-x-auto">
            <table className={ "table w-full " + (viewMode === 'grid' ? 'table-grid-mode' : '') }>
              <thead>
                <tr>
                  <SortableHeader label="Date" sortKey="expense_date" currentKey={sortKey} direction={sortDir} onToggle={requestSort} />
                  <SortableHeader label="Trip No" sortKey="trip_no" currentKey={sortKey} direction={sortDir} onToggle={requestSort} />
                  <SortableHeader label="Vehicle" sortKey="vehicle_reg" currentKey={sortKey} direction={sortDir} onToggle={requestSort} />
                  <SortableHeader label="Supplier" sortKey="supplier_name" currentKey={sortKey} direction={sortDir} onToggle={requestSort} />
                  <SortableHeader label="Expense Type" sortKey="expense_type" currentKey={sortKey} direction={sortDir} onToggle={requestSort} />
                  <SortableHeader label="Amount" sortKey="amount" currentKey={sortKey} direction={sortDir} onToggle={requestSort} />
                  <SortableHeader label="Status" sortKey="status" currentKey={sortKey} direction={sortDir} onToggle={requestSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id}>
                    <td>{new Date(item.expense_date).toLocaleDateString()}</td>
                    <td>{item.trip_no || '-'}</td>
                    <td>{item.vehicle_reg || '-'}</td>
                    <td>{item.supplier_name || '-'}</td>
                    <td><span className="badge badge-outline">{item.expense_type || 'Other'}</span></td>
                    <td>{item.currency} {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`badge ${item.status === 'POSTED' || item.status === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="flex items-center gap-1">
                      <button onClick={() => openEdit(item)} className="btn btn-ghost btn-sm text-slate-500 hover:text-slate-700" title="View Details">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {item.status !== 'POSTED' && item.status !== 'APPROVED' && (
                        <button onClick={() => openEdit(item)} className="btn btn-ghost btn-sm text-blue-600">Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr><td colSpan="7" className="text-center py-4 text-gray-500">No expense records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        
</>
)}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-xl font-bold">{editing ? "Edit Expense" : "Record Expense"}</h3>
              <div className="flex gap-4">
                <div className="form-control flex flex-row items-center gap-2">
                  <span className="label-text">Currency</span>
                  <select className="input input-bordered input-sm" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                    <option value="GHS">GHS</option>
                    {currencies.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
                <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="form-control">
                  <label className="label"><span className="label-text">Trip (Optional)</span></label>
                  <select className="input input-bordered w-full" value={form.trip_id} onChange={e => setForm({...form, trip_id: e.target.value})}>
                    <option value="">-- Select Trip --</option>
                    {trips.map(p => <option key={p.id} value={p.id}>{p.trip_number || p.trip_no}</option>)}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Vehicle (Optional)</span></label>
                  <select className="input input-bordered w-full" value={form.vehicle_id} onChange={e => setForm({...form, vehicle_id: e.target.value})}>
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map(p => <option key={p.id} value={p.id}>{p.reg_number || p.registration_number}</option>)}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Supplier <span className="text-error">*</span></span></label>
                  <select required className="input input-bordered w-full" value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})}>
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_name}</option>)}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Expense Type</span></label>
                  <select className="input input-bordered w-full" value={form.expense_type} onChange={e => setForm({...form, expense_type: e.target.value})}>
                    {expenseTypes.map(t => (
                      <option key={t.id} value={t.setup_value}>{t.setup_value}</option>
                    ))}
                    {expenseTypes.length === 0 && (
                      <>
                        <option value="Road Worthy">Road Worthy</option>
                        <option value="Spare Parts">Spare Parts</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Fuel">Fuel</option>
                        <option value="Tolls">Tolls</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text">Date <span className="text-error">*</span></span></label>
                  <input type="date" required className="input input-bordered w-full" value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} />
                </div>
              </div>

              {/* Items Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-[#0E3646] mb-3">Add Line Item</h3>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
                  <div className="md:col-span-2 relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                    <input
                      className="input w-full"
                      placeholder="Search items..."
                      value={itemQuery}
                      onChange={(e) => {
                        setItemQuery(e.target.value);
                        setNewItem(prev => ({...prev, item_id: ""}));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const res = filterByPrefix(invItems, { query: itemQuery, searchFields: ["item_code", "item_name", "barcode"] });
                          if (res.length) {
                            setNewItem(prev => ({...prev, item_id: String(res[0].id)}));
                            setItemQuery(res[0].item_name);
                          }
                        }
                      }}
                    />
                    {itemQuery && !newItem.item_id && (
                      <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {filterByPrefix(invItems, { query: itemQuery, searchFields: ["item_code", "item_name", "barcode"] }).map(o => (
                          <button
                            type="button"
                            key={o.id}
                            className="block w-full text-left px-3 py-2 hover:bg-slate-50 text-xs"
                            onClick={() => {
                              setNewItem(prev => ({...prev, item_id: String(o.id)}));
                              setItemQuery(o.item_name);
                            }}
                          >
                            {o.item_code} - {o.item_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                    <input type="number" min="1" className="input w-full" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">UOM</label>
                    <input type="text" placeholder="PCS" className="input w-full uppercase" value={newItem.uom} onChange={e => setNewItem({...newItem, uom: e.target.value.toUpperCase()})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price ({form.currency})</label>
                    <input type="number" min="0" step="0.01" className="input w-full" value={newItem.unit_price} onChange={e => setNewItem({...newItem, unit_price: e.target.value})} />
                  </div>
                  <div className="flex items-end">
                    <button type="button" onClick={handleAddItem} className="btn btn-primary w-full" disabled={!newItem.item_id}>
                      Add Item
                    </button>
                  </div>
                </div>

                {form.items.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg mt-4 bg-white">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="px-4 py-2 font-medium">Item Name</th>
                          <th className="px-4 py-2 font-medium">Qty</th>
                          <th className="px-4 py-2 font-medium text-right">Unit Price</th>
                          <th className="px-4 py-2 font-medium text-right">Total</th>
                          <th className="px-4 py-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((it, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-4 py-2">{it.item_name}</td>
                            <td className="px-4 py-2">{it.quantity} {it.uom}</td>
                            <td className="px-4 py-2 text-right">{Number(it.unit_price).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-2 text-right">{Number(it.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-2 text-center">
                              <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t">
                        <tr>
                          <td colSpan="3" className="px-4 py-3 font-semibold text-right">Grand Total:</td>
                          <td className="px-4 py-3 font-semibold text-right text-brand-700">
                            {form.currency} {Number(form.amount).toLocaleString(undefined, {minimumFractionDigits:2})}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-500 mt-4 p-4 border border-dashed border-gray-300 rounded-lg">
                    No items added yet. Use the section above to add items.
                  </div>
                )}
              </div>

              <div className="form-control">
                <label className="label"><span className="label-text font-bold">Description <span className="text-error">*</span></span></label>
                <textarea required className="textarea textarea-bordered border border-slate-300 rounded-lg w-full h-24 p-3" value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                {(!editing || (editing.status !== 'POSTED' && editing.status !== 'APPROVED')) && (
                  <button type="submit" disabled={saving} className="btn btn-primary">
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Log
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
