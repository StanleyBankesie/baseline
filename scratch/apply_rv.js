const fs = require('fs');

function replaceStr(code, search, replacement) {
  const normCode = code.replace(/\\r\\n/g, '\\n');
  const normSearch = search.replace(/\\r\\n/g, '\\n');
  const normRep = replacement.replace(/\\r\\n/g, '\\n');
  
  if (normCode.includes(normSearch)) {
    return normCode.replace(normSearch, normRep);
  } else {
    console.log("Could not find:\\n", normSearch.substring(0, 100));
    return code;
  }
}

function applyRv() {
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
            status === "PARTIAL_PAYMENT"
          );
        })
        .map((x) => ({
          id: x.id,
          invoice_no: x.invoice_no,
          balance_amount: Number(
            x.balance_amount ?? x.net_amount ?? x.total_amount ?? 0,
          ),
          total_amount: Number(x.total_amount || x.net_amount || 0),
          tax_code_id: x.tax_code_id || null,
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
            status === "PARTIAL_PAYMENT"
          );
        })
        .map((x) => ({
          id: x.id,
          invoice_no: x.invoice_no,
          balance_amount: Number(
            x.balance_amount ?? x.net_amount ?? x.total_amount ?? 0,
          ),
          total_amount: Number(x.total_amount || x.net_amount || 0),
          tax_code_id: x.tax_code_id || null,
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
  const useEffectOld = `  useEffect(() => {
    if (!isRV) return;
    if (!rvForm.payerAccountId) {
      setCustomerInvoices([]);
      return;
    }
    loadInvoicesForCustomer(rvForm.payerAccountId);
  }, [isRV, rvForm.payerAccountId]);`;

  const useEffectNew = `  useEffect(() => {
    if (!isRV) return;
    const selectedIds = [...new Set(rvForm.items.filter(i => i.accountId).map(i => i.accountId))];
    if (selectedIds.length === 0) {
      setCustomerInvoices([]);
      return;
    }
    loadInvoicesForCustomer(selectedIds);
  }, [isRV, rvForm.items]);`;

  code = replaceStr(code, useEffectOld, useEffectNew);

  // 3. Refactor input and dropdown for Received From
  const inputOldRegex = /<label className="label">Received From<\/label>[\s\S]*?<label className="label">Payment Method<\/label>/;

  const inputNew = `<label className="label">Received From</label>
                  <div className="relative">
                    <input
                      className={\`input w-64 \${disabledClass}\`}
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
                                        amount: "",
                                        referenceNo: "",
                                        currencyCode: accountCurrency,
                                        exchangeRate: "1",
                                      };
                                      updateRvForm({
                                        items: (rvForm.items.length === 1 && !rvForm.items[0].accountId)
                                          ? [newItem]
                                          : [...rvForm.items, newItem]
                                      });
                                    } else {
                                      updateRvForm({
                                        items: rvForm.items.filter(i => String(i.accountId) !== String(o.value))
                                      });
                                    }
                                  }}
                                  disabled={readOnly}
                                />
                                <span className="text-sm">
                                  {o.label} {o.code ? \`(\${o.code})\` : ""}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                  </div>
                </div>
                <div className="md:w-64">
                  <label className="label">Payment Method</label>`;

  if (inputOldRegex.test(code)) {
    code = code.replace(inputOldRegex, inputNew);
  } else {
    console.log("Could not find ReceivedFrom regex!");
  }

  fs.writeFileSync(file, code);
}

applyRv();
