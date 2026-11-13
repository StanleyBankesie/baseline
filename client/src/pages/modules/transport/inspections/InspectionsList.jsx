import { Activity, Clock, CheckCircle2, CheckSquare } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusOutlined, EditOutlined, DeleteOutlined, FileSearchOutlined } from "@ant-design/icons";
import api from "../../../../api/client.js";
import { toast } from "react-toastify";
import { Spin } from "antd";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

export default function InspectionsList() {
  const [viewMode, setViewMode] = useViewMode();
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const res = await api.get("/transport/inspections");
      if (res.data?.success) {
        setInspections(res.data.data.items || []);
      }
    } catch (err) {
      toast.error("Failed to fetch inspections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const handleAdd = () => {
    navigate("/transport/inspections/new");
  };

  return (
    <div className="space-y-4">
            {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Pre-Trip Inspections",
            val: (inspections || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Pre-Trip Inspections",
            val: (inspections || []).length,
            icon: <CheckSquare size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Pre-Trip Inspections",
            val: (inspections || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "PENDING_APPROVAL").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Pre-Trip Inspections",
            val: (inspections || []).filter((x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "POSTED").length,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600 text-white",
          },
        ].map((stat, i) => (
          <div key={i} className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {stat.val}
              </p>
            </div>
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md ${stat.color}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header bg-brand text-white rounded-t-lg flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold dark:text-brand-300">
              Vehicle Inspections
            </h1>
            <p className="text-sm mt-1">
              Manage pre-trip and post-trip vehicle inspections
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/transport" className="btn btn-secondary">
              Return to Menu
            </Link>
            <button className="btn-success" onClick={handleAdd}>
              <PlusOutlined /> New Inspection
            </button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-body p-0">
          
                <div className="flex justify-end mb-4">
                  <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                </div>
                <div className="overflow-x-auto">
            <table className={ "w-full text-sm text-left " + (viewMode === 'grid' ? 'table-grid-mode' : '') }>
              <thead className="text-xs text-brand-600 bg-brand-50 border-b border-brand-200">
                <tr>
                  <th className="px-6 py-4 font-bold">Date</th>
                  <th className="px-6 py-4 font-bold">Vehicle</th>
                  <th className="px-6 py-4 font-bold">Type</th>
                  <th className="px-6 py-4 font-bold">Inspector</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center">
                      <Spin size="large" />
                    </td>
                  </tr>
                ) : inspections.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <FileSearchOutlined className="text-4xl mb-2" />
                        <p>No inspections found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  inspections.map((i) => (
                    <tr
                      key={i.id}
                      className="hover:bg-brand-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium">{i.inspection_date ? i.inspection_date.split('T')[0] : ''}</td>
                      <td className="px-6 py-4">{i.vehicle_reg}</td>
                      <td className="px-6 py-4">{i.inspection_type}</td>
                      <td className="px-6 py-4">{i.inspector_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          i.status === 'PASSED' ? 'bg-green-100 text-green-800' :
                          i.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {i.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/transport/inspections/${i.id}`} className="btn btn-ghost btn-sm text-brand-600">
                            <EditOutlined />
                          </Link>
                          <button className="btn btn-ghost btn-sm text-red-600">
                            <DeleteOutlined />
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
