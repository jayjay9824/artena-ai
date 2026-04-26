/**
 * Detection service — the seam where mock vs. real CV/QR backends plug in.
 *
 * DetectionService.subscribe(callback) emits the *current* set of detections
 * each tick. Returns an unsubscribe fn. The hook owns confidence jitter and
 * lock thresholds — services just publish raw boxes.
 */

import type { Detection } from "./types";

export type DetectionListener = (detections: Detection[]) => void;

export interface DetectionService {
  subscribe(listener: DetectionListener): () => void;
}

/* ── Mock service ───────────────────────────────────────────────────── */

interface MockTick {
  /** Time offset from start in ms */
  t: number;
  detections: Detection[];
}

const DEFAULT_TIMELINE: MockTick[] = [
  // 0.5s — weak label candidate appears
  {
    t: 500,
    detections: [
      { id: "lbl", target: "label", x: 12, y: 65, w: 38, h: 11, confidence: 0.58 },
    ],
  },
  // 1.1s — artwork enters
  {
    t: 1100,
    detections: [
      { id: "art", target: "artwork", x: 14, y: 18, w: 58, h: 44, confidence: 0.71 },
      { id: "lbl", target: "label",   x: 12, y: 65, w: 38, h: 11, confidence: 0.65 },
    ],
  },
  // 1.7s — QR appears (will win on type priority)
  {
    t: 1700,
    detections: [
      { id: "art", target: "artwork", x: 14, y: 18, w: 58, h: 44, confidence: 0.78 },
      { id: "lbl", target: "label",   x: 12, y: 65, w: 38, h: 11, confidence: 0.72 },
      { id: "qr",  target: "qr",      x: 64, y: 58, w: 24, h: 22, confidence: 0.86 },
    ],
  },
  // 2.3s — QR locks
  {
    t: 2300,
    detections: [
      { id: "art", target: "artwork", x: 14, y: 18, w: 58, h: 44, confidence: 0.81 },
      { id: "lbl", target: "label",   x: 12, y: 65, w: 38, h: 11, confidence: 0.74 },
      { id: "qr",  target: "qr",      x: 64, y: 58, w: 24, h: 22, confidence: 0.94 },
    ],
  },
];

export class MockDetectionService implements DetectionService {
  private timeline: MockTick[];

  constructor(timeline: MockTick[] = DEFAULT_TIMELINE) {
    this.timeline = timeline;
  }

  subscribe(listener: DetectionListener): () => void {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Emit empty on subscribe so listener clears prior state
    listener([]);
    for (const tick of this.timeline) {
      timers.push(setTimeout(() => listener(tick.detections), tick.t));
    }
    return () => { timers.forEach(clearTimeout); };
  }
}

/* ── Future plug-points ─────────────────────────────────────────────── */
/*
 * class WebQRService implements DetectionService { ... }   // jsQR / BarcodeDetector
 * class VisionAPIService implements DetectionService { ... } // server-side inference
 *
 * The hook accepts any DetectionService, so adding real detection later
 * is a one-line swap at the call site.
 */
