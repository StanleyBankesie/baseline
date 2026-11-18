const fs = require('fs');

const file = 'client/src/pages/modules/inventory/ReturnToStoresList.jsx';
let c = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const statsCardsIdx = c.indexOf('{/* Stats Cards */}');
const carouselStart = c.indexOf('{/* Metric Stats Cards Carousel */}');
const carouselEnd = c.indexOf('</MobileMovingCarousel>') + '</MobileMovingCarousel>'.length;
const carouselBlock = c.slice(carouselStart, carouselEnd);

const headerCardStart = c.indexOf('<div className="card">\n        <div className="card-header bg-brand text-white rounded-t-lg p-4">');
const headerCardClose = c.indexOf('</div>\n        <div className="card-body p-0">', headerCardStart);

const headerCardContent = c.slice(headerCardStart, headerCardClose);

const newHeaderAndCarousel = `${headerCardContent}
        </div>
      </div>

      ${carouselBlock}

      <div className="card">`;

const afterHeaderCard = c.slice(headerCardClose + '</div>\n        '.length);

c = c.slice(0, statsCardsIdx) + newHeaderAndCarousel + '\n        ' + afterHeaderCard;
fs.writeFileSync(file, c, 'utf8');
console.log('Fixed ReturnToStoresList.jsx successfully!');
