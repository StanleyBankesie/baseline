import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import portalApi from "../api/portalClient.js";
import { DollarSign, Eye, EyeOff, FileText, TrendingUp, Shield, Plus, X, AlertCircle, CheckCircle2 } from "lucide-react";

export default function PortalCompensationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "payslips";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSalary, setShowSalary] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [payslipDetail, setPayslipDetail] = useState(null);
  const [payslipLoading, setPayslipLoading] = useState(false);

  // Loan Application Modal
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [loanAmount, setLoanAmount] = useState("");
  const [durationMonths, setDurationMonths] = useState(12);
  const [loanReason, setLoanReason] = useState("");
  const [loanSubmitting, setLoanSubmitting] = useState(false);
  const [loanMsg, setLoanMsg] = useState("");
  const [loanErr, setLoanErr] = useState("");

  const fetchCompensation = async () => {
    try {
      setLoading(true);
      const res = await portalApi.get("/compensation/summary");
      setData(res.data);
    } catch (err) {
      console.error("Failed to load compensation data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompensation();
  }, []);

  const openPayslipDetail = async (pId) => {
    setSelectedPayslip(pId);
    setPayslipLoading(true);
    try {
      const res = await portalApi.get(`/compensation/payslips/${pId}`);
      setPayslipDetail(res.data?.payslip);
    } catch (err) {
      alert("Failed to load payslip detail.");
    } finally {
      setPayslipLoading(false);
    }
  };

  const handleApplyLoan = async (e) => {
    e.preventDefault();
    setLoanSubmitting(true);
    setLoanErr("");
    setLoanMsg("");
    try {
      const monthlyDeduction = (Number(loanAmount) / Number(durationMonths)).toFixed(2);
      await portalApi.post("/compensation/loans/apply", {
        loan_amount: loanAmount,
        duration_months: durationMonths,
        monthly_deduction: monthlyDeduction,
        reason: loanReason,
      });
      setLoanMsg("Loan application submitted successfully for HR & Finance review.");
      setShowLoanModal(false);
      setLoanAmount("");
      setLoanReason("");
      await fetchCompensation();
    } catch (err) {
      setLoanErr(err.response?.data?.message || "Failed to submit loan request.");
    } finally {
      setLoanSubmitting(false);
    }
  };

  const salary = data?.salary || {};
  const allowances = data?.allowances || [];
  const loans = data?.loans || [];
  const payslips = data?.payslips || [];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>Compensation & Benefits</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Access your finalized payslips, salary breakdown, active benefits, and employee loan records.
          </p>
        </div>

        <button
          onClick={() => setShowSalary(!showSalary)}
          className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer border border-slate-700 transition-colors"
        >
          {showSalary ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{showSalary ? "Hide Financial Values" : "Show Financial Values"}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
        {[
          { key: "payslips", label: "Payslips History" },
          { key: "salary", label: "Salary & Allowances" },
          { key: "loans", label: "Loans & Repayments" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setSearchParams({ tab: tab.key });
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.key
                ? "bg-teal-600 text-white shadow-md shadow-teal-900/30"
                : "text-slate-400 hover:text-slate-200 bg-slate-900/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Payslips */}
      {activeTab === "payslips" && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-400" />
              <span>Digital Payslips</span>
            </h3>
            <span className="text-xs text-slate-400">{payslips.length} payslips available</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Loading payslips...</div>
          ) : payslips.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">No payslips have been published yet.</div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {payslips.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                  <div>
                    <h4 className="text-xs font-bold text-white">{p.period_name || "Monthly Payroll Period"}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Gross: {showSalary ? `GHS ${Number(p.gross_salary || 0).toLocaleString()}` : "••••••"} · Deductions:{" "}
                      {showSalary ? `GHS ${Number(p.total_deductions || 0).toLocaleString()}` : "••••••"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-400 block">
                        {showSalary ? `GHS ${Number(p.net_salary || 0).toLocaleString()}` : "••••••••"}
                      </span>
                      <span className="text-[10px] text-slate-500">Net Pay</span>
                    </div>

                    <button
                      onClick={() => openPayslipDetail(p.id)}
                      className="px-3 py-1.5 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Salary & Allowances */}
      {activeTab === "salary" && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-3">Base Remuneration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Base Monthly Salary</span>
                <span className="text-lg font-bold text-emerald-400">
                  {showSalary ? `GHS ${Number(salary.base_salary || 0).toLocaleString()}` : "••••••••"}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Bank Account</span>
                <span className="text-xs font-medium text-slate-200">
                  {salary.bank_name || "Bank"} · {showSalary ? (salary.bank_account || "N/A") : "••••••••"}
                </span>
              </div>
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">SSNIT / TIN</span>
                <span className="text-xs font-medium text-slate-200 font-mono">
                  {salary.ssnit || "SSNIT Not set"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-3">Active Allowances & Benefits</h3>
            {allowances.length === 0 ? (
              <p className="text-xs text-slate-500">No active supplementary allowances assigned.</p>
            ) : (
              <div className="space-y-2">
                {allowances.map((a) => (
                  <div key={a.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-semibold text-white">{a.allowance_name}</h4>
                      <span className="text-[10px] text-slate-400 uppercase">{a.frequency || "Monthly"}</span>
                    </div>
                    <span className="text-xs font-bold text-teal-300">
                      {showSalary ? `GHS ${Number(a.amount || 0).toLocaleString()}` : "••••••"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Loans */}
      {activeTab === "loans" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">Employee Loans</h3>
            <button
              onClick={() => setShowLoanModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply for Loan</span>
            </button>
          </div>

          {loanMsg && (
            <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl text-teal-300 text-xs">
              {loanMsg}
            </div>
          )}

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            {loans.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">No active or past employee loan records.</div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {loans.map((l) => (
                  <div key={l.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{l.loan_type_name || "Personal Staff Loan"}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            l.status === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : l.status === "PENDING"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {l.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Principal: {showSalary ? `GHS ${Number(l.loan_amount || 0).toLocaleString()}` : "••••••"} · Monthly Deduct:{" "}
                        {showSalary ? `GHS ${Number(l.monthly_deduction || 0).toLocaleString()}` : "••••••"}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-white block">{l.duration_months} Months</span>
                      <span className="text-[10px] text-slate-500">{l.created_at?.split("T")[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payslip Detail Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Digital Payslip Voucher</h3>
                <p className="text-xs text-slate-400">{payslipDetail?.period_name || "Official Payslip"}</p>
              </div>
              <button onClick={() => setSelectedPayslip(null)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {payslipLoading ? (
              <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Loading voucher breakdown...</div>
            ) : payslipDetail ? (
              <div className="space-y-4 text-xs">
                {/* Employee Header */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employee</span>
                    <strong className="text-white">{payslipDetail.first_name} {payslipDetail.last_name}</strong>
                    <span className="text-slate-400 block text-[11px] font-mono">{payslipDetail.emp_code}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Department</span>
                    <span className="text-slate-200">{payslipDetail.dept_name || "General"}</span>
                  </div>
                </div>

                {/* Earnings & Deductions Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-2.5 bg-slate-950/80 font-bold text-slate-300 border-b border-slate-800 flex justify-between">
                    <span>Earnings</span>
                    <span>Amount (GHS)</span>
                  </div>
                  <div className="p-2.5 flex justify-between border-b border-slate-800/40 text-slate-300">
                    <span>Basic Salary</span>
                    <span>{Number(payslipDetail.gross_salary || 0).toFixed(2)}</span>
                  </div>
                  <div className="p-2.5 flex justify-between border-b border-slate-800/40 text-slate-300">
                    <span>Allowances</span>
                    <span>{Number(payslipDetail.total_allowances || 0).toFixed(2)}</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/40 flex justify-between font-bold text-white border-b border-slate-800">
                    <span>Gross Earnings</span>
                    <span>{(Number(payslipDetail.gross_salary || 0) + Number(payslipDetail.total_allowances || 0)).toFixed(2)}</span>
                  </div>

                  <div className="p-2.5 bg-slate-950/80 font-bold text-slate-300 border-b border-slate-800 flex justify-between">
                    <span>Deductions (Taxes, SSNIT, Loans)</span>
                    <span>Amount (GHS)</span>
                  </div>
                  <div className="p-2.5 flex justify-between border-b border-slate-800/40 text-rose-300">
                    <span>Total Deductions</span>
                    <span>-{Number(payslipDetail.total_deductions || 0).toFixed(2)}</span>
                  </div>

                  <div className="p-3 bg-teal-950/40 flex justify-between font-extrabold text-sm text-emerald-400">
                    <span>NET TAKE-HOME PAY</span>
                    <span>GHS {Number(payslipDetail.net_salary || 0).toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                  >
                    Print Payslip PDF
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Loan Apply Modal */}
      {showLoanModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Apply for Employee Loan</h3>
              <button onClick={() => setShowLoanModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loanErr && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {loanErr}
              </div>
            )}

            <form onSubmit={handleApplyLoan} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Loan Principal Amount (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Repayment Period (Months)</label>
                <select
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {[3, 6, 12, 18, 24, 36].map((m) => (
                    <option key={m} value={m}>
                      {m} Months (~GHS {loanAmount ? (Number(loanAmount) / m).toFixed(2) : 0}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Reason / Justification</label>
                <textarea
                  value={loanReason}
                  onChange={(e) => setLoanReason(e.target.value)}
                  placeholder="Reason for staff advance or loan request"
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowLoanModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loanSubmitting}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl shadow-lg disabled:opacity-50"
                >
                  {loanSubmitting ? "Submitting..." : "Submit Loan Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}