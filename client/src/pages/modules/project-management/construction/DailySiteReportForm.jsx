/**
 * @file DailySiteReportForm.jsx
 * @description Detailed Daily Site Report (DSR) entry & view form.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  BookOpen,
  Save,
  ArrowLeft,
  CloudSun,
  Users,
  Truck,
  Package,
  CheckSquare,
  Plus,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import { useUoms } from "../../../../hooks/useUoms.js";

export default function DailySiteReportForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const { uoms } = useUoms();
  const [activeSection, setActiveSection] = useState("project");
  const [reportOptions, setReportOptions] = useState({
    working_environments: [],
    operating_statuses: [],
    workforce_categories: [],
  });
  const [projectScopes, setProjectScopes] = useState([]);

  const uomOptions = React.useMemo(() => {
    const fromApi = (Array.isArray(uoms) ? uoms : [])
      .map((u) => u.uom_code || u.code)
      .filter(Boolean);
    const defaults = ["M3", "M2", "M", "KG", "TON", "NR", "SUM", "HRS", "DAY"];
    return Array.from(new Set([...fromApi, ...defaults]));
  }, [uoms]);

  const projectWorkPlans = useMemo(() => {
    const plans = [];
    (Array.isArray(projectScopes) ? projectScopes : []).forEach(
      (scope, scopeIndex) => {
        const scopeName = String(
          scope.scope_name || scope.name || scope.title || "",
        ).trim();
        const workPlans = Array.isArray(scope.wbs_list) ? scope.wbs_list : [];
        workPlans.forEach((workPlan, workPlanIndex) => {
          const code = String(workPlan.wbs || workPlan.wbs_code || "").trim();
          if (!code) return;
          plans.push({
            key: `${scope.id || scopeIndex}:${code}:${workPlanIndex}`,
            code,
            scopeName,
            label: `${code}${scopeName ? ` — ${scopeName}` : ""}`,
            tasks: Array.isArray(workPlan.tasks) ? workPlan.tasks : [],
          });
        });
      },
    );
    return plans;
  }, [projectScopes]);

  const getActivityWorkPlan = (activity) =>
    projectWorkPlans.find(
      (workPlan) =>
        workPlan.key === activity.work_plan_key ||
        (activity.location_grid && workPlan.code === activity.location_grid),
    );

  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const [form, setForm] = useState({
    project_id: searchParams.get("project_id") || "",
    report_date: new Date().toISOString().split("T")[0],
    report_number: "",
    weather_morning: "NORMAL",
    weather_afternoon: "SUNNY",
    site_condition: "NORMAL",
    working_hours_from: "08:00:00",
    working_hours_to: "17:00:00",
    site_engineer_name: "",
    general_remarks: "",
    safety_observations: "",
    status: "DRAFT",
  });

  const [subcontractors, setSubcontractors] = useState([]);

  // Sub-items (clean initial state, no dummy typed data)
  const [activities, setActivities] = useState(
    isEdit
      ? []
      : [
          {
            location_grid: "",
            description: "",
            quantity_completed: "",
            unit: "M3",
            progress_percent: "",
          },
        ],
  );
  const [workforce, setWorkforce] = useState(
    isEdit
      ? []
      : [
          {
            trade_category: "",
            trade_name: "",
            subcontractor_name: "",
            headcount: "",
            total_hours: "",
          },
        ],
  );
  const [equipment, setEquipment] = useState([]);
  const [materials, setMaterials] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/projects/projects", {
          params: { active: "all" },
        });
        const prjs = res.data?.items || [];
        setProjects(prjs);
        // Do not auto-select project if not preselected
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const sRes = await api.get("/purchase/suppliers?contractor=Y");
        const list = sRes.data?.items || sRes.data?.data?.items || [];
        if (list.length > 0) {
          setSubcontractors(list);
        } else {
          const fallback = await api.get("/purchase/suppliers");
          setSubcontractors(
            fallback.data?.items || fallback.data?.data?.items || [],
          );
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    api
      .get("/projects/setup/daily-report-options")
      .then((res) => {
        if (mounted) {
          setReportOptions({
            working_environments: res.data?.working_environments || [],
            operating_statuses: res.data?.operating_statuses || [],
            workforce_categories: res.data?.workforce_categories || [],
          });
          if (!isEdit) {
            setForm((previous) => ({
              ...previous,
              weather_morning: res.data?.working_environments?.some(
                (option) => option.value === previous.weather_morning,
              )
                ? previous.weather_morning
                : res.data?.working_environments?.[0]?.value ||
                  previous.weather_morning,
              weather_afternoon: res.data?.working_environments?.some(
                (option) => option.value === previous.weather_morning,
              )
                ? previous.weather_morning
                : res.data?.working_environments?.[0]?.value ||
                  previous.weather_afternoon,
              site_condition: res.data?.operating_statuses?.some(
                (option) => option.value === previous.site_condition,
              )
                ? previous.site_condition
                : res.data?.operating_statuses?.[0]?.value ||
                  previous.site_condition,
            }));
          }
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!form.project_id) {
      setProjectScopes([]);
      return;
    }
    let mounted = true;
    api
      .get(`/projects/projects/${form.project_id}`)
      .then((res) => {
        if (!mounted) return;
        const project = res.data?.item || res.data?.data || res.data;
        let scopes = project?.scopes || project?.project_scopes || [];
        if (typeof scopes === "string") {
          try {
            scopes = JSON.parse(scopes);
          } catch {
            scopes = [];
          }
        }
        setProjectScopes(Array.isArray(scopes) ? scopes : []);
      })
      .catch(() => {
        if (mounted) setProjectScopes([]);
      });
    return () => {
      mounted = false;
    };
  }, [form.project_id]);

  useEffect(() => {
    if (isEdit) {
      (async () => {
        try {
          const res = await api.get(`/construction/daily-reports/${id}`);
          if (res.data?.item) {
            const itm = res.data.item;
            setForm({
              ...itm,
              report_date: itm.report_date ? itm.report_date.split("T")[0] : "",
            });
            setActivities(res.data.activities || []);
            setWorkforce(res.data.workforce || []);
            setEquipment(res.data.equipment || []);
            setMaterials(res.data.materials || []);
          }
        } catch (e) {
          toast.error("Failed to load daily report");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.project_id) return toast.error("Please select a project");
    if (!form.report_date) return toast.error("Please select a report date");
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/construction/daily-reports/${id}`, {
          ...form,
          activities,
          workforce,
          equipment,
          materials,
        });
        toast.success("Daily project report updated successfully");
      } else {
        await api.post("/construction/daily-reports", {
          ...form,
          activities,
          workforce,
          equipment,
          materials,
        });
        toast.success("Daily project report saved successfully");
      }
      navigate("/project-management/daily-reports");
    } catch (e) {
      toast.error(
        e?.response?.data?.message || "Failed to save daily project report",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-12 text-center text-slate-400">
        Loading daily report...
      </div>
    );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Canonical Form Page Header */}
      <div>
        <Link
          to="/project-management/daily-reports"
          className="btn btn-secondary inline-flex items-center gap-1.5 mb-3"
        >
          <ArrowLeft size={16} /> Back to Daily Reports
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BookOpen
                size={24}
                className="text-brand-900 dark:text-brand-400"
              />
              {isEdit
                ? `Daily Project Report: ${form.report_number || form.report_no || `#${id}`}`
                : "New Daily Project Report Entry"}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 hidden">
              Daily project progress log, team allocation, milestones, and
              activity tracking
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isEdit && (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  form.status === "APPROVED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : form.status === "PENDING_APPROVAL"
                      ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                      : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {form.status || "DRAFT"}
              </span>
            )}
            <Link
              to="/project-management/daily-reports"
              className="btn btn-secondary"
            >
              Cancel
            </Link>
            <button
              onClick={handleSubmit}
              disabled={saving || form.status === "APPROVED"}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Save size={16} />{" "}
              {saving
                ? "Saving..."
                : form.status === "APPROVED"
                  ? "Locked (Approved)"
                  : "Save Daily Report"}
            </button>
          </div>
        </div>
        {form.status === "APPROVED" && (
          <div className="mt-4 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>
              This Daily Project Report is officially approved and certified. To
              modify progress records or team allocations, an authorized user
              must reverse the approval from the Daily Project Report list page.
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <nav
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
          aria-label="Daily report sections"
        >
          {[
            ["project", "Project Context"],
            ["execution", "Work & Workforce"],
            ["observations", "Project Observations, Risks & Remarks"],
          ].map(([section, label], index) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              aria-current={activeSection === section ? "step" : undefined}
              className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${activeSection === section ? "border-brand-700 bg-brand-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"}`}
            >
              <span className="mr-2 opacity-70">{index + 1}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* Basic Project & Environment Metadata */}
        {activeSection === "project" && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 text-brand-900 dark:text-brand-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              <CloudSun size={18} />
              <h2 className="font-bold text-xs uppercase tracking-wider">
                Project Working Environment & Status
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <label className="label text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                  Project
                </label>
                <select
                  className="input w-full"
                  value={form.project_id || ""}
                  onChange={(e) => {
                    setForm({ ...form, project_id: e.target.value });
                    setActivities((previous) =>
                      previous.map((activity) => ({
                        ...activity,
                        work_plan_key: "",
                        location_grid: "",
                        description: "",
                      })),
                    );
                  }}
                  disabled={isEdit}
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name || p.name || p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="label text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                  Report Date
                </label>
                <input
                  type="date"
                  required
                  className="input w-full font-mono"
                  value={form.report_date}
                  onChange={(e) =>
                    setForm({ ...form, report_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="label text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                  Working Environment
                </label>
                <select
                  className="input w-full"
                  value={form.weather_morning}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      weather_morning: e.target.value,
                      weather_afternoon: e.target.value,
                    })
                  }
                >
                  {!reportOptions.working_environments.some(
                    (option) => option.value === form.weather_morning,
                  ) &&
                    form.weather_morning && (
                      <option value={form.weather_morning}>
                        {form.weather_morning}
                      </option>
                    )}
                  {reportOptions.working_environments.length ? (
                    reportOptions.working_environments.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="NORMAL">Normal / Office / Standard</option>
                      <option value="SUNNY">
                        Clear / Field Conditions Ideal
                      </option>
                      <option value="OVERCAST">Cloudy / Subdued</option>
                      <option value="REMOTE">Remote / Hybrid Operations</option>
                      <option value="INCLEMENT">
                        Inclement Weather / Adverse
                      </option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="label text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                  Operating Status
                </label>
                <select
                  className="input w-full"
                  value={form.site_condition}
                  onChange={(e) =>
                    setForm({ ...form, site_condition: e.target.value })
                  }
                >
                  {!reportOptions.operating_statuses.some(
                    (option) => option.value === form.site_condition,
                  ) &&
                    form.site_condition && (
                      <option value={form.site_condition}>
                        {form.site_condition}
                      </option>
                    )}
                  {reportOptions.operating_statuses.length ? (
                    reportOptions.operating_statuses.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="NORMAL">
                        Normal Operations (On Track)
                      </option>
                      <option value="ACCELERATED">
                        Accelerated / Overtime Active
                      </option>
                      <option value="MINOR_DELAY">
                        Minor Delay / Impairment
                      </option>
                      <option value="STANDSTILL">
                        Critical Blocker / Stoppage
                      </option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Workforce & Team Deployment */}
        {activeSection === "execution" && (
          <>
            <div className="card p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex items-center gap-2 text-brand-600">
                  <Users size={18} />
                  <h2 className="font-bold text-xs uppercase tracking-wider">
                    Project Team & Workforce Allocation
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setWorkforce([
                      ...workforce,
                      {
                        trade_category: "",
                        trade_name: "",
                        subcontractor_name: "",
                        headcount: "",
                        total_hours: "",
                      },
                    ])
                  }
                  className="btn btn-secondary text-xs flex items-center gap-1"
                >
                  <Plus size={14} /> Add Team Member / Role
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase">
                    <tr>
                      <th className="p-2">Category</th>
                      <th className="p-2">Role / Title</th>
                      <th className="p-2">Organization / Partner</th>
                      <th className="p-2 text-right w-24">Headcount</th>
                      <th className="p-2 text-right w-24">Total Hours</th>
                      <th className="p-2 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {workforce.map((w, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5">
                          <select
                            className="w-full p-1 border rounded bg-transparent text-sm"
                            value={w.trade_category || ""}
                            onChange={(e) => {
                              const copy = [...workforce];
                              copy[idx].trade_category = e.target.value;
                              setWorkforce(copy);
                            }}
                          >
                            <option value="">Select category</option>
                            {w.trade_category &&
                              !reportOptions.workforce_categories.some(
                                (option) => option.value === w.trade_category,
                              ) && (
                                <option value={w.trade_category}>
                                  {w.trade_category}
                                </option>
                              )}
                            {reportOptions.workforce_categories.map(
                              (option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ),
                            )}
                          </select>
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            className="w-full p-1 border rounded bg-transparent text-sm"
                            placeholder="e.g. Lead Engineer, Analyst, Developer, Site Supervisor..."
                            value={w.trade_name || ""}
                            onChange={(e) => {
                              const copy = [...workforce];
                              copy[idx].trade_name = e.target.value;
                              setWorkforce(copy);
                            }}
                          />
                        </td>
                        <td className="p-1.5">
                          <select
                            className="w-full p-1 border rounded bg-transparent text-sm"
                            value={w.subcontractor_name || ""}
                            onChange={(e) => {
                              const copy = [...workforce];
                              copy[idx].subcontractor_name = e.target.value;
                              setWorkforce(copy);
                            }}
                          >
                            <option value="">
                              -- Select Organization / Direct --
                            </option>
                            <option value="Direct">
                              Direct (Internal Team)
                            </option>
                            {subcontractors
                              .filter(
                                (s) =>
                                  s.is_active === 1 ||
                                  s.is_active === "1" ||
                                  s.is_active === true ||
                                  s.is_active === null ||
                                  s.is_active === undefined,
                              )
                              .map((s) => {
                                const sName = s.supplier_name || s.name;
                                return (
                                  <option key={s.id || sName} value={sName}>
                                    {sName}{" "}
                                    {s.supplier_code
                                      ? `(${s.supplier_code})`
                                      : ""}
                                  </option>
                                );
                              })}
                            {w.subcontractor_name &&
                              w.subcontractor_name !== "Direct" &&
                              !subcontractors.some(
                                (s) =>
                                  (s.supplier_name || s.name) ===
                                  w.subcontractor_name,
                              ) && (
                                <option value={w.subcontractor_name}>
                                  {w.subcontractor_name}
                                </option>
                              )}
                          </select>
                        </td>
                        <td className="p-1.5 text-right">
                          <input
                            type="number"
                            min="0"
                            className="w-full p-1 border rounded text-right bg-transparent font-mono text-sm"
                            placeholder="0"
                            value={w.headcount ?? ""}
                            onChange={(e) => {
                              const val =
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value);
                              const copy = [...workforce];
                              copy[idx].headcount = val;
                              copy[idx].total_hours = val === "" ? "" : val * 8;
                              setWorkforce(copy);
                            }}
                          />
                        </td>
                        <td className="p-1.5 text-right font-mono font-bold text-sm">
                          {w.total_hours ? `${w.total_hours} hrs` : "0 hrs"}
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setWorkforce(
                                workforce.filter((_, i) => i !== idx),
                              )
                            }
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Work Activities & Tasks Executed */}
            <div className="card p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex items-center gap-2 text-brand-600">
                  <CheckSquare size={18} />
                  <h2 className="font-bold text-xs uppercase tracking-wider">
                    Daily Work Activities, Tasks & Progress Logs
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setActivities([
                      ...activities,
                      {
                        location_grid: "",
                        description: "",
                        quantity_completed: "",
                        unit: "HRS",
                        progress_percent: "",
                      },
                    ])
                  }
                  className="btn btn-secondary text-xs flex items-center gap-1"
                >
                  <Plus size={14} /> Add Task / Activity
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase">
                    <tr>
                      <th className="p-2 w-44">Workstream / Scope Ref</th>
                      <th className="p-2">Description of Tasks Executed</th>
                      <th className="p-2 w-24 text-right">QTY</th>
                      <th className="p-2 w-20">UOM</th>
                      <th className="p-2 w-28 text-right">% Complete</th>
                      <th className="p-2 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activities.map((act, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5">
                          <select
                            className="w-full p-1 border rounded bg-transparent text-sm"
                            value={getActivityWorkPlan(act)?.key || ""}
                            onChange={(e) => {
                              const selectedPlan = projectWorkPlans.find(
                                (plan) => plan.key === e.target.value,
                              );
                              const copy = [...activities];
                              copy[idx].work_plan_key = selectedPlan?.key || "";
                              copy[idx].location_grid =
                                selectedPlan?.code || "";
                              copy[idx].description = "";
                              setActivities(copy);
                            }}
                          >
                            <option value="">Select work plan/wbs</option>
                            {act.location_grid &&
                              !projectWorkPlans.some(
                                (workPlan) =>
                                  workPlan.code === act.location_grid,
                              ) && (
                                <option value="">
                                  Previously saved work plan/wbs:{" "}
                                  {act.location_grid}
                                </option>
                              )}
                            {projectWorkPlans.map((workPlan) => (
                              <option key={workPlan.key} value={workPlan.key}>
                                {workPlan.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1.5">
                          <select
                            className="w-full p-1 border rounded bg-transparent text-sm"
                            value={act.description || ""}
                            disabled={!getActivityWorkPlan(act)}
                            onChange={(e) => {
                              const copy = [...activities];
                              copy[idx].description = e.target.value;
                              setActivities(copy);
                            }}
                          >
                            <option value="">
                              {getActivityWorkPlan(act)
                                ? "Select task under work plan/wbs"
                                : "Select a work plan/wbs first"}
                            </option>
                            {act.description &&
                              !getActivityWorkPlan(act)?.tasks.some(
                                (task) =>
                                  String(
                                    task.task_title ||
                                      task.title ||
                                      task.name ||
                                      "",
                                  ) === act.description,
                              ) && (
                                <option value={act.description}>
                                  {act.description} (previously saved)
                                </option>
                              )}
                            {(getActivityWorkPlan(act)?.tasks || []).map(
                              (task, taskIndex) => {
                                const taskTitle = String(
                                  task.task_title ||
                                    task.title ||
                                    task.name ||
                                    "",
                                ).trim();
                                if (!taskTitle) return null;
                                return (
                                  <option
                                    key={task.id || `${taskTitle}-${taskIndex}`}
                                    value={taskTitle}
                                  >
                                    {taskTitle}
                                  </option>
                                );
                              },
                            )}
                          </select>
                        </td>
                        <td className="p-1.5 text-right">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="w-full p-1 border rounded text-right bg-transparent font-mono text-sm"
                            placeholder="0.00"
                            value={act.quantity_completed ?? ""}
                            onChange={(e) => {
                              const val =
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value);
                              const copy = [...activities];
                              copy[idx].quantity_completed = val;
                              setActivities(copy);
                            }}
                          />
                        </td>
                        <td className="p-1.5">
                          <select
                            className="w-full p-1 border rounded bg-transparent text-sm"
                            value={act.unit || "HRS"}
                            onChange={(e) => {
                              const copy = [...activities];
                              copy[idx].unit = e.target.value;
                              setActivities(copy);
                            }}
                          >
                            {uomOptions.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-1.5 text-right">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            className="w-full p-1 border rounded text-right bg-transparent font-mono font-semibold text-sm"
                            placeholder="0"
                            value={act.progress_percent ?? ""}
                            onChange={(e) => {
                              const val =
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value);
                              const copy = [...activities];
                              copy[idx].progress_percent = val;
                              setActivities(copy);
                            }}
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setActivities(
                                activities.filter((_, i) => i !== idx),
                              )
                            }
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Observations, Risks & Remarks */}
        {activeSection === "observations" && (
          <div className="card p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="label text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                  Project Observations, Risks & Blockers
                </label>
                <textarea
                  className="input w-full min-h-[90px]"
                  value={form.safety_observations}
                  onChange={(e) =>
                    setForm({ ...form, safety_observations: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="label text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                  Project Lead / General Remarks
                </label>
                <textarea
                  className="input w-full min-h-[90px]"
                  value={form.general_remarks}
                  onChange={(e) =>
                    setForm({ ...form, general_remarks: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Canonical Form Footer */}
        <div className="flex justify-end items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Link
            to="/project-management/daily-reports"
            className="btn btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Save size={16} /> {saving ? "Saving..." : "Save Daily Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
