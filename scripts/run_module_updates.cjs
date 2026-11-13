const fs = require('fs');
const path = require('path');
const { processFile } = require('./batch_update_cards.cjs');

const tasks = [
  // ─── FINANCE ──────────────────────────────────────────
  { file: 'client/src/pages/modules/finance/vouchers/PaymentVoucherList.jsx', label: 'Payment Vouchers', icon: 'Receipt', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/vouchers/ReceiptVoucherList.jsx', label: 'Receipt Vouchers', icon: 'Receipt', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/vouchers/JournalVoucherList.jsx', label: 'Journal Vouchers', icon: 'FileText', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/vouchers/ContraVoucherList.jsx', label: 'Contra Vouchers', icon: 'Receipt', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/vouchers/CreditNoteList.jsx', label: 'Credit Notes', icon: 'FileText', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/vouchers/DebitNoteList.jsx', label: 'Debit Notes', icon: 'FileText', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/vouchers/SalesVoucherList.jsx', label: 'Sales Vouchers', icon: 'Receipt', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/vouchers/PurchaseVoucherList.jsx', label: 'Purchase Vouchers', icon: 'Receipt', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/vouchers/VoucherListPage.jsx', label: 'Vouchers', icon: 'Receipt', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/banking/BankReconciliationList.jsx', label: 'Reconciliations', icon: 'CheckCircle2', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/banking/PdcPostingsList.jsx', label: 'PDC Postings', icon: 'Clock', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/setup/AccountsPage.jsx', label: 'General Accounts', icon: 'BookOpen', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/setup/AccountGroupsPage.jsx', label: 'Account Groups', icon: 'Folder', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/setup/CostCentersPage.jsx', label: 'Cost Centers', icon: 'Target', dataVar: 'items' },
  { file: 'client/src/pages/modules/finance/setup/FiscalYearsPage.jsx', label: 'Fiscal Years', icon: 'Calendar', dataVar: 'items' },

  // ─── INVENTORY ────────────────────────────────────────
  { file: 'client/src/pages/modules/inventory/StockTransferList.jsx', label: 'Stock Transfers', icon: 'Truck', dataVar: 'transfers' },
  { file: 'client/src/pages/modules/inventory/StockAdjustmentList.jsx', label: 'Stock Adjustments', icon: 'Sliders', dataVar: 'adjustments' },
  { file: 'client/src/pages/modules/inventory/IssueToRequirementList.jsx', label: 'Material Issues', icon: 'PackageCheck', dataVar: 'issues' },
  { file: 'client/src/pages/modules/inventory/ReturnToStoresList.jsx', label: 'Returns to Stores', icon: 'RotateCcw', dataVar: 'returns' },
  { file: 'client/src/pages/modules/inventory/GRNLocalList.jsx', label: 'Local Goods Receipts', icon: 'PackageCheck', dataVar: 'grns' },
  { file: 'client/src/pages/modules/inventory/GRNImportList.jsx', label: 'Import Goods Receipts', icon: 'Globe', dataVar: 'grns' },
  { file: 'client/src/pages/modules/inventory/DailyStockTakeList.jsx', label: 'Stock Takes', icon: 'ClipboardList', dataVar: 'stockTakes' },
  { file: 'client/src/pages/modules/inventory/PhysicalStockTakeList.jsx', label: 'Physical Audits', icon: 'ClipboardCheck', dataVar: 'audits' },
  { file: 'client/src/pages/modules/inventory/StockTakeList.jsx', label: 'Stock Take Audits', icon: 'ClipboardCheck', dataVar: 'items' },
  { file: 'client/src/pages/modules/inventory/material-requisitions/MaterialRequisitionList.jsx', label: 'Requisitions', icon: 'FileText', dataVar: 'items' },
  { file: 'client/src/pages/modules/inventory/WarehousesList.jsx', label: 'Warehouses', icon: 'Building', dataVar: 'warehouses' },
  { file: 'client/src/pages/modules/inventory/ItemGroupsList.jsx', label: 'Item Groups', icon: 'Boxes', dataVar: 'groups' },
  { file: 'client/src/pages/modules/inventory/ItemBatchesList.jsx', label: 'Item Batches', icon: 'Layers', dataVar: 'batches' },
  { file: 'client/src/pages/modules/inventory/StockJournalList.jsx', label: 'Stock Journals', icon: 'BookOpen', dataVar: 'journals' },
  { file: 'client/src/pages/modules/inventory/StockUpdationList.jsx', label: 'Stock Updates', icon: 'RefreshCw', dataVar: 'updates' },
  { file: 'client/src/pages/modules/inventory/StockVerificationList.jsx', label: 'Verifications', icon: 'CheckCircle2', dataVar: 'items' },
  { file: 'client/src/pages/modules/inventory/TransferAcceptanceList.jsx', label: 'Transfer Receipts', icon: 'CheckSquare', dataVar: 'items' },
  { file: 'client/src/pages/modules/inventory/UnitConversionsList.jsx', label: 'UOM Conversions', icon: 'Scale', dataVar: 'conversions' },

  // ─── PURCHASE / PROCUREMENT ───────────────────────────
  { file: 'client/src/pages/modules/purchase/direct-purchase/DirectPurchaseList.jsx', label: 'Direct Purchases', icon: 'ShoppingCart', dataVar: 'items' },
  { file: 'client/src/pages/modules/purchase/general-requisitions/GeneralRequisitionList.jsx', label: 'Requisitions', icon: 'FileText', dataVar: 'items' },
  { file: 'client/src/pages/modules/purchase/rfq/RequestForQuotationList.jsx', label: 'RFQs Issued', icon: 'Send', dataVar: 'rfqs' },
  { file: 'client/src/pages/modules/purchase/supplier-quotations/SupplierQuotationsList.jsx', label: 'Supplier Quotes', icon: 'FileText', dataVar: 'quotations' },
  { file: 'client/src/pages/modules/purchase/purchase-bills/PurchaseBillsList.jsx', label: 'Purchase Bills', icon: 'FileCheck2', dataVar: 'bills' },
  { file: 'client/src/pages/modules/purchase/service-bills/ServiceBillsList.jsx', label: 'Service Bills', icon: 'Receipt', dataVar: 'bills' },
  { file: 'client/src/pages/modules/purchase/service-requests/ServiceRequestsList.jsx', label: 'Service Requests', icon: 'Wrench', dataVar: 'requests' },
  { file: 'client/src/pages/modules/purchase/service-confirmations/ServiceConfirmationsList.jsx', label: 'Confirmations', icon: 'CheckCircle', dataVar: 'confirmations' },
  { file: 'client/src/pages/modules/purchase/shipping-advice/ShippingAdviceList.jsx', label: 'Shipping Advices', icon: 'Ship', dataVar: 'items' },
  { file: 'client/src/pages/modules/purchase/port-clearances/PortClearancesList.jsx', label: 'Port Clearances', icon: 'ShieldCheck', dataVar: 'clearances' },

  // ─── HUMAN RESOURCES ──────────────────────────────────
  { file: 'client/src/pages/modules/human-resources/attendance/AttendanceList.jsx', label: 'Attendance Records', icon: 'UserCheck', dataVar: 'attendance' },
  { file: 'client/src/pages/modules/human-resources/leave-management/LeaveRequestManager.jsx', label: 'Leave Requests', icon: 'Calendar', dataVar: 'requests' },
  { file: 'client/src/pages/modules/human-resources/leave-setup/LeaveSetupList.jsx', label: 'Leave Types', icon: 'CalendarDays', dataVar: 'leaveTypes' },
  { file: 'client/src/pages/modules/human-resources/payroll/AllowanceList.jsx', label: 'Allowance Schemes', icon: 'Percent', dataVar: 'allowances' },
  { file: 'client/src/pages/modules/human-resources/payroll/LoanList.jsx', label: 'Employee Loans', icon: 'Banknote', dataVar: 'loans' },
  { file: 'client/src/pages/modules/human-resources/payroll/LoanRequestList.jsx', label: 'Loan Requests', icon: 'FileText', dataVar: 'requests' },
  { file: 'client/src/pages/modules/human-resources/payroll/PayslipList.jsx', label: 'Employee Payslips', icon: 'FileSpreadsheet', dataVar: 'payslips' },
  { file: 'client/src/pages/modules/human-resources/promotions/PromotionList.jsx', label: 'Staff Promotions', icon: 'TrendingUp', dataVar: 'promotions' },
  { file: 'client/src/pages/modules/human-resources/recruitment/CandidatesList.jsx', label: 'Job Applicants', icon: 'UserPlus', dataVar: 'candidates' },
  { file: 'client/src/pages/modules/human-resources/recruitment/InterviewsList.jsx', label: 'Job Interviews', icon: 'Calendar', dataVar: 'interviews' },
  { file: 'client/src/pages/modules/human-resources/recruitment/OffersList.jsx', label: 'Job Offers', icon: 'FileCheck', dataVar: 'offers' },
  { file: 'client/src/pages/modules/human-resources/recruitment/RequisitionList.jsx', label: 'Job Openings', icon: 'Briefcase', dataVar: 'requisitions' },
  { file: 'client/src/pages/modules/human-resources/training/TrainingList.jsx', label: 'Training Sessions', icon: 'GraduationCap', dataVar: 'trainings' },

  // ─── MAINTENANCE ──────────────────────────────────────
  { file: 'client/src/pages/modules/maintenance/requests/MaintenanceRequestsList.jsx', label: 'Work Requests', icon: 'Wrench', dataVar: 'requests' },
  { file: 'client/src/pages/modules/maintenance/job-orders/MaintenanceJobOrdersList.jsx', label: 'Job Orders', icon: 'ClipboardList', dataVar: 'jobOrders' },
  { file: 'client/src/pages/modules/maintenance/execution/JobExecutionList.jsx', label: 'Job Executions', icon: 'Activity', dataVar: 'executions' },
  { file: 'client/src/pages/modules/maintenance/preventive/PmScheduleList.jsx', label: 'PM Schedules', icon: 'Calendar', dataVar: 'schedules' },
  { file: 'client/src/pages/modules/maintenance/scheduling/MaintenanceScheduleList.jsx', label: 'Maintenance Tasks', icon: 'CalendarCheck', dataVar: 'schedules' },
  { file: 'client/src/pages/modules/maintenance/assets/AssetList.jsx', label: 'Maintained Assets', icon: 'Cpu', dataVar: 'assets' },
  { file: 'client/src/pages/modules/maintenance/equipment/EquipmentList.jsx', label: 'Equipment Units', icon: 'Cog', dataVar: 'equipment' },
  { file: 'client/src/pages/modules/maintenance/downtime/DowntimeLogList.jsx', label: 'Downtime Incidents', icon: 'AlertTriangle', dataVar: 'logs' },
  { file: 'client/src/pages/modules/maintenance/contracts/MaintenanceContractList.jsx', label: 'SLA Contracts', icon: 'FileText', dataVar: 'contracts' },
  { file: 'client/src/pages/modules/maintenance/fm-contracts/FMContractsList.jsx', label: 'FM Service Contracts', icon: 'FileCheck', dataVar: 'contracts' },
  { file: 'client/src/pages/modules/maintenance/bills/MaintenanceBillList.jsx', label: 'Vendor Bills', icon: 'Receipt', dataVar: 'bills' },
  { file: 'client/src/pages/modules/maintenance/material-receipt/MaterialReceiptList.jsx', label: 'Spares Received', icon: 'PackageCheck', dataVar: 'receipts' },
  { file: 'client/src/pages/modules/maintenance/material-requisitions/MaintenanceMaterialRequisitionList.jsx', label: 'Spares Requisitions', icon: 'FileText', dataVar: 'requisitions' },
  { file: 'client/src/pages/modules/maintenance/roster/MaintenanceRosterList.jsx', label: 'Technician Shifts', icon: 'Users', dataVar: 'rosters' },
  { file: 'client/src/pages/modules/maintenance/rfq/MaintenanceRFQList.jsx', label: 'Maintenance RFQs', icon: 'Send', dataVar: 'rfqs' },
  { file: 'client/src/pages/modules/maintenance/templates/ChecklistTemplatesList.jsx', label: 'Inspection Checklists', icon: 'ListChecks', dataVar: 'templates' },

  // ─── PRODUCTION / MANUFACTURING ───────────────────────
  { file: 'client/src/pages/modules/production/work-orders/WorkOrderList.jsx', label: 'Production Work Orders', icon: 'Factory', dataVar: 'workOrders' },
  { file: 'client/src/pages/modules/production/job-cards/JobCardList.jsx', label: 'Shop Floor Job Cards', icon: 'FileText', dataVar: 'jobCards' },
  { file: 'client/src/pages/modules/production/bom/BomList.jsx', label: 'Bills of Materials (BOM)', icon: 'Layers', dataVar: 'boms' },
  { file: 'client/src/pages/modules/production/planning/DailyPlanList.jsx', label: 'Daily Run Plans', icon: 'Calendar', dataVar: 'plans' },
  { file: 'client/src/pages/modules/production/finished-goods/FinishedGoodsTransferList.jsx', label: 'Finished Goods Transfers', icon: 'PackageCheck', dataVar: 'transfers' },
  { file: 'client/src/pages/modules/production/material-receipt/MaterialReceiptList.jsx', label: 'Raw Material Receipts', icon: 'PackageCheck', dataVar: 'receipts' },
  { file: 'client/src/pages/modules/production/material-requisitions/MaterialRequisitionList.jsx', label: 'Raw Material Requisitions', icon: 'FileText', dataVar: 'requisitions' },
  { file: 'client/src/pages/modules/production/material-utilization/MaterialUtilizationList.jsx', label: 'Material Consumptions', icon: 'Sliders', dataVar: 'utilizations' },
  { file: 'client/src/pages/modules/production/transfer/ProductionTransferList.jsx', label: 'WIP Batch Transfers', icon: 'Truck', dataVar: 'transfers' },
  { file: 'client/src/pages/modules/production/qc/QualityControlList.jsx', label: 'QC Batch Inspections', icon: 'ShieldCheck', dataVar: 'inspections' },
  { file: 'client/src/pages/modules/production/routing/RoutingList.jsx', label: 'Process Routings', icon: 'GitMerge', dataVar: 'routings' },
  { file: 'client/src/pages/modules/production/setup/MachineList.jsx', label: 'Production Machines', icon: 'Cpu', dataVar: 'machines' },
  { file: 'client/src/pages/modules/production/setup/OperatorList.jsx', label: 'Line Operators', icon: 'Users', dataVar: 'operators' },
  { file: 'client/src/pages/modules/production/setup/ProcessList.jsx', label: 'Operation Processes', icon: 'Workflow', dataVar: 'processes' },
  { file: 'client/src/pages/modules/production/setup/QcChecklistList.jsx', label: 'QC Templates', icon: 'ListChecks', dataVar: 'checklists' },
  { file: 'client/src/pages/modules/production/setup/ShiftList.jsx', label: 'Factory Shifts', icon: 'Clock', dataVar: 'shifts' },

  // ─── SERVICE MANAGEMENT ───────────────────────────────
  { file: 'client/src/pages/modules/service-management/service-requests/CustomerServiceRequestsList.jsx', label: 'Client Help Tickets', icon: 'LifeBuoy', dataVar: 'requests' },
  { file: 'client/src/pages/modules/service-management/service-requests/SupplierServiceRequestsList.jsx', label: 'Vendor Service Tickets', icon: 'LifeBuoy', dataVar: 'requests' },
  { file: 'client/src/pages/modules/service-management/service-orders/ServiceOrdersList.jsx', label: 'Service Field Orders', icon: 'ClipboardList', dataVar: 'orders' },
  { file: 'client/src/pages/modules/service-management/service-execution/ServiceExecutionsList.jsx', label: 'Field Job Executions', icon: 'Wrench', dataVar: 'executions' },
  { file: 'client/src/pages/modules/service-management/service-confirmations/ServiceConfirmationsList.jsx', label: 'Customer Signoffs', icon: 'CheckCircle2', dataVar: 'confirmations' },
  { file: 'client/src/pages/modules/service-management/service-bills/ServiceBillsList.jsx', label: 'Service Billing Records', icon: 'Receipt', dataVar: 'bills' },
  { file: 'client/src/pages/modules/service-management/service-invoices/ServiceInvoiceList.jsx', label: 'Client Invoices', icon: 'FileText', dataVar: 'invoices' },
  { file: 'client/src/pages/modules/service-management/visitors-log/VisitorsLogList.jsx', label: 'Visitor Logs', icon: 'UserCheck', dataVar: 'visitors' },

  // ─── TRANSPORT ────────────────────────────────────────
  { file: 'client/src/pages/modules/transport/vehicles/VehiclesList.jsx', label: 'Fleet Vehicles', icon: 'Truck', dataVar: 'vehicles' },
  { file: 'client/src/pages/modules/transport/drivers/DriversList.jsx', label: 'Assigned Drivers', icon: 'Users', dataVar: 'drivers' },
  { file: 'client/src/pages/modules/transport/trips/TripsList.jsx', label: 'Dispatched Trips', icon: 'Navigation', dataVar: 'trips' },
  { file: 'client/src/pages/modules/transport/trips/TripReturnList.jsx', label: 'Returned Trips', icon: 'RotateCcw', dataVar: 'returns' },
  { file: 'client/src/pages/modules/transport/trips/TripTrackingList.jsx', label: 'Live Trip Trackings', icon: 'MapPin', dataVar: 'trips' },
  { file: 'client/src/pages/modules/transport/fuel/FuelLogsList.jsx', label: 'Fuel Dispense Logs', icon: 'Fuel', dataVar: 'logs' },
  { file: 'client/src/pages/modules/transport/fuel-bills/FuelBillsList.jsx', label: 'Station Fuel Bills', icon: 'Receipt', dataVar: 'bills' },
  { file: 'client/src/pages/modules/transport/fuel-expenses/FuelExpenseList.jsx', label: 'Fuel Expense Logs', icon: 'Fuel', dataVar: 'expenses' },
  { file: 'client/src/pages/modules/transport/expenses/TransportExpenseList.jsx', label: 'Vehicle Expenses', icon: 'FileText', dataVar: 'expenses' },
  { file: 'client/src/pages/modules/transport/expenses/ExpenseLogList.jsx', label: 'En-Route Expense Logs', icon: 'FileText', dataVar: 'logs' },
  { file: 'client/src/pages/modules/transport/income/TransportIncomeList.jsx', label: 'Waybill Billings', icon: 'FileCheck', dataVar: 'incomes' },
  { file: 'client/src/pages/modules/transport/servicing/VehicleServicingList.jsx', label: 'Vehicle Service Logs', icon: 'Wrench', dataVar: 'services' },
  { file: 'client/src/pages/modules/transport/maintenance/MaintenanceList.jsx', label: 'Workshop Repairs', icon: 'Cog', dataVar: 'repairs' },
  { file: 'client/src/pages/modules/transport/inspections/InspectionsList.jsx', label: 'Pre-Trip Inspections', icon: 'CheckSquare', dataVar: 'inspections' },
  { file: 'client/src/pages/modules/transport/logbook/LogbookList.jsx', label: 'Mileage Logbooks', icon: 'BookOpen', dataVar: 'entries' },
  { file: 'client/src/pages/modules/transport/breakdowns/BreakdownsList.jsx', label: 'Breakdown Logs', icon: 'AlertTriangle', dataVar: 'breakdowns' },
  { file: 'client/src/pages/modules/transport/routes/RoutesList.jsx', label: 'Delivery Routes', icon: 'Map', dataVar: 'routes' },
  { file: 'client/src/pages/modules/transport/billing/BillingList.jsx', label: 'Freight Invoices', icon: 'FileText', dataVar: 'bills' },
  { file: 'client/src/pages/modules/transport/transportation-bills/TransportationBillsList.jsx', label: 'Haulage Bills', icon: 'Receipt', dataVar: 'bills' },
  { file: 'client/src/pages/modules/transport/compliance/VehicleComplianceList.jsx', label: 'Roadworthy Permits', icon: 'ShieldCheck', dataVar: 'records' },

  // ─── FACILITIES ───────────────────────────────────────
  { file: 'client/src/pages/modules/facilities/space-occupancy/SpacesDirectoryPage.jsx', label: 'Building Spaces', icon: 'Building', dataVar: 'spaces' },
  { file: 'client/src/pages/modules/facilities/space-occupancy/TenantOccupancyPage.jsx', label: 'Tenant Leases', icon: 'Users', dataVar: 'leases' },
  { file: 'client/src/pages/modules/facilities/space-occupancy/RoomBookingsPage.jsx', label: 'Room Reservations', icon: 'Calendar', dataVar: 'bookings' },
  { file: 'client/src/pages/modules/facilities/helpdesk/FMHelpdeskPage.jsx', label: 'Facility Help Tickets', icon: 'LifeBuoy', dataVar: 'tickets' },
  { file: 'client/src/pages/modules/facilities/inspections/FMInspectionsPage.jsx', label: 'Site Inspections', icon: 'CheckSquare', dataVar: 'inspections' },
  { file: 'client/src/pages/modules/facilities/compliance/FMCompliancePage.jsx', label: 'Safety Compliance Audits', icon: 'ShieldCheck', dataVar: 'audits' },
  { file: 'client/src/pages/modules/facilities/hard-services/HardServicesPage.jsx', label: 'Engineering Assets', icon: 'Cog', dataVar: 'services' },
  { file: 'client/src/pages/modules/facilities/security/SecurityAccessPage.jsx', label: 'Access Control Logs', icon: 'Lock', dataVar: 'logs' },
  { file: 'client/src/pages/modules/facilities/servicebilling/ServiceBillingList.jsx', label: 'Tenant Utility Bills', icon: 'Receipt', dataVar: 'bills' },
  { file: 'client/src/pages/modules/facilities/workforce/FMWorkforceRosterPage.jsx', label: 'Duty Rosters', icon: 'Users', dataVar: 'rosters' },
  { file: 'client/src/pages/modules/facilities/onboarding/PropertyOnboardingPage.jsx', label: 'Onboarded Properties', icon: 'Building2', dataVar: 'properties' },
];

let updatedCount = 0;
let skippedCount = 0;

for (const t of tasks) {
  const ok = processFile(t.file, t);
  if (ok) updatedCount++;
  else skippedCount++;
}

console.log(`\n========================================`);
console.log(`Updated files: ${updatedCount}`);
console.log(`Skipped (or already compliant): ${skippedCount}`);
console.log(`========================================\n`);
