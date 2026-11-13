const fs = require('fs');
const path = require('path');

const inventory = JSON.parse(fs.readFileSync(path.join(__dirname, 'buttons_inventory.json'), 'utf8'));

// Categorize button usages by module
const moduleStats = {};

inventory.forEach(b => {
  let mod = 'other';
  if (b.file.startsWith('pages/modules/')) {
    mod = b.file.split('/')[2];
  } else if (b.file.startsWith('pages/admin/')) {
    mod = 'admin';
  } else if (b.file.startsWith('pages/dashboard/')) {
    mod = 'dashboard';
  } else if (b.file.startsWith('components/')) {
    mod = 'components';
  }

  if (!moduleStats[mod]) {
    moduleStats[mod] = {
      total: 0,
      withBtnClass: 0,
      withRawClasses: 0,
      btnPrimary: 0,
      btnSecondary: 0,
      btnSuccess: 0,
      btnOutline: 0,
      btnDanger: 0,
      btnSm: 0,
      btnXs: 0,
      sampleInconsistencies: []
    };
  }

  const s = moduleStats[mod];
  s.total++;

  const cls = b.className;
  if (cls.includes('btn')) s.withBtnClass++;
  else s.withRawClasses++;

  if (cls.includes('btn-primary')) s.btnPrimary++;
  if (cls.includes('btn-secondary')) s.btnSecondary++;
  if (cls.includes('btn-success')) s.btnSuccess++;
  if (cls.includes('btn-outline')) s.btnOutline++;
  if (cls.includes('btn-danger')) s.btnDanger++;
  if (cls.includes('btn-sm')) s.btnSm++;
  if (cls.includes('btn-xs')) s.btnXs++;

  // Check for inconsistencies:
  // e.g., combining btn (min-h: 42px) with text-xs, py-1, h-8, or raw hardcoded bg-
  if (
    (cls.includes('btn') && (cls.includes('text-xs') || cls.includes('py-1') || cls.includes('h-7') || cls.includes('h-8'))) ||
    (!cls.includes('btn') && (cls.includes('bg-brand') || cls.includes('bg-blue-') || cls.includes('bg-green-') || cls.includes('bg-emerald-') || cls.includes('bg-rose-') || cls.includes('bg-red-')))
  ) {
    if (s.sampleInconsistencies.length < 5) {
      s.sampleInconsistencies.push({
        file: b.file,
        line: b.line,
        text: b.textPreview,
        className: b.className
      });
    }
  }
});

console.log('--- Module Breakdown ---');
const summary = Object.entries(moduleStats).map(([mod, data]) => ({
  module: mod,
  total: data.total,
  hasBtn: data.withBtnClass,
  rawTailwind: data.withRawClasses,
  primary: data.btnPrimary,
  secondary: data.btnSecondary,
  success: data.btnSuccess,
  outline: data.btnOutline,
  sm_xs: data.btnSm + data.btnXs
})).sort((a,b) => b.total - a.total);

console.table(summary);

// Sample inconsistencies per module
console.log('\n--- Sample Inconsistencies ---');
Object.entries(moduleStats).forEach(([mod, data]) => {
  if (data.sampleInconsistencies.length > 0) {
    console.log(`\nModule: ${mod}`);
    data.sampleInconsistencies.slice(0, 3).forEach(item => {
      console.log(`  [${item.file}:${item.line}] "${item.text}" -> class="${item.className}"`);
    });
  }
});
