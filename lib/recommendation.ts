/**
 * Recommendation engine.
 *
 * Maps a TasteProfile to a small list of artist recommendations.
 *
 * Data source today: a hard-coded catalogue of well-documented exemplar
 * artists per style movement. No invented works or pricing — only real,
 * canonical artists associated with each style. The generic style label
 * is used as the "title" placeholder until a real artwork DB is wired.
 *
 * Future-ready:
 *   - Swap the static catalogue for a remote artwork DB / gallery
 *     inventory query keyed by tasteVector + medium.
 *   - Use cosine similarity between tasteVector and per-artwork
 *     embedding for ranked retrieval.
 *   - Function surface stays the same → UI unchanged when backend swaps.
 */

import { getAllScans, type ScanHistoryItem } from './scanHistory';
import type { TasteProfile } from './tasteProfile';

export type Recommendation = {
  title: string;
  artist: string;
  reason: string;
};

const MAX_RECOMMENDATIONS = 3;

/**
 * Real, canonical artists associated with each style label
 * (matches the labels used in lib/tasteProfile.ts STYLE_KEYWORDS).
 * No specific artwork titles or prices — those would be hallucinated
 * without a real catalogue.
 */
const STYLE_EXEMPLARS: Record<string, string[]> = {
  '추상': ['Mark Rothko', 'Wassily Kandinsky', 'Jackson Pollock', 'Helen Frankenthaler'],
  '인상주의': ['Claude Monet', 'Pierre-Auguste Renoir', 'Edgar Degas', 'Camille Pissarro'],
  '표현주의': ['Edvard Munch', 'Egon Schiele', 'Ernst Ludwig Kirchner'],
  '사실주의': ['Gerhard Richter', 'Andrew Wyeth', 'Chuck Close'],
  '미니멀': ['Donald Judd', 'Agnes Martin', 'Carl Andre'],
  '큐비즘': ['Pablo Picasso', 'Georges Braque', 'Juan Gris'],
  '초현실': ['Salvador Dalí', 'René Magritte', 'Max Ernst'],
  '팝아트': ['Andy Warhol', 'Roy Lichtenstein', 'Yayoi Kusama'],
  '구상': ['David Hockney', 'Peter Doig', 'Jenny Saville'],
  '풍경': ['J.M.W. Turner', 'Caspar David Friedrich', 'Hiroshi Sugimoto'],
  '정물': ['Paul Cézanne', 'Giorgio Morandi'],
  '인물': ['Lucian Freud', 'Alice Neel', 'Cecily Brown'],
};

/**
 * Generate up to MAX_RECOMMENDATIONS items from the user's taste signature.
 * Excludes artists the user has already scanned (no point recommending what
 * they've already seen).
 *
 * @param profile  The current taste profile (null/empty → no recs)
 * @param scans    Optional override; defaults to getAllScans() at call time
 */
export function generateRecommendations(
  profile: TasteProfile | null,
  scans?: ScanHistoryItem[],
): Recommendation[] {
  if (!profile || profile.scanCount === 0) return [];

  const history = scans ?? getAllScans();
  const seenArtists = new Set(
    history
      .map((s) => s.artist?.trim().toLowerCase())
      .filter((v): v is string => Boolean(v)),
  );

  const topMedium = profile.preferredMediums[0];
  const recs: Recommendation[] = [];

  // Iterate top styles in dominance order, pick first unseen exemplar per style.
  // Slicing to 4 leaves room when the top-1/top-2 exemplars are all already seen.
  for (const style of profile.topStyles.slice(0, 4)) {
    if (recs.length >= MAX_RECOMMENDATIONS) break;

    const exemplars = STYLE_EXEMPLARS[style];
    if (!exemplars || exemplars.length === 0) continue;

    const candidate = exemplars.find(
      (name) => !seenArtists.has(name.toLowerCase()),
    );
    if (!candidate) continue;

    const titleParts = [style];
    if (topMedium && !titleParts.includes(topMedium)) titleParts.push(topMedium);

    const reasonParts = [style];
    if (topMedium) reasonParts.push(topMedium);

    recs.push({
      title: titleParts.join(' '),
      artist: candidate,
      reason: `${reasonParts.join(' · ')} 선호`,
    });
  }

  return recs;
}
