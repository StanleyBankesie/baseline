import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import api from "../../../../api/client.js";
import { toast } from "react-toastify";
import { Spin } from "antd";

export default function RoutesList() {
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

  const handleAdd = () => {
    navigate("/transport/routes/new");
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header bg-brand text-white rounded-t-lg flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold dark:text-brand-300">
              Transport Routes
            </h1>
            <p className="text-sm mt-1">
              Manage predefined transport routes and standard charges
            </p>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-brand-600 bg-brand-50 border-b border-brand-200">
                <tr>
                  <th className="px-6 py-4 font-bold">Route Code</th>
                  <th className="px-6 py-4 font-bold">Route Name</th>
                  <th className="px-6 py-4 font-bold">Origin</th>
                  <th className="px-6 py-4 font-bold">Destination</th>
                  <th className="px-6 py-4 font-bold">Distance</th>
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
                ) : routes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-4xl mb-2">🛣️</span>
                        <p>No routes found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  routes.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-brand-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium">{r.route_code}</td>
                      <td className="px-6 py-4 font-semibold text-brand-700">{r.route_name}</td>
                      <td className="px-6 py-4">{r.origin}</td>
                      <td className="px-6 py-4">{r.destination}</td>
                      <td className="px-6 py-4">{r.distance_km ? `${r.distance_km} km` : '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/transport/routes/${r.id}`} className="btn btn-ghost btn-sm text-brand-600">
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
