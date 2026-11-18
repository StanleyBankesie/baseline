const fs = require('fs');
const path = require('path');

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) res = res.concat(walk(p));
    else if (p.endsWith('.jsx')) res.push(p);
  }
  return res;
}

const pmFiles = walk('client/src/pages/modules/project-management');

let updatedCount = 0;

for (const file of pmFiles) {
  let c = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const original = c;

  if (c.includes('card p-6 min-h-[160px]') && !c.includes('MobileMovingCarousel')) {
    const gridPrefix = '<div className="grid grid-cols-1 md:grid-cols-4 gap-4">';
    const gridIdx = c.indexOf(gridPrefix);
    if (gridIdx !== -1) {
      // Find the closing </div> of this grid
      // It wraps a .map(...) => <div ...></div>))
      const mapIdx = c.indexOf('.map(', gridIdx);
      if (mapIdx !== -1) {
        // find matching close
        const afterMap = c.indexOf('))} \n      </div>', mapIdx) !== -1 ? c.indexOf('))} \n      </div>', mapIdx) : c.indexOf('))}\n      </div>', mapIdx);
        let endIdx = -1;
        if (afterMap !== -1) {
          endIdx = c.indexOf('</div>', afterMap + 3) + '</div>'.length;
        } else {
          // general find
          const searchClose = c.indexOf('</div>\n\n      {/* Table', gridIdx);
          if (searchClose !== -1) endIdx = searchClose + '</div>'.length;
          else {
            const searchClose2 = c.indexOf('</div>\n\n      <div className="card', gridIdx);
            if (searchClose2 !== -1) endIdx = searchClose2 + '</div>'.length;
          }
        }

        if (endIdx !== -1) {
          const inner = c.slice(gridIdx + gridPrefix.length, endIdx - '</div>'.length).trim();
          const replacement = `<MobileMovingCarousel data-page-carousel gridColsClass="md:grid-cols-4" gapClass="gap-4">\n        ${inner}\n      </MobileMovingCarousel>`;
          c = c.slice(0, gridIdx) + replacement + c.slice(endIdx);
          if (!c.includes('import MobileMovingCarousel')) {
            c = 'import MobileMovingCarousel from "@/components/MobileMovingCarousel";\n' + c;
          }
          console.log(`[${path.basename(file)}] Successfully wrapped with MobileMovingCarousel`);
        }
      }
    }
  }

  if (c !== original) {
    fs.writeFileSync(file, c, 'utf8');
    updatedCount++;
  }
}

console.log(`Updated ${updatedCount} files with MobileMovingCarousel.`);
