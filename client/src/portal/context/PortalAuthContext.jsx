import React, { createContext, useContext, useState, useEffect } from "react";
import portalApi from "../api/portalClient.js";

const PortalAuthContext = createContext(null);

export function PortalAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("portal_token"));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("portal_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [employee, setEmployee] = useState(() => {
    try {
      const saved = localStorage.getItem("portal_employee");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const activeToken = localStorage.getItem("portal_token");
    if (!activeToken) {
      setLoading(false);
      return;
    }
    try {
      const res = await portalApi.get("/auth/me");
      setUser(res.data.user);
      setEmployee(res.data.employee);
      setRequiresPasswordChange(Boolean(res.data.requiresPasswordChange));
      localStorage.setItem("portal_user", JSON.stringify(res.data.user));
      localStorage.setItem("portal_employee", JSON.stringify(res.data.employee));
    } catch (err) {
      console.warn("Portal session restore error:", err);
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = async (identifier, password, rememberMe = false) => {
    const res = await portalApi.post("/auth/login", {
      identifier,
      password,
      rememberMe,
    });
    const { token: newToken, user: newUser, employee: newEmployee, requiresPasswordChange: reqChange } = res.data;
    localStorage.setItem("portal_token", newToken);
    localStorage.setItem("portal_user", JSON.stringify(newUser));
    localStorage.setItem("portal_employee", JSON.stringify(newEmployee));
    setToken(newToken);
    setUser(newUser);
    setEmployee(newEmployee);
    setRequiresPasswordChange(Boolean(reqChange));
    return res.data;
  };

  const logout = async () => {
    try {
      await portalApi.post("/auth/logout").catch(() => {});
    } finally {
      localStorage.removeItem("portal_token");
      localStorage.removeItem("portal_user");
      localStorage.removeItem("portal_employee");
      setToken(null);
      setUser(null);
      setEmployee(null);
      setRequiresPasswordChange(false);
    }
  };

  const updatePassword = async (currentPassword, newPassword, confirmNewPassword) => {
    const res = await portalApi.post("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmNewPassword,
    });
    setRequiresPasswordChange(false);
    return res.data;
  };

  return (
    <PortalAuthContext.Provider
      value={{
        token,
        user,
        employee,
        requiresPasswordChange,
        loading,
        login,
        logout,
        updatePassword,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);
  if (!context) {
    throw new Error("usePortalAuth must be used within a PortalAuthProvider");
  }
  return context;
}