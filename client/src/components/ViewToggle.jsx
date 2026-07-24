import React from "react";
import { List, Grid } from "lucide-react";

export default function ViewToggle({ viewMode, setViewMode }) {
  return (
    <div
      hidden
      className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 self-center h-10 box-border"
    >
      <button
        type="button"
        onClick={() => setViewMode("table")}
        className={`flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === "table"
            ? "bg-white text-brand shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
        title="List View"
      >
        <List className="w-4 h-4 mr-1.5" />
        List
      </button>
      <button
        type="button"
        onClick={() => setViewMode("grid")}
        className={`flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === "grid"
            ? "bg-white text-brand shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
        title="Grid View"
      >
        <Grid className="w-4 h-4 mr-1.5" />
        Grid
      </button>
    </div>
  );
}
