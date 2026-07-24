import React from "react";
import { Link } from "react-router-dom";
import { BarChartOutlined } from "@ant-design/icons";

export default function FuelConsumptionReport() {
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header bg-slate-800 text-white rounded-t-lg flex justify-between items-center p-4">
          <div>
            <h1 className="text-2xl font-bold dark:text-slate-100">Fuel Consumption</h1>
            <p className="text-sm mt-1 text-slate-300">Fuel usage across fleet vehicles</p>
          </div>
          <Link to="/transport" className="btn btn-secondary btn-sm">Return to Menu</Link>
        </div>
        <div className="card-body p-12 flex flex-col items-center justify-center text-center bg-slate-50 border-b">
          <BarChartOutlined className="text-6xl text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-600">No Data Available</h2>
          <p className="text-slate-500 max-w-md">There is currently no fuel consumption data available to display for this report. Please check back later.</p>
        </div>
      </div>
    </div>
  );
}
