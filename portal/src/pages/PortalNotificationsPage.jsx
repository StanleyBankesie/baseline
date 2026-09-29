import React, { useState, useEffect } from "react";
import portalApi from "../api/portalClient.js";
import { Bell, CheckCircle2, AlertCircle, Clock, CheckCheck, Trash2 } from "lucide-react";

export default function PortalNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await portalApi.get("/requests");
      const list = (res.data?.requests || []).map((r) => ({
        id: r.id,
        title: `HR Request Update: ${r.subject}`,
        body: `Your request status has been updated to ${r.status}.`,
        time: r.created_at?.split("T")[0],
        type: r.status === "APPROVED" ? "SUCCESS" : r.status === "REJECTED" ? "ERROR" : "INFO",
        read: false,
      }));

      // Add default welcome notification
      list.unshift({
        id: 999,
        title: "Welcome to OmniSuite Employee Self-Service",
        body: "Your mobile portal is active. You can track attendance, apply for leave, and view payslips here.",
        time: new Date().toISOString().split("T")[0],
        type: "SUCCESS",
        read: true,
      });

      setNotifications(list);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-5">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-400" />
            <span>Notification Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Leave approvals, payroll notifications, and corporate updates.
          </p>
        </div>

        <button
          onClick={markAllRead}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
        >
          <CheckCheck className="w-4 h-4 text-teal-400" />
          <span>Mark All as Read</span>
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No notifications yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-3 transition-colors ${
                  n.read ? "bg-slate-900/30" : "bg-slate-900/90"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      n.type === "SUCCESS"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : n.type === "ERROR"
                        ? "bg-rose-500/10 text-rose-400"
                        : "bg-teal-500/10 text-teal-400"
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className={`text-xs font-bold ${n.read ? "text-slate-300" : "text-white"}`}>
                      {n.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{n.body}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">{n.time}</span>
                  </div>
                </div>

                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}