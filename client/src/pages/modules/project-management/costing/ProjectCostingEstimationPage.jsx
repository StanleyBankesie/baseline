/**

 * @file ProjectCostingEstimationPage.jsx

 * @description Enterprise Project Costing & Budget Estimation Workspace for OmniSuite ERP.

 * Completely rebuilt according to project management, financial analysis, and cost engineering standards.

 * 

 * Capabilities:

 * - Section A: Costing Dashboard (KPI cards, Category visual distribution, Direct vs Indirect, Work Plan/WBS distribution, Timeline expenditure)

 * - Section B: Project Cost Estimate Workspace (Auto estimate number, Estimation methods, Validity, Dept, Cost Centre)

 * - Section C: Cost Breakdown Structure (CBS) (Hierarchical tree grouped by pm_cost_categories, UOMs, inline edits, item actions)

 * - Section D: Specialized Cost Estimation Calculators (Labour, Materials, Equipment, Subcontractors, Services)

 * - Section E: Indirect Costs & Overheads Engine (Overheads, Insurance, Permits, Mobilization, Contingency, Escalation, Taxes)

 * - Section F: Budget Summary & Profit Margin Analysis (Delivery cost vs Profit margin, Budget reserve, Formula trace)

 * - Section G: Work Plan/WBS & Task Cost Allocation (pm_tasks integration, roll-ups, unallocated cost detection)

 * - Section H: Budget Baseline & Version Management (Approval, baseline locking, immutable snapshots, revision history)

 * - Section I: Budget Allocation Workspace (Allocation to phases, Work Plan/WBS activities, tasks, depts, cost centres, budget overrun cap)

 * - Section J: Reports & Exports Suite (11 standard cost reports, multi-tab Excel export, printable official format)

 */



import React, { useState, useEffect, useMemo, useRef } from "react";

import { Link, useSearchParams } from "react-router-dom";

import MobileMovingCarousel from "@/components/MobileMovingCarousel";

import {

  DollarSign,

  Calculator,

  Layers,

  PieChart,

  BarChart3,

  Calendar,

  Clock,

  CheckCircle,

  AlertCircle,

  AlertTriangle,

  FileText,

  FileSpreadsheet,

  Download,

  Upload,

  RefreshCw,

  Plus,

  Trash2,

  Edit2,

  Copy,

  ChevronDown,

  ChevronRight,

  ShieldCheck,

  Lock,

  Unlock,

  History,

  TrendingUp,

  Percent,

  Sparkles,

  Info,

  Check,

  X,

  Filter,

  Search,

  ArrowRight,

  ArrowLeft,

  Printer,

  Sliders,

  FolderTree,

  Building,

  Target,

  Users,

  HardHat,

  Truck,

  Wrench,

  Package,

  Cpu,

  FileCheck,

  Send,

  HelpCircle,

  Eye,

  Tag

} from "lucide-react";

import { api } from "../../../../api/client.js";

import { toast } from "react-toastify";

import * as XLSX from "xlsx";

import { autosizeWorksheetColumns } from "../../../../utils/xlsxUtils.js";

import { fetchReportHeader } from "../../../../utils/pdfUtils.js";



// Estimation Methods supported

const ESTIMATION_METHODS = [

  { value: "BOTTOM_UP", label: "Bottom-up Detailed Itemization", desc: "Detailed breakdown rolled up from work items and line tasks" },

  { value: "TOP_DOWN", label: "Top-down Allocation", desc: "Budget apportioned downwards across phases and work packages" },

  { value: "ANALOGOUS", label: "Analogous Benchmarking", desc: "Estimated based on historical cost data from similar past projects" },

  { value: "PARAMETRIC", label: "Parametric / Unit Rate Modeling", desc: "Cost derived from statistical relationships (e.g. cost per m², per unit)" },

  { value: "THREE_POINT", label: "Three-point PERT (Optimistic / Likely / Pessimistic)", desc: "Weighted average calculation using PERT probability distribution" },

  { value: "EXPERT_JUDGEMENT", label: "Expert Judgement Consensus", desc: "Evaluated by Senior Cost Engineers and Project Directors" }

];



// Standard Cost Estimation UOMs

const STANDARD_UOMS = ["EA", "HRS", "DAYS", "M", "M2", "M3", "KG", "TONNES", "LOT", "LS", "TRIP", "SET", "MONTH"];



export default function ProjectCostingEstimationPage() {

  const [searchParams] = useSearchParams();

  const initialProjectId = searchParams.get("projectId") || searchParams.get("project_id") || "";

  const initialEstimateId = searchParams.get("estimateId") || searchParams.get("boqId") || "";



  // Core navigation tab (streamlined into 4 concise tabs)

  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, breakdown, indirect, baseline_reports

  const [breakdownView, setBreakdownView] = useState("cbs"); // cbs, workplan, allocations, calculators

  const [reportsView, setReportsView] = useState("baseline"); // baseline, reports



  // Master Data

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [projects, setProjects] = useState([]);

  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);

  const [costCategories, setCostCategories] = useState([]);

  const [departments, setDepartments] = useState([]);

  const [costCenters, setCostCenters] = useState([]);

  const [projectTasks, setProjectTasks] = useState([]);



  // Active Estimate / BOQ Record

  const [estimatesList, setEstimatesList] = useState([]);

  const [selectedEstimateId, setSelectedEstimateId] = useState(initialEstimateId);

  const [estimateHeader, setEstimateHeader] = useState({

    id: null,

    project_id: "",

    estimate_number: "",

    estimate_title: "Project Cost Estimate & Baseline Budget",

    estimate_description: "",

    version: "1.0",

    estimation_method: "BOTTOM_UP",

    validity_date: "",

    boq_date: new Date().toISOString().split("T")[0],

    currency: "GHS",

    status: "DRAFT",

    is_baselined: 0,

    department_id: "",

    department_name: "",

    cost_centre_id: "",

    cost_centre_name: "",

    prepared_by_name: "Project Cost Engineer",

    prepared_date: new Date().toISOString().split("T")[0],

    reviewed_by_name: "",

    approved_by_name: "",

    contingency_percent: 5,

    contingency_amount: 0,

    escalation_percent: 0,

    escalation_amount: 0,

    tax_percent: 0,

    tax_amount: 0,

    other_charges: 0,

    direct_cost_subtotal: 0,

    indirect_cost_subtotal: 0,

    discount_percent: 0,

    discount_amount: 0,

    apply_profit_margin: false,

    profit_margin_percent: 10,

    profit_margin_amount: 0,

    subtotal: 0,

    total_amount: 0,

    proposed_budget: 0,

    approved_budget: 0,

    notes_and_assumptions: ""

  });



  // CBS Line Items

  const [items, setItems] = useState([]);

  const [collapsedCategories, setCollapsedCategories] = useState({});

  const [cbsSearchQuery, setCbsSearchQuery] = useState("");

  const [cbsCategoryFilter, setCbsCategoryFilter] = useState("ALL");



  // Revisions & Baseline

  const [revisions, setRevisions] = useState([]);

  const [showRevisionModal, setShowRevisionModal] = useState(false);

  const [revisionForm, setRevisionForm] = useState({ version: "1.1", remarks: "", reason: "Scope adjustment" });



  // Budget Allocations

  const [allocations, setAllocations] = useState([]);

  const [savingAllocations, setSavingAllocations] = useState(false);



  // Specialized Calculator Modal State

  const [calculatorModal, setCalculatorModal] = useState({

    open: false,

    itemIndex: null,

    calcType: "LABOUR", // LABOUR, MATERIALS, EQUIPMENT, SUBCONTRACT, OTHER

    data: {}

  });



  // Traceability Modal

  const [showTraceModal, setShowTraceModal] = useState(false);



  // Print & Reports State

  const [reportType, setReportType] = useState("1");

  const [reportHeaderData, setReportHeaderData] = useState(null);



  // Load Initial Master Data

  useEffect(() => {

    loadMasterData();

  }, []);



  // When project changes, fetch its estimates and tasks

  useEffect(() => {

    if (selectedProjectId) {

      loadProjectData(selectedProjectId);

    }

  }, [selectedProjectId]);



  // When estimate changes, fetch its full item set and revisions

  useEffect(() => {

    if (selectedEstimateId) {

      loadEstimateDetails(selectedEstimateId);

    }

  }, [selectedEstimateId]);



  // Load Master Data (Projects, Categories, Departments, Cost Centers)

  const loadMasterData = async () => {

    try {

      setLoading(true);

      const [projRes, catRes, deptRes, ccRes, repHead] = await Promise.all([

        api.get("/projects/projects", { params: { active: "all" } })

          .catch(() => api.get("/projects", { params: { active: "all" } })),

        api.get("/construction/cost-categories").catch(() => ({ data: { items: [] } })),

        api.get("/departments").catch(() => ({ data: [] })),

        api.get("/finance/cost-centers").catch(() => ({ data: [] })),

        fetchReportHeader().catch(() => null)

      ]);



      const rawProjects = projRes?.data;

      const projList = Array.isArray(rawProjects)

        ? rawProjects

        : Array.isArray(rawProjects?.items)

        ? rawProjects.items

        : Array.isArray(rawProjects?.projects)

        ? rawProjects.projects

        : Array.isArray(rawProjects?.data)

        ? rawProjects.data

        : [];

      setProjects(projList);

      if (repHead) setReportHeaderData(repHead);



      const rawCats = catRes?.data;

      const cats = Array.isArray(rawCats)

        ? rawCats

        : Array.isArray(rawCats?.items)

        ? rawCats.items

        : Array.isArray(rawCats?.data)

        ? rawCats.data

        : [];

      setCostCategories(cats);



      const rawDepts = deptRes?.data;

      const dList = Array.isArray(rawDepts)

        ? rawDepts

        : Array.isArray(rawDepts?.departments)

        ? rawDepts.departments

        : Array.isArray(rawDepts?.items)

        ? rawDepts.items

        : [];

      setDepartments(dList);



      const rawCc = ccRes?.data;

      const ccList = Array.isArray(rawCc)

        ? rawCc

        : Array.isArray(rawCc?.items)

        ? rawCc.items

        : Array.isArray(rawCc?.cost_centers)

        ? rawCc.cost_centers

        : [];

      setCostCenters(ccList);



      // Do NOT select any project by default as per requirement

      // selectedProjectId remains empty until chosen by user

    } catch (err) {

      console.error("Failed to load costing master data:", err);

      toast.error("Error loading master data");

    } finally {

      setLoading(false);

    }

  };



  // Load project-specific estimates and tasks

  const loadProjectData = async (projId) => {

    try {

      const [boqRes, taskRes] = await Promise.all([

        api.get(`/construction/boqs`, { params: { project_id: projId, projectId: projId } })

          .catch(() => ({ data: { items: [] } })),

        api.get(`/projects/tasks`, { params: { project_id: projId } })

          .catch(() => ({ data: { items: [] } }))

      ]);



      const rawBoqs = boqRes?.data;

      const bList = Array.isArray(rawBoqs)

        ? rawBoqs

        : Array.isArray(rawBoqs?.items)

        ? rawBoqs.items

        : Array.isArray(rawBoqs?.data)

        ? rawBoqs.data

        : [];

      setEstimatesList(bList);



      const rawTasks = taskRes?.data;

      const tList = Array.isArray(rawTasks)

        ? rawTasks

        : Array.isArray(rawTasks?.items)

        ? rawTasks.items

        : Array.isArray(rawTasks?.tasks)

        ? rawTasks.tasks

        : [];

      setProjectTasks(tList);



      // If estimates exist for this project, select the active/latest one

      if (bList.length > 0) {

        const found = bList.find((b) => String(b.id) === String(selectedEstimateId)) || bList[0];

        setSelectedEstimateId(String(found.id));

      } else {

        // Prepare blank estimate structure for new project

        const currentProj = (Array.isArray(projects) ? projects : []).find((p) => String(p.id) === String(projId));

        setSelectedEstimateId("");

        setEstimateHeader({

          id: null,

          project_id: projId,

          estimate_number: `EST-${currentProj?.project_code || "PRJ"}-${Date.now().toString().slice(-4)}`,

          estimate_title: `${currentProj?.project_name || "Project"} - Detailed Cost Estimate`,

          estimate_description: "Initial project cost estimation and baseline budget plan",

          version: "1.0",

          estimation_method: "BOTTOM_UP",

          validity_date: "",

          boq_date: new Date().toISOString().split("T")[0],

          currency: currentProj?.currency || "GHS",

          status: "DRAFT",

          is_baselined: 0,

          department_id: "",

          department_name: "",

          cost_centre_id: "",

          cost_centre_name: "",

          prepared_by_name: "Project Cost Engineer",

          prepared_date: new Date().toISOString().split("T")[0],

          reviewed_by_name: "",

          approved_by_name: "",

          contingency_percent: 5,

          contingency_amount: 0,

          escalation_percent: 0,

          escalation_amount: 0,

          tax_percent: 0,

          tax_amount: 0,

          other_charges: 0,

          direct_cost_subtotal: 0,

          indirect_cost_subtotal: 0,

          discount_percent: 0,

          discount_amount: 0,

          apply_profit_margin: false,

          profit_margin_percent: 10,

          profit_margin_amount: 0,

          subtotal: 0,

          total_amount: 0,

          proposed_budget: 0,

          approved_budget: Number(currentProj?.budget || 0),

          notes_and_assumptions: ""

        });

        setItems([]);

        setRevisions([]);

        setAllocations([]);

      }

    } catch (err) {

      console.error("Error loading project data:", err);

    }

  };



  // Load detailed estimate header, items, revisions, allocations

  const loadEstimateDetails = async (estId) => {

    try {

      const [estRes, allocRes] = await Promise.all([

        api.get(`/construction/boqs/${estId}`),

        api.get(`/construction/boqs/${estId}/allocations`).catch(() => ({ data: { allocations: [] } }))

      ]);



      const itemData = estRes?.data?.item || {};

      const itemsList = estRes?.data?.items || [];

      const revList = estRes?.data?.revisions || [];

      const allocList = allocRes?.data?.allocations || [];



      setEstimateHeader({

        ...itemData,

        id: itemData.id,

        project_id: itemData.project_id,

        estimate_number: itemData.estimate_number || itemData.boq_reference || `EST-${itemData.id}`,

        estimate_title: itemData.estimate_title || itemData.boq_title || "Project Cost Estimate",

        estimate_description: itemData.estimate_description || itemData.remarks || "",

        version: itemData.version || "1.0",

        estimation_method: itemData.estimation_method || "BOTTOM_UP",

        validity_date: itemData.validity_date ? itemData.validity_date.split("T")[0] : "",

        boq_date: itemData.boq_date ? itemData.boq_date.split("T")[0] : new Date().toISOString().split("T")[0],

        currency: itemData.currency || "GHS",

        status: itemData.status || "DRAFT",

        is_baselined: Number(itemData.is_baselined || 0),

        department_id: itemData.department_id || "",

        department_name: itemData.department_name || "",

        cost_centre_id: itemData.cost_centre_id || "",

        cost_centre_name: itemData.cost_centre_name || "",

        prepared_by_name: itemData.prepared_by_name || "Project Cost Engineer",

        prepared_date: itemData.prepared_date ? itemData.prepared_date.split("T")[0] : "",

        reviewed_by_name: itemData.reviewed_by_name || "",

        approved_by_name: itemData.approved_by_name || "",

        contingency_percent: Number(itemData.contingency_percent || 5),

        contingency_amount: Number(itemData.contingency_amount || 0),

        escalation_percent: Number(itemData.escalation_percent || 0),

        escalation_amount: Number(itemData.escalation_amount || 0),

        tax_percent: Number(itemData.tax_percent || 0),

        tax_amount: Number(itemData.tax_amount || 0),

        other_charges: Number(itemData.other_charges || 0),

        direct_cost_subtotal: Number(itemData.direct_cost_subtotal || itemData.subtotal || 0),

        indirect_cost_subtotal: Number(itemData.indirect_cost_subtotal || itemData.other_charges || 0),

        discount_percent: Number(itemData.discount_percent || 0),

        discount_amount: Number(itemData.discount_amount || 0),

        apply_profit_margin: Boolean(itemData.apply_profit_margin),

        profit_margin_percent: Number(itemData.profit_margin_percent || 10),

        profit_margin_amount: Number(itemData.profit_margin_amount || 0),

        subtotal: Number(itemData.subtotal || 0),

        total_amount: Number(itemData.total_amount || 0),

        proposed_budget: Number(itemData.proposed_budget || itemData.total_amount || 0),

        approved_budget: Number(itemData.approved_budget || 0),

        notes_and_assumptions: itemData.notes_and_assumptions || ""

      });



      setItems(itemsList);

      setRevisions(revList);

      setAllocations(allocList);

    } catch (err) {

      console.error("Error loading estimate details:", err);

      toast.error("Failed to load estimate details");

    }

  };



  // Current selected project object

  const selectedProject = useMemo(() => {

    if (!Array.isArray(projects)) return null;

    return projects.find((p) => String(p.id) === String(selectedProjectId)) || null;

  }, [projects, selectedProjectId]);



  // Recalculate financial totals dynamically

  const calculatedTotals = useMemo(() => {

    let directSubtotal = 0;

    let indirectSubtotal = Number(estimateHeader.indirect_cost_subtotal || 0);



    // Grouping by category

    const catMap = {};

    items.forEach((itm) => {

      const qty = Number(itm.quantity || 0);

      const rate = Number(itm.unit_rate || 0);

      const baseCost = qty * rate;

      const discPct = Number(itm.discount_percent || 0);

      const discAmt = (baseCost * discPct) / 100;

      const costAfterDisc = baseCost - discAmt;

      const taxRate = Number(itm.tax_rate_percent || 0);

      const taxAmt = (costAfterDisc * taxRate) / 100;

      const totalItemCost = costAfterDisc + taxAmt;



      const catKey = itm.cost_category || "OTHER";

      if (!catMap[catKey]) catMap[catKey] = { total: 0, count: 0 };

      catMap[catKey].total += totalItemCost;

      catMap[catKey].count += 1;



      // Check if category is indirect (like OVERHEAD, PERMITS, INSURANCE)

      const matchedCat = costCategories.find((c) => c.category_code === catKey);

      if (matchedCat?.cost_type === "Indirect Cost" || ["OVERHEAD", "PERMITS", "INSURANCE"].includes(catKey.toUpperCase())) {

        indirectSubtotal += totalItemCost;

      } else {

        directSubtotal += totalItemCost;

      }

    });



    const baseDeliveryCost = directSubtotal + indirectSubtotal;



    // Contingency

    const contPct = Number(estimateHeader.contingency_percent || 0);

    const contAmt = (baseDeliveryCost * contPct) / 100;



    // Escalation / Inflation

    const escPct = Number(estimateHeader.escalation_percent || 0);

    const escAmt = ((baseDeliveryCost + contAmt) * escPct) / 100;



    // Project-level Tax

    const taxPct = Number(estimateHeader.tax_percent || 0);

    const taxAmt = ((baseDeliveryCost + contAmt + escAmt) * taxPct) / 100;



    // Project-level Discount

    const discPct = Number(estimateHeader.discount_percent || 0);

    const discAmt = ((baseDeliveryCost + contAmt) * discPct) / 100;



    // Total Project Delivery Cost (Internal Cost)

    const totalDeliveryCost = baseDeliveryCost + contAmt + escAmt + taxAmt - discAmt;



    // Profit Margin (optional and strictly distinguished from delivery cost)

    const applyProfit = Boolean(estimateHeader.apply_profit_margin);

    const profitPct = Number(estimateHeader.profit_margin_percent || 0);

    const profitAmt = applyProfit ? (totalDeliveryCost * profitPct) / 100 : 0;



    // Proposed Contract Budget (Selling Price to client or proposed baseline)

    const proposedBudget = totalDeliveryCost + profitAmt;



    // Approved Budget

    const approvedBudget = Number(estimateHeader.approved_budget || selectedProject?.budget || 0);



    // Variance

    const budgetVariance = approvedBudget > 0 ? approvedBudget - totalDeliveryCost : 0;



    return {

      directSubtotal,

      indirectSubtotal,

      baseDeliveryCost,

      contingencyAmount: contAmt,

      escalationAmount: escAmt,

      taxAmount: taxAmt,

      discountAmount: discAmt,

      totalDeliveryCost,

      profitAmount: profitAmt,

      proposedBudget,

      approvedBudget,

      budgetVariance,

      categoryMap: catMap

    };

  }, [items, estimateHeader, costCategories, selectedProject]);



  // Handle saving Cost Estimate (Header & Line Items)

  const handleSaveEstimate = async () => {

    if (!selectedProjectId) {

      toast.warning("Please select a project first");

      return;

    }



    try {

      setSaving(true);



      const payload = {

        ...estimateHeader,

        project_id: selectedProjectId,

        direct_cost_subtotal: calculatedTotals.directSubtotal,

        indirect_cost_subtotal: calculatedTotals.indirectSubtotal,

        contingency_amount: calculatedTotals.contingencyAmount,

        escalation_amount: calculatedTotals.escalationAmount,

        tax_amount: calculatedTotals.taxAmount,

        discount_amount: calculatedTotals.discountAmount,

        profit_margin_amount: calculatedTotals.profitAmount,

        subtotal: calculatedTotals.directSubtotal,

        total_amount: calculatedTotals.totalDeliveryCost,

        proposed_budget: calculatedTotals.proposedBudget,

        items: items.map((itm, idx) => ({

          ...itm,

          item_order: idx + 1,

          quantity: Number(itm.quantity || 0),

          unit_rate: Number(itm.unit_rate || 0),

          base_cost: Number(itm.quantity || 0) * Number(itm.unit_rate || 0),

          amount: Number(itm.amount || Number(itm.quantity || 0) * Number(itm.unit_rate || 0)),

          total_cost: Number(itm.total_cost || itm.amount || 0)

        }))

      };



      let estId = estimateHeader.id;

      if (estId) {

        // Save items and update header

        await api.post(`/construction/boqs/${estId}/items`, payload);

        toast.success("Cost estimate saved successfully");

      } else {

        // Create new estimate

        const createRes = await api.post("/construction/boqs", payload);

        estId = createRes?.data?.id;

        toast.success("New cost estimate created successfully");

        if (estId) {

          setSelectedEstimateId(String(estId));

        }

      }



      await loadProjectData(selectedProjectId);

    } catch (err) {

      console.error("Save error:", err);

      toast.error(err?.response?.data?.message || "Failed to save estimate");

    } finally {

      setSaving(false);

    }

  };



  // Lock Baseline Budget

  const handleLockBaseline = async () => {

    if (!estimateHeader.id) {

      toast.warning("Please save the estimate before locking the baseline");

      return;

    }



    const confirm = window.confirm(

      `Are you sure you want to approve and lock this estimate as the official Baseline Project Budget?\n\nBaseline Amount: ${estimateHeader.currency} ${calculatedTotals.totalDeliveryCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\nOnce locked, any subsequent modifications will require formal version revision.`

    );

    if (!confirm) return;



    try {

      setSaving(true);

      await api.post(`/construction/boqs/${estimateHeader.id}/baseline`, {

        approved_budget: calculatedTotals.totalDeliveryCost,

        notes: "Approved and locked as official Baseline Budget"

      });

      toast.success("Official project baseline locked successfully!");

      await loadEstimateDetails(estimateHeader.id);

      await loadProjectData(selectedProjectId);

    } catch (err) {

      console.error("Error locking baseline:", err);

      toast.error(err?.response?.data?.message || "Failed to lock baseline");

    } finally {

      setSaving(false);

    }

  };



  // Create New Formal Revision

  const handleCreateRevision = async (e) => {

    e.preventDefault();

    if (!estimateHeader.id) return;



    try {

      setSaving(true);

      await api.post(`/construction/boqs/${estimateHeader.id}/revision`, {

        new_version: revisionForm.version,

        revision_remarks: `Revision Reason: ${revisionForm.reason}. Notes: ${revisionForm.remarks}`

      });

      toast.success(`Revision ${revisionForm.version} created successfully`);

      setShowRevisionModal(false);

      await loadEstimateDetails(estimateHeader.id);

    } catch (err) {

      console.error("Error creating revision:", err);

      toast.error(err?.response?.data?.message || "Failed to create revision");

    } finally {

      setSaving(false);

    }

  };



  // Add Item to CBS

  const handleAddCBSItem = (categoryCode = "MATERIALS") => {

    const newItem = {

      id: `tmp-${Date.now()}`,

      item_code: "",

      item_description: "",

      cost_category: categoryCode,

      uom: "EA",

      quantity: 1,

      unit_rate: 0,

      base_cost: 0,

      discount_percent: 0,

      discount_amount: 0,

      tax_rate_percent: 0,

      tax_amount: 0,

      amount: 0,

      total_cost: 0,

      task_id: null,

      wbs_code: "",

      department_id: estimateHeader.department_id || null,

      cost_centre_id: estimateHeader.cost_centre_id || null,

      remarks: ""

    };

    setItems([...items, newItem]);

  };



  // Duplicate Item

  const handleDuplicateItem = (index) => {

    const itm = items[index];

    const duplicated = {

      ...itm,

      id: `tmp-${Date.now()}`,

      item_code: `${itm.item_code || "ITM"}-COPY`,

      item_description: `${itm.item_description} (Copy)`

    };

    const nextList = [...items];

    nextList.splice(index + 1, 0, duplicated);

    setItems(nextList);

    toast.info("Cost item duplicated");

  };



  // Delete Item

  const handleDeleteItem = (index) => {

    const nextList = items.filter((_, idx) => idx !== index);

    setItems(nextList);

  };



  // Update item field

  const handleItemChange = (index, field, value) => {

    const nextList = [...items];

    const item = { ...nextList[index], [field]: value };



    // Automatic calculation

    const qty = field === "quantity" ? Number(value) : Number(item.quantity || 0);

    const rate = field === "unit_rate" ? Number(value) : Number(item.unit_rate || 0);

    const baseCost = qty * rate;

    item.base_cost = baseCost;



    const discPct = field === "discount_percent" ? Number(value) : Number(item.discount_percent || 0);

    const discAmt = (baseCost * discPct) / 100;

    item.discount_amount = discAmt;



    const costAfterDisc = baseCost - discAmt;

    const taxRate = field === "tax_rate_percent" ? Number(value) : Number(item.tax_rate_percent || 0);

    const taxAmt = (costAfterDisc * taxRate) / 100;

    item.tax_amount = taxAmt;



    item.amount = costAfterDisc;

    item.total_cost = costAfterDisc + taxAmt;



    nextList[index] = item;

    setItems(nextList);

  };



  // Save Budget Allocations

  const handleSaveAllocations = async () => {

    if (!estimateHeader.id) {

      toast.warning("Please save the cost estimate first");

      return;

    }



    try {

      setSavingAllocations(true);

      await api.post(`/construction/boqs/${estimateHeader.id}/allocations`, {

        allocations

      });

      toast.success("Budget allocations saved successfully");

    } catch (err) {

      console.error("Allocation save error:", err);

      toast.error("Failed to save budget allocations");

    } finally {

      setSavingAllocations(false);

    }

  };



  // Add allocation line

  const handleAddAllocation = () => {

    setAllocations([

      ...allocations,

      {

        id: `alloc-${Date.now()}`,

        allocation_type: "PHASE",

        target_name: "Phase 1 - Inception & Substructure",

        allocated_amount: 0,

        percentage: 0,

        notes: ""

      }

    ]);

  };



  // Update allocation line

  const handleAllocationChange = (index, field, value) => {

    const next = [...allocations];

    const item = { ...next[index], [field]: value };

    const approvedBudget = calculatedTotals.approvedBudget || calculatedTotals.totalDeliveryCost;



    if (field === "allocated_amount" && approvedBudget > 0) {

      item.percentage = Number(((Number(value) / approvedBudget) * 100).toFixed(2));

    } else if (field === "percentage" && approvedBudget > 0) {

      item.allocated_amount = Number(((approvedBudget * Number(value)) / 100).toFixed(2));

    }



    next[index] = item;

    setAllocations(next);

  };



  // Delete allocation line

  const handleDeleteAllocation = (index) => {

    setAllocations(allocations.filter((_, i) => i !== index));

  };



  // Open Specialized Calculator Modal

  const openCalculator = (index) => {

    const itm = items[index];

    const cat = itm.cost_category || "MATERIALS";

    let calcType = "MATERIALS";

    if (["LABOUR", "LABOR"].includes(cat.toUpperCase())) calcType = "LABOUR";

    else if (["EQUIPMENT", "PLANT", "MACHINERY"].includes(cat.toUpperCase())) calcType = "EQUIPMENT";

    else if (["SUBCONTRACTING", "SUBCONTRACTOR"].includes(cat.toUpperCase())) calcType = "SUBCONTRACT";

    else if (["OVERHEAD", "SERVICE", "OTHER"].includes(cat.toUpperCase())) calcType = "OTHER";



    setCalculatorModal({

      open: true,

      itemIndex: index,

      calcType,

      data: {

        roleName: itm.item_description || "Senior Craftsman",

        headcount: 1,

        hoursWorked: 8,

        baseRate: Number(itm.unit_rate || 50),

        overtimeHours: 0,

        overtimeMultiplier: 1.5,

        allowances: 0,

        // Material

        matSpec: itm.item_description || "",

        unitPrice: Number(itm.unit_rate || 100),

        wastePercent: 5,

        freightCharge: 0,

        // Equipment

        equipName: itm.item_description || "",

        ownershipType: "RENTAL",

        duration: 1,

        durationUnit: "DAYS",

        fuelAllowance: 0,

        // Subcontract

        subName: "",

        contractValue: Number(itm.unit_rate || 0),

        retentionPercent: 5,

        supervisionFee: 0

      }

    });

  };



  // Apply Calculator Result to line item

  const applyCalculatorResult = () => {

    const { itemIndex, calcType, data } = calculatorModal;

    if (itemIndex === null) return;



    let computedRate = 0;

    let computedQty = Number(items[itemIndex].quantity || 1);



    if (calcType === "LABOUR") {

      const regularCost = Number(data.headcount || 1) * Number(data.hoursWorked || 8) * Number(data.baseRate || 0);

      const otCost = Number(data.headcount || 1) * Number(data.overtimeHours || 0) * (Number(data.baseRate || 0) * Number(data.overtimeMultiplier || 1.5));

      const allow = Number(data.allowances || 0);

      computedRate = regularCost + otCost + allow;

    } else if (calcType === "MATERIALS") {

      const basePrice = Number(data.unitPrice || 0);

      const waste = (basePrice * Number(data.wastePercent || 0)) / 100;

      const freight = Number(data.freightCharge || 0);

      computedRate = basePrice + waste + freight;

    } else if (calcType === "EQUIPMENT") {

      const baseRate = Number(data.baseRate || 0);

      const fuel = Number(data.fuelAllowance || 0);

      computedRate = baseRate + fuel;

    } else if (calcType === "SUBCONTRACT") {

      computedRate = Number(data.contractValue || 0) + Number(data.supervisionFee || 0);

    } else {

      computedRate = Number(data.baseRate || items[itemIndex].unit_rate || 0);

    }



    handleItemChange(itemIndex, "unit_rate", computedRate);

    setCalculatorModal({ open: false, itemIndex: null, calcType: "LABOUR", data: {} });

    toast.success(`Calculated unit rate ${estimateHeader.currency} ${computedRate.toFixed(2)} applied to item`);

  };



  // Export to Excel Workbook

  const handleExportExcel = () => {

    try {

      const wb = XLSX.utils.book_new();



      // Sheet 1: Executive Summary

      const summaryData = [

        ["OMNISUITE ERP - PROJECT COST ESTIMATE & BUDGET BASELINE"],

        ["Project Code", selectedProject?.project_code || "N/A"],

        ["Project Name", selectedProject?.project_name || "N/A"],

        ["Estimate Number", estimateHeader.estimate_number],

        ["Estimate Version", estimateHeader.version],

        ["Status", estimateHeader.status],

        ["Currency", estimateHeader.currency],

        ["Estimation Method", estimateHeader.estimation_method],

        ["Prepared By", estimateHeader.prepared_by_name],

        ["Date", estimateHeader.boq_date],

        [],

        ["COST SUMMARY BREAKDOWN", "AMOUNT (" + estimateHeader.currency + ")"],

        ["Total Direct Costs", calculatedTotals.directSubtotal],

        ["Total Indirect Costs", calculatedTotals.indirectSubtotal],

        ["Contingency Amount (" + estimateHeader.contingency_percent + "%)", calculatedTotals.contingencyAmount],

        ["Escalation Amount (" + estimateHeader.escalation_percent + "%)", calculatedTotals.escalationAmount],

        ["Taxes (" + estimateHeader.tax_percent + "%)", calculatedTotals.taxAmount],

        ["Discounts (" + estimateHeader.discount_percent + "%)", calculatedTotals.discountAmount],

        ["TOTAL ESTIMATED PROJECT COST (DELIVERY COST)", calculatedTotals.totalDeliveryCost],

        ["Profit Margin (" + (estimateHeader.apply_profit_margin ? estimateHeader.profit_margin_percent + "%" : "0%") + ")", calculatedTotals.profitAmount],

        ["PROPOSED PROJECT BUDGET", calculatedTotals.proposedBudget],

        ["APPROVED BASELINE BUDGET", calculatedTotals.approvedBudget],

        ["VARIANCE (SAVINGS / OVERRUN)", calculatedTotals.budgetVariance]

      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

      autosizeWorksheetColumns(wsSummary);

      XLSX.utils.book_append_sheet(wb, wsSummary, "Cost Summary");



      // Sheet 2: Cost Breakdown Structure (CBS)

      const cbsHeaders = [

        "Item Code",

        "Cost Category",

        "Description",

        "Work Plan/WBS Code",

        "Task Link",

        "UOM",

        "Quantity",

        "Unit Rate",

        "Base Cost",

        "Discount %",

        "Tax %",

        "Total Estimated Cost",

        "Remarks"

      ];

      const cbsRows = items.map((i) => [

        i.item_code,

        i.cost_category,

        i.item_description,

        i.wbs_code || "",

        projectTasks.find((t) => t.id === i.task_id)?.task_title || "",

        i.uom,

        Number(i.quantity || 0),

        Number(i.unit_rate || 0),

        Number(i.base_cost || 0),

        Number(i.discount_percent || 0),

        Number(i.tax_rate_percent || 0),

        Number(i.total_cost || i.amount || 0),

        i.remarks || ""

      ]);

      const wsCBS = XLSX.utils.aoa_to_sheet([cbsHeaders, ...cbsRows]);

      autosizeWorksheetColumns(wsCBS);

      XLSX.utils.book_append_sheet(wb, wsCBS, "Detailed CBS");



      // Sheet 3: Budget Allocations

      const allocHeaders = ["Allocation Type", "Target Component", "Allocated Amount", "Percentage (%)", "Notes"];

      const allocRows = allocations.map((a) => [a.allocation_type, a.target_name, Number(a.allocated_amount || 0), Number(a.percentage || 0), a.notes || ""]);

      const wsAlloc = XLSX.utils.aoa_to_sheet([allocHeaders, ...allocRows]);

      autosizeWorksheetColumns(wsAlloc);

      XLSX.utils.book_append_sheet(wb, wsAlloc, "Budget Allocations");



      // Save file

      const fileName = `${estimateHeader.estimate_number || "Project_Cost_Estimate"}_v${estimateHeader.version}.xlsx`;

      XLSX.writeFile(wb, fileName);

      toast.success("Excel report exported successfully");

    } catch (err) {

      console.error("Excel export error:", err);

      toast.error("Failed to export Excel report");

    }

  };



  // Group items by category for CBS view

  const categorizedItems = useMemo(() => {

    const groups = {};

    const filtered = items.filter((itm) => {

      const matchCat = cbsCategoryFilter === "ALL" || itm.cost_category === cbsCategoryFilter;

      const matchSearch =

        !cbsSearchQuery ||

        itm.item_code?.toLowerCase().includes(cbsSearchQuery.toLowerCase()) ||

        itm.item_description?.toLowerCase().includes(cbsSearchQuery.toLowerCase());

      return matchCat && matchSearch;

    });



    filtered.forEach((itm) => {

      const catKey = itm.cost_category || "OTHER";

      if (!groups[catKey]) groups[catKey] = [];

      groups[catKey].push(itm);

    });



    return groups;

  }, [items, cbsCategoryFilter, cbsSearchQuery]);



  // Total allocated amount in Budget Allocation tab

  const totalAllocatedAmount = useMemo(() => {

    return allocations.reduce((sum, a) => sum + Number(a.allocated_amount || 0), 0);

  }, [allocations]);



  const unallocatedBudgetBalance = useMemo(() => {

    const baseBudget = calculatedTotals.approvedBudget || calculatedTotals.totalDeliveryCost;

    return Math.max(0, baseBudget - totalAllocatedAmount);

  }, [calculatedTotals, totalAllocatedAmount]);



  const allocationPercentage = useMemo(() => {

    const baseBudget = calculatedTotals.approvedBudget || calculatedTotals.totalDeliveryCost;

    if (baseBudget <= 0) return 0;

    return Math.min(100, Number(((totalAllocatedAmount / baseBudget) * 100).toFixed(1)));

  }, [totalAllocatedAmount, calculatedTotals]);



  // Unallocated CBS items (not linked to any Work Plan/WBS activity or Task)

  const unallocatedCBSItems = useMemo(() => {

    return items.filter((i) => !i.task_id && !i.wbs_code);

  }, [items]);



  return (

    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">

      {/* Top Header Navigation */}

      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">

          <div className="flex items-center gap-3">

            <Link

              to="/project-management"

              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"

              title="Back to Project Management"

            >

              <ArrowLeft className="w-5 h-5" />

            </Link>

            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">

              <Calculator className="w-5 h-5" />

            </div>

            <div>

              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Project Costing &amp; Budget Estimation</h1>

              <p className="text-xs text-slate-500 hidden">

                Detailed cost planning, CBS decomposition, baseline budgets, and cost allocation

              </p>

            </div>

          </div>



          {/* Action Toolbar */}

          <div className="flex items-center flex-wrap gap-2.5">

            {/* Baseline Lock Button */}

            {!estimateHeader.is_baselined ? (

              <button

                type="button"

                onClick={handleLockBaseline}

                disabled={saving || !selectedProjectId}

                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"

                title="Lock this estimate as the official Project Baseline Budget"

              >

                <Lock className="w-3.5 h-3.5" /> Lock Baseline Budget

              </button>

            ) : (

              <button

                type="button"

                onClick={() => setShowRevisionModal(true)}

                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors"

                title="Create a new revision of the locked baseline"

              >

                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Create Revision

              </button>

            )}



            {/* Excel Export */}

            <button

              type="button"

              onClick={handleExportExcel}

              disabled={!selectedProjectId}

              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-sm disabled:opacity-50"

            >

              <Download className="w-3.5 h-3.5 text-emerald-600" /> Export Excel

            </button>



            {/* Save Estimate */}

            <button

              type="button"

              onClick={handleSaveEstimate}

              disabled={saving || !selectedProjectId}

              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"

            >

              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}

              Save Estimate

            </button>

          </div>

        </div>



        {/* Tab Strip - Consolidated into 4 Concise Core Workspaces */}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex overflow-x-auto border-t border-slate-100 space-x-1 scrollbar-none py-1">

          {[

            { id: "dashboard", label: "1. Cost Dashboard & Summary", icon: BarChart3 },

            { id: "breakdown", label: "2. Cost Breakdown & Work Plan/WBS", icon: Layers, badge: items.length },

            { id: "indirect", label: "3. Indirect Costs & Markups", icon: Sliders },

            { id: "baseline_reports", label: "4. Baselines & Reports", icon: History, badge: revisions.length }

          ].map((tab) => {

            const Icon = tab.icon;

            const isActive = activeTab === tab.id;

            return (

              <button

                key={tab.id}

                type="button"

                onClick={() => setActiveTab(tab.id)}

                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold whitespace-nowrap rounded-lg transition-all ${

                  isActive

                    ? "bg-slate-900 text-white shadow-sm font-bold"

                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"

                }`}

              >

                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />

                {tab.label}

                {tab.badge !== undefined && (

                  <span

                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${

                      isActive ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-700"

                    }`}

                  >

                    {tab.badge}

                  </span>

                )}

              </button>

            );

          })}

        </div>

      </div>



      {/* Main Workspace Body */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

        {/* ── PROMINENT PROJECT SELECTOR HERO BAR ── */}

        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-slate-700/60 mb-6">

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

            <div className="flex-1">

              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 tracking-wider uppercase mb-1.5">

                <Building className="w-4 h-4" />

                <span>Active Project Costing Workspace</span>

              </div>

              <div className="flex flex-wrap items-center gap-3">

                {/* Large Prominent Project Selector */}

                <div className="relative flex-1 min-w-[280px]">

                  <select

                    value={selectedProjectId}

                    onChange={(e) => setSelectedProjectId(e.target.value)}

                    style={{ backgroundColor: "#ffffff", color: "#0f172a" }}

                    className="w-full !bg-white !text-slate-900 font-bold text-sm sm:text-base px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none cursor-pointer shadow-sm"

                  >

                    <option value="" style={{ backgroundColor: "#ffffff", color: "#64748b" }} className="text-slate-500 font-medium">— Select a Project to View Costing &amp; Budget —</option>

                    {(Array.isArray(projects) ? projects : []).map((p) => (

                      <option key={p.id} value={p.id} style={{ backgroundColor: "#ffffff", color: "#0f172a" }} className="text-slate-900 font-semibold">

                        {p.project_code ? `${p.project_code} — ` : ""}{p.project_name}

                      </option>

                    ))}

                  </select>

                </div>



                {/* Estimate Version Selector */}

                {estimatesList.length > 0 && (

                  <div className="flex items-center gap-2 !bg-white border border-slate-300 rounded-xl px-3 py-1 shadow-sm" style={{ backgroundColor: "#ffffff" }}>

                    <History className="w-4 h-4 text-slate-700 shrink-0" />

                    <select

                      value={selectedEstimateId}

                      onChange={(e) => setSelectedEstimateId(e.target.value)}

                      style={{ backgroundColor: "#ffffff", color: "#0f172a" }}

                      className="!bg-white !text-slate-900 text-xs sm:text-sm font-bold focus:outline-none cursor-pointer py-1.5"

                    >

                      {estimatesList.map((e) => (

                        <option key={e.id} value={e.id} style={{ backgroundColor: "#ffffff", color: "#0f172a" }} className="!text-slate-900 !bg-white font-semibold">

                          v{e.version} ({e.status}) — {e.boq_reference || `EST-${e.id}`}

                        </option>

                      ))}

                    </select>

                  </div>

                )}

              </div>

            </div>



            {/* Project Financial Highlights Strip */}

            {selectedProject ? (

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t lg:border-t-0 lg:border-l border-slate-700/80 pt-3 lg:pt-0 lg:pl-6 text-xs font-mono">

                <div>

                  <span className="text-slate-400 text-[10px] uppercase block font-sans">Currency</span>

                  <span className="font-bold text-white text-sm">{estimateHeader.currency}</span>

                </div>

                <div>

                  <span className="text-slate-400 text-[10px] uppercase block font-sans">Approved Budget</span>

                  <span className="font-bold text-sky-400 text-sm">

                    {Number(selectedProject.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

                  </span>

                </div>

                <div>

                  <span className="text-slate-400 text-[10px] uppercase block font-sans">Total Cost Est.</span>

                  <span className="font-bold text-emerald-400 text-sm">

                    {calculatedTotals.totalDeliveryCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

                  </span>

                </div>

                <div>

                  <span className="text-slate-400 text-[10px] uppercase block font-sans">Budget Variance</span>

                  <span className={`font-bold text-sm ${calculatedTotals.budgetVariance < 0 ? "text-rose-400" : "text-emerald-400"}`}>

                    {calculatedTotals.budgetVariance >= 0 ? "+" : ""}{calculatedTotals.budgetVariance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

                  </span>

                </div>

              </div>

            ) : (

              <div className="text-xs text-amber-300 font-medium flex items-center gap-1.5 border-t lg:border-t-0 lg:border-l border-slate-700/80 pt-3 lg:pt-0 lg:pl-6">

                <AlertCircle className="w-4 h-4 shrink-0" />

                <span>Please select a project to connect costing and budget records.</span>

              </div>

            )}

          </div>

        </div>



        {/* Empty State when no project is selected */}

        {!selectedProjectId && (

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center space-y-3">

            <Building className="w-16 h-16 text-slate-300 mx-auto" />

            <h3 className="text-base font-bold text-slate-800">No Project Selected</h3>

            <p className="text-xs text-slate-500 max-w-md mx-auto">

              Select an active project from the dropdown in the header above to load its cost items, Work Plan/WBS activities, budget baselines, and financial metrics.

            </p>

          </div>

        )}



        {/* TAB 1: COSTING DASHBOARD & SUMMARY */}

        {selectedProjectId && activeTab === "dashboard" && (

          <div className="space-y-6">

            {/* Top 6 KPI Cards Carousel */}

            <MobileMovingCarousel data-page-carousel gridColsClass="grid-cols-2 md:grid-cols-3 lg:grid-cols-6" gapClass="gap-4">

              {[

                {

                  label: "Total Estimated Cost",

                  val: `${estimateHeader.currency} ${calculatedTotals.totalDeliveryCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,

                  icon: <Calculator size={20} className="stroke-[2.5]" />,

                  color: "bg-emerald-600 text-white",

                },

                {

                  label: "Approved Budget",

                  val: `${estimateHeader.currency} ${calculatedTotals.approvedBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,

                  icon: <Lock size={20} className="stroke-[2.5]" />,

                  color: "bg-blue-600 text-white",

                },

                {

                  label: "Direct Costs",

                  val: `${estimateHeader.currency} ${calculatedTotals.directSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,

                  icon: <HardHat size={20} className="stroke-[2.5]" />,

                  color: "bg-brand-900 text-white",

                },

                {

                  label: "Indirect Costs",

                  val: `${estimateHeader.currency} ${calculatedTotals.indirectSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,

                  icon: <Sliders size={20} className="stroke-[2.5]" />,

                  color: "bg-purple-600 text-white",

                },

                {

                  label: `Contingency (${estimateHeader.contingency_percent}%)`,

                  val: `${estimateHeader.currency} ${calculatedTotals.contingencyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,

                  icon: <ShieldCheck size={20} className="stroke-[2.5]" />,

                  color: "bg-amber-500 text-white",

                },

                {

                  label: "Unallocated Budget",

                  val: `${estimateHeader.currency} ${unallocatedBudgetBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,

                  icon: <Target size={20} className="stroke-[2.5]" />,

                  color: "bg-rose-600 text-white",

                },

              ].map((stat, i) => {

          const colors = [

            "bg-sky-600 dark:bg-sky-500 text-white",

            "bg-brand-900 dark:bg-brand-700 text-white",

            "bg-amber-500 text-white",

            "bg-emerald-600 text-white",

          ];

          const colorClass = stat.color || colors[i % 4];



          return (

            <div

              key={i}

              className="card p-6 min-h-[160px] flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm"

            >

              <div>

                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">

                  {stat.label}

                </p>

                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">

                  {stat.val}

                </p>

              </div>

              <div className={`p-3 rounded-full ${colorClass} shadow-sm`}>

                {stat.icon}

              </div>

            </div>

          );

        })}

            </MobileMovingCarousel>



            {/* Visual Distribution Charts */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Chart 1: Cost Breakdown by Category */}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">

                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">

                  <div>

                    <h3 className="font-bold text-slate-900 text-sm">Cost Breakdown by Category</h3>

                    <p className="text-xs text-slate-500">Expenditure share by CBS cost classification</p>

                  </div>

                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">

                    {Object.keys(calculatedTotals.categoryMap).length} Active Categories

                  </span>

                </div>



                <div className="space-y-3.5">

                  {Object.entries(calculatedTotals.categoryMap).map(([catCode, val]) => {

                    const catObj = costCategories.find((c) => c.category_code === catCode);

                    const pct = calculatedTotals.totalDeliveryCost > 0 ? (val.total / calculatedTotals.totalDeliveryCost) * 100 : 0;

                    return (

                      <div key={catCode} className="space-y-1">

                        <div className="flex items-center justify-between text-xs">

                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">

                            <span

                              className="w-2.5 h-2.5 rounded-full inline-block"

                              style={{ backgroundColor: catObj?.color_code || "#6366F1" }}

                            />

                            {catObj?.category_name || catCode} ({val.count} items)

                          </span>

                          <span className="font-bold text-slate-900">

                            {estimateHeader.currency} {val.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}

                            <span className="text-slate-400 font-normal">({pct.toFixed(1)}%)</span>

                          </span>

                        </div>

                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">

                          <div

                            className="h-full rounded-full transition-all duration-500"

                            style={{

                              width: `${Math.min(100, pct)}%`,

                              backgroundColor: catObj?.color_code || "#6366F1"

                            }}

                          />

                        </div>

                      </div>

                    );

                  })}

                  {Object.keys(calculatedTotals.categoryMap).length === 0 && (

                    <div className="py-8 text-center text-slate-400 text-xs">

                      No cost items added yet. Click on the <strong>Cost Breakdown Structure (CBS)</strong> tab to add cost items.

                    </div>

                  )}

                </div>

              </div>



              {/* Chart 2: Direct vs Indirect & Profit Gauge */}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">

                <div>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">

                    <h3 className="font-bold text-slate-900 text-sm">Direct vs. Indirect Split</h3>

                    <PieChart className="w-4 h-4 text-slate-400" />

                  </div>



                  <div className="space-y-4">

                    <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100">

                      <div className="flex items-center justify-between text-xs font-medium text-indigo-900">

                        <span>Direct Costs (Materials, Labor, Plant)</span>

                        <span className="font-bold">

                          {calculatedTotals.totalDeliveryCost > 0

                            ? `${((calculatedTotals.directSubtotal / calculatedTotals.totalDeliveryCost) * 100).toFixed(1)}%`

                            : "0%"}

                        </span>

                      </div>

                      <div className="text-base font-bold text-indigo-950 mt-1">

                        {estimateHeader.currency} {calculatedTotals.directSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                      </div>

                    </div>



                    <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-100">

                      <div className="flex items-center justify-between text-xs font-medium text-purple-900">

                        <span>Indirect Costs & Overheads</span>

                        <span className="font-bold">

                          {calculatedTotals.totalDeliveryCost > 0

                            ? `${((calculatedTotals.indirectSubtotal / calculatedTotals.totalDeliveryCost) * 100).toFixed(1)}%`

                            : "0%"}

                        </span>

                      </div>

                      <div className="text-base font-bold text-purple-950 mt-1">

                        {estimateHeader.currency} {calculatedTotals.indirectSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                      </div>

                    </div>



                    <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100">

                      <div className="flex items-center justify-between text-xs font-medium text-amber-900">

                        <span>Contingency & Escalation Buffer</span>

                        <span className="font-bold">

                          {calculatedTotals.totalDeliveryCost > 0

                            ? `${(((calculatedTotals.contingencyAmount + calculatedTotals.escalationAmount) / calculatedTotals.totalDeliveryCost) * 100).toFixed(1)}%`

                            : "0%"}

                        </span>

                      </div>

                      <div className="text-base font-bold text-amber-950 mt-1">

                        {estimateHeader.currency}{" "}

                        {(calculatedTotals.contingencyAmount + calculatedTotals.escalationAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}

                      </div>

                    </div>

                  </div>

                </div>



                <div className="pt-4 border-t border-slate-100 mt-4">

                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">

                    <span>Baseline Budget Utilization</span>

                    <span className="font-bold text-slate-800">

                      {calculatedTotals.approvedBudget > 0

                        ? `${((calculatedTotals.totalDeliveryCost / calculatedTotals.approvedBudget) * 100).toFixed(1)}%`

                        : "N/A"}

                    </span>

                  </div>

                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">

                    <div

                      className={`h-full rounded-full transition-all duration-500 ${

                        calculatedTotals.approvedBudget > 0 && calculatedTotals.totalDeliveryCost > calculatedTotals.approvedBudget

                          ? "bg-rose-500"

                          : "bg-emerald-500"

                      }`}

                      style={{

                        width: `${

                          calculatedTotals.approvedBudget > 0

                            ? Math.min(100, (calculatedTotals.totalDeliveryCost / calculatedTotals.approvedBudget) * 100)

                            : 0

                        }%`

                      }}

                    />

                  </div>

                </div>

              </div>

            </div>



            {/* Project Costing Meta Summary Card */}

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">

              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">

                <div>

                  <h3 className="font-bold text-slate-900 text-sm">Estimate Governance & Preparation Parameters</h3>

                  <p className="text-xs text-slate-500">Methodology, responsibility, and baseline status</p>

                </div>

                <button

                  type="button"

                  onClick={() => setActiveTab("baseline")}

                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"

                >

                  View Revision History <ArrowRight className="w-3.5 h-3.5" />

                </button>

              </div>



              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">

                <div>

                  <span className="text-slate-400 block mb-0.5">Estimate Reference</span>

                  <span className="font-bold text-slate-900 font-mono">{estimateHeader.estimate_number || "EST-PENDING"}</span>

                </div>

                <div>

                  <span className="text-slate-400 block mb-0.5">Estimation Method</span>

                  <span className="font-semibold text-slate-800">

                    {ESTIMATION_METHODS.find((m) => m.value === estimateHeader.estimation_method)?.label || estimateHeader.estimation_method}

                  </span>

                </div>

                <div>

                  <span className="text-slate-400 block mb-0.5">Prepared By</span>

                  <span className="font-semibold text-slate-800">{estimateHeader.prepared_by_name || "Cost Controller"}</span>

                </div>

                <div>

                  <span className="text-slate-400 block mb-0.5">Current Version</span>

                  <span className="font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono">

                    v{estimateHeader.version} ({estimateHeader.status})

                  </span>

                </div>

              </div>

            </div>

          </div>

        )}



        {/* ── TAB 2: COST BREAKDOWN & WORK PLAN (Sub-navigation Pills) ── */}

        {selectedProjectId && activeTab === "breakdown" && (

          <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-xl w-fit text-xs font-semibold overflow-x-auto mb-5 shadow-xs">

            <button

              type="button"

              onClick={() => setBreakdownView("cbs")}

              className={`px-3.5 py-1.5 rounded-lg transition-all ${

                breakdownView === "cbs" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"

              }`}

            >

              Cost Breakdown Structure (CBS) ({items.length})

            </button>

            <button

              type="button"

              onClick={() => setBreakdownView("workplan")}

              className={`px-3.5 py-1.5 rounded-lg transition-all ${

                breakdownView === "workplan" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"

              }`}

            >

              Work Plan/WBS &amp; Task Cost Allocation ({projectTasks.length})

            </button>

            <button

              type="button"

              onClick={() => setBreakdownView("allocations")}

              className={`px-3.5 py-1.5 rounded-lg transition-all ${

                breakdownView === "allocations" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"

              }`}

            >

              Budget Allocation Workspace ({allocations.length})

            </button>

            <button

              type="button"

              onClick={() => setBreakdownView("calculators")}

              className={`px-3.5 py-1.5 rounded-lg transition-all ${

                breakdownView === "calculators" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"

              }`}

            >

              Specialized Estimators

            </button>

          </div>

        )}



        {/* TAB 2.A: CBS LINE ITEMS */}

        {selectedProjectId && activeTab === "breakdown" && breakdownView === "cbs" && (

          <div className="space-y-5">

            {/* Estimate Header Configuration Card */}

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">

              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">

                <FileText className="w-4 h-4 text-emerald-600" />

                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Estimate Header &amp; Classification Parameters</h3>

              </div>



              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">

                <div>

                  <label className="block text-slate-500 font-medium mb-1">Estimate Number</label>

                  <input

                    type="text"

                    value={estimateHeader.estimate_number}

                    onChange={(e) => setEstimateHeader({ ...estimateHeader, estimate_number: e.target.value })}

                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"

                    placeholder="EST-001"

                  />

                </div>



                <div>

                  <label className="block text-slate-500 font-medium mb-1">Estimate Title</label>

                  <input

                    type="text"

                    value={estimateHeader.estimate_title}

                    onChange={(e) => setEstimateHeader({ ...estimateHeader, estimate_title: e.target.value })}

                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"

                  />

                </div>



                <div>

                  <label className="block text-slate-500 font-medium mb-1">Estimation Method</label>

                  <select

                    value={estimateHeader.estimation_method}

                    onChange={(e) => setEstimateHeader({ ...estimateHeader, estimation_method: e.target.value })}

                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none"

                  >

                    {ESTIMATION_METHODS.map((m) => (

                      <option key={m.value} value={m.value}>

                        {m.label}

                      </option>

                    ))}

                  </select>

                </div>



                <div>

                  <label className="block text-slate-500 font-medium mb-1">Currency</label>

                  <select

                    value={estimateHeader.currency}

                    onChange={(e) => setEstimateHeader({ ...estimateHeader, currency: e.target.value })}

                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold focus:bg-white focus:outline-none"

                  >

                    <option value="GHS">GHS (Ghana Cedi)</option>

                    <option value="USD">USD (US Dollar)</option>

                    <option value="EUR">EUR (Euro)</option>

                    <option value="GBP">GBP (British Pound)</option>

                  </select>

                </div>



                <div>

                  <label className="block text-slate-500 font-medium mb-1">Department</label>

                  <select

                    value={estimateHeader.department_id}

                    onChange={(e) => {

                      const d = departments.find((x) => String(x.id) === e.target.value);

                      setEstimateHeader({

                        ...estimateHeader,

                        department_id: e.target.value,

                        department_name: d?.name || ""

                      });

                    }}

                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none"

                  >

                    <option value="">-- General / Project Operations --</option>

                    {departments.map((d) => (

                      <option key={d.id} value={d.id}>

                        {d.code} - {d.name}

                      </option>

                    ))}

                  </select>

                </div>



                <div>

                  <label className="block text-slate-500 font-medium mb-1">Cost Centre</label>

                  <select

                    value={estimateHeader.cost_centre_id}

                    onChange={(e) => {

                      const c = costCenters.find((x) => String(x.id) === e.target.value);

                      setEstimateHeader({

                        ...estimateHeader,

                        cost_centre_id: e.target.value,

                        cost_centre_name: c?.name || ""

                      });

                    }}

                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none"

                  >

                    <option value="">-- Main Project Cost Centre --</option>

                    {costCenters.map((cc) => (

                      <option key={cc.id} value={cc.id}>

                        {cc.code} - {cc.name}

                      </option>

                    ))}

                  </select>

                </div>



                <div>

                  <label className="block text-slate-500 font-medium mb-1">Prepared By</label>

                  <input

                    type="text"

                    value={estimateHeader.prepared_by_name}

                    onChange={(e) => setEstimateHeader({ ...estimateHeader, prepared_by_name: e.target.value })}

                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none"

                  />

                </div>



                <div>

                  <label className="block text-slate-500 font-medium mb-1">Validity Date</label>

                  <input

                    type="date"

                    value={estimateHeader.validity_date}

                    onChange={(e) => setEstimateHeader({ ...estimateHeader, validity_date: e.target.value })}

                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none"

                  />

                </div>

              </div>

            </div>



            {/* Filter and Add Item Toolbar */}

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">

              <div className="flex items-center gap-2 flex-1 min-w-[280px]">

                <div className="relative flex-1">

                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

                  <input

                    type="text"

                    placeholder="Search CBS items by code or description..."

                    value={cbsSearchQuery}

                    onChange={(e) => setCbsSearchQuery(e.target.value)}

                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"

                  />

                </div>



                <select

                  value={cbsCategoryFilter}

                  onChange={(e) => setCbsCategoryFilter(e.target.value)}

                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"

                >

                  <option value="ALL">All Categories ({items.length})</option>

                  {costCategories.map((c) => (

                    <option key={c.id} value={c.category_code}>

                      {c.category_name}

                    </option>

                  ))}

                </select>

              </div>



              <div className="flex items-center gap-2">

                <button

                  type="button"

                  onClick={() => {

                    const allOpen = Object.keys(collapsedCategories).length === 0;

                    if (allOpen) {

                      const collapsed = {};

                      costCategories.forEach((c) => (collapsed[c.category_code] = true));

                      setCollapsedCategories(collapsed);

                    } else {

                      setCollapsedCategories({});

                    }

                  }}

                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"

                >

                  {Object.keys(collapsedCategories).length === 0 ? "Collapse All" : "Expand All"}

                </button>



                <button

                  type="button"

                  onClick={() => handleAddCBSItem("MATERIALS")}

                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"

                >

                  <Plus className="w-3.5 h-3.5" /> Add Cost Item

                </button>

              </div>

            </div>



            {/* Hierarchical CBS Items Tree Table */}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

              <div className="overflow-x-auto">

                <table className="w-full text-left border-collapse text-sm">

                  <thead>

                    <tr className="bg-slate-900 text-white font-semibold">

                      <th className="py-2.5 px-3 w-10 text-center">#</th>

                      <th className="py-2.5 px-3 w-28">Item Code</th>

                      <th className="py-2.5 px-3 min-w-[200px]">Description</th>

                      <th className="py-2.5 px-3 w-36">Work Plan/WBS</th>

                      <th className="py-2.5 px-3 w-20 text-center">UOM</th>

                      <th className="py-2.5 px-3 w-24 text-right">Quantity</th>

                      <th className="py-2.5 px-3 w-28 text-right">Unit Rate ({estimateHeader.currency})</th>

                      <th className="py-2.5 px-3 w-20 text-right">Disc %</th>

                      <th className="py-2.5 px-3 w-28 text-right">Total Cost ({estimateHeader.currency})</th>

                      <th className="py-2.5 px-3 w-28 text-center">Actions</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {Object.keys(categorizedItems).length === 0 ? (

                      <tr>

                        <td colSpan={10} className="py-12 text-center text-slate-400">

                          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />

                          <p className="font-medium">No Cost Breakdown Structure items found.</p>

                          <p className="text-[11px] text-slate-400 mt-1">

                            Click <strong>Add Cost Item</strong> to start building your detailed project cost estimate.

                          </p>

                        </td>

                      </tr>

                    ) : (

                      Object.entries(categorizedItems).map(([catCode, catItems]) => {

                        const catObj = costCategories.find((c) => c.category_code === catCode);

                        const isCollapsed = Boolean(collapsedCategories[catCode]);

                        const catSubtotal = catItems.reduce((sum, itm) => sum + Number(itm.total_cost || itm.amount || 0), 0);



                        return (

                          <React.Fragment key={catCode}>

                            {/* Category Group Header Row */}

                            <tr

                              onClick={() =>

                                setCollapsedCategories({

                                  ...collapsedCategories,

                                  [catCode]: !isCollapsed

                                })

                              }

                              className="bg-slate-100 hover:bg-slate-200/70 cursor-pointer select-none font-semibold transition-colors border-t-2 border-slate-200"

                            >

                              <td className="py-2 px-3 text-center">

                                {isCollapsed ? (

                                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 inline" />

                                ) : (

                                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 inline" />

                                )}

                              </td>

                              <td colSpan={4} className="py-2 px-3">

                                <div className="flex items-center gap-2">

                                  <span

                                    className="w-2.5 h-2.5 rounded-full inline-block"

                                    style={{ backgroundColor: catObj?.color_code || "#6366F1" }}

                                  />

                                  <span className="font-bold text-slate-900 tracking-tight">

                                    {catObj?.category_name || catCode}

                                  </span>

                                  <span className="text-[11px] font-normal text-slate-500 font-mono">

                                    ({catCode})

                                  </span>

                                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-200 text-slate-700">

                                    {catItems.length} items

                                  </span>

                                  {catObj?.cost_type && (

                                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-medium">

                                      {catObj.cost_type}

                                    </span>

                                  )}

                                </div>

                              </td>

                              <td colSpan={3} className="py-2 px-3 text-right text-slate-500 text-[11px]">

                                Category Subtotal:

                              </td>

                              <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">

                                {estimateHeader.currency} {catSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                              </td>

                              <td className="py-2 px-3 text-center">

                                <button

                                  type="button"

                                  onClick={(e) => {

                                    e.stopPropagation();

                                    handleAddCBSItem(catCode);

                                  }}

                                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold px-2 py-0.5 rounded hover:bg-emerald-50 transition-colors"

                                >

                                  + Add Item

                                </button>

                              </td>

                            </tr>



                            {/* Line Items Rows */}

                            {!isCollapsed &&

                              catItems.map((itm) => {

                                const globalIndex = items.findIndex((x) => x === itm);

                                return (

                                  <tr key={itm.id || globalIndex} className="hover:bg-slate-50/80 transition-colors">

                                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">

                                      {globalIndex + 1}

                                    </td>



                                    {/* Item Code */}

                                    <td className="py-2 px-3">

                                      <input

                                        type="text"

                                        value={itm.item_code || ""}

                                        onChange={(e) => handleItemChange(globalIndex, "item_code", e.target.value)}

                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none font-mono text-[11px] text-slate-800"

                                        placeholder="Item code..."

                                      />

                                    </td>



                                    {/* Description & Category */}

                                    <td className="py-2 px-3">

                                      <input

                                        type="text"

                                        value={itm.item_description || ""}

                                        onChange={(e) => handleItemChange(globalIndex, "item_description", e.target.value)}

                                        className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none text-slate-800 font-medium"

                                        placeholder="Item description / specification"

                                      />

                                    </td>



                                    {/* Work Plan/WBS Link */}

                                    <td className="py-2 px-3">

                                      <select

                                        value={itm.task_id || ""}

                                        onChange={(e) => {

                                          const tId = e.target.value ? Number(e.target.value) : null;

                                          const tObj = projectTasks.find((t) => t.id === tId);

                                          handleItemChange(globalIndex, "task_id", tId);

                                          handleItemChange(globalIndex, "wbs_code", tObj?.scope_name || tObj?.wbs_code || "");

                                        }}

                                        className={`w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] focus:border-emerald-500 focus:outline-none ${

                                          !itm.task_id ? "text-amber-600 font-semibold" : "text-slate-800 font-medium"

                                        }`}

                                      >

                                        <option value="" className="text-slate-400">-- Select Work Plan/WBS --</option>

                                        {projectTasks.map((t) => (

                                          <option key={t.id} value={t.id} className="text-slate-900">

                                            {t.scope_name ? `${t.scope_name} — ` : ""}{t.task_title || t.task_name || `Work Plan/WBS #${t.id}`}

                                          </option>

                                        ))}

                                      </select>

                                    </td>



                                    {/* UOM */}

                                    <td className="py-2 px-3 text-center">

                                      <select

                                        value={itm.uom || "EA"}

                                        onChange={(e) => handleItemChange(globalIndex, "uom", e.target.value)}

                                        className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none text-[11px] text-center font-mono"

                                      >

                                        {STANDARD_UOMS.map((u) => (

                                          <option key={u} value={u}>

                                            {u}

                                          </option>

                                        ))}

                                      </select>

                                    </td>



                                    {/* Quantity */}

                                    <td className="py-2 px-3 text-right">

                                      <input

                                        type="number"

                                        min="0"

                                        step="any"

                                        value={itm.quantity}

                                        onChange={(e) => handleItemChange(globalIndex, "quantity", e.target.value)}

                                        className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none font-mono text-[11px]"

                                      />

                                    </td>



                                    {/* Unit Rate */}

                                    <td className="py-2 px-3 text-right">

                                      <input

                                        type="number"

                                        min="0"

                                        step="any"

                                        value={itm.unit_rate}

                                        onChange={(e) => handleItemChange(globalIndex, "unit_rate", e.target.value)}

                                        className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none font-mono text-[11px] font-semibold text-slate-900"

                                      />

                                    </td>



                                    {/* Discount % */}

                                    <td className="py-2 px-3 text-right">

                                      <input

                                        type="number"

                                        min="0"

                                        max="100"

                                        value={itm.discount_percent || 0}

                                        onChange={(e) => handleItemChange(globalIndex, "discount_percent", e.target.value)}

                                        className="w-full text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white focus:outline-none font-mono text-[11px] text-slate-500"

                                      />

                                    </td>



                                    {/* Total Cost */}

                                    <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">

                                      {Number(itm.total_cost || itm.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}

                                    </td>



                                    {/* Actions */}

                                    <td className="py-2 px-3 text-center">

                                      <div className="flex items-center justify-center gap-1">

                                        <button

                                          type="button"

                                          onClick={() => openCalculator(globalIndex)}

                                          title="Open Specialized Rate Calculator"

                                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"

                                        >

                                          <Calculator className="w-3.5 h-3.5" />

                                        </button>

                                        <button

                                          type="button"

                                          onClick={() => handleDuplicateItem(globalIndex)}

                                          title="Duplicate item"

                                          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"

                                        >

                                          <Copy className="w-3.5 h-3.5" />

                                        </button>

                                        <button

                                          type="button"

                                          onClick={() => handleDeleteItem(globalIndex)}

                                          title="Delete item"

                                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"

                                        >

                                          <Trash2 className="w-3.5 h-3.5" />

                                        </button>

                                      </div>

                                    </td>

                                  </tr>

                                );

                              })}

                          </React.Fragment>

                        );

                      })

                    )}

                  </tbody>

                  {items.length > 0 && (

                    <tfoot>

                      <tr className="bg-slate-900 text-white font-bold border-t border-slate-300 text-xs">

                        <td colSpan={8} className="py-3 px-4 text-right">

                          DIRECT PROJECT COSTS TOTAL ({estimateHeader.currency}):

                        </td>

                        <td className="py-3 px-3 text-right font-mono text-emerald-400 text-sm">

                          {calculatedTotals.directSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                        </td>

                        <td></td>

                      </tr>

                    </tfoot>

                  )}

                </table>

              </div>

            </div>

          </div>

        )}



        {/* TAB 2.D: SPECIALIZED ESTIMATORS */}

        {selectedProjectId && activeTab === "breakdown" && breakdownView === "calculators" && (

          <div className="space-y-6">

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">

              <div className="flex items-center gap-2 mb-2">

                <Calculator className="w-5 h-5 text-emerald-600" />

                <h3 className="font-bold text-slate-900 text-base">Specialized Cost Estimation Calculators</h3>

              </div>

              <p className="text-xs text-slate-500">

                Parametric and resource takeoff calculators for Labour, Materials, Equipment, Subcontractors, and Services.

                Select any calculator below to perform detailed cost build-ups or click the calculator icon next to any CBS line item.

              </p>

            </div>



            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

              {/* Calculator 1: Labour Costs */}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">

                <div>

                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">

                    <Users className="w-5 h-5" />

                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-1">Labour Cost Estimator</h4>

                  <p className="text-xs text-slate-500 mb-4">

                    Calculate loaded labor rate based on headcount, shifts, overtime multiplier, site allowances, and safety provisions.

                  </p>

                  <div className="space-y-2 text-xs text-slate-600 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">

                    <div>Formula:</div>

                    <div className="text-[11px] text-indigo-700">

                      Cost = (Headcount × Hours × BaseRate) + Overtime + Allowances

                    </div>

                  </div>

                </div>

                <button

                  type="button"

                  onClick={() => {

                    if (items.length === 0) handleAddCBSItem("LABOUR");

                    openCalculator(items.length > 0 ? 0 : 0);

                  }}

                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"

                >

                  Launch Labour Estimator

                </button>

              </div>



              {/* Calculator 2: Material Costs */}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">

                <div>

                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">

                    <Package className="w-5 h-5" />

                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-1">Material Cost Estimator</h4>

                  <p className="text-xs text-slate-500 mb-4">

                    Estimate material delivery cost accounting for waste allowances (3% - 10%), delivery freight, and packaging.

                  </p>

                  <div className="space-y-2 text-xs text-slate-600 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">

                    <div>Formula:</div>

                    <div className="text-[11px] text-emerald-700">

                      Cost = Qty × (BasePrice + Wastage% + Freight)

                    </div>

                  </div>

                </div>

                <button

                  type="button"

                  onClick={() => {

                    if (items.length === 0) handleAddCBSItem("MATERIALS");

                    openCalculator(items.length > 0 ? 0 : 0);

                  }}

                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"

                >

                  Launch Material Estimator

                </button>

              </div>



              {/* Calculator 3: Equipment & Plant */}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">

                <div>

                  <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">

                    <Truck className="w-5 h-5" />

                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-1">Equipment & Plant Estimator</h4>

                  <p className="text-xs text-slate-500 mb-4">

                    Owned vs Rental rate evaluation with fuel consumption allowance, operator charges, and maintenance mobilization.

                  </p>

                  <div className="space-y-2 text-xs text-slate-600 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">

                    <div>Formula:</div>

                    <div className="text-[11px] text-amber-700">

                      Cost = (Duration × Rate) + FuelFactor + Mobilization

                    </div>

                  </div>

                </div>

                <button

                  type="button"

                  onClick={() => {

                    if (items.length === 0) handleAddCBSItem("EQUIPMENT");

                    openCalculator(items.length > 0 ? 0 : 0);

                  }}

                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"

                >

                  Launch Equipment Estimator

                </button>

              </div>



              {/* Calculator 4: Subcontractor & Other */}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 transition-colors">

                <div>

                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">

                    <Building className="w-5 h-5" />

                  </div>

                  <h4 className="font-bold text-slate-900 text-sm mb-1">Subcontractor Package Estimator</h4>

                  <p className="text-xs text-slate-500 mb-4">

                    Agreed scope contract sums, retention percentage holding, site attendance, and supervisory markups.

                  </p>

                  <div className="space-y-2 text-xs text-slate-600 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">

                    <div>Formula:</div>

                    <div className="text-[11px] text-purple-700">

                      Cost = ContractValue + SupervisionFee - Retention

                    </div>

                  </div>

                </div>

                <button

                  type="button"

                  onClick={() => {

                    if (items.length === 0) handleAddCBSItem("SUBCONTRACTING");

                    openCalculator(items.length > 0 ? 0 : 0);

                  }}

                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"

                >

                  Launch Subcontractor Estimator

                </button>

              </div>

            </div>

          </div>

        )}



        {/* TAB 3: INDIRECT COSTS & OVERHEADS ENGINE */}

        {selectedProjectId && activeTab === "indirect" && (

          <div className="space-y-6">

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">

              <div className="flex items-center gap-2 mb-2">

                <Sliders className="w-5 h-5 text-emerald-600" />

                <h3 className="font-bold text-slate-900 text-base">Indirect Costs & Additional Charges Engine</h3>

              </div>

              <p className="text-xs text-slate-500">

                Configure corporate overheads, contingency buffers, inflation escalation, and project taxes.

                Calculations dynamically apply without double-counting item-level taxes or discounts.

              </p>

            </div>



            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

              {/* Card 1: Project Management & Site Overheads */}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">

                <div className="flex items-center justify-between pb-2 border-b border-slate-100">

                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">

                    <Building className="w-4 h-4 text-purple-600" /> Overheads & Site Charges

                  </h4>

                  <span className="text-xs font-mono text-purple-600 font-bold">Fixed or %</span>

                </div>



                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">

                    Indirect Overheads Subtotal ({estimateHeader.currency})

                  </label>

                  <input

                    type="number"

                    min="0"

                    step="any"

                    value={estimateHeader.indirect_cost_subtotal}

                    onChange={(e) => setEstimateHeader({ ...estimateHeader, indirect_cost_subtotal: Number(e.target.value) })}

                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"

                  />

                  <p className="text-[11px] text-slate-400 mt-1">

                    Includes project management, site utilities, security, permits, and mobilization fees.

                  </p>

                </div>

              </div>



              {/* Card 2: Contingency Allowance */}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">

                <div className="flex items-center justify-between pb-2 border-b border-slate-100">

                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">

                    <ShieldCheck className="w-4 h-4 text-amber-600" /> Contingency Allowance

                  </h4>

                  <span className="text-xs font-mono text-amber-600 font-bold">{estimateHeader.contingency_percent}%</span>

                </div>



                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">

                    Contingency Percentage (%)

                  </label>

                  <input

                    type="number"

                    min="0"

                    max="100"

                    step="0.5"

                    value={estimateHeader.contingency_percent}

                    onChange={(e) => setEstimateHeader({ ...estimateHeader, contingency_percent: Number(e.target.value) })}

                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"

                  />

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">

                    <span className="text-slate-500">Calculated Reserve:</span>

                    <span className="font-bold text-slate-900 font-mono">

                      {estimateHeader.currency} {calculatedTotals.contingencyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </span>

                  </div>

                </div>

              </div>



              {/* Card 3: Escalation & Inflation */}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">

                <div className="flex items-center justify-between pb-2 border-b border-slate-100">

                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">

                    <TrendingUp className="w-4 h-4 text-blue-600" /> Escalation / Inflation

                  </h4>

                  <span className="text-xs font-mono text-blue-600 font-bold">{estimateHeader.escalation_percent}%</span>

                </div>



                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">

                    Annual Escalation Rate (%)

                  </label>

                  <input

                    type="number"

                    min="0"

                    max="100"

                    step="0.5"

                    value={estimateHeader.escalation_percent}

                    onChange={(e) => setEstimateHeader({ ...estimateHeader, escalation_percent: Number(e.target.value) })}

                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"

                  />

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">

                    <span className="text-slate-500">Escalation Amount:</span>

                    <span className="font-bold text-slate-900 font-mono">

                      {estimateHeader.currency} {calculatedTotals.escalationAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </span>

                  </div>

                </div>

              </div>



              {/* Card 4: Project-Level Taxes */}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">

                <div className="flex items-center justify-between pb-2 border-b border-slate-100">

                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">

                    <Percent className="w-4 h-4 text-emerald-600" /> Statutory Project Taxes

                  </h4>

                  <span className="text-xs font-mono text-emerald-600 font-bold">{estimateHeader.tax_percent}%</span>

                </div>



                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">

                    Applicable Tax Rate (%)

                  </label>

                  <input

                    type="number"

                    min="0"

                    max="100"

                    step="0.5"

                    value={estimateHeader.tax_percent}

                    onChange={(e) => setEstimateHeader({ ...estimateHeader, tax_percent: Number(e.target.value) })}

                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:bg-white focus:outline-none"

                  />

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">

                    <span className="text-slate-500">Computed Tax:</span>

                    <span className="font-bold text-slate-900 font-mono">

                      {estimateHeader.currency} {calculatedTotals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </span>

                  </div>

                </div>

              </div>



              {/* Card 5: Project Concession / Discount */}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">

                <div className="flex items-center justify-between pb-2 border-b border-slate-100">

                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">

                    <Tag className="w-4 h-4 text-rose-600" /> Commercial Discount

                  </h4>

                  <span className="text-xs font-mono text-rose-600 font-bold">{estimateHeader.discount_percent}%</span>

                </div>



                <div>

                  <label className="block text-sm font-medium text-slate-700 mb-1">

                    Discount Deduction (%)

                  </label>

                  <input

                    type="number"

                    min="0"

                    max="100"

                    step="0.5"

                    value={estimateHeader.discount_percent}

                    onChange={(e) => setEstimateHeader({ ...estimateHeader, discount_percent: Number(e.target.value) })}

                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:bg-white focus:outline-none"

                  />

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">

                    <span className="text-slate-500">Deduction Amount:</span>

                    <span className="font-bold text-rose-600 font-mono">

                      -{estimateHeader.currency} {calculatedTotals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </span>

                  </div>

                </div>

              </div>



              {/* Card 6: Assumptions and Regulatory Notes */}

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">

                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">

                  <FileText className="w-4 h-4 text-slate-500" /> Notes & Pricing Assumptions

                </h4>

                <textarea

                  rows={3}

                  value={estimateHeader.notes_and_assumptions}

                  onChange={(e) => setEstimateHeader({ ...estimateHeader, notes_and_assumptions: e.target.value })}

                  placeholder="Record basis of estimate, site access assumptions, exchange rate bounds..."

                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none"

                />

              </div>

            </div>

          </div>

        )}



        {/* TAB 1 (PART 2): CONSOLIDATED FINANCIAL BUDGET & PROFIT ANALYSIS */}

        {selectedProjectId && activeTab === "dashboard" && (

          <div className="space-y-6">

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">

              <div className="flex items-center justify-between pb-3 border-b border-slate-100">

                <div>

                  <h3 className="font-bold text-slate-900 text-base">Consolidated Financial Budget & Profit Analysis</h3>

                  <p className="text-xs text-slate-500">

                    Transparent mathematical synthesis separating internal delivery costs from commercial contract profit margins

                  </p>

                </div>

                <button

                  type="button"

                  onClick={() => setShowTraceModal(true)}

                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"

                >

                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> View Formula Trace

                </button>

              </div>



              {/* Profit Margin Control Bar */}

              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">

                <div className="flex items-center gap-3">

                  <input

                    type="checkbox"

                    id="applyProfitToggle"

                    checked={estimateHeader.apply_profit_margin}

                    onChange={(e) => setEstimateHeader({ ...estimateHeader, apply_profit_margin: e.target.checked })}

                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"

                  />

                  <label htmlFor="applyProfitToggle" className="text-sm font-bold text-slate-800 cursor-pointer">

                    Apply Commercial Profit Margin (Selling Price Mode)

                  </label>

                  <span className="text-[11px] text-slate-400">

                    (Keeps internal cost to deliver strictly distinct from contract proposal sum)

                  </span>

                </div>



                {estimateHeader.apply_profit_margin && (

                  <div className="flex items-center gap-2 text-xs">

                    <span className="text-slate-600 font-medium">Profit Margin %:</span>

                    <input

                      type="number"

                      min="0"

                      max="100"

                      step="0.5"

                      value={estimateHeader.profit_margin_percent}

                      onChange={(e) => setEstimateHeader({ ...estimateHeader, profit_margin_percent: Number(e.target.value) })}

                      className="w-20 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold font-mono focus:outline-none"

                    />

                    <span className="font-bold text-emerald-700 font-mono ml-2">

                      = +{estimateHeader.currency} {calculatedTotals.profitAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </span>

                  </div>

                )}

              </div>

            </div>



            {/* Financial Ledger Breakdown Table */}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

              <table className="w-full text-left border-collapse text-sm">

                <thead>

                  <tr className="bg-slate-900 text-white font-semibold">

                    <th className="py-3 px-4">Financial Component</th>

                    <th className="py-3 px-4">Derivation / Applied Basis</th>

                    <th className="py-3 px-4 text-center">Rate / Factor</th>

                    <th className="py-3 px-4 text-right">Amount ({estimateHeader.currency})</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">

                  <tr>

                    <td className="py-3 px-4 font-bold text-slate-900">Total Direct Costs</td>

                    <td className="py-3 px-4 text-slate-500">Sum of materials, labor, plant, subcontracts</td>

                    <td className="py-3 px-4 text-center text-slate-400">Sum of items</td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">

                      {calculatedTotals.directSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </td>

                  </tr>



                  <tr>

                    <td className="py-3 px-4 font-bold text-slate-900">Total Indirect Costs</td>

                    <td className="py-3 px-4 text-slate-500">Overheads, administration, insurance, permits</td>

                    <td className="py-3 px-4 text-center text-slate-400">Fixed/Sum</td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">

                      {calculatedTotals.indirectSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </td>

                  </tr>



                  <tr className="bg-slate-50/70 font-semibold">

                    <td className="py-2.5 px-4 text-slate-700">Direct + Indirect Subtotal</td>

                    <td className="py-2.5 px-4 text-slate-500">Direct Costs + Indirect Overheads</td>

                    <td className="py-2.5 px-4 text-center text-slate-400">Subtotal</td>

                    <td className="py-2.5 px-4 text-right font-mono text-slate-900">

                      {calculatedTotals.baseDeliveryCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </td>

                  </tr>



                  <tr>

                    <td className="py-3 px-4 font-bold text-amber-900">Contingency Reserve</td>

                    <td className="py-3 px-4 text-slate-500">Applied on base delivery subtotal</td>

                    <td className="py-3 px-4 text-center font-mono text-amber-700">{estimateHeader.contingency_percent}%</td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-900">

                      +{calculatedTotals.contingencyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </td>

                  </tr>



                  <tr>

                    <td className="py-3 px-4 font-bold text-blue-900">Escalation / Inflation Allowance</td>

                    <td className="py-3 px-4 text-slate-500">Applied on subtotal + contingency</td>

                    <td className="py-3 px-4 text-center font-mono text-blue-700">{estimateHeader.escalation_percent}%</td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-900">

                      +{calculatedTotals.escalationAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </td>

                  </tr>



                  <tr>

                    <td className="py-3 px-4 font-bold text-slate-900">Project-Level Taxes</td>

                    <td className="py-3 px-4 text-slate-500">Statutory project tax calculation</td>

                    <td className="py-3 px-4 text-center font-mono text-slate-700">{estimateHeader.tax_percent}%</td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">

                      +{calculatedTotals.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </td>

                  </tr>



                  {calculatedTotals.discountAmount > 0 && (

                    <tr>

                      <td className="py-3 px-4 font-bold text-rose-900">Commercial Discount</td>

                      <td className="py-3 px-4 text-slate-500">Negotiated discount concession</td>

                      <td className="py-3 px-4 text-center font-mono text-rose-700">-{estimateHeader.discount_percent}%</td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">

                        -{calculatedTotals.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                      </td>

                    </tr>

                  )}



                  <tr className="bg-emerald-50/80 font-bold text-emerald-950 border-t-2 border-emerald-300">

                    <td className="py-3.5 px-4 text-sm">TOTAL ESTIMATED PROJECT COST (INTERNAL DELIVERY COST)</td>

                    <td className="py-3.5 px-4 text-sm font-normal text-emerald-800">

                      Total internal financial cost to execute the project

                    </td>

                    <td className="py-3.5 px-4 text-center text-sm text-emerald-800">100% Base</td>

                    <td className="py-3.5 px-4 text-right font-mono text-base text-emerald-900">

                      {calculatedTotals.totalDeliveryCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                    </td>

                  </tr>



                  {estimateHeader.apply_profit_margin && (

                    <>

                      <tr>

                        <td className="py-3 px-4 font-bold text-indigo-900">Commercial Profit Margin</td>

                        <td className="py-3 px-4 text-slate-500">Applied on Total Delivery Cost</td>

                        <td className="py-3 px-4 text-center font-mono text-indigo-700 font-bold">

                          +{estimateHeader.profit_margin_percent}%

                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-900">

                          +{calculatedTotals.profitAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                        </td>

                      </tr>

                      <tr className="bg-slate-900 text-white font-bold">

                        <td className="py-3.5 px-4 text-sm">PROPOSED CONTRACT BUDGET (SELLING PRICE)</td>

                        <td className="py-3.5 px-4 text-sm font-normal text-slate-400">

                          Delivery Cost + Applied Commercial Profit Margin

                        </td>

                        <td className="py-3.5 px-4 text-center text-sm text-slate-400">Target Proposal</td>

                        <td className="py-3.5 px-4 text-right font-mono text-base text-emerald-400">

                          {calculatedTotals.proposedBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                        </td>

                      </tr>

                    </>

                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}



        {/* TAB 2.B: WORK PLAN & TASK COST ALLOCATION */}

        {selectedProjectId && activeTab === "breakdown" && breakdownView === "workplan" && (

          <div className="space-y-6">

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">

              <div className="flex items-center justify-between pb-3 border-b border-slate-100">

                <div>

                  <h3 className="font-bold text-slate-900 text-base">Work Plan/WBS & Task Cost Allocation</h3>

                  <p className="text-xs text-slate-500">

                    Live cost roll-up from individual cost items to Project Tasks, Work Packages, and overall Project Scope.

                  </p>

                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">

                  {projectTasks.length} Project Tasks Configured

                </span>

              </div>



              {/* Unallocated Items Warning Banner */}

              {unallocatedCBSItems.length > 0 && (

                <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">

                  <div className="flex items-center gap-3">

                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />

                    <div>

                      <div className="text-xs font-bold text-amber-900">

                        {unallocatedCBSItems.length} Cost Items are currently unassigned to any Task or Work Plan/WBS activity!

                      </div>

                      <div className="text-[11px] text-amber-700 mt-0.5">

                        Total Unassigned Cost: {estimateHeader.currency}{" "}

                        {unallocatedCBSItems

                          .reduce((s, i) => s + Number(i.total_cost || i.amount || 0), 0)

                          .toLocaleString(undefined, { minimumFractionDigits: 2 })}

                      </div>

                    </div>

                  </div>

                  <button

                    type="button"

                    onClick={() => { setActiveTab("breakdown"); setBreakdownView("cbs"); }}

                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"

                  >

                    Assign in CBS Grid

                  </button>

                </div>

              )}

            </div>



            {/* Tasks Roll-up Table */}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

              <div className="overflow-x-auto">

                <table className="w-full text-left border-collapse text-sm">

                  <thead>

                    <tr className="bg-slate-900 text-white font-semibold">

                      <th className="py-3 px-4 w-28">Work Plan/WBS Code</th>

                      <th className="py-3 px-4 min-w-[200px]">Task Title</th>

                      <th className="py-3 px-4 w-32">Scope</th>

                      <th className="py-3 px-4 w-28 text-center">Status</th>

                      <th className="py-3 px-4 w-24 text-center">Est. Hours</th>

                      <th className="py-3 px-4 w-32 text-right">Allocated Items</th>

                      <th className="py-3 px-4 w-36 text-right">Rolled-Up Cost ({estimateHeader.currency})</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium">

                    {projectTasks.length === 0 ? (

                      <tr>

                        <td colSpan={7} className="py-12 text-center text-slate-400">

                          <FolderTree className="w-8 h-8 mx-auto mb-2 opacity-50" />

                          <p className="font-medium">No tasks found for this project.</p>

                          <p className="text-[11px] text-slate-400 mt-1">

                            Create tasks in <strong>Planning & Scheduling</strong> or <strong>Task Management</strong> to map costs.

                          </p>

                        </td>

                      </tr>

                    ) : (

                      projectTasks.map((t) => {

                        const linkedItems = items.filter((i) => i.task_id === t.id || (t.wbs_code && i.wbs_code === t.wbs_code));

                        const totalTaskCost = linkedItems.reduce((sum, itm) => sum + Number(itm.total_cost || itm.amount || 0), 0);



                        return (

                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">

                            <td className="py-3 px-4 font-mono font-bold text-slate-800">{t.wbs_code || "WP-0"}</td>

                            <td className="py-3 px-4 font-semibold text-slate-900">{t.task_title}</td>

                            <td className="py-3 px-4 text-slate-600">{t.scope_name || "General"}</td>

                            <td className="py-3 px-4 text-center">

                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">

                                {t.status || "TODO"}

                              </span>

                            </td>

                            <td className="py-3 px-4 text-center font-mono text-slate-600">{t.estimated_hours || 0} hrs</td>

                            <td className="py-3 px-4 text-right font-mono text-slate-700">{linkedItems.length} items</td>

                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">

                              {totalTaskCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                            </td>

                          </tr>

                        );

                      })

                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </div>

        )}



        {/* TAB 2.C: BUDGET ALLOCATION WORKSPACE */}

        {selectedProjectId && activeTab === "breakdown" && breakdownView === "allocations" && (

          <div className="space-y-6">

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">

              <div className="flex items-center justify-between pb-3 border-b border-slate-100">

                <div>

                  <h3 className="font-bold text-slate-900 text-base">Project Budget Allocation Workspace</h3>

                  <p className="text-xs text-slate-500">

                    Apportion and track approved baseline budget across Project Phases, Departments, Cost Centres, and Work Packages

                  </p>

                </div>

                <div className="flex items-center gap-2">

                  <button

                    type="button"

                    onClick={handleAddAllocation}

                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"

                  >

                    <Plus className="w-3.5 h-3.5" /> Add Allocation Target

                  </button>

                  <button

                    type="button"

                    onClick={handleSaveAllocations}

                    disabled={savingAllocations}

                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"

                  >

                    {savingAllocations ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}

                    Save Allocations

                  </button>

                </div>

              </div>



              {/* Allocation Progress Bar */}

              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">

                <div className="flex items-center justify-between text-xs font-bold text-slate-800">

                  <span>

                    Approved Budget: {estimateHeader.currency}{" "}

                    {(calculatedTotals.approvedBudget || calculatedTotals.totalDeliveryCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}

                  </span>

                  <span>

                    Allocated: {estimateHeader.currency} {totalAllocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({allocationPercentage}%)

                  </span>

                  <span className={unallocatedBudgetBalance === 0 ? "text-emerald-600" : "text-amber-600"}>

                    Remaining Unallocated: {estimateHeader.currency} {unallocatedBudgetBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                  </span>

                </div>

                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">

                  <div

                    className={`h-full rounded-full transition-all duration-500 ${

                      totalAllocatedAmount > (calculatedTotals.approvedBudget || calculatedTotals.totalDeliveryCost)

                        ? "bg-rose-500"

                        : "bg-emerald-500"

                    }`}

                    style={{ width: `${Math.min(100, allocationPercentage)}%` }}

                  />

                </div>

                {totalAllocatedAmount > (calculatedTotals.approvedBudget || calculatedTotals.totalDeliveryCost) && (

                  <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">

                    <AlertTriangle className="w-3.5 h-3.5" /> Budget Overrun Warning: Total allocations exceed the approved baseline budget!

                  </p>

                )}

              </div>

            </div>



            {/* Allocation Matrix Table */}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

              <table className="w-full text-left border-collapse text-sm">

                <thead>

                  <tr className="bg-slate-900 text-white font-semibold">

                    <th className="py-3 px-4 w-36">Target Type</th>

                    <th className="py-3 px-4 min-w-[200px]">Target Name / Description</th>

                    <th className="py-3 px-4 w-36 text-right">Allocated Amount ({estimateHeader.currency})</th>

                    <th className="py-3 px-4 w-28 text-right">Share (%)</th>

                    <th className="py-3 px-4 min-w-[180px]">Notes & Justification</th>

                    <th className="py-3 px-4 w-16 text-center">Action</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">

                  {allocations.length === 0 ? (

                    <tr>

                      <td colSpan={6} className="py-10 text-center text-slate-400">

                        <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />

                        <p className="font-medium">No budget allocations defined.</p>

                        <p className="text-[11px] text-slate-400 mt-1">

                          Click <strong>Add Allocation Target</strong> to distribute the approved budget across phases or departments.

                        </p>

                      </td>

                    </tr>

                  ) : (

                    allocations.map((alloc, idx) => (

                      <tr key={alloc.id || idx} className="hover:bg-slate-50 transition-colors">

                        <td className="py-2.5 px-4">

                          <select

                            value={alloc.allocation_type}

                            onChange={(e) => handleAllocationChange(idx, "allocation_type", e.target.value)}

                            className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-xs focus:bg-white focus:outline-none"

                          >

                            <option value="PHASE">Project Phase</option>

                            <option value="WBS">Work Plan/WBS Activity</option>

                            <option value="DEPARTMENT">Department</option>

                            <option value="COST_CENTRE">Cost Centre</option>

                            <option value="CONTINGENCY">Risk Reserve</option>

                          </select>

                        </td>



                        <td className="py-2.5 px-4">

                          <input

                            type="text"

                            value={alloc.target_name || ""}

                            onChange={(e) => handleAllocationChange(idx, "target_name", e.target.value)}

                            className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-xs font-semibold focus:bg-white focus:outline-none"

                            placeholder="e.g. Substructure & Civil Works"

                          />

                        </td>



                        <td className="py-2.5 px-4 text-right">

                          <input

                            type="number"

                            min="0"

                            step="any"

                            value={alloc.allocated_amount}

                            onChange={(e) => handleAllocationChange(idx, "allocated_amount", e.target.value)}

                            className="w-full text-right bg-slate-50 border border-slate-300 rounded p-1 text-xs font-mono font-bold focus:bg-white focus:outline-none"

                          />

                        </td>



                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">

                          {alloc.percentage}%

                        </td>



                        <td className="py-2.5 px-4">

                          <input

                            type="text"

                            value={alloc.notes || ""}

                            onChange={(e) => handleAllocationChange(idx, "notes", e.target.value)}

                            className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-xs focus:bg-white focus:outline-none"

                            placeholder="Optional notes"

                          />

                        </td>



                        <td className="py-2.5 px-4 text-center">

                          <button

                            type="button"

                            onClick={() => handleDeleteAllocation(idx)}

                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"

                          >

                            <Trash2 className="w-4 h-4" />

                          </button>

                        </td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}



        {/* ── TAB 4: BASELINES & REPORTS (Sub-navigation Pills) ── */}

        {selectedProjectId && activeTab === "baseline_reports" && (

          <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-xl w-fit text-xs font-semibold overflow-x-auto mb-5 shadow-xs">

            <button

              type="button"

              onClick={() => setReportsView("baseline")}

              className={`px-3.5 py-1.5 rounded-lg transition-all ${

                reportsView === "baseline" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"

              }`}

            >

              Baseline &amp; Revision History ({revisions.length})

            </button>

            <button

              type="button"

              onClick={() => setReportsView("reports")}

              className={`px-3.5 py-1.5 rounded-lg transition-all ${

                reportsView === "reports" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600 hover:text-slate-900"

              }`}

            >

              Standard Reports &amp; Documentation (11 Reports)

            </button>

          </div>

        )}



        {/* TAB 4.A: BASELINE & REVISION HISTORY */}

        {selectedProjectId && activeTab === "baseline_reports" && reportsView === "baseline" && (

          <div className="space-y-6">

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">

              <div className="flex items-center justify-between pb-3 border-b border-slate-100">

                <div>

                  <h3 className="font-bold text-slate-900 text-base">Budget Baseline & Audit Revision Trail</h3>

                  <p className="text-xs text-slate-500">

                    Immutable revision history preserving initial project baselines and subsequent change logs

                  </p>

                </div>

                <div className="flex items-center gap-2">

                  <button

                    type="button"

                    onClick={() => setShowRevisionModal(true)}

                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"

                  >

                    <Plus className="w-3.5 h-3.5" /> Log Formal Revision

                  </button>

                </div>

              </div>



              {/* Baseline Summary Card */}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">

                  <span className="text-xs text-slate-400 block mb-1">Original Approved Baseline</span>

                  <div className="text-lg font-bold text-slate-900 font-mono">

                    {estimateHeader.currency} {calculatedTotals.approvedBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                  </div>

                  <span className="text-[11px] text-slate-500 mt-1 block">

                    {estimateHeader.is_baselined ? "Locked on " + estimateHeader.boq_date : "Pending Approval"}

                  </span>

                </div>



                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">

                  <span className="text-xs text-slate-400 block mb-1">Current Active Version</span>

                  <div className="text-lg font-bold text-emerald-700 font-mono">

                    v{estimateHeader.version} ({estimateHeader.status})

                  </div>

                  <span className="text-[11px] text-slate-500 mt-1 block">

                    Total: {estimateHeader.currency} {calculatedTotals.totalDeliveryCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                  </span>

                </div>



                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">

                  <span className="text-xs text-slate-400 block mb-1">Revisions Recorded</span>

                  <div className="text-lg font-bold text-slate-900 font-mono">{revisions.length}</div>

                  <span className="text-[11px] text-slate-500 mt-1 block">Audit snapshots preserved</span>

                </div>

              </div>

            </div>



            {/* Historical Revisions Table */}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

              <table className="w-full text-left border-collapse text-sm">

                <thead>

                  <tr className="bg-slate-900 text-white font-semibold">

                    <th className="py-3 px-4 w-24">Version</th>

                    <th className="py-3 px-4 w-28">Revision Date</th>

                    <th className="py-3 px-4 w-32">Prepared By</th>

                    <th className="py-3 px-4 w-32">Approved By</th>

                    <th className="py-3 px-4 w-28 text-center">Status</th>

                    <th className="py-3 px-4 w-36 text-right">Total Amount ({estimateHeader.currency})</th>

                    <th className="py-3 px-4 min-w-[200px]">Remarks / Change Reason</th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">

                  {revisions.length === 0 ? (

                    <tr>

                      <td colSpan={7} className="py-8 text-center text-slate-400">

                        No revisions archived yet.

                      </td>

                    </tr>

                  ) : (

                    revisions.map((rev) => (

                      <tr key={rev.id} className="hover:bg-slate-50 transition-colors">

                        <td className="py-3 px-4 font-mono font-bold text-slate-900">v{rev.version}</td>

                        <td className="py-3 px-4 text-slate-600">{rev.revision_date ? rev.revision_date.split("T")[0] : "N/A"}</td>

                        <td className="py-3 px-4 text-slate-800">{rev.prepared_by || "System"}</td>

                        <td className="py-3 px-4 text-slate-800">{rev.approved_by || "Pending"}</td>

                        <td className="py-3 px-4 text-center">

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">

                            {rev.status}

                          </span>

                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">

                          {Number(rev.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}

                        </td>

                        <td className="py-3 px-4 text-slate-600">{rev.remarks || "No remarks logged"}</td>

                      </tr>

                    ))

                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}



        {/* TAB 4.B: REPORTS & EXPORTS SUITE */}

        {selectedProjectId && activeTab === "baseline_reports" && reportsView === "reports" && (

          <div className="space-y-6">

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">

              <div>

                <h3 className="font-bold text-slate-900 text-base">Cost Estimation & Budget Reports Suite</h3>

                <p className="text-xs text-slate-500">

                  Generate, preview, print, and export 11 standard project cost engineering reports with official ERP letterhead

                </p>

              </div>



              <div className="flex items-center gap-2">

                <select

                  value={reportType}

                  onChange={(e) => setReportType(e.target.value)}

                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"

                >

                  <option value="1">1. Detailed Project Cost Estimate</option>

                  <option value="2">2. Project Cost Summary</option>

                  <option value="3">3. Cost Breakdown Structure (CBS) Report</option>

                  <option value="4">4. Labour Cost Estimate</option>

                  <option value="5">5. Material Cost Estimate</option>

                  <option value="6">6. Equipment & Plant Estimate</option>

                  <option value="7">7. Indirect Cost & Overheads Analysis</option>

                  <option value="8">8. Work Plan/WBS & Task Cost Allocation Report</option>

                  <option value="9">9. Budget Allocation Report</option>

                  <option value="10">10. Budget Baseline Revision History</option>

                  <option value="11">11. Estimate vs Approved Budget Comparison</option>

                </select>



                <button

                  type="button"

                  onClick={() => window.print()}

                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"

                >

                  <Printer className="w-3.5 h-3.5 text-slate-600" /> Print Report

                </button>



                <button

                  type="button"

                  onClick={handleExportExcel}

                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"

                >

                  <Download className="w-3.5 h-3.5" /> Export Excel (.xlsx)

                </button>

              </div>

            </div>



            {/* Printable Report Preview Canvas */}

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-md print:border-none print:shadow-none print:p-0">

              {/* Report Official Header */}

              <div className="border-b-2 border-slate-900 pb-4 mb-6">

                <div className="flex items-start justify-between">

                  <div>

                    <h2 className="text-xl font-black text-slate-900 tracking-tight">

                      {reportHeaderData?.companyName || "OMNISUITE ERP"}

                    </h2>

                    <p className="text-xs text-slate-500">Corporate Project Management & Cost Engineering Division</p>

                  </div>

                  <div className="text-right text-xs">

                    <span className="font-mono font-bold text-slate-900 block">{estimateHeader.estimate_number}</span>

                    <span className="text-slate-500">Date: {estimateHeader.boq_date}</span>

                  </div>

                </div>



                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">

                  <div>

                    <span className="text-slate-400 block">Project Code & Name</span>

                    <span className="font-bold text-slate-900">

                      {selectedProject?.project_code} - {selectedProject?.project_name}

                    </span>

                  </div>

                  <div>

                    <span className="text-slate-400 block">Estimate Version</span>

                    <span className="font-bold text-slate-900">

                      v{estimateHeader.version} ({estimateHeader.status})

                    </span>

                  </div>

                  <div>

                    <span className="text-slate-400 block">Currency</span>

                    <span className="font-bold text-slate-900">{estimateHeader.currency}</span>

                  </div>

                  <div>

                    <span className="text-slate-400 block">Prepared By</span>

                    <span className="font-bold text-slate-900">{estimateHeader.prepared_by_name}</span>

                  </div>

                </div>

              </div>



              {/* Dynamic Report Content based on reportType */}

              <div className="space-y-4">

                <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider pb-2 border-b border-slate-200">

                  {reportType === "1" && "Detailed Project Cost Estimate (CBS)"}

                  {reportType === "2" && "Executive Project Cost Summary"}

                  {reportType === "3" && "Cost Breakdown Structure (CBS) Analysis"}

                  {reportType === "4" && "Labour Cost Takeoff Estimate"}

                  {reportType === "5" && "Material Procurement & Delivery Estimate"}

                  {reportType === "6" && "Plant & Equipment Utilization Estimate"}

                  {reportType === "7" && "Indirect Costs, Overheads & Contingency Analysis"}

                  {reportType === "8" && "Work Plan/WBS & Task Cost Allocation Schedule"}

                  {reportType === "9" && "Project Budget Allocation Matrix"}

                  {reportType === "10" && "Budget Baseline Revision Audit History"}

                  {reportType === "11" && "Estimate vs Approved Budget Comparison"}

                </h3>



                {/* Report Table */}

                <table className="w-full text-left border-collapse text-sm">

                  <thead>

                    <tr className="bg-slate-100 text-slate-900 font-bold border-y border-slate-300">

                      <th className="py-2 px-3">#</th>

                      <th className="py-2 px-3">Item Code</th>

                      <th className="py-2 px-3">Description</th>

                      <th className="py-2 px-3">Category</th>

                      <th className="py-2 px-3 text-center">UOM</th>

                      <th className="py-2 px-3 text-right">Quantity</th>

                      <th className="py-2 px-3 text-right">Rate</th>

                      <th className="py-2 px-3 text-right">Total Cost</th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium">

                    {items.map((itm, i) => (

                      <tr key={itm.id || i}>

                        <td className="py-1.5 px-3 text-slate-400">{i + 1}</td>

                        <td className="py-1.5 px-3 font-mono">{itm.item_code}</td>

                        <td className="py-1.5 px-3 font-semibold">{itm.item_description}</td>

                        <td className="py-1.5 px-3 text-slate-600">{itm.cost_category}</td>

                        <td className="py-1.5 px-3 text-center font-mono">{itm.uom}</td>

                        <td className="py-1.5 px-3 text-right font-mono">{itm.quantity}</td>

                        <td className="py-1.5 px-3 text-right font-mono">{Number(itm.unit_rate || 0).toFixed(2)}</td>

                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">

                          {Number(itm.total_cost || itm.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}

                        </td>

                      </tr>

                    ))}

                  </tbody>

                  <tfoot>

                    <tr className="border-t-2 border-slate-900 font-bold">

                      <td colSpan={7} className="py-2 px-3 text-right uppercase">

                        Grand Total Delivery Cost ({estimateHeader.currency}):

                      </td>

                      <td className="py-2 px-3 text-right font-mono text-sm text-slate-900">

                        {calculatedTotals.totalDeliveryCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}

                      </td>

                    </tr>

                  </tfoot>

                </table>



                {/* Official Sign-off Blocks */}

                <div className="grid grid-cols-3 gap-6 pt-12 mt-12 border-t border-slate-200 text-xs">

                  <div>

                    <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">

                      {estimateHeader.prepared_by_name || "Cost Estimator"}

                    </div>

                    <span className="text-[11px] text-slate-400 block mt-1">Prepared By (Signature & Date)</span>

                  </div>

                  <div>

                    <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">

                      {estimateHeader.reviewed_by_name || "Senior Project Manager"}

                    </div>

                    <span className="text-[11px] text-slate-400 block mt-1">Reviewed By (Signature & Date)</span>

                  </div>

                  <div>

                    <div className="border-b border-slate-300 pb-1 font-semibold text-slate-800">

                      {estimateHeader.approved_by_name || "Project Director / CFO"}

                    </div>

                    <span className="text-[11px] text-slate-400 block mt-1">Approved By (Signature & Date)</span>

                  </div>

                </div>

              </div>

            </div>

          </div>

        )}

      </div>



      {/* SPECIALIZED RATE CALCULATOR MODAL */}

      {calculatorModal.open && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">

            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">

              <div className="flex items-center gap-2">

                <Calculator className="w-5 h-5 text-emerald-400" />

                <h3 className="font-bold text-sm">Specialized Rate Build-Up Calculator</h3>

              </div>

              <button

                type="button"

                onClick={() => setCalculatorModal({ open: false, itemIndex: null, calcType: "LABOUR", data: {} })}

                className="text-slate-400 hover:text-white"

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            <div className="p-5 space-y-4 text-xs">

              {/* Type Switcher */}

              <div className="flex rounded-lg bg-slate-100 p-1">

                {[

                  { id: "LABOUR", label: "Labour" },

                  { id: "MATERIALS", label: "Material" },

                  { id: "EQUIPMENT", label: "Equipment" },

                  { id: "SUBCONTRACT", label: "Subcontractor" },

                  { id: "OTHER", label: "Service / Other" }

                ].map((t) => (

                  <button

                    key={t.id}

                    type="button"

                    onClick={() => setCalculatorModal({ ...calculatorModal, calcType: t.id })}

                    className={`flex-1 py-1.5 text-center font-semibold rounded-md transition-all ${

                      calculatorModal.calcType === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"

                    }`}

                  >

                    {t.label}

                  </button>

                ))}

              </div>



              {/* Calculator Inputs: Labour */}

              {calculatorModal.calcType === "LABOUR" && (

                <div className="space-y-3">

                  <div className="grid grid-cols-2 gap-3">

                    <div>

                      <label className="block text-slate-500 font-medium mb-1">Headcount (Personnel)</label>

                      <input

                        type="number"

                        min="1"

                        value={calculatorModal.data.headcount}

                        onChange={(e) =>

                          setCalculatorModal({

                            ...calculatorModal,

                            data: { ...calculatorModal.data, headcount: Number(e.target.value) }

                          })

                        }

                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"

                      />

                    </div>

                    <div>

                      <label className="block text-slate-500 font-medium mb-1">Hours / Days Worked</label>

                      <input

                        type="number"

                        min="1"

                        value={calculatorModal.data.hoursWorked}

                        onChange={(e) =>

                          setCalculatorModal({

                            ...calculatorModal,

                            data: { ...calculatorModal.data, hoursWorked: Number(e.target.value) }

                          })

                        }

                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"

                      />

                    </div>

                  </div>



                  <div className="grid grid-cols-2 gap-3">

                    <div>

                      <label className="block text-slate-500 font-medium mb-1">

                        Base Rate ({estimateHeader.currency} / unit)

                      </label>

                      <input

                        type="number"

                        min="0"

                        value={calculatorModal.data.baseRate}

                        onChange={(e) =>

                          setCalculatorModal({

                            ...calculatorModal,

                            data: { ...calculatorModal.data, baseRate: Number(e.target.value) }

                          })

                        }

                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"

                      />

                    </div>

                    <div>

                      <label className="block text-slate-500 font-medium mb-1">Site Allowances (Fixed)</label>

                      <input

                        type="number"

                        min="0"

                        value={calculatorModal.data.allowances}

                        onChange={(e) =>

                          setCalculatorModal({

                            ...calculatorModal,

                            data: { ...calculatorModal.data, allowances: Number(e.target.value) }

                          })

                        }

                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"

                      />

                    </div>

                  </div>

                </div>

              )}



              {/* Calculator Inputs: Material */}

              {calculatorModal.calcType === "MATERIALS" && (

                <div className="space-y-3">

                  <div>

                    <label className="block text-slate-500 font-medium mb-1">Base Supplier Unit Price ({estimateHeader.currency})</label>

                    <input

                      type="number"

                      min="0"

                      value={calculatorModal.data.unitPrice}

                      onChange={(e) =>

                        setCalculatorModal({

                          ...calculatorModal,

                          data: { ...calculatorModal.data, unitPrice: Number(e.target.value) }

                        })

                      }

                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"

                    />

                  </div>



                  <div className="grid grid-cols-2 gap-3">

                    <div>

                      <label className="block text-slate-500 font-medium mb-1">Waste Allowance (%)</label>

                      <input

                        type="number"

                        min="0"

                        max="50"

                        value={calculatorModal.data.wastePercent}

                        onChange={(e) =>

                          setCalculatorModal({

                            ...calculatorModal,

                            data: { ...calculatorModal.data, wastePercent: Number(e.target.value) }

                          })

                        }

                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"

                      />

                    </div>

                    <div>

                      <label className="block text-slate-500 font-medium mb-1">Freight / Delivery per unit</label>

                      <input

                        type="number"

                        min="0"

                        value={calculatorModal.data.freightCharge}

                        onChange={(e) =>

                          setCalculatorModal({

                            ...calculatorModal,

                            data: { ...calculatorModal.data, freightCharge: Number(e.target.value) }

                          })

                        }

                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"

                      />

                    </div>

                  </div>

                </div>

              )}



              {/* Calculator Inputs: Equipment */}

              {calculatorModal.calcType === "EQUIPMENT" && (

                <div className="space-y-3">

                  <div className="grid grid-cols-2 gap-3">

                    <div>

                      <label className="block text-slate-500 font-medium mb-1">Base Equipment Rate</label>

                      <input

                        type="number"

                        min="0"

                        value={calculatorModal.data.baseRate}

                        onChange={(e) =>

                          setCalculatorModal({

                            ...calculatorModal,

                            data: { ...calculatorModal.data, baseRate: Number(e.target.value) }

                          })

                        }

                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"

                      />

                    </div>

                    <div>

                      <label className="block text-slate-500 font-medium mb-1">Fuel / Maintenance Allowance</label>

                      <input

                        type="number"

                        min="0"

                        value={calculatorModal.data.fuelAllowance}

                        onChange={(e) =>

                          setCalculatorModal({

                            ...calculatorModal,

                            data: { ...calculatorModal.data, fuelAllowance: Number(e.target.value) }

                          })

                        }

                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"

                      />

                    </div>

                  </div>

                </div>

              )}



              {/* Calculator Inputs: Subcontractor */}

              {calculatorModal.calcType === "SUBCONTRACT" && (

                <div className="space-y-3">

                  <div>

                    <label className="block text-slate-500 font-medium mb-1">Contract Agreed Lump Sum ({estimateHeader.currency})</label>

                    <input

                      type="number"

                      min="0"

                      value={calculatorModal.data.contractValue}

                      onChange={(e) =>

                        setCalculatorModal({

                          ...calculatorModal,

                          data: { ...calculatorModal.data, contractValue: Number(e.target.value) }

                        })

                      }

                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"

                    />

                  </div>

                  <div>

                    <label className="block text-slate-500 font-medium mb-1">Supervisory & Attendance Fee</label>

                    <input

                      type="number"

                      min="0"

                      value={calculatorModal.data.supervisionFee}

                      onChange={(e) =>

                        setCalculatorModal({

                          ...calculatorModal,

                          data: { ...calculatorModal.data, supervisionFee: Number(e.target.value) }

                        })

                      }

                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:outline-none"

                    />

                  </div>

                </div>

              )}

            </div>



            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">

              <button

                type="button"

                onClick={() => setCalculatorModal({ open: false, itemIndex: null, calcType: "LABOUR", data: {} })}

                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"

              >

                Cancel

              </button>

              <button

                type="button"

                onClick={applyCalculatorResult}

                className="px-4 py-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"

              >

                Apply Calculated Rate

              </button>

            </div>

          </div>

        </div>

      )}



      {/* FORMAL REVISION CREATION MODAL */}

      {showRevisionModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">

            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">

              <div className="flex items-center gap-2">

                <Sparkles className="w-5 h-5 text-amber-400" />

                <h3 className="font-bold text-sm">Create Formal Budget Revision</h3>

              </div>

              <button type="button" onClick={() => setShowRevisionModal(false)} className="text-slate-400 hover:text-white">

                <X className="w-5 h-5" />

              </button>

            </div>



            <form onSubmit={handleCreateRevision} className="p-5 space-y-4 text-xs">

              <div>

                <label className="block text-slate-700 font-semibold mb-1">New Revision Version</label>

                <input

                  type="text"

                  required

                  value={revisionForm.version}

                  onChange={(e) => setRevisionForm({ ...revisionForm, version: e.target.value })}

                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono focus:bg-white focus:outline-none"

                  placeholder="e.g. 1.1 or 2.0"

                />

              </div>



              <div>

                <label className="block text-slate-700 font-semibold mb-1">Mandatory Revision Reason</label>

                <select

                  value={revisionForm.reason}

                  onChange={(e) => setRevisionForm({ ...revisionForm, reason: e.target.value })}

                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium focus:bg-white focus:outline-none"

                >

                  <option value="Scope adjustment">Scope adjustment / Additions</option>

                  <option value="Material price escalation">Material price escalation</option>

                  <option value="Client variation order">Client variation order</option>

                  <option value="Design engineering modification">Design engineering modification</option>

                  <option value="Periodic budget reconciliation">Periodic budget reconciliation</option>

                </select>

              </div>



              <div>

                <label className="block text-slate-700 font-semibold mb-1">Revision Notes & Justification</label>

                <textarea

                  rows={3}

                  required

                  value={revisionForm.remarks}

                  onChange={(e) => setRevisionForm({ ...revisionForm, remarks: e.target.value })}

                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none"

                  placeholder="Detail the justification for amending the approved baseline..."

                />

              </div>



              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">

                <button

                  type="button"

                  onClick={() => setShowRevisionModal(false)}

                  className="px-3 py-1.5 text-slate-600 font-medium"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={saving}

                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold shadow-sm"

                >

                  Confirm & Archive Previous Version

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* FORMULA TRACEABILITY MODAL */}

      {showTraceModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden">

            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">

              <div className="flex items-center gap-2">

                <Info className="w-5 h-5 text-indigo-400" />

                <h3 className="font-bold text-sm">Financial Formula & Calculation Traceability</h3>

              </div>

              <button type="button" onClick={() => setShowTraceModal(false)} className="text-slate-400 hover:text-white">

                <X className="w-5 h-5" />

              </button>

            </div>



            <div className="p-5 space-y-4 text-xs font-mono">

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">

                <div className="font-bold text-slate-800">1. Line Item Base Cost:</div>

                <div className="text-slate-600">Base Cost = Quantity × Unit Rate</div>

              </div>



              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">

                <div className="font-bold text-slate-800">2. Direct Costs Subtotal:</div>

                <div className="text-slate-600">Direct Subtotal = ∑ (Direct Category Line Items)</div>

                <div className="text-emerald-700 font-bold">= {calculatedTotals.directSubtotal.toFixed(2)}</div>

              </div>



              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">

                <div className="font-bold text-slate-800">3. Indirect Costs Subtotal:</div>

                <div className="text-slate-600">Indirect Subtotal = Fixed Overheads + ∑ (Indirect Category Line Items)</div>

                <div className="text-purple-700 font-bold">= {calculatedTotals.indirectSubtotal.toFixed(2)}</div>

              </div>



              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">

                <div className="font-bold text-slate-800">4. Contingency & Escalation Buffer:</div>

                <div className="text-slate-600">Contingency = (Direct + Indirect) × {estimateHeader.contingency_percent}%</div>

                <div className="text-amber-700 font-bold">= {calculatedTotals.contingencyAmount.toFixed(2)}</div>

              </div>



              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">

                <div className="font-bold text-slate-800">5. Total Project Delivery Cost (Internal Cost):</div>

                <div className="text-slate-600">Delivery Cost = Direct + Indirect + Contingency + Escalation + Taxes - Discounts</div>

                <div className="text-emerald-800 font-bold text-sm">= {calculatedTotals.totalDeliveryCost.toFixed(2)}</div>

              </div>

            </div>



            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">

              <button

                type="button"

                onClick={() => setShowTraceModal(false)}

                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"

              >

                Close Trace

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

