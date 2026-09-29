import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "../context/PortalAuthContext.jsx";
import { Eye, EyeOff, Lock, User, AlertCircle, ArrowRight } from "lucide-react";
import logoClear from "../../assets/resources/OMNISUITE_LOGO_CLEAR.png";
import backgroundImage from "../../assets/resources/BACKGROUND.jpg";

export default function PortalLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, token, user, requiresPasswordChange } = usePortalAuth();

  const [identifier, setIdentifier] = useState(() => localStorage.getItem("portal_saved_identifier") || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem("portal_saved_identifier")));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token && user) {
      if (requiresPasswordChange) {
        navigate("/portal/first-login-change-password", { replace: true });
      } else {
        const from = location.state?.from?.pathname || "/portal";
        navigate(from, { replace: true });
      }
    }
  }, [token, user, requiresPasswordChange, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Please enter both username/email and password.");
      return;
    }

    setLoading(true);
    try {
      if (rememberMe) {
        localStorage.setItem("portal_saved_identifier", identifier.trim());
      } else {
        localStorage.removeItem("portal_saved_identifier");
      }

      const res = await login(identifier.trim(), password, rememberMe);
      if (res.requiresPasswordChange) {
        navigate("/portal/first-login-change-password", { replace: true });
      } else {
        navigate("/portal", { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Authentication failed. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Dynamic Background Backdrop */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10 blur-xl scale-105 pointer-events-none"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />

      <div className="w-full max-w-md z-10">
        {/* Company & ESS Branding Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-500 to-cyan-500 p-2.5 shadow-xl shadow-teal-900/40 mb-3 border border-teal-400/30">
            <img src={logoClear} alt="OmniSuite Logo" className="w-full h-full object-contain brightness-0 invert" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OmniSuite ESS</h1>
          <p className="text-sm text-teal-400/90 font-medium">Employee Self-Service Portal</p>
          <p className="text-xs text-slate-400 mt-1">Sign in with your employee account credentials</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-xs sm:text-sm animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. jdoe or jdoe@company.com"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/portal/forgot-password"
                  className="text-xs font-medium text-teal-400 hover:text-teal-300 hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-teal-600 focus:ring-teal-500 focus:ring-offset-slate-900 rounded"
                />
                <span className="text-xs font-medium text-slate-300">Remember me</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to ESS Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Main ERP link */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <p className="text-xs text-slate-400">
              Need administrator or management access?{" "}
              <Link to="/login" className="text-teal-400 font-medium hover:underline">
                Main ERP Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}