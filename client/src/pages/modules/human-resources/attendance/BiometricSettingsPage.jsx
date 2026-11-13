import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sliders,
  ShieldCheck,
  Save,
  Clock,
  Sparkles,
  Lock,
  ChevronLeft,
  RefreshCw,
  Info,
} from "lucide-react";
import { api } from "@/api/client.js";
import { toast } from "react-toastify";

export default function BiometricSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    match_threshold: 0.380,
    liveness_threshold: 0.850,
    min_face_size: 100,
    allow_multi_frame: 1,
    require_liveness: 1,
    clock_in_grace_minutes: 15,
    auto_detect_in_out: 1,
    prevent_duplicate_window_mins: 5,
  });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/hr/biometrics/settings");
      if (res.data?.settings) {
        setSettings({
          ...res.data.settings,
          match_threshold: Number(res.data.settings.match_threshold),
          liveness_threshold: Number(res.data.settings.liveness_threshold),
        });
      }
    } catch (err) {
      toast.error("Failed to load biometric settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/hr/biometrics/settings", settings);
      toast.success("Biometric calibration & attendance rules saved successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Link
            to="/human-resources/attendance"
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Time & Attendance
          </Link>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-500" /> Biometric Calibration & Security Rules
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Fine-tune facial recognition sensitivity, anti-spoofing strictness, and shift attendance enforcement rules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Model Accuracy & Sensitivity */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recognition Sensitivity (InsightFace ArcFace Engine)
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Cosine Match Similarity Threshold:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {Number(settings.match_threshold).toFixed(3)}
                  </strong>
                </label>
                <span className="text-[11px] text-slate-400">Recommended: 0.360 – 0.400</span>
              </div>
              <input
                type="range"
                min="0.300"
                max="0.550"
                step="0.005"
                value={settings.match_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, match_threshold: parseFloat(e.target.value) })
                }
                className="w-full accent-emerald-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Lower values increase match tolerance (better in variable lighting); higher values require closer facial feature correspondence.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Minimum Face Bounding Box (Pixels)
              </label>
              <input
                type="number"
                min="60"
                max="250"
                className="input w-48 text-xs font-mono"
                value={settings.min_face_size}
                onChange={(e) =>
                  setSettings({ ...settings, min_face_size: parseInt(e.target.value, 10) })
                }
              />
              <span className="text-[11px] text-slate-400 ml-2">Rejects captures when user is too far from camera</span>
            </div>
          </div>
        </div>

        {/* Anti-Spoofing & Liveness Strictness */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Anti-Spoofing & Liveness Verification (MiniFASNet Engine)
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Liveness Probability Threshold:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {Number(settings.liveness_threshold).toFixed(3)}
                  </strong>
                </label>
                <span className="text-[11px] text-slate-400">Default: 0.850</span>
              </div>
              <input
                type="range"
                min="0.650"
                max="0.950"
                step="0.01"
                value={settings.liveness_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, liveness_threshold: parseFloat(e.target.value) })
                }
                className="w-full accent-emerald-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Probability threshold required to confirm live human presentation and reject paper printouts, tablet screens, and video replays.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.require_liveness)}
                  onChange={(e) =>
                    setSettings({ ...settings, require_liveness: e.target.checked ? 1 : 0 })
                  }
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Mandatory Anti-Spoofing Check
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Immediately aborts clock-in if presentation attack is detected.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(settings.allow_multi_frame)}
                  onChange={(e) =>
                    setSettings({ ...settings, allow_multi_frame: e.target.checked ? 1 : 0 })
                  }
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Multi-Frame Temporal Micro-Motion
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Samples 3 frames over 0.5s to detect biological eye and head micro-movements.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Attendance Business Rules */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Shift Grace Periods & Duplicate Prevention
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Clock-In Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                className="input w-full font-mono text-xs"
                value={settings.clock_in_grace_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    clock_in_grace_minutes: parseInt(e.target.value, 10) || 0,
                  })
                }
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Minutes after assigned shift start time before attendance is tagged as "LATE".
              </span>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Duplicate Scan Cooldown Window (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                className="input w-full font-mono text-xs"
                value={settings.prevent_duplicate_window_mins}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    prevent_duplicate_window_mins: parseInt(e.target.value, 10) || 1,
                  })
                }
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Prevents accidental double clock-ins when employees walk by the kiosk.
              </span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || loading}
            className="btn-primary text-xs flex items-center gap-2 px-6 py-2.5 shadow-md shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving Changes..." : "Save Biometric Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
