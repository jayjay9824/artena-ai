/**
 * QR classifier — payload → QRType taxonomy.
 *
 * QRType (Phase 1) splits decoded QRs into AXVELA-domain
 * categories vs. anything else:
 *
 *   axvela_artwork      → AXVELA URL pointing at an artwork page
 *   axvela_certificate  → AXVELA URL pointing at a cert / share page
 *   external_url        → any other http/https URL
 *   unknown             → unparsable / non-URL / non-http payload
 *
 * Per the global "do not auto-open external QR" rule, only the
 * two AXVELA types are considered safe to navigate without an
 * explicit user confirmation. isQRSafe() encodes that.
 *
 * Distinct from app/services/scanner/qrPurpose.ts which uses an
 * older QRPurpose taxonomy (ios_app, museum_guide, etc.) for
 * classifying URL patterns. Both coexist; QRType is the
 * newer V1 surface.
 */

import type { QRType } from "../types/scanner";

/* ── Configurable AXVELA route shape ───────────────────────── */

/**
 * Hosts we recognize as AXVELA. Includes both bare and www
 * subdomains; case-insensitive comparison happens in classifyQR.
 * If preview / staging hosts need to be supported (e.g.
 * staging.axvela.com), add them here.
 */
const AXVELA_HOSTS = new Set<string>([
  "axvela.com",
  "www.axvela.com",
]);

/**
 * Path prefixes that mark the URL as an artwork page on AXVELA.
 * Anything starting with these is classified as axvela_artwork.
 */
const ARTWORK_PATH_PREFIXES = [
  "/analyze",
  "/artwork",
  "/a/",
];

/**
 * Path prefixes that mark the URL as a certificate / share page
 * on AXVELA. /report/[id] is the shared report viewer the
 * existing app already exposes — treating it as cert-class so
 * it gets the same trusted-handling.
 */
const CERT_PATH_PREFIXES = [
  "/cert",
  "/certificate",
  "/share",
  "/report",
];

/* ── Public API ────────────────────────────────────────────── */

/**
 * Classify a decoded QR payload.
 *
 * Decision tree:
 *   - Empty / non-string  → "unknown"
 *   - Not a parseable URL → "unknown"
 *   - Not http/https      → "unknown"  (rejects mailto:, javascript:,
 *                                       upi:, intent:, etc.)
 *   - http/https on an AXVELA host:
 *       path matches ARTWORK_PATH_PREFIXES → "axvela_artwork"
 *       path matches CERT_PATH_PREFIXES    → "axvela_certificate"
 *       otherwise (AXVELA host, unfamiliar path) → "external_url"
 *   - http/https on any other host → "external_url"
 */
export function classifyQR(payload: string): QRType {
  if (typeof payload !== "string") return "unknown";
  const trimmed = payload.trim();
  if (trimmed.length === 0) return "unknown";

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "unknown";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return "unknown";
  }

  const host = url.host.toLowerCase();
  if (!AXVELA_HOSTS.has(host)) {
    return "external_url";
  }

  const path = url.pathname.toLowerCase();
  if (ARTWORK_PATH_PREFIXES.some(p => path.startsWith(p))) {
    return "axvela_artwork";
  }
  if (CERT_PATH_PREFIXES.some(p => path.startsWith(p))) {
    return "axvela_certificate";
  }

  // AXVELA host but unfamiliar path → fall back to external so the
  // user gets a review prompt instead of silent navigation. This
  // is the conservative default; tighten by adding more prefixes
  // above if a route should be auto-trusted.
  return "external_url";
}

/**
 * Is this QR safe to auto-trust without user confirmation?
 *
 * Spec rule:
 *   axvela_artwork + axvela_certificate → safe
 *   external_url + unknown               → not safe
 *
 * The `payload` parameter is accepted for symmetry / future use
 * (e.g. signed-payload verification with HMAC). V1 reads only
 * `qrType` to decide.
 */
export function isQRSafe(payload: string, qrType: QRType): boolean {
  // Reference payload to satisfy the parameter contract; future
  // versions may verify cryptographic signatures here.
  void payload;
  return qrType === "axvela_artwork" || qrType === "axvela_certificate";
}
