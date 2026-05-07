/**
 * interactionService — canonical write/read API for user-artwork
 * interactions. Wraps the existing analytics event log so the app
 * keeps a single source of truth, but exposes the typed
 * UserArtworkInteraction shape that Gallery Console will consume.
 *
 * Storage: localStorage today (per device). Swap for a backend
 * ingest later by replacing the read/write helpers — the public
 * functions don't change.
 */

import { nanoid } from "nanoid";
import { trackEvent, getEventQueue } from "../analyze/lib/analytics";
import type {
  UserArtworkInteraction,
  InteractionType,
  LeadSignal,
  LeadSignalType,
  LeadStrength,
  UserId,
  ArtworkId,
  ReportId,
  GalleryId,
} from "../lib/types";

/* ── Per-device user identity ──────────────────────────────────── */

const USER_ID_KEY = "artena.userId";

export function getOrCreateUserId(): UserId {
  if (typeof window === "undefined") return "anonymous";
  try {
    const existing = window.localStorage.getItem(USER_ID_KEY);
    if (existing) return existing;
    const fresh = `u_${nanoid(12)}`;
    window.localStorage.setItem(USER_ID_KEY, fresh);
    return fresh;
  } catch {
    return "anonymous";
  }
}

/* ── Recording interactions ────────────────────────────────────── */

export interface RecordInteractionInput {
  interactionType: InteractionType;
  artworkId?:      ArtworkId;
  reportId?:       ReportId;
  galleryId?:      GalleryId;
  meta?:           Record<string, string | number | boolean>;
}

const STORE_KEY = "artena.interactions";
const MAX_STORED = 500;

function readStore(): UserArtworkInteraction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(items: UserArtworkInteraction[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = items.length > MAX_STORED ? items.slice(-MAX_STORED) : items;
    window.localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota / disabled */
  }
}

/**
 * Record a typed interaction. Also fans out to the legacy analytics
 * log so existing dashboards keep working.
 */
export function recordInteraction(input: RecordInteractionInput): UserArtworkInteraction {
  const record: UserArtworkInteraction = {
    id:              nanoid(10),
    userId:          getOrCreateUserId(),
    artworkId:       input.artworkId,
    reportId:        input.reportId,
    galleryId:       input.galleryId,
    interactionType: input.interactionType,
    meta:            input.meta,
    createdAt:       new Date().toISOString(),
  };

  const all = readStore();
  all.push(record);
  writeStore(all);

  // Mirror to the analytics event log so intent detection, dashboards,
  // and the existing trackEvent surface keep firing.
  trackEvent(mapToLegacyEvent(input.interactionType), {
    artworkId: input.artworkId,
    reportId:  input.reportId,
    galleryId: input.galleryId,
    ...(input.meta ?? {}),
  });

  return record;
}

function mapToLegacyEvent(t: InteractionType):
  | "artwork_liked" | "artwork_unliked"
  | "artwork_saved" | "artwork_unsaved"
  | "artwork_added_to_collection"
  | "view_collection_clicked"
  | "ask_artena_clicked"
  | "ai_question_asked"
  | "artwork_shared" {
  switch (t) {
    case "liked":               return "artwork_liked";
    case "saved":               return "artwork_saved";
    case "added_to_collection": return "artwork_added_to_collection";
    case "asked_ai":            return "ai_question_asked";
    case "shared":              return "artwork_shared";
    case "price_question":      return "ai_question_asked";
    case "viewed":              return "view_collection_clicked";
  }
}

export function getInteractions(): UserArtworkInteraction[] {
  return readStore();
}

/* ── Lead Signal computation ───────────────────────────────────── */
/*
 * Computed-only, no UI per spec. Gallery Console will read these to
 * surface high-intent users / artworks.
 *
 * Signal mapping:
 *   saved          — single save = medium, repeated saves = high
 *   collection     — adding to a collection = high (deeper intent)
 *   asked_price    — any ai_question with price/purchase intent meta
 *                    flag = high; otherwise n/a
 *   repeated_view  — 3+ views of the same artwork in the log = medium,
 *                    5+ = high
 */

export function computeLeadSignals(): LeadSignal[] {
  const interactions = readStore();
  const signals: LeadSignal[] = [];
  const userId = getOrCreateUserId();

  // Group by artworkId (skip records without one).
  const byArtwork = new Map<ArtworkId, UserArtworkInteraction[]>();
  for (const i of interactions) {
    if (!i.artworkId) continue;
    if (!byArtwork.has(i.artworkId)) byArtwork.set(i.artworkId, []);
    byArtwork.get(i.artworkId)!.push(i);
  }

  byArtwork.forEach((items, artworkId) => {
    const galleryId = items.find(i => i.galleryId)?.galleryId;
    const counts: Record<InteractionType, number> = {
      viewed: 0, liked: 0, saved: 0, added_to_collection: 0,
      asked_ai: 0, shared: 0, price_question: 0,
    };
    for (const i of items) counts[i.interactionType]++;

    const push = (signalType: LeadSignalType, strength: LeadStrength, weight: number) => {
      signals.push({
        id: nanoid(10),
        userId,
        artworkId,
        galleryId,
        signalType,
        strength,
        weight,
        createdAt: new Date().toISOString(),
      });
    };

    // saved
    if (counts.saved >= 2)      push("saved", "high",   counts.saved);
    else if (counts.saved >= 1) push("saved", "medium", counts.saved);

    // collection
    if (counts.added_to_collection >= 1) {
      push("collection", "high", counts.added_to_collection);
    }

    // asked_price — uses meta flag set by the price-intent path
    const priceQs = items.filter(i =>
      i.interactionType === "asked_ai" || i.interactionType === "price_question"
    ).filter(i =>
      i.interactionType === "price_question" || i.meta?.intent === "price"
    );
    if (priceQs.length > 0) push("asked_price", "high", priceQs.length);

    // repeated_view
    if (counts.viewed >= 5)      push("repeated_view", "high",   counts.viewed);
    else if (counts.viewed >= 3) push("repeated_view", "medium", counts.viewed);
  });

  return signals;
}
