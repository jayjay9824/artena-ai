/**
 * Detection logic — primary-target resolution + active-area filter.
 *
 * Used by the scanner state machine to:
 *   1. Filter out detections that don't sit inside the camera's
 *      central active area (so a sticker on the corner of the
 *      frame doesn't trigger a lock).
 *   2. Filter out low-confidence detections (under 50).
 *   3. Resolve a single primary target with stable priority:
 *
 *          artwork  →  label  →  qr  →  none
 *
 *      This matches the global rule (artwork-first) — when an
 *      artwork and a QR are both visible, we lock on the artwork.
 *      The QR / label remain in `filterValidDetections` output for
 *      rendering, but only the primary drives state.
 *
 * Coordinate system:
 *   All BoundingBox values are expected in NORMALIZED 0-1
 *   viewport coordinates — `x`/`y` is the top-left corner,
 *   `width`/`height` extends right/down. Producers (the vision
 *   model adapter, the QR decoder bridge) are responsible for
 *   normalizing pixel coords before calling here.
 *
 * Pure functions, no side effects, server-safe + client-safe.
 */

import type { BoundingBox, DetectionResult, DetectionTarget } from "../types/scanner";

/* ── Constants ─────────────────────────────────────────────── */

/** Minimum detection confidence to even be considered. 0-100. */
export const MIN_CONFIDENCE = 50;

/**
 * Center of the viewport where the user has framed the subject.
 * 60% wide × 60% tall, offset 20% from each edge — this is the
 * area users instinctively aim at; anything overlapping this
 * region is "what they're showing the camera".
 */
export const ACTIVE_AREA: BoundingBox = {
  x:      0.20,
  y:      0.20,
  width:  0.60,
  height: 0.60,
};

/**
 * A detection is "in the active area" if at least 25% of its OWN
 * bounding box overlaps with ACTIVE_AREA. Using box-relative ratio
 * (not absolute area) means a large artwork that fills most of the
 * frame still validates — the ACTIVE_AREA sits comfortably inside
 * its bounds. Edge-only stickers / corner artifacts have very
 * little of themselves over the center, so they fall under 0.25
 * and get rejected.
 */
export const MIN_INTERSECTION_RATIO = 0.25;

/* ── Geometry ──────────────────────────────────────────────── */

/**
 * Returns intersectionArea / boundingBoxArea — i.e. how much of
 * the detection's box sits inside the given activeArea.
 *
 *   ratio = 1.00  → box is fully inside activeArea (or coincides).
 *   ratio = 0.50  → half of box is inside.
 *   ratio = 0.00  → no overlap (also returned when box has zero
 *                   area, to avoid divide-by-zero).
 *
 * Note: this is asymmetric. A huge box surrounding a small
 * activeArea returns activeArea_size / box_size — a small number,
 * which is fine: a very-large detection covers everything and is
 * mostly OUTSIDE the center region. The artwork case still
 * succeeds because real artwork detection boxes track the
 * artwork's extent, not the entire frame.
 */
export function getIntersectionRatio(
  box:        BoundingBox,
  activeArea: BoundingBox,
): number {
  const boxArea = box.width * box.height;
  if (boxArea <= 0) return 0;

  // Edges of the overlap rectangle.
  const left   = Math.max(box.x,                   activeArea.x);
  const top    = Math.max(box.y,                   activeArea.y);
  const right  = Math.min(box.x + box.width,       activeArea.x + activeArea.width);
  const bottom = Math.min(box.y + box.height,      activeArea.y + activeArea.height);

  const overlapWidth  = right  - left;
  const overlapHeight = bottom - top;
  if (overlapWidth <= 0 || overlapHeight <= 0) return 0;

  return (overlapWidth * overlapHeight) / boxArea;
}

/**
 * True when the box overlaps the active area enough to count.
 * Spec rule: ratio ≥ MIN_INTERSECTION_RATIO.
 */
export function isInActiveArea(box: BoundingBox): boolean {
  return getIntersectionRatio(box, ACTIVE_AREA) >= MIN_INTERSECTION_RATIO;
}

/* ── Filtering + priority resolution ───────────────────────── */

/**
 * Drop detections that:
 *   - have confidence below the floor (50), OR
 *   - sit at the edge of the frame (intersection ratio < 0.25)
 *
 * Returns the surviving list. Caller can render these as boxes —
 * the spec says "keep all valid detections available for
 * rendering. Only primary target is used for state/lock."
 */
export function filterValidDetections(
  detections: DetectionResult[],
): DetectionResult[] {
  return detections.filter(d =>
    d.confidence >= MIN_CONFIDENCE
    && isInActiveArea(d.boundingBox),
  );
}

/**
 * Pick the primary target among valid detections.
 *
 * Priority (Phase 2 spec, matches global Camera Stability rule):
 *   1. artwork
 *   2. label
 *   3. qr
 *   4. none  (no valid detection of any target)
 *
 * Hard chain — if any artwork detection passes the filter, the
 * primary is "artwork", regardless of how many labels or QRs are
 * also visible. This is the "artwork-first" routing the global
 * rule encodes.
 */
export function resolvePrimaryTarget(
  detections: DetectionResult[],
): DetectionTarget {
  const valid = filterValidDetections(detections);
  if (valid.length === 0) return "none";

  if (valid.some(d => d.target === "artwork")) return "artwork";
  if (valid.some(d => d.target === "label"))   return "label";
  if (valid.some(d => d.target === "qr"))      return "qr";

  return "none";
}
