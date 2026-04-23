import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ARTWORK_SCHEMA = `{
  "isArtwork": true,
  "title": "추정 작품명 또는 '알 수 없음'",
  "artist": "추정 작가명 또는 '미상'",
  "year": "추정 제작 연도 또는 시대",
  "style": "미술 양식/사조",
  "description": "작품에 대한 전문적인 설명 (3-4문장, 한국어)",
  "emotions": {
    "calm": 0에서 100 사이 숫자,
    "heavy": 0에서 100 사이 숫자,
    "warm": 0에서 100 사이 숫자,
    "inward": 0에서 100 사이 숫자,
    "movement": 0에서 100 사이 숫자
  },
  "colorPalette": ["주요 색상1", "주요 색상2", "주요 색상3"],
  "keywords": ["핵심 키워드1", "핵심 키워드2", "핵심 키워드3"],
  "marketNote": "시장 가치나 컬렉터 관점에서의 간단한 설명 (1-2문장, 한국어)",
  "works": [
    { "title": "작품명", "year": "제작연도", "medium": "재료/기법", "location": "소장처" }
  ],
  "auctions": [
    { "date": "YYYY-MM", "work": "작품명", "house": "경매사", "result": "낙찰가", "estimate": "추정가 범위", "note": "특이사항(없으면 빈 문자열)" }
  ],
  "collections": [
    { "inst": "기관명", "city": "도시", "period": "소장 기간", "work": "소장 작품" }
  ],
  "critics": [
    { "critic": "평론가/매체명", "source": "출처", "year": "연도", "quote": "평론 내용 (영어 또는 한국어)" }
  ],
  "exhibitions": [
    { "title": "전시명", "venue": "장소", "city": "도시", "year": "연도", "type": "solo 또는 group 또는 fair" }
  ]
}`;

const REJECTION_SCHEMA = `{"isArtwork": false, "rejectionReason": "거부 이유를 한국어로 한 문장"}`;

const VALID_SCOPE = `분석 가능 범위:
- 미술 작품: 회화, 드로잉, 판화, 사진 예술, 설치 미술, 디지털 아트, 미디어 아트
- 조각·공공 미술: 조각상, 기념비, 공공 설치 작품, 대형 야외 작품
- 건축물: 역사적·예술적으로 의미 있는 건축, 기념비적 구조물, 세계문화유산 건축
- 유물·문화재: 도자기, 고미술품, 공예품, 유적 출토 유물, 국보·보물급 문화재
- 문화유산 공간: 고궁, 사원, 유네스코 세계유산 등 역사적 장소`;

const REJECT_SCOPE = `분석 불가 범위:
- 일반 스냅샷 사진 (여행 사진, 셀카, 음식, 제품 등)
- 미적·역사적 의미 없는 건물 외관 (아파트, 상가, 일반 사무용 건물 등)
- 스크린샷, 문서, 그래프, UI 캡처 등`;

// 이미지 분석용 프롬프트
const IMAGE_PROMPT = `당신은 미술·문화유산 전문가입니다. 업로드된 이미지를 분석합니다.

[1단계] 이미지가 분석 가능한 대상인지 먼저 판단하세요.

${VALID_SCOPE}

${REJECT_SCOPE}

분석 불가라고 판단되면 반드시 아래 형식으로만 응답하세요 (JSON 외 텍스트 없이):
${REJECTION_SCHEMA}

분석 가능하다고 판단되면 아래 형식으로만 응답하세요 (JSON 외 텍스트 없이):
잘 알려진 작가/작품/유물이면 실제 공개 데이터를 사용하고, 덜 알려진 경우 전문가적으로 추정하세요. 각 배열은 최소 3개 항목을 포함하세요.
${ARTWORK_SCHEMA}`;

// 텍스트 검색용 프롬프트
const TEXT_PROMPT = (query: string) =>
  `당신은 미술·건축·문화유산 전문가이자 시장 분석가입니다.\n` +
  `사용자 입력: "${query}"\n\n` +
  `[1단계] 입력된 내용이 분석 가능한 대상인지 판단하세요.\n\n` +
  `${VALID_SCOPE}\n\n` +
  `${REJECT_SCOPE}\n\n` +
  `분석 불가라고 판단되면 아래 형식으로만 응답하세요:\n` +
  `${REJECTION_SCHEMA}\n\n` +
  `분석 가능하다고 판단되면 해당 작품/건축/유물의 대표 정보를 기준으로 분석하고 아래 형식으로만 응답하세요:\n` +
  `잘 알려진 작가/작품/유물이면 실제 공개 데이터를 사용하고, 덜 알려진 경우 전문가적으로 추정하세요. 각 배열은 최소 3개 항목을 포함하세요.\n` +
  ARTWORK_SCHEMA;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 텍스트 검색
    if (contentType.includes("application/json")) {
      const { query } = await req.json();
      if (!query) return NextResponse.json({ success: false, error: "검색어가 없습니다" }, { status: 400 });

      const message = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: TEXT_PROMPT(query),
        }],
      });

      const text = message.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") throw new Error("응답 없음");
      const match = text.text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("JSON 파싱 실패");
      const parsed = JSON.parse(match[0]);
      if (parsed.isArtwork === false) {
        return NextResponse.json({ success: false, error: parsed.rejectionReason || "미술 작품 또는 작가 정보가 아닙니다." }, { status: 422 });
      }
      return NextResponse.json({ success: true, data: parsed });
    }

    // 이미지 업로드 / 카메라
    const formData = await req.formData();
    const file = formData.get("image") as File;
    if (!file) return NextResponse.json({ success: false, error: "이미지가 없습니다" }, { status: 400 });

    const base64Image = Buffer.from(await file.arrayBuffer()).toString("base64");
    const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
          { type: "text", text: IMAGE_PROMPT },
        ],
      }],
    });

    const text = message.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("응답 없음");
    const match = text.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON 파싱 실패");
    const parsed = JSON.parse(match[0]);
    if (parsed.isArtwork === false) {
      return NextResponse.json({ success: false, error: parsed.rejectionReason || "미술 작품 이미지가 아닙니다." }, { status: 422 });
    }
    return NextResponse.json({ success: true, data: parsed });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("분석 오류:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
