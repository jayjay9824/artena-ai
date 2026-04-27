/**
 * POST /api/reports — save a shareable report, returns { id }.
 *
 * Receives the analysis output + sourceType + image, mints a short
 * reportId with nanoid, and persists via the configured ReportStore.
 * Today the store is in-memory; swap to KV/Postgres later by changing
 * app/services/reportStore.ts.
 */
import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getReportStore } from "../../services/reportStore";
import type { Report, SourceType } from "../../lib/types";

export const runtime = "nodejs";

interface CreateReportBody {
  artist?:          string;
  title?:           string;
  imageUrl?:        string;
  analysisSummary?: string;
  analysisFull?:    Record<string, unknown>;
  sourceType?:      SourceType;
  matchedArtworkId?: string;
  galleryId?:        string;
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
      artist:          body.artist          ?? "Unknown Artist",
      title:           body.title           ?? "Untitled",
      imageUrl:        body.imageUrl,
      analysisSummary: body.analysisSummary ?? "",
      analysisFull:    body.analysisFull,
      sourceType:      body.sourceType      ?? "image",
      matchedArtworkId: body.matchedArtworkId,
      galleryId:        body.galleryId,
      createdAt:       new Date().toISOString(),
    };

    await getReportStore().put(report);

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
