/**
 * V1 AI usage tracking + lightweight cost alert.
 *
 * Two modes, picked at runtime by AI_CONFIG.redis.enabled:
 *
 *   • Upstash Redis — daily aggregates per engine. INCR + INCRBYFLOAT
 *     keys live for 7 days then auto-expire. Cheap, no schema.
 *
 *   • Dev console — when Redis isn't configured AND NODE_ENV !==
 *     "production", print a single line per call. Production with
 *     no Redis silently drops the log (no console spam in serverless).
 *
 * Cost alert: when the daily total tracked in Redis crosses
 * $30 (V1 ALERT_THRESHOLD_USD), console.warn fires once per
 * function-instance per date. Slack / email plumbing comes later.
 *
 * Failure mode: never throws (rule 4). Sanitizes every value
 * through sanitizeForLog — there's no imageBase64 in the entry
 * shape, but the wrapper guards against accidental contamination
 * by future callers.
 */

import { AI_CONFIG } from "./config";
import { sanitizeForLog } from "./aiUtils";

export interface UsageEntry {
  userId:           string;
  engine:           "claude" | "gemini" | string;
  model:            string;
  inputTokens:      number;
  outputTokens:     number;
  estimatedCostUSD: number;
  cached:           boolean;
  /** ms since epoch. */
  timestamp:        number;
}

const REDIS_TIMEOUT_MS    = 2_500;
const TTL_SEC_7_DAYS      = "604800";
const ALERT_THRESHOLD_USD = 30;

/* ── Public API ────────────────────────────────────────────── */

export async function logAIUsage(entry: UsageEntry): Promise<void> {
  // Normalize timestamp + cost so callers can pass loose values.
  const normalized: UsageEntry = {
    ...entry,
    timestamp:        Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now(),
    estimatedCostUSD: Number.isFinite(entry.estimatedCostUSD) ? entry.estimatedCostUSD : 0,
    inputTokens:      Number.isFinite(entry.inputTokens)  ? entry.inputTokens  : 0,
    outputTokens:     Number.isFinite(entry.outputTokens) ? entry.outputTokens : 0,
  };

  try {
    if (AI_CONFIG.redis.enabled) {
      await logRedis(normalized);
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.info("[ai.usage]", sanitizeForLog({
        userId:           normalized.userId,
        engine:           normalized.engine,
        model:            normalized.model,
        inputTokens:      normalized.inputTokens,
        outputTokens:     normalized.outputTokens,
        estimatedCostUSD: normalized.estimatedCostUSD,
        cached:           normalized.cached,
        timestamp:        new Date(normalized.timestamp).toISOString(),
      }));
    }
    // Production without Redis — silently drop. Dev/staging gets
    // dev console output. Either way, no throw.
  } catch (err) {
    // Never break the request because logging hiccupped.
    // eslint-disable-next-line no-console
    console.warn("[ai.usage] log failure:", sanitizeForLog({
      err: err instanceof Error ? err.message : String(err),
    }));
  }
}

/* ── Redis (Upstash REST + pipeline) ───────────────────────── */

async function logRedis(p: UsageEntry): Promise<void> {
  // YYYY-MM-DD UTC. Daily buckets are simple to reason about and
  // align with Anthropic / Google billing periods.
  const date = new Date(p.timestamp).toISOString().slice(0, 10);

  const totalCountKey  = `usage:daily:${date}:count`;
  const totalCostKey   = `usage:daily:${date}:cost`;
  const engineCountKey = `usage:daily:${date}:${p.engine}:count`;
  const engineCostKey  = `usage:daily:${date}:${p.engine}:cost`;
  const cachedCountKey = `usage:daily:${date}:cached:count`;

  // Pipeline 11 commands in a single round trip. The final GET is
  // for the cost alert below.
  const cmds: unknown[][] = [
    ["INCR",        totalCountKey],
    ["EXPIRE",      totalCountKey,  TTL_SEC_7_DAYS],

    ["INCRBYFLOAT", totalCostKey,   String(p.estimatedCostUSD)],
    ["EXPIRE",      totalCostKey,   TTL_SEC_7_DAYS],

    ["INCR",        engineCountKey],
    ["EXPIRE",      engineCountKey, TTL_SEC_7_DAYS],

    ["INCRBYFLOAT", engineCostKey,  String(p.estimatedCostUSD)],
    ["EXPIRE",      engineCostKey,  TTL_SEC_7_DAYS],

    p.cached
      ? ["INCR",   cachedCountKey]
      : ["EXISTS", cachedCountKey],   // no-op when not cached
    ["EXPIRE",     cachedCountKey,  TTL_SEC_7_DAYS],

    ["GET",        totalCostKey],     // for cost alert
  ];

  const res = await fetch(`${AI_CONFIG.redis.url}/pipeline`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${AI_CONFIG.redis.token}`,
      "Content-Type":  "application/json",
    },
    body:    JSON.stringify(cmds),
    signal:  AbortSignal.timeout(REDIS_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);

  const out = await res.json() as Array<{ result?: unknown }>;
  const dailyCostRaw = out[10]?.result;   // index of the final GET
  if (typeof dailyCostRaw === "string") {
    const dailyCost = Number(dailyCostRaw);
    if (Number.isFinite(dailyCost) && dailyCost > ALERT_THRESHOLD_USD) {
      maybeAlertCost(date, dailyCost);
    }
  }
}

/* ── Cost alert ────────────────────────────────────────────── */

const _alertedDates = new Set<string>();

function maybeAlertCost(date: string, cost: number): void {
  // One-shot per function-instance per date. Vercel serverless
  // instances each get their own Set, so the alert may fire a
  // small number of times per day rather than once globally.
  // Acceptable for V1; a proper dedupe would store alert state
  // back into Redis itself (e.g. SETNX usage:alerted:{date}).
  if (_alertedDates.has(date)) return;
  _alertedDates.add(date);
  // eslint-disable-next-line no-console
  console.warn(
    `[ai.usage] DAILY COST ALERT — ${date} estimated $${cost.toFixed(2)} ` +
    `exceeded $${ALERT_THRESHOLD_USD}. Slack / email integration TBD.`,
  );
}
