/**
 * @file ProjectMindmapPage.jsx
 * @description Interactive visual mindmap for collating thoughts, brainstorming execution strategies,
 * mapping prerequisites, anticipating roadblocks, and structuring action steps.
 * Features:
 * - Empty fields by default when opened or project selected unless user has created and saved
 * - Mindmaps saved strictly per user and per project (isolated by user ID & project ID)
 * - Restores saved project mindmap specifically for that user upon selecting the project
 * - Direct inline editing on node cards (becomes white/editable only on click)
 * - Rename title and edit description directly on each node
 * - Add or remove category tags on any node card (including Core Objective)
 * - Create custom project categories with customizable color palettes
 * - Remove categories from the project options
 * - Direct "+ Add Child Idea" button to branch out thoughts immediately
 * - Branch expand / collapse toggles with hidden child counters
 * - Sub-branch removal and clean tree auto-alignment
 * - Export thoughts as a formatted execution checklist/deliverables
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
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Wrench,
  Target,
  ListTodo,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  Undo2,
  Redo2,
  GitBranch,
  FolderGit2,
  X,
  Tag,
  Save,
} from "lucide-react";
import { api } from "../../../../api/client.js";
import { useAuth } from "@/auth/AuthContext.jsx";
import { toast } from "react-toastify";

// ── Default Node Categories & Palettes ───────────────────────────────────────
export const DEFAULT_CATEGORIES = {
  OBJECTIVE: {
    label: "Core Objective",
    bg: "bg-purple-50/90 dark:bg-purple-950/60",
    border: "border-purple-300 dark:border-purple-700",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    color: "#9333ea",
  },
  PREREQUISITE: {
    label: "Prerequisite / Scope",
    bg: "bg-blue-50/90 dark:bg-blue-950/60",
    border: "border-blue-300 dark:border-blue-700",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    color: "#2563eb",
  },
  RESOURCE: {
    label: "Equipment & People",
    bg: "bg-emerald-50/90 dark:bg-emerald-950/60",
    border: "border-emerald-300 dark:border-emerald-700",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    color: "#059669",
  },
  RISK: {
    label: "Risk / Roadblock",
    bg: "bg-amber-50/90 dark:bg-amber-950/60",
    border: "border-amber-300 dark:border-amber-700",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    color: "#d97706",
  },
  ACTION: {
    label: "Action Step",
    bg: "bg-sky-50/90 dark:bg-sky-950/60",
    border: "border-sky-300 dark:border-sky-700",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
    color: "#0284c7",
  },
};

// Fallback style when a card has no category tag
const NO_CATEGORY_STYLE = {
  label: "Uncategorized",
  bg: "bg-slate-50/90 dark:bg-slate-900/60",
  border: "border-slate-300 dark:border-slate-700",
  badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  color: "#64748b",
};

// Color presets for custom category creator
const COLOR_PRESETS = [
  { name: "Purple", hex: "#9333ea", bg: "bg-purple-50/90 dark:bg-purple-950/60", border: "border-purple-300 dark:border-purple-700", badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  { name: "Blue", hex: "#2563eb", bg: "bg-blue-50/90 dark:bg-blue-950/60", border: "border-blue-300 dark:border-blue-700", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  { name: "Emerald", hex: "#059669", bg: "bg-emerald-50/90 dark:bg-emerald-950/60", border: "border-emerald-300 dark:border-emerald-700", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  { name: "Amber", hex: "#d97706", bg: "bg-amber-50/90 dark:bg-amber-950/60", border: "border-amber-300 dark:border-amber-700", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  { name: "Sky", hex: "#0284c7", bg: "bg-sky-50/90 dark:bg-sky-950/60", border: "border-sky-300 dark:border-sky-700", badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border-sky-200 dark:border-sky-800" },
  { name: "Rose", hex: "#e11d48", bg: "bg-rose-50/90 dark:bg-rose-950/60", border: "border-rose-300 dark:border-rose-700", badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-200 dark:border-rose-800" },
  { name: "Indigo", hex: "#4f46e5", bg: "bg-indigo-50/90 dark:bg-indigo-950/60", border: "border-indigo-300 dark:border-indigo-700", badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800" },
  { name: "Teal", hex: "#0d9488", bg: "bg-teal-50/90 dark:bg-teal-950/60", border: "border-teal-300 dark:border-teal-700", badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 border-teal-200 dark:border-teal-800" },
];

// ── Custom Mindmap Node Component with Inline Editing & Category Add/Remove ─
const ThoughtNode = ({ id, data, isConnectable }) => {
  const categories = data.categories || DEFAULT_CATEGORIES;
  const hasCategory = Boolean(data.category && categories[data.category]);
  const cat = hasCategory ? categories[data.category] : null;
  const cardStyle = cat || NO_CATEGORY_STYLE;

  const isRoot = id === "root" || data.id === "root";
  const hasChildren = (data.childCount || 0) > 0;
  const isCollapsed = Boolean(data.isCollapsed);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [titleValue, setTitleValue] = useState(data.label || "");
  const [descValue, setDescValue] = useState(data.description || "");

  useEffect(() => {
    setTitleValue(data.label || "");
  }, [data.label]);

  useEffect(() => {
    setDescValue(data.description || "");
  }, [data.description]);

  return (
    <div
      className={`p-3.5 rounded-2xl border-2 shadow-md transition-all duration-200 min-w-[230px] max-w-[310px] ${cardStyle.bg} ${cardStyle.border} ${
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

      {/* Header: Category Badge with Add / Remove support & Actions */}
      <div className="flex items-center justify-between mb-2 gap-2">
        {hasCategory ? (
          <div className="flex items-center gap-1 group/cat">
            <div className="relative">
              <select
                value={data.category || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__REMOVE__") {
                    data.onUpdateCategory?.(id, null);
                  } else if (val === "__NEW__") {
                    data.onAddNewCategory?.(id);
                  } else {
                    data.onUpdateCategory?.(id, val);
                  }
                }}
                className={`nodrag text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500 appearance-none pr-4 ${cat.badge}`}
                title="Change or remove category"
              >
                {Object.entries(categories).map(([k, c]) => (
                  <option
                    key={k}
                    value={k}
                    className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 normal-case font-medium"
                  >
                    {c.label}
                  </option>
                ))}
                <option value="__NEW__" className="bg-white dark:bg-slate-900 text-brand-600 font-semibold">
                  + Create New Category...
                </option>
              </select>
              <ChevronDown
                size={10}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60"
              />
            </div>

            {/* Quick Remove (X) button on the marked category area */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onUpdateCategory?.(id, null);
              }}
              className="nodrag text-slate-400 hover:text-rose-500 hover:bg-black/5 dark:hover:bg-white/10 rounded p-0.5 transition-colors"
              title="Remove category tag from this card"
            >
              <X size={11} />
            </button>
          </div>
        ) : (
          /* When category is removed: offer intuitive "+ Add Category" button */
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const firstKey = Object.keys(categories)[0] || "ACTION";
                data.onUpdateCategory?.(id, firstKey);
              }}
              className="nodrag text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-300 border border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-400 rounded-full px-2 py-0.5 inline-flex items-center gap-1 transition-all"
              title="Add a category tag to this card"
            >
              <Plus size={10} />
              <span>Add Category</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* Expand / Collapse Button if this node has child branches */}
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onToggleCollapse?.(id);
              }}
              className="nodrag text-xs px-1.5 py-0.5 rounded-md font-bold text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center gap-1 transition-all"
              title={isCollapsed ? `Expand ${data.childCount} sub-branches` : "Collapse sub-branches"}
            >
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span className="text-[10px]">{data.childCount}</span>
            </button>
          )}

          {/* Delete Branch Button */}
          {!isRoot && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                data.onDelete?.(id);
              }}
              className="nodrag text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800"
              title="Delete this branch and its sub-branches"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Editable Title: Clean text by default, becomes white and editable ONLY when clicked */}
      <div className="space-y-1">
        {isEditingTitle ? (
          <input
            type="text"
            autoFocus
            value={titleValue}
            onChange={(e) => {
              setTitleValue(e.target.value);
              data.onUpdateLabel?.(id, e.target.value);
            }}
            onBlur={() => {
              setIsEditingTitle(false);
              data.onUpdateLabel?.(id, titleValue.trim());
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setIsEditingTitle(false);
                data.onUpdateLabel?.(id, titleValue.trim());
              }
            }}
            placeholder="Branch title..."
            className="nodrag w-full bg-white dark:bg-slate-900 border-2 border-brand-500 shadow-md ring-2 ring-brand-500/20 font-semibold text-xs text-slate-900 dark:text-white rounded-lg px-2.5 py-1.5 focus:outline-none transition-all"
          />
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation();
              data.onBeginEdit?.();
              setIsEditingTitle(true);
            }}
            className="nodrag font-bold text-xs text-slate-900 dark:text-white px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors break-words leading-snug min-h-[24px]"
            title="Click to edit title"
          >
            {data.label ? (
              data.label
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic font-normal text-xs">
                Click to enter title...
              </span>
            )}
          </div>
        )}

        {/* Editable Description: Clean text by default, becomes white and editable ONLY when clicked */}
        {isEditingDesc ? (
          <textarea
            autoFocus
            rows={2}
            value={descValue}
            onChange={(e) => {
              setDescValue(e.target.value);
              data.onUpdateDescription?.(id, e.target.value);
            }}
            onBlur={() => {
              setIsEditingDesc(false);
              data.onUpdateDescription?.(id, descValue.trim());
            }}
            placeholder="Add details / notes (optional)..."
            className="nodrag w-full bg-white dark:bg-slate-900 border-2 border-brand-500 shadow-md ring-2 ring-brand-500/20 text-[11px] text-slate-700 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none resize-none transition-all"
          />
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation();
              data.onBeginEdit?.();
              setIsEditingDesc(true);
            }}
            className="nodrag text-[11px] text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors break-words leading-relaxed min-h-[20px]"
            title="Click to edit details"
          >
            {data.description ? (
              data.description
            ) : (
              <span className="text-slate-400 dark:text-slate-500 italic text-[10px]">
                + Add details / notes...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Direct "+ Add Child Idea" button */}
      <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center text-[11px]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data.onAddChild?.(id, data.category);
          }}
          className="nodrag inline-flex items-center gap-1 font-semibold text-brand-700 dark:text-brand-300 hover:text-brand-900 dark:hover:text-brand-100 hover:underline transition-colors"
          title="Add a child idea connected to this node"
        >
          <Plus size={12} className="stroke-[2.5]" />
          <span>Add Child Idea</span>
        </button>

        {isCollapsed && (
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300/80 dark:border-amber-800">
            {data.childCount} hidden
          </span>
        )}
      </div>

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

// Stable nodeTypes definition outside the component to prevent unmounting while typing
const nodeTypes = {
  thought: ThoughtNode,
};

// ── Clean Starter Template with EMPTY fields (no dummy text!) ────────────────
const getCleanRootTemplate = (title = "") => {
  const rootId = "root";
  return {
    nodes: [
      {
        id: rootId,
        type: "thought",
        position: { x: 440, y: 100 },
        data: {
          id: rootId,
          category: "OBJECTIVE",
          label: title || "", // Project title or empty string
          description: "", // Completely empty
        },
      },
    ],
    edges: [],
  };
};

export default function ProjectMindmapPage() {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.sub || user?.username || "default_user";
  const currentUserName = user?.username || user?.full_name || user?.name || "User";

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTaskId = searchParams.get("taskId") || "";
  const initialProjectId = searchParams.get("projectId") || "";

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId);

  // Dynamic Categories state
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColorIdx, setNewCatColorIdx] = useState(0);
  const [targetNodeForNewCat, setTargetNodeForNewCat] = useState(null);

  // ReactFlow state (raw nodes & edges)
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Track if current project has a saved mindmap for this user
  const [isSavedForUser, setIsSavedForUser] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Multi-mindmap provisions per project
  const [projectMindmaps, setProjectMindmaps] = useState([]);
  const [currentMindmapId, setCurrentMindmapId] = useState(null);
  const [currentMindmapTitle, setCurrentMindmapTitle] = useState("");

  // Set of node IDs whose child branches are collapsed
  const [collapsedNodeIds, setCollapsedNodeIds] = useState(new Set());

  // History stacks for Undo / Redo (Move back to previous change)
  const historyRef = useRef([]);
  const futureRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showCanvasCategories, setShowCanvasCategories] = useState(true);

  // Take snapshot of current mindmap canvas before mutations
  const takeSnapshot = useCallback(() => {
    if (nodes.length === 0) return;
    const snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      categories: JSON.parse(JSON.stringify(categories)),
    };
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    }
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [nodes, edges, categories]);

  // Undo: Move back to previous change
  const handleUndo = useCallback(() => {
    if (historyRef.current.length === 0) return;
    const previous = historyRef.current.pop();
    const current = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      categories: JSON.parse(JSON.stringify(categories)),
    };
    futureRef.current.push(current);

    setNodes(previous.nodes);
    setEdges(previous.edges);
    if (previous.categories) {
      setCategories(previous.categories);
    }
    setHasUnsavedChanges(true);
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(true);
    toast.info("Moved back to previous change");
  }, [nodes, edges, categories, setNodes, setEdges]);

  // Redo: Move forward to next change
  const handleRedo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop();
    const current = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      categories: JSON.parse(JSON.stringify(categories)),
    };
    historyRef.current.push(current);

    setNodes(next.nodes);
    setEdges(next.edges);
    if (next.categories) {
      setCategories(next.categories);
    }
    setHasUnsavedChanges(true);
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    toast.info("Moved forward to next change");
  }, [nodes, edges, categories, setNodes, setEdges]);

  // Global Keyboard shortcuts (Ctrl+Z / Cmd+Z, Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Storage key helpers for multi-mindmap support per project & user
  const getProjectIndexKey = useCallback((userId, projId) => {
    return `omni_mindmaps_index_u${userId}_p${projId}`;
  }, []);

  const getMindmapDataKey = useCallback((userId, projId, mmId) => {
    return `omni_mindmap_data_u${userId}_p${projId}_m${mmId}`;
  }, []);

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

  // Helper to load a specific mindmap by its ID
  const loadMindmapById = useCallback((mmId, mmTitle) => {
    if (!selectedProjectId) return;
    const dataKey = getMindmapDataKey(currentUserId, selectedProjectId, mmId);
    const raw = localStorage.getItem(dataKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.nodes && parsed.nodes.length > 0) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges || []);
          if (Array.isArray(parsed.collapsed)) {
            setCollapsedNodeIds(new Set(parsed.collapsed));
          } else {
            setCollapsedNodeIds(new Set());
          }
          if (parsed.categories && typeof parsed.categories === "object" && Object.keys(parsed.categories).length > 0) {
            setCategories(parsed.categories);
          } else {
            setCategories(DEFAULT_CATEGORIES);
          }
          setCurrentMindmapId(mmId);
          setCurrentMindmapTitle(parsed.title || mmTitle || "Mindmap");
          setIsSavedForUser(true);
          setHasUnsavedChanges(false);
          historyRef.current = [];
          futureRef.current = [];
          setCanUndo(false);
          setCanRedo(false);
          return;
        }
      } catch (e) {
        console.error("Error loading mindmap data", e);
      }
    }

    // Fallback: blank starter with empty fields
    setCurrentMindmapId(mmId);
    setCurrentMindmapTitle(mmTitle || "Mindmap");
    const starter = getCleanRootTemplate(mmTitle || "");
    setNodes(starter.nodes);
    setEdges(starter.edges);
    setCollapsedNodeIds(new Set());
    setCategories(DEFAULT_CATEGORIES);
    setIsSavedForUser(false);
    setHasUnsavedChanges(false);
    historyRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, [selectedProjectId, currentUserId, getMindmapDataKey, setNodes, setEdges]);

  // Load project mindmaps index when project changes
  useEffect(() => {
    historyRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);

    if (!selectedProjectId) {
      setProjectMindmaps([]);
      setCurrentMindmapId(null);
      setCurrentMindmapTitle("");
      const cleanStarter = getCleanRootTemplate("");
      setNodes(cleanStarter.nodes);
      setEdges(cleanStarter.edges);
      setCollapsedNodeIds(new Set());
      setCategories(DEFAULT_CATEGORIES);
      setIsSavedForUser(false);
      setHasUnsavedChanges(false);
      return;
    }

    const indexKey = getProjectIndexKey(currentUserId, selectedProjectId);
    let indexData = [];
    try {
      const rawIndex = localStorage.getItem(indexKey);
      if (rawIndex) {
        indexData = JSON.parse(rawIndex) || [];
      }
    } catch (err) {
      console.error("Failed to parse mindmaps index", err);
    }

    // Legacy migration check: check for single saved mindmap under old key
    const legacyKey = `omni_mindmap_u${currentUserId}_p${selectedProjectId}_troot`;
    const legacyGeneralKey = `omni_mindmap_u${currentUserId}_p${selectedProjectId}_t`;
    const rawLegacy = localStorage.getItem(legacyKey) || localStorage.getItem(legacyGeneralKey);
    if (rawLegacy && (!indexData || indexData.length === 0)) {
      try {
        const parsedLegacy = JSON.parse(rawLegacy);
        const legacyId = "mm_primary";
        const legacyTitle = parsedLegacy.title || "Primary Mindmap";
        indexData = [
          {
            id: legacyId,
            title: legacyTitle,
            createdAt: parsedLegacy.savedAt || new Date().toISOString(),
            updatedAt: parsedLegacy.savedAt || new Date().toISOString(),
          },
        ];
        localStorage.setItem(indexKey, JSON.stringify(indexData));
        localStorage.setItem(
          getMindmapDataKey(currentUserId, selectedProjectId, legacyId),
          JSON.stringify({ ...parsedLegacy, id: legacyId, title: legacyTitle })
        );
      } catch (e) {
        console.error("Legacy migration error", e);
      }
    }

    setProjectMindmaps(indexData);

    if (indexData.length > 0) {
      const first = indexData[0];
      loadMindmapById(first.id, first.title);
    } else {
      // No mindmaps saved yet for this project: initialize a fresh mindmap #1 ready to create & save
      const currentProject = projects.find((p) => String(p.id) === String(selectedProjectId));
      const defaultTitle = currentProject?.project_name ? `${currentProject.project_name} - Strategy` : "Main Mindmap";
      const newId = `mm_${Date.now()}`;
      setCurrentMindmapId(newId);
      setCurrentMindmapTitle(defaultTitle);
      const cleanStarter = getCleanRootTemplate(currentProject?.project_name || "");
      setNodes(cleanStarter.nodes);
      setEdges(cleanStarter.edges);
      setCollapsedNodeIds(new Set());
      setCategories(DEFAULT_CATEGORIES);
      setIsSavedForUser(false);
      setHasUnsavedChanges(false);
    }
  }, [selectedProjectId, currentUserId, projects, getProjectIndexKey, getMindmapDataKey, loadMindmapById, setNodes, setEdges]);

  // Create an additional new mindmap for the current project
  const handleCreateNewMindmap = useCallback(() => {
    if (!selectedProjectId) {
      toast.warn("Please select a project before creating a mindmap.");
      return;
    }
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes in the current mindmap. Discard and create a new mindmap?")) {
        return;
      }
    }
    const currentProject = projects.find((p) => String(p.id) === String(selectedProjectId));
    const newNum = (projectMindmaps.length || 0) + 1;
    const newTitle = `Mindmap ${newNum}`;
    const newId = `mm_${Date.now()}`;
    setCurrentMindmapId(newId);
    setCurrentMindmapTitle(newTitle);
    const starter = getCleanRootTemplate(currentProject?.project_name ? `${currentProject.project_name} - ${newTitle}` : newTitle);
    setNodes(starter.nodes);
    setEdges(starter.edges);
    setCollapsedNodeIds(new Set());
    setCategories(DEFAULT_CATEGORIES);
    setIsSavedForUser(false);
    setHasUnsavedChanges(true); // Ready to be saved
    historyRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    toast.info(`New mindmap "${newTitle}" created for project. Build your ideas and click Save Mindmap!`);
  }, [selectedProjectId, hasUnsavedChanges, projectMindmaps.length, projects, setNodes, setEdges]);

  // Save mindmap handler (STRICTLY requires selected project and saves against that project)
  const handleSaveMindmap = useCallback(() => {
    if (!selectedProjectId) {
      toast.warn("Please select a project before saving the mindmap.");
      return;
    }
    if (nodes.length === 0) return;

    const mmId = currentMindmapId || `mm_${Date.now()}`;
    const mmTitle = (currentMindmapTitle || "").trim() || `Mindmap ${(projectMindmaps.length || 0) + 1}`;

    const payload = {
      id: mmId,
      title: mmTitle,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          id: n.data.id,
          category: n.data.category,
          label: n.data.label || "",
          description: n.data.description || "",
        },
      })),
      edges,
      collapsed: Array.from(collapsedNodeIds),
      categories,
      savedAt: new Date().toISOString(),
      savedBy: currentUserId,
      projectId: selectedProjectId,
      taskId: selectedTaskId || "root",
    };

    // 1. Save data payload
    const dataKey = getMindmapDataKey(currentUserId, selectedProjectId, mmId);
    localStorage.setItem(dataKey, JSON.stringify(payload));

    // 2. Update project mindmaps index
    const indexKey = getProjectIndexKey(currentUserId, selectedProjectId);
    let updatedIndex = [...projectMindmaps];
    const existingIdx = updatedIndex.findIndex((m) => m.id === mmId);
    if (existingIdx >= 0) {
      updatedIndex[existingIdx] = {
        ...updatedIndex[existingIdx],
        title: mmTitle,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updatedIndex.push({
        id: mmId,
        title: mmTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(indexKey, JSON.stringify(updatedIndex));

    setProjectMindmaps(updatedIndex);
    setCurrentMindmapId(mmId);
    setCurrentMindmapTitle(mmTitle);
    setIsSavedForUser(true);
    setHasUnsavedChanges(false);

    const currentProject = projects.find((p) => String(p.id) === String(selectedProjectId));
    const pName = currentProject ? currentProject.project_name : "Project";
    toast.success(`Mindmap "${mmTitle}" saved under "${pName}"!`);
  }, [selectedProjectId, nodes, currentMindmapId, currentMindmapTitle, projectMindmaps, edges, collapsedNodeIds, categories, currentUserId, selectedTaskId, getMindmapDataKey, getProjectIndexKey, projects]);

  // Delete current mindmap from project
  const handleDeleteMindmap = useCallback(() => {
    if (!selectedProjectId || !currentMindmapId) return;
    if (!window.confirm(`Delete mindmap "${currentMindmapTitle}" from this project?`)) {
      return;
    }
    const dataKey = getMindmapDataKey(currentUserId, selectedProjectId, currentMindmapId);
    localStorage.removeItem(dataKey);

    const indexKey = getProjectIndexKey(currentUserId, selectedProjectId);
    const remaining = projectMindmaps.filter((m) => m.id !== currentMindmapId);
    localStorage.setItem(indexKey, JSON.stringify(remaining));
    setProjectMindmaps(remaining);

    toast.info(`Mindmap "${currentMindmapTitle}" removed.`);

    if (remaining.length > 0) {
      loadMindmapById(remaining[0].id, remaining[0].title);
    } else {
      handleCreateNewMindmap();
    }
  }, [selectedProjectId, currentMindmapId, currentMindmapTitle, currentUserId, getMindmapDataKey, getProjectIndexKey, projectMindmaps, loadMindmapById, handleCreateNewMindmap]);

  // Auto-sync updates to localStorage if user has already created and saved this mindmap under selected project
  useEffect(() => {
    if (selectedProjectId && isSavedForUser && currentMindmapId && nodes.length > 0) {
      const dataKey = getMindmapDataKey(currentUserId, selectedProjectId, currentMindmapId);
      const payload = {
        id: currentMindmapId,
        title: currentMindmapTitle || "Mindmap",
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: {
            id: n.data.id,
            category: n.data.category,
            label: n.data.label || "",
            description: n.data.description || "",
          },
        })),
        edges,
        collapsed: Array.from(collapsedNodeIds),
        categories,
        savedAt: new Date().toISOString(),
        savedBy: currentUserId,
        projectId: selectedProjectId,
        taskId: selectedTaskId || "root",
      };
      localStorage.setItem(dataKey, JSON.stringify(payload));
    }
  }, [selectedProjectId, isSavedForUser, currentMindmapId, nodes, edges, collapsedNodeIds, categories, currentMindmapTitle, currentUserId, selectedTaskId, getMindmapDataKey]);

  // Inline update handlers
  const handleUpdateNodeLabel = useCallback(
    (id, newLabel) => {
      setHasUnsavedChanges(true);
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: newLabel } } : n))
      );
    },
    [setNodes]
  );

  const handleUpdateNodeDescription = useCallback(
    (id, newDesc) => {
      setHasUnsavedChanges(true);
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, description: newDesc } } : n))
      );
    },
    [setNodes]
  );

  // Update or remove category from a node
  const handleUpdateNodeCategory = useCallback(
    (id, newCat) => {
      takeSnapshot();
      setHasUnsavedChanges(true);
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, category: newCat } } : n))
      );

      const catObj = newCat ? (categories[newCat] || DEFAULT_CATEGORIES[newCat] || NO_CATEGORY_STYLE) : NO_CATEGORY_STYLE;

      // Update incoming edge colors to match new category
      setEdges((eds) =>
        eds.map((e) => {
          if (e.target === id) {
            return {
              ...e,
              markerEnd: { type: MarkerType.ArrowClosed, color: catObj.color },
              style: { stroke: catObj.color, strokeWidth: 2 },
            };
          }
          return e;
        })
      );

      if (!newCat) {
        toast.info("Category tag removed from node");
      }
    },
    [categories, setNodes, setEdges]
  );

  // Delete node and its sub-branches
  const handleDeleteNode = useCallback(
    (id) => {
      if (id === "root") {
        toast.warn("The central objective node cannot be removed");
        return;
      }

      takeSnapshot();
      setHasUnsavedChanges(true);
      const descendants = new Set();
      const queue = [id];
      while (queue.length > 0) {
        const cur = queue.shift();
        descendants.add(cur);
        edges.forEach((e) => {
          if (e.source === cur && !descendants.has(e.target)) {
            queue.push(e.target);
          }
        });
      }

      setNodes((nds) => nds.filter((n) => !descendants.has(n.id)));
      setEdges((eds) => eds.filter((e) => !descendants.has(e.source) && !descendants.has(e.target)));
      setCollapsedNodeIds((prev) => {
        const next = new Set(prev);
        descendants.forEach((d) => next.delete(d));
        return next;
      });

      toast.info(descendants.size > 1 ? `Removed branch and ${descendants.size - 1} sub-branch(es)` : "Branch removed");
    },
    [edges, setNodes, setEdges]
  );

  // Direct "+ Add Child Idea" button handler (instant creation with EMPTY fields)
  const handleAddChild = useCallback(
    (parentId, parentCategory) => {
      takeSnapshot();
      setHasUnsavedChanges(true);
      const newId = `node_${Date.now()}`;
      const parentNode = nodes.find((n) => n.id === parentId);

      // Position child below parent with horizontal offset based on existing children
      const existingChildren = edges.filter((e) => e.source === parentId);
      const childIndex = existingChildren.length;
      const spread = (childIndex - 0.5) * 260;

      const newPosition = parentNode
        ? {
            x: Math.round(parentNode.position.x + spread),
            y: Math.round(parentNode.position.y + 180),
          }
        : { x: 440 + Math.random() * 80, y: 250 + Math.random() * 60 };

      // Determine intuitive next category or default
      const catKeys = Object.keys(categories);
      const defaultCat = catKeys.includes("ACTION") ? "ACTION" : catKeys[0] || null;

      const nextCategory =
        parentCategory === "OBJECTIVE"
          ? (catKeys.includes("PREREQUISITE") ? "PREREQUISITE" : defaultCat)
          : defaultCat;

      const catObj = nextCategory ? (categories[nextCategory] || DEFAULT_CATEGORIES[nextCategory] || NO_CATEGORY_STYLE) : NO_CATEGORY_STYLE;

      // Both label and description start EMPTY as requested!
      const newNode = {
        id: newId,
        type: "thought",
        position: newPosition,
        data: {
          id: newId,
          category: nextCategory,
          label: "", // Empty field
          description: "", // Empty field
        },
      };

      const newEdge = {
        id: `e-${parentId}-${newId}`,
        source: parentId,
        target: newId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: catObj.color },
        style: { stroke: catObj.color, strokeWidth: 2 },
      };

      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [...eds, newEdge]);

      // If parent was collapsed, auto-expand it so the new child is immediately visible
      setCollapsedNodeIds((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });

      toast.info(`New branch added. Click to enter your title!`);
    },
    [nodes, edges, categories, setNodes, setEdges]
  );

  // Add top-level root branch (with empty fields)
  const handleAddRootBranch = useCallback(
    (category = "ACTION") => {
      const rootNode = nodes.find((n) => n.id === "root") || nodes[0];
      const parentId = rootNode ? rootNode.id : "root";
      handleAddChild(parentId, category);
    },
    [nodes, handleAddChild]
  );

  // Create new custom category
  const handleCreateCustomCategory = (e) => {
    e?.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    const key = `CAT_${Date.now()}`;
    const preset = COLOR_PRESETS[newCatColorIdx] || COLOR_PRESETS[0];

    const newCategory = {
      label: newCatName.trim(),
      bg: preset.bg,
      border: preset.border,
      badge: preset.badge,
      color: preset.hex,
    };

    setCategories((prev) => ({
      ...prev,
      [key]: newCategory,
    }));
    setHasUnsavedChanges(true);

    if (targetNodeForNewCat) {
      handleUpdateNodeCategory(targetNodeForNewCat, key);
      setTargetNodeForNewCat(null);
    }

    toast.success(`Category "${newCatName.trim()}" created!`);
    setNewCatName("");
    setShowCategoryModal(false);
  };

  // Remove a category option from the mindmap project list
  const handleRemoveCategoryFromList = (categoryKey) => {
    const catLabel = categories[categoryKey]?.label || categoryKey;
    if (window.confirm(`Remove category "${catLabel}" from the options list? Nodes with this category will become uncategorized.`)) {
      setCategories((prev) => {
        const next = { ...prev };
        delete next[categoryKey];
        return next;
      });
      setHasUnsavedChanges(true);

      // Clear this category from any nodes currently using it
      setNodes((nds) =>
        nds.map((n) => (n.data?.category === categoryKey ? { ...n, data: { ...n.data, category: null } } : n))
      );

      toast.info(`Category "${catLabel}" removed`);
    }
  };

  // Toggle expand / collapse for a branch
  const handleToggleCollapse = useCallback((nodeId) => {
    setCollapsedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        toast.info("Branch expanded");
      } else {
        next.add(nodeId);
        toast.info("Branch collapsed");
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setCollapsedNodeIds(new Set());
    toast.info("All branches expanded");
  }, []);

  const handleCollapseAll = useCallback(() => {
    const parents = new Set();
    edges.forEach((e) => {
      if (e.source !== "root") {
        parents.add(e.source);
      }
    });
    setCollapsedNodeIds(parents);
    toast.info("Sub-branches collapsed");
  }, [edges]);

  // Connect edges on canvas
  const onConnect = useCallback(
    (params) => {
      takeSnapshot();
      setHasUnsavedChanges(true);
      const targetNode = nodes.find((n) => n.id === params.target);
      const cat = categories[targetNode?.data?.category] || DEFAULT_CATEGORIES[targetNode?.data?.category] || NO_CATEGORY_STYLE;
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed, color: cat.color },
            style: { stroke: cat.color, strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [nodes, categories, setEdges]
  );

  // Snapshot before dragging nodes on canvas for Undo support
  const onNodeDragStart = useCallback(() => {
    takeSnapshot();
  }, [takeSnapshot]);

  // Calculate hidden node IDs from collapsed state
  const hiddenNodeIds = useMemo(() => {
    const hidden = new Set();
    collapsedNodeIds.forEach((collapsedId) => {
      const queue = [];
      edges.forEach((e) => {
        if (e.source === collapsedId) queue.push(e.target);
      });
      while (queue.length > 0) {
        const cur = queue.shift();
        if (!hidden.has(cur)) {
          hidden.add(cur);
          edges.forEach((e) => {
            if (e.source === cur) queue.push(e.target);
          });
        }
      }
    });
    return hidden;
  }, [collapsedNodeIds, edges]);

  // Prepare display nodes with callbacks & child counters
  const displayNodes = useMemo(() => {
    return nodes.map((n) => {
      const isHidden = hiddenNodeIds.has(n.id);
      const childEdges = edges.filter((e) => e.source === n.id);
      const isCollapsed = collapsedNodeIds.has(n.id);
      return {
        ...n,
        hidden: isHidden,
        data: {
          ...n.data,
          categories,
          childCount: childEdges.length,
          isCollapsed,
          onBeginEdit: takeSnapshot,
          onUpdateLabel: handleUpdateNodeLabel,
          onUpdateDescription: handleUpdateNodeDescription,
          onUpdateCategory: handleUpdateNodeCategory,
          onAddNewCategory: (nodeId) => {
            setTargetNodeForNewCat(nodeId);
            setShowCategoryModal(true);
          },
          onDelete: handleDeleteNode,
          onAddChild: handleAddChild,
          onToggleCollapse: handleToggleCollapse,
        },
      };
    });
  }, [
    nodes,
    edges,
    categories,
    hiddenNodeIds,
    collapsedNodeIds,
    takeSnapshot,
    handleUpdateNodeLabel,
    handleUpdateNodeDescription,
    handleUpdateNodeCategory,
    handleDeleteNode,
    handleAddChild,
    handleToggleCollapse,
  ]);

  // Prepare display edges (hidden if either source or target is hidden)
  const displayEdges = useMemo(() => {
    return edges.map((e) => ({
      ...e,
      hidden: hiddenNodeIds.has(e.source) || hiddenNodeIds.has(e.target),
    }));
  }, [edges, hiddenNodeIds]);

  // Auto-arrange mindmap tree layout
  const handleAutoAlign = useCallback(() => {
    if (nodes.length === 0) return;
    takeSnapshot();
    const childrenMap = {};
    edges.forEach((e) => {
      if (!childrenMap[e.source]) childrenMap[e.source] = [];
      childrenMap[e.source].push(e.target);
    });

    const nodeWidth = 270;
    const gapX = 40;
    const gapY = 180;

    const subtreeWidths = {};
    const computeWidth = (nodeId) => {
      const children = childrenMap[nodeId] || [];
      if (children.length === 0) {
        subtreeWidths[nodeId] = nodeWidth;
        return nodeWidth;
      }
      let totalW = 0;
      children.forEach((c) => {
        totalW += computeWidth(c) + gapX;
      });
      totalW -= gapX;
      subtreeWidths[nodeId] = Math.max(nodeWidth, totalW);
      return subtreeWidths[nodeId];
    };

    const rootNode = nodes.find((n) => n.id === "root") || nodes[0];
    if (!rootNode) return;

    computeWidth(rootNode.id);

    const newPositions = {};
    const positionSubtree = (nodeId, startX, currentY) => {
      const w = subtreeWidths[nodeId] || nodeWidth;
      const nodeX = startX + (w - nodeWidth) / 2;
      newPositions[nodeId] = { x: Math.round(nodeX), y: Math.round(currentY) };

      const children = childrenMap[nodeId] || [];
      let curX = startX;
      children.forEach((c) => {
        const cw = subtreeWidths[c] || nodeWidth;
        positionSubtree(c, curX, currentY + gapY);
        curX += cw + gapX;
      });
    };

    positionSubtree(rootNode.id, 80, 50);

    let orphanX = 80;
    nodes.forEach((n) => {
      if (!newPositions[n.id]) {
        newPositions[n.id] = { x: orphanX, y: 650 };
        orphanX += nodeWidth + gapX;
      }
    });

    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        position: newPositions[n.id] || n.position,
      }))
    );
    toast.success("Mindmap layout auto-aligned into a clean tree");
  }, [nodes, edges, setNodes]);

  // Convert thoughts to checklist/deliverables text for copying
  const copyThoughtsToClipboard = () => {
    const lines = [];
    lines.push(`🧠 PRE-EXECUTION MINDMAP THOUGHTS & SCOPE:`);
    lines.push(`Project: ${projects.find((p) => String(p.id) === String(selectedProjectId))?.project_name || "General"}`);
    lines.push(`Created by: ${currentUserName}`);
    lines.push("");

    Object.keys(categories).forEach((catKey) => {
      const catNodes = nodes.filter((n) => n.data.category === catKey && n.data.label);
      if (catNodes.length > 0) {
        lines.push(`[${categories[catKey].label.toUpperCase()}]:`);
        catNodes.forEach((cn) => {
          lines.push(`  • ${cn.data.label}${cn.data.description ? ` — ${cn.data.description}` : ""}`);
        });
        lines.push("");
      }
    });

    const uncatNodes = nodes.filter((n) => (!n.data.category || !categories[n.data.category]) && n.data.label);
    if (uncatNodes.length > 0) {
      lines.push(`[GENERAL / OTHER]:`);
      uncatNodes.forEach((cn) => {
        lines.push(`  • ${cn.data.label}${cn.data.description ? ` — ${cn.data.description}` : ""}`);
      });
      lines.push("");
    }

    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Mindmap thoughts copied to clipboard! Ready to paste into scope checklists/deliverables or task notes.");
  };

  // Reset mindmap to empty starter
  const resetMindmap = () => {
    if (window.confirm("Clear this mindmap back to an empty project canvas?")) {
      takeSnapshot();
      const currentProject = projects.find((p) => String(p.id) === String(selectedProjectId));
      const currentTask = tasks.find((t) => String(t.id) === String(selectedTaskId));
      const title = currentTask ? (currentTask.task_title || currentTask.title) : (currentProject ? currentProject.project_name : "");
      const cleanStarter = getCleanRootTemplate(title);
      setNodes(cleanStarter.nodes);
      setEdges(cleanStarter.edges);
      setCollapsedNodeIds(new Set());
      setCategories(DEFAULT_CATEGORIES);
      setIsSavedForUser(false);
      setHasUnsavedChanges(true);
      toast.info("Mindmap canvas cleared to empty starter");
    }
  };

  const currentProjectName = projects.find((p) => String(p.id) === String(selectedProjectId))?.project_name;

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 sm:px-4 pb-8">
      {/* 1. Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <Link
            to="/project-management"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm shrink-0"
            title="Back to Project Management"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/30 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50 shadow-sm shrink-0">
            <Brain size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Execution Mindmap &amp; Thought Canvas
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
              Saved per user &amp; project • Click any text to edit • All fields empty until created and saved
            </p>
          </div>
        </div>

        {/* Project & Multi-Mindmap Dropdowns - Horizontally Aligned */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Project Dropdown */}
          <div className="flex items-center gap-2">
            <select
              className="input text-sm h-9 rounded-xl min-w-[210px] max-w-[290px] border-slate-200 dark:border-slate-700 font-medium"
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedTaskId("");
                setSearchParams(e.target.value ? { projectId: e.target.value } : {});
              }}
              title="Select Project (Required to save mindmaps)"
            >
              <option value="">— Select Project (Required) —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code ? `${p.project_code} - ` : ""}
                  {p.project_name || p.name}
                </option>
              ))}
            </select>

            {/* Multiple Mindmaps selector per project */}
            {selectedProjectId && (
              <div className="flex items-center gap-1.5">
                <select
                  className="input text-sm h-9 rounded-xl min-w-[150px] max-w-[220px] font-semibold border-slate-200 dark:border-slate-700 bg-purple-50/40 dark:bg-purple-950/20 text-purple-900 dark:text-purple-200"
                  value={currentMindmapId || ""}
                  onChange={(e) => {
                    const mm = projectMindmaps.find((m) => m.id === e.target.value);
                    if (mm) {
                      if (hasUnsavedChanges && !window.confirm("Switch mindmap? Any unsaved changes in current mindmap will be lost.")) {
                        return;
                      }
                      loadMindmapById(mm.id, mm.title);
                    }
                  }}
                  title="Switch saved mindmap for this project"
                >
                  {projectMindmaps.map((mm, idx) => (
                    <option key={mm.id} value={mm.id}>
                      🗺️ {mm.title || `Mindmap ${idx + 1}`}
                    </option>
                  ))}
                  {!projectMindmaps.some((m) => m.id === currentMindmapId) && (
                    <option value={currentMindmapId || "new"}>
                      ✨ {currentMindmapTitle || "New Mindmap (Unsaved)"}
                    </option>
                  )}
                </select>

                <button
                  type="button"
                  onClick={handleCreateNewMindmap}
                  className="btn btn-secondary inline-flex items-center gap-1 h-9 px-2.5 rounded-xl text-sm font-semibold shadow-sm shrink-0"
                  title="Create an additional mindmap for this project"
                >
                  <Plus size={13} />
                  <span>New Mindmap</span>
                </button>

                {projectMindmaps.some((m) => m.id === currentMindmapId) && (
                  <button
                    type="button"
                    onClick={handleDeleteMindmap}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                    title="Delete this mindmap from project"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}

            {tasks.length > 0 && (
              <select
                className="input text-sm h-9 rounded-xl min-w-[190px] max-w-[250px] border-slate-200 dark:border-slate-700"
                value={selectedTaskId}
                onChange={(e) => {
                  setSelectedTaskId(e.target.value);
                  setSearchParams({ projectId: selectedProjectId, taskId: e.target.value });
                }}
                title="Select Specific Task (Optional)"
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
              className="btn btn-secondary inline-flex items-center gap-1.5 h-9 text-xs px-3 rounded-xl shadow-sm shrink-0 whitespace-nowrap"
              title="Go to Task Execution Dashboard"
            >
              <ListTodo size={14} /> Execution Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Mindmap Action Toolbar & Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Prominent Save Mindmap Button (Requires Selected Project) */}
          <button
            type="button"
            onClick={handleSaveMindmap}
            disabled={!selectedProjectId}
            className={`btn inline-flex items-center gap-1.5 text-xs h-8 px-3.5 rounded-xl shadow-sm font-semibold transition-all ${
              !selectedProjectId
                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                : hasUnsavedChanges
                  ? "bg-amber-600 hover:bg-amber-700 text-white animate-pulse"
                  : isSavedForUser
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "btn-primary"
            }`}
            title={
              !selectedProjectId
                ? "Please select a project from the dropdown above to save"
                : "Save this mindmap against the selected project"
            }
          >
            <Save size={13} />
            <span>Save</span>
          </button>

          {/* Inline Mindmap Title for selected project */}
          {selectedProjectId && (
            <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Name:</span>
              <input
                type="text"
                value={currentMindmapTitle}
                onChange={(e) => {
                  setCurrentMindmapTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Mindmap Name"
                className="input text-xs h-8 px-2.5 rounded-xl w-36 sm:w-48 font-medium border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
                title="Name of this mindmap for the project"
              />
            </div>
          )}

          {/* Undo: Move back to previous change */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-sm h-8 px-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shadow-sm font-semibold transition-all"
            title="Move back to previous change (Undo - Ctrl+Z)"
          >
            <Undo2 size={13} />
            <span>Undo</span>
          </button>

          {/* Redo: Move forward to next change */}
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-sm h-8 px-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed shadow-sm font-semibold transition-all"
            title="Move forward to next change (Redo - Ctrl+Y)"
          >
            <Redo2 size={13} />
            <span>Redo</span>
          </button>

          <button
            type="button"
            onClick={resetMindmap}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-sm h-8 px-2.5 rounded-xl text-slate-500 hover:text-rose-600"
            title="Clear canvas back to empty starter"
          >
            <RefreshCw size={12} /> Clear
          </button>
        </div>

        {/* Copy Checklist/Deliverables Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyThoughtsToClipboard}
            className="btn btn-secondary inline-flex items-center gap-1.5 text-sm h-8 px-3 rounded-xl shadow-sm text-slate-600 dark:text-slate-300"
            title="Copy thoughts as formatted execution checklist/deliverables"
          >
            <Copy size={13} />
            <span>Copy Checklist/Deliverables</span>
          </button>
        </div>
      </div>

      {/* Warning prompt when no project is selected */}
      {!selectedProjectId && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2 shadow-2xs">
          <span>⚠️ <strong>Please select a project:</strong> Choose a project from the dropdown above to create, view, or save mindmaps. Mindmaps must be saved against a specific project.</span>
        </div>
      )}

      {/* 3. Main Interactive Canvas Area */}
      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner h-[650px] relative">
        {/* Floating Categories Bar on Canvas */}
        {showCanvasCategories && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-smoky flex flex-wrap items-center gap-2 animate-fadeIn max-w-[90%]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mr-1">
              <Tag size={13} className="text-brand-600" />
              <span>Categories:</span>
            </div>
            {Object.entries(categories).map(([k, cat]) => (
              <span
                key={k}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cat.badge}`}
              >
                <span>{cat.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveCategoryFromList(k);
                  }}
                  className="text-slate-400 hover:text-rose-600 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors cursor-pointer"
                  title={`Remove category "${cat.label}"`}
                >
                  <X size={11} strokeWidth={2.5} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setShowCategoryModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-all bg-white dark:bg-slate-800 cursor-pointer"
            >
              <Plus size={11} />
              <span>Add Category</span>
            </button>
          </div>
        )}

        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={onNodeDragStart}
          onPaneClick={() => setShowCanvasCategories((prev) => !prev)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="#94a3b8" gap={20} size={1} />
          <Controls className="!bg-white dark:!bg-slate-900 !border-slate-200 dark:!border-slate-800 !rounded-xl !shadow-md" />
          <MiniMap
            nodeStrokeWidth={3}
            nodeColor={(n) => {
              const catKey = n.data?.category;
              return catKey && categories[catKey]?.color ? categories[catKey].color : "#cbd5e1";
            }}
            className="!bg-white/90 dark:!bg-slate-900/90 !rounded-xl !border-slate-200 dark:!border-slate-800"
          />
        </ReactFlow>

        {/* Canvas Helpful Floating Status & Hint Bar */}
        <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 shadow-sm pointer-events-none flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {currentProjectName ? `Project: ${currentProjectName}` : "General Canvas"}
          </span>
          <span>•</span>
          <span className={isSavedForUser ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
            {isSavedForUser ? "✓ Saved for your user" : "Draft / Unsaved"}
          </span>
          <span>•</span>
          <span>Click text to edit • &ldquo;+ Add Child Idea&rdquo; to branch</span>
        </div>
      </div>

      {/* 4. Add Custom Category Modal */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 animate-fadeIn"
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag size={18} className="text-brand-600" />
                Add New Mindmap Category
              </h2>
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomCategory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  className="input w-full text-sm rounded-xl"
                  placeholder="e.g. Safety &amp; Compliance, Design Review, Milestones..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-2">
                  Color Theme
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setNewCatColorIdx(idx)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        newCatColorIdx === idx
                          ? "ring-2 ring-brand-500 scale-105 shadow-sm"
                          : "opacity-75 hover:opacity-100"
                      } ${preset.badge}`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-white/60 shadow-xs"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span className="text-[10px]">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  className="btn btn-secondary text-sm h-9 px-4 rounded-xl"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-sm h-9 px-4 rounded-xl flex items-center gap-1.5"
                >
                  <Plus size={14} /> Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
