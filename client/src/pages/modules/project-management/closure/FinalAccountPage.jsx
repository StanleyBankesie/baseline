import MobileMovingCarousel from "@/components/MobileMovingCarousel";
/**
 * @file FinalAccountPage.jsx
 * @description Comprehensive Final Account & Retention Release management page for OmniSuite ERP.
 * General-purpose financial closeout and reconciliation across all project types (construction, IT,
 * software development, manufacturing, consulting, maintenance, logistics, and professional services).
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Clock3,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Check,
  ChevronRight,
  Printer,
  Calendar,
  Building2,
  User,
  Edit,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import { api } from "../../../../api/client.js";
import DocumentAttachmentsModal from "../../../../components/attachments/DocumentAttachmentsModal.jsx";

// Standard Status and Type Configurations
const SETTLEMENT_STATUSES = [
  { value: "NOT_STARTED", label: "Not Started", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  { value: "PARTIALLY_SETTLED", label: "Partially Settled", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  { value: "FULLY_SETTLED", label: "Fully Settled", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { value: "DISPUTED", label: "Disputed", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
  { value: "ON_HOLD", label: "On Hold", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" },
];

const RETENTION_BASIS_OPTIONS = [
  { value: "ORIGINAL_CONTRACT_VALUE", label: "Original Contract / Project Value" },
  { value: "REVISED_CONTRACT_VALUE", label: "Revised Contract / Project Value" },
  { value: "CERTIFIED_WORK", label: "Certified Work / Approved Deliverables" },
  { value: "INVOICED_AMOUNT", label: "Total Invoiced Amount" },
  { value: "CUSTOM", label: "Custom Configured Base" },
];

const ADJUSTMENT_TYPES = [
  { value: "ADDITIONAL_CHARGES", label: "Additional Approved Charges", impact: "ADD" },
  { value: "APPROVED_CLAIMS", label: "Approved Claims / Compensation", impact: "ADD" },
  { value: "PENALTIES", label: "Penalties / Liquidated Damages", impact: "DEDUCT" },
  { value: "DEDUCTIONS", label: "Approved Deductions / Omissions", impact: "DEDUCT" },
  { value: "CREDIT_ADJUSTMENTS", label: "Credit Notes / Price Adjustments", impact: "DEDUCT" },
  { value: "OTHER", label: "Other Financial Adjustment", impact: "NEUTRAL" },
];

const RELEASE_STAGES = [
  "Initial Retention Release (Practical Completion)",
  "Interim Retention Release (Milestone-based)",
  "Final Retention Release (Defects Liability Expiry)",
  "Operational Acceptance Release",
  "Warranty / Support Obligations Release",
  "Other Configured Release",
];

const RECONCILIATION_STATUSES = [
  { value: "RECONCILED", label: "Reconciled", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { value: "PENDING", label: "Pending", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  { value: "DISCREPANCY", label: "Discrepancy", color: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" },
  { value: "WAIVED", label: "Waived / Adjusted", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
];

export default function FinalAccountPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation & Data States
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(searchParams.get("projectId") || "");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState("summary"); // summary | reconciliation | retention | releases | adjustments | settlement | documents

  // Final Account Data & Live Metrics
  const [finalAccount, setFinalAccount] = useState(null);
  const [liveMetrics, setLiveMetrics] = useState(null);
  const [projectInfo, setProjectInfo] = useState(null);
  const [releases, setReleases] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);

  // Modals
  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null);
  const [releaseForm, setReleaseForm] = useState({
    release_stage: "Initial Retention Release (Practical Completion)",
    release_percent: 50,
    release_amount: "",
    expected_release_date: "",
    actual_release_date: "",
    release_conditions: "",
    release_status: "PENDING",
    payment_voucher_ref: "",
    remarks: "",
  });

  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState(null);
  const [adjustmentForm, setAdjustmentForm] = useState({
    adjustment_type: "ADDITIONAL_CHARGES",
    description: "",
    amount: "",
    reason_justification: "",
    submitted_by: "",
    reviewed_status: "PENDING",
    adjustment_date: new Date().toISOString().slice(0, 10),
    remarks: "",
  });

  const [reconcileModalItem, setReconcileModalItem] = useState(null);
  const [reconcileItemForm, setReconcileItemForm] = useState({
    reconciliation_status: "RECONCILED",
    approved_adjustments: 0,
    discrepancy_notes: "",
  });

  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);

  // Form state for Final Account header/summary values
  const [faForm, setFaForm] = useState({
    final_account_date: new Date().toISOString().slice(0, 10),
    currency: "GHS",
    exchange_rate: 1.0,
    original_contract_value: 0,
    approved_variations_value: 0,
    additional_approved_charges: 0,
    approved_deductions: 0,
    total_invoiced: 0,
    total_paid: 0,
    outstanding_payable: 0,
    retention_applicable: 1,
    retention_basis: "ORIGINAL_CONTRACT_VALUE",
    retention_percent: 5.0,
    retention_calculation_base: 0,
    total_retention_amount: 0,
    retention_previously_released: 0,
    retention_release_conditions: "",
    retention_remarks: "",
    final_settlement_status: "NOT_STARTED",
    settlement_reference: "",
    settlement_remarks: "",
    status: "DRAFT",
    reconciled_by: "",
    reconciled_date: "",
    agreed_by_client: "",
    agreed_client_date: "",
  });

  // Load Projects list (by default: do not select any project)
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoadingProjects(true);
        const res = await api.get("/projects/projects", { params: { active: "all" } });
        const list = res.data?.items || (Array.isArray(res.data) ? res.data : []);
        setProjects(list);
      } catch (err) {
        console.error("Failed to load projects:", err);
        toast.error("Failed to load projects list");
      } finally {
        setLoadingProjects(false);
      }
    }
    fetchProjects();
  }, []);

  // Load Final Account for selected project
  const loadProjectFinalAccount = useCallback(async (pId) => {
    if (!pId) return;
    try {
      setLoadingData(true);
      const res = await api.get(`/projects/final-accounts/project/${pId}`);
      const data = res.data;
      setProjectInfo(data.project);
      setLiveMetrics(data.live_metrics);
      setFinalAccount(data.final_account);
      setReleases(data.releases || []);
      setAdjustments(data.adjustments || []);
      setReconciliations(data.reconciliations || []);

      if (data.final_account) {
        setFaForm({
          final_account_date: data.final_account.final_account_date ? String(data.final_account.final_account_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
          currency: data.final_account.currency || data.project?.currency || "GHS",
          exchange_rate: Number(data.final_account.exchange_rate || 1.0),
          original_contract_value: Number(data.final_account.original_contract_value || 0),
          approved_variations_value: Number(data.final_account.approved_variations_value || 0),
          additional_approved_charges: Number(data.final_account.additional_approved_charges || 0),
          approved_deductions: Number(data.final_account.approved_deductions || 0),
          total_invoiced: Number(data.final_account.total_invoiced || 0),
          total_paid: Number(data.final_account.total_paid || 0),
          outstanding_payable: Number(data.final_account.outstanding_payable || 0),
          retention_applicable: data.final_account.retention_applicable === 1 ? 1 : 0,
          retention_basis: data.final_account.retention_basis || "ORIGINAL_CONTRACT_VALUE",
          retention_percent: Number(data.final_account.retention_percent || 5.0),
          retention_calculation_base: Number(data.final_account.retention_calculation_base || 0),
          total_retention_amount: Number(data.final_account.total_retention_amount || 0),
          retention_previously_released: Number(data.final_account.retention_previously_released || 0),
          retention_release_conditions: data.final_account.retention_release_conditions || "",
          retention_remarks: data.final_account.retention_remarks || "",
          final_settlement_status: data.final_account.final_settlement_status || "NOT_STARTED",
          settlement_reference: data.final_account.settlement_reference || "",
          settlement_remarks: data.final_account.settlement_remarks || "",
          status: data.final_account.status || "DRAFT",
          reconciled_by: data.final_account.reconciled_by || "",
          reconciled_date: data.final_account.reconciled_date ? String(data.final_account.reconciled_date).slice(0, 10) : "",
          agreed_by_client: data.final_account.agreed_by_client || "",
          agreed_client_date: data.final_account.agreed_client_date ? String(data.final_account.agreed_client_date).slice(0, 10) : "",
        });
      } else {
        // Initialize from live ERP metrics
        const origVal = Number(data.live_metrics?.original_contract_value || 0);
        const varVal = Number(data.live_metrics?.approved_variations_value || 0);
        const invoicedVal = Number(data.live_metrics?.total_invoiced || 0);
        const paidVal = Number(data.live_metrics?.total_paid || 0);
        const retPct = Number(data.project?.retention_percent || 5.0);
        const retBase = origVal;
        const totalRet = retBase * (retPct / 100);

        setFaForm({
          final_account_date: new Date().toISOString().slice(0, 10),
          currency: data.project?.currency || "GHS",
          exchange_rate: 1.0,
          original_contract_value: origVal,
          approved_variations_value: varVal,
          additional_approved_charges: 0,
          approved_deductions: 0,
          total_invoiced: invoicedVal,
          total_paid: paidVal,
          outstanding_payable: Number(data.live_metrics?.outstanding_payable || 0),
          retention_applicable: 1,
          retention_basis: "ORIGINAL_CONTRACT_VALUE",
          retention_percent: retPct,
          retention_calculation_base: retBase,
          total_retention_amount: totalRet,
          retention_previously_released: 0,
          retention_release_conditions: "50% upon Practical Completion, 50% upon Defects Liability Period expiry",
          retention_remarks: "",
          final_settlement_status: "NOT_STARTED",
          settlement_reference: "",
          settlement_remarks: "",
          status: "DRAFT",
          reconciled_by: "",
          reconciled_date: "",
          agreed_by_client: "",
          agreed_client_date: "",
        });
      }
    } catch (err) {
      console.error("Error loading project final account:", err);
      toast.error("Failed to load project financial data");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectFinalAccount(selectedProjectId);
    }
  }, [selectedProjectId, loadProjectFinalAccount]);

  const handleProjectSelect = (pId) => {
    setSelectedProjectId(pId);
    if (pId) {
      setSearchParams({ projectId: pId });
    } else {
      setSearchParams({});
      setProjectInfo(null);
      setLiveMetrics(null);
      setFinalAccount(null);
      setReleases([]);
      setAdjustments([]);
      setReconciliations([]);
    }
  };

  // Calculations per specification
  const calculations = useMemo(() => {
    const origVal = Number(faForm.original_contract_value || 0);
    const varVal = Number(faForm.approved_variations_value || 0);
    const revisedContract = origVal + varVal;

    // Sum approved adjustments
    const approvedAdditions = adjustments
      .filter((a) => a.reviewed_status === "APPROVED" && (a.adjustment_type === "ADDITIONAL_CHARGES" || a.adjustment_type === "APPROVED_CLAIMS"))
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const approvedDeductions = adjustments
      .filter((a) => a.reviewed_status === "APPROVED" && (a.adjustment_type === "PENALTIES" || a.adjustment_type === "DEDUCTIONS" || a.adjustment_type === "CREDIT_ADJUSTMENTS"))
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const addCharges = Number(faForm.additional_approved_charges || approvedAdditions);
    const dedVal = Number(faForm.approved_deductions || approvedDeductions);
    const finalAccountVal = revisedContract + addCharges - dedVal;

    const paidVal = Number(faForm.total_paid || 0);
    const invoicedVal = Number(faForm.total_invoiced || 0);
    const outstandingRec = Math.max(0, finalAccountVal - paidVal);

    // Retention calculations
    const isRet = faForm.retention_applicable === 1;
    let retBase = Number(faForm.retention_calculation_base || 0);
    if (!retBase) {
      if (faForm.retention_basis === "REVISED_CONTRACT_VALUE") retBase = revisedContract;
      else if (faForm.retention_basis === "INVOICED_AMOUNT") retBase = invoicedVal;
      else retBase = origVal;
    }
    const retPct = isRet ? Number(faForm.retention_percent || 0) : 0;
    const totalRet = isRet ? (Number(faForm.total_retention_amount || 0) || (retBase * (retPct / 100))) : 0;
    
    // Sum actual releases
    const actualReleasedSum = releases
      .filter((r) => r.release_status === "RELEASED")
      .reduce((acc, curr) => acc + Number(curr.release_amount || 0), 0);
    const prevReleased = Math.max(actualReleasedSum, Number(faForm.retention_previously_released || 0));
    const outstandingRet = Math.max(0, totalRet - prevReleased);

    return {
      revisedContract,
      addCharges,
      dedVal,
      finalAccountVal,
      outstandingRec,
      retBase,
      totalRet,
      prevReleased,
      outstandingRet,
    };
  }, [faForm, adjustments, releases]);

  // Save / Update Final Account
  const handleSaveFinalAccount = async (targetStatus) => {
    if (!selectedProjectId) {
      toast.error("Please select a project first");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...faForm,
        project_id: selectedProjectId,
        revised_contract_value: calculations.revisedContract,
        additional_approved_charges: calculations.addCharges,
        approved_deductions: calculations.dedVal,
        final_account_value: calculations.finalAccountVal,
        outstanding_receivable: calculations.outstandingRec,
        retention_calculation_base: calculations.retBase,
        total_retention_amount: calculations.totalRet,
        retention_previously_released: calculations.prevReleased,
        retention_outstanding_balance: calculations.outstandingRet,
        status: targetStatus || faForm.status || "DRAFT",
      };

      if (finalAccount?.id) {
        await api.put(`/projects/final-accounts/${finalAccount.id}`, payload);
        toast.success("Final Account updated successfully");
      } else {
        await api.post(`/projects/final-accounts`, payload);
        toast.success("Final Account created successfully");
      }
      loadProjectFinalAccount(selectedProjectId);
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err?.response?.data?.message || "Failed to save final account");
    } finally {
      setSaving(false);
    }
  };

  // One-click Reconcile from Source ERP records
  const handleReconcile = async () => {
    if (!finalAccount?.id) {
      // First save if record doesn't exist
      await handleSaveFinalAccount("RECONCILED");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/projects/final-accounts/${finalAccount.id}/reconcile`);
      toast.success("Financial transactions reconciled and live figures synchronized");
      loadProjectFinalAccount(selectedProjectId);
    } catch (err) {
      console.error("Reconcile error:", err);
      toast.error(err?.response?.data?.message || "Reconciliation failed");
    } finally {
      setSaving(false);
    }
  };

  // Retention Release Handlers
  const openNewReleaseModal = () => {
    setEditingRelease(null);
    const unreleased = calculations.outstandingRet;
    const defaultAmt = unreleased > 0 ? (unreleased * 0.5).toFixed(2) : "0.00";
    setReleaseForm({
      release_stage: "Initial Retention Release (Practical Completion)",
      release_percent: 50,
      release_amount: defaultAmt,
      expected_release_date: new Date().toISOString().slice(0, 10),
      actual_release_date: "",
      release_conditions: "Practical completion milestone achieved",
      release_status: "PENDING",
      payment_voucher_ref: "",
      remarks: "",
    });
    setReleaseModalOpen(true);
  };

  const openEditReleaseModal = (r) => {
    setEditingRelease(r);
    setReleaseForm({
      release_stage: r.release_stage || "",
      release_percent: r.release_percent || 0,
      release_amount: r.release_amount || 0,
      expected_release_date: r.expected_release_date ? String(r.expected_release_date).slice(0, 10) : "",
      actual_release_date: r.actual_release_date ? String(r.actual_release_date).slice(0, 10) : "",
      release_conditions: r.release_conditions || "",
      release_status: r.release_status || "PENDING",
      payment_voucher_ref: r.payment_voucher_ref || "",
      remarks: r.remarks || "",
    });
    setReleaseModalOpen(true);
  };

  const handleSaveRelease = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!finalAccount?.id) {
      toast.error("Please save the Final Account draft before configuring release milestones");
      return;
    }

    const relAmt = Number(releaseForm.release_amount || 0);
    if (relAmt <= 0) {
      toast.error("Please enter a valid release amount");
      return;
    }

    setSaving(true);
    try {
      if (editingRelease?.id) {
        await api.put(`/projects/final-accounts/${finalAccount.id}/releases/${editingRelease.id}`, releaseForm);
        toast.success("Retention release milestone updated");
      } else {
        await api.post(`/projects/final-accounts/${finalAccount.id}/releases`, releaseForm);
        toast.success("Retention release recorded successfully");
      }
      setReleaseModalOpen(false);
      loadProjectFinalAccount(selectedProjectId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to record release");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRelease = async (releaseId) => {
    if (!window.confirm("Are you sure you want to remove this retention release?")) return;
    try {
      await api.delete(`/projects/final-accounts/${finalAccount.id}/releases/${releaseId}`);
      toast.success("Release milestone removed");
      loadProjectFinalAccount(selectedProjectId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete release");
    }
  };

  // Adjustment Handlers
  const openNewAdjustmentModal = () => {
    setEditingAdjustment(null);
    setAdjustmentForm({
      adjustment_type: "ADDITIONAL_CHARGES",
      description: "",
      amount: "",
      reason_justification: "",
      submitted_by: "",
      reviewed_status: "PENDING",
      adjustment_date: new Date().toISOString().slice(0, 10),
      remarks: "",
    });
    setAdjustmentModalOpen(true);
  };

  const openEditAdjustmentModal = (adj) => {
    setEditingAdjustment(adj);
    setAdjustmentForm({
      adjustment_type: adj.adjustment_type || "OTHER",
      description: adj.description || "",
      amount: adj.amount || "",
      reason_justification: adj.reason_justification || "",
      submitted_by: adj.submitted_by || "",
      reviewed_status: adj.reviewed_status || "PENDING",
      adjustment_date: adj.adjustment_date ? String(adj.adjustment_date).slice(0, 10) : "",
      remarks: adj.remarks || "",
    });
    setAdjustmentModalOpen(true);
  };

  const handleSaveAdjustment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!finalAccount?.id) {
      toast.error("Please save the Final Account draft first");
      return;
    }

    if (!adjustmentForm.description.trim()) {
      toast.error("Description is required");
      return;
    }

    setSaving(true);
    try {
      if (editingAdjustment?.id) {
        await api.put(`/projects/final-accounts/${finalAccount.id}/adjustments/${editingAdjustment.id}`, adjustmentForm);
        toast.success("Adjustment updated successfully");
      } else {
        await api.post(`/projects/final-accounts/${finalAccount.id}/adjustments`, adjustmentForm);
        toast.success("Adjustment recorded successfully");
      }
      setAdjustmentModalOpen(false);
      loadProjectFinalAccount(selectedProjectId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save adjustment");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdjustment = async (adjId) => {
    if (!window.confirm("Are you sure you want to delete this adjustment?")) return;
    try {
      await api.delete(`/projects/final-accounts/${finalAccount.id}/adjustments/${adjId}`);
      toast.success("Adjustment removed");
      loadProjectFinalAccount(selectedProjectId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete adjustment");
    }
  };

  // Reconciliation Item Update
  const openReconcileModal = (item) => {
    setReconcileModalItem(item);
    setReconcileItemForm({
      reconciliation_status: item.reconciliation_status || "RECONCILED",
      approved_adjustments: Number(item.approved_adjustments || 0),
      discrepancy_notes: item.discrepancy_notes || "",
    });
  };

  const handleSaveReconcileItem = async () => {
    if (!finalAccount?.id || !reconcileModalItem?.id) return;
    try {
      await api.put(`/projects/final-accounts/${finalAccount.id}/reconciliation-items/${reconcileModalItem.id}`, reconcileItemForm);
      toast.success("Reconciliation line updated");
      setReconcileModalItem(null);
      loadProjectFinalAccount(selectedProjectId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update item");
    }
  };

  // Export Excel Report
  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Final Account Statement");

    sheet.addRow(["OMNISUITE ERP - FINAL ACCOUNT & RETENTION RELEASE STATEMENT"]);
    sheet.addRow([`Project Code: ${projectInfo?.project_code || "N/A"}`]);
    sheet.addRow([`Project Name: ${projectInfo?.project_name || "N/A"}`]);
    sheet.addRow([`Client / Project Owner: ${projectInfo?.client_name || "N/A"}`]);
    sheet.addRow([`Contract Ref: ${projectInfo?.contract_ref_no || "N/A"}`]);
    sheet.addRow([`Statement Date: ${faForm.final_account_date || new Date().toISOString().slice(0, 10)}`]);
    sheet.addRow([`Currency: ${faForm.currency}`]);
    sheet.addRow([]);

    sheet.addRow(["FINANCIAL BREAKDOWN", "AMOUNT (" + faForm.currency + ")"]);
    sheet.addRow(["Original Contract Value", faForm.original_contract_value]);
    sheet.addRow(["Approved Variations / Change Orders", faForm.approved_variations_value]);
    sheet.addRow(["Revised Contract Value", calculations.revisedContract]);
    sheet.addRow(["Additional Approved Charges", calculations.addCharges]);
    sheet.addRow(["Approved Deductions / Omissions", calculations.dedVal]);
    sheet.addRow(["FINAL ACCOUNT VALUE", calculations.finalAccountVal]);
    sheet.addRow(["Total Amount Invoiced", faForm.total_invoiced]);
    sheet.addRow(["Total Amount Paid", faForm.total_paid]);
    sheet.addRow(["Outstanding Receivable", calculations.outstandingRec]);
    sheet.addRow(["Outstanding Payable", faForm.outstanding_payable]);
    sheet.addRow([]);

    sheet.addRow(["RETENTION POSITION", ""]);
    sheet.addRow(["Retention Applicable", faForm.retention_applicable ? "YES" : "NO"]);
    sheet.addRow(["Retention Percentage", `${faForm.retention_percent}%`]);
    sheet.addRow(["Total Retention Held", calculations.totalRet]);
    sheet.addRow(["Retention Released to Date", calculations.prevReleased]);
    sheet.addRow(["Remaining Retention Balance", calculations.outstandingRet]);
    sheet.addRow(["Final Settlement Status", faForm.final_settlement_status]);

    sheet.getRow(1).font = { bold: true, size: 14 };
    sheet.getRow(9).font = { bold: true };
    sheet.getRow(15).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Final_Account_${projectInfo?.project_code || "Statement"}_${faForm.final_account_date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel statement exported successfully");
  };

  // Export PDF Statement
  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(14, 54, 70);
    doc.text("OMNISUITE ERP - FINAL ACCOUNT STATEMENT", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Project: ${projectInfo?.project_code || ""} - ${projectInfo?.project_name || ""}`, 14, 28);
    doc.text(`Client / Sponsor: ${projectInfo?.client_name || "N/A"} | Date: ${faForm.final_account_date || ""}`, 14, 34);
    doc.text(`Currency: ${faForm.currency} | Settlement Status: ${faForm.final_settlement_status}`, 14, 40);

    autoTable(doc, {
      startY: 46,
      head: [["Financial Component", "Amount (" + faForm.currency + ")"]],
      body: [
        ["Original Contract / Project Scope Value", Number(faForm.original_contract_value).toFixed(2)],
        ["Approved Variations / Change Orders", Number(faForm.approved_variations_value).toFixed(2)],
        ["Revised Contract Value (Original + Variations)", Number(calculations.revisedContract).toFixed(2)],
        ["Additional Approved Charges / Claims", Number(calculations.addCharges).toFixed(2)],
        ["Approved Deductions / Omissions", `(${Number(calculations.dedVal).toFixed(2)})`],
        ["FINAL ACCOUNT VALUE", Number(calculations.finalAccountVal).toFixed(2)],
        ["Total Amount Invoiced", Number(faForm.total_invoiced).toFixed(2)],
        ["Total Amount Received / Paid", Number(faForm.total_paid).toFixed(2)],
        ["Outstanding Amount Receivable", Number(calculations.outstandingRec).toFixed(2)],
        ["Total Retention Amount", Number(calculations.totalRet).toFixed(2)],
        ["Retention Released to Date", Number(calculations.prevReleased).toFixed(2)],
        ["Outstanding Retention Balance", Number(calculations.outstandingRet).toFixed(2)],
      ],
      theme: "striped",
      headStyles: { fillColor: [14, 54, 70], textColor: [255, 255, 255], fontStyle: "bold" },
    });

    doc.save(`Final_Account_${projectInfo?.project_code || "Statement"}.pdf`);
    toast.success("PDF statement downloaded");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/project-management"
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Scale size={24} className="text-brand-900 dark:text-brand-400" /> Final Account & Retention Release
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 hidden">
              Reconcile final project accounts, manage retention balances, track releases and final financial settlement
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleReconcile}
            disabled={saving || !selectedProjectId}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-sm font-semibold shadow-sm hover:border-brand-500"
            title="Auto-synchronize and recalculate live source figures from ERP"
          >
            <RefreshCw size={14} className={saving ? "animate-spin" : "text-brand-600"} /> Reconcile Account
          </button>
          <button
            type="button"
            onClick={exportExcel}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-sm font-semibold shadow-sm"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" /> Export Excel
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-sm font-semibold shadow-sm"
          >
            <Download size={14} className="text-rose-600" /> Export PDF
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-sm font-semibold shadow-sm"
          >
            <Printer size={14} /> Print
          </button>
          {finalAccount?.id && (
            <button
              type="button"
              onClick={() => setAttachmentsModalOpen(true)}
              className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              title="Supporting documents & attachments"
            >
              <Paperclip size={14} /> Attachments
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSaveFinalAccount(faForm.status)}
            disabled={saving || !selectedProjectId}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs font-semibold shadow-sm"
          >
            <Check size={14} /> {finalAccount ? "Update Final Account" : "Save as Draft"}
          </button>
        </div>
      </div>

      {/* Project Selector & Information Banner */}
      <div className="card p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Select Active Project <span className="text-red-500">*</span>
            </label>
            <select
              className="input text-sm w-full font-semibold text-slate-900 dark:text-slate-100"
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              disabled={loadingProjects}
            >
              <option value="">-- Choose Project to Reconcile --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code ? `${p.project_code} - ` : ""}
                  {p.project_name} {p.project_status ? `(${p.project_status})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Final Account Statement Reference
            </label>
            <input
              type="text"
              readOnly
              className="input text-sm w-full bg-slate-50 dark:bg-slate-800/60 font-mono font-semibold text-brand-900 dark:text-brand-300"
              value={finalAccount?.reference_no || `[Auto-Generated upon creation]`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Statement / Agreement Date
            </label>
            <input
              type="date"
              className="input text-sm w-full"
              value={faForm.final_account_date}
              onChange={(e) => setFaForm((prev) => ({ ...prev, final_account_date: e.target.value }))}
            />
          </div>
        </div>

        {/* Read-only Project Metadata Row */}
        {projectInfo && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Client / Owner:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{projectInfo.client_name}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Project Manager:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{projectInfo.manager_name}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Contract Ref:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{projectInfo.contract_ref_no}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Project Type:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">{projectInfo.project_type}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Start / End:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {projectInfo.start_date || "—"} / {projectInfo.actual_end_date || projectInfo.end_date || "—"}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Financial Status:</span>
              <p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  finalAccount?.status === "AGREED"
                    ? "bg-emerald-100 text-emerald-800"
                    : finalAccount?.status === "RECONCILED"
                    ? "bg-sky-100 text-sky-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {finalAccount?.status || "DRAFT"}
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* If No Project Selected, Show Clean Empty State */}
      {!selectedProjectId ? (
        <div className="card p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
            <Scale size={28} />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              No Project Selected
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Please choose a project from the dropdown above to view its Final Account statement, configure retention policies, and manage release milestones.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 6 Canonical Dashboard KPI Cards */}
          <MobileMovingCarousel data-page-carousel gridColsClass="grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6" gapClass="gap-4">
          {[
              {
                label: "Revised Contract",
                val: `${faForm.currency} ${Number(calculations.revisedContract).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: `Orig: ${Number(faForm.original_contract_value).toLocaleString()}`,
                icon: <FileText size={20} className="stroke-[2.5]" />,
                color: "bg-brand-900 dark:bg-brand-700 text-white",
              },
              {
                label: "Final Account Value",
                val: `${faForm.currency} ${Number(calculations.finalAccountVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: `Net: ${Number(calculations.finalAccountVal).toLocaleString()}`,
                icon: <Scale size={20} className="stroke-[2.5]" />,
                color: "bg-sky-600 dark:bg-sky-500 text-white",
              },
              {
                label: "Total Invoiced",
                val: `${faForm.currency} ${Number(faForm.total_invoiced).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: `${((Number(faForm.total_invoiced) / (calculations.finalAccountVal || 1)) * 100).toFixed(0)}% of Final Val`,
                icon: <FileText size={20} className="stroke-[2.5]" />,
                color: "bg-indigo-600 dark:bg-indigo-500 text-white",
              },
              {
                label: "Total Paid",
                val: `${faForm.currency} ${Number(faForm.total_paid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: `${((Number(faForm.total_paid) / (calculations.finalAccountVal || 1)) * 100).toFixed(0)}% Collected`,
                icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
                color: "bg-emerald-600 text-white",
              },
              {
                label: "Outstanding Receivable",
                val: `${faForm.currency} ${Number(calculations.outstandingRec).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: calculations.outstandingRec > 0 ? "Pending collection" : "Fully settled",
                icon: <AlertCircle size={20} className="stroke-[2.5]" />,
                color: "bg-amber-500 text-white",
              },
              {
                label: "Retention Balance",
                val: `${faForm.currency} ${Number(calculations.outstandingRet).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                sub: `Released: ${Number(calculations.prevReleased).toLocaleString()}`,
                icon: <Clock3 size={20} className="stroke-[2.5]" />,
                color: "bg-purple-600 text-white",
              },
            ].map((card, i) => (
              <div
                key={i}
                className="card p-6 min-h-[160px] flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-smoky-card hover:shadow-smoky-lg transition-all"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                    {card.val}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
                </div>
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md shrink-0 ${card.color}`}>
                  {card.icon}
                </div>
              </div>
            ))}
        </MobileMovingCarousel>

          {/* Concise Tabs Navigation */}
          <div className="border-b border-slate-200 dark:border-slate-800 flex overflow-x-auto gap-2 text-xs font-semibold">
            {[
              { key: "summary", label: "Final Account Statement", icon: Scale },
              { key: "retention", label: `Retention & Releases (${releases.length})`, icon: Clock3 },
              { key: "adjustments", label: `Claims & Adjustments (${adjustments.length})`, icon: AlertTriangle },
              { key: "reconciliation", label: "Financial Reconciliation", icon: RefreshCw },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={`pb-3 px-3 flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? "border-brand-600 text-brand-600 dark:text-brand-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon size={15} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

      {/* ============================================================ */}
      {/* TAB 1: FINAL ACCOUNT SUMMARY */}
      {/* ============================================================ */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Card: Value Breakdown */}
            <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b pb-2 dark:border-slate-800">
                <Scale size={16} className="text-brand-600" /> Contract & Final Account Calculation Breakdown
              </h3>

              <div className="space-y-3 text-xs">
                {/* 1. Original Contract Value */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Original Contract / Project Scope Value</span>
                    <p className="text-[11px] text-slate-400">Baseline approved contract value or budget allocation</p>
                  </div>
                  <div className="w-48">
                    <input
                      type="number"
                      step="0.01"
                      className="input text-sm w-full text-right font-mono"
                      value={faForm.original_contract_value}
                      onChange={(e) => setFaForm((prev) => ({ ...prev, original_contract_value: e.target.value }))}
                    />
                  </div>
                </div>

                {/* 2. Approved Variations */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Approved Variations / Change Orders</span>
                    <p className="text-[11px] text-slate-400">Sum of all approved variations from Change Order management</p>
                  </div>
                  <div className="w-48">
                    <input
                      type="number"
                      step="0.01"
                      className="input text-sm w-full text-right font-mono text-emerald-600 font-semibold"
                      value={faForm.approved_variations_value}
                      onChange={(e) => setFaForm((prev) => ({ ...prev, approved_variations_value: e.target.value }))}
                    />
                  </div>
                </div>

                {/* 3. Revised Contract Value */}
                <div className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 font-bold border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-800 dark:text-slate-200">Revised Contract / Project Value</span>
                  <span className="text-right font-mono text-brand-900 dark:text-brand-300">
                    {faForm.currency} {Number(calculations.revisedContract).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* 4. Additional Approved Charges */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Additional Approved Charges</span>
                    <p className="text-[11px] text-slate-400">Approved site compensation, extension of time, additional tests</p>
                  </div>
                  <div className="w-48">
                    <input
                      type="number"
                      step="0.01"
                      className="input text-sm w-full text-right font-mono"
                      value={faForm.additional_approved_charges}
                      onChange={(e) => setFaForm((prev) => ({ ...prev, additional_approved_charges: e.target.value }))}
                    />
                  </div>
                </div>

                {/* 5. Approved Deductions */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Approved Deductions & Penalties</span>
                    <p className="text-[11px] text-slate-400">Scope omissions, counter-claims, performance penalties</p>
                  </div>
                  <div className="w-48">
                    <input
                      type="number"
                      step="0.01"
                      className="input text-sm w-full text-right font-mono text-rose-600"
                      value={faForm.approved_deductions}
                      onChange={(e) => setFaForm((prev) => ({ ...prev, approved_deductions: e.target.value }))}
                    />
                  </div>
                </div>

                {/* 6. FINAL ACCOUNT VALUE */}
                <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-900 font-extrabold text-sm">
                  <span className="text-brand-900 dark:text-brand-200">FINAL ACCOUNT VALUE</span>
                  <span className="text-right font-mono text-brand-900 dark:text-brand-300 text-base">
                    {faForm.currency} {Number(calculations.finalAccountVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Card: Collections & Reconciliation Position */}
            <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 border-b pb-2 dark:border-slate-800">
                <DollarSign size={16} className="text-emerald-600" /> Billing, Receipts & Outstanding Financial Obligations
              </h3>

              <div className="space-y-3 text-xs">
                {/* Total Invoiced */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Total Amount Previously Invoiced</span>
                    <p className="text-[11px] text-slate-400">Sum of approved project sales invoices issued to client</p>
                  </div>
                  <div className="w-48">
                    <input
                      type="number"
                      step="0.01"
                      className="input text-sm w-full text-right font-mono"
                      value={faForm.total_invoiced}
                      onChange={(e) => setFaForm((prev) => ({ ...prev, total_invoiced: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Total Paid */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Total Amount Previously Paid / Received</span>
                    <p className="text-[11px] text-slate-400">Actual collections receipted from client into bank/cash accounts</p>
                  </div>
                  <div className="w-48">
                    <input
                      type="number"
                      step="0.01"
                      className="input text-sm w-full text-right font-mono font-semibold text-emerald-600"
                      value={faForm.total_paid}
                      onChange={(e) => setFaForm((prev) => ({ ...prev, total_paid: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Outstanding Receivable */}
                <div className="flex items-center justify-between gap-4 p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 font-bold border border-amber-200 dark:border-amber-900/60">
                  <span className="text-amber-900 dark:text-amber-300">Outstanding Receivable Balance</span>
                  <span className="text-right font-mono text-amber-900 dark:text-amber-200 text-sm">
                    {faForm.currency} {Number(calculations.outstandingRec).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Outstanding Payable */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Outstanding Project Payables / Commitments</span>
                    <p className="text-[11px] text-slate-400">Outstanding subcontractor and supplier liabilities for this project</p>
                  </div>
                  <div className="w-48">
                    <input
                      type="number"
                      step="0.01"
                      className="input text-sm w-full text-right font-mono"
                      value={faForm.outstanding_payable}
                      onChange={(e) => setFaForm((prev) => ({ ...prev, outstanding_payable: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Client Agreement Sign-Off */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Agreed by Client / Sponsor
                      </label>
                      <input
                        type="text"
                        placeholder="Representative name & designation"
                        className="input text-sm w-full"
                        value={faForm.agreed_by_client}
                        onChange={(e) => setFaForm((prev) => ({ ...prev, agreed_by_client: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Client Agreement Date
                      </label>
                      <input
                        type="date"
                        className="input text-sm w-full"
                        value={faForm.agreed_client_date}
                        onChange={(e) => setFaForm((prev) => ({ ...prev, agreed_client_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Reconciled By
                      </label>
                      <input
                        type="text"
                        placeholder="Lead Project Accountant / QS"
                        className="input text-sm w-full"
                        value={faForm.reconciled_by}
                        onChange={(e) => setFaForm((prev) => ({ ...prev, reconciled_by: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Reconciliation Date
                      </label>
                      <input
                        type="date"
                        className="input text-sm w-full"
                        value={faForm.reconciled_date}
                        onChange={(e) => setFaForm((prev) => ({ ...prev, reconciled_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Final Settlement & Discharge Sign-Off */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Final Settlement Status
                        </label>
                        <select
                          className="input text-sm w-full font-semibold"
                          value={faForm.final_settlement_status}
                          onChange={(e) => setFaForm((prev) => ({ ...prev, final_settlement_status: e.target.value }))}
                        >
                          {SETTLEMENT_STATUSES.map((st) => (
                            <option key={st.value} value={st.value}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Settlement Agreement / Banking Ref
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. SETTLE-REF-2026-089"
                          className="input text-sm w-full"
                          value={faForm.settlement_reference}
                          onChange={(e) => setFaForm((prev) => ({ ...prev, settlement_reference: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Settlement & Discharge Remarks
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Document final waivers, full and final discharge declarations, retention payout certificates..."
                        className="input text-sm w-full"
                        value={faForm.settlement_remarks}
                        onChange={(e) => setFaForm((prev) => ({ ...prev, settlement_remarks: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: FINANCIAL RECONCILIATION */}
      {/* ============================================================ */}
      {activeTab === "reconciliation" && (
        <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <RefreshCw size={16} className="text-brand-600" /> Source Transaction Reconciliation Register
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Full audit reconciliation linking contract values, change orders, billing invoices, and verified receipts
              </p>
            </div>
            <button
              type="button"
              onClick={handleReconcile}
              disabled={saving}
              className="btn btn-secondary text-sm inline-flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw size={13} className={saving ? "animate-spin" : ""} /> Sync Source Transactions
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-600 dark:text-slate-300 border-b dark:border-slate-800">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Reference</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Original Amount</th>
                  <th className="p-3 text-right">Adjustments</th>
                  <th className="p-3 text-right">Final Amount</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-right">Balance</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reconciliations.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400">
                      No reconciliation transactions recorded yet. Click "Sync Source Transactions" or "Reconcile Account" to automatically populate.
                    </td>
                  </tr>
                ) : (
                  reconciliations.map((item) => {
                    const st = RECONCILIATION_STATUSES.find((s) => s.value === item.reconciliation_status) || RECONCILIATION_STATUSES[1];
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {item.transaction_date ? String(item.transaction_date).slice(0, 10) : "—"}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {item.transaction_reference}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold">
                            {item.transaction_type}
                          </span>
                        </td>
                        <td className="p-3 max-w-xs truncate text-slate-700 dark:text-slate-300" title={item.description}>
                          {item.description}
                          {item.discrepancy_notes && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                              Note: {item.discrepancy_notes}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {Number(item.original_amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-500">
                          {Number(item.approved_adjustments).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {Number(item.final_amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-600">
                          {Number(item.amount_paid).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-amber-600">
                          {Number(item.outstanding_balance).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => openReconcileModal(item)}
                            className="text-brand-600 hover:text-brand-700 text-xs font-semibold hover:underline"
                          >
                            Reconcile
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: RETENTION & RELEASES */}
      {/* ============================================================ */}
      {activeTab === "retention" && (
        <div className="space-y-6">
          <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-6">
            <div className="border-b pb-3 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock size={18} className="text-purple-600" /> Retention Terms & Policy Configuration
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure whether retention applies, the calculation base, percentage deductions, and conditions for release
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Retention Applicable?</label>
                <input
                  type="checkbox"
                  className="toggle-checkbox"
                  checked={faForm.retention_applicable === 1}
                  onChange={(e) => setFaForm((prev) => ({ ...prev, retention_applicable: e.target.checked ? 1 : 0 }))}
                />
              </div>
            </div>

            {faForm.retention_applicable === 1 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Retention Calculation Basis <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input text-sm w-full"
                      value={faForm.retention_basis}
                      onChange={(e) => setFaForm((prev) => ({ ...prev, retention_basis: e.target.value }))}
                    >
                      {RETENTION_BASIS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Retention Percentage (%) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="input text-sm w-full"
                      value={faForm.retention_percent}
                      onChange={(e) => setFaForm((prev) => ({ ...prev, retention_percent: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Calculation Base Amount ({faForm.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input text-sm w-full font-mono"
                      value={calculations.retBase}
                      onChange={(e) => setFaForm((prev) => ({ ...prev, retention_calculation_base: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Retention Summary Ribbon */}
                <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Total Retention Deducted / Held</span>
                    <p className="text-xl font-extrabold text-purple-900 dark:text-purple-200 font-mono mt-0.5">
                      {faForm.currency} {Number(calculations.totalRet).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Retention Released to Date</span>
                    <p className="text-xl font-extrabold text-emerald-600 font-mono mt-0.5">
                      {faForm.currency} {Number(calculations.prevReleased).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Outstanding Retention Balance</span>
                    <p className="text-xl font-extrabold text-amber-600 font-mono mt-0.5">
                      {faForm.currency} {Number(calculations.outstandingRet).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Conditions & Remarks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contractual Release Conditions & Triggers
                    </label>
                    <textarea
                      rows={2}
                      className="input text-sm w-full"
                      placeholder="e.g. 50% upon Practical Completion Certificate issuance; 50% upon Final Completion / Defects Liability Period expiry..."
                      value={faForm.retention_release_conditions}
                      onChange={(e) => setFaForm((prev) => ({ ...prev, retention_release_conditions: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Retention Administration Remarks / Notes
                    </label>
                    <textarea
                      rows={2}
                      className="input text-sm w-full"
                      placeholder="Specific bank guarantee in lieu of retention, interest stipulations, escrow details..."
                      value={faForm.retention_remarks}
                      onChange={(e) => setFaForm((prev) => ({ ...prev, retention_remarks: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                <Clock size={32} className="mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">Retention is not applicable to this project.</p>
                <p className="text-xs mt-1">Check the toggle above if this project requires retention deductions and scheduled release milestones.</p>
              </div>
            )}
          </div>

          {/* Retention Release Milestones & Execution Schedule Table */}
          {faForm.retention_applicable === 1 && (
            <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden space-y-0">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Clock3 size={16} className="text-purple-600" /> Retention Release Milestones & Execution Schedule
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Plan and record partial or milestone-based retention disbursements against available retention fund
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewReleaseModal}
                  className="btn btn-primary text-sm inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} /> Record Retention Release
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-600 dark:text-slate-300 border-b dark:border-slate-800">
                    <tr>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Release Stage</th>
                      <th className="p-3 text-right">Share (%)</th>
                      <th className="p-3 text-right">Release Amount</th>
                      <th className="p-3">Expected Date</th>
                      <th className="p-3">Actual Release Date</th>
                      <th className="p-3">Payment Voucher Ref</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {releases.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          No retention release milestones recorded yet. Click "Record Retention Release" to configure.
                        </td>
                      </tr>
                    ) : (
                      releases.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {r.release_reference}
                          </td>
                          <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                            {r.release_stage}
                            {r.release_conditions && (
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">{r.release_conditions}</p>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-500">
                            {Number(r.release_percent || 0).toFixed(1)}%
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-600">
                            {faForm.currency} {Number(r.release_amount).toFixed(2)}
                          </td>
                          <td className="p-3 text-slate-500">
                            {r.expected_release_date ? String(r.expected_release_date).slice(0, 10) : "—"}
                          </td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">
                            {r.actual_release_date ? String(r.actual_release_date).slice(0, 10) : "—"}
                          </td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                            {r.payment_voucher_ref || "—"}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.release_status === "RELEASED"
                                ? "bg-emerald-100 text-emerald-800"
                                : r.release_status === "DUE"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {r.release_status}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditReleaseModal(r)}
                                className="p-1 text-slate-500 hover:text-brand-600"
                                title="Edit release milestone"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRelease(r.id)}
                                className="p-1 text-slate-500 hover:text-rose-600"
                                title="Delete release milestone"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: CLAIMS, DEDUCTIONS & ADJUSTMENTS */}
      {/* ============================================================ */}
      {activeTab === "adjustments" && (
        <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600" /> Claims, Deductions & Financial Adjustments Register
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Record and audit financial additions, claims, delay penalties, and omissions affecting the final project value
              </p>
            </div>
            <button
              type="button"
              onClick={openNewAdjustmentModal}
              className="btn btn-primary text-sm inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} /> Record New Adjustment
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase font-semibold text-slate-600 dark:text-slate-300 border-b dark:border-slate-800">
                <tr>
                  <th className="p-3">Ref</th>
                  <th className="p-3">Adjustment Type</th>
                  <th className="p-3">Description & Justification</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Submitted By</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Reviewed By</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No claims or financial adjustments recorded yet.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((a) => {
                    const typeCfg = ADJUSTMENT_TYPES.find((t) => t.value === a.adjustment_type);
                    const isAdd = typeCfg?.impact === "ADD";
                    const isDeduct = typeCfg?.impact === "DEDUCT";
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {a.adjustment_reference}
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                          {typeCfg?.label || a.adjustment_type}
                        </td>
                        <td className="p-3 max-w-xs text-slate-600 dark:text-slate-300">
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{a.description}</p>
                          {a.reason_justification && (
                            <p className="text-[11px] text-slate-400 truncate">{a.reason_justification}</p>
                          )}
                        </td>
                        <td className={`p-3 text-right font-mono font-bold ${
                          isAdd ? "text-emerald-600" : isDeduct ? "text-rose-600" : "text-slate-800"
                        }`}>
                          {isDeduct ? `(${Number(a.amount).toFixed(2)})` : Number(a.amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {a.adjustment_date ? String(a.adjustment_date).slice(0, 10) : "—"}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {a.submitted_by || "—"}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.reviewed_status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : a.reviewed_status === "REJECTED"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {a.reviewed_status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">
                          {a.reviewed_by || "—"}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditAdjustmentModal(a)}
                              className="p-1 text-slate-500 hover:text-brand-600"
                              title="Review / Edit adjustment"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAdjustment(a.id)}
                              className="p-1 text-slate-500 hover:text-rose-600"
                              title="Delete adjustment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

        </>
      )}

      {/* ============================================================ */}
      {/* MODAL: RECORD RETENTION RELEASE */}
      {/* ============================================================ */}
      {releaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock3 size={18} className="text-purple-600" />
                {editingRelease ? "Edit Retention Release Milestone" : "Record Retention Release"}
              </h3>
              <button
                type="button"
                onClick={() => setReleaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRelease} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Release Stage / Milestone <span className="text-red-500">*</span>
                </label>
                <select
                  className="input text-sm w-full"
                  value={releaseForm.release_stage}
                  onChange={(e) => setReleaseForm((prev) => ({ ...prev, release_stage: e.target.value }))}
                >
                  {RELEASE_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Release Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="input text-sm w-full"
                    value={releaseForm.release_percent}
                    onChange={(e) => {
                      const pct = Number(e.target.value);
                      const amt = ((calculations.totalRet * pct) / 100).toFixed(2);
                      setReleaseForm((prev) => ({ ...prev, release_percent: e.target.value, release_amount: amt }));
                    }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Release Amount ({faForm.currency}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-sm w-full font-mono font-semibold"
                    value={releaseForm.release_amount}
                    onChange={(e) => setReleaseForm((prev) => ({ ...prev, release_amount: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Release Date
                  </label>
                  <input
                    type="date"
                    className="input text-sm w-full"
                    value={releaseForm.expected_release_date}
                    onChange={(e) => setReleaseForm((prev) => ({ ...prev, expected_release_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Actual Release Date
                  </label>
                  <input
                    type="date"
                    className="input text-sm w-full"
                    value={releaseForm.actual_release_date}
                    onChange={(e) => setReleaseForm((prev) => ({ ...prev, actual_release_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Release Status
                  </label>
                  <select
                    className="input text-sm w-full"
                    value={releaseForm.release_status}
                    onChange={(e) => setReleaseForm((prev) => ({ ...prev, release_status: e.target.value }))}
                  >
                    <option value="PENDING">Pending Approval</option>
                    <option value="DUE">Due for Release</option>
                    <option value="RELEASED">Released / Paid</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Voucher Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PV-2026-0044"
                    className="input text-sm w-full"
                    value={releaseForm.payment_voucher_ref}
                    onChange={(e) => setReleaseForm((prev) => ({ ...prev, payment_voucher_ref: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Conditions & Milestones Required for Release
                </label>
                <textarea
                  rows={2}
                  className="input text-sm w-full"
                  placeholder="e.g. Issuance of Practical Completion Certificate; As-built drawings handover..."
                  value={releaseForm.release_conditions}
                  onChange={(e) => setReleaseForm((prev) => ({ ...prev, release_conditions: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReleaseModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary text-sm font-semibold"
                >
                  {saving ? "Saving..." : editingRelease ? "Save Milestone" : "Record Release"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADD / EDIT ADJUSTMENT */}
      {/* ============================================================ */}
      {adjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-600" />
                {editingAdjustment ? "Edit Claim / Adjustment" : "Record New Financial Adjustment"}
              </h3>
              <button
                type="button"
                onClick={() => setAdjustmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Adjustment Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input text-sm w-full"
                    value={adjustmentForm.adjustment_type}
                    onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, adjustment_type: e.target.value }))}
                  >
                    {ADJUSTMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Adjustment Amount ({faForm.currency}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input text-sm w-full font-mono font-semibold"
                    value={adjustmentForm.amount}
                    onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Liquidated damages for 5 days unexcused delay"
                  className="input text-sm w-full"
                  value={adjustmentForm.description}
                  onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Technical Justification
                </label>
                <textarea
                  rows={2}
                  className="input text-sm w-full"
                  placeholder="Clause reference, contractual agreement, engineer instruction..."
                  value={adjustmentForm.reason_justification}
                  onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, reason_justification: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Submitted By
                  </label>
                  <input
                    type="text"
                    placeholder="Engineer / QS / Project Manager"
                    className="input text-sm w-full"
                    value={adjustmentForm.submitted_by}
                    onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, submitted_by: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Review / Approval Status
                  </label>
                  <select
                    className="input text-sm w-full font-semibold"
                    value={adjustmentForm.reviewed_status}
                    onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, reviewed_status: e.target.value }))}
                  >
                    <option value="PENDING">Pending Review</option>
                    <option value="APPROVED">Approved (Affects Final Account)</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustmentModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary text-sm font-semibold"
                >
                  {saving ? "Saving..." : editingAdjustment ? "Save Adjustment" : "Record Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: RECONCILE TRANSACTION ITEM */}
      {/* ============================================================ */}
      {reconcileModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw size={18} className="text-brand-600" />
                Reconcile: {reconcileModalItem.transaction_reference}
              </h3>
              <button
                type="button"
                onClick={() => setReconcileModalItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-1">
                <p className="font-medium text-slate-800 dark:text-slate-200">{reconcileModalItem.description}</p>
                <p className="text-slate-500">Original Amount: {faForm.currency} {Number(reconcileModalItem.original_amount).toFixed(2)}</p>
                <p className="text-slate-500">Amount Paid: {faForm.currency} {Number(reconcileModalItem.amount_paid).toFixed(2)}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reconciliation Status
                </label>
                <select
                  className="input text-sm w-full font-semibold"
                  value={reconcileItemForm.reconciliation_status}
                  onChange={(e) => setReconcileItemForm((prev) => ({ ...prev, reconciliation_status: e.target.value }))}
                >
                  {RECONCILIATION_STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Approved Reconciliation Adjustment
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input text-sm w-full font-mono"
                  value={reconcileItemForm.approved_adjustments}
                  onChange={(e) => setReconcileItemForm((prev) => ({ ...prev, approved_adjustments: e.target.value }))}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Audit / Discrepancy Remarks
                </label>
                <textarea
                  rows={3}
                  className="input text-sm w-full"
                  placeholder="Explain reconciliation findings or adjustments..."
                  value={reconcileItemForm.discrepancy_notes}
                  onChange={(e) => setReconcileItemForm((prev) => ({ ...prev, discrepancy_notes: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReconcileModalItem(null)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveReconcileItem}
                  className="btn btn-primary text-sm font-semibold"
                >
                  Update Line
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attachments Modal */}
      {attachmentsModalOpen && finalAccount?.id && (
        <DocumentAttachmentsModal
          open={attachmentsModalOpen}
          docType="project_final_account"
          docId={finalAccount.id}
          onClose={() => setAttachmentsModalOpen(false)}
        />
      )}
    </div>
  );
}
