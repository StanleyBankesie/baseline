import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Truck,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Fuel,
  DollarSign,
  Navigation,
  RefreshCw,
  PieChart,
  Activity,
  ArrowRight,
  ShieldAlert,
  CheckCircle2
} from "lucide-react";
import api from "../../../../api/client.js";
import TransportReports from "../reports/TransportReports.jsx";

export default function TransportDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/transport/reports/analytics");
      if (res.data?.success || res.data?.analytics) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Dashboard stats error:", err);
      setError(err?.response?.data?.message || "Failed to load transport dashboard analytics.");
    } fontally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const analytics = data?.analytics || {};
  const trips = data?.items || [];
  const urgentOrDelayedTrips = trips.filter(
    (t) => t.status === "DELAYED" || t.due_status === "OVERDUE"
  ).slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Transport & Logistics Intelligence
              </span>
              <span className="text-xs text-slate-400">Fleet Operations 2.0</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
              Transport Management Executive Dashboard
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1">
              Cross-section operational analytics: fleet readiness, trip execution velocity, driver throughput, fuel efficiency, and route financial margins.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh Data
            </button>
            <Link
              to="/transport/reports/trip-execution"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              Trip Analytics Report →
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 border-t border-slate-800/80 pt-3 flex gap-4">
          <button
            className={`py-1.5 px-4 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/50"
            }`}
            onClick={() => setActiveTab("overview")}
          >
            Executive Visual Dashboard
          </button>
          <button
            className={`py-1.5 px-4 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "reports"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-300 hover:text-white hover:bg-slate-800/50"
            }`}
            onClick={() => setActiveTab("reports")}
          >
            Reports & Intelligence Hub
          </button>
        </div>
      </div>

      {activeTab === "reports" ? (
        <TransportReports isTab={true} />
      ) : (
        <div className="space-y-8">
          {/* 1. Primary Fleet & Trip Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Managed Trips & In-Transit */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Trips Managed
                </span>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Truck size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {loading ? "..." : analytics.totalTrips || 0}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs">
                <span className="px-2 py-0.5 rounded-full font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  {analytics.inTransitTrips || 0} In-Transit
                </span>
                <span className="text-slate-400">
                  ({analytics.completedTrips || 0} done)
                </span>
              </div>
            </div>

            {/* Completion Rate & On-Time Performance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Execution Completion
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {loading ? "..." : `${analytics.completionRate || 0}%`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {analytics.onTimeRate || 0}% on-time arrival rate
              </p>
            </div>

            {/* Fleet Vehicles & Readiness */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Fleet Readiness Rate
                </span>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                  <Activity size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {loading ? "..." : `${analytics.fleetUtilizationRate || 0}%`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {analytics.availableVehicles || 0} ready / {analytics.totalFleet || 0} fleet size
              </p>
            </div>

            {/* Net Financial Margin */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Net Route Profitability
                </span>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                  <DollarSign size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
                {loading ? "..." : `GHS ${(analytics.netProfitability || 0).toLocaleString()}`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                GHS {(analytics.totalRevenue || 0).toLocaleString()} billed revenue
              </p>
            </div>
          </div>

          {/* 2. Visualizations Grid across ALL Transport Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section A: Trip Management & Execution Velocity Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 uppercase">
                    Section 1: Trips
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    Trip Execution & Dispatch Velocity
                  </h3>
                </div>
                <Link
                  to="/transport/trips"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Trip List →
                </Link>
              </div>

              {/* Progress Distribution Bar */}
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <span>Execution Status Distribution</span>
                  <span>{analytics.totalTrips || 0} Total</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
                  <div
                    title="Completed"
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{
                      width: `${analytics.totalTrips ? (analytics.completedTrips / analytics.totalTrips) * 100 : 0}%`
                    }}
                  />
                  <div
                    title="In Transit"
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{
                      width: `${analytics.totalTrips ? (analytics.inTransitTrips / analytics.totalTrips) * 100 : 0}%`
                    }}
                  />
                  <div
                    title="Scheduled"
                    className="bg-purple-500 h-full transition-all duration-500"
                    style={{
                      width: `${analytics.totalTrips ? (analytics.scheduledTrips / analytics.totalTrips) * 100 : 0}%`
                    }}
                  />
                  <div
                    title="Delayed"
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{
                      width: `${analytics.totalTrips ? (analytics.delayedTrips / analytics.totalTrips) * 100 : 0}%`
                    }}
                  />
                  <div
                    title="Cancelled"
                    className="bg-slate-400 h-full transition-all duration-500"
                    style={{
                      width: `${analytics.totalTrips ? (analytics.cancelledTrips / analytics.totalTrips) * 100 : 0}%`
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-3 mt-3 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Completed ({analytics.completedTrips || 0})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    In Transit ({analytics.inTransitTrips || 0})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                    Scheduled ({analytics.scheduledTrips || 0})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                    Delayed ({analytics.delayedTrips || 0})
                  </span>
                </div>
              </div>

              {/* Urgent or Delayed Trips Ticker */}
              {urgentOrDelayedTrips.length > 0 ? (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-rose-500" />
                    SLA Schedule Delays & Alerts
                  </h4>
                  <div className="space-y-2">
                    {urgentOrDelayedTrips.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {t.trip_number}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 ml-2">
                            ({t.vehicle_name})
                          </span>
                        </div>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          ⚠️ {t.due_label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Section B: Fleet & Vehicle Status Matrix */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase">
                    Section 2: Vehicles
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    Fleet Status & Capacity Utilization
                  </h3>
                </div>
                <Link
                  to="/transport/vehicles"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Manage Fleet →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                    Available Yard
                  </span>
                  <p className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-300 mt-1">
                    {analytics.availableVehicles || 0}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">
                    In Transit
                  </span>
                  <p className="text-2xl font-extrabold text-blue-800 dark:text-blue-300 mt-1">
                    {analytics.inTransitVehicles || 0}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">
                    Maintenance
                  </span>
                  <p className="text-2xl font-extrabold text-amber-800 dark:text-amber-300 mt-1">
                    {analytics.maintenanceVehicles || 0}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase">
                    Out of Service
                  </span>
                  <p className="text-2xl font-extrabold text-rose-800 dark:text-rose-300 mt-1">
                    {analytics.outOfServiceVehicles || 0}
                  </p>
                </div>
              </div>

              {/* Fleet Utilization Progress Bar */}
              <div className="pt-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Fleet Operational Availability</span>
                  <span>{analytics.fleetUtilizationRate || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{ width: `${Math.min(100, analytics.fleetUtilizationRate || 0)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Section C: Drivers & Operator Workload */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 uppercase">
                    Section 3: Drivers
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    Driver Workload & Status Matrix
                  </h3>
                </div>
                <Link
                  to="/transport/drivers"
                  className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Driver List →
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block">Total</span>
                  <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 block">
                    {analytics.totalDrivers || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-center">
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 block">
                    Available
                  </span>
                  <span className="text-xl font-extrabold text-emerald-800 dark:text-emerald-300 mt-1 block">
                    {analytics.availableDrivers || 0}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-center">
                  <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 block">
                    On Trip
                  </span>
                  <span className="text-xl font-extrabold text-blue-800 dark:text-blue-300 mt-1 block">
                    {analytics.onTripDrivers || 0}
                  </span>
                </div>
              </div>

              {/* Top Driver Leaders */}
              <div className="space-y-2 max-h-44 overflow-y-auto">
                {(analytics.driverPerformance || []).slice(0, 3).map((d, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-slate-800 dark:text-slate-200">{d.name}</span>
                    <span className="text-slate-500">
                      {d.completed} trips ({d.distance.toLocaleString()} km)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section D: Fuel & Financial Performance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 uppercase">
                    Section 4 & 5: Fuel & Economics
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    Fuel Consumption & Financial Margins
                  </h3>
                </div>
                <Link
                  to="/transport/fuel"
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Fuel Logs →
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">
                    Fuel Expense
                  </span>
                  <p className="text-xl font-extrabold text-amber-800 dark:text-amber-300 mt-1">
                    GHS {(analytics.totalFuelCost || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {(analytics.totalFuelLiters || 0).toLocaleString()} Liters
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase">
                    Billed Revenue
                  </span>
                  <p className="text-xl font-extrabold text-purple-800 dark:text-purple-300 mt-1">
                    GHS {(analytics.totalRevenue || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Net: GHS {(analytics.netProfitability || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Fuel Efficiency:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {analytics.fuelKmPerLiter || 0} km / Liter
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
