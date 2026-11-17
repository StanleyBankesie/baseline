/**
 * @fileoverview TaskForm component.
 * Provides functionality for TaskForm with organized layout, project scope auto-selection,
 * WBS with linked dates, estimated duration with unit selector, and batch multi-task creation.
 */

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { api } from "../../../../api/client.js";
import DocumentAttachmentsModal from "@/components/attachments/DocumentAttachmentsModal.jsx";
import { usePermission } from "@/auth/PermissionContext.jsx";
import {
  Plus,
  Trash2,
  Info,
  ArrowLeft,
  ListTodo,
  Calendar,
  Clock,
  Layers,
  User,
  Edit3,
  X,
  CheckCircle2,
  Link2,
  Unlink,
  Lock,
  Zap,
  AlertCircle,
} from "lucide-react";

export default function TaskForm() {
  const { hasExceptional } = usePermission();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  // Scopes loaded dynamically when a project is selected
  const [projectScopes, setProjectScopes] = useState([]);
  const [loadingScopes, setLoadingScopes] = useState(false);

  // Existing tasks for selected project (to detect tasks under selected work plan/wbs / scope)
  const [existingProjectTasks, setExistingProjectTasks] = useState([]);
  const [loadingProjectTasks, setLoadingProjectTasks] = useState(false);
  const [selectedExistingTask, setSelectedExistingTask] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);

  // Main form data
  const [formData, setFormData] = useState({
    projectId: location.state?.projectId
      ? String(location.state.projectId)
      : "",
    projectName: location.state?.projectName || "",
    taskTitle: "",
    description: "",
    priority: "MEDIUM",
    status: "PENDING",
    estimatedHours: 1,
    durationUnit: "Days",
    dueDate: "",
    startDate: "",
    reasonForDelay: "",
    completionPercent: 0,
    assignedToId: "",
    assignedToName: "",
    wbsCode: location.state?.wbsCode || "",
    scopeName: location.state?.scopeName || "",
  });

  // Multiple tasks creation list (used when isNew)
  const [taskList, setTaskList] = useState([
    {
      id: 1,
      taskTitle: "",
      assignedToId: "",
      assignedToName: "",
      estimatedHours: 1,
      durationUnit: "Days",
      priority: "MEDIUM",
      status: "PENDING",
      subtasks: [{ text: "", completed: false }],
    },
  ]);

  const [scopeItems, setScopeItems] = useState([
    { text: "", completed: false },
    { text: "", completed: false },
    { text: "", completed: false },
  ]);
  const [delayItems, setDelayItems] = useState([""]);

  const [showAttach, setShowAttach] = useState(false);

  // Task Dependencies State
  const [predecessors, setPredecessors] = useState([]);
  const [successors, setSuccessors] = useState([]);
  const [newPredForm, setNewPredForm] = useState({
    predecessorId: "",
    dependencyType: "FS",
    lagDays: 0,
    notes: "",
  });

  const handleAddPredecessor = () => {
    if (!newPredForm.predecessorId) {
      toast.warning("Please select a predecessor task");
      return;
    }
    if (String(newPredForm.predecessorId) === String(id)) {
      toast.warning("A task cannot depend on itself");
      return;
    }
    const alreadyExists = predecessors.some(
      (p) => String(p.predecessor_id || p.id) === String(newPredForm.predecessorId),
    );
    if (alreadyExists) {
      toast.warning("This predecessor dependency already exists");
      return;
    }
    const predTask = existingProjectTasks.find(
      (t) => String(t.id) === String(newPredForm.predecessorId),
    );
    setPredecessors([
      ...predecessors,
      {
        predecessor_id: Number(newPredForm.predecessorId),
        dependency_type: newPredForm.dependencyType || "FS",
        lag_days: Number(newPredForm.lagDays || 0),
        notes: newPredForm.notes || "",
        predecessor_title: predTask?.task_title || predTask?.title || `Task #${newPredForm.predecessorId}`,
        predecessor_wbs: predTask?.wbs_code || "",
        predecessor_status: predTask?.status || "PENDING",
      },
    ]);
    setNewPredForm({ predecessorId: "", dependencyType: "FS", lagDays: 0, notes: "" });
  };

  const handleRemovePredecessor = (predId) => {
    setPredecessors(predecessors.filter((p) => String(p.predecessor_id || p.id) !== String(predId)));
  };

  // Load projects and users list on mount
  useEffect(() => {
    let mounted = true;
    api
      .get("/projects/projects", { params: { active: "all" } })
      .catch(() => api.get("/projects?active=all"))
      .then((res) => {
        if (!mounted) return;
        const list =
          res.data?.items ||
          res.data?.projects ||
          res.data?.data?.items ||
          res.data?.data ||
          (Array.isArray(res.data) ? res.data : []);
        setProjects(list);
      })
      .catch(() => {});

    api
      .get("/admin/users")
      .then((res) => {
        if (!mounted) return;
        const list =
          res.data?.items ||
          res.data?.data?.items ||
          res.data?.users ||
          res.data?.data ||
          (Array.isArray(res.data) ? res.data : []);
        setUsers(list);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // Fetch project details whenever projectId changes to populate available scopes & WBS
  useEffect(() => {
    if (!formData.projectId) {
      setProjectScopes([]);
      return;
    }
    let mounted = true;
    setLoadingScopes(true);

    api
      .get(`/projects/projects/${formData.projectId}`)
      .catch(() => api.get(`/projects/${formData.projectId}`))
      .then((res) => {
        if (!mounted) return;
        const proj = res.data?.item || res.data?.data || res.data;
        let scopes = proj?.scopes || [];
        if ((!scopes || !scopes.length) && proj?.project_scopes) {
          try {
            scopes =
              typeof proj.project_scopes === "string"
                ? JSON.parse(proj.project_scopes)
                : proj.project_scopes;
          } catch (e) {}
        }
        setProjectScopes(Array.isArray(scopes) ? scopes : []);
      })
      .catch(() => {
        if (mounted) setProjectScopes([]);
      })
      .finally(() => {
        if (mounted) setLoadingScopes(false);
      });

    return () => {
      mounted = false;
    };
  }, [formData.projectId]);

  // Derived unique scope names from selected project
  const availableScopes = useMemo(() => {
    if (!Array.isArray(projectScopes) || projectScopes.length === 0) return [];
    const names = [];
    const seen = new Set();
    projectScopes.forEach((s) => {
      const name = (s.scope_name || s.name || s.title || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        names.push(name);
      }
    });
    return names;
  }, [projectScopes]);

  // Derived available WBS elements with linked start/end dates
  const availableWbsList = useMemo(() => {
    if (!Array.isArray(projectScopes) || projectScopes.length === 0) return [];
    const list = [];
    const seen = new Set();

    projectScopes.forEach((s) => {
      const sName = (s.scope_name || s.name || s.title || "").trim();
      const matchesScope =
        !formData.scopeName ||
        sName.toLowerCase() === formData.scopeName.trim().toLowerCase();

      if (Array.isArray(s.wbs_list)) {
        s.wbs_list.forEach((w) => {
          const wVal = (w.wbs || "").trim();
          if (wVal && !seen.has(wVal.toLowerCase())) {
            seen.add(wVal.toLowerCase());
            list.push({
              wbs: wVal,
              start_date: w.start_date
                ? String(w.start_date).split("T")[0]
                : "",
              end_date: w.end_date
                ? String(w.end_date).split("T")[0]
                : w.due_date
                  ? String(w.due_date).split("T")[0]
                  : "",
              scopeName: sName,
              matchesScope,
            });
          }
        });
      }
    });
    return list;
  }, [projectScopes, formData.scopeName]);

  // Fetch existing tasks whenever projectId changes to detect tasks under selected work plan/wbs / scope
  useEffect(() => {
    if (!formData.projectId) {
      setExistingProjectTasks([]);
      setSelectedExistingTask(null);
      setEditingTaskId(null);
      return;
    }
    let mounted = true;
    setLoadingProjectTasks(true);
    api
      .get("/projects/tasks", { params: { projectId: formData.projectId } })
      .then((res) => {
        if (!mounted) return;
        const list = res.data?.items || (Array.isArray(res.data) ? res.data : []);
        setExistingProjectTasks(list);
      })
      .catch(() => {
        if (mounted) setExistingProjectTasks([]);
      })
      .finally(() => {
        if (mounted) setLoadingProjectTasks(false);
      });

    return () => {
      mounted = false;
    };
  }, [formData.projectId]);

  // Auto-populated existing tasks under selected Work Plan/WBS (and/or Scope)
  const availableExistingTasks = useMemo(() => {
    // When a task is clicked/selected for edit, the other tasks listed will auto disappear!
    if (selectedExistingTask) return [];
    if (!Array.isArray(existingProjectTasks) || existingProjectTasks.length === 0) return [];

    const norm = (s) => String(s || "").trim().toLowerCase();
    const selWbs = norm(formData.wbsCode);
    const selScope = norm(formData.scopeName);
    if (!selWbs && !selScope) return [];

    const matchStr = (a, b) => {
      if (!a || !b) return false;
      return a === b || a.includes(b) || b.includes(a);
    };

    return existingProjectTasks.filter((t) => {
      const tWbs = norm(t.wbs_code);
      const tScope = norm(t.scope_name);

      if (selWbs && selScope) {
        return matchStr(tWbs, selWbs) || (matchStr(tScope, selScope) && (!tWbs || matchStr(tWbs, selWbs)));
      }
      if (selWbs) {
        return matchStr(tWbs, selWbs);
      }
      if (selScope) {
        return matchStr(tScope, selScope);
      }
      return false;
    });
  }, [existingProjectTasks, formData.wbsCode, formData.scopeName, selectedExistingTask]);

  // Load single task when editing
  useEffect(() => {
    if (isNew) return;
    let mounted = true;
    setLoading(true);

    api
      .get(`/projects/tasks/${id}`)
      .then((res) => {
        if (!mounted) return;
        const item = res.data?.item;
        if (!item) return;

        let parsedScope = [
          { text: "", completed: false },
          { text: "", completed: false },
          { text: "", completed: false },
        ];
        if (item.task_description) {
          try {
            const raw = String(item.task_description).trim();
            if (raw.startsWith("[") && raw.endsWith("]")) {
              const arr = JSON.parse(raw);
              if (Array.isArray(arr) && arr.length > 0) {
                parsedScope = arr.map((x) => {
                  if (typeof x === "object" && x !== null) {
                    return {
                      text: String(x.text || x.label || x.name || ""),
                      completed: Boolean(x.completed),
                    };
                  }
                  return { text: String(x || ""), completed: false };
                });
              }
            } else if (raw) {
              parsedScope = raw
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => ({ text: s, completed: false }));
            }
          } catch {
            parsedScope = [{ text: item.task_description, completed: false }];
          }
        }
        while (parsedScope.length < 3) {
          parsedScope.push({ text: "", completed: false });
        }
        setScopeItems(parsedScope);

        let parsedDelay = [""];
        if (item.reason_for_delay) {
          try {
            const raw = String(item.reason_for_delay).trim();
            if (raw.startsWith("[") && raw.endsWith("]")) {
              const arr = JSON.parse(raw);
              if (Array.isArray(arr) && arr.length > 0) {
                parsedDelay = arr.map(String);
              }
            } else if (raw) {
              parsedDelay = raw
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
            }
          } catch {
            parsedDelay = [item.reason_for_delay];
          }
        }
        if (parsedDelay.length === 0) parsedDelay = [""];
        setDelayItems(parsedDelay);

        setFormData({
          projectId: String(item.project_id || ""),
          projectName: item.project_name || "",
          taskTitle: item.task_title || "",
          description: item.task_description || "",
          priority: item.priority || "MEDIUM",
          status: item.status || "PENDING",
          estimatedHours: item.estimated_hours ?? 1,
          durationUnit: item.duration_unit || "Days",
          dueDate: item.end_date ? item.end_date.split("T")[0] : "",
          startDate: item.start_date ? item.start_date.split("T")[0] : "",
          reasonForDelay: item.reason_for_delay || "",
          completionPercent: item.completion_percent || 0,
          assignedToId: String(item.assigned_to_id || ""),
          assignedToName: item.assigned_to_name || "",
          wbsCode: item.wbs_code || "",
          scopeName: item.scope_name || "",
        });
        setPredecessors(Array.isArray(item.predecessors) ? item.predecessors : []);
        setSuccessors(Array.isArray(item.successors) ? item.successors : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.response?.data?.message || "Failed to load task");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, isNew]);

  // Handle selecting a scope pill
  const handleSelectScope = (scope) => {
    setSelectedExistingTask(null);
    setEditingTaskId(null);
    setFormData((prev) => ({
      ...prev,
      scopeName: prev.scopeName === scope ? "" : scope,
    }));
  };

  // Handle selecting a WBS pill with auto-populating dates & scope
  const handleSelectWbs = (item) => {
    setSelectedExistingTask(null);
    setEditingTaskId(null);
    setFormData((prev) => ({
      ...prev,
      wbsCode: item.wbs,
      startDate: item.start_date || prev.startDate,
      dueDate: item.end_date || prev.dueDate,
      scopeName: prev.scopeName || item.scopeName || "",
    }));
  };

  // Handle selecting an existing task from vertical list to edit it
  const handleSelectExistingTask = (t) => {
    setSelectedExistingTask(t);
    setEditingTaskId(t.id);

    // Parse subtasks / checkpoints from task_description
    let parsedSubtasks = [{ text: "", completed: false }];
    if (t.task_description) {
      try {
        const raw = String(t.task_description).trim();
        if (raw.startsWith("[") && raw.endsWith("]")) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length > 0) {
            parsedSubtasks = arr.map((x) => ({
              text: typeof x === "object" ? String(x.text || x.name || x.title || "") : String(x || ""),
              completed: Boolean(x?.completed),
            }));
          }
        } else if (raw) {
          parsedSubtasks = raw
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => ({ text: s, completed: false }));
        }
      } catch {}
    }
    if (parsedSubtasks.length === 0) parsedSubtasks = [{ text: "", completed: false }];

    // Populate taskList row (multi-task mode) with existing task details
    setTaskList([
      {
        id: t.id,
        isExisting: true,
        taskTitle: t.task_title || "",
        assignedToId: t.assigned_to_id ? String(t.assigned_to_id) : "",
        assignedToName: t.assigned_to_name || "",
        estimatedHours:
          t.estimated_hours !== undefined && t.estimated_hours !== null
            ? t.estimated_hours
            : 1,
        durationUnit: t.duration_unit || "Days",
        priority: t.priority || "MEDIUM",
        status: t.status || "PENDING",
        subtasks: parsedSubtasks,
      },
    ]);

    // Also update form general fields for scope, dates & wbs
    setFormData((prev) => ({
      ...prev,
      taskTitle: t.task_title || "",
      assignedToId: t.assigned_to_id ? String(t.assigned_to_id) : "",
      assignedToName: t.assigned_to_name || "",
      estimatedHours:
        t.estimated_hours !== undefined && t.estimated_hours !== null
          ? t.estimated_hours
          : 1,
      durationUnit: t.duration_unit || "Days",
      priority: t.priority || "MEDIUM",
      status: t.status || "PENDING",
      wbsCode: t.wbs_code || prev.wbsCode,
      scopeName: t.scope_name || prev.scopeName,
      startDate: t.start_date
        ? String(t.start_date).split("T")[0]
        : prev.startDate,
      dueDate: t.end_date
        ? String(t.end_date).split("T")[0]
        : prev.dueDate,
    }));
  };

  const handleCancelSelectExistingTask = () => {
    setSelectedExistingTask(null);
    setEditingTaskId(null);
    setTaskList([
      {
        id: Date.now(),
        isExisting: false,
        taskTitle: "",
        assignedToId: "",
        assignedToName: "",
        estimatedHours: 1,
        durationUnit: "Days",
        priority: "MEDIUM",
        status: "PENDING",
        subtasks: [{ text: "", completed: false }],
      },
    ]);
  };

  // Multi-task list handlers for isNew
  const handleAddTaskRow = () => {
    setTaskList((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        taskTitle: "",
        assignedToId: "",
        assignedToName: "",
        estimatedHours: 1,
        durationUnit: "Days",
        priority: "MEDIUM",
        status: "PENDING",
        subtasks: [{ text: "", completed: false }],
      },
    ]);
  };

  const handleRemoveTaskRow = (index) => {
    if (taskList.length <= 1) {
      setTaskList([
        {
          id: Date.now(),
          taskTitle: "",
          assignedToId: "",
          assignedToName: "",
          estimatedHours: 1,
          durationUnit: "Days",
          priority: "MEDIUM",
          status: "PENDING",
          subtasks: [{ text: "", completed: false }],
        },
      ]);
    } else {
      setTaskList((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleTaskSubtaskChange = (taskIndex, subtaskIndex, value) => {
    setTaskList((prev) =>
      prev.map((row, i) => {
        if (i !== taskIndex) return row;

        const subtasks = [
          ...(row.subtasks || [{ text: "", completed: false }]),
        ];
        const existing = subtasks[subtaskIndex] || {
          text: "",
          completed: false,
        };
        subtasks[subtaskIndex] = { ...existing, text: value };

        return { ...row, subtasks };
      }),
    );
  };

  const handleAddTaskSubtask = (taskIndex) => {
    setTaskList((prev) =>
      prev.map((row, i) =>
        i === taskIndex
          ? {
              ...row,
              subtasks: [
                ...(row.subtasks || []),
                { text: "", completed: false },
              ],
            }
          : row,
      ),
    );
  };

  const handleRemoveTaskSubtask = (taskIndex, subtaskIndex) => {
    setTaskList((prev) =>
      prev.map((row, i) => {
        if (i !== taskIndex) return row;

        const subtasks = (
          row.subtasks || [{ text: "", completed: false }]
        ).filter((_, idx) => idx !== subtaskIndex);

        return {
          ...row,
          subtasks: subtasks.length
            ? subtasks
            : [{ text: "", completed: false }],
        };
      }),
    );
  };

  const handleTaskRowChange = (index, field, value) => {
    setTaskList((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const updated = { ...row, [field]: value };
        if (field === "assignedToId") {
          const u = users.find((x) => String(x.id) === String(value));
          updated.assignedToName = u
            ? u.username || u.full_name || u.name || ""
            : "";
          if (value) {
            updated.status = "IN_PROGRESS";
          }
        }
        return updated;
      }),
    );
  };

  // Scope sub-items handlers
  const handleScopeChange = (index, value) => {
    const updated = [...scopeItems];
    const currentCompleted =
      typeof updated[index] === "object"
        ? Boolean(updated[index].completed)
        : false;
    updated[index] = { text: value, completed: currentCompleted };
    setScopeItems(updated);
  };

  const handleAddScopeItem = () => {
    setScopeItems((prev) => [...prev, { text: "", completed: false }]);
  };

  const handleRemoveScopeItem = (index) => {
    if (scopeItems.length <= 3) {
      const updated = [...scopeItems];
      updated[index] = { text: "", completed: false };
      setScopeItems(updated);
    } else {
      setScopeItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError("");

    if (!formData.projectId) {
      setError("Please select a project.");
      setSaving(false);
      return;
    }

    try {
      const cleanScope = scopeItems
        .map((s) => ({
          text: (typeof s === "object" ? s.text || "" : String(s || "")).trim(),
          completed: typeof s === "object" ? Boolean(s.completed) : false,
        }))
        .filter((s) => s.text.length > 0);

      const cleanDelay = delayItems.map((d) => d.trim()).filter(Boolean);

      if (isNew && !editingTaskId) {
        // Multi-task creation mode
        const validTasks = taskList
          .filter((t) => t.taskTitle && t.taskTitle.trim())
          .map((t) => {
            const taskSubtasks = (t.subtasks || [])
              .map((s) => ({
                text: String(s?.text || "").trim(),
                completed: Boolean(s?.completed),
              }))
              .filter((s) => s.text.length > 0);

            return {
              task_title: t.taskTitle.trim(),
              assigned_to_id: t.assignedToId || null,
              assigned_to_name: t.assignedToName || null,
              priority: t.priority || "MEDIUM",
              status: t.assignedToId ? "IN_PROGRESS" : t.status || "PENDING",
              estimated_hours:
                t.estimatedHours !== undefined && t.estimatedHours !== ""
                  ? Number(t.estimatedHours)
                  : 1,
              duration_unit: t.durationUnit || "Days",
              start_date: formData.startDate || null,
              end_date: formData.dueDate || null,
              wbs_code: formData.wbsCode || null,
              scope_name: formData.scopeName || null,
              task_description:
                taskSubtasks.length > 0
                  ? JSON.stringify(taskSubtasks)
                  : cleanScope.length > 0
                    ? JSON.stringify(cleanScope)
                    : null,
            };
          });

        if (!validTasks.length) {
          setError("Please enter at least one task title.");
          setSaving(false);
          return;
        }

        await api.post("/projects/tasks", {
          project_id: formData.projectId || null,
          scope_name: formData.scopeName || null,
          wbs_code: formData.wbsCode || null,
          start_date: formData.startDate || null,
          end_date: formData.dueDate || null,
          tasks: validTasks,
        });
      } else if (editingTaskId) {
        // Replacing and updating the selected existing task in the database
        const primaryRow = taskList[0] || {};
        const primarySubtasks = (primaryRow.subtasks || [])
          .map((s) => ({
            text: String(s?.text || "").trim(),
            completed: Boolean(s?.completed),
          }))
          .filter((s) => s.text.length > 0);

        const taskTitle = (primaryRow.taskTitle || formData.taskTitle || "").trim();
        if (!taskTitle) {
          setError("Please enter a task title.");
          setSaving(false);
          return;
        }

        const updatePayload = {
          id: editingTaskId,
          project_id: formData.projectId ? Number(formData.projectId) : null,
          task_title: taskTitle,
          task_description:
            primarySubtasks.length > 0
              ? JSON.stringify(primarySubtasks)
              : cleanScope.length > 0
                ? JSON.stringify(cleanScope)
                : null,
          assigned_to_id: primaryRow.assignedToId || formData.assignedToId || null,
          assigned_to_name: primaryRow.assignedToName || formData.assignedToName || null,
          priority: primaryRow.priority || formData.priority || "MEDIUM",
          status: primaryRow.status || formData.status || "PENDING",
          estimated_hours:
            primaryRow.estimatedHours !== undefined && primaryRow.estimatedHours !== ""
              ? Number(primaryRow.estimatedHours)
              : 1,
          duration_unit: primaryRow.durationUnit || formData.durationUnit || "Days",
          start_date: formData.startDate || null,
          end_date: formData.dueDate || null,
          wbs_code: formData.wbsCode || null,
          scope_name: formData.scopeName || null,
        };

        await api.put(`/projects/tasks/${editingTaskId}`, updatePayload);

        // If extra task rows were added beyond the edited task
        const extraRows = taskList.slice(1).filter((t) => t.taskTitle && t.taskTitle.trim());
        if (extraRows.length > 0) {
          const extraPayloads = extraRows.map((t) => {
            const extraSubs = (t.subtasks || [])
              .map((s) => ({ text: String(s?.text || "").trim(), completed: Boolean(s?.completed) }))
              .filter((s) => s.text.length > 0);
            return {
              task_title: t.taskTitle.trim(),
              assigned_to_id: t.assignedToId || null,
              assigned_to_name: t.assignedToName || null,
              priority: t.priority || "MEDIUM",
              status: t.assignedToId ? "IN_PROGRESS" : t.status || "PENDING",
              estimated_hours:
                t.estimatedHours !== undefined && t.estimatedHours !== "" ? Number(t.estimatedHours) : 1,
              duration_unit: t.durationUnit || "Days",
              start_date: formData.startDate || null,
              end_date: formData.dueDate || null,
              wbs_code: formData.wbsCode || null,
              scope_name: formData.scopeName || null,
              task_description: extraSubs.length > 0 ? JSON.stringify(extraSubs) : null,
            };
          });
          await api.post("/projects/tasks", {
            project_id: formData.projectId || null,
            scope_name: formData.scopeName || null,
            wbs_code: formData.wbsCode || null,
            start_date: formData.startDate || null,
            end_date: formData.dueDate || null,
            tasks: extraPayloads,
          });
        }
      } else {
        // Single task edit mode
        if (!formData.taskTitle || !formData.taskTitle.trim()) {
          setError("Please enter a task title.");
          setSaving(false);
          return;
        }

        const payload = {
          project_id: formData.projectId || null,
          task_title: formData.taskTitle.trim(),
          task_description:
            cleanScope.length > 0 ? JSON.stringify(cleanScope) : null,
          priority: formData.priority,
          status: formData.status,
          estimated_hours:
            formData.estimatedHours !== undefined &&
            formData.estimatedHours !== ""
              ? Number(formData.estimatedHours)
              : 1,
          duration_unit: formData.durationUnit || "Days",
          end_date: formData.dueDate || null,
          start_date: formData.startDate || null,
          reason_for_delay:
            cleanDelay.length > 0 ? JSON.stringify(cleanDelay) : null,
          completion_percent:
            formData.status === "COMPLETED"
              ? 100
              : formData.completionPercent || 0,
          assigned_to_id: formData.assignedToId || null,
          assigned_to_name: formData.assignedToName || null,
          wbs_code: formData.wbsCode || null,
          scope_name: formData.scopeName || null,
          predecessors: predecessors.map((p) => ({
            predecessor_id: p.predecessor_id || p.id,
            dependency_type: p.dependency_type || "FS",
            lag_days: Number(p.lag_days || 0),
            notes: p.notes || "",
          })),
        };

        await api.put(`/projects/tasks/${id}`, payload);
      }

      toast.success(
        editingTaskId
          ? "Task updated and replaced successfully"
          : isNew
            ? "Task assignment saved successfully"
            : "Task updated successfully",
      );

      // Navigate back to task assignment board or tasks list
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/project-management/tasks/assignment", {
          state: { refresh: true },
        });
      }
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to save task assignment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Canonical Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/project-management/tasks/assignment");
            }}
            className="btn btn-secondary inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ListTodo
                size={24}
                className="text-brand-600 dark:text-brand-400"
              />
              {editingTaskId
                ? "Edit Existing Task Assignment"
                : isNew
                  ? "New Task Assignment"
                  : "Edit Task"}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Project Work Plan/WBS & Task Execution Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={() => setShowAttach(true)}
              className="btn btn-secondary text-sm inline-flex items-center gap-1.5"
            >
              📎 Attachments
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate("/project-management/tasks/assignment");
            }}
            className="btn btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="btn btn-primary text-sm inline-flex items-center gap-2 font-semibold shadow-xs"
          >
            {saving
              ? "Saving…"
              : editingTaskId
                ? "Save & Replace Task"
                : isNew
                  ? taskList.length > 1
                    ? `Save ${taskList.length} Tasks`
                    : "Save Task Assignment"
                  : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="card-body p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {loading ? (
              <div className="text-sm text-slate-500 animate-pulse flex items-center gap-2">
                <Clock size={16} /> Loading task details...
              </div>
            ) : null}
            {error ? (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                {error}
              </div>
            ) : null}

            {/* Group 1: Project & WBS Information */}
            <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers
                    size={14}
                    className="text-brand-600 dark:text-brand-400"
                  />
                  1. Project, Scope & Project Work Plan/WBS Allocation
                </h2>
                {loadingScopes && (
                  <span className="text-[11px] text-brand-600 dark:text-brand-400 animate-pulse font-medium">
                    Fetching project scopes & work plans/wbs...
                  </span>
                )}
              </div>

              {/* Project Selection */}
              <div>
                <label className="label font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  className="input w-full"
                  value={formData.projectId || ""}
                  onChange={(e) => {
                    const sel = projects.find(
                      (p) => String(p.id) === String(e.target.value),
                    );
                    setFormData({
                      ...formData,
                      projectId: e.target.value,
                      projectName: sel
                        ? sel.project_name || sel.name || ""
                        : formData.projectName,
                      scopeName: "",
                      wbsCode: "",
                    });
                  }}
                  required
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.project_name ||
                        p.name ||
                        p.title ||
                        p.project_code ||
                        `Project #${p.id}`}
                    </option>
                  ))}
                  {formData.projectId &&
                    !projects.some(
                      (p) => String(p.id) === String(formData.projectId),
                    ) && (
                      <option value={String(formData.projectId)}>
                        {formData.projectName ||
                          `Project #${formData.projectId}`}
                      </option>
                    )}
                </select>
              </div>

              {/* Project Scope with auto-shown clickable pills */}
              <div className="space-y-1.5 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="label font-semibold text-xs text-slate-700 dark:text-slate-300 mb-0 block">
                    Project Scope
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Type a new scope or select an existing one below
                  </span>
                </div>
                <input
                  type="text"
                  className="input w-full"
                  placeholder="e.g. Construct a three-storey office building"
                  value={formData.scopeName}
                  onChange={(e) => {
                    if (!editingTaskId) {
                      setSelectedExistingTask(null);
                    }
                    setFormData({ ...formData, scopeName: e.target.value });
                  }}
                />

                {/* Auto-shown clickable scope pills */}
                {availableScopes.length > 0 && !formData.scopeName.trim() && (
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Project Scopes (click to populate):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableScopes.map((scope, idx) => {
                        const isSelected = formData.scopeName === scope;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectScope(scope)}
                            className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors inline-flex items-center gap-1 bg-[#287b9b] hover:bg-[#216982] text-white border border-[#206b87] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#287b9b] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                              isSelected
                                ? "shadow-xs ring-2 ring-[#287b9b]/30"
                                : ""
                            }`}
                          >
                            <span>{scope}</span>
                            {isSelected && (
                              <span className="text-white text-[11px]">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Work Plan/WBS Field with linked Start Date & End Date (exact logic from Project Scope modal) */}
              <div className="space-y-2 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="label font-semibold text-xs text-slate-700 dark:text-slate-300 mb-0 block">
                    Project Work Plan/WBS
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Specify project work plan/wbs and linked schedule dates
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40">
                  {/* Work Plan/WBS Name/Code */}
                  <div className="sm:col-span-5 flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 shrink-0">
                      Work Plan/WBS:
                    </span>
                    <input
                      type="text"
                      className="input text-xs font-semibold text-slate-800 dark:text-slate-200 flex-1 py-1.5"
                      placeholder="e.g. 1.0 Design, foundation, structural works"
                      value={formData.wbsCode}
                      onChange={(e) => {
                        if (!editingTaskId) {
                          setSelectedExistingTask(null);
                        }
                        setFormData({ ...formData, wbsCode: e.target.value });
                      }}
                    />
                  </div>

                  {/* Directly linked Start Date */}
                  <div className="sm:col-span-3 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 shrink-0">
                      Start:
                    </span>
                    <input
                      type="date"
                      className="input text-xs py-1.5 w-full"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                    />
                  </div>

                  {/* Directly linked End Date */}
                  <div className="sm:col-span-4 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 shrink-0">
                      End:
                    </span>
                    <input
                      type="date"
                      className="input text-xs py-1.5 w-full"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, dueDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Auto-shown clickable Work Plan/WBS pills */}
                {availableWbsList.length > 0 && !formData.wbsCode.trim() && (
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Available Project Work Plans/WBS (click to populate):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableWbsList.map((item, idx) => {
                        const isSelected = formData.wbsCode === item.wbs;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectWbs(item)}
                            className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-colors inline-flex items-center gap-1.5 bg-[#287b9b] hover:bg-[#216982] text-white border border-[#206b87] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#287b9b] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                              isSelected
                                ? "shadow-xs ring-2 ring-[#287b9b]/30"
                                : ""
                            }`}
                          >
                            <span>{item.wbs}</span>
                            {item.start_date && item.end_date && (
                              <span className="text-[10px] text-white/85 font-normal">
                                ({item.start_date} ~ {item.end_date})
                              </span>
                            )}
                            {isSelected && (
                              <span className="text-white text-[11px]">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Group 2: Tasks Section (Multi-task mode for isNew, single task for edit) */}
            {isNew ? (
              <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div>
                    <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ListTodo
                        size={14}
                        className="text-brand-600 dark:text-brand-400"
                      />
                      2. Tasks Under this Scope & Work Plan/WBS ({taskList.length})
                    </h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Add multiple tasks with assignees and duration under this
                      work plan/wbs
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTaskRow}
                    className="btn btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 font-semibold text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-950/40 shadow-2xs"
                  >
                    <Plus size={14} /> Add Task
                  </button>
                </div>

                {/* Auto-populated Vertical List of Existing Tasks under selected Work Plan/WBS (and/or Scope) */}
                {availableExistingTasks.length > 0 && !selectedExistingTask && (
                  <div className="p-4 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-200/60 dark:border-sky-800/40 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
                        <span className="text-xs font-bold text-sky-950 dark:text-sky-200">
                          Existing Tasks Created Under this Work Plan/WBS ({availableExistingTasks.length})
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300">
                        Click any task below to populate and edit its details
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {availableExistingTasks.map((t, tIdx) => {
                        let subtaskCount = 0;
                        if (t.task_description) {
                          try {
                            const raw = String(t.task_description).trim();
                            if (raw.startsWith("[") && raw.endsWith("]")) {
                              const arr = JSON.parse(raw);
                              if (Array.isArray(arr)) subtaskCount = arr.length;
                            }
                          } catch {}
                        }

                        return (
                          <div
                            key={t.id || tIdx}
                            onClick={() => handleSelectExistingTask(t)}
                            role="button"
                            tabIndex={0}
                            className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {tIdx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                    {t.task_title}
                                  </span>
                                  {subtaskCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                      {subtaskCount} checkpoint{subtaskCount > 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <User size={12} className="text-slate-400" />
                                    {t.assigned_to_name || "Unassigned"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock size={12} className="text-slate-400" />
                                    {t.estimated_hours ?? 1} {t.duration_unit || "Days"}
                                  </span>
                                  {t.wbs_code && (
                                    <span className="truncate max-w-[200px] text-slate-400">
                                      Plan: {t.wbs_code}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  t.priority === "HIGH"
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                    : t.priority === "LOW"
                                      ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                }`}
                              >
                                {t.priority || "MEDIUM"}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  t.status === "COMPLETED"
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                    : t.status === "IN_PROGRESS"
                                      ? "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {t.status || "PENDING"}
                              </span>
                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-200 group-hover:bg-sky-600 group-hover:text-white transition-all inline-flex items-center gap-1">
                                <Edit3 size={12} /> Edit
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Banner when an existing task is selected for edit */}
                {selectedExistingTask && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 rounded-lg bg-amber-200/70 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 shrink-0">
                        <Edit3 size={15} />
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-amber-950 dark:text-amber-100">
                            Editing Existing Task: {selectedExistingTask.task_title}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                            Task #{selectedExistingTask.id}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                          Saving will update and replace this existing task in the database (including any updated work plan/wbs and scope).
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCancelSelectExistingTask}
                      className="btn btn-secondary text-xs py-1.5 px-3 bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-2xs font-semibold self-start sm:self-center shrink-0 inline-flex items-center gap-1.5"
                    >
                      <X size={13} /> Cancel Edit / Choose Another Task
                    </button>
                  </div>
                )}

                <div className="space-y-2">
                  {/* Table Column Headers on Desktop */}
                  <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <span className="w-8 shrink-0 text-center">#</span>
                    <span className="flex-1 min-w-[200px]">
                      Task Name <span className="text-red-500">*</span>
                    </span>
                    <span className="w-48 shrink-0">Assignee</span>
                    <span className="w-44 shrink-0">Est. Duration & Unit</span>
                    <span className="w-28 shrink-0">Priority</span>
                    <span className="w-10 shrink-0 text-center">Action</span>
                  </div>

                  {taskList.map((taskRow, idx) => (
                    <div
                      key={taskRow.id || idx}
                      className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/90 dark:border-slate-700/80 space-y-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="flex items-center justify-between lg:justify-center w-full lg:w-8 shrink-0">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            #{idx + 1}
                          </span>
                          {/* Mobile-only delete button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveTaskRow(idx)}
                            className="lg:hidden text-rose-500 hover:text-rose-700 p-1"
                            title="Remove Task"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Task Title */}
                        <div className="flex-1 min-w-[200px]">
                          <label className="lg:hidden text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                            Task Title *
                          </label>
                          <input
                            type="text"
                            className="input w-full text-xs py-1.5"
                            placeholder="e.g. Excavate foundation, pour concrete, install electrical wiring"
                            value={taskRow.taskTitle}
                            onChange={(e) =>
                              handleTaskRowChange(
                                idx,
                                "taskTitle",
                                e.target.value,
                              )
                            }
                            required
                          />
                        </div>

                        {/* Assignee */}
                        <div className="w-full lg:w-48 shrink-0">
                          <label className="lg:hidden text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                            Assignee
                          </label>
                          <select
                            className="input w-full text-xs py-1.5"
                            value={taskRow.assignedToId || ""}
                            onChange={(e) =>
                              handleTaskRowChange(
                                idx,
                                "assignedToId",
                                e.target.value,
                              )
                            }
                          >
                            <option value="">Unassigned</option>
                            {users.map((u) => (
                              <option key={u.id} value={String(u.id)}>
                                {u.username ||
                                  u.full_name ||
                                  u.name ||
                                  `User #${u.id}`}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Est. Duration & Unit Selector */}
                        <div className="w-full lg:w-44 shrink-0">
                          <label className="lg:hidden text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                            Est. Duration & Unit
                          </label>
                          <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 w-full">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              className="w-20 px-2.5 py-1 text-xs text-right font-semibold bg-transparent border-0 outline-none text-slate-800 dark:text-slate-100 flex-1"
                              placeholder="0"
                              title="Estimated Duration Value"
                              value={taskRow.estimatedHours ?? ""}
                              onChange={(e) =>
                                handleTaskRowChange(
                                  idx,
                                  "estimatedHours",
                                  e.target.value,
                                )
                              }
                            />
                            <select
                              className="bg-slate-100 dark:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 px-2 py-1 border-l border-slate-300 dark:border-slate-600 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-650 transition-colors shrink-0"
                              title="Select Duration Unit"
                              value={taskRow.durationUnit || "Days"}
                              onChange={(e) =>
                                handleTaskRowChange(
                                  idx,
                                  "durationUnit",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="Hours">Hours</option>
                              <option value="Days">Days</option>
                              <option value="Weeks">Weeks</option>
                              <option value="Months">Months</option>
                            </select>
                          </div>
                        </div>

                        {/* Priority */}
                        <div className="w-full lg:w-28 shrink-0">
                          <label className="lg:hidden text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                            Priority
                          </label>
                          <select
                            className="input w-full text-xs py-1.5"
                            value={taskRow.priority || "MEDIUM"}
                            onChange={(e) =>
                              handleTaskRowChange(
                                idx,
                                "priority",
                                e.target.value,
                              )
                            }
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                          </select>
                        </div>

                        <div className="hidden lg:flex w-10 shrink-0 justify-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveTaskRow(idx)}
                            className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Remove Task"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="w-full lg:w-1/2 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            Execution Checkpoints / Sub-tasks
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddTaskSubtask(idx)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                          >
                            <Plus size={12} /> Add checkpoint
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(
                            taskRow.subtasks || [{ text: "", completed: false }]
                          ).map((subtask, subIndex) => (
                            <div
                              key={`${taskRow.id}-sub-${subIndex}`}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="text"
                                className="input w-full text-xs py-1.5"
                                placeholder="Specify checkpoint / sub-task..."
                                value={subtask.text || ""}
                                onChange={(e) =>
                                  handleTaskSubtaskChange(
                                    idx,
                                    subIndex,
                                    e.target.value,
                                  )
                                }
                              />
                              {((taskRow.subtasks || []).length > 1 ||
                                subtask.text) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveTaskSubtask(idx, subIndex)
                                  }
                                  className="text-rose-500 hover:text-rose-700 p-1"
                                  title="Remove checkpoint"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleAddTaskRow}
                    className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors inline-flex items-center gap-1.5 font-medium"
                  >
                    <Plus size={14} /> Add Another Task
                  </button>
                </div>
              </div>
            ) : (
              /* Single Task Edit Form */
              <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    2. Task Specification & Effort
                  </h2>
                </div>

                <div>
                  <label className="label font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5 block">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Enter descriptive task title..."
                    value={formData.taskTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, taskTitle: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                  <div>
                    <label className="label font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Assignee
                    </label>
                    <select
                      className="input w-full text-xs"
                      value={formData.assignedToId || ""}
                      onChange={(e) => {
                        const u = users.find(
                          (x) => String(x.id) === String(e.target.value),
                        );
                        setFormData({
                          ...formData,
                          assignedToId: e.target.value,
                          assignedToName: u
                            ? u.username || u.full_name || u.name || ""
                            : formData.assignedToName,
                          status: e.target.value
                            ? "IN_PROGRESS"
                            : formData.status,
                        });
                      }}
                    >
                      <option value="">Unassigned</option>
                      {users.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {u.username ||
                            u.full_name ||
                            u.name ||
                            `User #${u.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Est. Duration & Unit
                    </label>
                    <div className="flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        className="w-24 px-2.5 py-1.5 text-xs text-right font-semibold bg-transparent border-0 outline-none text-slate-800 dark:text-slate-100 flex-1"
                        placeholder="0"
                        value={formData.estimatedHours ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            estimatedHours: e.target.value,
                          })
                        }
                      />
                      <select
                        className="bg-slate-100 dark:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 px-3 py-1.5 border-l border-slate-300 dark:border-slate-600 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-650 transition-colors"
                        value={formData.durationUnit || "Days"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            durationUnit: e.target.value,
                          })
                        }
                      >
                        <option value="Hours">Hours</option>
                        <option value="Days">Days</option>
                        <option value="Weeks">Weeks</option>
                        <option value="Months">Months</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="label font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Priority
                    </label>
                    <select
                      className="input w-full text-xs"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Keep the separate legacy checkpoint editor for existing tasks only. */}
            {!isNew && (
              <div className="space-y-5 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    3. Execution Details & Scope Checkpoints
                  </h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="label font-semibold text-xs text-slate-700 dark:text-slate-300 mb-0">
                        Execution Checkpoints / Sub-tasks
                      </label>
                      <button
                        type="button"
                        onClick={handleAddScopeItem}
                        className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Checkpoint Field
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {scopeItems.map((item, idx) => {
                        const itemText =
                          typeof item === "object"
                            ? item.text || ""
                            : String(item || "");
                        const isCompleted =
                          typeof item === "object"
                            ? Boolean(item.completed)
                            : false;
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold w-6 text-right shrink-0 ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}
                            >
                              {idx + 1}.
                            </span>
                            <input
                              type="text"
                              className={`input w-full text-xs transition-colors ${
                                isCompleted
                                  ? "border-emerald-500/60 focus:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 font-semibold"
                                  : ""
                              }`}
                              placeholder={`Specify checkpoint ${idx + 1}...`}
                              value={itemText}
                              onChange={(e) =>
                                handleScopeChange(idx, e.target.value)
                              }
                            />
                            {isCompleted ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0">
                                ✓
                              </span>
                            ) : null}
                            {scopeItems.length > 3 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveScopeItem(idx)}
                                className="p-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors shrink-0"
                                title="Remove field"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {!isNew && (
                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                      <label className="label font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                        <span>Reason for Delay</span>
                        <span className="text-xs font-normal text-slate-400 flex items-center gap-1">
                          <Info size={12} /> Read-only (Fetched from table)
                        </span>
                      </label>
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300 min-h-[46px] flex items-center">
                        {formData.reasonForDelay ? (
                          <span className="whitespace-pre-wrap font-medium">
                            {formData.reasonForDelay}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            No delay reasons recorded yet
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Group 4: Task Dependencies & Gantt Sequencing */}
            {!isNew && (
              <div className="space-y-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="border-b border-slate-200 dark:border-slate-700 pb-2 flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Link2 size={14} className="text-brand-600" />
                      4. Task Dependencies &amp; Scheduling Constraints
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Configure predecessor and successor relationships for CPM schedule calculation and Gantt sequencing.
                    </p>
                  </div>
                </div>

                {/* Predecessors List */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Predecessor Tasks (This task depends on)</span>
                    <span className="text-[11px] font-normal text-slate-500">{predecessors.length} links</span>
                  </div>

                  {predecessors.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-400 italic">
                      No predecessor dependencies set. This task is free to start at project inception.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {predecessors.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                              {p.dependency_type || "FS"}
                              {p.lag_days ? `+${p.lag_days}d` : ""}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {p.predecessor_title || `Task #${p.predecessor_id}`}
                            </span>
                            {p.notes && (
                              <span className="text-slate-400 italic">({p.notes})</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              String(p.predecessor_status || "").toUpperCase() === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {p.predecessor_status || "Pending"}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePredecessor(p.predecessor_id || p.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Remove dependency"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Predecessor Controls */}
                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/30 border border-dashed border-slate-300 dark:border-slate-700 space-y-2 mt-2">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Add Predecessor Link:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <select
                        className="input text-xs h-9 sm:col-span-2 rounded-lg font-medium"
                        value={newPredForm.predecessorId}
                        onChange={(e) => setNewPredForm({ ...newPredForm, predecessorId: e.target.value })}
                      >
                        <option value="">— Select Predecessor Task —</option>
                        {existingProjectTasks
                          .filter((t) => String(t.id) !== String(id))
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.wbs_code ? `[${t.wbs_code}] ` : ""}{t.task_title || t.title}
                            </option>
                          ))}
                      </select>
                      <select
                        className="input text-xs h-9 rounded-lg font-medium"
                        value={newPredForm.dependencyType}
                        onChange={(e) => setNewPredForm({ ...newPredForm, dependencyType: e.target.value })}
                      >
                        <option value="FS">Finish-to-Start (FS)</option>
                        <option value="SS">Start-to-Start (SS)</option>
                        <option value="FF">Finish-to-Finish (FF)</option>
                        <option value="SF">Start-to-Finish (SF)</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Lag days (e.g. 2)"
                        className="input text-xs h-9 rounded-lg font-mono"
                        value={newPredForm.lagDays}
                        onChange={(e) => setNewPredForm({ ...newPredForm, lagDays: Number(e.target.value) })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Dependency note or rationale..."
                        className="input text-xs h-9 flex-1 rounded-lg"
                        value={newPredForm.notes}
                        onChange={(e) => setNewPredForm({ ...newPredForm, notes: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={handleAddPredecessor}
                        className="btn btn-secondary text-xs h-9 px-3 rounded-lg font-semibold shrink-0"
                      >
                        <Plus size={13} /> Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Successors List (Read-only) */}
                {successors.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Successor Tasks (Tasks waiting on this task)
                    </div>
                    <div className="space-y-1">
                      {successors.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs"
                        >
                          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                            <span className="text-blue-500 font-bold">→</span>
                            <span className="font-semibold">{s.successor_title || `Task #${s.task_id}`}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-bold">
                              ({s.dependency_type || "FS"})
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            String(s.successor_status || "").toUpperCase() === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {s.successor_status || "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>

      {showAttach && id && (
        <DocumentAttachmentsModal
          docType="task"
          docId={id}
          onClose={() => setShowAttach(false)}
        />
      )}
    </div>
  );
}
