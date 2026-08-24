import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../api/client.js";
import { toast } from "react-toastify";
import { useAuth } from "../../../auth/AuthContext.jsx";
import { Brain, Sparkles, CheckCircle, ShieldCheck } from "lucide-react";

export default function GeneralSettingsPage() {
  const { user } = useAuth();
  const [cloud, setCloud] = useState({ cloud_name: "", api_key: "", api_secret: "", folder: "", has_secret: false });
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [emailTestTo, setEmailTestTo] = useState("");
  const [emailTesting, setEmailTesting] = useState(false);
  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState("");
  const [loginBackgroundVersion, setLoginBackgroundVersion] = useState("");
  const [loginBackgroundSaving, setLoginBackgroundSaving] = useState(false);
  const [inactivityTimeout, setInactivityTimeout] = useState(() => {
    try {
      if (typeof localStorage !== "undefined") {
        const val = localStorage.getItem("omnisuite.inactivityTimeout");
        if (val !== null) return val;
      }
    } catch {}
    return "60";
  });

  const [envVars, setEnvVars] = useState({
    ARKESEL_API_KEY: "",
    ARKESEL_SENDER_ID: "",
    GREEN_API_ID_INSTANCE: "",
    GREEN_API_TOKEN_INSTANCE: "",
    SMTP_HOST: "",
    SMTP_PORT: "",
    SMTP_USER: "",
    SMTP_PASS: "",
    SMTP_FROM: "",
    SMTP_SECURE: "false",
    TEMPLATE_SALES_ORDER: "",
    TEMPLATE_PURCHASE_ORDER: "",
    TEMPLATE_SERVICE_ORDER: "",
    TEMPLATE_MAINTENANCE_JOB: "",
    TEMPLATE_PAYMENT_VOUCHER: "",
  });
  const [announcements, setAnnouncements] = useState("");
  const [announcementsSaving, setAnnouncementsSaving] = useState(false);
  const [envLoading, setEnvLoading] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);
  
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("");
  const [googleMapsLoading, setGoogleMapsLoading] = useState(false);
  const [googleMapsSaving, setGoogleMapsSaving] = useState(false);

  // Groq AI Configuration State
  const [groqKey, setGroqKey] = useState("");
  const [groqStatus, setGroqStatus] = useState(null);
  const [groqSaving, setGroqSaving] = useState(false);
  const [groqTesting, setGroqTesting] = useState(false);
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setCloudLoading(true);
        const res = await api.get("/admin/settings/cloudinary");
        const d = res?.data?.data || {};
        if (!mounted) return;
        setCloud(p => ({ ...p, cloud_name: d.cloud_name || "", api_key: d.api_key || "", folder: d.folder || "", has_secret: !!d.has_secret }));
      } catch {} finally { if (mounted) setCloudLoading(false); }
    })();

    (async () => {
      try {
        setEnvLoading(true);
        const res = await api.get("/admin/settings/env");
        if (!mounted) return;
        setEnvVars({
          ARKESEL_API_KEY: res.data.ARKESEL_API_KEY || "",
          ARKESEL_SENDER_ID: res.data.ARKESEL_SENDER_ID || "",
          GREEN_API_ID_INSTANCE: res.data.GREEN_API_ID_INSTANCE || "",
          GREEN_API_TOKEN_INSTANCE: res.data.GREEN_API_TOKEN_INSTANCE || "",
          SMTP_HOST: res.data.SMTP_HOST || "",
          SMTP_PORT: res.data.SMTP_PORT || "",
          SMTP_USER: res.data.SMTP_USER || "",
          SMTP_PASS: res.data.SMTP_PASS || "",
          SMTP_FROM: res.data.SMTP_FROM || "",
          SMTP_SECURE: res.data.SMTP_SECURE || "false",
          TEMPLATE_SALES_ORDER: res.data.TEMPLATE_SALES_ORDER || "",
          TEMPLATE_PURCHASE_ORDER: res.data.TEMPLATE_PURCHASE_ORDER || "",
          TEMPLATE_SERVICE_ORDER: res.data.TEMPLATE_SERVICE_ORDER || "",
          TEMPLATE_MAINTENANCE_JOB: res.data.TEMPLATE_MAINTENANCE_JOB || "",
          TEMPLATE_PAYMENT_VOUCHER: res.data.TEMPLATE_PAYMENT_VOUCHER || "",
        });
      } catch (err) {
        toast.error("Failed to load environment variables.");
      } finally {
        if (mounted) setEnvLoading(false);
      }
    })();

    (async () => {
      try {
        setGoogleMapsLoading(true);
        const res = await api.get("/admin/settings/google-maps");
        if (mounted && res?.data?.data?.api_key) {
          setGoogleMapsApiKey(res.data.data.api_key);
        }
      } catch {} finally { if (mounted) setGoogleMapsLoading(false); }
    })();

    (async () => {
      try {
        const res = await api.get("/ai/status");
        if (mounted && res.data) {
          setGroqStatus(res.data);
          if (res.data.defaultModel) setGroqModel(res.data.defaultModel);
        }
      } catch {}
    })();

    (async () => {
      try {
        const res = await api.get("/admin/settings/announcements");
        if (mounted && res?.data?.announcements !== undefined) {
          setAnnouncements(res.data.announcements);
        }
      } catch {}
    })();

    return () => { mounted = false; };
  }, []);

  async function loadLoginBackgroundMeta() {
    try {
      const res = await api.get("/admin/settings/login-bg-info");
      if (res.data) {
        const hasBackground = !!res?.data?.hasBackground;
        const version = res?.data?.version ? `?v=${res.data.version}` : "";
        setLoginBackgroundUrl(hasBackground ? `/api/admin/settings/login-background${version}` : "");
        setLoginBackgroundVersion(res?.data?.version || "");
      }
    } catch {
      setLoginBackgroundUrl("");
      setLoginBackgroundVersion("");
    }
  }

  useEffect(() => { loadLoginBackgroundMeta(); }, []);

  async function uploadLoginBackground(file) {
    if (!file) return;
    try {
      setLoginBackgroundSaving(true);
      let uploadFile = file;
      if (file.size > 300 * 1024) {
        const compressed = await new Promise((resolve) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.onload = () => {
            URL.revokeObjectURL(url);
            let w = img.naturalWidth, h = img.naturalHeight;
            const maxDim = 1920;
            if (w > maxDim || h > maxDim) {
              if (w > h) { h = (h / w) * maxDim; w = maxDim; }
              else { w = (w / h) * maxDim; h = maxDim; }
            }
            const c = document.createElement("canvas");
            c.width = w; c.height = h;
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
            c.toBlob(blob => resolve(blob), "image/jpeg", 0.8);
          };
          img.src = url;
        });
        uploadFile = new File([compressed], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
      }
      const fd = new FormData();
      fd.append("background", uploadFile);
      await api.post("/admin/settings/login-background", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Login background updated");
      await loadLoginBackgroundMeta();
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update login background");
    } finally { setLoginBackgroundSaving(false); }
  }

  async function clearLoginBackground() {
    try {
      setLoginBackgroundSaving(true);
      await api.delete("/admin/settings/login-background");
      setLoginBackgroundUrl("");
      setLoginBackgroundVersion("");
      toast.success("Login background reset");
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to reset login background");
    } finally { setLoginBackgroundSaving(false); }
  }

  async function saveCloudinary() {
    try {
      setCloudSaving(true);
      await api.post("/admin/settings/cloudinary", {
        cloud_name: cloud.cloud_name, api_key: cloud.api_key,
        api_secret: cloud.api_secret || undefined, folder: cloud.folder || undefined,
      });
      toast.success("Cloudinary settings saved");
      setCloud(p => ({ ...p, has_secret: true, api_secret: "" }));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to save settings");
    } finally { setCloudSaving(false); }
  }

  async function sendTestEmail() {
    try {
      setEmailTesting(true);
      const res = await api.post("/admin/email/test", { to: emailTestTo || undefined });
      const configured = !!res?.data?.configured;
      const sent = !!res?.data?.sent;
      const error = res?.data?.error;
      if (sent) {
        toast.success(`Test email sent to ${res?.data?.to || emailTestTo || "your address"}`);
      } else if (!configured) {
        toast.error("SMTP is not configured. Set SMTP_HOST and credentials first.");
      } else {
        toast.error(error ? `Failed to send: ${error}` : "Failed to send test email");
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || "Failed to send test email";
      toast.error(msg);
    } finally {
      setEmailTesting(false);
    }
  }

  async function saveAnnouncements() {
    try {
      setAnnouncementsSaving(true);
      await api.post("/admin/settings/announcements", { announcements });
      toast.success("Announcements saved successfully.");
    } catch (e) {
      toast.error("Failed to save announcements");
    } finally {
      setAnnouncementsSaving(false);
    }
  }

  async function saveEnvVars() {
    try {
      setEnvSaving(true);
      await api.post("/admin/settings/env", envVars);
      toast.success("Environment configurations saved successfully.");
      
      const res = await api.get("/admin/settings/env");
      setEnvVars(prev => ({
        ...prev,
        ARKESEL_API_KEY: res.data.ARKESEL_API_KEY || "",
        ARKESEL_SENDER_ID: res.data.ARKESEL_SENDER_ID || "",
        GREEN_API_TOKEN_INSTANCE: res.data.GREEN_API_TOKEN_INSTANCE || "",
        SMTP_PASS: res.data.SMTP_PASS || ""
      }));
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to save environment variables");
    } finally {
      setEnvSaving(false);
    }
  }

  async function saveGoogleMaps() {
    try {
      setGoogleMapsSaving(true);
      await api.post("/admin/settings/google-maps", { api_key: googleMapsApiKey });
      toast.success("Google Maps settings saved");
      const res = await api.get("/admin/settings/google-maps");
      if (res?.data?.data?.api_key) {
        setGoogleMapsApiKey(res.data.data.api_key);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to save settings");
    } finally { setGoogleMapsSaving(false); }
  }

  async function saveGroqSettings() {
    if (!groqKey.trim()) return;
    try {
      setGroqSaving(true);
      const res = await api.post("/ai/save-key", { apiKey: groqKey.trim() });
      toast.success(res.data?.message || "Groq AI Key verified and saved successfully!");
      setGroqKey("");
      const statusRes = await api.get("/ai/status");
      setGroqStatus(statusRes.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to verify Groq key");
    } finally {
      setGroqSaving(false);
    }
  }

  async function testGroqConnection() {
    try {
      setGroqTesting(true);
      const res = await api.get("/ai/status");
      if (res.data?.connected) {
        toast.success("Groq Cloud AI Engine is connected and responding!");
      } else {
        toast.warn(res.data?.statusMessage || "Groq API key is not yet configured.");
      }
      setGroqStatus(res.data);
    } catch (e) {
      toast.error("Failed to test connection to Groq API.");
    } finally {
      setGroqTesting(false);
    }
  }

  if (user?.id !== 1) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <h2 className="text-xl font-bold mb-2 text-slate-700">Access Denied</h2>
        <p className="text-sm">You do not have permission to view System Configurations.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <div className="text-xs text-slate-500 mb-1">
          <Link to="/system-configuration" className="text-brand-600 hover:underline">System Configuration</Link> / General Settings
        </div>
        <h1 className="text-2xl font-bold text-slate-800">General Settings</h1>
        <p className="text-sm text-slate-500">Manage environment configurations, API integrations, AI copilot, and system defaults.</p>
      </div>

      <div className="space-y-6">
        {/* Groq AI Configuration ("Banks" AI Copilot) Card */}
        <div className="card border-brand-200 dark:border-brand-800 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/80">
          <div className="card-body space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-900 text-white flex items-center justify-center shadow-inner">
                  <Brain size={22} className="text-primary animate-pulse" />
                </div>
                <div>
                  <div className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span>Groq AI Configuration ("Banks" AI)</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Configure your Groq Cloud API Key to empower "Banks" with ultra-fast LLM inference and live database analysis.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {groqStatus?.isConfigured ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle size={13} className="text-emerald-500" /> Connected ({groqStatus.maskedKey})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-800">
                    Key Not Configured
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Groq API Key {groqStatus?.isConfigured && `(Current: ${groqStatus.maskedKey})`}
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter gsk_... key"
                    className="input w-full text-xs"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    disabled={groqSaving}
                  />
                  <button
                    type="button"
                    className="btn-primary whitespace-nowrap text-xs px-4"
                    onClick={saveGroqSettings}
                    disabled={groqSaving || !groqKey.trim()}
                  >
                    {groqSaving ? "Verifying..." : "Save Key"}
                  </button>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Get your free API key at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-brand-600 dark:text-brand-400 underline font-medium">console.groq.com/keys</a></span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Active Model & Capabilities
                </label>
                <select
                  value={groqModel}
                  onChange={(e) => setGroqModel(e.target.value)}
                  className="input w-full text-xs"
                >
                  <optgroup label="🔥 High Intelligence & Deep Reasoning (Recommended)">
                    <option value="openai/gpt-oss-120b">GPT-OSS 120B (Best: Deep ERP Reasoning, Complex Analytics & Tool Calling)</option>
                    <option value="groq/compound">Groq Compound (Multi-Agent Fast Synthesis & Reasoning)</option>
                    <option value="qwen/qwen3.6-27b">Qwen 3.6 27B (High Capability Enterprise & Code Reasoning)</option>
                    <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Meta Flagship Enterprise Model)</option>
                  </optgroup>
                  <optgroup label="⚡ Ultra-Fast & Lightweight">
                    <option value="openai/gpt-oss-20b">GPT-OSS 20B (High Speed & Accurate Tool Execution)</option>
                    <option value="groq/compound-mini">Groq Compound Mini (Sub-Second Response Time)</option>
                    <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (Ultra-Fast Lightweight)</option>
                    <option value="allam-2-7b">ALLaM 2 7B (Fast Conversational Assistant)</option>
                  </optgroup>
                  <optgroup label="🌐 Specialized & Multilingual">
                    <option value="canopylabs/orpheus-v1-english">Canopy Orpheus v1 (Specialized English Reasoning)</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B (32k Extended Context Window)</option>
                  </optgroup>
                </select>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1"
                    onClick={testGroqConnection}
                    disabled={groqTesting}
                  >
                    <Sparkles size={12} className="text-primary" />
                    <span>{groqTesting ? "Testing..." : "Test AI Connection"}</span>
                  </button>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck size={12} /> Safe read-only ERP database tools enabled
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-4">
            <div>
              <div className="text-lg font-semibold">Global Broadcast / Announcements</div>
              <div className="text-sm text-slate-500">Post a message that displays on the dashboard or header for all system users.</div>
            </div>
            <div>
              <textarea
                className="input w-full h-24 resize-none"
                placeholder="e.g. System maintenance scheduled for tonight at 11:00 PM."
                value={announcements}
                onChange={e => setAnnouncements(e.target.value)}
                disabled={announcementsSaving}
              />
            </div>
            <div className="flex justify-end">
              <button type="button" className="btn-primary" onClick={saveAnnouncements} disabled={announcementsSaving}>
                {announcementsSaving ? "Saving..." : "Save Announcement"}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-4">
            <div>
              <div className="text-lg font-semibold">Communication & Service Credentials</div>
              <div className="text-sm text-slate-500">Configure external API integrations and keys for SMS, WhatsApp, and Mail.</div>
            </div>

            {envLoading ? (
              <div className="text-sm text-slate-500">Loading configurations...</div>
            ) : (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <div className="font-medium text-slate-700 mb-2">Arkesel SMS Gateway</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700">API Key</label>
                      <input type="password" placeholder={envVars.ARKESEL_API_KEY === "********" ? "•••••••• (unchanged)" : ""} className="input w-full" value={envVars.ARKESEL_API_KEY === "********" ? "" : envVars.ARKESEL_API_KEY} onChange={e => setEnvVars(p => ({ ...p, ARKESEL_API_KEY: e.target.value }))} disabled={envSaving} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Sender ID</label>
                      <input type="text" placeholder={envVars.ARKESEL_SENDER_ID === "********" ? "•••••••• (unchanged)" : ""} className="input w-full" value={envVars.ARKESEL_SENDER_ID === "********" ? "" : envVars.ARKESEL_SENDER_ID} onChange={e => setEnvVars(p => ({ ...p, ARKESEL_SENDER_ID: e.target.value }))} disabled={envSaving} />
                    </div>
                  </div>
                </div>

                <div className="border-b pb-3">
                  <div className="font-medium text-slate-700 mb-2">Green API (WhatsApp)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700">ID Instance</label>
                      <input type="text" className="input w-full" value={envVars.GREEN_API_ID_INSTANCE} onChange={e => setEnvVars(p => ({ ...p, GREEN_API_ID_INSTANCE: e.target.value }))} disabled={envSaving} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Token Instance</label>
                      <input type="password" placeholder={envVars.GREEN_API_TOKEN_INSTANCE === "********" ? "•••••••• (unchanged)" : ""} className="input w-full" value={envVars.GREEN_API_TOKEN_INSTANCE === "********" ? "" : envVars.GREEN_API_TOKEN_INSTANCE} onChange={e => setEnvVars(p => ({ ...p, GREEN_API_TOKEN_INSTANCE: e.target.value }))} disabled={envSaving} />
                    </div>
                  </div>
                </div>

                <div className="border-b pb-3">
                  <div className="font-medium text-slate-700 mb-2">SMTP Mail Configuration</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700">Host</label>
                      <input type="text" className="input w-full" value={envVars.SMTP_HOST} onChange={e => setEnvVars(p => ({ ...p, SMTP_HOST: e.target.value }))} disabled={envSaving} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Port</label>
                      <input type="text" className="input w-full" value={envVars.SMTP_PORT} onChange={e => setEnvVars(p => ({ ...p, SMTP_PORT: e.target.value }))} disabled={envSaving} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Secure (SSL/TLS)</label>
                      <select className="input w-full" value={envVars.SMTP_SECURE} onChange={e => setEnvVars(p => ({ ...p, SMTP_SECURE: e.target.value }))} disabled={envSaving}>
                        <option value="false">False (Port 587)</option>
                        <option value="true">True (Port 465)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Username</label>
                      <input type="text" className="input w-full" value={envVars.SMTP_USER} onChange={e => setEnvVars(p => ({ ...p, SMTP_USER: e.target.value }))} disabled={envSaving} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">Password</label>
                      <input type="password" placeholder={envVars.SMTP_PASS === "********" ? "•••••••• (unchanged)" : ""} className="input w-full" value={envVars.SMTP_PASS === "********" ? "" : envVars.SMTP_PASS} onChange={e => setEnvVars(p => ({ ...p, SMTP_PASS: e.target.value }))} disabled={envSaving} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700">From Address</label>
                      <input type="text" className="input w-full" value={envVars.SMTP_FROM} onChange={e => setEnvVars(p => ({ ...p, SMTP_FROM: e.target.value }))} disabled={envSaving} />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-slate-700">Messaging Templates</div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Sales Order Template</label>
                    <textarea className="input w-full h-24 resize-none" value={envVars.TEMPLATE_SALES_ORDER} onChange={e => setEnvVars(p => ({ ...p, TEMPLATE_SALES_ORDER: e.target.value }))} disabled={envSaving}></textarea>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Purchase Order Template</label>
                    <textarea className="input w-full h-24 resize-none" value={envVars.TEMPLATE_PURCHASE_ORDER} onChange={e => setEnvVars(p => ({ ...p, TEMPLATE_PURCHASE_ORDER: e.target.value }))} disabled={envSaving}></textarea>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Service Order Template</label>
                    <textarea className="input w-full h-24 resize-none" value={envVars.TEMPLATE_SERVICE_ORDER} onChange={e => setEnvVars(p => ({ ...p, TEMPLATE_SERVICE_ORDER: e.target.value }))} disabled={envSaving}></textarea>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Maintenance Job Template</label>
                    <textarea className="input w-full h-24 resize-none" value={envVars.TEMPLATE_MAINTENANCE_JOB} onChange={e => setEnvVars(p => ({ ...p, TEMPLATE_MAINTENANCE_JOB: e.target.value }))} disabled={envSaving}></textarea>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700">Payment Voucher Template</label>
                    <textarea className="input w-full h-24 resize-none" value={envVars.TEMPLATE_PAYMENT_VOUCHER} onChange={e => setEnvVars(p => ({ ...p, TEMPLATE_PAYMENT_VOUCHER: e.target.value }))} disabled={envSaving}></textarea>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button type="button" className="btn-primary bg-green-600 hover:bg-green-700 border-none text-white" onClick={saveEnvVars} disabled={envSaving}>
                {envSaving ? "Saving..." : "Save Credentials"}
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-lg font-semibold">Login Background Image</div>
                <div className="text-sm text-slate-500">Set the background image for the login and password reset forms.</div>
              </div>
              {loginBackgroundUrl && (
                <img src={loginBackgroundUrl} alt="Login Background" className="h-20 w-auto rounded border border-slate-200" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="btn-primary cursor-pointer">
                {loginBackgroundSaving ? "Saving..." : "Upload Background"}
                <input type="file" accept="image/*" className="hidden" disabled={loginBackgroundSaving} onChange={e => { const file = e.target.files?.[0] || null; e.target.value = ""; uploadLoginBackground(file); }} />
              </label>
              <button type="button" className="btn-outline" disabled={loginBackgroundSaving || !loginBackgroundUrl} onClick={clearLoginBackground}>Reset to Default</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-lg font-semibold">Security & Inactivity</div>
                <div className="text-sm text-slate-500">Set how many minutes until an inactive user is automatically logged out. Set to 0 to disable.</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <input type="number" min="0" className="input w-32" value={inactivityTimeout}
                onChange={e => { const val = e.target.value; setInactivityTimeout(val); try { if (typeof localStorage !== "undefined") localStorage.setItem("omnisuite.inactivityTimeout", val); } catch {} }} />
              <span className="text-sm text-slate-600">minutes</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-3">
            <div className="text-lg font-semibold">Email</div>
            <div className="text-sm text-slate-500">Send a test email to verify SMTP settings.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Recipient</label>
                <input className="input w-full" value={emailTestTo} onChange={e => setEmailTestTo(e.target.value)} placeholder="user@example.com (optional)" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary" onClick={sendTestEmail} disabled={emailTesting}>{emailTesting ? "Sending..." : "Send Test Email"}</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-3">
            <div className="text-lg font-semibold">Cloudinary Storage</div>
            <div className="text-sm text-slate-500">Store attachments in Cloudinary; links are saved to document records.</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Cloud Name</label>
                <input className="input w-full" value={cloud.cloud_name} onChange={e => setCloud(p => ({ ...p, cloud_name: e.target.value }))} disabled={cloudLoading || cloudSaving} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">API Key</label>
                <input className="input w-full" value={cloud.api_key} onChange={e => setCloud(p => ({ ...p, api_key: e.target.value }))} disabled={cloudLoading || cloudSaving} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">API Secret</label>
                <input type="password" placeholder={cloud.has_secret && !cloud.api_secret ? "•••••••• (unchanged)" : ""} className="input w-full" value={cloud.api_secret} onChange={e => setCloud(p => ({ ...p, api_secret: e.target.value }))} disabled={cloudLoading || cloudSaving} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Folder (optional)</label>
                <input className="input w-full" value={cloud.folder} onChange={e => setCloud(p => ({ ...p, folder: e.target.value }))} disabled={cloudLoading || cloudSaving} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary" onClick={saveCloudinary} disabled={cloudSaving}>{cloudSaving ? "Saving..." : "Save Cloudinary Settings"}</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-3">
            <div>
              <div className="text-lg font-semibold">Google Maps</div>
              <div className="text-sm text-slate-500">Enter your Google Maps API Key to enable map features.</div>
            </div>
            {googleMapsLoading ? <div className="text-sm text-slate-500">Loading...</div> : (
              <div className="max-w-md space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700">API Key</label>
                  <input type="text" className="input w-full" placeholder="AIzaSy..." value={googleMapsApiKey} onChange={e => setGoogleMapsApiKey(e.target.value)} disabled={googleMapsSaving} />
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-primary" disabled={googleMapsSaving} onClick={saveGoogleMaps}>
                    {googleMapsSaving ? "Saving..." : "Save Google Maps Settings"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-3">
            <div className="text-lg font-semibold">Compliance Notification Template</div>
            <div className="text-sm text-slate-500">Message template sent when a vehicle compliance document is expiring soon or expired.</div>
            <ComplianceTemplateSection />
          </div>
        </div>

        <div className="card">
          <div className="card-body space-y-3">
            <div className="text-lg font-semibold">Servicing Notification Template</div>
            <div className="text-sm text-slate-500">Message template sent when a vehicle is due for servicing.</div>
            <ServicingTemplateSection />
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplianceTemplateSection() {
  const [template, setTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.get("/transport/templates/compliance");
        setTemplate(res.data?.template || "");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      await api.put("/transport/templates/compliance", { template });
      toast.success("Compliance template updated");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update compliance template");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Loading template...</div>;

  return (
    <div className="space-y-3">
      <textarea
        className="input w-full h-24"
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        placeholder="Enter template..."
      />
      <div className="flex justify-between items-center text-xs text-slate-500">
        <div>Variables: {"{registration_number}"}, {"{compliance_type}"}, {"{expiry_date}"}, {"{days_left}"}</div>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
      </div>
    </div>
  );
}

function ServicingTemplateSection() {
  const [template, setTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.get("/transport/templates/servicing");
        setTemplate(res.data?.template || "");
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      await api.put("/transport/templates/servicing", { template });
      toast.success("Servicing template updated");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update servicing template");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Loading template...</div>;

  return (
    <div className="space-y-3">
      <textarea
        className="input w-full h-24"
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        placeholder="Enter template..."
      />
      <div className="flex justify-between items-center text-xs text-slate-500">
        <div>Variables: {"{registration_number}"}, {"{current_mileage}"}, {"{next_service_mileage}"}, {"{due_date}"}</div>
        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
      </div>
    </div>
  );
}
