/**
 * @fileoverview ProjectForm component.
 * Provides functionality for creating and editing projects with integrated
 * contract specifications, Cloudinary document attachments, auto project code generation,
 * and user manager population from adm_users.
 */

import React, { useEffect, useState, useRef, useMemo } from "react";
import Swal from "sweetalert2";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  Briefcase,
  User,
  Activity,
  DollarSign,
  AlertCircle,
  Clock,
  Flag,
  FileText,
  Tag,
  ChevronDown,
  Building,
  MapPin,
  ShieldCheck,
  Plus,
  X,
  Sparkles,
  RefreshCw,
  Trash2,
  Pencil,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import { usePermission } from "@/auth/PermissionContext.jsx";
import CloudinaryDocumentUploader from "../components/CloudinaryDocumentUploader.jsx";

export default function ProjectForm() {
  const { hasExceptional } = usePermission();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [managers, setManagers] = useState([]);
  const [clients, setClients] = useState([]);
  const [showContractSection, setShowContractSection] = useState(false);
  const [isManualCode, setIsManualCode] = useState(Boolean(isEdit));
  const [generatingCode, setGeneratingCode] = useState(false);

  const [projectTypes, setProjectTypes] = useState([]);
  const [form, setForm] = useState({
    project_code: "",
    project_name: "",
    project_type: "GENERAL_CONSTRUCTION",
    client_name: "",
    client_id: "",
    contract_ref_no: "",
    contract_file_url: "",
    attachments: [],
    contract_sum: 0,
    revised_contract_sum: 0,
    retention_percent: 5,
    retention_cap: 0,
    advance_payment_amount: 0,
    advance_recovery_percent: 10,
    site_address: "",
    site_city: "",
    site_gps_lat: "",
    site_gps_lng: "",
    site_engineer_name: "",
    qs_name: "",
    supervisor_name: "",
    commercial_manager_name: "",
    defects_liability_months: 12,
    practical_completion_date: "",
    final_completion_date: "",
    manager_id: "",
    manager_name: "",
    budget: 0,
    project_priority: "MEDIUM",
    project_status: "IN_PROGRESS",
    start_date: "",
    end_date: "",
    remarks: "",
    milestones: [],
    is_active: true,
  });


  // Client / Organization search & SweetAlert states
  const [clientSearch, setClientSearch] = useState("");
  const [isClientOpen, setIsClientOpen] = useState(false);
  const clientContainerRef = useRef(null);
  const lastAlertedClientSearchRef = useRef("");
  const clientSearchTimeoutRef = useRef(null);

  // Milestone Modal states
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [draftMilestones, setDraftMilestones] = useState([]);

  // Sync clientSearch with form.client_name
  useEffect(() => {
    setClientSearch(form.client_name || "");
  }, [form.client_name]);

  // Click outside to close client dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        clientContainerRef.current &&
        !clientContainerRef.current.contains(event.target)
      ) {
        setIsClientOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleClientInputChange = (val) => {
    setClientSearch(val);
    setIsClientOpen(true);
    setForm((prev) => ({ ...prev, client_name: val }));

    if (clientSearchTimeoutRef.current) {
      clearTimeout(clientSearchTimeoutRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length >= 2) {
      clientSearchTimeoutRef.current = setTimeout(() => {
        const lower = trimmed.toLowerCase();
        const matches = clients.filter((c) =>
          (c.customer_name || c.name || "").toLowerCase().includes(lower)
        );
        if (matches.length === 0 && lastAlertedClientSearchRef.current !== lower) {
          lastAlertedClientSearchRef.current = lower;
          Swal.fire({
            title: "Client Not Found",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Add Client",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#0284c7",
            cancelButtonColor: "#64748b",
            customClass: {
              popup: "rounded-2xl dark:bg-slate-900 dark:text-white shadow-2xl border border-slate-200 dark:border-slate-800",
              confirmButton: "btn btn-primary px-4 py-2 text-sm font-semibold rounded-xl",
              cancelButton: "btn btn-secondary px-4 py-2 text-sm font-semibold rounded-xl",
            },
          }).then((result) => {
            if (result.isConfirmed) {
              navigate("/project-management/setup?tab=clients&new=true");
            }
          });
        }
      }, 450);
    }
  };

  const filteredClients = useMemo(() => {
    const activeList = (clients || []).filter(
      (c) =>
        c.is_active === 1 ||
        c.is_active === "1" ||
        c.is_active === true ||
        c.is_active === null ||
        c.is_active === undefined
    );
    if (!clientSearch || !clientSearch.trim()) return activeList;
    const lower = clientSearch.trim().toLowerCase();
    return activeList.filter((c) =>
      (c.customer_name || c.name || "").toLowerCase().includes(lower)
    );
  }, [clients, clientSearch]);

  const openMilestoneModal = () => {
    setDraftMilestones(
      form.milestones && form.milestones.length
        ? JSON.parse(JSON.stringify(form.milestones))
        : []
    );
    setMilestoneModalOpen(true);
  };

  useEffect(() => {
    fetchAuxiliaryData();
    if (isEdit) fetchProject();
  }, [id]);

  const fetchAuxiliaryData = async () => {
    // Populate Project Managers with Full Name from adm_users table
    try {
      const res = await api
        .get("/admin/users", { params: { active: 1 } })
        .catch(() => api.get("/projects/project-managers"));
      const userList =
        res.data?.data?.items ||
        res.data?.items ||
        (Array.isArray(res.data) ? res.data : []);
      setManagers(userList);
    } catch (e) {
      try {
        const res2 = await api.get("/projects/project-managers");
        setManagers(res2.data?.items || []);
      } catch (err) {}
    }

    try {
      const res = await api.get("/sales/customers?service_customer=Y");
      setClients(res.data?.items || res.data?.data?.items || []);
    } catch (e) {}
  };

  const fetchProject = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/projects/projects/${id}`);
      if (res.data?.item) {
        const item = res.data.item;
        const parsedAttachments = Array.isArray(item.attachments)
          ? item.attachments
          : item.attachments && typeof item.attachments === "string"
          ? JSON.parse(item.attachments)
          : item.contract_file_url
          ? [
              {
                url: item.contract_file_url,
                filename: item.contract_file_url.split("/").pop(),
              },
            ]
          : [];

        setForm({
          ...item,
          start_date: item.start_date ? item.start_date.split("T")[0] : "",
          end_date: item.end_date ? item.end_date.split("T")[0] : "",
          practical_completion_date: item.practical_completion_date
            ? item.practical_completion_date.split("T")[0]
            : "",
          final_completion_date: item.final_completion_date
            ? item.final_completion_date.split("T")[0]
            : "",
          attachments: parsedAttachments,
          milestones: item.milestones || [],
          is_active: item.is_active !== "N",
        });

        if (
          item.contract_ref_no ||
          Number(item.contract_sum) > 0 ||
          item.contract_file_url ||
          parsedAttachments.length > 0
        ) {
          setShowContractSection(true);
        }
      }
    } catch (e) {
      toast.error("Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

  // Helper to compute local preview project code:
  // format: (first letter of first 3 words / start month / start year / chronological seq)
  const computeClientProjectCode = (name, startDate) => {
    let prefix = "PRJ";
    if (name && name.trim()) {
      const words = name.trim().split(/\s+/).filter(Boolean);
      if (words.length >= 3) {
        prefix = (words[0][0] + words[1][0] + words[2][0])
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase();
      } else if (words.length === 2) {
        prefix = (words[0][0] + words[1][0])
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase();
      } else if (words.length === 1) {
        prefix = words[0].slice(0, 3).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      }
    }
    if (!prefix) prefix = "PRJ";

    const d = startDate ? new Date(startDate) : new Date();
    const validDate = isNaN(d.getTime()) ? new Date() : d;
    const month = String(validDate.getMonth() + 1).padStart(2, "0");
    const year = String(validDate.getFullYear());
    return `${prefix}/${month}/${year}/001`;
  };

  // Auto-generate project code live when project name or start date changes
  const autoGenerateCode = async (name, startDate) => {
    if (!name || !name.trim()) return;
    try {
      setGeneratingCode(true);
      const res = await api.get("/projects/generate-code", {
        params: { name: name.trim(), start_date: startDate || "" },
      });
      if (res.data?.code) {
        setForm((prev) => ({ ...prev, project_code: res.data.code }));
      }
    } catch (e) {
      // Fallback to client computation
      const fallback = computeClientProjectCode(name, startDate);
      setForm((prev) => ({ ...prev, project_code: fallback }));
    } finally {
      setGeneratingCode(false);
    }
  };

  // Trigger auto code generation when title or date changes (if not manually overridden)
  const timerRef = useRef(null);
  useEffect(() => {
    if (isEdit || isManualCode) return;
    if (!form.project_name || form.project_name.trim().length < 2) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      autoGenerateCode(form.project_name, form.start_date);
    }, 400);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [form.project_name, form.start_date, isManualCode, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/projects/projects/${id}`, form);
        toast.success("Project updated successfully");
      } else {
        await api.post("/projects/projects", form);
        toast.success("New project initialized");
      }
      navigate("/project-management/projects");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-20 text-center animate-pulse font-bold text-slate-300 text-2xl uppercase tracking-widest italic">
        Loading Project Data...
      </div>
    );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Link
            to="/project-management/projects"
            className="btn btn-secondary p-2.5 rounded-xl"
            title="Back to Projects"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isEdit ? "Edit Project" : "New Project"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              Portfolio Management Entry
            </p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="btn btn-primary inline-flex items-center gap-2 self-start sm:self-auto px-5 py-2.5 rounded-xl font-semibold shadow-sm active:scale-95 transition-all"
        >
          {saving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {isEdit ? "Save Changes" : "Create Project"}
        </button>
      </div>

      {/* Main Full-Width Form Structure */}
      <div className="space-y-6">
        {/* Section A & B Integrated Horizontally Across Full Page */}
        <div className="card p-6 sm:p-8 space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 text-brand-900 dark:text-brand-300 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Briefcase size={20} />
            <h2 className="font-bold uppercase text-xs tracking-wider">
              Primary Information & Timeline
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Project Code with Auto-Creation Support */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Project Code
                </label>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualCode(false);
                      autoGenerateCode(form.project_name, form.start_date);
                    }}
                    className="text-[11px] text-brand-700 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium"
                    title="Auto-generate code based on title and start date"
                  >
                    <Sparkles size={11} className={generatingCode ? "animate-spin" : ""} />
                    <span>Auto-create</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  className="input w-full font-mono text-xs"
                  placeholder="Auto (e.g. KNI/11/2026/001)"
                  value={form.project_code}
                  onChange={(e) => {
                    setIsManualCode(true);
                    setForm({ ...form, project_code: e.target.value });
                  }}
                />
                {generatingCode && (
                  <Loader2
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-600 animate-spin pointer-events-none"
                  />
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {isManualCode
                  ? "Custom code entered"
                  : "Auto-creates as (Initials/Month/Year/Chronological No.)"}
              </p>
            </div>

            {/* Project Title */}
            <div className="space-y-1.5 md:col-span-1 lg:col-span-2">
              <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                className="input w-full"
                placeholder="e.g. Kwame Nkrumah Interchange Phase 2"
                value={form.project_name}
                onChange={(e) =>
                  setForm({ ...form, project_name: e.target.value })
                }
              />
            </div>

            {/* Priority (from Section B) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                Priority
              </label>
              <select
                className="input w-full font-medium"
                value={form.project_priority}
                onChange={(e) =>
                  setForm({ ...form, project_priority: e.target.value })
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            {/* Client / Organization */}
            <div className="space-y-1.5 md:col-span-2" ref={clientContainerRef}>
              <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                Client / Organization
              </label>

              <div className="relative">
                <input
                  type="text"
                  className="input w-full pr-10"
                  placeholder="Type or select client..."
                  value={clientSearch}
                  onFocus={() => setIsClientOpen(true)}
                  onChange={(e) => handleClientInputChange(e.target.value)}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setIsClientOpen(!isClientOpen)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${isClientOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isClientOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 animate-in fade-in duration-150">
                    {filteredClients.length > 0 ? (
                      filteredClients.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setForm((prev) => ({
                              ...prev,
                              client_name: c.customer_name,
                              client_id: c.id,
                            }));
                            setClientSearch(c.customer_name);
                            setIsClientOpen(false);
                            lastAlertedClientSearchRef.current = "";
                          }}
                          className={`px-3.5 py-2 text-xs font-medium cursor-pointer transition-colors flex items-center justify-between ${
                            form.client_name === c.customer_name
                              ? "bg-brand-50 text-brand-900 dark:bg-brand-950/50 dark:text-brand-300 font-bold"
                              : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span>{c.customer_name}</span>
                          {form.client_name === c.customer_name && (
                            <CheckCircle size={14} className="text-brand-600 dark:text-brand-400" />
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center space-y-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No client found matching "{clientSearch}".
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsClientOpen(false);
                            navigate("/project-management/setup?tab=clients&new=true");
                          }}
                          className="btn btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 font-semibold mx-auto"
                        >
                          <Plus size={13} /> Add Client in Operations Setup
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Project Manager: Populates Full Name directly from adm_users */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                Project Manager
              </label>
              <div className="relative">
                <select
                  className="input w-full appearance-none pr-10"
                  value={form.manager_id}
                  onChange={(e) => {
                    const m = managers.find(
                      (x) =>
                        String(x.id || x.user_id) === String(e.target.value),
                    );
                    const displayName =
                      m?.full_name?.trim() || m?.username || "";
                    setForm({
                      ...form,
                      manager_id: e.target.value,
                      manager_name: displayName,
                    });
                  }}
                >
                  <option value="">Select Manager...</option>
                  {managers.map((m) => {
                    const mId = m.id || m.user_id;
                    const fullName = m.full_name?.trim();
                    const label = fullName
                      ? `${fullName} (${m.username})`
                      : m.username;
                    return (
                      <option key={mId} value={mId}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={16}
                />
              </div>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                Start Date
              </label>
              <input
                type="date"
                className="input w-full"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
                disabled={isEdit && !hasExceptional("DOCUMENT.EDIT_DATE")}
              />
            </div>

            {/* Target End Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                Target End Date
              </label>
              <input
                type="date"
                className="input w-full"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                disabled={isEdit && !hasExceptional("DOCUMENT.EDIT_DATE")}
              />
            </div>

            {/* Budget (from Section B, seamlessly aligned) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                Estimated Budget (GHS)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                  GHS
                </span>
                <input
                  type="number"
                  step="0.01"
                  className="input w-full pl-12 font-semibold"
                  placeholder="0.00"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </div>
            </div>

            {/* Active / Inactive Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                Active / Inactive
              </label>
              <select
                className="input w-full font-medium"
                value={form.is_active ? "Y" : "N"}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.value === "Y" })
                }
              >
                <option value="Y">Active</option>
                <option value="N">Inactive</option>
              </select>
            </div>
          </div>

          {/* Status & Workflow Stage Fields */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-2 text-brand-900 dark:text-brand-300">
              <Flag size={17} />
              <h3 className="font-bold uppercase text-xs tracking-wider">
                Status & Workflow Stage
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Workflow Stage
                </label>
                <select
                  className="input w-full font-bold text-xs"
                  value={form.project_status}
                  onChange={(e) =>
                    setForm({ ...form, project_status: e.target.value })
                  }
                >
                  {[
                    "PLANNING",
                    "IN_PROGRESS",
                    "ON_HOLD",
                    "COMPLETED",
                    "CANCELLED",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Active Status
                </label>
                <select
                  className="input w-full font-bold text-xs"
                  value={form.is_active ? "Y" : "N"}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.value === "Y" })
                  }
                >
                  <option value="Y">Active</option>
                  <option value="N">Inactive</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Practical Completion Date
                </label>
                <input
                  type="date"
                  className="input w-full text-xs"
                  value={form.practical_completion_date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      practical_completion_date: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Project Milestones & Timeline Field */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
              Project Milestones & Timeline
            </label>

            {/* Interactive Card */}
            <div
              onClick={openMilestoneModal}
              className="group cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 hover:border-brand-500/50 transition-all shadow-xs"
            >
              {form.milestones && form.milestones.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {form.milestones.length} {form.milestones.length === 1 ? "Milestone" : "Milestones"} defined
                    </span>
                    <span className="text-xs text-brand-600 dark:text-brand-400 font-medium inline-flex items-center gap-1 group-hover:underline">
                      <Pencil size={12} /> Edit in Modal
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.milestones.map((m, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs shadow-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{m.title || `Stage ${idx + 1}`}</span>
                        {m.due_date && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            ({m.due_date})
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                          m.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}>
                          {m.status || 'PENDING'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <div className="p-1 text-slate-400 dark:text-slate-500">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        No Project Milestones Configured
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Click to open modal and set critical stage gates, completion targets, and timelines.
                      </div>
                    </div>
                  </div>
                  <span className="btn btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 font-semibold group-hover:bg-brand-600 group-hover:text-white transition-colors">
                    <Plus size={13} /> Set Milestones
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Scope & Remarks */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
              Project Scope & Remarks
            </label>
            <textarea
              className="input w-full min-h-[90px]"
              placeholder="Objectives, deliverables, and operational constraints..."
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>
        </div>

        {/* Section: Project Specifications & Contract Details */}
        {!showContractSection ? (
          <div className="card p-6 bg-slate-50/70 dark:bg-slate-900/40 border-dashed border-2 border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-brand-900/10 text-brand-900 dark:bg-brand-500/10 dark:text-brand-300">
                <Building size={22} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  Project Specifications & Contract Details
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Contract sums, retention, advance recovery rates, and Cloudinary contract attachments.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowContractSection(true)}
              className="btn btn-secondary inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs whitespace-nowrap active:scale-95 transition-all"
            >
              <Plus size={15} />
              Add Project Contract
            </button>
          </div>
        ) : (
          <div className="card p-6 sm:p-8 space-y-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3 text-brand-900 dark:text-brand-300">
                <Building size={20} />
                <h2 className="font-bold uppercase text-xs tracking-wider">
                  Project Specifications & Contract Details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowContractSection(false)}
                className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 inline-flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Collapse Contract Section"
              >
                <X size={14} />
                <span>Hide Contract Details</span>
              </button>
            </div>

            {/* Project Type & Contract Reference No. */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Project Type
                </label>
                <select
                  className="input w-full"
                  value={form.project_type || ""}
                  onChange={(e) =>
                    setForm({ ...form, project_type: e.target.value })
                  }
                >
                  <option value="">— Select Project Type —</option>
                  {projectTypes.map((pt) => (
                    <option key={pt.id || pt.type_code} value={pt.type_code}>
                      {pt.type_name}
                    </option>
                  ))}
                  {form.project_type && !projectTypes.some((pt) => pt.type_code === form.project_type) && (
                    <option value={form.project_type}>
                      {form.project_type.replace(/_/g, " ")}
                    </option>
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Contract Reference No.
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. CNT-2026-088"
                  value={form.contract_ref_no || ""}
                  onChange={(e) =>
                    setForm({ ...form, contract_ref_no: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Commercial terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Original Contract Sum
                </label>
                <input
                  type="number"
                  className="input w-full"
                  value={form.contract_sum}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      contract_sum: Number(e.target.value),
                      revised_contract_sum:
                        form.revised_contract_sum || Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Revised Contract Sum
                </label>
                <input
                  type="number"
                  className="input w-full"
                  value={form.revised_contract_sum}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      revised_contract_sum: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Retention (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input w-full"
                  value={form.retention_percent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      retention_percent: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Retention Cap
                </label>
                <input
                  type="number"
                  className="input w-full"
                  value={form.retention_cap}
                  onChange={(e) =>
                    setForm({ ...form, retention_cap: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Advance Payment Amount
                </label>
                <input
                  type="number"
                  className="input w-full"
                  value={form.advance_payment_amount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      advance_payment_amount: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Advance Recovery (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="input w-full"
                  value={form.advance_recovery_percent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      advance_recovery_percent: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Defects Liability (Months)
                </label>
                <input
                  type="number"
                  className="input w-full"
                  value={form.defects_liability_months}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      defects_liability_months: Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            {/* Site Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Site Address
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="Plot / Street / Area"
                  value={form.site_address || ""}
                  onChange={(e) =>
                    setForm({ ...form, site_address: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  City / Town
                </label>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. Accra"
                  value={form.site_city || ""}
                  onChange={(e) =>
                    setForm({ ...form, site_city: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Cloudinary Contract Attachments Feature */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <CloudinaryDocumentUploader
                folder="omnisuite/projects/contracts"
                label="Contract Documents & Signed Agreements"
                description="Upload signed contracts, technical specifications, drawings, or BOQs (PDF, DWG, DOCX, XLSX, Images up to 50MB)"
                value={
                  form.attachments ||
                  (form.contract_file_url
                    ? [
                        {
                          url: form.contract_file_url,
                          filename: form.contract_file_url.split("/").pop(),
                        },
                      ]
                    : [])
                }
                onChange={(files) => {
                  setForm({
                    ...form,
                    attachments: files,
                    contract_file_url: files.length > 0 ? files[0].url : "",
                  });
                }}
              />
            </div>
          </div>
        )}

        {/* Informational Banner when Editing */}
        {isEdit && (
          <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-start gap-3">
            <div className="p-1.5 bg-rose-100 dark:bg-rose-900/50 rounded-lg text-rose-600">
              <AlertCircle size={16} />
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
              Updating project parameters will reflect across all linked tasks,
              contract schedules, and financial reports.
            </p>
          </div>
        )}
      </div>
      {/* Project Milestones & Timeline Modal */}
      {milestoneModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn"
          onClick={() => setMilestoneModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto sm:my-8 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <MapPin size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Project Milestones & Timeline
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Define deliverables, critical phase gates, completion due dates, and statuses.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMilestoneModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {draftMilestones.length} {draftMilestones.length === 1 ? "Milestone Stage" : "Milestone Stages"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const standard = [
                        { title: "Site Mobilization & Excavation", start_date: form.start_date || "", due_date: "", status: "PENDING", priority: "HIGH", remarks: "Site handover, earthworks, and temporary utility setups" },
                        { title: "Substructure & Concrete Foundations", start_date: "", due_date: "", status: "PENDING", priority: "HIGH", remarks: "Footing excavation, reinforcement bars, and concrete curing" },
                        { title: "Superstructure & Frame Construction", start_date: "", due_date: "", status: "PENDING", priority: "MEDIUM", remarks: "Columns, beams, masonry walling, and floor slabs" },
                        { title: "Roofing, Envelope & External Works", start_date: "", due_date: "", status: "PENDING", priority: "MEDIUM", remarks: "Roof truss framing, claddings, external waterproofing" },
                        { title: "Interior Finishes, MEP & Fit-outs", start_date: "", due_date: "", status: "PENDING", priority: "MEDIUM", remarks: "Mechanical, electrical, plumbing installations, and wall plastering" },
                        { title: "Inspection, Testing & Handover", start_date: "", due_date: form.end_date || "", status: "PENDING", priority: "CRITICAL", remarks: "Snag list clearance, practical completion certification, and handover" },
                      ];
                      setDraftMilestones(standard);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 bg-brand-50/50 dark:bg-brand-950/30 hover:bg-brand-100 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Sparkles size={13} /> Load Standard Phases
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftMilestones((prev) => [
                        ...prev,
                        {
                          title: "",
                          start_date: form.start_date || "",
                          due_date: form.end_date || "",
                          status: "PENDING",
                          priority: "MEDIUM",
                          remarks: "",
                        },
                      ]);
                    }}
                    className="btn btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1 font-semibold"
                  >
                    <Plus size={13} /> Add Milestone
                  </button>
                </div>
              </div>

              {draftMilestones.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <MapPin size={32} className="mx-auto text-slate-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Milestones Added Yet</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Add milestone stages to track project delivery phases, critical paths, and completion targets.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftMilestones([
                          {
                            title: "",
                            start_date: form.start_date || "",
                            due_date: form.end_date || "",
                            status: "PENDING",
                            priority: "MEDIUM",
                            remarks: "",
                          },
                        ]);
                      }}
                      className="btn btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1"
                    >
                      <Plus size={13} /> Add First Milestone
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {draftMilestones.map((m, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Milestone #{index + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftMilestones((prev) => prev.filter((_, i) => i !== index));
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                          title="Remove milestone"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-6">
                          <label className="text-[11px] font-bold text-brand-900 dark:text-brand-300 uppercase block mb-1">
                            Milestone Title / Phase <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            className="input w-full text-xs"
                            placeholder="e.g. Substructure Foundation & Concrete Pour"
                            value={m.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftMilestones((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, title: val } : item))
                              );
                            }}
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-bold text-brand-900 dark:text-brand-300 uppercase block mb-1">
                            Start Date
                          </label>
                          <input
                            type="date"
                            className="input w-full text-xs"
                            value={m.start_date || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftMilestones((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, start_date: val } : item))
                              );
                            }}
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-bold text-brand-900 dark:text-brand-300 uppercase block mb-1">
                            Target Due Date
                          </label>
                          <input
                            type="date"
                            className="input w-full text-xs"
                            value={m.due_date || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftMilestones((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, due_date: val } : item))
                              );
                            }}
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-bold text-brand-900 dark:text-brand-300 uppercase block mb-1">
                            Status
                          </label>
                          <select
                            className="input w-full text-xs"
                            value={m.status || "PENDING"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftMilestones((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, status: val } : item))
                              );
                            }}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="DELAYED">Delayed</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[11px] font-bold text-brand-900 dark:text-brand-300 uppercase block mb-1">
                            Priority
                          </label>
                          <select
                            className="input w-full text-xs"
                            value={m.priority || "MEDIUM"}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftMilestones((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, priority: val } : item))
                              );
                            }}
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                          </select>
                        </div>

                        <div className="sm:col-span-6">
                          <label className="text-[11px] font-bold text-brand-900 dark:text-brand-300 uppercase block mb-1">
                            Remarks / Key Deliverables
                          </label>
                          <input
                            type="text"
                            className="input w-full text-xs"
                            placeholder="Deliverables, quality checks, completion criteria..."
                            value={m.remarks || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftMilestones((prev) =>
                                prev.map((item, i) => (i === index ? { ...item, remarks: val } : item))
                              );
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMilestoneModalOpen(false)}
                className="btn btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const cleaned = draftMilestones.filter((m) => m.title && m.title.trim());
                  setForm((prev) => ({ ...prev, milestones: cleaned }));
                  setMilestoneModalOpen(false);
                  toast.success(`${cleaned.length} milestone(s) saved to project`);
                }}
                className="btn btn-primary text-xs px-5 py-2 font-semibold shadow-sm"
              >
                Save Milestones
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
