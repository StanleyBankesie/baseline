import MobileMovingCarousel from "@/components/MobileMovingCarousel";
/**
 * @file PaymentClaimsPage.jsx
 * @description General-Purpose Project Payment Claims & Client Progress Assessment Page
 * for OmniSuite ERP. Industry-independent solution supporting IT, Consulting,
 * Construction, Manufacturing, Facilities, Services and General Projects.
 * 
 * IMPORTANT: No approval workflows, routing, or approval stages are implemented.
 * Submitting a claim records it as submitted to the client.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Calculator,
  ArrowLeft,
  Plus,
  Search,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
  Briefcase,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  Printer,
  Download,
  Trash2,
  Edit,
  Eye,
  X,
  ChevronRight,
  Filter,
  Calendar,
  Building2,
  User,
  Paperclip,
  Layers,
  Send,
  ShieldCheck,
  Scale,
  Receipt,
  ExternalLink,
  FileCheck2,
  TrendingUp,
  History,
  Check,
  ChevronDown,
} from "lucide-react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import { api } from "../../../../api/client.js";
import DocumentAttachmentsModal from "../../../../components/attachments/DocumentAttachmentsModal.jsx";
import { useUoms } from "@/hooks/useUoms";

// Status configuration
const CLAIM_STATUSES = [
  { value: "ALL", label: "All Statuses", badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { value: "DRAFT", label: "Draft", badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300" },
  { value: "SUBMITTED", label: "Submitted to Client", badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300" },
  { value: "UNDER_CLIENT_REVIEW", label: "Under Client Review", badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300" },
  { value: "ACCEPTED", label: "Accepted by Client", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { value: "PARTIALLY_ACCEPTED", label: "Partially Accepted", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" },
  { value: "DISPUTED", label: "Disputed", badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300" },
  { value: "REJECTED", label: "Rejected by Client", badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300" },
  { value: "INVOICED", label: "Invoiced", badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300" },
  { value: "PARTIALLY_PAID", label: "Partially Paid", badge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300" },
  { value: "FULLY_PAID", label: "Fully Paid", badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200" },
  { value: "OVERDUE", label: "Payment Overdue", badge: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300" },
  { value: "CANCELLED", label: "Cancelled", badge: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
];

const CLAIM_TYPES = [
  { value: "PROGRESS_CLAIM", label: "Progress Claim" },
  { value: "MILESTONE_CLAIM", label: "Milestone-Based Claim" },
  { value: "DELIVERABLE_CLAIM", label: "Deliverable-Based Claim" },
  { value: "SERVICE_CLAIM", label: "Service Payment Claim" },
  { value: "CONTRACTUAL_CLAIM", label: "Contractual Payment Claim" },
  { value: "FINAL_CLAIM", label: "Final Payment Claim" },
  { value: "ADDITIONAL_WORK_CLAIM", label: "Additional Work Claim" },
  { value: "OTHER", label: "Other Project Claim" },
];

const BILLING_METHODS = [
  { value: "QTY_RATE", label: "Quantity × Unit Rate" },
  { value: "FIXED_AMOUNT", label: "Fixed Lump Sum" },
  { value: "PERCENT_OF_CONTRACT", label: "% of Contract Value" },
  { value: "MILESTONE_BASED", label: "Milestone Completion" },
  { value: "TIME_BASED", label: "Time & Rate (Hourly/Daily)" },
  { value: "OTHER", label: "Other Billing Method" },
];

export default function PaymentClaimsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { uoms } = useUoms();

  // Mode: "LIST" or "WORKSPACE" (Edit/Create/View single claim)
  const [viewMode, setViewMode] = useState("LIST");
  const [activeTab, setActiveTab] = useState("overview"); // overview, details, items, financial, assessment, invoicing, documents, history

  // Filter & List state
  const [claims, setClaims] = useState([]);
  const [kpis, setKpis] = useState({
    total_claims: 0,
    total_amount_claimed: 0,
    total_amount_accepted: 0,
    total_amount_invoiced: 0,
    total_amount_paid: 0,
    outstanding_receivables: 0,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filter controls
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("projectId") || "");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Workspace / Active Claim state
  const [activeClaimId, setActiveClaimId] = useState(null);
  const [claimForm, setClaimForm] = useState({
    project_id: "",
    claim_reference: "",
    claim_title: "",
    claim_type: "PROGRESS_CLAIM",
    claim_description: "",
    claim_period_from: "",
    claim_period_to: "",
    claim_date: new Date().toISOString().slice(0, 10),
    payment_due_date: "",
    currency: "GH₵",
    exchange_rate: 1.0,
    original_contract_value: 0,
    approved_variations_value: 0,
    revised_contract_value: 0,
    previous_claims_amount: 0,
    gross_claim_amount: 0,
    retention_percent: 5,
    retention_deduction: 0,
    other_deductions: 0,
    tax_code: "",
    tax_rate: 0,
    tax_amount: 0,
    net_claim_amount: 0,
    cumulative_claimed_amount: 0,
    remaining_unclaimed_balance: 0,
    status: "DRAFT",
    supporting_remarks: "",
    attachments: [],
    items: [],
  });

  const [activeClaimHistory, setActiveClaimHistory] = useState([]);
  const [activeClaimLinkedInvoice, setActiveClaimLinkedInvoice] = useState(null);

  // Metadata for active project (tasks, milestones, tax codes, contract info)
  const [projectMetrics, setProjectMetrics] = useState(null);

  // Modals state
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    client_assessment_ref: "",
    client_assessment_date: new Date().toISOString().slice(0, 10),
    client_assessed_amount: "",
    client_accepted_amount: "",
    client_disputed_amount: "",
    client_rejected_amount: "",
    client_representative: "",
    client_assessment_remarks: "",
  });

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceModalForm, setInvoiceModalForm] = useState({
    mode: "GENERATE", // "GENERATE" or "LINK"
    existing_invoice_id: "",
    invoice_notes: "",
  });

  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // Fetch initial project list
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await api.get("/projects/projects", { params: { active: "all" } });
        setProjects(res.data?.items || []);
      } catch (e) {
        toast.error("Failed to load projects list");
      }
    }
    loadProjects();
  }, []);

  // Fetch Claims list
  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/projects/payment-claims", {
        params: {
          projectId: selectedProjectId || undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          claimType: typeFilter !== "ALL" ? typeFilter : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          search: searchQuery || undefined,
        },
      });
      setClaims(res.data?.claims || []);
      if (res.data?.kpis) {
        setKpis(res.data.kpis);
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to load payment claims");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId, statusFilter, typeFilter, dateFrom, dateTo, searchQuery]);

  useEffect(() => {
    if (viewMode === "LIST") {
      fetchClaims();
    }
  }, [fetchClaims, viewMode]);

  // Load project metrics when project selected in claimForm
  const loadProjectMetrics = useCallback(async (pId) => {
    if (!pId) {
      setProjectMetrics(null);
      return;
    }
    try {
      const res = await api.get(`/projects/payment-claims/metrics/${pId}`);
      setProjectMetrics(res.data);
      const prj = res.data?.project;
      const fin = res.data?.contract_financials;

      setClaimForm((prev) => ({
        ...prev,
        project_id: pId,
        currency: prj?.currency || prev.currency,
        retention_percent: Number(prj?.retention_percent != null ? prj.retention_percent : prev.retention_percent),
        original_contract_value: Number(fin?.original_contract_value || 0),
        approved_variations_value: Number(fin?.approved_variations_value || 0),
        revised_contract_value: Number(fin?.revised_contract_value || 0),
        previous_claims_amount: Number(fin?.previous_gross_claims || 0),
        remaining_unclaimed_balance: Number(fin?.remaining_unclaimed_balance || 0),
      }));
    } catch (e) {
      toast.error("Failed to load project contract details");
    }
  }, []);

  // Open Workspace for Creating New Claim
  const handleOpenNewClaim = async () => {
    // Strictly do NOT select any project by default as per requirement
    const targetPrjId = "";
    setActiveClaimId(null);
    setActiveClaimHistory([]);
    setActiveClaimLinkedInvoice(null);
    setActiveTab("details");
    setProjectMetrics(null);

    let nextRef = "";
    if (targetPrjId) {
      try {
        const refRes = await api.get(`/projects/payment-claims/next-reference?projectId=${targetPrjId}`);
        nextRef = refRes.data?.claim_reference || "";
      } catch (e) {
        nextRef = "CLM-001";
      }
    }

    setClaimForm({
      project_id: targetPrjId,
      claim_reference: nextRef,
      claim_title: "",
      claim_type: "PROGRESS_CLAIM",
      claim_description: "",
      claim_period_from: "",
      claim_period_to: "",
      claim_date: new Date().toISOString().slice(0, 10),
      payment_due_date: "",
      currency: "GH₵",
      exchange_rate: 1.0,
      original_contract_value: 0,
      approved_variations_value: 0,
      revised_contract_value: 0,
      previous_claims_amount: 0,
      gross_claim_amount: 0,
      retention_percent: 5,
      retention_deduction: 0,
      other_deductions: 0,
      tax_code: "",
      tax_rate: 0,
      tax_amount: 0,
      net_claim_amount: 0,
      cumulative_claimed_amount: 0,
      remaining_unclaimed_balance: 0,
      status: "DRAFT",
      supporting_remarks: "",
      attachments: [],
      items: [
        {
          id: 1,
          item_reference: "ITM-001",
          item_description: "",
          billing_method: "QTY_RATE",
          wbs_code: "",
          task_id: null,
          milestone_name: "",
          deliverable_service: "",
          quantity: 1,
          unit_of_measure: "EA",
          unit_rate: 0,
          previous_claimed_qty: 0,
          previous_claimed_amount: 0,
          current_claim_qty: 1,
          current_claim_amount: 0,
          cumulative_claimed_amount: 0,
          remarks: "",
        },
      ],
    });

    if (targetPrjId) {
      await loadProjectMetrics(targetPrjId);
    }
    setViewMode("WORKSPACE");
  };

  // Open Workspace for Editing / Viewing an Existing Claim
  const handleOpenEditClaim = async (claimId) => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/payment-claims/${claimId}`);
      const cl = res.data?.claim;
      const itms = res.data?.items || [];
      const hist = res.data?.history || [];
      const linkedInv = res.data?.linked_invoice || null;

      setActiveClaimId(cl.id);
      setActiveClaimHistory(hist);
      setActiveClaimLinkedInvoice(linkedInv);

      setClaimForm({
        ...cl,
        items: itms.length > 0 ? itms : [],
      });

      await loadProjectMetrics(cl.project_id);
      setActiveTab("overview");
      setViewMode("WORKSPACE");
    } catch (e) {
      toast.error("Failed to load claim details");
    } finally {
      setLoading(false);
    }
  };

  // Real-time calculation helper
  const calculateFinancialSummary = useCallback((formState) => {
    let gross = 0;
    const items = [...(formState.items || [])];

    items.forEach((it) => {
      let amt = 0;
      const m = it.billing_method || "QTY_RATE";
      const qty = Number(it.current_claim_qty || 0);
      const rate = Number(it.unit_rate || 0);

      if (m === "QTY_RATE") {
        amt = qty * rate;
      } else if (m === "PERCENT_OF_CONTRACT") {
        const pct = Number(it.quantity || qty || 0);
        const base = Number(formState.revised_contract_value || formState.original_contract_value || 0);
        amt = (pct / 100) * base;
      } else {
        amt = Number(it.current_claim_amount || 0);
        if (!amt && qty && rate) amt = qty * rate;
      }
      it.current_claim_amount = Math.round(amt * 100) / 100;
      it.cumulative_claimed_amount = Math.round((Number(it.previous_claimed_amount || 0) + it.current_claim_amount) * 100) / 100;
      gross += it.current_claim_amount;
    });

    const retentionPct = Number(formState.retention_percent || 0);
    const retentionAmt = Math.round(gross * (retentionPct / 100) * 100) / 100;
    const otherDed = Number(formState.other_deductions || 0);
    const taxable = Math.max(0, gross - retentionAmt - otherDed);
    const taxRate = Number(formState.tax_rate || 0);
    const taxAmt = Math.round(taxable * (taxRate / 100) * 100) / 100;
    const net = Math.round((gross - retentionAmt - otherDed + taxAmt) * 100) / 100;
    const prevGross = Number(formState.previous_claims_amount || 0);
    const cumClaims = Math.round((prevGross + gross) * 100) / 100;
    const revisedVal = Number(formState.revised_contract_value || formState.original_contract_value || 0);
    const remainingUnclaimed = Math.max(0, Math.round((revisedVal - cumClaims) * 100) / 100);

    return {
      gross_claim_amount: gross,
      retention_deduction: retentionAmt,
      tax_amount: taxAmt,
      net_claim_amount: net,
      cumulative_claimed_amount: cumClaims,
      remaining_unclaimed_balance: remainingUnclaimed,
      items,
    };
  }, []);

  // Update claim items or header and re-calc
  const updateClaimField = (field, value) => {
    setClaimForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "retention_percent" || field === "tax_rate" || field === "other_deductions") {
        const c = calculateFinancialSummary(next);
        return { ...next, ...c };
      }
      return next;
    });
  };

  const updateClaimItem = (index, field, value) => {
    setClaimForm((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      const nextState = { ...prev, items: updatedItems };
      const c = calculateFinancialSummary(nextState);
      return { ...nextState, ...c };
    });
  };

  const addClaimItem = () => {
    setClaimForm((prev) => {
      const count = prev.items.length + 1;
      const newItem = {
        id: count,
        item_reference: `ITM-${String(count).padStart(3, "0")}`,
        item_description: "",
        billing_method: "QTY_RATE",
        wbs_code: "",
        task_id: null,
        milestone_name: "",
        deliverable_service: "",
        quantity: 1,
        unit_of_measure: "EA",
        unit_rate: 0,
        previous_claimed_qty: 0,
        previous_claimed_amount: 0,
        current_claim_qty: 1,
        current_claim_amount: 0,
        cumulative_claimed_amount: 0,
        remarks: "",
      };
      const nextState = { ...prev, items: [...prev.items, newItem] };
      const c = calculateFinancialSummary(nextState);
      return { ...nextState, ...c };
    });
  };

  const removeClaimItem = (index) => {
    if (claimForm.items.length <= 1) {
      toast.warning("Payment claim must have at least one line item.");
      return;
    }
    setClaimForm((prev) => {
      const updatedItems = prev.items.filter((_, i) => i !== index);
      const nextState = { ...prev, items: updatedItems };
      const c = calculateFinancialSummary(nextState);
      return { ...nextState, ...c };
    });
  };

  // Save Claim (Draft or Direct Update)
  const handleSaveClaim = async (targetStatus = null) => {
    if (!claimForm.project_id) {
      toast.error("Please select a project.");
      return;
    }
    if (!claimForm.claim_title?.trim()) {
      toast.error("Please provide a Claim Title.");
      return;
    }
    if (!claimForm.claim_date) {
      toast.error("Please provide a Claim Date.");
      return;
    }

    setSaving(true);
    const payload = {
      ...claimForm,
      status: targetStatus || claimForm.status,
    };

    try {
      if (activeClaimId) {
        await api.put(`/projects/payment-claims/${activeClaimId}`, payload);
        toast.success(`Claim successfully updated${targetStatus ? ` to ${targetStatus}` : ""}`);
      } else {
        const res = await api.post("/projects/payment-claims", payload);
        toast.success("Payment claim successfully created!");
        setActiveClaimId(res.data?.id);
      }
      fetchClaims();
      if (targetStatus) {
        setClaimForm((prev) => ({ ...prev, status: targetStatus }));
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to save claim");
    } finally {
      setSaving(false);
    }
  };

  // Submit Claim to Client (Operational Action - No Internal Approval Workflow)
  const handleSubmitToClient = async () => {
    if (!activeClaimId) {
      await handleSaveClaim("SUBMITTED");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/projects/payment-claims/${activeClaimId}/status`, {
        new_status: "SUBMITTED",
        submission_date: new Date().toISOString().slice(0, 10),
        remarks: "Claim formally delivered and submitted to client representative for payment assessment.",
      });
      toast.success("Payment claim recorded as SUBMITTED to client!");
      setClaimForm((prev) => ({ ...prev, status: "SUBMITTED", submission_date: new Date().toISOString().slice(0, 10) }));
      fetchClaims();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to submit claim");
    } finally {
      setSaving(false);
    }
  };

  // Open Client Assessment Modal
  const openAssessmentModal = () => {
    setAssessmentForm({
      client_assessment_ref: claimForm.client_assessment_ref || `ASSESS-${claimForm.claim_reference || ""}`,
      client_assessment_date: claimForm.client_assessment_date || new Date().toISOString().slice(0, 10),
      client_assessed_amount: claimForm.client_assessed_amount || claimForm.net_claim_amount,
      client_accepted_amount: claimForm.client_accepted_amount || claimForm.net_claim_amount,
      client_disputed_amount: claimForm.client_disputed_amount || 0,
      client_rejected_amount: claimForm.client_rejected_amount || 0,
      client_representative: claimForm.client_representative || "",
      client_assessment_remarks: claimForm.client_assessment_remarks || "",
    });
    setAssessmentModalOpen(true);
  };

  // Save Client Assessment
  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    if (!activeClaimId) {
      toast.error("Please save the claim before recording a client assessment.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post(`/projects/payment-claims/${activeClaimId}/assessment`, {
        ...assessmentForm,
        client_assessed_amount: Number(assessmentForm.client_assessed_amount || 0),
        client_accepted_amount: Number(assessmentForm.client_accepted_amount || 0),
        client_disputed_amount: Number(assessmentForm.client_disputed_amount || 0),
        client_rejected_amount: Number(assessmentForm.client_rejected_amount || 0),
      });

      toast.success("Client Assessment recorded successfully!");
      setAssessmentModalOpen(false);
      setClaimForm((prev) => ({
        ...prev,
        ...assessmentForm,
        status: res.data?.status || prev.status,
      }));
      fetchClaims();
    } catch (e2) {
      toast.error(e2?.response?.data?.error || "Failed to record assessment");
    } finally {
      setSaving(false);
    }
  };

  // Open Invoice Generation / Linking Modal
  const openInvoiceModal = () => {
    setInvoiceModalForm({
      mode: "GENERATE",
      existing_invoice_id: "",
      invoice_notes: `Invoice for payment claim ${claimForm.claim_reference}: ${claimForm.claim_title}`,
    });
    setInvoiceModalOpen(true);
  };

  // Save / Generate / Link Invoice
  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!activeClaimId) {
      toast.error("Please save the claim before linking an invoice.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.post(`/projects/payment-claims/${activeClaimId}/link-invoice`, invoiceModalForm);
      toast.success(res.data?.message || "Invoice synchronized successfully");
      setInvoiceModalOpen(false);
      setClaimForm((prev) => ({
        ...prev,
        invoice_no: res.data?.invoice_no,
        invoice_id: res.data?.invoice_id,
        status: res.data?.status || "INVOICED",
      }));
      fetchClaims();
    } catch (e2) {
      toast.error(e2?.response?.data?.error || "Failed to generate or link invoice");
    } finally {
      setSaving(false);
    }
  };

  // Delete Draft Claim
  const handleDeleteClaim = async (claimId) => {
    if (!window.confirm("Are you sure you want to delete this payment claim? This cannot be undone.")) {
      return;
    }
    try {
      await api.delete(`/projects/payment-claims/${claimId}`);
      toast.success("Payment claim deleted successfully");
      if (viewMode === "WORKSPACE") {
        setViewMode("LIST");
      }
      fetchClaims();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to delete claim");
    }
  };

  // Export to Excel
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Payment Claims Register");

    const headers = [
      "Claim Reference",
      "Project Code",
      "Project Name",
      "Client / Customer",
      "Claim Type",
      "Claim Date",
      "Gross Claim (GH₵)",
      "Retention (GH₵)",
      "Other Deductions (GH₵)",
      "Tax Amount (GH₵)",
      "Net Claim (GH₵)",
      "Client Accepted (GH₵)",
      "Invoiced Amount (GH₵)",
      "Amount Paid (GH₵)",
      "Outstanding (GH₵)",
      "Status",
    ];
    sheet.addRow(headers);

    claims.forEach((c) => {
      sheet.addRow([
        c.claim_reference,
        c.project_code || "",
        c.project_name || "",
        c.client_name || "",
        c.claim_type,
        c.claim_date ? String(c.claim_date).slice(0, 10) : "",
        Number(c.gross_claim_amount || 0).toFixed(2),
        Number(c.retention_deduction || 0).toFixed(2),
        Number(c.other_deductions || 0).toFixed(2),
        Number(c.tax_amount || 0).toFixed(2),
        Number(c.net_claim_amount || 0).toFixed(2),
        Number(c.client_accepted_amount || 0).toFixed(2),
        Number(c.amount_invoiced || 0).toFixed(2),
        Number(c.amount_paid || 0).toFixed(2),
        Number(c.outstanding_amount || 0).toFixed(2),
        c.status,
      ]);
    });

    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    sheet.columns.forEach((col) => {
      col.width = Math.min(40, Math.max(14, ...sheet.getColumn(col.number).values.map((v) => String(v || "").length + 2)));
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-payment-claims-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export to PDF
  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text("Project Payment Claims & Progress Assessments Register", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()} · Total Claims: ${claims.length}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [["Ref #", "Project", "Client", "Claim Type", "Date", "Gross", "Retention", "Tax", "Net Claim", "Accepted", "Status"]],
      body: claims.map((c) => [
        c.claim_reference,
        c.project_name || "—",
        c.client_name || "—",
        c.claim_type,
        c.claim_date ? String(c.claim_date).slice(0, 10) : "—",
        Number(c.gross_claim_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        Number(c.retention_deduction || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        Number(c.tax_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        Number(c.net_claim_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        Number(c.client_accepted_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
        c.status,
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    doc.save(`project-payment-claims-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Print Statement Modal trigger
  const handlePrintStatement = () => {
    setPrintModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 400);
  };

  const getStatusBadge = (st) => {
    const found = CLAIM_STATUSES.find((s) => s.value === st);
    return found ? found.badge : "bg-slate-100 text-slate-700";
  };

  const getStatusLabel = (st) => {
    const found = CLAIM_STATUSES.find((s) => s.value === st);
    return found ? found.label : st;
  };

  const selectedProjectObj = projects.find((p) => String(p.id) === String(claimForm.project_id));

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER: LIST VIEW
  // ───────────────────────────────────────────────────────────────────────────
  if (viewMode === "LIST") {
    return (
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5 shadow-sm">
              <ArrowLeft size={16} /> Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calculator size={24} className="text-brand-900 dark:text-brand-400" /> Project Payment Claims
              </h1>
              <p className="text-slate-500 text-sm mt-0.5 hidden">
                Client progress assessments, milestone deliverables, contractual payment claims, and invoice reconciliation across all project types.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportExcel}
              className="btn btn-secondary inline-flex items-center gap-1.5 text-sm font-semibold shadow-sm"
              title="Export to Excel"
            >
              <FileSpreadsheet size={15} /> Excel
            </button>
            <button
              onClick={exportPdf}
              className="btn btn-secondary inline-flex items-center gap-1.5 text-sm font-semibold shadow-sm"
              title="Export to PDF"
            >
              <Download size={15} /> PDF
            </button>
            <button
              onClick={handleOpenNewClaim}
              className="btn btn-primary inline-flex items-center gap-2 text-sm font-semibold shadow-sm"
            >
              <Plus size={16} /> New Payment Claim
            </button>
          </div>
        </div>

        {/* KPI Summary Cards (6 Canonical Cards) */}
        <MobileMovingCarousel data-page-carousel gridColsClass="grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6" gapClass="gap-4">
          {[
            {
              label: "Total Claims",
              val: kpis.total_claims,
              isCurrency: false,
              icon: Layers,
              badgeColor: "bg-brand-900 dark:bg-brand-700 text-white",
            },
            {
              label: "Total Claimed",
              val: kpis.total_amount_claimed,
              isCurrency: true,
              icon: DollarSign,
              badgeColor: "bg-sky-600 dark:bg-sky-500 text-white",
            },
            {
              label: "Total Accepted",
              val: kpis.total_amount_accepted,
              isCurrency: true,
              icon: CheckCircle2,
              badgeColor: "bg-emerald-600 text-white",
            },
            {
              label: "Total Invoiced",
              val: kpis.total_amount_invoiced,
              isCurrency: true,
              icon: Receipt,
              badgeColor: "bg-purple-600 text-white",
            },
            {
              label: "Total Paid",
              val: kpis.total_amount_paid,
              isCurrency: true,
              icon: ShieldCheck,
              badgeColor: "bg-teal-600 text-white",
            },
            {
              label: "Outstanding Due",
              val: kpis.outstanding_receivables,
              isCurrency: true,
              icon: AlertTriangle,
              badgeColor: "bg-rose-600 text-white",
            },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={i}
                className="card p-6 min-h-[160px] flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-smoky-card hover:shadow-smoky-lg transition-all"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                    {card.isCurrency ? `GH₵ ${Number(card.val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : card.val}
                  </p>
                </div>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md shrink-0 ${card.badgeColor}`}>
                  <Icon size={20} className="stroke-[2.5]" />
                </div>
              </div>
            );
          })}
        </MobileMovingCarousel>

        {/* Search and Filter Bar (Clean Single-Row Horizontal Layout) */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm w-full overflow-x-auto scrollbar-none">
          {/* Project Filter */}
          <div className="w-56 shrink-0">
            <select
              className="w-full h-9 px-3 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer truncate"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code ? `${p.project_code} - ` : ""}{p.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-40 shrink-0">
            <select
              className="w-full h-9 px-3 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {CLAIM_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          {/* Claim Type Filter */}
          <div className="w-44 shrink-0">
            <select
              className="w-full h-9 px-3 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all cursor-pointer"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">All Claim Types</option>
              {CLAIM_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            <input
              type="text"
              placeholder="Search ref, title, project, client..."
              className="w-full h-9 pl-8 pr-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Refresh Button */}
          <div className="shrink-0">
            
          </div>
        </div>

        {/* Claims Register Table */}
        <div className="card overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-brand-700 dark:text-brand-400" />
              Project Payment Claims Register ({claims.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3 text-left">Claim Ref #</th>
                  <th className="py-3 px-3 text-left">Project</th>
                  <th className="py-3 px-3 text-left">Claim Type</th>
                  <th className="py-3 px-3 text-left">Claim Date</th>
                  <th className="py-3 px-3 text-right">Gross Claim</th>
                  <th className="py-3 px-3 text-right">Deductions / Ret</th>
                  <th className="py-3 px-3 text-right">Net Claim</th>
                  <th className="py-3 px-3 text-right">Client Accepted</th>
                  <th className="py-3 px-3 text-right">Invoiced / Paid</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-10 text-center text-slate-400 italic">
                      {loading ? "Loading payment claims..." : "No payment claims found. Click '+ New Payment Claim' to create your first claim."}
                    </td>
                  </tr>
                ) : (
                  claims.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-brand-900 dark:text-brand-300">
                        <button
                          onClick={() => handleOpenEditClaim(c.id)}
                          className="hover:underline text-left"
                        >
                          {c.claim_reference}
                        </button>
                        <div className="text-[10px] text-slate-400 font-normal truncate max-w-[150px]">{c.claim_title}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{c.project_code || "—"}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{c.project_name}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {c.claim_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono">
                        {c.claim_date ? String(c.claim_date).slice(0, 10) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        {c.currency} {Number(c.gross_claim_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        -{c.currency} {(Number(c.retention_deduction || 0) + Number(c.other_deductions || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {c.currency} {Number(c.net_claim_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {c.client_accepted_amount ? `${c.currency} ${Number(c.client_accepted_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        {c.invoice_no ? (
                          <Link
                            to="/project-management/project-invoices"
                            className="inline-flex items-center gap-1 font-bold text-purple-700 dark:text-purple-400 hover:underline"
                            title="View in Client Project Invoices"
                          >
                            <Receipt size={11} /> {c.invoice_no}
                          </Link>
                        ) : (
                          <span className="text-slate-400">Auto-on save</span>
                        )}
                        <div className="text-slate-500">Inv: {c.currency} {Number(c.amount_invoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="text-emerald-600">Paid: {c.currency} {Number(c.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(c.status)}`}>
                          {getStatusLabel(c.status)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditClaim(c.id)}
                            className="btn btn-secondary p-1.5 text-slate-600 hover:text-brand-600"
                            title="Open Workspace"
                          >
                            <Eye size={13} />
                          </button>
                          {c.status === "DRAFT" && (
                            <button
                              onClick={() => handleDeleteClaim(c.id)}
                              className="btn btn-secondary p-1.5 text-rose-500 hover:bg-rose-50"
                              title="Delete Draft"
                            >
                              <Trash2 size={13} />
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
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RENDER: WORKSPACE VIEW (8 TABS)
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-16">
      {/* Workspace Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode("LIST")}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <ArrowLeft size={15} /> All Claims
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white font-mono">
                {claimForm.claim_reference || "New Payment Claim"}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(claimForm.status)}`}>
                {getStatusLabel(claimForm.status)}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedProjectObj ? `${selectedProjectObj.project_code} — ${selectedProjectObj.project_name}` : "Project Payment Claim Workspace"}
            </p>
          </div>
        </div>

        {/* Operational Actions (NO Approval Workflow) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintStatement}
            className="btn btn-secondary inline-flex items-center gap-1 text-sm font-semibold"
            title="Print Claim Statement"
          >
            <Printer size={14} /> Print
          </button>

          <button
            onClick={() => setAttachmentsModalOpen(true)}
            disabled={!activeClaimId}
            className="btn btn-secondary inline-flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
            title="Manage Attachments"
          >
            <Paperclip size={14} /> Documents
          </button>

          <button
            onClick={openInvoiceModal}
            disabled={!activeClaimId}
            className="btn btn-secondary inline-flex items-center gap-1 text-sm font-semibold disabled:opacity-50"
            title="Generate or Link Invoice in Sales / Finance"
          >
            <Receipt size={14} /> {claimForm.invoice_no ? `Invoice: ${claimForm.invoice_no}` : "Generate/Link Invoice"}
          </button>

          <button
            onClick={openAssessmentModal}
            disabled={!activeClaimId}
            className="btn btn-secondary inline-flex items-center gap-1 text-sm font-semibold disabled:opacity-50"
            title="Record Client Assessment & Adjustments"
          >
            <Scale size={14} /> Record Assessment
          </button>

          {claimForm.status === "DRAFT" && (
            <button
              onClick={handleSubmitToClient}
              disabled={saving}
              className="btn btn-secondary text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100 inline-flex items-center gap-1 text-sm font-bold"
              title="Submit directly to client for payment review"
            >
              <Send size={14} /> Submit to Client
            </button>
          )}

          <button
            onClick={() => handleSaveClaim()}
            disabled={saving}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs font-bold shadow-sm"
          >
            <Check size={14} /> {saving ? "Saving..." : "Save Claim"}
          </button>
        </div>
      </div>

      {/* 4 Consolidated Core Workspaces */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto text-xs font-semibold">
        {[
          { id: "details", label: "1. Claim Details & Scope", icon: FileText },
          { id: "items", label: `2. Line Items & Work Breakdown (${claimForm.items?.length || 0})`, icon: FileSpreadsheet },
          { id: "financial", label: "3. Financial Reconciliation & Deductions", icon: Calculator },
          { id: "invoicing_audit", label: "4. Invoicing, Assessment & History", icon: Receipt },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-brand-600 text-brand-600 dark:text-brand-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CLAIM DETAILS & SCOPE */}
      {activeTab === "details" && (
        <div className="space-y-6">
          {/* Project & Contract Baseline Highlights (Displayed when project selected) */}
          {selectedProjectObj && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Project Information Card */}
              <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Building2 size={14} /> Project &amp; Contract Profile
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Project:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-right">
                      {selectedProjectObj.project_code} — {selectedProjectObj.project_name}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Client / Customer:</span>
                    <span className="font-bold text-brand-900 dark:text-brand-300">
                      {projectMetrics?.project?.client_name || selectedProjectObj?.client_name || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Project Manager:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {projectMetrics?.project?.manager_name || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contract Financial Baseline Card */}
              <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Scale size={14} /> Contract Value Baseline
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Original Contract Sum:</span>
                    <span className="font-mono font-semibold">
                      {claimForm.currency} {Number(claimForm.original_contract_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Revised Contract Value:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {claimForm.currency} {Number(claimForm.revised_contract_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Remaining Balance:</span>
                    <span className="font-mono font-bold text-brand-600">
                      {claimForm.currency} {Number(claimForm.remaining_unclaimed_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Claim Highlight Card */}
              <div className="card p-5 bg-gradient-to-br from-brand-50 to-slate-50 dark:from-slate-800/60 dark:to-slate-900 border border-brand-200 dark:border-brand-800 rounded-2xl shadow-sm space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                  <Calculator size={14} /> Current Claim Assessment
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-brand-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Gross Claimed:</span>
                    <span className="font-mono font-semibold">
                      {claimForm.currency} {Number(claimForm.gross_claim_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-brand-100 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-400">Retention ({claimForm.retention_percent}%):</span>
                    <span className="font-mono text-rose-600">
                      -{claimForm.currency} {Number(claimForm.retention_deduction || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 pt-2">
                    <span className="font-bold text-slate-800 dark:text-white text-sm">Net Claim Due:</span>
                    <span className="font-mono font-black text-lg text-brand-900 dark:text-brand-300">
                      {claimForm.currency} {Number(claimForm.net_claim_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Core Input Fields Card */}
          <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b pb-3 dark:border-slate-800">
              Payment Claim Parameters &amp; Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Project <span className="text-rose-500">*</span>
                </label>
                <select
                  className="input text-sm w-full"
                  value={claimForm.project_id}
                  onChange={(e) => {
                    const pId = e.target.value;
                    updateClaimField("project_id", pId);
                    if (pId) {
                      loadProjectMetrics(pId);
                      api.get(`/projects/payment-claims/next-reference?projectId=${pId}`)
                        .then((refRes) => {
                          if (refRes.data?.claim_reference && (!claimForm.claim_reference || claimForm.claim_reference.startsWith("CLM-"))) {
                            updateClaimField("claim_reference", refRes.data.claim_reference);
                          }
                        })
                        .catch(() => {});
                    } else {
                      setProjectMetrics(null);
                    }
                  }}
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_code} - {p.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Claim Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  className="input text-sm w-full font-mono font-semibold"
                  value={claimForm.claim_reference}
                  onChange={(e) => updateClaimField("claim_reference", e.target.value)}
                  placeholder="e.g. CLM-PRJ001-001"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Claim Type
                </label>
                <select
                  className="input text-sm w-full"
                  value={claimForm.claim_type}
                  onChange={(e) => updateClaimField("claim_type", e.target.value)}
                >
                  {CLAIM_TYPES.map((ct) => (
                    <option key={ct.value} value={ct.value}>{ct.label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Claim Title / Heading <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  className="input text-sm w-full"
                  value={claimForm.claim_title}
                  onChange={(e) => updateClaimField("claim_title", e.target.value)}
                  placeholder="e.g. Progress Claim #2 - System Integration &amp; Milestone 3 Delivery"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Currency &amp; Symbol
                </label>
                <input
                  type="text"
                  className="input text-sm w-full font-mono"
                  value={claimForm.currency}
                  onChange={(e) => updateClaimField("currency", e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Claim Period From
                </label>
                <input
                  type="date"
                  className="input text-sm w-full"
                  value={claimForm.claim_period_from ? String(claimForm.claim_period_from).slice(0, 10) : ""}
                  onChange={(e) => updateClaimField("claim_period_from", e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Claim Period To
                </label>
                <input
                  type="date"
                  className="input text-sm w-full"
                  value={claimForm.claim_period_to ? String(claimForm.claim_period_to).slice(0, 10) : ""}
                  onChange={(e) => updateClaimField("claim_period_to", e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Claim Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  className="input text-sm w-full font-medium"
                  value={claimForm.claim_date ? String(claimForm.claim_date).slice(0, 10) : ""}
                  onChange={(e) => updateClaimField("claim_date", e.target.value)}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Due Date
                </label>
                <input
                  type="date"
                  className="input text-sm w-full"
                  value={claimForm.payment_due_date ? String(claimForm.payment_due_date).slice(0, 10) : ""}
                  onChange={(e) => updateClaimField("payment_due_date", e.target.value)}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Claim Scope &amp; Objectives Description
                </label>
                <textarea
                  rows={3}
                  className="input text-sm w-full"
                  value={claimForm.claim_description || ""}
                  onChange={(e) => updateClaimField("claim_description", e.target.value)}
                  placeholder="Describe scope completed, deliverables achieved, and agreed terms under this claim..."
                />
              </div>

              <div className="md:col-span-3">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Supporting Remarks / Contractual Notes
                </label>
                <textarea
                  rows={2}
                  className="input text-sm w-full"
                  value={claimForm.supporting_remarks || ""}
                  onChange={(e) => updateClaimField("supporting_remarks", e.target.value)}
                  placeholder="Reference contractual clauses, inspection certificates, or payment provisions..."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LINE ITEMS & WORK BREAKDOWN */}
      {activeTab === "items" && (
        <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Payment Claim Item Breakdown &amp; Progress Quantities
              </h3>
              <p className="text-xs text-slate-400">
                Supports Fixed Amount, Qty × Rate, % of Contract Value, Milestones, and Time-Based charges.
              </p>
            </div>
            <button
              onClick={addClaimItem}
              className="btn btn-primary inline-flex items-center gap-1.5 text-sm font-semibold shadow-sm"
            >
              <Plus size={14} /> Add Claim Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 w-28">Ref #</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Description of Work / Deliverable</th>
                  <th className="py-2.5 px-3 w-36">Billing Method</th>
                  <th className="py-2.5 px-3 w-20 text-right">Qty</th>
                  <th className="py-2.5 px-3 w-20">UoM</th>
                  <th className="py-2.5 px-3 w-24 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 w-28 text-right">Prev Claimed</th>
                  <th className="py-2.5 px-3 w-32 text-right">Current Claim</th>
                  <th className="py-2.5 px-3 w-32 text-right">Cumulative</th>
                  <th className="py-2.5 px-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {claimForm.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        className="input text-sm w-full font-mono py-1"
                        value={item.item_reference || ""}
                        onChange={(e) => updateClaimItem(idx, "item_reference", e.target.value)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        className="input text-sm w-full py-1 font-medium"
                        placeholder="Description of completed work, deliverable, service..."
                        value={item.item_description || ""}
                        onChange={(e) => updateClaimItem(idx, "item_description", e.target.value)}
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          className="input text-[11px] py-0.5 text-slate-400 w-1/2"
                          placeholder="Work Plan/WBS / Task Code (optional)"
                          value={item.wbs_code || ""}
                          onChange={(e) => updateClaimItem(idx, "wbs_code", e.target.value)}
                        />
                        <input
                          type="text"
                          className="input text-[11px] py-0.5 text-slate-400 w-1/2"
                          placeholder="Deliverable Name (optional)"
                          value={item.deliverable_service || ""}
                          onChange={(e) => updateClaimItem(idx, "deliverable_service", e.target.value)}
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <select
                        className="input text-sm w-full py-1"
                        value={item.billing_method}
                        onChange={(e) => updateClaimItem(idx, "billing_method", e.target.value)}
                      >
                        {BILLING_METHODS.map((bm) => (
                          <option key={bm.value} value={bm.value}>{bm.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="any"
                        className="input text-sm w-full text-right font-mono py-1"
                        value={item.current_claim_qty}
                        onChange={(e) => updateClaimItem(idx, "current_claim_qty", e.target.value)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        className="input text-sm w-full py-1 font-mono"
                        value={item.unit_of_measure}
                        onChange={(e) => updateClaimItem(idx, "unit_of_measure", e.target.value)}
                      >
                        <option value="EA">EA</option>
                        <option value="HR">HR</option>
                        <option value="DAY">DAY</option>
                        <option value="LOT">LOT</option>
                        <option value="SET">SET</option>
                        <option value="M">M</option>
                        <option value="M2">M2</option>
                        <option value="M3">M3</option>
                        <option value="KG">KG</option>
                        <option value="%">%</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        className="input text-sm w-full text-right font-mono py-1"
                        value={item.unit_rate}
                        onChange={(e) => updateClaimItem(idx, "unit_rate", e.target.value)}
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-500">
                      {claimForm.currency} {Number(item.previous_claimed_amount || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        className="input text-sm w-full text-right font-mono font-semibold py-1 bg-brand-50/40 dark:bg-slate-800"
                        value={item.current_claim_amount}
                        onChange={(e) => updateClaimItem(idx, "current_claim_amount", e.target.value)}
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {claimForm.currency} {Number(item.cumulative_claimed_amount || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => removeClaimItem(idx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                        title="Remove Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 font-bold">
                <tr>
                  <td colSpan={8} className="py-3 px-4 text-right uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Gross Claim Total:
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-base text-brand-900 dark:text-brand-300">
                    {claimForm.currency} {Number(claimForm.gross_claim_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-slate-500 font-mono text-right">
                    Cum: {claimForm.currency} {Number(claimForm.cumulative_claimed_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIAL RECONCILIATION & DEDUCTIONS */}
      {activeTab === "financial" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b pb-3 dark:border-slate-800 flex items-center gap-2">
              <Calculator size={16} className="text-brand-600" />
              Contract Financial Reconciliation
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Original Contract Value:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {claimForm.currency} {Number(claimForm.original_contract_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Approved Variations / Change Orders:</span>
                <span className="font-mono font-bold text-emerald-600">
                  +{claimForm.currency} {Number(claimForm.approved_variations_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 bg-slate-50 dark:bg-slate-800/60 px-3 rounded-lg border dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-white">Revised Contract Value:</span>
                <span className="font-mono font-bold text-sm text-brand-900 dark:text-brand-300">
                  {claimForm.currency} {Number(claimForm.revised_contract_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Total Previous Claims:</span>
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                  {claimForm.currency} {Number(claimForm.previous_claims_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Current Gross Claim:</span>
                <span className="font-mono font-bold text-emerald-600">
                  +{claimForm.currency} {Number(claimForm.gross_claim_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium">Total Cumulative Claims:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {claimForm.currency} {Number(claimForm.cumulative_claimed_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center py-2 bg-emerald-50 dark:bg-emerald-950/40 px-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <span className="font-bold text-emerald-900 dark:text-emerald-300">Remaining Unclaimed Contract Balance:</span>
                <span className="font-mono font-bold text-sm text-emerald-800 dark:text-emerald-200">
                  {claimForm.currency} {Number(claimForm.remaining_unclaimed_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b pb-3 dark:border-slate-800 flex items-center gap-2">
              <Scale size={16} className="text-brand-600" />
              Deductions, Retentions &amp; Net Payable
            </h3>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Retention Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input text-sm w-full font-mono"
                    value={claimForm.retention_percent}
                    onChange={(e) => updateClaimField("retention_percent", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Retention Deduction</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-sm w-full font-mono text-rose-600 font-semibold"
                    value={claimForm.retention_deduction}
                    onChange={(e) => updateClaimField("retention_deduction", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Other Agreed Deductions (Advances / Penalties / Offsets)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input text-sm w-full font-mono"
                  value={claimForm.other_deductions}
                  onChange={(e) => updateClaimField("other_deductions", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Tax Treatment (VAT / NHIL / GETFund %)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input text-sm w-full font-mono"
                    value={claimForm.tax_rate}
                    onChange={(e) => updateClaimField("tax_rate", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Calculated Tax Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-sm w-full font-mono text-emerald-600 font-semibold"
                    value={claimForm.tax_amount}
                    onChange={(e) => updateClaimField("tax_amount", e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-brand-900 to-slate-900 text-white rounded-xl space-y-1">
                <div className="flex justify-between items-center text-xs opacity-80 uppercase tracking-wider">
                  <span>Net Payment Claim Payable</span>
                  <span>Gross - Deductions + Tax</span>
                </div>
                <div className="text-2xl font-black font-mono">
                  {claimForm.currency} {Number(claimForm.net_claim_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INVOICING, ASSESSMENT & HISTORY */}
      {activeTab === "invoicing_audit" && (
        <div className="space-y-6">
          {/* Automatic Client Project Invoice Synchronization Banner */}
          <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt size={16} className="text-purple-600" />
                  Client Project Invoice Integration (Automatic Real-Time Sync)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Synchronized with Client Project Invoices. When this claim is saved, an entry is automatically created and updated in Client Project Invoices.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/project-management/project-invoices"
                  className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200"
                  title="Open Client Project Invoices list"
                >
                  <Receipt size={14} className="text-purple-600" />
                  <span>View in Client Project Invoices</span>
                  <ExternalLink size={12} />
                </Link>
                <button
                  onClick={openInvoiceModal}
                  className="btn btn-secondary inline-flex items-center gap-1.5 text-sm font-semibold"
                >
                  <Receipt size={14} /> {claimForm.invoice_no ? "Relink / Change Invoice" : "Generate / Link Invoice"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-1">
                <span className="text-xs text-purple-700 dark:text-purple-300 font-semibold block">Linked Commercial Invoice:</span>
                <div className="font-mono font-bold text-lg text-purple-900 dark:text-purple-200">
                  {claimForm.invoice_no || "Auto-Created Upon Saving Claim"}
                </div>
                <p className="text-[11px] text-purple-600 dark:text-purple-400">
                  {claimForm.invoice_date ? `Invoice Date: ${String(claimForm.invoice_date).slice(0, 10)}` : "Automatically recorded into Client Project Invoices"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs text-slate-500 block">Total Amount Invoiced:</span>
                <div className="font-mono font-bold text-base text-slate-900 dark:text-white">
                  {claimForm.currency} {Number(claimForm.amount_invoiced || claimForm.net_claim_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-400">Total payable claim amount billed to client.</p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 block">Client Payments / Receipts Applied:</span>
                <div className="font-mono font-black text-xl text-emerald-800 dark:text-emerald-200">
                  {claimForm.currency} {Number(claimForm.amount_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-emerald-600">Outstanding: {claimForm.currency} {Number(claimForm.outstanding_amount || claimForm.net_claim_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          {/* Client Progress Assessment & Determinations Card */}
          <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b pb-3 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Scale size={16} className="text-brand-600" />
                  Client Progress Assessment &amp; Determinations
                </h3>
                <p className="text-xs text-slate-400">
                  Record client certifications, accepted valuations, and disputed amounts.
                </p>
              </div>
              <button
                onClick={openAssessmentModal}
                className="btn btn-secondary inline-flex items-center gap-1.5 text-sm font-semibold"
              >
                <Scale size={14} /> Update Assessment
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 block">Assessment Ref:</span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                  {claimForm.client_assessment_ref || "Not Assessed Yet"}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 block">Client Representative:</span>
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  {claimForm.client_representative || "—"}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xs text-emerald-700 dark:text-emerald-300 block">Client Accepted Amount:</span>
                <span className="font-mono font-black text-lg text-emerald-800 dark:text-emerald-200">
                  {claimForm.currency} {Number(claimForm.client_accepted_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <span className="text-xs text-rose-700 dark:text-rose-300 block">Disputed / Rejected:</span>
                <span className="font-mono font-black text-lg text-rose-800 dark:text-rose-200">
                  {claimForm.currency} {(Number(claimForm.client_disputed_amount || 0) + Number(claimForm.client_rejected_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {claimForm.client_assessment_remarks && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Client Assessment Remarks:
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300">{claimForm.client_assessment_remarks}</p>
              </div>
            )}
          </div>

          {/* Operational Status History & Audit Trail */}
          <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b pb-3 dark:border-slate-800 flex items-center gap-2">
              <History size={16} className="text-brand-600" />
              Operational Audit Trail &amp; Status History
            </h3>

            <div className="overflow-x-auto">
              <table className="table w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date &amp; Time</th>
                    <th className="py-2.5 px-3">Previous Status</th>
                    <th className="py-2.5 px-3">New Status</th>
                    <th className="py-2.5 px-3">Action By</th>
                    <th className="py-2.5 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activeClaimHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                        No status transitions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    activeClaimHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {h.change_date ? new Date(h.change_date).toLocaleString() : "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          {h.previous_status ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(h.previous_status)}`}>
                              {getStatusLabel(h.previous_status)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(h.new_status)}`}>
                            {getStatusLabel(h.new_status)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {h.changed_by_name || "System"}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                          {h.remarks}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: RECORD CLIENT ASSESSMENT */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {assessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scale size={18} className="text-brand-600" /> Record Client Assessment
              </h3>
              <button
                type="button"
                onClick={() => setAssessmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAssessment} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assessment Reference
                  </label>
                  <input
                    type="text"
                    className="input text-sm w-full font-mono"
                    value={assessmentForm.client_assessment_ref}
                    onChange={(e) => setAssessmentForm((prev) => ({ ...prev, client_assessment_ref: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assessment Date
                  </label>
                  <input
                    type="date"
                    className="input text-sm w-full"
                    value={assessmentForm.client_assessment_date}
                    onChange={(e) => setAssessmentForm((prev) => ({ ...prev, client_assessment_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assessed Gross Amount ({claimForm.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-sm w-full font-mono"
                    value={assessmentForm.client_assessed_amount}
                    onChange={(e) => setAssessmentForm((prev) => ({ ...prev, client_assessed_amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Accepted Net Amount ({claimForm.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-sm w-full font-mono font-semibold text-emerald-600"
                    value={assessmentForm.client_accepted_amount}
                    onChange={(e) => setAssessmentForm((prev) => ({ ...prev, client_accepted_amount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Disputed Amount ({claimForm.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-sm w-full font-mono text-orange-600"
                    value={assessmentForm.client_disputed_amount}
                    onChange={(e) => setAssessmentForm((prev) => ({ ...prev, client_disputed_amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rejected Amount ({claimForm.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-sm w-full font-mono text-rose-600"
                    value={assessmentForm.client_rejected_amount}
                    onChange={(e) => setAssessmentForm((prev) => ({ ...prev, client_rejected_amount: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Representative / Certifier
                </label>
                <input
                  type="text"
                  className="input text-sm w-full"
                  placeholder="e.g. Ing. Kwame Mensah (Client Lead Consultant)"
                  value={assessmentForm.client_representative}
                  onChange={(e) => setAssessmentForm((prev) => ({ ...prev, client_representative: e.target.value }))}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assessment Remarks & Feedback
                </label>
                <textarea
                  rows={3}
                  className="input text-sm w-full"
                  placeholder="Details of client determination, deduction reasons, or agreed milestones..."
                  value={assessmentForm.client_assessment_remarks}
                  onChange={(e) => setAssessmentForm((prev) => ({ ...prev, client_assessment_remarks: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssessmentModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary text-sm font-semibold"
                >
                  {saving ? "Saving..." : "Record Assessment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: GENERATE OR LINK INVOICE */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {invoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt size={18} className="text-purple-600" />
                Sales & Project Invoicing
              </h3>
              <button
                type="button"
                onClick={() => setInvoiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Invoicing Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceModalForm((p) => ({ ...p, mode: "GENERATE" }))}
                    className={`p-2.5 rounded-xl border text-left font-semibold ${
                      invoiceModalForm.mode === "GENERATE"
                        ? "border-brand-600 bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-300"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    1. Generate New Invoice
                    <p className="text-[10px] font-normal text-slate-500 mt-0.5">Creates a formal sales invoice in Project Invoices</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceModalForm((p) => ({ ...p, mode: "LINK" }))}
                    className={`p-2.5 rounded-xl border text-left font-semibold ${
                      invoiceModalForm.mode === "LINK"
                        ? "border-brand-600 bg-brand-50 text-brand-900 dark:bg-brand-950/40 dark:text-brand-300"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    2. Link Existing Invoice
                    <p className="text-[10px] font-normal text-slate-500 mt-0.5">Connect to an already generated project invoice</p>
                  </button>
                </div>
              </div>

              {invoiceModalForm.mode === "LINK" && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Existing Project Invoice <span className="text-rose-500">*</span>
                  </label>
                  <select
                    className="input text-sm w-full"
                    value={invoiceModalForm.existing_invoice_id}
                    onChange={(e) => setInvoiceModalForm((p) => ({ ...p, existing_invoice_id: e.target.value }))}
                    required
                  >
                    <option value="">-- Choose an Invoice --</option>
                    {(projectMetrics?.invoices || []).map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_no} ({inv.invoice_date ? String(inv.invoice_date).slice(0, 10) : ""}) — {claimForm.currency} {Number(inv.net_amount || inv.total_amount).toFixed(2)} [{inv.status}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Notes & Description
                </label>
                <textarea
                  rows={3}
                  className="input text-sm w-full"
                  value={invoiceModalForm.invoice_notes}
                  onChange={(e) => setInvoiceModalForm((p) => ({ ...p, invoice_notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setInvoiceModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary text-sm font-semibold"
                >
                  {saving ? "Processing..." : invoiceModalForm.mode === "GENERATE" ? "Generate Invoice" : "Link Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ATTACHMENTS MODAL */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {attachmentsModalOpen && activeClaimId && (
        <DocumentAttachmentsModal
          open={attachmentsModalOpen}
          docType="project_payment_claim"
          docId={activeClaimId}
          onClose={() => setAttachmentsModalOpen(false)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PRINT VIEW (Rendered into DOM for window.print()) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {printModalOpen && (
        <div className="print-only hidden print:block fixed inset-0 bg-white p-8 z-50 text-slate-900 text-xs">
          <div className="border-b pb-4 mb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900">
                Project Payment Claim Statement
              </h1>
              <p className="text-slate-500 hidden">OmniSuite ERP Project Management System</p>
            </div>
            <div className="text-right font-mono">
              <div className="font-bold text-sm">Ref: {claimForm.claim_reference}</div>
              <div className="text-slate-500">Date: {claimForm.claim_date ? String(claimForm.claim_date).slice(0, 10) : ""}</div>
              <div>Status: {claimForm.status}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border p-3 rounded">
              <h3 className="font-bold uppercase text-[10px] text-slate-400 mb-1">Project Details</h3>
              <p><strong>Project:</strong> {selectedProjectObj?.project_name} ({selectedProjectObj?.project_code})</p>
              <p><strong>Type:</strong> {projectMetrics?.project?.project_type || "General"}</p>
              <p><strong>Manager:</strong> {projectMetrics?.project?.manager_name || "—"}</p>
              <p><strong>Contract Ref:</strong> {projectMetrics?.project?.contract_ref || "—"}</p>
            </div>
            <div className="border p-3 rounded">
              <h3 className="font-bold uppercase text-[10px] text-slate-400 mb-1">Client & Period</h3>
              <p><strong>Client:</strong> {projectMetrics?.project?.client_name || selectedProjectObj?.client_name || "—"}</p>
              <p><strong>Period:</strong> {claimForm.claim_period_from ? String(claimForm.claim_period_from).slice(0, 10) : "—"} to {claimForm.claim_period_to ? String(claimForm.claim_period_to).slice(0, 10) : "—"}</p>
              <p><strong>Due Date:</strong> {claimForm.payment_due_date ? String(claimForm.payment_due_date).slice(0, 10) : "—"}</p>
            </div>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-sm mb-6">
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-slate-300">
                <th className="border border-slate-300 p-2 text-left">#</th>
                <th className="border border-slate-300 p-2 text-left">Description</th>
                <th className="border border-slate-300 p-2 text-right">Qty</th>
                <th className="border border-slate-300 p-2 text-left">UOM</th>
                <th className="border border-slate-300 p-2 text-right">Unit Rate</th>
                <th className="border border-slate-300 p-2 text-right">Current Claim ({claimForm.currency})</th>
              </tr>
            </thead>
            <tbody>
              {claimForm.items.map((it, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="border border-slate-300 p-2 font-mono text-center">{idx + 1}</td>
                  <td className="border border-slate-300 p-2">{it.item_description}</td>
                  <td className="border border-slate-300 p-2 text-right font-mono">{it.current_claim_qty}</td>
                  <td className="border border-slate-300 p-2">{it.unit_of_measure}</td>
                  <td className="border border-slate-300 p-2 text-right font-mono">{Number(it.unit_rate).toFixed(2)}</td>
                  <td className="border border-slate-300 p-2 text-right font-mono font-bold">{Number(it.current_claim_amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-12">
            <div className="w-72 border p-3 rounded space-y-1 text-xs">
              <div className="flex justify-between"><span>Gross Claim:</span><span className="font-mono">{claimForm.currency} {Number(claimForm.gross_claim_amount).toFixed(2)}</span></div>
              <div className="flex justify-between text-rose-600"><span>Retention ({claimForm.retention_percent}%):</span><span className="font-mono">-{claimForm.currency} {Number(claimForm.retention_deduction).toFixed(2)}</span></div>
              <div className="flex justify-between text-rose-600"><span>Other Deductions:</span><span className="font-mono">-{claimForm.currency} {Number(claimForm.other_deductions).toFixed(2)}</span></div>
              <div className="flex justify-between text-emerald-600"><span>Tax ({claimForm.tax_rate}%):</span><span className="font-mono">+{claimForm.currency} {Number(claimForm.tax_amount).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-sm border-t pt-1"><span>Net Claim:</span><span className="font-mono">{claimForm.currency} {Number(claimForm.net_claim_amount).toFixed(2)}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-center pt-8 border-t border-slate-300">
            <div>
              <div className="border-t border-slate-400 pt-2 w-48 mx-auto font-semibold">Prepared By (Project Team)</div>
            </div>
            <div>
              <div className="border-t border-slate-400 pt-2 w-48 mx-auto font-semibold">Client Representative / Certification</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
