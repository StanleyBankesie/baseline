import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PortalAuthProvider } from "./context/PortalAuthContext.jsx";
import PortalProtectedRoute from "./components/PortalProtectedRoute.jsx";
import PortalLayout from "./components/PortalLayout.jsx";
import PortalLoginPage from "./pages/PortalLoginPage.jsx";
import PortalFirstLoginChangePassword from "./pages/PortalFirstLoginChangePassword.jsx";
import PortalForgotPassword from "./pages/PortalForgotPassword.jsx";
import PortalDashboard from "./pages/PortalDashboard.jsx";
import PortalProfilePage from "./pages/PortalProfilePage.jsx";
import PortalAttendancePage from "./pages/PortalAttendancePage.jsx";
import PortalLeavePage from "./pages/PortalLeavePage.jsx";
import PortalCompensationPage from "./pages/PortalCompensationPage.jsx";
import PortalDocumentsPage from "./pages/PortalDocumentsPage.jsx";
import PortalPoliciesPage from "./pages/PortalPoliciesPage.jsx";
import PortalTrainingPage from "./pages/PortalTrainingPage.jsx";
import PortalRequestsPage from "./pages/PortalRequestsPage.jsx";
import PortalNotificationsPage from "./pages/PortalNotificationsPage.jsx";
import PortalMenuPage from "./pages/PortalMenuPage.jsx";
import PortalSecurityPage from "./pages/PortalSecurityPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <PortalAuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/portal/login" element={<PortalLoginPage />} />
          <Route path="/login" element={<Navigate to="/portal/login" replace />} />
          <Route path="/portal/forgot-password" element={<PortalForgotPassword />} />
          <Route path="/forgot-password" element={<Navigate to="/portal/forgot-password" replace />} />

          {/* First Login Mandatory Change Password */}
          <Route
            path="/portal/change-password"
            element={
              <PortalProtectedRoute>
                <PortalFirstLoginChangePassword />
              </PortalProtectedRoute>
            }
          />
          <Route path="/change-password" element={<Navigate to="/portal/change-password" replace />} />

          {/* Protected ESS Portal Shell */}
          <Route
            path="/portal"
            element={
              <PortalProtectedRoute>
                <PortalLayout />
              </PortalProtectedRoute>
            }
          >
            <Route index element={<PortalDashboard />} />
            <Route path="profile" element={<PortalProfilePage />} />
            <Route path="attendance" element={<PortalAttendancePage />} />
            <Route path="leave" element={<PortalLeavePage />} />
            <Route path="compensation" element={<PortalCompensationPage />} />
            <Route path="documents" element={<PortalDocumentsPage />} />
            <Route path="policies" element={<PortalPoliciesPage />} />
            <Route path="training" element={<PortalTrainingPage />} />
            <Route path="requests" element={<PortalRequestsPage />} />
            <Route path="notifications" element={<PortalNotificationsPage />} />
            <Route path="menu" element={<PortalMenuPage />} />
            <Route path="security" element={<PortalSecurityPage />} />
          </Route>

          {/* Root Fallback */}
          <Route path="/" element={<Navigate to="/portal" replace />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </PortalAuthProvider>
    </BrowserRouter>
  );
}
