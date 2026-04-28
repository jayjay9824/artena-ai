"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ScannerState, DetectionTarget } from "../../types/scanner";

interface UseSmartScannerOptions {
  /**
   * STEP 2 — when true, the hook walks the canonical mock timeline
   * (idle → detecting → artwork_detected → label_detected →
   * qr_detected → locking → analyzing → success). All timers and
   * the confidence jitter interval are torn down on unmount, on
   * reset(), or when this flag toggles back to false.
   */
  mockDetectionEnabled?: boolean;
  /**
   * STEP 4 — when mock detection is OFF, transition to "failed"
   * after this many ms with no lock. Default 5000ms per spec.
   * Ignored when mockDetectionEnabled is true (the cycle handles
   * its own pacing and always succeeds).
   */
  failTimeoutMs?: number;
}

interface UseSmartScannerReturn {
  scannerState:       ScannerState;
  detectionTarget:    DetectionTarget;
  /** 0..100 — UI displays one decimal place. Frozen once locking starts. */
  confidence:         number;
  setScannerState:    (s: ScannerState) => void;
  setDetectionTarget: (t: DetectionTarget) => void;
  /** Reset to canonical idle state — used on screen close / retry. */
  reset:              () => void;
  /**
   * PART 2 — invisible tap-to-capture path. Caller fires this when
   * the user taps the screen after a long detecting window. Walks
   * locking → success quickly so the lock haptic still fires.
   */
  forceCapture:       () => void;
}

/* ── Mock timeline ────────────────────────────────────────────────── */

interface MockStep {
  state:  ScannerState;
  target: DetectionTarget;
  /** ms since cycle start. */
  delay:  number;
}

const MOCK_TIMELINE: MockStep[] = [
  { state: "detecting",        target: "none",    delay: 600  },
  { state: "artwork_detected", target: "artwork", delay: 1200 },
  { state: "label_detected",   target: "label",   delay: 1700 },
  { state: "qr_detected",      target: "qr",      delay: 2200 },
  { state: "locking",          target: "qr",      delay: 2700 },
  // PART 2 — 0.3s hold from locking → success (auto-capture). Skip
  // the analyzing state visually; the spatial transition that follows
  // covers the report-build moment without a spinner.
  { state: "success",          target: "qr",      delay: 3000 },
];

/** States during which confidence jitters between 70 and 95. */
const JITTER_STATES = new Set<ScannerState>([
  "detecting",
  "artwork_detected",
  "label_detected",
  "qr_detected",
]);

const CONFIDENCE_MIN = 70;
const CONFIDENCE_MAX = 95;

/* ── Hook ─────────────────────────────────────────────────────────── */

export function useSmartScanner(opts: UseSmartScannerOptions = {}): UseSmartScannerReturn {
  const { mockDetectionEnabled = false, failTimeoutMs = 5000 } = opts;

  const [scannerState,    setScannerState]    = useState<ScannerState>("idle");
  const [detectionTarget, setDetectionTarget] = useState<DetectionTarget>("none");
  const [confidence,      setConfidence]      = useState(0);
  const [cycleId,         setCycleId]         = useState(0);

  // Track every active timer/interval so they can be cleared safely
  // from any teardown path (unmount, reset, flag flip).
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* Mock state timeline. Re-runs on cycleId bump (reset) or flag flip. */
  useEffect(() => {
    if (!mockDetectionEnabled) return;

    // Each cycle starts at idle so reset() is observable.
    setScannerState("idle");
    setDetectionTarget("none");
    setConfidence(0);

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const step of MOCK_TIMELINE) {
      const t = setTimeout(() => {
        setScannerState(step.state);
        setDetectionTarget(step.target);
      }, step.delay);
      timers.push(t);
    }
    timersRef.current = [...timersRef.current, ...timers];

    return () => {
      timers.forEach(clearTimeout);
      timersRef.current = timersRef.current.filter(t => !timers.includes(t));
    };
  }, [mockDetectionEnabled, cycleId]);

  /* Confidence jitter — only while a detection state is active.
     Spec: 70..95, one decimal, subtle motion. Frozen on locking+. */
  useEffect(() => {
    if (!JITTER_STATES.has(scannerState)) {
      // Seed once on entry into a freezing state so the UI has a
      // sensible final number to display.
      if (scannerState === "locking" || scannerState === "analyzing" || scannerState === "success") {
        setConfidence(c => (c === 0 ? 92 : c));
      }
      return;
    }

    // Initial seed so the first frame renders inside the band.
    setConfidence(c => (c < CONFIDENCE_MIN || c > CONFIDENCE_MAX ? 84 : c));

    const id = setInterval(() => {
      setConfidence(c => {
        // Smooth random walk inside the band — feels live, no jumps.
        const target = CONFIDENCE_MIN + Math.random() * (CONFIDENCE_MAX - CONFIDENCE_MIN);
        const next   = c + (target - c) * 0.28;
        return Math.max(CONFIDENCE_MIN, Math.min(CONFIDENCE_MAX, next));
      });
    }, 220);

    return () => clearInterval(id);
  }, [scannerState]);

  /* STEP 4 — fail-timeout when running real detection. Mock cycle
     handles its own pacing and always succeeds, so the timer is
     skipped while mockDetectionEnabled is true. */
  useEffect(() => {
    if (mockDetectionEnabled) return;
    if (scannerState !== "idle" && scannerState !== "detecting") return;
    const t = setTimeout(() => {
      setScannerState(s => (s === "idle" || s === "detecting" ? "failed" : s));
    }, failTimeoutMs);
    return () => clearTimeout(t);
  }, [mockDetectionEnabled, scannerState, failTimeoutMs]);

  /* Hard cleanup on unmount — safety net beyond the effect cleanups. */
  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const reset = useCallback(() => {
    // Bumping cycleId triggers the mock effect's cleanup → restart.
    setCycleId(id => id + 1);
  }, []);

  const forceCapture = useCallback(() => {
    setDetectionTarget("artwork");
    setScannerState("locking");
    const t = setTimeout(() => setScannerState("success"), 300);
    timersRef.current.push(t);
  }, []);

  return {
    scannerState,
    detectionTarget,
    confidence,
    setScannerState,
    setDetectionTarget,
    reset,
    forceCapture,
  };
}
