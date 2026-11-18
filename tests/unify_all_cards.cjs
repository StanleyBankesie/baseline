const fs = require('fs');

// 1. Update styles.css
let css = fs.readFileSync('client/src/styles.css', 'utf8');

// Ensure card hover styles match the rich smoky shadow
css = css.replace(
  /\.card:hover,[\s\S]*?box-shadow: 0 18px 40px -6px rgba\(15, 23, 42, 0\.32\)[\s\S]*?!important;\s*\}/,
  `.card:hover,
  .stat-card:hover,
  .dashboard-card:hover,
  .module-card:hover,
  .shadow-smoky-card:hover,
  .card.shadow-sm:hover,
  .card.shadow-md:hover,
  [data-carousel-card] > div:hover {
    box-shadow: 0 18px 42px 4px rgba(15, 23, 42, 0.24), 0 6px 18px 1px rgba(15, 23, 42, 0.16), 0 2px 4px rgba(0, 0, 0, 0.10) !important;
  }`
);

// Add [data-carousel-card] > div to the main card selector
css = css.replace(
  /\[data-page-carousel\] > div > div,\s*\[data-module-carousel\] > div > div\s*\{/g,
  `[data-page-carousel] > div > div,
  [data-module-carousel] > div > div,
  [data-home-carousel] > div > div,
  [data-carousel-card] > div {`
);

css = css.replace(
  /\.dark \[data-page-carousel\] > div > div,\s*\.dark \[data-module-carousel\] > div > div\s*\{/g,
  `.dark [data-page-carousel] > div > div,
  .dark [data-module-carousel] > div > div,
  .dark [data-home-carousel] > div > div,
  .dark [data-carousel-card] > div {`
);

fs.writeFileSync('client/src/styles.css', css, 'utf8');
console.log('styles.css card rules updated');

// 2. In ModuleDashboard.jsx: ensure section cards and stat cards have class "card"
let mod = fs.readFileSync('client/src/components/ModuleDashboard.jsx', 'utf8');
mod = mod.replace(
  /className="relative overflow-hidden rounded-2xl bg-white\/90 dark:bg-slate-900\/90 backdrop-blur-md p-4 sm:p-5 border border-slate-200\/80 dark:border-slate-800\/90 shadow-smoky-card/g,
  'className="card relative overflow-hidden rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800/90 shadow-smoky-card'
);
fs.writeFileSync('client/src/components/ModuleDashboard.jsx', mod, 'utf8');
console.log('ModuleDashboard.jsx card classes updated');

// 3. In HomePage.jsx: ensure all metric cards have "card"
let home = fs.readFileSync('client/src/pages/home/HomePage.jsx', 'utf8');
home = home.replace(
  /className="w-full h-full relative overflow-hidden rounded-2xl sm:rounded-\[24px\] min-h-\[185px\] sm:min-h-\[210px\] lg:min-h-0 p-5 sm:p-7 shadow-smoky-lg border/g,
  'className="card w-full h-full relative overflow-hidden rounded-2xl sm:rounded-[24px] min-h-[185px] sm:min-h-[210px] lg:min-h-0 p-5 sm:p-7 shadow-smoky-lg border'
);
fs.writeFileSync('client/src/pages/home/HomePage.jsx', home, 'utf8');
console.log('HomePage.jsx card classes updated');
