const fs = require('fs');
const c = fs.readFileSync('client/src/data/modulesRegistry.js', 'utf8');
const matches = [...c.matchAll(/id:\s*["']([^"']+)["'],\s*name:\s*["']([^"']+)["']/g)];
console.log('Total modules in registry:', matches.length);
matches.forEach((m, idx) => console.log(`${idx + 1}. [${m[1]}] ${m[2]}`));
