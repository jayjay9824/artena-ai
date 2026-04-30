/**
 * Image input validation + content hash for cache keys.
 *
 * Server-only (Node crypto + Buffer). The hybrid analyze pipeline
 * calls validateImageInput before any AI request, so a corrupt /
 * oversized / mismatched-MIME upload never reaches Claude or
 * Gemini and never burns API budget.
 *
 * Detection is magic-bytes only — never trusts the client's
 * declared mime; rule 5 enforces that the two agree.
 */

import { createHash } from "crypto";

export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export type ValidateImageResult =
  | { valid: true;  mimeType: ImageMimeType; sizeBytes: number }
  | { valid: false; reason: string };

/** Lower bound — anything smaller than this is corrupt or empty.
 *  A real JPEG/PNG/WEBP is at least a couple kB; 256 B catches
 *  obviously-broken uploads without false-positiving thumbnails. */
const MIN_IMAGE_BYTES = 256;

export function validateImageInput(
  imageBase64:      unknown,
  declaredMimeType: string,
  maxSizeMB:        number,
): ValidateImageResult {
  // Rule 1 — must be a non-empty string.
  if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
    return { valid: false, reason: "imageBase64 must be a non-empty string" };
  }

  // Decode. Buffer.from with "base64" silently skips non-base64
  // chars, so an obviously-garbage input still returns *some*
  // bytes — but the magic-bytes check below will reject it.
  let buf: Buffer;
  try {
    buf = Buffer.from(imageBase64, "base64");
  } catch {
    return { valid: false, reason: "imageBase64 is not valid base64" };
  }

  // Rule 3 — reject extremely small.
  if (buf.length < MIN_IMAGE_BYTES) {
    return {
      valid:  false,
      reason: `image too small (${buf.length} bytes < ${MIN_IMAGE_BYTES})`,
    };
  }

  // Rule 2 — reject oversized.
  const maxBytes = Math.max(1, Math.floor(maxSizeMB * 1024 * 1024));
  if (buf.length > maxBytes) {
    const mb = (buf.length / 1024 / 1024).toFixed(2);
    return { valid: false, reason: `image too large (${mb} MB > ${maxSizeMB} MB)` };
  }

  // Rule 4 — magic-bytes check.
  const actualMime = detectMagicBytes(buf);
  if (!actualMime) {
    return { valid: false, reason: "unrecognized image format (not JPEG / PNG / WEBP)" };
  }

  // Rule 5 — declared MIME must match the actual format.
  const declared = (declaredMimeType ?? "").trim().toLowerCase();
  if (declared !== actualMime) {
    return {
      valid:  false,
      reason: `declared MIME "${declared}" doesn't match actual format "${actualMime}"`,
    };
  }

  // Rule 6 — return the actual MIME.
  return { valid: true, mimeType: actualMime, sizeBytes: buf.length };
}

function detectMagicBytes(buf: Buffer): ImageMimeType | null {
  // JPEG — FF D8 FF
  if (buf.length >= 3
    && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (buf.length >= 8
    && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) {
    return "image/png";
  }
  // WEBP — "RIFF" + 4 size bytes + "WEBP"
  if (buf.length >= 12
    && buf.toString("ascii", 0, 4)  === "RIFF"
    && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

/**
 * SHA-256 of the *decoded* image bytes — used as the cache key.
 * Hashing the decoded buffer (not the base64 string) means two
 * base64 strings that differ only in whitespace produce the same
 * hash, so the cache hits even if the client re-encodes.
 */
export function hashImage(base64: string): string {
  if (typeof base64 !== "string" || base64.length === 0) {
    throw new Error("[hashImage] base64 must be a non-empty string");
  }
  const buf = Buffer.from(base64, "base64");
  return createHash("sha256").update(buf).digest("hex");
}
