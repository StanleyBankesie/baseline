export const CSS_BUNDLE = `
  *, ::before, ::after {
    box-sizing: border-box;
    border-width: 0;
    border-style: solid;
    border-color: #e2e8f0;
    margin: 0;
    padding: 0;
  }
  html, body {
    height: 100%;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    background-color: #f8fafc;
    overflow-x: hidden;
  }
  .hidden { display: none !important; }
  .block { display: block !important; }
  .inline-flex { display: inline-flex !important; }
  .flex { display: flex !important; }
  .grid { display: grid !important; }
  .flex-col { flex-direction: column !important; }
  .flex-row { flex-direction: row !important; }
  .flex-wrap { flex-wrap: wrap !important; }
  .flex-1 { flex: 1 1 0% !important; }
  .shrink-0 { flex-shrink: 0 !important; }
  .items-center { align-items: center !important; }
  .justify-between { justify-content: space-between !important; }
  .justify-center { justify-content: center !important; }
  .gap-1 { gap: 0.25rem !important; }
  .gap-1\\.5 { gap: 0.375rem !important; }
  .gap-2 { gap: 0.5rem !important; }
  .gap-3 { gap: 0.75rem !important; }
  .gap-4 { gap: 1rem !important; }
  .p-2 { padding: 0.5rem !important; }
  .p-3 { padding: 0.75rem !important; }
  .p-3\\.5 { padding: 0.875rem !important; }
  .p-4 { padding: 1rem !important; }
  .px-4 { padding-left: 1rem !important; padding-right: 1rem !important; }
  .px-5 { padding-left: 1.25rem !important; padding-right: 1.25rem !important; }
  .py-1\\.5 { padding-top: 0.375rem !important; padding-bottom: 0.375rem !important; }
  .py-2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
  .py-2\\.5 { padding-top: 0.625rem !important; padding-bottom: 0.625rem !important; }
  .w-full { width: 100% !important; }
  .w-48 { width: 12rem !important; }
  .w-9 { width: 2.25rem !important; }
  .h-9 { height: 2.25rem !important; }
  .rounded-xl { border-radius: 0.75rem !important; } /* 12px */
  .rounded-lg { border-radius: 0.5rem !important; } /* 8px */
  .rounded-full { border-radius: 9999px !important; }
  .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
  .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
  .font-medium { font-weight: 500 !important; }
  .font-bold { font-weight: 700 !important; }
  .border { border-width: 1px !important; }
  .border-b { border-bottom-width: 1px !important; }
  .sticky { position: sticky !important; }
  .top-0 { top: 0px !important; }
  .z-40 { z-index: 40 !important; }
  .z-50 { z-index: 50 !important; }
  .relative { position: relative !important; }
  .absolute { position: absolute !important; }
  .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }

  /* OmniSuite Button Tokens */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 500;
    min-height: 42px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 150ms ease;
    border: 1px solid transparent;
  }
  .btn:active {
    transform: scale(0.98);
  }
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .btn-primary {
    background-color: #0E3646 !important;
    color: #ffffff !important;
    min-height: 42px;
    padding: 0.625rem 1.25rem;
    border-radius: 12px;
  }
  .btn-primary:hover:not(:disabled) {
    background-color: #173d50 !important;
    box-shadow: 0 4px 12px rgba(14, 54, 70, 0.25) !important;
  }

  .btn-secondary {
    background-color: #ffffff !important;
    color: rgb(51, 65, 85) !important;
    border: 1px solid rgb(226, 232, 240) !important;
    min-height: 42px;
    padding: 0.625rem 1.25rem;
    border-radius: 12px;
  }
  .dark .btn-secondary {
    background-color: rgb(30, 41, 59) !important;
    border-color: rgb(51, 65, 85) !important;
    color: #e2e8f0 !important;
  }

  .btn-danger {
    background-color: rgb(225, 29, 72) !important;
    color: #ffffff !important;
    min-height: 42px;
    padding: 0.5rem 1rem;
    border-radius: 12px;
  }

  .btn-sm {
    min-height: 36px !important;
    height: 36px !important;
    padding: 0.4rem 0.875rem !important;
    font-size: 12px !important;
    border-radius: 8px !important;
  }

  .btn-xs {
    min-height: 30px !important;
    height: 30px !important;
    padding: 0.3rem 0.625rem !important;
    font-size: 12px !important;
    border-radius: 6px !important;
  }

  .btn-icon {
    width: 42px !important;
    height: 42px !important;
    min-height: 42px !important;
    padding: 0 !important;
    border-radius: 12px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .btn-sm.btn-icon, .btn-icon-sm {
    width: 36px !important;
    height: 36px !important;
    min-height: 36px !important;
    padding: 0 !important;
    border-radius: 8px !important;
  }

  .btn-table-action {
    height: 36px !important;
    min-height: 36px !important;
    border-radius: 8px !important;
    font-size: 12px !important;
    padding: 0.375rem 0.75rem !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .list-doc-action-btn {
    height: 36px !important;
    border-radius: 8px !important;
    border: 1px solid rgb(226, 232, 240) !important;
    background: #ffffff !important;
    color: #334155 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0.375rem 1rem !important;
  }

  .list-approval-forward-btn {
    height: 36px !important;
    background-color: #0E3646 !important;
    color: #ffffff !important;
    border-radius: 8px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0.375rem 1rem !important;
  }

  .list-approval-reverse-btn {
    height: 36px !important;
    border: 1px solid rgb(220, 38, 38) !important;
    color: rgb(185, 28, 28) !important;
    border-radius: 8px !important;
    background: #ffffff !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0.375rem 1rem !important;
  }

  .input, .select {
    min-height: 42px !important;
    height: 42px !important;
    padding: 0.625rem 0.875rem !important;
    border-radius: 12px !important;
    border: 1px solid rgb(226, 232, 240) !important;
    background: #ffffff !important;
    font-size: 14px !important;
    box-sizing: border-box !important;
  }

  .card {
    border-radius: 1rem !important;
    border: 1px solid rgba(226, 232, 240, 0.9) !important;
    background: #ffffff !important;
  }
  .card-header {
    border-bottom: 1px solid #f1f5f9 !important;
    padding: 1rem 1.5rem !important;
  }

  /* Responsive Breakpoint 768px */
  @media (min-width: 768px) {
    .md\\:block { display: block !important; }
    .md\\:hidden { display: none !important; }
    .md\\:flex { display: flex !important; }
    .md\\:flex-row { flex-direction: row !important; }
    .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
    .md\\:items-center { align-items: center !important; }
  }
`;

export function generateNavBannerHtml(options = {}) {
  const { hasContent = true, wrapperSticky = true } = options;
  if (!hasContent) {
    return `<!DOCTYPE html><html><head><style>${CSS_BUNDLE}</style></head><body><div id="root"></div></body></html>`;
  }
  const wrapperClass = wrapperSticky ? "sticky top-0 z-40 bg-transparent hidden md:block" : "hidden md:block";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${CSS_BUNDLE}</style>
</head>
<body>
  <div id="root">
    <div id="module-dashboard-sticky-wrapper" class="${wrapperClass}">
      <div id="module-top-nav-bar" class="hidden md:block bg-transparent border-b border-slate-200/60 px-4 py-2 transition-colors">
        <div class="flex items-center gap-1.5 flex-wrap">
          <a href="/" id="nav-home" class="btn btn-secondary btn-sm">Home</a>
          <div class="w-px h-5 bg-slate-200 mx-1.5"></div>
          <button class="btn btn-secondary btn-sm nav-section-btn">Overview</button>
          <button class="btn btn-secondary btn-sm nav-section-btn">Transactions</button>
          <button class="btn btn-secondary btn-sm nav-section-btn">Reports</button>
        </div>
      </div>
    </div>
    <div id="page-content" class="p-4" style="height: 1200px;">
      <h1 class="text-xl font-bold">Module Dashboard</h1>
      <p>Body content below navigation</p>
    </div>
  </div>
</body>
</html>`;
}

export function generateButtonMatrixHtml(options = {}) {
  const isDark = options.dark ? 'class="dark"' : '';
  return `<!DOCTYPE html>
<html ${isDark}>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${CSS_BUNDLE}</style>
</head>
<body>
  <div class="p-6 flex flex-col gap-4">
    <button id="btn-base" class="btn">Base Button</button>
    <button id="btn-primary" class="btn btn-primary">Primary Action</button>
    <button id="btn-secondary" class="btn btn-secondary">Secondary Action</button>
    <button id="btn-danger" class="btn btn-danger">Danger Action</button>
    <button id="btn-sm" class="btn btn-sm">Compact Button</button>
    <button id="btn-icon-std" class="btn btn-secondary btn-icon" title="Refresh">
      <svg width="16" height="16" viewBox="0 0 24 24"><path d="M4 12v-4h4"/></svg>
    </button>
    <button id="btn-icon-compact" class="btn btn-secondary btn-sm btn-icon" title="Compact Icon">
      <svg width="16" height="16" viewBox="0 0 24 24"><path d="M4 12v-4h4"/></svg>
    </button>
    <button id="btn-table-action" class="btn-table-action">View</button>
    <button id="btn-doc-action" class="list-doc-action-btn">Print</button>
    <button id="btn-approval-fwd" class="list-approval-forward-btn">Forward</button>
    <button id="btn-approval-rev" class="list-approval-reverse-btn">Reverse</button>
    <button id="btn-disabled" class="btn btn-primary" disabled>Disabled Action</button>
    <button id="btn-py1-override" class="btn btn-secondary py-1">Padding Override</button>
    <button id="btn-primary-sm-override" class="btn btn-primary btn-sm">Primary Small Override</button>
    <button id="btn-legacy-grey" class="btn" style="background-color: #6c757d;">Legacy Grey</button>
    <div style="width: 260px;">
      <button id="btn-long-label" class="btn btn-primary w-full">Create Multi-Stage Project Reallocation Approval</button>
    </div>
    <div class="flex items-center gap-2">
      <input id="input-adjacent" class="input" placeholder="Type here..." />
      <button id="btn-adjacent" class="btn btn-primary">Submit</button>
    </div>
    <div id="modal-footer" class="flex items-center justify-between gap-3">
      <button id="modal-cancel" class="btn btn-secondary">Cancel</button>
      <button id="modal-submit" class="btn btn-primary">Save Changes</button>
    </div>
  </div>
</body>
</html>`;
}

export function generateTableDensityHtml(options = {}) {
  const {
    includeAudit = false,
    includeCategory = false,
    includeActive = false,
    includeAttachments = false,
    isBoq = false,
    empty = false
  } = options;

  let headers = [];
  if (isBoq) {
    headers = ['#', 'Item Code', 'Description of Work', 'Cost Category', 'Unit (UoM)', 'Quantity', 'Unit Rate', 'Amount', 'Rate Build', 'Del'];
  } else {
    headers = ['Order No', 'Date', 'Customer', 'Status', 'Total', 'Actions'];
    if (includeCategory) headers.push('Category');
    if (includeActive) headers.push('Active');
    if (includeAttachments) headers.push('Attachments');
    if (includeAudit) {
      headers.push('Created By', 'Created Date');
    }
  }

  const thHtml = headers.map(h => `<th class="p-3 text-left font-bold text-xs uppercase">${h}</th>`).join('');
  const colSpan = headers.length;

  let bodyHtml = '';
  if (empty) {
    bodyHtml = `<tr><td colspan="${colSpan}" id="empty-state-cell" class="px-3 py-2 text-center text-slate-500">No records found</td></tr>`;
  } else {
    bodyHtml = `
      <tr class="border-b">
        <td class="px-3 py-2 text-sm">ORD-1001</td>
        <td class="px-3 py-2 text-sm">2026-11-10</td>
        <td class="px-3 py-2 text-sm truncate" style="max-width: 200px;">Acme Industrial Corp</td>
        <td class="px-3 py-2 text-sm"><span class="px-2 py-0.5 bg-green-100 text-green-800 rounded-lg text-xs">APPROVED</span></td>
        <td class="px-3 py-2 text-sm font-medium">$12,450.00</td>
        <td class="px-3 py-2 text-sm flex items-center gap-1" style="max-width: 260px; width: 260px;">
          <button class="btn-table-action rounded-lg">View</button>
          <button class="btn-table-action rounded-lg">Edit</button>
          <button class="list-doc-action-btn">Print</button>
        </td>
        ${includeCategory ? '<td class="px-3 py-2 text-sm">DRAWING</td>' : ''}
        ${includeActive ? '<td class="px-3 py-2 text-sm">Active</td>' : ''}
        ${includeAttachments ? '<td class="px-3 py-2 text-sm"><button class="list-doc-action-btn">Files</button></td>' : ''}
        ${includeAudit ? '<td class="px-3 py-2 text-sm grid-created-by-cell">admin_user</td><td class="px-3 py-2 text-sm grid-created-date-cell">2026-11-10</td>' : ''}
      </tr>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${CSS_BUNDLE}</style>
</head>
<body>
  <div class="p-4" style="max-width: 100%; overflow-x: hidden;">
    <div class="card overflow-x-auto">
      <table class="w-full border-collapse">
        <thead class="bg-slate-100 border-b">
          <tr>${thHtml}</tr>
        </thead>
        <tbody>
          ${bodyHtml}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

export function generateFilterToolbarHtml(options = {}) {
  const { separateHeader = true, refreshSquare = true, kpiCount = 4 } = options;

  let kpiCardsHtml = '';
  for (let i = 1; i <= kpiCount; i++) {
    kpiCardsHtml += `
      <div class="card p-4">
        <span class="text-xs font-semibold uppercase text-slate-500">Metric ${i}</span>
        <div class="text-2xl font-bold mt-1">1,24${i}</div>
      </div>
    `;
  }

  const refreshBtnClass = refreshSquare ? "btn btn-secondary btn-icon" : "btn btn-secondary p-2";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${CSS_BUNDLE}</style>
</head>
<body>
  <div class="p-6 flex flex-col gap-4">
    <!-- Tier 1: Header -->
    <div id="tier1-header" class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <a href="#" id="header-back-btn" class="btn btn-secondary">Back</a>
        <div>
          <h1 id="page-title" class="text-2xl font-bold">Document Register & RFIs</h1>
          <p class="text-xs text-slate-500">Manage construction drawings and project RFIs</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        ${!separateHeader ? `
          <select id="crammed-select" class="input w-48"><option>Project Alpha</option></select>
          <input id="crammed-search" class="input w-48" placeholder="Search..." />
          <button id="crammed-refresh" class="${refreshBtnClass}" title="Refresh">↻</button>
        ` : ''}
        <button id="header-primary-btn" class="btn btn-primary">+ Register Drawing</button>
      </div>
    </div>

    <!-- Tier 2: KPI Cards -->
    <div id="tier2-kpis" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      ${kpiCardsHtml}
    </div>

    <!-- Tier 3: Dedicated Filter Toolbar -->
    ${separateHeader ? `
    <div id="tier3-filter-toolbar" class="card card-header flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="flex-1 w-full relative">
        <input id="filter-search" class="input w-full pl-9" placeholder="Search drawings & RFIs..." />
      </div>
      <div class="flex items-center gap-3 w-full sm:w-auto">
        <select id="filter-project-select" class="select min-w-[180px]">
          <option>All Projects</option>
          <option>PRJ-001 - Ridge Residential</option>
          <option>PRJ-002 - Marina Commercial</option>
        </select>
        <select id="filter-status-select" class="select min-w-[140px]">
          <option value="ALL">All Statuses</option>
          <option value="APPROVED">APPROVED</option>
          <option value="PENDING">PENDING</option>
        </select>
        <button id="filter-refresh-btn" class="${refreshBtnClass}" title="Refresh">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <div id="filter-view-toggle" class="flex items-center gap-1 border rounded-lg p-1">
          <button class="btn-xs" title="Table View">Table</button>
          <button class="btn-xs" title="Grid View">Grid</button>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Table -->
    <div id="tier3-table" class="card overflow-x-auto">
      <table class="w-full border-collapse">
        <thead class="bg-slate-100 border-b">
          <tr>
            <th class="p-3 text-left">Drawing #</th>
            <th class="p-3 text-left">Title</th>
            <th class="p-3 text-left">Discipline</th>
            <th class="p-3 text-left">Revision</th>
            <th class="p-3 text-left">Status</th>
            <th class="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="p-3">DRW-001</td>
            <td class="p-3">Foundation Details</td>
            <td class="p-3">Structural</td>
            <td class="p-3">Rev A</td>
            <td class="p-3">APPROVED</td>
            <td class="p-3"><button class="btn-table-action">View</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}
