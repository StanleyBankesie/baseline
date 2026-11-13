/**
 * @fileoverview ProjectManagementHome component.
 * Provides functionality for ProjectManagementHome.
 */

import React from "react";
import { Link, Route, Routes, Navigate } from "react-router-dom";
import ModuleDashboard from "../../../components/ModuleDashboard";
import ModuleLayout from "../../../components/ModuleLayout.jsx";
import { api } from "../../../api/client.js";

import ProjectList from "./projects/ProjectList.jsx";
import ProjectForm from "./projects/ProjectForm.jsx";
import ProjectDetailDashboard from "./projects/ProjectDetailDashboard.jsx";
import ProjectMilestonesTimeline from "./projects/ProjectMilestonesTimeline.jsx";
import TaskList from "./tasks/TaskList.jsx";
import TaskAssignmentKanban from "./tasks/TaskAssignmentKanban.jsx";
import TaskForm from "./tasks/TaskForm.jsx";
import TaskExecution from "./tasks/TaskExecution.jsx";
import ProjectReports from "./reports/ProjectReports.jsx";
import ExpenseList from "./expenses/ExpenseList.jsx";
import ProjectIncomeList from "./income/ProjectIncomeList.jsx";
import PMSetup from "./setup/Setup.jsx";
import PMMaterialRequisitionList from "./material-requisition/MaterialRequisitionList.jsx";
import PMMaterialRequisitionForm from "./material-requisition/MaterialRequisitionForm.jsx";
import PMMaterialUtilizationList from "./material-utilization/MaterialUtilizationList.jsx";
import PMMaterialUtilizationForm from "./material-utilization/MaterialUtilizationForm.jsx";
import PMMaterialReceiptList from "./material-receipt/MaterialReceiptList.jsx";
import PMMaterialReceiptForm from "./material-receipt/MaterialReceiptForm.jsx";
import ProjectOrderList from "./project-orders/ProjectOrderList.jsx";
import ProjectOrderForm from "./project-orders/ProjectOrderForm.jsx";
import ProjectStatusReport from "./reports/ProjectStatusReport.jsx";
import PMPurchaseRequisitionList from "./purchase-requisitions/PMPurchaseRequisitionList.jsx";
import PMPurchaseRequisitionForm from "./purchase-requisitions/PMPurchaseRequisitionForm.jsx";
import ProjectIncomeReport from "./reports/ProjectIncomeReport.jsx";
import ProjectExpenseReport from "./reports/ProjectExpenseReport.jsx";
import ProjectExpenseIncomeReport from "./reports/ProjectExpenseIncomeReport.jsx";
import TaskExecutionReportPage from "./reports/TaskExecutionReportPage.jsx";
import ProjectManagementDashboardPage from "./ProjectManagementDashboardPage.jsx";
import ResourceManagement from "./resources/ResourceManagement.jsx";
import ProjectQuotationList from "./quotations/ProjectQuotationList.jsx";
import ProjectQuotationForm from "./quotations/ProjectQuotationForm.jsx";
import ProjectInvoiceList from "./project-invoices/ProjectInvoiceList.jsx";
import ProjectInvoiceForm from "./project-invoices/ProjectInvoiceForm.jsx";

import BOQManager from "./construction/BOQManager.jsx";
import CostControlDashboard from "./construction/CostControlDashboard.jsx";
import GanttScheduleView from "./construction/GanttScheduleView.jsx";
import ProjectTimelinePage from "./construction/ProjectTimelinePage.jsx";
import ScheduleMonitoringPage from "./construction/ScheduleMonitoringPage.jsx";
import CriticalPathPage from "./construction/CriticalPathPage.jsx";
import ProjectMindmapPage from "./mindmap/ProjectMindmapPage.jsx";
import DailySiteReportList from "./construction/DailySiteReportList.jsx";
import DailySiteReportForm from "./construction/DailySiteReportForm.jsx";
import SubcontractorManager from "./construction/SubcontractorManager.jsx";
import ClientValuationList from "./construction/ClientValuationList.jsx";
import PaymentApplicationList from "./construction/PaymentApplicationList.jsx";
import VariationRegister from "./construction/VariationRegister.jsx";
import QualityControlPage from "./construction/QualityControlPage.jsx";
import DocumentRegisterPage from "./construction/DocumentRegisterPage.jsx";
import EquipmentLogsPage from "./construction/EquipmentLogsPage.jsx";
import ProjectClosurePage from "./closure/ProjectClosurePage.jsx";

export const projectManagementSections = [
  {
    title: "Project Initiation",
    badge: "Initiation",
    description: "Project proposal, objectives, scope and approval.",
    items: [
      {
        title: "Projects",
        path: "/project-management/projects",
        actions: [
          { label: "View", path: "/project-management/projects", type: "outline" },
          { label: "New", path: "/project-management/projects/new", type: "primary" }
        ],
        description: "Manage end-to-end project lifecycles, objectives, and charter",
        icon: "📁",
      },
      {
        title: "Project Proposals & Quotations",
        path: "/project-management/quotations",
        actions: [
          { label: "View", path: "/project-management/quotations", type: "outline" },
          { label: "New", path: "/project-management/quotations/new", type: "primary" }
        ],
        description: "Draft quotes for clients based on project estimates",
        icon: "📝",
      },
      {
        title: "Client's Orders",
        path: "/project-management/project-orders",
        actions: [
          { label: "View", path: "/project-management/project-orders", type: "outline" },
          { label: "New", path: "/project-management/project-orders/new", type: "primary" }
        ],
        description: "Client project engagements, agreements, and confirmed orders",
        icon: "📜",
      },
      {
        title: "Operations Setup",
        path: "/project-management/setup",
        actions: [
          { label: "View", path: "/project-management/setup", type: "outline" }
        ],
        description: "Project categories, types, workflow stages, and operational setup",
        icon: "⚙️",
      },
    ],
  },
  {
    title: "Project Planning",
    badge: "Planning",
    description: "Budget, timelines, milestones, resources and task breakdown.",
    items: [
      {
        title: "Project Mindmap",
        path: "/project-management/mindmap",
        actions: [
          { label: "View", path: "/project-management/mindmap", type: "outline" },
        ],
        description: "Brainstorm, structure scope, and collate thoughts visually before moving into execution",
        icon: "🧠",
      },
      {
        title: "Project Timeline",
        path: "/project-management/timeline",
        actions: [
          { label: "View", path: "/project-management/timeline", type: "outline" },
        ],
        description: "Master project schedule, work breakdown, planned vs actual dates and overall duration",
        icon: "⏱️",
      },
      {
        title: "Planning & Scheduling",
        path: "/project-management/schedule",
        actions: [
          { label: "View", path: "/project-management/schedule", type: "outline" },
        ],
        description: "Gantt chart, task calendar and task dependency relationships",
        icon: "📅",
      },
      {
        title: "Schedule Monitoring",
        path: "/project-management/schedule-monitoring",
        actions: [
          { label: "View", path: "/project-management/schedule-monitoring", type: "outline" },
        ],
        description: "Planned vs actual progress, delayed activities, upcoming deadlines and schedule variance",
        icon: "📈",
      },
      {
        title: "Critical Path (CPM)",
        path: "/project-management/critical-path",
        actions: [
          { label: "View", path: "/project-management/critical-path", type: "outline" },
        ],
        description: "Critical path analysis, ES/EF/LS/LF float table and longest-path activity sequence",
        icon: "🔴",
      },
      {
        title: "Bill of Quantities (BOQ)",
        path: "/project-management/boqs",
        actions: [
          { label: "View", path: "/project-management/boqs", type: "outline" },
        ],
        description: "Hierarchical work breakdown (WBS), rate build-up, and budget estimation",
        icon: "📐",
      },
      {
        title: "Resource Management",
        path: "/project-management/resources",
        actions: [
          { label: "View", path: "/project-management/resources", type: "outline" },
          { label: "New", path: "/project-management/resources/new", type: "primary" }
        ],
        description: "Allocate project team members, labor, and plant equipment",
        icon: "👥",
      },
      {
        title: "Purchase Requisitions",
        path: "/project-management/purchase-requisitions",
        actions: [
          { label: "View", path: "/project-management/purchase-requisitions", type: "outline" },
          { label: "New", path: "/project-management/purchase-requisitions/new", type: "primary" }
        ],
        description: "Procurement planning and external material demand requisitions",
        icon: "🛒",
      },
      {
        title: "Drawings & Documents",
        path: "/project-management/documents",
        actions: [
          { label: "View", path: "/project-management/documents", type: "outline" },
        ],
        description: "Approved drawing register, scope documents, and technical RFIs",
        icon: "📋",
      },
    ],
  },
  {
    title: "Project Execution",
    badge: "Execution",
    description: "Task assignment, team collaboration and implementation.",
    items: [
      {
        title: "Task Assignments & Kanban",
        path: "/project-management/tasks/assignment",
        actions: [
          { label: "Kanban", path: "/project-management/tasks/assignment", type: "primary" },
          { label: "Table", path: "/project-management/tasks", type: "outline" }
        ],
        description: "Visual drag-and-drop task assignment and scope allocation",
        icon: "📋",
      },
      {
        title: "Task Execution Dashboard",
        path: "/project-management/tasks/execution",
        actions: [
          { label: "View", path: "/project-management/tasks/execution", type: "outline" },
          { label: "New", path: "/project-management/tasks/execution/new", type: "primary" }
        ],
        description: "Work log, progress updates, task timer, and checklists",
        icon: "⏱️",
      },
      {
        title: "Material Requisitions",
        path: "/project-management/material-requisitions",
        actions: [
          { label: "View", path: "/project-management/material-requisitions", type: "outline" },
          { label: "New", path: "/project-management/material-requisitions/new", type: "primary" }
        ],
        description: "Request stock from main warehouse for site implementation",
        icon: "📦",
      },
      {
        title: "Material Receipts",
        path: "/project-management/material-receipts",
        actions: [
          { label: "View", path: "/project-management/material-receipts", type: "outline" },
          { label: "New", path: "/project-management/material-receipts/new", type: "primary" }
        ],
        description: "Receive and inspect requested items on site",
        icon: "📥",
      },
      {
        title: "Material Utilization",
        path: "/project-management/material-utilizations",
        actions: [
          { label: "View", path: "/project-management/material-utilizations", type: "outline" },
          { label: "New", path: "/project-management/material-utilizations/new", type: "primary" }
        ],
        description: "Track on-site material consumption against specific work tasks",
        icon: "🔨",
      },
      {
        title: "Daily Site Diary (DSR)",
        path: "/project-management/daily-reports",
        actions: [
          { label: "View", path: "/project-management/daily-reports", type: "outline" },
          { label: "New", path: "/project-management/daily-reports/new", type: "primary" },
        ],
        description: "Weather, daily workforce headcount, plant deployment, and work logs",
        icon: "🏗️",
      },
      {
        title: "Plant & Equipment Logs",
        path: "/project-management/equipment-logs",
        actions: [
          { label: "View", path: "/project-management/equipment-logs", type: "outline" },
        ],
        description: "Machine operating hours, idle/breakdown downtime, and fuel costing",
        icon: "🚜",
      },
      {
        title: "Subcontractors & Trade Works",
        path: "/project-management/subcontracts",
        actions: [
          { label: "View", path: "/project-management/subcontracts", type: "outline" },
        ],
        description: "Trade agreements, specialist trade execution, and subcontractor coordination",
        icon: "🤝",
      },
    ],
  },
  {
    title: "Monitoring and Control",
    badge: "Control",
    description: "Progress tracking, expenditure monitoring, risks and delays.",
    items: [
      {
        title: "Cost Control & EVM",
        path: "/project-management/cost-control",
        actions: [
          { label: "View", path: "/project-management/cost-control", type: "outline" },
        ],
        description: "Earned Value Management, CPI, SPI, EAC, and cost code tracking",
        icon: "📊",
      },
      {
        title: "Project Direct Expenses",
        path: "/project-management/expenses",
        actions: [
          { label: "View", path: "/project-management/expenses", type: "outline" },
          { label: "New", path: "/project-management/expenses/new", type: "primary" }
        ],
        description: "Record site petty cash and out-of-pocket costs",
        icon: "💸",
      },
      {
        title: "Project Income & Billing",
        path: "/project-management/income",
        actions: [
          { label: "View", path: "/project-management/income", type: "outline" },
          { label: "New", path: "/project-management/income/new", type: "primary" }
        ],
        description: "Project milestone billings, receipt vouchers, and revenue collection",
        icon: "💵",
      },
      {
        title: "Project Invoices",
        path: "/project-management/project-invoices",
        actions: [
          { label: "View", path: "/project-management/project-invoices", type: "outline" },
          { label: "New", path: "/project-management/project-invoices/new", type: "primary" }
        ],
        description: "Bill clients for completed project work",
        icon: "🧾",
      },
      {
        title: "Variations & Change Orders",
        path: "/project-management/variations",
        actions: [
          { label: "View", path: "/project-management/variations", type: "outline" },
        ],
        description: "Change orders, scope additions, delay claims, and contract adjustments",
        icon: "📝",
      },
      {
        title: "Client Valuations",
        path: "/project-management/client-valuations",
        actions: [
          { label: "View", path: "/project-management/client-valuations", type: "outline" },
        ],
        description: "Physical work measurement, BOQ items, variations, and assessed value",
        icon: "📐",
      },
      {
        title: "Payment Applications (IPAs)",
        path: "/project-management/payment-applications",
        actions: [
          { label: "View", path: "/project-management/payment-applications", type: "outline" },
        ],
        description: "Formal payment applications, certifications, deductions, and payment tracking",
        icon: "📑",
      },
      {
        title: "Quality Control (QA/QC)",
        path: "/project-management/quality-control",
        actions: [
          { label: "View", path: "/project-management/quality-control", type: "outline" },
        ],
        description: "Inspection requests (IR), Non-Conformance Reports (NCR), defect tracking, and tests",
        icon: "🛡️",
      },
      {
        title: "Project Status & Progress Report",
        path: "/project-management/reports/project-status",
        actions: [
          { label: "View", path: "/project-management/reports/project-status", type: "outline" }
        ],
        description: "Schedule, budget vs actual variance analysis, risk indicators, and milestone health",
        icon: "📈",
      },
      {
        title: "Task Execution & Delay Log",
        path: "/project-management/reports/task-execution",
        actions: [
          { label: "View", path: "/project-management/reports/task-execution", type: "outline" }
        ],
        description: "Task completion tracking, reasons for delay, and team workload summary",
        icon: "📝",
      },
      {
        title: "Project Profit & Loss (P&L)",
        path: "/project-management/reports/project-expense-income",
        actions: [
          { label: "View", path: "/project-management/reports/project-expense-income", type: "outline" }
        ],
        description: "Expenditure monitoring, deficit, and surplus analysis per project",
        icon: "⚖️",
      },
    ],
  },
  {
    title: "Project Closure",
    badge: "Closure",
    description: "Project handover, final account settlement, snag resolution and closeout.",
    items: [
      {
        title: "Project Handover & Closeout",
        path: "/project-management/closure",
        actions: [
          { label: "View", path: "/project-management/closure", type: "outline" },
          { label: "New", path: "/project-management/closure", type: "primary" },
        ],
        description: "Handover certificates, taking-over records, and project closeout dossier",
        icon: "🏁",
      },
      {
        title: "Snag & Punch List Resolution",
        path: "/project-management/quality-control",
        actions: [
          { label: "View", path: "/project-management/quality-control", type: "outline" },
        ],
        description: "Defect rectification, punch list completion, and practical completion sign-off",
        icon: "🛡️",
      },
      {
        title: "Final Account & Retention Release",
        path: "/project-management/client-valuations",
        actions: [
          { label: "View", path: "/project-management/client-valuations", type: "outline" },
        ],
        description: "Final valuation reconciliation, retention money release, and subcontractor final accounts",
        icon: "💰",
      },
    ],
  },
  {
    title: "Reports & Analytics",
    badge: "BI",
    description: "Operational reports, timesheet analysis, and voucher archives",
    items: [
      {
        title: "Task Management Report",
        path: "/project-management/reports/task-management",
        actions: [
          { label: "View", path: "/project-management/reports/task-management", type: "outline" }
        ],
        description: "Task completion metrics and assignee workloads",
        icon: "📉",
      },
      {
        title: "Project Income Report",
        path: "/project-management/reports/project-income",
        actions: [
          { label: "View", path: "/project-management/reports/project-income", type: "outline" }
        ],
        description: "Receipt vouchers linked to projects",
        icon: "💰",
      },
      {
        title: "Project Expense Report",
        path: "/project-management/reports/project-expense",
        actions: [
          { label: "View", path: "/project-management/reports/project-expense", type: "outline" }
        ],
        description: "Payment vouchers linked to projects",
        icon: "💳",
      },
    ],
  },
];

function ProjectManagementLanding() {
  const [stats, setStats] = React.useState([
    {
      rbac_key: "active-projects",
      value: "—",
      label: "Total Projects",
      change: "Loading…",
      changeType: "neutral",
      path: "/project-management/projects",
      actions: [
        { label: "View", path: "/project-management/projects", type: "outline" },
        { label: "New", path: "/project-management/projects/new", type: "primary" },
      ],
    },
    {
      rbac_key: "open-tasks",
      value: "—",
      label: "Open Tasks",
      change: "Loading…",
      changeType: "neutral",
      path: "/project-management/tasks",
      actions: [
        { label: "View", path: "/project-management/tasks", type: "outline" },
        { label: "New", path: "/project-management/tasks/new", type: "primary" },
      ],
    },
    {
      rbac_key: "total-budget",
      value: "—",
      label: "Total Project Budget",
      change: "Loading…",
      changeType: "neutral",
      path: "/project-management/reports",
      actions: [
        { label: "View", path: "/project-management/reports", type: "outline" },
      ],
    },
    {
      rbac_key: "total-hours",
      value: "—",
      label: "Total Logged Hours",
      change: "Loading…",
      changeType: "neutral",
      path: "/project-management/tasks/execution",
      actions: [
        { label: "View", path: "/project-management/tasks/execution", type: "outline" },
      ],
    },
  ]);

  React.useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const resp = await api.get("/projects/dashboard/stats");
        const d = resp?.data?.data || resp?.data;
        if (d && mounted) {
          setStats((prev) => [
            {
              ...prev[0],
              value: String(d.totalProjects ?? "—"),
              change: `${d.activeProjects ?? 0} active`,
              changeType: "positive",
            },
            {
              ...prev[1],
              value: String(d.openTasks ?? d.activeTasks ?? "—"),
              change: `${d.overdueTasks ?? 0} overdue`,
              changeType: d.overdueTasks > 0 ? "warning" : "positive",
            },
            {
              ...prev[2],
              value: `GH₵ ${Number(d.totalBudget || 0).toLocaleString()}`,
              change: `GH₵ ${Number(d.totalExpenses ?? 0).toLocaleString()} spent`,
              changeType: "positive",
            },
            {
              ...prev[3],
              value: `${Number(d.totalLoggedHours || 0).toFixed(1)}h`,
              change: `${d.totalDays ?? 0} days`,
              changeType: "positive",
            },
          ]);
        }
      } catch (err) {
        console.error("Failed loading project management stats:", err);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ModuleDashboard
      title="Project Management"
      description="Strategic project planning and operational execution"
      stats={stats}
      moduleKey="project-management"
      useSectionNavigation={true}
      headerActions={[
        {
          label: "Dashboard",
          path: "/project-management/dashboard",
          actions: [
            { label: "View", path: "/project-management/dashboard", type: "outline" },
          ],
          icon: "📊",
        },
      ]}
      sections={projectManagementSections}
      features={projectManagementFeatures}
    />
  );
}
/**
 *  component
 *
 * @returns {JSX.Element} The rendered component
 */
export default function ProjectManagementHome() {
  return (
    <div className="pm-module-scope w-full">
      <style>{`
        /* Canonical Omnisuite Project Management Module Styling */
        .pm-module-scope {
          --pm-brand: #0E3646;
          --pm-brand-hover: #215876;
        }

        /* Ensure table header styling matches enterprise design standard */
        .pm-module-scope thead th {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
          background-color: #f8fafc;
        }
        :is(.dark) .pm-module-scope thead th {
          color: #94a3b8;
          border-bottom-color: #334155;
          background-color: rgba(30, 41, 59, 0.8);
        }

        /* Standardize input and select surfaces across all PM pages */
        .pm-module-scope .input,
        .pm-module-scope select.input,
        .pm-module-scope input.input {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      <ModuleLayout
      sections={projectManagementSections}
      moduleKey="project-management"
    >
      <Routes>
        <Route path="/" element={<ProjectManagementLanding />} />
        <Route path="dashboard" element={<ProjectManagementDashboardPage />} />

        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/new" element={<ProjectForm />} />
        <Route path="/projects/:id/edit" element={<ProjectForm />} />
        <Route path="/projects/:id" element={<ProjectForm />} />
        <Route
          path="/projects/:id/dashboard"
          element={<ProjectDetailDashboard />}
        />

        <Route path="/tasks" element={<TaskList />} />
        <Route path="/tasks/assignment" element={<TaskAssignmentKanban />} />
        <Route path="/tasks/execution" element={<TaskExecution />} />
        <Route path="/tasks/new" element={<TaskForm />} />
        <Route path="/tasks/:id" element={<TaskForm />} />

        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/expenses/new" element={<ExpenseList />} />
        <Route path="/income" element={<ProjectIncomeList />} />
        <Route path="/income/new" element={<ProjectIncomeList />} />

        <Route path="/reports" element={<ProjectReports />} />
        <Route
          path="/reports/task-management"
          element={<TaskExecutionReportPage />}
        />
        <Route
          path="/reports/task-management-execution"
          element={<TaskExecutionReportPage />}
        />
        <Route
          path="/reports/task-management-and-execution"
          element={<TaskExecutionReportPage />}
        />
        <Route
          path="/reports/task-execution"
          element={<TaskExecutionReportPage />}
        />
        <Route
          path="/reports/project-status"
          element={<ProjectStatusReport />}
        />
        <Route
          path="/reports/project-income"
          element={<ProjectIncomeReport />}
        />
        <Route
          path="/reports/project-expense"
          element={<ProjectExpenseReport />}
        />
        <Route
          path="/reports/project-expense-income"
          element={<ProjectExpenseIncomeReport />}
        />

        <Route path="/setup" element={<PMSetup />} />

        <Route
          path="/material-requisitions"
          element={<PMMaterialRequisitionList />}
        />
        <Route
          path="/material-requisitions/new"
          element={<PMMaterialRequisitionForm />}
        />
        <Route
          path="/material-requisitions/:id"
          element={<PMMaterialRequisitionForm />}
        />

        <Route
          path="/material-utilizations"
          element={<PMMaterialUtilizationList />}
        />
        <Route
          path="/material-utilizations/new"
          element={<PMMaterialUtilizationForm />}
        />
        <Route
          path="/material-utilizations/:id"
          element={<PMMaterialUtilizationForm />}
        />

        <Route path="/material-receipts" element={<PMMaterialReceiptList />} />
        <Route
          path="/material-receipts/new"
          element={<PMMaterialReceiptForm />}
        />
        <Route
          path="/material-receipts/:id"
          element={<PMMaterialReceiptForm />}
        />

        <Route path="/project-orders" element={<ProjectOrderList />} />
        <Route path="/project-orders/new" element={<ProjectOrderForm />} />
        <Route path="/project-orders/:id" element={<ProjectOrderForm />} />

        <Route path="/quotations" element={<ProjectQuotationList />} />
        <Route path="/quotations/new" element={<ProjectQuotationForm />} />
        <Route path="/quotations/:id" element={<ProjectQuotationForm />} />

        <Route path="/project-invoices" element={<ProjectInvoiceList />} />
        <Route path="/project-invoices/new" element={<ProjectInvoiceForm />} />
        <Route
          path="/project-invoices/:id"
          element={<ProjectInvoiceForm />}
        />

        <Route path="/milestones" element={<ProjectMilestonesTimeline />} />
        <Route path="/milestones/new" element={<TaskForm />} />
        <Route path="/resources" element={<ResourceManagement />} />
        <Route path="/resources/new" element={<ResourceManagement />} />
        <Route path="/income" element={<ProjectIncomeList />} />

        <Route
          path="/purchase-requisitions"
          element={<PMPurchaseRequisitionList />}
        />
        <Route
          path="/purchase-requisitions/new"
          element={<PMPurchaseRequisitionForm />}
        />
        <Route
          path="/purchase-requisitions/:id"
          element={<PMPurchaseRequisitionForm />}
        />
        <Route
          path="/purchase-requisitions/:id/edit"
          element={<PMPurchaseRequisitionForm />}
        />
        {/* Construction Management Module Routes */}
        <Route path="/boqs" element={<BOQManager />} />
        <Route path="/cost-control" element={<CostControlDashboard />} />
        <Route path="/timeline" element={<ProjectTimelinePage />} />
        <Route path="/schedule" element={<GanttScheduleView />} />
        <Route path="/schedule-monitoring" element={<ScheduleMonitoringPage />} />
        <Route path="/critical-path" element={<CriticalPathPage />} />
        <Route path="/mindmap" element={<ProjectMindmapPage />} />
        <Route path="/execution-mindmap" element={<ProjectMindmapPage />} />
        <Route path="/daily-reports" element={<DailySiteReportList />} />
        <Route path="/daily-reports/new" element={<DailySiteReportForm />} />
        <Route path="/daily-reports/:id" element={<DailySiteReportForm />} />
        <Route path="/subcontracts" element={<SubcontractorManager />} />
        <Route path="/client-valuations" element={<ClientValuationList />} />
        <Route path="/payment-applications" element={<PaymentApplicationList />} />
        <Route path="/variations" element={<VariationRegister />} />
        <Route path="/quality-control" element={<QualityControlPage />} />
        <Route path="/safety" element={<Navigate to="/environmental-health-safety/safety" replace />} />
        <Route path="/safety/incidents" element={<Navigate to="/environmental-health-safety/incidents" replace />} />
        <Route path="/safety/toolbox-talks" element={<Navigate to="/environmental-health-safety/toolbox-talks" replace />} />
        <Route path="/documents" element={<DocumentRegisterPage />} />
        <Route path="/rfis" element={<DocumentRegisterPage />} />
        <Route path="/equipment-logs" element={<EquipmentLogsPage />} />
        <Route path="/closure" element={<ProjectClosurePage />} />
      </Routes>
    </ModuleLayout>
    </div>
  );
}

export const projectManagementFeatures = [
  {
    module_key: "project-management",
    label: "Projects",
    path: "/project-management/projects",
        actions: [
          { label: "View", path: "/project-management/projects", type: "outline" },
          { label: "New", path: "/project-management/projects/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Task Assignment",
    path: "/project-management/tasks",
        actions: [
          { label: "View", path: "/project-management/tasks", type: "outline" },
          { label: "New", path: "/project-management/tasks/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Task Execution",
    path: "/project-management/tasks/execution",
        actions: [
          { label: "View", path: "/project-management/tasks/execution", type: "outline" },
          { label: "New", path: "/project-management/tasks/execution/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Expenses",
    path: "/project-management/expenses",
        actions: [
          { label: "View", path: "/project-management/expenses", type: "outline" },
          { label: "New", path: "/project-management/expenses/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Operations Setup",
    path: "/project-management/setup",
        actions: [
          { label: "View", path: "/project-management/setup", type: "outline" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Material Requisition",
    path: "/project-management/material-requisitions",
        actions: [
          { label: "View", path: "/project-management/material-requisitions", type: "outline" },
          { label: "New", path: "/project-management/material-requisitions/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Material Utilization",
    path: "/project-management/material-utilizations",
        actions: [
          { label: "View", path: "/project-management/material-utilizations", type: "outline" },
          { label: "New", path: "/project-management/material-utilizations/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Materials Receipt",
    path: "/project-management/material-receipts",
        actions: [
          { label: "View", path: "/project-management/material-receipts", type: "outline" },
          { label: "New", path: "/project-management/material-receipts/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Project Income",
    path: "/project-management/income",
        actions: [
          { label: "View", path: "/project-management/income", type: "outline" },
          { label: "New", path: "/project-management/income/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Milestones",
    path: "/project-management/milestones",
        actions: [
          { label: "View", path: "/project-management/milestones", type: "outline" },
          { label: "New", path: "/project-management/tasks/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Resource Management",
    path: "/project-management/resources",
        actions: [
          { label: "View", path: "/project-management/resources", type: "outline" },
          { label: "New", path: "/project-management/resources/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Client's Orders",
    path: "/project-management/project-orders",
        actions: [
          { label: "View", path: "/project-management/project-orders", type: "outline" },
          { label: "New", path: "/project-management/project-orders/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Project Quotations",
    path: "/project-management/quotations",
        actions: [
          { label: "View", path: "/project-management/quotations", type: "outline" },
          { label: "New", path: "/project-management/quotations/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Project Invoices",
    path: "/project-management/project-invoices",
        actions: [
          { label: "View", path: "/project-management/project-invoices", type: "outline" },
          { label: "New", path: "/project-management/project-invoices/new", type: "primary" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Purchase Requisition",
    path: "/project-management/purchase-requisitions",
        actions: [
          { label: "View", path: "/project-management/purchase-requisitions", type: "outline" },
          { label: "New", path: "/project-management/purchase-requisitions/new", type: "primary" }
        ],
    type: "feature",
  },

  {
    module_key: "project-management",
    label: "Project Status Report",
    path: "/project-management/reports/project-status",
        actions: [
          { label: "View", path: "/project-management/reports/project-status", type: "outline" }
        ],
    type: "dashboard",
  },
  {
    module_key: "project-management",
    label: "Project Income Report",
    path: "/project-management/reports/project-income",
        actions: [
          { label: "View", path: "/project-management/reports/project-income", type: "outline" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Project Expense Report",
    path: "/project-management/reports/project-expense",
        actions: [
          { label: "View", path: "/project-management/reports/project-expense", type: "outline" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Project Expense and Income Report",
    path: "/project-management/reports/project-expense-income",
    actions: [
      { label: "View", path: "/project-management/reports/project-expense-income", type: "outline" }
    ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Task Management Report",
    path: "/project-management/reports/task-management",
        actions: [
          { label: "View", path: "/project-management/reports/task-management", type: "outline" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Task Execution Log",
    path: "/project-management/reports/task-execution",
        actions: [
          { label: "View", path: "/project-management/reports/task-execution", type: "outline" }
        ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Bill of Quantities (BOQ)",
    path: "/project-management/boqs",
    actions: [{ label: "View", path: "/project-management/boqs", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Cost Control & EVM",
    path: "/project-management/cost-control",
    actions: [{ label: "View", path: "/project-management/cost-control", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Project Mindmap",
    path: "/project-management/mindmap",
    actions: [{ label: "View", path: "/project-management/mindmap", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Project Timeline",
    path: "/project-management/timeline",
    actions: [{ label: "View", path: "/project-management/timeline", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Planning & Scheduling",
    path: "/project-management/schedule",
    actions: [{ label: "View", path: "/project-management/schedule", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Schedule Monitoring",
    path: "/project-management/schedule-monitoring",
    actions: [{ label: "View", path: "/project-management/schedule-monitoring", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Critical Path (CPM)",
    path: "/project-management/critical-path",
    actions: [{ label: "View", path: "/project-management/critical-path", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Daily Site Diary (DSR)",
    path: "/project-management/daily-reports",
    actions: [
      { label: "View", path: "/project-management/daily-reports", type: "outline" },
      { label: "New", path: "/project-management/daily-reports/new", type: "primary" },
    ],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Subcontractors & IPCs",
    path: "/project-management/subcontracts",
    actions: [{ label: "View", path: "/project-management/subcontracts", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Client Valuations",
    path: "/project-management/client-valuations",
    actions: [{ label: "View", path: "/project-management/client-valuations", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Interim Payment Applications (IPAs)",
    path: "/project-management/payment-applications",
    actions: [{ label: "View", path: "/project-management/payment-applications", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Variations & Change Orders",
    path: "/project-management/variations",
    actions: [{ label: "View", path: "/project-management/variations", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Quality Control (QA/QC)",
    path: "/project-management/quality-control",
    actions: [{ label: "View", path: "/project-management/quality-control", type: "outline" }],
    type: "feature",
  },
    {
    module_key: "project-management",
    label: "Drawings & Documents",
    path: "/project-management/documents",
    actions: [{ label: "View", path: "/project-management/documents", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Plant & Equipment Logs",
    path: "/project-management/equipment-logs",
    actions: [{ label: "View", path: "/project-management/equipment-logs", type: "outline" }],
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Project Handover & Closeout",
    path: "/project-management/closure",
    actions: [
      { label: "View", path: "/project-management/closure", type: "outline" },
      { label: "New", path: "/project-management/closure", type: "primary" },
    ],
    type: "feature",
  },
];
