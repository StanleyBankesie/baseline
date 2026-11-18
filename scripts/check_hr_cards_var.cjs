const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) res = res.concat(walk(p));
    else if (p.endsWith('.jsx')) res.push(p);
  }
  return res;
}

const files = walk('client/src/pages/modules/human-resources');

for (const f of files) {
  const c = fs.readFileSync(f, 'utf8');
  if (c.includes('val: (') && c.includes('|| []).')) {
    // extract what is before || [])
    const matches = [...c.matchAll(/val:\s*\(([a-zA-Z0-9_]+)\s*\|\|\s*\[\]\)/g)];
    const vars = [...new Set(matches.map(m => m[1]))];
    for (const v of vars) {
      // Check if v is defined in f
      const declPatterns = [
        new RegExp(`const\\s+\\[\\s*${v}\\s*,`),
        new RegExp(`let\\s+\\[\\s*${v}\\s*,`),
        new RegExp(`const\\s+${v}\\s*=`),
        new RegExp(`let\\s+${v}\\s*=`),
        new RegExp(`function\\s+.*${v}`),
        new RegExp(`use[A-Za-z0-9_]+\\([^)]*\\b${v}\\b`)
      ];
      const isDecl = declPatterns.some(p => p.test(c));
      if (!isDecl) {
        console.log(`[UNDEFINED VAR] in ${f}: variable "${v}" is not declared!`);
      }
    }
  }
}
