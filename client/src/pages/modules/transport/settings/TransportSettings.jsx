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
  const [vehicleTypes, setVehicleTypes] = useState(
    localStorage.getItem("transport_vehicle_types") || "TRUCK, VAN, CAR, MOTORCYCLE"
  );

  const handleSave = () => {
    setLoading(true);
    localStorage.setItem("transport_vehicle_types", vehicleTypes);
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
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text font-semibold">Vehicle Types</span>
              <span className="label-text-alt text-slate-500">Comma separated list</span>
            </label>
            <textarea 
              className="textarea textarea-bordered h-24"
              value={vehicleTypes}
              onChange={(e) => setVehicleTypes(e.target.value)}
              placeholder="e.g. TRUCK, VAN, CAR, MOTORCYCLE"
            ></textarea>
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
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/transport" className="btn-secondary text-sm">
          ← Back
        </Link>
        <h2 className="text-lg font-semibold">Transport Settings</h2>
      </div>

      <div className="flex border-b mb-6 overflow-x-auto">
        {TAB_LABELS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap ${
              activeTab === tab.key
                ? "border-b-2 border-brand text-brand dark:border-brand-500 dark:text-brand-400"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
