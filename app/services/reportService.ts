/**
 * reportService — client-side helpers for saving and fetching shareable
 * reports. Wraps /api/reports so callers don't hardcode URLs.
 */

import type {
  Report, SourceType, EstimatedRangeStatus, TrustLevel,
} from "../lib/types";

export interface CreateReportInput {
  /* Identity — spec STEP 4 names; the API also accepts the legacy
   * matchedArtworkId / artworkAxid aliases. */
  artworkId?:        string;
  axid?:             string;
  galleryId?:        string;

  /* Display */
  artist?:           string;
  artistNameKo?:     string;
  title?:            string;
  titleKo?:          string;
  year?:             string;
  medium?:           string;
  dimensions?:       string;
  representativeImageUrl?: string;
  imageUrl?:         string;

  /* Editorial */
  artenaInsight?:    string;
  analysisSummary?:  string;
  analysisFull:      Record<string, unknown>;

  /* Market snapshot */
  marketSnapshotJson?:   Record<string, unknown>;
  marketPosition?:       Report["marketPosition"];
  marketConfidence?:     number;
  estimatedRangeStatus?: EstimatedRangeStatus;
  estimatedLow?:         number;
  estimatedHigh?:        number;
  currency?:             string;
  dataDepth?:            Report["dataDepth"];
  comparableMatches?:    number;
  marketStability?:      Report["marketStability"];

  /* Lifecycle */
  sourceType:   SourceType;
  trustLevel?:  TrustLevel;
  isShareable?: boolean;
}

/** Save a report. Returns the new report id, or null on failure. */
export async function saveReport(input: CreateReportInput): Promise<string | null> {
  try {
    const res = await fetch("/api/reports", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(input),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success && typeof json.id === "string" ? json.id : null;
  } catch {
    return null;
  }
}

/** Fetch a report by id. Returns the report, or null if missing/error. */
export async function fetchReport(id: string): Promise<Report | null> {
  try {
    const res = await fetch(`/api/reports/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success && json.report ? (json.report as Report) : null;
  } catch {
    return null;
  }
}

/** Build the canonical share URL for a given report id. */
export function buildShareUrl(id: string): string {
  if (typeof window === "undefined") return `/report/${id}`;
  return `${window.location.origin}/report/${id}`;
}

/* ── STEP 2 — cache-aware generate path ────────────────────────── */

export interface GenerateReportInput extends CreateReportInput {
  /** Source URI for bg generation when analysisFull is absent. */
  imageURI?:      string;
  extractedText?: string;
  userLanguage?:  string;
}

export interface GenerateReportResult {
  reportId: string;
  status:   "processing" | "ready" | "error";
  cached:   boolean;
  stale:    boolean;
}

/**
 * Cache-aware report writer. Routes through /api/reports/generate
 * which handles 24h cache lookup by artworkId, stale refresh, and
 * stub-then-background generation when no pre-computed analysis is
 * supplied.
 *
 * Returns null on transport / parse failure; never throws.
 */
export async function generateReport(input: GenerateReportInput): Promise<GenerateReportResult | null> {
  try {
    const res = await fetch("/api/reports/generate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(input),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || typeof json.reportId !== "string") return null;
    return {
      reportId: json.reportId,
      status:   json.status ?? "processing",
      cached:   !!json.cached,
      stale:    !!json.stale,
    };
  } catch {
    return null;
  }
}
