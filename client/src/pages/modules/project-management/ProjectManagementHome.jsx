/**
 * @fileoverview ProjectManagementHome component.
 * Provides functionality for ProjectManagementHome.
 */

import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import ModuleDashboard from "../../../components/ModuleDashboard";
import ModuleLayout from "../../../components/ModuleLayout.jsx";
import { api } from "../../../api/client.js";

import ProjectList from "./projects/ProjectList.jsx";
import ProjectForm from "./projects/ProjectForm.jsx";
import ProjectDetailDashboard from "./projects/ProjectDetailDashboard.jsx";
import TaskList from "./tasks/TaskList.jsx";
import TaskForm from "./tasks/TaskForm.jsx";
import TaskExecution from "./tasks/TaskExecution.jsx";
import ProjectReports from "./reports/ProjectReports.jsx";
import TimesheetList from "./timesheets/TimesheetList.jsx";
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
import TaskExecutionReportPage from "./reports/TaskExecutionReportPage.jsx";
import TaskManagementAndExecutionPage from "./reports/TaskManagementAndExecutionPage.jsx";
import ProjectManagementDashboardPage from "./ProjectManagementDashboardPage.jsx";

export const projectManagementSections = [
  {
    title: "Portfolio",
    badge: "Planning",
    items: [
      {
        title: "Projects",
        path: "/project-management/projects",
        description: "Manage end-to-end project lifecycles",
        icon: "📁",
      },
      {
        title: "Project Orders",
        path: "/project-management/project-orders",
        description: "Client project engagements and orders",
        icon: "📜",
      },
      {
        title: "Setup & WBS",
        path: "/project-management/setup",
        description: "Project categories, types, and WBS templates",
        icon: "⚙️",
      },
    ],
  },
  {
    title: "Execution & Tasks",
    badge: "Operations",
    items: [
      {
        title: "Task Assignments",
        path: "/project-management/tasks",
        description: "Assign work items and milestones",
        icon: "📋",
      },
      {
        title: "Task Execution Dashboard",
        path: "/project-management/tasks/execution",
        description: "Work log, progress updates, and task timer",
        icon: "⏱️",
      },
      {
        title: "Timesheets",
        path: "/project-management/timesheets",
        description: "Log labor hours against project tasks",
        icon: "⌛",
      },
    ],
  },
  {
    title: "Materials & Procurement",
    badge: "Resources",
    items: [
      {
        title: "Purchase Requisitions",
        path: "/project-management/purchase-requisitions",
        description: "Request external items for project work",
        icon: "🛒",
      },
      {
        title: "Material Requisitions",
        path: "/project-management/material-requisitions",
        description: "Request stock from main warehouse",
        icon: "📦",
      },
      {
        title: "Material Receipts",
        path: "/project-management/material-receipts",
        description: "Receive requested items on site",
        icon: "📥",
      },
      {
        title: "Material Utilization",
        path: "/project-management/material-utilization",
        description: "Track site material consumption against tasks",
        icon: "🔨",
      },
    ],
  },
  {
    title: "Financials & Expenses",
    badge: "Costing",
    items: [
      {
        title: "Project Direct Expenses",
        path: "/project-management/expenses",
        description: "Record site petty cash and out-of-pocket costs",
        icon: "💸",
      },
      {
        title: "Project Billings & Income",
        path: "/project-management/income",
        description: "Project milestone billings and income tracking",
        icon: "💵",
      },
    ],
  },
  {
    title: "Reports & Analytics",
    badge: "BI",
    items: [
      {
        title: "Project Reports Hub",
        path: "/project-management/reports",
        description: "All project analytical and financial reports",
        icon: "📊",
      },
      {
        title: "Project Status Report",
        path: "/project-management/reports/project-status",
        description: "Schedule, budget vs actual variance analysis",
        icon: "📈",
      },
      {
        title: "Task Management Report",
        path: "/project-management/reports/task-management",
        description: "Task completion metrics and assignee workloads",
        icon: "📉",
      },
      {
        title: "Task Execution Log",
        path: "/project-management/reports/task-execution",
        description: "Detailed timesheet and daily work log summary",
        icon: "📝",
      },
      {
        title: "Project Income Report",
        path: "/project-management/reports/project-income",
        description: "Receipt vouchers linked to projects",
        icon: "💰",
      },
      {
        title: "Project Expense Report",
        path: "/project-management/reports/project-expense",
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
    },
    {
      rbac_key: "open-tasks",
      value: "—",
      label: "Open Tasks",
      change: "Loading…",
      changeType: "neutral",
      path: "/project-management/tasks",
    },
    {
      rbac_key: "total-budget",
      value: "—",
      label: "Total Project Budget",
      change: "Loading…",
      changeType: "neutral",
      path: "/project-management/reports",
    },
    {
      rbac_key: "total-hours",
      value: "—",
      label: "Total Logged Hours",
      change: "Loading…",
      changeType: "neutral",
      path: "/project-management/timesheets",
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
              value: `GHS ${Number(d.totalBudget || 0).toLocaleString()}`,
              change: `GHS ${Number(d.totalExpenses ?? 0).toLocaleString()} spent`,
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
      headerActions={[
        {
          label: "Dashboard",
          path: "/project-management/dashboard",
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
    <ModuleLayout sections={projectManagementSections} moduleKey="project-management">
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
      <Route path="/tasks/execution" element={<TaskExecution />} />
      <Route path="/tasks/new" element={<TaskForm />} />
      <Route path="/tasks/:id" element={<TaskForm />} />

      <Route path="/expenses" element={<ExpenseList />} />
      <Route path="/income" element={<ProjectIncomeList />} />

      <Route path="/reports" element={<ProjectReports />} />
      <Route path="/reports/task-execution" element={<TaskExecutionReportPage />} />
      <Route path="/reports/project-status" element={<ProjectStatusReport />} />
      <Route path="/reports/project-income" element={<ProjectIncomeReport />} />
      <Route path="/reports/project-expense" element={<ProjectExpenseReport />} />
      <Route path="/reports/task-management-and-execution" element={<TaskManagementAndExecutionPage />} />

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

      <Route path="/purchase-requisitions" element={<PMPurchaseRequisitionList />} />
      <Route path="/purchase-requisitions/new" element={<PMPurchaseRequisitionForm />} />
      <Route path="/purchase-requisitions/:id" element={<PMPurchaseRequisitionForm />} />
      </Routes>
    </ModuleLayout>
  );
}

export const projectManagementFeatures = [
  {
    module_key: "project-management",
    label: "Projects",
    path: "/project-management/projects",
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Task Assignment",
    path: "/project-management/tasks",
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Task Execution",
    path: "/project-management/tasks/execution",
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Expenses",
    path: "/project-management/expenses",
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Project Setup",
    path: "/project-management/setup",
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Material Requisition",
    path: "/project-management/material-requisitions",
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Material Utilization",
    path: "/project-management/material-utilizations",
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Materials Receipt",
    path: "/project-management/material-receipts",
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Project Orders",
    path: "/project-management/project-orders",
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Purchase Requisition",
    path: "/project-management/purchase-requisitions",
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Project Reports",
    path: "/project-management/reports",
    type: "dashboard",
  },
  {
    module_key: "project-management",
    label: "Project Status Report",
    path: "/project-management/reports/project-status",
    type: "dashboard",
  },
  {
    module_key: "project-management",
    label: "Project Income Report",
    path: "/project-management/reports/project-income",
    type: "feature",
  },
  {
    module_key: "project-management",
    label: "Project Expense Report",
    path: "/project-management/reports/project-expense",
    type: "feature",
  },
];
