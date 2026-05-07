/**
 * AXVELA / Gallery Console — shared domain types.
 *
 * Single source of truth for the data shapes that flow between the
 * AXVELA user app and the (future) Gallery Console. The user app
 * writes interactions and reports against these types; Gallery
 * Console will later read from the same shapes.
 *
 * Keep this file backend-agnostic — no React, no fetch, no storage.
 */

/* ── Object category — drives Market Intelligence visibility ─── */

/**
 * What kind of object the analysis describes. The Quick Report
 * surface uses this to decide whether to render the Market
 * Intelligence section or the Cultural Heritage Intelligence
 * fallback. Computed at render time from the analysis (no schema
 * change to persisted reports).
 */
export type ObjectCategory =
  | "artwork"
  | "cultural_heritage"
  | "artifact"
  | "architecture"
  | "historic_site"
  | "museum_guide"
  | "design_object"
  | "collectible"
  | "unknown";

/**
 * Render-time dispatch derived from an analysis. Market Intelligence
 * is only allowed when all three flags align: artwork category +
 * market-relevant + verified market data on hand.
 */
export interface AnalysisResult {
  objectCategory:       ObjectCategory;
  isMarketRelevant:     boolean;
  marketDataAvailable:  boolean;
}

/**
 * STEP 2 — Recognition confidence and dispatch state.
 *
 *   confirmed   80+   normal report flow
 *   partial     60-79 subtle top toast; report may render
 *   uncertain   <60   premium bottom sheet first; market always hidden
 */
export type RecognitionStatus = "confirmed" | "partial" | "uncertain";

export interface RecognitionState {
  recognitionConfidence: number;       // 0..100
  recognitionStatus:     RecognitionStatus;
}

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
 *   axid_verified    AXID-stamped + registry-confirmed (highest, internal)
 *   verified         gallery-uploaded with full provenance
 *   gallery_provided gallery-uploaded, partial metadata
 *   user_input       user-submitted, unverified
 *   ai_inferred      Claude-inferred from image/text only (lowest)
 *
 * Spec V1 lists the four public tiers; axid_verified is kept as a
 * private super-tier for registry-confirmed records and never
 * downgrades existing data.
 */
export type TrustLevel =
  | "axid_verified"
  | "verified"
  | "gallery_provided"
  | "user_input"
  | "ai_inferred";

/**
 * Where the canonical Artwork record originally came from. Used by
 * the matching pipeline to weight one record against another when
 * multiple write paths describe the same work.
 */
export type ArtworkSource =
  | "gallery_upload"   // posted from Gallery Console
  | "axid_registry"    // pulled from the AXID registry
  | "user_scan"        // promoted from a user's analysis
  | "manual_entry"     // hand-entered (admin / fallback)
  | "ai_inferred";     // lowest — generated from image/text only

/** Append-only lifecycle. Records are not deleted, only archived. */
export type ArtworkStatus = "draft" | "live" | "archived";

/* ── Market signal enums (shared by Artwork + Report) ──────────── */

export type MarketPosition  = "Emerging" | "Established" | "Blue-chip";
export type DataDepth       = "thin" | "moderate" | "deep";
export type MarketStability = "low" | "moderate" | "high";

/**
 * Canonical Artwork record. Same artworkId → same result everywhere.
 *
 * Image / text / QR / NFC / Report inputs all resolve to a single
 * row in this table when they describe the same work. The matching
 * pipeline (matchingService) is the only writer of new records;
 * subsequent encounters with the same work *update* this record
 * rather than fork a duplicate.
 *
 * Field semantics align with the STEP 1 spec; persisted column names
 * for the eventual Postgres schema mirror the property names here.
 */
export interface Artwork {
  /** artworkId — primary key. */
  id:                  ArtworkId;

  /**
   * Artwork eXchange ID — globally unique registry id. Highest-trust
   * identifier; QR / NFC / explicit AXID lookups all key on this.
   */
  axid?:               string;

  galleryId:           GalleryId;
  artistId:            ArtistId;

  /* Display — denormalised for fast read */
  artistName?:         string;
  artistNameKo?:       string;
  title:               string;
  titleKo?:            string;
  /** Alternate spellings, romanizations, abbreviations, prior titles. */
  aliases?:            string[];

  year?:               string;
  period?:             string;
  medium?:             string;
  dimensions?:         string;

  /* Imagery */
  imageUrl?:           string;     // legacy field — back-compat
  primaryImageUrl?:    string;
  /** pHash hex string for image-based matching — spec name. */
  imageHash?:          string;
  /** Vector store id for semantic image matching. */
  visualEmbeddingId?:  string;

  /* Editorial */
  description?:        string;
  artenaInsight?:      string;
  shortSummary?:       string;

  /* Trust + lifecycle */
  source?:             ArtworkSource;
  trustLevel?:         TrustLevel;
  status?:             ArtworkStatus;

  /* Canonical market signal — same artwork → same numbers.
   * Reports take a snapshot of these at share time so they freeze
   * even if the canonical record is later refined. */
  marketPosition?:     MarketPosition;
  marketConfidence?:   number;       // 0 – 100
  dataDepth?:          DataDepth;
  comparableMatches?:  number;
  marketStability?:    MarketStability;

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

/**
 * Lifecycle of a Report record.
 *
 *   processing  — stub created, background generation in flight
 *   ready       — fully populated; safe to render
 *   error       — generation failed; errorMessage is human-readable
 *
 * Absence of `status` on legacy records is treated as `"ready"` by
 * callers (back-compat for reports created before STEP 2).
 */
export type ReportStatus = "processing" | "ready" | "error";

export interface Report {
  id:                ReportId;
  /** Canonical artwork id this report snapshots (renamed from
   *  matchedArtworkId for spec parity). */
  artworkId?:        ArtworkId;
  /** Spec name `axid` — mirrored from Artwork.axid at save time. */
  axid?:             string;
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

  /* Market snapshot — frozen at share time. Mirrors the Artwork
   * canonical fields so the viewer renders without recomputing. */
  marketSnapshotJson?:   Record<string, unknown>;
  marketPosition?:       MarketPosition;
  marketConfidence?:     number;   // 0-100
  estimatedRangeStatus?: EstimatedRangeStatus;
  estimatedLow?:         number;   // omitted unless status === "available"
  estimatedHigh?:        number;
  currency?:             string;   // "USD" / "KRW"
  dataDepth?:            DataDepth;
  comparableMatches?:    number;
  marketStability?:      MarketStability;

  /* Source + lifecycle */
  sourceType:   SourceType;
  trustLevel?:  TrustLevel;
  isShareable?: boolean;        // default true
  createdAt:    string;         // ISO timestamp

  /* Background generation + 24h cache (STEP 2) */
  status?:        ReportStatus;
  /** ISO; absence means no cache window — treat as expired. */
  cachedUntil?:   string;
  /** Populated when status === "error". */
  errorMessage?:  string;
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

/* ── Audit Trail (append-only, hash-chained) ───────────────────── */

/**
 * What got audited. Append new actions, never rename existing ones —
 * historical entries reference these strings forever.
 */
export type AuditAction =
  | "report_created"
  | "report_shared"
  | "axid_scanned"
  | "invoice_sent"
  | "payment_marked_paid"
  | "certificate_issued"
  | "artwork_updated";

/** What the entry is *about*. */
export type AuditEntityType = "report" | "artwork" | "gallery" | "invoice" | "certificate";

/**
 * Single audit entry. Append-only — production never deletes; lifecycle
 * changes go through artwork_updated / status fields. The hash field
 * chains entries together (each hash includes the previous hash) so
 * the log is tamper-evident; production can later anchor the latest
 * hash to a public chain.
 */
export interface AuditEntry {
  id:            string;       // nanoid(12)
  entityType:    AuditEntityType;
  entityId:      string;
  action:        AuditAction;
  actorId:       string;       // user / gallery / system id
  timestamp:     string;       // ISO
  /** Field-level diffs. Optional because not every action is a state mutation. */
  previousValue?: Record<string, unknown>;
  newValue?:      Record<string, unknown>;
  /** SHA-256 hex of prevHash + canonical JSON of this entry minus this field. */
  hash:          string;
  /** Hash of the entry directly before this one in the log; "" for genesis. */
  prevHash:      string;
}
