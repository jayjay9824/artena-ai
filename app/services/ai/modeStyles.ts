/**
 * AXVELA AI — mode-aware UI style tokens.
 *
 * Encodes Step 4 section 6 visual differences between answer modes
 * as a pure data object. The toggle component does not consume this
 * (it stays uniform black/white per spec); answer-rendering surfaces
 * (Step 5) read getModeUIStyle(mode) to apply per-mode typography
 * and layout.
 *
 *   Appreciation — slightly larger text, generous whitespace,
 *                  paragraph layout
 *   Investment   — structured rows, accent for numbers / KPIs
 *   Expert       — denser layout, bullet-friendly, smaller text
 *
 * All three share the same body color so reads stay consistent;
 * what changes is rhythm (size, line-height, spacing) and layout
 * hint that the renderer can branch on.
 */

import type { AnswerMode } from "../../types/ai";

export type ModeLayout = "paragraph" | "structured" | "bullet";

export interface ModeUIStyle {
  /** Body text size (px). */
  fontSize:         number;
  /** Body line-height (unitless). */
  lineHeight:       number;
  /** Vertical gap between paragraphs / sections (px). */
  paragraphSpacing: number;
  /** Primary body color — kept uniform across modes for read
   *  consistency; specific accents come from accentColor. */
  textColor:        string;
  /** Highlight color for numbers, headings, KPIs. */
  accentColor:      string;
  /** Layout hint the renderer can branch on. */
  layout:           ModeLayout;
}

const APPRECIATION_STYLE: ModeUIStyle = {
  fontSize:         14,
  lineHeight:       1.80,
  paragraphSpacing: 16,
  textColor:        "#1C1A17",
  accentColor:      "#8A6A3F",
  layout:           "paragraph",
};

const INVESTMENT_STYLE: ModeUIStyle = {
  fontSize:         13,
  lineHeight:       1.65,
  paragraphSpacing: 14,
  textColor:        "#1C1A17",
  accentColor:      "#8A6A3F",
  layout:           "structured",
};

const EXPERT_STYLE: ModeUIStyle = {
  fontSize:         12.5,
  lineHeight:       1.55,
  paragraphSpacing: 10,
  textColor:        "#1C1A17",
  accentColor:      "#8A6A3F",
  layout:           "bullet",
};

export function getModeUIStyle(mode: AnswerMode): ModeUIStyle {
  if (mode === "investment") return INVESTMENT_STYLE;
  if (mode === "expert")     return EXPERT_STYLE;
  return APPRECIATION_STYLE;
}
