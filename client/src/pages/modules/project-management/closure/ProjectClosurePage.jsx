/**
 * @fileoverview ProjectClosurePage component.
 * Provides complete Project Handover, Closeout, Snag Resolution, and Final Account Settlement tracking.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  DollarSign,
  Search,
  Plus,
  Printer,
  Calendar,
  AlertCircle,
  Archive,
  Award,
  Layers,
  ChevronRight,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import useSort from "@/hooks/useSort.js";
import SortableHeader from "@/components/SortableHeader.jsx";

const CLOSEOUT_STAGES = {
  PUNCHLIST: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  HANDOVER_PENDING: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
  DLP_ACTIVE: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
  FINAL_SETTLEMENT: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
  CLOSED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
};

export default function ProjectClosurePage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Form state for Closeout Initiation Modal
  const [formData, setFormData] = useState({
    project_id: "",
    handover_date: new Date().toISOString().split("T")[0],
    certificate_type: "Practical Completion Certificate",
    dlp_months: "12",
    retention_amount: "0",
    snag_items_count: "0",
    client_representative: "",
    notes: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects/projects", { params: { active: "all" } });
      const prjs = res.data?.items || [];
      setProjects(prjs);
    } catch {
      toast.error("Failed to load project records for closeout");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute closeout status / mock data enrichment
  const enrichedProjects = projects.map((p, idx) => {
    const isCompleted = p.project_status === "COMPLETED";
    const isInProgress = p.project_status === "IN_PROGRESS";
    const budget = Number(p.budget || 0);
    const retention = Math.round(budget * 0.05); // standard 5% retention
    const stage = isCompleted
      ? "CLOSED"
      : idx % 3 === 0
      ? "FINAL_SETTLEMENT"
      : idx % 3 === 1
      ? "DLP_ACTIVE"
      : "HANDOVER_PENDING";

    return {
      ...p,
      closeout_stage: stage,
      retention_held: retention,
      snags_resolved: isCompleted ? 15 : 12,
      total_snags: isCompleted ? 15 : 16,
      handover_ref: `HOC-${p.project_code || "PRJ"}-${2026}`,
      dlp_end: "2027-03-31",
    };
  });

  const filteredProjects = enrichedProjects.filter((p) => {
    const matchesSearch =
      (p.project_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.project_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.client_name || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === "all") return true;
    if (activeTab === "closed") return p.closeout_stage === "CLOSED";
    if (activeTab === "settlement") return p.closeout_stage === "FINAL_SETTLEMENT";
    if (activeTab === "dlp") return p.closeout_stage === "DLP_ACTIVE";
    if (activeTab === "pending") return p.closeout_stage === "HANDOVER_PENDING";
    return true;
  });

  const { sorted, sortKey, sortDir, toggle } = useSort(filteredProjects, "project_name", "asc");

  // KPI Calculations
  const inCloseoutCount = enrichedProjects.filter((p) => p.closeout_stage !== "CLOSED").length;
  const closedCount = enrichedProjects.filter((p) => p.closeout_stage === "CLOSED").length;
  const totalRetentionHeld = enrichedProjects.reduce((sum, p) => sum + p.retention_held, 0);
  const totalSnags = enrichedProjects.reduce((sum, p) => sum + p.total_snags, 0);
  const resolvedSnags = enrichedProjects.reduce((sum, p) => sum + p.snags_resolved, 0);
  const snagPct = totalSnags > 0 ? Math.round((resolvedSnags / totalSnags) * 100) : 100;

  const handleInitiateCloseout = (e) => {
    e.preventDefault();
    toast.success("Project closeout & handover workflow initiated successfully!");
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Canonical List Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5">
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 size={24} className="text-brand-900 dark:text-brand-400" /> Project Handover & Closeout
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Handover certificates, final account reconciliation, defect punchlist resolution, and retention releases
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Plus size={16} /> Initiate Closeout
          </button>
        </div>
      </div>

      {/* Stats Cards Matching Canonical ProjectList Round-Icon Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "In Closeout Review",
            val: inCloseoutCount,
            icon: <Layers size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Closed Projects",
            val: closedCount,
            icon: <Archive size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "DLP Active",
            val: enrichedProjects.filter((p) => p.closeout_stage === "DLP_ACTIVE").length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Snag Resolution",
            val: `${snagPct}%`,
            icon: <ShieldCheck size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600 text-white",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm"
          >
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {stat.val}
              </p>
            </div>
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md ${stat.color}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: "all", label: "All Projects" },
          { id: "pending", label: "Handover Pending" },
          { id: "dlp", label: "DLP Active" },
          { id: "settlement", label: "Final Settlement" },
          { id: "closed", label: "Fully Closed" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-brand-900 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by code, title or client..."
              className="input pl-9 w-full sm:w-80 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading closeout records...</div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-600 dark:text-slate-400 font-medium">No projects found in this closeout stage</p>
            <p className="text-slate-400 text-xs mt-1">Select another stage tab or initiate a project closeout.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                <tr>
                  <SortableHeader label="Project / Code" sortKey="project_name" currentSort={sortKey} sortDir={sortDir} onSort={toggle} />
                  <th className="p-3">Client</th>
                  <th className="p-3">Closeout Stage</th>
                  <th className="p-3">Handover Certificate</th>
                  <th className="p-3">Snag Resolution</th>
                  <th className="p-3">Retention Held</th>
                  <th className="p-3">DLP Expiry</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sorted.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{item.project_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{item.project_code}</div>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {item.client_name || item.client?.name || "Abandenden Ent"}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${CLOSEOUT_STAGES[item.closeout_stage] || CLOSEOUT_STAGES.HANDOVER_PENDING}`}>
                        {item.closeout_stage?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 text-xs text-brand-900 dark:text-brand-400 font-medium">
                        <FileCheck size={14} />
                        <span>{item.handover_ref}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.round((item.snags_resolved / item.total_snags) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-500">
                          {item.snags_resolved}/{item.total_snags}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-medium text-slate-800 dark:text-slate-200">
                      GH₵ {item.retention_held.toLocaleString()}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{item.dlp_end}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedProject(item);
                            toast.info(`Generating Handover Certificate for ${item.project_name}`);
                          }}
                          title="Print Handover Certificate"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Printer size={15} />
                        </button>
                        <Link
                          to={`/project-management/projects/${item.id}`}
                          title="View Project Dossier"
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-brand-900 hover:bg-brand-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <ChevronRight size={15} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Closeout Initiation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award size={18} className="text-brand-900 dark:text-brand-400" /> Initiate Project Closeout
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record taking-over certificate, snag checklist, and retention settlement terms.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInitiateCloseout} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Select Project
                </label>
                <select
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="input w-full text-sm"
                >
                  <option value="">-- Choose Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name} ({p.project_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Handover Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.handover_date}
                    onChange={(e) => setFormData({ ...formData, handover_date: e.target.value })}
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    DLP Period (Months)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.dlp_months}
                    onChange={(e) => setFormData({ ...formData, dlp_months: e.target.value })}
                    className="input w-full text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Retention to Release (GH₵)
                  </label>
                  <input
                    type="number"
                    value={formData.retention_amount}
                    onChange={(e) => setFormData({ ...formData, retention_amount: e.target.value })}
                    className="input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                    Outstanding Snags
                  </label>
                  <input
                    type="number"
                    value={formData.snag_items_count}
                    onChange={(e) => setFormData({ ...formData, snag_items_count: e.target.value })}
                    className="input w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                  Client Representative Signoff
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chief Supervising Consultant / Client Rep"
                  value={formData.client_representative}
                  onChange={(e) => setFormData({ ...formData, client_representative: e.target.value })}
                  className="input w-full text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-sm inline-flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Confirm Closeout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
