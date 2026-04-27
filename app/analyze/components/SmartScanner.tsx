"use client";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trackEvent } from "../lib/analytics";
import { useSmartScanner } from "../scanner/useSmartScanner";
import type {
  Detection,
  DetectionTarget,
  ScannerState,
} from "../scanner/types";

/* ── Re-export types so callers can stay on a single import path ────── */

export type { DetectionTarget, ScannerState } from "../scanner/types";

export interface SmartScannerProps {
  onClose:        () => void;
  onCapture:      (file: File, dataUrl: string) => void;
  onUpload:       () => void;
  onManualSearch: () => void;
  /** Toggle the scripted mock detection. Default true while no real CV is wired. */
  mockDetectionEnabled?: boolean;
}

/* ── Spec copy — verbatim ───────────────────────────────────────────── */

const STATE_COPY: Record<ScannerState, { primary: string; sub: string }> = {
  idle:             { primary: "Point at artwork, label, or QR", sub: "ARTENA reads QR · label · artwork in real time" },
  artwork_detected: { primary: "Artwork detected",               sub: "Hold steady to analyze image and style" },
  label_detected:   { primary: "Label detected",                 sub: "Reading artist, title, year, and medium" },
  qr_detected:      { primary: "QR detected",                    sub: "Extracting artwork and exhibition data" },
  analyzing:        { primary: "Analyzing context",              sub: "Connecting artwork, exhibition, and market data" },
  success:          { primary: "Analyzing context",              sub: "Connecting artwork, exhibition, and market data" },
  failed:           { primary: "Couldn't recognize the target",  sub: "Try artwork photo, label scan, or manual search" },
};

/* ── Per-target visuals ─────────────────────────────────────────────── */

interface TargetStyle {
  border:     string;
  pillBg:     string;
  pillBorder: string;
  pillText:   string;
  glow:       string;
  label:      string;
}

const TARGET_STYLES: Record<Exclude<DetectionTarget, "none">, TargetStyle> = {
  qr: {
    border:     "#007AFF",
    pillBg:     "rgba(0,122,255,0.92)",
    pillBorder: "rgba(72,125,255,0.6)",
    pillText:   "#fff",
    glow:       "rgba(0,122,255,0.20)",
    label:      "QR",
  },
  artwork: {
    border:     "#FFFFFF",
    pillBg:     "rgba(8,8,18,0.78)",
    pillBorder: "rgba(255,255,255,0.32)",
    pillText:   "#fff",
    glow:       "rgba(255,255,255,0.10)",
    label:      "Artwork",
  },
  label: {
    border:     "#B8C0CC",
    pillBg:     "rgba(28,28,32,0.78)",
    pillBorder: "rgba(184,192,204,0.36)",
    pillText:   "#fff",
    glow:       "rgba(184,192,204,0.10)",
    label:      "Label",
  },
};

/* ── Inline icons ───────────────────────────────────────────────────── */

function IcoArrowLeft({ size = 20, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M13 4l-6 6 6 6" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoZap({ size = 18, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <path d="M11 2L4 12h7l-2 6 9-10H11l2-6z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IcoUpload({ size = 16, color = "rgba(255,255,255,0.75)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13V5M7 8l3-3 3 3" />
      <path d="M3 15v2h14v-2" />
    </svg>
  );
}

function IcoSearch({ size = 16, color = "rgba(255,255,255,0.75)" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round">
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M15 15l3 3" />
    </svg>
  );
}

function IcoFileText({ size = 13, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H5a1 1 0 00-1 1v14a1 1 0 001 1h10a1 1 0 001-1V7l-4-5z" />
      <path d="M12 2v5h4" />
      <line x1="7" y1="11" x2="13" y2="11" />
      <line x1="7" y1="14" x2="10" y2="14" />
    </svg>
  );
}

/* ── Bounding box ───────────────────────────────────────────────────── */

interface BoundingBoxProps {
  d: Detection;
  isPrimary: boolean;
  isLocked:  boolean;
}

function BoundingBox({ d, isPrimary, isLocked }: BoundingBoxProps) {
  const s = TARGET_STYLES[d.target];
  const conf = (d.confidence * 100).toFixed(1);
  const opacity = isLocked ? 1 : isPrimary ? 0.95 : 0.6;

  return (
    <motion.div
      layoutId={`bbox-${d.id}`}
      initial={false}
      animate={{
        left:   `${d.x}%`,
        top:    `${d.y}%`,
        width:  `${d.w}%`,
        height: `${d.h}%`,
        // Snap from 1.02 → 1.00 on lock (spec). Tracking primary stays at 1.0.
        scale:  isLocked ? [1.02, 1.0] : 1.0,
        opacity,
      }}
      transition={{
        // Locked snap uses a keyframed scale; box position uses a tight spring.
        type: "spring",
        stiffness: isLocked ? 360 : 220,
        damping:   isLocked ? 28  : 30,
        mass:      0.6,
        scale: isLocked
          ? { duration: 0.32, times: [0, 1], ease: "easeOut" }
          : { duration: 0.18, ease: "easeOut" },
      }}
      style={{
        position: "absolute",
        border: `${isLocked ? 1.6 : 1.2}px solid ${s.border}`,
        borderRadius: 12,
        boxShadow: isPrimary
          ? `0 0 0 3px ${s.glow}, 0 0 24px ${s.glow}`
          : undefined,
        pointerEvents: "none",
      }}
    >
      {/* Lock pulse — emits once when isLocked first becomes true */}
      {isLocked && (
        <motion.div
          initial={{ opacity: 0.65, scale: 1, borderRadius: 12 }}
          animate={{ opacity: 0,    scale: 1.18, borderRadius: 12 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: -2,
            border: `1.4px solid ${s.border}`,
            borderRadius: 12,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Confidence pill */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{
          position: "absolute",
          left: 0,
          top: -28,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: s.pillBg,
          border: `0.5px solid ${s.pillBorder}`,
          borderRadius: 12,
          padding: "3px 9px 3px 8px",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: s.border,
          boxShadow: isPrimary ? `0 0 6px ${s.border}` : "none",
        }} />
        <span style={{
          color: s.pillText, fontSize: 10.5, fontWeight: 600,
          letterSpacing: ".04em",
          fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          fontVariantNumeric: "tabular-nums",
        }}>
          {s.label} detected {conf}%
        </span>
      </motion.div>

      {/* Sweep line during analyzing */}
      {isLocked && (
        <SweepLine color={s.border} />
      )}
    </motion.div>
  );
}

function SweepLine({ color }: { color: string }) {
  return (
    <div style={{
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      borderRadius: 12,
      pointerEvents: "none",
    }}>
      <motion.div
        initial={{ y: "-10%" }}
        animate={{ y: "110%" }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute", left: 0, right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          opacity: 0.85,
        }}
      />
    </div>
  );
}

/* ── Center reticle (idle, no detections yet) ───────────────────────── */

function CenterReticle({ visible }: { visible: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      style={{
        position: "absolute",
        left: "50%", top: "50%",
        width: 220, height: 260,
        marginLeft: -110, marginTop: -130,
        pointerEvents: "none",
      }}
    >
      {[
        { top: 0, left: 0, bt: 1, bl: 1 },
        { top: 0, right: 0, bt: 1, brW: 1 },
        { bottom: 0, left: 0, bb: 1, bl: 1 },
        { bottom: 0, right: 0, bb: 1, brW: 1 },
      ].map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: c.top, bottom: c.bottom, left: c.left, right: c.right,
            width: 22, height: 22,
            borderTop:    c.bt   ? "1.4px solid rgba(255,255,255,0.45)" : undefined,
            borderBottom: c.bb   ? "1.4px solid rgba(255,255,255,0.45)" : undefined,
            borderLeft:   c.bl   ? "1.4px solid rgba(255,255,255,0.45)" : undefined,
            borderRight:  c.brW  ? "1.4px solid rgba(255,255,255,0.45)" : undefined,
          }}
        />
      ))}
    </motion.div>
  );
}

/* ── Permission denied ──────────────────────────────────────────────── */

const glassBtnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
  background: "rgba(255,255,255,0.09)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "0.5px solid rgba(255,255,255,0.16)",
  borderRadius: 12, padding: "12px 8px",
  color: "rgba(255,255,255,0.72)", fontSize: 13, letterSpacing: ".04em",
  cursor: "pointer", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
};

const fallbackBtnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  background: "rgba(255,255,255,0.06)",
  border: "0.5px solid rgba(255,255,255,0.13)",
  borderRadius: 10, padding: "10px 8px",
  color: "rgba(255,255,255,0.65)", fontSize: 12, letterSpacing: ".04em",
  cursor: "pointer", fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
};

function PermissionDenied({ onUpload, onManualSearch }: { onUpload: () => void; onManualSearch: () => void }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "0 40px", textAlign: "center",
    }}>
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ marginBottom: 20 }}>
        <circle cx="26" cy="26" r="23" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <rect x="14" y="19" width="24" height="17" rx="3" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
        <circle cx="26" cy="27.5" r="4.5" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
        <line x1="9" y1="43" x2="43" y2="9" stroke="rgba(220,80,80,0.55)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <p style={{ color: "#fff", fontSize: 16, fontWeight: 500, marginBottom: 8, letterSpacing: ".02em" }}>
        Camera Access Required
      </p>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12.5, lineHeight: 1.7, marginBottom: 30 }}>
        Camera access is needed to scan artwork,{"\n"}labels, or QR codes.
      </p>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 9 }}>
        <button onClick={onUpload} style={{
          ...glassBtnStyle, flex: "none",
          width: "100%", padding: "13px 16px", justifyContent: "center",
        }}>
          <IcoUpload />
          <span>Upload Image Instead</span>
        </button>
        <button onClick={onManualSearch} style={{
          ...glassBtnStyle, flex: "none",
          width: "100%", padding: "13px 16px", justifyContent: "center",
          background: "transparent", border: "0.5px solid rgba(255,255,255,0.10)",
          color: "rgba(255,255,255,0.48)",
        }}>
          <IcoSearch color="rgba(255,255,255,0.48)" />
          <span>Manual Search</span>
        </button>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────── */

export function SmartScanner({
  onClose,
  onCapture,
  onUpload,
  onManualSearch,
  mockDetectionEnabled = true,
}: SmartScannerProps) {
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const capturedFileRef = useRef<File | null>(null);

  /** Captures the current video frame. Called when the hook reaches success. */
  const handleSuccess = useCallback((target: Exclude<DetectionTarget, "none">, locked: Detection) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    fetch(dataUrl)
      .then(r => r.blob())
      .then(blob => {
        capturedFileRef.current = new File([blob], "scan.jpg", { type: "image/jpeg" });
      })
      .catch(() => { /* ignore — we still have dataUrl */ });

    setCapturedDataUrl(dataUrl);

    trackEvent("scan_succeeded", {
      kind: target,
      confidence: Math.round(locked.confidence * 100),
    });
  }, []);

  const {
    cameraStatus,
    scanState,
    detections,
    primary,
    analyzeLabel,
    flashOn,
    videoRef,
    retry,
    toggleFlash,
  } = useSmartScanner({
    mockDetectionEnabled,
    onSuccess: handleSuccess,
    failTimeoutMs: 3000,
  });

  /* ── Track scan_started once on mount, scan_failed on failure ─────── */

  React.useEffect(() => {
    trackEvent("scan_started", { surface: "camera" });
  }, []);

  React.useEffect(() => {
    if (scanState === "failed") {
      trackEvent("scan_failed", { reason: "no_lock" });
    }
  }, [scanState]);

  /* ── Spatial zoom finalize ────────────────────────────────────────── */

  const onZoomComplete = useCallback(() => {
    const file = capturedFileRef.current;
    if (file && capturedDataUrl) onCapture(file, capturedDataUrl);
  }, [onCapture, capturedDataUrl]);

  /* ── Derived UI flags ─────────────────────────────────────────────── */

  const isDenied  = cameraStatus === "denied";
  const isPending = cameraStatus === "pending";
  const isFailed  = scanState === "failed";
  const isLockedState =
    scanState === "qr_detected" ||
    scanState === "label_detected" ||
    scanState === "artwork_detected" ||
    scanState === "analyzing" ||
    scanState === "success";

  const copy = STATE_COPY[scanState];
  const subText = scanState === "analyzing" || scanState === "success"
    ? analyzeLabel
    : copy.sub;

  /* ── Show fallback panel after a brief delay on failure ──────────── */

  const [showFailHint, setShowFailHint] = useState(false);
  React.useEffect(() => {
    if (!isFailed) { setShowFailHint(false); return; }
    const t = setTimeout(() => setShowFailHint(true), 2000);
    return () => clearTimeout(t);
  }, [isFailed]);

  /* ── Spatial zoom origin (relative to viewport) ───────────────────── */

  const zoomOrigin = useMemo(() => {
    if (!primary) return null;
    return {
      left:   `${primary.x}%`,
      top:    `${primary.y}%`,
      width:  `${primary.w}%`,
      height: `${primary.h}%`,
    };
  }, [primary]);

  return (
    <div style={{
      position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 640, height: "100dvh",
      background: "#040408",
      zIndex: 200,
      display: "flex", flexDirection: "column",
      fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Camera feed — blurs on success */}
      <motion.video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        playsInline muted autoPlay
        animate={{
          opacity: cameraStatus === "ready" ? 1 : 0,
          filter:  scanState === "success" ? "blur(12px)" : "blur(0px)",
        }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Dim overlay */}
      <motion.div
        animate={{
          backgroundColor:
            scanState === "success"   ? "rgba(0,0,0,0.55)"
          : isLockedState             ? "rgba(0,0,0,0.42)"
          :                             "rgba(0,0,0,0.32)",
        }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        style={{
          position: "absolute", inset: 0,
          pointerEvents: "none",
        }}
      />

      {/* ── Detection layer ─────────────────────────────────────────── */}
      {!isDenied && !isPending && (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none" }}>
          {/* Center reticle when no detections yet */}
          <CenterReticle visible={scanState === "idle" && detections.length === 0} />

          {/* Boxes — hidden during success (zoom layer takes over) */}
          {scanState !== "success" && detections.map(d => (
            <BoundingBox
              key={d.id}
              d={d}
              isPrimary={primary?.id === d.id}
              isLocked={isLockedState && primary?.id === d.id}
            />
          ))}
        </div>
      )}

      {/* ── Spatial zoom layer ──────────────────────────────────────── */}
      <AnimatePresence>
        {scanState === "success" && capturedDataUrl && zoomOrigin && (
          <motion.div
            key="zoom"
            initial={{
              left: zoomOrigin.left, top: zoomOrigin.top,
              width: zoomOrigin.width, height: zoomOrigin.height,
              borderRadius: 12, opacity: 1,
            }}
            animate={{
              left: "0%", top: "0%",
              width: "100%", height: "100%",
              borderRadius: 0, opacity: 1,
            }}
            transition={{ duration: 0.6, ease: [0.4, 0.0, 0.2, 1] }}
            onAnimationComplete={onZoomComplete}
            style={{
              position: "absolute",
              overflow: "hidden",
              zIndex: 30,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            <img
              src={capturedDataUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "52px 20px 14px",
      }}>
        <button onClick={onClose} style={{
          width: 38, height: 38,
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          border: "0.5px solid rgba(255,255,255,0.18)",
          borderRadius: "50%", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IcoArrowLeft size={18} />
        </button>

        <a
          href="/"
          style={{
            fontSize: 13, letterSpacing: ".11em", color: "rgba(255,255,255,0.88)",
            fontWeight: 500, textDecoration: "none",
          }}
        >
          ARTENA Scanner
        </a>

        <button onClick={toggleFlash} style={{
          width: 38, height: 38,
          background: flashOn ? "rgba(255,215,50,0.15)" : "rgba(255,255,255,0.10)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
          border: `0.5px solid ${flashOn ? "rgba(255,215,50,0.35)" : "rgba(255,255,255,0.18)"}`,
          borderRadius: "50%", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IcoZap size={17} color={flashOn ? "#FFD93A" : "rgba(255,255,255,0.65)"} />
        </button>
      </div>

      {/* ── Center fill ────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        pointerEvents: "none",
      }}>
        {isPending && (
          <div style={{ textAlign: "center", pointerEvents: "auto" }}>
            <div style={{
              width: 34, height: 34,
              border: "1.5px solid rgba(255,255,255,0.2)",
              borderTop: "1.5px solid rgba(255,255,255,0.75)",
              borderRadius: "50%", animation: "spin 1s linear infinite",
              margin: "0 auto 18px",
            }} />
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, letterSpacing: ".05em" }}>
              Requesting camera access
            </p>
          </div>
        )}

        {isDenied && (
          <div style={{ width: "100%", pointerEvents: "auto" }}>
            <PermissionDenied onUpload={onUpload} onManualSearch={onManualSearch} />
          </div>
        )}

        {isFailed && (
          <motion.button
            onClick={retry}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
            style={{
              pointerEvents: "auto",
              padding: "12px 22px",
              background: "rgba(255,255,255,0.10)",
              border: "0.5px solid rgba(255,255,255,0.20)",
              borderRadius: 10,
              color: "#fff", fontSize: 12, letterSpacing: ".10em",
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
              cursor: "pointer",
            }}
          >
            TAP TO RETRY
          </motion.button>
        )}
      </div>

      {/* ── Bottom bar ─────────────────────────────────────────────── */}
      {!isDenied && (
        <div style={{
          position: "relative", zIndex: 10,
          padding: "0 22px 44px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <div style={{ textAlign: "center", marginBottom: 2, minHeight: 44 }}>
            <motion.p
              key={`primary-${scanState}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                color: "#fff", fontSize: 15.5, fontWeight: 500,
                letterSpacing: ".025em", marginBottom: 5,
              }}
            >
              {copy.primary}
            </motion.p>
            <motion.p
              key={`sub-${subText}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.22 }}
              style={{
                color: "rgba(255,255,255,0.48)", fontSize: 12.5,
                letterSpacing: ".03em", lineHeight: 1.55,
              }}
            >
              {subText}
            </motion.p>
          </div>

          {/* Failure fallback panel */}
          <AnimatePresence>
            {isFailed && showFailHint && (
              <motion.div
                key="fail-panel"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32 }}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
                  border: "0.5px solid rgba(255,255,255,0.10)",
                  borderRadius: 14, padding: "13px 14px",
                }}
              >
                <p style={{
                  color: "rgba(255,255,255,0.38)", fontSize: 10,
                  letterSpacing: ".12em", textAlign: "center", marginBottom: 9,
                }}>
                  NOT WORKING?
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={onUpload} style={fallbackBtnStyle}>
                    <IcoUpload size={13} color="rgba(255,255,255,0.6)" />
                    <span>Upload Image</span>
                  </button>
                  <button onClick={retry} style={fallbackBtnStyle}>
                    <IcoFileText size={13} color="rgba(255,255,255,0.6)" />
                    <span>Try Again</span>
                  </button>
                  <button onClick={onManualSearch} style={fallbackBtnStyle}>
                    <IcoSearch size={13} color="rgba(255,255,255,0.6)" />
                    <span>Manual Search</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Default actions while idle */}
          {scanState === "idle" && (
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button onClick={onUpload} style={glassBtnStyle}>
                <IcoUpload />
                <span>Upload</span>
              </button>
              <button onClick={onManualSearch} style={glassBtnStyle}>
                <IcoSearch />
                <span>Manual Search</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
