/**
 * galleryAnalyticsService — aggregate analytics + dashboard metrics
 * for a gallery. Reads from the mock interaction store today; real
 * Gallery Console will swap to a backend query.
 */

import type {
  Artwork,
  ArtworkAnalytics,
  GalleryId,
  UserArtworkInteraction,
} from "../../lib/types";
import { MOCK_ARTWORKS, MOCK_INTERACTIONS } from "./mockData";

/* ── Filter shapes (shared with hooks/UI) ──────────────────────── */

export type RangeKey = "7d" | "30d" | "90d" | "all";

export interface AnalyticsFilters {
  range:        RangeKey;
  artistId?:    string;
  availability?: Artwork["availabilityStatus"];
}

/* ── Helpers ───────────────────────────────────────────────────── */

const HOUR = 3600 * 1000;
const RANGE_HOURS: Record<RangeKey, number> = {
  "7d":  24 * 7,
  "30d": 24 * 30,
  "90d": 24 * 90,
  "all": 24 * 365 * 10,
};

function withinRange(iso: string, range: RangeKey): boolean {
  const ageMs = Date.now() - new Date(iso).getTime();
  return ageMs <= RANGE_HOURS[range] * HOUR;
}

function isPriceQuestion(i: UserArtworkInteraction): boolean {
  if (i.interactionType === "price_question") return true;
  if (i.interactionType === "asked_ai" && i.meta?.intent === "price") return true;
  return false;
}

/* ── Lead score weighting ──────────────────────────────────────── */
/*
 * Weighted composite. Designed so a single price_question or
 * collection-add bumps the score visibly above pure-view artworks.
 * Capped at 100.
 */
const SCORE_WEIGHTS = {
  viewed:              0.5,
  liked:               1,
  shared:              2,
  asked_ai:            2,
  saved:               3,
  added_to_collection: 6,
  price_question:      8,
  inquiry_click:       10,
};

function computeLeadScore(a: ArtworkAnalytics): number {
  const raw =
    a.views          * SCORE_WEIGHTS.viewed +
    a.likes          * SCORE_WEIGHTS.liked +
    a.shares         * SCORE_WEIGHTS.shared +
    a.aiQuestions    * SCORE_WEIGHTS.asked_ai +
    a.saves          * SCORE_WEIGHTS.saved +
    a.collectionAdds * SCORE_WEIGHTS.added_to_collection +
    a.priceQuestions * SCORE_WEIGHTS.price_question +
    a.inquiryClicks  * SCORE_WEIGHTS.inquiry_click;
  return Math.min(100, Math.round(raw));
}

/* ── Public API ────────────────────────────────────────────────── */

export interface GalleryDashboardMetrics {
  views:          number;
  saves:          number;
  aiQuestions:    number;
  priceQuestions: number;
  highIntentLeads: number;
  /** Optional WoW change ratio (positive = up). */
  viewsChange?:   number;
  savesChange?:   number;
  questionsChange?: number;
}

export async function getGalleryDashboard(
  galleryId: GalleryId,
  filters: AnalyticsFilters = { range: "7d" },
): Promise<GalleryDashboardMetrics> {
  const interactions = MOCK_INTERACTIONS.filter(i =>
    i.galleryId === galleryId && withinRange(i.createdAt, filters.range),
  );

  // Previous-period (same length) for the change-rate.
  const prev = MOCK_INTERACTIONS.filter(i => {
    if (i.galleryId !== galleryId) return false;
    const ageMs  = Date.now() - new Date(i.createdAt).getTime();
    const winMs  = RANGE_HOURS[filters.range] * HOUR;
    return ageMs > winMs && ageMs <= winMs * 2;
  });

  const count = (set: UserArtworkInteraction[], type: string) =>
    set.filter(i => i.interactionType === type).length;
  const priceQs = (set: UserArtworkInteraction[]) => set.filter(isPriceQuestion).length;

  const views          = count(interactions, "viewed");
  const saves          = count(interactions, "saved");
  const aiQuestions    = count(interactions, "asked_ai");
  const priceQuestions = priceQs(interactions);

  // Lead heuristic per user: any user with price_question or
  // collection-add or 2+ saves in the window counts as high intent.
  const byUser = new Map<string, UserArtworkInteraction[]>();
  for (const i of interactions) {
    if (!byUser.has(i.userId)) byUser.set(i.userId, []);
    byUser.get(i.userId)!.push(i);
  }
  let highIntentLeads = 0;
  byUser.forEach(items => {
    const hasPrice    = items.some(isPriceQuestion);
    const hasCollect  = items.some(i => i.interactionType === "added_to_collection");
    const saveCount   = items.filter(i => i.interactionType === "saved").length;
    if (hasPrice || hasCollect || saveCount >= 2) highIntentLeads++;
  });

  const ratio = (cur: number, p: number) => p === 0 ? undefined : (cur - p) / p;

  return {
    views, saves, aiQuestions, priceQuestions, highIntentLeads,
    viewsChange:     ratio(views,        count(prev, "viewed")),
    savesChange:     ratio(saves,        count(prev, "saved")),
    questionsChange: ratio(aiQuestions,  count(prev, "asked_ai")),
  };
}

/* ── Per-artwork analytics ─────────────────────────────────────── */

export async function getArtworkAnalytics(
  galleryId: GalleryId,
  filters: AnalyticsFilters = { range: "30d" },
): Promise<ArtworkAnalytics[]> {
  const artworks = MOCK_ARTWORKS.filter(aw => aw.galleryId === galleryId);
  const interactionsByArtwork = new Map<string, UserArtworkInteraction[]>();

  for (const i of MOCK_INTERACTIONS) {
    if (!i.artworkId)                          continue;
    if (i.galleryId !== galleryId)             continue;
    if (!withinRange(i.createdAt, filters.range)) continue;
    if (!interactionsByArtwork.has(i.artworkId)) interactionsByArtwork.set(i.artworkId, []);
    interactionsByArtwork.get(i.artworkId)!.push(i);
  }

  const results: ArtworkAnalytics[] = artworks.map(aw => {
    const items = interactionsByArtwork.get(aw.id) ?? [];
    const count = (t: string) => items.filter(i => i.interactionType === t).length;
    const lastIso = items.reduce<string | undefined>((latest, i) =>
      !latest || i.createdAt > latest ? i.createdAt : latest, undefined);
    const a: ArtworkAnalytics = {
      artworkId:       aw.id,
      galleryId:       aw.galleryId,
      views:           count("viewed"),
      likes:           count("liked"),
      saves:           count("saved"),
      shares:          count("shared"),
      collectionAdds:  count("added_to_collection"),
      aiQuestions:     count("asked_ai"),
      priceQuestions:  items.filter(isPriceQuestion).length,
      inquiryClicks:   0, // not yet tracked — wired up when the
                          // contact-gallery CTA ships
      leadScore:       0,
      lastInteractionAt: lastIso,
    };
    a.leadScore = computeLeadScore(a);
    return a;
  });

  return results;
}

export async function getArtworkAnalyticsById(
  galleryId: GalleryId,
  artworkId: string,
  filters: AnalyticsFilters = { range: "30d" },
): Promise<ArtworkAnalytics | null> {
  const all = await getArtworkAnalytics(galleryId, filters);
  return all.find(a => a.artworkId === artworkId) ?? null;
}
