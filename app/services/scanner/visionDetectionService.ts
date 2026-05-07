/**
 * Vision (artwork) detection — STEP 2.
 *
 * Placeholder. The real detector will run a small on-device CV model
 * (or a lightweight Anthropic vision call) — wiring lands in a later
 * step. For now the mock emits a single artwork detection on demand.
 */

import type { ScannerDetection, ScannerDetector } from "./types";

export class MockVisionDetector implements ScannerDetector {
  private listener: ((d: ScannerDetection) => void) | null = null;

  start(onDetect: (d: ScannerDetection) => void): void {
    this.listener = onDetect;
  }

  stop(): void {
    this.listener = null;
  }

  emit(confidence = 0.82): void {
    this.listener?.({ target: "artwork", confidence });
  }
}

export function createVisionDetector(forceMock = false): ScannerDetector {
  void forceMock;
  return new MockVisionDetector();
}
