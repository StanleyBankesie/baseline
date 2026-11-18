const fs = require('fs');

let f = fs.readFileSync('client/src/pages/modules/purchase/rfq/RequestForQuotationForm.jsx', 'utf8');

const target = `export default function RequestForQuotationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { hasExceptional = () => false } = usePermission();`;

const replacement = `export default function RequestForQuotationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { hasExceptional = () => false } = usePermission();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);`;

if (f.includes(target)) {
  f = f.replace(target, replacement);
  fs.writeFileSync('client/src/pages/modules/purchase/rfq/RequestForQuotationForm.jsx', f, 'utf8');
  console.log('RequestForQuotationForm.jsx state declarations added');
} else {
  console.log('Target not found in RequestForQuotationForm.jsx');
}
