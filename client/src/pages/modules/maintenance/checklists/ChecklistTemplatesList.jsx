import React from "react";
import { Navigate } from "react-router-dom";

/**
 * ChecklistTemplatesList
 * Redirected to Facilities Operations Setup -> Inspection Checklists tab
 * All inspection checklist templates and dispatch runs have been unified into Operational Setup.
 */
export default function ChecklistTemplatesList() {
  return <Navigate to="/facilities/setup?tab=checklists" replace />;
}
