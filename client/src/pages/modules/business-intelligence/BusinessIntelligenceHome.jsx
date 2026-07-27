/**
 * @fileoverview BusinessIntelligenceHome - Full BI Module Router with top tab navigation.
 * Uses app standard font sizes (text-sm) to match other modules.
 */
import React, { lazy, Suspense, useState, useEffect, useRef } from "react";
import { Routes, Route, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, Package, ShoppingCart, Users, Wrench,
  Factory, FolderKanban, Truck, HeadphonesIcon, Zap, Shield,
  Layers, Target, PieChart, FileText, Database, Brain, Bell,
  Settings, ChevronDown, ArrowLeft
} from "lucide-react";

import { usePermission } from "../../../auth/PermissionContext.jsx";

// Eager
import ExecutiveDashboard from "./ExecutiveDashboard.jsx";
// Lazy pages
const FinancialAnalytics    = lazy(() => import("./FinancialAnalytics.jsx"));
const InventoryAnalytics    = lazy(() => import("./InventoryAnalytics.jsx"));
const PurchaseAnalytics     = lazy(() => import("./PurchaseAnalytics.jsx"));
const HRAnalytics           = lazy(() => import("./HRAnalytics.jsx"));
const MaintenanceAnalytics  = lazy(() => import("./MaintenanceAnalytics.jsx"));
const ProductionAnalytics   = lazy(() => import("./ProductionAnalytics.jsx"));
const ProjectAnalytics      = lazy(() => import("./ProjectAnalytics.jsx"));
const TransportAnalytics    = lazy(() => import("./TransportAnalytics.jsx"));
const ServiceAnalytics      = lazy(() => import("./ServiceAnalytics.jsx"));
const POSAnalytics          = lazy(() => import("./POSAnalytics.jsx"));
const AdminAnalytics        = lazy(() => import("./AdminAnalytics.jsx"));
const CrossModuleAnalytics  = lazy(() => import("./CrossModuleAnalytics.jsx"));
const KPICenter             = lazy(() => import("./KPICenter.jsx"));
const DashboardList         = lazy(() => import("./dashboards/DashboardList.jsx"));
const ReportCenter          = lazy(() => import("./ReportCenter.jsx"));
const DataExplorer          = lazy(() => import("./DataExplorer.jsx"));
const AIInsights            = lazy(() => import("./AIInsights.jsx"));
const AlertsCenter          = lazy(() => import("./AlertsCenter.jsx"));
const BISettings            = lazy(() => import("./BISettings.jsx"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-48">
      <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-600 border-t-transparent" />
    </div>
  );
}

// ─── Navigation config ─────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Executive Dashboard",
    single: true,
    path: "/business-intelligence/executive-dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Domain Analytics",
    items: [
      { label: "Financial Analytics",     path: "/business-intelligence/financial",       icon: TrendingUp, moduleKey: "finance" },
      { label: "Inventory Analytics",     path: "/business-intelligence/inventory",       icon: Package, moduleKey: "inventory" },
      { label: "Purchase Analytics",      path: "/business-intelligence/purchase",        icon: ShoppingCart, moduleKey: "purchase" },
      { label: "HR Analytics",            path: "/business-intelligence/hr",              icon: Users, moduleKey: "hr" },
      { label: "Maintenance Analytics",   path: "/business-intelligence/maintenance",     icon: Wrench, moduleKey: "maintenance" },
      { label: "Production Analytics",    path: "/business-intelligence/production",      icon: Factory, moduleKey: "production" },
      { label: "Project Analytics",       path: "/business-intelligence/projects",        icon: FolderKanban, moduleKey: "pm" },
      { label: "Transport Analytics",     path: "/business-intelligence/transport",       icon: Truck, moduleKey: "transport" },
      { label: "Service Analytics",       path: "/business-intelligence/service",         icon: HeadphonesIcon, moduleKey: "service" },
      { label: "POS Analytics",           path: "/business-intelligence/pos",             icon: Zap, moduleKey: "pos" },
      { label: "Administration Analytics",path: "/business-intelligence/administration",  icon: Shield, moduleKey: "admin" },
      { label: "Cross Module Analytics",  path: "/business-intelligence/cross-module",    icon: Layers },
    ],
  },
  {
    label: "BI Tools",
    items: [
      { label: "KPI Center",     path: "/business-intelligence/kpi-center",    icon: Target },
      { label: "Dashboards",     path: "/business-intelligence/dashboards",    icon: PieChart },
      { label: "Report Center",  path: "/business-intelligence/report-center", icon: FileText },
      { label: "Data Explorer",  path: "/business-intelligence/data-explorer", icon: Database },
      { label: "AI Insights",    path: "/business-intelligence/ai-insights",   icon: Brain },
      { label: "Alerts Center",  path: "/business-intelligence/alerts",        icon: Bell },
      { label: "Settings",       path: "/business-intelligence/settings",      icon: Settings },
    ],
  },
];

// ─── Dropdown button component (fixes overflow clipping) ───
function NavDropdown({ group, location, navigate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isGroupActive = group.items?.some(i => location.pathname === i.path);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
          isGroupActive
            ? "bg-brand-900 text-white"
            : "text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300"
        }`}
      >
        {group.label}
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-erp-lg overflow-hidden"
          style={{ minWidth: 220 }}
        >
          <div className="p-1.5 grid grid-cols-1 gap-0.5 max-h-80 overflow-y-auto">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setOpen(false); }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                    isActive
                      ? "bg-brand-900 text-white"
                      : "text-slate-700 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300"
                  }`}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Filtered Nav Groups Hook ────────────────────────────
function useFilteredNavGroups() {
  const { canViewModule } = usePermission();
  return NAV_GROUPS.map(g => {
    if (!g.items) return g;
    return {
      ...g,
      items: g.items.filter(i => !i.moduleKey || canViewModule(i.moduleKey))
    };
  }).filter(g => g.single || (g.items && g.items.length > 0));
}

// ─── Top Navigation Bar ──────────────────────────────────
function BINavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const filteredGroups = useFilteredNavGroups();

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
      <div className="flex items-center gap-1 px-4 py-2">
        {/* Back to Modules */}
        <NavLink
          to="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-brand-700 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={14} />
          Modules
        </NavLink>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1.5 flex-shrink-0" />

        {/* Executive Dashboard — direct link */}
        <NavLink
          to="/business-intelligence/executive-dashboard"
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              isActive
                ? "bg-brand-900 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300"
            }`
          }
        >
          <LayoutDashboard size={14} />
          Executive Dashboard
        </NavLink>

        {/* Domain Analytics & BI Tools dropdowns */}
        {filteredGroups.filter(g => !g.single).map(group => (
          <NavDropdown
            key={group.label}
            group={group}
            location={location}
            navigate={navigate}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Hub landing page ─────────────────────────────────
function BIHub() {
  const navigate = useNavigate();
  const filteredGroups = useFilteredNavGroups();
  const allGroups = [
    {
      label: "Domain Analytics",
      items: filteredGroups.find(g => g.label === "Domain Analytics")?.items || [],
    },
    {
      label: "BI Tools",
      items: filteredGroups.find(g => g.label === "BI Tools")?.items || [],
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Brain size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Business Intelligence Hub</h1>
            <p className="text-brand-200 text-sm">Enterprise analytics & decision-support platform</p>
          </div>
        </div>
        <p className="text-brand-200 text-sm mt-3 max-w-2xl">
          Centralized analytics consolidating data from all ERP modules into real-time dashboards,
          KPIs, reports, charts, alerts, and AI-driven insights.
        </p>
      </div>

      {/* Quick access — Executive Dashboard */}
      <div>
        <button
          onClick={() => navigate("/business-intelligence/executive-dashboard")}
          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-brand-400 hover:shadow-erp transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center group-hover:bg-brand-100 dark:group-hover:bg-brand-900/60 transition-colors">
            <LayoutDashboard size={18} className="text-brand-600 dark:text-brand-400" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Executive Dashboard</div>
            <div className="text-xs text-slate-400">Cross-module KPI overview</div>
          </div>
        </button>
      </div>

      {/* Section cards */}
      {allGroups.map((group) => (
        <div key={group.label}>
          <h2 className="text-xs font-bold text-brand-800 dark:text-brand-300 uppercase tracking-widest mb-3">{group.label}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-start gap-2 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-brand-400 hover:shadow-erp transition-all text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center group-hover:bg-brand-100 dark:group-hover:bg-brand-900/60 transition-colors">
                    <Icon size={18} className="text-brand-600 dark:text-brand-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────
export default function BusinessIntelligenceHome() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <BINavBar />
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 min-w-0">
        <Suspense fallback={<div className="p-6"><PageLoader /></div>}>
          <Routes>
            <Route path="/"                     element={<BIHub />} />
            <Route path="/executive-dashboard"  element={<div className="p-6"><ExecutiveDashboard /></div>} />
            <Route path="/financial"            element={<div className="p-6"><FinancialAnalytics /></div>} />
            <Route path="/inventory"            element={<div className="p-6"><InventoryAnalytics /></div>} />
            <Route path="/purchase"             element={<div className="p-6"><PurchaseAnalytics /></div>} />
            <Route path="/hr"                   element={<div className="p-6"><HRAnalytics /></div>} />
            <Route path="/maintenance"          element={<div className="p-6"><MaintenanceAnalytics /></div>} />
            <Route path="/production"           element={<div className="p-6"><ProductionAnalytics /></div>} />
            <Route path="/projects"             element={<div className="p-6"><ProjectAnalytics /></div>} />
            <Route path="/transport"            element={<div className="p-6"><TransportAnalytics /></div>} />
            <Route path="/service"              element={<div className="p-6"><ServiceAnalytics /></div>} />
            <Route path="/pos"                  element={<div className="p-6"><POSAnalytics /></div>} />
            <Route path="/administration"       element={<div className="p-6"><AdminAnalytics /></div>} />
            <Route path="/cross-module"         element={<div className="p-6"><CrossModuleAnalytics /></div>} />
            <Route path="/kpi-center"           element={<div className="p-6"><KPICenter /></div>} />
            <Route path="/dashboards"           element={<div className="p-6"><DashboardList /></div>} />
            <Route path="/report-center"        element={<div className="p-6"><ReportCenter /></div>} />
            <Route path="/data-explorer"        element={<div className="p-6"><DataExplorer /></div>} />
            <Route path="/ai-insights"          element={<div className="p-6"><AIInsights /></div>} />
            <Route path="/alerts"               element={<div className="p-6"><AlertsCenter /></div>} />
            <Route path="/settings"             element={<div className="p-6"><BISettings /></div>} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
