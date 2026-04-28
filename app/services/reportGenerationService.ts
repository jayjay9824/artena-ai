/**
 * STEP 2 — Background report generation + 24h cache.
 *
 * Drives the async pipeline behind POST /api/reports/generate:
 *   1. The route persists a stub Report with status:"processing".
 *   2. runBackgroundGeneration is fired-and-forgotten — it runs the
 *      Claude analyze call, then patches the store with the final
 *      payload + status:"ready" + cachedUntil.
 *   3. Clients poll GET /api/reports/{id} and pick up the new state.
 *
 * Cache rule (spec): if a Report already exists for the same artworkId
 * and now < cachedUntil → return cached. Stale (now >= cachedUntil) →
 * return cached anyway (so Quick View can paint instantly) and refresh
 * in the background.
 */

import type { Report, ReportId } from "../lib/types";
import { getReportStore } from "./reportStore";
import {
  analyzeFromImage, analyzeFromText, parseImageDataUri,
} from "./analyzeService";

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** Cache hit iff cachedUntil exists AND is still in the future. */
export function isCacheValid(report: Report): boolean {
  if (!report.cachedUntil) return false;
  return new Date(report.cachedUntil).getTime() > Date.now();
}

export interface GenerateInput {
  /** data:image/jpeg;base64,… (other image MIME types accepted). */
  imageURI?:      string;
  extractedText?: string;
  userLanguage?:  string;   // reserved — analyzeService prompts are KO-only for now
}

/**
 * Run the analyze pipeline for `input` and patch the report. Errors
 * are captured into status:"error" + errorMessage so polling clients
 * always converge on a terminal state.
 *
 * Fire-and-forget: callers should NOT `await` this (the response
 * already shipped). On Vercel, work runs on the warm instance until
 * the function context recycles — production should switch to
 * `next/server`'s `after()` or an external queue for guaranteed
 * delivery.
 */
export async function runBackgroundGeneration(
  reportId: ReportId,
  input: GenerateInput,
): Promise<void> {
  const store = getReportStore();
  try {
    let analysis: Record<string, unknown> | null = null;

    if (input.extractedText && input.extractedText.trim()) {
      const r = await analyzeFromText(input.extractedText);
      if (r.kind === "rejected") {
        await store.patch(reportId, { status: "error", errorMessage: r.reason });
        return;
      }
      analysis = r.data;
    } else if (input.imageURI) {
      const { base64, mediaType } = parseImageDataUri(input.imageURI);
      const r = await analyzeFromImage(base64, mediaType);
      if (r.kind === "rejected") {
        await store.patch(reportId, { status: "error", errorMessage: r.reason });
        return;
      }
      analysis = r.data;
    } else {
      await store.patch(reportId, {
        status:       "error",
        errorMessage: "imageURI or extractedText is required",
      });
      return;
    }

    // Promote stub → ready. Mirror the surface fields callers display
    // before drilling into analysisFull, so the polling viewer can
    // render a useful card even before it parses the deep payload.
    const a = analysis as Record<string, unknown>;
    await store.patch(reportId, {
      status:           "ready",
      isShareable:      true,
      cachedUntil:      new Date(Date.now() + CACHE_TTL_MS).toISOString(),
      analysisFull:     analysis ?? {},
      analysisSummary:  typeof a.description === "string" ? a.description : "",
      artist:           typeof a.artist      === "string" ? a.artist      : "Unknown Artist",
      title:            typeof a.title       === "string" ? a.title       : "Untitled",
      year:             typeof a.year        === "string" ? a.year        : undefined,
      errorMessage:     undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "background generation failed";
    await store.patch(reportId, { status: "error", errorMessage: msg });
  }
}
