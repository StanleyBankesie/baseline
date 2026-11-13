/**
 * @fileoverview Setup component.
 * Provides functionality for Setup.
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, User, Ban, CheckCircle, Plus, X, Pencil, Building2, Warehouse, Wrench, Settings, HardHat, ArrowLeft, ChevronDown } from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import PhoneInput from "../../../../components/PhoneInput.jsx";

/* ─────────────────────────────────────── helpers ─── */
function ModalForm({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl lg:max-w-3xl shadow-2xl overflow-hidden my-auto sm:my-8 transition-all" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Settings size={26} className="text-brand-900 dark:text-brand-400" />
              Operations Setup
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Configure operational departments, temporal warehouses, and service suppliers
            </p>
          </div>
        </div>
      </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-4 text-xs">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────── Generic CRUD Section ─── */
function CrudSection({ title, icon, emptyMsg, columns, rows, loading, onAdd, onEdit, onToggleStatus, isRowActive, renderRow }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        </div>
        <button onClick={onAdd} className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3">
          <Plus size={14} /> Add
        </button>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800">
        <table className="min-w-full">
          <thead className="bg-slate-50 dark:bg-slate-900/50">
            <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
              {columns.map(c => <th key={c} className="px-4 py-3">{c}</th>)}
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
            ) : rows.length > 0 ? rows.map(row => {
              const active = isRowActive ? isRowActive(row) : (row.is_active === 1 || row.is_active === "Y" || row.status === "ACTIVE");
              return (
                <tr key={row.id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  {renderRow(row)}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onEdit && (
                        <button onClick={() => onEdit(row)} title="Edit" className="p-1.5 text-brand hover:text-brand-700 rounded hover:bg-brand-50 transition-colors">
                          <Pencil size={14} />
                        </button>
                      )}
                      {onToggleStatus && (
                        active ? (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(row)}
                            title="Disable"
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <Ban size={13} />
                            <span>Disable</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(row)}
                            title="Enable"
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <CheckCircle size={13} />
                            <span>Enable</span>
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-400">{emptyMsg}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────────────────────────── Main Component ─── */
/**
 *  component
 * 
 * @returns {JSX.Element} The rendered component
 */
export default function Setup() {
  const [searchParams] = useSearchParams();
  const queryTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    queryTab && ["departments", "warehouses", "project-types", "subcontractors", "suppliers", "clients", "equipments"].includes(queryTab)
      ? queryTab
      : "departments"
  );

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["departments", "warehouses", "project-types", "subcontractors", "suppliers", "clients", "equipments"].includes(tab)) {
      setActiveTab(tab);
      if (tab === "clients" && (searchParams.get("new") === "true" || searchParams.get("action") === "new")) {
        setClientModal(true);
      }
    }
  }, [searchParams]);
  const [loading, setLoading] = useState(false);

  // ── Global References (Accounts & Currencies) ─────
  const [accounts, setAccounts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const baseCurrencyId = currencies.find((c) => Number(c.is_base) === 1 || c.is_base === true)?.id || "";

  // ── Project Managers ──────────────────────────────

  // ── Project Types ──────────────────────────────────
  const [projectTypes, setProjectTypes] = useState([]);
  const [ptModal, setPtModal] = useState(false);
  const [editingPt, setEditingPt] = useState(null);
  const [ptForm, setPtForm] = useState({ type_code: "", type_name: "", description: "", is_active: 1 });
  const [ptSaving, setPtSaving] = useState(false);

  // ── Departments ───────────────────────────────────
  const [departments, setDepartments] = useState([]);
  const [deptModal, setDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: "", code: "", is_active: "Y" });
  const [deptSaving, setDeptSaving] = useState(false);

  // ── Warehouses ────────────────────────────────────
  const [warehouses, setWarehouses] = useState([]);
  const [whModal, setWhModal] = useState(false);
  const [editingWh, setEditingWh] = useState(null);
  const [whForm, setWhForm] = useState({ warehouse_name: "", warehouse_code: "", location: "", is_active: 1 });
  const [whSaving, setWhSaving] = useState(false);

  
  // ── Contractors / Subcontractors ───────────────────
  const [subcontractors, setSubcontractors] = useState([]);
  const [subModal, setSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [subForm, setSubForm] = useState({
    supplier_name: "", supplier_code: "", contact_person: "", email: "", phone: "", address: "", 
    city: "", state: "", country: "Ghana", payment_terms: "", 
    tax_id: "", business_reg_no: "", supplier_type: "LOCAL", 
    service_contractor: true, industry: "Contractor/Subcontractor", is_active: 1,
    expense_account_id: "", currency_id: ""
  });
  const [subSaving, setSubSaving] = useState(false);
  const [subExpenseAccountSearch, setSubExpenseAccountSearch] = useState("");
  const subExpenseAccountResults = useMemo(() => {
    if (!subExpenseAccountSearch) return [];
    const q = subExpenseAccountSearch.toLowerCase();
    return accounts
      .filter((a) => String(a.name || "").toLowerCase().includes(q) || String(a.code || "").toLowerCase().includes(q))
      .slice(0, 50)
      .map((a) => ({ value: String(a.id), label: String(a.name), code: String(a.code) }));
  }, [subExpenseAccountSearch, accounts]);

  const [suppliers, setSuppliers] = useState([]);
  const [supModal, setSupModal] = useState(false);
  const [editingSup, setEditingSup] = useState(null);
  const [supForm, setSupForm] = useState({
    supplier_name: "", supplier_code: "", contact_person: "", email: "", phone: "", address: "", 
    city: "", state: "", country: "Ghana", payment_terms: "", 
    tax_id: "", business_reg_no: "", supplier_type: "LOCAL", 
    service_contractor: true, industry: "Services", is_active: 1
  });
  const [supSaving, setSupSaving] = useState(false);

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

  // ── Equipments ────────────────────────────────────
  const [equipments, setEquipments] = useState([]);
  const [eqModal, setEqModal] = useState(false);
  const [editingEq, setEditingEq] = useState(null);
  const [eqForm, setEqForm] = useState({ name: "", description: "", status: "ACTIVE", maint_equipment_id: "" });
  const [eqSaving, setEqSaving] = useState(false);
  const [maintAssets, setMaintAssets] = useState([]);


  const [supExpenseAccountSearch, setSupExpenseAccountSearch] = useState("");
  const supExpenseAccountResults = useMemo(() => {
    if (!supExpenseAccountSearch) return [];
    const q = supExpenseAccountSearch.toLowerCase();
    return accounts
      .filter((a) => String(a.name || "").toLowerCase().includes(q) || String(a.code || "").toLowerCase().includes(q))
      .slice(0, 50)
      .map((a) => ({ value: String(a.id), label: String(a.name), code: String(a.code) }));
  }, [supExpenseAccountSearch, accounts]);

  const [clientRevenueAccountSearch, setClientRevenueAccountSearch] = useState("");
  const [clientRevenueDropdownOpen, setClientRevenueDropdownOpen] = useState(false);
  const clientRevenueRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (clientRevenueRef.current && !clientRevenueRef.current.contains(event.target)) {
        setClientRevenueDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clientRevenueAccountResults = useMemo(() => {
    let list = accounts;
    if (clientRevenueAccountSearch && clientRevenueAccountSearch.trim()) {
      const q = clientRevenueAccountSearch.toLowerCase().trim();
      list = accounts.filter(
        (a) =>
          String(a.name || "").toLowerCase().includes(q) ||
          String(a.code || "").toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      const aIsIncome = a.nature === "INCOME" || /sales|revenue|income/i.test(a.name || "");
      const bIsIncome = b.nature === "INCOME" || /sales|revenue|income/i.test(b.name || "");
      if (aIsIncome && !bIsIncome) return -1;
      if (!aIsIncome && bIsIncome) return 1;
      return String(a.code || "").localeCompare(String(b.code || ""));
    });

    return sorted.slice(0, 80).map((a) => ({
      value: String(a.id),
      label: String(a.name),
      code: String(a.code || ""),
      nature: a.nature,
      group: a.group_name
    }));
  }, [clientRevenueAccountSearch, accounts]);

  /* ── Data Loaders ── */
  const loadProjectTypes = useCallback(async () => {
    try {
      const res = await api.get("/projects/project-types?active=all");
      setProjectTypes(res.data?.items || []);
    } catch {
      toast.error("Failed to load project types");
    }
  }, []);

  const loadDepartments = useCallback(async () => {
    try {
      const res = await api.get("/admin/departments?all=1");
      setDepartments(res.data?.items || res.data || []);
    } catch { toast.error("Failed to load departments"); }
  }, []);

  const loadWarehouses = useCallback(async () => {
    try {
      const res = await api.get("/inventory/warehouses?active=all");
      setWarehouses(res.data?.items || res.data || []);
    } catch { toast.error("Failed to load warehouses"); }
  }, []);

  
  const loadSubcontractors = useCallback(async () => {
    try {
      const res = await api.get("/purchase/suppliers?contractor=Y&active=all");
      setSubcontractors(res.data?.data?.items || res.data?.items || []);
    } catch { toast.error("Failed to load contractors/subcontractors"); }
  }, []);

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await api.get("/purchase/suppliers?contractor=Y&active=all");
      setSuppliers(res.data?.data?.items || res.data?.items || []);
    } catch { toast.error("Failed to load suppliers"); }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const res = await api.get("/sales/customers?service_customer=Y&active=all");
      setClients(res.data?.items || []);
    } catch { toast.error("Failed to load clients"); }
  }, []);

  const loadEquipments = useCallback(async () => {
    try {
      const res = await api.get("/projects/equipments?all=1");
      setEquipments(res.data || []);
    } catch { toast.error("Failed to load equipments"); }
  }, []);

  const loadMaintAssets = useCallback(async () => {
    try {
      const res = await api.get("/maintenance/assets").catch(() => ({ data: { items: [] }}));
      setMaintAssets(res.data?.items || res.data || []);
    } catch { }
  }, []);

  const loadAccountsAndCurrencies = useCallback(async () => {
    try {
      const [accRes, curRes] = await Promise.all([
        api.get("/finance/accounts").catch(() => ({ data: { items: [] } })),
        api.get("/finance/currencies").catch(() => ({ data: { items: [] } }))
      ]);
      setAccounts(accRes.data?.items || accRes.data || []);
      setCurrencies(curRes.data?.items || curRes.data || []);
    } catch { console.error("Failed to load accounts or currencies"); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadProjectTypes(), loadDepartments(), loadWarehouses(), loadSubcontractors(), loadSuppliers(), loadClients(), loadEquipments(), loadMaintAssets(), loadAccountsAndCurrencies()]).finally(() => setLoading(false));
  }, [loadProjectTypes, loadDepartments, loadWarehouses, loadSubcontractors, loadSuppliers, loadClients, loadEquipments, loadMaintAssets, loadAccountsAndCurrencies]);

  /* ── Project Types ── */
  const openPtAdd = () => {
    setEditingPt(null);
    setPtForm({ type_code: "", type_name: "", description: "", is_active: 1 });
    setPtModal(true);
  };
  const openPtEdit = (pt) => {
    setEditingPt(pt);
    setPtForm({
      type_code: pt.type_code || "",
      type_name: pt.type_name || "",
      description: pt.description || "",
      is_active: pt.is_active === 0 || pt.is_active === "N" ? 0 : 1,
    });
    setPtModal(true);
  };
  const togglePtStatus = async (pt) => {
    try {
      const newActive = (pt.is_active === 1 || pt.is_active === "Y") ? 0 : 1;
      await api.put(`/projects/project-types/${pt.id}`, { is_active: newActive });
      toast.success(`Project type ${newActive === 1 ? "enabled" : "disabled"}`);
      loadProjectTypes();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update project type status");
    }
  };

  /* ── Departments ── */
  const openDeptAdd = () => { setEditingDept(null); setDeptForm({ name: "", code: "", is_active: "Y" }); setDeptModal(true); };
  const openDeptEdit = (d) => { setEditingDept(d); setDeptForm({ name: d.name || "", code: d.code || "", is_active: d.is_active || "Y" }); setDeptModal(true); };

  const saveDept = async () => {
    if (!deptForm.name.trim()) { toast.error("Department name is required"); return; }
    setDeptSaving(true);
    try {
      if (editingDept) {
        await api.put(`/admin/departments/${editingDept.id}`, deptForm);
        toast.success("Department updated");
      } else {
        await api.post("/admin/departments", deptForm);
        toast.success("Department created");
      }
      setDeptModal(false);
      loadDepartments();
    } catch (e) { toast.error(e?.response?.data?.message || "Failed to save department"); }
    finally { setDeptSaving(false); }
  };

  const isEntityActive = (item) => {
    if (!item) return false;
    if (item.status !== undefined && item.status !== null) {
      return String(item.status).toUpperCase() === "ACTIVE";
    }
    return (
      item.is_active === 1 ||
      item.is_active === "1" ||
      item.is_active === true ||
      item.is_active === "Y"
    );
  };

  const toggleDeptStatus = async (d) => {
    const currentlyActive = isEntityActive(d);
    const newActive = currentlyActive ? "N" : "Y";
    try {
      await api.put(`/admin/departments/${d.id}`, { ...d, is_active: newActive });
      toast.success(`Department ${currentlyActive ? "disabled" : "enabled"}`);
      loadDepartments();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update department status");
    }
  };

  /* ── Warehouses ── */
  const openWhAdd = () => { setEditingWh(null); setWhForm({ warehouse_name: "", warehouse_code: "", location: "", is_active: 1 }); setWhModal(true); };
  const openWhEdit = (w) => { setEditingWh(w); setWhForm({ warehouse_name: w.warehouse_name || "", warehouse_code: w.warehouse_code || "", location: w.location || "", is_active: w.is_active ?? 1 }); setWhModal(true); };

  const saveWh = async () => {
    if (!whForm.warehouse_name.trim()) { toast.error("Warehouse name is required"); return; }
    if (!whForm.warehouse_code.trim()) { toast.error("Warehouse code is required"); return; }
    setWhSaving(true);
    try {
      if (editingWh) {
        await api.put(`/inventory/warehouses/${editingWh.id}`, whForm);
        toast.success("Warehouse updated");
      } else {
        await api.post("/inventory/warehouses", whForm);
        toast.success("Warehouse created");
      }
      setWhModal(false);
      loadWarehouses();
    } catch (e) { toast.error(e?.response?.data?.message || "Failed to save warehouse"); }
    finally { setWhSaving(false); }
  };

  const toggleWhStatus = async (w) => {
    const currentlyActive = isEntityActive(w);
    const newActive = currentlyActive ? 0 : 1;
    try {
      await api.put(`/inventory/warehouses/${w.id}`, { ...w, is_active: newActive });
      toast.success(`Warehouse ${currentlyActive ? "disabled" : "enabled"}`);
      loadWarehouses();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update warehouse status");
    }
  };

  
  /* ── Contractors / Subcontractors ── */
  const openSubAdd = () => { 
    setEditingSub(null); 
    setSubExpenseAccountSearch("");
    setSubForm({ 
      supplier_name: "", supplier_code: "", contact_person: "", email: "", phone: "", address: "", 
      city: "", state: "", country: "Ghana", payment_terms: "", 
      tax_id: "", business_reg_no: "", supplier_type: "LOCAL", 
      service_contractor: true, industry: "Contractor/Subcontractor", is_active: 1,
      expense_account_id: "", currency_id: baseCurrencyId
    }); 
    setSubModal(true); 
  };
  const openSubEdit = (s) => { 
    setEditingSub(s); 
    setSubExpenseAccountSearch(s.expense_account_id ? String(accounts.find(a => String(a.id) === String(s.expense_account_id))?.name || "") : "");
    setSubForm({ 
      supplier_name: s.supplier_name || "", supplier_code: s.supplier_code || "", 
      contact_person: s.contact_person || "", email: s.email || "", phone: s.phone || "", 
      address: s.address || "", city: s.city || "", state: s.state || "", country: s.country || "Ghana", 
      payment_terms: s.payment_terms || "", tax_id: s.tax_id || "", business_reg_no: s.business_reg_no || "", 
      supplier_type: s.supplier_type || "LOCAL", service_contractor: true, 
      industry: "Contractor/Subcontractor", is_active: s.is_active ?? 1,
      expense_account_id: s.expense_account_id || "", currency_id: s.currency_id || ""
    }); 
    setSubModal(true); 
  };

  const saveSub = async () => {
    if (!subForm.supplier_name.trim()) { toast.error("Contractor / Subcontractor name is required"); return; }
    setSubSaving(true);
    try {
      const payload = { ...subForm, service_contractor: "Y" };
      
      if (editingSub) {
        await api.put(`/purchase/suppliers/${editingSub.id}`, payload);
        toast.success("Contractor / Subcontractor updated");
      } else {
        await api.post("/purchase/suppliers", payload);
        toast.success("Contractor / Subcontractor created");
      }
      setSubModal(false);
      loadSubcontractors();
    } catch (e) { toast.error(e?.response?.data?.message || "Failed to save contractor/subcontractor"); }
    finally { setSubSaving(false); }
  };

  const toggleSubStatus = async (s) => {
    const currentlyActive = isEntityActive(s);
    const newActive = currentlyActive ? 0 : 1;
    try {
      const payload = { ...s, is_active: newActive, service_contractor: "Y" };
      await api.put(`/purchase/suppliers/${s.id}`, payload);
      toast.success(`Contractor / Subcontractor ${currentlyActive ? "disabled" : "enabled"}`);
      loadSubcontractors();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update contractor/subcontractor status");
    }
  };

  /* ── Suppliers ── */
  const openSupAdd = () => { 
    setEditingSup(null); 
    setSupExpenseAccountSearch("");
    setSupForm({ 
      supplier_name: "", supplier_code: "", contact_person: "", email: "", phone: "", address: "", 
      city: "", state: "", country: "Ghana", payment_terms: "", 
      tax_id: "", business_reg_no: "", supplier_type: "LOCAL", 
      service_contractor: true, industry: "Services", is_active: 1,
      expense_account_id: "", currency_id: baseCurrencyId
    }); 
    setSupModal(true); 
  };
  const openSupEdit = (s) => { 
    setEditingSup(s); 
    setSupExpenseAccountSearch(s.expense_account_id ? String(accounts.find(a => String(a.id) === String(s.expense_account_id))?.name || "") : "");
    setSupForm({ 
      supplier_name: s.supplier_name || "", supplier_code: s.supplier_code || "", 
      contact_person: s.contact_person || "", email: s.email || "", phone: s.phone || "", 
      address: s.address || "", city: s.city || "", state: s.state || "", country: s.country || "Ghana", 
      payment_terms: s.payment_terms || "", tax_id: s.tax_id || "", business_reg_no: s.business_reg_no || "", 
      supplier_type: s.supplier_type || "LOCAL", service_contractor: s.service_contractor === 'Y' || s.service_contractor === true, 
      industry: "Services", is_active: s.is_active ?? 1,
      expense_account_id: s.expense_account_id || "", currency_id: s.currency_id || ""
    }); 
    setSupModal(true); 
  };

  const saveSup = async () => {
    if (!supForm.supplier_name.trim()) { toast.error("Supplier name is required"); return; }
    setSupSaving(true);
    try {
      // Backend expects service_contractor as string Y/N
      const payload = { ...supForm, service_contractor: supForm.service_contractor ? 'Y' : 'N' };
      
      if (editingSup) {
        await api.put(`/purchase/suppliers/${editingSup.id}`, payload);
        toast.success("Supplier updated");
      } else {
        await api.post("/purchase/suppliers", payload);
        toast.success("Supplier created");
      }
      setSupModal(false);
      loadSuppliers();
    } catch (e) { toast.error(e?.response?.data?.message || "Failed to save supplier"); }
    finally { setSupSaving(false); }
  };

  const toggleSupStatus = async (s) => {
    const currentlyActive = isEntityActive(s);
    const newActive = currentlyActive ? 0 : 1;
    try {
      const payload = {
        ...s,
        is_active: newActive,
        service_contractor: s.service_contractor === "Y" || s.service_contractor === true ? "Y" : "N"
      };
      await api.put(`/purchase/suppliers/${s.id}`, payload);
      toast.success(`Supplier ${currentlyActive ? "disabled" : "enabled"}`);
      loadSuppliers();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update supplier status");
    }
  };

  /* ── Clients ── */
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
      sales_account_id: "", currency_id: baseCurrencyId
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

  const toggleClientStatus = async (c) => {
    const currentlyActive = isEntityActive(c);
    const newActive = currentlyActive ? 0 : 1;
    try {
      const payload = {
        ...c,
        is_active: newActive,
        service_customer: c.service_customer === "Y" || c.service_customer === true ? "Y" : "N"
      };
      await api.put(`/sales/customers/${c.id}`, payload);
      toast.success(`Client ${currentlyActive ? "disabled" : "enabled"}`);
      loadClients();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update client status");
    }
  };

  const toggleEqStatus = async (eq) => {
    const currentlyActive = isEntityActive(eq);
    const newStatus = currentlyActive ? "INACTIVE" : "ACTIVE";
    try {
      const payload = {
        name: eq.name,
        description: eq.description || null,
        status: newStatus,
        maint_equipment_id: eq.maint_equipment_id || null
      };
      await api.put(`/projects/equipments/${eq.id}`, payload);
      toast.success(`Equipment ${currentlyActive ? "disabled" : "enabled"}`);
      loadEquipments();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update equipment status");
    }
  };

  const TABS = [
    { id: "departments", label: "Departments" },
    { id: "warehouses",     label: "Temp. Storage / Warehouses" },
    { id: "project-types",  label: "Project Types" },
    { id: "subcontractors", label: "Contractor / Subcontractor" },
    { id: "suppliers",   label: "Suppliers" },
    { id: "clients",     label: "Clients" },
    { id: "equipments",  label: "Equipments" },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => window.history.back()} className="btn-secondary text-sm">Back</button>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Operations Setup</h2>
          <p className="text-xs text-slate-500">Configure departments, temporary storage, and suppliers</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-brand-900 text-brand-900 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      

      {/* ── Project Types Tab ── */}
      {activeTab === "project-types" && (
        <>
          <CrudSection
            title="Project Types"
            icon={<Settings size={18} className="text-slate-600" />}
            emptyMsg="No project types configured. Add one to get started."
            columns={["Code", "Project Type Name", "Description", "Status"]}
            rows={projectTypes}
            loading={loading}
            onAdd={openPtAdd}
            onEdit={openPtEdit}
            onToggleStatus={togglePtStatus}
            isRowActive={(pt) => pt.is_active === 1 || pt.is_active === "Y"}
            renderRow={(pt) => (
              <>
                <td className="px-4 py-3 font-mono font-bold text-xs text-brand-600 dark:text-brand-400">
                  {pt.type_code}
                </td>
                <td className="px-4 py-3 font-semibold text-sm text-slate-800 dark:text-slate-100">
                  {pt.type_name}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">
                  {pt.description || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      pt.is_active === 1 || pt.is_active === "Y"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {pt.is_active === 1 || pt.is_active === "Y" ? "Active" : "Inactive"}
                  </span>
                </td>
              </>
            )}
          />

          <ModalForm
            open={ptModal}
            onClose={() => setPtModal(false)}
            title={editingPt ? "Edit Project Type" : "New Project Type"}
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Project Type Name *
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. Commercial Buildings, Solar Infrastructure"
                  value={ptForm.type_name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoCode = !editingPt && (!ptForm.type_code || ptForm.type_code === ptForm.type_name.toUpperCase().replace(/[^A-Z0-9]/g, '_'))
                      ? name.toUpperCase().replace(/[^A-Z0-9]/g, '_')
                      : ptForm.type_code;
                    setPtForm((p) => ({ ...p, type_name: name, type_code: autoCode }));
                  }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Type Code (Unique Identifier)
                </label>
                <input
                  type="text"
                  className="input w-full font-mono text-xs uppercase"
                  placeholder="e.g. COMMERCIAL_BUILDING"
                  value={ptForm.type_code}
                  onChange={(e) => setPtForm((p) => ({ ...p, type_code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Description
                </label>
                <textarea
                  className="input w-full text-xs"
                  rows={3}
                  placeholder="Brief description of work scope for this project type..."
                  value={ptForm.description}
                  onChange={(e) => setPtForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  className="input w-full"
                  value={ptForm.is_active}
                  onChange={(e) => setPtForm((p) => ({ ...p, is_active: Number(e.target.value) }))}
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3">
              <button className="btn-outline" onClick={() => setPtModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary flex items-center gap-2"
                disabled={ptSaving}
                onClick={async () => {
                  if (!ptForm.type_name.trim()) {
                    toast.error("Project type name is required");
                    return;
                  }
                  setPtSaving(true);
                  try {
                    if (editingPt) {
                      await api.put(`/projects/project-types/${editingPt.id}`, ptForm);
                      toast.success("Project type updated");
                    } else {
                      await api.post("/projects/project-types", ptForm);
                      toast.success("Project type created");
                    }
                    setPtModal(false);
                    loadProjectTypes();
                  } catch (e) {
                    toast.error(e?.response?.data?.message || "Failed to save project type");
                  } finally {
                    setPtSaving(false);
                  }
                }}
              >
                {ptSaving ? <Loader2 size={14} className="animate-spin" /> : null} Save
              </button>
            </div>
          </ModalForm>
        </>
      )}

      {/* ── Departments Tab ── */}
      {activeTab === "departments" && (
        <>
          <CrudSection
            title="Departments"
            icon={<Building2 size={18} className="text-brand-700 dark:text-brand-400" />}
            emptyMsg="No departments found. Add one to get started."
            columns={["Name", "Code", "Status"]}
            rows={departments}
            loading={loading}
            onAdd={openDeptAdd}
            onEdit={openDeptEdit}
            onToggleStatus={toggleDeptStatus}
            isRowActive={isEntityActive}
            renderRow={d => (
              <>
                <td className="px-4 py-3 font-medium text-sm">{d.name}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{d.code || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${d.is_active === "Y" || d.is_active === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {d.is_active === "Y" || d.is_active === 1 ? "Active" : "Inactive"}
                  </span>
                </td>
              </>
            )}
          />

          {/* Department Modal */}
          <ModalForm open={deptModal} onClose={() => setDeptModal(false)} title={editingDept ? "Edit Department" : "New Department"}>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Department Name *</label>
                <input type="text" className="input w-full" placeholder="e.g. Construction" value={deptForm.name} onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Code</label>
                <input type="text" className="input w-full" placeholder="e.g. CONS" value={deptForm.code} onChange={e => setDeptForm(p => ({ ...p, code: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="checkbox" checked={deptForm.is_active === "Y"} onChange={e => setDeptForm(p => ({ ...p, is_active: e.target.checked ? "Y" : "N" }))} />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-outline" onClick={() => setDeptModal(false)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2" disabled={deptSaving} onClick={saveDept}>
                {deptSaving ? <Loader2 size={14} className="animate-spin" /> : null} Save
              </button>
            </div>
          </ModalForm>
        </>
      )}

      {/* ── Warehouses Tab ── */}
      {activeTab === "warehouses" && (
        <>
          <CrudSection
            title="Temporal Storage / Warehouses"
            icon={<Warehouse size={18} className="text-amber-500" />}
            emptyMsg="No warehouses found. Add one to get started."
            columns={["Name", "Code", "Location", "Status"]}
            rows={warehouses}
            loading={loading}
            onAdd={openWhAdd}
            onEdit={openWhEdit}
            onToggleStatus={toggleWhStatus}
            isRowActive={isEntityActive}
            renderRow={w => (
              <>
                <td className="px-4 py-3 font-medium text-sm">{w.warehouse_name}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{w.warehouse_code}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{w.location || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${w.is_active === 1 || w.is_active === "1" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {w.is_active === 1 || w.is_active === "1" ? "Active" : "Inactive"}
                  </span>
                </td>
              </>
            )}
          />

          {/* Warehouse Modal */}
          <ModalForm open={whModal} onClose={() => setWhModal(false)} title={editingWh ? "Edit Warehouse" : "New Warehouse"}>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Warehouse Name *</label>
                <input type="text" className="input w-full" placeholder="e.g. Site A Storage" value={whForm.warehouse_name} onChange={e => setWhForm(p => ({ ...p, warehouse_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Warehouse Code *</label>
                <input type="text" className="input w-full" placeholder="e.g. WH-001" value={whForm.warehouse_code} onChange={e => setWhForm(p => ({ ...p, warehouse_code: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Location</label>
                <input type="text" className="input w-full" placeholder="e.g. Block C, Floor 2" value={whForm.location} onChange={e => setWhForm(p => ({ ...p, location: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="checkbox" checked={Number(whForm.is_active) === 1} onChange={e => setWhForm(p => ({ ...p, is_active: e.target.checked ? 1 : 0 }))} />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-outline" onClick={() => setWhModal(false)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2" disabled={whSaving} onClick={saveWh}>
                {whSaving ? <Loader2 size={14} className="animate-spin" /> : null} Save
              </button>
            </div>
          </ModalForm>
        </>
      )}

      
      {activeTab === "subcontractors" && (
        <>
          <CrudSection
            title="Contractors / Subcontractors"
            icon={<HardHat size={18} className="text-brand-900 dark:text-brand-400" />}
            emptyMsg="No contractors or subcontractors defined yet."
            columns={["Name", "Contact Person", "Phone", "Status"]}
            rows={subcontractors}
            loading={loading}
            onAdd={openSubAdd}
            onEdit={openSubEdit}
            onToggleStatus={toggleSubStatus}
            isRowActive={isEntityActive}
            renderRow={(s) => (
              <>
                <td className="px-4 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{s.supplier_name}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{s.contact_person || "—"}</td>
                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{s.phone || "—"}</td>
                <td className="px-4 py-3 text-sm">
                  {s.is_active ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Active</span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">Inactive</span>
                  )}
                </td>
              </>
            )}
          />

          <ModalForm open={subModal} onClose={() => setSubModal(false)} title={editingSub ? "Edit Contractor / Subcontractor" : "New Contractor / Subcontractor"}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Contractor / Subcontractor Name *</label>
                <input type="text" className="input w-full text-sm" placeholder="e.g. Acme Concrete & Engineering Ltd" value={subForm.supplier_name} onChange={e => setSubForm(p => ({ ...p, supplier_name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Contractor Type</label>
                <select className="input w-full text-sm" value={subForm.supplier_type} onChange={e => setSubForm(p => ({ ...p, supplier_type: e.target.value }))}>
                  <option value="LOCAL">LOCAL</option>
                  <option value="FOREIGN">FOREIGN</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Contact Person</label>
                <input type="text" className="input w-full text-sm" placeholder="John Doe" value={subForm.contact_person} onChange={e => setSubForm(p => ({ ...p, contact_person: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email</label>
                <input type="email" className="input w-full text-sm" placeholder="contact@example.com" value={subForm.email} onChange={e => setSubForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone</label>
                <PhoneInput value={subForm.phone} onChange={v => setSubForm(p => ({ ...p, phone: v }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tax ID / TIN</label>
                <input type="text" className="input w-full text-sm" placeholder="Tax ID / TIN" value={subForm.tax_id} onChange={e => setSubForm(p => ({ ...p, tax_id: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Business Reg No</label>
                <input type="text" className="input w-full text-sm" placeholder="Registration No" value={subForm.business_reg_no} onChange={e => setSubForm(p => ({ ...p, business_reg_no: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Address</label>
                <input type="text" className="input w-full text-sm" placeholder="Physical Address" value={subForm.address} onChange={e => setSubForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">City</label>
                <input type="text" className="input w-full text-sm" placeholder="City" value={subForm.city} onChange={e => setSubForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">State/Region</label>
                <input type="text" className="input w-full text-sm" placeholder="State/Region" value={subForm.state} onChange={e => setSubForm(p => ({ ...p, state: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Country</label>
                <input type="text" className="input w-full text-sm" placeholder="Country" value={subForm.country} onChange={e => setSubForm(p => ({ ...p, country: e.target.value }))} />
              </div>
              <div className="relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Expense Account</label>
                <input
                  type="text"
                  className="input w-full text-sm"
                  placeholder="Search account..."
                  value={subExpenseAccountSearch || ""}
                  onChange={(e) => {
                    setSubExpenseAccountSearch(e.target.value);
                    if (!e.target.value) {
                      setSubForm((p) => ({ ...p, expense_account_id: "" }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && subExpenseAccountResults.length) {
                      const selected = subExpenseAccountResults[0];
                      const acc = accounts.find((a) => String(a.id) === selected.value);
                      if (acc) {
                        setSubExpenseAccountSearch(acc.name || "");
                        setSubForm((p) => ({ ...p, expense_account_id: String(acc.id) }));
                      }
                    }
                  }}
                />
                {subExpenseAccountSearch && subExpenseAccountResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md max-h-48 overflow-auto">
                    {subExpenseAccountResults.map((o) => (
                      <button
                        type="button"
                        key={o.value}
                        className="block w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                        onClick={() => {
                          setSubExpenseAccountSearch(o.label);
                          setSubForm((p) => ({ ...p, expense_account_id: o.value }));
                        }}
                      >
                        {o.label} <span className="text-xs text-slate-400">({o.code})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Currency</label>
                <select
                  className="input w-full text-sm"
                  value={subForm.currency_id || ""}
                  onChange={(e) => setSubForm((p) => ({ ...p, currency_id: e.target.value }))}
                >
                  <option value="">Default Currency</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Payment Terms</label>
                <input type="text" className="input w-full text-sm" placeholder="e.g. Net 30 days" value={subForm.payment_terms} onChange={e => setSubForm(p => ({ ...p, payment_terms: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="sub_active" checked={!!subForm.is_active} onChange={e => setSubForm(p => ({ ...p, is_active: e.target.checked ? 1 : 0 }))} className="checkbox checkbox-sm" />
                <label htmlFor="sub_active" className="text-xs font-medium cursor-pointer">Active Contractor / Subcontractor</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setSubModal(false)} className="btn btn-secondary text-xs">Cancel</button>
              <button type="button" onClick={saveSub} disabled={subSaving} className="btn btn-primary text-xs inline-flex items-center gap-1.5 shadow-sm">
                {subSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                {editingSub ? "Update Contractor / Subcontractor" : "Create Contractor / Subcontractor"}
              </button>
            </div>
          </ModalForm>
        </>
      )}

      {activeTab === "suppliers" && (
        <>
          <CrudSection
            title="Service Contractors / Suppliers"
            icon={<Building2 size={18} className="text-brand" />}
            emptyMsg="No suppliers defined yet."
            columns={["Name", "Contact Person", "Phone", "Status"]}
            rows={suppliers}
            loading={loading}
            onAdd={openSupAdd}
            onEdit={openSupEdit}
            onToggleStatus={toggleSupStatus}
            isRowActive={isEntityActive}
            renderRow={(s) => (
              <>
                <td className="px-4 py-3 text-sm font-medium text-slate-700">{s.supplier_name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{s.contact_person || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{s.phone || "-"}</td>
                <td className="px-4 py-3 text-sm">
                  {s.is_active ? (
                    <span className="badge badge-success badge-sm">Active</span>
                  ) : (
                    <span className="badge badge-neutral badge-sm">Inactive</span>
                  )}
                </td>
              </>
            )}
          />

          <ModalForm open={supModal} onClose={() => setSupModal(false)} title={editingSup ? "Edit Supplier" : "New Supplier"}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Supplier Name *</label>
                <input type="text" className="input w-full" placeholder="Company Name" value={supForm.supplier_name} onChange={e => setSupForm(p => ({ ...p, supplier_name: e.target.value }))} />
              </div>
              {/* Supplier Code hidden as requested */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Supplier Type</label>
                <select className="select w-full" value={supForm.supplier_type} onChange={e => setSupForm(p => ({ ...p, supplier_type: e.target.value }))}>
                  <option value="LOCAL">LOCAL</option>
                  <option value="FOREIGN">FOREIGN</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Contact Person</label>
                <input type="text" className="input w-full" placeholder="John Doe" value={supForm.contact_person} onChange={e => setSupForm(p => ({ ...p, contact_person: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email</label>
                <input type="email" className="input w-full" placeholder="contact@example.com" value={supForm.email} onChange={e => setSupForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone</label>
                <PhoneInput value={supForm.phone} onChange={v => setSupForm(p => ({ ...p, phone: v }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Tax ID / TIN</label>
                <input type="text" className="input w-full" placeholder="Tax ID" value={supForm.tax_id} onChange={e => setSupForm(p => ({ ...p, tax_id: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Address</label>
                <input type="text" className="input w-full" placeholder="123 Street Name" value={supForm.address} onChange={e => setSupForm(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">City</label>
                <input type="text" className="input w-full" placeholder="City" value={supForm.city} onChange={e => setSupForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">State/Region</label>
                <input type="text" className="input w-full" placeholder="State" value={supForm.state} onChange={e => setSupForm(p => ({ ...p, state: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Country</label>
                <input type="text" className="input w-full" placeholder="Country" value={supForm.country} onChange={e => setSupForm(p => ({ ...p, country: e.target.value }))} />
              </div>
              <div className="relative">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Expense Account</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Search account..."
                  value={supExpenseAccountSearch || ""}
                  onChange={(e) => {
                    setSupExpenseAccountSearch(e.target.value);
                    if (!e.target.value) {
                      setSupForm((p) => ({ ...p, expense_account_id: "" }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && supExpenseAccountResults.length) {
                      const selected = supExpenseAccountResults[0];
                      const acc = accounts.find((a) => String(a.id) === selected.value);
                      if (acc) {
                        setSupExpenseAccountSearch(acc.name || "");
                        setSupForm((p) => ({ ...p, expense_account_id: String(acc.id) }));
                      }
                    }
                  }}
                />
                {supExpenseAccountSearch && supExpenseAccountResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md max-h-48 overflow-auto">
                    {supExpenseAccountResults.map((o) => (
                      <button
                        type="button"
                        key={o.value}
                        className="block w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                        onClick={() => {
                          const acc = accounts.find((a) => String(a.id) === o.value);
                          if (acc) {
                            setSupExpenseAccountSearch(acc.name || "");
                            setSupForm((p) => ({ ...p, expense_account_id: String(acc.id) }));
                          }
                        }}
                      >
                        {o.label} {o.code ? `(${o.code})` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Default Currency</label>
                <select className="select w-full" value={supForm.currency_id} onChange={e => setSupForm(p => ({ ...p, currency_id: e.target.value }))}>
                  <option value="">-- Select Currency --</option>
                  {currencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              
              <div className="sm:col-span-2 flex items-center gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="checkbox" checked={supForm.service_contractor} onChange={e => setSupForm(p => ({ ...p, service_contractor: e.target.checked }))} />
                  <span className="text-sm font-medium">Service Contractor</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="checkbox" checked={Number(supForm.is_active) === 1} onChange={e => setSupForm(p => ({ ...p, is_active: e.target.checked ? 1 : 0 }))} />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button className="btn-outline" onClick={() => setSupModal(false)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2" disabled={supSaving} onClick={saveSup}>
                {supSaving ? <Loader2 size={14} className="animate-spin" /> : null} Save
              </button>
            </div>
          </ModalForm>
        </>
      )}

      {activeTab === "clients" && (
        <>
          <CrudSection
            title="Clients"
            icon={<Building2 size={18} className="text-brand" />}
            emptyMsg="No clients defined yet."
            columns={["Name", "Contact Person", "Phone", "Status"]}
            rows={clients}
            loading={loading}
            onAdd={openClientAdd}
            onEdit={openClientEdit}
            onToggleStatus={toggleClientStatus}
            isRowActive={isEntityActive}
            renderRow={(c) => (
              <>
                <td className="px-4 py-3 text-sm font-medium text-slate-700">{c.customer_name}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{c.contact_person || "-"}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{c.phone || "-"}</td>
                <td className="px-4 py-3 text-sm">
                  {c.is_active ? (
                    <span className="badge badge-success badge-sm">Active</span>
                  ) : (
                    <span className="badge badge-neutral badge-sm">Inactive</span>
                  )}
                </td>
              </>
            )}
          />

          <ModalForm open={clientModal} onClose={() => setClientModal(false)} title={editingClient ? "Edit Client" : "New Client"}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Client Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  placeholder="Client Name"
                  value={clientForm.customer_name}
                  onChange={e => setClientForm(p => ({ ...p, customer_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Client Type <span className="text-red-500">*</span></label>
                <select
                  required
                  className="select w-full"
                  value={clientForm.customer_type}
                  onChange={e => setClientForm(p => ({ ...p, customer_type: e.target.value }))}
                >
                  <option value="LOCAL">LOCAL</option>
                  <option value="FOREIGN">FOREIGN</option>
                  <option value="Individual">Individual</option>
                  <option value="Corporate">Corporate</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Contact Person</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="John Doe (Optional)"
                  value={clientForm.contact_person}
                  onChange={e => setClientForm(p => ({ ...p, contact_person: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Email</label>
                <input
                  type="email"
                  className="input w-full"
                  placeholder="contact@example.com (Optional)"
                  value={clientForm.email}
                  onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone <span className="text-red-500">*</span></label>
                <PhoneInput
                  required
                  value={clientForm.phone}
                  onChange={v => setClientForm(p => ({ ...p, phone: v }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Address</label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="123 Street Name (Optional)"
                  value={clientForm.address}
                  onChange={e => setClientForm(p => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">City <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  placeholder="City"
                  value={clientForm.city}
                  onChange={e => setClientForm(p => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">State/Region <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  placeholder="State/Region"
                  value={clientForm.state}
                  onChange={e => setClientForm(p => ({ ...p, state: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Country <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  placeholder="Country"
                  value={clientForm.country}
                  onChange={e => setClientForm(p => ({ ...p, country: e.target.value }))}
                />
              </div>

              {/* Revenue Account populating from fin_accounts */}
              <div className="relative" ref={clientRevenueRef}>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Revenue Account <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    className="input w-full pr-8"
                    placeholder="Search or select revenue account..."
                    value={clientRevenueAccountSearch || ""}
                    onFocus={() => setClientRevenueDropdownOpen(true)}
                    onChange={(e) => {
                      setClientRevenueAccountSearch(e.target.value);
                      setClientRevenueDropdownOpen(true);
                      if (!e.target.value) {
                        setClientForm((p) => ({ ...p, sales_account_id: "" }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && clientRevenueAccountResults.length) {
                        const selected = clientRevenueAccountResults[0];
                        const acc = accounts.find((a) => String(a.id) === selected.value);
                        if (acc) {
                          setClientRevenueAccountSearch(`${acc.name}${acc.code ? ` (${acc.code})` : ""}`);
                          setClientForm((p) => ({ ...p, sales_account_id: String(acc.id) }));
                          setClientRevenueDropdownOpen(false);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setClientRevenueDropdownOpen(!clientRevenueDropdownOpen)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <ChevronDown size={16} className={`transition-transform duration-200 ${clientRevenueDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
                {clientRevenueDropdownOpen && clientRevenueAccountResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-52 overflow-auto py-1">
                    {clientRevenueAccountResults.map((o) => (
                      <button
                        type="button"
                        key={o.value}
                        className={`block w-full text-left px-3.5 py-2 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                          String(clientForm.sales_account_id) === o.value
                            ? "bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-300 font-bold"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                        onClick={() => {
                          const display = `${o.label}${o.code ? ` (${o.code})` : ""}`;
                          setClientRevenueAccountSearch(display);
                          setClientForm((p) => ({ ...p, sales_account_id: o.value }));
                          setClientRevenueDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{o.label}</span>
                          <span className="text-[11px] font-mono text-slate-400">{o.code}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Default Currency <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="select w-full"
                  value={clientForm.currency_id}
                  onChange={e => setClientForm(p => ({ ...p, currency_id: e.target.value }))}
                >
                  <option value="">-- Select Currency --</option>
                  {currencies.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              
              <div className="sm:col-span-2 flex items-center gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="checkbox" checked={clientForm.service_customer} onChange={e => setClientForm(p => ({ ...p, service_customer: e.target.checked }))} />
                  <span className="text-sm font-medium">Project Client</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="checkbox" checked={Number(clientForm.is_active) === 1} onChange={e => setClientForm(p => ({ ...p, is_active: e.target.checked ? 1 : 0 }))} />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button className="btn-outline" onClick={() => setClientModal(false)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2" disabled={clientSaving} onClick={saveClient}>
                {clientSaving ? <Loader2 size={14} className="animate-spin" /> : null} Save
              </button>
            </div>
          </ModalForm>
        </>
      )}

      {/* ── Equipments Tab ── */}
      {activeTab === "equipments" && (
        <>
          <CrudSection
            title="Project Equipments"
            icon={<Wrench size={18} className="text-slate-600" />}
            emptyMsg="No equipments found. Add one to get started."
            columns={["Name", "Linked Maintenance Asset", "Status"]}
            rows={equipments}
            loading={loading}
            onAdd={() => { setEditingEq(null); setEqForm({ name: "", description: "", status: "ACTIVE", maint_equipment_id: "" }); setEqModal(true); }}
            onEdit={(e) => { setEditingEq(e); setEqForm({ name: e.name || "", description: e.description || "", status: e.status || "ACTIVE", maint_equipment_id: e.maint_equipment_id || "" }); setEqModal(true); }}
            onToggleStatus={toggleEqStatus}
            isRowActive={isEntityActive}
            renderRow={e => (
              <>
                <td className="px-4 py-3 font-medium text-sm">{e.name}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{e.maint_equipment_name || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${e.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {e.status}
                  </span>
                </td>
              </>
            )}
          />

          <ModalForm open={eqModal} onClose={() => setEqModal(false)} title={editingEq ? "Edit Equipment" : "New Equipment"}>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Equipment Name *</label>
                <input type="text" className="input w-full" placeholder="e.g. Excavator Model X" value={eqForm.name} onChange={e => setEqForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
                <textarea className="input w-full" placeholder="Specs, details..." value={eqForm.description} onChange={e => setEqForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Link to Maintenance Asset (Optional)</label>
                <select className="input w-full" value={eqForm.maint_equipment_id} onChange={e => setEqForm(p => ({ ...p, maint_equipment_id: e.target.value }))}>
                  <option value="">-- None --</option>
                  {maintAssets.map(a => <option key={a.id} value={a.id}>{a.asset_name} ({a.asset_code})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                <select className="input w-full" value={eqForm.status} onChange={e => setEqForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-outline" onClick={() => setEqModal(false)}>Cancel</button>
              <button className="btn-primary flex items-center gap-2" disabled={eqSaving} onClick={async () => {
                if (!eqForm.name.trim()) { toast.error("Equipment name is required"); return; }
                setEqSaving(true);
                try {
                  const payload = { ...eqForm, maint_equipment_id: eqForm.maint_equipment_id || null };
                  if (editingEq) {
                    await api.put(`/projects/equipments/${editingEq.id}`, payload);
                    toast.success("Equipment updated");
                  } else {
                    await api.post("/projects/equipments", payload);
                    toast.success("Equipment created");
                  }
                  setEqModal(false);
                  loadEquipments();
                } catch (e) { toast.error(e?.response?.data?.message || "Failed to save equipment"); }
                finally { setEqSaving(false); }
              }}>
                {eqSaving ? <Loader2 size={14} className="animate-spin" /> : null} Save
              </button>
            </div>
          </ModalForm>
        </>
      )}
    </div>
  );
}
