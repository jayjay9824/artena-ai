import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { calculateValuation } from "@/app/valuation/services/pricingEngine";
import { getGlobalComparableSales } from "@/app/valuation/services/comparableData";
import { formatPrice } from "@/app/valuation/services/currencyService";
import { ValuationInput } from "@/app/valuation/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const input: ValuationInput = await req.json();

    const comparables = getGlobalComparableSales(input.artistName);
    const valuation = calculateValuation(input, comparables);

    const { priceRange, confidence, topComparables, basisLabel } = valuation;

    const prompt = `You are ARTENA's senior market intelligence analyst, a specialist in fine art valuation with expertise in Korean and Asian contemporary markets.

Artist: ${input.artistName}
Title: ${input.title || "Untitled"}
Year: ${input.year || "Unknown"}
Medium: ${input.medium}
Size: ${input.widthCm && input.heightCm ? `${input.widthCm} × ${input.heightCm} cm` : "Unknown"}
Condition: ${input.condition}
Signed: ${input.signed ? "Yes" : "No"}
Provenance: ${input.provenanceNotes || "None"}
Exhibition History: ${input.exhibitionHistory || "None"}

Estimated Price Range (${input.displayCurrency}):
- Low: ${formatPrice(priceRange.low, input.displayCurrency)}
- Mid: ${formatPrice(priceRange.mid, input.displayCurrency)}
- High: ${formatPrice(priceRange.high, input.displayCurrency)}

Overall Confidence: ${confidence.overall}/100
Comparable Sales Used: ${topComparables.length} (${basisLabel} basis)
Top Comparables: ${topComparables.slice(0, 3).map(c => `${c.title} (${c.saleDate}, ${c.saleChannel}, $${Math.round(c.normalizedPriceUSD / 1000)}K USD)`).join("; ")}

Provide a JSON response with these exact keys:
{
  "keyDrivers": [string, string, string, string],
  "riskFactors": [string, string, string],
  "marketContext": string,
  "explanation": string
}

Rules:
- keyDrivers: 4 concise bullet points explaining what drives this artwork's value (format as action phrases, e.g. "Blue-chip Korean modernist with global auction presence")
- riskFactors: 3 honest risk considerations (market liquidity, condition factors, provenance issues, etc.)
- marketContext: 2-3 sentences about the artist's current market momentum, collector demand, and regional price trends. Reference specific auction houses or markets if known.
- explanation: 3-4 sentences explaining HOW the price range was calculated — reference the comparable sales approach, size adjustment, and key factors. Write as if addressing a sophisticated collector. Be specific about the methodology.

Tone: authoritative, precise, institutional. No hedging language like "may" or "could potentially." Write as Sotheby's would.`;

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      messages: [{ role: "user", content: prompt }],
    });

    let aiData = { keyDrivers: [], riskFactors: [], marketContext: "", explanation: "" };
    for (const block of response.content) {
      if (block.type === "text") {
        const match = block.text.match(/\{[\s\S]*\}/);
        if (match) {
          try { aiData = JSON.parse(match[0]); } catch {}
        }
        break;
      }
    }

    return NextResponse.json({ ...valuation, ...aiData });
  } catch (err) {
    console.error("Valuation API error:", err);
    return NextResponse.json({ error: "Valuation failed" }, { status: 500 });
  }
}
