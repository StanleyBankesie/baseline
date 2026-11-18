const fs = require('fs');
const content = fs.readFileSync('client/src/App.jsx', 'utf8');
const routes = [];
const regex = /<Route\s+[^>]*path=["']([^"']+)["'][^>]*element=\{<([^ />]+)/g;
let m;
while ((m = regex.exec(content)) !== null) {
  if (m[1].includes('admin') || m[1].includes('role') || m[1].includes('activit') || m[1].includes('audit') || m[1].includes('permission')) {
    routes.push({ path: m[1], component: m[2] });
  }
}
console.log('Admin routes in App.jsx:', JSON.stringify(routes, null, 2));
