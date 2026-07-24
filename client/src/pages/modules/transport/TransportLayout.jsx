import React, { useEffect, useState } from "react";
import { Link, Route, Routes, Navigate } from "react-router-dom";
import api from "../../../api/client.js";
import { useAuth } from "../../../auth/AuthContext.jsx";
import { usePermission } from "../../../auth/PermissionContext.jsx";
import ModuleDashboard from "../../../components/ModuleDashboard.jsx";
import TransportDashboard from "./dashboard/TransportDashboard.jsx";
import TransportRequests from "./requests/TransportRequests.jsx";
import TransportRequestForm from "./requests/TransportRequestForm.jsx";
import VehiclesList from "./vehicles/VehiclesList.jsx";
import VehicleForm from "./vehicles/VehicleForm.jsx";
import TripsList from "./trips/TripsList.jsx";
import TripManagementPage from "./trips/TripManagementPage.jsx";
import TripReturnList from "./trips/TripReturnList.jsx";
import TripHistoryReport from "./reports/TripHistoryReport.jsx";
import TransportRevenueReport from "./reports/TransportRevenueReport.jsx";
import TripProfitabilityReport from "./reports/TripProfitabilityReport.jsx";
import FuelConsumptionReport from "./reports/FuelConsumptionReport.jsx";
import VehicleUtilizationReport from "./reports/VehicleUtilizationReport.jsx";
import DriverPerformanceReport from "./reports/DriverPerformanceReport.jsx";
import TripDelaysReport from "./reports/TripDelaysReport.jsx";
import TripForm from "./trips/TripForm.jsx";
import TripTrackingPage from "./trips/TripTrackingPage.jsx";
import TripTrackingList from "./trips/TripTrackingList.jsx";
import DriversList from "./drivers/DriversList.jsx";
import DriverForm from "./drivers/DriverForm.jsx";
import FuelLogsList from "./fuel/FuelLogsList.jsx";
import FuelLogForm from "./fuel/FuelLogForm.jsx";
import BillingList from "./billing/BillingList.jsx";
import BillingForm from "./billing/BillingForm.jsx";
import RoutesList from "./routes/RoutesList.jsx";
import RouteForm from "./routes/RouteForm.jsx";
import VehicleComplianceList from "./compliance/VehicleComplianceList.jsx";
import VehicleComplianceForm from "./compliance/VehicleComplianceForm.jsx";
import VehicleServicingList from "./servicing/VehicleServicingList.jsx";
import VehicleServicingForm from "./servicing/VehicleServicingForm.jsx";
import LogbookList from "./logbook/LogbookList.jsx";
import LogbookForm from "./logbook/LogbookForm.jsx";
import InspectionsList from "./inspections/InspectionsList.jsx";
import InspectionForm from "./inspections/InspectionForm.jsx";
import MaintenanceList from "./maintenance/MaintenanceList.jsx";
import MaintenanceForm from "./maintenance/MaintenanceForm.jsx";
import TransportSettings from "./settings/TransportSettings.jsx";
import TransportReports from "./reports/TransportReports.jsx";
import TransportIncomeList from "./income/TransportIncomeList.jsx";
import TransportExpenseList from "./expenses/TransportExpenseList.jsx";
import ExpenseLogList from "./expenses/ExpenseLogList.jsx";
import FuelExpenseList from "./fuel-expenses/FuelExpenseList.jsx";
import FuelBillsList from "./fuel-bills/FuelBillsList.jsx";
import FuelBillForm from "./fuel-bills/FuelBillForm.jsx";
import TransportationBillsList from "./transportation-bills/TransportationBillsList.jsx";
import TransportationBillForm from "./transportation-bills/TransportationBillForm.jsx";

const ActionButton = ({ label, path, type, featureKey, action }) => {
  const { canPerformAction } = usePermission();
  const hasPermission = canPerformAction(featureKey, action);

  if (!hasPermission) return null;

  const baseClasses =
    type === "primary" ? "btn btn-primary btn-sm" : "btn btn-outline btn-sm";

  return (
    <Link to={path} className={baseClasses}>
      {label}
    </Link>
  );
};

function TransportLanding() {
  const [stats, setStats] = useState(null);
  const [now, setNow] = useState(new Date());
  const { token } = useAuth();

  useEffect(() => {
    let cancelled = false;
    api.get("/transport/dashboard")
      .then((res) => {
        if (!cancelled && res.data?.success) {
          setStats(res.data.data);
        }
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (n) =>
    `GH₵${Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const dashboardStats = [
    {
      rbac_key: "active-trips",
      icon: "🚚",
      value: String(stats?.activeTrips || 0),
      label: "Active Trips",
      path: "/transport/trips",
    },
    {
      rbac_key: "total-vehicles",
      icon: "🚛",
      value: String(stats?.totalVehicles || 0),
      label: "Total Vehicles",
      path: "/transport/vehicles",
    },
    {
      rbac_key: "total-drivers",
      icon: "🧑‍✈️",
      value: String(stats?.totalDrivers || 0),
      label: "Total Drivers",
      path: "/transport/drivers",
    },
    {
      rbac_key: "total-fuel-cost",
      icon: "⛽",
      value: fmt(stats?.totalFuelCost || 0),
      label: "Total Fuel Cost",
      path: "/transport/fuel",
    },
  ];

  const sections = [
    {
      title: "Operations",
      items: [
        { 
          title: "Transport Requests", 
          path: "/transport/requests", 
          feature_key: "requests", 
          description: "Manage internal and external transport requests",
          icon: "📋",
          actions: [
            <ActionButton key="view" label="View" path="/transport/requests" type="outline" featureKey="transport:requests" action="view" />,
            <ActionButton key="new" label="New" path="/transport/requests/new" type="primary" featureKey="transport:requests" action="create" />
          ]
        },
        { 
          title: "Trips & Dispatch", 
          path: "/transport/trips", 
          feature_key: "trips", 
          description: "Dispatch vehicles and track live trips",
          icon: "🗺️",
          actions: [
            <ActionButton key="view" label="View" path="/transport/trips" type="outline" featureKey="transport:trips" action="view" />,
            <ActionButton key="new" label="New" path="/transport/trips/new" type="primary" featureKey="transport:trips" action="create" />
          ]
        },
        { 
          title: "Live Trip Management", 
          path: "/transport/trip-management", 
          feature_key: "trips", 
          description: "Monitor scheduled and active trips on a dashboard",
          icon: "🚀",
          actions: [
            <ActionButton key="view" label="Live Dashboard" path="/transport/trip-management" type="primary" featureKey="transport:trips" action="view" />
          ]
        },
        { 
          title: "Trip & Dispatch Returns", 
          path: "/transport/trip-returns", 
          feature_key: "trips", 
          description: "Confirm returning trips and log vehicle metrics",
          icon: "🔙",
          actions: [
            <ActionButton key="view" label="Manage Returns" path="/transport/trip-returns" type="primary" featureKey="transport:trips" action="view" />
          ]
        },

        { 
          title: "GPS Tracking", 
          path: "/transport/tracking", 
          feature_key: "tracking", 
          description: "Monitor live vehicle locations via GPS",
          icon: "📍",
          actions: [
            <ActionButton key="view" label="View Map" path="/transport/tracking" type="primary" featureKey="transport:trips" action="view" />
          ]
        },
        { 
          title: "Driver's Logbook", 
          path: "/transport/logbooks", 
          feature_key: "drivers", 
          description: "Track vehicle trips, mileages, fuel usage, and driver activities",
          icon: "📓",
          actions: [
            <ActionButton key="view" label="View" path="/transport/logbooks" type="outline" featureKey="transport:drivers" action="view" />,
            <ActionButton key="new" label="New" path="/transport/logbooks/new" type="primary" featureKey="transport:drivers" action="create" />
          ]
        },
        { 
          title: "Routes", 
          path: "/transport/routes", 
          feature_key: "routes", 
          description: "Manage standard transport routes and distances",
          icon: "🛣️",
          actions: [
            <ActionButton key="view" label="View" path="/transport/routes" type="outline" featureKey="transport:routes" action="view" />,
            <ActionButton key="new" label="New" path="/transport/routes/new" type="primary" featureKey="transport:routes" action="create" />
          ]
        },
      ],
    },
    {
      title: "Fleet Management",
      items: [
        { 
          title: "Vehicle Compliance", 
          path: "/transport/compliance", 
          feature_key: "vehicles", 
          description: "Manage vehicle insurance, roadworthy, and licenses",
          icon: "🛡️",
          actions: [
            <ActionButton key="view" label="View" path="/transport/compliance" type="outline" featureKey="transport:vehicles" action="view" />,
            <ActionButton key="new" label="New" path="/transport/compliance/new" type="primary" featureKey="transport:vehicles" action="create" />
          ]
        },
        { 
          title: "Vehicle Servicing", 
          path: "/transport/servicing", 
          feature_key: "vehicles", 
          description: "Manage vehicle servicing, maintenance, and history",
          icon: "🔧",
          actions: [
            <ActionButton key="view" label="View" path="/transport/servicing" type="outline" featureKey="transport:vehicles" action="view" />,
            <ActionButton key="new" label="New" path="/transport/servicing/new" type="primary" featureKey="transport:vehicles" action="create" />
          ]
        },
        { 
          title: "Inspections", 
          path: "/transport/inspections", 
          feature_key: "inspections", 
          description: "Record pre-trip and post-trip vehicle inspections",
          icon: "📋",
          actions: [
            <ActionButton key="view" label="View" path="/transport/inspections" type="outline" featureKey="transport:inspections" action="view" />,
            <ActionButton key="new" label="New" path="/transport/inspections/new" type="primary" featureKey="transport:inspections" action="create" />
          ]
        },
      ],
    },
    {
      title: "Costing & Billing",
      items: [
        { 
          title: "Refuelling", 
          path: "/transport/fuel", 
          feature_key: "fuel", 
          description: "Log all information of fuel purchased and refuelling events",
          icon: "⛽",
          actions: [
            <ActionButton key="view" label="View" path="/transport/fuel" type="outline" featureKey="transport:fuel" action="view" />,
            <ActionButton key="new" label="New" path="/transport/fuel/new" type="primary" featureKey="transport:fuel" action="create" />
          ]
        },
        { 
          title: "Transportation Bills", 
          path: "/transport/transportation-bills", 
          feature_key: "bills", 
          description: "Manage transportation bills and service supplier invoices",
          icon: "📑",
          actions: [
            <ActionButton key="view" label="View" path="/transport/transportation-bills" type="outline" featureKey="transport:bills" action="view" />,
            <ActionButton key="new" label="New" path="/transport/transportation-bills/new" type="primary" featureKey="transport:bills" action="create" />
          ]
        },
        { 
          title: "Billing", 
          path: "/transport/billing", 
          feature_key: "billing", 
          description: "Manage transport invoices and billing",
          icon: "🧾",
          actions: [
            <ActionButton key="view" label="View" path="/transport/billing" type="outline" featureKey="transport:billing" action="view" />
          ]
        },
        { 
          title: "Transportation Income", 
          path: "/transport/income", 
          feature_key: "income", 
          description: "Manage income records",
          icon: "💵",
          actions: [
            <ActionButton key="view" label="View" path="/transport/income" type="outline" featureKey="transport:income" action="view" />
          ]
        },
        { 
          title: "Transportation Expenses", 
          path: "/transport/expenses", 
          feature_key: "expenses", 
          description: "Manage expense records",
          icon: "💸",
          actions: [
            <ActionButton key="view" label="View" path="/transport/expenses" type="outline" featureKey="transport:expenses" action="view" />
          ]
        },
        { 
          title: "Expense Logs", 
          path: "/transport/expense-logs", 
          feature_key: "expense_log", 
          description: "Log general fleet expenses",
          icon: "🧾",
          actions: [
            <ActionButton key="view" label="View" path="/transport/expense-logs" type="outline" featureKey="transport:expense_log" action="view" />
          ]
        },
      ],
    },
    {
      title: "Reports & Analytics",
      items: [
        { 
          title: "Trip History & Tracking", 
          path: "/transport/reports/trip-history", 
          feature_key: "reports", 
          description: "Detailed history logs and tracking of fleet trips",
          icon: "📜",
          actions: [
            <ActionButton key="view" label="View Report" path="/transport/reports/trip-history" type="primary" featureKey="transport:reports" action="view" />
          ]
        },
        { 
          title: "Transport Revenue", 
          path: "/transport/reports/revenue", 
          feature_key: "reports", 
          description: "Revenue generated from transport operations",
          icon: "💰",
          actions: [
            <ActionButton key="view" label="View Report" path="/transport/reports/revenue" type="primary" featureKey="transport:reports" action="view" />
          ]
        },
        { 
          title: "Trip Profitability", 
          path: "/transport/reports/profitability", 
          feature_key: "reports", 
          description: "Profitability analysis for individual trips",
          icon: "📈",
          actions: [
            <ActionButton key="view" label="View Report" path="/transport/reports/profitability" type="primary" featureKey="transport:reports" action="view" />
          ]
        },
        { 
          title: "Fuel Consumption", 
          path: "/transport/reports/fuel", 
          feature_key: "reports", 
          description: "Fuel usage and efficiency across the fleet",
          icon: "⛽",
          actions: [
            <ActionButton key="view" label="View Report" path="/transport/reports/fuel" type="primary" featureKey="transport:reports" action="view" />
          ]
        },
        { 
          title: "Vehicle Utilization", 
          path: "/transport/reports/utilization", 
          feature_key: "reports", 
          description: "Usage rates and downtime of vehicles",
          icon: "🚛",
          actions: [
            <ActionButton key="view" label="View Report" path="/transport/reports/utilization" type="primary" featureKey="transport:reports" action="view" />
          ]
        },
        { 
          title: "Driver Performance", 
          path: "/transport/reports/driver-performance", 
          feature_key: "reports", 
          description: "Performance metrics for transport drivers",
          icon: "🧑‍✈️",
          actions: [
            <ActionButton key="view" label="View Report" path="/transport/reports/driver-performance" type="primary" featureKey="transport:reports" action="view" />
          ]
        },
        { 
          title: "Trip Delays & Issues", 
          path: "/transport/reports/delays", 
          feature_key: "reports", 
          description: "Analysis of delays and issues during trips",
          icon: "⚠️",
          actions: [
            <ActionButton key="view" label="View Report" path="/transport/reports/delays" type="primary" featureKey="transport:reports" action="view" />
          ]
        },
      ],
    },
    {
      title: "Configuration",
      items: [
        { 
          title: "Settings", 
          path: "/transport/settings", 
          feature_key: "settings", 
          description: "Configure pricing, types, and module behaviors",
          icon: "⚙️",
          actions: [
            <ActionButton key="view" label="Manage" path="/transport/settings" type="primary" featureKey="transport:settings" action="view" />
          ]
        },
      ],
    }
  ];

  return (
    <ModuleDashboard
      moduleKey="transport"
      title="Transport Management"
      stats={dashboardStats}
      sections={sections}
      now={now}
    />
  );
}

export default function TransportLayout() {
  return (
    <Routes>
      <Route path="/" element={<TransportLanding />} />
      <Route path="dashboard" element={<TransportDashboard />} />
      <Route path="requests" element={<TransportRequests />} />
      <Route path="requests/new" element={<TransportRequestForm />} />
      <Route path="requests/:id" element={<TransportRequestForm />} />
      <Route path="vehicles" element={<VehiclesList />} />
      <Route path="vehicles/new" element={<VehicleForm />} />
      <Route path="vehicles/:id" element={<VehicleForm />} />
      <Route path="compliance" element={<VehicleComplianceList />} />
      <Route path="compliance/new" element={<VehicleComplianceForm />} />
      <Route path="compliance/:id" element={<VehicleComplianceForm />} />
      <Route path="logbooks" element={<LogbookList />} />
      <Route path="logbooks/new" element={<LogbookForm />} />
      <Route path="logbooks/:id" element={<LogbookForm />} />
      <Route path="servicing" element={<VehicleServicingList />} />
      <Route path="servicing/new" element={<VehicleServicingForm />} />
      <Route path="servicing/:id" element={<VehicleServicingForm />} />
      <Route path="drivers" element={<DriversList />} />
      <Route path="drivers/new" element={<DriverForm />} />
      <Route path="drivers/:id" element={<DriverForm />} />
      <Route path="trips" element={<TripsList />} />
      <Route path="trip-management" element={<TripManagementPage />} />
      <Route path="trip-returns" element={<TripReturnList />} />
      <Route path="reports/trip-history" element={<TripHistoryReport />} />
      <Route path="reports/revenue" element={<TransportRevenueReport />} />
      <Route path="reports/profitability" element={<TripProfitabilityReport />} />
      <Route path="reports/fuel" element={<FuelConsumptionReport />} />
      <Route path="reports/utilization" element={<VehicleUtilizationReport />} />
      <Route path="reports/driver-performance" element={<DriverPerformanceReport />} />
      <Route path="reports/delays" element={<TripDelaysReport />} />
      <Route path="trips/new" element={<TripForm />} />
      <Route path="trips/:id" element={<TripForm />} />
      <Route path="tracking/:id" element={<TripTrackingPage />} />
      <Route path="tracking" element={<TripTrackingList />} />
      <Route path="fuel" element={<FuelLogsList />} />
      <Route path="fuel/new" element={<FuelLogForm />} />
      <Route path="fuel/:id" element={<FuelLogForm />} />
      <Route path="fuel-expenses" element={<FuelExpenseList />} />
      <Route path="fuel-bills" element={<FuelBillsList />} />
      <Route path="fuel-bills/new" element={<FuelBillForm />} />
      <Route path="fuel-bills/:id" element={<FuelBillForm />} />
      <Route path="transportation-bills" element={<TransportationBillsList />} />
      <Route path="transportation-bills/new" element={<TransportationBillForm />} />
      <Route path="transportation-bills/:id" element={<TransportationBillForm />} />
      <Route path="billing" element={<BillingList />} />
      <Route path="billing/new" element={<BillingForm />} />
      <Route path="billing/:id" element={<BillingForm />} />
      <Route path="routes" element={<RoutesList />} />
      <Route path="routes/new" element={<RouteForm />} />
      <Route path="routes/:id" element={<RouteForm />} />
      <Route path="inspections" element={<InspectionsList />} />
      <Route path="inspections/new" element={<InspectionForm />} />
      <Route path="inspections/:id" element={<InspectionForm />} />
      <Route path="maintenance" element={<MaintenanceList />} />
      <Route path="maintenance/new" element={<MaintenanceForm />} />
      <Route path="maintenance/:id" element={<MaintenanceForm />} />
      <Route path="settings" element={<TransportSettings />} />
      <Route path="reports" element={<TransportReports />} />
      <Route path="income" element={<TransportIncomeList />} />
      <Route path="expenses" element={<TransportExpenseList />} />
      <Route path="expense-logs" element={<ExpenseLogList />} />
    </Routes>
  );
}
