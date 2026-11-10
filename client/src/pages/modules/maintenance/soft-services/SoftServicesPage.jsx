import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Sparkles, Shield, Bug, Trash2, Plus, 
  Calendar, CheckCircle2, AlertTriangle, Star, Building2, User, UserCheck, ArrowLeft,
  Clock, CheckSquare, Eye, FileText, Check, Award, Filter, RefreshCw, Edit, Wrench, X, RotateCcw
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

const getSoftServicesInspectionScope = (category, title) => {
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
  if (c.includes("JANITORIAL") || t.includes("clean") || t.includes("hygiene") || t.includes("janitorial")) {
    return [
      "Restroom fixtures, sanitization of taps, toilet bowls & urinal flush valves",
      "Restocking hand soaps, paper towels, jumbo toilet rolls & air fresheners",
      "High-touch surfaces (door handles, handrails, light switches) deep disinfection",
      "Floors dust-mopped, wet-mopped with disinfectant & trash cans emptied with fresh liners",
    ];
  }
  if (c.includes("SECURITY") || t.includes("patrol") || t.includes("guard") || t.includes("security")) {
    return [
      "Perimeter fence line, gates & razor wire physical inspection",
      "Main entrance visitor sign-in log & vehicle gate barrier operational check",
      "Access control card readers, emergency push-to-exit buttons & CCTV coverage audit",
      "Security guard post handover, radio communication test & occurrence book sign-off",
    ];
  }
  if (c.includes("PEST") || t.includes("pest") || t.includes("fumigation") || t.includes("rodent")) {
    return [
      "Rodent bait stations inspection, consumption check & fresh bait replenishment",
      "Drainage manholes & crawlspaces residual insecticide spray application",
      "Insect light traps (ILT) sticky board replacement & catch count audit",
      "Exclusion proofing: check door sweeps, pipe penetrations & seal gaps",
    ];
  }
  if (c.includes("WASTE") || t.includes("waste") || t.includes("refuse") || t.includes("recycle")) {
    return [
      "Hazardous, recyclable & general refuse waste streams segregation audit",
      "Central waste storage holding bay hygiene sanitization & odor control check",
      "Waste bins condition, wheel integrity & lid closure check",
      "Contractor carrier manifest reference verification & disposal receipt sign-off",
    ];
  }
  return [
    "Visual inspection & area hygiene preparation",
    "Main task execution per standard operating procedure",
    "Safety & PPE protocols verified",
    "Clean up & waste removed",
  ];
};

export default function SoftServicesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("daily-tasks");
  const [properties, setProperties] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);

  // Data states
  const [tasks, setTasks] = useState([]);
  const [janitorialLogs, setJanitorialLogs] = useState([]);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [pestLogs, setPestLogs] = useState([]);
  const [wasteLogs, setWasteLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Operations Setup data
  const [setupShifts, setSetupShifts] = useState([]);
  const [setupSupervisors, setSetupSupervisors] = useState([]);
  const [setupPersonnel, setSetupPersonnel] = useState([]);
  const [setupCategories, setSetupCategories] = useState([]);
  const [setupSanitationCheckpoints, setSetupSanitationCheckpoints] = useState([]);
  const [setupWasteStreams, setSetupWasteStreams] = useState([]);
  const [setupSuppliers, setSetupSuppliers] = useState([]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState("");
  const [users, setUsers] = useState([]);

  // Filters for daily tasks
  const [filterDate, setFilterDate] = useState("");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Blank un-prefilled task form
  const getInitialTaskForm = () => ({
    property_id: "",
    equipment_id: "",
    equipment_name: "",
    task_category: "",
    title: "",
    description: "",
    desc_points: [""],
    assignment_type: "MANUAL",
    scheduled_date: new Date().toISOString().slice(0, 10),
    shift: "",
    assigned_to_user_id: "",
    assigned_to_name: "",
    assigned_to_personnel_id: "",
    selected_assignees: [], // [{ id, name, user_id, personnel_id, category, shift }]
    supervisor_id: "",
    supervisor_name: "",
    priority: "MEDIUM",
    checklist_template_id: "",
    is_inspection: false,
    scope: [],
    schedule_mode: "SINGLE", // "SINGLE" | "MULTIPLE" | "RANGE"
    selected_dates: [],
    custom_date_input: "",
    range_start_date: "",
    range_end_date: "",
    selected_weekdays: [1, 2, 3, 4, 5], // 1=Mon .. 7=Sun
  });

  const [taskForm, setTaskForm] = useState(getInitialTaskForm());

  const handleSelectTaskEquipment = (equipId) => {
    if (!equipId) {
      setTaskForm((prev) => ({
        ...prev,
        equipment_id: "",
        equipment_name: "",
        title: prev.title.startsWith("Service Routine:") ? "" : prev.title,
      }));
      return;
    }
    const eq = equipmentList.find((x) => String(x.id) === String(equipId));
    if (!eq) return;

    // Match responsible user/assignee from equipment
    let matchedUserId = eq.assigned_to_user_id ? String(eq.assigned_to_user_id) : "";
    let matchedUserName = eq.assigned_to_name || "";
    let matchedPersonnelId = "";
    if (matchedUserName) {
      const pMatch = setupPersonnel.find((p) => p.name === matchedUserName);
      if (pMatch) {
        matchedPersonnelId = pMatch.id;
        if (!matchedUserId && pMatch.employee_id) matchedUserId = String(pMatch.employee_id);
      }
      if (!matchedUserId) {
        const match = users.find((u) => (u.full_name || u.username || u.name) === matchedUserName);
        if (match) matchedUserId = String(match.id);
      }
    }

    setTaskForm((prev) => ({
      ...prev,
      equipment_id: String(eq.id),
      equipment_name: eq.equipment_name,
      property_id: eq.property_id ? String(eq.property_id) : prev.property_id,
      assigned_to_user_id: matchedUserId || prev.assigned_to_user_id,
      assigned_to_name: matchedUserName || prev.assigned_to_name,
      assigned_to_personnel_id: matchedPersonnelId || prev.assigned_to_personnel_id,
      title: prev.title || `Service Routine: ${eq.equipment_name}`,
    }));
  };

  // Execute / Checklist Completion Form
  const [executionForm, setExecutionForm] = useState({
    completion_notes: "",
    items: [],
  });

  // Verify Form
  const [verifyForm, setVerifyForm] = useState({
    supervisor_rating: 5,
    supervisor_comments: "",
  });

  // Operational Log Forms
  const getInitialJanForm = (chkList = setupSanitationCheckpoints) => {
    const chkMap = {};
    if (chkList && chkList.length > 0) {
      chkList.forEach((cp) => {
        chkMap[cp.id] = true;
      });
    }
    return {
      property_id: properties[0]?.id ? String(properties[0].id) : "",
      cleaner_name: "",
      log_date: new Date().toISOString().slice(0, 10),
      shift: "MORNING",
      restrooms_sanitized: 1,
      floors_mopped: 1,
      trash_emptied: 1,
      soap_paper_restocked: 1,
      supervisor_rating: 5,
      supervisor_name: "",
      notes: "",
      checkpoints: chkMap,
    };
  };

  const getInitialSecForm = () => ({
    property_id: properties[0]?.id ? String(properties[0].id) : "",
    guard_name: "",
    checkpoint_name: "",
    checkpoint_status: "SECURE",
    incident_description: "",
    action_taken: ""
  });

  const getInitialPestForm = () => ({
    property_id: properties[0]?.id ? String(properties[0].id) : "",
    treatment_date: new Date().toISOString().slice(0, 10),
    technician_name: "",
    target_pest: "RODENTS",
    chemicals_applied: "",
    dosage_and_method: "",
    bait_stations_checked: 0,
    bait_stations_activity_detected: 0,
    risk_level: "LOW",
    notes: ""
  });

  const getInitialWasteForm = (streamList = setupWasteStreams) => {
    const defaultStream = streamList && streamList.length > 0 ? streamList[0] : null;
    return {
      property_id: properties[0]?.id ? String(properties[0].id) : "",
      collection_date: new Date().toISOString().slice(0, 10),
      waste_type: defaultStream ? (defaultStream.code || defaultStream.name) : "GENERAL_REFUSE",
      quantity_kg_or_bins: 1,
      unit: defaultStream?.default_unit || "BINS",
      contractor_carrier_name: "",
      manifest_reference_no: ""
    };
  };

  const [janForm, setJanForm] = useState(getInitialJanForm());
  const [secForm, setSecForm] = useState(getInitialSecForm());
  const [pestForm, setPestForm] = useState(getInitialPestForm());
  const [wasteForm, setWasteForm] = useState(getInitialWasteForm());

  const openLogModal = (tab = activeTab) => {
    if (tab === "janitorial") setJanForm(getInitialJanForm(setupSanitationCheckpoints));
    else if (tab === "security") setSecForm(getInitialSecForm());
    else if (tab === "pest") setPestForm(getInitialPestForm());
    else if (tab === "waste") setWasteForm(getInitialWasteForm(setupWasteStreams));
    setShowLogModal(true);
  };

  useEffect(() => {
    fetchProperties();
    fetchChecklists();
    fetchSetupData();
    fetchUsers();
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      const res = await api.get("/maintenance/equipment");
      const list = Array.isArray(res.data?.items) ? res.data.items : (Array.isArray(res.data) ? res.data : []);
      setEquipmentList(list);
    } catch {
      setEquipmentList([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      const raw = res.data;
      const list =
        raw?.data?.items ||
        raw?.items ||
        raw?.users ||
        (Array.isArray(raw?.data) ? raw.data : raw?.data?.items) ||
        (Array.isArray(raw) ? raw : []);
      setUsers(Array.isArray(list) ? list : []);
    } catch {}
  };

  const fetchSetupData = async () => {
    try {
      const [res, persRes, supRes] = await Promise.all([
        api.get("/facilities/setup/overview").catch(() => ({ data: { data: {} } })),
        api.get("/facilities/setup/personnel").catch(() => ({ data: { data: [] } })),
        api.get("/purchase/suppliers?contractor=Y").catch(() => api.get("/purchase/suppliers")).catch(() => ({ data: { items: [] } })),
      ]);
      const d = res.data?.data || {};
      setSetupShifts(d.shifts || []);
      setSetupSupervisors(d.supervisors || []);
      const persFromEndpoint = Array.isArray(persRes.data?.data) ? persRes.data.data : [];
      setSetupPersonnel(persFromEndpoint.length > 0 ? persFromEndpoint : (d.personnel || []));
      setSetupCategories(d.categories || []);
      setSetupSanitationCheckpoints(d.sanitationCheckpoints || []);
      setSetupWasteStreams(d.wasteStreams || []);
      const supList = supRes.data?.data?.items || supRes.data?.items || (Array.isArray(supRes.data?.data) ? supRes.data?.data : []);
      setSetupSuppliers(supList);
    } catch {}
  };

  useEffect(() => {
    fetchActiveData();
  }, [activeTab, filterDate, filterCategory, filterStatus]);

  const fetchProperties = async () => {
    try {
      const res = await api.get("/facilities/properties");
      setProperties(res.data?.data || []);
    } catch {}
  };

  const fetchChecklists = async () => {
    try {
      const res = await api.get("/facilities/checklists/templates");
      setChecklists(res.data?.data || []);
    } catch {}
  };

  const fetchActiveData = async () => {
    setLoading(true);
    try {
      let url = `/facilities/soft-tasks?category=${filterCategory}&status=${filterStatus}`;
      if (filterDate) url += `&date=${filterDate}`;
      const res = await api.get(url);
      setTasks(res.data?.data || []);

      if (activeTab === "janitorial") {
        const res = await api.get("/facilities/janitorial-logs");
        setJanitorialLogs(res.data?.data || []);
      } else if (activeTab === "security") {
        const res = await api.get("/facilities/security-patrol-logs");
        setSecurityLogs(res.data?.data || []);
      } else if (activeTab === "pest") {
        const res = await api.get("/facilities/pest-control-logs");
        setPestLogs(res.data?.data || []);
      } else if (activeTab === "waste") {
        const res = await api.get("/facilities/waste-disposal-logs");
        setWasteLogs(res.data?.data || []);
      }
    } catch {
      toast.error(`Failed to load ${activeTab} records`);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic filter for assignees who already have active tasks scheduled for the selected period and shift
  const busyAssignees = useMemo(() => {
    let activeDates = [];
    const todayStr = new Date().toISOString().slice(0, 10);
    if (taskForm.schedule_mode === "SINGLE") {
      activeDates = taskForm.scheduled_date ? [taskForm.scheduled_date] : [todayStr];
    } else if (taskForm.schedule_mode === "MULTIPLE") {
      activeDates = taskForm.selected_dates.length > 0 ? taskForm.selected_dates : [todayStr];
    } else if (taskForm.schedule_mode === "RANGE" && taskForm.range_start_date && taskForm.range_end_date) {
      try {
        const [sy, sm, sd] = taskForm.range_start_date.split("-").map(Number);
        const [ey, em, ed] = taskForm.range_end_date.split("-").map(Number);
        const startD = new Date(sy, sm - 1, sd);
        const endD = new Date(ey, em - 1, ed);
        for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
          const dayNum = d.getDay() === 0 ? 7 : d.getDay();
          if ((taskForm.selected_weekdays || []).includes(dayNum)) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            activeDates.push(`${yyyy}-${mm}-${dd}`);
          }
        }
      } catch {}
    }
    if (activeDates.length === 0) activeDates = [todayStr];

    const busy = new Set();
    (tasks || []).forEach((t) => {
      const st = String(t.status || "").toUpperCase();
      if (st === "COMPLETED" || st === "CANCELLED" || st === "VERIFIED") return;
      const tDate = String(t.scheduled_date || "").slice(0, 10);
      if (tDate < todayStr) return; // Period is already over

      if (activeDates.includes(tDate)) {
        const tShift = String(t.shift || "").toUpperCase();
        const curShift = String(taskForm.shift || "").toUpperCase();
        const shiftOverlap = !curShift || !tShift || curShift === "ALL_DAY" || tShift === "ALL_DAY" || curShift === tShift;

        if (shiftOverlap) {
          if (t.assigned_to_name) {
            t.assigned_to_name.split(",").forEach((name) => {
              const n = name.trim().toLowerCase();
              if (n) busy.add(n);
            });
          }
          if (t.assigned_to_user_id) {
            busy.add(String(t.assigned_to_user_id));
            busy.add(`user:${t.assigned_to_user_id}`);
          }
        }
      }
    });

    return busy;
  }, [tasks, taskForm.schedule_mode, taskForm.scheduled_date, taskForm.selected_dates, taskForm.range_start_date, taskForm.range_end_date, taskForm.selected_weekdays, taskForm.shift]);

  // Personnel available for the selected shift and period
  const availablePersonnel = useMemo(() => {
    return setupPersonnel.filter((p) => {
      const nameKey = String(p.name || "").trim().toLowerCase();
      const idKey = p.employee_id ? String(p.employee_id) : "";
      return !busyAssignees.has(nameKey) && (!idKey || !busyAssignees.has(idKey));
    });
  }, [setupPersonnel, busyAssignees]);

  // Users available for the selected shift and period
  const availableUsers = useMemo(() => {
    return users.filter((u) => {
      const nameKey = (u.full_name || u.username || u.name || "").trim().toLowerCase();
      const idKey = String(u.id);
      return !busyAssignees.has(nameKey) && !busyAssignees.has(idKey) && !busyAssignees.has(`user:${idKey}`);
    });
  }, [users, busyAssignees]);

  const busyCount = busyAssignees.size;

  // Supervisor assigns daily task
  const handleAssignTask = async (e) => {
    e.preventDefault();

    if (!taskForm.property_id) {
      toast.warn("Property is required.");
      return;
    }
    if (!taskForm.task_category) {
      toast.warn("Service Category is required.");
      return;
    }
    if (!taskForm.priority) {
      toast.warn("Priority Level is required.");
      return;
    }
    if (!taskForm.shift) {
      toast.warn("Shift is required.");
      return;
    }

    const hasAssignees =
      (taskForm.selected_assignees && taskForm.selected_assignees.length > 0) ||
      Boolean(taskForm.assigned_to_name?.trim());
    if (!hasAssignees) {
      toast.warn("Please select at least one Assignee (Responsible User / Tech).");
      return;
    }
    if (!taskForm.title.trim()) {
      toast.warn("Task Title is required.");
      return;
    }

    // Determine final description from points or free text
    let finalDescription = taskForm.description?.trim() || "";
    const validPoints = (taskForm.desc_points || []).map((p) => p.trim()).filter(Boolean);
    if (validPoints.length > 0) {
      finalDescription = validPoints.map((p, i) => `${i + 1}. ${p}`).join("\n");
    }

    if (!finalDescription) {
      toast.warn("Description / Instructions or at least one point is required.");
      return;
    }

    // Determine target dates cleanly without timezone drift
    let targetDates = [];
    if (taskForm.schedule_mode === "SINGLE") {
      if (!taskForm.scheduled_date) {
        toast.warn("Scheduled Date is required.");
        return;
      }
      targetDates = [taskForm.scheduled_date];
    } else if (taskForm.schedule_mode === "MULTIPLE") {
      if (!taskForm.selected_dates || taskForm.selected_dates.length === 0) {
        toast.warn("Please add at least one scheduled date.");
        return;
      }
      targetDates = [...taskForm.selected_dates];
    } else if (taskForm.schedule_mode === "RANGE") {
      if (!taskForm.range_start_date || !taskForm.range_end_date) {
        toast.warn("Range Start Date and End Date are required.");
        return;
      }
      if (new Date(taskForm.range_start_date) > new Date(taskForm.range_end_date)) {
        toast.warn("Range Start Date cannot be after End Date.");
        return;
      }
      if (!taskForm.selected_weekdays || taskForm.selected_weekdays.length === 0) {
        toast.warn("Please select at least one active weekday for the recurring schedule.");
        return;
      }

      const [sy, sm, sd] = taskForm.range_start_date.split("-").map(Number);
      const [ey, em, ed] = taskForm.range_end_date.split("-").map(Number);
      const startD = new Date(sy, sm - 1, sd);
      const endD = new Date(ey, em - 1, ed);
      for (let cur = new Date(startD); cur <= endD; cur.setDate(cur.getDate() + 1)) {
        const dayNum = cur.getDay() === 0 ? 7 : cur.getDay(); // 1=Mon .. 7=Sun
        if (taskForm.selected_weekdays.includes(dayNum)) {
          const yyyy = cur.getFullYear();
          const mm = String(cur.getMonth() + 1).padStart(2, "0");
          const dd = String(cur.getDate()).padStart(2, "0");
          targetDates.push(`${yyyy}-${mm}-${dd}`);
        }
      }
      if (targetDates.length === 0) {
        toast.warn("No days in the selected date range match the chosen weekdays.");
        return;
      }
    }

    setSubmitting(true);
    try {
      // Combine description and individual points into Scope Checklist Items
      const scopeItems = [];
      if (validPoints.length > 0) {
        validPoints.forEach((p) => {
          if (!scopeItems.some((x) => x.toLowerCase() === p.toLowerCase())) {
            scopeItems.push(p);
          }
        });
      } else if (finalDescription) {
        scopeItems.push(finalDescription);
      }

      if (taskForm.is_inspection && taskForm.scope && taskForm.scope.length > 0) {
        taskForm.scope.forEach((s) => {
          const item = String(s || "").trim();
          if (item && !scopeItems.some((x) => x.toLowerCase() === item.toLowerCase())) {
            scopeItems.push(item);
          }
        });
      } else if (taskForm.checklist_template_id && taskForm.checklist_template_id !== "STANDARD") {
        const selTpl = checklists.find((c) => String(c.id) === String(taskForm.checklist_template_id));
        if (selTpl && selTpl.items) {
          selTpl.items.forEach((it) => {
            const item = String(it.item_text || "").trim();
            if (item && !scopeItems.some((x) => x.toLowerCase() === item.toLowerCase())) {
              scopeItems.push(item);
            }
          });
        }
      } else if (taskForm.is_inspection) {
        getSoftServicesInspectionScope(taskForm.task_category, taskForm.title).forEach((s) => {
          if (!scopeItems.some((x) => x.toLowerCase() === s.toLowerCase())) {
            scopeItems.push(s);
          }
        });
      }

      if (scopeItems.length === 0) {
        scopeItems.push(taskForm.title || "Daily soft facilities routine execution");
      }

      const checklist_data = scopeItems
        .map((s) => ({ item_text: String(s || "").trim(), text: String(s || "").trim(), checked: false, notes: "" }))
        .filter((s) => s.item_text.length > 0);

      const assigneesToSend =
        taskForm.selected_assignees && taskForm.selected_assignees.length > 0
          ? taskForm.selected_assignees
          : [
              {
                name: taskForm.assigned_to_name,
                user_id: taskForm.assigned_to_user_id || null,
                personnel_id: taskForm.assigned_to_personnel_id || null,
              },
            ];

      await api.post("/facilities/soft-tasks", {
        ...taskForm,
        description: finalDescription,
        assignees: assigneesToSend,
        assigned_to_name: assigneesToSend.map((a) => a.name).join(", "),
        assigned_to_user_id: assigneesToSend[0]?.user_id || taskForm.assigned_to_user_id || null,
        status: "ASSIGNED",
        scheduled_dates: targetDates,
        scheduled_date: targetDates[0],
        checklist_data,
      });

      const totalAssignedTasks = targetDates.length * assigneesToSend.length;
      toast.success(
        totalAssignedTasks > 1
          ? `Successfully assigned ${totalAssignedTasks} tasks across dates and assignees!`
          : "Daily soft facilities task assigned successfully!"
      );
      setShowAssignModal(false);
      setTaskForm(getInitialTaskForm());
      fetchActiveData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign task");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Execute Modal
  const openExecuteModal = (task) => {
    setActiveTask(task);
    let items = [];
    if (task.checklist_data) {
      try {
        items = typeof task.checklist_data === "string" ? JSON.parse(task.checklist_data) : task.checklist_data;
      } catch {
        items = [];
      }
    }
    if (!items || items.length === 0) {
      items = [
        { item_text: "Restrooms sanitized & restocked", checked: true },
        { item_text: "Floors vacuumed & mopped", checked: true },
        { item_text: "Trash cans emptied and fresh liners installed", checked: true },
        { item_text: "High-touch surfaces disinfected", checked: true },
      ];
    }
    setExecutionForm({
      completion_notes: task.completion_notes || "All operational checklists completed per protocol.",
      items,
    });
    setShowExecuteModal(true);
  };

  const openAssignTaskForTab = (category, defaultTitle) => {
    setTaskForm({
      ...getInitialTaskForm(),
      task_category: category,
      title: defaultTitle || "",
    });
    setShowAssignModal(true);
  };

  // Personnel completes job
  const handleCompleteJob = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/facilities/soft-tasks/${activeTask.id}/execute`, {
        checklist_data: executionForm.items,
        completion_notes: executionForm.completion_notes,
      });
      toast.success("Job completed and submitted for supervisor verification!");
      setShowExecuteModal(false);
      setTasks((prev) =>
        prev.map((t) => (t.id === activeTask.id ? { ...t, status: "COMPLETED", completed_at: new Date().toISOString() } : t))
      );
      fetchActiveData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete job");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Supervisor Verify Modal
  const openVerifyModal = (task) => {
    setActiveTask(task);
    setVerifyForm({
      supervisor_rating: task.supervisor_rating || 5,
      supervisor_comments: task.supervisor_comments || "Work inspected and verified to standard.",
    });
    setShowVerifyModal(true);
  };

  // Supervisor signs off & approves
  const handleVerifySignoff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/facilities/soft-tasks/${activeTask.id}/verify`, verifyForm);
      toast.success("Task verified and signed off by supervisor!");
      setShowVerifyModal(false);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeTask.id
            ? {
                ...t,
                status: "VERIFIED",
                verified_by_supervisor: 1,
                verified_at: new Date().toISOString(),
                supervisor_rating: verifyForm.supervisor_rating,
                supervisor_comments: verifyForm.supervisor_comments,
              }
            : t
        )
      );
      fetchActiveData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to verify task");
    } finally {
      setSubmitting(false);
    }
  };

  // Revoke task assignment
  const handleRevokeTask = async (task) => {
    if (!window.confirm(`Revoke assignment for "${task.title}" from ${task.assigned_to_name || "staff"}?`)) return;
    setSubmitting(true);
    try {
      await api.put(`/facilities/soft-tasks/${task.id}/revoke`);
      toast.success(`Task assignment revoked. Task reversed to Unassigned / Pending.`);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: "PENDING",
                assigned_to_name: "",
                assigned_to_user_id: null,
              }
            : t
        )
      );
      fetchActiveData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to revoke task assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const renderCategoryTaskSection = (categoryList, title, assignLabel, defaultTaskTitle, emptyMessage) => {
    const catTasks = tasks.filter((t) =>
      categoryList.some((c) => (t.task_category || "").toUpperCase() === c.toUpperCase() || (t.title && t.title.toLowerCase().includes(c.toLowerCase())))
    );

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckSquare size={16} className="text-emerald-500" />
              {title}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {catTasks.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Assigned personnel, shift schedule, execution status, and supervisor verification
            </p>
          </div>
          <button
            onClick={() => openAssignTaskForTab(categoryList[0], defaultTaskTitle)}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
          >
            <Plus size={13} /> {assignLabel}
          </button>
        </div>

        {catTasks.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            <CheckSquare size={28} className="mx-auto text-slate-400 mb-2 opacity-60" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{emptyMessage}</p>
            <p className="text-[11px] text-slate-400 mt-1">Assign duties to staff members with specific shifts and checklist templates</p>
            <button
              onClick={() => openAssignTaskForTab(categoryList[0], defaultTaskTitle)}
              className="mt-3 btn btn-secondary text-xs inline-flex items-center gap-1 py-1 px-3"
            >
              <Plus size={12} /> {assignLabel}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Task Details</th>
                  <th className="px-3 py-3">Property</th>
                  <th className="px-3 py-3">Assigned To</th>
                  <th className="px-3 py-3">Schedule / Shift</th>
                  <th className="px-3 py-3">Priority</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {catTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{task.title}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{task.task_no} · {task.description || "Routine service execution"}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                      {task.property_name || `Property #${task.property_id}`}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                        <User size={13} className="text-slate-400" />
                        <span>{task.assigned_to_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className="font-mono text-slate-700 dark:text-slate-300 block">
                        {task.scheduled_date ? String(task.scheduled_date).slice(0, 10) : "Today"}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase inline-block mt-0.5">
                        {task.shift}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.priority === "HIGH" || task.priority === "URGENT"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                        task.status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : task.status === "COMPLETED"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : task.status === "IN_PROGRESS"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}>
                        {task.status === "VERIFIED" && <Check size={11} />}
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {task.assigned_to_name && (
                          <>
                            <span className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-xs" title={`Assigned to ${task.assigned_to_name}`}>
                              <UserCheck size={12} className="text-brand-600 dark:text-brand-400" />
                              <span>Assigned to {task.assigned_to_name}</span>
                            </span>
                            {(() => {
                              const normStatus = String(task.status || "").toUpperCase().replace(/[\s_-]/g, "");
                              const isStartedOrDone =
                                ["COMPLETED", "VERIFIED", "INPROGRESS"].includes(normStatus) ||
                                Number(task.completion_percent || 0) > 0;
                              if (!isStartedOrDone) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeTask(task)}
                                    className="btn btn-danger text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-xs font-semibold"
                                    title={`Revoke task assignment from ${task.assigned_to_name}`}
                                  >
                                    <RotateCcw size={12} />
                                    <span>Revoke</span>
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          </>
                        )}
                        <button
                          onClick={() => setViewingTask(task)}
                          className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-xs"
                          title="View Task Details & Checkpoints"
                        >
                          <Eye size={12} /> View
                        </button>
                        {!task.assigned_to_name && !task.assigned_to && !task.assigned_to_user_id && task.status !== "COMPLETED" && task.status !== "VERIFIED" && (
                          <button
                            onClick={() => openExecuteModal(task)}
                            className="btn btn-primary text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-xs font-semibold"
                            title="Check off inspection items and complete task"
                          >
                            <Edit size={12} /> Check & Complete
                          </button>
                        )}
                        {!task.assigned_to_name && !task.assigned_to && !task.assigned_to_user_id && task.status === "COMPLETED" && (
                          <button
                            onClick={() => openVerifyModal(task)}
                            className="btn btn-primary text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-xs font-semibold"
                            title="Supervisor Inspect & Sign-off"
                          >
                            <CheckCircle2 size={12} /> Verify & Sign-Off
                          </button>
                        )}
                        {task.status === "VERIFIED" && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold ml-1">Approved</span>
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
    );
  };

  // Operational record logger
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (activeTab === "janitorial") {
        if (!janForm.property_id || !janForm.cleaner_name?.trim() || !janForm.log_date) {
          toast.warn("Target Property, Cleaner Name, and Log Date are required.");
          setSubmitting(false);
          return;
        }
        await api.post("/facilities/janitorial-logs", {
          ...janForm,
          checkpoints_data: JSON.stringify(janForm.checkpoints || {})
        });
        toast.success("Janitorial audit logged successfully");
      } else if (activeTab === "security") {
        if (!secForm.property_id || !secForm.guard_name?.trim() || !secForm.checkpoint_name?.trim()) {
          toast.warn("Target Property, Guard Name, and Checkpoint Name are required.");
          setSubmitting(false);
          return;
        }
        await api.post("/facilities/security-patrol-logs", secForm);
        toast.success("Security patrol checkpoint logged");
      } else if (activeTab === "pest") {
        if (!pestForm.property_id || !pestForm.treatment_date || !pestForm.technician_name?.trim()) {
          toast.warn("Target Property, Treatment Date, and Technician Name are required.");
          setSubmitting(false);
          return;
        }
        await api.post("/facilities/pest-control-logs", pestForm);
        toast.success("Pest control treatment logged");
      } else if (activeTab === "waste") {
        if (!wasteForm.property_id || !wasteForm.collection_date) {
          toast.warn("Target Property and Collection Date are required.");
          setSubmitting(false);
          return;
        }
        await api.post("/facilities/waste-disposal-logs", wasteForm);
        toast.success("Waste manifest recorded");
      }
      setShowLogModal(false);
      fetchActiveData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit record");
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics for Daily Tasks
  const taskCounts = {
    total: tasks.length,
    assigned: tasks.filter((t) => t.status === "ASSIGNED" || t.status === "PENDING").length,
    inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
    verified: tasks.filter((t) => t.status === "VERIFIED").length,
  };

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
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Soft Facilities Services & Site Operations
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              Supervise daily staff task assignments, scheduled routines, janitorial hygiene, security patrols, pest control & waste manifests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "daily-tasks" ? (
            <button
              onClick={() => {
                setTaskForm(getInitialTaskForm());
                setShowAssignModal(true);
              }}
              className="btn btn-primary inline-flex items-center gap-2 shadow-sm active:scale-95 text-xs py-2 px-3.5"
            >
              <Plus size={15} />
              Assign Daily Task
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const catMap = {
                    janitorial: "JANITORIAL",
                    security: "SECURITY_PATROL",
                    pest: "PEST_CONTROL",
                    waste: "WASTE_MANAGEMENT",
                  };
                  const titleMap = {
                    janitorial: "Janitorial Cleaning & Hygiene Service",
                    security: "Security Guard Patrol & Perimeter Service",
                    pest: "Pest Extermination & Fumigation Service",
                    waste: "Waste Sorting & Collection Service",
                  };
                  openAssignTaskForTab(catMap[activeTab] || "SOFT_SERVICES", titleMap[activeTab] || "");
                }}
                className="btn btn-primary inline-flex items-center gap-2 text-xs py-2 px-3.5 shadow-sm active:scale-95"
              >
                <Plus size={15} />
                Assign {activeTab === "janitorial" ? "Janitorial" : activeTab === "security" ? "Security Patrol" : activeTab === "pest" ? "Pest Treatment" : "Waste"} Task
              </button>
              <button
                onClick={() => openLogModal(activeTab)}
                className="btn btn-secondary inline-flex items-center gap-2 text-xs py-2 px-3.5 shadow-sm active:scale-95"
              >
                <Plus size={15} />
                {activeTab === "janitorial" ? "Log Audit" :
                 activeTab === "security" ? "Log Patrol" :
                 activeTab === "pest" ? "Log Treatment" : "Record Manifest"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("daily-tasks")}
          className={`flex items-center gap-2 pb-3 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
            activeTab === "daily-tasks"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Calendar size={14} />
          Daily Task Assignments & Verification
          {taskCounts.assigned > 0 && (
            <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {taskCounts.assigned}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("janitorial")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "janitorial"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Sparkles size={14} />
          Janitorial Audits
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "security"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Shield size={14} />
          Security Patrol Rounds
        </button>

        <button
          onClick={() => setActiveTab("pest")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "pest"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Bug size={14} />
          Pest Control Treatments
        </button>

        <button
          onClick={() => setActiveTab("waste")}
          className={`flex items-center gap-2 pb-3 px-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
            activeTab === "waste"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Trash2 size={14} />
          Waste Manifests
        </button>
      </div>

      {/* DAILY TASK ASSIGNMENTS TAB */}
      {activeTab === "daily-tasks" && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap text-xs shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                <Filter size={13} /> Filters:
              </span>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="ALL">All Categories</option>
                <option value="JANITORIAL">Janitorial / Cleaning</option>
                <option value="SECURITY_PATROL">Security Patrol</option>
                <option value="PEST_CONTROL">Pest Control</option>
                <option value="WASTE_MANAGEMENT">Waste Management</option>
                <option value="LANDSCAPING">Landscaping</option>
                <option value="CONCIERGE_FRONTDESK">Front Desk / Concierge</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="ASSIGNED">Assigned / Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="VERIFIED">Verified & Approved</option>
              </select>
            </div>
            <button
              onClick={() => {
                setFilterDate("");
                setFilterCategory("ALL");
                setFilterStatus("ALL");
              }}
              className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1"
            >
              <RefreshCw size={12} /> Reset Filters
            </button>
          </div>

          {/* Tasks Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading daily tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <CheckSquare size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No Soft Facilities Tasks Found</p>
                <p className="text-xs text-slate-400">Supervisors can assign daily or scheduled routines using the "Assign Daily Task" button.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="px-4 py-3">Task Details</th>
                      <th className="px-3 py-3">Property</th>
                      <th className="px-3 py-3">Assigned To</th>
                      <th className="px-3 py-3">Schedule / Shift</th>
                      <th className="px-3 py-3">Priority</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 dark:text-white block">{task.title}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{task.property_name || "Primary Estate"}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <User size={13} className="text-slate-400 flex-shrink-0" />
                            <span className="font-medium text-slate-800 dark:text-slate-200">{task.assigned_to_name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-mono text-slate-700 dark:text-slate-300 block">{task.scheduled_date ? String(task.scheduled_date).slice(0, 10) : "Today"}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase inline-block mt-0.5">
                            {task.shift}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            task.priority === "HIGH" || task.priority === "URGENT"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            task.status === "VERIFIED"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : task.status === "COMPLETED"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : task.status === "IN_PROGRESS"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}>
                            {task.status === "VERIFIED" && <Check size={11} />}
                            {task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            {task.assigned_to_name && (
                              <>
                                <span className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-xs" title={`Assigned to ${task.assigned_to_name}`}>
                                  <UserCheck size={12} className="text-brand-600 dark:text-brand-400" />
                                  <span>Assigned to {task.assigned_to_name}</span>
                                </span>
                                {(() => {
                                  const normStatus = String(task.status || "").toUpperCase().replace(/[\s_-]/g, "");
                                  const isStartedOrDone =
                                    ["COMPLETED", "VERIFIED", "INPROGRESS"].includes(normStatus) ||
                                    Number(task.completion_percent || 0) > 0;
                                  if (!isStartedOrDone) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => handleRevokeTask(task)}
                                        className="btn btn-danger text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-xs font-semibold"
                                        title={`Revoke task assignment from ${task.assigned_to_name}`}
                                      >
                                        <RotateCcw size={12} />
                                        <span>Revoke</span>
                                      </button>
                                    );
                                  }
                                  return null;
                                })()}
                              </>
                            )}
                            <button
                              onClick={() => setViewingTask(task)}
                              className="btn btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-xs"
                              title="View Task Details & Checkpoints"
                            >
                              <Eye size={12} /> View
                            </button>
                            {!task.assigned_to_name && !task.assigned_to && !task.assigned_to_user_id && task.status !== "COMPLETED" && task.status !== "VERIFIED" && (
                              <button
                                onClick={() => openExecuteModal(task)}
                                className="btn btn-primary text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-xs font-semibold"
                                title="Check off inspection items and complete task"
                              >
                                <Edit size={12} /> Check & Complete
                              </button>
                            )}
                            {!task.assigned_to_name && !task.assigned_to && !task.assigned_to_user_id && task.status === "COMPLETED" && (
                              <button
                                onClick={() => openVerifyModal(task)}
                                className="btn btn-primary text-xs px-2.5 py-1 inline-flex items-center gap-1 shadow-xs font-semibold"
                                title="Supervisor Inspect & Sign-off"
                              >
                                <CheckCircle2 size={12} /> Verify & Sign-Off
                              </button>
                            )}
                            {task.status === "VERIFIED" && (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold ml-1">Approved</span>
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
        </div>
      )}

      {/* JANITORIAL AUDITS TAB */}
      {activeTab === "janitorial" && (
        <div className="space-y-6">
          {renderCategoryTaskSection(
            ["JANITORIAL", "CLEANING"],
            "Janitorial Task Assignments & Daily Routines",
            "Assign Janitorial Task",
            "Restroom & Office Hygiene Sanitization",
            "No janitorial cleaning tasks assigned yet."
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-500" />
                  Restroom & Office Hygiene Audits
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Supervisor inspection scores, restroom sanitation check, and supplies restocking logs
                </p>
              </div>
              <button
                onClick={() => openLogModal("janitorial")}
                className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <Plus size={13} /> Log Janitorial Audit
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Cleaner</th>
                    <th className="p-2.5">Shift</th>
                    <th className="p-2.5">Sanitized</th>
                    <th className="p-2.5">Mopped</th>
                    <th className="p-2.5">Rating</th>
                    <th className="p-2.5">Supervisor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {janitorialLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="p-2.5 font-mono">{String(log.log_date).slice(0, 10)}</td>
                      <td className="p-2.5 font-semibold">{log.cleaner_name}</td>
                      <td className="p-2.5">{log.shift}</td>
                      <td className="p-2.5">{log.restrooms_sanitized ? "✅ Yes" : "❌ No"}</td>
                      <td className="p-2.5">{log.floors_mopped ? "✅ Yes" : "❌ No"}</td>
                      <td className="p-2.5 text-amber-500 font-bold">⭐ {log.supervisor_rating}/5</td>
                      <td className="p-2.5">{log.supervisor_name || "Supervisor"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY PATROL TAB */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {renderCategoryTaskSection(
            ["SECURITY_PATROL", "SECURITY"],
            "Security Patrol Task Assignments & Rounds",
            "Assign Patrol Task",
            "Perimeter Fence & Gate Checkpoint Rounds",
            "No security patrol tasks assigned yet."
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Shield size={16} className="text-emerald-500" />
                  Security Guard Patrol Checkpoints
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Physical guard post rounds, electronic wanding, and gate incident documentation
                </p>
              </div>
              <button
                onClick={() => openLogModal("security")}
                className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <Plus size={13} /> Log Security Patrol
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b">
                  <tr>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Guard</th>
                    <th className="p-2.5">Checkpoint</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Incident / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {securityLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="p-2.5 font-mono">{String(log.patrol_time).slice(0, 16)}</td>
                      <td className="p-2.5 font-semibold">{log.guard_name}</td>
                      <td className="p-2.5">{log.checkpoint_name}</td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.checkpoint_status === "SECURE" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {log.checkpoint_status}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500">{log.incident_description || "Routine patrol - all secure"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PEST CONTROL TAB */}
      {activeTab === "pest" && (
        <div className="space-y-6">
          {renderCategoryTaskSection(
            ["PEST_CONTROL", "PEST"],
            "Pest Control Task Assignments & Treatments",
            "Assign Pest Task",
            "Scheduled Chemical Fumigation & Bait Inspection",
            "No pest control treatment tasks assigned yet."
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Bug size={16} className="text-emerald-500" />
                  Pest Extermination & Fumigation Treatments
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Chemical applications, bait station inspection records, and EPA pest risk reports
                </p>
              </div>
              <button
                onClick={() => openLogModal("pest")}
                className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <Plus size={13} /> Log Pest Treatment
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b">
                  <tr>
                    <th className="p-2.5">Treatment Date</th>
                    <th className="p-2.5">Target Pest</th>
                    <th className="p-2.5">Technician</th>
                    <th className="p-2.5">Chemical Applied</th>
                    <th className="p-2.5">Bait Activity</th>
                    <th className="p-2.5">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pestLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="p-2.5 font-mono">{String(log.treatment_date).slice(0, 10)}</td>
                      <td className="p-2.5 font-bold text-emerald-600">{log.target_pest}</td>
                      <td className="p-2.5">{log.technician_name}</td>
                      <td className="p-2.5">{log.chemicals_applied}</td>
                      <td className="p-2.5">{log.bait_stations_activity_detected} active of {log.bait_stations_checked}</td>
                      <td className="p-2.5">{log.risk_level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* WASTE DISPOSAL TAB */}
      {activeTab === "waste" && (
        <div className="space-y-6">
          {renderCategoryTaskSection(
            ["WASTE_MANAGEMENT", "WASTE"],
            "Waste Management Task Assignments & Manifests",
            "Assign Waste Task",
            "Daily Waste Sorting, Separation & Carrier Handoff",
            "No waste management tasks assigned yet."
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Trash2 size={16} className="text-emerald-500" />
                  Waste Collection & Carrier Manifests
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Waste bin sorting logs, licensed hauler manifest receipts, and recycling tracking
                </p>
              </div>
              <button
                onClick={() => openLogModal("waste")}
                className="btn btn-secondary inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
              >
                <Plus size={13} /> Record Waste Manifest
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b">
                  <tr>
                    <th className="p-2.5">Collection Date</th>
                    <th className="p-2.5">Waste Stream</th>
                    <th className="p-2.5">Quantity</th>
                    <th className="p-2.5">Contractor Carrier</th>
                    <th className="p-2.5">Manifest Ref</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {wasteLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="p-2.5 font-mono">{String(log.collection_date).slice(0, 10)}</td>
                      <td className="p-2.5 font-bold">{log.waste_type}</td>
                      <td className="p-2.5">{log.quantity_kg_or_bins} {log.unit}</td>
                      <td className="p-2.5">{log.contractor_carrier_name}</td>
                      <td className="p-2.5 font-mono text-slate-500">{log.manifest_reference_no || "MNF-2026-01"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LOG OPERATIONS RECORD */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl lg:max-w-3xl shadow-2xl overflow-hidden my-auto sm:my-8 transition-all">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  {activeTab === "janitorial" ? <Sparkles size={18} /> :
                   activeTab === "security" ? <Shield size={18} /> :
                   activeTab === "pest" ? <Bug size={18} /> : <Trash2 size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeTab === "janitorial" ? "Log Janitorial & Hygiene Audit" :
                     activeTab === "security" ? "Log Security Patrol Round" :
                     activeTab === "pest" ? "Log Pest Control Treatment" : "Record Waste Manifest"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Record operational field audit data and verification details for compliance tracking.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-6 space-y-4 text-xs">
              {/* Target Property */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Target Property <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={
                      activeTab === "janitorial" ? janForm.property_id :
                      activeTab === "security" ? secForm.property_id :
                      activeTab === "pest" ? pestForm.property_id : wasteForm.property_id
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (activeTab === "janitorial") setJanForm({ ...janForm, property_id: val });
                      else if (activeTab === "security") setSecForm({ ...secForm, property_id: val });
                      else if (activeTab === "pest") setPestForm({ ...pestForm, property_id: val });
                      else if (activeTab === "waste") setWasteForm({ ...wasteForm, property_id: val });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    required
                  >
                    <option value="">-- Choose Property --</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.property_name} {p.property_code ? `(${p.property_code})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date fields per tab */}
                {activeTab === "janitorial" && (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Log Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={janForm.log_date}
                      onChange={(e) => setJanForm({ ...janForm, log_date: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      required
                    />
                  </div>
                )}
                {activeTab === "pest" && (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Treatment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={pestForm.treatment_date}
                      onChange={(e) => setPestForm({ ...pestForm, treatment_date: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      required
                    />
                  </div>
                )}
                {activeTab === "waste" && (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Collection Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={wasteForm.collection_date}
                      onChange={(e) => setWasteForm({ ...wasteForm, collection_date: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      required
                    />
                  </div>
                )}

                {/* For security: Checkpoint Name */}
                {activeTab === "security" && (
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Checkpoint / Location <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Main Gate, North Perimeter, Data Center"
                      value={secForm.checkpoint_name}
                      onChange={(e) => setSecForm({ ...secForm, checkpoint_name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      required
                    />
                  </div>
                )}
              </div>

              {/* TAB SPECIFIC BODY */}
              {/* JANITORIAL AUDIT */}
              {activeTab === "janitorial" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Cleaner / Assigned Staff <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={janForm.cleaner_name}
                        onChange={(e) => setJanForm({ ...janForm, cleaner_name: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                        required
                      >
                        <option value="">-- Choose Assigned Staff / Cleaner --</option>
                        {users.map((u) => {
                          const name = u.full_name || u.username || u.name;
                          return (
                            <option key={u.id} value={name}>
                              {name} {u.role ? `(${u.role})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Shift
                      </label>
                      <select
                        value={janForm.shift}
                        onChange={(e) => setJanForm({ ...janForm, shift: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      >
                        <option value="MORNING">Morning Shift</option>
                        <option value="AFTERNOON">Afternoon Shift</option>
                        <option value="NIGHT">Night Shift</option>
                        <option value="WEEKEND">Weekend Shift</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">Sanitation Checkpoints</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Configured in Operations Setup</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {setupSanitationCheckpoints && setupSanitationCheckpoints.length > 0 ? (
                        setupSanitationCheckpoints.map((cp) => (
                          <label key={cp.id} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={janForm.checkpoints?.[cp.id] !== false}
                              onChange={(e) => {
                                const newCp = { ...(janForm.checkpoints || {}), [cp.id]: e.target.checked };
                                setJanForm({ ...janForm, checkpoints: newCp });
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-[11px] font-medium truncate" title={cp.name}>{cp.name}</span>
                          </label>
                        ))
                      ) : (
                        <>
                          <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!janForm.restrooms_sanitized}
                              onChange={(e) => setJanForm({ ...janForm, restrooms_sanitized: e.target.checked ? 1 : 0 })}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-[11px] font-medium">Restrooms Sanitized</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!janForm.floors_mopped}
                              onChange={(e) => setJanForm({ ...janForm, floors_mopped: e.target.checked ? 1 : 0 })}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-[11px] font-medium">Floors Mopped</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!janForm.trash_emptied}
                              onChange={(e) => setJanForm({ ...janForm, trash_emptied: e.target.checked ? 1 : 0 })}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-[11px] font-medium">Trash Emptied</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!janForm.soap_paper_restocked}
                              onChange={(e) => setJanForm({ ...janForm, soap_paper_restocked: e.target.checked ? 1 : 0 })}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-[11px] font-medium">Soap/Paper Restocked</span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Supervisor Rating (1 - 5)
                      </label>
                      <select
                        value={janForm.supervisor_rating}
                        onChange={(e) => setJanForm({ ...janForm, supervisor_rating: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ 5 - Excellent</option>
                        <option value={4}>⭐⭐⭐⭐ 4 - Good</option>
                        <option value={3}>⭐⭐⭐ 3 - Satisfactory</option>
                        <option value={2}>⭐⭐ 2 - Needs Attention</option>
                        <option value={1}>⭐ 1 - Unsatisfactory</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Supervisor Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kwame Mensah"
                        value={janForm.supervisor_name}
                        onChange={(e) => setJanForm({ ...janForm, supervisor_name: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Audit Notes / Observations
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Optional notes on hygiene status or supplies needed..."
                      value={janForm.notes}
                      onChange={(e) => setJanForm({ ...janForm, notes: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    />
                  </div>
                </>
              )}

              {/* SECURITY PATROL */}
              {activeTab === "security" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Security Guard / Officer <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={secForm.guard_name}
                        onChange={(e) => setSecForm({ ...secForm, guard_name: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                        required
                      >
                        <option value="">-- Choose Guard / Assigned Officer --</option>
                        {users.map((u) => {
                          const name = u.full_name || u.username || u.name;
                          return (
                            <option key={u.id} value={name}>
                              {name} {u.role ? `(${u.role})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Checkpoint Status
                      </label>
                      <select
                        value={secForm.checkpoint_status}
                        onChange={(e) => setSecForm({ ...secForm, checkpoint_status: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      >
                        <option value="SECURE">🟢 SECURE - All normal</option>
                        <option value="INCIDENT_REPORTED">🔴 INCIDENT REPORTED</option>
                        <option value="MAINTENANCE_REQUIRED">🟡 MAINTENANCE REQUIRED</option>
                        <option value="BREACH_SUSPECTED">⚠️ BREACH SUSPECTED</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Incident / Observation Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Routine patrol round completed, perimeter doors secured."
                      value={secForm.incident_description}
                      onChange={(e) => setSecForm({ ...secForm, incident_description: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Action Taken
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Logged in patrol book and notified control room"
                      value={secForm.action_taken}
                      onChange={(e) => setSecForm({ ...secForm, action_taken: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    />
                  </div>
                </>
              )}

              {/* PEST CONTROL */}
              {activeTab === "pest" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Technician / Operator <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={pestForm.technician_name}
                        onChange={(e) => setPestForm({ ...pestForm, technician_name: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                        required
                      >
                        <option value="">-- Choose Assigned Technician / Staff --</option>
                        {users.map((u) => {
                          const name = u.full_name || u.username || u.name;
                          return (
                            <option key={u.id} value={name}>
                              {name} {u.role ? `(${u.role})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Target Pest
                      </label>
                      <select
                        value={pestForm.target_pest}
                        onChange={(e) => setPestForm({ ...pestForm, target_pest: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      >
                        <option value="RODENTS">Rodents & Mice</option>
                        <option value="ROACHES">Cockroaches</option>
                        <option value="TERMITES">Subterranean Termites</option>
                        <option value="BEDBUGS">Bedbugs</option>
                        <option value="MOSQUITOES">Mosquitoes / Flying Insects</option>
                        <option value="GENERAL">General Fumigation</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Chemicals Applied
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Bromadiolone Bait / Deltamethrin"
                        value={pestForm.chemicals_applied}
                        onChange={(e) => setPestForm({ ...pestForm, chemicals_applied: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Dosage & Application Method
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ULV Mist spraying & perimeter bait blocks"
                        value={pestForm.dosage_and_method}
                        onChange={(e) => setPestForm({ ...pestForm, dosage_and_method: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Bait Stations Checked
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={pestForm.bait_stations_checked}
                        onChange={(e) => setPestForm({ ...pestForm, bait_stations_checked: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Bait Activity Detected
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={pestForm.bait_stations_activity_detected}
                        onChange={(e) => setPestForm({ ...pestForm, bait_stations_activity_detected: Number(e.target.value) })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Risk Level
                      </label>
                      <select
                        value={pestForm.risk_level}
                        onChange={(e) => setPestForm({ ...pestForm, risk_level: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      >
                        <option value="LOW">Low Risk</option>
                        <option value="MEDIUM">Medium Risk</option>
                        <option value="HIGH">High Risk</option>
                        <option value="CRITICAL">Critical Infestation</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Treatment Notes & Findings
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Notes on pest activity or follow-up recommendations..."
                      value={pestForm.notes}
                      onChange={(e) => setPestForm({ ...pestForm, notes: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    />
                  </div>
                </>
              )}

              {/* WASTE MANIFEST */}
              {activeTab === "waste" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 flex items-center justify-between">
                        <span>Waste Stream / Type</span>
                        <span className="text-[10px] text-slate-500 font-normal">From Operations Setup</span>
                      </label>
                      <select
                        value={wasteForm.waste_type}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = setupWasteStreams.find((s) => (s.code || s.name) === val || String(s.id) === String(val));
                          setWasteForm({
                            ...wasteForm,
                            waste_type: val,
                            unit: found?.default_unit || wasteForm.unit || "BINS"
                          });
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      >
                        {setupWasteStreams && setupWasteStreams.length > 0 ? (
                          setupWasteStreams.map((ws) => (
                            <option key={ws.id} value={ws.code || ws.name}>
                              {ws.name} ({ws.category || ws.code})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="GENERAL_REFUSE">General Refuse & Municipal Waste</option>
                            <option value="RECYCLABLE_PLASTIC">Recyclable Plastic</option>
                            <option value="RECYCLABLE_PAPER">Recyclable Paper & Cardboard</option>
                            <option value="HAZARDOUS">Hazardous Chemical Waste</option>
                            <option value="BIOHAZARD">Medical / Biohazard Waste</option>
                            <option value="ELECTRONIC">E-Waste / Electronics</option>
                            <option value="ORGANIC">Organic / Green Garden Waste</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={wasteForm.quantity_kg_or_bins}
                          onChange={(e) => setWasteForm({ ...wasteForm, quantity_kg_or_bins: Number(e.target.value) })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                          Unit
                        </label>
                        <select
                          value={wasteForm.unit}
                          onChange={(e) => setWasteForm({ ...wasteForm, unit: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                        >
                          <option value="BINS">Bins</option>
                          <option value="KG">Kilograms (kg)</option>
                          <option value="TONNES">Metric Tonnes</option>
                          <option value="BAGS">Bags</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 flex items-center justify-between">
                        <span>Contractor Carrier</span>
                        <span className="text-[10px] text-slate-500 font-normal">From Suppliers Setup</span>
                      </label>
                      <div className="flex gap-2">
                        {setupSuppliers && setupSuppliers.length > 0 && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                setWasteForm({ ...wasteForm, contractor_carrier_name: e.target.value });
                              }
                            }}
                            className="bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium max-w-[130px]"
                          >
                            <option value="">-- Choose --</option>
                            {setupSuppliers.map((s) => (
                              <option key={s.id || s.name} value={s.supplier_name || s.name}>
                                {s.supplier_name || s.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="text"
                          list="carrierSuppliersList"
                          placeholder="e.g. Zoomlion Ghana / City Cleaners"
                          value={wasteForm.contractor_carrier_name}
                          onChange={(e) => setWasteForm({ ...wasteForm, contractor_carrier_name: e.target.value })}
                          className="flex-1 bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                        />
                        <datalist id="carrierSuppliersList">
                          {setupSuppliers && setupSuppliers.map((s) => (
                            <option key={s.id || s.name} value={s.supplier_name || s.name} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                        Manifest Reference No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. MNF-2026-0881"
                        value={wasteForm.manifest_reference_no}
                        onChange={(e) => setWasteForm({ ...wasteForm, manifest_reference_no: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="btn btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary text-xs px-5 py-2 font-bold shadow-sm"
                >
                  {submitting ? "Saving Record..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN DAILY TASK */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl lg:max-w-5xl shadow-2xl overflow-hidden my-auto sm:my-8 transition-all">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Plus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Assign Daily Soft Facilities Task & Inspection
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dispatch operational site tasks to staff configured in Operations Setup with digital checklists.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleAssignTask} className="p-6 space-y-5 text-xs">
              {/* Multi-Column Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Property (code removed) */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Property <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={taskForm.property_id}
                    onChange={(e) => setTaskForm({ ...taskForm, property_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    required
                  >
                    <option value="">-- Choose Property --</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.property_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Service Category */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Service Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={taskForm.task_category}
                    onChange={(e) => setTaskForm({ ...taskForm, task_category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    required
                  >
                    <option value="">-- Choose Service Category --</option>
                    {setupCategories.length > 0 ? (
                      setupCategories.map((c) => (
                        <option key={c.id} value={c.category_code || c.category_name}>
                          {c.category_name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="JANITORIAL">🧹 Janitorial & Cleaning</option>
                        <option value="SECURITY_PATROL">🛡️ Security Patrol</option>
                        <option value="PEST_CONTROL">🐜 Pest Control</option>
                        <option value="WASTE_MANAGEMENT">🗑️ Waste Management</option>
                        <option value="LANDSCAPING">🌿 Landscaping & Grounds</option>
                        <option value="CONCIERGE_FRONTDESK">🛎️ Concierge & Front Desk</option>
                        <option value="GENERAL_FACILITIES">🏢 General Site Operation</option>
                      </>
                    )}
                  </select>
                </div>

                {/* 3. Priority Level */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Priority Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-semibold"
                    required
                  >
                    <option value="">-- Choose Priority Level --</option>
                    <option value="LOW">🟢 Low</option>
                    <option value="MEDIUM">🟡 Medium</option>
                    <option value="HIGH">🟠 High</option>
                    <option value="URGENT">🔴 Urgent / Critical</option>
                  </select>
                </div>

                {/* 4. Shift (name shortened from Shift (from Operations Setup)) */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Shift <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={taskForm.shift}
                    onChange={(e) => setTaskForm({ ...taskForm, shift: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    required
                  >
                    <option value="">-- Choose Shift --</option>
                    {setupShifts.length > 0 ? (
                      setupShifts.map((s) => (
                        <option key={s.id} value={s.code || s.name.toUpperCase().replace(/\s+/g, "_")}>
                          {s.name} ({s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="MORNING">Morning (06:00 - 14:00)</option>
                        <option value="AFTERNOON">Afternoon (14:00 - 22:00)</option>
                        <option value="NIGHT">Night (22:00 - 06:00)</option>
                        <option value="ALL_DAY">Full Day</option>
                      </>
                    )}
                  </select>
                </div>

                {/* 5. Multiple Assignees Selector with Busy Assignee Filtering */}
                <div className="md:col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 dark:text-slate-300 font-bold">
                      Assignee (Responsible User / Tech) <span className="text-red-500">*</span>
                    </label>
                    {taskForm.selected_assignees?.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setTaskForm((prev) => ({
                            ...prev,
                            selected_assignees: [],
                            assigned_to_name: "",
                            assigned_to_user_id: "",
                            assigned_to_personnel_id: "",
                          }))
                        }
                        className="text-[10px] text-rose-500 hover:underline font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <select
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      let newAssignee = null;
                      if (val.startsWith("pers:")) {
                        const selId = val.replace("pers:", "");
                        const p = setupPersonnel.find((x) => String(x.id) === String(selId));
                        if (p) {
                          newAssignee = {
                            id: `pers:${p.id}`,
                            personnel_id: p.id,
                            user_id: p.employee_id ? String(p.employee_id) : "",
                            name: p.name,
                            category: p.category,
                            shift: p.shift_name ? p.shift_name.toUpperCase().replace(/\s+/g, "_") : "",
                            supervisor_name: p.supervisor_name || "",
                          };
                        }
                      } else if (val.startsWith("user:")) {
                        const uId = val.replace("user:", "");
                        const u = users.find((x) => String(x.id) === String(uId));
                        if (u) {
                          newAssignee = {
                            id: `user:${u.id}`,
                            personnel_id: "",
                            user_id: String(u.id),
                            name: u.full_name || u.username || u.name || `User #${u.id}`,
                          };
                        }
                      }

                      if (newAssignee) {
                        setTaskForm((prev) => {
                          const currentList = prev.selected_assignees || [];
                          if (currentList.some((a) => a.name.toLowerCase() === newAssignee.name.toLowerCase())) {
                            return prev;
                          }
                          const updated = [...currentList, newAssignee];
                          return {
                            ...prev,
                            selected_assignees: updated,
                            assigned_to_name: updated.map((a) => a.name).join(", "),
                            assigned_to_user_id: updated[0]?.user_id || "",
                            assigned_to_personnel_id: updated[0]?.personnel_id || "",
                            ...(newAssignee.category && !prev.task_category ? { task_category: newAssignee.category } : {}),
                            ...(newAssignee.shift && !prev.shift ? { shift: newAssignee.shift } : {}),
                            ...(newAssignee.supervisor_name && !prev.supervisor_name ? { supervisor_name: newAssignee.supervisor_name } : {}),
                          };
                        });
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="">
                      {taskForm.selected_assignees?.length > 0
                        ? "+ Add Another Assignee..."
                        : "-- Choose Assignee (Service Personnel) --"}
                    </option>
                    {availablePersonnel.length > 0 && (
                      <optgroup label="Available Service Personnel (Operations Setup)">
                        {availablePersonnel.map((p) => (
                          <option key={`pers-${p.id}`} value={`pers:${p.id}`}>
                            {p.name} {p.category ? `• ${p.category}` : ""} {p.shift_name ? `[${p.shift_name}]` : ""}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {availableUsers.length > 0 && (
                      <optgroup label="Available System Users & Technicians">
                        {availableUsers.map((u) => (
                          <option key={u.id} value={`user:${u.id}`}>
                            {u.full_name || u.username || u.name || `User #${u.id}`} {u.role_name ? `• ${u.role_name}` : ""}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  {/* Selected Assignees Chips */}
                  {taskForm.selected_assignees?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {taskForm.selected_assignees.map((assignee, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 rounded-lg text-xs font-medium border border-emerald-200 dark:border-emerald-800"
                        >
                          <span>{assignee.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setTaskForm((prev) => {
                                const updated = prev.selected_assignees.filter((_, i) => i !== idx);
                                return {
                                  ...prev,
                                  selected_assignees: updated,
                                  assigned_to_name: updated.map((a) => a.name).join(", "),
                                  assigned_to_user_id: updated[0]?.user_id || "",
                                  assigned_to_personnel_id: updated[0]?.personnel_id || "",
                                };
                              });
                            }}
                            className="text-slate-400 hover:text-rose-500 font-bold ml-0.5"
                            title="Remove assignee"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* 6. Supervisor */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Supervisor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={taskForm.supervisor_name}
                    onChange={(e) => {
                      const selVal = e.target.value;
                      const u = users.find((x) => (x.full_name || x.username || x.name) === selVal || String(x.id) === String(selVal));
                      const s = setupSupervisors.find((x) => x.name === selVal);
                      setTaskForm((prev) => ({
                        ...prev,
                        supervisor_id: u ? u.id : (s ? s.id : null),
                        supervisor_name: u ? (u.full_name || u.username || u.name) : (s ? s.name : selVal),
                      }));
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    required
                  >
                    <option value="">-- Choose Supervisor --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.full_name || u.username || u.name}>
                        {u.full_name || u.username || u.name} {u.role_name ? `• ${u.role_name}` : ""}
                      </option>
                    ))}
                    {setupSupervisors.length > 0 && (
                      <optgroup label="Configured Supervisors">
                        {setupSupervisors.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name} {s.shift_name ? `(${s.shift_name})` : ""}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Checklist Template Selector */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckSquare size={13} className="text-emerald-600 dark:text-emerald-400" />
                      Inspection Checklist Template (Populates Scope &amp; Instructions)
                    </span>
                    {taskForm.checklist_template_id && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        ✓ Checkpoints Auto-Populated
                      </span>
                    )}
                  </label>
                  <select
                    value={taskForm.checklist_template_id}
                    onChange={(e) => {
                      const tplId = e.target.value;
                      const selTpl = checklists.find((c) => String(c.id) === String(tplId));
                      if (selTpl) {
                        const items = (selTpl.items || []).map((it) => it.item_text).filter(Boolean);
                        setTaskForm((prev) => ({
                          ...prev,
                          checklist_template_id: tplId,
                          title: !prev.title || prev.title.trim() === "" ? selTpl.template_name : prev.title,
                          is_inspection: true,
                          scope: items.length > 0 ? items : [selTpl.template_name],
                          desc_points: items.length > 0 ? items : [selTpl.template_name],
                          description: items.length > 0
                            ? items.map((it, idx) => `${idx + 1}. ${it}`).join("\n")
                            : prev.description || selTpl.description || "",
                        }));
                      } else {
                        setTaskForm((prev) => ({
                          ...prev,
                          checklist_template_id: "",
                        }));
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                  >
                    <option value="">-- None / Custom Manual Scope --</option>
                    {checklists.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        📋 {tpl.template_name} ({tpl.service_line?.replace(/_/g, " ")}) — {tpl.items?.length || tpl.item_count || 0} checks
                      </option>
                    ))}
                  </select>
                </div>

                {/* 7. Task Title */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ground Floor Restroom Sanitization & Deep Clean"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                    required
                  />
                </div>

                {/* 8. Description / Instructions with Multi-Points Feature */}
                <div className="md:col-span-2 lg:col-span-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-700 dark:text-slate-300 font-bold">
                      Description / Instructions <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setTaskForm((prev) => ({
                          ...prev,
                          desc_points: [...(prev.desc_points || []), ""],
                        }));
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60 active:scale-95 transition-transform"
                    >
                      <Plus size={13} /> Add Point
                    </button>
                  </div>

                  {/* Multi-Points Rows */}
                  {taskForm.desc_points && taskForm.desc_points.length > 0 ? (
                    <div className="space-y-2">
                      {taskForm.desc_points.map((point, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-5 text-center font-bold text-slate-400 text-xs shrink-0">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={point}
                            onChange={(e) => {
                              const updated = [...(taskForm.desc_points || [])];
                              updated[idx] = e.target.value;
                              setTaskForm((prev) => ({
                                ...prev,
                                desc_points: updated,
                                description: updated.filter(Boolean).map((p, i) => `${i + 1}. ${p}`).join("\n"),
                              }));
                            }}
                            placeholder={
                              idx === 0
                                ? "e.g. Sanitize all high-touch surfaces, handrails, door handles, and switches..."
                                : idx === 1
                                ? "e.g. Empty all waste bins and replace with fresh biodegradable liners..."
                                : `Instruction point #${idx + 1}...`
                            }
                            className="flex-1 bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                          />
                          {taskForm.desc_points.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = taskForm.desc_points.filter((_, i) => i !== idx);
                                setTaskForm((prev) => ({
                                  ...prev,
                                  desc_points: updated,
                                  description: updated.filter(Boolean).map((p, i) => `${i + 1}. ${p}`).join("\n"),
                                }));
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1"
                              title="Remove point"
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {/* Overview Textarea */}
                  <textarea
                    rows={2}
                    value={taskForm.description}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTaskForm((prev) => ({
                        ...prev,
                        description: val,
                      }));
                    }}
                    placeholder="Specific tasks to perform, focus areas, chemical safety guidelines, PPE requirements..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 mt-1"
                  />
                  <p className="text-[11px] text-slate-400">
                    Each point created above is automatically included as a Scope Checklist Item for the technician to inspect and complete.
                  </p>
                </div>

                {/* Inspection / Preventive Routine Toggle */}
                <div className="md:col-span-2 lg:col-span-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(taskForm.is_inspection)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setTaskForm((prev) => ({
                          ...prev,
                          is_inspection: checked,
                          scope: checked
                            ? getSoftServicesInspectionScope(prev.task_category, prev.title)
                            : [],
                        }));
                      }}
                      className="w-4 h-4 rounded text-brand-900 focus:ring-brand-900"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        This is an Inspection or Preventive Routine
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Enable to define actionable checklist items and inspection checkpoints for verification.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Service Scope Checklist (Only when toggled) */}
                {taskForm.is_inspection && (
                  <div className="md:col-span-2 lg:col-span-3 space-y-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    <label className="block font-semibold text-xs text-slate-800 dark:text-slate-200">
                      Service Scope Checklist (Items to complete)
                    </label>
                    <div className="space-y-2">
                      {taskForm.scope.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const updated = [...taskForm.scope];
                              updated[idx] = e.target.value;
                              setTaskForm({ ...taskForm, scope: updated });
                            }}
                            placeholder={`Scope item #${idx + 1}`}
                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setTaskForm({
                                ...taskForm,
                                scope: taskForm.scope.filter((_, i) => i !== idx),
                              });
                            }}
                            className="text-slate-400 hover:text-rose-500 p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTaskForm({
                          ...taskForm,
                          scope: [...taskForm.scope, ""],
                        });
                      }}
                      className="text-xs text-emerald-600 hover:text-emerald-500 font-semibold inline-flex items-center gap-1 mt-2"
                    >
                      <Plus size={12} /> Add Scope Item
                    </button>
                  </div>
                )}

                {/* Multi-Date / Scheduling & Roster System Section (Brought below Inspection Routine) */}
                <div className="md:col-span-2 lg:col-span-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <label className="text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5">
                      <Calendar size={15} className="text-emerald-500" />
                      Personnel Scheduling & Multi-Date Assignment <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setTaskForm({ ...taskForm, schedule_mode: "SINGLE" })}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          taskForm.schedule_mode === "SINGLE"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        Single Date
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskForm({ ...taskForm, schedule_mode: "MULTIPLE" })}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          taskForm.schedule_mode === "MULTIPLE"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        Specific Multiple Dates
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskForm({ ...taskForm, schedule_mode: "RANGE" })}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                          taskForm.schedule_mode === "RANGE"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        }`}
                      >
                        Roster / Date Range
                      </button>
                    </div>
                  </div>

                  {/* Mode 1: Single Date */}
                  {taskForm.schedule_mode === "SINGLE" && (
                    <div className="max-w-xs">
                      <label className="block text-slate-600 dark:text-slate-400 text-[11px] font-medium mb-1">
                        Scheduled Assignment Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={taskForm.scheduled_date}
                        onChange={(e) => setTaskForm({ ...taskForm, scheduled_date: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 font-medium"
                        required={taskForm.schedule_mode === "SINGLE"}
                      />
                    </div>
                  )}

                  {/* Mode 2: Specific Multiple Dates */}
                  {taskForm.schedule_mode === "MULTIPLE" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 max-w-md">
                        <input
                          type="date"
                          value={taskForm.custom_date_input}
                          onChange={(e) => setTaskForm({ ...taskForm, custom_date_input: e.target.value })}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!taskForm.custom_date_input) return;
                            if (taskForm.selected_dates.includes(taskForm.custom_date_input)) {
                              toast.info("Date already added");
                              return;
                            }
                            setTaskForm({
                              ...taskForm,
                              selected_dates: [...taskForm.selected_dates, taskForm.custom_date_input].sort(),
                              custom_date_input: "",
                            });
                          }}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
                        >
                          + Add Date
                        </button>
                      </div>
                      {taskForm.selected_dates.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {taskForm.selected_dates.map((d) => (
                            <span
                              key={d}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-mono font-medium"
                            >
                              {d}
                              <button
                                type="button"
                                onClick={() =>
                                  setTaskForm({
                                    ...taskForm,
                                    selected_dates: taskForm.selected_dates.filter((x) => x !== d),
                                  })
                                }
                                className="hover:text-red-500 font-bold"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                          Pick dates above and click "+ Add Date" to schedule across multiple days.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Mode 3: Date Range & Roster Schedule */}
                  {taskForm.schedule_mode === "RANGE" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 text-[11px] font-medium mb-1">
                            Start Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={taskForm.range_start_date}
                            onChange={(e) => setTaskForm({ ...taskForm, range_start_date: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-slate-200"
                            required={taskForm.schedule_mode === "RANGE"}
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 dark:text-slate-400 text-[11px] font-medium mb-1">
                            End Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={taskForm.range_end_date}
                            onChange={(e) => setTaskForm({ ...taskForm, range_end_date: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs text-slate-800 dark:text-slate-200"
                            required={taskForm.schedule_mode === "RANGE"}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            Active Recurring Days (Shift Roster):
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setTaskForm({ ...taskForm, selected_weekdays: [1, 2, 3, 4, 5, 6, 7] })}
                              className="text-[10px] text-emerald-600 hover:underline font-semibold"
                            >
                              All 7 Days
                            </button>
                            <button
                              type="button"
                              onClick={() => setTaskForm({ ...taskForm, selected_weekdays: [1, 2, 3, 4, 5] })}
                              className="text-[10px] text-emerald-600 hover:underline font-semibold"
                            >
                              Mon–Fri Only
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { num: 1, label: "Mon" },
                            { num: 2, label: "Tue" },
                            { num: 3, label: "Wed" },
                            { num: 4, label: "Thu" },
                            { num: 5, label: "Fri" },
                            { num: 6, label: "Sat" },
                            { num: 7, label: "Sun" },
                          ].map((day) => {
                            const active = taskForm.selected_weekdays.includes(day.num);
                            return (
                              <button
                                key={day.num}
                                type="button"
                                onClick={() => {
                                  const next = active
                                    ? taskForm.selected_weekdays.filter((d) => d !== day.num)
                                    : [...taskForm.selected_weekdays, day.num];
                                  setTaskForm({ ...taskForm, selected_weekdays: next });
                                }}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                  active
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                                }`}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="btn btn-secondary px-4 py-2 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary px-6 py-2 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
                >
                  <UserCheck size={13} />
                  <span>
                    {submitting
                      ? "Assigning..."
                      : taskForm.assigned_to_name
                      ? `Assigned to ${taskForm.assigned_to_name}`
                      : "Assign Task to Staff"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EXECUTE / CHECK OFF TASK */}
      {showExecuteModal && activeTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl lg:max-w-4xl shadow-2xl overflow-hidden my-auto sm:my-8 transition-all">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
              <div>
                <span className="font-mono text-[10px] text-slate-400 block">{activeTask.task_no}</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare size={17} className="text-emerald-500" />
                  Perform & Check Task: {activeTask.title}
                </h3>
              </div>
              <button onClick={() => setShowExecuteModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteJob} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
                <div>
                  <span className="text-slate-400 text-[11px] block">Assigned Personnel</span>
                  <span className="font-bold text-slate-850 dark:text-white text-xs">{activeTask.assigned_to_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Target Property</span>
                  <span className="font-bold text-slate-850 dark:text-white text-xs">{activeTask.property_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Shift & Scheduled Date</span>
                  <span className="font-bold text-slate-850 dark:text-white text-xs">{activeTask.shift} ({String(activeTask.scheduled_date).slice(0, 10)})</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-2">Checklist Items (Tap to Mark Done):</label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {executionForm.items.map((item, idx) => (
                    <label key={idx} className="flex items-center gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-colors border border-slate-200/50 dark:border-slate-700/50">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => {
                          const updated = [...executionForm.items];
                          updated[idx].checked = e.target.checked;
                          setExecutionForm({ ...executionForm, items: updated });
                        }}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span className={`text-xs ${item.checked ? "line-through text-slate-400" : "font-medium text-slate-750 dark:text-slate-200"}`}>
                        {item.item_text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Completion Notes / Supplies Used</label>
                <textarea
                  rows={3}
                  value={executionForm.completion_notes}
                  onChange={(e) => setExecutionForm({ ...executionForm, completion_notes: e.target.value })}
                  placeholder="Notes on supplies used, issues noticed, physical areas completed..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowExecuteModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  {submitting ? "Submitting..." : "Submit Job as Done"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUPERVISOR VERIFY & SIGN-OFF */}
      {showVerifyModal && activeTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl lg:max-w-3xl shadow-2xl overflow-hidden my-auto sm:my-8 transition-all">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award size={18} className="text-emerald-500" />
                Supervisor Inspection & Sign-off
              </h3>
              <button onClick={() => setShowVerifyModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifySignoff} className="p-6 space-y-4 text-xs">
              <div className="bg-emerald-50 dark:bg-emerald-950/60 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                <div className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">{activeTask.title}</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300">Completed by {activeTask.assigned_to_name}</div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 italic mt-1 bg-white/70 dark:bg-black/30 p-2.5 rounded-lg">
                  "{activeTask.completion_notes || "Job completed per standard."}"
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Supervisor Quality Rating (1 - 5 Stars)</label>
                <div className="flex items-center gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setVerifyForm({ ...verifyForm, supervisor_rating: star })}
                      className="p-1 text-amber-500 hover:scale-110 transition-transform"
                    >
                      <Star size={26} fill={verifyForm.supervisor_rating >= star ? "currentColor" : "none"} />
                    </button>
                  ))}
                  <span className="font-extrabold text-base text-slate-800 dark:text-slate-200 ml-2">{verifyForm.supervisor_rating} / 5</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Supervisor Inspection Notes</label>
                <textarea
                  rows={3}
                  value={verifyForm.supervisor_comments}
                  onChange={(e) => setVerifyForm({ ...verifyForm, supervisor_comments: e.target.value })}
                  placeholder="Confirm cleanliness, hygiene standards met, security gates verified, physical sign-off stamp..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  {submitting ? "Signing off..." : "Approve & Stamp Verified"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: VIEW TASK DETAILS */}
      {viewingTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl lg:max-w-3xl shadow-2xl overflow-hidden my-auto sm:my-8 transition-all">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
              <div>
                <span className="font-mono text-[10px] text-slate-400 block">{viewingTask.task_no}</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText size={17} className="text-emerald-500" />
                  {viewingTask.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingTask(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl">
                <div>
                  <span className="text-slate-400 text-[11px] block">Status</span>
                  <span className="font-bold text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        viewingTask.status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : viewingTask.status === "COMPLETED"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          : viewingTask.status === "IN_PROGRESS"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {viewingTask.status}
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Property</span>
                  <span className="font-bold text-slate-850 dark:text-white text-xs">{viewingTask.property_name || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Assigned Personnel</span>
                  <span className="font-bold text-slate-850 dark:text-white text-xs">{viewingTask.assigned_to_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Shift & Date</span>
                  <span className="font-bold text-slate-850 dark:text-white text-xs">{viewingTask.shift} ({String(viewingTask.scheduled_date).slice(0, 10)})</span>
                </div>
              </div>

              {viewingTask.description && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Instructions / Scope:</span>
                  <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 leading-relaxed">
                    {viewingTask.description}
                  </p>
                </div>
              )}

              {/* Checklist items */}
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-2">Checklist Items:</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {(() => {
                    let items = [];
                    try {
                      items = typeof viewingTask.checklist_data === "string" ? JSON.parse(viewingTask.checklist_data) : viewingTask.checklist_data || [];
                    } catch {
                      items = [];
                    }
                    if (!items.length) {
                      return <span className="text-slate-400 italic">No checklist items recorded.</span>;
                    }
                    return items.map((it, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200/40 dark:border-slate-700/40">
                        <span className={it.checked ? "text-emerald-600 font-bold" : "text-slate-400"}>
                          {it.checked ? "✓" : "○"}
                        </span>
                        <span className={it.checked ? "line-through text-slate-400" : "font-medium text-slate-700 dark:text-slate-300"}>
                          {it.item_text}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* Completion Notes */}
              {viewingTask.completion_notes && (
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Completion Notes / Supplies Used:</span>
                  <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                    {viewingTask.completion_notes}
                  </p>
                </div>
              )}

              {/* Supervisor verification */}
              {viewingTask.verified_by_supervisor && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 dark:text-emerald-300">Supervisor Sign-off: Verified</span>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(viewingTask.supervisor_rating || 5)].map((_, i) => (
                        <Star key={i} size={13} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 italic">
                    "{viewingTask.supervisor_comments || "Inspected and approved."}"
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingTask(null)}
                className="btn btn-secondary text-xs px-4 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
