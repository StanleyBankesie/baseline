# Scope: Milestone 1 — Mobile Nav Banner & Build Integrity

## Architecture
- Module Layout & Navigation: `client/src/components/ModuleLayout.jsx`, `client/src/components/ModuleDashboard.jsx`.
- Vite Build & JSX Syntax: Ensure all JSX files parse cleanly without syntax errors so that `npm run build --prefix client` succeeds.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Mobile Navigation Banner Hiding | Hide `ModuleTopNavBar` on mobile viewports (<768px, `hidden md:block`) in `ModuleLayout.jsx` and `ModuleDashboard.jsx` while keeping visible on desktop. | M1 | ORIGINAL_REQUEST R1, Survey Explorer 1 |
| F2 | Client Build & Syntax Restoration | Fix 15 pre-existing syntax errors in list pages (`VehicleServicingList.jsx`, `FMHelpdeskPage.jsx`, etc.) to ensure clean Vite builds and reliable rendering. | M1 | Survey Explorer 1 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Mobile Nav Banner & Build Integrity | F1 & F2 implementation, review, adversarial testing, forensic audit, build verification | none | IN_PROGRESS |

## Interface Contracts
### `ModuleLayout.jsx` ↔ Navigation Rendering
- `ModuleTopNavBar`: Root container includes `hidden md:block` to hide on mobile viewports (<768px) and show on desktop (>=768px).
- `ModuleDashboard.jsx`: Wrapper container includes `hidden md:block sticky top-0 z-40`.

### Client Build Contract
- `npm run build --prefix client` completes with exit code 0 and outputs production bundles in `client/dist`.

## Code Layout
- `client/src/components/ModuleLayout.jsx` (ModuleTopNavBar)
- `client/src/components/ModuleDashboard.jsx` (ModuleDashboard wrapper)
- List pages with pre-existing syntax errors:
  1. `client/src/pages/DashboardPage.jsx`
  2. `client/src/pages/modules/facilities/hard-services/HardServicesPage.jsx`
  3. `client/src/pages/modules/facilities/helpdesk/FMHelpdeskPage.jsx`
  4. `client/src/pages/modules/finance/banking/PdcPostingsList.jsx`
  5. `client/src/pages/modules/inventory/DailyStockTakeList.jsx`
  6. `client/src/pages/modules/inventory/ItemGroupsList.jsx`
  7. `client/src/pages/modules/inventory/PhysicalStockTakeList.jsx`
  8. `client/src/pages/modules/inventory/StockTakeList.jsx`
  9. `client/src/pages/modules/inventory/StockVerificationList.jsx`
  10. `client/src/pages/modules/service-management/service-confirmations/ServiceConfirmationsList.jsx`
  11. `client/src/pages/modules/transport/compliance/VehicleComplianceList.jsx`
  12. `client/src/pages/modules/transport/drivers/DriversList.jsx`
  13. `client/src/pages/modules/transport/logbook/LogbookList.jsx`
  14. `client/src/pages/modules/transport/servicing/VehicleServicingList.jsx`
  15. `client/src/pages/modules/transport/vehicles/VehiclesList.jsx`
