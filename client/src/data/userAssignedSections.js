/**
 * Functional Sections Registry
 * Defines the real functional sections and page groupings per module.
 * Used for Granular Licensing in LicenseManagement and Role Permission Setup.
 */

export const MODULE_SECTIONS = {
  pos: [
    {
      title: "Transactions & Register",
      icon: "💳",
      features: [
        { key: "sales-entry", label: "Sales Entry", path: "/pos/sales-entry" },
        { key: "day-management", label: "Start/End Business Day", path: "/pos/day-management" },
        { key: "register", label: "POS Register", path: "/pos/register" },
        { key: "invoices", label: "POS Invoices", path: "/pos/invoices" },
        { key: "returns", label: "POS Returns", path: "/pos/returns" },
        { key: "on-hold", label: "On-Hold Sales", path: "/pos/holds" },
      ],
    },
    {
      title: "Direct Procurement",
      icon: "⚡",
      features: [
        { key: "direct-purchase", label: "Direct Purchase", path: "/pos/direct-purchase" },
      ],
    },
    {
      title: "Store Inventory",
      icon: "📦",
      features: [
        { key: "items", label: "Store Inventory", path: "/pos/store-inventory" },
      ],
    },
    {
      title: "Finance & Cash Desk",
      icon: "💵",
      features: [
        { key: "cash-collection", label: "Cash Collection", path: "/pos/cash-collection" },
        { key: "post-to-finance", label: "Post to Finance", path: "/pos/post-to-finance" },
        { key: "reconciliation", label: "Sync Reconciliation", path: "/pos/reconciliation" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "reports", label: "POS Reports", path: "/pos/reports" },
        { key: "customer-history", label: "Customer Accounts", path: "/pos/customer-history" },
        { key: "dashboard", label: "POS Dashboard", path: "/pos/dashboard" },
        { key: "pos-today-sales", label: "Today Sales", type: "dashboard" },
        { key: "pos-total-transactions", label: "Total Transactions", type: "dashboard" },
        { key: "pos-avg-order", label: "Average Order Value", type: "dashboard" },
      ],
    },
    {
      title: "Setup",
      icon: "⚙️",
      features: [
        { key: "setup", label: "POS Setup", path: "/pos/setup" },
      ],
    },
  ],

  sales: [
    {
      title: "Orders & Delivery",
      icon: "📑",
      features: [
        { key: "quotations", label: "Quotations", path: "/sales/quotations" },
        { key: "sales-orders", label: "Sales Orders", path: "/sales/sales-orders" },
        { key: "invoices", label: "Invoices", path: "/sales/invoices" },
        { key: "delivery", label: "Delivery Management", path: "/sales/delivery" },
        { key: "returns", label: "Sales Returns", path: "/sales/returns" },
        { key: "sales-upload", label: "Sales Upload", path: "/sales/sales-upload", isExclusive: true },
      ],
    },
    {
      title: "Customer Directory",
      icon: "👥",
      features: [
        { key: "customers", label: "Customer Management", path: "/sales/customers" },
        { key: "customer-credit", label: "Customer Credit", path: "/sales/customer-credit" },
        { key: "bulk-upload", label: "Bulk Customer Upload", path: "/sales/bulk-upload" },
        { key: "prospect-customers", label: "Prospective Customers", path: "/sales/prospect-customers" },
        { key: "prospect-conversion", label: "Prospect Conversion", path: "/sales/prospect-conversion" },
      ],
    },
    {
      title: "Pricing & Discounts",
      icon: "🏷️",
      features: [
        { key: "price-setup", label: "Price Setup", path: "/sales/price-setup" },
        { key: "discount-schemes", label: "Discount Schemes", path: "/sales/discount-schemes" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "accountsreceivableagingreport", label: "Accounts Receivable Aging Report" },
        { key: "cancelledordersreport", label: "Cancelled Orders Report" },
        { key: "customerhistoryreport", label: "Customer History Report" },
        { key: "customerlistreport", label: "Customer List Report" },
        { key: "customerorderhistoryreport", label: "Customer Order History Report" },
        { key: "debtorsbalancereport", label: "Debtors Balance Report" },
        { key: "deliveryregisterreport", label: "Delivery Register Report" },
        { key: "discountutilizationreport", label: "Discount Utilization Report" },
        { key: "invoicesummaryreport", label: "Invoice Summary Report" },
        { key: "monthlysalestrendreport", label: "Monthly Sales Trend Report" },
        { key: "pricelistreport", label: "Price List Report" },
        { key: "prospectivecustomerlistreport", label: "Prospective Customer List Report" },
        { key: "quotationconversionreport", label: "Quotation Conversion Report" },
        { key: "quotationsummaryreport", label: "Quotation Summary Report" },
        { key: "revenuebycustomerreport", label: "Revenue By Customer Report" },
        { key: "revenuebyproductreport", label: "Revenue By Product Report" },
        { key: "salesorderstatusreport", label: "Sales Order Status Report" },
        { key: "salesprofitabilityreport", label: "Sales Profitability Report" },
        { key: "salesregisterreport", label: "Sales Register Report" },
        { key: "salesreturnreport", label: "Sales Return Report" },
        { key: "salestrackingreport", label: "Sales Tracking Report" },
        { key: "sales-total-revenue", label: "Total Revenue This Month", type: "dashboard" },
        { key: "sales-avg-sales-this-month", label: "Average Sales This Month", type: "dashboard" },
        { key: "sales-pending-orders", label: "Pending Orders", type: "dashboard" },
        { key: "sales-active-customers", label: "Active Customers", type: "dashboard" },
      ],
    },
    {
      title: "Setup",
      icon: "⚙️",
      features: [
        { key: "setup", label: "Sales Setup", path: "/sales/setup" },
      ],
    },
  ],

  purchase: [
    {
      title: "Procurement & Sourcing",
      icon: "🛒",
      features: [
        { key: "direct-purchase", label: "Direct Purchase", path: "/purchase/direct-purchase" },
        { key: "general-requisitions", label: "General Requisition", path: "/purchase/general-requisitions" },
        { key: "rfqs", label: "Request for Quotation", path: "/purchase/rfqs" },
        { key: "supplier-quotations", label: "Supplier Quotations", path: "/purchase/supplier-quotations" },
        { key: "quotation-analysis", label: "Quotation Analysis", path: "/purchase/quotation-analysis" },
        { key: "purchase-orders-local", label: "Local Purchase Orders", path: "/purchase/purchase-orders-local" },
        { key: "purchase-orders-import", label: "Import Purchase Orders", path: "/purchase/purchase-orders-import" },
        { key: "service-requests", label: "Service Requests (Procurement)", path: "/purchase/service-requests" },
        { key: "service-confirmations", label: "Service Confirmations", path: "/purchase/service-confirmations" },
      ],
    },
    {
      title: "Logistics & Clearance",
      icon: "🚢",
      features: [
        { key: "shipping-advice", label: "Shipping Advice", path: "/purchase/shipping-advice" },
        { key: "port-clearances", label: "Port Clearances", path: "/purchase/port-clearances" },
      ],
    },
    {
      title: "Billing & Invoicing",
      icon: "🧾",
      features: [
        { key: "purchase-bills-local", label: "Local Purchase Bills", path: "/purchase/purchase-bills-local" },
        { key: "purchase-bills-import", label: "Import Purchase Bills", path: "/purchase/purchase-bills-import" },
        { key: "service-bills", label: "Service Bills", path: "/purchase/service-bills" },
        { key: "purchase-upload", label: "Purchase Upload", path: "/purchase/purchase-upload", isExclusive: true },
      ],
    },
    {
      title: "Suppliers & Returns",
      icon: "🤝",
      features: [
        { key: "suppliers", label: "Suppliers", path: "/purchase/suppliers" },
        { key: "purchase-returns", label: "Purchase Returns", path: "/purchase/purchase-returns" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "cancelledpurchaseordersreport", label: "Cancelled Purchase Orders Report" },
        { key: "departmentpurchaseanalysisreport", label: "Department Purchase Analysis Report" },
        { key: "importcostbreakdownreport", label: "Import Cost Breakdown Report" },
        { key: "importorderlistreport", label: "Import Order List Report" },
        { key: "importordertrackingreport", label: "Import Order Tracking Report" },
        { key: "itempurchasehistoryreport", label: "Item Purchase History Report" },
        { key: "leadtimeanalysisreport", label: "Lead Time Analysis Report" },
        { key: "localordertrackingreport", label: "Local Order Tracking Report" },
        { key: "pendinggrntobillimportreport", label: "Pending Grn To Bill Import Report" },
        { key: "pendinggrntobilllocalreport", label: "Pending Grn To Bill Local Report" },
        { key: "pendingshipmentdetailsreport", label: "Pending Shipment Details Report" },
        { key: "pricevariancereport", label: "Price Variance Report" },
        { key: "purchaseagingreport", label: "Purchase Aging Report" },
        { key: "purchaseregisterreport", label: "Purchase Register Report" },
        { key: "purchasereturnsanalysisreport", label: "Purchase Returns Analysis Report" },
        { key: "purchasetrackingreport", label: "Purchase Tracking Report" },
        { key: "supplieroutstandingpayablesreport", label: "Supplier Outstanding Payables Report" },
        { key: "supplierperformancereport", label: "Supplier Performance Report" },
        { key: "supplierquotationanalysisreport", label: "Supplier Quotation Analysis Report" },
        { key: "purchase-total-value", label: "Total Purchase Value", type: "dashboard" },
        { key: "purchase-pending-pos", label: "Pending POs", type: "dashboard" },
        { key: "purchase-active-suppliers", label: "Active Suppliers", type: "dashboard" },
      ],
    },
    {
      title: "Setup",
      icon: "⚙️",
      features: [
        { key: "setup", label: "Purchase Setup", path: "/purchase/setup" },
      ],
    },
  ],

  inventory: [
    {
      title: "Stock Operations",
      icon: "🔄",
      features: [
        { key: "material-requisitions", label: "Material Requisitions", path: "/inventory/material-requisitions" },
        { key: "stock-updation", label: "Stock Updation", path: "/inventory/stock-updation" },
        { key: "stock-adjustments", label: "Stock Adjustment", path: "/inventory/stock-adjustments" },
        { key: "stock-transfers", label: "Stock Transfer", path: "/inventory/stock-transfers" },
        { key: "stock-verification", label: "Stock Verification", path: "/inventory/stock-verification" },
        { key: "return-to-stores", label: "Return to Stores Advice", path: "/inventory/return-to-stores" },
        { key: "issue-to-requirement", label: "Issue to Requirement Area", path: "/inventory/issue-to-requirement" },
        { key: "transfer-acceptance", label: "Transfer Acceptance", path: "/inventory/transfer-acceptance" },
        { key: "grn-local", label: "Material Receipt (GRN) - Local", path: "/inventory/grn-local" },
        { key: "grn-import", label: "Material Receipt (GRN) - Import", path: "/inventory/grn-import" },
        { key: "stock-taking", label: "Stock Taking", path: "/inventory/stock-taking" },
        { key: "stock-reorder", label: "Stock Reorder", path: "/inventory/stock-reorder" },
        { key: "stock-upload", label: "Stock Upload", path: "/inventory/stock-upload", isExclusive: true },
      ],
    },
    {
      title: "Catalog & Warehouses",
      icon: "📦",
      features: [
        { key: "items", label: "Item Management", path: "/inventory/items" },
        { key: "item-classification", label: "Item Classification", path: "/inventory/item-groups" },
        { key: "unit-conversions", label: "Unit Conversion", path: "/inventory/unit-conversions" },
        { key: "warehouses", label: "Warehouse Management", path: "/inventory/warehouses" },
        { key: "batches", label: "Item Batches Tracking", path: "/inventory/batches" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "fastmovingreport", label: "Fast Moving Report" },
        { key: "issueregisterreport", label: "Issue Register Report" },
        { key: "materialreturnreport", label: "Material Return Report" },
        { key: "nonmovingreport", label: "Non Moving Report" },
        { key: "slowmovingreport", label: "Slow Moving Report" },
        { key: "stockadjustmentreport", label: "Stock Adjustment Report" },
        { key: "stockaginganalysisreport", label: "Stock Aging Analysis Report" },
        { key: "stockbalancesreport", label: "Stock Balances Report" },
        { key: "stocktransferregisterreport", label: "Stock Transfer Register Report" },
        { key: "stockvaluereport", label: "Stock Value Report" },
        { key: "stockverificationreport", label: "Stock Verification Report" },
        { key: "inventory-total-items", label: "Total Items", type: "dashboard" },
        { key: "inventory-low-stock", label: "Low Stock Alerts", type: "dashboard" },
        { key: "inventory-warehouses", label: "Active Warehouses", type: "dashboard" },
      ],
    },
  ],

  finance: [
    {
      title: "Vouchers & Transactions",
      icon: "🧾",
      features: [
        { key: "journal-voucher", label: "Journal Entry", path: "/finance/journal-voucher" },
        { key: "payment-voucher", label: "Make Payment", path: "/finance/payment-voucher" },
        { key: "receipt-voucher", label: "Receive Payment", path: "/finance/receipt-voucher" },
        { key: "contra-voucher", label: "Contra Entry", path: "/finance/contra-voucher" },
        { key: "credit-note", label: "Credit Note", path: "/finance/credit-note" },
        { key: "debit-note", label: "Debit Note", path: "/finance/debit-note" },
        { key: "sales-voucher", label: "Sales Voucher", path: "/finance/sales-voucher" },
        { key: "purchase-voucher", label: "Purchase Voucher", path: "/finance/purchase-voucher" },
        { key: "pdc-postings", label: "Post-Dated Cheques", path: "/finance/pdc-postings" },
        { key: "opening-balances", label: "Opening Balances", path: "/finance/opening-balances", isExclusive: true },
        { key: "import-vouchers", label: "Import Vouchers", path: "/finance/import-vouchers", isExclusive: true },
      ],
    },
    {
      title: "Banking & Treasury",
      icon: "🏦",
      features: [
        { key: "bank-reconciliation", label: "Bank Reconciliation", path: "/finance/bank-reconciliation" },
        { key: "budget", label: "Budget Management", path: "/finance/budget" },
        { key: "fixed-assets", label: "Fixed Assets", path: "/finance/fixed-assets" },
      ],
    },
    {
      title: "Master Setup",
      icon: "⚙️",
      features: [
        { key: "chart-of-accounts", label: "Chart of Accounts", path: "/finance/chart-of-accounts" },
        { key: "account-groups", label: "Account Groups", path: "/finance/account-groups" },
        { key: "cost-centers", label: "Cost Centers", path: "/finance/cost-centers" },
        { key: "tax-codes", label: "Tax Codes & Deductions", path: "/finance/tax-codes" },
        { key: "currencies", label: "Currencies", path: "/finance/currencies" },
        { key: "fiscal-years", label: "Fiscal Years", path: "/finance/fiscal-years" },
        { key: "setup", label: "Finance Setup", path: "/finance/setup" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "audittrailreport", label: "Audit Trail Report" },
        { key: "balancesheetreport", label: "Balance Sheet Report" },
        { key: "cashflowreport", label: "Cash Flow Report" },
        { key: "chartofaccountsreport", label: "Chart Of Accounts Report" },
        { key: "creditorsledgerreport", label: "Creditors Ledger Report" },
        { key: "customeroutstandingreport", label: "Customer Outstanding Report" },
        { key: "debtorsledgerreport", label: "Debtors Ledger Report" },
        { key: "generalledgerreport", label: "General Ledger Report" },
        { key: "journalreport", label: "Journal Report" },
        { key: "outstandingreceivablereport", label: "Outstanding Receivable Report" },
        { key: "paymentduereport", label: "Payment Due Report" },
        { key: "profitandlossreport", label: "Profit And Loss Report" },
        { key: "profitlossocireport", label: "Statement of Profit or Loss and Other Comprehensive Income" },
        { key: "ratioanalysisreport", label: "Ratio Analysis Report" },
        { key: "supplieroutstandingreport", label: "Supplier Outstanding Report" },
        { key: "trialbalancereport", label: "Trial Balance Report" },
        { key: "voucherregisterreport", label: "Voucher Register Report" },
        { key: "budgetvsactualreport", label: "Budget vs Actual Report" },
      ],
    },
  ],

  administration: [
    {
      title: "Access Control",
      icon: "🔐",
      features: [
        { key: "roles", label: "Role Setup", path: "/administration/access/roles" },
        { key: "user-permissions", label: "User Permissions", path: "/administration/access/user-permissions" },
        { key: "user-overrides", label: "Exceptional Permissions", path: "/administration/access/user-overrides" },
      ],
    },
    {
      title: "Users & Settings",
      icon: "⚙️",
      features: [
        { key: "users", label: "User Management", path: "/administration/users" },
        { key: "settings", label: "Settings", path: "/administration/settings" },
        { key: "diagnostics", label: "Diagnostics", path: "/administration/diagnostics" },
      ],
    },
    {
      title: "Workflows & Approvals",
      icon: "📋",
      features: [
        { key: "workflows", label: "Workflow Configuration", path: "/administration/workflows" },
        { key: "workflow-approvals", label: "Workflow Approvals", path: "/administration/workflow-approvals" },
        { key: "document-review", label: "Document Review", path: "/administration/document-review" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "system-log-book", label: "System Log Book Report", path: "/administration/reports/system-log-book" },
        { key: "user-login-activity", label: "User Login Activity Report", path: "/administration/reports/user-login-activity" },
        { key: "admin-active-users", label: "Active Users", type: "dashboard" },
        { key: "admin-role-count", label: "Role Count", type: "dashboard" },
        { key: "admin-recent-logins", label: "Recent Logins", type: "dashboard" },
      ],
    },
  ],

  "human-resources": [
    {
      title: "Core HR",
      icon: "👥",
      features: [
        { key: "employees", label: "Employee Setup", path: "/human-resources/employees" },
        { key: "leave-management", label: "Leave Management", path: "/human-resources/leave-management" },
        { key: "leave-setup", label: "Leave Setup", path: "/human-resources/leave-setup" },
        { key: "promotions", label: "Promotions", path: "/human-resources/promotions" },
        { key: "policies", label: "Policies", path: "/human-resources/policies" },
        { key: "medical-policies", label: "Medical Policies", path: "/human-resources/medical-policies" },
      ],
    },
    {
      title: "Payroll & Compensation",
      icon: "💰",
      features: [
        { key: "payroll", label: "Payroll Processing", path: "/human-resources/payroll" },
        { key: "payslips", label: "Payslips", path: "/human-resources/payslips" },
        { key: "salary-config", label: "Salary Configurations", path: "/human-resources/salary-config" },
        { key: "tax-config", label: "Statutory Contributions", path: "/human-resources/tax-config" },
        { key: "allowances", label: "Allowances", path: "/human-resources/allowances" },
        { key: "loans", label: "Employee Loans", path: "/human-resources/loans" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "hr-reports", label: "HR Reports", path: "/human-resources/reports" },
      ],
    },
    {
      title: "Setup",
      icon: "⚙️",
      features: [
        { key: "setup", label: "HR Setup", path: "/human-resources/setup" },
      ],
    },
  ],

  maintenance: [
    {
      title: "Operations & Work Orders",
      icon: "🔧",
      features: [
        { key: "maintenance-requests", label: "Maintenance Requests", path: "/maintenance/requests" },
        { key: "work-orders", label: "Work Orders", path: "/maintenance/work-orders" },
        { key: "job-orders", label: "Job Orders", path: "/maintenance/job-orders" },
        { key: "pm-schedules", label: "PM Schedules", path: "/maintenance/pm-schedules" },
        { key: "schedules", label: "Maintenance Schedules", path: "/maintenance/schedules" },
        { key: "rosters", label: "Maintenance Rosters", path: "/maintenance/rosters" },
        { key: "material-receipts", label: "Material Receipts", path: "/maintenance/material-receipts" },
      ],
    },
    {
      title: "Assets & Contracts",
      icon: "🏬",
      features: [
        { key: "assets", label: "Asset Management", path: "/maintenance/assets" },
        { key: "equipment", label: "Equipment", path: "/maintenance/equipment" },
        { key: "contracts", label: "Maintenance Contracts", path: "/maintenance/contracts" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "maintenance-reports", label: "Maintenance Reports", path: "/maintenance/reports" },
        { key: "maint-open-work-orders", label: "Open Work Orders", type: "dashboard" },
        { key: "maint-assets-in-maint", label: "Assets in Maintenance", type: "dashboard" },
        { key: "maint-total-assets", label: "Total Assets", type: "dashboard" },
      ],
    },
    {
      title: "Setup",
      icon: "⚙️",
      features: [
        { key: "setup", label: "Maintenance Setup", path: "/maintenance/setup" },
      ],
    },
  ],

  facilities: [
    {
      title: "Facilities Operations",
      icon: "🏢",
      features: [
        { key: "dashboard", label: "Facilities Command Center", path: "/facilities/dashboard" },
        { key: "properties", label: "Properties & Estates", path: "/facilities/properties" },
        { key: "contracts", label: "FM Service Contracts", path: "/facilities/contracts" },
        { key: "field-service", label: "Field Technician Workspace", path: "/facilities/field-service" },
        { key: "checklists", label: "Inspection Checklists", path: "/facilities/checklists" },
        { key: "soft-services", label: "Soft Facilities Services", path: "/facilities/soft-services" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "reports", label: "Facilities Reports", path: "/facilities/reports" },
        { key: "fac-sla-compliance", label: "SLA Compliance Rate", type: "dashboard" },
        { key: "fac-open-tickets", label: "Open Helpdesk Tickets", type: "dashboard" },
        { key: "fac-active-contracts", label: "Active FM Contracts", type: "dashboard" },
      ],
    },
  ],

  assets: [
    {
      title: "Fixed Assets",
      icon: "🏛️",
      features: [
        { key: "register", label: "Fixed Asset Register", path: "/assets/register" },
        { key: "categories", label: "Asset Categories & Policies", path: "/assets/categories" },
        { key: "depreciation", label: "Asset Depreciation Engine", path: "/assets/depreciation" },
        { key: "maintenance", label: "Asset Maintenance Tracking", path: "/assets/maintenance" },
        { key: "disposal", label: "Asset Disposal & Transfer", path: "/assets/disposal" },
        { key: "custody", label: "Employee Asset Assignments", path: "/assets/custody" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "schedule-report", label: "Fixed Asset Schedule", path: "/assets/schedule-report" },
        { key: "asset-total-value", label: "Total Asset Net Book Value", type: "dashboard" },
        { key: "asset-in-service", label: "Assets Currently in Service", type: "dashboard" },
        { key: "asset-deprec-ytd", label: "Depreciation Recognized YTD", type: "dashboard" },
      ],
    },
    {
      title: "Setup",
      icon: "⚙️",
      features: [
        { key: "setup", label: "Master Setup & Tagging Rules", path: "/assets/setup" },
      ],
    },
  ],

  production: [
    {
      title: "Manufacturing Operations",
      icon: "🏭",
      features: [
        { key: "work-orders", label: "Production Work Orders", path: "/production/work-orders" },
        { key: "bom", label: "Bill of Materials (BOM)", path: "/production/bom" },
        { key: "material-requisitions", label: "Material Issue & Requisition", path: "/production/material-requisitions" },
        { key: "order-completion", label: "Finished Goods Completion", path: "/production/order-completion" },
        { key: "quality-control", label: "Quality Assurance Tests", path: "/production/quality-control" },
      ],
    },
    {
      title: "Setup",
      icon: "⚙️",
      features: [
        { key: "setup", label: "Manufacturing Setup", path: "/production/setup" },
      ],
    },
  ],

  "project-management": [
    {
      title: "Project Execution",
      icon: "📐",
      features: [
        { key: "projects", label: "Projects Directory", path: "/project-management/projects" },
        { key: "tasks", label: "Tasks & Milestones", path: "/project-management/tasks" },
        { key: "resources", label: "Resource Allocation", path: "/project-management/resources" },
        { key: "gantt", label: "Gantt Timeline Schedule", path: "/project-management/gantt" },
        { key: "timesheets", label: "Team Timesheets", path: "/project-management/timesheets" },
        { key: "documents", label: "Project Deliverables & Docs", path: "/project-management/documents" },
        { key: "change-orders", label: "Change Request Control", path: "/project-management/change-orders" },
        { key: "purchase-requisition", label: "Site Material Requisitions", path: "/project-management/purchase-requisition" },
      ],
    },
    {
      title: "Construction & Engineering",
      icon: "🏗️",
      features: [
        { key: "subcontractor-contracts", label: "Subcontractor Contracts" },
        { key: "subcontractor-certificates", label: "Payment Certificates" },
        { key: "daily-site-records", label: "Daily Site Diary" },
        { key: "drawing-register", label: "Drawing Register" },
        { key: "snag-list", label: "Punch / Snag List" },
        { key: "subcontractor-bills", label: "Subcontractor Bills" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "project-reports", label: "Project Reports" },
        { key: "project-status-report", label: "Project Status Report" },
        { key: "project-income-report", label: "Project Income Report" },
        { key: "project-expense-report", label: "Project Expense Report" },
        { key: "project-expense-income-report", label: "Project Expense and Income Report" },
        { key: "daily-reports", label: "Daily Site Diary (DSR)" },
      ],
    },
    {
      title: "Setup",
      icon: "⚙️",
      features: [
        { key: "setup", label: "Project Setup" },
      ],
    },
  ],

  "environmental-health-safety": [
    {
      title: "Safety & Incident Management",
      icon: "🦺",
      features: [
        { key: "safety", label: "Safety Management (HSE)", path: "/environmental-health-safety/safety" },
        { key: "incidents", label: "Incident Register & Near Misses", path: "/environmental-health-safety/incidents" },
        { key: "toolbox-talks", label: "Toolbox Talks & Briefings", path: "/environmental-health-safety/toolbox-talks" },
      ],
    },
    {
      title: "Compliance & Hazard Control",
      icon: "⚖️",
      features: [
        { key: "hsa-compliance", label: "Health, Safety & Compliance", path: "/environmental-health-safety/hsa-compliance" },
        { key: "compliance", label: "Statutory Obligations & Hazards", path: "/environmental-health-safety/compliance" },
      ],
    },
    {
      title: "Environmental & Sustainability",
      icon: "🌱",
      features: [
        { key: "sustainability", label: "Sustainability & Environmental", path: "/environmental-health-safety/sustainability" },
      ],
    },
  ],

  "business-intelligence": [
    {
      title: "Analytics Hub",
      icon: "📈",
      features: [
        { key: "reports", label: "Custom Reports", path: "/business-intelligence/reports" },
        { key: "data-sources", label: "Data Sources", path: "/business-intelligence/data-sources" },
        { key: "analytics", label: "Analytics", path: "/business-intelligence/analytics" },
        { key: "bi-reports", label: "BI Reports", path: "/business-intelligence/bi-reports" },
        { key: "financial", label: "Financial Analytics" },
        { key: "inventory", label: "Inventory Analytics" },
        { key: "purchase", label: "Purchase Analytics" },
        { key: "hr", label: "HR Analytics" },
        { key: "pos", label: "POS Analytics" },
        { key: "cross-module", label: "Cross Module Analytics" },
        { key: "report-center", label: "Report Center" },
      ],
    },
  ],

  "executive-overview": [
    {
      title: "Executive Reports",
      icon: "🎯",
      features: [
        { key: "kpi-reports", label: "KPI Reports", path: "/executive-overview/kpi-reports" },
      ],
    },
  ],

  "service-management": [
    {
      title: "Field Services",
      icon: "🛠️",
      features: [
        { key: "customer-service-requests", label: "Customer Service Requests" },
        { key: "supplier-service-requests", label: "Supplier Service Requests" },
        { key: "service-requests", label: "Service Requests" },
        { key: "service-orders", label: "Service Orders" },
        { key: "service-confirmations", label: "Service Confirmations" },
        { key: "service-invoices", label: "Service Invoices" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "service-reports", label: "Service Reports" },
      ],
    },
    {
      title: "Setup",
      icon: "⚙️",
      features: [
        { key: "setup", label: "Service Setup" },
      ],
    },
  ],

  transport: [
    {
      title: "Fleet Operations",
      icon: "🚚",
      features: [
        { key: "transport-requests", label: "Transport Requests" },
        { key: "fleet-schedule", label: "Fleet Schedule" },
        { key: "trip-planning", label: "Trip Planning & Dispatch" },
        { key: "fuel-management", label: "Fuel Log Book" },
        { key: "vehicle-maintenance", label: "Vehicle Maintenance" },
        { key: "driver-management", label: "Driver Directory" },
        { key: "vehicles", label: "Vehicle Registry" },
        { key: "gps-tracking", label: "Live GPS Tracking" },
      ],
    },
    {
      title: "Transport Billing",
      icon: "🧾",
      features: [
        { key: "transportation-bills", label: "Transportation Bills" },
        { key: "transport-income", label: "Transport Income" },
        { key: "transport-expenses", label: "Transport Expenses" },
      ],
    },
    {
      title: "Reports & Analytics",
      icon: "📊",
      features: [
        { key: "reports", label: "Transport Reports & Analytics" },
        { key: "fleet-utilization", label: "Fleet Utilization", type: "dashboard" },
        { key: "active-trips", label: "Active Trips", type: "dashboard" },
        { key: "fuel-consumption", label: "Monthly Fuel Consumption", type: "dashboard" },
      ],
    },
    {
      title: "Setup",
      icon: "⚙️",
      features: [
        { key: "setup", label: "Transport Settings" },
      ],
    },
  ],

  system: [
    {
      title: "System Administration",
      icon: "💻",
      features: [
        { key: "system-logs", label: "System Audit Logs" },
      ],
    },
  ],
};

/**
 * Returns canonical key for aliased or duplicate keys
 */
export function getCanonicalFeatureKey(moduleOrKey, maybeKey) {
  const key = maybeKey !== undefined ? maybeKey : moduleOrKey;
  const k = String(key || "").trim().toLowerCase();
  if (k === "direct-purchases") return "direct-purchase";
  if (k === "holds") return "on-hold";
  if (k === "item-groups") return "item-classification";
  return key;
}

/**
 * Returns the functional sections for a given moduleKey.
 * If not explicitly registered, generates a fallback section from the module's flat features.
 */
export function getModuleSections(moduleKey, moduleInfo = null) {
  const sections = MODULE_SECTIONS[moduleKey];
  if (sections && sections.length > 0) {
    return sections.map(s => ({ ...s, pages: s.features }));
  }
  if (!moduleInfo) return [];

  // Fallback: partition into Features, Reports & Analytics, Dashboards
  const feats = moduleInfo.features || [];
  const dashboards = moduleInfo.dashboards || [];

  const reports = feats.filter(f => /report/i.test(f.key) || /report/i.test(f.label));
  const regular = feats.filter(f => !/report/i.test(f.key) && !/report/i.test(f.label));

  const result = [];
  if (regular.length > 0) {
    result.push({
      title: "Core Pages",
      icon: moduleInfo.icon || "📄",
      features: regular,
      pages: regular,
    });
  }
  if (reports.length > 0 || dashboards.length > 0) {
    result.push({
      title: "Reports & Analytics",
      icon: "📊",
      features: [...reports, ...dashboards],
      pages: [...reports, ...dashboards],
    });
  }
  return result;
}
