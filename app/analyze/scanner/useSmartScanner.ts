"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Detection,
  DetectionTarget,
  ScannerState,
  CameraStatus,
  pickPrimary,
  targetToState,
} from "./types";
import { DetectionService, MockDetectionService, BarcodeDetectionService } from "./detectionService";

/* ── Hook options & return ──────────────────────────────────────────── */

export interface UseSmartScannerOptions {
  /** Plug a real DetectionService here (QR / Vision / etc). */
  service?: DetectionService;
  /** When no service is provided, run the scripted mock timeline. */
  mockDetectionEnabled?: boolean;
  /**
   * Dev-only state cycler. When true, walks scanState through every
   * visual state (idle → artwork_detected → label_detected →
   * qr_detected → analyzing → idle) every `debugCycleMs` so QA can
   * verify each state's UI without scripting detection. Disables the
   * detection service and failure timeout while running.
   */
  debugCycleEnabled?: boolean;
  /** ms between debug-cycle steps. Default 2000. */
  debugCycleMs?: number;
  /** Called when state reaches "success" — receives the locked detection. */
  onSuccess?: (target: Exclude<DetectionTarget, "none">, locked: Detection) => void;
  /** ms with no lock before transitioning to "failed". */
  failTimeoutMs?: number;
  /** Confidence above which a target is considered locked. */
  lockThreshold?: number;
  /** ms to hold the lock state before transitioning to "analyzing". */
  lockHoldMs?: number;
  /** ms in "analyzing" before transitioning to "success". */
  analyzeMs?: number;
}

export interface UseSmartScannerReturn {
  cameraStatus: CameraStatus;
  scanState:    ScannerState;
  detections:   Detection[];
  primary:      Detection | null;
  analyzeLabel: string;
  flashOn:      boolean;
  /** True when ambient brightness is below threshold — UI prompts torch. */
  lowLight:     boolean;
  /** Whether real QR detection (BarcodeDetector) is wired vs. mock fallback. */
  realDetection: boolean;
  videoRef:     React.RefObject<HTMLVideoElement | null>;
  retry:        () => void;
  toggleFlash:  () => Promise<void>;
}

/* ── Helpers ────────────────────────────────────────────────────────── */

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Subtle haptic — silently no-ops if unsupported. */
function tinyHaptic() {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(40);
    }
  } catch {
    /* ignore */
  }
}

/** Target-aware analyzing copy. Strictly avoids forbidden words. */
const ANALYZING_LABELS: Record<Exclude<DetectionTarget, "none">, string[]> = {
  qr:      ["Matching QR source",          "Building ARTENA report"],
  label:   ["Reading label text",          "Building ARTENA report"],
  artwork: ["Detecting artwork structure", "Building ARTENA report"],
};

/* ── Hook ───────────────────────────────────────────────────────────── */

export function useSmartScanner(opts: UseSmartScannerOptions = {}): UseSmartScannerReturn {
  const {
    service,
    mockDetectionEnabled = true,
    debugCycleEnabled    = false,
    debugCycleMs         = 2000,
    onSuccess,
    failTimeoutMs   = 3000,
    lockThreshold   = 0.85,
    lockHoldMs      = 500,
    analyzeMs       = 700,
  } = opts;

  const videoRef     = useRef<HTMLVideoElement>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);

  const [cameraStatus,    setCameraStatus]    = useState<CameraStatus>("pending");
  const [scanState,       setScanState]       = useState<ScannerState>("idle");
  const [rawDetections,   setRawDetections]   = useState<Detection[]>([]);
  const [lockedDetection, setLockedDetection] = useState<Detection | null>(null);
  const [tick,            setTick]            = useState(0);
  const [flashOn,         setFlashOn]         = useState(false);
  const [analyzeLabel,    setAnalyzeLabel]    = useState("Reading visual signals");
  const [lowLight,        setLowLight]        = useState(false);
  const [realDetection,   setRealDetection]   = useState(false);

  /* ── 1. Camera lifecycle ──────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("denied");
        return;
      }
      try {
        // Higher resolution + frame rate floor → cleaner preview at
        // night and a sharper canvas frame on capture. Browsers
        // negotiate down on devices that can't deliver these idealss.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width:     { ideal: 1920 },
            height:    { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        // Apply continuous auto-exposure / focus / white-balance where
        // supported. Materially better in low light because the camera
        // keeps adjusting instead of locking to the first reading.
        const track = stream.getVideoTracks()[0];
        if (track) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const caps: any = track.getCapabilities ? track.getCapabilities() : {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const advanced: any[] = [];
          if (caps.exposureMode     && Array.isArray(caps.exposureMode)     && caps.exposureMode.includes("continuous"))     advanced.push({ exposureMode: "continuous" });
          if (caps.focusMode        && Array.isArray(caps.focusMode)        && caps.focusMode.includes("continuous"))        advanced.push({ focusMode: "continuous" });
          if (caps.whiteBalanceMode && Array.isArray(caps.whiteBalanceMode) && caps.whiteBalanceMode.includes("continuous")) advanced.push({ whiteBalanceMode: "continuous" });
          if (advanced.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            try { await (track as any).applyConstraints({ advanced }); } catch { /* not all devices honor every constraint */ }
          }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraStatus("ready");
      } catch {
        if (!cancelled) setCameraStatus("denied");
      }
    };

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  /* ── 2. Subscribe to detection service while idle ─────────────────── */

  useEffect(() => {
    if (debugCycleEnabled)    return;          // debug cycler owns scanState
    if (cameraStatus !== "ready") return;
    if (scanState !== "idle") return;

    // Prefer the real BarcodeDetector when the browser supports it —
    // boxes then sit on the actual QR position instead of the mock's
    // hardcoded corner. Fall back to MockDetectionService for
    // browsers without the API (Firefox today).
    let svc: DetectionService | null = service ?? null;
    if (!svc) {
      if (BarcodeDetectionService.isSupported()) {
        svc = new BarcodeDetectionService(videoRef);
        setRealDetection(true);
      } else if (mockDetectionEnabled) {
        svc = new MockDetectionService();
        setRealDetection(false);
      }
    }
    if (!svc) return;

    return svc.subscribe(setRawDetections);
  }, [cameraStatus, scanState, service, mockDetectionEnabled, debugCycleEnabled]);

  /* ── 2b. Low-light sampling (~1 Hz) ───────────────────────────────── */
  /*
   * Draws a tiny 24×24 sample of the video into an off-DOM canvas and
   * computes average luminance (Rec. 601). Below ~55 → we surface a
   * "Low light — turn on torch" hint in the UI. Cheap; doesn't compete
   * with the BarcodeDetector loop.
   */
  useEffect(() => {
    if (cameraStatus !== "ready") return;
    if (scanState !== "idle") return;
    if (typeof document === "undefined") return;

    const canvas = document.createElement("canvas");
    canvas.width  = 24;
    canvas.height = 24;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const sample = () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;
      try {
        ctx.drawImage(video, 0, 0, 24, 24);
        const { data } = ctx.getImageData(0, 0, 24, 24);
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Rec. 601 luminance, fast int math
          sum += (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        }
        const avg = sum / (data.length / 4);     // 0..255
        // 55 is roughly the threshold where exhibition QR codes start
        // becoming unreadable in our internal testing. With torch on we
        // suppress the hint regardless.
        setLowLight(avg < 55 && !flashOn);
      } catch { /* ignore sampling errors */ }
    };

    sample();
    const id = setInterval(sample, 1100);
    return () => clearInterval(id);
  }, [cameraStatus, scanState, flashOn]);

  /* ── 3. Confidence jitter tick (only while idle) ──────────────────── */

  useEffect(() => {
    if (scanState !== "idle") return;
    const id = setInterval(() => setTick(t => t + 1), 220);
    return () => clearInterval(id);
  }, [scanState]);

  /* ── 4. Live (jittered) detections + primary ──────────────────────── */

  const liveDetections = useMemo<Detection[]>(() => {
    if (rawDetections.length === 0) return [];
    // Reference tick so this re-runs on each jitter step.
    void tick;
    return rawDetections.map(d => {
      // Random walk within ±0.6% of the raw confidence — feels live without drifting.
      const noise = (Math.random() - 0.5) * 0.012;
      return { ...d, confidence: clamp01(d.confidence + noise) };
    });
  }, [rawDetections, tick]);

  const livePrimary = useMemo(() => pickPrimary(liveDetections), [liveDetections]);

  /* ── 5. Lock when primary clears threshold ────────────────────────── */

  useEffect(() => {
    if (scanState !== "idle") return;
    if (!livePrimary)         return;
    // Use raw confidence (not jittered) so jitter alone can't trip the lock.
    const raw = rawDetections.find(d => d.id === livePrimary.id);
    if (!raw || raw.confidence < lockThreshold) return;

    setLockedDetection(livePrimary);
    setScanState(targetToState(livePrimary.target));
    tinyHaptic();
  }, [livePrimary, rawDetections, scanState, lockThreshold]);

  /* ── 6. Locked → analyzing ────────────────────────────────────────── */

  useEffect(() => {
    if (debugCycleEnabled) return;             // cycler owns transitions
    if (
      scanState !== "qr_detected" &&
      scanState !== "label_detected" &&
      scanState !== "artwork_detected"
    ) return;
    const t = setTimeout(() => setScanState("analyzing"), lockHoldMs);
    return () => clearTimeout(t);
  }, [scanState, lockHoldMs, debugCycleEnabled]);

  /* ── 7. Analyzing → success ───────────────────────────────────────── */

  useEffect(() => {
    if (debugCycleEnabled) return;             // cycler stays in analyzing
    if (scanState !== "analyzing") return;
    const t = setTimeout(() => {
      setScanState("success");
      if (lockedDetection && onSuccessRef.current) {
        onSuccessRef.current(lockedDetection.target, lockedDetection);
      }
    }, analyzeMs);
    return () => clearTimeout(t);
  }, [scanState, analyzeMs, lockedDetection, debugCycleEnabled]);

  /* ── 8. Failure timeout ───────────────────────────────────────────── */

  useEffect(() => {
    if (debugCycleEnabled) return;               // cycler runs forever
    if (cameraStatus !== "ready" || scanState !== "idle") return;
    const t = setTimeout(() => {
      // Only fail if we never locked anything in this window.
      setScanState(s => (s === "idle" ? "failed" : s));
    }, failTimeoutMs);
    return () => clearTimeout(t);
  }, [cameraStatus, scanState, failTimeoutMs, debugCycleEnabled]);

  /* ── 9. Rotating analyzing label ──────────────────────────────────── */

  useEffect(() => {
    if (scanState !== "analyzing") {
      setAnalyzeLabel("Reading visual signals");
      return;
    }
    const t = lockedDetection?.target ?? "artwork";
    const seq = ANALYZING_LABELS[t];
    let i = 0;
    setAnalyzeLabel(seq[0]);
    const id = setInterval(() => {
      i = (i + 1) % seq.length;
      setAnalyzeLabel(seq[i]);
    }, 380);
    return () => clearInterval(id);
  }, [scanState, lockedDetection]);

  /* ── 9b. Debug cycler — walks every visual state every debugCycleMs ─ */

  useEffect(() => {
    if (!debugCycleEnabled) return;

    const SEQ: ScannerState[] = [
      "idle",
      "artwork_detected",
      "label_detected",
      "qr_detected",
      "analyzing",
    ];

    // Synthetic detections so each *_detected state has a box to render.
    const synth: Record<Exclude<DetectionTarget, "none">, Detection> = {
      artwork: { id: "dbg-art", target: "artwork", x: 14, y: 18, w: 58, h: 44, confidence: 0.91 },
      label:   { id: "dbg-lbl", target: "label",   x: 12, y: 65, w: 38, h: 11, confidence: 0.86 },
      qr:      { id: "dbg-qr",  target: "qr",      x: 64, y: 58, w: 24, h: 22, confidence: 0.97 },
    };

    let i = 0;
    const apply = () => {
      const s = SEQ[i % SEQ.length];
      setScanState(s);
      if (s === "artwork_detected") { setRawDetections([synth.artwork]); setLockedDetection(synth.artwork); }
      else if (s === "label_detected")   { setRawDetections([synth.label]);   setLockedDetection(synth.label);   }
      else if (s === "qr_detected")      { setRawDetections([synth.qr]);      setLockedDetection(synth.qr);      }
      else if (s === "idle")             { setRawDetections([]);              setLockedDetection(null);          }
      // analyzing — keep last locked detection so the box stays on screen
      i++;
    };
    apply();
    const id = setInterval(apply, debugCycleMs);
    return () => clearInterval(id);
  }, [debugCycleEnabled, debugCycleMs]);

  /* ── 10. Retry ────────────────────────────────────────────────────── */

  const retry = useCallback(() => {
    setRawDetections([]);
    setLockedDetection(null);
    setScanState("idle");
  }, []);

  /* ── 11. Flash ────────────────────────────────────────────────────── */

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (track as any).applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn(f => !f);
    } catch {
      /* torch unsupported */
    }
  }, [flashOn]);

  /* ── 12. What the UI renders ──────────────────────────────────────── */

  const isLockedOrAfter =
    scanState !== "idle" && scanState !== "failed";

  const detections = isLockedOrAfter
    ? (lockedDetection ? [lockedDetection] : [])
    : liveDetections;

  const primary = isLockedOrAfter ? lockedDetection : livePrimary;

  return {
    cameraStatus,
    scanState,
    detections,
    primary,
    analyzeLabel,
    flashOn,
    lowLight,
    realDetection,
    videoRef,
    retry,
    toggleFlash,
  };
}
