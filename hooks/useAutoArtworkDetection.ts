'use client';

/**
 * Auto artwork detection hook.
 *
 * Today: a deterministic mock that ramps a confidence counter and
 * transitions through the detection states with a stability gate.
 *
 * Future (real implementation, when frame-AI lands):
 *   - sample frames from the <video> at ~10 fps
 *   - run a lightweight detector (bounding-box / saliency / framing
 *     heuristics) per frame and feed the score into a small ring
 *     buffer
 *   - require N consecutive samples above a target threshold for
 *     stability (replace the timestamp gate below)
 *   - blur / lighting checks; lower confidence on motion
 *   - center-active-area weighting so off-screen artworks don't trip
 *
 * The component contract (state + confidence) stays stable across
 * mock and real implementations so AutoScannerView need not change.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type DetectionState =
  | 'idle'
  | 'detecting'
  | 'artwork_detected'
  | 'auto_capturing';

const INTRO_DELAY_MS = 1000;     // user gets a moment to frame the work
const TICK_MS = 100;              // confidence ramp granularity
const TARGET_CONFIDENCE = 80;     // threshold to enter 'artwork_detected'
const STABILITY_MS = 700;         // confidence must hold above target this long
const MAX_CONFIDENCE = 92;        // never claim 100% in mock mode

export function useAutoArtworkDetection() {
  const [state, setState] = useState<DetectionState>('idle');
  const [confidence, setConfidence] = useState(0);

  const introRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stableSinceRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (introRef.current) {
      clearTimeout(introRef.current);
      introRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetDetection = useCallback(() => {
    clearTimers();
    stableSinceRef.current = null;
    setState('idle');
    setConfidence(0);
  }, [clearTimers]);

  const startDetection = useCallback(() => {
    clearTimers();
    stableSinceRef.current = null;
    setState('idle');
    setConfidence(0);

    introRef.current = setTimeout(() => {
      setState('detecting');

      let c = 0;
      intervalRef.current = setInterval(() => {
        // Mock ramp — slightly noisy so the percent doesn't look mechanical.
        c += 5 + Math.random() * 5;
        if (c > MAX_CONFIDENCE) c = MAX_CONFIDENCE;
        const rounded = Math.round(c);
        setConfidence(rounded);

        if (rounded >= TARGET_CONFIDENCE) {
          if (stableSinceRef.current === null) {
            stableSinceRef.current = Date.now();
            setState('artwork_detected');
          } else if (Date.now() - stableSinceRef.current >= STABILITY_MS) {
            setState('auto_capturing');
            clearTimers();
          }
        }
      }, TICK_MS);
    }, INTRO_DELAY_MS);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return { state, confidence, startDetection, resetDetection };
}
