const fs = require('fs');

const content = fs.readFileSync('client/src/pages/modules/transport/TransportLayout.jsx', 'utf8');

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

testablePages.push({
  name: 'Transport Home Hub',
  path: '/transport',
  component: 'TransportLanding'
});
seen.add('/transport');

for (const r of rawRoutes) {
  let sub = r.subPath;
  if (!sub.startsWith('/')) sub = '/' + sub;
  let fullPath = ('/transport' + sub).replace(/\/+/g, '/');

  fullPath = fullPath.replace(':id', '1');

  if (!seen.has(fullPath) && fullPath !== '/transport/') {
    seen.add(fullPath);
    const friendlyName = sub
      .replace(/^\//, '')
      .replace(/\/1/, ' - Detail')
      .split('/')
      .map(part => part.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
      .join(' - ');

    testablePages.push({
      name: friendlyName || 'Transport Root',
      path: fullPath,
      component: r.component
    });
  }
}

console.log(`Discovered ${testablePages.length} concrete testable Transport pages.`);
fs.writeFileSync('scripts/transport_concrete_pages.json', JSON.stringify(testablePages, null, 2));
console.log(testablePages.slice(0, 15));
