import { ComparableSale, ConfidenceScores, ScoredComparable, ValuationInput, ValuationResult } from "../types";
import { convertFromUSD } from "./currencyService";

const MEDIUM_SIMILARITY: Record<string, string[]> = {
  oil: ["oil", "acrylic"],
  acrylic: ["acrylic", "oil"],
  spray: ["spray", "mixed"],
  mixed: ["mixed", "oil", "acrylic", "spray"],
  "works-on-paper": ["works-on-paper"],
  print: ["print"],
  sculpture: ["sculpture"],
  photography: ["photography"],
};

function mediumScore(inputMedium: string, saleMedium: string): number {
  if (!inputMedium || inputMedium === "other") return 0.6;
  const key = inputMedium.toLowerCase();
  const val = saleMedium.toLowerCase();
  if (key === val) return 1.0;
  const related = MEDIUM_SIMILARITY[key] || [];
  return related.includes(val) ? 0.75 : 0.4;
}

function sizeScore(inputW?: number, inputH?: number, saleW?: number, saleH?: number): number {
  if (!inputW || !inputH || !saleW || !saleH) return 0.7;
  const inputArea = inputW * inputH;
  const saleArea = saleW * saleH;
  const ratio = Math.min(inputArea, saleArea) / Math.max(inputArea, saleArea);
  return 0.4 + ratio * 0.6;
}

function recencyScore(saleDate: string): number {
  const saleYear = parseInt(saleDate.split("-")[0]);
  const yearsAgo = new Date().getFullYear() - saleYear;
  if (yearsAgo <= 1) return 1.0;
  if (yearsAgo <= 2) return 0.9;
  if (yearsAgo <= 3) return 0.8;
  if (yearsAgo <= 5) return 0.65;
  return 0.5;
}

function sizeAdjustedPrice(priceUSD: number, inputW?: number, inputH?: number, saleW?: number, saleH?: number): number {
  if (!inputW || !inputH || !saleW || !saleH) return priceUSD;
  const inputArea = inputW * inputH;
  const saleArea = saleW * saleH;
  if (saleArea <= 0) return priceUSD;
  const ratio = inputArea / saleArea;
  return priceUSD * Math.pow(ratio, 0.45);
}

function conditionMultiplier(condition: string): number {
  return { excellent: 1.1, good: 1.0, fair: 0.85, poor: 0.70 }[condition] ?? 1.0;
}

function channelMultiplier(channel: string): number {
  return { auction: 1.0, gallery: 0.9, fair: 0.85, private: 0.8 }[channel] ?? 1.0;
}

function computeConfidence(
  comparables: ScoredComparable[],
  input: ValuationInput
): ConfidenceScores {
  const n = comparables.length;
  const dataDepth = Math.min(95, 20 + n * 8);

  const avgSimilarity = n > 0
    ? comparables.reduce((s, c) => s + c.similarityScore, 0) / n
    : 0;
  const comparableMatch = Math.round(avgSimilarity * 100);

  const regions = new Set(comparables.map((c) => c.region));
  const channels = new Set(comparables.map((c) => c.saleChannel));
  const geographicCoverage = Math.min(95, regions.size * 22);
  const channelCoverage = Math.min(95, channels.size * 28);

  const years = comparables.map((c) => parseInt(c.saleDate));
  const dateSpread = years.length > 1 ? Math.max(...years) - Math.min(...years) : 0;
  const marketStability = Math.min(90, 40 + dateSpread * 8);

  const koreanCount = comparables.filter((c) => c.region === "Korea").length;
  const localMarketFit = Math.min(90, koreanCount * 25);

  let metadataScore = 40;
  if (input.medium && input.medium !== "other") metadataScore += 15;
  if (input.widthCm && input.heightCm) metadataScore += 15;
  if (input.year) metadataScore += 10;
  if (input.provenanceNotes) metadataScore += 10;
  if (input.exhibitionHistory) metadataScore += 10;
  const metadataCompleteness = Math.min(100, metadataScore);

  const overall = Math.round(
    dataDepth * 0.20 +
    comparableMatch * 0.25 +
    metadataCompleteness * 0.15 +
    marketStability * 0.15 +
    geographicCoverage * 0.10 +
    localMarketFit * 0.05 +
    channelCoverage * 0.10
  );

  return { overall, dataDepth, marketStability, comparableMatch, metadataCompleteness, geographicCoverage, localMarketFit, channelCoverage };
}

export function calculateValuation(input: ValuationInput, rawComparables: ComparableSale[]): Omit<ValuationResult, "keyDrivers" | "riskFactors" | "marketContext" | "explanation"> {
  // Score comparables
  const scored: ScoredComparable[] = rawComparables.map((c) => {
    const ms = mediumScore(input.medium, c.medium);
    const ss = sizeScore(input.widthCm, input.heightCm, c.widthCm, c.heightCm);
    const rs = recencyScore(c.saleDate);
    const score = ms * 0.35 + ss * 0.25 + rs * 0.40;
    return { ...c, similarityScore: parseFloat(score.toFixed(3)) };
  }).sort((a, b) => b.similarityScore - a.similarityScore);

  const topComparables = scored.filter((c) => c.similarityScore > 0.3).slice(0, 8);
  const hasData = topComparables.length > 0;

  let midUSD = 0;
  if (hasData) {
    // Weighted average with size normalization
    let totalWeight = 0;
    let weightedSum = 0;
    topComparables.forEach((c) => {
      const adjusted = sizeAdjustedPrice(c.normalizedPriceUSD, input.widthCm, input.heightCm, c.widthCm, c.heightCm);
      const weight = c.similarityScore * channelMultiplier(c.saleChannel);
      weightedSum += adjusted * weight;
      totalWeight += weight;
    });
    midUSD = totalWeight > 0 ? weightedSum / totalWeight : 0;
    midUSD *= conditionMultiplier(input.condition);
    if (input.signed) midUSD *= 1.05;
    if (input.provenanceNotes) midUSD *= 1.08;
    if (input.exhibitionHistory) midUSD *= 1.05;
  }

  const confidence = computeConfidence(topComparables, input);
  const spreadMultiplier = confidence.overall < 50 ? 0.35 : confidence.overall < 65 ? 0.25 : 0.18;
  const lowUSD = midUSD * (1 - spreadMultiplier);
  const highUSD = midUSD * (1 + spreadMultiplier * 1.1);

  const low = convertFromUSD(lowUSD, input.displayCurrency);
  const mid = convertFromUSD(midUSD, input.displayCurrency);
  const high = convertFromUSD(highUSD, input.displayCurrency);

  const dates = topComparables.map((c) => c.saleDate).sort();
  const dateRange = dates.length > 0 ? `${dates[0]} — ${dates[dates.length - 1]}` : "N/A";
  const regions = [...new Set(topComparables.map((c) => c.region))];
  const basisLabel = regions.length >= 3 ? "Global" : regions.length >= 2 ? "Regional" : "Limited";

  return {
    priceRange: { lowUSD, midUSD, highUSD, currency: input.displayCurrency, low, mid, high },
    confidence,
    topComparables,
    basisLabel,
    comparablesCount: topComparables.length,
    dateRange,
    dataQualityWarning: !hasData
      ? "No comparable sales found for this artist. Estimate is based on market proxies only."
      : topComparables.length < 3
      ? "Limited comparable data available. Confidence range is wider than usual."
      : undefined,
  };
}
