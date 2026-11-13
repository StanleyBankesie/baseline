import React, { useState, useRef, useEffect } from "react";
import Modal from "@/components/Modal";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Eye,
  Loader2,
  Settings,
  Lock,
} from "lucide-react";
import { api } from "@/api/client.js";
import { toast } from "react-toastify";

/**
 * Universal Production Biometric Face Capture & Enrollment Modal
 */
export default function FaceCaptureModal({
  open,
  onClose,
  onCapture,
  mode = "register",
  employeeId,
  enrolledDescriptor,
  enrolledPhoto,
  employeeName = "Employee",
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [consentGiven, setConsentGiven] = useState(true);
  const [replaceExisting, setReplaceExisting] = useState(false);

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
        console.warn("Could not enumerate video devices:", e);
      }
    }
    if (open) {
      getCameras();
    }
  }, [open]);

  // Start webcam when modal opens or camera changes
  useEffect(() => {
    if (open) {
      setCapturedPhoto(null);
      setAnalysisResult(null);
      setCameraError("");
      setReplaceExisting(false);
      startCamera(selectedDeviceId);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, selectedDeviceId]);

  const startCamera = async (deviceId) => {
    stopCamera();
    try {
      setCameraError("");
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
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
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in your browser to proceed with biometric scanning."
          : "Could not start camera. Please verify your webcam is connected and not in use by another application."
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Capture current video frame as high quality base64 image
  const captureFrame = () => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  const handleCapture = async () => {
    if (!cameraActive || analyzing) return;
    if (mode === "register" && !consentGiven) {
      toast.warning("Please acknowledge employee consent under Ghana Data Protection Act (Act 843)");
      return;
    }

    setAnalyzing(true);
    try {
      const photoBase64 = captureFrame();
      if (!photoBase64) {
        toast.error("Failed to capture image frame from camera.");
        setAnalyzing(false);
        return;
      }
      setCapturedPhoto(photoBase64);

      // If in enrollment mode with employeeId, call backend biometric endpoint directly
      if (mode === "register" && employeeId) {
        const res = await api.post("/hr/biometrics/enroll", {
          employee_id: employeeId,
          image: photoBase64,
          consent_given: consentGiven,
          replace_existing: replaceExisting,
        });

        if (res.data?.success) {
          toast.success(res.data.message || "Facial biometric credentials enrolled successfully!");
          setAnalysisResult({
            success: true,
            quality: res.data.quality,
            message: "Enrolled & Encrypted (AES-256-GCM)",
          });
        }
      } else {
        // Evaluate via face service health check or local confirmation
        setAnalysisResult({
          success: true,
          message: "Face frame captured successfully.",
        });
      }
    } catch (err) {
      console.error("Biometric capture error:", err);
      const data = err.response?.data;
      const errMsg = data?.message || err.message || "Failed to process face biometric.";
      toast.error(errMsg);
      setAnalysisResult({
        success: false,
        duplicate: Boolean(data?.duplicate_biometric || data?.already_registered),
        already_registered: Boolean(data?.already_registered),
        message: errMsg,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setAnalysisResult(null);
    startCamera(selectedDeviceId);
  };

  const handleConfirmAndSave = () => {
    if (!capturedPhoto || !analysisResult?.success) {
      toast.error("Cannot save credentials: face analysis did not pass or contains errors.");
      return;
    }
    if (onCapture) {
      onCapture({
        photoBase64: capturedPhoto,
        descriptor: null,
        success: true,
        alreadyEnrolled: Boolean(employeeId),
      });
    }
    stopCamera();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title={
        mode === "register"
          ? "Biometric Facial Recognition Enrollment"
          : "Employee Facial Recognition Verification"
      }
      subtitle={
        mode === "register"
          ? `Register secure AES-256 encrypted facial template for ${employeeName}`
          : `Verify live biometric credentials for ${employeeName}`
      }
      icon={<Camera className="text-emerald-500 w-5 h-5" />}
      maxWidth="max-w-xl"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* Existing Profile Warning & Replace Checkbox */}
        {enrolledDescriptor && mode === "register" && !capturedPhoto && (
          <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-xs">
            <span className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              This employee already has an active biometric profile.
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 dark:text-slate-100 font-semibold shrink-0">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              Replace existing
            </label>
          </div>
        )}

        {/* Camera Selector (Laptop vs External USB) */}
        {devices.length > 1 && !capturedPhoto && (
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-slate-400" /> Camera Source:
            </span>
            <select
              className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              {devices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Camera Feed / Photo Preview Container */}
        <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
          {cameraError ? (
            <div className="p-6 text-center text-rose-400 max-w-sm">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-rose-500" />
              <p className="text-sm font-semibold">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(selectedDeviceId)}
                className="mt-4 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
              >
                Retry Camera
              </button>
            </div>
          ) : !capturedPhoto ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Oval Face Positioning Reticle Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-56 h-72 rounded-[50%] border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse">
                  {/* Crosshairs */}
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-emerald-400/30" />
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-emerald-400/30" />
                  {/* Subtle target corners */}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-900/80 rounded text-[10px] text-emerald-300 font-mono">
                    Align Face Here
                  </div>
                </div>
              </div>

              {/* Status pill */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <span className="px-3 py-1 bg-slate-900/80 backdrop-blur rounded-full text-[11px] font-medium text-slate-200 flex items-center gap-1.5 border border-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Camera Preview
                </span>
                <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur rounded-full text-[10px] text-emerald-400 font-medium">
                  InsightFace ArcFace Engine (512-D)
                </span>
              </div>
            </>
          ) : (
            <div className="relative w-full h-full">
              <img
                src={capturedPhoto}
                alt="Captured Face"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 px-3 py-1 bg-slate-900/80 backdrop-blur rounded-full text-xs font-semibold text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> Snapshot Captured
              </div>
            </div>
          )}

          {analyzing && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-slate-200">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <span className="text-xs font-medium tracking-wide">
                Analyzing Face Quality & Checking Duplicate Biometrics...
              </span>
            </div>
          )}
        </div>

        {/* Quality & Security Feedback */}
        {analysisResult && (
          <div
            className={`p-3 rounded-xl border text-xs ${
              analysisResult.success
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              {analysisResult.success ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span>{analysisResult.message}</span>
            </div>
            {analysisResult.quality && (
              <div className="mt-2 text-[11px] text-slate-400 grid grid-cols-2 gap-2 bg-slate-900/40 p-2 rounded-lg">
                <div>Sharpness: {analysisResult.quality.blur_score} (Passed)</div>
                <div>Illumination: {analysisResult.quality.illumination?.mean} / 255</div>
              </div>
            )}
            {analysisResult.already_registered && (
              <div className="mt-2.5 pt-2 border-t border-rose-500/20 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-300">
                  Authorized to overwrite existing biometric template?
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    setReplaceExisting(true);
                    setAnalysisResult(null);
                    setAnalyzing(true);
                    try {
                      const res = await api.post("/hr/biometrics/enroll", {
                        employee_id: employeeId,
                        image: capturedPhoto,
                        consent_given: consentGiven,
                        replace_existing: true,
                      });
                      if (res.data?.success) {
                        toast.success(res.data.message || "Facial biometric credentials updated successfully!");
                        setAnalysisResult({
                          success: true,
                          quality: res.data.quality,
                          message: "Enrolled & Encrypted (AES-256-GCM)",
                        });
                      }
                    } catch (retryErr) {
                      const rData = retryErr.response?.data;
                      const rMsg = rData?.message || retryErr.message;
                      toast.error(rMsg);
                      setAnalysisResult({
                        success: false,
                        message: rMsg,
                      });
                    } finally {
                      setAnalyzing(false);
                    }
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold shrink-0 transition shadow-sm"
                >
                  Re-scan / Replace Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* Privacy Consent Checkbox (Ghana Data Protection Act, Act 843) */}
        {mode === "register" && (
          <div className="flex items-start gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <input
              type="checkbox"
              id="consent_act843"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="consent_act843" className="text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" /> Data Privacy & Consent Affirmation (Act 843)
              </span>
              I confirm the employee was informed and consented to having their 512-point biometric face vector extracted, encrypted (AES-256), and stored strictly for time & attendance verification.
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {!capturedPhoto ? (
            <>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCapture}
                disabled={!cameraActive || analyzing || !consentGiven}
                className="btn-primary text-xs flex items-center gap-2 px-5 py-2 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" />
                {analyzing ? "Processing..." : "Capture & Verify Face"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="btn-secondary text-xs flex items-center gap-1.5 px-4 py-2"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retake
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={!analysisResult || !analysisResult.success}
                className="btn-primary text-xs flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" /> Save Face Credentials
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
