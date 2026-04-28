/**
 * POST /api/translate-label — STEP 4.
 *
 * Body:    { text, target, source? }
 * 200:     { success: true, data: LabelTranslation }
 *
 * Spec STEP 4 rule "input != output" is enforced inside
 * translateLabel: when source equals target, translatedText comes
 * back empty so the UI hides the View Original toggle.
 */

import { NextRequest, NextResponse } from "next/server";
import { translateLabel } from "../../services/labelTranslationService";
import type { LangCode } from "../../analyze/types/labelTranslation";

export const runtime = "nodejs";

interface Body {
  text:    string;
  target:  LangCode;
  source?: LangCode;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    if (!body.text || !body.target) {
      return NextResponse.json(
        { success: false, error: "text and target are required" },
        { status: 400 },
      );
    }
    const result = await translateLabel(body.text, body.target, body.source);
    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "translation failed";
    console.error("Label translation error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
