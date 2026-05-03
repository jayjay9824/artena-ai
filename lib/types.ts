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
