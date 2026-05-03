/**
 * Taste profile engine.
 *
 * Aggregates the local scan history into a compact taste signature:
 *   - topArtists        — confidence-weighted dominant artists
 *   - topStyles         — keyword hits in interpretation text
 *   - preferredMediums  — medium field + interpretation
 *   - tasteVector       — fixed-length numeric snapshot (style weights)
 *
 * Storage: localStorage key 'axvela_taste_profile'.
 * Function surface is sync today; abstracted so a future remote/IndexedDB
 * backend can replace internals without UI changes. Will later feed
 * recommendation, personalization, and marketplace surfaces.
 */

import { getAllScans, type ScanHistoryItem } from './scanHistory';

const PROFILE_KEY = 'axvela_taste_profile';

export type TasteProfile = {
  topArtists: string[];
  topStyles: string[];
  preferredMediums: string[];
  tasteVector: number[];
  scanCount: number;
  updatedAt: string;
};

/* ─── Keyword catalogues (Korean interpretation primary) ─── */

type Keyword = { id: string; label: string; matchers: string[] };

const STYLE_KEYWORDS: Keyword[] = [
  { id: 'abstract',      label: '추상',     matchers: ['추상', 'abstract'] },
  { id: 'impressionism', label: '인상주의', matchers: ['인상주의', '인상파', 'impressioni'] },
  { id: 'expressionism', label: '표현주의', matchers: ['표현주의', 'expressioni'] },
  { id: 'realism',       label: '사실주의', matchers: ['사실주의', '리얼리즘', 'realism'] },
  { id: 'minimal',       label: '미니멀',   matchers: ['미니멀', 'minimal'] },
  { id: 'cubism',        label: '큐비즘',   matchers: ['큐비즘', 'cubism'] },
  { id: 'surreal',       label: '초현실',   matchers: ['초현실', 'surreal'] },
  { id: 'pop',           label: '팝아트',   matchers: ['팝아트', 'pop art', 'pop-art'] },
  { id: 'figurative',    label: '구상',     matchers: ['구상', 'figurative'] },
  { id: 'landscape',     label: '풍경',     matchers: ['풍경', 'landscape'] },
  { id: 'still_life',    label: '정물',     matchers: ['정물', 'still life', 'still-life'] },
  { id: 'portrait',      label: '인물',     matchers: ['인물', '초상', 'portrait'] },
];

const MEDIUM_KEYWORDS: Keyword[] = [
  { id: 'painting',    label: '회화',     matchers: ['회화', 'painting', 'oil', '유화', 'acrylic', '아크릴'] },
  { id: 'photography', label: '사진',     matchers: ['사진', 'photo'] },
  { id: 'sculpture',   label: '조각',     matchers: ['조각', 'sculpture'] },
  { id: 'print',       label: '판화',     matchers: ['판화', 'print'] },
  { id: 'digital',     label: '디지털',   matchers: ['디지털', 'digital'] },
  { id: 'watercolor',  label: '수채화',   matchers: ['수채', 'watercolor', 'water-colour'] },
  { id: 'mixed',       label: '혼합매체', matchers: ['혼합', 'mixed media'] },
  { id: 'drawing',     label: '드로잉',   matchers: ['드로잉', '소묘', 'drawing'] },
];

const DEFAULT_LABELS = new Set([
  'unknown artist',
  'artwork image',
  'analysis pending',
  'image-based analysis',
]);

function isDefaultLabel(value?: string): boolean {
  if (!value) return true;
  return DEFAULT_LABELS.has(value.trim().toLowerCase());
}

function topN(map: Map<string, number>, n: number): string[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

/* ─── Compute (pure) ─── */

export function computeTasteProfile(scans: ScanHistoryItem[]): TasteProfile {
  const artistScores = new Map<string, number>();
  const styleScores = new Map<string, number>();
  const mediumScores = new Map<string, number>();

  for (const scan of scans) {
    const w = scan.confidence / 100;
    if (w <= 0) continue;

    // Artist (skip default placeholders)
    if (scan.artist && !isDefaultLabel(scan.artist)) {
      const k = scan.artist.trim();
      artistScores.set(k, (artistScores.get(k) ?? 0) + w);
    }

    // Style — keyword hits in interpretation + quickInsight + artistContext
    const interpretText = [
      scan.insight.interpretation,
      scan.insight.quickInsight,
      scan.insight.artistContext,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    for (const style of STYLE_KEYWORDS) {
      if (style.matchers.some((m) => interpretText.includes(m.toLowerCase()))) {
        styleScores.set(style.label, (styleScores.get(style.label) ?? 0) + w);
      }
    }

    // Medium — medium field first (structured), then interpretation context
    const mediumField = (scan.insight.medium ?? '').toLowerCase();
    const mediumText = `${mediumField} ${interpretText}`;
    for (const medium of MEDIUM_KEYWORDS) {
      if (medium.matchers.some((m) => mediumText.includes(m.toLowerCase()))) {
        mediumScores.set(medium.label, (mediumScores.get(medium.label) ?? 0) + w);
      }
    }
  }

  // tasteVector: fixed-length, in STYLE_KEYWORDS order — durable across runs.
  const tasteVector = STYLE_KEYWORDS.map((s) => styleScores.get(s.label) ?? 0);

  return {
    topArtists: topN(artistScores, 3),
    topStyles: topN(styleScores, 4),
    preferredMediums: topN(mediumScores, 3),
    tasteVector,
    scanCount: scans.length,
    updatedAt: new Date().toISOString(),
  };
}

/* ─── Storage ─── */

export function getTasteProfile(): TasteProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<TasteProfile>;
    if (!p || typeof p !== 'object') return null;
    return {
      topArtists: Array.isArray(p.topArtists)
        ? p.topArtists.filter((x): x is string => typeof x === 'string')
        : [],
      topStyles: Array.isArray(p.topStyles)
        ? p.topStyles.filter((x): x is string => typeof x === 'string')
        : [],
      preferredMediums: Array.isArray(p.preferredMediums)
        ? p.preferredMediums.filter((x): x is string => typeof x === 'string')
        : [],
      tasteVector: Array.isArray(p.tasteVector)
        ? p.tasteVector.filter((x): x is number => typeof x === 'number')
        : [],
      scanCount: typeof p.scanCount === 'number' ? p.scanCount : 0,
      updatedAt:
        typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveTasteProfile(profile: TasteProfile): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* quota or blocked — silent */
  }
}

export function clearTasteProfile(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Recompute the profile from current scan history and persist it.
 * Call this after any change to history (new scan, deletion).
 */
export function refreshTasteProfile(): TasteProfile {
  const scans = getAllScans();
  const profile = computeTasteProfile(scans);
  saveTasteProfile(profile);
  return profile;
}
