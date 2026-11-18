const fs = require('fs');

const shell = fs.readFileSync('client/src/layout/AppShell.jsx', 'utf8');

const regex = /path=["']([^"']+)["']\s+element=\{<([^>\s]+)/g;
let match;
const routes = [];

while ((match = regex.exec(shell)) !== null) {
  const p = match[1];
  const comp = match[2];
  if (p.startsWith('/project-management') || p.startsWith('project-management') || comp.toLowerCase().includes('project') || comp.toLowerCase().includes('pm')) {
    routes.push({ path: p.startsWith('/') ? p : '/' + p, component: comp });
  }
}

// Also check ProjectManagementHome or dedicated route files if any
console.log(`Discovered ${routes.length} PM routes in AppShell.`);
fs.writeFileSync('scripts/pm_routes.json', JSON.stringify(routes, null, 2));
console.log(routes.slice(0, 15));
