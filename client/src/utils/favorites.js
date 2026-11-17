/**
 * @fileoverview Utility functions for Favorite Pages and Page Visit tracking.
 * Manages user pinned pages and auto-detected frequent pages.
 */

export const DEFAULT_FREQUENT_PAGES = [
  { path: "/inventory/items", title: "Items Master", module: "Inventory", iconKey: "Archive" },
  { path: "/finance/vouchers/payment", title: "Payment Vouchers", module: "Finance", iconKey: "Banknote" },
  { path: "/sales/orders", title: "Sales Orders", module: "Sales", iconKey: "ShoppingCart" },
  { path: "/purchase/orders", title: "Purchase Orders", module: "Procurement", iconKey: "ShoppingBag" },
  { path: "/human-resources/employees", title: "Employees", module: "HR", iconKey: "Users" },
  { path: "/pos", title: "Point of Sale", module: "POS", iconKey: "Calculator" },
  { path: "/inventory/stock-take/daily", title: "Daily Stock Take", module: "Inventory", iconKey: "ClipboardCheck" },
  { path: "/maintenance/work-orders", title: "Work Orders", module: "Maintenance", iconKey: "Wrench" },
];

export function resolvePageMetadata(pathname) {
  if (!pathname) return { title: "Page", module: "General", iconKey: "FileText" };
  const p = pathname.toLowerCase();
  if (p.includes("/inventory/items")) return { title: "Items Master", module: "Inventory", iconKey: "Archive" };
  if (p.includes("/inventory/stock-take")) return { title: "Stock Take", module: "Inventory", iconKey: "ClipboardCheck" };
  if (p.includes("/inventory/material-requisitions")) return { title: "Material Requisitions", module: "Inventory", iconKey: "FileText" };
  if (p.includes("/inventory")) return { title: "Inventory Master", module: "Inventory", iconKey: "Archive" };
  if (p.includes("/finance/vouchers/payment")) return { title: "Payment Vouchers", module: "Finance", iconKey: "Banknote" };
  if (p.includes("/finance/vouchers/receipt")) return { title: "Receipt Vouchers", module: "Finance", iconKey: "Banknote" };
  if (p.includes("/finance/vouchers/journal")) return { title: "Journal Vouchers", module: "Finance", iconKey: "BookOpen" };
  if (p.includes("/finance/vouchers/contra")) return { title: "Contra Vouchers", module: "Finance", iconKey: "Banknote" };
  if (p.includes("/finance/reports/balance-sheet")) return { title: "Balance Sheet", module: "Finance", iconKey: "TrendingUp" };
  if (p.includes("/finance/reports/profit-loss") || p.includes("/finance/reports/pnl")) return { title: "Profit & Loss", module: "Finance", iconKey: "TrendingUp" };
  if (p.includes("/finance/banking")) return { title: "Banking & Cash", module: "Finance", iconKey: "Landmark" };
  if (p.includes("/finance")) return { title: "Finance & Accounts", module: "Finance", iconKey: "Landmark" };
  if (p.includes("/sales/orders")) return { title: "Sales Orders", module: "Sales", iconKey: "ShoppingCart" };
  if (p.includes("/sales/invoices")) return { title: "Sales Invoices", module: "Sales", iconKey: "FileText" };
  if (p.includes("/sales/customers")) return { title: "Customers", module: "Sales", iconKey: "Users" };
  if (p.includes("/sales")) return { title: "Sales Management", module: "Sales", iconKey: "ShoppingCart" };
  if (p.includes("/purchase/orders")) return { title: "Purchase Orders", module: "Procurement", iconKey: "ShoppingBag" };
  if (p.includes("/purchase/suppliers")) return { title: "Suppliers", module: "Procurement", iconKey: "Building2" };
  if (p.includes("/purchase/general-requisitions")) return { title: "General Requisitions", module: "Procurement", iconKey: "FileText" };
  if (p.includes("/purchase")) return { title: "Procurement", module: "Procurement", iconKey: "ShoppingBag" };
  if (p.includes("/pos")) return { title: "Point of Sale", module: "POS", iconKey: "Calculator" };
  if (p.includes("/human-resources/employees")) return { title: "Employee Directory", module: "HR", iconKey: "Users" };
  if (p.includes("/human-resources/payroll")) return { title: "Payroll Processing", module: "HR", iconKey: "Banknote" };
  if (p.includes("/human-resources/leave")) return { title: "Leave Management", module: "HR", iconKey: "Calendar" };
  if (p.includes("/human-resources")) return { title: "Human Resources", module: "HR", iconKey: "Users" };
  if (p.includes("/maintenance/work-orders")) return { title: "Work Orders", module: "Maintenance", iconKey: "Wrench" };
  if (p.includes("/maintenance")) return { title: "Maintenance", module: "Maintenance", iconKey: "Wrench" };
  if (p.includes("/facilities/inspections")) return { title: "FM Inspections", module: "Facilities", iconKey: "CheckCircle2" };
  if (p.includes("/facilities")) return { title: "Facilities Management", module: "Facilities", iconKey: "Building2" };
  if (p.includes("/project-management")) return { title: "Projects Master", module: "Projects", iconKey: "Layers" };
  if (p.includes("/transport")) return { title: "Transport & Fleet", module: "Transport", iconKey: "Truck" };
  if (p.includes("/production")) return { title: "Production Orders", module: "Production", iconKey: "Factory" };
  if (p.includes("/asset-management")) return { title: "Asset Registry", module: "Assets", iconKey: "Boxes" };
  if (p.includes("/business-intelligence")) return { title: "BI Dashboard", module: "Analytics", iconKey: "BarChart3" };
  if (p.includes("/administration/workflows/approvals")) return { title: "Approvals Center", module: "Workflows", iconKey: "ClipboardCheck" };
  if (p.includes("/administration")) return { title: "Administration", module: "Admin", iconKey: "Settings" };

  // Fallback parsing segments
  const segs = pathname.split("/").filter(Boolean);
  const lastSeg = segs[segs.length - 1] || "Page";
  const formattedTitle = lastSeg
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  const firstSeg = segs[0] || "Module";
  const formattedModule = firstSeg
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { title: formattedTitle, module: formattedModule, iconKey: "FileText" };
}

export function getFavoritePages(userId) {
  try {
    const key = `omni_favorites_${userId || "default"}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavoritePages(userId, pages) {
  try {
    const key = `omni_favorites_${userId || "default"}`;
    localStorage.setItem(key, JSON.stringify(pages));
    window.dispatchEvent(new Event("omnisuite_favorites_changed"));
  } catch {}
}

export function togglePageFavorite(userId, page) {
  const list = getFavoritePages(userId);
  const exists = list.some((p) => p.path === page.path);
  let updated;
  if (exists) {
    updated = list.filter((p) => p.path !== page.path);
  } else {
    updated = [page, ...list.slice(0, 15)];
  }
  saveFavoritePages(userId, updated);
  return !exists;
}

export function isPageFavorited(userId, path) {
  if (!path) return false;
  const list = getFavoritePages(userId);
  return list.some((p) => p.path === path);
}

export function recordPageVisit(userId, page) {
  if (!page?.path || page.path === "/" || page.path === "/home" || page.path === "/login" || page.path === "/notifications") return;
  try {
    const key = `omni_page_visits_${userId || "default"}`;
    const raw = localStorage.getItem(key);
    const visits = raw ? JSON.parse(raw) : {};
    const existing = visits[page.path] || {
      count: 0,
      path: page.path,
      title: page.title,
      module: page.module,
      iconKey: page.iconKey,
    };
    visits[page.path] = {
      ...existing,
      count: (existing.count || 0) + 1,
      lastVisited: Date.now(),
      title: page.title || existing.title || page.path,
      module: page.module || existing.module || "General",
      iconKey: page.iconKey || existing.iconKey || "FileText",
    };
    localStorage.setItem(key, JSON.stringify(visits));
    window.dispatchEvent(new Event("omnisuite_page_visits_changed"));
  } catch {}
}

export function getFrequentPages(userId, limit = 8) {
  try {
    const key = `omni_page_visits_${userId || "default"}`;
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULT_FREQUENT_PAGES.slice(0, limit);
    const visits = JSON.parse(raw);
    const list = Object.values(visits)
      .filter((v) => v.path && v.path !== "/" && v.path !== "/home")
      .sort((a, b) => (b.count || 0) - (a.count || 0));
    if (list.length === 0) return DEFAULT_FREQUENT_PAGES.slice(0, limit);
    if (list.length < limit) {
      const paths = new Set(list.map((x) => x.path));
      for (const def of DEFAULT_FREQUENT_PAGES) {
        if (!paths.has(def.path)) {
          list.push(def);
          if (list.length >= limit) break;
        }
      }
    }
    return list.slice(0, limit);
  } catch {
    return DEFAULT_FREQUENT_PAGES.slice(0, limit);
  }
}
