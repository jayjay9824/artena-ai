/**
 * Request-bound user language resolver.
 *
 * Read priority (V3 spec):
 *   1. x-axvela-lang request header
 *   2. axvela_lang cookie
 *   3. artena_language cookie (legacy)
 *   4. fallback "ko"
 *
 * Strict union ("ko" | "en") — anything outside that set is treated
 * as malformed and falls through to the next source. The string
 * helper (languageInstructionFor) returns the spec-mandated injection
 * line that gets appended to the existing system prompt so Claude
 * answers in the user's language without restructuring the API
 * response schema.
 */

import type { NextRequest } from "next/server";

export type UserLang = "ko" | "en";

export function readUserLang(req: NextRequest): UserLang {
  // 1. Header — set by the client when a request originates from a
  //    surface that already knows the active locale.
  const header = req.headers.get("x-axvela-lang");
  if (header === "ko" || header === "en") return header;

  // 2. New canonical cookie.
  const axvela = req.cookies.get("axvela_lang")?.value;
  if (axvela === "ko" || axvela === "en") return axvela;

  // 3. Legacy cookie (mirrored on every write since Step 4).
  const legacy = req.cookies.get("artena_language")?.value;
  if (legacy === "ko" || legacy === "en") return legacy;

  // 4. Default — Korean is the primary surface language.
  return "ko";
}

/**
 * One-line system-prompt injection that forces the model to answer
 * in the user's language. Append to the END of the existing prompt
 * so it overrides any earlier (Korean-by-default) tone scaffolding.
 */
export function languageInstructionFor(lang: UserLang): string {
  if (lang === "en") {
    return "Respond in English only. Do not use Korean.";
  }
  return "한국어로만 응답하세요. 영어를 섞지 마세요.";
}

/** Spec-mandated rejection fallback localised by user language. */
export function rejectionFallbackFor(lang: UserLang): string {
  if (lang === "en") {
    return "This doesn't appear to be an artwork. Please try a different image.";
  }
  return "작품으로 판별되지 않았습니다. 다른 이미지로 다시 시도해주세요.";
}
