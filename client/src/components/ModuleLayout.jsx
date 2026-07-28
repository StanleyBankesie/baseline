import React from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { usePermission } from "../auth/PermissionContext.jsx";
import { MODULES_REGISTRY } from "../data/modulesRegistry.js";

// ─── Module Top Navigation Dropdown Component ───────────────────
export function ModuleNavDropdown({ section, location, navigate }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  const visibleItems = React.useMemo(() => {
    const rawItems = section.items || section.features || [];
    return rawItems.filter(
      (item) => item && !item.hidden && (item.path || item.title || item.name || item.label)
    );
  }, [section]);

  React.useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (visibleItems.length === 0) return null;

  const sectionTitle = section.title || section.name || section.category || "Section";
  const isSectionActive = visibleItems.some((i) => location.pathname === i.path);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
          isSectionActive
            ? "bg-brand-900 text-white"
            : "text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300"
        }`}
      >
        <span>{sectionTitle}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-erp-lg overflow-hidden"
          style={{ minWidth: 240, maxWidth: 360 }}
        >
          <div className="p-1.5 grid grid-cols-1 gap-1 max-h-80 overflow-y-auto">
            {visibleItems.map((item, idx) => {
              const itemTitle = item.title || item.name || item.label;
              const itemPath = item.path;
              const itemIcon = item.icon;
              const itemDesc = item.description || item.desc;
              const isActive = location.pathname === itemPath;

              return (
                <button
                  key={itemPath || itemTitle || idx}
                  type="button"
                  onClick={() => {
                    if (itemPath) navigate(itemPath);
                    setOpen(false);
                  }}
                  className={`flex items-start gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                    isActive
                      ? "bg-brand-900 text-white"
                      : "text-slate-700 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300"
                  }`}
                >
                  {typeof itemIcon === "string" ? (
                    <span className="text-base flex-shrink-0 mt-0.5">{itemIcon}</span>
                  ) : itemIcon && typeof itemIcon === "function" ? (
                    <itemIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <span className="text-base flex-shrink-0 mt-0.5">📄</span>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate leading-snug">{itemTitle}</span>
                    {itemDesc && (
                      <span
                        className={`text-[11px] font-normal truncate leading-tight ${
                          isActive ? "text-white/80" : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {itemDesc}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Module Top Navigation Bar Component ───────────────────────
export function ModuleTopNavBar({ sections = [], headerActions = [], moduleKey }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { canAccessPath } = usePermission();

  const mk = moduleKey || (location.pathname.split("/").filter(Boolean)[0] || "");
  const moduleInfo = MODULES_REGISTRY[mk];

  const resolvedHeaderActions = React.useMemo(() => {
    const actions = Array.isArray(headerActions) ? [...headerActions] : [];
    // Remove Dashboard button from top navigation bar
    return actions.filter((a) => {
      const p = String(a?.path || "").toLowerCase();
      const l = String(a?.label || a?.title || "").toLowerCase();
      if (l === "dashboard" || p.endsWith("/dashboard") || p.endsWith("/dashboards")) {
        return false;
      }
      return true;
    });
  }, [headerActions]);

  if (!sections.length && !resolvedHeaderActions.length) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm px-4 py-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Back to Modules */}
        <NavLink
          to="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-brand-700 dark:hover:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={14} />
          Home
        </NavLink>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1.5 flex-shrink-0" />

        {/* Header Actions (e.g. Dashboard) */}
        {resolvedHeaderActions.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={() => navigate(a.path)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              location.pathname === a.path
                ? "bg-brand-900 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300"
            }`}
          >
            {a.icon && <span className="text-sm">{a.icon}</span>}
            <span>{a.label || a.title || "Dashboard"}</span>
          </button>
        ))}

        {/* Section Dropdowns */}
        {sections.map((section, idx) => (
          <ModuleNavDropdown
            key={section.title || section.name || idx}
            section={section}
            location={location}
            navigate={navigate}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Module Layout Wrapper ─────────────────────────────────────
export default function ModuleLayout({ children, sections = [], headerActions = [], moduleKey }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="flex-1">{children}</div>
    </div>
  );
}
