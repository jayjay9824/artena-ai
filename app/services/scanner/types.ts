/**
 * Scanner service-layer types — shared by every detector.
 *
 * Keeps the four service files (qr / label / vision / priority) free
 * to evolve their own internals while the hook contract stays stable.
 */

import type { DetectionTarget } from "../../types/scanner";

export type ConcreteTarget = Exclude<DetectionTarget, "none">;

export interface ScannerDetection {
  target:      ConcreteTarget;
  /** Confidence on a 0..1 scale. UI converts to 0..100 for display. */
  confidence:  number;
  /** Optional decoded payload — e.g. QR text. */
  data?:       string;
}

/** Common detector contract — start emits, stop tears down. */
export interface ScannerDetector {
  start(onDetect: (d: ScannerDetection) => void): void;
  stop(): void;
}
