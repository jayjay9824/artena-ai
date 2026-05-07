/**
 * Report storage seam.
 *
 * Currently in-memory (a Map) — works inside a single warm Vercel
 * serverless instance, lost on cold start. That's intentional MVP
 * scope: it lets share links work for the user's session and lets
 * the API surface be exercised end-to-end. Production should swap
 * MemoryReportStore for a KV / Postgres impl by changing only the
 * default export below — every caller goes through the
 * ReportStore interface.
 */

import type { Report, ReportId } from "../lib/types";

export interface ReportStore {
  put(report: Report): Promise<void>;
  get(id: ReportId): Promise<Report | null>;
  /**
   * Most-recent (by createdAt) report carrying this artworkId. Used as
   * the 24h cache lookup keyed off the canonical artwork — STEP 2.
   * Returns null when no report exists for the artwork.
   */
  findByArtworkId(artworkId: string): Promise<Report | null>;
  /**
   * Partial update used by the background generation pipeline to
   * promote a stub from status:"processing" → "ready" / "error" once
   * Claude completes. Returns the merged record, or null when id is
   * unknown.
   */
  patch(id: ReportId, partial: Partial<Report>): Promise<Report | null>;
}

/* ── In-memory default (MVP) ───────────────────────────────────── */
/*
 * On Vercel, modules are shared across warm invocations of the same
 * function instance, so this Map survives between requests until the
 * instance is recycled. Across instances it does NOT share. Treat
 * sharing as best-effort during MVP demos.
 */

const memory = new Map<ReportId, Report>();

class MemoryReportStore implements ReportStore {
  async put(report: Report): Promise<void> {
    memory.set(report.id, report);
  }
  async get(id: ReportId): Promise<Report | null> {
    return memory.get(id) ?? null;
  }
  async findByArtworkId(artworkId: string): Promise<Report | null> {
    let best: Report | null = null;
    for (const r of memory.values()) {
      if (r.artworkId !== artworkId) continue;
      if (!best || r.createdAt > best.createdAt) best = r;
    }
    return best;
  }
  async patch(id: ReportId, partial: Partial<Report>): Promise<Report | null> {
    const cur = memory.get(id);
    if (!cur) return null;
    const next = { ...cur, ...partial, id: cur.id };
    memory.set(id, next);
    return next;
  }
}

/* ── Default singleton ─────────────────────────────────────────── */

let defaultStore: ReportStore = new MemoryReportStore();

export function getReportStore(): ReportStore {
  return defaultStore;
}

/** Test/migration hook — swap the store at runtime. */
export function setReportStore(store: ReportStore): void {
  defaultStore = store;
}
