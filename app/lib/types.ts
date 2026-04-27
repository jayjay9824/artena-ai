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

export interface Artwork {
  id:                 ArtworkId;
  galleryId:          GalleryId;
  artistId:           ArtistId;
  title:              string;
  year?:              string;
  medium?:            string;
  imageUrl?:          string;
  priceVisibility:    PriceVisibility;
  availabilityStatus: AvailabilityStatus;
  /** Human-friendly slug used in /report/<slug> share URLs. */
  publicShareSlug?:   string;
  qrCodeUrl?:         string;
}

/* ── Matching ──────────────────────────────────────────────────── */

export type MatchedBy = "qr" | "label" | "image" | "text";

export interface MatchedArtwork {
  artworkId:  ArtworkId;
  galleryId:  GalleryId;
  /** 0 – 1 */
  confidence: number;
  matchedBy:  MatchedBy;
}

/* ── Report (the analysis output that gets shared) ─────────────── */

export type SourceType = "qr" | "image" | "label" | "text";

export interface Report {
  id:                ReportId;
  /** Set if the analysis matched a known Artwork in the Gallery DB. */
  matchedArtworkId?: ArtworkId;
  galleryId?:        GalleryId;

  // Display fields surfaced on the QuickReport screen.
  artist:            string;
  title:             string;
  imageUrl?:         string;
  analysisSummary:   string;
  /**
   * Full structured analysis — kept loose because the analysis API
   * shape currently varies (architecture vs. artwork vs. artifact).
   * Gallery Console only needs summary + matchedArtworkId, so this
   * field is intentionally untyped here.
   */
  analysisFull:      Record<string, unknown>;

  sourceType:        SourceType;
  createdAt:         string;     // ISO timestamp
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
