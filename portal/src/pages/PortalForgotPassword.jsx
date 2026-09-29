import React, { useState } from "react";
import { Link } from "react-router-dom";
import portalApi from "../api/portalClient.js";
import { KeyRound, Mail, Lock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import logoClear from "../assets/resources/OMNISUITE_LOGO_CLEAR.png";

export default function PortalForgotPassword() {
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Reset with OTP
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!identifier.trim()) {
      setError("Please enter your username or registered email.");
      return;
    }
    setLoading(true);
    try {
      const res = await portalApi.post("/auth/forgot-password/request-otp", {
        username: identifier.trim(),
        email: identifier.trim(),
      });
      setMessage(res.data.message || "OTP sent to your registered email address.");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await portalApi.post("/auth/forgot-password/reset", {
        username: identifier.trim(),
        email: identifier.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setSuccess(true);
      setMessage(res.data.message || "Password successfully reset!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password. Please check your OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative font-sans">
      <div className="w-full max-w-md z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 p-2.5 mb-3 text-teal-400">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Reset Portal Password</h1>
          <p className="text-xs text-slate-400 mt-1">
            {step === 1 ? "Enter your username or email to receive a 6-digit OTP" : "Enter the OTP sent to your email and your new password"}
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && !error && (
            <div className="mb-5 p-3.5 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-start gap-3 text-teal-300 text-xs">
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Password Reset Successful</h3>
              <p className="text-xs text-slate-400 mb-5">You can now sign in to the Employee Portal with your new credentials.</p>
              <Link
                to="/portal/login"
                className="inline-flex items-center justify-center px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs rounded-xl shadow-lg transition-all"
              >
                Back to Sign In
              </Link>
            </div>
          ) : step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Username or Registered Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your username or email"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Sending OTP..." : "Send Verification OTP"}
              </button>

              <div className="text-center pt-2">
                <Link to="/portal/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-400">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  required
                  className="w-full text-center tracking-widest text-lg font-bold py-2 bg-slate-950/70 border border-slate-700/80 rounded-xl text-teal-400 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    minLength={8}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-teal-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Resetting Password..." : "Set New Password"}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <button type="button" onClick={() => setStep(1)} className="hover:text-slate-200">
                  ← Re-send OTP
                </button>
                <Link to="/portal/login" className="hover:text-teal-400">
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}