/**
 * POST /api/reports — save a shareable report, returns { id }.
 *
 * Accepts the wider snapshot shape from app/lib/types.ts so the
 * receiving viewer (and crawlers / OG previewers) can render the
 * frozen result without recomputing anything.
 */
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getReportStore } from "../../services/reportStore";
import { recordAudit } from "../../services/auditService";
import type {
  Report,
  SourceType,
  EstimatedRangeStatus,
  TrustLevel,
} from "../../lib/types";

export const runtime = "nodejs";

interface CreateReportBody {
  /* Identity — spec STEP 4 names. matchedArtworkId / artworkAxid
   * are accepted as back-compat aliases for any in-flight callers. */
  artworkId?:        string;
  axid?:             string;
  matchedArtworkId?: string;
  artworkAxid?:      string;
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
  analysisFull?:     Record<string, unknown>;

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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateReportBody;

    if (!body.analysisFull) {
      return NextResponse.json({ success: false, error: "analysisFull is required" }, { status: 400 });
    }

    const id: string = nanoid(10);

    const report: Report = {
      id,

      /* Identity — accept either the spec name or the legacy alias */
      artworkId: body.artworkId ?? body.matchedArtworkId,
      axid:      body.axid      ?? body.artworkAxid,
      galleryId:        body.galleryId,

      /* Display */
      artist:                 body.artist        ?? "Unknown Artist",
      artistNameKo:           body.artistNameKo,
      title:                  body.title         ?? "Untitled",
      titleKo:                body.titleKo,
      year:                   body.year,
      medium:                 body.medium,
      dimensions:             body.dimensions,
      representativeImageUrl: body.representativeImageUrl ?? body.imageUrl,
      imageUrl:               body.imageUrl,

      /* Editorial */
      artenaInsight:   body.artenaInsight,
      analysisSummary: body.analysisSummary ?? "",
      analysisFull:    body.analysisFull,

      /* Market snapshot */
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

      /* Lifecycle */
      sourceType:  body.sourceType  ?? "image",
      trustLevel:  body.trustLevel,
      isShareable: body.isShareable ?? true,
      createdAt:   new Date().toISOString(),
    };

    await getReportStore().put(report);

    // Audit — append-only, hash-chained. Never blocks the response.
    void recordAudit({
      entityType: "report",
      entityId:   id,
      action:     "report_created",
      actorId:    "system",
      newValue: {
        artist:           report.artist,
        title:            report.title,
        sourceType:       report.sourceType,
        trustLevel:       report.trustLevel,
        artworkId:        report.artworkId,
        galleryId:        report.galleryId,
      },
    });

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
