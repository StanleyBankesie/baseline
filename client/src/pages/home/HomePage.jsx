/**
 * @fileoverview HomePage component.
 * Serves as the main landing dashboard for users, displaying metrics, pending approvals, and notifications.
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { usePermission } from "../../auth/PermissionContext.jsx";
import client from "../../api/client";
import useSocket from "../../hooks/useSocket.js";
import CompanyFeed from "../../components/CompanyFeed/CompanyFeed";
import { toast } from "react-toastify";
import { getModuleDashboards } from "../../data/modulesRegistry.js";
import { DASHBOARD_CARDS } from "../../data/dashboardCards.js";
import { getAssignedPagesForModule } from "../../data/modulePagesRegistry.js";
import {
  ArrowRight,
  ChevronRight,
  CheckCircle,
  CheckCircle2,
  X,
  History,
  Eye,
  Clock,
  User,
  Building2,
  Calendar,
  ShieldCheck,
  MessageSquare,
  ClipboardCheck,
  Star,
  Archive,
  Banknote,
  ShoppingCart,
  ShoppingBag,
  Users,
  Calculator,
  Wrench,
  Landmark,
  Layers,
  Truck,
  Factory,
  Boxes,
  BarChart3,
  FileText,
} from "lucide-react";
import GoldenBellIcon from "../../components/GoldenBellIcon.jsx";
import MobileMovingCarousel from "../../components/MobileMovingCarousel.jsx";
import { getFavoritePages, getFrequentPages } from "../../utils/favorites.js";
import SocialFeedPage from "../social/SocialFeedPage.jsx";

function renderFavIcon(iconKey) {
  switch (iconKey) {
    case "Archive":
      return <Archive size={16} />;
    case "Banknote":
      return <Banknote size={16} />;
    case "ShoppingCart":
      return <ShoppingCart size={16} />;
    case "ShoppingBag":
      return <ShoppingBag size={16} />;
    case "Users":
      return <Users size={16} />;
    case "Calculator":
      return <Calculator size={16} />;
    case "ClipboardCheck":
      return <ClipboardCheck size={16} />;
    case "Wrench":
      return <Wrench size={16} />;
    case "Landmark":
      return <Landmark size={16} />;
    case "Building2":
      return <Building2 size={16} />;
    case "Layers":
      return <Layers size={16} />;
    case "Truck":
      return <Truck size={16} />;
    case "Factory":
      return <Factory size={16} />;
    case "Boxes":
      return <Boxes size={16} />;
    case "BarChart3":
      return <BarChart3 size={16} />;
    default:
      return <FileText size={16} />;
  }
}

/**
 * HomePage component
 * Main overview page aggregating data from across the system based on user permissions.
 * 
 * @returns {JSX.Element} The home page view.
 */
export default function HomePage() {
  const { user, token, scope } = useAuth();
  const perm = usePermission();
  const {
    canAccessPath,
    hasRoleFeature,
    canViewDashboardElement,
    canReverseApproval,
    getEnabledModules,
    isModuleEnabled,
    canViewModule,
    isBasicMode,
  } = perm;
  const navigate = useNavigate();
  const [pendingItems, setPendingItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [sentDocuments, setSentDocuments] = useState([]);
  const [actionTab, setActionTab] = useState("pending");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [showPostAlerts, setShowPostAlerts] = useState(false);
  const [postAlerts, setPostAlerts] = useState([]);
  const [postAlertsLoading, setPostAlertsLoading] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyModalFocusId, setHistoryModalFocusId] = useState(null);
  const [overview, setOverview] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [modalInstanceId, setModalInstanceId] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [modalComment, setModalComment] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalProcessing, setModalProcessing] = useState(false);
  const [modalNextUser, setModalNextUser] = useState(null);
  // legacy chat widget removed
  const postRef = useRef(null);
  const pendingHeaderRef = useRef(null);
  const [pendingHeight, setPendingHeight] = useState(null);
  const [reportsModules, setReportsModules] = useState([]);
  const [roleFeatures, setRoleFeatures] = useState([]);
  const [allFeatures, setAllFeatures] = useState([]);
  const [activeModule, setActiveModule] = useState(null);
  const [profileData, setProfileData] = useState(user);
  const [userBranches, setUserBranches] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const photoInputRef = useRef(null);
  const moduleReportsMap = useMemo(
    () => ({
      inventory: [
        { label: "Stock Balances", path: "/inventory/reports/stock-balances" },
        { label: "Issue Register", path: "/inventory/reports/issue-register" },
        {
          label: "Stock Summary",
          path: "/inventory/reports/periodical-stock-summary",
        },
        {
          label: "Stock Statement",
          path: "/inventory/reports/periodical-stock-statement",
        },
        {
          label: "Stock Transfer Register",
          path: "/inventory/reports/stock-transfer-register",
        },
        {
          label: "Stock Verification",
          path: "/inventory/reports/stock-verification",
        },
        {
          label: "Stock Aging Analysis",
          path: "/inventory/reports/stock-aging-analysis",
        },
        { label: "Slow Moving Items", path: "/inventory/reports/slow-moving" },
        { label: "Fast Moving Items", path: "/inventory/reports/fast-moving" },
        { label: "Non Moving Items", path: "/inventory/reports/non-moving" },
      ],
      purchase: [
        {
          label: "Supplier Quotation Analysis",
          path: "/purchase/reports/supplier-quotation-analysis",
        },
        {
          label: "Import Purchase Order Tracking",
          path: "/purchase/reports/import-order-tracking",
        },
        {
          label: "Local Purchase Order Tracking",
          path: "/purchase/reports/local-order-tracking",
        },
        {
          label: "Pending GRN → Bill (Local)",
          path: "/purchase/reports/pending-grn-to-bill-local",
        },
        {
          label: "Pending GRN → Bill (Import)",
          path: "/purchase/reports/pending-grn-to-bill-import",
        },
        {
          label: "Import Order List",
          path: "/purchase/reports/import-order-list",
        },
        {
          label: "Pending Shipment Details",
          path: "/purchase/reports/pending-shipments",
        },
        {
          label: "Purchase Register",
          path: "/purchase/reports/purchase-register",
        },
      ],
      sales: [
        { label: "Debtors Balance", path: "/sales/reports/debtors-balance" },
        {
          label: "Sales Profitability",
          path: "/sales/reports/sales-profitability",
        },
        { label: "Sales Tracking", path: "/sales/reports/sales-tracking" },
      ],
      finance: [
        {
          label: "Voucher Register",
          path: "/finance/reports/voucher-register",
        },
        { label: "Payment Due", path: "/finance/reports/payment-due" },
        {
          label: "Customer Outstanding",
          path: "/finance/reports/customer-outstanding",
        },
        { label: "Trial Balance", path: "/finance/reports/trial-balance" },
        { label: "Audit Trail", path: "/finance/reports/audit-trail" },
        { label: "Journal Report", path: "/finance/reports/journals" },
        { label: "General Ledger", path: "/finance/reports/general-ledger" },
        { label: "Debtors Ledger", path: "/finance/reports/debtors-ledger" },
        {
          label: "Creditors Ledger",
          path: "/finance/reports/creditors-ledger",
        },
        {
          label: "Supplier Outstanding",
          path: "/finance/reports/supplier-outstanding",
        },
        { label: "Profit & Loss", path: "/finance/reports/profit-and-loss" },
        { label: "Balance Sheet", path: "/finance/reports/balance-sheet" },
        { label: "Cash Flow", path: "/finance/reports/cash-flow" },
        { label: "Ratio Analysis", path: "/finance/reports/ratio-analysis" },
      ],
      "service-management": [
        {
          label: "Service Request Summary",
          path: "/service-management/reports/service-request-summary",
        },
        {
          label: "Service Order Status",
          path: "/service-management/reports/service-order-status",
        },
        {
          label: "Execution Performance",
          path: "/service-management/reports/execution-performance",
        },
        {
          label: "SLA Compliance",
          path: "/service-management/reports/sla-compliance",
        },
        {
          label: "Service Revenue",
          path: "/service-management/reports/service-revenue",
        },
        {
          label: "Outstanding Service Bills",
          path: "/service-management/reports/outstanding-bills",
        },
        {
          label: "Service Confirmation",
          path: "/service-management/reports/service-confirmation",
        },
        {
          label: "Technician Utilization",
          path: "/service-management/reports/technician-utilization",
        },
        {
          label: "Service Cost Analysis",
          path: "/service-management/reports/service-cost-analysis",
        },
        {
          label: "Repeat Service Requests",
          path: "/service-management/reports/repeat-requests",
        },
        {
          label: "Service Type Performance",
          path: "/service-management/reports/service-type-performance",
        },
      ],
      administration: [
        {
          label: "System Log Book Report",
          path: "/administration/reports/system-log-book",
        },
        {
          label: "User Login Activity",
          path: "/administration/reports/user-login-activity",
        },
      ],
    }),
    [],
  );
  const moduleDashboardPath = useMemo(
    () => ({
      sales: "/sales/dashboard",
      purchase: "/purchase/dashboard",
      finance: "/finance/dashboard",
      "human-resources": "/human-resources/dashboard",
      "service-management": "/service-management/dashboard",
      pos: "/pos/dashboard",
      inventory: "/inventory/dashboard",
      "business-intelligence": "/business-intelligence/analytics",
      production: "/production/dashboard",
      maintenance: "/maintenance/dashboard",
      "project-management": "/project-management/dashboard",
    }),
    [],
  );

  useEffect(() => {
    function measure() {
      try {
        const root = postRef.current;
        if (!root) return;
        const card = root.parentElement;
        const h = card ? card.offsetHeight : 0;
        if (h && Math.abs(h - (pendingHeight || 0)) > 8) {
          setPendingHeight(h);
        }
      } catch {}
    }
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    const t = setTimeout(measure, 50);
    const t2 = setTimeout(measure, 250);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [pendingHeight]);

  // Sync profileData with authenticated user from AuthContext
  useEffect(() => {
    if (user) {
      setProfileData(user);
    }
  }, [user]);

  // Lazily load features only when a user inspects reports in a module
  useEffect(() => {
    if (!activeModule || allFeatures.length > 0) return;
    let cancelled = false;
    client
      .get("/access/features")
      .then((res) => {
        if (!cancelled) {
          setAllFeatures(Array.isArray(res.data?.features) ? res.data.features : []);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeModule, allFeatures.length]);

  useEffect(() => {
    let cancelled = false;

    client
      .get("/workflows/approvals/pending")
      .then((res) => {
        if (cancelled) return;
        setPendingItems(Array.isArray(res.data?.items) ? res.data.items : []);
      })
      .catch(() => {
        if (cancelled) return;
        setPendingItems([]);
      });

    client
      .get("/workflows/notifications")
      .then((res) => {
        if (cancelled) return;
        setNotifications(Array.isArray(res.data?.items) ? res.data.items : []);
      })
      .catch(() => {
        if (cancelled) return;
        setNotifications([]);
      });

    client
      .get("/workflows/approvals/sent")
      .then((res) => {
        if (cancelled) return;
        setSentDocuments(
          Array.isArray(res.data?.items)
            ? res.data.items
            : Array.isArray(res.data?.data)
            ? res.data.data
            : []
        );
      })
      .catch(() => {
        if (cancelled) return;
        setSentDocuments([]);
      });

    client
      .get("/bi/home-overview")
      .then((res) => {
        if (cancelled) return;
        setOverview(res.data || null);
      })
      .catch(() => {
        if (cancelled) return;
        setOverview(null);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    client
      .get("/auth/user-branches")
      .then((res) => {
        if (cancelled) return;
        setUserBranches(Array.isArray(res.data?.items) ? res.data.items : []);
      })
      .catch(() => {
        if (cancelled) return;
        setUserBranches([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeBranch = useMemo(() => {
    if (!Array.isArray(userBranches) || userBranches.length === 0) return null;
    const targetId = Number(scope?.branchId);
    if (targetId) {
      return userBranches.find((b) => Number(b.id) === targetId) || null;
    }
    return userBranches[0] || null;
  }, [userBranches, scope?.branchId]);

  const displayCompanyName = activeBranch?.company_name || profileData?.company_name || user?.companyName || user?.company_name || "";
  const displayBranchName = activeBranch?.name || profileData?.branch_name || user?.branchName || user?.branch_name || "";

  const normalizeType = (s) =>
    String(s || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
  const toTitleCase = (str) => {
    if (!str) return "";
    return String(str)
      .replace(/[_-]+/g, " ")
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };
  const displayType = (s) => {
    const t = normalizeType(s);
    if (t === "PAYROLL" || t === "SALARY_PROCESSING" || t === "HR_PAYROLL") return "Payroll";
    if (t === "FM_HELPDESK_TICKET" || t === "FM_HELPDESK" || t === "HELPDESK_TICKET") return "FM Helpdesk";
    if (t === "MATERIAL_REQUISITION") return "Material Requisition";
    if (t === "GENERAL_REQUISITION") return "General Requisition";
    if (t === "CREDIT_NOTE") return "Credit Note";
    if (t === "DEBIT_NOTE") return "Debit Note";
    if (t === "TRANSPORT_BILLING") return "Transport Billing";
    if (t === "RETURN_TO_STORES") return "Return to Stores";
    if (t === "SALES_ORDER") return "Sales Order";
    if (t === "STOCK_ADJUSTMENT") return "Stock Adjustment";
    if (t === "JOURNAL_VOUCHER" || t === "JV") return "Journal Voucher";
    if (t === "PAYMENT_VOUCHER" || t === "PV") return "Payment Voucher";
    if (t === "RECEIPT_VOUCHER" || t === "RV") return "Receipt Voucher";
    if (t === "CONTRA_VOUCHER" || t === "CV") return "Contra Voucher";
    if (t === "PETTY_CASH" || t === "PETTY_CASH_BOOK") return "Petty Cash";
    if (t.startsWith("PURCHASE_ORDER:")) {
      const sub = t.split(":")[1];
      if (sub === "LOCAL") return "Purchase Order - Local";
      if (sub === "IMPORT") return "Purchase Order - Import";
      return "Purchase Order";
    }
    if (t === "GOODS_RECEIPT" || t === "GRN" || t === "GOODS_RECEIPT_NOTE") return "GRN";
    if (
      t === "GOODS_RECEIPT:LOCAL" ||
      t === "GRN:LOCAL" ||
      t === "GOODS_RECEIPT_NOTE:LOCAL"
    )
      return "GRN Local";
    if (
      t === "GOODS_RECEIPT:IMPORT" ||
      t === "GRN:IMPORT" ||
      t === "GOODS_RECEIPT_NOTE:IMPORT"
    )
      return "GRN Import";
    return toTitleCase(s || "Document");
  };
  const typeKey = (it) => {
    const base = normalizeType(it.document_type);
    if (base === "PURCHASE_ORDER") {
      const sub = normalizeType(it.po_type);
      return sub ? `${base}:${sub}` : base;
    }
    if (
      base === "GOODS_RECEIPT" ||
      base === "GRN" ||
      base === "GOODS_RECEIPT_NOTE"
    ) {
      const ref = String(it.doc_ref || "");
      const sub = ref.startsWith("GL-")
        ? "LOCAL"
        : ref.startsWith("GI-")
          ? "IMPORT"
          : "";
      return sub ? `${base}:${sub}` : base;
    }
    return base;
  };
  const uniquePending = useMemo(() => {
    const m = new Map();
    for (const it of pendingItems) {
      const key = String(
        it.workflow_instance_id ||
          `${normalizeType(it.document_type)}-${it.document_id}`,
      );
      if (!m.has(key)) m.set(key, it);
    }
    return Array.from(m.values());
  }, [pendingItems]);
  const filteredPending = useMemo(() => {
    return uniquePending;
  }, [uniquePending]);
  const groupedPending = useMemo(() => {
    const out = {};
    for (const it of filteredPending) {
      const k = typeKey(it);
      if (!out[k]) out[k] = [];
      out[k].push(it);
    }
    return out;
  }, [filteredPending]);
  const orderedGroups = useMemo(() => {
    const keys = Object.keys(groupedPending);
    const order = [
      "MATERIAL_REQUISITION",
      "RETURN_TO_STORES",
      "STOCK_ADJUSTMENT",
    ];
    const head = order.filter((k) => keys.includes(k));
    const tail = keys.filter((k) => !order.includes(k)).sort();
    return [...head, ...tail];
  }, [groupedPending]);
  const docLabel = (it) => {
    if (it.doc_title) return it.doc_title;
    const t = displayType(typeKey(it));
    const ref = it.doc_ref ? String(it.doc_ref) : `#${it.document_id}`;
    return `${t} — ${ref}`;
  };

  const formattedTodayDate = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const [favorites, setFavorites] = useState(() => getFavoritePages(user?.id));
  const [frequentPages, setFrequentPages] = useState(() => getFrequentPages(user?.id, 8));

  useEffect(() => {
    const handleFavChange = () => {
      setFavorites(getFavoritePages(user?.id));
      setFrequentPages(getFrequentPages(user?.id, 8));
    };
    handleFavChange();
    window.addEventListener("omnisuite_favorites_changed", handleFavChange);
    window.addEventListener("omnisuite_page_visits_changed", handleFavChange);
    return () => {
      window.removeEventListener("omnisuite_favorites_changed", handleFavChange);
      window.removeEventListener("omnisuite_page_visits_changed", handleFavChange);
    };
  }, [user?.id]);

  const displayPages = useMemo(() => {
    if (favorites && favorites.length > 0) {
      return favorites.slice(0, 8);
    }
    return frequentPages.slice(0, 8);
  }, [favorites, frequentPages]);

  const approvedNotifications = useMemo(() => {
    const uid = Number(user?.sub || user?.id);
    const filtered = notifications.filter((n) => {
      const msg = String(n?.message || "").toLowerCase();
      const isApproved = msg.includes("approved");
      const candidates = [
        Number(n.user_id),
        Number(n.target_user_id),
        Number(n.recipient_id),
        Number(n.assigned_user_id),
        Number(n.request_user_id),
      ];
      const rid = candidates.find((x) => Number.isFinite(x) && x > 0) ?? null;
      const belongs =
        Number.isFinite(uid) && uid > 0 ? rid == null || rid === uid : true;
      return isApproved && belongs;
    });
    return filtered;
  }, [notifications, user?.sub, user?.id]);

  const approvedList = useMemo(() => {
    const notifItems = approvedNotifications.map((n) => {
      const match = String(n.link || "").match(/approvals\/(\d+)/);
      const instanceId = match ? match[1] : null;
      return {
        id: `notif-${n.id}`,
        title: n.title || n.message || "Approved Document",
        subtitle: n.message || "Document approved",
        date: n.created_at,
        instanceId,
        link: n.link || (instanceId ? `/administration/workflows/approvals/${instanceId}` : "/administration/workflows/approved"),
        initiator: n.initiator || "System",
      };
    });

    const sentApproved = sentDocuments
      .filter((d) => String(d.status).toUpperCase() === "APPROVED")
      .map((d) => ({
        id: `sent-${d.id || d.workflow_instance_id}`,
        title: d.doc_title || d.title || `${d.document_type || "Document"} #${d.document_id || d.id}`,
        subtitle: "Document approved",
        date: d.submitted_at || d.created_at,
        instanceId: d.workflow_instance_id || d.instance_id,
        link: d.workflow_instance_id ? `/administration/workflows/approvals/${d.workflow_instance_id}` : "/administration/workflows/sent",
        initiator: user?.full_name || "You",
      }));

    const seen = new Set();
    const merged = [];
    for (const item of [...sentApproved, ...notifItems]) {
      const key = item.instanceId || item.title;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }
    return merged;
  }, [approvedNotifications, sentDocuments, user?.full_name]);

  const itemsToDisplay = useMemo(() => {
    if (actionTab === "pending") {
      if (selectedCategory === "ALL") return uniquePending;
      return groupedPending[selectedCategory] || [];
    } else if (actionTab === "approved") {
      return approvedList;
    } else {
      return sentDocuments;
    }
  }, [actionTab, selectedCategory, uniquePending, groupedPending, approvedList, sentDocuments]);

  const openApprovalModal = async (id) => {
    setShowApprovalModal(true);
    setModalInstanceId(id);
    setModalLoading(true);
    setModalData(null);
    setModalComment("");
    try {
      const res = await client.get(`/workflows/approvals/instance/${id}`);
      const item = res.data?.item || null;
      setModalData(item);
      if (
        item &&
        !item.is_last_step &&
        Array.isArray(item.next_step_approvers)
      ) {
        const first = item.next_step_approvers[0];
        setModalNextUser(first ? first.id : null);
      } else {
        setModalNextUser(null);
      }
    } catch (e) {
      setModalData(null);
    } finally {
      setModalLoading(false);
    }
  };

  const [docHistoryModalOpen, setDocHistoryModalOpen] = useState(false);
  const [selectedDocItem, setSelectedDocItem] = useState(null);
  const [docHistoryLoading, setDocHistoryLoading] = useState(false);
  const [docWorkflowData, setDocWorkflowData] = useState(null);

  const handleOpenDocHistory = async (item, tabType) => {
    setSelectedDocItem({ ...item, _tabType: tabType });
    setDocHistoryModalOpen(true);
    setDocHistoryLoading(true);
    setDocWorkflowData(null);

    const instanceId = item.workflow_instance_id || item.instanceId || extractInstanceIdFromLink(item.link);
    if (instanceId) {
      try {
        const res = await client.get(`/workflows/approvals/instance/${instanceId}`);
        setDocWorkflowData(res.data?.item || null);
      } catch (e) {
        console.error("Failed to fetch workflow history:", e);
      } finally {
        setDocHistoryLoading(false);
      }
    } else {
      setDocHistoryLoading(false);
    }
  };

  const handleViewDocDetails = (item) => {
    if (!item) return;
    setDocHistoryModalOpen(false);
    if (item.link) {
      navigate(item.link);
    } else if (item.workflow_instance_id || item.instanceId) {
      const id = item.workflow_instance_id || item.instanceId;
      navigate(`/administration/workflows/approvals/${id}`);
    } else if (item._tabType === "sent") {
      navigate("/administration/workflows/sent");
    } else if (item._tabType === "approved") {
      navigate("/administration/workflows/approved");
    } else {
      navigate("/administration/workflows/approvals");
    }
  };

  const extractInstanceIdFromLink = (link) => {
    const s = String(link || "");
    const m = s.match(/approvals\/(\d+)/);
    return m ? Number(m[1]) : null;
  };

  const markNotificationRead = async (id) => {
    try {
      await client.put(`/workflows/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)),
      );
    } catch {
      // ignore
    }
  };

  const closeApprovalModal = () => {
    setShowApprovalModal(false);
    setModalInstanceId(null);
    setModalData(null);
    setModalComment("");
    setModalLoading(false);
    setModalProcessing(false);
    setModalNextUser(null);
  };

  const handleModalAction = async (action) => {
    if (!modalInstanceId) return;
    if (!modalComment && (action === "REJECT" || action === "RETURN")) {
      toast.warning("Please provide a comment for rejection/return");
      return;
    }
    if (action === "APPROVE" && modalData && !modalData.is_last_step) {
      if (!modalNextUser) {
        toast.warning("Please select the next approver");
        return;
      }
    }
    setModalProcessing(true);
    try {
      await client.post(`/workflows/${modalInstanceId}/action`, {
        action,
        comments: modalComment,
        target_user_id:
          modalData && !modalData.is_last_step ? modalNextUser : null,
      });
      try {
        const status =
          action === "APPROVE"
            ? modalData && modalData.is_last_step
              ? "APPROVED"
              : "PENDING_APPROVAL"
            : action === "RETURN"
              ? "DRAFT"
              : action;
        const evt = new CustomEvent("omni.workflow.status", {
          detail: {
            status,
            documentType: modalData?.document_type,
            documentId: modalData?.document_id,
            instanceId: modalInstanceId,
            action: action,
          },
        });
        window.dispatchEvent(evt);
      } catch {}
      setPendingItems((items) =>
        items.filter((i) => i.workflow_instance_id !== modalInstanceId),
      );
      try {
        const msg =
          action === "APPROVE"
            ? modalData && !modalData.is_last_step
              ? (() => {
                  const name =
                    Array.isArray(modalData?.next_step_approvers) &&
                    modalData.next_step_approvers.find(
                      (u) => Number(u.id) === Number(modalNextUser),
                    )?.username;
                  return `Forwarded to ${name || "next approver"}`;
                })()
              : "Document approved successfully"
            : action === "REJECT"
              ? "Document rejected successfully"
              : action === "RETURN"
                ? "Document returned successfully"
                : "Action completed successfully";
        toast.success(msg);
      } catch {}
      closeApprovalModal();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Action failed");
    } finally {
      setModalProcessing(false);
    }
  };

  function fmtCurrency(n) {
    const num = Number(n || 0);
    return `GH₵${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  const allPossibleMetrics = React.useMemo(() => {
    const defaultIcons = {
      sales: "💰", purchase: "🛒", inventory: "📦", finance: "🏦", hr: "👔",
      maintenance: "🛠️", production: "🏭", projects: "📌", pos: "💳",
      bi: "📈", executive: "👔", service: "📨", transport: "🚚", admin: "👤", system: "⚙️"
    };
    const defaultPaths = {
      sales: "/sales", purchase: "/purchase", inventory: "/inventory", finance: "/finance", hr: "/human-resources",
      maintenance: "/maintenance", facilities: "/facilities", "environmental-health-safety": "/environmental-health-safety", production: "/production", projects: "/project-management", pos: "/pos",
      bi: "/reports", executive: "/reports", service: "/service-management", transport: "/transport", admin: "/administration", system: "/system-configuration"
    };
    const modAlias = {
      hr: "human-resources",
      projects: "project-management",
      service: "service-management",
      bi: "business-intelligence",
      executive: "executive-overview",
      admin: "administration"
    };

    const metrics = [];
    Object.entries(DASHBOARD_CARDS).forEach(([rawModKey, cards]) => {
      const canonicalMod = modAlias[rawModKey] || rawModKey;
      const modAllowed = isModuleEnabled(canonicalMod) || isModuleEnabled(rawModKey);
      
      cards.forEach(card => {
        // Check if card is forbidden in its parent module
        if (canViewDashboardElement(rawModKey, "card", card.key) === false) {
          return;
        }
        // Check if card is permitted on Home
        const cardAllowedForHome = canViewDashboardElement("home", "card", card.key);
        if (cardAllowedForHome === false) {
          return;
        }
        if (!modAllowed && !cardAllowedForHome) {
          return;
        }

        let val = 0;
        
        // Comprehensive mapping for values:
        if (card.key === "pos-today-sales") val = overview?.todaySales || 0;
        else if (card.key === "pos-total-transactions") val = overview?.totalTransactions || 0;
        else if (card.key === "pos-avg-order") val = overview?.averageOrder || 0;
        else if (card.key === "pos-monthly-revenue") val = overview?.monthlyRevenue || 0;
        else if (card.key === "sales-active-customers") val = overview?.totalCustomers || 0;
        else if (card.key === "bi-company-revenue") val = overview?.monthlyRevenue || 0;
        else if (card.key === "bi-profit-margin") val = overview?.profitMargin || "24%";
        else if (card.key === "bi-top-product") val = overview?.topProduct || "Best Seller";
        else if (card.key === "sales-pending-orders") val = overview?.openQuotations || 0;
        else if (card.key === "sales-total-revenue") val = overview?.monthlyRevenue || 0;
        else if (card.key === "sales-avg-sales-this-month" || card.key === "avg-sales-this-month" || card.key === "average-sales-this-month") val = overview?.avgSalesThisMonth || 0;
        else if (card.key === "purchase-total-value") val = overview?.totalPurchases || 0;
        else if (card.key === "purchase-pending-pos") val = overview?.activePOs || 0;
        else if (card.key === "purchase-active-suppliers") val = overview?.activeSuppliers || 0;
        else if (card.key === "inventory-total-items") val = overview?.itemsTracked || overview?.totalItems || 0;
        else if (card.key === "inventory-lowStock" || card.key === "inventory-low-stock") val = overview?.lowStockItems || 0;
        else if (card.key === "inventory-warehouses") val = overview?.totalWarehouses || 1;
        else if (card.key === "finance-cash-balance") val = overview?.cashBalance || 0;
        else if (card.key === "finance-ar") val = overview?.arOutstanding || 0;
        else if (card.key === "finance-ap") val = overview?.apOutstanding || 0;
        else if (card.key === "hr-total-employees") val = overview?.activeEmployees || 0;
        else if (card.key === "hr-on-leave") val = overview?.onLeave || 0;
        else if (card.key === "hr-new-hires") val = overview?.newHires || 0;
        else if (card.key === "maint-open-work-orders") val = overview?.openRequests || overview?.openWorkOrders || 0;
        else if (card.key === "maint-assets-in-maint") val = overview?.activeJobs || 0;
        else if (card.key === "maint-total-assets") val = overview?.totalAssets || 0;
        else if (card.key === "prod-active-orders") val = overview?.activeProductionOrders || 0;
        else if (card.key === "prod-completed-orders") val = overview?.completedOrders || 0;
        else if (card.key === "prod-yield") val = overview?.productionYield || "98%";
        else if (card.key === "pm-active-projects") val = overview?.activeProjects || 0;
        else if (card.key === "pm-overdue-tasks") val = overview?.overdueTasks || 0;
        else if (card.key === "pm-total-milestones") val = overview?.totalMilestones || 0;
        else if (card.key === "exec-gross-profit") val = overview?.grossProfit || overview?.monthlyRevenue || 0;
        else if (card.key === "exec-net-income") val = overview?.netIncome || 0;
        else if (card.key === "exec-total-expenses") val = overview?.totalExpenses || 0;
        else if (card.key === "sm-active-contracts") val = overview?.serviceRequests || 0;
        else if (card.key === "sm-pending-invoices") val = overview?.pendingServiceInvoices || 0;
        else if (card.key === "sm-total-revenue") val = overview?.totalServiceRevenue || 0;
        else if (card.key === "trans-ongoing-trips") val = overview?.activeTrips || 0;
        else if (card.key === "trans-active-vehicles") val = overview?.totalVehicles || 0;
        else if (card.key === "trans-pending-maint") val = overview?.pendingMaintenance || 0;
        else if (card.key === "admin-active-users") val = overview?.activeUsers || 0;
        else if (card.key === "admin-role-count") val = overview?.roleCount || 0;
        else if (card.key === "admin-recent-logins") val = overview?.recentLogins || 0;
        else if (card.key === "sys-cpu-usage") val = overview?.cpuUsage || "12%";
        else if (card.key === "sys-memory-usage") val = overview?.memoryUsage || "45%";
        else if (card.key === "sys-active-sessions") val = overview?.activeSessions || 1;
        
        // Currency formatting for known monetary values
        const isMonetary = [
          "sales-total-revenue",
          "sales-avg-sales-this-month",
          "avg-sales-this-month",
          "average-sales-this-month",
          "pos-today-sales",
          "pos-avg-order",
          "pos-monthly-revenue",
          "bi-company-revenue",
          "purchase-total-value",
          "finance-cash-balance",
          "finance-ar",
          "finance-ap",
          "exec-gross-profit",
          "exec-net-income",
          "exec-total-expenses",
          "sm-total-revenue"
        ].includes(card.key);
        const finalValue = isMonetary ? fmtCurrency(val) : String(val);

        metrics.push({
          key: card.key,
          moduleKey: rawModKey,
          label: card.label,
          value: finalValue,
          badge: overview?.badges?.[card.key]?.text || (card.key.includes("avg-sales") ? overview?.badges?.["sales-avg-sales-this-month"]?.text : "") || "",
          icon: defaultIcons[rawModKey] || "📊",
          path: defaultPaths[rawModKey] || "/"
        });
      });
    });
    
    return metrics;
  }, [overview, fmtCurrency, isModuleEnabled, canViewDashboardElement]);

  const visibleMetrics = React.useMemo(() => {
    const checked = allPossibleMetrics.filter((m) => {
      if (!m.key) return false;
      if (m.moduleKey && canViewDashboardElement(m.moduleKey, "card", m.key) === false) {
        return false;
      }
      return canViewDashboardElement("home", "card", m.key) === true;
    });

    return checked.slice(0, 4);
  }, [allPossibleMetrics, canViewDashboardElement]);

  const assignedModulesWithPages = useMemo(() => {
    if (!isBasicMode) return [];

    const candidateModules = [
      { key: "sales", label: "Sales", path: "/sales", icon: "💳", color: "from-blue-600 to-indigo-600", lightBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60", badge: "Commercial" },
      { key: "inventory", label: "Inventory", path: "/inventory", icon: "🏬", color: "from-emerald-600 to-teal-600", lightBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60", badge: "Logistics" },
      { key: "purchase", label: "Procurement", path: "/purchase", icon: "🛒", color: "from-amber-600 to-orange-600", lightBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60", badge: "Procurement" },
      { key: "pos", label: "Point of Sale", path: "/pos", icon: "🏷️", color: "from-purple-600 to-fuchsia-600", lightBg: "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60", badge: "Retail" },
      { key: "finance", label: "Finance & Accounts", path: "/finance", icon: "🏦", color: "from-emerald-700 to-green-700", lightBg: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border-green-200/60 dark:border-green-800/60", badge: "Accounting" },
      { key: "human-resources", label: "Human Resources", path: "/human-resources", icon: "👔", color: "from-sky-600 to-blue-600", lightBg: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60", badge: "People" },
      { key: "maintenance", label: "Maintenance", path: "/maintenance", icon: "🛠️", color: "from-orange-600 to-amber-600", lightBg: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200/60 dark:border-orange-800/60", badge: "Assets" },
      { key: "facilities", label: "Facilities Management", path: "/facilities", icon: "🏢", color: "from-emerald-600 to-teal-700", lightBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60", badge: "Facilities" },
      { key: "asset-management", label: "Asset Management", path: "/asset-management", icon: "📦", color: "from-blue-600 to-cyan-600", lightBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60", badge: "Assets" },
      { key: "production", label: "Production", path: "/production", icon: "🏭", color: "from-violet-600 to-purple-600", lightBg: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200/60 dark:border-violet-800/60", badge: "Factory" },
      { key: "project-management", label: "Project Management", path: "/project-management", icon: "📌", color: "from-rose-600 to-red-600", lightBg: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60", badge: "Projects" },
      { key: "environmental-health-safety", label: "Health & Safety (EHS)", path: "/environmental-health-safety", icon: "🛡️", color: "from-emerald-700 to-teal-800", lightBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60", badge: "Safety" },
      { key: "service-management", label: "Service Management", path: "/service-management", icon: "🎧", color: "from-cyan-600 to-teal-600", lightBg: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-800/60", badge: "Support" },
      { key: "transport", label: "Transport & Fleet", path: "/transport", icon: "🚚", color: "from-teal-600 to-emerald-600", lightBg: "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/60", badge: "Fleet" },
      { key: "business-intelligence", label: "Business Intelligence", path: "/business-intelligence", icon: "📈", color: "from-indigo-600 to-violet-600", lightBg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60", badge: "Analytics" },
      { key: "executive-overview", label: "Executive Overview", path: "/executive-overview", icon: "📊", color: "from-blue-700 to-cyan-700", lightBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60", badge: "Executive" },
      { key: "administration", label: "Administration", path: "/administration", icon: "⚙️", color: "from-slate-700 to-slate-900", lightBg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60", badge: "Security" },
      { key: "system-configuration", label: "System Configuration", path: "/system-configuration", icon: "🔧", color: "from-zinc-700 to-slate-800", lightBg: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-700/60", badge: "Setup" },
    ];

    const allowed = candidateModules.filter((m) => {
      if (m.key === "system-configuration") {
        return Number(user?.id) === 1 || Number(user?.id) === 2;
      }
      if (typeof canViewModule === "function") {
        return canViewModule(m.key);
      }
      return isModuleEnabled(m.key);
    });

    return allowed
      .map((mod) => {
        const pages = getAssignedPagesForModule(mod.key, perm, 3);
        return {
          ...mod,
          pages,
        };
      })
      .filter((mod) => mod.pages.length > 0);
  }, [isBasicMode, canViewModule, isModuleEnabled, perm, user?.id]);

  // Quick Actions section removed per request

  const sentSummary = useMemo(() => {
    const total = sentDocuments.length;
    const pending = sentDocuments.filter((d) => d.status === "PENDING" || !d.status).length;
    const approved = sentDocuments.filter((d) => d.status === "APPROVED").length;
    return { total, pending, approved };
  }, [sentDocuments]);
  const loadChatUnread = useCallback(async () => {
    try {
      const res = await client.get("/chat/unread-count");
      setUnreadChatCount(Number(res?.data?.unread || 0));
    } catch {
      setUnreadChatCount(0);
    }
  }, []);

  const socket = useSocket();
  useEffect(() => {
    loadChatUnread();
  }, [loadChatUnread]);

  useEffect(() => {
    if (!socket) return;
    const onNewNotif = (notif) => {
      if (!notif) return;
      setNotifications((prev) => {
        if (prev.some((n) => Number(n.id) === Number(notif.id))) return prev;
        return [notif, ...prev];
      });
    };
    const onNewPost = () => {
      client
        .get("/workflows/notifications")
        .then((res) => {
          if (Array.isArray(res.data?.items)) setNotifications(res.data.items);
        })
        .catch(() => {});
    };
    const onRecvMsg = () => {
      loadChatUnread();
      client
        .get("/workflows/notifications")
        .then((res) => {
          if (Array.isArray(res.data?.items)) setNotifications(res.data.items);
        })
        .catch(() => {});
    };

    socket.on("notifications:new", onNewNotif);
    socket.on("new_post", onNewPost);
    socket.on("receive_message", onRecvMsg);
    socket.on("message_read", onRecvMsg);

    return () => {
      socket.off("notifications:new", onNewNotif);
      socket.off("new_post", onNewPost);
      socket.off("receive_message", onRecvMsg);
      socket.off("message_read", onRecvMsg);
    };
  }, [socket, loadChatUnread]);

  useEffect(() => {
    const onRefresh = () => {
      loadChatUnread();
      client
        .get("/workflows/notifications")
        .then((res) => {
          if (Array.isArray(res.data?.items)) setNotifications(res.data.items);
        })
        .catch(() => {});
    };
    window.addEventListener("omni.chat.unread.refresh", onRefresh);
    window.addEventListener("omni.chat.sent", onRefresh);
    return () => {
      window.removeEventListener("omni.chat.unread.refresh", onRefresh);
      window.removeEventListener("omni.chat.sent", onRefresh);
    };
  }, [loadChatUnread]);

  const postNotificationsUnread = useMemo(
    () =>
      notifications.filter(
        (n) =>
          Number(n.is_read) !== 1 &&
          String(n.link || "").startsWith("/social-feed"),
      ),
    [notifications],
  );

  const unreadMessageNotifications = useMemo(
    () =>
      notifications.filter(
        (n) =>
          Number(n.is_read) !== 1 &&
          (String(n.link || "").startsWith("/social-feed") ||
            String(n.link || "").startsWith("/chat") ||
            String(n.link || "").includes("chat")),
      ),
    [notifications],
  );

  const totalNoticeAndMessageUnread = useMemo(() => {
    const notifCount = unreadMessageNotifications.length;
    return Math.max(notifCount, postNotificationsUnread.length + unreadChatCount);
  }, [unreadMessageNotifications, postNotificationsUnread.length, unreadChatCount]);

  const unreadNoticeList = useMemo(() => {
    const unreadNotifs = notifications.filter(
      (n) => Number(n.is_read) !== 1 && String(n.link || "").startsWith("/social-feed")
    );
    return unreadNotifs.map((n) => {
      const matchPostId = Number(String(n.link || "").replace("/social-feed/", "")) || null;
      const matched = matchPostId ? postAlerts.find((p) => Number(p.id) === matchPostId) : null;
      return {
        notifId: n.id,
        postId: matchPostId,
        userName: matched?.full_name || matched?.username || n.title?.replace("New post from ", "") || "User",
        avatar: matched?.profile_picture_url || "/default-avatar.png",
        snippet: matched?.content || n.message || "New message",
        created_at: n.created_at || matched?.created_at,
      };
    });
  }, [notifications, postAlerts]);
  const postNotificationsAll = useMemo(
    () =>
      notifications.filter((n) =>
        String(n.link || "").startsWith("/social-feed")
      ),
    [notifications],
  );
  const otherNotificationsUnread = useMemo(
    () =>
      notifications.filter(
        (n) =>
          Number(n.is_read) !== 1 &&
          !String(n.link || "").startsWith("/social-feed"),
      ),
    [notifications],
  );
  const loadPostAlerts = async () => {
    try {
      setPostAlertsLoading(true);
      const res = await client.get(`/social-feed?offset=0&limit=200`);
      const data = res?.data || {};
      const items = Array.isArray(data.data) ? data.data : [];
      setPostAlerts(items);
    } catch {
      setPostAlerts([]);
    } finally {
      setPostAlertsLoading(false);
    }
  };

  const fullName = user?.full_name || user?.name || user?.username || "User";

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data } = await client.put("/auth/me/photo", {
        profile_picture: base64,
      });
      setProfileData(data.user || null);
      toast.success("Photo updated");
    } catch (err) {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoRemove = async () => {
    setProfileData((prev) =>
      prev ? { ...prev, profile_picture_url: null } : prev,
    );
  };

  return (
    <div className="min-h-screen p-2 md:p-3 font-sans text-slate-900 bg-transparent">
      <div className="max-w-7xl mx-auto space-y-4 fullbleed-sm">
        {/* Header Section */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-brand-900 via-brand-850 to-brand-800 p-5 sm:p-6 md:p-8 shadow-smoky-lg text-white flex flex-col md:flex-row md:items-center justify-between gap-4 mx-0.5 sm:mx-0">
          <div className="relative z-10 flex items-center gap-4 min-w-0">
            <div className="relative shrink-0 hidden sm:block">
              <div
                className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center overflow-hidden ring-2 ring-white/30 cursor-pointer shadow-xs hover:ring-white/50 transition-all"
                onClick={() => setShowPhotoMenu((v) => !v)}
              >
                {profileData?.profile_picture_url ? (
                  <img
                    src={profileData.profile_picture_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-white/80">
                    {fullName.charAt(0).toUpperCase()}
                  </span>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                    <span className="text-white text-xs">...</span>
                  </div>
                )}
              </div>
              {showPhotoMenu && (
                <div className="absolute top-full mt-2 left-0 flex flex-col gap-1 min-w-[140px] z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-2 text-white">
                  <button
                    type="button"
                    className="text-left text-xs font-medium text-white/90 hover:bg-white/10 p-1.5 rounded-lg transition"
                    onClick={() => {
                      setShowPhotoMenu(false);
                      photoInputRef.current?.click();
                    }}
                  >
                    {profileData?.profile_picture_url ? "Replace Photo" : "Upload Photo"}
                  </button>
                  {profileData?.profile_picture_url && (
                    <button
                      type="button"
                      className="text-left text-xs font-medium text-red-300 hover:bg-red-900/40 p-1.5 rounded-lg transition"
                      onClick={() => {
                        setShowPhotoMenu(false);
                        handlePhotoRemove();
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={photoInputRef}
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight">
                  Welcome back, {fullName}
                </h1>
                {(profileData?.role_name || user?.role_name) && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-white border border-white/20 shadow-2xs">
                    <ShieldCheck size={14} className="text-sky-300" />
                    {profileData?.role_name || user?.role_name}
                  </span>
                )}
              </div>
              <div className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs text-brand-200">
                {(displayCompanyName || displayBranchName) && (
                  <div className="flex items-center gap-1.5">
                    <Building2 size={15} className="text-brand-300 shrink-0" />
                    <span className="text-white/90 font-medium">
                      {displayCompanyName || "OmniSuite ERP"}
                    </span>
                    {displayBranchName && (
                      <>
                        <span className="text-brand-300">•</span>
                        <span className="text-white font-bold">
                          {displayBranchName}
                        </span>
                      </>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar size={15} className="text-brand-300 shrink-0" />
                  <span className="text-white/80 font-medium">
                    {formattedTodayDate}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform translate-x-20 pointer-events-none" />
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="hidden sm:flex self-start md:self-center px-4 py-2 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-medium items-center gap-2 transition shadow-2xs shrink-0 relative z-10"
          >
            <GoldenBellIcon size={20} />
            <span>Notifications</span>
            {notifications.filter((n) => Number(n.is_read) !== 1).length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.2">
                {notifications.filter((n) => Number(n.is_read) !== 1).length}
              </span>
            )}
          </button>
        </div>

        {/* Tickers / Stats Grid - Mobile Moving Carousel & Medium 2-Grid Columns */}
        <MobileMovingCarousel data-home-carousel gridColsClass="md:grid-cols-2 lg:grid-cols-4"
          gapClass="gap-4 md:gap-6"
          autoInterval={3500}
        >
          {visibleMetrics.map((metric, index) => {
            const cardType = index % 4;
            if (cardType === 0) {
              // Card 1: Amber Gold
              return (
                <div
                  key={index}
                  className="w-full h-full relative overflow-hidden rounded-2xl sm:rounded-[24px] min-h-[185px] sm:min-h-[210px] lg:min-h-0 p-5 sm:p-7 shadow-smoky-lg border border-white/10 hover:border-white/20 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(178,110,23,0.55)] active:scale-[0.98] transition-all duration-300 ease-out group bg-[#b26e17] text-white"
                >
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex justify-end min-h-[22px]">
                      {metric.badge ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/15 backdrop-blur-md text-white/90 border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] leading-none flex items-center gap-1">
                          {metric.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 sm:mt-6">
                      <div
                        className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(255,255,255,0.35)] truncate"
                        style={{
                          textShadow: "0 0 12px rgba(255, 255, 255, 0.45)",
                        }}
                      >
                        {metric.value}
                      </div>
                      <div className="mt-2 text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none truncate">
                        {metric.label}
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                </div>
              );
            } else if (cardType === 1) {
              // Card 2: Steel Blue
              return (
                <div
                  key={index}
                  className="w-full h-full relative overflow-hidden rounded-2xl sm:rounded-[24px] min-h-[185px] sm:min-h-[210px] lg:min-h-0 p-5 sm:p-7 shadow-smoky-lg border border-white/10 hover:border-white/20 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(36,82,109,0.55)] active:scale-[0.98] transition-all duration-300 ease-out group bg-[#24526d] text-white"
                >
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex justify-end min-h-[22px]">
                      {metric.badge ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-amber-500/20 backdrop-blur-md text-amber-200 border border-amber-400/20 shadow-sm leading-none flex items-center gap-1">
                          {metric.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 sm:mt-6">
                      <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                        {metric.value}
                      </div>
                      <div className="mt-2 text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none flex items-center justify-between">
                        <span className="truncate">{metric.label}</span>
                        <svg
                          className="w-7 sm:w-8 h-4 text-white/20 ml-2 group-hover:text-white/40 transition-colors shrink-0"
                          viewBox="0 0 50 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            d="M0 15 L10 12 L20 18 L30 8 L40 10 L50 2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                </div>
              );
            } else if (cardType === 2) {
              // Card 3: Teal Green
              return (
                <div
                  key={index}
                  className="w-full h-full relative overflow-hidden rounded-2xl sm:rounded-[24px] min-h-[185px] sm:min-h-[210px] lg:min-h-0 p-5 sm:p-7 shadow-smoky-lg border border-white/10 hover:border-white/20 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(24,117,92,0.55)] active:scale-[0.98] transition-all duration-300 ease-out group bg-[#18755c] text-white"
                >
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex justify-end min-h-[22px]">
                      {metric.badge ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/15 backdrop-blur-md text-white/90 border border-white/15 shadow-sm leading-none flex items-center gap-1">
                          {metric.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 sm:mt-6">
                      <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-1.5 truncate">
                        <span className="truncate">{metric.value}</span>
                        <svg
                          className="w-4 sm:w-5 h-4 sm:h-5 text-white/40 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                          />
                        </svg>
                      </div>
                      <div className="mt-2 text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none truncate">
                        {metric.label}
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                </div>
              );
            } else {
              // Card 4: Carbon Dark Gray
              return (
                <div
                  key={index}
                  className="w-full h-full relative overflow-hidden rounded-2xl sm:rounded-[24px] min-h-[185px] sm:min-h-[210px] lg:min-h-0 p-5 sm:p-7 shadow-smoky-lg border border-white/5 hover:border-white/15 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.55)] active:scale-[0.98] transition-all duration-300 ease-out group bg-[#1d1f22] bg-[radial-gradient(#ffffff06_1px,transparent_1px)] [background-size:8px_8px] text-white"
                >
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex justify-end min-h-[22px]">
                      {metric.badge ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-white/15 backdrop-blur-md text-white border border-white/20 shadow-sm leading-none flex items-center gap-1">
                          {metric.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 sm:mt-6">
                      <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                        {metric.value}
                      </div>
                      <div className="mt-2 text-[10px] font-bold text-white/80 uppercase tracking-widest leading-none truncate">
                        {metric.label}
                      </div>
                    </div>
                  </div>
                  <svg
                    className="w-4.5 h-4.5 text-white/20 absolute right-5 bottom-5 group-hover:scale-110 group-hover:text-white/40 transition-all duration-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />
                </div>
              );
            }
          })}
        </MobileMovingCarousel>

        {!isBasicMode ? (
          <>
            {/* Main Content Grid: Action Center (Left) & Company Notice Board (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Action Center */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-smoky p-6 border border-slate-200/90 dark:border-slate-800 flex flex-col">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                      <ClipboardCheck size={16} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                        Action Center
                      </h2>
                    </div>
                  </div>

                  {/* Tabs: Pending vs Approved vs Sent */}
                  <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-full border border-slate-200/60 dark:border-slate-700/60 shadow-smoky-card self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setActionTab("pending");
                        setSelectedCategory("ALL");
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        actionTab === "pending"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span>Pending</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          actionTab === "pending"
                            ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {filteredPending.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionTab("approved");
                        setSelectedCategory("ALL");
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        actionTab === "approved"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span>Approved</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          actionTab === "approved"
                            ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {approvedList.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionTab("sent");
                        setSelectedCategory("ALL");
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        actionTab === "sent"
                          ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span>Sent</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          actionTab === "sent"
                            ? "bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {sentDocuments.length}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Filter Badges for Pending tab */}
                {actionTab === "pending" && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-4 p-1 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50 shadow-smoky-card">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("ALL")}
                      className={`px-2.5 py-1 rounded-full text-xs transition-all shadow-smoky-card ${
                        selectedCategory === "ALL"
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
                          : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                      }`}
                    >
                      All ({filteredPending.length})
                    </button>
                    {orderedGroups.map((key) => {
                      const count = groupedPending[key]?.length || 0;
                      const label = displayType(key);
                      const isSel = selectedCategory === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedCategory(key)}
                          className={`px-2.5 py-1 rounded-full text-xs transition-all shadow-smoky-card ${
                            isSel
                              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold"
                              : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium"
                          }`}
                        >
                          {label} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Items List */}
                <div className="flex-1 min-h-0 space-y-2">
                  {actionTab === "pending" ? (
                    itemsToDisplay.length > 0 ? (
                      <div className="space-y-2">
                        {itemsToDisplay.map((item) => (
                          <div
                            key={item.workflow_instance_id || item.id}
                            onClick={() => handleOpenDocHistory(item, "pending")}
                            className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-smoky-card hover:shadow-smoky transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]"
                            title="Click to view document history and user actions"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0 shadow-2xs">
                                {item.initiator ? item.initiator.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                  {docLabel(item)}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  By {item.initiator || "System"} •{" "}
                                  {item.submitted_at
                                    ? new Date(item.submitted_at).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "numeric",
                                        minute: "2-digit",
                                      })
                                    : "Recently"}{" "}
                                  • {item.workflow_name || item.step_name || "Approval Required"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => openApprovalModal(item.workflow_instance_id)}
                                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0E3646] hover:bg-[#173d50] rounded-xl transition shadow-smoky-card active:scale-95"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    item.workflow_instance_id
                                      ? `/administration/workflows/approvals/${item.workflow_instance_id}`
                                      : `/administration/workflows/approvals`
                                  )
                                }
                                className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition shadow-smoky-card"
                              >
                                Review
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-500 text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        No pending approvals found. You're all caught up! 🎉
                      </div>
                    )
                  ) : actionTab === "approved" ? (
                    itemsToDisplay.length > 0 ? (
                      <div className="space-y-2">
                        {itemsToDisplay.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            onClick={() => handleOpenDocHistory(item, "approved")}
                            className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-smoky-card hover:shadow-smoky transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]"
                            title="Click to view document history and user actions"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs">
                                <CheckCircle size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 transition-colors">
                                  {item.title}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  Approved •{" "}
                                  {item.date
                                    ? new Date(item.date).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "Recently"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                                Approved
                              </span>
                              <button
                                type="button"
                                onClick={() => handleViewDocDetails(item)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition shadow-2xs"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-500 text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        No approved documents found.
                      </div>
                    )
                  ) : (
                    /* Sent Tab */
                    itemsToDisplay.length > 0 ? (
                      <div className="space-y-2">
                        {itemsToDisplay.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            onClick={() => handleOpenDocHistory(item, "sent")}
                            className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-smoky-card hover:shadow-smoky transition-all flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99]"
                            title="Click to view document history and user actions"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0 shadow-2xs">
                                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 transition-colors">
                                  {item.doc_title || item.title || `${item.document_type || "Document"} #${item.document_id || item.id}`}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  Sent • {item.submitted_at || item.created_at ? new Date(item.submitted_at || item.created_at).toLocaleDateString() : "Recent"}
                                  {" • "}
                                  <span className={item.status === "APPROVED" ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                                    {item.status || "PENDING"}
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleViewDocDetails(item)}
                                className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-xl transition shadow-smoky-card shrink-0"
                              >
                                View
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-500 text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                        No sent documents found.
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Right Column: Company Notice Board & Favourite Pages */}
              <div className="flex flex-col gap-6">
                {/* Company Notice Board */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-smoky p-6 border border-slate-200/90 dark:border-slate-800 flex flex-col relative">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-4">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={async () => {
                        const next = !showPostAlerts;
                        setShowPostAlerts(next);
                        if (next) await loadPostAlerts();
                      }}
                      className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/50 relative transition active:scale-95 cursor-pointer"
                      title={totalNoticeAndMessageUnread > 0 ? `${totalNoticeAndMessageUnread} new messages / alerts` : "Post Alerts"}
                      aria-label="Toggle Post Alerts"
                    >
                      <GoldenBellIcon size={21} />
                      {totalNoticeAndMessageUnread > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-red-600 text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm pointer-events-none">
                          {totalNoticeAndMessageUnread > 99 ? "99+" : totalNoticeAndMessageUnread}
                        </span>
                      )}
                    </button>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                        Company Notice Board
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Corporate bulletins & communications
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryModalFocusId(null);
                        setShowHistoryModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-brand hover:bg-brand-700 transition shadow-smoky-card cursor-pointer"
                    >
                      History
                    </button>
                  </div>
                </div>

                {/* Post Alerts & Messages Dropdown if toggled */}
                {showPostAlerts && (
                  <div className="absolute top-16 left-6 z-30 w-84 max-w-[calc(100%-3rem)] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="pb-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          Messages & Bulletin Alerts
                        </span>
                        {totalNoticeAndMessageUnread > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                            {totalNoticeAndMessageUnread} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {totalNoticeAndMessageUnread > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const unreadList = notifications.filter(
                                  (n) =>
                                    Number(n.is_read) !== 1 &&
                                    (String(n.link || "").startsWith("/social-feed") ||
                                      String(n.link || "").startsWith("/chat")),
                                );
                                for (const n of unreadList) {
                                  try {
                                    await client.put(`/workflows/notifications/${n.id}/read`);
                                  } catch {}
                                }
                                setNotifications((prev) =>
                                  prev.map((n) =>
                                    String(n.link || "").startsWith("/social-feed") ||
                                    String(n.link || "").startsWith("/chat")
                                      ? { ...n, is_read: 1 }
                                      : n,
                                  ),
                                );
                                setUnreadChatCount(0);
                              } catch {}
                            }}
                            className="text-[11px] text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowPostAlerts(false)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                          title="Close"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto mt-2 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/40">
                      {/* Unread Chat Messages Shortcut if any */}
                      {unreadChatCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowPostAlerts(false);
                            window.dispatchEvent(new CustomEvent("omni.chat.open"));
                          }}
                          className="w-full text-left p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-100 transition cursor-pointer flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                              💬
                            </div>
                            <div>
                              <div className="text-xs font-bold">Unread Chat Messages</div>
                              <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                                You have {unreadChatCount} unread message{unreadChatCount > 1 ? "s" : ""}
                              </div>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                            Open
                          </span>
                        </button>
                      )}

                      {postAlertsLoading ? (
                        <div className="p-4 text-center text-xs text-slate-500">Loading alerts…</div>
                      ) : unreadNoticeList.length === 0 && unreadChatCount === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic">
                          All caught up! No new or unread messages.
                        </div>
                      ) : (
                        unreadNoticeList.map((item) => (
                          <button
                            key={item.notifId}
                            type="button"
                            onClick={async () => {
                              setShowPostAlerts(false);
                              try {
                                await client.put(`/workflows/notifications/${item.notifId}/read`);
                                setNotifications((prev) =>
                                  prev.map((n) =>
                                    n.id === item.notifId ? { ...n, is_read: 1 } : n,
                                  ),
                                );
                              } catch {}
                              setHistoryModalFocusId(item.postId);
                              setShowHistoryModal(true);
                            }}
                            className="w-full text-left p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/40 transition cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={item.avatar || "/default-avatar.png"}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-semibold truncate text-slate-900 dark:text-slate-100">
                                    {item.userName}
                                  </div>
                                  <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {String(item.snippet || "").replace(/\s+/g, " ").trim().slice(0, 60)}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Company Feed Content */}
                <div ref={postRef} className="flex-1 min-h-0 overflow-y-auto">
                  <CompanyFeed compact />
                </div>
              </div>

              {/* Favourite Pages Section */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-smoky p-6 border border-slate-200/90 dark:border-slate-800 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-4">
                  <div className="flex items-center gap-2.5">
                    <Star size={18} className="text-[#FBBE23] fill-[#FBBE23] shrink-0" />
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                        Favourite Pages
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Quick access to your pinned workspaces
                      </p>
                    </div>
                  </div>
                </div>

                {/* Squared Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {displayPages.map((page, idx) => (
                    <button
                      key={page.path || idx}
                      type="button"
                      onClick={() => navigate(page.path)}
                      className="relative aspect-square p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/70 hover:border-amber-400/60 dark:hover:border-amber-400/50 shadow-smoky-card transition-all duration-200 flex flex-col justify-between text-left group active:scale-95"
                      title={`Open ${page.title}`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:scale-105 group-hover:text-amber-600 transition-all shadow-2xs">
                          {renderFavIcon(page.iconKey)}
                        </div>
                        <Star
                          size={16}
                          className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                            favorites.some((f) => f.path === page.path)
                              ? "text-[#FBBE23] fill-[#FBBE23]"
                              : "text-slate-300 dark:text-slate-600 fill-none"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 mt-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 block truncate">
                          {page.module || "General"}
                        </span>
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 leading-tight mt-0.5 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {page.title}
                        </h3>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
          /* Basic Mode: Assigned Modules & Primary Pages */
          <div className="space-y-6">
            {assignedModulesWithPages.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
                <div className="text-3xl mb-2">📂</div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">No assigned module pages found</h3>
                <p className="text-xs text-slate-500 mt-1">Please contact your administrator to assign module permissions to your user role.</p>
              </div>
            ) : (
              <MobileMovingCarousel
                gridColsClass="md:grid-cols-2 xl:grid-cols-3"
                gapClass="gap-6"
                autoInterval={4000}
              >
                {assignedModulesWithPages.map((mod) => (
                  <div
                    key={mod.key}
                    className="w-full h-full relative rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/90 shadow-smoky hover:shadow-smoky-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Ambient Glow on Hover */}
                    <div className={`absolute -right-12 -top-12 w-32 h-32 bg-gradient-to-br ${mod.color || "from-brand-500 to-brand-700"} opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 rounded-full blur-2xl transition-opacity duration-500 pointer-events-none`} />

                    {/* Module Header */}
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.color || "from-brand-600 to-brand-800"} text-white text-2xl flex items-center justify-center shadow-md shadow-brand-900/10 shrink-0 group-hover:scale-105 group-hover:rotate-1 transition-transform`}>
                          {mod.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                            {mod.label}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            {mod.badge && (
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${mod.lightBg}`}>
                                {mod.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(mod.path)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-brand-600 hover:text-white dark:bg-slate-800 dark:hover:bg-brand-600 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 shrink-0 shadow-smoky-card"
                        title={`Open ${mod.label} Module`}
                      >
                        <span>Explore</span>
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>

                    {/* Assigned Pages List (Up to 3) */}
                    <div className="p-4 pb-5 space-y-2.5 flex-1 relative z-10">
                      {mod.pages.map((page, pIdx) => (
                        <div
                          key={page.path || pIdx}
                          onClick={() => navigate(page.path)}
                          className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-brand-300 dark:hover:border-brand-500/50 hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between group/page"
                        >
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700/80 border border-slate-200/70 dark:border-slate-600/60 flex items-center justify-center text-lg shadow-2xs shrink-0 group-hover/page:scale-110 group-hover/page:border-brand-400 transition-all">
                              {page.icon || "📄"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate group-hover/page:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                {page.title}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 group-hover/page:text-brand-600 dark:group-hover:text-brand-300 group-hover/page:bg-brand-50 dark:group-hover:bg-brand-950/60 px-2.5 py-1 rounded-md transition-all">
                              <span>Open</span>
                              <ChevronRight size={13} className="transform group-hover/page:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </MobileMovingCarousel>
            )}
          </div>
        )}
      </div>
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-8 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto sm:my-8 transition-all flex flex-col max-h-[calc(100vh-4rem)]">
            <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-900 dark:text-brand-400 flex items-center justify-center font-bold flex-shrink-0 border border-brand-200/50 dark:border-brand-800/50">
                  <CheckCircle size={20} className="text-brand-600 dark:text-brand-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Approval</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Review and take action on this workflow request</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeApprovalModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-slate-800 dark:text-slate-100">
              {modalLoading ? (
                <div className="text-xs text-slate-500 py-4 text-center">Loading approval details...</div>
              ) : modalData ? (
                <>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Document:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {modalData.doc_title || (
                          modalData.doc_ref
                            ? `${displayType(modalData.document_type)} — ${modalData.doc_ref}`
                            : `${displayType(modalData.document_type)} #${modalData.document_id}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Current Step:</span>
                      <span className="font-semibold text-brand-600 dark:text-brand-400">
                        {modalData.step_name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500 dark:text-slate-400">Amount:</span>
                      <span className="font-medium text-sm text-slate-900 dark:text-white">
                        {modalData.amount != null
                          ? Number(modalData.amount).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "0.00"}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const previousCommentLog = (modalData.logs || [])
                      .slice()
                      .reverse()
                      .find(log => log.comments && log.comments.trim() !== "" && log.comments !== "Workflow started");
                    return previousCommentLog ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Previous Comment (from {previousCommentLog.actor_name || "Unknown"})
                        </label>
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs leading-relaxed">
                          "{previousCommentLog.comments}"
                        </div>
                      </div>
                    ) : null;
                  })()}

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Comments / Remarks
                    </label>
                    <textarea
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500 h-24"
                      placeholder="Enter comments or reason for your decision..."
                      value={modalComment}
                      onChange={(e) => setModalComment(e.target.value)}
                    />
                  </div>
                  {!modalData.is_last_step &&
                    Array.isArray(modalData.next_step_approvers) && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          Forward To Approver
                        </label>
                        <select
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          value={modalNextUser || ""}
                          onChange={(e) =>
                            setModalNextUser(Number(e.target.value))
                          }
                        >
                          <option value="">Select user...</option>
                          {modalData.next_step_approvers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.username}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                </>
              ) : (
                <div className="text-xs text-rose-600 p-3 bg-rose-50 rounded-xl border border-rose-200">
                  Failed to load approval details.
                </div>
              )}
            </div>
            <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50 shrink-0">
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-smoky-card"
                onClick={closeApprovalModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-smoky-card transition-colors disabled:opacity-50"
                onClick={() => handleModalAction("APPROVE")}
                disabled={modalProcessing}
              >
                {modalData && modalData.is_last_step
                  ? "Final Approve"
                  : "Forward"}
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-smoky-card transition-colors disabled:opacity-50"
                onClick={() => handleModalAction("RETURN")}
                disabled={modalProcessing}
              >
                Return
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-smoky-card transition-colors disabled:opacity-50"
                onClick={() => handleModalAction("REJECT")}
                disabled={modalProcessing}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document History & Audit Modal */}
      {docHistoryModalOpen && selectedDocItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setDocHistoryModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] shadow-smoky-lg flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/70 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-600 shadow-2xs">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                    {docLabel(selectedDocItem) || selectedDocItem.title || "Document History"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Document History &amp; User Action Trail
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDocHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Document Overview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 shadow-smoky-card space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="text-xs font-semibold text-slate-500">
                    Document Type:{" "}
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                      {selectedDocItem.document_type || selectedDocItem.type || "Document"}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      (selectedDocItem.status === "APPROVED" || selectedDocItem._tabType === "approved")
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                    }`}
                  >
                    {selectedDocItem.status || (selectedDocItem._tabType === "approved" ? "APPROVED" : "PENDING")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Initiator / Created By</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" />
                      {selectedDocItem.initiator || user?.full_name || "System"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Submitted / Logged Date</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      {selectedDocItem.submitted_at || selectedDocItem.date || selectedDocItem.created_at
                        ? new Date(selectedDocItem.submitted_at || selectedDocItem.date || selectedDocItem.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Recent"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Trail & User History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock size={14} className="text-brand-600" /> Users Involved &amp; Actions Taken
                </h4>

                {docHistoryLoading ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading document action history...</span>
                  </div>
                ) : docWorkflowData?.logs && docWorkflowData.logs.length > 0 ? (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    {docWorkflowData.logs.map((log, idx) => (
                      <div key={idx} className="relative group">
                        {/* Dot on timeline */}
                        <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-600 border-2 border-white dark:border-slate-900 shadow-xs" />
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-smoky-card space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <User size={13} className="text-brand-600" />
                              {log.actor_name || "Reviewer"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                              Action: {log.action || "REVIEW"}
                            </span>
                          </div>
                          {log.comments && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800 italic">
                              &ldquo;{log.comments}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Synthesized Audit History when workflow logs are empty or direct transaction */
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-brand-600 border-2 border-white dark:border-slate-900 shadow-xs" />
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-smoky-card space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {selectedDocItem.initiator || user?.full_name || "Originator"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {selectedDocItem.submitted_at || selectedDocItem.date
                              ? new Date(selectedDocItem.submitted_at || selectedDocItem.date).toLocaleDateString()
                              : "Logged"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Created and submitted document for review and verification.
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <div
                        className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 shadow-xs ${
                          (selectedDocItem.status === "APPROVED" || selectedDocItem._tabType === "approved")
                            ? "bg-emerald-600"
                            : "bg-amber-500"
                        }`}
                      />
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-smoky-card space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {(selectedDocItem.status === "APPROVED" || selectedDocItem._tabType === "approved")
                              ? "Document Approval"
                              : "Pending Review"}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              (selectedDocItem.status === "APPROVED" || selectedDocItem._tabType === "approved")
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {(selectedDocItem.status === "APPROVED" || selectedDocItem._tabType === "approved")
                              ? "Completed"
                              : "Awaiting Action"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {(selectedDocItem.status === "APPROVED" || selectedDocItem._tabType === "approved")
                            ? "The document has completed all workflow requirements and has been formally approved."
                            : "Document is currently circulating among designated department approvers."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
              <button
                type="button"
                onClick={() => setDocHistoryModalOpen(false)}
                className="btn btn-secondary text-xs px-4 py-2 rounded-xl shadow-smoky-card font-semibold"
              >
                Close
              </button>

              {/* View Details Button */}
              <button
                type="button"
                onClick={() => handleViewDocDetails(selectedDocItem)}
                className="btn btn-primary text-xs px-4 py-2 rounded-xl font-semibold inline-flex items-center gap-1.5 shadow-smoky-card"
              >
                <Eye size={14} />
                <span>View Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post History Modal */}
      {showHistoryModal && (
        <SocialFeedPage
          isModal={true}
          focusPostId={historyModalFocusId}
          onClose={() => {
            setShowHistoryModal(false);
            setHistoryModalFocusId(null);
          }}
        />
      )}

      {/* chat v2 floating widget is mounted globally in AppShell */}
    </div>
  );
}
