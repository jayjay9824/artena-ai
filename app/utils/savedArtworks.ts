/**
 * Saved-artworks localStorage utility.
 *
 * Single source of truth for the V1 "saved" feature:
 *   localStorage["axvela:savedArtworks"] : SavedArtwork[]
 *
 * Public surface (per spec):
 *   getSavedArtworks()   – read array, defensive parse
 *   saveArtwork()        – append, dedup by id, auto-stamp savedAt
 *   removeArtwork()      – remove by id
 *   getSavedCount()      – array length
 *   isArtworkSaved()     – membership test by id
 *
 * Legacy data migration:
 *   The pre-V1 saved analyses live at localStorage["artena_collection_v1"]
 *   (a richer CollectionItem shape). On the FIRST read of this util in
 *   a session, if the new key has never been written, we project the
 *   legacy items into the new SavedArtwork shape and write them under
 *   the new key. After that the new key is the only one we touch — so
 *   if a user later un-saves everything, we don't re-import the legacy
 *   data on the next read. The migration uses the "new key not yet
 *   set" check (getItem returns null) as its sentinel; an explicitly
 *   empty array "[]" still counts as set and skips migration.
 *
 * SSR-safe: every public function returns the empty/identity result
 * when window is undefined, so calling these from a server component
 * or during initial render is harmless.
 */

const SAVED_LS_KEY  = "axvela:savedArtworks";
const LEGACY_LS_KEY = "artena_collection_v1";

export interface SavedArtwork {
  id:            string;
  title:         string;
  artist:        string;
  thumbnailUrl:  string;
  savedAt:       string;
  analysisData?: unknown;
}

/* ── Legacy migration (one-shot per session) ─────────────────── */

interface LegacyCollectionItem {
  id: string;
  savedAt?: string;
  analysis?: { title?: string; artist?: string };
  imagePreview?: string | null;
}

let migrationDoneInSession = false;

function migrateLegacyIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (migrationDoneInSession) return;
  migrationDoneInSession = true;

  try {
    // Already migrated (or user has explicitly emptied the key) →
    // never overwrite. null means "never set" — the only state we
    // treat as "fresh install eligible for migration".
    if (window.localStorage.getItem(SAVED_LS_KEY) !== null) return;

    const legacyRaw = window.localStorage.getItem(LEGACY_LS_KEY);
    let migrated: SavedArtwork[] = [];

    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) {
        migrated = (parsed as LegacyCollectionItem[])
          .filter(c => c && typeof c.id === "string")
          .map(c => ({
            id:           c.id,
            title:        c.analysis?.title  ?? "Untitled",
            artist:       c.analysis?.artist ?? "Unknown",
            thumbnailUrl: c.imagePreview ?? "",
            savedAt:      c.savedAt ?? new Date().toISOString(),
            analysisData: c.analysis,
          }));
      }
    }

    // Always set — even an empty [] marks the key as initialised so
    // we don't re-attempt migration on later reads.
    window.localStorage.setItem(SAVED_LS_KEY, JSON.stringify(migrated));
  } catch {
    // Quota / serialise / parse failure — let the read fall through.
    // getSavedArtworks will simply return [] until the next session.
  }
}

/* ── Public read ─────────────────────────────────────────────── */

export function getSavedArtworks(): SavedArtwork[] {
  if (typeof window === "undefined") return [];
  migrateLegacyIfNeeded();
  try {
    const raw = window.localStorage.getItem(SAVED_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive — drop any malformed entry rather than throwing.
    return parsed.filter((x): x is SavedArtwork =>
      x !== null
      && typeof x === "object"
      && typeof (x as SavedArtwork).id === "string"
    );
  } catch {
    return [];
  }
}

export function getSavedCount(): number {
  return getSavedArtworks().length;
}

export function isArtworkSaved(id: string): boolean {
  if (!id) return false;
  return getSavedArtworks().some(a => a.id === id);
}

/* ── Public write ────────────────────────────────────────────── */

export interface SaveArtworkInput {
  id:            string;
  title?:        string;
  artist?:       string;
  thumbnailUrl?: string;
  /** Override the auto-stamped savedAt (rare — useful for backfill). */
  savedAt?:      string;
  analysisData?: unknown;
}

/**
 * Save a new artwork. Returns true when the item was actually added,
 * false when it was already present (dedup by id) or when the write
 * failed (quota, serialise error). The dedup branch makes this safe
 * to call from a "Save" button without a separate isArtworkSaved
 * pre-check — but consumers can still gate the UI label with
 * isArtworkSaved if they want a "Saved" / "Save" toggle.
 */
export function saveArtwork(input: SaveArtworkInput): boolean {
  if (typeof window === "undefined") return false;
  if (!input?.id) return false;

  const items = getSavedArtworks();
  if (items.some(a => a.id === input.id)) return false;

  const next: SavedArtwork = {
    id:           input.id,
    title:        input.title        ?? "Untitled",
    artist:       input.artist       ?? "Unknown",
    thumbnailUrl: input.thumbnailUrl ?? "",
    savedAt:      input.savedAt      ?? new Date().toISOString(),
    analysisData: input.analysisData,
  };

  try {
    const merged = [next, ...items];
    window.localStorage.setItem(SAVED_LS_KEY, JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a saved artwork by id. Returns true when the item was
 * actually present and is now gone, false when the id wasn't saved
 * (or the write failed).
 */
export function removeArtwork(id: string): boolean {
  if (typeof window === "undefined") return false;
  if (!id) return false;

  const items = getSavedArtworks();
  const next  = items.filter(a => a.id !== id);
  if (next.length === items.length) return false;

  try {
    window.localStorage.setItem(SAVED_LS_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
