/**
 * STEP 3 — Best-effort haptic feedback.
 *
 * navigator.vibrate works on most Android browsers and silently
 * no-ops elsewhere (iOS Safari, desktop). Spec: 30ms pulse on the
 * lock transition.
 */

export function tinyHaptic(durationMs = 30): void {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(durationMs);
    }
  } catch {
    /* unsupported / blocked — fail silently */
  }
}
