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

const files = getAllFiles('client/src/pages/modules');

const pagePatterns = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative('client/src/pages/modules', file).replace(/\\/g, '/');

  // Check if it's a list / register page
  if (relPath.includes('List') || relPath.includes('Register') || relPath.includes('Page') || relPath.includes('Manager')) {
    const hasListDocActions = content.includes('ListPrintIconButton') || content.includes('list-doc-action-btn');
    const hasApprovalSlot = content.includes('list-approval-');
    const hasViewToggle = content.includes('ViewToggle');
    const hasRefreshBtn = content.includes('RefreshCw') || content.includes('fetch');
    const hasHeaderCreate = content.includes('New ') || content.includes('Create ') || content.includes('Add ');
    
    // Look for button heights in this file
    const heights = [...content.matchAll(/class(?:Name)?=["'`]([^"'`]*\b(?:h-8|h-9|h-10|h-11|h-12|h-auto|py-1|py-1.5|py-2|py-2.5)\b[^"'`]*)["'`]/gi)].map(m => m[1]);

    pagePatterns.push({
      file: relPath,
      hasListDocActions,
      hasApprovalSlot,
      hasViewToggle,
      heightCount: heights.length,
      sampleHeights: heights.slice(0, 3)
    });
  }
}

console.log(`Examined ${pagePatterns.length} module list/register/pages.`);
const withListDoc = pagePatterns.filter(p => p.hasListDocActions).length;
const withApproval = pagePatterns.filter(p => p.hasApprovalSlot).length;
const withViewToggle = pagePatterns.filter(p => p.hasViewToggle).length;

console.log(`With ListDocActionIconButtons / list-doc-action-btn: ${withListDoc}`);
console.log(`With list-approval-* slot classes: ${withApproval}`);
console.log(`With ViewToggle: ${withViewToggle}`);

// List modules and their adoption of standard list action buttons
const moduleAdoption = {};
pagePatterns.forEach(p => {
  const mod = p.file.split('/')[0];
  if (!moduleAdoption[mod]) moduleAdoption[mod] = { total: 0, docActions: 0, viewToggle: 0 };
  moduleAdoption[mod].total++;
  if (p.hasListDocActions) moduleAdoption[mod].docActions++;
  if (p.hasViewToggle) moduleAdoption[mod].viewToggle++;
});

console.table(Object.entries(moduleAdoption).map(([mod, d]) => ({
  module: mod,
  totalPages: d.total,
  hasDocActions: d.docActions,
  hasViewToggle: d.viewToggle
})).sort((a,b) => b.totalPages - a.totalPages));
