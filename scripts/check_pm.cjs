const fs = require('fs');
const pmFiles = [];
function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = dir + '/' + f;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.jsx')) pmFiles.push(p);
  }
}
walk('client/src/pages/modules/project-management');

console.log('Searching for page title headers with subtitles in PM...');

for (const file of pmFiles) {
  const content = fs.readFileSync(file, 'utf8');
  // Match header patterns:
  // <h1 ...>...</h1>\s*<p className="...text-slate...">(.*?)</p>
  // or <div ...>\s*<h1 ...>...</h1>\s*<p ...>(.*?)</p>
  const regex = /<h1[^>]*>[\s\S]*?<\/h1>\s*(<p[^>]*>[\s\S]*?<\/p>)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    console.log(file, '=> Header subtitle found:', match[1].replace(/\s+/g, ' ').trim().slice(0, 100));
  }

  // Also check for <div className="card-header bg-brand ...">\s*<div>\s*<h1 ...>...</h1>\s*<p ...>(.*?)</p>
  // Or h2 with subtitles
  const regex2 = /<h2[^>]*>[\s\S]*?<\/h2>\s*(<p[^>]*>[\s\S]*?<\/p>)/gi;
  while ((match = regex2.exec(content)) !== null) {
    if (match[1].includes('text-slate') || match[1].includes('text-gray') || match[1].includes('text-sm') || match[1].includes('text-xs')) {
      console.log(file, '=> H2 subtitle found:', match[1].replace(/\s+/g, ' ').trim().slice(0, 100));
    }
  }
}
