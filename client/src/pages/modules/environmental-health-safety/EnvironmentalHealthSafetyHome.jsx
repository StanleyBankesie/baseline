import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import ModuleLayout from "../../../components/ModuleLayout.jsx";
import ModuleDashboard from "../../../components/ModuleDashboard.jsx";
import { api } from "../../../api/client.js";

// Import all Environmental, Health, and Safety pages
import SafetyManagementPage from "../project-management/construction/SafetyManagementPage.jsx";
import IncidentRegisterPage from "../project-management/construction/IncidentRegisterPage.jsx";
import ToolboxTalksPage from "../project-management/construction/ToolboxTalksPage.jsx";
import HealthSafetyCompliancePage from "../maintenance/hsa-compliance/HealthSafetyCompliancePage.jsx";
import FMCompliancePage from "../facilities/compliance/FMCompliancePage.jsx";
import SustainabilityManagementPage from "../maintenance/sustainability/SustainabilityManagementPage.jsx";

const buildFeature = (title, path, description, icon) => ({
  title,
  path,
  actions: [{ label: "Open", path, type: "outline" }],
  description,
  icon,
});

export const ehsSections = [
  {
    title: "Safety & Incident Management",
    icon: "🦺",
    badge: "Core Safety",
    items: [
      {
        title: "Safety Management (HSE)",
        path: "/environmental-health-safety/safety",
        actions: [
          { label: "Overview", path: "/environmental-health-safety/safety", type: "outline" },
          { label: "Incidents", path: "/environmental-health-safety/incidents", type: "outline" },
          { label: "Toolbox Talks", path: "/environmental-health-safety/toolbox-talks", type: "outline" },
        ],
        description: "Safety dashboard, incident tracking, lost-time injuries, and site safety management",
        icon: "🦺",
      },
      buildFeature(
        "Incident Register & Near Misses",
        "/environmental-health-safety/incidents",
        "Record and investigate safety incidents, near-misses, injuries, and corrective actions",
        "⚠️"
      ),
      buildFeature(
        "Toolbox Talks & Briefings",
        "/environmental-health-safety/toolbox-talks",
        "Daily site safety briefings, toolbox talks records, attendance, and hazard topics",
        "🗣️"
      ),
    ],
  },
  {
    title: "Compliance & Hazard Control",
    icon: "⚖️",
    badge: "Statutory",
    items: [
      buildFeature(
        "Health, Safety & Compliance",
        "/environmental-health-safety/hsa-compliance",
        "Site safety incidents, permits to work, risk assessments, and safety certificates",
        "🛡️"
      ),
      buildFeature(
        "Statutory Obligations & Hazards",
        "/environmental-health-safety/compliance",
        "Statutory compliance obligations, certificate expiry tracking, and hazard risk registers",
        "📋"
      ),
    ],
  },
  {
    title: "Environmental & Sustainability",
    icon: "🌱",
    badge: "Green",
    items: [
      buildFeature(
        "Sustainability & Environmental",
        "/environmental-health-safety/sustainability",
        "Carbon footprint tracking, recycling metrics, energy/water savings, and green initiatives",
        "🌱"
      ),
    ],
  },
];

function EHSLanding() {
  const [stats, setStats] = React.useState([
    {
      rbac_key: "total-incidents",
      value: "—",
      label: "Safety Incidents",
      change: "Loading…",
      changeType: "neutral",
      path: "/environmental-health-safety/incidents",
      actions: [{ label: "View", path: "/environmental-health-safety/incidents", type: "outline" }],
    },
    {
      rbac_key: "toolbox-talks",
      value: "—",
      label: "Toolbox Talks",
      change: "Loading…",
      changeType: "neutral",
      path: "/environmental-health-safety/toolbox-talks",
      actions: [{ label: "View", path: "/environmental-health-safety/toolbox-talks", type: "outline" }],
    },
    {
      rbac_key: "compliance-obligations",
      value: "—",
      label: "Compliance Obligations",
      change: "Loading…",
      changeType: "neutral",
      path: "/environmental-health-safety/compliance",
      actions: [{ label: "View", path: "/environmental-health-safety/compliance", type: "outline" }],
    },
    {
      rbac_key: "sustainability-initiatives",
      value: "—",
      label: "Green Initiatives",
      change: "Loading…",
      changeType: "neutral",
      path: "/environmental-health-safety/sustainability",
      actions: [{ label: "View", path: "/environmental-health-safety/sustainability", type: "outline" }],
    },
  ]);

  React.useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get("/construction/safety-incidents").catch(() => ({ data: { data: [] } })),
      api.get("/construction/toolbox-talks").catch(() => ({ data: { data: [] } })),
      api.get("/facilities/compliance/obligations").catch(() => ({ data: { data: [] } })),
      api.get("/facilities/sustainability/initiatives").catch(() => ({ data: { data: [] } })),
    ]).then(([incRes, tbRes, obRes, susRes]) => {
      if (!mounted) return;
      const incidents = Array.isArray(incRes.data?.data) ? incRes.data.data : [];
      const toolbox = Array.isArray(tbRes.data?.data) ? tbRes.data.data : [];
      const obligations = Array.isArray(obRes.data?.data) ? obRes.data.data : [];
      const initiatives = Array.isArray(susRes.data?.data) ? susRes.data.data : [];

      const openIncidents = incidents.filter((i) => i.status !== "CLOSED" && i.status !== "RESOLVED");
      const activeObligations = obligations.filter((o) => o.status === "VALID" || o.status === "EXPIRING_SOON");

      setStats([
        {
          rbac_key: "total-incidents",
          value: incidents.length.toString(),
          label: "Total Incidents",
          change: openIncidents.length > 0 ? `${openIncidents.length} Open` : "All Clear",
          changeType: openIncidents.length > 0 ? "negative" : "positive",
          path: "/environmental-health-safety/incidents",
          actions: [{ label: "View", path: "/environmental-health-safety/incidents", type: "outline" }],
        },
        {
          rbac_key: "toolbox-talks",
          value: toolbox.length.toString(),
          label: "Toolbox Talks Held",
          change: "Briefings Logged",
          changeType: "positive",
          path: "/environmental-health-safety/toolbox-talks",
          actions: [{ label: "View", path: "/environmental-health-safety/toolbox-talks", type: "outline" }],
        },
        {
          rbac_key: "compliance-obligations",
          value: obligations.length.toString(),
          label: "Statutory Obligations",
          change: `${activeObligations.length} Active / Valid`,
          changeType: "positive",
          path: "/environmental-health-safety/compliance",
          actions: [{ label: "View", path: "/environmental-health-safety/compliance", type: "outline" }],
        },
        {
          rbac_key: "sustainability-initiatives",
          value: initiatives.length.toString(),
          label: "Green Initiatives",
          change: "Environmental Action",
          changeType: "positive",
          path: "/environmental-health-safety/sustainability",
          actions: [{ label: "View", path: "/environmental-health-safety/sustainability", type: "outline" }],
        },
      ]);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ModuleDashboard
      moduleKey="environmental-health-safety"
      moduleTitle="Environmental, Health & Safety (EHS)"
      moduleDescription="Comprehensive health, safety, and environmental governance: incident registers, toolbox briefings, statutory compliance, risk hazards, and sustainability programs."
      stats={stats}
      headerActions={[
        {
          label: "Incident Register",
          path: "/environmental-health-safety/incidents",
          actions: [{ label: "Open", path: "/environmental-health-safety/incidents", type: "outline" }],
          icon: "⚠️",
        },
        {
          label: "Toolbox Talks",
          path: "/environmental-health-safety/toolbox-talks",
          actions: [{ label: "Open", path: "/environmental-health-safety/toolbox-talks", type: "outline" }],
          icon: "🗣️",
        },
        {
          label: "Compliance & Hazards",
          path: "/environmental-health-safety/compliance",
          actions: [{ label: "Open", path: "/environmental-health-safety/compliance", type: "outline" }],
          icon: "⚖️",
        },
      ]}
      sections={ehsSections}
      useSectionNavigation={true}
    />
  );
}

export default function EnvironmentalHealthSafetyHome() {
  return (
    <ModuleLayout sections={ehsSections} moduleKey="environmental-health-safety">
      <Routes>
        <Route path="/" element={<EHSLanding />} />
        <Route path="/safety" element={<SafetyManagementPage />} />
        <Route path="/incidents" element={<IncidentRegisterPage />} />
        <Route path="/safety/incidents" element={<IncidentRegisterPage />} />
        <Route path="/toolbox-talks" element={<ToolboxTalksPage />} />
        <Route path="/safety/toolbox-talks" element={<ToolboxTalksPage />} />
        <Route path="/hsa-compliance" element={<HealthSafetyCompliancePage />} />
        <Route path="/compliance" element={<FMCompliancePage />} />
        <Route path="/sustainability" element={<SustainabilityManagementPage />} />
      </Routes>
    </ModuleLayout>
  );
}
