/**
 * @fileoverview Floating button component to prompt Progressive Web App (PWA) installation.
 * Handles different device install scenarios (e.g., iOS Safari manual prompt).
 */

import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import usePWAInstall from "../hooks/usePWAInstall.js";

/**
 * FloatingInstallButton component
 * Displays a persistent install button in the bottom right corner when PWA installation is supported and not yet installed.
 * 
 * @returns {JSX.Element|null} The floating install button or null if already installed/unsupported.
 */
export default function FloatingInstallButton() {
  const { isInstallable, isInstalled, isPWASupported, handleInstall } =
    usePWAInstall();
  const [showHelp, setShowHelp] = useState(false);
  const [visible, setVisible] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1920,
  );

  useEffect(() => {
    function onResize() {
      setViewportWidth(window.innerWidth);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    // Show only when not yet installed.
    const shouldShow = !isInstalled;
    setVisible(shouldShow);
  }, [isInstalled, viewportWidth]);

  if (!visible) return null;

  return (
    <>
      <div className="relative flex items-center">
        <button
          type="button"
          className="inline-flex items-center justify-center w-9 h-9 lg:w-auto lg:px-3 lg:gap-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          aria-label="Install App"
          onClick={async () => {
            if (isInstallable) {
              await handleInstall();
            } else {
              setShowHelp(true);
            }
          }}
          title="Install OmniSuite"
        >
          <Download className="w-5 h-5" />
          <span className="hidden lg:inline text-sm font-medium">Install App</span>
        </button>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full p-6 shadow-xl relative">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              Install OmniSuite
            </h3>
            <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <p>To install OmniSuite as an app on your device:</p>
              
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">iOS (Safari)</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the Share button <span className="inline-block border border-slate-300 dark:border-slate-600 rounded px-1 text-xs">⍗</span></li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>Add</strong> in the top right</li>
                </ol>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Android / Desktop</h4>
                <p>If you don't see an automatic install prompt, look for an install icon <span className="inline-flex items-center justify-center w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full text-xs">💻</span> in your browser's address bar or menu.</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="btn btn-primary"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
