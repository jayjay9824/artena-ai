/**
 * Image embedding service.
 *
 * Today: deterministic hash-based stub. Same image bytes → same vector,
 * but different photos of the same artwork produce DIFFERENT vectors
 * (no shared visual semantics). The stub exists so the pipeline above
 * has the right shape; real recognition won't activate until a
 * multimodal embedding model is wired in.
 *
 * Future swaps (one-line replacement of generateImageEmbedding):
 *   - Cohere `embed-v4.0` (image input via `images: [...]`)
 *   - Voyage `voyage-multimodal-3`
 *   - Replicate-hosted CLIP (`replicate.run('openai/clip-vit-base-patch32', ...)`)
 *   - Self-hosted CLIP via separate inference service
 *
 * The catalog's pre-computed embeddings will need to be regenerated
 * from real image data when the swap happens.
 */

const EMBEDDING_DIM = 128;

/**
 * Stub embedding: FNV-1a-style hash of an arbitrary seed string,
 * spread across EMBEDDING_DIM coordinates and L2-normalised.
 * Public so the catalog can use the same scheme for its entries.
 */
export function stubEmbed(seed: string): number[] {
  const out = new Array<number>(EMBEDDING_DIM).fill(0);
  if (!seed) return out;

  let hash = 0x811c9dc5 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
    const idx = hash % EMBEDDING_DIM;
    const val = ((hash >>> 16) & 0xff) / 255 - 0.5;
    out[idx] += val;
  }
  return l2Normalize(out);
}

function l2Normalize(v: number[]): number[] {
  let mag = 0;
  for (const x of v) mag += x * x;
  mag = Math.sqrt(mag);
  if (mag === 0) return v;
  return v.map((x) => x / mag);
}

/**
 * Public entry: produce an embedding for a base64-encoded image.
 * The current implementation is a deterministic stub — real visual
 * recognition requires a multimodal embedding API (see file comment).
 */
export async function generateImageEmbedding(
  imageBase64: string,
): Promise<number[]> {
  // Stub: hash a slice of the bytes. Stable for identical files,
  // but does NOT capture visual content.
  if (!imageBase64) return new Array(EMBEDDING_DIM).fill(0);
  const sample = imageBase64.length > 4096 ? imageBase64.slice(0, 4096) : imageBase64;
  return stubEmbed(sample);
}
