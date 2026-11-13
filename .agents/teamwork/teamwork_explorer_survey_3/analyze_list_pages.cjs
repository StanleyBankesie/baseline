const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files = files.concat(walk(full));
    } else if (e.name.endsWith('.jsx')) {
      files.push(full);
    }
  }
  return files;
}

const allJsx = walk('client/src/pages/modules');

const listPages = [];

for (const file of allJsx) {
  const content = fs.readFileSync(file, 'utf8');
  const isListNamed = /List\.jsx$|RegisterPage\.jsx$|BOQManager\.jsx$|SubcontractorManager\.jsx$|CostControlDashboard\.jsx$|GanttScheduleView\.jsx$/i.test(file);
  const hasTable = /<table/i.test(content);

  if (isListNamed || (hasTable && /searchTerm|search|filter/i.test(content))) {
    const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/');
    const parts = relPath.split('/');
    const moduleName = parts[4] || 'unknown';

    // Extract headers
    const thMatches = [...content.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
    const sortableMatches = [...content.matchAll(/<SortableHeader[^>]*label=["']([^"']+)["']/gi)].map(m => m[1].trim());
    const headers = [...new Set([...thMatches, ...sortableMatches])];

    // Check stats cards
    const metricCardBlocks = [...content.matchAll(/{\/\*\s*(?:Apple HIG KPI Stat Cards|Stats Cards|Metric Stats Cards|KPI Cards|KPI Summary Cards)\s*\*\/}/gi)];

    // Check filters
    const hasSearch = /searchTerm|search|Search/i.test(content) && /<input[^>]*placeholder=[^>]*search/i.test(content);
    const hasStatusFilter = /statusFilter|setStatusFilter|setStatus/i.test(content) && /<select[^>]*value={status/i.test(content);
    const hasRefresh = /RefreshCw|fetch|load/i.test(content) && /<button[^>]*title=["']Refresh/i.test(content);
    const hasViewToggle = /<ViewToggle/i.test(content);

    // Check filter arrangement pattern
    let filterPattern = "SEPARATE_TOOLBAR";
    if (/<div[^>]*className=["'][^"']*flex[^"']*items-center[^"']*gap-[^"']*>[^<]*<select[^<]*<div[^<]*<Search/i.test(content) ||
        (content.includes('<Search') && content.includes('<RefreshCw') && content.includes('selectedProjectId')) ||
        (content.includes('selectedProjectId') && content.includes('searchTerm') && !content.includes('card-header bg-brand'))) {
      filterPattern = "HEADER_RIGHT_CRAMMED";
    } else if (content.includes('card-header bg-brand') && (content.includes('placeholder="Search') || content.includes('placeholder=\'Search'))) {
      filterPattern = "BRAND_HEADER_ROW";
    } else if (!hasSearch && !hasStatusFilter) {
      filterPattern = "NO_FILTER_BAR";
    }

    // Check clutter indicators
    const clutter = [];
    if (headers.some(h => /created by/i.test(h))) clutter.push('Created By column');
    if (headers.some(h => /created (?:at|date)/i.test(h))) clutter.push('Created Date column');
    if (headers.some(h => /^active$/i.test(h)) && headers.some(h => /^status$/i.test(h))) clutter.push('Redundant Active vs Status column');
    if (headers.some(h => /barcode/i.test(h))) clutter.push('Barcode column in list table');
    if (headers.some(h => /attachment/i.test(h))) clutter.push('Separate Attachments column');
    if (metricCardBlocks.length > 1) clutter.push(`Duplicate KPI Cards (${metricCardBlocks.length} sets stacked)`);

    listPages.push({
      file: relPath,
      module: moduleName,
      name: path.basename(file),
      headersCount: headers.length,
      headers: headers.slice(0, 15),
      hasTable,
      hasViewToggle,
      hasSearch,
      hasStatusFilter,
      hasRefresh,
      filterPattern,
      kpiBlocks: metricCardBlocks.length,
      clutter
    });
  }
}

const byMod = {};
for (const p of listPages) {
  byMod[p.module] = (byMod[p.module] || 0) + 1;
}
console.log('List pages by module:\n', JSON.stringify(byMod, null, 2));

const filterSummary = {};
for (const p of listPages) {
  filterSummary[p.filterPattern] = (filterSummary[p.filterPattern] || 0) + 1;
}
console.log('Filter patterns summary:\n', JSON.stringify(filterSummary, null, 2));

const pagesWithDuplicateCards = listPages.filter(p => p.clutter.some(c => c.includes('Duplicate KPI Cards')));
console.log('\nPages with Duplicate KPI Cards:');
pagesWithDuplicateCards.forEach(p => console.log(' - ' + p.file));

const pagesWithHeaderRightCrammed = listPages.filter(p => p.filterPattern === 'HEADER_RIGHT_CRAMMED');
console.log('\nPages with HEADER_RIGHT_CRAMMED filters (' + pagesWithHeaderRightCrammed.length + '):');
pagesWithHeaderRightCrammed.forEach(p => console.log(' - ' + p.file));

fs.writeFileSync(
  path.join(__dirname, 'list_pages_analysis.json'),
  JSON.stringify(listPages, null, 2)
);
