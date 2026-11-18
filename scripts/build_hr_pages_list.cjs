const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('scripts/hr_routes.json', 'utf8'));

// Filter out wildcard and :id parameters (except replace with 1 if testing edit)
const concretePages = [];

for (const r of raw) {
  if (r.includes('*') || r.includes('?') || r.includes(':reportId')) continue;
  if (r.includes(':id')) {
    // We can test edit with id=1
    concretePages.push({ name: `Edit / Detail (${r})`, path: r.replace(':id', '1') });
  } else {
    // Generate clean display name
    const parts = r.replace('/human-resources', '').split('/').filter(Boolean);
    const cleanName = parts.length === 0 ? 'HR & Payroll Home Hub' : parts.map(p => p.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(' - ');
    concretePages.push({ name: cleanName, path: r });
  }
}

// Remove duplicates by path
const unique = [];
const seen = new Set();
for (const p of concretePages) {
  if (!seen.has(p.path)) {
    seen.add(p.path);
    unique.push(p);
  }
}

console.log('Total unique concrete HR pages:', unique.length);
fs.writeFileSync('scripts/hr_concrete_pages.json', JSON.stringify(unique, null, 2), 'utf8');
