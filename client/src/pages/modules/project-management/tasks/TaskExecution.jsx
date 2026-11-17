/**
 * @fileoverview TaskExecution component.
 * Provides modern and attractive Task Execution page with description checklist/deliverables, interactive checkboxes,
 * automatic completion % calculation, dynamic Reason for Delay input fields,
 * mandatory Reason for Delay validation for overdue/due tasks, visual Car Odometer completion gauge,
 * status filter tab selection, manual task selection prompt, mobile-responsive layout, and Exceptional Permission task reassignment.
 */

import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";
import { useAuth } from "@/auth/AuthContext.jsx";
import { usePermission } from "@/auth/PermissionContext.jsx";
import DocumentAttachmentsModal from "@/components/attachments/DocumentAttachmentsModal.jsx";
import { 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  Save, 
  Clock, 
  User, 
  Calendar, 
  AlertTriangle,
  Loader2,
  ListTodo,
  Paperclip,
  Lock,
  UserCheck,
  X,
  ChevronRight,
  MousePointerClick,
  ArrowLeft,
  MessageSquare,
  ChevronDown,
  Brain,
  Search,
  Layers,
  FolderGit2
} from "lucide-react";
import CarOdometerGauge from "@/components/CarOdometerGauge.jsx";
import ProjectModal from "../components/ProjectModal.jsx";

export default function TaskExecution() {
  const { user } = useAuth();
  const { hasExceptional } = usePermission();
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Default filter active on PENDING as requested
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [showAttach, setShowAttach] = useState(false);

  // Reassignment state
  const [usersList, setUsersList] = useState([]);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignUserId, setReassignUserId] = useState("");
  const [reassigning, setReassigning] = useState(false);

  // Exceptional Permission check for task reassignment
  const canReassignTask = Boolean(
    user?.is_super_admin ||
    user?.role === "ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.id === 1 ||
    hasExceptional("TASK.REASSIGN") ||
    hasExceptional("PM.TASK.REASSIGN") ||
    hasExceptional("TASK.REASSIGN_TASK")
  );

  // Load users for reassignment dropdown
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await api.get("/admin/users");
        const u = res?.data?.data?.items || res?.data?.items || res?.data?.users || [];
        setUsersList(u);
      } catch {}
    }
    loadUsers();
  }, []);

  // State for current task execution details
  const [checklistItems, setChecklistItems] = useState([]);
  const [delayReasons, setDelayReasons] = useState([""]);
  const [taskCompletionPercent, setTaskCompletionPercent] = useState(0);
  const [taskNotes, setTaskNotes] = useState(""); // General task notes (optional)
  const [savingNotes, setSavingNotes] = useState(false);
  const [expandedNoteIdx, setExpandedNoteIdx] = useState(null); // Which checklist/deliverables item note is open

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/projects/tasks");
      const items = res.data?.items || [];
      
      const currentUserId = user?.id || user?.sub;
      const currentUsername = String(user?.username || "").toLowerCase();

      // Strict Assignee Filtering: Only tasks assigned to current user (unless admin)
      const assignedTasks = items.filter((t) => {
        const matchId = currentUserId && String(t.assigned_to_id) === String(currentUserId);
        const matchName = currentUsername && String(t.assigned_to_name || "").toLowerCase() === currentUsername;
        return matchId || matchName;
      });

      setTasks(assignedTasks);
    } catch {
      toast.error("Failed to load tasks for execution");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user?.id, user?.username]);

  // Overall task stats for summary pills
  const taskStats = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "PENDING").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const completed = tasks.filter(
      (t) => Number(t.completion_percent || 0) >= 100 || t.status === "COMPLETED"
    ).length;
    const blocked = tasks.filter((t) => t.status === "BLOCKED").length;
    return { total, pending, inProgress, completed, blocked };
  }, [tasks]);

  // Compute filtered tasks list based on search and status filter (e.g. IN_PROGRESS, PENDING)
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        (t.task_title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.project_name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  // Clear selectedTaskId when user changes status filter so user can explicitly pick a task from the list
  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setSelectedTaskId(null);
  };

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  // Check if Reason for Delay Log is required (Overdue or Due tasks)
  const isDelayReasonRequired = useMemo(() => {
    if (!selectedTask) return false;
    const dueStatus = String(selectedTask.due_status || "").toUpperCase();
    const dueLabel = String(selectedTask.due_label || "").toUpperCase();
    const status = String(selectedTask.status || "").toUpperCase();

    if (
      dueStatus.includes("OVERDUE") ||
      dueStatus.includes("DUE_TODAY") ||
      dueLabel.includes("OVERDUE") ||
      dueLabel.includes("DUE TODAY") ||
      dueLabel.includes("DUE") ||
      status.includes("OVERDUE")
    ) {
      return true;
    }

    if (selectedTask.end_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(selectedTask.end_date.split("T")[0]);
      if (dueDate <= today) {
        return true;
      }
    }

    return false;
  }, [selectedTask]);

  // Initialize Scope Checklist/Deliverables Items & delay reasons SPECIFICALLY for the selectedTask
  useEffect(() => {
    if (!selectedTask) {
      setChecklistItems([]);
      setDelayReasons([""]);
      setTaskCompletionPercent(0);
      return;
    }

    // Parse task_description into checklist/deliverables objects [{ id, text, completed }] for the selected task
    let parsedChecklist = [];
    if (selectedTask.task_description) {
      try {
        const raw = String(selectedTask.task_description).trim();
        if (raw.startsWith("[") && raw.endsWith("]")) {
          const jsonArr = JSON.parse(raw);
          if (Array.isArray(jsonArr)) {
            parsedChecklist = jsonArr.map((item, idx) => {
              if (typeof item === "object" && item !== null) {
                return {
                  id: item.id || idx + 1,
                  text: item.text || item.label || "",
                  completed: Boolean(item.completed),
                  note: item.note || "",
                };
              }
              return { id: idx + 1, text: String(item), completed: false };
            });
          }
        } else if (raw) {
          parsedChecklist = raw
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s, idx) => ({ id: idx + 1, text: s, completed: false, note: "" }));
        }
      } catch {
        parsedChecklist = [{ id: 1, text: selectedTask.task_description, completed: false }];
      }
    }

    setChecklistItems(parsedChecklist);

    // Calculate completion percent based on selected task's checklist/deliverables items
    const completedCount = parsedChecklist.filter((i) => Boolean(i.completed)).length;
    const totalCount = parsedChecklist.length;
    const calcPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const dbPct = Number(selectedTask.completion_percent || 0);
    const finalPct = totalCount > 0 ? calcPct : dbPct;

    setTaskCompletionPercent(finalPct);

    // Parse reason_for_delay into array of string inputs
    let parsedDelays = [""];
    if (selectedTask.reason_for_delay) {
      try {
        const raw = String(selectedTask.reason_for_delay).trim();
        if (raw.startsWith("[") && raw.endsWith("]")) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr) && arr.length > 0) {
            parsedDelays = arr.map(String);
          }
        } else if (raw) {
          parsedDelays = raw.split("\n").map((s) => s.trim()).filter(Boolean);
        }
      } catch {
        parsedDelays = [selectedTask.reason_for_delay];
      }
    }
    if (parsedDelays.length === 0) parsedDelays = [""];
    setDelayReasons(parsedDelays);

    // Parse task notes (general notes field, optional)
    setTaskNotes(selectedTask.notes || selectedTask.task_notes || "");
    setExpandedNoteIdx(null);
  }, [selectedTask]);

  // Toggle item completion in checklist/deliverables for selected task
  const handleToggleChecklist = async (index) => {
    if (!selectedTask) return;

    const updatedChecklist = checklistItems.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    ); // note field is preserved via spread

    setChecklistItems(updatedChecklist);

    // Calculate auto completion percent: true = completed work, false = not completed work
    const completedCount = updatedChecklist.filter((i) => Boolean(i.completed)).length;
    const totalCount = updatedChecklist.length;
    const newPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    setTaskCompletionPercent(newPercent);
    const newStatus = newPercent >= 100 ? "COMPLETED" : newPercent > 0 ? "IN_PROGRESS" : "PENDING";
    const jsonDescription = JSON.stringify(updatedChecklist);

    // Update local task state
    setTasks((prev) =>
      prev.map((t) =>
        t.id === selectedTask.id
          ? {
              ...t,
              completion_percent: newPercent,
              status: newStatus,
              task_description: jsonDescription,
            }
          : t
      )
    );

    // Sync to backend DB
    try {
      await api.put(`/projects/tasks/${selectedTask.id}`, {
        task_description: jsonDescription,
        completion_percent: newPercent,
        status: newStatus,
      });
      toast.success(`Checklist/Deliverables updated (${completedCount}/${totalCount} items completed - ${newPercent}%)`);
    } catch {
      toast.error("Failed to save checklist/deliverables update");
    }
  };

  // Update note for a specific checklist/deliverables item (auto-saves after typing stops via blur)
  const handleNoteChange = (index, value) => {
    const updated = checklistItems.map((item, i) =>
      i === index ? { ...item, note: value } : item
    );
    setChecklistItems(updated);
  };

  const handleSaveChecklistNote = async (index) => {
    if (!selectedTask) return;
    const updated = checklistItems.map((item, i) =>
      i === index ? { ...item } : item
    );
    const jsonDescription = JSON.stringify(updated);
    try {
      await api.put(`/projects/tasks/${selectedTask.id}`, {
        task_description: jsonDescription,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id ? { ...t, task_description: jsonDescription } : t
        )
      );
      toast.success("Checklist/Deliverables note saved");
    } catch {
      toast.error("Failed to save note");
    }
  };

  // Save general task notes
  const handleSaveNotes = async () => {
    if (!selectedTask) return;
    setSavingNotes(true);
    try {
      await api.put(`/projects/tasks/${selectedTask.id}`, {
        notes: taskNotes,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id ? { ...t, notes: taskNotes } : t
        )
      );
      toast.success("Task notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  // Handle Delay Reasons changes
  const handleDelayChange = (index, value) => {
    const updated = [...delayReasons];
    updated[index] = value;
    setDelayReasons(updated);
  };

  const handleAddDelayReason = () => {
    setDelayReasons((prev) => [...prev, ""]);
  };

  const handleRemoveDelayReason = (index) => {
    if (delayReasons.length <= 1) {
      setDelayReasons([""]);
    } else {
      setDelayReasons((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSaveDelays = async () => {
    if (!selectedTask) return;
    const cleanDelays = delayReasons.map((d) => d.trim()).filter(Boolean);

    // Enforce required field validation for overdue or due tasks
    if (isDelayReasonRequired && cleanDelays.length === 0) {
      toast.error("Reason for Delay Log is a required field because this task is overdue or due.");
      return;
    }

    setSaving(true);
    try {
      const jsonDelays = cleanDelays.length > 0 ? JSON.stringify(cleanDelays) : null;

      await api.put(`/projects/tasks/${selectedTask.id}`, {
        reason_for_delay: jsonDelays,
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id ? { ...t, reason_for_delay: jsonDelays } : t
        )
      );
      toast.success("Reason for delay updated successfully");
    } catch {
      toast.error("Failed to save reason for delay");
    } finally {
      setSaving(false);
    }
  };

  // Handle Task Reassignment with Exceptional Permission Check
  const handleReassignTask = async (e) => {
    e?.preventDefault?.();
    if (!canReassignTask) {
      toast.error("Exceptional Permission (TASK.REASSIGN) is required to reassign tasks.");
      return;
    }
    if (!selectedTask || !reassignUserId) {
      toast.error("Please select a target user for task reassignment.");
      return;
    }

    const selectedUser = usersList.find((u) => String(u.id) === String(reassignUserId));
    const newAssignedName = selectedUser?.username || selectedUser?.full_name || selectedUser?.name || `User #${reassignUserId}`;

    setReassigning(true);
    try {
      await api.put(`/projects/tasks/${selectedTask.id}`, {
        assigned_to_id: reassignUserId,
        assigned_to_name: newAssignedName,
      });

      toast.success(`Task successfully reassigned to ${newAssignedName}`);
      setShowReassignModal(false);
      setReassignUserId("");
      fetchTasks();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to reassign task");
    } finally {
      setReassigning(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 max-w-7xl mx-auto px-2 sm:px-4 pb-12">
      {/* 1. Header Card with concise overview KPIs */}
      <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Link
              to="/project-management"
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm shrink-0"
              title="Back to Project Management"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-brand-950/40 dark:to-indigo-950/30 text-brand-900 dark:text-brand-300 border border-brand-200/50 dark:border-brand-800/50 shadow-sm shrink-0">
              <ListTodo size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Task Execution
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Workspace
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                Interactive Project Work Plan/WBS execution, checklist/deliverables tracking & gauge progress monitoring
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
            <Link
              to={`/project-management/calendar?assignedTo=${user?.id || ""}&mode=MY_CALENDAR`}
              className="btn btn-secondary inline-flex items-center gap-2 text-xs sm:text-sm shadow-sm font-semibold text-brand-900 dark:text-brand-300 border-brand-200 dark:border-brand-800"
              title="View your tasks on the interactive Task Calendar"
            >
              <Calendar size={16} className="text-brand-600 dark:text-brand-400" />
              <span>View Task Calendar</span>
            </Link>
            <Link
              to={
                selectedTask
                  ? `/project-management/mindmap?taskId=${selectedTask.id}&projectId=${selectedTask.project_id || ""}`
                  : "/project-management/mindmap"
              }
              className="btn btn-secondary inline-flex items-center gap-2 text-xs sm:text-sm shadow-sm"
              title="Collate thoughts and map execution strategy before working"
            >
              <Brain size={16} className="text-purple-600 dark:text-purple-400" />
              <span>Execution Mindmap</span>
            </Link>
            <Link
              to="/project-management/tasks"
              className="btn btn-primary inline-flex items-center gap-2 text-xs sm:text-sm shadow-sm font-semibold"
            >
              <Layers size={16} />
              <span>Task Management</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Grid: Task Sidebar & Execution Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Task List / Sidebar */}
        <div className="lg:col-span-4 space-y-3.5">
          <div className="card p-3.5 sm:p-4 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Tasks Assigned to You ({filteredTasks.length})
              </span>
              <div className="flex items-center gap-2">
                {statusFilter !== "ALL" && (
                  <span className="text-[11px] font-bold text-brand-700 dark:text-brand-300 uppercase bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-md border border-brand-200/60 dark:border-brand-800/50">
                    {statusFilter.replace("_", " ")}
                  </span>
                )}
                <Link
                  to={`/project-management/calendar?assignedTo=${user?.id || ""}&mode=MY_CALENDAR`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300 hover:underline"
                  title="View your tasks in the Task Calendar"
                >
                  <Calendar size={13} />
                  <span>Calendar</span>
                </Link>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search task title or project..."
                className="input w-full pl-9 pr-8 text-xs h-9 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 focus:bg-white dark:focus:bg-slate-900 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Status Filter Tabs (Clean styled segmented pill strip, no horizontal scrollbar) */}
            <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl">
              {[
                { id: "PENDING", label: "Pending", count: taskStats.pending },
                { id: "IN_PROGRESS", label: "In Prog", count: taskStats.inProgress },
                { id: "COMPLETED", label: "Done", count: taskStats.completed },
                { id: "BLOCKED", label: "Blocked", count: taskStats.blocked },
                { id: "ALL", label: "All", count: taskStats.total },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleStatusFilterChange(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      statusFilter === tab.id
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        : "bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Task Cards List */}
          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {loading ? (
              <div className="card p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <Loader2 size={18} className="animate-spin mx-auto mb-2 text-brand" />
                Loading your assigned tasks...
              </div>
            ) : filteredTasks.length > 0 ? (
              filteredTasks.map((t) => {
                const isSel = t.id === selectedTaskId;
                const pct = Number(t.completion_percent || 0);
                const isComplete = pct >= 100;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTaskId(t.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSel
                        ? "bg-brand-50/40 dark:bg-brand-950/20 border-brand-500 shadow-sm ring-1 ring-brand-500/30"
                        : "bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
                    }`}
                  >
                    {isSel && (
                      <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-600 rounded-r" />
                    )}

                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {t.task_title}
                      </h3>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                          isComplete
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : pct > 0
                              ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
                              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-2">
                      {t.project_name || "—"}
                    </p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2.5">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isComplete ? "bg-emerald-500" : pct > 0 ? "bg-sky-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.max(pct, 0)}%` }}
                      />
                    </div>

                    {/* Tags row */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      {t.wbs_code && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-900 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60 truncate max-w-[170px]">
                          Work Plan/WBS: {t.wbs_code}
                        </span>
                      )}
                      {t.scope_name && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 truncate max-w-[130px]">
                          {t.scope_name}
                        </span>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-300">
                          {String(t.assigned_to_name || "U")[0].toUpperCase()}
                        </span>
                        <span className="truncate max-w-[110px]">{t.assigned_to_name || "Unassigned"}</span>
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase border ${
                          String(t.priority || "").toUpperCase() === "HIGH" || String(t.priority || "").toUpperCase() === "URGENT"
                            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                            : String(t.priority || "").toUpperCase() === "MEDIUM"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                              : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {t.priority || "Normal"}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="card p-8 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                No {statusFilter.toLowerCase().replace("_", " ")} tasks found.
              </div>
            )}
          </div>
        </div>

        {/* Selected Task Details & Interactive Execution Panel */}
        <div className="lg:col-span-8 space-y-4">
          {selectedTask ? (
            <>
              {/* Top Banner: Task Summary & Odometer Gauge */}
              <div className="card p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between gap-5">
                  <div className="space-y-3 flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200/50 dark:border-brand-800/50 inline-flex items-center gap-1">
                        <FolderGit2 size={12} />
                        {selectedTask.project_name || "Project Task"}
                      </span>
                      {selectedTask.scope_name && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                          Scope: {selectedTask.scope_name}
                        </span>
                      )}
                      {selectedTask.wbs_code && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-brand-50 text-brand-800 dark:bg-brand-900/50 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                          Work Plan/WBS: {selectedTask.wbs_code}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">• Priority: {selectedTask.priority}</span>
                      {isDelayReasonRequired && (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                          Overdue / Due
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {selectedTask.task_title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <User size={14} className="text-slate-400" /> Assignee:{" "}
                        <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                          {selectedTask.assigned_to_name || "Unassigned"}
                        </strong>
                        {canReassignTask && (
                          <button
                            type="button"
                            onClick={() => setShowReassignModal(true)}
                            className="px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 border border-brand/30 bg-brand/10 text-brand hover:bg-brand hover:text-white transition-all ml-1"
                            title="Reassign task to another user"
                          >
                            <UserCheck size={12} />
                            Reassign
                          </button>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" /> Start:{" "}
                        {selectedTask.start_date
                          ? new Date(selectedTask.start_date.split("T")[0]).toLocaleDateString()
                          : "—"}
                      </span>
                      <span className={`flex items-center gap-1.5 ${isDelayReasonRequired ? "font-bold text-rose-600 dark:text-rose-400" : ""}`}>
                        <Clock size={14} className={isDelayReasonRequired ? "text-rose-500" : "text-slate-400"} /> Due:{" "}
                        {selectedTask.end_date
                          ? new Date(selectedTask.end_date.split("T")[0]).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAttach(true)}
                        className="btn btn-secondary text-xs inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Paperclip size={13} /> Add Attachment
                      </button>
                      <Link
                        to={`/project-management/mindmap?taskId=${selectedTask.id}&projectId=${selectedTask.project_id || ""}`}
                        className="btn bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-xs inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Brain size={13} /> Open Mindmap
                      </Link>
                      <Link
                        to={`/project-management/calendar?assignedTo=${user?.id || ""}&mode=MY_CALENDAR&projectId=${selectedTask.project_id || ""}`}
                        className="btn bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/30 text-xs inline-flex items-center gap-1.5 shadow-sm"
                        title="View this task and your schedule on the Task Calendar"
                      >
                        <Calendar size={13} className="text-brand-600 dark:text-brand-400" />
                        <span>View in Calendar</span>
                      </Link>
                    </div>
                  </div>

                  {/* Visual Car Odometer Gauge with framed container */}
                  <div className="shrink-0 bg-gradient-to-b from-slate-900 to-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col items-center w-full md:w-auto">
                    <CarOdometerGauge
                      value={taskCompletionPercent}
                      label="Task Completion Gauge"
                      size="md"
                    />
                  </div>
                </div>
              </div>

              {/* Task-Specific Scope Checklist/Deliverables Items */}
              <div className="card p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Scope Checklist/Deliverables Items
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Checklist/Deliverables items for: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedTask.task_title}</span>
                    </p>
                  </div>
                  <div className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 self-start sm:self-auto">
                    {checklistItems.filter((i) => i.completed).length} / {checklistItems.length} Done ({taskCompletionPercent}%)
                  </div>
                </div>

                <div className="space-y-2">
                  {checklistItems.length > 0 ? (
                    checklistItems.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        onClick={() => handleToggleChecklist(idx)}
                        className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
                          item.completed
                            ? "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/60"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 pr-2">
                          <button
                            type="button"
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                              item.completed
                                ? "bg-emerald-500 text-white shadow-xs"
                                : "border-2 border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-500"
                            }`}
                          >
                            ✓
                          </button>
                          <span
                            className={`text-xs sm:text-sm font-medium transition-all ${
                              item.completed
                                ? "line-through text-slate-400 dark:text-slate-500"
                                : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {item.text}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full uppercase shrink-0 border ${
                            item.completed
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                          }`}
                        >
                          {item.completed ? "COMPLETED" : "PENDING"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-xs italic">
                      No scope checklist/deliverables items specified for this task.
                    </div>
                  )}
                </div>
              </div>

              {/* Task Notes (Optional) */}
              <div className="card p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-sky-500" /> Task Notes
                      <span className="text-xs font-normal text-slate-400">(Optional)</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      General observations, instructions or progress notes for this task. Visible in Milestone &amp; Task views.
                    </p>
                  </div>
                </div>
                <textarea
                  rows={3}
                  className="input w-full text-xs sm:text-sm resize-none rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="Add any general notes, observations or progress updates for this task (optional)..."
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="btn btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5 shadow-sm"
                  >
                    {savingNotes ? (
                      <><Loader2 size={13} className="animate-spin" /> Saving...</>
                    ) : (
                      <><Save size={13} /> Save Notes</>
                    )}
                  </button>
                </div>
              </div>

              {/* Dynamic Reason for Delay Input Fields */}
              <div className={`card p-5 sm:p-6 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm space-y-4 ${
                isDelayReasonRequired
                  ? "border-rose-300 dark:border-rose-800 ring-1 ring-rose-200 dark:ring-rose-950/40"
                  : "border-slate-200 dark:border-slate-800"
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                      <AlertTriangle className={`w-5 h-5 ${isDelayReasonRequired ? "text-rose-500" : "text-amber-500"}`} />
                      Reason for Delay Log
                      {isDelayReasonRequired && (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                          * Required (Task Overdue/Due)
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isDelayReasonRequired
                        ? "This task is overdue or due today. You MUST enter at least one reason for delay."
                        : "Record any reasons for delays. You can add multiple fields if needed."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDelayReason}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 self-start sm:self-auto"
                  >
                    <Plus size={14} /> Add Reason Field
                  </button>
                </div>

                <div className="space-y-2.5">
                  {delayReasons.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-5 text-right shrink-0">{idx + 1}.</span>
                      <input
                        type="text"
                        className={`input w-full text-xs sm:text-sm rounded-xl ${
                          isDelayReasonRequired && !reason.trim()
                            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200"
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                        placeholder={
                          isDelayReasonRequired
                            ? `Reason for delay ${idx + 1} (Required)...`
                            : `Reason for delay ${idx + 1}...`
                        }
                        value={reason}
                        onChange={(e) => handleDelayChange(idx, e.target.value)}
                        required={isDelayReasonRequired && idx === 0}
                      />
                      {delayReasons.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDelayReason(idx)}
                          className="p-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors shrink-0"
                          title="Remove field"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveDelays}
                    disabled={saving}
                    className="btn btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5 w-full sm:w-auto justify-center shadow-sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Save Delay Log
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="card p-8 sm:p-14 text-center space-y-4 bg-gradient-to-b from-slate-50/60 via-white to-slate-50/40 dark:from-slate-900/60 dark:via-slate-900 dark:to-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-200/60 dark:border-brand-800/60 flex items-center justify-center mx-auto shadow-sm ring-8 ring-brand-50/50 dark:ring-brand-900/10">
                <ListTodo className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                  Select a Task to View Execution Details
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {filteredTasks.length > 0
                    ? `There are ${filteredTasks.length} ${statusFilter.toLowerCase().replace("_", " ")} task(s) available. Click any task from the left list to view its execution gauge and manage checklist/deliverables items.`
                    : `No ${statusFilter.toLowerCase().replace("_", " ")} tasks assigned to your user account.`}
                </p>
              </div>

              {filteredTasks.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTaskId(filteredTasks[0].id)}
                    className="btn btn-primary inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 shadow-sm rounded-xl hover:scale-[1.02] transition-transform"
                  >
                    <MousePointerClick size={14} />
                    <span>Select &ldquo;{filteredTasks[0].task_title}&rdquo;</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reassign Task Modal (Exceptional Permission Gated) */}
      <ProjectModal
        open={showReassignModal && Boolean(selectedTask)}
        onClose={() => setShowReassignModal(false)}
        title="Reassign Task"
        subtitle="Update task assignment to another team member"
        icon={UserCheck}
        onSubmit={handleReassignTask}
        submitLabel={reassigning ? "Reassigning..." : "Confirm Reassignment"}
        submitting={reassigning}
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-2 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Task Title:</span>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                {selectedTask?.task_title}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Current Assignee:</span>
              <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                {selectedTask?.assigned_to_name || "Unassigned"}
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Select New Assignee <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={reassignUserId}
              onChange={(e) => setReassignUserId(e.target.value)}
              required
            >
              <option value="">Select Assignee User...</option>
              {usersList.map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.username || u.full_name || u.name || `User #${u.id}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ProjectModal>

      {/* Attachments Modal */}
      {showAttach && selectedTask && (
        <DocumentAttachmentsModal
          docType="task"
          docId={selectedTask.id}
          onClose={() => setShowAttach(false)}
        />
      )}
    </div>
  );
}
