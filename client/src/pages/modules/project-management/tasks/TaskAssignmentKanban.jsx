import MobileMovingCarousel from "@/components/MobileMovingCarousel";



import React, {



  useState,



  useEffect,



  useMemo,



  useCallback,



  useRef,



} from "react";



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



  UserPlus,



  UserMinus,



  Calendar,



  AlertCircle,



  MoreVertical,



  ChevronRight,



  ChevronLeft,



  Layers,



  X,



  Save,



  Trash2,



  Check,



  User,



  Sliders,



  FolderKanban,



} from "lucide-react";



// Unique, bright, high-contrast and readable color palettes for team member columns



const UNASSIGNED_PALETTE = {



  name: "Warm Amber",



  accentBar: "bg-amber-500",



  headerBg:



    "bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border-b border-amber-300 dark:border-amber-700",



  badge:



    "bg-amber-100 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200 border-amber-300 dark:border-amber-700",



  columnBorder: "border-2 border-amber-500 dark:border-amber-400",



  columnBg: "bg-amber-50/20 dark:bg-amber-950/10",



  dropRing: "ring-2 ring-amber-500 border-2 border-amber-500 bg-amber-100/30",



  pillBg:



    "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200",



};



const TEAM_MEMBER_COLOR_PALETTES = [



  {



    name: "Emerald",



    accentBar: "bg-emerald-500",



    headerBg:



      "bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-b border-emerald-300 dark:border-emerald-700",



    badge:



      "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/70 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700",



    columnBorder: "border-2 border-emerald-500 dark:border-emerald-400",



    columnBg: "bg-emerald-50/25 dark:bg-emerald-950/15",



    dropRing:



      "ring-2 ring-emerald-500 border-2 border-emerald-500 bg-emerald-100/30",



    pillBg:



      "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200",



  },



  {



    name: "Sky Blue",



    accentBar: "bg-sky-500",



    headerBg:



      "bg-sky-50/90 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100 border-b border-sky-300 dark:border-sky-700",



    badge:



      "bg-sky-100 text-sky-900 dark:bg-sky-900/70 dark:text-sky-200 border-sky-300 dark:border-sky-700",



    columnBorder: "border-2 border-sky-500 dark:border-sky-400",



    columnBg: "bg-sky-50/25 dark:bg-sky-950/15",



    dropRing: "ring-2 ring-sky-500 border-2 border-sky-500 bg-sky-100/30",



    pillBg:



      "bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/60 dark:text-sky-200",



  },



  {



    name: "Purple",



    accentBar: "bg-purple-500",



    headerBg:



      "bg-purple-50/90 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 border-b border-purple-300 dark:border-purple-700",



    badge:



      "bg-purple-100 text-purple-900 dark:bg-purple-900/70 dark:text-purple-200 border-purple-300 dark:border-purple-700",



    columnBorder: "border-2 border-purple-500 dark:border-purple-400",



    columnBg: "bg-purple-50/25 dark:bg-purple-950/15",



    dropRing:



      "ring-2 ring-purple-500 border-2 border-purple-500 bg-purple-100/30",



    pillBg:



      "bg-purple-50 text-purple-900 border-purple-200 dark:bg-purple-950/60 dark:text-purple-200",



  },



  {



    name: "Coral Rose",



    accentBar: "bg-rose-500",



    headerBg:



      "bg-rose-50/90 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 border-b border-rose-300 dark:border-rose-700",



    badge:



      "bg-rose-100 text-rose-900 dark:bg-rose-900/70 dark:text-rose-200 border-rose-300 dark:border-rose-700",



    columnBorder: "border-2 border-rose-500 dark:border-rose-400",



    columnBg: "bg-rose-50/25 dark:bg-rose-950/15",



    dropRing: "ring-2 ring-rose-500 border-2 border-rose-500 bg-rose-100/30",



    pillBg:



      "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200",



  },



  {



    name: "Indigo",



    accentBar: "bg-indigo-500",



    headerBg:



      "bg-indigo-50/90 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 border-b border-indigo-300 dark:border-indigo-700",



    badge:



      "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/70 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700",



    columnBorder: "border-2 border-indigo-500 dark:border-indigo-400",



    columnBg: "bg-indigo-50/25 dark:bg-indigo-950/15",



    dropRing:



      "ring-2 ring-indigo-500 border-2 border-indigo-500 bg-indigo-100/30",



    pillBg:



      "bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-200",



  },



  {



    name: "Teal",



    accentBar: "bg-teal-500",



    headerBg:



      "bg-teal-50/90 dark:bg-teal-950/40 text-teal-950 dark:text-teal-100 border-b border-teal-300 dark:border-teal-700",



    badge:



      "bg-teal-100 text-teal-900 dark:bg-teal-900/70 dark:text-teal-200 border-teal-300 dark:border-teal-700",



    columnBorder: "border-2 border-teal-500 dark:border-teal-400",



    columnBg: "bg-teal-50/25 dark:bg-teal-950/15",



    dropRing: "ring-2 ring-teal-500 border-2 border-teal-500 bg-teal-100/30",



    pillBg:



      "bg-teal-50 text-teal-900 border-teal-200 dark:bg-teal-950/60 dark:text-teal-200",



  },



  {



    name: "Bright Cyan",



    accentBar: "bg-cyan-500",



    headerBg:



      "bg-cyan-50/90 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-100 border-b border-cyan-300 dark:border-cyan-700",



    badge:



      "bg-cyan-100 text-cyan-900 dark:bg-cyan-900/70 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700",



    columnBorder: "border-2 border-cyan-500 dark:border-cyan-400",



    columnBg: "bg-cyan-50/25 dark:bg-cyan-950/15",



    dropRing: "ring-2 ring-cyan-500 border-2 border-cyan-500 bg-cyan-100/30",



    pillBg:



      "bg-cyan-50 text-cyan-900 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-200",



  },



  {



    name: "Fuchsia",



    accentBar: "bg-fuchsia-500",



    headerBg:



      "bg-fuchsia-50/90 dark:bg-fuchsia-950/40 text-fuchsia-950 dark:text-fuchsia-100 border-b border-fuchsia-300 dark:border-fuchsia-700",



    badge:



      "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/70 dark:text-fuchsia-200 border-fuchsia-300 dark:border-fuchsia-700",



    columnBorder: "border-2 border-fuchsia-500 dark:border-fuchsia-400",



    columnBg: "bg-fuchsia-50/25 dark:bg-fuchsia-950/15",



    dropRing:



      "ring-2 ring-fuchsia-500 border-2 border-fuchsia-500 bg-fuchsia-100/30",



    pillBg:



      "bg-fuchsia-50 text-fuchsia-900 border-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-200",



  },



  {



    name: "Tangerine",



    accentBar: "bg-orange-500",



    headerBg:



      "bg-orange-50/90 dark:bg-orange-950/40 text-orange-950 dark:text-orange-100 border-b border-orange-300 dark:border-orange-700",



    badge:



      "bg-orange-100 text-orange-900 dark:bg-orange-900/70 dark:text-orange-200 border-orange-300 dark:border-orange-700",



    columnBorder: "border-2 border-orange-500 dark:border-orange-400",



    columnBg: "bg-orange-50/25 dark:bg-orange-950/15",



    dropRing:



      "ring-2 ring-orange-500 border-2 border-orange-500 bg-orange-100/30",



    pillBg:



      "bg-orange-50 text-orange-900 border-orange-200 dark:bg-orange-950/60 dark:text-orange-200",



  },



  {



    name: "Lime",



    accentBar: "bg-lime-500",



    headerBg:



      "bg-lime-50/90 dark:bg-lime-950/40 text-lime-950 dark:text-lime-100 border-b border-lime-300 dark:border-lime-700",



    badge:



      "bg-lime-100 text-lime-900 dark:bg-lime-900/70 dark:text-lime-200 border-lime-300 dark:border-lime-700",



    columnBorder: "border-2 border-lime-500 dark:border-lime-400",



    columnBg: "bg-lime-50/25 dark:bg-lime-950/15",



    dropRing: "ring-2 ring-lime-500 border-2 border-lime-500 bg-lime-100/30",



    pillBg:



      "bg-lime-50 text-lime-900 border-lime-200 dark:bg-lime-950/60 dark:text-lime-200",



  },



  {



    name: "Blue",



    accentBar: "bg-blue-600",



    headerBg:



      "bg-blue-50/90 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 border-b border-blue-300 dark:border-blue-700",



    badge:



      "bg-blue-100 text-blue-900 dark:bg-blue-900/70 dark:text-blue-200 border-blue-300 dark:border-blue-700",



    columnBorder: "border-2 border-blue-600 dark:border-blue-500",



    columnBg: "bg-blue-50/25 dark:bg-blue-950/15",



    dropRing: "ring-2 ring-blue-500 border-2 border-blue-500 bg-blue-100/30",



    pillBg:



      "bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/60 dark:text-blue-200",



  },



  {



    name: "Pink",



    accentBar: "bg-pink-500",



    headerBg:



      "bg-pink-50/90 dark:bg-pink-950/40 text-pink-950 dark:text-pink-100 border-b border-pink-300 dark:border-pink-700",



    badge:



      "bg-pink-100 text-pink-900 dark:bg-pink-900/70 dark:text-pink-200 border-pink-300 dark:border-pink-700",



    columnBorder: "border-2 border-pink-500 dark:border-pink-400",



    columnBg: "bg-pink-50/25 dark:bg-pink-950/15",



    dropRing: "ring-2 ring-pink-500 border-2 border-pink-500 bg-pink-100/30",



    pillBg:



      "bg-pink-50 text-pink-900 border-pink-200 dark:bg-pink-950/60 dark:text-pink-200",



  },



];



export default function TaskAssignmentKanban() {



  const [searchParams] = useSearchParams();



  const initialProjectId =



    searchParams.get("project_id") || searchParams.get("projectId") || "";



  const [tasks, setTasks] = useState([]);



  const [projects, setProjects] = useState([]);



  const [users, setUsers] = useState([]);



  const [projectTeamMembers, setProjectTeamMembers] = useState(() => {



    try {



      const raw = localStorage.getItem("projectTaskTeamMembers");



      return raw ? JSON.parse(raw) : {};



    } catch {



      return {};



    }



  });



  const [projectTeamLeads, setProjectTeamLeads] = useState(() => {



    try {



      const raw = localStorage.getItem("projectTaskTeamLeads");



      return raw ? JSON.parse(raw) : {};



    } catch {



      return {};



    }



  });



  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);



  const [selectedWbs, setSelectedWbs] = useState("");



  const [searchTerm, setSearchTerm] = useState("");



  const [loading, setLoading] = useState(true);



  const [groupBy, setGroupBy] = useState("ASSIGNEE"); // "ASSIGNEE" or "STATUS"



  const [memberAddValue, setMemberAddValue] = useState("");



  const [newMemberIsLead, setNewMemberIsLead] = useState(false);



  const [showMembersModal, setShowMembersModal] = useState(false);



  // Drag-and-drop state



  const [draggedTaskId, setDraggedTaskId] = useState(null);



  const [dragOverColumn, setDragOverColumn] = useState(null);



  const [isDragging, setIsDragging] = useState(false);



  const [canScrollLeft, setCanScrollLeft] = useState(false);



  const [canScrollRight, setCanScrollRight] = useState(false);



  const boardScrollContainerRef = useRef(null);



  const scrollSpeedRef = useRef(0);



  const animFrameIdRef = useRef(null);



  // Sub-tasks / Scope modal state



  const [activeTaskForScope, setActiveTaskForScope] = useState(null);



  const [subtasks, setSubtasks] = useState([]);



  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");



  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState("");



  const [savingScope, setSavingScope] = useState(false);



  const [scopeTaskWbs, setScopeTaskWbs] = useState("");



  const [scopeTaskScopeName, setScopeTaskScopeName] = useState("");



  // Fetch data



  const fetchData = useCallback(async () => {



    setLoading(true);



    try {



      const [tasksRes, projRes, usersRes] = await Promise.all([



        api.get("/projects/tasks"),



        api



          .get("/projects/projects?active=all")



          .catch(() => api.get("/projects?active=all")),



        api.get("/admin/users").catch(() => ({ data: { items: [] } })),



      ]);



      const taskList = tasksRes.data?.items || [];



      const projList =



        projRes.data?.items ||



        projRes.data?.projects ||



        projRes.data?.data ||



        (Array.isArray(projRes.data) ? projRes.data : []);



      const userList =



        usersRes.data?.items ||



        usersRes.data?.users ||



        usersRes.data?.data?.items ||



        (Array.isArray(usersRes.data) ? usersRes.data : []);



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



    document.title = "Task Assignment | OmniSuite";



    fetchData();



  }, [fetchData]);



  useEffect(() => {



    try {



      localStorage.setItem(



        "projectTaskTeamMembers",



        JSON.stringify(projectTeamMembers),



      );



    } catch {}



  }, [projectTeamMembers]);



  useEffect(() => {



    try {



      localStorage.setItem(



        "projectTaskTeamLeads",



        JSON.stringify(projectTeamLeads),



      );



    } catch {}



  }, [projectTeamLeads]);



  const isProjectLead = useCallback(



    (userId) => {



      if (!selectedProjectId) return false;



      const leads = projectTeamLeads[selectedProjectId] || [];



      return leads.some((id) => String(id) === String(userId));



    },



    [selectedProjectId, projectTeamLeads],



  );



  // Sync team members and team leads from database when project is selected



  useEffect(() => {



    if (!selectedProjectId) return;



    let isMounted = true;



    api



      .get(`/projects/projects/${selectedProjectId}/team-members`)



      .then((res) => {



        if (!isMounted) return;



        const members = res.data?.team_members;



        const leads = res.data?.team_lead_ids;



        if (Array.isArray(members) && members.length > 0) {



          setProjectTeamMembers((prev) => ({



            ...prev,



            [selectedProjectId]: members.map(String),



          }));



        }



        if (Array.isArray(leads)) {



          setProjectTeamLeads((prev) => ({



            ...prev,



            [selectedProjectId]: leads.map(String),



          }));



        }



      })



      .catch(() => {});



    return () => {



      isMounted = false;



    };



  }, [selectedProjectId]);



  const toggleTeamLead = async (userId) => {



    if (!selectedProjectId) return;



    const uId = String(userId);



    const userObj = users.find((u) => String(u.id) === uId);



    const userName = userObj?.username || userObj?.full_name || "Member";



    const currentlyLead = isProjectLead(userId);



    const nextIsLead = !currentlyLead;



    const currentLeads = new Set(



      (projectTeamLeads[selectedProjectId] || []).map(String),



    );



    if (currentlyLead) {



      currentLeads.delete(uId);



    } else {



      currentLeads.add(uId);



    }



    const updatedLeads = Array.from(currentLeads);



    // Optimistic state update



    setProjectTeamLeads((prev) => ({



      ...prev,



      [selectedProjectId]: updatedLeads,



    }));



    try {



      await api.put(`/projects/projects/${selectedProjectId}/team-lead`, {



        userId: uId,



        is_lead: nextIsLead,



        team_lead_ids: updatedLeads,



      });



      if (currentlyLead) {



        toast.info(`Removed Team Lead role from ${userName}`);



      } else {



        toast.success(`${userName} designated as Team Lead (Saved)`);



      }



    } catch {



      toast.error("Failed to save team lead to database");



      // Rollback on error



      setProjectTeamLeads((prev) => {



        const revertSet = new Set((prev[selectedProjectId] || []).map(String));



        if (currentlyLead) {



          revertSet.add(uId);



        } else {



          revertSet.delete(uId);



        }



        return {



          ...prev,



          [selectedProjectId]: Array.from(revertSet),



        };



      });



    }



  };



  const currentProject = useMemo(() => {



    return projects.find((p) => String(p.id) === String(selectedProjectId));



  }, [projects, selectedProjectId]);



  useEffect(() => {



    if (!selectedProjectId || users.length === 0) return;



    setProjectTeamMembers((prev) => {



      const existingIds = prev[selectedProjectId];



      if (Array.isArray(existingIds) && existingIds.length > 0) return prev;



      // Only default to users who have tasks assigned in this project, or the project manager



      const assignedIds = new Set();



      tasks



        .filter(



          (t) =>



            String(t.project_id) === String(selectedProjectId) &&



            t.assigned_to_id,



        )



        .forEach((t) => assignedIds.add(String(t.assigned_to_id)));



      const proj = projects.find(



        (p) => String(p.id) === String(selectedProjectId),



      );



      if (proj?.project_manager_id) {



        assignedIds.add(String(proj.project_manager_id));



      } else if (proj?.manager_id) {



        assignedIds.add(String(proj.manager_id));



      }



      return {



        ...prev,



        [selectedProjectId]: Array.from(assignedIds),



      };



    });



  }, [selectedProjectId, users, tasks, projects]);



  const selectedProjectMembers = useMemo(() => {



    if (!selectedProjectId) return [];



    const memberIds = new Set(



      (projectTeamMembers[selectedProjectId] || []).map((id) => String(id)),



    );



    return users.filter((user) => memberIds.has(String(user.id)));



  }, [projectTeamMembers, selectedProjectId, users]);



  const availableUsersToAdd = useMemo(() => {



    if (!selectedProjectId) return [];



    const selectedIds = new Set(



      selectedProjectMembers.map((user) => String(user.id)),



    );



    return users.filter((user) => !selectedIds.has(String(user.id)));



  }, [selectedProjectMembers, selectedProjectId, users]);



  const addProjectMember = async () => {



    if (!selectedProjectId || !memberAddValue) return;



    const userObj = users.find((u) => String(u.id) === String(memberAddValue));



    const userName = userObj?.username || userObj?.full_name || "Member";



    const uIdStr = String(memberAddValue);



    const updatedMembers = Array.from(



      new Set([...(projectTeamMembers[selectedProjectId] || []), uIdStr]),



    );



    let updatedLeads = projectTeamLeads[selectedProjectId] || [];



    if (newMemberIsLead) {



      updatedLeads = Array.from(new Set([...updatedLeads, uIdStr]));



    }



    setProjectTeamMembers((prev) => ({



      ...prev,



      [selectedProjectId]: updatedMembers,



    }));



    if (newMemberIsLead) {



      setProjectTeamLeads((prev) => ({



        ...prev,



        [selectedProjectId]: updatedLeads,



      }));



    }



    setMemberAddValue("");



    setNewMemberIsLead(false);



    try {



      await api.put(`/projects/projects/${selectedProjectId}/team-members`, {



        team_members: updatedMembers,



        team_lead_ids: updatedLeads,



      });



      toast.success(



        `${userName} added to project team${newMemberIsLead ? " as Team Lead" : ""} (Saved)`,



      );



    } catch {



      toast.error("Failed to save team member to database");



    }



  };



  const removeProjectMember = async (userId) => {



    if (!selectedProjectId) return;



    const userObj = users.find((u) => String(u.id) === String(userId));



    const userName = userObj?.username || userObj?.full_name || "Member";



    const uIdStr = String(userId);



    const updatedMembers = (projectTeamMembers[selectedProjectId] || []).filter(



      (id) => String(id) !== uIdStr,



    );



    const updatedLeads = (projectTeamLeads[selectedProjectId] || []).filter(



      (id) => String(id) !== uIdStr,



    );



    setProjectTeamMembers((prev) => ({



      ...prev,



      [selectedProjectId]: updatedMembers,



    }));



    setProjectTeamLeads((prev) => ({



      ...prev,



      [selectedProjectId]: updatedLeads,



    }));



    try {



      await api.put(`/projects/projects/${selectedProjectId}/team-members`, {



        team_members: updatedMembers,



        team_lead_ids: updatedLeads,



      });



      toast.info(`${userName} removed from project team (Saved)`);



    } catch {



      toast.error("Failed to update team members in database");



    }



  };



  // Extract unique WBS codes for the selected project



  const availableWbsList = useMemo(() => {



    if (!selectedProjectId) return [];



    const set = new Set();



    tasks.forEach((t) => {



      if (



        String(t.project_id) === String(selectedProjectId) &&



        t.wbs_code &&



        t.wbs_code.trim()



      ) {



        set.add(t.wbs_code.trim());



      }



    });



    return Array.from(set).sort();



  }, [tasks, selectedProjectId]);



  // Filter tasks strictly based on selected project, WBS, and search



  const projectMemberIdSet = useMemo(() => {



    if (!selectedProjectId) return new Set();



    return new Set(



      (projectTeamMembers[selectedProjectId] || []).map((id) => String(id)),



    );



  }, [projectTeamMembers, selectedProjectId]);



  const filteredTasks = useMemo(() => {



    if (!selectedProjectId) return [];



    return tasks.filter((t) => {



      if (t.is_active === "N" || t.is_active === 0 || t.is_active === "0")



        return false;



      const matchProj = String(t.project_id) === String(selectedProjectId);



      const query = searchTerm.toLowerCase();



      const matchSearch =



        !query ||



        (t.task_title || "").toLowerCase().includes(query) ||



        (t.assigned_to_name || "").toLowerCase().includes(query) ||



        (t.wbs_code || "").toLowerCase().includes(query);



      const matchWbs =



        !selectedWbs ||



        (t.wbs_code && t.wbs_code.trim() === selectedWbs.trim());



      return matchProj && matchSearch && matchWbs;



    });



  }, [tasks, selectedProjectId, searchTerm, selectedWbs]);



  // Compute KPI metrics for selected project



  const stats = useMemo(() => {



    if (!selectedProjectId) {



      return {



        total: "--",



        assigned: "--",



        unassigned: "--",



        totalSubtasks: "--",



        assignedSubtasks: "--",



      };



    }



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



              assignedSubtasks += arr.filter(



                (s) => s.assigned_to_id || s.assigned_to_name,



              ).length;



            }



          }



        } catch {}



      }



    });



    return { total, assigned, unassigned, totalSubtasks, assignedSubtasks };



  }, [filteredTasks, selectedProjectId]);



  // Horizontal auto-scroll and manual scroll helpers



  const updateScrollState = useCallback(() => {



    if (!boardScrollContainerRef.current) return;



    const { scrollLeft, scrollWidth, clientWidth } =



      boardScrollContainerRef.current;



    setCanScrollLeft(scrollLeft > 6);



    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);



  }, []);



  const handleScroll = useCallback(() => {



    updateScrollState();



  }, [updateScrollState]);



  const scrollContainer = (offset) => {



    if (!boardScrollContainerRef.current) return;



    boardScrollContainerRef.current.scrollBy({



      left: offset,



      behavior: "smooth",



    });



  };



  const scrollToColumn = (colKey) => {



    if (!boardScrollContainerRef.current) return;



    const colEl = boardScrollContainerRef.current.querySelector(



      `[data-col-key="${colKey}"]`,



    );



    if (colEl) {



      colEl.scrollIntoView({



        behavior: "smooth",



        inline: "center",



        block: "nearest",



      });



    }



  };



  const startAutoScrollLoop = useCallback(() => {



    if (animFrameIdRef.current) return;



    const step = () => {



      if (boardScrollContainerRef.current && scrollSpeedRef.current !== 0) {



        boardScrollContainerRef.current.scrollLeft += scrollSpeedRef.current;



        updateScrollState();



      }



      animFrameIdRef.current = requestAnimationFrame(step);



    };



    animFrameIdRef.current = requestAnimationFrame(step);



  }, [updateScrollState]);



  const stopAutoScrollLoop = useCallback(() => {



    if (animFrameIdRef.current) {



      cancelAnimationFrame(animFrameIdRef.current);



      animFrameIdRef.current = null;



    }



    scrollSpeedRef.current = 0;



  }, []);



  // Global dragover edge-detection to smoothly scroll beyond the screen width



  useEffect(() => {



    if (!isDragging) return;



    const handleWindowDragOver = (e) => {



      e.preventDefault();



      if (!boardScrollContainerRef.current) return;



      const rect = boardScrollContainerRef.current.getBoundingClientRect();



      const x = e.clientX;



      const EDGE_ZONE = 140;



      const MAX_SPEED = 26;



      if (x < rect.left + EDGE_ZONE && x >= rect.left - 50) {



        const dist = rect.left + EDGE_ZONE - x;



        const ratio = Math.min(1, Math.max(0.15, dist / EDGE_ZONE));



        scrollSpeedRef.current = -Math.round(ratio * MAX_SPEED);



      } else if (x > rect.right - EDGE_ZONE && x <= rect.right + 50) {



        const dist = x - (rect.right - EDGE_ZONE);



        const ratio = Math.min(1, Math.max(0.15, dist / EDGE_ZONE));



        scrollSpeedRef.current = Math.round(ratio * MAX_SPEED);



      } else {



        scrollSpeedRef.current = 0;



      }



    };



    const handleWindowDragEnd = () => {



      stopAutoScrollLoop();



      setIsDragging(false);



      setDraggedTaskId(null);



      setDragOverColumn(null);



    };



    window.addEventListener("dragover", handleWindowDragOver);



    window.addEventListener("dragend", handleWindowDragEnd);



    window.addEventListener("drop", handleWindowDragEnd);



    startAutoScrollLoop();



    return () => {



      window.removeEventListener("dragover", handleWindowDragOver);



      window.removeEventListener("dragend", handleWindowDragEnd);



      window.removeEventListener("drop", handleWindowDragEnd);



      stopAutoScrollLoop();



    };



  }, [isDragging, startAutoScrollLoop, stopAutoScrollLoop]);



  // Drag Handlers



  const handleDragStart = (e, taskId) => {



    setDraggedTaskId(taskId);



    setIsDragging(true);



    e.dataTransfer.setData("text/plain", String(taskId));



    e.dataTransfer.effectAllowed = "move";



  };



  const handleDragEnd = () => {



    stopAutoScrollLoop();



    setIsDragging(false);



    setDraggedTaskId(null);



    setDragOverColumn(null);



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



    stopAutoScrollLoop();



    setIsDragging(false);



    setDragOverColumn(null);



    const taskId =



      draggedTaskId || Number(e.dataTransfer.getData("text/plain"));



    if (!taskId) return;



    const task = tasks.find((t) => t.id === taskId);



    if (!task) return;



    if (groupBy === "ASSIGNEE") {



      let newAssigneeId = null;



      let newAssigneeName = null;



      if (targetColKey !== "UNASSIGNED") {



        const targetUser = users.find(



          (u) => String(u.id) === String(targetColKey),



        );



        if (targetUser) {



          newAssigneeId = targetUser.id;



          newAssigneeName =



            targetUser.username ||



            targetUser.full_name ||



            targetUser.name ||



            `User #${targetUser.id}`;



        }



      }



      // Check if unchanged



      if (String(task.assigned_to_id || "") === String(newAssigneeId || ""))



        return;



      // Optimistic Update



      setTasks((prev) =>



        prev.map((t) =>



          t.id === taskId



            ? {



                ...t,



                assigned_to_id: newAssigneeId,



                assigned_to_name: newAssigneeName,



              }



            : t,



        ),



      );



      try {



        await api.put(`/projects/tasks/${taskId}`, {



          assigned_to_id: newAssigneeId,



          assigned_to_name: newAssigneeName,



        });



        toast.success(



          newAssigneeName



            ? `Assigned "${task.task_title}" to ${newAssigneeName}`



            : `Unassigned "${task.task_title}"`,



        );



      } catch (err) {



        toast.error("Failed to reassign task");



        fetchData();



      }



    } else {



      // Group by STATUS



      const newStatus = targetColKey;



      if (task.status === newStatus) return;



      const newPercent =



        newStatus === "COMPLETED"



          ? 100



          : newStatus === "IN_PROGRESS" &&



              Number(task.completion_percent || 0) === 0



            ? 25



            : task.completion_percent;



      // Optimistic Update



      setTasks((prev) =>



        prev.map((t) =>



          t.id === taskId



            ? { ...t, status: newStatus, completion_percent: newPercent }



            : t,



        ),



      );



      try {



        await api.put(`/projects/tasks/${taskId}`, {



          status: newStatus,



          completion_percent: newPercent,



        });



        toast.success(



          `Moved "${task.task_title}" to ${newStatus.replace("_", " ")}`,



        );



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



    const newAssigneeName = targetUser



      ? targetUser.username ||



        targetUser.full_name ||



        targetUser.name ||



        `User #${targetUser.id}`



      : null;



    setTasks((prev) =>



      prev.map((t) =>



        t.id === taskId



          ? {



              ...t,



              assigned_to_id: newAssigneeId,



              assigned_to_name: newAssigneeName,



            }



          : t,



      ),



    );



    try {



      await api.put(`/projects/tasks/${taskId}`, {



        assigned_to_id: newAssigneeId,



        assigned_to_name: newAssigneeName,



      });



      toast.success(



        newAssigneeName ? `Assigned to ${newAssigneeName}` : "Unassigned",



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



          parsed = raw



            .split("\n")



            .filter(Boolean)



            .map((text, i) => ({



              id: i + 1,



              text,



              completed: false,



              assigned_to_id: null,



              assigned_to_name: null,



            }));



        }



      } catch {



        parsed = [



          {



            id: 1,



            text: task.task_description,



            completed: false,



            assigned_to_id: null,



            assigned_to_name: null,



          },



        ];



      }



    }



    setSubtasks(parsed);



    setNewSubtaskTitle("");



    setNewSubtaskAssigneeId("");



    setScopeTaskWbs(task.wbs_code || "");



    setScopeTaskScopeName(task.scope_name || "");



  };



  const handleAddSubtask = () => {



    if (!newSubtaskTitle.trim()) return;



    const assignedUser = users.find(



      (u) => String(u.id) === String(newSubtaskAssigneeId),



    );



    const newItem = {



      id: Date.now(),



      text: newSubtaskTitle.trim(),



      completed: false,



      assigned_to_id: assignedUser ? assignedUser.id : null,



      assigned_to_name: assignedUser



        ? assignedUser.username || assignedUser.full_name || assignedUser.name



        : null,



    };



    setSubtasks((prev) => [...prev, newItem]);



    setNewSubtaskTitle("");



    setNewSubtaskAssigneeId("");



  };



  const handleToggleSubtask = (id) => {



    setSubtasks((prev) =>



      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)),



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



              assigned_to_name: assignedUser



                ? assignedUser.username ||



                  assignedUser.full_name ||



                  assignedUser.name



                : null,



            }



          : s,



      ),



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



      const calcPct =



        totalCount > 0



          ? Math.round((completedCount / totalCount) * 100)



          : activeTaskForScope.completion_percent;



      const newStatus =



        calcPct >= 100



          ? "COMPLETED"



          : calcPct > 0



            ? "IN_PROGRESS"



            : activeTaskForScope.status;



      await api.put(`/projects/tasks/${activeTaskForScope.id}`, {



        task_description: jsonStr,



        completion_percent: calcPct,



        status: newStatus,



        wbs_code: scopeTaskWbs || null,



        scope_name: scopeTaskScopeName || null,



      });



      setTasks((prev) =>



        prev.map((t) =>



          t.id === activeTaskForScope.id



            ? {



                ...t,



                task_description: jsonStr,



                completion_percent: calcPct,



                status: newStatus,



                wbs_code: scopeTaskWbs,



                scope_name: scopeTaskScopeName,



              }



            : t,



        ),



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



    const activeProjectMembers = users.filter((u) =>



      projectMemberIdSet.has(String(u.id)),



    );



    const unassignedTasks = filteredTasks.filter((t) => {



      const taskUserId = t.assigned_to_id ? String(t.assigned_to_id) : "";



      return !taskUserId || !projectMemberIdSet.has(taskUserId);



    });



    // Auto-hide the unassigned task kanban column when it is empty



    if (unassignedTasks.length > 0) {



      cols.push({



        key: "UNASSIGNED",



        title: "Unassigned Tasks",



        icon: <Users className="w-4 h-4" />,



        tasks: unassignedTasks,



        palette: UNASSIGNED_PALETTE,



      });



    }



    activeProjectMembers.forEach((u, idx) => {



      const userTasks = filteredTasks.filter(



        (t) =>



          String(t.assigned_to_id) === String(u.id) &&



          projectMemberIdSet.has(String(t.assigned_to_id)),



      );



      const userName = u.username || u.full_name || u.name || `User #${u.id}`;



      const palette =



        TEAM_MEMBER_COLOR_PALETTES[idx % TEAM_MEMBER_COLOR_PALETTES.length];



      const isLead = isProjectLead(u.id);



      cols.push({



        key: String(u.id),



        title: userName,



        subtitle: isLead



          ? "Team Lead"



          : u.role



            ? `${u.role} · Member`



            : "Team Member",



        icon: <User className="w-4 h-4" />,



        tasks: userTasks,



        palette,



        isLead,



      });



    });



    return cols;



  }, [filteredTasks, users, projectMemberIdSet, isProjectLead]);



  // Group columns for Status view



  const statusColumns = useMemo(() => {



    return [



      {



        key: "PENDING",



        title: "To Do / Pending",



        icon: <Clock className="w-4 h-4" />,



        tasks: filteredTasks.filter((t) => t.status === "PENDING" || !t.status),



        palette: UNASSIGNED_PALETTE,



      },



      {



        key: "IN_PROGRESS",



        title: "In Progress",



        icon: <Sliders className="w-4 h-4" />,



        tasks: filteredTasks.filter((t) => t.status === "IN_PROGRESS"),



        palette: TEAM_MEMBER_COLOR_PALETTES[1],



      },



      {



        key: "BLOCKED",



        title: "Under Review / Blocked",



        icon: <AlertCircle className="w-4 h-4" />,



        tasks: filteredTasks.filter((t) => t.status === "BLOCKED"),



        palette: TEAM_MEMBER_COLOR_PALETTES[3],



      },



      {



        key: "COMPLETED",



        title: "Completed",



        icon: <CheckCircle2 className="w-4 h-4" />,



        tasks: filteredTasks.filter(



          (t) =>



            t.status === "COMPLETED" ||



            Number(t.completion_percent || 0) >= 100,



        ),



        palette: TEAM_MEMBER_COLOR_PALETTES[0],



      },



    ];



  }, [filteredTasks]);



  const activeColumns =



    groupBy === "ASSIGNEE" ? assigneeColumns : statusColumns;



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



          <Link



            to="/project-management"



            className="btn btn-secondary inline-flex items-center gap-1.5 text-sm"



          >



            <ArrowLeft size={16} /> Back



          </Link>



          <div>



            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">



              <FolderKanban



                size={26}



                className="text-brand-900 dark:text-brand-400"



              />



              Task Assignment



            </h1>



            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 hidden">



              Drag-and-drop assignment for milestone tasks, scope breakdown, and



              team work allocation



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



      <MobileMovingCarousel data-page-carousel gridColsClass="md:grid-cols-4" gapClass="gap-4">



        {[



          {



            label: "Total Scope & WBS Tasks",



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



        ].map((stat, i) => {



          const colors = [



            "bg-sky-600 dark:bg-sky-500 text-white",



            "bg-brand-900 dark:bg-brand-700 text-white",



            "bg-amber-500 text-white",



            "bg-emerald-600 text-white",



          ];



          const colorClass = stat.color || colors[i % 4];



          return (



            <div



              key={i}



              className="card p-6 min-h-[160px] flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm"



            >



              <div>



                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">



                  {stat.label}



                </p>



                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">



                  {stat.val}



                </p>



              </div>



              <div className={`p-3 rounded-full ${colorClass} shadow-sm`}>



                {stat.icon}



              </div>



            </div>



          );



        })}



      </MobileMovingCarousel>



      {/* Filters & Kanban View Modes */}



      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">



        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">



          {/* Project Dropdown */}



          <div className="w-full sm:w-72">



            <select



              className="select w-full text-sm font-semibold py-2"



              value={selectedProjectId}



              onChange={(e) => {



                setSelectedProjectId(e.target.value);



                setSelectedWbs("");



              }}



            >



              <option value="">-- Select Project --</option>



              {projects.map((p) => (



                <option key={p.id} value={p.id}>



                  {p.project_code ? `${p.project_code} - ` : ""}



                  {p.project_name || p.name || `Project #${p.id}`}



                </option>



              ))}



            </select>



          </div>



          {/* Optional Work Plan/WBS Filter (only when a project is selected) */}



          {selectedProjectId && availableWbsList.length > 0 && (



            <div className="w-full sm:w-56">



              <select



                className="select w-full text-sm font-medium py-2"



                value={selectedWbs}



                onChange={(e) => setSelectedWbs(e.target.value)}



              >



                <option value="">



                  All Project Work Plans/WBS ({availableWbsList.length})



                </option>



                {availableWbsList.map((w) => (



                  <option key={w} value={w}>



                    Work Plan/WBS: {w}



                  </option>



                ))}



              </select>



            </div>



          )}



          {/* Concise Team Members Management Button */}



          {selectedProjectId && (



            <button



              type="button"



              onClick={() => setShowMembersModal(true)}



              className="btn btn-secondary inline-flex items-center gap-2 text-xs py-2 px-3 font-semibold shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"



              title="Add or remove project team members"



            >



              <Users size={14} className="text-brand-600 dark:text-brand-400" />



              <span>Team Members ({selectedProjectMembers.length})</span>



              <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-1.5 py-0.5 rounded border border-brand-200 dark:border-brand-800">



                + Add / Remove



              </span>



            </button>



          )}



        </div>



        {/* Group By Switcher */}



        {selectedProjectId && (



          <div className="flex items-center gap-2">



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



        )}



      </div>



      {/* Kanban Board Container: ONLY DISPLAY WHEN A PROJECT IS SELECTED */}



      {!selectedProjectId ? (



        <div className="py-20 px-6 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 max-w-xl mx-auto my-8 space-y-4 shadow-xs">



          <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center shadow-inner">



            <FolderKanban size={32} />



          </div>



          <div className="space-y-1">



            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">



              Select Project



            </h3>



          </div>



          {projects.length > 0 && (



            <div className="pt-2 max-w-xs mx-auto">



              <select



                className="select w-full text-sm font-semibold py-2"



                value={selectedProjectId}



                onChange={(e) => {



                  setSelectedProjectId(e.target.value);



                  setSelectedWbs("");



                }}



              >



                <option value="">-- Select Project --</option>



                {projects.map((p) => (



                  <option key={p.id} value={p.id}>



                    {p.project_code ? `${p.project_code} - ` : ""}



                    {p.project_name || p.name || `Project #${p.id}`}



                  </option>



                ))}



              </select>



            </div>



          )}



        </div>



      ) : loading ? (



        <div className="py-24 text-center text-slate-400">



          Loading task assignment board...



        </div>



      ) : activeColumns.length === 0 ? (



        <div className="py-20 text-center text-slate-400">



          No columns or team members found.



        </div>



      ) : (



        <div className="relative group space-y-3">



          {/* Drop-to-Unassign Target when Unassigned Column is Auto-Hidden */}



          {isDragging && Number(stats.unassigned || 0) === 0 && (



            <div



              onDragOver={(e) => handleDragOver(e, "UNASSIGNED")}



              onDragLeave={handleDragLeave}



              onDrop={(e) => handleDrop(e, "UNASSIGNED")}



              className={`py-2.5 px-4 rounded-xl border-2 border-dashed transition-all flex items-center justify-center gap-2 text-xs font-bold ${



                dragOverColumn === "UNASSIGNED"



                  ? "border-amber-500 bg-amber-100/70 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400 shadow-sm scale-[1.005]"



                  : "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300"



              }`}



            >



              <Users size={15} />



              <span>Drop task here to unassign</span>



            </div>



          )}



          {/* Left Edge Auto-Scroll Indicator Zone while Dragging */}



          {isDragging && canScrollLeft && (



            <div



              onDragOver={(e) => {



                e.preventDefault();



                scrollSpeedRef.current = -24;



              }}



              className="absolute left-0 top-12 bottom-6 w-16 z-30 pointer-events-auto bg-gradient-to-r from-brand-600/30 to-transparent flex items-center justify-start pl-2 backdrop-blur-[1px] animate-pulse rounded-l-2xl border-l-4 border-brand-500"



              title="Drag here to scroll left"



            >



              <div className="p-2 bg-brand-600 text-white rounded-full shadow-lg">



                <ChevronLeft size={18} />



              </div>



            </div>



          )}



          {/* Right Edge Auto-Scroll Indicator Zone while Dragging */}



          {isDragging && canScrollRight && (



            <div



              onDragOver={(e) => {



                e.preventDefault();



                scrollSpeedRef.current = 24;



              }}



              className="absolute right-0 top-12 bottom-6 w-16 z-30 pointer-events-auto bg-gradient-to-l from-brand-600/30 to-transparent flex items-center justify-end pr-2 backdrop-blur-[1px] animate-pulse rounded-r-2xl border-r-4 border-brand-500"



              title="Drag here to scroll right"



            >



              <div className="p-2 bg-brand-600 text-white rounded-full shadow-lg">



                <ChevronRight size={18} />



              </div>



            </div>



          )}



          {/* Main Horizontal Scrollable Columns Container */}



          <div



            ref={boardScrollContainerRef}



            onScroll={handleScroll}



            className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[600px] select-none scroll-smooth"



          >



            {activeColumns.map((col) => {



              const pal = col.palette || UNASSIGNED_PALETTE;



              const isDropActive = dragOverColumn === col.key;



              return (



                <div



                  key={col.key}



                  data-col-key={col.key}



                  onDragOver={(e) => handleDragOver(e, col.key)}



                  onDragLeave={handleDragLeave}



                  onDrop={(e) => handleDrop(e, col.key)}



                  className={`flex-shrink-0 w-80 rounded-2xl transition-all duration-200 flex flex-col ${pal.columnBg} backdrop-blur-sm overflow-hidden border-0 ${



                    isDropActive



                      ? `${pal.dropRing} shadow-2xl scale-[1.01]`



                      : `shadow-[0_12px_32px_-4px_rgba(0,0,0,0.12),0_4px_12px_-2px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_40px_-4px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_36px_-4px_rgba(0,0,0,0.45)]`



                  }`}



                >



                  {/* Column Header */}



                  <div



                    className={`p-3 border-b flex items-center justify-between ${pal.headerBg}`}



                  >



                    <div className="flex items-center gap-2 min-w-0">



                      <div



                        className={`p-1.5 rounded-lg shadow-2xs shrink-0 ${pal.iconBg}`}



                      >



                        {col.icon}



                      </div>



                      <div className="truncate">



                        <h3 className="font-bold text-xs tracking-tight truncate">



                          {col.title}



                        </h3>



                        {col.subtitle && (



                          <p className="text-[10px] opacity-80 truncate font-semibold">



                            {col.subtitle}



                          </p>



                        )}



                      </div>



                    </div>



                    <span



                      className={`text-xs font-bold px-2 py-0.5 rounded-full border shadow-2xs ${pal.badge}`}



                    >



                      {col.tasks.length}



                    </span>



                  </div>



                  {/* Task Cards List - Concise, showing only WBS and related task */}



                  <div className="p-3 space-y-3.5 flex-1 min-h-[200px] max-h-[75vh] overflow-y-auto">



                    {col.tasks.length === 0 ? (



                      <div



                        style={{



                          borderColor: pal.borderColor,



                          borderWidth: "3px",



                          borderStyle: "dashed",



                        }}



                        className="py-12 min-h-[160px] flex items-center justify-center text-center rounded-xl text-slate-500 dark:text-slate-400 text-xs font-semibold bg-white/40 dark:bg-slate-800/40"



                      >



                        {isDropActive



                          ? "Release to drop task here"



                          : "Drag tasks here to reassign"}



                      </div>



                    ) : (



                      col.tasks.map((task) => {



                        return (



                          <div



                            key={task.id}



                            draggable={true}



                            onDragStart={(e) => handleDragStart(e, task.id)}



                            onDragEnd={handleDragEnd}



                            onClick={() => openScopeModal(task)}



                            className="group rounded-2xl p-4 min-h-[105px] flex flex-col justify-between transition-all cursor-grab active:cursor-grabbing bg-white dark:bg-slate-800 shadow-[0_10px_25px_-4px_rgba(0,0,0,0.12),0_4px_12px_-2px_rgba(0,0,0,0.08)] hover:shadow-[0_14px_30px_-4px_rgba(0,0,0,0.18)] dark:shadow-[0_10px_25px_-4px_rgba(0,0,0,0.45)] border border-slate-100/90 dark:border-slate-700/60"



                          >



                            <div>



                              {/* Work Plan/WBS Code & Status */}



                              <div className="flex items-center justify-between gap-1.5 mb-2">



                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 truncate max-w-[190px]">



                                  Work Plan/WBS: {task.wbs_code || "1.0"}



                                </span>



                                <span



                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${



                                    task.status === "COMPLETED"



                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"



                                      : task.status === "IN_PROGRESS"



                                        ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"



                                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"



                                  }`}



                                >



                                  {(task.status || "PENDING").replace("_", " ")}



                                </span>



                              </div>



                              {/* Task Title */}



                              <h4



                                className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-3 leading-snug"



                                title={task.task_title || task.title}



                              >



                                {task.task_title || task.title || "Untitled Task"}



                              </h4>



                            </div>



                          </div>



                        );



                      })



                    )}



                  </div>



                </div>



              );



            })}



            {/* Quick Add Team Member Column Button */}



            {groupBy === "ASSIGNEE" && (



              <button



                type="button"



                onClick={() => setShowMembersModal(true)}



                className="flex-shrink-0 w-72 min-h-[300px] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-400 hover:bg-brand-50/20 dark:hover:bg-brand-950/20 transition-all flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 font-semibold text-xs group cursor-pointer"



              >



                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:border-brand-300 dark:group-hover:border-brand-700 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/60 text-slate-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-all shadow-xs">



                  <UserPlus size={22} />



                </div>



                <div className="text-center px-4">



                  <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">



                    Add Team Member



                  </div>



                  <div className="text-[11px] text-slate-400 mt-0.5">



                    Click to manage members for this project



                  </div>



                </div>



              </button>



            )}



          </div>



        </div>



      )}



      {/* Manage Project Team Members Modal */}



      {showMembersModal && selectedProjectId && (



        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">



          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">



            {/* Modal Header */}



            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">



              <div className="flex items-center gap-3">



                <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">



                  <Users size={20} />



                </div>



                <div>



                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">



                    Project Team Members



                  </h3>



                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">



                    {currentProject?.project_name ||



                      currentProject?.name ||



                      `Project #${selectedProjectId}`}



                  </p>



                </div>



              </div>



              <button



                type="button"



                onClick={() => setShowMembersModal(false)}



                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"



              >



                <X size={18} />



              </button>



            </div>



            {/* Modal Body */}



            <div className="p-4 overflow-y-auto space-y-4">



              {/* Add Member Control */}



              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/90 dark:border-slate-700/80 space-y-2">



                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">



                  Add Team Member



                </label>



                <div className="flex gap-2">



                  <select



                    value={memberAddValue}



                    onChange={(e) => setMemberAddValue(e.target.value)}



                    className="select text-xs flex-1 py-1.5"



                  >



                    <option value="">-- Select user to add --</option>



                    {availableUsersToAdd.map((user) => (



                      <option key={user.id} value={user.id}>



                        {user.username ||



                          user.full_name ||



                          user.name ||



                          `User #${user.id}`}



                        {user.role ? ` (${user.role})` : ""}



                      </option>



                    ))}



                  </select>



                  <button



                    type="button"



                    onClick={addProjectMember}



                    disabled={!memberAddValue}



                    className="btn btn-primary text-sm py-1.5 px-3.5 font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"



                  >



                    <Plus size={14} /> Add



                  </button>



                </div>



                <div className="pt-1">



                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 select-none">



                    <input



                      type="checkbox"



                      checked={newMemberIsLead}



                      onChange={(e) => setNewMemberIsLead(e.target.checked)}



                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300 dark:border-slate-600 cursor-pointer"



                    />



                    <span className="flex items-center gap-1">



                      👑 Designate as Team Lead



                    </span>



                  </label>



                </div>



                {availableUsersToAdd.length === 0 && (



                  <p className="text-[11px] text-slate-400 italic">



                    All company users are currently members of this project.



                  </p>



                )}



              </div>



              {/* Active Members List */}



              <div>



                <div className="flex items-center justify-between mb-2">



                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">



                    Active Team Members ({selectedProjectMembers.length})



                  </h4>



                  {selectedProjectMembers.length > 0 && (



                    <button



                      type="button"



                      onClick={() => {



                        const assignedOnly = selectedProjectMembers



                          .filter((u) =>



                            filteredTasks.some(



                              (t) => String(t.assigned_to_id) === String(u.id),



                            ),



                          )



                          .map((u) => String(u.id));



                        setProjectTeamMembers((prev) => ({



                          ...prev,



                          [selectedProjectId]: assignedOnly,



                        }));



                        toast.info("Cleared members with no tasks");



                      }}



                      className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline font-medium"



                    >



                      Keep assigned only



                    </button>



                  )}



                </div>



                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">



                  {selectedProjectMembers.length === 0 ? (



                    <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">



                      No team members assigned to this project yet. Use the



                      dropdown above to add members.



                    </div>



                  ) : (



                    selectedProjectMembers.map((user, idx) => {



                      const label =



                        user.username ||



                        user.full_name ||



                        user.name ||



                        `User #${user.id}`;



                      const memberTasks = filteredTasks.filter(



                        (t) => String(t.assigned_to_id) === String(user.id),



                      );



                      const palette =



                        TEAM_MEMBER_COLOR_PALETTES[



                          idx % TEAM_MEMBER_COLOR_PALETTES.length



                        ];



                      return (



                        <div



                          key={user.id}



                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"



                        >



                          <div className="flex items-center gap-2.5 min-w-0">



                            <div



                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase shrink-0 ${palette.iconBg}`}



                            >



                              {label.slice(0, 2)}



                            </div>



                            <div className="min-w-0 truncate">



                              <div className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">



                                {label}



                              </div>



                              <div className="text-[10px] text-slate-400 truncate">



                                {user.email || user.role || "Team Member"}



                              </div>



                            </div>



                          </div>



                          <div className="flex items-center gap-2 shrink-0">



                            <label



                              className={`inline-flex items-center gap-1.5 cursor-pointer text-xs px-2 py-1 rounded-lg border select-none transition-colors ${



                                isProjectLead(user.id)



                                  ? "bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-semibold"



                                  : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"



                              }`}



                              title="Toggle Team Lead designation"



                            >



                              <input



                                type="checkbox"



                                checked={isProjectLead(user.id)}



                                onChange={() => toggleTeamLead(user.id)}



                                className="w-3.5 h-3.5 rounded text-amber-500 cursor-pointer"



                              />



                              <span className="text-[11px]">👑 Lead</span>



                            </label>



                            <span



                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${palette.badge}`}



                            >



                              {memberTasks.length}{" "}



                              {memberTasks.length === 1 ? "task" : "tasks"}



                            </span>



                            <button



                              type="button"



                              onClick={() => removeProjectMember(user.id)}



                              className="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60 transition-colors inline-flex items-center gap-1"



                              title={`Remove ${label} from project`}



                            >



                              <UserMinus size={12} /> Remove



                            </button>



                          </div>



                        </div>



                      );



                    })



                  )}



                </div>



              </div>



            </div>



            {/* Modal Footer */}



            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex justify-end">



              <button



                type="button"



                onClick={() => setShowMembersModal(false)}



                className="btn btn-primary text-xs font-semibold px-4 py-2"



              >



                Done



              </button>



            </div>



          </div>



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



                  <Layers className="text-brand-500 w-5 h-5" /> Execution



                  Details & Scope Assignment



                </h3>



                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">



                  Task:{" "}



                  <span className="font-semibold text-slate-700 dark:text-slate-300">



                    {activeTaskForScope.task_title}



                  </span>



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



              {/* Connected Project Scope & WBS Code Display/Edit */}



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-brand-50/40 dark:bg-slate-800/60 rounded-xl border border-brand-100 dark:border-slate-700">



                <div>



                  <label className="text-[11px] font-semibold text-brand-900 dark:text-brand-300 uppercase block mb-1">



                    Project Scope



                  </label>



                  <input



                    type="text"



                    className="input w-full text-sm"



                    placeholder="e.g. Substructure & Civil Foundations"



                    value={scopeTaskScopeName}



                    onChange={(e) => setScopeTaskScopeName(e.target.value)}



                  />



                </div>



                <div>



                  <label className="text-[11px] font-semibold text-brand-900 dark:text-brand-300 uppercase block mb-1">



                    WBS Code



                  </label>



                  <input



                    type="text"



                    className="input w-full text-sm font-semibold text-brand-700 dark:text-brand-300"



                    placeholder="e.g. 1.1 or WBS-01"



                    value={scopeTaskWbs}



                    onChange={(e) => setScopeTaskWbs(e.target.value)}



                  />



                </div>



              </div>



              <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">



                Break this task into granular execution deliverables / scope



                checklist/deliverables items and assign each sub-task to specific team



                members.



              </div>



              {/* Sub-tasks list */}



              <div className="space-y-2.5">



                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">



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



                        {st.completed && (



                          <Check size={14} className="stroke-[3]" />



                        )}



                      </button>



                      <span



                        className={`flex-1 text-sm font-medium ${



                          st.completed



                            ? "line-through text-slate-400"



                            : "text-slate-800 dark:text-slate-200"



                        }`}



                      >



                        {st.text}



                      </span>



                      {/* Per-Subtask Assignee Select */}



                      <div className="flex items-center gap-1 shrink-0">



                        <User size={13} className="text-slate-400" />



                        <select



                          value={st.assigned_to_id || ""}



                          onChange={(e) =>



                            handleSubtaskAssigneeChange(st.id, e.target.value)



                          }



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



                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">



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



                    className="btn btn-secondary inline-flex items-center gap-1.5 text-sm font-bold shrink-0"



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



                className="btn btn-primary text-sm inline-flex items-center gap-1.5 font-bold shadow-sm"



              >



                <Save size={14} />{" "}



                {savingScope ? "Saving..." : "Save Scope & Assignments"}



              </button>



            </div>



          </div>



        </div>



      )}



    </div>



  );



}



