const fs = require('fs');
let code = fs.readFileSync('C:/Users/stanl/baseline/client/src/pages/modules/administration/AdministrationHome.jsx', 'utf8');

code = code.replace(
  'import DocumentTemplatesPage from "./templates/DocumentTemplatesPage.jsx";',
  'import DocumentTemplatesPage from "./templates/DocumentTemplatesPage.jsx";\nimport BackupPage from "./BackupPage.jsx";'
);

code = code.replace(
  '<Route path="/backups" element={<BackupManagement />} />',
  '<Route path="/backups" element={<BackupManagement />} />\n      <Route path="/backup-settings" element={<BackupPage />} />'
);

code = code.replace(
  'title: "Diagnostics",\n          description: "Check system health and permission issues",\n          path: "/administration/diagnostics",\n          icon: "🩺",\n          actions: [],\n        },',
  'title: "Diagnostics",\n          description: "Check system health and permission issues",\n          path: "/administration/diagnostics",\n          icon: "🩺",\n          actions: [],\n        },\n        ...(Number(user?.id) === 1 ? [{\n          title: "Backup Settings",\n          description: "Configure system database backups",\n          path: "/administration/backup-settings",\n          icon: "💾",\n          actions: [],\n        }] : []),'
);

fs.writeFileSync('C:/Users/stanl/baseline/client/src/pages/modules/administration/AdministrationHome.jsx', code);
