/**
 * Recognition confidence + status classifier.
 *
 * Two signals are blended:
 *
 *   1. Model self-confidence (a.recognitionConfidence) — reported by
 *      Claude with the analysis. Calibrated by the prompt's accuracy
 *      block: 90+ for signature/caption matches, 75-89 for strong
 *      stylistic matches, etc.
 *
 *   2. Heuristic from the analysis fields — penalizes generic
 *      placeholders (Unknown / 미상 / 미확인 / Untitled), rewards
 *      specific artist + title + year + verified provenance.
 *
 * Combination rule: take the model's number when present, but cap it
 * by the heuristic when the heuristic is materially lower (i.e. the
 * model claims high confidence but the data still reads as generic
 * — never let an over-confident model bypass our placeholder check).
 *
 * Thresholds:
 *   confidence ≥ 80   confirmed
 *   60 ≤ c < 80       partial
 *   confidence < 60   uncertain
 *
 * Trust over fancy: when in doubt, downgrade so the UI surfaces the
 * label-scan path instead of a definitive-looking result.
 */

import type { CollectionAnalysis } from "../../collection/hooks/useCollection";
import type { RecognitionState, RecognitionStatus } from "../../lib/types";

const GENERIC_TITLE  = /(unknown|untitled|미상|미확인|undefined|n\/a)/i;
const GENERIC_ARTIST = /(unknown|미상|미확인|undefined|none|n\/a)/i;
const UNIDENTIFIED   = /(미확인|unidentified|unconfirmed)/i;

/** Heuristic-only score, kept separate so callers can inspect it. */
export function deriveRecognitionHeuristic(a: CollectionAnalysis): number {
  let score = 50;

  const title  = (a.title  ?? "").trim();
  const artist = (a.artist ?? "").trim();

  if (title  && !GENERIC_TITLE.test(title))    score += 15;
  if (artist && !GENERIC_ARTIST.test(artist))  score += 15;
  if (a.year  && a.year.trim())                score += 8;
  if (a.style && a.style.trim())               score += 6;
  if ((a.auctions?.length    ?? 0) > 0)        score += 4;
  if ((a.collections?.length ?? 0) > 0)        score += 2;

  // Penalty: title or artist still says "unidentified" / "미확인"
  if (UNIDENTIFIED.test(title) || UNIDENTIFIED.test(artist)) score -= 25;

  return Math.max(0, Math.min(100, score));
}

export function deriveRecognitionConfidence(a: CollectionAnalysis): number {
  const heuristic = deriveRecognitionHeuristic(a);
  const modelRaw  = a.recognitionConfidence;

  // No model self-rating (legacy or quick-path miss) — fall back to
  // the heuristic so older reports keep working.
  if (typeof modelRaw !== "number" || Number.isNaN(modelRaw)) {
    return heuristic;
  }

  const model = Math.max(0, Math.min(100, Math.round(modelRaw)));

  // Cap by heuristic when the heuristic is much lower — guards
  // against a confident-sounding model output paired with generic
  // placeholders. Otherwise weighted blend (model 65 / heuristic 35).
  if (heuristic + 20 < model) return heuristic;
  return Math.round(model * 0.65 + heuristic * 0.35);
}

export function classifyRecognition(c: number): RecognitionStatus {
  if (c >= 80) return "confirmed";
  if (c >= 60) return "partial";
  return "uncertain";
}

export function deriveRecognition(a: CollectionAnalysis): RecognitionState {
  const recognitionConfidence = deriveRecognitionConfidence(a);
  const recognitionStatus     = classifyRecognition(recognitionConfidence);
  return { recognitionConfidence, recognitionStatus };
}
