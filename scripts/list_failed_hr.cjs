const fs = require('fs');
const res = JSON.parse(fs.readFileSync('tests/qa_hr_results.json', 'utf8'));
const failed = res.filter(r => r.status === 'FAILED');
console.log('Total failed pages:', failed.length);
failed.forEach(f => {
  console.log(`[${f.index}] ${f.name} (${f.path}) => ${f.errorDetails.slice(0, 120)}`);
});
