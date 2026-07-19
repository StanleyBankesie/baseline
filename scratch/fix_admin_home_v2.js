const fs = require('fs');
const file = 'C:/Users/stanl/baseline/client/src/pages/modules/administration/AdministrationHome.jsx';
let code = fs.readFileSync(file, 'utf8');

// Use regex to be resilient against \r\n vs \n

if (!code.includes('import BackupPage')) {
  code = code.replace(
    /import DocumentTemplatesPage from "\.\/templates\/DocumentTemplatesPage\.jsx";\r?\n/,
    'import DocumentTemplatesPage from "./templates/DocumentTemplatesPage.jsx";\nimport BackupPage from "./BackupPage.jsx";\n'
  );
}

if (!code.includes('path="/backup-settings"')) {
  code = code.replace(
    /<Route path="\/backups" element={<BackupManagement \/>} \/>\r?\n/,
    '<Route path="/backups" element={<BackupManagement />} />\n      <Route path="/backup-settings" element={<BackupPage />} />\n'
  );
}

if (!code.includes('Backup Settings')) {
  // Inject after Diagnostics section
  const searchStr = /title:\s*"Diagnostics",\s*description:\s*"Check system health and permission issues",\s*path:\s*"\/administration\/diagnostics",\s*icon:\s*"🩺",\s*actions:\s*\[\],\s*\},/m;
  const match = code.match(searchStr);
  if (match) {
    const injectStr = `title: "Diagnostics",
          description: "Check system health and permission issues",
          path: "/administration/diagnostics",
          icon: "🩺",
          actions: [],
        },
        ...(Number(user?.id) === 1 ? [{
          title: "Backup Settings",
          description: "Configure system database backups",
          path: "/administration/backup-settings",
          icon: "💾",
          actions: [],
        }] : []),`;
    code = code.replace(match[0], injectStr);
  }
}

fs.writeFileSync(file, code);
