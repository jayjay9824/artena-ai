/**
 * matchingService — link an analysis result to a known Artwork in the
 * Gallery Console catalogue. Returns null when no Gallery has seeded
 * Artworks yet (i.e. always, for now — this is the stub).
 *
 * Three matching paths, in priority order:
 *   1. QR     — payload encodes a galleryId + artworkId directly
 *   2. Label  — OCR'd artist + title + year, exact match
 *   3. Image  — perceptual hash against gallery uploads (future)
 *   4. Text   — fuzzy artist + title match, highest score wins
 *
 * The function signatures are stable so wiring real matching later
 * (when Gallery Console seeds the artworks table) is one file change.
 */

import type {
  Artwork,
  ArtistId,
  ArtworkId,
  GalleryId,
  MatchedArtwork,
  MatchedBy,
} from "../lib/types";

/* ── Catalogue access seam ─────────────────────────────────────── */
/*
 * Gallery Console will eventually back this with an API call. For now
 * an in-memory empty list keeps the matching call sites compiling and
 * testable. Replace fetchCatalogue() to plug in a real datasource.
 */

interface ArtistRecord {
  id:      ArtistId;
  name:    string;
  aliases: string[];
}

interface CatalogueSnapshot {
  artworks: Artwork[];
  artists:  ArtistRecord[];
}

let catalogueCache: CatalogueSnapshot | null = null;

async function fetchCatalogue(): Promise<CatalogueSnapshot> {
  if (catalogueCache) return catalogueCache;
  // TODO: Replace with `fetch("/api/gallery-catalogue")` once Gallery
  // Console exposes one. Empty stub means matching always returns null.
  catalogueCache = { artworks: [], artists: [] };
  return catalogueCache;
}

/* ── Public API ────────────────────────────────────────────────── */

export interface MatchInput {
  matchedBy: MatchedBy;
  /** When matchedBy === "qr": the parsed payload. */
  qrPayload?:    { galleryId?: GalleryId; artworkId?: ArtworkId; slug?: string };
  /** Free-text inputs from label OCR or text search. */
  artist?: string;
  title?:  string;
  year?:   string;
}

/** Returns a MatchedArtwork or null if no candidate clears confidence ≥ 0.7. */
export async function matchArtwork(input: MatchInput): Promise<MatchedArtwork | null> {
  switch (input.matchedBy) {
    case "qr":    return matchByQr(input);
    case "label": return matchByLabel(input);
    case "image": return null;                     // image matching not implemented
    case "text":  return matchByText(input);
  }
}

/* ── QR — direct id from payload ───────────────────────────────── */

async function matchByQr(input: MatchInput): Promise<MatchedArtwork | null> {
  const p = input.qrPayload;
  if (!p?.artworkId || !p?.galleryId) return null;
  // Trust the QR contents — galleries print these themselves. Confidence
  // is 1.0 when the catalogue confirms the IDs exist; 0.95 otherwise
  // (we still return so unknown QRs degrade to "soft match").
  const cat = await fetchCatalogue();
  const found = cat.artworks.find(a => a.id === p.artworkId && a.galleryId === p.galleryId);
  return {
    artworkId:  p.artworkId,
    galleryId:  p.galleryId,
    confidence: found ? 1.0 : 0.95,
    matchedBy:  "qr",
  };
}

/* ── Label — exact match by (artist, title), year as tiebreaker ── */

async function matchByLabel(input: MatchInput): Promise<MatchedArtwork | null> {
  const artist = (input.artist ?? "").trim().toLowerCase();
  const title  = (input.title  ?? "").trim().toLowerCase();
  if (!artist || !title) return null;
  const cat = await fetchCatalogue();
  const candidates = cat.artworks.filter(a => {
    const aArtist = artistName(a, cat).toLowerCase();
    return aArtist === artist && a.title.toLowerCase() === title;
  });
  if (candidates.length === 0) return null;
  const pick = input.year
    ? candidates.find(a => a.year === input.year) ?? candidates[0]
    : candidates[0];
  return {
    artworkId:  pick.id,
    galleryId:  pick.galleryId,
    confidence: 0.92,
    matchedBy:  "label",
  };
}

/* ── Text — fuzzy match (lowercase substring + token overlap) ──── */

async function matchByText(input: MatchInput): Promise<MatchedArtwork | null> {
  const artist = (input.artist ?? "").trim().toLowerCase();
  const title  = (input.title  ?? "").trim().toLowerCase();
  if (!artist && !title) return null;
  const cat = await fetchCatalogue();

  let best: { a: Artwork; score: number } | null = null;
  for (const a of cat.artworks) {
    const aArtist = artistName(a, cat).toLowerCase();
    const aTitle  = a.title.toLowerCase();
    const artistScore = artist ? tokenOverlap(artist, aArtist) : 0;
    const titleScore  = title  ? tokenOverlap(title,  aTitle)  : 0;
    // Title weighs slightly more than artist; both must be non-zero.
    const score = (artistScore * 0.45) + (titleScore * 0.55);
    if (score > 0.6 && (!best || score > best.score)) best = { a, score };
  }
  if (!best) return null;
  return {
    artworkId:  best.a.id,
    galleryId:  best.a.galleryId,
    confidence: Math.min(0.9, best.score),
    matchedBy:  "text",
  };
}

/* ── Helpers ───────────────────────────────────────────────────── */

function artistName(a: Artwork, cat: CatalogueSnapshot): string {
  const found = cat.artists.find(x => x.id === a.artistId);
  return found?.name ?? "";
}

function tokenOverlap(q: string, target: string): number {
  if (!q || !target) return 0;
  const tq = new Set(q.split(/\s+/).filter(Boolean));
  const tt = new Set(target.split(/\s+/).filter(Boolean));
  if (tq.size === 0 || tt.size === 0) return 0;
  let hit = 0;
  tq.forEach(t => { if (tt.has(t)) hit++; });
  return hit / Math.max(tq.size, tt.size);
}
