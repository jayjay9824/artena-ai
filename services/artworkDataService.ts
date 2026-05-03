/**
 * Artwork / artist data service.
 *
 * Resolves an artist name into a real, citable bio using public sources.
 *
 *   1. WikiArt (planned primary)  — currently a stub. WikiArt does not
 *      publish a documented public REST API; production wiring needs an
 *      authenticated/scraped path that's out of scope for this step.
 *      The branch is left in place so a future swap is local.
 *   2. Wikipedia REST API (active source) — free, documented, no auth.
 *      Korean Wikipedia tried first, English as fallback.
 *
 * Returns null when no data is found — caller falls through to AI-only.
 *
 * Future-ready surface: getArtistData(name) is the only public entry; the
 * resolution chain inside is internal and swappable without UI changes.
 */

import type { ArtistData } from '@/lib/types';

const REQUEST_TIMEOUT_MS = 5_000;

const STYLE_MATCHERS: Array<{ label: string; keywords: string[] }> = [
  { label: '추상',     keywords: ['추상', 'abstract'] },
  { label: '인상주의', keywords: ['인상주의', '인상파', 'impressioni'] },
  { label: '표현주의', keywords: ['표현주의', 'expressioni'] },
  { label: '사실주의', keywords: ['사실주의', '리얼리즘', 'realism'] },
  { label: '미니멀',   keywords: ['미니멀', 'minimal'] },
  { label: '큐비즘',   keywords: ['큐비즘', 'cubism'] },
  { label: '초현실',   keywords: ['초현실', 'surreal'] },
  { label: '팝아트',   keywords: ['팝아트', 'pop art', 'pop-art'] },
  { label: '구상',     keywords: ['구상', 'figurative'] },
  { label: '풍경',     keywords: ['풍경', 'landscape'] },
  { label: '정물',     keywords: ['정물', 'still life', 'still-life'] },
  { label: '인물',     keywords: ['인물', '초상', 'portrait'] },
  { label: '모더니즘', keywords: ['모더니즘', 'modern'] },
  { label: '동시대',   keywords: ['contemporary'] },
];

const ARTIST_INDICATORS = [
  'painter', 'artist', 'sculptor', 'photographer', 'printmaker',
  '화가', '예술가', '조각가', '사진작가', '미술가', '판화가',
];

/* ─── Public entry ─── */

export async function getArtistData(
  artistName: string,
): Promise<ArtistData | null> {
  const cleaned = artistName?.trim();
  if (!cleaned) return null;

  // 1. WikiArt (stub for now)
  const fromWikiArt = await tryWikiArt(cleaned);
  if (fromWikiArt) return fromWikiArt;

  // 2. Wikipedia (active)
  const fromWiki = await tryWikipedia(cleaned);
  if (fromWiki) return fromWiki;

  return null;
}

/* ─── WikiArt (stub) ─── */

async function tryWikiArt(_name: string): Promise<ArtistData | null> {
  // Intentional no-op. WikiArt has no documented public REST API; a
  // production integration requires either:
  //   (a) authenticated access to https://www.wikiart.org/en/api/2/*
  //   (b) parsing the unofficial /en/{slug}/all-works/text-list?json=2
  // Both are out of scope for this step. Returning null lets the chain
  // fall through to Wikipedia, which is the active source today.
  return null;
}

/* ─── Wikipedia ─── */

async function tryWikipedia(name: string): Promise<ArtistData | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);

    const summary = await fetchSummary(name, ctrl.signal);
    clearTimeout(timer);

    if (!summary) return null;
    if (!isArtistSummary(summary)) return null;

    return {
      artist: summary.title,
      bio: summary.extract,
      styles: extractStyles(summary.extract + ' ' + summary.description),
      sampleWorks: [], // summary endpoint does not expose works in a
                      // structured way; leaving empty rather than parsing
                      // unreliable prose. Future: query wikidata or a
                      // dedicated artworks DB.
      source: 'wikipedia',
    };
  } catch {
    return null;
  }
}

type WikiSummary = { title: string; extract: string; description: string };

async function fetchSummary(
  name: string,
  signal: AbortSignal,
): Promise<WikiSummary | null> {
  const encoded = encodeURIComponent(name.replace(/\s+/g, '_'));
  const urls = [
    `https://ko.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`,
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u, {
        signal,
        headers: {
          // Wikipedia etiquette: identify the calling app + contact URL.
          'User-Agent': 'AXVELA/0.1 (https://www.axvela.com)',
          Accept: 'application/json',
        },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as Record<string, unknown>;
      if (typeof data.extract === 'string' && data.extract.length > 0) {
        return {
          title: typeof data.title === 'string' ? data.title : name,
          extract: data.extract,
          description:
            typeof data.description === 'string' ? data.description : '',
        };
      }
    } catch {
      // try next locale
    }
  }
  return null;
}

function isArtistSummary(s: WikiSummary): boolean {
  const haystack = `${s.description} ${s.extract}`.toLowerCase();
  return ARTIST_INDICATORS.some((i) => haystack.includes(i.toLowerCase()));
}

function extractStyles(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const m of STYLE_MATCHERS) {
    if (m.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      found.push(m.label);
    }
  }
  return found;
}

/* ─── Lightweight name extraction from a userQuestion ─── */

/**
 * Heuristic: pull a likely artist name out of a userQuestion.
 * Used by the route layer to decide whether to fetch artist data.
 *
 *   "Mark Rothko의 작품을 보여줘"        → "Mark Rothko"
 *   "Monet의 다른 작품 보여줘"           → "Monet"
 *   "Edvard Munch에 대해 알려줘"         → "Edvard Munch"
 *   "Monet"                              → "Monet"
 *   "내가 좋아하는 작가는?"              → null (no clear name)
 */
export function extractArtistName(question: string): string | null {
  const q = question?.trim();
  if (!q) return null;

  let m = q.match(/^(.+?)의\s+(?:다른\s+)?작품/);
  if (m) return m[1].trim();

  m = q.match(/^(.+?)에\s+대해/);
  if (m) return m[1].trim();

  // Bare name — short string of letters/Hangul only, treat as a name guess.
  if (q.length < 40 && /^[A-Za-z가-힣\s.\-']+$/.test(q)) {
    return q;
  }

  return null;
}
