/**
 * @fileoverview LoginPage component for OmniSuite ERP.
 * Handles user authentication, remembering credentials, and redirecting based on assigned branches.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../auth/AuthContext.jsx";
import * as authStorage from "../auth/authStorage.js";
import api from "../api/client.js";
import logoClear from "../assets/resources/OMNISUITE_LOGO_CLEAR.png";
import backgroundImage from "../assets/resources/BACKGROUND.jpg";
import { Eye, EyeOff } from "lucide-react";
import Swal from "sweetalert2";
import PaymentPackageModal from "../components/PaymentPackageModal.jsx";

/**
 * LoginPage component
 * Renders the login form, handles API authentication, and manages remembered credentials.
 *
 * @returns {JSX.Element} The rendered login page.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setScope, token, initialized, scope } = useAuth();

  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState(backgroundImage);
  const [rememberMe, setRememberMe] = useState(() =>
    authStorage.readRememberMePreference(),
  );
  const handledStartupRedirect = useRef(false);

  // ── Remembered credential suggestion state ──────────────────
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [usernameQuery, setUsernameQuery] = useState("");
  const [showSuggestion, setShowSuggestion] = useState(false);
  const suggestionRef = useRef(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const renewingLicenseRef = useRef(false);

  const setInputValue = useCallback((input, value) => {
    if (!input) return;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set;
    nativeInputValueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, []);

  const isAutoFillingRef = useRef(false);

  // Automatically clear all fields when login page is loaded or refreshed
  useEffect(() => {
    const profiles = authStorage.readRememberedCredentialProfiles?.() || [];
    if (profiles.length) {
      setSavedProfiles(profiles);
      setRememberMe(true);
    }
    setTimeout(() => {
      if (usernameRef.current) {
        setInputValue(usernameRef.current, "");
      }
      if (passwordRef.current) {
        setInputValue(passwordRef.current, "");
      }
      setShowSuggestion(false);
      setUsernameQuery("");
    }, 50);
  }, [setInputValue]);

  // Check global license status on mount
  useEffect(() => {
    async function checkGlobalLicense() {
      try {
        const res = await api.get("/licenses/global-status");
        if (
          res.data?.status === "EXPIRED" ||
          res.data?.status === "INACTIVE" ||
          res.data?.message?.toLowerCase().includes("expired")
        ) {
          // 1. Informational Alert First
          Swal.fire({
            title: "License Expired",
            text: "The license for your organization has expired. Access to certain features may be restricted until the license is renewed. Please contact your administrator.",
            icon: "warning",
            allowOutsideClick: false,
            allowEscapeKey: false,
            showCancelButton: false,
            confirmButtonText: "Close",
            buttonsStyling: false,
            customClass: {
              container: "backdrop-blur-sm bg-slate-900/40",
              popup: "rounded-2xl shadow-2xl border-0 p-6",
              title: "text-2xl font-bold text-slate-800 mt-2",
              htmlContainer: "text-slate-500 text-base mt-2",
              confirmButton:
                "bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-all shadow-sm w-full mt-4",
              icon: "border-0 text-amber-500",
            },
          });
        }
      } catch (err) {
        // Silently fail if endpoint is not accessible or returns error
      }
    }
    checkGlobalLicense();
  }, [login, setScope]);

  useEffect(() => {
    let mounted = true;
    async function loadLoginBackground() {
      try {
        const resp = await api.get("/admin/settings/login-background/meta");
        const meta = resp.data;
        if (!mounted || !meta?.hasBackground) return;
        const version = meta.updatedAt || Date.now();
        setLoginBackgroundUrl(
          `${api.defaults.baseURL}/admin/settings/login-background?v=${encodeURIComponent(
            String(version),
          )}`,
        );
      } catch {}
    }
    loadLoginBackground().catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Close suggestion dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(e.target) &&
        e.target !== usernameRef.current
      ) {
        setShowSuggestion(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When user focuses or clicks the username field, show saved credential suggestion if typed >= 2 chars
  const handleUsernameFocus = useCallback(() => {
    if (savedProfiles.length && usernameQuery.trim().length >= 2 && !isAutoFillingRef.current) {
      setShowSuggestion(true);
    }
  }, [savedProfiles, usernameQuery]);

  // When user selects the suggested username, fill username field and focus password
  const handleSelectSuggestion = useCallback(
    (profile) => {
      if (!profile) return;
      if (usernameRef.current) {
        usernameRef.current.value = profile.username || "";
        setInputValue(usernameRef.current, profile.username || "");
      }
      if (passwordRef.current && profile.password) {
        passwordRef.current.value = profile.password;
        setInputValue(passwordRef.current, profile.password);
      }
      setUsernameQuery(profile.username || "");
      setRememberMe(true);
      setShowSuggestion(false);
    },
    [setInputValue],
  );

  const filteredProfiles = savedProfiles.filter((profile) => {
    const query = usernameQuery.trim().toLowerCase();
    if (!query) return true;
    return profile.username.toLowerCase().includes(query);
  });

  const shouldShowSuggestion =
    showSuggestion && usernameQuery.trim().length >= 2 && filteredProfiles.length > 0;

  useEffect(() => {
    if (
      initialized &&
      token &&
      !handledStartupRedirect.current &&
      !renewingLicenseRef.current
    ) {
      handledStartupRedirect.current = true;
      navigate("/", { replace: true });
    }
  }, [initialized, token, navigate]);

  /**
   * Handles the login form submission.
   * Authenticates the user, saves credentials if rememberMe is true, and sets the active branch scope.
   * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
   */
  async function onSubmit(e) {
    e.preventDefault();

    // Read values directly from refs (fixes React/Browser autofill mismatch)
    const submittedUsername = usernameRef.current?.value?.trim() || "";
    const submittedPassword = passwordRef.current?.value || "";

    if (!submittedUsername || !submittedPassword) {
      setError("Please enter both username and password");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await login({
        username: submittedUsername,
        password: submittedPassword,
        rememberMe,
      });

      // ── Save or clear remembered credentials ──────────────
      if (rememberMe) {
        authStorage.saveRememberedCredentials(
          submittedUsername,
          submittedPassword,
          { profilePictureUrl: data?.user?.profile_picture_url || "" },
        );
        authStorage.saveRememberMePreference(true);
      } else {
        authStorage.clearRememberedCredentials(submittedUsername);
        authStorage.saveRememberMePreference(false);
      }

      // ── Clear form fields on successful login ──────────────
      if (usernameRef.current) {
        setInputValue(usernameRef.current, "");
      }
      if (passwordRef.current) {
        setInputValue(passwordRef.current, "");
      }
      setUsernameQuery("");

      const branches = Array.isArray(data?.user?.branchIds)
        ? data.user.branchIds.map(Number).filter((n) => Number.isFinite(n))
        : [];
      const companies = Array.isArray(data?.user?.companyIds)
        ? data.user.companyIds.map(Number).filter((n) => Number.isFinite(n))
        : [];

      if (branches.length === 1) {
        const branchId = branches[0];
        let companyId = companies.length === 1 ? companies[0] : null;
        if (!companyId) {
          try {
            const res = await api.get("/admin/branches");
            const items = Array.isArray(res.data?.items) ? res.data.items : [];
            const b = items.find((x) => Number(x.id) === Number(branchId));
            if (b) companyId = Number(b.company_id);
          } catch {
            companyId = companies[0] || 1;
          }
        }
        setScope((prev) => ({
          ...prev,
          companyId: companyId || prev.companyId || 1,
          branchId: branchId,
        }));

        navigate("/", { replace: true });
      } else {
        navigate("/select-branch", { replace: true });
      }
    } catch (err) {
      if (err?.response?.data?.error === "PASSWORD_RESET_REQUIRED") {
        navigate("/reset-password", { replace: true });
        return;
      }

      if (err?.response?.data?.error === "LICENSE_EXPIRED") {
        setLoading(false);
        const canRenew = err.response.data.canRenew;

        if (canRenew) {
          Swal.fire({
            title: "License Expired",
            html: `
              <p class="text-slate-500 text-sm mb-5">Your company license has expired. Please log in to renew your license.</p>
              <div class="space-y-4">
                <input id="swal-login-username-retry" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-slate-700 placeholder-slate-400 bg-slate-50 focus:bg-white" placeholder="Username" value="${submittedUsername}">
                <input id="swal-login-password-retry" type="password" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-slate-700 placeholder-slate-400 bg-slate-50 focus:bg-white" placeholder="Password">
              </div>
            `,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Renew License",
            cancelButtonText: "Cancel",
            buttonsStyling: false,
            customClass: {
              container: "backdrop-blur-sm bg-slate-900/40",
              popup: "rounded-2xl shadow-2xl border-0 p-6",
              title: "text-xl font-bold text-slate-800 mt-2",
              actions: "w-full flex gap-3 mt-6",
              confirmButton:
                "flex-1 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-all shadow-sm",
              cancelButton:
                "flex-1 bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-all",
              icon: "border-0 text-amber-500",
            },
            didOpen: () => {
              const u = document.getElementById("swal-login-username-retry");
              const p = document.getElementById("swal-login-password-retry");
              if (u && !u.value) u.focus();
              else if (p) p.focus();
            },
            preConfirm: () => {
              const u = document.getElementById(
                "swal-login-username-retry",
              ).value;
              const p = document.getElementById(
                "swal-login-password-retry",
              ).value;
              if (!u || !p) {
                Swal.showValidationMessage(
                  "Please enter both username and password",
                );
                return false;
              }
              return { username: u, password: p };
            },
          }).then(async (result) => {
            if (result.isConfirmed) {
              setLoading(true);
              renewingLicenseRef.current = true;
              try {
                const data = await login({
                  username: result.value.username,
                  password: result.value.password,
                  rememberMe: false,
                  intent: "renew",
                });

                const branches = Array.isArray(data?.user?.branchIds)
                  ? data.user.branchIds.map(Number).filter(Number.isFinite)
                  : [];
                const companies = Array.isArray(data?.user?.companyIds)
                  ? data.user.companyIds.map(Number).filter(Number.isFinite)
                  : [];

                if (branches.length === 1) {
                  const branchId = branches[0];
                  let companyId = companies.length === 1 ? companies[0] : null;
                  if (!companyId) companyId = companies[0] || 1;
                  setScope((prev) => ({
                    ...prev,
                    companyId: companyId || prev.companyId || 1,
                    branchId: branchId,
                  }));
                }

                setShowPaymentModal(true);
              } catch (retryErr) {
                toast.error(
                  retryErr?.response?.data?.message ||
                    retryErr?.message ||
                    "Renewal login failed",
                );
              } finally {
                setLoading(false);
              }
            }
          });
        } else {
          Swal.fire({
            title: "License Expired",
            text: "Your company license has expired. Please contact your administrator to renew.",
            icon: "error",
            allowOutsideClick: false,
            allowEscapeKey: false,
            showCancelButton: false,
            confirmButtonText: "Close",
            buttonsStyling: false,
            customClass: {
              container: "backdrop-blur-sm bg-slate-900/40",
              popup: "rounded-2xl shadow-2xl border-0 p-6",
              title: "text-2xl font-bold text-slate-800 mt-2",
              htmlContainer: "text-slate-500 text-base mt-2",
              confirmButton:
                "bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-all shadow-sm w-full mt-4",
              icon: "border-0 text-red-500",
            },
          });
        }
        return;
      }

      const msg =
        err?.response?.data?.message || err?.message || "Login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6"
      style={{
        backgroundImage: `url(${loginBackgroundUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-[400px]">
        <div
          className="card shadow-erp-lg p-8"
          style={{ backgroundColor: "rgba(255,255,255,0.7)" }}
        >
          <div className="flex items-center justify-center text-center mb-8">
            <div className="w-full">
              <div className="flex justify-center mt-3 mb-4">
                <img src={logoClear} alt="OmniSuite" className="h-14 w-auto" />
              </div>
              <div className="text-xl font-bold text-slate-600 dark:text-slate-400">
                Enterprise Resource Planning
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-status-error/30 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-status-error text-sm">
              {error}
            </div>
          ) : null}

          <form
            onSubmit={onSubmit}
            className="space-y-4"
            autoComplete="on"
            method="post"
          >
            {/* ── Username field with suggestion dropdown ── */}
            <div className="relative w-full">
              <label className="label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                className="login-input"
                ref={usernameRef}
                autoComplete="username"
                required
                defaultValue=""
                onFocus={handleUsernameFocus}
                onClick={handleUsernameFocus}
                onChange={(e) => {
                  const val = e.target.value;
                  setUsernameQuery(val);
                  if (savedProfiles.length && !isAutoFillingRef.current) {
                    if (val.trim().length >= 2) {
                      setShowSuggestion(true);
                    }
                    const matched = savedProfiles.find(
                      (p) => p.username.toLowerCase() === val.trim().toLowerCase(),
                    );
                    if (matched && matched.password && passwordRef.current) {
                      setInputValue(passwordRef.current, matched.password);
                    }
                  }
                }}
              />

              {/* Credential suggestion dropdown */}
              {shouldShowSuggestion && (
                <div
                  ref={suggestionRef}
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    marginTop: "2px",
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    overflowY: "auto",
                    maxHeight: "220px",
                  }}
                >
                  {filteredProfiles.map((profile) => (
                    <button
                      key={profile.username}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectSuggestion(profile);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectSuggestion(profile);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 14px",
                        border: "none",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background-color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f1f5f9")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      {profile.profilePictureUrl ? (
                        <img
                          src={profile.profilePictureUrl}
                          alt=""
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background:
                              profile.avatarColor ||
                              authStorage.getRememberedAvatarColor(
                                profile.username,
                              ),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "14px",
                            flexShrink: 0,
                          }}
                        >
                          {profile.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "#1e293b",
                            lineHeight: 1.3,
                          }}
                        >
                          {profile.username}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#94a3b8",
                            lineHeight: 1.3,
                          }}
                        >
                          {"•".repeat(8)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-full">
              <label className="label" htmlFor="password">
                Password
              </label>
              <div className="relative w-full">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="login-input pr-20"
                  ref={passwordRef}
                  autoComplete="current-password"
                  required
                  defaultValue=""
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-slate-500"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRememberMe(checked);
                  authStorage.saveRememberMePreference(checked);
                }}
              />
              Remember me
            </label>

            <button
              type="submit"
              className="btn-primary w-full mt-6"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <div className="mt-3 text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-brand-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </div>
      </div>
      <PaymentPackageModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        companyId={scope?.companyId || null}
      />
    </div>
  );
}
