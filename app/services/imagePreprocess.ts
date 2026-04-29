/**
 * Server-side image preprocessing for Claude vision calls.
 *
 * Why this exists:
 *
 *   1. Anthropic vision works best when the longest edge of the
 *      image is ≤ 1568 px. Larger images get downsampled by the
 *      service anyway — pre-resizing here cuts upload bandwidth,
 *      cuts JPEG noise from re-compression, and is more
 *      deterministic.
 *
 *   2. Phone cameras embed EXIF orientation metadata; the raw bytes
 *      are often "rotated" relative to what the user saw on screen.
 *      sharp().rotate() with no args reads the EXIF Orientation tag
 *      and bakes the rotation into the pixels, so Claude always sees
 *      the work right-side-up.
 *
 *   3. Re-encoding through mozjpeg at quality 90 produces a cleaner,
 *      smaller frame than the camera's default JPEG (often 0.92 with
 *      fast encoder). Better signal-to-noise on signatures, captions,
 *      surface details.
 *
 * The function is a no-op fall-through if sharp throws — we never
 * want preprocessing to be a single point of failure for the
 * analyze pipeline.
 */

import sharp from "sharp";
import type { ImageMediaType } from "./analyzeService";

const MAX_DIMENSION = 1568;

export interface PreprocessedImage {
  base64:    string;
  mediaType: ImageMediaType;
}

export async function preprocessImageBase64(
  base64:    string,
  mediaType: ImageMediaType,
): Promise<PreprocessedImage> {
  try {
    const input = Buffer.from(base64, "base64");

    const out = await sharp(input)
      // Read EXIF Orientation, bake into pixels, strip the tag.
      .rotate()
      .resize({
        width:              MAX_DIMENSION,
        height:             MAX_DIMENSION,
        fit:                "inside",
        withoutEnlargement: true,
      })
      // Normalize to JPEG so Claude vision gets a consistent codec
      // regardless of what the camera or upload produced. mozjpeg
      // gives ~10-15% smaller files at the same visual quality.
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();

    return {
      base64:    out.toString("base64"),
      mediaType: "image/jpeg",
    };
  } catch (err) {
    // Pass-through fallback — never break the analyze flow over a
    // preprocessing hiccup.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[imagePreprocess] passthrough:", err);
    }
    return { base64, mediaType };
  }
}
