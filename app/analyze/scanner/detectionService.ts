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

/* ── Real QR detection — native BarcodeDetector ─────────────────────── */
/*
 * Uses the browser's BarcodeDetector API (Chrome / Edge / iOS Safari 17+).
 * Falls back gracefully — `isSupported()` lets the caller pick the
 * MockDetectionService when the API is unavailable (Firefox today).
 *
 * Why this exists: with the mock, the QR badge always lands in the
 * same corner regardless of where the user's actual QR is. Real
 * detection puts the box on the real QR.
 */

interface BarcodeDetectorBoundingBox {
  x: number; y: number; width: number; height: number;
}
interface DetectedBarcode {
  boundingBox: BarcodeDetectorBoundingBox;
  rawValue:    string;
  format:      string;
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): {
    detect(source: HTMLVideoElement | HTMLImageElement): Promise<DetectedBarcode[]>;
  };
}

export class BarcodeDetectionService implements DetectionService {
  private videoRef:   { current: HTMLVideoElement | null };
  private timer:      ReturnType<typeof setInterval> | null = null;
  private intervalMs: number;

  constructor(videoRef: { current: HTMLVideoElement | null }, intervalMs = 250) {
    this.videoRef   = videoRef;
    this.intervalMs = intervalMs;
  }

  /** True if BarcodeDetector is available in this browser. */
  static isSupported(): boolean {
    return typeof window !== "undefined" && "BarcodeDetector" in window;
  }

  subscribe(listener: DetectionListener): () => void {
    if (!BarcodeDetectionService.isSupported()) {
      // Caller should have checked isSupported() — but no-op safely.
      return () => {};
    }

    const Ctor = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
    let detector: { detect(s: HTMLVideoElement | HTMLImageElement): Promise<DetectedBarcode[]> };
    try {
      detector = new Ctor({ formats: ["qr_code"] });
    } catch {
      return () => {};
    }

    let lastSerialized = "";
    let inFlight = false;

    const tick = async () => {
      if (inFlight) return;
      const video = this.videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;

      inFlight = true;
      try {
        const codes = await detector.detect(video);
        if (codes.length === 0) {
          if (lastSerialized !== "[]") {
            lastSerialized = "[]";
            listener([]);
          }
          return;
        }

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const detections: Detection[] = codes.map((c, i) => {
          const bb = c.boundingBox;
          return {
            id:         `qr-${c.rawValue.slice(0, 24) || i}`,
            target:     "qr",
            // Convert pixel bbox to viewport % so the UI overlay scales
            // with the video's object-fit: cover layout.
            x:          (bb.x / vw) * 100,
            y:          (bb.y / vh) * 100,
            w:          (bb.width  / vw) * 100,
            h:          (bb.height / vh) * 100,
            confidence: 0.95,
          };
        });

        // Skip listener calls when the detection set hasn't changed —
        // avoids re-renders during steady tracking.
        const serialized = detections
          .map(d => `${d.id}|${d.x.toFixed(1)},${d.y.toFixed(1)}`)
          .sort()
          .join(";");
        if (serialized !== lastSerialized) {
          lastSerialized = serialized;
          listener(detections);
        }
      } catch {
        /* one-off frame errors are fine — keep ticking */
      } finally {
        inFlight = false;
      }
    };

    // Emit initial empty so the UI clears any prior mock state.
    listener([]);
    this.timer = setInterval(tick, this.intervalMs);
    void tick();

    return () => {
      if (this.timer !== null) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  }
}
