/**
 * AI draft localStorage util — single source of truth for the
 * AIDraftBlock store + the audit trail.
 *
 * Storage layout:
 *   axvela:aiDrafts         — AIDraftBlock[]
 *   axvela:aiDrafts:audit   — AIDraftAuditEntry[]
 *
 * Both keys are SSR-safe: reads return [] when window is undefined
 * or when the stored value is missing / malformed; writes silently
 * swallow quota errors so the UI never throws on persistence
 * failure.
 *
 * Note on durability: localStorage is single-device, single-browser.
 * For a real gallery console (multi-user / multi-device / audit
 * compliance) this util will be swapped for a server-backed adapter
 * with the same surface. Keeping the API stable now means the
 * future migration is one import-path change.
 */

import type {
  AIDraftBlock, AIDraftField, AILanguage, AITone, AIDraftStatus,
} from "../types/aiDraft";

const BLOCKS_KEY = "axvela:aiDrafts";
const AUDIT_KEY  = "axvela:aiDrafts:audit";

/* ── Audit trail types ───────────────────────────────────────── */

export type AIDraftAuditEventType =
  | "draft_generated"
  | "draft_regenerated"
  | "draft_edited"
  | "draft_approved";

export interface AIDraftAuditEntry {
  id:         string;
  type:       AIDraftAuditEventType;
  artworkId:  string;
  blockId?:   string;
  timestamp:  string;
  actor:      string;
  actorRole?: string;
  /**
   * Free-form contextual data:
   *   - draft_regenerated → { microPrompt: string, previousTone?: AITone }
   *   - draft_edited      → { previousContent: string }
   *   - draft_approved    → { final?: boolean }
   *   - draft_generated   → { tone: AITone, language: AILanguage[] }
   * Caller defines the exact shape; this is intentionally loose so
   * future event types don't require a type-system migration.
   */
  context?: Record<string, unknown>;
}

/* ── Block reads ─────────────────────────────────────────────── */

export interface DraftBlockFilter {
  artworkId?: string;
  field?:     AIDraftField;
  language?:  AILanguage;
  tone?:      AITone;
  status?:    AIDraftStatus;
}

function readAllBlocks(): AIDraftBlock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BLOCKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is AIDraftBlock =>
      x !== null
      && typeof x === "object"
      && typeof (x as AIDraftBlock).id === "string"
      && typeof (x as AIDraftBlock).artworkId === "string"
    );
  } catch {
    return [];
  }
}

export function getDraftBlocks(filter: DraftBlockFilter = {}): AIDraftBlock[] {
  const all = readAllBlocks();
  return all.filter(b =>
    (filter.artworkId === undefined || b.artworkId === filter.artworkId) &&
    (filter.field     === undefined || b.field     === filter.field) &&
    (filter.language  === undefined || b.language  === filter.language) &&
    (filter.tone      === undefined || b.tone      === filter.tone) &&
    (filter.status    === undefined || b.status    === filter.status)
  );
}

export function getDraftBlocksByArtwork(artworkId: string): AIDraftBlock[] {
  return getDraftBlocks({ artworkId });
}

/* ── Block writes ────────────────────────────────────────────── */

function writeBlocks(blocks: AIDraftBlock[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks));
    return true;
  } catch {
    return false;
  }
}

/**
 * Persist a list of blocks (typical case: 16 at a time after one
 * AI generation). Existing blocks whose ids match are REPLACED;
 * non-matching ids are appended. The composite id from
 * makeDraftBlockId() means same-tone re-runs overwrite (refinement
 * semantics) and different-tone runs append (append semantics)
 * automatically — see Step 6 type contract.
 */
export function saveDraftBlocks(incoming: AIDraftBlock[]): boolean {
  if (!Array.isArray(incoming) || incoming.length === 0) return false;
  const existing    = readAllBlocks();
  const incomingIds = new Set(incoming.map(b => b.id));
  const merged = [
    ...existing.filter(b => !incomingIds.has(b.id)),
    ...incoming,
  ];
  return writeBlocks(merged);
}

export function updateDraftBlock(
  id:    string,
  patch: Partial<AIDraftBlock>,
): boolean {
  const blocks = readAllBlocks();
  const idx    = blocks.findIndex(b => b.id === id);
  if (idx === -1) return false;
  const next   = [...blocks];
  next[idx]    = { ...blocks[idx], ...patch };
  return writeBlocks(next);
}

/**
 * Approve a block — sets status APPROVED and records the spec
 * fields (approvedAt / approvedBy / approvedByRole). Caller is
 * responsible for verifying that the approver's role is "owner"
 * or "manager"; this util does NOT enforce role gates so it stays
 * usable from server contexts that resolve roles differently.
 */
export function approveDraftBlock(
  id:       string,
  approver: string,
  role:     string,
): boolean {
  return updateDraftBlock(id, {
    status:         "APPROVED",
    approvedAt:     new Date().toISOString(),
    approvedBy:     approver,
    approvedByRole: role,
  });
}

/**
 * Mark a block as edited (the "직접 수정" flow). Editing alone does
 * NOT promote the block to APPROVED — a separate approval call is
 * required per the spec's human-in-the-loop rule.
 */
export function markDraftBlockEdited(
  id:         string,
  editor:     string,
  newContent: string,
): boolean {
  return updateDraftBlock(id, {
    content:  newContent,
    editedAt: new Date().toISOString(),
    editedBy: editor,
  });
}

export function removeDraftBlock(id: string): boolean {
  if (!id) return false;
  const blocks = readAllBlocks();
  const next   = blocks.filter(b => b.id !== id);
  if (next.length === blocks.length) return false;
  return writeBlocks(next);
}

/**
 * Drop every block belonging to a given artwork (e.g. when the
 * gallery deletes the artwork itself). Audit entries are
 * preserved — the audit trail is append-only by design.
 * Returns the number of blocks removed.
 */
export function clearArtworkDrafts(artworkId: string): number {
  const blocks = readAllBlocks();
  const next   = blocks.filter(b => b.artworkId !== artworkId);
  const removed = blocks.length - next.length;
  if (removed === 0) return 0;
  writeBlocks(next);
  return removed;
}

/* ── Audit trail ─────────────────────────────────────────────── */

function makeAuditId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readAllAuditEntries(): AIDraftAuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is AIDraftAuditEntry =>
      x !== null
      && typeof x === "object"
      && typeof (x as AIDraftAuditEntry).id === "string"
      && typeof (x as AIDraftAuditEntry).type === "string"
      && typeof (x as AIDraftAuditEntry).artworkId === "string"
    );
  } catch {
    return [];
  }
}

export function getAuditTrail(artworkId?: string): AIDraftAuditEntry[] {
  const entries = readAllAuditEntries();
  if (!artworkId) return entries;
  return entries.filter(e => e.artworkId === artworkId);
}

export function recordAuditEvent(
  input: Omit<AIDraftAuditEntry, "id" | "timestamp">
       & { id?: string; timestamp?: string },
): AIDraftAuditEntry | null {
  if (typeof window === "undefined") return null;

  const entry: AIDraftAuditEntry = {
    id:         input.id        ?? makeAuditId(),
    timestamp:  input.timestamp ?? new Date().toISOString(),
    type:       input.type,
    artworkId:  input.artworkId,
    blockId:    input.blockId,
    actor:      input.actor,
    actorRole:  input.actorRole,
    context:    input.context,
  };

  const existing = readAllAuditEntries();
  // Prepend so most-recent reads first.
  const merged = [entry, ...existing];

  try {
    window.localStorage.setItem(AUDIT_KEY, JSON.stringify(merged));
    return entry;
  } catch {
    return null;
  }
}

/* ── Convenience ─────────────────────────────────────────────── */

/**
 * Composite block id. Same-tone re-runs reuse the id (refinement
 * = overwrite); different-tone runs produce a new id (variation =
 * append). Stable + deterministic so the audit trail can correlate
 * blocks to events without a separate join key.
 */
export function makeDraftBlockId(
  artworkId: string,
  field:     AIDraftField,
  language:  AILanguage,
  tone:      AITone,
): string {
  return `${artworkId}:${field}:${language}:${tone}`;
}
