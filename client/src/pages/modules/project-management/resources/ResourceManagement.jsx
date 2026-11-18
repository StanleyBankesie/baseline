import MobileMovingCarousel from "@/components/MobileMovingCarousel";

import React, { useState, useEffect, useCallback, useMemo } from "react";

import { api } from "../../../../api/client.js";

import { toast } from "react-toastify";

import { useUoms } from "@/hooks/useUoms";

import {

  Loader2,

  Plus,

  X,

  Pencil,

  Box,

  Wrench,

  Users,

  BarChart2,

  Calendar,

  CheckCircle2,

  AlertTriangle,

  Layers,

  ArrowLeft,

  ToggleLeft,

  ToggleRight,

  Unlink,

  Filter,

  CheckSquare,

  Square,

  Package,

  Trash2,

} from "lucide-react";

import { Link, useLocation } from "react-router-dom";



export default function ResourceManagement() {

  const location = useLocation();

  const [resources, setResources] = useState([]);

  const [projects, setProjects] = useState([]);

  const [projectTasks, setProjectTasks] = useState([]);

  const [loadingTasks, setLoadingTasks] = useState(false);

  const [equipments, setEquipments] = useState([]);

  const [employees, setEmployees] = useState([]);

  const [inventoryItems, setInventoryItems] = useState([]);

  const [loading, setLoading] = useState(true);

  const { uoms } = useUoms();



  // Filter States

  const [searchQuery, setSearchQuery] = useState("");

  const [filterType, setFilterType] = useState("");

  const [filterStatus, setFilterStatus] = useState("");

  const [filterProject, setFilterProject] = useState("");



  // Modal State

  const [modalOpen, setModalOpen] = useState(false);

  const [editingResource, setEditingResource] = useState(null);

  const [saving, setSaving] = useState(false);



  // Multi-type selection for allocating resources to a project

  const defaultAllocations = () => ({

    EQUIPMENT: [

      { id: 1, pm_equipment_id: "", resource_name: "", allocated_qty: 1 },

    ],

    EMPLOYEE: [

      { id: 1, hr_employee_id: "", resource_name: "", allocated_qty: 1 },

    ],

    MATERIAL: [

      {

        id: 1,

        inventory_item_id: "",

        resource_name: "",

        allocated_qty: 1,

        uom: "",

      },

    ],

    OTHER: [{ id: 1, resource_name: "", allocated_qty: 1 }],

  });



  const [selectedTypes, setSelectedTypes] = useState(["EQUIPMENT"]);

  const [typeAllocations, setTypeAllocations] = useState(defaultAllocations());



  const addResourceRow = (type) => {

    setTypeAllocations((prev) => {

      const list = prev[type] || [];

      const newId = (list[list.length - 1]?.id || 0) + 1;

      let newRow = { id: newId, allocated_qty: 1 };

      if (type === "EQUIPMENT") {

        newRow = { ...newRow, pm_equipment_id: "", resource_name: "" };

      } else if (type === "EMPLOYEE") {

        newRow = { ...newRow, hr_employee_id: "", resource_name: "" };

      } else if (type === "MATERIAL") {

        newRow = {

          ...newRow,

          inventory_item_id: "",

          resource_name: "",

          uom: "",

        };

      } else {

        newRow = { ...newRow, resource_name: "" };

      }

      return {

        ...prev,

        [type]: [...list, newRow],

      };

    });

  };



  const removeResourceRow = (type, index) => {

    setTypeAllocations((prev) => {

      const list = prev[type] || [];

      if (list.length <= 1) return prev;

      return {

        ...prev,

        [type]: list.filter((_, i) => i !== index),

      };

    });

  };



  const updateResourceRow = (type, index, updates) => {

    setTypeAllocations((prev) => {

      const list = [...(prev[type] || [])];

      list[index] = { ...list[index], ...updates };

      return {

        ...prev,

        [type]: list,

      };

    });

  };



  // Base Form State (shared across allocation lines)

  const [form, setForm] = useState({

    project_id: "",

    task_id: "",

    resource_type: "EQUIPMENT",

    pm_equipment_id: "",

    hr_employee_id: "",

    resource_name: "",

    allocated_qty: 1,

    status: "ALLOCATED",

    is_active: 1,

    accountable_user_id: "",

    start_date: "",

    end_date: "",

    remarks: "",

  });



  const getEmployeeFullName = (emp) => {

    if (!emp) return "";

    if (

      emp.full_name &&

      typeof emp.full_name === "string" &&

      emp.full_name.trim()

    ) {

      return emp.full_name.replace(/\s+/g, " ").trim();

    }

    const parts = [emp.first_name, emp.middle_name, emp.last_name].filter(

      Boolean,

    );

    if (parts.length) return parts.join(" ");

    return emp.employee_name || emp.name || `Employee #${emp.id}`;

  };



  const loadData = useCallback(async () => {

    try {

      setLoading(true);

      const [resRes, projRes, eqRes, empRes, itemsRes] = await Promise.all([

        api.get("/projects/resources").catch((err) => {

          console.error("Failed to load resources:", err);

          return { data: [] };

        }),

        api

          .get("/projects/projects", { params: { active: "all" } })

          .catch((err) => {

            console.error("Failed to load projects:", err);

            return { data: { items: [] } };

          }),

        api.get("/projects/equipments").catch((err) => {

          console.error("Failed to load equipments:", err);

          return { data: [] };

        }),

        api.get("/hr/employees").catch(() => ({ data: { items: [] } })),

        api.get("/inventory/items").catch(() => ({ data: { items: [] } })),

      ]);



      const loadedResources = Array.isArray(resRes.data)

        ? resRes.data

        : resRes.data?.items || [];

      const loadedProjects = Array.isArray(projRes.data)

        ? projRes.data

        : projRes.data?.items || projRes.data?.projects || [];

      const loadedEquipments = Array.isArray(eqRes.data)

        ? eqRes.data

        : eqRes.data?.items || [];

      const loadedEmployees = Array.isArray(empRes.data)

        ? empRes.data

        : empRes.data?.items || empRes.data?.data || [];

      const loadedItems = Array.isArray(itemsRes.data)

        ? itemsRes.data

        : itemsRes.data?.items || itemsRes.data?.data?.items || [];



      setResources(loadedResources);

      setProjects(loadedProjects);

      setEquipments(loadedEquipments);

      setEmployees(loadedEmployees);

      setInventoryItems(loadedItems);

    } catch (e) {

      console.error("Failed to load resource data", e);

      toast.error("Failed to load resource data");

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    loadData();

    if (location.pathname.endsWith("/new")) {

      openAdd();

    }

  }, [loadData, location.pathname]);



  // Fetch associated tasks whenever selected project changes

  useEffect(() => {

    if (!form.project_id) {

      setProjectTasks([]);

      return;

    }

    let isMounted = true;

    setLoadingTasks(true);

    api

      .get(`/projects/tasks?projectId=${form.project_id}`)

      .then((res) => {

        if (!isMounted) return;

        const taskItems =

          res.data?.items || (Array.isArray(res.data) ? res.data : []);

        setProjectTasks(taskItems);

      })

      .catch((err) => {

        if (!isMounted) return;

        console.error("Failed to fetch tasks for project", err);

        setProjectTasks([]);

      })

      .finally(() => {

        if (isMounted) setLoadingTasks(false);

      });



    return () => {

      isMounted = false;

    };

  }, [form.project_id]);



  // Filter projects to all available active and in-progress projects

  const activeProjects = useMemo(() => {

    const list = Array.isArray(projects) ? projects : [];

    return list.filter((p) => {

      if (

        editingResource &&

        String(editingResource.project_id) === String(p.id)

      )

        return true;

      const st = String(p.project_status || p.status || "").toUpperCase();

      if (

        st === "COMPLETED" ||

        st === "CANCELLED" ||

        st === "ARCHIVED" ||

        st === "INACTIVE"

      )

        return false;

      return true;

    });

  }, [projects, editingResource]);



  // Filter equipments: active equipments from pm_equipments which are not currently actively linked

  const availableEquipments = useMemo(() => {

    const list = Array.isArray(equipments) ? equipments : [];

    return list.filter((eq) => {

      if (

        editingResource &&

        String(editingResource.pm_equipment_id) === String(eq.id)

      ) {

        return true;

      }



      const eqStatus = String(eq.status || "").toUpperCase();

      if (eqStatus && eqStatus !== "ACTIVE") {

        return false;

      }



      // Check active allocations only (inactive allocations are not counted)

      const eqAllocations = (resources || []).filter(

        (r) =>

          String(r.pm_equipment_id) === String(eq.id) &&

          (r.is_active === 1 ||

            r.is_active === "1" ||

            r.is_active === true ||

            r.is_active === null ||

            r.is_active === undefined),

      );



      if (eqAllocations.length === 0) return true;



      // In use or allocated and not released

      const isCurrentlyLinked = eqAllocations.some((r) => {

        const st = String(r.status || "").toUpperCase();

        return st !== "RELEASED";

      });



      return !isCurrentlyLinked;

    });

  }, [equipments, resources, editingResource]);



  const toggleResourceType = (type) => {

    setSelectedTypes((prev) => {

      if (prev.includes(type)) {

        if (prev.length === 1) {

          toast.info("At least one resource type must be selected");

          return prev;

        }

        return prev.filter((t) => t !== type);

      } else {

        return [...prev, type];

      }

    });

  };



  const openAdd = () => {

    setEditingResource(null);

    setProjectTasks([]);

    setSelectedTypes(["EQUIPMENT"]);

    setTypeAllocations(defaultAllocations());

    setForm({

      project_id: "",

      task_id: "",

      resource_type: "EQUIPMENT",

      pm_equipment_id: "",

      hr_employee_id: "",

      resource_name: "",

      allocated_qty: 1,

      status: "ALLOCATED",

      is_active: 1,

      accountable_user_id: "",

      start_date: "",

      end_date: "",

      remarks: "",

    });

    setModalOpen(true);

  };



  const openEdit = (r) => {

    setEditingResource(r);

    if (r.task_id && r.task_title) {

      setProjectTasks([{ id: r.task_id, task_title: r.task_title }]);

    } else {

      setProjectTasks([]);

    }

    if (r.project_id) {

      api

        .get(`/projects/tasks?projectId=${r.project_id}`)

        .then((res) => {

          const taskItems =

            res.data?.items || (Array.isArray(res.data) ? res.data : []);

          setProjectTasks(taskItems);

        })

        .catch(() => {});

    }

    const isActive =

      r.is_active === 1 ||

      r.is_active === "1" ||

      r.is_active === true ||

      r.is_active === null ||

      r.is_active === undefined

        ? 1

        : 0;

    setForm({

      project_id: r.project_id ? String(r.project_id) : "",

      task_id: r.task_id ? String(r.task_id) : "",

      resource_type: r.resource_type || "EQUIPMENT",

      pm_equipment_id: r.pm_equipment_id ? String(r.pm_equipment_id) : "",

      hr_employee_id: r.hr_employee_id ? String(r.hr_employee_id) : "",

      resource_name: r.resource_name || "",

      allocated_qty: r.allocated_qty || 1,

      status: r.status || "ALLOCATED",

      is_active: isActive,

      accountable_user_id: r.accountable_user_id || "",

      start_date: r.start_date ? r.start_date.split("T")[0] : "",

      end_date: r.end_date ? r.end_date.split("T")[0] : "",

      remarks: r.remarks || "",

    });

    setModalOpen(true);

  };



  const saveResource = async (e) => {

    if (e && e.preventDefault) e.preventDefault();



    if (editingResource) {

      // Editing existing single resource

      if (!form.resource_name || !form.resource_name.trim()) {

        toast.error("Resource name is required");

        return;

      }



      // Check inactive business rule:

      if (Number(form.is_active) === 0 && form.project_id) {

        toast.error(

          "Cannot set resource to inactive while allocated to a project. Please unallocate the resource from the project first.",

        );

        return;

      }



      setSaving(true);

      try {

        const payload = {

          ...form,

          project_id: form.project_id ? Number(form.project_id) : null,

          task_id: form.task_id ? Number(form.task_id) : null,

          pm_equipment_id:

            form.resource_type === "EQUIPMENT" && form.pm_equipment_id

              ? Number(form.pm_equipment_id)

              : null,

          hr_employee_id:

            form.resource_type === "EMPLOYEE" && form.hr_employee_id

              ? Number(form.hr_employee_id)

              : null,

          allocated_qty: Number(form.allocated_qty) || 1,

          is_active: Number(form.is_active) === 1 ? 1 : 0,

          status: form.status || "ALLOCATED",

        };



        await api.put(`/projects/resources/${editingResource.id}`, payload);

        toast.success("Resource updated successfully");

        setModalOpen(false);

        loadData();

      } catch (err) {

        toast.error(err?.response?.data?.message || "Failed to save resource");

      } finally {

        setSaving(false);

      }

    } else {

      // Creating resource(s): allows linking MORE THAN ONE RESOURCE TYPE to the project in one submission

      if (!form.project_id) {

        toast.error("Project is required");

        return;

      }



      const itemsToCreate = [];



      for (const type of selectedTypes) {

        const rows = typeAllocations[type] || [];

        if (!rows.length) continue;



        if (type === "EQUIPMENT") {

          for (let i = 0; i < rows.length; i++) {

            const alloc = rows[i];

            if (!alloc.pm_equipment_id) {

              toast.error(

                `Please select an equipment for Equipment row #${i + 1}`,

              );

              return;

            }

            itemsToCreate.push({

              project_id: Number(form.project_id),

              task_id: form.task_id ? Number(form.task_id) : null,

              resource_type: "EQUIPMENT",

              pm_equipment_id: Number(alloc.pm_equipment_id),

              hr_employee_id: null,

              resource_name: alloc.resource_name || "Equipment",

              allocated_qty: Number(alloc.allocated_qty) || 1,

              status: "ALLOCATED",

              is_active: 1,

              start_date: form.start_date || null,

              end_date: form.end_date || null,

              remarks: form.remarks || null,

            });

          }

        } else if (type === "EMPLOYEE") {

          for (let i = 0; i < rows.length; i++) {

            const alloc = rows[i];

            if (!alloc.hr_employee_id) {

              toast.error(

                `Please select an employee for Employee row #${i + 1}`,

              );

              return;

            }

            itemsToCreate.push({

              project_id: Number(form.project_id),

              task_id: form.task_id ? Number(form.task_id) : null,

              resource_type: "EMPLOYEE",

              pm_equipment_id: null,

              hr_employee_id: Number(alloc.hr_employee_id),

              resource_name: alloc.resource_name || "Employee",

              allocated_qty: Number(alloc.allocated_qty) || 1,

              status: "ALLOCATED",

              is_active: 1,

              start_date: form.start_date || null,

              end_date: form.end_date || null,

              remarks: form.remarks || null,

            });

          }

        } else if (type === "MATERIAL") {

          for (let i = 0; i < rows.length; i++) {

            const alloc = rows[i];

            if (!alloc.resource_name || !alloc.resource_name.trim()) {

              toast.error(

                `Please provide a material name for Material row #${i + 1}`,

              );

              return;

            }

            itemsToCreate.push({

              project_id: Number(form.project_id),

              task_id: form.task_id ? Number(form.task_id) : null,

              resource_type: "MATERIAL",

              pm_equipment_id: null,

              hr_employee_id: null,

              resource_name: alloc.resource_name.trim(),

              allocated_qty: Number(alloc.allocated_qty) || 1,

              status: "ALLOCATED",

              is_active: 1,

              start_date: form.start_date || null,

              end_date: form.end_date || null,

              remarks: form.remarks || null,

            });

          }

        } else if (type === "OTHER") {

          for (let i = 0; i < rows.length; i++) {

            const alloc = rows[i];

            if (!alloc.resource_name || !alloc.resource_name.trim()) {

              toast.error(

                `Please enter a resource name for Other resource row #${i + 1}`,

              );

              return;

            }

            itemsToCreate.push({

              project_id: Number(form.project_id),

              task_id: form.task_id ? Number(form.task_id) : null,

              resource_type: "OTHER",

              pm_equipment_id: null,

              hr_employee_id: null,

              resource_name: alloc.resource_name.trim(),

              allocated_qty: Number(alloc.allocated_qty) || 1,

              status: "ALLOCATED",

              is_active: 1,

              start_date: form.start_date || null,

              end_date: form.end_date || null,

              remarks: form.remarks || null,

            });

          }

        }

      }



      if (!itemsToCreate.length) {

        toast.error(

          "Please configure at least one resource type to allocate to the project",

        );

        return;

      }



      setSaving(true);

      try {

        await api.post("/projects/resources", { items: itemsToCreate });

        toast.success(

          `${itemsToCreate.length} resource type(s) linked to project successfully`,

        );

        setModalOpen(false);

        loadData();

      } catch (err) {

        toast.error(

          err?.response?.data?.message ||

            "Failed to allocate resources to project",

        );

      } finally {

        setSaving(false);

      }

    }

  };



  // Toggle active / inactive with validation rule: must unallocate from project first

  const handleToggleActive = async (r) => {

    const isCurrentlyActive =

      r.is_active === 1 ||

      r.is_active === "1" ||

      r.is_active === true ||

      r.is_active === null ||

      r.is_active === undefined;

    const newActiveState = isCurrentlyActive ? 0 : 1;



    // Enforce business rule: to set to inactive, user must unallocate resource type from project before they can inactive

    if (newActiveState === 0 && r.project_id) {

      toast.error(

        "Cannot set resource to inactive while allocated to a project. Please unallocate the resource from the project first.",

      );

      return;

    }



    try {

      await api

        .patch(`/projects/resources/${r.id}/status`, {

          is_active: newActiveState,

        })

        .catch(() =>

          api.put(`/projects/resources/${r.id}`, {

            ...r,

            is_active: newActiveState,

          }),

        );

      toast.success(

        `Resource status set to ${newActiveState === 1 ? "Active" : "Inactive"}`,

      );

      loadData();

    } catch (err) {

      toast.error(

        err?.response?.data?.message ||

          "Failed to update resource active status",

      );

    }

  };



  // Quick unallocate action so user can unallocate from project before inactivating

  const handleUnallocate = async (r) => {

    if (

      !window.confirm(

        `Unallocate "${r.resource_name}" from project "${r.project_name || `Project #${r.project_id}`}"?`,

      )

    )

      return;

    try {

      await api.put(`/projects/resources/${r.id}`, {

        ...r,

        project_id: null,

        task_id: null,

        status: "RELEASED",

      });

      toast.success("Resource unallocated from project");

      loadData();

    } catch (err) {

      toast.error(

        err?.response?.data?.message || "Failed to unallocate resource",

      );

    }

  };



  // Stats: Inactive resources are strictly NOT counted as part of resource allocation to a project

  const stats = useMemo(() => {

    const activeAllocations = resources.filter((r) => {

      const isActive =

        r.is_active === 1 ||

        r.is_active === "1" ||

        r.is_active === true ||

        r.is_active === null ||

        r.is_active === undefined;

      return Boolean(isActive && r.project_id);

    });

    const total = activeAllocations.length;

    const inUse = activeAllocations.filter((r) => r.status === "IN_USE").length;

    const allocated = activeAllocations.filter(

      (r) => r.status === "ALLOCATED",

    ).length;

    const released = activeAllocations.filter(

      (r) => r.status === "RELEASED",

    ).length;

    return { total, inUse, allocated, released };

  }, [resources]);



  // Filtered resources for the table view

  const filteredResources = useMemo(() => {

    return resources.filter((r) => {

      const isActive =

        r.is_active === 1 ||

        r.is_active === "1" ||

        r.is_active === true ||

        r.is_active === null ||

        r.is_active === undefined;



      if (filterType && r.resource_type !== filterType) return false;

      if (filterProject && String(r.project_id || "") !== String(filterProject))

        return false;

      if (filterStatus === "ACTIVE" && !isActive) return false;

      if (filterStatus === "INACTIVE" && isActive) return false;

      if (

        filterStatus &&

        filterStatus !== "ACTIVE" &&

        filterStatus !== "INACTIVE" &&

        r.status !== filterStatus

      )

        return false;



      if (searchQuery.trim()) {

        const q = searchQuery.toLowerCase();

        const matchName = String(r.resource_name || "")

          .toLowerCase()

          .includes(q);

        const matchProj =

          String(r.project_name || "")

            .toLowerCase()

            .includes(q) ||

          String(r.project_code || "")

            .toLowerCase()

            .includes(q);

        const matchTask = String(r.task_title || "")

          .toLowerCase()

          .includes(q);

        if (!matchName && !matchProj && !matchTask) return false;

      }

      return true;

    });

  }, [resources, filterType, filterStatus, filterProject, searchQuery]);



  return (

    <div className="p-4 space-y-6">

      {/* Navigation Breadcrumb */}

      <div className="mb-2">

        <Link

          to="/project-management"

          className="btn btn-secondary inline-flex items-center gap-1.5 text-sm"

        >

          <ArrowLeft size={16} />

          Back

        </Link>

      </div>



      {/* Header */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

        <div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">

            <Box size={26} className="text-brand-900 dark:text-brand-400" />{" "}

            Resource Management

          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400 hidden">

            Allocate and track multiple resource types across active projects

            with full lifecycle governance

          </p>

        </div>

        <div className="flex items-center gap-2">

          <Link

            to="/project-management/reports/project-status"

            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs font-semibold"

          >

            <BarChart2 size={16} /> Status Report

          </Link>

          <button

            onClick={openAdd}

            className="btn btn-primary inline-flex items-center gap-2 text-sm font-semibold shadow-sm"

          >

            <Plus size={16} /> Link Resource(s) to Project

          </button>

        </div>

      </div>



      {/* Summary KPI Cards - Inactive resources excluded from project allocation */}

      <MobileMovingCarousel data-page-carousel gridColsClass="md:grid-cols-4" gapClass="gap-4">

        {[

          {

            label: "Active Allocated",

            val: stats.total,

            icon: <Box size={20} className="stroke-[2.5]" />,

            color: "bg-sky-600 dark:bg-sky-500",

          },

          {

            label: "In Use Resources",

            val: stats.inUse,

            icon: <Wrench size={20} className="stroke-[2.5]" />,

            color: "bg-emerald-600",

          },

          {

            label: "Allocated / Ready",

            val: stats.allocated,

            icon: <Users size={20} className="stroke-[2.5]" />,

            color: "bg-amber-500",

          },

          {

            label: "Released Resources",

            val: stats.released,

            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,

            color: "bg-brand-900 dark:bg-brand-700",

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



      {/* Filter and Search Bar */}

      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-wrap items-center gap-3">

        <div className="flex-1 min-w-[200px]">

          <input

            type="text"

            placeholder="Search resources, projects, or tasks..."

            className="input text-sm w-full"

            value={searchQuery}

            onChange={(e) => setSearchQuery(e.target.value)}

          />

        </div>

        <div className="flex items-center gap-2">

          <Filter size={15} className="text-slate-400" />

          <select

            className="select text-sm"

            value={filterType}

            onChange={(e) => setFilterType(e.target.value)}

          >

            <option value="">All Resource Types</option>

            <option value="EQUIPMENT">Equipment</option>

            <option value="EMPLOYEE">Employee</option>

            <option value="MATERIAL">Material</option>

            <option value="OTHER">Other</option>

          </select>



          <select

            className="select text-sm"

            value={filterProject}

            onChange={(e) => setFilterProject(e.target.value)}

          >

            <option value="">All Projects</option>

            {projects.map((p) => (

              <option key={p.id} value={p.id}>

                {p.project_code ? `${p.project_code} - ` : ""}

                {p.project_name || p.name}

              </option>

            ))}

          </select>



          <select

            className="select text-sm"

            value={filterStatus}

            onChange={(e) => setFilterStatus(e.target.value)}

          >

            <option value="">All Statuses</option>

            <option value="ACTIVE">Active Only</option>

            <option value="INACTIVE">Inactive Only</option>

            <option value="ALLOCATED">Allocated</option>

            <option value="IN_USE">In Use</option>

            <option value="RELEASED">Released</option>

            <option value="DAMAGED">Damaged</option>

          </select>

        </div>

      </div>



      {/* Main Table - Delete button removed, Active/Inactive controls & Unallocate actions added */}

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">

        <div className="overflow-x-auto">

          <table className="min-w-full whitespace-nowrap">

            <thead className="bg-slate-50 dark:bg-slate-900/50">

              <tr className="text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">

                <th className="px-4 py-3">Resource Name</th>

                <th className="px-4 py-3">Type</th>

                <th className="px-4 py-3">Project / Task</th>

                <th className="px-4 py-3">Dates</th>

                <th className="px-4 py-3">Allocation Status</th>

                <th className="px-4 py-3">Active State</th>

                <th className="px-4 py-3 text-right">Actions</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">

              {loading ? (

                <tr>

                  <td

                    colSpan={7}

                    className="px-4 py-12 text-center text-slate-400"

                  >

                    <Loader2

                      size={24}

                      className="animate-spin inline-block mr-2"

                    />

                    Loading resources...

                  </td>

                </tr>

              ) : filteredResources.length > 0 ? (

                filteredResources.map((r) => {

                  const isActive =

                    r.is_active === 1 ||

                    r.is_active === "1" ||

                    r.is_active === true ||

                    r.is_active === null ||

                    r.is_active === undefined;

                  const isAllocated = Boolean(r.project_id);



                  return (

                    <tr

                      key={r.id}

                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"

                    >

                      <td className="px-4 py-3">

                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">

                          {r.resource_name}

                        </p>

                        <p className="text-xs text-slate-500">

                          Qty: {r.allocated_qty}

                        </p>

                      </td>

                      <td className="px-4 py-3 text-sm">

                        <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase text-xs">

                          {r.resource_type}

                        </span>

                      </td>

                      <td className="px-4 py-3">

                        {isAllocated ? (

                          <>

                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">

                              {r.project_code ? `${r.project_code} - ` : ""}

                              {r.project_name || `Project #${r.project_id}`}

                            </p>

                            <p className="text-xs text-slate-500">

                              {r.task_title || "No Task Linked"}

                            </p>

                          </>

                        ) : (

                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 text-xs italic">

                            <Unlink size={12} /> Unallocated / Available

                          </span>

                        )}

                      </td>

                      <td className="px-4 py-3 text-sm text-slate-500">

                        <p>

                          Start:{" "}

                          {r.start_date

                            ? new Date(r.start_date).toLocaleDateString()

                            : "N/A"}

                        </p>

                        <p>

                          End:{" "}

                          {r.end_date

                            ? new Date(r.end_date).toLocaleDateString()

                            : "N/A"}

                        </p>

                      </td>

                      <td className="px-4 py-3 text-sm">

                        <span

                          className={`px-2.5 py-1 rounded-full font-bold uppercase text-xs ${

                            r.status === "IN_USE"

                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"

                              : r.status === "ALLOCATED"

                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"

                                : r.status === "RELEASED"

                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"

                                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"

                          }`}

                        >

                          {r.status || "ALLOCATED"}

                        </span>

                      </td>

                      <td className="px-4 py-3 text-sm">

                        {isActive ? (

                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold uppercase text-xs tracking-wide inline-flex items-center gap-1">

                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>

                            Active

                          </span>

                        ) : (

                          <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 font-bold uppercase text-xs tracking-wide inline-flex items-center gap-1">

                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>

                            Inactive

                          </span>

                        )}

                      </td>

                      <td className="px-4 py-3 text-right">

                        <div className="flex items-center justify-end gap-1.5">

                          {/* Unallocate Quick Action */}

                          {isAllocated && (

                            <button

                              onClick={() => handleUnallocate(r)}

                              className="px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 text-xs font-semibold inline-flex items-center gap-1 transition"

                              title="Unallocate resource from project before setting to inactive"

                            >

                              <Unlink size={13} /> Unallocate

                            </button>

                          )}



                          {/* Active / Inactive Status Toggle */}

                          <button

                            onClick={() => handleToggleActive(r)}

                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold inline-flex items-center gap-1.5 transition ${

                              isActive

                                ? isAllocated

                                  ? "border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 cursor-pointer"

                                  : "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"

                                : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"

                            }`}

                            title={

                              isActive

                                ? isAllocated

                                  ? "Resource is allocated to a project. Unallocate first to set Inactive."

                                  : "Click to set Inactive"

                                : "Click to set Active"

                            }

                          >

                            {isActive ? (

                              <>

                                <ToggleRight

                                  size={16}

                                  className="text-emerald-600 dark:text-emerald-400"

                                />

                                <span>Active</span>

                              </>

                            ) : (

                              <>

                                <ToggleLeft

                                  size={16}

                                  className="text-slate-400"

                                />

                                <span>Inactive</span>

                              </>

                            )}

                          </button>



                          {/* Edit Resource */}

                          <button

                            onClick={() => openEdit(r)}

                            className="p-1.5 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"

                            title="Edit Resource Details"

                          >

                            <Pencil size={15} />

                          </button>

                        </div>

                      </td>

                    </tr>

                  );

                })

              ) : (

                <tr>

                  <td

                    colSpan={7}

                    className="px-4 py-12 text-center text-slate-400"

                  >

                    No matching resources found. Click "Link Resource(s) to

                    Project" above to allocate resources.

                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>



      {/* ========================================================================= */}

      {/* FACILITIES-STYLE MODAL: ALLOCATE MULTIPLE RESOURCE TYPES OR EDIT */}

      {/* ========================================================================= */}

      {modalOpen && (

        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl lg:max-w-3xl shadow-2xl overflow-hidden my-auto sm:my-8 transition-all">

            {/* Header */}

            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">

                  <Box size={20} />

                </div>

                <div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">

                    {editingResource

                      ? "Edit Resource Allocation"

                      : "Link Resource Types to Project"}

                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400">

                    {editingResource

                      ? "Modify project allocation, quantities, active state, or lifecycle status"

                      : "Link one or more resource types (equipment, employees, materials) to an active project"}

                  </p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => setModalOpen(false)}

                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"

              >

                <X size={18} />

              </button>

            </div>



            {/* Form */}

            <form onSubmit={saveResource} className="p-6 space-y-5 text-xs">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Project Field: Fetches all active projects */}

                <div>

                  <div className="flex items-center justify-between mb-1">

                    <label className="block text-slate-700 dark:text-slate-300 font-semibold">

                      Project{" "}

                      {!editingResource && (

                        <span className="text-red-500">*</span>

                      )}

                    </label>

                    {editingResource && form.project_id && (

                      <button

                        type="button"

                        onClick={() =>

                          setForm((p) => ({

                            ...p,

                            project_id: "",

                            task_id: "",

                          }))

                        }

                        className="text-xs text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-semibold"

                        title="Release this resource from project to allow setting to Inactive"

                      >

                        <Unlink size={11} /> Unallocate from Project

                      </button>

                    )}

                  </div>

                  <select

                    className="input text-sm w-full"

                    value={form.project_id}

                    onChange={(e) => {

                      const newProjectId = e.target.value;

                      setForm((p) => ({

                        ...p,

                        project_id: newProjectId,

                        task_id: "",

                      }));

                    }}

                    required={!editingResource}

                  >

                    <option value="">

                      {editingResource

                        ? "-- Unallocated / None (Release from Project) --"

                        : "-- Select Active Project --"}

                    </option>

                    {activeProjects.map((p) => (

                      <option key={p.id} value={p.id}>

                        {p.project_code ? `${p.project_code} - ` : ""}

                        {p.project_name}{" "}

                        {p.project_status ? `(${p.project_status})` : ""}

                      </option>

                    ))}

                  </select>

                  {editingResource && (

                    <p className="text-xs text-slate-400 mt-0.5">

                      Select a project or set to Unallocated to allow inactivating.

                    </p>

                  )}

                </div>



                {/* Task Field: Fetches associated tasks for the selected project */}

                <div>

                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">

                    Associated Task (Optional)

                  </label>

                  <select

                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"

                    value={form.task_id}

                    onChange={(e) =>

                      setForm((p) => ({ ...p, task_id: e.target.value }))

                    }

                    disabled={!form.project_id || loadingTasks}

                  >

                    <option value="">

                      {loadingTasks

                        ? "Loading tasks..."

                        : !form.project_id

                          ? "-- Select Project First --"

                          : projectTasks.length === 0

                            ? "-- No tasks found for this project --"

                            : "-- Select Associated Task --"}

                    </option>

                    {projectTasks.map((t) => (

                      <option key={t.id} value={t.id}>

                        {t.task_title || t.title || `Task #${t.id}`}

                        {t.status ? ` (${t.status})` : ""}

                      </option>

                    ))}

                  </select>

                </div>

              </div>



              {/* In CREATE MODE: Multi-Resource Type Selector */}

              {!editingResource && (

                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">

                  <div>

                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-2">

                      Select Resource Type(s) to Link{" "}

                      <span className="text-red-500">*</span>

                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">

                      {[

                        { key: "EQUIPMENT", label: "Equipment", icon: Wrench },

                        { key: "EMPLOYEE", label: "Employee", icon: Users },

                        { key: "MATERIAL", label: "Material", icon: Package },

                        { key: "OTHER", label: "Other", icon: Box },

                      ].map((t) => {

                        const isSelected = selectedTypes.includes(t.key);

                        const Icon = t.icon;

                        return (

                          <button

                            key={t.key}

                            type="button"

                            onClick={() => toggleResourceType(t.key)}

                            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${

                              isSelected

                                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-brand-900 dark:text-brand-300 font-bold shadow-sm"

                                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"

                            }`}

                          >

                            <span className="flex items-center gap-2">

                              <Icon

                                size={16}

                                className={

                                  isSelected

                                    ? "text-brand-600"

                                    : "text-slate-400"

                                }

                              />

                              <span>{t.label}</span>

                            </span>

                            {isSelected ? (

                              <CheckSquare

                                size={16}

                                className="text-brand-600 dark:text-brand-400"

                              />

                            ) : (

                              <Square

                                size={16}

                                className="text-slate-300 dark:text-slate-600"

                              />

                            )}

                          </button>

                        );

                      })}

                    </div>

                  </div>



                  {/* Resource Type Form Fields for Each Selected Type */}

                  <div className="space-y-5">

                    {/* 1. EQUIPMENT SECTION */}

                    {selectedTypes.includes("EQUIPMENT") && (

                      <div className="space-y-3 pt-1">

                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">

                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">

                            <Wrench size={14} className="text-brand-600" /> Equipment Allocation

                          </h4>

                          <button

                            type="button"

                            onClick={() => addResourceRow("EQUIPMENT")}

                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"

                          >

                            <Plus size={13} /> Add Another Equipment

                          </button>

                        </div>

                        {(typeAllocations.EQUIPMENT || []).map((row, index) => (

                          <div key={row.id || index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">

                            <div className={typeAllocations.EQUIPMENT.length > 1 ? "sm:col-span-8" : "sm:col-span-8"}>

                              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-sm">

                                Select Available Equipment {typeAllocations.EQUIPMENT.length > 1 ? `#${index + 1}` : ""}{" "}

                                <span className="text-red-500">*</span>

                              </label>

                              <select

                                className="input text-sm w-full"

                                value={row.pm_equipment_id}

                                onChange={(e) => {

                                  const eqId = e.target.value;

                                  const eq = equipments.find(

                                    (item) => String(item.id) === String(eqId),

                                  );

                                  updateResourceRow("EQUIPMENT", index, {

                                    pm_equipment_id: eqId,

                                    resource_name: eq ? eq.name : "",

                                  });

                                }}

                              >

                                <option value="">-- Choose Equipment --</option>

                                {availableEquipments.map((eq) => (

                                  <option key={eq.id} value={eq.id}>

                                    {eq.name}{" "}

                                    {eq.description ? `(${eq.description})` : ""}

                                  </option>

                                ))}

                              </select>

                            </div>

                            <div className={typeAllocations.EQUIPMENT.length > 1 ? "sm:col-span-3" : "sm:col-span-4"}>

                              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-sm">

                                Quantity

                              </label>

                              <input

                                type="number"

                                min="1"

                                className="input text-sm w-full"

                                value={row.allocated_qty}

                                onChange={(e) =>

                                  updateResourceRow("EQUIPMENT", index, {

                                    allocated_qty: e.target.value,

                                  })

                                }

                              />

                            </div>

                            {typeAllocations.EQUIPMENT.length > 1 && (

                              <div className="sm:col-span-1 flex justify-center pb-1">

                                <button

                                  type="button"

                                  onClick={() => removeResourceRow("EQUIPMENT", index)}

                                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"

                                  title="Remove this equipment"

                                >

                                  <Trash2 size={15} />

                                </button>

                              </div>

                            )}

                          </div>

                        ))}

                      </div>

                    )}



                    {/* 2. EMPLOYEE SECTION */}

                    {selectedTypes.includes("EMPLOYEE") && (

                      <div className="space-y-3 pt-1">

                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">

                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">

                            <Users size={14} className="text-blue-600" /> Employee Assignment

                          </h4>

                          <button

                            type="button"

                            onClick={() => addResourceRow("EMPLOYEE")}

                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"

                          >

                            <Plus size={13} /> Add Another Employee

                          </button>

                        </div>

                        {(typeAllocations.EMPLOYEE || []).map((row, index) => (

                          <div key={row.id || index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">

                            <div className={typeAllocations.EMPLOYEE.length > 1 ? "sm:col-span-8" : "sm:col-span-8"}>

                              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-sm">

                                Select Employee from HR {typeAllocations.EMPLOYEE.length > 1 ? `#${index + 1}` : ""}{" "}

                                <span className="text-red-500">*</span>

                              </label>

                              <select

                                className="input text-sm w-full"

                                value={row.hr_employee_id}

                                onChange={(e) => {

                                  const empId = e.target.value;

                                  const emp = employees.find(

                                    (item) => String(item.id) === String(empId),

                                  );

                                  updateResourceRow("EMPLOYEE", index, {

                                    hr_employee_id: empId,

                                    resource_name: emp

                                      ? getEmployeeFullName(emp)

                                      : "",

                                  });

                                }}

                              >

                                <option value="">-- Choose Employee --</option>

                                {employees.map((emp) => {

                                  const name = getEmployeeFullName(emp);

                                  const designation =

                                    emp.pos_name ||

                                    emp.dept_name ||

                                    emp.designation;

                                  return (

                                    <option key={emp.id} value={emp.id}>

                                      {emp.emp_code ? `${emp.emp_code} - ` : ""}

                                      {name}

                                      {designation ? ` (${designation})` : ""}

                                    </option>

                                  );

                                })}

                              </select>

                            </div>

                            <div className={typeAllocations.EMPLOYEE.length > 1 ? "sm:col-span-3" : "sm:col-span-4"}>

                              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-sm">

                                FTE / Allocation Qty

                              </label>

                              <input

                                type="number"

                                min="0.1"

                                step="0.1"

                                className="input text-sm w-full"

                                value={row.allocated_qty}

                                onChange={(e) =>

                                  updateResourceRow("EMPLOYEE", index, {

                                    allocated_qty: e.target.value,

                                  })

                                }

                              />

                            </div>

                            {typeAllocations.EMPLOYEE.length > 1 && (

                              <div className="sm:col-span-1 flex justify-center pb-1">

                                <button

                                  type="button"

                                  onClick={() => removeResourceRow("EMPLOYEE", index)}

                                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"

                                  title="Remove this employee"

                                >

                                  <Trash2 size={15} />

                                </button>

                              </div>

                            )}

                          </div>

                        ))}

                      </div>

                    )}



                    {/* 3. MATERIAL SECTION */}

                    {selectedTypes.includes("MATERIAL") && (

                      <div className="space-y-3 pt-1">

                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">

                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">

                            <Package size={14} className="text-emerald-600" /> Material / Supplies Allocation

                          </h4>

                          <button

                            type="button"

                            onClick={() => addResourceRow("MATERIAL")}

                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"

                          >

                            <Plus size={13} /> Add Another Material

                          </button>

                        </div>

                        {(typeAllocations.MATERIAL || []).map((row, index) => (

                          <div key={row.id || index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">

                            <div className="sm:col-span-6 space-y-1.5">

                              <label className="block text-slate-700 dark:text-slate-300 font-semibold text-sm">

                                Select Catalog or Custom Name {typeAllocations.MATERIAL.length > 1 ? `#${index + 1}` : ""}{" "}

                                <span className="text-red-500">*</span>

                              </label>

                              <select

                                className="input text-sm w-full"

                                value={row.inventory_item_id || ""}

                                onChange={(e) => {

                                  const itemId = e.target.value;

                                  const itm = inventoryItems.find(

                                    (item) => String(item.id) === String(itemId),

                                  );

                                  updateResourceRow("MATERIAL", index, {

                                    inventory_item_id: itemId,

                                    resource_name: itm

                                      ? itm.item_name || itm.name || ""

                                      : row.resource_name,

                                    uom: itm?.uom || row.uom || "",

                                  });

                                }}

                              >

                                <option value="">-- Choose from Catalog --</option>

                                {inventoryItems.map((itm) => (

                                  <option key={itm.id} value={itm.id}>

                                    {itm.item_code ? `[${itm.item_code}] ` : ""}

                                    {itm.item_name || itm.name} {itm.uom ? `(${itm.uom})` : ""}

                                  </option>

                                ))}

                              </select>

                              <input

                                type="text"

                                placeholder="Or custom material (e.g. Portland Cement)"

                                className="input text-sm w-full"

                                value={row.resource_name}

                                onChange={(e) =>

                                  updateResourceRow("MATERIAL", index, {

                                    resource_name: e.target.value,

                                  })

                                }

                              />

                            </div>

                            <div className="sm:col-span-3">

                              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-sm">

                                Quantity

                              </label>

                              <input

                                type="number"

                                min="0.01"

                                step="0.01"

                                className="input text-sm w-full"

                                value={row.allocated_qty}

                                onChange={(e) =>

                                  updateResourceRow("MATERIAL", index, {

                                    allocated_qty: e.target.value,

                                  })

                                }

                              />

                            </div>

                            <div className={typeAllocations.MATERIAL.length > 1 ? "sm:col-span-2" : "sm:col-span-3"}>

                              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-sm">

                                UOM

                              </label>

                              <select

                                className="input text-sm w-full"

                                value={row.uom || ""}

                                onChange={(e) =>

                                  updateResourceRow("MATERIAL", index, {

                                    uom: e.target.value,

                                  })

                                }

                              >

                                <option value="">-- UOM --</option>

                                {Array.isArray(uoms) &&

                                  uoms.length > 0 &&

                                  uoms

                                    .filter(

                                      (u) =>

                                        u.is_active !== 0 &&

                                        u.is_active !== false,

                                    )

                                    .map((u) => (

                                      <option

                                        key={u.id || u.uom_code}

                                        value={u.uom_code || u.code}

                                      >

                                        {u.uom_code || u.code}

                                      </option>

                                    ))}

                              </select>

                            </div>

                            {typeAllocations.MATERIAL.length > 1 && (

                              <div className="sm:col-span-1 flex justify-center pb-1">

                                <button

                                  type="button"

                                  onClick={() => removeResourceRow("MATERIAL", index)}

                                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"

                                  title="Remove this material"

                                >

                                  <Trash2 size={15} />

                                </button>

                              </div>

                            )}

                          </div>

                        ))}

                      </div>

                    )}



                    {/* 4. OTHER SECTION */}

                    {selectedTypes.includes("OTHER") && (

                      <div className="space-y-3 pt-1">

                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">

                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">

                            <Box size={14} className="text-purple-600" /> Other Resource

                          </h4>

                          <button

                            type="button"

                            onClick={() => addResourceRow("OTHER")}

                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700"

                          >

                            <Plus size={13} /> Add Another Resource

                          </button>

                        </div>

                        {(typeAllocations.OTHER || []).map((row, index) => (

                          <div key={row.id || index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">

                            <div className={typeAllocations.OTHER.length > 1 ? "sm:col-span-8" : "sm:col-span-8"}>

                              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-sm">

                                Resource Name / Specification {typeAllocations.OTHER.length > 1 ? `#${index + 1}` : ""}{" "}

                                <span className="text-red-500">*</span>

                              </label>

                              <input

                                type="text"

                                placeholder="e.g. Subcontractor Crew, Generator Power, Specialized License"

                                className="input text-sm w-full"

                                value={row.resource_name}

                                onChange={(e) =>

                                  updateResourceRow("OTHER", index, {

                                    resource_name: e.target.value,

                                  })

                                }

                              />

                            </div>

                            <div className={typeAllocations.OTHER.length > 1 ? "sm:col-span-3" : "sm:col-span-4"}>

                              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-sm">

                                Quantity

                              </label>

                              <input

                                type="number"

                                min="1"

                                className="input text-sm w-full"

                                value={row.allocated_qty}

                                onChange={(e) =>

                                  updateResourceRow("OTHER", index, {

                                    allocated_qty: e.target.value,

                                  })

                                }

                              />

                            </div>

                            {typeAllocations.OTHER.length > 1 && (

                              <div className="sm:col-span-1 flex justify-center pb-1">

                                <button

                                  type="button"

                                  onClick={() => removeResourceRow("OTHER", index)}

                                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"

                                  title="Remove this resource"

                                >

                                  <Trash2 size={15} />

                                </button>

                              </div>

                            )}

                          </div>

                        ))}

                      </div>

                    )}

                  </div>

                </div>

              )}



              {/* In EDIT MODE: Single Resource Editing with Unallocate & Active/Inactive */}

              {editingResource && (

                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Resource Type */}

                    <div>

                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">

                        Resource Type <span className="text-red-500">*</span>

                      </label>

                      <select

                        className="input text-sm w-full"

                        value={form.resource_type}

                        onChange={(e) =>

                          setForm((p) => ({

                            ...p,

                            resource_type: e.target.value,

                            pm_equipment_id: "",

                            hr_employee_id: "",

                          }))

                        }

                      >

                        <option value="EQUIPMENT">Equipment</option>

                        <option value="EMPLOYEE">Employee</option>

                        <option value="MATERIAL">Material</option>

                        <option value="OTHER">Other</option>

                      </select>

                    </div>



                    {/* Active State with Validation */}

                    <div>

                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">

                        Resource Active State

                      </label>

                      <div className="flex items-center gap-3 pt-1">

                        <button

                          type="button"

                          onClick={() => {

                            if (

                              Number(form.is_active) === 1 &&

                              form.project_id

                            ) {

                              toast.error(

                                "Cannot set resource to inactive while allocated to a project. Please unallocate the resource from the project first.",

                              );

                              return;

                            }

                            setForm((p) => ({

                              ...p,

                              is_active: p.is_active ? 0 : 1,

                            }));

                          }}

                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition ${

                            Number(form.is_active) === 1

                              ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"

                              : "border-slate-300 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"

                          }`}

                        >

                          {Number(form.is_active) === 1 ? (

                            <>

                              <ToggleRight

                                size={18}

                                className="text-emerald-600"

                              />{" "}

                              Active

                            </>

                          ) : (

                            <>

                              <ToggleLeft

                                size={18}

                                className="text-slate-400"

                              />{" "}

                              Inactive

                            </>

                          )}

                        </button>

                        {form.project_id && Number(form.is_active) === 1 && (

                          <span className="text-xs text-amber-600 inline-flex items-center gap-1">

                            <AlertTriangle size={12} /> Must unallocate before

                            inactivating

                          </span>

                        )}

                      </div>

                    </div>



                    {/* Dynamic Field Based on Resource Type */}

                    {form.resource_type === "EQUIPMENT" && (

                      <div>

                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">

                          Equipment <span className="text-red-500">*</span>

                        </label>

                        <select

                          className="input text-sm w-full"

                          value={form.pm_equipment_id}

                          onChange={(e) => {

                            const selectedId = e.target.value;

                            const eq = equipments.find(

                              (item) => String(item.id) === String(selectedId),

                            );

                            setForm((p) => ({

                              ...p,

                              pm_equipment_id: selectedId,

                              resource_name: eq ? eq.name : p.resource_name,

                            }));

                          }}

                          required

                        >

                          <option value="">

                            -- Select Available Equipment --

                          </option>

                          {availableEquipments.map((eq) => (

                            <option key={eq.id} value={eq.id}>

                              {eq.name}{" "}

                              {eq.description ? `(${eq.description})` : ""}

                            </option>

                          ))}

                        </select>

                      </div>

                    )}



                    {form.resource_type === "EMPLOYEE" && (

                      <div>

                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">

                          Employee <span className="text-red-500">*</span>

                        </label>

                        <select

                          className="input text-sm w-full"

                          value={form.hr_employee_id}

                          onChange={(e) => {

                            const empId = e.target.value;

                            const emp = employees.find(

                              (item) => String(item.id) === String(empId),

                            );

                            setForm((p) => ({

                              ...p,

                              hr_employee_id: empId,

                              resource_name: emp

                                ? getEmployeeFullName(emp)

                                : p.resource_name,

                            }));

                          }}

                          required

                        >

                          <option value="">-- Select Employee --</option>

                          {employees.map((emp) => {

                            const name = getEmployeeFullName(emp);

                            const designation =

                              emp.pos_name || emp.dept_name || emp.designation;

                            return (

                              <option key={emp.id} value={emp.id}>

                                {emp.emp_code ? `${emp.emp_code} - ` : ""}

                                {name}

                                {designation ? ` (${designation})` : ""}

                              </option>

                            );

                          })}

                        </select>

                      </div>

                    )}



                    {/* Resource Name */}

                    <div>

                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">

                        Resource Name <span className="text-red-500">*</span>

                      </label>

                      <input

                        type="text"

                        className="input text-sm w-full"

                        value={form.resource_name}

                        onChange={(e) =>

                          setForm((p) => ({

                            ...p,

                            resource_name: e.target.value,

                          }))

                        }

                        required

                      />

                    </div>



                    {/* Allocated Quantity */}

                    <div>

                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">

                        Allocated Quantity

                      </label>

                      <input

                        type="number"

                        min="0.01"

                        step="0.01"

                        className="input text-sm w-full"

                        value={form.allocated_qty}

                        onChange={(e) =>

                          setForm((p) => ({

                            ...p,

                            allocated_qty: e.target.value,

                          }))

                        }

                      />

                    </div>



                    {form.resource_type === "MATERIAL" && (

                      <div>

                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">

                          Unit of Measure (UOM)

                        </label>

                        <select

                          className="input text-sm w-full"

                          value={form.uom || ""}

                          onChange={(e) =>

                            setForm((p) => ({ ...p, uom: e.target.value }))

                          }

                        >

                          <option value="">-- Select UOM --</option>

                          {Array.isArray(uoms) &&

                            uoms.length > 0 &&

                            uoms

                              .filter(

                                (u) =>

                                  u.is_active !== 0 && u.is_active !== false,

                              )

                              .map((u) => (

                                <option

                                  key={u.id || u.uom_code}

                                  value={u.uom_code || u.code}

                                >

                                  {u.uom_code || u.code}

                                </option>

                              ))}

                        </select>

                      </div>

                    )}



                    {/* Status */}

                    <div>

                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">

                        Allocation Status

                      </label>

                      <select

                        className="input text-sm w-full"

                        value={form.status}

                        onChange={(e) =>

                          setForm((p) => ({ ...p, status: e.target.value }))

                        }

                      >

                        <option value="ALLOCATED">Allocated</option>

                        <option value="IN_USE">In Use</option>

                        <option value="RELEASED">Released</option>

                        <option value="DAMAGED">Damaged</option>

                      </select>

                    </div>

                  </div>

                </div>

              )}



              {/* Common Dates & Remarks */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">

                <div>

                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">

                    Start Date

                  </label>

                  <input

                    type="date"

                    className="input text-sm w-full"

                    value={form.start_date}

                    onChange={(e) =>

                      setForm((p) => ({ ...p, start_date: e.target.value }))

                    }

                  />

                </div>



                <div>

                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">

                    End Date

                  </label>

                  <input

                    type="date"

                    className="input text-sm w-full"

                    value={form.end_date}

                    onChange={(e) =>

                      setForm((p) => ({ ...p, end_date: e.target.value }))

                    }

                  />

                </div>



                <div className="md:col-span-2">

                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">

                    Remarks / Allocation Notes

                  </label>

                  <textarea

                    rows={2}

                    placeholder="Operational instructions, deployment remarks, delivery requirements..."

                    className="input text-sm w-full"

                    value={form.remarks}

                    onChange={(e) =>

                      setForm((p) => ({ ...p, remarks: e.target.value }))

                    }

                  />

                </div>

              </div>



              {/* Modal Footer */}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 -mx-6 -mb-6 p-4">

                <button

                  type="button"

                  onClick={() => setModalOpen(false)}

                  className="btn btn-secondary text-xs"

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  disabled={saving}

                  className="btn btn-primary text-sm font-semibold inline-flex items-center gap-1.5 shadow-sm"

                >

                  {saving && <Loader2 size={14} className="animate-spin" />}

                  {editingResource

                    ? "Save Resource Changes"

                    : "Confirm Resource Allocation"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>

  );

}

