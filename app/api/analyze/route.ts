/**
 * POST /api/analyze — synchronous full Claude analysis.
 *
 * Returns the fully-populated analysis object (Schema mirrors
 * analyzeService.RESPONSE_SCHEMA). For the staged Quick View flow,
 * use /api/analyze/quick (Haiku, ~2-3s) and /api/reports/generate
 * (background full report).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  analyzeFromText, analyzeFromImage,
  type ImageMediaType,
} from "../../services/analyzeService";

// Sharp-based image preprocessing requires the Node.js runtime.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const { query } = await req.json();
      if (!query) return NextResponse.json({ success: false, error: "검색어가 없습니다" }, { status: 400 });
      const r = await analyzeFromText(query);
      if (r.kind === "rejected") return NextResponse.json({ success: false, error: r.reason }, { status: 422 });
      return NextResponse.json({ success: true, data: r.data });
    }

    const fd = await req.formData();
    const file = fd.get("image") as File | null;
    if (!file) return NextResponse.json({ success: false, error: "이미지가 없습니다" }, { status: 400 });

    const base64    = Buffer.from(await file.arrayBuffer()).toString("base64");
    const mediaType = file.type as ImageMediaType;
    const r = await analyzeFromImage(base64, mediaType);
    if (r.kind === "rejected") return NextResponse.json({ success: false, error: r.reason }, { status: 422 });
    return NextResponse.json({ success: true, data: r.data });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("분석 오류:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
