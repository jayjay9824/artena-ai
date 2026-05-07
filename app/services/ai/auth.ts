/**
 * Request identification + origin validation.
 *
 * V1 keeps both lightweight: extract a per-client identifier from
 * standard proxy headers for rate-limit bucketing, and gate
 * cross-origin requests in production via an explicit allowlist.
 *
 * Server-only — both helpers read AI_CONFIG (which itself reads
 * server env). Don't import from a Client Component.
 */

import { AI_CONFIG } from "./config";

/**
 * Per-request identifier used as the rate-limit bucket key.
 *
 * V1 strategy:
 *   1. x-forwarded-for header (Vercel sets the client IP here)
 *   2. x-real-ip header (some proxies)
 *   3. literal "unknown" — anonymous bucket; still throttles
 *      misbehaving clients, just shared across all unknowns
 *
 * Phase 5+ may layer on signed user tokens if we want per-account
 * limits, but for V1 IP-bucketing is enough.
 */
export function getRequestIdentifier(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    // x-forwarded-for can be a comma-separated chain "client, proxy1, proxy2".
    // The leftmost entry is the original client.
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    const trimmed = realIp.trim();
    if (trimmed) return trimmed;
  }

  return "unknown";
}

/**
 * Origin / Referer gate for production.
 *
 * Rules:
 *   - NODE_ENV !== "production" → always allow (local dev, preview).
 *   - Production:
 *       AI_CONFIG.cors.allowedOrigins is empty → reject (default deny).
 *       Origin or Referer matches an allowlist entry → allow.
 *       Neither header present (server-to-server, curl) → allow.
 *         Browser CSRF can't happen without an Origin, so this
 *         doesn't open a cross-origin hole.
 *
 * Allowlist entries can be either:
 *   - Full origin: "https://www.axvela.com"
 *   - Hostname:    "axvela.com" (matches any scheme + path)
 */
export function validateOrigin(request: Request): boolean {
  // Skip the gate entirely outside production so local dev /
  // Vercel previews don't need ALLOWED_ORIGINS configured.
  if (process.env.NODE_ENV !== "production") return true;

  const allowed = AI_CONFIG.cors.allowedOrigins;
  if (allowed.length === 0) {
    // Production with no allowlist configured = default deny per spec.
    return false;
  }

  const origin  = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Server-to-server / curl / health checks won't send an Origin.
  // Browser CORS attacks always set Origin, so missing-Origin =
  // not a browser cross-origin request = safe to allow.
  if (!origin && !referer) return true;

  const candidate = origin ?? referer ?? "";
  if (!candidate) return true;

  return allowed.some(entry => matches(candidate, entry));
}

/* Hostname / origin matcher used only by validateOrigin. */
function matches(headerValue: string, entry: string): boolean {
  if (headerValue === entry) return true;

  // Entry is a full origin → strict equality only.
  if (entry.startsWith("http://") || entry.startsWith("https://")) {
    return headerValue === entry || headerValue.startsWith(`${entry}/`);
  }

  // Entry is hostname-only → match against the URL's host.
  try {
    const u = new URL(headerValue);
    return u.host === entry || u.hostname === entry;
  } catch {
    return false;
  }
}
