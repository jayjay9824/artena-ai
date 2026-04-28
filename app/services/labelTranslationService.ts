/**
 * STEP 4 — Server-side label translation.
 *
 * The OCR text → user-language pipeline. Detection is script-based
 * so it stays fast and dependency-free; the actual translation goes
 * through Claude Haiku with a glossary directive built from the
 * subset of art-historical terms that appear in the source text.
 *
 * Spec rule: input != output. When source equals target, we skip the
 * Claude call entirely and return an empty translatedText — the UI
 * uses that as the signal to hide the View Original toggle.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { LabelTranslation, LangCode } from "../analyze/types/labelTranslation";
import { findGlossaryHits, GlossaryEntry } from "./labelGlossary";
import { detectLang } from "../analyze/lib/detectLang";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* Re-export for callers that imported from this module historically. */
export { detectLang };

/* ── Prompt assembly ───────────────────────────────────────────── */

const LANG_NAME: Record<LangCode, string> = {
  ko: "Korean",  en: "English", ja: "Japanese", zh: "Chinese",
  fr: "French",  es: "Spanish", de: "German",   it: "Italian",
  unknown: "English",
};

function buildGlossaryDirective(hits: GlossaryEntry[], target: LangCode): string {
  if (hits.length === 0) return "";
  const lines = hits.map(h => {
    const targetForms = h.forms[target as keyof typeof h.forms];
    const targetForm  = targetForms?.[0];
    if (targetForm && targetForm !== h.canonical) {
      return `- "${h.canonical}" → "${targetForm}"`;
    }
    return `- "${h.canonical}" (preserve as-is)`;
  });
  return [
    "Glossary — these art-historical terms must be rendered exactly as listed:",
    ...lines,
  ].join("\n");
}

/* ── Translate ─────────────────────────────────────────────────── */

export async function translateLabel(
  text:    string,
  target:  LangCode,
  source?: LangCode,
): Promise<LabelTranslation> {
  const original = text.trim();
  const detected = source && source !== "unknown" ? source : detectLang(original);

  // Spec STEP 4 rule: input != output. Pass-through when same.
  if (detected === target || target === "unknown") {
    return {
      originalText:   original,
      originalLang:   detected,
      translatedText: "",
      targetLang:     target,
      preservedTerms: [],
    };
  }

  const hits           = findGlossaryHits(original);
  const glossaryBlock  = buildGlossaryDirective(hits, target);

  const prompt = [
    `You are translating museum label / catalogue copy from ${LANG_NAME[detected]} to ${LANG_NAME[target]}.`,
    glossaryBlock,
    "",
    "Rules:",
    "- Preserve art-historical terms exactly per the glossary above.",
    "- Keep proper nouns, artist names, and museum names in their canonical form.",
    "- Do not add commentary, do not echo the source, do not wrap in quotes.",
    "  Respond with the translation and nothing else.",
    "",
    "Source:",
    original,
    "",
    "Translation:",
  ].filter(Boolean).join("\n");

  const response = await client.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 800,
    messages:   [{ role: "user", content: prompt }],
  });

  const txt        = response.content.find(b => b.type === "text");
  const translated = txt?.type === "text" ? txt.text.trim() : "";

  return {
    originalText:   original,
    originalLang:   detected,
    translatedText: translated,
    targetLang:     target,
    preservedTerms: hits.map(h => h.canonical),
  };
}
