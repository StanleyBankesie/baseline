import { Activity, Clock, CheckCircle2, Map } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../../../../api/client.js";
import { toast } from "react-toastify";
import { Spin } from "antd";
import DataTable from "../../../../components/common/DataTable.jsx";
import { useViewMode } from "@/hooks/useViewMode";
import ViewToggle from "@/components/ViewToggle";

export default function RoutesList() {
  const [viewMode, setViewMode] = useViewMode();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/transport/routes");
      if (res.data?.success) {
        setRoutes(res.data.data.items || []);
      }
    } catch (err) {
      toast.error("Failed to fetch routes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const toggleRouteStatus = async (id) => {
    try {
      await api.put(`/transport/routes/${id}/toggle`);
      toast.success("Route status updated");
      fetchRoutes();
    } catch (err) {
      toast.error("Failed to update route status");
    }
  };

  const handleAdd = () => {
    navigate("/transport/routes/new");
  };

  const columns = [
    { header: "Route Code", accessor: "route_code" },
    { header: "Route Name", accessor: "route_name", render: (r) => <span className="font-semibold text-brand-700">{r.route_name}</span> },
    { header: "Origin", accessor: "origin" },
    { header: "Destination", accessor: "destination" },
    { header: "Distance", accessor: "distance", render: (r) => r.distance ? `${r.distance} km` : '-' },
    { header: "Estimated Time (hrs)", accessor: "estimated_time", render: (r) => r.estimated_time ? `${r.estimated_time} hrs` : '-' },
    {
      header: "Status",
      accessor: "is_active",
      render: (r) => (
        r.is_active ? (
          <span className="badge badge-success badge-sm">Enabled</span>
        ) : (
          <span className="badge badge-neutral badge-sm">Disabled</span>
        )
      )
    },
    {
      header: "Actions",
      filterable: false,
      sortable: false,
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Link to={`/transport/routes/${r.id}`} className="btn btn-ghost btn-sm text-brand-600">
            <EditOutlined />
          </Link>
          <button 
            className={`btn btn-ghost btn-sm ${r.is_active ? 'text-red-600' : 'text-green-600'}`}
            onClick={() => toggleRouteStatus(r.id)}
            title={r.is_active ? "Disable Route" : "Enable Route"}
          >
            {r.is_active ? "Disable" : "Enable"}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
            {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active Delivery Routes",
            val: (routes || []).filter((x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN").length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total Delivery Routes",
            val: (routes || []).length,
            icon: <Map size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending Delivery Routes",
            val: (routes || []).filter((x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "PENDING_APPROVAL").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed Delivery Routes",
            val: (routes || []).filter((x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "POSTED").length,
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
        <div className="flex justify-between items-center bg-brand p-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Transport Routes</h1>
            <p className="text-brand-100">Manage standard travel routes and distances</p>
          </div>
          <div className="flex gap-2">
            <Link to="/transport" className="btn btn-secondary">
              Return to Menu
            </Link>
            <button className="btn-success" onClick={handleAdd}>
              <PlusOutlined /> New Route
            </button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="p-8 text-center"><Spin size="large" /></div>
          ) : (
            <DataTable data={routes} columns={columns} defaultSortColumn="Route Code" />
          )}
        </div>
      </div>
    </div>
  );
}
