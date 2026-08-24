/**
 * @fileoverview Floating launcher for "Banks" AI Assistant.
 * Floats on all OmniSuite ERP pages.
 */

import React, { useState, useEffect } from "react";
import banksIcon from "../../assets/banks_ai_icon.png";
import BanksAiModal from "./BanksAiModal.jsx";

export default function BanksAiFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnreadPulse, setHasUnreadPulse] = useState(true);

  // Global hotkey listener (Alt + B)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnreadPulse(false);
  };

  return (
    <>
      <div className="fixed bottom-6 right-20 z-40">
        <button
          onClick={handleOpen}
          title="Ask Banks"
          className="relative group flex items-center gap-2.5 bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 hover:from-brand-800 hover:to-brand-600 text-white pl-3.5 pr-4 py-2 rounded-full shadow-erp-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 border border-brand-500/30"
        >
          {/* Glowing Aura */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-full blur opacity-30 group-hover:opacity-75 transition duration-300" />

          {/* Banks Icon */}
          <div className="relative flex items-center justify-center">
            <img src={banksIcon} alt="Banks" className="w-5 h-5 object-contain" />
            {hasUnreadPulse && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary" />
              </span>
            )}
          </div>

          <span className="relative text-xs font-black tracking-wider uppercase text-white drop-shadow-sm flex items-center gap-1">
            Ask Banks
          </span>
        </button>
      </div>

      <BanksAiModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
