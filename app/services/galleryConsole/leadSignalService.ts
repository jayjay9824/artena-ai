/**
 * leadSignalService — derives lead cards for the Gallery Console from
 * the interaction log. Output is grouped by (user × artwork) so each
 * card represents one collector × one artwork interest, ranked by
 * strength.
 */

import type {
  GalleryId,
  LeadStrength,
  UserArtworkInteraction,
} from "../../lib/types";
import { MOCK_INTERACTIONS, MOCK_ARTWORKS, MOCK_ARTISTS } from "./mockData";

export type StrengthFilter = LeadStrength | "all";

export interface LeadCard {
  id:           string;
  userId:       string;
  /** "Collector #A102" — derived from userId, anonymous by default. */
  displayName:  string;
  artworkId:    string;
  artworkTitle: string;
  artistName:   string;
  strength:     LeadStrength;
  /** Human-readable why this is a lead, e.g. "Asked price + saved artwork". */
  reason:       string;
  lastActiveAt: string;
  /** Underlying interaction count for tooltip / debug. */
  interactionCount: number;
}

interface ScoreBucket {
  count: Record<UserArtworkInteraction["interactionType"], number>;
  hasPriceIntent: boolean;
  last: string;
}

function blankBucket(): ScoreBucket {
  return {
    count: {
      viewed: 0, liked: 0, saved: 0, added_to_collection: 0,
      asked_ai: 0, shared: 0, price_question: 0,
    },
    hasPriceIntent: false,
    last: "",
  };
}

/* ── Strength rules ────────────────────────────────────────────── */
/*
 * High:    price_question, inquiry click (not yet wired), collection
 *          add, repeated views (4+ per artwork)
 * Medium:  saved, shared, asked_ai
 * Low:     viewed, liked
 */

function deriveStrength(b: ScoreBucket): LeadStrength {
  if (b.hasPriceIntent)              return "high";
  if (b.count.added_to_collection)   return "high";
  if (b.count.viewed >= 4)           return "high";
  if (b.count.saved || b.count.shared || b.count.asked_ai) return "medium";
  return "low";
}

function deriveReason(b: ScoreBucket): string {
  const parts: string[] = [];
  if (b.hasPriceIntent)              parts.push("Asked price");
  if (b.count.added_to_collection)   parts.push("Added to collection");
  if (b.count.saved >= 2)            parts.push(`Saved ×${b.count.saved}`);
  else if (b.count.saved)            parts.push("Saved");
  if (b.count.shared)                parts.push("Shared");
  if (b.count.asked_ai && !b.hasPriceIntent) parts.push("Asked AI");
  if (b.count.viewed >= 4)           parts.push(`Viewed ×${b.count.viewed}`);
  if (parts.length === 0)            parts.push("Viewed");
  return parts.slice(0, 3).join(" + ");
}

/* ── Public API ────────────────────────────────────────────────── */

export interface LeadFilters {
  strength?: StrengthFilter;
  /** Limit to a single artwork's leads. */
  artworkId?: string;
}

export async function getLeadSignals(
  galleryId: GalleryId,
  filters: LeadFilters = {},
): Promise<LeadCard[]> {
  const buckets = new Map<string, ScoreBucket>();
  // key = userId|artworkId
  for (const i of MOCK_INTERACTIONS) {
    if (i.galleryId !== galleryId) continue;
    if (!i.artworkId)              continue;
    const key = `${i.userId}|${i.artworkId}`;
    if (!buckets.has(key)) buckets.set(key, blankBucket());
    const b = buckets.get(key)!;
    b.count[i.interactionType]++;
    if (i.interactionType === "price_question") b.hasPriceIntent = true;
    if (i.interactionType === "asked_ai" && i.meta?.intent === "price") b.hasPriceIntent = true;
    if (!b.last || i.createdAt > b.last) b.last = i.createdAt;
  }

  const artworkLookup = new Map(MOCK_ARTWORKS.map(a => [a.id, a]));
  const artistLookup  = new Map(MOCK_ARTISTS.map(a => [a.id, a.name]));

  const cards: LeadCard[] = [];
  buckets.forEach((bucket, key) => {
    const [userId, artworkId] = key.split("|");
    const artwork = artworkLookup.get(artworkId);
    if (!artwork) return;
    const strength = deriveStrength(bucket);
    cards.push({
      id:           `lead-${cards.length}`,
      userId,
      displayName:  `Collector #${userId.replace(/[^A-Z0-9]/gi, "").slice(-4) || "0001"}`,
      artworkId,
      artworkTitle: artwork.title,
      artistName:   artistLookup.get(artwork.artistId) ?? "Unknown",
      strength,
      reason:       deriveReason(bucket),
      lastActiveAt: bucket.last,
      interactionCount: Object.values(bucket.count).reduce((s, n) => s + n, 0),
    });
  });

  let filtered = cards;
  if (filters.strength && filters.strength !== "all") {
    filtered = filtered.filter(c => c.strength === filters.strength);
  }
  if (filters.artworkId) {
    filtered = filtered.filter(c => c.artworkId === filters.artworkId);
  }

  // High intent first, then most recent.
  const STRENGTH_ORDER: Record<LeadStrength, number> = { high: 3, medium: 2, low: 1 };
  filtered.sort((a, b) => {
    const s = STRENGTH_ORDER[b.strength] - STRENGTH_ORDER[a.strength];
    return s !== 0 ? s : b.lastActiveAt.localeCompare(a.lastActiveAt);
  });

  return filtered;
}

/* ── Per-user roll-up for the Interested Users panel ───────────── */

export interface InterestedUser {
  userId:           string;
  displayName:      string;
  /** Top 3 keywords from the user's interaction history (placeholder). */
  tasteSummary:     string;
  /** Distinct artworks the user has interacted with, most recent first. */
  artworks:         { id: string; title: string; artist: string }[];
  topStrength:      LeadStrength;
  lastInteractionAt: string;
}

export async function getInterestedUsers(galleryId: GalleryId): Promise<InterestedUser[]> {
  const leads = await getLeadSignals(galleryId);
  const STRENGTH_ORDER: Record<LeadStrength, number> = { high: 3, medium: 2, low: 1 };

  const byUser = new Map<string, LeadCard[]>();
  for (const l of leads) {
    if (!byUser.has(l.userId)) byUser.set(l.userId, []);
    byUser.get(l.userId)!.push(l);
  }

  const users: InterestedUser[] = [];
  byUser.forEach((items, userId) => {
    const top = items.reduce((best, l) =>
      STRENGTH_ORDER[l.strength] > STRENGTH_ORDER[best.strength] ? l : best, items[0]);
    const recentSorted = [...items].sort((a, b) => b.lastActiveAt.localeCompare(a.lastActiveAt));
    users.push({
      userId,
      displayName: top.displayName,
      tasteSummary: deriveTasteSummary(items),
      artworks:    recentSorted.slice(0, 4).map(l => ({
        id: l.artworkId, title: l.artworkTitle, artist: l.artistName,
      })),
      topStrength:       top.strength,
      lastInteractionAt: recentSorted[0].lastActiveAt,
    });
  });

  users.sort((a, b) => {
    const s = STRENGTH_ORDER[b.topStrength] - STRENGTH_ORDER[a.topStrength];
    return s !== 0 ? s : b.lastInteractionAt.localeCompare(a.lastInteractionAt);
  });
  return users;
}

function deriveTasteSummary(leads: LeadCard[]): string {
  const artists = new Map<string, number>();
  for (const l of leads) artists.set(l.artistName, (artists.get(l.artistName) ?? 0) + 1);
  return Array.from(artists.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name)
    .join(" · ");
}
