import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Maximize2,
  Minimize2,
  Clock,
  UserCheck,
  Volume2,
  VolumeX,
  Settings,
  ChevronLeft,
  Loader2,
  Check,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/api/client.js";

// Synthesize pleasant success chime using Web Audio API
function playChime(success = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (success) {
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(160, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch (e) {
    // Audio context may be restricted before user gesture
  }
}

export default function BiometricClockPage() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const containerRef = useRef(null);

  const [mode, setMode] = useState("AUTO"); // AUTO, CLOCK_IN, CLOCK_OUT
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scanning & Attendance State
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Align face inside the oval frame to clock in/out");
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [errorResult, setErrorResult] = useState(null);
  const [serviceStatus, setServiceStatus] = useState({ online: true, checked: false });

  // Clock ticker
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Check face service health
  useEffect(() => {
    api
      .get("/hr/biometrics/health")
      .then((res) => {
        setServiceStatus({ online: res.data?.service?.online !== false, checked: true });
      })
      .catch(() => {
        setServiceStatus({ online: false, checked: true });
      });
  }, []);

  // Enumerate cameras
  useEffect(() => {
    async function getCameras() {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devs.filter((d) => d.kind === "videoinput");
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      } catch (e) {
        console.warn("Could not list video devices:", e);
      }
    }
    getCameras();
  }, []);

  // Start webcam
  const startCamera = useCallback(
    async (devId) => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      try {
        setCameraError("");
        const constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
            ...(devId ? { deviceId: { exact: devId } } : {}),
          },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraError("Camera unavailable. Please allow webcam permissions in your browser.");
        setCameraActive(false);
      }
    },
    []
  );

  useEffect(() => {
    startCamera(selectedDeviceId);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [startCamera, selectedDeviceId]);

  // Capture single frame
  const grabFrame = () => {
    if (!videoRef.current) return null;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.88);
  };

  // Perform multi-frame capture and biometric verification
  const handlePerformScan = async () => {
    if (isScanning || !cameraActive || attendanceResult) return;

    setIsScanning(true);
    setStatusMessage("Scanning biometric credentials... please hold still");
    setErrorResult(null);

    try {
      // 1. Grab probe frame
      const frame1 = grabFrame();
      if (!frame1) throw new Error("Could not capture video frame");

      // Small delay for anti-spoof micro-motion capture
      await new Promise((r) => setTimeout(r, 220));
      const frame2 = grabFrame();
      await new Promise((r) => setTimeout(r, 220));
      const frame3 = grabFrame();

      const additionalFrames = [frame2, frame3].filter(Boolean);

      // Call Express API
      const res = await api.post("/hr/biometrics/clock", {
        probe_image: frame1,
        additional_frames: additionalFrames,
        mode: mode,
      });

      if (res.data?.success) {
        if (soundEnabled) playChime(true);
        setAttendanceResult(res.data);
        setStatusMessage(res.data.message || "Attendance recorded successfully!");

        // Auto reset after 4.5 seconds for next person in line
        setTimeout(() => {
          setAttendanceResult(null);
          setStatusMessage("Align face inside the oval frame to clock in/out");
        }, 4500);
      }
    } catch (err) {
      if (soundEnabled) playChime(false);
      const errMsg =
        err.response?.data?.message || err.message || "Facial recognition verification failed.";
      setErrorResult({
        message: errMsg,
        duplicate: err.response?.data?.duplicate_prevented,
        isSpoof: errMsg.toLowerCase().includes("spoof") || errMsg.toLowerCase().includes("liveness"),
      });
      setStatusMessage(errMsg);

      // Reset error after 4 seconds
      setTimeout(() => {
        setErrorResult(null);
        setStatusMessage("Align face inside the oval frame to clock in/out");
      }, 4000);
    } finally {
      setIsScanning(false);
    }
  };

  // Auto scan trigger loop when no active popup is displayed
  useEffect(() => {
    if (!cameraActive || isScanning || attendanceResult || errorResult) return;
    const timer = setTimeout(() => {
      handlePerformScan();
    }, 2800);
    return () => clearTimeout(timer);
  }, [cameraActive, isScanning, attendanceResult, errorResult]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${
        isFullscreen ? "p-4 justify-between" : "p-4 sm:p-6"
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <Link
            to="/human-resources/attendance"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 transition"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Attendance
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold tracking-wide text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              Biometric Facial Attendance Kiosk
            </h1>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${
                serviceStatus.online
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  serviceStatus.online ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                }`}
              />
              {serviceStatus.online ? "YuNet + SFace Ready" : "Face Service Offline"}
            </span>
          </div>
        </div>

        {/* Live Clock & Controls */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-mono font-bold text-emerald-400">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className="text-[10px] text-slate-400">
              {currentTime.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            title={soundEnabled ? "Mute audio chimes" : "Enable audio chimes"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            title="Toggle kiosk fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Kiosk Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full items-center justify-center">
        {/* Left: Camera Scanner Viewport */}
        <div className="relative w-full max-w-2xl aspect-[4/3] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
          {cameraError ? (
            <div className="p-8 text-center text-rose-400 max-w-md">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-rose-500" />
              <p className="text-sm font-semibold">{cameraError}</p>
              <button
                onClick={() => startCamera(selectedDeviceId)}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium"
              >
                Reconnect Camera
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Glowing Oval Positioning Reticle */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div
                  className={`relative w-64 h-80 sm:w-72 sm:h-96 rounded-[50%] border-4 transition-all duration-300 ${
                    attendanceResult
                      ? "border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.5)]"
                      : errorResult
                      ? "border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.5)]"
                      : isScanning
                      ? "border-amber-400 animate-pulse shadow-[0_0_30px_rgba(251,191,36,0.4)]"
                      : "border-emerald-400/80 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
                  }`}
                >
                  {/* Subtle target guidelines */}
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-slate-900/90 rounded-full border border-slate-700 text-[11px] text-emerald-300 font-mono tracking-wider">
                    FACE ALIGNMENT
                  </div>
                </div>
              </div>

              {/* Scanning status banner */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <span className="px-3.5 py-1.5 bg-slate-950/80 backdrop-blur rounded-full text-xs font-medium text-slate-200 flex items-center gap-2 border border-slate-700 shadow-lg">
                  {isScanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span className="text-amber-300">Evaluating Liveness...</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>Ready for Face Scan</span>
                    </>
                  )}
                </span>

                <span className="px-3 py-1 bg-slate-950/80 backdrop-blur rounded-full text-[11px] text-slate-400 border border-slate-800">
                  Mode: <strong className="text-white">{mode}</strong>
                </span>
              </div>

              {/* Success Result Modal Overlay */}
              {attendanceResult && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 mb-2">
                    {attendanceResult.action === "CLOCK_IN" ? "Clock In Verified" : "Clock Out Verified"}
                  </span>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {attendanceResult.employee?.name}
                  </h2>
                  <p className="text-xs text-slate-400 mb-4 font-mono">
                    {attendanceResult.employee?.emp_code} • {attendanceResult.employee?.department || "Staff"}
                  </p>

                  <div className="grid grid-cols-2 gap-3 w-full max-w-xs bg-slate-900/90 p-3 rounded-2xl border border-slate-800 text-xs text-left mb-4">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Time</span>
                      <span className="font-bold text-emerald-400 font-mono text-sm">
                        {attendanceResult.clock_time}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Shift Status</span>
                      <span
                        className={`font-semibold ${
                          attendanceResult.status === "LATE" ? "text-amber-400" : "text-emerald-400"
                        }`}
                      >
                        {attendanceResult.status === "LATE"
                          ? `Late (${attendanceResult.late_minutes}m)`
                          : "On-Time"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Biometrically Verified (Match: {((attendanceResult.similarity || 0.95) * 100).toFixed(1)}%)
                  </p>
                </div>
              )}

              {/* Error / Alert Modal Overlay */}
              {errorResult && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                      errorResult.isSpoof
                        ? "bg-rose-500/20 border-2 border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.4)]"
                        : "bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.4)]"
                    }`}
                  >
                    {errorResult.isSpoof ? (
                      <ShieldAlert className="w-10 h-10 text-rose-400" />
                    ) : (
                      <AlertTriangle className="w-10 h-10 text-amber-400" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {errorResult.isSpoof
                      ? "Anti-Spoofing Alert"
                      : errorResult.duplicate
                      ? "Recent Attendance Recorded"
                      : "Face Not Verified"}
                  </h3>
                  <p className="text-xs text-slate-300 max-w-sm mb-4">
                    {errorResult.message}
                  </p>
                  <button
                    onClick={() => {
                      setErrorResult(null);
                      handlePerformScan();
                    }}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Try Again
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Operational Controls & Kiosk Settings */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Mode Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-3">
              Attendance Mode
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "AUTO", label: "Auto In/Out" },
                { id: "CLOCK_IN", label: "Clock In" },
                { id: "CLOCK_OUT", label: "Clock Out" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl transition ${
                    mode === m.id
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                      : "bg-slate-800/80 text-slate-400 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Trigger Button */}
          <button
            onClick={handlePerformScan}
            disabled={isScanning || !cameraActive || !serviceStatus.online}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold text-sm text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" /> Trigger Face Scan Now
              </>
            )}
          </button>

          {/* Camera Selection */}
          {devices.length > 1 && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-slate-400" /> Active Webcam
              </span>
              <select
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Security & Verification Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400 space-y-2.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Active Security Controls
            </span>
            <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1.5">
              <span>Anti-Spoofing Model:</span>
              <span className="text-slate-200 font-mono">MiniFASNetV2 ONNX</span>
            </div>
            <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1.5">
              <span>Face Embedding:</span>
              <span className="text-slate-200 font-mono">OpenCV SFace 128-D</span>
            </div>
            <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-1.5">
              <span>Template Storage:</span>
              <span className="text-emerald-400 font-mono font-medium">AES-256-GCM Vault</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span>Privacy Standard:</span>
              <span className="text-slate-200">Ghana Act 843 Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
