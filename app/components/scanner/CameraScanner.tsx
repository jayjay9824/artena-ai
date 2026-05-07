"use client";

/**
 * CameraScanner — Phase 8 integration surface.
 *
 * Wires Phases 1-7 into a single camera-driven scanner component:
 *
 *   Phase 1   types/scanner.ts          (DetectionResult, FrameSnapshot,
 *                                        SessionScan — imageBase64 lives
 *                                        only on SessionScan)
 *   Phase 2   utils/detectionLogic.ts   (ACTIVE_AREA, intersection filter)
 *   Phase 3   utils/frameBuffer.ts      (5-frame stability, metadata only)
 *   Phase 4   services/scanSession.ts   (multi-scan session, 5-cap)
 *   Phase 5   hooks/useDetectionHandler (state machine + lifecycle)
 *   Phase 6   hooks/useScannerUX        (state-driven copy)
 *   Phase 7   services/reportBuilder    (QuickReportPayload)
 *
 * Rules enforced here (per Camera Stability Final spec):
 *   • Camera permission requested on mount; denied → fallback UI.
 *   • Active-area guide drawn as visual overlay only (pointer-events-none).
 *   • Bounding boxes rendered for every supplied detection.
 *   • State text comes from useScannerUX — no hard-coded copy here.
 *   • imageBase64 captured ONLY on:
 *       - automatic lock (analyzing transition)
 *       - manual capture button (idle / detecting)
 *       - "Continue with QR" tap inside the QR action sheet
 *     never on every frame, never inside the frame buffer.
 *   • QR alone never auto-runs — user must explicitly choose
 *     Scan Artwork / Scan Label / Continue with QR.
 *   • Idle state shows the manual capture button.
 *   • Analyzing state shows the cancel button.
 *   • On success: build QuickReportPayload, POST /api/axvela/analyze,
 *     hand off to the parent for Quick View routing.
 *
 * Detections producer:
 *   The component accepts a `detections` prop driven by the caller's
 *   vision / QR pipeline (or a test harness). When omitted, the
 *   scanner sits in idle / detecting indefinitely — there's no
 *   internal mock cycle here on purpose; production wiring lives in
 *   the producer that feeds this prop.
 */

import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";

import type {
  DetectionResult, DetectionTarget, SessionScan,
} from "../../types/scanner";
import { ACTIVE_AREA }                  from "../../utils/detectionLogic";
import { useDetectionHandler }          from "../../hooks/useDetectionHandler";
import { useScannerUX }                 from "../../hooks/useScannerUX";
import { useCameraPermission }          from "../../hooks/scanner/useCameraPermission";
import { useCameraLifecycle }           from "../../hooks/scanner/useCameraLifecycle";
import { buildQuickReportPayload,
         type QuickReportPayload }      from "../../services/reportBuilder";
import { captureVideoFrame }            from "../../lib/scanner/captureFrame";

/* ── Types ──────────────────────────────────────────────────── */

/** Shape of the V1 analyze response the parent receives. Loose so
 *  this component doesn't import from the route handler module
 *  (server-only imports). The parent already knows the full shape. */
export type AnalyzeResponseV1 = Record<string, unknown>;

export interface CameraScannerProps {
  /** Close the scanner without proceeding to Quick View. */
  onCancel: () => void;
  /** Fired after the analyze API responds. Parent routes to Quick View. */
  onComplete: (
    payload:        QuickReportPayload,
    analyzeResult:  AnalyzeResponseV1 | null,
  ) => void;
  /** External detections feed (from your real vision/QR producer or
   *  a test harness). Each render the scanner pushes the latest list
   *  through the Phase 2-3 stability pipeline. */
  detections?: DetectionResult[];
  /** Permission-denied fallbacks. */
  onUploadImage?:  () => void;
  onManualSearch?: () => void;
  /** Output language for /api/axvela/analyze. Default "ko". */
  outputLanguage?: "ko" | "en";
  /** Optional free-form question forwarded to the analyze API. */
  userQuestion?:   string;
}

/* ── Component ──────────────────────────────────────────────── */

export function CameraScanner({
  onCancel,
  onComplete,
  detections = [],
  onUploadImage,
  onManualSearch,
  outputLanguage = "ko",
  userQuestion,
}: CameraScannerProps) {
  /* Permission + camera stream — owned by existing hooks. */
  const { permissionStatus, requestPermission } = useCameraPermission();
  const { videoRef, startCamera, stopCamera }   = useCameraLifecycle();

  /* In-flight analyze request flag. Drives the cancel-button branch. */
  const [analyzing, setAnalyzing] = useState(false);
  const analyzeAbortRef           = useRef<AbortController | null>(null);

  /* Phase 5 hook — wires Phase 2-4 underneath. The onAnalyzing
   * callback fires the moment the lock window finishes for an
   * artwork or label target; this is where we capture the frame
   * (rule 12 — only at lock time). */
  const {
    scannerState, primaryTarget, isLocked,
    handleFrame, forceCapture, cancelScan,
    getMergedContext, completeSession,
  } = useDetectionHandler({
    onAnalyzing:        () => { void captureCurrentFrame(); },
    onScanRecorded:     scan => { void afterScanRecorded(scan); },
    onQRActionRequired: () => { /* surfaced via state, no extra wiring */ },
  });

  /* Stable refs into the latest detection / language / question so
   * the analyze pipeline doesn't re-create on each prop change. */
  const detectionsRef    = useRef<DetectionResult[]>([]);
  detectionsRef.current  = detections;
  const outputLanguageRef = useRef(outputLanguage);
  outputLanguageRef.current = outputLanguage;
  const userQuestionRef  = useRef(userQuestion);
  userQuestionRef.current = userQuestion;

  /* Permission flow. Soft-prompt is handled inline below — the
   * "Enable camera" button calls requestPermission on tap. */
  const granted = permissionStatus === "granted";
  const denied  = permissionStatus === "denied";

  /* Start / stop camera around the granted flag. */
  useEffect(() => {
    if (granted) void startCamera();
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granted]);

  /* Push every detection update through the stability pipeline. */
  useEffect(() => {
    handleFrame(detections);
  }, [detections, handleFrame]);

  /* ── Capture pipeline ─────────────────────────────────────── */

  const captureCurrentFrame = useCallback(async () => {
    const frame = await captureVideoFrame(videoRef.current, "image/jpeg", 0.9);
    if (!frame) {
      // Camera hasn't produced a frame yet — fall back to recording the
      // detection without an image. The session will skip artworkScan
      // image bytes and the report will reflect that.
      forceCapture(undefined);
      return;
    }
    forceCapture(frame.dataUrl);
  }, [forceCapture, videoRef]);

  /* Manual capture (idle button). Forces an artwork-class scan
   * with the current frame, even if no detection has stabilized. */
  const handleManualCapture = useCallback(() => {
    void captureCurrentFrame();
  }, [captureCurrentFrame]);

  /* Cancel button (analyzing state). Aborts the in-flight analyze
   * call, cancels the session, and notifies the parent. */
  const handleCancel = useCallback(() => {
    analyzeAbortRef.current?.abort();
    analyzeAbortRef.current = null;
    setAnalyzing(false);
    cancelScan();
    onCancel();
  }, [cancelScan, onCancel]);

  /* QR action sheet — three options per spec rule 7. */
  const handleQRScanArtwork = useCallback(() => {
    // Record the QR (so it's captured in the merged session) and
    // wait for the next stable artwork detection. forceCapture
    // resets isLocked, so handleFrame resumes processing.
    forceCapture(undefined);
  }, [forceCapture]);

  const handleQRScanLabel = useCallback(() => {
    // Same as Scan Artwork — the next stable label detection will
    // drive the analyze step.
    forceCapture(undefined);
  }, [forceCapture]);

  const handleQRContinue = useCallback(async () => {
    // User explicitly opts to proceed with QR alone. Capture the
    // current frame as supporting visual context, then run the
    // analyze step against the merged session immediately.
    const frame = await captureVideoFrame(videoRef.current, "image/jpeg", 0.9);
    forceCapture(frame?.dataUrl);
  }, [forceCapture, videoRef]);

  /* ── After every recorded scan, decide whether to analyze ─── */

  const afterScanRecorded = useCallback(async (_scan: SessionScan) => {
    void _scan;
    const ctx = getMergedContext();
    if (!ctx) return;

    // We analyze when the user has captured something usable —
    // either an artwork frame or (for QR-only flows) the user has
    // explicitly continued past the QR action gate.
    //
    // For Scan Artwork / Scan Label paths from the QR action sheet
    // (which call forceCapture WITHOUT image bytes), we skip
    // analyze and let the next detection cycle drive it.
    const hasArtworkImage = !!ctx.artworkScan?.imageBase64;
    const hasJustQR =
      !!ctx.qrScan && !ctx.artworkScan && !ctx.labelScan;

    // Defer when only QR exists with no continue-frame yet (the
    // user is going to pick artwork/label next).
    if (hasJustQR && !ctx.qrScan?.imageBase64) return;
    if (!hasArtworkImage && !hasJustQR && !ctx.labelScan) return;

    await runAnalyze();
  }, [getMergedContext]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Analyze pipeline ─────────────────────────────────────── */

  const runAnalyze = useCallback(async () => {
    const ctx = getMergedContext();
    if (!ctx) return;

    // imageBase64 lives on artwork OR (continue-with-QR) qr scan.
    const imageDataUrl =
      ctx.artworkScan?.imageBase64 ?? ctx.qrScan?.imageBase64;

    // Strip data-URL prefix → raw base64 for the API.
    const rawBase64 = imageDataUrl
      ? imageDataUrl.replace(/^data:[^;]+;base64,/, "")
      : undefined;

    // Probe for an OCR'd label string from the most recent label scan.
    const labelText = ctx.labelScan?.detections.find(d => d.target === "label")?.data;
    const qrPayload = ctx.qrScan?.detections.find(d => d.target === "qr")?.data;

    setAnalyzing(true);

    let analyzeResult: AnalyzeResponseV1 | null = null;
    let recognitionConfidence = 0;

    if (rawBase64) {
      const ac = new AbortController();
      analyzeAbortRef.current = ac;
      try {
        const res = await fetch("/api/axvela/analyze", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64:    rawBase64,
            imageMimeType:  "image/jpeg",
            labelText,
            qrPayload,
            userQuestion:   userQuestionRef.current,
            outputLanguage: outputLanguageRef.current,
          }),
          signal: ac.signal,
        });
        if (res.ok) {
          analyzeResult = (await res.json()) as AnalyzeResponseV1;
          // Pull the AI's recognition confidence so the QuickReport
          // payload reflects the analyzed value (Phase 7 contract:
          // artworkConfidence is the AI confidence when artwork
          // present).
          const interp = (analyzeResult as { interpretation?: { recognitionConfidence?: number } })
            .interpretation;
          if (typeof interp?.recognitionConfidence === "number") {
            recognitionConfidence = interp.recognitionConfidence;
          }
        }
      } catch (err) {
        // AbortError on cancel — silent. Other errors fall through
        // with analyzeResult === null; Quick View renders the
        // "uncertain" state from the QuickReportPayload alone.
        if ((err as Error)?.name !== "AbortError") {
          // eslint-disable-next-line no-console
          console.error("[CameraScanner] analyze failed", err);
        }
      } finally {
        analyzeAbortRef.current = null;
      }
    }

    // Build the QuickReportPayload AFTER analyze so the payload
    // carries the AI's recognitionConfidence. The session's most
    // recent scan sequence drives scanSequence.
    const sequence = (ctx.artworkScan ?? ctx.labelScan ?? ctx.qrScan)?.sequence ?? 1;
    const payload = buildQuickReportPayload(ctx, {
      scanSequence:      sequence,
      artworkConfidence: recognitionConfidence,
    });

    completeSession();
    setAnalyzing(false);
    onComplete(payload, analyzeResult);
  }, [getMergedContext, completeSession, onComplete]);

  /* ── Scanner state for UX copy ────────────────────────────── */

  // Map permission denied into the Phase 6 state so getScannerFeedback
  // resolves the right copy. The hook's own scannerState only covers
  // detection-driven transitions; permission is handled here.
  const effectiveState =
    denied     ? "permission_denied" :
    analyzing  ? "analyzing"        :
                 scannerState;

  const ux = useScannerUX(effectiveState);

  /* ── Render ───────────────────────────────────────────────── */

  // Permission gate. denied OR pre-grant prompt both render the
  // soft-prompt; tap proceeds to the system permission dialog.
  if (!granted) {
    return (
      <PermissionGate
        denied={denied}
        primary={ux.primary}
        secondary={ux.secondary}
        onEnableCamera={async () => { await requestPermission(); }}
        onUploadImage={onUploadImage}
        onManualSearch={onManualSearch}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div style={S.shell}>
      {/* Live preview */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        playsInline
        muted
        autoPlay
        style={S.video}
      />

      {/* Dim overlay so the bright bounding boxes pop. */}
      <div style={S.dim} />

      {/* Active-area guide — VISUAL only (rule 4). */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left:     `${ACTIVE_AREA.x      * 100}%`,
          top:      `${ACTIVE_AREA.y      * 100}%`,
          width:    `${ACTIVE_AREA.width  * 100}%`,
          height:   `${ACTIVE_AREA.height * 100}%`,
          border:   "1px dashed rgba(255,255,255,0.45)",
          borderRadius:  12,
          pointerEvents: "none",
          zIndex:        4,
        }}
      />

      {/* Bounding boxes — render every supplied detection (rule 5). */}
      <div style={S.boxLayer}>
        {detections.map((d, i) => (
          <BoundingBox
            key={`${d.target}-${i}`}
            d={d}
            isPrimary={d.target === primaryTarget}
            isLocked={isLocked && d.target === primaryTarget}
          />
        ))}
      </div>

      {/* Top bar — close (always). */}
      <div style={S.topBar}>
        <button onClick={onCancel} style={S.closeBtn} aria-label="Close">
          ×
        </button>
      </div>

      {/* State text — rule 6. */}
      <div style={S.statusBlock}>
        <p style={S.statusPrimary}>{ux.primary}</p>
        <p style={S.statusSecondary}>{ux.secondary}</p>
      </div>

      {/* Bottom action area. */}
      <div style={S.bottomBar}>
        {/* Idle: manual capture (rule 8). */}
        {(scannerState === "idle" || scannerState === "detecting") && !analyzing && (
          <button onClick={handleManualCapture} style={S.primaryBtn}>
            <span style={S.primaryBtnLabel}>
              {outputLanguage === "ko" ? "수동 촬영" : "Capture"}
            </span>
          </button>
        )}

        {/* Analyzing: cancel (rule 9). */}
        {(analyzing || scannerState === "analyzing") && (
          <button onClick={handleCancel} style={S.secondaryBtn}>
            {outputLanguage === "ko" ? "취소" : "Cancel"}
          </button>
        )}
      </div>

      {/* QR action sheet — rule 7. */}
      {scannerState === "qr_action_required" && (
        <QRActionSheet
          lang={outputLanguage}
          onScanArtwork={handleQRScanArtwork}
          onScanLabel={handleQRScanLabel}
          onContinueWithQR={handleQRContinue}
        />
      )}
    </div>
  );
}

/* ── Permission gate ───────────────────────────────────────── */

interface PermissionGateProps {
  denied:           boolean;
  primary:          string;
  secondary:        string;
  onEnableCamera:   () => void | Promise<void>;
  onUploadImage?:   () => void;
  onManualSearch?:  () => void;
  onCancel:         () => void;
}

function PermissionGate({
  denied, primary, secondary,
  onEnableCamera, onUploadImage, onManualSearch, onCancel,
}: PermissionGateProps) {
  return (
    <div style={S.shell}>
      <div style={S.topBar}>
        <button onClick={onCancel} style={S.closeBtn} aria-label="Close">×</button>
      </div>
      <div style={S.gateBody}>
        <p style={S.statusPrimary}>{primary}</p>
        <p style={S.statusSecondary}>{secondary}</p>

        {!denied && (
          <button onClick={onEnableCamera} style={S.primaryBtn}>
            <span style={S.primaryBtnLabel}>Enable camera</span>
          </button>
        )}

        {/* Fallback row — always shown so user has an out. */}
        <div style={S.fallbackRow}>
          {onUploadImage && (
            <button onClick={onUploadImage} style={S.secondaryBtn}>
              Upload image
            </button>
          )}
          {onManualSearch && (
            <button onClick={onManualSearch} style={S.secondaryBtn}>
              Manual search
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Bounding box ──────────────────────────────────────────── */

interface BoundingBoxProps {
  d:          DetectionResult;
  isPrimary:  boolean;
  isLocked:   boolean;
}

function BoundingBox({ d, isPrimary, isLocked }: BoundingBoxProps) {
  const color = colorFor(d.target);
  return (
    <div
      style={{
        position:      "absolute",
        left:          `${d.boundingBox.x      * 100}%`,
        top:           `${d.boundingBox.y      * 100}%`,
        width:         `${d.boundingBox.width  * 100}%`,
        height:        `${d.boundingBox.height * 100}%`,
        border:        `${isLocked ? 2 : 1.2}px solid ${color}`,
        borderRadius:  10,
        boxShadow:     isPrimary ? `0 0 0 2px ${color}33` : undefined,
        pointerEvents: "none",
        transition:    "border-width 120ms ease-out",
      }}
    />
  );
}

function colorFor(t: DetectionTarget): string {
  if (t === "artwork") return "#FFFFFF";
  if (t === "label")   return "#B8C0CC";
  if (t === "qr")      return "#007AFF";
  return "rgba(255,255,255,0.4)";
}

/* ── QR action sheet ───────────────────────────────────────── */

interface QRActionSheetProps {
  lang:             "ko" | "en";
  onScanArtwork:    () => void;
  onScanLabel:      () => void;
  onContinueWithQR: () => void;
}

function QRActionSheet({
  lang, onScanArtwork, onScanLabel, onContinueWithQR,
}: QRActionSheetProps) {
  const labels = lang === "ko"
    ? { artwork: "작품 스캔", label: "라벨 스캔", continue: "QR로 계속" }
    : { artwork: "Scan Artwork", label: "Scan Label", continue: "Continue with QR" };

  return (
    <div style={S.sheet}>
      <button onClick={onScanArtwork}    style={S.sheetBtn}>{labels.artwork}</button>
      <button onClick={onScanLabel}      style={S.sheetBtn}>{labels.label}</button>
      <button onClick={onContinueWithQR} style={S.sheetBtnPrimary}>{labels.continue}</button>
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────────── */

const FONT = "'KakaoSmallSans', system-ui, sans-serif";

const S = {
  shell: {
    position:       "fixed" as const,
    inset:          0,
    zIndex:         200,
    background:     "#0D0D0D",
    color:          "#FFFFFF",
    fontFamily:     FONT,
    overflow:       "hidden" as const,
  },
  video: {
    position:  "absolute" as const,
    inset:     0,
    width:     "100%",
    height:    "100%",
    objectFit: "cover" as const,
  },
  dim: {
    position:      "absolute" as const,
    inset:         0,
    background:    "rgba(0,0,0,0.32)",
    pointerEvents: "none" as const,
    zIndex:        2,
  },
  boxLayer: {
    position: "absolute" as const,
    inset:    0,
    zIndex:   5,
    pointerEvents: "none" as const,
  },
  topBar: {
    position:        "absolute" as const,
    top:             "calc(env(safe-area-inset-top, 0px) + 14px)",
    left:            14,
    right:           14,
    zIndex:          20,
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "space-between",
  },
  closeBtn: {
    width:           38,
    height:          38,
    borderRadius:    "50%",
    background:      "rgba(255,255,255,0.10)",
    border:          "0.5px solid rgba(255,255,255,0.18)",
    color:           "#FFFFFF",
    fontSize:        20,
    lineHeight:      1,
    cursor:          "pointer",
    backdropFilter:  "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },
  statusBlock: {
    position:        "absolute" as const,
    left:            0,
    right:           0,
    bottom:          "calc(env(safe-area-inset-bottom, 0px) + 130px)",
    textAlign:       "center" as const,
    pointerEvents:   "none" as const,
    zIndex:          15,
  },
  statusPrimary: {
    margin:         0,
    fontSize:       16,
    fontWeight:     500,
    letterSpacing:  ".02em",
    color:          "#FFFFFF",
    textShadow:     "0 2px 12px rgba(0,0,0,0.6)",
  },
  statusSecondary: {
    margin:         "6px 0 0",
    fontSize:       12.5,
    color:          "rgba(255,255,255,0.66)",
    textShadow:     "0 1px 6px rgba(0,0,0,0.6)",
  },
  bottomBar: {
    position:       "absolute" as const,
    left:           0,
    right:          0,
    bottom:         "calc(env(safe-area-inset-bottom, 0px) + 28px)",
    display:        "flex",
    flexDirection:  "column" as const,
    alignItems:     "center",
    gap:            10,
    zIndex:         18,
  },
  primaryBtn: {
    minWidth:       180,
    padding:        "13px 22px",
    background:     "rgba(255,255,255,0.95)",
    color:          "#111",
    border:         "none",
    borderRadius:   999,
    cursor:         "pointer",
    fontFamily:     FONT,
    fontSize:       13,
    fontWeight:     600,
    letterSpacing:  ".06em",
  },
  primaryBtnLabel: { textTransform: "none" as const },
  secondaryBtn: {
    minWidth:       140,
    padding:        "11px 18px",
    background:     "rgba(0,0,0,0.45)",
    border:         "0.5px solid rgba(255,255,255,0.20)",
    color:          "#FFFFFF",
    borderRadius:   999,
    cursor:         "pointer",
    fontFamily:     FONT,
    fontSize:       12.5,
    letterSpacing:  ".05em",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },
  sheet: {
    position:       "absolute" as const,
    left:           14,
    right:          14,
    bottom:         "calc(env(safe-area-inset-bottom, 0px) + 28px)",
    display:        "flex",
    flexDirection:  "column" as const,
    gap:            8,
    padding:        14,
    background:     "rgba(20,20,20,0.92)",
    border:         "0.5px solid rgba(255,255,255,0.16)",
    borderRadius:   18,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    zIndex:         25,
  },
  sheetBtn: {
    width:          "100%",
    padding:        "12px 18px",
    background:     "rgba(255,255,255,0.06)",
    border:         "0.5px solid rgba(255,255,255,0.14)",
    color:          "#FFFFFF",
    borderRadius:   12,
    cursor:         "pointer",
    fontFamily:     FONT,
    fontSize:       13.5,
    fontWeight:     500,
    letterSpacing:  ".03em",
    textAlign:      "left" as const,
  },
  sheetBtnPrimary: {
    width:          "100%",
    padding:        "13px 18px",
    background:     "rgba(255,255,255,0.95)",
    color:          "#111",
    border:         "none",
    borderRadius:   12,
    cursor:         "pointer",
    fontFamily:     FONT,
    fontSize:       13.5,
    fontWeight:     600,
    letterSpacing:  ".03em",
    textAlign:      "center" as const,
  },
  gateBody: {
    position:       "absolute" as const,
    inset:          0,
    display:        "flex",
    flexDirection:  "column" as const,
    alignItems:     "center",
    justifyContent: "center",
    padding:        "0 32px",
    textAlign:      "center" as const,
    gap:            14,
  },
  fallbackRow: {
    marginTop:      8,
    display:        "flex",
    gap:            10,
    flexWrap:       "wrap" as const,
    justifyContent: "center",
  },
} satisfies Record<string, React.CSSProperties>;
