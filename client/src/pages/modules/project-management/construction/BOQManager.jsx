/**
 * @file BOQManager.jsx
 * @description Enterprise Bill of Quantities (BOQ) module for ERP Project Management.
 * Features:
 * - Project details: Project name, code, client, site location, and BOQ reference.
 * - Line item codes, detailed description, standard construction UoMs, quantities, rates, and amounts.
 * - Cost categorization: Materials, Labour, Equipment, Subcontracting, Transportation, Other.
 * - Tax and additional charges.
 * - Contingency calculation, subtotal, tax, and final estimated cost.
 * - Approval workflow and revision history: Prepared by, Reviewed by, Approved by, Version, and Date.
 * - Rate build-up analysis, CSV import/export, and printable official BOQ document.
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FileSpreadsheet,
  Plus,
  Calculator,
  Download,
  Upload,
  Layers,
  Save,
  Trash2,
  Edit2,
  Eye,
  CheckCircle,
  Clock,
  ArrowLeft,
  X,
  RefreshCw,
  Printer,
  History,
  ShieldCheck,
  AlertCircle,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Truck,
  Users,
  Wrench,
  Package,
  HardHat,
  Send,
  FileCheck2,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Briefcase,
  Code,
  Building,
  Check,
  Tag,
  Percent,
  Sliders,
  HelpCircle,
  Hash,
  ArrowUpRight,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import ProjectModal from "../components/ProjectModal.jsx";
import {
  useTaxCodesByPageId,
  PAGE_IDS,
} from "../../../../hooks/useTaxCodesByPageId.js";
import { useUoms } from "@/hooks/useUoms";
import * as XLSX from "xlsx";
import { autosizeWorksheetColumns } from "../../../../utils/xlsxUtils.js";
import {
  fetchReportHeader,
  renderHtmlToPdf,
} from "../../../../utils/pdfUtils.js";
import PrintPreviewModal from "../../../../components/PrintPreviewModal.jsx";

const UOM_OPTIONS = [
  { value: "HR", label: "Hour (HR)" },
  { value: "DAY", label: "Day (DAY)" },
  { value: "WK", label: "Week (WK)" },
  { value: "MO", label: "Month (MO)" },
  { value: "SPRINT", label: "Sprint / Point (SPRINT)" },
  { value: "USER", label: "User / Seat (USER)" },
  { value: "EA", label: "Each / Unit (EA)" },
  { value: "LOT", label: "Lot / Lump Sum (LOT)" },
  { value: "SET", label: "Set (SET)" },
  { value: "M", label: "Metre (M)" },
  { value: "M2", label: "Square Metre (M2)" },
  { value: "M3", label: "Cubic Metre (M3)" },
  { value: "KG", label: "Kilogram (KG)" },
  { value: "TON", label: "Tonne (TON)" },
  { value: "LTR", label: "Litre (LTR)" },
  { value: "BAG", label: "Bag (BAG)" },
];

export const COLOR_BADGES = {
  amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  orange: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  slate: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

export const DEFAULT_COST_CATEGORIES = [
  {
    value: "LABOUR",
    label: "Personnel & Labour",
    cost_type: "DIRECT",
    color: COLOR_BADGES.amber,
    default_overhead_percent: 10,
    default_profit_percent: 15,
  },
  {
    value: "SOFTWARE_CLOUD",
    label: "Software & Cloud",
    cost_type: "DIRECT",
    color: COLOR_BADGES.indigo,
    default_overhead_percent: 5,
    default_profit_percent: 15,
  },
  {
    value: "EQUIPMENT",
    label: "Hardware & Equipment",
    cost_type: "EQUIPMENT",
    color: COLOR_BADGES.purple,
    default_overhead_percent: 10,
    default_profit_percent: 15,
  },
  {
    value: "MATERIALS",
    label: "Materials & Supplies",
    cost_type: "DIRECT",
    color: COLOR_BADGES.blue,
    default_overhead_percent: 10,
    default_profit_percent: 15,
  },
  {
    value: "SUBCONTRACTING",
    label: "Subcontractors & Vendors",
    cost_type: "SUBCONTRACTOR",
    color: COLOR_BADGES.emerald,
    default_overhead_percent: 8,
    default_profit_percent: 12,
  },
  {
    value: "TRANSPORTATION",
    label: "Travel & Logistics",
    cost_type: "DIRECT",
    color: COLOR_BADGES.cyan,
    default_overhead_percent: 5,
    default_profit_percent: 10,
  },
  {
    value: "OVERHEAD",
    label: "Admin & Overhead",
    cost_type: "OVERHEAD",
    color: COLOR_BADGES.orange,
    default_overhead_percent: 0,
    default_profit_percent: 0,
  },
  {
    value: "OTHER",
    label: "Other Expenses",
    cost_type: "OTHER",
    color: COLOR_BADGES.slate,
    default_overhead_percent: 5,
    default_profit_percent: 10,
  },
];

export const COST_CATEGORIES = DEFAULT_COST_CATEGORIES;

const PROJECT_TYPE_CONFIG = {
  SOFTWARE_DEVELOPMENT: {
    label: "Software & IT Development",
    icon: "💻",
    badgeCls:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    defaultUom: "HR",
    defaultCategory: "LABOUR",
    term: "Cost Sheet",
  },
  GENERAL_CONSTRUCTION: {
    label: "Construction & Civil Works",
    icon: "🏗️",
    badgeCls:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    defaultUom: "M3",
    defaultCategory: "MATERIALS",
    term: "BOQ Schedule",
  },
  CONSULTING_SERVICES: {
    label: "Consulting & Professional Services",
    icon: "💼",
    badgeCls:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    defaultUom: "DAY",
    defaultCategory: "LABOUR",
    term: "Fee Schedule",
  },
  MARKETING_CAMPAIGN: {
    label: "Marketing & Creative Media",
    icon: "📣",
    badgeCls:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
    defaultUom: "LOT",
    defaultCategory: "SUBCONTRACTING",
    term: "Campaign Budget",
  },
  EVENT_MANAGEMENT: {
    label: "Event Management & Operations",
    icon: "🎪",
    badgeCls:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    defaultUom: "LOT",
    defaultCategory: "EQUIPMENT",
    term: "Event Costing",
  },
  HEALTHCARE_INITIATIVE: {
    label: "Healthcare & Clinical Initiative",
    icon: "🏥",
    badgeCls:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800",
    defaultUom: "LOT",
    defaultCategory: "MATERIALS",
    term: "Program Costing",
  },
  MANUFACTURING: {
    label: "Manufacturing & Production",
    icon: "⚙️",
    badgeCls:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    defaultUom: "EA",
    defaultCategory: "MATERIALS",
    term: "Bill of Materials (BOM)",
  },
};

const INDUSTRY_TEMPLATES = {
  SOFTWARE: {
    name: "Software & IT Development",
    items: [
      {
        item_code: "SW-001",
        item_description:
          "Solution Architecture, Technical Blueprint & UI/UX Design",
        cost_category: "LABOUR",
        uom: "HR",
        quantity: 60,
        unit_rate: 150,
      },
      {
        item_code: "SW-002",
        item_description:
          "Frontend Client Application Development (React & Tailwind)",
        cost_category: "LABOUR",
        uom: "HR",
        quantity: 120,
        unit_rate: 120,
      },
      {
        item_code: "SW-003",
        item_description:
          "Backend Microservices, API & Database Architecture (Node/MySQL)",
        cost_category: "LABOUR",
        uom: "HR",
        quantity: 140,
        unit_rate: 130,
      },
      {
        item_code: "SW-004",
        item_description:
          "Cloud Infrastructure Setup, Docker & AWS Hosting (Annual)",
        cost_category: "SOFTWARE_CLOUD",
        uom: "MO",
        quantity: 12,
        unit_rate: 350,
      },
      {
        item_code: "SW-005",
        item_description: "QA Automated Testing, Pentest & Security Audit",
        cost_category: "LABOUR",
        uom: "LOT",
        quantity: 1,
        unit_rate: 4500,
      },
      {
        item_code: "SW-006",
        item_description:
          "Third-Party SaaS APIs & Production Service Subscriptions",
        cost_category: "SOFTWARE_CLOUD",
        uom: "LOT",
        quantity: 1,
        unit_rate: 1800,
      },
    ],
  },
  CONSULTING: {
    name: "Consulting & Advisory Services",
    items: [
      {
        item_code: "CON-001",
        item_description: "Lead Consultant Strategic Discovery & Assessment",
        cost_category: "LABOUR",
        uom: "DAY",
        quantity: 15,
        unit_rate: 1200,
      },
      {
        item_code: "CON-002",
        item_description: "Data Analysis, Benchmarking & Industry Research",
        cost_category: "LABOUR",
        uom: "HR",
        quantity: 80,
        unit_rate: 90,
      },
      {
        item_code: "CON-003",
        item_description: "Stakeholder Alignment & Strategy Workshops",
        cost_category: "LABOUR",
        uom: "LOT",
        quantity: 3,
        unit_rate: 2500,
      },
      {
        item_code: "CON-004",
        item_description:
          "Final Strategic Recommendation Report & Presentation Deck",
        cost_category: "LABOUR",
        uom: "LOT",
        quantity: 1,
        unit_rate: 6000,
      },
      {
        item_code: "CON-005",
        item_description: "Travel, Accommodation & Site Advisory Logistics",
        cost_category: "TRANSPORTATION",
        uom: "LOT",
        quantity: 1,
        unit_rate: 3500,
      },
    ],
  },
  CONSTRUCTION: {
    name: "Construction & Civil Engineering",
    items: [
      {
        item_code: "CIV-001",
        item_description:
          "Site Preparation, Ground Clearance & Bulk Earthworks Excavation",
        cost_category: "EQUIPMENT",
        uom: "M3",
        quantity: 350,
        unit_rate: 45,
      },
      {
        item_code: "CIV-002",
        item_description:
          "Reinforced Concrete Foundation & Ground Beams (Grade 25)",
        cost_category: "MATERIALS",
        uom: "M3",
        quantity: 120,
        unit_rate: 850,
      },
      {
        item_code: "CIV-003",
        item_description:
          "High-Tensile Deformed Steel Rebar Fixing & Placement",
        cost_category: "MATERIALS",
        uom: "TON",
        quantity: 18,
        unit_rate: 4200,
      },
      {
        item_code: "CIV-004",
        item_description: "Masonry Block Walling & Structural Columns",
        cost_category: "MATERIALS",
        uom: "M2",
        quantity: 450,
        unit_rate: 120,
      },
      {
        item_code: "CIV-005",
        item_description: "Electrical Conduit, Distribution & Wiring Works",
        cost_category: "SUBCONTRACTING",
        uom: "LOT",
        quantity: 1,
        unit_rate: 15000,
      },
    ],
  },
  MARKETING: {
    name: "Marketing & Creative Campaign",
    items: [
      {
        item_code: "MKT-001",
        item_description:
          "Campaign Strategy, Creative Concept & Brand Messaging",
        cost_category: "LABOUR",
        uom: "LOT",
        quantity: 1,
        unit_rate: 5000,
      },
      {
        item_code: "MKT-002",
        item_description: "Commercial Video Production, Shoot & Photography",
        cost_category: "SUBCONTRACTING",
        uom: "DAY",
        quantity: 4,
        unit_rate: 2800,
      },
      {
        item_code: "MKT-003",
        item_description:
          "Digital Ad Media Buying (Google Search & Social Media)",
        cost_category: "OTHER",
        uom: "LOT",
        quantity: 1,
        unit_rate: 12000,
      },
      {
        item_code: "MKT-004",
        item_description: "Content Creation, Copywriting & Visual Asset Design",
        cost_category: "LABOUR",
        uom: "HR",
        quantity: 60,
        unit_rate: 85,
      },
      {
        item_code: "MKT-005",
        item_description:
          "Analytics Dashboard, Conversion Tracking & Bi-Weekly Reporting",
        cost_category: "LABOUR",
        uom: "LOT",
        quantity: 1,
        unit_rate: 2200,
      },
    ],
  },
  GENERAL: {
    name: "General Project Management & Operations",
    items: [
      {
        item_code: "GEN-001",
        item_description: "Project Management, Governance & Status Reporting",
        cost_category: "LABOUR",
        uom: "MO",
        quantity: 6,
        unit_rate: 3500,
      },
      {
        item_code: "GEN-002",
        item_description: "Hardware & Operational Equipment Procurement",
        cost_category: "EQUIPMENT",
        uom: "EA",
        quantity: 10,
        unit_rate: 1200,
      },
      {
        item_code: "GEN-003",
        item_description:
          "Staff Onboarding, Knowledge Transfer & Training Sessions",
        cost_category: "LABOUR",
        uom: "DAY",
        quantity: 5,
        unit_rate: 800,
      },
      {
        item_code: "GEN-004",
        item_description: "Vendor Logistics, Shipping & Local Clearance",
        cost_category: "TRANSPORTATION",
        uom: "LOT",
        quantity: 1,
        unit_rate: 2500,
      },
    ],
  },
};

const STATUS_BADGES = {
  DRAFT: {
    label: "Draft",
    cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  },
  PENDING_APPROVAL: {
    label: "Pending Approval",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 animate-pulse",
  },
  UNDER_REVIEW: {
    label: "Under Review",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  },
  APPROVED: {
    label: "Approved",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  REVISED: {
    label: "Revised",
    cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  },
  REVERSED: {
    label: "Reversed",
    cls: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
  },
  RETURNED: {
    label: "Returned",
    cls: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300",
  },
  REJECTED: {
    label: "Rejected",
    cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

export default function BOQManager() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedProjectDetails, setSelectedProjectDetails] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [boqs, setBOQs] = useState([]);
  const [activeBOQ, setActiveBOQ] = useState(null);
  const [boqItems, setBOQItems] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [currencies, setCurrencies] = useState([
    { code: "GHS", symbol: "GH₵", name: "Ghana Cedis" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  ]);

  // Financial summary inputs
  const [contingencyPercent, setContingencyPercent] = useState(5);
  const [taxPercent, setTaxPercent] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [currency, setCurrency] = useState("GHS");

  // Load currencies from fin_currencies
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/finance/currencies", {
          params: { active: 1 },
        });
        const list = res.data?.items || res.data || [];
        if (Array.isArray(list) && list.length > 0) {
          setCurrencies(
            list.map((c) => ({
              code: c.code || c.currency_code,
              symbol: c.symbol || c.code,
              name: c.name || c.currency_name,
            })),
          );
        }
      } catch (e) {
        // Fallback default currencies
      }
    })();
  }, []);

  // Dynamic Cost Categories loaded from Setup
  const [costCategories, setCostCategories] = useState(DEFAULT_COST_CATEGORIES);

  const fetchCostCategories = async () => {
    try {
      const res = await api.get("/construction/cost-categories");
      const items = res.data?.items;
      if (Array.isArray(items) && items.length > 0) {
        const mapped = items
          .filter((c) => c.is_active !== "N")
          .map((c) => {
            const colorKey = c.color_code || "blue";
            return {
              value: c.category_code,
              label: c.category_name,
              cost_type: c.cost_type,
              color: COLOR_BADGES[colorKey] || COLOR_BADGES.blue,
              default_overhead_percent: Number(c.default_overhead_percent || 0),
              default_profit_percent: Number(c.default_profit_percent || 0),
            };
          });
        if (mapped.length) {
          setCostCategories(mapped);
        }
      }
    } catch (err) {
      console.error("Failed to load cost categories", err);
    }
  };

  useEffect(() => {
    fetchCostCategories();
  }, []);

  // UOMs populated from inv_uoms table
  const { uoms } = useUoms();
  const dynamicUomOptions = useMemo(() => {
    if (Array.isArray(uoms) && uoms.length > 0) {
      return uoms
        .filter((u) => u.is_active !== 0 && u.is_active !== false)
        .map((u) => ({
          value: u.uom_code || u.code || "",
          label: u.uom_code || u.code || "",
        }));
    }
    return UOM_OPTIONS;
  }, [uoms]);

  // Tax Codes linked to BOQ page (Page ID 29)
  const { taxCodes: boqTaxCodes = [] } = useTaxCodesByPageId(
    PAGE_IDS.BOQ || 29,
  );
  const [selectedTaxCodeId, setSelectedTaxCodeId] = useState("");
  const [selectedTaxCode, setSelectedTaxCode] = useState(null);

  // Print Preview & Document Template states
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printHtml, setPrintHtml] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [reportHeader, setReportHeader] = useState(null);

  // Approval inputs
  const [preparedByName, setPreparedByName] = useState("");
  const [preparedDate, setPreparedDate] = useState("");
  const [reviewedByName, setReviewedByName] = useState("");
  const [reviewedDate, setReviewedDate] = useState("");
  const [approvedByName, setApprovedByName] = useState("");
  const [approvedDate, setApprovedDate] = useState("");
  const [version, setVersion] = useState("1.0");
  const [remarks, setRemarks] = useState("");

  // Sales-order style workflow states
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [candidateWorkflow, setCandidateWorkflow] = useState(null);
  const [workflowSteps, setWorkflowSteps] = useState([]);
  const [firstApprover, setFirstApprover] = useState(null);
  const [targetApproverId, setTargetApproverId] = useState("");
  const [forwardComments, setForwardComments] = useState("");
  const [submittingForward, setSubmittingForward] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [wfLoading, setWfLoading] = useState(false);

  // Approve / Reject modal states
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveComments, setApproveComments] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState("APPROVED");
  const [approvalRemarks, setApprovalRemarks] = useState("");
  const [newVersionLabel, setNewVersionLabel] = useState("");
  const [newVersionRemarks, setNewVersionRemarks] = useState("");
  const [activeItemForRate, setActiveItemForRate] = useState(null);

  // Corrected Universal Rate Form & Resource Takeoff
  const [rateForm, setRateForm] = useState({
    category_costs: {},
    material_cost: 0,
    labour_cost: 0,
    plant_cost: 0,
    subcontract_cost: 0,
    cloud_software_cost: 0,
    logistics_cost: 0,
    other_cost: 0,
    wastage_percent: 0,
    overhead_percent: 10,
    profit_percent: 15,
    notes: "",
    resource_items: [],
  });
  const [rateBuildTab, setRateBuildTab] = useState("categories");
  const [newResourceItem, setNewResourceItem] = useState({
    description: "",
    category: "LABOUR",
    uom: "HR",
    quantity: 1,
    unit_cost: 0,
  });

  // New BOQ form
  const [newBOQ, setNewBOQ] = useState({
    boq_title: "",
    boq_reference: "",
    client_name: "",
    site_location: "",
    boq_date: new Date().toISOString().split("T")[0],
    currency: "GHS",
    version: "1.0",
    contingency_percent: 5,
    tax_percent: 0,
    tax_code_id: null,
    tax_code: null,
    other_charges: 0,
    prepared_by_name: "",
    remarks: "",
  });

  const fileInputRef = useRef(null);

  // Load Document Template Report Header on mount
  useEffect(() => {
    (async () => {
      try {
        const rh = await fetchReportHeader(api);
        setReportHeader(rh);
      } catch (e) {}
    })();
  }, []);

  // Load Projects on mount (Do not auto-select any project by default)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/projects/projects", {
          params: { active: "all" },
        });
        const prjs = res.data?.items || [];
        setProjects(prjs);
      } catch (e) {
        toast.error("Failed to load projects");
      }
    })();
  }, []);

  // Update selectedProject and fetch details when ID changes
  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedProject(null);
      setSelectedProjectDetails(null);
      setProjectTasks([]);
      setBOQs([]);
      setActiveBOQ(null);
      setBOQItems([]);
      return;
    }
    const found = Array.isArray(projects)
      ? projects.find((p) => String(p.id) === String(selectedProjectId))
      : null;
    setSelectedProject(found || null);
    if (found?.currency) {
      setCurrency(found.currency);
    }
    (async () => {
      try {
        const [projRes, taskRes] = await Promise.all([
          api.get(`/projects/projects/${selectedProjectId}`).catch(() => null),
          api.get(`/projects/tasks`, { params: { project_id: selectedProjectId, active: "all" } }).catch(() => ({ data: { items: [] } }))
        ]);
        if (projRes?.data?.item) {
          setSelectedProjectDetails(projRes.data.item);
          if (projRes.data.item.currency) {
            setCurrency(projRes.data.item.currency);
          }
        }
        const tList = taskRes?.data?.items || taskRes?.data?.tasks || [];
        setProjectTasks(Array.isArray(tList) ? tList : []);
      } catch (e) {
        console.error("Failed to fetch detailed project info or tasks:", e);
      }
    })();
    fetchBOQs();
  }, [selectedProjectId, projects]);

  // Derived available Work Plan/WBS / Scope elements from selected project & tasks
  const availableWbsOptions = useMemo(() => {
    const list = [];
    const seenCodes = new Set();

    // 1. Add all tasks from the Project Work Plan/WBS
    if (Array.isArray(projectTasks)) {
      projectTasks.forEach((t) => {
        const code = t.wbs_code || `TASK-${t.id}`;
        if (!seenCodes.has(code)) {
          seenCodes.add(code);
          const taskName = t.task_title || t.task_name || t.title || "Work Plan/WBS Task";
          list.push({
            code,
            name: taskName,
            scopeName: t.scope_name || "",
            label: `${t.wbs_code ? `[${t.wbs_code}] ` : ""}${taskName}${t.scope_name ? ` (${t.scope_name})` : ""}`,
          });
        }
      });
    }

    // 2. Add scopes and WBS elements from selectedProjectDetails
    if (
      selectedProjectDetails?.scopes &&
      Array.isArray(selectedProjectDetails.scopes)
    ) {
      selectedProjectDetails.scopes.forEach((sc, scIdx) => {
        const sName = sc.scope_name || `Scope #${scIdx + 1}`;
        if (Array.isArray(sc.wbs) && sc.wbs.length > 0) {
          sc.wbs.forEach((w) => {
            const code = w.wbs_code || "WBS";
            if (!seenCodes.has(code)) {
              seenCodes.add(code);
              list.push({
                code,
                name: w.wbs_name || w.name || w.wbs_code || "Work Plan/WBS Element",
                scopeName: sName,
                label: `${w.wbs_code || "WBS"} - ${w.wbs_name || w.name || ""} (${sName})`,
              });
            }
          });
        } else {
          const code = `SCOPE-${scIdx + 1}`;
          if (!seenCodes.has(code)) {
            seenCodes.add(code);
            list.push({
              code,
              name: sName,
              scopeName: sName,
              label: sName,
            });
          }
        }
      });
    }
    return list;
  }, [selectedProjectDetails, projectTasks]);

  const fetchBOQs = async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await api.get("/construction/boqs", {
        params: { project_id: selectedProjectId },
      });
      const items = res.data?.items || [];
      setBOQs(items);
      if (items.length > 0) {
        loadBOQDetails(items[0].id);
      } else {
        setActiveBOQ(null);
        setBOQItems([]);
        setRevisions([]);
      }
    } catch (e) {
      toast.error("Failed to load project BOQs");
    } finally {
      setLoading(false);
    }
  };

  const loadBOQDetails = async (boqId) => {
    setLoading(true);
    try {
      const res = await api.get(`/construction/boqs/${boqId}`);
      const b = res.data?.item || null;
      const itms = res.data?.items || [];
      const revs = res.data?.revisions || [];

      setActiveBOQ(b);
      setBOQItems(itms);
      setRevisions(revs);

      if (b) {
        setContingencyPercent(Number(b.contingency_percent || 0));
        setTaxPercent(Number(b.tax_percent || 0));
        if (b.tax_code_id) {
          setSelectedTaxCodeId(String(b.tax_code_id));
          if (b.tax_code) {
            setSelectedTaxCode({
              id: b.tax_code_id,
              code: b.tax_code,
              name: b.tax_code,
            });
          }
        } else {
          setSelectedTaxCodeId("");
          setSelectedTaxCode(null);
        }
        setOtherCharges(Number(b.other_charges || 0));
        setCurrency(b.currency || "GHS");
        setVersion(b.version || "1.0");
        setPreparedByName(b.prepared_by_name || "");
        setPreparedDate(
          b.prepared_date ? String(b.prepared_date).split("T")[0] : "",
        );
        setReviewedByName(b.reviewed_by_name || "");
        setReviewedDate(
          b.reviewed_date ? String(b.reviewed_date).split("T")[0] : "",
        );
        setApprovedByName(b.approved_by_name || "");
        setApprovedDate(
          b.approved_date ? String(b.approved_date).split("T")[0] : "",
        );
        setRemarks(b.remarks || "");
      }
    } catch (e) {
      toast.error("Failed to load BOQ details");
    } finally {
      setLoading(false);
    }
  };

  // Add Item Row
  const addItemRow = () => {
    const nextNum = boqItems.length + 1;
    const projectCodePrefix = selectedProject?.project_code || "PRJ";
    const projTypeKey =
      selectedProject?.project_type ||
      selectedProjectDetails?.project_type ||
      "GENERAL_CONSTRUCTION";
    const projConfig =
      PROJECT_TYPE_CONFIG[projTypeKey] ||
      PROJECT_TYPE_CONFIG.GENERAL_CONSTRUCTION;
    const defaultWbs = availableWbsOptions[0];

    const newItem = {
      id: `temp-${Date.now()}-${Math.random()}`,
      item_code: "",
      item_description: "",
      cost_category: projConfig.defaultCategory || "LABOUR",
      uom: projConfig.defaultUom || "EA",
      wbs_code: "",
      scope_name: "",
      quantity: 1,
      unit_rate: 0,
      amount: 0,
      tax_rate_percent: 0,
      tax_amount: 0,
      remarks: "",
      item_order: nextNum,
    };
    setBOQItems([...boqItems, newItem]);
  };

  // Add Predefined Template Items
  const addTemplateItems = (templateKey) => {
    const tpl = INDUSTRY_TEMPLATES[templateKey];
    if (!tpl) return;
    const nextNum = boqItems.length + 1;
    const projectCodePrefix = selectedProject?.project_code || "PRJ";
    const defaultWbs = availableWbsOptions[0];

    const newItems = tpl.items.map((it, idx) => ({
      id: `tpl-${Date.now()}-${idx}`,
      item_code: `${projectCodePrefix}-${it.item_code}`,
      item_description: it.item_description,
      cost_category: it.cost_category,
      uom: it.uom,
      wbs_code: defaultWbs?.code || "",
      scope_name: defaultWbs?.scopeName || "",
      quantity: it.quantity,
      unit_rate: it.unit_rate,
      amount: Number((it.quantity * it.unit_rate).toFixed(2)),
      tax_rate_percent: 0,
      tax_amount: 0,
      remarks: `Template: ${tpl.name}`,
      item_order: nextNum + idx,
    }));

    setBOQItems([...boqItems, ...newItems]);
    setShowTemplateMenu(false);
    toast.success(`Added ${newItems.length} cost elements from ${tpl.name}`);
  };

  // Update item field
  const updateItem = (index, field, value) => {
    const updated = [...boqItems];
    updated[index] = { ...updated[index], [field]: value };

    if (
      field === "quantity" ||
      field === "unit_rate" ||
      field === "tax_rate_percent"
    ) {
      const q = Number(updated[index].quantity || 0);
      const r = Number(updated[index].unit_rate || 0);
      const amt = Number((q * r).toFixed(2));
      updated[index].amount = amt;
      const taxRate = Number(updated[index].tax_rate_percent || 0);
      updated[index].tax_amount = Number(((amt * taxRate) / 100).toFixed(2));
    }

    setBOQItems(updated);
  };

  const removeItemRow = (index) => {
    const updated = boqItems.filter((_, i) => i !== index);
    setBOQItems(updated);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return boqItems.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [boqItems]);

  const contingencyAmount = useMemo(() => {
    return Number(
      ((subtotal * Number(contingencyPercent || 0)) / 100).toFixed(2),
    );
  }, [subtotal, contingencyPercent]);

  const taxAmount = useMemo(() => {
    const taxableBase = subtotal + contingencyAmount;
    return Number(((taxableBase * Number(taxPercent || 0)) / 100).toFixed(2));
  }, [subtotal, contingencyAmount, taxPercent]);

  const finalEstimatedCost = useMemo(() => {
    return Number(
      (
        subtotal +
        contingencyAmount +
        taxAmount +
        Number(otherCharges || 0)
      ).toFixed(2),
    );
  }, [subtotal, contingencyAmount, taxAmount, otherCharges]);

  // Project Approved Budget & Financial Health
  const projectBudget = Number(
    selectedProject?.budget || selectedProjectDetails?.budget || 0,
  );
  const budgetVariance =
    projectBudget > 0 ? projectBudget - finalEstimatedCost : 0;
  const budgetUtilization =
    projectBudget > 0 ? (finalEstimatedCost / projectBudget) * 100 : 0;

  // Category breakdown calculations (Dynamic for all configured cost categories)
  const categoryTotals = useMemo(() => {
    const totals = {};
    costCategories.forEach((c) => {
      totals[c.value] = 0;
    });
    boqItems.forEach((i) => {
      const cat = i.cost_category || "MATERIALS";
      if (totals[cat] !== undefined) {
        totals[cat] += Number(i.amount || 0);
      } else {
        totals[cat] = Number(i.amount || 0);
      }
    });
    return totals;
  }, [boqItems, costCategories]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    costCategories.forEach((c) => {
      counts[c.value] = 0;
    });
    boqItems.forEach((i) => {
      const cat = i.cost_category || "MATERIALS";
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      } else {
        counts[cat] = 1;
      }
    });
    return counts;
  }, [boqItems, costCategories]);

  // Sync selectedTaxCode when boqTaxCodes loads or selectedTaxCodeId changes
  useEffect(() => {
    if (
      selectedTaxCodeId &&
      boqTaxCodes.length > 0 &&
      selectedTaxCodeId !== "CUSTOM"
    ) {
      const match = boqTaxCodes.find(
        (tc) => String(tc.id) === String(selectedTaxCodeId),
      );
      if (match) {
        setSelectedTaxCode(match);
      }
    }
  }, [boqTaxCodes, selectedTaxCodeId]);

  // Handle Tax Code selection from linked Tax Codes
  const handleTaxCodeSelect = (taxCodeId) => {
    setSelectedTaxCodeId(taxCodeId);
    if (!taxCodeId || taxCodeId === "") {
      setSelectedTaxCode(null);
      setTaxPercent(0);
      return;
    }
    if (taxCodeId === "CUSTOM") {
      setSelectedTaxCode({ code: "CUSTOM", name: "Custom Rate" });
      return;
    }
    const found = boqTaxCodes.find((tc) => String(tc.id) === String(taxCodeId));
    if (found) {
      setSelectedTaxCode(found);
      setTaxPercent(Number(found.rate_percent || 0));
    }
  };

  // Save BOQ Items and Totals
  const handleSaveBOQ = async (recordRevision = false, revRemarks = "") => {
    if (!activeBOQ) return;
    setSaving(true);
    try {
      await api.post(`/construction/boqs/${activeBOQ.id}/items`, {
        items: boqItems,
        contingency_percent: contingencyPercent,
        contingency_amount: contingencyAmount,
        tax_code_id:
          selectedTaxCodeId && selectedTaxCodeId !== "CUSTOM"
            ? Number(selectedTaxCodeId)
            : null,
        tax_code: selectedTaxCode?.code || null,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        other_charges: otherCharges,
        subtotal,
        total_amount: finalEstimatedCost,
        version,
        prepared_by_name: preparedByName,
        reviewed_by_name: reviewedByName,
        approved_by_name: approvedByName,
        remarks,
        record_revision: recordRevision,
        revision_remarks: revRemarks,
      });
      toast.success("BOQ items and calculated totals saved successfully");
      loadBOQDetails(activeBOQ.id);
      fetchBOQs();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to save BOQ");
    } finally {
      setSaving(false);
    }
  };

  // Create BOQ
  const handleCreateBOQ = async (e) => {
    e.preventDefault();
    if (!newBOQ.boq_title) return toast.error("BOQ Title is required");
    try {
      const res = await api.post("/construction/boqs", {
        ...newBOQ,
        project_id: selectedProjectId,
        tax_code_id:
          newBOQ.tax_code_id ||
          (selectedTaxCodeId && selectedTaxCodeId !== "CUSTOM"
            ? Number(selectedTaxCodeId)
            : null),
        tax_code: newBOQ.tax_code || selectedTaxCode?.code || null,
      });
      toast.success("BOQ created successfully");
      setShowCreateModal(false);
      setNewBOQ({
        boq_title: "",
        boq_reference: "",
        client_name: "",
        site_location: "",
        boq_date: new Date().toISOString().split("T")[0],
        currency: "GHS",
        version: "1.0",
        contingency_percent: 5,
        tax_percent: 0,
        other_charges: 0,
        prepared_by_name: "",
        remarks: "",
      });
      fetchBOQs();
      if (res.data?.id) {
        loadBOQDetails(res.data.id);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to create BOQ");
    }
  };

  // Open Create Modal and prepopulate project details
  const openCreateModal = () => {
    if (!selectedProjectId) {
      toast.info("Please select a project first");
      return;
    }
    const projCode = selectedProject?.project_code || "PRJ";
    const client = selectedProject?.client_name || "";
    const site = [selectedProject?.site_address, selectedProject?.site_city]
      .filter(Boolean)
      .join(", ");
    setNewBOQ({
      boq_title: selectedProject
        ? `${selectedProject.project_name} - Main BOQ`
        : "",
      boq_reference: `BOQ-${projCode}-${new Date().getFullYear()}-01`,
      client_name: client,
      site_location: site,
      boq_date: new Date().toISOString().split("T")[0],
      currency: "GHS",
      version: "1.0",
      contingency_percent: 5,
      tax_percent: 0,
      other_charges: 0,
      prepared_by_name: preparedByName || "Senior Quantity Surveyor",
      remarks: "Standard specification and bills of quantities.",
    });
    setShowCreateModal(true);
  };

  // Workflow Handlers (Sales-order style)
  const openForwardModal = async () => {
    if (!activeBOQ) return;
    setShowForwardModal(true);
    setForwardComments("");
    setWfLoading(true);
    try {
      // 1. Fetch available users for approver dropdown
      let uList = [];
      try {
        const uRes = await api.get("/workflows/users");
        uList = uRes?.data?.users || uRes?.data?.items || [];
      } catch {
        const uRes2 = await api
          .get("/admin/users", { params: { active: 1 } })
          .catch(() => null);
        uList = uRes2?.data?.items || [];
      }
      setAvailableUsers(uList);

      // 2. Fetch workflows
      const res = await api.get("/workflows");
      const list = Array.isArray(res.data?.items) ? res.data.items : [];
      const route = "/project-management/boq";
      const normalize = (s) =>
        String(s || "")
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "_");

      const chosen =
        list.find(
          (w) =>
            Number(w.is_active) === 1 &&
            (String(w.document_route) === route ||
              normalize(w.document_type) === "PROJECT_BOQ" ||
              normalize(w.document_type) === "BOQ"),
        ) ||
        list.find(
          (w) =>
            Number(w.is_active) === 1 &&
            normalize(w.document_type).includes("PROJECT"),
        ) ||
        null;

      setCandidateWorkflow(chosen || null);

      if (chosen) {
        const wfDetail = await api.get(`/workflows/${chosen.id}`);
        const steps = wfDetail.data?.item?.steps || [];
        setWorkflowSteps(steps);
        const first = steps[0] || null;
        setFirstApprover(first);
        if (first?.approver_user_id) {
          setTargetApproverId(String(first.approver_user_id));
        } else if (first?.approvers?.length) {
          setTargetApproverId(
            String(first.approvers[0].id || first.approvers[0].user_id),
          );
        }
      } else if (uList.length > 0) {
        setTargetApproverId(String(uList[0].id));
      }
    } catch (e) {
      console.error("Workflow load error:", e);
    } finally {
      setWfLoading(false);
    }
  };

  const handleForwardSubmit = async () => {
    if (!activeBOQ) return;
    setSubmittingForward(true);
    try {
      await api.post(`/construction/boqs/${activeBOQ.id}/submit`, {
        workflow_id: candidateWorkflow?.id || null,
        target_user_id: targetApproverId ? Number(targetApproverId) : null,
        comments: forwardComments,
      });
      toast.success("BOQ forwarded for approval successfully");
      setShowForwardModal(false);
      loadBOQDetails(activeBOQ.id);
      fetchBOQs();
    } catch (e) {
      toast.error(
        e?.response?.data?.message || "Failed to forward BOQ for approval",
      );
    } finally {
      setSubmittingForward(false);
    }
  };

  const handleApproveSubmit = async () => {
    if (!activeBOQ) return;
    try {
      await api.post(`/construction/boqs/${activeBOQ.id}/approve`, {
        comments: approveComments,
      });
      toast.success("BOQ approved successfully");
      setShowApproveModal(false);
      setApproveComments("");
      loadBOQDetails(activeBOQ.id);
      fetchBOQs();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to approve BOQ");
    }
  };

  const handleRejectSubmit = async () => {
    if (!activeBOQ) return;
    if (!rejectionReason.trim()) {
      return toast.error("Please provide a rejection reason");
    }
    try {
      await api.post(`/construction/boqs/${activeBOQ.id}/reject`, {
        rejection_reason: rejectionReason,
      });
      toast.success("BOQ rejected");
      setShowRejectModal(false);
      setRejectionReason("");
      loadBOQDetails(activeBOQ.id);
      fetchBOQs();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to reject BOQ");
    }
  };

  const handleReverseSubmit = async () => {
    if (!activeBOQ) return;
    if (
      !window.confirm(
        "Are you sure you want to reverse approval? This will return the BOQ to DRAFT status so it can be edited.",
      )
    )
      return;
    try {
      await api.post(`/construction/boqs/${activeBOQ.id}/reverse`, {
        reason: "Approval reversed by authorized user",
      });
      toast.success("Approval reversed. BOQ is now back in DRAFT.");
      loadBOQDetails(activeBOQ.id);
      fetchBOQs();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to reverse approval");
    }
  };

  // Transition Status (Approval Workflow)
  const handleStatusTransition = async () => {
    if (!activeBOQ) return;
    try {
      await api.post(`/construction/boqs/${activeBOQ.id}/status`, {
        status: targetStatus,
        approved_by_name: approvedByName || "Project Director",
        approved_date: new Date().toISOString().split("T")[0],
        approval_remarks: approvalRemarks,
      });
      toast.success(`BOQ transitioned to ${targetStatus}`);
      setShowStatusModal(false);
      setApprovalRemarks("");
      loadBOQDetails(activeBOQ.id);
      fetchBOQs();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to update status");
    }
  };

  // Create New Revision
  const handleCreateRevision = async () => {
    if (!activeBOQ) return;
    try {
      const res = await api.post(
        `/construction/boqs/${activeBOQ.id}/revision`,
        {
          new_version: newVersionLabel || undefined,
          revision_remarks: newVersionRemarks,
        },
      );
      toast.success(res.data?.message || "New revision created");
      setShowRevisionModal(false);
      setNewVersionLabel("");
      setNewVersionRemarks("");
      loadBOQDetails(activeBOQ.id);
      fetchBOQs();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to create revision");
    }
  };

  // Delete BOQ
  const handleDeleteBOQ = async () => {
    if (!activeBOQ) return;
    if (
      !window.confirm(
        `Are you sure you want to delete "${activeBOQ.boq_title || activeBOQ.title}"? This will delete all line items and revisions.`,
      )
    )
      return;
    try {
      await api.delete(`/construction/boqs/${activeBOQ.id}`);
      toast.success("BOQ deleted successfully");
      fetchBOQs();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to delete BOQ");
    }
  };

  // Rate Analysis Modal handlers
  const openRateAnalysis = async (item) => {
    setActiveItemForRate(item);
    setShowRateModal(true);
    setRateBuildTab("categories");

    const catObj =
      costCategories.find((c) => c.value === (item.cost_category || "MATERIALS")) ||
      costCategories[0];
    const defOverhead = Number(catObj?.default_overhead_percent ?? 10);
    const defProfit = Number(catObj?.default_profit_percent ?? 15);
    const currentRate = Number(item.unit_rate || 0);

    const multiplier = (1 + defOverhead / 100) * (1 + defProfit / 100);
    const estimatedDirect = currentRate > 0 ? Number((currentRate / multiplier).toFixed(2)) : 0;
    const initialCategoryKey = item.cost_category || "MATERIALS";

    const initialCatCosts = {};
    costCategories.forEach((c) => {
      initialCatCosts[c.value] = c.value === initialCategoryKey ? estimatedDirect : 0;
    });

    let loadedForm = {
      category_costs: initialCatCosts,
      material_cost: initialCategoryKey === "MATERIALS" ? estimatedDirect : 0,
      labour_cost: initialCategoryKey === "LABOUR" ? estimatedDirect : 0,
      plant_cost: initialCategoryKey === "EQUIPMENT" ? estimatedDirect : 0,
      subcontract_cost: initialCategoryKey === "SUBCONTRACTING" ? estimatedDirect : 0,
      cloud_software_cost: initialCategoryKey === "SOFTWARE_CLOUD" ? estimatedDirect : 0,
      logistics_cost: initialCategoryKey === "TRANSPORTATION" ? estimatedDirect : 0,
      other_cost: initialCategoryKey === "OTHER" ? estimatedDirect : 0,
      wastage_percent: 0,
      overhead_percent: defOverhead,
      profit_percent: defProfit,
      notes: "",
      resource_items: [],
    };

    try {
      if (
        item.id &&
        !String(item.id).startsWith("temp-") &&
        !String(item.id).startsWith("tpl-")
      ) {
        const res = await api.get(
          `/construction/boq-items/${item.id}/rate-analysis`,
        );
        if (res.data?.item) {
          const r = res.data.item;
          const brk = r.breakdown || {};
          const catCosts = brk.category_costs ? { ...brk.category_costs } : {};

          if (catCosts.MATERIALS === undefined && r.material_cost) catCosts.MATERIALS = Number(r.material_cost);
          if (catCosts.LABOUR === undefined && r.labour_cost) catCosts.LABOUR = Number(r.labour_cost);
          if (catCosts.EQUIPMENT === undefined && (r.plant_cost || r.equipment_cost)) catCosts.EQUIPMENT = Number(r.plant_cost || r.equipment_cost);
          if (catCosts.SUBCONTRACTING === undefined && (r.subcontract_cost || r.subc_cost)) catCosts.SUBCONTRACTING = Number(r.subcontract_cost || r.subc_cost);
          if (catCosts.SOFTWARE_CLOUD === undefined && r.cloud_software_cost) catCosts.SOFTWARE_CLOUD = Number(r.cloud_software_cost);
          if (catCosts.TRANSPORTATION === undefined && (r.logistics_cost || r.transport_cost)) catCosts.TRANSPORTATION = Number(r.logistics_cost || r.transport_cost);

          costCategories.forEach((c) => {
            if (catCosts[c.value] === undefined) catCosts[c.value] = 0;
          });

          loadedForm = {
            category_costs: catCosts,
            material_cost: Number(catCosts.MATERIALS ?? r.material_cost ?? 0),
            labour_cost: Number(catCosts.LABOUR ?? r.labour_cost ?? 0),
            plant_cost: Number(catCosts.EQUIPMENT ?? r.plant_cost ?? 0),
            subcontract_cost: Number(catCosts.SUBCONTRACTING ?? r.subcontract_cost ?? r.subc_cost ?? 0),
            cloud_software_cost: Number(catCosts.SOFTWARE_CLOUD ?? r.cloud_software_cost ?? 0),
            logistics_cost: Number(catCosts.TRANSPORTATION ?? r.logistics_cost ?? r.transport_cost ?? 0),
            other_cost: Number(catCosts.OTHER ?? r.other_cost ?? 0),
            wastage_percent: Number(r.wastage_percent || 0),
            overhead_percent: Number(r.overhead_percent !== undefined ? r.overhead_percent : defOverhead),
            profit_percent: Number((r.profit_percent || r.profit_markup_percent) !== undefined ? (r.profit_percent || r.profit_markup_percent) : defProfit),
            notes: r.notes || "",
            resource_items: Array.isArray(brk.resource_items) ? brk.resource_items : [],
          };
        }
      }
    } catch (e) {}

    setRateForm(loadedForm);
  };

  const calculatedDirectCost = useMemo(() => {
    let sum = 0;
    const catCosts = rateForm.category_costs || {};
    const keys = Object.keys(catCosts);
    if (keys.length > 0) {
      keys.forEach((k) => {
        sum += Number(catCosts[k] || 0);
      });
    } else {
      sum =
        Number(rateForm.material_cost || 0) +
        Number(rateForm.labour_cost || 0) +
        Number(rateForm.plant_cost || 0) +
        Number(rateForm.subcontract_cost || 0) +
        Number(rateForm.cloud_software_cost || 0) +
        Number(rateForm.logistics_cost || 0) +
        Number(rateForm.other_cost || 0);
    }
    return sum;
  }, [rateForm]);

  const calculatedWastage = useMemo(() => {
    const matCost = Number(rateForm.category_costs?.MATERIALS || rateForm.material_cost || 0);
    return (matCost * Number(rateForm.wastage_percent || 0)) / 100;
  }, [rateForm]);

  const calculatedDirectWithWastage = calculatedDirectCost + calculatedWastage;
  const calculatedOverhead = (calculatedDirectWithWastage * Number(rateForm.overhead_percent || 0)) / 100;
  const calculatedProfit = ((calculatedDirectWithWastage + calculatedOverhead) * Number(rateForm.profit_percent || 0)) / 100;
  const calculatedUnitRate = Number((calculatedDirectWithWastage + calculatedOverhead + calculatedProfit).toFixed(2));

  // Handle detailed resource takeoff items inside Rate Build-Up
  const addResourceItem = () => {
    if (!newResourceItem.description) {
      toast.warning("Resource description is required");
      return;
    }
    const qty = Number(newResourceItem.quantity || 1);
    const unitCost = Number(newResourceItem.unit_cost || 0);
    const total = Number((qty * unitCost).toFixed(2));
    const newItem = {
      id: Date.now(),
      description: newResourceItem.description,
      category: newResourceItem.category,
      uom: newResourceItem.uom,
      quantity: qty,
      unit_cost: unitCost,
      total,
    };
    const updatedResources = [...(rateForm.resource_items || []), newItem];

    // Roll up into category_costs
    const updatedCategoryCosts = { ...(rateForm.category_costs || {}) };
    const currentCatTotal = Number(updatedCategoryCosts[newResourceItem.category] || 0);
    updatedCategoryCosts[newResourceItem.category] = Number((currentCatTotal + total).toFixed(2));

    setRateForm({
      ...rateForm,
      resource_items: updatedResources,
      category_costs: updatedCategoryCosts,
    });
    setNewResourceItem({
      description: "",
      category: newResourceItem.category,
      uom: "HR",
      quantity: 1,
      unit_cost: 0,
    });
  };

  const removeResourceItem = (index) => {
    const list = [...(rateForm.resource_items || [])];
    const removed = list.splice(index, 1)[0];
    if (removed) {
      const updatedCategoryCosts = { ...(rateForm.category_costs || {}) };
      const currentVal = Number(updatedCategoryCosts[removed.category] || 0);
      updatedCategoryCosts[removed.category] = Math.max(0, Number((currentVal - removed.total).toFixed(2)));
      setRateForm({
        ...rateForm,
        resource_items: list,
        category_costs: updatedCategoryCosts,
      });
    }
  };

  const applyRateAnalysis = async () => {
    if (!activeItemForRate) return;
    const idx = boqItems.findIndex((i) => i.id === activeItemForRate.id);
    if (idx !== -1) {
      const updated = [...boqItems];
      updated[idx] = {
        ...updated[idx],
        unit_rate: calculatedUnitRate,
        amount: Number((Number(updated[idx].quantity || 0) * calculatedUnitRate).toFixed(2)),
      };
      setBOQItems(updated);
    }
    if (
      activeItemForRate.id &&
      !String(activeItemForRate.id).startsWith("temp-") &&
      !String(activeItemForRate.id).startsWith("tpl-")
    ) {
      try {
        await api.post(
          `/construction/boq-items/${activeItemForRate.id}/rate-analysis`,
          {
            material_cost: Number(rateForm.category_costs?.MATERIALS || rateForm.material_cost || 0),
            labour_cost: Number(rateForm.category_costs?.LABOUR || rateForm.labour_cost || 0),
            plant_cost: Number(rateForm.category_costs?.EQUIPMENT || rateForm.plant_cost || 0),
            subcontract_cost: Number(rateForm.category_costs?.SUBCONTRACTING || rateForm.subcontract_cost || 0),
            cloud_software_cost: Number(rateForm.category_costs?.SOFTWARE_CLOUD || rateForm.cloud_software_cost || 0),
            logistics_cost: Number(rateForm.category_costs?.TRANSPORTATION || rateForm.logistics_cost || 0),
            other_cost: Number(rateForm.category_costs?.OTHER || rateForm.other_cost || 0),
            wastage_percent: rateForm.wastage_percent,
            overhead_percent: rateForm.overhead_percent,
            overhead_amount: calculatedOverhead,
            profit_percent: rateForm.profit_percent,
            profit_amount: calculatedProfit,
            computed_unit_rate: calculatedUnitRate,
            notes: rateForm.notes,
            breakdown: {
              category_costs: rateForm.category_costs,
              resource_items: rateForm.resource_items,
            },
            update_boq_item_rate: true,
          },
        );
      } catch (e) {}
    }
    toast.success(`Unit rate updated to ${currency} ${calculatedUnitRate.toFixed(2)}`);
    setShowRateModal(false);
  };

  // Excel Export with Document Template Header
  const exportExcel = async () => {
    if (!boqItems.length) return toast.info("No items to export");
    try {
      const headerInfo =
        reportHeader || (await fetchReportHeader(api).catch(() => ({})));
      const companyName = headerInfo.companyName || "Company";
      const companyAddress = headerInfo.companyAddress || "";
      const companyContact = [headerInfo.companyPhone, headerInfo.companyEmail]
        .filter(Boolean)
        .join("  |  ");
      const companyWebsite = headerInfo.companyWebsite || "";
      const projTypeKey =
        selectedProject?.project_type ||
        selectedProjectDetails?.project_type ||
        "GENERAL_CONSTRUCTION";
      const projTypeObj =
        PROJECT_TYPE_CONFIG[projTypeKey] ||
        PROJECT_TYPE_CONFIG.GENERAL_CONSTRUCTION;

      const aoaData = [[companyName]];
      if (companyAddress) aoaData.push([companyAddress]);
      if (companyContact) aoaData.push([companyContact]);
      if (companyWebsite) aoaData.push([companyWebsite]);
      aoaData.push([]);
      aoaData.push(["PROJECT COSTING & BUDGET ESTIMATION SCHEDULE"]);
      aoaData.push([
        `Project Type: ${projTypeObj.label}`,
        "",
        `Cost Sheet Reference: ${activeBOQ?.boq_reference || "N/A"}`,
        "",
        `Version: ${version || activeBOQ?.version || "1.0"}`,
        "",
        `Date: ${activeBOQ?.boq_date || new Date().toISOString().split("T")[0]}`,
        "",
        `Currency: ${currency}`,
        "",
        `Status: ${activeBOQ?.status || "DRAFT"}`,
      ]);
      aoaData.push([
        `Project: ${selectedProject?.project_name || "—"} (${selectedProject?.project_code || "—"})`,
        "",
        `Client / Sponsor: ${activeBOQ?.client_name || selectedProject?.client_name || "—"}`,
        "",
        `Site / Location: ${activeBOQ?.site_location || selectedProject?.site_address || "—"}`,
        "",
        `Approved Project Budget: ${projectBudget > 0 ? `${currency} ${projectBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "N/A"}`,
      ]);
      aoaData.push([]);

      // Table Header
      aoaData.push([
        "Item Code",
        "Description of Deliverable / Work",
        "Cost Category",
        "Work Plan/WBS Code",
        "Scope / Component",
        "Unit of Measurement",
        "Quantity",
        "Unit Rate",
        "Amount",
        "Tax Rate %",
        "Tax Amount",
        "Remarks",
      ]);

      // Table Rows
      boqItems.forEach((i) => {
        const catObj = costCategories.find((c) => c.value === i.cost_category);
        aoaData.push([
          i.item_code || "",
          i.item_description || i.description || "",
          catObj ? catObj.label : i.cost_category || "Labour",
          i.wbs_code || "",
          i.scope_name || "",
          i.uom || i.unit || "EA",
          Number(i.quantity || 0),
          Number(i.unit_rate || 0),
          Number(i.amount || 0),
          Number(i.tax_rate_percent || 0),
          Number(i.tax_amount || 0),
          i.remarks || "",
        ]);
      });

      // Financial Summary Rows
      aoaData.push([]);
      aoaData.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Direct Subtotal:",
        subtotal,
        "",
        "",
        "",
      ]);
      aoaData.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `Contingency (${contingencyPercent}%):`,
        contingencyAmount,
        "",
        "",
        "",
      ]);
      aoaData.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `Tax & Levies (${selectedTaxCode?.code ? selectedTaxCode.code + " " : ""}${taxPercent}%):`,
        taxAmount,
        "",
        "",
        "",
      ]);
      if (Number(otherCharges || 0) > 0) {
        aoaData.push([
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "Preliminaries & Other Charges:",
          Number(otherCharges || 0),
          "",
          "",
          "",
        ]);
      }
      aoaData.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `Final Estimated Cost (${currency}):`,
        finalEstimatedCost,
        "",
        "",
        "",
      ]);
      if (projectBudget > 0) {
        aoaData.push([
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "Approved Budget:",
          projectBudget,
          "",
          "",
          "",
        ]);
        aoaData.push([
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          `Budget Variance (${budgetVariance >= 0 ? "Surplus" : "Deficit"}):`,
          budgetVariance,
          "",
          "",
          "",
        ]);
      }

      // Sign-off Block
      aoaData.push([]);
      aoaData.push([
        `Prepared By: ${preparedByName || activeBOQ?.prepared_by_name || "—"}`,
        "",
        `Reviewed By: ${reviewedByName || activeBOQ?.reviewed_by_name || "—"}`,
        "",
        `Approved By: ${approvedByName || activeBOQ?.approved_by_name || "—"}`,
      ]);

      const ws = XLSX.utils.aoa_to_sheet(aoaData);
      autosizeWorksheetColumns(ws);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Project Costing Schedule");
      const filename = `${activeBOQ?.boq_reference || "Project_Costing_Schedule"}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success("Costing schedule exported to Excel (.xlsx) successfully");
    } catch (err) {
      console.error("Export Excel error:", err);
      toast.error("Failed to export Excel file");
    }
  };

  // Excel Import (supports .xlsx, .xls, .csv)
  const handleExcelImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const ws = workbook.Sheets[sheetName];
        if (!ws) return toast.error("Excel sheet is empty");

        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
        if (!rawRows || rawRows.length === 0)
          return toast.error("Excel file has no data");

        // Identify the header row index
        let headerRowIdx = -1;
        for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
          const rowText = (rawRows[r] || [])
            .map((c) => String(c || "").toLowerCase())
            .join(" ");
          if (
            rowText.includes("item code") ||
            (rowText.includes("description") &&
              (rowText.includes("rate") || rowText.includes("unit")))
          ) {
            headerRowIdx = r;
            break;
          }
        }

        const dataRows =
          headerRowIdx !== -1
            ? rawRows.slice(headerRowIdx + 1)
            : rawRows.slice(1);
        const headers =
          headerRowIdx !== -1
            ? rawRows[headerRowIdx].map((h) =>
                String(h || "")
                  .trim()
                  .toLowerCase(),
              )
            : [];

        // Dynamic column mapping
        const colMap = {
          code: headers.findIndex(
            (h) => h.includes("item code") || h === "code",
          ),
          desc: headers.findIndex((h) => h.includes("desc")),
          category: headers.findIndex((h) => h.includes("categor")),
          wbs: headers.findIndex((h) => h.includes("wbs")),
          scope: headers.findIndex((h) => h.includes("scope")),
          uom: headers.findIndex(
            (h) => h.includes("unit of") || h.includes("uom") || h === "unit",
          ),
          qty: headers.findIndex((h) => h.includes("quant") || h === "qty"),
          rate: headers.findIndex(
            (h) =>
              h.includes("rate") || h.includes("price") || h.includes("cost"),
          ),
          amount: headers.findIndex(
            (h) => h.includes("amount") || h.includes("total"),
          ),
          taxRate: headers.findIndex(
            (h) => h.includes("tax rate") || h.includes("tax %"),
          ),
          taxAmount: headers.findIndex((h) => h.includes("tax amount")),
          remarks: headers.findIndex(
            (h) => h.includes("remark") || h.includes("spec"),
          ),
        };

        const parsedItems = [];
        const defaultWbs = availableWbsOptions[0];
        dataRows.forEach((row, idx) => {
          if (!row || !row.length) return;
          const rowStr = row
            .map((c) => String(c || "").toLowerCase())
            .join(" ");
          // Skip summary lines
          if (
            rowStr.includes("subtotal") ||
            rowStr.includes("contingency") ||
            rowStr.includes("final estimated") ||
            rowStr.includes("grand total") ||
            rowStr.includes("approved by") ||
            rowStr.includes("direct subtotal")
          ) {
            return;
          }

          const getVal = (colIdx, fallbackIdx) => {
            const i = colIdx !== -1 ? colIdx : fallbackIdx;
            return row[i] != null ? String(row[i]).trim() : "";
          };

          const code = getVal(colMap.code, 0);
          const desc = getVal(colMap.desc, 1);
          if (!code && !desc) return; // skip blank line

          const rawCat = getVal(colMap.category, 2).toUpperCase();
          let category = "LABOUR";
          if (costCategories.some((c) => c.value === rawCat)) {
            category = rawCat;
          } else if (rawCat.includes("MAT")) category = "MATERIALS";
          else if (rawCat.includes("LAB") || rawCat.includes("PERSON"))
            category = "LABOUR";
          else if (rawCat.includes("SOFT") || rawCat.includes("CLOUD"))
            category = "SOFTWARE_CLOUD";
          else if (rawCat.includes("EQUIP") || rawCat.includes("HARD"))
            category = "EQUIPMENT";
          else if (rawCat.includes("SUB") || rawCat.includes("VEND"))
            category = "SUBCONTRACTING";
          else if (
            rawCat.includes("TRANS") ||
            rawCat.includes("TRAV") ||
            rawCat.includes("LOG")
          )
            category = "TRANSPORTATION";
          else if (rawCat.includes("OVER") || rawCat.includes("ADMIN"))
            category = "OVERHEAD";
          else if (rawCat.includes("OTH")) category = "OTHER";

          const wbsVal = getVal(colMap.wbs, -1) || defaultWbs?.code || "";
          const scopeVal =
            getVal(colMap.scope, -1) || defaultWbs?.scopeName || "";
          const rawUom = getVal(colMap.uom, 3).toUpperCase();
          const uom = rawUom || "EA";
          const qty = Number(getVal(colMap.qty, 4)) || 1;
          const rate = Number(getVal(colMap.rate, 5)) || 0;
          const amt =
            Number(getVal(colMap.amount, 6)) || Number((qty * rate).toFixed(2));
          const taxPct = Number(getVal(colMap.taxRate, 7)) || 0;
          const taxAmt =
            Number(getVal(colMap.taxAmount, 8)) ||
            Number(((amt * taxPct) / 100).toFixed(2));
          const itemRemarks = getVal(colMap.remarks, 9);

          parsedItems.push({
            id: `imported-${Date.now()}-${idx}`,
            item_code:
              code || `ITM-${boqItems.length + parsedItems.length + 1}`,
            item_description:
              desc || `Cost Item #${boqItems.length + parsedItems.length + 1}`,
            cost_category: category,
            wbs_code: wbsVal,
            scope_name: scopeVal,
            uom,
            quantity: qty,
            unit_rate: rate,
            amount: amt,
            tax_rate_percent: taxPct,
            tax_amount: taxAmt,
            remarks: itemRemarks || "",
            item_order: boqItems.length + parsedItems.length + 1,
          });
        });

        if (parsedItems.length > 0) {
          setBOQItems([...boqItems, ...parsedItems]);
          toast.success(
            `Imported ${parsedItems.length} project costing items successfully from Excel`,
          );
        } else {
          toast.warn("No valid costing items found in the Excel file");
        }
      } catch (err) {
        console.error("Excel import error:", err);
        toast.error(
          "Failed to parse Excel file. Please ensure it is a valid .xlsx, .xls, or .csv document.",
        );
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Generate HTML for Print Feature using the Document Template & Report Header
  const handlePrint = async () => {
    try {
      const headerInfo =
        reportHeader || (await fetchReportHeader(api).catch(() => ({})));
      const companyName = headerInfo.companyName || "Company";
      const companyAddress = headerInfo.companyAddress || "";
      const companyPhone = headerInfo.companyPhone || "";
      const companyEmail = headerInfo.companyEmail || "";
      const companyWebsite = headerInfo.companyWebsite || "";
      const logoUrl = headerInfo.logoUrl || "";
      const curr = currency || headerInfo.currCode || "GHS";

      const formattedDate = activeBOQ?.boq_date
        ? new Date(activeBOQ.boq_date).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          });

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Bill of Quantities - ${activeBOQ?.boq_reference || "BOQ"}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.45;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .boq-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 4px;
    }
    /* Report Header Template from Document Templates */
    .report-header-tpl {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2.5px solid #0f172a;
      margin-bottom: 12px;
    }
    .header-logo-box {
      max-width: 200px;
    }
    .header-logo-img {
      max-height: 52px;
      max-width: 190px;
      object-fit: contain;
    }
    .header-company-box {
      text-align: right;
    }
    .header-company-name {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin-bottom: 2px;
    }
    .header-company-text {
      font-size: 10px;
      color: #475569;
      line-height: 1.4;
      margin: 0;
    }
    /* Document Title Banner */
    .doc-banner {
      background: #0f172a;
      color: #ffffff;
      padding: 8px 12px;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .doc-banner-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin: 0;
    }
    .doc-banner-meta {
      font-size: 9.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 9px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.2);
      letter-spacing: 0.05em;
    }
    /* Project Details Grid */
    .project-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 12px;
    }
    .project-row {
      display: flex;
      font-size: 10.5px;
    }
    .project-label {
      width: 110px;
      font-weight: 700;
      color: #64748b;
      flex-shrink: 0;
    }
    .project-val {
      color: #0f172a;
      font-weight: 600;
    }
    /* KPI Summary Cards */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }
    .kpi-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 5px;
      padding: 6px 8px;
      border-top: 3px solid #64748b;
    }
    .kpi-box.accent {
      border-top-color: #0284c7;
      background: #f0f9ff;
    }
    .kpi-lbl {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }
    .kpi-amt {
      font-size: 11px;
      font-weight: 800;
      font-family: ui-monospace, monospace;
      color: #0f172a;
    }
    /* BOQ Items Schedule Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 9.5px;
    }
    .items-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 6px 7px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    .items-table td {
      padding: 5px 7px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .items-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .num { text-align: right; font-family: ui-monospace, monospace; }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    /* Summary Grid */
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .summary-pane {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    .pane-title {
      background: #f1f5f9;
      padding: 5px 10px;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #334155;
      border-bottom: 1px solid #cbd5e1;
    }
    .pane-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    .pane-table td {
      padding: 4px 10px;
      border-bottom: 1px solid #f1f5f9;
    }
    .pane-table tr:last-child td {
      border-bottom: none;
    }
    .pane-table .grand-row td {
      background: #f8fafc;
      border-top: 2px solid #0f172a !important;
      font-size: 11px;
      font-weight: 800;
      color: #0f172a;
    }
    /* Approval Signatures */
    .signatures-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 20px;
      padding-top: 8px;
      page-break-inside: avoid;
    }
    .signature-card {
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      background: #ffffff;
    }
    .sig-heading {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }
    .sig-person {
      font-size: 10.5px;
      font-weight: 700;
      color: #0f172a;
      min-height: 16px;
    }
    .sig-sub {
      font-size: 9px;
      color: #64748b;
      margin-bottom: 24px;
    }
    .sig-underline {
      border-top: 1px solid #64748b;
      text-align: center;
      font-size: 8px;
      color: #94a3b8;
      padding-top: 2px;
    }
    .print-footer {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="boq-container">
    <!-- 1. Report Header Template from Document Templates -->
    <div class="report-header-tpl">
      <div class="header-logo-box">
        ${logoUrl ? `<img class="header-logo-img" src="${logoUrl}" alt="${companyName}" />` : `<div style="font-size: 18px; font-weight: 900; color: #0f172a;">${companyName}</div>`}
      </div>
      <div class="header-company-box">
        <div class="header-company-name">${companyName}</div>
        ${companyAddress ? `<p class="header-company-text">${companyAddress}</p>` : ""}
        ${companyPhone ? `<p class="header-company-text">Contact No: ${companyPhone}</p>` : ""}
        ${companyEmail ? `<p class="header-company-text">Email: ${companyEmail}</p>` : ""}
        ${companyWebsite ? `<p class="header-company-text">Web: ${companyWebsite}</p>` : ""}
      </div>
    </div>

    <!-- 2. Document Title Banner -->
    <div class="doc-banner">
      <div class="doc-banner-title">Project Costing & Budget Estimation Schedule</div>
      <div class="doc-banner-meta">
        <span>Ref: <strong style="font-family: monospace;">${activeBOQ?.boq_reference || "—"}</strong></span>
        <span>Version: ${version || activeBOQ?.version || "1.0"}</span>
        <span class="status-badge">${activeBOQ?.status || "DRAFT"}</span>
      </div>
    </div>

    <!-- 3. Project & Costing Information Grid -->
    <div class="project-grid">
      <div class="project-row">
        <span class="project-label">Project Name:</span>
        <span class="project-val">${selectedProject?.project_name || "—"} (${selectedProject?.project_code || "—"})</span>
      </div>
      <div class="project-row">
        <span class="project-label">Date of Issue:</span>
        <span class="project-val">${formattedDate}</span>
      </div>
      <div class="project-row">
        <span class="project-label">Project Type:</span>
        <span class="project-val">${(PROJECT_TYPE_CONFIG[selectedProject?.project_type || selectedProjectDetails?.project_type] || PROJECT_TYPE_CONFIG.GENERAL_CONSTRUCTION).label}</span>
      </div>
      <div class="project-row">
        <span class="project-label">Client / Sponsor:</span>
        <span class="project-val">${activeBOQ?.client_name || selectedProject?.client_name || "—"}</span>
      </div>
      <div class="project-row">
        <span class="project-label">Site / Location:</span>
        <span class="project-val">${activeBOQ?.site_location || selectedProject?.site_address || "—"}</span>
      </div>
      <div class="project-row">
        <span class="project-label">Contract Currency:</span>
        <span class="project-val">${curr}</span>
      </div>
      <div class="project-row">
        <span class="project-label">Cost Sheet Title:</span>
        <span class="project-val">${activeBOQ?.boq_title || "Project Costing Schedule"}</span>
      </div>
      ${
        projectBudget > 0
          ? `
      <div class="project-row">
        <span class="project-label">Approved Budget:</span>
        <span class="project-val font-mono">${curr} ${projectBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>`
          : ""
      }
    </div>

    <!-- 4. Financial KPI Cards -->
    <div class="kpi-row">
      <div class="kpi-box">
        <div class="kpi-lbl">Direct Cost Subtotal</div>
        <div class="kpi-amt">${curr} ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-lbl">Contingency (${contingencyPercent}%)</div>
        <div class="kpi-amt">${curr} ${contingencyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-lbl">Tax (${selectedTaxCode?.code ? selectedTaxCode.code + " " : ""}${taxPercent}%)</div>
        <div class="kpi-amt">${curr} ${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-box">
        <div class="kpi-lbl">Preliminaries / Other</div>
        <div class="kpi-amt">${curr} ${Number(otherCharges || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
      <div class="kpi-box accent">
        <div class="kpi-lbl">Final Estimated Cost</div>
        <div class="kpi-amt">${curr} ${finalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
    </div>

    <!-- 5. Full Schedule of Rates Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 25px;" class="center">#</th>
          <th style="width: 75px;">Item Code</th>
          <th>Description of Work / Deliverable</th>
          <th style="width: 75px;">Category</th>
          <th style="width: 70px;">Work Plan/WBS / Scope</th>
          <th style="width: 45px;" class="center">Unit</th>
          <th style="width: 55px;" class="num">Quantity</th>
          <th style="width: 70px;" class="num">Rate (${curr})</th>
          <th style="width: 80px;" class="num">Amount (${curr})</th>
          <th style="width: 70px;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${boqItems
          .map(
            (item, idx) => `
          <tr>
            <td class="center">${idx + 1}</td>
            <td class="bold font-mono">${item.item_code || "—"}</td>
            <td>${item.item_description || item.description || "—"}</td>
            <td><span style="font-size: 8.5px; color: #475569;">${item.cost_category || "LABOUR"}</span></td>
            <td><span style="font-size: 8.5px; font-family: monospace;">${item.wbs_code || "—"}</span></td>
            <td class="center font-mono">${item.uom || item.unit || "EA"}</td>
            <td class="num">${Number(item.quantity || 0).toLocaleString()}</td>
            <td class="num">${Number(item.unit_rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="num">${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="font-size: 8.5px; color: #64748b;">${item.remarks || "—"}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>

    <!-- 6. Summary Section -->
    <div class="summary-grid">
      <!-- Category Breakdown -->
      <div class="summary-pane">
        <div class="pane-title">Cost Category Distribution</div>
        <table class="pane-table">
          <tbody>
            ${Object.entries(categoryTotals)
              .map(([cat, amt]) => {
                const pct =
                  subtotal > 0 ? ((amt / subtotal) * 100).toFixed(1) : "0.0";
                return `
                <tr>
                  <td class="bold">${cat}</td>
                  <td class="num">${curr} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="num" style="width: 45px; color: #64748b;">${pct}%</td>
                </tr>
              `;
              })
              .join("")}
          </tbody>
        </table>
      </div>

      <!-- Financial Reconciliation -->
      <div class="summary-pane">
        <div class="pane-title">Financial Summary & Reconciliation</div>
        <table class="pane-table">
          <tbody>
            <tr>
              <td>Subtotal (Measured Works):</td>
              <td class="num bold">${curr} ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Contingency (${contingencyPercent}%):</td>
              <td class="num">${curr} ${contingencyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Tax & Applicable Levies (${selectedTaxCode?.code ? selectedTaxCode.code + " " : ""}${taxPercent}%):</td>
              <td class="num">${curr} ${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Preliminaries & Other Charges:</td>
              <td class="num">${curr} ${Number(otherCharges || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr class="grand-row">
              <td>Final Estimated Contract Cost:</td>
              <td class="num">${curr} ${finalEstimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            ${
              projectBudget > 0
                ? `
            <tr>
              <td>Approved Project Budget:</td>
              <td class="num">${curr} ${projectBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Budget Variance (${budgetVariance >= 0 ? "Under Budget" : "Over Budget"}):</td>
              <td class="num bold" style="color: ${budgetVariance >= 0 ? "#15803d" : "#b91c1c"};">${budgetVariance >= 0 ? "+" : "-"}${curr} ${Math.abs(budgetVariance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>`
                : ""
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- 7. Approval & Sign-Off Block -->
    <div class="signatures-row">
      <div class="signature-card">
        <div class="sig-heading">Prepared By</div>
        <div class="sig-person">${preparedByName || activeBOQ?.prepared_by_name || "—"}</div>
        <div class="sig-sub">Date: ${preparedDate || (activeBOQ?.prepared_date ? String(activeBOQ.prepared_date).split("T")[0] : "—")}</div>
        <div class="sig-underline">Authorized Signature</div>
      </div>
      <div class="signature-card">
        <div class="sig-heading">Reviewed By</div>
        <div class="sig-person">${reviewedByName || activeBOQ?.reviewed_by_name || "—"}</div>
        <div class="sig-sub">Date: ${reviewedDate || (activeBOQ?.reviewed_date ? String(activeBOQ.reviewed_date).split("T")[0] : "—")}</div>
        <div class="sig-underline">Authorized Signature</div>
      </div>
      <div class="signature-card">
        <div class="sig-heading">Approved By</div>
        <div class="sig-person">${approvedByName || activeBOQ?.approved_by_name || "—"}</div>
        <div class="sig-sub">Date: ${approvedDate || (activeBOQ?.approved_date ? String(activeBOQ.approved_date).split("T")[0] : "—")}</div>
        <div class="sig-underline">Authorized Signature</div>
      </div>
    </div>

    <!-- 8. Document Footer -->
    <div class="print-footer">
      <span>OmniSuite ERP  •  Project Management & Construction Module</span>
      <span>Official Contract Document  •  Generated: ${new Date().toLocaleString()}</span>
    </div>
  </div>
</body>
</html>`;

      setPrintHtml(html);
      setPrintModalOpen(true);
    } catch (e) {
      console.error("Print generation error:", e);
      toast.error("Failed to generate print document");
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await renderHtmlToPdf(
        printHtml,
        `${activeBOQ?.boq_reference || "BOQ"}.pdf`,
      );
    } catch (e) {
      toast.error("Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const currentStatusBadge = activeBOQ
    ? STATUS_BADGES[activeBOQ.status] || STATUS_BADGES.DRAFT
    : STATUS_BADGES.DRAFT;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 print:p-0 print:max-w-none">
      {/* Canonical Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link
            to="/project-management"
            className="btn btn-secondary inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                <Calculator
                  size={26}
                  className="text-brand-600 dark:text-brand-400"
                />
                Project Costing & Budget Estimation
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cost sheets, rate analysis & Work Plan/WBS budget estimation for
              Software, Consulting, Construction, Events & General projects
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Project:</span>
            <select
              className="input text-sm py-1.5 h-auto min-w-[200px]"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">-- Select a Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code} - {p.project_name}
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/project-management/costing"
            className="px-3.5 py-2 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition flex items-center gap-1.5 shadow-sm"
            title="Open Advanced Project Costing & Budget Estimation Workspace"
          >
            <Calculator size={15} className="text-emerald-600" />
            Costing & Budget Estimation
          </Link>

          <Link
            to="/project-management/cost-categories"
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition flex items-center gap-1.5 shadow-sm"
            title="Configure Cost Categories in Operations Setup"
          >
            <Tag size={15} className="text-brand-600 dark:text-brand-400" />
            Cost Categories
          </Link>

          <button
            onClick={openCreateModal}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} /> New Cost Sheet
          </button>
        </div>
      </div>

      {!selectedProjectId ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center mx-auto">
            <Layers size={32} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Please Select a Project
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a project from the dropdown above to view, manage, and
              create project costing sheets and budget estimates.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Costing Selection Bar & Project Details Header Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            {/* Project Details Banner */}
            <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {activeBOQ
                      ? activeBOQ.boq_title || activeBOQ.title
                      : selectedProject
                        ? `${selectedProject.project_name} (Cost Sheet)`
                        : "Project Costing Sheet"}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">
                        Project Name:
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {selectedProject?.project_name || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">
                        Client / Sponsor:
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {activeBOQ?.client_name ||
                          selectedProject?.client_name ||
                          "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">
                        Site / Location:
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {activeBOQ?.site_location ||
                          [
                            selectedProject?.site_address,
                            selectedProject?.site_city,
                          ]
                            .filter(Boolean)
                            .join(", ") ||
                          "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">
                        Costing Reference:
                      </span>
                      <span className="font-bold font-mono text-brand-600 dark:text-brand-400">
                        {activeBOQ?.boq_reference ||
                          activeBOQ?.boq_number ||
                          "—"}
                      </span>
                    </div>
                  </div>

                  {/* Financial Health & Budget Variance Bar */}
                  {projectBudget > 0 && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs mb-1.5">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-slate-400">
                              Approved Budget:
                            </span>{" "}
                            <strong className="text-slate-800 dark:text-slate-200 font-mono">
                              {currency}{" "}
                              {projectBudget.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400">
                              Cost Estimate:
                            </span>{" "}
                            <strong className="text-slate-800 dark:text-slate-200 font-mono">
                              {currency}{" "}
                              {finalEstimatedCost.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Variance:</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${budgetVariance >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800"}`}
                          >
                            {budgetVariance >= 0
                              ? `+${currency} ${budgetVariance.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Under Budget)`
                              : `-${currency} ${Math.abs(budgetVariance).toLocaleString(undefined, { minimumFractionDigits: 2 })} (Over Budget)`}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${budgetUtilization > 100 ? "bg-rose-500" : budgetUtilization > 85 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{
                            width: `${Math.min(budgetUtilization, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Switcher among existing project Cost Sheets */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 print:hidden">
                  <div className="w-full sm:w-auto">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Active Cost Sheet:
                    </label>
                    <select
                      className="input text-sm py-1.5 h-auto w-full min-w-[220px]"
                      value={activeBOQ?.id || ""}
                      onChange={(e) => loadBOQDetails(e.target.value)}
                    >
                      {boqs.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.boq_reference ? `[${b.boq_reference}] ` : ""}
                          {b.boq_title || b.title} (v{b.version || "1.0"})
                        </option>
                      ))}
                      {boqs.length === 0 && (
                        <option value="">No Cost Sheets Available</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Line Items Grid */}
          {activeBOQ ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              {/* Grid Toolbar */}
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={addItemRow}
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-1 transition"
                  >
                    <Plus size={14} /> Add Cost Item
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleExcelImport}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-1.5 transition"
                    title="Import Excel or CSV items"
                  >
                    <Upload size={14} /> Import Excel
                  </button>
                  <button
                    onClick={exportExcel}
                    disabled={!boqItems.length}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-1.5 transition disabled:opacity-50"
                    title="Export Costing Schedule to Excel (.xlsx)"
                  >
                    <Download size={14} /> Export Excel
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center gap-1.5 transition"
                    title="Print Preview Costing Schedule"
                  >
                    <Printer size={14} /> Print
                  </button>
                  <button
                    onClick={() => handleSaveBOQ(false)}
                    disabled={saving}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 w-28">Item Code</th>
                      <th className="p-3 min-w-[240px]">
                        Description of Work / Deliverable
                      </th>
                      <th className="p-3 w-36">Cost Category</th>
                      <th className="p-3 w-44">Work Plan/WBS</th>
                      <th className="p-3 w-32">Unit (UoM)</th>
                      <th className="p-3 w-24 text-right">Quantity</th>
                      <th className="p-3 w-28 text-right">Unit Rate</th>
                      <th className="p-3 w-32 text-right">
                        Amount ({currency})
                      </th>
                      <th className="p-3 w-20 text-center print:hidden">
                        Rate Build
                      </th>
                      <th className="p-3 w-14 text-center print:hidden">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {boqItems.map((item, idx) => {
                      return (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-850/60 transition-colors"
                        >
                          {/* Line Number */}
                          <td className="p-2.5 text-center text-slate-400 font-normal">
                            {idx + 1}
                          </td>

                          {/* Item Code */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              required
                              placeholder="e.g. ITM-001"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                              value={item.item_code}
                              onChange={(e) =>
                                updateItem(idx, "item_code", e.target.value)
                              }
                            />
                          </td>

                          {/* Description of Work / Deliverable */}
                          <td className="p-2.5">
                            <textarea
                              rows={2}
                              required
                              placeholder="Detailed deliverable, specification or scope element..."
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 leading-relaxed resize-y"
                              value={
                                item.item_description || item.description || ""
                              }
                              onChange={(e) =>
                                updateItem(
                                  idx,
                                  "item_description",
                                  e.target.value,
                                )
                              }
                            />
                          </td>

                          {/* Cost Category */}
                          <td className="p-2.5">
                            <select
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              value={item.cost_category || "LABOUR"}
                              onChange={(e) =>
                                updateItem(idx, "cost_category", e.target.value)
                              }
                            >
                              {costCategories.map((c) => (
                                <option key={c.value} value={c.value}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* WBS / Scope Selection */}
                          <td className="p-2.5">
                            <select
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                              value={item.wbs_code || ""}
                              onChange={(e) => {
                                const code = e.target.value;
                                const matched = availableWbsOptions.find(
                                  (w) => w.code === code,
                                );
                                const updated = [...boqItems];
                                updated[idx] = {
                                  ...updated[idx],
                                  wbs_code: code,
                                  scope_name:
                                    matched?.scopeName ||
                                    updated[idx].scope_name ||
                                    "",
                                };
                                setBOQItems(updated);
                              }}
                            >
                              <option value="">
                                -- Select Work Plan/WBS --
                              </option>
                              {availableWbsOptions.map((w) => (
                                <option key={w.code} value={w.code}>
                                  {w.label}
                                </option>
                              ))}
                              {item.wbs_code &&
                                !availableWbsOptions.some(
                                  (w) => w.code === item.wbs_code,
                                ) && (
                                  <option value={item.wbs_code}>
                                    {item.wbs_code} (
                                    {item.scope_name || "Custom"})
                                  </option>
                                )}
                            </select>
                          </td>

                          {/* Unit of Measurement */}
                          <td className="p-2.5">
                            <select
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                              value={item.uom || item.unit || "EA"}
                              onChange={(e) =>
                                updateItem(idx, "uom", e.target.value)
                              }
                            >
                              {item.uom &&
                                !dynamicUomOptions.some(
                                  (u) => u.value === item.uom,
                                ) && (
                                  <option value={item.uom}>{item.uom}</option>
                                )}
                              {dynamicUomOptions.map((u) => (
                                <option key={u.value} value={u.value}>
                                  {u.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Quantity */}
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              step="any"
                              required
                              min="0"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-normal text-right text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(idx, "quantity", e.target.value)
                              }
                            />
                          </td>

                          {/* Unit Rate */}
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              step="any"
                              required
                              min="0"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-normal text-right text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                              value={item.unit_rate}
                              onChange={(e) =>
                                updateItem(idx, "unit_rate", e.target.value)
                              }
                            />
                          </td>

                          {/* Amount */}
                          <td className="p-2.5 text-right font-medium text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap font-mono">
                            {Number(item.amount || 0).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </td>

                          {/* Rate Build-Up action */}
                          <td className="p-2.5 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => openRateAnalysis(item)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition"
                              title="Open Rate Build-Up Analysis"
                            >
                              <Calculator size={14} />
                            </button>
                          </td>

                          {/* Delete */}
                          <td className="p-2.5 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Remove Line Item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {boqItems.length === 0 && (
                      <tr>
                        <td
                          colSpan={11}
                          className="p-8 text-center text-slate-400 italic"
                        >
                          No line items added yet. Click &quot;Add Cost
                          Item&quot; or choose from &quot;Predefined
                          Templates&quot; to populate your costing sheet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Contingency, Taxes, and Totals Summary Section */}
              <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  {/* Specification Notes & Exclusions */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Specification Notes & Exclusions
                    </h4>
                    <textarea
                      rows={4}
                      placeholder="Specification standard (SMM7/POMI/CESMM), tender exclusions, mobilization terms..."
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>

                  {/* Financial Totals Breakdown Box */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>BOQ Financial Summary & Contingency</span>
                      <span className="font-medium text-brand-600">
                        {currency}
                      </span>
                    </h4>

                    <div className="space-y-3 text-xs border-b border-slate-200 dark:border-slate-800 pb-4">
                      {/* Subtotal */}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">
                          Direct Cost Subtotal:
                        </span>
                        <span className="font-medium text-sm text-slate-900 dark:text-white">
                          {currency}{" "}
                          {subtotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      {/* Contingency */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 dark:text-slate-300 font-semibold">
                            Contingency:
                          </span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm font-normal text-right"
                              value={contingencyPercent}
                              onChange={(e) =>
                                setContingencyPercent(e.target.value)
                              }
                            />
                            <span className="text-slate-400 font-bold">%</span>
                          </div>
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {currency}{" "}
                          {contingencyAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      {/* Tax Code Selection & Applicable Levies */}
                      <div className="space-y-2 py-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                            Tax Code & Levies:
                          </span>
                          <select
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[210px]"
                            value={selectedTaxCodeId}
                            onChange={(e) =>
                              handleTaxCodeSelect(e.target.value)
                            }
                            disabled={activeBOQ?.status === "APPROVED"}
                          >
                            <option value="">
                              -- Select Linked Tax Code --
                            </option>
                            {boqTaxCodes.map((tc) => (
                              <option key={tc.id} value={tc.id}>
                                {tc.code} ({Number(tc.rate_percent)}%) -{" "}
                                {tc.name}
                              </option>
                            ))}
                            <option value="CUSTOM">Custom Percentage...</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-xs font-medium">
                              Applied Rate:
                            </span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm font-normal text-right"
                                value={taxPercent}
                                onChange={(e) => {
                                  setTaxPercent(e.target.value);
                                  if (selectedTaxCodeId !== "CUSTOM")
                                    setSelectedTaxCodeId("CUSTOM");
                                }}
                                disabled={activeBOQ?.status === "APPROVED"}
                              />
                              <span className="text-slate-400 font-bold">
                                %
                              </span>
                            </div>
                            {selectedTaxCode &&
                              selectedTaxCode.code !== "CUSTOM" && (
                                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-brand-50 text-brand-700 border border-brand-200 dark:bg-brand-950/40 dark:text-brand-300 dark:border-brand-800">
                                  {selectedTaxCode.code}
                                </span>
                              )}
                          </div>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {currency}{" "}
                            {taxAmount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Other Charges / Preliminaries */}
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">
                          Preliminaries & Other Charges:
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-xs">
                            {currency}
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-sm font-normal text-right"
                            value={otherCharges}
                            onChange={(e) => setOtherCharges(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Final Estimated Cost */}
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                          Final Estimated Cost (Total BOQ Amount)
                        </span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          Inclusive of direct costs, contingency, taxes &
                          preliminaries
                        </span>
                      </div>
                      <div className="text-xl font-medium text-emerald-700 dark:text-emerald-300">
                        {currency}{" "}
                        {finalEstimatedCost.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2 print:hidden">
                      <button
                        type="button"
                        onClick={() =>
                          handleSaveBOQ(true, "Saved with revision record")
                        }
                        disabled={saving}
                        className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
                      >
                        Save & Create Revision Snapshot
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveBOQ(false)}
                        disabled={saving}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2 transition disabled:opacity-50"
                      >
                        <Save size={14} /> {saving ? "Saving..." : "Save BOQ"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center mx-auto">
                <FileSpreadsheet size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  No BOQ Selected
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select an existing Bill of Quantities from the project list
                  above or create a new one to begin estimating.
                </p>
              </div>
              <button
                onClick={openCreateModal}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 inline-flex items-center gap-2 transition"
              >
                <Plus size={16} /> Create First BOQ for Project
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal: Create Cost Sheet */}
      <ProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Project Cost Sheet & Estimate"
        subtitle="Set up project details, client, site location, contingency, currency and initial revision"
        icon={Calculator}
        onSubmit={handleCreateBOQ}
        submitLabel="Create Cost Sheet"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Cost Sheet Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Phase 1 Cost Sheet / Architecture & Delivery Budget"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={newBOQ.boq_title}
                onChange={(e) =>
                  setNewBOQ({ ...newBOQ, boq_title: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Cost Sheet Reference Number{" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CST-PRJ01-2026-001"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                value={newBOQ.boq_reference}
                onChange={(e) =>
                  setNewBOQ({ ...newBOQ, boq_reference: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Client / Sponsor Name
              </label>
              <input
                type="text"
                placeholder="e.g. Ministry / Corporate Client / Sponsor"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={newBOQ.client_name}
                onChange={(e) =>
                  setNewBOQ({ ...newBOQ, client_name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Site / Delivery Location
              </label>
              <input
                type="text"
                placeholder="e.g. Accra Central / Cloud Virtual / Head Office"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={newBOQ.site_location}
                onChange={(e) =>
                  setNewBOQ({ ...newBOQ, site_location: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Date of Issue
              </label>
              <input
                type="date"
                required
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                value={newBOQ.boq_date}
                onChange={(e) =>
                  setNewBOQ({ ...newBOQ, boq_date: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Currency
              </label>
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
                value={newBOQ.currency}
                onChange={(e) =>
                  setNewBOQ({ ...newBOQ, currency: e.target.value })
                }
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol || c.code}) - {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Contingency Rate (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                placeholder="5"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                value={newBOQ.contingency_percent}
                onChange={(e) =>
                  setNewBOQ({ ...newBOQ, contingency_percent: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Applicable Tax Code
              </label>
              <select
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={newBOQ.tax_code_id || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const found = boqTaxCodes.find(
                    (tc) => String(tc.id) === String(val),
                  );
                  setNewBOQ({
                    ...newBOQ,
                    tax_code_id: val ? Number(val) : null,
                    tax_code: found ? found.code : null,
                    tax_percent: found ? Number(found.rate_percent || 0) : 0,
                  });
                }}
              >
                <option value="">No Tax (0%)</option>
                {boqTaxCodes.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.code} ({Number(tc.rate_percent)}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Remarks, Specifications & Preliminaries
            </label>
            <textarea
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[80px]"
              placeholder="Scope deliverables, methodologies, quality guidelines, contract clauses..."
              value={newBOQ.remarks}
              onChange={(e) =>
                setNewBOQ({ ...newBOQ, remarks: e.target.value })
              }
            />
          </div>
        </div>
      </ProjectModal>

      {/* Modal: Rate Build-Up Analysis (Corrected & Universal) */}
      <ProjectModal
        open={showRateModal}
        onClose={() => setShowRateModal(false)}
        title="Universal Rate Build-Up Analysis"
        subtitle={`Item ${activeItemForRate?.item_code || ""}: ${activeItemForRate?.item_description || activeItemForRate?.description || "Work item"} (${activeItemForRate?.uom || "EA"})`}
        icon={Calculator}
        footer={
          <>
            <button
              type="button"
              onClick={() => setShowRateModal(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={applyRateAnalysis}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2"
            >
              <Check size={15} /> Apply Rate to Item
            </button>
          </>
        }
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Item Meta & Rate Comparison Banner */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Item Code:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {activeItemForRate?.item_code || "—"}
                </span>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
                <span className="text-slate-400 block text-[11px] font-medium">Cost Category:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {costCategories.find((c) => c.value === activeItemForRate?.cost_category)?.label ||
                    activeItemForRate?.cost_category ||
                    "MATERIALS"}
                </span>
              </div>
              <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
                <span className="text-slate-400 block text-[11px] font-medium">Current Line Rate:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {currency} {Number(activeItemForRate?.unit_rate || 0).toFixed(2)} / {activeItemForRate?.uom || "UNIT"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Computed Rate:</span>
              <span className="px-2.5 py-1 rounded-lg font-mono font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800 text-xs">
                {currency} {calculatedUnitRate.toFixed(2)}
              </span>
              {activeItemForRate && (
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                    Math.abs(calculatedUnitRate - Number(activeItemForRate.unit_rate || 0)) < 0.01
                      ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      : calculatedUnitRate > Number(activeItemForRate.unit_rate || 0)
                      ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                  }`}
                >
                  {calculatedUnitRate >= Number(activeItemForRate.unit_rate || 0) ? "+" : ""}
                  {(calculatedUnitRate - Number(activeItemForRate.unit_rate || 0)).toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-1">
            <button
              type="button"
              onClick={() => setRateBuildTab("categories")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                rateBuildTab === "categories"
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Tag size={13} /> Category Rate Build
            </button>
            <button
              type="button"
              onClick={() => setRateBuildTab("resources")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                rateBuildTab === "resources"
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Sliders size={13} /> Detailed Resource Takeoff ({(rateForm.resource_items || []).length})
            </button>
          </div>

          {/* Tab 1: Category Rate Build */}
          {rateBuildTab === "categories" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {costCategories.map((cat) => {
                  const val = rateForm.category_costs?.[cat.value] ?? (
                    cat.value === "MATERIALS" ? rateForm.material_cost :
                    cat.value === "LABOUR" ? rateForm.labour_cost :
                    cat.value === "EQUIPMENT" ? rateForm.plant_cost :
                    cat.value === "SUBCONTRACTING" ? rateForm.subcontract_cost :
                    cat.value === "SOFTWARE_CLOUD" ? rateForm.cloud_software_cost :
                    cat.value === "TRANSPORTATION" ? rateForm.logistics_cost :
                    cat.value === "OTHER" ? rateForm.other_cost : 0
                  );
                  const pctShare = calculatedDirectCost > 0 ? ((Number(val || 0) / calculatedDirectCost) * 100).toFixed(0) : 0;
                  return (
                    <div
                      key={cat.value}
                      className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5 hover:border-slate-300 dark:hover:border-slate-600 transition"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cat.color}`}>
                          {cat.value}
                        </span>
                        {calculatedDirectCost > 0 && Number(val) > 0 && (
                          <span className="text-[10px] font-mono font-semibold text-slate-400">
                            {pctShare}%
                          </span>
                        )}
                      </div>
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block line-clamp-1">
                        {cat.label}
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-xs font-semibold text-slate-400">
                          {currency}
                        </span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-11 pr-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono text-right"
                          value={val || ""}
                          placeholder="0.00"
                          onChange={(e) => {
                            const num = Number(e.target.value) || 0;
                            const updated = { ...(rateForm.category_costs || {}) };
                            updated[cat.value] = num;
                            setRateForm({
                              ...rateForm,
                              category_costs: updated,
                              ...(cat.value === "MATERIALS" ? { material_cost: num } : {}),
                              ...(cat.value === "LABOUR" ? { labour_cost: num } : {}),
                              ...(cat.value === "EQUIPMENT" ? { plant_cost: num } : {}),
                              ...(cat.value === "SUBCONTRACTING" ? { subcontract_cost: num } : {}),
                              ...(cat.value === "SOFTWARE_CLOUD" ? { cloud_software_cost: num } : {}),
                              ...(cat.value === "TRANSPORTATION" ? { logistics_cost: num } : {}),
                              ...(cat.value === "OTHER" ? { other_cost: num } : {}),
                            });
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Detailed Resource Takeoff */}
          {rateBuildTab === "resources" && (
            <div className="space-y-3">
              {/* Add New Resource Row */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                  Add Resource / Material Component
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-4">
                    <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Mason Grade 1, 50kg Cement..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      value={newResourceItem.description}
                      onChange={(e) => setNewResourceItem({ ...newResourceItem, description: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Category</label>
                    <select
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      value={newResourceItem.category}
                      onChange={(e) => setNewResourceItem({ ...newResourceItem, category: e.target.value })}
                    >
                      {costCategories.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-[11px] font-medium text-slate-500 block mb-0.5">UoM</label>
                    <input
                      type="text"
                      placeholder="HR"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 uppercase"
                      value={newResourceItem.uom}
                      onChange={(e) => setNewResourceItem({ ...newResourceItem, uom: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Quantity</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-mono text-right text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      value={newResourceItem.quantity}
                      onChange={(e) => setNewResourceItem({ ...newResourceItem, quantity: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Unit Cost ({currency})</label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm font-mono text-right text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        value={newResourceItem.unit_cost}
                        onChange={(e) => setNewResourceItem({ ...newResourceItem, unit_cost: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={addResourceItem}
                        className="p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-bold transition flex-shrink-0"
                        title="Add Resource Item"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resource Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5">Resource / Description</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5 text-center">UoM</th>
                      <th className="p-2.5 text-right">Qty</th>
                      <th className="p-2.5 text-right">Unit Rate</th>
                      <th className="p-2.5 text-right">Total ({currency})</th>
                      <th className="p-2.5 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(rateForm.resource_items || []).map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/50">
                        <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">{r.description}</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {r.category}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-600 dark:text-slate-400">{r.uom}</td>
                        <td className="p-2.5 text-right font-mono">{r.quantity}</td>
                        <td className="p-2.5 text-right font-mono">{Number(r.unit_cost || 0).toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {Number(r.total || 0).toFixed(2)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeResourceItem(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!rateForm.resource_items || rateForm.resource_items.length === 0) && (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-400 text-sm">
                          No resource takeoff items entered yet. You can enter them above or adjust direct category values in the Category Rate Build tab.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Direct Cost Subtotal & Material Wastage */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Direct Cost Subtotal:
              </span>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                {currency} {calculatedDirectCost.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Material Wastage Allowance:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm font-mono text-right"
                  value={rateForm.wastage_percent}
                  onChange={(e) => setRateForm({ ...rateForm, wastage_percent: Number(e.target.value) })}
                />
                <span className="text-slate-400 font-bold">%</span>
              </div>
              {calculatedWastage > 0 && (
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                  (+{currency} {calculatedWastage.toFixed(2)})
                </span>
              )}
            </div>
          </div>

          {/* Markups: Overheads & Profit Margins */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Site & General Overhead (%)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  +{currency} {calculatedOverhead.toFixed(2)}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  value={rateForm.overhead_percent}
                  onChange={(e) =>
                    setRateForm({
                      ...rateForm,
                      overhead_percent: Number(e.target.value),
                    })
                  }
                />
                <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Profit Margin / Markup (%)
                </label>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  +{currency} {calculatedProfit.toFixed(2)}
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  value={rateForm.profit_percent}
                  onChange={(e) =>
                    setRateForm({
                      ...rateForm,
                      profit_percent: Number(e.target.value),
                    })
                  }
                />
                <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>
          </div>

          {/* Rate Build Notes / Technical Assumptions */}
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Rate Build-Up Notes & Technical Assumptions
            </label>
            <input
              type="text"
              placeholder="e.g. Based on standard 8-hr shift, includes safety gear, site diesel generator..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={rateForm.notes}
              onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
            />
          </div>

          {/* Final Computed Unit Rate Banner */}
          <div className="p-4 bg-gradient-to-r from-brand-50 to-indigo-50 dark:from-brand-950/40 dark:to-indigo-950/40 border border-brand-200 dark:border-brand-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-800 dark:text-brand-300">
                Computed Unit Rate
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Direct ({calculatedDirectCost.toFixed(2)})
                {calculatedWastage > 0 ? ` + Wastage (${calculatedWastage.toFixed(2)})` : ""} +
                Overhead ({calculatedOverhead.toFixed(2)}) + Profit ({calculatedProfit.toFixed(2)})
              </p>
            </div>
            <div className="text-2xl font-extrabold font-mono text-brand-700 dark:text-brand-300">
              {currency} {calculatedUnitRate.toFixed(2)}{" "}
              <span className="text-xs font-normal text-slate-500">/ {activeItemForRate?.uom || "UNIT"}</span>
            </div>
          </div>
        </div>
      </ProjectModal>

      {/* Modal: Revision History & Create New Revision */}
      <ProjectModal
        open={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        title="BOQ Revision & Audit History"
        subtitle={`Audit trail for ${activeBOQ?.boq_reference || "BOQ"} - Version ${activeBOQ?.version || "1.0"}`}
        icon={History}
        showFooter={false}
      >
        <div className="space-y-6">
          {/* Create New Version Box */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Create New Revision Version
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-500 block mb-1">
                  New Version Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2.0"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-sm font-mono font-semibold"
                  value={newVersionLabel}
                  onChange={(e) => setNewVersionLabel(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-500 block mb-1">
                  Revision Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Revised based on structural engineer addendum 3"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-sm"
                  value={newVersionRemarks}
                  onChange={(e) => setNewVersionRemarks(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleCreateRevision}
                className="btn btn-primary text-sm font-semibold flex items-center gap-1.5"
              >
                <History size={14} /> Commit New Revision
              </button>
            </div>
          </div>

          {/* Historical Revisions Log */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Historical Log Entries ({revisions.length})
            </h4>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 dark:bg-slate-900 border-b font-bold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">Rev</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Prepared</th>
                    <th className="p-2.5">Approved</th>
                    <th className="p-2.5 text-right">Total Amount</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {revisions.map((rev) => (
                    <tr
                      key={rev.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-2.5 font-mono font-bold text-brand-600">
                        {rev.version}
                      </td>
                      <td className="p-2.5 font-mono text-slate-500">
                        {
                          String(rev.revision_date || rev.created_at).split(
                            "T",
                          )[0]
                        }
                      </td>
                      <td className="p-2.5">{rev.prepared_by || "—"}</td>
                      <td className="p-2.5">{rev.approved_by || "—"}</td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        {Number(rev.total_amount || 0).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 },
                        )}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {rev.status || "DRAFT"}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500 max-w-xs truncate">
                        {rev.remarks || "—"}
                      </td>
                    </tr>
                  ))}
                  {revisions.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-6 text-center text-slate-400 italic"
                      >
                        No previous revision records archived.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ProjectModal>

      {/* Modal: Workflow Status & Approval Transition */}
      <ProjectModal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="BOQ Workflow Approval Transition"
        subtitle={`Update official status for ${activeBOQ?.boq_reference || "BOQ"}`}
        icon={ShieldCheck}
        onSubmit={(e) => {
          e.preventDefault();
          handleStatusTransition();
        }}
        submitLabel="Update Status"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Select Target Workflow Status{" "}
              <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value)}
            >
              <option value="DRAFT">
                DRAFT - Internal Estimating Work in Progress
              </option>
              <option value="UNDER_REVIEW">
                UNDER REVIEW - Submitted for Commercial Verification
              </option>
              <option value="APPROVED">
                APPROVED - Formally Ratified for Construction / Tender
              </option>
              <option value="REVISED">
                REVISED - Superseded by Subsequent Addendum
              </option>
              <option value="REJECTED">
                REJECTED - Disapproved / Returned for Corrections
              </option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Approving Authority / Reviewer Name
            </label>
            <input
              type="text"
              placeholder="e.g. Ing. Kwame Mensah (Project Director)"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200"
              value={approvedByName}
              onChange={(e) => setApprovedByName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Approval / Status Remarks
            </label>
            <textarea
              rows={3}
              placeholder="Enter determination notes, tender committee reference, or conditions of approval..."
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200"
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
            />
          </div>
        </div>
      </ProjectModal>

      {/* Forward for Approval Modal (Sales Order Standard) */}
      {showForwardModal && (
        <ProjectModal
          open={showForwardModal}
          onClose={() => setShowForwardModal(false)}
          title="Forward for Approval"
          subtitle={`Submit ${activeBOQ?.boq_reference || "BOQ"} into the approval workflow`}
          icon={Send}
          showFooter={false}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="text-slate-600 dark:text-slate-300 flex justify-between">
                <span>Document Reference:</span>
                <span className="font-bold font-mono text-brand-600 dark:text-brand-400">
                  {activeBOQ?.boq_reference || "—"}
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-300 flex justify-between">
                <span>Total Amount:</span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">
                  {currency}{" "}
                  {finalEstimatedCost.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-300 flex justify-between">
                <span>Workflow Definition:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {candidateWorkflow
                    ? `${candidateWorkflow.workflow_name} (${candidateWorkflow.workflow_code})`
                    : "Standard BOQ Approval (Default)"}
                </span>
              </div>
            </div>

            {wfLoading ? (
              <div className="py-4 text-center text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw size={16} className="animate-spin" /> Loading
                workflow approvers...
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                    Select Target Approver:
                  </label>
                  <select
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                    value={targetApproverId}
                    onChange={(e) => setTargetApproverId(e.target.value)}
                  >
                    <option value="">-- Choose Approver --</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.full_name || u.username}{" "}
                        {u.role_name ? `(${u.role_name})` : ""}
                      </option>
                    ))}
                  </select>
                  {firstApprover && (
                    <p className="text-xs text-slate-500 mt-1">
                      Step {firstApprover.step_order || 1}:{" "}
                      {firstApprover.step_name || "Approval"}
                    </p>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                    Submission Comments / Cover Note:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Add cover notes or instructions for the reviewing authority..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={forwardComments}
                    onChange={(e) => setForwardComments(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowForwardModal(false)}
                className="btn btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForwardSubmit}
                disabled={submittingForward}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {submittingForward ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />{" "}
                    Forwarding...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Submit for Approval
                  </>
                )}
              </button>
            </div>
          </div>
        </ProjectModal>
      )}

      {/* Approve BOQ Modal */}
      {showApproveModal && (
        <ProjectModal
          open={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          title="Approve Bill of Quantities"
          subtitle={`Authorize and ratify ${activeBOQ?.boq_reference || "BOQ"}`}
          icon={CheckCircle}
          showFooter={false}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to approve BOQ{" "}
              <strong className="text-slate-900 dark:text-white">
                {activeBOQ?.boq_reference}
              </strong>
              ? Once approved, line items and tender rates will be locked.
            </p>
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                Approval Remarks / Comments (Optional):
              </label>
              <textarea
                rows={3}
                placeholder="Approved based on tender scope and QS verification..."
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={approveComments}
                onChange={(e) => setApproveComments(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="btn btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveSubmit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
              >
                <CheckCircle size={14} /> Confirm Approval
              </button>
            </div>
          </div>
        </ProjectModal>
      )}

      {/* Reject BOQ Modal */}
      {showRejectModal && (
        <ProjectModal
          open={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          title="Reject Bill of Quantities"
          subtitle={`Return ${activeBOQ?.boq_reference || "BOQ"} with review corrections`}
          icon={X}
          showFooter={false}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Please enter the reason for rejecting BOQ{" "}
              <strong className="text-slate-900 dark:text-white">
                {activeBOQ?.boq_reference}
              </strong>
              .
            </p>
            <div>
              <label className="font-semibold text-rose-600 dark:text-rose-400 block mb-1">
                Rejection Reason (Required):
              </label>
              <textarea
                rows={3}
                placeholder="Rate discrepancies, missing specifications, budget exceeded..."
                className="w-full bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="btn btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold shadow-md shadow-rose-500/20 flex items-center gap-1.5 transition-all"
              >
                <X size={14} /> Confirm Rejection
              </button>
            </div>
          </div>
        </ProjectModal>
      )}

      {/* Print Preview Modal with Document Template Header */}
      <PrintPreviewModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        html={printHtml}
        downloading={downloadingPdf}
        onDownload={handleDownloadPdf}
      />
    </div>
  );
}
