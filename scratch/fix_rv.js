const fs = require('fs');

let code = fs.readFileSync('C:/Users/stanl/baseline/client/src/pages/modules/finance/vouchers/ReceiptVoucherForm.jsx', 'utf8');

const oldSelect = `<select
                      className={\`input md:w-64 \${disabledClass}\`}
                      value={selectedInvoiceRefs[0] || ""}
                      onChange={(e) => {
                        const selectedRef = String(e.target.value || "");
                        const chosenList = customerInvoices.filter(
                          (inv) => String(inv.invoice_no) === selectedRef,
                        );
                        setSelectedInvoiceRefs(
                          selectedRef ? [selectedRef] : [],
                        );
                        const items =
                          chosenList.length > 0
                            ? chosenList.map((inv) => ({
                                description: "",
                                accountId: rvForm.payerAccountId || "",
                                amount: Number(inv.balance_amount || 0),
                                referenceNo: String(inv.invoice_no),
                                currencyCode: getAccountCurrencyCode(
                                  rvForm.payerAccountId,
                                ),
                                exchangeRate: "1",
                              }))
                            : [
                                {
                                  description: "",
                                  accountId: rvForm.payerAccountId || "",
                                  amount: 0,
                                  referenceNo: "",
                                  currencyCode: getAccountCurrencyCode(
                                    rvForm.payerAccountId,
                                  ),
                                  exchangeRate: "1",
                                },
                              ];
                        const firstTaxCodeId =
                          chosenList.length > 0
                            ? chosenList[0].tax_code_id || null
                            : null;
                        updateRvForm({
                          items,
                          ...(firstTaxCodeId
                            ? { taxCodeId: String(firstTaxCodeId) }
                            : {}),
                        });
                      }}
                      disabled={readOnly}
                    >
                      <option value="">Select invoice</option>
                      {customerInvoices.map((inv) => (
                        <option key={inv.id} value={inv.invoice_no}>
                          {inv.invoice_no} - Outstanding{" "}
                          {Number(inv.balance_amount || 0).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          )}
                          {inv.payment_status
                            ? \` (\${String(inv.payment_status).replace(/_/g, " ")})\`
                            : ""}
                        </option>
                      ))}
                    </select>`;

const newDiv = `<div className={\`border rounded p-2 md:w-96 min-h-[120px] max-h-[160px] overflow-y-auto bg-white dark:bg-slate-900 \${disabledClass}\`}>
                        {customerInvoices.length === 0 && (
                          <div className="text-slate-500 italic p-2 text-sm">
                            No outstanding invoices
                          </div>
                        )}
                        {customerInvoices.map((inv) => {
                          const key = String(inv.invoice_no);
                          const isChecked = selectedInvoiceRefs.includes(key);
                          return (
                            <label key={key} className="flex items-center space-x-2 p-1 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={readOnly}
                                onChange={(e) => {
                                  let keys = [...selectedInvoiceRefs];
                                  if (e.target.checked) {
                                    keys.push(key);
                                  } else {
                                    keys = keys.filter(k => k !== key);
                                  }
                                  setSelectedInvoiceRefs(keys);
                                  const selectedInvoices = customerInvoices.filter((i) => keys.includes(String(i.invoice_no)));
                                  
                                  const items = selectedInvoices.length > 0
                                    ? selectedInvoices.map((inv) => ({
                                        description: "",
                                        accountId: rvForm.payerAccountId || "",
                                        amount: Number(inv.balance_amount || 0),
                                        referenceNo: String(inv.invoice_no),
                                        currencyCode: getAccountCurrencyCode(rvForm.payerAccountId),
                                        exchangeRate: "1",
                                      }))
                                    : [
                                        {
                                          description: "",
                                          accountId: rvForm.payerAccountId || "",
                                          amount: 0,
                                          referenceNo: "",
                                          currencyCode: getAccountCurrencyCode(rvForm.payerAccountId),
                                          exchangeRate: "1",
                                        },
                                      ];
                                  const firstTaxCodeId = selectedInvoices.length > 0 ? selectedInvoices[0].tax_code_id || null : null;
                                  updateRvForm({
                                    items,
                                    ...(firstTaxCodeId ? { taxCodeId: String(firstTaxCodeId) } : {}),
                                  });
                                }}
                              />
                              <span className="text-sm">
                                {inv.invoice_no} - GH₵ {Number(inv.balance_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                {inv.payment_status ? \` (\${String(inv.payment_status).replace(/_/g, " ")})\` : ""}
                              </span>
                            </label>
                          );
                        })}
                      </div>`;

if (!code.includes(oldSelect)) {
  console.log("Could not find old select in ReceiptVoucherForm");
  // Try regex
  code = code.replace(/<select[\s\S]*?<\/select>/g, (match) => {
    if (match.includes('customerInvoices')) return newDiv;
    return match;
  });
} else {
  code = code.replace(oldSelect, newDiv);
}

// Replace w-64 to w-96 to match the larger width
code = code.replace(/<div className="md:w-64">\s*<label className="label">Outstanding Invoices<\/label>/g, '<div className="md:w-96">\n                    <label className="label">Outstanding Invoices</label>');

fs.writeFileSync('C:/Users/stanl/baseline/client/src/pages/modules/finance/vouchers/ReceiptVoucherForm.jsx', code);
