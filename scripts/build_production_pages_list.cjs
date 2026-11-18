const fs = require('fs');

const content = fs.readFileSync('client/src/pages/modules/production/ProductionHome.jsx', 'utf8');

const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<([^>\s]+)/g;
let m;
const rawRoutes = [];

while ((m = routeRegex.exec(content)) !== null) {
  if (m[2] !== 'Navigate') {
    rawRoutes.push({ subPath: m[1], component: m[2] });
  }
}

const seen = new Set();
const testablePages = [];

// Base landing
testablePages.push({
  name: 'Production Home Hub',
  path: '/production',
  component: 'ProductionLanding'
});
seen.add('/production');

for (const r of rawRoutes) {
  let sub = r.subPath;
  if (!sub.startsWith('/')) sub = '/' + sub;
  let fullPath = ('/production' + sub).replace(/\/+/g, '/');

  // Replace param placeholders
  fullPath = fullPath.replace(':id', '1');

  if (!seen.has(fullPath) && fullPath !== '/production/') {
    seen.add(fullPath);
    const friendlyName = sub
      .replace(/^\//, '')
      .replace(/\/1/, ' - Detail')
      .split('/')
      .map(part => part.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
      .join(' - ');

    testablePages.push({
      name: friendlyName || 'Production Root',
      path: fullPath,
      component: r.component
    });
  }
}

console.log(`Discovered ${testablePages.length} concrete testable Production pages.`);
fs.writeFileSync('scripts/production_concrete_pages.json', JSON.stringify(testablePages, null, 2));
console.log(testablePages);
