const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('client/src');

function getAllFiles(dir, extList = ['.jsx', '.js']) {
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

const files = getAllFiles(srcDir);
console.log(`Found ${files.length} source files to inspect.`);

// Regex patterns to capture buttons and their classNames
// Also Link components styled as buttons
const buttonRegex = /<(button|Link)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const selfClosingButtonRegex = /<(button|Link)\b([^>]*)\/>/gi;

const buttonUsages = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative('client/src', file).replace(/\\/g, '/');

  let match;
  // standard tags
  const regex = /<(button|Link)\b([^>]*)>/gi;
  while ((match = regex.exec(content)) !== null) {
    const tag = match[1];
    const attrs = match[2];

    // Find line number
    const line = content.substring(0, match.index).split('\n').length;

    // extract className
    const classMatch = attrs.match(/className=(?:\{`([^`]+)`\}|"([^"]+)"|\{['"]([^'"]+)['"]\})/);
    const className = classMatch ? (classMatch[1] || classMatch[2] || classMatch[3] || '').trim() : '';

    // Only include Link if it has button-like styling or classes
    if (tag === 'Link' && !className.includes('btn') && !className.includes('button') && !className.includes('rounded-') && !className.includes('bg-')) {
      continue;
    }

    // extract text / children preview
    const afterTag = content.substring(match.index + match[0].length, match.index + match[0].length + 120);
    const textPreview = afterTag.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);

    buttonUsages.push({
      file: relPath,
      line,
      tag,
      className,
      textPreview,
      attrs: attrs.replace(/\s+/g, ' ').trim()
    });
  }
}

console.log(`Captured ${buttonUsages.length} button/action elements.`);

// Analysis aggregates
const classFrequency = {};
const heightFrequency = {};
const paddingYFrequency = {};
const paddingXFrequency = {};
const fontSizeFrequency = {};
const roundedFrequency = {};
const btnVariantFrequency = {};

buttonUsages.forEach(b => {
  const cls = b.className;
  const tokens = cls.split(/\s+/).filter(Boolean);

  tokens.forEach(t => {
    if (t.startsWith('h-') || t.startsWith('min-h-')) {
      heightFrequency[t] = (heightFrequency[t] || 0) + 1;
    }
    if (t.startsWith('py-')) {
      paddingYFrequency[t] = (paddingYFrequency[t] || 0) + 1;
    }
    if (t.startsWith('px-') || t.startsWith('p-')) {
      paddingXFrequency[t] = (paddingXFrequency[t] || 0) + 1;
    }
    if (t.startsWith('text-')) {
      fontSizeFrequency[t] = (fontSizeFrequency[t] || 0) + 1;
    }
    if (t.startsWith('rounded')) {
      roundedFrequency[t] = (roundedFrequency[t] || 0) + 1;
    }
    if (t.startsWith('btn') || t.includes('btn-')) {
      btnVariantFrequency[t] = (btnVariantFrequency[t] || 0) + 1;
    }
  });
});

console.log('\n--- Button Variant Classes ---');
console.table(Object.entries(btnVariantFrequency).sort((a,b) => b[1] - a[1]).slice(0, 25));

console.log('\n--- Height Classes ---');
console.table(Object.entries(heightFrequency).sort((a,b) => b[1] - a[1]).slice(0, 25));

console.log('\n--- Vertical Padding (py-) Classes ---');
console.table(Object.entries(paddingYFrequency).sort((a,b) => b[1] - a[1]).slice(0, 20));

console.log('\n--- Horizontal Padding (px-) Classes ---');
console.table(Object.entries(paddingXFrequency).sort((a,b) => b[1] - a[1]).slice(0, 20));

console.log('\n--- Font Size Classes ---');
console.table(Object.entries(fontSizeFrequency).sort((a,b) => b[1] - a[1]).filter(([k]) => ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-2xl', 'text-[11px]', 'text-[10px]', 'text-[13px]'].includes(k)).sort((a,b) => b[1] - a[1]));

console.log('\n--- Rounded Classes ---');
console.table(Object.entries(roundedFrequency).sort((a,b) => b[1] - a[1]).slice(0, 15));

// Save detailed JSON for further analysis
fs.writeFileSync(path.join(__dirname, 'buttons_inventory.json'), JSON.stringify(buttonUsages, null, 2));
console.log(`Saved inventory to buttons_inventory.json`);
