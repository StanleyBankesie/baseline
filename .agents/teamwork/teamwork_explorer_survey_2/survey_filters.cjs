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

const files = getAllFiles('client/src/pages');

// Find files that contain filters / search / table / list
const listPages = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative('client/src', file).replace(/\\/g, '/');

  const hasSearch = content.includes('searchTerm') || content.includes('searchQuery') || content.includes('Search');
  const hasFilter = content.includes('filter') || content.includes('Filter');
  const isList = relPath.includes('List') || relPath.includes('Register') || relPath.includes('Manager') || relPath.includes('Page');

  if ((hasSearch || hasFilter) && isList) {
    // Look for filter bar container patterns (e.g. flex, grid, items-center, gap-)
    const flexMatches = [...content.matchAll(/<div[^>]*className=["'`]([^"'`]*(?:flex|grid)[^"'`]*(?:gap|items|filter|search)[^"'`]*)["'`][^>]*>/gi)];
    
    // Find all controls inside filter sections: input, select, button
    listPages.push({
      file: relPath,
      filterDivs: flexMatches.map(m => m[1].trim()).slice(0, 5)
    });
  }
}

console.log(`Found ${listPages.length} list/register pages with search/filters.`);

// Sample 15 diverse list pages and their filter container classes
console.log('\n--- Sample Filter/Search Layouts Across Modules ---');
listPages.slice(0, 20).forEach(lp => {
  console.log(`\nFile: ${lp.file}`);
  lp.filterDivs.slice(0, 3).forEach(c => console.log(`  class: "${c}"`));
});
