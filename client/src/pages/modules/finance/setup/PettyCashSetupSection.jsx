import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { api } from "api/client";
import {
  Wallet,
  Settings,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Coins,
  TrendingDown,
  User,
} from "lucide-react";

export default function PettyCashSetupSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data lists
  const [cashAccounts, setCashAccounts] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [currentAccount, setCurrentAccount] = useState(null);

  // Form State
  const [form, setForm] = useState({
    id: null,
    account_id: "",
    expense_account_id: "",
    account_name: "Petty Cash Account",
    custodian_name: "",
    low_balance_threshold: "250.00",
    max_single_disbursement: "1500.00",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [pcaRes, allAccRes, expRes] = await Promise.all([
        api.get("/finance/petty-cash/accounts").catch(() => ({ data: { data: [] } })),
        api.get("/finance/accounts").catch(() => ({ data: { items: [] } })),
        api.get("/finance/expense-accounts").catch(() =>
          api.get("/finance/accounts?nature=EXPENSE").catch(() => ({ data: { items: [] } }))
        ),
      ]);

      const pcaList = pcaRes.data?.data || [];
      const pca = pcaList[0] || null;
      setCurrentAccount(pca);

      // GL Accounts
      const allAccs = allAccRes.data?.items || allAccRes.data?.data || [];
      // Filter for Cash / Bank / Asset accounts for the source petty cash account
      const cashList = allAccs.filter((a) => {
        const code = String(a.code || "");
        const name = String(a.name || "").toLowerCase();
        const nature = String(a.nature || "").toUpperCase();
        return (
          nature === "ASSET" ||
          code.startsWith("10") ||
          name.includes("cash") ||
          name.includes("petty") ||
          name.includes("bank")
        );
      });
      setCashAccounts(cashList.length > 0 ? cashList : allAccs);

      // Expense Accounts
      const expList = expRes.data?.items || expRes.data?.data || (Array.isArray(expRes.data) ? expRes.data : []);
      const postableExp = expList.filter((a) => a.is_postable !== 0);
      setExpenseAccounts(postableExp);

      // Populate form from existing configuration
      if (pca) {
        setForm({
          id: pca.id,
          account_id: pca.account_id ? String(pca.account_id) : "",
          expense_account_id: pca.expense_account_id ? String(pca.expense_account_id) : "",
          account_name: pca.account_name || "Petty Cash Account",
          custodian_name: pca.custodian_name || "",
          low_balance_threshold: pca.low_balance_threshold ? String(pca.low_balance_threshold) : "250.00",
          max_single_disbursement: pca.max_single_disbursement ? String(pca.max_single_disbursement) : "1500.00",
        });
      } else {
        // Find default petty cash account (1023)
        const defPetty = cashList.find((a) => String(a.code).includes("1023") || String(a.name).toLowerCase().includes("petty"));
        // Find default imprest account (5038)
        const defImprest = postableExp.find((a) => String(a.name).toLowerCase().includes("imprest") || String(a.code).includes("5038"));

        setForm((prev) => ({
          ...prev,
          account_id: defPetty ? String(defPetty.id) : prev.account_id,
          expense_account_id: defImprest ? String(defImprest.id) : prev.expense_account_id,
        }));
      }
    } catch (err) {
      console.error("Failed to load petty cash setup:", err);
      toast.error("Failed to load petty cash account settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.account_id) {
      toast.error("Please select a Source Petty Cash Account.");
      return;
    }
    if (!form.expense_account_id) {
      toast.error("Please select a Default Expense Account.");
      return;
    }

    setSaving(true);
    try {
      const selectedAcc = cashAccounts.find((a) => String(a.id) === String(form.account_id));
      const payload = {
        ...form,
        account_name: selectedAcc?.name || form.account_name,
        opening_balance: currentAccount?.opening_balance || 0,
        is_active: 1,
      };

      await api.post("/finance/petty-cash/accounts", payload);
      toast.success("Petty Cash and Expense Account settings updated successfully!");
      await loadData();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.error || "Failed to update configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card p-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-teal-600" />
        <p className="text-sm font-medium">Loading Petty Cash configuration...</p>
      </div>
    );
  }

  const selectedCash = cashAccounts.find((a) => String(a.id) === String(form.account_id));
  const selectedExp = expenseAccounts.find((a) => String(a.id) === String(form.expense_account_id));

  return (
    <div className="space-y-6">
      {/* Active Mapping Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/20 border border-teal-200/80 dark:border-teal-800/50 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider block">
              Source Petty Cash Account (GL Credit)
            </span>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {selectedCash ? `${selectedCash.code} — ${selectedCash.name}` : "Not Selected"}
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              Available Book Balance:{" "}
              <strong className="text-emerald-700 dark:text-emerald-400 font-mono">
                GH₵ {Number(currentAccount?.available_balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Coins size={22} />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/20 border border-indigo-200/80 dark:border-indigo-800/50 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
              Default Expense Account (GL Debit)
            </span>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {selectedExp ? `${selectedExp.code} — ${selectedExp.name}` : "Not Selected"}
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              Auto-debited on all petty cash disbursement Journal Vouchers
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <TrendingDown size={22} />
          </div>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Settings size={20} className="text-teal-600" /> Petty Cash Book Account Configuration
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Set or change the General Ledger Petty Cash Account and Default Expense Account for disbursements.
            </p>
          </div>

          <Link
            to="/finance/petty-cash"
            className="btn btn-secondary btn-sm text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <span>Open Petty Cash Book</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Petty Cash GL Account */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Petty Cash GL Account (Cash Account) *
              </label>
              <select
                value={form.account_id}
                onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                required
                className="form-select w-full text-xs py-2 px-3 rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 font-semibold"
              >
                <option value="">-- Select Source Petty Cash Account --</option>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                The asset cash account that holds petty cash liquidity. Credited automatically on each disbursement Journal Voucher.
              </p>
            </div>

            {/* 2. Default Expense GL Account */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Default Expense Account (Imprest / Expense) *
              </label>
              <select
                value={form.expense_account_id}
                onChange={(e) => setForm({ ...form, expense_account_id: e.target.value })}
                required
                className="form-select w-full text-xs py-2 px-3 rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 font-semibold"
              >
                <option value="">-- Select Default Expense Account --</option>
                {expenseAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                The general ledger expense account debited automatically when disbursements are saved, without requiring manual account entry on the petty cash book form.
              </p>
            </div>

            {/* 3. Low Balance Threshold */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Low Balance Alert Threshold (GH₵)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.low_balance_threshold}
                onChange={(e) => setForm({ ...form, low_balance_threshold: e.target.value })}
                className="form-input w-full text-xs py-2 px-3 rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 font-mono"
                placeholder="250.00"
              />
              <p className="text-[11px] text-slate-400">
                Displays a replenishment warning banner when available liquidity drops below this amount.
              </p>
            </div>

            {/* 4. Max Single Disbursement */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Max Single Disbursement Limit (GH₵)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.max_single_disbursement}
                onChange={(e) => setForm({ ...form, max_single_disbursement: e.target.value })}
                className="form-input w-full text-xs py-2 px-3 rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800 font-mono"
                placeholder="1500.00"
              />
              <p className="text-[11px] text-slate-400">
                Maximum cash limit permitted per single disbursement transaction.
              </p>
            </div>

            {/* 5. Custodian Name */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Petty Cash Custodian / In-charge
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={form.custodian_name}
                  onChange={(e) => setForm({ ...form, custodian_name: e.target.value })}
                  placeholder="e.g. Administrator, Head of Accounts, Finance Officer"
                  className="form-input w-full text-xs pl-9 py-2 px-3 rounded-xl border-slate-300 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck size={16} className="text-emerald-600" />
              <span>Changes take effect immediately across all Petty Cash Book operations.</span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-success text-xs font-bold px-5 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save size={15} />
              <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
