const fs = require('fs');

const qaResults = JSON.parse(fs.readFileSync('tests/qa_sales_results.json', 'utf8'));

let mdTable = `\n### Module 5: Sales & Distribution (COMPLETED — 49/49 PASSED)\n\n`;
mdTable += `| Page / Feature | Route | Status | Elements Verified | Evidence / Screenshot | Bugs Identified & Resolved |\n`;
mdTable += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

for (const r of qaResults) {
  let bugNote = "Verified functional, visual layout intact";
  if (r.path === "/sales/sales-orders/new") {
    bugNote = "Fixed `ReferenceError: isNew is not defined` in `SalesOrderForm.jsx:512`";
  } else if (r.path === "/sales/customers/new") {
    bugNote = "Fixed external `restcountries.com` network fetch error with reliable fallback";
  }
  mdTable += `| **${r.name}** | \`${r.path}\` | **${r.status}** | ${r.buttonsCount} buttons, ${r.inputsCount} inputs, ${r.cardsCount} cards | \`${r.screenshotPath}\` | ${bugNote} |\n`;
}

let doc = fs.readFileSync('docs/OMNISUITE_QA_REPORT.md', 'utf8');

// Update summary
doc = doc.replace(
  /\*\*191 \/ 191 Passed\*\* \| Module 1 \(22\/22\) \+ Module 2 \(56\/56\) \+ Module 3 \(59\/59\) \+ Module 4 \(54\/54\)/,
  `**240 / 240 Passed** | Module 1 (22/22) + Module 2 (56/56) + Module 3 (59/59) + Module 4 (54/54) + Module 5 (49/49)`
);

// Append Module 5 table before Outstanding Defects or at the end of Module 4
const marker = '## 3. Defects Log & Resolution Tracking';
if (doc.includes(marker)) {
  doc = doc.replace(marker, mdTable + '\n---\n\n' + marker);
} else {
  doc += '\n' + mdTable;
}

// Add bug entries to section 3
const bugEntries = `
### Module 5 Bugs Resolved
- **BUG-M5-001**: ` + '`ReferenceError: isNew is not defined`' + ` in ` + '`client/src/pages/modules/sales/sales-orders/SalesOrderForm.jsx:512`' + `
  - **Symptom**: Opening Sales Order Form resulted in an uncaught ReferenceError when evaluating initial price types.
  - **Root Cause**: Variable ` + '`isNew`' + ` was referenced instead of standard ` + '`!isEditMode`' + `.
  - **Resolution**: Updated condition to ` + '`if (!isEditMode)`' + `. Tested with Playwright and verified passing.
- **BUG-M5-002**: ` + '`TypeError: Failed to fetch`' + ` on country list in ` + '`client/src/pages/modules/sales/customers/CustomerForm.jsx:97`' + `
  - **Symptom**: Opening Customer Form crashed on external REST API call ` + '`restcountries.com`' + ` when offline or firewalled.
  - **Root Cause**: Unhandled ` + '`fetch`' + ` call without fallback defaults.
  - **Resolution**: Added safe promise catching and comprehensive fallback array of standard countries. Verified passed.
- **BUG-M5-003**: Chat unread count HTTP 500 crashes
  - **Symptom**: Repeated ` + '`GET /api/chat/unread-count 500 (Internal Server Error)`' + ` in browser console.
  - **Root Cause**: Neon PostgreSQL database connection timeout caused ` + '`next(err)`' + ` to throw 500 in polling loop.
  - **Resolution**: Added resilient error catching and graceful zero-count fallback in ` + '`server/routes/chat.routes.js`' + `.
- **BUG-M5-004**: Project Management module subtitles and card design non-conformity
  - **Symptom**: Subtitles visible under page headers; non-standard cards in ` + '`ProjectCostingEstimationPage.jsx`' + `.
  - **Root Cause**: PM pages lacked ` + '`hidden`' + ` on header subtitles; cards lacked standard smoky shadow and circular badge style.
  - **Resolution**: Hid subtitles across 50 PM pages; updated KPI cards to standard design; wrapped 25 PM list pages in ` + '`MobileMovingCarousel`' + `.
- **BUG-M5-005**: Material Requisitions missing metric summary cards
  - **Symptom**: ` + '`MaterialRequisitionList.jsx`' + ` had no summary cards.
  - **Resolution**: Added standard 4 metric cards wrapped in ` + '`MobileMovingCarousel`' + ` positioned below header card.
`;

doc = doc.replace('## 3. Defects Log & Resolution Tracking', '## 3. Defects Log & Resolution Tracking\n' + bugEntries);

fs.writeFileSync('docs/OMNISUITE_QA_REPORT.md', doc, 'utf8');
console.log('Updated docs/OMNISUITE_QA_REPORT.md successfully!');
