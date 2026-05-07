import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import type { CollectionAnalysis } from "../../collection/hooks/useCollection";
import type { MarketIntelligenceData } from "../../analyze/components/MarketIntelligenceReport";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * STEP 4 — object-context payload from the client. Drives prompt
 * rules that block price answers when the object is not a verified
 * market-relevant artwork, and adds a label-scan caveat when the
 * recognition was uncertain.
 */
interface AssistantContext {
  objectCategory?:      string;
  isMarketRelevant?:    boolean;
  marketDataAvailable?: boolean;
  recognitionStatus?:   string;
}

// ── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(
  analysis: CollectionAnalysis,
  reportData: MarketIntelligenceData | null,
  ctx: AssistantContext = {},
): string {
  const cat = analysis.category ?? "painting";
  const isArch = cat === "architecture";
  const isArtifact = cat === "artifact" || cat === "cultural_site";
  const entityLabel  = isArch ? "건축물" : isArtifact ? "유물/문화재" : "작품";
  const creatorLabel = isArch ? "건축가" : isArtifact ? "제작 주체" : "작가";

  const lines: string[] = [
    `현재 분석 ${entityLabel}: "${analysis.title || "제목 미상"}"`,
    `${creatorLabel}: ${analysis.artist || "미상"}`,
    analysis.year  ? `연도: ${analysis.year}`   : "",
    analysis.style ? `양식/사조: ${analysis.style}` : "",
    "",
    analysis.description
      ? `[${entityLabel} 설명]\n${analysis.description}` : "",
    "",
    (analysis.keywords ?? []).length > 0
      ? `[핵심 키워드]\n${analysis.keywords!.join(", ")}` : "",
    "",
    analysis.marketNote
      ? `[시장·유산 노트]\n${analysis.marketNote}` : "",
    "",
    (analysis.auctions ?? []).length > 0
      ? `[경매 기록]\n${analysis.auctions!
          .slice(0, 5)
          .map(a => `- ${a.date}: ${a.house}, 낙찰가 ${a.result} (추정가 ${a.estimate})`)
          .join("\n")}`
      : "",
    "",
    (analysis.works ?? []).length > 0
      ? `[대표작]\n${analysis.works!
          .slice(0, 4)
          .map(w => `- ${w.title} (${w.year}), ${w.medium}, ${w.location}`)
          .join("\n")}`
      : "",
    "",
    (analysis.collections ?? []).length > 0
      ? `[소장·등록 기관]\n${analysis.collections!
          .slice(0, 4)
          .map(c => `- ${c.inst}, ${c.city}: ${c.work}`)
          .join("\n")}`
      : "",
  ];

  const reportLines: string[] = reportData
    ? [
        "",
        "[시장 인텔리전스 요약]",
        reportData.priceRange?.usd
          ? `가격 범위 (USD): ${reportData.priceRange.usd.low} – ${reportData.priceRange.usd.high}`
          : "",
        reportData.artistPositioning?.marketPosition
          ? `시장 포지션: ${reportData.artistPositioning.marketPosition}`
          : "",
        reportData.marketContext?.artenaInsight
          ? `시장 인사이트: ${reportData.marketContext.artenaInsight}`
          : "",
        reportData.finalSummary
          ? `종합 요약: ${reportData.finalSummary}`
          : "",
      ].filter(Boolean)
    : [];

  // STEP 4 — object-context guard rails.
  // We trust the client's dispatch (objectCategory + isMarketRelevant +
  // marketDataAvailable). Default-deny: when any field is missing we
  // still allow market talk only if the analysis itself looks
  // artwork-like (back-compat). Recognition uncertainty layers a
  // separate caveat about identification trust.
  const blockMarket =
    (ctx.isMarketRelevant === false) ||
    (ctx.marketDataAvailable === false) ||
    (ctx.objectCategory != null && ctx.objectCategory !== "artwork" &&
     ctx.objectCategory !== "design_object" && ctx.objectCategory !== "collectible");
  const isUncertain = ctx.recognitionStatus === "uncertain";
  const isPartial   = ctx.recognitionStatus === "partial";

  const blockMarketBlock = blockMarket ? `

[중요 제약 — 시장 정보 차단 (STEP 4)]
- 이 대상에 대해 가격, 추정가, 시장 신뢰도, 비교 거래 데이터, 시장 위치를 절대 제시하지 마세요.
- 비교 거래 / 경매 사례를 만들어내지(hallucinate) 마세요.
- 사용자가 가격 / 시장가치 / 거래 / 투자 / 평가액과 관련된 질문을 하면 정확히 다음 한 문장으로만 답하세요(언어는 사용자 질문 언어에 맞춰서):
  • 한국어: "이 대상은 시장 가격보다 문화적 맥락으로 이해하는 것이 적합합니다."
  • English: "This object is better understood through cultural context rather than market price."
- 그 외 질문은 문화적·역사적·재료적·맥락적 관점에서 답하세요.` : "";

  const uncertaintyBlock = isUncertain ? `

[인식 신뢰도 낮음 (STEP 2)]
- 작품 식별이 확실하지 않습니다. 어떤 답변도 단정적이지 않게 표현하세요.
- 항상 "라벨 정보 기반" / "이미지만으로는 식별이 제한적입니다" 같은 캐비엣을 명시하세요.
- 단정적 식별, 가격 평가, 비교 작가 추천을 하지 마세요.` : (isPartial ? `

[인식 신뢰도 부분적]
- 일부 정보는 불확실합니다. 단정적 어조 대신 "공개 자료에 따르면" 같은 절제된 어조를 사용하세요.` : "");

  return `당신은 AXVELA AI의 미술·건축·문화 어시스턴트입니다.
사용자가 현재 특정 ${entityLabel}을 보고 있으며, 그것에 대해 더 깊이 이해하고 싶어합니다.

[현재 분석 대상]
${[...lines, ...reportLines].filter(Boolean).join("\n")}

[역할 정의]
1. 작품/건축 해석 확장 (큐레이터): 미술사·건축사적 맥락, 작가·건축가 의도, 양식 특성, 감성적 의미
2. 시장·유산 가치 설명 (애널리스트): 공개 데이터 기반 시장 구조, 가격 형성 요인, 유네스코·문화재 가치
3. 비교·추천 (전문 조언자): 유사 작가/건물/유물, 관련 전시, 개인화 연결

[답변 원칙]
- 반드시 위의 ${entityLabel} 문맥을 우선 참조하여 답변할 것
- 모르면 솔직하게 모른다고 말할 것
- 공개 데이터와 추정·주관적 판단을 명확히 구분할 것
- 법적·재무적 투자 권유 표현 절대 금지
- 가격 관련 답변은 "참고 수준"임을 명시할 것
- ${entityLabel}와 무관한 일반 잡담은 최소화할 것
- 한국어로 답변 (작가명·작품명 등 고유명사는 원어 유지)
${blockMarketBlock}${uncertaintyBlock}

[답변 스타일]
- 큐레이터 + 애널리스트의 전문적이고 친절한 톤
- 과하게 학술적이지 않게, 일반 관람객도 이해 가능하게
- 150–380자 내외로 간결하고 밀도 있게
- 필요 시 소제목 또는 짧은 리스트 허용 (마크다운 최소화)
- 수다스럽지 않고 인사이트 중심`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { analysis, messages, reportData, context } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const systemPrompt = buildSystemPrompt(
      analysis as CollectionAnalysis,
      (reportData as MarketIntelligenceData) ?? null,
      (context as AssistantContext) ?? {},
    );

    const stream = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 800,
      system: systemPrompt,
      messages: (messages as Array<{ role: "user" | "assistant"; content: string }>).map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(new TextEncoder().encode(event.delta.text));
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("assistant error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
