/**
 * Signal-driven suggested questions for an analysis.
 *
 * Used by both QuickReport (chips above the "Ask ARTENA" button) and
 * ArtAssistantScreen (chips on the empty-state of the chat). Single
 * source of truth so the two surfaces stay in sync.
 *
 * The questions branch on:
 *   • category        — architecture / artifact / cultural_site / artwork
 *   • market position — Blue-chip / Established / Emerging (for artwork)
 *   • topical signal  — landscape / portrait / abstract / installation /
 *                       conceptual / etc., extracted from style+keywords
 */

import type { CollectionAnalysis } from "../../collection/hooks/useCollection";
import type { QuestionType, SuggestedQuestion } from "../../types/assistant";

export type Analysis = CollectionAnalysis;

/* ── Signal helpers ───────────────────────────────────────────────── */

type MarketPosition = "Emerging" | "Established" | "Blue-chip";

function deriveMarketPosition(a: Analysis): MarketPosition {
  if (a.category === "architecture" || a.category === "artifact" || a.category === "cultural_site") {
    return "Established";
  }
  const note     = (a.marketNote ?? "").toLowerCase();
  const auCount  = a.auctions?.length    ?? 0;
  const colCount = a.collections?.length ?? 0;
  if (note.includes("blue-chip") || (auCount >= 6 && colCount >= 5)) return "Blue-chip";
  if (note.includes("emerging") || note.includes("신진") || (auCount === 0 && colCount <= 1)) return "Emerging";
  return "Established";
}

function deriveTopics(a: Analysis): Set<string> {
  const haystack = [
    a.style ?? "",
    ...(a.keywords ?? []),
    a.description ?? "",
  ].join(" ").toLowerCase();

  const topics = new Set<string>();
  if (/(풍경|산수|landscape|scenery)/.test(haystack))            topics.add("landscape");
  if (/(초상|portrait|figure|얼굴)/.test(haystack))               topics.add("portrait");
  if (/(추상|abstract)/.test(haystack))                           topics.add("abstract");
  if (/(정물|still life|still-life)/.test(haystack))              topics.add("still_life");
  if (/(미니멀|minimal)/.test(haystack))                          topics.add("minimal");
  if (/(개념|conceptual|conceptualism)/.test(haystack))           topics.add("conceptual");
  if (/(설치|installation)/.test(haystack))                       topics.add("installation");
  if (/(사진|photograph)/.test(haystack))                         topics.add("photography");
  if (/(조각|sculpture)/.test(haystack))                          topics.add("sculpture");
  return topics;
}

/* ── Public API ───────────────────────────────────────────────────── */

/** Full chip set for the chat empty-state (5 questions). */
export function getSuggestedQuestions(a: Analysis): SuggestedQuestion[] {
  if (a.category === "architecture") {
    return [
      { text: "이 건축물의 역사적 의의는 무엇인가요?", type: "interpretation" },
      { text: "건축 양식의 특징을 설명해줘",         type: "interpretation" },
      { text: "같은 건축가의 다른 대표작은?",         type: "comparison"     },
      { text: "왜 세계유산으로 지정됐나요?",          type: "market"         },
      { text: "비슷한 건축물을 추천해줘",             type: "recommendation" },
    ];
  }
  if (a.category === "artifact" || a.category === "cultural_site") {
    return [
      { text: "이 유물의 문화적 의의는?",      type: "interpretation" },
      { text: "어느 시대 작품인가요?",         type: "interpretation" },
      { text: "현재 어디서 볼 수 있나요?",      type: "market"         },
      { text: "비슷한 문화재를 추천해줘",       type: "recommendation" },
      { text: "이 유물이 중요한 이유는?",      type: "market"         },
    ];
  }

  const position = deriveMarketPosition(a);
  const topics   = deriveTopics(a);
  const out: SuggestedQuestion[] = [];

  // Lead — interpretation, phrasing depends on position.
  out.push(
    position === "Emerging"
      ? { text: "이 작가의 작업 세계는 어떤 흐름인가요?", type: "interpretation" }
      : { text: "이 작품 왜 중요한가요?",              type: "interpretation" }
  );

  // Market — phrasing depends on data depth.
  if (position === "Blue-chip") {
    out.push({ text: "최근 5년 경매 가격 흐름은 어떤가요?", type: "market" });
  } else if (position === "Emerging") {
    out.push({ text: "초기 컬렉터들에게 이 작가는 어떤 의미인가요?", type: "market" });
  } else {
    out.push({ text: "이 작가의 시장 위치는?", type: "market" });
  }

  // Comparison — emerging want similar artists, others want major works.
  out.push(
    position === "Emerging"
      ? { text: "유사한 스타일로 작업하는 작가는?", type: "comparison" }
      : { text: "이 작가의 다른 대표작은?",        type: "comparison" }
  );

  // Topical
  if (topics.has("landscape")) {
    out.push({ text: "이 장소는 어디인가요?", type: "interpretation" });
  } else if (topics.has("portrait")) {
    out.push({ text: "그려진 인물은 누구인가요?", type: "interpretation" });
  } else if (topics.has("abstract") || topics.has("conceptual")) {
    out.push({ text: "어떤 개념을 다루는 작품인가요?", type: "interpretation" });
  } else if (topics.has("installation")) {
    out.push({ text: "어떤 공간에 설치되었던 작업인가요?", type: "interpretation" });
  } else {
    out.push({ text: "비슷한 작품을 추천해줘", type: "recommendation" });
  }

  // Closing — purchase-intent / taste-profile signal
  out.push(
    position === "Blue-chip"
      ? { text: "이 작품의 가격은 어떻게 봐야 하나요?",    type: "market" }
      : { text: "이 작품과 내 취향의 공통점은?",          type: "taste_profile" }
  );

  return out;
}

/**
 * Compact 3-chip set for the QuickReport screen — picks the strongest
 * picks from the full list. Shorter labels because chips sit inline
 * above the Ask CTA.
 */
export function getQuickReportChips(a: Analysis): SuggestedQuestion[] {
  const all = getSuggestedQuestions(a);
  // Take lead, market, and last (taste/intent) — that gives a balanced
  // mix of interpretation + market + personal across 3 chips.
  return [all[0], all[1], all[all.length - 1]].filter(Boolean) as SuggestedQuestion[];
}

/* ── STEP 6 — Ask ARTENA fixed chips ─────────────────────────────── */

/**
 * STEP 6 baseline — three canonical chips for the Ask ARTENA empty
 * state when no analysis context is available. BLOCK B's
 * `pickAskChips()` overrides this when the analysis has enough
 * signal to pick a more contextual set.
 */
export const ASK_CHIPS: { key: string; type: QuestionType }[] = [
  { key: "ask.chip_price_range",     type: "market"         },
  { key: "ask.chip_similar_artists", type: "comparison"     },
  { key: "ask.chip_importance",      type: "interpretation" },
];

/* ── BLOCK B — dynamic chip selection ────────────────────────────── */

export interface AskChip {
  key:  string;
  type: QuestionType;
}

/**
 * BLOCK B — pick exactly three contextual chips for the Ask surface.
 *
 * Selection signals:
 *   1. category         architecture / artifact / cultural_site
 *      vs. fine art (the default branch)
 *   2. market position  Blue-chip vs. Established vs. Emerging,
 *      derived from marketNote text + auction / collection counts
 *   3. topical signal   abstract / minimal / conceptual lift the
 *      interpretation set
 *
 * Returns translations.ts keys so the chip text tracks the active
 * UI language. Spec rule: max 40 chars, single line — every key
 * surfaced here resolves to a short interrogative.
 */
export function pickAskChips(a: Analysis): AskChip[] {
  // Architecture / heritage paths first — different vocabulary.
  if (a.category === "architecture") {
    return [
      { key: "ask.chip_history",        type: "interpretation" },
      { key: "ask.chip_importance",     type: "interpretation" },
      { key: "ask.chip_similar_works",  type: "comparison"     },
    ];
  }
  if (a.category === "artifact" || a.category === "cultural_site") {
    return [
      { key: "ask.chip_period",         type: "interpretation" },
      { key: "ask.chip_importance",     type: "interpretation" },
      { key: "ask.chip_where_visible",  type: "market"         },
    ];
  }

  // Position signals
  const note     = (a.marketNote ?? "").toLowerCase();
  const auCount  = a.auctions?.length    ?? 0;
  const colCount = a.collections?.length ?? 0;
  const isBlueChip = note.includes("blue-chip") || (auCount >= 6 && colCount >= 5);
  const isEmerging =
    note.includes("emerging") ||
    note.includes("신진") ||
    (auCount === 0 && colCount <= 1);

  // Topical signal — abstract / minimal / conceptual works lean
  // interpretation over price.
  const haystack = [
    a.style ?? "",
    ...(a.keywords ?? []),
    a.description ?? "",
  ].join(" ").toLowerCase();
  const isAbstract = /(abstract|추상|conceptual|개념|minimal|미니멀)/.test(haystack);

  if (isBlueChip) {
    return [
      { key: "ask.chip_price_range",     type: "market"     },
      { key: "ask.chip_market_trend",    type: "market"     },
      { key: "ask.chip_similar_artists", type: "comparison" },
    ];
  }
  if (isAbstract) {
    return [
      { key: "ask.chip_concept",         type: "interpretation" },
      { key: "ask.chip_importance",      type: "interpretation" },
      { key: "ask.chip_similar_artists", type: "comparison"     },
    ];
  }
  if (isEmerging) {
    return [
      { key: "ask.chip_importance",       type: "interpretation" },
      { key: "ask.chip_similar_artists",  type: "comparison"     },
      { key: "ask.chip_market_position",  type: "market"         },
    ];
  }

  // Default fallback — same three as the static ASK_CHIPS.
  return ASK_CHIPS;
}

/** Re-export for consumers that want the type. */
export type { QuestionType };
