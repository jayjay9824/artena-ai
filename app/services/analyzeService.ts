/**
 * Hybrid analysis service — Gemini-primary, Claude-fallback.
 *
 * The single source of truth for the "full" artwork / architecture /
 * artifact analysis prompts. Both /api/analyze (sync user-facing
 * endpoint, called by the camera scan UI) and reportGenerationService
 * (background pipeline) call into here, so the engine swap below
 * propagates without touching either caller.
 *
 * Flow:
 *   1. Preprocess image (resize 1568, EXIF rotate, mozjpeg).
 *   2. Try Gemini with the unified IMAGE_PROMPT.
 *      - When ENABLE_GEMINI_VERIFICATION + GEMINI_API_KEY are set,
 *        Gemini fires first.
 *      - When either is missing, the Gemini call short-circuits to
 *        null instantly (no network, no extra latency) — preserves
 *        current Claude-only behavior.
 *   3. On Gemini null (disabled / network / parse), fall back to
 *      Claude with adaptive thinking + streaming.
 *
 * Both engines see the same image bytes and the same prompt, so the
 * returned RESPONSE_SCHEMA shape is identical regardless of which
 * engine served the request — callers don't need to branch.
 */

import Anthropic from "@anthropic-ai/sdk";
import { preprocessImageBase64 } from "./imagePreprocess";
import { AI_CONFIG } from "./ai/config";

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
  "recognitionConfidence": 0-100,
  "identificationEvidence": "식별에 사용한 가장 강한 시각 단서 1-2문장 (서명·낙관·캡션·도판 일치 등)",
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

const IMAGE_ACCURACY_NOTE = `[이미지 식별 원칙 — 정확도 우선]
정답을 모르면 모른다고 답하는 것이 잘못 단정하는 것보다 항상 낫다.

[시각 단서 검사 우선순위]
다음 영역을 순서대로 정밀 검사한 뒤 식별 결정에 반영하세요:
1. 작품 모서리 / 캔버스 가장자리 — 작가 서명, 연도, 작업실 명문, 갤러리 라벨
2. 액자 하단·측면 또는 벽면 명판 — 박물관·갤러리 캡션 (작가명, 작품명, 연도, 매체, 소장처)
3. 작품 표면 — 양식 일관성, 붓터치, 매체 (유화·아크릴·수채·파스텔·판화 등), 색감
4. 도자기·조각 — 굽 명문, 도장(낙관), 명문판, 재질
5. 건축물 — 정초석, 입구 명판, 양식 디테일 (기둥·창호·벽재·지붕)
6. 서예·고미술 — 낙관·인장, 표구 형태, 종이/비단 질감

[추론 절차]
1. 단서 수집: 위 우선순위에서 관찰된 모든 시각 단서 나열
2. 후보 추정: 가장 강한 단서 2-3개로 후보 작품/작가/시대를 좁힌다
3. 교차 검증: 알려진 도판 기억과 양식·재료·연대·서명 일관성을 교차 확인
4. 단정 임계값: 단서 2개 이상 일치할 때만 단정. 1개만 일치하면 양식 추정에 그친다.

[자신도 평가 (recognitionConfidence, 0-100)]
   • 90+ : 서명·낙관·캡션 명판·도장·명백한 도판 일치 — 단정 가능
   • 75-89: 양식·재료·구도·색이 강하게 일치 + 작가 식별 가능 (단서 2개 이상)
   • 60-74: 양식·시대 추정 가능, 작품명 미상이거나 추정에 가까움
   • 40-59: 양식만 추정 가능, 작가/작품 미상
   • < 40 : 식별 거의 불가

[불확실 표기 (자신도 < 60일 때)]
   • title: "미확인 [양식] [대상]" (예: "미확인 추상화", "미확인 고려청자")
   • artist: "미상" 또는 "[추정 시대] 작가 미상"
   • description: 관찰 가능한 시각 정보만 기술, 추정은 "추정됨"으로 명시
   • identificationEvidence: 식별이 어려운 이유 명시 (예: "서명·캡션 모두 식별 불가, 양식만 추정")

[기재]
identificationEvidence 필드에 결정에 가장 큰 역할을 한 시각 단서를 한국어로 간결히 기재
(예: "우측 하단 서명 'Lee U.' 명확히 판독", "고려청자 상감기법 + 운학문, 굽 명문 미식별")`;

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
  `[정확도 자체평가]\n` +
  `검색어가 명확히 특정되는 작가·작품·건축물이면 recognitionConfidence를 80-95로,\n` +
  `오타·중의성·추정이 섞여 있으면 50-75로 표기하세요.\n` +
  `잘 모르는 대상에 대해 자료를 만들어내지 말고 빈 배열·"미상"으로 두세요.\n\n` +
  `잘 알려진 작가·작품·건축물이면 실제 공개 데이터를 사용하고, 그 외는 전문가적으로 추정하세요. 각 배열 최소 3항목.\n\n` +
  `아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):\n` +
  RESPONSE_SCHEMA;

/* ── Implementation ────────────────────────────────────────────── */

function parseClaudeJson(raw: string): Record<string, unknown> {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("JSON 파싱 실패");
  return JSON.parse(m[0]);
}

/* Adaptive thinking + streaming are required for accuracy on hard
   identifications (lesser-known works, heavy crops, low-light camera
   frames). Streaming keeps the connection alive on slow Opus 4.7
   passes; finalMessage() collects the assembled response. */
export async function analyzeFromText(query: string): Promise<AnalyzeResult> {
  const stream = client.messages.stream({
    model:      "claude-opus-4-7",
    max_tokens: 3500,
    thinking:   { type: "adaptive" },
    messages:   [{ role: "user", content: TEXT_PROMPT(query) }],
  });
  const message = await stream.finalMessage();

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
  // Resize to ≤ 1568 px (Claude vision sweet spot, also fine for
  // Gemini), bake EXIF orientation into pixels, re-encode through
  // mozjpeg. Both engines benefit from the same cleaned input.
  const cleaned = await preprocessImageBase64(base64, mediaType);

  // PRIMARY — Gemini. Returns null instantly if env isn't set
  // (Phase 1 short-circuit), so Claude-only deployments incur no
  // extra latency. Returns null on any error / parse failure too,
  // letting the Claude fallback below take over.
  const geminiResult = await tryGeminiImageAnalysis(cleaned.base64, cleaned.mediaType);
  if (geminiResult) return geminiResult;

  // FALLBACK — Claude with adaptive thinking + streaming. Same
  // prompt + schema as Gemini above, so the returned shape is
  // identical regardless of which engine ran.
  const stream = client.messages.stream({
    model:      "claude-opus-4-7",
    max_tokens: 3500,
    thinking:   { type: "adaptive" },
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: cleaned.mediaType, data: cleaned.base64 } },
        { type: "text",  text: IMAGE_PROMPT },
      ],
    }],
  });
  const message = await stream.finalMessage();

  const text = message.content.find(b => b.type === "text");
  if (!text || text.type !== "text") throw new Error("응답 없음");
  const parsed = parseClaudeJson(text.text);

  if (parsed.isArtwork === false) {
    return { kind: "rejected", reason: (parsed.rejectionReason as string) || "미술 작품 이미지가 아닙니다." };
  }
  return { kind: "ok", data: parsed };
}

/**
 * Gemini-first image path. Posts to the Generative Language REST
 * endpoint with the same IMAGE_PROMPT used by the Claude fallback,
 * so the returned JSON conforms to RESPONSE_SCHEMA either way.
 *
 * Returns null on:
 *   - gemini.enabled === false (env opt-out — Phase 1 default)
 *   - GEMINI_API_KEY missing
 *   - HTTP non-2xx
 *   - timeout (32 s — 2× the verifier timeout because this is the
 *     full schema with arrays of works / auctions / collections)
 *   - missing text part in the response
 *   - JSON parse failure
 *
 * Never throws — caller just checks for null and falls through to
 * Claude.
 */
async function tryGeminiImageAnalysis(
  base64:    string,
  mediaType: ImageMediaType,
): Promise<AnalyzeResult | null> {
  if (!AI_CONFIG.gemini.enabled || !AI_CONFIG.gemini.apiKey) return null;

  try {
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/` +
      `${encodeURIComponent(AI_CONFIG.gemini.model)}:generateContent` +
      `?key=${encodeURIComponent(AI_CONFIG.gemini.apiKey)}`;

    const requestBody = {
      contents: [{
        parts: [
          { inlineData: { mimeType: mediaType, data: base64 } },
          { text: IMAGE_PROMPT },
        ],
      }],
      generationConfig: {
        // Force JSON output so parseClaudeJson always has clean input.
        responseMimeType: "application/json",
        // Low temperature keeps the structured fields stable across
        // calls — same image should produce near-identical output.
        temperature:      0.15,
        // Generous ceiling for the full schema (works[], auctions[],
        // collections[], critics[], exhibitions[] arrays).
        maxOutputTokens:  4_000,
      },
    };

    const res = await fetch(endpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(requestBody),
      signal:  AbortSignal.timeout(AI_CONFIG.gemini.timeout * 2),
    });
    if (!res.ok) return null;

    const json = await res.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return null;

    const parsed = parseClaudeJson(text);
    if (parsed.isArtwork === false) {
      return {
        kind:   "rejected",
        reason: (parsed.rejectionReason as string) || "미술 작품 이미지가 아닙니다.",
      };
    }
    return { kind: "ok", data: parsed };
  } catch {
    // Any network / parse / timeout error → null → Claude fallback.
    return null;
  }
}

/* ── data: URI helper used by the background pipeline ──────────── */

export function parseImageDataUri(uri: string): { base64: string; mediaType: ImageMediaType } {
  const m = uri.match(/^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/);
  if (!m) throw new Error("invalid imageURI — expected data:image/...;base64,...");
  return { mediaType: m[1] as ImageMediaType, base64: m[2] };
}
