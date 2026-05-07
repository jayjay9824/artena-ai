/**
 * AXVELA AI — auto mode detection from the user's question.
 *
 * Step 3 boundary: pure function. No state, no API calls, no UI.
 * Steps 4-5 wire this into the chat send-path so the prompt engine
 * builds with the right mode without forcing the user to pick one
 * manually for every question.
 *
 * Decision order (early returns):
 *
 *   1. isManualModeOverride === true   → keep currentMode
 *      (the user actively picked a mode chip; honor it)
 *
 *   2. objectCategory !== "artwork"    → "expert"
 *      (heritage / artifact / architecture / unknown all read
 *      through the cultural-expert lens)
 *
 *   3. keyword scan with priority:     investment > expert > appreciation
 *      (hybrid questions resolve to the highest-priority intent)
 *
 *   4. investment intent but blocked   → "expert"
 *      (objectCategory must be artwork AND isMarketRelevant true
 *      AND marketDataAvailable true — otherwise drop to expert)
 *
 *   5. no keyword matched              → keep currentMode
 *      (preserve the last surface the user was on for vague
 *      follow-ups like "tell me more")
 *
 * Investment-allowed gating delegates to isInvestmentAllowed()
 * from promptEngine so the gate definition lives in exactly one
 * place across the system.
 */

import type { AnswerMode, AxvelaAIContext } from "../../types/ai";
import { isInvestmentAllowed } from "./promptEngine";

/* ── Keyword sets ───────────────────────────────────────────────── */

/* Korean stems matched as substrings; English stems matched with a
   leading word boundary (so "price" → "priced" / "prices", "value"
   → "valuable" / "valued" / "valuation"). Trailing boundary
   intentionally omitted to capture inflections. */

const INVESTMENT_PATTERNS: RegExp[] = [
  /가격/, /얼마/, /시장가/, /추정가/, /투자/, /가치/,
  /\bprice/i, /\bvalue/i, /\bestimate/i, /\bmarket/i, /\binvestment/i,
];

const EXPERT_PATTERNS: RegExp[] = [
  /미술사/, /기법/, /시대/, /양식/, /도상/,
  /\biconograph/i, /\btechnique/i, /\bhistorical/i, /\bperiod/i, /\bstyle/i,
];

const APPRECIATION_PATTERNS: RegExp[] = [
  /의미/, /느낌/, /어떻게\s*봐/, /왜\s*좋/,
  /\bexplain/i, /\bmeaning/i, /why\s+interesting/i, /how\s+should\s+i\s+look/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

/* ── Public API ─────────────────────────────────────────────────── */

export interface DetectAnswerModeOptions {
  isManualModeOverride?: boolean;
}

export function detectAnswerModeFromQuestion(
  question:    string,
  currentMode: AnswerMode,
  context:     AxvelaAIContext,
  options:     DetectAnswerModeOptions = {},
): AnswerMode {
  // 1. Manual override — never auto-switch when the user has
  //    actively chosen a mode from the UI.
  if (options.isManualModeOverride === true) return currentMode;

  // 2. Force expert for any non-artwork object. Heritage / artifact
  //    / architecture / historic site / unknown all live in the
  //    cultural-expert lens regardless of question wording.
  if (context.objectCategory !== "artwork") return "expert";

  const q = question.trim();
  if (q.length === 0) return currentMode;

  const hasInvestment   = matchesAny(q, INVESTMENT_PATTERNS);
  const hasExpert       = matchesAny(q, EXPERT_PATTERNS);
  const hasAppreciation = matchesAny(q, APPRECIATION_PATTERNS);

  // 3. Hybrid priority: investment > expert > appreciation.
  //    If the user asks "이 작품의 미술사적 의미는 뭐고 지금 얼마야?",
  //    investment wins so the price question is addressed first.
  if (hasInvestment) {
    // 4. But only if investment is actually allowed for this object.
    //    Otherwise fall through to expert — never silently surface
    //    price logic on a non-market object.
    return isInvestmentAllowed(context) ? "investment" : "expert";
  }
  if (hasExpert)       return "expert";
  if (hasAppreciation) return "appreciation";

  // 5. No keyword matched — keep the current surface so vague
  //    follow-ups don't bounce the user between modes.
  return currentMode;
}
