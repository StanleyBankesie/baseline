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

const pmFiles = walk('client/src/pages/modules/project-management');
console.log('Scanning PM files:', pmFiles.length);

let modifiedCount = 0;

for (const file of pmFiles) {
  let c = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  let original = c;

  // 1. Hide subtitles in page headers
  // Patterns like:
  // <h1 ...>...</h1>\n\s*<p className="([^"]*text-slate-[^"]*)">([^<]*)</p>
  // We want to hide these subtitles: add className="hidden" or if already has className, replace with className="hidden"
  
  c = c.replace(/(<h1[^>]*>[\s\S]*?<\/h1>\s*)<p className="([^"]*)">([\s\S]*?)<\/p>/gi, (match, h1, cls, pContent) => {
    // If it's a page title header subtitle (contains text-slate, text-sm, text-xs, mt-0.5, etc.)
    if (!cls.includes('hidden')) {
      console.log(`[${path.basename(file)}] Hiding H1 subtitle: "${pContent.replace(/\s+/g, ' ').trim().slice(0, 50)}"`);
      return `${h1}<p className="${cls} hidden">${pContent}</p>`;
    }
    return match;
  });

  // Also check <h2 in top header banners
  c = c.replace(/(<div className="card-header[^>]*>[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>\s*)<p className="([^"]*)">([\s\S]*?)<\/p>/gi, (match, h2, cls, pContent) => {
    if (!cls.includes('hidden')) {
      console.log(`[${path.basename(file)}] Hiding Card-Header H2 subtitle: "${pContent.replace(/\s+/g, ' ').trim().slice(0, 50)}"`);
      return `${h2}<p className="${cls} hidden">${pContent}</p>`;
    }
    return match;
  });

  if (c !== original) {
    fs.writeFileSync(file, c, 'utf8');
    modifiedCount++;
  }
}

console.log(`Modified ${modifiedCount} files in Project Management to hide subtitles.`);
