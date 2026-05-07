/**
 * matchingService — link an analysis input to a known Artwork in the
 * Gallery Console catalogue.
 *
 * Priority order (highest → lowest):
 *   1. AXID / NFC / QR  → registry-confirmed = 1.0
 *   2. Image (pHash or vector embedding)
 *   3. Text (artist + title fuzzy across en/ko/aliases)
 *   4. Manual (handled by the UI, not this service)
 *
 * Returns a MatchOutcome — the analyze flow uses this to decide
 * between auto-routing, candidate selection, or NoMatch.
 *
 * Trust philosophy: when no candidate clears 0.6, return no_match.
 * Callers must NOT fabricate analysis from a no_match result.
 */

import type {
  Artwork, ArtistId, ArtworkId, GalleryId,
  MatchedArtwork, MatchedBy, MatchOutcome,
} from "../lib/types";
import { getCanonicalCatalogue } from "./canonicalCatalogue";

/* ── Catalogue access seam ─────────────────────────────────────── */
/*
 * Reads from the canonicalCatalogue module, which today is a hand-
 * seeded list scoped to the spec example (Kim Whanki "귀로" + Lee
 * Ufan / Park Seo-Bo / Kusama / Rothko). When Gallery Console ships
 * its ingest path, swap getCanonicalCatalogue() to hit that backend
 * — every match path here goes through fetchCatalogue() so the seam
 * is single-line.
 */

interface ArtistRecord {
  id:         ArtistId;
  name:       string;
  nameKo?:    string;
  aliases:    string[];
}

interface CatalogueSnapshot {
  artworks: Artwork[];
  artists:  ArtistRecord[];
}

async function fetchCatalogue(): Promise<CatalogueSnapshot> {
  const seed = getCanonicalCatalogue();
  // Map Artist (name + aliases) → ArtistRecord so legacy match code
  // that splits artist name vs. aliases vs. nameKo keeps working.
  // Korean alias becomes nameKo when present (first hangul-only entry).
  const artists: ArtistRecord[] = seed.artists.map(a => ({
    id:      a.id,
    name:    a.name,
    nameKo:  a.aliases.find(x => /[가-힯]/.test(x)),
    aliases: a.aliases,
  }));
  return { artworks: seed.artworks, artists };
}

/** Test-only: inject a synthetic catalogue (back-compat). */
export function setCatalogueForTest(_snapshot: CatalogueSnapshot) {
  // No-op now that the catalogue is sourced from canonicalCatalogue.
  // Use setCanonicalCatalogue() from that module instead.
}

/* ── Confidence bands ──────────────────────────────────────────── */

const CONFIDENT_THRESHOLD = 0.85;
const CANDIDATE_FLOOR     = 0.60;
const MAX_CANDIDATES      = 3;

/* ── Public API ────────────────────────────────────────────────── */

export interface MatchInput {
  matchedBy: MatchedBy;
  /** Direct registry id payload (qr / nfc / axid). */
  payload?: { axid?: string; galleryId?: GalleryId; artworkId?: ArtworkId; slug?: string };
  /**
   * Single freeform string from text search ("김환기 귀로",
   * "Kim Whanki Gwi-ro"). When set, the matcher tries the query
   * against the artwork's combined haystack — no caller-side parsing
   * needed.
   */
  query?: string;
  /** Pre-parsed artist + title (label OCR / structured search). */
  artist?: string;
  title?:  string;
  year?:   string;
  /** Image-derived fingerprints (future). */
  pHash?:    string;
  embedding?: number[];
}

/** Run the matcher; never throws. */
export async function matchArtwork(input: MatchInput): Promise<MatchOutcome> {
  switch (input.matchedBy) {
    case "axid":  return wrap(await matchByAxid(input));
    case "nfc":   return wrap(await matchByAxid(input));   // NFC payload = AXID
    case "qr":    return wrap(await matchByQr(input));
    case "label":
    case "text": {
      // Prefer freeform when the caller passed a single string; fall
      // back to the artist+title path otherwise.
      if (input.query && !input.artist && !input.title) {
        return matchByFreeformQuery(input);
      }
      return matchByFuzzyText(input);
    }
    case "image": return matchByImage(input);
  }
}

/** Wrap a single (or null) result into a MatchOutcome. */
function wrap(m: MatchedArtwork | null): MatchOutcome {
  if (!m) return { kind: "no_match" };
  if (m.confidence >= CONFIDENT_THRESHOLD) return { kind: "confident", match: m };
  return { kind: "ambiguous", candidates: [m] };
}

/* ── 1. AXID / NFC ─────────────────────────────────────────────── */

async function matchByAxid(input: MatchInput): Promise<MatchedArtwork | null> {
  const axid = input.payload?.axid;
  if (!axid) return null;
  const cat = await fetchCatalogue();
  const found = cat.artworks.find(a => a.axid === axid);
  if (!found) {
    // Unknown AXID — not a hard failure, but we can't claim 1.0.
    // Soft return so the caller can show "AXID found but not in our
    // registry yet" rather than fabricating data.
    return null;
  }
  return {
    artworkId:  found.id,
    galleryId:  found.galleryId,
    confidence: 1.0,
    matchedBy:  input.matchedBy === "nfc" ? "nfc" : "axid",
  };
}

/* ── 2. QR (legacy payload may carry artworkId+galleryId pair) ─── */

async function matchByQr(input: MatchInput): Promise<MatchedArtwork | null> {
  const p = input.payload;
  if (!p) return null;
  if (p.axid) return matchByAxid(input);
  if (!p.artworkId || !p.galleryId) return null;
  const cat = await fetchCatalogue();
  const found = cat.artworks.find(a => a.id === p.artworkId && a.galleryId === p.galleryId);
  return {
    artworkId:  p.artworkId,
    galleryId:  p.galleryId,
    confidence: found ? 1.0 : 0.95,
    matchedBy:  "qr",
  };
}

/* ── 3. Image (pHash hamming + vector cosine, both stubbed) ────── */

async function matchByImage(_input: MatchInput): Promise<MatchOutcome> {
  // pHash + vector matching require a real backend. The hooks are
  // here so adding the index later is just filling in these calls.
  // Until then: no-match (NEVER fabricate).
  return { kind: "no_match" };
}

/* ── 4. Text fuzzy — KR/EN/aliases ─────────────────────────────── */

/**
 * Freeform query path — score the user's single string against each
 * artwork's full searchable haystack (title + titleKo + aliases +
 * artistName + artistNameKo + artist aliases). Solves the spec
 * convergence: "김환기 귀로" / "Kim Whanki Gwi-ro" / "Whanki Kim 귀로"
 * → same artworkId.
 */
async function matchByFreeformQuery(input: MatchInput): Promise<MatchOutcome> {
  const q = normalize(input.query ?? "");
  if (!q) return { kind: "no_match" };

  const cat = await fetchCatalogue();
  const scored: { match: MatchedArtwork; score: number }[] = [];

  for (const aw of cat.artworks) {
    const artist = cat.artists.find(x => x.id === aw.artistId);
    const haystack = collectTokens(
      aw.title, aw.titleKo,
      aw.artistName, aw.artistNameKo,
      ...(aw.aliases ?? []),
      artist?.name, artist?.nameKo,
      ...(artist?.aliases ?? []),
    );
    // Combine into a single normalized blob so multi-token queries
    // can hit "artist+title" pairings regardless of word order.
    const combined = haystack.join(" ");

    // Two scoring paths — take the best:
    //   (a) full-string similarity against the combined haystack
    //   (b) per-token max similarity against individual fields,
    //       averaged across query tokens (handles "Kim Whanki 귀로"
    //       where artist hits one set and title hits another).
    const fullScore = stringSimilarity(q, combined);

    const queryTokens = q.split(" ").filter(Boolean);
    let tokenSum = 0, tokenN = 0;
    for (const qt of queryTokens) {
      const best = bestSimilarity(qt, haystack);
      if (best > 0) { tokenSum += best; tokenN++; }
    }
    const tokenScore = tokenN > 0 ? tokenSum / queryTokens.length : 0;

    const score = Math.max(fullScore, tokenScore);

    if (score >= CANDIDATE_FLOOR) {
      scored.push({
        match: {
          artworkId:  aw.id,
          galleryId:  aw.galleryId,
          confidence: Math.min(1, score),
          matchedBy:  input.matchedBy === "label" ? "label" : "text",
        },
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  if (scored.length === 0)                    return { kind: "no_match" };
  if (scored[0].score >= CONFIDENT_THRESHOLD) return { kind: "confident", match: scored[0].match };
  return {
    kind: "ambiguous",
    candidates: scored.slice(0, MAX_CANDIDATES).map(s => s.match),
  };
}

async function matchByFuzzyText(input: MatchInput): Promise<MatchOutcome> {
  const artistQ = normalize(input.artist ?? "");
  const titleQ  = normalize(input.title  ?? "");
  if (!artistQ && !titleQ) return { kind: "no_match" };

  const cat = await fetchCatalogue();
  const scored: { match: MatchedArtwork; score: number }[] = [];

  for (const aw of cat.artworks) {
    const artist = cat.artists.find(x => x.id === aw.artistId);

    const artistTokens = collectTokens(
      aw.artistName,
      aw.artistNameKo,
      artist?.name,
      artist?.nameKo,
      ...(artist?.aliases ?? []),
      ...(aw.aliases ?? []),
    );
    const titleTokens = collectTokens(
      aw.title,
      aw.titleKo,
      ...(aw.aliases ?? []),
    );

    const artistScore = artistQ ? bestSimilarity(artistQ, artistTokens) : 0;
    const titleScore  = titleQ  ? bestSimilarity(titleQ,  titleTokens)  : 0;

    // Weighting: title carries slightly more — collectors often know
    // the artwork name but spell artist names variably across KR/EN.
    let score: number;
    if (artistQ && titleQ)      score = artistScore * 0.45 + titleScore * 0.55;
    else if (artistQ)           score = artistScore * 0.95;
    else                        score = titleScore  * 0.85;

    // Year tiebreak: small bonus when both query year and record year
    // match exactly. No penalty when only one side has it.
    if (input.year && aw.year && normalize(input.year) === normalize(aw.year)) {
      score = Math.min(1, score + 0.03);
    }

    if (score >= CANDIDATE_FLOOR) {
      scored.push({
        match: {
          artworkId:  aw.id,
          galleryId:  aw.galleryId,
          confidence: Math.min(1, score),
          matchedBy:  input.matchedBy === "label" ? "label" : "text",
        },
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 0)                              return { kind: "no_match" };
  if (scored[0].score >= CONFIDENT_THRESHOLD)           return { kind: "confident", match: scored[0].match };

  // Ambiguous: 1+ candidate in the floor band. Spec asks for
  // candidate UI when 2+ exist; with only 1 mid-confidence hit we
  // still surface it so users can confirm or reject.
  return {
    kind: "ambiguous",
    candidates: scored.slice(0, MAX_CANDIDATES).map(s => s.match),
  };
}

/* ── Text normalization + similarity ───────────────────────────── */

/**
 * Lowercase, strip whitespace, drop romanization punctuation
 * (hyphens, apostrophes), collapse multiple spaces. Keeps Hangul +
 * Latin together so "김환기-귀로" and "Kim Whanki Gwi-ro" reduce to
 * comparable forms after tokenization.
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`’]/g, "")
    .replace(/[-_·–—]/g, " ")
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectTokens(...sources: (string | undefined)[]): string[] {
  const out: string[] = [];
  for (const s of sources) {
    if (!s) continue;
    const n = normalize(s);
    if (n) out.push(n);
  }
  return out;
}

/** Best similarity between query and any token in the candidate set. */
function bestSimilarity(query: string, tokens: string[]): number {
  let best = 0;
  for (const t of tokens) {
    const sim = stringSimilarity(query, t);
    if (sim > best) best = sim;
    if (best === 1) break;
  }
  return best;
}

/**
 * String similarity tailored to our matching needs:
 *   • full-string equality            → 1.0
 *   • substring containment           → up to 0.9
 *   • token-overlap (set intersection) for multi-word queries
 *   • Levenshtein-ratio fallback for typos within ~30% length
 *
 * Designed to make "kim whanki" ≈ "whanki kim" and tolerate
 * 1-2 character typos / missing romanization marks.
 */
function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b)  return 1;

  // Substring (covers "Kim Whanki" vs. "Kim Whanki Gwi-ro").
  if (a.includes(b) || b.includes(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return 0.7 + ratio * 0.2; // 0.7–0.9
  }

  // Token-overlap (handles word-order differences).
  const at = new Set(a.split(" ").filter(Boolean));
  const bt = new Set(b.split(" ").filter(Boolean));
  if (at.size && bt.size) {
    let hit = 0;
    at.forEach(t => { if (bt.has(t)) hit++; });
    if (hit > 0) {
      const overlap = hit / Math.max(at.size, bt.size);
      if (overlap >= 0.5) return 0.6 + overlap * 0.3;  // 0.75–0.9
    }
  }

  // Edit-distance fallback for typos.
  const ratio = levenshteinRatio(a, b);
  return ratio >= 0.7 ? ratio * 0.8 : 0;  // cap at 0.8 — typos shouldn't beat substring matches
}

function levenshteinRatio(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const max  = Math.max(a.length, b.length);
  return max === 0 ? 1 : 1 - dist / max;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
