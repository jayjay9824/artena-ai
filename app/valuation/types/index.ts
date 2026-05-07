export type Currency = "USD" | "EUR" | "KRW";
export type Region = "US" | "EU" | "Korea" | "Asia" | "Other";
export type SaleChannel = "auction" | "gallery" | "fair" | "private";
export type Condition = "excellent" | "good" | "fair" | "poor";

export interface ComparableSale {
  id: string;
  artistName: string;
  title: string;
  year: number;
  medium: string;
  widthCm: number;
  heightCm: number;
  normalizedPriceUSD: number;
  originalPrice: number;
  originalCurrency: string;
  saleDate: string; // YYYY-MM
  country: string;
  city: string;
  region: Region;
  saleChannel: SaleChannel;
  auctionHouse?: string;
}

export interface ScoredComparable extends ComparableSale {
  similarityScore: number;
}

export interface ValuationInput {
  artistName: string;
  title: string;
  year?: number;
  medium: string;
  widthCm?: number;
  heightCm?: number;
  series?: string;
  signed: boolean;
  condition: Condition;
  provenanceNotes: string;
  exhibitionHistory: string;
  displayCurrency: Currency;
}

export interface ConfidenceScores {
  overall: number;
  dataDepth: number;
  marketStability: number;
  comparableMatch: number;
  metadataCompleteness: number;
  geographicCoverage: number;
  localMarketFit: number;
  channelCoverage: number;
}

export interface ValuationResult {
  priceRange: {
    lowUSD: number;
    midUSD: number;
    highUSD: number;
    currency: Currency;
    low: number;
    mid: number;
    high: number;
  };
  confidence: ConfidenceScores;
  keyDrivers: string[];
  topComparables: ScoredComparable[];
  riskFactors: string[];
  marketContext: string;
  explanation: string;
  basisLabel: string;
  dataQualityWarning?: string;
  comparablesCount: number;
  dateRange: string;
}
