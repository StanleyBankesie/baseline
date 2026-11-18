const fs = require('fs');
let c = fs.readFileSync('client/src/pages/modules/purchase/rfq/RequestForQuotationForm.jsx', 'utf8');

c = c.replace(
  'const isEdit = Boolean(id);',
  `const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const isView = new URLSearchParams(location.search).get("mode") === "view" || location.pathname.includes("/view");`
);

fs.writeFileSync('client/src/pages/modules/purchase/rfq/RequestForQuotationForm.jsx', c, 'utf8');
console.log('Added navigate, location, and isView to RequestForQuotationForm.jsx');
