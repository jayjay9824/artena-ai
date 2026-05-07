/**
 * V1 rate limiting — sliding window per identifier.
 *
 * Two backends, picked at runtime by AI_CONFIG.redis.enabled:
 *
 *   • Upstash Redis via REST — used when both env vars are set.
 *     Sorted-set sliding window over 60 s + 3600 s buckets,
 *     pipelined into a single round trip. Survives across
 *     serverless function instances (real global limit).
 *
 *   • In-memory Map (fallback) — used in dev / staging or when
 *     Redis isn't configured. Per-instance only, so on Vercel
 *     each cold function gets a fresh counter. Logs a one-shot
 *     warning in production so the operator notices.
 *
 * Limits come from AI_CONFIG.limits — 5 req/min, 30 req/hour.
 *
 * Failure mode: if Redis itself is unreachable / returns an
 * error, we degrade to "allowed" rather than fail closed. V1
 * priority is "don't break the analyze flow"; cost protection
 * comes back online as soon as Redis recovers.
 */

import { AI_CONFIG } from "./config";

export interface RateLimitResult {
  allowed:     boolean;
  reason?:     string;
  /** Seconds the caller should wait before retrying. */
  retryAfter?: number;
}

const PER_MIN_LIMIT = AI_CONFIG.limits.rateLimitPerMinute;
const PER_HR_LIMIT  = AI_CONFIG.limits.rateLimitPerHour;
const MIN_WINDOW_MS = 60_000;
const HR_WINDOW_MS  = 3_600_000;

/** Public entrypoint — backend chosen by config. */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const id = (identifier || "unknown").trim() || "unknown";
  if (AI_CONFIG.redis.enabled) {
    try {
      return await checkRedis(id);
    } catch (err) {
      // Don't fail the user request because Redis hiccupped.
      // Log once and degrade to allow — cost protection resumes
      // as soon as Redis recovers.
      logRedisFailure(err);
      return { allowed: true };
    }
  }
  return checkMemory(id);
}

/* ── Redis (Upstash REST) ─────────────────────────────────────── */

/**
 * Pipeline: prune old, add this request, refresh TTL, count.
 * Same shape for both windows — 8 commands total.
 *
 * "Always add then check" is 1 round trip vs "check then add"'s
 * 2 round trips. The trade-off: a spammer at the limit gets
 * counted even when blocked — which is desirable (it pushes the
 * window out further), so this is correct, not a bug.
 */
async function checkRedis(id: string): Promise<RateLimitResult> {
  const now    = Date.now();
  const minKey = `rl:m:${id}`;
  const hrKey  = `rl:h:${id}`;
  const member = `${now}-${Math.random().toString(36).slice(2, 10)}`;

  const cmds: unknown[][] = [
    ["ZREMRANGEBYSCORE", minKey, "0", String(now - MIN_WINDOW_MS)],
    ["ZADD",             minKey, String(now), member],
    ["EXPIRE",           minKey, "70"],
    ["ZCARD",            minKey],
    ["ZREMRANGEBYSCORE", hrKey,  "0", String(now - HR_WINDOW_MS)],
    ["ZADD",             hrKey,  String(now), member],
    ["EXPIRE",           hrKey,  "3700"],
    ["ZCARD",            hrKey],
  ];

  const res = await fetch(`${AI_CONFIG.redis.url}/pipeline`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${AI_CONFIG.redis.token}`,
      "Content-Type":  "application/json",
    },
    body:    JSON.stringify(cmds),
    // Modest timeout — rate limit can't take longer than the
    // analyze call itself.
    signal:  AbortSignal.timeout(2_500),
  });

  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const out     = await res.json() as Array<{ result?: unknown }>;
  const minCnt  = Number(out[3]?.result ?? 0);
  const hrCnt   = Number(out[7]?.result ?? 0);

  if (minCnt > PER_MIN_LIMIT) {
    return {
      allowed:    false,
      reason:     "Rate limit exceeded (per minute)",
      retryAfter: 60,
    };
  }
  if (hrCnt > PER_HR_LIMIT) {
    return {
      allowed:    false,
      reason:     "Rate limit exceeded (per hour)",
      retryAfter: 3600,
    };
  }
  return { allowed: true };
}

let _redisFailureLogged = false;
function logRedisFailure(err: unknown) {
  if (_redisFailureLogged) return;
  _redisFailureLogged = true;
  const msg = err instanceof Error ? err.message : String(err);
  // eslint-disable-next-line no-console
  console.warn("[rateLimit] Redis unreachable, degrading to allow:", msg);
}

/* ── In-memory fallback ─────────────────────────────────────── */

/** identifier → array of request timestamps (ms since epoch).
 *  Pruned on each access; entries that go quiet eventually leak
 *  but Vercel function restarts cap the worst-case growth. */
const _memStore: Map<string, number[]> = new Map();

function checkMemory(id: string): RateLimitResult {
  logMemoryFallback();

  const now = Date.now();
  const stamps = (_memStore.get(id) ?? []).filter(t => now - t < HR_WINDOW_MS);
  // Always add this request — same semantics as the Redis path.
  stamps.push(now);
  _memStore.set(id, stamps);

  const minCnt = stamps.reduce((n, t) => (now - t < MIN_WINDOW_MS ? n + 1 : n), 0);
  const hrCnt  = stamps.length;

  if (minCnt > PER_MIN_LIMIT) {
    const oldestInMin = stamps.find(t => now - t < MIN_WINDOW_MS) ?? now;
    return {
      allowed:    false,
      reason:     "Rate limit exceeded (per minute)",
      retryAfter: Math.ceil((MIN_WINDOW_MS - (now - oldestInMin)) / 1000),
    };
  }
  if (hrCnt > PER_HR_LIMIT) {
    const oldest = stamps[0] ?? now;
    return {
      allowed:    false,
      reason:     "Rate limit exceeded (per hour)",
      retryAfter: Math.ceil((HR_WINDOW_MS - (now - oldest)) / 1000),
    };
  }
  return { allowed: true };
}

let _memWarningLogged = false;
function logMemoryFallback() {
  if (_memWarningLogged) return;
  _memWarningLogged = true;
  if (process.env.NODE_ENV !== "production") return;
  // eslint-disable-next-line no-console
  console.warn(
    "[rateLimit] Using in-memory rate limit store in production. " +
    "On Vercel serverless, each function instance keeps its own counter, " +
    "so the limit is enforced per-instance, not globally. Set " +
    "UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN for production-grade limiting.",
  );
}
