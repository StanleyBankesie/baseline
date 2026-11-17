import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { Star } from "lucide-react";
import {
  isPageFavorited,
  togglePageFavorite,
  resolvePageMetadata,
} from "../utils/favorites.js";
import { toast } from "react-toastify";

/**
 * List of all module home routes and root dashboards where the favorite star must NOT be shown.
 */
export const MODULE_HOME_ROOTS = new Set([
  "/",
  "/home",
  "/dashboard",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/select-branch",
  "/administration",
  "/sales",
  "/inventory",
  "/purchase",
  "/finance",
  "/human-resources",
  "/hr",
  "/maintenance",
  "/facilities",
  "/environmental-health-safety",
  "/ehs",
  "/hse",
  "/assets",
  "/asset-management",
  "/project-management",
  "/production",
  "/pos",
  "/business-intelligence",
  "/service-management",
  "/transport",
  "/executive-overview",
  "/system-configuration",
]);

/**
 * Checks whether a given pathname represents a module home, module root, or landing dashboard.
 */
export function isModuleHomePath(pathname) {
  if (!pathname) return true;
  const normalized = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (MODULE_HOME_ROOTS.has(normalized)) {
    return true;
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) return true;
  // If it's a 1-segment path, check against known module roots
  if (segments.length === 1 && MODULE_HOME_ROOTS.has(`/${segments[0]}`)) {
    return true;
  }
  // If it's a module home or dashboard subpath (e.g., /sales/home, /sales/dashboard, /sales/dashboards)
  if (
    segments.length === 2 &&
    (segments[1] === "home" || segments[1] === "dashboard" || segments[1] === "dashboards")
  ) {
    if (MODULE_HOME_ROOTS.has(`/${segments[0]}`)) {
      return true;
    }
  }
  return false;
}

/**
 * OmniSuite Golden Mark (preserved for backwards compatibility)
 */
export function OmniSuiteMark({
  isFavorited = false,
  outlined = !isFavorited,
  className = "w-5 h-5",
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill={isFavorited ? "#FBBE23" : outlined ? "none" : "currentColor"}
      stroke={isFavorited ? "#FBBE23" : outlined ? "currentColor" : "none"}
      strokeWidth={isFavorited ? "1" : outlined ? "3.2" : "0"}
      strokeLinejoin="round"
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M48.0 8.5 L50.4 8.5 L53.8 9.5 L56.4 11.4 L57.9 13.5 L58.9 16.5 L58.9 18.9 L57.9 22.0 L56.0 24.3 L54.0 25.8 L52.4 26.4 L50.4 26.9 L47.4 26.8 L44.1 25.5 L42.1 23.9 L40.8 22.2 L39.8 22.3 L36.4 23.6 L33.7 25.2 L29.1 28.6 L25.4 33.0 L22.6 37.8 L16.7 36.3 L17.0 35.1 L19.8 30.2 L21.5 27.8 L25.4 23.7 L27.7 21.7 L31.0 19.5 L35.7 17.2 L39.5 15.7 L41.1 12.6 L43.0 10.5 L45.4 9.2 L48.0 8.5 Z" />
      <path d="M64.2 18.0 L64.6 18.0 L66.2 18.7 L70.0 21.1 L74.6 25.1 L77.6 28.6 L80.3 32.9 L82.6 38.2 L83.4 41.2 L86.1 42.3 L87.7 43.2 L90.2 46.0 L90.9 47.5 L91.3 49.8 L91.1 52.6 L90.5 54.5 L89.8 55.8 L86.9 58.4 L85.4 59.1 L83.9 59.5 L81.7 59.7 L79.7 59.6 L77.8 58.9 L76.1 57.8 L74.5 56.2 L73.7 55.1 L72.8 53.2 L72.5 51.6 L72.4 49.9 L72.8 48.1 L73.7 46.0 L75.4 44.0 L77.0 42.7 L77.1 41.7 L76.4 39.3 L75.2 36.7 L72.4 32.0 L69.1 28.5 L66.0 25.9 L62.6 23.7 L63.4 21.4 L64.2 18.0 Z" />
      <path d="M16.2 41.8 L19.1 42.0 L21.6 43.0 L23.9 44.9 L25.4 47.4 L26.1 50.1 L25.8 53.3 L24.6 56.0 L23.4 57.3 L22.1 58.4 L21.9 59.1 L24.0 64.0 L27.4 68.9 L31.5 72.8 L36.0 75.8 L34.3 81.5 L32.3 80.8 L29.6 79.1 L27.1 77.4 L23.5 74.0 L21.7 72.0 L18.8 67.8 L16.9 64.0 L15.4 59.9 L12.8 58.9 L11.5 58.2 L9.8 56.6 L8.6 54.8 L7.8 52.3 L7.8 49.7 L8.2 48.0 L8.9 46.5 L10.2 44.7 L12.0 43.2 L13.8 42.3 L16.2 41.8 Z" />
      <path d="M75.0 63.5 L75.6 63.5 L80.8 65.0 L80.8 65.5 L79.7 67.8 L77.1 71.6 L73.5 75.5 L69.1 78.9 L67.3 80.0 L63.9 81.6 L58.9 83.4 L57.5 87.2 L56.5 88.7 L54.9 90.3 L53.0 91.3 L50.9 92.0 L49.3 92.2 L47.3 92.0 L44.1 90.9 L42.4 89.7 L41.1 88.3 L40.3 86.8 L39.5 84.7 L39.4 82.8 L39.5 81.2 L40.1 79.5 L41.1 77.6 L43.5 75.3 L45.0 74.4 L46.7 73.9 L48.6 73.6 L50.4 73.7 L52.1 74.1 L54.0 74.9 L55.2 75.7 L57.0 77.5 L57.6 77.5 L59.7 76.9 L62.3 75.8 L64.4 74.7 L68.5 71.8 L72.1 68.0 L75.0 63.5 Z" />
    </svg>
  );
}

/**
 * Favorite Page Star Button
 * Placed in the top-right corner of every page/report.
 * - Star icon (fill-none and blue-black text on light, white on dark when unfavorited)
 * - Rich OmniSuite Gold (#FBBE23) filled star when favorited
 * - Completely hidden on Homepage, Login page, and ALL module homes/dashboards
 * - No background color (clean, bare icon)
 */
export default function OmniSuiteFavoriteButton() {
  const location = useLocation();
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      setFavorited(isPageFavorited(user?.id, location.pathname));
    };
    checkStatus();

    window.addEventListener("omnisuite_favorites_changed", checkStatus);
    return () => {
      window.removeEventListener("omnisuite_favorites_changed", checkStatus);
    };
  }, [location.pathname, user?.id]);

  // Do NOT display on homepage, login page, or ANY module home / dashboard
  if (isModuleHomePath(location.pathname)) {
    return null;
  }

  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();

    const meta = resolvePageMetadata(location.pathname);
    const newState = togglePageFavorite(user?.id, {
      path: location.pathname,
      title: meta.title,
      module: meta.module,
      iconKey: meta.iconKey,
    });
    setFavorited(newState);

    if (newState) {
      toast.success(`⭐ Added "${meta.title}" to Favourite Pages`);
    } else {
      toast.info(`Removed "${meta.title}" from Favourite Pages`);
    }
  };

  const meta = resolvePageMetadata(location.pathname);

  return (
    <button
      type="button"
      onClick={handleToggle}
      data-rbac-exempt="true"
      aria-label={
        favorited
          ? `Remove ${meta.title} from Favourite Pages`
          : `Add ${meta.title} to Favourite Pages`
      }
      title={
        favorited
          ? `Favourite page active — click to remove from Favourite Pages`
          : `Click star to add "${meta.title}" to Favourite Pages on Homepage`
      }
      className="group relative inline-flex items-center justify-center w-8 h-8 transition-all duration-200 active:scale-95 focus:outline-none bg-transparent hover:bg-transparent border-0 cursor-pointer"
    >
      <Star
        size={20}
        className={`w-5 h-5 transition-transform duration-200 ${
          favorited
            ? "text-[#FBBE23] fill-[#FBBE23] scale-110 drop-shadow-[0_2px_4px_rgba(251,190,35,0.35)]"
            : "text-[#0E3646] dark:text-white fill-none stroke-[2] group-hover:scale-110 group-hover:text-amber-500"
        }`}
      />
    </button>
  );
}
