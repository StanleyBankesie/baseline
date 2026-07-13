import React, { useEffect, useState } from "react";
import api from "../../../../api/client.js";
import { useAuth } from "../../../../auth/AuthContext.jsx";
import { Card, Row, Col, Typography, Statistic, Spin } from "antd";
import { Link } from "react-router-dom";
import TransportReports from "../reports/TransportReports.jsx";

const { Title } = Typography;

export default function TransportDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const { token } = useAuth();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get("/transport/dashboard")
      .then((res) => {
        if (!cancelled && res.data?.success) {
          setStats(res.data.data);
        }
      })
      .catch((err) => {
        console.error("Dashboard stats error:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return <div style={{ padding: 24, textAlign: 'center' }}><Spin size="large" /></div>;
  }

  const renderOverview = () => (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Vehicles" value={stats?.totalVehicles || 0} prefix="🚛" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Drivers" value={stats?.totalDrivers || 0} prefix="🧑‍✈️" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Active Trips" value={stats?.activeTrips || 0} prefix="🚚" />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="Total Fuel Cost" value={`GH₵${Number(stats?.totalFuelCost || 0).toFixed(2)}`} prefix="⛽" />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="Recent Activity">
            <p>Module integration successful. Analytics and charts to be implemented here.</p>
          </Card>
        </Col>
      </Row>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header bg-brand text-white rounded-t-lg">
          <div className="flex justify-between items-center text-white">
            <div>
              <h1 className="text-2xl font-bold dark:text-brand-300">
                Transport Dashboard
              </h1>
              <p className="text-sm mt-1">
                Overview of transport metrics and operations
              </p>
            </div>
            <div className="flex gap-2">
              <Link to="/transport" className="btn btn-secondary">
                Return to Menu
              </Link>
            </div>
          </div>
          <div className="mt-4 border-b border-brand-500">
            <nav className="flex gap-4 px-2">
              <button
                className={`py-2 px-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "overview"
                    ? "border-white text-white"
                    : "border-transparent text-brand-200 hover:text-white hover:border-brand-300"
                }`}
                onClick={() => setActiveTab("overview")}
              >
                Overview
              </button>
              <button
                className={`py-2 px-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "reports"
                    ? "border-white text-white"
                    : "border-transparent text-brand-200 hover:text-white hover:border-brand-300"
                }`}
                onClick={() => setActiveTab("reports")}
              >
                Reports & Analytics
              </button>
            </nav>
          </div>
        </div>
        <div className="card-body p-6 bg-slate-50 dark:bg-slate-900">
          {activeTab === "overview" ? renderOverview() : <TransportReports isTab={true} />}
        </div>
      </div>
    </div>
  );
}
