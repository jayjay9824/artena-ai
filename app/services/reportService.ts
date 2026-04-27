/**
 * reportService — client-side helpers for saving and fetching shareable
 * reports. Wraps /api/reports so callers don't hardcode URLs.
 */

import type { Report, SourceType } from "../lib/types";

export interface CreateReportInput {
  artist?:          string;
  title?:           string;
  imageUrl?:        string;
  analysisSummary?: string;
  analysisFull:     Record<string, unknown>;
  sourceType:       SourceType;
  matchedArtworkId?: string;
  galleryId?:        string;
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
