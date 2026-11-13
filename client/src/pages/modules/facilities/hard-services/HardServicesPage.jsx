import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, Plus, Filter, RefreshCw, ArrowLeft, Server, AlertTriangle, CalendarClock, WifiOff, Search, Pencil, Eye, X, History, Activity, Clock, ShieldCheck, CheckCircle2, ChevronRight, Calendar, UserCheck, RotateCcw, Cog } from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

// ─── Helpers ────────────────────────────────────────────────────────────────

const CRITICALITY_COLORS = {
  MISSION_CRITICAL: "bg-rose-100   text-rose-700   dark:bg-rose-950   dark:text-rose-300",
  HIGH:             "bg-amber-100  text-amber-700  dark:bg-amber-950  dark:text-amber-300",
  MEDIUM:           "bg-blue-100   text-blue-700   dark:bg-blue-950   dark:text-blue-300",
  LOW:              "bg-slate-100  text-slate-600  dark:bg-slate-800  dark:text-slate-300",
};

const OP_STATUS_COLORS = {
  OPERATIONAL:       "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  DEGRADED:          "bg-amber-100   text-amber-700   dark:bg-amber-950   dark:text-amber-300",
  OFFLINE:           "bg-rose-100    text-rose-700    dark:bg-rose-950    dark:text-rose-300",
  UNDER_MAINTENANCE: "bg-blue-100    text-blue-700    dark:bg-blue-950    dark:text-blue-300",
};

const CATEGORY_COLORS = {
  ELECTRICAL:        "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
  HVAC:              "bg-sky-100    text-sky-700    dark:bg-sky-950    dark:text-sky-300",
  PLUMBING:          "bg-cyan-100   text-cyan-700   dark:bg-cyan-950   dark:text-cyan-300",
  GENERATOR_POWER:   "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  ELEVATOR_ESCALATOR:"bg-violet-100 text-emerald-700 dark:bg-emerald-950 dark:text-violet-300",
  FIRE_SAFETY:       "bg-rose-100   text-rose-700   dark:bg-rose-950   dark:text-rose-300",
  WATER_TREATMENT:   "bg-teal-100   text-teal-700   dark:bg-teal-950   dark:text-teal-300",
  BMS_AUTOMATION:    "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  STRUCTURAL_CIVIL:  "bg-stone-100  text-stone-700  dark:bg-stone-800  dark:text-stone-300",
  ACCESS_HARDWARE:   "bg-slate-100  text-slate-600  dark:bg-slate-800  dark:text-slate-300",
};

const SYSTEM_CATEGORIES = [
  { value: "ELECTRICAL",         label: "Electrical" },
  { value: "HVAC",               label: "HVAC / Air Conditioning" },
  { value: "PLUMBING",           label: "Plumbing" },
  { value: "GENERATOR_POWER",    label: "Generator / Power" },
  { value: "ELEVATOR_ESCALATOR", label: "Elevator / Escalator" },
  { value: "FIRE_SAFETY",        label: "Fire Safety Systems" },
  { value: "WATER_TREATMENT",    label: "Water Treatment" },
  { value: "BMS_AUTOMATION",     label: "BMS / Building Automation" },
  { value: "STRUCTURAL_CIVIL",   label: "Structural / Civil" },
  { value: "ACCESS_HARDWARE",    label: "Access Control / Hardware" },
];

// ─── Initial Form States ─────────────────────────────────────────────────────

const getInitialUpdateForm = () => ({
  operational_status: "OPERATIONAL",
  criticality: "MEDIUM",
  assigned_to_user_id: "",
  responsible_technician: "",
  replacement_cost_estimate: "",
  service_interval_days: 90,
  last_serviced_date: "",
  next_service_due: "",
  notes: "",
});

// ─── Utility ─────────────────────────────────────────────────────────────────

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

const getCategoryInspectionScope = (category, title) => {
  const t = (title || "").toLowerCase();
  const c = (category || "").toUpperCase();
  if (t.includes("elevator") || c.includes("ELEVATOR")) {
    return [
      "Landing door interlocks, car gate safety edge & door operator mechanism test",
      "Traction machine motor, brake lining clearance & hoist rope tension check",
      "Car leveling accuracy, floor selection buttons & car operating panel (COP) test",
      "Counterweight guide shoes, pit buffers & pit emergency stop switch audit",
      "Car emergency lighting, alarm bell & two-way intercom communication verification",
      "Machine room ventilation, governor tension & hoistway limit switches inspection",
    ];
  }
  if (t.includes("generator") || c.includes("GENERATOR")) {
    return [
      "Fuel oil level, fuel-water separator & fuel filter inspection",
      "Engine oil level, oil filter condition & coolant level verification",
      "Starter battery voltage, electrolyte level & charging alternator test",
      "Automatic transfer switch (ATS) communication & auto-start simulation run",
      "Exhaust system, air intake filter & vibration isolators check",
    ];
  }
  if (t.includes("chiller") || t.includes("hvac") || c.includes("HVAC")) {
    return [
      "Compressor operating pressure (suction/discharge) & refrigerant leak detection",
      "Condenser & evaporator coil cleaning, fin condition & airflow check",
      "Chilled water circulating pump flow rate & pressure gauge verification",
      "Thermostat, temperature differential & BMS sensor calibration",
      "Air handling unit (AHU) belt tension, motor bearings lubrication & filter replacement",
    ];
  }
  if (t.includes("pump") || t.includes("water") || c.includes("PLUMBING") || c.includes("WATER")) {
    return [
      "Hydro-pneumatic booster pump pressure vessel diaphragm & pre-charge check",
      "Mechanical seal condition, impeller shaft alignment & leak inspection",
      "Pressure switch cut-in/cut-out calibration & control panel test",
      "Check valves, isolation gate valves & strainer cleaning",
      "Water tank float valve operation & overflow sensor verification",
    ];
  }
  if (t.includes("fire") || c.includes("FIRE")) {
    return [
      "Addressable smoke/heat detector loop integrity & control panel annunciator test",
      "Manual call point (MCP) break-glass trigger & alarm sounder audibility test",
      "Fire booster pumps auto-start upon pressure drop simulation",
      "Sprinkler system control valves, tamper switch & pressure gauges inspection",
      "Emergency exit signage & central backup battery autonomy test",
    ];
  }
  return [
    "Mechanical & electrical safety isolation and diagnostic run",
    "Consumable lubrication, filter check, fluid levels & cleaning",
    "Operating calibration, safety clearance & functional test run",
  ];
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function HardServicesPage() {
  const navigate = useNavigate();

  // Data
  const [properties, setProperties] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [users, setUsers] = useState([]);
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterProperty, setFilterProperty] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [viewingSystem, setViewingSystem] = useState(null);
  const [activeSystem, setActiveSystem] = useState(null);

  // Forms
  const [updateForm, setUpdateForm] = useState(getInitialUpdateForm());
  const [serviceTaskForm, setServiceTaskForm] = useState({
    system_id: "",
    equipment_id: "",
    equipment_name: "",
    property_id: "",
    service_category: "HVAC",
    task_title: "",
    task_description: "",
    assigned_to_id: "",
    assigned_to_name: "",
    priority: "MEDIUM",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
    estimated_hours: 2,
    is_inspection: false,
    scope: [],
  });

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/admin/users");
      const list = res.data?.items || res.data?.data?.items || res.data?.users || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setUsers(list);
    } catch {}
  }, []);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get("/facilities/properties");
      setProperties(res.data?.data || []);
    } catch {}
  }, []);

  const fetchEquipment = useCallback(async () => {
    try {
      const res = await api.get("/maintenance/equipment").catch(() => ({ data: { items: [] } }));
      const items = res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setEquipmentList(items);
    } catch {}
  }, []);



  const fetchSystems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProperty) params.set("propertyId", filterProperty);
      if (filterCategory) params.set("category", filterCategory);
      if (filterStatus)   params.set("status", filterStatus);
      if (searchQuery)    params.set("search", searchQuery);

      const res = await api.get(`/facilities/hard-services?${params.toString()}`);
      setSystems(res.data?.data || []);
    } catch {
      toast.error("Failed to load engineering systems");
    } finally {
      setLoading(false);
    }
  }, [filterProperty, filterCategory, filterStatus, searchQuery]);

  useEffect(() => {
    fetchProperties();
    fetchEquipment();
    fetchUsers();
  }, [fetchProperties, fetchEquipment, fetchUsers]);

  useEffect(() => {
    fetchSystems();
  }, [fetchSystems]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleUpdateSystem = async (e) => {
    e.preventDefault();
    if (!updateForm.operational_status) {
      toast.warn("Please select an operational status");
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/facilities/hard-services/${activeSystem.id}`, updateForm);
      toast.success("System record updated");
      setShowUpdateModal(false);
      setUpdateForm(getInitialUpdateForm());
      fetchSystems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update system");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeTask = async (system) => {
    if (!window.confirm(`Revoke and reverse assigned task for ${system.system_name}?`)) return;
    try {
      await api.put(`/facilities/hard-services/${system.id}`, {
        operational_status: "OPERATIONAL",
        assigned_to_user_id: null,
        responsible_technician: null,
      });

      try {
        const taskRes = await api.get(`/facilities/tasks?equipmentId=${system.id}&status=ASSIGNED`);
        const openTasks = taskRes.data?.data || [];
        for (const t of openTasks) {
          await api.put(`/facilities/tasks/${t.id}`, {
            assigned_to_id: null,
            assigned_to_name: null,
            status: "PENDING",
          }).catch(() => {});
        }
      } catch {}

      toast.success(`Task assignment revoked for ${system.system_name}. System restored to Operational.`);
      fetchSystems();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to revoke task assignment");
    }
  };

  const [trackingSystem, setTrackingSystem] = useState(null);
  const [showTrackModal, setShowTrackModal] = useState(false);

  const openTrackModal = (system) => {
    setTrackingSystem(system);
    setShowTrackModal(true);
  };

  const openUpdateModal = (system) => {
    setActiveSystem(system);
    let matchedUserId = system.assigned_to_user_id ? String(system.assigned_to_user_id) : "";
    if (!matchedUserId && system.responsible_technician) {
      const match = users.find((u) => (u.full_name || u.username || u.name) === system.responsible_technician);
      if (match) matchedUserId = String(match.id);
    }
    setUpdateForm({
      operational_status: system.operational_status || "OPERATIONAL",
      criticality: system.criticality || "MEDIUM",
      assigned_to_user_id: matchedUserId,
      responsible_technician: system.responsible_technician || "",
      replacement_cost_estimate: system.replacement_cost_estimate || "",
      service_interval_days: system.service_interval_days || 90,
      last_serviced_date: system.last_serviced_date ? String(system.last_serviced_date).slice(0, 10) : "",
      next_service_due:   system.next_service_due   ? String(system.next_service_due).slice(0, 10)   : "",
      notes: system.notes || "",
    });
    setShowUpdateModal(true);
  };

  const handleSelectTaskEquipment = (equipId) => {
    if (!equipId) {
      setServiceTaskForm((prev) => ({
        ...prev,
        equipment_id: "",
        equipment_name: "",
      }));
      return;
    }
    const eq = equipmentList.find((x) => String(x.id) === String(equipId));
    if (!eq) return;

    // Match category
    const eqCat = ((eq.category || eq.group_name || "") + "").toUpperCase();
    let matchedCat = "";
    for (const cat of SYSTEM_CATEGORIES) {
      if (eqCat.includes(cat.value) || cat.value.includes(eqCat) || (cat.label && cat.label.toUpperCase().includes(eqCat))) {
        matchedCat = cat.value;
        break;
      }
    }

    // Match responsible user/assignee from equipment
    let matchedUserId = eq.assigned_to_user_id ? String(eq.assigned_to_user_id) : "";
    let matchedUserName = eq.assigned_to_name || "";
    if (!matchedUserId && matchedUserName) {
      const match = users.find((u) => (u.full_name || u.username || u.name) === matchedUserName);
      if (match) matchedUserId = String(match.id);
    }

    // Also match system from systems list
    const matchSys = systems.find(
      (s) =>
        String(s.asset_id) === String(eq.id) ||
        (s.system_name && eq.equipment_name && s.system_name.toLowerCase() === eq.equipment_name.toLowerCase()) ||
        (s.system_code && eq.equipment_code && s.system_code.toLowerCase() === eq.equipment_code.toLowerCase())
    );

    const defTitle = `PPM Maintenance: ${eq.equipment_name}`;
    const defDesc = `Comprehensive PPM maintenance, safety inspections & routine testing for ${eq.equipment_name}.`;

    setServiceTaskForm((prev) => ({
      ...prev,
      system_id: matchSys?.id ? String(matchSys.id) : prev.system_id,
      equipment_id: String(eq.id),
      equipment_name: eq.equipment_name,
      property_id: eq.property_id ? String(eq.property_id) : (matchSys?.property_id ? String(matchSys.property_id) : prev.property_id),
      service_category: matchedCat || (matchSys?.system_category || prev.service_category),
      assigned_to_id: matchedUserId || prev.assigned_to_id,
      assigned_to_name: matchedUserName || prev.assigned_to_name,
      task_title: defTitle,
      task_description: defDesc,
    }));
  };

  const openAssignTaskModal = (sys = null) => {
    let matchedUserId = sys?.assigned_to_user_id ? String(sys.assigned_to_user_id) : "";
    let matchedUserName = sys?.responsible_technician || "";
    let matchedEquipId = "";
    let matchedEquipName = "";

    if (sys) {
      const matchEq = equipmentList.find(
        (e) =>
          (e.equipment_code && sys.system_code && String(e.equipment_code).toLowerCase() === String(sys.system_code).toLowerCase()) ||
          (e.equipment_name && sys.system_name && String(e.equipment_name).toLowerCase() === String(sys.system_name).toLowerCase()) ||
          String(e.id) === String(sys.equipment_id || sys.id)
      );
      if (matchEq) {
        matchedEquipId = String(matchEq.id);
        matchedEquipName = matchEq.equipment_name;
        if (!matchedUserId && matchEq.assigned_to_user_id) {
          matchedUserId = String(matchEq.assigned_to_user_id);
          matchedUserName = matchEq.assigned_to_name || matchedUserName;
        }
      } else {
        matchedEquipName = sys.system_name;
      }
    }

    if (!matchedUserId && matchedUserName) {
      const match = users.find((u) => (u.full_name || u.username || u.name) === matchedUserName);
      if (match) matchedUserId = String(match.id);
    }

    const defTitle = sys ? `PPM Maintenance: ${sys.system_name}` : "";
    const defDesc = sys ? `Comprehensive PPM maintenance, safety inspections & routine testing for ${sys.system_name}.` : "";

    setServiceTaskForm({
      system_id: sys?.id ? String(sys.id) : "",
      equipment_id: matchedEquipId,
      equipment_name: matchedEquipName,
      property_id: sys?.property_id ? String(sys.property_id) : (properties[0]?.id ? String(properties[0].id) : ""),
      service_category: sys?.system_category || "HVAC",
      task_title: defTitle,
      task_description: defDesc,
      assigned_to_id: matchedUserId,
      assigned_to_name: matchedUserName,
      priority: sys?.criticality === "MISSION_CRITICAL" ? "CRITICAL" : (sys?.criticality || "MEDIUM"),
      start_date: new Date().toISOString().slice(0, 10),
      end_date: sys?.next_service_due ? String(sys.next_service_due).slice(0, 10) : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      estimated_hours: 2,
      is_inspection: false,
      scope: [],
    });
    setShowTaskModal(true);
  };

  const handleCreateServiceTask = async (e) => {
    e.preventDefault();
    if (!serviceTaskForm.task_title?.trim()) {
      toast.warn("Task title is required");
      return;
    }
    if (!serviceTaskForm.task_description?.trim()) {
      toast.warn("Task description / instructions are required");
      return;
    }
    if (!serviceTaskForm.assigned_to_id && !serviceTaskForm.assigned_to_name) {
      toast.warn("Please select an assigned user for this service task");
      return;
    }
    setSubmitting(true);
    try {
      const scopeItems = [...(serviceTaskForm.scope || [])];
      const descTrim = serviceTaskForm.task_description?.trim();

      // Ensure description is part of Scope Checklist Items (in addition to or in the absence of checklists)
      if (descTrim && !scopeItems.some((s) => s.toLowerCase() === descTrim.toLowerCase())) {
        scopeItems.unshift(descTrim);
      }
      if (scopeItems.length === 0) {
        scopeItems.push(serviceTaskForm.task_title || "PPM Maintenance routine execution");
      }

      const cleanScope = scopeItems
        .map((s) => ({ text: String(s || "").trim(), item_text: String(s || "").trim(), completed: false, checked: false }))
        .filter((s) => s.text.length > 0);

      await api.post("/facilities/tasks", {
        property_id: serviceTaskForm.property_id || null,
        equipment_id: serviceTaskForm.equipment_id ? Number(serviceTaskForm.equipment_id) : null,
        equipment_name: serviceTaskForm.equipment_name || null,
        service_category: serviceTaskForm.service_category,
        task_title: serviceTaskForm.task_title,
        task_description: descTrim || JSON.stringify(cleanScope),
        checklist_data: cleanScope,
        assigned_to_id: serviceTaskForm.assigned_to_id || null,
        assigned_to_name: serviceTaskForm.assigned_to_name || "",
        priority: serviceTaskForm.priority,
        status: "ASSIGNED",
        start_date: serviceTaskForm.start_date || null,
        end_date: serviceTaskForm.end_date || null,
        estimated_hours: serviceTaskForm.estimated_hours || 0,
      });

      // Synchronize operational_status = "ASSIGNED" on engineering system
      const targetSys = systems.find(
        (s) =>
          (serviceTaskForm.system_id && String(s.id) === String(serviceTaskForm.system_id)) ||
          (serviceTaskForm.equipment_id && (String(s.asset_id) === String(serviceTaskForm.equipment_id) || String(s.id) === String(serviceTaskForm.equipment_id))) ||
          (serviceTaskForm.equipment_name && s.system_name && s.system_name.toLowerCase() === serviceTaskForm.equipment_name.toLowerCase())
      );

      if (targetSys) {
        await api.put(`/facilities/hard-services/${targetSys.id}`, {
          operational_status: "ASSIGNED",
          assigned_to_user_id: serviceTaskForm.assigned_to_id ? Number(serviceTaskForm.assigned_to_id) : targetSys.assigned_to_user_id,
          responsible_technician: serviceTaskForm.assigned_to_name || targetSys.responsible_technician,
        }).catch(() => {});
      }

      toast.success(`Service task created and assigned to ${serviceTaskForm.assigned_to_name || "user"} successfully!`);
      setShowTaskModal(false);
      await fetchSystems();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create service task");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived summary ────────────────────────────────────────────────────────

  const totalSystems      = systems.length;
  const missionCritical   = systems.filter((s) => s.criticality === "MISSION_CRITICAL").length;
  const overdueService    = systems.filter((s) => isOverdue(s.next_service_due)).length;
  const offlineSystems    = systems.filter((s) => s.operational_status === "OFFLINE").length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/facilities")}
            className="btn btn-secondary inline-flex items-center gap-2 px-3 py-1.5 text-xs"
            title="Go Back to Facilities Home"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Hard Services &amp; Technical Operations
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Manage building engineering systems — HVAC, generators, elevators, fire systems, electrical, water treatment and more.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openAssignTaskModal(null)}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 shadow-sm active:scale-95"
          >
            <CalendarClock size={15} /> Assign Service Task
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap text-xs shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Filter size={13} /> Filters:
          </span>
          <select
            value={filterProperty}
            onChange={(e) => setFilterProperty(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          >
            <option value="">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.property_name}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          >
            <option value="">All Categories</option>
            {SYSTEM_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
          >
            <option value="">All Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="OPERATIONAL">Operational</option>
            <option value="DEGRADED">Degraded</option>
            <option value="OFFLINE">Offline</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
          </select>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search systems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-44"
            />
          </div>
        </div>
        <button
          onClick={() => {
            setFilterProperty("");
            setFilterCategory("");
            setFilterStatus("");
            setSearchQuery("");
          }}
          className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1"
        >
          <RefreshCw size={12} /> Reset
        </button>
      </div>

      {/* Systems Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Loading engineering systems...</div>
        ) : systems.length === 0 ? (
          <div className="p-14 text-center space-y-2">
            <Wrench size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Systems Found</p>
            <p className="text-xs text-slate-400">No engineering systems registered or matching the current filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3">System Name</th>
                  <th className="px-3 py-3">Property</th>
                  <th className="px-3 py-3">Criticality</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Responsible Tech</th>
                  <th className="px-3 py-3">Next Service Due</th>
                  <th className="px-3 py-3 text-center">Track</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {systems.map((system) => (
                  <tr key={system.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 block">{system.system_name}</span>
                      {system.manufacturer && (
                        <span className="text-xs text-slate-400">{system.manufacturer}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                      {system.property_name || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${CRITICALITY_COLORS[system.criticality] || "bg-slate-100 text-slate-600"}`}>
                        {system.criticality?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                      {system.operational_status?.replace(/_/g, " ") || "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                      {system.responsible_technician || "—"}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {system.next_service_due ? String(system.next_service_due).slice(0, 10) : "—"}
                      {isOverdue(system.next_service_due) && (
                        <span className="ml-1 text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                          (OVERDUE)
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openTrackModal(system)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-xs"
                        title="Track Equipment History from Purchase to Present"
                      >
                        <History size={13} className="text-emerald-600 dark:text-emerald-400" />
                        <span>Track</span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {(() => {
                          const isAssigned =
                            system.operational_status === "ASSIGNED" ||
                            (Boolean(system.responsible_technician) && system.operational_status !== "OPERATIONAL");
                          const normTaskStatus = String(system.latest_task_status || "").toUpperCase().replace(/[\s_-]/g, "");
                          const normOpStatus = String(system.operational_status || "").toUpperCase().replace(/[\s_-]/g, "");
                          const isStartedOrDone =
                            ["COMPLETED", "VERIFIED", "INPROGRESS"].includes(normTaskStatus) ||
                            ["COMPLETED", "VERIFIED", "INPROGRESS", "INMAINTENANCE", "OPERATIONAL"].includes(normOpStatus) ||
                            Number(system.latest_task_percent || 0) > 0;

                          if (isAssigned && !isStartedOrDone) {
                            return (
                              <button
                                type="button"
                                onClick={() => handleRevokeTask(system)}
                                className="btn btn-danger inline-flex items-center gap-1 text-xs py-1 px-2.5 shadow-xs font-semibold"
                                title={`Revoke task assignment from ${system.responsible_technician || "user"}`}
                              >
                                <RotateCcw size={12} />
                                <span>Revoke</span>
                              </button>
                            );
                          }
                          return null;
                        })()}
                        <button
                          onClick={() => openAssignTaskModal(system)}
                          className="btn btn-secondary inline-flex items-center gap-1 text-xs py-1 px-2.5 shadow-xs"
                          title={system.operational_status === "ASSIGNED" ? `Assigned to ${system.responsible_technician || "User"}. Click to re-assign or update task` : "Assign Preventive / Routine Service Task to User"}
                        >
                          {system.operational_status === "ASSIGNED" && system.responsible_technician ? (
                            <>
                              <UserCheck size={12} className="text-brand-600 dark:text-brand-400" />
                              <span>Assigned to {system.responsible_technician}</span>
                            </>
                          ) : (
                            <>
                              <CalendarClock size={12} />
                              <span>Assign Task</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setViewingSystem(system)}
                          className="btn btn-secondary inline-flex items-center gap-1 text-xs py-1 px-2.5 shadow-xs"
                          title="View Technical Specifications"
                        >
                          <Eye size={12} /> View
                        </button>
                        {system.operational_status !== "ASSIGNED" && (
                          <button
                            onClick={() => openUpdateModal(system)}
                            className="btn btn-primary inline-flex items-center gap-1 text-xs py-1 px-2.5 shadow-xs"
                            title="Update Status & Service Logs"
                          >
                            <Pencil size={12} /> Edit / Update
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: Update System ────────────────────────────────────────────── */}
      {showUpdateModal && activeSystem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil size={18} className="text-emerald-600 dark:text-emerald-400" />
                Update System — {activeSystem.system_code}
              </h3>
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateSystem} className="p-6 space-y-4 text-xs">
              {/* System info strip */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-1">
                <p className="font-bold text-slate-800 dark:text-white">{activeSystem.system_name}</p>
                <p className="text-slate-500 dark:text-slate-400">
                  {activeSystem.property_name} · {activeSystem.system_category?.replace(/_/g, " ")}
                </p>
                <div className="flex gap-2 pt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${CRITICALITY_COLORS[activeSystem.criticality] || ""}`}>
                    {activeSystem.criticality?.replace(/_/g, " ")}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${OP_STATUS_COLORS[activeSystem.operational_status] || ""}`}>
                    {activeSystem.operational_status?.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Operational Status & Criticality */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Operational Status <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={updateForm.operational_status}
                    onChange={(e) => setUpdateForm({ ...updateForm, operational_status: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  >
                    <option value="">Select status...</option>
                    <option value="OPERATIONAL">Operational</option>
                    <option value="DEGRADED">Degraded</option>
                    <option value="OFFLINE">Offline</option>
                    <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Criticality</label>
                  <select
                    value={updateForm.criticality}
                    onChange={(e) => setUpdateForm({ ...updateForm, criticality: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="MISSION_CRITICAL">Mission Critical</option>
                  </select>
                </div>
              </div>

              {/* Responsible Technician */}
              <div>
                <label className="block font-semibold mb-1">Assignee (Responsible User / Tech)</label>
                <select
                  value={updateForm.assigned_to_user_id || ""}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const u = users.find((x) => String(x.id) === String(selId));
                    setUpdateForm({
                      ...updateForm,
                      assigned_to_user_id: selId ? Number(selId) : "",
                      responsible_technician: u ? (u.full_name || u.username || u.name || "") : "",
                    });
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.full_name || u.username || u.name || `User #${u.id}`} {u.role_name ? `• ${u.role_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Replacement Cost Estimate & Service Interval */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Replacement Cost Estimate</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="e.g. 250000.00"
                    value={updateForm.replacement_cost_estimate}
                    onChange={(e) => setUpdateForm({ ...updateForm, replacement_cost_estimate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Service Interval (Days)</label>
                  <input
                    type="number"
                    min={1}
                    value={updateForm.service_interval_days}
                    onChange={(e) => setUpdateForm({ ...updateForm, service_interval_days: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  />
                </div>
              </div>

              {/* Last Serviced & Next Service Due */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Last Serviced Date</label>
                  <input
                    type="date"
                    value={updateForm.last_serviced_date}
                    onChange={(e) => setUpdateForm({ ...updateForm, last_serviced_date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Next Service Due</label>
                  <input
                    type="date"
                    value={updateForm.next_service_due}
                    onChange={(e) => setUpdateForm({ ...updateForm, next_service_due: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold mb-1">Service Notes</label>
                <textarea
                  rows={3}
                  placeholder="Describe the work done, parts replaced, observations..."
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="btn btn-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary px-5 py-2 text-xs font-semibold shadow-sm disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  <UserCheck size={13} />
                  <span>
                    {submitting
                      ? "Saving..."
                      : updateForm.responsible_technician
                      ? `Assigned to ${updateForm.responsible_technician}`
                      : "Save Changes"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Assign Service Task ────────────────────────────────────────── */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarClock size={18} className="text-emerald-600 dark:text-emerald-400" />
                Assign Service Task (FM Work Order)
              </h3>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateServiceTask} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Target Property */}
                <div>
                  <label className="block font-semibold mb-1">Property <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={serviceTaskForm.property_id}
                    onChange={(e) => setServiceTaskForm({ ...serviceTaskForm, property_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  >
                    <option value="">Select Property...</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.property_name}</option>
                    ))}
                  </select>
                </div>

                {/* Service Category */}
                <div>
                  <label className="block font-semibold mb-1">Service Category <span className="text-rose-500">*</span></label>
                  <select
                    required
                    value={serviceTaskForm.service_category}
                    onChange={(e) => setServiceTaskForm({ ...serviceTaskForm, service_category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  >
                    {SYSTEM_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Asset / Equipment Selector (Focal point just before Task Title) */}
              <div>
                <label className="block font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <Wrench size={13} className="text-emerald-500" />
                    Asset / Equipment
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Focal point: auto-populates property, category &amp; assigned tech
                  </span>
                </label>
                <select
                  value={serviceTaskForm.equipment_id || ""}
                  onChange={(e) => handleSelectTaskEquipment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-900"
                >
                  <option value="">-- Choose Asset / Equipment from Register --</option>
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={String(eq.id)}>
                      {eq.equipment_code ? `[${eq.equipment_code}] ` : ""}{eq.equipment_name} {eq.property_name ? `• ${eq.property_name}` : ""} {eq.assigned_to_name ? `(Assigned: ${eq.assigned_to_name})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Title */}
              <div>
                <label className="block font-semibold mb-1">Service Task Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Preventive Maintenance Routine: Passenger Elevator Tower A"
                  value={serviceTaskForm.task_title}
                  onChange={(e) => setServiceTaskForm({ ...serviceTaskForm, task_title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                />
              </div>

              {/* Task Description */}
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Description / Service Instructions <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Specific scope of work, technical instructions, parts to inspect, safety precautions..."
                  value={serviceTaskForm.task_description}
                  onChange={(e) => setServiceTaskForm({ ...serviceTaskForm, task_description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200"
                />
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Assignee (Responsible User / Tech) */}
                <div>
                  <label className="block font-semibold mb-1">
                    Assignee (Responsible User / Tech) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={serviceTaskForm.assigned_to_id || ""}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const u = users.find((x) => String(x.id) === String(selId));
                      setServiceTaskForm({
                        ...serviceTaskForm,
                        assigned_to_id: selId,
                        assigned_to_name: u ? (u.full_name || u.username || u.name || "") : "",
                      });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  >
                    <option value="">-- Choose Assigned User --</option>
                    {users.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.full_name || u.username || u.name || `User #${u.id}`} {u.role_name ? `• ${u.role_name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block font-semibold mb-1">Priority</label>
                  <select
                    value={serviceTaskForm.priority}
                    onChange={(e) => setServiceTaskForm({ ...serviceTaskForm, priority: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              {/* Schedule Dates & Effort */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={serviceTaskForm.start_date}
                    onChange={(e) => setServiceTaskForm({ ...serviceTaskForm, start_date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={serviceTaskForm.end_date}
                    onChange={(e) => setServiceTaskForm({ ...serviceTaskForm, end_date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={serviceTaskForm.estimated_hours}
                    onChange={(e) => setServiceTaskForm({ ...serviceTaskForm, estimated_hours: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                  />
                </div>
              </div>

              {/* Inspection / Preventive Routine Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(serviceTaskForm.is_inspection)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setServiceTaskForm((prev) => ({
                        ...prev,
                        is_inspection: checked,
                        scope: checked
                          ? getCategoryInspectionScope(prev.service_category, prev.task_title)
                          : [],
                      }));
                    }}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 block">
                      This is an Inspection or Preventive Routine
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Check to auto-load standard engineering inspection &amp; preventive maintenance scope items
                    </span>
                  </div>
                </label>
              </div>

              {/* Scope Checklist Items */}
              <div>
                <label className="block font-semibold mb-1">Service Scope Checklist</label>
                {serviceTaskForm.scope.length === 0 ? (
                  <p className="text-slate-400 italic text-xs py-1.5">
                    No checklist items pre-selected. Check the box above if this is an inspection/preventive routine, or click &quot;+ Add Scope Item&quot; below to add custom checks.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {serviceTaskForm.scope.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const updated = [...serviceTaskForm.scope];
                            updated[idx] = e.target.value;
                            setServiceTaskForm({ ...serviceTaskForm, scope: updated });
                          }}
                          placeholder={`Scope item #${idx + 1}`}
                          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setServiceTaskForm({
                              ...serviceTaskForm,
                              scope: serviceTaskForm.scope.filter((_, i) => i !== idx),
                            });
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setServiceTaskForm({
                      ...serviceTaskForm,
                      scope: [...serviceTaskForm.scope, ""],
                    });
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-500 font-semibold inline-flex items-center gap-1 mt-2"
                >
                  <Plus size={12} /> Add Scope Item
                </button>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="btn btn-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary px-5 py-2 text-xs font-semibold shadow-sm disabled:opacity-60 inline-flex items-center gap-1.5"
                >
                  <UserCheck size={13} />
                  <span>
                    {submitting
                      ? "Assigning..."
                      : serviceTaskForm.assigned_to_name
                      ? `Assigned to ${serviceTaskForm.assigned_to_name}`
                      : "Assign Task"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: View System Specifications ─────────────────────────────── */}
      {viewingSystem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Server size={18} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Technical Specifications — {viewingSystem.system_code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingSystem(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-xs">System Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingSystem.system_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Category</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingSystem.system_category?.replace(/_/g, " ")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Property</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingSystem.property_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Manufacturer</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingSystem.manufacturer || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Model / Serial</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{viewingSystem.model_no || "—"} / {viewingSystem.serial_no || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Criticality</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block mt-0.5 ${CRITICALITY_COLORS[viewingSystem.criticality] || ""}`}>
                    {viewingSystem.criticality?.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 border border-slate-100 dark:border-slate-800 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-xs">Responsible Technician</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingSystem.responsible_technician || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Service Interval</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{viewingSystem.service_interval_days} days</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Last Serviced</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{viewingSystem.last_serviced_date ? String(viewingSystem.last_serviced_date).slice(0, 10) : "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Next Service Due</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{viewingSystem.next_service_due ? String(viewingSystem.next_service_due).slice(0, 10) : "—"}</span>
                </div>
              </div>

              {viewingSystem.notes && (
                <div>
                  <span className="text-slate-400 block text-xs font-semibold uppercase mb-1">Maintenance & Operating Notes</span>
                  <p className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl leading-relaxed whitespace-pre-wrap">
                    {viewingSystem.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                {viewingSystem.operational_status !== "ASSIGNED" && (
                  <button
                    type="button"
                    onClick={() => {
                      const s = viewingSystem;
                      setViewingSystem(null);
                      openUpdateModal(s);
                    }}
                    className="btn btn-primary px-4 py-2 text-xs font-semibold shadow-sm"
                  >
                    Edit / Update System
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingSystem(null)}
                  className="btn btn-secondary px-4 py-2 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Track Equipment Lifecycle & History ─────────────────────── */}
      {showTrackModal && trackingSystem && (() => {
        const installDate = trackingSystem.installation_date || trackingSystem.created_at;
        const warrantyDate = trackingSystem.warranty_expiry;
        const lastServDate = trackingSystem.last_serviced_date;
        const nextServDate = trackingSystem.next_service_due;
        const todayStr = new Date().toISOString().slice(0, 10);

        // Calculate lifespan
        const calcLifespan = (dStr) => {
          if (!dStr) return "N/A";
          const start = new Date(dStr);
          const now = new Date();
          if (isNaN(start.getTime())) return "N/A";
          const diffMs = now - start;
          const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          const years = Math.floor(days / 365);
          const remDays = days % 365;
          const months = Math.floor(remDays / 30);
          if (years > 0) return `${years} yr${years > 1 ? "s" : ""}, ${months} mo${months !== 1 ? "s" : ""} (${days} days)`;
          return `${days} days in service`;
        };

        const isWarrantyActive = warrantyDate && new Date(warrantyDate) > new Date();
        const overdue = isOverdue(nextServDate);

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
            <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto sm:my-8 transition-all">
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Equipment History & Lifecycle Tracker
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tracking: {trackingSystem.system_code} · {trackingSystem.system_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTrackModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 space-y-6 text-xs">
                {/* Top Stat Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Lifespan In Service</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                      {calcLifespan(installDate)}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Warranty Status</span>
                    <span className={`text-xs font-bold mt-0.5 inline-block ${isWarrantyActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`}>
                      {isWarrantyActive ? "Active Coverage" : warrantyDate ? "Warranty Expired" : "No Warranty"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Operational State</span>
                    <span className={`text-xs font-bold mt-0.5 inline-block ${OP_STATUS_COLORS[trackingSystem.operational_status] ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                      {trackingSystem.operational_status?.replace(/_/g, " ") || "OPERATIONAL"}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Replacement Value</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5 block">
                      {trackingSystem.replacement_cost_estimate ? Number(trackingSystem.replacement_cost_estimate).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>

                {/* Milestone Timeline: Purchase to Present */}
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-xs uppercase tracking-wide flex items-center gap-1.5">
                    <Clock size={14} className="text-emerald-600 dark:text-emerald-400" />
                    Chronological Lifecycle (From Purchase / Commissioning to Present)
                  </h4>

                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                    {/* Milestone 1: Acquisition & Commissioning */}
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            Acquisition & Commissioning
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {installDate ? String(installDate).slice(0, 10) : "Initial Commissioning"}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          Unit commissioned at <strong>{trackingSystem.property_name || "Facility"}</strong>.
                          {trackingSystem.manufacturer && ` Manufacturer: ${trackingSystem.manufacturer}.`}
                          {trackingSystem.model_no && ` Model: ${trackingSystem.model_no}.`}
                          {trackingSystem.serial_no && ` Serial No: ${trackingSystem.serial_no}.`}
                        </p>
                      </div>
                    </div>

                    {/* Milestone 2: Warranty Milestone */}
                    <div className="relative">
                      <div className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center ${isWarrantyActive ? "bg-blue-500" : "bg-slate-400"}`}>
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            Manufacturer Warranty Window
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {warrantyDate ? String(warrantyDate).slice(0, 10) : "No warranty date registered"}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          {isWarrantyActive
                            ? "OEM Warranty is active and provides full parts and technical coverage."
                            : warrantyDate
                            ? `Warranty coverage ended on ${String(warrantyDate).slice(0, 10)}. Operating under internal facilities PPM schedule.`
                            : "Operating under standard in-house facilities maintenance procedures."}
                        </p>
                      </div>
                    </div>

                    {/* Milestone 3: Routine Maintenance & Service Interval */}
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            PPM Service & Technical Maintenance
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {lastServDate ? String(lastServDate).slice(0, 10) : "Routine cycle"}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          Service interval configured to every <strong>{trackingSystem.service_interval_days || 90} days</strong>.
                          {trackingSystem.responsible_technician && (
                            <span> Assigned Technical Lead: <strong>{trackingSystem.responsible_technician}</strong>.</span>
                          )}
                          {trackingSystem.notes && (
                            <span className="block mt-1 text-slate-500 italic">Latest Log: "{trackingSystem.notes}"</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Milestone 4: Present Day Active Status */}
                    <div className="relative">
                      <div className="absolute -left-6 top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            Present Operational State (Today: {todayStr})
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${OP_STATUS_COLORS[trackingSystem.operational_status] || "bg-emerald-100 text-emerald-700"}`}>
                            {trackingSystem.operational_status?.replace(/_/g, " ") || "OPERATIONAL"}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">
                          Criticality: <strong>{trackingSystem.criticality || "MEDIUM"}</strong>.
                          Cumulative active operation: <strong>{calcLifespan(installDate)}</strong>.
                        </p>
                      </div>
                    </div>

                    {/* Milestone 5: Next Scheduled PPM Due */}
                    <div className="relative">
                      <div className={`absolute -left-6 top-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 shadow-sm flex items-center justify-center ${overdue ? "bg-rose-500" : "bg-amber-500"}`}>
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <div className={`p-3 rounded-xl border ${overdue ? "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200" : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold">
                            Next Scheduled Service Due
                          </span>
                          <span className={`text-[11px] font-bold ${overdue ? "text-rose-600 dark:text-rose-400" : "text-slate-600 dark:text-slate-300"}`}>
                            {nextServDate ? String(nextServDate).slice(0, 10) : "Not scheduled"}
                            {overdue && " (OVERDUE)"}
                          </span>
                        </div>
                        <p className="text-xs opacity-90">
                          {overdue
                            ? "⚠️ This system has passed its scheduled inspection interval. Immediate preventive maintenance and safety check recommended."
                            : nextServDate
                            ? "PPM inspection is on schedule. Review lubricants, calibration, and consumable filters before due date."
                            : "Set the next service date in the Edit modal to keep track of preventive maintenance."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowTrackModal(false)}
                    className="btn btn-secondary px-4 py-2 text-xs"
                  >
                    Close
                  </button>
                  {trackingSystem.operational_status !== "ASSIGNED" && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowTrackModal(false);
                        openUpdateModal(trackingSystem);
                      }}
                      className="btn btn-primary px-4 py-2 text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
                    >
                      <Pencil size={13} />
                      <span>Edit / Update Service Record</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
