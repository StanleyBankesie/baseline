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
  Layers,
  ListTodo,
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  Briefcase,
  User,
  Activity,
  DollarSign,
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
  const [currencies, setCurrencies] = useState([
    { code: "GHS", symbol: "GH₵", name: "Ghana Cedis" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  ]);
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
    currency: "GHS",
    contract_currency: "GHS",
    project_priority: "MEDIUM",
    project_status: "IN_PROGRESS",
    start_date: "",
    end_date: "",
    remarks: "",
    scopes: [],
    milestones: [],
    is_active: true,
  });

  // Client / Organization search & SweetAlert states
  const [clientSearch, setClientSearch] = useState("");
  const [isClientOpen, setIsClientOpen] = useState(false);
  const clientContainerRef = useRef(null);
  const lastAlertedClientSearchRef = useRef("");
  const clientSearchTimeoutRef = useRef(null);

  // Project Scope, WBS & Tasks Modal states
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [draftScopes, setDraftScopes] = useState([]);
  const [savingScope, setSavingScope] = useState(false);

  const openScopeModal = () => {
    const rawScopes =
      form.scopes && form.scopes.length
        ? JSON.parse(JSON.stringify(form.scopes))
        : form.milestones && form.milestones.length
          ? JSON.parse(JSON.stringify(form.milestones))
          : [];

    const normalized = rawScopes.map((scope, sIdx) => {
      let wbsList = [];
      const defaultStart = scope.start_date || form.start_date || "";
      const defaultEnd =
        scope.due_date || scope.end_date || form.end_date || "";

      if (Array.isArray(scope.wbs_list) && scope.wbs_list.length > 0) {
        wbsList = scope.wbs_list.map((w, wi) => ({
          id: w.id || Date.now() + wi,
          wbs: w.wbs || w.wbs_code || `${sIdx + 1}.${wi + 1}`,
          start_date: w.start_date || defaultStart,
          end_date: w.end_date || w.due_date || defaultEnd,
          tasks: Array.isArray(w.tasks)
            ? w.tasks.map((t) => ({
                ...t,
                id: t.id || undefined,
                task_title: t.task_title || t.title || "",
                duration_unit: t.duration_unit || "Days",
                status:
                  t.status || (t.assigned_to_id ? "IN_PROGRESS" : "PENDING"),
              }))
            : [],
        }));
      } else if (Array.isArray(scope.tasks) && scope.tasks.length > 0) {
        const map = new Map();
        scope.tasks.forEach((t, ti) => {
          const wKey = (
            t.wbs_code ||
            t.wbs ||
            scope.wbs_code ||
            scope.wbs ||
            `${sIdx + 1}.1`
          ).trim();
          if (!map.has(wKey)) {
            map.set(wKey, {
              id: Date.now() + ti,
              wbs: wKey,
              start_date: t.start_date || defaultStart,
              end_date: t.end_date || t.due_date || defaultEnd,
              tasks: [],
            });
          }
          map.get(wKey).tasks.push({
            ...t,
            id: t.id || undefined,
            task_title: t.task_title || t.title || "",
            duration_unit: t.duration_unit || "Days",
            status: t.status || (t.assigned_to_id ? "IN_PROGRESS" : "PENDING"),
          });
        });
        wbsList = Array.from(map.values());
      } else {
        wbsList = [
          {
            id: Date.now(),
            wbs: scope.wbs || scope.wbs_code || `${sIdx + 1}.1`,
            start_date: defaultStart,
            end_date: defaultEnd,
            tasks: [],
          },
        ];
      }
      return {
        ...scope,
        name: scope.name || scope.title || `Scope ${sIdx + 1}`,
        title: scope.name || scope.title || `Scope ${sIdx + 1}`,
        wbs_list: wbsList,
      };
    });

    setDraftScopes(normalized);
    setScopeModalOpen(true);
  };

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

  /**
   * Handles user keystrokes in the searchable Client / Organization input.
   * Debounces client verification; if 2+ characters are entered without a matching
   * client in the directory, triggers an interactive SweetAlert prompting the user
   * to navigate to the Clients operational setup screen.
   *
   * @param {string} val - Input search text
   */
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
          (c.customer_name || c.name || "").toLowerCase().includes(lower),
        );
        if (
          matches.length === 0 &&
          lastAlertedClientSearchRef.current !== lower
        ) {
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
              popup:
                "rounded-2xl dark:bg-slate-900 dark:text-white shadow-2xl border border-slate-200 dark:border-slate-800",
              confirmButton:
                "btn btn-primary px-4 py-2 text-sm font-semibold rounded-xl",
              cancelButton:
                "btn btn-secondary px-4 py-2 text-sm font-semibold rounded-xl",
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
        c.is_active === undefined,
    );
    if (!clientSearch || !clientSearch.trim()) return activeList;
    const lower = clientSearch.trim().toLowerCase();
    return activeList.filter((c) =>
      (c.customer_name || c.name || "").toLowerCase().includes(lower),
    );
  }, [clients, clientSearch]);

  const openMilestoneModal = openScopeModal;

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

    // Fetch active currencies from fin_currencies
    try {
      const curRes = await api.get("/finance/currencies", {
        params: { active: 1 },
      });
      const curList =
        curRes.data?.items ||
        curRes.data?.data?.items ||
        (Array.isArray(curRes.data) ? curRes.data : []);
      if (curList && curList.length > 0) {
        setCurrencies(curList);
      }
    } catch (e) {
      console.warn(
        "Could not load fin_currencies, using default currencies",
        e,
      );
    }
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
          currency: item.currency || "GHS",
          contract_currency: item.contract_currency || item.currency || "GHS",
          start_date: item.start_date ? item.start_date.split("T")[0] : "",
          end_date: item.end_date ? item.end_date.split("T")[0] : "",
          practical_completion_date: item.practical_completion_date
            ? item.practical_completion_date.split("T")[0]
            : "",
          final_completion_date: item.final_completion_date
            ? item.final_completion_date.split("T")[0]
            : "",
          attachments: parsedAttachments,
          scopes:
            item.scopes && item.scopes.length > 0
              ? item.scopes
              : item.milestones || [],
          milestones:
            item.scopes && item.scopes.length > 0
              ? item.scopes
              : item.milestones || [],
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
        prefix = words[0]
          .slice(0, 3)
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase();
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

  /**
   * Handles form submission for both project creation (POST) and updates (PUT).
   * Submits specifications, attachments, and synchronized milestone deliverables.
   *
   * @param {React.FormEvent} e - Form submission event
   */
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
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm hidden">
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
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
                    <Sparkles
                      size={11}
                      className={generatingCode ? "animate-spin" : ""}
                    />
                    <span>Auto-create</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  className="input w-full font-semibold text-sm"
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
              <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
              <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
              <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
                            <CheckCircle
                              size={14}
                              className="text-brand-600 dark:text-brand-400"
                            />
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
                            navigate(
                              "/project-management/setup?tab=clients&new=true",
                            );
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
              <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
                    const label = fullName || m.username;
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
              <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
              <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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

            {/* Budget & Multiple Currency Selection (from fin_currencies) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                Estimated Budget ({form.currency || "GHS"})
              </label>
              <div className="flex rounded-xl overflow-hidden shadow-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500">
                <select
                  value={form.currency || "GHS"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      currency: val,
                      contract_currency:
                        prev.contract_currency === prev.currency || !prev.contract_currency
                          ? val
                          : prev.contract_currency,
                    }));
                  }}
                  className="bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-brand-700 dark:text-brand-300 px-3 py-2 border-r border-slate-200 dark:border-slate-700 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                  title="Select Currency"
                >
                  {currencies.map((c) => (
                    <option key={c.id || c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 text-sm bg-transparent border-0 outline-none font-semibold text-slate-800 dark:text-slate-100"
                  placeholder="0.00"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </div>
            </div>

            {/* Active / Inactive Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Workflow Stage
                </label>
                <select
                  className="input w-full font-semibold text-sm"
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
            </div>
          </div>

          {/* Project Scope Field */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                Project Scope
              </label>
              {form.scopes && form.scopes.length > 0 && (
                <span className="text-[11px] font-semibold text-slate-500">
                  {form.scopes.length}{" "}
                  {form.scopes.length === 1 ? "Scope" : "Scopes"} ·{" "}
                  {form.scopes.reduce(
                    (acc, s) =>
                      acc +
                      (s.wbs_list?.length || (s.wbs_code ? 1 : 0)),
                    0,
                  )}{" "}
                  Project Work Plans/WBS
                </span>
              )}
            </div>

            {/* Interactive Scope Card */}
            <div
              onClick={openScopeModal}
              className="group cursor-pointer rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:border-brand-500/50 hover:shadow-sm transition-all"
            >
              {form.scopes && form.scopes.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Layers
                        size={15}
                        className="text-brand-600 dark:text-brand-400"
                      />
                      {form.scopes.length}{" "}
                      {form.scopes.length === 1
                        ? "Project Scope"
                        : "Project Scopes"}{" "}
                      configured with Project Work Plan/WBS
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openScopeModal();
                      }}
                      className="btn btn-primary text-xs px-3.5 py-1.5 font-bold inline-flex items-center gap-1.5 shadow-sm rounded-lg hover:opacity-95 transition-all shrink-0"
                    >
                      <Pencil size={13} /> Manage Scope & Project Work Plan/WBS
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {form.scopes.map((s, idx) => {
                      const wbsCount =
                        s.wbs_list?.length || (s.wbs_code ? 1 : 0);
                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs flex flex-col justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 leading-snug">
                              <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0"></span>
                              {s.name || s.title || `Scope #${idx + 1}`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                            <span className="font-semibold text-brand-700 dark:text-brand-300">
                              📑 {wbsCount}{" "}
                              {wbsCount === 1 ? "Project Work Plan/WBS" : "Project Work Plans/WBS"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400">
                      <Layers size={22} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        No Project Scope Configured
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Click to define project scopes and work plans/wbs under each scope.
                      </div>
                    </div>
                  </div>
                  <span className="btn btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 font-semibold group-hover:bg-brand-600 group-hover:text-white transition-colors">
                    <Plus size={13} /> Configure Project Scope
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Scope & Remarks */}
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
                  Contract sums, retention, advance recovery rates, and
                  Cloudinary contract attachments.
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
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
                  {form.project_type &&
                    !projectTypes.some(
                      (pt) => pt.type_code === form.project_type,
                    ) && (
                      <option value={form.project_type}>
                        {form.project_type.replace(/_/g, " ")}
                      </option>
                    )}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Original Contract Sum ({form.contract_currency || form.currency || "GHS"})
                </label>
                <div className="relative flex items-center">
                  <select
                    value={form.contract_currency || form.currency || "GHS"}
                    onChange={(e) =>
                      setForm({ ...form, contract_currency: e.target.value })
                    }
                    className="bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-brand-700 dark:text-brand-300 px-3 py-2 border border-r-0 border-slate-300 dark:border-slate-700 rounded-l-xl h-10 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                    title="Select Contract Currency"
                  >
                    {currencies.map((c) => (
                      <option key={c.id || c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input w-full rounded-l-none"
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
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Revised Contract Sum ({form.contract_currency || form.currency || "GHS"})
                </label>
                <div className="relative flex items-center">
                  <select
                    value={form.contract_currency || form.currency || "GHS"}
                    onChange={(e) =>
                      setForm({ ...form, contract_currency: e.target.value })
                    }
                    className="bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-brand-700 dark:text-brand-300 px-3 py-2 border border-r-0 border-slate-300 dark:border-slate-700 rounded-l-xl h-10 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                    title="Select Contract Currency"
                  >
                    {currencies.map((c) => (
                      <option key={c.id || c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input w-full rounded-l-none"
                    value={form.revised_contract_sum}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        revised_contract_sum: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Retention Cap ({form.contract_currency || form.currency || "GHS"})
                </label>
                <div className="relative flex items-center">
                  <select
                    value={form.contract_currency || form.currency || "GHS"}
                    onChange={(e) =>
                      setForm({ ...form, contract_currency: e.target.value })
                    }
                    className="bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-brand-700 dark:text-brand-300 px-3 py-2 border border-r-0 border-slate-300 dark:border-slate-700 rounded-l-xl h-10 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                    title="Select Contract Currency"
                  >
                    {currencies.map((c) => (
                      <option key={c.id || c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input w-full rounded-l-none"
                    value={form.retention_cap}
                    onChange={(e) =>
                      setForm({ ...form, retention_cap: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
                  Advance Payment Amount ({form.contract_currency || form.currency || "GHS"})
                </label>
                <div className="relative flex items-center">
                  <select
                    value={form.contract_currency || form.currency || "GHS"}
                    onChange={(e) =>
                      setForm({ ...form, contract_currency: e.target.value })
                    }
                    className="bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-brand-700 dark:text-brand-300 px-3 py-2 border border-r-0 border-slate-300 dark:border-slate-700 rounded-l-xl h-10 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-750 transition-colors"
                    title="Select Contract Currency"
                  >
                    {currencies.map((c) => (
                      <option key={c.id || c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className="input w-full rounded-l-none"
                    value={form.advance_payment_amount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        advance_payment_amount: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
                <label className="text-xs font-semibold text-brand-900 dark:text-brand-300 uppercase tracking-wider block">
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
      </div>
      {/* Project Scope, WBS & Tasks Modal */}
      {scopeModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-3 sm:p-6 md:p-8 animate-fadeIn"
          onClick={() => setScopeModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto sm:my-6 transition-all flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Layers size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Project Scope & Project Work Plan/WBS
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Create multiple project work plans/wbs under each scope.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScopeModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {draftScopes.length}{" "}
                  {draftScopes.length === 1
                    ? "Project Scope"
                    : "Project Scopes"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextIndex = draftScopes.length + 1;
                    setDraftScopes((prev) => [
                      ...prev,
                      {
                        name: `Scope ${nextIndex}`,
                        title: `Scope ${nextIndex}`,
                        description: "",
                        wbs_list: [
                          {
                            id: Date.now(),
                            wbs: `${nextIndex}.1`,
                            start_date: form.start_date || "",
                            end_date: form.end_date || "",
                            tasks: [
                              {
                                task_title: "",
                                assigned_to_id: "",
                                assigned_to_name: "",
                                estimated_hours: 8,
                                priority: "MEDIUM",
                                status: "PENDING",
                              },
                            ],
                          },
                        ],
                      },
                    ]);
                  }}
                  className="btn btn-primary text-xs px-3.5 py-1.5 inline-flex items-center gap-1.5 font-semibold"
                >
                  <Plus size={14} /> Add Project Scope
                </button>
              </div>

              {draftScopes.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                  <Layers size={36} className="mx-auto text-slate-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No Project Scope Added Yet
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Click below to add a Project Scope. Inside each scope, you
                    can add multiple project work plans/wbs.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftScopes([
                          {
                            name: "Primary Project Scope",
                            title: "Primary Project Scope",
                            description: "",
                            wbs_list: [
                              {
                                id: Date.now(),
                                wbs: "1.1",
                                start_date: form.start_date || "",
                                end_date: form.end_date || "",
                                tasks: [
                                  {
                                    task_title: "",
                                    duration_unit: "Days",
                                    estimated_hours: 8,
                                    priority: "MEDIUM",
                                    status: "PENDING",
                                  },
                                ],
                              },
                            ],
                          },
                        ]);
                      }}
                      className="btn btn-primary text-xs px-3.5 py-2 inline-flex items-center gap-1.5"
                    >
                      <Plus size={13} /> Add First Scope
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {draftScopes.map((scope, scopeIdx) => (
                    <div
                      key={scopeIdx}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm space-y-4"
                    >
                      {/* Scope Header Bar */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                            {scopeIdx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                            Project Scope #{scopeIdx + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftScopes((prev) =>
                              prev.filter((_, i) => i !== scopeIdx),
                            );
                          }}
                          className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium"
                          title="Remove scope"
                        >
                          <Trash2 size={14} /> Remove Scope
                        </button>
                      </div>

                      {/* Scope Details Fields (Scope Name, Remarks) */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-6">
                          <label className="text-[11px] font-semibold text-brand-900 dark:text-brand-300 uppercase block mb-1">
                            Scope Name / Title{" "}
                            <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            className="input w-full text-sm font-medium"
                            placeholder="e.g. Substructure & Civil Foundations"
                            value={scope.name || scope.title || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftScopes((prev) =>
                                prev.map((s, i) =>
                                  i === scopeIdx
                                    ? { ...s, name: val, title: val }
                                    : s,
                                ),
                              );
                            }}
                          />
                        </div>

                        <div className="sm:col-span-6">
                          <label className="text-[11px] font-semibold text-brand-900 dark:text-brand-300 uppercase block mb-1">
                            Scope Remarks / Deliverable Specs
                          </label>
                          <input
                            type="text"
                            className="input w-full text-sm"
                            placeholder="Deliverables, quality criteria, scope specifications..."
                            value={scope.description || scope.remarks || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDraftScopes((prev) =>
                                prev.map((s, i) =>
                                  i === scopeIdx
                                    ? { ...s, description: val, remarks: val }
                                    : s,
                                ),
                              );
                            }}
                          />
                        </div>
                      </div>

                      {/* MULTIPLE PROJECT WORK PLANS UNDER THIS SCOPE */}
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                            <Layers
                              size={14}
                              className="text-brand-600 dark:text-brand-400"
                            />
                            Project Work Plan/WBS Elements under this Scope (
                            {(scope.wbs_list || []).length})
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              const currentWbsList = scope.wbs_list || [];
                              const nextWbsSeq = currentWbsList.length + 1;
                              const newWbsItem = {
                                id: Date.now(),
                                wbs: `${scopeIdx + 1}.${nextWbsSeq}`,
                                start_date: form.start_date || "",
                                end_date: form.end_date || "",
                                tasks: [],
                              };
                              setDraftScopes((prev) =>
                                prev.map((s, i) =>
                                  i === scopeIdx
                                    ? {
                                        ...s,
                                        wbs_list: [
                                          ...(s.wbs_list || []),
                                          newWbsItem,
                                        ],
                                      }
                                    : s,
                                ),
                              );
                            }}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold inline-flex items-center gap-1 transition-colors border border-slate-300 dark:border-slate-600 shadow-2xs"
                          >
                            <Plus size={13} /> Add Project Work Plan/WBS under this Scope
                          </button>
                        </div>

                        {!scope.wbs_list || scope.wbs_list.length === 0 ? (
                          <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                            No project work plans/wbs created yet. Click{" "}
                            <strong className="text-brand-600">
                              + Add Project Work Plan/WBS under this Scope
                            </strong>
                            .
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {scope.wbs_list.map((wbsItem, wbsIdx) => (
                              <div
                                key={wbsItem.id || wbsIdx}
                                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-2xs"
                              >
                                {/* Work Plan/WBS Header Row with Start Date, End Date & Remove */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                                    {/* Work Plan/WBS Name/Code */}
                                    <div className="sm:col-span-5 flex items-center gap-2">
                                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200 shrink-0">
                                        Work Plan/WBS:
                                      </span>
                                      <input
                                        type="text"
                                        className="input text-sm font-semibold text-slate-800 dark:text-slate-200 flex-1 py-1"
                                        placeholder="e.g. 1.1 Foundation Footings"
                                        value={wbsItem.wbs || ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setDraftScopes((prev) =>
                                            prev.map((s, i) =>
                                              i === scopeIdx
                                                ? {
                                                    ...s,
                                                    wbs_list: s.wbs_list.map(
                                                      (w, wi) =>
                                                        wi === wbsIdx
                                                          ? { ...w, wbs: val }
                                                          : w,
                                                    ),
                                                  }
                                                : s,
                                            ),
                                          );
                                        }}
                                      />
                                    </div>

                                    {/* Directly linked Start Date */}
                                    <div className="sm:col-span-3 flex items-center gap-1.5">
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 shrink-0">
                                        Start:
                                      </span>
                                      <input
                                        type="date"
                                        className="input text-sm py-1 w-full"
                                        value={wbsItem.start_date || ""}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setDraftScopes((prev) =>
                                            prev.map((s, i) =>
                                              i === scopeIdx
                                                ? {
                                                    ...s,
                                                    wbs_list: s.wbs_list.map(
                                                      (w, wi) =>
                                                        wi === wbsIdx
                                                          ? {
                                                              ...w,
                                                              start_date: val,
                                                            }
                                                          : w,
                                                    ),
                                                  }
                                                : s,
                                            ),
                                          );
                                        }}
                                      />
                                    </div>

                                    {/* Directly linked End Date */}
                                    <div className="sm:col-span-4 flex items-center gap-1.5">
                                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 shrink-0">
                                        End:
                                      </span>
                                      <input
                                        type="date"
                                        className="input text-sm py-1 w-full"
                                        value={
                                          wbsItem.end_date ||
                                          wbsItem.due_date ||
                                          ""
                                        }
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setDraftScopes((prev) =>
                                            prev.map((s, i) =>
                                              i === scopeIdx
                                                ? {
                                                    ...s,
                                                    wbs_list: s.wbs_list.map(
                                                      (w, wi) =>
                                                        wi === wbsIdx
                                                          ? {
                                                              ...w,
                                                              end_date: val,
                                                              due_date: val,
                                                            }
                                                          : w,
                                                    ),
                                                  }
                                                : s,
                                            ),
                                          );
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDraftScopes((prev) =>
                                          prev.map((s, i) =>
                                            i === scopeIdx
                                              ? {
                                                  ...s,
                                                  wbs_list: s.wbs_list.filter(
                                                    (_, wi) => wi !== wbsIdx,
                                                  ),
                                                }
                                              : s,
                                          ),
                                        );
                                      }}
                                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                      title="Remove Project Work Plan/WBS"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setScopeModalOpen(false)}
                className="btn btn-secondary text-xs px-4 py-2"
                disabled={savingScope}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingScope}
                onClick={async () => {
                  setSavingScope(true);
                  try {
                    const cleaned = draftScopes
                      .filter(
                        (s) =>
                          (s.name && s.name.trim()) ||
                          (s.title && s.title.trim()),
                      )
                      .map((s) => {
                        const scopeName = (s.name || s.title || "").trim();
                        const validWbsList = (s.wbs_list || []).map((w, wi) => {
                          const wbsCode = (
                            w.wbs ||
                            w.wbs_code ||
                            `${wi + 1}`
                          ).trim();
                          const wbsStart = w.start_date || "";
                          const wbsEnd = w.end_date || w.due_date || "";
                          return {
                            id: w.id || Date.now() + wi,
                            wbs: wbsCode,
                            start_date: wbsStart,
                            end_date: wbsEnd,
                            due_date: wbsEnd,
                            tasks: (w.tasks || [])
                              .filter(
                                (t) =>
                                  (t.task_title && t.task_title.trim()) ||
                                  (t.title && t.title.trim()),
                              )
                              .map((t) => ({
                                ...t,
                                id: t.id || undefined,
                                task_title: (
                                  t.task_title ||
                                  t.title ||
                                  ""
                                ).trim(),
                                wbs_code: wbsCode,
                                wbs: wbsCode,
                                scope_name: scopeName,
                                start_date: t.start_date || wbsStart,
                                end_date: t.end_date || t.due_date || wbsEnd,
                                duration_unit: t.duration_unit || "Days",
                                estimated_hours: t.estimated_hours ?? 0,
                                status:
                                  t.status ||
                                  (t.assigned_to_id
                                    ? "IN_PROGRESS"
                                    : "PENDING"),
                              })),
                          };
                        });

                        const allTasks = validWbsList.flatMap((w) => w.tasks);
                        const primaryWbs =
                          validWbsList.length > 0
                            ? validWbsList[0].wbs
                            : s.wbs || s.wbs_code || "1.0";

                        return {
                          ...s,
                          id: s.id || undefined,
                          name: scopeName,
                          title: scopeName,
                          wbs: primaryWbs,
                          wbs_code: primaryWbs,
                          wbs_list: validWbsList,
                          tasks: allTasks,
                        };
                      });

                    const totalTasks = cleaned.reduce(
                      (acc, s) => acc + (s.tasks?.length || 0),
                      0,
                    );

                    setForm((prev) => ({
                      ...prev,
                      scopes: cleaned,
                      milestones: cleaned,
                    }));

                    // When editing an existing project, immediately save to backend so changes take effect everywhere!
                    if (isEdit && id) {
                      const payload = {
                        ...form,
                        scopes: cleaned,
                        milestones: cleaned,
                      };
                      await api.put(`/projects/projects/${id}`, payload);
                      await fetchProject();
                      toast.success(
                        `Project Scope & Project Work Plan/WBS saved and synchronized`,
                      );
                    } else {
                      toast.success(
                        `${cleaned.length} Project Scope(s) saved to project`,
                      );
                    }
                    setScopeModalOpen(false);
                  } catch (err) {
                    toast.error(
                      err?.response?.data?.message ||
                        "Failed to save project scopes",
                    );
                  } finally {
                    setSavingScope(false);
                  }
                }}
                className="btn btn-primary text-xs px-5 py-2 font-semibold shadow-sm inline-flex items-center gap-1.5"
              >
                {savingScope ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={15} /> Save Project Scope
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
