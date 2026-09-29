import React, { useState, useEffect } from "react";
import portalApi from "../api/portalClient.js";
import { Clock, CheckCircle2, AlertCircle, Calendar as CalendarIcon, TrendingUp } from "lucide-react";

export default function PortalAttendancePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clockLoading, setClockLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [todayRecord, setTodayRecord] = useState(null);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await portalApi.get(`/attendance/history?month=${selectedMonth}&year=${selectedYear}`);
      setRecords(res.data?.records || []);
      const todayStr = new Date().toISOString().split("T")[0];
      const today = (res.data?.records || []).find((r) => r.date?.startsWith(todayStr));
      setTodayRecord(today || null);
    } catch (err) {
      console.error("Failed to load attendance history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth, selectedYear]);

  const handleClockIn = async () => {
    setClockLoading(true);
    try {
      await portalApi.post("/attendance/clock-in", { remarks: "Self-Service Clock In" });
      await fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.message || "Clock in failed.");
    } finally {
      setClockLoading(false);
    }
  };

  const handleClockOut = async () => {
    setClockLoading(true);
    try {
      await portalApi.post("/attendance/clock-out", { remarks: "Self-Service Clock Out" });
      await fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.message || "Clock out failed.");
    } finally {
      setClockLoading(false);
    }
  };

  const presentCount = records.filter((r) => ["PRESENT", "LATE", "HALF_DAY"].includes(r.status)).length;
  const lateCount = records.filter((r) => r.status === "LATE").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;

  return (
    <div className="space-y-5">
      {/* Top Banner with Clock In/Out */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-400" />
            <span>Attendance & Shifts</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Log your daily work hours and review monthly punctuality records.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {!todayRecord?.clock_in ? (
            <button
              onClick={handleClockIn}
              disabled={clockLoading}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Clock In Now</span>
            </button>
          ) : !todayRecord?.clock_out ? (
            <button
              onClick={handleClockOut}
              disabled={clockLoading}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Clock className="w-4 h-4" />
              <span>Clock Out Now</span>
            </button>
          ) : (
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
              ✓ Clocked out today ({todayRecord.total_hours} hrs)
            </span>
          )}
        </div>
      </div>

      {/* Month Summary Stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 shadow">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Days Present</span>
          <span className="text-xl font-bold text-emerald-400">{presentCount}</span>
        </div>
        <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 shadow">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Days Late</span>
          <span className="text-xl font-bold text-amber-400">{lateCount}</span>
        </div>
        <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 shadow">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Days Absent</span>
          <span className="text-xl font-bold text-rose-400">{absentCount}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold text-white">Monthly Attendance Log</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {[
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December",
            ].map((m, idx) => (
              <option key={idx} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Attendance Records Table / List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Loading attendance records...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No attendance records logged for this month.</div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {records.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-white">{r.date}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        r.status === "PRESENT"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : r.status === "LATE"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    In: <strong className="text-slate-200">{r.clock_in || "--:--"}</strong> · Out:{" "}
                    <strong className="text-slate-200">{r.clock_out || "--:--"}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-white block">
                    {r.total_hours ? `${r.total_hours} hrs` : "--"}
                  </span>
                  <span className="text-[10px] text-slate-500 line-clamp-1 max-w-[140px]">
                    {r.remarks || "Standard Shift"}
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