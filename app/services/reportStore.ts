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
