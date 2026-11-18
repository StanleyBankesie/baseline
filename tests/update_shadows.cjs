const fs = require('fs');
let css = fs.readFileSync('client/src/styles.css', 'utf8');

// 1. Update Smoky Shadows definitions
css = css.replace(
  /\/\* Smoky Shadows:[\s\S]*?\.dark \.shadow-smoky-card:hover \{[\s\S]*?\}/,
  `/* Smoky Shadows: rich, atmospheric, deep smoky multi-stage shadow with dark diffuse spread */
  .shadow-smoky {
    box-shadow: 0 12px 28px 2px rgba(15, 23, 42, 0.18), 0 4px 12px 0 rgba(15, 23, 42, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08) !important;
  }
  .dark .shadow-smoky {
    box-shadow: 0 14px 34px 2px rgba(0, 0, 0, 0.75), 0 4px 14px 0 rgba(0, 0, 0, 0.55) !important;
  }
  .shadow-smoky-lg {
    box-shadow: 0 18px 42px 4px rgba(15, 23, 42, 0.24), 0 6px 18px 1px rgba(15, 23, 42, 0.16), 0 2px 4px rgba(0, 0, 0, 0.10) !important;
  }
  .dark .shadow-smoky-lg {
    box-shadow: 0 22px 52px 4px rgba(0, 0, 0, 0.88), 0 8px 24px 2px rgba(0, 0, 0, 0.70) !important;
  }
  .shadow-smoky-card {
    box-shadow: 0 12px 30px 2px rgba(15, 23, 42, 0.16), 0 4px 12px 0 rgba(15, 23, 42, 0.10), 0 1px 3px rgba(0, 0, 0, 0.08) !important;
  }
  .dark .shadow-smoky-card {
    box-shadow: 0 14px 36px 2px rgba(0, 0, 0, 0.75), 0 5px 16px 0 rgba(0, 0, 0, 0.55) !important;
  }
  .shadow-smoky-card:hover {
    box-shadow: 0 20px 48px 4px rgba(15, 23, 42, 0.28), 0 8px 20px 1px rgba(15, 23, 42, 0.18) !important;
  }
  .dark .shadow-smoky-card:hover {
    box-shadow: 0 24px 56px 4px rgba(0, 0, 0, 0.92), 0 10px 28px 2px rgba(0, 0, 0, 0.78) !important;
  }`
);

// 2. Also ensure all cards and stat cards in components layer get the smoky shadow
css = css.replace(
  /box-shadow: 0 10px 25px -4px rgba\(15, 23, 42, 0\.20\), 0 4px 10px -2px rgba\(15, 23, 42, 0\.10\) !important;/g,
  'box-shadow: 0 12px 30px 2px rgba(15, 23, 42, 0.16), 0 4px 12px 0 rgba(15, 23, 42, 0.10), 0 1px 3px rgba(0, 0, 0, 0.08) !important;'
);

css = css.replace(
  /box-shadow: 0 12px 30px -4px rgba\(0, 0, 0, 0\.70\), 0 4px 12px -2px rgba\(0, 0, 0, 0\.50\) !important;/g,
  'box-shadow: 0 14px 36px 2px rgba(0, 0, 0, 0.75), 0 5px 16px 0 rgba(0, 0, 0, 0.55) !important;'
);

fs.writeFileSync('client/src/styles.css', css, 'utf8');
console.log('styles.css updated successfully');
