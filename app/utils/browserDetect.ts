/**
 * In-app browser detection.
 *
 * KakaoTalk's in-app browser (and Naver / Instagram / Facebook /
 * LINE) renders pages in a stripped-down WebView that exposes
 * different paint timing, missing CSS features, and aggressive
 * background-color fallbacks. The Intro → Home transition flickers
 * a black ellipse on KakaoTalk specifically because the SCAN
 * shadow is composited before the home background paints.
 *
 * These helpers are read by the root App shell to tag the <html>
 * element with `kakao-inapp` / `inapp-browser` so CSS / JS can
 * branch defensively (e.g. force the dark canvas color earlier,
 * delay shadow composition until home is mounted).
 *
 * SSR-safe — both functions return false when navigator is
 * undefined so they're inert during server render.
 */

export function isKakaoInApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.toLowerCase().includes("kakaotalk");
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return (
    ua.includes("kakaotalk") ||
    ua.includes("naver") ||
    ua.includes("instagram") ||
    ua.includes("fban") ||
    ua.includes("fbav") ||
    ua.includes("line/")
  );
}

/**
 * Probe whether the runtime can actually start a camera stream.
 *
 * Returns false in any of:
 *   - SSR (no navigator)
 *   - Browser without navigator.mediaDevices.getUserMedia
 *   - In-app WebViews (KakaoTalk, Naver, Instagram, FBAN/FBAV, LINE)
 *
 * The in-app branch is conservative on purpose — those WebViews
 * usually expose mediaDevices but fail at the gUM call (or return
 * a black stream). Surfacing the warning BEFORE the user taps a
 * camera-bound UI gives them a path to recover (open in Chrome /
 * Safari, copy link, or upload an image instead).
 */
export async function isCameraSupported(): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  if (isInAppBrowser()) return false;
  return true;
}

/**
 * Bounce the current URL out of the in-app WebView and into the
 * system browser.
 *
 *   KakaoTalk → kakaotalk://web/openExternal?url=…
 *               Custom scheme honored by the KakaoTalk client.
 *   Other in-apps → window.open(url, "_blank") as a soft fallback.
 *                   Most embedded WebViews ignore _blank, but at
 *                   least no error surfaces.
 *
 * Best-effort either way; the caller (warning modal) still offers
 * "copy link" + "upload image" so users have a manual escape if
 * the scheme is silently no-op'd by the OS.
 *
 * The 1s setTimeout reserves a fallback hook for future "show a
 * toast if scheme didn't navigate" surfacing. Left empty today —
 * the manual instructions in the modal carry that responsibility.
 */
export function openInExternalBrowser(): void {
  if (typeof window === "undefined") return;
  const url = window.location.href;

  if (isKakaoInApp()) {
    window.location.href =
      `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
    setTimeout(() => { /* noop — manual instructions live in the modal */ }, 1000);
  } else {
    window.open(url, "_blank");
  }
}
