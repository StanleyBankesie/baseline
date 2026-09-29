import React, { useState, useEffect } from "react";
import portalApi from "../api/portalClient.js";
import { Award, BookOpen, CheckCircle2, Clock } from "lucide-react";

export default function PortalTrainingPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi
      .get("/training")
      .then((res) => setRecords(res.data?.records || []))
      .catch((err) => console.error("Failed to load training:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <span>Training & Skill Development</span>
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          View your assigned staff training courses, certifications, and completion history.
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Loading training history...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No assigned training modules found.</div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {records.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-white">{r.title || "Professional Development"}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        r.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {r.status || "IN_PROGRESS"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{r.description || "Course details and curriculum objectives."}</p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-300 block">
                    {r.completion_date ? `Completed: ${r.completion_date}` : "In Progress"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}