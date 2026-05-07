/**
 * STEP 4 — Global label-translation types.
 *
 * Museum / catalogue OCR can hand us text in any of the languages we
 * care about: KO, EN, JA, ZH plus the Romance subset that shows up
 * in catalogue copy (FR, ES, DE, IT). Output is whichever UI language
 * the user is currently in.
 *
 * The original text is *always* preserved — STEP 4's "View Original
 * Label" toggle requires both sides be on hand even after the
 * translated copy is rendered.
 */

export type LangCode =
  | "ko" | "en" | "ja" | "zh"
  | "fr" | "es" | "de" | "it"
  | "unknown";

export interface LabelTranslation {
  /** Exactly what OCR returned — untouched. */
  originalText:    string;
  /** Detected source language. */
  originalLang:    LangCode;
  /**
   * Translation in the user's UI language. Empty string when source
   * equals target (the spec's "input != output" rule, STEP 4); UI
   * hides the toggle in that case.
   */
  translatedText:  string;
  /** UI language at translation time. */
  targetLang:      LangCode;
  /** Glossary terms the translator was instructed to preserve. */
  preservedTerms:  string[];
}
