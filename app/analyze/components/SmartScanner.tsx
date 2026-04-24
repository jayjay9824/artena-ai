"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";

/* ── Types ──────────────────────────────────────────────────────────── */

export type DetectionTarget = "none" | "artwork" | "label" | "qr";

export type ScannerState =
  | "permission_pending"
  | "permission_denied"
  | "idle"
  | "artwork_detected"
  | "label_detected"
  | "qr_detected"
  | "analyzing"
  | "failed"
  | "success";

export interface SmartScannerProps {
  onClose: () => void;
  onCapture: (file: File, dataUrl: string) => void;
  onUpload: () => void;
  onManualSearch: () => void;
}

/* ── State visual config ────────────────────────────────────────────── */

interface StateCfg {
  cornerColor: string;
  glowColor: string;
  statusText: string;
  subText: string | null;
  badge: string | null;
  badgeIcon: "image" | "filetext" | "qrcode" | null;
  scanLine: boolean;
}

const STATE_CFG: Record<ScannerState, StateCfg> = {
  permission_pending: {
    cornerColor: "rgba(255,255,255,0.25)",
    glowColor: "transparent",
    statusText: "Requesting camera access",
    subText: null,
    badge: null, badgeIcon: null, scanLine: false,
  },
  permission_denied: {
    cornerColor: "rgba(160,160,160,0.30)",
    glowColor: "transparent",
    statusText: "Camera Access Required",
    subText: "Camera access is needed to scan artwork, labels, or QR codes.",
    badge: null, badgeIcon: null, scanLine: false,
  },
  idle: {
    cornerColor: "rgba(255,255,255,0.50)",
    glowColor: "transparent",
    statusText: "Point at artwork, label, or QR",
    subText: null,
    badge: null, badgeIcon: null, scanLine: false,
  },
  artwork_detected: {
    cornerColor: "rgba(72,125,255,0.92)",
    glowColor: "rgba(72,125,255,0.10)",
    statusText: "Artwork detected",
    subText: "Hold steady to analyze image and style",
    badge: "Artwork", badgeIcon: "image", scanLine: false,
  },
  label_detected: {
    cornerColor: "rgba(155,180,215,0.88)",
    glowColor: "rgba(155,180,215,0.09)",
    statusText: "Label detected",
    subText: "Reading artist, title, year, and medium",
    badge: "Label", badgeIcon: "filetext", scanLine: false,
  },
  qr_detected: {
    cornerColor: "rgba(24,86,255,0.95)",
    glowColor: "rgba(24,86,255,0.14)",
    statusText: "QR detected",
    subText: "Extracting artwork and exhibition data",
    badge: "QR Code", badgeIcon: "qrcode", scanLine: false,
  },
  analyzing: {
    cornerColor: "rgba(72,125,255,0.80)",
    glowColor: "rgba(72,125,255,0.12)",
    statusText: "Analyzing context",
    subText: null,
    badge: null, badgeIcon: null, scanLine: true,
  },
  failed: {
    cornerColor: "rgba(160,160,160,0.40)",
    glowColor: "transparent",
    statusText: "Couldn't recognize the target",
    subText: "Try another angle or use a different input method",
    badge: null, badgeIcon: null, scanLine: false,
  },
  success: {
    cornerColor: "rgba(72,125,255,0.85)",
    glowColor: "rgba(72,125,255,0.16)",
    statusText: "Analyzing context",
    subText: null,
    badge: null, badgeIcon: null, scanLine: true,
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

function IcoImage({ size = 13, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3.5" width="16" height="13" rx="2" />
      <circle cx="7" cy="8.5" r="1.5" />
      <path d="M2 14l4-4 3.5 3.5 2.5-2.5L18 14.5" />
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

function IcoQr({ size = 13, color = "#fff" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="1" stroke={color} strokeWidth="1.4" />
      <rect x="11" y="2" width="7" height="7" rx="1" stroke={color} strokeWidth="1.4" />
      <rect x="2" y="11" width="7" height="7" rx="1" stroke={color} strokeWidth="1.4" />
      <rect x="4" y="4" width="3" height="3" fill={color} />
      <rect x="13" y="4" width="3" height="3" fill={color} />
      <rect x="4" y="13" width="3" height="3" fill={color} />
      <path d="M11 11h2v2h-2zM15 11h2M11 15h2M15 15h2v2h-2zM11 17h2" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
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

/* ── Badge icon ─────────────────────────────────────────────────────── */

function BadgeIcon({ type }: { type: StateCfg["badgeIcon"] }) {
  if (type === "image") return <IcoImage />;
  if (type === "filetext") return <IcoFileText />;
  if (type === "qrcode") return <IcoQr />;
  return null;
}

/* ── Scan frame ─────────────────────────────────────────────────────── */

function ScannerFrame({ state, onTap }: { state: ScannerState; onTap: () => void }) {
  const cfg = STATE_CFG[state];
  const W = 262;
  const H = 318;
  const C = 28;       // corner arm length
  const LW = 2;       // line width
  const R = 5;        // radius

  const isAnalyzing  = state === "analyzing" || state === "success";
  const isDetected   = state === "artwork_detected" || state === "label_detected" || state === "qr_detected";
  const isFailed     = state === "failed";
  const color        = cfg.cornerColor;

  const corner = (pos: { top?: 0; bottom?: 0; left?: 0; right?: 0 }) => {
    const hasBorderTop    = "top" in pos;
    const hasBorderBottom = "bottom" in pos;
    const hasBorderLeft   = "left" in pos;
    const hasBorderRight  = "right" in pos;

    const rad = hasBorderTop && hasBorderLeft   ? `${R}px 0 0 0`
              : hasBorderTop && hasBorderRight  ? `0 ${R}px 0 0`
              : hasBorderBottom && hasBorderLeft ? `0 0 0 ${R}px`
              :                                    `0 0 ${R}px 0`;

    return (
      <div style={{
        position: "absolute",
        ...pos,
        width: C, height: C,
        borderTop:    hasBorderTop    ? `${LW}px solid ${color}` : undefined,
        borderBottom: hasBorderBottom ? `${LW}px solid ${color}` : undefined,
        borderLeft:   hasBorderLeft   ? `${LW}px solid ${color}` : undefined,
        borderRight:  hasBorderRight  ? `${LW}px solid ${color}` : undefined,
        borderRadius: rad,
        transition: "border-color 0.4s ease",
        boxSizing: "border-box" as const,
      }} />
    );
  };

  return (
    <div onClick={onTap} style={{ position: "relative", width: W, height: H, cursor: "pointer" }}>
      <style>{`
        @keyframes scanLine {
          0%   { top: 3%; }
          50%  { top: 90%; }
          100% { top: 3%; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        @keyframes badgeFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(5px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes frameLock {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.97); }
          70%  { transform: scale(1.01); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Inner glow overlay */}
      {cfg.glowColor !== "transparent" && (
        <div style={{
          position: "absolute", inset: 0,
          background: cfg.glowColor,
          borderRadius: R,
          pointerEvents: "none",
          animation: isDetected ? "glowPulse 2.4s ease-in-out infinite" : "none",
        }} />
      )}

      {/* Lock animation wrapper */}
      <div style={{
        position: "absolute", inset: 0,
        animation: isDetected ? "frameLock 0.45s ease forwards" : "none",
      }}>
        {corner({ top: 0, left: 0 })}
        {corner({ top: 0, right: 0 })}
        {corner({ bottom: 0, left: 0 })}
        {corner({ bottom: 0, right: 0 })}
      </div>

      {/* Scan line */}
      {isAnalyzing && (
        <div style={{
          position: "absolute", left: 6, right: 6,
          height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${cfg.cornerColor} 25%, ${cfg.cornerColor} 75%, transparent 100%)`,
          animation: "scanLine 1.9s ease-in-out infinite",
          pointerEvents: "none",
          opacity: 0.85,
        }} />
      )}

      {/* Detection badge */}
      {cfg.badge && (
        <div style={{
          position: "absolute",
          bottom: -40,
          left: "50%",
          animation: "badgeFadeIn 0.3s ease forwards",
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(8,8,18,0.84)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `0.5px solid ${cfg.cornerColor}`,
          borderRadius: 20,
          padding: "5px 13px 5px 10px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          <BadgeIcon type={cfg.badgeIcon} />
          <span style={{
            color: "#fff", fontSize: 11, letterSpacing: ".09em",
            fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
            fontWeight: 500,
          }}>
            {cfg.badge} detected
          </span>
        </div>
      )}

      {/* Failed hint */}
      {isFailed && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <span style={{
            color: "rgba(255,255,255,0.28)",
            fontSize: 10, letterSpacing: ".14em",
            fontFamily: "'KakaoSmallSans', system-ui, sans-serif",
          }}>
            TAP TO RETRY
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Shared button styles ───────────────────────────────────────────── */

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

/* ── Permission-denied screen ───────────────────────────────────────── */

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

  const [scanState, setScanState]     = useState<ScannerState>("permission_pending");
  const [flashOn,   setFlashOn]       = useState(false);
  const [videoReady, setVideoReady]   = useState(false);
  const [analyzeLabel, setAnalyzeLabel] = useState("Reading target");

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
        setScanState("idle");
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

  /* ── Mock detection cycle ─────────────────────────────────────────── */

  useEffect(() => {
    if (scanState !== "idle") return;
    const t = setTimeout(() => setScanState("artwork_detected"), 3200);
    return () => clearTimeout(t);
  }, [scanState]);

  useEffect(() => {
    if (scanState !== "artwork_detected") return;
    const t = setTimeout(() => setScanState("analyzing"), 1600);
    return () => clearTimeout(t);
  }, [scanState]);

  useEffect(() => {
    if (scanState !== "analyzing") return;
    const t = setTimeout(captureFrame, 2400);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanState]);

  /* ── Analyze label cycle ──────────────────────────────────────────── */

  useEffect(() => {
    if (scanState !== "analyzing" && scanState !== "success") return;
    const labels = ["Reading target", "Extracting data", "Building report"];
    let i = 0;
    setAnalyzeLabel(labels[0]);
    const id = setInterval(() => { i = (i + 1) % labels.length; setAnalyzeLabel(labels[i]); }, 900);
    return () => clearInterval(id);
  }, [scanState]);

  /* ── Frame capture ────────────────────────────────────────────────── */

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      setScanState("failed");
      return;
    }
    setScanState("success");

    const canvas  = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    try {
      const blob = await fetch(dataUrl).then(r => r.blob());
      const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
      setTimeout(() => onCapture(file, dataUrl), 700);
    } catch {
      setScanState("failed");
    }
  }, [onCapture]);

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

  /* ── Tap to advance state ─────────────────────────────────────────── */

  const handleFrameTap = useCallback(() => {
    if      (scanState === "idle")     setScanState("artwork_detected");
    else if (scanState === "artwork_detected" || scanState === "label_detected" || scanState === "qr_detected")
                                       setScanState("analyzing");
    else if (scanState === "failed")   setScanState("idle");
  }, [scanState]);

  /* ── Render ───────────────────────────────────────────────────────── */

  const cfg        = STATE_CFG[scanState];
  const isPending  = scanState === "permission_pending";
  const isDenied   = scanState === "permission_denied";
  const isActive   = !isPending && !isDenied;
  const isFailed   = scanState === "failed";
  const isAnalyz   = scanState === "analyzing" || scanState === "success";

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
        background: scanState === "success"
          ? "rgba(0,0,0,0.55)"
          : "rgba(0,0,0,0.38)",
        transition: "background 0.7s ease",
        pointerEvents: "none",
      }} />

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

      {/* ── Center ─────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {isPending && (
          <div style={{ textAlign: "center" }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

        {isDenied && <PermissionDenied onUpload={onUpload} onManualSearch={onManualSearch} />}

        {isActive && <ScannerFrame state={scanState} onTap={handleFrameTap} />}
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
            }}>
              {isAnalyz ? analyzeLabel : cfg.statusText}
            </p>
            {cfg.subText && !isAnalyz && (
              <p style={{
                color: "rgba(255,255,255,0.42)", fontSize: 12.5,
                letterSpacing: ".03em", lineHeight: 1.55,
              }}>
                {cfg.subText}
              </p>
            )}
          </div>

          {/* Fallback block — failed */}
          {isFailed && (
            <div style={{
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
              border: "0.5px solid rgba(255,255,255,0.10)",
              borderRadius: 14, padding: "13px 14px",
              marginBottom: 2,
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
                <button onClick={() => {}} style={fallbackBtnStyle}>
                  <IcoFileText size={13} color="rgba(255,255,255,0.6)" />
                  <span>Scan Label</span>
                </button>
                <button onClick={onManualSearch} style={fallbackBtnStyle}>
                  <IcoSearch size={13} color="rgba(255,255,255,0.6)" />
                  <span>Manual Search</span>
                </button>
              </div>
            </div>
          )}

          {/* Standard bottom actions */}
          {isActive && !isFailed && (
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
