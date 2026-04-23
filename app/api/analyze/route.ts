import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Shared schema (all categories use this shape) ──────────────────
const RESPONSE_SCHEMA = `{
  "isArtwork": true,
  "category": "painting | sculpture | architecture | artifact | cultural_site",
  "title": "작품명/건물명/유물명",
  "artist": "작가명/건축가명/제작 주체",
  "year": "제작·착공·조성 연도 또는 시대",
  "style": "양식/사조 (미술 양식 또는 건축 양식)",
  "description": "전문가 수준의 설명 (3-4문장, 한국어)",
  "emotions": {
    "calm": 0-100,
    "heavy": 0-100,
    "warm": 0-100,
    "inward": 0-100,
    "movement": 0-100
  },
  "colorPalette": ["색상1", "색상2", "색상3"],
  "keywords": ["키워드1", "키워드2", "키워드3", "키워드4", "키워드5"],
  "marketNote": "문화적·시장적·유산적 가치 (1-2문장, 한국어)",
  "works": [
    { "title": "작품명/건물명", "year": "연도", "medium": "재료·기법·구조", "location": "소장처·위치" }
  ],
  "auctions": [
    { "date": "YYYY-MM", "work": "작품명", "house": "경매사", "result": "낙찰가", "estimate": "추정가", "note": "" }
  ],
  "collections": [
    { "inst": "기관명/유산등록기관", "city": "도시", "period": "소장·등록 기간", "work": "소장작·등록명" }
  ],
  "critics": [
    { "critic": "평론가/학자명", "source": "출처", "year": "연도", "quote": "인용문" }
  ],
  "exhibitions": [
    { "title": "전시명", "venue": "장소", "city": "도시", "year": "연도", "type": "solo | group | fair | retrospective" }
  ]
}`;

const REJECTION_SCHEMA = `{"isArtwork": false, "rejectionReason": "거부 이유를 한국어로 한 문장"}`;

// ── Category-specific field mapping rules ──────────────────────────
const CATEGORY_RULES = `
[카테고리별 필드 매핑 규칙 — 반드시 준수]

■ painting / sculpture / installation
- artist: 작가명 (미상이면 "미상")
- title: 작품명
- style: 미술 양식 (예: 인상주의, 미니멀리즘, 추상표현주의)
- works: 같은 작가의 다른 대표 작품 3개 이상
- auctions: 실제 또는 유사 작품 경매 기록 3건 이상
- collections: 미술관·기관 소장 정보
- exhibitions: 작가 개인전·그룹전
- description: 작품의 조형적 특성, 감정·상징성, 미술사적 맥락

■ architecture
- artist: 건축가명 (예: 르 코르뷔지에, 자하 하디드 / 알 수 없으면 "설계자 미상")
- title: 건물명 + 위치 (예: "사그라다 파밀리아, 바르셀로나")
- style: 건축 양식 (예: 고딕, 아르누보, 국제주의 양식, 브루탈리즘, 한국 전통 목조건축)
- year: 착공~준공 연도 또는 시대 (예: "1882–현재", "15세기 초")
- description: ① 건축 양식의 구체적 특징 ② 구조·재료·공간 구성 ③ 역사적·문화적 맥락 ④ 건축사적 의의 (3-4문장, 건축 전문 어법으로)
- keywords: 건축 양식, 구조 특징, 주요 재료, 시대, 지역 특성
- marketNote: 유네스코 등재 여부, 국가문화재 지정, 역사적·관광적 가치
- works: 같은 건축가의 다른 대표 건축물 3개 이상 (title=건물명, location=도시/국가)
- auctions: [] ← 건축물은 경매 대상 아님, 반드시 빈 배열
- collections: 유산 등록 정보 (inst=등록 기관, city=위치, period=등재 연도, work=등록 명칭)
- critics: 건축 평론가·학자의 해당 건물 평가 또는 건축사적 의의 서술
- exhibitions: 해당 건축가 관련 주요 전시·회고전

■ artifact / cultural_site
- artist: 제작자·시대·문화권 (예: "고려 왕실 도요, 12세기", "조선 전기 / 작자 미상")
- title: 유물명 또는 유적지명 + 소재지
- style: 시대 양식 또는 공예 기법 (예: 고려청자 상감기법, 신라 금관 세공)
- works: 동일 시대·문화권 유사 유물 또는 관련 유물
- auctions: 실제 경매 기록 (없으면 빈 배열 [])
- collections: 소장 박물관·기관 정보

[이미지 식별 정확도 원칙]
- 건물·유물을 이미지만으로 확실하게 특정할 수 없을 때는 title을 "미확인 [건축 양식] 건축물, [추정 지역]" 형태로 표기
- 확실하지 않은 건물명·건축가·작가를 억지로 추측하지 말 것
- 이미지에서 직접 관찰 가능한 특징(파사드, 재료, 구조 요소, 장식 문양 등)을 근거로 분석할 것
- 잘 알려진 랜드마크는 실제 공개 데이터를 사용하고, 그 외는 이미지 관찰 기반으로만 기술할 것`;

const VALID_SCOPE = `분석 가능 범위: 회화·드로잉·판화·사진예술·설치미술 / 조각·공공미술·기념비 / 역사적·예술적 건축물·세계문화유산 건축 / 도자기·고미술품·유물·국보문화재 / 고궁·사원·유네스코 세계유산`;
const REJECT_SCOPE = `분석 불가 범위: 일반 스냅샷(여행·셀카·음식·제품) / 평범한 건물 외관(아파트·상가·사무용 건물) / 스크린샷·문서·UI 이미지`;

// ── Prompts ────────────────────────────────────────────────────────
const IMAGE_PROMPT = `당신은 미술·건축·문화유산 전문가입니다. 업로드된 이미지를 분석합니다.

[1단계] 분석 가능 여부 판단
${VALID_SCOPE}
${REJECT_SCOPE}

분석 불가이면 반드시 아래 JSON만 응답 (다른 텍스트 없이):
${REJECTION_SCHEMA}

[2단계] 카테고리 분류 및 분석
분석 가능하다면 아래 규칙에 따라 카테고리를 분류하고 해당 규칙으로 분석하세요.
${CATEGORY_RULES}

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
${RESPONSE_SCHEMA}`;

const TEXT_PROMPT = (query: string) =>
  `당신은 미술·건축·문화유산 전문가입니다.\n사용자 입력: "${query}"\n\n` +
  `[1단계] 분석 가능 여부 판단\n${VALID_SCOPE}\n${REJECT_SCOPE}\n\n` +
  `분석 불가이면 아래 JSON만 응답:\n${REJECTION_SCHEMA}\n\n` +
  `[2단계] 카테고리 분류 및 분석\n분석 가능하면 카테고리를 분류하고 아래 규칙으로 분석하세요.\n` +
  `${CATEGORY_RULES}\n\n` +
  `아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):\n` +
  RESPONSE_SCHEMA;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 텍스트 검색
    if (contentType.includes("application/json")) {
      const { query } = await req.json();
      if (!query) return NextResponse.json({ success: false, error: "검색어가 없습니다" }, { status: 400 });

      const message = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 3000,
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
      max_tokens: 3000,
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
