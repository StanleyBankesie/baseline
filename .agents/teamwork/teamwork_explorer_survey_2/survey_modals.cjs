const fs = require('fs');
const path = require('path');

function getAllFiles(dir, extList = ['.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, extList));
    } else if (extList.some(ext => fullPath.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = getAllFiles('client/src');
const modalFiles = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative('client/src', file).replace(/\\/g, '/');

  if (content.includes('<Modal') || content.includes('fixed inset-0') || content.includes('role="dialog"')) {
    // Look for footer buttons or submit buttons inside modal
    const footerButtons = [...content.matchAll(/<(?:button|Link)[^>]*className=["'`]([^"'`]*(?:btn|bg-|px-|rounded)[^"'`]*)["'`][^>]*>([\s\S]*?)<\/(?:button|Link)>/gi)];
    
    if (footerButtons.length > 0) {
      modalFiles.push({
        file: relPath,
        buttons: footerButtons.map(m => ({
          className: m[1].trim(),
          text: m[2].replace(/<[^>]+>/g, '').trim().slice(0, 30)
        }))
      });
    }
  }
}

console.log(`Found ${modalFiles.length} files with modal dialog structures.`);

// Analyze button classes in modals
const modalBtnClasses = {};
modalFiles.forEach(mf => {
  mf.buttons.forEach(b => {
    modalBtnClasses[b.className] = (modalBtnClasses[b.className] || 0) + 1;
  });
});

console.log('\nTop 20 button classes in Modals:');
console.table(Object.entries(modalBtnClasses).sort((a,b) => b[1] - a[1]).slice(0, 20));

// Sample custom modal footers
console.log('\nSample Modal Footers:');
modalFiles.filter(m => m.file.includes('Modal') || m.file.includes('Modal.jsx')).slice(0, 8).forEach(m => {
  console.log(`\nFile: ${m.file}`);
  m.buttons.slice(-4).forEach(b => console.log(`  "${b.text}": ${b.className}`));
});
