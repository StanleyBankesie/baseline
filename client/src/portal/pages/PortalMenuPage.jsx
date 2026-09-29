import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../context/PortalAuthContext.jsx";
import {
  User,
  Clock,
  Calendar,
  DollarSign,
  FileText,
  Shield,
  Award,
  Send,
  Lock,
  LogOut,
  ChevronRight,
  Sparkles,
  HelpCircle,
  Building,
} from "lucide-react";

export default function PortalMenuPage() {
  const { employee, user, logout } = usePortalAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/portal/login", { replace: true });
  };

  const sections = [
    {
      title: "My Employment",
      items: [
        { label: "My Profile & Personal Info", path: "/portal/profile", icon: User },
        { label: "Documents & HR Letters", path: "/portal/documents", icon: FileText },
        { label: "Training & Development", path: "/portal/training", icon: Award },
      ],
    },
    {
      title: "Time & Leave",
      items: [
        { label: "Attendance & Shifts", path: "/portal/attendance", icon: Clock },
        { label: "Leave Requests & Balances", path: "/portal/leave", icon: Calendar },
      ],
    },
    {
      title: "Compensation & Benefits",
      items: [
        { label: "Payslips & Salary Breakdown", path: "/portal/compensation?tab=payslips", icon: DollarSign },
        { label: "Allowances & Base Salary", path: "/portal/compensation?tab=salary", icon: DollarSign },
        { label: "Loans & Repayments", path: "/portal/compensation?tab=loans", icon: DollarSign },
      ],
    },
    {
      title: "Company & Helpdesk",
      items: [
        { label: "Company Policies & Handbook", path: "/portal/policies", icon: Shield },
        { label: "Employee Requests (Tickets)", path: "/portal/requests", icon: Send },
      ],
    },
    {
      title: "Account & Security",
      items: [
        { label: "Security & Notification Preferences", path: "/portal/security", icon: Lock },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {/* Profile Card Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-teal-800/40 border border-teal-500/30 flex items-center justify-center">
            {employee?.picture_url ? (
              <img src={employee.picture_url} alt={employee.first_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-base font-bold text-teal-300">
                {(employee?.first_name?.[0] || "E").toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">
              {employee?.first_name} {employee?.last_name}
            </h2>
            <p className="text-xs text-slate-400">
              {employee?.pos_name || "Employee"} · <span className="text-teal-400">{employee?.emp_code}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-colors cursor-pointer border border-rose-500/20"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Menu Categories */}
      <div className="space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{section.title}</h3>
            </div>
            <div className="divide-y divide-slate-800/60">
              {section.items.map((item, iIdx) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={iIdx}
                    to={item.path}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Logout Action */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Employee Portal</span>
        </button>
      </div>
    </div>
  );
}