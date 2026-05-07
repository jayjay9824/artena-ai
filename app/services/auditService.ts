/**
 * auditService — append-only, hash-chained audit log.
 *
 * V1 storage: localStorage (per device). Production should persist
 * server-side with immutability constraints (e.g. Postgres + DB
 * triggers preventing UPDATE/DELETE on this table) and optionally
 * anchor the latest hash to a public ledger.
 *
 * Trust philosophy:
 *   • Records are never deleted. Lifecycle changes go through
 *     artwork_updated / status fields.
 *   • Each entry's hash is sha256(prevHash + canonicalJSON(entry)),
 *     which means tampering with any past entry breaks the chain
 *     from that point on. verifyChain() recomputes and reports.
 *   • SubtleCrypto on the client / Node crypto on the server — both
 *     produce the same SHA-256, so the chain is portable.
 */

import { nanoid } from "nanoid";
import type {
  AuditEntry, AuditAction, AuditEntityType,
} from "../lib/types";

const STORE_KEY = "artena.auditLog";
const MAX_ENTRIES = 1000;

/* ── Canonical JSON (stable key order) ─────────────────────────── */

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`).join(",")}}`;
}

/* ── SHA-256 (works in browser + Node) ─────────────────────────── */

async function sha256Hex(input: string): Promise<string> {
  // Browser path — SubtleCrypto.
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(input);
    const buf  = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Node path — dynamic import so this file stays universally importable.
  const nodeCrypto = await import("crypto");
  return nodeCrypto.createHash("sha256").update(input).digest("hex");
}

/* ── Storage ───────────────────────────────────────────────────── */

function readStore(): AuditEntry[] {
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
function writeStore(entries: AuditEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = entries.length > MAX_ENTRIES
      ? entries.slice(-MAX_ENTRIES) // keep most recent — note: the chain
                                    // breaks at the trimmed boundary, but
                                    // production keeps everything anyway.
      : entries;
    window.localStorage.setItem(STORE_KEY, JSON.stringify(trimmed));
  } catch { /* quota / disabled */ }
}

/* ── Public API ────────────────────────────────────────────────── */

export interface RecordAuditInput {
  entityType:    AuditEntityType;
  entityId:      string;
  action:        AuditAction;
  actorId?:      string;
  previousValue?: Record<string, unknown>;
  newValue?:      Record<string, unknown>;
}

/**
 * Append a new audit entry. Computes its hash from the prior tail's
 * hash + this entry's canonical body. Never throws — auditing must
 * not break the user-facing path.
 */
export async function recordAudit(input: RecordAuditInput): Promise<AuditEntry | null> {
  try {
    const log = readStore();
    const prev = log.length > 0 ? log[log.length - 1] : null;

    const id        = nanoid(12);
    const timestamp = new Date().toISOString();
    const actorId   = input.actorId ?? "guest";
    const prevHash  = prev?.hash ?? "";

    const body = {
      id,
      entityType: input.entityType,
      entityId:   input.entityId,
      action:     input.action,
      actorId,
      timestamp,
      previousValue: input.previousValue,
      newValue:      input.newValue,
      prevHash,
    };
    const hash = await sha256Hex(prevHash + canonicalize(body));

    const entry: AuditEntry = { ...body, hash };
    writeStore([...log, entry]);
    return entry;
  } catch {
    return null;
  }
}

export function getAuditEntries(): AuditEntry[] {
  return readStore();
}

/**
 * Walk the chain and confirm each entry's hash matches recompute.
 * Returns the index of the first broken link (-1 if intact).
 */
export async function verifyChain(): Promise<{ ok: boolean; brokenAt: number }> {
  const log = readStore();
  for (let i = 0; i < log.length; i++) {
    const e = log[i];
    const expectedPrev = i === 0 ? "" : log[i - 1].hash;
    if (e.prevHash !== expectedPrev) return { ok: false, brokenAt: i };
    const body = {
      id: e.id, entityType: e.entityType, entityId: e.entityId,
      action: e.action, actorId: e.actorId, timestamp: e.timestamp,
      previousValue: e.previousValue, newValue: e.newValue,
      prevHash: e.prevHash,
    };
    const recomputed = await sha256Hex(e.prevHash + canonicalize(body));
    if (recomputed !== e.hash) return { ok: false, brokenAt: i };
  }
  return { ok: true, brokenAt: -1 };
}

/** Test-only / admin: clear the local log. Spec forbids this in prod. */
export function clearAuditLog(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORE_KEY);
}
