import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '../../');
export const CLIENT_DIR = path.resolve(ROOT_DIR, 'client');
export const SRC_DIR = path.resolve(CLIENT_DIR, 'src');

export const VIEWPORTS = {
  mobile_se: { width: 375, height: 667, name: 'iPhone SE' },
  mobile_boundary: { width: 767, height: 1024, name: 'Mobile Boundary' },
  mobile_stress: { width: 320, height: 568, name: 'iPhone 5 (320px)' },
  tablet_boundary: { width: 768, height: 1024, name: 'Tablet Boundary' },
  tablet_landscape: { width: 1024, height: 768, name: 'iPad Landscape' },
  desktop: { width: 1280, height: 800, name: 'Desktop Standard' },
  desktop_large: { width: 1440, height: 900, name: 'MacBook Pro 15"' },
  desktop_fhd: { width: 1920, height: 1080, name: 'Full HD' },
  desktop_ultrawide: { width: 2560, height: 1440, name: 'Ultra-Wide 1440p' }
};

export const BRAND_TOKENS = {
  primaryDeepTealHex: '#0E3646',
  primaryDeepTealRgb: 'rgb(14, 54, 70)',
  primaryHoverRgb: 'rgb(23, 61, 80)',
  secondaryDarkBgRgb: 'rgb(30, 41, 59)',
  secondaryBorderRgb: 'rgb(226, 232, 240)',
  dangerBgRgb: 'rgb(225, 29, 72)',
  radiusXl: '12px',
  radiusLg: '8px',
  heightBase: 42,
  heightCompact: 36,
  heightMicro: 30
};

export const TARGET_FILES = {
  stylesCss: path.resolve(SRC_DIR, 'styles.css'),
  moduleLayout: path.resolve(SRC_DIR, 'components/ModuleLayout.jsx'),
  moduleDashboard: path.resolve(SRC_DIR, 'components/ModuleDashboard.jsx'),
  documentRegister: path.resolve(SRC_DIR, 'pages/modules/project-management/construction/DocumentRegisterPage.jsx'),
  boqManager: path.resolve(SRC_DIR, 'pages/modules/project-management/construction/BOQManager.jsx'),
  salesOrders: path.resolve(SRC_DIR, 'pages/modules/sales/sales-orders/SalesOrderList.jsx'),
  salesInvoices: path.resolve(SRC_DIR, 'pages/modules/sales/invoices/InvoiceList.jsx'),
  purchaseOrders: path.resolve(SRC_DIR, 'pages/modules/purchase/purchase-orders-local/PurchaseOrdersLocalList.jsx'),
  purchaseBills: path.resolve(SRC_DIR, 'pages/modules/purchase/bills/PurchaseBillsList.jsx'),
  journalVouchers: path.resolve(SRC_DIR, 'pages/modules/finance/JournalVoucherList.jsx'),
  employees: path.resolve(SRC_DIR, 'pages/modules/human-resources/employees/EmployeeList.jsx'),
  equipment: path.resolve(SRC_DIR, 'pages/modules/maintenance/equipment/EquipmentList.jsx'),
  items: path.resolve(SRC_DIR, 'pages/modules/inventory/ItemsList.jsx'),
  projects: path.resolve(SRC_DIR, 'pages/modules/project-management/projects/ProjectList.jsx'),
  dailyReports: path.resolve(SRC_DIR, 'pages/modules/project-management/construction/DailySiteReportList.jsx'),
  assetRegister: path.resolve(SRC_DIR, 'pages/modules/asset-management/AssetRegisterList.jsx')
};
