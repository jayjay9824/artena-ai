/**
 * Shared types — used by both server (services/api) and client (UI).
 */

/** Insight chips displayed on the Result screen. */
export type Insight = {
  artist: string;
  title: string;
  year: string;
  medium: string;
  confidence: number; // 0–100
  isVerified: boolean;
};

/**
 * Recognition pipeline (two-stage Gemini → Claude).
 *
 *   gemini           — Gemini ≥75 confidence with artist/title present.
 *                      Treated as verified ground truth.
 *   gemini_partial   — Gemini 40-74 confidence OR labelText only.
 *                      Cautious tone, no fact-claim, helper guidance.
 *   claude_fallback  — Image present but Gemini failed (NOT_FOUND or null).
 *                      Claude does second-stage visual analysis with
 *                      isVerified=false and confidence capped.
 *   none             — No image. Question-only or text exploration.
 */
export type RecognitionSource =
  | 'gemini'
  | 'gemini_partial'
  | 'claude_fallback'
  | 'none';

export type RecognitionStatus = 'FOUND' | 'PARTIAL' | 'NOT_FOUND';

/** Full Claude artwork report. Insight + interpretive prose fields. */
export type ArtworkReport = Insight & {
  quickInsight: string;
  interpretation: string;
  artistContext: string;
  recognitionSource?: RecognitionSource;
  recognitionStatus?: RecognitionStatus;
};

/**
 * Gemini verification result — identification only.
 * The verification layer never produces interpretation text.
 */
export type Verification = {
  artist?: string | null;
  title?: string | null;
  labelText?: string;
  confidence: number; // 0–100
  status: RecognitionStatus;
  source: 'gemini';
};

/**
 * Real artist data fetched from an external source (Wikipedia today).
 * Used as ground-truth context for Claude — never invented.
 */
export type ArtistData = {
  artist: string;
  bio: string;
  styles: string[];
  sampleWorks: string[];
  source: 'wikipedia' | 'wikiart';
};
