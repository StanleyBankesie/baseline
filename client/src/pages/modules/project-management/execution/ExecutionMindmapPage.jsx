/**
 * @file ExecutionMindmapPage.jsx
 * @description Interactive visual mindmap for collating thoughts, brainstorming execution strategies,
 * mapping prerequisites, anticipating roadblocks, and structuring action steps before execution.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Brain,
  ArrowLeft,
  Plus,
  Trash2,
  Download,
  Copy,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Wrench,
  Target,
  ListTodo,
  Share2,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { toast } from "react-toastify";

// ── Node Categories & Palettes ───────────────────────────────────────────────
const CATEGORIES = {
  OBJECTIVE: {
    label: "Core Objective",
    bg: "bg-purple-50 dark:bg-purple-950/60",
    border: "border-purple-300 dark:border-purple-700",
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300",
    icon: Target,
    color: "#9333ea",
  },
  PREREQUISITE: {
    label: "Prerequisite / Scope",
    bg: "bg-blue-50 dark:bg-blue-950/60",
    border: "border-blue-300 dark:border-blue-700",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
    icon: Layers,
    color: "#2563eb",
  },
  RESOURCE: {
    label: "Equipment & People",
    bg: "bg-emerald-50 dark:bg-emerald-950/60",
    border: "border-emerald-300 dark:border-emerald-700",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300",
    icon: Wrench,
    color: "#059669",
  },
  RISK: {
    label: "Risk / Roadblock",
    bg: "bg-amber-50 dark:bg-amber-950/60",
    border: "border-amber-300 dark:border-amber-700",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300",
    icon: AlertTriangle,
    color: "#d97706",
  },
  ACTION: {
    label: "Action Step",
    bg: "bg-sky-50 dark:bg-sky-950/60",
    border: "border-sky-300 dark:border-sky-700",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300",
    icon: ListTodo,
    color: "#0284c7",
  },
};

// ── Custom Mindmap Node Component ───────────────────────────────────────────
const ThoughtNode = ({ id, data, isConnectable }) => {
  const cat = CATEGORIES[data.category] || CATEGORIES.OBJECTIVE;
  const Icon = cat.icon;

  return (
    <div
      className={`p-3.5 rounded-2xl border-2 shadow-md transition-all duration-200 min-w-[200px] max-w-[280px] ${cat.bg} ${cat.border} ${
        data.selected ? "ring-2 ring-brand-600 shadow-xl" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-slate-400 dark:!bg-slate-600 !border-2 !border-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-slate-400 dark:!bg-slate-600 !border-2 !border-white"
      />

      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cat.badge}`}>
          <Icon size={11} /> {cat.label}
        </span>
        {data.onDelete && data.id !== "root" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete(id);
            }}
            className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800"
            title="Delete Thought"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="space-y-1">
        <p className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
          {data.label || "Thought node"}
        </p>
        {data.description && (
          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3">
            {data.description}
          </p>
        )}
      </div>

      {data.onAddChild && (
        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center text-[11px]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onAddChild(id, data.category);
            }}
            className="inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300 hover:underline"
          >
            <Plus size={12} /> Add Child Idea
          </button>
          {data.itemsCount ? (
            <span className="font-mono text-[10px] text-slate-400">{data.itemsCount} notes</span>
          ) : null}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-slate-400 dark:!bg-slate-600 !border-2 !border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={isConnectable}
        className="!w-3 !h-3 !bg-slate-400 dark:!bg-slate-600 !border-2 !border-white"
      />
    </div>
  );
};

const nodeTypes = {
  thought: ThoughtNode,
};

// ── Default Mindmap Starter Template ────────────────────────────────────────
const getInitialTemplate = (taskTitle = "Task Execution Plan") => {
  const rootId = "root";
  const nodes = [
    {
      id: rootId,
      type: "thought",
      position: { x: 380, y: 50 },
      data: {
        id: rootId,
        category: "OBJECTIVE",
        label: taskTitle,
        description: "Core objective & execution vision for this work item",
      },
    },
    {
      id: "node_prereq",
      type: "thought",
      position: { x: 80, y: 220 },
      data: {
        category: "PREREQUISITE",
        label: "Permits, Approvals & Drawing Signoffs",
        description: "Confirm all technical RFIs, client permits and gate signoffs are in place before site work.",
      },
    },
    {
      id: "node_resources",
      type: "thought",
      position: { x: 380, y: 240 },
      data: {
        category: "RESOURCE",
        label: "Materials & Equipment Allocation",
        description: "Requisition required plant, stock from warehouse, and assign skilled tradesmen.",
      },
    },
    {
      id: "node_risks",
      type: "thought",
      position: { x: 680, y: 220 },
      data: {
        category: "RISK",
        label: "Anticipated Delays & Weather Risks",
        description: "Identify supply chain lag, weather hold points, and safety hazards beforehand.",
      },
    },
    {
      id: "node_action",
      type: "thought",
      position: { x: 230, y: 400 },
      data: {
        category: "ACTION",
        label: "Mobilization & Daily Briefing",
        description: "Toolbox talk, handover of scope checklists to crew leads, work log commencement.",
      },
    },
    {
      id: "node_action2",
      type: "thought",
      position: { x: 530, y: 400 },
      data: {
        category: "ACTION",
        label: "Quality Inspection & Handover",
        description: "Perform QA/QC verification checklist before marking task complete.",
      },
    },
  ];

  const edges = [
    {
      id: "e-root-prereq",
      source: rootId,
      target: "node_prereq",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#9333ea" },
      style: { stroke: "#9333ea", strokeWidth: 2 },
    },
    {
      id: "e-root-resources",
      source: rootId,
      target: "node_resources",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#9333ea" },
      style: { stroke: "#9333ea", strokeWidth: 2 },
    },
    {
      id: "e-root-risks",
      source: rootId,
      target: "node_risks",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#9333ea" },
      style: { stroke: "#9333ea", strokeWidth: 2 },
    },
    {
      id: "e-prereq-action",
      source: "node_prereq",
      target: "node_action",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#2563eb" },
      style: { stroke: "#2563eb", strokeWidth: 1.5 },
    },
    {
      id: "e-resources-action",
      source: "node_resources",
      target: "node_action2",
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#059669" },
      style: { stroke: "#059669", strokeWidth: 1.5 },
    },
  ];

  return { nodes, edges };
};

export default function ExecutionMindmapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTaskId = searchParams.get("taskId") || "";
  const initialProjectId = searchParams.get("projectId") || "";

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId);

  // Modal / Side Form for Adding / Editing Node
  const [modalOpen, setModalOpen] = useState(false);
  const [activeNode, setActiveNode] = useState(null);
  const [nodeTitle, setNodeTitle] = useState("");
  const [nodeDesc, setNodeDesc] = useState("");
  const [nodeCategory, setNodeCategory] = useState("ACTION");
  const [parentIdForNewNode, setParentIdForNewNode] = useState(null);

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Storage key
  const storageKey = useMemo(() => {
    return `omni_mindmap_${selectedProjectId || "global"}_${selectedTaskId || "root"}`;
  }, [selectedProjectId, selectedTaskId]);

  // Load Projects
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/projects/projects", { params: { active: "all" } });
        setProjects(res.data?.items || []);
      } catch (err) {
        console.error("Failed to load projects", err);
      }
    })();
  }, []);

  // Load Tasks when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      return;
    }
    (async () => {
      try {
        const res = await api.get("/projects/tasks", { params: { project_id: selectedProjectId, active: "all" } });
        setTasks(res.data?.items || res.data?.tasks || []);
      } catch (err) {
        console.error("Failed to load tasks", err);
      }
    })();
  }, [selectedProjectId]);

  // Delete node handler
  const handleDeleteNode = useCallback(
    (id) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      toast.info("Thought node removed");
    },
    [setNodes, setEdges]
  );

  // Add child thought handler
  const handleAddChild = useCallback(
    (parentId, parentCategory) => {
      setParentIdForNewNode(parentId);
      setActiveNode(null);
      setNodeTitle("");
      setNodeDesc("");
      // Default to Action or next intuitive category
      setNodeCategory(parentCategory === "RISK" ? "ACTION" : parentCategory === "OBJECTIVE" ? "PREREQUISITE" : "ACTION");
      setModalOpen(true);
    },
    []
  );

  // Enhance nodes with deletion/child callbacks
  const enhanceNodes = useCallback(
    (rawNodes) => {
      return rawNodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onDelete: handleDeleteNode,
          onAddChild: handleAddChild,
        },
      }));
    },
    [handleDeleteNode, handleAddChild]
  );

  // Load mindmap data from localStorage or fallback to template
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.nodes && parsed.edges) {
          setNodes(enhanceNodes(parsed.nodes));
          setEdges(parsed.edges);
          return;
        }
      } catch (e) {
        console.error("Error parsing saved mindmap", e);
      }
    }

    // Default template
    const currentTask = tasks.find((t) => String(t.id) === String(selectedTaskId));
    const title = currentTask ? currentTask.task_title || currentTask.title : "Pre-Execution Strategy";
    const initial = getInitialTemplate(title);
    setNodes(enhanceNodes(initial.nodes));
    setEdges(initial.edges);
  }, [storageKey, enhanceNodes, tasks, selectedTaskId, setNodes, setEdges]);

  // Save mindmap to localStorage whenever nodes/edges change
  const saveMindmap = useCallback(() => {
    const payload = {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          id: n.data.id,
          category: n.data.category,
          label: n.data.label,
          description: n.data.description,
        },
      })),
      edges,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [nodes, edges, storageKey]);

  useEffect(() => {
    if (nodes.length > 0) {
      saveMindmap();
    }
  }, [nodes, edges, saveMindmap]);

  // Connect edges
  const onConnect = useCallback(
    (params) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
            style: { stroke: "#64748b", strokeWidth: 1.5 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Save node from modal
  const handleSaveModal = () => {
    if (!nodeTitle.trim()) {
      toast.error("Please enter a title for your thought");
      return;
    }

    if (activeNode) {
      // Edit existing
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === activeNode.id) {
            return {
              ...n,
              data: {
                ...n.data,
                label: nodeTitle.trim(),
                description: nodeDesc.trim(),
                category: nodeCategory,
              },
            };
          }
          return n;
        })
      );
      toast.success("Thought updated");
    } else {
      // Create new node
      const newId = `node_${Date.now()}`;
      const parentNode = nodes.find((n) => n.id === parentIdForNewNode);

      const newPosition = parentNode
        ? { x: parentNode.position.x + (Math.random() * 80 - 40), y: parentNode.position.y + 160 }
        : { x: 300 + Math.random() * 60, y: 250 + Math.random() * 60 };

      const newNode = {
        id: newId,
        type: "thought",
        position: newPosition,
        data: {
          id: newId,
          category: nodeCategory,
          label: nodeTitle.trim(),
          description: nodeDesc.trim(),
          onDelete: handleDeleteNode,
          onAddChild: handleAddChild,
        },
      };

      setNodes((nds) => [...nds, newNode]);

      if (parentIdForNewNode) {
        const cat = CATEGORIES[nodeCategory] || CATEGORIES.OBJECTIVE;
        const newEdge = {
          id: `e-${parentIdForNewNode}-${newId}`,
          source: parentIdForNewNode,
          target: newId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: cat.color },
          style: { stroke: cat.color, strokeWidth: 2 },
        };
        setEdges((eds) => [...eds, newEdge]);
      }

      toast.success("New thought node added to mindmap");
    }

    setModalOpen(false);
    setActiveNode(null);
    setParentIdForNewNode(null);
  };

  // Convert thoughts to checklist text for copying
  const copyThoughtsToClipboard = () => {
    const lines = [];
    lines.push(`🧠 PRE-EXECUTION MINDMAP THOUGHTS & SCOPE:`);
    lines.push(`Project: ${projects.find((p) => String(p.id) === String(selectedProjectId))?.project_name || "General"}`);
    lines.push("");

    Object.keys(CATEGORIES).forEach((catKey) => {
      const catNodes = nodes.filter((n) => n.data.category === catKey);
      if (catNodes.length > 0) {
        lines.push(`[${CATEGORIES[catKey].label.toUpperCase()}]:`);
        catNodes.forEach((cn) => {
          lines.push(`  • ${cn.data.label}${cn.data.description ? ` — ${cn.data.description}` : ""}`);
        });
        lines.push("");
      }
    });

    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Mindmap thoughts copied to clipboard! Ready to paste into task checklist or notes.");
  };

  // Reset mindmap to clean structure
  const resetMindmap = () => {
    if (window.confirm("Reset mindmap thoughts to initial planning structure?")) {
      const currentTask = tasks.find((t) => String(t.id) === String(selectedTaskId));
      const title = currentTask ? currentTask.task_title || currentTask.title : "Pre-Execution Strategy";
      const initial = getInitialTemplate(title);
      setNodes(enhanceNodes(initial.nodes));
      setEdges(initial.edges);
      toast.info("Mindmap layout reset");
    }
  };

  return (
    <div className="space-y-4">
      {/* Canonical Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/project-management" className="btn btn-secondary inline-flex items-center gap-1.5">
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
              <Brain size={26} className="text-purple-600 dark:text-purple-400" />
              Pre-Execution Mindmap &amp; Thought Canvas
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Collate thoughts, brainstorm work strategies, anticipate roadblocks, and map prerequisites before executing
            </p>
          </div>
        </div>

        {/* Project & Task Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            className="input text-xs h-10 rounded-xl min-w-[200px]"
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setSelectedTaskId("");
              setSearchParams({ projectId: e.target.value });
            }}
          >
            <option value="">— General / All Projects —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_code ? `${p.project_code} - ` : ""}
                {p.project_name || p.name}
              </option>
            ))}
          </select>

          {tasks.length > 0 && (
            <select
              className="input text-xs h-10 rounded-xl min-w-[200px]"
              value={selectedTaskId}
              onChange={(e) => {
                setSelectedTaskId(e.target.value);
                setSearchParams({ projectId: selectedProjectId, taskId: e.target.value });
              }}
            >
              <option value="">— Select Specific Task (Optional) —</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.wbs_code ? `${t.wbs_code} ` : ""}
                  {t.task_title || t.title}
                </option>
              ))}
            </select>
          )}

          <Link
            to="/project-management/tasks/execution"
            className="btn btn-primary inline-flex items-center gap-1.5 h-10 text-xs px-3.5 rounded-xl"
            title="Go to Task Execution Dashboard"
          >
            <ListTodo size={15} /> Execution Dashboard
          </Link>
        </div>
      </div>

      {/* Mindmap Toolbar & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveNode(null);
              setParentIdForNewNode("root");
              setNodeTitle("");
              setNodeDesc("");
              setNodeCategory("ACTION");
              setModalOpen(true);
            }}
            className="btn btn-primary inline-flex items-center gap-1.5 text-xs h-9 px-3.5 rounded-xl shadow-sm"
          >
            <Plus size={15} /> Add Thought Node
          </button>

          <button
            type="button"
            onClick={copyThoughtsToClipboard}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs h-9 px-3 rounded-xl"
            title="Copy all thoughts formatted as a checklist"
          >
            <Copy size={14} /> Copy to Checklist
          </button>

          <button
            type="button"
            onClick={resetMindmap}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-xs h-9 px-3 rounded-xl"
            title="Reset to template"
          >
            <RefreshCw size={13} /> Reset Canvas
          </button>
        </div>

        {/* Categories Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
          <span className="font-bold text-slate-700 dark:text-slate-300">Branches:</span>
          {Object.entries(CATEGORIES).map(([k, cat]) => (
            <span
              key={k}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold ${cat.badge}`}
            >
              <cat.icon size={11} /> {cat.label}
            </span>
          ))}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner h-[620px] relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => {
            setActiveNode(node);
            setNodeTitle(node.data.label || "");
            setNodeDesc(node.data.description || "");
            setNodeCategory(node.data.category || "OBJECTIVE");
            setParentIdForNewNode(null);
            setModalOpen(true);
          }}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="#94a3b8" gap={18} size={1} />
          <Controls className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !rounded-xl !shadow-md" />
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(n) => CATEGORIES[n.data?.category]?.color || "#cbd5e1"}
            className="!bg-white/90 dark:!bg-slate-900/90 !rounded-xl !border-slate-200 dark:!border-slate-800"
          />
        </ReactFlow>

        <div className="absolute bottom-3 left-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 shadow-sm pointer-events-none">
          💡 Click any node to edit • Click <strong className="text-brand-900 dark:text-brand-300">Add Child Idea</strong> on a card to branch out thoughts • Drag connection handles to link nodes
        </div>
      </div>

      {/* Add / Edit Thought Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 animate-fadeIn"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Brain size={18} className="text-purple-600" />
                {activeNode ? "Edit Thought Node" : "Add Thought to Canvas"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Thought Category / Branch
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(CATEGORIES).map(([k, cat]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setNodeCategory(k)}
                      className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all text-left ${
                        nodeCategory === k
                          ? "ring-2 ring-brand-600 bg-brand-50 dark:bg-brand-950/40 border-brand-300"
                          : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                      }`}
                    >
                      <cat.icon size={13} style={{ color: cat.color }} />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Thought / Objective Title *
                </label>
                <input
                  type="text"
                  className="input w-full text-xs"
                  placeholder="e.g. Ensure Crane Inspection Certificate signed off"
                  value={nodeTitle}
                  onChange={(e) => setNodeTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Details / Brainstorming Notes (Optional)
                </label>
                <textarea
                  className="input w-full text-xs"
                  rows={3}
                  placeholder="Describe prerequisites, who to call, specific checklist items, contingency ideas..."
                  value={nodeDesc}
                  onChange={(e) => setNodeDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                className="btn btn-secondary text-xs h-9 px-4 rounded-xl"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary text-xs h-9 px-4 rounded-xl flex items-center gap-1.5"
                onClick={handleSaveModal}
              >
                <CheckCircle2 size={14} /> Save Thought
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
