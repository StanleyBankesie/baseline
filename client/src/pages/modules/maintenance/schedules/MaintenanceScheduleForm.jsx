/**
 * @fileoverview MaintenanceScheduleForm component.
 * Provides functionality for MaintenanceScheduleForm.
 */

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { api } from "../../../../api/client";

const FREQUENCIES = [
  "Daily",
  "Weekly",
  "Biweekly",
  "Monthly",
  "Quarterly",
  "Biannual",
  "Annual",
];
const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"];

/**
 *  component
 *
 * @returns {JSX.Element} The rendered component
 */
export default function MaintenanceScheduleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [form, setForm] = useState({
    schedule_name: "",
    asset_name: "",
    frequency: "Monthly",
    start_date: "",
    classification: "",
    category: "",
    group_name: "",
    maintenance_days: "",
    assigned_to: "",
    description: "",
    status: "ACTIVE",
  });
  const [equipment, setEquipment] = useState([]);
  const [teams, setTeams] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [saving, setSaving] = useState(false);
  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const selectedClass = classifications.find(
    (c) => c.item_name === form.classification,
  );
  const filteredCategories = selectedClass
    ? categories.filter((c) => c.parent_id === selectedClass.id)
    : [];

  const selectedCat = categories.find((c) => c.item_name === form.category);
  const filteredGroups = selectedCat
    ? groups.filter((g) => g.parent_id === selectedCat.id)
    : [];

  const handleDayChange = (day, isChecked) => {
    // kept for backward compatibility but not used with select
  };

  useEffect(() => {
    let m = true;
    Promise.all([
      api.get("/maintenance/equipment"),
      api.get("/maintenance/setup/catalog"),
    ])
      .then(([eqRes, setupRes]) => {
        if (m) {
          setEquipment(
            Array.isArray(eqRes.data?.items) ? eqRes.data.items : [],
          );
          setTeams(setupRes.data?.catalogs?.teams || []);
          setClassifications(setupRes.data?.catalogs?.classifications || []);
          setCategories(setupRes.data?.catalogs?.categories || []);
          setGroups(setupRes.data?.catalogs?.groups || []);
        }
      })
      .catch(() => {});
    if (isEdit)
      api
        .get(`/maintenance/schedules/${id}`)
        .then((r) => {
          const item = r.data?.item || {};
          if (m)
            setForm((p) => ({
              ...p,
              ...item,
              start_date: (item.start_date || "").slice(0, 10),
            }));
        })
        .catch(() => toast.error("Failed to load"));
    return () => {
      m = false;
    };
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.schedule_name) {
      toast.error("Schedule name is required");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/maintenance/schedules/${id}`, form);
        toast.success("Schedule updated");
      } else {
        await api.post("/maintenance/schedules", form);
        toast.success("Schedule created");
      }
      navigate("/maintenance/schedules", { state: { refresh: true } });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/maintenance/schedules" className="btn-secondary">
          ← Back
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isEdit ? "Edit" : "New"} Maintenance Schedule
          </h1>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card">
          <div className="card-header bg-brand text-white rounded-t-lg font-semibold">
            Schedule Details
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="label">Schedule Name *</label>
              <input
                className="input w-56"
                value={form.schedule_name}
                onChange={(e) => update("schedule_name", e.target.value)}
                placeholder="e.g. Monthly Generator Service"
                required
              />
            </div>
            <div>
              <label className="label">Classification</label>
              <select
                className="input w-56"
                value={form.classification}
                onChange={(e) => {
                  update("classification", e.target.value);
                  update("category", ""); // reset child
                  update("group_name", ""); // reset grand-child
                }}
              >
                <option value="">-- Select Classification --</option>
                {classifications.map((c) => (
                  <option key={c.id} value={c.item_name}>
                    {c.item_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input w-56"
                value={form.category}
                onChange={(e) => {
                  update("category", e.target.value);
                  update("group_name", ""); // reset child
                }}
                disabled={!form.classification}
              >
                <option value="">-- Select Category --</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.item_name}>
                    {c.item_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Group</label>
              <select
                className="input w-56"
                value={form.group_name}
                onChange={(e) => update("group_name", e.target.value)}
                disabled={!form.category}
              >
                <option value="">-- Select Group --</option>
                {filteredGroups.map((g) => (
                  <option key={g.id} value={g.item_name}>
                    {g.item_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Equipment / Asset</label>
              <select
                className="input w-56"
                value={form.asset_name}
                onChange={(e) => update("asset_name", e.target.value)}
              >
                <option value="">-- Select --</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.equipment_name}>
                    {eq.equipment_code} – {eq.equipment_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Frequency</label>
              <select
                className="input w-56"
                value={form.frequency}
                onChange={(e) => update("frequency", e.target.value)}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input
                className="input w-56"
                type="date"
                value={form.start_date}
                onChange={(e) => update("start_date", e.target.value)}
              />
            </div>

            <div>
              <label className="label">Assigned To</label>
              <select
                className="input w-56"
                value={form.assigned_to}
                onChange={(e) => update("assigned_to", e.target.value)}
              >
                <option value="">-- Select Team --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.item_name}>
                    {t.item_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input w-56"
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="card-body">
            <div>
              <label className="label">Maintenance Day</label>
              <select
                className="input w-56"
                value={form.maintenance_days}
                onChange={(e) => update("maintenance_days", e.target.value)}
              >
                <option value="">-- Select Day --</option>
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* <div className="card-header bg-brand text-white font-semibold mt-4">
            Maintenance Days
          </div> */}
        </div>

        <div className="card">
          <div className="card-body">
            <label className="label">Description</label>
            <textarea
              className="input w-full"
              rows={6}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Link to="/maintenance/schedules" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      </form>
    </div>
  );
}
