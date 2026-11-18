/**
 * @file PettyCashPage.jsx
 * @description Enterprise Petty Cash Book component for OmniSuite ERP Finance module.
 * Provides a controlled petty cash disbursement register, dual confirmation,
 * automatic Payment Voucher & General Ledger posting, Contra Voucher funding synchronization,
 * and comprehensive financial reports & GL reconciliation.
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  RefreshCw,
  Settings,
  Plus,
  Filter,
  Search,
  FileSpreadsheet,
  Printer,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Paperclip,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Building,
  UploadCloud,
  X,
  FileText,
  UserCheck,
  Sliders,
  DollarSign,
  AlertCircle,
  BadgeCheck,
  FileSignature,
  TrendingUp,
  Receipt,
  Users,
} from "lucide-react";
import { api } from "@/api/client.js";
import { usePermission } from "@/auth/PermissionContext.jsx";
import { useAuth } from "@/auth/AuthContext.jsx";

function formatMoney(amount) {
  const num = Number(amount || 0);
  return `GH₵ ${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PettyCashPage() {
  const { user } = useAuth();
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "ledger";

  // Tab State: 'ledger' | 'disburse' | 'funding' | 'reports' | 'setup'
  const [activeTab, setActiveTab] = useState(initialTab);

  // Data States
  const [loading, setLoading] = useState(true);
  const [syncingFunding, setSyncingFunding] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("ALL");
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 1 });
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Filter States for Ledger
  const [filterType, setFilterType] = useState("DISBURSEMENT");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterExpenseAcc, setFilterExpenseAcc] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [selectedTx, setSelectedTx] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // New Attachment upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Reports Sub-tab
  const [reportType, setReportType] = useState("STATEMENT");
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Disbursement Form State
  const [disburseForm, setDisburseForm] = useState({
    petty_cash_account_id: "",
    transaction_date: new Date().toISOString().slice(0, 10),
    recipient_name: "",
    department: "",
    description: "",
    expense_account_id: "",
    amount: "",
    project_id: "",
    cost_center_id: "",
    handover_confirmed: false,
    recipient_confirmed: false,
    custodian_name: "",
    recipient_confirm_name: "",
  });
  const [confirmSignName, setConfirmSignName] = useState("");
  const [expenseAccError, setExpenseAccError] = useState(false);
  const [amountError, setAmountError] = useState("");
  const [disbursementAttachments, setDisbursementAttachments] = useState([]);

  // Active account stats
  const activeAccount = useMemo(() => {
    if (selectedAccountId === "ALL") {
      return accounts[0] || null;
    }
    return accounts.find((a) => String(a.account_id) === String(selectedAccountId)) || accounts[0] || null;
  }, [accounts, selectedAccountId]);

  // Aggregate stats across all petty cash accounts
    const filteredEmployees = useMemo(() => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter((e) => {
      const name = `${e.first_name || ""} ${e.last_name || ""} ${e.full_name || ""}`.toLowerCase();
      const code = String(e.emp_code || "").toLowerCase();
      const dept = String(e.dept_name || "").toLowerCase();
      return name.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [employees, employeeSearch]);

  const handleSelectEmployee = (emp) => {
    const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.full_name || "";
    setDisburseForm((prev) => ({
      ...prev,
      recipient_name: name,
      department: emp.dept_name || prev.department || "",
    }));
    setShowEmployeeModal(false);
    setEmployeeSearch("");
  };

  const disbursementCount = useMemo(() => {
    return transactions.filter((t) => t.transaction_type === "DISBURSEMENT").length;
  }, [transactions]);

  const avgDisbursement = useMemo(() => {
    const disbursements = transactions.filter((t) => t.transaction_type === "DISBURSEMENT");
    if (!disbursements.length) return 0;
    const total = disbursements.reduce((sum, t) => sum + Number(t.credit || t.amount || 0), 0);
    return total / disbursements.length;
  }, [transactions]);

  const aggregateStats = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return {
        available: 0,
        funding: 0,
        disbursed: 0,
        pending: 0,
        gl_balance: 0,
        is_reconciled: true,
        low_balance: false,
      };
    }
    if (selectedAccountId !== "ALL" && activeAccount) {
      return {
        available: Number(activeAccount.available_balance || 0),
        funding: Number(activeAccount.total_funding || 0),
        disbursed: Number(activeAccount.total_disbursed || 0),
        pending: Number(activeAccount.count_pending || 0),
        gl_balance: Number(activeAccount.gl_balance || 0),
        is_reconciled: Boolean(activeAccount.is_reconciled),
        low_balance: Boolean(activeAccount.is_low_balance),
      };
    }
    return accounts.reduce(
      (acc, a) => {
        acc.available += Number(a.available_balance || 0);
        acc.funding += Number(a.total_funding || 0);
        acc.disbursed += Number(a.total_disbursed || 0);
        acc.pending += Number(a.count_pending || 0);
        acc.gl_balance += Number(a.gl_balance || 0);
        if (!a.is_reconciled) acc.is_reconciled = false;
        if (a.is_low_balance) acc.low_balance = true;
        return acc;
      },
      { available: 0, funding: 0, disbursed: 0, pending: 0, gl_balance: 0, is_reconciled: true, low_balance: false }
    );
  }, [accounts, selectedAccountId, activeAccount]);

  // Sync tab with URL
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  // Load basic dropdown options once
  useEffect(() => {
    async function loadOptions() {
      try {
        const [expRes, prjRes, ccRes, empRes, deptRes] = await Promise.all([
          api.get("/finance/expense-accounts").catch(() => api.get("/finance/accounts?nature=EXPENSE")),
          api.get("/projects/projects").catch(() => ({ data: [] })),
          api.get("/finance/cost-centers").catch(() => ({ data: [] })),
          api.get("/hr/employees?active=true").catch(() => ({ data: [] })),
          api.get("/admin/departments").catch(() => ({ data: [] })),
        ]);

        const expItems = expRes.data?.items || expRes.data?.data || (Array.isArray(expRes.data) ? expRes.data : []);
        const postableExp = expItems.filter((a) => a.is_postable !== 0);
        setExpenseAccounts(postableExp);

        // Auto-select configured Expense Account from Finance Setup or fallback to Imprest
        const configuredExpId = accounts[0]?.expense_account_id;
        const defaultImprest = postableExp.find((a) => {
          if (configuredExpId && String(a.id) === String(configuredExpId)) return true;
          const name = String(a.name || "").toLowerCase();
          const code = String(a.code || "").toLowerCase();
          return name.includes("imprest") || code.includes("imprest") || name === "imprest";
        });
        const expIdToUse = configuredExpId ? String(configuredExpId) : (defaultImprest ? String(defaultImprest.id) : "");
        if (expIdToUse) {
          setDisburseForm((prev) => ({
            ...prev,
            expense_account_id: prev.expense_account_id || expIdToUse,
          }));
        }

        // Active Projects from pm_projects
        const prjItems = prjRes.data?.items || prjRes.data?.data || (Array.isArray(prjRes.data) ? prjRes.data : []);
        const activeProjects = prjItems.filter(
          (p) => p.is_active === "Y" || p.is_active === 1 || p.is_active === true
        );
        setProjects(activeProjects);

        // Active Cost Centers from fin_cost_centers
        const ccItems = ccRes.data?.items || ccRes.data?.data || (Array.isArray(ccRes.data) ? ccRes.data : []);
        const activeCCs = ccItems.filter(
          (c) => c.is_active === 1 || c.is_active === true || c.is_active === "1" || c.is_active === "Y"
        );
        setCostCenters(activeCCs);

        // Active Departments from adm_departments
        const deptItems = deptRes.data?.items || deptRes.data?.data || (Array.isArray(deptRes.data) ? deptRes.data : []);
        const activeDepts = deptItems.filter(
          (d) => d.is_active === 1 || d.is_active === true || d.is_active === "1" || d.is_active === "Y"
        );
        // Deduplicate department names for clean select display
        const uniqueDepts = [];
        const seenDeptNames = new Set();
        for (const d of activeDepts) {
          if (!seenDeptNames.has(d.name)) {
            seenDeptNames.add(d.name);
            uniqueDepts.push(d);
          }
        }
        setDepartments(uniqueDepts);

        const empItems = empRes.data?.data || empRes.data?.employees || (Array.isArray(empRes.data) ? empRes.data : []);
        setEmployees(empItems);
      } catch (err) {
        console.error("Failed loading options:", err);
      }
    }
    loadOptions();
  }, []);

  // Fetch Accounts and Balances
  const loadAccounts = useCallback(async () => {
    try {
      const res = await api.get("/finance/petty-cash/accounts");
      const list = res.data?.data || [];
      setAccounts(list);

      // Auto-populate / by default select any cash account with account %like% "petty cash"
      const defaultPettyCash = list.find((a) => {
        const name = String(a.account_name || a.name || "").toLowerCase();
        const code = String(a.account_code || a.code || "").toLowerCase();
        return name.includes("petty cash") || code.includes("1023") || name.includes("petty");
      }) || list[0];

      if (defaultPettyCash) {
        const accIdStr = String(defaultPettyCash.account_id || defaultPettyCash.id);
        setDisburseForm((prev) => ({
          ...prev,
          petty_cash_account_id: prev.petty_cash_account_id || accIdStr,
        }));
        // Auto-select this account in the account scope dropdown if it was ALL
        setSelectedAccountId((prev) => (prev === "ALL" ? accIdStr : prev));
      }
    } catch (err) {
      console.error("Failed loading accounts:", err);
      toast.error("Failed to load petty cash accounts");
    }
  }, [disburseForm.petty_cash_account_id]);

  // Fetch Ledger Transactions
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        account_id: selectedAccountId !== "ALL" ? selectedAccountId : undefined,
        transaction_type: filterType !== "ALL" ? filterType : undefined,
        status: filterStatus !== "ALL" ? filterStatus : undefined,
        expense_account_id: filterExpenseAcc !== "ALL" ? filterExpenseAcc : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: searchTerm || undefined,
        page: pagination.page,
        limit: pagination.limit,
      };

      const res = await api.get("/finance/petty-cash/transactions", { params });
      setTransactions(res.data?.data || []);
      if (res.data?.pagination) {
        setPagination((prev) => ({ ...prev, ...res.data.pagination }));
      }
    } catch (err) {
      console.error("Failed loading transactions:", err);
      toast.error("Failed to load ledger transactions");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, filterType, filterStatus, filterExpenseAcc, startDate, endDate, searchTerm, pagination.page, pagination.limit]);

  // Initial load
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Sync Funding handler
  const handleSyncFunding = async () => {
    setSyncingFunding(true);
    try {
      await api.post("/finance/petty-cash/sync-funding");
      toast.success("Funding synchronized with Contra Vouchers.");
      await loadAccounts();
      await loadTransactions();
    } catch (err) {
      console.error("Funding sync failed:", err);
      toast.error("Failed to sync Contra Voucher funding");
    } finally {
      setSyncingFunding(false);
    }
  };

  // Live amount check against available balance
  const handleAmountChange = (e) => {
    const val = e.target.value;
    setDisburseForm({ ...disburseForm, amount: val });
    const num = Number(val);
    const targetAcc = accounts.find((a) => String(a.account_id) === String(disburseForm.petty_cash_account_id)) || activeAccount;
    const avail = targetAcc ? Number(targetAcc.available_balance || 0) : aggregateStats.available;

    if (num > avail) {
      setAmountError(`Exceeds available balance (${formatMoney(avail)})`);
    } else if (targetAcc && num > Number(targetAcc.max_single_disbursement || 5000)) {
      setAmountError(`Exceeds single limit (${formatMoney(targetAcc.max_single_disbursement)})`);
    } else {
      setAmountError("");
    }
  };

  // Submit Disbursement Form
  const handleSubmitDisbursement = async (e, forcePending = false) => {
    e.preventDefault();

    // 1. Mandatory Expense Account Validation
    if (!disburseForm.expense_account_id) {
      setExpenseAccError(true);
      toast.error("Please select an Expense Account before saving this petty cash disbursement.");
      // Scroll to expense account input
      const elem = document.getElementById("expense_account_select");
      if (elem) elem.focus();
      return;
    }
    setExpenseAccError(false);

    // 2. Validate Amount
    const numAmt = Number(disburseForm.amount);
    if (!numAmt || numAmt <= 0) {
      toast.error("Disbursement amount must be greater than zero.");
      return;
    }

    // 3. Validate Recipient & Description
    if (!disburseForm.recipient_name.trim()) {
      toast.error("Recipient / Employee Name is mandatory.");
      return;
    }
    if (!disburseForm.description.trim()) {
      toast.error("Description is mandatory.");
      return;
    }

    // 4. Validate Dual Agreement (typed full names)
    if (!forcePending) {
      if (!disburseForm.custodian_name?.trim()) {
        toast.error("Custodian must type their full name to confirm agreement to the transaction.");
        return;
      }
      if (!disburseForm.recipient_confirm_name?.trim()) {
        toast.error("Recipient must type their full name to confirm agreement to the transaction.");
        return;
      }
    }

    setSubmittingAction(true);
    try {
      const isHandoverSigned = Boolean(disburseForm.custodian_name?.trim());
      const isRecipientSigned = Boolean(disburseForm.recipient_confirm_name?.trim());

      const payload = {
        ...disburseForm,
        amount: numAmt,
        handover_confirmed: forcePending ? false : (Boolean(disburseForm.handover_confirmed) || isHandoverSigned),
        recipient_confirmed: forcePending ? false : (Boolean(disburseForm.recipient_confirmed) || isRecipientSigned),
        custodian_name: disburseForm.custodian_name?.trim() || "",
        recipient_confirm_name: disburseForm.recipient_confirm_name?.trim() || "",
        handover_confirmed_name: disburseForm.custodian_name?.trim() || "",
        recipient_confirmed_name: disburseForm.recipient_confirm_name?.trim() || "",
        attachments: disbursementAttachments,
      };

      const res = await api.post("/finance/petty-cash/disburse", payload);
      const data = res.data?.data;
      toast.success(
        data?.status === "COMPLETED"
          ? `Disbursement ${data.transaction_no} posted! Journal Voucher ${data.journal_voucher_no || data.payment_voucher_no} generated.`
          : `Disbursement ${data.transaction_no} saved as pending confirmation.`
      );

      // Find default imprest account if available
      const defaultImprest = expenseAccounts.find((a) => {
        const name = String(a.name || "").toLowerCase();
        const code = String(a.code || "").toLowerCase();
        return name.includes("imprest") || code.includes("imprest") || name === "imprest";
      });

      // Find default petty cash account
      const defaultPettyCash = accounts.find((a) => {
        const name = String(a.account_name || a.name || "").toLowerCase();
        const code = String(a.account_code || a.code || "").toLowerCase();
        return name.includes("petty cash") || code.includes("1023") || name.includes("petty");
      }) || accounts[0];

      // Reset form with default accounts auto-populated
      setDisburseForm({
        petty_cash_account_id: defaultPettyCash?.account_id ? String(defaultPettyCash.account_id) : "",
        transaction_date: new Date().toISOString().slice(0, 10),
        recipient_name: "",
        department: "",
        description: "",
        expense_account_id: defaultImprest ? String(defaultImprest.id) : "",
        amount: "",
        project_id: "",
        cost_center_id: "",
        handover_confirmed: false,
        recipient_confirmed: false,
        custodian_name: "",
        recipient_confirm_name: "",
      });
      setDisbursementAttachments([]);
      setAmountError("");

      await loadAccounts();
      await loadTransactions();
      switchTab("ledger");
    } catch (err) {
      console.error("Disbursement failed:", err);
      const errMsg = err.response?.data?.error || "Failed to record disbursement.";
      toast.error(errMsg);
      if (err.response?.data?.field === "expense_account_id") {
        setExpenseAccError(true);
      }
    } finally {
      setSubmittingAction(false);
    }
  };

  // Open Details Modal
  const handleOpenDetails = async (tx) => {
    try {
      const res = await api.get(`/finance/petty-cash/transactions/${tx.id}`);
      setSelectedTx(res.data?.data || tx);
      setDetailModalOpen(true);
    } catch {
      setSelectedTx(tx);
      setDetailModalOpen(true);
    }
  };

  // Confirm Pending Disbursement
  const handleConfirmDisbursement = async () => {
    if (!selectedTx) return;
    setSubmittingAction(true);
    try {
      const res = await api.post(`/finance/petty-cash/transactions/${selectedTx.id}/confirm`, {
        confirm_type: "BOTH",
        confirmed_name: confirmSignName.trim() || user?.full_name || user?.username,
      });
      toast.success(res.data?.message || "Disbursement confirmed and Journal Voucher posted!");
      setConfirmModalOpen(false);
      setDetailModalOpen(false);
      await loadAccounts();
      await loadTransactions();
    } catch (err) {
      console.error("Confirmation error:", err);
      toast.error(err.response?.data?.error || "Failed to confirm disbursement");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Execute Reversal
  const handleExecuteReversal = async (e) => {
    e.preventDefault();
    if (!selectedTx || !reversalReason.trim()) {
      toast.error("Reversal justification is required.");
      return;
    }
    setSubmittingAction(true);
    try {
      const res = await api.post(`/finance/petty-cash/transactions/${selectedTx.id}/reverse`, {
        reversal_reason: reversalReason.trim(),
      });
      toast.success(res.data?.message || "Disbursement successfully reversed.");
      setReversalModalOpen(false);
      setDetailModalOpen(false);
      setReversalReason("");
      await loadAccounts();
      await loadTransactions();
    } catch (err) {
      console.error("Reversal error:", err);
      toast.error(err.response?.data?.error || "Failed to reverse transaction");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Attachment upload
  const handleUploadAttachment = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedTx) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const upRes = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fileData = upRes.data?.file || upRes.data || {};
      const filePath = fileData.url || fileData.path || fileData.secure_url;

      await api.post(`/finance/petty-cash/transactions/${selectedTx.id}/attachments`, {
        file_name: uploadFile.name,
        file_path: filePath,
        file_size: uploadFile.size,
        file_type: uploadFile.type,
      });

      toast.success("Attachment uploaded successfully.");
      setAttachmentModalOpen(false);
      setUploadFile(null);
      // refresh details
      handleOpenDetails(selectedTx);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(err.response?.data?.error || "Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  };

  // Fetch Report Data
  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const params = {
        report_type: reportType,
        account_id: selectedAccountId !== "ALL" ? selectedAccountId : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      const res = await api.get("/finance/petty-cash/reports", { params });
      setReportData(res.data?.data || null);
    } catch (err) {
      console.error("Report load failed:", err);
      toast.error("Failed to load report data");
    } finally {
      setReportLoading(false);
    }
  }, [reportType, selectedAccountId, startDate, endDate]);

  useEffect(() => {
    if (activeTab === "reports") {
      loadReport();
    }
  }, [activeTab, loadReport]);

  return (
    <div className="space-y-4">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. PAGE HEADER BAR & ACTION BUTTONS                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header bg-brand text-white rounded-t-lg flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold dark:text-brand-300 flex items-center gap-2.5">
              <Wallet size={24} /> {activeTab === "disburse" ? "Record Petty Cash Disbursement" : "Petty Cash Book"}
            </h1>
            <p className="text-xs text-slate-200 mt-0.5">
              {activeTab === "disburse"
                ? "Disburse cash directly with dual authorization and automatic General Ledger posting."
                : "Controlled disbursement register with dual confirmation and automated General Ledger Journal Voucher integration."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/finance/setup/finance?tab=petty-cash"
              className="btn btn-secondary btn-sm text-xs font-semibold inline-flex items-center gap-1.5"
              title="Configure Petty Cash and Expense Accounts in Finance Setup"
            >
              <Settings size={13} /> Finance Setup
            </Link>
            {activeTab === "disburse" ? (
              <button
                type="button"
                onClick={() => switchTab("ledger")}
                className="btn btn-secondary btn-sm text-xs font-semibold"
              >
                Back to Ledger
              </button>
            ) : (
              <>
                <Link to="/finance?section=Voucher%20Management" className="btn btn-secondary btn-sm text-xs font-semibold">
                  Finance Menu
                </Link>
                <button
                  onClick={() => switchTab("disburse")}
                  className="btn btn-success btn-sm inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs"
                >
                  <Plus size={14} /> New Disbursement
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. TOP METRIC STATS STRIP (Only shown on Ledger, removed from Form) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Available Balance */}
          <div
            className={`card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border rounded-xl shadow-xs transition-colors ${
              aggregateStats.low_balance
                ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/20"
                : "border-slate-200 dark:border-slate-800"
            }`}
          >
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Available Cash
              </p>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                {formatMoney(aggregateStats.available)}
              </h3>
              <span
                className={`text-[10px] font-bold block mt-0.5 ${
                  aggregateStats.low_balance ? "text-rose-600 animate-pulse" : "text-emerald-600"
                }`}
              >
                {aggregateStats.low_balance ? "Replenishment Required" : "Sufficient Liquidity"}
              </span>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs text-white ${
                aggregateStats.low_balance ? "bg-rose-600" : "bg-emerald-600"
              }`}
            >
              <Wallet size={18} />
            </div>
          </div>

          {/* Card 2: Disbursed Out */}
          <div className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Disbursed Out
              </p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {formatMoney(aggregateStats.disbursed)}
              </h3>
              <span className="text-[10px] text-slate-400 block mt-0.5">Automated Journal Vouchers</span>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs bg-brand-900 text-white">
              <ArrowUpRight size={18} />
            </div>
          </div>

          {/* Card 3: Total Disbursements (Count) */}
          <div className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Disbursements
              </p>
              <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {disbursementCount} {disbursementCount === 1 ? "Voucher" : "Vouchers"}
              </h3>
              <span className="text-[10px] text-slate-400 block mt-0.5">Disbursement Entries</span>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs bg-indigo-600 text-white">
              <Receipt size={18} />
            </div>
          </div>

          {/* Card 4: Average Disbursement */}
          <div className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
            <div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Avg. Disbursement
              </p>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {formatMoney(avgDisbursement)}
              </h3>
              <span className="text-[10px] text-slate-400 block mt-0.5">Per Transaction</span>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs bg-sky-600 text-white">
              <TrendingUp size={18} />
            </div>
          </div>
        </div>
      )}

      {/* Low balance alert prompt banner if low (Ledger only) */}
      {activeTab === "ledger" && aggregateStats.low_balance && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-2.5 text-xs text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-rose-600 shrink-0" />
            <span>
              <strong>Low Petty Cash Balance Warning:</strong> Available cash balance is below the replenishment threshold.
              Please instruct Finance to initiate an Account Transfer (Contra Voucher).
            </span>
          </div>
          <Link
            to="/finance/contra-voucher/create"
            className="btn btn-secondary btn-xs font-semibold text-rose-700 bg-white border-rose-300 shrink-0 hover:bg-rose-50"
          >
            Replenish Now
          </Link>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: OVERVIEW & LEDGER                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          {/* Filter Bar (Expense Account auto-hidden, managed via Finance Setup) */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="form-select w-full text-xs py-1.5 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING_CONFIRMATION">Pending Confirmation</option>
                <option value="REVERSED">Reversed</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input w-full text-xs py-1.5 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input w-full text-xs py-1.5 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Search
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ref, Recipient, PV..."
                  className="form-input w-full text-xs pl-8 py-1.5 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="table w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Ref No.</th>
                  <th className="py-3 px-3 min-w-[140px]">Recipient / Employee</th>
                  <th className="py-3 px-3 min-w-[200px]">Description</th>
                  <th className="py-3 px-3 text-right">Disbursement (Out)</th>
                  <th className="py-3 px-3">Voucher Ref</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-indigo-600" />
                      Loading petty cash ledger...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <Wallet size={28} className="mx-auto mb-2 opacity-30 text-slate-500" />
                      No petty cash records found matching filters.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => {
                    const isFunding = t.transaction_type === "FUNDING";
                    const isDisbursement = t.transaction_type === "DISBURSEMENT";
                    const isReversal = t.transaction_type === "REVERSAL";

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        {/* Date */}
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {t.transaction_date ? new Date(t.transaction_date).toLocaleDateString() : "—"}
                        </td>

                        {/* Ref No. */}
                        <td className="py-3 px-3 font-mono font-bold text-brand-900 dark:text-brand-400 whitespace-nowrap">
                          {t.transaction_no}
                        </td>



                        {/* Recipient */}
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block line-clamp-1">
                            {t.recipient_name}
                          </span>
                          {t.department && (
                            <span className="text-[10px] text-slate-400 block">{t.department}</span>
                          )}
                        </td>

                        {/* Description */}
                        <td className="py-3 px-3 max-w-[220px]">
                          <span className="text-slate-700 dark:text-slate-300 line-clamp-2" title={t.description}>
                            {t.description}
                          </span>
                        </td>





                        {/* Credit / Disbursement (Out) */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {isDisbursement ? formatMoney(t.amount) : "—"}
                        </td>

                        {/* Voucher Ref */}
                        <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                          {t.journal_voucher_no || (t.payment_voucher_no && t.payment_voucher_no.startsWith("JV")) ? (
                            <Link
                              to={`/finance/journal-voucher?search=${t.journal_voucher_no || t.payment_voucher_no}`}
                              className="inline-flex items-center gap-1 text-brand-900 dark:text-brand-400 font-bold hover:underline"
                              title="View Journal Voucher in Finance"
                            >
                              {t.journal_voucher_no || t.payment_voucher_no} <ExternalLink size={10} />
                            </Link>
                          ) : t.payment_voucher_no ? (
                            <Link
                              to={`/finance/payment-voucher?search=${t.payment_voucher_no}`}
                              className="inline-flex items-center gap-1 text-brand-900 dark:text-brand-400 font-bold hover:underline"
                              title="View Payment Voucher in Finance"
                            >
                              {t.payment_voucher_no} <ExternalLink size={10} />
                            </Link>
                          ) : t.contra_voucher_no ? (
                            <Link
                              to={`/finance/contra-voucher?search=${t.contra_voucher_no}`}
                              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                              title="View Contra Voucher in Finance"
                            >
                              {t.contra_voucher_no} <ExternalLink size={10} />
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {t.status === "COMPLETED" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Completed
                            </span>
                          )}
                          {t.status === "PENDING_CONFIRMATION" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Pending Sign-off
                            </span>
                          )}
                          {t.status === "REVERSED" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              Reversed
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleOpenDetails(t)}
                              className="btn btn-ghost btn-xs text-slate-500 hover:text-slate-800"
                              title="View Details"
                            >
                              <Eye size={13} />
                            </button>
                            {t.status === "PENDING_CONFIRMATION" && (
                              <button
                                onClick={() => {
                                  setSelectedTx(t);
                                  setConfirmModalOpen(true);
                                }}
                                className="btn btn-secondary btn-xs text-amber-700 bg-amber-50 border-amber-200"
                                title="Dual Confirm Disbursement"
                              >
                                <CheckCircle2 size={13} /> Confirm
                              </button>
                            )}
                            {t.status === "COMPLETED" && isDisbursement && (
                              <button
                                onClick={() => {
                                  setSelectedTx(t);
                                  setReversalModalOpen(true);
                                }}
                                className="btn btn-ghost btn-xs text-rose-500 hover:text-rose-700"
                                title="Reverse Disbursement"
                              >
                                <RotateCcw size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {transactions.length} of {pagination.total} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="btn btn-secondary btn-xs"
              >
                Previous
              </button>
              <span className="font-semibold">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="btn btn-secondary btn-xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: DISBURSE CASH (DISBURSEMENT FORM)                      */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "disburse" && (
        <div className="card">
          <div className="card-body space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Wallet size={20} className="text-brand-900 dark:text-brand-400" /> Disbursement Voucher Details
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Available Cash
                </span>
                <span className="text-base font-black text-emerald-600 block">
                  {formatMoney(
                    (accounts.find((a) => String(a.account_id) === String(disburseForm.petty_cash_account_id)) || activeAccount)
                      ?.available_balance || aggregateStats.available
                  )}
                </span>
              </div>
            </div>

            <form onSubmit={(e) => handleSubmitDisbursement(e, false)} className="space-y-6">
              {/* Hidden Petty Cash Account */}
              <div className="hidden">
                <select
                  value={disburseForm.petty_cash_account_id}
                  onChange={(e) => setDisburseForm({ ...disburseForm, petty_cash_account_id: e.target.value })}
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.account_id}>
                      {acc.account_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 1: Transaction Date & Recipient */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Transaction Date *</label>
                  <input
                    type="date"
                    value={disburseForm.transaction_date}
                    onChange={(e) => setDisburseForm({ ...disburseForm, transaction_date: e.target.value })}
                    required
                    className="input"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label mb-0">Recipient *</label>
                    <button
                      type="button"
                      onClick={() => setShowEmployeeModal(true)}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-800 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <Users size={12} /> Select from Employees
                    </button>
                  </div>
                  <input
                    type="text"
                    value={disburseForm.recipient_name}
                    onChange={(e) => setDisburseForm({ ...disburseForm, recipient_name: e.target.value })}
                    placeholder="Enter recipient name or select an employee..."
                    required
                    className="input"
                  />
                </div>
              </div>

              {/* Row 2: Department (Expense Account auto-hidden & preset via Finance Setup) */}
              <div>
                <label className="label">Department</label>
                <select
                  value={disburseForm.department}
                  onChange={(e) => setDisburseForm({ ...disburseForm, department: e.target.value })}
                  className="input"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                  {disburseForm.department && !departments.some((d) => d.name === disburseForm.department) && (
                    <option value={disburseForm.department}>{disburseForm.department}</option>
                  )}
                </select>
              </div>

              {/* Row 3: Amount, Project & Cost Centre */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Disbursement Amount (GH₵) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={disburseForm.amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    required
                    className={`input font-mono font-bold ${amountError ? "border-rose-500 bg-rose-50" : ""}`}
                  />
                  {amountError && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> {amountError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Project</label>
                  <select
                    value={disburseForm.project_id}
                    onChange={(e) => setDisburseForm({ ...disburseForm, project_id: e.target.value })}
                    className="input"
                  >
                    <option value="">-- Select Project --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.project_name || p.name} ({p.project_code || p.code || p.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Cost Centre</label>
                  <select
                    value={disburseForm.cost_center_id}
                    onChange={(e) => setDisburseForm({ ...disburseForm, cost_center_id: e.target.value })}
                    className="input"
                  >
                    <option value="">-- Select Cost Centre --</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.name} {cc.code ? `(${cc.code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Description */}
              <div>
                <label className="label">Description *</label>
                <textarea
                  rows={3}
                  value={disburseForm.description}
                  onChange={(e) => setDisburseForm({ ...disburseForm, description: e.target.value })}
                  placeholder="State the purpose and details of this petty cash disbursement..."
                  required
                  className="input h-20 w-full"
                />
              </div>

              {/* Row 5: Mandatory Dual Sign-Off Station (Type Full Name to Agree) */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <UserCheck size={18} className="text-brand-900 dark:text-brand-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                        Mandatory Dual Agreement & Confirmation
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Both custodian and recipient must type their full name to confirm agreement to the transaction.
                      </span>
                    </div>
                  </div>
                  {((disburseForm.handover_confirmed || disburseForm.custodian_name?.trim()) &&
                    (disburseForm.recipient_confirmed || disburseForm.recipient_confirm_name?.trim())) ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
                      <CheckCircle2 size={13} className="text-emerald-600" /> Dual Sign-off Complete • Ready to Post
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 inline-flex items-center gap-1.5">
                      <Clock size={13} className="text-amber-600" /> Full Name Agreement Required
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. Custodian / Staff Handover Card */}
                  <div className="rounded-xl border transition-all p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xs">
                    {disburseForm.handover_confirmed && disburseForm.custodian_name?.trim() ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <CheckCircle2 size={18} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                              Custodian Handover Signed
                            </span>
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                              Signed by <strong>{disburseForm.custodian_name}</strong> • Cash Handed Over
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDisburseForm({ ...disburseForm, handover_confirmed: false })}
                          className="text-xs text-slate-400 hover:text-rose-600 font-medium underline px-2 py-1"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <FileSignature size={14} className="text-brand-900 dark:text-brand-400" />
                            Custodian / Staff Handover *
                          </label>
                          <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                            Type Name to Sign
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Type your full name to certify physical release of funds:
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={disburseForm.custodian_name}
                            onChange={(e) => setDisburseForm({ ...disburseForm, custodian_name: e.target.value })}
                            placeholder={user?.full_name || user?.username ? `e.g. ${user?.full_name || user?.username}` : "Type custodian full name..."}
                            className="form-input text-xs flex-1 py-1.5 px-3 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && disburseForm.custodian_name.trim().length >= 2) {
                                e.preventDefault();
                                setDisburseForm({ ...disburseForm, handover_confirmed: true });
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={!disburseForm.custodian_name?.trim()}
                            onClick={() => {
                              if (disburseForm.custodian_name.trim().length >= 2) {
                                setDisburseForm({ ...disburseForm, handover_confirmed: true });
                              } else {
                                toast.error("Please enter your full name (at least 2 characters).");
                              }
                            }}
                            className="btn btn-primary text-xs shrink-0 py-1.5 px-3 disabled:opacity-40"
                          >
                            Sign
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Recipient Confirmation Card */}
                  <div className="rounded-xl border transition-all p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xs">
                    {disburseForm.recipient_confirmed && disburseForm.recipient_confirm_name?.trim() ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <CheckCircle2 size={18} />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                              Recipient Receipt Confirmed
                            </span>
                            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                              Confirmed by <strong>{disburseForm.recipient_confirm_name}</strong> • Funds Received
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDisburseForm({ ...disburseForm, recipient_confirmed: false })}
                          className="text-xs text-slate-400 hover:text-rose-600 font-medium underline px-2 py-1"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <BadgeCheck size={14} className="text-brand-900 dark:text-brand-400" />
                            Recipient Confirmation *
                          </label>
                          <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
                            Type Name to Confirm
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Recipient must type their full name to confirm physical receipt of cash:
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={disburseForm.recipient_confirm_name}
                            onChange={(e) => setDisburseForm({ ...disburseForm, recipient_confirm_name: e.target.value })}
                            placeholder={disburseForm.recipient_name ? `e.g. ${disburseForm.recipient_name}` : "Type recipient full name..."}
                            className="form-input text-xs flex-1 py-1.5 px-3 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && disburseForm.recipient_confirm_name.trim().length >= 2) {
                                e.preventDefault();
                                setDisburseForm({ ...disburseForm, recipient_confirmed: true });
                              }
                            }}
                          />
                          <button
                            type="button"
                            disabled={!disburseForm.recipient_confirm_name?.trim()}
                            onClick={() => {
                              if (disburseForm.recipient_confirm_name.trim().length >= 2) {
                                setDisburseForm({ ...disburseForm, recipient_confirmed: true });
                              } else {
                                toast.error("Please enter recipient full name (at least 2 characters).");
                              }
                            }}
                            className="btn btn-primary text-xs shrink-0 py-1.5 px-3 disabled:opacity-40"
                          >
                            Confirm
                          </button>
                        </div>
                        {disburseForm.recipient_name && !disburseForm.recipient_confirm_name && (
                          <button
                            type="button"
                            onClick={() => {
                              setDisburseForm({
                                ...disburseForm,
                                recipient_confirm_name: disburseForm.recipient_name,
                                recipient_confirmed: true,
                              });
                            }}
                            className="text-[11px] text-brand-900 dark:text-brand-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <span>Type as "{disburseForm.recipient_name}"</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 6: Actions */}
              <div className="flex flex-col md:flex-row justify-end gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => switchTab("ledger")}
                  className="btn btn-secondary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={(e) => handleSubmitDisbursement(e, true)}
                  className="btn btn-secondary text-xs font-semibold"
                  title="Save record but leave status as Pending Confirmation"
                >
                  Save as Pending Sign-off
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || Boolean(amountError)}
                  className="btn btn-success text-xs font-semibold shadow-xs"
                >
                  {submittingAction ? "Posting Voucher..." : "Save & Post Disbursement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: CONTRA FUNDING RECEIPTS                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "funding" && (
        <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ArrowDownLeft size={16} className="text-indigo-600" /> Contra Funding History
              </h3>
              <p className="text-xs text-slate-500">
                Transfers from Bank and Main Cash accounts into Petty Cash via the existing Contra Voucher workflow.
              </p>
            </div>
            <Link
              to="/finance/contra-voucher/create"
              className="btn btn-primary btn-sm inline-flex items-center gap-1.5 text-xs font-semibold shadow-xs"
            >
              <Plus size={14} /> New Contra Transfer
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Contra Ref</th>
                  <th className="py-3 px-3">Petty Cash Account</th>
                  <th className="py-3 px-3">Narration</th>
                  <th className="py-3 px-3 text-right">Amount Funded</th>
                  <th className="py-3 px-3">Recorded By</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Voucher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.filter((t) => t.transaction_type === "FUNDING").length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      No funding receipts recorded. Create a Contra Voucher to fund petty cash.
                    </td>
                  </tr>
                ) : (
                  transactions
                    .filter((t) => t.transaction_type === "FUNDING")
                    .map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {f.transaction_date ? new Date(f.transaction_date).toLocaleDateString() : "—"}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-600">
                          {f.contra_voucher_no || f.transaction_no}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {f.petty_cash_account_name || "Petty Cash Account"}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 max-w-[260px] truncate">
                          {f.description}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatMoney(f.amount)}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{f.recorded_by_name || "Finance"}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Posted
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            to={`/finance/contra-voucher?search=${f.contra_voucher_no}`}
                            className="btn btn-ghost btn-xs text-brand-900 inline-flex items-center gap-1 font-semibold"
                          >
                            View CV <ExternalLink size={11} />
                          </Link>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: REPORTS & RECONCILIATION                               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "reports" && (
        <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden p-5 space-y-5">
          {/* Sub-report selector buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "STATEMENT", label: "Statement of Account" },
                { id: "RECONCILIATION", label: "GL Reconciliation" },
                { id: "EXPENSE_ANALYSIS", label: "Expense Breakdown" },
                { id: "RECIPIENTS", label: "Recipient History" },
                { id: "DISBURSEMENTS", label: "All Disbursements" },
                { id: "FUNDING", label: "Funding Audit" },
              ].map((rep) => (
                <button
                  key={rep.id}
                  onClick={() => setReportType(rep.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    reportType === rep.id
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {rep.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => window.print()}
              className="btn btn-secondary btn-sm inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              <Printer size={13} /> Print Report
            </button>
          </div>

          {/* Report Content */}
          {reportLoading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-600" />
              Generating financial report...
            </div>
          ) : reportType === "RECONCILIATION" ? (
            /* Reconciliation Table */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Petty Cash Book vs General Ledger Reconciliation
                  </h4>
                  <p className="text-xs text-slate-500">
                    Reconciles the running balance of the Petty Cash Book against General Ledger asset account debits and credits.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Reconciled
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="table w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                      <th className="py-2.5 px-3">GL Account Code</th>
                      <th className="py-2.5 px-3">Account Name</th>
                      <th className="py-2.5 px-3">Custodian</th>
                      <th className="py-2.5 px-3 text-right">Opening Balance</th>
                      <th className="py-2.5 px-3 text-right">Total Funding</th>
                      <th className="py-2.5 px-3 text-right">Disbursements</th>
                      <th className="py-2.5 px-3 text-right">Petty Cash Book Balance</th>
                      <th className="py-2.5 px-3 text-right">General Ledger Net</th>
                      <th className="py-2.5 px-3 text-right">Variance</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reportData?.rows || []).map((row) => (
                      <tr key={row.account_id} className="font-medium">
                        <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {row.account_code}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {row.account_name}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{row.custodian_name || "Admin"}</td>
                        <td className="py-3 px-3 text-right font-mono">{formatMoney(row.opening_balance)}</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600">{formatMoney(row.total_funding)}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-900">{formatMoney(row.total_disbursed)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-brand-900 dark:text-brand-300">
                          {formatMoney(row.petty_cash_book_balance)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                          {formatMoney(row.gl_balance)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatMoney(row.variance)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {row.is_balanced ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Balanced
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              Variance
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : reportType === "EXPENSE_ANALYSIS" ? (
            /* Expense Analysis */
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                    <th className="py-2.5 px-3">Expense Code</th>
                    <th className="py-2.5 px-3">Expense Account Name</th>
                    <th className="py-2.5 px-3 text-center">Transaction Count</th>
                    <th className="py-2.5 px-3 text-right">Total Expensed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(reportData?.rows || []).map((exp) => (
                    <tr key={exp.expense_account_id}>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{exp.expense_account_code}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900 dark:text-slate-100">{exp.expense_account_name}</td>
                      <td className="py-3 px-3 text-center font-bold">{exp.count_disbursements}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-brand-900">{formatMoney(exp.total_spent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : reportType === "RECIPIENTS" ? (
            /* Recipient Breakdown */
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                    <th className="py-2.5 px-3">Recipient / Employee Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Disbursements Received</th>
                    <th className="py-2.5 px-3 text-right">Total Cash Handed Over</th>
                    <th className="py-2.5 px-3">Last Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(reportData?.rows || []).map((rec, i) => (
                    <tr key={i}>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{rec.recipient_name}</td>
                      <td className="py-3 px-3 text-slate-600">{rec.department || "—"}</td>
                      <td className="py-3 px-3 text-center font-bold">{rec.transaction_count}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                        {formatMoney(rec.total_received)}
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {rec.last_disbursement_date ? new Date(rec.last_disbursement_date).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Statement Table */
            <div className="overflow-x-auto">
              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Ref No.</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Particulars / Recipient</th>
                    <th className="py-2.5 px-3">Expense Account</th>
                    <th className="py-2.5 px-3 text-right">Receipt (Dr)</th>
                    <th className="py-2.5 px-3 text-right">Payment (Cr)</th>
                    <th className="py-2.5 px-3">Voucher Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(reportData?.rows || []).map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 px-3 text-slate-600">{r.transaction_date ? new Date(r.transaction_date).toLocaleDateString() : "—"}</td>
                      <td className="py-3 px-3 font-mono font-bold text-brand-900">{r.transaction_no}</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700">{r.transaction_type}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900">{r.recipient_name}</span>
                        <span className="text-[10px] text-slate-400 block">{r.description}</span>
                      </td>
                      <td className="py-3 px-3">{r.expense_account_name || "—"}</td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600">
                        {r.transaction_type === "FUNDING" ? formatMoney(r.amount) : "—"}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        {r.transaction_type === "DISBURSEMENT" ? formatMoney(r.amount) : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">{r.payment_voucher_no || r.contra_voucher_no || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 5: ACCOUNT & CUSTODIAN SETUP                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === "setup" && (
        <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs p-6 max-w-4xl mx-auto space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders size={18} className="text-indigo-600" /> Petty Cash Accounts Configuration
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Define custodians, low-balance replenishment thresholds, and maximum single disbursement limits.
            </p>
          </div>

          <div className="space-y-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{acc.account_name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700">
                      Code: {acc.account_code || "1023"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2 text-xs text-slate-500">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Custodian</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{acc.custodian_name || "Admin"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Low Balance Threshold</span>
                      <span className="font-semibold text-rose-600">{formatMoney(acc.low_balance_threshold)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Single Limit</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{formatMoney(acc.max_single_disbursement)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block font-semibold">Available</span>
                  <span className="text-lg font-black text-emerald-600 block">{formatMoney(acc.available_balance)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: TRANSACTION DETAILS                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {detailModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Wallet size={18} className="text-brand-900" />
                  Transaction: {selectedTx.transaction_no}
                </h3>
                <span className="text-xs text-slate-500">
                  {selectedTx.transaction_type} • Recorded {selectedTx.transaction_date ? new Date(selectedTx.transaction_date).toLocaleDateString() : ""}
                </span>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Disbursed Amount</span>
                  <span className="text-base font-black text-brand-900 dark:text-brand-300">
                    {formatMoney(selectedTx.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Recipient / Employee</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedTx.recipient_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Department</span>
                  <span className="font-semibold text-slate-700">{selectedTx.department || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Expense Account</span>
                  <span className="font-semibold text-slate-700">
                    {selectedTx.expense_account_code} - {selectedTx.expense_account_name || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Journal Voucher</span>
                  {selectedTx.journal_voucher_no || (selectedTx.payment_voucher_no && selectedTx.payment_voucher_no.startsWith("JV")) ? (
                    <Link
                      to={`/finance/journal-voucher?search=${selectedTx.journal_voucher_no || selectedTx.payment_voucher_no}`}
                      className="font-mono font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      {selectedTx.journal_voucher_no || selectedTx.payment_voucher_no} <ExternalLink size={11} />
                    </Link>
                  ) : selectedTx.payment_voucher_no ? (
                    <Link
                      to={`/finance/payment-voucher?search=${selectedTx.payment_voucher_no}`}
                      className="font-mono font-bold text-brand-900 hover:underline flex items-center gap-1"
                    >
                      {selectedTx.payment_voucher_no} <ExternalLink size={11} />
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-semibold block">Recorded By</span>
                  <span className="font-semibold text-slate-700">{selectedTx.recorded_by_name || "Admin"}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-[10px] text-slate-400 font-semibold block mb-1">Disbursement Description</span>
                <p className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedTx.description}
                </p>
              </div>

              {/* Dual Confirmation Sign-off Block */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Dual Confirmation Audit
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-semibold">Custodian Handover</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={13} /> {selectedTx.handover_confirmed ? "Confirmed" : "Pending"}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      By: {selectedTx.handover_confirmed_name || "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-semibold">Recipient Receipt</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={13} /> {selectedTx.recipient_confirmed ? "Confirmed" : "Pending"}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      By: {selectedTx.recipient_confirmed_name || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Supporting Evidence ({selectedTx.attachments?.length || 0})
                  </span>
                  <button
                    onClick={() => setAttachmentModalOpen(true)}
                    className="btn btn-secondary btn-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Paperclip size={12} /> Add Attachment
                  </button>
                </div>

                {(!selectedTx.attachments || selectedTx.attachments.length === 0) ? (
                  <p className="text-[11px] text-slate-400 p-3 text-center border border-dashed rounded-lg">
                    No attachments uploaded for this disbursement.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedTx.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Paperclip size={14} className="text-slate-400" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{att.file_name}</span>
                        </div>
                        <a
                          href={att.file_path}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-xs font-semibold inline-flex items-center gap-1 text-brand-900"
                        >
                          View <ExternalLink size={10} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/40">
              <button onClick={() => setDetailModalOpen(false)} className="btn btn-secondary btn-sm text-xs font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: CONFIRM PENDING DISBURSEMENT                         */}
      {/* ───────────────────────────────────────────────────────────── */}
      {confirmModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" /> Confirm Cash Receipt
              </h3>
              <button onClick={() => setConfirmModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Confirm that cash amounting to <strong>{formatMoney(selectedTx.amount)}</strong> has been physically handed over to{" "}
              <strong>{selectedTx.recipient_name}</strong> for: <em>{selectedTx.description}</em>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Type Your Full Name to Authorize & Confirm *
              </label>
              <input
                type="text"
                value={confirmSignName}
                onChange={(e) => setConfirmSignName(e.target.value)}
                placeholder={user?.full_name || user?.username || "Type your full name..."}
                className="form-input text-xs w-full py-1.5 px-3 rounded-lg border-slate-300 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              Executing this confirmation completes the transaction, reduces the Petty Cash balance, and automatically posts the Journal Voucher to the General Ledger.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setConfirmModalOpen(false)} className="btn btn-secondary btn-sm text-xs font-semibold">
                Cancel
              </button>
              <button
                onClick={handleConfirmDisbursement}
                disabled={submittingAction}
                className="btn btn-success btn-sm text-xs font-semibold"
              >
                {submittingAction ? "Posting..." : "Confirm & Post GL Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 3: REVERSE DISBURSEMENT                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      {reversalModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-rose-600 flex items-center gap-2">
                <RotateCcw size={18} /> Reverse Disbursement: {selectedTx.transaction_no}
              </h3>
              <button onClick={() => setReversalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Reversing this transaction will reverse Journal Voucher <strong>{selectedTx.journal_voucher_no || selectedTx.payment_voucher_no}</strong> in the General Ledger and restore <strong>{formatMoney(selectedTx.amount)}</strong> to the Petty Cash Book.
            </p>

            <form onSubmit={handleExecuteReversal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reversal Justification *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Detail reason for reversing this disbursement..."
                  className="form-textarea w-full text-xs rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversalModalOpen(false)}
                  className="btn btn-secondary btn-sm text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || !reversalReason.trim()}
                  className="btn btn-danger btn-sm text-xs font-semibold bg-rose-600 text-white"
                >
                  {submittingAction ? "Reversing..." : "Confirm Reversal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 4: UPLOAD ATTACHMENT                                    */}
      {/* ───────────────────────────────────────────────────────────── */}
      {attachmentModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Paperclip size={18} className="text-indigo-600" /> Upload Supporting Evidence
              </h3>
              <button onClick={() => setAttachmentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadAttachment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Receipt / Invoice / Slip *
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  className="form-input w-full text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Supports PDF, PNG, JPG, or DOC documents.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAttachmentModalOpen(false)}
                  className="btn btn-secondary btn-sm text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="btn btn-primary btn-sm text-xs font-semibold"
                >
                  {uploading ? "Uploading..." : "Upload Evidence"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      {/* ───────────────────────────────────────────────────────────── */}
      {/* EMPLOYEE PICKER MODAL (hr_employees)                          */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users size={18} className="text-brand-900 dark:text-brand-400" /> Select Employee (hr_employees)
              </h3>
              <button
                type="button"
                onClick={() => setShowEmployeeModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search by name, code or department..."
                autoFocus
                className="input pl-9 w-full"
              />
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No matching employees found in hr_employees.
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const name = `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.full_name || "Employee";
                  return (
                    <div
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp)}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                          {name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Code: {emp.emp_code || `EMP-${emp.id}`} • Dept: {emp.dept_name || "Unassigned"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectEmployee(emp);
                        }}
                        className="btn btn-secondary btn-sm text-xs font-semibold"
                      >
                        Select
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowEmployeeModal(false)}
                className="btn btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
