import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PlusOutlined, EyeOutlined } from "@ant-design/icons";
import api from "../../../../api/client.js";
import { toast } from "react-toastify";

export default function BillingList() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await api.get("/transport/billing");
      if (res.data?.success) {
        setBills(res.data.data.items || []);
      }
    } catch (err) {
      toast.error("Failed to fetch billing data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const columns = [
    { title: "Invoice #", dataIndex: "invoice_number", key: "invoice_number" },
    { title: "Invoice Date", dataIndex: "invoice_date", key: "invoice_date", render: d => d ? d.split('T')[0] : '' },
    { title: "Amount", dataIndex: "total_amount", key: "total_amount", render: v => `GH₵${v}` },
    { 
      title: "Status", dataIndex: "status", key: "status",
      render: (status) => (
        <Tag color={status === 'DRAFT' ? 'default' : status === 'SENT' ? 'processing' : status === 'PAID' ? 'success' : 'error'}>
          {status || 'DRAFT'}
        </Tag>
      )
    },
    {
      title: "Actions", key: "actions",
      render: (_, r) => (
        <Space>
          <Button size="small" type="primary" ghost icon={<EyeOutlined />} />
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header bg-brand text-white rounded-t-lg flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold dark:text-brand-300">
              Transport Billing
            </h1>
            <p className="text-sm mt-1">
              Manage transport invoices and billing
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/transport" className="btn btn-secondary">
              Return to Menu
            </Link>
            <button className="btn-success" onClick={() => console.log("Feature under construction")}>
              <PlusOutlined /> Create Invoice
            </button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-brand-600 bg-brand-50 border-b border-brand-200">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase">Invoice #</th>
                  <th className="px-6 py-4 font-semibold uppercase">Date</th>
                  <th className="px-6 py-4 font-semibold uppercase">Amount</th>
                  <th className="px-6 py-4 font-semibold uppercase">Status</th>
                  <th className="px-6 py-4 font-semibold uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                      Loading billing data...
                    </td>
                  </tr>
                ) : bills.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                      No invoices found
                    </td>
                  </tr>
                ) : (
                  bills.map((b) => (
                    <tr
                      key={b.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium">{b.invoice_number}</td>
                      <td className="px-6 py-4">{b.invoice_date ? b.invoice_date.split('T')[0] : ''}</td>
                      <td className="px-6 py-4 font-semibold">GH₵{b.total_amount}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          b.status === 'DRAFT' ? 'bg-slate-100 text-slate-800' :
                          b.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                          b.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {b.status || 'DRAFT'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="btn btn-ghost btn-sm text-brand-600">
                            <EyeOutlined />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
