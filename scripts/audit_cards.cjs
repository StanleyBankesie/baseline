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

const allFiles = walk('client/src/pages');

console.log('Auditing card placement and styles across', allFiles.length, 'pages...');

const misplacedCards = [];
const shortCards = [];
const oldBadgeCards = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');

  // Check if carousel or card grid is before header
  const carouselMatch = content.indexOf('<MobileMovingCarousel');
  const headerMatch = content.indexOf('card-header');
  if (carouselMatch !== -1 && headerMatch !== -1 && carouselMatch < headerMatch) {
    misplacedCards.push({ file, type: 'carousel-before-header' });
  }

  // Check card height / classes in metric cards
  if (content.includes('data-page-carousel') || content.includes('data-carousel-card')) {
    if (content.includes('min-h-[110px]') || content.includes('min-h-[120px]') || content.includes('min-h-[130px]') || content.includes('min-h-[140px]')) {
      shortCards.push(file);
    }
  }

  // Check if any metric cards still have rounded square or border-l
  if (content.match(/border-l-[2-8]/)) {
    oldBadgeCards.push({ file, issue: 'border-l' });
  }
}

console.log('Misplaced cards (carousel before header):', misplacedCards);
console.log('Short cards (< 160px min-h):', shortCards);
console.log('Pages with border-l:', oldBadgeCards);
