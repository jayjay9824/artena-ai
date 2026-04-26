/**
 * Scanner type definitions — kept narrow on purpose.
 *
 * ScannerState mirrors the spec verbatim. Permission flow is modeled
 * separately as `cameraStatus` on the hook return so the seven scan
 * states stay clean.
 */

export type DetectionTarget = "none" | "artwork" | "label" | "qr";

export type ScannerState =
  | "idle"
  | "artwork_detected"
  | "label_detected"
  | "qr_detected"
  | "analyzing"
  | "success"
  | "failed";

export type CameraStatus = "pending" | "ready" | "denied";

export interface Detection {
  id: string;
  target: Exclude<DetectionTarget, "none">;
  /** Bounding box in % of viewport */
  x: number; y: number; w: number; h: number;
  /** Confidence 0–1 (live, jitters) */
  confidence: number;
}

/** Type-priority ordering: QR > Label > Artwork */
export const TARGET_PRIORITY: Record<Exclude<DetectionTarget, "none">, number> = {
  qr:      3,
  label:   2,
  artwork: 1,
};

export function pickPrimary(detections: Detection[]): Detection | null {
  if (detections.length === 0) return null;
  return detections.reduce((best, d) => {
    const bp = TARGET_PRIORITY[best.target];
    const dp = TARGET_PRIORITY[d.target];
    if (dp !== bp) return dp > bp ? d : best;
    return d.confidence > best.confidence ? d : best;
  }, detections[0]);
}

export function targetToState(t: DetectionTarget): ScannerState {
  if (t === "qr")      return "qr_detected";
  if (t === "label")   return "label_detected";
  if (t === "artwork") return "artwork_detected";
  return "idle";
}
