import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "../../../../api/client";
import { Trash2, ArrowLeft, Star, FileText, CheckCircle2, XCircle } from "lucide-react";
import { usePermission } from "@/auth/PermissionContext.jsx";
import { toast } from "react-toastify";

function toISODate(v) {
  if (!v) return "";
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function ServiceConfirmationForm() {
  const { hasExceptional } = usePermission();
  const { id: routeId } = useParams();
  const location = useLocation();
  const { search } = location;
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const queryConfirmationId = searchParams.get("confirmation_id") || "";
  const confirmationId = (routeId && routeId !== "new") ? routeId : queryConfirmationId;
  const isNew = !confirmationId;
  const mode = searchParams.get("mode") || (isNew ? "edit" : "view");
  const isViewMode = mode === "view";

  const preselectedRequestId =
    searchParams.get("request_id") || searchParams.get("order_id") || "";

  const backPath = "/purchase/service-confirmations";
  const formEntryPath = `${backPath}/new`;

  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [supplierSearch, setSupplierSearch] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");

  const selectedRequest = useMemo(
    () => serviceRequests.find((x) => String(x.id) === String(selectedRequestId)),
    [serviceRequests, selectedRequestId]
  );

  const [formData, setFormData] = useState({
    sc_no: "",
    sc_date: toISODate(new Date()),
    supplier_id: "",
    order_id: "",
    order_no: "",
    status: "DRAFT",
    remarks: "",
    details: [],
  });

  const [appointmentTime, setAppointmentTime] = useState("");
  const [accept1, setAccept1] = useState(false);
  const [accept2, setAccept2] = useState(false);
  const [accept3, setAccept3] = useState(false);
  const [accept4, setAccept4] = useState(false);
  const [accept5, setAccept5] = useState(false);
  const [satisfaction, setSatisfaction] = useState("5");
  const [customerFeedback, setCustomerFeedback] = useState("");
  const [autoCreateBill, setAutoCreateBill] = useState(true);
  const [linkedBillNo, setLinkedBillNo] = useState("");

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [orderLines, setOrderLines] = useState([]);
  const [serviceItemsCatalog, setServiceItemsCatalog] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 1. Load Suppliers
  useEffect(() => {
    let mounted = true;
    api
      .get("/purchase/suppliers")
      .then((res) => {
        if (!mounted) return;
        const rows = Array.isArray(res.data?.items) ? res.data.items : [];
        setSuppliers(rows);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Failed to load suppliers");
      });

    // 2. Load Procurement Service Requests
    api
      .get("/purchase/procurement-service-requests")
      .then((res) => {
        if (!mounted) return;
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        setServiceRequests(items);
      })
      .catch(() => {
        if (!mounted) return;
        setServiceRequests([]);
      });

    // 3. Load Service Items Catalog
    api
      .get("/inventory/items")
      .then((res) => {
        if (!mounted) return;
        const rows = Array.isArray(res.data?.items) ? res.data.items : [];
        const filtered = rows.filter((i) => {
          const t = String(i.item_type || "").toUpperCase();
          const tn = String(i.item_type_name || "").toLowerCase();
          const si = String(i.service_item || "").toUpperCase();
          return (
            t === "SERVICE" ||
            tn.includes("service") ||
            si === "Y" ||
            Number(i.service_item) === 1
          );
        });
        setServiceItemsCatalog(filtered);
      })
      .catch(() => {
        if (!mounted) return;
        setServiceItemsCatalog([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Handle preselected request ID from URL query
  useEffect(() => {
    if (preselectedRequestId && !selectedRequestId) {
      setSelectedRequestId(String(preselectedRequestId));
    }
  }, [preselectedRequestId, selectedRequestId]);

  // When a Service Request is selected, load its details and populate form
  useEffect(() => {
    if (!selectedRequestId) {
      if (isNew) {
        setOrderLines([]);
      }
      return;
    }

    let mounted = true;
    api
      .get(`/purchase/procurement-service-requests/${selectedRequestId}`)
      .then((res) => {
        if (!mounted) return;
        const reqItem = res.data?.item || {};
        const lines = Array.isArray(res.data?.lines) ? res.data.lines : [];

        if (isNew) {
          setOrderLines(
            lines.map((ln, idx) => ({
              id: ln.id || `line-${idx + 1}`,
              line_no: ln.line_no || idx + 1,
              item_id: ln.item_id || "",
              item_name: ln.item_name || ln.description || "",
              description: ln.description || ln.item_name || "",
              qty: Number(ln.qty || 1),
              unit_price: Number(ln.unit_price || 0),
              line_total: Number(ln.line_total || Number(ln.qty || 1) * Number(ln.unit_price || 0)),
            }))
          );
        }

        const matchedSupplier = reqItem.supplier_id
          ? String(reqItem.supplier_id)
          : suppliers.find(
              (s) =>
                String(s.supplier_name || "").trim().toLowerCase() ===
                String(reqItem.supplier_name || reqItem.contractor_name || "").trim().toLowerCase()
            )?.id;

        setFormData((prev) => ({
          ...prev,
          supplier_id: matchedSupplier ? String(matchedSupplier) : prev.supplier_id,
          order_id: String(reqItem.id),
          order_no: reqItem.request_no || reqItem.order_no || prev.order_no,
        }));
      })
      .catch(() => {
        // Fallback to service-orders endpoint
        api
          .get(`/purchase/service-orders/${selectedRequestId}`)
          .then((res) => {
            if (!mounted) return;
            const reqItem = res.data?.item || {};
            const lines = Array.isArray(res.data?.lines) ? res.data.lines : [];
            if (isNew) {
              setOrderLines(
                lines.map((ln, idx) => ({
                  id: ln.id || `line-${idx + 1}`,
                  line_no: ln.line_no || idx + 1,
                  item_id: ln.item_id || "",
                  item_name: ln.item_name || ln.description || "",
                  description: ln.description || ln.item_name || "",
                  qty: Number(ln.qty || 1),
                  unit_price: Number(ln.unit_price || 0),
                  line_total: Number(ln.line_total || Number(ln.qty || 1) * Number(ln.unit_price || 0)),
                }))
              );
            }
            if (reqItem.supplier_id) {
              setFormData((prev) => ({
                ...prev,
                supplier_id: String(reqItem.supplier_id),
                order_id: String(reqItem.id),
                order_no: reqItem.order_no || prev.order_no,
              }));
            }
          })
          .catch(() => {});
      });

    return () => {
      mounted = false;
    };
  }, [isNew, selectedRequestId, suppliers]);

  // Load existing Service Confirmation if editing or viewing
  useEffect(() => {
    if (isNew) return;

    let mounted = true;
    setLoading(true);
    setError("");

    api
      .get(`/purchase/service-confirmations/${confirmationId}`)
      .then((res) => {
        if (!mounted) return;
        const c = res.data?.item;
        const details = Array.isArray(res.data?.details) ? res.data.details : [];
        if (!c) return;

        const normalizedDetails = details.map((d, idx) => ({
          id: d.id || `line-${idx + 1}`,
          line_no: idx + 1,
          item_id: d.item_id || "",
          item_name: d.description || "",
          description: d.description || "",
          qty: d.qty ?? 1,
          unit_price: d.unit_price ?? 0,
          line_total:
            d.line_total ?? Number(d.qty || 0) * Number(d.unit_price || 0),
        }));

        setFormData({
          sc_no: c.sc_no || "",
          sc_date: toISODate(c.sc_date),
          supplier_id: c.supplier_id ? String(c.supplier_id) : "",
          order_id: c.order_id ? String(c.order_id) : "",
          order_no: c.order_no || "",
          status: c.status || "DRAFT",
          remarks: c.remarks || "",
          details: normalizedDetails,
        });

        if (c.order_id) {
          setSelectedRequestId(String(c.order_id));
        }

        setAppointmentTime(
          c.service_time ? String(c.service_time).slice(0, 5) : ""
        );
        setAccept1(!!Number(c.acceptance_1));
        setAccept2(!!Number(c.acceptance_2));
        setAccept3(!!Number(c.acceptance_3));
        setAccept4(!!Number(c.acceptance_4));
        setAccept5(!!Number(c.acceptance_5));
        setSatisfaction(
          c.satisfaction == null || c.satisfaction === ""
            ? "5"
            : String(c.satisfaction)
        );
        setCustomerFeedback(c.customer_feedback || "");
        setAutoCreateBill(c.auto_create_bill != null ? Boolean(c.auto_create_bill) : true);
        setLinkedBillNo(c.bill_no || "");
        setOrderLines(normalizedDetails);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Failed to load service confirmation");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [confirmationId, isNew]);

  // Line item helpers
  const addServiceItem = () => {
    setOrderLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        line_no: prev.length + 1,
        item_id: "",
        item_name: "",
        description: "",
        qty: 1,
        unit_price: 0,
        line_total: 0,
      },
    ]);
  };

  const updateServiceItem = (id, key, value) => {
    setOrderLines((prev) =>
      prev.map((it) => {
        if (it.id !== id && it.line_no !== id) return it;
        const next = { ...it, [key]: value };
        if (key === "item_id") {
          const selected = serviceItemsCatalog.find((s) => String(s.id) === String(value)) || null;
          if (selected) {
            next.description = selected.item_name || "";
            next.item_name = selected.item_name || "";
            const sp = Number(selected.selling_price || selected.cost_price || 0);
            if (Number.isFinite(sp) && sp > 0) next.unit_price = sp;
          }
        }
        const qty = parseFloat(next.qty || 0);
        const price = parseFloat(next.unit_price || 0);
        next.line_total = qty * price;
        return next;
      })
    );
  };

  const removeServiceItem = (id) => {
    setOrderLines((prev) => prev.filter((it) => it.id !== id && it.line_no !== id));
  };

  const computedTotal = useMemo(() => {
    return orderLines.reduce((sum, ln) => {
      const lineTotal = Number(ln.line_total);
      if (Number.isFinite(lineTotal)) return sum + lineTotal;
      const qty = Number(ln.qty || 0);
      const price = Number(ln.unit_price || 0);
      return sum + qty * price;
    }, 0);
  }, [orderLines]);

  const readyToConfirm = useMemo(() => {
    const checksOk = accept1 && accept2 && accept3 && accept4 && accept5;
    const hasSupplier = !!formData.supplier_id;
    const hasDate = !!formData.sc_date;
    const hasLines = orderLines.length > 0;
    return checksOk && hasSupplier && hasDate && hasLines;
  }, [accept1, accept2, accept3, accept4, accept5, formData.supplier_id, formData.sc_date, orderLines]);

  const onSupplierChange = (val) => {
    setFormData((prev) => ({
      ...prev,
      supplier_id: val,
    }));
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!formData.sc_date) throw new Error("Confirmation date is required");
      if (!formData.supplier_id) throw new Error("Supplier / Contractor is required");
      if (!orderLines.length) throw new Error("At least one service item line is required");
      if (!(accept1 && accept2 && accept3 && accept4 && accept5)) {
        throw new Error("Please check and verify all 5 quality acceptance items before confirming");
      }

      const payload = {
        sc_no:
          formData.sc_no ||
          `SC-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`,
        sc_date: formData.sc_date,
        supplier_id: Number(formData.supplier_id),
        service_time: appointmentTime || null,
        status: "CONFIRMED",
        remarks: formData.remarks || null,
        details: orderLines.map((d) => ({
          item_id: d.item_id ? Number(d.item_id) : null,
          description: d.description || d.item_name || "Service Deliverable",
          qty: Number(d.qty || 1),
          unit_price: Number(d.unit_price || 0),
          line_total: Number(d.line_total || Number(d.qty || 1) * Number(d.unit_price || 0)),
          is_confirmed: true,
        })),
        acceptance_1: accept1,
        acceptance_2: accept2,
        acceptance_3: accept3,
        acceptance_4: accept4,
        acceptance_5: accept5,
        satisfaction: Number(satisfaction || 5),
        customer_feedback: customerFeedback || null,
        order_id: selectedRequestId ? Number(selectedRequestId) : (formData.order_id ? Number(formData.order_id) : null),
        order_no: formData.order_no || (selectedRequest ? selectedRequest.request_no : null),
        auto_create_bill: Boolean(autoCreateBill),
      };

      let res;
      if (isNew) {
        res = await api.post("/purchase/service-confirmations", payload);
      } else {
        res = await api.put(`/purchase/service-confirmations/${confirmationId}`, payload);
      }

      if (res?.data?.bill_no) {
        toast.success(`Service Confirmation confirmed! Service Bill #${res.data.bill_no} generated in Service Bills.`);
      } else {
        toast.success("Service Confirmation confirmed successfully!");
      }

      navigate(backPath);
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Failed to save service confirmation"
      );
    } finally {
      setSaving(false);
    }
  };

  const readonlyClass = isViewMode
    ? "input bg-sky-50 border-sky-200 text-slate-700 cursor-not-allowed disabled:bg-sky-50 disabled:border-sky-200 disabled:text-slate-700"
    : "input";
  const readonlySurfaceClass = isViewMode
    ? "bg-sky-50 border-sky-200"
    : "bg-white border-slate-200 hover:border-slate-300";

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 45px)" }}>
      <div className="flex-1 overflow-y-auto pb-12">
        <div className="space-y-6">
          {/* Header Card */}
          <div className="card">
            <div className="card-header bg-brand text-white rounded-t-lg">
              <div className="flex justify-between items-center text-white">
                <div className="flex items-center gap-3">
                  <Link
                    to={backPath}
                    className="px-3 py-1 rounded bg-white text-brand hover:bg-slate-100 font-semibold text-sm"
                  >
                    ← Back
                  </Link>
                  <div>
                    <h1 className="text-2xl font-bold dark:text-brand-300">
                      {isViewMode
                        ? "View Service Confirmation"
                        : isNew
                        ? "New Service Confirmation"
                        : "Edit Service Confirmation"}
                    </h1>
                    <p className="text-sm mt-0.5 text-slate-100">
                      Procurement • Confirm delivered services & certify for bill payment
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    {now.toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-sm font-semibold">
                    {now.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-body">
              {loading && (
                <div className="p-4 text-center text-slate-500 font-medium">
                  Loading service confirmation...
                </div>
              )}

              {error && (
                <div className="p-4 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                {/* 1. SERVICE DETAILS SECTION (FIRST SECTION ON THE PAGE) */}
                <div className="card border border-slate-200 shadow-sm rounded-xl">
                  <div className="card-body space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span>Service Details</span>
                      </div>
                      {formData.sc_no && (
                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                          {formData.sc_no}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="label font-bold text-xs uppercase tracking-wider text-slate-600">
                          DATE *
                        </label>
                        <input
                          type="date"
                          className={readonlyClass}
                          value={formData.sc_date}
                          onChange={(e) =>
                            !isViewMode &&
                            setFormData({
                              ...formData,
                              sc_date: e.target.value,
                            })
                          }
                          disabled={isViewMode}
                          required
                        />
                      </div>
                      <div className="relative flex flex-col gap-1">
                        <label className="label font-bold text-xs uppercase tracking-wider text-slate-600">
                          SUPPLIER *
                        </label>
                        <input
                          type="text"
                          className={readonlyClass}
                          placeholder="Search supplier..."
                          value={
                            suppliers.find(
                              (s) => String(s.id) === String(formData.supplier_id)
                            )?.supplier_name || supplierSearch
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            setSupplierSearch(val);
                            setFormData((prev) => ({ ...prev, supplier_id: "" }));
                          }}
                          disabled={isViewMode}
                          required
                        />
                        {!isViewMode &&
                          supplierSearch &&
                          (() => {
                            const q = supplierSearch.toLowerCase();
                            const matched = suppliers
                              .filter(
                                (s) =>
                                  String(s.supplier_name || "")
                                    .toLowerCase()
                                    .includes(q) ||
                                  String(s.supplier_code || "")
                                    .toLowerCase()
                                    .includes(q)
                              )
                              .slice(0, 10);
                            return matched.length > 0 ? (
                              <div
                                className="absolute z-30 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-lg mt-1 max-h-52 overflow-y-auto"
                                style={{ top: "100%" }}
                              >
                                {matched.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      onSupplierChange(String(s.id));
                                      setSupplierSearch("");
                                    }}
                                  >
                                    <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                                      {s.supplier_name}
                                    </div>
                                    {s.supplier_code && (
                                      <div className="text-xs text-slate-500">
                                        {s.supplier_code}
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            ) : null;
                          })()}
                      </div>
                      <div>
                        <label className="label font-bold text-xs uppercase tracking-wider text-slate-600">
                          TIME
                        </label>
                        <input
                          type="time"
                          className={readonlyClass}
                          value={appointmentTime}
                          onChange={(e) =>
                            !isViewMode && setAppointmentTime(e.target.value)
                          }
                          disabled={isViewMode}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SERVICE REQUEST REFERENCE (REPLACED SERVICE ORDER) */}
                <div className="card border border-slate-200 shadow-sm rounded-xl">
                  <div className="card-body space-y-4">
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 pb-3">
                      <span>Service Request Reference</span>
                      <span className="text-xs text-slate-500 font-normal">
                        Select a Procurement Service Request to populate scope and pricing
                      </span>
                    </div>

                    <div>
                      <label className="label font-bold text-xs uppercase tracking-wider text-slate-600">
                        PROCUREMENT SERVICE REQUEST *
                      </label>
                      <select
                        className={readonlyClass}
                        value={selectedRequestId}
                        onChange={(e) => {
                          if (isViewMode) return;
                          setSelectedRequestId(e.target.value);
                        }}
                        disabled={isViewMode}
                      >
                        <option value="">Select procurement service request...</option>
                        {serviceRequests.map((req) => (
                          <option key={req.id} value={String(req.id)}>
                            {req.request_no} — {req.supplier_name || req.contractor_name || "Vendor"} ({req.status || "PENDING"}) • {toISODate(req.request_date)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedRequest && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 text-sm">
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">Request No</div>
                          <div className="font-semibold text-brand-700 dark:text-brand-300">
                            {selectedRequest.request_no}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">Vendor / Contractor</div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {selectedRequest.supplier_name || selectedRequest.contractor_name || "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">Work Location</div>
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {selectedRequest.work_location || "On-site"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-500 uppercase">Status</div>
                          <span className="inline-block mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {selectedRequest.status || "APPROVED"}
                          </span>
                        </div>
                        {selectedRequest.scope_of_work && (
                          <div className="md:col-span-4 pt-2 border-t border-slate-200/60">
                            <div className="text-[11px] font-bold text-slate-500 uppercase">Scope of Work</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                              {selectedRequest.scope_of_work}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. SERVICE ITEMS & PRICING */}
                <div className="card border border-slate-200 shadow-sm rounded-xl">
                  <div className="card-body space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        📋 Service Items
                      </h4>
                      {!isViewMode && (
                        <button
                          type="button"
                          className="btn-primary text-xs px-3 py-1 font-semibold"
                          onClick={addServiceItem}
                        >
                          + Add Service Item
                        </button>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="table w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 dark:bg-slate-800/50">
                            <th className="py-2.5 px-3 text-left font-bold text-slate-700 w-1/3">Item / Service Deliverable</th>
                            <th className="py-2.5 px-3 text-left font-bold text-slate-700 w-1/3">Scope / Notes</th>
                            <th className="py-2.5 px-3 text-right font-bold text-slate-700 w-24">Qty</th>
                            <th className="py-2.5 px-3 text-right font-bold text-slate-700 w-32">Rate (GH₵)</th>
                            <th className="py-2.5 px-3 text-right font-bold text-slate-700 w-36">Amount (GH₵)</th>
                            {!isViewMode && <th className="py-2.5 px-2 text-center w-12" />}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {orderLines.length === 0 ? (
                            <tr>
                              <td
                                colSpan={isViewMode ? 5 : 6}
                                className="py-6 text-center text-slate-400 font-medium"
                              >
                                No service items added. Select a service request above or click "+ Add Service Item".
                              </td>
                            </tr>
                          ) : (
                            orderLines.map((ln) => {
                              const rowKey = ln.id || ln.line_no;
                              return (
                                <tr key={rowKey} className="hover:bg-slate-50/50">
                                  <td className="py-2 px-3">
                                    {serviceItemsCatalog.length > 0 ? (
                                      <select
                                        className="input text-xs w-full"
                                        value={ln.item_id || ""}
                                        onChange={(e) =>
                                          updateServiceItem(rowKey, "item_id", e.target.value)
                                        }
                                        disabled={isViewMode}
                                      >
                                        <option value="">-- Select Service Item --</option>
                                        {serviceItemsCatalog.map((si) => (
                                          <option key={si.id} value={si.id}>
                                            {si.item_name}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        className="input text-xs w-full"
                                        value={ln.item_name || ln.description}
                                        onChange={(e) =>
                                          updateServiceItem(rowKey, "description", e.target.value)
                                        }
                                        placeholder="Service title"
                                        disabled={isViewMode}
                                      />
                                    )}
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      className="input text-xs w-full"
                                      value={ln.description}
                                      onChange={(e) =>
                                        updateServiceItem(rowKey, "description", e.target.value)
                                      }
                                      placeholder="Specific deliverable or scope detail"
                                      disabled={isViewMode}
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      className="input text-xs text-right w-full"
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={ln.qty}
                                      onChange={(e) =>
                                        updateServiceItem(rowKey, "qty", e.target.value)
                                      }
                                      disabled={isViewMode}
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      className="input text-xs text-right w-full"
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={ln.unit_price}
                                      onChange={(e) =>
                                        updateServiceItem(rowKey, "unit_price", e.target.value)
                                      }
                                      placeholder="0.00"
                                      disabled={isViewMode}
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-100">
                                    {(
                                      parseFloat(ln.qty || 0) * parseFloat(ln.unit_price || 0)
                                    ).toFixed(2)}
                                  </td>
                                  {!isViewMode && (
                                    <td className="py-2 px-2 text-center">
                                      <button
                                        type="button"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                        onClick={() => removeServiceItem(rowKey)}
                                        title="Remove Line"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                      <span className="text-sm font-bold text-slate-600">Total</span>
                      <span className="text-lg font-mono font-bold text-brand-700 dark:text-brand-300">
                        GH₵ {computedTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. SERVICE ACCEPTANCE & QUALITY VERIFICATION */}
                <div className="card border border-slate-200 shadow-sm rounded-xl">
                  <div className="card-body space-y-4">
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 pb-3">
                      Service Acceptance & Verification Checklist
                    </div>
                    <div className="space-y-2.5">
                      <label
                        className={`flex items-center gap-3 p-2.5 rounded-lg border ${readonlySurfaceClass} ${
                          isViewMode ? "cursor-default" : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={accept1}
                          disabled={isViewMode}
                          onChange={(e) => !isViewMode && setAccept1(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm text-slate-800 dark:text-slate-200">
                          All services listed were completed as specified
                        </span>
                      </label>
                      <label
                        className={`flex items-center gap-3 p-2.5 rounded-lg border ${readonlySurfaceClass} ${
                          isViewMode ? "cursor-default" : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={accept2}
                          disabled={isViewMode}
                          onChange={(e) => !isViewMode && setAccept2(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm text-slate-800 dark:text-slate-200">
                          Work quality meets agreed procurement standards
                        </span>
                      </label>
                      <label
                        className={`flex items-center gap-3 p-2.5 rounded-lg border ${readonlySurfaceClass} ${
                          isViewMode ? "cursor-default" : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={accept3}
                          disabled={isViewMode}
                          onChange={(e) => !isViewMode && setAccept3(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm text-slate-800 dark:text-slate-200">
                          Materials and parts used were as specified or approved
                        </span>
                      </label>
                      <label
                        className={`flex items-center gap-3 p-2.5 rounded-lg border ${readonlySurfaceClass} ${
                          isViewMode ? "cursor-default" : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={accept4}
                          disabled={isViewMode}
                          onChange={(e) => !isViewMode && setAccept4(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm text-slate-800 dark:text-slate-200">
                          Service location was left clean and tidy
                        </span>
                      </label>
                      <label
                        className={`flex items-center gap-3 p-2.5 rounded-lg border ${readonlySurfaceClass} ${
                          isViewMode ? "cursor-default" : "cursor-pointer"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={accept5}
                          disabled={isViewMode}
                          onChange={(e) => !isViewMode && setAccept5(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-sm text-slate-800 dark:text-slate-200">
                          All documentation, test reports, and handovers received
                        </span>
                      </label>
                    </div>

                    <div className="pt-2">
                      <label className="label font-bold text-xs uppercase tracking-wider text-slate-600">
                        Overall Satisfaction *
                      </label>
                      <div className="flex flex-wrap gap-2.5 mt-1">
                        {[5, 4, 3, 2, 1].map((n) => (
                          <label
                            key={n}
                            className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border ${
                              isViewMode
                                ? "bg-sky-50 border-sky-200"
                                : satisfaction === String(n)
                                ? "bg-amber-50 border-amber-300 font-semibold"
                                : "bg-white border-slate-200"
                            }`}
                          >
                            <input
                              type="radio"
                              name="satisfaction"
                              value={String(n)}
                              checked={satisfaction === String(n)}
                              disabled={isViewMode}
                              onChange={(e) => !isViewMode && setSatisfaction(e.target.value)}
                            />
                            {Array.from({ length: n })
                              .map(() => "⭐")
                              .join("")}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="label font-bold text-xs uppercase tracking-wider text-slate-600">
                        Inspection Feedback (Optional)
                      </label>
                      <textarea
                        className={`${readonlyClass} w-full`}
                        rows="3"
                        value={customerFeedback}
                        onChange={(e) => !isViewMode && setCustomerFeedback(e.target.value)}
                        disabled={isViewMode}
                        placeholder="Notes on performance, quality, or hand-over observations..."
                      />
                    </div>
                  </div>
                </div>

                {/* 5. BILLING & INVOICING */}
                <div className="card border border-slate-200 shadow-sm rounded-xl">
                  <div className="card-body space-y-3">
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between border-b border-slate-100 pb-3">
                      <span>Billing & Invoicing</span>
                      {linkedBillNo && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Linked Service Bill: #{linkedBillNo}
                        </span>
                      )}
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <label className="inline-flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(autoCreateBill)}
                          disabled={isViewMode}
                          onChange={(e) => setAutoCreateBill(e.target.checked)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 h-4 w-4"
                        />
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          Generate bill for payment
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 6. ADDITIONAL INFORMATION (WARRANTY AND FOLLOW-UP REMOVED AS REQUESTED) */}
                <div className="card border border-slate-200 shadow-sm rounded-xl">
                  <div className="card-body space-y-3">
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 pb-3">
                      Additional Information
                    </div>
                    <div>
                      <label className="label font-bold text-xs uppercase tracking-wider text-slate-600">
                        Remarks
                      </label>
                      <textarea
                        className={`${readonlyClass} w-full`}
                        rows="4"
                        value={formData.remarks}
                        onChange={(e) =>
                          !isViewMode &&
                          setFormData({
                            ...formData,
                            remarks: e.target.value,
                          })
                        }
                        disabled={isViewMode}
                        placeholder="Internal procurement notes, reference terms, or observations..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-t-2 border-slate-200 dark:border-slate-800 shadow-lg px-6 py-3">
        <div className="flex justify-end items-center gap-3">
          <Link
            to={backPath}
            className="btn-secondary px-6 py-2.5 text-sm font-semibold"
          >
            {isViewMode ? "Back to List" : "Cancel"}
          </Link>
          {isViewMode ? (
            <button
              type="button"
              className="btn-primary px-6 py-2.5 text-sm font-semibold"
              onClick={() => {
                const nextParams = new URLSearchParams();
                if (confirmationId) nextParams.set("confirmation_id", confirmationId);
                if (selectedRequestId) nextParams.set("request_id", selectedRequestId);
                nextParams.set("mode", "edit");
                navigate(`${formEntryPath}?${nextParams.toString()}`);
              }}
            >
              Edit Confirmation
            </button>
          ) : (
            <>
              {!isNew && (
                <button
                  type="button"
                  className="btn-danger px-6 py-2.5 text-sm font-semibold"
                  onClick={() => {
                    setRejectionReason("");
                    setShowRejectModal(true);
                  }}
                >
                  Reject Service
                </button>
              )}
              <button
                type="button"
                className="btn-success px-6 py-2.5 text-sm font-semibold"
                onClick={handleSubmit}
                disabled={saving || !readyToConfirm}
              >
                Confirm Service Completion
              </button>
            </>
          )}
        </div>
        {error ? (
          <div className="text-sm text-red-600 mt-2 text-right">{error}</div>
        ) : null}
      </div>

      {/* Service Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl">
            <div className="card-header bg-brand text-white rounded-t-lg">
              <div className="font-semibold">Service Rejection</div>
            </div>
            <div className="card-body space-y-3 p-4">
              <div>
                <label className="label font-bold text-xs uppercase tracking-wider text-slate-600">
                  Reason for Rejection *
                </label>
                <textarea
                  className="input w-full"
                  rows="4"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Detail the non-compliance, incomplete deliverables, or defects..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowRejectModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={async () => {
                    if (!rejectionReason.trim()) {
                      alert("Please provide a reason for rejection.");
                      return;
                    }
                    try {
                      setSaving(true);
                      await api.put(`/purchase/service-confirmations/${confirmationId}`, {
                        ...formData,
                        status: "CANCELLED",
                        remarks: rejectionReason,
                        order_id: selectedRequestId ? Number(selectedRequestId) : formData.order_id || null,
                      });
                      toast.info("Service rejection recorded.");
                      setShowRejectModal(false);
                      navigate(backPath);
                    } catch (err) {
                      toast.error(err?.response?.data?.message || err?.message || "Failed to reject");
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Submit Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
