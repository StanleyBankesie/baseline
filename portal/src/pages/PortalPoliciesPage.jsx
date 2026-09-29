import React, { useState, useEffect } from "react";
import portalApi from "../api/portalClient.js";
import { Shield, CheckCircle2, Search, FileText, Download } from "lucide-react";

export default function PortalPoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ackLoading, setAckLoading] = useState(null);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const res = await portalApi.get("/policies");
      setPolicies(res.data?.policies || []);
    } catch (err) {
      console.error("Failed to load company policies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleAcknowledge = async (pId) => {
    setAckLoading(pId);
    try {
      await portalApi.post("/policies/acknowledge", { policy_id: pId });
      await fetchPolicies();
    } catch (err) {
      alert("Failed to record acknowledgement.");
    } finally {
      setAckLoading(null);
    }
  };

  const filtered = policies.filter(
    (p) =>
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-400" />
            <span>Company Policies & Handbook</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Review organizational guidelines, code of conduct, and sign acknowledgements.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search policies..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Policies List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs animate-pulse">Loading policies...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No active policies found.</div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filtered.map((p) => (
              <div key={p.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                      {p.code || "CP-001"}
                    </span>
                    <h4 className="text-sm font-bold text-white">{p.title}</h4>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{p.content || "Company policy guidelines and standard operating procedures."}</p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  {p.attachment_url && (
                    <a
                      href={p.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </a>
                  )}

                  {p.acknowledged_at ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Acknowledged</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(p.id)}
                      disabled={ackLoading === p.id}
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow transition-all cursor-pointer disabled:opacity-50"
                    >
                      {ackLoading === p.id ? "Saving..." : "Acknowledge"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}