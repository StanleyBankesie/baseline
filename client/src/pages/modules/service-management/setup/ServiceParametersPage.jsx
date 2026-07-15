/**
 * @fileoverview ServiceParametersPage component.
 * Provides functionality for ServiceParametersPage.
 */

import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../../../../api/client";
import { toast } from "react-toastify";
import { Plus, Edit2, Trash2, Loader2, X } from "lucide-react";

const TABS = [
  { key: "clients", label: "Clients" },
  { key: "work-locations", label: "Work Locations", endpoint: "/purchase/service-setup/work-locations", fieldLabel: "Location Name", placeholder: "e.g., HQ Facility" },
  { key: "service-types", label: "Service Types", endpoint: "/purchase/service-setup/service-types", fieldLabel: "Type Name", placeholder: "e.g., Installation" },
  { key: "categories", label: "Service Categories", endpoint: "/purchase/service-setup/categories", fieldLabel: "Category Name", placeholder: "e.g., Maintenance" },
  { key: "time-slots", label: "Time Slots", endpoint: "/purchase/service-setup/time-slots", fieldLabel: "Time Range", placeholder: "e.g., 12:00pm - 2:00pm" },
  { key: "timelines", label: "Timelines", endpoint: "/purchase/service-setup/timelines", fieldLabel: "Timeline", placeholder: "e.g., 1 - 7 Days" },
  { key: "supervisors", label: "Supervisors", endpoint: "/purchase/service-setup/supervisors", fieldLabel: "Supervisor", placeholder: null },
];

/**
 *  component
 * 
 * @returns {JSX.Element} The rendered component
 */
export default function ServiceParametersPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = searchParams.get("tab") || "work-locations";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [allUsers, setAllUsers] = useState([]);

  
  const [clients, setClients] = useState([]);
  const [clientModal, setClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState({
    customer_name: "", customer_code: "", contact_person: "", email: "", phone: "", address: "", 
    city: "", state: "", country: "Ghana", payment_terms: "", 
    customer_type: "LOCAL", service_customer: true, is_active: 1,
    sales_account_id: "", currency_id: ""
  });
  const [clientSaving, setClientSaving] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [clientRevenueAccountSearch, setClientRevenueAccountSearch] = useState("");

  const loadClients = async () => {
    try {
      const res = await api.get("/sales/customers");
      setClients(res.data?.items || res.data?.data?.items || []);
    } catch { toast.error("Failed to load clients"); }
  };

  const loadAccounts = async () => {
    try {
      const res = await api.get("/finance/accounts");
      setAccounts(res.data?.items || res.data?.data?.items || []);
    } catch {}
  };

  useEffect(() => {
    if (activeTab === "clients") {
      loadClients();
      loadAccounts();
    }
  }, [activeTab]);

  const openClientAdd = async () => { 
    setEditingClient(null); 
    setClientRevenueAccountSearch("");
    let nextCode = "";
    try {
      const response = await api.get("/sales/customers/next-code");
      if (response.data?.code) nextCode = response.data.code;
    } catch (err) {}
    setClientForm({ 
      customer_name: "", customer_code: nextCode, contact_person: "", email: "", phone: "", address: "", 
      city: "", state: "", country: "Ghana", payment_terms: "", 
      customer_type: "LOCAL", service_customer: true, is_active: 1,
      sales_account_id: "", currency_id: ""
    }); 
    setClientModal(true); 
  };

  const openClientEdit = (c) => { 
    setEditingClient(c); 
    setClientRevenueAccountSearch(c.sales_account_id ? String(accounts.find(a => String(a.id) === String(c.sales_account_id))?.name || "") : "");
    setClientForm({ 
      customer_name: c.customer_name || "", customer_code: c.customer_code || "", 
      contact_person: c.contact_person || "", email: c.email || "", phone: c.phone || "", 
      address: c.address || "", city: c.city || "", state: c.state || "", country: c.country || "Ghana", 
      payment_terms: c.payment_terms || "", customer_type: c.customer_type || "LOCAL", 
      service_customer: c.service_customer === 'Y' || c.service_customer === true, 
      is_active: c.is_active ?? 1,
      sales_account_id: c.sales_account_id || "", currency_id: c.currency_id || ""
    }); 
    setClientModal(true); 
  };

  const saveClient = async () => {
    if (!clientForm.customer_name.trim()) { toast.error("Client name is required"); return; }
    setClientSaving(true);
    try {
      const payload = { ...clientForm, service_customer: clientForm.service_customer ? 'Y' : 'N' };
      if (editingClient) {
        await api.put(`/sales/customers/${editingClient.id}`, payload);
        toast.success("Client updated");
      } else {
        await api.post("/sales/customers", payload);
        toast.success("Client created");
      }
      setClientModal(false);
      loadClients();
    } catch (e) { toast.error(e?.response?.data?.message || "Failed to save client"); }
    finally { setClientSaving(false); }
  };

  const deleteClient = async (id) => {
    if (!confirm("Delete this client?")) return;
    try {
      await api.delete(`/sales/customers/${id}`);
      toast.success("Client deleted");
      loadClients();
    } catch (e) { toast.error(e?.response?.data?.message || "Failed to delete client"); }
  };

  const currentTab = TABS.find((t) => t.key === activeTab) || TABS[0];
  const isSupervisorTab = activeTab === "supervisors";

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(currentTab.endpoint);
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setInputValue("");
  }, [activeTab]);

  useEffect(() => {
    if (!isSupervisorTab) return;
    let mounted = true;
    async function loadUsers() {
      try {
        const resp = await api.get("/purchase/service-setup/users");
        if (mounted) setAllUsers(Array.isArray(resp?.data?.items) ? resp.data.items : []);
      } catch {
        if (mounted) setAllUsers([]);
      }
    }
    loadUsers();
    return () => { mounted = false; };
  }, [isSupervisorTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSupervisorTab) {
        if (!inputValue) return;
        await api.post(currentTab.endpoint, { user_id: Number(inputValue) });
        setInputValue("");
      } else {
        const v = String(inputValue || "").trim();
        if (!v) return;
        await api.post(currentTab.endpoint, { name: v });
        setInputValue("");
      }
      toast.success("Saved successfully");
      loadData();
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleRemove = async (id) => {
    try {
      await api.delete(`${currentTab.endpoint}/${id}`);
      setItems((prev) => prev.filter((x) => Number(x.id) !== Number(id)));
      toast.success("Removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/service-management" className="btn-secondary text-sm">
          Back to Menu
        </Link>
        <h2 className="text-lg font-semibold">Service Setup & Parameters</h2>
      </div>

      <div className="flex border-b mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap ${
              activeTab === tab.key
                ? "border-b-2 border-brand text-brand"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      
      {activeTab === "clients" ? (
        <div className="bg-white dark:bg-slate-800 rounded shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Service Clients</h3>
            <button onClick={openClientAdd} className="btn-primary text-xs py-1.5 px-3">
              <Plus size={14} className="inline mr-1" /> Add Client
            </button>
          </div>
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{c.customer_code}</td>
                  <td className="px-4 py-3 text-sm font-medium">{c.customer_name}</td>
                  <td className="px-4 py-3 text-sm">{c.contact_person || "-"}</td>
                  <td className="px-4 py-3 text-sm">{c.phone || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openClientEdit(c)} className="text-sky-600 mr-3 hover:underline">Edit</button>
                    <button onClick={() => deleteClient(c.id)} className="text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No clients defined</td></tr>
              )}
            </tbody>
          </table>

          {clientModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg">{editingClient ? "Edit Client" : "New Client"}</h3>
                  <button onClick={() => setClientModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="p-4 overflow-y-auto space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1">Customer Code *</label>
                      <input className="input" value={clientForm.customer_code} onChange={e => setClientForm({...clientForm, customer_code: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Customer Name *</label>
                      <input className="input" value={clientForm.customer_name} onChange={e => setClientForm({...clientForm, customer_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Contact Person</label>
                      <input className="input" value={clientForm.contact_person} onChange={e => setClientForm({...clientForm, contact_person: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Phone</label>
                      <input className="input" value={clientForm.phone} onChange={e => setClientForm({...clientForm, phone: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold mb-1">Email</label>
                      <input className="input" type="email" value={clientForm.email} onChange={e => setClientForm({...clientForm, email: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold mb-1">Address</label>
                      <input className="input" value={clientForm.address} onChange={e => setClientForm({...clientForm, address: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                  <button onClick={() => setClientModal(false)} className="btn-secondary">Cancel</button>
                  <button className="btn-primary" disabled={clientSaving} onClick={saveClient}>
                    {clientSaving ? <Loader2 size={14} className="animate-spin mr-1 inline" /> : null} Save
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 p-4 rounded shadow-sm">
            <h3 className="font-medium mb-4">
              {"Add New " + currentTab.label.replace(/-/g, " ")}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isSupervisorTab ? (
                <div>
                  <label className="block text-sm mb-1">{currentTab.fieldLabel}</label>
                  <input
                    className="input"
                    type={currentTab.inputType || "text"}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={currentTab.placeholder}
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm mb-1">User</label>
                  <select
                    className="input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    required
                  >
                    <option value="">-- Select User --</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-800 rounded shadow-sm overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-900/50">
                <tr className="text-left">
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Details
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {item.name || item.username || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="text-red-500 text-sm hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
