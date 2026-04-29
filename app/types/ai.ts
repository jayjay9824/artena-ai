/**
 * AXVELA AI Mode System — shared types.
 *
 * The AnswerMode union and AxvelaAIContext shape feed every future
 * step of the Mode System (prompt engine, mode-aware UI chips,
 * confidence-conditioned answers, etc.). This file is the single
 * source of truth — no other module should redeclare these.
 *
 * Step 1 boundary: types + state only. No API calls, no prompt
 * builder, no price logic in this file or the matching context.
 */

/* ── Mode union ─────────────────────────────────────────────────── */

/**
 * The three perspectives AXVELA can answer from. Each carries a
 * distinct tone, evidence threshold, and topical bias:
 *
 *   appreciation — interpretive / curatorial. Default. Always safe
 *                  regardless of marketDataAvailable.
 *   investment   — market-analyst lens. Gated by marketDataAvailable
 *                  + isMarketRelevant; never surfaced for cultural
 *                  heritage / non-market objects.
 *   expert       — academic / specialist register. Cites movements,
 *                  technique, art-historical lineage; tighter
 *                  evidence than appreciation.
 */
export type AnswerMode =
  | "appreciation"
  | "investment"
  | "expert";

/** Default mode applied at first paint and after a "reset". */
export const DEFAULT_ANSWER_MODE: AnswerMode = "appreciation";

/* ── AI request context ─────────────────────────────────────────── */

/**
 * The full bundle of signals an AXVELA AI call needs. Future steps
 * (Step 2: prompt engine, Step 3+: chips / overrides / answer flow)
 * read from this single object instead of threading individual props.
 *
 * Optional fields reflect "may not be known yet" — the prompt engine
 * has to degrade gracefully when, for example, recognitionConfidence
 * is missing because the artwork came from a stored report rather
 * than a fresh scan.
 *
 * NOTE — This is intentionally distinct from the existing
 * AssistantContext in app/api/assistant/route.ts (which is the wire
 * shape between the chat client and the streaming endpoint). Keeping
 * them separate avoids retrofitting mode logic into the existing
 * chat path before Step 2/3 has wired the prompt engine.
 */
export interface AxvelaAIContext {
  /* Identity */
  artworkId?: string;
  artist?:    string;
  title?:     string;
  year?:      string;
  medium?:    string;

  /* Object-category dispatch (mirrors objectCategory.ts derivation) */
  objectCategory?:      string;
  isMarketRelevant?:    boolean;
  marketDataAvailable?: boolean;

  /* Recognition reliability — gates how confidently AXVELA may
     speak. Missing → caller treats as "unknown, be cautious". */
  recognitionConfidence?: number;

  /* Multimodal label scan output, when present. */
  extractedLabelText?: string;
  originalLanguage?:   string;

  /* Output language — never optional. UI carries this from
     useLanguage() at call-site. */
  outputLanguage: "ko" | "en";

  /* Mode + question */
  selectedMode: AnswerMode;
  userQuestion: string;
}

/* ── Price estimation (Step 5) ─────────────────────────────────── */

/**
 * Currencies AXVELA supports for structured price output. Numbers
 * are produced raw (no symbol, no thousands grouping) — UI applies
 * the locale-appropriate format. See app/lib/format/currency.ts.
 */
export type Currency = "KRW" | "USD" | "EUR";

/**
 * Structured price estimate. Returned only when all four
 * eligibility conditions pass (objectCategory artwork, market
 * relevant, market data available, recognitionConfidence ≥ 70).
 *
 * low / mid / high are nullable so partial data (e.g. only a high
 * benchmark, no low) can still surface without inventing the
 * missing point.
 *
 * basis and risks are strings only — never fabricate comparable
 * sales; populate from verifiable signals (auction lots, gallery
 * references, recognition state).
 */
export interface PriceEstimate {
  currency:   Currency;
  low:        number | null;
  mid:        number | null;
  high:       number | null;
  /** 0-100 — confidence in the price band, distinct from
   *  recognitionConfidence which scopes identification. */
  confidence: number;
  basis:      string[];
  risks:      string[];
  disclaimer: string;
}
