"use client";

/**
 * useDetectionHandler — top-level scanner hook.
 *
 * Wires Phase 1-4 modules together:
 *
 *   handleFrame(detections)
 *     ┌─ filterValidDetections + resolvePrimaryTarget
 *     │     (Phase 2 — confidence ≥ 50, intersection ≥ 0.25,
 *     │     priority artwork → label → qr)
 *     │
 *     ├─ FrameBuffer.push (Phase 3 — metadata-only sliding
 *     │     window; never carries imageBase64)
 *     │
 *     ├─ FrameBuffer.getStableTarget (5-frame stability with
 *     │     500 ms decay)
 *     │
 *     ├─ haptic on stable lock (navigator.vibrate, silent fail)
 *     │
 *     ├─ scannerState transition with 500 ms lock window:
 *     │     stable → artwork_detected / label_detected / qr_detected
 *     │            (lockMs)
 *     │            → analyzing      (artwork or label)
 *     │            → qr_action_required (qr alone)
 *     │
 *     └─ frameBuffer.clear() at the end of the lock window
 *
 *   forceCapture(imageBase64?)
 *     - Records a SessionScan via ScanSessionManager.addScan
 *       (Phase 4). The ONLY entry-point that persists imageBase64.
 *     - Used by:
 *         (a) auto-flow once state reaches "analyzing" — caller
 *             grabs the frame from the video and calls this
 *         (b) manual capture button
 *         (c) "continue" tap inside the QR action sheet
 *
 *   cancelScan()
 *     - Drops the lock, clears the frame buffer, cancels the
 *       active session.
 *
 *   getMergedContext / completeSession
 *     - Pass-through to the internally-owned ScanSessionManager
 *       so callers can drive the multi-scan UX without
 *       instantiating their own.
 *
 * Cleanup contract (per spec rule 12):
 *   On hook unmount:
 *     - clear lock timer
 *     - clear frame buffer
 *     - cancel active session
 *     - release lock state
 *   No timer keeps running, no session leaks across navigations.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DetectionResult,
  DetectionTarget,
  FrameSnapshot,
  ScannerState,
  SessionScan,
} from "../types/scanner";
import {
  filterValidDetections,
  resolvePrimaryTarget,
} from "../utils/detectionLogic";
import { FrameBuffer } from "../utils/frameBuffer";
import {
  ScanSessionManager,
  type MergedScanContext,
} from "../services/scanSession";

const LOCK_DURATION_MS = 500;
const HAPTIC_MS        = 30;

export interface DetectionHandlerOptions {
  /** Fired the moment a stable target enters the lock window
   *  (artwork_detected / label_detected / qr_detected). Useful
   *  for visual / haptic accents on the caller side. */
  onTargetLocked?:    (target: DetectionTarget) => void;
  /** Fired when the lock window finishes and state becomes
   *  "analyzing". Caller grabs imageBase64 from its video ref
   *  and follows up with forceCapture(imageBase64). */
  onAnalyzing?:       (target: DetectionTarget) => void;
  /** Fired when state becomes "qr_action_required". Caller
   *  surfaces the action sheet (continue / scan again / cancel)
   *  per the global "do not auto-open external QR" rule. */
  onQRActionRequired?: () => void;
  /** Fired after a scan is recorded via forceCapture. */
  onScanRecorded?:     (scan: SessionScan) => void;
}

export interface DetectionHandlerResult {
  scannerState:   ScannerState;
  primaryTarget:  DetectionTarget;
  isLocked:       boolean;

  handleFrame:    (detections: DetectionResult[]) => void;
  forceCapture:   (imageBase64?: string) => void;
  cancelScan:     () => void;

  /* Session pass-throughs (single source of truth lives in this
   * hook so callers don't double-instantiate ScanSessionManager). */
  getMergedContext: () => MergedScanContext | null;
  completeSession:  () => void;
}

export function useDetectionHandler(
  options: DetectionHandlerOptions = {},
): DetectionHandlerResult {
  const [scannerState,  setScannerState]  = useState<ScannerState>("idle");
  const [primaryTarget, setPrimaryTarget] = useState<DetectionTarget>("none");
  const [isLocked,      setIsLocked]      = useState(false);

  /* Persistent module instances — one per hook lifetime.
   * useState's initializer fn pattern guarantees single
   * construction even under React strict-mode double-mount. */
  const [frameBuffer]    = useState(() => new FrameBuffer());
  const [sessionManager] = useState(() => new ScanSessionManager());

  /* Mirror state into refs so the timer-driven callbacks can read
   * the latest values without recreating themselves on every
   * render. */
  const isLockedRef      = useRef(false);
  const primaryTargetRef = useRef<DetectionTarget>("none");
  const lockTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Latest options snapshot — handlers below read from this ref so
   * they stay stable across renders. */
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; }, [options]);

  const updatePrimaryTarget = useCallback((t: DetectionTarget) => {
    primaryTargetRef.current = t;
    setPrimaryTarget(t);
  }, []);

  const updateLocked = useCallback((b: boolean) => {
    isLockedRef.current = b;
    setIsLocked(b);
  }, []);

  /* ── handleFrame ──────────────────────────────────────────── */

  const handleFrame = useCallback((detections: DetectionResult[]) => {
    // Rule 5 — during lock, ignore new detections.
    if (isLockedRef.current) return;

    const valid   = filterValidDetections(detections);
    const primary = resolvePrimaryTarget(detections);

    // Frame buffer entry: METADATA ONLY. push() in Phase 3 strips
    // any unexpected fields defensively — even if a producer tries
    // to sneak imageBase64 through, it's discarded before storage.
    const snapshot: FrameSnapshot = {
      detections:    valid,
      primaryTarget: primary,
      capturedAt:    Date.now(),
    };
    frameBuffer.push(snapshot);

    const stable = frameBuffer.getStableTarget();

    if (stable === "none") {
      updatePrimaryTarget("none");
      setScannerState(prev => (prev === "idle" ? "detecting" : prev));
      return;
    }

    // Stable target — start the 500 ms lock window.
    updatePrimaryTarget(stable);
    updateLocked(true);

    setScannerState(
      stable === "artwork" ? "artwork_detected"
      : stable === "label" ? "label_detected"
      :                      "qr_detected",
    );

    // Rule 7 — haptic on stable detection.
    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(HAPTIC_MS);
      }
    } catch { /* unsupported device — silent */ }

    optionsRef.current.onTargetLocked?.(stable);

    // Lock window — after 500 ms, clear the buffer and transition.
    // Rules 6 + 8 + 9.
    lockTimerRef.current = setTimeout(() => {
      frameBuffer.clear();

      if (stable === "qr") {
        // Rule 9 — QR alone never auto-routes; user must opt in.
        setScannerState("qr_action_required");
        optionsRef.current.onQRActionRequired?.();
      } else {
        // Rule 8 — artwork / label proceed automatically.
        setScannerState("analyzing");
        optionsRef.current.onAnalyzing?.(stable);
      }

      lockTimerRef.current = null;
      // isLocked stays true — caller resolves via forceCapture or
      // cancelScan. New handleFrame calls keep being ignored until
      // resolution.
    }, LOCK_DURATION_MS);
  }, [frameBuffer, updateLocked, updatePrimaryTarget]);

  /* ── forceCapture ─────────────────────────────────────────── */

  const forceCapture = useCallback((imageBase64?: string) => {
    // Cancel any in-flight lock timer (e.g. user taps manual
    // capture during the 500 ms window).
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }

    const target =
      primaryTargetRef.current !== "none"
        ? primaryTargetRef.current
        : "artwork";   // manual capture without prior detection
                       // defaults to artwork (the highest-priority
                       // target per the global rule)

    const detections = frameBuffer.getLatestDetections();

    const scan = sessionManager.addScan({
      primaryTarget: target,
      detections,
      imageBase64,
    });

    // Reset frame state for the next scan in this session.
    frameBuffer.clear();
    updateLocked(false);
    updatePrimaryTarget("none");

    if (scan) {
      setScannerState("success");
      optionsRef.current.onScanRecorded?.(scan);
    } else {
      // Session cap (5) reached — caller can detect via
      // getMergedContext().totalScans and surface a hint.
      setScannerState("idle");
    }
  }, [frameBuffer, sessionManager, updateLocked, updatePrimaryTarget]);

  /* ── cancelScan ───────────────────────────────────────────── */

  const cancelScan = useCallback(() => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    frameBuffer.clear();
    sessionManager.cancelSession();
    updateLocked(false);
    updatePrimaryTarget("none");
    setScannerState("cancelled");
  }, [frameBuffer, sessionManager, updateLocked, updatePrimaryTarget]);

  /* ── Session pass-throughs ─────────────────────────────────── */

  const getMergedContext = useCallback(
    (): MergedScanContext | null => sessionManager.getMergedContext(),
    [sessionManager],
  );

  const completeSession = useCallback(() => {
    sessionManager.completeSession();
  }, [sessionManager]);

  /* ── Unmount cleanup (rule 12) ────────────────────────────── */

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
        lockTimerRef.current = null;
      }
      frameBuffer.clear();
      sessionManager.cancelSession();
      isLockedRef.current      = false;
      primaryTargetRef.current = "none";
    };
    // frameBuffer + sessionManager are stable refs from useState,
    // so the empty-deps array is correct here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    scannerState,
    primaryTarget,
    isLocked,
    handleFrame,
    forceCapture,
    cancelScan,
    getMergedContext,
    completeSession,
  };
}
