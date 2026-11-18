const fs = require('fs');
let c = fs.readFileSync('client/src/pages/modules/purchase/rfq/RequestForQuotationForm.jsx', 'utf8');

c = c.replace(
  'const isEdit = Boolean(id);',
  'const isEdit = Boolean(id);\n  const [loading, setLoading] = useState(false);\n  const [error, setError] = useState("");\n  const [saving, setSaving] = useState(false);'
);

fs.writeFileSync('client/src/pages/modules/purchase/rfq/RequestForQuotationForm.jsx', c, 'utf8');
console.log('Fixed RequestForQuotationForm.jsx successfully');
