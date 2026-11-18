const fs = require('fs');
const path = require('path');

function searchRoutes(dir, results = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== 'node_modules' && f.name !== '.git') {
      searchRoutes(full, results);
    } else if (f.name.endsWith('.jsx')) {
      const c = fs.readFileSync(full, 'utf8');
      const matches = [...c.matchAll(/<Route\s+[^>]*path=["']([^"']+)["'][^>]*element={<\s*([A-Za-z0-9_]+)/g)];
      for (const m of matches) {
        results.push({ file: full, path: m[1], component: m[2] });
      }
    }
  }
  return results;
}

const allRoutes = searchRoutes('client/src');
console.log('Total routes found across codebase:', allRoutes.length);

const byModule = {};
for (const r of allRoutes) {
  const parts = r.path.split('/').filter(Boolean);
  const mod = parts[0] || 'root';
  if (!byModule[mod]) byModule[mod] = [];
  byModule[mod].push(r);
}

for (const [mod, routes] of Object.entries(byModule)) {
  console.log(`Module [${mod}]: ${routes.length} routes`);
}

fs.writeFileSync('scripts/all_discovered_routes.json', JSON.stringify(byModule, null, 2));
