/**
 * STEP 3 — QR purpose classifier + URL sanitizer.
 *
 * Pure helpers, no UI. The scanner uses these to decide whether a
 * decoded QR should:
 *   • flow into the report pipeline (artwork / exhibition),
 *   • surface a notice + fallback actions (app stores / guides),
 *   • be flagged as unknown and never auto-trusted.
 *
 * Trust over fancy: we never auto-open native browsers, never
 * follow non-http(s) protocols, and never route an app-download QR
 * into a report.
 */

import type { QRPurpose, QRDetection } from "../../types/scanner";

/* ── Detection patterns ───────────────────────────────────────── */

const RE_APPLE_APP    = /(apps\.apple\.com|itunes\.apple\.com|apple\.com\/app)/i;
const RE_ANDROID_APP  = /(play\.google\.com|market:\/\/)/i;
const RE_MUSEUM_GUIDE = /(\bguide\b|\baudio\b|\bapp\b|\bmuseum\b|\bcollection\b|\btour\b)/i;
const RE_ARTWORK_INFO = /(\bartwork\b|\bwork\b|\bobject\b|\bcollection-item\b|\baccession\b|\btitle\b|\bartist\b)/i;
const RE_EXHIBITION   = /(\bexhibition\b|\bshow\b|\bbooth\b|\bgallery\b)/i;

/**
 * Classify a decoded QR payload by purpose. App-store URLs are
 * caught first because they would otherwise match the broader
 * museum-guide regex via the word "app". Artwork wins over museum
 * for ambiguous strings.
 */
export function detectQRPurpose(payload: string): QRPurpose {
  if (!payload) return "unknown";
  const p = payload.trim();
  if (RE_APPLE_APP.test(p))    return "ios_app";
  if (RE_ANDROID_APP.test(p))  return "android_app";
  if (RE_ARTWORK_INFO.test(p)) return "artwork_info";
  if (RE_EXHIBITION.test(p))   return "exhibition_info";
  if (RE_MUSEUM_GUIDE.test(p)) return "museum_guide";
  return "unknown";
}

/* ── Priority + sort ──────────────────────────────────────────── */

/** Higher number wins. Spec ordering. */
export const QR_PURPOSE_PRIORITY: Record<QRPurpose, number> = {
  artwork_info:    5,
  exhibition_info: 4,
  museum_guide:    3,
  ios_app:         2,
  android_app:     2,
  unknown:         1,
};

/** Stable sort, highest priority first. */
export function sortByQRPriority(detections: QRDetection[]): QRDetection[] {
  return [...detections].sort(
    (a, b) => QR_PURPOSE_PRIORITY[b.purpose] - QR_PURPOSE_PRIORITY[a.purpose],
  );
}

/** The single best QR to act on. */
export function pickPriorityQR(detections: QRDetection[]): QRDetection | null {
  if (detections.length === 0) return null;
  return sortByQRPriority(detections)[0];
}

/* ── Routing predicates ───────────────────────────────────────── */

/**
 * Only artwork / exhibition QRs feed the analyze pipeline. App and
 * guide QRs surface a notice; unknown QRs fall back to the manual
 * scan flow. Spec: "route only if purpose is artwork_info or
 * exhibition_info".
 */
export function isAnalyzableQR(purpose: QRPurpose): boolean {
  return purpose === "artwork_info" || purpose === "exhibition_info";
}

/**
 * App-download QRs must never produce a report or auto-open the
 * native store URL.
 */
export function isAppQR(purpose: QRPurpose): boolean {
  return purpose === "ios_app" || purpose === "android_app";
}

/* ── URL sanitizer ────────────────────────────────────────────── */

export interface SanitizedURL {
  url:  string | null;
  safe: boolean;
}

/**
 * Strict URL sanitizer.
 *
 *   • Allows http / https only.
 *   • Rejects data:, javascript:, file:, market:, intent:, etc.
 *   • Returns `safe: false` when parsing fails.
 *
 * Callers must treat `safe: false` as untrusted — never feed the
 * payload into fetch, navigate, or window.open.
 */
export function sanitizeQRUrl(payload: string): SanitizedURL {
  if (!payload) return { url: null, safe: false };
  const trimmed = payload.trim();
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { url: null, safe: false };
    }
    return { url: u.toString(), safe: true };
  } catch {
    return { url: null, safe: false };
  }
}
