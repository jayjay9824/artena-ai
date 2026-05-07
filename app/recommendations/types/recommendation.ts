import type { CollectionAnalysis } from "../../collection/hooks/useCollection";
import type { ArtistPhotoData } from "../../types/artistPhoto";

export type { ArtistPhotoData };

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
  artistPhoto: ArtistPhotoData;
  artworkImageQuery: string;
}

export const FILTER_OPTIONS: Record<string, string[]> = {
  // Spec: All / Minimalism / Abstraction / Conceptual / Korean Modernism
  style: ["Minimalism", "Abstraction", "Conceptual", "Korean Modernism", "Photography"],
  market: ["Emerging", "Established", "Blue-chip"],
  medium: ["Painting", "Installation", "Photography", "Sculpture"],
};
