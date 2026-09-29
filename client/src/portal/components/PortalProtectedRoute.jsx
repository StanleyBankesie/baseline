import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "../context/PortalAuthContext.jsx";

export default function PortalProtectedRoute({ children }) {
  const { token, user, employee, requiresPasswordChange, loading } = usePortalAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Loading Employee Portal...</p>
      </div>
    );
  }

  if (!token || !user || !employee) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  // Intercept users who must change their initial password before accessing portal dashboard
  if (requiresPasswordChange && location.pathname !== "/portal/first-login-change-password") {
    return <Navigate to="/portal/first-login-change-password" replace />;
  }

  return children;
}