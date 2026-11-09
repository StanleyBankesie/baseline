import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../../../api/client.js";
import { usePermission } from "../../../../auth/PermissionContext.jsx";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Send,
  Building2,
  Calendar,
  FileCheck2,
  Sparkles,
  Wrench,
  Clock,
  Printer
} from "lucide-react";

export default function ServiceRequestForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const { hasExceptional } = usePermission();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [suppliers, setSuppliers] = useState([]);
  const [serviceItemsCatalog, setServiceItemsCatalog] = useState([]);
  const [approvedRequisitions, setApprovedRequisitions] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [formData, setFormData] = useState({
    request_no: "",
    request_date: new Date().toISOString().slice(0, 10),
    order_type: "EXTERNAL",
    supplier_id: "",
    contractor_name: "",
    contractor_code: "",
    contractor_email: "",
    contractor_phone: "",
    service_category: "FACILITIES_MAINTENANCE",
    requisition_id: "",
    requisition_no: "",
    department: "",
    work_location: "",
    scope_of_work: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    currency_code: "GHS",
    status: "PENDING",
  });

  const [lines, setLines] = useState([
    {
      item_id: "",
      item_name: "",
      description: "",
      qty: 1,
      unit_price: 0,
      line_total: 0,
    },
  ]);

  // Load Reference Data
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [suppRes, itemsRes, reqRes, deptRes] = await Promise.all([
          api.get("/purchase/suppliers").catch(() => ({ data: { items: [] } })),
          api.get("/inventory/items").catch(() => ({ data: { items: [] } })),
          api.get("/purchase/general-requisitions", {
            params: { status: "APPROVED", requisition_type: "SERVICE" },
          }).catch(() => ({ data: { items: [] } })),
          api.get("/admin/departments").catch(() => ({ data: { items: [] } })),
        ]);

        if (mounted) {
          setSuppliers(Array.isArray(suppRes.data?.items) ? suppRes.data.items : []);
          
          const rawItems = Array.isArray(itemsRes.data?.items) ? itemsRes.data.items : [];
          const svcItems = rawItems.filter((i) => {
            const si = String(i.service_item || "").toUpperCase();
            const it = String(i.item_type || "").toUpperCase();
            return si === "Y" || it === "SERVICE" || Number(i.service_item) === 1;
          });
          setServiceItemsCatalog(svcItems.length > 0 ? svcItems : rawItems);

          setApprovedRequisitions(Array.isArray(reqRes.data?.items) ? reqRes.data.items : []);
          setDepartments(Array.isArray(deptRes.data?.items) ? deptRes.data.items : []);
        }
      } catch (e) {
        console.error("Failed to load reference data", e);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch Next Document Number for New Requests
  useEffect(() => {
    if (!isNew) return;
    let mounted = true;
    api.get("/purchase/procurement-service-requests/next-no")
      .then((res) => {
        if (mounted && res.data?.nextNo) {
          setFormData((prev) => ({ ...prev, request_no: res.data.nextNo }));
        }
      })
      .catch(() => {
        if (mounted) {
          const rand = Math.floor(100000 + Math.random() * 900000);
          setFormData((prev) => ({ ...prev, request_no: `SVR-${rand}` }));
        }
      });
    return () => {
      mounted = false;
    };
  }, [isNew]);

  // Load Existing Service Request
  useEffect(() => {
    if (isNew) return;
    let mounted = true;
    setLoading(true);
    api.get(`/purchase/service-orders/${id}`)
      .then((res) => {
        if (!mounted) return;
        const item = res.data?.item || {};
        const linesData = Array.isArray(res.data?.lines) ? res.data.lines : [];

        setFormData({
          request_no: item.order_no || "",
          request_date: item.order_date ? String(item.order_date).slice(0, 10) : "",
          order_type: item.order_type || "EXTERNAL",
          supplier_id: item.supplier_id ? String(item.supplier_id) : "",
          contractor_name: item.contractor_name || "",
          contractor_code: item.contractor_code || "",
          contractor_email: item.contractor_email || "",
          contractor_phone: item.contractor_phone || "",
          service_category: item.service_category || "FACILITIES_MAINTENANCE",
          requisition_id: item.requisition_id ? String(item.requisition_id) : "",
          requisition_no: item.requisition_no || "",
          department: item.department || "",
          work_location: item.work_location || "",
          scope_of_work: item.scope_of_work || "",
          start_date: item.start_date ? String(item.start_date).slice(0, 10) : "",
          end_date: item.end_date ? String(item.end_date).slice(0, 10) : "",
          currency_code: item.currency_code || "GHS",
          status: item.status || "PENDING",
        });

        if (linesData.length > 0) {
          setLines(
            linesData.map((ln) => ({
              item_id: ln.item_id ? String(ln.item_id) : "",
              item_name: ln.item_name || "",
              description: ln.description || "",
              qty: Number(ln.qty || 1),
              unit_price: Number(ln.unit_price || 0),
              line_total: Number(ln.line_total || 0),
            }))
          );
        }
      })
      .catch((e) => {
        if (mounted) setError(e?.response?.data?.message || "Failed to load service request");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, isNew]);

  // Handle Direct Requisition Population (User Request 3)
  const handleSelectRequisition = async (reqId) => {
    if (!reqId) {
      setFormData((prev) => ({
        ...prev,
        requisition_id: "",
        requisition_no: "",
      }));
      return;
    }

    try {
      setLoading(true);
      const res = await api.get(`/purchase/general-requisitions/${reqId}`);
      const req = res.data?.requisition || res.data?.item || res.data;
      const reqItems = Array.isArray(req.items) ? req.items : Array.isArray(res.data?.items) ? res.data.items : [];

      setFormData((prev) => ({
        ...prev,
        requisition_id: String(reqId),
        requisition_no: req.requisition_no || "",
        department: req.department || prev.department,
        work_location: req.work_location || prev.work_location,
        scope_of_work: req.purpose || req.remarks || prev.scope_of_work,
      }));

      if (reqItems.length > 0) {
        const mappedLines = reqItems.map((it) => {
          const qty = Number(it.qty || it.quantity || 1);
          const price = Number(it.estimated_unit_cost || it.unit_price || 0);
          return {
            item_id: it.item_id ? String(it.item_id) : "",
            item_name: it.item_name || it.description || "Service Item",
            description: it.description || it.item_name || "",
            qty,
            unit_price: price,
            line_total: qty * price,
          };
        });
        setLines(mappedLines);
      }

      toast.success(
        `Service Requisition #${req.requisition_no || reqId} populated directly into Service Request! (RFQ & Supplier Quote bypassed)`
      );
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load requisition details");
    } finally {
      setLoading(false);
    }
  };

  // Supplier selection change
  const handleSupplierChange = (suppId) => {
    const supp = suppliers.find((s) => String(s.id) === String(suppId));
    setFormData((prev) => ({
      ...prev,
      supplier_id: suppId,
      contractor_name: supp ? supp.supplier_name || "" : "",
      contractor_code: supp ? supp.supplier_code || "" : "",
      contractor_email: supp ? supp.email || "" : "",
      contractor_phone: supp ? supp.phone || "" : "",
    }));
  };

  // Line item management
  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { item_id: "", item_name: "", description: "", qty: 1, unit_price: 0, line_total: 0 },
    ]);
  };

  const removeLine = (idx) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx, patch) => {
    setLines((prev) => {
      const updated = [...prev];
      const current = { ...updated[idx], ...patch };
      if ("item_id" in patch) {
        const item = serviceItemsCatalog.find((x) => String(x.id) === String(patch.item_id));
        if (item) {
          current.item_name = item.item_name || item.name || "";
          current.description = current.description || item.description || item.item_name || "";
          current.unit_price = Number(item.cost_price || item.purchase_price || current.unit_price || 0);
        }
      }
      current.qty = Number(current.qty || 0);
      current.unit_price = Number(current.unit_price || 0);
      current.line_total = current.qty * current.unit_price;
      updated[idx] = current;
      return updated;
    });
  };

  const computedTotal = useMemo(() => {
    return lines.reduce((sum, ln) => sum + Number(ln.line_total || 0), 0);
  }, [lines]);

  const handleSubmit = async (targetStatus = "PENDING") => {
    if (!formData.supplier_id && !formData.contractor_name) {
      toast.error("Please select or enter a Supplier / Contractor");
      return;
    }
    if (lines.length === 0 || !lines.some((l) => l.description || l.item_id)) {
      toast.error("Please add at least one service item line");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      order_no: formData.request_no,
      order_date: formData.request_date,
      order_type: "EXTERNAL",
      supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
      contractor_name: formData.contractor_name,
      contractor_code: formData.contractor_code,
      contractor_email: formData.contractor_email,
      contractor_phone: formData.contractor_phone,
      service_category: formData.service_category,
      requisition_id: formData.requisition_id ? Number(formData.requisition_id) : null,
      requisition_no: formData.requisition_no,
      department: formData.department,
      work_location: formData.work_location,
      scope_of_work: formData.scope_of_work,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      currency_code: formData.currency_code,
      total_amount: computedTotal,
      status: targetStatus,
      lines: lines.map((ln) => ({
        item_id: ln.item_id ? Number(ln.item_id) : null,
        item_name: ln.item_name || ln.description,
        description: ln.description || ln.item_name,
        qty: Number(ln.qty || 1),
        unit_price: Number(ln.unit_price || 0),
        line_total: Number(ln.line_total || 0),
      })),
    };

    try {
      if (isNew) {
        const res = await api.post("/purchase/service-orders", payload);
        toast.success(`Service Request #${res.data?.order_no || formData.request_no} created successfully!`);
      } else {
        await api.put(`/purchase/service-orders/${id}`, payload);
        toast.success(`Service Request #${formData.request_no} updated successfully!`);
      }
      navigate("/purchase/service-requests");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save service request");
      toast.error(err?.response?.data?.message || "Failed to save service request");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    try {
      setSaving(true);
      await api.put(`/purchase/procurement-service-requests/${id}/status`, { status: "APPROVED" });
      setFormData((prev) => ({ ...prev, status: "APPROVED" }));
      toast.success("Service Request has been approved!");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to approve service request");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header / Back */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/purchase/service-requests"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                {isNew ? "New Service Request (Procurement)" : `Service Request ${formData.request_no}`}
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  formData.status === "APPROVED" || formData.status === "DONE"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : formData.status === "PENDING"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {formData.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Service procurement contract with outside contractor/vendor. Replaces standard PO for non-stockable services.
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {!isNew && formData.status === "PENDING" && (
            <button
              onClick={handleApprove}
              disabled={saving}
              className="btn btn-secondary text-xs inline-flex items-center gap-1.5 py-1.5 px-3 text-emerald-600 dark:text-emerald-400 font-semibold border-emerald-300 dark:border-emerald-800"
            >
              <CheckCircle2 size={13} /> Approve Request
            </button>
          )}

          {!isNew && formData.status === "APPROVED" && (
            <Link
              to={`/purchase/service-confirmations/new?order_id=${id}`}
              className="btn btn-primary text-xs inline-flex items-center gap-1.5 py-1.5 px-3 font-semibold shadow-xs"
            >
              <FileCheck2 size={13} /> Create Service Confirmation
            </Link>
          )}

          <button
            onClick={() => handleSubmit("DRAFT")}
            disabled={saving}
            className="btn btn-secondary text-xs inline-flex items-center gap-1.5 py-1.5 px-3"
          >
            <Save size={13} /> Save Draft
          </button>

          <button
            onClick={() => handleSubmit("PENDING")}
            disabled={saving}
            className="btn btn-primary text-xs inline-flex items-center gap-1.5 py-1.5 px-4 font-semibold shadow-xs"
          >
            <Send size={13} /> Submit Request
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Main Form Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Service & Contractor Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Supplier / Contractor Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 size={14} className="text-brand-500" /> Service Provider / Contractor
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Supplier / Contractor *</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="input text-xs w-full"
                >
                  <option value="">-- Choose Approved Supplier / Contractor --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplier_name} {s.supplier_code ? `(${s.supplier_code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs">Contractor Name (if custom)</label>
                <input
                  type="text"
                  value={formData.contractor_name}
                  onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
                  placeholder="e.g. Acme Facility Solutions Ltd"
                  className="input text-xs w-full"
                />
              </div>

              <div>
                <label className="label text-xs">Contractor Phone</label>
                <input
                  type="text"
                  value={formData.contractor_phone}
                  onChange={(e) => setFormData({ ...formData, contractor_phone: e.target.value })}
                  placeholder="+233..."
                  className="input text-xs w-full"
                />
              </div>

              <div>
                <label className="label text-xs">Contractor Email</label>
                <input
                  type="email"
                  value={formData.contractor_email}
                  onChange={(e) => setFormData({ ...formData, contractor_email: e.target.value })}
                  placeholder="vendor@example.com"
                  className="input text-xs w-full"
                />
              </div>
            </div>
          </div>

          {/* Scope of Work & Work Location */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Wrench size={14} className="text-brand-500" /> Scope of Work & Location
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Service Category *</label>
                <select
                  value={formData.service_category}
                  onChange={(e) => setFormData({ ...formData, service_category: e.target.value })}
                  className="input text-xs w-full"
                >
                  <option value="FACILITIES_MAINTENANCE">Facilities Maintenance</option>
                  <option value="CLEANING_JANITORIAL">Cleaning & Janitorial</option>
                  <option value="HVAC_AIR_CONDITIONING">HVAC & Air Conditioning</option>
                  <option value="ELECTRICAL_POWER">Electrical & Generator</option>
                  <option value="PLUMBING_WATER">Plumbing & Water Systems</option>
                  <option value="WASTE_ENVIRONMENTAL">Waste & Sanitation</option>
                  <option value="PEST_CONTROL">Pest Control & Fumigation</option>
                  <option value="SECURITY_SURVEILLANCE">Security & Access Control</option>
                  <option value="CIVIL_STRUCTURAL">Civil & Structural Repairs</option>
                  <option value="IT_NETWORKING">IT & Networking Services</option>
                </select>
              </div>

              <div>
                <label className="label text-xs">Work Location / Site *</label>
                <input
                  type="text"
                  value={formData.work_location}
                  onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
                  placeholder="e.g. Headquarters - Floor 3 Restrooms & HVAC Plant"
                  className="input text-xs w-full"
                />
              </div>
            </div>

            <div>
              <label className="label text-xs">Detailed Scope of Work & Deliverables *</label>
              <textarea
                rows={3}
                value={formData.scope_of_work}
                onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
                placeholder="Specify requirements, safety guidelines, SLA targets, and service expectations..."
                className="input text-xs w-full"
              />
            </div>
          </div>
        </div>

        {/* Right 1 Col: Dates & Reference */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} className="text-brand-500" /> Schedule & Department
            </h3>

            <div className="space-y-3">
              <div>
                <label className="label text-xs">Service Requisition</label>
                <select
                  value={formData.requisition_id}
                  onChange={(e) => handleSelectRequisition(e.target.value)}
                  className="input text-xs w-full"
                >
                  <option value="">-- Direct Request (No Requisition) --</option>
                  {approvedRequisitions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.requisition_no} - {r.department || "General"} ({String(r.requisition_date || "").slice(0, 10)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs">Request Date</label>
                <input
                  type="date"
                  value={formData.request_date}
                  onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                  className="input text-xs w-full"
                />
              </div>

              <div>
                <label className="label text-xs">Execution Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="input text-xs w-full"
                />
              </div>

              <div>
                <label className="label text-xs">Target Completion Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="input text-xs w-full"
                />
              </div>

              <div>
                <label className="label text-xs">Cost Center / Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="input text-xs w-full"
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name || d.department_name}>
                      {d.name || d.department_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Lines Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Service Items & Pricing Schedule
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Service catalog line items or custom service milestones with rates and quantities.
            </p>
          </div>
          <button
            onClick={addLine}
            type="button"
            className="btn btn-secondary text-xs inline-flex items-center gap-1 py-1 px-3"
          >
            <Plus size={13} /> Add Line
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2 w-10 text-center">#</th>
                <th className="px-3 py-2 w-1/4">Service Item (Catalog)</th>
                <th className="px-3 py-2">Scope / Description *</th>
                <th className="px-3 py-2 w-24">Qty / Hours</th>
                <th className="px-3 py-2 w-32">Rate (GH₵)</th>
                <th className="px-3 py-2 w-32 text-right">Line Total</th>
                <th className="px-2 py-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {lines.map((ln, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <select
                      value={ln.item_id}
                      onChange={(e) => updateLine(idx, { item_id: e.target.value })}
                      className="input text-xs w-full py-1"
                    >
                      <option value="">-- Custom Service --</option>
                      {serviceItemsCatalog.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.item_name || item.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={ln.description}
                      onChange={(e) => updateLine(idx, { description: e.target.value })}
                      placeholder="e.g. Deep clean and sterilization of HVAC filters"
                      className="input text-xs w-full py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={ln.qty}
                      onChange={(e) => updateLine(idx, { qty: e.target.value })}
                      className="input text-xs w-full py-1 font-mono"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={ln.unit_price}
                      onChange={(e) => updateLine(idx, { unit_price: e.target.value })}
                      className="input text-xs w-full py-1 font-mono"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {Number(ln.line_total || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        title="Delete line"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">
                GH₵ {computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
              <span>Total Estimated Spend:</span>
              <span className="font-mono text-brand-600 dark:text-brand-400">
                GH₵ {computedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
