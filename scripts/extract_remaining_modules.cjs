const fs = require('fs');

const code = fs.readFileSync('client/src/App.jsx', 'utf8');
const regex = /path=["']([^"']+)["']/g;
let m;
const paths = [];
while ((m = regex.exec(code)) !== null) {
  paths.push(m[1]);
}
console.log('Total routes:', paths.length);
const prefixCounts = {};
paths.forEach(p => {
  const parts = p.split('/').filter(Boolean);
  const prefix = parts[0] || 'root';
  prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
});
console.log('Prefix breakdown:\n', JSON.stringify(prefixCounts, null, 2));
