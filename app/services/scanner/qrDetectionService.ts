/**
 * QR detection — STEP 2.
 *
 * Real path: navigator's BarcodeDetector API (Chromium / Safari TP).
 * Mock path: emit() driven by the caller (used by mock cycle).
 *
 * We isolate QR logic here so STEP 3 can swap the mock for the real
 * detector without touching the hook or the screen.
 */

import type { ScannerDetection, ScannerDetector } from "./types";

/* ── Real BarcodeDetector wrapper ───────────────────────────────── */

export class BarcodeDetectorQR implements ScannerDetector {
  static isSupported(): boolean {
    return typeof window !== "undefined" && "BarcodeDetector" in window;
  }

  private rafId: number | null = null;
  private listener: ((d: ScannerDetection) => void) | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private detector: any | null = null;
  private videoRef: React.RefObject<HTMLVideoElement | null>;

  constructor(videoRef: React.RefObject<HTMLVideoElement | null>) {
    if (!BarcodeDetectorQR.isSupported()) {
      throw new Error("BarcodeDetector not supported");
    }
    this.videoRef = videoRef;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
  }

  start(onDetect: (d: ScannerDetection) => void): void {
    this.listener = onDetect;
    const tick = async () => {
      if (!this.listener) return; // stopped
      const v = this.videoRef.current;
      if (!v || v.readyState < 2) {
        this.rafId = requestAnimationFrame(tick);
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const codes: any[] = await this.detector.detect(v);
        if (codes.length > 0 && this.listener) {
          this.listener({
            target:     "qr",
            confidence: 0.97,
            data:       codes[0].rawValue,
          });
        }
      } catch {
        /* per-frame errors are non-fatal — keep ticking */
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.listener = null;
  }
}

/* ── Mock detector ──────────────────────────────────────────────── */

export class MockQRDetector implements ScannerDetector {
  private listener: ((d: ScannerDetection) => void) | null = null;

  start(onDetect: (d: ScannerDetection) => void): void {
    this.listener = onDetect;
  }

  stop(): void {
    this.listener = null;
  }

  /** Owner-driven emit — mock cycle calls this when it wants a hit. */
  emit(confidence = 0.94, data = "MOCK_QR"): void {
    this.listener?.({ target: "qr", confidence, data });
  }
}

/* ── Factory ────────────────────────────────────────────────────── */

export function createQRDetector(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  forceMock = false,
): ScannerDetector {
  if (!forceMock && BarcodeDetectorQR.isSupported()) {
    try { return new BarcodeDetectorQR(videoRef); } catch { /* fall through */ }
  }
  return new MockQRDetector();
}
