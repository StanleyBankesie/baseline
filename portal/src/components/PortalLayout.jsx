import React from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { usePortalAuth } from "../context/PortalAuthContext.jsx";
import {
  Home,
  Clock,
  Calendar,
  DollarSign,
  Bell,
  Menu as MenuIcon,
  LogOut,
  User,
  Shield,
  FileText,
  BookOpen,
  Award,
  ChevronRight,
  Briefcase,
} from "lucide-react";
import logoClear from "../assets/resources/OMNISUITE_LOGO_CLEAR.png";

export default function PortalLayout() {
  const { employee, user, logout } = usePortalAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: "Home", path: "/portal", icon: Home },
    { label: "Time & Leave", path: "/portal/leave", icon: Calendar },
    { label: "Attendance", path: "/portal/attendance", icon: Clock },
    { label: "Payslips", path: "/portal/compensation", icon: DollarSign },
    { label: "Menu", path: "/portal/menu", icon: MenuIcon },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const isActive = (path) => {
    if (path === "/portal") return location.pathname === "/portal";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white pb-20 md:pb-6">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/portal" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-900 via-primary to-brand-700 border border-brand-600 flex items-center justify-center p-1.5 shadow-md shadow-brand-950/50">
                <img src={logoClear} alt="OmniSuite" className="w-full h-full object-contain brightness-0 invert" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-secondary block -mb-0.5">
                  OmniSuite ESS
                </span>
                <span className="text-sm font-semibold text-white tracking-tight">
                  Employee Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/portal/notifications"
              className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
            </Link>

            <Link
              to="/portal/profile"
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50 transition-colors"
            >
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-teal-800/40 border border-teal-500/30 flex items-center justify-center">
                {employee?.picture_url ? (
                  <img src={employee.picture_url} alt={employee.first_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-teal-300">
                    {(employee?.first_name?.[0] || user?.username?.[0] || "E").toUpperCase()}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-medium text-slate-200">
                {employee?.first_name || user?.username}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 md:hidden shadow-xl">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 ${
                  active
                    ? "text-teal-400 font-semibold scale-105"
                    : "text-slate-400 hover:text-slate-200 font-normal"
                }`}
              >
                <div className={`p-1 rounded-lg ${active ? "bg-teal-500/10 text-teal-400" : ""}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}