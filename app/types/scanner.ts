/**
 * AXVELA Camera Intelligence Layer — strict types.
 *
 * Powers SmartScannerScreen + scanner hooks. Phase 1 of the
 * Camera Stability Final pass adds:
 *
 *   • DetectionSource           — which subsystem produced a hit
 *   • QRType                    — AXVELA-domain QR taxonomy
 *   • BoundingBox + DetectionResult — per-frame metadata
 *   • FrameSnapshot             — *metadata-only* frame record
 *                                 (NEVER contains imageBase64)
 *   • SessionScan + ScanSession — multi-scan session model
 *                                 (imageBase64 lives ONLY here)
 *
 * The old types (ScanSuccessPayload, CameraPermission,
 * DETECTION_PRIORITY, QRPurpose, QRDetection) are kept verbatim —
 * the existing scanner UI imports them and "do not redesign
 * unrelated UI" rule means we don't touch them this phase.
 */

/* ── Detection target / priority ────────────────────────────── */

export type DetectionTarget =
  | "none"
  | "artwork"
  | "label"
  | "qr";

/** Detection priority — higher number wins on conflict. Spec
 *  priority for the Camera Stability Final pass:
 *    artwork (1)  →  label (2)  →  qr (3)
 *  This mirrors what the router will pick from a noisy frame:
 *  QR is the most specific signal and wins, label is the next,
 *  artwork is the fallback. */
export const DETECTION_PRIORITY: Record<Exclude<DetectionTarget, "none">, number> = {
  qr:      3,
  label:   2,
  artwork: 1,
};

/* ── Detection source (Phase 1) ─────────────────────────────── */

/**
 * Which subsystem produced the detection. Used by the router so a
 * cheap mock can substitute for the real model in tests, and by
 * usage analytics so we know whether ocr / vision / qr_decoder
 * fired.
 */
export type DetectionSource =
  | "vision_model"   // image classifier / artwork-edge model
  | "ocr"            // text bounding box → label_detected
  | "qr_decoder"     // BarcodeDetector / zxing
  | "mock";          // test harness / dev mock cycle

/* ── QR taxonomy ────────────────────────────────────────────── */

/**
 * AXVELA-domain QR taxonomy (Phase 1).
 *
 *   axvela_artwork     QR registered to a verified Artwork in our
 *                      registry — bypass Quick View routing
 *                      gracefully (still always Quick View first
 *                      per the global rule, but with the canonical
 *                      record pre-loaded).
 *   axvela_certificate Ownership / provenance certificate QR.
 *   external_url       Any other URL — never auto-opened. The user
 *                      gets a notice sheet, not a route.
 *   unknown            Decoded payload doesn't match any known
 *                      shape. Treated like external_url.
 *
 * Distinct from the older QRPurpose enum below, which classifies
 * by URL pattern (app store, museum guide, etc.). Both coexist —
 * they answer different questions.
 */
export type QRType =
  | "axvela_artwork"
  | "axvela_certificate"
  | "external_url"
  | "unknown";

/* ── Scanner state ──────────────────────────────────────────── */

export type ScannerState =
  | "idle"
  | "detecting"
  | "artwork_detected"
  | "label_detected"
  | "qr_detected"
  | "qr_action_required"   // Phase 1 — QR found but needs explicit user choice
  | "locking"              // legacy — existing scanner UI still references this
  | "analyzing"
  | "success"
  | "failed"
  | "permission_denied"    // Phase 1
  | "cancelled";           // Phase 1

/* ── Geometry + per-frame metadata ─────────────────────────── */

export interface BoundingBox {
  x:      number;
  y:      number;
  width:  number;
  height: number;
}

export interface DetectionResult {
  target:           DetectionTarget;
  source:           DetectionSource;
  boundingBox:      BoundingBox;
  /** 0..100 — vision/QR confidence at detection time. */
  confidence:       number;
  /** OCR-specific confidence when source === "ocr". */
  ocrConfidence?:   number;
  /** Decoded text payload — QR string, OCR text, etc. NEVER
   *  contains image bytes. */
  data?:            string;
  /** Populated only when target === "qr". */
  qrType?:          QRType;
  /** ms since epoch. */
  timestamp:        number;
}

/**
 * Frame buffer entry — METADATA ONLY. Strictly does not carry
 * imageBase64. The buffer can grow arbitrarily large during a
 * session without OOM-ing the browser; the actual capture happens
 * once at lock time and is stored in SessionScan below.
 */
export interface FrameSnapshot {
  detections:    DetectionResult[];
  primaryTarget: DetectionTarget;
  capturedAt:    number;
}

/* ── Session model (imageBase64 lives here only) ──────────── */

export interface SessionScan {
  scanId:        string;
  sequence:      number;
  primaryTarget: DetectionTarget;
  detections:    DetectionResult[];
  /** The captured frame at lock time — base64. This is the ONLY
   *  type in this file allowed to carry image bytes; everything
   *  upstream (FrameSnapshot, DetectionResult) is metadata only. */
  imageBase64?:  string;
  capturedAt:    number;
}

export interface ScanSession {
  sessionId:      string;
  startedAt:      number;
  lastActivityAt: number;
  scans:          SessionScan[];
  status:         "active" | "completed" | "expired" | "cancelled";
}

/* ── Camera permission ──────────────────────────────────────── */

/**
 * Mirrors navigator.permissions.query("camera").
 *
 *   unknown   server render or pre-init; the UI defers any prompt
 *   prompt    we'll need to ask via getUserMedia
 *   granted   ready to start the stream
 *   denied    blocked — surface fallback actions, not a browser error
 */
export type CameraPermission = "unknown" | "prompt" | "granted" | "denied";

/* ── Scanner success payload (legacy — used by SmartScannerScreen) ── */

/**
 * Payload the scanner emits when scannerState reaches "success".
 * The caller routes on `target`:
 *
 *   qr        → QR Intelligence Layer (caller decides the route)
 *   label     → OCR / label extraction → Quick View
 *   artwork   → image analysis → Quick View
 *
 * imageBlob + imageURI carry the frame we captured at lock time
 * so the receiver doesn't re-open the camera.
 */
export interface ScanSuccessPayload {
  target:     Exclude<DetectionTarget, "none">;
  qrData?:    string;
  imageBlob?: Blob;
  imageURI?:  string;
  /** Confidence at lock time, 0..100. */
  confidence: number;
}

/* ── QR purpose dispatch (legacy STEP 3) ────────────────────── */

/**
 * What a decoded QR is for. Only `artwork_info` / `exhibition_info`
 * are routed into the AXVELA report pipeline; the others surface a
 * neutral notice with fallback actions instead of being trusted.
 *
 * Distinct from QRType (Phase 1) — QRPurpose classifies by URL
 * pattern, QRType classifies by AXVELA-domain semantics. Both
 * coexist on a QRDetection where useful.
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
  payload:     string;
  purpose:     QRPurpose;
  position?:   {
    x:      number;
    y:      number;
    width:  number;
    height: number;
  };
  confidence?: number;
}
