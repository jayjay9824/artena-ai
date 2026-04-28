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
