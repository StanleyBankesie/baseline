import MobileMovingCarousel from "@/components/MobileMovingCarousel";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownUp,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Clock3,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  History as HistoryIcon,
  Layers,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Tag,
  User,
  X,
} from "lucide-react";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";
import { api } from "../../../../api/client.js";
import DocumentAttachmentsModal from "../../../../components/attachments/DocumentAttachmentsModal.jsx";

// Standard Classification Constants
export const CATEGORIES = [
  "QUALITY_DEFECT",
  "INCOMPLETE_WORK",
  "NON_CONFORMANCE",
  "TECHNICAL_ISSUE",
  "FUNCTIONAL_ISSUE",
  "DOCUMENTATION_GAP",
  "PERFORMANCE_ISSUE",
  "SAFETY_ISSUE",
  "COMPLIANCE_ISSUE",
  "OTHER",
];

export const CATEGORY_LABELS = {
  QUALITY_DEFECT: "Quality Defect",
  INCOMPLETE_WORK: "Incomplete Work",
  NON_CONFORMANCE: "Non-Conformance",
  TECHNICAL_ISSUE: "Technical Issue",
  FUNCTIONAL_ISSUE: "Functional Issue",
  DOCUMENTATION_GAP: "Documentation Gap",
  PERFORMANCE_ISSUE: "Performance Issue",
  SAFETY_ISSUE: "Safety Issue",
  COMPLIANCE_ISSUE: "Compliance Issue",
  OTHER: "Other",
};

export const SEVERITIES = ["CRITICAL", "MAJOR", "MODERATE", "MINOR"];
export const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"];
export const IMPACTS = [
  "SCOPE",
  "SCHEDULE",
  "COST",
  "QUALITY",
  "SAFETY",
  "COMPLIANCE",
  "OPERATIONS",
  "CUSTOMER_SATISFACTION",
];

export const STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "PENDING_REVIEW",
  "VERIFIED",
  "CLOSED",
  "ON_HOLD",
  "CANCELLED",
  "DEFERRED",
];

export const CLOSED_STATUSES = new Set(["CLOSED", "VERIFIED", "CANCELLED", "DEFERRED"]);

export const STATUS_CONFIG = {
  OPEN: { label: "Open", bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800", dot: "bg-amber-500" },
  ASSIGNED: { label: "Assigned", bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800", dot: "bg-blue-500" },
  IN_PROGRESS: { label: "In Progress", bg: "bg-sky-50 dark:bg-sky-950/40", text: "text-sky-700 dark:text-sky-300", border: "border-sky-200 dark:border-sky-800", dot: "bg-sky-500" },
  PENDING_REVIEW: { label: "Pending Review", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800", dot: "bg-purple-500" },
  VERIFIED: { label: "Verified", bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-200 dark:border-teal-800", dot: "bg-teal-500" },
  CLOSED: { label: "Closed", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800", dot: "bg-emerald-500" },
  ON_HOLD: { label: "On Hold", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", border: "border-slate-300 dark:border-slate-700", dot: "bg-slate-400" },
  CANCELLED: { label: "Cancelled", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-700 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800", dot: "bg-rose-500" },
  DEFERRED: { label: "Deferred", bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800", dot: "bg-orange-500" },
};

export const SEVERITY_CONFIG = {
  CRITICAL: { label: "Critical", badge: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300" },
  MAJOR: { label: "Major", badge: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300" },
  MODERATE: { label: "Moderate", badge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300" },
  MINOR: { label: "Minor", badge: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300" },
};

export const PRIORITY_CONFIG = {
  URGENT: { label: "Urgent", badge: "text-rose-600 font-bold" },
  HIGH: { label: "High", badge: "text-amber-600 font-semibold" },
  MEDIUM: { label: "Medium", badge: "text-sky-600 font-medium" },
  LOW: { label: "Low", badge: "text-slate-500" },
};

const today = () => new Date().toISOString().slice(0, 10);
const display = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const emptyIssue = () => ({
  project_id: "",
  wbs_code: "",
  task_name: "",
  issue_title: "",
  description: "",
  category: "QUALITY_DEFECT",
  severity: "MODERATE",
  priority: "MEDIUM",
  impact: "QUALITY",
  date_identified: today(),
  identified_by: "",
  location: "",
  department: "",
  responsible_department: "",
  assigned_to: "",
  contractor_vendor: "",
  assigned_date: "",
  target_resolution_date: "",
  required_corrective_action: "",
  proposed_solution: "",
  actual_action_taken: "",
  resolution_start_date: "",
  completion_date: "",
  additional_cost: "",
  supporting_documents: "",
  before_after_evidence: "",
  resolution_remarks: "",
  verification_required: false,
  reviewer: "",
  review_date: "",
  verification_result: "",
  review_comments: "",
  rejection_reason: "",
  approved_by: "",
  closure_date: "",
  status: "OPEN",
});

const normalizeForForm = (item) => {
  const parsed = (value) => {
    if (!value) return "";
    try {
      const val = JSON.parse(value);
      return Array.isArray(val) ? val.join("\n") : String(value);
    } catch {
      return String(value);
    }
  };
  const dateFields = [
    "date_identified",
    "assigned_date",
    "target_resolution_date",
    "resolution_start_date",
    "completion_date",
    "review_date",
    "closure_date",
  ];
  const normalized = {
    ...emptyIssue(),
    ...item,
    project_id: String(item.project_id || ""),
    verification_required: Boolean(Number(item.verification_required)),
    supporting_documents: parsed(item.supporting_documents),
    before_after_evidence: parsed(item.before_after_evidence),
    additional_cost: item.additional_cost ?? "",
  };
  dateFields.forEach((field) => {
    if (normalized[field]) normalized[field] = String(normalized[field]).slice(0, 10);
  });
  return normalized;
};

const encodeLinks = (value) =>
  String(value || "")
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);

function Field({ label, children, required = false, className = "", helper = null }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="text-rose-500 font-semibold"> *</span>}
      </span>
      {children}
      {helper && <span className="block text-[11px] text-slate-400">{helper}</span>}
    </label>
  );
}

function TextInput({ value, onChange, type = "text", ...props }) {
  return (
    <input
      {...props}
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`input w-full ${props.className || ""}`}
    />
  );
}

function SelectInput({ value, onChange, options, placeholder = "Select…", ...props }) {
  return (
    <select
      {...props}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`input w-full ${props.className || ""}`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) =>
        typeof opt === "string" ? (
          <option key={opt} value={opt}>
            {CATEGORY_LABELS[opt] || display(opt)}
          </option>
        ) : (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        )
      )}
    </select>
  );
}

function TextArea({ value, onChange, rows = 3, ...props }) {
  return (
    <textarea
      {...props}
      rows={rows}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`input w-full ${props.className || ""}`}
    />
  );
}

export default function SnagPunchListPage({ embedded = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [workPlans, setWorkPlans] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters & Search
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState(searchParams.get("project_id") || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Sorting & Pagination
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals & Forms
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formTab, setFormTab] = useState("general"); // general | classification | assignment | resolution | review
  const [form, setForm] = useState(emptyIssue());
  const [viewIssue, setViewIssue] = useState(null);
  const [historyIssue, setHistoryIssue] = useState(null);
  const [attachmentsIssue, setAttachmentsIssue] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rejectModalIssue, setRejectModalIssue] = useState(null);
  const [rejectionReasonText, setRejectionReasonText] = useState("");

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/construction/project-issues", {
        params: { project_id: projectFilter || undefined },
      });
      setIssues(res.data?.items || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load project issues");
    } finally {
      setLoading(false);
    }
  }, [projectFilter]);

  // Initial reference data load
  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get("/projects/projects", { params: { active: "all" } }).catch(() => ({ data: { items: [] } })),
      api.get("/admin/users", { params: { active: 1 } }).catch(() => ({ data: { items: [] } })),
      api.get("/admin/departments").catch(() => ({ data: { items: [] } })),
      api.get("/purchase/suppliers", { params: { active: "all" } }).catch(() => ({ data: { items: [] } })),
    ]).then(([projectRes, userRes, departmentRes, vendorRes]) => {
      if (!mounted) return;
      setProjects(projectRes.data?.items || []);
      setUsers(userRes.data?.items || userRes.data?.data?.items || []);
      setDepartments(departmentRes.data?.items || []);
      setVendors(vendorRes.data?.items || vendorRes.data?.data?.items || []);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // Auto-open modal if requested via URL action
  useEffect(() => {
    if (searchParams.get("action") === "new") {
      openNew();
    }
  }, [searchParams]);

  // Load project-specific WBS and Tasks when project is selected in form
  useEffect(() => {
    let mounted = true;
    if (!form.project_id) {
      setWorkPlans([]);
      setTasks([]);
      return () => {
        mounted = false;
      };
    }
    Promise.all([
      api.get(`/projects/projects/${form.project_id}`).catch(() => ({ data: {} })),
      api.get("/construction/work-packages", { params: { project_id: form.project_id } }).catch(() => ({ data: { items: [] } })),
      api.get("/projects/tasks", { params: { project_id: form.project_id } }).catch(() => ({ data: { items: [] } })),
    ]).then(([projectRes, packagesRes, tasksRes]) => {
      if (!mounted) return;
      const project = projectRes.data?.item || projectRes.data?.data || projectRes.data;
      const scopes = Array.isArray(project?.scopes) ? project.scopes : [];
      const nested = scopes
        .flatMap((scope) =>
          (scope.wbs_list || []).map((wbs) => ({
            value: String(wbs.wbs || wbs.wbs_code || ""),
            label: `${wbs.wbs || wbs.wbs_code || "WBS"}${scope.name || scope.scope_name ? ` — ${scope.name || scope.scope_name}` : ""}`,
          }))
        )
        .filter((x) => x.value);
      const packages = (packagesRes.data?.items || []).map((wp) => ({
        value: wp.wbs_code || wp.package_code || String(wp.id),
        label: `${wp.wbs_code || wp.package_code || ""}${wp.package_name ? ` — ${wp.package_name}` : ""}`,
      }));
      setWorkPlans([...new Map([...nested, ...packages].map((x) => [x.value, x])).values()]);
      setTasks(tasksRes.data?.items || []);
    });
    return () => {
      mounted = false;
    };
  }, [form.project_id]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const total = issues.length;
    const open = issues.filter((i) => !CLOSED_STATUSES.has(i.status) && ["OPEN", "ASSIGNED"].includes(i.status)).length;
    const inProgress = issues.filter((i) => i.status === "IN_PROGRESS").length;
    const overdue = issues.filter((i) => i.is_overdue).length;
    const pendingReview = issues.filter((i) => i.status === "PENDING_REVIEW").length;
    const closed = issues.filter((i) => i.status === "CLOSED").length;
    return { total, open, inProgress, overdue, pendingReview, closed };
  }, [issues]);

  // Filtering & Sorting
  const filteredIssues = useMemo(() => {
    const term = query.trim().toLowerCase();
    return issues
      .filter((item) => {
        const matchesTerm =
          !term ||
          [
            item.reference_no,
            item.project_name,
            item.wbs_code,
            item.task_name,
            item.issue_title,
            item.description,
            item.category,
            item.assigned_to,
            item.responsible_department,
            item.location,
          ].some((v) => String(v || "").toLowerCase().includes(term));

        const matchesStatus = !statusFilter || item.status === statusFilter;
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        const matchesSeverity = !severityFilter || item.severity === severityFilter;
        const matchesPriority = !priorityFilter || item.priority === priorityFilter;
        const matchesOverdue = !overdueOnly || Boolean(item.is_overdue);

        return matchesTerm && matchesStatus && matchesCategory && matchesSeverity && matchesPriority && matchesOverdue;
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
        return sortDirection === "asc" ? cmp : -cmp;
      });
  }, [issues, query, statusFilter, categoryFilter, severityFilter, priorityFilter, overdueOnly, sortKey, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(filteredIssues.length / pageSize));
  const pageItems = filteredIssues.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, categoryFilter, severityFilter, priorityFilter, overdueOnly, projectFilter, pageSize]);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const openNew = () => {
    setEditingId(null);
    setForm(emptyIssue());
    setFormTab("general");
    setWorkPlans([]);
    setTasks([]);
    setFormOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm(normalizeForForm(item));
    setFormTab("general");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyIssue());
  };

  const saveIssue = async (e) => {
    if (e) e.preventDefault();
    if (!form.project_id || !form.issue_title.trim() || !form.description.trim()) {
      toast.error("Project, issue title, and description are required");
      return;
    }
    if (form.status === "CLOSED" && form.verification_required && form.verification_result !== "VERIFIED") {
      toast.error("Inspection verification is required before closing this issue.");
      return;
    }
    const payload = {
      ...form,
      project_id: Number(form.project_id),
      supporting_documents: encodeLinks(form.supporting_documents),
      before_after_evidence: encodeLinks(form.before_after_evidence),
      additional_cost: Number(form.additional_cost || 0),
      verification_required: form.verification_required ? 1 : 0,
    };
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/construction/project-issues/${editingId}`, payload);
        toast.success("Issue successfully updated");
      } else {
        await api.post("/construction/project-issues", payload);
        toast.success("New issue logged successfully");
      }
      closeForm();
      await loadIssues();
    } catch (e2) {
      toast.error(e2?.response?.data?.message || "Failed to save issue");
    } finally {
      setSaving(false);
    }
  };

  // Quick Status Transitions
  const handleTransition = async (item, targetStatus, extraPayload = {}) => {
    const next = normalizeForForm(item);
    next.status = targetStatus;

    if (targetStatus === "ASSIGNED" && !next.assigned_date) next.assigned_date = today();
    if (targetStatus === "IN_PROGRESS" && !next.resolution_start_date) next.resolution_start_date = today();
    if (targetStatus === "CLOSED") next.closure_date = today();
    if (targetStatus === "VERIFIED") {
      next.verification_result = "VERIFIED";
      next.review_date = today();
    }

    const merged = { ...next, ...extraPayload };
    try {
      await api.put(`/construction/project-issues/${item.id}`, {
        ...merged,
        project_id: Number(merged.project_id),
        supporting_documents: encodeLinks(merged.supporting_documents),
        before_after_evidence: encodeLinks(merged.before_after_evidence),
      });
      toast.success(`Issue ${item.reference_no} updated to ${STATUS_CONFIG[targetStatus]?.label || targetStatus}`);
      loadIssues();
      if (viewIssue?.id === item.id) {
        setViewIssue(null);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to change issue status");
    }
  };

  const handleRejectPrompt = (item) => {
    setRejectModalIssue(item);
    setRejectionReasonText("");
  };

  const submitRejection = async () => {
    if (!rejectModalIssue) return;
    if (!rejectionReasonText.trim()) {
      toast.error("Please provide a rejection reason for returning to In Progress.");
      return;
    }
    await handleTransition(rejectModalIssue, "IN_PROGRESS", {
      verification_result: "REJECTED",
      rejection_reason: rejectionReasonText.trim(),
      status_comment: `Resolution rejected: ${rejectionReasonText.trim()}`,
    });
    setRejectModalIssue(null);
    setRejectionReasonText("");
  };

  const openHistory = async (item) => {
    setHistoryIssue(item);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/construction/project-issues/${item.id}/history`);
      setHistory(res.data?.items || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load issue history");
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Snag & Punch Issues");
    const columns = [
      "Reference Number",
      "Project",
      "WBS / Work Package",
      "Issue Title",
      "Category",
      "Severity",
      "Priority",
      "Assigned To",
      "Due Date",
      "Status",
      "Additional Cost (GH₵)",
    ];
    sheet.addRow(columns);
    filteredIssues.forEach((i) =>
      sheet.addRow([
        i.reference_no,
        i.project_name || "",
        i.wbs_code || "",
        i.issue_title,
        CATEGORY_LABELS[i.category] || display(i.category),
        display(i.severity),
        display(i.priority),
        i.assigned_to || "",
        i.target_resolution_date ? String(i.target_resolution_date).slice(0, 10) : "",
        STATUS_CONFIG[i.status]?.label || display(i.status),
        Number(i.additional_cost || 0).toFixed(2),
      ])
    );
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E3646" } };
    sheet.columns.forEach((col) => {
      col.width = Math.min(42, Math.max(14, ...sheet.getColumn(col.number).values.map((v) => String(v || "").length + 2)));
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `snag-punch-list-resolution-${today()}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.setTextColor(14, 54, 70);
    doc.text("Snag & Punch List Resolution Register", 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date().toLocaleString()} · Total Records: ${filteredIssues.length}`, 14, 21);

    autoTable(doc, {
      startY: 26,
      head: [["Ref #", "Project", "WBS / Pkg", "Issue Title", "Category", "Severity", "Assignee", "Due Date", "Status"]],
      body: filteredIssues.map((i) => [
        i.reference_no,
        i.project_name || "—",
        i.wbs_code || "—",
        i.issue_title,
        CATEGORY_LABELS[i.category] || display(i.category),
        display(i.severity),
        i.assigned_to || "—",
        i.target_resolution_date ? String(i.target_resolution_date).slice(0, 10) : "—",
        STATUS_CONFIG[i.status]?.label || display(i.status),
      ]),
      styles: { fontSize: 7, cellPadding: 2.5 },
      headStyles: { fillColor: [14, 54, 70], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    doc.save(`snag-punch-list-resolution-${today()}.pdf`);
  };

  const sortBy = (key) => {
    setSortKey((prev) => {
      if (prev === key) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
      else setSortDirection("asc");
      return key;
    });
  };

  const resetFilters = () => {
    setQuery("");
    setProjectFilter("");
    setStatusFilter("");
    setCategoryFilter("");
    setSeverityFilter("");
    setPriorityFilter("");
    setOverdueOnly(false);
  };

  const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] || display(c) }));
  const taskOptions = tasks
    .filter((task) => !form.wbs_code || !task.wbs_code || String(task.wbs_code) === String(form.wbs_code))
    .map((task) => ({ value: task.task_title, label: task.task_title }))
    .filter((t) => t.value);
  const userOptions = users.map((u) => ({
    value: u.username || u.full_name || String(u.id),
    label: u.full_name ? `${u.full_name} (${u.username || u.id})` : u.username || `User ${u.id}`,
  }));
  const departmentOptions = departments.map((d) => ({ value: d.department_name || d.name, label: d.department_name || d.name })).filter((d) => d.value);
  const vendorOptions = vendors.map((v) => ({ value: v.supplier_name || v.name, label: v.supplier_name || v.name })).filter((v) => v.value);

  return (
    <main className={`space-y-6 pb-12 ${embedded ? "p-0" : ""}`}>
      {/* Page Header */}
      {!embedded && (
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              title="Go back to previous page"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ShieldAlert size={24} className="text-brand-900 dark:text-brand-400" /> Defect & Issue Management
                </h1>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                General-purpose defect tracking, punch list rectification, verification and practical completion workflow across all project phases.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary inline-flex items-center gap-2 text-sm font-semibold shadow-sm"
              onClick={exportExcel}
            >
              <FileSpreadsheet size={15} /> Export Excel
            </button>
            <button
              type="button"
              className="btn btn-secondary inline-flex items-center gap-2 text-sm font-semibold shadow-sm"
              onClick={exportPdf}
            >
              <Download size={15} /> Export PDF
            </button>
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2 text-sm font-semibold shadow-sm"
              onClick={openNew}
            >
              <Plus size={16} /> Log New Issue
            </button>
          </div>
        </header>
      )}

      {/* Metric Stats Cards Carousel */}
      <MobileMovingCarousel data-page-carousel gridColsClass="xl:grid-cols-6 md:grid-cols-3 sm:grid-cols-2" gapClass="gap-4">
        {[
          {
            label: "Total Issues",
            value: kpis.total,
            icon: Layers,
            badgeColor: "bg-indigo-600 dark:bg-indigo-500 text-white",
            active: !statusFilter && !overdueOnly,
            onClick: () => {
              setStatusFilter("");
              setOverdueOnly(false);
            },
          },
          {
            label: "Open Issues",
            value: kpis.open,
            icon: AlertCircle,
            badgeColor: "bg-amber-500 text-white",
            active: statusFilter === "OPEN",
            onClick: () => {
              setStatusFilter("OPEN");
              setOverdueOnly(false);
            },
          },
          {
            label: "In Progress",
            value: kpis.inProgress,
            icon: Clock3,
            badgeColor: "bg-sky-600 dark:bg-sky-500 text-white",
            active: statusFilter === "IN_PROGRESS",
            onClick: () => {
              setStatusFilter("IN_PROGRESS");
              setOverdueOnly(false);
            },
          },
          {
            label: "Overdue",
            value: kpis.overdue,
            icon: AlertTriangle,
            badgeColor: "bg-rose-600 text-white",
            active: overdueOnly,
            onClick: () => {
              setOverdueOnly((prev) => !prev);
              setStatusFilter("");
            },
          },
          {
            label: "Pending Review",
            value: kpis.pendingReview,
            icon: ShieldCheck,
            badgeColor: "bg-purple-600 text-white",
            active: statusFilter === "PENDING_REVIEW",
            onClick: () => {
              setStatusFilter("PENDING_REVIEW");
              setOverdueOnly(false);
            },
          },
          {
            label: "Closed",
            value: kpis.closed,
            icon: CheckCircle2,
            badgeColor: "bg-emerald-600 text-white",
            active: statusFilter === "CLOSED",
            onClick: () => {
              setStatusFilter("CLOSED");
              setOverdueOnly(false);
            },
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className={`card p-6 min-h-[160px] flex items-center justify-between bg-white dark:bg-slate-900 border rounded-2xl shadow-sm text-left transition-all hover:shadow-md cursor-pointer ${
                card.active
                  ? "border-brand-500 ring-2 ring-brand-500/20"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {card.label}
                </p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {card.value}
                  </span>
                  {kpis.total > 0 && card.label !== "Total Issues" && (
                    <span className="text-xs font-medium text-slate-400">
                      {Math.round((card.value / kpis.total) * 100)}%
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`p-3 rounded-full flex items-center justify-center text-white shadow-sm shrink-0 ${card.badgeColor}`}
              >
                <Icon size={20} className="stroke-[2.5]" />
              </div>
            </button>
          );
        })}
      </MobileMovingCarousel>

      {/* Filter and Search Bar without Quick Tabs */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6 items-center">
          <div className="relative lg:col-span-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input w-full pl-9 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reference, project, issue title, assignee, WBS…"
            />
            {query && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <SelectInput
            value={projectFilter}
            onChange={setProjectFilter}
            placeholder="All Projects"
            options={projects.map((p) => ({ value: String(p.id), label: p.project_name || p.name }))}
            className="text-xs"
          />

          <SelectInput
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All Statuses"
            options={STATUSES.map((s) => ({ value: s, label: STATUS_CONFIG[s]?.label || display(s) }))}
            className="text-xs"
          />

          <SelectInput
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="All Categories"
            options={categoryOptions}
            className="text-xs"
          />

          <div className="flex items-center gap-2">
            <SelectInput
              value={severityFilter}
              onChange={setSeverityFilter}
              placeholder="All Severities"
              options={SEVERITIES.map((s) => ({ value: s, label: SEVERITY_CONFIG[s]?.label || display(s) }))}
              className="text-xs flex-1"
            />
            {(query || projectFilter || statusFilter || categoryFilter || severityFilter || priorityFilter || overdueOnly) && (
              <button
                type="button"
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0"
                onClick={resetFilters}
                title="Reset all filters"
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Defect & Issue Register Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Defect & Issue Register
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {filteredIssues.length} {filteredIssues.length === 1 ? "record" : "records"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
              <tr>
                {[
                  ["reference_no", "Reference Number"],
                  ["project_name", "Project"],
                  ["wbs_code", "WBS / Work Package"],
                  ["issue_title", "Issue Title"],
                  ["category", "Category"],
                  ["severity", "Severity"],
                  ["assigned_to", "Assigned To"],
                  ["target_resolution_date", "Due Date"],
                  ["status", "Status"],
                ].map(([key, title]) => (
                  <th key={key} className="p-3 select-none">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      onClick={() => sortBy(key)}
                    >
                      {title}
                      <ArrowDownUp size={11} className={sortKey === key ? "text-brand-600" : "opacity-30"} />
                    </button>
                  </th>
                ))}
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-500">
                    <RefreshCw size={22} className="mx-auto mb-2 animate-spin text-brand-600" />
                    Loading issue records…
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-500">
                    <AlertCircle size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No issues match the selected filters.</p>
                    <p className="mt-1 text-xs text-slate-400">Try loosening your search criteria or log a new issue.</p>
                  </td>
                </tr>
              ) : (
                pageItems.map((item) => {
                  const statusConf = STATUS_CONFIG[item.status] || {
                    label: display(item.status),
                    bg: "bg-slate-100",
                    text: "text-slate-700",
                    border: "border-slate-300",
                    dot: "bg-slate-400",
                  };
                  const sevConf = SEVERITY_CONFIG[item.severity] || {
                    label: display(item.severity),
                    badge: "bg-slate-100 text-slate-700 border-slate-300",
                  };

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                    >
                      {/* Reference Number */}
                      <td className="p-3 font-mono font-bold text-brand-700 dark:text-brand-400 whitespace-nowrap">
                        <button
                          type="button"
                          className="hover:underline text-left"
                          onClick={() => setViewIssue(item)}
                          title="Click to view complete details"
                        >
                          {item.reference_no}
                        </button>
                      </td>

                      {/* Project */}
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-100 max-w-[180px] truncate" title={item.project_name}>
                        {item.project_name || "—"}
                      </td>

                      {/* WBS / Work Package */}
                      <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.wbs_code ? (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {item.wbs_code}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Issue Title */}
                      <td className="max-w-[260px] p-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate" title={item.issue_title}>
                          {item.issue_title}
                        </div>
                        {item.location && (
                          <div className="text-[11px] text-slate-400 truncate">
                            Loc: {item.location}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {CATEGORY_LABELS[item.category] || display(item.category)}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${sevConf.badge}`}
                        >
                          {sevConf.label}
                        </span>
                      </td>

                      {/* Assigned To */}
                      <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {item.assigned_to ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                              {item.assigned_to.slice(0, 1).toUpperCase()}
                            </div>
                            <span className="font-medium truncate max-w-[120px]">{item.assigned_to}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Due Date & Overdue */}
                      <td className="p-3 whitespace-nowrap">
                        {item.target_resolution_date ? (
                          <div className="flex flex-col">
                            <span className={`font-medium ${item.is_overdue ? "font-bold text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
                              {String(item.target_resolution_date).slice(0, 10)}
                            </span>
                            {item.is_overdue && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-tight text-rose-600 dark:text-rose-400">
                                <Clock size={10} /> Overdue
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConf.dot}`} />
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Quick Workflow Action Button */}
                          {item.status === "OPEN" && (
                            <button
                              type="button"
                              className="rounded bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                              onClick={() => openEdit(item)}
                              title="Assign issue"
                            >
                              Assign
                            </button>
                          )}
                          {item.status === "ASSIGNED" && (
                            <button
                              type="button"
                              className="rounded bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300"
                              onClick={() => handleTransition(item, "IN_PROGRESS")}
                              title="Start resolution work"
                            >
                              Start
                            </button>
                          )}
                          {item.status === "IN_PROGRESS" && (
                            <button
                              type="button"
                              className="rounded bg-purple-50 px-2 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300"
                              onClick={() => handleTransition(item, "PENDING_REVIEW")}
                              title="Submit for review & verification"
                            >
                              Submit Review
                            </button>
                          )}
                          {item.status === "PENDING_REVIEW" && (
                            <>
                              <button
                                type="button"
                                className="rounded bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-300"
                                onClick={() => handleTransition(item, "VERIFIED")}
                                title="Pass verification"
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                className="rounded bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:text-rose-300"
                                onClick={() => handleRejectPrompt(item)}
                                title="Reject and return to In Progress"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {item.status === "VERIFIED" && (
                            <button
                              type="button"
                              className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                              onClick={() => handleTransition(item, "CLOSED")}
                              title="Sign-off and close issue"
                            >
                              Close
                            </button>
                          )}

                          <button
                            type="button"
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            onClick={() => openEdit(item)}
                            title="Edit Issue"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            onClick={() => openHistory(item)}
                            title="View Audit History"
                          >
                            <HistoryIcon size={14} />
                          </button>
                          <button
                            type="button"
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            onClick={() => setAttachmentsIssue(item)}
                            title="Attachments & Evidence"
                          >
                            <Paperclip size={14} />
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

        {/* Table Pagination */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs dark:border-slate-800">
          <div className="text-slate-500">
            Showing {filteredIssues.length ? (page - 1) * pageSize + 1 : 0}–
            {Math.min(page * pageSize, filteredIssues.length)} of {filteredIssues.length} issues
          </div>
          <div className="flex items-center gap-2">
            <select
              className="input py-1 text-sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <button
              className="btn btn-secondary py-1 text-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {page} / {pageCount}
            </span>
            <button
              className="btn btn-secondary py-1 text-sm"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {/* CREATE / EDIT ISSUE MODAL */}
      {formOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-3 sm:p-6 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="mx-auto my-2 max-w-5xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <form onSubmit={saveIssue}>
              {/* Modal Header */}
              <div className="sticky top-0 z-20 flex items-center justify-between gap-3 rounded-t-2xl border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {editingId ? `Edit Issue: ${form.reference_no || ""}` : "Log New Project Issue"}
                    </h2>
                    {editingId && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          STATUS_CONFIG[form.status]?.bg || "bg-slate-100"
                        } ${STATUS_CONFIG[form.status]?.text || "text-slate-700"}`}
                      >
                        {STATUS_CONFIG[form.status]?.label || form.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Defect, punch list, non-conformance, and corrective-action record
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  onClick={closeForm}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Section Navigation Tabs */}
              <div className="flex border-b border-slate-200 bg-slate-50 px-6 overflow-x-auto dark:border-slate-800 dark:bg-slate-900/50">
                {[
                  { key: "general", label: "1. General Information" },
                  { key: "classification", label: "2. Classification" },
                  { key: "assignment", label: "3. Assignment" },
                  { key: "resolution", label: "4. Resolution" },
                  { key: "review", label: "5. Review & Verification" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFormTab(tab.key)}
                    className={`whitespace-nowrap border-b-2 py-3 px-4 text-xs font-bold transition-colors ${
                      formTab === tab.key
                        ? "border-brand-600 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Form Tab Contents */}
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* 1. General Information */}
                {formTab === "general" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Field label="Reference Number" helper="Auto-generated by system">
                        <TextInput
                          value={form.reference_no || "Auto-generated upon save"}
                          onChange={() => {}}
                          readOnly
                          className="bg-slate-100 font-mono font-bold dark:bg-slate-800"
                        />
                      </Field>

                      <Field label="Project" required>
                        <SelectInput
                          value={form.project_id}
                          onChange={(v) => {
                            setField("project_id", v);
                            setField("wbs_code", "");
                            setField("task_name", "");
                          }}
                          placeholder="Select project"
                          options={projects.map((p) => ({ value: String(p.id), label: p.project_name || p.name }))}
                        />
                      </Field>

                      <Field label="WBS / Work Package" helper="Optional project work package">
                        <SelectInput
                          value={form.wbs_code}
                          onChange={(v) => {
                            setField("wbs_code", v);
                            setField("task_name", "");
                          }}
                          placeholder="Select Work Package"
                          options={workPlans}
                          disabled={!form.project_id}
                        />
                      </Field>

                      <Field label="Task / Activity" helper="Optional linked activity">
                        <SelectInput
                          value={form.task_name}
                          onChange={(v) => setField("task_name", v)}
                          placeholder="Select Activity"
                          options={taskOptions}
                          disabled={!form.project_id}
                        />
                      </Field>

                      <Field label="Date Identified">
                        <TextInput
                          type="date"
                          value={form.date_identified}
                          onChange={(v) => setField("date_identified", v)}
                        />
                      </Field>

                      <Field label="Identified By">
                        <SelectInput
                          value={form.identified_by}
                          onChange={(v) => setField("identified_by", v)}
                          placeholder="Select employee"
                          options={userOptions}
                        />
                      </Field>

                      <Field label="Location / Department">
                        <TextInput
                          value={form.location}
                          onChange={(v) => setField("location", v)}
                          placeholder="e.g. Floor 2, Server Room, or Unit"
                        />
                      </Field>

                      <Field label="Department">
                        <SelectInput
                          value={form.department}
                          onChange={(v) => setField("department", v)}
                          placeholder="Select department"
                          options={departmentOptions}
                        />
                      </Field>

                      <Field label="Status">
                        <SelectInput
                          value={form.status}
                          onChange={(v) => setField("status", v)}
                          options={STATUSES.map((s) => ({ value: s, label: STATUS_CONFIG[s]?.label || display(s) }))}
                        />
                      </Field>
                    </div>

                    <Field label="Issue Title" required>
                      <TextInput
                        value={form.issue_title}
                        onChange={(v) => setField("issue_title", v)}
                        placeholder="Concise defect or issue title"
                        required
                      />
                    </Field>

                    <Field label="Description" required>
                      <TextArea
                        value={form.description}
                        onChange={(v) => setField("description", v)}
                        placeholder="Detailed description of the issue, observation, defect, or non-conformance…"
                        required
                        rows={4}
                      />
                    </Field>
                  </div>
                )}

                {/* 2. Classification */}
                {formTab === "classification" && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Classify the issue by category, technical severity, schedule priority, and organizational impact.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="Category" required>
                        <SelectInput
                          value={form.category}
                          onChange={(v) => setField("category", v)}
                          options={categoryOptions}
                        />
                      </Field>

                      <Field label="Severity" required>
                        <SelectInput
                          value={form.severity}
                          onChange={(v) => setField("severity", v)}
                          options={SEVERITIES.map((s) => ({ value: s, label: SEVERITY_CONFIG[s]?.label || display(s) }))}
                        />
                      </Field>

                      <Field label="Priority" required>
                        <SelectInput
                          value={form.priority}
                          onChange={(v) => setField("priority", v)}
                          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_CONFIG[p]?.label || display(p) }))}
                        />
                      </Field>

                      <Field label="Impact Area">
                        <SelectInput
                          value={form.impact}
                          onChange={(v) => setField("impact", v)}
                          placeholder="Select primary impact"
                          options={IMPACTS.map((i) => ({ value: i, label: display(i) }))}
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {/* 3. Assignment */}
                {formTab === "assignment" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Field label="Responsible Department">
                        <SelectInput
                          value={form.responsible_department}
                          onChange={(v) => setField("responsible_department", v)}
                          placeholder="Select department"
                          options={departmentOptions}
                        />
                      </Field>

                      <Field label="Assigned To (Employee)">
                        <SelectInput
                          value={form.assigned_to}
                          onChange={(v) => setField("assigned_to", v)}
                          placeholder="Select employee"
                          options={userOptions}
                        />
                      </Field>

                      <Field label="Contractor / Vendor (Optional)">
                        <SelectInput
                          value={form.contractor_vendor}
                          onChange={(v) => setField("contractor_vendor", v)}
                          placeholder="Select vendor"
                          options={vendorOptions}
                        />
                      </Field>

                      <Field label="Assigned Date">
                        <TextInput
                          type="date"
                          value={form.assigned_date}
                          onChange={(v) => setField("assigned_date", v)}
                        />
                      </Field>

                      <Field label="Target Resolution Date (Due Date)">
                        <TextInput
                          type="date"
                          value={form.target_resolution_date}
                          onChange={(v) => setField("target_resolution_date", v)}
                        />
                      </Field>
                    </div>

                    <Field label="Required Corrective Action">
                      <TextArea
                        value={form.required_corrective_action}
                        onChange={(v) => setField("required_corrective_action", v)}
                        placeholder="Specific remedial action, replacement, rework, or corrective procedure required…"
                        rows={3}
                      />
                    </Field>
                  </div>
                )}

                {/* 4. Resolution */}
                {formTab === "resolution" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Field label="Resolution Start Date">
                        <TextInput
                          type="date"
                          value={form.resolution_start_date}
                          onChange={(v) => setField("resolution_start_date", v)}
                        />
                      </Field>

                      <Field label="Completion Date">
                        <TextInput
                          type="date"
                          value={form.completion_date}
                          onChange={(v) => setField("completion_date", v)}
                        />
                      </Field>

                      <Field label="Additional Cost (GH₵)">
                        <TextInput
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.additional_cost}
                          onChange={(v) => setField("additional_cost", v)}
                          placeholder="0.00"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="Proposed Solution">
                        <TextArea
                          value={form.proposed_solution}
                          onChange={(v) => setField("proposed_solution", v)}
                          placeholder="Proposed method or engineering solution…"
                          rows={3}
                        />
                      </Field>

                      <Field label="Actual Action Taken">
                        <TextArea
                          value={form.actual_action_taken}
                          onChange={(v) => setField("actual_action_taken", v)}
                          placeholder="Details of the physical rectification or corrective action completed…"
                          rows={3}
                        />
                      </Field>
                    </div>

                    <Field label="Resolution Remarks">
                      <TextArea
                        value={form.resolution_remarks}
                        onChange={(v) => setField("resolution_remarks", v)}
                        placeholder="Final remarks or handover notes from the resolution team…"
                        rows={2}
                      />
                    </Field>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field
                        label="Supporting Document URLs (one per line)"
                        helper="e.g. test certificates, technical memos, or drawings"
                      >
                        <TextArea
                          value={form.supporting_documents}
                          onChange={(v) => setField("supporting_documents", v)}
                          placeholder="https://...&#10;https://..."
                          rows={2}
                        />
                      </Field>

                      <Field
                        label="Before / After Photographic Evidence URLs (one per line)"
                        helper="e.g. photo links documenting before & after rectification"
                      >
                        <TextArea
                          value={form.before_after_evidence}
                          onChange={(v) => setField("before_after_evidence", v)}
                          placeholder="https://...&#10;https://..."
                          rows={2}
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {/* 5. Review & Verification */}
                {formTab === "review" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.verification_required}
                          onChange={(e) => setField("verification_required", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Formal Inspection & Verification Required
                          </span>
                          <p className="text-xs text-slate-500">
                            When enabled, this issue cannot be closed until a designated reviewer inspects and passes verification.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Field label="Designated Reviewer / Inspector">
                        <SelectInput
                          value={form.reviewer}
                          onChange={(v) => setField("reviewer", v)}
                          placeholder="Select reviewer"
                          options={userOptions}
                        />
                      </Field>

                      <Field label="Review / Inspection Date">
                        <TextInput
                          type="date"
                          value={form.review_date}
                          onChange={(v) => setField("review_date", v)}
                        />
                      </Field>

                      <Field label="Verification Result">
                        <SelectInput
                          value={form.verification_result}
                          onChange={(v) => {
                            setField("verification_result", v);
                            if (v === "VERIFIED") {
                              setField("status", "VERIFIED");
                            } else if (v === "REJECTED") {
                              setField("status", "IN_PROGRESS");
                            }
                          }}
                          placeholder="Select result"
                          options={[
                            { value: "PENDING", label: "Pending Inspection" },
                            { value: "VERIFIED", label: "Verified (Passed)" },
                            { value: "REJECTED", label: "Rejected (Rework Required)" },
                          ]}
                        />
                      </Field>

                      <Field label="Approved By">
                        <SelectInput
                          value={form.approved_by}
                          onChange={(v) => setField("approved_by", v)}
                          placeholder="Select project approver"
                          options={userOptions}
                        />
                      </Field>

                      <Field label="Closure Date">
                        <TextInput
                          type="date"
                          value={form.closure_date}
                          onChange={(v) => setField("closure_date", v)}
                        />
                      </Field>
                    </div>

                    <Field label="Review / Inspection Comments">
                      <TextArea
                        value={form.review_comments}
                        onChange={(v) => setField("review_comments", v)}
                        placeholder="Inspector's observations, punch test result, or QA verification notes…"
                        rows={2}
                      />
                    </Field>

                    {form.verification_result === "REJECTED" && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
                        <Field label="Rejection Reason" required>
                          <TextArea
                            value={form.rejection_reason}
                            onChange={(v) => setField("rejection_reason", v)}
                            placeholder="State exactly why the resolution failed verification and what must be reworked…"
                            required
                            rows={3}
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  {formTab !== "general" && (
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      onClick={() => {
                        const tabs = ["general", "classification", "assignment", "resolution", "review"];
                        const idx = tabs.indexOf(formTab);
                        if (idx > 0) setFormTab(tabs[idx - 1]);
                      }}
                    >
                      Back
                    </button>
                  )}
                  {formTab !== "review" && (
                    <button
                      type="button"
                      className="btn btn-secondary text-sm"
                      onClick={() => {
                        const tabs = ["general", "classification", "assignment", "resolution", "review"];
                        const idx = tabs.indexOf(formTab);
                        if (idx < tabs.length - 1) setFormTab(tabs[idx + 1]);
                      }}
                    >
                      Next Step
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" className="btn btn-secondary text-sm" onClick={closeForm}>
                    Cancel
                  </button>
                  <button className="btn btn-primary text-sm" type="submit" disabled={saving}>
                    {saving ? "Saving…" : editingId ? "Update Issue" : "Create Issue"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ISSUE DETAILS MODAL */}
      {viewIssue && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 sm:p-6 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="mx-auto my-4 max-w-4xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-brand-600 dark:text-brand-400">
                  {viewIssue.reference_no}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    STATUS_CONFIG[viewIssue.status]?.bg || "bg-slate-100"
                  } ${STATUS_CONFIG[viewIssue.status]?.text || "text-slate-700"}`}
                >
                  {STATUS_CONFIG[viewIssue.status]?.label || viewIssue.status}
                </span>
                {viewIssue.is_overdue && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600">
                    <Clock size={12} /> Overdue
                  </span>
                )}
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                onClick={() => setViewIssue(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{viewIssue.issue_title}</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {viewIssue.description}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400">Project</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{viewIssue.project_name || "—"}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400">WBS / Work Package</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{viewIssue.wbs_code || "—"}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400">Category</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {CATEGORY_LABELS[viewIssue.category] || display(viewIssue.category)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400">Severity</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{display(viewIssue.severity)}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400">Assigned To</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{viewIssue.assigned_to || "—"}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400">Target Resolution Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {viewIssue.target_resolution_date ? String(viewIssue.target_resolution_date).slice(0, 10) : "—"}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400">Additional Cost</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    GH₵ {Number(viewIssue.additional_cost || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400">Verification Required</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {Number(viewIssue.verification_required) ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              {viewIssue.required_corrective_action && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Required Corrective Action</h4>
                  <p className="rounded-lg bg-slate-50 p-3 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                    {viewIssue.required_corrective_action}
                  </p>
                </div>
              )}

              {viewIssue.actual_action_taken && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-1">Actual Action Taken</h4>
                  <p className="rounded-lg bg-slate-50 p-3 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300">
                    {viewIssue.actual_action_taken}
                  </p>
                </div>
              )}

              {viewIssue.rejection_reason && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
                  <h4 className="font-bold text-rose-800 dark:text-rose-300 mb-1">Rejection Reason</h4>
                  <p className="text-rose-700 dark:text-rose-400">{viewIssue.rejection_reason}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                className="btn btn-secondary text-sm inline-flex items-center gap-1.5"
                onClick={() => {
                  const it = viewIssue;
                  setViewIssue(null);
                  openHistory(it);
                }}
              >
                <HistoryIcon size={14} /> Audit Trail
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary text-sm"
                  onClick={() => setViewIssue(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary text-sm"
                  onClick={() => {
                    const it = viewIssue;
                    setViewIssue(null);
                    openEdit(it);
                  }}
                >
                  Edit Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION REASON PROMPT MODAL */}
      {rejectModalIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-rose-600">
                <ShieldAlert size={20} />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Reject Resolution · {rejectModalIssue.reference_no}
                </h3>
              </div>
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-slate-600"
                onClick={() => setRejectModalIssue(null)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              Rejecting this resolution will return the issue status to <strong>In Progress</strong> and notify the assigned team member. Please document what failed verification.
            </p>
            <Field label="Rejection Reason & Required Rework" required>
              <TextArea
                value={rejectionReasonText}
                onChange={setRejectionReasonText}
                placeholder="Explain why the inspection failed and what corrective adjustments must be completed…"
                rows={4}
                required
              />
            </Field>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary text-sm"
                onClick={() => setRejectModalIssue(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white"
                onClick={submitRejection}
              >
                Confirm Rejection & Return to In Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT HISTORY MODAL */}
      {historyIssue && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <section className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Audit Trail & History · {historyIssue.reference_no}
                </h2>
                <p className="text-xs text-slate-500">
                  Detailed timeline of status transitions, assignments, and inspections
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                onClick={() => setHistoryIssue(null)}
              >
                <X size={16} />
              </button>
            </div>

            {historyLoading ? (
              <div className="p-8 text-center text-slate-500">
                <RefreshCw size={20} className="mx-auto mb-2 animate-spin text-brand-600" />
                Loading history…
              </div>
            ) : history.length ? (
              <ol className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {history.map((event) => (
                  <li key={event.id} className="relative border-l-2 border-brand-500 pl-4 py-1">
                    <div className="absolute -left-1.5 top-2 h-3 w-3 rounded-full border-2 border-white bg-brand-600 dark:border-slate-900" />
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {display(event.action)}
                        {event.new_status && (
                          <span className="ml-1 text-slate-500 font-normal">
                            ({display(event.old_status)} →{" "}
                            <strong className="text-brand-600 dark:text-brand-400">
                              {STATUS_CONFIG[event.new_status]?.label || display(event.new_status)}
                            </strong>
                            )
                          </span>
                        )}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        {String(event.created_at || "").slice(0, 16).replace("T", " ")}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      By: <span className="font-semibold">{event.changed_by_name || "System"}</span>
                    </p>
                    {event.comments && (
                      <p className="mt-1.5 rounded bg-slate-50 p-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {event.comments}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="p-8 text-center text-xs text-slate-400">No history events logged yet.</p>
            )}

            <div className="mt-5 flex justify-end border-t border-slate-200 pt-3 dark:border-slate-800">
              <button
                type="button"
                className="btn btn-secondary text-sm"
                onClick={() => setHistoryIssue(null)}
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* DOCUMENT ATTACHMENTS MODAL */}
      {attachmentsIssue && (
        <DocumentAttachmentsModal
          open
          docType="project_issue"
          docId={attachmentsIssue.id}
          onClose={() => setAttachmentsIssue(null)}
        />
      )}
    </main>
  );
}
