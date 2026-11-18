const fs = require('fs');

// 1. Update HomePage.jsx card typography
let home = fs.readFileSync('client/src/pages/home/HomePage.jsx', 'utf8');

home = home.replace(
  /mt-2 text-xs sm:text-sm font-extrabold text-white\/95 uppercase tracking-wider leading-none/g,
  'mt-2 text-sm sm:text-base font-extrabold text-white/95 uppercase tracking-wider leading-snug'
);

home = home.replace(
  /text-\[11px\] sm:text-xs font-bold uppercase tracking-wider px-2 py-0\.5 sm:px-2\.5 sm:py-1 rounded-full/g,
  'text-xs sm:text-sm font-bold uppercase tracking-wider px-2.5 py-1 rounded-full'
);

fs.writeFileSync('client/src/pages/home/HomePage.jsx', home, 'utf8');
console.log('HomePage.jsx typography updated');

// 2. Update ModuleDashboard.jsx card typography
let mod = fs.readFileSync('client/src/components/ModuleDashboard.jsx', 'utf8');

mod = mod.replace(
  /mt-2 text-xs sm:text-sm font-extrabold text-white\/95 uppercase tracking-wider leading-none/g,
  'mt-2 text-sm sm:text-base font-extrabold text-white/95 uppercase tracking-wider leading-snug'
);

mod = mod.replace(
  /text-\[11px\] sm:text-xs font-bold uppercase tracking-wider px-2 py-0\.5 sm:px-2\.5 sm:py-1 rounded-full/g,
  'text-xs sm:text-sm font-bold uppercase tracking-wider px-2.5 py-1 rounded-full'
);

// Increase section cards title and description font sizes in ModuleDashboard.jsx
mod = mod.replace(
  /className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors line-clamp-1"/g,
  'className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors line-clamp-1"'
);

mod = mod.replace(
  /className="text-\[11px\] text-slate-500 dark:text-slate-400 mt-0\.5 line-clamp-2 leading-relaxed"/g,
  'className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed"'
);

fs.writeFileSync('client/src/components/ModuleDashboard.jsx', mod, 'utf8');
console.log('ModuleDashboard.jsx typography updated');
