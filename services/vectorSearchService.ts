/**
 * Vector search over the artwork catalog.
 *
 * Today: in-memory cosine similarity over ARTWORK_CATALOG (~30 entries).
 * Future: pluggable backend — Pinecone / Weaviate / Supabase pgvector /
 * Qdrant. The function surface (`searchSimilarArtworks(embedding)`) stays
 * the same so callers don't change.
 */

import { ARTWORK_CATALOG } from '@/lib/artworkCatalog';
import type { ArtworkCandidate } from '@/lib/types';

const TOP_K = 5;

function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }
  if (aMag === 0 || bMag === 0) return 0;
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
}

export async function searchSimilarArtworks(
  embedding: number[],
): Promise<ArtworkCandidate[]> {
  if (!embedding || embedding.length === 0) return [];

  const scored: ArtworkCandidate[] = ARTWORK_CATALOG.map((entry) => ({
    id: entry.id,
    artist: entry.artist,
    title: entry.title,
    year: entry.year,
    medium: entry.medium,
    similarity: cosineSim(embedding, entry.embedding),
  }));

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, TOP_K);
}
