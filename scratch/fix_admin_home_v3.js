const fs = require('fs');
const file = 'C:/Users/stanl/baseline/client/src/pages/modules/administration/AdministrationHome.jsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove my previously injected Backup Settings from "Diagnostics" if it's there
const injectedBackupRegex = /\.\.\.\(Number\(user\?\.id\) === 1 \? \[\{\s*title: "Backup Settings"[\s\S]*?\}\] : \[\]\),/g;
code = code.replace(injectedBackupRegex, '');

// 2. Add imports
if (!code.includes('import AdminPermissionsPage')) {
  code = code.replace(
    /import BackupManagement from "\.\.\/\.\.\/admin\/BackupManagement\.jsx";\r?\n/,
    'import BackupManagement from "../../admin/BackupManagement.jsx";\nimport BackupPage from "./BackupPage.jsx";\nimport AdminPermissionsPage from "../../admin/AdminPermissionsPage.jsx";\n'
  );
}

// 3. Update Super Admin section
if (!code.includes('title: "Admin Permissions"')) {
  const superAdminSearch = /title:\s*"License Management",/;
  const match = code.match(superAdminSearch);
  if (match) {
    const injectStr = `title: "Admin Permissions",
          description: "Manage system admin permissions",
          path: "/administration/admin-permissions",
          icon: "🛡️",
          actions: [],
        },
        {
          title: "Backup Settings",
          description: "Configure system database backups",
          path: "/administration/backup-settings",
          icon: "💾",
          actions: [],
        },
        {
          title: "License Management",`;
    code = code.replace(match[0], injectStr);
  }
}

// 4. Update Routes
if (!code.includes('path="/admin-permissions"')) {
  const routeSearch = /<Route path="\/backups" element={<BackupManagement \/>} \/>/;
  const match = code.match(routeSearch);
  if (match) {
    const injectStr = `<Route path="/backups" element={<BackupManagement />} />
      <Route path="/admin-permissions" element={<AdminPermissionsPage />} />
      <Route path="/backup-settings" element={<BackupPage />} />`;
    code = code.replace(match[0], injectStr);
  }
}

fs.writeFileSync(file, code);
