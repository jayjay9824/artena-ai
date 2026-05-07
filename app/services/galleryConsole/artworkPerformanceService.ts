/**
 * artworkPerformanceService — joins Artwork + ArtworkAnalytics for the
 * performance table view. Handles sort + secondary filters that the
 * raw analyticsService doesn't apply (sort is presentation-layer).
 */

import type {
  Artwork,
  ArtworkAnalytics,
  GalleryId,
} from "../../lib/types";
import { MOCK_ARTWORKS, MOCK_ARTISTS } from "./mockData";
import {
  AnalyticsFilters,
  getArtworkAnalytics,
} from "./galleryAnalyticsService";

export type SortKey =
  | "leadScore"
  | "views"
  | "saves"
  | "aiQuestions"
  | "priceQuestions";

export interface PerformanceRow {
  artwork:    Artwork;
  artistName: string;
  analytics:  ArtworkAnalytics;
}

export interface PerformanceFilters extends AnalyticsFilters {
  sort?: SortKey;
}

export async function getPerformanceRows(
  galleryId: GalleryId,
  filters: PerformanceFilters = { range: "30d" },
): Promise<PerformanceRow[]> {
  const analytics = await getArtworkAnalytics(galleryId, filters);
  const aMap = new Map(analytics.map(a => [a.artworkId, a]));
  const artistMap = new Map(MOCK_ARTISTS.map(a => [a.id, a.name]));

  let rows: PerformanceRow[] = MOCK_ARTWORKS
    .filter(aw => aw.galleryId === galleryId)
    .map(aw => ({
      artwork:    aw,
      artistName: artistMap.get(aw.artistId) ?? "Unknown",
      analytics:  aMap.get(aw.id) ?? blankAnalytics(aw.id, galleryId),
    }));

  if (filters.artistId) {
    rows = rows.filter(r => r.artwork.artistId === filters.artistId);
  }
  if (filters.availability) {
    rows = rows.filter(r => r.artwork.availabilityStatus === filters.availability);
  }

  const sortBy: SortKey = filters.sort ?? "leadScore";
  rows.sort((a, b) => {
    switch (sortBy) {
      case "views":          return b.analytics.views          - a.analytics.views;
      case "saves":          return b.analytics.saves          - a.analytics.saves;
      case "aiQuestions":    return b.analytics.aiQuestions    - a.analytics.aiQuestions;
      case "priceQuestions": return b.analytics.priceQuestions - a.analytics.priceQuestions;
      case "leadScore":
      default:               return b.analytics.leadScore      - a.analytics.leadScore;
    }
  });

  return rows;
}

function blankAnalytics(artworkId: string, galleryId: GalleryId): ArtworkAnalytics {
  return {
    artworkId, galleryId,
    views: 0, likes: 0, saves: 0, shares: 0,
    collectionAdds: 0, aiQuestions: 0, priceQuestions: 0, inquiryClicks: 0,
    leadScore: 0,
  };
}
