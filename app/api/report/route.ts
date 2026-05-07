import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MARKET_PROMPT = (a: Record<string, unknown>) => `You are an elite institutional art market analyst — Sotheby's research division level.
Generate a Market Intelligence Report from the artwork analysis data below.
Analysis Data: ${JSON.stringify(a, null, 2)}

Respond ONLY with valid JSON, no markdown:
{
  "artworkOverview": {
    "artist": "string",
    "title": "string",
    "year": "string",
    "medium": "string",
    "size": "string or Data not available",
    "series": "string or Data not available"
  },
  "interpretationLayer": {
    "emotionVector": [
      { "label": "차분함", "score": number },
      { "label": "무거움", "score": number },
      { "label": "따뜻함", "score": number },
      { "label": "안으로", "score": number },
      { "label": "움직임", "score": number }
    ],
    "insight": "one precise institutional insight sentence",
    "structuralAnalysis": ["point 1", "point 2", "point 3"]
  },
  "marketIntelligence": {
    "category": "Primary / Secondary / Tertiary Market",
    "careerStage": "Emerging / Mid-career / Established / Historical Master",
    "priceRange": "price range string",
    "demandSegment": "segment description",
    "marketTrend": "up or stable or down",
    "trendNote": "one sentence"
  },
  "riskAnalysis": ["risk 1", "risk 2", "risk 3"],
  "collectorInsight": {
    "shortTerm": "recommendation",
    "midTerm": "recommendation",
    "longTerm": "recommendation",
    "investmentType": "Low or Mid or High",
    "notes": "one sentence"
  },
  "artenaSummary": "2-3 sentences of institutional-grade insight"
}
If data is unknown use "Data not available". Do not hallucinate auction prices not in the input.`;

const ARTIST_PROMPT = (a: Record<string, unknown>) => `You are an elite institutional art world expert — Christie's specialist level.
Generate an Artist Intelligence Report from the artwork analysis data below.
Analysis Data: ${JSON.stringify(a, null, 2)}

Respond ONLY with valid JSON, no markdown:
{
  "artistProfile": {
    "name": "string",
    "birthYear": "string or Data not available",
    "nationality": "string",
    "education": "string or Data not available"
  },
  "artisticIdentity": {
    "coreThemes": ["theme 1", "theme 2", "theme 3"],
    "mediums": ["medium 1", "medium 2"],
    "conceptualKeywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4"]
  },
  "marketPositioning": {
    "popularityScore": number 0-100,
    "institutionalScore": number 0-100,
    "positionLabel": "e.g. Institutionally Recognized / Collector Favorite",
    "description": "one sentence positioning statement"
  },
  "careerHighlights": {
    "exhibitions": [
      { "title": "string", "venue": "string", "year": "string" }
    ],
    "institutions": ["institution 1", "institution 2", "institution 3"]
  },
  "marketData": {
    "auctionTrend": "text description",
    "demandTrend": "text description",
    "priceRange": "price range"
  },
  "investmentInsight": {
    "holdingPeriod": "e.g. 5-10 years",
    "riskLevel": "Low or Mid or High",
    "growthPotential": "text description",
    "note": "one sentence institutional note"
  }
}
If data is unknown use "Data not available". Use data from the analysis input where available.`;

export async function POST(req: NextRequest) {
  try {
    const { type, analysis } = await req.json();
    if (!type || !analysis) return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 3000,
      messages: [{ role: "user", content: type === "market" ? MARKET_PROMPT(analysis) : ARTIST_PROMPT(analysis) }],
    });

    const text = message.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") throw new Error("No response");
    const match = text.text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("JSON parse failed");

    return NextResponse.json({ success: true, data: JSON.parse(match[0]) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
