/**
 * Scanner priority service — STEP 2.
 *
 * Pure picker: given a slice of detections, return the winner by
 * priority (QR > Label > Artwork). Confidence breaks ties within
 * the same target class.
 *
 * Used by the hook in STEP 3 once real detectors run concurrently —
 * STEP 2's mock cycle drives state transitions linearly so the
 * picker isn't on the hot path yet, but the contract is fixed here.
 */

import { DETECTION_PRIORITY } from "../../types/scanner";
import type { ScannerDetection } from "./types";

/**
 * Pick the winner by priority + confidence. Returns null when the
 * input is empty.
 */
export function pickPriorityWinner(detections: ScannerDetection[]): ScannerDetection | null {
  if (detections.length === 0) return null;
  return detections.reduce((best, d) => {
    const bp = DETECTION_PRIORITY[best.target];
    const dp = DETECTION_PRIORITY[d.target];
    if (dp !== bp) return dp > bp ? d : best;
    return d.confidence > best.confidence ? d : best;
  }, detections[0]);
}
