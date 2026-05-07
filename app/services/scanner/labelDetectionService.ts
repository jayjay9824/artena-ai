/**
 * Label detection — STEP 2.
 *
 * Placeholder. Real OCR (Tesseract / native iOS Vision) lands in a
 * later step; for now this exposes the mock surface so the cycle can
 * trigger label_detected predictably.
 */

import type { ScannerDetection, ScannerDetector } from "./types";

export class MockLabelDetector implements ScannerDetector {
  private listener: ((d: ScannerDetection) => void) | null = null;

  start(onDetect: (d: ScannerDetection) => void): void {
    this.listener = onDetect;
  }

  stop(): void {
    this.listener = null;
  }

  emit(confidence = 0.86): void {
    this.listener?.({ target: "label", confidence });
  }
}

export function createLabelDetector(forceMock = false): ScannerDetector {
  // Real label/OCR pipeline isn't wired yet — always mock for now.
  void forceMock;
  return new MockLabelDetector();
}
