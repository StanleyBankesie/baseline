const fs = require('fs');
const { makeStatsSnippet, ensureIcons } = require('./batch_update_cards.cjs');

const remaining = [
  { file: 'client/src/pages/modules/finance/banking/BankReconciliationList.jsx', label: 'Reconciliations', icon: 'CheckCircle2', dataVar: 'items' },
  { file: 'client/src/pages/modules/inventory/ItemGroupsList.jsx', label: 'Item Groups', icon: 'Boxes', dataVar: 'groups' },
  { file: 'client/src/pages/modules/human-resources/recruitment/CandidatesList.jsx', label: 'Job Applicants', icon: 'UserPlus', dataVar: 'candidates' },
  { file: 'client/src/pages/modules/human-resources/recruitment/InterviewsList.jsx', label: 'Job Interviews', icon: 'Calendar', dataVar: 'interviews' },
  { file: 'client/src/pages/modules/human-resources/recruitment/OffersList.jsx', label: 'Job Offers', icon: 'FileCheck', dataVar: 'offers' },
  { file: 'client/src/pages/modules/human-resources/recruitment/RequisitionList.jsx', label: 'Job Openings', icon: 'Briefcase', dataVar: 'requisitions' },
  { file: 'client/src/pages/modules/human-resources/training/TrainingList.jsx', label: 'Training Sessions', icon: 'GraduationCap', dataVar: 'trainings' },
  { file: 'client/src/pages/modules/maintenance/assets/AssetList.jsx', label: 'Maintained Assets', icon: 'Cpu', dataVar: 'assets' },
  { file: 'client/src/pages/modules/facilities/servicebilling/ServiceBillingList.jsx', label: 'Tenant Utility Bills', icon: 'Receipt', dataVar: 'bills' }
];

for (const item of remaining) {
  if (!fs.existsSync(item.file)) continue;
  let code = fs.readFileSync(item.file, 'utf8');
  if (code.includes('rounded-full flex items-center justify-center text-white shadow-md')) {
    console.log('[ALREADY HAS CARDS] ' + item.file);
    continue;
  }

  code = ensureIcons(code, ['Activity', 'Clock', 'CheckCircle2', item.icon]);
  const activeCond = `(x) => x.status === "ACTIVE" || x.status === "IN_PROGRESS" || x.status === "OPEN"`;
  const pendingCond = `(x) => x.status === "PENDING" || x.status === "DRAFT" || x.status === "SUBMITTED" || x.status === "SCHEDULED"`;
  const completedCond = `(x) => x.status === "COMPLETED" || x.status === "APPROVED" || x.status === "CLOSED" || x.status === "HIRED" || x.status === "PAID"`;
  
  const snippet = makeStatsSnippet(item.dataVar, activeCond, pendingCond, completedCond, item.label, item.icon);

  // Find header closing div in return (
  const retIdx = code.indexOf('return (');
  if (retIdx >= 0) {
    // Look for first main header container after return (
    const afterRet = code.substring(retIdx);
    // Find pattern: after the first header flex container closing </div>
    const headerEndMatch = afterRet.match(/(<\/div>\s*<\/div>|<header[\s\S]*?<\/header>|<div className="flex[^>]*>[\s\S]*?<\/div>)/);
    if (headerEndMatch) {
      const insertPos = retIdx + headerEndMatch.index + headerEndMatch[0].length;
      code = code.substring(0, insertPos) + '\n\n' + snippet + code.substring(insertPos);
      fs.writeFileSync(item.file, code, 'utf8');
      console.log('[SUCCESS INJECTED] ' + item.file);
    } else {
      console.log('[COULD NOT LOCATE HEADER] ' + item.file);
    }
  }
}
