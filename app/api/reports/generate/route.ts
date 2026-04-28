/**
 * POST /api/reports/generate — STEP 2 background report orchestrator.
 *
 * Body (any of):
 *   • Identity:           artworkId / axid / galleryId
 *   • Source inputs:      imageURI / extractedText / userLanguage  (drive bg gen)
 *   • Pre-computed:       analysisFull + display + market snapshot fields
 *
 * Response:
 *   { success, reportId, status: "processing" | "ready" | "error",
 *     cached?: bool, stale?: bool }
 *
 * Logic:
 *   1) artworkId + cache hit (fresh)       → return existing reportId, ready, cached
 *   2) artworkId + cache hit (stale)       → return existing reportId; if analysisFull
 *                                            present, patch into cache; else fire bg refresh
 *   3) cache miss + analysisFull           → persist immediately as "ready" + 24h cache
 *   4) cache miss, no analysisFull         → stub "processing" + bg Claude generation
 *
 * Polling: GET /api/reports/{reportId} surfaces the updated status.
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getReportStore } from "../../../services/reportStore";
import {
  runBackgroundGeneration, isCacheValid, CACHE_TTL_MS,
  type GenerateInput,
} from "../../../services/reportGenerationService";
import type {
  Report, ReportStatus, EstimatedRangeStatus, SourceType, TrustLevel,
} from "../../../lib/types";

export const runtime = "nodejs";

interface GenerateBody extends GenerateInput {
  /* Identity */
  artworkId?:        string;
  axid?:             string;
  galleryId?:        string;

  /* Pre-computed analysis (skips Claude when present) */
  analysisFull?:     Record<string, unknown>;
  analysisSummary?:  string;
  artenaInsight?:    string;

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
  sourceType?:  SourceType;
  trustLevel?:  TrustLevel;
  isShareable?: boolean;
}

/**
 * Build a Report record from request body. `status` and `cachedUntil`
 * are passed in so the caller can decide whether the record is a stub
 * ("processing") or a fully-formed snapshot ("ready").
 */
function buildReport(id: string, body: GenerateBody, status: ReportStatus, cachedUntil?: string): Report {
  return {
    id,
    artworkId: body.artworkId,
    axid:      body.axid,
    galleryId: body.galleryId,

    artist:                 body.artist                 ?? "Unknown Artist",
    artistNameKo:           body.artistNameKo,
    title:                  body.title                  ?? "Untitled",
    titleKo:                body.titleKo,
    year:                   body.year,
    medium:                 body.medium,
    dimensions:             body.dimensions,
    representativeImageUrl: body.representativeImageUrl ?? body.imageUrl,
    imageUrl:               body.imageUrl,

    artenaInsight:    body.artenaInsight,
    analysisSummary:  body.analysisSummary ?? "",
    analysisFull:     body.analysisFull    ?? {},

    marketSnapshotJson:   body.marketSnapshotJson,
    marketPosition:       body.marketPosition,
    marketConfidence:     body.marketConfidence,
    estimatedRangeStatus: body.estimatedRangeStatus,
    estimatedLow:         body.estimatedLow,
    estimatedHigh:        body.estimatedHigh,
    currency:             body.currency,
    dataDepth:            body.dataDepth,
    comparableMatches:    body.comparableMatches,
    marketStability:      body.marketStability,

    sourceType:  body.sourceType ?? (body.imageURI ? "image" : "text"),
    trustLevel:  body.trustLevel,
    isShareable: body.isShareable ?? (status === "ready"),
    createdAt:   new Date().toISOString(),

    status,
    cachedUntil,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateBody;

    if (!body.artworkId && !body.imageURI && !body.extractedText && !body.analysisFull) {
      return NextResponse.json(
        { success: false, error: "artworkId, imageURI, extractedText, or analysisFull required" },
        { status: 400 },
      );
    }

    // ── Cache lookup ─────────────────────────────────────────────
    if (body.artworkId) {
      const existing = await getReportStore().findByArtworkId(body.artworkId);
      if (existing) {
        if (isCacheValid(existing)) {
          // Fresh hit — instant return, no bg work.
          return NextResponse.json({
            success:  true,
            reportId: existing.id,
            status:   existing.status ?? "ready",
            cached:   true,
          });
        }
        // Stale — return existing for instant Quick View, refresh either
        // synchronously (caller supplied fresh analysisFull) or via bg.
        if (body.analysisFull) {
          const cachedUntil = new Date(Date.now() + CACHE_TTL_MS).toISOString();
          await getReportStore().patch(existing.id, {
            status:           "ready",
            cachedUntil,
            analysisFull:     body.analysisFull,
            analysisSummary:  body.analysisSummary ?? existing.analysisSummary,
            artenaInsight:    body.artenaInsight   ?? existing.artenaInsight,
            artist:           body.artist          ?? existing.artist,
            title:            body.title           ?? existing.title,
            year:             body.year            ?? existing.year,
            errorMessage:     undefined,
          });
        } else {
          runBackgroundGeneration(existing.id, body);
        }
        return NextResponse.json({
          success:  true,
          reportId: existing.id,
          status:   existing.status ?? "ready",
          cached:   true,
          stale:    true,
        });
      }
    }

    // ── Cache miss ───────────────────────────────────────────────
    const id = nanoid(10);

    if (body.analysisFull) {
      // Pre-computed snapshot — persist directly as ready, 24h cache.
      const cachedUntil = new Date(Date.now() + CACHE_TTL_MS).toISOString();
      const report = buildReport(id, body, "ready", cachedUntil);
      await getReportStore().put(report);
      return NextResponse.json({
        success:  true,
        reportId: id,
        status:   "ready",
      });
    }

    // No pre-computed analysis — stub + background generation.
    const stub = buildReport(id, body, "processing");
    await getReportStore().put(stub);
    runBackgroundGeneration(id, body);
    return NextResponse.json({
      success:  true,
      reportId: id,
      status:   "processing",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
