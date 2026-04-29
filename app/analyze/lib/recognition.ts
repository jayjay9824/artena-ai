/**
 * STEP 2 — Recognition confidence + status classifier.
 *
 * Derived (not Claude-returned) from analysis signals so we never
 * trust a generic / placeholder identification:
 *
 *   • Specific artist + title + year + style → boosts
 *   • Generic terms (Unknown / Untitled / 미상 / 미확인) → penalty
 *   • Verified provenance (auctions, collections) → small boost
 *
 * Thresholds (spec):
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

export function deriveRecognitionConfidence(a: CollectionAnalysis): number {
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
