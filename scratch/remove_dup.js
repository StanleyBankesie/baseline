const fs = require('fs');
const file = 'C:/Users/stanl/baseline/client/src/pages/modules/administration/AdministrationHome.jsx';
let code = fs.readFileSync(file, 'utf8');

// The error showed:
// 34 |  import UserPermissions from "./access-control/UserPermissionsNew.jsx";
// 35 |  import BackupManagement from "../../admin/BackupManagement.jsx";
// 36 |  import BackupPage from "./BackupPage.jsx";
// 37 |  import AdminPermissionsPage from "../../admin/AdminPermissionsPage.jsx";

// Find all occurrences of import BackupPage
const parts = code.split('import BackupPage from "./BackupPage.jsx";');
if (parts.length > 2) {
    // Keep the first one, remove the rest
    code = parts[0] + 'import BackupPage from "./BackupPage.jsx";' + parts.slice(1).join('');
}
fs.writeFileSync(file, code);
