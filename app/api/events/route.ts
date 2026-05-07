/**
 * POST /api/events — PART 5 batch event sink.
 *
 * Accepts `{ events: TrackedEvent[] }` and acknowledges. MVP just
 * console.debugs the count; production swaps the body for a real
 * analytics pipe (Segment / mixpanel / internal warehouse) by
 * editing this file alone — callers never change.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface Body {
  events?: unknown[];
}

export async function POST(req: NextRequest) {
  try {
    const body   = (await req.json()) as Body;
    const events = Array.isArray(body?.events) ? body.events : [];
    if (events.length > 0 && typeof console !== "undefined") {
      // eslint-disable-next-line no-console
      console.debug("[artena.events]", events.length, "events");
    }
    return NextResponse.json({ success: true, received: events.length });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
