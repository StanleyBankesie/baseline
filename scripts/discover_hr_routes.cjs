const fs = require('fs');

const c = fs.readFileSync('client/src/pages/modules/human-resources/HumanResourcesHome.jsx', 'utf8');

// Find all Route tags: <Route path="..." ... />
const routeMatches = [...c.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map(m => m[1]);

// Also find all buildFeature / to= links in HumanResourcesHome
const linkMatches = [...c.matchAll(/["'](\/human-resources\/[^"']+)["']/g)].map(m => m[1]);

const all = new Set();
all.add('/human-resources');

routeMatches.forEach(r => {
  if (r.startsWith('/')) all.add(r);
  else all.add('/human-resources/' + r.replace(/^\//, ''));
});

linkMatches.forEach(l => all.add(l));

console.log('Total discovered HR routes:', all.size);
const sorted = Array.from(all).sort();
sorted.forEach((r, idx) => console.log(`${idx + 1}. ${r}`));

fs.writeFileSync('scripts/hr_routes.json', JSON.stringify(sorted, null, 2), 'utf8');
