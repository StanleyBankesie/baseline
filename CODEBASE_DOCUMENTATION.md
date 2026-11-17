# OmniSuite Enterprise ERP â€” Comprehensive Codebase Documentation

## 1. System Overview & Architecture

OmniSuite is an enterprise multi-tenant Enterprise Resource Planning (ERP) platform designed for operational management, commercial workflows, human resources, financials, and facilities tracking.

### Monorepo Structure & Tech Stack

```
demo/
â”œâ”€â”€ client/                 # Frontend application
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ api/            # Axios API client & offline request queue
â”‚   â”‚   â”œâ”€â”€ auth/           # Authentication state & permission contexts (RBAC)
â”‚   â”‚   â”œâ”€â”€ components/     # Shared design components & modal wrappers
â”‚   â”‚   â”œâ”€â”€ hooks/          # Custom React hooks (currency, exchange rates, etc.)
â”‚   â”‚   â”œâ”€â”€ layout/         # Root AppShell, sidebars, navigation bars
â”‚   â”‚   â”œâ”€â”€ pages/modules/  # 16 domain ERP modules & feature views
â”‚   â”‚   â””â”€â”€ styles.css      # Design tokens, Apple clean controls, universal shadows
â”‚   â”œâ”€â”€ index.html          # Single page entry point
â”‚   â”œâ”€â”€ package.json        # Frontend dependencies (React 18, Vite 6, Tailwind CSS)
â”‚   â””â”€â”€ tailwind.config.js  # Color palettes, typography, box shadows
â”œâ”€â”€ server/                 # Backend RESTful API service
â”‚   â”œâ”€â”€ controllers/        # Domain business logic & database controller functions
â”‚   â”œâ”€â”€ db/                 # MySQL connection pool and transaction helpers
â”‚   â”œâ”€â”€ middleware/         # Auth verification, tenant scoping, permissions
â”‚   â”œâ”€â”€ routes/             # Express route definitions mapped to controllers
â”‚   â”œâ”€â”€ services/           # Background engines (BI analytics, Face AI, budget)
â”‚   â””â”€â”€ utils/              # Query parameter sanitizers, formatters, HTTP errors
â””â”€â”€ .agents/skills/         # Antigravity developer agent skills & guidelines
```

---

## 2. Backend Architecture (`server/`)

### 2.1 Multi-Tenancy & Security Context
Every authenticated request traverses three core middleware gates:
1. `requireAuth`: Validates JWT token from the `Authorization: Bearer <token>` header or session cookies. Populates `req.user`.
2. `requireCompanyScope`: Enforces data isolation between enterprise tenants. Resolves `req.scope.companyId` from `req.user.company_id`.
3. `requireBranchScope`: Resolves organizational branch scoping (`req.scope.branchId` or `req.scope.branchIdsStr`).
4. `requirePermission(permKey)`: Enforces fine-grained Role-Based Access Control (RBAC), verifying that the authenticated user possesses the specific module capability (e.g., `PM.PROJECT.VIEW`, `PM.PROJECT.MANAGE`).

### 2.2 Database Layer & Connection Pooling (`server/db/pool.js`)
- MySQL 8.0 connection pool with connection pooling, automatic reconnection, and named parameter binding (`:paramName`).
- Dynamic schema evolution: Controllers utilize `ensure<Module>Tables` helpers to lazily run idempotent `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN IF NOT EXISTS` migrations on boot.

### 2.3 Core Domain Modules & Controllers

| Module | Core Route | Primary Controller | Key Responsibilities |
|---|---|---|---|
| **Project Management** | `/api/projects` | `projects.controller.js` | Portfolio tracking, automated project code generation (`AAA/MM/YYYY/001`), milestones, tasks, CPM schedules, contract specifications, and Cloudinary attachments. |
| **Finance & Ledger** | `/api/finance` | `finance.controller.js` | Chart of Accounts (`fin_accounts`), general ledger entries (`fin_vouchers`), multi-currency revaluations, trial balance, and balance sheet reports. |
| **Sales & CRM** | `/api/sales` | `sales.controller.js` | Customer registry (`crm_customers`), price lists, sales orders, invoices, and payment receipts. |
| **Procurement & Purchase**| `/api/purchase` | `purchase.controller.js` | Vendor/supplier directories, purchase orders, goods receipt notes (GRN), and bills payable. |
| **Inventory & Warehouses**| `/api/inventory`| `inventory.controller.js`| Item master catalogue, multi-warehouse stock balances, valuation, and stock transfers. |
| **Human Resources** | `/api/hr` | `hr.controller.js` | Employee master files, departments, payroll calculation, timesheets, and leave records. |
| **Facilities Management** | `/api/facilities`| `facilities.controller.js`| Buildings, asset registries, maintenance work orders, and service contractor billing. |
| **Business Intelligence** | `/api/bi` | `bi.controller.js` | ETL pipelines, cross-module KPI dashboards, scheduled reporting, and financial anomaly detection. |

---

## 3. Frontend Architecture (`client/`)

### 3.1 Design System & Visual Standards (`client/src/styles.css`)
- **Typography**: Apple HIG typography stack (`-apple-system`, `SF Pro Display`, `Inter`).
- **Surface Elevation**: All form controls (`input`, `select`, `textarea`, `.input`, `.select`) feature uniform **smokey grey ambient drop-shadows** (`box-shadow: 0 2px 5px -1px rgba(71, 85, 105, 0.16)`) to elevate actionable controls cleanly against bright and dark canvases.
- **Controls & Buttons**:
  - Primary button (`.btn-primary`): Deep Teal `#0E3646` (`min-height: 42px`, `rounded-xl`).
  - Secondary button (`.btn-secondary`): Clean border with subtle hover feedback.
  - Form Fields (`.input`, `.select`): 42px height, 14px font, compact 12px placeholders.

### 3.2 View Architecture (`client/src/pages/modules/`)
List and form views follow a strict 3-tier architectural standard:
- **Tier 1 (Header)**: Breadcrumb / Back button, Title & Subtitle on left, Primary Action Button on right.
- **Tier 2 (KPI Metric Cards)**: Summary statistics cards displaying key numerical totals, equipped with solid colored badges and icons aligned to the right (after label and metric).
- **Tier 3 (Filter Toolbar & Grid/Table)**: Integrated Search input, category dropdown filters, refresh trigger, and ViewToggle (Chronological / Gantt / List / Grid).

---

## 4. Key Workflows & Business Logic

### 4.1 Project Code Auto-Generation
When a project is created without a designated project code:
1. `generateProjectCode(projectName, startDate, companyId)` extracts the first letter of the first three words of the project title (e.g., *"Kwame Nkrumah Interchange"* â†’ `KNI`).
2. Appends the zero-padded two-digit start month and four-digit start year (`MM/YYYY`).
3. Queries existing codes matching `${prefix}/${month}/${year}/%` to locate the highest chronological integer.
4. Generates the sequential 3-digit zero-padded code (e.g. `KNI/11/2026/001`).

### 4.2 Milestone Dual-Write Synchronization
When project milestones are created or edited in the Milestone Modal:
1. Records are written to `pm_milestones` (holding contractual stage gates, target completion dates, and deliverables).
2. Corresponding records are synchronously mirrored into `pm_tasks` so that the **Project Milestones & Timeline** view can immediately plot them on both the Chronological Gantt chart and Step-by-Step progress timeline.

### 4.3 Client Registration & Deep Linking
1. If an operator types an unregistered client name (2+ characters) in the Project creation form, a warning SweetAlert prompts with an **"Add Client"** action.
2. Triggering the button deep-links to `/project-management/setup?tab=clients&new=true`.
3. The Setup page inspects `searchParams`, automatically switches to the **Clients** tab, and opens the **New Client** modal immediately.
4. The client creation form populates the Revenue Account directly from postable income accounts in `fin_accounts`, requiring all operational fields while leaving personal contact fields optional.
