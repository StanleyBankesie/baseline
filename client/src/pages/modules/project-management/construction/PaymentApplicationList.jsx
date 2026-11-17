/**
 * @file PaymentApplicationList.jsx
 * @description Progress Payment Claims register, work valuation, materials on site,
 * contract retention, statutory deductions, engineering certification, and finance settlement.
 */

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Plus,
  ArrowLeft,
  Calendar,
  CheckCircle,
  X,
  Search,
  RefreshCw,
  Building,
  DollarSign,
  ShieldCheck,
  CreditCard,
  Printer,
  ChevronRight,
  Send,
  Eye,
  AlertTriangle,
  Receipt,
  FileSpreadsheet,
  FileCheck2,
  CheckCircle2,
  Clock,
  Trash2,
  Copy,
  Paperclip,
  Download,
  Percent,
  Layers,
  Package,
  FileSignature,
  Edit,
  SlidersHorizontal,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import ProjectModal from "../components/ProjectModal.jsx";
import DocumentAttachmentsModal from "../../../../components/attachments/DocumentAttachmentsModal.jsx";

export default function PaymentApplicationList() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeProject, setActiveProject] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [contractorFilter, setContractorFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");

  // Approved valuations for optional linking
  const [availableValuations, setAvailableValuations] = useState([]);

  // Modals
  const [showAppModal, setShowAppModal] = useState(false);
  const [modalMode, setModalMode] = useState("CREATE"); // CREATE | EDIT | VIEW
  const [modalTab, setModalTab] = useState("info"); // info | work | materials | retention | deductions | summary | history
  const [submitting, setSubmitting] = useState(false);

  // Attachments Modal
  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);
  const [selectedAttachmentAppId, setSelectedAttachmentAppId] = useState(null);

  // Certification Modal
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  const [certifyForm, setCertifyForm] = useState({
    id: null,
    certified_amount: 0,
    assessed_amount: 0,
    rejected_amount: 0,
    certification_doc_no: "",
    adjustment_reason: "",
    qs_comments: "",
    pm_comments: "",
  });

  // Record Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    id: null,
    payment_amount: 0,
    payment_voucher_ref: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "BANK_TRANSFER",
    finance_notes: "",
  });

  // Printable view
  const [printApp, setPrintApp] = useState(null);

  // Main Form Data
  const initialFormData = {
    id: null,
    project_id: "",
    contract_ref: "",
    client_name: "",
    contractor_name: "",
    valuation_id: null,
    valuation_no: "",
    application_number: "",
    application_date: new Date().toISOString().split("T")[0],
    period_from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    period_to: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    payment_terms: "30 Days from Certification",
    currency: "GHS",
    application_type: "INTERIM",
    status: "DRAFT",
    description: "",

    // Valuations & Materials
    work_completed_value: 0,
    materials_on_site_value: 0,
    approved_variations_value: 0,
    other_additions_value: 0,
    gross_amount_assessed: 0,

    // Retention
    retention_percent: 5,
    retention_cap: 0,
    retention_amount: 0,
    retention_released: 0,

    // Deductions
    advance_recovery_amount: 0,
    penalties_amount: 0,
    overpayments_amount: 0,
    other_deductions_amount: 0,
    previous_certified_amount: 0,
    adjustments_amount: 0,

    // Net Result
    net_amount_requested: 0,
    certified_amount: 0,
    amount_paid: 0,
    outstanding_balance: 0,
    payment_status: "UNPAID",

    // Dynamic Lists
    work_items: [
      {
        id: "w-1",
        description: "General Preliminaries & Mobilization",
        wbs_ref: "WBS-1.0",
        uom: "LOT",
        contract_qty: 1,
        contract_rate: 15000,
        previous_qty: 0,
        current_qty: 1,
        cumulative_qty: 1,
        cumulative_val: 15000,
        previous_val: 0,
        current_val: 15000,
      },
    ],
    materials_items: [],
    deductions_items: [],

    // Review Notes
    qs_comments: "",
    pm_comments: "",
    certification_doc_no: "",
    payment_voucher_ref: "",
    approval_history: [],
    attachments: [],
  };

  const [formData, setFormData] = useState(initialFormData);

  // Load initial projects
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/projects/projects", { params: { active: "all" } });
        const prjs = res.data?.items || [];
        setProjects(prjs);
        if (prjs.length > 0) {
          setSelectedProjectId(String(prjs[0].id));
          setActiveProject(prjs[0]);
        } else {
          setLoading(false);
        }
      } catch (e) {
        toast.error("Failed to load projects");
        setLoading(false);
      }
    })();
  }, []);

  // Sync active project and fetch applications
  useEffect(() => {
    const prj = (Array.isArray(projects) ? projects : []).find((p) => String(p.id) === String(selectedProjectId));
    setActiveProject(prj || null);
    fetchApplications();
    fetchAvailableValuations();
  }, [selectedProjectId, projects]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/construction/payment-applications", {
        params: selectedProjectId ? { project_id: selectedProjectId } : {},
      });
      setApplications(res.data?.items || []);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to load payment applications");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableValuations = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await api.get("/construction/client-valuations", {
        params: { project_id: selectedProjectId },
      });
      setAvailableValuations(res.data?.items || []);
    } catch (_) {}
  };

  // Safe parse JSON list helpers
  const parseJsonList = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  };

  // Helper to generate next claim number
  const generateClaimNumber = (proj) => {
    const code = proj?.project_code || "PRJ";
    const year = new Date().getFullYear();
    const projApps = applications.filter(
      (a) => !proj?.id || String(a.project_id) === String(proj.id)
    );
    const seq = String(projApps.length + 1).padStart(3, "0");
    return `PPC-${code}-${year}-${seq}`;
  };

  // Open New Modal
  const openNewApplicationModal = () => {
    const curProj =
      (Array.isArray(projects) ? projects : []).find((p) => String(p.id) === String(selectedProjectId)) || activeProject || (Array.isArray(projects) ? projects[0] : null);
    const generatedNo = generateClaimNumber(curProj);

    setFormData({
      ...initialFormData,
      project_id: curProj ? String(curProj.id) : "",
      contract_ref: curProj?.contract_ref_no || `CTR-${curProj?.project_code || "001"}`,
      client_name: curProj?.client_name || "Client",
      contractor_name: curProj?.contractor_name || "Main Contractor",
      application_number: generatedNo,
      currency: curProj?.currency || "GHS",
    });

    setModalMode("CREATE");
    setModalTab("info");
    setShowAppModal(true);
  };

  // Open View or Edit Modal
  const openViewOrEditModal = async (id, mode = "VIEW") => {
    try {
      const res = await api.get(`/construction/payment-applications/${id}`);
      const item = res.data?.item || {};

      const workItems = parseJsonList(item.work_items);
      const materialsItems = parseJsonList(item.materials_items);
      const deductionsItems = parseJsonList(item.deductions_items);
      const approvalHistory = parseJsonList(item.approval_history);
      const attachments = parseJsonList(item.attachments);

      setFormData({
        ...item,
        work_items: workItems.length > 0 ? workItems : initialFormData.work_items,
        materials_items: materialsItems,
        deductions_items: deductionsItems,
        approval_history: approvalHistory,
        attachments: attachments,
        retention_percent: Number(item.retention_percent ?? 5),
        retention_cap: Number(item.retention_cap ?? 0),
      });

      setModalMode(mode);
      setModalTab("info");
      setShowAppModal(true);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to load payment claim details");
    }
  };

  // Duplicate an Application
  const handleDuplicate = async (app) => {
    try {
      const res = await api.get(`/construction/payment-applications/${app.id}`);
      const item = res.data?.item || {};
      const curProj = (Array.isArray(projects) ? projects : []).find((p) => String(p.id) === String(item.project_id)) || activeProject;
      const newNo = generateClaimNumber(curProj);

      const workItems = parseJsonList(item.work_items).map((w, idx) => ({
        ...w,
        id: `w-dup-${idx + 1}`,
        previous_qty: w.cumulative_qty || w.previous_qty || 0,
        previous_val: w.cumulative_val || w.previous_val || 0,
        current_qty: 0,
        current_val: 0,
      }));

      const materialsItems = parseJsonList(item.materials_items).map((m, idx) => ({
        ...m,
        id: `m-dup-${idx + 1}`,
      }));

      setFormData({
        ...item,
        id: null,
        application_number: newNo,
        application_date: new Date().toISOString().split("T")[0],
        period_from: item.period_to ? String(item.period_to).split("T")[0] : new Date().toISOString().split("T")[0],
        period_to: new Date().toISOString().split("T")[0],
        status: "DRAFT",
        certified_amount: 0,
        amount_paid: 0,
        outstanding_balance: 0,
        payment_status: "UNPAID",
        payment_voucher_ref: "",
        certification_doc_no: "",
        work_items: workItems,
        materials_items: materialsItems,
        deductions_items: parseJsonList(item.deductions_items),
        previous_certified_amount: Number(item.certified_amount || item.net_amount_requested || 0),
        approval_history: [],
      });

      setModalMode("CREATE");
      setModalTab("info");
      setShowAppModal(true);
      toast.info(`Duplicated from ${item.application_number}. Review and save.`);
    } catch (e) {
      toast.error("Failed to duplicate claim");
    }
  };

  // Delete an Application
  const handleDelete = async (id, appNo, amountPaid) => {
    if (Number(amountPaid || 0) > 0) {
      toast.warning("Cannot delete an application with recorded payments in Finance.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete Progress Payment Claim "${appNo}"?`)) {
      return;
    }
    try {
      await api.delete(`/construction/payment-applications/${id}`);
      toast.success(`Claim "${appNo}" deleted successfully`);
      fetchApplications();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to delete claim");
    }
  };

  // Valuation item change handler
  const handleWorkItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.work_items];
      const item = { ...updated[index], [field]: value };

      const prevQty = Number(item.previous_qty || 0);
      const curQty = Number(item.current_qty || 0);
      const rate = Number(item.contract_rate || 0);

      item.cumulative_qty = prevQty + curQty;
      item.previous_val = prevQty * rate;
      item.current_val = curQty * rate;
      item.cumulative_val = item.cumulative_qty * rate;

      updated[index] = item;

      // Recalculate total work completed value
      const totalWorkVal = updated.reduce((sum, w) => sum + Number(w.current_val || 0), 0);

      return {
        ...prev,
        work_items: updated,
        work_completed_value: totalWorkVal,
      };
    });
  };

  const addWorkItem = () => {
    setFormData((prev) => ({
      ...prev,
      work_items: [
        ...prev.work_items,
        {
          id: `w-${Date.now()}`,
          description: "New Valuation Item",
          wbs_ref: "",
          uom: "m2",
          contract_qty: 0,
          contract_rate: 0,
          previous_qty: 0,
          current_qty: 0,
          cumulative_qty: 0,
          cumulative_val: 0,
          previous_val: 0,
          current_val: 0,
        },
      ],
    }));
  };

  const removeWorkItem = (index) => {
    setFormData((prev) => {
      const updated = prev.work_items.filter((_, i) => i !== index);
      const totalWorkVal = updated.reduce((sum, w) => sum + Number(w.current_val || 0), 0);
      return {
        ...prev,
        work_items: updated,
        work_completed_value: totalWorkVal,
      };
    });
  };

  // Material item change handler
  const handleMaterialItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.materials_items];
      const item = { ...updated[index], [field]: value };

      const qty = Number(item.qty || 0);
      const unitCost = Number(item.unit_cost || 0);
      item.total_value = qty * unitCost;

      updated[index] = item;
      const totalMatVal = updated.reduce((sum, m) => sum + Number(m.total_value || 0), 0);

      return {
        ...prev,
        materials_items: updated,
        materials_on_site_value: totalMatVal,
      };
    });
  };

  const addMaterialItem = () => {
    setFormData((prev) => ({
      ...prev,
      materials_items: [
        ...prev.materials_items,
        {
          id: `m-${Date.now()}`,
          description: "",
          delivery_ref: "",
          delivery_date: new Date().toISOString().split("T")[0],
          qty: 0,
          uom: "Bags",
          unit_cost: 0,
          total_value: 0,
          notes: "",
        },
      ],
    }));
  };

  const removeMaterialItem = (index) => {
    setFormData((prev) => {
      const updated = prev.materials_items.filter((_, i) => i !== index);
      const totalMatVal = updated.reduce((sum, m) => sum + Number(m.total_value || 0), 0);
      return {
        ...prev,
        materials_items: updated,
        materials_on_site_value: totalMatVal,
      };
    });
  };

  // Custom Deduction item change handler
  const handleDeductionItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.deductions_items];
      updated[index] = { ...updated[index], [field]: value };

      const customSum = updated.reduce((s, d) => s + Number(d.amount || 0), 0);
      const adv = Number(prev.advance_recovery_amount || 0);
      const pen = Number(prev.penalties_amount || 0);
      const over = Number(prev.overpayments_amount || 0);

      return {
        ...prev,
        deductions_items: updated,
        other_deductions_amount: customSum + adv + pen + over,
      };
    });
  };

  const addDeductionItem = () => {
    setFormData((prev) => ({
      ...prev,
      deductions_items: [
        ...prev.deductions_items,
        {
          id: `d-${Date.now()}`,
          description: "",
          ref: "",
          amount: 0,
        },
      ],
    }));
  };

  const removeDeductionItem = (index) => {
    setFormData((prev) => {
      const updated = prev.deductions_items.filter((_, i) => i !== index);
      const customSum = updated.reduce((s, d) => s + Number(d.amount || 0), 0);
      const adv = Number(prev.advance_recovery_amount || 0);
      const pen = Number(prev.penalties_amount || 0);
      const over = Number(prev.overpayments_amount || 0);

      return {
        ...prev,
        deductions_items: updated,
        other_deductions_amount: customSum + adv + pen + over,
      };
    });
  };

  // Calculate gross, retention and net requested automatically
  const calculatedGross = useMemo(() => {
    return (
      Number(formData.work_completed_value || 0) +
      Number(formData.approved_variations_value || 0) +
      Number(formData.materials_on_site_value || 0) +
      Number(formData.other_additions_value || 0)
    );
  }, [
    formData.work_completed_value,
    formData.approved_variations_value,
    formData.materials_on_site_value,
    formData.other_additions_value,
  ]);

  const calculatedRetention = useMemo(() => {
    const rate = Number(formData.retention_percent || 0);
    const raw = (calculatedGross * rate) / 100;
    const cap = Number(formData.retention_cap || 0);
    if (cap > 0 && raw > cap) return cap;
    return raw;
  }, [calculatedGross, formData.retention_percent, formData.retention_cap]);

  const calculatedNetRequested = useMemo(() => {
    const gross = calculatedGross;
    const ret = Number(formData.retention_amount || calculatedRetention);
    const adv = Number(formData.advance_recovery_amount || 0);
    const otherDed = Number(formData.other_deductions_amount || 0);
    const prevCert = Number(formData.previous_certified_amount || 0);
    const adj = Number(formData.adjustments_amount || 0);

    return Math.max(0, gross - ret - adv - otherDed - prevCert + adj);
  }, [
    calculatedGross,
    formData.retention_amount,
    calculatedRetention,
    formData.advance_recovery_amount,
    formData.other_deductions_amount,
    formData.previous_certified_amount,
    formData.adjustments_amount,
  ]);

  // Keep retention amount in sync if user changes retention percentage
  const handleRetentionPercentChange = (pct) => {
    const p = Number(pct) || 0;
    const raw = (calculatedGross * p) / 100;
    const cap = Number(formData.retention_cap || 0);
    const finalRet = cap > 0 && raw > cap ? cap : raw;
    setFormData((prev) => ({
      ...prev,
      retention_percent: p,
      retention_amount: finalRet,
    }));
  };

  // Link a client valuation
  const handleValuationSelect = (valId) => {
    const val = availableValuations.find((v) => String(v.id) === String(valId));
    if (!val) return;

    const workVal = Number(val.current_certified || val.gross_claimed - val.previous_certified || 0);
    const varsVal = Number(val.approved_variations_total || 0);
    const matVal = Number(val.materials_on_site_value || 0);
    const otherVal = Number(val.other_additions_value || 0);
    const gross = Number(val.gross_assessed_value || workVal + varsVal + matVal + otherVal);
    const ret = Number(val.retention_deducted || 0);
    const adv = Number(val.advance_recovered || 0);
    const otherDed = Number(val.other_deductions || 0);
    const net = Number(val.current_assessed_amount ?? val.net_amount_due ?? gross - ret - adv - otherDed);

    setFormData((prev) => ({
      ...prev,
      valuation_id: val.id,
      valuation_no: val.valuation_no || val.application_no,
      period_from: val.period_from ? String(val.period_from).split("T")[0] : prev.period_from,
      period_to: val.period_to ? String(val.period_to).split("T")[0] : prev.period_to,
      work_completed_value: workVal,
      approved_variations_value: varsVal,
      materials_on_site_value: matVal,
      other_additions_value: otherVal,
      gross_amount_assessed: gross,
      retention_amount: ret,
      advance_recovery_amount: adv,
      other_deductions_amount: otherDed,
      net_amount_requested: net,
    }));
    toast.success(`Valuation ${val.valuation_no} values mapped successfully`);
  };

  // Save Claim (Create or Update)
  const handleSaveApplication = async (targetStatus = formData.status) => {
    if (!formData.project_id) {
      toast.error("Please select a project");
      return;
    }
    if (!formData.application_number) {
      toast.error("Please provide an application number");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        status: targetStatus,
        gross_amount_assessed: calculatedGross,
        retention_amount: Number(formData.retention_amount || calculatedRetention),
        net_amount_requested: calculatedNetRequested,
        submitted_amount: calculatedNetRequested,
        assessed_amount: calculatedNetRequested,
      };

      if (modalMode === "CREATE") {
        await api.post("/construction/payment-applications", payload);
        toast.success(`Progress Payment Claim "${formData.application_number}" created!`);
      } else {
        await api.put(`/construction/payment-applications/${formData.id}`, payload);
        toast.success(`Progress Payment Claim "${formData.application_number}" updated!`);
      }

      setShowAppModal(false);
      fetchApplications();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to save application");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Certification Modal
  const openCertifyModal = (app) => {
    setCertifyForm({
      id: app.id,
      assessed_amount: Number(app.net_amount_requested || 0),
      certified_amount: Number(app.net_amount_requested || 0),
      rejected_amount: 0,
      certification_doc_no: `IPC-${app.application_number}`,
      adjustment_reason: "",
      qs_comments: "",
      pm_comments: "",
    });
    setShowCertifyModal(true);
  };

  // Submit Certification
  const handleCertifySubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!certifyForm.certification_doc_no) {
      toast.error("Please provide a certification document number");
      return;
    }
    try {
      await api.post(`/construction/payment-applications/${certifyForm.id}/certify`, certifyForm);
      toast.success("Progress Payment Claim certified successfully");
      setShowCertifyModal(false);
      fetchApplications();
      if (showAppModal) setShowAppModal(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to certify application");
    }
  };

  // Open Record Payment Modal
  const openPaymentModal = (app) => {
    setPaymentForm({
      id: app.id,
      payment_amount: Number(app.outstanding_balance || app.certified_amount || 0),
      payment_voucher_ref: `PV-${app.application_number}`,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "BANK_TRANSFER",
      finance_notes: "",
    });
    setShowPaymentModal(true);
  };

  // Submit Payment Record
  const handlePaymentSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!paymentForm.payment_voucher_ref) {
      toast.error("Please provide a payment voucher reference");
      return;
    }
    try {
      await api.post(`/construction/payment-applications/${paymentForm.id}/record-payment`, paymentForm);
      toast.success("Client payment recorded & balance updated");
      setShowPaymentModal(false);
      fetchApplications();
      if (showAppModal) setShowAppModal(false);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to record payment");
    }
  };

  // Status Badge Class
  const getStatusBadge = (status) => {
    const s = (status || "DRAFT").toUpperCase();
    switch (s) {
      case "CERTIFIED":
      case "PAID":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
      case "PARTIALLY_CERTIFIED":
      case "PARTIALLY_PAID":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800";
      case "REJECTED":
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  // Filtered Applications
  const filteredApplications = useMemo(() => {
    return applications.filter((a) => {
      // Status filter
      if (statusFilter !== "ALL" && (a.status || "DRAFT") !== statusFilter) return false;

      // Payment status filter
      if (paymentStatusFilter !== "ALL" && (a.payment_status || "UNPAID") !== paymentStatusFilter) return false;

      // Contractor filter
      if (contractorFilter.trim() && !a.contractor_name?.toLowerCase().includes(contractorFilter.toLowerCase())) {
        return false;
      }

      // Date range filter
      if (dateFromFilter) {
        const appDate = a.application_date ? String(a.application_date).split("T")[0] : "";
        if (appDate && appDate < dateFromFilter) return false;
      }
      if (dateToFilter) {
        const appDate = a.application_date ? String(a.application_date).split("T")[0] : "";
        if (appDate && appDate > dateToFilter) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          a.application_number?.toLowerCase().includes(q) ||
          a.project_name?.toLowerCase().includes(q) ||
          a.project_code?.toLowerCase().includes(q) ||
          a.client_name?.toLowerCase().includes(q) ||
          a.contractor_name?.toLowerCase().includes(q) ||
          a.contract_ref?.toLowerCase().includes(q) ||
          a.valuation_no?.toLowerCase().includes(q) ||
          a.certification_doc_no?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    applications,
    statusFilter,
    paymentStatusFilter,
    contractorFilter,
    dateFromFilter,
    dateToFilter,
    searchTerm,
  ]);

  // 5 KPI Summary Calculations based on filtered applications
  const kpiStats = useMemo(() => {
    const totalApps = filteredApplications.length;
    let totalClaimed = 0;
    let totalCertified = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    filteredApplications.forEach((a) => {
      totalClaimed += Number(a.net_amount_requested || 0);
      totalCertified += Number(a.certified_amount || 0);
      totalPaid += Number(a.amount_paid || 0);
      totalOutstanding += Number(a.outstanding_balance || 0);
    });

    return {
      totalApps,
      totalClaimed,
      totalCertified,
      totalPaid,
      totalOutstanding,
    };
  }, [filteredApplications]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredApplications.length === 0) {
      toast.info("No applications to export");
      return;
    }
    const headers = [
      "Application Number",
      "Project Code",
      "Project Name",
      "Contract Ref",
      "Contractor",
      "Application Date",
      "Period From",
      "Period To",
      "Gross Amount",
      "Retention Amount",
      "Net Amount Claimed",
      "Certified Amount",
      "Amount Paid",
      "Outstanding Balance",
      "Status",
      "Payment Status",
    ];

    const rows = filteredApplications.map((a) => [
      `"${a.application_number || ""}"`,
      `"${a.project_code || ""}"`,
      `"${(a.project_name || "").replace(/"/g, '""')}"`,
      `"${a.contract_ref || ""}"`,
      `"${(a.contractor_name || "").replace(/"/g, '""')}"`,
      a.application_date ? String(a.application_date).split("T")[0] : "",
      a.period_from ? String(a.period_from).split("T")[0] : "",
      a.period_to ? String(a.period_to).split("T")[0] : "",
      Number(a.gross_amount_assessed || 0).toFixed(2),
      Number(a.retention_amount || 0).toFixed(2),
      Number(a.net_amount_requested || 0).toFixed(2),
      Number(a.certified_amount || 0).toFixed(2),
      Number(a.amount_paid || 0).toFixed(2),
      Number(a.outstanding_balance || 0).toFixed(2),
      `"${a.status || "DRAFT"}"`,
      `"${a.payment_status || "UNPAID"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Progress_Payment_Claims_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Claims register exported to CSV");
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5">
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCheck2 size={24} className="text-brand-900 dark:text-brand-400" /> Progress Payment Claims
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Valuation of completed work, materials on site, contract retention, and financial settlement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button onClick={handleExportCSV} className="btn btn-secondary inline-flex items-center gap-1.5 text-sm">
            <Download size={15} /> Export Register
          </button>
          <button onClick={openNewApplicationModal} className="btn btn-primary inline-flex items-center gap-2">
            <Plus size={16} /> New Claim
          </button>
        </div>
      </div>

      {/* 2. 5 Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Applications */}
        <div className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Applications
            </p>
            <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {kpiStats.totalApps}
            </p>
            <span className="text-[11px] text-slate-400">Applications registered</span>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md bg-sky-600 dark:bg-sky-500">
            <FileText size={20} className="stroke-[2.5]" />
          </div>
        </div>

        {/* Card 2: Total Amount Claimed */}
        <div className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Amount Claimed
            </p>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              GH₵ {kpiStats.totalClaimed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-slate-400">Net progressive claims</span>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md bg-blue-600">
            <DollarSign size={20} className="stroke-[2.5]" />
          </div>
        </div>

        {/* Card 3: Total Amount Certified */}
        <div className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Amount Certified
            </p>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              GH₵ {kpiStats.totalCertified.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-emerald-600/80">Approved & certified</span>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md bg-emerald-600">
            <ShieldCheck size={20} className="stroke-[2.5]" />
          </div>
        </div>

        {/* Card 4: Total Amount Paid */}
        <div className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Amount Paid
            </p>
            <p className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1">
              GH₵ {kpiStats.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-purple-600/80">Settled via Finance</span>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md bg-purple-600">
            <CreditCard size={20} className="stroke-[2.5]" />
          </div>
        </div>

        {/* Card 5: Outstanding Amount */}
        <div className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Outstanding Amount
            </p>
            <p className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400 mt-1">
              GH₵ {kpiStats.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-rose-500/80">Pending settlement</span>
          </div>
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md bg-rose-600">
            <Clock size={20} className="stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Toolbar BELOW the Cards */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search input */}
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search claim #, contractor, contract..."
                className="input pl-9 pr-3 py-1.5 text-sm h-auto w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Project Selector */}
            <select
              className="input text-sm py-1.5 h-auto min-w-[190px]"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code} - {p.project_name}
                </option>
              ))}
            </select>

            {/* Application Status Filter */}
            <select
              className="input text-sm py-1.5 h-auto min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="CERTIFIED">Certified</option>
              <option value="PARTIALLY_CERTIFIED">Partially Certified</option>
              <option value="PAID">Paid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            {/* Payment Status Filter */}
            <select
              className="input text-sm py-1.5 h-auto min-w-[140px]"
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
            >
              <option value="ALL">All Payments</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Fully Paid</option>
              <option value="OVERDUE">Overdue</option>
            </select>

            {/* Contractor Name */}
            <input
              type="text"
              placeholder="Filter Contractor..."
              className="input py-1.5 text-sm h-auto w-36"
              value={contractorFilter}
              onChange={(e) => setContractorFilter(e.target.value)}
            />

            {/* Date From & To */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Date:</span>
              <input
                type="date"
                className="input py-1 px-2 text-xs h-auto w-32 font-mono"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                title="Date From"
              />
              <span>to</span>
              <input
                type="date"
                className="input py-1 px-2 text-xs h-auto w-32 font-mono"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                title="Date To"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {(searchTerm || statusFilter !== "ALL" || paymentStatusFilter !== "ALL" || contractorFilter || dateFromFilter || dateToFilter) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("ALL");
                  setPaymentStatusFilter("ALL");
                  setContractorFilter("");
                  setDateFromFilter("");
                  setDateToFilter("");
                }}
                className="text-xs text-rose-500 hover:text-rose-700 underline px-2 py-1"
              >
                Reset Filters
              </button>
            )}
            <button
              onClick={fetchApplications}
              className="btn btn-secondary p-2"
              title="Refresh applications list"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Application Register Table */}
      <div className="card overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <FileText size={16} className="text-brand-700 dark:text-brand-400" />
            Progress Payment Claims Register ({filteredApplications.length})
          </h2>
          <div className="text-xs text-slate-500">
            Showing {filteredApplications.length} of {applications.length} claims
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 text-left">Claim Number</th>
                <th className="py-3 px-3 text-left">Project</th>
                <th className="py-3 px-3 text-left">Contract Ref</th>
                <th className="py-3 px-3 text-left">Contractor</th>
                <th className="py-3 px-3 text-left">Date</th>
                <th className="py-3 px-3 text-left">Period</th>
                <th className="py-3 px-3 text-right">Gross (GH₵)</th>
                <th className="py-3 px-3 text-right">Retention</th>
                <th className="py-3 px-3 text-right">Net Claimed</th>
                <th className="py-3 px-3 text-right">Certified</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-3 text-right">Outstanding</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-10 text-center text-slate-400 italic">
                    {applications.length === 0
                      ? 'No progress payment claims created yet. Click "+ New Claim" to create your first application.'
                      : "No progress payment claims match the active filters."}
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-brand-900 dark:text-brand-300">
                      {app.application_number}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{app.project_code || "-"}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[130px]">{app.project_name}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {app.contract_ref || "-"}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                      {app.contractor_name || "Contractor"}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {app.application_date ? String(app.application_date).split("T")[0] : "-"}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-500">
                      {app.period_from && app.period_to
                        ? `${String(app.period_from).split("T")[0]} to ${String(app.period_to).split("T")[0]}`
                        : "-"}
                    </td>
                    <td className="py-3 px-3 text-right font-normal">
                      {Number(app.gross_amount_assessed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-normal text-amber-600">
                      {Number(app.retention_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-brand-900 dark:text-brand-300">
                      {Number(app.net_amount_requested || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {Number(app.certified_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-normal text-purple-600">
                      {Number(app.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600">
                      {Number(app.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                          app.status
                        )}`}
                      >
                        {app.status || "DRAFT"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openViewOrEditModal(app.id, "VIEW")}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => openViewOrEditModal(app.id, "EDIT")}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Claim"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDuplicate(app)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Duplicate Claim"
                        >
                          <Copy size={15} />
                        </button>
                        <button
                          onClick={() => setPrintApp(app)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Print / PDF Statement"
                        >
                          <Printer size={15} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAttachmentAppId(app.id);
                            setAttachmentsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Supporting Documents"
                        >
                          <Paperclip size={15} />
                        </button>
                        {["SUBMITTED", "UNDER_REVIEW", "DRAFT"].includes(app.status) && (
                          <button
                            onClick={() => openCertifyModal(app)}
                            className="btn btn-primary text-xs py-1 px-2 inline-flex items-center gap-1"
                            title="Certify Progress Claim"
                          >
                            <ShieldCheck size={12} /> Certify
                          </button>
                        )}
                        {["CERTIFIED", "PARTIALLY_CERTIFIED", "PAID"].includes(app.status) &&
                          Number(app.outstanding_balance) > 0 && (
                            <button
                              onClick={() => openPaymentModal(app)}
                              className="btn btn-secondary text-xs py-1 px-2 text-emerald-700 border-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1"
                              title="Record Finance Payment"
                            >
                              <CreditCard size={12} /> Pay
                            </button>
                          )}
                        {Number(app.amount_paid || 0) === 0 && (
                          <button
                            onClick={() => handleDelete(app.id, app.application_number, app.amount_paid)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="Delete Claim"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Main Create / Edit / View Claim Modal */}
      <ProjectModal
        open={showAppModal}
        onClose={() => setShowAppModal(false)}
        title={
          modalMode === "CREATE"
            ? "New Progress Payment Claim"
            : modalMode === "EDIT"
            ? `Edit Progress Payment Claim: ${formData.application_number}`
            : `Progress Payment Claim: ${formData.application_number}`
        }
        subtitle="Progressive valuation, materials on site, contract retention, and settlement"
        icon={FileCheck2}
        maxWidth="max-w-6xl"
        showFooter={false}
      >
        <div className="space-y-5">
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2">
            {[
              { id: "info", label: "1. Claim Information", icon: FileText },
              { id: "work", label: "2. Work Completed Valuation", icon: Layers },
              { id: "materials", label: "3. Materials on Site", icon: Package },
              { id: "retention", label: "4. Retention Calculation", icon: Percent },
              { id: "deductions", label: "5. Deductions & Variations", icon: SlidersHorizontal },
              { id: "summary", label: "6. Payment Summary", icon: DollarSign },
              { id: "history", label: "7. Certification & Sign-off", icon: FileSignature },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id)}
                  className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    modalTab === tab.id
                      ? "border-brand-600 text-brand-600 dark:text-brand-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: Claim Information */}
          {modalTab === "info" && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Application / Claim Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={modalMode === "VIEW"}
                    className="input text-sm font-mono w-full"
                    value={formData.application_number}
                    onChange={(e) => setFormData({ ...formData, application_number: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Project <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={modalMode !== "CREATE"}
                    className="input text-sm w-full"
                    value={formData.project_id}
                    onChange={(e) => {
                      const pId = e.target.value;
                      const p = (Array.isArray(projects) ? projects : []).find((x) => String(x.id) === String(pId));
                      setSelectedProjectId(pId);
                      setFormData((prev) => ({
                        ...prev,
                        project_id: pId,
                        contract_ref: p?.contract_ref_no || prev.contract_ref,
                        client_name: p?.client_name || prev.client_name,
                        currency: p?.currency || prev.currency,
                        application_number: generateClaimNumber(p),
                      }));
                    }}
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_code} - {p.project_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contract Reference
                  </label>
                  <input
                    type="text"
                    readOnly={modalMode === "VIEW"}
                    className="input text-sm font-mono w-full"
                    value={formData.contract_ref}
                    onChange={(e) => setFormData({ ...formData, contract_ref: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contractor / Subcontractor
                  </label>
                  <input
                    type="text"
                    readOnly={modalMode === "VIEW"}
                    className="input text-sm w-full"
                    value={formData.contractor_name}
                    onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Client / Project Owner
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="input text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 w-full"
                    value={formData.client_name}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Currency
                  </label>
                  <select
                    disabled={modalMode === "VIEW"}
                    className="input text-sm w-full font-mono"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="GHS">GHS (Ghanaian Cedi)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                    <option value="GBP">GBP (British Pound)</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Application Date
                  </label>
                  <input
                    type="date"
                    readOnly={modalMode === "VIEW"}
                    className="input text-sm font-mono w-full"
                    value={formData.application_date}
                    onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Valuation Period From
                  </label>
                  <input
                    type="date"
                    readOnly={modalMode === "VIEW"}
                    className="input text-sm font-mono w-full"
                    value={formData.period_from}
                    onChange={(e) => setFormData({ ...formData, period_from: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Valuation Period To
                  </label>
                  <input
                    type="date"
                    readOnly={modalMode === "VIEW"}
                    className="input text-sm font-mono w-full"
                    value={formData.period_to}
                    onChange={(e) => setFormData({ ...formData, period_to: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    readOnly={modalMode === "VIEW"}
                    className="input text-sm font-mono w-full"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    readOnly={modalMode === "VIEW"}
                    placeholder="e.g. 30 Days from Certification"
                    className="input text-sm w-full"
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Link Approved Client Valuation (Optional)
                  </label>
                  <select
                    disabled={modalMode === "VIEW"}
                    className="input text-sm w-full font-mono"
                    value={formData.valuation_id || ""}
                    onChange={(e) => handleValuationSelect(e.target.value)}
                  >
                    <option value="">-- No Valuation Linked --</option>
                    {availableValuations.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.valuation_no || v.application_no} (GH₵{" "}
                        {Number(v.current_assessed_amount || v.net_amount_due || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Claim Description & Scope Remarks
                  </label>
                  <textarea
                    rows={2}
                    readOnly={modalMode === "VIEW"}
                    placeholder="Enter detailed description of works, milestones achieved, or progress highlights..."
                    className="input text-sm w-full py-2"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Work Completed Valuation */}
          {modalTab === "work" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Work Completed Valuation Items
                  </h4>
                  <p className="text-xs text-slate-500">
                    Cumulative quantities & values calculated automatically: Cumulative = Previous + Current.
                  </p>
                </div>
                {modalMode !== "VIEW" && (
                  <button
                    type="button"
                    onClick={addWorkItem}
                    className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add Work Item
                  </button>
                )}
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="table w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-left min-w-[200px]">Description</th>
                      <th className="py-2.5 px-2 text-left w-20">WBS Ref</th>
                      <th className="py-2.5 px-2 text-left w-16">UOM</th>
                      <th className="py-2.5 px-2 text-right w-20">Contract Qty</th>
                      <th className="py-2.5 px-2 text-right w-24">Rate (GH₵)</th>
                      <th className="py-2.5 px-2 text-right w-20">Prev Qty</th>
                      <th className="py-2.5 px-2 text-right w-20">Curr Qty</th>
                      <th className="py-2.5 px-2 text-right w-20">Cumul Qty</th>
                      <th className="py-2.5 px-2 text-right w-24">Curr Val (GH₵)</th>
                      <th className="py-2.5 px-2 text-right w-24">Cumul Val (GH₵)</th>
                      {modalMode !== "VIEW" && <th className="py-2.5 px-2 text-center w-10"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {formData.work_items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            readOnly={modalMode === "VIEW"}
                            className="input py-1 px-2 text-xs w-full"
                            value={item.description}
                            onChange={(e) => handleWorkItemChange(idx, "description", e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            readOnly={modalMode === "VIEW"}
                            className="input py-1 px-2 text-xs w-full font-mono"
                            value={item.wbs_ref || ""}
                            onChange={(e) => handleWorkItemChange(idx, "wbs_ref", e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            readOnly={modalMode === "VIEW"}
                            className="input py-1 px-2 text-xs w-full font-mono uppercase"
                            value={item.uom || "LOT"}
                            onChange={(e) => handleWorkItemChange(idx, "uom", e.target.value)}
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="any"
                            readOnly={modalMode === "VIEW"}
                            className="input py-1 px-2 text-xs w-full text-right font-mono"
                            value={item.contract_qty}
                            onChange={(e) => handleWorkItemChange(idx, "contract_qty", Number(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="any"
                            readOnly={modalMode === "VIEW"}
                            className="input py-1 px-2 text-xs w-full text-right font-mono font-medium text-emerald-600"
                            value={item.contract_rate}
                            onChange={(e) => handleWorkItemChange(idx, "contract_rate", Number(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="any"
                            readOnly={modalMode === "VIEW"}
                            className="input py-1 px-2 text-xs w-full text-right font-mono text-slate-500"
                            value={item.previous_qty}
                            onChange={(e) => handleWorkItemChange(idx, "previous_qty", Number(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            step="any"
                            readOnly={modalMode === "VIEW"}
                            className="input py-1 px-2 text-xs w-full text-right font-mono font-semibold text-brand-900 dark:text-brand-300"
                            value={item.current_qty}
                            onChange={(e) => handleWorkItemChange(idx, "current_qty", Number(e.target.value) || 0)}
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {Number(item.cumulative_qty || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-brand-800 dark:text-brand-300">
                          {Number(item.current_val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {Number(item.cumulative_val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        {modalMode !== "VIEW" && (
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeWorkItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="Remove Row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                      <td colSpan={8} className="py-2.5 px-3 text-right">
                        Subtotal Work Completed Value:
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        GH₵{" "}
                        {Number(formData.work_completed_value || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td colSpan={modalMode !== "VIEW" ? 2 : 1}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Materials on Site */}
          {modalTab === "materials" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Materials on Site Valuation
                  </h4>
                  <p className="text-xs text-slate-500">
                    Record delivered and stored materials on site included in this valuation period.
                  </p>
                </div>
                {modalMode !== "VIEW" && (
                  <button
                    type="button"
                    onClick={addMaterialItem}
                    className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
                  >
                    <Plus size={14} /> Add Material
                  </button>
                )}
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="table w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-left min-w-[200px]">Material Description</th>
                      <th className="py-2.5 px-2 text-left w-28">Delivery Ref / Note</th>
                      <th className="py-2.5 px-2 text-left w-28">Delivery Date</th>
                      <th className="py-2.5 px-2 text-right w-20">Quantity</th>
                      <th className="py-2.5 px-2 text-left w-16">Unit</th>
                      <th className="py-2.5 px-2 text-right w-24">Unit Cost (GH₵)</th>
                      <th className="py-2.5 px-2 text-right w-28">Total Value (GH₵)</th>
                      <th className="py-2.5 px-2 text-left min-w-[150px]">Supporting Notes</th>
                      {modalMode !== "VIEW" && <th className="py-2.5 px-2 text-center w-10"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {formData.materials_items.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-400 italic">
                          No materials on site claimed. Click "+ Add Material" if applicable.
                        </td>
                      </tr>
                    ) : (
                      formData.materials_items.map((mat, idx) => (
                        <tr key={mat.id || idx}>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              readOnly={modalMode === "VIEW"}
                              placeholder="e.g. Portland Cement Grade 42.5"
                              className="input py-1 px-2 text-xs w-full"
                              value={mat.description}
                              onChange={(e) => handleMaterialItemChange(idx, "description", e.target.value)}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              readOnly={modalMode === "VIEW"}
                              placeholder="DN-9941"
                              className="input py-1 px-2 text-xs w-full font-mono"
                              value={mat.delivery_ref || ""}
                              onChange={(e) => handleMaterialItemChange(idx, "delivery_ref", e.target.value)}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="date"
                              readOnly={modalMode === "VIEW"}
                              className="input py-1 px-2 text-xs w-full font-mono"
                              value={mat.delivery_date || ""}
                              onChange={(e) => handleMaterialItemChange(idx, "delivery_date", e.target.value)}
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              step="any"
                              readOnly={modalMode === "VIEW"}
                              className="input py-1 px-2 text-xs w-full text-right font-mono"
                              value={mat.qty}
                              onChange={(e) => handleMaterialItemChange(idx, "qty", Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              readOnly={modalMode === "VIEW"}
                              className="input py-1 px-2 text-xs w-full uppercase font-mono"
                              value={mat.uom || "BAGS"}
                              onChange={(e) => handleMaterialItemChange(idx, "uom", e.target.value)}
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              step="any"
                              readOnly={modalMode === "VIEW"}
                              className="input py-1 px-2 text-xs w-full text-right font-mono font-medium text-emerald-600"
                              value={mat.unit_cost}
                              onChange={(e) => handleMaterialItemChange(idx, "unit_cost", Number(e.target.value) || 0)}
                            />
                          </td>
                          <td className="py-2 px-2 text-right font-mono font-bold text-brand-900 dark:text-brand-300">
                            {Number(mat.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-2">
                            <input
                              type="text"
                              readOnly={modalMode === "VIEW"}
                              placeholder="Storage location / test note"
                              className="input py-1 px-2 text-xs w-full"
                              value={mat.notes || ""}
                              onChange={(e) => handleMaterialItemChange(idx, "notes", e.target.value)}
                            />
                          </td>
                          {modalMode !== "VIEW" && (
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeMaterialItem(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                                title="Remove Material"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                      <td colSpan={6} className="py-2.5 px-3 text-right">
                        Subtotal Materials on Site Value:
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        GH₵{" "}
                        {Number(formData.materials_on_site_value || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td colSpan={modalMode !== "VIEW" ? 2 : 1}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Retention Calculation */}
          {modalTab === "retention" && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Contract Retention Setup & Calculation
                </h4>
                <p className="text-xs text-slate-500">
                  Configure retention percentage and retention limit/cap according to the contract clauses.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Retention Percentage (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        readOnly={modalMode === "VIEW"}
                        className="input text-sm font-mono w-full pr-8"
                        value={formData.retention_percent}
                        onChange={(e) => handleRetentionPercentChange(e.target.value)}
                      />
                      <Percent size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Retention Cap / Maximum Limit (GH₵)
                    </label>
                    <input
                      type="number"
                      step="any"
                      readOnly={modalMode === "VIEW"}
                      placeholder="0 for no cap"
                      className="input text-sm font-mono w-full"
                      value={formData.retention_cap}
                      onChange={(e) => {
                        const cap = Number(e.target.value) || 0;
                        setFormData((prev) => ({
                          ...prev,
                          retention_cap: cap,
                          retention_amount: cap > 0 && calculatedRetention > cap ? cap : calculatedRetention,
                        }));
                      }}
                    />
                    <span className="text-[11px] text-slate-400 mt-0.5 block">0 = Uncapped retention</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Retention Amount for Current Claim (GH₵)
                    </label>
                    <input
                      type="number"
                      step="any"
                      readOnly={modalMode === "VIEW"}
                      className="input text-sm font-mono font-semibold text-amber-600 w-full"
                      value={formData.retention_amount}
                      onChange={(e) => setFormData({ ...formData, retention_amount: Number(e.target.value) || 0 })}
                    />
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Auto-calculated: {formData.retention_percent}% of GH₵ {calculatedGross.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                  <strong>Retention Policy:</strong> Retention is automatically deducted from gross assessed valuation and held in the project retention escrow until Defects Liability Period (DLP) expiration or final account release.
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Deductions & Variations */}
          {modalTab === "deductions" && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Additions, Deductions & Contract Recoveries
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Approved Variations Value (GH₵)
                    </label>
                    <input
                      type="number"
                      step="any"
                      readOnly={modalMode === "VIEW"}
                      className="input text-sm font-mono text-emerald-600 w-full"
                      value={formData.approved_variations_value}
                      onChange={(e) => setFormData({ ...formData, approved_variations_value: Number(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Other Approved Additions (GH₵)
                    </label>
                    <input
                      type="number"
                      step="any"
                      readOnly={modalMode === "VIEW"}
                      className="input text-sm font-mono text-emerald-600 w-full"
                      value={formData.other_additions_value}
                      onChange={(e) => setFormData({ ...formData, other_additions_value: Number(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Previous Certified Amount (GH₵)
                    </label>
                    <input
                      type="number"
                      step="any"
                      readOnly={modalMode === "VIEW"}
                      className="input text-sm font-mono text-blue-600 w-full"
                      value={formData.previous_certified_amount}
                      onChange={(e) => setFormData({ ...formData, previous_certified_amount: Number(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Advance Payment Recovery (GH₵)
                    </label>
                    <input
                      type="number"
                      step="any"
                      readOnly={modalMode === "VIEW"}
                      className="input text-sm font-mono text-rose-600 w-full"
                      value={formData.advance_recovery_amount}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setFormData((prev) => {
                          const customSum = prev.deductions_items.reduce((s, d) => s + Number(d.amount || 0), 0);
                          return {
                            ...prev,
                            advance_recovery_amount: val,
                            other_deductions_amount: customSum + val + Number(prev.penalties_amount || 0),
                          };
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Penalties / Liquidated Damages (GH₵)
                    </label>
                    <input
                      type="number"
                      step="any"
                      readOnly={modalMode === "VIEW"}
                      className="input text-sm font-mono text-rose-600 w-full"
                      value={formData.penalties_amount || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setFormData((prev) => {
                          const customSum = prev.deductions_items.reduce((s, d) => s + Number(d.amount || 0), 0);
                          return {
                            ...prev,
                            penalties_amount: val,
                            other_deductions_amount: customSum + Number(prev.advance_recovery_amount || 0) + val,
                          };
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Adjustments / Correction (+/- GH₵)
                    </label>
                    <input
                      type="number"
                      step="any"
                      readOnly={modalMode === "VIEW"}
                      className="input text-sm font-mono w-full"
                      value={formData.adjustments_amount}
                      onChange={(e) => setFormData({ ...formData, adjustments_amount: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {/* Custom Deductions Sub-table */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Custom Contract Deductions (Site Utilities, Safety Fines, etc.)
                    </h5>
                    {modalMode !== "VIEW" && (
                      <button
                        type="button"
                        onClick={addDeductionItem}
                        className="btn btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                      >
                        <Plus size={12} /> Add Custom Deduction
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {formData.deductions_items.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No custom deductions added.</p>
                    ) : (
                      formData.deductions_items.map((ded, idx) => (
                        <div key={ded.id || idx} className="flex items-center gap-3">
                          <input
                            type="text"
                            readOnly={modalMode === "VIEW"}
                            placeholder="Deduction Description (e.g. Site Power & Water)"
                            className="input py-1 px-2.5 text-xs flex-1"
                            value={ded.description}
                            onChange={(e) => handleDeductionItemChange(idx, "description", e.target.value)}
                          />
                          <input
                            type="text"
                            readOnly={modalMode === "VIEW"}
                            placeholder="Ref #"
                            className="input py-1 px-2.5 text-xs w-28 font-mono"
                            value={ded.ref || ""}
                            onChange={(e) => handleDeductionItemChange(idx, "ref", e.target.value)}
                          />
                          <input
                            type="number"
                            step="any"
                            readOnly={modalMode === "VIEW"}
                            placeholder="Amount (GH₵)"
                            className="input py-1 px-2.5 text-xs w-32 font-mono text-right text-rose-600"
                            value={ded.amount}
                            onChange={(e) => handleDeductionItemChange(idx, "amount", Number(e.target.value) || 0)}
                          />
                          {modalMode !== "VIEW" && (
                            <button
                              type="button"
                              onClick={() => removeDeductionItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: Payment Summary & Calculation Breakdown */}
          {modalTab === "summary" && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-4">
                  Financial Statement Waterfall
                </h4>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">1. Work Completed Valuation</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">
                      GH₵ {Number(formData.work_completed_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">2. Materials on Site</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">
                      GH₵ {Number(formData.materials_on_site_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">3. Approved Variations</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">
                      GH₵ {Number(formData.approved_variations_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">4. Other Additions</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">
                      GH₵ {Number(formData.other_additions_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 border-b-2 border-slate-300 dark:border-slate-600 font-bold bg-slate-100/60 dark:bg-slate-800/60 px-2 rounded">
                    <span>= Gross Amount Assessed</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      GH₵ {calculatedGross.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 text-rose-600">
                    <span>Less: Retention Deducted ({formData.retention_percent}%)</span>
                    <span className="font-mono">
                      - GH₵ {Number(formData.retention_amount || calculatedRetention).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 text-rose-600">
                    <span>Less: Advance Payment Recovery</span>
                    <span className="font-mono">
                      - GH₵ {Number(formData.advance_recovery_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 text-rose-600">
                    <span>Less: Other Deductions & Penalties</span>
                    <span className="font-mono">
                      - GH₵ {Number(formData.other_deductions_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 text-blue-600">
                    <span>Less: Previously Certified Amount</span>
                    <span className="font-mono">
                      - GH₵ {Number(formData.previous_certified_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {Number(formData.adjustments_amount || 0) !== 0 && (
                    <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      <span>Adjustments (+/-)</span>
                      <span className="font-mono">
                        GH₵ {Number(formData.adjustments_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between py-3 border-t-2 border-brand-500 font-bold text-base bg-brand-50 dark:bg-brand-950/40 px-3 rounded-lg text-brand-900 dark:text-brand-300">
                    <span>Net Amount Claimed</span>
                    <span className="font-mono">
                      GH₵ {calculatedNetRequested.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {modalMode !== "CREATE" && (
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 text-center">
                      <div className="p-3 bg-white dark:bg-slate-900 border rounded-lg">
                        <div className="text-xs text-slate-500">Certified Amount</div>
                        <div className="text-lg font-bold font-mono text-emerald-600">
                          GH₵ {Number(formData.certified_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 border rounded-lg">
                        <div className="text-xs text-slate-500">Amount Settled (Paid)</div>
                        <div className="text-lg font-bold font-mono text-purple-600">
                          GH₵ {Number(formData.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="p-3 bg-white dark:bg-slate-900 border rounded-lg">
                        <div className="text-xs text-slate-500">Outstanding Balance</div>
                        <div className="text-lg font-bold font-mono text-rose-600">
                          GH₵ {Number(formData.outstanding_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Certification & Sign-off History */}
          {modalTab === "history" && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Engineering Certification & Audit Records
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Certificate Document Ref / IPC #
                    </label>
                    <input
                      type="text"
                      readOnly={modalMode === "VIEW"}
                      placeholder="e.g. IPC-001"
                      className="input text-sm font-mono w-full"
                      value={formData.certification_doc_no || ""}
                      onChange={(e) => setFormData({ ...formData, certification_doc_no: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Payment Voucher Ref
                    </label>
                    <input
                      type="text"
                      readOnly={modalMode === "VIEW"}
                      placeholder="e.g. PV-2026-99"
                      className="input text-sm font-mono w-full"
                      value={formData.payment_voucher_ref || ""}
                      onChange={(e) => setFormData({ ...formData, payment_voucher_ref: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Quantity Surveyor / Assessor Remarks
                    </label>
                    <textarea
                      rows={2}
                      readOnly={modalMode === "VIEW"}
                      className="input text-sm w-full py-2"
                      value={formData.qs_comments || ""}
                      onChange={(e) => setFormData({ ...formData, qs_comments: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Project Manager Sign-off Notes
                    </label>
                    <textarea
                      rows={2}
                      readOnly={modalMode === "VIEW"}
                      className="input text-sm w-full py-2"
                      value={formData.pm_comments || ""}
                      onChange={(e) => setFormData({ ...formData, pm_comments: e.target.value })}
                    />
                  </div>
                </div>

                {formData.approval_history && formData.approval_history.length > 0 && (
                  <div className="pt-2">
                    <h5 className="font-semibold text-xs uppercase tracking-wider text-slate-600 mb-2">
                      Event History Log
                    </h5>
                    <div className="space-y-2">
                      {formData.approval_history.map((h, i) => (
                        <div key={i} className="text-xs p-2.5 bg-white dark:bg-slate-900 border rounded flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{h.action || "Status change"}</span>
                            <span className="text-slate-400 ml-2">{h.remarks || ""}</span>
                          </div>
                          <span className="text-slate-400 font-mono text-[11px]">{h.date ? String(h.date).split("T")[0] : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAppModal(false)}
              className="btn btn-secondary text-sm"
            >
              Close
            </button>

            <div className="flex items-center gap-2">
              {modalMode !== "VIEW" ? (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSaveApplication("DRAFT")}
                    className="btn btn-secondary text-sm"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSaveApplication("SUBMITTED")}
                    className="btn btn-primary text-sm inline-flex items-center gap-1.5"
                  >
                    <Send size={15} /> Save & Submit Claim
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPrintApp(formData)}
                    className="btn btn-secondary text-sm inline-flex items-center gap-1.5"
                  >
                    <Printer size={15} /> Print Certificate
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode("EDIT")}
                    className="btn btn-primary text-sm inline-flex items-center gap-1.5"
                  >
                    <Edit size={15} /> Edit Claim
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </ProjectModal>

      {/* 6. Certify Payment Claim Modal */}
      <ProjectModal
        open={showCertifyModal}
        onClose={() => setShowCertifyModal(false)}
        title="Certify Progress Payment Claim"
        subtitle="Confirm assessed amount, rejected deductions, and issue engineering certificate (IPC)"
        icon={ShieldCheck}
        maxWidth="max-w-xl"
        onSubmit={handleCertifySubmit}
        submitLabel="Confirm & Issue Certificate"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Net Claimed (GH₵)
              </label>
              <input
                type="text"
                readOnly
                className="input text-sm font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 w-full"
                value={Number(certifyForm.assessed_amount || 0).toFixed(2)}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Certified Amount (GH₵) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                className="input text-sm font-semibold text-emerald-600 w-full"
                value={certifyForm.certified_amount}
                onChange={(e) => {
                  const cert = Number(e.target.value) || 0;
                  setCertifyForm({
                    ...certifyForm,
                    certified_amount: cert,
                    rejected_amount: Math.max(0, Number(certifyForm.assessed_amount || 0) - cert),
                  });
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Certificate Document No / IPC Ref <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              className="input text-sm font-mono w-full"
              value={certifyForm.certification_doc_no}
              onChange={(e) => setCertifyForm({ ...certifyForm, certification_doc_no: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Disputed / Rejected Adjustment Reason
            </label>
            <input
              type="text"
              placeholder="e.g. Under-measured concrete volume on beam B4"
              className="input text-sm w-full"
              value={certifyForm.adjustment_reason}
              onChange={(e) => setCertifyForm({ ...certifyForm, adjustment_reason: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Quantity Surveyor / Engineer Notes
            </label>
            <textarea
              rows={2}
              placeholder="Comments on verified quantities, material test results, and site inspection..."
              className="input text-sm w-full py-2"
              value={certifyForm.qs_comments}
              onChange={(e) => setCertifyForm({ ...certifyForm, qs_comments: e.target.value })}
            />
          </div>
        </div>
      </ProjectModal>

      {/* 7. Record Payment Settlement Modal (Finance Integration) */}
      <ProjectModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Client Payment Settlement"
        subtitle="Log receipt from client or finance disbursal and update outstanding project balance"
        icon={CreditCard}
        maxWidth="max-w-xl"
        onSubmit={handlePaymentSubmit}
        submitLabel="Record Payment in Finance"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Payment Amount (GH₵) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                className="input text-sm font-semibold text-emerald-600 w-full"
                value={paymentForm.payment_amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_amount: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Payment Date</label>
              <input
                type="date"
                required
                className="input text-sm font-mono w-full"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Receipt / Voucher Ref <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                className="input text-sm font-mono w-full"
                value={paymentForm.payment_voucher_ref}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_voucher_ref: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Payment Method</label>
              <select
                className="input text-sm w-full"
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
              >
                <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="DIRECT_DEPOSIT">Direct Deposit</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Finance Notes / Bank Reference
            </label>
            <input
              type="text"
              placeholder="e.g. Stanbic Bank wire transfer transaction ID #99201"
              className="input text-sm w-full"
              value={paymentForm.finance_notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, finance_notes: e.target.value })}
            />
          </div>
        </div>
      </ProjectModal>

      {/* 8. Supporting Document Attachments Modal */}
      {attachmentsModalOpen && selectedAttachmentAppId && (
        <DocumentAttachmentsModal
          open={attachmentsModalOpen}
          onClose={() => {
            setAttachmentsModalOpen(false);
            setSelectedAttachmentAppId(null);
          }}
          entityType="PAYMENT_APPLICATION"
          entityId={selectedAttachmentAppId}
          title="Progress Payment Claim Supporting Attachments"
          subtitle="Attach progress valuation sheets, delivery notes, inspection approvals, and test results"
        />
      )}

      {/* 9. Printable Certificate View */}
      {printApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-xl max-w-3xl w-full p-8 space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  PROGRESS PAYMENT CLAIM CERTIFICATE
                </h2>
                <p className="text-sm text-slate-500 font-mono mt-0.5">
                  Claim Reference: {printApp.application_number}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded text-xs font-bold bg-slate-100 text-slate-800 border">
                  {printApp.status || "DRAFT"}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Date: {printApp.application_date ? String(printApp.application_date).split("T")[0] : "-"}
                </p>
              </div>
            </div>

            {/* Project & Parties */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border">
              <div>
                <span className="font-bold text-slate-500 uppercase block">Project</span>
                <p className="font-bold text-slate-800 mt-0.5">{printApp.project_name || activeProject?.project_name}</p>
                <p className="font-mono text-slate-500">Code: {printApp.project_code || activeProject?.project_code}</p>
                <p className="font-mono text-slate-500">Contract: {printApp.contract_ref || "-"}</p>
              </div>
              <div>
                <span className="font-bold text-slate-500 uppercase block">Contractor & Client</span>
                <p className="font-bold text-slate-800 mt-0.5">Contractor: {printApp.contractor_name || "Contractor"}</p>
                <p className="text-slate-600">Client: {printApp.client_name || "Client"}</p>
                <p className="text-slate-500">
                  Period: {printApp.period_from ? String(printApp.period_from).split("T")[0] : ""} to{" "}
                  {printApp.period_to ? String(printApp.period_to).split("T")[0] : ""}
                </p>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span>Gross Value of Work Completed & Materials on Site:</span>
                <span className="font-mono font-bold">
                  GH₵ {Number(printApp.gross_amount_assessed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b text-rose-600">
                <span>Less: Contract Retention:</span>
                <span className="font-mono">
                  - GH₵ {Number(printApp.retention_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b text-rose-600">
                <span>Less: Advance Payment Recovery & Other Deductions:</span>
                <span className="font-mono">
                  - GH₵ {(Number(printApp.advance_recovery_amount || 0) + Number(printApp.other_deductions_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b text-blue-600">
                <span>Less: Previously Certified Amount:</span>
                <span className="font-mono">
                  - GH₵ {Number(printApp.previous_certified_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-slate-900 font-bold text-sm bg-slate-100 px-2 rounded">
                <span>NET AMOUNT CLAIMED:</span>
                <span className="font-mono">
                  GH₵ {Number(printApp.net_amount_requested || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold text-sm text-emerald-700 bg-emerald-50 px-2 rounded border border-emerald-200">
                <span>AMOUNT CERTIFIED FOR PAYMENT:</span>
                <span className="font-mono">
                  GH₵ {Number(printApp.certified_amount || printApp.net_amount_requested || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-3 gap-6 pt-6 border-t text-center text-xs">
              <div className="space-y-8">
                <div className="border-b border-dashed pb-1 font-mono text-slate-400">Signature</div>
                <div>
                  <p className="font-bold text-slate-800">Contractor Representative</p>
                  <p className="text-slate-400">Prepared & Submitted</p>
                </div>
              </div>
              <div className="space-y-8">
                <div className="border-b border-dashed pb-1 font-mono text-slate-400">Signature</div>
                <div>
                  <p className="font-bold text-slate-800">Supervising QS / Engineer</p>
                  <p className="text-slate-400">Inspected & Verified</p>
                </div>
              </div>
              <div className="space-y-8">
                <div className="border-b border-dashed pb-1 font-mono text-slate-400">Signature</div>
                <div>
                  <p className="font-bold text-slate-800">Project Manager / Client</p>
                  <p className="text-slate-400">Approved for Payment</p>
                </div>
              </div>
            </div>

            {/* Print Dialog Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setPrintApp(null)}
                className="btn btn-secondary text-xs"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="btn btn-primary text-xs inline-flex items-center gap-1.5"
              >
                <Printer size={14} /> Print Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
