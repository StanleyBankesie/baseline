const fs = require('fs');
const path = require('path');

// Canonical Round-Icon Cards Template Builder (Counts/Quantities Only - Zero Monetary/Currency)
function makeStatsSnippet(dataVar, activeCond, pendingCond, completedCond, labelPrefix, iconName = 'FileText') {
  return `      {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active ${labelPrefix}",
            val: (${dataVar} || []).filter(${activeCond}).length,
            icon: <Activity size={20} className="stroke-[2.5]" />,
            color: "bg-sky-600 dark:bg-sky-500 text-white",
          },
          {
            label: "Total ${labelPrefix}",
            val: (${dataVar} || []).length,
            icon: <${iconName} size={20} className="stroke-[2.5]" />,
            color: "bg-brand-900 dark:bg-brand-700 text-white",
          },
          {
            label: "Pending ${labelPrefix}",
            val: (${dataVar} || []).filter(${pendingCond}).length,
            icon: <Clock size={20} className="stroke-[2.5]" />,
            color: "bg-amber-500 text-white",
          },
          {
            label: "Completed ${labelPrefix}",
            val: (${dataVar} || []).filter(${completedCond}).length,
            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />,
            color: "bg-emerald-600 text-white",
          },
        ].map((stat, i) => (
          <div key={i} className="card p-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                {stat.val}
              </p>
            </div>
            <div className={\`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md \${stat.color}\`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>\n`;
}

// Ensure icon imports exist in file
function ensureIcons(code, icons = ['Activity', 'Clock', 'CheckCircle2']) {
  // If lucide-react import exists
  const lucideRegex = /import\s*\{([^}]+)\}\s*from\s*["']lucide-react["'];?/;
  if (lucideRegex.test(code)) {
    return code.replace(lucideRegex, (match, currentImports) => {
      const existing = currentImports.split(',').map(s => s.trim());
      const toAdd = icons.filter(ic => !existing.includes(ic));
      if (toAdd.length === 0) return match;
      return `import { ${existing.join(', ')}, ${toAdd.join(', ')} } from "lucide-react";`;
    });
  } else {
    // Add new import at the top
    return `import { ${icons.join(', ')} } from "lucide-react";\n` + code;
  }
}

// Generic processor for a file
function processFile(filePath, config) {
  if (!fs.existsSync(filePath)) return false;
  let code = fs.readFileSync(filePath, 'utf8');

  // Check if it already has canonical round cards
  if (code.includes('rounded-full flex items-center justify-center text-white shadow-md') || code.includes('w-11 h-11 rounded-full')) {
    // Already has round cards, check for any monetary values to reverse
    let modified = false;
    if (code.includes('GH₵') || code.includes('DollarSign') || code.includes('totalBudget') || code.includes('totalAmount') || code.includes('totalValue')) {
      // replace monetary val lines
      code = code.replace(/val:\s*`GH₵[\s\S]*?`,\s*icon:\s*<DollarSign[^>]*\/>/g, 'val: (items || []).filter(x => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "DELIVERED").length,\n            icon: <CheckCircle2 size={20} className="stroke-[2.5]" />');
      modified = true;
    }
    if (modified) {
      fs.writeFileSync(filePath, code, 'utf8');
      console.log('[MODIFIED MONEY] ' + filePath);
      return true;
    }
    return false;
  }

  // Detect data array variable
  let dataVar = config.dataVar;
  if (!dataVar) {
    if (code.includes('const [items,') || code.includes('items.map(') || code.includes('items.filter(')) dataVar = 'items';
    else if (code.includes('const [records,') || code.includes('records.map(')) dataVar = 'records';
    else if (code.includes('const [list,') || code.includes('list.map(')) dataVar = 'list';
    else if (code.includes('const [rows,') || code.includes('rows.map(')) dataVar = 'rows';
    else if (code.includes('const [orders,') || code.includes('orders.map(')) dataVar = 'orders';
    else if (code.includes('const [vehicles,') || code.includes('vehicles.map(')) dataVar = 'vehicles';
    else if (code.includes('const [trips,') || code.includes('trips.map(')) dataVar = 'trips';
    else if (code.includes('const [data,') || code.includes('data.map(')) dataVar = 'data';
    else dataVar = 'items';
  }

  // Generate cards code
  const activeCond = config.activeCond || `(x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN"`;
  const pendingCond = config.pendingCond || `(x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "PENDING_APPROVAL"`;
  const completedCond = config.completedCond || `(x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "POSTED"`;
  const labelPrefix = config.label || path.basename(filePath, path.extname(filePath)).replace(/List|Page/g, '');
  const iconName = config.icon || 'FileText';

  const cardsSnippet = makeStatsSnippet(dataVar, activeCond, pendingCond, completedCond, labelPrefix, iconName);

  // Check if there is an old rectangular cards grid to replace
  const oldGridMatch = code.match(/<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/);
  
  code = ensureIcons(code, ['Activity', 'Clock', 'CheckCircle2', iconName]);

  // If there is an old cards grid, replace it
  let inserted = false;
  if (oldGridMatch && oldGridMatch[0].includes('border bg-white dark:bg-slate-800')) {
    code = code.replace(oldGridMatch[0], cardsSnippet.trim());
    inserted = true;
  } else {
    // Find injection point: before the main table container / card container
    // Typically `<div className="card">` or `<div className="card overflow-hidden` or `<div className="overflow-x-auto">`
    const targets = [
      '<div className="card">',
      '<div className="card overflow-hidden',
      '<div className="card shadow-sm',
      '<div className="bg-white dark:bg-slate-900 rounded-xl border',
      '<div className="card p-6">',
      '<div className="card-body">',
      '<div className="overflow-x-auto">'
    ];

    for (const t of targets) {
      if (code.includes(t)) {
        code = code.replace(t, cardsSnippet + '\n      ' + t);
        inserted = true;
        break;
      }
    }
  }

  if (inserted) {
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('[ADDED CARDS] ' + filePath);
    return true;
  } else {
    console.log('[SKIP - NO INJECTION POINT] ' + filePath);
    return false;
  }
}

module.exports = { processFile, ensureIcons, makeStatsSnippet };
