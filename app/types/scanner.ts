/**
 * AXVELA Camera Intelligence Layer — strict types.
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

/* ── QR purpose dispatch (STEP 3) ──────────────────────────────── */

/**
 * What a decoded QR is for. Only `artwork_info` / `exhibition_info`
 * are routed into the AXVELA report pipeline; the others surface a
 * neutral notice with fallback actions instead of being trusted.
 */
export type QRPurpose =
  | "ios_app"
  | "android_app"
  | "museum_guide"
  | "artwork_info"
  | "exhibition_info"
  | "unknown";

/**
 * One decoded QR. `position` is in viewport % so the AR-style
 * overlay can place its chip directly over the code without extra
 * coordinate gymnastics. Producers convert from BarcodeDetector
 * pixel boxes before populating the field.
 */
export interface QRDetection {
  payload:    string;
  purpose:    QRPurpose;
  position?:  {
    x:      number;
    y:      number;
    width:  number;
    height: number;
  };
  confidence?: number;
}
