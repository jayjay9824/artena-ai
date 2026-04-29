import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { preprocessImageBase64 } from "../../../services/imagePreprocess";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * STEP 1 — Quick View endpoint.
 *
 * Fast Haiku-backed mini-analysis that returns the seven fields the
 * Quick View card renders (title / artist / year / one-line / 3
 * keywords / exhibition venue). The full /api/analyze Opus call still
 * runs in parallel for the staged Market / Price / Comparables panels.
 *
 * Target: ~2–3s end-to-end so the Quick View paints before the user
 * has time to perceive a spinner.
 */

const QUICK_SCHEMA = `{
  "isArtwork": true,
  "title":  "작품명/건물명/유물명",
  "artist": "작가명/건축가명/제작 주체",
  "year":   "제작 연도 또는 시대",
  "oneLineInterpretation": "한 문장 해석 (한국어, 30자 내외)",
  "keywords": ["키워드1", "키워드2", "키워드3"],
  "exhibitionVenue": "주요 소장처 또는 전시 갤러리 (없으면 빈 문자열)",
  "recognitionConfidence": 0-100
}`;

const REJECTION_SCHEMA = `{"isArtwork": false, "rejectionReason": "거부 이유 한국어 한 문장"}`;

const ACCURACY_NOTE = `[정확도 우선]
- 서명·캡션·도판 일치 등 강한 단서가 없으면 절대 단정하지 말 것
- 자신도가 낮으면 title을 "미확인 [양식] [대상]", artist를 "미상"으로 표기

[시각 단서 우선순위] — 이 순서로 정밀 검사
1. 모서리·캔버스 가장자리: 서명·연도
2. 액자·벽 명판: 박물관·갤러리 캡션 (작가·작품·연도·매체)
3. 작품 표면: 양식·붓터치·매체·색감
4. 도자·조각: 굽 명문·낙관·재질
5. 건축: 정초석·명판·양식 디테일
단서 2개 이상 일치할 때만 단정.

[recognitionConfidence 가이드]
  90+ : 서명·캡션·명백한 도판 일치
  75-89: 양식·재료·구도가 강하게 일치 + 작가 식별 가능 (단서 2개 이상)
  60-74: 양식·시대 추정만 가능, 작품명 미상
  40-59: 양식 추정만 가능
  < 40 : 식별 불가`;

const IMAGE_PROMPT = `당신은 미술 큐레이터입니다. 이미지를 빠르게 식별합니다.

분석 불가(평범한 스냅샷·문서·UI 등)이면 아래 JSON만 응답:
${REJECTION_SCHEMA}

${ACCURACY_NOTE}

분석 가능하면 정확히 아래 JSON 형식으로만 응답 (부가 설명 없이):
${QUICK_SCHEMA}`;

const TEXT_PROMPT = (query: string) =>
  `당신은 미술 큐레이터입니다. 검색어: "${query}"\n\n` +
  `미술·건축·문화유산과 무관하면 아래 JSON만 응답: ${REJECTION_SCHEMA}\n\n` +
  `${ACCURACY_NOTE}\n\n` +
  `정확히 아래 JSON 형식으로만 응답 (부가 설명 없이):\n${QUICK_SCHEMA}`;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    let response;
    if (contentType.includes("application/json")) {
      const { query } = await req.json();
      if (!query) return NextResponse.json({ success: false, error: "검색어가 없습니다" }, { status: 400 });

      response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 600,
        messages: [{ role: "user", content: TEXT_PROMPT(query) }],
      });
    } else {
      const fd = await req.formData();
      const file = fd.get("image") as File | null;
      if (!file) return NextResponse.json({ success: false, error: "이미지가 없습니다" }, { status: 400 });

      const rawBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const rawMedia  = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

      // Same EXIF auto-orient + 1568px resize + mozjpeg pass as the
      // full Opus path. Sharper signatures / captions, smaller
      // upload, deterministic input.
      const cleaned = await preprocessImageBase64(rawBase64, rawMedia);

      response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: cleaned.mediaType, data: cleaned.base64 } },
            { type: "text",  text: IMAGE_PROMPT },
          ],
        }],
      });
    }

    const text = response.content.find(b => b.type === "text");
    if (!text || text.type !== "text") throw new Error("응답 없음");
    const m = text.text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("JSON 파싱 실패");
    const parsed = JSON.parse(m[0]);
    if (parsed.isArtwork === false) {
      return NextResponse.json({ success: false, error: parsed.rejectionReason || "미술 작품이 아닙니다." }, { status: 422 });
    }
    return NextResponse.json({ success: true, data: parsed });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("Quick analyze error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
