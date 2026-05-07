/**
 * STEP 4 — Pure script-based language detection.
 *
 * Lives outside the analyze service so client components can import
 * it without dragging in the Anthropic SDK. Used as a same-language
 * short-circuit before calling /api/translate-label, and on the
 * server inside translateLabel to enforce the input != output rule.
 */

import type { LangCode } from "../types/labelTranslation";

export function detectLang(text: string): LangCode {
  if (!text) return "unknown";
  // Hangul (syllables, Jamo, compatibility Jamo)
  if (/[가-힣ᄀ-ᇿ㄰-㆏]/.test(text)) return "ko";
  // Hiragana / Katakana (Japanese-only kana ranges)
  if (/[぀-ゟ゠-ヿ]/.test(text)) return "ja";
  // CJK ideographs without kana → treat as Chinese (kana-bearing JP
  // already handled above)
  if (/[一-鿿]/.test(text)) return "zh";
  // Latin scripts (basic + supplement) — too noisy to distinguish FR/ES/DE/IT
  // without a stat model. Surface as "en" and let the translator
  // re-classify on the server side.
  if (/[A-Za-zÀ-ÿ]/.test(text)) return "en";
  return "unknown";
}
