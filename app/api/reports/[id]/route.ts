/**
 * GET /api/reports/[id] — fetch a saved shareable report.
 * Returns 404 with a stable error shape when the id is unknown so
 * the viewer route can show its "분석 결과를 찾을 수 없습니다" state.
 */
import { NextRequest, NextResponse } from "next/server";
import { getReportStore } from "../../../services/reportStore";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
  }

  const report = await getReportStore().get(id);
  if (!report) {
    return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, report });
}
