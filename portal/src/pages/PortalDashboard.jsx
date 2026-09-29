import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../context/PortalAuthContext.jsx";
import portalApi from "../api/portalClient.js";
import {
  Calendar,
  Clock,
  DollarSign,
  Briefcase,
  FileText,
  Shield,
  Award,
  ChevronRight,
  TrendingUp,
  Sun,
  Cloud,
  CloudRain,
  Wind,
  Droplets,
  Bell,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

export default function PortalDashboard() {
  const { employee, user } = usePortalAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState(null);
  const [trendFilter, setTrendFilter] = useState("this_month");
  const [weather, setWeather] = useState(null);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [showSalary, setShowSalary] = useState(false);
  const [activeEventIndex, setActiveEventIndex] = useState(0);

  const fetchDashboardData = async () => {
    try {
      const [ovRes, trRes] = await Promise.all([
        portalApi.get("/dashboard/overview"),
        portalApi.get(`/attendance/trends?filter=${trendFilter}`),
      ]);
      setOverview(ovRes.data);
      setTrends(trRes.data?.records || []);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [trendFilter]);

  // Load secondary widgets asynchronously so main dashboard is immediate
  useEffect(() => {
    portalApi.get("/widgets/weather").then((res) => setWeather(res.data)).catch(() => {});
    portalApi.get("/widgets/news").then((res) => setNews(res.data?.articles || [])).catch(() => {});
  }, []);

  const handleClockIn = async () => {
    setClockLoading(true);
    try {
      await portalApi.post("/attendance/clock-in", { remarks: "Self-Service Clock In" });
      await fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || "Clock-in failed.");
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    setClockLoading(true);
    try {
      await portalApi.post("/attendance/clock-out", { remarks: "Self-Service Clock Out" });
      await fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || "Clock-out failed.");
    } finally {
      setClockLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading && !overview) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-slate-900 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="h-20 bg-slate-900 rounded-xl" />
          <div className="h-20 bg-slate-900 rounded-xl" />
          <div className="h-20 bg-slate-900 rounded-xl" />
          <div className="h-20 bg-slate-900 rounded-xl" />
        </div>
        <div className="h-48 bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  const emp = overview?.employee || employee;
  const today = overview?.todayAttendance;
  const leave = overview?.leaveSummary;
  const attMonthly = overview?.attendanceMonthly;
  const payslip = overview?.latestPayslip;
  const holidays = overview?.holidays || [];
  const announcements = overview?.announcements || [];

  return (
    <div className="space-y-5">
      {/* 1. Header Command Center */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-teal-800/40 border-2 border-teal-500/40 flex items-center justify-center shadow-md">
              {emp?.picture_url ? (
                <img src={emp.picture_url} alt={emp.first_name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-teal-300">
                  {(emp?.first_name?.[0] || user?.username?.[0] || "E").toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-teal-400 tracking-wide uppercase">
                {getGreeting()},
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {emp?.first_name} {emp?.last_name}
              </h2>
              <p className="text-xs text-slate-400">
                {emp?.pos_name || "Staff"} · <span className="text-slate-300">{emp?.dept_name || "General"}</span>
              </p>
            </div>
          </div>

          {/* Quick Weather Capsule */}
          {weather && (
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5 text-right">
              <Sun className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <span className="text-xs font-bold text-white block">{weather.temperature}°C</span>
                <span className="text-[10px] text-slate-400 block">{weather.condition}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Quick Actions */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
          Quick Actions
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          <Link
            to="/portal/leave"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-teal-500/30 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-200 text-center">Apply Leave</span>
          </Link>

          <Link
            to="/portal/attendance"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-teal-500/30 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-200 text-center">Attendance</span>
          </Link>

          <Link
            to="/portal/compensation"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-teal-500/30 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-200 text-center">View Payslip</span>
          </Link>

          <Link
            to="/portal/compensation?tab=loans"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-teal-500/30 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-200 text-center">Loans</span>
          </Link>

          <Link
            to="/portal/policies"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-teal-500/30 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-200 text-center">Policies</span>
          </Link>

          <Link
            to="/portal/profile"
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-teal-500/30 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium text-slate-200 text-center">My Profile</span>
          </Link>
        </div>
      </div>

      {/* 3. Today's Attendance & Clock Action Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Today's Attendance</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 rounded-xl p-3 border border-slate-800/60 mb-4">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Clock In</span>
            <span className="text-sm font-bold text-white">{today?.clock_in || "--:--"}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Clock Out</span>
            <span className="text-sm font-bold text-white">{today?.clock_out || "--:--"}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status</span>
            <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
              today?.status === "PRESENT" ? "bg-emerald-500/20 text-emerald-400" :
              today?.status === "LATE" ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400"
            }`}>
              {today?.status || "NOT LOGGED"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Hours</span>
            <span className="text-sm font-bold text-white">{today?.total_hours ? `${today.total_hours} hrs` : "--"}</span>
          </div>
        </div>

        <div className="flex gap-2.5">
          {!today?.clock_in ? (
            <button
              onClick={handleClockIn}
              disabled={clockLoading}
              className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Clock In Now</span>
            </button>
          ) : !today?.clock_out ? (
            <button
              onClick={handleClockOut}
              disabled={clockLoading}
              className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              <span>Clock Out Now</span>
            </button>
          ) : (
            <div className="w-full text-center py-2 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-400">
              ✓ Completed today's work shift ({today.total_hours} hrs)
            </div>
          )}
        </div>
      </div>

      {/* 4. Leave & Attendance Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Leave Balance Widget */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-semibold text-white">Annual Leave Summary</h3>
              </div>
              <Link to="/portal/leave" className="text-xs text-teal-400 hover:underline">
                Details →
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center my-3">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Entitled</span>
                <span className="text-lg font-bold text-white">{leave?.entitled ?? 24}</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Taken</span>
                <span className="text-lg font-bold text-amber-400">{leave?.taken ?? 0}</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-teal-500/20">
                <span className="text-[10px] text-teal-400 uppercase font-semibold block">Available</span>
                <span className="text-lg font-bold text-teal-300">{leave?.available ?? 24}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Pending Requests: <strong className="text-white">{leave?.pending ?? 0}</strong></span>
            <Link to="/portal/leave" className="text-teal-400 font-medium">Apply</Link>
          </div>
        </div>

        {/* Monthly Attendance Widget */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">This Month Attendance</h3>
              </div>
              <Link to="/portal/attendance" className="text-xs text-teal-400 hover:underline">
                History →
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center my-3">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Present</span>
                <span className="text-lg font-bold text-emerald-400">{attMonthly?.present ?? 0}</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Late</span>
                <span className="text-lg font-bold text-amber-400">{attMonthly?.late ?? 0}</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Rate</span>
                <span className="text-lg font-bold text-cyan-300">{attMonthly?.rate ?? 100}%</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Absent: <strong className="text-rose-400">{attMonthly?.absent ?? 0}</strong></span>
            <span className="text-emerald-400 font-medium">{attMonthly?.rate ?? 100}% Punctual</span>
          </div>
        </div>
      </div>

      {/* 5. Real Attendance Trend Graph */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Attendance Trend</h3>
          </div>

          {/* Range Filter Buttons */}
          <div className="flex items-center bg-slate-950 rounded-xl p-1 border border-slate-800 self-start">
            {[
              { label: "This Month", key: "this_month" },
              { label: "3 Months", key: "3_months" },
              { label: "6 Months", key: "6_months" },
              { label: "Year", key: "year" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setTrendFilter(f.key)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all cursor-pointer ${
                  trendFilter === f.key
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* CSS/SVG Rendered Trend Visualization */}
        {trends && trends.length > 0 ? (
          <div className="space-y-3 pt-2">
            <div className="flex items-end gap-2 h-36 pt-4 px-2 border-b border-slate-800">
              {trends.map((item, idx) => {
                const heightPct = Math.min(100, Math.max(15, Number(item.percentage || 100)));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-950 border border-slate-700 text-white text-[10px] px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap z-20">
                      {item.label}: {item.present} present ({item.percentage}%)
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-teal-700 to-cyan-500 rounded-t-md hover:brightness-125 transition-all"
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 px-1">
              <span>{trends[0]?.label}</span>
              <span>{trends[Math.floor(trends.length / 2)]?.label}</span>
              <span>{trends[trends.length - 1]?.label}</span>
            </div>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-slate-500 bg-slate-950/40 rounded-xl">
            No attendance records in selected period
          </div>
        )}
      </div>

      {/* 6. Compensation & Latest Payslip Card */}
      {payslip && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/50 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Latest Payslip ({payslip.period_name || "Recent"})</h3>
            </div>
            <button
              onClick={() => setShowSalary(!showSalary)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {showSalary ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showSalary ? "Hide" : "Show"}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/60">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Net Pay</span>
              <span className="text-base font-bold text-emerald-400">
                {showSalary ? `GHS ${Number(payslip.net_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "••••••••"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Gross Pay</span>
              <span className="text-sm font-semibold text-slate-200">
                {showSalary ? `GHS ${Number(payslip.gross_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "••••••••"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Deductions</span>
              <span className="text-sm font-semibold text-rose-400">
                {showSalary ? `GHS ${Number(payslip.total_deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "••••••••"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Allowances</span>
              <span className="text-sm font-semibold text-teal-300">
                {showSalary ? `GHS ${Number(payslip.total_allowances || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "••••••••"}
              </span>
            </div>
          </div>

          <div className="mt-3 text-right">
            <Link
              to={`/portal/compensation`}
              className="inline-flex items-center gap-1 text-xs text-teal-400 font-medium hover:underline"
            >
              View Full Breakdown & PDF <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 7. Upcoming Holidays & Events Carousel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Holidays */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Upcoming Public Holidays</h3>
          </div>
          <div className="space-y-2">
            {holidays.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div>
                  <h4 className="text-xs font-semibold text-white">{h.name}</h4>
                  <p className="text-[10px] text-slate-400">{h.description}</p>
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  {h.date}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Company Announcements Carousel */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Company Announcements</h3>
              </div>
              <span className="text-[10px] text-purple-400 font-semibold bg-purple-500/10 px-2 py-0.5 rounded">
                Live
              </span>
            </div>

            {announcements.length > 0 ? (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs text-slate-300">
                {announcements[activeEventIndex] || announcements[0]}
              </div>
            ) : (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs text-slate-400 text-center">
                No active announcements for today
              </div>
            )}
          </div>

          {announcements.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {announcements.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveEventIndex(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    activeEventIndex === i ? "bg-purple-400 w-4" : "bg-slate-700"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 8. Latest News Feed */}
      {news.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Organization & Industry News</h3>
            <span className="text-xs text-slate-400">Updates</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {news.map((item) => (
              <div key={item.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider block mb-1">
                    {item.category || item.source}
                  </span>
                  <h4 className="text-xs font-bold text-white line-clamp-2 mb-1.5">{item.headline}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{item.snippet}</p>
                </div>
                <span className="text-[10px] text-slate-500 mt-2 block">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}