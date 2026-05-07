/**
 * V1 cache for AI analysis results.
 *
 * Two backends, picked at runtime by AI_CONFIG.redis.enabled:
 *
 *   • Upstash Redis (REST + pipeline) — TTL-based, survives across
 *     serverless function instances. The real cache.
 *
 *   • In-memory Map (fallback) — per-instance only. Useful in dev
 *     and degrades silently in prod when Redis isn't configured.
 *     Bounded at 500 entries; oldest evicted first.
 *
 * Cache key (per spec):
 *
 *   imageHash + outputLanguage + normalized userQuestion
 *
 * The userQuestion is lowercase-trimmed-collapsed and SHA-256
 * folded to 16 hex chars so cache keys stay short regardless of
 * input length.
 *
 * Failure mode: never throws. A Redis hiccup logs once and returns
 * null / no-op so the analyze flow continues — V1 priority is
 * "cache failure must not break the request" (rule 5).
 */

import { createHash } from "crypto";
import { AI_CONFIG } from "./config";
import { sanitizeForLog } from "./aiUtils";

const TTL_SEC          = AI_CONFIG.limits.cacheExpirySeconds;  // 86400 (24 h)
const REDIS_TIMEOUT_MS = 2_500;
const MEM_STORE_CAP    = 500;

/* ── Key builder ───────────────────────────────────────────── */

export function buildCacheKey(
  imageHash:      string,
  outputLanguage: "ko" | "en",
  userQuestion?:  string,
): string {
  const normalized = (userQuestion ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  // 16 hex chars = ~64 bits, plenty for collision-free cache keys.
  const qHash = createHash("sha256").update(normalized).digest("hex").slice(0, 16);
  return `ai:analysis:${imageHash}:${outputLanguage}:${qHash}`;
}

/* ── Public API ────────────────────────────────────────────── */

export async function getCachedAnalysis<T = unknown>(cacheKey: string): Promise<T | null> {
  if (!cacheKey) return null;

  if (AI_CONFIG.redis.enabled) {
    try {
      return await getRedis<T>(cacheKey);
    } catch (err) {
      logCacheFailure("redis-get", err);
      return null;
    }
  }
  return getMemory<T>(cacheKey);
}

export async function setCachedAnalysis<T>(cacheKey: string, result: T): Promise<void> {
  if (!cacheKey || result === undefined || result === null) return;

  if (AI_CONFIG.redis.enabled) {
    try {
      await setRedis(cacheKey, result);
    } catch (err) {
      logCacheFailure("redis-set", err);
    }
    return;
  }
  setMemory(cacheKey, result);
}

/* ── Redis (Upstash REST + pipeline) ───────────────────────── */

async function getRedis<T>(key: string): Promise<T | null> {
  const res = await fetch(`${AI_CONFIG.redis.url}/pipeline`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${AI_CONFIG.redis.token}`,
      "Content-Type":  "application/json",
    },
    body:    JSON.stringify([["GET", key]]),
    signal:  AbortSignal.timeout(REDIS_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const out = await res.json() as Array<{ result?: string | null }>;
  const raw = out[0]?.result;
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Stored value is corrupt — treat as miss.
    return null;
  }
}

async function setRedis<T>(key: string, value: T): Promise<void> {
  const payload = JSON.stringify(value);
  const res = await fetch(`${AI_CONFIG.redis.url}/pipeline`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${AI_CONFIG.redis.token}`,
      "Content-Type":  "application/json",
    },
    body:    JSON.stringify([["SET", key, payload, "EX", String(TTL_SEC)]]),
    signal:  AbortSignal.timeout(REDIS_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
}

/* ── In-memory fallback ────────────────────────────────────── */

interface MemEntry { value: unknown; expiresAt: number }
const memStore: Map<string, MemEntry> = new Map();

function getMemory<T>(key: string): T | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memStore.delete(key);
    return null;
  }
  return entry.value as T;
}

function setMemory(key: string, value: unknown): void {
  memStore.set(key, { value, expiresAt: Date.now() + TTL_SEC * 1000 });
  // Bound the map — evict oldest insertion-order entries.
  while (memStore.size > MEM_STORE_CAP) {
    const oldest = memStore.keys().next().value;
    if (!oldest) break;
    memStore.delete(oldest);
  }
}

/* ── Logging ───────────────────────────────────────────────── */

let _failureLogged = false;
function logCacheFailure(reason: string, err: unknown): void {
  // One-shot per process — don't spam logs while Redis is down.
  if (_failureLogged) return;
  _failureLogged = true;
  // eslint-disable-next-line no-console
  console.warn("[cache] degraded:", sanitizeForLog({
    reason,
    err: err instanceof Error ? err.message : String(err),
  }));
}
