const fs = require('fs');

const content = fs.readFileSync('client/src/pages/modules/project-management/ProjectManagementHome.jsx', 'utf8');

// Also check for sub-navigation, links, or routes
const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<([^>\s]+)/g;
let m;
const routes = [];

while ((m = routeRegex.exec(content)) !== null) {
  routes.push({ subPath: m[1], component: m[2] });
}

console.log('Total routes in ProjectManagementHome:', routes.length);
console.log(routes);

// Also extract links
const linkRegex = /to=["'](\/project-management[^"']*)["']/g;
const links = new Set();
while ((m = linkRegex.exec(content)) !== null) {
  links.add(m[1]);
}
console.log('Total links in ProjectManagementHome:', links.size);
console.log(Array.from(links));
