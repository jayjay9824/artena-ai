/**
 * ARTENA Camera Intelligence Layer — strict types.
 *
 * Powers the new SmartScannerScreen + scanner hooks. Kept separate
 * from the legacy app/analyze/scanner/types.ts so the existing
 * SmartScanner keeps working untouched while the new layer is built.
 */

export type ScannerState =
  | "idle"
  | "detecting"
  | "artwork_detected"
  | "label_detected"
  | "qr_detected"
  | "locking"
  | "analyzing"
  | "success"
  | "failed";

export type DetectionTarget =
  | "none"
  | "artwork"
  | "label"
  | "qr";

/** Detection priority — higher number wins on conflict. Spec: QR > Label > Artwork. */
export const DETECTION_PRIORITY: Record<Exclude<DetectionTarget, "none">, number> = {
  qr:      3,
  label:   2,
  artwork: 1,
};

/**
 * Permission status mirrors navigator.permissions.query("camera").
 *
 *   unknown   server render or pre-init; the UI defers any prompt
 *   prompt    we'll need to ask via getUserMedia
 *   granted   ready to start the stream
 *   denied    blocked — surface fallback actions, not a browser error
 */
export type CameraPermission = "unknown" | "prompt" | "granted" | "denied";

/**
 * STEP 4 — Payload the scanner emits when scannerState reaches
 * "success". The caller routes on `target`:
 *
 *   qr        → QR Intelligence Layer (caller decides the route)
 *   label     → OCR / label extraction → Quick View
 *   artwork   → image analysis → Quick View
 *
 * `imageBlob` + `imageURI` carry the frame we captured at the lock
 * moment so the receiver doesn't re-open the camera. `qrData` is
 * populated when STEP 4+ wires the real BarcodeDetector.
 */
export interface ScanSuccessPayload {
  target:     Exclude<DetectionTarget, "none">;
  qrData?:    string;
  imageBlob?: Blob;
  imageURI?:  string;
  /** Confidence at lock time, 0..100. */
  confidence: number;
}
