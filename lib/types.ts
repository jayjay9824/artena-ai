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

/** Full Claude artwork report. Insight + interpretive prose fields. */
export type ArtworkReport = Insight & {
  quickInsight: string;
  interpretation: string;
  artistContext: string;
};

/**
 * Gemini verification result — identification only.
 * The verification layer never produces interpretation text.
 */
export type Verification = {
  artist: string | null;
  title: string | null;
  confidence: number; // 0–100
  labelText?: string;
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
