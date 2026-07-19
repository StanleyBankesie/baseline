const fs = require('fs');

function processFile(file, isReceipt) {
  let code = fs.readFileSync(file, 'utf8');

  if (isReceipt) {
    const oldSelect = `<select
                        multiple
                        className={\`input md:w-96 min-h-[120px] \${disabledClass}\`}
                        value={selectedInvoiceKeys}
                        onChange={(e) => {
                          const keys = Array.from(e.target.selectedOptions, option => option.value);
                          setSelectedInvoiceKeys(keys);
                          const selectedInvoices = outstandingInvoices.filter((inv) => keys.includes(\`\${inv.source}_\${inv.id}\`));
                          // Auto-populate amount if invoices are selected
                          if (selectedInvoices.length > 0) {
                            const totalAmount = selectedInvoices.reduce((sum, inv) => sum + Number(inv.balance_amount || inv.net_amount || 0), 0);
                            updateRv({
                              items: [
                                {
                                  description: \`Receipt for \${selectedInvoices.length} Invoice(s)\`,
                                  accountId: rvForm.receiveFromAccountId || "",
                                  amount: totalAmount,
                                  exchangeRate: "1",
                                  currencyCode: effectiveReceiptCurrencyCode,
                                },
                              ],
                            });
                          } else {
                            updateRv({
                              items: [
                                {
                                  description: "",
                                  accountId: rvForm.receiveFromAccountId || "",
                                  amount: 0,
                                  exchangeRate: "1",
                                  currencyCode: effectiveReceiptCurrencyCode,
                                },
                              ],
                            });
                          }
                        }}
                        disabled={
                          readOnly ||
                          loadingInvoices ||
                          outstandingInvoices.length === 0
                        }
                      >
                        {outstandingInvoices.length === 0 && (
                          <option value="" disabled>
                            {loadingInvoices ? "Loading invoices..." : "No outstanding invoices"}
                          </option>
                        )}
                        {outstandingInvoices.map((inv) => (
                          <option key={\`\${inv.source}_\${inv.id}\`} value={\`\${inv.source}_\${inv.id}\`}>
                            {inv.invoice_no} - GH₵ {Number(inv.balance_amount || inv.net_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({inv.source || "Sales"})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Hold Ctrl (or Cmd) to select multiple invoices.</p>`;

    const newDiv = `<div className={\`border rounded p-2 md:w-96 min-h-[120px] max-h-[160px] overflow-y-auto bg-white dark:bg-slate-900 \${disabledClass}\`}>
                        {outstandingInvoices.length === 0 && (
                          <div className="text-slate-500 italic p-2 text-sm">
                            {loadingInvoices ? "Loading invoices..." : "No outstanding invoices"}
                          </div>
                        )}
                        {outstandingInvoices.map((inv) => {
                          const key = \`\${inv.source}_\${inv.id}\`;
                          const isChecked = selectedInvoiceKeys.includes(key);
                          return (
                            <label key={key} className="flex items-center space-x-2 p-1 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={readOnly || loadingInvoices}
                                onChange={(e) => {
                                  let keys = [...selectedInvoiceKeys];
                                  if (e.target.checked) {
                                    keys.push(key);
                                  } else {
                                    keys = keys.filter(k => k !== key);
                                  }
                                  setSelectedInvoiceKeys(keys);
                                  const selectedInvoices = outstandingInvoices.filter((i) => keys.includes(\`\${i.source}_\${i.id}\`));
                                  if (selectedInvoices.length > 0) {
                                    const totalAmount = selectedInvoices.reduce((sum, i) => sum + Number(i.balance_amount || i.net_amount || 0), 0);
                                    updateRv({
                                      items: [
                                        {
                                          description: \`Receipt for \${selectedInvoices.length} Invoice(s)\`,
                                          accountId: rvForm.receiveFromAccountId || "",
                                          amount: totalAmount,
                                          exchangeRate: "1",
                                          currencyCode: effectiveReceiptCurrencyCode,
                                        },
                                      ],
                                    });
                                  } else {
                                    updateRv({
                                      items: [
                                        {
                                          description: "",
                                          accountId: rvForm.receiveFromAccountId || "",
                                          amount: 0,
                                          exchangeRate: "1",
                                          currencyCode: effectiveReceiptCurrencyCode,
                                        },
                                      ],
                                    });
                                  }
                                }}
                              />
                              <span className="text-sm">
                                {inv.invoice_no} - GH₵ {Number(inv.balance_amount || inv.net_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({inv.source || "Sales"})
                              </span>
                            </label>
                          );
                        })}
                      </div>`;

    if (!code.includes(oldSelect)) {
        console.log("Could not find exact text in " + file);
        code = code.replace(/<select\s+multiple[\s\S]*?<\/select>\s*<p[^>]*>Hold Ctrl[^<]*<\/p>/, newDiv);
    } else {
        code = code.replace(oldSelect, newDiv);
    }
  } else {
    const oldSelect = `<select
                        multiple
                        className={\`input md:w-96 min-h-[120px] \${disabledClass}\`}
                        value={selectedBillKeys}
                        onChange={(e) => {
                          const keys = Array.from(e.target.selectedOptions, option => option.value);
                          setSelectedBillKeys(keys);
                          const selectedBills = outstandingBills.filter((b) => keys.includes(\`\${b.source}_\${b.id}\`));
                          // Auto-populate amount if bills are selected
                          if (selectedBills.length > 0) {
                            const totalAmount = selectedBills.reduce((sum, bill) => sum + Number(bill.balance_amount || bill.net_amount || 0), 0);
                            updatePv({
                              items: [
                                {
                                  description: \`Payment for \${selectedBills.length} Bill(s)\`,
                                  accountId: pvForm.payToAccountId || "",
                                  amount: totalAmount,
                                  exchangeRate: "1",
                                  currencyCode: effectivePaymentCurrencyCode,
                                },
                              ],
                            });
                          } else {
                            updatePv({
                              items: [
                                {
                                  description: "",
                                  accountId: pvForm.payToAccountId || "",
                                  amount: 0,
                                  exchangeRate: "1",
                                  currencyCode: effectivePaymentCurrencyCode,
                                },
                              ],
                            });
                          }
                        }}
                        disabled={
                          readOnly ||
                          loadingBills ||
                          outstandingBills.length === 0
                        }
                      >
                        {outstandingBills.length === 0 && (
                          <option value="" disabled>
                            {loadingBills ? "Loading bills..." : "No outstanding bills"}
                          </option>
                        )}
                        {outstandingBills.map((bill) => (
                          <option key={\`\${bill.source}_\${bill.id}\`} value={\`\${bill.source}_\${bill.id}\`}>
                            {bill.bill_no} - GH₵ {Number(bill.balance_amount || bill.net_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({bill.source || "Purchase"})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500 mt-1">Hold Ctrl (or Cmd) to select multiple bills.</p>`;

    const newDiv = `<div className={\`border rounded p-2 md:w-96 min-h-[120px] max-h-[160px] overflow-y-auto bg-white dark:bg-slate-900 \${disabledClass}\`}>
                        {outstandingBills.length === 0 && (
                          <div className="text-slate-500 italic p-2 text-sm">
                            {loadingBills ? "Loading bills..." : "No outstanding bills"}
                          </div>
                        )}
                        {outstandingBills.map((bill) => {
                          const key = \`\${bill.source}_\${bill.id}\`;
                          const isChecked = selectedBillKeys.includes(key);
                          return (
                            <label key={key} className="flex items-center space-x-2 p-1 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={readOnly || loadingBills}
                                onChange={(e) => {
                                  let keys = [...selectedBillKeys];
                                  if (e.target.checked) {
                                    keys.push(key);
                                  } else {
                                    keys = keys.filter(k => k !== key);
                                  }
                                  setSelectedBillKeys(keys);
                                  const selectedBills = outstandingBills.filter((b) => keys.includes(\`\${b.source}_\${b.id}\`));
                                  if (selectedBills.length > 0) {
                                    const totalAmount = selectedBills.reduce((sum, b) => sum + Number(b.balance_amount || b.net_amount || 0), 0);
                                    updatePv({
                                      items: [
                                        {
                                          description: \`Payment for \${selectedBills.length} Bill(s)\`,
                                          accountId: pvForm.payToAccountId || "",
                                          amount: totalAmount,
                                          exchangeRate: "1",
                                          currencyCode: effectivePaymentCurrencyCode,
                                        },
                                      ],
                                    });
                                  } else {
                                    updatePv({
                                      items: [
                                        {
                                          description: "",
                                          accountId: pvForm.payToAccountId || "",
                                          amount: 0,
                                          exchangeRate: "1",
                                          currencyCode: effectivePaymentCurrencyCode,
                                        },
                                      ],
                                    });
                                  }
                                }}
                              />
                              <span className="text-sm">
                                {bill.bill_no} - GH₵ {Number(bill.balance_amount || bill.net_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({bill.source || "Purchase"})
                              </span>
                            </label>
                          );
                        })}
                      </div>`;

    if (!code.includes(oldSelect)) {
        console.log("Could not find exact text in " + file);
        code = code.replace(/<select\s+multiple[\s\S]*?<\/select>\s*<p[^>]*>Hold Ctrl[^<]*<\/p>/, newDiv);
    } else {
        code = code.replace(oldSelect, newDiv);
    }
  }

  fs.writeFileSync(file, code);
}

processFile('C:/Users/stanl/baseline/client/src/pages/modules/finance/vouchers/PaymentVoucherForm.jsx', false);
processFile('C:/Users/stanl/baseline/client/src/pages/modules/finance/vouchers/ReceiptVoucherForm.jsx', true);
