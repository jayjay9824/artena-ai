/**
 * ARTENA / Gallery Console — shared domain types.
 *
 * Single source of truth for the data shapes that flow between the
 * ARTENA user app and the (future) Gallery Console. The user app
 * writes interactions and reports against these types; Gallery
 * Console will later read from the same shapes.
 *
 * Keep this file backend-agnostic — no React, no fetch, no storage.
 */

/* ── Identifiers ───────────────────────────────────────────────── */

export type ReportId   = string;   // nanoid(10)
export type UserId     = string;   // localStorage-issued for now
export type ArtworkId  = string;
export type GalleryId  = string;
export type ArtistId   = string;

/* ── Core domain (Gallery Console will populate these) ─────────── */

export interface Gallery {
  id:      GalleryId;
  name:    string;
  logoUrl?: string;
}

export interface Artist {
  id:      ArtistId;
  name:    string;
  /** Alternate spellings, romanizations, or maiden/professional names. */
  aliases: string[];
}

export type PriceVisibility    = "public" | "on_request" | "private";
export type AvailabilityStatus = "available" | "reserved" | "sold" | "not_for_sale";

/**
 * Trust hierarchy — how reliable a record is.
 *   axid_verified    AXID-stamped + registry-confirmed (highest)
 *   verified         gallery-uploaded with full provenance
 *   gallery_provided gallery-uploaded, partial metadata
 *   user_input       user-submitted, unverified
 *   ai_inferred      Claude-inferred from image/text only (lowest)
 */
export type TrustLevel =
  | "axid_verified"
  | "verified"
  | "gallery_provided"
  | "user_input"
  | "ai_inferred";

/** Append-only lifecycle. Records are not deleted, only archived. */
export type ArtworkStatus = "draft" | "live" | "archived";

export interface Artwork {
  id:                  ArtworkId;
  /**
   * Artwork eXchange ID — globally unique registry id. Highest-trust
   * identifier; QR / NFC / explicit AXID lookups all key on this.
   */
  axid?:               string;
  galleryId:           GalleryId;
  artistId:            ArtistId;

  /* Display */
  artistName?:         string;     // denormalized for fast read
  artistNameKo?:       string;
  title:               string;
  titleKo?:            string;
  /** Alternate spellings, romanizations, abbreviations, prior titles. */
  aliases?:            string[];

  year?:               string;
  period?:             string;     // "Late period", "Dansaekhwa era"
  medium?:             string;
  dimensions?:         string;     // "200 × 150 cm"

  /* Imagery */
  imageUrl?:           string;     // legacy field — kept for back-compat
  primaryImageUrl?:    string;
  perceptualImageHash?: string;    // pHash for image-based matching
  visualEmbeddingId?:  string;     // vector store id for semantic match

  /* Editorial */
  description?:        string;
  artenaInsight?:      string;
  shortSummary?:       string;

  /* Trust + lifecycle */
  trustLevel?:         TrustLevel;
  status?:             ArtworkStatus;

  /* Commerce */
  priceVisibility:     PriceVisibility;
  availabilityStatus:  AvailabilityStatus;
  publicShareSlug?:    string;
  qrCodeUrl?:          string;

  createdAt?:          string;
  updatedAt?:          string;
}

/* ── Matching ──────────────────────────────────────────────────── */

export type MatchedBy = "axid" | "nfc" | "qr" | "label" | "image" | "text";

export interface MatchedArtwork {
  artworkId:  ArtworkId;
  galleryId:  GalleryId;
  /** 0 – 1. AXID/NFC/QR return 1.0 when the registry confirms. */
  confidence: number;
  matchedBy:  MatchedBy;
}

/**
 * What the matching service hands back.
 *   confident  — clear winner (≥ 0.85 score from any path)
 *   ambiguous  — 2-3 candidates in the 0.6-0.85 band → show selector
 *   no_match   — nothing crossed 0.6 → show NoMatch screen
 */
export type MatchOutcome =
  | { kind: "confident"; match: MatchedArtwork }
  | { kind: "ambiguous"; candidates: MatchedArtwork[] }
  | { kind: "no_match" };

/* ── Report (the analysis output that gets shared) ─────────────── */

export type SourceType = "axid" | "nfc" | "qr" | "image" | "label" | "text";

/** Three-state for any price/range field. Never display $0K-$0K. */
export type EstimatedRangeStatus = "available" | "insufficient_data" | "unavailable";

export interface Report {
  id:                ReportId;
  matchedArtworkId?: ArtworkId;
  artworkAxid?:      string;       // mirrored from Artwork.axid
  galleryId?:        GalleryId;

  /* Display — frozen at share time */
  artist:            string;
  artistNameKo?:     string;
  title:             string;
  titleKo?:          string;
  year?:             string;
  medium?:           string;
  dimensions?:       string;
  representativeImageUrl?: string; // canonical image for OG + viewer
  imageUrl?:         string;       // legacy / inline preview

  /* Editorial — judgment-style. UI caps at 3 lines. */
  artenaInsight?:    string;
  analysisSummary:   string;
  /** Full structured analysis (varies by category). */
  analysisFull:      Record<string, unknown>;

  /* Market snapshot — frozen at share time */
  marketSnapshotJson?:   Record<string, unknown>;
  marketPosition?:       "Emerging" | "Established" | "Blue-chip";
  marketConfidence?:     number;   // 0-100
  estimatedRangeStatus?: EstimatedRangeStatus;
  estimatedLow?:         number;   // omitted unless status === "available"
  estimatedHigh?:        number;
  currency?:             string;   // "USD" / "KRW"
  dataDepth?:            "thin" | "moderate" | "deep";
  comparableMatches?:    number;
  marketStability?:      "low" | "moderate" | "high";

  /* Source + lifecycle */
  sourceType:   SourceType;
  trustLevel?:  TrustLevel;
  isShareable?: boolean;        // default true
  createdAt:    string;         // ISO timestamp
}

/* ── User interactions (write-heavy, consumed by analytics) ────── */

export type InteractionType =
  | "viewed"
  | "liked"
  | "saved"
  | "added_to_collection"
  | "asked_ai"
  | "shared"
  | "price_question";

export interface UserArtworkInteraction {
  id:              string;
  userId:          UserId;
  artworkId?:      ArtworkId;
  reportId?:       ReportId;
  galleryId?:      GalleryId;
  interactionType: InteractionType;
  /** Free-form metadata: question text, share channel, source surface, etc. */
  meta?:           Record<string, string | number | boolean>;
  createdAt:       string;
}

/* ── Aggregate analytics per artwork (read-side) ───────────────── */

export interface ArtworkAnalytics {
  artworkId:           ArtworkId;
  galleryId:           GalleryId;
  views:               number;
  likes:               number;
  saves:               number;
  shares:              number;
  collectionAdds:      number;
  aiQuestions:         number;
  priceQuestions:      number;
  inquiryClicks:       number;
  /** 0 – 100 weighted composite. */
  leadScore:           number;
  /** Most-recent interaction timestamp (ISO). */
  lastInteractionAt?:  string;
}

/* ── Lead Signal (computed, no UI yet) ─────────────────────────── */

export type LeadSignalType =
  | "saved"
  | "collection"
  | "asked_price"
  | "repeated_view";

export type LeadStrength = "low" | "medium" | "high";

export interface LeadSignal {
  id:         string;
  userId:     UserId;
  artworkId?: ArtworkId;
  galleryId?: GalleryId;
  signalType: LeadSignalType;
  strength:   LeadStrength;
  /** Number of underlying interactions that produced this signal. */
  weight:     number;
  createdAt:  string;
}
