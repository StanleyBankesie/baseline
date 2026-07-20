/**
 * @fileoverview DebtorsLedgerReportPage component.
 * Provides functionality for DebtorsLedgerReportPage.
 */

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { api } from "api/client";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { filterAndSort } from "../../../../utils/searchUtils.js";
import useSort from "@/hooks/useSort.js";
import SortableHeader from "@/components/SortableHeader.jsx";

/**
 *  component
 * 
 * @returns {JSX.Element} The rendered component
 */
export default function DebtorsLedgerReportPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const accountInputRef = useRef(null);
  const accountDropdownRef = useRef(null);

  const filteredAccounts = useMemo(() => {
    // Filter for asset nature accounts (debtors)
    const debtorsAccounts = accounts.filter(
      (a) => String(a.group_code || "").toUpperCase() === "DEBTORS"
    );
    return filterAndSort(debtorsAccounts, {
      query: accountQuery,
      getKeys: (a) => [a.code, a.name],
    });
  }, [accounts, accountQuery]);

  const selectedAccountLabel = useMemo(() => {
    const hit = (accounts || []).find((a) => String(a.id) === String(accountId || ""));
    return hit ? String(hit.name || "") : "";
  }, [accounts, accountId]);

  const handleSelectAccount = useCallback((id, name) => {
    setAccountId(String(id));
    setAccountQuery(String(name || ""));
    setAccountDropdownOpen(false);
  }, []);

  const handleAccountInputChange = useCallback((value) => {
    setAccountQuery(value);
    setAccountDropdownOpen(true);
    if (!String(value || "").trim()) {
      setAccountId("");
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        accountDropdownRef.current &&
        !accountDropdownRef.current.contains(e.target) &&
        accountInputRef.current &&
        !accountInputRef.current.contains(e.target)
      ) {
        setAccountDropdownOpen(false);
        const v = String(accountQuery || "").trim().toLowerCase();
        if (!v) {
          setAccountId("");
          return;
        }
        const hit = (filteredAccounts || []).find((a) => {
          const label = `${a.name}`.toLowerCase();
          const code = String(a.code || "").toLowerCase();
          return label === v || code === v;
        });
        if (!hit && selectedAccountLabel) {
          setAccountQuery(selectedAccountLabel);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountQuery, filteredAccounts, selectedAccountLabel]);

  // Load debtors accounts (ASSET group nature = accounts receivable/debtors)
  async function loadAccounts() {
    try {
      const res = await api.get("/finance/accounts", {
        params: { active: 1 },
      });
      // Filter accounts that are in ASSET group (debtors)
      const allAccounts = res.data?.items || [];
      setAccounts(allAccounts);
    } catch {
      toast.error("Failed to load accounts");
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);



  const totals = useMemo(() => {
    const debit = items.reduce((sum, r) => sum + Number(r.debit || 0), 0);
    const credit = items.reduce((sum, r) => sum + Number(r.credit || 0), 0);
    const balance = debit - credit;
    return { debit, credit, balance };
  }, [items]);

  const { sorted: sortedItems, sortKey, sortDir, toggle } = useSort(items, "voucher_date", "asc");

  async function run() {
    try {
      setLoading(true);
      const params = { from: from || null, to: to || null };
      if (accountId) params.accountId = accountId;
      const res = await api.get("/finance/reports/debtors-ledger", { params });
      const rows = res.data?.items || [];
      const openRow =
        rows.length && rows[0]?.doc_no === "OPEN" ? rows[0] : null;
      const body = openRow ? rows.slice(1) : rows;
      setItems(openRow ? [openRow, ...body] : body);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const jan1 = new Date(year, 0, 1);
    setFrom(jan1.toISOString().slice(0, 10));
    setTo(today.toISOString().slice(0, 10));
    run();
  }, []);
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, accountId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/finance"
            className="font-sans text-sm text-brand hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            ← Back to Finance
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            Debtors Ledger
          </h1>
          <p className="text-sm mt-1">
            Customer ledger movements and running balance
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="label">Account (Debtors)</label>
              <div className="relative">
                <input
                  ref={accountInputRef}
                  className="input w-full mb-2"
                  placeholder={accountId ? selectedAccountLabel || "Search account..." : "Search account..."}
                  value={accountQuery}
                  onChange={(e) => handleAccountInputChange(e.target.value)}
                  onFocus={() => { setAccountDropdownOpen(true); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filteredAccounts.length > 0) {
                      const first = filteredAccounts[0];
                      handleSelectAccount(first.id, first.name);
                    }
                    if (e.key === "Escape") setAccountDropdownOpen(false);
                  }}
                  autoComplete="off"
                />
                {accountDropdownOpen && filteredAccounts.length > 0 ? (
                  <div ref={accountDropdownRef} className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-auto">
                    {filteredAccounts.slice(0, 20).map((a) => {
                      const q = String(accountQuery || "").trim().toLowerCase();
                      const name = String(a.name || "");
                      const idx = q ? name.toLowerCase().indexOf(q) : -1;
                      return (
                        <button
                          type="button"
                          key={a.id}
                          className="block w-full text-left px-3 py-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-sm border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                          onMouseDown={(e) => { e.preventDefault(); handleSelectAccount(a.id, a.name); }}
                        >
                          <div className="flex justify-between items-center">
                            <span>
                              {idx >= 0 ? (
                                <>{name.slice(0, idx)}<strong className="text-brand-600 dark:text-brand-400">{name.slice(idx, idx + q.length)}</strong>{name.slice(idx + q.length)}</>
                              ) : name}
                            </span>
                            <span className="font-semibold text-brand-700 dark:text-brand-300 whitespace-nowrap ml-2 text-xs bg-brand-50 dark:bg-brand-900/30 px-1.5 py-0.5 rounded">{a.code}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
            <div>
              <label className="label">From</label>
              <input
                className="input"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="label">To</label>
              <input
                className="input"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex items-end gap-2">

              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const rows = Array.isArray(items) ? items : [];
                  if (!rows.length) return;
                  const ws = XLSX.utils.json_to_sheet(rows);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "DebtorsLedger");
                  XLSX.writeFile(wb, "debtors-ledger.xlsx");
                }}
                disabled={!items.length}
              >
                Export Excel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const rows = Array.isArray(items) ? items : [];
                  if (!rows.length) return;
                  const doc = new jsPDF("p", "mm", "a4");
                  let y = 15;
                  doc.setFontSize(14);
                  doc.text("Debtors Ledger", 10, y);
                  y += 8;
                  doc.setFontSize(10);
                  doc.text("Date", 10, y);
                  doc.text("Document", 45, y);
                  doc.text("Description", 95, y);
                  doc.text("Debit", 140, y);
                  doc.text("Credit", 165, y);
                  doc.text("Balance", 190, y, { align: "right" });
                  y += 4;
                  doc.line(10, y, 200, y);
                  y += 5;
                  rows.forEach((r, i) => {
                    if (y > 270) {
                      doc.addPage();
                      y = 15;
                    }
                    const dt = r.txn_date
                      ? new Date(r.txn_date).toLocaleDateString()
                      : "-";
                    const docno = String(r.doc_no || "-");
                    const desc = String(r.description || "-").slice(0, 35);
                    const dr = Number(r.debit || 0);
                    const cr = Number(r.credit || 0);
                    const running = rows
                      .slice(0, i + 1)
                      .reduce(
                        (sum, x) =>
                          sum + Number(x.debit || 0) - Number(x.credit || 0),
                        0,
                      );
                    doc.text(dt, 10, y);
                    doc.text(docno, 45, y);
                    doc.text(desc, 95, y);
                    doc.text(String(dr.toLocaleString()), 140, y);
                    doc.text(String(cr.toLocaleString()), 165, y);
                    doc.text(
                      String(Number(running || 0).toLocaleString()),
                      190,
                      y,
                      { align: "right" },
                    );
                    y += 5;
                  });
                  y += 5;
                  doc.setFontSize(11);
                  doc.text(
                    `Totals — Debit: ${Number(totals.debit || 0).toLocaleString()}`,
                    10,
                    y,
                  );
                  y += 6;
                  doc.text(
                    `Credit: ${Number(totals.credit || 0).toLocaleString()}`,
                    10,
                    y,
                  );
                  y += 6;
                  doc.text(
                    `Balance: ${Number(totals.balance || 0).toLocaleString()}`,
                    10,
                    y,
                  );
                  doc.save("debtors-ledger.pdf");
                }}
                disabled={!items.length}
              >
                Export PDF
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => window.print()}
              >
                Print
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead className="sticky top-0 z-10">
                <tr>
                  <SortableHeader label="Voucher Date" sortKey="voucher_date" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                  <SortableHeader label="Voucher No" sortKey="voucher_no" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                  <SortableHeader label="Narration" sortKey="narration" currentKey={sortKey} direction={sortDir} onToggle={toggle} />
                  <SortableHeader label="Debit" sortKey="debit" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="text-right" />
                  <SortableHeader label="Credit" sortKey="credit" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="text-right" />
                  <SortableHeader label="Running Balance" sortKey="balance" currentKey={sortKey} direction={sortDir} onToggle={toggle} className="text-right" />
                  <th>Bal Type</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((r, idx) => {
                  const running = items
                    .slice(0, items.indexOf(r) + 1)
                    .reduce(
                      (sum, x) =>
                        sum + Number(x.debit || 0) - Number(x.credit || 0),
                      0,
                    );
                  const balType = running > 0 ? "Dr" : running < 0 ? "Cr" : "-";
                  return (
                    <tr key={r.id || idx}>
                      <td>
                        {r.voucher_date || r.txn_date
                          ? new Date(r.voucher_date || r.txn_date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="font-medium">{r.voucher_no || r.doc_no || "-"}</td>
                      <td>{r.narration || r.description || "-"}</td>
                      <td className="text-right">
                        {Number(r.debit || 0).toLocaleString()}
                      </td>
                      <td className="text-right">
                        {Number(r.credit || 0).toLocaleString()}
                      </td>
                      <td className="text-right">
                        {Number(Math.abs(running) || 0).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge badge-sm ${balType === "Dr" ? "badge-info" : balType === "Cr" ? "badge-warning" : "badge-ghost"}`}>
                          {balType}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-right font-medium">
                    Totals
                  </td>
                  <td className="text-right font-medium">
                    {totals.debit.toLocaleString()}
                  </td>
                  <td className="text-right font-medium">
                    {totals.credit.toLocaleString()}
                  </td>
                  <td className="text-right font-medium">
                    {Math.abs(totals.balance).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge badge-sm ${totals.balance > 0 ? "badge-info" : totals.balance < 0 ? "badge-warning" : "badge-ghost"}`}>
                      {totals.balance > 0 ? "Dr" : totals.balance < 0 ? "Cr" : "-"}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {items.length === 0 && !loading ? (
            <div className="text-center py-10">No rows.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
