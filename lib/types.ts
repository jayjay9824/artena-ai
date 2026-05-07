/**
 * Shared types — used by both server (services/api) and client (UI).
 */

/** Insight chips displayed on the Result screen. */
export type Insight = {
  artist: string;
  title: string;
  year: string;
  medium: string;
  /** Final post-merge confidence shown on the chip (0–100). */
  confidence: number;
  isVerified: boolean;
};

/**
 * Recognition pipeline (Claude-primary, Gemini-OCR-supporting).
 *
 *   image_match                       — vector similarity ≥0.85 catalog hit. FOUND.
 *   image_match_partial               — vector 0.65–0.85 candidate. PARTIAL.
 *   claude_visual                     — Claude visual recognition. FOUND if visualConfidence ≥80, PARTIAL 50–79.
 *   claude_visual_gemini_supported    — Claude high confidence + Gemini OCR confirms. FOUND.
 *   gemini_label                      — Claude weak, Gemini OCR found a label artist/title. PARTIAL.
 *   visual_uncertain                  — No confident identification — visual analysis only. NOT_FOUND.
 *   none                              — No image (text-only input).
 */
export type RecognitionSource =
  | 'image_match'
  | 'image_match_partial'
  | 'claude_visual'
  | 'claude_visual_gemini_supported'
  | 'gemini_label'
  | 'visual_uncertain'
  | 'none';

export type RecognitionStatus = 'FOUND' | 'PARTIAL' | 'NOT_FOUND';

/** A single artwork catalog hit returned by the vector-search layer. */
export type ArtworkCandidate = {
  id: string;
  artist: string;
  title: string;
  year?: string;
  medium?: string;
  similarity: number; // 0–1 cosine similarity
};

/** A possible artist candidate when Claude's identification is uncertain. */
export type PossibleCandidate = {
  artist: string;
  confidence: number; // 0–100
  reason: string;
};

/** Full Claude artwork report. Insight + interpretive prose + recognition metadata. */
export type ArtworkReport = Insight & {
  quickInsight: string;
  interpretation: string;
  artistContext: string;
  /** Claude's raw visual confidence (separate from final post-merge confidence). */
  visualConfidence?: number;
  /** Claude's reason for its visual identification. */
  visualReason?: string;
  /** Possible candidates when exact identity is uncertain. */
  possibleCandidates?: PossibleCandidate[];
  /** Suggested follow-up artworks/artists. */
  suggestedActions?: string[];
  recognitionSource?: RecognitionSource;
  recognitionStatus?: RecognitionStatus;
};

/**
 * Gemini OCR output. Gemini is restricted to label/QR/text extraction —
 * it does NOT do visual artwork identification. Visual recognition is
 * Claude's job (claudeReportService).
 */
export type Verification = {
  /** Verbatim transcription of any visible label/plaque/sign text. Empty if none. */
  labelText: string;
  /** Decoded QR payload if a QR code is visible (else null). */
  qrPayload: string | null;
  /** Artist name extracted from labelText (else null). Never inferred from style. */
  textArtist: string | null;
  /** Title extracted from labelText (else null). */
  textTitle: string | null;
  /** 0–100, how clearly the label text is readable. */
  textConfidence: number;
  source: 'gemini';
};

/**
 * Real artist data fetched from an external source (Wikipedia today).
 * Used as ground-truth context for the UI's artist info panel.
 */
export type ArtistData = {
  artist: string;
  bio: string;
  styles: string[];
  sampleWorks: string[];
  source: 'wikipedia' | 'wikiart';
};
