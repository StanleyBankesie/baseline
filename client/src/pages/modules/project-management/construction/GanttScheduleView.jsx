/**
 * @file GanttScheduleView.jsx
 * @description Alias wrapper preserving compatibility for any legacy imports.
 * Redirects directly to the new dedicated GanttChartView.
 */

import React from "react";
import GanttChartView from "./GanttChartView.jsx";

export default function GanttScheduleView(props) {
  return <GanttChartView {...props} />;
}
