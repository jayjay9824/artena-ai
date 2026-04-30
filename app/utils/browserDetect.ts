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
    ua.includes("line/")
  );
}
