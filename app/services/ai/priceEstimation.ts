/**
 * AXVELA AI — price estimation gate + structured builder.
 *
 * Step 5 boundary: gate, transform, and message helpers. No AI
 * API call here — the existing market-intelligence pipeline
 * already produces raw price data; this module is the safety
 * gate that decides whether to surface it, transforms what
 * exists into the canonical PriceEstimate shape, and supplies
 * the bilingual block / disclaimer copy.
 *
 * Hard rules (enforced regardless of caller intent):
 *
 *   1. Allow price ONLY if ALL four conditions hold:
 *        objectCategory      === "artwork"
 *        isMarketRelevant    === true
 *        marketDataAvailable === true
 *        recognitionConfidence ≥ 70
 *
 *   2. Never fabricate. If a price point is missing, leave it
 *      null. If basis / risks arrays are empty, leave them empty.
 *      Do not synthesize numbers, do not invent comparables.
 *
 *   3. UI formats currency. AI / logic produces numbers only.
 *
 *   4. The returned PriceEstimate always carries the disclaimer
 *      string in the user's outputLanguage — the caller never has
 *      to remember to add it.
 *
 * Currency selection precedence:
 *
 *   user-pref (caller passes preferredCurrency)
 *     → otherwise outputLanguage === "ko"  → KRW
 *     → otherwise                           → USD
 */

import type { AxvelaAIContext, Currency, PriceEstimate } from "../../types/ai";

/* ── Eligibility ────────────────────────────────────────────────── */

/** Strict 4-of-4 gate. Returns false when any condition fails. */
export function isPriceEstimationAllowed(ctx: AxvelaAIContext): boolean {
  return (
    ctx.objectCategory      === "artwork" &&
    ctx.isMarketRelevant    === true      &&
    ctx.marketDataAvailable === true      &&
    typeof ctx.recognitionConfidence === "number" &&
    ctx.recognitionConfidence  >= 70
  );
}

/* ── Default currency ───────────────────────────────────────────── */

const KO_DEFAULT_CURRENCY: Currency = "KRW";
const FALLBACK_CURRENCY:   Currency = "USD";

export function pickDefaultCurrency(
  ctx: AxvelaAIContext,
  userPref?: Currency,
): Currency {
  if (userPref) return userPref;
  if (ctx.outputLanguage === "ko") return KO_DEFAULT_CURRENCY;
  return FALLBACK_CURRENCY;
}

/* ── Block / disclaimer copy ────────────────────────────────────── */

/**
 * Single sentence shown when price estimation is not allowed.
 * Caller renders this verbatim — never an empty range, never
 * fake low/mid/high.
 */
export function getPriceBlockMessage(outputLanguage: "ko" | "en"): string {
  return outputLanguage === "ko"
    ? "가격 추정이 어렵습니다. 더 많은 작품 정보와 시장 데이터가 필요합니다."
    : "Price estimation is unavailable due to insufficient artwork or market data.";
}

/** Always-present disclaimer attached to every PriceEstimate. */
export function getPriceDisclaimer(outputLanguage: "ko" | "en"): string {
  return outputLanguage === "ko"
    ? "이 내용은 공식 감정가가 아니며 참고용 시장 정보입니다."
    : "This is not an official appraisal and is for reference only.";
}

/* ── Source bundle ──────────────────────────────────────────────── */

/**
 * Caller-supplied real data. Anything missing stays missing —
 * buildPriceEstimate will not fill gaps with fabricated values.
 *
 * Numbers must already be in the currency the caller intends to
 * surface; this module performs no FX conversion.
 */
export interface PriceEstimateSource {
  priceRange?: {
    low?:  number | null;
    mid?:  number | null;
    high?: number | null;
  };
  /** Currency the priceRange numbers are denominated in. */
  sourceCurrency?: Currency;
  /** 0-100 confidence in the market data itself. */
  marketConfidence?: number;
  /** Verifiable basis lines (auction lot count, gallery refs, etc).
   *  Strings — UI renders verbatim. */
  basis?: string[];
  /** Risk factors (data thinness, regional gaps, etc). */
  risks?: string[];
}

/* ── Builder ────────────────────────────────────────────────────── */

export interface BuildPriceEstimateOptions {
  preferredCurrency?: Currency;
}

/**
 * Returns a PriceEstimate when allowed AND at least one price point
 * exists. Returns null otherwise — caller renders the block
 * message (getPriceBlockMessage) instead of an empty card.
 *
 * Never throws. Empty basis / empty risks pass through unchanged
 * — better to show "no comparables on file" than to invent some.
 */
export function buildPriceEstimate(
  ctx:     AxvelaAIContext,
  source?: PriceEstimateSource | null,
  options: BuildPriceEstimateOptions = {},
): PriceEstimate | null {
  // 1. Hard gate.
  if (!isPriceEstimationAllowed(ctx)) return null;

  // 2. No source or empty band → no fabrication. Block.
  const range = source?.priceRange;
  if (!range) return null;
  const low  = numericOrNull(range.low);
  const mid  = numericOrNull(range.mid);
  const high = numericOrNull(range.high);
  if (low === null && mid === null && high === null) return null;

  // 3. Pick currency.
  const currency = options.preferredCurrency
    ?? source?.sourceCurrency
    ?? pickDefaultCurrency(ctx);

  // 4. Confidence — caller's marketConfidence wins; otherwise we
  //    derive a conservative number from the available signals.
  const confidence = clamp(
    typeof source?.marketConfidence === "number"
      ? source.marketConfidence
      : deriveBandConfidence(ctx, range),
    0, 100,
  );

  // 5. Risks — preserve caller risks, then append a recognition
  //    note when ID confidence is in the 70-79 grey zone.
  const risks = enrichRisks(source?.risks ?? [], ctx);

  return {
    currency,
    low,
    mid,
    high,
    confidence,
    basis:      source?.basis ?? [],
    risks,
    disclaimer: getPriceDisclaimer(ctx.outputLanguage),
  };
}

/* ── Internals ──────────────────────────────────────────────────── */

function numericOrNull(v: unknown): number | null {
  if (typeof v !== "number") return null;
  return Number.isFinite(v) ? v : null;
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return lo;
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Conservative band confidence when the caller hasn't passed one.
 * Anchors on recognitionConfidence (already ≥ 70 because gate
 * passed) and shaves points when the low/high band is missing
 * data — incomplete bands shouldn't read as fully calibrated.
 */
function deriveBandConfidence(
  ctx:   AxvelaAIContext,
  range: NonNullable<PriceEstimateSource["priceRange"]>,
): number {
  let score = ctx.recognitionConfidence ?? 70;
  if (range.low  == null) score -= 8;
  if (range.high == null) score -= 8;
  if (range.mid  == null) score -= 4;
  return score;
}

function enrichRisks(base: string[], ctx: AxvelaAIContext): string[] {
  const out  = [...base];
  const conf = ctx.recognitionConfidence;
  const ko   = ctx.outputLanguage === "ko";

  if (typeof conf === "number" && conf < 80) {
    out.push(
      ko
        ? `식별 신뢰도 ${conf} — 정확한 가격 평가를 위해 라벨 확인 권장`
        : `Identification confidence ${conf} — label verification recommended for precise valuation`,
    );
  }
  return out;
}
