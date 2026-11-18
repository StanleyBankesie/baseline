const fs = require('fs');

// Fix PromotionList.jsx
{
  const file = 'client/src/pages/modules/human-resources/promotions/PromotionList.jsx';
  let c = fs.readFileSync(file, 'utf8');
  const carouselStart = c.indexOf('{/* Metric Stats Cards Carousel */}');
  const carouselEnd = c.indexOf('</MobileMovingCarousel>') + '</MobileMovingCarousel>'.length;

  const headerCardStart = c.indexOf('<div className="card">', carouselEnd);
  const headerCardEnd = c.indexOf('</div>\n\n      <div className="card">', headerCardStart) + '</div>'.length;

  if (carouselStart !== -1 && headerCardStart !== -1) {
    const carouselBlock = c.slice(carouselStart, carouselEnd);
    const headerCardBlock = c.slice(headerCardStart, headerCardEnd);
    c = c.slice(0, carouselStart) + headerCardBlock + '\n\n      ' + carouselBlock + c.slice(headerCardEnd);
    fs.writeFileSync(file, c, 'utf8');
    console.log('Fixed PromotionList.jsx');
  }
}

// Fix ReturnToStoresList.jsx
{
  const file = 'client/src/pages/modules/inventory/ReturnToStoresList.jsx';
  let c = fs.readFileSync(file, 'utf8');
  // Check where stats cards are
  const statsStart = c.indexOf('{/* Stats Cards */}');
  const statsEnd = c.indexOf('</div>\n\n      <div className="card">', statsStart) + '</div>'.length;

  const headerCardStart = c.indexOf('<div className="card">', statsEnd);
  // headerCard ends after its card-header
  const headerCardHeader = c.indexOf('<div className="card-header bg-brand">', headerCardStart);
  // find the end of this header card
  const headerCardClose = c.indexOf('</div>\n\n      <div className="card">', headerCardHeader) + '</div>'.length;

  console.log('RTS:', statsStart, statsEnd, headerCardStart, headerCardClose);
}
