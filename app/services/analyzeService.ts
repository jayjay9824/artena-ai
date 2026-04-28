/**
 * Claude analysis service — single source of truth for the "full"
 * artwork / architecture / artifact analysis prompts.
 *
 * Both /api/analyze (sync user-facing endpoint) and
 * reportGenerationService (STEP 2 background pipeline) call into here
 * so prompt + schema changes only need to land once.
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type AnalyzeResult =
  | { kind: "ok";       data: Record<string, unknown> }
  | { kind: "rejected"; reason: string };

/* ── Schemas ───────────────────────────────────────────────────── */

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

const CATEGORY_RULES = `[카테고리별 필드 매핑 규칙]

■ painting / sculpture / installation
- artist: 작가명 (미상이면 "미상")  |  style: 미술 양식 (예: 인상주의, 미니멀리즘)
- works: 같은 작가 대표작 3개 이상  |  auctions: 경매 기록 3건 이상
- collections: 미술관·기관 소장 정보  |  description: 조형적 특성, 감정·상징성, 미술사적 맥락

■ architecture
- artist: 건축가명 (알 수 없으면 "설계자 미상")
- title: 건물명 + 위치 (예: "사그라다 파밀리아, 바르셀로나")
- style: 건축 양식 (예: 고딕, 아르누보, 브루탈리즘, 한국 전통 목조건축)
- year: 착공~준공 연도 또는 시대 (예: "1882–현재")
- description: 건축 양식 특징 / 구조·재료·공간 구성 / 역사·문화적 맥락 / 건축사적 의의
- marketNote: 유네스코 등재 여부, 국가문화재 지정, 역사·관광적 가치
- works: 같은 건축가의 다른 대표 건축물 3개 이상
- auctions: [] (건축물은 경매 불가 — 반드시 빈 배열)
- collections: 유산 등록 정보 (inst=등록기관, city=위치, period=등재연도, work=등록명)

■ artifact / cultural_site
- artist: 제작자·시대·문화권 (예: "고려 왕실 도요, 12세기")
- style: 시대 양식 또는 공예 기법 (예: 고려청자 상감기법)
- auctions: 실제 기록 있으면 포함, 없으면 []
- collections: 소장 박물관·기관 정보`;

const IMAGE_ACCURACY_NOTE = `[이미지 식별 원칙]
- 이미지만으로 확실히 특정할 수 없는 건물·유물은 title을 "미확인 [양식] 건축물, [추정 지역]"으로 표기
- 불확실한 건물명·건축가를 억지로 추측하지 말 것
- 이미지에서 직접 관찰 가능한 특징(파사드, 재료, 구조 요소)만을 근거로 기술할 것`;

const IMAGE_VALID  = `분석 가능: 회화·드로잉·판화·사진예술·설치미술 / 조각·기념비·공공미술 / 역사적·예술적 건축물·세계유산 / 도자기·고미술·유물·국보문화재 / 고궁·사원·유네스코 세계유산`;
const IMAGE_REJECT = `분석 불가: 일반 스냅샷(여행·셀카·음식·제품) / 평범한 건물(아파트·상가·사무용) / 스크린샷·문서·UI`;

const IMAGE_PROMPT = `당신은 미술·건축·문화유산 전문가입니다. 업로드된 이미지를 분석합니다.

[1단계] 분석 대상 판단
${IMAGE_VALID}
${IMAGE_REJECT}
분석 불가이면 아래 JSON만 응답 (다른 텍스트 없이):
${REJECTION_SCHEMA}

[2단계] 카테고리 분류 및 분석
${CATEGORY_RULES}

${IMAGE_ACCURACY_NOTE}

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
${RESPONSE_SCHEMA}`;

const TEXT_PROMPT = (query: string) =>
  `당신은 미술·건축·문화유산 전문가이자 시장 분석가입니다.\n` +
  `사용자 검색어: "${query}"\n\n` +
  `이 검색어가 미술 작가, 미술 작품, 건축물, 조각, 유물, 문화재, 세계유산 중 하나와 관련이 있으면 분석하세요.\n` +
  `날씨·음식·쇼핑·뉴스·스포츠 등 예술·문화와 전혀 무관한 내용이면 아래 JSON만 응답하세요:\n` +
  `${REJECTION_SCHEMA}\n\n` +
  `분석 가능하다면 카테고리를 분류하고 아래 규칙에 따라 분석하세요:\n` +
  `${CATEGORY_RULES}\n\n` +
  `잘 알려진 작가·작품·건축물이면 실제 공개 데이터를 사용하고, 그 외는 전문가적으로 추정하세요. 각 배열 최소 3항목.\n\n` +
  `아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):\n` +
  RESPONSE_SCHEMA;

/* ── Implementation ────────────────────────────────────────────── */

function parseClaudeJson(raw: string): Record<string, unknown> {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("JSON 파싱 실패");
  return JSON.parse(m[0]);
}

export async function analyzeFromText(query: string): Promise<AnalyzeResult> {
  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 3000,
    messages: [{ role: "user", content: TEXT_PROMPT(query) }],
  });

  const text = message.content.find(b => b.type === "text");
  if (!text || text.type !== "text") throw new Error("응답 없음");
  const parsed = parseClaudeJson(text.text);

  if (parsed.isArtwork === false) {
    return { kind: "rejected", reason: (parsed.rejectionReason as string) || "미술 작품 또는 작가 정보가 아닙니다." };
  }
  return { kind: "ok", data: parsed };
}

export async function analyzeFromImage(
  base64: string,
  mediaType: ImageMediaType,
): Promise<AnalyzeResult> {
  const message = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text",  text: IMAGE_PROMPT },
      ],
    }],
  });

  const text = message.content.find(b => b.type === "text");
  if (!text || text.type !== "text") throw new Error("응답 없음");
  const parsed = parseClaudeJson(text.text);

  if (parsed.isArtwork === false) {
    return { kind: "rejected", reason: (parsed.rejectionReason as string) || "미술 작품 이미지가 아닙니다." };
  }
  return { kind: "ok", data: parsed };
}

/* ── data: URI helper used by the background pipeline ──────────── */

export function parseImageDataUri(uri: string): { base64: string; mediaType: ImageMediaType } {
  const m = uri.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (!m) throw new Error("invalid imageURI — expected data:image/...;base64,...");
  return { mediaType: m[1] as ImageMediaType, base64: m[2] };
}
