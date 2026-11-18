const fs = require('fs');
const path = require('path');

const files = [
  'client/src/pages/modules/project-management/claims/PaymentClaimsPage.jsx',
  'client/src/pages/modules/project-management/closure/FinalAccountPage.jsx',
  'client/src/pages/modules/project-management/closure/ProjectClosurePage.jsx',
  'client/src/pages/modules/project-management/construction/PaymentApplicationList.jsx'
];

for (const file of files) {
  let c = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const cardIdx = c.indexOf('card p-6 min-h-[160px]');
  if (cardIdx !== -1) {
    // find grid start before cardIdx
    const gridStart = c.lastIndexOf('<div className="grid', cardIdx);
    if (gridStart !== -1) {
      const gridTagEnd = c.indexOf('>', gridStart) + 1;
      const gridClassMatch = c.slice(gridStart, gridTagEnd).match(/className="([^"]+)"/);
      const gridClass = gridClassMatch ? gridClassMatch[1] : 'grid grid-cols-1 md:grid-cols-4 gap-4';
      
      // find end of grid
      // Look for </div> followed by empty line or table/workspace
      let gridClose = -1;
      const mapIdx = c.indexOf('.map(', gridStart);
      if (mapIdx !== -1 && mapIdx < cardIdx) {
        const afterMap = c.indexOf('))} \n          </div>', mapIdx) !== -1 ? c.indexOf('))} \n          </div>', mapIdx) : (c.indexOf('))}\n          </div>', mapIdx) !== -1 ? c.indexOf('))}\n          </div>', mapIdx) : c.indexOf('))}\n      </div>', mapIdx));
        if (afterMap !== -1) {
          gridClose = c.indexOf('</div>', afterMap + 3);
        }
      }
      if (gridClose === -1) {
        // Find closing div after the last card
        const lastCard = c.lastIndexOf('card p-6 min-h-[160px]');
        const nextDivClose = c.indexOf('</div>', lastCard); // closes card
        gridClose = c.indexOf('</div>', nextDivClose + 6); // closes grid
      }

      if (gridClose !== -1) {
        const inner = c.slice(gridTagEnd, gridClose).trim();
        // Replace shadow-sm with shadow-smoky-card hover:shadow-smoky-lg
        const enhancedInner = inner.replace(/shadow-sm/g, 'shadow-smoky-card hover:shadow-smoky-lg transition-all');
        const replacement = `<MobileMovingCarousel data-page-carousel gridColsClass="${gridClass.replace('grid ', '')}" gapClass="gap-4">\n          ${enhancedInner}\n        </MobileMovingCarousel>`;
        c = c.slice(0, gridStart) + replacement + c.slice(gridClose + '</div>'.length);

        if (!c.includes('import MobileMovingCarousel')) {
          c = 'import MobileMovingCarousel from "@/components/MobileMovingCarousel";\n' + c;
        }
        fs.writeFileSync(file, c, 'utf8');
        console.log(`[${path.basename(file)}] Wrapped with MobileMovingCarousel!`);
      }
    }
  }
}
