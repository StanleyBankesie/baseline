import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop
 * 
 * Automatically scrolls the window and all scrollable main containers to the top (0, 0)
 * whenever a user navigates to any page or route across the entire application.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Disable automatic browser scroll restoration so pages always open at top
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual";
      } catch {}
    }

    const resetScroll = () => {
      window.scrollTo(0, 0);
      if (typeof document !== "undefined") {
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        const mainEl = document.querySelector("main");
        if (mainEl && mainEl.scrollTop > 0) {
          mainEl.scrollTop = 0;
        }

        const rootEl = document.getElementById("root");
        if (rootEl && rootEl.scrollTop > 0) {
          rootEl.scrollTop = 0;
        }
      }
    };

    // Immediate scroll reset
    resetScroll();

    // Next frame and delayed resets to handle React async renders and Suspense
    const rafId = requestAnimationFrame(resetScroll);
    const timerId = setTimeout(resetScroll, 60);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
    };
  }, [pathname, search]);

  return null;
}
