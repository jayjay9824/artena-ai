/**
 * STEP 4 — Async scanner event logger.
 *
 * Fire-and-forget. Today this just emits a console.debug line so the
 * events are visible in dev; production should swap the body for a
 * real analytics pipe (Segment / mixpanel / internal endpoint) by
 * editing this single function.
 */

export type ScannerEvent =
  | "scanner_opened"
  | "camera_permission_requested"
  | "camera_permission_granted"
  | "camera_permission_denied"
  | "detection_started"
  | "artwork_detected"
  | "label_detected"
  | "qr_detected"
  | "target_locked"
  | "detection_failed"
  | "fallback_selected"
  | "quick_view_generated"
  /* Confirm-before-analyze gate. Tracks whether the user actively
     opted into analysis vs. recomposed and rescanned. */
  | "user_confirmed_analyze"
  | "user_rescan_requested";

export function logScannerEvent(
  event: ScannerEvent,
  meta?: Record<string, unknown>,
): void {
  // Async fire-and-forget — never block the caller.
  Promise.resolve().then(() => {
    if (typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.debug("[scanner]", event, meta ?? {});
    }
  });
}
