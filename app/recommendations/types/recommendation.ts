import type { CollectionAnalysis } from "../../collection/hooks/useCollection";

export type ReasonCategory = "style" | "concept" | "emotion" | "extension" | "market";
export type MarketTier = "Emerging" | "Established" | "Blue-chip";
export type FilterKey = "all" | "style" | "market" | "medium";

export interface ActiveFilter {
  key: FilterKey;
  value: string;
}

export interface Recommendation {
  id: string;
  artist: string;
  title: string;
  year: string;
  style: string;
  medium: string;
  marketTier: MarketTier;
  reason: string;
  reasonCategory: ReasonCategory;
  accentColor: string;
  analysis: CollectionAnalysis;
  liked: boolean;
  saved: boolean;
}

export const FILTER_OPTIONS: Record<string, string[]> = {
  style: ["Minimalism", "Abstraction", "Conceptual", "Photography"],
  market: ["Emerging", "Established", "Blue-chip"],
  medium: ["Painting", "Installation", "Photography", "Sculpture"],
};
