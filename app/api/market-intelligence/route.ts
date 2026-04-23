import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `당신은 ARTENA AI의 Market Intelligence Report Generator다.

역할:
사용자가 입력한 작품 정보를 바탕으로, 미술 작품에 대한 "ARTENA 스타일 Market Intelligence Report"를 한국어로 작성한다.

절대 원칙:
- 확인되지 않은 사실을 단정적으로 쓰지 말 것
- 공개 데이터가 부족하면 부족하다고 명확히 쓸 것
- 공식 감정(Appraisal)처럼 쓰지 말 것
- "정확한 가격"이 아니라 "참고용 시장 범위"로 제시할 것
- 팩트와 해석을 섞지 말 것
- 한국어로 작성할 것
- 전문적이고 절제된 보고서 톤으로 작성할 것
- 존재하지 않는 경매 lot, 기관 이력, 가격을 만들어내지 말 것
- 작품 개별 거래와 작가 전체 시장을 혼동하지 말 것`;

function buildPrompt(a: Record<string, unknown>): string {
  return `아래 작품 정보를 바탕으로 ARTENA Market Intelligence Report를 작성하라.

작품 정보:
${JSON.stringify(a, null, 2)}

아래 JSON 구조로만 응답하라. 마크다운 없이 순수 JSON만:

{
  "artworkOverview": {
    "artist": "작가명",
    "title": "작품명",
    "year": "제작연도 또는 확인 불가",
    "medium": "매체",
    "size": "사이즈 또는 확인 불가",
    "additionalInfo": "기타 확인 가능한 정보 또는 없음"
  },
  "interpretation": {
    "coreThemes": ["핵심 개념 1", "핵심 개념 2", "핵심 개념 3"],
    "structuralAnalysis": "구조적 해석 — 화면 구성, 색, 선, 형상이 만드는 의미 구조를 설명하는 단락",
    "artenaSummary": "한 문장 해석 — 명확하고 절제된 톤"
  },
  "artistPositioning": {
    "base": "활동 기반 (국가/도시/갤러리 시스템)",
    "galleryHistory": "주요 갤러리 또는 기관 이력 — 공개 확인 가능한 것만",
    "marketPosition": "시장 포지션 설명",
    "artenaEvaluation": "ARTENA 평가 — 해석 문장"
  },
  "marketData": {
    "auctionSample": "경매 표본 수 또는 표본 제한 사유",
    "publicPriceRange": "공개된 가격대 또는 공개 실거래 확인 불가",
    "comparability": "비교 가능성 여부 설명",
    "marketStructure": "1차/2차 시장 구조 특성"
  },
  "comparableAnalysis": {
    "limitations": [
      "동일 작품 거래 여부 관련 한계",
      "동일 매체 comparable 충분성",
      "공개 가격의 신뢰도",
      "gallery/private sale 반영 여부"
    ],
    "artenaJudgment": "comparable이 강하거나 약한 이유, 가격 판단 어려운 이유, 필요한 추가 정보를 설명하는 단락"
  },
  "priceRange": {
    "usd": { "low": "$X,XXX", "mid": "$XX,XXX", "high": "$XXX,XXX" },
    "eur": { "low": "€X,XXX", "mid": "€XX,XXX", "high": "€XXX,XXX" },
    "krw": { "low": "₩XX만", "mid": "₩XXX만", "high": "₩X억" },
    "confidenceNote": "데이터 충분성 및 범위 설정 근거 설명"
  },
  "confidence": {
    "overall": 0,
    "dataDepth": 0,
    "marketStability": 0,
    "comparableMatch": 0,
    "geographicCoverage": 0,
    "localMarketFit": 0,
    "interpretation": "confidence 수준 해석 — 왜 높거나 낮은지 설명"
  },
  "priceDrivers": {
    "upward": ["상승 요인 1", "상승 요인 2", "상승 요인 3"],
    "downward": ["하락/리스크 요인 1", "하락/리스크 요인 2", "하락/리스크 요인 3"]
  },
  "marketContext": {
    "stage": "작가의 현재 시장 단계",
    "regional": "지역적 시장 특성",
    "collectorDemand": "collector 수요 구조",
    "artenaInsight": "ARTENA 인사이트 핵심 문장 1개"
  },
  "investmentInsight": {
    "holdingPeriod": "권장 보유 기간",
    "growthPotential": "성장 가능성",
    "riskLevel": "Low 또는 Mid 또는 High",
    "strategicNote": "전략적 해석 — 투자 권유 아닌 참고 관점으로"
  },
  "finalSummary": "작품/작가 포지션, 공개 시장 데이터 수준, 가격 판단 가능 수준, ARTENA 핵심 결론을 포함한 한 단락 요약"
}

규칙:
- confidence 숫자는 0-100 정수
- 공개 데이터 부족 → confidence 낮춤 (40 이하)
- comparable 부족 → comparableMatch 낮춤
- 기관 이력 강함 ≠ 가격 confidence 높음
- 가격 범위: 데이터 부족하면 범위 넓게, 숫자 억지로 좁히지 말 것
- 존재하지 않는 lot나 가격 절대 만들지 말 것`;
}

export async function POST(req: NextRequest) {
  try {
    const { analysis } = await req.json();
    if (!analysis) return NextResponse.json({ success: false, error: "Missing analysis data" }, { status: 400 });

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildPrompt(analysis) }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text response");

    const match = textBlock.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON parse failed");

    return NextResponse.json({ success: true, data: JSON.parse(match[0]) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
