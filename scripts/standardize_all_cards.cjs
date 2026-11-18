const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, fileList);
    } else if (file.endsWith('.jsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const standardMapReplacement = `.map((stat, i) => {
          const borderColors = [
            "border-l-sky-500",
            "border-l-blue-600",
            "border-l-amber-500",
            "border-l-emerald-500",
          ];
          const iconBgs = [
            "bg-sky-50 text-sky-600 dark:bg-slate-700 dark:text-sky-400",
            "bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-400",
            "bg-amber-50 text-amber-600 dark:bg-slate-700 dark:text-amber-400",
            "bg-emerald-50 text-emerald-600 dark:bg-slate-700 dark:text-emerald-400",
          ];
          const subtitles = [
            "Active records tracked",
            "Total registered entries",
            "Pending operational review",
            "Completed and closed entries",
          ];
          const bColor = stat.borderColor || borderColors[i % 4];
          const iBg = stat.iconBg || iconBgs[i % 4];
          const sub = stat.subtitle || subtitles[i % 4];

          return (
            <div
              key={i}
              className={\`card p-6 min-h-[160px] flex flex-col justify-between bg-white dark:bg-slate-800 border-l-4 \${bColor} shadow-xs rounded-2xl\`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                    {stat.val}
                  </p>
                </div>
                <div className={\`p-3 rounded-2xl \${iBg}\`}>
                  {stat.icon}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {sub}
              </p>
            </div>
          );
        })`;

const allFiles = walk('client/src/pages/modules');
let updatedCount = 0;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Check if file uses the stat mapping with rounded-full icon
  const mapRegex = /\.map\(\((?:stat|s),\s*i\)\s*=>\s*\(?[\s\S]*?w-11 h-11 rounded-full[\s\S]*?<\/div>\s*<\/div>\s*\)\)/;
  if (mapRegex.test(content)) {
    content = content.replace(mapRegex, standardMapReplacement);
    changed = true;

    // Check if it's inside a grid div instead of MobileMovingCarousel
    // e.g. <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"> or similar
    const gridRegex = /<div\s+className=["'](?:grid\s+grid-cols-1\s+(?:sm:grid-cols-2\s+)?md:grid-cols-4\s+gap-4(?:\s+mb-6)?|grid\s+grid-cols-1\s+md:grid-cols-4\s+gap-4)["']>/;
    if (gridRegex.test(content) && !content.includes('<MobileMovingCarousel data-page-carousel')) {
      content = content.replace(gridRegex, '<MobileMovingCarousel data-page-carousel gridColsClass="md:grid-cols-4" gapClass="gap-4">');
      
      // Also replace the closing </div> of this grid
      // Find the standardMapReplacement and the first </div> right after it
      const mapIdx = content.indexOf(standardMapReplacement);
      if (mapIdx !== -1) {
        const afterMap = content.slice(mapIdx + standardMapReplacement.length);
        const closingDivMatch = afterMap.match(/^\s*<\/div>/);
        if (closingDivMatch) {
          content = content.slice(0, mapIdx + standardMapReplacement.length) + 
                    afterMap.replace(/^\s*<\/div>/, '\n      </MobileMovingCarousel>');
        }
      }

      // Ensure MobileMovingCarousel is imported
      if (!content.includes('import MobileMovingCarousel')) {
        content = 'import MobileMovingCarousel from "@/components/MobileMovingCarousel";\n' + content;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    updatedCount++;
    console.log(`Updated: ${filePath}`);
  }
}

console.log(`\nSuccessfully standardized cards in ${updatedCount} files!`);
