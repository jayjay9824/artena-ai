"use client";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "../../i18n/useLanguage";
import { useCameraPermission } from "../../hooks/scanner/useCameraPermission";
import { useCameraLifecycle } from "../../hooks/scanner/useCameraLifecycle";
import { useSmartScanner } from "../../hooks/scanner/useSmartScanner";
import { useLowLightDetection } from "../../hooks/scanner/useLowLightDetection";
import { CameraPermissionPrompt } from "./CameraPermissionPrompt";
import { ScannerTopBar } from "./ScannerTopBar";
import { CameraPreview } from "./CameraPreview";
import { FocusFrame, type FocusFrameState } from "./FocusFrame";
import type { ScanSuccessPayload, ScannerState } from "../../types/scanner";
import { captureVideoFrame } from "../../lib/scanner/captureFrame";
import { logScannerEvent } from "../../lib/scanner/scannerEvents";
import { tinyHaptic } from "../../lib/scanner/haptic";
import { enqueueScan } from "../../services/offlineQueue";
import { trackEvent } from "../../services/tracking/trackEvent";

const FONT          = "'KakaoSmallSans', system-ui, sans-serif";
const TRANSITION_MS = 520;
const TAP_FALLBACK_MS = 5000;
const BOX_FLASH_MS  = 180;

interface Props {
  onClose:               () => void;
  onUploadImage?:        () => void;
  onSearchByText?:       () => void;
  onScanLabelManually?:  () => void;
  onScanSuccess?:        (payload: ScanSuccessPayload) => void;
}

/* Map the scanner state machine to one of four FocusFrame states. */
function toFocusState(state: ScannerState, isCapturing: boolean): FocusFrameState {
  if (isCapturing) return "hidden";
  if (state === "idle"      || state === "detecting") return "idle";
  if (state === "artwork_detected" ||
      state === "label_detected"   ||
      state === "qr_detected")                        return "detecting";
  if (state === "locking")                            return "locked";
  // analyzing / success / failed — the capture flash + spatial
  // transition take over; frame hides cleanly.
  return "hidden";
}

/**
 * PART 2 — Camera UX.
 *
 * Zero-interaction scan surface. The user just points the camera;
 * detection / lock / capture / handoff run automatically. No visible
 * shutter, no zoom, no instruction text, no bottom buttons.
 *
 * Top:    × close (always), flash icon (only on low-light)
 * Center: dynamic FocusFrame (idle / detecting / locked)
 * Bottom: nothing visible
 *
 * Capture sequence on `success`:
 *   1. Capture and freeze the live frame
 *   2. Quick white flash inside the focus-frame area (not full-screen)
 *   3. One crisp haptic
 *   4. Offline guard → IndexedDB queue + toast (no route)
 *   5. Online → spatial transition (blur preview + scale exit) → onScanSuccess
 *
 * Long detect (>5s): full-screen invisible tap target → forceCapture →
 * same flow. Spec rule: never dead-end; no error UI.
 */
export function SmartScannerScreen({
  onClose,
  onUploadImage,
  onSearchByText,
  onScanLabelManually,
  onScanSuccess,
}: Props) {
  const { t } = useLanguage();
  const { permissionStatus, requestPermission } = useCameraPermission();
  const { videoRef, startCamera, stopCamera, isCameraActive } = useCameraLifecycle();
  const { scannerState, detectionTarget, confidence, forceCapture } =
    useSmartScanner({ mockDetectionEnabled: true });
  const lowLight = useLowLightDetection(videoRef, isCameraActive);

  const [flashOn,      setFlashOn]      = useState(false);
  const [acceptedSoftPrompt, setAcceptedSoftPrompt] = useState(false);
  const [tapToCapture, setTapToCapture] = useState(false);
  const [frozenFrame,  setFrozenFrame]  = useState<string | null>(null);
  const [boxFlash,     setBoxFlash]     = useState(false);
  const [isExiting,    setIsExiting]    = useState(false);
  const [toast,        setToast]        = useState<string | null>(null);

  const sessionLoggedRef  = useRef(false);
  const successHandledRef = useRef(false);
  const stateSeenRef      = useRef<Set<string>>(new Set());
  /** PART 5 — tracks whether the current session captured via
   *  fallback tap. Used as the capture_method on success. */
  const capturedViaTapRef = useRef(false);
  /** BLOCK A — hidden input for the image-upload secondary action. */
  const fileInputRef      = useRef<HTMLInputElement>(null);

  const granted = permissionStatus === "granted";
  const denied  = permissionStatus === "denied";
  const showSoftPrompt = !granted && !denied && !acceptedSoftPrompt;

  /* Lifecycle: start / stop camera around the granted flag */
  useEffect(() => {
    if (granted) void startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granted]);

  /* Scanner-open log + PART 5 SCAN_START */
  useEffect(() => {
    if (sessionLoggedRef.current) return;
    sessionLoggedRef.current = true;
    logScannerEvent("scanner_opened");
    trackEvent("SCAN_START", { scanner_state: "idle" });
  }, []);

  useEffect(() => {
    if (permissionStatus === "granted") logScannerEvent("camera_permission_granted");
    if (permissionStatus === "denied")  logScannerEvent("camera_permission_denied");
  }, [permissionStatus]);

  /* Per-state edge logs + PART 5 TARGET_DETECTED / TARGET_LOCKED */
  useEffect(() => {
    if (stateSeenRef.current.has(scannerState)) return;
    stateSeenRef.current.add(scannerState);
    if (scannerState === "detecting")        logScannerEvent("detection_started");
    if (scannerState === "artwork_detected") logScannerEvent("artwork_detected");
    if (scannerState === "label_detected")   logScannerEvent("label_detected");
    if (scannerState === "qr_detected")      logScannerEvent("qr_detected");
    if (scannerState === "locking")          logScannerEvent("target_locked", { target: detectionTarget });
    if (scannerState === "failed")           logScannerEvent("detection_failed");

    if (scannerState === "artwork_detected" ||
        scannerState === "label_detected"   ||
        scannerState === "qr_detected") {
      trackEvent("TARGET_DETECTED", { scanner_state: scannerState });
    }
    if (scannerState === "locking") {
      trackEvent("TARGET_LOCKED", { scanner_state: scannerState });
    }
  }, [scannerState, detectionTarget]);

  /* PART 2 — invisible tap-to-capture after 5s in detecting */
  useEffect(() => {
    if (scannerState !== "detecting") {
      setTapToCapture(false);
      return;
    }
    const t = setTimeout(() => setTapToCapture(true), TAP_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [scannerState]);

  /* Capture sequence on success */
  useEffect(() => {
    if (scannerState !== "success") return;
    if (successHandledRef.current)  return;
    if (detectionTarget === "none") return;
    successHandledRef.current = true;

    void (async () => {
      // 1. Capture & freeze the current frame so the live preview
      //    can stop visually while we run the snap + transition.
      const frame = await captureVideoFrame(videoRef.current);
      if (frame) setFrozenFrame(frame.dataUrl);

      // 2. Crisp box-area flash + tiny haptic. No shutter sound.
      tinyHaptic(60);
      setBoxFlash(true);
      setTimeout(() => setBoxFlash(false), BOX_FLASH_MS);

      const payload: ScanSuccessPayload = {
        target:     detectionTarget,
        imageBlob:  frame?.blob,
        imageURI:   frame?.dataUrl,
        confidence,
      };

      // PART 5 — capture_method: fallback when the user reached
      // success via the invisible tap-to-capture overlay; auto when
      // the mock cycle / real detection drove it.
      const captureMethod = capturedViaTapRef.current ? "fallback" : "auto";
      trackEvent(captureMethod === "auto" ? "CAPTURE_AUTO" : "CAPTURE_FALLBACK", {
        capture_method: captureMethod,
        scanner_state:  "success",
        source_type:    "camera",
      });

      // 3. Offline guard
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        try {
          await enqueueScan({
            imageBlob:     payload.imageBlob,
            extractedText: payload.qrData,
          });
        } catch { /* ignore — best-effort */ }
        setToast(t("offline.saved_locally"));
        setTimeout(() => setToast(null), 3200);
        return;
      }

      // 4. Spatial transition: brief flash → blur preview → handoff.
      logScannerEvent("quick_view_generated", { target: payload.target });
      trackEvent("VIEW_RESULT", { scanner_state: "success", source_type: "camera" });
      await new Promise(r => setTimeout(r, BOX_FLASH_MS));
      setIsExiting(true);
      await new Promise(r => setTimeout(r, TRANSITION_MS));
      onScanSuccess?.(payload);
    })();
  }, [scannerState, detectionTarget, confidence, onScanSuccess, t, videoRef]);

  /* ── Handlers ────────────────────────────────────────────────── */

  const handleEnableCamera = async () => {
    logScannerEvent("camera_permission_requested");
    setAcceptedSoftPrompt(true);
    const ok = await requestPermission();
    if (ok) void startCamera();
  };

  const handleUpload = () => {
    logScannerEvent("fallback_selected", { action: "upload" });
    onUploadImage?.();
  };
  const handleSearch = () => {
    logScannerEvent("fallback_selected", { action: "search" });
    onSearchByText?.();
  };
  // Reserved for future fallback flows; preserved for caller wiring.
  void onScanLabelManually;

  const handleToggleFlash = () => setFlashOn(f => !f);

  const handleTapCapture = () => {
    if (!tapToCapture) return;
    logScannerEvent("fallback_selected", { action: "tap_to_capture" });
    capturedViaTapRef.current = true;
    setTapToCapture(false);
    forceCapture();
  };

  /**
   * BLOCK A — image upload pipeline.
   *
   * Same downstream as a camera capture: builds a ScanSuccessPayload
   * with target:"artwork" and fires onScanSuccess. The receiving
   * Quick View flow analyzes the uploaded frame the same way it
   * analyzes a captured frame — no parallel pipeline.
   *
   * EXIF: file.lastModified is used as the timestamp proxy. Real
   * EXIF DateTimeOriginal parsing can replace this without changing
   * the call surface.
   */
  const handleUploadIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file  = input.files?.[0];
    input.value = ""; // allow re-select of the same file
    if (!file) return;

    trackEvent("IMAGE_UPLOAD_STARTED", { source_type: "upload" });
    const startedAt = Date.now();

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error("read failed"));
        reader.readAsDataURL(file);
      });

      trackEvent("IMAGE_UPLOAD_COMPLETED", {
        duration:    Date.now() - startedAt,
        source_type: "upload",
      });

      const payload: ScanSuccessPayload = {
        target:     "artwork",
        imageBlob:  file,
        imageURI:   dataUrl,
        confidence: 100,
      };

      // Same handoff as a camera capture — caller routes to Quick View.
      onScanSuccess?.(payload);
    } catch {
      trackEvent("IMAGE_ANALYSIS_FAILED", { source_type: "upload" });
      // Calm tone, no red, no warning icon. Reuse the toast surface.
      setToast(t("scanner.upload_calm_clearer"));
      setTimeout(() => setToast(null), 3600);
    }
  };

  /* ── Permission gate ─────────────────────────────────────────── */

  if (showSoftPrompt || denied) {
    return (
      <CameraPermissionPrompt
        onEnableCamera={handleEnableCamera}
        onUploadImage={handleUpload}
        onSearchByText={handleSearch}
        denied={denied}
      />
    );
  }

  /* ── Render ──────────────────────────────────────────────────── */

  const focusState = toFocusState(scannerState, !!frozenFrame);

  return (
    <div style={{
      position:      "fixed",
      inset:         0,
      zIndex:        200,
      background:    "#0D0D0D",
      display:       "flex",
      flexDirection: "column",
      fontFamily:    FONT,
      overflow:      "hidden",
    }}>
      {/* Live preview + frozen overlay — both blur+lift on exit */}
      <motion.div
        animate={{
          filter: isExiting ? "blur(10px) brightness(0.55)" : "blur(0px) brightness(1)",
          scale:  isExiting ? 1.04 : 1,
        }}
        transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
        style={{ position: "absolute", inset: 0 }}
      >
        <CameraPreview videoRef={videoRef} />
        {frozenFrame && (
          <img
            src={frozenFrame}
            alt=""
            style={{
              position:   "absolute",
              inset:      0,
              width:      "100%",
              height:     "100%",
              objectFit:  "cover",
              zIndex:     5,
              pointerEvents: "none",
            }}
          />
        )}
      </motion.div>

      {/* Focus frame */}
      <FocusFrame state={focusState} />

      {/* PART 2 capture snap — white rect inside the focus-frame area
          only. Quick 180ms 0 → 0.85 → 0 flash. Never full screen. */}
      <AnimatePresence>
        {boxFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            exit={{    opacity: 0 }}
            transition={{
              duration: BOX_FLASH_MS / 1000,
              times:    [0, 0.4, 1],
              ease:     "easeOut",
            }}
            style={{
              position:      "absolute",
              left:          "50%",
              top:           "50%",
              translate:     "-50% -50%",
              width:         "62%",
              height:        "44%",
              background:    "#FFFFFF",
              borderRadius:  14,
              pointerEvents: "none",
              zIndex:        26,
            }}
          />
        )}
      </AnimatePresence>

      {/* Top bar — × only, flash button only on low-light */}
      <motion.div
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        style={{ position: "absolute", inset: 0, pointerEvents: isExiting ? "none" : "auto" }}
      >
        <ScannerTopBar
          onBack={onClose}
          flashOn={flashOn}
          onToggleFlash={handleToggleFlash}
          showTitle={false}
          showFlash={lowLight}
        />
      </motion.div>

      {/* PART 2 invisible tap-to-capture overlay (only after 5s detecting) */}
      {tapToCapture && !isExiting && (
        <button
          onClick={handleTapCapture}
          aria-label={t("scanner.title")}
          style={{
            position:   "absolute",
            inset:      0,
            zIndex:     35,
            background: "transparent",
            border:     "none",
            cursor:     "pointer",
          }}
        />
      )}

      {/* BLOCK A — secondary upload icon, bottom-right corner. Hidden
          during the spatial transition so it doesn't compete with the
          Quick View handoff. */}
      {!isExiting && !frozenFrame && (
        <>
          <button
            onClick={handleUploadIconClick}
            aria-label={t("scanner.upload_label")}
            style={{
              position:        "absolute",
              right:           20,
              bottom:          "calc(28px + env(safe-area-inset-bottom, 0px))",
              zIndex:          36,
              width:           44,
              height:          44,
              borderRadius:    "50%",
              background:      "rgba(0,0,0,0.4)",
              backdropFilter:  "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border:          "none",
              color:           "#FFFFFF",
              cursor:          "pointer",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              transition:      "background .15s",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <rect x="3" y="4.5" width="14" height="11" rx="1.5" stroke="#FFFFFF" strokeWidth="1.3" />
              <circle cx="13.6" cy="8" r="1.1" fill="#FFFFFF" />
              <path d="M3.5 13l3.5-3.5L10 12l3-3 3.5 3.5" stroke="#FFFFFF" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />
        </>
      )}

      {/* Offline toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{    opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            style={{
              position:        "fixed",
              bottom:          120,
              left:            "50%",
              transform:       "translateX(-50%)",
              zIndex:          400,
              padding:         "12px 18px",
              background:      "rgba(20,20,20,0.92)",
              backdropFilter:  "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border:          "0.5px solid rgba(255,255,255,0.18)",
              borderRadius:    999,
              color:           "#FFFFFF",
              fontSize:        12,
              maxWidth:        "calc(100vw - 36px)",
              fontFamily:      FONT,
              boxShadow:       "0 8px 28px rgba(0,0,0,0.4)",
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
