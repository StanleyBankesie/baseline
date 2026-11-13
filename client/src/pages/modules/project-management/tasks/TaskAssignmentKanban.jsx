import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Users,
  CheckCircle2,
  Clock,
  ListTodo,
  Plus,
  Search,
  Filter,
  UserCheck,
  Calendar,
  AlertCircle,
  MoreVertical,
  ChevronRight,
  Layers,
  X,
  Save,
  Trash2,
  Check,
  User,
  Sliders,
  FolderKanban
} from "lucide-react";

const PRIORITY_THEMES = {
  CRITICAL: "border-l-4 border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/20",
  HIGH: "border-l-4 border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20",
  MEDIUM: "border-l-4 border-l-sky-500 bg-sky-50/30 dark:bg-sky-950/20",
  LOW: "border-l-4 border-l-slate-400 bg-slate-50/30 dark:bg-slate-800/20",
};

export default function TaskAssignmentKanban() {
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get("project_id") || searchParams.get("projectId") || "";

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState("ASSIGNEE"); // "ASSIGNEE" or "STATUS"
  
  // Drag-and-drop state
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Sub-tasks / Scope modal state
  const [activeTaskForScope, setActiveTaskForScope] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState("");
  const [savingScope, setSavingScope] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, projRes, usersRes] = await Promise.all([
        api.get("/projects/tasks"),
        api.get("/projects/projects?active=all").catch(() => api.get("/projects?active=all")),
        api.get("/admin/users").catch(() => ({ data: { items: [] } })),
      ]);

      const taskList = tasksRes.data?.items || [];
      const projList = projRes.data?.items || projRes.data?.projects || projRes.data?.data || (Array.isArray(projRes.data) ? projRes.data : []);
      const userList = usersRes.data?.items || usersRes.data?.users || usersRes.data?.data?.items || (Array.isArray(usersRes.data) ? usersRes.data : []);

      setTasks(taskList);
      setProjects(projList);
      setUsers(userList);
    } catch (err) {
      toast.error("Failed to load task board data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter tasks based on project and search
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (t.is_active === "N" || t.is_active === 0 || t.is_active === "0") return false;
      const matchProj = !selectedProjectId || String(t.project_id) === String(selectedProjectId);
      const query = searchTerm.toLowerCase();
      const matchSearch =
        !query ||
        (t.task_title || "").toLowerCase().includes(query) ||
        (t.project_name || "").toLowerCase().includes(query) ||
        (t.assigned_to_name || "").toLowerCase().includes(query);
      return matchProj && matchSearch;
    });
  }, [tasks, selectedProjectId, searchTerm]);

  // Compute KPI metrics
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const assigned = filteredTasks.filter((t) => t.assigned_to_id).length;
    const unassigned = total - assigned;
    
    // Total subtasks across filtered tasks
    let totalSubtasks = 0;
    let assignedSubtasks = 0;
    filteredTasks.forEach((t) => {
      if (t.task_description) {
        try {
          const raw = String(t.task_description).trim();
          if (raw.startsWith("[") && raw.endsWith("]")) {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              totalSubtasks += arr.length;
              assignedSubtasks += arr.filter((s) => s.assigned_to_id || s.assigned_to_name).length;
            }
          }
        } catch {}
      }
    });

    return { total, assigned, unassigned, totalSubtasks, assignedSubtasks };
  }, [filteredTasks]);

  // Drag Handlers
  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", String(taskId));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colKey) {
      setDragOverColumn(colKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, targetColKey) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = draggedTaskId || Number(e.dataTransfer.getData("text/plain"));
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (groupBy === "ASSIGNEE") {
      let newAssigneeId = null;
      let newAssigneeName = null;

      if (targetColKey !== "UNASSIGNED") {
        const targetUser = users.find((u) => String(u.id) === String(targetColKey));
        if (targetUser) {
          newAssigneeId = targetUser.id;
          newAssigneeName = targetUser.username || targetUser.full_name || targetUser.name || `User #${targetUser.id}`;
        }
      }

      // Check if unchanged
      if (String(task.assigned_to_id || "") === String(newAssigneeId || "")) return;

      // Optimistic Update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, assigned_to_id: newAssigneeId, assigned_to_name: newAssigneeName }
            : t
        )
      );

      try {
        await api.put(`/projects/tasks/${taskId}`, {
          assigned_to_id: newAssigneeId,
          assigned_to_name: newAssigneeName,
        });
        toast.success(
          newAssigneeName
            ? `Assigned "${task.task_title}" to ${newAssigneeName}`
            : `Unassigned "${task.task_title}"`
        );
      } catch (err) {
        toast.error("Failed to reassign task");
        fetchData();
      }
    } else {
      // Group by STATUS
      const newStatus = targetColKey;
      if (task.status === newStatus) return;

      const newPercent = newStatus === "COMPLETED" ? 100 : newStatus === "IN_PROGRESS" && Number(task.completion_percent || 0) === 0 ? 25 : task.completion_percent;

      // Optimistic Update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus, completion_percent: newPercent }
            : t
        )
      );

      try {
        await api.put(`/projects/tasks/${taskId}`, {
          status: newStatus,
          completion_percent: newPercent,
        });
        toast.success(`Moved "${task.task_title}" to ${newStatus.replace("_", " ")}`);
      } catch (err) {
        toast.error("Failed to update status");
        fetchData();
      }
    }

    setDraggedTaskId(null);
  };

  // Quick Direct Assign from dropdown
  const handleDirectAssign = async (taskId, userId) => {
    const targetUser = users.find((u) => String(u.id) === String(userId));
    const newAssigneeId = targetUser ? targetUser.id : null;
    const newAssigneeName = targetUser ? (targetUser.username || targetUser.full_name || targetUser.name || `User #${targetUser.id}`) : null;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, assigned_to_id: newAssigneeId, assigned_to_name: newAssigneeName }
          : t
      )
    );

    try {
      await api.put(`/projects/tasks/${taskId}`, {
        assigned_to_id: newAssigneeId,
        assigned_to_name: newAssigneeName,
      });
      toast.success(
        newAssigneeName ? `Assigned to ${newAssigneeName}` : "Unassigned"
      );
    } catch {
      toast.error("Failed to update assignment");
      fetchData();
    }
  };

  // Open Sub-tasks / Scope Modal
  const openScopeModal = (task) => {
    setActiveTaskForScope(task);
    let parsed = [];
    if (task.task_description) {
      try {
        const raw = String(task.task_description).trim();
        if (raw.startsWith("[") && raw.endsWith("]")) {
          parsed = JSON.parse(raw);
        } else if (raw) {
          parsed = raw.split("\n").filter(Boolean).map((text, i) => ({
            id: i + 1,
            text,
            completed: false,
            assigned_to_id: null,
            assigned_to_name: null,
          }));
        }
      } catch {
        parsed = [{ id: 1, text: task.task_description, completed: false, assigned_to_id: null, assigned_to_name: null }];
      }
    }
    setSubtasks(parsed);
    setNewSubtaskTitle("");
    setNewSubtaskAssigneeId("");
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const assignedUser = users.find((u) => String(u.id) === String(newSubtaskAssigneeId));
    const newItem = {
      id: Date.now(),
      text: newSubtaskTitle.trim(),
      completed: false,
      assigned_to_id: assignedUser ? assignedUser.id : null,
      assigned_to_name: assignedUser ? (assignedUser.username || assignedUser.full_name || assignedUser.name) : null,
    };
    setSubtasks((prev) => [...prev, newItem]);
    setNewSubtaskTitle("");
    setNewSubtaskAssigneeId("");
  };

  const handleToggleSubtask = (id) => {
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const handleSubtaskAssigneeChange = (id, userId) => {
    const assignedUser = users.find((u) => String(u.id) === String(userId));
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              assigned_to_id: assignedUser ? assignedUser.id : null,
              assigned_to_name: assignedUser ? (assignedUser.username || assignedUser.full_name || assignedUser.name) : null,
            }
          : s
      )
    );
  };

  const handleRemoveSubtask = (id) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSaveScope = async () => {
    if (!activeTaskForScope) return;
    setSavingScope(true);
    try {
      const jsonStr = JSON.stringify(subtasks);
      const completedCount = subtasks.filter((s) => s.completed).length;
      const totalCount = subtasks.length;
      const calcPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : activeTaskForScope.completion_percent;
      const newStatus = calcPct >= 100 ? "COMPLETED" : calcPct > 0 ? "IN_PROGRESS" : activeTaskForScope.status;

      await api.put(`/projects/tasks/${activeTaskForScope.id}`, {
        task_description: jsonStr,
        completion_percent: calcPct,
        status: newStatus,
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeTaskForScope.id
            ? { ...t, task_description: jsonStr, completion_percent: calcPct, status: newStatus }
            : t
        )
      );

      toast.success("Scope & Sub-tasks updated successfully");
      setActiveTaskForScope(null);
    } catch {
      toast.error("Failed to save sub-tasks");
    } finally {
      setSavingScope(false);
    }
  };

  // Group columns for Assignee view
  const assigneeColumns = useMemo(() => {
    const cols = [];
    
    // Column 1: Unassigned
    const unassignedTasks = filteredTasks.filter((t) => !t.assigned_to_id);
    cols.push({
      key: "UNASSIGNED",
      title: "Unassigned Tasks",
      subtitle: "Milestone tasks awaiting team allocation",
      icon: <Users className="w-4 h-4 text-amber-500" />,
      tasks: unassignedTasks,
      headerBg: "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-900/50",
    });

    // Columns for each user with tasks or in project team
    users.forEach((u) => {
      const userTasks = filteredTasks.filter((t) => String(t.assigned_to_id) === String(u.id));
      const userName = u.username || u.full_name || u.name || `User #${u.id}`;
      cols.push({
        key: String(u.id),
        title: userName,
        subtitle: u.role ? `${u.role} · Member` : "Team Member",
        icon: <User className="w-4 h-4 text-brand-600 dark:text-brand-400" />,
        tasks: userTasks,
        headerBg: "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700",
      });
    });

    return cols;
  }, [filteredTasks, users]);

  // Group columns for Status view
  const statusColumns = useMemo(() => {
    return [
      {
        key: "PENDING",
        title: "To Do / Pending",
        icon: <Clock className="w-4 h-4 text-amber-500" />,
        tasks: filteredTasks.filter((t) => t.status === "PENDING" || !t.status),
        headerBg: "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-900/50",
      },
      {
        key: "IN_PROGRESS",
        title: "In Progress",
        icon: <Sliders className="w-4 h-4 text-sky-500" />,
        tasks: filteredTasks.filter((t) => t.status === "IN_PROGRESS"),
        headerBg: "bg-sky-50 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200 border-sky-200 dark:border-sky-900/50",
      },
      {
        key: "BLOCKED",
        title: "Under Review / Blocked",
        icon: <AlertCircle className="w-4 h-4 text-rose-500" />,
        tasks: filteredTasks.filter((t) => t.status === "BLOCKED"),
        headerBg: "bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-900/50",
      },
      {
        key: "COMPLETED",
        title: "Completed",
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
        tasks: filteredTasks.filter((t) => t.status === "COMPLETED" || Number(t.completion_percent || 0) >= 100),
        headerBg: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900/50",
      },
    ];
  }, [filteredTasks]);

  const activeColumns = groupBy === "ASSIGNEE" ? assigneeColumns : statusColumns;

  // Helper to extract subtask count for a card
  const getSubtaskSummary = (task) => {
    if (!task.task_description) return null;
    try {
      const raw = String(task.task_description).trim();
      if (raw.startsWith("[") && raw.endsWith("]")) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) {
          const done = arr.filter((s) => s.completed).length;
          return { done, total: arr.length };
        }
      }
    } catch {}
    return null;
  };

  return (
    <div className="space-y-6 p-4">
      {/* Canonical Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5 text-sm">
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <FolderKanban size={26} className="text-brand-900 dark:text-brand-400" />
              Task Assignment & Kanban Board
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Drag-and-drop assignment for milestone tasks, scope breakdown, and user work allocation
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/project-management/tasks"
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold"
          >
            <ListTodo size={15} /> Switch to Table View
          </Link>
          <Link
            to="/project-management/tasks/new"
            className="btn btn-primary inline-flex items-center gap-2 text-sm font-semibold shadow-sm"
          >
            <Plus size={16} /> New Task
          </Link>
        </div>
      </div>

      {/* KPI Cards (Matches Project Portfolio 4-Card Format) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Milestone Tasks",
            val: stats.total,
            icon: <ListTodo size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700",
          },
          {
            label: "Assigned Tasks",
            val: stats.assigned,
            icon: <UserCheck size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600",
          },
          {
            label: "Unassigned Tasks",
            val: stats.unassigned,
            icon: <Users size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500",
          },
          {
            label: "Scope / Sub-tasks",
            val: stats.totalSubtasks,
            icon: <Layers size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500",
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

      {/* Filters & Kanban View Modes */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Project Dropdown */}
          <div className="w-full sm:w-64">
            <select
              className="select w-full text-sm"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code ? `${p.project_code} - ` : ""}{p.project_name || p.name || `Project #${p.id}`}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tasks, project, assignee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-9 w-full text-sm"
            />
          </div>
        </div>

        {/* Group By Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Board Mode:</span>
          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setGroupBy("ASSIGNEE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                groupBy === "ASSIGNEE"
                  ? "bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-300 shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-700/60"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              <Users size={14} /> Group by Team Assignee
            </button>
            <button
              type="button"
              onClick={() => setGroupBy("STATUS")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                groupBy === "STATUS"
                  ? "bg-white dark:bg-slate-900 text-brand-700 dark:text-brand-300 shadow-sm ring-1 ring-slate-200/60 dark:ring-slate-700/60"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              <Sliders size={14} /> Group by Status
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board Container */}
      {loading ? (
        <div className="py-24 text-center text-slate-400">Loading task assignment board...</div>
      ) : activeColumns.length === 0 ? (
        <div className="py-20 text-center text-slate-400">No columns or team members found.</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[600px] select-none">
          {activeColumns.map((col) => {
            const isDropActive = dragOverColumn === col.key;
            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
                className={`flex-shrink-0 w-80 rounded-2xl border transition-all duration-200 flex flex-col bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-sm ${
                  isDropActive
                    ? "ring-2 ring-brand-500 border-brand-500 bg-brand-50/20 shadow-lg scale-[1.01]"
                    : "border-slate-200/80 dark:border-slate-800 shadow-sm"
                }`}
              >
                {/* Column Header */}
                <div className={`p-3.5 rounded-t-2xl border-b flex items-center justify-between ${col.headerBg}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-white/80 dark:bg-slate-800/80 rounded-lg shadow-2xs shrink-0">
                      {col.icon}
                    </div>
                    <div className="truncate">
                      <h3 className="font-bold text-sm tracking-tight truncate">{col.title}</h3>
                      {col.subtitle && <p className="text-[10px] opacity-75 truncate">{col.subtitle}</p>}
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 shadow-2xs text-slate-700 dark:text-slate-300">
                    {col.tasks.length}
                  </span>
                </div>

                {/* Task Cards List */}
                <div className="p-3 space-y-3 flex-1 min-h-[220px] max-h-[75vh] overflow-y-auto">
                  {col.tasks.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                      {isDropActive ? "Release to drop task here" : "Drag tasks here to reassign"}
                    </div>
                  ) : (
                    col.tasks.map((task) => {
                      const subSummary = getSubtaskSummary(task);
                      const priorityTheme = PRIORITY_THEMES[task.priority] || PRIORITY_THEMES.MEDIUM;

                      return (
                        <div
                          key={task.id}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          className={`group bg-white dark:bg-slate-800/90 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all relative ${priorityTheme}`}
                        >
                          {/* Task Header */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
                              {task.project_code || "TASK"}-{task.id}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                task.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : task.status === "IN_PROGRESS"
                                  ? "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {task.status || "PENDING"}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-2 leading-snug">
                            {task.task_title || task.title || "Untitled Task"}
                          </h4>

                          {/* Project Name Badge */}
                          <p className="text-xs text-brand-700 dark:text-brand-400 font-medium truncate mb-2.5">
                            📁 {task.project_name || "General Project"}
                          </p>

                          {/* Sub-tasks Progress Badge */}
                          {subSummary && (
                            <div className="mb-2.5 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700/60">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                <span className="flex items-center gap-1">
                                  <Layers size={12} className="text-brand-500" /> Scope / Sub-tasks
                                </span>
                                <span>{subSummary.done}/{subSummary.total} done</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-brand-500 h-full rounded-full transition-all"
                                  style={{ width: `${Math.round((subSummary.done / subSummary.total) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Assignee & Dates footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                            {/* Assignee indicator */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-[10px]">
                                {task.assigned_to_name ? task.assigned_to_name.charAt(0).toUpperCase() : "?"}
                              </div>
                              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[90px]">
                                {task.assigned_to_name || "Unassigned"}
                              </span>
                            </div>

                            {/* Scope & Details Button */}
                            <button
                              type="button"
                              onClick={() => openScopeModal(task)}
                              className="px-2 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-[11px] font-semibold flex items-center gap-1 text-slate-600 dark:text-slate-200 transition-colors"
                              title="Assign individual sub-tasks / scope items to users"
                            >
                              <Layers size={12} /> Scope
                            </button>
                          </div>

                          {/* Quick Assign Selector */}
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1 text-[11px]">
                            <span className="text-slate-400">Assign:</span>
                            <select
                              value={task.assigned_to_id || ""}
                              onChange={(e) => handleDirectAssign(task.id, e.target.value)}
                              className="text-[11px] py-0.5 px-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 max-w-[140px] truncate"
                            >
                              <option value="">-- Unassigned --</option>
                              {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.username || u.full_name || u.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-tasks / Scope & Per-User Assignment Modal */}
      {activeTaskForScope && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="text-brand-500 w-5 h-5" /> Execution Details & Scope Assignment
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Task: <span className="font-semibold text-slate-700 dark:text-slate-300">{activeTaskForScope.task_title}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTaskForScope(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Sub-tasks List */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                Break this milestone task into granular execution deliverables / scope items and assign each sub-task to specific team members.
              </div>

              {/* Sub-tasks list */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Sub-tasks & Scope Deliverables ({subtasks.length})
                </label>

                {subtasks.length === 0 ? (
                  <p className="text-sm text-slate-400 italic py-4 text-center">
                    No sub-tasks defined yet. Add the first one below!
                  </p>
                ) : (
                  subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                          st.completed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 dark:border-slate-600 hover:border-brand-500"
                        }`}
                      >
                        {st.completed && <Check size={14} className="stroke-[3]" />}
                      </button>

                      <span
                        className={`flex-1 text-sm font-medium ${
                          st.completed ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {st.text}
                      </span>

                      {/* Per-Subtask Assignee Select */}
                      <div className="flex items-center gap-1 shrink-0">
                        <User size={13} className="text-slate-400" />
                        <select
                          value={st.assigned_to_id || ""}
                          onChange={(e) => handleSubtaskAssigneeChange(st.id, e.target.value)}
                          className="select select-sm text-xs py-1 px-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-lg max-w-[150px]"
                        >
                          <option value="">-- Assign User --</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.username || u.full_name || u.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(st.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                        title="Delete subtask"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Sub-task Box */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Add Scope Deliverable / Sub-task
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Enter scope detail or sub-task description..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                    className="input text-sm flex-1"
                  />
                  <select
                    value={newSubtaskAssigneeId}
                    onChange={(e) => setNewSubtaskAssigneeId(e.target.value)}
                    className="select text-sm w-full sm:w-44"
                  >
                    <option value="">Assign to (optional)</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username || u.full_name || u.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-bold shrink-0"
                  >
                    <Plus size={15} /> Add
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTaskForScope(null)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingScope}
                onClick={handleSaveScope}
                className="btn btn-primary text-xs inline-flex items-center gap-1.5 font-bold shadow-sm"
              >
                <Save size={14} /> {savingScope ? "Saving..." : "Save Scope & Assignments"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
