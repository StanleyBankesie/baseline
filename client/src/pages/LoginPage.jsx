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

  // Load remembered credentials on mount
  useEffect(() => {
    const profiles = authStorage.readRememberedCredentialProfiles?.() || [];
    if (profiles.length) {
      setSavedProfiles(profiles);
      setRememberMe(true);
    }
  }, []);

  // Check global license status on mount
  useEffect(() => {
    async function checkGlobalLicense() {
      try {
        const res = await api.get("/licenses/global-status");
        if (res.data?.status === "EXPIRED" || res.data?.status === "INACTIVE" || res.data?.message?.toLowerCase().includes("expired")) {
          // 1. Informational Alert First
          Swal.fire({
            title: "License Expired",
            text: "Your company license has expired. Please log in to renew your license.",
            icon: "warning",
            allowOutsideClick: false,
            allowEscapeKey: false,
            showCancelButton: false,
            confirmButtonText: "Renew License",
            buttonsStyling: false,
            customClass: {
              container: 'backdrop-blur-sm bg-slate-900/40',
              popup: 'rounded-2xl shadow-2xl border-0 p-6',
              title: 'text-2xl font-bold text-slate-800 mt-2',
              htmlContainer: 'text-slate-500 text-base mt-2',
              confirmButton: 'bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-all shadow-sm w-full mt-4',
              icon: 'border-0 text-amber-500'
            }
          }).then((firstResult) => {
            if (firstResult.isConfirmed) {
              // 2. Authentication Alert Second
              Swal.fire({
                title: "Authentication Required",
                html: `
                  <p class="text-slate-500 text-sm mb-5">Please verify your credentials to proceed with renewal.</p>
                  <div class="space-y-4">
                    <input id="swal-login-username" class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-slate-700 placeholder-slate-400 bg-slate-50 focus:bg-white" placeholder="Username" autocomplete="off">
                    <div class="relative w-full">
                      <input id="swal-login-password" type="password" class="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-slate-700 placeholder-slate-400 bg-slate-50 focus:bg-white" placeholder="Password">
                      <button type="button" id="swal-password-toggle" class="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    </div>
                  </div>
                `,
                icon: "info",
                allowOutsideClick: false,
                allowEscapeKey: false,
                showCancelButton: true,
                confirmButtonText: "Verify & Continue",
                cancelButtonText: "Cancel",
                buttonsStyling: false,
                customClass: {
                  container: 'backdrop-blur-sm bg-slate-900/40',
                  popup: 'rounded-2xl shadow-2xl border-0 p-6',
                  title: 'text-xl font-bold text-slate-800 mt-2',
                  actions: 'w-full flex gap-3 mt-6',
                  confirmButton: 'flex-1 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-all shadow-sm',
                  cancelButton: 'flex-1 bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-all',
                  icon: 'border-0 text-brand-500'
                },
                didOpen: () => {
                  const p = document.getElementById('swal-login-password');
                  const t = document.getElementById('swal-password-toggle');
                  t.addEventListener('click', () => {
                    if (p.type === 'password') {
                      p.type = 'text';
                      t.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>`;
                    } else {
                      p.type = 'password';
                      t.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`;
                    }
                  });
                },
                preConfirm: () => {
                  const u = document.getElementById('swal-login-username').value;
                  const p = document.getElementById('swal-login-password').value;
                  if (!u || !p) {
                    Swal.showValidationMessage('Please enter both username and password');
                    return false;
                  }
                  return { username: u, password: p };
                }
              }).then(async (result) => {
                if (result.isConfirmed) {
                  setLoading(true);
                  renewingLicenseRef.current = true;
                  try {
                    const data = await login({
                      username: result.value.username,
                      password: result.value.password,
                      rememberMe: false,
                      intent: "renew"
                    });

                    const branches = Array.isArray(data?.user?.branchIds) ? data.user.branchIds.map(Number).filter(Number.isFinite) : [];
                    const companies = Array.isArray(data?.user?.companyIds) ? data.user.companyIds.map(Number).filter(Number.isFinite) : [];

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
                    
                    // Do not navigate! Instead, stay on login page and open the PaymentPackageModal directly over it.
                    setShowPaymentModal(true);
                  } catch (retryErr) {
                    const retryMsg = retryErr?.response?.data?.message || retryErr?.message || "Renewal login failed";
                    Swal.fire({
                      icon: 'error',
                      title: 'Login Failed',
                      text: retryMsg,
                      confirmButtonText: 'Try Again',
                      buttonsStyling: false,
                      customClass: {
                        container: 'backdrop-blur-sm bg-slate-900/40',
                        popup: 'rounded-2xl shadow-2xl border-0 p-6',
                        title: 'text-xl font-bold text-slate-800',
                        htmlContainer: 'text-slate-500',
                        confirmButton: 'bg-red-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-red-700 w-full mt-4',
                      }
                    }).then(() => checkGlobalLicense()); // Prompt again from the start
                  } finally {
                    setLoading(false);
                    // We DO NOT set renewingLicenseRef.current = false here because we want them to stay on the page with the modal
                  }
                } else if (result.isDismissed) {
                  // If they cancel authentication, take them back to the first informational alert
                  checkGlobalLicense();
                }
              });
            }
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

  // When user focuses or clicks the username field, show saved credential suggestion
  const handleUsernameFocus = useCallback(() => {
    if (savedProfiles.length) {
      setShowSuggestion(true);
    }
  }, [savedProfiles]);

  const setInputValue = useCallback((input, value) => {
    if (!input) return;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set;
    nativeInputValueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, []);

  // When user selects the suggested username, fill both fields
  const handleSelectSuggestion = useCallback(
    (profile) => {
      if (!profile) return;
      setInputValue(usernameRef.current, profile.username);
      setInputValue(passwordRef.current, profile.password);
      setUsernameQuery(profile.username);
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

  const shouldShowSuggestion = showSuggestion && usernameQuery.length >= 2 && filteredProfiles.length > 0;

  useEffect(() => {
    if (initialized && token && !handledStartupRedirect.current && !renewingLicenseRef.current) {
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
            container: 'backdrop-blur-sm bg-slate-900/40',
            popup: 'rounded-2xl shadow-2xl border-0 p-6',
            title: 'text-xl font-bold text-slate-800 mt-2',
            actions: 'w-full flex gap-3 mt-6',
            confirmButton: 'flex-1 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-all shadow-sm',
            cancelButton: 'flex-1 bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-all',
            icon: 'border-0 text-amber-500'
          },
          preConfirm: () => {
            const u = document.getElementById('swal-login-username-retry').value;
            const p = document.getElementById('swal-login-password-retry').value;
            if (!u || !p) {
              Swal.showValidationMessage('Please enter both username and password');
              return false;
            }
            return { username: u, password: p };
          }
        }).then(async (result) => {
          if (result.isConfirmed) {
            setLoading(true);
            renewingLicenseRef.current = true;
            try {
              const data = await login({
                username: result.value.username,
                password: result.value.password,
                rememberMe: false,
                intent: "renew"
              });

              if (rememberMe) {
                authStorage.saveRememberedCredentials(submittedUsername, result.value, { profilePictureUrl: data?.user?.profile_picture_url || "" });
                authStorage.saveRememberMePreference(true);
              } else {
                authStorage.clearRememberedCredentials(submittedUsername);
                authStorage.saveRememberMePreference(false);
              }

              const branches = Array.isArray(data?.user?.branchIds) ? data.user.branchIds.map(Number).filter(Number.isFinite) : [];
              const companies = Array.isArray(data?.user?.companyIds) ? data.user.companyIds.map(Number).filter(Number.isFinite) : [];

              if (branches.length === 1) {
                const branchId = branches[0];
                let companyId = companies.length === 1 ? companies[0] : null;
                if (!companyId) {
                  companyId = companies[0] || 1;
                }
                setScope((prev) => ({
                  ...prev,
                  companyId: companyId || prev.companyId || 1,
                  branchId: branchId,
                }));
              }
              
              // Stay on login page and show the payment modal directly!
              setShowPaymentModal(true);
            } catch (retryErr) {
              const retryMsg = retryErr?.response?.data?.message || retryErr?.message || "Renewal login failed";
              setError(retryMsg);
              toast.error(retryMsg);
              setLoading(false);
            }
          }
        });
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
                autoComplete="off"
                required
                defaultValue=""
                onFocus={handleUsernameFocus}
                onClick={handleUsernameFocus}
                onChange={(e) => {
                  setUsernameQuery(e.target.value);
                  if (savedProfiles.length) setShowSuggestion(true);
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
                    overflow: "hidden",
                  }}
                >
                  {filteredProfiles.map((profile) => (
                  <button
                    key={profile.username}
                    type="button"
                    onClick={() => handleSelectSuggestion(profile)}
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
      <PaymentPackageModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} companyId={scope?.companyId || null} />
    </div>
  );
}
