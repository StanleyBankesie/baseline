const fs = require('fs');

const content = fs.readFileSync('client/src/pages/modules/finance/FinanceRoutes.jsx', 'utf8');
const regex = /<Route\s+path=["']([^"']+)["']/g;
const routes = [];
let m;
while ((m = regex.exec(content)) !== null) {
  if (m[1] !== '*') {
    routes.push('/finance/' + m[1].replace(/^\//, ''));
  }
}

// Add the root
routes.unshift('/finance');
routes.push('/finance/dashboard');

// Deduplicate
const uniqueRoutes = [...new Set(routes)];
console.log('Total unique Finance routes:', uniqueRoutes.length);
console.log(JSON.stringify(uniqueRoutes, null, 2));
