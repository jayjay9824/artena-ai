/**
 * STEP 1 — Object category classifier.
 *
 * The Quick Report decides whether to render Market Intelligence by
 * collapsing the analysis into an `AnalysisResult`. Market is
 * allowed only when:
 *
 *   objectCategory === "artwork"
 *     AND isMarketRelevant === true
 *     AND marketDataAvailable === true
 *
 * Anything else falls through to Cultural Heritage Intelligence.
 *
 * No hallucinations: when we can't classify confidently the result
 * is "unknown", which routes the user to the heritage fallback —
 * never to a half-formed market panel.
 */

import type { CollectionAnalysis } from "../../collection/hooks/useCollection";
import type { ObjectCategory, AnalysisResult } from "../../lib/types";

/* ── Classification ───────────────────────────────────────────── */

/**
 * Map the Claude analysis category + topical signals to one of the
 * canonical ObjectCategory values.
 */
export function classifyObject(a: CollectionAnalysis): ObjectCategory {
  const cat = a.category;

  // Direct mappings from the Claude prompt's category field.
  if (cat === "painting" || cat === "sculpture") return "artwork";
  if (cat === "architecture")                    return "architecture";
  if (cat === "artifact")                        return "artifact";
  if (cat === "cultural_site")                   return "historic_site";

  // Topical fallbacks — keyword + style sniffing only when the
  // primary category is missing or unrecognized.
  const haystack = [
    a.style ?? "",
    ...(a.keywords ?? []),
    a.description ?? "",
    a.title ?? "",
  ].join(" ").toLowerCase();

  if (/\b(museum guide|audio guide|app guide|시각 안내|뮤지엄 가이드|오디오 가이드)\b/.test(haystack)) {
    return "museum_guide";
  }
  if (/\b(design object|art toy|limited edition|디자인 오브제|아트 토이)\b/.test(haystack)) {
    return "design_object";
  }
  if (/\b(armor|armour|relic|pottery|ancient|bronze age|iron age|prehistoric|갑옷|토기|유물|고대)\b/.test(haystack)) {
    return "cultural_heritage";
  }

  return "unknown";
}

/* ── Market relevance ─────────────────────────────────────────── */

/**
 * Categories that have a meaningful art-market signal. Cultural
 * heritage, architecture, museum guides, etc. don't trade — their
 * Market Intelligence section must be hidden.
 */
export function isMarketRelevantCategory(c: ObjectCategory): boolean {
  return c === "artwork" || c === "design_object" || c === "collectible";
}

/**
 * Does the analysis carry verified market data? Concretely: at
 * least one auction record with a parseable result string. We do
 * not synthesize ranges from single records — Trust over Fancy.
 */
export function hasMarketData(a: CollectionAnalysis): boolean {
  const auctions = a.auctions ?? [];
  if (auctions.length === 0) return false;
  return auctions.some(au => typeof au.result === "string" && /\d/.test(au.result));
}

/* ── Combined dispatch ────────────────────────────────────────── */

export function deriveAnalysisResult(a: CollectionAnalysis): AnalysisResult {
  const objectCategory      = classifyObject(a);
  const isMarketRelevant    = isMarketRelevantCategory(objectCategory);
  const marketDataAvailable = hasMarketData(a);
  return { objectCategory, isMarketRelevant, marketDataAvailable };
}

/**
 * Final render-gate: render Market Intelligence iff all three
 * conditions hold. Otherwise the surface uses Cultural Heritage
 * Intelligence.
 */
export function shouldShowMarket(result: AnalysisResult): boolean {
  return (
    result.objectCategory      === "artwork" &&
    result.isMarketRelevant    === true      &&
    result.marketDataAvailable === true
  );
}
