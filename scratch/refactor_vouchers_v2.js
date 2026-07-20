const fs = require('fs');

function replaceStr(code, search, replacement) {
  // normalize line endings in both code and search to \n for easier matching
  const normCode = code.replace(/\\r\\n/g, '\\n');
  const normSearch = search.replace(/\\r\\n/g, '\\n');
  const normRep = replacement.replace(/\\r\\n/g, '\\n');
  
  if (normCode.includes(normSearch)) {
    return normCode.replace(normSearch, normRep);
  } else {
    console.log("Could not find:\\n", normSearch.substring(0, 100));
    return code; // return original if not found
  }
}

function refactorPaymentVoucher() {
  const file = 'C:/Users/stanl/baseline/client/src/pages/modules/finance/vouchers/PaymentVoucherForm.jsx';
  let code = fs.readFileSync(file, 'utf8');

  // 1. Refactor loadOutstandingBillsForSupplier to take an array of codes
  const loadFuncOld = `  // Function to fetch outstanding bills for a supplier based on account ID
  // Server will: 1) Get account code from fin_accounts, 2) Find supplier by supplier_code, 3) Return outstanding bills
  async function loadOutstandingBillsForSupplier(accountCode) {
    const code = String(accountCode || "").trim();
    if (!code) {
      setOutstandingBills([]);
      setSelectedBillKeys([]);
      return;
    }
    setLoadingBills(true);
    try {
      const res = await api.get("/purchase/bills/outstanding-by-account", {
        params: { account_code: code },
      });
      const bills = Array.isArray(res.data?.items) ? res.data.items : [];
      setOutstandingBills(bills);
      setSelectedBillKeys(prev => prev.filter(key => bills.some(b => \`\${b.source}_\${b.id}\` === key)));
    } catch (e) {
      console.error("[outstanding-bills] Error:", e?.response?.status, e?.response?.data || e?.message || e);
      setOutstandingBills([]);
      setSelectedBillKeys([]);
    } finally {
      setLoadingBills(false);
    }
  }`;

  const loadFuncNew = `  async function loadOutstandingBillsForSupplier(accountCodes) {
    if (!accountCodes || !accountCodes.length) {
      setOutstandingBills([]);
      setSelectedBillKeys([]);
      return;
    }
    setLoadingBills(true);
    try {
      const allBills = [];
      for (const code of accountCodes) {
        if (!code) continue;
        const res = await api.get("/purchase/bills/outstanding-by-account", {
          params: { account_code: String(code).trim() },
        });
        const bills = Array.isArray(res.data?.items) ? res.data.items : [];
        allBills.push(...bills);
      }
      setOutstandingBills(allBills);
      setSelectedBillKeys(prev => prev.filter(key => allBills.some(b => \`\${b.source}_\${b.id}\` === key)));
    } catch (e) {
      console.error("[outstanding-bills] Error:", e?.response?.status, e?.response?.data || e?.message || e);
      setOutstandingBills([]);
      setSelectedBillKeys([]);
    } finally {
      setLoadingBills(false);
    }
  }`;
  
  code = replaceStr(code, loadFuncOld, loadFuncNew);

  // 2. Refactor useEffect that calls it
  const useEffectOld = `  // Load outstanding bills when Paid To account changes in Against Bill mode
  useEffect(() => {
    if (isPAYV && paymentType === "AGAINST_BILL" && pvForm.payToCode) {
      loadOutstandingBillsForSupplier(pvForm.payToCode);
    } else {
      setOutstandingBills([]);
      setSelectedBillKeys([]);
    }
  }, [isPAYV, pvForm.payToCode, paymentType]);`;

  const useEffectNew = `  // Load outstanding bills when Paid To account changes in Against Bill mode
  useEffect(() => {
    if (isPAYV && paymentType === "AGAINST_BILL") {
      const selectedCodes = [...new Set(pvForm.items.filter(i => i.accountId).map(i => {
        const acc = accounts.find(a => String(a.id) === String(i.accountId));
        return acc ? String(acc.code || "") : null;
      }).filter(Boolean))];
      
      if (selectedCodes.length > 0) {
        loadOutstandingBillsForSupplier(selectedCodes);
      } else {
        setOutstandingBills([]);
        setSelectedBillKeys([]);
      }
    } else {
      setOutstandingBills([]);
      setSelectedBillKeys([]);
    }
  }, [isPAYV, paymentType, pvForm.items, accounts]);`;

  code = replaceStr(code, useEffectOld, useEffectNew);

  // 3. Refactor the input and dropdown
  // We want to replace the JSX inside Paid To
  const inputOldRegex = /<input\s+className=\{`input md:w-64 \$\{disabledClass\}`\}\s+placeholder="Type to search accounts"\s+value=\{paidToSearch \|\| pvForm\.payTo \|\| ""\}\s+onChange=\{\(e\) => \{[\s\S]*?disabled=\{readOnly\}\s+\/>\s+\{paidToSearch && paidToSearchResults\.length > 0 && \(\s+<div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto">\s+\{paidToSearchResults\.map\(\(o\) => \(\s+<button[\s\S]*?<\/button>\s+\)\)\}\s+<\/div>\s+\)\}/;

  const inputNew = `<input
                      className={\`input md:w-64 \${disabledClass}\`}
                      placeholder="Type to search accounts"
                      value={paidToSearch || ""}
                      onChange={(e) => setPaidToSearch(e.target.value)}
                      disabled={readOnly}
                    />
                    <div className="text-xs text-slate-500 mt-1">
                      {(() => {
                        const count = new Set(pvForm.items.filter(i => i.accountId).map(i => i.accountId)).size;
                        return count > 0 ? \`\${count} account(s) selected\` : "No accounts selected";
                      })()}
                    </div>
                    {paidToSearch && paidToSearchResults.length > 0 && (
                      <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {paidToSearchResults.map((o) => {
                          const acc = accounts.find((a) => String(a.id) === String(o.value));
                          const isSelected = pvForm.items.some(i => String(i.accountId) === String(o.value));
                          return (
                            <label
                              key={o.value}
                              className="flex items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="mr-2"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    const accountCurrency = acc?.currency_code || acc?.currency || "";
                                    const newItem = {
                                      description: "",
                                      accountId: acc.id,
                                      amount: 0,
                                      currencyCode: accountCurrency,
                                    };
                                    updatePv({
                                      items: (pvForm.items.length === 1 && !pvForm.items[0].accountId)
                                        ? [newItem]
                                        : [...pvForm.items, newItem]
                                    });
                                  } else {
                                    updatePv({
                                      items: pvForm.items.filter(i => String(i.accountId) !== String(o.value))
                                    });
                                  }
                                }}
                                disabled={readOnly}
                              />
                              <span className="text-sm">{o.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}`;

  if (inputOldRegex.test(code)) {
    code = code.replace(inputOldRegex, inputNew);
  } else {
    console.log("Could not find PaidTo JSX input regex!");
  }

  fs.writeFileSync(file, code);
}

function refactorReceiptVoucher() {
  const file = 'C:/Users/stanl/baseline/client/src/pages/modules/finance/vouchers/ReceiptVoucherForm.jsx';
  let code = fs.readFileSync(file, 'utf8');

  // 1. Refactor loadInvoicesForCustomer to take an array of IDs
  const loadFuncOld = `  async function loadInvoicesForCustomer(accountId) {
    const accountIdNum = Number(accountId || 0);
    if (!(accountIdNum > 0)) {
      setCustomerInvoices([]);
      return;
    }
    try {
      const res = await api.get("/sales/invoices/outstanding-by-account", {
        params: { account_id: accountIdNum },
      });
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      const filtered = items
        .filter((x) => {
          const status = String(x.payment_status || "")
            .trim()
            .toUpperCase()
            .replace(/\\s+/g, "_");
          const balance = Number(
            x.balance_amount ?? x.net_amount ?? x.total_amount ?? 0,
          );
          return (
            balance > 0 ||
            status === "UNPAID" ||
            status === "PARTIALLY_PAID" ||
            status === "PARTIAL"
          );
        })
        .map((x) => ({
          ...x,
          source: "SI",
          voucher_no: x.invoice_no || x.voucher_no || "",
          balance_amount:
            x.balance_amount ?? x.net_amount ?? x.total_amount ?? 0,
          currency_code: x.currency_code || x.currency || null,
          payment_status: x.payment_status || "",
        }))
        .sort((a, b) =>
          String(a.invoice_no || "").localeCompare(String(b.invoice_no || "")),
        );
      setCustomerInvoices(filtered);
    } catch {
      setCustomerInvoices([]);
    }
  }`;

  const loadFuncNew = `  async function loadInvoicesForCustomer(accountIds) {
    if (!accountIds || !accountIds.length) {
      setCustomerInvoices([]);
      return;
    }
    try {
      const allInvoices = [];
      for (const aid of accountIds) {
        const accountIdNum = Number(aid || 0);
        if (!(accountIdNum > 0)) continue;
        const res = await api.get("/sales/invoices/outstanding-by-account", {
          params: { account_id: accountIdNum },
        });
        const items = Array.isArray(res.data?.items) ? res.data.items : [];
        allInvoices.push(...items);
      }
      const filtered = allInvoices
        .filter((x) => {
          const status = String(x.payment_status || "")
            .trim()
            .toUpperCase()
            .replace(/\\s+/g, "_");
          const balance = Number(
            x.balance_amount ?? x.net_amount ?? x.total_amount ?? 0,
          );
          return (
            balance > 0 ||
            status === "UNPAID" ||
            status === "PARTIALLY_PAID" ||
            status === "PARTIAL"
          );
        })
        .map((x) => ({
          ...x,
          source: "SI",
          voucher_no: x.invoice_no || x.voucher_no || "",
          balance_amount:
            x.balance_amount ?? x.net_amount ?? x.total_amount ?? 0,
          currency_code: x.currency_code || x.currency || null,
          payment_status: x.payment_status || "",
        }))
        .sort((a, b) =>
          String(a.invoice_no || "").localeCompare(String(b.invoice_no || "")),
        );
      setCustomerInvoices(filtered);
    } catch {
      setCustomerInvoices([]);
    }
  }`;

  code = replaceStr(code, loadFuncOld, loadFuncNew);

  // 2. Refactor useEffect
  const useEffectOld = `  // Fetch outstanding invoices when Against Invoice mode is active and receivedFrom is selected
  useEffect(() => {
    if (isRV && receiptType === "AGAINST_INVOICE" && rvForm.receivedFromAccountId) {
      loadInvoicesForCustomer(rvForm.receivedFromAccountId);
    } else {
      setCustomerInvoices([]);
      setSelectedInvoiceRefs([]);
    }
  }, [isRV, receiptType, rvForm.receivedFromAccountId]);`;

  const useEffectNew = `  // Fetch outstanding invoices when Against Invoice mode is active and receivedFrom is selected
  useEffect(() => {
    if (isRV && receiptType === "AGAINST_INVOICE") {
      const selectedIds = [...new Set(rvForm.items.filter(i => i.accountId).map(i => i.accountId))];
      if (selectedIds.length > 0) {
        loadInvoicesForCustomer(selectedIds);
      } else {
        setCustomerInvoices([]);
        setSelectedInvoiceRefs([]);
      }
    } else {
      setCustomerInvoices([]);
      setSelectedInvoiceRefs([]);
    }
  }, [isRV, receiptType, rvForm.items]);`;

  code = replaceStr(code, useEffectOld, useEffectNew);

  // 3. Refactor input and dropdown for Received From
  const inputOldRegex = /<input\s+className=\{`input md:w-64 \$\{disabledClass\}`\}\s+placeholder="Type to search accounts"\s+value=\{receivedFromSearch \|\| rvForm\.receivedFrom \|\| ""\}\s+onChange=\{\(e\) => \{[\s\S]*?disabled=\{readOnly\}\s+\/>\s+\{receivedFromSearch &&\s+receivedFromSearchResults\.length > 0 && \(\s+<div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto">\s+\{receivedFromSearchResults\.map\(\(o\) => \(\s+<button[\s\S]*?<\/button>\s+\)\)\}\s+<\/div>\s+\)\}/;

  const inputNew = `<input
                        className={\`input md:w-64 \${disabledClass}\`}
                        placeholder="Type to search accounts"
                        value={receivedFromSearch || ""}
                        onChange={(e) => setReceivedFromSearch(e.target.value)}
                        disabled={readOnly}
                      />
                      <div className="text-xs text-slate-500 mt-1">
                        {(() => {
                          const count = new Set(rvForm.items.filter(i => i.accountId).map(i => i.accountId)).size;
                          return count > 0 ? \`\${count} account(s) selected\` : "No accounts selected";
                        })()}
                      </div>
                      {receivedFromSearch &&
                        receivedFromSearchResults.length > 0 && (
                          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-auto">
                            {receivedFromSearchResults.map((o) => {
                              const acc = accounts.find((a) => String(a.id) === String(o.value));
                              const isSelected = rvForm.items.some(i => String(i.accountId) === String(o.value));
                              return (
                                <label
                                  key={o.value}
                                  className="flex items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    className="mr-2"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        const accountCurrency = acc?.currency_code || acc?.currency || "";
                                        const newItem = {
                                          description: "",
                                          accountId: acc.id,
                                          amount: 0,
                                          currencyCode: accountCurrency,
                                        };
                                        updateRv({
                                          items: (rvForm.items.length === 1 && !rvForm.items[0].accountId)
                                            ? [newItem]
                                            : [...rvForm.items, newItem]
                                        });
                                      } else {
                                        updateRv({
                                          items: rvForm.items.filter(i => String(i.accountId) !== String(o.value))
                                        });
                                      }
                                    }}
                                    disabled={readOnly}
                                  />
                                  <span className="text-sm">{o.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}`;

  if (inputOldRegex.test(code)) {
    code = code.replace(inputOldRegex, inputNew);
  } else {
    console.log("Could not find ReceivedFrom JSX input regex!");
  }

  fs.writeFileSync(file, code);
}

try {
  refactorPaymentVoucher();
  refactorReceiptVoucher();
  console.log("Refactoring complete.");
} catch(e) {
  console.error("Error during refactoring:", e);
}
