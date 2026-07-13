import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import VehiclesList from "../vehicles/VehiclesList.jsx";
import DriversList from "../drivers/DriversList.jsx";

const TAB_LABELS = [
  { key: "general", label: "General Settings" },
  { key: "notifications", label: "Notifications" },
  { key: "vehicles", label: "Vehicles" },
  { key: "drivers", label: "Drivers" },
];

export default function TransportSettings() {
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Transport settings saved successfully");
    }, 1000);
  };

  const renderGeneral = () => (
    <div className="space-y-6 max-w-3xl">
      <div className="card">
        <div className="card-header bg-slate-100 dark:bg-slate-800 rounded-t-lg p-4">
          <h2 className="font-bold text-lg">General Settings</h2>
        </div>
        <div className="card-body p-6 space-y-4">
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Enable GPS Tracking Integration</span> 
              <input type="checkbox" className="toggle toggle-primary" defaultChecked />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Require Pre-Trip Inspections</span> 
              <input type="checkbox" className="toggle toggle-primary" defaultChecked />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Require Post-Trip Inspections</span> 
              <input type="checkbox" className="toggle toggle-primary" />
            </label>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          className={`btn btn-primary ${loading ? "loading" : ""}`}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6 max-w-3xl">
      <div className="card">
        <div className="card-header bg-slate-100 dark:bg-slate-800 rounded-t-lg p-4">
          <h2 className="font-bold text-lg">Notifications</h2>
        </div>
        <div className="card-body p-6 space-y-4">
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Email customer on Dispatch</span> 
              <input type="checkbox" className="checkbox checkbox-primary" defaultChecked />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Email driver on Route Assignment</span> 
              <input type="checkbox" className="checkbox checkbox-primary" defaultChecked />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Alert manager on Over-budget Expenses</span> 
              <input type="checkbox" className="checkbox checkbox-primary" defaultChecked />
            </label>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          className={`btn btn-primary ${loading ? "loading" : ""}`}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "general": return renderGeneral();
      case "notifications": return renderNotifications();
      case "vehicles": return <VehiclesList isTab={true} />;
      case "drivers": return <DriversList isTab={true} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Link
              to="/transport"
              className="btn btn-ghost btn-sm px-2 text-slate-500"
            >
              ← Back to Menu
            </Link>
            Transport Settings
          </h1>
          <p className="text-sm mt-1 ml-11 text-slate-500">
            Configure transport module rules, notifications, vehicles, and drivers.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <nav className="flex flex-col">
              {TAB_LABELS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    w-full flex items-center px-4 py-3 text-sm font-medium border-l-4 transition-colors text-left
                    ${
                      activeTab === tab.key
                        ? "bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-300"
                        : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200"
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
