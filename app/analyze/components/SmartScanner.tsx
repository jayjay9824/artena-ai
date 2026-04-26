"use client";
import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { trackEvent } from "../lib/analytics";

/* ── Types ──────────────────────────────────────────────────────────── */

export type DetectionKind = "qr" | "artwork" | "text";

export interface Detection {
  id: string;
  kind: DetectionKind;
  /** Bounding box in percent of viewport (0–100) */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Confidence 0–1 */
  confidence: number;
}

export type ScannerState =
  | "permission_pending"
  | "permission_denied"
  | "scanning"
  | "locked"
  | "analyzing"
  | "failed";

export interface SmartScannerProps {
  onClose: () => void;
  onCapture: (file: File, dataUrl: string) => void;
  onUpload: () => void;
  onManualSearch: () => void;
}

/* ── Visual config per detection kind ───────────────────────────────── */

interface KindStyle {
  border:    string;
  borderStyle: "solid" | "dashed";
  borderWidth: number;
  pillBg:    string;
  pillBorder:string;
  pillText:  string;
  glow:      string;
  label:     string;
  status:    string;
}

const KIND_STYLES: Record<DetectionKind, KindStyle> = {
  qr: {
    border:      "#1856FF",
    borderStyle: "solid",
    borderWidth: 1.6,
    pillBg:      "rgba(24,86,255,0.92)",
    pillBorder:  "rgba(72,125,255,0.6)",
    pillText:    "#fff",
    glow:        "rgba(24,86,255,0.16)",
    label:       "QR",
    status:      "Recognizing QR…",
  },
  artwork: {
    border:      "rgba(255,255,255,0.92)",
    borderStyle: "solid",
    borderWidth: 1.4,
    pillBg:      "rgba(8,8,18,0.78)",
    pillBorder:  "rgba(255,255,255,0.32)",
    pillText:    "#fff",
    glow:        "rgba(255,255,255,0.06)",
    label:       "Artwork",
    status:      "Analyzing artwork…",
  },
  text: {
    border:      "rgba(220,220,220,0.55)",
    borderStyle: "dashed",
    borderWidth: 1,
    pillBg:      "rgba(28,28,32,0.72)",
    pillBorder:  "rgba(220,220,220,0.28)",
    pillText:    "rgba(255,255,255,0.85)",
    glow:        "transparent",
    label:       "Label",
    status:      "Reading label…",
  },
};

/* ── Inline SVG icons ───────────────────────────────────────────────── */

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

/* ── Mock detection script ──────────────────────────────────────────── */
/*
 * Simulates real-time inference. Each tick produces a list of current
 * detections with confidence scores, mimicking a CV pipeline that
 * proposes multiple candidates simultaneously. Replace this generator
 * with real inference output later.
 */

interface DetectionTick {
  /** Time offset from scan start in ms */
  t: number;
  detections: Detection[];
}

const MOCK_TIMELINE: DetectionTick[] = [
  // 0.6s — weak text candidate appears
  {
    t: 600,
    detections: [
      { id: "txt", kind: "text", x: 12, y: 65, w: 38, h: 11, confidence: 0.58 },
    ],
  },
  // 1.2s — artwork enters
  {
    t: 1200,
    detections: [
      { id: "art", kind: "artwork", x: 14, y: 18, w: 58, h: 44, confidence: 0.71 },
      { id: "txt", kind: "text",    x: 12, y: 65, w: 38, h: 11, confidence: 0.65 },
    ],
  },
  // 1.8s — QR appears, dominates
  {
    t: 1800,
    detections: [
      { id: "art", kind: "artwork", x: 14, y: 18, w: 58, h: 44, confidence: 0.78 },
      { id: "txt", kind: "text",    x: 12, y: 65, w: 38, h: 11, confidence: 0.72 },
      { id: "qr",  kind: "qr",      x: 64, y: 58, w: 24, h: 22, confidence: 0.86 },
    ],
  },
  // 2.4s — QR locks
  {
    t: 2400,
    detections: [
      { id: "art", kind: "artwork", x: 14, y: 18, w: 58, h: 44, confidence: 0.81 },
      { id: "txt", kind: "text",    x: 12, y: 65, w: 38, h: 11, confidence: 0.74 },
      { id: "qr",  kind: "qr",      x: 64, y: 58, w: 24, h: 22, confidence: 0.94 },
    ],
  },
];

const LOCK_THRESHOLD   = 0.90;
const FAIL_TIMEOUT_MS  = 6000;
const FAIL_HINT_DELAY  = 2000;

/* ── Bounding Box ──────────────────────────────────────────────────── */

function BoundingBox({ d, primary }: { d: Detection; primary: boolean }) {
  const s = KIND_STYLES[d.kind];
  const pct = (n: number) => `${n}%`;
  const conf = Math.round(d.confidence * 100);

  return (
    <div
      style={{
        position: "absolute",
        left: pct(d.x),
        top: pct(d.y),
        width: pct(d.w),
        height: pct(d.h),
        borderStyle: s.borderStyle,
        borderWidth: s.borderWidth,
        borderColor: s.border,
        borderRadius: 4,
        boxShadow: primary ? `0 0 0 3px ${s.glow}, 0 0 24px ${s.glow}` : undefined,
        transition: "all 220ms ease-out, box-shadow 220ms ease-out",
        pointerEvents: "none",
        opacity: primary ? 1 : 0.62,
      }}
    >
      {/* Confidence pill */}
      <div
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
          animation: "bboxPillIn 220ms ease-out",
        }}
      >
        <span
          style={{
            width: 5, height: 5, borderRadius: "50%",
            background: s.border,
            boxShadow: primary ? `0 0 6px ${s.border}` : "none",
          }}
        />
        <span style={{
          color: s.pillText, fontSize: 10.5, fontWeight: 600,
          letterSpacing: ".04em",
          fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
        }}>
          {s.label} detected ({conf}%)
        </span>
      </div>
    </div>
  );
}

/* ── Center reticle ─────────────────────────────────────────────────── */
/* Subtle full-screen guidance when no detections yet. */

function CenterReticle({ visible }: { visible: boolean }) {
  return (
    <div style={{
      position: "absolute",
      left: "50%", top: "50%",
      transform: "translate(-50%, -50%)",
      width: 220, height: 260,
      pointerEvents: "none",
      opacity: visible ? 1 : 0,
      transition: "opacity 320ms ease-out",
    }}>
      {[
        { top: 0, left: 0, br: "4px 0 0 0",  bt: 1, bl: 1 },
        { top: 0, right: 0, br: "0 4px 0 0", bt: 1, br_w: 1 },
        { bottom: 0, left: 0, br: "0 0 0 4px",  bb: 1, bl: 1 },
        { bottom: 0, right: 0, br: "0 0 4px 0", bb: 1, br_w: 1 },
      ].map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: c.top, bottom: c.bottom, left: c.left, right: c.right,
            width: 22, height: 22,
            borderTop:    c.bt ? "1.4px solid rgba(255,255,255,0.45)" : undefined,
            borderBottom: c.bb ? "1.4px solid rgba(255,255,255,0.45)" : undefined,
            borderLeft:   c.bl ? "1.4px solid rgba(255,255,255,0.45)" : undefined,
            borderRight:  c.br_w ? "1.4px solid rgba(255,255,255,0.45)" : undefined,
            borderRadius: c.br,
          }}
        />
      ))}
    </div>
  );
}

/* ── Lock pulse — emanates from primary box ─────────────────────────── */

function LockPulse({ d }: { d: Detection }) {
  const s = KIND_STYLES[d.kind];
  return (
    <div
      style={{
        position: "absolute",
        left: `${d.x}%`, top: `${d.y}%`,
        width: `${d.w}%`, height: `${d.h}%`,
        borderRadius: 4,
        border: `1.5px solid ${s.border}`,
        animation: "lockPulse 700ms ease-out forwards",
        pointerEvents: "none",
      }}
    />
  );
}

/* ── Permission-denied screen ───────────────────────────────────────── */

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

/* ── Main SmartScanner component ────────────────────────────────────── */

export function SmartScanner({ onClose, onCapture, onUpload, onManualSearch }: SmartScannerProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanStartRef = useRef<number>(0);

  const [scanState,    setScanState]    = useState<ScannerState>("permission_pending");
  const [flashOn,      setFlashOn]      = useState(false);
  const [videoReady,   setVideoReady]   = useState(false);
  const [detections,   setDetections]   = useState<Detection[]>([]);
  const [primaryId,    setPrimaryId]    = useState<string | null>(null);
  const [analyzeLabel, setAnalyzeLabel] = useState("Reading target");
  const [showFailHint, setShowFailHint] = useState(false);

  /* ── Camera init ──────────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setScanState("permission_denied");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        scanStartRef.current = Date.now();
        setScanState("scanning");
        trackEvent("scan_started", { surface: "camera" });
      } catch {
        if (!cancelled) setScanState("permission_denied");
      }
    };

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  /* ── Mock detection timeline ──────────────────────────────────────── */

  useEffect(() => {
    if (scanState !== "scanning") return;
    const timers = MOCK_TIMELINE.map(tick =>
      setTimeout(() => setDetections(tick.detections), tick.t)
    );
    return () => { timers.forEach(clearTimeout); };
  }, [scanState]);

  /* ── Pick primary detection (highest confidence) ──────────────────── */

  const primary = useMemo<Detection | null>(() => {
    if (detections.length === 0) return null;
    return detections.reduce((best, d) => d.confidence > best.confidence ? d : best, detections[0]);
  }, [detections]);

  useEffect(() => {
    setPrimaryId(primary?.id ?? null);
  }, [primary]);

  /* ── Lock when primary crosses threshold ──────────────────────────── */

  useEffect(() => {
    if (scanState !== "scanning" || !primary) return;
    if (primary.confidence >= LOCK_THRESHOLD) {
      setScanState("locked");
    }
  }, [scanState, primary]);

  /* ── Locked → analyzing → capture ─────────────────────────────────── */

  useEffect(() => {
    if (scanState !== "locked") return;
    const t = setTimeout(() => setScanState("analyzing"), 520);
    return () => clearTimeout(t);
  }, [scanState]);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      setScanState("failed");
      return;
    }
    const canvas  = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    try {
      const blob = await fetch(dataUrl).then(r => r.blob());
      const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
      const elapsedMs = scanStartRef.current ? Date.now() - scanStartRef.current : 0;
      const top = primary;
      trackEvent("scan_succeeded", {
        kind: top?.kind ?? "unknown",
        confidence: top ? Math.round(top.confidence * 100) : 0,
        elapsedMs,
      });
      onCapture(file, dataUrl);
    } catch {
      setScanState("failed");
    }
  }, [onCapture, primary]);

  useEffect(() => {
    if (scanState !== "analyzing") return;
    const t = setTimeout(captureFrame, 900);
    return () => clearTimeout(t);
  }, [scanState, captureFrame]);

  /* ── Failure timeout ──────────────────────────────────────────────── */

  useEffect(() => {
    if (scanState !== "scanning") return;
    const t = setTimeout(() => {
      const top = primary?.confidence ?? 0;
      if (top < LOCK_THRESHOLD) {
        setScanState("failed");
        trackEvent("scan_failed", {
          reason: "no_lock",
          topConfidence: Math.round(top * 100),
          elapsedMs: scanStartRef.current ? Date.now() - scanStartRef.current : 0,
        });
      }
    }, FAIL_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [scanState, primary]);

  useEffect(() => {
    if (scanState !== "failed") { setShowFailHint(false); return; }
    const t = setTimeout(() => setShowFailHint(true), FAIL_HINT_DELAY);
    return () => clearTimeout(t);
  }, [scanState]);

  /* ── Analyze label cycle ──────────────────────────────────────────── */

  useEffect(() => {
    if (scanState !== "analyzing") return;
    const labels = ["Reading target", "Extracting data", "Building report"];
    let i = 0;
    setAnalyzeLabel(labels[0]);
    const id = setInterval(() => { i = (i + 1) % labels.length; setAnalyzeLabel(labels[i]); }, 700);
    return () => clearInterval(id);
  }, [scanState]);

  /* ── Flashlight ───────────────────────────────────────────────────── */

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (track as any).applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn(f => !f);
    } catch { /* torch not supported */ }
  }, [flashOn]);

  /* ── Retry on tap ─────────────────────────────────────────────────── */

  const retry = useCallback(() => {
    setDetections([]);
    setPrimaryId(null);
    setShowFailHint(false);
    scanStartRef.current = Date.now();
    setScanState("scanning");
  }, []);

  /* ── Status text — driven by primary detection or scan state ──────── */

  const statusText = useMemo(() => {
    if (scanState === "scanning" && !primary) return "Point at artwork, label, or QR";
    if (scanState === "scanning" && primary)  return KIND_STYLES[primary.kind].status;
    if (scanState === "locked"   && primary)  return `${KIND_STYLES[primary.kind].label} locked`;
    if (scanState === "analyzing")            return analyzeLabel;
    if (scanState === "failed")               return "Couldn't recognize the target";
    return "";
  }, [scanState, primary, analyzeLabel]);

  const subText = useMemo(() => {
    if (scanState === "scanning" && !primary) return "ARTENA reads QR · label · artwork in real time";
    if (scanState === "failed")               return "Try another angle or use a different input";
    return null;
  }, [scanState, primary]);

  /* ── Render ───────────────────────────────────────────────────────── */

  const isPending  = scanState === "permission_pending";
  const isDenied   = scanState === "permission_denied";
  const isFailed   = scanState === "failed";
  const isAnalyz   = scanState === "analyzing";
  const isLocked   = scanState === "locked" || scanState === "analyzing";
  const isActive   = !isPending && !isDenied;

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
        @keyframes bboxPillIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lockPulse {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.15); }
        }
        @keyframes scanSweep {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(2400%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Camera feed */}
      <video
        ref={videoRef}
        playsInline muted autoPlay
        onLoadedMetadata={() => setVideoReady(true)}
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          opacity: videoReady ? 1 : 0,
          transition: "opacity 0.6s ease",
        }}
      />

      {/* Dim overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: isLocked ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.32)",
        transition: "background 0.5s ease",
        pointerEvents: "none",
      }} />

      {/* ── Detection layer ─────────────────────────────────────────── */}
      {isActive && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 5,
          pointerEvents: "none",
        }}>
          {/* Bounding boxes */}
          {detections.map(d => (
            <BoundingBox key={d.id} d={d} primary={d.id === primaryId} />
          ))}

          {/* Lock pulse on primary */}
          {scanState === "locked" && primary && <LockPulse d={primary} />}

          {/* Center reticle when no detections */}
          <CenterReticle visible={scanState === "scanning" && detections.length === 0} />

          {/* Sweep line during analyzing */}
          {isAnalyz && primary && (
            <div style={{
              position: "absolute",
              left: `${primary.x}%`,
              top:  `${primary.y}%`,
              width: `${primary.w}%`,
              height: `${primary.h}%`,
              overflow: "hidden",
              borderRadius: 4,
              pointerEvents: "none",
            }}>
              <div style={{
                position: "absolute", left: 0, right: 0,
                height: 2,
                background: `linear-gradient(90deg, transparent, ${KIND_STYLES[primary.kind].border}, transparent)`,
                animation: "scanSweep 1.4s ease-in-out infinite",
                opacity: 0.85,
              }} />
            </div>
          )}
        </div>
      )}

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

        <span style={{
          fontSize: 13, letterSpacing: ".11em", color: "rgba(255,255,255,0.88)",
          fontWeight: 500,
        }}>
          ARTENA AI Scanner
        </span>

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

      {/* ── Center — only fills space, real action is in detection layer ─ */}
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
          <button
            onClick={retry}
            style={{
              pointerEvents: "auto",
              padding: "12px 22px",
              background: "rgba(255,255,255,0.10)",
              border: "0.5px solid rgba(255,255,255,0.20)",
              borderRadius: 10,
              color: "#fff", fontSize: 12, letterSpacing: ".10em",
              fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
              cursor: "pointer",
              animation: "fadeIn 240ms ease forwards",
            }}
          >
            TAP TO RETRY
          </button>
        )}
      </div>

      {/* ── Bottom ─────────────────────────────────────────────────── */}
      {!isDenied && (
        <div style={{
          position: "relative", zIndex: 10,
          padding: "0 22px 44px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          {/* Status text */}
          <div style={{ textAlign: "center", marginBottom: 2 }}>
            <p style={{
              color: "#fff", fontSize: 15.5, fontWeight: 500,
              letterSpacing: ".025em", marginBottom: 5,
              transition: "color 200ms ease",
            }}>
              {statusText}
            </p>
            {subText && (
              <p style={{
                color: "rgba(255,255,255,0.42)", fontSize: 12.5,
                letterSpacing: ".03em", lineHeight: 1.55,
              }}>
                {subText}
              </p>
            )}
          </div>

          {/* Fallback panel — failed + hint timer elapsed */}
          {isFailed && showFailHint && (
            <div style={{
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
              border: "0.5px solid rgba(255,255,255,0.10)",
              borderRadius: 14, padding: "13px 14px",
              animation: "fadeIn 320ms ease forwards",
            }}>
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
            </div>
          )}

          {/* Standard bottom actions — scanning only */}
          {scanState === "scanning" && (
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
