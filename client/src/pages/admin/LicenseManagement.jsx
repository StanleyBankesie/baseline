import React, { useState, useEffect } from "react";
import { api } from "../../api/client.js";
import { toast } from "react-toastify";
import { usePermission } from "../../auth/PermissionContext.jsx";
import Swal from "sweetalert2";
import { MODULES_REGISTRY, getModuleSections } from "../../data/modulesRegistry.js";
import { DASHBOARD_CARDS } from "../../data/dashboardCards.js";
import { useAuth } from "../../auth/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";

export default function LicenseManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSystemConfig = location.pathname.startsWith("/system-configuration");
  const moduleHome = isSystemConfig ? "/system-configuration" : "/administration";
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [license, setLicense] = useState(null);
  const [superAdminId, setSuperAdminId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("DETAILS");
  const [invoiceTemplate, setInvoiceTemplate] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [receiptTemplate, setReceiptTemplate] = useState("");
  const [savingReceiptTemplate, setSavingReceiptTemplate] = useState(false);
  const [previewReceiptMode, setPreviewReceiptMode] = useState(false);

  const [packages, setPackages] = useState([]);
  const { refreshPermissions } = usePermission();

  useEffect(() => {
    if (selectedCompanyId && companies.length > 0) {
      const selected = companies.find(c => String(c.id) === String(selectedCompanyId));
      if (selected) {
        setCompanySearch(selected.name);
      }
    }
  }, [selectedCompanyId, companies]);

  const [formData, setFormData] = useState({
    licenseType: "STANDARD",
    maxUsers: 5,
    startDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    graceDays: 15,
    alertDays: 30,
    status: "ACTIVE",
    notes: "",
    allow_login_renewal: true
  });

  const [selectedModules, setSelectedModules] = useState([]);

  const getPreviewHtml = (html) => {
    if (!html) return "";
    return html
      .replace(/\{\{name\}\}/g, "John Doe")
      .replace(/\{\{email\}\}/g, "john@example.com")
      .replace(/\{\{plan_name\}\}/g, "Premium Plan")
      .replace(/\{\{amount\}\}/g, "GHS 1,500.00")
      .replace(/\{\{new_expiry_date\}\}/g, new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString())
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
      .replace(/\{\{invoice_number\}\}/g, "INV-123456")
      .replace(/\{\{receipt_number\}\}/g, "RCT-123456")
      .replace(/\{\{company_logo\}\}/g, '<img src="https://via.placeholder.com/150x60?text=Company+Logo" alt="Company Logo" style="max-height: 60px; max-width: 150px;" />')
      .replace(/\[Insert Logo Here\]/g, '<img src="https://via.placeholder.com/150x60?text=Company+Logo" alt="Company Logo" style="max-height: 60px; max-width: 150px;" />');
  };

  const moduleList = Object.keys(MODULES_REGISTRY || {}).map(key => ({
    code: key,
    name: MODULES_REGISTRY[key].name || key
  }));
  
  // Fallback if registry empty
  if (moduleList.length === 0) {
    const defaultModules = ["ADMIN", "FINANCE", "PURCHASE", "INVENTORY", "SALES", "HR", "PAYROLL", "CRM", "PROJECTS", "MAINTENANCE", "POS", "BI", "PRODUCTION"];
    defaultModules.forEach(m => moduleList.push({ code: m, name: m }));
  }

  useEffect(() => {
    fetchConfig();
    fetchCompanies();
    fetchPackages();
    fetchInvoiceTemplate();
    fetchReceiptTemplate();
  }, []);

  const fetchInvoiceTemplate = async () => {
    try {
      const res = await api.get("/licenses/invoice-template").catch(() => null);
      if (res?.data?.html_content) {
        setInvoiceTemplate(res.data.html_content);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveInvoiceTemplate = async () => {
    setSavingTemplate(true);
    try {
      await api.post("/licenses/invoice-template", { html_content: invoiceTemplate });
      toast.success("Invoice template saved successfully!");
    } catch (err) {
      toast.error("Failed to save template.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const fetchReceiptTemplate = async () => {
    try {
      const res = await api.get("/licenses/receipt-template").catch(() => null);
      if (res?.data?.html_content) {
        setReceiptTemplate(res.data.html_content);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveReceiptTemplate = async () => {
    setSavingReceiptTemplate(true);
    try {
      await api.post("/licenses/receipt-template", { html_content: receiptTemplate });
      toast.success("Receipt template saved successfully!");
    } catch (err) {
      toast.error("Failed to save template.");
    } finally {
      setSavingReceiptTemplate(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await api.get("/subscription-plans").catch(() => null);
      if (res && res.data && Array.isArray(res.data)) {
        setPackages(res.data.filter(p => p.status === 'ACTIVE'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.get("/licenses/super-admin").catch(() => null);
      if (res?.data?.superAdminId) {
        setSuperAdminId(res.data.superAdminId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await api.get("/licenses/companies").catch(() => null);
      if (res && res.data && Array.isArray(res.data.data)) {
        setCompanies(res.data.data);
        if (res.data.data.length > 0) setSelectedCompanyId(res.data.data[0].id);
      } else {
        // Fallback: just manual input or currently logged-in company
        toast.warning("Could not auto-load companies. Please select manually if supported.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedCompanyId) {
      fetchLicense(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const fetchLicense = async (companyId) => {
    setLoading(true);
    try {
      const res = await api.get(`/licenses/company/${companyId}`).catch(err => {
        if (err.response && err.response.status === 404) return { data: null };
        throw err;
      });
      
      if (res && res.data && res.data.exists !== false) {
        setLicense(res.data);
        setFormData({
          licenseType: res.data.license_type,
          maxUsers: res.data.max_users,
          startDate: res.data.start_date.split("T")[0],
          expiryDate: res.data.expiry_date.split("T")[0],
          graceDays: res.data.grace_days,
          alertDays: res.data.alert_days || 30,
          status: res.data.status,
          notes: res.data.notes || "",
          allow_login_renewal: res.data.allow_login_renewal !== 0
        });
        setSelectedModules(res.data.modules || []);
      } else {
        setLicense(null);
        setSelectedModules([]);
      }
    } catch (err) {
      toast.error("Failed to load license details");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLicense = async () => {
    if (!selectedCompanyId) return toast.error("Please select a company");
    try {
      await api.post(`/licenses`, {
        companyId: selectedCompanyId,
        ...formData
      });
      
      await api.post(`/licenses/company/${selectedCompanyId}/modules`, {
        modules: selectedModules
      });

      await refreshPermissions();

      try {
        window.dispatchEvent(
          new CustomEvent("license:updated", {
            detail: { companyId: selectedCompanyId, modules: selectedModules },
          })
        );
      } catch {}

      toast.success("License saved successfully");
      fetchLicense(selectedCompanyId);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to save license");
    }
  };

  const showModulePagesSweetAlert = (moduleKey) => {
    const mod = MODULES_REGISTRY[moduleKey];
    const moduleName = mod?.name || moduleKey.toUpperCase();
    const sections = getModuleSections(moduleKey, mod);

    // Compute currently selected page keys
    const existingTokens = selectedModules.filter(m => m.startsWith(`page:${moduleKey}:`));
    let preselectedKeys = new Set();
    
    if (existingTokens.length > 0) {
      existingTokens.forEach(t => preselectedKeys.add(t.slice(`page:${moduleKey}:`.length).toLowerCase().trim()));
    } else {
      // By default, select all if no granular tokens exist
      sections.forEach(sec => {
        (sec.features || []).forEach(f => preselectedKeys.add(String(f.key).toLowerCase().trim()));
      });
    }

    // Build HTML for Swal
    let sectionsHtml = "";
    sections.forEach((sec, sIdx) => {
      const features = sec.features || [];
      if (features.length === 0) return;
      const checkedInSec = features.filter(f => preselectedKeys.has(String(f.key).toLowerCase().trim())).length;
      const allChecked = checkedInSec === features.length && features.length > 0;

      let itemsHtml = "";
      features.forEach(f => {
        const isChecked = preselectedKeys.has(String(f.key).toLowerCase().trim());
        itemsHtml += `
          <label class="swal-page-item flex items-center gap-2 p-2 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-xs transition" data-name="${(f.label || f.key).toLowerCase()}">
            <input type="checkbox" class="swal-page-checkbox rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" data-sec-idx="${sIdx}" data-key="${f.key}" ${isChecked ? 'checked' : ''} />
            <span class="font-medium text-slate-800 dark:text-slate-200">${f.label || f.key}</span>
            ${f.type === 'dashboard' ? '<span class="ml-auto text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-mono">dashboard</span>' : ''}
          </label>
        `;
      });

      sectionsHtml += `
        <div class="swal-section-card border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-800/50 mb-3" data-sec-idx="${sIdx}">
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
            <label class="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-900 dark:text-white">
              <input type="checkbox" class="swal-section-toggle rounded text-blue-600 focus:ring-blue-500 w-4 h-4" data-sec-idx="${sIdx}" ${allChecked ? 'checked' : ''} />
              <span>${sec.icon || '📄'} ${sec.title}</span>
            </label>
            <span class="swal-section-badge text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-mono font-medium" data-sec-idx="${sIdx}">
              (${checkedInSec}/${features.length})
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${itemsHtml}
          </div>
        </div>
      `;
    });

    const htmlContent = `
      <div class="text-left">
        <div class="mb-3">
          <input
            type="text"
            id="swal-search-pages"
            placeholder="🔍 Search pages and sections in ${moduleName}..."
            class="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>
        <div class="flex items-center justify-between mb-3 text-xs">
          <div class="flex items-center gap-2">
            <button type="button" id="swal-select-all-btn" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded font-medium transition">
              Select All
            </button>
            <button type="button" id="swal-deselect-all-btn" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-medium transition">
              Deselect All
            </button>
          </div>
          <div id="swal-total-summary" class="font-semibold text-slate-600 dark:text-slate-300"></div>
        </div>
        <div id="swal-sections-container" class="max-h-[55vh] overflow-y-auto pr-1">
          ${sectionsHtml}
        </div>
      </div>
    `;

    Swal.fire({
      title: `<div class="text-lg font-bold flex items-center justify-center gap-2"><span>${mod?.icon || '⚙️'}</span><span>Configure Licensed Pages: ${moduleName}</span></div>`,
      html: htmlContent,
      width: "720px",
      showCancelButton: true,
      confirmButtonText: "Apply Selection",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      focusConfirm: false,
      didOpen: (popup) => {
        const searchInput = popup.querySelector("#swal-search-pages");
        const btnSelectAll = popup.querySelector("#swal-select-all-btn");
        const btnDeselectAll = popup.querySelector("#swal-deselect-all-btn");
        const totalSummary = popup.querySelector("#swal-total-summary");
        const sectionCards = popup.querySelectorAll(".swal-section-card");
        const pageCheckboxes = popup.querySelectorAll(".swal-page-checkbox");
        const sectionToggles = popup.querySelectorAll(".swal-section-toggle");

        const updateCounts = () => {
          let totalAll = pageCheckboxes.length;
          let checkedAll = popup.querySelectorAll(".swal-page-checkbox:checked").length;
          if (totalSummary) {
            totalSummary.textContent = `Selected: ${checkedAll}/${totalAll} pages`;
          }

          sectionCards.forEach(card => {
            const sIdx = card.getAttribute("data-sec-idx");
            const secBoxes = card.querySelectorAll(".swal-page-checkbox");
            const secChecked = card.querySelectorAll(".swal-page-checkbox:checked");
            const badge = card.querySelector(`.swal-section-badge[data-sec-idx="${sIdx}"]`);
            const toggle = card.querySelector(`.swal-section-toggle[data-sec-idx="${sIdx}"]`);
            if (badge) {
              badge.textContent = `(${secChecked.length}/${secBoxes.length})`;
            }
            if (toggle) {
              toggle.checked = secBoxes.length > 0 && secChecked.length === secBoxes.length;
              toggle.indeterminate = secChecked.length > 0 && secChecked.length < secBoxes.length;
            }
          });
        };

        updateCounts();

        // Search handler
        if (searchInput) {
          searchInput.addEventListener("input", (e) => {
            const query = (e.target.value || "").toLowerCase().trim();
            sectionCards.forEach(card => {
              let hasVisible = false;
              const items = card.querySelectorAll(".swal-page-item");
              items.forEach(item => {
                const name = item.getAttribute("data-name") || "";
                if (!query || name.includes(query)) {
                  item.style.display = "";
                  hasVisible = true;
                } else {
                  item.style.display = "none";
                }
              });
              card.style.display = hasVisible ? "" : "none";
            });
          });
        }

        // Section toggle handlers
        sectionToggles.forEach(toggle => {
          toggle.addEventListener("change", (e) => {
            const sIdx = toggle.getAttribute("data-sec-idx");
            const card = popup.querySelector(`.swal-section-card[data-sec-idx="${sIdx}"]`);
            if (card) {
              const boxes = card.querySelectorAll(".swal-page-checkbox");
              boxes.forEach(b => {
                if (b.closest(".swal-page-item")?.style.display !== "none") {
                  b.checked = e.target.checked;
                }
              });
            }
            updateCounts();
          });
        });

        // Individual page checkbox handlers
        pageCheckboxes.forEach(box => {
          box.addEventListener("change", () => {
            updateCounts();
          });
        });

        // Select all / Deselect all
        if (btnSelectAll) {
          btnSelectAll.addEventListener("click", () => {
            pageCheckboxes.forEach(b => {
              if (b.closest(".swal-page-item")?.style.display !== "none") {
                b.checked = true;
              }
            });
            updateCounts();
          });
        }

        if (btnDeselectAll) {
          btnDeselectAll.addEventListener("click", () => {
            pageCheckboxes.forEach(b => {
              if (b.closest(".swal-page-item")?.style.display !== "none") {
                b.checked = false;
              }
            });
            updateCounts();
          });
        }
      },
      preConfirm: () => {
        const popup = Swal.getPopup();
        const checkedBoxes = Array.from(popup.querySelectorAll(".swal-page-checkbox:checked"));
        return checkedBoxes.map(b => b.getAttribute("data-key"));
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const selectedKeys = result.value || [];
        setSelectedModules(prev => {
          // Remove all existing page tokens for this module
          const next = prev.filter(m => !m.startsWith(`page:${moduleKey}:`));
          if (selectedKeys.length > 0) {
            // Ensure module code is present
            if (!next.includes(moduleKey)) {
              next.push(moduleKey);
            }
            // Add new page tokens
            selectedKeys.forEach(k => {
              next.push(`page:${moduleKey}:${k}`);
            });
          } else {
            // If all pages unselected, also remove module
            const idx = next.indexOf(moduleKey);
            if (idx !== -1) next.splice(idx, 1);
          }
          return next;
        });
      }
    });
  };

  const handleModuleCheckboxChange = (code, checked) => {
    if (checked) {
      showModulePagesSweetAlert(code);
    } else {
      setSelectedModules(prev => prev.filter(m => m !== code && !m.startsWith(`page:${code}:`)));
    }
  };

  const toggleModule = (code) => {
    if (selectedModules.includes(code)) {
      setSelectedModules(selectedModules.filter(m => m !== code && !m.startsWith(`page:${code}:`)));
    } else {
      showModulePagesSweetAlert(code);
    }
  };

  // If user is not the designated super admin, deny access
  // This must be placed after ALL hooks to avoid React errors!
  if (Number(user?.id) !== Number(superAdminId)) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
        <p className="text-slate-600 dark:text-slate-400">You do not have permission to view the License Management console.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">License Management</h1>
        <button 
          onClick={() => navigate(moduleHome)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 rounded shadow-sm transition">Back to Menu
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">Select Company</h2>
            {companies.length > 0 ? (
              <div className="relative">
                <input
                  type="text"
                  className="w-full border rounded p-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder="Type to search company..."
                  value={companySearch}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 250)}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setShowDropdown(true);
                  }}
                />
                {showDropdown && (
                  <div className="absolute z-10 w-full bg-white dark:bg-slate-800 border rounded shadow mt-1 max-h-60 overflow-y-auto">
                    {companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase())).length > 0 ? (
                      companies
                        .filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                        .map(c => (
                          <div
                            key={c.id}
                            className="p-2 hover:bg-slate-100 cursor-pointer text-sm"
                            onClick={() => {
                              setSelectedCompanyId(c.id);
                              setCompanySearch(c.name);
                              setShowDropdown(false);
                            }}
                          >
                            {c.name}
                          </div>
                        ))
                    ) : (
                      <div className="p-2 text-slate-500 dark:text-slate-500 text-xs">No companies found</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <input 
                type="text" 
                placeholder="Company ID"
                className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={selectedCompanyId}
                onChange={e => setSelectedCompanyId(e.target.value)}
              />
            )}
            
            {license && (
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Current License Info</h3>
                <p className="mt-2 text-sm"><strong>Key:</strong> {license.license_key}</p>
                <p className="text-sm"><strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${license.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {license.status}
                  </span>
                </p>
                {/* Normally we'd call a dashboard stats endpoint to get active users count */}
                <p className="text-sm mt-2"><strong>Max Users:</strong> {license.max_users}</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 md:col-span-2">
          
          <div className="mb-4 flex border-b">
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'DETAILS' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300'}`}
              onClick={() => setActiveTab('DETAILS')}
            >
              License Details
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'INVOICE_TEMPLATE' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300'}`}
              onClick={() => setActiveTab('INVOICE_TEMPLATE')}
            >
              Invoice Template
            </button>
            <button
              className={`px-4 py-2 font-medium ${activeTab === 'RECEIPT_TEMPLATE' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300'}`}
              onClick={() => setActiveTab('RECEIPT_TEMPLATE')}
            >
              Receipt Template
            </button>
          </div>

          {activeTab === 'DETAILS' && (
            selectedCompanyId ? (
              <div className="bg-white dark:bg-slate-800 p-6 rounded shadow space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">License Type</label>
                  <select 
                    className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.licenseType}
                    onChange={e => setFormData({...formData, licenseType: e.target.value})}
                  >
                    <option value="TRIAL">Trial</option>
                    {packages.map(pkg => (
                      <option key={pkg.id} value={pkg.plan_name}>{pkg.plan_name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Max Users</label>
                  <input 
                    type="number" 
                    className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.maxUsers}
                    onChange={e => setFormData({...formData, maxUsers: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input 
                    type="date" 
                    className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Expiry Date</label>
                  <input 
                    type="date" 
                    className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.expiryDate}
                    onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Grace Days</label>
                  <input 
                    type="number" 
                    className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.graceDays}
                    onChange={e => setFormData({...formData, graceDays: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Alert Days</label>
                  <input 
                    type="number" 
                    className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.alertDays}
                    onChange={e => setFormData({...formData, alertDays: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select 
                    className="w-full border rounded p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Allow License Renewal from Login Page?</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        name="allow_login_renewal"
                        checked={formData.allow_login_renewal === true}
                        onChange={() => setFormData({...formData, allow_login_renewal: true})}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span>Yes (On)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input 
                        type="radio" 
                        name="allow_login_renewal"
                        checked={formData.allow_login_renewal === false}
                        onChange={() => setFormData({...formData, allow_login_renewal: false})}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span>No (Off)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold border-b pb-2 mb-4">Licensed Modules</h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {moduleList.map(mod => {
                      const isChecked = selectedModules.includes(mod.code);
                      const sections = getModuleSections(mod.code);
                      const allPageKeys = new Set();
                      sections.forEach(sec => (sec.features || []).forEach(f => allPageKeys.add(f.key)));
                      const totalPages = allPageKeys.size;
                      const selectedTokens = selectedModules.filter(m => m.startsWith(`page:${mod.code}:`));
                      const selectedPagesCount = isChecked
                        ? (selectedTokens.length > 0 ? selectedTokens.length : totalPages)
                        : 0;

                      return (
                        <div
                          key={mod.code}
                          className="flex items-center justify-between p-2.5 border dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                        >
                          <label className="flex items-center space-x-2.5 cursor-pointer flex-1">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => handleModuleCheckboxChange(mod.code, e.target.checked)}
                              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <span className="text-sm font-semibold">{mod.name}</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => showModulePagesSweetAlert(mod.code)}
                            className={`text-xs px-2.5 py-1 rounded font-medium transition flex items-center gap-1 border ${
                              isChecked
                                ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700"
                                : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
                            }`}
                          >
                            <span>⚙️</span>
                            <span>Pages ({selectedPagesCount}/{totalPages})</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold border-b pb-2 mb-4">Home Dashboard Cards</h3>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {Object.entries(DASHBOARD_CARDS).map(([modKey, cards]) => (
                      <div key={modKey} className="border-b pb-2 last:border-0 dark:border-slate-700">
                        <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-2">{modKey}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cards.map(c => (
                            <label key={c.key} className="flex items-center space-x-2">
                              <input 
                                type="checkbox"
                                checked={selectedModules.includes(`card:${c.key}`)}
                                onChange={() => toggleModule(`card:${c.key}`)}
                                className="rounded text-blue-600"
                              />
                              <span className="text-xs">{c.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleSaveLicense}
                  className="bg-blue-600 text-white px-6 py-2 rounded shadow hover:bg-blue-700 transition"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save License"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 p-6 rounded shadow flex items-center justify-center h-64 text-slate-500 dark:text-slate-500">
              Select a company to manage its license.
            </div>
          ))}
          
          {activeTab === 'INVOICE_TEMPLATE' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded shadow space-y-6">
              <h2 className="text-xl font-bold border-b pb-2">License Renewal Invoice Template</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400 bg-blue-50 p-3 rounded">
                <strong>Placeholders available:</strong><br />
                {`{{company_logo}}`} - Company Logo image<br />
                {`{{name}}`} - User's name<br />
                {`{{email}}`} - User's email<br />
                {`{{plan_name}}`} - Name of the renewed plan<br />
                {`{{amount}}`} - Amount paid<br />
                {`{{new_expiry_date}}`} - New license expiry date<br />
                {`{{date}}`} - Invoice date<br />
                {`{{invoice_number}}`} - Invoice reference number
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">HTML Content</label>
                  <button
                    type="button"
                    onClick={() => setPreviewMode(!previewMode)}
                    className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded font-medium"
                  >
                    {previewMode ? "Edit HTML" : "Print Preview"}
                  </button>
                </div>
                {previewMode ? (
                  <div className="border rounded p-2 bg-slate-50 dark:bg-slate-800/50 flex flex-col">
                    <div className="flex justify-end mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          const printWindow = window.open('', '', 'width=900,height=800');
                          printWindow.document.write(getPreviewHtml(invoiceTemplate));
                          printWindow.document.close();
                          printWindow.focus();
                          setTimeout(() => {
                            printWindow.print();
                          }, 500);
                        }}
                        className="text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded border border-blue-200 flex items-center gap-1 font-medium shadow-sm"
                      >
                        <i className="fi fi-rr-print"></i> Print
                      </button>
                    </div>
                    <iframe
                      srcDoc={getPreviewHtml(invoiceTemplate)}
                      className="w-full min-h-[600px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                      title="Invoice Preview"
                    ></iframe>
                  </div>
                ) : (
                  <textarea
                    className="w-full border rounded p-3 min-h-[500px] font-mono text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={invoiceTemplate}
                    onChange={(e) => setInvoiceTemplate(e.target.value)}
                    placeholder="<h1>Invoice for {{name}}</h1>..."
                  ></textarea>
                )}
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={handleSaveInvoiceTemplate}
                  className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 transition"
                  disabled={savingTemplate}
                >
                  {savingTemplate ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'RECEIPT_TEMPLATE' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded shadow space-y-6">
              <h2 className="text-xl font-bold border-b pb-2">License Renewal Receipt Template</h2>
              <div className="text-sm text-slate-600 dark:text-slate-400 bg-blue-50 p-3 rounded">
                <strong>Placeholders available:</strong><br />
                {`{{company_logo}}`} - Company Logo image<br />
                {`{{name}}`} - User's name<br />
                {`{{email}}`} - User's email<br />
                {`{{plan_name}}`} - Name of the renewed plan<br />
                {`{{amount}}`} - Amount paid<br />
                {`{{new_expiry_date}}`} - New license expiry date<br />
                {`{{date}}`} - Receipt date<br />
                {`{{receipt_number}}`} - Receipt reference number
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">HTML Content</label>
                  <button
                    type="button"
                    onClick={() => setPreviewReceiptMode(!previewReceiptMode)}
                    className="text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded font-medium"
                  >
                    {previewReceiptMode ? "Edit HTML" : "Print Preview"}
                  </button>
                </div>
                {previewReceiptMode ? (
                  <div className="border rounded p-2 bg-slate-50 dark:bg-slate-800/50 flex flex-col">
                    <div className="flex justify-end mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          const printWindow = window.open('', '', 'width=900,height=800');
                          printWindow.document.write(getPreviewHtml(receiptTemplate));
                          printWindow.document.close();
                          printWindow.focus();
                          setTimeout(() => {
                            printWindow.print();
                          }, 500);
                        }}
                        className="text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded border border-blue-200 flex items-center gap-1 font-medium shadow-sm"
                      >
                        <i className="fi fi-rr-print"></i> Print
                      </button>
                    </div>
                    <iframe
                      srcDoc={getPreviewHtml(receiptTemplate)}
                      className="w-full min-h-[600px] border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                      title="Receipt Preview"
                    ></iframe>
                  </div>
                ) : (
                  <textarea
                    className="w-full border rounded p-3 min-h-[500px] font-mono text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={receiptTemplate}
                    onChange={(e) => setReceiptTemplate(e.target.value)}
                    placeholder="<h1>Receipt for {{name}}</h1>..."
                  ></textarea>
                )}
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={handleSaveReceiptTemplate}
                  className="bg-green-600 text-white px-6 py-2 rounded shadow hover:bg-green-700 transition"
                  disabled={savingReceiptTemplate}
                >
                  {savingReceiptTemplate ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

